// Gros plan sur une partie d'un schéma, pour juger un détail (libellé serré,
// raccord de traits) : le cadre de vue du SVG est réduit à la fenêtre demandée.
//   node tools/verif/zoom-schema.mjs <module.js> <schemaX> <x> <y> <largeur> <hauteur> <sortie.png> [échelle = 3]
// Exemple : node tools/verif/zoom-schema.mjs src/schemas-laboratoire.js schemaProctor 0 0 200 150 docs/travail/zoom.png
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "./commun.mjs";

const [m, nom, x, y, l, h, sortie, ech = "3"] = process.argv.slice(2);
if (!sortie) {
  console.error("usage : node tools/verif/zoom-schema.mjs <module.js> <schemaX> <x> <y> <largeur> <hauteur> <sortie.png> [échelle]");
  process.exit(2);
}
const mod = await import(pathToFileURL(resolve(m)).href);
const svg = mod[nom]().replace(/viewBox="0 0 \d+ \d+"/, `viewBox="${x} ${y} ${l} ${h}"`);
mkdirSync(dirname(sortie), { recursive: true });
const nav = await chromium();
const page = await nav.newPage({ deviceScaleFactor: Number(ech) });
await page.setViewportSize({ width: Number(l) + 20, height: Number(h) + 20 });
await page.setContent(`<!doctype html><html><body style="margin:10px;background:#fff"><div id="f" style="width:${l}px">${svg}</div></body></html>`);
await page.locator("#f svg").screenshot({ path: sortie });
await nav.close();
console.log(sortie);
