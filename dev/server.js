// Local Jcink preview with live reload. No dependencies: `npm run dev`.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { ROOT, SKIN, DATA, JCINK, loadSkin } = require("./skin");
const { createRenderer } = require("./render");
const { pieces, skinXml, templatesXml } = require("./pieces");

const PORT = process.env.PORT || 3000;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DEV_CLIENT = (warnings) => `
<script>
(() => {
  const es = new EventSource("/__live");
  es.onmessage = (e) => {
    if (e.data === "css") {
      document.querySelectorAll("link[data-dev-css]").forEach((l) => (l.href = l.href.split("?")[0] + "?t=" + Date.now()));
    } else location.reload();
  };
})();
</script>
<nav id="dev-bar">
  <a href="/">Index</a><a href="/index.php?showforum=1">Forum</a><a href="/index.php?showtopic=1">Topic</a>
  <a href="/index.php?showuser=1">Profile</a><a href="/index.php?act=Members">Members</a>
  <a href="/__copy" target="_blank"><b>Copy code</b></a>
  ${warnings.length ? `<details><summary>&#9888; ${warnings.length}</summary><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></details>` : ""}
  <button onclick="this.parentNode.remove()" title="Hide">&times;</button>
</nav>
<style>
  #dev-bar{position:fixed;bottom:12px;right:12px;z-index:99999;display:flex;align-items:center;gap:2px;padding:4px;border-radius:8px;
    background:#111e;font:12px/1 system-ui,sans-serif;box-shadow:0 2px 8px #0004;text-align:left}
  #dev-bar a,#dev-bar button,#dev-bar summary{color:#fff!important;text-decoration:none;padding:6px 8px;border-radius:5px;background:none;border:0;cursor:pointer;font:inherit}
  #dev-bar a:hover,#dev-bar button:hover,#dev-bar summary:hover{background:#fff2}
  #dev-bar summary{color:#fc6!important;list-style:none}
  #dev-bar ul{position:absolute;bottom:100%;right:0;margin:0 0 6px;padding:10px 10px 10px 26px;max-width:420px;background:#111;color:#fff;border-radius:8px;line-height:1.5}
  .dev-missing{color:#c00;font:11px monospace}
</style>`;

function copyPage() {
  const skin = loadSkin();
  const card = (p) => `
<section>
  <header><div><h2>${esc(p.label)}</h2><p>${esc(p.where)} &middot; <code>${esc(p.file)}</code></p></div>
  <button data-copy="${p.id}">Copy</button></header>
  <textarea id="code-${p.id}" readonly spellcheck="false">${esc(p.code)}</textarea>
</section>`;
  const macroRows = Object.entries(skin.macros)
    .map(([k, v]) => `<tr><td><code>&lt;{${esc(k)}}&gt;</code></td><td><textarea id="code-m-${esc(k)}" readonly rows="1">${esc(v)}</textarea></td><td><button data-copy="m-${esc(k)}">Copy</button></td></tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Copy to Jcink</title>
<style>
  body{margin:0;background:#f4f4f5;color:#18181b;font:14px/1.5 system-ui,sans-serif}
  main{max-width:900px;margin:0 auto;padding:24px 16px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:0} p{margin:0;color:#71717a;font-size:12px}
  .downloads{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 24px}
  .downloads a{background:#18181b;color:#fff;text-decoration:none;padding:8px 12px;border-radius:6px;font-weight:600}
  section{background:#fff;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:12px;overflow:hidden}
  section header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px}
  textarea{display:block;width:100%;box-sizing:border-box;border:0;border-top:1px solid #e4e4e7;font:12px/1.4 ui-monospace,monospace;padding:10px;height:120px;resize:vertical;background:#fafafa}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e4e4e7;border-radius:8px}
  td{padding:6px 8px;border-top:1px solid #e4e4e7;vertical-align:middle} td textarea{border:1px solid #e4e4e7;height:auto;border-radius:4px}
  button{background:#7c3aed;color:#fff;border:0;border-radius:6px;padding:6px 14px;font-weight:600;cursor:pointer}
  button.done{background:#16a34a}
</style></head><body><main>
<h1>Copy to Jcink</h1>
<p>Each box matches a section in your Admin CP. Click Copy, then paste it into the place listed under its name.</p>
<div class="downloads">
  <a href="/__skin.xml" download>Download full skin XML (stylesheet + wrapper + macros + templates)</a>
  <a href="/__templates.xml" download>Download HTML templates XML only</a>
</div>
${pieces(skin).map(card).join("")}
<h2 style="margin:24px 0 8px">Macros</h2>
<p style="margin-bottom:8px">ACP &gt; Skins &amp; Templates &gt; Macros. Each key goes in its own box.</p>
<table>${macroRows}</table>
</main>
<script>
document.addEventListener("click", async (e) => {
  const id = e.target.dataset.copy; if (!id) return;
  await navigator.clipboard.writeText(document.getElementById("code-" + id).value);
  e.target.textContent = "Copied!"; e.target.classList.add("done");
  setTimeout(() => { e.target.textContent = "Copy"; e.target.classList.remove("done"); }, 1500);
});
new EventSource("/__live").onmessage = () => location.reload();
</script></body></html>`;
}

const TYPES = { ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp" };
const clients = new Set();

function send(res, status, type, body) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const p = decodeURIComponent(url.pathname);
    try {
      if (p === "/__live") {
        res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
        res.write(": connected\n\n");
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }
      if (p === "/__skin/stylesheet.css") return send(res, 200, "text/css", loadSkin().stylesheet);
      if (p === "/__copy") return send(res, 200, "text/html; charset=utf-8", copyPage());
      if (p === "/__skin.xml") return send(res, 200, "application/xml", skinXml());
      if (p === "/__templates.xml") return send(res, 200, "application/xml", templatesXml());
      // Jcink's default images live on its CDN.
      if (p.startsWith("/style_images/")) {
        res.writeHead(302, { Location: `https://files.jcink.net${p}` });
        return res.end();
      }
      // Your own images: skin/images/x.png -> /images/x.png. Sample data images: data/images/x.png -> /data-images/x.png.
      const imageDir = p.startsWith("/images/") ? SKIN : p.startsWith("/data-images/") ? path.join(DATA, "images") : null;
      if (imageDir) {
        const file = path.join(imageDir, p.replace(/^\/(data-)?images/, ""));
        if (file.startsWith(imageDir) && fs.existsSync(file)) {
          res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
          return fs.createReadStream(file).pipe(res);
        }
      }
      if (p === "/" || p === "/index.php") {
        const cookies = Object.fromEntries((req.headers.cookie || "").split(/;\s*/).filter(Boolean).map((c) => c.split("=")));
        const { html, warnings } = createRenderer(Object.fromEntries(url.searchParams), cookies).page();
        return send(res, 200, "text/html; charset=utf-8", html.replace(/<\/body>/i, `${DEV_CLIENT(warnings)}\n</body>`));
      }
      send(res, 404, "text/plain", "Not found");
    } catch (err) {
      send(res, 500, "text/html; charset=utf-8", `<pre style="padding:16px;color:#b00">${esc(err.message)}\n\n${esc(err.stack)}</pre><script>new EventSource("/__live").onmessage=()=>location.reload()</script>`);
    }
  })
  .listen(PORT, () => console.log(`Jcink preview: http://localhost:${PORT}\nCopy to Jcink: http://localhost:${PORT}/__copy`));

// Stylesheet edits swap in place; anything else reloads the page.
let timer;
for (const dir of [SKIN, DATA, JCINK]) {
  fs.watch(dir, { recursive: true }, (_, file) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const msg = file && file.endsWith(".css") ? "css" : "reload";
      console.log(`changed: ${path.relative(ROOT, path.join(dir, file || ""))}`);
      for (const c of clients) c.write(`data: ${msg}\n\n`);
    }, 50);
  });
}
