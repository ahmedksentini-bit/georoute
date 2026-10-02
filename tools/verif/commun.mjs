// Outils communs aux vérifications dans le navigateur (tools/verif) : un
// serveur statique de la racine du site sur un port libre, Chromium piloté par
// Playwright, et la lecture des options de la ligne de commande.
//
// Playwright n'est pas une dépendance du site (Cloudflare Pages n'installe
// rien). Une fois pour toutes, à la racine du dépôt :
//   npm i --no-save playwright && npx playwright install chromium
// ou bien PW_MODULE=/chemin/vers/node_modules/playwright si un Playwright est
// déjà installé ailleurs ; NAVIGATEUR=/chemin/vers/chrome impose un navigateur
// (même variable que tools/polycopie.py).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

export const RACINE = normalize(join(dirname(fileURLToPath(import.meta.url)), "..", ".."));

/** Import d'un module du site par son chemin depuis la racine (src/gtr/…). */
export const importer = (chemin) => import(pathToFileURL(join(RACINE, chemin)).href);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".webmanifest": "application/manifest+json", ".pdf": "application/pdf",
};

/** Sert la racine du site ; renvoie l'adresse de base et de quoi fermer le serveur. */
export function servir() {
  return new Promise((ok) => {
    const serveur = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
        if (p.endsWith("/")) p += "index.html";
        const f = normalize(join(RACINE, p));
        if (!f.startsWith(RACINE + sep)) throw new Error("hors du site");
        const corps = await readFile(f);
        res.writeHead(200, { "Content-Type": TYPES[extname(f)] || "application/octet-stream" });
        res.end(corps);
      } catch {
        res.writeHead(404);
        res.end("404");
      }
    });
    serveur.listen(0, "127.0.0.1", () => ok({
      base: `http://127.0.0.1:${serveur.address().port}/`,
      fermer: () => serveur.close(),
    }));
  });
}

/** Lance Chromium par Playwright, ou explique comment l'installer. */
export async function chromium() {
  const require = createRequire(join(RACINE, "package.json"));
  let pw;
  try {
    pw = require(process.env.PW_MODULE || "playwright");
  } catch {
    console.error("Playwright introuvable. À la racine du dépôt : npm i --no-save playwright && npx playwright install chromium\n"
      + "(ou PW_MODULE=/chemin/vers/node_modules/playwright).");
    process.exit(2);
  }
  return pw.chromium.launch(process.env.NAVIGATEUR ? { executablePath: process.env.NAVIGATEUR } : {});
}

/**
 * Options de la ligne de commande : `opt("--largeur", 1200)` lit la valeur qui
 * suit l'option, `drap("--plein")` dit si l'option est présente, `positions`
 * garde les arguments restants dans l'ordre. `avecValeur` liste les options
 * suivies d'une valeur (pour ne pas prendre cette valeur pour un argument).
 */
export function options(avecValeur = [], argv = process.argv.slice(2)) {
  const positions = [];
  for (let i = 0; i < argv.length; i++) {
    if (avecValeur.includes(argv[i])) i++;
    else if (!argv[i].startsWith("--")) positions.push(argv[i]);
  }
  const opt = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
  const drap = (n) => argv.includes(n);
  return { opt, drap, positions };
}

/** Relève exceptions, erreurs de console et requêtes en échec d'une page. */
export function suivre(page, base, { avertissements = false } = {}) {
  const pbs = [];
  const ici = () => page.url().replace(base, "/");
  page.on("pageerror", (e) => pbs.push(`exception ${ici()} : ${e.message}`));
  page.on("console", (m) => {
    // Le blocage du service worker est voulu (contexte serviceWorkers: "block").
    if (/Service Worker registration blocked/.test(m.text())) return;
    if (m.type() === "error" || (avertissements && m.type() === "warning")) pbs.push(`console.${m.type()} ${ici()} : ${m.text().slice(0, 200)}`);
  });
  page.on("response", (r) => { if (r.status() >= 400) pbs.push(`HTTP ${r.status()} ${r.url().replace(base, "/")}`); });
  return pbs;
}

/** Textes qui trahissent un calcul cassé. */
export const SUSPECT = /NaN|undefined|Infinity|\[object/;
