// Calculateurs d'une page : mesure le temps qu'il faut pour que toutes les
// sorties se remplissent, puis secoue chaque calculateur (chaque liste de choix
// prend tour à tour toutes ses valeurs) et relève les sorties vides, les
// pannes affichées (« calcul impossible ») et les textes suspects.
//   node tools/verif/calculateurs.mjs [page = cours.html] [--sans-balayage]
import { servir, chromium, options, suivre, SUSPECT } from "./commun.mjs";

const { drap, positions } = options();
const url = positions[0] ?? "cours.html";
const { base, fermer } = await servir();
const nav = await chromium();
const ctx = await nav.newContext({ serviceWorkers: "block", viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const pbs = suivre(page, base);
const t0 = Date.now();
await page.goto(base + url, { waitUntil: "load" });
console.log(`chargée en ${Date.now() - t0} ms`);
let vides = "";
for (let i = 0; i < 60; i++) {
  vides = await page.evaluate(() => [...document.querySelectorAll(".final-result, [id$=Out]")].filter((e) => !e.textContent.trim()).map((e) => e.id).join(" "));
  if (!vides) break;
  await page.waitForTimeout(250);
}
console.log(vides ? `sorties encore vides après ${Date.now() - t0} ms : ${vides}` : `toutes les sorties remplies en ${Date.now() - t0} ms`);
if (vides) pbs.push(`sorties vides : ${vides}`);

if (!drap("--sans-balayage")) {
  // Chaque liste de choix d'un calculateur prend toutes ses valeurs, les autres champs gardant les leurs.
  const constats = await page.evaluate((motif) => {
    const res = [];
    for (const calc of document.querySelectorAll(".calc")) {
      const sorties = [...calc.querySelectorAll(".final-result, [id$=Out]")];
      for (const sel of calc.querySelectorAll("select")) {
        const initial = sel.value;
        for (const o of sel.options) {
          sel.value = o.value;
          sel.dispatchEvent(new Event("change", { bubbles: true }));
          for (const s of sorties) {
            const t = s.textContent;
            if (!t.trim()) res.push(`${calc.id} · ${sel.id}=${o.value} : ${s.id} vide`);
            else if (/calcul impossible/.test(t)) res.push(`${calc.id} · ${sel.id}=${o.value} : panne — ${t.replace(/\s+/g, " ").slice(0, 120)}`);
            else if (new RegExp(motif).test(t)) res.push(`${calc.id} · ${sel.id}=${o.value} : texte suspect dans ${s.id}`);
          }
        }
        sel.value = initial;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    return res;
  }, SUSPECT.source);
  console.log(`balayage des listes de choix : ${constats.length ? constats.length + " constat(s)" : "rien à signaler"}`);
  for (const c of constats) console.log("   ", c);
  pbs.push(...constats);
}
for (const p of pbs.filter((p) => !p.startsWith("sorties vides"))) if (!p.includes(" · ")) console.log("   ", p);
await nav.close();
fermer();
console.log(pbs.length ? `${pbs.length} défaut(s)` : "aucun défaut");
process.exitCode = pbs.length ? 1 : 0;
