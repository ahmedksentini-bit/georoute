// Charge chaque page du site dans Chromium et relève ce qui cloche : exceptions,
// erreurs et avertissements de console, requêtes en échec, sorties de
// calculateur restées vides, textes NaN / undefined, bandeau de panne.
//   node tools/verif/pages.mjs [page…] [--sw]
// Sans page : index.html, cours.html, exerciseur.html, bureau.html. Le service
// worker est bloqué (on voit le site tel que servi) ; --sw le laisse s'installer
// et affiche son état. Code de sortie 1 s'il y a un défaut.
import { servir, chromium, options, suivre, SUSPECT } from "./commun.mjs";

const { drap, positions } = options();
const pages = positions.length ? positions : ["index.html", "cours.html", "exerciseur.html", "bureau.html"];
const { base, fermer } = await servir();
const nav = await chromium();
let defauts = 0;
for (const url of pages) {
  const ctx = await nav.newContext({ serviceWorkers: drap("--sw") ? "allow" : "block", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const pbs = suivre(page, base, { avertissements: true });
  await page.goto(base + url, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  if (drap("--sw")) {
    const etat = await page.evaluate(() => Promise.race([
      navigator.serviceWorker.ready.then((r) => r.active?.state ?? "?"),
      new Promise((ok) => setTimeout(() => ok("délai dépassé"), 8000)),
    ]));
    console.log(`   service worker : ${etat}`);
  }
  const info = await page.evaluate((motif) => ({
    titre: document.title,
    bandeau: document.querySelector(".bandeau-panne, #panne, .panne")?.textContent?.trim()?.slice(0, 120) ?? "",
    vides: [...document.querySelectorAll(".final-result, [id$=Out]")].filter((e) => !e.textContent.trim()).map((e) => e.id || e.className),
    suspects: (document.body.innerText.match(new RegExp(motif, "g")) || []).length,
  }), SUSPECT.source);
  const notes = [
    info.bandeau && `bandeau : ${info.bandeau}`,
    info.vides.length && `sorties vides : ${info.vides.slice(0, 10).join(" ")}`,
    info.suspects && `textes suspects : ${info.suspects}`,
  ].filter(Boolean);
  console.log(`== ${url} : « ${info.titre} »${notes.length ? " — " + notes.join(" ; ") : ""}`);
  for (const p of pbs) console.log("   ", p);
  defauts += pbs.length + info.vides.length + info.suspects + (info.bandeau ? 1 : 0);
  await ctx.close();
}
await nav.close();
fermer();
console.log(defauts ? `${defauts} défaut(s)` : "aucun défaut");
process.exitCode = defauts ? 1 : 0;
