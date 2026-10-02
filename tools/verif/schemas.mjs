// Aperçu et contrôle des schémas du cours : rend chaque export `schema*` en PNG
// (à la taille de son cadre, ×1,6) et signale les libellés hors cadre ou qui se
// chevauchent (même contrôle que tests/schemas.test.mjs), puis ceux qui se
// posent sur un tracé et les traits de renvoi qui traversent un autre libellé
// (contrôles approchés, à confirmer sur l'image).
//   node tools/verif/schemas.mjs <dossier-sortie> [module.js…] [--seul schemaX]
// Sans module : src/schemas-cours.js, -identification, -laboratoire, -terrain.
// Exemple : node tools/verif/schemas.mjs docs/travail/schemas --seul schemaProctor
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, options, importer, RACINE } from "./commun.mjs";

const { opt, positions } = options(["--seul"]);
const seul = opt("--seul");
const [sortie, ...donnes] = positions;
if (!sortie) {
  console.error("usage : node tools/verif/schemas.mjs <dossier-sortie> [module.js…] [--seul schemaX]");
  process.exit(2);
}
const modules = donnes.length ? donnes.map((m) => resolve(m))
  : ["cours", "identification", "laboratoire", "terrain"].map((m) => resolve(RACINE, `src/schemas-${m}.js`));
mkdirSync(sortie, { recursive: true });
const { boiteTexte } = await importer("src/figures.js");

/** Libellés horizontaux et leur boîte (même approximation que le placeur d'étiquettes). */
function libelles(svg) {
  return [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"([^>]*)>([^<]*)<\/text>/g)]
    .filter(([, , , attrs]) => !/transform=/.test(attrs))
    .map(([, x, y, attrs, t]) => {
      const ancre = /text-anchor="(\w+)"/.exec(attrs)?.[1] ?? "start";
      const taille = Number(/font-size:([\d.]+)px/.exec(attrs)?.[1] ?? 12);
      const brut = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      return { t: brut, ...boiteTexte(+x, +y, [brut], { taille, ancre }) };
    });
}

/** Le segment (x1, y1)–(x2, y2) coupe-t-il le rectangle r ? (Liang–Barsky) */
function coupe(x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1, p = [-dx, dx, -dy, dy], q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

/**
 * Segments tracés : <path> faits de droites (M L H V Z, absolus ou relatifs) et
 * bords des <rect>, hors motifs (<defs>), hors groupes transformés et hors
 * traits de renvoi (gris #64748b de 0,9 px), qui touchent leur libellé par construction.
 */
function segments(svg) {
  const segs = [];
  for (const [el] of svg.matchAll(/<path [^>]*\/>/g)) {
    if (/stroke="#64748b" stroke-width="0.9"|stroke="none"|stroke-width="0"/.test(el)) continue;
    const d = /d="([^"]+)"/.exec(el)?.[1];
    if (!d || /[AaQqCcTtSs]/.test(d)) continue;
    let x = 0, y = 0, x0 = 0, y0 = 0;
    for (const [, c, args] of d.matchAll(/([MLHVZmlhvz])([^MLHVZmlhvz]*)/g)) {
      const n = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
      if (c === "M") { x = n[0]; y = n[1]; x0 = x; y0 = y; for (let i = 2; i + 1 < n.length; i += 2) { segs.push([x, y, n[i], n[i + 1]]); x = n[i]; y = n[i + 1]; } }
      else if (c === "L") for (let i = 0; i + 1 < n.length; i += 2) { segs.push([x, y, n[i], n[i + 1]]); x = n[i]; y = n[i + 1]; }
      else if (c === "l") for (let i = 0; i + 1 < n.length; i += 2) { segs.push([x, y, x + n[i], y + n[i + 1]]); x += n[i]; y += n[i + 1]; }
      else if (c === "H") { segs.push([x, y, n[0], y]); x = n[0]; } else if (c === "h") { segs.push([x, y, x + n[0], y]); x += n[0]; }
      else if (c === "V") { segs.push([x, y, x, n[0]]); y = n[0]; } else if (c === "v") { segs.push([x, y, x, y + n[0]]); y += n[0]; }
      else if (c === "Z" || c === "z") { segs.push([x, y, x0, y0]); x = x0; y = y0; }
    }
  }
  for (const [el] of svg.matchAll(/<rect [^>]*\/>/g)) {
    if (/stroke="none"|stroke-width="0"/.test(el) || !/stroke=/.test(el)) continue;
    const g = (k) => Number(new RegExp(`${k}="([\\d.-]+)"`).exec(el)?.[1] ?? 0);
    const x = g("x"), y = g("y"), w = g("width"), h = g("height");
    segs.push([x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]);
  }
  return segs;
}

function controler(svg) {
  const [, W, H] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg).map(Number);
  const bs = libelles(svg), pbs = [];
  for (const b of bs) if (!(b.x >= -0.5 && b.y >= -0.5 && b.x + b.w <= W + 0.5 && b.y + b.h <= H + 0.5)) pbs.push(`hors cadre « ${b.t} »`);
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], b = bs[j];
    const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (!(dx <= 1 || dy <= 1)) pbs.push(`« ${a.t} » chevauche « ${b.t} »`);
  }
  if (/NaN|undefined|Infinity/.test(svg)) pbs.push("valeur non numérique dans le tracé");
  // Libellé posé sur un tracé (boîte rétrécie de 1,5 px pour tolérer l'effleurement).
  const sansMotifs = svg.replace(/<defs>[\s\S]*?<\/defs>/g, "").replace(/<g transform[\s\S]*?<\/g>/g, "");
  const segs = segments(sansMotifs);
  for (const t of libelles(sansMotifs)) {
    const r = { x: t.x + 1.5, y: t.y + 1.5, w: t.w - 3, h: t.h - 3 };
    const s = segs.find((s) => coupe(...s, r));
    if (s) pbs.push(`« ${t.t} » sur un tracé [${s.map((v) => v.toFixed(0)).join(",")}]`);
  }
  // Trait de renvoi qui finit dans un libellé ou en traverse un autre que le sien.
  for (const [el] of sansMotifs.matchAll(/<path d="M[\d.-]+ [\d.-]+L[\d.-]+ [\d.-]+" stroke="#64748b" stroke-width="0.9"[^>]*\/>/g)) {
    const [, a, b, c, d] = /M([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)/.exec(el).map(Number);
    for (const r of bs) {
      const proche = c >= r.x - 6 && c <= r.x + r.w + 6 && d >= r.y - 6 && d <= r.y + r.h + 6;
      const dedans = c > r.x + 2 && c < r.x + r.w - 2 && d > r.y + 2 && d < r.y + r.h - 2;
      if (dedans) pbs.push(`renvoi qui finit dans « ${r.t} »`);
      else if (!proche && coupe(a, b, c, d, { x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 })) pbs.push(`renvoi qui traverse « ${r.t} »`);
    }
  }
  return { W, H, n: bs.length, pbs };
}

const nav = await chromium();
const page = await nav.newPage({ deviceScaleFactor: 1.6 });
let defauts = 0;
for (const m of modules) {
  const mod = await import(pathToFileURL(m).href + `?t=${Date.now()}`);
  for (const [nom, f] of Object.entries(mod).filter(([n, f]) => /^schema/.test(n) && typeof f === "function" && (!seul || n === seul))) {
    let svg;
    try { svg = f(); } catch (e) { console.log(`${nom} : ERREUR ${e.message}`); defauts++; continue; }
    const { W, H, n, pbs } = controler(svg);
    await page.setViewportSize({ width: W + 20, height: H + 20 });
    await page.setContent(`<!doctype html><html><body style="margin:10px;background:#fff"><div id="f" style="width:${W}px">${svg}</div></body></html>`);
    await page.locator("#f svg").screenshot({ path: `${sortie}/${nom}.png` });
    console.log(`${nom} (${W}×${H}, ${n} libellés) : ${pbs.length ? pbs.join(" ; ") : "rien à signaler"} → ${sortie}/${nom}.png`);
    defauts += pbs.length;
  }
}
await nav.close();
console.log(defauts ? `${defauts} point(s) à regarder sur les images` : "aucun défaut");
