import express from "express";
import fs from "fs";
import path from "path";

const app = express();

const PORT = process.env.PORT || 3000;
const API = "https://api.turath.io";
const VER = 3;

// PATCH #13 — cache على القرص يقلل ضغط Turath
const CACHE_DIR = path.resolve("server/cache");
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}

function cacheFile(bookId, pg) {
  return path.join(CACHE_DIR, String(bookId), String(pg) + ".json");
}

function readCache(bookId, pg) {
  try {
    const p = cacheFile(bookId, pg);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) { return null; }
}

function writeCache(bookId, pg, data) {
  try {
    const dir = path.join(CACHE_DIR, String(bookId));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cacheFile(bookId, pg), JSON.stringify(data));
  } catch (e) {}
}

app.use(express.static("public"));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

async function turath(path, params = {}) {
  const url = new URL(path, API);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const error = new Error(`Turath HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function parsePage(data) {
  return {
    meta:
      typeof data.meta === "string"
        ? JSON.parse(data.meta)
        : data.meta,
    text: data.text ?? ""
  };
}

async function getPage(bookId, pg) {
  // PATCH #13 — cache أولًا
  const cached = readCache(bookId, pg);
  if (cached) return cached;

  const data = parsePage(
    await turath("/page", {
      book_id: bookId,
      pg,
      ver: VER
    })
  );
  writeCache(bookId, pg, data);
  return data;
}

async function getPageRetry(bookId, pg) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await getPage(bookId, pg);
    } catch (e) {
      if (e.status === 404) throw e;

      const wait = Math.min(
        5000,
        1000 * 2 ** attempt
      );

      await new Promise(r => setTimeout(r, wait));
    }
  }

  throw new Error(`Failed page ${pg}`);
}

app.get("/api/book/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const data = await turath("/book", {
      id,
      include: "indexes",
      ver: VER
    });

    res.json(data);
  } catch (e) {
    res.status(e.status || 500).json({
      error: e.message
    });
  }
});

// PATCH #25 — books-v3 fast path
//
// بدل جلب الكتاب صفحة صفحة من api.turath.io/page،
// نحاول أولًا تنزيل snapshot كامل من CDN:
//
//   https://files.turath.io/books-v3/<id>.json
//
// هذا المسار اختُبر على:
//   98093 -> 640 pages
//   6684  -> 2236 pages
//
// لا نثق بالملف ثقة عمياء:
// - يجب أن يكون ID رقمًا موجبًا.
// - يجب أن تكون pages مصفوفة.
// - يمكن للعميل تمرير expected للتحقق من العدد.
// - عند أي فشل نعيد status مناسبًا، والعميل يرجع تلقائيًا
//   إلى مسار PATCH #24 القديم.
//
// لا نستخدم turath-sdk هنا حتى لا نعتمد على مساره القديم books/.
app.get("/api/book/:id/full", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const expected = Number(req.query.expected || 0);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid book id"
      });
    }

    if (
      expected &&
      (!Number.isSafeInteger(expected) || expected <= 0)
    ) {
      return res.status(400).json({
        error: "Invalid expected page count"
      });
    }

    const url =
      `https://files.turath.io/books-v3/${id}.json`;

    const started = Date.now();

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          `Turath books-v3 HTTP ${response.status}`
      });
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.pages)) {
      return res.status(502).json({
        error: "Invalid books-v3 payload: pages[] missing"
      });
    }

    if (expected && data.pages.length !== expected) {
      return res.status(409).json({
        error:
          `books-v3 integrity mismatch: ` +
          `expected ${expected}, got ${data.pages.length}`,
        expected,
        actual: data.pages.length
      });
    }

    /*
     * books-v3 page shape:
     *
     *   {
     *     page: <printed page>,
     *     vol:  <volume>,
     *     text: <HTML/text>
     *   }
     *
     * نحوله هنا إلى نفس الشكل الذي يفهمه parsePage()
     * في المتصفح ومسار /pages القديم:
     *
     *   {
     *     pg:   <internal source index>,
     *     meta: { page, vol },
     *     text
     *   }
     *
     * هكذا لا نغيّر أي شيء في منطق DOCX.
     */
    const pages = data.pages.map((page, index) => ({
      pg: index + 1,
      meta: {
        page: page?.page,
        vol: page?.vol
      },
      text: page?.text ?? ""
    }));

    /*
     * فحص metadata الأساسي قبل إرسال عشرات MB للعميل.
     * page قد يكون اختياريًا في بعض المواد،
     * لكن vol مطلوب حاليًا لبناء sections/footer.
     */
    const badVolIndex = pages.findIndex(
      page =>
        page.meta.vol === undefined ||
        page.meta.vol === null
    );

    if (badVolIndex !== -1) {
      return res.status(422).json({
        error:
          `books-v3 page ${badVolIndex + 1} ` +
          `has no volume metadata`
      });
    }

    const elapsedMs = Date.now() - started;

    console.log(
      `[books-v3] ${id}: ` +
      `${pages.length} pages in ${elapsedMs} ms`
    );

    res.json({
      book_id: id,
      source: "books-v3",
      count: pages.length,
      elapsed_ms: elapsedMs,
      pages
    });

  } catch (e) {
    console.error(
      "[books-v3] failed:",
      req.params.id,
      e
    );

    res.status(502).json({
      error:
        e && e.message
          ? e.message
          : "books-v3 fetch failed"
    });
  }
});

app.get("/api/book/:id/page/:pg", async (req, res) => {
  try {
    const page = await getPageRetry(
      Number(req.params.id),
      Number(req.params.pg)
    );

    res.json(page);
  } catch (e) {
    res.status(e.status || 500).json({
      error: e.message
    });
  }
});

app.get("/api/book/:id/pages", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const from = Math.max(1, Number(req.query.from || 1));
    const to = Math.max(from, Number(req.query.to || from));

    // Safety against accidental monster requests.
    if (to - from + 1 > 100) {
      return res.status(400).json({
        error: "Maximum batch size is 100 pages"
      });
    }

    const numbers = [];

    for (let pg = from; pg <= to; pg++) {
      numbers.push(pg);
    }

    const pages = new Array(numbers.length);
    let cursor = 0;

    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= numbers.length) return;

        const pg = numbers[index];

        const page = await getPageRetry(id, pg);

        pages[index] = {
          pg,
          ...page
        };
      }
    }

    await Promise.all(
      Array.from({ length: 8 }, () => worker())
    );

    res.json({
      book_id: id,
      from,
      to,
      count: pages.length,
      pages
    });

  } catch (e) {
    res.status(e.status || 500).json({
      error: e.message
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "turath2docx"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Turath2Docx: http://localhost:${PORT}`);
});
