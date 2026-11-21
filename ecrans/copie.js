/* ============================================================
   OpenContact · la nouvelle interface · Moi › Ma copie
   (docs/brief-refonte.md §12, lot 4 ; la maquette validée le
   17 novembre 2026)

   Ne rien perdre. Quatre choses, chacune à sa place :
   · UNE COPIE : « Télécharger » (« Enregistrer » au doigt, là où le
     téléphone sait partager), le cadenas qui s'étire en champ pour la
     chiffrer d'un mot de passe ;
   · LA PHRASE DE SECOURS : douze mots qui ramènent tout sur un téléphone
     neuf — la copie se dépose seule, scellée, sur les relais (phrase.js) ;
   · MES APPAREILS : « Relier un autre appareil » — chacun montre son QR
     et sait scanner celui de l'autre (liaison.js, la mécanique de l'app
     actuelle) ;
   · RESTAURER : un fichier ou la phrase, l'aperçu d'abord, puis « Annuler »
     (invariant ②). Restaurer, c'est RAMENER : la même fusion que celle de
     mes appareils — rien ne s'écrase, ce qui manque ici s'ajoute.

   L'alerte ambre « seulement sur cet appareil » ne parle qu'à partir de
   cinq pistes sans aucune copie, ni autre appareil, depuis un mois
   (`sansFilet`, engine/assist.js).

   Le premier jour (lot 5), « J'ai déjà OpenContact », sous les questions
   de Trouver, ouvre les mêmes gestes : la phrase, un fichier, l'autre
   appareil. Ce qui revient passe par le même aperçu, et l'app s'ouvre
   ensuite sur ses pistes.

   Protégé par un code (verrou.js), changer de phrase le redemande : le
   coffre suit la phrase, qui rouvre aussi l'app, code oublié.
   ============================================================ */
import { $, $$, ic, esc, remplacer } from './outils.js';
import { S, saveProfile, logJ, applySynced } from './etat.js';
import { C, annuler, toast, rendre, allerA, ouvrirFeuille, rendreFeuille, fermerFeuille, feuilleOuverte } from './coque.js';
import { fullPayload, parseInput, linkWrap, linkParse } from '../engine/exchange.js';
import { encryptOC2 } from '../engine/crypto.js';
import { syncMerge } from '../engine/sync.js';
import { sansFilet, FILET_MIN_PISTES } from '../engine/assist.js';
import { apercuCopie, etatCopie } from '../engine/copie.js';
import { nouvellePhrase, motsAVerifier, clesDe } from '../engine/moi.js';
import { DEVICES_KEY, SYNC_KEY, kvGet, kvSet } from '../engine/storage.js';
import { todayISO } from '../engine/utils.js';
import { quandJour } from './dates.js';
import { enregistrerFichier, partagePossible } from './fichier.js';
import { makeQrSvg, startScan } from './qr.js';
import { getSync, startSync, breakLink, makePhrase, deviceSelf, loadDevices, removeDevice, nomDe } from './liaison.js';
import { chargerMoi, adopterPhrase, aUnePhrase, depotAt, etatPhrase, chercherCopie, erreurPhrase } from './phrase.js';
import { montrerApercu } from './echange.js';
import { M, lien, ouvrirM, fermerM } from './moi-nav.js';
import { estProtege, demanderCode, estPhraseDuCoffre, alignerCoffre } from './verrou.js';

const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const dateCourte = ms => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
/* ce qui se garde le temps de la session : jamais la phrase au-delà de ce
   qui sert, jamais un mot de passe dans le stockage */
const K = { pret: false, verrou: false, mdp: '', phrase: null, res: null, devs: null, soi: null, qrs: new Map(), creation: false,
  pin: '',          /* le code prouvé pour changer de phrase, le temps de la changer */
  premier: false    /* on retrouve ses affaires depuis le premier jour (Trouver) */ };

/* ============================================================
   CE QUE DIT LA LISTE, ET L'ALERTE
   ============================================================ */
const dernierEnvoi = () => Number((S.profile.flags || {}).lastBackupAt) || 0;
/* tant que les appareils et la phrase ne sont pas lus, on ne SAIT pas — et
   on ne dit rien : annoncer « sans filet » à tort serait pire que le taire
   une seconde */
function etatFilet(){
  if (!K.pret || K.devs === null || !S.companies.length) return false;
  return sansFilet({ pistes: S.companies.length, derniereCopie: Math.max(dernierEnvoi(), depotAt()), appareils: K.devs });
}
/* une copie récente, ou un autre appareil, existe-t-il ? (la feuille d'effacement le dit) */
export function copieExiste(){
  return !sansFilet({ pistes: Math.max(S.companies.length, FILET_MIN_PISTES), derniereCopie: Math.max(dernierEnvoi(), depotAt()), appareils: K.devs || [] });
}
export function ligneCopie(){
  const filet = etatFilet(), at = dernierEnvoi();
  return { alerte: filet, texte: etatCopie({ sansFilet: filet, phrase: aUnePhrase(), fichier: at ? dateCourte(at) : '',
    appareils: 1 + (K.devs ? K.devs.length : 0) }) };
}

/* ============================================================
   LA PAGE « MA COPIE »
   ============================================================ */
function ligneVerrou(){
  const on = K.verrou;
  return `<div class="lockrow${on ? ' on' : ''}"><button class="btn lr-do" data-a="m-copie">${partagePossible() ? 'Enregistrer' : 'Télécharger'}</button>`
    + `<div class="lr-pw"><button class="btn s lr-lock" data-a="m-verrou" aria-pressed="${on}" aria-label="Protéger par un mot de passe">${ic('lock')}<span class="lr-w">Chiffrer</span></button>`
    + `<input class="lr-pass" type="password" autocomplete="new-password" placeholder="Mot de passe" aria-label="Mot de passe"${on ? '' : ' disabled'}></div></div>`
    + '<p class="err m-err-v" hidden></p>'
    + `<p class="doux m-perdu"${on ? '' : ' hidden'}>Sans ce mot de passe, la copie ne se rouvre pas.</p>`;
}
function blocPhrase(){
  const e = etatPhrase();
  const mot = '<p class="doux">Douze mots qui ramènent tout sur un téléphone neuf.</p>';
  if (!e.existe) return mot + '<button class="btn mot" data-a="m-ouvrir" data-id="phrase">Créer ma phrase</button>';
  const dit = e.trop ? 'Créée · trop grande pour les relais : garde ton fichier de copie.'
    : e.depot ? 'Créée · copie déposée ' + quandJour(e.depot.at)
    : navigator.onLine === false ? 'Créée · la copie partira avec le réseau' : 'Créée · copie pas encore déposée';
  return mot + `<p class="fait-a${e.trop ? ' avert' : ''}">${ic(e.trop ? 'square-alert' : 'check')}${esc(dit)}</p>`
    + '<button class="btn-g" data-a="m-ouvrir" data-id="phrase">Changer de phrase</button>';
}
const vuIl = t => {
  const m = Math.round((Date.now() - (t || 0)) / 60000);
  if (m < 2) return 'vu à l’instant';
  if (m < 60) return 'vu il y a ' + m + ' min';
  const h = Math.round(m / 60);
  return h < 24 ? 'vu il y a ' + h + ' h' : 'vu il y a ' + Math.round(h / 24) + ' j';
};
function blocAppareils(){
  const liee = !!getSync().phrase, soi = K.soi, l = [];
  const ligne = (nom, sous, a, v) => `<div class="pers"${a ? ` data-a="${a}"${v ? ` data-v="${esc(v)}"` : ''} role="button" tabindex="0"` : ''}><div class="r-c"><b>${nom}</b><span>${esc(sous)}</span></div>${a ? ic('chevron-right') : ''}</div>`;
  if (soi) l.push(ligne(C.poste ? 'Cet ordinateur' : 'Ce téléphone', nomDe(soi.id, soi.name), liee ? 'm-soi' : ''));
  for (const d of K.devs || []) l.push(ligne(esc(nomDe(d.id, d.name)), vuIl(d.seen), 'm-appareil', d.id));
  return l.join('') + `<button class="lien ajout" data-a="m-ouvrir" data-id="relier">${ic('plus')}Relier un autre appareil</button>`;
}
function pageCopie(){
  const n = S.companies.length, p = S.profile, at = dernierEnvoi();
  const filet = etatFilet();
  return { titre: 'Ma copie', corps: '<div class="s-page">'
    + (filet ? `<div class="alerte k-filet">${ic('square-alert')}Tes ${n} pistes sont enregistrées seulement sur cet appareil.</div>` : '')
    /* rien à copier = pas de cadre : « Restaurer » reste, c'est le geste d'un téléphone neuf */
    + (n || p.name ? `<fieldset class="gb k-copie"><legend>Une copie</legend>${at ? `<p class="fait-a">${ic('check')}${partagePossible() ? 'Enregistrée' : 'Téléchargée'} le ${esc(dateCourte(at))}</p>` : ''}${ligneVerrou()}</fieldset>` : '')
    + `<fieldset class="gb k-phrase"><legend>Phrase de secours</legend><div class="k-in">${blocPhrase()}</div></fieldset>`
    + `<fieldset class="gb k-appareils"><legend>Mes appareils</legend><div class="k-in">${blocAppareils()}</div></fieldset>`
    + '<div class="bas-p"><button class="btn s" data-a="m-restaurer">Restaurer une copie</button></div></div>' };
}

/* ---- télécharger : le mot de passe est facultatif ---- */
async function telecharger({ sansMdp = false } = {}){
  const z = $('.ecran'), chiffre = K.verrou && !sansMdp;
  const er = $('.m-err-v', z);
  if (chiffre && !K.mdp){
    if (er){ er.textContent = 'Il manque le mot de passe.'; er.hidden = false; }
    const pw = $('.lr-pass', z); if (pw) pw.focus();
    return;
  }
  const b = $('.lr-do', z);
  if (b){ b.disabled = true; if (chiffre) b.textContent = 'Chiffrement…'; }
  try {
    const payload = fullPayload(S.companies, S.profile, S.orphans, S.tombs);
    const txt = chiffre ? await encryptOC2(payload, K.mdp) : JSON.stringify(payload);
    const nom = 'opencontact-copie-' + todayISO() + '.oc';
    const r = await enregistrerFichier(txt, nom, 'Copie OpenContact');
    if (r === 'renonce') return;
    /* un fait daté : il voyage dans le `.oc` et la sync, et c'est lui qui
       fait taire « sans filet » pendant 30 jours */
    S.profile.flags.lastBackupAt = Date.now();
    saveProfile();
    logJ('Copie gardée' + (chiffre ? ' (chiffrée)' : ''));
    /* la serrure se referme et oublie ce qu'on y avait tapé */
    K.verrou = false; K.mdp = '';
    /* hors de l'écran (§6) : où le fichier est parti ne se voit pas ici */
    toast((r === 'partage' ? 'Copie enregistrée' : 'Copie téléchargée') + (chiffre ? ', chiffrée' : '') + ' : ' + nom);
  } finally { rendre(); }
}

/* ---- la phrase de secours ---- */
function pagePhrase(){
  const ph = K.phrase || (K.phrase = { mots: nouvellePhrase().split(' '), etape: 'voir', idx: motsAVerifier(), err: '' });
  if (ph.etape === 'verifier'){
    const [a, b] = ph.idx;
    const champ = n => `<label class="fld"><span class="et">Mot n°${n + 1}</span><input class="m-vw" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"></label>`;
    return { titre: 'Phrase', corps: `<div class="s-page ecr"><p class="fort m-fort">Vérifions.</p><div class="dates2">${champ(a)}${champ(b)}</div>`
      + `<p class="err m-err-ph"${ph.err ? '' : ' hidden'}>${esc(ph.err)}</p></div>`,
      pied: '<button class="btn" data-a="m-phrase-revoir">Revoir la phrase</button><button class="btn p" data-a="m-phrase-verif">Continuer</button>' };
  }
  return { titre: 'Phrase', corps: '<div class="s-page"><p class="fort m-fort">Écris-la sur papier, dans l’ordre.</p>'
    + `<p class="doux m-doux">${estProtege() ? 'Sans elle, ni ta copie déposée ni l’app, code oublié, ne se rouvrent.' : 'Sans elle, la copie déposée ne se rouvre pas.'} Ne la donne à personne.</p>`
    + `<ol class="mots">${ph.mots.map((m, i) => `<li><span>${i + 1}</span>${esc(m)}</li>`).join('')}</ol></div>`,
    pied: '<button class="btn p" data-a="m-phrase-noter">Je l’ai notée</button>' };
}
async function verifierPhrase(){
  const ph = K.phrase, z = $('.ecran');
  if (!ph) return;
  const l = $$('.m-vw', z).map(i => i.value.trim().toLowerCase());
  if (l[0] !== ph.mots[ph.idx[0]] || l[1] !== ph.mots[ph.idx[1]]){
    ph.err = 'Ce n’est pas ça : reprends ton papier.';
    const er = $('.m-err-ph', z); if (er){ er.textContent = ph.err; er.hidden = false; }
    return;
  }
  const b = $('[data-a="m-phrase-verif"]', z);
  if (b){ b.disabled = true; b.textContent = 'Création…'; }
  const phrase = ph.mots.join(' ');
  K.phrase = null;
  await adopterPhrase(phrase);
  /* protégé : le coffre se rouvre désormais par cette phrase-là */
  if (K.pin){ await alignerCoffre(phrase, K.pin); K.pin = ''; }
  fermerM();
}
/* créer ou changer de phrase ; protégé, le code d'abord */
export async function ouvrirPhrase(el){
  K.phrase = null; K.pin = '';
  if (estProtege()){
    const pin = await demanderCode('Ton code, pour changer de phrase');
    if (!pin) return;
    K.pin = pin;
  }
  ouvrirM('phrase', '', el);
}

/* ---- relier un autre appareil : chacun montre son QR et sait scanner celui de l'autre ---- */
function etatLiaison(sy){
  if (navigator.onLine === false) return { texte: 'Pas de réseau : l’autre appareil ne peut pas te trouver.' };
  if (sy.peers > 0 && (sy.state === 'on' || sy.state === 'link')) return { ok: true };
  if (sy.state === 'norelay' && sy.relays && sy.relays.refus) return { texte: 'Pas de connexion : les relais refusent la liaison.', reessayer: true };
  if (sy.state === 'norelay' || sy.state === 'err') return { texte: 'Pas de connexion : ton réseau la bloque ?', reessayer: true };
  if (sy.state === 'rtcfail' && sy.cause === 'motdepasse') return { texte: 'Ce n’est pas la même phrase des deux côtés : refais la liaison.' };
  if (sy.state === 'rtcfail' && sy.cause === 'turnmuet') return { texte: 'Ton serveur TURN ne répond pas.', reessayer: true };
  if (sy.state === 'rtcfail') return { texte: 'Ton autre appareil est là, mais rien ne passe.', reessayer: true };
  return { texte: 'En attente de l’autre appareil…' };
}
/* le lien existe dès qu'on ouvre cette page : la phrase gardée si elle
   existe (jamais écrasée), sinon une neuve */
async function assurerLien(){
  if (getSync().phrase || K.creation) return;
  K.creation = true;
  try {
    const gardee = await kvGet(SYNC_KEY).catch(() => '');
    if (!getSync().phrase) await startSync(gardee || makePhrase());
  } finally { K.creation = false; }
  if ($('.ecran .k-relier')) rendre();
}
function pageRelier(){
  const sy = getSync();
  if (!sy.phrase) return { titre: 'Relier', corps: '<div class="s-page k-relier"><p class="attente">Un instant…</p></div>' };
  if (!K.qrs.has(sy.phrase)){
    K.qrs.set(sy.phrase, '');
    makeQrSvg(linkWrap(sy.phrase)).then(svg => { K.qrs.set(sy.phrase, svg); if ($('.ecran .k-relier')) rendre(); }).catch(() => {});
  }
  const e = etatLiaison(sy), n = sy.peers;
  const corps = `<div class="s-page k-relier"><div class="qr-b" role="img" aria-label="Le QR du lien, à faire scanner">${K.qrs.get(sy.phrase) || ''}</div>`
    + `<p class="code-g m-code">${esc(sy.phrase)}</p>`
    + '<p class="doux centre-t">Sur l’autre appareil : Moi › Ma copie › Relier un autre appareil › Scanner son QR.</p>'
    + (e.ok ? `<p class="attente m-ok">${ic('check')}Relié à ${pl(n, 'appareil')}${sy.state === 'link' ? ' · premier échange…' : ' · à jour'}</p>`
      : `<p class="attente">${esc(e.texte)}</p>`
        + (e.reessayer ? '<div class="centre"><button class="btn s" data-a="m-lien-reessayer">Réessayer</button></div>' : '')
        + (navigator.onLine === false ? '' : '<div class="centre"><button class="btn s" data-a="m-scan-lien">Scanner son QR</button></div>'))
    + '</div>';
  return { titre: 'Relier', corps, pied: e.ok ? '<button class="btn p" data-a="m-retour">Terminé</button>' : '' };
}

/* ---- restaurer : l'aperçu d'abord, rien ne s'écrase ---- */
const liste = (l, max = 4) => l.length > max ? l.slice(0, max).join(', ') + ' et ' + (l.length - max) + ' autre' + (l.length - max > 1 ? 's' : '') : l.join(', ');
const LIGNES_MAX = 20;
function pageRestauration(){
  const r = K.res;
  if (!r) return { titre: 'Restaurer', corps: '<div class="s-page"><p class="doux">Rien à restaurer pour l’instant.</p></div>' };
  const a = apercuCopie(r.copie, { companies: S.companies, orphans: S.orphans, profile: S.profile, tombs: S.tombs });
  const titre = r.mode === 'phrase' ? 'Ta copie déposée' : 'Ta copie', quand = r.at ? quandJour(r.at) : '';
  const rang = (b, sous, plus, coche) => `<div class="rang"><div class="r-c"><b>${esc(b)}</b><span${plus ? ' class="plus"' : ''}>${esc(sous)}</span></div>${coche ? ic('check') : ''}</div>`;
  const note = '<p class="doux m-note">Ce qui manque ici s’ajoute. Rien n’est effacé.</p>';
  /* un téléphone neuf : tout revient, on le dit en quatre lignes */
  if (!S.companies.length){
    const x = a.resume, l = [];
    if (x.pistes) l.push(['Tes pistes', `${x.pistes}, avec leur suivi et tes notes`]);
    if (x.amis.length) l.push(['Tes amis', liste(x.amis)]);
    if (x.groupes.length) l.push([x.groupes.length > 1 ? 'Tes classes' : 'Ta classe', liste(x.groupes)]);
    if (x.nom) l.push(['Ton profil', x.nom]);
    if (!l.length) return { titre: 'Restaurer', corps: `<div class="s-page"><h4>${titre}</h4><div class="lieu">${esc(quand)}</div><p class="doux m-note">Cette copie est vide.</p></div>`,
      pied: '<button class="btn" data-a="m-retour">Rien de neuf</button>' };
    return { titre: 'Restaurer', corps: `<div class="s-page"><h4>${titre}</h4><div class="lieu">${esc(quand)}</div><div class="rangs m-rl">${l.map(([b, s]) => rang(b, s, true)).join('')}</div>${note}</div>`,
      pied: '<button class="btn p" data-a="m-restaurer-ajouter">Tout ramener</button>' };
  }
  const total = a.nouvelles.length + a.plusRecentes.length + a.dejaLa;
  const lieu = [quand, pl(total, 'piste'), a.nouvelles.length ? pl(a.nouvelles.length, 'nouvelle') : a.plusRecentes.length ? '' : 'tout est déjà là',
    a.plusRecentes.length ? pl(a.plusRecentes.length, 'plus récente') : ''].filter(Boolean).join(' · ');
  const cite = [...a.nouvelles.map(x => ({ ...x, s: 'nouvelle' })), ...a.plusRecentes.map(x => ({ ...x, s: 'plus récente dans la copie' }))];
  /* peu de pistes : toutes, comme dans la maquette ; beaucoup : ce qui change, puis le compte du reste */
  const petit = total <= 12;
  const rows = (petit ? [...cite, ...a.dejaLaListe.map(x => ({ ...x, s: 'déjà dans tes pistes', deja: true }))] : cite.slice(0, LIGNES_MAX))
    .map(x => rang(x.name, x.deja ? x.s : [x.s, x.city].filter(Boolean).join(' · '), !x.deja, x.deja)).join('')
    + (!petit && cite.length > LIGNES_MAX ? rang('et ' + (cite.length - LIGNES_MAX) + ' de plus', '', false) : '')
    + (!petit && a.dejaLa ? rang(pl(a.dejaLa, 'piste') + ' déjà dans tes pistes', '', false, true) : '');
  const autres = (a.contacts ? rang('Contacts à rattacher', pl(a.contacts, 'contact') + ' de plus', true) : '')
    + (a.profil ? rang('Ton profil', 'plus récent dans la copie : il remplace celui d’ici', true) : '')
    + (a.liaison ? rang('Le lien avec tes appareils', 'revient avec ta copie', true) : '')
    + (a.retirees ? rang(pl(a.retirees, 'piste') + ' supprimée' + (a.retirees > 1 ? 's' : '') + ' ailleurs', 'elle' + (a.retirees > 1 ? 's quittent' : ' quitte') + ' cet appareil', true) : '');
  const pied = a.nouvelles.length ? `<button class="btn p" data-a="m-restaurer-ajouter">${ic('plus')}Ajouter ${pl(a.nouvelles.length, 'piste')}</button>`
    : a.vide ? '<button class="btn" data-a="m-retour">Rien de neuf</button>' : '<button class="btn p" data-a="m-restaurer-ajouter">Ramener</button>';
  return { titre: 'Restaurer', corps: `<div class="s-page"><h4>${titre}</h4><div class="lieu">${esc(lieu)}</div>`
    + (rows || autres ? `<div class="rangs m-rl">${rows}${autres}</div>` : '') + note + '</div>', pied };
}
async function ramener(){
  const r = K.res;
  if (!r) return;
  const b = $('.ecran [data-a="m-restaurer-ajouter"]'); if (b) b.disabled = true;
  /* protégé, une phrase que le coffre ne connaît pas : le code d'abord, le
     coffre la suivra (une seule phrase pour tout) */
  let pin = '';
  if (r.mode === 'phrase' && estProtege() && !(await estPhraseDuCoffre(r.phrase))){
    pin = await demanderCode('Ton code, pour ramener');
    if (!pin){ const b2 = $('.ecran [data-a="m-restaurer-ajouter"]'); if (b2) b2.disabled = false; return; }
  }
  const local = { companies: S.companies, orphans: S.orphans, profile: S.profile, tombs: S.tombs };
  const snap = JSON.parse(JSON.stringify(local));
  const neuf = !S.companies.length;
  const res = syncMerge(r.copie, local);
  applySynced(res);
  let lie = false;
  if (r.copie.liaison && !(await kvGet(SYNC_KEY).catch(() => ''))){ await startSync(r.copie.liaison); lie = true; }
  if (r.mode === 'phrase'){ await adopterPhrase(r.phrase, r.cles); if (pin) await alignerCoffre(r.phrase, pin); }
  const st = res.stats;
  logJ('Copie ramenée : +' + st.addedC + ' piste(s), ' + st.updatedC + ' plus récente(s)');
  K.res = null;
  apresRetour();
  annuler(neuf ? 'Tout est revenu' : st.addedC ? pl(st.addedC, 'piste') + ' ajoutée' + (st.addedC > 1 ? 's' : '') : 'Copie ramenée', () => {
    applySynced(snap);
    if (lie) breakLink();
    logJ('Retour des données annulé');
  });
}

/* le premier jour, ce qui est revenu ouvre l'app sur ses pistes ; sinon on
   revient à « Ma copie » */
function apresRetour(){
  if (!K.premier){ fermerM(); return; }
  K.premier = false;
  if (C.poste){ M.sel = null; allerA('pistes'); return; }
  /* la page ouverte depuis Trouver ne reste pas derrière : Pistes prend
     sa place dans l'historique, et le retour ramène aux questions */
  C.piles[C.onglet] = [];
  allerA('pistes', { remplacer: true });
}
/* « Terminé », « Rien de neuf » : le premier jour, s'il est revenu
   quelque chose, l'app s'ouvre sur les pistes */
export function terminer(){
  if (K.premier && S.companies.length){ apresRetour(); return; }
  K.premier = false;
  fermerM();
}
/* une copie déposée sur la fenêtre, au poste (lot 6) : le même chemin
   qu'« Ouvrir un fichier » — l'aperçu, ou le mot de passe qu'il demande */
export function restaurerTexte(raw, at){
  K.res = null; K.premier = false;
  const f = feuilleC('restaurer', { fichierAt: at || Date.now() });
  lireTexte(f, raw);
}
/* le premier jour : « J'ai déjà OpenContact » */
export function ouvrirRetrouver(){ K.res = null; K.premier = true; demarrerCopie(); feuilleC('retrouver'); }

/* ============================================================
   LES FEUILLES : restaurer, retrouver, scanner, un appareil
   ============================================================ */
const ERR_COPIE = {
  vide: 'Ce fichier est vide.',
  format: 'Ce fichier n’est pas une copie d’OpenContact. Une copie s’appelle opencontact-copie-… et finit par .oc.',
  troplourd: 'Trop lourd pour être ouvert (plus de 4 Mo).',
  tropdepistes: 'Plus de 2 000 pistes d’un coup : trop pour être ouvert.',
  altéré: 'Ce fichier a été modifié après l’envoi : demande-le à nouveau.'
};
const TITRES_FC = { restaurer: 'Restaurer', retrouver: 'Retrouver', scan: 'Scanner', appareil: 'Appareil', soi: 'Appareil' };
function feuilleC(type, o = {}){
  const f = { type, mode: '', err: '', texte: '', ...o, titre: TITRES_FC[type], rendre: rendreFC, geste: gesteFC, focus: o.focus || '',
    apres: z => apresFC(z, f), fermee: () => arreterScan() };
  ouvrirFeuille(f);
  return f;
}
function rendreFC(f){
  const err = `<p class="err m-err"${f.err ? '' : ' hidden'}>${esc(f.err)}</p>`;
  if (f.type === 'restaurer' || f.type === 'retrouver'){
    if (f.mode === 'phrase')
      return { corps: `<label class="fld"><span class="et">Ta phrase de secours</span><textarea class="zone court m-phrase" placeholder="Les douze mots, dans l’ordre" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(f.texte)}</textarea></label>${err}`
        + `<button class="btn s" data-a="m-phrase-coller">${ic('clipboard')}Coller</button>`,
        pied: `<button class="btn p" data-a="m-restaurer-ok"${f.cherche ? ' disabled' : ''}>${f.cherche ? 'Recherche…' : 'Lire ma copie'}</button>` };
    if (f.mode === 'mdp')
      return { corps: `<p class="doux">${ic('lock')} Cette copie est protégée par un mot de passe.</p>`
        + `<label class="fld"><span class="et">Mot de passe de la copie</span><input class="m-rpass" type="password" autocomplete="off"${f.err ? ' aria-invalid="true"' : ''}></label>${err}`,
        pied: '<button class="btn p" data-a="m-rmdp">Ouvrir</button>' };
    const fichier = '<label class="rang act fichier">' + ic('file') + '<div class="r-c"><b>Depuis un fichier</b></div>'
      + '<input type="file" class="m-rfichier" accept=".oc,.txt,.json,application/octet-stream,application/json,text/plain" aria-label="Depuis un fichier"></label>';
    const phrase = `<button class="rang act" data-a="m-restaurer-phrase">${ic('note')}<div class="r-c"><b>Avec ma phrase de secours</b></div></button>`;
    /* le premier jour, d'abord ce qu'on a sur soi (sa phrase), puis le
       fichier, puis l'autre appareil — l'ordre de la maquette */
    if (f.type === 'retrouver')
      return { corps: `<div class="rangs">${phrase}${fichier}<button class="rang act" data-a="m-retrouver-appareil">${ic('monitor')}<div class="r-c"><b>Depuis mon autre appareil</b></div></button></div>${err}` };
    return { corps: `<div class="rangs">${fichier}${phrase}</div>${err}` };
  }
  if (f.type === 'scan'){
    const deja = (K.devs || []).length > 0;
    return { corps: `<div class="scan-b"><video class="scan-v" playsinline muted></video><div class="scan-m"></div></div><p class="doux centre-t scan-d">${esc(f.dit || 'Vise le QR de l’autre appareil.')}</p>`
      + `<label class="fld"><span class="et">Ou tape la phrase</span><input class="m-lien-p" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="ex : k7m3p-9xq2f" value="${esc(f.texte)}"></label>${err}`
      + (deja ? '<p class="doux">Cet appareil est déjà relié : il quittera son lien actuel.</p>' : ''),
      pied: '<button class="btn p" data-a="m-lien-ok">Relier</button>' };
  }
  if (f.type === 'appareil'){
    const d = f.d;
    return { corps: `<p class="fort m-fort">${esc(nomDe(d.id, d.name))}</p><p class="doux m-doux">${esc(vuIl(d.seen))}</p>`
      + `<div class="bas-p"><button class="btn s danger" data-a="m-appareil-retirer">${ic('trash')}Retirer cet appareil</button></div>`
      + '<p class="doux">Il sort de la liste, mais il connaît encore le lien. Pour l’écarter vraiment, refais le lien.</p>' };
  }
  if (f.type === 'soi'){
    const n = (K.devs || []).length;
    return { corps: `<p class="fort m-fort">${C.poste ? 'Cet ordinateur' : 'Ce téléphone'}</p><p class="doux m-doux">${esc(nomDe(K.soi.id, K.soi.name))} · ${n ? 'relié à ' + pl(n, 'autre appareil') : 'en attente d’un autre appareil'}</p>`
      + `<button class="btn s m-top" data-a="m-lien-refaire">${ic('reload')}Refaire le lien</button>`
      + '<p class="doux">Une nouvelle phrase : tes autres appareils devront scanner le nouveau QR.</p>'
      + `<div class="bas-p"><button class="btn s danger" data-a="m-lien-rompre">${ic('logout')}Rompre le lien</button></div>` };
  }
  return { corps: '' };
}
let stopScan = null;
function arreterScan(){ if (stopScan){ const s = stopScan; stopScan = null; s(); } }
function apresFC(z, f){
  const fi = $('.m-rfichier', z);
  if (fi && !fi.__b){
    fi.__b = true;
    fi.addEventListener('change', () => {
      const file = fi.files && fi.files[0];
      if (!file) return;
      const rd = new FileReader();
      f.fichierAt = file.lastModified;
      rd.onload = () => lireTexte(f, String(rd.result));
      rd.readAsText(file);
    });
  }
  const ph = $('.m-phrase', z);
  if (ph && !ph.__b){ ph.__b = true; ph.addEventListener('input', () => { f.texte = ph.value; }); ph.focus({ preventScroll: true }); }
  const pw = $('.m-rpass', z);
  if (pw && !pw.__b){ pw.__b = true; pw.focus({ preventScroll: true });
    pw.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); lireTexte(f, f.raw, pw.value); } }); }
  const lp = $('.m-lien-p', z);
  if (lp && !lp.__b){ lp.__b = true; lp.addEventListener('input', () => { f.texte = lp.value; });
    lp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); relierAvec(f, f.texte); } }); }
  const v = $('.scan-v', z);
  if (v && !stopScan && !v.__b){
    v.__b = true;
    startScan(v, raw => {
      const p = linkParse(raw);
      if (!p){
        /* un QR qui n'est pas un lien : on le dit et on continue de viser, plutôt que de relier n'importe quoi */
        const d = $('.scan-d', z); if (d) d.textContent = 'Ce QR n’est pas un lien entre appareils.';
        return true;
      }
      relierAvec(f, p);
      return false;
    }).then(s => { if (feuilleOuverte() === f) stopScan = s; else s(); }).catch(e => {
      f.dit = e.message === 'camera-refusee' ? 'La caméra est bloquée : autorise-la dans les réglages du navigateur, ou tape la phrase.'
        : 'Pas de caméra ici : tape la phrase affichée sur l’autre appareil.';
      const d = $('.scan-d', z); if (d) d.textContent = f.dit;
      const b = $('.scan-b', z); if (b) b.hidden = true;
      const t = $('.m-lien-p', z); if (t) t.focus({ preventScroll: true });
    });
  }
}
async function lireTexte(f, raw, pass){
  let obj;
  try { obj = await parseInput(raw, pass); }
  catch (e) {
    /* un mot de passe faux se dit SUR le champ, la saisie reste */
    if (e.message === 'besoinpass' || e.message === 'motdepasse'){
      f.raw = raw; f.mode = 'mdp'; f.titre = 'Copie protégée';
      f.err = e.message === 'motdepasse' ? 'Ce n’est pas le bon mot de passe.' : '';
      rendreFeuille();
      return;
    }
    f.mode = ''; f.titre = TITRES_FC[f.type]; f.err = ERR_COPIE[e.message] || ERR_COPIE.format;
    rendreFeuille();
    return;
  }
  /* un partage de camarade, pas une copie : l'intention est claire, on
     l'ouvre dans l'aperçu de « Recevoir » */
  if (obj.kind === 'share'){ fermerFeuille(); montrerApercu(obj, {}); return; }
  K.res = { mode: 'fichier', copie: obj, at: f.fichierAt || Date.now() };
  fermerFeuille();
  ouvrirM('restauration', 'fichier', null, K.premier);
}
async function lirePhrase(f){
  const v = f.texte || '';
  const dit = txt => { f.err = txt; f.cherche = false; rendreFeuille(); };
  const e = erreurPhrase(v);
  if (e) return dit(e);
  if (navigator.onLine === false) return dit('Pas de réseau : la copie déposée revient avec lui. Un fichier, lui, marche sans.');
  f.cherche = true; f.err = ''; rendreFeuille();
  let r = null, cles = null;
  try { cles = await clesDe(v); r = await chercherCopie(cles); } catch (e) {}
  if (feuilleOuverte() !== f) return;
  if (r && r.copie){
    K.res = { mode: 'phrase', copie: r.copie, at: r.copie.at, phrase: v, cles };
    fermerFeuille();
    ouvrirM('restauration', 'phrase', null, K.premier);
    return;
  }
  dit(!r || !r.lus ? 'Pas de connexion. Réessaie quand tu auras du réseau.' : 'Aucune copie trouvée avec cette phrase. Vérifie l’ordre des mots.');
}
async function relierAvec(f, brut){
  const p = String(brut || '').trim().toLowerCase();
  if (!p){ f.err = 'Tape la phrase affichée sur l’autre appareil.'; rendreFeuille(); return; }
  arreterScan();
  fermerFeuille();
  /* un autre lien n'a pas les mêmes appareils : la liste d'avant ne dit plus rien de vrai */
  if (getSync().phrase && getSync().phrase !== p){ await kvSet(DEVICES_KEY, '[]'); await lireAppareils(); }
  await startSync(p, true);
}
function gesteFC(a, el, ev, f){
  if (a === 'm-restaurer-phrase'){ f.mode = 'phrase'; f.err = ''; rendreFeuille(); return; }
  if (a === 'm-retrouver-appareil'){ fermerFeuille(); ouvrirM('relier', '', null, true); return; }
  if (a === 'm-phrase-coller'){
    navigator.clipboard.readText().then(t => { f.texte = t || ''; f.err = ''; rendreFeuille(); })
      .catch(() => { f.err = 'Colle ici avec un appui long : ce navigateur ne laisse pas l’app lire le presse-papier.'; rendreFeuille(); });
    return;
  }
  if (a === 'm-restaurer-ok'){ lirePhrase(f); return; }
  if (a === 'm-rmdp'){ const pw = $('.couche-f .m-rpass'); lireTexte(f, f.raw, pw ? pw.value : ''); return; }
  if (a === 'm-lien-ok'){ relierAvec(f, f.texte); return; }
  if (a === 'm-appareil-retirer'){
    const d = f.d;
    loadDevices().then(avant => {
      removeDevice(d.id).then(() => {
        fermerFeuille();
        lireAppareils().then(() => { majBlocs(); });
        annuler(nomDe(d.id, d.name) + ' retiré de la liste', async () => { await kvSet(DEVICES_KEY, JSON.stringify(avant)); await lireAppareils(); majBlocs(); });
      });
    });
    return;
  }
  if (a === 'm-lien-refaire'){
    const avant = getSync().phrase;
    fermerFeuille();
    loadDevices().then(async devs => {
      /* une nouvelle phrase, une liste d'appareils neuve : les autres devront scanner le nouveau QR */
      await kvSet(DEVICES_KEY, '[]');
      await startSync(makePhrase(), true);
      await lireAppareils();
      lien.majListe(); majBlocs();
      annuler('Nouveau lien créé', async () => { await kvSet(DEVICES_KEY, JSON.stringify(devs)); await startSync(avant, true); await lireAppareils(); lien.majListe(); majBlocs(); });
    });
    return;
  }
  if (a === 'm-lien-rompre'){
    const phrase = getSync().phrase;
    loadDevices().then(async devs => {
      fermerFeuille();
      await breakLink();
      await lireAppareils();
      majBlocs();
      annuler('Lien rompu', async () => { await kvSet(DEVICES_KEY, JSON.stringify(devs)); await startSync(phrase, true); });
    });
  }
}

/* ============================================================
   LES GESTES DE « MA COPIE »
   ============================================================ */
export function gesteCopie(a, el, ev){
  const v = el ? el.getAttribute('data-v') || '' : '';
  if (a === 'm-phrase-noter'){ K.phrase.etape = 'verifier'; K.phrase.idx = motsAVerifier(); K.phrase.err = ''; rendre(); return; }
  if (a === 'm-phrase-revoir'){ K.phrase.etape = 'voir'; rendre(); return; }
  if (a === 'm-phrase-verif'){ verifierPhrase(); return; }
  if (a === 'm-verrou'){
    K.verrou = !K.verrou;
    const row = el.closest('.lockrow'), pw = $('.lr-pass', row);
    row.classList.toggle('on', K.verrou);
    el.setAttribute('aria-pressed', String(K.verrou));
    pw.disabled = !K.verrou;
    const per = $('.m-perdu', row.parentNode); if (per) per.hidden = !K.verrou;
    const er = $('.m-err-v', row.parentNode); if (er) er.hidden = true;
    if (K.verrou) pw.focus(); else { pw.value = ''; K.mdp = ''; }
    return;
  }
  if (a === 'm-copie'){ telecharger(); return; }
  if (a === 'm-copie-ici'){ telecharger({ sansMdp: true }); return; }
  if (a === 'm-restaurer'){ K.res = null; K.premier = false; feuilleC('restaurer'); return; }
  if (a === 'm-restaurer-ajouter'){ ramener(); return; }
  if (a === 'm-appareil'){ const d = (K.devs || []).find(x => x.id === v); if (d) feuilleC('appareil', { d }); return; }
  if (a === 'm-soi'){ if (K.soi) feuilleC('soi'); return; }
  if (a === 'm-scan-lien'){ feuilleC('scan'); return; }
  if (a === 'm-lien-reessayer'){ const p = getSync().phrase; if (p) startSync(p, true); return; }
  return false;
}
export function surInputCopie(t){
  if (t.matches('.lr-pass')) K.mdp = t.value;
  else if (t.matches('.m-vw')){ const er = $('.m-err-ph', t.closest('.s-page')); if (er) er.hidden = true; }
}
/* après chaque dessin d'une page de Moi */
export function apresCopie(t, z){
  if (t === 'copie'){
    const pw = $('.lr-pass', z);
    if (pw){
      if (K.verrou && K.mdp && !pw.value) pw.value = K.mdp;
      if (!pw.__b){ pw.__b = true; pw.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); telecharger(); } }); }
    }
  }
  if (t === 'phrase' && K.phrase && K.phrase.etape === 'verifier'){
    const i = $('.m-vw', z);
    if (i && !z.contains(document.activeElement)) i.focus({ preventScroll: true });
    $$('.m-vw', z).forEach(x => { if (!x.__b){ x.__b = true; x.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); verifierPhrase(); } }); } });
  }
  if (t === 'relier') assurerLien();
}

export const PAGES_COPIE = { copie: () => pageCopie(), phrase: () => pagePhrase(), relier: () => pageRelier(), restauration: () => pageRestauration() };

/* ============================================================
   CE QUI BOUGE PENDANT QU'ON REGARDE
   ============================================================ */
async function lireAppareils(){
  const [soi, devs] = await Promise.all([deviceSelf(), loadDevices()]);
  K.soi = soi;
  K.devs = devs;
}
/* l'état d'un lien, d'une phrase, d'un appareil change : seuls les blocs
   concernés se redessinent — la serrure et ce qu'on y tape ne bougent pas */
function majBlocs(){
  /* « Relier » peut être ouverte depuis Trouver, le premier jour */
  if ($('.ecran .k-relier')){ rendre(); return; }
  if (C.onglet !== 'moi') return;
  /* le contenu du cadre se redessine, pas sa légende */
  const a = $('.ecran .k-appareils .k-in'); if (a) remplacer(a, blocAppareils());
  const p = $('.ecran .k-phrase .k-in'); if (p) remplacer(p, blocPhrase());
  const f = $('.ecran .k-filet'), dit = etatFilet();
  if (!!f !== dit) rendre();
}
let demarre = false;
export function demarrerCopie(){
  if (demarre) return;
  demarre = true;
  Promise.all([chargerMoi(), lireAppareils()]).then(() => { K.pret = true; lien.majListe(); majBlocs(); if (C.onglet === 'moi') rendre(); });
  document.addEventListener('oc:sync', () => { lireAppareils().then(() => { lien.majListe(); majBlocs(); }); });
  document.addEventListener('oc:moi', () => { lien.majListe(); majBlocs(); });
}
