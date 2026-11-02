// The list of things you paste into the Jcink Admin CP, and the importable XML files.
const { TEMPLATES, loadSkin } = require("./skin");

function pieces(skin = loadSkin()) {
  return [
    { id: "wrapper", label: "Board Wrapper", where: "Skins & Templates > Board Wrappers", file: "skin/wrapper.html", code: skin.wrapper },
    { id: "stylesheet", label: "Stylesheet", where: "Skins & Templates > Style Sheets", file: "skin/stylesheet.css", code: skin.stylesheet },
    ...TEMPLATES.map((t) => ({
      id: t.name,
      label: t.label,
      where: `Skins & Templates > HTML Templates > ${t.label}`,
      file: `skin/templates/${t.name}.html`,
      code: skin.templates[t.name],
    })),
  ];
}

// Same layout as a full skin export from ACP > Manage Skin Sets (import it there).
function skinXml(skin = loadSkin()) {
  const item = (name, value) => `<item name='${name}'>${value}</item>`;
  const macros = Object.entries(skin.macros).map(([k, v]) => item(k, v)).join("\n\t\t\t");
  const templates = xmlTemplates(skin).map((t) => item(t.name, skin.templates[t.name].trimEnd())).join("\n\t\t\t");
  return `<?xml version="1.0"?>
\t\t<skin>

\t\t<skinname>${skin.info.name}</skinname>
\t\t<date>${exportDate(new Date())}</date>

\t\t<stylesheet>
\t\t
${skin.stylesheet.trim()}

\t\t</stylesheet>

\t\t<wrappers>
\t\t${skin.wrapper.trim()}

\t\t</wrappers>

\t\t<macros>
\t\t${macros}
\t\t\t
\t\t</macros>

\t\t<templates>
\t\t${templates}
\t\t</templates>
\t\t
\t\t</skin>
`;
}

// Jcink's export date, e.g. "Monday 2nd of November 2026 08:27:49 AM".
function exportDate(d) {
  const day = d.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  const pad = (n) => String(n).padStart(2, "0");
  const h = d.getHours() % 12 || 12;
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${weekday} ${day}${suffix} of ${month} ${d.getFullYear()} ${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${d.getHours() < 12 ? "AM" : "PM"}`;
}

const xmlTemplates = (skin) => TEMPLATES.filter((t) => t.xml !== false && skin.templates[t.name].trim());

// Same layout as Jcink's own default template set download (HTML Templates > import).
function templatesXml(skin = loadSkin()) {
  const items = xmlTemplates(skin)
    .map((t) => ` <item name='${t.name}'>${skin.templates[t.name].trimEnd()}</item>`)
    .join("\n");
  return `<?xml version="1.0"?>
<skin>

<skinname>${skin.info.name}</skinname>

<templates>
${items}
</templates>
</skin>
`;
}

module.exports = { pieces, skinXml, templatesXml };
