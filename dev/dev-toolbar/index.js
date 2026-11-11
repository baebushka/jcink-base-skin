// The dev toolbar: builds its HTML from toolbar.html, with toolbar.css and toolbar.js inlined.
// The files are read on every page load, so edits show up without restarting the server.
const fs = require("fs");
const path = require("path");
const { esc } = require("../page-kit");

const DIR = __dirname;
const read = (file) => fs.readFileSync(path.join(DIR, file), "utf8");

// The helper pages listed in the "Sample data forms" menu. Each opens in a new tab.
const PAGES = [
  ["/__groups", "Groups"],
  ["/__fields", "Fields"],
  ["/__members", "Members"],
  ["/__forums", "Forums"],
];

// A new value each time the server starts. The toolbar only reuses a dragged position saved with
// the same value, so it goes back to the bottom-right corner after the server restarts.
const BOOT = Date.now().toString(36);

// devSetGroup(id), for the Groups page too.
const setGroupJs = () => read("set-group.js");

function groupSelect({ groups, selected, own }) {
  const options = groups.map((g) => `<option value="${g.id}"${g.id === selected ? " selected" : ""}>${g.id} &middot; ${esc(g.name)}</option>`);
  return `<select id="dev-group" title="Preview as member group (&lt;!-- |g_id| --&gt;)" onchange="devSetGroup(this.value); location.href = location.href.replace(/([?&])guest=1&?/, '$1').replace(/[?&]$/, '')">
    <option value=""${selected ? "" : " selected"}>Group: own${own ? ` (${esc(own)})` : ""}</option>${options.join("")}
  </select>`;
}

// No warnings: the section and its | are left out.
function warningsSection(warnings) {
  if (!warnings.length) return "";
  return `<i class="dev-sep">|</i>
  <details class="dev-sec dev-warn"><summary>&#9888;&#65039; ${warnings.length}</summary><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></details>`;
}

// `state` is the renderer's toolbar info: { groups, selected, own }.
function toolbar(warnings, state) {
  const parts = {
    boot: BOOT,
    groupSelect: groupSelect(state),
    pages: PAGES.map(([href, label]) => `<a href="${href}" target="_blank">${label}</a>`).join(""),
    warnings: warningsSection(warnings),
  };
  const html = read("toolbar.html")
    .replace(/<!--[\s\S]*?-->\s*/, "") // the note at the top of the file
    .replace(/\{\{(\w+)\}\}/g, (_, name) => parts[name] ?? "");
  // The CSS comes before toolbar.js, which needs the bar's real size to restore a dragged position.
  return `<style>${read("toolbar.css")}</style>
<script>${setGroupJs()}</script>
${html}
<script>${read("toolbar.js")}</script>`;
}

module.exports = { DIR, toolbar, setGroupJs };
