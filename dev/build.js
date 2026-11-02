// `npm run build`: writes importable XML files to dist/.
const fs = require("fs");
const path = require("path");
const { ROOT, loadSkin } = require("./skin");
const { skinXml, templatesXml } = require("./pieces");

const skin = loadSkin();
const dist = path.join(ROOT, "dist");
const slug = skin.info.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, `${slug}-skin.xml`), skinXml(skin));
fs.writeFileSync(path.join(dist, `${slug}-templates.xml`), templatesXml(skin));
console.log(`dist/${slug}-skin.xml       -> ACP > Skins & Templates > Manage Skin Sets (import): stylesheet, wrapper, macros and templates`);
console.log(`dist/${slug}-templates.xml  -> ACP > Skins & Templates > HTML Templates (import): templates only`);
console.log("Main Profile and Member List templates aren't in the XML; copy those from http://localhost:3000/__copy");
