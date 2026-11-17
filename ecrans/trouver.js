/* ============================================================
   OpenContact · la nouvelle interface · Trouver
   (docs/brief-refonte.md §4 et §12, lot 1 ; maquette validée le
   17 novembre 2026, « Tout me va »)

   L'onglet d'ouverture : donner des entreprises dès la première minute.
   Le premier jour, trois questions (ce que tu cherches, ce que tu
   étudies, autour de quelle ville) ; ensuite les trois mots de la
   recherche, qui rouvrent les questions d'un tap, et la liste de
   l'annuaire, chaque ligne avec « Garder ». La barre cherche une
   entreprise par son nom, un métier, une ville, ou lit un lien collé ;
   sinon « Garder tel quel ». Une entreprise est une PAGE : ce qu'elle
   fait, sa taille, ses comptes, ce qui bouge, l'aide à l'embauche, à
   qui écrire.

   Au poste, la liste et l'entreprise sont côte à côte : ↑ ↓ choisit,
   G garde, X écarte, « / » cherche.

   Les réponses vivent dans le profil (`recherche`, `formation`,
   `ville`, `rayon`), les mêmes que l'app actuelle : rien ne migre.
   « Garder » crée une piste `todo` comme une piste qu'on aurait saisie,
   avec la personne à qui écrire quand l'annuaire la nomme (le dirigeant
   d'une PME). « Pas pour moi » range l'entreprise dans le profil
   (`ecartees`), avec « Annuler ».
   ============================================================ */
import { $, ic, esc, plat, km, initiales, annoncer, remplacer } from './outils.js';
import { S, saveData, saveProfile, logJ } from './etat.js';
import { C, rendre, pousser, retour, inscrirePage, annuler, toast, allerA, cles } from './coque.js';
import { chercheur } from './annuaire.js';
import { suivreCarte, carteDe, sourcesDe, relireSiren } from './carte.js';
import { interpreter, contexteRecherche, metierDuProfil, villeConnue, rayonDe, METIER } from '../engine/requete.js';
import { FORMATIONS, formationConnue } from '../engine/formations.js';
import { versPiste, ecarter, rendre as rendreEcartee, offresAlternance, offresStage } from '../engine/annuaire.js';
import { travailDe, aQui } from '../engine/carte.js';
import { normalizeCompany, normalizeContact, RAYONS } from '../engine/model.js';
import { uid, todayISO, normName } from '../engine/utils.js';
import { euros } from '../engine/marche.js';
import { visage } from '../engine/visage.js';
import { laSuite } from '../engine/suite.js';
import { ouvrirEcrire, ouvrirPiste } from './pistes.js';

const QUOI = { stage: 'Stage', alternance: 'Alternance', emploi: 'Emploi' };
const LOT = 6;                      /* une liste se lit six lignes à la fois */
const T = {
  form: null,          /* les trois questions sont ouvertes */
  B: null,             /* leurs réponses en cours */
  manque: false,       /* « Voir les entreprises » a été tapé sans tout dire */
  villeInconnue: '',
  cherche: false,      /* la barre a la main */
  q: '',
  lu: '',              /* le nom lu dans un lien collé */
  sel: '',             /* au poste : l'entreprise ouverte à droite */
  montres: LOT,
  neuves: 0,           /* gardées pendant cette visite */
  gardees: new Map(),  /* siren → id de la piste : la ligne reste, « gardée » */
  connus: new Map()    /* siren → ce que l'annuaire a dit, pour ouvrir sa page */
};
const notifier = () => rendre();
const liste = chercheur(notifier);
const barre = chercheur(notifier);

/* ---------- les réponses ---------- */
const P = () => S.profile;
const villeOk = () => villeConnue(P().ville);
const complet = () => !!(P().recherche && String(P().formation || '').trim() && villeOk());
function brouillon(){
  const f = String(P().formation || '').trim();
  const connue = formationConnue(f);
  return { quoi: P().recherche || '', formation: connue ? connue.nom : f, autre: !!f && !connue,
           ville: P().ville || '', rayon: rayonDe(P()) };
}
/* le mot que la recherche retient de ta formation */
function motFormation(){
  const f = String(P().formation || '').trim();
  const connue = formationConnue(f);
  if (connue && connue.mot) return connue.mot;
  const m = metierDuProfil(P());
  return m && METIER[m] ? METIER[m].label : f;
}
function lancer(){
  T.form = false; T.manque = false; T.montres = LOT; T.sel = '';
  liste.suivre(interpreter(''), { actif: true, immediat: true });
}

/* ---------- ce qu'on montre d'une entreprise ---------- */
const enMots = x => String(x || '').replace(/^(\d[\d ]*)-(\d[\d ]*)/, '$1 à $2');
/* une taille ne se coupe pas en fin de ligne : « 10 à 19 salariés » passe entière au rang suivant */
const insecable = s => String(s || '').replace(/ /g, '\u00a0');
const taille = r => insecable(r.effectifIci ? enMots(r.effectifIci) + ' ici' : enMots(r.effectif));
const lieuDe = r => [r.ville, km(r.distance)].filter(Boolean).join(' · ');
const amiDe = r => r.amis && r.amis[0] ? `${r.amis[0].prenom} ${r.amis[0].court}` : '';
const colle = r => { const m = metierDuProfil(P()); const t = m && travailDe(r); return !!(t && t.metiers.includes(m)); };
const pisteDe = r => {
  const id = T.gardees.get(r.siren);
  return (id && S.companies.find(c => c.id === id))
    || S.companies.find(c => (c.siren && c.siren === r.siren) || normName(c.name) === normName(r.nom)) || null;
};
const alerteDe = r => {
  if (r.fermee) return 'Entreprise fermée';
  const b = sourcesDe(r.siren).bodacc;
  return b && b.procedure ? b.procedure.nature[0].toUpperCase() + b.procedure.nature.slice(1) : '';
};
function visageHTML(graine){
  const v = visage(graine);
  return `<span class="vz vz-${v.teinte}" aria-hidden="true"><svg viewBox="0 0 7 7" focusable="false"><path d="${
    v.cases.map(([x, y]) => `M${x + 1} ${y + 1}h1v1h-1z`).join('')}"/></svg></span>`;
}

/* une ligne : le nom, où et quelle taille, puis sa raison quand elle en
   a une ; « Garder » au bout. Glissée, « Pas pour moi ». */
function ligneEnt(r, o = {}){
  const c = pisteDe(r), garde = !!c;
  const raison = amiDe(r) || (o.colle && colle(r) ? 'colle à ta formation' : '');
  const al = alerteDe(r);
  const fin = garde
    ? (T.gardees.has(r.siren) ? `<span class="s-ok">${ic('check')}gardée</span>` : '<span class="s-ok">dans tes pistes</span>')
    : `<button class="btn s" data-a="garder" data-id="${esc(r.siren)}">Garder</button>`;
  const sel = C.poste && T.sel === r.siren;
  const sous = [lieuDe(r), taille(r)].filter(Boolean).join(' · ');
  const rang = `<div class="rang ent${sel ? ' on' : ''}"><div class="r-c" data-a="ent" data-id="${esc(r.siren)}" role="button" tabindex="0"`
    + `${sel ? ' aria-current="true"' : ''}><b>${esc(r.nom)}</b>${sous ? `<span class="sl">${esc(sous)}</span>` : ''}`
    + `${al ? `<span class="alerte-l">${esc(al.toLowerCase())}</span>` : ''}${raison ? `<span class="plus">${esc(raison)}</span>` : ''}</div>${fin}</div>`;
  return garde || o.fixe ? `<div class="gl">${rang}</div>`
    : `<div class="gl" data-g="ecarter" data-id="${esc(r.siren)}"><div class="dessous-g" aria-hidden="true">Pas pour moi</div>${rang}</div>`;
}
/* une piste trouvée par la barre : elle est déjà à toi */
function lignePiste(c){
  const sel = C.poste && T.sel === 'p:' + c.id;
  return `<div class="gl"><div class="rang ent${sel ? ' on' : ''}"><div class="r-c" data-a="ent" data-id="p:${esc(c.id)}" role="button" tabindex="0"`
    + `${sel ? ' aria-current="true"' : ''}><b>${esc(c.name)}</b><span class="sl">${esc(c.city || 'ajoutée à la main')}</span></div>`
    + '<span class="s-ok">dans tes pistes</span></div></div>';
}

/* ---------- les trois questions ---------- */
function formulaire(){
  const b = T.B, m = T.manque, premier = !complet();
  const et = (t, vide) => `<div class="et${m && vide ? ' manque' : ''}">${t}${m && vide ? ' · à choisir' : ''}</div>`;
  const puce = (a, id, l, on) => `<button class="puce${on ? ' on' : ''}" data-a="${a}" data-id="${esc(id)}" aria-pressed="${!!on}">${esc(l)}</button>`;
  return (premier ? '<p class="accueil">Dis ce que tu cherches. L’app te propose des entreprises près de toi.</p>' : '')
    + '<div class="s-form">'
    + et('Tu cherches', !b.quoi) + `<div class="puces">${Object.keys(QUOI).map(k => puce('b-quoi', k, QUOI[k], b.quoi === k)).join('')}</div>`
    + et('Tu étudies', !b.formation) + `<div class="puces">${FORMATIONS.map(f => puce('b-form', f.nom, f.nom, !b.autre && b.formation === f.nom)).join('')}${puce('b-autre', '', 'Autre', b.autre)}</div>`
    + (b.autre ? `<label class="champ"><input class="f-autre" value="${esc(b.formation || '')}" placeholder="Ta formation" aria-label="Ta formation" autocomplete="off" enterkeyhint="next"></label>` : '')
    + et('Autour de', !b.ville.trim())
    + `<label class="champ"><input class="f-ville" value="${esc(b.ville)}" placeholder="Ta ville" aria-label="Ta ville" autocomplete="address-level2" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="go"></label>`
    + (T.villeInconnue ? `<p class="err" role="alert">Je ne trouve pas « ${esc(T.villeInconnue)} ». Essaie la ville la plus proche.</p>` : '')
    + (premier ? '' : `<div class="seg" role="group" aria-label="Jusqu’où">${RAYONS.map(r => `<button${b.rayon === r ? ' class="on"' : ''} data-a="b-rayon" data-id="${r}" aria-pressed="${b.rayon === r}">${r} km</button>`).join('')}</div>`)
    + '<button class="btn p" data-a="voir">Voir les entreprises</button></div>';
}
function brancherForm(ecran){
  const v = $('.f-ville', ecran), a = $('.f-autre', ecran);
  if (v){
    v.addEventListener('input', () => {
      T.B.ville = v.value;
      /* le rappel s'éteint dès qu'on écrit, sans redessiner sous le doigt */
      const et = v.parentNode.previousElementSibling;
      if (et && et.classList.contains('manque') && v.value.trim()){ et.classList.remove('manque'); et.textContent = 'Autour de'; }
      if (T.villeInconnue){ T.villeInconnue = ''; const e = $('.s-form .err', ecran); if (e) e.remove(); }
    });
    v.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); voir(); } });
  }
  if (a) a.addEventListener('input', () => { T.B.formation = a.value.trim() || ''; });
}
function voir(){
  const B = T.B, ville = B.ville.trim(), formation = String(B.formation || '').trim();
  if (!B.quoi || !formation || !ville){ T.manque = true; rendre(); return; }
  const v = villeConnue(ville);
  if (!v){ T.villeInconnue = ville; rendre(); $('.f-ville')?.focus(); return; }
  const p = P();
  p.recherche = B.quoi; p.formation = formation.slice(0, 120); p.ville = v.nom; p.rayon = B.rayon;
  saveProfile();
  T.villeInconnue = '';
  lancer();
  rendre();
  if (!C.poste) $('.ecran .defile')?.scrollTo({ top: 0 });
}
const etiquettes = () => `<div class="s-tags">${[QUOI[P().recherche] || '', motFormation(), `${villeOk() ? villeOk().nom : P().ville} · ${rayonDe(P())} km`]
  .filter(Boolean).map(t => `<button data-a="editer" aria-label="Changer ma recherche : ${esc(t)}">${esc(t)}</button>`).join('')}</div>`;

/* ---------- la liste du jour ---------- */
function offresHTML(interp){
  const v = villeOk();
  const o = { recherche: P().recherche, metier: metierDuProfil(P()), centre: v ? { lat: v.centre[0], lng: v.centre[1], nom: v.nom } : null, ville: v ? v.nom : '' };
  const a = offresAlternance(interp, o);
  const st = !a && offresStage(interp, o);
  const l = a ? { ...a, mot: 'Offres d’alternance' } : st ? { ...st, mot: 'Offres de stage' } : null;
  return l ? `<a class="lien" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${l.mot} autour de ${esc(l.lieu)}${ic('external-link')}</a>` : '';
}
const panneau = (icone, gras, texte, geste) => `<div class="panneau">${icone ? ic(icone) : ''}<p><b>${gras}</b>${texte}</p>${geste || ''}</div>`;
function chargement(ville){
  return `<div class="charge" role="status"><div class="et">Recherche autour de ${esc(ville)}…</div>`
    + `<div class="barre98">${Array.from({ length: 14 }, (_, i) => `<i style="animation-delay:${i * 55}ms"></i>`).join('')}</div></div>`;
}
const garderVisibles = () => new Set(T.gardees.values());
function corpsListe(){
  const e = liste.etat, ville = villeOk() ? villeOk().nom : P().ville;
  const pistes = S.companies.length;
  if (navigator.onLine === false || e.phase === 'horsligne')
    return panneau('radio', 'Pas de réseau.', 'L’annuaire revient avec lui.' + (pistes ? ' Tes pistes, elles, restent là.' : ''),
      pistes ? '<button class="btn" data-a="aller" data-id="pistes">Voir mes pistes</button>' : '');
  if (e.phase === 'erreur' || e.phase === 'limite')
    return panneau('square-alert', e.phase === 'limite' ? 'L’annuaire est très demandé.' : 'L’annuaire ne répond pas.',
      'Ça arrive : il revient d’habitude en quelques minutes.', '<button class="btn" data-a="reessayer">Réessayer</button>');
  if (e.phase === 'attente' || e.phase === 'charge' || e.phase === 'repos') return chargement(ville);
  const vis = liste.visibles(garderVisibles());
  if (!vis.length)
    return panneau('', 'Tu as fait le tour.', `Élargis jusqu’à 30 km, ou change ce que tu cherches.`,
      rayonDe(P()) < 30 ? '<button class="btn" data-a="elargir">Élargir à 30 km</button>' : '<button class="btn" data-a="editer">Changer ma recherche</button>');
  const montres = vis.slice(0, T.montres), reste = vis.length - montres.length;
  /* « colle à ta formation » ne se dit que s'il départage les lignes à
     l'écran : vrai de toutes, c'est un papier peint */
  const nColle = montres.filter(colle).length;
  const o = { colle: nColle > 0 && nColle < montres.length };
  vis.forEach(r => T.connus.set(r.siren, r));
  const n = Math.max(liste.pres(), vis.length);
  const suite = reste > 0
    ? `<button class="btn" data-a="suite">${reste === 1 ? 'Voir la suivante' : `Voir les ${Math.min(LOT, reste)} suivantes`}</button>`
    : liste.reste() ? `<button class="btn" data-a="suite">Voir les ${LOT} suivantes</button>`
    : e.phase === 'plus' ? '<p class="fin-m" aria-busy="true">Je cherche…</p>' : '';
  return `<div class="et s-et">${n} entreprise${n > 1 ? 's' : ''} près de toi</div>`
    + `<div class="rangs s-liste">${montres.map(r => ligneEnt(r, o)).join('')}</div>`
    + `<div class="suite-l">${suite}${offresHTML(e.interp)}</div>`;
}

/* ---------- la barre ---------- */
/* un lien collé : la page LinkedIn d'une entreprise, ou son site */
function lireLien(q){
  const m = q.match(/linkedin\.com\/company\/([^/?#\s]+)/i) || q.match(/\/companies\/([^/?#\s]+)/i)
    || q.match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.(?:fr|com|io|net|eu|org)(?:[/?#]|$)/i);
  if (!m) return '';
  let n = '';
  try { n = decodeURIComponent(m[1]); } catch (e) { n = m[1]; }
  return n.replace(/[-_]+/g, ' ').replace(/\b[a-zà-ÿ]/g, c => c.toUpperCase()).trim();
}
const ctx = () => contexteRecherche(S.companies, todayISO());
function suivreBarre(){
  const q = T.q.trim();
  T.lu = q ? lireLien(q) : '';
  if (!q){ barre.oublier(); return; }
  const interp = interpreter(T.lu || q, ctx());
  const metier = interp.etiquettes.some(e => e.famille === 'metier');
  /* un nom se cherche partout ; un métier, autour de ta ville. La
     distance se lit toujours depuis ta ville (rien ne part de plus) */
  const v = villeOk();
  barre.suivre(interp, { sansLieu: interp.texte.length > 0 && !metier, actif: false,
    userPos: v ? { lat: v.centre[0], lng: v.centre[1] } : null });
}
function pistesDuNom(q){
  const mots = plat(q).split(' ').filter(Boolean);
  if (!mots.length) return [];
  return S.companies.filter(c => { const n = plat(c.name).split(' '); return mots.every(w => n.some(x => x.startsWith(w))); }).slice(0, 5);
}
const ligneHL = (t, icone) => `<p class="hl-l">${ic(icone || 'radio')}<span>${esc(t)}</span></p>`;
function corpsRecherche(){
  const q = T.q.trim();
  if (!q) return `<div class="rangs s-liste haut"><div class="rang act" data-a="coller" role="button" tabindex="0">${ic('clipboard')}`
    + '<div class="r-c"><b>Coller un lien</b><span>LinkedIn, le site d’une entreprise</span></div></div></div>';
  const nom = T.lu || q;
  let h = T.lu ? `<p class="lu">Lu dans ton lien : <b>${esc(T.lu)}</b></p>` : '';
  const pistes = pistesDuNom(nom);
  const e = barre.etat;
  const sans = navigator.onLine === false || e.phase === 'horsligne' || e.phase === 'erreur' || e.phase === 'limite';
  if (navigator.onLine === false || e.phase === 'horsligne') h += ligneHL('Pas de réseau : l’annuaire attendra. Tes pistes, elles, se cherchent.');
  else if (e.phase === 'erreur' || e.phase === 'limite') h += ligneHL('L’annuaire ne répond pas : seules tes pistes se cherchent.', 'square-alert');
  const interp = e.interp;
  const metier = interp && interp.etiquettes.find(x => x.famille === 'metier' && !x.profil);
  const lieu = e.lieu;
  const vis = sans || !['ok', 'plus'].includes(e.phase) ? [] : barre.visibles(garderVisibles());
  vis.forEach(r => T.connus.set(r.siren, r));
  const nVis = Math.min(vis.length, 12);
  if (pistes.length || nVis){
    const titre = metier ? `${metier.label}${lieu ? ' autour de ' + esc(lieu.label) : ''}` : (pistes.length + nVis) > 1 ? `${pistes.length + nVis} entreprises` : pistes.length ? 'Dans tes pistes' : 'Dans l’annuaire';
    h += `<div class="et res-et">${titre}</div><div class="rangs s-liste">${pistes.map(lignePiste).join('')}${vis.slice(0, 12).map(r => ligneEnt(r, { fixe: 1 })).join('')}</div>`;
  }
  if (!sans && (e.phase === 'attente' || e.phase === 'charge')) h += '<p class="lu" aria-busy="true">Je cherche dans l’annuaire…</p>';
  /* ni métier ni lieu compris, et rien qui porte exactement ce nom :
     on garde l'entreprise telle qu'on l'a écrite */
  const compris = interp && interp.etiquettes.some(x => (x.famille === 'metier' || x.famille === 'lieu') && !x.profil) && !interp.texte.length;
  const exact = pistes.some(c => normName(c.name) === normName(nom)) || vis.some(r => normName(r.nom) === normName(nom));
  if (!compris && !exact && nom.length >= 2)
    h += `<div class="rangs s-liste${pistes.length || nVis ? '' : ' haut'}"><div class="rang act" data-a="tel-quel" role="button" tabindex="0">${ic('plus')}`
      + `<div class="r-c"><b>Garder «\u00a0${esc(nom.slice(0, 40))}\u00a0»</b><span>telle que tu l’as écrite, sans l’annuaire</span></div></div></div>`;
  return h;
}
function fermerRecherche(){
  T.cherche = false; T.q = ''; T.lu = '';
  barre.oublier();
  const q = $('.ecran .q');
  if (q) q.value = '';
}
const barreHTML = () => '<div class="barre"><label class="champ">' + ic('search')
  + '<input type="search" class="q" placeholder="Métier, ville, entreprise…" aria-label="Chercher une entreprise" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>'
  + '<button class="lien" data-a="fermer-r">Annuler</button></div>';
function brancherBarre(ecran){
  const q = $('.q', ecran);
  if (!q) return;
  q.value = T.q;
  q.addEventListener('focus', () => { if (!T.cherche && !C.poste){ T.cherche = true; rendre(); } });
  q.addEventListener('input', () => {
    T.q = q.value;
    if (C.poste) T.cherche = !!T.q.trim();
    suivreBarre();
    rendre();
  });
  q.addEventListener('keydown', e => {
    if (e.key === 'Escape'){ e.preventDefault(); fermerRecherche(); rendre(); q.blur(); }
    else if (e.key === 'Enter'){ e.preventDefault(); q.blur(); }
  });
}

/* ---------- garder, écarter ---------- */
function garder(r){
  if (!r || pisteDe(r)) return null;
  const c = normalizeCompany({ ...versPiste(r, T.cherche ? barre.etat.interp : liste.etat.interp), id: uid(), createdAt: Date.now() });
  /* la personne à qui écrire, quand l'annuaire la nomme : le dirigeant
     d'une PME (engine/carte.js, `aQui`) — la maquette validée la range
     avec la piste, sans adresse inventée */
  const qui = aQui(r, r.nom);
  if (qui && qui.cible === 'dirigeant') c.contacts = [normalizeContact({ name: qui.nom, role: qui.qualite })];
  c.history = [{ d: todayISO(), t: 'Gardée' }];
  S.companies.push(c);
  saveData();
  logJ('Piste gardée : ' + c.name, c.id);
  T.gardees.set(r.siren, c.id);
  T.neuves++;
  C.vient = 'pistes';
  annoncer(`${r.nom} : gardée.`);
  return c;
}
function garderTelQuel(nom){
  const n = String(nom || '').trim().slice(0, 60);
  if (!n) return null;
  const deja = S.companies.find(c => normName(c.name) === normName(n));
  if (deja) return deja;
  const c = normalizeCompany({ name: n, id: uid(), createdAt: Date.now() });
  c.history = [{ d: todayISO(), t: 'Gardée' }];
  S.companies.push(c);
  saveData();
  logJ('Piste gardée : ' + c.name, c.id);
  T.neuves++;
  C.vient = 'pistes';
  return c;
}
function ecarterR(r){
  if (!r || pisteDe(r)) return;
  S.profile.ecartees = ecarter(S.profile.ecartees, r);
  saveProfile();
  if (T.sel === r.siren) T.sel = '';
  annuler(`${r.nom} : pas pour moi`, () => {
    S.profile.ecartees = rendreEcartee(S.profile.ecartees, r.siren);
    saveProfile();
  });
}
const trouve = id => T.connus.get(id) || null;

/* ---------- la page d'une entreprise ---------- */
function quiHTML(r, k, ami){
  const e = k.ecrire;
  if (!e) return '';
  if (e.cible === 'dirigeant'){
    const la = /e$/.test(e.qualite) && !/aire$/.test(e.qualite) ? 'La' : 'Le';
    return `<div class="pers prop"><div class="s-init" aria-hidden="true">${esc(initiales(e.nom))}</div><div class="r-c"><b>${esc(e.nom)}</b><span>${esc(e.qualite)}</span></div></div>`
      + (e.url ? `<a class="lien" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${la} trouver sur LinkedIn${ic('external-link')}</a>` : '');
  }
  return `<p>Une grande maison : écris au recrutement${ami ? ', ou passe par ' + esc(ami.prenom) : ''}.</p>`
    + (e.url ? `<a class="lien" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">Trouver qui recrute sur LinkedIn${ic('external-link')}</a>` : '');
}
function pageEnt(r, c){
  const nom = r ? r.nom : c.name;
  if (!r) return `<div class="s-page"><h4>${esc(nom)}</h4><div class="lieu">${esc(c.city || 'Ajoutée à la main')}</div>`
    + (c.siren ? '' : panneau('', 'Pas dans l’annuaire.', 'Tu pourras la compléter depuis sa piste.').replace('class="panneau"', 'class="panneau en-page"')) + '</div>';
  const k = carteDe(r, c || null, metierDuProfil(P()), P());
  const ami = r.amis && r.amis[0];
  const f = [];
  const fait = k.missions ? k.missions.texte : k.quoi ? k.quoi.texte : '';
  if (fait) f.push(['Ils font', esc(fait) + (k.missions && k.missions.tonMetier ? '<span class="plus">colle à ta formation</span>' : '')]);
  if (k.taille) f.push(['Taille', esc(k.taille)]);
  if (k.comptes) f.push(['Comptes', esc(k.comptes.texte)]);
  if (k.recemment) f.push(['Récemment', esc(k.recemment[0].toUpperCase() + k.recemment.slice(1))]);
  if (k.egalite) f.push(['Égalité', esc(k.egalite)]);
  if (k.aide) f.push(['Aide', `L’État lui verse jusqu’à ${euros(k.aide.montant)} la première année d’un apprenti${k.aide.grande ? ', sous conditions' : ''}`]);
  const faits = f.length ? `<dl class="faits">${f.map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join('')}</dl>` : '';
  const qui = quiHTML(r, k, ami);
  return `<div class="s-page"><h4>${esc(nom)}</h4><div class="lieu">${esc(lieuDe(r) || r.ville || '')}</div>`
    + (k.alerte ? `<div class="alerte">${ic('square-alert')}${esc(k.alerte.texte)}</div>` : '')
    + (ami ? `<div class="porte">${visageHTML(ami.amiId || ami.prenom)}${esc(ami.prenom + ' ' + ami.court)}</div>` : '')
    + `<div class="pg-corps"><div>${faits}</div><div>`
    + (qui ? `<fieldset class="gb"><legend>À qui écrire</legend>${qui}</fieldset>` : '')
    + (k.sources.length ? `<p class="src">${k.sources.map(esc).join(' · ')}</p>` : '') + '</div></div></div>';
}
function piedEnt(r, c){
  const id = r ? r.siren : 'p:' + c.id;
  const piste = c || (r && pisteDe(r));
  if (piste){
    const s = laSuite(piste, { profile: S.profile });
    return `<button class="btn fait court" disabled>${ic('check')}Gardée</button>`
      + (s.k === 'premier' ? `<button class="btn p" data-a="ecrire-p" data-id="${esc(piste.id)}">Préparer mon message</button>`
        : `<button class="btn p" data-a="voir-p" data-id="${esc(piste.id)}">Voir la piste</button>`);
  }
  return `<button class="btn court" data-a="ecarter" data-id="${esc(id)}">Pas pour moi${C.poste ? '<kbd>X</kbd>' : ''}</button>`
    + `<button class="btn p" data-a="garder" data-id="${esc(id)}">${ic('plus')}Garder${C.poste ? '<kbd>G</kbd>' : ''}</button>`;
}
/* ce que la page montre : l'entreprise de l'annuaire, ou une piste à toi */
function sujet(id){
  if (String(id).startsWith('p:')){
    const c = S.companies.find(x => x.id === id.slice(2)) || null;
    if (!c) return null;
    const r = c.siren ? (T.connus.get(c.siren) || relireSiren(c.siren, () => rendre())) : null;
    if (r) T.connus.set(c.siren, r);
    return { r, c };
  }
  const r = trouve(id) || relireSiren(id, () => rendre());
  if (r) T.connus.set(id, r);
  return r ? { r, c: pisteDe(r) } : null;
}
const suivies = new Set();
function suivre(r){
  if (!r || suivies.has(r.siren)) return;
  suivies.add(r.siren);
  suivreCarte(r.siren, () => rendre(), r.nom, { egapro: r.egapro });
}
inscrirePage('entreprise', {
  titre: () => 'Entreprise',
  rendre(p){
    const s = sujet(p.id);
    if (!s) return { titre: 'Entreprise', corps: '<div class="s-page"><p class="doux">Un instant…</p></div>' };
    suivre(s.r);
    return { titre: 'Entreprise', corps: pageEnt(s.r, s.c), pied: piedEnt(s.r, s.c) };
  },
  geste(a, el, ev, p){
    const s = sujet(p.id);
    if (a === 'garder' && s && s.r){ garder(s.r); rendre(); return true; }
    if (a === 'ecarter' && s && s.r){ ecarterR(s.r); retour(); return true; }
    if (a === 'aller'){ allerA(el.getAttribute('data-id')); return true; }
    if (a === 'ecrire-p'){ ouvrirEcrire(el.getAttribute('data-id'), 'premier'); return true; }
    if (a === 'voir-p'){ allerA('pistes'); ouvrirPiste(el.getAttribute('data-id')); return true; }
    return false;
  }
});

/* ---------- l'onglet ---------- */
function corpsTrouver(){ return T.cherche ? corpsRecherche() : T.form ? formulaire() : etiquettes() + corpsListe(); }
function pied(){
  const n = T.neuves;
  return n > 0 && !T.cherche && !T.form
    ? `<button class="btn p" data-a="aller" data-id="pistes">Continuer avec ${n > 1 ? 'mes ' + n + ' pistes' : 'ma piste'}${ic('arrow-right')}</button>` : '';
}
/* au poste : ce que la liste montre, dans l'ordre, pour ↑ ↓ */
function lignesVisibles(){
  if (T.cherche){
    const ids = pistesDuNom(T.lu || T.q).map(c => 'p:' + c.id);
    const e = barre.etat;
    if (['ok', 'plus'].includes(e.phase)) ids.push(...barre.visibles(garderVisibles()).slice(0, 12).map(r => r.siren));
    return ids;
  }
  if (T.form || !['ok', 'plus'].includes(liste.etat.phase) || navigator.onLine === false) return [];
  return liste.visibles(garderVisibles()).slice(0, T.montres).map(r => r.siren);
}
function rendreTel(ecran, premier){
  if (premier){
    ecran.innerHTML = `<div class="t-tete"><h3>Trouver</h3>${barreHTML()}</div><div class="defile t-corps"></div><div class="pied" hidden></div>`;
    brancherBarre(ecran);
  }
  ecran.classList.toggle('cherche', T.cherche);
  ecran.classList.toggle('sans-barre', T.form && !T.cherche);
  remplacer($('.t-corps', ecran), corpsTrouver());
  brancherForm(ecran);
  const pd = $('.pied', ecran), h = pied();
  pd.hidden = !h;
  remplacer(pd, h);
}
function rendrePoste(ecran, premier){
  if (premier){
    ecran.innerHTML = `<div class="p-col c1"><div class="t-tete">${barreHTML()}</div><div class="defile t-corps"></div></div><div class="p-col c2"></div>`;
    brancherBarre(ecran);
  }
  ecran.classList.toggle('sans-barre', T.form && !T.cherche);
  /* la ligne ouverte se choisit AVANT de dessiner la liste, qui l'allume */
  const ids = lignesVisibles();
  const aToi = id => !!id && (id.startsWith('p:') || !!(trouve(id) && pisteDe(trouve(id))));
  if (T.form) T.sel = '';
  else if (ids.length && (!T.sel || (!ids.includes(T.sel) && !aToi(T.sel)))) T.sel = ids[0];
  else if (!ids.length && !T.cherche && !aToi(T.sel)) T.sel = '';
  remplacer($('.t-corps', ecran), corpsTrouver());
  brancherForm(ecran);
  const c2 = $('.c2', ecran);
  const s = T.sel ? sujet(T.sel) : null;
  if (s){
    if (s.r) suivre(s.r);
    const meme = c2.getAttribute('data-id') === T.sel;
    const html = `<div class="defile">${pageEnt(s.r, s.c)}</div><div class="pied">${piedEnt(s.r, s.c)}</div>`;
    if (meme) remplacer(c2, html);
    else { c2.innerHTML = html; c2.setAttribute('data-id', T.sel); }
  } else {
    c2.removeAttribute('data-id');
    const e = liste.etat;
    const mot = T.form ? 'Tes entreprises apparaissent ici.' : navigator.onLine === false || e.phase === 'horsligne' ? 'Rien à montrer sans réseau.'
      : e.phase === 'erreur' || e.phase === 'limite' ? 'Rien à montrer sans l’annuaire.' : '';
    remplacer(c2, `<div class="p-vide"><p>${mot}</p></div>`);
  }
  /* la ligne ouverte reste à l'écran quand ↑ ↓ la déplacent */
  const on = $('.t-corps .rang.on', ecran);
  if (on && document.activeElement && document.activeElement.closest && document.activeElement.closest('.t-corps')) on.scrollIntoView({ block: 'nearest' });
}
function choisir(pas){
  const ids = lignesVisibles();
  if (!ids.length) return;
  const i = Math.max(0, ids.indexOf(T.sel));
  T.sel = ids[Math.min(ids.length - 1, Math.max(0, i + pas))];
  rendre();
  const on = $('.ecran .t-corps .rang.on');
  if (on){ $('.r-c', on).focus({ preventScroll: true }); on.scrollIntoView({ block: 'nearest' }); }
}

export default {
  id: 'trouver',
  rendre(ecran, { poste, premier }){
    if (T.form === null){ T.form = !complet(); T.B = brouillon(); if (!T.form) lancer(); }
    if (!T.B) T.B = brouillon();
    (poste ? rendrePoste : rendreTel)(ecran, premier);
  },
  geste(a, el, ev){
    const id = el ? el.getAttribute('data-id') || '' : '';
    if (a === 'b-quoi'){ T.B.quoi = id; rendre(); return; }
    if (a === 'b-form'){ T.B.formation = id; T.B.autre = false; rendre(); return; }
    if (a === 'b-autre'){ T.B.autre = !T.B.autre; T.B.formation = ''; rendre(); $('.ecran .f-autre')?.focus(); return; }
    if (a === 'b-rayon'){ T.B.rayon = +id; rendre(); return; }
    if (a === 'voir'){ voir(); return; }
    if (a === 'editer'){ T.form = true; T.manque = false; T.B = brouillon(); rendre(); return; }
    if (a === 'elargir'){ P().rayon = 30; saveProfile(); lancer(); rendre(); return; }
    if (a === 'reessayer'){ liste.reessayer(); rendre(); return; }
    if (a === 'suite'){
      const vis = liste.visibles(garderVisibles()).length;
      T.montres += LOT;
      if (T.montres > vis && liste.reste()) liste.plus();
      rendre();
      return;
    }
    if (a === 'aller'){ allerA(id); return; }
    if (a === 'ecrire-p'){ ouvrirEcrire(id, 'premier'); return; }
    if (a === 'voir-p'){ allerA('pistes'); ouvrirPiste(id); return; }
    if (a === 'ent'){
      if (C.poste){ T.sel = id; rendre(); return; }
      pousser({ t: 'entreprise', id }, el);
      return;
    }
    if (a === 'garder'){
      const s = sujet(id);
      if (s && s.r){ garder(s.r); rendre(); }
      return;
    }
    if (a === 'ecarter'){
      const s = sujet(id);
      if (s && s.r){ ecarterR(s.r); rendre(); }
      return;
    }
    if (a === 'tel-quel'){
      const c = garderTelQuel(T.lu || T.q);
      if (!c) return;
      fermerRecherche();
      if (C.poste){ T.sel = 'p:' + c.id; rendre(); }
      else { rendre(); pousser({ t: 'entreprise', id: 'p:' + c.id }); }
      return;
    }
    if (a === 'fermer-r'){ fermerRecherche(); rendre(); return; }
    if (a === 'coller'){ coller(); return; }
  },
  clavier(ev, { champ, poste }){
    const bar = ev.target && ev.target.classList && ev.target.classList.contains('q');
    if (!champ && ev.key === '/'){
      ev.preventDefault();
      const q = $('.ecran .q');
      if (q){ q.focus(); if (!poste){ T.cherche = true; rendre(); } }
      return true;
    }
    if (!poste) return false;
    if (bar && ev.key === 'ArrowDown'){ ev.preventDefault(); choisir(0); return true; }
    if (champ) return false;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){ ev.preventDefault(); choisir(ev.key === 'ArrowDown' ? 1 : -1); return true; }
    if ((ev.key === 'g' || ev.key === 'G') && T.sel){
      const s = sujet(T.sel);
      if (s && s.r && !s.c){ ev.preventDefault(); garder(s.r); rendre(); return true; }
    }
    if ((ev.key === 'x' || ev.key === 'X') && T.sel){
      const s = sujet(T.sel);
      if (s && s.r && !s.c){
        ev.preventDefault();
        const ids = lignesVisibles(), i = ids.indexOf(T.sel);
        ecarterR(s.r);
        T.sel = ids[i + 1] || ids[i - 1] || '';
        rendre();
        const on = $('.ecran .t-corps .rang.on .r-c');
        if (on) on.focus({ preventScroll: true });
        return true;
      }
    }
    if (ev.key === 'Escape' && T.cherche){ fermerRecherche(); rendre(); return true; }
    return false;
  },
  etat(){
    if (T.form) return '<span>Prêt</span>' + cles([[['/'], 'chercher']]);
    const v = villeOk(), e = liste.etat;
    const n = ['ok', 'plus'].includes(e.phase) ? Math.max(liste.pres(), liste.visibles(garderVisibles()).length) : 0;
    const ok = n && navigator.onLine !== false;
    return (ok ? `<span>${n} entreprise${n > 1 ? 's' : ''} autour de ${esc(v ? v.nom : '')}</span><span>Annuaire des entreprises</span>`
      : `<span>${navigator.onLine === false ? 'Hors ligne' : e.phase === 'erreur' || e.phase === 'limite' ? 'Annuaire en panne' : 'Prêt'}</span>`)
      + cles([lignesVisibles().length && !T.cherche ? [['↑', '↓'], 'choisir'] : null, [['/'], 'chercher']]);
  }
};

/* ---------- coller un lien ----------
   Le presse-papier se lit sur ton geste ; un navigateur qui refuse
   laisse la barre ouverte, prête à recevoir ce que tu colles. */
async function coller(){
  let t = '';
  try { t = await navigator.clipboard.readText(); } catch (e) {}
  const q = $('.ecran .q');
  t = String(t || '').trim();
  if (!t){ q?.focus(); toast('Colle le lien dans la barre.'); return; }
  T.q = t.slice(0, 300);
  T.cherche = true;
  if (q) q.value = T.q;
  suivreBarre();
  rendre();
}
