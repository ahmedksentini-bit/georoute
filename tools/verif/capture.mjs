// Capture d'écran d'une page du site, servie en local, et des erreurs qu'elle
// déclenche ; peut ouvrir un banc d'essai, le régler et le faire tourner.
//   node tools/verif/capture.mjs <page> <sortie.png> [--largeur 1200] [--plein]
//        [--attente ms] [--selecteur css]
//        [--banc nom [--regler "cle=valeur,cle=valeur"] [--vitesse v] [--fin | --marche ms] [--texte]]
// Exemples :
//   node tools/verif/capture.mjs "exerciseur.html#ch3/ch3-proctor/12345" docs/travail/captures/exo.png --plein
//   node tools/verif/capture.mjs cours.html#ch2 docs/travail/captures/bleu.png --banc bleu --fin --texte
//   node tools/verif/capture.mjs cours.html docs/travail/captures/tel.png --largeur 400 --selecteur "#calcGranulo"
// --regler agit sur les réglages du banc (éléments [data-r="cle"]) ; --texte
// imprime les afficheurs et le bilan du banc. Les captures vont de préférence
// dans docs/travail/ (hors dépôt).
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { servir, chromium, options, suivre } from "./commun.mjs";

const { opt, drap, positions } = options(["--largeur", "--attente", "--selecteur", "--banc", "--regler", "--vitesse", "--marche"]);
const [chemin, sortie] = positions;
if (!chemin || !sortie) {
  console.error("usage : node tools/verif/capture.mjs <page> <sortie.png> [options] (voir l'en-tête du script)");
  process.exit(2);
}
mkdirSync(dirname(sortie), { recursive: true });
const { base, fermer } = await servir();
const nav = await chromium();
const ctx = await nav.newContext({ serviceWorkers: "block", viewport: { width: Number(opt("--largeur", 1200)), height: 900 } });
const page = await ctx.newPage();
const pbs = suivre(page, base);
await page.goto(base + chemin, { waitUntil: "networkidle" });
await page.waitForTimeout(Number(opt("--attente", 600)));

let cible = page;
const banc = opt("--banc");
if (banc) {
  const b = page.locator(`.banc[data-banc="${banc}"]`);
  await b.scrollIntoViewIfNeeded();
  await b.locator(".banc-ouvrir").click();
  await page.waitForTimeout(800);
  for (const kv of (opt("--regler") ?? "").split(",").filter(Boolean)) {
    const [k, v] = kv.split("=");
    const el = b.locator(`[data-r="${k}"]`);
    if ((await el.evaluate((x) => x.tagName)) === "SELECT") await el.selectOption(v);
    else { await el.fill(v); await el.dispatchEvent("change"); }
    await page.waitForTimeout(150);
  }
  if (opt("--vitesse")) await b.locator(`[data-vitesse="${opt("--vitesse")}"]`).click();
  if (drap("--fin")) { await b.locator('[data-action="fin"]').click(); await page.waitForTimeout(900); }
  else if (opt("--marche")) { await b.locator('[data-action="marche"]').click(); await page.waitForTimeout(Number(opt("--marche"))); }
  if (drap("--texte")) {
    console.log(`[${(await b.locator(".banc-lectures").innerText()).replace(/\n/g, " ")}]`);
    console.log(await b.locator(".banc-bilan").innerText());
  }
  cible = b;
}
const sel = opt("--selecteur");
if (sel) cible = page.locator(sel).first();
if (cible === page) await page.screenshot({ path: sortie, fullPage: drap("--plein") });
else await cible.screenshot({ path: sortie });
console.log(JSON.stringify({ sortie, erreurs: pbs }, null, 1));
await nav.close();
fermer();
process.exitCode = pbs.length ? 1 : 0;
