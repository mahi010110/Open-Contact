/* ============================================================
   OpenContact — interface · « À découvrir » (docs/recherche.md, lot 2)

   Sous tes pistes, ce que l'annuaire public des entreprises connaît et
   que tu n'as pas encore. La question part TOUTE SEULE, après une
   courte pause dans la frappe (décision du mainteneur : pas de geste à
   faire), mais elle n'emporte que ce qui décrit une entreprise — le tri
   vit dans `engine/annuaire.js`, et `e2e-decouvrir.mjs` lit chaque
   requête qui sort.

   UNE LIGNE, DEUX GESTES, et ils ne se ressemblent pas : la ligne ouvre
   l'aperçu (ce que l'annuaire sait de l'entreprise), le bouton
   « Ajouter » en fait une piste — sans question, avec Annuler pendant
   trente secondes (§6 : `showUndo` remplace la confirmation). Ajouter
   n'écrase rien : ce qui est déjà dans tes pistes n'apparaît pas ici.

   UN DESSIN QUI S'ADAPTE (§5) : la même liste, des lignes au pouce
   (nom, puis une sous-ligne qui s'élide) et un tableau au poste (une
   colonne par donnée, des bords qui ne bougent pas d'une ligne à
   l'autre — §6, « une valeur a UN BORD »).
   ============================================================ */
import { esc, uid, todayISO } from '../engine/utils.js';
import { normalizeCompany } from '../engine/model.js';
import { questionsAnnuaire, lireAnnuaire, decouvertes, versPiste, motsInterdits, ficheOfficielle,
         PAR_PAGE } from '../engine/annuaire.js';
import { S, bus, saveData, logJ, deletePiste } from './state.js';
import { ic, openSheet, btn, showUndo, montrerChange, annoncer } from './dom.js';

const PAUSE = 650;                 /* ms sans frappe avant de demander */
const cache = new Map();           /* url → réponse : on ne redemande pas ce qu'on a déjà */
let etat = { cle: '', urls: [], phase: 'repos', listes: [], total: 0, page: 1 };
let ctrl = null, minut = null, notifier = () => {};

/* la ville cherchée choisit l'établissement à montrer (le bon, pas le siège) */
const villeDe = interp => {
  const e = ((interp && interp.etiquettes) || []).find(x => x.famille === 'lieu' && x.ville);
  return e ? e.ville : '';
};

/* Suivre la barre. Appelé à chaque rendu de « Mes pistes » : ne fait
   rien tant que la question ne change pas. */
export function suivreDecouverte(interp, o){
  o = o || {};
  notifier = o.notifier || notifier;
  const urls = questionsAnnuaire(interp, {
    interdits: motsInterdits(S.companies, S.orphans, S.profile),
    userPos: o.userPos
  });
  const cle = urls.join('|');
  if (cle === etat.cle) return;
  if (ctrl) ctrl.abort();
  clearTimeout(minut);
  etat = { cle, urls, phase: 'repos', listes: [], total: 0, page: 1,
           ville: villeDe(interp), userPos: o.userPos || null, interp };
  if (!urls.length) return;
  if (navigator.onLine === false){ etat.phase = 'horsligne'; return; }
  etat.phase = 'attente';
  minut = setTimeout(() => charger(cle, 1), PAUSE);
}
/* le réseau revient : la question en attente part */
addEventListener('online', () => {
  if (etat.phase !== 'horsligne' || !etat.urls.length) return;
  etat.phase = 'attente';
  notifier();
  charger(etat.cle, 1);
});

const avecPage = (u, p) => { const x = new URL(u); x.searchParams.set('page', String(p)); return x.toString(); };
const attendre = (ms, signal) => new Promise((ok, ko) => {
  const h = setTimeout(ok, ms);
  signal.addEventListener('abort', () => { clearTimeout(h); ko(Object.assign(new Error('abandon'), { name: 'AbortError' })); });
});
/* RELEVÉ par la sonde, en vrai : l'annuaire répond « 429 Too Many
   Requests » à des appels rapprochés. Dans un lycée, une classe entière
   sort par la même adresse — l'app doit encaisser ce refus. Une seconde
   tentative après un court délai, puis on le dit, sans accuser le réseau. */
export async function lireUrl(u, signal){
  for (let essai = 0; essai < 2; essai++){
    const res = await fetch(u, { signal, headers: { accept: 'application/json' } });
    if (res.status === 429){
      if (essai === 0){ await attendre(1500, signal); continue; }
      throw Object.assign(new Error('limite'), { limite: true });
    }
    if (!res.ok) throw new Error('statut ' + res.status);
    return res.json();
  }
}
async function charger(cle, page){
  if (cle !== etat.cle) return;
  etat.phase = page > 1 ? 'plus' : 'charge';
  notifier();
  ctrl = new AbortController();
  const signal = ctrl.signal;
  try {
    const listes = [];
    let total = 0;
    for (const [k, u0] of etat.urls.entries()){
      const u = avecPage(u0, page);
      let j = cache.get(u);
      if (!j){
        if (k > 0) await attendre(250, signal);      /* deux questions : on ne les tire pas d'un coup */
        j = await lireUrl(u, signal);
        cache.set(u, j);
      }
      listes.push(lireAnnuaire(j, { ville: etat.ville, userPos: etat.userPos }));
      total = Math.max(total, Number(j && j.total_results) || 0);
    }
    if (cle !== etat.cle) return;
    etat.listes = page > 1 ? etat.listes.concat(listes) : listes;
    etat.total = total;
    etat.page = page;
    etat.phase = 'ok';
    /* ne parle que s'il a quelque chose de NEUF : « rien dans l'annuaire »
       recouvrirait, une demi-seconde plus tard, le compte de tes pistes
       qu'un lecteur d'écran vient d'entendre — le décor par-dessus
       l'information */
    const n = visibles().length;
    if (n) annoncer(`${n} entreprise${n > 1 ? 's' : ''} à découvrir.`);
  } catch (e){
    if (e && e.name === 'AbortError') return;
    if (cle !== etat.cle) return;
    etat.phase = navigator.onLine === false ? 'horsligne' : (e && e.limite) ? 'limite' : 'erreur';
  }
  notifier();
}

/* ce qui reste à montrer : une entreprise = une ligne, et rien de ce
   qui est déjà dans tes pistes ; au plus près d'abord quand on sait où
   l'on est */
function visibles(){
  const l = decouvertes(etat.listes, S.companies);
  if (etat.userPos) l.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  return l;
}
export const decouverteActive = () => etat.phase !== 'repos';
export const decouverteVide = () => etat.phase === 'ok' && !visibles().length;

const km = d => d == null ? '' : (d < 1 ? '< 1 km' : Math.round(d) + ' km');
function ligneHTML(r){
  const lieu = [r.ville, km(r.distance)].filter(Boolean).join(' · ');
  return (
    `<div class="dc-row" data-siren="${esc(r.siren)}">
       <div class="dc-main" role="button" tabindex="0" aria-label="Voir ${esc(r.nom)}">
         <span class="dc-nom">${esc(r.nom)}</span>
         ${/* les trois cellules existent TOUJOURS, vides ou non : au poste
              ce sont des colonnes, et une cellule absente ferait glisser
              toutes les suivantes d'un rang (§6, une valeur a UN bord) */''}
         <span class="dc-data"><span class="dc-lieu">${esc(lieu)}</span><span class="dc-taille">${
           esc(r.effectif)}</span><span class="dc-act">${esc(r.activite)}</span></span>
       </div>
       <button class="btn btn-sm dc-add" data-add="${esc(r.siren)}" aria-label="Ajouter ${esc(r.nom)} à mes pistes">${
         ic('plus', 'ic-14')} Ajouter</button>
     </div>`);
}

/* la section, selon l'état — rien du tout au repos */
export function decouverteHTML(){
  if (etat.phase === 'repos') return '';
  const l = etat.phase === 'ok' || etat.phase === 'plus' ? visibles() : [];
  let corps;
  if (etat.phase === 'attente' || etat.phase === 'charge')
    corps = `<p class="dc-etat" aria-busy="true">Je cherche dans l’annuaire…</p>`;
  else if (etat.phase === 'horsligne')
    corps = `<p class="dc-etat">Hors ligne.</p>`;
  else if (etat.phase === 'erreur' || etat.phase === 'limite')
    corps = `<div class="dc-etat dc-err">${etat.phase === 'limite' ? 'L’annuaire est très demandé.' : 'L’annuaire ne répond pas.'}
               <button class="btn btn-sm" data-dc-encore>${ic('reload', 'ic-14')} Réessayer</button></div>`;
  else if (!l.length)
    corps = `<p class="dc-etat">Rien de nouveau dans l’annuaire.</p>`;
  else {
    const reste = etat.total - etat.page * PAR_PAGE;
    corps =
      `<div class="dc-list">
         <div class="dc-tete" aria-hidden="true"><span>Entreprise</span><span>Lieu</span><span>Taille</span><span>Activité</span><span></span></div>
         ${l.map(ligneHTML).join('')}
       </div>
       ${reste > 0 ? `<button class="linklike tr-more" data-dc-plus${etat.phase === 'plus' ? ' aria-busy="true"' : ''}>${
         etat.phase === 'plus' ? 'Je cherche…' : 'Voir 10 de plus'}</button>` : ''}`;
  }
  const n = l.length;
  return (
    `<section class="tranche tr-dec" aria-label="À découvrir">
       <div class="tr-h dc-h">
         <h2>${ic('search', 'ic-14')} À découvrir${n ? ` <span class="tr-n">${n}</span>` : ''}</h2>
         ${/* la source se nomme : la licence de l'annuaire le demande, et
              c'est ce qui dit d'où viennent des entreprises qu'on n'a
              jamais saisies */''}
         <a class="dc-src" href="https://annuaire-entreprises.data.gouv.fr" target="_blank" rel="noopener">annuaire des entreprises</a>
       </div>
       ${corps}
     </section>`);
}

/* ajouter : une piste comme si on l'avait saisie, puis Annuler 30 s */
function ajouter(r){
  const c = normalizeCompany({ ...versPiste(r, etat.interp), id: uid(), createdAt: Date.now() });
  c.history = [{ d: todayISO(), t: 'Ajoutée depuis l’annuaire' }];
  S.companies.push(c);
  saveData();
  logJ('Piste ajoutée depuis l’annuaire : ' + c.name, c.id);
  bus.refresh();
  montrerChange(c.id);
  showUndo(`${ic('check', 'ic-14')} « ${esc(c.name)} » ajoutée.`, () => { deletePiste(c); bus.refresh(); });
  return c;
}

/* l'aperçu : ce que l'annuaire sait, AVANT d'en faire une piste */
const ligne = (l, v, cls) => v ? `<div class="fk"><span class="fk-l">${l}</span><span class="fk-v${cls ? ' ' + cls : ''}">${v}</span></div>` : '';
export function apercuHTML(r){
  const dir = (r.dirigeants || []).filter(d => d.personne).slice(0, 2)
    .map(d => `${esc(d.nom)}${d.qualite ? ` <span class="dc-q">${esc(d.qualite)}</span>` : ''}`).join('<br>');
  const officielle = ficheOfficielle(r.siren);
  return (
    `<div class="fi-know dc-ap">
       ${ligne('Activité', esc(r.activite || r.naf))}
       ${ligne(r.siege ? 'Siège' : 'Adresse', esc(r.adresse), 'fk-lignes')}
       ${ligne('Distance', esc(km(r.distance)))}
       ${ligne('Effectif', esc(r.effectif))}
       ${ligne('Création', esc((r.creation || '').slice(0, 4)))}
       ${ligne('Sites', r.etablissements > 1 ? esc(r.etablissements + ' établissements') : '')}
       ${ligne('Dirigeant', dir)}
       ${ligne('SIREN', esc(r.siren), 'dc-siren')}
     </div>
     ${officielle ? `<a class="linklike dc-off" href="${esc(officielle)}" target="_blank" rel="noopener">${
       ic('external-link', 'ic-14')} Fiche officielle</a>` : ''}`);
}
function ouvrirApercu(r){
  const sh = openSheet({ title: r.nom, icon: 'building' });
  sh.body.innerHTML = apercuHTML(r);
  sh.setFoot([btn('Ajouter à mes pistes', 'btn-primary', () => { sh.close(); ajouter(r); }, 'plus')]);
  return sh;
}

/* les gestes de la section — posés après chaque rendu */
export function lierDecouverte(box){
  if (!box) return;
  const trouve = siren => visibles().find(x => x.siren === siren);
  box.querySelectorAll('.dc-row').forEach(row => {
    const r = trouve(row.dataset.siren);
    if (!r) return;
    const main = row.querySelector('.dc-main');
    main.addEventListener('click', () => ouvrirApercu(r));
    main.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrirApercu(r); }
    });
    row.querySelector('[data-add]').addEventListener('click', e => { e.stopPropagation(); ajouter(r); });
  });
  box.querySelector('[data-dc-encore]')?.addEventListener('click', () => {
    for (const u of etat.urls) cache.delete(avecPage(u, etat.page || 1));
    charger(etat.cle, 1);
  });
  box.querySelector('[data-dc-plus]')?.addEventListener('click', () => {
    if (etat.phase !== 'plus') charger(etat.cle, etat.page + 1);
  });
}
