// Schémas des appareils d'identification des sols (chapitre 2) : tamisage,
// sédimentométrie, limites d'Atterberg, valeur de bleu, équivalent de sable.
// Boîte à outils et règles communes : src/schemas-outils.js.

import { svg, ligne, cote, fleche, COULEURS } from "./figures.js";
import { etiq, etiqs, renvoi, rect, cercle, chemin, grains, ACIER, ACIER_FONCE, TRAIT, EAU, VERRE, r1 } from "./schemas-outils.js";

// ───────────────────────────── Aides locales ─────────────────────────────

const GRAIN = "#d6b56d", GRAIN_TRAIT = "#8a6d1f", SABLE = "#efdca6", FINES = "#a8875c";
const NOTE = { taille: 10.5, gras: false, couleur: COULEURS.discret };

/** Suite pseudo-aléatoire déterministe dans [0, 1[ (générateur de Lehmer). */
function alea(graine = 1) {
  let g = graine % 2147483647 || 1;
  return () => ((g = (g * 16807) % 2147483647) / 2147483647);
}

/**
 * Tas de grains posé sur une toile (ordonnée y) entre x0 et x1 : trapèze de
 * hauteur h rempli de grains de rayon r, rangés en quinconce.
 */
function tas(x0, x1, y, h, r, graine, { fond = SABLE, grain = GRAIN, trait = GRAIN_TRAIT, largeur = 1 } = {}) {
  if (h < 1) return "";
  if (largeur < 1) { const m = (x0 + x1) / 2, l = ((x1 - x0) * largeur) / 2; x0 = m - l; x1 = m + l; }
  const pente = Math.min(16, h * 1.3), a = alea(graine);
  let s = r >= 2.6 ? "" : `<path d="M${r1(x0)} ${r1(y)}L${r1(x0 + pente)} ${r1(y - h)}H${r1(x1 - pente)}L${r1(x1)} ${r1(y)}Z" fill="${fond}"/>`;
  const pas = Math.max(2 * r * 0.98, 2.4), dy = Math.max(pas * 0.86, 2.2);
  let rang = 0;
  for (let yy = y - r; yy >= y - h + r * 0.7 - 0.01; yy -= dy, rang++) {
    const f = (y - yy) / h, xa = x0 + pente * f + r * 0.8, xb = x1 - pente * f - r * 0.8;
    for (let xx = xa + (rang % 2 ? pas / 2 : 0); xx <= xb + 0.01; xx += pas) {
      const rr = r * (0.78 + 0.26 * a());
      s += `<circle cx="${r1(xx + (a() - 0.5) * 0.3 * r)}" cy="${r1(yy + (a() - 0.5) * 0.2 * r)}" r="${r1(rr)}" fill="${grain}"${r >= 1.8 ? ` stroke="${trait}" stroke-width="${r >= 3 ? 0.8 : 0.5}"` : ""}/>`;
    }
  }
  return s;
}

/** Tamis vu de côté : cadre et toile (tirets d'autant plus espacés que la maille est grande). */
function tamisCote(x, y, l, h, ouverture) {
  const ecart = 0.8 + (Math.log2(ouverture / 0.063) / 9) * 5;
  return rect(x, y, l, h, "#f8fafc", "#64748b", 1.1)
    + `<path d="M${r1(x + 1)} ${r1(y + h - 4)}h${r1(l - 2)}" stroke="#334155" stroke-width="1.4" stroke-dasharray="1.6 ${r1(ecart)}"/>`;
}

/** Balance de laboratoire : socle trapézoïdal, plateau en `yP`, afficheur. */
function balanceLabo(xc, yP, lecture) {
  let s = rect(xc - 8, yP + 4, 16, 8, ACIER_FONCE, TRAIT, 0.8);
  s += rect(xc - 46, yP, 92, 5, ACIER, TRAIT, 1, 'rx="2"');
  s += chemin(`M${r1(xc - 66)} ${r1(yP + 42)}l8 -30h${r1(116)}l8 30z`, "#e2e8f0", TRAIT, 1.2);
  s += rect(xc - 38, yP + 18, 76, 17, "#0f172a", "#0f172a", 0.8, 'rx="3"');
  s += `<text x="${r1(xc + 33)}" y="${r1(yP + 30.5)}" text-anchor="end" style="font-family:ui-monospace,Consolas,monospace;font-size:11px;font-weight:700;fill:#67e8f9">${lecture}</text>`;
  return s;
}

// ──────────────────────────────── Tamisage ───────────────────────────────

/** Double flèche verticale de vibration, centrée en (x, y), de demi-longueur d. */
function vibration(x, y, d = 13) {
  const tete = (yt, sens) => `<path d="M${r1(x - 4)} ${r1(yt - 6 * sens)}L${r1(x)} ${r1(yt)}L${r1(x + 4)} ${r1(yt - 6 * sens)}Z" fill="${COULEURS.effort}"/>`;
  return ligne(x, y - d + 4, x, y + d - 4, COULEURS.effort, 1.8) + tete(y - d, -1) + tete(y + d, 1);
}

/**
 * Analyse granulométrique par tamisage (NF EN ISO 17892-4, série de tamis de
 * la NF EN 933-2) : lavage de la prise d'essai sur le tamis de 63 µm, protégé
 * par un tamis de 2 mm (les fines partent avec l'eau) ; séchage à l'étuve ;
 * tamisage à sec sur la colonne de tamis emboîtés, d'ouvertures décroissantes
 * de haut en bas (couvercle, tamis de 31,5 à 0,063 mm, fond), que la tamiseuse
 * fait vibrer dix minutes : chaque tamis garde les grains plus gros que sa
 * maille. On pèse chaque refus ; les refus cumulés, rapportés à la masse
 * sèche M de la prise d'essai (pesée avant lavage), donnent les passants.
 */
export function schemaTamisage({ largeur = 640, hauteur = 360 } = {}) {
  return svg({
    largeur, hauteur, titre: "Analyse granulométrique par tamisage", contenu: (id) => {
      let s = "";
      // ── 1 · Lavage sur le tamis de 63 µm, protégé par un tamis de 2 mm ──
      const xl = 14, wl = 70, xm = xl + wl / 2, xe = 96;
      s += etiq(10, 20, "1 · lavage", { taille: 11.5 });
      s += chemin(`M8 36H${xm}V46`, "none", "#64748b", 6, 'stroke-linejoin="round"') + rect(xm - 7, 45, 14, 7, "#475569", "#1e293b", 1, 'rx="2"');
      for (const dx of [-5, 0, 5]) {
        let d = `M${xm + dx} 55`;
        for (let y = 58; y <= 73; y += 3) d += `L${r1(xm + dx + 1.2 * Math.sin(y * 0.9 + dx))} ${y}`;
        s += chemin(d, "none", EAU, 1.4, 'opacity=".8"');
      }
      s += tamisCote(xl, 76, wl, 16, 2) + tas(xl + 5, xl + wl - 5, 88, 7, 2.9, 7, { largeur: 0.8 });
      s += tamisCote(xl, 94, wl, 20, 0.063) + tas(xl + 4, xl + wl - 4, 110, 7, 1.3, 11, { fond: "#d9c48f", grain: "#b99a55" });
      for (let i = 0; i < 5; i++) s += ligne(xl + 9 + i * 13, 117 + (i % 2) * 4, xl + 9 + i * 13, 124 + (i % 2) * 4, "#8b7355", 1.6, 'opacity=".75"');
      s += chemin(`M${xl - 8} 132H${xl + wl + 8}L${xl + wl + 2} 156H${xl - 2}Z`, "#f1f5f9", TRAIT, 1.2);
      s += chemin(`M${xl - 6.5} 138H${xl + wl + 6.5}L${xl + wl + 1.8} 155H${xl - 1.8}Z`, "#c9b48e", "none", 0, 'opacity=".85"');
      s += renvoi(xl + wl, 84, xe, 87, ["tamis de 2 mm"]);
      s += renvoi(xl + wl, 103, xe, 107, ["tamis de 63 µm"]);
      s += renvoi(xl + wl + 4, 147, xe, 140, ["les fines partent", "avec l'eau"], { couleur: "#78350f" });
      // ── 2 · Séchage à l'étuve ──
      s += etiq(10, 186, "2 · séchage", { taille: 11.5 });
      s += rect(xl, 196, wl, 64, "#f1f5f9", TRAIT, 1.3, 'rx="5"') + rect(xl + 6, 201, 30, 9, "#0f172a", "#0f172a", 0.6, 'rx="2"');
      s += cercle(xl + wl - 10, 205.5, 4, "#f97316", "#7c2d12", 0.6);
      s += rect(xl + 6, 215, wl - 12, 39, "#fff7ed", "#64748b", 1, 'rx="3"');
      s += chemin(`M${xm - 20} 246h40l-3 7h-34z`, ACIER, ACIER_FONCE, 0.9) + tas(xm - 18, xm + 18, 246, 6, 1.5, 5);
      s += renvoi(xl + wl, 226, xe, 222, ["étuve à", "105 °C"]);
      s += etiqs(10, 280, ["refus lavé et séché,", "puis versé sur la colonne"], NOTE);
      // ── 3 · Tamisage à sec : colonne sur la tamiseuse ──
      const OUV = [31.5, 16, 8, 4, 2, 1, 0.5, 0.25, 0.125, 0.063];
      const PCT = [4, 9, 11, 10, 9, 9, 10, 10, 8, 6]; // refus partiels (% de M)
      const X0 = 228, LP = 114, HT = 19, yL = 76, yS0 = 88, yF = yS0 + OUV.length * HT, HF = 16, yP = yF + HF;
      const xc = X0 + LP / 2;
      s += etiq(xc, 20, "3 · tamisage à sec, 10 min", { ancre: "middle", taille: 11.5 });
      // Tiges de serrage (derrière la colonne) et couvercle à écrous.
      for (const x of [X0 + 8, X0 + LP - 12]) s += rect(x, yL - 10, 4, yP - yL + 10, ACIER_FONCE, TRAIT, 0.8);
      s += rect(X0 - 6, yL, LP + 12, yS0 - yL, "#94a3b8", TRAIT, 1.2, 'rx="2"');
      for (const x of [X0 + 10, X0 + LP - 10]) s += rect(x - 7, yL - 9, 14, 9, "#475569", "#1e293b", 1, 'rx="2"');
      // Tamis d'ouvertures décroissantes et leurs refus : grains de plus en plus fins vers le bas.
      const rayon = (a) => 0.92 * (a / 0.063) ** 0.3;
      OUV.forEach((a, k) => {
        const y = yS0 + k * HT, ym = y + HT - 4, r = rayon(a);
        s += tamisCote(X0, y, LP, HT, a);
        const h = Math.max(2 * r, Math.min(HT - 6, 3 + PCT[k]));
        s += tas(X0 + 4, X0 + LP - 4, ym, h, r, 3 + 17 * k, { largeur: Math.min(1, 0.3 + PCT[k] / 12) });
        s += etiq(X0 - 12, y + HT / 2 + 4, String(a).replace(".", ","), { ancre: "end", taille: 10.5, halo: false, couleur: "#334155" });
      });
      // Fond : la poussière restée collée aux grains au lavage.
      s += rect(X0, yF, LP, HF, "#f8fafc", "#64748b", 1.1) + rect(X0, yF + HF - 4, LP, 4, ACIER, "#64748b", 0.8);
      s += tas(X0 + 20, X0 + LP - 20, yF + HF - 4, 3, 0.6, 91, { fond: "#cdb994", grain: FINES });
      s += etiq(X0 - 12, yF + HF / 2 + 4, "fond", { ancre: "end", taille: 10.5, halo: false, couleur: "#334155" });
      s += etiq(X0 - 12, 66, "ouverture (mm)", { ancre: "end", taille: 10, gras: false, couleur: COULEURS.discret });
      // Tamiseuse : plateau vibrant, bâti, minuterie.
      s += rect(X0 - 14, yP, LP + 28, 6, "#64748b", "#1e293b", 1, 'rx="2"');
      s += rect(X0 - 20, yP + 6, LP + 40, 34, "#e2e8f0", TRAIT, 1.3, 'rx="5"');
      for (const x of [X0 - 12, X0 + LP + 4]) s += rect(x, yP + 40, 8, 6, "#475569", "#1e293b", 0.8);
      s += cercle(X0 + LP + 2, yP + 23, 9, "#f8fafc", TRAIT, 1.2) + ligne(X0 + LP + 2, yP + 23, X0 + LP + 7, yP + 18, COULEURS.effort, 1.4);
      s += etiq(X0 + 42, yP + 27, "tamiseuse", { ancre: "middle", taille: 11, halo: false });
      s += vibration(X0 - 32, yP + 22) + vibration(X0 + LP + 32, yP + 22);
      s += etiq(X0 + LP + 42, yP + 27, "vibrations", { taille: 10.5, couleur: COULEURS.effort });
      // Désignation des pièces, à droite de la colonne.
      const xt = X0 + LP + 16;
      s += renvoi(X0 + LP + 6, yL + 6, xt, yL + 10, ["couvercle"]);
      s += renvoi(X0 + LP - 18, yS0 + 4 * HT + 10, xt, yS0 + 4 * HT + 4, ["refus : grains", "plus gros que", "la maille"]);
      s += renvoi(X0 + LP - 2, yS0 + 7 * HT + HT - 4, xt, yS0 + 7 * HT + 19, ["toile du tamis"]);
      // ── 4 · Pesée de chaque refus ──
      const xr = 462, xb = 546;
      s += etiq(xr, 20, "4 · pesée de chaque refus", { taille: 11.5 });
      s += balanceLabo(xb, 76, "64,2 g");
      s += tamisCote(xb - 42, 54, 84, 20, 0.5) + tas(xb - 38, xb + 38, 70, 8, 1.75, 57);
      s += etiq(xb, 138, "tamis et refus, tare déduite", { ancre: "middle", ...NOTE });
      s += etiq(xr, 184, "refus cumulé R :", { taille: 11 });
      s += etiqs(xr, 199, ["somme des refus de ce tamis", "et des tamis du dessus"], NOTE);
      s += etiq(xr, 242, "P = 100 (1 − R / M)", { taille: 12.5, couleur: COULEURS.bleu });
      s += etiq(xr, 258, "passant (%) à chaque tamis", NOTE);
      s += etiqs(xr, 284, ["M : masse sèche de la prise", "d'essai, pesée avant lavage"], NOTE);
      s += etiq(xr, 326, "→ courbe granulométrique", { taille: 11, couleur: COULEURS.bleu });
      s += etiq(10, hauteur - 10, "échelle non respectée", { taille: 10, gras: false, couleur: COULEURS.discret });
      return s;
    },
  });
}

// ───────────────────────────── Sédimentométrie ───────────────────────────

/**
 * Sédimentométrie au densimètre (NF EN ISO 17892-4) : la fraction fine,
 * dispersée avec un défloculant, décante dans une éprouvette de 1 L ; le
 * densimètre flotte, son bulbe dans la suspension, sa tige graduée lue à la
 * surface (lecture R) ; un thermomètre donne la température, donc la
 * viscosité η de l'eau. À droite, la suspension au même instant t : chaque
 * grain, parti de la surface, est tombé de v t (loi de Stokes, v ∝ D²) ; les
 * grains de diamètre D sont arrivés à la profondeur effective Hr du densimètre,
 * les plus gros sont passés dessous, les plus fins sont encore au-dessus.
 * Éprouvette et densimètre à l'échelle (étalonnage du banc d'essai).
 */
export function schemaSedimentometrie({ largeur = 640, hauteur = 372 } = {}) {
  return svg({
    largeur, hauteur, titre: "Sédimentométrie au densimètre", contenu: (id) => {
      const K = 0.75, yS = 92, yB = yS + 354 * K, xE = 112, R = 30 * K; // 0,75 px/mm ; surface, fond ; axe ; rayon intérieur (Ø 60 mm)
      const rho = 1.015, L1 = 105 - 2645 * (rho - 1), Hr = 163 - 2645 * (rho - 1); // mm (étalonnage du densimètre du banc)
      const yHr = yS + Hr * K, yBulbe = yS + L1 * K, lb = 140 * K, rb = 14 * K, yTige = yBulbe - 150 * K;
      let s = `<defs><linearGradient id="${id}-susp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4eedf"/><stop offset=".25" stop-color="#e6d6b4"/><stop offset="1" stop-color="#c9ad80"/></linearGradient></defs>`;
      // Éprouvette : suspension plus claire en haut (les gros grains en sont déjà partis), dépôt au fond.
      s += rect(xE - R, yS, 2 * R, yB - yS, `url(#${id}-susp)`, "none", 0);
      s += chemin(`M${r1(xE - R)} ${r1(yB)}V${r1(yB - 7)}Q${xE} ${r1(yB - 11)} ${r1(xE + R)} ${r1(yB - 7)}V${r1(yB)}Z`, "#a8875c", "none", 0);
      s += ligne(xE - R, yS, xE + R, yS, "#8b7355", 1.2);
      s += chemin(`M${r1(xE - R - 2)} ${r1(yS - 54)}V${r1(yB + 2)}H${r1(xE + R + 2)}V${r1(yS - 54)}`, "none", TRAIT, 1.6);
      s += ligne(xE - R + 4, yS - 46, xE - R + 4, yB - 12, "#fff", 2.2, 'opacity=".75"');
      s += rect(xE - R - 12, yB + 2, 2 * R + 24, 6, ACIER_FONCE, TRAIT, 0.8, 'rx="2"');
      // Thermomètre, entre la paroi et le bulbe.
      const xTh = xE - 17;
      s += rect(xTh - 2, 30, 4, 252, "#fff", TRAIT, 0.9, 'rx="2"') + rect(xTh - 0.8, 214, 1.6, 70, COULEURS.effort, "none", 0) + cercle(xTh, 285, 3.6, COULEURS.effort, "#7f1d1d", 0.6);
      // Densimètre : tige graduée, bulbe, lest.
      s += rect(xE - 2.4, yTige, 4.8, yBulbe - yTige + 6, "#f8fafc", TRAIT, 1, 'rx="2"');
      s += chemin(`M${r1(xE - 2.4)} ${r1(yBulbe + 2)}C${r1(xE - rb)} ${r1(yBulbe + 10)} ${r1(xE - rb)} ${r1(yBulbe + 10)} ${r1(xE - rb)} ${r1(yBulbe + 20)}V${r1(yBulbe + lb - 16)}Q${r1(xE - rb)} ${r1(yBulbe + lb)} ${xE} ${r1(yBulbe + lb)}Q${r1(xE + rb)} ${r1(yBulbe + lb)} ${r1(xE + rb)} ${r1(yBulbe + lb - 16)}V${r1(yBulbe + 20)}C${r1(xE + rb)} ${r1(yBulbe + 10)} ${r1(xE + rb)} ${r1(yBulbe + 10)} ${r1(xE + 2.4)} ${r1(yBulbe + 2)}Z`, "#f1f5f9", TRAIT, 1.2, 'fill-opacity=".9"');
      s += rect(xE - rb + 3, yBulbe + lb - 20, 2 * rb - 6, 12, "#64748b", "none", 0, 'rx="4"');
      for (let v = 0.995; v <= 1.0381; v += 0.005) {
        const y = yBulbe - (105 - 2645 * (v - 1)) * K;
        if (y < yS - 1) s += ligne(xE - 2.4, y, xE + 0.8, y, TRAIT, 0.8);
      }
      // Profondeur effective Hr.
      s += cote(id, xE - R - 14, yS, xE - R - 14, yHr, "");
      s += etiq(xE - R - 19, (yS + yHr) / 2 + 4, "Hr", { ancre: "end", taille: 12, couleur: COULEURS.cote });
      s += ligne(xE - R - 8, yHr, 404, yHr, COULEURS.effort, 1.2, 'stroke-dasharray="5 3"');
      s += ligne(xE + R + 2, yS, 404, yS, COULEURS.discret, 1, 'stroke-dasharray="3 3"');
      // Désignations.
      const xt = 182;
      s += renvoi(xTh - 2, 34, 82, 28, ["thermomètre"], { ancre: "end" });
      s += renvoi(xE + 2.4, yTige + 14, xt, yTige + 14, ["densimètre"]);
      s += renvoi(xE + 2.4, yS - 3, xt, 60, ["tige graduée :", "lecture R"]);
      s += etiq(xt + 8, yS - 5, "surface", NOTE);
      s += etiq(xt + 8, yHr - 5, "profondeur effective Hr", { taille: 10.5, couleur: COULEURS.effort });
      s += renvoi(xE + rb, yBulbe + 76, xt, yBulbe + 76, ["bulbe"]);
      s += renvoi(xE + R - 4, 262, xt, 262, ["suspension : fines", "+ défloculant, 1 L"]);
      s += renvoi(xE + R - 6, yB - 5, xt, yB - 5, ["dépôt"]);
      // À l'instant t : trois classes de grains, parties de la surface à t = 0.
      const xP = 404, wP = 204, yBas = 292;
      s += etiq(xP + wP / 2, 36, "à l'instant t", { ancre: "middle", taille: 11.5 });
      s += etiq(xP + wP / 2, 50, "grains partis de la surface à t = 0", { ancre: "middle", ...NOTE });
      const classes = [
        { nom: ["plus gros", "que D"], f: 1.4, coul: "#8a6d1f" },
        { nom: ["diamètre", "D"], f: 1, coul: "#b45309" },
        { nom: ["plus fins", "que D"], f: 0.5, coul: "#c9a86a" },
      ];
      s += rect(xP, yS, wP, yBas - yS, "#fbf8f0", "none", 0);
      const wc = wP / 3, pas = 10.5;
      classes.forEach((c, i) => {
        const x0 = xP + i * wc, xm = x0 + wc / 2, yF = yS + (yHr - yS) * c.f ** 2, r = 2.3 * c.f, a = alea(31 + 7 * i);
        let rang = 0;
        for (let y = yF + r + 2; y < yBas - r; y += pas * 0.85, rang++) for (let x = x0 + 6 + (rang % 2) * pas * 0.5; x < x0 + wc - 4; x += pas) {
          s += `<circle cx="${r1(x + (a() - 0.5) * pas * 0.45)}" cy="${r1(y + (a() - 0.5) * pas * 0.4)}" r="${r1(r)}" fill="${c.coul}"/>`;
        }
        s += ligne(x0 + 3, yF, x0 + wc - 3, yF, c.coul, 1.4);
        s += fleche(id, xm, yS + 3, xm, yF - 3, { type: "bleu", ep: 1.1 });
        s += etiqs(xm, 66, c.nom, { ancre: "middle", taille: 10.5 });
        if (i) s += ligne(x0, yS, x0, yBas, COULEURS.grille, 1);
      });
      s += ligne(xP, yS, xP + wP, yS, EAU, 1.6) + ligne(xP, yS, xP, yBas, TRAIT, 1) + ligne(xP + wP, yS, xP + wP, yBas, TRAIT, 1);
      s += etiqs(xP, yBas + 17, ["les gros grains tombent plus vite : v ∝ D² ;", "au niveau Hr, il ne reste en suspension", "que les grains plus fins que D"], NOTE);
      s += etiq(xP, hauteur - 12, "D = √(18 η Hr / ((ρs − ρw) g t))", { taille: 12, couleur: COULEURS.bleu });
      s += etiqs(xt, 300, ["lectures de 30 s à 24 h : chaque", "lecture R donne la part des", "grains plus fins que D"], NOTE);
      s += etiq(8, 12, "éprouvette et densimètre à l'échelle", { taille: 10, gras: false, couleur: COULEURS.discret });
      return s;
    },
  });
}

// ───────────────────────────── Limites d'Atterberg ───────────────────────

const LAITON = "#d4a63c", LAITON_TRAIT = "#92400e", PATE = "#b08d5b", PATE_SOMBRE = "#7c5a3a";

/** Petite cote verticale (x, de y1 à y2) à flèches extérieures, pour les cotes trop courtes. */
function coteFine(x, y1, y2) {
  const c = COULEURS.cote, t = (y, s) => `<path d="M${r1(x - 3)} ${r1(y + 6 * s)}L${r1(x)} ${r1(y)}L${r1(x + 3)} ${r1(y + 6 * s)}Z" fill="${c}"/>`;
  return ligne(x, y1 - 10, x, y2 + 10, c, 1.1) + t(y1, -1) + t(y2, 1);
}
/** Cote verticale courte (x, de y1 à y2) à flèches intérieures dont les pointes touchent exactement les deux niveaux. */
function coteCourte(x, y1, y2) {
  const c = COULEURS.cote, t = (y, s) => `<path d="M${r1(x - 3)} ${r1(y + 5 * s)}L${r1(x)} ${r1(y)}L${r1(x + 3)} ${r1(y + 5 * s)}Z" fill="${c}"/>`;
  return ligne(x, y1 + 4, x, y2 - 4, c, 1.1) + t(y1, 1) + t(y2, -1);
}
/** Petite cote horizontale (y, de x1 à x2) à flèches extérieures. */
function coteFineH(y, x1, x2) {
  const c = COULEURS.cote, t = (x, s) => `<path d="M${r1(x + 6 * s)} ${r1(y - 3)}L${r1(x)} ${r1(y)}L${r1(x + 6 * s)} ${r1(y + 3)}Z" fill="${c}"/>`;
  return ligne(x1 - 11, y, x2 + 11, y, c, 1.1) + t(x1, -1) + t(x2, 1);
}

/**
 * Coupelle vue de dessus (rayon r) avec sa pâte et la rainure tracée dans
 * l'axe, de l'arrière (charnière, à gauche) vers l'avant ; `fermee` : longueur
 * (px) sur laquelle les lèvres se sont rejointes au centre.
 */
function vueRainure(cx, cy, r, fermee = 0) {
  let s = rect(cx - r - 12, cy - 6, 14, 12, ACIER_FONCE, TRAIT, 1, 'rx="2"');
  s += cercle(cx, cy, r, "#f3e3b5", LAITON_TRAIT, 1.2) + cercle(cx, cy, r - 3, "none", LAITON, 2.2);
  const xa = cx - r * 0.74, xb = cx + r * 0.78;
  s += `<ellipse cx="${r1(cx + 2)}" cy="${r1(cy)}" rx="${r1(r * 0.78)}" ry="${r1(r * 0.68)}" fill="${PATE}" stroke="${PATE_SOMBRE}" stroke-width=".8"/>`;
  // Lèvres de la rainure : 7 px de demi-largeur en haut, refermées au centre sur `fermee`.
  const hw = (x) => {
    const d = Math.abs(x - cx) - fermee / 2;
    return fermee ? 7 * Math.min(1, Math.max(0, d / 14)) : 7;
  };
  const pts = [];
  for (let x = xa; x <= xb + 0.01; x += 2) pts.push([x, hw(x)]);
  s += `<path d="M${pts.map(([x, h]) => `${r1(x)} ${r1(cy - h)}`).join("L")}L${[...pts].reverse().map(([x, h]) => `${r1(x)} ${r1(cy + h)}`).join("L")}Z" fill="${PATE_SOMBRE}" opacity=".55"/>`;
  // Fond de la rainure (2 mm) : la coupelle apparaît, sauf là où la pâte s'est refermée.
  const xf0 = cx - fermee / 2 - 5, xf1 = cx + fermee / 2 + 5;
  s += fermee ? ligne(xa, cy, xf0, cy, LAITON, 2.4) + ligne(xf1, cy, xb, cy, LAITON, 2.4) : ligne(xa, cy, xb, cy, LAITON, 2.4);
  return s;
}

/**
 * Limites d'Atterberg (NF EN ISO 17892-12), sur la fraction 0/400 µm. À
 * gauche, l'appareil de Casagrande vu de côté, à l'échelle : socle en ébonite,
 * coupelle en laiton suspendue à sa charnière, came et manivelle qui la
 * soulèvent de 10 mm puis la lâchent, deux chocs par seconde. Au milieu, la
 * pâte vue de dessus : la rainure tracée à l'outil, puis refermée sur 1 cm au
 * bout de N chocs — wL est la teneur en eau qui la ferme à 25 chocs, lue sur
 * la droite w – lg N. À droite, le rouleau de 3 mm qui se fissure : wP.
 */
export function schemaCasagrande({ largeur = 640, hauteur = 344 } = {}) {
  return svg({
    largeur, hauteur, titre: "Limites d'Atterberg : coupelle de Casagrande et rouleau", contenu: (id) => {
      let s = "";
      // ── Appareil de Casagrande, vu de côté (1,5 px par mm) ──
      const k = 1.5, yT = 196, P = [87, 112], R = 54 * k, xB = 216.5, yC = yT - R, demiCorde = 47 * k;
      const yRim = yC + Math.sqrt(R * R - demiCorde * demiCorde), xR0 = xB - demiCorde, xR1 = xB + demiCorde;
      const yPate = yT - 10 * k, demiPate = Math.sqrt(R * R - (yPate - yC) ** 2);
      // Levée de 10 mm au point bas : rotation de la coupelle autour de la charnière.
      const dx = xB - P[0], dy = yC - P[1], th = Math.asin((yT - 10 * k - R - P[1]) / Math.hypot(dx, dy)) - Math.atan2(dy, dx);
      const rot = ([x, y]) => [P[0] + (x - P[0]) * Math.cos(th) - (y - P[1]) * Math.sin(th), P[1] + (x - P[0]) * Math.sin(th) + (y - P[1]) * Math.cos(th)];
      s += etiq(8, 20, "appareil de Casagrande", { taille: 11.5 });
      s += etiqs(8, 36, ["la came soulève la coupelle de 10 mm, puis la", "lâche : elle retombe sur le socle, 2 chocs par seconde"], NOTE);
      s += rect(72, yT, 225, 75, "#1f2937", "#0f172a", 1.2, 'rx="3"');
      s += rect(80, P[1] - 8, 14, yT - P[1] + 8, ACIER_FONCE, TRAIT, 1);
      let g = chemin(`M${r1(xB - demiPate)} ${r1(yPate)}H${r1(xB + demiPate)}A${r1(R)} ${r1(R)} 0 0 1 ${r1(xB - demiPate)} ${r1(yPate)}Z`, PATE, PATE_SOMBRE, 0.8);
      const bol = `M${r1(xR0)} ${r1(yRim)}A${r1(R)} ${r1(R)} 0 0 0 ${r1(xR1)} ${r1(yRim)}`;
      g += chemin(bol, "none", LAITON_TRAIT, 4.4) + chemin(bol, "none", LAITON, 2.6);
      g += chemin(`M${P[0]} ${P[1]}H${r1(xR0)}V${r1(yRim)}`, "none", "#475569", 5, 'stroke-linejoin="round"');
      s += `<g transform="rotate(${((th * 180) / Math.PI).toFixed(2)} ${P[0]} ${P[1]})">${g}</g>`;
      s += cercle(P[0], P[1], 5, "#334155", "#0f172a", 1);
      // Came en colimaçon sous le bras (le suiveur est au bord du ressaut : la coupelle va tomber), manivelle sur le même arbre.
      const yBras = rot([118, P[1]])[1] + 2.5, rM = 13, C = [118, yBras + rM], pc = [];
      for (let i = 0; i <= 30; i++) { const u = i / 30, a = -Math.PI / 2 + 0.25 + u * (2 * Math.PI - 0.25); pc.push(`${i ? "L" : "M"}${r1(C[0] + (6 + (rM - 6) * u) * Math.cos(a))} ${r1(C[1] + (6 + (rM - 6) * u) * Math.sin(a))}`); }
      s += chemin(pc.join("") + "Z", ACIER, TRAIT, 1.2, 'stroke-linejoin="round"');
      const M = [C[0] + 20 * Math.cos((100 * Math.PI) / 180), C[1] + 20 * Math.sin((100 * Math.PI) / 180)];
      s += ligne(C[0], C[1], M[0], M[1], "#334155", 3.4, 'stroke-linecap="round"') + cercle(C[0], C[1], 3, "#334155", "#0f172a", 0.8) + cercle(M[0], M[1], 4.5, COULEURS.effort, "#7f1d1d", 0.8);
      s += renvoi(C[0] - 11, C[1] + 2, 74, C[1] + 6, ["came"], { ancre: "end" });
      s += renvoi(M[0] - 4, M[1] + 1, 74, M[1] + 12, ["manivelle"], { ancre: "end" });
      // Hauteur de chute : 10 mm entre le point bas de la coupelle et le socle.
      const yBas = yT - 10 * k;
      s += ligne(xB + 4, yBas, 268, yBas, COULEURS.cote, 0.8, 'stroke-dasharray="2 2"');
      s += coteCourte(262, yBas, yT);
      s += etiq(270, yT - 3, "10 mm", { taille: 11, couleur: COULEURS.cote });
      const avant = rot([xR1, yRim]);
      s += fleche(id, avant[0] + 16, avant[1] - 8, avant[0] + 16, avant[1] + 20, { ep: 1.5 });
      s += etiq(avant[0] + 24, avant[1] + 12, "chute", { taille: 10.5, couleur: COULEURS.effort });
      s += renvoi(avant[0], avant[1] - 2, avant[0] + 8, avant[1] - 38, ["coupelle", "en laiton"]);
      const pp = rot([xB - 18, yPate - 7]);
      s += etiq(pp[0], pp[1], "pâte", { ancre: "middle", taille: 11 });
      s += etiq(184.5, yT + 92, "socle en ébonite", { ancre: "middle", taille: 11 });
      s += etiq(8, hauteur - 27, "wL : teneur en eau qui ferme la rainure à 25 chocs,", { taille: 11 });
      s += etiq(8, hauteur - 12, "lue sur la droite w – lg N (essais entre 15 et 35 chocs)", NOTE);
      // ── La pâte vue de dessus (1,2 px par mm) : rainure tracée, puis refermée ──
      const rC = 47 * 1.2, cy = 108, x1 = 426, x2 = 566;
      s += etiq(x1, 22, "rainure tracée", { ancre: "middle", taille: 11 });
      s += vueRainure(x1, cy, rC);
      // Outil à rainurer, tiré de l'arrière vers l'avant, en fin de passe.
      const xo = x1 + rC * 0.78;
      s += `<g transform="rotate(-35 ${r1(xo)} ${cy})"><path d="M${r1(xo - 1.5)} ${cy}h3l3.5 -9h-10z" fill="${ACIER_FONCE}" stroke="${TRAIT}" stroke-width=".9"/>`
        + rect(xo - 6, cy - 34, 12, 25, ACIER, TRAIT, 1, 'rx="1.5"') + rect(xo - 4, cy - 58, 8, 25, "#64748b", "#334155", 1, 'rx="3"') + "</g>";
      const manche = [xo - 50 * Math.sin((35 * Math.PI) / 180), cy - 50 * Math.cos((35 * Math.PI) / 180)];
      s += renvoi(manche[0] - 3, manche[1] - 2, 446, 40, ["outil à rainurer"], { ancre: "middle" });
      s += fleche(id, x1 - rC * 0.5, cy + rC + 12, x1 + rC * 0.5, cy + rC + 12, { ep: 1.3 });
      s += etiq(x1, cy + rC + 29, "de l'arrière vers l'avant", { ancre: "middle", ...NOTE });
      const fermee = 10 * 1.2;
      s += etiq(x2, 22, "après N chocs", { ancre: "middle", taille: 11 });
      s += vueRainure(x2, cy, rC, fermee);
      for (const x of [x2 - fermee / 2, x2 + fermee / 2]) s += ligne(x, cy + 4, x, cy + rC + 10, COULEURS.cote, 0.8, 'stroke-dasharray="2 2"');
      s += coteFineH(cy + rC + 8, x2 - fermee / 2, x2 + fermee / 2);
      s += etiq(x2, cy + rC + 29, "rainure fermée sur 1 cm", { ancre: "middle", taille: 10.5, couleur: COULEURS.cote });
      // ── Limite de plasticité : rouleau de 3 mm (agrandi, 3 px par mm) ──
      s += etiq(366, 222, "limite de plasticité", { taille: 11.5 });
      s += etiq(552, 222, "rouleau agrandi", { ancre: "end", taille: 10, gras: false, couleur: COULEURS.discret });
      const yR = 252, dR = 3 * 3;
      s += rect(366, 233, 186, 38, "#e0f2fe", "#94a3b8", 1, 'rx="4"');
      s += rect(382, yR - dR / 2, 150, dR, PATE, PATE_SOMBRE, 0.9, `rx="${dR / 2}"`);
      for (let i = 0; i < 6; i++) { const x = 394 + i * 24 + (i % 2) * 5; s += chemin(`M${x} ${r1(yR - dR / 2)}l2 3.5l-2 2l2 3.5`, "none", "#451a03", 1.1); }
      s += coteFine(542, yR - dR / 2, yR + dR / 2);
      s += etiq(550, yR + 4, "3 mm", { taille: 11, couleur: COULEURS.cote });
      s += etiqs(366, 288, ["roulé à la main sur une plaque lisse, le rouleau", "se fissure en atteignant 3 mm : sa teneur", "en eau est la limite de plasticité wP"], NOTE);
      s += etiq(largeur - 10, hauteur - 12, "IP = wL − wP", { ancre: "end", taille: 12.5, couleur: COULEURS.bleu });
      return s;
    },
  });
}

// ─────────────────────────────── Valeur de bleu ──────────────────────────

const BLEU_FONCE = "#1e3a8a", BLEU_CLAIR = "#7dd3fc";

/** Flèche de rotation fine autour d'un axe vertical (demi-ellipse avant, pointe dessinée). */
function rotationFine(xc, y, rx, ry) {
  const x1 = xc + rx;
  return chemin(`M${r1(xc - rx)} ${r1(y)}A${rx} ${ry} 0 1 0 ${r1(x1)} ${r1(y - 1)}`, "none", COULEURS.effort, 1.5)
    + `<path d="M${r1(x1 - 3.5)} ${r1(y + 2)}L${r1(x1 + 0.5)} ${r1(y - 6)}L${r1(x1 + 3.5)} ${r1(y + 2.5)}Z" fill="${COULEURS.effort}"/>`;
}

/** Tache sur le papier filtre : dépôt bleu foncé (rayon r), auréole humide incolore ou bleu clair. */
function tache(x, y, r, aureole, graine = 1) {
  const a = alea(graine);
  let d = "";
  for (let j = 0; j <= 24; j++) {
    const t = (j / 24) * 2 * Math.PI, rr = r * (1 + 0.07 * Math.sin(5 * t + graine) + 0.05 * (a() - 0.5));
    d += `${j ? "L" : "M"}${r1(x + rr * Math.cos(t))} ${r1(y + rr * Math.sin(t))}`;
  }
  return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r * 1.55)}" fill="${aureole ? BLEU_CLAIR : "#e2e8f0"}" opacity="${aureole ? 0.85 : 0.8}"/>`
    + chemin(d + "Z", BLEU_FONCE, "none", 0);
}

/**
 * Valeur de bleu de méthylène d'un sol (essai à la tache, NF P94-068, reprise
 * par la NF EN 17542-3), sur la fraction 0/5 mm : la prise d'essai, dans
 * 500 mL d'eau déminéralisée, est dispersée par l'agitateur à ailettes (5 min
 * à 700 tr/min, puis 400 tr/min) ; la burette injecte la solution de bleu à
 * 10 g/L par 5 mL, puis par 2 mL ; une minute après chaque injection, la
 * baguette dépose une goutte sur le papier filtre. Tant que l'argile fixe tout
 * le bleu, la tache n'a pas d'auréole ; l'auréole bleu clair qui tient cinq
 * minutes (une tache par minute) termine l'essai. VBS = 100 C B / m0.
 */
export function schemaBleu({ largeur = 640, hauteur = 360 } = {}) {
  return svg({
    largeur, hauteur, titre: "Valeur de bleu de méthylène : essai à la tache", contenu: (id) => {
      let s = "";
      // ── Agitateur, bécher, burette ──
      const yP = 320, xb0 = 40, xb1 = 152, yNiv = 244, xA = 94;
      s += rect(8, yP, 282, 6, "#e2e8f0", "#94a3b8", 1);
      s += rect(14, 30, 8, yP - 30, ACIER_FONCE, TRAIT, 1) + rect(8, yP - 6, 52, 6, "#64748b", "#334155", 0.8);
      s += rect(14, 34, xA - 20, 8, ACIER_FONCE, TRAIT, 1);
      s += rect(xA - 30, 26, 60, 40, "#e2e8f0", TRAIT, 1.3, 'rx="5"') + cercle(xA + 16, 46, 7, "#f8fafc", TRAIT, 1) + ligne(xA + 16, 46, xA + 20, 42, COULEURS.effort, 1.3);
      // Suspension (sol 0/5 mm, eau, bleu fixé), ailettes.
      s += rect(xb0 + 2, yNiv, xb1 - xb0 - 4, yP - yNiv - 2, "#8f8fa8", "none", 0, 'opacity=".55"');
      s += ligne(xb0 + 2, yNiv, xb1 - 2, yNiv, "#475569", 1);
      s += rect(xA - 2, 66, 4, yP - 34 - 66, ACIER, TRAIT, 0.8);
      s += rect(xA - 22, yP - 34, 44, 9, ACIER, TRAIT, 1) + rect(xA - 7, yP - 34, 14, 9, ACIER_FONCE, TRAIT, 0.8);
      s += rotationFine(xA, 92, 16, 4.5);
      s += etiq(xA + 22, 96, "rotation", { taille: 10, couleur: COULEURS.effort });
      s += chemin(`M${xb0} 150V${yP}H${xb1}V150`, VERRE, TRAIT, 1.6) + chemin(`M${xb0 - 6} 150h8M${xb1 - 2} 150h8`, "none", TRAIT, 1.6);
      s += ligne(xb0 + 6, 160, xb0 + 6, yP - 8, "#fff", 2.5, 'opacity=".7"');
      // Burette graduée, robinet, bec au-dessus du bécher ; gouttes de bleu.
      const xu = 181;
      s += rect(xu - 5, 26, 10, 104, "#f8fafc", TRAIT, 1) + rect(xu - 4, 52, 8, 78, "#1d4ed8", "none", 0, 'opacity=".85"');
      for (let i = 0; i <= 8; i++) s += ligne(xu - 5, 34 + i * 12, xu - (i % 2 ? 2 : 0), 34 + i * 12, TRAIT, 0.8);
      s += rect(xu - 9, 131, 18, 5, "#64748b", "#334155", 0.8, 'rx="2"');
      s += chemin(`M${xu} 136V141L${xb1 - 8} 148`, "none", TRAIT, 2.2);
      for (const y of [160, 186, 212]) s += `<path d="M${xb1 - 8} ${y - 4}q2.6 4 0 6.5q-2.6 -2.5 0 -6.5z" fill="#1d4ed8"/>`;
      s += etiq(8, 18, "agitateur à ailettes", { taille: 11 });
      s += etiqs(xu + 13, 44, ["burette : bleu", "à 10 g/L"], { taille: 11 });
      s += etiqs(xu + 13, 72, ["injecté par 5 mL,", "puis par 2 mL"], NOTE);
      s += renvoi(xb1 - 10, 272, 170, 268, ["suspension :", "sol 0/5 mm sec", "+ 500 mL d'eau"]);
      s += renvoi(xA + 22, yP - 30, 170, 312, ["ailettes"]);
      s += etiqs(8, hauteur - 20, ["dispersion : 5 min à 700 tr/min,", "puis 400 tr/min pendant l'essai"], NOTE);
      // ── Papier filtre : une tache une minute après chaque injection ──
      const xT0 = 364, pas = 31, yT = 62, V = [5, 10, 15, 20, 25, 25, 25, 25];
      s += etiq(306, 20, "papier filtre", { taille: 11.5 });
      s += rect(306, 32, 326, 72, "#fdfdfb", "#cbd5e1", 1.2, 'rx="3"');
      V.forEach((v, i) => {
        s += tache(xT0 + i * pas, yT, 6, i >= 4, 3 + i);
        s += etiq(xT0 + i * pas, yT + 30, String(v), { ancre: "middle", taille: 10.5, halo: false, couleur: i >= 4 ? COULEURS.bleu : COULEURS.discret });
      });
      // Baguette : elle dépose la neuvième goutte.
      const xg = xT0 + 8 * pas;
      s += ligne(xg + 2, yT - 12, xg + 26, 14, "#94a3b8", 4, 'stroke-linecap="round" opacity=".9"') + ligne(xg + 2, yT - 12, xg + 26, 14, "#e2e8f0", 1.4, 'stroke-linecap="round"');
      s += `<path d="M${xg} ${yT - 8}q2.6 4 0 6.5q-2.6 -2.5 0 -6.5z" fill="#3b5b9a"/>`;
      s += renvoi(xg + 18, 24, xg - 26, 20, ["baguette"], { ancre: "end" });
      s += etiq(312, yT + 30, "V (mL)", { taille: 10, gras: false, halo: false, couleur: COULEURS.discret });
      s += ligne(xT0 - 8, 112, xT0 + 3 * pas + 8, 112, COULEURS.discret, 1) + ligne(xT0 + 4 * pas - 8, 112, xg + 8, 112, COULEURS.bleu, 1);
      s += etiq(xT0 + 1.5 * pas, 126, "pas d'auréole", { ancre: "middle", taille: 10.5, couleur: COULEURS.discret });
      s += etiq(xT0 + 6 * pas, 126, "l'auréole tient 5 min", { ancre: "middle", taille: 10.5, couleur: COULEURS.bleu });
      // ── Deux taches agrandies ──
      const yA = 182;
      s += tache(370, yA, 20, false, 11) + tache(520, yA, 20, true, 17);
      s += renvoi(370, yA + 6, 410, yA + 44, ["dépôt : sol et bleu fixé"]);
      s += renvoi(385, yA - 22, 402, 148, ["auréole incolore : eau"], { couleur: COULEURS.discret });
      s += renvoi(548, yA - 14, 566, 162, ["auréole", "bleu clair"], { couleur: COULEURS.bleu });
      s += etiqs(306, 252, ["le sol fixe encore tout le bleu :", "on injecte et on recommence"], NOTE);
      s += etiqs(478, 252, ["bleu en excès : si elle tient", "5 min, l'essai est fini"], NOTE);
      // ── Résultat ──
      s += etiq(306, 296, "VBS = 100 · C · B / m0", { taille: 12.5, couleur: COULEURS.bleu });
      s += etiq(478, 296, "g de bleu pour 100 g de sol", { taille: 10.5 });
      s += etiqs(306, 314, ["B = V × 10 g/L : masse de bleu injectée (g)", "m0 : masse sèche de la prise de 0/5 mm (g)", "C : part du 0/5 mm dans le sol 0/63 mm"], NOTE);
      s += etiq(largeur - 8, hauteur - 8, "échelle non respectée", { ancre: "end", taille: 10, gras: false, couleur: COULEURS.discret });
      return s;
    },
  });
}

// ─────────────────────────────── Équivalent de sable ─────────────────────

const LIQUIDE = "#f4f7e4", FLOCULAT = "#d5c09a";

/**
 * Équivalent de sable (NF EN 933-8), sur la fraction 0/2 mm : l'éprouvette
 * (Ø intérieur 32 mm, traits repères à 100 et 380 mm), dessinée à l'échelle
 * après agitation, lavage et vingt minutes de repos. Le sable s'est déposé au
 * fond ; au-dessus, le floculat d'argile ; puis le liquide clair. On lit h1,
 * sommet du floculat, à la règle ; h2, sommet du sable, au piston taré
 * (1 kg) que l'on descend jusqu'à lui. ES = 100 h2/h1. À côté, le tube
 * laveur relié au flacon de solution lavante.
 */
export function schemaEquivalentSable({ largeur = 640, hauteur = 380 } = {}) {
  return svg({
    largeur, hauteur, titre: "Équivalent de sable", contenu: (id) => {
      const K = 0.75, Y0 = 366, Y = (h) => Y0 - h * K, xc = 92, R = 16 * K; // 0,75 px/mm ; fond intérieur ; axe ; rayon intérieur
      const h1 = 170, h2 = 85, hL = 380, hE = 430; // mm
      let s = "";
      // Règle graduée, à gauche.
      s += rect(36, Y(410), 16, Y(0) - Y(410), "#fef3c7", "#a16207", 1);
      for (let h = 0; h <= 400; h += 10) s += ligne(52, Y(h), 52 - (h % 50 ? 4 : 8), Y(h), "#78350f", h % 100 ? 0.7 : 1.2);
      for (let h = 0; h <= 400; h += 100) s += etiq(32, Y(h) + 4, String(h), { ancre: "end", taille: 10, halo: false, couleur: "#78350f" });
      s += etiq(32, Y(410) - 6, "mm", { ancre: "end", taille: 10, gras: false, halo: false, couleur: "#78350f" });
      // Contenu après 20 min de repos : sable, floculat, liquide clair.
      s += rect(xc - R, Y(hL), 2 * R, Y(h1) - Y(hL), LIQUIDE, "none", 0);
      s += rect(xc - R, Y(h1), 2 * R, Y(h2) - Y(h1), FLOCULAT, "none", 0, 'opacity=".9"');
      s += grains(xc - R + 1, Y(h1) + 2, 2 * R - 2, Y(h2) - Y(h1) - 4, 26, 0.9, "#8b7355", 5);
      s += rect(xc - R, Y(h2), 2 * R, Y(0) - Y(h2), "#ead49c", "none", 0);
      s += grains(xc - R + 1, Y(h2) + 1, 2 * R - 2, Y(0) - Y(h2) - 2, 70, 1.3, "#b08d4a", 9);
      // Piston taré posé sur le sable : pied, tige, manchon appuyé sur l'éprouvette, lest.
      s += rect(xc - 9.5, Y(h2) - 5, 19, 5, ACIER_FONCE, "#334155", 1);
      s += rect(xc - 2, 18, 4, Y(h2) - 5 - 18, ACIER, TRAIT, 0.8);
      s += rect(xc - 15, Y(hE) - 9, 30, 9, "#64748b", "#334155", 1, 'rx="2"');
      s += rect(xc - 10, 4, 20, 16, "#475569", "#1e293b", 1, 'rx="3"');
      // Verre, traits repères, socle.
      s += chemin(`M${r1(xc - R - 2)} ${r1(Y(hE))}V${r1(Y0 + 2)}H${r1(xc + R + 2)}V${r1(Y(hE))}`, "none", TRAIT, 1.6);
      s += ligne(xc - R + 3, Y(hE) + 6, xc - R + 3, Y0 - 6, "#fff", 2, 'opacity=".7"');
      for (const h of [100, hL]) s += ligne(xc - R - 2, Y(h), xc - R + 5, Y(h), COULEURS.rouge, 1.4) + ligne(xc + R - 5, Y(h), xc + R + 2, Y(h), COULEURS.rouge, 1.4);
      s += rect(xc - R - 14, Y0 + 2, 2 * R + 28, 7, ACIER_FONCE, TRAIT, 0.8, 'rx="2"');
      // Cotes h1 et h2, depuis le fond.
      const xh2 = xc + R + 18, xh1 = xc + R + 42;
      s += ligne(xc + R + 2, Y(h2), xh2 + 4, Y(h2), COULEURS.cote, 0.8, 'stroke-dasharray="2 2"');
      s += ligne(xc + R + 2, Y(h1), xh1 + 4, Y(h1), COULEURS.cote, 0.8, 'stroke-dasharray="2 2"');
      s += ligne(xc + R + 2, Y0 + 2, xh1 + 4, Y0 + 2, COULEURS.cote, 0.8, 'stroke-dasharray="2 2"');
      s += cote(id, xh2, Y0 + 2, xh2, Y(h2), "") + cote(id, xh1, Y0 + 2, xh1, Y(h1), "");
      s += etiq(xh2 + 6, (Y(h2) + Y0) / 2 + 5, "h2", { taille: 12, couleur: COULEURS.cote });
      s += etiq(xh1 + 6, (Y(h1) + Y(h2)) / 2 + 5, "h1", { taille: 12, couleur: COULEURS.cote });
      s += renvoi(xc + 10, 12, 124, 16, ["piston taré : 1 kg"]);
      s += renvoi(xc + 15, Y(hE) - 5, 124, Y(hE) - 1, ["manchon"]);
      s += renvoi(xc + R + 2, Y(hL), 124, Y(hL) + 4, ["trait de 380 mm"]);
      // Tube laveur et flacon de solution lavante.
      const xt = 262;
      s += rect(282, 92, 70, 6, "#94a3b8", "#64748b", 1);
      s += chemin("M294 92V46q0-8 8-8h30q8 0 8 8V92z", "#ecfccb", "#4d7c0f", 1.3) + rect(296, 58, 42, 33, "#d9f99d", "none", 0, 'opacity=".8"');
      s += chemin(`M328 86V28H${xt}V150`, "none", "#65a30d", 2.2);
      s += rect(xt - 3, 150, 6, 170, ACIER, TRAIT, 1) + chemin(`M${xt - 3} 320l3 9l3 -9z`, ACIER_FONCE, TRAIT, 1);
      for (const y of [312, 318]) s += ligne(xt - 6, y, xt - 3, y, EAU, 1.6) + ligne(xt + 3, y, xt + 6, y, EAU, 1.6);
      s += etiqs(296, 114, ["solution", "lavante"], { taille: 11 });
      s += renvoi(xt + 3, 240, 278, 236, ["tube laveur"]);
      s += etiqs(278, 252, ["il remet les fines en", "suspension jusqu'au", "trait de 380 mm"], NOTE);
      // Lecture, légende, déroulement.
      const xr = 414;
      s += etiq(xr, 40, "ES = 100 · h2 / h1", { taille: 14, couleur: COULEURS.bleu });
      s += etiqs(xr, 66, ["h1 : sommet du floculat, lu à la règle", "h2 : sommet du sable, lu au piston", "descendu jusqu'à reposer sur le sable"], { taille: 10.5, gras: false });
      [["liquide clair", LIQUIDE], ["floculat d'argile", FLOCULAT], ["sable", "#ead49c"]].forEach(([nom, coul], i) => {
        s += rect(xr, 120 + i * 22, 18, 13, coul, "#94a3b8", 1) + etiq(xr + 26, 131 + i * 22, nom, { taille: 11 });
      });
      s += etiq(xr, 210, "avant la lecture", { taille: 11 });
      s += etiqs(xr, 226, ["deux prises de 120 g de 0/2 mm sec ;", "solution lavante jusqu'au trait de 100 mm,", "10 min d'imbibition ;", "éprouvette bouchée : 90 cycles en 30 s ;", "lavage au tube jusqu'au trait de 380 mm ;", "20 min de repos"], NOTE);
      s += etiq(xr, hauteur - 14, "éprouvette à l'échelle", { taille: 10, gras: false, couleur: COULEURS.discret });
      return s;
    },
  });
}
