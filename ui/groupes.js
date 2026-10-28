/* ============================================================
   OpenContact — interface · les groupes (docs/reseau.md, lot 5)

   Une classe, une promo, un club : on s'y donne des pistes et on s'y
   écrit des messages qui s'effacent au bout de sept jours. Tout passe
   par les relais, scellé par le code du groupe (engine/groupe.js) :
   plus besoin d'être là en même temps — chacun reçoit à sa prochaine
   ouverture, et l'aperçu passe avant toute fusion (invariant ②).

   Trois places, pas une de plus :
   · la boîte « Échanger » (ui/conversations.js) — une ligne par groupe,
     avec ses amis, la plus récente en haut : le dernier mot, ce qui n'est
     pas lu ; « Nouveau groupe » ouvre Créer ou Rejoindre ;
   · la feuille d'un groupe — les prénoms, le fil, et le pied pour
     écrire ou donner ;
   · « Groupe » — les prénoms, les réglages (décisions 31 à 35 : le nom,
     l'entrée, la durée des messages, qui écrit), l'invitation, Quitter,
     et pour le chef, Supprimer.
   ============================================================ */
import { boutonEnvoyer } from './fichier.js';
import { esc } from '../engine/utils.js';
import { kvGet, kvSet, GROUPES_KEY } from '../engine/storage.js';
import { nouvelId, LETTRE_KIND, pourCherche } from '../engine/boite.js';
import { nouvelIdAmi } from '../engine/amis.js';
import { sharePayload } from '../engine/exchange.js';
import { decouper, rassembler } from '../engine/portage.js';
import { GROUPES_MAX, MOT_MAX, NOM_MAX, nouveauCode, codeAffiche, nomGroupe, invitation, lireInvitation,
         cleGroupe, sceller, ouvrirMessage, normaliserMessage, dureeDe, groupeVide, normaliserGroupe,
         traiterMessage, elaguerGroupe, filDe, membresDe, nouveaux, presenceAredire,
         relaisVersGroupe, peutRelayerGroupe, porteInvitation, lirePorte, nouvelleCleSignature, presenceSignee, presenceVerifiee,
         responsables, estResponsable, adjointVerifie, nomination, redireNomination,
         retrait, exclusion, recode, retraitVerifie, excluVerifie, recodeVerifie, migrerGroupe,
         DUREES, MOT_JOURS, reglages as reglagesMsg, fin as finMsg, reglagesVerifies, finVerifiee, motPermis, reglagesDe,
         citesDe, citeMoi, mentionsNonLues, prenomsPour } from '../engine/groupe.js';
import { phraseCritere } from '../engine/critere.js';
import { emailPlausible } from '../engine/model.js';
import { S, bus, saveProfile, apresImage } from './state.js';
import { openSheet, toast, btn, ic, showUndo, clavier, champGrandit, bindDeleteGesture, confirmSheet, choixHTML, voirAutres } from './dom.js';
import { cleFil } from '../engine/conversations.js';
import { ligneNouveaux, suivreNouveaux, ligneJour, texteHTML, debutFenetre, ligneAvant, ouvrirAvant, boutonEnvoi } from './fil.js';
import { heureDe, memeJour, quandMessage } from './dates.js';
import { visageHTML } from './visage.js';
import { makeQrSvg } from './qr.js';
import { publier, lire, ecouter, evenement, echecEnvoi, amisJoignables, recevoirDemandeGroupe, recueDe, chargerReseau,
         trouvePour, ditTrouve, repondreDemande, donnerConnu, suivreAmis, assurerBoite, attentes, entreesPour,
         demanderEntree, repondreEntree, relever, envoyerRecode } from './reseau.js';

/* ---------- ce que cet appareil garde ---------- */
let etat = {};                 /* code → groupe (fil, membres, depuis, vu, presence) */
let charge = null;
export function chargerGroupes(){
  return charge || (charge = kvGet(GROUPES_KEY).then(v => {
    let o = {};
    try { o = JSON.parse(v || '{}') || {}; } catch (e) {}
    etat = {};
    for (const g of mesGroupes()) etat[g.code] = elaguerGroupe(normaliserGroupe(o[g.code]));
  }).catch(() => {}));
}
const sauver = () => kvSet(GROUPES_KEY, JSON.stringify(etat)).catch(() => {});
export const mesGroupes = () => S.profile.groupes || [];
const groupe = code => etat[code] || (etat[code] = groupeVide());
const moi = () => S.profile.amiId;
const prenomMoi = () => String(S.profile.name || '').trim().split(/\s+/)[0] || '';
/* le nom tel qu'on le connaît : celui de l'invitation, sinon celui
   qu'ont dit les autres membres — jamais un nom par défaut qu'on
   répéterait au groupe comme s'il était le vrai */
const nomConnu = code => { const g = mesGroupes().find(x => x.code === code); return (g && g.nom) || (etat[code] && etat[code].nom) || ''; };
const nomDe = code => nomConnu(code) || 'Groupe';
/* « SUR DEMANDE » (lot 5c) : ce que le profil sait du groupe — sa porte,
   la clé du chef, ma clé de signature */
const entreeDe = code => mesGroupes().find(g => g.code === code);
const surDemande = code => { const e = entreeDe(code); return e && e.type === 'demande' ? e : null; };
/* les membres qu'on montre : sans celui dont le retrait attend la fin
   de « Annuler » */
const membresVus = g => membresDe(g).filter(m => !(g.aRetirer && g.aRetirer.membre === m.de));
const jeSuisResponsable = code => { const e = surDemande(code); return !!e && !!e.sign && estResponsable(groupe(code), e.chef, e.sign.pub); };
/* LE CHEF (décision 31) : depuis la 6.66, tout groupe neuf en a un, ouvert
   ou sur demande — c'est la clé de signature de qui l'a créé, et elle part
   dans l'invitation. Un groupe d'avant n'en a pas : tout le monde y est
   égal, chacun peut le régler, personne ne le supprime pour tous. */
const chefDe = code => { const e = entreeDe(code); return (e && e.chef) || ''; };
const jeSuisChef = code => { const e = entreeDe(code); return !!(e && e.chef && e.sign && e.sign.pub === e.chef); };
const peutRegler = code => { const e = entreeDe(code); return !!e && (!e.chef || (!!e.sign && estResponsable(groupe(code), e.chef, e.sign.pub))); };
const DUREE_DITE = { 1: '24 heures', 7: '7 jours', 30: '30 jours' };
/* qui attend à la porte : ceux dont la présence n'est pas encore là */
const quiAttend = code => {
  const e = surDemande(code);
  if (!e || !jeSuisResponsable(code)) return [];
  const g = groupe(code);
  return entreesPour(e.porte).filter(x => !(g.membres || {})[x.ami]);
};

const cles = new Map();
const cle = code => { if (!cles.has(code)) cles.set(code, cleGroupe(code)); return cles.get(code); };

/* ---------- écrire au groupe ---------- */
async function poster(code, msg){
  const k = await cle(code);
  const ev = await evenement([['x', k.etiquette], ['expiration', String(Math.floor((msg.at + dureeDe(msg.t, msg.j)) / 1000))]],
    await sceller(k, msg));
  return publier(ev);
}
async function direPresence(code){
  const g = groupe(code);
  const at = Date.now();
  /* ma clé de boîte, dans TOUT groupe (6.66) : c'est par elle que me
     parvient un nouveau code — une nouvelle invitation, un membre retiré.
     Et ma clé de signature si j'en ai une, PROUVÉE. */
  let m = { t: 'membre', de: moi(), prenom: prenomMoi(), nom: nomConnu(code), at, cle: (await assurerBoite()).pub };
  const e = entreeDe(code);
  if (e && e.sign) m = await presenceSignee(e.sign.priv, { ...m, sign: e.sign.pub });
  const n = await poster(code, m).catch(() => 0);
  if (!n) return;
  etat[code] = traiterMessage({ ...g, presence: at }, m);
  /* l'adjoint redit sa nomination : celui qui arrive dans un mois la lit */
  const a = e && e.type === 'demande' && (g.adjoints || {})[moi()];
  if (a && a.sig) await poster(code, redireNomination(a, moi(), at)).catch(() => 0);
  await sauver();
}

/* ---------- R4 : un mot au groupe, d'ailleurs que du fil ----------
   La revue de « Ma semaine » part comme un mot du groupe, du geste de
   qui l'écrit. Le texte vient du moteur (`phraseRevue`, des nombres
   seulement) : cette fonction ne l'enrichit de rien. On n'écrit que là
   où l'on a le droit d'écrire (« Qui écrit », décision 33). */
export const groupesOuJEcris = () => mesGroupes().filter(g =>
  !(reglagesDe(groupe(g.code)).ecrire === 'resp' && !peutRegler(g.code)));
export async function direAuGroupe(code, texte){
  const t = String(texte || '').replace(/\s+/g, ' ').trim().slice(0, MOT_MAX);
  if (!t || !groupesOuJEcris().some(g => g.code === code)) return false;
  const j = reglagesDe(groupe(code)).j;
  const m = { t: 'mot', id: nouvelId(), de: moi(), prenom: prenomMoi(), texte: t, at: Date.now(),
              ...(j !== MOT_JOURS ? { j } : {}) };
  if (!await poster(code, m).catch(() => 0)) return false;
  etat[code] = { ...traiterMessage(groupe(code), m), vu: m.at };
  await sauver();
  bus.refresh();
  return true;
}

/* ---------- relever : à l'ouverture, au retour, toutes les 5 minutes ---------- */
let enCours = null;
export function releverGroupes(){
  if (enCours) return enCours;
  enCours = (async () => {
    await chargerGroupes();
    const liste = mesGroupes();
    if (!liste.length || !moi()) return;
    const parEtiquette = new Map();
    for (const g of liste) parEtiquette.set((await cle(g.code)).etiquette, g.code);
    const debut = Date.now();
    const depuis = Math.min(...liste.map(g => groupe(g.code).depuis || 0));
    const since = Math.max(Math.floor(depuis / 1000) - 3600, Math.floor((debut - 8 * 86400000) / 1000));
    const { evs, lus } = await lire({ kinds: [LETTRE_KIND], '#x': [...parEtiquette.keys()], since });
    const change = await absorber(evs, parEtiquette);
    if (lus) for (const g of liste) groupe(g.code).depuis = debut;
    for (const g of liste) if (presenceAredire(groupe(g.code))) await direPresence(g.code);
    for (const g of liste) if (Object.values(groupe(g.code).adjoints || {}).some(a => a.aDire)) await direNominations(g.code);
    /* ce qu'un responsable a décidé et que « Annuler » a laissé passer,
       mais qu'une app fermée trop tôt n'a pas dit (lot 5c2) */
    for (const g of liste){
      const h = groupe(g.code);
      if ((h.retires || []).some(r => r.aDire)) await direRetraits(g.code);
      if (h.aRetirer && h.aRetirer.quand <= Date.now()) await executerRetrait(g.code);
    }
    await sauver();
    if (change) bus.refresh();
  })().catch(() => {}).finally(() => { enCours = null; });
  return enCours;
}
async function absorber(evs, parEtiquette){
  let change = false;
  const signes = [];
  const exclusDe = new Set(), finis = new Set();
  for (const ev of evs){
    const x = (ev.tags || []).find(t => t[0] === 'x');
    const code = x && parEtiquette.get(x[1]);
    if (!code) continue;
    let m = normaliserMessage(await ouvrirMessage(await cle(code), ev.content));
    /* une clé de signature ne compte que PROUVÉE, et seulement dans un
       groupe « sur demande » ; une nomination, que signée d'un
       responsable — elle attend la fin du lot, son signataire peut
       arriver après elle */
    if (m && m.t === 'membre' && m.sign){
      if (chefDe(code)) m = await presenceVerifiee(m);
      else { const { sign, sig, ...r } = m; m = r; }
    }
    if (m && (m.t === 'adjoint' || m.t === 'retrait' || m.t === 'exclu')){ if (surDemande(code)) signes.push([code, m]); continue; }
    /* les réglages et la fin (décisions 31 à 35) : vérifiés comme le reste
       de ce qui se signe, contre le chef que CE groupe connaît */
    if (m && (m.t === 'reglages' || m.t === 'fin')){ signes.push([code, m]); continue; }
    /* « qui écrit : les responsables » : le mot d'un autre ne compte pas */
    if (m && m.t === 'mot' && !motPermis(groupe(code), chefDe(code), m)) continue;
    const avant = groupe(code);
    const apres = traiterMessage(avant, m);
    if (apres !== avant){
      etat[code] = apres; change = true;
      /* une demande d'un AUTRE : mon téléphone cherche, sans rien montrer
         s'il ne trouve rien (règle 6) */
      if (m.t === 'demande') await recevoirDemandeGroupe(m.lettre, code, nomDe(code)).catch(() => null);
    }
  }
  for (let tour = 0, reste = signes; tour < 3 && reste.length; tour++){
    const encore = [];
    for (const [code, m] of reste){
      const g = groupe(code);
      if (DEJA[m.t](g, m)) continue;
      if (await VERIF[m.t](g, chefDe(code), m, code)){
        etat[code] = traiterMessage(g, { ...m, verifie: true }); change = true;
        if (m.t === 'exclu' && m.membre === moi()) exclusDe.add(code);
        if (m.t === 'reglages') appliquerReglages(code);
        if (m.t === 'fin') finis.add(code);
      } else encore.push([code, m]);
    }
    if (encore.length === reste.length) break;
    reste = encore;
  }
  /* un responsable m'a retiré : le groupe quitte ce téléphone (lot 5c2) */
  for (const code of exclusDe) sortirExclu(code);
  /* le chef l'a supprimé pour tous (décision 32) */
  for (const code of finis) sortirFin(code);
  /* un groupe rejoint par son code seul apprend son nom des autres : il
     rejoint le profil, pour que mes autres appareils le sachent aussi */
  let appris = false;
  const liste = mesGroupes().map(g => !g.nom && etat[g.code] && etat[g.code].nom ? (appris = true, { ...g, nom: etat[g.code].nom }) : g);
  if (appris){ S.profile.groupes = liste; saveProfile(); }
  return change;
}

/* ce qu'un responsable signe, vérifié contre les responsables connus — et
   ce qui est déjà là ne se revérifie pas (une signature coûte) */
const VERIF = { adjoint: adjointVerifie, retrait: retraitVerifie, exclu: excluVerifie,
  reglages: (g, chef, m, code) => reglagesVerifies(g, chef, code, m),
  fin: (g, chef, m, code) => finVerifiee(chef, code, m) };
const DEJA = {
  adjoint: (g, m) => !!(g.adjoints || {})[m.membre],
  retrait: (g, m) => (g.retires || []).some(r => r.id === m.id),
  exclu: (g, m) => !!(g.membres[m.membre] || {}).exclu,
  reglages: (g, m) => !!g.reglages && g.reglages.at >= m.at,
  fin: g => !!g.fin
};
/* ce que les réglages changent dans le PROFIL : le nom, et l'entrée — un
   groupe passé « sur demande » prend sa porte */
function appliquerReglages(code){
  const r = groupe(code).reglages;
  if (!r) return;
  S.profile.groupes = mesGroupes().map(x => {
    if (x.code !== code) return x;
    const { type, porte, ...y } = x;
    return { ...y, nom: r.nom || x.nom, ...(r.entree === 'demande' && r.porte && x.chef ? { type: 'demande', porte: r.porte } : {}) };
  });
  saveProfile();
}
function sortirFin(code){
  const g = mesGroupes().find(x => x.code === code);
  const par = (etat[code] && etat[code].fin && etat[code].fin.par) || '';
  if (!g) return;
  S.profile.groupes = mesGroupes().filter(x => x.code !== code);
  saveProfile();
  delete etat[code];
  sauver();
  if (ouvert && ouvert.code === code) ouvert.sh.close();
  bus.refresh();
  toast(`${g.nom || 'Le groupe'} a été supprimé${par ? ' par ' + par : ''}.`);
}
function sortirExclu(code){
  const g = mesGroupes().find(x => x.code === code);
  if (!g) return;
  S.profile.groupes = mesGroupes().filter(x => x.code !== code);
  saveProfile();
  delete etat[code];
  sauver();
  bus.refresh();
  toast(`Tu n’es plus dans ${g.nom || 'ce groupe'}.`);
}

/* ---------- LA BOÎTE « Échanger » (ui/conversations.js) ----------
   Chaque groupe résumé comme une ligne de messagerie : son nom, ce qui
   s'y est dit en dernier, ce qui n'est pas lu — et qui attend à la porte,
   compté avec (quelqu'un attend, c'est à moi de répondre). */
const apercuDe = x => {
  const qui = x.de === moi() ? 'Toi' : x.prenom;
  if (x.t === 'retire') return 'Message retiré';
  if (x.t === 'demande') return `${x.de === moi() ? 'Tu cherches' : x.prenom + ' cherche'} quelqu’un ${quoiDe(x.lettre)}`;
  if (x.t === 'mot') return `${qui} : ${x.texte}`;
  return `${qui} : ${x.nb} piste${x.nb > 1 ? 's' : ''}`;
};
export function resumeGroupes(){
  const liste = mesGroupes();
  const portes = new Set(liste.map(g => g.porte).filter(Boolean));
  return [
    ...liste.map(e => {
      const g = etat[e.code] || groupeVide();
      const d = filDe(g).at(-1);
      return { cle: cleFil('groupe', e.code), sorte: 'groupe', id: e.code, nom: nomDe(e.code),
               at: d ? d.at : e.at, apercu: d ? apercuDe(d) : '', n: nouveaux(g, moi()) + quiAttend(e.code).length,
               cite: mentionsNonLues(g, moi()) };
    }),
    /* les groupes où j'ai demandé à entrer (lot 5c) : une ligne qui ne
       s'ouvre pas encore */
    ...attentes().filter(a => !portes.has(a.porte)).map(a => ({
      cle: cleFil('groupe', a.porte), sorte: 'groupe', id: a.porte, nom: a.nom || 'Groupe', at: a.at || 0,
      apercu: 'en attente', n: 0, attente: true }))
  ];
}
export const groupesPlein = () => mesGroupes().length + attentes().filter(a => !mesGroupes().some(g => g.porte === a.porte)).length >= GROUPES_MAX;
/* « Marquer comme lu », depuis le menu de la ligne */
export function marquerGroupeLu(code){ vu(code); }
export { ouvrirNouveau as ouvrirNouveauGroupe };

/* Créer ou rejoindre : deux rangées, rien d'autre. La feuille porte le
   mot de la porte qui l'ouvre — « Groupes » ou « Nouveau groupe » — pour
   que le geste et ce qu'il ouvre se reconnaissent. */
function ouvrirNouveau(apres, titre){
  const sh = openSheet({ title: titre || 'Groupes', icon: 'message-text' });
  sh.body.innerHTML =
    `<div class="pick-list">
       <button class="pick" id="grCreer"><b>${ic('plus', 'ic-14')} Créer un groupe</b></button>
       <button class="pick" id="grRejoindre"><b>${ic('grid-3x3', 'ic-14')} Rejoindre un groupe</b></button>
     </div>`;
  sh.body.querySelector('#grCreer').addEventListener('click', () => { sh.close(); ouvrirCreer(apres); });
  sh.body.querySelector('#grRejoindre').addEventListener('click', () => { sh.close(); ouvrirRejoindre(apres); });
}

/* ---------- entrer : créer, ou rejoindre ----------
   Un groupe voit ton PRÉNOM (décision 26) : sans nom dans le profil,
   l'app ouvre le profil sur le nom, et reprend où l'on allait. */
async function avecPrenom(suite){
  if (prenomMoi()) return suite();
  const { openProfil } = await import('./profil.js');
  openProfil(() => { if (prenomMoi()) suite(); }, { focus: '#pfName' });
}
async function entrer(g){
  if (!S.profile.amiId){ S.profile.amiId = nouvelIdAmi(); saveProfile(); }
  await chargerGroupes();
  S.profile.groupes = [...mesGroupes().filter(x => x.code !== g.code), g].slice(0, GROUPES_MAX);
  saveProfile();
  groupe(g.code);
  await direPresence(g.code);     /* sans réseau : elle repartira à la relève */
  await sauver();
  bus.refresh();
}

export function ouvrirCreer(apres){
  avecPrenom(() => {
    const sh = openSheet({ title: 'Créer un groupe', icon: 'message-text', focus: '#grNom' });
    /* LA SEULE QUESTION (décision 24), posée une fois : qui peut entrer.
       Ce qu'elle change se lit sous les segments, et change avec eux. */
    sh.body.innerHTML =
      `<div class="field"><label for="grNom">Nom du groupe</label>
         <input id="grNom" maxlength="${NOM_MAX}" ${clavier('nom')} placeholder="ex : BTS SIO Lille"></div>
       <div class="field"><label id="grSorteL">Entrée</label>
         <div class="seg3" role="radiogroup" aria-labelledby="grSorteL">
           <button class="seg on" data-sorte="ouvert" aria-pressed="true">Ouvert</button>
           <button class="seg" data-sorte="demande" aria-pressed="false">Sur demande</button>
         </div>
         <p class="gr-etat" id="grSorteDit" aria-live="polite"></p></div>`;
    const champ = sh.body.querySelector('#grNom');
    let sorte = 'ouvert';
    const DIT = { ouvert: 'Qui a le QR entre.', demande: 'Tu acceptes chaque entrée.' };
    const dire = () => {
      sh.body.querySelectorAll('[data-sorte]').forEach(b => {
        const on = b.dataset.sorte === sorte;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      });
      sh.body.querySelector('#grSorteDit').textContent = DIT[sorte];
    };
    sh.body.querySelectorAll('[data-sorte]').forEach(b => b.addEventListener('click', () => { sorte = b.dataset.sorte; dire(); }));
    dire();
    const go = async () => {
      const nom = nomGroupe(champ.value);
      if (!nom) return;
      const g = { code: nouveauCode(), nom, at: Date.now() };
      bGo.disabled = true;
      /* le chef, c'est la clé de signature qu'il crée ici — pour TOUT
         groupe depuis la 6.66 (décision 31) : c'est elle qui règle et qui
         supprime. Sur demande, il a aussi la porte. */
      const sign = await nouvelleCleSignature();
      Object.assign(g, { chef: sign.pub, sign });
      if (sorte === 'demande'){
        await assurerBoite();
        Object.assign(g, { type: 'demande', porte: nouvelId() });
      }
      await entrer(g);
      sh.close();
      ouvrirGroupe(g.code, apres);
    };
    const bGo = btn('Créer', 'btn-primary', go);
    bGo.id = 'grCreerGo';
    /* le geste n'existe qu'avec un nom : un bouton qui ne fait rien
       ne se montre pas (§6) */
    const maj = () => { bGo.hidden = !nomGroupe(champ.value); };
    champ.addEventListener('input', maj);
    champ.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    sh.setFoot([bGo]);
    maj();
  });
}

export function ouvrirRejoindre(apres){
  const sh = openSheet({ title: 'Rejoindre un groupe', icon: 'message-text' });
  sh.body.innerHTML =
    `<div class="field"><label for="grCode">Code du groupe</label>
       <input id="grCode" ${clavier('secret')} placeholder="ex : k7m3p-9xq2f-h4tn8"></div>
     <p class="gr-etat" id="grQui" hidden></p>`;
  const champ = sh.body.querySelector('#grCode');
  const qui = sh.body.querySelector('#grQui');
  const go = () => {
    const inv = lireInvitation(champ.value);
    if (inv) return rejoindre(sh, inv, apres);
    const p = lirePorte(champ.value);
    if (p) frapper(sh, p, apres);
  };
  const bGo = btn('Rejoindre', 'btn-primary', go);
  const bScan = btn('Scanner', '', async () => {
    sh.close();
    (await import('./recevoir.js')).openRecevoir({ scanner: true, apres });
  }, 'grid-3x3');
  bGo.id = 'grRejoindreGo'; bScan.id = 'grScan';
  const maj = () => {
    const inv = lireInvitation(champ.value);
    const p = !inv && lirePorte(champ.value);
    bGo.hidden = !inv && !(p && !etatPorte(p).fini);
    qui.hidden = !inv && !p;
    if (inv) qui.innerHTML = etatInvitation(inv);
    if (p) qui.innerHTML = etatPorte(p).dit;
    /* une porte se demande, elle ne se rejoint pas */
    bGo.textContent = p ? 'Demander à entrer' : 'Rejoindre';
  };
  champ.addEventListener('input', maj);
  champ.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  sh.setFoot([bScan, bGo]);
  maj();
}
/* ce que l'on saura AVANT d'entrer : un état, jamais une explication */
function etatInvitation(inv){
  if (mesGroupes().some(g => g.code === inv.code)) return 'Tu es déjà dans ce groupe.';
  if (mesGroupes().length >= GROUPES_MAX) return `Tu es déjà dans ${GROUPES_MAX} groupes.`;
  return prenomMoi() ? `Le groupe verra ton prénom : <b>${esc(prenomMoi())}</b>.` : 'Le groupe verra ton prénom.';
}
async function rejoindre(sh, inv, apres){
  if (mesGroupes().some(g => g.code === inv.code)){ sh.close(); ouvrirGroupe(inv.code, apres); return; }
  if (mesGroupes().length >= GROUPES_MAX) return;
  avecPrenom(async () => {
    await entrer({ code: inv.code, nom: inv.nom || (etat[inv.code] && etat[inv.code].nom) || '', at: Date.now(),
                   ...(inv.chef ? { chef: inv.chef } : {}) });
    sh.close();
    ouvrirGroupe(inv.code, apres);
  });
}
/* le scanner de « Recevoir » a lu une invitation : l'aperçu passe avant */
export function apercuGroupe(sh, inv, o = {}){
  const deja = mesGroupes().some(g => g.code === inv.code);
  const plein = !deja && mesGroupes().length >= GROUPES_MAX;
  sh.setTitle(inv.nom || 'Groupe');
  sh.body.innerHTML = `<p class="gr-etat" id="grQui">${etatInvitation(inv)}</p>`;
  const b = btn(deja ? 'Ouvrir' : 'Rejoindre', 'btn-primary', () => rejoindre(sh, inv, o.apres));
  b.id = 'grRejoindreGo';
  sh.setFoot(plein ? (o.onBack ? [btn('Retour', 'btn-ghost', o.onBack, 'arrow-left')] : null) : [b]);
}

/* ---------- LA PORTE d'un groupe « sur demande » (lot 5c) ----------
   Elle ne porte pas le code : on DEMANDE à entrer, et un responsable
   répond en nous l'envoyant. Ce qu'on saura avant : un état. */
function etatPorte(p){
  const dedans = mesGroupes().find(g => g.porte === p.porte);
  if (dedans) return { dit: 'Tu es déjà dans ce groupe.', fini: true, dedans };
  if (attentes().some(a => a.porte === p.porte)) return { dit: 'Ta demande est partie.', fini: true };
  if (mesGroupes().length + attentes().length >= GROUPES_MAX) return { dit: `Tu es déjà dans ${GROUPES_MAX} groupes.`, fini: true };
  return { dit: prenomMoi() ? `Le groupe verra ton prénom : <b>${esc(prenomMoi())}</b>.` : 'Le groupe verra ton prénom.' };
}
function frapper(sh, p, apres){
  const e = etatPorte(p);
  if (e.dedans){ sh.close(); ouvrirGroupe(e.dedans.code, apres); return; }
  if (e.fini) return;
  avecPrenom(async () => {
    if (!await demanderEntree(p)) return;
    sh.close();
    if (apres) apres();
  });
}
export function apercuPorte(sh, p, o = {}){
  const e = etatPorte(p);
  sh.setTitle(p.nom || 'Groupe');
  sh.body.innerHTML = `<p class="gr-etat" id="grQui">${e.dit}</p>`;
  const b = btn(e.dedans ? 'Ouvrir' : 'Demander à entrer', 'btn-primary', () => frapper(sh, p, o.apres));
  b.id = 'grRejoindreGo';
  const retour = o.onBack ? [btn('Retour', 'btn-ghost', o.onBack, 'arrow-left')] : null;
  sh.setFoot(e.fini && !e.dedans ? retour : [b]);
}
/* un responsable m'a ouvert : j'entre, avec ma clé de signature à moi
   (elle servira si l'on me nomme adjoint) */
export async function entrerAdmis(l){
  await chargerGroupes();
  if (mesGroupes().some(g => g.code === l.code) || mesGroupes().length >= GROUPES_MAX) return;
  const sign = await nouvelleCleSignature();
  await entrer({ code: l.code, nom: l.nom, at: Date.now(), type: 'demande', porte: l.porte, chef: l.chef, sign });
  /* au calme (R10), la boîte le montre : la ligne « en attente » s'ouvre */
}

/* ---------- un groupe : les prénoms, le fil, le pied pour écrire ---------- */
const quand = heureDe;
/* « chez Aztek pour une alternance » : ce que qui demande cherche (lot F3) */
const quoiDe = l => (l.entreprise ? 'chez ' + l.entreprise.nom : phraseCritere(l.critere)) + pourCherche(l.cherche);
/* DEMANDE TROUVÉE PAR MON TÉLÉPHONE : elle passe EN TÊTE, à mon nom
   (décision 29 — dans un groupe chacun croit qu'un autre répondra ;
   s'adresser à quelqu'un par son nom, c'est ce qui marche) */
/* MA demande : celle dont je suis l'auteur (sa clé est la mienne) — pas
   celle que j'ai seulement relayée d'un autre groupe */
const maDemande = x => !!S.profile.boite && x.lettre.de.cle === S.profile.boite.pub;
const trouveeParMoi = x => x.t === 'demande' && !maDemande(x) && !!trouvePour(recueDe(x.id));
/* dans le fil, l'heure (le jour est dit au-dessus) ; en tête du groupe,
   hors du fil, le jour aussi */
function demandeHTML(x, enTete = false){
  const mien = maDemande(x);
  const r = mien ? null : recueDe(x.id);
  const t = trouvePour(r);
  const etatRep = r && r.statut === 'donnee' ? 'Donné' : r && r.statut === 'transmise' ? 'Tu l’as fait suivre' : '';
  return `<li class="gr-m gr-dem${mien ? ' gr-moi' : ''}${t ? ' gr-trouvee' : ''}">
      <span class="gr-qui"><b>${mien ? 'Toi' : esc(x.prenom)}</b> <time>${esc(enTete ? quandMessage(x.at) : quand(x.at))}</time></span>
      <p>${ic('users', 'ic-14')} ${mien ? 'Tu cherches' : esc(x.prenom) + ' cherche'} quelqu’un ${esc(quoiDe(x.lettre))}</p>
      ${x.relais ? `<span class="gr-sous">relayée par ${esc(x.relais.prenom)}</span>` : ''}
      ${t ? `<span class="gr-tu">${ic('check', 'ic-14')} ${esc(ditTrouve(t))}</span>` : ''}
      ${mien ? '' : etatRep ? `<span class="gr-pris">${ic('check', 'ic-14')} ${etatRep}</span>`
        : `<button class="btn btn-sm${t ? ' btn-primary' : ''}" data-repondre="${esc(x.id)}">Répondre</button>`}
    </li>`;
}
/* `fen` : la fenêtre rendue ({ancre, debut}), gardée d'un rendu à
   l'autre (ui/fil.js) */
function filHTML(code, vuAvant = Infinity, fen = {}){
  const g = groupe(code);
  const fil = filDe(g).filter(x => !trouveeParMoi(x));
  /* chez un responsable, chaque message se retire au geste — le motif
     de la suppression, avec SON mot (lot 5c2) */
  const retirable = jeSuisResponsable(code);
  /* LÀ OÙ L'ON S'ÉTAIT ARRÊTÉ : une ligne avant le premier message
     arrivé depuis la dernière visite, et ce qui est neuf marqué pour le
     bouton « ↓ N nouveaux » (ui/fil.js) */
  const neuf = x => x.t !== 'retire' && x.de !== moi() && x.at > vuAvant;
  const n = fil.filter(neuf).length;
  let pose = false;
  /* les prénoms du groupe : « @Karim » se marque quand Karim en est */
  const prenoms = membresVus(g).map(m => m.prenom).concat(prenomMoi() ? [prenomMoi()] : []);
  const debut = debutFenetre(fil, neuf, fen.ancre);
  fen.debut = debut; fen.ancre = (fil[debut] || {}).id || ''; fen.fil = fil;
  return ligneAvant(debut) + fil.slice(debut).map((x, k) => {
    const i = debut + k;
    let html = bulleHTML(g, x, prenoms);
    if (neuf(x)) html = html.replace(/^<li class="/, '<li class="fil-neuf ');
    if (retirable && x.t !== 'retire')
      html = html.replace(/^<li([^>]*)>([\s\S]*)<\/li>$/, (_, a, corps) => `<li${a} data-retirable="${esc(x.id)}"><div class="sw-in">${corps}</div></li>`);
    if (neuf(x) && !pose){ pose = true; html = ligneNouveaux(n) + html; }
    /* le jour se dit une fois, avant son premier message (lot F2) — et
       sur le premier de la fenêtre, toujours */
    if (!k || !memeJour(fil[i - 1].at, x.at)) html = ligneJour(x.at) + html;
    return html;
  }).join('');
}
function bulleHTML(g, x, prenoms = []){
  const mien = x.de === moi();
  /* qui écrit : son visage, son prénom, l'heure — le jour est dit au-dessus */
  const tete = `<span class="gr-qui">${mien ? '' : visageHTML(x.de, 'vz-s')}<b>${mien ? 'Toi' : esc(x.prenom)}</b> <time>${esc(quand(x.at))}</time></span>`;
  /* un message retiré garde sa place : qui l'a retiré, rien de ce qu'il disait */
  if (x.t === 'retire') return `<li class="gr-m gr-retire${mien ? ' gr-moi' : ''}">${tete}
      <p>${ic('eye-off', 'ic-14')} Retiré par ${x.parDe === moi() ? 'toi' : esc(x.par || 'un responsable')}</p></li>`;
  if (x.t === 'demande') return demandeHTML(x);
  /* ce qui me nomme se voit (lot F2) : un liseré d'accent, comme le
     surlignage d'une mention sur Slack ou Discord */
  if (x.t === 'mot') return `<li class="gr-m${mien ? ' gr-moi' : ''}${!mien && citeMoi(x, moi()) ? ' gr-pour-moi' : ''}">${tete}<p>${texteHTML(x.texte, prenoms)}</p></li>`;
  const pris = (g.pris || []).includes(x.id);
  return `<li class="gr-m gr-don${mien ? ' gr-moi' : ''}">${tete}
      <p>${ic('share', 'ic-14')} ${x.nb} piste${x.nb > 1 ? 's' : ''}</p>
      ${mien ? '' : pris ? `<span class="gr-pris">${ic('check', 'ic-14')} dans tes pistes</span>`
        : `<button class="btn btn-sm" data-voir="${esc(x.id)}">Voir</button>`}
    </li>`;
}
export async function ouvrirGroupe(code, apres, o = {}){
  /* ce que MON téléphone a trouvé vit dans la boîte (oc_reseau_v1) : sans
     elle, une demande trouvée ne passerait pas en tête */
  await Promise.all([chargerGroupes(), chargerReseau()]);
  let arret = null;
  /* au poste, la conversation se POSE dans le volet de la boîte (`dans`) ;
     au pouce, elle s'ouvre en feuille */
  const sh = openSheet({ title: nomDe(code), icon: 'message-text', className: 'modal-groupe', dans: o.dans,
    onClose: () => { if (arret) arret(); if (ouvert && ouvert.sh === sh) ouvert = null; vu(code); if (apres) apres(); } });
  ouvert = { code, sh, apres, dans: o.dans };
  /* ce qui était lu AVANT d'ouvrir : la ligne « N nouveaux » se pose
     là, et y reste tant que la conversation est ouverte ; le groupe, lui,
     est lu dès qu'on l'ouvre (le chiffre de la boîte retombe) */
  const vuAvant = groupe(code).vu;
  vu(code);
  const q = s => sh.body.querySelector(s);
  /* LA TÊTE DU GROUPE NE DÉFILE PAS (audit au téléphone, 28 octobre
     2026). La ligne des prénoms — la porte de « Groupe » : ses membres,
     l'invitation, les réglages, la sortie — et ce qui m'attend, moi,
     vivaient en tête du FIL. Or le fil s'ouvre en bas, ou sur ce qui est
     neuf : relevé sur un groupe de vingt-six messages, ni l'une ni
     l'autre n'était à l'écran, et rien ne disait qu'il fallait remonter
     pour les trouver. Ils se posent sous la barre, hors du défilement,
     comme la barre des demandes d'entrée de Telegram et l'en-tête des
     infos de WhatsApp. Clavier ouvert, elle s'efface (styles/app.css) :
     on écrit, la place va au fil. */
  const tete = document.createElement('div');
  tete.className = 'gr-tete';
  sh.body.before(tete);
  const rendre = async () => {
    if (!sh.body.isConnected) return;
    const g = groupe(code);
    const autres = membresVus(g).filter(m => m.de !== moi());
    const fil = filDe(g);
    const enTete = fil.filter(trouveeParMoi);
    /* qui attend à la porte passe EN TÊTE : quelqu'un attend, et c'est
       à moi de répondre (lot 5c). Une personne à la fois, la première
       arrivée — accepter ou refuser fait venir la suivante —, et le
       compte de ceux qui attendent derrière elle : une classe qui scanne
       le QR ensemble posait dix-huit cartes au-dessus de la conversation. */
    const porte = quiAttend(code);
    /* au premier rendu, rien à relire : lire la hauteur forcerait une
       mise en page de la feuille encore vide, pendant le tap */
    const bas = rendu && sh.body.scrollHeight - sh.body.scrollTop - sh.body.clientHeight < 40;
    sh.setTitle(nomDe(code));
    const x = porte[0];
    tete.innerHTML =
      /* LA LIGNE DES PRÉNOMS, toujours là — seul aussi : c'est la porte
         de « Groupe » (« Infos du groupe » de WhatsApp). Avant, seul dans
         son groupe, on ne pouvait ni le quitter ni le supprimer. */
      `<button class="gr-membres" id="grMembres">${ic('users', 'ic-14')}
           <span class="gr-membres-t">${esc([...autres.map(m => m.prenom), 'toi'].join(' · '))}</span>${ic('chevron-right', 'ic-14')}</button>
       ${x ? `<div class="gr-entree" id="grPorte">
           <p>${ic('user', 'ic-14')} <span><b>${esc(x.de.prenom)}</b> veut entrer${porte.length > 1
             ? `<span class="gr-sous"> · ${porte.length - 1} autre${porte.length > 2 ? 's' : ''} attend${porte.length > 2 ? 'ent' : ''}</span>` : ''}</span></p>
           <span class="gr-entree-g">
             <button class="btn btn-sm" data-refuser="${esc(x.id)}">Refuser</button>
             <button class="btn btn-sm btn-primary" data-accepter="${esc(x.id)}">Accepter</button>
           </span></div>` : ''}
       ${enTete.length ? `<ol class="gr-fil gr-entete" id="grEnTete">${enTete.map(y => demandeHTML(y, true)).join('')}</ol>` : ''}`;
    sh.body.innerHTML =
      `${!autres.length && !fil.length ? `<div class="gr-inviter" id="grInviter"></div>` : ''}
       <p class="gr-ephem">${ic('clock', 'ic-14')} Les messages s’effacent au bout de ${DUREE_DITE[reglagesDe(g).j]}.</p>
       <ol class="gr-fil" id="grFil">${filHTML(code, vuAvant, fen)}</ol>`;
    tete.querySelector('#grMembres').addEventListener('click', () => ouvrirMembres(code, sh));
    q('[data-avant]')?.addEventListener('click', () => ouvrirAvant(sh.body, fen, fen.fil, rendre));
    redirePied();
    const repondre = async (b, ouvrir) => {
      const e = surDemande(code);
      b.disabled = true;
      await repondreEntree(ouvrir ? b.dataset.accepter : b.dataset.refuser, ouvrir,
        { porte: e.porte, code, nom: nomConnu(code), chef: e.chef });
      rendre();
    };
    tete.querySelectorAll('[data-accepter]').forEach(b => b.addEventListener('click', () => repondre(b, true)));
    tete.querySelectorAll('[data-refuser]').forEach(b => b.addEventListener('click', () => repondre(b, false)));
    if (q('#grInviter')) inviterDans(q('#grInviter'), code);
    sh.body.querySelectorAll('[data-voir]').forEach(b => b.addEventListener('click', () => voirPistes(code, b.dataset.voir, rendre)));
    /* une table, pas une recherche par bulle : 120 bulles dans un fil de
       640 messages faisaient jusqu'à 77 000 comparaisons pendant le tap (porte « Performance ») */
    const parId = new Map(groupe(code).fil.map(y => [y.id, y]));
    sh.body.querySelectorAll('[data-retirable]').forEach(li => {
      const x = parId.get(li.dataset.retirable);
      bindDeleteGesture(li, () => retirerMessage(code, li.dataset.retirable, rendre), x ? 'le message de ' + x.prenom : '', { mot: 'Retirer' });
    });
    /* « Répondre » : dans le fil, et sur la demande trouvée en tête */
    [tete, sh.body].forEach(z => z.querySelectorAll('[data-repondre]').forEach(b => b.addEventListener('click', () => {
      const x = groupe(code).fil.find(y => y.id === b.dataset.repondre);
      if (x) ouvrirReponse(code, x, rendre);
    })));
    /* à l'ouverture, on arrive sur la ligne « N nouveaux » s'il y en a
       une, au bas sinon ; ensuite, on ne suit le bas que si on y était */
    if (!rendu) suivre.ouvrir(); else if (bas) sh.body.scrollTop = sh.body.scrollHeight;
    else suivre.maj();
    rendu = true;
    /* « Groupe », s'il est ouvert par-dessus, suit avec elle */
    if (membresOuvert && membresOuvert.code === code) membresOuvert.rendre();
    /* la conversation est sous les yeux : ce qui arrive est lu */
    if (sh.body.isConnected && groupe(code).vu < Date.now() - 1000) vu(code);
  };
  let rendu = false;
  const fen = {};
  const suivre = suivreNouveaux(sh.body);

  /* LE PIED : écrire, ou donner des pistes. Une phrase, pas d'image
     (décision 27) ; Entrée envoie. */
  const champ = document.createElement('textarea');
  champ.id = 'grMot'; champ.rows = 1; champ.maxLength = MOT_MAX;
  champ.className = 'gr-champ';
  champ.placeholder = 'Écrire au groupe';
  champ.setAttribute('aria-label', 'Écrire au groupe');
  champGrandit(champ);
  const envoyer = async () => {
    const texte = champ.value.replace(/\s+/g, ' ').trim().slice(0, MOT_MAX);
    if (!texte) return;
    const j = reglagesDe(groupe(code)).j;
    /* « @Karim » : les membres que le mot nomme partent avec lui (lot F2) */
    const cite = citesDe(texte, membresVus(groupe(code)), moi());
    const m = { t: 'mot', id: nouvelId(), de: moi(), prenom: prenomMoi(), texte, at: Date.now(),
                ...(j !== MOT_JOURS ? { j } : {}), ...(cite.length ? { cite } : {}) };
    const n = await poster(code, m).catch(() => 0);
    if (!n){ echecEnvoi(); return; }
    etat[code] = { ...traiterMessage(groupe(code), m), vu: m.at };
    await sauver();
    champ.value = '';
    champ.dispatchEvent(new Event('input'));
    rendre();
    sh.body.scrollTop = sh.body.scrollHeight;
  };
  /* « @ » OUVRE LES PRÉNOMS (lot F2) : au-dessus du champ, les membres
     dont le prénom commence par ce qui suit l'arobase. Un tap l'écrit ;
     rien ne se choisit à part — la mention se lit dans le texte. */
  const propose = document.createElement('div');
  propose.className = 'datechips gr-propose';
  propose.id = 'grPropose';
  propose.setAttribute('role', 'group');
  propose.setAttribute('aria-label', 'Nommer quelqu’un');
  propose.hidden = true;
  const fragment = () => {
    const av = champ.value.slice(0, champ.selectionStart ?? champ.value.length);
    const m = av.match(/(?:^|[^\p{L}\p{N}])@([\p{L}\p{N}'’-]*)$/u);
    return m ? { debut: av.length - m[1].length - 1, f: m[1] } : null;
  };
  const proposer = () => {
    const fr = fragment();
    const noms = fr ? prenomsPour(fr.f, membresVus(groupe(code)), moi()) : [];
    propose.hidden = !noms.length;
    propose.innerHTML = noms.map(n => `<button type="button" class="dchip" data-nommer="${esc(n)}">@${esc(n)}</button>`).join('');
  };
  propose.addEventListener('click', e => {
    const b = e.target.closest('[data-nommer]');
    const fr = fragment();
    if (!b || !fr) return;
    const fin = champ.selectionStart ?? champ.value.length;
    const mot = '@' + b.dataset.nommer + ' ';
    champ.value = champ.value.slice(0, fr.debut) + mot + champ.value.slice(fin);
    const ici = fr.debut + mot.length;
    champ.focus();
    champ.setSelectionRange(ici, ici);
    champ.dispatchEvent(new Event('input'));
  });
  champ.addEventListener('input', proposer);
  champ.addEventListener('click', proposer);
  /* un mot de groupe tient sur une ligne : Entrée envoie, partout — la
     touche du clavier le dit (« Envoyer »). Jamais pendant qu'un clavier
     à composition choisit encore son caractère (IME). */
  champ.setAttribute('enterkeyhint', 'send');
  /* la flèche s'allume quand il y a de quoi envoyer, et ne prend pas le
     focus : le clavier reste ouvert d'un message à l'autre (ui/fil.js) */
  const env = boutonEnvoi(champ, envoyer, 'grEnvoyer');
  const bEnv = env.bouton;
  champ.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); env.lancer(); } });
  const bDon = btn('Donner', '', async () => {
    (await import('./donner.js')).openDonner({ groupe: { code, nom: nomDe(code) }, apres: rendre });
  }, 'share');
  bDon.id = 'grDonner';
  const pied = document.createElement('div');
  pied.className = 'gr-pied';
  /* « QUI ÉCRIT : les responsables » (décision 34) : le champ laisse la
     place à l'état — « Donner » reste, les pistes ne sont pas des mots */
  const seulsResp = document.createElement('p');
  seulsResp.className = 'gr-seuls'; seulsResp.id = 'grSeuls';
  seulsResp.textContent = 'Seuls les responsables écrivent ici.';
  const redirePied = () => {
    const ferme = reglagesDe(groupe(code)).ecrire === 'resp' && !peutRegler(code);
    if (ferme === !!seulsResp.isConnected && pied.childNodes.length) return;
    pied.replaceChildren(...(ferme ? [bDon, seulsResp] : [bDon, champ, bEnv]));
  };
  redirePied();
  sh.setFoot([propose, pied]);

  await rendre();
  /* EN DIRECT tant que la feuille est ouverte : un mot écrit en face
     arrive sans rien toucher ; fermée, la relève prend le relais */
  const k = await cle(code);
  arret = ecouter({ kinds: [LETTRE_KIND], '#x': [k.etiquette], since: Math.floor(Date.now() / 1000) - 60 }, async ev => {
    if (await absorber([ev], new Map([[k.etiquette, code]]))){ await sauver(); rendre(); }
  });
  /* la boîte aussi : qui attend à la porte y arrive (lot 5c) — une
     relève déjà en cours est la même, rien ne part deux fois. On ne
     redessine que si elle a APPORTÉ quelque chose : un groupe qui change
     est remplacé (`etat[code] = …`), jamais retouché sur place ; sinon,
     les 120 bulles se refaisaient pour rien juste après l'ouverture, et
     le tap suivant attendait derrière (porte « Performance ») */
  const lu = groupe(code);
  Promise.all([releverGroupes(), relever()]).then(([, boite]) => { if (boite || groupe(code) !== lu) rendre(); });
  return sh;
}
/* la feuille d'un groupe ouverte : si le groupe change de code pendant
   qu'on la regarde, elle se rouvre sur le nouveau */
let ouvert = null;
function vu(code){
  if (!mesGroupes().some(g => g.code === code)) return;
  if (!etat[code]) return;
  etat[code] = { ...etat[code], vu: Date.now() };
  /* la boîte est derrière la feuille, et la lecture n'a pas à
     s'enregistrer pendant le tap : après l'image (ui/state.js) */
  apresImage(sauver);
  bus.apresImage();
}

/* donner des pistes AU GROUPE : la liste de « Donner », envoyée en
   morceaux scellés — la vue communautaire, jamais le suivi */
export async function donnerAuGroupe(code, list, keep){
  const payload = sharePayload(list, keep, prenomMoi());
  const d = await decouper(payload);
  const at = Date.now();
  /* l'identifiant du don est celui des lettres (base64url) : celui que
     tire `decouper` est en base64 classique, et un « + » ou un « / » le
     faisait refuser par le téléphone d'en face, une fois sur trois */
  const base = { t: 'part', id: nouvelId(), de: moi(), prenom: prenomMoi(), nb: list.length, n: d.n, at };
  for (let i = 0; i < d.n; i++){
    const n = await poster(code, { ...base, i, d: d.parts[i] }).catch(() => 0);
    if (!n) return false;
  }
  let g = groupe(code);
  for (let i = 0; i < d.n; i++) g = traiterMessage(g, { ...base, i, d: d.parts[i] });
  etat[code] = { ...g, vu: at };
  await sauver();
  return true;
}
async function voirPistes(code, id, apres){
  const x = groupe(code).fil.find(y => y.id === id);
  if (!x) return;
  let obj;
  try { obj = await rassembler(x.d); } catch (e) { toast('Ces pistes ne se lisent pas.'); return; }
  const sh = openSheet({ title: 'Aperçu avant fusion', icon: 'inbox' });
  const { mergePreviewInto } = await import('./recevoir.js');
  mergePreviewInto(sh, obj, { dans: { de: x.prenom, groupe: nomDe(code) }, onDone: () => {
    const g = groupe(code);
    etat[code] = { ...g, pris: [...(g.pris || []), id] };
    sauver();
    apres();
  } });
}

/* ---------- LA DEMANDE AU GROUPE (lot 5b) ----------
   Tout le groupe la voit (décision 20) ; la réponse ne passe jamais par
   lui — elle va à la boîte de qui demande (décision 29). */
export async function demanderAuxGroupes(l){
  await chargerGroupes();
  const at = Date.now();
  const partis = [];
  for (const g of mesGroupes()){
    const m = { t: 'demande', de: moi(), lettre: l, at };
    if (!await poster(g.code, m).catch(() => 0)) continue;
    etat[g.code] = traiterMessage(groupe(g.code), normaliserMessage(m, at));
    partis.push(nomDe(g.code));
  }
  await sauver();
  return partis;
}
/* QUATRE RÉPONSES (décision 28), en rangées : celles qui ne peuvent pas
   servir ne sont pas là (rien à donner, personne à qui faire suivre) */
function ouvrirReponse(code, x, apres){
  const r = recueDe(x.id);
  const t = trouvePour(r);
  const sh = openSheet({ title: 'Demande', icon: 'users' });
  const autres = mesGroupes().filter(g => g.code !== code && !(groupe(g.code).fil || []).some(y => y.id === x.id));
  const versGroupes = peutRelayerGroupe(x) ? autres : [];
  const fin = () => { sh.close(); apres(); };
  const accueil = () => {
    sh.setTitle('Demande');
    sh.body.innerHTML =
      `<div class="gr-mot" id="rpMot">${esc(x.prenom)} cherche quelqu’un ${esc(quoiDe(x.lettre))}.</div>
       <div class="pick-list gr-rep">
         ${t ? `<button class="pick" id="rpDonner"><b>${ic('share', 'ic-14')} Donner ${t.soi ? 'ton contact' : esc(t.ct.name)}</b></button>` : ''}
         <button class="pick" id="rpConnais"><b>${ic('user', 'ic-14')} Je connais quelqu’un</b></button>
         ${amisJoignables().length || versGroupes.length ? `<button class="pick" id="rpSuivre"><b>${ic('redo', 'ic-14')} Faire suivre</b></button>` : ''}
         <button class="pick" id="rpMasquer"><b>${ic('eye-off', 'ic-14')} Masquer</b></button>
       </div>`;
    sh.setFoot(null);
    sh.body.querySelector('#rpDonner')?.addEventListener('click', () => { sh.close(); repondreDemande(x.id); });
    sh.body.querySelector('#rpConnais').addEventListener('click', connais);
    sh.body.querySelector('#rpSuivre')?.addEventListener('click', suivre);
    sh.body.querySelector('#rpMasquer').addEventListener('click', async () => {
      const g = groupe(code);
      etat[code] = { ...g, masques: [...(g.masques || []), x.id] };
      await sauver();
      fin();
    });
  };
  /* « JE CONNAIS QUELQU'UN » : ce qu'aucune app ne sait — un nom, et de
     quoi le joindre. Rien d'autre ne part. */
  const connais = () => {
    sh.setTitle('Je connais quelqu’un');
    sh.body.innerHTML =
      `<div class="field"><label for="rpNom">Son nom</label>
         <input id="rpNom" maxlength="80" ${clavier('nom')}></div>
       <div class="field"><label for="rpJoindre">Son e-mail ou son téléphone</label>
         <input id="rpJoindre" maxlength="120" ${clavier('coord')} aria-describedby="rpErr">
         <p class="hint warn" id="rpErr" hidden>Un e-mail ou un téléphone.</p></div>`;
    const nom = sh.body.querySelector('#rpNom'), joindre = sh.body.querySelector('#rpJoindre');
    /* l'erreur se dit sous le champ, et part dès qu'on le corrige */
    joindre.addEventListener('input', () => { sh.body.querySelector('#rpErr').hidden = true; joindre.removeAttribute('aria-invalid'); });
    const go = btn('Donner', 'btn-primary', async () => {
      const n = nom.value.replace(/\s+/g, ' ').trim();
      const j = joindre.value.trim();
      const email = emailPlausible(j) ? j : '';
      const tel = !email && (j.match(/\d/g) || []).length >= 8 ? j : '';
      if (!n){ nom.focus(); return; }
      if (!email && !tel){ sh.body.querySelector('#rpErr').hidden = false; joindre.setAttribute('aria-invalid', 'true'); joindre.focus(); return; }
      go.disabled = true;
      const ok = await donnerConnu(x.id, { name: n, email, phone: tel });
      go.disabled = false;
      if (ok) fin();
    }, 'share');
    go.id = 'rpGo';
    sh.setFoot([btn('Retour', 'btn-ghost', accueil, 'arrow-left'), go]);
    nom.focus();
  };
  /* FAIRE SUIVRE : à mes amis (le saut du lot 4b), ou à un autre de mes
     groupes — deux au plus, « relayée par » (décision 28) */
  const suivre = () => {
    sh.setTitle('Faire suivre');
    sh.body.innerHTML =
      `<div class="pick-list gr-rep">
         ${amisJoignables().length ? `<button class="pick" id="rpAmis"><b>${ic('users', 'ic-14')} À mes amis</b></button>` : ''}
         ${versGroupes.map(g => `<button class="pick" data-vers="${esc(g.code)}"><b>${ic('message-text', 'ic-14')} À ${esc(nomDe(g.code))}</b></button>`).join('')}
       </div>`;
    sh.setFoot([btn('Retour', 'btn-ghost', accueil, 'arrow-left')]);
    sh.body.querySelector('#rpAmis')?.addEventListener('click', async () => {
      const n = await suivreAmis(x.id);
      if (!n){ echecEnvoi(); return; }
      fin();
    });
    sh.body.querySelectorAll('[data-vers]').forEach(b => b.addEventListener('click', async () => {
      const m = relaisVersGroupe(x, moi(), prenomMoi());
      if (!m) return;
      if (!await poster(b.dataset.vers, m).catch(() => 0)){ echecEnvoi(); return; }
      etat[b.dataset.vers] = traiterMessage(groupe(b.dataset.vers), normaliserMessage(m, m.at));
      await sauver();
      bus.refresh();
      fin();
    }));
  };
  accueil();
}

/* ---------- membres, inviter, quitter ---------- */
/* l'invitation : le code pour un groupe ouvert ; pour un groupe « sur
   demande », la PORTE — les clés de boîte de ceux qui ouvrent, jamais le
   code. Tout membre peut la montrer : elle ne mène qu'à une demande. */
async function porteDe(code){
  const e = surDemande(code);
  const cles = responsables(groupe(code), e.chef).map(r => r.cle).filter(Boolean);
  /* ma propre présence n'est peut-être pas encore revenue des relais */
  if (jeSuisResponsable(code)) cles.unshift((await assurerBoite()).pub);
  const r = [...new Set(cles)];
  return r.length ? porteInvitation({ nom: nomConnu(code), porte: e.porte, responsables: r }) : '';
}
async function inviterDans(box, code, { titre = true } = {}){
  const porte = !!surDemande(code);
  const txt = porte ? await porteDe(code) : invitation({ code, nom: nomConnu(code), chef: chefDe(code) });
  if (!txt) return;
  let svg = '';
  try { svg = await makeQrSvg(txt); } catch (e) {}
  if (!box.isConnected) return;
  /* L'INVITATION SE NOMME : un QR sans un mot, posé dans un fil vide,
     ne dit pas à quoi il sert. Un libellé — celui d'une section, pas une
     phrase — et le geste qui l'envoie : au doigt la feuille de partage
     (la conversation de la classe, en un geste), au poste « Copier ».
     Dans sa propre feuille, la barre dit déjà « Inviter » : le libellé
     se tait (§4, jamais deux fois le même nom). */
  box.innerHTML =
    `${titre ? '<span class="gr-inv-t">Inviter</span>' : ''}
     ${svg ? `<div class="qr-wrap" role="img" aria-label="Le QR du groupe, à faire scanner">${svg}</div>` : ''}
     ${porte ? '' : `<p class="gr-code"><span>Code</span> <b id="grCodeAff">${esc(codeAffiche(code))}</b></p>`}`;
  box.append(boutonEnvoyer(porte
    ? `Demande à entrer dans « ${nomDe(code)} » sur OpenContact. Copie ce message, puis Ajouter › Recevoir › Texte :\n${txt}`
    : `Rejoins « ${nomDe(code)} » sur OpenContact. Copie ce message, puis Ajouter › Recevoir › Texte :\n${txt}`,
    { classe: 'btn-sm btn-contour', id: 'grCopier' }));
}
/* INVITER (audit au téléphone, 28 octobre 2026) : sa propre feuille,
   derrière une ligne de « Groupe » — l'« Inviter via un lien » de
   WhatsApp. Le QR de 240 px vivait au milieu des réglages, entre la
   liste des membres et la sortie. Ici : le QR, le code, « Envoyer », et
   chez le chef « Nouvelle invitation », qui change le code — `suivre`
   rouvre alors tout sur le nouveau. */
function ouvrirInviter(code, suivre){
  const sh = openSheet({ title: 'Inviter', icon: 'plus' });
  sh.body.innerHTML = `<h2 class="ap-nom">${esc(nomDe(code))}</h2><div class="gr-inviter" id="grInviter"></div>`;
  inviterDans(sh.body.querySelector('#grInviter'), code, { titre: false });
  if (chefDe(code) && peutRegler(code)){
    const b = btn('Nouvelle invitation', 'btn-sm', async () => {
      const nc = await nouvelleInvitation(code);
      if (!nc) return;
      sh.close();
      suivre(nc, true);
    }, 'reload');
    b.id = 'grNouvelleInv';
    sh.body.append(b);
  }
}
/* « GROUPE » (audit au téléphone, 28 octobre 2026 : « l'interface des
   paramètres des groupes, c'est n'importe quoi »). Relevé sur une classe
   de quarante-cinq : les quarante-cinq prénoms d'abord, puis les
   réglages, puis un QR de 240 px, puis « Copier », « Nouvelle
   invitation », et deux boutons rouges côte à côte — il fallait
   descendre quatre écrans pour trouver la sortie. L'ordre des « Infos du
   groupe » de WhatsApp, et rien de plus : le nom, « Inviter » (une
   ligne, sa feuille derrière), les réglages chez qui peut régler, les
   membres — huit, puis « Voir les N autres » —, et la sortie, rouge, en
   rangées, en dernier. */
const MEMBRES_VUS = 8;
/* « Groupe » ouvert : il suit le groupe EN DIRECT. Un adjoint nommé, un
   membre qui arrive ou s'en va pendant qu'on la lit se voyait seulement
   en la rouvrant — et sur un téléphone lent, le rôle qu'on venait de
   donner n'y apparaissait jamais (relevé sous charge, 28 octobre 2026) */
let membresOuvert = null;
function ouvrirMembres(code, shGroupe, o = {}){
  /* « Groupe » dans la barre, son nom en tête du contenu — le dessin de
     la fiche d'un ami (§4) */
  const sh = openSheet({ title: 'Groupe', icon: 'users',
    onClose: () => { if (membresOuvert && membresOuvert.sh === sh) membresOuvert = null; } });
  let tous = false;
  const rendre = () => {
    if (!sh.body.isConnected) return;
    const e = surDemande(code);
    const g = groupe(code);
    /* sur demande : qui ouvre la porte se lit à côté du prénom ; chez un
       responsable, la ligne d'un autre s'ouvre sur ses gestes (§6 : un
       geste lourd sur une ligne vit dans sa feuille) */
    const chef = chefDe(code);
    const resp = chef ? responsables(g, chef) : [];
    const role = de => { const r = resp.find(x => x.de === de); return r ? (r.chef ? 'chef' : 'adjoint') : ''; };
    const moiRole = jeSuisChef(code) ? 'chef' : e && e.sign && (g.adjoints || {})[moi()] ? 'adjoint' : '';
    const lignes = [...membresVus(g).filter(m => m.de !== moi()).map(m => ({ ...m, role: role(m.de) })), { de: moi(), prenom: 'Toi', role: moiRole }];
    /* huit, puis « Voir les N autres » — jamais un seul de caché */
    const vus = tous || lignes.length <= MEMBRES_VUS + 1 ? lignes : lignes.slice(0, MEMBRES_VUS);
    const r = reglagesDe(g, e ? 'demande' : 'ouvert');
    /* LES RÉGLAGES (décisions 31 à 35) : la forme des Réglages de « Moi »
       — un nom, son état, un chevron — et seulement chez qui peut régler.
       Les autres lisent ce qui les concerne là où ça sert : la durée dans
       le fil, « qui écrit » dans le pied. */
    const rangee = (id, nom, etat, dernier) => `<button class="rg-row${dernier ? ' rg-last' : ''}" id="${id}">
        <span class="rg-n">${nom}</span><span class="rg-s">${esc(etat)}</span>${ic('chevron-right', 'ic-14')}</button>`;
    const regl = peutRegler(code) ? [
      rangee('grrNom', 'Nom', nomDe(code)),
      ...(chef ? [rangee('grrEntree', 'Entrée', r.entree === 'demande' ? 'sur demande' : 'ouvert')] : []),
      rangee('grrDuree', 'Messages', DUREE_DITE[r.j], !chef),
      ...(chef ? [rangee('grrEcrire', 'Qui écrit', r.ecrire === 'resp' ? 'les responsables' : 'tout le monde', true)] : [])
    ] : [];
    sh.body.innerHTML =
      `<h2 class="ap-nom">${esc(nomDe(code))}</h2>
       <div class="pcard gr-actions">
         <button class="rg-row rg-last" id="grInviterOuvrir"><span class="rg-n">${ic('plus', 'ic-14')} Inviter</span>${ic('chevron-right', 'ic-14')}</button>
       </div>
       ${regl.length ? `<h3 class="tr-h gr-sec">Réglages</h3><div class="pcard gr-regl">${regl.join('')}</div>` : ''}
       <h3 class="tr-h gr-sec">Membres <span class="tr-n">${lignes.length}</span></h3>
       <ul class="gr-noms">${vus.map(m => {
        const nom = `<span class="gr-nom">${visageHTML(m.de, 'vz-m')}<span>${esc(m.prenom)}${m.role ? ` <span class="gr-role">${m.role}</span>` : ''}</span></span>`;
        return m.de !== moi() && gestesSur(code, m.de).length
          ? `<li><button class="gr-membre" data-membre="${esc(m.de)}">${nom}${ic('chevron-right', 'ic-14')}</button></li>`
          : `<li>${nom}</li>`;
      }).join('')}</ul>
       ${vus.length < lignes.length ? `<button class="linklike tr-more" id="grTous">${voirAutres(lignes.length - vus.length)}</button>` : ''}
       <div class="pick-list pick-sortie">
         <button class="pick pick-danger" id="grQuitter"><b>${ic('logout', 'ic-14')} Quitter le groupe</b></button>
         ${jeSuisChef(code) ? `<button class="pick pick-danger" id="grSupprimer"><b>${ic('trash', 'ic-14')} Supprimer le groupe</b></button>` : ''}
       </div>`;
    const q = id => sh.body.querySelector(id);
    q('#grQuitter').addEventListener('click', () => { sh.close(); shGroupe.close(); quitter(code); });
    q('#grSupprimer')?.addEventListener('click', () => { sh.close(); shGroupe.close(); supprimerPourTous(code); });
    q('#grTous')?.addEventListener('click', () => {
      tous = true;
      rendre();
      /* le bouton disparaît : le focus va au premier membre révélé (§6) */
      sh.body.querySelectorAll('.gr-noms li')[MEMBRES_VUS]?.querySelector('button')?.focus();
    });
    q('#grInviterOuvrir').addEventListener('click', () => ouvrirInviter(code, suivre));
    q('#grrNom')?.addEventListener('click', () => reglerNom(code, rendre));
    q('#grrEntree')?.addEventListener('click', () => reglerChoix(code, 'Entrée', [['ouvert', 'Ouvert'], ['demande', 'Sur demande']],
      r.entree, v => changerEntree(code, v, rendre).then(suivre), { ouvert: 'Qui a l’invitation entre.', demande: 'Les responsables acceptent chaque entrée.' },
      { fermer: true }));
    q('#grrDuree')?.addEventListener('click', () => reglerChoix(code, 'Messages', DUREES.map(j => [j, DUREE_DITE[j]]),
      r.j, v => publierReglages(code, { j: v }, rendre)));
    q('#grrEcrire')?.addEventListener('click', () => reglerChoix(code, 'Qui écrit', [['tous', 'Tout le monde'], ['resp', 'Les responsables']],
      r.ecrire, v => publierReglages(code, { ecrire: v }, rendre)));
    sh.body.querySelectorAll('[data-membre]').forEach(b => b.addEventListener('click', () => ouvrirMembre(code, b.dataset.membre, rendre)));
  };
  /* le groupe peut changer de code sous nos yeux (nouvelle invitation,
     passage « sur demande ») : la feuille suit le nouveau — et
     « Inviter » se rouvre par-dessus quand c'est de là qu'on venait */
  const suivre = async (nc, inviter = false) => {
    if (!nc) return false;
    if (nc === code){ rendre(); return true; }
    /* `basculer` a déjà rouvert le groupe sous son nouveau code : on
       referme cette feuille-ci et on la rouvre par-dessus, à jour */
    sh.close();
    for (let i = 0; i < 30 && !(ouvert && ouvert.code === nc); i++) await new Promise(r => setTimeout(r, 100));
    ouvrirMembres(nc, ouvert && ouvert.code === nc ? ouvert.sh : { close(){} }, { inviter });
    return true;
  };
  membresOuvert = { code, sh, rendre };
  rendre();
  if (o.inviter) ouvrirInviter(code, suivre);
}

/* ---------- les réglages (décisions 31 à 35) ----------
   Ils partent dans le groupe, d'un bloc, signés d'un responsable avec le
   code (engine/groupe.js) ; on les applique chez soi tout de suite. */
async function publierReglages(code, change, apres){
  const e = entreeDe(code);
  const g = groupe(code);
  const r = { ...reglagesDe(g, e && e.type === 'demande' ? 'demande' : 'ouvert'), nom: nomDe(code), ...change };
  const m = await reglagesMsg(e && e.chef ? e.sign : null, { de: moi(), code, nom: r.nom, j: r.j, ecrire: r.ecrire, entree: r.entree, porte: r.porte || (e && e.porte) });
  if (!await poster(code, m).catch(() => 0)){ echecEnvoi(); return false; }
  etat[code] = traiterMessage(groupe(code), { ...m, verifie: true });
  appliquerReglages(code);
  await sauver();
  bus.refresh();
  if (ouvert && ouvert.code === code) ouvert.sh.setTitle(nomDe(code));
  if (apres) apres();
  return true;
}
function reglerNom(code, apres){
  const sh = openSheet({ title: 'Nom', icon: 'pencil', focus: '#grNouveauNom' });
  sh.body.innerHTML = `<div class="field"><label for="grNouveauNom">Nom du groupe</label>
    <input id="grNouveauNom" maxlength="${NOM_MAX}" ${clavier('nom')} value="${esc(nomDe(code))}"></div>`;
  const champ = sh.body.querySelector('#grNouveauNom');
  const go = async () => {
    const nom = nomGroupe(champ.value);
    if (!nom || nom === nomDe(code)){ sh.close(); return; }
    b.disabled = true;
    if (await publierReglages(code, { nom }, apres)) sh.close();
    b.disabled = false;
  };
  const b = btn('Enregistrer', 'btn-primary', go);
  b.id = 'grNomGo';
  champ.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(); });
  sh.setFoot([b]);
}
/* un choix parmi deux ou trois : le motif du thème (`choixHTML`) — la
   rangée retenue cochée, le choix appliqué au tap ; ce qu'il change se
   lit dessous. `fermer` : un choix qui change le CODE du groupe referme sa
   feuille d'abord — tout ce qui était ouvert sur l'ancien code se rouvre
   ensuite */
function reglerChoix(code, titre, options, actuel, choisir, dit, { fermer = false } = {}){
  const sh = openSheet({ title: titre, icon: 'settings-2' });
  let v = actuel;
  const dessiner = () => {
    sh.body.innerHTML = choixHTML(options, v) + (dit && dit[v] ? `<p class="gr-etat" id="grChoixDit">${esc(dit[v])}</p>` : '');
    sh.body.querySelectorAll('[data-choix]').forEach(b => b.addEventListener('click', async () => {
      const val = options.find(([x]) => String(x) === b.dataset.choix)[0];
      if (val === v) return;
      sh.body.querySelectorAll('[data-choix]').forEach(x => { x.disabled = true; });
      if (fermer){ sh.close(); await choisir(val); return; }
      if (await choisir(val) !== false){ v = val; }
      dessiner();
    }));
  };
  dessiner();
}
/* CHANGER L'ENTRÉE. Vers « sur demande », l'ancienne invitation porte le
   code, et le code EST la clé : tant qu'il circule, n'importe qui entre.
   Le groupe change donc de code (comme quand on retire un membre), le
   nouveau part par la boîte à chacun, et la porte remplace le QR. Vers
   « ouvert », rien ne change de code : l'invitation montrera le code. */
async function changerEntree(code, entree, apres){
  const e = entreeDe(code);
  if (!e || !e.chef || !e.sign) return '';
  if (entree === 'ouvert') return await publierReglages(code, { entree: 'ouvert', porte: undefined }, apres) ? code : '';
  const porte = e.porte || nouvelId();
  await assurerBoite();
  const nouveau = await recoder(code);
  if (!nouveau) return '';
  return await publierReglages(nouveau, { entree: 'demande', porte }, apres) ? nouveau : '';
}
/* le nouveau code : à chacun des autres, par sa boîte, signé — puis on y
   passe soi-même. Rend le nouveau code, ou '' si rien n'a pu partir. */
async function recoder(code){
  const e = entreeDe(code);
  const g = groupe(code);
  const nouveau = nouveauCode();
  const rc = await recode(e.sign, { ancien: code, code: nouveau });
  const boites = membresDe(g).filter(m => m.de !== moi()).map(m => g.membres[m.de].cle).filter(Boolean);
  if (boites.length && !await envoyerRecode(boites, rc).catch(() => 0)){ echecEnvoi(); return ''; }
  basculer(code, nouveau, '');
  return nouveau;
}
/* NOUVELLE INVITATION (décision 35) : l'ancienne a trop circulé. Le
   groupe change de code ; les membres suivent sans un geste, l'ancien QR
   ne mène plus qu'à un groupe vide. Ce qu'on ne peut pas deviner se dit
   avant (§6, une porte se décide). */
async function nouvelleInvitation(code){
  const ok = await confirmSheet({ title: 'Nouvelle invitation ?', okLabel: 'Changer',
    msg: 'L’ancienne invitation ne marchera plus. Les membres restent dans le groupe.' });
  if (!ok) return '';
  return recoder(code);
}
/* SUPPRIMER POUR TOUS (décision 32) : le chef seul. Comme « Quitter » :
   rattrapable, et rien ne part avant la fin de la barre (invariant ②) */
function supprimerPourTous(code){
  const g = mesGroupes().find(x => x.code === code);
  const e = entreeDe(code);
  if (!g || !jeSuisChef(code)) return;
  const garde = etat[code];
  S.profile.groupes = mesGroupes().filter(x => x.code !== code);
  saveProfile();
  delete etat[code];
  sauver();
  /* le volet du poste ne garde pas un groupe qu'on vient de quitter */
  if (ouvert && ouvert.code === code && ouvert.dans) ouvert.sh.close();
  bus.refresh();
  let annule = false;
  const t = setTimeout(async () => {
    if (annule) return;
    poster(code, await finMsg(e.sign, { de: moi(), code })).catch(() => {});
  }, DELAI_ANNULER);
  showUndo(`${ic('check', 'ic-14')} ${esc(g.nom || 'Le groupe')} est supprimé.`, () => {
    annule = true;
    clearTimeout(t);
    S.profile.groupes = [...mesGroupes(), g].slice(0, GROUPES_MAX);
    saveProfile();
    etat[code] = garde;
    sauver();
    bus.refresh();
  });
}
/* ce qu'un responsable peut faire sur un autre membre : le nommer
   adjoint (s'il a de quoi signer), le retirer (jamais le chef — c'est
   l'ancre de toutes les signatures) */
function gestesSur(code, de){
  const e = surDemande(code);
  if (!e || !jeSuisResponsable(code)) return [];
  const g = groupe(code), v = g.membres[de];
  if (!v) return [];
  const resp = responsables(g, e.chef).find(r => r.de === de);
  const out = [];
  if (!resp && v.sign && v.cle) out.push('nommer');
  if (!(resp && resp.chef)) out.push('retirer');
  return out;
}
function ouvrirMembre(code, de, apres){
  const v = groupe(code).membres[de];
  const gestes = gestesSur(code, de);
  if (!v || !gestes.length) return;
  const sh = openSheet({ title: 'Membre', icon: 'user' });
  sh.body.innerHTML =
    `<h2 class="ap-nom am-nom">${esc(v.prenom)}</h2>
     ${gestes.includes('nommer') ? `<button class="btn btn-sm" id="grNommer" data-nommer="${esc(de)}">${ic('check', 'ic-14')} Nommer adjoint</button>` : ''}
     ${gestes.includes('retirer') ? `<div class="pick-sortie">
       <button class="btn btn-sm btn-danger" id="grRetirerMembre">${ic('trash', 'ic-14')} Retirer du groupe</button></div>` : ''}`;
  sh.body.querySelector('#grNommer')?.addEventListener('click', () => { sh.close(); nommer(code, de, apres); });
  sh.body.querySelector('#grRetirerMembre')?.addEventListener('click', () => { sh.close(); retirerMembre(code, de, apres); });
}
async function direNominations(code){
  const g = groupe(code);
  for (const [de, a] of Object.entries(g.adjoints || {})){
    if (!a.aDire || a.aDire > Date.now()) continue;
    if (!await poster(code, { t: 'adjoint', de: moi(), membre: de, sign: a.sign, cle: a.cle, sig: a.sig, at: Date.now() }).catch(() => 0)) continue;
    const h = groupe(code);
    if (h.adjoints && h.adjoints[de]){ const { aDire, ...reste } = h.adjoints[de]; etat[code] = { ...h, adjoints: { ...h.adjoints, [de]: reste } }; }
  }
  await sauver();
}
/* NOMMER UN ADJOINT : il ouvre la porte à son tour. Le geste se
   rattrape (invariant ②) : la nomination ne part qu'une fois la barre
   passée, comme un départ. */
async function nommer(code, de, apres){
  const e = surDemande(code);
  const v = groupe(code).membres[de];
  if (!e || !e.sign || !v || !v.sign || !v.cle) return;
  const m = await nomination(e.sign.priv, { de: moi(), membre: de, sign: v.sign, cle: v.cle });
  const g0 = traiterMessage(groupe(code), { ...m, verifie: true });
  /* « à dire » tant qu'elle n'est pas partie : une app fermée avant la
     fin de la barre la redira à la relève suivante */
  etat[code] = { ...g0, adjoints: { ...g0.adjoints, [de]: { ...g0.adjoints[de], aDire: m.at + DELAI_ANNULER } } };
  await sauver();
  apres();
  let annule = false;
  const t = setTimeout(() => { if (!annule) direNominations(code); }, DELAI_ANNULER);
  showUndo(`${ic('check', 'ic-14')} ${esc(v.prenom)} est adjoint.`, () => {
    annule = true;
    clearTimeout(t);
    const g = groupe(code);
    const { [de]: _, ...reste } = g.adjoints || {};
    etat[code] = { ...g, adjoints: reste };
    sauver();
    apres();
  });
}
/* ---------- RETIRER (lot 5c2) ----------
   Un message : il garde sa place, « Retiré par Inès », chez tous. Un
   membre : le groupe change de code — le nouveau part par la boîte à
   chacun des autres, signé ; celui qu'on retire garde l'ancien, qui ne
   mène plus qu'à un groupe vide. Les deux se rattrapent (« Annuler »)
   et ne partent qu'après la barre, comme un départ. */
async function retirerMessage(code, id, apres){
  const e = surDemande(code);
  if (!e || !e.sign) return;
  const at = Date.now();
  const g1 = traiterMessage(groupe(code), { t: 'retrait', de: moi(), id, at, verifie: true });
  etat[code] = { ...g1, retires: (g1.retires || []).map(r => r.id === id ? { ...r, aDire: at + DELAI_ANNULER } : r) };
  await sauver();
  apres();
  let annule = false;
  const t = setTimeout(() => { if (!annule) direRetraits(code); }, DELAI_ANNULER);
  showUndo(`${ic('check', 'ic-14')} Message retiré.`, () => {
    annule = true;
    clearTimeout(t);
    const h = groupe(code);
    etat[code] = { ...h, retires: (h.retires || []).filter(r => r.id !== id) };
    sauver();
    apres();
  });
}
async function direRetraits(code){
  const e = surDemande(code);
  if (!e || !e.sign) return;
  for (const r of groupe(code).retires || []){
    if (!r.aDire || r.aDire > Date.now()) continue;
    if (!await poster(code, await retrait(e.sign, { de: moi(), id: r.id })).catch(() => 0)) continue;
    const h = groupe(code);
    etat[code] = { ...h, retires: h.retires.map(y => { if (y.id !== r.id) return y; const { aDire, ...z } = y; return z; }) };
  }
  await sauver();
}
function retirerMembre(code, de, apres){
  const v = groupe(code).membres[de];
  if (!v) return;
  etat[code] = { ...groupe(code), aRetirer: { membre: de, quand: Date.now() + DELAI_ANNULER } };
  sauver();
  apres();
  bus.refresh();
  let annule = false;
  const t = setTimeout(() => { if (!annule) executerRetrait(code); }, DELAI_ANNULER);
  showUndo(`${ic('check', 'ic-14')} ${esc(v.prenom)} n’est plus dans le groupe.`, () => {
    annule = true;
    clearTimeout(t);
    const { aRetirer, ...h } = groupe(code);
    etat[code] = h;
    sauver();
    apres();
    bus.refresh();
  });
}
async function executerRetrait(code){
  const e = surDemande(code);
  const g = etat[code];
  if (!e || !e.sign || !g || !g.aRetirer || g.aRetirer.quand > Date.now()) return;
  const membre = g.aRetirer.membre;
  const nouveau = nouveauCode();
  const rc = await recode(e.sign, { ancien: code, code: nouveau, exclu: membre });
  /* le nouveau code : à chacun des autres, par sa boîte — jamais par le
     groupe, que celui qu'on retire lit encore */
  const boites = membresDe(g).filter(m => m.de !== moi() && m.de !== membre).map(m => g.membres[m.de].cle).filter(Boolean);
  await envoyerRecode(boites, rc).catch(() => 0);
  /* à l'ancien code, la seule chose qui se dit : qui est retiré, signé */
  await poster(code, await exclusion(e.sign, { de: moi(), membre })).catch(() => 0);
  basculer(code, nouveau, membre);
}
function basculer(ancien, nouveau, exclu){
  etat[nouveau] = migrerGroupe(groupe(ancien), exclu);
  delete etat[ancien];
  S.profile.groupes = mesGroupes().map(x => x.code === ancien ? { ...x, code: nouveau } : x);
  saveProfile();
  sauver();
  bus.refresh();
  if (ouvert && ouvert.code === ancien){ const o = ouvert; o.sh.close(); ouvrirGroupe(nouveau, o.apres, { dans: o.dans }); }
  /* l'épingle et le son coupé suivent le groupe sous son nouveau code */
  import('./conversations.js').then(m => m.renommerGroupe(ancien, nouveau)).catch(() => {});
  direPresence(nouveau);
}
/* la lettre d'un responsable : le groupe a changé de code. Elle ne vaut
   que pour un groupe où je suis, signée d'un responsable qu'il connaît */
export async function changerCode(l){
  await chargerGroupes();
  const e = mesGroupes().find(x => x.code === l.ancien && x.chef);
  if (!e || l.exclu === moi() || mesGroupes().some(x => x.code === l.code)) return;
  if (!await recodeVerifie(groupe(l.ancien), e.chef, l)) return;
  basculer(l.ancien, l.code, l.exclu);
}
const DELAI_ANNULER = 31000;
function quitter(code){
  const g = mesGroupes().find(x => x.code === code);
  if (!g) return;
  const garde = etat[code];
  S.profile.groupes = mesGroupes().filter(x => x.code !== code);
  saveProfile();
  delete etat[code];
  sauver();
  bus.refresh();
  let annule = false;
  /* le départ ne se dit qu'une fois la barre passée (invariant ②) */
  const t = setTimeout(() => {
    if (!annule) poster(code, { t: 'depart', de: moi(), at: Date.now() }).catch(() => {});
  }, DELAI_ANNULER);
  showUndo(`${ic('check', 'ic-14')} Tu as quitté ${esc(g.nom || 'le groupe')}.`, () => {
    annule = true;
    clearTimeout(t);
    S.profile.groupes = [...mesGroupes(), g].slice(0, GROUPES_MAX);
    saveProfile();
    etat[code] = garde;
    sauver();
    bus.refresh();
  });
}

/* ---------- au démarrage ---------- */
let derniere = 0;
export function demarrerGroupes(){
  chargerGroupes().then(() => {
    if (!mesGroupes().length) return;
    bus.refresh();              /* ce qui attendait depuis la dernière fois se compte tout de suite */
    releverGroupes(); derniere = Date.now();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && mesGroupes().length && Date.now() - derniere > 60000){ derniere = Date.now(); releverGroupes(); }
  });
  setInterval(() => { if (document.visibilityState === 'visible' && mesGroupes().length){ derniere = Date.now(); releverGroupes(); } }, 5 * 60000);
}
