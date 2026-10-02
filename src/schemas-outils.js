// Boîte à outils des schémas d'appareils d'essai (src/schemas-identification.js,
// src/schemas-laboratoire.js, src/schemas-terrain.js), reprise du site des
// fondations. Mêmes règles que src/figures.js : aucun libellé ne se pose sur un
// tracé ni sur un autre libellé (tests/schemas.test.mjs le vérifie pour les
// libellés), les proportions des appareils sont respectées quand l'échelle le
// permet, exagérées et signalées sinon.

import { ligne, texte, couche, COULEURS } from "./figures.js";

export const ACIER = "#cbd5e1", ACIER_FONCE = "#94a3b8", TRAIT = COULEURS.betonTrait, EAU = COULEURS.eau;
export const VERRE = "rgba(186,230,253,0.35)", VERRE_TRAIT = "#7dd3fc";
export const r1 = (x) => x.toFixed(1);

/** Libellé simple ; `halo` le détache d'un fond chargé. */
export function etiq(x, y, s, { ancre = "start", taille = 11, gras = true, couleur = COULEURS.encre, halo = true, italique = false } = {}) {
  return texte(x, y, s, `text-anchor="${ancre}" ${halo ? 'class="halo"' : ""} style="font-size:${taille}px;font-weight:${gras ? 700 : 400};fill:${couleur}${italique ? ";font-style:italic" : ""}"`);
}
/** Libellé sur plusieurs lignes. */
export const etiqs = (x, y, lignes, o = {}) => lignes.map((l, i) => etiq(x, y + i * ((o.taille ?? 11) + 2), l, o)).join("");

/** Libellé relié à ce qu'il désigne par un trait fin terminé d'un point. */
export function renvoi(xa, ya, xt, yt, lignes, o = {}) {
  const { ancre = "start", taille = 11 } = o;
  const ls = Array.isArray(lignes) ? lignes : [lignes];
  const xl = ancre === "start" ? xt - 3 : ancre === "end" ? xt + 3 : xt;
  return ligne(xa, ya, xl, yt - taille * 0.35, COULEURS.discret, 0.9)
    + `<circle cx="${r1(xa)}" cy="${r1(ya)}" r="1.9" fill="${COULEURS.discret}"/>` + etiqs(xt, yt, ls, o);
}

export const rect = (x, y, w, h, fond, trait = TRAIT, ep = 1.2, attrs = "") =>
  `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${fond}" stroke="${trait}" stroke-width="${ep}" ${attrs}/>`;
export const cercle = (x, y, r, fond, trait = TRAIT, ep = 1.2) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${fond}" stroke="${trait}" stroke-width="${ep}"/>`;
export const chemin = (d, fond = "none", trait = TRAIT, ep = 1.2, attrs = "") => `<path d="${d}" fill="${fond}" stroke="${trait}" stroke-width="${ep}" ${attrs}/>`;

/** Couches horizontales empilées : [{ y0, y1, sol }] (clés de SOLS dans figures.js). */
export const terrain = (id, x, w, couches) => couches.map((c) => couche(id, { x, y: c.y0, w, h: c.y1 - c.y0, sol: c.sol })).join("");
/** Trait du terrain naturel ou de la surface d'une couche. */
export const sol = (x0, x1, y) => ligne(x0, y, x1, y, COULEURS.trait, 1.8);
/** Train de tiges. */
export const tiges = (xc, y0, y1, w = 7) => rect(xc - w / 2, y0, w, y1 - y0, ACIER, TRAIT, 1);
/** Niveau d'eau : tirets bleus et triangle. */
export const niveauEau = (x0, x1, y, triangle = true) => ligne(x0, y, x1, y, EAU, 1.3, 'stroke-dasharray="6 4"')
  + (triangle ? `<path d="M${r1(x1 - 16)} ${r1(y - 1)}l6-9h-12z" fill="${EAU}"/>` : "");
/** Petite roue. */
export const roue = (x, y, r = 11) => cercle(x, y, r, "#334155", "#0f172a", 1) + cercle(x, y, r * 0.42, "#cbd5e1", "#0f172a", 0.8);
/** Flèche courbe de rotation autour d'un axe vertical, vue de côté (marqueur rouge du cadre `id`). */
export const rotation = (id, xc, y, rx = 22, ry = 5) => chemin(`M${r1(xc - rx)} ${r1(y)}A${rx} ${ry} 0 1 0 ${r1(xc + rx)} ${r1(y - 1)}`, "none", COULEURS.effort, 1.8, `marker-end="url(#${id}-fl)"`);
/** Flèche courbe de rotation dans le plan du dessin (sens horaire si `horaire`). */
export function tour(id, xc, yc, r, a0 = -60, a1 = 200, horaire = true) {
  const p = (a) => [xc + r * Math.cos((a * Math.PI) / 180), yc + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const grand = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return chemin(`M${r1(x0)} ${r1(y0)}A${r1(r)} ${r1(r)} 0 ${grand} ${horaire ? 1 : 0} ${r1(x1)} ${r1(y1)}`, "none", COULEURS.effort, 1.8, `marker-end="url(#${id}-fl)"`);
}

/** Masse à main : manche de (x1, y1) à (x2, y2), tête perpendiculaire au manche en (x2, y2). */
export function masse(x1, y1, x2, y2) {
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return ligne(x1, y1, x2, y2, "#92400e", 2.4)
    + `<g transform="translate(${r1(x2)} ${r1(y2)}) rotate(${r1(a + 90)})"><rect x="-9" y="-5" width="18" height="10" rx="2" fill="#64748b" stroke="#1e293b" stroke-width="1"/></g>`;
}

/** Graduations d'un récipient : `n` traits sur la paroi gauche, de y0 (haut) à y1 (bas). */
export function graduations(x, y0, y1, n = 10, long = 7) {
  let s = "";
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    s += ligne(x, y, x + (i % 5 === 0 ? long : long * 0.55), y, COULEURS.discret, 0.8);
  }
  return s;
}

/** Grains : nuage déterministe de petits cercles dans un rectangle (taille moyenne `r`). */
export function grains(x, y, w, h, n, r = 2, couleur = "#a16207", graine = 1) {
  let s = "", g = graine;
  const alea = () => ((g = (g * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) s += `<circle cx="${r1(x + alea() * w)}" cy="${r1(y + alea() * h)}" r="${r1(r * (0.6 + 0.8 * alea()))}" fill="${couleur}" opacity="0.75"/>`;
  return s;
}

/** Bruit déterministe dans [−1, 1] : les diagrammes « enregistrés » ne sont pas des marches parfaites. */
export const bruit = (z) => 0.5 * Math.sin(12.9 * z) + 0.3 * Math.sin(31.7 * z + 1) + 0.2 * Math.sin(57.1 * z + 2);
