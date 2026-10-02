import fs from "fs";

let s = fs.readFileSync("index.html", "utf8");

/* واجهة رابط تراث */
s = s.replace(
  `<p>Parser v4 — بنية تراث وحفظ مواضع الصفحات.</p>
<button id="make">إنشاء DOCX</button>`,
  `<p>ألصق رابط الكتاب في تراث، وسننشئ تجربة Word لأول 50 صفحة.</p>

<input
  id="bookUrl"
  value="https://app.turath.io/book/6684"
  placeholder="https://app.turath.io/book/6684"
  style="box-sizing:border-box;width:100%;padding:14px;font-size:17px;margin-bottom:12px"
>

<button id="make">إنشاء Word — أول 50 صفحة</button>

<hr style="margin:28px 0">

<p>أو استخدم ملف EPUB محليًا:</p>
<input id="epubInput" type="file" accept=".epub,application/epub+zip">
<p style="font-size:14px;opacity:.7">
مسار EPUB سيُربط بالمحوّل المحلي في الخطوة التالية.
</p>`
);

/* الـ API يعيد meta كـ object، بينما النسخة القديمة توقعت string */
s = s.replace(
  `const meta = JSON.parse(pageData.meta);`,
  `const meta =
    typeof pageData.meta === "string"
      ? JSON.parse(pageData.meta)
      : pageData.meta;`
);

/* استبدال قراءة ملفات pages المحلية بالبروكسي */
s = s.replace(
  /async function loadPages\(count\) \{[\s\S]*?return pages;\n\}/,
`async function loadPages(count, bookId) {
  statusEl.textContent =
    \`جلب \${count} صفحة من تراث...\`;

  const response = await fetch(
    \`/api/book/\${bookId}/pages?from=1&to=\${count}\`
  );

  if (!response.ok) {
    let message = \`HTTP \${response.status}\`;
    try {
      const e = await response.json();
      if (e.error) message += \` — \${e.error}\`;
    } catch {}
    throw new Error(message);
  }

  const data = await response.json();

  if (!Array.isArray(data.pages) || data.pages.length !== count) {
    throw new Error(
      \`وصلت \${data.pages?.length ?? 0} صفحة بدل \${count}\`
    );
  }

  return data.pages.map(parsePage);
}`
);

/* استخراج ID من الرابط */
s = s.replace(
  `const statusEl = document.getElementById("status");
const PAGE_COUNT = 50;`,
  `const statusEl = document.getElementById("status");
const PAGE_COUNT = 50;

function getBookId() {
  const value =
    document.getElementById("bookUrl").value.trim();

  const match = value.match(/\\/book\\/(\\d+)/);

  if (match) return Number(match[1]);

  if (/^\\d+$/.test(value)) return Number(value);

  throw new Error("رابط تراث غير صالح.");
}`
);

/* تمرير bookId إلى loadPages */
s = s.replace(
  `const pages =
      await loadPages(PAGE_COUNT);`,
  `const bookId = getBookId();

    statusEl.textContent =
      "الاتصال بتراث...";

    const pages =
      await loadPages(PAGE_COUNT, bookId);`
);

/* اسم الملف من بيانات الكتاب بدل اسم المنتقى الثابت */
s = s.replace(
  `a.download =
      "المنتقى-تجربة-50-صفحة-v4.docx";`,
  `const safeName =
      (pages[0]?.meta?.book_name || ("book-" + bookId))
        .replace(/[\\\\/:*?"<>|]/g, "-");

    a.download =
      safeName + "-50-pages.docx";`
);

/* انقل الواجهة إلى المكان الذي يقدمه Express */
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/index.html", s);

console.log("✓ public/index.html built");
