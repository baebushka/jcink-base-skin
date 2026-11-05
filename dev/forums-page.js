// The Forums page (/__forums): add, edit, move and delete the categories, forums, topics and posts in data/forums.json.
const fs = require("fs");
const path = require("path");
const { DATA } = require("./skin");
const { esc, inlineJson, PAGE_CSS, FORM_CSS, radios, openFile } = require("./page-kit");

const FILE = path.join(DATA, "forums.json");
const MEMBERS_FILE = path.join(DATA, "members.json");

// ---------- reading and writing ----------

function read() {
  if (!fs.existsSync(FILE)) return [];
  let cats;
  try {
    cats = JSON.parse(fs.readFileSync(FILE, "utf8") || "[]");
  } catch (err) {
    throw new Error(`data/forums.json couldn't be read: ${err.message}. Fix the typo (or click Open forums.json) before editing here.`);
  }
  if (!Array.isArray(cats)) throw new Error("data/forums.json should be a list of categories, starting with [ and ending with ].");
  return cats;
}

function readMembers() {
  try {
    const members = JSON.parse(fs.readFileSync(MEMBERS_FILE, "utf8"));
    return Array.isArray(members) ? members : [];
  } catch {
    return [];
  }
}

// Writes 2-space JSON like the hand-written file: each post (and each simple subforum) on one line.
function format(cats) {
  const out = (v, indent, key) => {
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      const pad = indent + "  ";
      return `[\n${v.map((x) => pad + out(x, pad, key)).join(",\n")}\n${indent}]`;
    }
    if (v && typeof v === "object") {
      const entries = Object.entries(v);
      if (!entries.length) return "{}";
      const flat = entries.every(([, x]) => x === null || typeof x !== "object" || (Array.isArray(x) && !x.length));
      if (flat && (key === "posts" || key === "subforums")) return `{ ${entries.map(([k, x]) => `${JSON.stringify(k)}: ${out(x)}`).join(", ")} }`;
      const pad = indent + "  ";
      return `{\n${entries.map(([k, x]) => `${pad}${JSON.stringify(k)}: ${out(x, pad, k)}`).join(",\n")}\n${indent}}`;
    }
    return JSON.stringify(v);
  };
  return out(cats, "", null) + "\n";
}

const write = (cats) => fs.writeFileSync(FILE, format(cats));

// Every forum (subforums too) and every topic, with the list each one sits in.
function walk(cats) {
  const forums = [];
  const topics = [];
  for (const cat of cats) {
    if (!Array.isArray(cat.forums)) cat.forums = [];
    for (const f of cat.forums) {
      forums.push({ f, list: cat.forums, cat, parent: null });
      for (const s of f.subforums || []) forums.push({ f: s, list: f.subforums, cat, parent: f });
    }
  }
  for (const x of forums) for (const t of x.f.topics || []) topics.push({ t, list: x.f.topics, forum: x.f });
  return { forums, topics };
}

const same = (a, b) => a != null && b != null && String(a) === String(b);

// ---------- checking what the form sends ----------

const str = (v) => String(v ?? "").trim();
const flag = (v) => str(v) === "1";
function idOf(v, what) {
  const s = str(v);
  if (!/^[1-9]\d*$/.test(s)) throw new Error(`${what} ID must be a whole number, 1 or higher.`);
  return Number(s);
}
function whole(v, what) {
  const s = str(v) || "0";
  if (!/^\d+$/.test(s)) throw new Error(`${what} must be a whole number.`);
  return Number(s);
}
function text(v, what, max = 200) {
  const s = str(v);
  if (!s) throw new Error(`${what} can't be empty.`);
  if (s.length > max) throw new Error(`${what} is over ${max} characters.`);
  return s;
}

const CHILDREN = ["subforums", "topics", "posts", "forums"];
// The fields this editor sets, in a fixed order, plus anything else the file already had. Lists of children go last.
function rebuild(old, fresh, known) {
  const extras = Object.entries(old || {}).filter(([k]) => !known.includes(k) && !(k in fresh));
  const all = Object.fromEntries([...Object.entries(fresh), ...extras].filter(([, v]) => v !== undefined));
  for (const k of CHILDREN) if (k in all) { const v = all[k]; delete all[k]; all[k] = v; }
  return all;
}

// Text typed into the post box: Enter becomes <br />, like Jcink stores it.
function cleanPost(input, members) {
  const author = Number(str(input.author));
  if (!members.some((m) => Number(m.id) === author)) throw new Error("Pick who wrote the post. Authors come from data/members.json.");
  const date = text(input.date, "Date", 100);
  const body = String(input.body ?? "").trim().replace(/\r?\n/g, "<br />");
  if (!body) throw new Error("The post can't be empty.");
  return { author, date, body };
}

// ---------- saving ----------

function saveCategory(cats, body) {
  const input = body.item || {};
  const old = body.original != null ? cats.find((c) => same(c.id, body.original)) : null;
  if (body.original != null && !old) throw new Error(`Category ${body.original} isn't in the file anymore. Reload the page.`);
  const id = idOf(input.id, "Category");
  const clash = cats.find((c) => same(c.id, id) && c !== old);
  if (clash) throw new Error(`Category ${id} already exists (${clash.name}). Pick another ID.`);
  const cat = rebuild(old, { id, name: text(input.name, "Category Name"), forums: old ? old.forums : [] }, ["id", "name", "forums"]);
  if (old) cats[cats.indexOf(old)] = cat;
  else cats.push(cat);
  return { id };
}

function saveForum(cats, body) {
  const input = body.item || {};
  const { forums } = walk(cats);
  const entry = body.original != null ? forums.find((x) => same(x.f.id, body.original)) : null;
  if (body.original != null && !entry) throw new Error(`Forum ${body.original} isn't in the file anymore. Reload the page.`);
  const old = entry?.f;
  const id = idOf(input.id, "Forum");
  const clash = forums.find((x) => same(x.f.id, id) && x.f !== old);
  if (clash) throw new Error(`Forum ${id} already exists (${clash.f.name}). Forum IDs are shared with subforums, so pick another one.`);
  const name = text(input.name, "Forum Name");
  const isLink = flag(input.is_link);

  // Where it goes: "c-2" is a category, "f-4" makes it a subforum of forum 4.
  const where = /^([cf])-(\d+)$/.exec(str(input.parent));
  if (!where) throw new Error("Pick the category (or forum) this forum goes in.");
  let list;
  if (where[1] === "c") {
    const cat = cats.find((c) => same(c.id, where[2]));
    if (!cat) throw new Error(`Category ${where[2]} isn't in the file anymore. Reload the page.`);
    list = cat.forums;
  } else {
    const parent = forums.find((x) => same(x.f.id, where[2]) && !x.parent);
    if (!parent) throw new Error(`Forum ${where[2]} can't hold subforums: it's missing, or it's a subforum itself.`);
    if (parent.f === old) throw new Error("A forum can't be a subforum of itself.");
    if (parent.f.redirect_url) throw new Error(`${parent.f.name} is a redirect forum, so it can't have subforums.`);
    if (old?.subforums?.length) throw new Error(`${old.name} has subforums of its own, and the preview shows one level of subforums. Move them out first.`);
    list = parent.f.subforums ||= [];
  }

  let fresh;
  if (isLink) {
    const url = str(input.redirect_url);
    if (!url) throw new Error("A redirect forum needs the web address it redirects to.");
    if (/[\s"<>]/.test(url)) throw new Error("The redirect address can't contain spaces, quotes or < >.");
    if (old?.topics?.length) throw new Error(`${old.name} still has ${old.topics.length} topic(s). Move or delete them before turning it into a redirect forum.`);
    if (old?.subforums?.length) throw new Error(`${old.name} still has subforums. Move or delete them before turning it into a redirect forum.`);
    fresh = { id, name, description: str(input.description), redirect_url: url, redirect_hits: whole(input.redirect_hits, "Redirected Hits") };
  } else {
    fresh = { id, name, description: str(input.description), new_posts: flag(input.new_posts), locked: flag(input.locked) || undefined, topics: old?.topics || [] };
  }
  const forum = rebuild(old, fresh, ["id", "name", "description", "new_posts", "locked", "redirect_url", "redirect_hits", "topics"]);

  if (entry && entry.list === list) list[list.indexOf(old)] = forum;
  else {
    if (entry) detachForum(entry);
    list.push(forum);
  }
  return { id };
}

// Takes a forum out of its list, and drops an empty "subforums" list it leaves behind.
function detachForum(entry) {
  entry.list.splice(entry.list.indexOf(entry.f), 1);
  if (entry.parent && !entry.list.length) delete entry.parent.subforums;
}

function saveTopic(cats, body, members) {
  const input = body.item || {};
  const { forums, topics } = walk(cats);
  const entry = body.original != null ? topics.find((x) => same(x.t.id, body.original)) : null;
  if (body.original != null && !entry) throw new Error(`Topic ${body.original} isn't in the file anymore. Reload the page.`);
  const old = entry?.t;
  const id = idOf(input.id, "Topic");
  const clash = topics.find((x) => same(x.t.id, id) && x.t !== old);
  if (clash) throw new Error(`Topic ${id} already exists (${clash.t.title}). Pick another ID.`);
  const target = forums.find((x) => same(x.f.id, input.forum));
  if (!target) throw new Error("Pick the forum this topic goes in.");
  if (target.f.redirect_url) throw new Error(`${target.f.name} is a redirect forum, so it can't have topics.`);
  const fresh = {
    id,
    title: text(input.title, "Topic Title"),
    description: str(input.description),
    type: input.type === "pinned" ? "pinned" : "regular",
    hot: flag(input.hot) || undefined,
    new_posts: flag(input.new_posts) || undefined,
    locked: flag(input.locked) || undefined,
    views: whole(input.views, "Views"),
    posts: old ? old.posts : [cleanPost(input, members)],
  };
  const topic = rebuild(old, fresh, ["id", "title", "description", "type", "hot", "new_posts", "locked", "views", "posts"]);
  const list = (target.f.topics ||= []);
  // The board index takes a forum's last post from its first topic, so new and moved topics go to the top.
  if (entry && entry.list === list) list[list.indexOf(old)] = topic;
  else {
    if (entry) entry.list.splice(entry.list.indexOf(old), 1);
    list.unshift(topic);
  }
  return { id };
}

function findTopic(cats, id) {
  const entry = walk(cats).topics.find((x) => same(x.t.id, id));
  if (!entry) throw new Error(`Topic ${id} isn't in the file anymore. Reload the page.`);
  if (!Array.isArray(entry.t.posts)) entry.t.posts = [];
  return entry;
}

function postIndex(posts, index) {
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= posts.length) throw new Error("That post isn't in the file anymore. Reload the page.");
  return i;
}

function savePost(cats, body, members) {
  const { t } = findTopic(cats, body.topic);
  const post = cleanPost(body.item || {}, members);
  if (body.index == null) {
    t.posts.push(post);
    return { index: t.posts.length - 1 };
  }
  const i = postIndex(t.posts, body.index);
  t.posts[i] = rebuild(t.posts[i], post, ["author", "date", "body"]);
  return { index: i };
}

// ---------- deleting and moving ----------

function remove(cats, body) {
  const { kind, id } = body;
  if (kind === "category") {
    const i = cats.findIndex((c) => same(c.id, id));
    if (i < 0) throw new Error(`Category ${id} isn't in the file anymore.`);
    cats.splice(i, 1);
  } else if (kind === "forum") {
    const entry = walk(cats).forums.find((x) => same(x.f.id, id));
    if (!entry) throw new Error(`Forum ${id} isn't in the file anymore.`);
    detachForum(entry);
  } else if (kind === "topic") {
    const entry = findTopic(cats, id);
    entry.list.splice(entry.list.indexOf(entry.t), 1);
  } else if (kind === "post") {
    const { t } = findTopic(cats, body.topic);
    const i = postIndex(t.posts, body.index);
    if (t.posts.length === 1) throw new Error("A topic needs at least one post. Delete the topic instead.");
    t.posts.splice(i, 1);
  } else throw new Error("Unknown item.");
}

function move(cats, body) {
  const { kind, id } = body;
  const dir = Number(body.dir) < 0 ? -1 : 1;
  let list, i;
  if (kind === "category") (list = cats), (i = cats.findIndex((c) => same(c.id, id)));
  else if (kind === "forum") {
    const entry = walk(cats).forums.find((x) => same(x.f.id, id));
    if (entry) (list = entry.list), (i = list.indexOf(entry.f));
  } else if (kind === "topic") {
    const entry = findTopic(cats, id);
    (list = entry.list), (i = list.indexOf(entry.t));
  } else if (kind === "post") {
    list = findTopic(cats, body.topic).t.posts;
    i = postIndex(list, body.index);
  }
  if (!list || i < 0) throw new Error("That item isn't in the file anymore. Reload the page.");
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

// { kind, original, item } saves; { delete: true, kind, id } removes; { move: -1 | 1, kind, id } reorders.
function change(body) {
  const cats = read();
  let out = {};
  if (body.delete) remove(cats, body);
  else if (body.move) move(cats, { ...body, dir: body.move });
  else {
    const members = readMembers();
    const save = { category: saveCategory, forum: saveForum, topic: saveTopic, post: savePost }[body.kind];
    if (!save) throw new Error("Unknown item.");
    out = save(cats, body, members);
  }
  write(cats);
  return { ok: true, ...out };
}

function open() {
  if (!fs.existsSync(FILE)) write([]);
  return openFile(FILE);
}

// ---------- the page ----------

const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const excerpt = (html, n = 160) => {
  const t = String(html ?? "").replace(/<(br|\/?(div|p|li|blockquote|tr|td))\b[^>]*>/gi, " ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};
const tag = (cls, label) => `<span class="tag ${cls}">${label}</span>`;
const btn = (act, attrs, label, extra = "") => `<button type="button" class="ghost${extra}" data-act="${act}" ${attrs}>${label}</button>`;
const arrows = (attrs, i, n) =>
  `${btn("up", attrs, "&uarr;", " icon")}`.replace("<button", `<button title="Move up"${i === 0 ? " disabled" : ""}`) +
  `${btn("down", attrs, "&darr;", " icon")}`.replace("<button", `<button title="Move down"${i === n - 1 ? " disabled" : ""}`);
const del = (attrs, what) => btn("delete", `${attrs} data-what="${esc(what)}"`, "Delete", " danger");

function countPosts(f) {
  return (f.topics || []).reduce((n, t) => n + (t.posts?.length || 0), 0) + (f.subforums || []).reduce((n, s) => n + countPosts(s), 0);
}
function countTopics(f) {
  return (f.topics?.length || 0) + (f.subforums || []).reduce((n, s) => n + countTopics(s), 0);
}

function page() {
  let cats = [];
  let error = "";
  try {
    cats = read();
    walk(cats);
  } catch (err) {
    error = err.message;
    cats = [];
  }
  const members = readMembers();
  const memberName = new Map(members.map((m) => [Number(m.id), m.name]));
  const { forums, topics } = walk(cats);
  const next = (ids) => Math.max(0, ...ids.map(Number).filter(Number.isFinite)) + 1;
  const NEXT = { category: next(cats.map((c) => c.id)), forum: next(forums.map((x) => x.f.id)), topic: next(topics.map((x) => x.t.id)) };

  const postRow = (t, p, i) => {
    const a = `data-kind="post" data-topic="${esc(t.id)}" data-index="${i}"`;
    const who = memberName.get(Number(p.author));
    return `<li class="row post">
    <span class="caret"></span>
    <span class="main"><b>${who ? esc(who) : `<span class="bad">No member ${esc(p.author)}</span>`}</b> <span class="meta">${esc(p.date ?? "")}${i === 0 ? " &middot; first post" : ""}</span>
      <p>${esc(excerpt(p.body)) || "<i>empty</i>"}</p></span>
    <span class="actions">${arrows(a, i, t.posts.length)}${btn("edit", a, "Edit")}${del(a, `this post by ${who || "member " + p.author}`)}</span>
  </li>`;
  };

  const topicItem = (t, i, n) => {
    const a = `data-kind="topic" data-id="${esc(t.id)}"`;
    const posts = t.posts || [];
    const tags = [t.type === "pinned" && tag("pin", "Pinned"), t.hot && tag("hot", "Hot"), t.new_posts && tag("new", "New posts"), t.locked && tag("lock", "Locked")].filter(Boolean).join("");
    return `<details class="topic" data-key="t-${esc(t.id)}">
  <summary class="row"><span class="caret">&#9656;</span>
    <span class="main"><b>${esc(t.title)}</b>${tags}${t.description ? `<p>${esc(t.description)}</p>` : ""}
      <span class="meta">Topic ${esc(t.id)} &middot; ${plural(posts.length, "post")} &middot; ${plural(Number(t.views) || 0, "view")} &middot; <a href="/index.php?showtopic=${esc(t.id)}" target="jcink-preview">View</a></span></span>
    <span class="actions">${arrows(a, i, n)}${btn("edit", a, "Edit")}${del(a, `topic "${t.title}" and its ${plural(posts.length, "post")}`)}</span>
  </summary>
  <ol class="kids posts">${posts.map((p, j) => postRow(t, p, j)).join("")}</ol>
  <div class="add">${btn("add", `data-kind="post" data-topic="${esc(t.id)}"`, "+ Reply")}</div>
</details>`;
  };

  const forumItem = (f, i, n, isSub) => {
    const a = `data-kind="forum" data-id="${esc(f.id)}"`;
    const view = `<a href="/index.php?showforum=${esc(f.id)}" target="jcink-preview">View</a>`;
    const actions = `<span class="actions">${arrows(a, i, n)}${btn("edit", a, "Edit")}${del(a, f.redirect_url ? `redirect forum "${f.name}"` : `forum "${f.name}", its ${plural(countTopics(f), "topic")} and ${plural(countPosts(f), "post")}`)}</span>`;
    const kind = isSub ? "Subforum" : "Forum";
    if (f.redirect_url) {
      return `<div class="row forum leaf"><span class="caret"></span>
    <span class="main"><b>${esc(f.name)}</b>${tag("link", "Redirect")}${f.description ? `<p>${esc(excerpt(f.description))}</p>` : ""}
      <span class="meta">${kind} ${esc(f.id)} &middot; &rarr; ${esc(f.redirect_url)} &middot; ${plural(Number(f.redirect_hits) || 0, "hit")}</span></span>${actions}</div>`;
    }
    const subs = f.subforums || [];
    const tps = f.topics || [];
    const tags = [f.new_posts && tag("new", "New posts"), f.locked && tag("lock", "Read-only")].filter(Boolean).join("");
    return `<details class="forum" data-key="f-${esc(f.id)}">
  <summary class="row"><span class="caret">&#9656;</span>
    <span class="main"><b>${esc(f.name)}</b>${tags}${f.description ? `<p>${esc(excerpt(f.description))}</p>` : ""}
      <span class="meta">${kind} ${esc(f.id)} &middot; ${plural(tps.length, "topic")}${subs.length ? ` &middot; ${plural(subs.length, "subforum")}` : ""} &middot; ${view}</span></span>${actions}
  </summary>
  <div class="kids">
    ${subs.map((s, j) => forumItem(s, j, subs.length, true)).join("")}
    ${tps.map((t, j) => topicItem(t, j, tps.length)).join("") || '<p class="empty">No topics yet.</p>'}
    <div class="add">${btn("add", `data-kind="topic" data-forum="${esc(f.id)}"`, "+ Topic")}${isSub ? "" : btn("add", `data-kind="forum" data-parent="f-${esc(f.id)}"`, "+ Subforum") + btn("add", `data-kind="forum" data-redirect="1" data-parent="f-${esc(f.id)}"`, "+ Redirect subforum")}</div>
  </div>
</details>`;
  };

  const catSection = (c, i) => {
    const a = `data-kind="category" data-id="${esc(c.id)}"`;
    const fs_ = c.forums || [];
    return `<section class="cat">
  <header><div><span class="kind">Category ${esc(c.id)}</span><h2>${esc(c.name)}</h2><p>${plural(fs_.length, "forum")} &middot; <a href="/index.php?c=${esc(c.id)}" target="jcink-preview">View</a></p></div>
    <span class="actions">${btn("add", `data-kind="forum" data-parent="c-${esc(c.id)}"`, "+ Forum")}${btn("add", `data-kind="forum" data-redirect="1" data-parent="c-${esc(c.id)}"`, "+ Redirect")}${arrows(a, i, cats.length)}${btn("edit", a, "Edit")}${del(a, `category "${c.name}", its ${plural(fs_.length, "forum")} and everything in them`)}</span></header>
  <div class="tree">${fs_.map((f, j) => forumItem(f, j, fs_.length, false)).join("") || '<p class="empty">No forums yet.</p>'}</div>
</section>`;
  };

  const memberOptions = members.map((m) => `<option value="${esc(m.id)}">${esc(m.id)} &middot; ${esc(m.name)}</option>`).join("");
  const postRows = (cls) => `
    <tr class="${cls}"><th><b>Posted by</b><span>A member from <code>data/members.json</code>. The post shows their name, avatar, mini profile and custom fields.</span></th>
      <td><select name="author">${memberOptions}</select></td></tr>
    <tr class="${cls}"><th><b>Date</b><span>Any text, like <code>Today, 3:30 PM</code> or <code>Nov 3 2026, 09:00 AM</code>.</span></th>
      <td><input type="text" name="date" maxlength="100"></td></tr>
    <tr class="${cls}"><th><b>Post</b><span>Press Enter for a new line (saved as <code>&lt;br /&gt;</code>). HTML works too, like <code>&lt;b&gt;bold&lt;/b&gt;</code>.</span>
      <i>Quote box: <code>&lt;div class='quotetop'&gt;QUOTE (Admin)&lt;/div&gt;&lt;div class='quotemain'&gt;text&lt;/div&gt;</code></i></th>
      <td><textarea name="body" spellcheck="true"></textarea></td></tr>`;
  const footer = `<div class="footer"><button type="button" class="ghost" data-close>Cancel</button><button type="submit" class="save">Save</button></div>`;
  const formHead = () => `<h2><span class="form-title"></span><button type="button" data-close title="Close">&times;</button></h2><div class="alert form-error" hidden style="margin:12px"></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forums</title>
<style>${PAGE_CSS}${FORM_CSS}
  main{max-width:1000px}
  a{color:#7c3aed}
  .bar{display:flex;gap:8px;align-items:center;margin:16px 0 12px;flex-wrap:wrap} .bar .spacer{flex:1}
  section.cat > header{background:#18181b;color:#fff;flex-wrap:wrap}
  section.cat > header p,section.cat > header .kind{color:#a1a1aa} section.cat > header a{color:#c4b5fd}
  section.cat > header button.ghost{color:#ddd6fe} section.cat > header button.ghost:hover{background:#fff2}
  section.cat > header button.danger{color:#fca5a5} section.cat > header button.danger.armed{background:#dc2626;color:#fff}
  .kind{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
  details > summary{list-style:none;cursor:pointer} summary::-webkit-details-marker{display:none}
  .row{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-top:1px solid #f4f4f5}
  .tree > :first-child > .row,.tree > .row:first-child{border-top:0}
  summary.row:hover{background:#fafafa}
  .caret{width:12px;flex:none;color:#a1a1aa;transition:transform .15s;line-height:20px}
  details[open] > summary .caret{transform:rotate(90deg)}
  .main{flex:1;min-width:0} .main p{overflow-wrap:anywhere;color:#52525b}
  .meta{font-size:12px;color:#71717a}
  .actions{display:flex;gap:2px;flex:none;align-items:center;flex-wrap:wrap;justify-content:flex-end}
  .actions button{padding:3px 7px;font-size:12px}
  button.icon{color:#71717a;padding:3px 6px} button[disabled]{opacity:.25;cursor:default;background:none!important}
  .kids{margin:0 0 0 22px;padding:0;border-left:2px solid #f4f4f5;list-style:none}
  .tag{font-size:11px;border-radius:4px;padding:1px 6px;margin-left:6px;background:#f4f4f5;color:#52525b;font-weight:500;white-space:nowrap}
  .tag.pin{background:#ede9fe;color:#6d28d9} .tag.hot{background:#ffedd5;color:#c2410c} .tag.new{background:#dcfce7;color:#15803d}
  .tag.lock{background:#fee2e2;color:#b91c1c} .tag.link{background:#e0f2fe;color:#0369a1}
  .post .main p{font-size:13px;color:#3f3f46}
  .bad{color:#dc2626}
  .add{padding:4px 12px 8px 30px;display:flex;gap:4px} .add button{font-size:12px}
  .empty{padding:8px 12px 4px 30px;color:#a1a1aa;font-size:12px}
  .none{padding:24px;text-align:center;color:#71717a;background:#fff;border:1px dashed #d4d4d8;border-radius:8px}
  dialog{border:0;padding:0;border-radius:10px;width:min(760px,calc(100vw - 32px));max-height:calc(100vh - 32px);box-shadow:0 20px 50px #0005;color:inherit}
  dialog::backdrop{background:#18181b99}
  dialog form{border:0;border-radius:0}
  dialog form > h2 button{padding:2px 9px;font-size:16px}
  form[hidden],tr.off{display:none}
  form td textarea{height:180px;font:13px/1.5 ui-monospace,monospace}
  textarea[name=description]{height:70px!important}
  @media (max-width:640px){ .row{flex-wrap:wrap} .actions{width:100%;padding-left:20px;justify-content:flex-start} }
</style></head><body><main>
<h1>Forums</h1>
<p>From <code>data/forums.json</code>: the categories, forums, topics and posts the preview shows. Saving here writes the file for you. Posts are written by the sample members in <code>data/members.json</code>.</p>
<div class="file-bar"><button type="button" id="open-file" title="${esc(FILE)}">Open forums.json</button><span>Opens the file on your computer, in your default app for .json files.</span></div>
${error ? `<div class="alert">${esc(error)}</div>` : ""}
<div id="notice" class="alert notice" hidden></div>
${error ? "" : `<div class="bar">${btn("add", 'data-kind="category"', "+ Add category").replace('class="ghost"', 'class=""')}<span class="spacer"></span>
  <button type="button" class="ghost" id="expand">Expand all</button><button type="button" class="ghost" id="collapse">Collapse all</button></div>
${cats.map(catSection).join("") || '<div class="none">No categories yet. Add one to get started.</div>'}`}

<dialog id="editor">
<form id="form-category" data-kind="category" autocomplete="off" novalidate hidden>${formHead()}
  <table>
    <tr><th><b>Category ID</b><span>Its page: <code class="id-preview" data-pattern="index.php?c=#"></code></span><i>Unique among categories. Use your board's number if you're copying one.</i></th>
      <td><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-digits name="id"></td></tr>
    <tr><th><b>Category Name</b></th><td><input type="text" name="name" maxlength="200"></td></tr>
  </table>${footer}
</form>

<form id="form-forum" data-kind="forum" autocomplete="off" novalidate hidden>${formHead()}
  <table>
    <tr><th><b>Forum ID</b><span>Its page: <code class="id-preview" data-pattern="index.php?showforum=#"></code></span><i>Unique among all forums and subforums.</i></th>
      <td><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-digits name="id"></td></tr>
    <tr><th><b>Forum Name</b></th><td><input type="text" name="name" maxlength="200"></td></tr>
    <tr><th><b>Description</b><span>Shown under the name. HTML allowed.</span></th><td><textarea name="description"></textarea></td></tr>
    <tr><th><b>Goes in</b><span>A category, or another forum to make this a subforum.</span></th><td><select name="parent"></select></td></tr>
    ${radios("is_link", "<b>Redirect forum?</b><span>Yes sends people to another web address instead of showing topics, like a Discord or a site guide. It uses your Redirect Row template.</span>", "0")}
    <tr class="link-only"><th><b>Redirect URL</b><span>Where the forum sends people. Another website (<code>https://discord.com</code>) or a page on your board (<code>index.php?showtopic=1</code>).</span></th><td><input type="text" name="redirect_url" placeholder="https://discord.com"></td></tr>
    <tr class="link-only"><th><b>Redirected Hits</b><span>How many times it's been clicked: <code>&lt;!-- |redirect_hits| --&gt;</code> in the Redirect Row.</span></th><td><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-digits name="redirect_hits"></td></tr>
    ${radios("new_posts", "<b>Show the \"new posts\" icon?</b><span>No shows the \"no new posts\" icon.</span>", "0").replace("<tr>", '<tr class="forum-only">')}
    ${radios("locked", "<b>Read-only forum?</b><span>Shows the read-only forum icon.</span>", "0").replace("<tr>", '<tr class="forum-only">')}
  </table>${footer}
</form>

<form id="form-topic" data-kind="topic" autocomplete="off" novalidate hidden>${formHead()}
  <table>
    <tr><th><b>Topic ID</b><span>Its page: <code class="id-preview" data-pattern="index.php?showtopic=#"></code></span><i>Unique among all topics.</i></th>
      <td><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-digits name="id"></td></tr>
    <tr><th><b>Forum</b><span>New and moved topics go to the top of the forum, because the board index shows the first topic as the forum's last post.</span></th><td><select name="forum"></select></td></tr>
    <tr><th><b>Topic Title</b></th><td><input type="text" name="title" maxlength="200"></td></tr>
    <tr><th><b>Topic Description</b><span>The line under the title. Can be empty.</span></th><td><input type="text" name="description"></td></tr>
    <tr><th><b>Type</b><span>Pinned topics are listed under "Important Topics".</span></th>
      <td><select name="type"><option value="regular">Regular</option><option value="pinned">Pinned</option></select></td></tr>
    <tr><th><b>Views</b></th><td><input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" data-digits name="views"></td></tr>
    ${radios("hot", "<b>Hot topic?</b><span>Shows the hot topic icon.</span>", "0")}
    ${radios("new_posts", "<b>Has new posts?</b><span>Shows the new posts icon and a go-to-newest-post link.</span>", "0")}
    ${radios("locked", "<b>Closed topic?</b><span>Shows the closed topic icon.</span>", "0")}
    <tr class="first-only"><th colspan="2" style="width:auto;background:#f4f4f5"><b>First post</b><span>Every topic starts with one post. Add replies after saving.</span></th></tr>
    ${postRows("first-only")}
  </table>${footer}
</form>

<form id="form-post" data-kind="post" autocomplete="off" novalidate hidden>${formHead()}
  <table>
    <tr><th><b>Topic</b></th><td class="topic-name"></td></tr>
    ${postRows("")}
  </table>${footer}
</form>
</dialog>
</main>
<script>
const DATA = ${inlineJson(cats)};
const NEXT = ${inlineJson(NEXT)};
const MEMBERS = ${inlineJson(members.map((m) => ({ id: m.id, name: m.name })))};
const dlg = document.getElementById("editor");
const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };
let editing = null; // { kind, original, topic, index, form }
let dirty = false;

const same = (a, b) => String(a) === String(b);
function allForums() {
  const out = [];
  for (const c of DATA) for (const f of c.forums || []) {
    out.push({ f, cat: c, parent: null });
    for (const s of f.subforums || []) out.push({ f: s, cat: c, parent: f });
  }
  return out;
}
function allTopics() { return allForums().flatMap((x) => (x.f.topics || []).map((t) => ({ t, forum: x.f }))); }
const optionsHtml = (list) => list.map(([v, label, off]) => '<option value="' + v + '"' + (off ? " disabled" : "") + ">" + label.replace(/</g, "&lt;") + "</option>").join("");

// "Today, 3:30 PM", the way Jcink writes recent dates.
function now() { return "Today, " + new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }

function set(form, name, value) {
  const radios = form.querySelectorAll('input[type=radio][name="' + name + '"]');
  if (radios.length) { radios.forEach((r) => (r.checked = r.value === (value ? "1" : "0"))); return; }
  if (form.elements[name]) form.elements[name].value = value ?? "";
}
const radio = (form, name) => (form.querySelector('input[name="' + name + '"]:checked') || {}).value;

function refresh() {
  if (!editing) return;
  const form = editing.form;
  const idInput = form.elements.id;
  form.querySelectorAll(".id-preview").forEach((c) => (c.textContent = c.dataset.pattern.replace("#", (idInput && idInput.value) || "#")));
  if (editing.kind === "forum") {
    const link = radio(form, "is_link") === "1";
    form.querySelectorAll(".link-only").forEach((r) => r.classList.toggle("off", !link));
    form.querySelectorAll(".forum-only").forEach((r) => r.classList.toggle("off", link));
  }
  if (editing.kind === "topic") form.querySelectorAll(".first-only").forEach((r) => r.classList.toggle("off", editing.original != null));
}

function openForm(kind, ctx) {
  dlg.querySelectorAll("form").forEach((f) => (f.hidden = true));
  const form = document.getElementById("form-" + kind);
  form.reset(); form.hidden = false;
  form.querySelector(".form-error").hidden = true;
  editing = { kind, form, original: ctx.original ?? null, topic: ctx.topic, index: ctx.index ?? null };
  const v = ctx.values || {};
  let title;

  if (kind === "category") {
    title = editing.original != null ? "Edit category: " + v.name : "Add a category";
    set(form, "id", v.id ?? NEXT.category); set(form, "name", v.name);
  }

  if (kind === "forum") {
    const forums = allForums();
    const self = forums.find((x) => editing.original != null && same(x.f.id, editing.original));
    const hasSubs = !!(self && self.f.subforums && self.f.subforums.length);
    const opts = [];
    for (const c of DATA) {
      opts.push(["c-" + c.id, "Category: " + c.name]);
      for (const f of c.forums || []) if (!f.redirect_url) opts.push(["f-" + f.id, "\\u00a0\\u00a0\\u00a0Subforum of: " + f.name, hasSubs || (self && f === self.f)]);
    }
    form.elements.parent.innerHTML = optionsHtml(opts);
    const parent = ctx.parent || (self ? (self.parent ? "f-" + self.parent.id : "c-" + self.cat.id) : "");
    const redirect = editing.original != null ? !!v.redirect_url : !!ctx.redirect;
    title = (editing.original != null ? "Edit " : "Add a ") + (redirect ? "redirect " : "") + (parent.startsWith("f-") ? "subforum" : "forum") + (editing.original != null ? ": " + v.name : "");
    set(form, "id", v.id ?? NEXT.forum); set(form, "name", v.name); set(form, "description", v.description);
    set(form, "parent", parent);
    set(form, "is_link", redirect); set(form, "redirect_url", v.redirect_url); set(form, "redirect_hits", v.redirect_hits ?? 0);
    set(form, "new_posts", v.new_posts); set(form, "locked", v.locked);
  }

  if (kind === "topic") {
    form.elements.forum.innerHTML = optionsHtml(allForums().filter((x) => !x.f.redirect_url).map((x) =>
      [x.f.id, (x.parent ? x.cat.name + " / " + x.parent.name : x.cat.name) + " / " + x.f.name]));
    const self = editing.original != null && allTopics().find((x) => same(x.t.id, editing.original));
    title = self ? "Edit topic: " + v.title : "Add a topic";
    set(form, "id", v.id ?? NEXT.topic); set(form, "forum", self ? self.forum.id : ctx.forum);
    set(form, "title", v.title); set(form, "description", v.description); set(form, "type", v.type || "regular");
    set(form, "views", v.views ?? 0); set(form, "hot", v.hot); set(form, "new_posts", v.new_posts); set(form, "locked", v.locked);
    set(form, "date", now());
  }

  if (kind === "post") {
    const t = allTopics().find((x) => same(x.t.id, ctx.topic)).t;
    form.querySelector(".topic-name").textContent = t.title + " (topic " + t.id + ")";
    title = editing.index != null ? "Edit post " + (editing.index + 1) + " in: " + t.title : "Reply to: " + t.title;
    // The last poster usually isn't the one replying, so suggest someone else.
    const last = t.posts && t.posts[t.posts.length - 1];
    const other = MEMBERS.find((m) => last && !same(m.id, last.author));
    set(form, "author", v.author ?? (other || MEMBERS[0] || {}).id);
    set(form, "date", v.date ?? now());
    set(form, "body", String(v.body ?? "").replace(/<br\\s*\\/?>/gi, "\\n"));
  }

  form.querySelector(".form-title").textContent = title;
  form.querySelector(".save").textContent = editing.original != null || editing.index != null ? "Complete Edit" : "Add";
  dirty = false;
  refresh();
  dlg.showModal();
  const first = form.querySelector(kind === "post" ? "textarea" : 'input[name="name"],input[name="title"]');
  if (first) first.focus();
}

function closeForm() {
  if (dirty && !confirmClose()) return;
  dlg.close();
}
// Asks on the page itself (pop-up blockers answer confirm() with "Cancel" without showing it).
function confirmClose() {
  const box = editing.form.querySelector(".form-error");
  if (box.dataset.leaving) return true;
  box.textContent = "You have unsaved changes. Click Cancel again to throw them away.";
  box.hidden = false; box.dataset.leaving = "1";
  setTimeout(() => delete box.dataset.leaving, 4000);
  return false;
}
dlg.addEventListener("cancel", (e) => { if (dirty && !confirmClose()) e.preventDefault(); });
dlg.addEventListener("close", () => { editing = null; dirty = false; });

async function post(body, url = "/__forums") {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ error: "The preview server didn't answer." }));
  if (!res.ok || out.error) throw new Error(out.error || "Couldn't save.");
  return out;
}

// Open forums and topics are remembered, so a save (which reloads the page) doesn't fold everything back up.
const openKeys = new Set(JSON.parse(store.get("dev_forums_open") || "[]"));
function saveOpen() { store.set("dev_forums_open", JSON.stringify([...openKeys])); }
function keepOpen(...keys) { keys.forEach((k) => openKeys.add(k)); saveOpen(); }
function remember() { store.set("dev_forums_scroll", JSON.stringify({ y: scrollY, at: Date.now() })); }
function flash(msg) { remember(); store.set("dev_forums_notice", JSON.stringify({ msg, at: Date.now() })); }
function reload() { dirty = false; location.reload(); }

// Number fields take digits only: anything else typed or pasted is dropped, and the cursor stays put.
dlg.addEventListener("input", (e) => {
  const t = e.target;
  if (t.matches("[data-digits]") && /[^0-9]/.test(t.value)) {
    const caret = t.value.slice(0, t.selectionStart).replace(/[^0-9]/g, "").length;
    t.value = t.value.replace(/[^0-9]/g, "");
    t.setSelectionRange(caret, caret);
  }
  dirty = true; refresh();
});
dlg.addEventListener("change", refresh);
dlg.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeForm(); });
dlg.addEventListener("submit", async (e) => {
  e.preventDefault();
  const { kind, form, original, topic, index } = editing;
  const item = Object.fromEntries(new FormData(form));
  try {
    const out = await post({ kind, original, topic, index, item });
    const isNew = original == null && index == null;
    const verb = isNew ? "Added" : "Saved";
    if (kind === "category") flash(verb + " category " + out.id + " (" + item.name + ").");
    if (kind === "forum") { keepOpen(item.parent); flash(verb + " forum " + out.id + " (" + item.name + "). View it at index.php?showforum=" + out.id + "."); }
    if (kind === "topic") { keepOpen("f-" + item.forum, "t-" + out.id); flash(verb + " topic " + out.id + " (" + item.title + "). View it at index.php?showtopic=" + out.id + "."); }
    if (kind === "post") { keepOpen("t-" + topic); flash((isNew ? "Added a reply to" : "Saved post " + (out.index + 1) + " in") + " topic " + topic + "."); }
    reload();
  } catch (err) {
    const box = form.querySelector(".form-error");
    box.textContent = err.message; box.hidden = false; delete box.dataset.leaving;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

function values(b) {
  const kind = b.dataset.kind;
  if (kind === "category") return DATA.find((c) => same(c.id, b.dataset.id));
  if (kind === "forum") return allForums().find((x) => same(x.f.id, b.dataset.id)).f;
  if (kind === "topic") return allTopics().find((x) => same(x.t.id, b.dataset.id)).t;
  if (kind === "post") return allTopics().find((x) => same(x.t.id, b.dataset.topic)).t.posts[Number(b.dataset.index)];
}
const target = (b) => ({ kind: b.dataset.kind, id: b.dataset.id, topic: b.dataset.topic, index: b.dataset.index == null ? undefined : Number(b.dataset.index) });

function showTop(msg, isError) {
  const box = document.getElementById("notice");
  box.textContent = msg; box.classList.toggle("notice", !isError); box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "center" });
}
function disarm(b) { clearTimeout(b.timer); b.classList.remove("armed"); b.textContent = "Delete"; b.title = ""; }

document.querySelector("main").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || dlg.contains(b)) return;
  e.preventDefault(); // buttons sit inside <summary>; don't fold the row
  const act = b.dataset.act;
  if (act === "add") openForm(b.dataset.kind, { parent: b.dataset.parent, forum: b.dataset.forum, topic: b.dataset.topic, redirect: b.dataset.redirect === "1" });
  if (act === "edit") {
    const t = target(b);
    openForm(t.kind, { original: t.kind === "post" ? null : t.id, topic: t.topic, index: t.index, values: values(b) });
  }
  if (act === "up" || act === "down") {
    try { await post({ move: act === "up" ? -1 : 1, ...target(b) }); remember(); reload(); } catch (err) { showTop(err.message, true); }
  }
  if (act === "delete") {
    if (!b.classList.contains("armed")) {
      document.querySelectorAll("[data-act=delete].armed").forEach(disarm);
      b.classList.add("armed"); b.textContent = "Really delete?";
      b.title = "Click again to delete " + b.dataset.what + ".";
      b.timer = setTimeout(() => disarm(b), 4000);
      return;
    }
    clearTimeout(b.timer);
    try { await post({ delete: true, ...target(b) }); flash("Deleted " + b.dataset.what + "."); reload(); }
    catch (err) { disarm(b); showTop(err.message, true); }
  }
});

document.addEventListener("toggle", (e) => {
  const key = e.target.dataset && e.target.dataset.key;
  if (!key) return;
  e.target.open ? openKeys.add(key) : openKeys.delete(key);
  saveOpen();
}, true);
const setAll = (open) => document.querySelectorAll("details[data-key]").forEach((d) => (d.open = open));
const expand = document.getElementById("expand");
if (expand) { expand.onclick = () => setAll(true); document.getElementById("collapse").onclick = () => setAll(false); }

document.getElementById("open-file").onclick = async (e) => {
  const b = e.currentTarget;
  try { await post({}, "/__forums/open"); b.textContent = "Opened!"; b.classList.add("done"); }
  catch (err) { b.textContent = "Couldn't open it"; showTop(err.message, true); }
  setTimeout(() => { b.textContent = "Open forums.json"; b.classList.remove("done"); }, 1500);
};

// Restore what was open, the scroll position and the last message after a save.
document.querySelectorAll("details[data-key]").forEach((d) => (d.open = openKeys.has(d.dataset.key)));
// (Saving reloads the page, and the file watcher may reload it once more, so these live for a few seconds.)
try {
  const n = JSON.parse(store.get("dev_forums_notice"));
  if (n && Date.now() - n.at < 5000) { const box = document.getElementById("notice"); box.textContent = n.msg; box.hidden = false; }
} catch {}
try {
  const s = JSON.parse(store.get("dev_forums_scroll"));
  if (s && Date.now() - s.at < 5000 && s.y) requestAnimationFrame(() => scrollTo(0, s.y));
} catch {}
// Reload when data files change, unless a form is open.
new EventSource("/__live").onmessage = () => { if (!dlg.open) { remember(); location.reload(); } };
</script></body></html>`;
}

module.exports = { FILE, page, change, open, format };
