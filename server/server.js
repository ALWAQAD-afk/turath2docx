import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;
const API = "https://api.turath.io";
const VER = 3;

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
  return parsePage(
    await turath("/page", {
      book_id: bookId,
      pg,
      ver: VER
    })
  );
}

async function getPageRetry(bookId, pg) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await getPage(bookId, pg);
    } catch (e) {
      if (e.status === 404) throw e;

      const wait = Math.min(
        30000,
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
      Array.from({ length: 4 }, () => worker())
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
