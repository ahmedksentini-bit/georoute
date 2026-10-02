// Images des schémas du cours pour les diaporamas de l'auteur (PowerPoint…) :
// chaque schéma placé dans cours.html, en SVG (net à toute taille ; PowerPoint
// le convertit en formes modifiables) et en PNG haute définition, sur fond
// blanc, nommés par chapitre dans l'ordre du cours (ch02-tamisage.svg…), avec
// un fichier legendes.txt qui reprend la légende de chaque figure.
//
//   node tools/images-schemas.mjs [--sortie dossier] [--echelle 3]
//
// Les images ne sont NI versionnées NI publiées : elles vont par défaut dans
// docs/medias/schemas/, que .gitignore exclut. Il faut Playwright pour les PNG
// (voir tools/verif/commun.mjs).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium, options, importer, RACINE } from "./verif/commun.mjs";

const { opt } = options(["--sortie", "--echelle"]);
const SORTIE = resolve(opt("--sortie", join(RACINE, "docs", "medias", "schemas")));
const ECHELLE = Number(opt("--echelle", 3));

const S = {};
for (const m of ["cours", "identification", "laboratoire", "terrain"]) Object.assign(S, await importer(`src/schemas-${m}.js`));

// Les figures du cours, chapitre par chapitre, avec leur légende en texte brut.
const html = readFileSync(join(RACINE, "cours.html"), "utf8");
const debuts = [...html.matchAll(/<section id="(ch\d+)"/g)];
const texteBrut = (s) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;|&#160;/g, " ").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
const figures = debuts.flatMap((d, i) => {
  const section = html.slice(d.index, debuts[i + 1]?.index ?? html.length);
  const ch = `ch${d[1].slice(2).padStart(2, "0")}`;
  return [...section.matchAll(/data-schema="([^"]+)"><figcaption>([\s\S]*?)<\/figcaption>/g)]
    .map(([, nom, legende]) => ({ ch, nom, legende: texteBrut(legende) }));
});

/** schemaZonesRemblai → zones-remblai */
const fichier = (ch, nom) => `${ch}-${nom.replace(/^schema/, "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

mkdirSync(SORTIE, { recursive: true });
const nav = await chromium();
const page = await nav.newPage({ deviceScaleFactor: ECHELLE });
const legendes = [];
for (const { ch, nom, legende } of figures) {
  if (typeof S[nom] !== "function") throw new Error(`${nom} : aucun schéma de ce nom`);
  const brut = S[nom]();
  const [, W, H] = /viewBox="0 0 (\d+) (\d+)"/.exec(brut).map(Number);
  // Taille en pixels (PowerPoint en déduit la taille d'insertion) et fond blanc.
  const svg = brut.replace(/^<svg /, `<svg width="${W}" height="${H}" `)
    .replace(/^(<svg[^>]*>)/, `$1<rect width="100%" height="100%" fill="#fff"/>`);
  const f = fichier(ch, nom);
  writeFileSync(join(SORTIE, `${f}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
  await page.setViewportSize({ width: W + 20, height: H + 20 });
  await page.setContent(`<!doctype html><html><body style="margin:10px;background:#fff"><div id="f" style="width:${W}px">${svg}</div></body></html>`);
  await page.locator("#f svg").screenshot({ path: join(SORTIE, `${f}.png`) });
  legendes.push(`${f}\n  ${legende}\n`);
  console.log(`${f}.svg, ${f}.png (${W * ECHELLE} × ${H * ECHELLE} px)`);
}
writeFileSync(join(SORTIE, "legendes.txt"), `Schémas du cours « Terrassements routiers — GTR 2024 » et leurs légendes\n\n${legendes.join("\n")}`);
await nav.close();
console.log(`${figures.length} schémas dans ${SORTIE}`);
