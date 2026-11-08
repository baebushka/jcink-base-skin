// The Members page (/__members): add, edit and delete the sample members in data/members.json,
// including their subaccounts and their answers to every custom profile field.
const fs = require("fs");
const path = require("path");
const { DATA, loadGroups } = require("./skin");
const { esc, inlineJson, PAGE_CSS, FORM_CSS, radios, openFile } = require("./page-kit");

const FILE = path.join(DATA, "members.json");
const FIELDS_FILE = path.join(DATA, "custom-fields.json");
const FORUMS_FILE = path.join(DATA, "forums.json");
const BOARD_FILE = path.join(DATA, "board.json");
const IMAGES = path.join(DATA, "images");

// ---------- reading and writing ----------

function read() {
  if (!fs.existsSync(FILE)) return [];
  let members;
  try {
    members = JSON.parse(fs.readFileSync(FILE, "utf8") || "[]");
  } catch (err) {
    throw new Error(`data/members.json couldn't be read: ${err.message}. Fix the typo (or click Open members.json) before editing here.`);
  }
  if (!Array.isArray(members)) throw new Error("data/members.json should be a list of members, starting with [ and ending with ].");
  return members;
}

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

// Custom profile fields in display order (the Fields page's "Display order", then ID).
function readFieldDefs() {
  const fields = readJson(FIELDS_FILE, {});
  return Object.values(fields && typeof fields === "object" ? fields : {}).sort((a, b) => Number(a.forder) - Number(b.forder) || Number(a.fid) - Number(b.fid));
}

const write = (members) => fs.writeFileSync(FILE, JSON.stringify(members, null, 2) + "\n");

// "she=she/her|he=he/him" -> [{ key: "she", label: "she/her" }, ...]
const dropOptions = (def) =>
  String(def.fcontent || "")
    .split("|")
    .filter(Boolean)
    .map((opt) => {
      const i = opt.indexOf("=");
      return i < 0 ? { key: opt.trim(), label: opt.trim() } : { key: opt.slice(0, i).trim(), label: opt.slice(i + 1).trim() };
    });

// A member's answer for a field: stored as "field_76", or just "76".
const answerKey = (answers, fid) => (`field_${fid}` in answers ? `field_${fid}` : String(fid) in answers ? String(fid) : `field_${fid}`);
const answerOf = (m, fid) => {
  const a = m.fields || {};
  return a[answerKey(a, fid)] ?? "";
};

const same = (a, b) => a != null && b != null && String(a) === String(b);
const isSub = (m) => Number(m.parent_id) > 0;

// ---------- checking what the form sends ----------

const str = (v) => String(v ?? "").trim();
function whole(v, what) {
  const s = str(v) || "0";
  if (!/^\d+$/.test(s)) throw new Error(`${what} must be a whole number.`);
  return Number(s);
}
function address(v, what) {
  const s = str(v);
  if (/[\s"'<>]/.test(s)) throw new Error(`${what} can't contain spaces, quotes or < >.`);
  return s;
}

// The fields this editor sets, in a fixed order, plus anything else the file already had. "fields" goes last.
const KNOWN = ["id", "name", "group", "parent_id", "avatar", "title", "posts", "points", "joined", "last_activity", "location", "interests", "birthday", "age", "website", "online", "signature", "fields"];
function rebuild(old, fresh) {
  const extras = Object.entries(old || {}).filter(([k]) => !KNOWN.includes(k));
  const all = Object.fromEntries([...Object.entries(fresh), ...extras].filter(([, v]) => v !== undefined));
  if ("fields" in all) {
    const f = all.fields;
    delete all.fields;
    all.fields = f;
  }
  return all;
}

// Answers for every custom field the form sent. Answers to fields that no longer exist are kept as they are.
function cleanAnswers(input, old, defs) {
  const answers = { ...(old?.fields || {}) };
  for (const def of defs) {
    const raw = input?.[def.fid];
    if (raw === undefined) continue;
    let value = String(raw).replace(/\r\n?/g, "\n").trim();
    if (def.ftype !== "area") value = value.replace(/\n+/g, " ");
    const max = Number(def.fmaxinput) || 0;
    if (max > 0 && value.length > max) throw new Error(`${def.ftitle} is ${value.length} characters, over its ${max} limit.`);
    if (def.ftype === "drop" && value) {
      const option = dropOptions(def).find((o) => o.key === value || o.label === value);
      // An answer that was already in the file stays, even when it isn't an option (the preview warns about it).
      if (option) value = option.key;
      else if (value !== String(answerOf(old || {}, def.fid))) throw new Error(`"${value}" isn't one of ${def.ftitle}'s options.`);
    }
    const key = answerKey(answers, def.fid);
    if (value) answers[key] = value;
    else delete answers[key];
  }
  return answers;
}

function cleanMember(input, old, id, members, defs, groups) {
  const name = str(input.name).replace(/\s+/g, " ");
  if (!name) throw new Error("Every member needs a name.");
  if (name.length > 200) throw new Error("Name is over 200 characters.");
  const clash = members.find((m) => m !== old && str(m.name).toLowerCase() === name.toLowerCase());
  if (clash) throw new Error(`Member ${clash.id} is already called ${clash.name}. Jcink names are unique, so pick another.`);

  const group = Number(str(input.group));
  if (!groups.some((g) => g.id === group)) throw new Error("Pick a member group. Groups come from data/groups.json.");

  // Subaccounts hang off a main account, one level deep, like Jcink's.
  let parent_id;
  const parent = str(input.parent_id);
  if (parent && parent !== "0") {
    const main = members.find((m) => same(m.id, parent));
    if (!main) throw new Error(`Member ${parent} isn't in the file anymore. Reload the page.`);
    if (main === old) throw new Error("A member can't be their own subaccount.");
    if (isSub(main)) throw new Error(`${main.name} is a subaccount, so it can't have subaccounts. Pick their main account (member ${main.parent_id}).`);
    if (old && members.some((m) => same(m.parent_id, old.id))) throw new Error(`${old.name} has subaccounts of their own. Move or delete those first.`);
    parent_id = Number(main.id);
  }

  const ageText = str(input.age);
  if (ageText && !/^\d+$/.test(ageText)) throw new Error("Age must be a whole number, or empty.");

  return rebuild(old, {
    id,
    name,
    group,
    parent_id,
    avatar: address(input.avatar, "Avatar"),
    title: str(input.title),
    posts: whole(input.posts, "Posts"),
    points: whole(input.points, "Points"),
    joined: str(input.joined),
    last_activity: str(input.last_activity),
    location: str(input.location),
    interests: str(input.interests),
    birthday: str(input.birthday),
    age: ageText ? Number(ageText) : "",
    website: address(input.website, "Website"),
    online: str(input.online) === "1",
    signature: String(input.signature ?? "").trim(),
    fields: cleanAnswers(input.fields, old, defs),
  });
}

// Where else a member shows up. The preview can't draw a post or shout whose author is gone.
function usesOf(id) {
  const uses = [];
  const board = readJson(BOARD_FILE, {});
  if (same(board.viewer, id)) uses.push("is the logged-in viewer in data/board.json");
  const shouts = (board.shouts || []).filter((s) => same(s.member, id)).length;
  if (shouts) uses.push(`wrote ${shouts} shout(s) in data/board.json`);
  let posts = 0;
  const cats = readJson(FORUMS_FILE, []);
  const walk = (forums) => {
    for (const f of forums || []) {
      for (const t of f.topics || []) posts += (t.posts || []).filter((p) => same(p.author, id)).length;
      walk(f.subforums);
    }
  };
  for (const c of Array.isArray(cats) ? cats : []) walk(c.forums);
  if (posts) uses.push(`wrote ${posts} post(s) in data/forums.json (change them on the Forums page)`);
  return uses;
}

// ---------- saving ----------

// { original, item } saves (original is the member's ID, or null for a new member). { delete: id } removes.
function change(body) {
  const members = read();
  if (body.delete !== undefined) {
    const m = members.find((x) => same(x.id, body.delete));
    if (!m) throw new Error(`Member ${body.delete} isn't in the file anymore.`);
    const subs = members.filter((x) => same(x.parent_id, m.id));
    if (subs.length) throw new Error(`${m.name} still has subaccounts (${subs.map((s) => s.name).join(", ")}). Delete them, or make them main accounts, first.`);
    const uses = usesOf(m.id);
    if (uses.length) throw new Error(`${m.name} can't be deleted yet: they ${uses.join(", and ")}.`);
    members.splice(members.indexOf(m), 1);
    write(members);
    return { ok: true };
  }
  const old = body.original != null ? members.find((m) => same(m.id, body.original)) : null;
  if (body.original != null && !old) throw new Error(`Member ${body.original} isn't in the file anymore. Reload the page.`);
  // IDs are handed out like Jcink's: the next number after the highest one, and never changed afterwards.
  const id = old ? old.id : Math.max(0, ...members.map((m) => Number(m.id)).filter(Number.isFinite)) + 1;
  const member = cleanMember(body.item || {}, old, id, members, readFieldDefs(), loadGroups());
  if (old) members[members.indexOf(old)] = member;
  else members.push(member);
  write(members);
  return { ok: true, id };
}

function open() {
  if (!fs.existsSync(FILE)) write([]);
  return openFile(FILE);
}

// ---------- the page ----------

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function page() {
  let members = [];
  let error = "";
  try {
    members = read();
  } catch (err) {
    error = err.message;
  }
  const defs = readFieldDefs();
  const groups = loadGroups();
  const groupById = new Map(groups.map((g) => [g.id, g]));
  const byId = new Map(members.map((m) => [String(m.id), m]));
  const images = fs.existsSync(IMAGES) ? fs.readdirSync(IMAGES).filter((f) => /\.(png|jpe?g|gif|svg|webp)$/i.test(f)) : [];
  const nextId = Math.max(0, ...members.map((m) => Number(m.id)).filter(Number.isFinite)) + 1;
  const now = new Date();
  const today = `${now.getDate()}-${MONTHS[now.getMonth()]} ${String(now.getFullYear()).slice(2)}`;

  const groupTag = (id) => {
    const g = groupById.get(Number(id));
    return g ? `<span class="tag group" style="--c1:${esc(g["clr1-hex"] || "#52525b")};--c2:${esc(g["clr2-hex"] || "#f4f4f5")}">${esc(g.name)}</span>` : `<span class="tag bad">No group ${esc(id)}</span>`;
  };

  // Every custom field, with this member's answer (or a dash). Answers to deleted fields are listed after.
  const answers = (m) => {
    const rows = defs.map((d) => {
      let v = String(answerOf(m, d.fid));
      if (d.ftype === "drop" && v) v = (dropOptions(d).find((o) => o.key === v || o.label === v) || { label: v }).label;
      return `<div><dt>${esc(d.ftitle)} <code>field_${esc(d.fid)}</code></dt><dd>${v ? esc(v) : '<span class="empty">&ndash;</span>'}</dd></div>`;
    });
    const known = new Set(defs.flatMap((d) => [`field_${d.fid}`, String(d.fid)]));
    const orphans = Object.entries(m.fields || {}).filter(([k]) => !known.has(k));
    for (const [k, v] of orphans) rows.push(`<div class="orphan" title="This field isn't in data/custom-fields.json. Add it on the Fields page, or remove the answer from members.json."><dt>&#9888; <code>${esc(k)}</code> (not a field)</dt><dd>${esc(v)}</dd></div>`);
    return rows.length ? `<dl>${rows.join("")}</dl>` : "";
  };

  const card = (m, sub) => {
    const subs = sub ? [] : members.filter((x) => same(x.parent_id, m.id));
    const parentMissing = isSub(m) && !byId.has(String(m.parent_id));
    const a = `data-id="${esc(m.id)}"`;
    return `<section class="member${sub ? " sub" : ""}" id="m-${esc(m.id)}">
  <header>
    ${m.avatar ? `<img src="${esc(m.avatar)}" alt="">` : '<span class="noav"></span>'}
    <div class="who"><span class="kind">Member ${esc(m.id)}${sub ? " &middot; subaccount" : ""}</span>
      <h2>${esc(m.name)}${groupTag(m.group)}${m.online ? '<span class="tag on">Online</span>' : ""}${subs.length ? `<span class="tag">${subs.length} subaccount${subs.length === 1 ? "" : "s"}</span>` : ""}${parentMissing ? `<span class="tag bad">Main account ${esc(m.parent_id)} is missing</span>` : ""}</h2>
      <p>${[m.title, `${Number(m.posts) || 0} posts`, m.joined && `joined ${m.joined}`].filter(Boolean).map(esc).join(" &middot; ")} &middot; <a href="/index.php?showuser=${esc(m.id)}" target="jcink-preview">View profile</a></p></div>
    <span class="actions">${sub ? "" : `<button type="button" class="ghost" data-act="add" data-parent="${esc(m.id)}">+ Subaccount</button>`}<button type="button" class="ghost" data-act="edit" ${a}>Edit</button><button type="button" class="ghost danger" data-act="delete" ${a} data-name="${esc(m.name)}">Delete</button></span>
  </header>
  ${answers(m)}
  ${subs.length ? `<div class="subs">${subs.map((s) => card(s, true)).join("")}</div>` : ""}
</section>`;
  };
  // Main accounts in file order, each with its subaccounts underneath. Subaccounts of a missing member are listed on their own.
  const list = members.filter((m) => !isSub(m) || !byId.has(String(m.parent_id)) || isSub(byId.get(String(m.parent_id))));
  const shown = list.map((m) => card(m, isSub(m))).join("");

  const fieldRow = (d) => {
    const max = Number(d.fmaxinput) || 0;
    const name = `fields.${esc(d.fid)}`;
    let input;
    if (d.ftype === "drop") input = `<select name="${name}"><option value="">&ndash; No answer &ndash;</option>${dropOptions(d).map((o) => `<option value="${esc(o.key)}">${esc(o.label)}</option>`).join("")}</select>`;
    else if (d.ftype === "area") input = `<textarea name="${name}"${max ? ` maxlength="${max}"` : ""}></textarea>`;
    else input = `<input type="text" name="${name}"${max ? ` maxlength="${max}"` : ""}>`;
    const notes = [d.freq === "1" && "Required on Jcink", d.fhide === "1" && "Hidden from the profile", max && `Max ${max} characters`].filter(Boolean);
    return `<tr><th><b>${esc(d.ftitle)}</b>${d.fdesc ? `<span>${esc(d.fdesc)}</span>` : ""}<span><code>&lt;!-- |field_${esc(d.fid)}| --&gt;</code></span>${notes.length ? `<i>${esc(notes.join(" · "))}</i>` : ""}</th><td>${input}</td></tr>`;
  };

  const text = (name, label, help = "", attrs = "") => `<tr><th><b>${label}</b>${help}</th><td><input type="text" name="${name}"${attrs}></td></tr>`;
  const digits = (name, label, help = "") => text(name, label, help, ' inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-digits');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Members</title>
<style>${PAGE_CSS}${FORM_CSS}
  main{max-width:1000px}
  a{color:#7c3aed}
  .bar{display:flex;gap:8px;align-items:center;margin:16px 0 12px;flex-wrap:wrap}
  section.member > header{flex-wrap:wrap;align-items:flex-start}
  section.member header img,section.member .noav{width:44px;height:44px;border-radius:6px;object-fit:cover;flex:none;background:#f4f4f5}
  .who{flex:1;min-width:200px} .who h2{display:flex;align-items:center;flex-wrap:wrap;gap:6px}
  .kind{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600;color:#71717a}
  .actions{display:flex;gap:2px;align-items:center;flex-wrap:wrap}
  .actions button{padding:3px 7px;font-size:12px}
  .tag{font-size:11px;border-radius:4px;padding:1px 6px;background:#f4f4f5;color:#52525b;font-weight:500;white-space:nowrap}
  .tag.group{background:var(--c2);color:var(--c1);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c1) 25%,transparent)}
  .tag.on{background:#dcfce7;color:#15803d} .tag.bad{background:#fee2e2;color:#b91c1c}
  dl{margin:0;padding:10px 12px;border-top:1px solid #f4f4f5;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px 16px}
  dt{font-size:11px;color:#71717a;font-weight:600} dt code{font-weight:400;color:#a1a1aa}
  dd{margin:0;white-space:pre-line;overflow-wrap:anywhere} .empty{color:#d4d4d8}
  .orphan dt{color:#b45309}
  .subs{padding:0 12px 12px 34px;border-top:1px solid #f4f4f5;background:#fafafa}
  section.sub{margin:12px 0 0;border-left:3px solid #c4b5fd}
  .none{padding:24px;text-align:center;color:#71717a;background:#fff;border:1px dashed #d4d4d8;border-radius:8px}
  dialog{border:0;padding:0;border-radius:10px;width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 32px);box-shadow:0 20px 50px #0005;color:inherit}
  dialog::backdrop{background:#18181b99}
  dialog form{border:0;border-radius:0}
  dialog form > h2 button{padding:2px 9px;font-size:16px}
  tr.section th{width:auto;background:#f4f4f5}
  tr.off{display:none}
  .id-box{font:600 15px ui-monospace,monospace}
  textarea[name=signature]{font:13px/1.5 ui-monospace,monospace}
</style></head><body><main>
<h1>Members</h1>
<p>From <code>data/members.json</code>: the sample members who write posts, fill the member list and show up in profiles. Saving here writes the file for you. Each member gets an answer box for every field on the <a href="/__fields" target="_blank">Fields page</a>, and this page updates when you add one.</p>
<div class="file-bar"><button type="button" id="open-file" title="${esc(FILE)}">Open members.json</button><span>Opens the file on your computer, in your default app for .json files.</span></div>
${error ? `<div class="alert">${esc(error)}</div>` : ""}
<div id="notice" class="alert notice" hidden></div>
${error ? "" : `<div class="bar"><button type="button" data-act="add">+ Add member</button><span>${members.length} member${members.length === 1 ? "" : "s"} &middot; ${defs.length} custom field${defs.length === 1 ? "" : "s"}</span></div>
${shown || '<div class="none">No members yet. Add one to get started.</div>'}`}

<dialog id="editor">
<form id="member-form" autocomplete="off" novalidate>
  <h2><span id="form-title"></span><button type="button" data-close title="Close">&times;</button></h2>
  <div id="form-error" class="alert" hidden style="margin:12px"></div>
  <table>
    <tr><th><b>Member ID</b><span>Their profile: <code id="profile-link"></code></span><i>Given out automatically, like on Jcink, and can't be changed. It's <code>&lt;!-- |id| --&gt;</code> in templates.</i></th>
      <td><span class="id-box" id="id-box"></span></td></tr>
    <tr><th><b>Name</b><span>Required. No two members can share a name.</span></th><td><input type="text" name="name" maxlength="200"></td></tr>
    <tr id="parent-row"><th><b>Subaccount?</b><span>Pick a main account to make this one of its subaccounts (a 2nd, 3rd... account for the same person). It's <code>&lt;!-- |parent_id| --&gt;</code> in templates.</span><i id="parent-note"></i></th>
      <td><select name="parent_id"></select></td></tr>
    <tr><th><b>Member group</b><span>From <a href="/__groups" target="_blank">the Groups page</a>.</span></th>
      <td><select name="group">${groups.map((g) => `<option value="${g.id}">${g.id} &middot; ${esc(g.name)}</option>`).join("")}</select></td></tr>
    <tr class="section"><th colspan="2"><b>Custom profile fields</b><span>${defs.length ? "Answers already in members.json are filled in. Leave a box empty for no answer." : 'No fields yet. Add some on the <a href="/__fields" target="_blank">Fields page</a> and they appear here.'}</span></th></tr>
    ${defs.map(fieldRow).join("")}
    <tr class="section"><th colspan="2"><b>Profile</b></th></tr>
    ${text("avatar", "Avatar", `<span>An image address. Sample images in <code>data/images/</code> are at <code>/data-images/name.png</code>. Empty uses your skin's default avatar.</span>`, ' list="avatar-list" placeholder="/data-images/avatar-1.svg"')}
    ${text("title", "Member title", "<span>The line under their name, like <i>Board Owner</i>.</span>")}
    ${digits("posts", "Posts")}
    ${digits("points", "Points")}
    ${text("joined", "Joined", "<span>Any text, like <code>1-January 26</code>.</span>")}
    ${text("last_activity", "Last activity", "<span>Any text, like <code>Today, 3:04 PM</code>.</span>")}
    ${radios("online", "<b>Online now?</b><span>Lists them in the board's online list.</span>", "0")}
    ${text("location", "Location")}
    ${text("interests", "Interests")}
    ${text("birthday", "Birthday", "<span>Any text, like <code>January 1, 1995</code>.</span>")}
    ${digits("age", "Age", "<span>Can be empty.</span>")}
    ${text("website", "Website", "", ' placeholder="https://"')}
    <tr><th><b>Signature</b><span>HTML allowed.</span></th><td><textarea name="signature"></textarea></td></tr>
  </table>
  <div class="footer"><button type="button" class="ghost" data-close>Cancel</button><button type="submit" id="save">Save</button></div>
</form>
<datalist id="avatar-list">${images.map((f) => `<option value="/data-images/${esc(f)}">`).join("")}</datalist>
</dialog>
</main>
<script>
const MEMBERS = ${inlineJson(members)};
const FIELDS = ${inlineJson(defs.map((d) => ({ fid: d.fid, ftitle: d.ftitle, ftype: d.ftype })))};
const NEXT_ID = ${nextId};
const TODAY = ${inlineJson(today)};
const DEFAULT_GROUP = ${inlineJson(groups.some((g) => g.id === 3) ? 3 : groups[0]?.id ?? "")};
const dlg = document.getElementById("editor");
const form = document.getElementById("member-form");
const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };
const same = (a, b) => String(a) === String(b);
const isSub = (m) => Number(m.parent_id) > 0;
let editing = null; // the member's ID while editing, or null when adding
let dirty = false;

function set(name, value) {
  const radios = form.querySelectorAll('input[type=radio][name="' + name + '"]');
  if (radios.length) { radios.forEach((r) => (r.checked = r.value === (value ? "1" : "0"))); return; }
  const el = form.elements[name]; if (!el) return;
  value = value ?? "";
  // An answer that isn't one of the dropdown's options still shows, so saving doesn't lose it.
  if (el.tagName === "SELECT" && value !== "" && ![...el.options].some((o) => o.value === String(value))) {
    const match = [...el.options].find((o) => o.textContent === String(value));
    if (match) value = match.value;
    else el.add(new Option(value + " (not an option)", value));
  }
  el.value = value;
}

function answer(m, fid) {
  const a = (m && m.fields) || {};
  return a["field_" + fid] ?? a[fid] ?? "";
}

function openForm(m, parent) {
  form.reset();
  form.querySelectorAll("option").forEach((o) => { if (o.textContent.endsWith(" (not an option)")) o.remove(); });
  document.getElementById("form-error").hidden = true;
  editing = m ? m.id : null;
  const id = m ? m.id : NEXT_ID;
  document.getElementById("id-box").textContent = m ? id : id + " (new)";
  document.getElementById("profile-link").textContent = "index.php?showuser=" + id;

  // Subaccounts: offered once a member exists. Only main accounts can have them, one level deep.
  const others = MEMBERS.filter((x) => !m || !same(x.id, m.id));
  const mains = others.filter((x) => !isSub(x));
  const hasSubs = m && MEMBERS.some((x) => same(x.parent_id, m.id));
  const select = form.elements.parent_id;
  select.innerHTML = "";
  select.add(new Option("No, it's a main account", "0"));
  mains.forEach((x) => select.add(new Option("Subaccount of " + x.id + " · " + x.name, x.id)));
  document.getElementById("parent-row").classList.toggle("off", !mains.length);
  select.disabled = !!hasSubs;
  document.getElementById("parent-note").textContent = hasSubs ? "It has subaccounts of its own, so it has to stay a main account." : "";

  const v = m || { group: DEFAULT_GROUP, joined: TODAY, last_activity: "Today, " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }), posts: 0, points: 0, parent_id: parent || 0 };
  for (const k of ["name", "group", "avatar", "title", "posts", "points", "joined", "last_activity", "location", "interests", "birthday", "age", "website", "signature"]) set(k, v[k]);
  set("online", !!v.online);
  set("parent_id", isSub(v) ? v.parent_id : "0");
  for (const f of FIELDS) set("fields." + f.fid, answer(m, f.fid));

  document.getElementById("form-title").textContent = m ? "Edit member " + m.id + ": " + m.name : parent ? "Add a subaccount" : "Add a member";
  document.getElementById("save").textContent = m ? "Complete Edit" : "Add member";
  dirty = false;
  dlg.showModal();
  form.elements.name.focus();
}

function closeForm() { if (!dirty || confirmClose()) dlg.close(); }
// Asks on the page itself (pop-up blockers answer confirm() with "Cancel" without showing it).
function confirmClose() {
  const box = document.getElementById("form-error");
  if (box.dataset.leaving) return true;
  box.textContent = "You have unsaved changes. Click Cancel again to throw them away.";
  box.hidden = false; box.dataset.leaving = "1";
  setTimeout(() => delete box.dataset.leaving, 4000);
  return false;
}
dlg.addEventListener("cancel", (e) => { if (dirty && !confirmClose()) e.preventDefault(); });
dlg.addEventListener("close", () => { editing = null; dirty = false; if (stale) reload(); });
dlg.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeForm(); });

// Number boxes take digits only: anything else typed or pasted is dropped, and the cursor stays put.
form.addEventListener("input", (e) => {
  const t = e.target;
  if (t.matches("[data-digits]") && /[^0-9]/.test(t.value)) {
    const caret = t.value.slice(0, t.selectionStart).replace(/[^0-9]/g, "").length;
    t.value = t.value.replace(/[^0-9]/g, "");
    t.setSelectionRange(caret, caret);
  }
  dirty = true;
});

async function post(body, url = "/__members") {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ error: "The preview server didn't answer." }));
  if (!res.ok || out.error) throw new Error(out.error || "Couldn't save.");
  return out;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const item = { fields: {} };
  for (const [k, v] of new FormData(form)) {
    if (k.startsWith("fields.")) item.fields[k.slice(7)] = v;
    else item[k] = v;
  }
  if (form.elements.parent_id.disabled) item.parent_id = "0";
  try {
    const out = await post({ original: editing, item });
    flash((editing != null ? "Saved" : "Added") + " member " + out.id + " (" + item.name.trim() + "). View their profile at index.php?showuser=" + out.id + ".", out.id);
    reload();
  } catch (err) {
    const box = document.getElementById("form-error");
    box.textContent = err.message; box.hidden = false; delete box.dataset.leaving;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

function showTop(msg, isError) {
  const box = document.getElementById("notice");
  box.textContent = msg; box.classList.toggle("notice", !isError); box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}
function disarm(b) { clearTimeout(b.timer); b.classList.remove("armed"); b.textContent = "Delete"; b.title = ""; }

document.querySelector("main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || dlg.contains(b)) return;
  const act = b.dataset.act;
  if (act === "add") openForm(null, b.dataset.parent);
  if (act === "edit") openForm(MEMBERS.find((m) => same(m.id, b.dataset.id)));
  if (act === "delete") {
    if (!b.classList.contains("armed")) {
      document.querySelectorAll("[data-act=delete].armed").forEach(disarm);
      b.classList.add("armed"); b.textContent = "Really delete?";
      b.title = "Click again to delete " + b.dataset.name + ".";
      b.timer = setTimeout(() => disarm(b), 4000);
      return;
    }
    clearTimeout(b.timer);
    try { await post({ delete: b.dataset.id }); flash("Deleted member " + b.dataset.id + " (" + b.dataset.name + ")."); reload(); }
    catch (err) { disarm(b); showTop(err.message, true); }
  }
});

document.getElementById("open-file").onclick = async (e) => {
  const b = e.currentTarget;
  try { await post({}, "/__members/open"); b.textContent = "Opened!"; b.classList.add("done"); }
  catch (err) { b.textContent = "Couldn't open it"; showTop(err.message, true); }
  setTimeout(() => { b.textContent = "Open members.json"; b.classList.remove("done"); }, 1500);
};

// Saving reloads the page, and the file watcher may reload it once more, so the message and scroll position live for a few seconds.
function remember(id) { store.set("dev_members_scroll", JSON.stringify({ y: scrollY, id, at: Date.now() })); }
function flash(msg, id) { remember(id); store.set("dev_members_notice", JSON.stringify({ msg, at: Date.now() })); }
function reload() { dirty = false; location.reload(); }
try {
  const n = JSON.parse(store.get("dev_members_notice"));
  if (n && Date.now() - n.at < 5000) { const box = document.getElementById("notice"); box.textContent = n.msg; box.hidden = false; }
} catch {}
try {
  const s = JSON.parse(store.get("dev_members_scroll"));
  const el = s && s.id != null && document.getElementById("m-" + s.id);
  if (s && Date.now() - s.at < 5000) requestAnimationFrame(() => (el ? el.scrollIntoView({ block: "center" }) : scrollTo(0, s.y)));
} catch {}

// When a data file changes (a new custom field, say), reload so every member gets its box. If the form is open,
// say so and reload once it closes, so nothing typed is lost.
let stale = false;
new EventSource("/__live").onmessage = () => {
  if (!dlg.open) { remember(); return reload(); }
  stale = true;
  const box = document.getElementById("form-error");
  box.textContent = "A data file changed (maybe a new custom field). Save or cancel, and the page will update."; box.hidden = false;
};
</script></body></html>`;
}

module.exports = { FILE, page, change, open };
