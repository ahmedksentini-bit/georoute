// Couche de forme : dimension des plus gros éléments, épaisseurs et classe de
// la plateforme [GTR 2024 F1 § 4.2.1, 4.3.4 et 4.3.5, tableaux 13 et 18 à 23].

import { horsDomaine } from "./outils.js";

/**
 * Plus grande longueur admise pour une couche de forme non traitée [F1 §
 * 4.2.1, tableau 13] : Lmax ≤ 250 mm et ≤ la moitié de l'épaisseur de la
 * couche élémentaire compactée (e en m, Lmax en mm).
 */
export const lmaxCoucheForme = (e) => Math.min(250, (1000 * e) / 2);

/** Dimension maximale des matériaux traités : 63 mm malaxés en centrale, 100 mm en place [F1 § 4.2.1]. */
export const DMAX_TRAITE = { centrale: 63, place: 100 };

/**
 * Classe de la plateforme quand la couche de forme est plus mince que
 * l'épaisseur préconisée : celle de l'arase [F1 § 4.3.4].
 */
export const PLATEFORME_DE_L_ARASE = { AR1: "PF1", AR2: "PF2", AR3: "PF3", AR4: "PF4" };

// Cases des tableaux. Un nombre est une épaisseur en mètres ; les renvois
// sont portés par de petits objets, les cases sans épaisseur par un code :
//  · "reglage"     : couche de réglage de 10 à 15 cm (GNT, D ≤ 31,5 mm) si les
//                    matériaux de la PST ont les caractéristiques d'une couche
//                    de forme (tableau 20 : vérifiées par une étude appropriée) ;
//  · "sansObjet"   : « - » : l'arase AR3 dépasse déjà la classe visée ;
//  · "nonGaranti"  : PF3 que le tableau 20 ne garantit pas sans connaître les
//                    matériaux (case fusionnée : voir les règles d'optimisation) ;
//  · "impossible"  : case vide du tableau 21 (PF3 sur une PST1) ;
//  · "peuApproprie": renvoi (1) du tableau 22 ;
//  · "vide"        : case vide du tableau 23 (classe mécanique 3, PF2 ou PF2qs).
const geo = (e) => ({ e, geotextile: true }); // renvoi : géotextile, 10 cm de moins
const deux = (e) => ({ e, deuxCouches: true }); // renvoi : en général deux couches
const oblig = (e) => ({ e, obligatoire: true }); // renvoi (1) du tableau 20

/**
 * Épaisseurs de couche de forme du GTR 2024 [F1 § 4.3.5] :
 *  · securitaire  — tableau 20, matériaux non traités non connus ;
 *  · optimisation — tableau 21, épaisseurs minimales quand les matériaux sont
 *                   connus (retours d'expérience validés ou planche d'essai) ;
 *  · chaux        — tableau 22, matériaux F3 traités à la chaux seule ;
 *  · liant        — tableau 23, matériaux traités aux liants hydrauliques
 *                   éventuellement associés à la chaux, par classe mécanique.
 * Les tableaux 20 et 21 sont indexés par « PST/AR » ; les tableaux 22 et 23
 * par l'arase, dont la portance à court terme doit atteindre 35 MPa (AR1)
 * ou 50 MPa (AR2).
 */
export const EPAISSEURS_2024 = {
  securitaire: {
    "PST1/AR1": { PF2: geo(0.75), PF2qs: geo(1.0), PF3: "nonGaranti" },
    "PST2/AR1": { PF2: 0.5, PF2qs: 0.75, PF3: "nonGaranti" },
    "PST3/AR1": { PF2: 0.4, PF2qs: 0.65, PF3: "nonGaranti" },
    "PST3/AR2": { PF2: oblig(0.3), PF2qs: 0.4, PF3: "nonGaranti" },
    "PST4/AR2": { PF2: "reglage", PF2qs: 0.4, PF3: "nonGaranti" },
    "PST5/AR2": { PF2: "reglage", PF2qs: 0.4, PF3: "nonGaranti" },
    "PST6/AR2": { PF2: "reglage", PF2qs: 0.4, PF3: "nonGaranti" },
    "PST5/AR3": { PF2: "sansObjet", PF2qs: "sansObjet", PF3: "reglage" },
    "PST6/AR3": { PF2: "sansObjet", PF2qs: "sansObjet", PF3: "reglage" },
  },
  optimisation: {
    "PST1/AR1": { PF2: geo(0.6), PF2qs: geo(0.75), PF3: "impossible" },
    "PST2/AR1": { PF2: 0.5, PF2qs: 0.65, PF3: 0.9 },
    "PST3/AR1": { PF2: 0.35, PF2qs: 0.55, PF3: 0.8 },
    "PST3/AR2": { PF2: 0.25, PF2qs: 0.35, PF3: 0.5 },
    "PST4/AR2": { PF2: "reglage", PF2qs: 0.3, PF3: 0.5 },
    "PST5/AR2": { PF2: "reglage", PF2qs: 0.35, PF3: 0.5 },
    "PST6/AR2": { PF2: "reglage", PF2qs: 0.35, PF3: 0.5 },
    "PST5/AR3": { PF2: "sansObjet", PF2qs: "sansObjet", PF3: "reglage" },
    "PST6/AR3": { PF2: "sansObjet", PF2qs: "sansObjet", PF3: "reglage" },
  },
  chaux: {
    AR1: { PF2: deux(0.5), PF2qs: deux(0.6), PF3: deux(0.7) },
    AR2: { PF2: "peuApproprie", PF2qs: deux(0.45), PF3: deux(0.5) },
  },
  liant: {
    AR1: {
      3: { PF2: "vide", PF2qs: "vide", PF3: 0.3, PF4: deux(0.4) },
      4: { PF2: 0.3, PF2qs: 0.35, PF3: 0.35, PF4: deux(0.45) },
      5: { PF2: 0.35, PF2qs: deux(0.45), PF3: deux(0.5), PF4: deux(0.55) },
    },
    AR2: {
      3: { PF2qs: "vide", PF3: 0.25, PF4: 0.3 },
      4: { PF2qs: 0.25, PF3: 0.3, PF4: 0.35 },
      5: { PF2qs: 0.3, PF3: 0.35, PF4: deux(0.45) },
    },
  },
};

/** Les quatre façons de dimensionner une couche de forme, avec leur tableau. */
export const TYPES_COUCHE_FORME = {
  securitaire: { tableau: 20, nom: "non traitée, règles sécuritaires (matériaux non connus)" },
  optimisation: { tableau: 21, nom: "non traitée, optimisation (matériaux connus)" },
  chaux: { tableau: 22, nom: "sol F3 traité à la chaux seule" },
  liant: { tableau: 23, nom: "traitée aux liants hydrauliques (± chaux)" },
};

const REGLAGE = "couche de réglage de 10 à 15 cm (GNT, D ≤ 31,5 mm) si les matériaux de la PST ont les caractéristiques d'une couche de forme";

/**
 * Épaisseur préconisée par le GTR 2024 pour une couche de forme.
 * Entrées : type (securitaire, optimisation, chaux ou liant), pst (PST0 à
 * PST6), ar (AR0 à AR4), pf (PF2, PF2qs, PF3 ou PF4), classe (3, 4 ou 5,
 * pour le type liant). Renvoie { applicable, tableau, e (m), reglage,
 * deuxCouches, geotextile, notes } ou un motif hors domaine.
 */
export function epaisseurCoucheForme({ type, pst = null, ar, pf, classe = null }) {
  const T = TYPES_COUCHE_FORME[type];
  if (!T) return horsDomaine(`Type de couche de forme inconnu : ${type}.`);
  if (pst === "PST0" || ar === "AR0") return horsDomaine("PST0 ou arase AR0 : pas de couche de forme avant d'avoir reclassé la PST (purge, drainage ou traitement).");
  const notes = [];
  let cellule;
  if (type === "securitaire" || type === "optimisation") {
    if (!pst) return horsDomaine("Le cas de PST est nécessaire pour une couche de forme non traitée.");
    const ligne = EPAISSEURS_2024[type][`${pst}/${ar}`];
    if (!ligne) return horsDomaine(`Le tableau ${T.tableau} ne prévoit pas le couple ${pst}/${ar}.`);
    if (!(pf in ligne)) return horsDomaine(`Le tableau ${T.tableau} ne vise pas ${pf} avec une couche de forme non traitée.`);
    cellule = ligne[pf];
    if (pst === "PST1") notes.push("ces épaisseurs supposent une portance de 15 à 20 MPa environ sur l'arase à l'exécution");
    if (type === "optimisation" && pf === "PF3" && typeof cellule !== "string") notes.push("certains matériaux granulaires n'atteignent pas PF3 sans traitement aux liants");
    if (typeof cellule !== "string") notes.push("trafic de chantier plus lourd que l'approvisionnement de la couche de fondation : majorer de 10 à 20 cm");
  } else {
    if (pst === "PST1") return horsDomaine("Couche de forme traitée : 35 MPa à court terme sont requis sur l'arase, ce qu'une PST1 n'offre pas.");
    if (ar !== "AR1" && ar !== "AR2") return horsDomaine(`Le tableau ${T.tableau} ne traite que des arases AR1 et AR2.`);
    const ligne = type === "chaux" ? EPAISSEURS_2024.chaux[ar] : EPAISSEURS_2024.liant[ar][classe];
    if (!ligne) return horsDomaine(`Classe mécanique ${classe ?? "?"} non tabulée : 3, 4 ou 5.`);
    if (!(pf in ligne)) return horsDomaine(`Le tableau ${T.tableau} ne vise pas ${pf} sur une arase ${ar}${ar === "AR2" ? " : une couche de forme traitée y donne au moins PF2qs" : ""}.`);
    cellule = ligne[pf];
    notes.push(`portance d'au moins ${ar === "AR1" ? 35 : 50} MPa à court terme sur l'arase`);
    if (pst === "PST2") notes.push("couche de forme traitée déconseillée sur une PST2 (remontée de nappe) : la réaliser au moins sur une PST3");
    if (type === "chaux") notes.push("matériaux F3 traités à la chaux seule");
  }
  switch (cellule) {
    case "sansObjet": return horsDomaine(`L'arase ${ar} dépasse déjà la classe ${pf} : la question ne se pose pas (« - » au tableau ${T.tableau}).`);
    case "nonGaranti": return horsDomaine("Matériaux non connus : le tableau 20 ne garantit pas PF3 avec une couche de forme non traitée. Recourir aux règles d'optimisation (tableau 21) ou à un traitement aux liants.");
    case "impossible": return horsDomaine("Le tableau 21 ne prévoit pas de PF3 sur une PST1 avec une couche de forme non traitée.");
    case "peuApproprie": return horsDomaine("Tableau 22 : solution peu appropriée sur une arase AR2 pour une PF2 ; elle se justifie pour viser PF2qs ou PF3.");
    case "reglage": return { applicable: true, tableau: T.tableau, e: 0.15, reglage: true, deuxCouches: false, geotextile: false, notes: [REGLAGE + (T.tableau === 20 ? ", vérifiées par une étude appropriée" : ""), ...notes] };
    case "vide": {
      const e = EPAISSEURS_2024.liant[ar][classe].PF3;
      return { applicable: true, tableau: T.tableau, e, reglage: false, deuxCouches: false, geotextile: false,
        notes: [`case vide du tableau 23 : avec un matériau de classe 3, on retient l'épaisseur de la PF3 (${String(e).replace(".", ",")} m)`, ...notes] };
    }
    default: {
      const c = typeof cellule === "number" ? { e: cellule } : cellule;
      if (c.geotextile) notes.unshift("un géotextile de séparation et de filtration sous la couche réduit l'épaisseur de 10 cm");
      if (c.deuxCouches) notes.unshift("en général deux couches pour atteindre la compacité visée en fond de couche");
      if (c.obligatoire) notes.unshift("couche de forme obligatoire ; viser au moins PF2qs est en général plus économique");
      return { applicable: true, tableau: T.tableau, e: c.e, reglage: false, deuxCouches: !!c.deuxCouches, geotextile: !!c.geotextile, notes };
    }
  }
}

/**
 * Classe de plateforme obtenue avec une épaisseur réalisée e : celle visée si
 * e atteint l'épaisseur préconisée, celle de l'arase sinon [F1 § 4.3.4].
 */
export function plateformeObtenue({ e, preconise, pf, ar }) {
  return e + 1e-9 >= preconise ? pf : PLATEFORME_DE_L_ARASE[ar] ?? "—";
}
