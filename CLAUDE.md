# Consignes de travail — georoute (terrassements routiers, GTR 2024)

Ce fichier dit **comment travailler** sur le dépôt. Le `README.md` dit ce que
contient le site, son architecture et ses principes : le lire d'abord.

## Le projet en bref

- Site de cours statique et PWA « Terrassements routiers — Guide GTR 2024 » :
  cours interactif (`cours.html`), exerciseur, bureau de calcul, polycopié PDF.
  Public : élèves ingénieurs en génie civil (ENIS, Dr Ahmed Ksentini).
- En ligne sur **georoute.ksr-infra.org** (Cloudflare Pages, projet `georoute`).
  Branche de production `main` : chaque fusion se publie seule. Chaque branche
  a son aperçu sur `<branche>.georoute-bq4.pages.dev`, signalé par le contrôle
  « Cloudflare Pages » de la PR.
- Jumeau du site des fondations (fond.ksr-infra.org, dépôt
  `ahmedksentini-bit/fondation`) : même socle, même habillage, même ton. Ses
  modules servent de référence de style et de qualité.
- Aucun framework, aucune compilation : modules ES, figures SVG produites en
  chaînes de caractères (`src/figures.js`), tests `node:test`.

## Les documents de référence : `docs/`, hors dépôt

Le dossier `docs/` est exclu par `.gitignore`. L'auteur y dépose ses copies :

| Document | Nom conseillé |
|---|---|
| GTR 2024, fascicule 1 — principes généraux (Cerema) | `docs/GTR2024-F1.pdf` |
| GTR 2024, fascicule 2 — annexes techniques | `docs/GTR2024-F2.pdf` |
| GTR 1992, 2ᵉ édition 2000, fascicules I et II | `docs/GTR1992.pdf` |
| GTS — traitement des sols à la chaux et aux liants hydrauliques (2000) | `docs/GTS.pdf` |
| Normes (NF P11-300, NF EN 16907-1 et -2, NF P94-…) | `docs/normes/` |
| Fichiers de travail : transcriptions, captures, rendus de pages | `docs/travail/` |

Si les noms diffèrent, s'adapter plutôt que renommer.

Pour lire les PDF : l'outil de lecture avec le paramètre `pages`, ou PyMuPDF
(`import pymupdf`). Avec PyMuPDF, `page.get_text()` donne le texte,
`page.get_pixmap(dpi=150).save(...)` une image pour vérifier un tableau case par
case, et `page.get_drawings()` les tracés vectoriels d'un abaque (lecture
exacte des courbes, sans numérisation à l'œil).

Les numéros de page cités dans `src/gtr/tables-*.js` et dans leurs `ANOMALIES`
sont **ceux imprimés** dans le fascicule 2. Dans le PDF de 104 pages, la page
imprimée 57 est la 59ᵉ.

## Droits : ce qui peut entrer dans le dépôt

Les guides et les normes sont protégés. Le site est public.

- Jamais dans le dépôt : les PDF, des images de leurs pages, leur texte extrait,
  ni de longs passages recopiés. Le cours reformule avec ses propres mots et
  renvoie au guide par un repère entre crochets.
- Ce qui peut entrer : les données des tableaux (seuils, classes, codes, valeurs
  de compactage, épaisseurs), avec la page ou le tableau d'origine, et les
  libellés courts des cases.
- Les fichiers intermédiaires (transcriptions JSON avec le texte du guide,
  rendus de pages, captures) vont dans `docs/travail/`.
- Avant chaque commit, `git status` ne doit rien montrer de `docs/`, et aucun
  PDF ni aucune image de page du guide ne doit être indexé.

## Règles de fond

- **Tout en français** : textes affichés, commentaires, noms des tests,
  messages de commit. Nombres à la française (`fr()`, `frd()` de
  `src/exos/alea.js`, `f()`, `fd()` du moteur des bancs).
- **Tout chiffre affiché vient d'un solveur** de `src/gtr/`. Cela vaut pour les
  calculateurs du cours, les bancs, les exercices et le bureau. Une valeur n'est
  jamais recopiée à la main. Les solveurs sont des fonctions pures, sans DOM,
  et testées.
- Une méthode qui ne s'applique pas le dit : `horsDomaine(motif)`
  (`src/gtr/outils.js`) renvoie `{ applicable: false, motif }`, sinon le solveur
  renvoie `{ applicable: true, … }`.
- Les **écarts imprimés dans le guide** (code qui contredit son libellé, N ou
  Q/L qui ne suit pas de e et de Q/S…) sont gardés tels qu'imprimés et listés
  dans les `ANOMALIES` du module, page et case à l'appui. On ne corrige pas le
  guide en silence.
- Les tableaux transcrits (`src/gtr/tables-remblai.js`,
  `tables-couche-forme.js`, `tables-compactage.js`) sont maintenant la source.
  L'outil de conversion d'origine n'est pas dans le dépôt. On les corrige à la
  main, le PDF sous les yeux, et on tient `ANOMALIES` à jour.
- Repères de source dans le cours : `<span class="ref">[F1 § 4.3.4, tableaux 18
  et 19]</span>`, `[F1 tableau 15]`, `[F2 annexe 3]`, `[GTR 92]`,
  `[GTS, partie B]`, les normes par leur numéro (`[NF P94-117-1]`). La légende
  de ces repères se trouve en tête de `cours.html`.
- **Comparer les deux éditions** chaque fois que c'est utile : le GTR 1992
  (NF P11-300, classes A B C D R) reste cité par beaucoup de rapports.
- Un modèle d'enseignement (bicouche de la couche de forme, gel par la formule
  de Stefan) montre une tendance. Il ne remplace ni un tableau du guide ni une
  étude, et le site le dit.
- Style du site jumeau : chaque module commence par un commentaire d'en-tête
  qui explique ce qu'il fait et sur quoi il s'appuie. Pas de bavardage.

## Commandes

```text
npm test                                   # 130 contrôles : ils doivent rester verts
node tools/generer-exercices.mjs [chN…]    # banques data/exercices-chN.json
python tools/generer-sw.py georoute-v3     # coquille du service worker (sw.js)
python tools/polycopie.py                  # polycopié PDF à partir de cours.html
npx serve .                                # le site en local (ou python -m http.server)
```

- **Banques d'exercices** : à régénérer après toute retouche de `src/exos/` ou
  d'un solveur utilisé par un exercice (le test `exercices` échoue sinon). Le
  champ `exercices` de chaque chapitre de `data/chapitres.json` vaut son nombre
  de modèles.
- **Service worker** : à régénérer dès qu'un module ou un fichier de données
  apparaît ou disparaît (le test `pages` contrôle la coquille). À chaque
  publication, changer la version (`georoute-v2` aujourd'hui, puis
  `georoute-v3`…) **et** la constante `VERSION_ATTENDUE` de `src/socle.js`,
  avec la même valeur.
- **Polycopié** : à régénérer après toute retouche de `cours.html`. Il faut
  PyMuPDF et Chrome, Edge ou Chromium (`NAVIGATEUR=/chemin/vers/chrome` en
  désigne un). Aujourd'hui : 88 pages, environ 10,6 Mo. Ouvrir le PDF obtenu,
  regarder le sommaire, les signets et les pages modifiées.

### Vérifications dans le navigateur : `tools/verif/`

Elles utilisent Playwright, qui n'est pas une dépendance du site. À installer
une fois : `npm i --no-save playwright && npx playwright install chromium`, ou
désigner un Playwright existant par `PW_MODULE=/chemin/vers/node_modules/playwright`.
Chaque script sert la racine du dépôt sur un port libre.

| Script | Rôle |
|---|---|
| `node tools/verif/pages.mjs [page…] [--sw]` | exceptions, erreurs de console, requêtes en échec, sorties vides, NaN sur les quatre pages |
| `node tools/verif/calculateurs.mjs [cours.html]` | temps de remplissage des sorties ; chaque liste de choix de chaque calculateur prend toutes ses valeurs |
| `node tools/verif/exercices.mjs [chN…]` | chaque modèle de l'exerciseur ouvert avec deux graines |
| `node tools/verif/schemas.mjs <dossier> [--seul schemaX]` | PNG de chaque schéma, plus les libellés hors cadre, chevauchants ou posés sur un tracé |
| `node tools/verif/capture.mjs <page> <png> [--banc nom --fin --texte] [--largeur 400]` | capture d'une page, d'un élément ou d'un banc réglé et mené au bout |
| `node tools/verif/zoom-schema.mjs <module> <schemaX> x y l h <png>` | gros plan sur un détail de schéma |

Les signalements de `schemas.mjs` sur les tracés sont approchés. Un libellé
peut être posé exprès sur un trait, avec un halo. Il faut **regarder les
images**. Les captures vont dans `docs/travail/`.

## Avant de pousser

1. `npm test` est vert.
2. Les banques sont régénérées si un exercice ou un solveur a changé.
3. Le polycopié est régénéré si `cours.html` a changé.
4. Pour une publication : `sw.js` et `VERSION_ATTENDUE` sont passés à la version suivante.
5. `tools/verif/pages.mjs` et `calculateurs.mjs` ne signalent aucun défaut.
   Ce qui a changé a été regardé en capture, sur ordinateur et à 400 px de large.
6. Le `README.md` est à jour si un compte a bougé (schémas, calculateurs, bancs,
   modèles d'exercices).
7. Rien de `docs/` n'est indexé.

Travailler sur une branche, ouvrir une PR vers `main`, attendre le contrôle
« Cloudflare Pages », puis fusionner. Les messages de commit sont en français :
une ligne de résumé, puis le détail utile.

## Ajouter…

### Un modèle d'exercice

- Dans `src/exos/chNN.js`, ajouter au tableau `export default` un modèle
  `{ id: "chN-…", titre, difficulte: 1 | 2 | 3, generer(a) }`. `generer` renvoie
  `{ enonce, donnees?, figure?, questions }`.
- Outils de `src/exos/alea.js` : `a.entre(min, max, pas)`, `a.entier`,
  `a.choix`, `a.tirage`, `a.reel` ; `nombre(texte, reponse, unite, explication,
  { rel, abs })`, `choix(…)`, `choixMelange(a, texte, [bonne, ...fausses],
  explication)`, `donnee(label, valeur)`.
- Une situation de chantier ou de laboratoire concrète, des données tirées sur
  des pas ronds, des unités partout. L'explication refait le calcul avec les
  nombres de l'énoncé et cite la règle du GTR.
- Tolérance de 2 % par défaut, plus large pour une lecture graphique.
- Les distracteurs sont des erreurs classiques : mauvais seuil, mauvaise
  édition, 63 ou 80 µm, état hydrique voisin. Jamais deux options identiques.
- Le modèle doit être valide pour toutes les graines : en générer quelques
  centaines et les passer à `controler` de `src/exos/index.js`. **La bonne
  option doit changer d'un tirage à l'autre.**
- Ensuite : mettre à jour `data/chapitres.json` (`exercices`), régénérer la
  banque du chapitre, mettre à jour le compte du README, lancer
  `tools/verif/exercices.mjs chN`.

### Un banc d'essai animé

- Créer `src/bancs/<nom>.js`, qui exporte `monter(banc)`. Il s'appuie sur
  `charpente`, `boucle`, `brancherMarche` et `lectures` (`src/bancs/moteur.js`),
  et montre l'organe de l'essai au travail dans une loupe
  `fenetreLoupe(c, "…")` (`src/bancs/loupe.js`). Un test exige cette loupe.
- Prendre les matériaux de `src/bancs/materiaux.js` : un même sol donne les
  mêmes résultats d'un essai à l'autre, et se classe dans la classe qu'il
  annonce.
- Les résultats viennent des solveurs. Le bruit est déterministe (pas de
  `Math.random()`). La procédure, les dimensions et les durées suivent la norme,
  citée en commentaire et dans le bilan.
- L'essai se déroule en temps réel, avec des vitesses ×1, ×10… Il compte 3 à 5
  afficheurs. Le bilan donne une `<p class="final-result">` qui dit ce que le
  résultat signifie pour le GTR 2024.
- L'inscrire dans `MODULES` de `src/bancs.js`, et le poser dans `cours.html`
  (copier le balisage d'un banc existant :
  `<div class="banc" data-banc="nom">…<button class="primary banc-ouvrir">`).
- Vérifier avec `tools/verif/capture.mjs cours.html#chN <png> --banc nom --fin --texte`,
  puis `--marche 4000` en cours d'essai et `--largeur 400`.

### Un schéma

- Écrire une fonction `schemaXxx()` dans le module de sa famille :
  `src/schemas-cours.js` pour un schéma explicatif, `-identification`,
  `-laboratoire` ou `-terrain` pour un appareil d'essai. La boîte à outils
  commune est `src/schemas-outils.js` (`etiq`, `renvoi`, `rect`, `terrain`…),
  avec `src/figures.js`.
- Elle renvoie `<svg viewBox="0 0 W H" …>`, de 600 à 640 px de large. Un libellé
  ne se pose ni sur un tracé ni sur un autre libellé. Les proportions de
  l'appareil sont respectées, ou bien l'exagération est signalée.
- La poser dans `cours.html` avec
  `<figure class="figure-cours" data-schema="schemaXxx"><figcaption>…</figcaption></figure>`.
  `src/cours-schemas.js` réunit les exports `schema*` des quatre modules : un
  nouveau module doit y être ajouté, ainsi que dans `tests/schemas.test.mjs`.
- Vérifier avec `tools/verif/schemas.mjs docs/travail/schemas --seul schemaXxx`
  et regarder l'image, puis régénérer le polycopié.

### Un calculateur du cours

- Balisage dans `cours.html` : un bloc `<div class="calc" id="calcXxx">` avec
  ses champs (`data-curseur="min max pas"` les dote d'un curseur), une
  `<div class="figure" id="xxxFig">` et une `<p class="final-result" id="xxxOut">`.
  Copier un calculateur voisin.
- Code dans `src/cours-chN.js` : `brancher([ids…], garde("xxxOut", maj))`
  (`src/ui.js`). Les valeurs par défaut reprennent un exemple du guide : elles
  deviennent l'exemple chiffré du polycopié.
- Vérifier avec `tools/verif/calculateurs.mjs`.

### Un module du bureau de calcul

S'inspirer de `src/bureau/plateforme.js` : une fonction `calculer…(valeurs)`
qui appelle les solveurs et produit étapes, figure et note de calcul. Le module
s'inscrit dans `MODULES` de `src/bureau.js`.

## Chantiers ouverts

Par ordre d'intérêt. Chacun se termine par des tests, puis par la mise à jour du
cours, du polycopié et du README s'ils sont touchés.

1. **Relire le site sur les documents complets.** Les pages 1 à 67 du
   fascicule 1 n'ont été lues que sous forme de texte extrait, où les tableaux
   sortent parfois en désordre. La suite (§ 4.2.2 à la fin) l'a été sur
   l'extrait du PDF. Le GTS n'a été lu qu'en partie (parties A et B). Vérifier
   en priorité les seuils de classement et d'états hydriques
   (`src/gtr/classification.js`), le tableau 17 des cas de PST
   (`src/gtr/pst.js`) et les repères `[F1 § …]` du cours.
2. **Abaque des matériaux traités** (F1 figure 12, E et Rt à 90 jours, avec le
   tableau 14). `FRONTIERES_ZONES` (`src/gtr/traitement.js`) est encore
   numérisée à ±5 % sur la figure du GTR 2000. Relever les frontières sur la
   figure 12, si possible par `get_drawings()`, puis mettre à jour la constante
   et son commentaire, la note « édition 2000 » du calculateur `calcZone`
   (chapitre 11 de `cours.html`), le commentaire de l'abaque dans
   `src/exos/ch11.js`, le README et les tests.
3. **Aptitude au traitement en couche de forme** (GTS partie C, NF P94-100).
   `aptitudeTraitement` dit apte si Gv ≤ 5 % et Rtb ≥ 0,2 MPa, inapte si
   Gv > 10 % ou Rtb < 0,1 MPa. Vérifier ces critères pour une couche de forme
   (le cours, chapitre 12, renvoie au GTS) et l'usage de la chaux vive.
4. **F1 tableau 15** : comparer les libellés des codes G W T S de
   `RUBRIQUES_CDF` (`src/gtr/utilisation.js`) au tableau.
5. **Recontrôler les `ANOMALIES`** des trois tables sur le PDF du fascicule 2.
   Elles ont été vérifiées sur des images de cases rendues depuis ce PDF ; un
   second regard, le guide complet en main, reste utile.
6. **Variété des exercices** : pour ch6-journee (question 1), ch6-compactage,
   ch11-bicouche-inverse (question 4), ch13-gelifraction (question 4) et
   ch15-bouteur (question 4), la bonne option est presque toujours la même.
   Faire varier les données pour qu'elle change.
7. **Normes des essais en place** : vérifier le banc dynaplaque (plaque
   dynamique légère de 10 kg, Ø 300 mm, Evd = 22,5/s) au regard de la
   NF P94-117-2 que cite le GTR, le Panda (NF P94-105), et les moules `MOULES`
   de `src/gtr/proctor.js`, aux dimensions simplifiées, au regard des normes
   Proctor et CBR.
8. **Bureau de calcul** : il classe un sol ou une roche à partir des essais,
   mais ne propose pas les matériaux alternatifs (AN, AM…). Les tables et le
   calculateur du chapitre 6 les contiennent pourtant. Il n'a pas non plus
   l'« étude paramétrique » du bureau des fondations (`src/bureau.js` du dépôt
   `fondation`).
9. Le fascicule 1 imprime « GTR 2023 » à la page 91 (coquille) : à signaler
   là où le cours cite ce passage.
10. Le dépôt `fondation` garde, dans sa branche `claude/loving-shannon-irkfod`,
    une ancienne copie du site, dont un polycopié de 76 pages. Proposer à
    l'auteur de supprimer cette branche ; ne pas le faire sans son accord.
