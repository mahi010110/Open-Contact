/* ============================================================
   OpenContact — moteur · le clavier au poste (lot R8)
   (docs/propositions/R8-le-clavier.md, validée le 20 octobre 2026)

   Deux choses, et rien d'autre :
   ① les touches d'une lettre — cinq gestes du jour, chacun écrit dans
     le bouton qu'il commande (§5 : une touche s'annonce DANS ce qu'elle
     commande, jamais dans un écran d'aide). Elles se COUPENT (WCAG
     2.1.4 : qui dicte à la voix les déclencherait en parlant), elles
     n'agissent jamais pendant qu'un champ a le curseur, jamais avec un
     modificateur ;
   ② Ctrl K (⌘K) : chercher et faire. On tape « aztek », la piste et ses
     gestes ; « karim », lui écrire ; « semaine », la semaine. La fenêtre
     ne propose que des gestes qui existent déjà à l'écran : aucune
     fonction ne vit seulement là.

   On lit la lettre PRODUITE (`key`), jamais la position de la touche :
   « / » se fait en Maj+: sur un AZERTY, et c'est bien « / » qui arrive.
   Fonctions pures, aucun accès au DOM ni au réseau.
   ============================================================ */
import { fold, queryWords, filterCompanies } from './filter.js';

/* ---------- ① les lettres ---------- */
export const LETTRES = Object.freeze({
  n: 'nouvelle',     /* une piste de plus — depuis n'importe quel écran */
  '/': 'chercher',   /* la recherche des pistes — depuis n'importe quel écran */
  e: 'ecrire',       /* écrire à la piste qu'on regarde */
  p: 'planifier',    /* planifier la suite de la piste qu'on regarde */
  f: 'fait'          /* cocher l'action du jour qu'on a sous le curseur */
});
/* la lettre d'un appui, ou '' : `coupees` = la rangée de Réglages les a
   éteintes ; `champ` = un champ a le curseur (on y TAPE) */
export function lettreDe(ev, { coupees = false, champ = false } = {}){
  if (!ev || coupees || champ) return '';
  if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.isComposing || ev.repeat) return '';
  const k = String(ev.key || '').toLowerCase();
  return Object.prototype.hasOwnProperty.call(LETTRES, k) ? k : '';
}
/* Ctrl K, ou ⌘K sur Mac — le seul raccourci à modificateur de l'app :
   un modificateur ne se déclenche pas en parlant */
export const estPalette = ev => !!ev && !!(ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey
  && String(ev.key || '').toLowerCase() === 'k';
/* ce qu'annonce la touche, dans le bouton et pour le lecteur d'écran
   (`aria-keyshortcuts` : « N », « Slash », « Control+K ») */
export const nomAria = k => k === '/' ? 'Slash' : String(k || '').toUpperCase();
export const nomPalette = mac => mac ? '⌘K' : 'Ctrl K';
export const ariaPalette = mac => mac ? 'Meta+K' : 'Control+K';

/* ---------- ② chercher et faire ----------
   `pistes` : les pistes (le moteur de la barre les cherche) ; `amis` :
   `{id, nom, cle?}` ; `gestes` : `{id, libelle, mots?}`, ceux que l'écran
   offre déjà. Rend une liste de propositions
   `{sorte, geste, id, libelle, sous?}` :
   - une piste trouvée par son NOM passe devant une piste trouvée par sa
     fiche (on tape un nom dans une telle fenêtre, presque toujours) ;
   - la première piste porte ses gestes : l'ouvrir, lui écrire, planifier ;
   - un ami : lui écrire (s'il a une boîte), ouvrir sa fiche ;
   - un geste : par son libellé ou ses mots.
   Sans rien de tapé : les gestes seulement. */
export const PALETTE_PISTES = 5;
export const PALETTE_MAX = 12;
const tient = (mots, s) => { const f = fold(s); return mots.every(m => f.includes(m)); };
const commence = (mots, s) => fold(s).startsWith(mots[0] || '');
export function paletteDe(q, { pistes = [], amis = [], gestes = [] } = {}){
  const mots = queryWords(q);
  const geste = g => ({ sorte: 'geste', geste: g.id, id: g.id, libelle: g.libelle });
  if (!mots.length) return gestes.slice(0, PALETTE_MAX).map(geste);
  const vivantes = (pistes || []).filter(c => c && c.name && !c.demo);
  const parNom = vivantes.filter(c => tient(mots, c.name))
    .sort((a, b) => (commence(mots, b.name) - commence(mots, a.name)) || a.name.localeCompare(b.name, 'fr'));
  const vus = new Set(parNom.map(c => c.id));
  const parFiche = filterCompanies(vivantes, { q }).filter(c => !vus.has(c.id));
  const out = [];
  [...parNom, ...parFiche].slice(0, PALETTE_PISTES).forEach((c, i) => {
    const sous = [c.city].filter(Boolean).join(' · ');
    out.push({ sorte: 'piste', geste: 'ouvrir', id: c.id, libelle: c.name, ...(sous ? { sous } : {}) });
    if (i === 0){
      out.push({ sorte: 'piste', geste: 'ecrire', id: c.id, libelle: `Écrire à ${c.name}` });
      out.push({ sorte: 'piste', geste: 'planifier', id: c.id, libelle: `Planifier ${c.name}` });
    }
  });
  for (const a of amis || []){
    if (!a || !a.id || !a.nom || !tient(mots, a.nom)) continue;
    const prenom = String(a.nom).trim().split(/\s+/)[0];
    if (a.cle) out.push({ sorte: 'ami', geste: 'ecrire', id: a.id, libelle: `Écrire à ${prenom}` });
    out.push({ sorte: 'ami', geste: 'ouvrir', id: a.id, libelle: a.nom });
  }
  for (const g of gestes || [])
    if (tient(mots, [g.libelle, g.mots].filter(Boolean).join(' '))) out.push(geste(g));
  return out.slice(0, PALETTE_MAX);
}
