// Schémas des appareils de laboratoire des chapitres 3, 4 et 13 : Proctor,
// poinçonnement (IPI et CBR), Los Angeles, micro-Deval, fragmentabilité et
// dégradabilité, gonflement au gel. Boîte à outils et règles communes :
// src/schemas-outils.js.

import { svg, ligne, cote, fleche, COULEURS, fmt } from "./figures.js";
import { ACIER, ACIER_FONCE, TRAIT, r1, etiq, etiqs, renvoi, rect, cercle, chemin, tour } from "./schemas-outils.js";
import { MOULES, DAMES, energie, optimum, rhoDSaturation } from "./gtr/proctor.js";
import { REFERENCE_CBR } from "./gtr/portance.js";
import { penteGel } from "./gtr/traitement.js";

const SOMBRE = "#475569", NOIR = "#1e293b", BOIS = "#92400e";

// ───────────────────────────── Aides locales ─────────────────────────────

/** Bruit déterministe dans [−1, 1] : graine g, rang i. */
const alea = (g, i) => { const x = Math.sin(g * 12.9898 + i * 78.233 + 0.5) * 43758.5453; return 2 * (x - Math.floor(x)) - 1; };

/**
 * Moule cylindrique en coupe (diamètre D et hauteur H en mm, k px/mm), posé
 * sur son embase en yBas, rehausse éventuelle (mm). Les parois se dessinent
 * après le sol.
 */
function mouleCoupe(cx, yBas, k, { D = 100, H = 120, rehausse = 0, embase = 14, paroi = 9 } = {}) {
  const l = D * k, e = paroi * k, yFond = yBas - embase * k, yHaut = yFond - H * k, yReh = yHaut - rehausse * k;
  const x0 = cx - l / 2, x1 = cx + l / 2;
  const fond = rect(x0 - e - 8, yFond, l + 2 * e + 16, embase * k, ACIER_FONCE, NOIR, 1, 'rx="1.5"');
  let parois = rect(x0 - e, yHaut, e, H * k, ACIER, SOMBRE, 1) + rect(x1, yHaut, e, H * k, ACIER, SOMBRE, 1);
  if (rehausse) parois += rect(x0 - e - 1, yReh, e + 1, yHaut - yReh, "#e2e8f0", SOMBRE, 1) + rect(x1, yReh, e + 1, yHaut - yReh, "#e2e8f0", SOMBRE, 1);
  return { fond, parois, x0, x1, e, yFond, yHaut, yReh };
}

/**
 * Dame Proctor en coupe, son fourreau-guide posé sur le sol en yPied (k px/mm) :
 * la tête (Ø 50 mm) est levée contre la butée, sa face à `chute` mm du sol ;
 * la position d'impact est en tirets.
 */
function dameCoupe(cx, yPied, k, chute, { hTete = 60, tige = 50 } = {}) {
  const lt = 50 * k, jeu = 1.4, ep = 2.4;
  const yFace = yPied - chute * k, yTete = yFace - hTete * k;
  const xg = cx - lt / 2 - jeu - ep, xd = cx + lt / 2 + jeu, yPoignee = yTete - 6 - tige * k;
  let s = rect(xg, yTete, ep, yPied - yTete, ACIER_FONCE, SOMBRE, 0.8) + rect(xd, yTete, ep, yPied - yTete, ACIER_FONCE, SOMBRE, 0.8);
  s += rect(xg - 2, yTete - 6, xd + ep - xg + 4, 6, SOMBRE, NOIR, 0.8);
  s += rect(cx - 2.2, yPoignee, 4.4, tige * k, ACIER, SOMBRE, 0.8) + rect(cx - 10, yPoignee - 8, 20, 8, BOIS, "#78350f", 0.8, 'rx="3"');
  s += rect(cx - lt / 2, yPied - hTete * k, lt, hTete * k, "none", SOMBRE, 0.9, 'stroke-dasharray="3 2"');
  s += rect(cx - lt / 2, yTete, lt, hTete * k, "#64748b", NOIR, 1, 'rx="1.5"');
  return { s, yFace, yTete, yPoignee, xg, xd: xd + ep, lt };
}

/** Cadran de comparateur (rayon r) : graduations et aiguille à l'angle a (degrés, 0 en haut). */
function cadran(x, y, r, a = 40) {
  let s = `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="#fff" stroke="${TRAIT}" stroke-width="1.4"/>`;
  for (let j = 0; j < 10; j++) {
    const t = (j * Math.PI) / 5;
    s += ligne(x + (r - 3.5) * Math.sin(t), y - (r - 3.5) * Math.cos(t), x + (r - 1) * Math.sin(t), y - (r - 1) * Math.cos(t), TRAIT, 0.8);
  }
  const t = (a * Math.PI) / 180;
  return s + ligne(x, y, x + (r - 2.5) * Math.sin(t), y - (r - 2.5) * Math.cos(t), COULEURS.effort, 1.4) + `<circle cx="${r1(x)}" cy="${r1(y)}" r="1.6" fill="${TRAIT}"/>`;
}

/** Éprouvette de sol (rectangle au motif de limon). */
const eprouvette = (id, x, y, w, h, fond = "#e8dcc3") => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${fond}"/>`
  + `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="url(#${id}-argile)"/>`;

// ─────────────────────────────── Proctor ─────────────────────────────────

/**
 * Essai Proctor : le moule A en coupe sur son embase, avec sa rehausse, le sol
 * compacté en trois couches et la dame Proctor normal dans son fourreau-guide,
 * tête levée à 305 mm de la couche ; à droite, les réglages du Proctor normal
 * et du Proctor modifié, puis ce que l'on mesure pour chaque teneur en eau
 * (masse du moule arasé, teneur en eau, ρd) et la courbe qu'on en tire, point
 * par point, avec l'exemple du calculateur du chapitre.
 */
export function schemaProctor({ largeur = 600, hauteur = 340 } = {}) {
  return svg({
    largeur, hauteur, titre: "Essai Proctor : moule, dame et mesures", contenu: (id) => {
      const k = 0.5, cx = 172, yBas = hauteur - 12, N = DAMES.normal, Mo = MOULES.A;
      const M = mouleCoupe(cx, yBas, k, { D: Mo.D, H: Mo.H, rehausse: 50 });
      const hc = (Mo.H + 6) / N.couches; // épaisseur compactée d'une couche : la dernière dépasse de 6 mm dans la rehausse
      let s = M.fond, y = M.yFond;
      for (let j = 0; j < N.couches; j++) {
        const yh = y - hc * k;
        s += `<rect x="${r1(M.x0)}" y="${r1(yh)}" width="${r1(M.x1 - M.x0)}" height="${r1(y - yh)}" fill="${j % 2 ? "#ddd0b4" : "#e8dcc3"}"/>`;
        s += `<rect x="${r1(M.x0)}" y="${r1(yh)}" width="${r1(M.x1 - M.x0)}" height="${r1(y - yh)}" fill="url(#${id}-argile)"/>`;
        if (j < N.couches - 1) s += ligne(M.x0, yh, M.x1, yh, "#8b7355", 0.9, 'stroke-dasharray="3 2"');
        y = yh;
      }
      const ySol = y;
      s += ligne(M.x0, ySol, M.x1, ySol, "#8b7355", 1.2);
      s += M.parois;
      const D = dameCoupe(cx, ySol, k, N.chute * 1000);
      s += D.s;
      s += fleche(id, cx, D.yFace + 8, cx, ySol - 34, { type: "effort", ep: 2 });
      // Cote de la hauteur de chute, à droite du moule.
      const xc = M.x1 + M.e + 14;
      s += ligne(D.xd + 1, D.yFace, xc + 4, D.yFace, COULEURS.cote, 0.7) + ligne(M.x1 + M.e + 3, ySol, xc + 4, ySol, COULEURS.cote, 0.7);
      s += cote(id, xc, D.yFace, xc, ySol, "");
      s += etiqs(xc + 7, (D.yFace + ySol) / 2 - 2, ["chute", `${fmt(N.chute * 1000)} mm`], { couleur: COULEURS.cote });
      // Renvois à gauche.
      const xl = cx - 44;
      s += renvoi(cx - 10, D.yPoignee - 4, xl, D.yPoignee, ["poignée"], { ancre: "end" });
      s += renvoi(D.xg - 1, D.yTete - 3, xl, D.yTete + 1, ["butée"], { ancre: "end" });
      s += renvoi(cx - D.lt / 2 + 3, D.yTete + 16, xl, D.yTete + 26, [`dame ${fmt(N.masse)} kg`, "face Ø 50 mm"], { ancre: "end" });
      s += renvoi(D.xg, ySol - 70, xl, ySol - 66, ["fourreau-guide"], { ancre: "end" });
      s += renvoi(M.x0 - M.e, M.yReh + 8, xl, M.yReh + 4, ["rehausse"], { ancre: "end" });
      s += renvoi(M.x0 - M.e, M.yHaut + 30, xl, M.yHaut + 22, [`moule A Ø ${Mo.D} mm`, `h ${Mo.H} mm`], { ancre: "end" });
      s += renvoi(M.x0 - M.e - 6, M.yFond + 4, xl, yBas + 6, ["embase"], { ancre: "end" });
      // Renvoi des couches, à droite.
      s += renvoi(cx + 14, M.yFond - hc * k * 1.5, xc + 7, M.yFond - 26, ["sol compacté", `en ${N.couches} couches`, `de ${N.coups.A} coups`], { taille: 11 });

      // Tableau : Proctor normal et modifié.
      const xt = 316, c2 = 476, c3 = 556, yt = 30, pas = 17, P = DAMES.modifie;
      s += etiq(xt, yt - 8, "Deux énergies, mêmes moules", { taille: 11.5 });
      s += etiq(c2, yt + 10, "normal", { ancre: "middle" }) + etiq(c3, yt + 10, "modifié", { ancre: "middle" });
      const lignes = [
        ["masse de la dame", `${fmt(N.masse)} kg`, `${fmt(P.masse)} kg`],
        ["hauteur de chute", `${fmt(N.chute * 1000)} mm`, `${fmt(P.chute * 1000)} mm`],
        ["couches", `${N.couches}`, `${P.couches}`],
        ["coups (moule A / B)", `${N.coups.A} / ${N.coups.B}`, `${P.coups.A} / ${P.coups.B}`],
        ["énergie", `≈ ${fmt(energie("normal", "A") / 1000, 1)} MJ/m³`, `≈ ${fmt(energie("modifie", "A") / 1000, 2)} MJ/m³`],
      ];
      lignes.forEach(([a, b, c], i) => {
        const yl = yt + 14 + (i + 1) * pas;
        s += ligne(xt, yl - 12.5, largeur - 8, yl - 12.5, COULEURS.grille, 1);
        s += etiq(xt, yl, a, { gras: false, halo: false }) + etiq(c2, yl, b, { ancre: "middle", halo: false }) + etiq(c3, yl, c, { ancre: "middle", halo: false });
      });
      const yFin = yt + 14 + lignes.length * pas + 5;
      s += ligne(xt, yFin, largeur - 8, yFin, COULEURS.grille, 1);
      s += etiq(xt, yFin + 14, `moule A : Ø ${MOULES.A.D} mm ; moule B (CBR) : Ø ${MOULES.B.D} mm`, { taille: 10, gras: false, halo: false, couleur: COULEURS.discret });

      // Ce que l'on mesure, et la courbe point par point.
      const ym = yFin + 38;
      s += etiq(xt, ym, "Pour chaque teneur en eau, un point :", { taille: 11 });
      s += etiqs(xt, ym + 15, ["· moule arasé et pesé : M, masse de sol humide", "· prise à l'étuve à 105 °C : teneur en eau w"], { taille: 10.5, gras: false, halo: false });
      s += etiq(xt, ym + 49, "ρd = M / [V (1 + w)]", { taille: 12, couleur: COULEURS.bleu });
      s += courbeProctor(id, { x0: xt + 44, x1: largeur - 14, y0: ym + 66, y1: hauteur - 26 });
      return s;
    },
  });
}

/** Petite courbe Proctor : les cinq points du calculateur du chapitre 3, la parabole, l'optimum et Sr = 100 %. */
function courbeProctor(id, { x0, x1, y0, y1 }) {
  const pts = [[11.6, 1.712], [13.4, 1.762], [15.3, 1.786], [17.2, 1.758], [19.0, 1.7]], rhoS = 2.68;
  const wa = 10, wb = 21, ra = 1.66, rb = 1.9;
  const X = (w) => x0 + ((w - wa) / (wb - wa)) * (x1 - x0), Y = (r) => y1 - ((r - ra) / (rb - ra)) * (y1 - y0);
  const o = optimum(pts);
  let s = ligne(x0, y1, x1, y1, COULEURS.trait, 1.1) + ligne(x0, y0, x0, y1, COULEURS.trait, 1.1);
  // Courbe de saturation, coupée au cadre.
  const sat = [];
  for (let w = wa; w <= wb + 1e-9; w += 0.25) { const r = rhoDSaturation(w, { rhoS }); if (r <= rb) sat.push(`${sat.length ? "L" : "M"}${r1(X(w))} ${r1(Y(r))}`); }
  s += chemin(sat.join(""), "none", COULEURS.eau, 1.4, 'stroke-dasharray="5 3"');
  const par = [];
  for (let w = 11; w <= 19.6 + 1e-9; w += 0.2) par.push(`${par.length ? "L" : "M"}${r1(X(w))} ${r1(Y(o.courbe(w)))}`);
  s += chemin(par.join(""), "none", COULEURS.gtr24, 2);
  s += ligne(X(o.wOPN), Y(o.rhoDOPN), X(o.wOPN), y1, COULEURS.effort, 0.9, 'stroke-dasharray="3 2"') + ligne(x0, Y(o.rhoDOPN), X(o.wOPN), Y(o.rhoDOPN), COULEURS.effort, 0.9, 'stroke-dasharray="3 2"');
  for (const [w, r] of pts) s += `<circle cx="${r1(X(w))}" cy="${r1(Y(r))}" r="3.2" fill="${COULEURS.encre}"/>`;
  s += `<circle cx="${r1(X(o.wOPN))}" cy="${r1(Y(o.rhoDOPN))}" r="3.6" fill="none" stroke="${COULEURS.effort}" stroke-width="1.6"/>`;
  s += etiq(X(o.wOPN), y1 + 12, "wOPN", { ancre: "middle", taille: 10, couleur: COULEURS.effort });
  s += etiq(x0 - 4, Y(o.rhoDOPN) + 4, "ρdOPN", { ancre: "end", taille: 10, couleur: COULEURS.effort });
  s += etiq(x1, y1 + 12, "w", { ancre: "end", taille: 10, gras: false, couleur: COULEURS.discret });
  s += etiq(x0 + 5, y0 + 4, "ρd", { taille: 10, gras: false, couleur: COULEURS.discret });
  s += etiq(X(16.1) + 4, y0 + 8, "Sr = 100 %", { taille: 10, couleur: COULEURS.eau });
  return s;
}

// ─────────────────────────── Poinçonnement IPI et CBR ──────────────────────

/**
 * Poinçonnement IPI et CBR : à gauche, la presse — le vérin monte le plateau à
 * 1,27 mm/min, le piston de 19,3 cm² fixé sous l'anneau dynamométrique
 * s'enfonce dans l'éprouvette du moule CBR, le comparateur lit l'enfoncement ;
 * IPI : sans surcharge, aussitôt après le compactage. À droite, le CBR
 * immergé : quatre jours dans l'eau sous les surcharges annulaires, le
 * gonflement lu sur le trépied ; puis la courbe force–enfoncement lue à 2,5 et
 * 5 mm, et l'indice qu'on en tire.
 */
export function schemaPoinconnement({ largeur = 620, hauteur = 350 } = {}) {
  return svg({
    largeur, hauteur, titre: "Poinçonnement : indice portant immédiat et CBR immergé", contenu: (id) => {
      const k = 0.6, cx = 185, xg = 22, xd = 346;
      // ── La presse ──
      let s = etiq(xg, 16, "IPI : sans surcharge, juste après le compactage", { taille: 11.5 });
      const yTr = 28, ySocle = 286, yPlat = 244;
      s += rect(xg, yTr + 16, 10, ySocle - yTr - 16, ACIER_FONCE, SOMBRE, 1) + rect(xd - 10, yTr + 16, 10, ySocle - yTr - 16, ACIER_FONCE, SOMBRE, 1);
      s += rect(xg - 6, yTr, xd - xg + 12, 16, SOMBRE, NOIR, 1, 'rx="2"');
      s += rect(xg - 6, ySocle, xd - xg + 12, 14, "#64748b", NOIR, 1, 'rx="2"');
      // Vérin et plateau.
      s += rect(cx - 13, yPlat + 18, 26, ySocle - yPlat - 18, "#fde68a", BOIS, 1.1, 'rx="2"') + rect(cx - 5, yPlat + 8, 10, 10, ACIER, SOMBRE, 1);
      s += rect(cx - 64, yPlat, 128, 8, SOMBRE, NOIR, 1, 'rx="1.5"');
      s += fleche(id, cx + 30, ySocle - 4, cx + 30, yPlat + 14, { type: "effort", ep: 2 });
      s += etiqs(cx + 40, yPlat + 30, ["1,27 mm/min"], { couleur: COULEURS.effort });
      // Moule CBR et éprouvette arasée.
      const M = mouleCoupe(cx, yPlat, k, { D: MOULES.B.D, H: MOULES.B.H });
      s += M.fond + eprouvette(id, M.x0, M.yHaut, M.x1 - M.x0, M.yFond - M.yHaut) + M.parois;
      // Anneau dynamométrique, piston.
      const yA = 79, rA = 28, lP = 49.6 * k, yPointe = M.yHaut + 5;
      s += rect(cx - 6, yTr + 16, 12, yA - rA - yTr - 16, ACIER_FONCE, SOMBRE, 1);
      s += `<circle cx="${cx}" cy="${yA}" r="${rA}" fill="none" stroke="${SOMBRE}" stroke-width="6"/>`;
      s += rect(cx - 2, yA - rA + 3, 4, 2 * rA - 6, ACIER, SOMBRE, 0.6) + cadran(cx, yA, 10, 70);
      s += rect(cx - 6, yA + rA, 12, 8, ACIER_FONCE, SOMBRE, 1) + rect(cx - 3.5, yA + rA + 8, 7, 12, ACIER, SOMBRE, 1);
      const yP0 = yA + rA + 20;
      s += `<path d="M${r1(M.x0 + 1)} ${r1(M.yHaut)}h${r1(cx - lP / 2 - M.x0 - 1)}v5h${r1(lP)}v-5h${r1(M.x1 - cx - lP / 2 - 1)}" fill="none" stroke="#8b7355" stroke-width="1"/>`;
      s += `<rect x="${r1(cx - lP / 2)}" y="${r1(M.yHaut - 0.5)}" width="${r1(lP)}" height="5.5" fill="#fff"/>`;
      s += rect(cx - lP / 2, yP0, lP, yPointe - yP0, ACIER, SOMBRE, 1.1);
      // Comparateur d'enfoncement : porté par le piston, sa touche sur le bord du moule.
      const xc = M.x1 + 3;
      s += rect(cx + lP / 2, yP0 + 10, xc - cx - lP / 2 - 6, 4, ACIER_FONCE, SOMBRE, 0.8);
      s += ligne(xc, yP0 + 26, xc, M.yHaut, TRAIT, 1.6) + cadran(xc, yP0 + 18, 9, 200);
      // Renvois.
      const xl = cx - 44;
      s += renvoi(cx - rA - 2, yA - 6, xl, yA - 18, ["anneau", "dynamométrique :", "force F"], { ancre: "end" });
      s += renvoi(cx - lP / 2, yP0 + 18, xl, yP0 + 14, ["piston 19,3 cm²"], { ancre: "end" });
      s += renvoi(cx - 30, M.yHaut + 34, xl - 10, M.yHaut + 18, ["éprouvette", "compactée au", "Proctor normal"], { ancre: "end" });
      s += renvoi(cx - 62, yPlat + 6, xl - 14, yPlat + 19, ["plateau"], { ancre: "end" });
      s += renvoi(cx - 13, ySocle - 10, xl - 14, ySocle - 5, ["vérin"], { ancre: "end" });
      s += renvoi(xc + 9, yP0 + 16, xc + 22, yP0 + 4, ["comparateur :", "enfoncement s"], {});
      s += renvoi(M.x1 + M.e, M.yHaut + 34, xc + 22, M.yHaut + 38, ["moule CBR", `Ø ${MOULES.B.D} mm`], {});
      s += etiq(xg + 2, hauteur - 14, `IPI ou CBR = max( F2,5 / ${fmt(REFERENCE_CBR[2.5], 4)} kN ; F5 / ${fmt(REFERENCE_CBR[5])} kN ) × 100`, { taille: 12, couleur: COULEURS.bleu });

      // ── CBR immergé ──
      const xi = 372, xb = 452;
      s += etiq(xi, 16, "CBR immergé : 4 jours sous l'eau", { taille: 11.5 });
      s += etiq(xi, 30, "sous surcharges, avant le poinçonnement", { taille: 10.5, gras: false, halo: false });
      const yBac = 206, Mi = mouleCoupe(xb, yBac - 2, k, { D: MOULES.B.D, H: MOULES.B.H });
      s += `<rect x="${xb - 68}" y="96" width="136" height="${yBac - 96}" fill="rgba(0,119,190,0.16)"/>`;
      s += Mi.fond + eprouvette(id, Mi.x0, Mi.yHaut, Mi.x1 - Mi.x0, Mi.yFond - Mi.yHaut, "#d8cdb5") + Mi.parois;
      s += chemin(`M${xb - 70} 84V${yBac}H${xb + 70}V84`, "none", SOMBRE, 2);
      s += ligne(xb - 68, 96, xb + 68, 96, COULEURS.eau, 1.2, 'stroke-dasharray="6 4"');
      // Plaque de gonflement, tige, surcharges annulaires.
      const yPl = Mi.yHaut - 3;
      s += rect(Mi.x0 + 2, yPl, Mi.x1 - Mi.x0 - 4, 3, ACIER, SOMBRE, 0.8);
      for (const j of [0, 1]) for (const sg of [-1, 1]) {
        const xa = sg < 0 ? Mi.x0 + 4 : xb + 6, xz = sg < 0 ? xb - 6 : Mi.x1 - 4;
        s += rect(xa, yPl - 5.5 * (j + 1), xz - xa, 5, "#64748b", NOIR, 0.7, 'rx="1"');
      }
      s += rect(xb - 2, yPl - 34, 4, 34, ACIER_FONCE, SOMBRE, 0.8);
      // Trépied sur le bord du moule et comparateur.
      const yT = 74;
      s += chemin(`M${r1(Mi.x0 - 2)} ${r1(Mi.yHaut)}L${xb - 8} ${yT + 12}H${xb + 8}L${r1(Mi.x1 + 2)} ${r1(Mi.yHaut)}`, "none", SOMBRE, 2);
      s += ligne(xb, yT + 10, xb, yPl - 34, TRAIT, 1.4) + cadran(xb, yT, 11, 120);
      s += renvoi(xb + 11, yT - 2, xb + 84, yT - 8, ["comparateur :", "gonflement"], {});
      s += renvoi(xb + 26, yT + 26, xb + 84, yT + 26, ["trépied"], {});
      s += renvoi(Mi.x1 - 12, yPl - 8, xb + 84, yPl + 2, ["surcharges", "annulaires"], {});
      s += renvoi(xb + 58, yBac - 22, xb + 84, yBac - 18, ["eau"], { couleur: COULEURS.eau });
      // Courbe force–enfoncement : lectures à 2,5 et 5 mm.
      s += etiq(xi, 226, "Poinçonnement : F lue à 2,5 et 5 mm", { taille: 11 });
      s += courbePoinconnement({ x0: xi + 46, x1: largeur - 16, y0: 248, y1: 304 });
      return s;
    },
  });
}

/** Courbe force–enfoncement schématique (exemple du calculateur : 1,05 kN à 2,5 mm, 1,6 kN à 5 mm). */
function courbePoinconnement({ x0, x1, y0, y1 }) {
  const F = (s) => 0.601 * s ** 0.608, sMax = 8, FMax = 2.2;
  const X = (v) => x0 + (v / sMax) * (x1 - x0), Y = (f) => y1 - (f / FMax) * (y1 - y0);
  let s = ligne(x0, y1, x1, y1, COULEURS.trait, 1.1) + ligne(x0, y0 - 6, x0, y1, COULEURS.trait, 1.1);
  const pts = [];
  for (let v = 0; v <= 7.6; v += 0.1) pts.push(`${pts.length ? "L" : "M"}${r1(X(v))} ${r1(Y(F(v)))}`);
  s += chemin(pts.join(""), "none", COULEURS.encre, 1.8);
  for (const [v, nom] of [[2.5, "F2,5"], [5, "F5"]]) {
    s += ligne(X(v), Y(F(v)), X(v), y1, COULEURS.effort, 0.9, 'stroke-dasharray="3 2"') + ligne(x0, Y(F(v)), X(v), Y(F(v)), COULEURS.effort, 0.9, 'stroke-dasharray="3 2"');
    s += `<circle cx="${r1(X(v))}" cy="${r1(Y(F(v)))}" r="3" fill="${COULEURS.effort}"/>`;
    s += etiq(X(v), y1 + 12, `${fmt(v)} mm`, { ancre: "middle", taille: 10, gras: false, couleur: COULEURS.discret });
    s += etiq(x0 - 4, Y(F(v)) + 4, nom, { ancre: "end", taille: 10.5, couleur: COULEURS.effort });
  }
  s += etiq(x1, y1 + 12, "s", { ancre: "end", taille: 10, gras: false, couleur: COULEURS.discret });
  s += etiq(x0 + 5, y0 - 1, "F", { taille: 10, gras: false, couleur: COULEURS.discret });
  return s;
}

// ───────────────────────────── Los Angeles ─────────────────────────────

/** Dégradé d'acier poli des boulets et des billes, propre à la figure `id`. */
const defsAcier = (id) => `<defs><radialGradient id="${id}-acier" cx=".36" cy=".34" r=".72"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#cbd5e1"/><stop offset="1" stop-color="#475569"/></radialGradient></defs>`;
/** Boulet ou bille d'acier de rayon r. */
const bille = (id, x, y, r) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="url(#${id}-acier)" stroke="${NOIR}" stroke-width="${r > 4 ? 0.9 : 0.5}"/>`;

/** Granulat : polygone irrégulier de rayon moyen r (graine g) ; `arrondi` émousse les arêtes. */
function caillou(x, y, r, g, { couleur = "#d6d3d1", trait = "#78716c", n = 7, aplati = 0.8, rot = 0, arrondi = 0 } = {}) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (2 * Math.PI * (i + 0.3 * alea(g, i))) / n, rr = r * (0.8 + 0.22 * alea(g, i + 40));
    pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a) * aplati]);
  }
  const t = Math.min(1, arrondi) * 0.5;
  let d = "";
  if (t === 0) d = pts.map(([px, py], i) => `${i ? "L" : "M"}${r1(px)} ${r1(py)}`).join("");
  else pts.forEach((p, i) => {
    const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
    const p1 = [p[0] + (a[0] - p[0]) * t, p[1] + (a[1] - p[1]) * t], p2 = [p[0] + (b[0] - p[0]) * t, p[1] + (b[1] - p[1]) * t];
    d += `${i ? "L" : "M"}${r1(p1[0])} ${r1(p1[1])}Q${r1(p[0])} ${r1(p[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  });
  return `<path d="${d}Z" fill="${couleur}" stroke="${trait}" stroke-width="0.8" stroke-linejoin="round"/>`;
}

/** Tamis vu de côté : cadre, toile en tirets à y + h − 4. */
const tamisCote = (x, y, l, h = 22) => rect(x, y, l, h, "#f8fafc", "#64748b", 1.2, 'rx="2"')
  + ligne(x + 1, y + h - 4, x + l - 1, y + h - 4, SOMBRE, 2.2, 'stroke-dasharray="2 1.6"');

/** Douchette de lavage au-dessus d'un tamis : tuyau, pomme et gouttes. */
function douchette(x, y) {
  let s = chemin(`M${x - 34} ${y - 22}Q${x - 18} ${y - 26} ${x - 6} ${y - 6}`, "none", TRAIT, 4, 'stroke-linecap="round"');
  s += rect(x - 9, y - 7, 16, 7, ACIER_FONCE, SOMBRE, 0.8, 'rx="2" transform="rotate(30 ' + r1(x - 1) + " " + r1(y - 3) + ')"');
  for (let i = 0; i < 9; i++) s += `<circle cx="${r1(x + 2 + (i % 3) * 7 + i * 1.6)}" cy="${r1(y + 6 + Math.floor(i / 3) * 9 + (i % 3) * 2)}" r="1.5" fill="${COULEURS.bleu}"/>`;
  return s;
}

/**
 * Essai Los Angeles : coupe du tambour (Ø 711 mm, à l'échelle) qui tourne à
 * 31–33 tr/min ; sa tablette de 90 mm soulève la charge — 11 boulets d'acier et
 * 5 000 g de gravillons 10/14 mm — et la laisse retomber ; le compte-tours
 * arrête l'essai à 500 tours. À droite, l'après-essai : lavage sur le tamis de
 * 1,6 mm, refus séché et pesé, et LA = 100 m / M.
 */
export function schemaLosAngeles({ largeur = 600, hauteur = 340 } = {}) {
  return svg({
    largeur, hauteur, titre: "Essai Los Angeles", contenu: (id) => {
      const k = 0.28, cx = 162, cy = 168, R = (711 / 2) * k, yP = 322, G = "#a8a29e", GT = "#57534e";
      const P = (a, r) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
      let s = defsAcier(id);
      // Socle et palier derrière le tambour, sol du laboratoire.
      s += chemin(`M${cx - 22} ${cy}L${cx - 48} ${yP}H${cx + 48}L${cx + 22} ${cy}Z`, "#e2e8f0", "#94a3b8", 1.2);
      s += ligne(10, yP, 336, yP, COULEURS.trait, 1.6);
      s += `<circle cx="${cx}" cy="${cy}" r="${r1(R)}" fill="#f8fafc"/>`;
      s += ligne(cx - 6, cy, cx + 6, cy, "#94a3b8", 1) + ligne(cx, cy - 6, cx, cy + 6, "#94a3b8", 1);
      // Lit de la charge au fond, relevé du côté où monte la paroi (rotation horaire).
      const a0 = 68, a1 = 130, [xa, ya] = P(a0, R), [xb, yb] = P(a1, R);
      s += chemin(`M${r1(xa)} ${r1(ya)}A${r1(R)} ${r1(R)} 0 0 1 ${r1(xb)} ${r1(yb)}Z`, "#d6d3d1", "none", 0);
      // Boulets posés dans le lit, puis les gravillons, devant eux.
      const lit = [[76, 11], [84, 12.5], [92, 11.5], [99, 13], [106, 11.5], [113, 12.5], [121, 11], [95, 21]];
      for (const [a, d] of lit) { const [bx, by] = P(a, R - d); s += bille(id, bx, by, 6.6); }
      for (let i = 0; i < 70; i++) {
        const u = (i * 0.618034) % 1, v = (i * 0.41421 + 0.2) % 1, a = a0 + 3 + u * (a1 - a0 - 6);
        const [px, py] = P(a, R - 2), corde = ya + ((yb - ya) * (px - xa)) / (xb - xa);
        s += caillou(px, corde + 2 + v * Math.max(0, py - corde - 4), 1.9, i + 3, { couleur: G, trait: GT });
      }
      // Tablette (90 mm) : elle arrive en haut et lâche ce qu'elle porte.
      const aT = 248, [t0x, t0y] = P(aT, R), [t1x, t1y] = P(aT, R - 90 * k);
      s += ligne(t0x, t0y, t1x, t1y, NOIR, 5);
      s += bille(id, t1x + 7, t1y - 2, 6.6) + caillou(t1x + 1, t1y - 9, 2, 71, { couleur: G, trait: GT }) + caillou(t0x + 5, t0y + 8, 2, 72, { couleur: G, trait: GT });
      // La charge retombe : trajectoire, un boulet et des gravillons en chute.
      const xs = t1x + 10;
      s += chemin(`M${r1(xs)} ${r1(t1y + 6)}Q${r1(xs + 3)} ${r1(cy)} ${r1(xs + 8)} ${r1(cy + 62)}`, "none", COULEURS.effort, 1, 'stroke-dasharray="3 3"');
      s += bille(id, xs + 2, cy - 18, 6.6) + bille(id, xs + 6, cy + 36, 6.6);
      for (let i = 0; i < 6; i++) s += caillou(xs - 4 + (i % 3) * 5, cy - 46 + i * 15, 1.9, 80 + i, { couleur: G, trait: GT });
      s += fleche(id, xs + 16, cy + 8, xs + 18, cy + 40, { type: "effort", ep: 1.6 });
      // Virole et couvercle.
      s += `<circle cx="${cx}" cy="${cy}" r="${r1(R + 3)}" fill="none" stroke="#64748b" stroke-width="6"/>`;
      const [c0x, c0y] = P(196, R + 3), [c1x, c1y] = P(224, R + 3);
      s += chemin(`M${r1(c0x)} ${r1(c0y)}A${r1(R + 3)} ${r1(R + 3)} 0 0 1 ${r1(c1x)} ${r1(c1y)}`, "none", NOIR, 9);
      for (const a of [201, 219]) { const [bx, by] = P(a, R + 3); s += `<circle cx="${r1(bx)}" cy="${r1(by)}" r="1.8" fill="#e2e8f0"/>`; }
      // Rotation.
      const [r0x, r0y] = P(292, R + 18), [r2x, r2y] = P(336, R + 18);
      s += chemin(`M${r1(r0x)} ${r1(r0y)}A${r1(R + 18)} ${r1(R + 18)} 0 0 1 ${r1(r2x)} ${r1(r2y)}`, "none", COULEURS.effort, 1.8, `marker-end="url(#${id}-fl)"`);
      s += etiqs(r2x + 8, r2y - 26, ["31 à 33", "tr/min"], { couleur: COULEURS.effort });
      // Compte-tours.
      const xm = cx + 66;
      s += rect(xm, yP - 34, 86, 34, "#e2e8f0", "#64748b", 1.2, 'rx="4"') + rect(xm + 7, yP - 27, 72, 20, "#0f172a", "none", 0, 'rx="3"');
      s += `<text x="${xm + 74}" y="${yP - 12}" text-anchor="end" style="font-family:ui-monospace,Consolas,monospace;font-size:12px;font-weight:700;fill:#67e8f9">500 tr</text>`;
      s += etiq(xm + 43, yP + 13, "compte-tours", { ancre: "middle", taille: 10.5, gras: false, halo: false });
      // Renvois.
      s += renvoi((t0x + t1x) / 2 - 3, (t0y + t1y) / 2, 118, 38, ["tablette de 90 mm"], { ancre: "end" });
      const [cvx, cvy] = P(218, R + 7);
      s += renvoi(cvx, cvy, 66, 80, ["couvercle"], { ancre: "end" });
      const [bx, by] = P(100, R - 9.5);
      s += renvoi(bx + 4, by + 2, 270, 258, ["11 boulets", "Ø 47 mm"], {});
      s += renvoi(cx - 46, cy + 86, 66, 290, ["gravillons", "10/14 mm"], { ancre: "end" });
      const [vx, vy] = P(345, R + 6);
      s += renvoi(vx, vy, 274, 168, ["tambour", "Ø 711 mm", "long. 508 mm"], {});
      s += etiqs(xs + 26, cy - 30, ["la charge", "retombe"], { taille: 10.5, couleur: COULEURS.effort });

      // ── Après l'essai : tamisage à 1,6 mm et LA ──
      const xr = 356;
      s += etiq(xr, 24, "Charge du tambour", { taille: 11.5 });
      s += etiqs(xr, 40, ["M = 5 000 g de gravillons 10/14 mm", "11 boulets d'acier : 4 690 à 4 860 g", "500 tours à 31–33 tr/min"], { taille: 10.5, gras: false, halo: false });
      s += etiq(xr, 94, "Après l'essai", { taille: 11.5 });
      const xT = 372, yT = 150, lT = 118;
      s += douchette(xT + 50, yT - 20);
      s += tamisCote(xT, yT, lT);
      for (let i = 0; i < 9; i++) s += caillou(xT + 10 + i * 12.5, yT + 12 - (i % 2) * 3, 5.2 - (i % 3) * 0.7, 120 + i, { couleur: G, trait: GT, arrondi: 0.5 });
      s += chemin(`M${xT - 6} ${yT + 30}h${lT + 12}l-8 34h${-(lT - 4)}z`, "#e2e8f0", "#64748b", 1.2);
      s += `<path d="M${xT + 2} ${yT + 56}h${lT - 4}l-2 6h${-(lT - 8)}z" fill="#a8a29e" opacity=".8"/>`;
      s += rect(xT + 4, yT + 42, lT - 8, 14, "rgba(0,119,190,0.18)", "none", 0);
      for (let i = 0; i < 7; i++) s += `<circle cx="${r1(xT + 14 + i * 15)}" cy="${r1(yT + 33 + (i % 3) * 3)}" r="1.3" fill="#78716c"/>`;
      s += renvoi(xT + lT, yT + 6, xT + lT + 14, yT - 2, ["refus : séché", "à 110 °C, pesé"], { taille: 10.5 });
      s += renvoi(xT + lT - 4, yT + 20, xT + lT + 14, yT + 32, ["tamis 1,6 mm"], { taille: 10.5 });
      s += renvoi(xT + lT - 10, yT + 56, xT + lT + 14, yT + 62, ["passant m :", "fines et éclats"], { taille: 10.5 });
      s += etiq(xr, 268, "LA = 100 · m / M", { taille: 13, couleur: COULEURS.bleu });
      s += etiqs(xr, 288, ["m : masse passée au tamis de 1,6 mm", "plus LA est faible, plus la roche", "résiste aux chocs"], { taille: 10.5, gras: false, halo: false });
      return s;
    },
  });
}

// ────────────────────────────── Micro-Deval ──────────────────────────────

/** Aimant en fer à cheval, ouverture vers le bas en (x, y), et quelques billes retenues. */
function aimant(id, x, y, n = 6) {
  let s = chemin(`M${x - 18} ${y}v-14a18 18 0 0 1 36 0v14h-10v-14a8 8 0 0 0 -16 0v14z`, "#dc2626", "#7f1d1d", 1);
  s += rect(x - 18, y - 4, 10, 6, ACIER, SOMBRE, 0.6) + rect(x + 8, y - 4, 10, 6, ACIER, SOMBRE, 0.6);
  for (let i = 0; i < n; i++) s += bille(id, x - 15 + (i % 3) * 5 + (i > 2 ? 18 : 0), y + 5 + (i % 2) * 4, 2.6);
  return s;
}

/**
 * Essai micro-Deval en présence d'eau : coupe d'une jarre (Ø 200 mm, à
 * l'échelle) posée sur ses deux rouleaux, avec 500 g de gravillons 10/14 mm,
 * 5 000 g de billes d'acier Ø 10 mm et 2,5 L d'eau ; les rouleaux font
 * tourner les jarres 12 000 tours à 100 tr/min. À droite, la machine vue de
 * face, puis l'après-essai : billes retirées à l'aimant, lavage sur le tamis
 * de 1,6 mm, refus séché et pesé, MDE.
 */
export function schemaMicroDeval({ largeur = 600, hauteur = 340 } = {}) {
  return svg({
    largeur, hauteur, titre: "Essai micro-Deval en présence d'eau", contenu: (id) => {
      const k = 0.7, cx = 166, cy = 146, R = 100 * k, rb = 5 * k, G = "#a8a29e", GT = "#44403c";
      let s = defsAcier(id);
      s += etiq(12, 22, "Coupe d'une jarre", { taille: 11.5 });
      // Rouleaux, paliers et bâti.
      const rr = 13, dr = R + 3 + rr, ar = (34 * Math.PI) / 180, xr = [cx - dr * Math.sin(ar), cx + dr * Math.sin(ar)], yr = cy + dr * Math.cos(ar);
      s += rect(cx - 96, yr + 17, 192, 22, "#e2e8f0", "#64748b", 1.2, 'rx="3"');
      for (const x of xr) s += rect(x - 4, yr, 8, 17, ACIER_FONCE, SOMBRE, 0.8) + cercle(x, yr, rr, "#94a3b8", TRAIT, 1.2) + cercle(x, yr, 3, TRAIT, TRAIT, 0.6);
      s += tour(id, xr[0], yr, rr + 6, 150, 235, true) + tour(id, xr[1], yr, rr + 6, -55, 30, true);
      // Eau (2,5 L) : environ 65 % du diamètre.
      const yw = cy + R - 1.3 * R, dw = Math.sqrt(R * R - (yw - cy) ** 2);
      s += `<circle cx="${cx}" cy="${cy}" r="${r1(R)}" fill="#f8fafc"/>`;
      s += chemin(`M${r1(cx - dw)} ${r1(yw)}Q${cx} ${r1(yw + 3)} ${r1(cx + dw)} ${r1(yw - 1)}A${r1(R)} ${r1(R)} 0 1 1 ${r1(cx - dw)} ${r1(yw)}Z`, "rgba(0,119,190,0.22)", "none", 0);
      s += ligne(cx - dw + 2, yw, cx + dw - 2, yw - 1, COULEURS.eau, 1.2, 'stroke-dasharray="5 3"');
      for (let i = 0; i < 16; i++) s += `<circle cx="${r1(cx + 50 * alea(21, i))}" cy="${r1(yw + 10 + 26 * Math.abs(alea(23, i)))}" r="0.9" fill="#78716c"/>`;
      // Lit de billes et de gravillons (30 % du diamètre), relevé du côté où monte la paroi (rotation antihoraire).
      const pente = Math.tan((18 * Math.PI) / 180), yLit = (x) => cy + 0.4 * R - (x - cx) * pente;
      const sites = [];
      for (let row = 0; row < 20; row++) {
        const y = cy + R - rb - 0.6 - row * rb * Math.sqrt(3);
        for (let x = cx - R + (row % 2 ? rb : 0); x <= cx + R; x += 2 * rb) if (Math.hypot(x - cx, y - cy) <= R - rb - 0.6 && y >= yLit(x) - rb * 0.3) sites.push([x, y]);
      }
      // Une douzaine de gravillons prennent la place de billes, sans se toucher.
      const gravs = [];
      sites.forEach(([x, y], i) => {
        if (gravs.length < 13 && alea(31, i) > 0.55 && gravs.every(([gx, gy]) => Math.hypot(x - gx, y - gy) > 13)) gravs.push([x, y, 4.8 + 0.6 * (gravs.length % 3)]);
      });
      const billes = sites.filter(([x, y]) => !gravs.some(([gx, gy]) => gx === x && gy === y));
      for (const [x, y] of billes) s += bille(id, x, y, rb);
      gravs.forEach(([x, y, r], i) => { s += caillou(x, y, r, 200 + i, { couleur: G, trait: GT, rot: i, aplati: 0.85 }); });
      s += `<circle cx="${cx}" cy="${cy}" r="${r1(R + 2.5)}" fill="none" stroke="#64748b" stroke-width="5"/>`;
      s += tour(id, cx, cy, R + 14, -35, -145, false);
      s += etiqs(cx + R * 0.5, cy - R - 22, ["100 ± 5 tr/min"], { couleur: COULEURS.effort });
      // Renvois de la coupe.
      const xl = cx - R - 16, xd = cx + R + 16, [g0x, g0y, g0r] = gravs.reduce((a, g) => (g[0] > a[0] ? g : a));
      s += renvoi(cx - R * 0.71 - 2, cy - R * 0.71, xl, cy - R * 0.62, ["jarre", "Ø 200 mm"], { ancre: "end" });
      s += renvoi(cx - dw + 8, yw - 5, xl, yw + 14, ["eau", "2,5 L"], { ancre: "end", couleur: COULEURS.eau });
      s += renvoi(xr[0] - rr - 1, yr + 6, xl - 6, yr + 10, ["rouleaux"], { ancre: "end" });
      const [b0x, b0y] = billes.reduce((a, b) => (Math.hypot(b[0] - cx - 30, b[1] - cy - 30) < Math.hypot(a[0] - cx - 30, a[1] - cy - 30) ? b : a));
      s += renvoi(b0x, b0y, xd, cy - 6, ["billes d'acier", "Ø 10 mm : 5 000 g"], {});
      s += renvoi(g0x + g0r - 1, g0y, xd, cy + 34, ["gravillons", "10/14 mm : 500 g"], {});

      // ── La machine : les jarres côte à côte sur les rouleaux ──
      const xm = 366, km = 0.27, lj = 154 * km, hj = 200 * km, yjB = 112, xF = largeur - 12;
      s += etiq(xm, 22, "La machine, vue de face", { taille: 11.5 });
      for (let j = 0; j < 4; j++) {
        const x = xm + 4 + j * (lj + 8);
        s += rect(x, yjB - hj, lj, hj, "#cbd5e1", SOMBRE, 1.1, 'rx="2"') + rect(x + 2, yjB - hj + 9, lj - 4, 7, "#f1f5f9", "none", 0);
        s += rect(x - 2, yjB - hj + 4, 4, hj - 8, SOMBRE, NOIR, 0.6) + rect(x + lj - 2, yjB - hj + 4, 4, hj - 8, SOMBRE, NOIR, 0.6);
      }
      const xmF = xm + 4 + 4 * (lj + 8);
      s += rect(xm - 2, yjB - 6, xmF - xm, 9, ACIER_FONCE, SOMBRE, 1, 'rx="4.5"');
      s += rect(xmF, yjB - 34, xF - xmF, 38, "#cbd5e1", "#64748b", 1.1, 'rx="3"');
      s += rect(xm - 6, yjB + 3, xF - xm + 6, 20, "#e2e8f0", "#64748b", 1.2, 'rx="3"');
      s += rect(xm + 60, yjB + 6, 74, 14, "#0f172a", "none", 0, 'rx="2"');
      s += `<text x="${xm + 130}" y="${yjB + 17}" text-anchor="end" style="font-family:ui-monospace,Consolas,monospace;font-size:10.5px;font-weight:700;fill:#67e8f9">12 000 tr</text>`;
      s += etiq(xm - 6, yjB + 38, "12 000 tours, soit 2 h", { taille: 10.5, gras: false, halo: false });
      s += renvoi((xmF + xF) / 2, yjB - 30, xF, yjB - 62, ["moteur"], { ancre: "end", taille: 10.5 });

      // ── Après l'essai ──
      const xa = 366, yT = 230, lT = 100, xt = xa + lT + 20;
      s += etiq(xa - 6, 172, "Après l'essai", { taille: 11.5 });
      s += aimant(id, xa + 46, 206);
      s += tamisCote(xa, yT, lT);
      for (let i = 0; i < 8; i++) s += caillou(xa + 10 + i * 11.5, yT + 12 - (i % 2) * 2.5, 4.4 - (i % 3) * 0.5, 300 + i, { couleur: G, trait: GT, rot: i });
      s += chemin(`M${xa - 6} ${yT + 30}h${lT + 12}l-7 22h${-(lT - 2)}z`, "#e2e8f0", "#64748b", 1.2) + rect(xa, yT + 40, lT, 10, "rgba(120,113,108,0.35)", "none", 0);
      s += renvoi(xa + 64, 196, xt, 192, ["billes retirées", "à l'aimant"], { taille: 10.5 });
      s += renvoi(xa + lT, yT + 8, xt, yT + 1, ["refus à 1,6 mm :", "lavé, séché", "à 110 °C, pesé : m"], { taille: 10.5 });
      s += renvoi(xa + lT - 2, yT + 44, xt, yT + 50, ["eau et fines"], { taille: 10.5 });
      s += etiq(xa - 6, hauteur - 38, "MDE = 100 (M − m) / M", { taille: 13, couleur: COULEURS.bleu });
      s += etiqs(xa - 6, hauteur - 20, ["M = 500 g ; plus MDE est faible,", "mieux la roche résiste à l'usure"], { taille: 10.5, gras: false, halo: false });
      return s;
    },
  });
}

// ─────────────────── Fragmentabilité et dégradabilité ───────────────────

/** Étuve : caisson, consigne affichée, porte vitrée ; l'intérieur va de (x + 8, y + 26) à (x + l − 8, y + h − 8). */
function etuve(x, y, l, h, consigne = "105 °C") {
  let s = rect(x, y, l, h, "#f1f5f9", SOMBRE, 1.3, 'rx="5"') + rect(x + 8, y + 26, l - 16, h - 34, "#fff7ed", "#64748b", 1, 'rx="3"');
  s += rect(x + 6, y + 5, 58, 16, "#0f172a", "none", 0, 'rx="2"');
  s += `<text x="${x + 59}" y="${y + 17}" text-anchor="end" style="font-family:ui-monospace,Consolas,monospace;font-size:10.5px;font-weight:700;fill:#67e8f9">${consigne}</text>`;
  return s + `<circle cx="${x + l - 11}" cy="${y + 13}" r="4.5" fill="#f97316" stroke="#7c2d12" stroke-width="0.6"/>`;
}

/** Panier grillagé (fond en yB, largeur l, hauteur h) garni de fragments de roche. */
function panier(x, yB, l, h, couleur, trait, graine = 1) {
  let s = rect(x, yB - h, l, h, "none", SOMBRE, 1.2, 'stroke-dasharray="3 2"');
  for (let j = 0; j < 3; j++) for (let i = 0; i < Math.floor(l / 9); i++) {
    const cx = x + 6 + i * 9 + (j % 2) * 4, cy = yB - 5 - j * 7.5;
    if (cx < x + l - 4) s += caillou(cx, cy, 4 + 0.6 * alea(graine, i + 9 * j), graine + i + 9 * j, { couleur, trait, rot: i + j });
  }
  return s + chemin(`M${x} ${yB - h}Q${r1(x + l / 2)} ${yB - h - 18} ${x + l} ${yB - h}`, "none", SOMBRE, 1.4);
}

/**
 * Courbes granulométriques schématiques avant et après l'essai (abscisse
 * logarithmique, sans graduation) : la fraction 10/20 mm de départ, et la
 * courbe après l'essai, réglée pour que son D10 vaille `D10apres` (mm).
 */
function courbesD10({ x0, x1, y0, y1, D10apres }) {
  const la = Math.log10(0.08), lb = Math.log10(40);
  const X = (d) => x0 + ((Math.log10(d) - la) / (lb - la)) * (x1 - x0), Y = (p) => y1 - (p / 100) * (y1 - y0);
  const AV = [[8, 0], [10, 5], [11, 10], [12.5, 30], [14, 47], [16, 66], [20, 98], [25, 100]];
  const avant = (d) => {
    if (d <= AV[0][0]) return 0;
    for (let i = 1; i < AV.length; i++) if (d <= AV[i][0]) { const [a, pa] = AV[i - 1], [b, pb] = AV[i]; return pa + ((pb - pa) * Math.log(d / a)) / Math.log(b / a); }
    return 100;
  };
  const q = Math.log(0.1) / Math.log(Math.log(D10apres / 0.02) / Math.log(1000));
  const apres = (d) => Math.min(100, Math.max(avant(d), 100 * Math.max(0, Math.log(d / 0.02) / Math.log(1000)) ** q));
  const trace = (f) => { const p = []; for (let l = la; l <= lb + 1e-9; l += 0.02) { const d = 10 ** l; p.push(`${p.length ? "L" : "M"}${r1(X(d))} ${r1(Y(f(d)))}`); } return p.join(""); };
  let s = ligne(x0, y1, x1, y1, COULEURS.trait, 1.1) + ligne(x0, y0, x0, y1, COULEURS.trait, 1.1);
  s += ligne(x0, Y(10), x1, Y(10), COULEURS.discret, 0.8, 'stroke-dasharray="2 3"');
  s += chemin(trace(avant), "none", COULEURS.bleu, 2) + chemin(trace(apres), "none", COULEURS.effort, 2);
  for (const [d, c, nom] of [[11, COULEURS.bleu, "D10 avant"], [D10apres, COULEURS.effort, "D10 après"]]) {
    s += ligne(X(d), Y(10), X(d), y1, c, 0.9, 'stroke-dasharray="3 2"') + `<circle cx="${r1(X(d))}" cy="${r1(Y(10))}" r="3" fill="${c}"/>`;
    s += etiq(X(d), y1 + 12, nom, { ancre: "middle", taille: 10.5, couleur: c });
  }
  s += etiq(x0 - 4, Y(10) + 4, "10 %", { ancre: "end", taille: 10, gras: false, couleur: COULEURS.discret });
  s += etiq(x0 - 4, y0 + 4, "100 %", { ancre: "end", taille: 10, gras: false, couleur: COULEURS.discret });
  s += etiq(X(18) + 5, Y(52), "avant", { taille: 10.5, couleur: COULEURS.bleu });
  return { s, X, Y, apres };
}

/**
 * Roches évolutives : à gauche, la fragmentabilité — la fraction 10/20 mm de
 * la roche reçoit 100 coups de dame Proctor normal dans le moule CBR (à
 * l'échelle) ; à droite, la dégradabilité — la même fraction, dans un panier
 * grillagé, passe quatre fois de l'eau à l'étuve. Sous chaque essai, les
 * courbes granulométriques avant et après, et leurs D10 : IFR et IDGa sont le
 * rapport des deux.
 */
export function schemaFragmentabilite({ largeur = 640, hauteur = 380 } = {}) {
  return svg({
    largeur, hauteur, titre: "Fragmentabilité et dégradabilité des roches évolutives", contenu: (id) => {
      const ROC = "#a8b29a", ROCT = "#4d5a43", N = DAMES.normal, xm = largeur / 2;
      let s = ligne(xm, 10, xm, hauteur - 10, COULEURS.grille, 1.2);
      // ── Fragmentabilité ──
      s += etiq(14, 18, "Fragmentabilité : IFR", { taille: 12 });
      s += etiq(14, 33, `100 coups de dame Proctor normal`, { taille: 10.5, gras: false, halo: false });
      const k = 0.35, cx = 114, yBas = 236, M = mouleCoupe(cx, yBas, k, { D: MOULES.B.D, H: MOULES.B.H });
      s += M.fond;
      const yRoc = M.yFond - 60 * k;
      s += rect(M.x0, M.yFond - 3, M.x1 - M.x0, 3, "#cfd6c4", "none", 0);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) {
        const x = M.x0 + 3.5 + i * 5.9 + (j % 2) * 2.5, y = M.yFond - 5 - j * 4.6;
        if (x < M.x1 - 2.5) s += caillou(x, y, 2.4 + 0.8 * Math.abs(alea(41, i + 9 * j)), 400 + i + 9 * j, { couleur: ROC, trait: ROCT, rot: i * 1.3 + j });
      }
      s += M.parois;
      const D = dameCoupe(cx, yRoc, k, N.chute * 1000);
      s += D.s + fleche(id, cx, D.yFace + 6, cx, yRoc - 26, { type: "effort", ep: 1.8 });
      const xc = M.x1 + M.e + 12;
      s += ligne(D.xd + 1, D.yFace, xc + 4, D.yFace, COULEURS.cote, 0.7) + ligne(M.x1 + M.e + 2, yRoc, xc + 4, yRoc, COULEURS.cote, 0.7);
      s += cote(id, xc, D.yFace, xc, yRoc, "");
      s += etiqs(xc + 7, (D.yFace + yRoc) / 2 + 2, ["chute", `${fmt(N.chute * 1000)} mm`], { couleur: COULEURS.cote });
      s += renvoi(cx + D.lt / 2 - 2, D.yTete + 10, xc + 7, D.yTete + 4, ["dame Proctor", `normal, ${fmt(N.masse)} kg`], {});
      s += renvoi(cx + 12, M.yFond - 8, xc + 7, M.yFond - 16, ["fraction 10/20 mm", "de la roche"], {});
      s += renvoi(M.x0 - M.e, M.yHaut + 8, M.x0 - M.e - 10, M.yHaut - 10, ["moule CBR", `Ø ${MOULES.B.D} mm`], { ancre: "end" });
      s += etiq(14, 258, "IFR = D10 avant / D10 après", { taille: 12, couleur: COULEURS.bleu });
      s += etiq(14, 273, "IFR > 7 : roche fragmentable", { taille: 10.5, gras: false, halo: false });
      const C1 = courbesD10({ x0: 52, x1: xm - 16, y0: 290, y1: hauteur - 30, D10apres: 2.6 });
      s += C1.s + etiq(C1.X(1.2) + 6, C1.Y(C1.apres(1.2)) - 8, "après", { taille: 10.5, couleur: COULEURS.effort });

      // ── Dégradabilité ──
      const x2 = xm + 14;
      s += etiq(x2, 18, "Dégradabilité : IDGa", { taille: 12 });
      s += etiq(x2, 33, "4 cycles : imbibition dans l'eau, séchage à l'étuve", { taille: 10.5, gras: false, halo: false });
      // Bac d'eau avec le panier ; étuve avec le même panier.
      const xb = x2 + 2, lb = 88, yb = 236;
      s += rect(xb, yb - 66, lb, 66, "#f8fafc", SOMBRE, 1.3, 'rx="3"') + rect(xb + 2, yb - 56, lb - 4, 54, "rgba(0,119,190,0.22)", "none", 0);
      s += ligne(xb + 2, yb - 56, xb + lb - 2, yb - 56, COULEURS.eau, 1.2, 'stroke-dasharray="5 3"');
      s += panier(xb + 12, yb - 6, lb - 24, 26, ROC, ROCT, 60);
      const le = 106, xe = largeur - 10 - le, he = 128;
      s += etuve(xe, yb - he, le, he);
      s += rect(xe + 10, yb - 38, le - 20, 3, ACIER_FONCE, SOMBRE, 0.6);
      s += panier(xe + 22, yb - 38, le - 44, 26, ROC, ROCT, 60);
      s += etiq(xe + le / 2, yb - he - 7, "étuve", { ancre: "middle" });
      // Cycle : de l'eau à l'étuve, et retour, quatre fois.
      const g0 = xb + lb + 6, g1 = xe - 6, gm = (g0 + g1) / 2;
      s += etiqs(gm, yb - 90, ["séchage", "16 h à 105 °C"], { ancre: "middle", taille: 10.5, couleur: COULEURS.effort });
      s += fleche(id, g0, yb - 68, g1, yb - 68, { type: "effort", ep: 1.8 });
      s += etiq(gm, yb - 46, "× 4", { ancre: "middle", taille: 13 });
      s += fleche(id, g1, yb - 32, g0, yb - 32, { type: "bleu", ep: 1.8 });
      s += etiqs(gm, yb - 14, ["imbibition", "8 h dans l'eau"], { ancre: "middle", taille: 10.5, couleur: COULEURS.bleu });
      s += renvoi(xb + 20, yb - 22, xb + 36, yb - 120, ["panier grillagé :", "fraction 10/20 mm"], {});
      s += etiq(x2, 258, "IDGa = D10 avant / D10 après", { taille: 12, couleur: COULEURS.bleu });
      s += etiq(x2, 273, "≤ 5 peu · 5 à 20 moyennement · > 20 très dégradable", { taille: 10.5, gras: false, halo: false });
      const C2 = courbesD10({ x0: x2 + 38, x1: largeur - 16, y0: 290, y1: hauteur - 30, D10apres: 0.45 });
      s += C2.s + etiq(C2.X(0.2) + 4, C2.Y(C2.apres(0.2)) - 12, "après", { taille: 10.5, couleur: COULEURS.effort });
      return s;
    },
  });
}

// ─────────────────────────── Gonflement au gel ───────────────────────────

/** Flocon : six branches autour de (x, y). */
const flocon = (x, y, r = 5) => [0, 60, 120].map((a) => {
  const c = Math.cos((a * Math.PI) / 180) * r, d = Math.sin((a * Math.PI) / 180) * r;
  return ligne(x - c, y - d, x + c, y + d, "#38bdf8", 1.4);
}).join("");

/**
 * Essai de gonflement au gel : dans l'enceinte frigorifique, trois éprouvettes
 * Ø 70 × 250 mm (à l'échelle) refroidies par la tête, la base dans l'eau à
 * +1 °C ; le front de gel descend, la cryosuccion aspire l'eau qui gèle en
 * lentilles de glace au-dessus du front, et les comparateurs lisent le
 * soulèvement. À droite, le gonflement h en fonction de √I (exemple du
 * calculateur du chapitre 13) : sa pente p classe le matériau.
 */
export function schemaGonflementGel({ largeur = 640, hauteur = 360 } = {}) {
  return svg({
    largeur, hauteur, titre: "Essai de gonflement au gel", contenu: (id) => {
      const k = 0.8, xs = [72, 146, 220], w = 70 * k, yB = 304, yT0 = yB - 250 * k, dh = 6, yT = yT0 - dh, yF = yT0 + 92;
      // Enceinte frigorifique.
      let s = rect(10, 26, 316, hauteur - 34, "#e2e8f0", "#64748b", 1.6, 'rx="8"') + rect(18, 34, 300, hauteur - 50, "#f0f7fc", "#94a3b8", 1, 'rx="5"');
      s += etiq(26, 50, "enceinte frigorifique", { taille: 11, halo: false });
      for (const x of [172, 302]) s += flocon(x, 46);
      s += etiq(186, 50, "air froid sous 0 °C", { taille: 10.5, couleur: COULEURS.bleu, halo: false });
      // Portique des comparateurs et bac d'eau.
      s += rect(26, 60, 6, yB - 60, "#94a3b8", "#64748b", 0.8) + rect(256, 60, 6, yB - 60, "#94a3b8", "#64748b", 0.8) + rect(26, 58, 236, 6, "#64748b", NOIR, 0.8, 'rx="2"');
      s += rect(34, yB - 6, 220, 28, "#f8fafc", SOMBRE, 1.2, 'rx="2"') + rect(36, yB - 2, 216, 22, "rgba(0,119,190,0.25)", "none", 0);
      s += ligne(36, yB - 2, 252, yB - 2, COULEURS.eau, 1.2, 'stroke-dasharray="5 3"');
      xs.forEach((x, i) => {
        const x0 = x - w / 2;
        // Sol non gelé, sol gelé au-dessus du front, lentilles de glace : plus épaisses près du front,
        // leur épaisseur cumulée (≈ 8 mm) fait le soulèvement de la tête.
        s += `<rect x="${r1(x0)}" y="${r1(yT)}" width="${r1(w)}" height="${r1(yB - yT)}" fill="#e8dcc3"/><rect x="${r1(x0)}" y="${r1(yT)}" width="${r1(w)}" height="${r1(yB - yT)}" fill="url(#${id}-argile)"/>`;
        s += rect(x0, yT, w, yF - yT, "rgba(125,211,252,0.45)", "none", 0);
        for (const [d, e] of [[4, 1.8], [13, 1.5], [25, 1.2], [41, 1], [59, 0.8]]) s += rect(x0, yF - d - e, w, e, "#f0f9ff", "#38bdf8", 0.6);
        s += rect(x0, yT, w, yB - yT, "none", SOMBRE, 1.3);
        s += ligne(x0 - 4, yF, x0 + w + 4, yF, COULEURS.bleu, 1.4, 'stroke-dasharray="5 3"');
        // Cryosuccion : l'eau monte de la base vers le front.
        s += fleche(id, x, yB - 8, x, yF + 12, { type: "bleu", ep: 1.5 });
        // Pierre poreuse, chapeau, tige et comparateur.
        s += rect(x0 - 3, yB, w + 6, 5, "#cbd5e1", "#64748b", 0.8);
        s += rect(x0 - 2, yT - 5, w + 4, 5, "#94a3b8", SOMBRE, 0.9, 'rx="1.5"');
        s += ligne(x, yT - 5, x, 94, TRAIT, 1.8) + cadran(x, 82, 11, 60 + 50 * i);
      });
      // Soulèvement de la tête depuis sa position initiale (éprouvette 1).
      const xg = xs[0] - w / 2;
      s += ligne(xg - 12, yT0, xg, yT0, COULEURS.effort, 1, 'stroke-dasharray="2 2"') + ligne(xg - 12, yT - 5, xg - 2, yT - 5, COULEURS.effort, 1);
      s += fleche(id, xg - 7, yT0 + 10, xg - 7, yT - 4, { type: "effort", ep: 1.4 });
      s += fleche(id, xs[1] + w / 2 + 9, yF - 14, xs[1] + w / 2 + 9, yF + 8, { type: "bleu", ep: 1.4 });
      // Alimentation en eau à travers la paroi.
      s += fleche(id, 318, yB + 10, 256, yB + 10, { type: "bleu", ep: 1.6 });
      // Renvois, à droite de l'enceinte.
      const xe = xs[2] + w / 2, xl = 336;
      s += renvoi(xs[2] + 11, 82, xl, 72, ["comparateur :", "soulèvement h"], {});
      s += renvoi(xe - 6, yT + 18, xl, yT + 20, ["sol gelé et", "lentilles de glace"], {});
      s += renvoi(xe + 4, yF, xl, yF + 4, ["front de gel à 0 °C", "qui descend"], { couleur: COULEURS.bleu });
      s += renvoi(xe - 8, yF + 40, xl, yF + 42, ["cryosuccion : l'eau", "monte vers le front"], { couleur: COULEURS.bleu });
      s += renvoi(xe - 4, yB - 24, xl, yB - 22, ["éprouvette 0/20", "Ø 70 × 250 mm"], {});
      s += renvoi(256, yB + 4, xl, yB + 14, ["eau à +1 °C"], { couleur: COULEURS.eau });
      s += etiq(26, hauteur - 18, "trois éprouvettes, six jours de gel", { taille: 10.5, gras: false, halo: false });
      s += etiq(xg - 12, yT - 12, "h", { ancre: "middle", couleur: COULEURS.effort });

      // ── Gonflement en fonction de √I ──
      const gx0 = 468, gx1 = largeur - 14, gy0 = 64, gy1 = 270, sMax = 32, hMax = 8;
      const X = (v) => gx0 + (v / sMax) * (gx1 - gx0), Y = (h) => gy1 - (h / hMax) * (gy1 - gy0);
      s += etiq(gx0 - 22, 30, "Gonflement h en fonction de √I", { taille: 11.5 });
      // Zones de classement : SGt au-dessus de p = 0,4, SGp jusqu'à p = 0,05, SGn en dessous.
      s += `<path d="M${r1(X(0))} ${r1(Y(0))}L${r1(X(hMax / 0.4))} ${r1(Y(hMax))}L${r1(X(0))} ${r1(Y(hMax))}Z" fill="#fee2e2"/>`;
      s += `<path d="M${r1(X(0))} ${r1(Y(0))}L${r1(X(sMax))} ${r1(Y(0.05 * sMax))}L${r1(X(sMax))} ${r1(Y(hMax))}L${r1(X(hMax / 0.4))} ${r1(Y(hMax))}Z" fill="#fef3c7"/>`;
      s += `<path d="M${r1(X(0))} ${r1(Y(0))}L${r1(X(sMax))} ${r1(Y(0))}L${r1(X(sMax))} ${r1(Y(0.05 * sMax))}Z" fill="#dcfce7"/>`;
      s += ligne(X(0), Y(0), X(hMax / 0.4), Y(hMax), "#b45309", 1.3, 'stroke-dasharray="5 3"') + ligne(X(0), Y(0), X(sMax), Y(0.05 * sMax), "#15803d", 1.3, 'stroke-dasharray="5 3"');
      s += ligne(gx0, gy1, gx1, gy1, COULEURS.trait, 1.2) + ligne(gx0, gy0, gx0, gy1, COULEURS.trait, 1.2);
      // Mesures de l'exemple du cours et droite ajustée par l'origine.
      const mes = [[100, 1.9], [200, 2.9], [400, 4.0], [600, 5.0], [900, 6.1]], p = penteGel(mes);
      s += ligne(X(0), Y(0), X(sMax), Y(p * sMax), COULEURS.encre, 1.8);
      for (const [I, h] of mes) s += `<circle cx="${r1(X(Math.sqrt(I)))}" cy="${r1(Y(h))}" r="3.2" fill="${COULEURS.bleu}" stroke="#fff" stroke-width="0.8"/>`;
      s += etiq(X(1.2), Y(7.2), "SGt", { taille: 11, couleur: "#b91c1c", halo: false });
      s += etiq(X(25), Y(3.2), "SGp", { ancre: "middle", taille: 11, couleur: "#b45309", halo: false });
      s += etiq(gx1 - 4, Y(0.35), "SGn", { ancre: "end", taille: 11, couleur: "#15803d", halo: false });
      s += etiq(X(hMax / 0.4) + 4, Y(hMax) + 12, "p = 0,4", { taille: 10, couleur: "#b45309" });
      s += etiq(gx1 - 4, Y(0.05 * sMax) - 6, "p = 0,05", { ancre: "end", taille: 10, couleur: "#15803d" });
      s += etiq(gx1, Y(p * sMax) - 10, `p = ${p.toFixed(2).replace(".", ",")}`, { ancre: "end", taille: 10.5 });
      s += etiq(gx0 - 6, gy0 + 4, "h", { ancre: "end", taille: 10.5, gras: false, couleur: COULEURS.discret });
      s += etiq(gx0 - 6, gy0 + 17, "(mm)", { ancre: "end", taille: 10, gras: false, couleur: COULEURS.discret });
      for (const v of [10, 20, 30]) s += ligne(X(v), gy1, X(v), gy1 + 4, COULEURS.trait, 1) + etiq(X(v), gy1 + 15, `${v}`, { ancre: "middle", taille: 10, gras: false, couleur: COULEURS.discret });
      s += etiq(gx1, gy1 + 30, "√I, avec I en °C·h", { ancre: "end", taille: 10.5, gras: false, couleur: COULEURS.discret });
      s += etiq(gx0 - 22, gy1 + 52, "h = p √I · p en mm/(°C·h)½", { taille: 11, couleur: COULEURS.bleu });
      s += etiq(gx0 - 22, gy1 + 68, "I : indice de gel cumulé en tête", { taille: 10.5, gras: false, halo: false });
      return s;
    },
  });
}
