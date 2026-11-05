// Shared pieces for the helper pages (/__copy, /__groups, /__fields and /__forums).
const { spawn } = require("child_process");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// JSON to put inside a <script>; "<" is escaped so a title can't close the tag.
const inlineJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

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

// The Admin CP-style forms, buttons and notices used by the Fields and Forums pages.
const FORM_CSS = `
  th{text-align:left;font-size:12px;color:#71717a;font-weight:600}
  button.ghost{background:none;color:#7c3aed;padding:4px 8px}
  button.ghost:hover{background:#f5f3ff}
  button.danger{color:#dc2626} button.danger:hover{background:#fef2f2}
  button.danger.armed{background:#dc2626;color:#fff}
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
  .footer{display:flex;justify-content:flex-end;gap:8px;padding:10px 12px;border-top:1px solid #e4e4e7;background:#fafafa}
  @media (max-width:700px){
    form tr{display:block} form th,form td{display:block;width:auto;border-right:0}
    form th{border-bottom:0;padding-bottom:4px}
  }`;

const COPY_JS = `
document.addEventListener("click", async (e) => {
  const id = e.target.dataset.copy; if (!id) return;
  await navigator.clipboard.writeText(document.getElementById("code-" + id).value);
  e.target.textContent = "Copied!"; e.target.classList.add("done");
  setTimeout(() => { e.target.textContent = "Copy"; e.target.classList.remove("done"); }, 1500);
});
new EventSource("/__live").onmessage = () => location.reload();`;

// A Yes/No pair of radio buttons in an Admin CP form row.
const radios = (name, help, value) => `<tr><th>${help}</th><td class="radios">
    <label class="yes"><input type="radio" name="${name}" value="1"${value === "1" ? " checked" : ""}> Yes</label>
    <label class="no"><input type="radio" name="${name}" value="0"${value === "1" ? "" : " checked"}> No</label></td></tr>`;

// Opens a file in the computer's default app for its type.
function openFile(file) {
  const [cmd, args] =
    process.platform === "darwin" ? ["open", [file]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", '""', file]]
    : ["xdg-open", [file]];
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true, windowsVerbatimArguments: process.platform === "win32" });
    child.on("error", () => reject(new Error(`Couldn't open the file. Open it yourself: ${file}`)));
    child.on("spawn", () => { child.unref(); resolve({ ok: true }); });
  });
}

module.exports = { esc, inlineJson, PAGE_CSS, FORM_CSS, COPY_JS, radios, openFile };
