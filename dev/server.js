// Local Jcink preview with live reload. No dependencies: `npm run dev`.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { ROOT, SKIN, DATA, JCINK, loadSkin, loadGroups, groupStyle } = require("./skin");
const { createRenderer } = require("./render");
const { pieces, skinXml, templatesXml } = require("./pieces");

const PORT = process.env.PORT || 3000;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The toolbar's group dropdown (and the Groups page) remember the choice in a "dev_group" cookie.
const SET_GROUP_JS = `function devSetGroup(id) {
  document.cookie = id ? "dev_group=" + id + "; path=/; max-age=31536000" : "dev_group=; path=/; max-age=0";
}`;

function groupSelect({ groups, selected, own }) {
  const options = groups.map((g) => `<option value="${g.id}"${g.id === selected ? " selected" : ""}>${g.id} &middot; ${esc(g.name)}</option>`);
  return `<select id="dev-group" title="Preview as member group (&lt;!-- |g_id| --&gt;)" onchange="devSetGroup(this.value); location.href = location.href.replace(/([?&])guest=1&?/, '$1').replace(/[?&]$/, '')">
    <option value=""${selected ? "" : " selected"}>Group: own${own ? ` (${esc(own)})` : ""}</option>${options.join("")}
  </select>`;
}

const DEV_CLIENT = (warnings, toolbar) => `
<script>
(() => {
  const es = new EventSource("/__live");
  es.onmessage = (e) => {
    if (e.data === "css") {
      document.querySelectorAll("link[data-dev-css]").forEach((l) => (l.href = l.href.split("?")[0] + "?t=" + Date.now()));
    } else location.reload();
  };
})();
${SET_GROUP_JS}
</script>
<nav id="dev-bar">
  <a href="/">Index</a><a href="/index.php?showforum=1">Forum</a><a href="/index.php?showtopic=1">Topic</a>
  <a href="/index.php?showuser=1">Profile</a><a href="/index.php?act=Members">Members</a>
  ${groupSelect(toolbar)}
  <a href="/__groups" target="_blank">Groups</a>
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
  #dev-bar select{color:#fff;background:#fff1;border:0;border-radius:5px;padding:5px 4px;font:inherit;cursor:pointer;max-width:170px}
  #dev-bar option{color:#111;background:#fff}
  #dev-bar ul{position:absolute;bottom:100%;right:0;margin:0 0 6px;padding:10px 10px 10px 26px;max-width:420px;background:#111;color:#fff;border-radius:8px;line-height:1.5}
  .dev-missing{color:#c00;font:11px monospace}
</style>`;

// Shared look for the helper pages (/__copy and /__groups).
const PAGE_CSS = `
  body{margin:0;background:#f4f4f5;color:#18181b;font:14px/1.5 system-ui,sans-serif}
  main{max-width:900px;margin:0 auto;padding:24px 16px}
  h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;margin:0} p{margin:0;color:#71717a;font-size:12px}
  section{background:#fff;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:12px;overflow:hidden}
  section header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px}
  textarea{display:block;width:100%;box-sizing:border-box;border:0;border-top:1px solid #e4e4e7;font:12px/1.4 ui-monospace,monospace;padding:10px;height:120px;resize:vertical;background:#fafafa}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e4e4e7;border-radius:8px}
  td,th{padding:6px 8px;border-top:1px solid #e4e4e7;vertical-align:middle} td textarea{border:1px solid #e4e4e7;height:auto;border-radius:4px}
  button{background:#7c3aed;color:#fff;border:0;border-radius:6px;padding:6px 14px;font-weight:600;cursor:pointer}
  button.done{background:#16a34a}`;

const COPY_JS = `
document.addEventListener("click", async (e) => {
  const id = e.target.dataset.copy; if (!id) return;
  await navigator.clipboard.writeText(document.getElementById("code-" + id).value);
  e.target.textContent = "Copied!"; e.target.classList.add("done");
  setTimeout(() => { e.target.textContent = "Copy"; e.target.classList.remove("done"); }, 1500);
});
new EventSource("/__live").onmessage = () => location.reload();`;

// "Board Owner" -> "board-owner", for the .board-owner / #board-owner selectors.
const nameSlug = (name) => String(name).replace(/<[^>]*>/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// One rule per group: its hex colours, the same colours as RGB, then its other CSS variables.
function groupCss(groups) {
  return (
    groups
      .map((g) => {
        const { colours, vars } = groupStyle(g);
        const slug = nameSlug(g.name);
        const named = /^[a-z]/.test(slug) ? `,\n.${slug}, #${slug}` : ""; // a class can't start with a number
        const blocks = [
          colours.map((c) => `--clr${c.n}-hex: ${c.hex};`),
          colours.map((c) => `--clr${c.n}-rgb: ${c.rgb};`),
          vars.map((v) => `${v.name}: ${v.value};`),
        ].filter((b) => b.length);
        const id = g.id;
        return `/* #${id} ${String(g.name).replace(/\*\//g, "")} */
#g-${id}, .g-${id}, #m-${id}, .m-${id}, .gr-${id}, .group-${id}${named} {
${blocks.map((b) => b.join("\n")).join("\n\n")}
}`;
      })
      .join("\n\n") + "\n"
  );
}

// Gradient stops built from every colour number any group uses, at a range of opacities.
const GRADIENT_STEPS = [["10", "0.10"], ["25", "0.25"], ["35", "0.35"], ["50", "0.50"], ["65", "0.65"], ["75", "0.75"], ["00", "1"]];
function gradientCss(groups) {
  const numbers = [...new Set(groups.flatMap((g) => groupStyle(g).colours.map((c) => c.n)))].sort((a, b) => a - b);
  if (!numbers.length) return "";
  return GRADIENT_STEPS.map(([label, alpha]) => `--gradient-${label}: ${numbers.map((n) => `rgba(var(--clr${n}-rgb), ${alpha})`).join(", ")};`).join("\n") + "\n";
}

// Groups that are missing a colour the gradient uses (their gradient won't work).
function gradientGaps(groups) {
  const numbers = new Set(groups.flatMap((g) => groupStyle(g).colours.map((c) => c.n)));
  return groups
    .map((g) => {
      const has = new Set(groupStyle(g).colours.map((c) => c.n));
      const missing = [...numbers].filter((n) => !has.has(n)).sort((a, b) => a - b);
      return missing.length ? `${g.name} has no ${missing.map((n) => `clr${n}-hex`).join(", ")}` : null;
    })
    .filter(Boolean);
}

function groupsPage(cookies) {
  const groups = loadGroups();
  const current = groups.some((g) => g.id === Number(cookies.dev_group)) ? Number(cookies.dev_group) : null;
  const swatch = (c) =>
    `<button class="swatch" data-hex="${esc(c.hex)}" title="Copy ${esc(c.key)}"><i style="background:${esc(c.hex)}"></i><span><b>clr${c.n}</b> ${esc(c.hex)} <em>${esc(c.rgb)}</em></span></button>`;
  const rows = groups
    .map((g) => {
      const { colours, vars, problems } = groupStyle(g);
      return `<tr${g.id === current ? ' class="current"' : ""}>
  <td><code>${g.id}</code></td>
  <td><b>${esc(g.name)}</b>${g.id === current ? ' <span class="tag">previewing</span>' : ""}${problems.map((p) => `<p class="problem">&#9888; ${esc(p)}</p>`).join("")}</td>
  <td><div class="swatches">${colours.map(swatch).join("") || "<p>No <code>clr#-hex</code> colours</p>"}</div></td>
  <td>${vars.map((v) => `<code class="var">${esc(v.name)}: ${esc(v.value)}</code>`).join("") || "<p>&ndash;</p>"}</td>
  <td><button data-preview="${g.id}">Preview</button></td>
</tr>`;
    })
    .join("");
  const gaps = gradientGaps(groups);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Member groups</title>
<style>${PAGE_CSS}
  th{text-align:left;font-size:12px;color:#71717a;font-weight:600;border-top:0}
  tr.current td{background:#f5f3ff}
  .tag{font-size:11px;background:#7c3aed;color:#fff;border-radius:4px;padding:1px 6px;margin-left:4px}
  .swatches{display:flex;flex-wrap:wrap;gap:6px}
  button.swatch{display:flex;align-items:center;gap:6px;background:#fff;color:#18181b;border:1px solid #e4e4e7;padding:3px 8px 3px 3px;font:12px ui-monospace,monospace}
  button.swatch i{width:20px;height:20px;border-radius:4px;box-shadow:inset 0 0 0 1px #0002}
  button.swatch.done{background:#dcfce7}
  button.swatch em{font-style:normal;color:#71717a}
  code.var{display:block;font-size:12px;white-space:nowrap}
  p.problem{color:#b45309;margin-top:2px}
  .bar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:16px 0 12px;flex-wrap:wrap}
  .bar a{color:#7c3aed}
  .generate{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:8px 0 12px}
  .generate label{display:flex;align-items:center;gap:6px;cursor:pointer}
  .table-wrap{overflow-x:auto}
  section textarea{height:260px}
  @media (max-width:600px){ td:nth-child(5),th:nth-child(5){display:none} }
</style></head><body><main>
<h1>Member groups</h1>
<p>From <code>data/groups.json</code>. Jcink prints a member's group number with <code>&lt;!-- |g_id| --&gt;</code>. Click a colour to copy its hex code, or <b>Preview</b> to see the board as that group.</p>
<div class="bar"><span>${current ? `Previewing as <b>${esc(groups.find((g) => g.id === current).name)}</b>.` : "Previewing as the viewer's own group."}</span>
  ${current ? '<a href="#" data-preview="">Back to own group</a>' : ""}</div>
<div class="table-wrap"><table><tr><th>ID</th><th>Name</th><th>Colours</th><th>CSS variables</th><th></th></tr>${rows}</table></div>
<h2 style="margin:24px 0 4px">Generate CSS</h2>
<p>Builds one CSS rule per group, with every colour as hex and RGB, plus the group's other CSS variables.</p>
<div class="generate"><button id="generate">Generate</button><label><input type="checkbox" id="gen-gradient"> Generate gradient?</label></div>
<section id="out-groups" hidden><header><div><h2>Group CSS</h2><p>Paste into your stylesheet</p></div><button data-copy="group-css">Copy</button></header>
<textarea id="code-group-css" readonly spellcheck="false">${esc(groupCss(groups))}</textarea></section>
<section id="out-gradient" hidden><header><div><h2>Gradients</h2><p>Paste inside your stylesheet's <code>body { }</code> rule. It only works when <code>&lt;body&gt;</code> has a group class, like <code>class="g-&lt;!-- |g_id| --&gt;"</code>.</p>${
    gaps.length ? `<p class="problem">&#9888; ${esc(gaps.join("; "))}. Their gradients won't work until you add those colours.</p>` : ""
  }</div><button data-copy="gradient-css">Copy</button></header>
<textarea id="code-gradient-css" readonly spellcheck="false">${esc(gradientCss(groups) || "/* No group has a clr#-hex colour yet. */")}</textarea></section>
</main>
<script>${COPY_JS}
${SET_GROUP_JS}
// Generate shows the CSS. The choice is kept for this tab, so the output stays after a live reload.
const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} } };
const gradientBox = document.getElementById("gen-gradient");
gradientBox.checked = store.get("dev_gen_gradient") === "1";
function showGenerated() {
  document.getElementById("out-groups").hidden = false;
  document.getElementById("out-gradient").hidden = !gradientBox.checked;
}
document.getElementById("generate").onclick = () => { store.set("dev_generated", "1"); showGenerated(); };
gradientBox.onchange = () => { store.set("dev_gen_gradient", gradientBox.checked ? "1" : "0"); if (store.get("dev_generated")) showGenerated(); };
if (store.get("dev_generated")) showGenerated();
document.addEventListener("click", async (e) => {
  const sw = e.target.closest("[data-hex]");
  if (sw) {
    await navigator.clipboard.writeText(sw.dataset.hex);
    sw.classList.add("done"); setTimeout(() => sw.classList.remove("done"), 1000);
  }
  const pv = e.target.closest("[data-preview]");
  if (pv) { e.preventDefault(); devSetGroup(pv.dataset.preview); pv.dataset.preview ? (location.href = "/") : location.reload(); }
});
</script></body></html>`;
}

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
<style>${PAGE_CSS}
  .downloads{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 24px}
  .downloads a{background:#18181b;color:#fff;text-decoration:none;padding:8px 12px;border-radius:6px;font-weight:600}
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
<script>${COPY_JS}
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
      const cookies = Object.fromEntries((req.headers.cookie || "").split(/;\s*/).filter(Boolean).map((c) => c.split("=")));
      if (p === "/__copy") return send(res, 200, "text/html; charset=utf-8", copyPage());
      if (p === "/__groups") return send(res, 200, "text/html; charset=utf-8", groupsPage(cookies));
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
        const { html, warnings, toolbar } = createRenderer(Object.fromEntries(url.searchParams), cookies).page();
        return send(res, 200, "text/html; charset=utf-8", html.replace(/<\/body>/i, `${DEV_CLIENT(warnings, toolbar)}\n</body>`));
      }
      send(res, 404, "text/plain", "Not found");
    } catch (err) {
      send(res, 500, "text/html; charset=utf-8", `<pre style="padding:16px;color:#b00">${esc(err.message)}\n\n${esc(err.stack)}</pre><script>new EventSource("/__live").onmessage=()=>location.reload()</script>`);
    }
  })
  .listen(PORT, () => console.log(`Jcink preview: http://localhost:${PORT}\nCopy to Jcink: http://localhost:${PORT}/__copy\nMember groups: http://localhost:${PORT}/__groups`));

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
