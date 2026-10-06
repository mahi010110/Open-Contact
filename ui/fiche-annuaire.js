/* ============================================================
   OpenContact — interface · la fiche s'enrichit
   (docs/recherche.md, lot 3 ; docs/presentation-recherche.md, lot B)

   Ce que l'annuaire public des entreprises sait de la piste — activité,
   effectif, création, établissements, dirigeant —, le site trouvé sur
   Wikidata, et les liens d'un tap : les anciens de ton école chez elle
   (LinkedIn), ses offres (France Travail), sa fiche officielle.

   RANGÉ PAR USAGE, PAS PAR SOURCE (CLAUDE.md §6). Le premier dessin en
   faisait un bloc « Annuaire » replié tout en bas de la fiche : trois
   gestes de recherche, sept données et un contact possible, rangés
   ensemble parce qu'ils venaient du même service. Ils vont maintenant
   là où ils servent :
   · CONTACTS — « Anciens de mon école » (trouver quelqu'un à qui
     écrire), et le dirigeant proposé quand on ajoute un contact ;
   · À SAVOIR — activité, taille, dirigeant, site, puis une ligne grise :
     la source, le SIREN, la fiche officielle, les offres — et « Compléter
     ma fiche » à côté de ce qu'il complète ;
   · SOUS LE NOM — une entreprise fermée, la seule donnée qui réclame
     quelque chose.

   CE QUI PART, ET QUAND :
   · une piste qui porte un SIREN se relit par ce SIREN seul — neuf
     chiffres publics —, à l'ouverture de la fiche : ce qu'il rapporte
     se montre dans des cadres qu'on regarde (les contacts, sous le nom) ;
   · une piste SANS SIREN ne se cherche que sur un geste (« Trouver dans
     l'annuaire »), par son nom et son département : c'est toi qui dis
     laquelle est la tienne, parce qu'un homonyme te montrerait le
     dirigeant d'une autre entreprise ;
   · rien d'autre : ni note, ni contact, ni profil (le moteur le garde,
     `e2e-enrichir.mjs` lit chaque requête).

   CE QUI CHANGE, ET COMMENT : rien sans geste. « Compléter ma fiche »
   remplit les VIDES (invariant ②) et se défait trente secondes ; le
   dirigeant ne devient un contact que si tu le choisis dans « Ajouter un
   contact », où il est proposé.

   LÉGER (demande du mainteneur, 5 octobre : « pas de gros boutons, pas
   de rajout dégoulinant ») : des liens texte, quelques rangées, une
   ligne grise pour la source — et un seul bouton, seulement quand il y a
   un vide à remplir.

   Une réponse redessine ses trois zones, JAMAIS la fiche : elle ne
   vole pas le curseur à quelqu'un qui écrit ses notes.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { pushHist } from '../engine/model.js';
import { cleDe, deptDePiste, metierDuProfil } from '../engine/requete.js';
import { lireAnnuaire, questionSiren, questionNom, complements, champsDits,
         dirigeantsAjoutables, liensPiste } from '../engine/annuaire.js';
import { S, bus, saveData, logJ } from './state.js';
import { ic, showUndo, annoncer } from './dom.js';
import { lireUrl } from './decouvrir.js';
import { suivreCarte, sourcesDe, carteDe, carteHTML, ecrireHTML, alerteHTML, sourcesHTML, lierCarte } from './carte.js';

/* l'état de la session — on ne redemande pas ce qu'on sait déjà */
const parSiren = new Map();   /* siren → { phase, r } */
const parPiste = new Map();   /* id de piste → { phase, liste } (recherche par nom) */
let courant = null;           /* { root, c, render } — la fiche ouverte */

/* ---------- le dessin ---------- */

const lienHTML = x =>
  `<a class="linklike" data-lien="${x.cle}" href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="${esc(x.aria)}">${
    esc(x.label)}${ic('external-link', 'ic-12')}</a>`;
const lien = (c, cle) => liensPiste(c, S.profile).find(x => x.cle === cle);
const pret = c => { const e = c.siren && parSiren.get(c.siren); return e && e.phase === 'ok' ? e : null; };

/* la carte de la piste : ce que les sources savent, ta parole devant */
const carteFiche = c => { const e = pret(c); return carteDe(e ? e.r : null, c, metierDuProfil(S.profile)); };
/* la carte, pour le composeur : seulement si l'annuaire a déjà répondu
   pendant la session — écrire ne lance aucune question */
export const carteConnue = c => pret(c) ? carteFiche(c) : null;
/* le site que Wikidata connaît, pour « Compléter ma fiche » */
const siteConnu = c => (c.siren && sourcesDe(c.siren).wd && sourcesDe(c.siren).wd.site) || '';

/* ---- SOUS LE NOM : ce qui RÉCLAME quelque chose — une entreprise
   fermée (l'annuaire) ou une procédure collective (le BODACC) — au
   langage d'urgence ---- */
function etatHTML(c){
  return pret(c) ? alerteHTML(carteFiche(c)) : '';
}

/* ---- CONTACTS : trouver quelqu'un à qui écrire ----
   Tant que la piste n'a PERSONNE à qui écrire — c'est le cas de toute
   piste venue de l'annuaire —, la personne vient en tête : le dirigeant
   d'une PME, le recrutement d'une grande (engine/carte.js, aQui), avec
   le lien qui la trouve. Elle part dès qu'une adresse existe : un conseil
   qui ne sert plus est du bruit. Puis les liens (ils emmènent ailleurs,
   §6). Le dirigeant est aussi PROPOSÉ dans « Ajouter un contact », au
   moment où il sert (dirigeantsSuggeres). */
function contactsHTML(c){
  const gens = lien(c, 'gens');
  const k = pret(c) ? carteFiche(c) : null;
  const sansAdresse = !(c.contacts || []).some(t => t && t.email);
  return (k && sansAdresse ? `<div class="fa-qui">${ecrireHTML(k.ecrire, c.name)}</div>` : '')
    + (gens ? lienHTML(gens) : '')
    + (k && k.linkedin ? lienHTML({ cle: 'linkedin', url: k.linkedin, label: 'Page LinkedIn', aria: 'Page LinkedIn de ' + c.name }) : '');
}
export function dirigeantsSuggeres(c){
  const e = pret(c);
  return e ? dirigeantsAjoutables(c, e.r).slice(0, 3) : [];
}

/* ---- À SAVOIR : ce que l'annuaire sait, à la suite de ce que tu sais ---- */
const ligne = (l, v, cls) => v ? `<div class="fk"><span class="fk-l">${l}</span><span class="fk-v${cls ? ' ' + cls : ''}">${v}</span></div>` : '';
const MSG = {
  charge: 'Je cherche dans l’annuaire…',
  horsligne: 'Hors ligne.',
  erreur: 'L’annuaire ne répond pas.',
  limite: 'L’annuaire est très demandé.'
};

/* ce que la carte ne dit pas : l'adresse du siège, quand la fiche n'en
   a pas — la carte porte le reste (ce qu'elle fait, les chiffres, le
   dirigeant, le site) */
function donneesHTML(c, e){
  const r = e.r;
  return !String(c.address || '').trim() ? ligne(r.siege ? 'Siège' : 'Adresse', esc(r.adresse), 'fk-lignes') : '';
}

/* LE PIED : seulement s'il y a des vides à remplir, le seul geste qui
   change la fiche, avec ce qu'il ajoutera (§6, sobriété 2) ; les liens
   qui emmènent ailleurs, à la taille du doigt (§5) ; puis une ligne
   grise, du texte seul : la source (la licence la demande) et le SIREN */
function piedHTML(c, e, etat){
  const liens = ['offres', 'officielle'].map(k => lien(c, k)).filter(Boolean);
  let geste = '';
  if (e && e.phase === 'ok'){
    const comp = complements(c, e.r, siteConnu(c));
    delete comp.siren;
    const dits = champsDits(comp);
    if (dits.length) geste = `<div class="fa-act"><button class="btn btn-sm" data-fa-completer>${ic('plus', 'ic-14')}Compléter ma fiche</button>
      <span class="fa-quoi">${esc(dits.join(' · '))}</span></div>`;
  }
  /* les sources qui ont DIT quelque chose sur la carte — l'annuaire, au
     moins, tant qu'il n'a pas répondu */
  const k = e && e.phase === 'ok' ? carteFiche(c) : null;
  const noms = k && k.sources.length ? k.sources : ['Annuaire des entreprises'];
  const src = [...noms.map(esc), c.siren ? `<span class="fa-siren">SIREN ${esc(c.siren)}</span>` : '']
    .filter(Boolean).join('<span aria-hidden="true"> · </span>');
  return `${geste}<div class="fa-pied">${etat ? `<div class="fa-etat">${etat}</div>` : ''}${
    liens.length ? `<div class="fa-liens">${liens.map(lienHTML).join('')}</div>` : ''}<div class="fa-src">${src}</div></div>`;
}

function savoirHTML(c){
  if (c.siren){
    const e = parSiren.get(c.siren) || { phase: 'charge' };
    if (e.phase === 'ok') return donneesHTML(c, e) + piedHTML(c, e);
    const encore = e.phase === 'erreur' || e.phase === 'limite' || e.phase === 'horsligne';
    const etat = e.phase === 'absent' ? 'Introuvable dans l’annuaire.'
      : `<span${e.phase === 'charge' || !e.phase ? ' aria-busy="true"' : ''}>${MSG[e.phase] || MSG.charge}</span>${
        encore ? ` <button class="btn btn-sm" data-fa-encore>${ic('reload', 'ic-14')} Réessayer</button>` : ''}`;
    return piedHTML(c, e, etat);
  }
  const e = parPiste.get(c.id) || { phase: 'repos' };
  const etat = e.phase === 'charge' ? `<span aria-busy="true">${MSG.charge}</span>`
    : e.phase === 'ok' && !e.liste.length ? 'Rien sous ce nom dans l’annuaire.'
    : e.phase === 'ok' ? ''
    : `<button class="linklike" data-fa-trouver>Trouver dans l’annuaire</button>${MSG[e.phase] && e.phase !== 'repos' ? ` ${MSG[e.phase]}` : ''}`;
  return choixHTML(c) + piedHTML(c, null, etat);
}

/* les candidats, quand on a cherché par le nom : une question
   (« laquelle ? »), pas une donnée de plus. La sous-ligne dit ce qui
   départage deux homonymes — la ville, puis la taille. */
function choixHTML(c){
  if (c.siren) return '';
  const e = parPiste.get(c.id);
  if (!e || e.phase !== 'ok' || !e.liste.length) return '';
  return (
    `<p class="fa-q">C’est laquelle ?</p>
     <div class="pick-list fa-choix">${e.liste.map(r =>
       `<button class="pick" data-fa-pick="${esc(r.siren)}"><div class="pk-m"><b>${esc(r.nom)}</b><span>${
         esc([r.ville, r.effectif, r.activite || r.naf].filter(Boolean).join(' · '))}</span></div>${ic('chevron-right', 'ic-14')}</button>`).join('')}
     </div>`);
}

/* les trois zones, posées par la fiche là où elles servent */
export const annuaireEtatHTML = c => `<span id="faEtat" class="fa-etat-nom">${etatHTML(c)}</span>`;
export const annuaireContactsHTML = c => `<div id="faCts" class="fa-cts">${contactsHTML(c)}</div>`;
export const annuaireSavoirHTML = c => `<div id="faSavoir" class="fa-savoir">${savoirHTML(c)}</div>`;
/* LA CARTE, en tête de « À savoir » : ce qu'elle fait (ta phrase
   d'abord), ses missions, sa taille — affichée, jamais repliée
   derrière un lien */
const carteZoneHTML = c => carteHTML(carteFiche(c), { ecrire: false });
export const annuaireCarteHTML = c => `<div id="faCarte" class="ct">${carteZoneHTML(c)}</div>`;

/* ---------- le réseau ---------- */
function maj(){
  if (!courant) return;
  const c = courant.c, root = courant.root;
  for (const [id, html] of [['faEtat', etatHTML], ['faCts', contactsHTML], ['faCarte', carteZoneHTML], ['faSavoir', savoirHTML]]){
    const box = root.querySelector('#' + id);
    if (!box || !box.isConnected) continue;
    const h = html(c);
    if (box.innerHTML !== h){ box.innerHTML = h; lierBoite(box, c); lierCarte(box); }
  }
}
const panne = err => navigator.onLine === false ? 'horsligne' : (err && err.limite) ? 'limite' : 'erreur';

function chargerSiren(c){
  const siren = c.siren;
  const e0 = parSiren.get(siren);
  if (e0 && (e0.phase === 'ok' || e0.phase === 'absent' || e0.phase === 'charge')) return;
  if (navigator.onLine === false){ parSiren.set(siren, { phase: 'horsligne' }); maj(); return; }
  const e = { phase: 'charge' };
  parSiren.set(siren, e);
  maj();
  lireUrl(questionSiren(siren), new AbortController().signal).then(j => {
    const r = lireAnnuaire(j, { ville: cleDe(c.city || '') }).find(x => x.siren === siren);
    e.phase = r ? 'ok' : 'absent';
    e.r = r || null;
    maj();
    if (r) suivreLeReste(siren);
  }).catch(err => { e.phase = panne(err); maj(); });
}
/* Ce que les AUTRES sources savent (Wikidata, Wikipédia, le BODACC) :
   demandé par le SIREN, une fois par session, pour la fiche ouverte.
   Un manque n'est pas une erreur — elles ne connaissent qu'une
   entreprise sur cinq —, donc il ne se dit pas. */
let lacher = () => {};
function suivreLeReste(siren){
  if (!courant || courant.c.siren !== siren) return;
  lacher();
  lacher = suivreCarte(siren, maj);
}
function chercherNom(c){
  if (navigator.onLine === false){ parPiste.set(c.id, { phase: 'horsligne' }); maj(); return; }
  const e = { phase: 'charge', liste: [] };
  parPiste.set(c.id, e);
  maj();
  const ville = cleDe(c.city || '');
  lireUrl(questionNom(c, deptDePiste(c)), new AbortController().signal).then(j => {
    const vus = new Set();
    e.liste = lireAnnuaire(j, { ville }).filter(r => !vus.has(r.siren) && vus.add(r.siren)).slice(0, 5);
    e.phase = 'ok';
    maj();
    annoncer(e.liste.length ? `${e.liste.length} entreprise${e.liste.length > 1 ? 's' : ''} sous ce nom.` : 'Rien sous ce nom.');
    /* le focus suit : il était sur « Trouver », qui vient de partir */
    courant?.root.querySelector('#faSavoir [data-fa-pick], #faSavoir .fa-etat')?.focus?.();
  }).catch(err => { e.phase = panne(err); maj(); });
}
addEventListener('online', () => {
  if (!courant) return;
  const c = courant.c;
  if (c.siren && parSiren.get(c.siren)?.phase === 'horsligne'){ parSiren.delete(c.siren); chargerSiren(c); }
});

/* ---------- les gestes qui changent la fiche ----------
   Chacun se défait (§6 : `showUndo` remplace la confirmation). */
function completer(c, comp, quoi){
  const avant = {};
  for (const k of Object.keys(comp)) avant[k] = c[k];
  Object.assign(c, comp);
  pushHist(c, quoi);
  c.updatedAt = Date.now();
  logJ(c.name + ' — ' + quoi.toLowerCase(), c.id);
  saveData();
  bus.refresh();
  courant?.render();
  showUndo(`${ic('check', 'ic-14')} Fiche complétée.`, () => {
    for (const [k, v] of Object.entries(avant)){
      if (v === undefined) delete c[k]; else c[k] = v;
    }
    const h = c.history || [];
    if (h.length && h[h.length - 1].t === quoi) h.pop();
    c.updatedAt = Date.now();
    saveData();
    bus.refresh();
    if (courant && courant.c === c) courant.render();
  });
}
function lierBoite(box, c){
  box.querySelector('[data-fa-trouver]')?.addEventListener('click', () => chercherNom(c));
  box.querySelector('[data-fa-encore]')?.addEventListener('click', () => {
    if (c.siren){ parSiren.delete(c.siren); chargerSiren(c); }
    else chercherNom(c);
  });
  box.querySelector('[data-fa-completer]')?.addEventListener('click', () => {
    const e = parSiren.get(c.siren);
    if (!e || !e.r) return;
    const comp = complements(c, e.r, siteConnu(c));
    delete comp.siren;
    if (Object.keys(comp).length) completer(c, comp, 'Complétée depuis l’annuaire');
  });
  /* choisir LA bonne : le SIREN s'attache, les vides se remplissent */
  box.querySelectorAll('[data-fa-pick]').forEach(b => b.addEventListener('click', () => {
    const e = parPiste.get(c.id);
    const r = e && e.liste.find(x => x.siren === b.dataset.faPick);
    if (!r) return;
    parSiren.set(r.siren, { phase: 'ok', r });
    parPiste.delete(c.id);
    completer(c, complements(c, r, ''), 'Retrouvée dans l’annuaire');
    suivreLeReste(r.siren);
  }));
}

/* posé après chaque rendu de la fiche : la question part à l'ouverture
   pour une piste qui a un SIREN — rien d'autre ne part sans geste */
export function lierAnnuaireFiche(root, c, o){
  courant = { root, c, render: o.render };
  for (const id of ['faCts', 'faSavoir', 'faCarte']){
    const box = root.querySelector('#' + id);
    if (box){ lierBoite(box, c); lierCarte(box); }
  }
  if (c.siren){ chargerSiren(c); if (pret(c)) suivreLeReste(c.siren); }
}
/* la fiche se ferme : plus rien à redessiner */
export const oublierFiche = () => { courant = null; lacher(); lacher = () => {}; };
