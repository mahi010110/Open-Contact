/* ============================================================
   OpenContact — interface · « À découvrir »
   (docs/recherche.md, lot 2 ; docs/presentation-recherche.md)

   Ce que l'annuaire public des entreprises connaît et que tu n'as pas
   encore. C'est une VUE de « Mes pistes », pas une section enterrée
   sous elles : le contrôle à deux segments sous la barre (ui/pistes.js)
   la montre avant même qu'on s'en serve, et son compte se remplit
   pendant qu'on tape — au pouce, au-dessus du clavier.

   La question part TOUTE SEULE après une pause dans la frappe (décision
   du mainteneur), mais n'emporte que ce qui décrit une entreprise — le
   tri vit dans `engine/annuaire.js`, et `e2e-decouvrir.mjs` lit chaque
   requête qui sort. Rien ne part au démarrage : barre vide, c'est le
   TAP sur le segment qui pose la question de ta zone.

   DEUX INTERFACES (§5, l'usage diffère) : au pouce une liste, puis
   l'aperçu en feuille ; au poste la liste et l'aperçu CÔTE À CÔTE
   (Material 3, liste-détail) — comparer dix entreprises ne coûte plus
   dix fenêtres.

   LÉGER (demande du mainteneur, 5 octobre : « pas de gros boutons, pas
   de rajout dégoulinant ») : AUCUN bouton sur les lignes. La ligne
   ouvre l'aperçu, et l'aperçu porte le seul geste plein — « Ajouter à
   mes pistes ». Une entreprise ajoutée garde sa ligne, à sa place, et
   le dit en un mot (« ✓ dans tes pistes ») : on voit où elle est
   partie. Annuler 30 s (§6).
   ============================================================ */
import { esc, uid, todayISO } from '../engine/utils.js';
import { normalizeCompany } from '../engine/model.js';
import { questionsAnnuaire, lireAnnuaire, decouvertes, versPiste, motsInterdits, ficheOfficielle,
         genreQuestion, liensPiste, PAR_PAGE } from '../engine/annuaire.js';
import { zoneDe } from '../engine/requete.js';
import { S, bus, saveData, logJ, deletePiste } from './state.js';
import { ic, openSheet, btn, showUndo, annoncer } from './dom.js';

const PAUSE = 650;                 /* ms sans frappe avant de demander */
const cache = new Map();           /* url → réponse : on ne redemande pas ce qu'on a déjà */
let etat = { cle: '', urls: [], phase: 'repos', parQ: [], ordre: [], total: 0, page: 1 };
let ctrl = null, minut = null, notifier = () => {};
/* La zone se retire d'un tap, pour la session (docs/sources.md, décision
   du 5/10 : appliquée d'office, mais visible et défaisable). Rien n'est
   écrit : c'est un geste sur une recherche, pas un réglage. */
let sansZone = false, dernier = { interp: null, o: {} };
/* ce que tu as ajouté depuis CETTE liste : la ligne reste, cochée */
const ajoutees = new Map();          /* siren → id de la piste */
let choisi = '';                     /* au poste : la ligne dont l'aperçu est ouvert */
const mqLarge = matchMedia('(min-width:901px)');

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
  dernier = { interp, o };
  /* TA ZONE : seulement quand la question n'a pas de lieu à elle */
  const aLieu = ((interp && interp.etiquettes) || []).some(e => e.famille === 'lieu');
  const candidate = aLieu ? null : zoneDe(S.companies);
  const zone = sansZone ? null : candidate;
  const base = { interdits: motsInterdits(S.companies, S.orphans, S.profile), userPos: o.userPos,
                 parDefaut: !!o.actif };
  const urls = questionsAnnuaire(interp, { ...base, zone });
  /* retirée, elle reste PROPOSÉE (en pointillé) tant qu'elle changerait
     quelque chose : un tap la remet — proposé en pointillé, posé en plein */
  const proposee = (sansZone && candidate && questionsAnnuaire(interp, { ...base, zone: candidate }).join('|') !== urls.join('|'))
    ? candidate : null;
  /* la clé dit aussi D'OÙ vient le lieu : « alternance Lille » et ta
     zone du Nord posent la même question à l'annuaire, mais pas la même
     à l'écran (l'une montre l'étiquette de zone, l'autre non) */
  const cle = urls.join('|') + '#' + (zone ? 'z' + zone.dept : '') + '#' + (proposee ? proposee.dept : '');
  if (cle === etat.cle) return;
  if (ctrl) ctrl.abort();
  clearTimeout(minut);
  ajoutees.clear();
  choisi = '';
  etat = { cle, urls, phase: 'repos', parQ: urls.map(() => []), ordre: [], total: 0, page: 1,
           genres: urls.map(genreQuestion),
           zone: (zone && urls.some(u => new URL(u).searchParams.get('departement') === zone.dept)) ? zone : null,
           proposee,
           ville: villeDe(interp), userPos: o.userPos || null, interp,
           /* la barre est vide : seul le tap sur le segment a demandé */
           parDefaut: !(interp && (interp.etiquettes.length || interp.texte.length)) };
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
        /* plusieurs questions : on ne les tire pas d'un coup — RELEVÉ le
           5/10, l'annuaire rend « 429 » dès une dizaine d'appels serrés */
        if (k > 0) await attendre(300, signal);
        j = await lireUrl(u, signal);
        cache.set(u, j);
      }
      listes.push(lireAnnuaire(j, { ville: etat.ville, userPos: etat.userPos }));
      total = Math.max(total, Number(j && j.total_results) || 0);
    }
    if (cle !== etat.cle) return;
    /* chaque question garde SA liste, pages mises bout à bout : le rang
       d'une entreprise dans sa question reste son vrai rang (la fusion
       en dépend) */
    etat.parQ = etat.parQ.map((l, k) => (page > 1 ? l : []).concat(listes[k] || []));
    etat.total = total;
    etat.page = page;
    etat.phase = 'ok';
    /* l'ordre de ce qui est DÉJÀ à l'écran ne bouge plus : « Voir 10 de
       plus » ajoute dessous, il ne rebat pas ce qu'on vient de lire */
    const classees = classer();
    const deja = new Set(page > 1 ? etat.ordre : []);
    etat.ordre = [...(page > 1 ? etat.ordre : []), ...classees.map(r => r.siren).filter(x => !deja.has(x))];
    /* ne parle que s'il a quelque chose de NEUF : « rien dans l'annuaire »
       recouvrirait, une demi-seconde plus tard, le compte de tes pistes
       qu'un lecteur d'écran vient d'entendre — le décor par-dessus
       l'information */
    const n = visibles().length;
    if (n) annoncer(`${n} entreprise${n > 1 ? 's' : ''} à découvrir.`);
    if (!choisi || !visibles().some(r => r.siren === choisi)) choisi = (visibles()[0] || {}).siren || '';
  } catch (e){
    if (e && e.name === 'AbortError') return;
    if (cle !== etat.cle) return;
    etat.phase = navigator.onLine === false ? 'horsligne' : (e && e.limite) ? 'limite' : 'erreur';
  }
  notifier();
}

/* ce qui reste à montrer : une entreprise = une ligne, rien de ce qui
   était déjà dans tes pistes — sauf ce que tu viens d'y mettre depuis
   cette liste, qui garde sa ligne, cochée */
const classer = () => {
  const deja = new Set(ajoutees.values());
  return decouvertes(etat.parQ, S.companies.filter(c => !deja.has(c.id)),
    { genres: etat.genres, userPos: etat.userPos, ville: etat.ville });
};
function visibles(){
  const l = classer();
  const rang = new Map(etat.ordre.map((x, i) => [x, i]));
  return l.sort((a, b) => (rang.get(a.siren) ?? 1e9) - (rang.get(b.siren) ?? 1e9));
}
export const decouverteActive = () => etat.phase !== 'repos';
export const decouverteVide = () => etat.phase === 'ok' && !visibles().length;
/* le compte du segment : un chiffre, « … » pendant qu'on cherche, rien
   tant qu'aucune question n'est posée */
export function compteDecouverte(){
  if (etat.phase === 'attente' || etat.phase === 'charge') return { texte: '…', occupe: true };
  if (etat.phase === 'ok' || etat.phase === 'plus'){
    const n = visibles().length;
    return { texte: String(n) + (etat.total > etat.page * PAR_PAGE ? '+' : ''), n };
  }
  return { texte: '' };
}
const estPrise = siren => ajoutees.has(siren) && S.companies.some(c => c.id === ajoutees.get(siren));

const km = d => d == null ? '' : (d < 1 ? '< 1 km' : Math.round(d) + ' km');
/* La ligne dit ce qui DÉPARTAGE : où, à quelle distance, quelle taille.
   L'activité — « Conseil en systèmes et logiciels informatiques » neuf
   fois sur dix — ne départage rien : elle vit dans l'aperçu. */
const sousLigne = r => [r.ville, km(r.distance), r.effectif].filter(Boolean).join(' · ');
function ligneHTML(r){
  const pris = estPrise(r.siren), sel = mqLarge.matches && r.siren === choisi;
  return (
    `<div class="dc-row${pris ? ' dc-pris' : ''}${sel ? ' dc-sel' : ''}" data-siren="${esc(r.siren)}">
       <div class="dc-main" role="button" tabindex="0" aria-label="${esc(r.nom)}${pris ? ', dans tes pistes' : ''}"${sel ? ' aria-current="true"' : ''}>
         <span class="dc-nom">${esc(r.nom)}</span>
         <span class="dc-sub">${pris ? `<span class="dc-ok">${ic('check', 'ic-12')}dans tes pistes</span>` : ''}${esc(sousLigne(r))}</span>
       </div>
     </div>`);
}

/* LA ZONE vit dans la rangée d'étiquettes de la barre — elle EST une
   étiquette de la question — : posée (pleine, sa croix la retire) ou
   proposée (pointillée, un tap la remet). Zéro rangée de plus. */
export function zoneEtiquetteHTML(){
  if (etat.zone) return (
    `<button class="st-chip" data-dc-zone="off" aria-label="Retirer la zone ${esc(etat.zone.label)}">${
      ic('map-pin', 'ic-14')}${esc(etat.zone.label)}${ic('close', 'ic-12')}</button>`);
  if (etat.proposee) return (
    `<button class="prop-chip" data-dc-zone="on" aria-label="Chercher dans ${esc(etat.proposee.label)}">${
      ic('map-pin', 'ic-14')}${esc(etat.proposee.label)}</button>`);
  return '';
}
export function lierZone(box){
  box?.querySelector('[data-dc-zone]')?.addEventListener('click', e => {
    sansZone = e.currentTarget.dataset.dcZone === 'off';
    suivreDecouverte(dernier.interp, dernier.o);
    notifier();
    /* le focus ne tombe pas par terre (§6) : la puce redessinée reprend
       la main, sinon la barre */
    requestAnimationFrame(() => {
      const ici = document.querySelector('#piChips [data-dc-zone]');
      if (ici) ici.focus({ preventScroll: true });
      else document.getElementById('piQ')?.focus({ preventScroll: true });
    });
  });
}

/* L'APERÇU — trois niveaux, et rien de lourd : QUI (le nom), QUOI ET OÙ
   (activité, puis lieu · taille · âge sur une ligne — ce que les
   étudiants regardent pour choisir : missions, secteur, distance),
   COMMENT Y ENTRER (les anciens de ton école, les offres — des LIENS :
   ils emmènent ailleurs, §6). Le reste en petit gris, sans étiquettes.
   Un seul geste plein : ajouter. */
export function apercuHTML(r, o){
  o = o || {};
  const pris = estPrise(r.siren);
  const an = (r.creation || '').slice(0, 4);
  const faits = [[r.ville, km(r.distance)].filter(Boolean).join(' · '), r.effectif, an ? 'depuis ' + an : '']
    .filter(Boolean).join(' · ');
  const dir = (r.dirigeants || []).filter(d => d.personne).slice(0, 2)
    .map(d => `${esc(d.nom)}${d.qualite ? `, ${esc(d.qualite.toLowerCase())}` : ''}`).join(' · ');
  const liens = liensPiste({ name: r.nom, siren: r.siren }, S.profile).filter(l => l.cle !== 'officielle');
  const officielle = ficheOfficielle(r.siren);
  const lien = (url, label, aria) => `<a class="linklike" href="${esc(url)}" target="_blank" rel="noopener"${
    aria ? ` aria-label="${esc(aria)}"` : ''}>${esc(label)}${ic('external-link', 'ic-12')}</a>`;
  return (
    `<div class="ap">
       <h3 class="ap-nom">${esc(r.nom)}</h3>
       ${r.activite ? `<p class="ap-act">${esc(r.activite)}</p>` : ''}
       ${faits ? `<p class="ap-faits">${esc(faits)}</p>` : ''}
       ${o.panneau ? `<div class="ap-agir">${pris
         ? `<span class="ap-pris">${ic('check', 'ic-14')}Dans tes pistes</span>
            <button class="linklike" data-ap-fiche="${esc(r.siren)}">Ouvrir la fiche</button>`
         : `<button class="btn btn-primary" data-ap-add="${esc(r.siren)}">${ic('plus', 'ic-14')}Ajouter à mes pistes</button>`}</div>` : ''}
       ${liens.length ? `<div class="ap-liens">${liens.map(l => lien(l.url, l.label, l.aria)).join('')}</div>` : ''}
       <div class="ap-plus">
         ${r.adresse ? `<p>${esc(r.adresse.replace(/\n/g, ', '))}</p>` : ''}
         ${dir ? `<p>${dir}</p>` : ''}
         <p><span class="ap-siren">SIREN ${esc(r.siren)}</span>${r.etablissements > 1 ? ` · ${esc(r.etablissements + ' établissements')}` : ''}${
           officielle ? ` · ${lien(officielle, 'fiche officielle')}` : ''}</p>
       </div>
     </div>`);
}

/* la vue, selon l'état */
export function decouverteHTML(){
  const l = (etat.phase === 'ok' || etat.phase === 'plus') ? visibles() : [];
  let corps;
  if (etat.phase === 'repos')
    /* aucune question : la barre est vide et tu n'as pas encore de zone */
    corps = `<p class="dc-etat">Tape un métier et une ville.</p>`;
  else if (etat.phase === 'attente' || etat.phase === 'charge')
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
    const liste =
      `<div class="dc-list">${l.map(ligneHTML).join('')}</div>
       ${reste > 0 ? `<button class="linklike tr-more" data-dc-plus${etat.phase === 'plus' ? ' aria-busy="true"' : ''}>${
         etat.phase === 'plus' ? 'Je cherche…' : 'Voir 10 de plus'}</button>` : ''}`;
    const r = mqLarge.matches ? (l.find(x => x.siren === choisi) || l[0]) : null;
    corps = r
      ? `<div class="dc-split">
           <div class="dc-col">${liste}</div>
           <aside class="dc-detail" aria-label="Aperçu de ${esc(r.nom)}">${apercuHTML(r, { panneau: true })}</aside>
         </div>`
      : liste;
  }
  return (
    `<section class="dc-vue" aria-label="À découvrir">
       ${corps}
       ${/* la source se nomme : la licence de l'annuaire le demande, et
            c'est ce qui dit d'où viennent des entreprises qu'on n'a
            jamais saisies — en pied, discrète */''}
       <p class="dc-src-l">Source : <a class="dc-src" href="https://annuaire-entreprises.data.gouv.fr" target="_blank" rel="noopener">annuaire des entreprises</a></p>
     </section>`);
}

/* ajouter : une piste comme si on l'avait saisie, puis Annuler 30 s ;
   la ligne reste, et le dit */
function ajouter(r){
  const c = normalizeCompany({ ...versPiste(r, etat.interp), id: uid(), createdAt: Date.now() });
  c.history = [{ d: todayISO(), t: 'Ajoutée depuis l’annuaire' }];
  S.companies.push(c);
  ajoutees.set(r.siren, c.id);
  saveData();
  logJ('Piste ajoutée depuis l’annuaire : ' + c.name, c.id);
  bus.refresh();
  showUndo(`${ic('check', 'ic-14')} « ${esc(c.name)} » ajoutée.`, () => {
    deletePiste(c); ajoutees.delete(r.siren); bus.refresh();
  });
  return c;
}

/* au pouce, l'aperçu en feuille ; le pied porte le geste */
function ouvrirApercu(r){
  const sh = openSheet({ title: 'À découvrir', icon: 'building' });
  sh.body.innerHTML = apercuHTML(r);
  sh.setFoot([estPrise(r.siren)
    ? btn('Ouvrir la fiche', 'btn-primary', () => { sh.close(); ouvrirFiche(r); }, 'briefcase')
    : btn('Ajouter à mes pistes', 'btn-primary', () => { sh.close(); ajouter(r); }, 'plus')]);
  return sh;
}
async function ouvrirFiche(r){
  const c = S.companies.find(x => x.id === ajoutees.get(r.siren));
  if (c) (await import('./fiche.js')).openFiche(c);
}

/* au poste, choisir une ligne met l'aperçu à jour — sans redessiner la
   liste (le focus et le défilement restent où ils sont) */
function choisir(box, siren){
  if (!mqLarge.matches || siren === choisi) return;
  const r = visibles().find(x => x.siren === siren);
  const aside = box.querySelector('.dc-detail');
  if (!r || !aside) return;
  choisi = siren;
  box.querySelectorAll('.dc-row').forEach(row => {
    const on = row.dataset.siren === siren;
    row.classList.toggle('dc-sel', on);
    const m = row.querySelector('.dc-main');
    if (on) m.setAttribute('aria-current', 'true'); else m.removeAttribute('aria-current');
  });
  aside.setAttribute('aria-label', 'Aperçu de ' + r.nom);
  aside.innerHTML = apercuHTML(r, { panneau: true });
  lierApercu(box, aside);
}
function lierApercu(box, aside){
  const trouve = siren => visibles().find(x => x.siren === siren);
  aside.querySelector('[data-ap-add]')?.addEventListener('click', e => {
    const r = trouve(e.currentTarget.dataset.apAdd);
    if (r){ ajouter(r); requestAnimationFrame(() => document.querySelector('#piBody .dc-detail [data-ap-fiche]')?.focus()); }
  });
  aside.querySelector('[data-ap-fiche]')?.addEventListener('click', e => {
    const r = trouve(e.currentTarget.dataset.apFiche);
    if (r) ouvrirFiche(r);
  });
}

/* les gestes de la vue — posés après chaque rendu */
export function lierDecouverte(box, o){
  if (!box) return;
  o = o || {};
  const trouve = siren => visibles().find(x => x.siren === siren);
  box.querySelectorAll('.dc-row').forEach(row => {
    const r = trouve(row.dataset.siren);
    if (!r) return;
    const main = row.querySelector('.dc-main');
    const ouvrir = () => mqLarge.matches ? choisir(box, r.siren) : ouvrirApercu(r);
    main.addEventListener('click', ouvrir);
    /* au poste, l'aperçu suit le focus (le clavier parcourt la liste) */
    main.addEventListener('focus', () => { if (mqLarge.matches) choisir(box, r.siren); });
    main.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(); }
    });
  });
  const aside = box.querySelector('.dc-detail');
  if (aside) lierApercu(box, aside);
  box.querySelector('[data-dc-encore]')?.addEventListener('click', () => {
    for (const u of etat.urls) cache.delete(avecPage(u, etat.page || 1));
    charger(etat.cle, 1);
  });
  box.querySelector('[data-dc-plus]')?.addEventListener('click', () => {
    if (etat.phase !== 'plus') charger(etat.cle, etat.page + 1);
  });
}
