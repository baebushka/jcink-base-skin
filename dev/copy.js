// `npm run copy -- <name>`: puts one piece on the clipboard. Run with no name to list them.
const { execSync } = require("child_process");
const { pieces } = require("./pieces");

const all = pieces();
const name = process.argv[2];
const piece = all.find((p) => p.id === name || (name === "css" && p.id === "stylesheet"));

if (!piece) {
  console.log("Usage: npm run copy -- <name>\n");
  for (const p of all) console.log(`  ${p.id.padEnd(18)} ${p.where}`);
  process.exit(name ? 1 : 0);
}
const clipboard = { darwin: "pbcopy", win32: "clip" }[process.platform] || "xclip -selection clipboard";
try {
  execSync(clipboard, { input: piece.code });
} catch {
  console.error(`Couldn't reach the clipboard (${clipboard}). Use the Copy page instead: http://localhost:3000/__copy`);
  process.exit(1);
}
console.log(`Copied ${piece.label}. Paste it into: ACP > ${piece.where}`);
