/* ============================================================
   OpenContact — interface · la fiche s'enrichit (docs/recherche.md, lot 3)

   Un bloc de la fiche, « Annuaire », sous « À savoir ». Il dit ce que
   l'annuaire public des entreprises sait de la piste — activité,
   effectif, création, établissements, dirigeant —, le site officiel
   trouvé sur Wikidata, et il donne trois liens d'un tap : les anciens
   de ton école chez elle (LinkedIn), ses offres (France Travail), sa
   fiche officielle.

   CE QUI PART, ET QUAND :
   · une piste qui porte un SIREN se relit par ce SIREN seul — neuf
     chiffres publics. Au poste le bloc est ouvert, la question part à
     l'ouverture de la fiche ; au pouce il est replié, elle part quand
     on le déplie. Rien ne part pour un bloc qu'on ne regarde pas.
   · une piste SANS SIREN ne se cherche que sur un geste (« Trouver dans
     l'annuaire »), par son nom et son département : c'est toi qui dis
     laquelle est la tienne, parce qu'un homonyme te montrerait le
     dirigeant d'une autre entreprise.
   · rien d'autre : ni note, ni contact, ni profil (le moteur le garde,
     `e2e-enrichir.mjs` lit chaque requête).

   CE QUI CHANGE, ET COMMENT : rien sans geste. « Ajouter à ma fiche »
   complète les VIDES (invariant ②) et se défait trente secondes ; un
   dirigeant ne devient un contact que si tu l'ajoutes (décision du
   mainteneur).

   Le bloc se redessine SEUL quand une réponse arrive : la fiche entière
   ne se redessine pas sous les doigts de quelqu'un qui écrit ses notes.
   ============================================================ */
import { esc, uid } from '../engine/utils.js';
import { pushHist } from '../engine/model.js';
import { cleDe, deptDePiste } from '../engine/requete.js';
import { lireAnnuaire, questionSiren, questionNom, questionSite, lireSite, complements, champsDits,
         dirigeantsAjoutables, liensPiste } from '../engine/annuaire.js';
import { S, bus, saveData, logJ, attachContact } from './state.js';
import { ic, showUndo, annoncer } from './dom.js';
import { lireUrl } from './decouvrir.js';

/* l'état de la session — on ne redemande pas ce qu'on sait déjà */
const parSiren = new Map();   /* siren → { phase, r, site, sitePhase } */
const parPiste = new Map();   /* id de piste → { phase, liste } (recherche par nom) */
const plis = new Map();       /* id de piste → bloc ouvert ou non, le temps de la session */
let courant = null;           /* { root, c, render } — la fiche ouverte */

export const annuaireOuvert = (c, wide) => plis.has(c.id) ? plis.get(c.id) : wide;

/* ---------- le dessin ---------- */
const ligne = (l, v, cls) => v ? `<div class="fk"><span class="fk-l">${l}</span><span class="fk-v${cls ? ' ' + cls : ''}">${v}</span></div>` : '';
const etatHTML = (txt, o) => `<div class="fk"><span class="fk-v fa-etat"${o && o.busy ? ' aria-busy="true"' : ''}>${txt}${
  o && o.encore ? ` <button class="btn btn-sm" data-fa-encore>${ic('reload', 'ic-14')} Réessayer</button>` : ''}</span></div>`;
const MSG = {
  charge: 'Je cherche dans l’annuaire…',
  horsligne: 'Hors ligne.',
  erreur: 'L’annuaire ne répond pas.',
  limite: 'L’annuaire est très demandé.'
};
const annee = iso => (iso || '').slice(0, 4);
const jjmmaaaa = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '';

function liensHTML(c){
  const l = liensPiste(c, S.profile);
  if (!l.length) return '';
  return ligne('Chercher', l.map(x =>
    `<a class="btn btn-sm" data-lien="${x.cle}" href="${esc(x.url)}" target="_blank" rel="noopener" aria-label="${esc(x.aria)}">${
      ic('external-link', 'ic-14')} ${esc(x.label)}</a>`).join(''), 'fa-liens');
}

function donneesHTML(c, e){
  const r = e.r;
  const dirs = (r.dirigeants || []).filter(d => d.personne).slice(0, 3);
  const ajoutables = new Set(dirigeantsAjoutables(c, r).map(d => d.nom));
  const dirHTML = dirs.map(d =>
    `<span class="fa-dir"><span>${esc(d.nom)}${d.qualite ? ` <span class="dc-q">${esc(d.qualite)}</span>` : ''}</span>${
      ajoutables.has(d.nom) ? `<button class="btn btn-sm" data-fa-dir="${esc(d.nom)}" aria-label="Ajouter ${esc(d.nom)} à mes contacts">${
        ic('plus', 'ic-14')} Ajouter</button>` : ''}</span>`).join('');
  /* ce que l'annuaire ajouterait — la donnée est posée À CÔTÉ du geste,
     c'est elle qui décide (§6, sobriété 2) */
  const comp = complements(c, r, e.site);
  delete comp.siren;
  const dits = champsDits(comp);
  return (
    (r.fermee ? ligne('État', `<span class="mark mark-late">fermée</span>${r.fermeeLe ? ' depuis le ' + esc(jjmmaaaa(r.fermeeLe)) : ''}`) : '')
    + ligne('Activité', esc(r.activite || r.naf))
    + ligne('Effectif', esc(r.effectif))
    + ligne('Création', esc(annee(r.creation)))
    + ligne('Sites', r.etablissements > 1 ? esc(r.etablissements + ' établissements') : '')
    + ligne('Dirigeant', dirHTML, 'fa-dirs')
    /* le site et l'adresse ne se redisent pas quand la fiche les a déjà :
       « À savoir », juste au-dessus, les montre */
    + (!String(c.website || '').trim() && e.site ? `<div class="fk"><span class="fk-l">Site</span>
        <a class="fk-v" href="${esc(e.site)}" target="_blank" rel="noopener">${esc(e.site.replace(/^https?:\/\//i, '').replace(/\/$/, ''))} ${ic('external-link', 'ic-14')}</a></div>` : '')
    + (!String(c.address || '').trim() ? ligne(r.siege ? 'Siège' : 'Adresse', esc(r.adresse), 'fk-lignes') : '')
    + ligne('SIREN', esc(r.siren), 'dc-siren')
    + (dits.length ? `<div class="fk fa-act"><button class="btn btn-sm" data-fa-completer>${ic('plus', 'ic-14')} Ajouter à ma fiche</button>
        <span class="fa-quoi">${esc(dits.join(' · '))}</span></div>` : ''));
}

function corpsHTML(c){
  if (c.siren){
    const e = parSiren.get(c.siren) || { phase: 'charge' };
    if (e.phase === 'ok') return donneesHTML(c, e);
    if (e.phase === 'absent') return etatHTML('Introuvable dans l’annuaire.');
    return etatHTML(MSG[e.phase] || MSG.charge,
      { busy: e.phase === 'charge', encore: e.phase === 'erreur' || e.phase === 'limite' || e.phase === 'horsligne' });
  }
  const e = parPiste.get(c.id) || { phase: 'repos' };
  if (e.phase === 'charge') return etatHTML(MSG.charge, { busy: true });
  if (e.phase === 'ok' && !e.liste.length) return etatHTML('Rien sous ce nom dans l’annuaire.');
  if (e.phase === 'ok') return '';
  const msg = MSG[e.phase] && e.phase !== 'repos' ? `<span class="fa-etat">${MSG[e.phase]}</span>` : '';
  return `<div class="fk fa-act"><button class="btn btn-sm" data-fa-trouver>${ic('search', 'ic-14')} Trouver dans l’annuaire</button>${msg}</div>`;
}

/* les candidats, quand on a cherché par le nom : HORS du cadre — c'est
   une question (« laquelle ? »), pas une donnée de plus. La sous-ligne
   dit ce qui départage deux homonymes — la ville, puis la taille ;
   l'activité, la plus longue, s'élide la première (§6). */
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

const boiteHTML = c => `<div class="fi-know">${liensHTML(c)}${corpsHTML(c)}</div>${choixHTML(c)}`;

export function annuaireFicheHTML(c, ouvert){
  return (
    `<details class="fi-hist fi-ann" id="fiAnn"${ouvert ? ' open' : ''}><summary>Annuaire</summary>
       <div class="fa-box">${boiteHTML(c)}</div>
     </details>`);
}

/* ---------- le réseau ---------- */
function maj(){
  if (!courant) return;
  const box = courant.root.querySelector('#fiAnn .fa-box');
  if (!box || !box.isConnected) return;
  box.innerHTML = boiteHTML(courant.c);
  lierBoite(box, courant.c);
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
    if (r) chargerSite(siren);
  }).catch(err => { e.phase = panne(err); maj(); });
}
/* Le site se cherche seulement quand la fiche n'en a pas : sinon la
   question ne servirait à rien. Un manque n'est pas une erreur — les
   petites entreprises sont rarement sur Wikidata —, donc il ne se dit
   pas. */
function chargerSite(siren){
  const e = parSiren.get(siren);
  if (!e || e.sitePhase) return;
  if (courant && courant.c.siren === siren && String(courant.c.website || '').trim()) return;
  e.sitePhase = 'charge';
  fetch(questionSite(siren), { headers: { accept: 'application/sparql-results+json' } })
    .then(res => res.ok ? res.json() : null)
    .then(j => { e.site = lireSite(j); e.sitePhase = 'ok'; if (e.site) maj(); })
    .catch(() => { e.sitePhase = 'erreur'; });
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
    courant?.root.querySelector('#fiAnn [data-fa-pick], #fiAnn .fa-etat')?.focus?.();
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
function ajouterDirigeant(c, d){
  const id = uid();
  attachContact(c, { id, name: d.nom, role: d.qualite });
  bus.refresh();
  courant?.render();
  showUndo(`${ic('check', 'ic-14')} « ${esc(d.nom)} » ajouté aux contacts.`, () => {
    c.contacts = (c.contacts || []).filter(t => t.id !== id);
    const h = c.history || [];
    if (h.length && /^Contact ajouté/.test(h[h.length - 1].t)) h.pop();
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
    const comp = complements(c, e.r, e.site);
    delete comp.siren;
    if (Object.keys(comp).length) completer(c, comp, 'Complétée depuis l’annuaire');
  });
  box.querySelectorAll('[data-fa-dir]').forEach(b => b.addEventListener('click', () => {
    const e = parSiren.get(c.siren);
    const d = e && e.r && dirigeantsAjoutables(c, e.r).find(x => x.nom === b.dataset.faDir);
    if (d) ajouterDirigeant(c, d);
  }));
  /* choisir LA bonne : le SIREN s'attache, les vides se remplissent */
  box.querySelectorAll('[data-fa-pick]').forEach(b => b.addEventListener('click', () => {
    const e = parPiste.get(c.id);
    const r = e && e.liste.find(x => x.siren === b.dataset.faPick);
    if (!r) return;
    parSiren.set(r.siren, { phase: 'ok', r });
    parPiste.delete(c.id);
    completer(c, complements(c, r, ''), 'Retrouvée dans l’annuaire');
    chargerSite(r.siren);
  }));
}

/* posé après chaque rendu de la fiche */
export function lierAnnuaireFiche(root, c, o){
  courant = { root, c, render: o.render };
  const det = root.querySelector('#fiAnn');
  if (!det) return;
  lierBoite(det.querySelector('.fa-box'), c);
  const demarrer = () => { if (c.siren) chargerSiren(c); };
  det.addEventListener('toggle', () => {
    plis.set(c.id, det.open);
    if (det.open) demarrer();
  });
  if (det.open) demarrer();
}
/* la fiche se ferme : plus rien à redessiner */
export const oublierFiche = () => { courant = null; };
