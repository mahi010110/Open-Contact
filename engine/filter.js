/* ============================================================
   OpenContact — moteur · recherche, filtres & tris
   Reçoit les pistes ET les critères en paramètres, rend la liste
   ordonnée : l'interface lit ses champs, le moteur ne lit jamais
   l'écran. Tri multi-niveaux (3 max) : `sorts` = [{sort, dir}] —
   principal puis départages, chacun avec son sens (`dir` vide =
   sens naturel, NATURAL_DIR). Motif décorer-trier : chaque clé
   est calculée UNE fois par piste, jamais dans le comparateur —
   des milliers de pistes restent un O(n log n) bon marché.
   Les pistes sans valeur (pas d'action, pas de coordonnées)
   restent en fin de liste quel que soit le sens.
   ============================================================ */
import { DOMAINS, STATUSES, POSITIONS } from './model.js';
import { scoreOf } from './score.js';
import { distKm } from './utils.js';

export const NATURAL_DIR = {
  recent: 'desc', action: 'asc', dist: 'asc', score: 'desc',
  az: 'asc', status: 'asc', contacts: 'desc'
};
export const SORT_LEVELS_MAX = 3;

const collator = new Intl.Collator('fr');
const STATUS_ORD = Object.keys(STATUSES);
/* la clé d'un critère — null = « pas de valeur », toujours en fin */
const KEY_FNS = {
  recent:   c => c.updatedAt || 0,
  az:       c => c.name,
  action:   c => c.nextAction || null,
  score:    c => scoreOf(c),
  status:   c => STATUS_ORD.indexOf(c.status),
  contacts: c => (c.contacts || []).length,
  dist:     (c, pos) => c.lat == null ? null : distKm(pos.lat, pos.lng, c.lat, c.lng)
};
const STR_KEY = { az: 1, action: 1 };   /* comparées par collation, pas par soustraction */

/* ---------- chercher comme on TAPE ----------
   Deux réflexes d'un étudiant français, sur un téléphone, que la
   recherche ne servait pas :
   — il tape SANS accent (« societe », « cyberdefense ») alors que la
     fiche en porte — mesuré : zéro résultat, sans rien pour le dire ;
   — il tape DEUX mots (« cyber lyon ») en croyant restreindre. Comme
     les champs étaient concaténés dans un ordre fixe et comparés
     littéralement, deux mots venus de deux champs ne se touchaient
     jamais : zéro résultat là encore, y compris quand les deux mots
     sont bel et bien dans la fiche.
   On plie donc les accents des deux côtés, et chaque mot se cherche
   pour lui-même : TOUS doivent être là, n'importe où, dans n'importe
   quel ordre. Le coût est nul — la dépense, c'est de construire la
   chaîne d'une piste, et elle se construit toujours une seule fois. */
export function fold(s){
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   /* é → e, ç → c, ï → i … */
    .replace(/[‘’‛`]/g, "'")             /* « l’ESN » se tape « l'ESN » */
    .toLowerCase();
}
/* Plier CARACTÈRE PAR CARACTÈRE, en garantissant la même longueur :
   une position trouvée dans la chaîne pliée désigne alors la même
   lettre dans l'originale. C'est ce qui permet de montrer le mot
   trouvé tel qu'il est ÉCRIT, accents compris. Un caractère dont le
   pliage changerait la longueur (rarissime) reste tel quel : mieux
   vaut ne pas le surligner que désaligner tout ce qui suit. */
export function foldAligned(s){
  const str = String(s == null ? '' : s);
  let out = '';
  for (const ch of str){
    const f = fold(ch);
    if (f.length === ch.length){ out += f; continue; }
    const low = ch.toLowerCase();
    out += (low.length === ch.length) ? low : ch;
  }
  return out;
}
export function queryWords(q){
  return fold(q).split(/\s+/).filter(Boolean);
}

function blobOf(c){
  const cts = (c.contacts || []).map(t => [t.name, t.role, t.email, t.phone, t.note].join(' ')).join(' ');
  const pos = (c.positions || []).map(p => POSITIONS[p]).join(' ');
  return fold([c.name, c.city, c.address, c.desc, c.techs, c.tips, c.process,
          DOMAINS[c.domain]?.label, pos, cts].join(' '));
}
export function filterCompanies(companies, opts){
  const { domain = '', status = '', sort = 'recent', dir = '', userPos = null } = opts || {};
  const words = queryWords(opts && opts.q);
  const arr = companies.filter(c => {
    if (domain && c.domain !== domain) return false;
    if (status && c.status !== status) return false;
    if (words.length){
      const b = blobOf(c);
      if (!words.every(w => b.includes(w))) return false;
    }
    return true;
  });
  /* niveaux : `sorts` (multi) sinon le couple {sort, dir} historique ;
     un critère inconnu — ou « dist » sans position — est ignoré */
  let levels = (opts && Array.isArray(opts.sorts) && opts.sorts.length)
    ? opts.sorts : [{ sort, dir }];
  levels = levels
    .filter(l => l && KEY_FNS[l.sort] && (l.sort !== 'dist' || userPos))
    .slice(0, SORT_LEVELS_MAX);
  if (!levels.length) levels = [{ sort: 'recent', dir: '' }];
  const signs = levels.map(l => ((l.dir || NATURAL_DIR[l.sort] || 'desc') === 'asc') ? 1 : -1);
  const strs = levels.map(l => STR_KEY[l.sort] || 0);
  /* décorer : toutes les clés d'un coup, une passe O(n) */
  const deco = arr.map(c => ({ c, k: levels.map(l => KEY_FNS[l.sort](c, userPos)) }));
  deco.sort((A, B) => {
    for (let i = 0; i < levels.length; i++){
      const va = A.k[i], vb = B.k[i];
      if (va == null || vb == null){                 /* sans valeur : en fin, quel que soit le sens */
        if (va != null) return -1;
        if (vb != null) return 1;
        continue;
      }
      const d = strs[i] ? collator.compare(va, vb) : va - vb;
      if (d) return signs[i] * d;
    }
    return (B.c.updatedAt || 0) - (A.c.updatedAt || 0);   /* départage final : les récentes d'abord */
  });
  return deco.map(x => x.c);
}

/* ---------- POURQUOI cette piste est-elle là ? ----------
   Chercher « SOC » remontait une ligne qui affiche nom · action ·
   statut · ville : le mot trouvé vit dans `techs`, invisible. Un
   résultat qu'on ne peut pas expliquer se relit une deuxième fois,
   ou se prend pour une erreur.
   Les champs sont rangés dans l'ordre où ils EXPLIQUENT le mieux —
   un contact d'abord, c'est la raison la plus fréquente qu'une ligne
   ne montre pas ; le nom et la ville en dernier, ils sont déjà à
   l'écran. L'appelant dit ce qu'il affiche déjà (`skip`), et rien ne
   se dit deux fois. */
function hintFields(c){
  const out = [];
  const put = (field, text) => { const s = String(text || '').trim(); if (s) out.push({ field, text: s }); };
  (c.contacts || []).forEach(t =>
    put('contact', [[t.name, t.role].filter(Boolean).join(' — '), t.email, t.phone, t.note]
      .filter(Boolean).join(' · ')));
  put('techs', c.techs);
  put('desc', c.desc);
  put('tips', c.tips);
  put('process', c.process);
  put('address', c.address);
  put('positions', (c.positions || []).map(p => POSITIONS[p]).filter(Boolean).join(', '));
  put('domain', DOMAINS[c.domain] && DOMAINS[c.domain].label);
  put('name', c.name);
  put('city', c.city);
  return out;
}
export const HINT_MAX = 64;
/* l'extrait autour de la trouvaille, + les positions à surligner.
   Le moteur ne rend JAMAIS de HTML : il rend du texte et des couples
   [début, longueur], l'interface échappe et habille (règle de sens
   unique — `engine/` ne connaît pas l'écran). */
function excerpt(text, words, max){
  const low = foldAligned(text);
  const found = [];
  for (const w of words){
    let i = low.indexOf(w);
    while (i >= 0){ found.push([i, w.length]); i = low.indexOf(w, i + w.length); }
  }
  if (!found.length) return null;
  /* deux mots cherchés peuvent se recouvrir (« cy » et « cyber ») :
     on fond les plages, sinon les balises s'imbriqueraient */
  found.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged = [];
  for (const [s, l] of found){
    const last = merged[merged.length - 1];
    if (last && s <= last[0] + last[1]) last[1] = Math.max(last[1], s + l - last[0]);
    else merged.push([s, l]);
  }
  /* la fenêtre s'ouvre un peu AVANT la trouvaille — un extrait qui
     commence pile sur le mot cherché perd le mot qui le porte — et se
     cale sur une frontière de mot.
     Elle se cale en RECULANT. Avancer jusqu'à l'espace qui précède la
     trouvaille rend « …SOC » : le mot cherché tout seul, précédé de
     trois points qui cachent la seule chose que l'extrait devait
     apporter (mesuré sur « Cybersécurité, SOC » — l'extrait n'ajoutait
     rien au surlignage). On ne recule que si la trouvaille tient encore
     dans la fenêtre, sinon elle sortirait par la droite ; sans espace
     en arrière, le début du champ EST une frontière. */
  const first = merged[0][0];
  let a = Math.max(0, first - 12);
  if (a > 0){
    const back = text.lastIndexOf(' ', a);
    const debut = back >= 0 ? back + 1 : 0;
    if (first - debut < max) a = debut;
    else {
      const sp = text.indexOf(' ', a - 1);
      if (sp >= 0 && sp < first) a = sp + 1;
    }
  }
  const b = Math.min(text.length, a + max);
  const head = a > 0 ? '…' : '';
  return {
    text: head + text.slice(a, b) + (b < text.length ? '…' : ''),
    marks: merged.filter(([s]) => s >= a && s < b)
      .map(([s, l]) => [s - a + head.length, Math.min(l, b - s)])
  };
}
export function searchHint(c, q, opts){
  const words = queryWords(q);
  if (!words.length) return null;
  const skip = new Set((opts && opts.skip) || []);
  const max = (opts && opts.max) || HINT_MAX;
  const fields = hintFields(c);
  /* Si ce qui est DÉJÀ à l'écran explique tous les mots, il n'y a rien
     à révéler. Chercher « cyber » sur « Cyberdéfense Lyon » n'a pas
     besoin d'une deuxième ligne pour ajouter « Cybersécurité » : ce
     serait de l'encre sur ce que l'œil vient de lire, exactement le
     papier peint que la règle du regard interdit. La ligne ne parle
     donc que quand elle a quelque chose de neuf à dire. */
  if (skip.size){
    const vu = fold(fields.filter(f => skip.has(f.field)).map(f => f.text).join(' '));
    if (words.every(w => vu.includes(w))) return null;
  }
  for (const f of fields){
    if (skip.has(f.field)) continue;
    const cut = excerpt(f.text, words, max);
    if (cut) return { field: f.field, text: cut.text, marks: cut.marks };
  }
  return null;
}

/* ---------- le bac « contacts à rattacher » ----------
   Il vit au-dessus de la liste et ignorait la recherche : chercher
   « Nadia » affichait Nadia dans le bac ET « Rien ne correspond à
   Nadia » juste en dessous. Un écran ne peut pas se contredire. */
export function filterOrphans(orphans, q){
  const words = queryWords(q);
  const arr = (orphans || []).slice();
  if (!words.length) return arr;
  return arr.filter(o => {
    const b = fold([o.name, o.role, o.email, o.phone, o.note, o.link,
      (o.extra && o.extra.company) || ''].join(' '));
    return words.every(w => b.includes(w));
  });
}
