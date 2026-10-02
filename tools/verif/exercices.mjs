// Ouvre chaque modèle de l'exerciseur avec deux graines, puis l'accueil et une
// banque : relève exceptions, requêtes en échec, exercices vides et textes
// suspects (NaN, undefined…). Complète tests/exercices.test.mjs, qui contrôle
// les modèles hors navigateur.
//   node tools/verif/exercices.mjs [chN…]
import { servir, chromium, options, suivre, importer, SUSPECT } from "./commun.mjs";

const { positions } = options();
const { MODELES } = await importer("src/exos/index.js");
const chapitres = positions.length ? positions : Object.keys(MODELES);
const { base, fermer } = await servir();
const nav = await chromium();
const ctx = await nav.newContext({ serviceWorkers: "block", viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
const pbs = suivre(page, base);
let n = 0;
await page.goto(base + "exerciseur.html", { waitUntil: "load" });
await page.waitForTimeout(800);
for (const ch of chapitres) {
  if (!MODELES[ch]) { pbs.push(`chapitre inconnu : ${ch}`); continue; }
  const modeles = (await MODELES[ch]()).default;
  for (const m of modeles) for (const g of [1234567, 98765]) {
    await page.evaluate((h) => { location.hash = h; }, `${ch}/${m.id}/${g}`);
    await page.waitForFunction(() => document.querySelector("#app")?.innerText.length > 80, null, { timeout: 8000 })
      .catch(() => pbs.push(`exercice vide : ${ch}/${m.id}/${g}`));
    await page.waitForTimeout(120);
    const s = (await page.evaluate(() => document.querySelector("#app").innerText)).match(SUSPECT);
    if (s) pbs.push(`texte suspect « ${s[0]} » : ${ch}/${m.id}/${g}`);
    n++;
  }
}
// Accueil : chaque carte de chapitre annonce ses exercices ; une banque s'ouvre.
await page.goto(base + "index.html", { waitUntil: "load" });
await page.waitForTimeout(800);
const comptes = await page.$$eval(".chapter .count", (els) => els.map((e) => e.textContent.trim()));
await page.goto(base + "index.html#ch7", { waitUntil: "load" });
await page.waitForTimeout(1200);
const banque = await page.evaluate(() => document.querySelector("#app")?.innerText.slice(0, 160).replace(/\s+/g, " ") ?? "");
console.log(`${n} tirages ouverts ; cartes : ${comptes.join(" | ")}`);
console.log(`banque du chapitre 7 : ${banque}`);
for (const p of pbs) console.log("  ", p);
console.log(pbs.length ? `${pbs.length} problème(s)` : "aucun problème");
await nav.close();
fermer();
process.exitCode = pbs.length ? 1 : 0;
