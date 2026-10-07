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
import { questionsAnnuaire, lireAnnuaire, decouvertes, versPiste, motsInterdits,
         genreQuestion, offresAlternance, offresStage, ajoutsProfil, loinDe, PAR_PAGE,
         ecarter, rendre, sirensEcartes, cleVus, lireVus, nouveauxDe, noterVus } from '../engine/annuaire.js';
import { zoneDe, metierDuProfil, villeFrequente, cleDe, centreDe as centreVille, villeConnue, rayonDe } from '../engine/requete.js';
import { kvGet, kvSet, VUS_KEY } from '../engine/storage.js';
import { S, bus, saveData, saveProfile, logJ, deletePiste } from './state.js';
import { ic, openSheet, btn, showUndo, annoncer, bindDeleteGesture } from './dom.js';
import { suivreCarte, carteDe, carteHTML, alerteHTML, sourcesHTML, lierCarte } from './carte.js';
import { travailDe } from '../engine/carte.js';

const PAUSE = 650;                 /* ms sans frappe avant de demander */
const cache = new Map();           /* url → réponse : on ne redemande pas ce qu'on a déjà */
let etat = { cle: '', urls: [], phase: 'repos', parQ: [], ordre: [], total: 0, page: 1 };
let ctrl = null, minut = null, notifier = () => {};
/* La zone se retire d'un tap, pour la session (docs/sources.md, décision
   du 5/10 : appliquée d'office, mais visible et défaisable). Rien n'est
   écrit : c'est un geste sur une recherche, pas un réglage. */
let sansZone = false, dernier = { interp: null, o: {} };
/* ce que le PROFIL ajoute (ta ville, le métier de ta formation) se
   retire de la même façon, pour la session (docs/recherche-profil.md) */
const sansProfil = { lieu: false, metier: false };
/* « Nouveau » : ce que chaque recherche a déjà montré, sur CET appareil */
let vus = null;
async function chargerVus(){
  if (vus) return vus;
  try { vus = lireVus(await kvGet(VUS_KEY)); } catch (e) { vus = lireVus(null); }
  return vus;
}
/* ce que tu as ajouté depuis CETTE liste : la ligne reste, cochée */
const ajoutees = new Map();          /* siren → id de la piste */
let choisi = '';                     /* au poste : la ligne dont l'aperçu est ouvert */
const mqLarge = matchMedia('(min-width:901px)');

/* la ville cherchée choisit l'établissement à montrer (le bon, pas le siège) */
const villeDe = interp => {
  const e = ((interp && interp.etiquettes) || []).find(x => x.famille === 'lieu' && x.ville);
  return e ? e.ville : '';
};
/* LE POINT DE RÉFÉRENCE : le centre de la ville tapée — « Lille » veut
   dire autour de Lille, et la distance de chaque ligne se lit depuis
   elle. « Près de moi » garde ta position. */
const centreDe = interp => {
  const e = ((interp && interp.etiquettes) || []).find(x => x.famille === 'lieu' && Array.isArray(x.centre));
  return e ? { lat: e.centre[0], lng: e.centre[1] } : null;
};
const procheDe = interp => ((interp && interp.etiquettes) || []).some(x => x.famille === 'lieu' && x.cle === 'proche');

/* Suivre la barre. Appelé à chaque rendu de « Mes pistes » : ne fait
   rien tant que la question ne change pas. */
export function suivreDecouverte(interp, o){
  o = o || {};
  notifier = o.notifier || notifier;
  dernier = { interp, o };
  /* CE QUE TON PROFIL AJOUTE : ta ville et ton rayon, le métier de ta
     formation — des étiquettes visibles, avec leur croix. Seulement pour
     une question qu'on POSE : la barre dit quelque chose, ou « À
     découvrir » est ouvert. Barre vide sur « Mes pistes », rien ne part
     (relevé à l'audit du 6/10 : une ville dans le profil suffisait à
     interroger l'annuaire dès l'ouverture de l'onglet, sans un geste). */
  const pose = !!(o.actif || (interp && (interp.etiquettes.length || interp.texte.length)));
  const aj = pose ? ajoutsProfil(interp, S.profile, sansProfil)
    : { interp, lieu: null, metier: null, lieuPropose: null, metierPropose: null };
  const brut = interp;
  interp = aj.interp;
  /* TA ZONE : seulement quand la question n'a pas de lieu à elle — et
     jamais quand ton profil en dit un, même retiré : « Autour de Lille »
     est une intention, la zone n'est qu'une déduction */
  const aLieu = ((interp && interp.etiquettes) || []).some(e => e.famille === 'lieu') || !!aj.lieuPropose;
  const candidate = aLieu ? null : zoneDe(S.companies);
  const zone = sansZone ? null : candidate;
  const base = { interdits: motsInterdits(S.companies, S.orphans, S.profile), userPos: o.userPos,
                 parDefaut: !!o.actif, rayonVille: rayonDe(S.profile) };
  const urls = questionsAnnuaire(interp, { ...base, zone });
  /* retirée, elle reste PROPOSÉE (en pointillé) tant qu'elle changerait
     quelque chose : un tap la remet — proposé en pointillé, posé en plein */
  const proposee = (sansZone && candidate && questionsAnnuaire(interp, { ...base, zone: candidate }).join('|') !== urls.join('|'))
    ? candidate : null;
  /* la clé dit aussi D'OÙ vient le lieu : « alternance Lille » et ta
     zone du Nord posent la même question à l'annuaire, mais pas la même
     à l'écran (l'une montre l'étiquette de zone, l'autre non) */
  const cle = urls.join('|') + '#' + (zone ? 'z' + zone.dept : '') + '#' + (proposee ? proposee.dept : '')
    + '#' + [aj.lieu, aj.metier, aj.lieuPropose, aj.metierPropose].map(e => e ? e.id + (e.rayon || '') : '').join(',');
  if (cle === etat.cle) return;
  if (ctrl) ctrl.abort();
  clearTimeout(minut);
  ajoutees.clear();
  choisi = '';
  etat = { cle, urls, phase: 'repos', parQ: urls.map(() => []), ordre: [], total: 0, page: 1,
           genres: urls.map(genreQuestion),
           zone: (zone && urls.some(u => new URL(u).searchParams.get('departement') === zone.dept)) ? zone : null,
           proposee, profil: aj,
           ville: villeDe(interp), interp,
           ...(() => {
             const c = procheDe(interp) && o.userPos ? null : centreDe(interp);
             const l = (interp.etiquettes || []).find(x => x.famille === 'lieu' && Array.isArray(x.centre));
             return { userPos: c || o.userPos || null, loin: c ? loinDe((l && l.rayon) || rayonDe(S.profile)) : 0 };
           })(),
           cleVus: cleVus(urls), nouveaux: new Set(),
           /* la barre est vide : seul le tap sur le segment a demandé */
           parDefaut: !(brut && (brut.etiquettes.length || brut.texte.length)) };
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
    /* « NOUVEAU » : comparé à la fois d'avant, puis retenu pour la
       prochaine. Ce qui était déjà là ne se marque pas deux fois dans
       la même session : le souvenir est lu une fois par recherche. */
    const montres = visibles().map(r => r.siren);
    const v = await chargerVus();
    if (cle !== etat.cle) return;
    if (page === 1) etat.nouveaux = nouveauxDe(v, etat.cleVus, montres);
    else for (const x of nouveauxDe(v, etat.cleVus, montres)) etat.nouveaux.add(x);
    vus = noterVus(v, etat.cleVus, montres);
    kvSet(VUS_KEY, JSON.stringify(vus)).catch(() => {});
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
    { genres: etat.genres, userPos: etat.userPos, ville: etat.ville, loin: etat.loin,
      ecartees: sirensEcartes(S.profile.ecartees), metier: metierDuProfil(S.profile) });
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

/* espace insécable : « 3 » et « km » ne se séparent jamais d'un rang à
   l'autre (relevé sous WebKit, audit d'octobre 2026 : « Lille · 3 » puis
   « km » au rang suivant) */
const km = d => d == null ? '' : (d < 1 ? '<\u00a01\u00a0km' : Math.round(d) + '\u00a0km');
/* La ligne dit ce qui DÉPARTAGE : où, à quelle distance, quelle taille.
   L'activité — « Conseil en systèmes et logiciels informatiques » neuf
   fois sur dix — ne départage rien : elle vit dans l'aperçu. La taille
   est celle du SITE quand l'INSEE la sait (« 6-9 salariés ici ») : un
   stagiaire rejoint un bureau, pas un groupe. */
const sousLigne = r => [r.ville, km(r.distance), r.effectifIci ? r.effectifIci + ' ici' : r.effectif].filter(Boolean).join(' · ');
/* ce qui colle à ta formation — dit sur la ligne seulement quand ça
   DÉPARTAGE (§6 : la raison se lit sur la ligne, et ce qui est vrai de
   toutes ne dit rien) */
let colleAffiche = false;
const colleDe = r => { const m = metierDuProfil(S.profile); const t = m && travailDe(r); return !!(t && t.metiers.includes(m)); };
function ligneHTML(r){
  const pris = estPrise(r.siren), sel = mqLarge.matches && r.siren === choisi;
  const neuf = !pris && etat.nouveaux.has(r.siren);
  const ton = !pris && colleAffiche && colleDe(r);
  const marque = pris ? `<span class="dc-ok">${ic('check', 'ic-12')}dans tes pistes</span>`
    : (neuf ? '<span class="dc-neuf">nouveau</span>' : '') + (ton ? '<span class="dc-ton">ta formation</span>' : '');
  const dit = [r.nom, pris ? 'dans tes pistes' : '', neuf ? 'nouveau' : '', ton ? 'colle à ta formation' : ''].filter(Boolean).join(', ');
  return (
    `<div class="dc-row${pris ? ' dc-pris' : ''}${sel ? ' dc-sel' : ''}" data-siren="${esc(r.siren)}" data-l="${esc(r.siren)}">
       <div class="sw-in">
         <div class="dc-main sw-cible" role="button" tabindex="0" aria-label="${esc(dit)}"${sel ? ' aria-current="true"' : ''}>
           <span class="dc-nom">${esc(r.nom)}</span>
           <span class="dc-sub">${marque}${esc(sousLigne(r))}</span>
         </div>
       </div>
     </div>`);
}

/* LA ZONE vit dans la rangée d'étiquettes de la barre — elle EST une
   étiquette de la question — : posée (pleine, sa croix la retire) ou
   proposée (pointillée, un tap la remet). Zéro rangée de plus.
   CE QUE TON PROFIL AJOUTE vit au même endroit, de la même façon (docs/
   recherche-profil.md) : le métier de ta formation, ta ville et son
   rayon — « Lille · 15 km ». `marque` dessine l'icône comme pour une
   étiquette tapée : on ne réapprend pas à lire une étiquette. */
export function zoneEtiquetteHTML(marque){
  marque = marque || (() => ic('map-pin', 'ic-14'));
  const pf = etat.profil || {};
  const nom = e => e.famille === 'lieu' ? `${e.label} · ${e.rayon}\u00a0km` : e.label;
  const pose = (e, k) => `<button class="st-chip" data-dc-pf="${k}" data-on="0" aria-label="Retirer « ${esc(nom(e))} », de ton profil">${
    marque(e)}${esc(nom(e))}${ic('close', 'ic-12')}</button>`;
  const prop = (e, k) => `<button class="prop-chip" data-dc-pf="${k}" data-on="1" aria-label="Chercher avec « ${esc(nom(e))} », de ton profil">${
    marque(e)}${esc(nom(e))}</button>`;
  const bits = [];
  if (pf.metier) bits.push(pose(pf.metier, 'metier'));
  if (pf.lieu) bits.push(pose(pf.lieu, 'lieu'));
  if (etat.zone) bits.push(
    `<button class="st-chip" data-dc-zone="off" aria-label="Retirer la zone ${esc(etat.zone.label)}">${
      ic('map-pin', 'ic-14')}${esc(etat.zone.label)}${ic('close', 'ic-12')}</button>`);
  if (pf.metierPropose) bits.push(prop(pf.metierPropose, 'metier'));
  if (pf.lieuPropose) bits.push(prop(pf.lieuPropose, 'lieu'));
  if (etat.proposee) bits.push(
    `<button class="prop-chip" data-dc-zone="on" aria-label="Chercher dans ${esc(etat.proposee.label)}">${
      ic('map-pin', 'ic-14')}${esc(etat.proposee.label)}</button>`);
  return bits.join('');
}
export function lierZone(box){
  const refaire = sel => {
    suivreDecouverte(dernier.interp, dernier.o);
    notifier();
    /* le focus ne tombe pas par terre (§6) : la puce redessinée reprend
       la main, sinon la barre */
    requestAnimationFrame(() => {
      const ici = document.querySelector('#piChips ' + sel);
      if (ici) ici.focus({ preventScroll: true });
      else document.getElementById('piQ')?.focus({ preventScroll: true });
    });
  };
  box?.querySelector('[data-dc-zone]')?.addEventListener('click', e => {
    sansZone = e.currentTarget.dataset.dcZone === 'off';
    refaire('[data-dc-zone]');
  });
  box?.querySelectorAll('[data-dc-pf]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.dcPf;
    sansProfil[k] = b.dataset.on !== '1';
    refaire(`[data-dc-pf="${k}"]`);
  }));
}

/* L'APERÇU — ce qui décide, et rien d'autre. QUI (le nom), OÙ (le
   lieu, la distance — et une alerte en ligne si l'entreprise a fermé ou
   traverse une procédure), puis LA CARTE (ui/carte.js) : ce qu'elle
   fait, ses missions, sa taille, à qui écrire. Le seul geste plein vit
   au pied de la feuille (au poste, juste sous le lieu).
   LE MINIMUM (décision du mainteneur, 7 octobre 2026) : l'aperçu
   finissait par deux liens (« Anciens de mon école », « Offres
   d'emploi »), l'adresse du siège, le SIREN et « fiche officielle » —
   quatre lignes qui n'aidaient pas à CHOISIR. Parties : on choisit ici,
   on cherche quelqu'un dans « Ajouter un contact », une fois la piste
   prise. */
export function apercuHTML(r, o){
  o = o || {};
  const pris = estPrise(r.siren);
  const k = carteDe(r, null, metierDuProfil(S.profile), S.profile);
  const lieu = [r.ville, km(r.distance)].filter(Boolean).join(' · ');
  return (
    `<div class="ap">
       <h3 class="ap-nom">${esc(r.nom)}</h3>
       ${lieu || k.alerte ? `<p class="ap-faits">${esc(lieu)}${alerteHTML(k)}</p>` : ''}
       ${o.panneau ? `<div class="ap-agir">${pris
         ? `<span class="ap-pris">${ic('check', 'ic-14')}Dans tes pistes</span>
            <button class="linklike" data-ap-fiche="${esc(r.siren)}">Ouvrir la fiche</button>`
         : `<button class="btn btn-primary" data-ap-add="${esc(r.siren)}">${ic('plus', 'ic-14')}Ajouter à mes pistes</button>
            <button class="btn btn-sm" data-ap-ecarter="${esc(r.siren)}">${ic('close', 'ic-14')}Pas pour moi</button>`}</div>` : ''}
       <div class="ct">${carteHTML(k, { nom: r.nom })}</div>
       ${sourcesHTML(k)}
     </div>`);
}

/* QUI RECRUTE EN ALTERNANCE, autour d'ici : un lien vers le service
   public (La bonne alternance), APRÈS la liste — c'est la réponse à
   « est-ce qu'elles recrutent ? » que l'annuaire ne sait pas donner.
   Seulement pour une alternance, et avec un lieu qui a un centre : la
   ville tapée, sinon celle de tes pistes. */
function offresHTML(){
  /* la ville de repli : celle de ton profil, sinon celle de tes pistes */
  const vp = villeConnue(S.profile && S.profile.ville);
  const vf = vp ? vp.nom : villeFrequente(S.companies);
  const c = vp ? vp.centre : vf && centreVille(cleDe(vf));
  const o = { recherche: S.profile && S.profile.recherche, metier: metierDuProfil(S.profile),
    centre: c ? { lat: c[0], lng: c[1], nom: vf } : null, ville: vf };
  const a = offresAlternance(etat.interp, o);
  /* le STAGE a son lien aussi (décision du 6/10) : HelloWork garde ses
     critères dans son adresse, mesuré métier par métier */
  const st = !a && offresStage(etat.interp, o);
  const l = a ? { ...a, mot: 'Offres d’alternance' } : st ? { ...st, mot: 'Offres de stage' } : null;
  return l ? `<a class="linklike dc-offres" href="${esc(l.url)}" target="_blank" rel="noopener">${ic('briefcase', 'ic-14')}<span>${l.mot} autour de ${
    esc(l.lieu)}</span>${ic('external-link', 'ic-12')}</a>` : '';
}
/* la vue, selon l'état */
export function decouverteHTML(){
  const l = (etat.phase === 'ok' || etat.phase === 'plus') ? visibles() : [];
  let corps;
  /* aucune question (la barre est vide, et pas de zone) : RIEN. Le texte
     d'invite de la barre dit déjà quoi taper — « Tape un métier et une
     ville » le redisait sous le clavier (minimalisme, 7 octobre) */
  if (etat.phase === 'repos')
    corps = '';
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
    /* « ta formation » ne se dit que si elle départage : vraie de toutes
       ou d'aucune, elle ne dit rien */
    const nColle = l.filter(colleDe).length;
    colleAffiche = nColle > 0 && nColle < l.length;
    const reste = etat.total - etat.page * PAR_PAGE;
    const liste =
      `<div class="dc-list">${l.map(ligneHTML).join('')}</div>
       ${reste > 0 ? `<button class="linklike tr-more" data-dc-plus${etat.phase === 'plus' ? ' aria-busy="true"' : ''}>${
         etat.phase === 'plus' ? 'Je cherche…' : 'Voir 10 de plus'}</button>` : ''}`;
    const r = mqLarge.matches ? (l.find(x => x.siren === choisi) || l[0]) : null;
    corps = r
      ? `<div class="dc-split">
           <div class="dc-col">${liste}</div>
           <aside class="dc-detail" data-siren="${esc(r.siren)}" aria-label="Aperçu de ${esc(r.nom)}">${apercuHTML(r, { panneau: true })}</aside>
         </div>`
      : liste;
  }
  const nEc = (S.profile.ecartees || []).length;
  const resultats = ['ok', 'plus'].includes(etat.phase) && l.length;
  return (
    `<section class="dc-vue" aria-label="À découvrir">
       ${corps}
       ${/* LES OFFRES APRÈS LA LISTE, plus devant : on regarde d'abord les
            entreprises — le lien vers ailleurs vient quand on a fini de
            lire (minimalisme, 7 octobre). La ligne du marché (BMO) est
            partie : elle n'aidait à choisir aucune entreprise. */''}
       ${resultats ? offresHTML() : ''}
       ${nEc && resultats ? `<button class="linklike dc-ecl" data-dc-ecartees>Écartées · ${nEc}</button>` : ''}
       ${/* la source se nomme : la licence de l'annuaire le demande —
            seulement quand il a rendu quelque chose */''}
       ${resultats ? `<p class="dc-src-l">Source : <a class="dc-src" href="https://annuaire-entreprises.data.gouv.fr" target="_blank" rel="noopener">annuaire des entreprises</a></p>` : ''}
     </section>`);
}

/* ajouter : une piste comme si on l'avait saisie, puis Annuler 30 s ;
   la ligne reste, et le dit */
/* PAS POUR MOI (décision du 6/10) : l'entreprise sort de la liste et
   n'y revient plus — retenue dans le profil, donc sur tes appareils et
   dans ta copie. Annuler 30 s (§6) ; « Écartées », en pied de liste, les
   rend une à une. */
function ecarterR(r, o){
  const i = visibles().findIndex(x => x.siren === r.siren);
  S.profile.ecartees = ecarter(S.profile.ecartees, r);
  saveProfile();
  if (choisi === r.siren) choisi = '';
  notifier();
  /* le focus ne tombe pas par terre (§6) : la ligne qui prend sa place,
     sinon la précédente, sinon la barre — seulement quand le geste
     venait du clavier ou d'un bouton (le glissé a son propre repli) */
  if (o && o.focus) requestAnimationFrame(() => {
    const l = [...document.querySelectorAll('#piDec .dc-row .dc-main')];
    (l[i] || l[i - 1] || document.getElementById('piQ'))?.focus({ preventScroll: false });
  });
  showUndo(`« ${esc(r.nom)} » écartée.`, () => {
    S.profile.ecartees = rendre(S.profile.ecartees, r.siren);
    saveProfile();
    notifier();
  });
}
function ouvrirEcartees(){
  const sh = openSheet({ title: 'Écartées', icon: 'close' });
  const dessiner = () => {
    const l = [...(S.profile.ecartees || [])].reverse();
    if (!l.length){ sh.close(); return; }
    sh.body.innerHTML =
      `<div class="pick-list">${l.map(x =>
        `<button class="pick" data-rendre="${esc(x.siren)}" aria-label="Remettre ${esc(x.nom || x.siren)} dans À découvrir">
           <div class="pk-m"><b>${esc(x.nom || 'SIREN ' + x.siren)}</b></div>${ic('undo', 'ic-14')}</button>`).join('')}</div>`;
    sh.body.querySelectorAll('[data-rendre]').forEach(b => b.addEventListener('click', () => {
      S.profile.ecartees = rendre(S.profile.ecartees, b.dataset.rendre);
      saveProfile();
      notifier();
      dessiner();
    }));
  };
  dessiner();
}

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

/* au pouce, l'aperçu en feuille ; le pied porte le geste. La carte se
   complète pendant qu'on lit : chaque réponse redessine l'aperçu, jamais
   le pied */
function ouvrirApercu(r){
  let lacher = () => {};
  const sh = openSheet({ title: 'À découvrir', icon: 'building', onClose: () => lacher() });
  const dessiner = () => { if (!sh.body.isConnected) return; sh.body.innerHTML = apercuHTML(r); lierCarte(sh.body); };
  dessiner();
  lacher = suivreCarte(r.siren, dessiner, r.nom);
  sh.setFoot(estPrise(r.siren)
    ? [btn('Ouvrir la fiche', 'btn-primary', () => { sh.close(); ouvrirFiche(r); }, 'briefcase')]
    : [btn('Pas pour moi', 'btn-sm', () => { sh.close(); ecarterR(r, { focus: true }); }, 'close'),
       btn('Ajouter à mes pistes', 'btn-primary', () => { sh.close(); ajouter(r); }, 'plus')]);
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
  aside.dataset.siren = siren;
  aside.innerHTML = apercuHTML(r, { panneau: true });
  lierApercu(box, aside);
  completerPanneau(box, r);
}
/* Au poste, l'aperçu suit le clavier : ↓ ↓ ↓ ne doit pas lancer trois
   questions. La carte ne se complète qu'une fois la ligne posée — une
   courte pause, comme la barre — et seulement si elle est encore celle
   qu'on regarde. */
let pausePanneau = null, lacherPanneau = () => {};
function completerPanneau(box, r){
  clearTimeout(pausePanneau);
  lacherPanneau();
  pausePanneau = setTimeout(() => {
    lacherPanneau = suivreCarte(r.siren, () => {
      const aside = box.isConnected && box.querySelector('.dc-detail');
      if (!aside || aside.dataset.siren !== r.siren) return;
      aside.innerHTML = apercuHTML(r, { panneau: true });
      lierApercu(box, aside);
    }, r.nom);
  }, 350);
}
function lierApercu(box, aside){
  lierCarte(aside);
  const trouve = siren => visibles().find(x => x.siren === siren);
  aside.querySelector('[data-ap-add]')?.addEventListener('click', e => {
    const r = trouve(e.currentTarget.dataset.apAdd);
    if (r){ ajouter(r); requestAnimationFrame(() => document.querySelector('#piBody .dc-detail [data-ap-fiche]')?.focus()); }
  });
  aside.querySelector('[data-ap-fiche]')?.addEventListener('click', e => {
    const r = trouve(e.currentTarget.dataset.apFiche);
    if (r) ouvrirFiche(r);
  });
  aside.querySelector('[data-ap-ecarter]')?.addEventListener('click', e => {
    const r = trouve(e.currentTarget.dataset.apEcarter);
    if (r) ecarterR(r, { focus: true });
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
    /* « Pas pour moi » au geste : glisser au doigt, la croix au survol —
       le motif de la suppression, avec SON mot (rien n'est supprimé) */
    if (!estPrise(r.siren)) bindDeleteGesture(row, () => ecarterR(r), r.nom, { mot: 'Pas pour moi', icone: 'close' });
  });
  box.querySelector('[data-dc-ecartees]')?.addEventListener('click', ouvrirEcartees);
  const aside = box.querySelector('.dc-detail');
  if (aside){
    lierApercu(box, aside);
    const r = trouve(aside.dataset.siren);
    if (r) completerPanneau(box, r);
  }
  box.querySelector('[data-dc-encore]')?.addEventListener('click', () => {
    for (const u of etat.urls) cache.delete(avecPage(u, etat.page || 1));
    charger(etat.cle, 1);
  });
  box.querySelector('[data-dc-plus]')?.addEventListener('click', () => {
    if (etat.phase !== 'plus') charger(etat.cle, etat.page + 1);
  });
}
