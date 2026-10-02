// Schémas des engins et des appareils de contrôle en place (chapitres 7, 8 et
// 12) : classes de compacteurs, gammadensimètre, pénétromètre dynamique léger,
// essai de plaque, dynaplaque, épandage et malaxage d'un liant. Boîte à outils
// et règles communes : src/schemas-outils.js.

import { svg, ligne, cote, fleche, couche, largeurTexte, COULEURS } from "./figures.js";
import { etiq, etiqs, renvoi, rect, cercle, chemin, terrain, sol, tiges, bruit, ACIER, ACIER_FONCE, TRAIT, r1 } from "./schemas-outils.js";

// ───────────────────────────── Aides locales ─────────────────────────────

const JAUNE = "#fbbf24", JAUNE_SOMBRE = "#d97706", BORD = "#92400e", VITRE = "#bae6fd", PNEU = "#1f2937";
const ROUGE = COULEURS.effort, BLEU = COULEURS.bleu, VERT = "#15803d", ORANGE = "#ea580c";

/** Note en maigre (10,5 px par défaut), une ligne par élément. */
const note = (x, y, lignes, o = {}) => etiqs(x, y, [].concat(lignes), { taille: 10.5, gras: false, ...o });

/** Marqueur de flèche d'une couleur libre : le cadre n'en fournit que quatre. */
const marqueur = (id, nom, couleur) =>
  `<defs><marker id="${id}-${nom}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0l8 4-8 4z" fill="${couleur}"/></marker></defs>`;

/** Trait en pointillé d'une couleur donnée. */
const tirets = (x1, y1, x2, y2, couleur = COULEURS.discret, ep = 1, motif = "5 3") => ligne(x1, y1, x2, y2, couleur, ep, `stroke-dasharray="${motif}"`);

/**
 * Repère d'un engin dessiné en mètres : origine (x, yg) au sol, k px par
 * mètre, abscisses vers l'avant de l'engin, hauteurs comptées vers le haut.
 */
function repere(x, yg, k) {
  const X = (m) => x + m * k, Y = (h) => yg - h * k;
  return {
    X, Y, k,
    R: (x0, h0, x1, h1, fond, trait = BORD, ep = 1, rx = 0) => rect(X(x0), Y(h1), (x1 - x0) * k, (h1 - h0) * k, fond, trait, ep, rx ? `rx="${r1(rx * k)}"` : ""),
    C: (xc, hc, r, fond, trait = TRAIT, ep = 1) => cercle(X(xc), Y(hc), r * k, fond, trait, ep),
    P: (pts, fond, trait = BORD, ep = 1) => chemin(`M${pts.map(([a, b]) => `${r1(X(a))} ${r1(Y(b))}`).join("L")}Z`, fond, trait, ep),
  };
}

/** Engin retourné : il avance vers la gauche (miroir autour de l'abscisse x). */
const versGauche = (x, contenu) => `<g transform="translate(${r1(2 * x)} 0) scale(-1 1)">${contenu}</g>`;

/** Pneu d'engin vu de profil, centre à la hauteur r. */
const pneu = (p, xc, r, clair = false) => p.C(xc, r, r, clair ? "#475569" : PNEU, "#0f172a", 1) + p.C(xc, r, r * 0.42, "#cbd5e1", "#334155", 0.8);

/** Cylindre de compactage, lisse ou à pieds dameurs (hauteur des pieds hp), posé au sol. */
function cylindre(p, xc, R, hp = 0) {
  let s = p.C(xc, R + hp, R, ACIER, "#64748b", 1.2);
  if (!hp) return s;
  const cx = p.X(xc), cy = p.Y(R + hp), a0 = R * p.k, a1 = (R + hp) * p.k;
  const pt = (r, a) => `${r1(cx + r * Math.cos(a))} ${r1(cy + r * Math.sin(a))}`;
  for (let j = 0; j < 16; j++) {
    const a = (j * Math.PI) / 8 + 0.2;
    s += `<path d="M${pt(a0, a - 0.1)}L${pt(a1, a - 0.06)}L${pt(a1, a + 0.06)}L${pt(a0, a + 0.1)}Z" fill="${ACIER_FONCE}" stroke="#475569" stroke-width="0.6"/>`;
  }
  return s;
}

/** Cabine vitrée et son toit. */
const cabine = (p, x0, x1, h0, h1) => p.R(x0, h0, x1, h1, VITRE, "#334155", 1) + p.R(x0 - 0.15, h1, x1 + 0.15, h1 + 0.13, JAUNE);

// ─────────────────────────── Silhouettes d'engins ──────────────────────────

/** Compacteur vibrant monocylindre (cylindre lisse, ou à pieds dameurs), cylindre à l'avant en x. */
function vibrant(x, yg, k, pieds = false) {
  const p = repere(x, yg, k), R = pieds ? 0.66 : 0.75, hp = pieds ? 0.11 : 0, H = R + hp;
  let s = p.R(-3.4, 0.62, -1.1, 0.98, JAUNE_SOMBRE);
  s += p.R(-5.0, 0.95, -2.4, 2.0, JAUNE, BORD, 1, 0.1);
  s += p.R(-3.0, 2.0, -2.9, 2.32, "#334155", "#1e293b", 0.6);
  s += p.R(-2.45, 0.98, -1.2, 1.95, JAUNE);
  s += cabine(p, -2.35, -1.3, 1.95, 2.95);
  s += p.R(-1.35, 0.7, -0.75, 1.3, JAUNE_SOMBRE);
  s += p.R(-1.3, 1.1, -0.95, H + 1.02, JAUNE);
  s += pneu(p, -4.15, 0.75);
  s += cylindre(p, 0, R, hp);
  s += p.R(-1.05, H + 0.82, 0.95, H + 1.02, JAUNE);
  s += p.C(0, H, 0.3, JAUNE, BORD) + p.R(-0.3, H, 0.3, H + 0.82, JAUNE, "none", 0);
  s += ligne(p.X(-0.3), p.Y(H), p.X(-0.3), p.Y(H + 0.82), BORD, 1) + ligne(p.X(0.3), p.Y(H), p.X(0.3), p.Y(H + 0.82), BORD, 1);
  return s + p.C(0, H, 0.12, "#334155", "#1e293b", 0.8);
}

/** Compacteur à pneus : deux trains de roues décalées, caisson de lest ; roue avant en x. */
function aPneus(x, yg, k) {
  const p = repere(x, yg, k), r = 0.55;
  let s = pneu(p, 0.25, r, true) + pneu(p, -3.15, r, true);
  s += p.R(-4.15, 0.62, 0.8, 0.95, JAUNE_SOMBRE);
  s += p.R(-4.15, 0.95, 0.8, 1.85, JAUNE, BORD, 1, 0.08);
  s += cabine(p, -2.6, -1.35, 1.85, 2.95);
  return s + pneu(p, 0, r) + pneu(p, -3.4, r);
}

/** Compacteur statique à pieds dameurs, à lame : cylindre avant en x. */
function statiquePieds(x, yg, k) {
  const p = repere(x, yg, k), R = 0.72, hp = 0.13, H = R + hp;
  let s = p.R(0.35, 0.95, 0.8, 1.12, "#64748b", "#334155", 0.8);
  s += p.P([[0.68, 1.25], [1.2, 1.35], [1.3, 0.12], [1.08, 0.12]], "#94a3b8", "#334155");
  s += p.R(-4.5, 1.0, 0.7, 2.1, JAUNE, BORD, 1, 0.08);
  s += p.R(-4.5, 2.1, -2.8, 2.45, JAUNE);
  s += cabine(p, -2.6, -1.3, 2.1, 3.35);
  s += cylindre(p, -3.55, R, hp) + cylindre(p, 0, R, hp);
  return s + p.C(-3.55, H, 0.13, "#334155", "#1e293b", 0.8) + p.C(0, H, 0.13, "#334155", "#1e293b", 0.8);
}

/** Plaque vibrante guidée au timon : semelle centrée en x. */
function plaqueVibrante(x, yg, k) {
  const p = repere(x, yg, k);
  let s = ligne(p.X(-0.18), p.Y(0.5), p.X(-1.05), p.Y(0.98), "#334155", 2.4);
  s += p.R(-1.14, 0.93, -1.0, 1.04, "#1e293b", "#0f172a", 0.6);
  s += p.P([[-0.45, 0], [0.38, 0], [0.47, 0.09], [-0.45, 0.09]], "#64748b", "#1e293b");
  s += p.R(-0.32, 0.09, 0.3, 0.27, "#94a3b8", "#334155");
  return s + p.R(-0.24, 0.27, 0.22, 0.62, JAUNE, BORD, 1, 0.04);
}

// ─────────────────────────── Classes de compacteurs ─────────────────────────

/** Case d'une famille : fond, pastille du code et nom. */
function caseFamille(x, y, w, h, code, nom) {
  let s = rect(x, y, w, h, "#f8fafc", "#e2e8f0", 1, 'rx="8"');
  if (!code) return s;
  const lp = largeurTexte(code, 11) + 10;
  s += rect(x + 8, y + 6, lp, 16, COULEURS.gtr24, "none", 0, 'rx="4"');
  s += etiq(x + 8 + lp / 2, y + 18, code, { ancre: "middle", couleur: "#fff", halo: false });
  return s + etiq(x + 14 + lp, y + 18, nom);
}

const TEINTES = ["#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b"];

/**
 * Réglette des classes : un segment par classe (nom au-dessus), seuils sous
 * les traits ; ouverte, la dernière classe se prolonge d'une pointe ;
 * amplitudes : amplitude minimale de chaque classe (vibrants), sous la réglette.
 */
function reglette(x, y, pas, { seuils, classes, ouverte = false, unite = "", amplitudes = null }) {
  const n = classes.length, t0 = 5 - n;
  let s = "";
  classes.forEach((c, i) => {
    s += rect(x + i * pas, y, pas, 7, TEINTES[t0 + i], "#b45309", 0.8);
    s += etiq(x + (i + 0.5) * pas, y - 5, c, { ancre: "middle", taille: 10.5, couleur: BORD, halo: false });
  });
  const xf = x + n * pas;
  if (ouverte) s += chemin(`M${r1(xf)} ${r1(y - 2.5)}l9 6-9 6z`, TEINTES[4], "#b45309", 0.8);
  seuils.forEach((v, i) => {
    const xt = x + i * pas;
    s += ligne(xt, y - 2, xt, y + 10, "#78350f", 1);
    s += etiq(xt, y + 20, v, { ancre: "middle", taille: 10, gras: false, halo: false });
  });
  if (unite) {
    const xu = ouverte ? xf + 13 : xf + largeurTexte(seuils.at(-1), 10, false) / 2 + 5;
    s += etiq(xu, ouverte ? y + 8 : y + 20, unite, { taille: 10, gras: false, halo: false, couleur: COULEURS.discret });
  }
  if (amplitudes) {
    s += etiq(x - 6, y + 33, "A0 ≥", { ancre: "end", taille: 10, gras: false, halo: false });
    amplitudes.forEach((a, i) => { s += etiq(x + (i + 0.5) * pas, y + 33, a, { ancre: "middle", taille: 10, gras: false, halo: false }); });
  }
  return s;
}

/**
 * Les cinq familles de compacteurs du GTR (NF P98-736), en silhouettes de
 * profil à la même échelle (la plaque vibrante agrandie) : compacteur à pneus
 * P classé par la charge par roue CR ; vibrants à cylindre lisse V et à pieds
 * dameurs VP classés par (M1/L)·√A0 et par l'amplitude A0 ; statique à pieds
 * dameurs SP classé par M1/L ; plaque vibrante PQ classée par Mg/S. Sous
 * chaque engin, la réglette de ses classes et leurs seuils.
 */
export function schemaCompacteurs({ largeur = 640, hauteur = 380 } = {}) {
  return svg({
    largeur, hauteur, titre: "Familles et classes de compacteurs", contenu: (id) => {
      const K = 20, W = 206, H = 182, X0 = [4, 217, 430], Y0 = [4, 194];
      const solSous = (x0, yg) => couche(id, { x: x0 + 8, y: yg, w: W - 16, h: 6, sol: "remblai" }) + ligne(x0 + 8, yg, x0 + W - 8, yg, COULEURS.trait, 1.2);
      const charge = (x, y0, y1, nom, xl, yl) => fleche(id, x, y0, x, y1, { ep: 2 }) + etiq(xl, yl, nom, { couleur: ROUGE, taille: 11.5 });
      /** Vibration du cylindre (arcs à l'avant) et son amplitude A0. */
      const vibration = (xc, yc, r, x0, y0) => {
        let v = "";
        for (const dr of [4, 8]) v += chemin(`M${r1(xc + (r + dr) * Math.cos(-0.5))} ${r1(yc + (r + dr) * Math.sin(-0.5))}A${r + dr} ${r + dr} 0 0 1 ${r1(xc + (r + dr) * Math.cos(0.5))} ${r1(yc + (r + dr) * Math.sin(0.5))}`, "none", ROUGE, 1.3);
        return v + renvoi(xc + r + 9, yc - 6, x0 + 176, y0 + 66, "A0", { couleur: ROUGE, taille: 11.5 });
      };
      const V = ["V1", "V2", "V3", "V4", "V5"], SEUILS_V = ["15", "25", "40", "55", "70"], A0 = ["0,6", "0,8", "1,0", "1,3", "1,6"];
      let s = "";

      // P : compacteur à pneus.
      let x0 = X0[0], y0 = Y0[0], yg = y0 + 100;
      s += caseFamille(x0, y0, W, H, "P", "compacteur à pneus") + solSous(x0, yg) + aPneus(x0 + 128, yg, K);
      s += charge(x0 + 128, y0 + 30, y0 + 60, "CR", x0 + 135, y0 + 44);
      s += note(x0 + 10, y0 + 121, "critère : charge par roue CR");
      s += reglette(x0 + 36, y0 + 145, 46, { seuils: ["25", "40", "60"], classes: ["P1", "P2", "P3"], ouverte: true, unite: "kN" });

      // V : vibrant à cylindre lisse.
      x0 = X0[1]; yg = y0 + 100;
      s += caseFamille(x0, y0, W, H, "V", "vibrant à cylindre lisse") + solSous(x0, yg) + vibrant(x0 + 132, yg, K);
      s += charge(x0 + 132, y0 + 30, y0 + 61, "M1", x0 + 139, y0 + 44);
      s += vibration(x0 + 132, yg - 15, 15, x0, y0);
      s += note(x0 + 10, y0 + 121, "critère : (M1/L)·√A0 et A0 (mm)");
      s += reglette(x0 + 44, y0 + 140, 29, { seuils: SEUILS_V, classes: V, ouverte: true, amplitudes: A0 });

      // VP : vibrant à pieds dameurs.
      x0 = X0[2];
      s += caseFamille(x0, y0, W, H, "VP", "vibrant à pieds dameurs") + solSous(x0, yg) + vibrant(x0 + 132, yg, K, true);
      s += charge(x0 + 132, y0 + 30, y0 + 61, "M1", x0 + 139, y0 + 44);
      s += vibration(x0 + 132, yg - 15.4, 15.4, x0, y0);
      s += note(x0 + 10, y0 + 121, "mêmes critères et seuils que V");
      s += reglette(x0 + 44, y0 + 140, 29, { seuils: SEUILS_V, classes: V.map((c) => `VP${c.slice(1)}`), ouverte: true, amplitudes: A0 });

      // SP : statique à pieds dameurs.
      x0 = X0[0]; y0 = Y0[1]; yg = y0 + 100;
      s += caseFamille(x0, y0, W, H, "SP", "statique à pieds dameurs") + solSous(x0, yg) + statiquePieds(x0 + 124, yg, K);
      s += charge(x0 + 124, y0 + 28, y0 + 55, "M1", x0 + 131, y0 + 40);
      s += note(x0 + 10, y0 + 121, "critère : M1/L (kg/cm)");
      s += reglette(x0 + 36, y0 + 145, 58, { seuils: ["30", "60", "90"], classes: ["SP1", "SP2"], unite: "kg/cm" });

      // PQ : plaque vibrante (agrandie).
      x0 = X0[1];
      s += caseFamille(x0, y0, W, H, "PQ", "plaque vibrante") + solSous(x0, yg) + plaqueVibrante(x0 + 124, yg, 2.5 * K);
      s += charge(x0 + 124, y0 + 34, y0 + 66, "Mg", x0 + 131, y0 + 48);
      s += renvoi(x0 + 140, yg - 3, x0 + 160, yg - 14, "S", { couleur: COULEURS.cote, taille: 11.5 });
      s += note(x0 + 10, y0 + 121, "critère : pression statique Mg/S");
      s += reglette(x0 + 36, y0 + 145, 58, { seuils: ["10", "15"], classes: ["PQ3", "PQ4"], ouverte: true, unite: "kPa" });

      // Les grandeurs : cylindre vu de face, définitions, règle des vibrants, échelle.
      x0 = X0[2];
      s += caseFamille(x0, y0, W, H);
      const xc = x0 + 38, yb = y0 + 92, Lp = 2.13 * K, Dp = 1.5 * K;
      s += etiq(x0 + 10, y0 + 18, "cylindre vu de face", { taille: 10.5 });
      s += rect(xc - Lp / 2 - 5, yb - Dp - 12, Lp + 10, 5, JAUNE, BORD, 1);
      s += rect(xc - Lp / 2 - 5, yb - Dp - 7, 4, Dp / 2 + 7, JAUNE, BORD, 1) + rect(xc + Lp / 2 + 1, yb - Dp - 7, 4, Dp / 2 + 7, JAUNE, BORD, 1);
      s += rect(xc - Lp / 2, yb - Dp, Lp, Dp, ACIER, "#64748b", 1.2, 'rx="3"');
      s += ligne(x0 + 8, yb, x0 + 72, yb, COULEURS.trait, 1.2);
      s += fleche(id, xc, y0 + 26, xc, yb - Dp - 14, { ep: 2 }) + etiq(xc + 6, y0 + 36, "M1", { couleur: ROUGE, taille: 11.5 });
      s += cote(id, xc - Lp / 2, yb + 8, xc + Lp / 2, yb + 8, "");
      s += etiq(xc, yb + 22, "L", { ancre: "middle", couleur: COULEURS.cote, taille: 11.5 });
      s += note(x0 + 82, y0 + 40, ["M1 : masse sur le", "cylindre (kg)", "L : génératrice (cm)", "A0 : amplitude", "théorique à vide (mm)"], { taille: 10 });
      s += note(x0 + 10, y0 + 132, ["V, VP : la classe retenue est la plus", "faible des deux, par (M1/L)·√A0", "et par l'amplitude A0"], { taille: 10 });
      s += ligne(x0 + 12, y0 + 172, x0 + 12 + 2 * K, y0 + 172, COULEURS.encre, 1.6) + ligne(x0 + 12, y0 + 168, x0 + 12, y0 + 176, COULEURS.encre, 1.2) + ligne(x0 + 12 + 2 * K, y0 + 168, x0 + 12 + 2 * K, y0 + 176, COULEURS.encre, 1.2);
      s += note(x0 + 60, y0 + 176, "2 m (plaque PQ : ×2,5)", { taille: 10 });
      return s;
    },
  });
}

// ─────────────────────────────── Gammadensimètre ──────────────────────────

/**
 * Gammadensimètre à pointe en transmission directe (NF P94-061-1), en coupe :
 * l'appareil posé sur la couche, la tige-source descendue dans l'avant-trou
 * jusqu'à la profondeur z, la source gamma à sa pointe et les détecteurs dans
 * le socle ; les photons comptés ont traversé le sol entre la source et la
 * surface, d'où la masse volumique humide moyenne de 0 à z ; la source à
 * neutrons du socle donne la teneur en eau. À droite, deux mesures à e − 8 cm
 * et à e isolent par différence la densité du fond de couche.
 */
export function schemaGammadensimetre({ largeur = 620, hauteur = 350 } = {}) {
  return svg({
    largeur, hauteur, titre: "Gammadensimètre en transmission directe", contenu: (id) => {
      const k = 360, YS = 196, e = 0.3, z = 0.2, YF = YS + e * k, XH = 120, YZ = YS + z * k, YFC = YS + (e - 0.08) * k;
      let s = marqueur(id, "fo", ORANGE);
      // Couche contrôlée, son fond (8 cm), couche précédente.
      s += terrain(id, 10, 350, [{ y0: YS, y1: YF, sol: "limon" }, { y0: YF, y1: hauteur - 8, sol: "remblai" }]);
      s += rect(10, YFC, 350, YF - YFC, "rgba(245,158,11,0.2)", "none", 0);
      s += tirets(10, YFC, 360, YFC, "#b45309", 1, "4 3") + tirets(10, YF, 360, YF, "#475569", 1.2, "6 3");
      s += sol(10, 360, YS);
      // Volume traversé par les photons comptés.
      const xd = XH + 0.23 * k;
      s += chemin(`M${XH + 6} ${YS}L${XH + 6} ${r1(YZ)}L${r1(xd + 16)} ${YS}Z`, "rgba(234,88,12,0.13)", "none", 0);
      // Avant-trou, tige-source et source.
      s += rect(XH - 6, YS, 12, (z + 0.05) * k, "#f8fafc", "#64748b", 0.8);
      s += tiges(XH, YS - 2, YZ - 7, 6);
      s += rect(XH - 4.5, YZ - 9, 9, 11, ROUGE, "#7f1d1d", 1, 'rx="2"');
      // Appareil : guide cranté, poignée, socle (écran, source à neutrons, détecteurs).
      const corps = 0.12 * k, haut = YS - corps, tour = 0.32 * k, yPoig = haut - tour - 7 + z * k;
      s += rect(XH - 0.045 * k, haut - tour, 0.09 * k, tour, "#fde047", "#854d0e", 1.2);
      for (let j = 1; j <= 6; j++) s += ligne(XH + 0.045 * k - 6, haut - tour + j * 0.05 * k, XH + 0.045 * k, haut - tour + j * 0.05 * k, "#854d0e", 1);
      s += rect(XH - 18, yPoig, 36, 7, "#334155", "#0f172a", 1, 'rx="3"');
      s += rect(XH - 0.07 * k, haut, 0.44 * k, corps, "#facc15", "#854d0e", 1.4, 'rx="4"');
      s += rect(XH + 0.24 * k, haut + 7, 0.1 * k, 13, "#0f172a", "#0f172a", 1, 'rx="2"');
      s += cercle(XH + 0.11 * k, YS - 6, 3.5, BLEU, "#1e3a8a", 0.8) + rect(XH + 0.135 * k, YS - 9, 9, 6, "#93c5fd", "#1e3a8a", 0.8, 'rx="2"');
      for (const dx of [0.19, 0.235]) s += rect(XH + dx * k, YS - 10, 13, 7, "#94a3b8", "#334155", 0.9, 'rx="3"');
      // Rayons gamma : de la source aux détecteurs.
      for (const dx of [-8, 2, 12]) s += ligne(XH + 4, YZ - 5, xd + dx, YS - 4, ORANGE, 1.3, `stroke-dasharray="5 3" marker-end="url(#${id}-fo)"`);
      // Cote de la profondeur de la source.
      s += cote(id, 17, YS, 17, YZ, "") + etiq(22, YS + 40, "z", { couleur: COULEURS.cote, taille: 12 });
      // Renvois de l'appareil.
      s += renvoi(XH + 0.045 * k, 62, 156, 58, ["guide cranté :", "positions de la source"]);
      s += renvoi(XH + 18, yPoig + 3, 156, yPoig + 8, ["poignée de la", "tige-source"]);
      s += renvoi(XH + 0.11 * k, YS - 6, 88, 168, ["neutrons :", "teneur en eau"], { ancre: "end" });
      s += renvoi(XH + 0.21 * k, YS - 6, 266, 168, ["détecteurs gamma", "dans le socle"]);
      s += renvoi(XH - 3, YS + 14, 104, 210, "tige-source", { ancre: "end" });
      s += renvoi(XH - 4, YZ - 4, 104, YZ - 14, ["source gamma", "(césium 137)"], { ancre: "end" });
      s += renvoi(XH - 6, YS + (z + 0.04) * k, 104, YS + (z + 0.04) * k + 14, "avant-trou", { ancre: "end" });
      s += renvoi(XH + 34, YS + 40, 230, 236, ["rayons gamma comptés :", "ρh moyenne de 0 à z"]);
      s += etiq(354, YS + 16, "couche contrôlée, e = 30 cm", { ancre: "end", taille: 10.5 });
      s += etiq(354, YFC + 17, "fond de couche : 8 cm", { ancre: "end", taille: 10.5, couleur: "#92400e" });
      s += etiq(354, YF + 18, "couche précédente", { ancre: "end", taille: 10.5 });

      // À droite : la mesure et le fond de couche.
      const xr = 380;
      s += etiq(xr, 30, "ρd = ρh / (1 + w)", { taille: 12.5, couleur: BLEU });
      s += note(xr, 48, ["ρh : masse volumique humide moyenne", "entre la surface et la source", "w : neutrons ou prélèvement"]);
      s += etiq(xr, 104, "Deux profondeurs, une tranche", { taille: 11 });
      s += etiq(xr, 124, "ρ fond = (z2 ρ2 − z1 ρ1) / (z2 − z1)", { taille: 12, couleur: BLEU });
      s += note(xr, 142, ["ρ1, ρ2 : moyennes mesurées de 0 à z1", "et de 0 à z2, avec z1 = e − 8 cm et z2 = e"]);
      const z1 = e - 0.08, cols = [
        { x: 384, a: 0, b: e, src: e, nom: ["z2 · ρ2"] },
        { x: 446, a: 0, b: z1, src: z1, nom: ["z1 · ρ1"] },
        { x: 508, a: z1, b: e, src: null, nom: ["(z2 − z1)", "· ρ fond"] },
      ];
      for (const c of cols) {
        s += couche(id, { x: c.x, y: YS, w: 30, h: e * k, sol: "limon" });
        s += rect(c.x, YS + c.a * k, 30, (c.b - c.a) * k, "rgba(234,88,12,0.28)", "none", 0);
        s += rect(c.x, YS, 30, e * k, "none", "#475569", 1);
        if (c.src !== null) s += ligne(c.x + 15, YS - 12, c.x + 15, YS + c.src * k - 5, "#64748b", 2.2) + cercle(c.x + 15, YS + c.src * k - 4, 3.6, ROUGE, "#7f1d1d", 0.8);
        s += etiqs(c.x + 15, YF + 16, c.nom, { ancre: "middle", taille: 10.5 });
      }
      s += etiq(430, YS + 60, "−", { ancre: "middle", taille: 16 }) + etiq(492, YS + 60, "=", { ancre: "middle", taille: 16 });
      s += tirets(380, YS + z1 * k, 546, YS + z1 * k, "#b45309", 1, "3 3");
      s += etiq(550, YS + z1 * k + 4, "z1", { taille: 10.5, couleur: COULEURS.cote }) + etiq(550, YF + 4, "z2 = e", { taille: 10.5, couleur: COULEURS.cote });
      return s;
    },
  });
}

// ─────────────────────── Pénétromètre dynamique léger ──────────────────────

/**
 * Pénétromètre dynamique léger à énergie variable (Panda ; NF P94-105, ex-XP P94-105) : le
 * marteau frappé à la main sur la tête de battage instrumentée, qui mesure la
 * vitesse d'impact, le train de tiges et la pointe conique, le capteur
 * d'enfoncement et le boîtier d'acquisition. À droite, sur le même axe des
 * profondeurs, le pénétrogramme qd(z) — un qd par coup, par la formule des
 * Hollandais — face à la droite de référence et à la droite limite du
 * matériau : ici le fond de couche passe sous la droite limite.
 */
export function schemaPenetrometre({ largeur = 620, hauteur = 370 } = {}) {
  return svg({
    largeur, hauteur, titre: "Pénétromètre dynamique léger à énergie variable", contenu: (id) => {
      const yS = 196, kz = 275, e = 0.35, zMax = 0.6, Y = (z) => yS + z * kz, xr = 170, zP = 0.5, yT = 77;
      let s = terrain(id, 10, 290, [{ y0: yS, y1: Y(e), sol: "limon" }, { y0: Y(e), y1: Y(zMax), sol: "remblai" }]);
      s += tirets(10, Y(e), 300, Y(e), "#475569", 1.1, "6 3") + sol(10, 300, yS);
      s += etiq(18, yS + 16, "couche contrôlée", { taille: 10.5 }) + etiq(18, Y(e) + 16, "couche inférieure", { taille: 10.5 });
      // Tiges, pointe conique, tête de battage, marteau.
      s += tiges(xr, yT + 18, Y(zP) - 10, 6);
      s += chemin(`M${xr - 5} ${r1(Y(zP) - 10)}h10l-5 10z`, "#475569", "#1e293b", 1);
      s += rect(xr - 12, yT, 24, 18, "#f97316", "#7c2d12", 1.2, 'rx="2"');
      // Marteau, à l'instant de frapper : manche tenu à droite, tête au-dessus de la tête de battage.
      s += ligne(xr + 8, yT - 23, xr + 96, yT - 52, "#92400e", 3.2);
      s += `<g transform="translate(${xr + 1} ${yT - 21}) rotate(-18)"><rect x="-8" y="-12" width="16" height="24" rx="2" fill="#475569" stroke="#0f172a" stroke-width="1"/></g>`;
      s += chemin(`M${xr + 46} ${yT - 70}Q${xr + 16} ${yT - 70} ${xr + 9} ${yT - 42}`, "none", ROUGE, 2, `marker-end="url(#${id}-fl)"`);
      // Capteur d'enfoncement posé au sol et son ruban.
      s += rect(xr + 24, yS - 14, 30, 14, "#e2e8f0", "#475569", 1, 'rx="3"') + ligne(xr + 30, yS - 14, xr + 12, yT + 10, BLEU, 1.2);
      // Boîtier d'acquisition, câble vers la tête.
      s += chemin(`M84 92C120 92 128 86 ${xr - 12} 86`, "none", "#334155", 1.4);
      s += rect(18, 70, 66, 46, "#e2e8f0", TRAIT, 1.3, 'rx="6"') + rect(24, 76, 54, 24, "#0f172a", "#0f172a", 1, 'rx="2"');
      let ecranQ = "";
      for (let i = 0; i < 9; i++) ecranQ += ligne(27 + i * 5.6, 97, 27 + i * 5.6, 97 - 4 - 12 * (0.5 + 0.5 * Math.sin(1.7 * i + 0.6)), "#67e8f9", 2.2);
      s += ecranQ;
      // Renvois de l'appareil.
      s += renvoi(xr - 7, yT - 26, 140, yT - 40, ["marteau", "(masse M)"], { ancre: "end" });
      s += renvoi(xr + 12, yT + 5, 206, 106, ["tête de battage", "instrumentée :", "vitesse d'impact V"]);
      s += note(18, 132, ["boîtier d'acquisition :", "qd coup par coup"], { gras: true });
      s += renvoi(xr + 54, yS - 8, 232, 166, ["capteur", "d'enfoncement"]);
      s += renvoi(xr + 3, Y(0.16), xr + 30, Y(0.16) + 4, "train de tiges");
      s += renvoi(xr + 4, Y(zP) - 5, xr + 30, Y(zP) - 1, ["pointe conique,", "section A"]);

      // Formule.
      const xf = 336;
      s += etiq(xf, 28, "qd = (1/A) · ½ M V² · M/(M + P) / e", { taille: 12.5, couleur: BLEU });
      s += note(xf, 46, ["formule des Hollandais, un qd par coup :", "½ M V² : énergie du coup, V mesurée par la tête", "M : marteau · P : tête, tiges et pointe frappées", "A : section de la pointe · e : enfoncement du coup"]);

      // Pénétrogramme sur le même axe des profondeurs.
      // Modèle illustratif du banc : qd ∝ (taux de compactage)¹², confinement croissant jusqu'à 0,30 m ;
      // couche de limon de 0,35 m dont le fond est mal compacté, sur un remblai compacté.
      const x0 = 352, x1 = 600, qMax = 12, X = (q) => x0 + (q / qMax) * (x1 - x0);
      const Q = 10, zc = 0.3, conf = (zz) => 0.45 + 0.55 * Math.min(1, zz / zc);
      const ref = (zz) => Q * conf(zz) * 0.95 ** 12, lim = (zz) => Q * conf(zz) * 0.92 ** 12;
      const taux = (zz) => (zz < 0.15 ? 98 : 98 - 9 * ((zz - 0.15) / 0.2) ** 1.4);
      const qdVrai = (zz) => (zz < e ? Q * conf(zz) * (taux(zz) / 100) ** 12 : 8);
      s += rect(x0, yS, x1 - x0, Y(zMax) - yS, "#fff", "none", 0);
      const zA = 0.3;
      for (const q of [4, 8]) s += ligne(X(q), yS, X(q), Y(zA), COULEURS.grille, 1) + ligne(X(q), Y(e), X(q), Y(zMax), COULEURS.grille, 1);
      for (let zz = 0.1; zz < zMax; zz += 0.1) s += ligne(x0, Y(zz), x1, Y(zz), COULEURS.grille, 1);
      s += rect(x0, Y(zA), x1 - x0, Y(e) - Y(zA), "rgba(220,38,38,0.13)", "none", 0);
      s += tirets(x0, Y(e), x1, Y(e), "#475569", 1.1, "2 3");
      const droite = (f) => `M${r1(X(f(0)))} ${yS}L${r1(X(f(zc)))} ${r1(Y(zc))}L${r1(X(f(zc)))} ${r1(Y(e))}`;
      s += chemin(droite(ref), "none", VERT, 2, 'stroke-dasharray="7 4"') + chemin(droite(lim), "none", ROUGE, 2, 'stroke-dasharray="7 4"');
      // Un palier par coup : l'enfoncement suit l'énergie du coup et la résistance du sol.
      let d = "", zz = 0;
      for (let i = 0; zz < zMax - 0.004; i++) {
        const q = Math.min(qMax - 0.3, qdVrai(zz + 0.003) * (1 + 0.14 * bruit(5.1 * zz + 0.37 * i)));
        const dz = Math.min(0.012, (0.034 / q) * (1 + 0.3 * bruit(1.9 * i + 0.5)));
        const z2 = Math.min(zMax, zz + dz);
        d += `${i ? "L" : "M"}${r1(X(q))} ${r1(Y(zz))}L${r1(X(q))} ${r1(Y(z2))}`;
        zz = z2;
      }
      s += chemin(d, "none", BLEU, 1.4);
      s += rect(x0, yS, x1 - x0, Y(zMax) - yS, "none", COULEURS.trait, 1);
      for (const q of [0, 4, 8, 12]) s += etiq(X(q), yS - 6, String(q), { ancre: "middle", taille: 10, gras: false, halo: false, couleur: COULEURS.discret });
      for (let i = 0; i <= 6; i++) s += etiq(x0 - 5, Y(i / 10) + 4, i ? `0,${i}` : "0", { ancre: "end", taille: 10, gras: false, halo: false, couleur: COULEURS.discret });
      s += etiq(x0 + (x1 - x0) / 2, yS - 20, "résistance de pointe qd (MPa)", { ancre: "middle", taille: 10.5 });
      s += etiq(x0 - 5, yS - 20, "z (m)", { ancre: "end", taille: 10, gras: false, halo: false, couleur: COULEURS.discret });
      s += etiq(x1 - 4, Y(zA) + 11, "fond mal compacté", { ancre: "end", taille: 10, couleur: COULEURS.rouge });
      // Légende.
      const lg = (y, couleur, tir, texteL) => ligne(xf, y - 4, xf + 22, y - 4, couleur, 2, tir ? `stroke-dasharray="${tir}"` : "") + note(xf + 28, y, texteL);
      s += lg(118, BLEU, "", "pénétrogramme : qd de chaque coup");
      s += lg(134, VERT, "7 4", "droite de référence : objectif q4 ou q3");
      s += lg(150, ROUGE, "7 4", "droite limite : en deçà, compactage refusé");
      return s;
    },
  });
}

// ─────────────────────────────── Essai de plaque ──────────────────────────

/**
 * Essai de plaque statique (NF P94-117-1) : sous un camion lesté dont
 * l'essieu arrière fournit la réaction, le vérin charge une plaque rigide de
 * 600 mm ; une poutre de référence de type Benkelman, appuyée loin de la
 * plaque, porte le palpeur posé au centre de la plaque et le comparateur.
 * Deux cycles de chargement (0,25 puis 0,20 MPa) donnent EV1 et EV2 par
 * EV = 1,5 q a / z, et leur rapport k = EV2/EV1.
 */
export function schemaPlaque({ largeur = 640, hauteur = 350 } = {}) {
  return svg({
    largeur, hauteur, titre: "Essai de plaque statique", contenu: (id) => {
      const yS = 276, xp = 300, yb = 262;
      let s = terrain(id, 10, largeur - 20, [{ y0: yS, y1: hauteur - 8, sol: "forme" }]);
      s += sol(10, largeur - 10, yS);
      // Arrière du camion lesté (coupé à gauche) : lest, châssis, essieux arrière.
      s += chemin("M10 104H380V168H10", "#f1f5f9", TRAIT, 1.2) + chemin("M10 168H392V182H10", "#e2e8f0", TRAIT, 1.2);
      s += etiqs(196, 132, ["camion lesté :", "l'essieu arrière fait la réaction"], { ancre: "middle", taille: 11 });
      for (const x of [118, 176]) s += ligne(x, 182, x, 250, TRAIT, 3) + cercle(x, yS - 26, 26, "#334155", "#0f172a", 1) + cercle(x, yS - 26, 10, "#cbd5e1", "#0f172a", 0.8);
      // Poutre de référence de type Benkelman : bras palpeur, pivot, bâti sur ses appuis, comparateur.
      s += ligne(xp, yb, 600, yb, "#57534e", 2.6) + ligne(xp, yb, xp, yS - 9, "#57534e", 2);
      s += rect(456, 244, 160, 7, "#a8a29e", "#57534e", 1);
      s += ligne(466, 251, 458, yS, "#57534e", 2.2) + ligne(478, 251, 486, yS, "#57534e", 2.2) + ligne(608, 251, 608, yS, "#57534e", 2.2);
      s += ligne(472, 251, 472, yb - 3, "#57534e", 1.6) + cercle(472, yb, 3.2, "#fff", "#57534e", 1.2);
      s += ligne(585, 236, 585, yb - 1, TRAIT, 1.3) + cercle(585, 226, 10, "#fff", TRAIT, 1.4) + ligne(585, 226, 590, 219, ROUGE, 1.5) + cercle(585, 226, 1.6, TRAIT, TRAIT, 0.5);
      // Vérin sur sa cale, manomètre, rotule, pied à fenêtre (le bras y passe), plaque.
      s += rect(xp - 6, 182, 12, 14, ACIER_FONCE, TRAIT, 1);
      s += rect(xp - 16, 196, 32, 40, "#fde68a", "#92400e", 1.2, 'rx="3"');
      s += rect(xp - 5, 236, 10, 9, ACIER, TRAIT, 1) + cercle(xp, 248, 4, ACIER, TRAIT, 1);
      s += rect(xp - 16, 252, 32, 4, ACIER_FONCE, TRAIT, 0.9) + rect(xp - 16, 256, 8, 11, ACIER_FONCE, TRAIT, 0.9) + rect(xp + 8, 256, 8, 11, ACIER_FONCE, TRAIT, 0.9);
      s += rect(xp - 60, yS - 9, 120, 9, "#475569", "#1e293b", 1);
      s += ligne(xp + 16, 214, xp + 27, 214, TRAIT, 1.8) + cercle(xp + 36, 214, 9, "#fff", TRAIT, 1.4) + ligne(xp + 36, 214, xp + 41, 208, ROUGE, 1.5);
      // Pression sous la plaque.
      for (const dx of [-36, 0, 36]) s += fleche(id, xp + dx, yS + 3, xp + dx, yS + 21, { ep: 1.8 });
      s += etiq(xp + 46, yS + 19, "q", { couleur: ROUGE, taille: 12.5 });
      // Renvois.
      s += renvoi(xp + 44, 211, 396, 186, ["vérin et manomètre :", "pression q"]);
      s += renvoi(392, yb - 1, 396, 232, "palpeur au centre de la plaque");
      s += etiq(585, 206, "comparateur : z", { ancre: "middle", taille: 11 });
      s += renvoi(482, yS - 4, 420, 300, ["poutre de référence (type Benkelman),", "appuyée loin de la plaque"]);
      s += renvoi(xp - 54, yS - 4, 228, 300, ["plaque rigide", "Ø 600 mm"], { ancre: "end" });
      s += etiq(18, 330, "couche essayée : arase ou plateforme", { taille: 10.5 });
      s += note(largeur - 10, hauteur - 10, "échelle non respectée : appareillage agrandi", { ancre: "end", taille: 10 });
      // Formules.
      s += etiq(20, 28, "EV = 1,5 · q · a / z", { taille: 12.5, couleur: BLEU });
      s += note(20, 46, ["q : pression sous la plaque (MPa)", "a = 300 mm : rayon de la plaque", "z : enfoncement du centre (mm)"]);
      s += etiq(330, 28, "Deux cycles de chargement", { taille: 11 });
      s += note(330, 46, ["1er cycle jusqu'à 0,25 MPa : EV1 = 112,5 / z1", "2e cycle jusqu'à 0,20 MPa : EV2 = 90 / z2", "k = EV2 / EV1 : au-delà de 2 environ,", "le compactage est insuffisant"]);
      return s;
    },
  });
}

// ─────────────────────────────────── Dynaplaque ──────────────────────────

/**
 * La dynaplaque du cours (plaque dynamique légère) : une masse de 10 kg,
 * lâchée par le déclencheur, tombe de 0,72 m le long de la tige de guidage sur
 * l'amortisseur à tampons posé sur la plaque de 300 mm ; le capteur logé dans
 * la plaque mesure l'enfoncement élastique s, le boîtier en tire
 * Evd = 1,5 σ a / s = 22,5/s (σ = 0,1 MPa), moyenne des trois chutes de
 * mesure qui suivent trois chutes de mise en place. À droite, l'impulsion
 * d'une chute et l'enfoncement qu'elle produit.
 */
export function schemaDynaplaque({ largeur = 620, hauteur = 340 } = {}) {
  return svg({
    largeur, hauteur, titre: "Dynaplaque : module dynamique Evd", contenu: (id) => {
      const k = 200, yS = 292, xa = 150, yPl = yS - 6, yAm = yPl - 24, yAcc = yAm - 0.72 * k, yHaut = yS - 1.02 * k;
      let s = terrain(id, 10, 350, [{ y0: yS, y1: hauteur - 8, sol: "forme" }]);
      s += sol(10, 360, yS);
      // Plaque et capteur, amortisseur à tampons, tige de guidage.
      s += rect(xa - 30, yPl, 60, 6, "#64748b", "#1e293b", 1, 'rx="1.5"');
      s += rect(xa + 18, yPl - 6, 10, 6, "#0f172a", "#0f172a", 0.6, 'rx="1"');
      for (let j = 0; j < 3; j++) s += rect(xa - 7, yAm + j * 8 + 0.5, 14, 7, "#334155", "#1e293b", 0.6, 'rx="3"');
      s += tiges(xa, yHaut + 6, yAm, 4);
      // Poignée, déclencheur (boîtier et gâchette), masse accrochée ; la masse à l'impact, en pointillé.
      s += rect(xa - 16, yHaut, 32, 6, "#1e293b", "#0f172a", 1, 'rx="3"');
      s += rect(xa - 7, yHaut + 8, 14, 9, "#b45309", "#78350f", 0.9, 'rx="2"') + ligne(xa + 7, yHaut + 12, xa + 15, yHaut + 16, "#78350f", 2);
      s += rect(xa - 15, yAcc - 16, 30, 16, "#94a3b8", "#334155", 1.2, 'rx="2"') + rect(xa - 12, yAcc - 14, 4, 12, "#e2e8f0", "none", 0);
      s += rect(xa - 15, yAm - 16, 30, 16, "none", "#64748b", 1, 'rx="2" stroke-dasharray="3 2"');
      s += fleche(id, xa + 24, yAcc + 4, xa + 24, yAm - 22, { ep: 2 });
      s += cote(id, xa + 42, yAcc, xa + 42, yAm, "") + etiqs(xa + 48, (yAcc + yAm) / 2 - 2, ["chute", "0,72 m"], { couleur: COULEURS.cote });
      // Câble vers le boîtier de mesure.
      s += chemin(`M${xa + 28} ${yPl - 3}H300Q316 ${yPl - 3} 316 270V224`, "none", "#1e293b", 1.5);
      s += rect(236, 150, 100, 74, "#334155", "#0f172a", 1.2, 'rx="8"') + rect(244, 160, 84, 46, "#e7efe1", "#1e293b", 1, 'rx="3"');
      const tr = (f, a, b, n = 30) => Array.from({ length: n + 1 }, (_, i) => { const t = a + ((b - a) * i) / n; return `${i ? "L" : "M"}${r1(248 + t * 1.9)} ${r1(200 - f(t))}`; }).join("");
      s += chemin(tr((t) => (t < 17 ? 32 * Math.sin((Math.PI * t) / 17) : 0), 0, 40), "none", "#b91c1c", 1.3);
      s += chemin(tr((t) => (t > 0.7 && t < 20.2 ? 22 * Math.sin((Math.PI * (t - 0.7)) / 19.5) : 0), 0, 40), "none", BLEU, 1.5);
      // Renvois.
      s += renvoi(xa - 16, yHaut + 3, 118, yHaut + 2, ["poignée et", "déclencheur"], { ancre: "end" });
      s += renvoi(xa - 15, yAcc - 8, 118, yAcc - 2, "masse 10 kg", { ancre: "end" });
      s += renvoi(xa - 2, yAcc + 70, 118, yAcc + 74, ["tige de", "guidage"], { ancre: "end" });
      s += renvoi(xa - 7, yAm + 13, 118, yAm + 8, ["amortisseur", "à tampons"], { ancre: "end" });
      s += renvoi(xa + 23, yPl - 6, 210, yS - 30, ["capteur dans", "la plaque : s"]);
      s += cote(id, xa - 30, yS + 14, xa + 30, yS + 14, "") + etiq(xa, yS + 30, "plaque Ø 300 mm", { ancre: "middle", taille: 10.5 });
      s += etiqs(236, 140, ["boîtier de mesure"], { taille: 10.5 });
      // Formule et protocole.
      const xf = 372;
      s += etiq(xf, 30, "Evd = 1,5 · σ · a / s = 22,5 / s", { taille: 12.5, couleur: BLEU });
      s += note(xf, 48, ["σ = 0,1 MPa sous la plaque · a = 150 mm", "s : enfoncement élastique (mm),", "moyenne des 3 chutes de mesure", "qui suivent 3 chutes de mise en place", "Evd (MPa) se relie à EV2 par une", "planche d'étalonnage du matériau"]);
      // Une chute : impulsion et enfoncement.
      const g0 = 386, g1 = 600, gy = 300, T = (t) => g0 + (t / 40) * (g1 - g0);
      s += etiq(xf, 168, "une chute, vue par le boîtier", { taille: 11 }) + note(xf, 183, "σ et s à des échelles différentes", { taille: 10 });
      s += ligne(g0, gy, g1, gy, COULEURS.trait, 1) + ligne(g0, 196, g0, gy, COULEURS.trait, 1);
      for (const t of [0, 10, 20, 30, 40]) s += ligne(T(t), gy, T(t), gy + 4, COULEURS.trait, 1) + etiq(T(t), gy + 15, String(t), { ancre: "middle", taille: 10, gras: false, halo: false, couleur: COULEURS.discret });
      s += etiq(g1, gy + 30, "temps (ms)", { ancre: "end", taille: 10, gras: false, halo: false, couleur: COULEURS.discret });
      const courbe = (f, couleur, ep) => chemin(Array.from({ length: 81 }, (_, i) => { const t = i / 2; return `${i ? "L" : "M"}${r1(T(t))} ${r1(gy - f(t))}`; }).join(""), "none", couleur, ep);
      s += courbe((t) => (t < 17 ? 86 * Math.sin((Math.PI * t) / 17) : 0), "#b91c1c", 2);
      s += courbe((t) => (t > 0.7 && t < 20.2 ? 58 * Math.sin((Math.PI * (t - 0.7)) / 19.5) : t >= 20.2 ? -5 * Math.sin((Math.PI * (t - 20.2)) / 7) * Math.exp(-(t - 20.2) / 6) : 0), BLEU, 2.2);
      s += etiq(T(9), gy - 92, "σ : 0,1 MPa au plus fort", { taille: 10.5, couleur: "#b91c1c" });
      s += etiq(T(21), gy - 46, "s : enfoncement", { taille: 10.5, couleur: BLEU });
      s += tirets(T(17), gy + 2, T(17), gy + 19, "#b91c1c", 1, "2 2") + etiq(T(17), gy + 30, "impulsion ≈ 17 ms", { ancre: "middle", taille: 10, gras: false, halo: false, couleur: "#b91c1c" });
      return s;
    },
  });
}

// ───────────────────────────── Traitement en place ─────────────────────────

/** Épandeur de chaux ou de liant porté sur camion : cabine à l'avant (x), trémie, doseur et rampe à l'arrière. */
function epandeur(x, yg, k) {
  const p = repere(x, yg, k);
  let s = p.R(-8.2, 0.75, 0, 1.15, "#64748b", "#334155");
  s += p.R(-2.1, 1.15, 0, 3.1, "#e2e8f0", "#475569", 1, 0.15) + p.R(-1.0, 2.0, -0.2, 2.85, VITRE, "#334155", 0.8);
  s += p.P([[-7.7, 3.7], [-2.4, 3.7], [-2.9, 1.55], [-7.2, 1.55]], "#f1f5f9", "#475569", 1.2);
  s += p.R(-7.9, 1.15, -7.1, 1.55, "#475569", "#1e293b");
  s += p.C(-7.5, 1.35, 0.17, "#94a3b8", "#1e293b", 0.8);
  s += pneu(p, -1.2, 0.5) + pneu(p, -5.4, 0.5) + pneu(p, -6.5, 0.5);
  return s;
}

/** Pulvimixeur : cabine haute, carter du rotor au milieu ; rotor dessiné à part. */
function pulvimixeur(x, yg, k) {
  const p = repere(x, yg, k);
  let s = p.R(-4.5, 0.9, 4.0, 2.2, JAUNE, BORD, 1, 0.1);
  s += cabine(p, -1.0, 1.0, 2.2, 3.6);
  s += p.R(-1.0, -0.05, 1.0, 0.9, "#475569", "#1e293b");
  s += pneu(p, -3.4, 0.65) + pneu(p, 3.0, 0.65);
  return s;
}

/**
 * Traitement d'un sol en place à la chaux ou au liant, d'amont en aval :
 * l'épandeur (trémie, doseur asservi à l'avancement) répand le produit au
 * dosage visé en kg/m², contrôlé par la bâche d'1 m² posée devant lui puis
 * pesée ; le pulvimixeur malaxe sur toute l'épaisseur e avec son rotor ; le
 * compacteur ferme la couche traitée, sur le sol en place.
 */
export function schemaEpandage({ largeur = 640, hauteur = 330 } = {}) {
  return svg({
    largeur, hauteur, titre: "Traitement en place : épandre, contrôler, malaxer, compacter", contenu: (id) => {
      const yS = 240, ep = 34, k = 20, xRotor = 390, xRampe = 252;
      let s = terrain(id, 10, largeur - 20, [{ y0: yS, y1: hauteur - 8, sol: "limon" }]);
      // Couche traitée (malaxée, puis compactée derrière le compacteur), chaux en surface devant le rotor.
      s += couche(id, { x: xRotor, y: yS, w: largeur - 10 - xRotor, h: ep, sol: "traite" });
      s += rect(520, yS, largeur - 10 - 520, ep, "rgba(71,85,105,0.12)", "none", 0);
      s += tirets(xRotor, yS + ep, largeur - 10, yS + ep, "#4d7c0f", 1.2, "6 3");
      s += rect(xRampe, yS - 3, xRotor - xRampe - 14, 3, "#fff", "#94a3b8", 0.6);
      s += sol(10, largeur - 10, yS);
      // Bâche d'1 m², devant l'épandeur.
      s += rect(34, yS - 2, k, 2.5, "#2563eb", "#1d4ed8", 0.8);
      // Engins, vers la gauche.
      s += versGauche(78, epandeur(78, yS, k));
      for (let j = 0; j < 8; j++) s += cercle(xRampe - 5 + (j % 4) * 3.5, yS - 18 + Math.floor(j / 4) * 7 + (j % 2) * 2, 1.3, "#fff", "#64748b", 0.5);
      s += versGauche(xRotor, pulvimixeur(xRotor, yS, k));
      // Rotor : ses dents descendent jusqu'au fond de la couche traitée.
      const yR = yS + ep - 17;
      s += cercle(xRotor, yR, 12, "#64748b", "#1e293b", 1.2);
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 4 + 0.3;
        s += ligne(xRotor + 12 * Math.cos(a), yR + 12 * Math.sin(a), xRotor + 17 * Math.cos(a + 0.35), yR + 17 * Math.sin(a + 0.35), "#1e293b", 2);
      }
      s += versGauche(512, vibrant(512, yS, k, true));
      // Peson et bâche pesée.
      const xb = 44;
      s += ligne(xb, 112, xb, 122, TRAIT, 1.4) + rect(xb - 16, 122, 32, 18, "#334155", "#0f172a", 1, 'rx="3"') + rect(xb - 12, 126, 24, 9, "#e7efe1", "none", 0);
      s += ligne(xb, 140, xb, 148, TRAIT, 1.2) + chemin(`M${xb - 13} 148h26l-5 16h-16z`, "#2563eb", "#1d4ed8", 1) + chemin(`M${xb - 10} 152h20l-3 9h-14z`, "#fff", "none", 0);
      s += ligne(xb, yS - 6, xb, 172, BLEU, 1.2, `stroke-dasharray="4 3" marker-end="url(#${id}-fb)"`);
      // Renvois et noms.
      s += renvoi(xb + 6, yS - 1, 76, yS + 22, ["bâche de 1 m², pesée", "après le passage"]);
      s += etiq(xb + 22, 135, "pesée : kg/m²", { taille: 10.5 });
      s += etiq(164, 152, "épandeur", { ancre: "middle", taille: 11.5 });
      s += etiqs(180, yS - 50, ["trémie :", "chaux ou liant"], { ancre: "middle", taille: 10.5 });
      s += renvoi(xRampe - 20, yS - 27, 262, 170, ["doseur asservi", "à l'avancement"]);
      s += renvoi(xRampe + 40, yS - 2, 256, yS + 22, ["produit épandu :", "q (kg/m²)"]);
      s += etiq(xRotor, 152, "pulvimixeur", { ancre: "middle", taille: 11.5 });
      s += renvoi(xRotor + 6, yS + ep - 4, 410, yS + 62, "rotor : malaxe sur toute l'épaisseur e");
      s += etiq(560, 162, "compacteur", { ancre: "middle", taille: 11.5 });
      s += cote(id, largeur - 16, yS, largeur - 16, yS + ep, "") + etiq(largeur - 22, yS + ep / 2 + 4, "e", { ancre: "end", couleur: COULEURS.cote, taille: 12 });
      s += etiq(18, yS + 62, "sol en place", { taille: 10.5 });
      s += etiq(largeur - 40, yS + 22, "couche traitée", { ancre: "end", taille: 10.5 });
      s += fleche(id, 330, 104, 250, 104, { type: "bleu", ep: 2 }) + etiq(338, 108, "sens d'avancement", { taille: 10.5, couleur: BLEU });
      // Formule.
      s += etiq(14, 28, "q (kg/m²) = dosage (%) / 100 × ρd (kg/m³) × e (m)", { taille: 12, couleur: BLEU });
      s += note(14, 46, ["exemple : 2,5 % × 1 750 kg/m³ × 0,35 m ≈ 15,3 kg/m² ; la bâche pesée donne le dosage réel"]);
      s += note(largeur - 14, 76, "épaisseurs exagérées, engins rapprochés", { ancre: "end", taille: 10 });
      return s;
    },
  });
}
