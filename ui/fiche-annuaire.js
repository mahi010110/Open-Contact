/* ============================================================
   OpenContact — interface · la fiche s'enrichit

   Ce que les sources publiques savent de la piste — l'annuaire des
   entreprises, Wikidata, Wikipédia, le BODACC — se lit dans LA CARTE
   (ui/carte.js), en tête de « À savoir ». Rien d'autre.

   LE MINIMUM, AU BON MOMENT (décision du mainteneur, 7 octobre 2026 :
   « au final c'est juste un bouton en plus ou un lien en plus »). La
   fiche portait sept gestes autour de cette carte : « Trouver dans
   l'annuaire », « C'est laquelle ? » (une liste à codes d'activité),
   « Compléter ma fiche », « Anciens de mon école », « Offres
   d'emploi », « Fiche officielle », « Réessayer » — et deux phrases
   d'attente. Tous partis :
   · l'entreprise se RECONNAÎT pendant qu'on tape son nom, dans la
     capture et dans « Modifier » (ui/nom-annuaire.js) : le SIREN
     s'attache sur ce choix, et ce qui manquait se remplit sous tes yeux
     — plus de liste à départager après coup, plus de bouton pour
     compléter ;
   · trouver quelqu'un à qui écrire se fait dans « Ajouter un contact »,
     là où on le cherche : le dirigeant y est proposé, LinkedIn à côté ;
   · ce qui ne répond pas ne se dit pas : une carte absente n'est pas
     une erreur, elle reviendra à la prochaine ouverture.

   CE QUI PART, ET QUAND : une piste qui porte un SIREN se relit par ce
   SIREN seul — neuf chiffres publics —, à l'ouverture de la fiche. Rien
   d'autre : ni note, ni contact, ni profil (`e2e-enrichir.mjs` lit
   chaque requête).

   Une réponse redessine ses zones, JAMAIS la fiche : elle ne vole pas le
   curseur à quelqu'un qui écrit ses notes.
   ============================================================ */
import { cleDe, metierDuProfil } from '../engine/requete.js';
import { lireAnnuaire, questionSiren, dirigeantsAjoutables } from '../engine/annuaire.js';
import { S } from './state.js';
import { lireUrl } from './decouvrir.js';
import { suivreCarte, carteDe, carteHTML, alerteHTML, sourcesHTML, lierCarte } from './carte.js';

/* l'état de la session — on ne redemande pas ce qu'on sait déjà */
const parSiren = new Map();   /* siren → { phase, r } */
let courant = null;           /* { root, c } — la fiche ouverte */

const pret = c => { const e = c.siren && parSiren.get(c.siren); return e && e.phase === 'ok' ? e : null; };

/* la carte de la piste : ce que les sources savent, ta parole devant */
const carteFiche = c => { const e = pret(c); return carteDe(e ? e.r : null, c, metierDuProfil(S.profile), S.profile); };
/* la carte, pour le composeur : seulement si l'annuaire a déjà répondu
   pendant la session — écrire ne lance aucune question */
export const carteConnue = c => pret(c) ? carteFiche(c) : null;
/* l'annuaire a-t-il de quoi remplir « À savoir » ? (la fiche ne pose pas
   un cadre vide : sans SIREN, ou tant que rien n'est revenu, il n'existe
   que si TU y as écrit quelque chose) */
export const annuaireParle = c => !!pret(c);

/* ---- SOUS LE NOM : ce qui RÉCLAME quelque chose — une entreprise
   fermée (l'annuaire) ou une procédure collective (le BODACC) — au
   langage d'urgence ---- */
const etatHTML = c => pret(c) ? alerteHTML(carteFiche(c)) : '';

/* le dirigeant que l'annuaire connaît, PROPOSÉ dans « Ajouter un
   contact » — au moment où l'on cherche quelqu'un, pas avant */
export function dirigeantsSuggeres(c){
  const e = pret(c);
  return e ? dirigeantsAjoutables(c, e.r).slice(0, 3) : [];
}

/* LA CARTE, en tête de « À savoir » : ce qu'elle fait (ta phrase
   d'abord), ses missions, sa taille — puis, en gris, d'où ça vient (la
   licence de l'annuaire le demande), seulement quand une source a parlé. */
const carteZoneHTML = c => {
  const k = carteFiche(c);
  return carteHTML(k, { ecrire: false }) + (pret(c) ? sourcesHTML(k) : '');
};
export const annuaireEtatHTML = c => `<span id="faEtat" class="fa-etat-nom">${etatHTML(c)}</span>`;
export const annuaireCarteHTML = c => `<div id="faCarte" class="ct">${carteZoneHTML(c)}</div>`;

/* ---------- le réseau ---------- */
function maj(){
  if (!courant) return;
  const c = courant.c, root = courant.root;
  for (const [id, html] of [['faEtat', etatHTML], ['faCarte', carteZoneHTML]]){
    const box = root.querySelector('#' + id);
    if (!box || !box.isConnected) continue;
    const h = html(c);
    if (box.innerHTML !== h){ box.innerHTML = h; lierCarte(box); }
  }
  /* « À savoir » était posé caché (rien à dire encore) : l'annuaire vient
     de répondre, il se montre — sans redessiner la fiche, qui volerait le
     curseur à quelqu'un qui écrit ses notes */
  const k = root.querySelector('#fiKnow');
  if (k && k.hidden && pret(c)) k.hidden = false;
}

function chargerSiren(c){
  const siren = c.siren;
  const e0 = parSiren.get(siren);
  if (e0 && (e0.phase === 'ok' || e0.phase === 'absent' || e0.phase === 'charge')) return;
  if (navigator.onLine === false) return;
  const e = { phase: 'charge' };
  parSiren.set(siren, e);
  lireUrl(questionSiren(siren), new AbortController().signal).then(j => {
    const r = lireAnnuaire(j, { ville: cleDe(c.city || '') }).find(x => x.siren === siren);
    e.phase = r ? 'ok' : 'absent';
    e.r = r || null;
    maj();
    if (r) suivreLeReste(siren);
  /* une panne ne se dit pas : la carte n'apparaît pas, et la prochaine
     ouverture redemande */
  }).catch(() => { parSiren.delete(siren); });
}
/* ce qu'on a lu ailleurs (l'aperçu de « À découvrir », le champ du nom)
   sert tout de suite : la fiche n'a pas à le redemander */
export function connaitre(r){
  if (r && r.siren) parSiren.set(r.siren, { phase: 'ok', r });
}
/* Ce que les AUTRES sources savent (Wikidata, Wikipédia, le BODACC) :
   demandé par le SIREN, une fois par session, pour la fiche ouverte.
   Un manque n'est pas une erreur — elles ne connaissent qu'une
   entreprise sur cinq —, donc il ne se dit pas. */
let lacher = () => {};
function suivreLeReste(siren){
  if (!courant || courant.c.siren !== siren) return;
  lacher();
  lacher = suivreCarte(siren, maj, courant.c.name);
}
addEventListener('online', () => { if (courant && courant.c.siren) chargerSiren(courant.c); });

/* posé après chaque rendu de la fiche : la question part à l'ouverture
   pour une piste qui a un SIREN — rien d'autre ne part sans geste */
export function lierAnnuaireFiche(root, c){
  courant = { root, c };
  const box = root.querySelector('#faCarte');
  if (box) lierCarte(box);
  if (c.siren){ chargerSiren(c); if (pret(c)) suivreLeReste(c.siren); }
}
/* la fiche se ferme : plus rien à redessiner */
export const oublierFiche = () => { courant = null; lacher(); lacher = () => {}; };
