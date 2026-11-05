// Reads the skin/ and data/ folders. Everything is re-read on each request so edits show up immediately.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIN = path.join(ROOT, "skin");
const DATA = path.join(ROOT, "data");
const JCINK = path.join(__dirname, "jcink");

// Each file in skin/templates maps to one box in ACP > Skins & Templates > HTML Templates.
// `xml: false` means Jcink's template XML import doesn't cover it; paste it by hand.
const TEMPLATES = [
  { name: "cat_head", label: "Category List Header" },
  { name: "subf_head", label: "Subforum List Header" },
  { name: "forum_row", label: "Forum Row" },
  { name: "redirect_row", label: "Redirect Row" },
  { name: "topic_list_head", label: "Topic List Header" },
  { name: "topic_row", label: "Topic Row" },
  { name: "board_stats", label: "Board Statistics" },
  { name: "mini_profile", label: "Mini Profile" },
  { name: "post_row", label: "Post Row" },
  { name: "profile", label: "Main Profile", xml: false },
  { name: "member_list_head", label: "Member List Header", xml: false },
  { name: "member_list_row", label: "Member List Row", xml: false },
];

const read = (file) => fs.readFileSync(file, "utf8");

function readJSON(file) {
  try {
    return JSON.parse(read(file));
  } catch (err) {
    throw new Error(`${path.relative(ROOT, file)} is not valid JSON: ${err.message}`);
  }
}

function loadSkin() {
  const templates = {};
  for (const t of TEMPLATES) {
    const file = path.join(SKIN, "templates", `${t.name}.html`);
    templates[t.name] = fs.existsSync(file) ? read(file) : "";
  }
  return {
    info: readJSON(path.join(SKIN, "skin.json")),
    wrapper: read(path.join(SKIN, "wrapper.html")),
    stylesheet: read(path.join(SKIN, "stylesheet.css")),
    macros: readJSON(path.join(SKIN, "macros.json")),
    templates,
  };
}

// data/groups.json: [{ id, name, "clr1-hex", "clr2-hex", ... }], plus optional prefix, suffix and icon.
function loadGroups() {
  const groups = readJSON(path.join(DATA, "groups.json"));
  if (!Array.isArray(groups)) throw new Error(`data/groups.json should be a list: [ { "id": 1, "name": "..." }, ... ]`);
  groups.forEach((g, i) => {
    if (!g || typeof g !== "object" || g.id === undefined || g.id === "" || !g.name) {
      throw new Error(`data/groups.json: group number ${i + 1} in the list needs an "id" and a "name".`);
    }
  });
  return groups.map((g) => ({ ...g, id: Number(g.id) }));
}

// Group settings that aren't CSS. "prefix"/"suffix" are from older versions and only trigger a warning.
const GROUP_SETTINGS = new Set(["id", "name", "icon", "prefix", "suffix"]);

// Splits a group into its colours ("clr1-hex": "#4DB6AC" -> hex + "77, 182, 172") and its other
// CSS variables ("radius": "6px" -> --radius: 6px), plus problems to warn about.
function groupStyle(g) {
  const colours = [];
  const vars = [];
  const problems = [];
  for (const [key, raw] of Object.entries(g)) {
    if (GROUP_SETTINGS.has(key)) continue;
    const clr = key.match(/^clr(\d+)-hex$/);
    if (clr) {
      const m = String(raw).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
      if (!m) {
        problems.push(`"${key}" ("${raw}") isn't a hex colour like #4DB6AC`);
        continue;
      }
      const hex = (m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1]).toUpperCase();
      const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");
      colours.push({ key, n: Number(clr[1]), hex: `#${hex}`, rgb });
      continue;
    }
    if (/^clr\d+-rgb$/.test(key)) {
      problems.push(`"${key}" is made for you from "${key.replace(/-rgb$/, "-hex")}". Remove it.`);
      continue;
    }
    const name = key.replace(/^--/, "");
    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
      problems.push(`"${key}" isn't a valid CSS variable name. Use letters, numbers, - and _.`);
      continue;
    }
    const value = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
    if (!value) {
      problems.push(`"${key}" should be a CSS value, like "6px" or "bold"`);
      continue;
    }
    if (/[<>{};]/.test(value)) {
      problems.push(`"${key}" can't contain HTML or the characters < > { } ;. It's a CSS value only.`);
      continue;
    }
    vars.push({ key, name: `--${name}`, value });
  }
  colours.sort((a, b) => a.n - b.n);
  return { colours, vars, problems };
}

function loadData() {
  return {
    board: readJSON(path.join(DATA, "board.json")),
    groups: loadGroups(),
    fields: readJSON(path.join(DATA, "custom-fields.json")),
    members: readJSON(path.join(DATA, "members.json")),
    categories: readJSON(path.join(DATA, "forums.json")),
    jcink: {
      header: read(path.join(JCINK, "board-header.html")),
      shoutbox: read(path.join(JCINK, "shoutbox.html")),
      copyright: read(path.join(JCINK, "copyright.html")),
    },
    fallbackMacros: readJSON(path.join(JCINK, "fallback-macros.json")),
  };
}

module.exports = { ROOT, SKIN, DATA, JCINK, TEMPLATES, loadSkin, loadData, loadGroups, groupStyle };
