// Bancs d'essai du cours : chaque <div class="banc" data-banc="nom"> reçoit son
// bouton de lancement ; le module du banc (src/bancs/nom.js) n'est chargé qu'à
// l'ouverture, pour que la page reste légère. À l'impression, le banc se
// réduit à son titre et à une mention.
const MODULES = {
  tamisage: () => import("./bancs/tamisage.js"),
  sedimentometrie: () => import("./bancs/sedimentometrie.js"),
  casagrande: () => import("./bancs/casagrande.js"),
  bleu: () => import("./bancs/bleu.js"),
  "equivalent-sable": () => import("./bancs/equivalent-sable.js"),
  proctor: () => import("./bancs/proctor.js"),
  ipi: () => import("./bancs/ipi.js"),
  losangeles: () => import("./bancs/losangeles.js"),
  microdeval: () => import("./bancs/microdeval.js"),
  fragmentabilite: () => import("./bancs/fragmentabilite.js"),
  compacteur: () => import("./bancs/compacteur.js"),
  gammadensimetre: () => import("./bancs/gammadensimetre.js"),
  panda: () => import("./bancs/panda.js"),
  plaque: () => import("./bancs/plaque.js"),
  dynaplaque: () => import("./bancs/dynaplaque.js"),
  chantier: () => import("./bancs/chantier.js"),
  traitement: () => import("./bancs/traitement.js"),
  gel: () => import("./bancs/gel.js"),
};

// Sur PC (grand écran, souris), le banc ouvert sort de la colonne de texte et prend la
// largeur de la page : scène, lectures et toutes les courbes se voient d'un coup d'œil
// (règles .banc-ouvert en fin de site.css). Sa marge négative dépend de la place de la
// colonne dans la page : on la mesure ici, et à chaque changement de largeur. Même
// mise en page que les bancs du cours de chaussées (chaussee.ksr-infra.org).
const PC = matchMedia("screen and (min-width: 1100px) and (hover: hover) and (pointer: fine)");
const ouverts = [];

function caler(banc) {
  const cadre = banc.parentElement, r = cadre.getBoundingClientRect();
  const gauche = `${Math.round(r.left + cadre.clientLeft + parseFloat(getComputedStyle(cadre).paddingLeft))}px`;
  const page = `${document.documentElement.clientWidth}px`;
  if (banc.style.getPropertyValue("--banc-gauche") !== gauche) banc.style.setProperty("--banc-gauche", gauche);
  if (banc.style.getPropertyValue("--banc-page") !== page) banc.style.setProperty("--banc-page", page);
}

/** À l'ouverture sur PC : la page défile pour montrer le banc entier, ou au moins sa scène et ses courbes. */
function cadrer(banc) {
  if (!PC.matches) return;
  const barre = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;
  const zone = [".banc-scene", ".banc-cote", ".banc-courbes"].map((s) => banc.querySelector(s)?.getBoundingClientRect()).filter(Boolean);
  if (!zone.length) return;
  const haut = Math.min(...zone.map((r) => r.top)), bas = Math.max(...zone.map((r) => r.bottom));
  const tete = scrollY + banc.getBoundingClientRect().top - barre - 8;   // le banc depuis son titre
  const fin = scrollY + bas + 10 - innerHeight;                          // le bas des courbes juste visible
  scrollTo({ top: Math.max(0, Math.min(Math.max(tete, fin), scrollY + haut - barre - 8)) });
}

// La largeur de la page change avec la fenêtre, mais aussi quand la barre de défilement apparaît.
// Le banc se recale à l'image suivante, hors de la notification de l'observateur : changer la
// mise en page pendant celle-ci la relancerait (« ResizeObserver loop completed with undelivered
// notifications »), erreur que le bandeau de panne du socle afficherait à chaque redimensionnement.
let recalage = 0;
const recaler = () => { recalage ||= requestAnimationFrame(() => { recalage = 0; ouverts.forEach(caler); }); };
if ("ResizeObserver" in window) new ResizeObserver(recaler).observe(document.documentElement);
else addEventListener("resize", recaler, { passive: true });

for (const banc of document.querySelectorAll(".banc[data-banc]")) {
  const charger = MODULES[banc.dataset.banc];
  const bouton = banc.querySelector(".banc-ouvrir");
  if (!charger || !bouton) continue;
  bouton.addEventListener("click", async () => {
    bouton.disabled = true;
    bouton.textContent = "Chargement du banc…";
    try {
      const m = await charger();
      bouton.remove();
      m.monter(banc);
      caler(banc);
      ouverts.push(banc);
      banc.classList.add("banc-ouvert");
      requestAnimationFrame(() => cadrer(banc));
    } catch (e) {
      console.error(e);
      bouton.disabled = false;
      bouton.textContent = "Lancer le banc d'essai";
      banc.insertAdjacentHTML("beforeend", `<p class="method-note">Le banc n'a pas pu se charger : ${String(e.message).replace(/[<>&]/g, "")}</p>`);
    }
  });
}
