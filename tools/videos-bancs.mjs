// Vidéos des bancs d'essai pour les diaporamas de l'auteur (PowerPoint…).
// Chaque banc est ouvert seul et mis en page pour un écran 16:9 de 1920 × 1080 :
// la scène, les afficheurs et la loupe, les courbes, puis le bilan. Il est
// ensuite enregistré image par image sous une horloge maîtrisée (page.clock de
// Playwright), si bien que l'animation reste régulière quelle que soit la
// vitesse de la machine. ffmpeg assemble les images en MP4 (H.264), que
// PowerPoint lit sans module complémentaire.
//
//   node tools/videos-bancs.mjs [nom…] [--sortie dossier] [--un-seul] [--varier cle]
//        [--regler "cle=valeur,…"] [--vitesse v] [--ips 30] [--duree-max 75]
//        [--paralleles 3] [--apercu]
//
// Sans nom : tous les bancs du cours. Par défaut, une vidéo par matériau : le
// premier réglage « sol », « roche », « mat » ou « pf » du banc prend tour à
// tour toutes ses valeurs, les autres réglages gardant celles du banc.
// --un-seul s'en tient au matériau par défaut ; --varier cle fait aussi varier
// un autre réglage (par exemple --varier essai pour la fragmentabilité et la
// dégradabilité). --regler impose des réglages (éléments [data-r="cle"]). La
// vitesse de l'essai est choisie pour que la vidéo dure de 12 s à --duree-max
// secondes, sauf si --vitesse l'impose. --apercu produit trois images (début,
// milieu, fin) au lieu de chaque vidéo, pour juger la mise en page.
//
// Les vidéos ne sont NI versionnées NI publiées : elles vont par défaut dans
// docs/medias/bancs/<banc>/, que .gitignore exclut, et le site n'offre aucun
// téléchargement. Il faut Playwright (voir tools/verif/commun.mjs) et ffmpeg.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { servir, chromium, options, suivre, RACINE } from "./verif/commun.mjs";

const { opt, drap, positions } = options(["--sortie", "--regler", "--vitesse", "--ips", "--duree-max", "--varier", "--paralleles"]);
const SORTIE = resolve(opt("--sortie", join(RACINE, "docs", "medias", "bancs")));
const IPS = Number(opt("--ips", 30));
const DUREE_MAX = Number(opt("--duree-max", 75)) * 1000, DUREE_MIN = 12000;
const IMPOSES = (opt("--regler") ?? "").split(",").filter(Boolean).map((kv) => kv.split("="));
const CLES_MATERIAU = ["sol", "roche", "mat", "pf"];

// Mise en page « projection » : le banc occupe seul un cadre de 1280 × 720 px
// agrandi 1,5 fois (1920 × 1080), en trois colonnes — scène, afficheurs et
// loupe, courbes — avec le bilan sous la scène.
const CSS = `
html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: hidden !important; }
.banc.projection { box-sizing: border-box; width: 1280px; height: 720px; zoom: 1.5; margin: 0; padding: 12px 18px;
  border: 0; border-radius: 0; background: #fff; overflow: hidden; }
.banc.projection .banc-marque, .banc.projection .banc-tete p, .banc.projection .banc-marche,
.banc.projection .banc-imprime { display: none !important; }
.banc.projection .banc-tete h3 { font-size: 19px; }
.banc.projection .banc-corps { margin-top: 4px; gap: 6px 14px; align-items: start;
  grid-template-columns: minmax(0, 1fr) 178px minmax(0, 0.95fr);
  grid-template-areas: "cmd cmd cmd" "scene cote courbes" "bilan cote courbes"; grid-template-rows: auto auto 1fr; }
.banc.projection .banc-commandes { grid-area: cmd; }
.banc.projection .banc-vue { display: contents; }
.banc.projection .banc-scene { grid-area: scene; }
.banc.projection .banc-cote { grid-area: cote; gap: 6px; }
.banc.projection .banc-courbes { grid-area: courbes; }
.banc.projection .banc-bilan { grid-area: bilan; }
/* Réglages du banc réduits à une ligne de texte : « Sol : Argile marneuse ». */
.banc.projection .banc-commandes .data-grid { display: flex; flex-wrap: wrap; gap: 2px 22px; margin: 0; }
.banc.projection .banc-commandes .field { display: flex; align-items: baseline; gap: 6px; margin: 0; }
.banc.projection .banc-commandes label { font-size: 12.5px; margin: 0; }
.banc.projection .banc-commandes label::after { content: " :"; }
.banc.projection .banc-commandes .input-wrap { display: inline-flex; align-items: baseline; gap: 3px; border: 0;
  background: none; padding: 0; min-height: 0; box-shadow: none; }
.banc.projection .banc-commandes select, .banc.projection .banc-commandes input { appearance: none; -webkit-appearance: none;
  field-sizing: content; border: 0; background: none; padding: 0; margin: 0; height: auto; min-height: 0; width: auto;
  font-size: 13.5px; font-weight: 700; color: #0f172a; box-shadow: none; }
.banc.projection .banc-commandes .unit { font-size: 12px; }
.banc.projection .banc-commandes .curseur { display: none; }
.banc.projection .banc-commandes p { font-size: 12.5px; margin: 3px 0 0; line-height: 1.35; }
.banc.projection .afficheur { padding: 4px 9px; }
.banc.projection .banc-etat { font-size: 13px; line-height: 1.3; }
.banc.projection .banc-bilan .final-result { font-size: 14.5px; line-height: 1.4; margin: 0; }
/* Ce qui déborde du cadre à la fin de l'essai à blanc est resserré dès le début
   de l'enregistrement, colonne par colonne : bilan (tableaux retirés, puis
   texte plus petit), courbes (tableaux retirés, puis graphiques moins hauts),
   afficheurs (unité sur la ligne de la valeur, légende de la loupe plus petite). */
.banc.projection.sans-tableaux-bilan .banc-bilan .table-large,
.banc.projection.sans-tableaux-courbes .banc-courbes .table-large { display: none; }
.banc.projection.bilan-serre .banc-bilan .final-result { font-size: 12.5px; }
.banc.projection.courbes-serrees .banc-courbes svg { max-height: var(--h-courbe, 290px); width: auto; max-width: 100%; margin: 0 auto; }
.banc.projection.cote-serre .afficheur { display: grid; grid-template-columns: auto 1fr; align-items: baseline; column-gap: 5px; }
.banc.projection.cote-serre .afficheur span { grid-column: 1 / -1; }
.banc.projection.cote-serre .afficheur small { grid-column: 2; }
.banc.projection.cote-serre .banc-loupe-cadre figcaption { font-size: 10.5px; }
`;

/** Resserre ce qui déborde du cadre ; renvoie les classes posées et s'il déborde encore. */
const ajuster = (page) => page.evaluate(() => {
  const b = document.querySelector(".banc.projection");
  const cadre = b.getBoundingClientRect();
  const bas = (sel) => Math.max(0, ...[...b.querySelectorAll(`${sel}, ${sel} *:not(svg *)`)].map((e) => e.getBoundingClientRect().bottom));
  const trop = (sel) => bas(sel) > cadre.bottom + 1;
  const large = (sel) => [...b.querySelectorAll(`${sel} table`)].some((t) => t.offsetParent && t.scrollWidth > t.parentElement.clientWidth + 1);
  const classes = [], variables = {};
  const poser = (c) => { b.classList.add(c); classes.push(c); };
  if (trop(".banc-bilan") || large(".banc-bilan")) poser("sans-tableaux-bilan");
  if (trop(".banc-bilan")) poser("bilan-serre");
  if (trop(".banc-courbes") || large(".banc-courbes")) poser("sans-tableaux-courbes");
  if (trop(".banc-courbes")) {
    // Hauteur maximale commune des graphiques pour que la colonne tienne :
    // un graphique plus bas que cette hauteur garde la sienne.
    const z = cadre.height / 720;
    const c = b.querySelector(".banc-courbes"), rc = c.getBoundingClientRect();
    const hs = [...c.querySelectorAll("svg")].map((s) => s.getBoundingClientRect().height / z).filter((h) => h > 0);
    const autres = rc.height / z - hs.reduce((a, h) => a + h, 0), dispo = (cadre.bottom - rc.top) / z - 4;
    let H = Math.max(...hs);
    while (H > 80 && autres + hs.reduce((a, h) => a + Math.min(h, H), 0) > dispo) H -= 2;
    variables["--h-courbe"] = `${H}px`;
    b.style.setProperty("--h-courbe", variables["--h-courbe"]);
    poser("courbes-serrees");
  }
  if (trop(".banc-cote")) poser("cote-serre");
  return { classes, variables, deborde: trop(".banc-corps") };
});

/** Nom de fichier lisible : « Limon des plateaux (F1h) » → « limon-des-plateaux-f1h ». */
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/** Ouvre le banc seul dans une page neuve, horloge arrêtée, réglages appliqués. */
async function preparer(nav, base, nom, reglages, classes = [], variables = {}) {
  const ctx = await nav.newContext({ serviceWorkers: "block", viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const pbs = suivre(page, base);
  // L'horloge n'avance que par runFor(), d'une image à la suivante, et non en
  // temps réel pendant les captures d'écran.
  const t0 = new Date("2026-01-05T09:00:00Z").getTime();
  await page.clock.install({ time: t0 });
  await page.clock.pauseAt(t0 + 1000);
  await page.goto(base + "cours.html", { waitUntil: "load" });
  await page.clock.runFor(1500);
  const trouve = await page.evaluate(({ nom, css, classes, variables }) => {
    const b = document.querySelector(`.banc[data-banc="${nom}"]`);
    if (!b) return false;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
    document.body.prepend(b);
    for (const el of [...document.body.children]) if (el !== b && !["SCRIPT", "STYLE"].includes(el.tagName)) el.style.display = "none";
    b.classList.add("projection", ...classes);
    for (const [k, v] of Object.entries(variables)) b.style.setProperty(k, v);
    b.querySelector(".banc-ouvrir").click();
    return true;
  }, { nom, css: CSS, classes, variables });
  if (!trouve) throw new Error(`aucun banc « ${nom} » dans cours.html`);
  // Le module du banc se charge à la demande : le réseau ne dépend pas de l'horloge.
  await page.locator(".banc.projection .banc-corps").waitFor();
  await page.clock.runFor(500);
  for (const [cle, valeur] of reglages) {
    const ok = await page.evaluate(([cle, valeur]) => {
      const el = document.querySelector(`.banc.projection [data-r="${cle}"]`);
      if (!el) return false;
      el.value = valeur;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return el.value === valeur;
    }, [cle, valeur]);
    if (!ok) throw new Error(`${nom} : réglage « ${cle} = ${valeur} » impossible`);
    await page.clock.runFor(300);
  }
  return { ctx, page, pbs };
}

const cliquer = (page, sel) => page.evaluate((sel) => document.querySelector(`.banc.projection ${sel}`)?.click(), sel);
const fini = (page) => page.evaluate(() => document.querySelector('.banc.projection [data-action="marche"]')?.disabled === true);
const vitesses = (page) => page.evaluate(() => [...document.querySelectorAll(".banc.projection [data-vitesse]")]
  .map((b) => ({ v: Number(b.dataset.vitesse), actif: b.classList.contains("actif") })));

/**
 * Essai à blanc à la vitesse active, sans rien enregistrer : sa durée (ms
 * d'horloge) et ce qu'il faut retirer pour que l'état final tienne dans le cadre.
 */
async function essaiABlanc(page) {
  await cliquer(page, '[data-action="marche"]');
  let t = 0;
  while (!(await fini(page))) {
    if (t > 3600e3) throw new Error("l'essai ne se termine pas en une heure d'horloge");
    await page.clock.runFor(1000);
    t += 1000;
  }
  await page.clock.runFor(1000);
  return { T: t, ...(await ajuster(page)) };
}

/** Vitesse retenue : celle du banc si la vidéo dure entre 12 s et la durée maximale, sinon la plus proche qui convient. */
function choisirVitesse(liste, v0, T0) {
  const T = (v) => (T0 * v0) / v;
  const toutes = liste.map((x) => x.v);
  if (T0 > DUREE_MAX) return toutes.filter((v) => v > v0).sort((a, b) => a - b).find((v) => T(v) <= DUREE_MAX) ?? Math.max(...toutes);
  if (T0 < DUREE_MIN) return toutes.filter((v) => v < v0 && T(v) <= DUREE_MAX).sort((a, b) => b - a)[0] ?? v0;
  return v0;
}

/** Les vidéos à faire pour un banc : une par matériau (et par valeur de --varier). */
async function travaux(nav, base, nom) {
  const ctx = await nav.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  await page.goto(base + "cours.html", { waitUntil: "load" });
  await page.evaluate((nom) => document.querySelector(`.banc[data-banc="${nom}"] .banc-ouvrir`)?.click(), nom);
  await page.locator(`.banc[data-banc="${nom}"] .banc-corps`).waitFor();
  const choix = await page.evaluate((nom) => Object.fromEntries([...document.querySelectorAll(`.banc[data-banc="${nom}"] select[data-r]`)]
    .map((s) => [s.dataset.r, [...s.options].map((o) => [o.value, o.textContent.trim()])])), nom);
  await ctx.close();
  const imposes = new Set(IMPOSES.map(([k]) => k));
  const dims = [];
  const cleMat = CLES_MATERIAU.find((k) => choix[k]);
  if (cleMat && !drap("--un-seul") && !imposes.has(cleMat)) dims.push([cleMat, choix[cleMat]]);
  const autre = opt("--varier");
  if (autre && choix[autre] && !imposes.has(autre)) dims.unshift([autre, choix[autre]]);
  let combinaisons = [[]];
  for (const [cle, valeurs] of dims) combinaisons = combinaisons.flatMap((c) => valeurs.map(([v, l]) => [...c, [cle, v, l]]));
  // Noms courts : du libellé d'un réglage varié, on ne garde que ce qui précède
  // « : » (« fragmentabilité (IFR) ») ; le nom du banc n'est pas répété.
  return combinaisons.map((c) => {
    const parties = c.map(([k, , l]) => slug(k === autre ? l.split(" :")[0] : l));
    return {
      nom,
      reglages: [...IMPOSES, ...c.map(([k, v]) => [k, v])],
      fichier: (parties[0]?.startsWith(slug(nom)) ? parties : [nom, ...parties]).join("-"),
    };
  });
}

async function enregistrer(nav, base, { nom, reglages, fichier }) {
  const dossier = join(SORTIE, nom);
  mkdirSync(dossier, { recursive: true });
  // 1. Essai à blanc : durée à la vitesse du banc, choix de la vitesse, mise en page de l'état final.
  let { ctx, page, pbs } = await preparer(nav, base, nom, reglages);
  const liste = await vitesses(page);
  const v0 = liste.find((x) => x.actif)?.v ?? liste[0]?.v;
  const { T: T0, classes, variables, deborde } = await essaiABlanc(page);
  const v = opt("--vitesse") ? Number(opt("--vitesse")) : choisirVitesse(liste, v0, T0);
  const prevue = (T0 * v0) / v;
  await ctx.close();

  // 2. Page neuve, vitesse et mise en page retenues.
  ({ ctx, page, pbs } = await preparer(nav, base, nom, reglages, classes, variables));
  await cliquer(page, `[data-vitesse="${v}"]`);
  await page.clock.runFor(200);
  let bilan;
  if (drap("--apercu")) {
    await page.screenshot({ path: join(dossier, `${fichier}-1-debut.png`) });
    await cliquer(page, '[data-action="marche"]');
    await page.clock.runFor(Math.round(prevue / 2));
    await page.screenshot({ path: join(dossier, `${fichier}-2-milieu.png`) });
    let t = 0;
    while (!(await fini(page)) && t < 3600e3) { await page.clock.runFor(1000); t += 1000; }
    await page.clock.runFor(1000);
    await page.screenshot({ path: join(dossier, `${fichier}-3-fin.png`) });
    bilan = `aperçus ${fichier}-{1,2,3}.png`;
  } else {
    const chemin = join(dossier, `${fichier}.mp4`);
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(IPS), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", chemin], { stdio: ["pipe", "inherit", "inherit"] });
    const termine = new Promise((ok, ko) => ff.on("close", (c) => (c === 0 ? ok() : ko(new Error(`ffmpeg a échoué (code ${c})`)))));
    const ecrire = (buf) => new Promise((ok) => (ff.stdin.write(buf) ? ok() : ff.stdin.once("drain", ok)));
    const image = () => page.screenshot({ type: "jpeg", quality: 92 });
    const pas = (n) => Math.round(((n + 1) * 1000) / IPS) - Math.round((n * 1000) / IPS);
    // Deux secondes sur le banc prêt, l'essai image par image, une seconde de
    // plus pour les dernières courbes et le bilan, puis six secondes d'arrêt.
    const debut = await image();
    for (let k = 0; k < 2 * IPS; k++) await ecrire(debut);
    await cliquer(page, '[data-action="marche"]');
    let n = 0;
    for (; !(n % IPS === 0 && (await fini(page))); n++) {
      if (n > 15 * 60 * IPS) throw new Error("vidéo de plus de quinze minutes : imposer une vitesse plus grande");
      await page.clock.runFor(pas(n));
      await ecrire(await image());
    }
    for (let k = 0; k < IPS; k++, n++) { await page.clock.runFor(pas(n)); await ecrire(await image()); }
    const derniere = await image();
    for (let k = 0; k < 6 * IPS; k++) await ecrire(derniere);
    ff.stdin.end();
    await termine;
    bilan = `${fichier}.mp4, ${((n + 8 * IPS) / IPS).toFixed(0)} s`;
  }
  console.log(`${bilan} (essai de ${(T0 / 1000).toFixed(0)} s à ×${v0}, filmé à ×${v}`
    + `${classes.length ? ` ; retiré : ${classes.join(", ")}` : ""}${deborde ? " ; DÉBORDE ENCORE" : ""})`);
  for (const p of pbs) console.log("   ", p);
  await ctx.close();
}

mkdirSync(SORTIE, { recursive: true });
const { base, fermer } = await servir();
const nav = await chromium();
const p = await nav.newPage();
await p.goto(base + "cours.html", { waitUntil: "domcontentloaded" });
const tous = await p.$$eval(".banc[data-banc]", (els) => els.map((e) => e.dataset.banc));
await p.close();
const file = [];
for (const nom of positions.length ? positions : tous) file.push(...(await travaux(nav, base, nom)));
console.log(`${file.length} ${drap("--apercu") ? "aperçus" : "vidéos"} à produire dans ${SORTIE}`);
// Quelques enregistrements en parallèle : chacun a sa page et son ffmpeg.
const echecs = [];
await Promise.all(Array.from({ length: Number(opt("--paralleles", 3)) }, async () => {
  for (let t; (t = file.shift());) {
    try { await enregistrer(nav, base, t); } catch (e) { echecs.push(`${t.fichier} : ${e.message}`); }
  }
}));
await nav.close();
fermer();
for (const e of echecs) console.log("ÉCHEC", e);
process.exitCode = echecs.length ? 1 : 0;
