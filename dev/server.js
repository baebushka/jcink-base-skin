// Local Jcink preview with live reload. No dependencies: `npm run dev`.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
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
  <a href="/__fields" target="_blank">Fields</a>
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

// Shared look for the helper pages (/__copy, /__groups and /__fields).
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

// ---- Custom profile fields page (/__fields) ----
const FIELDS_FILE = path.join(DATA, "custom-fields.json");
const FIELD_TYPES = { text: "Text Input", area: "Text Area", drop: "Drop Down" };

function readFields() {
  return fs.existsSync(FIELDS_FILE) ? JSON.parse(fs.readFileSync(FIELDS_FILE, "utf8") || "{}") : {};
}

// Checks a field sent by the form and returns it in Jcink's export shape, or throws a readable error.
function cleanField(input) {
  const str = (v) => String(v ?? "").trim();
  const whole = (v, name) => {
    const s = str(v) || "0";
    if (!/^\d+$/.test(s)) throw new Error(`${name} must be a whole number.`);
    return String(Number(s));
  };
  const flag = (v) => (str(v) === "1" ? "1" : "0");
  const fid = str(input.fid);
  if (!/^[1-9]\d*$/.test(fid)) throw new Error("Field ID must be a whole number, 1 or higher.");
  const ftitle = str(input.ftitle);
  if (!ftitle) throw new Error("Field Title can't be empty.");
  if (ftitle.length > 200) throw new Error("Field Title is over 200 characters.");
  const fdesc = str(input.fdesc);
  if (fdesc.length > 250) throw new Error("Description is over 250 characters.");
  const ftype = str(input.ftype);
  if (!FIELD_TYPES[ftype]) throw new Error("Field Type must be Text Input, Text Area or Drop Down.");
  // Options arrive one per line ("she=she/her") and are stored the way Jcink exports them ("she=she/her|he=he/him").
  const options = String(input.fcontent ?? "")
    .split(/\r?\n|\|/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (ftype === "drop" && !options.length) throw new Error("A Drop Down needs at least one option, like she=she/her.");
  return {
    fid,
    ftitle,
    fdesc,
    fcontent: ftype === "drop" ? options.join("|") : "",
    ftype,
    freq: flag(input.freq),
    fhide: flag(input.fhide),
    fmaxinput: whole(input.fmaxinput, "Max Input"),
    fedit: flag(input.fedit),
    forder: whole(input.forder, "Display order"),
    fshowreg: flag(input.fshowreg),
    fjsonversion: "1.00",
  };
}

// Writes the file the same way Jcink's export looks: 2-space JSON, fields in ID order.
function writeFields(fields) {
  const sorted = Object.fromEntries(Object.entries(fields).sort(([a], [b]) => Number(a) - Number(b)));
  fs.writeFileSync(FIELDS_FILE, JSON.stringify(sorted, null, 2) + "\n");
}

// { original, field } -> saves (adding, editing or renumbering). { delete: "76" } -> removes.
function changeFields(body) {
  const fields = readFields();
  if (body.delete !== undefined) {
    if (!fields[body.delete]) throw new Error(`Field ${body.delete} doesn't exist.`);
    delete fields[body.delete];
    writeFields(fields);
    return { ok: true };
  }
  const field = cleanField(body.field || {});
  const original = body.original ? String(body.original) : null;
  if (fields[field.fid] && field.fid !== original) throw new Error(`Field ${field.fid} already exists (${fields[field.fid].ftitle}). Pick another ID.`);
  if (original && original !== field.fid) delete fields[original];
  fields[field.fid] = field;
  writeFields(fields);
  // A new field (or a new ID) gets an empty answer for every sample member, ready to fill in.
  if (original === field.fid) return { ok: true, fid: field.fid };
  try {
    return { ok: true, fid: field.fid, members: addMemberAnswers(field.fid, original) };
  } catch (err) {
    return { ok: true, fid: field.fid, membersError: err.message };
  }
}

const MEMBERS_FILE = path.join(DATA, "members.json");
const fieldNumber = (key) => (/^(field_)?\d+$/.test(key) ? Number(key.replace("field_", "")) : Number.MAX_SAFE_INTEGER);

// Gives every member in data/members.json a "field_N": "" answer, keeping answers in field order.
// When a field's ID changed (from), its answers move to the new ID instead.
// Returns how many members were changed.
function addMemberAnswers(fid, from) {
  if (!fs.existsSync(MEMBERS_FILE)) return 0;
  let members;
  try {
    members = JSON.parse(fs.readFileSync(MEMBERS_FILE, "utf8"));
  } catch (err) {
    throw new Error(`data/members.json is not valid JSON (${err.message}), so no empty answers were added.`);
  }
  if (!Array.isArray(members)) return 0;
  const key = `field_${fid}`;
  let changed = 0;
  for (const m of members) {
    if (!m || typeof m !== "object") continue;
    const answers = m.fields && typeof m.fields === "object" ? m.fields : {};
    if (key in answers || fid in answers) continue;
    const oldKey = from ? [`field_${from}`, from].find((k) => k in answers) : undefined;
    const value = oldKey !== undefined ? answers[oldKey] : "";
    if (oldKey !== undefined) delete answers[oldKey];
    answers[key] = value;
    // Keep field_1, field_2, … in number order; anything else keeps its place after them.
    m.fields = Object.fromEntries(Object.entries(answers).sort(([a], [b]) => fieldNumber(a) - fieldNumber(b)));
    changed++;
  }
  if (changed) fs.writeFileSync(MEMBERS_FILE, JSON.stringify(members, null, 2) + "\n");
  return changed;
}

function fieldsPage() {
  let fields = {};
  let error = "";
  try {
    fields = readFields();
  } catch (err) {
    error = `data/custom-fields.json couldn't be read: ${err.message}`;
  }
  const list = Object.values(fields).sort((a, b) => Number(a.forder) - Number(b.forder) || Number(a.fid) - Number(b.fid));
  const nextId = Math.max(0, ...Object.keys(fields).map(Number).filter(Number.isFinite)) + 1;
  const nextOrder = Math.max(0, ...list.map((f) => Number(f.forder) || 0)) + 1;
  const yes = (v) => (v === "1" ? '<span class="yes">Yes</span>' : '<span class="no">No</span>');
  const rows = list
    .map(
      (f) => `<tr>
  <td><code>${esc(f.fid)}</code></td>
  <td><b>${esc(f.ftitle)}</b>${f.fdesc ? `<p>${esc(f.fdesc)}</p>` : ""}</td>
  <td>${esc(FIELD_TYPES[f.ftype] || f.ftype)}</td>
  <td><button class="var" data-var="&lt;!-- |field_${esc(f.fid)}| --&gt;" title="Copy">&lt;!-- |field_${esc(f.fid)}| --&gt;</button></td>
  <td>${yes(f.freq)}</td><td>${yes(f.fhide)}</td><td>${yes(f.fshowreg)}</td><td>${yes(f.fedit)}</td>
  <td>${esc(f.forder)}</td>
  <td class="actions"><button class="ghost" data-edit="${esc(f.fid)}">Edit</button><button class="ghost danger" data-delete="${esc(f.fid)}">Delete</button></td>
</tr>`,
    )
    .join("");
  const radios = (name, help, value) => `<tr><th>${help}</th><td class="radios">
    <label class="yes"><input type="radio" name="${name}" value="1"${value === "1" ? " checked" : ""}> Yes</label>
    <label class="no"><input type="radio" name="${name}" value="0"${value === "1" ? "" : " checked"}> No</label></td></tr>`;
  // Inline JSON for the page's script; "<" is escaped so a title can't close the <script>.
  const json = JSON.stringify(fields).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Custom profile fields</title>
<style>${PAGE_CSS}
  main{max-width:1100px}
  th{text-align:left;font-size:12px;color:#71717a;font-weight:600}
  .list th{border-top:0}
  .list td p{margin:0}
  .table-wrap{overflow-x:auto;margin:16px 0 28px}
  span.yes{color:#15803d} span.no{color:#a1a1aa}
  button.var{background:none;color:#18181b;border:1px solid #e4e4e7;font:12px ui-monospace,monospace;padding:3px 6px;white-space:nowrap}
  button.var.done{background:#dcfce7}
  button.ghost{background:none;color:#7c3aed;padding:4px 8px}
  button.ghost:hover{background:#f5f3ff}
  button.danger{color:#dc2626} button.danger:hover{background:#fef2f2}
  button.danger.armed{background:#dc2626;color:#fff}
  td.actions{white-space:nowrap;text-align:right}
  .empty{padding:16px;color:#71717a}
  .file-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:14px 0 0;font-size:12px;color:#71717a}
  .file-bar button{background:#18181b} .file-bar button.done{background:#16a34a}
  .alert{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;margin:12px 0}
  .alert[hidden]{display:none}
  .notice{background:#f0fdf4;color:#15803d;border-color:#bbf7d0}
  form{background:#fff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden}
  form > h2{background:#18181b;color:#fff;padding:10px 12px;display:flex;justify-content:space-between;align-items:center}
  form > h2 button{font-size:12px;font-weight:500;background:#fff2}
  form table{border:0;border-radius:0}
  form th{width:50%;color:#18181b;font-size:14px;background:#fafafa;border-right:1px solid #e4e4e7;padding:10px 12px;vertical-align:top}
  form th b{display:block} form th span{display:block;font-weight:400;color:#52525b;font-size:13px} form th i{display:block;font-weight:400;color:#71717a;font-size:12px}
  form td{padding:10px 12px}
  form input[type=text],form input[type=number],form select{font:inherit;padding:5px 8px;border:1px solid #d4d4d8;border-radius:5px;width:100%;max-width:320px;box-sizing:border-box;background:#fff}
  form td textarea{height:110px;max-width:100%;border:1px solid #d4d4d8;border-radius:5px;background:#fff}
  .count{font-size:11px;color:#a1a1aa;margin-top:2px}
  .radios{display:flex;gap:10px;flex-wrap:wrap}
  .radios label{display:flex;align-items:center;gap:6px;padding:5px 14px 5px 8px;border-radius:5px;cursor:pointer;min-width:70px}
  .radios label.yes{background:#dcfce7;border:1px solid #86efac;color:#14532d}
  .radios label.no{background:#fee2e2;border:1px solid #fca5a5;color:#7f1d1d}
  tr.drop-only.off{display:none}
  .demo select{max-width:160px}
  .footer{display:flex;justify-content:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #e4e4e7;background:#fafafa}
  #json-out{margin-top:16px}
  #json-out textarea{height:280px}
  @media (max-width:700px){
    form tr{display:block} form th,form td{display:block;width:auto;border-right:0}
    form th{border-bottom:0;padding-bottom:4px}
  }
</style></head><body><main>
<h1>Custom profile fields</h1>
<p>From <code>data/custom-fields.json</code>, in the same format as Jcink's export. Saving here writes the file for you. Give your sample members answers in <code>data/members.json</code> under <code>"fields"</code>.</p>
<div class="file-bar"><button type="button" id="open-file" title="${esc(FIELDS_FILE)}">Open custom-fields.json</button><span>Opens the file on your computer, in your default app for .json files.</span></div>
${error ? `<div class="alert">${esc(error)}</div>` : ""}
<div id="notice" class="alert notice" hidden></div>
<div class="table-wrap"><table class="list">
  <tr><th>ID</th><th>Field Title</th><th>Type</th><th>Template Variable</th><th>Required</th><th>Hidden</th><th>Show on Reg.</th><th>Member Editable</th><th>Order</th><th></th></tr>
  ${rows || '<tr><td colspan="10" class="empty">No fields yet. Add one below.</td></tr>'}
</table></div>

<form id="field-form" autocomplete="off" novalidate>
  <h2><span id="form-title">Add a field</span><button type="button" id="new-field" hidden>+ New field instead</button></h2>
  <div id="form-error" class="alert" hidden style="margin:12px"></div>
  <table>
    <tr><th><b>Field ID</b><span>Its template variable: <code id="var-preview">&lt;!-- |field_${nextId}| --&gt;</code></span><i>Not in the Admin CP form; Jcink picks the number. Use your board's number if you're copying a field.</i></th>
      <td><input type="number" name="fid" min="1" value="${nextId}" required></td></tr>
    <tr><th><b>Field Title</b><span>Max characters: 200</span></th>
      <td><input type="text" name="ftitle" maxlength="200" required><div class="count" data-count="ftitle"></div></td></tr>
    <tr><th><b>Description</b><span>Max Characters: 250</span><span>Can be used to note hidden/required status</span></th>
      <td><input type="text" name="fdesc" maxlength="250"><div class="count" data-count="fdesc"></div></td></tr>
    <tr><th><b>Field Type</b></th>
      <td><select name="ftype">${Object.entries(FIELD_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></td></tr>
    <tr><th><b>Max Input (for text input and text areas) in characters</b><span>0 = no limit</span></th>
      <td><input type="number" name="fmaxinput" min="0" value="0"></td></tr>
    <tr><th><b>Display order (when editing and displaying) numeric 1 lowest.</b></th>
      <td><input type="number" name="forder" min="0" value="${nextOrder}"></td></tr>
    <tr class="drop-only"><th><b>Option Content (for drop downs)</b><span>In sets, one set per line. Example for 'Pronouns' field:</span>
      <span><code>she=she/her</code><br><code>he=he/him</code><br><code>they=they/them</code><br><code>o=other</code></span>
      <span class="demo">Will produce: <select id="option-demo"></select></span>
      <span>The key (she, he, they or o) is stored. When showing the field in a profile, the label is used (they=they/them shows 'they/them').</span></th>
      <td><textarea name="fcontent" spellcheck="false" placeholder="she=she/her&#10;he=he/him&#10;they=they/them&#10;o=other"></textarea></td></tr>
    ${radios("fshowreg", "<b>Include on registration page?</b><span>(Will not appear if the field cannot be edited by the member)</span>", "0")}
    ${radios("freq", "<b>Field MUST be completed and not left empty?</b><span>(Will not apply if you choose to hide below)</span>", "0")}
    ${radios("fhide", "<b>Hide from the member's profile?</b><span>If yes, only admins and super mods can see it, user can still edit <b style=\"display:inline\">if</b> the below option is set to 'Yes'</span><i>Note: This setting has no effect on &lt;!-- |field_#| --&gt; variable display in main profiles.</i>", "0")}
    ${radios("fedit", "<b>Field can be edited by the member?</b><span>If no, user cannot edit information, field can only be seen by admins and super mods. Admins can edit information via ACP.</span><i>Note: This setting has no effect on &lt;!-- |field_#| --&gt; variable display in main profiles.</i>", "1")}
  </table>
  <div class="footer"><button type="button" class="ghost" id="show-json">Show JSON</button><button type="submit" id="save">Add field</button></div>
</form>

<section id="json-out" hidden><header><div><h2>JSON for this field</h2><p>Already saved to the file when you click Add/Save. Copy this to share it, or to paste into another project's <code>custom-fields.json</code>.</p></div><button data-copy="field-json">Copy</button></header>
<textarea id="code-field-json" readonly spellcheck="false"></textarea></section>
</main>
<script>${COPY_JS.replace(/\nnew EventSource[^\n]*/, "")}
const FIELDS = ${json};
const NEXT = { fid: "${nextId}", forder: "${nextOrder}" };
const form = document.getElementById("field-form");
const el = (n) => form.elements[n];
let editing = null; // the original fid while editing
let dirty = false;

const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };

function options() {
  return el("fcontent").value.split(/\\r?\\n|\\|/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf("=");
    return i < 0 ? { key: l, label: l } : { key: l.slice(0, i).trim(), label: l.slice(i + 1).trim() };
  });
}

// The field exactly as it will be written to custom-fields.json.
function current() {
  const radio = (n) => (form.querySelector('input[name="' + n + '"]:checked') || {}).value || "0";
  const type = el("ftype").value;
  return {
    fid: el("fid").value.trim(), ftitle: el("ftitle").value.trim(), fdesc: el("fdesc").value.trim(),
    fcontent: type === "drop" ? options().map((o) => (o.key === o.label ? o.key : o.key + "=" + o.label)).join("|") : "",
    ftype: type, freq: radio("freq"), fhide: radio("fhide"), fmaxinput: String(Number(el("fmaxinput").value) || 0),
    fedit: radio("fedit"), forder: String(Number(el("forder").value) || 0), fshowreg: radio("fshowreg"), fjsonversion: "1.00",
  };
}

function refresh() {
  const isDrop = el("ftype").value === "drop";
  document.querySelectorAll(".drop-only").forEach((r) => r.classList.toggle("off", !isDrop));
  const demo = document.getElementById("option-demo");
  const opts = options();
  demo.innerHTML = "";
  (opts.length ? opts : [{ label: "she/her" }, { label: "he/him" }, { label: "they/them" }, { label: "other" }]).forEach((o) => demo.add(new Option(o.label)));
  document.getElementById("var-preview").textContent = "<!-- |field_" + (el("fid").value || "#") + "| -->";
  for (const c of document.querySelectorAll("[data-count]")) {
    const input = el(c.dataset.count);
    c.textContent = input.value.length + " / " + input.maxLength;
  }
  const f = current();
  document.getElementById("code-field-json").value = JSON.stringify({ [f.fid || "#"]: f }, null, 2).replace(/^\\{\\n|\\n\\}$/g, "").replace(/^  /gm, "");
}

function fill(f) {
  form.reset();
  for (const n of ["fid", "ftitle", "fdesc", "ftype", "fmaxinput", "forder"]) el(n).value = f[n] ?? "";
  if (!el("ftype").value) el("ftype").value = "text";
  el("fcontent").value = String(f.fcontent || "").split("|").map((o) => o.trim()).filter(Boolean).join("\\n");
  for (const n of ["freq", "fhide", "fedit", "fshowreg"]) {
    const r = form.querySelector('input[name="' + n + '"][value="' + (f[n] === "1" ? "1" : "0") + '"]');
    if (r) r.checked = true;
  }
  refresh();
}

function startNew() {
  editing = null; dirty = false;
  fill({ fid: NEXT.fid, forder: NEXT.forder, ftype: "text", fmaxinput: "0", fedit: "1" });
  document.getElementById("form-title").textContent = "Add a field";
  document.getElementById("save").textContent = "Add field";
  document.getElementById("new-field").hidden = true;
  document.getElementById("form-error").hidden = true;
}

function startEdit(fid) {
  const f = FIELDS[fid]; if (!f) return;
  editing = fid; dirty = false;
  fill(f);
  document.getElementById("form-title").textContent = "Edit field " + fid + ": " + f.ftitle;
  document.getElementById("save").textContent = "Complete Edit";
  document.getElementById("new-field").hidden = false;
  document.getElementById("form-error").hidden = true;
  form.scrollIntoView({ behavior: "smooth" });
}

async function post(body, url = "/__fields") {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ error: "The preview server didn't answer." }));
  if (!res.ok || out.error) throw new Error(out.error || "Couldn't save.");
  return out;
}

function disarm(btn) { clearTimeout(btn.timer); btn.classList.remove("armed"); btn.textContent = "Delete"; btn.title = ""; }

// A message at the top of the page: green for done, red for a problem.
function showTop(msg, isError) {
  const box = document.getElementById("notice");
  box.textContent = msg; box.classList.toggle("notice", !isError); box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showError(msg) {
  const box = document.getElementById("form-error");
  box.textContent = msg; box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}

form.addEventListener("input", () => { dirty = true; refresh(); });
form.addEventListener("change", refresh);
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const f = current();
    const out = await post({ original: editing, field: f });
    let msg = (editing ? "Saved" : "Added") + " field " + out.fid + " (" + f.ftitle + "). Use it with <!-- |field_" + out.fid + "| -->.";
    if (out.members) msg += " Added an empty \\"field_" + out.fid + "\\" answer to " + out.members + " sample member" + (out.members === 1 ? "" : "s") + " in data/members.json.";
    if (out.membersError) msg += " " + out.membersError;
    flash(msg, Boolean(out.membersError));
    dirty = false; location.reload();
  } catch (err) { showError(err.message); }
});
document.getElementById("new-field").onclick = startNew;
document.getElementById("open-file").onclick = async (e) => {
  const btn = e.currentTarget;
  try {
    await post({}, "/__fields/open");
    btn.textContent = "Opened!"; btn.classList.add("done");
  } catch (err) {
    btn.textContent = "Couldn't open it"; showTop(err.message, true);
  }
  setTimeout(() => { btn.textContent = "Open custom-fields.json"; btn.classList.remove("done"); }, 1500);
};
document.getElementById("show-json").onclick = (e) => {
  const box = document.getElementById("json-out");
  box.hidden = !box.hidden;
  e.target.textContent = box.hidden ? "Show JSON" : "Hide JSON";
};
document.addEventListener("click", async (e) => {
  const ed = e.target.closest("[data-edit]");
  if (ed) startEdit(ed.dataset.edit);
  // Delete asks on the page itself (first click arms the button, second click deletes), because
  // browsers that block pop-ups answer confirm() with "Cancel" without ever showing it.
  const del = e.target.closest("[data-delete]");
  if (del) {
    const f = FIELDS[del.dataset.delete];
    if (!del.classList.contains("armed")) {
      document.querySelectorAll("[data-delete].armed").forEach(disarm);
      del.classList.add("armed"); del.textContent = "Really delete?";
      del.title = "Click again to delete field " + f.fid + ". Sample members' answers for it stay in members.json, and the preview will warn about them.";
      del.timer = setTimeout(() => disarm(del), 4000);
      return;
    }
    clearTimeout(del.timer);
    try { await post({ delete: f.fid }); flash("Deleted field " + f.fid + " (" + f.ftitle + ")."); location.reload(); }
    catch (err) { disarm(del); showTop(err.message, true); }
  }
  const v = e.target.closest("[data-var]");
  if (v) { await navigator.clipboard.writeText(v.dataset.var); v.classList.add("done"); setTimeout(() => v.classList.remove("done"), 1000); }
});

// Saving reloads the page, and the file watcher may reload it once more, so the notice lives for a few seconds.
function flash(msg, isError) { store.set("dev_fields_notice", JSON.stringify({ msg, isError, at: Date.now() })); }
try {
  const n = JSON.parse(store.get("dev_fields_notice"));
  if (n && Date.now() - n.at < 5000) { const box = document.getElementById("notice"); box.textContent = n.msg; box.classList.toggle("notice", !n.isError); box.hidden = false; }
} catch {}
startNew();
// Reload when data files change, unless you're halfway through filling in the form.
new EventSource("/__live").onmessage = () => { if (!dirty) location.reload(); };
</script></body></html>`;
}

// Opens data/custom-fields.json in the computer's default app for .json files.
function openFieldsFile() {
  if (!fs.existsSync(FIELDS_FILE)) throw new Error("data/custom-fields.json doesn't exist yet. Add a field first.");
  const [cmd, args] =
    process.platform === "darwin" ? ["open", [FIELDS_FILE]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", '""', FIELDS_FILE]]
    : ["xdg-open", [FIELDS_FILE]];
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true, windowsVerbatimArguments: process.platform === "win32" });
    child.on("error", () => reject(new Error(`Couldn't open the file. Open it yourself: ${FIELDS_FILE}`)));
    child.on("spawn", () => { child.unref(); resolve({ ok: true }); });
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error("Request too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
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
      if ((p === "/__fields" || p === "/__fields/open") && req.method === "POST") {
        // Only the Fields page may write or open the file: a JSON body (which other websites can't send without asking) from this origin.
        const origin = req.headers.origin;
        if (!/^application\/json\b/.test(req.headers["content-type"] || "") || (origin && origin !== `http://${req.headers.host}`)) {
          return send(res, 403, "application/json", JSON.stringify({ error: "Forbidden" }));
        }
        readBody(req)
          .then((body) => (p === "/__fields/open" ? openFieldsFile() : changeFields(JSON.parse(body || "{}"))))
          .then((out) => send(res, 200, "application/json", JSON.stringify(out)))
          .catch((err) => send(res, 400, "application/json", JSON.stringify({ error: err.message })));
        return;
      }
      if (p === "/__fields") return send(res, 200, "text/html; charset=utf-8", fieldsPage());
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
  .listen(PORT, () => console.log(`Jcink preview: http://localhost:${PORT}\nCopy to Jcink: http://localhost:${PORT}/__copy\nMember groups: http://localhost:${PORT}/__groups\nProfile fields: http://localhost:${PORT}/__fields`));

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
