// Schémas fixes du cours : chaque <figure data-schema="nom"> reçoit, avant sa
// légende, le schéma exporté sous ce nom. Les schémas qui suivent un calcul
// restent dans le script de leur chapitre ; ceux-ci illustrent le texte.

import * as cours from "./schemas-cours.js";
import * as identification from "./schemas-identification.js";
import * as laboratoire from "./schemas-laboratoire.js";
import * as terrain from "./schemas-terrain.js";

const SCHEMAS = { ...cours, ...identification, ...laboratoire, ...terrain };

for (const f of document.querySelectorAll("figure[data-schema]")) {
  const dessin = SCHEMAS[f.dataset.schema];
  // Un nom inconnu doit se voir à l'écran, pas laisser un cadre vide.
  f.insertAdjacentHTML("afterbegin", dessin ? dessin() : `<p class="method-note">Schéma « ${f.dataset.schema} » introuvable.</p>`);
}
