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

function loadData() {
  return {
    board: readJSON(path.join(DATA, "board.json")),
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

module.exports = { ROOT, SKIN, DATA, JCINK, TEMPLATES, loadSkin, loadData };
