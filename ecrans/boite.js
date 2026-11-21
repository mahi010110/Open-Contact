/* ============================================================
   OpenContact · la nouvelle interface · la boîte aux lettres
   (docs/refonte-reprendre.md §8 ; la mécanique de ui/reseau.js, reprise
   sans son interface)

   Ce qui passe d'un ami à l'autre sans être là en même temps : son
   profil (l'amitié est réciproque), ses messages, une demande
   (« quelqu'un chez Aztek ? »), le contact qu'on donne en réponse, le
   merci qui remonte. Chaque lettre est scellée pour UNE clé
   (engine/boite.js) et attend sur les relais que le téléphone de l'ami
   s'ouvre (ecrans/relais.js). Rien ne tourne chez OpenContact (§10).

   Les mêmes données que l'app actuelle (`oc_reseau_v1`, CONTRAT.md §1),
   les mêmes lettres : les deux interfaces se parlent. Ce fichier ne
   dessine rien. Il rend ce qui s'est passé, et l'écran le dit.
   ============================================================ */
import { todayISO, uid } from '../engine/utils.js';
import { normalizeContact, normalizeCompany } from '../engine/model.js';
import { kvGet, kvSet, RESEAU_KEY } from '../engine/storage.js';
import { nouvelleCle, etiquetteBoite, sceller, ouvrir, lettreDemande, lettreDon, lettreMerci, lettreAmi, normaliserLettre, empreinteProfil,
         etatVide, normaliserEtat, elaguer, peutDemander as placeLibre, traiterLettre, prenomDe,
         jetonRelais, ouvrirJeton, lettreRelais, lettreTrouve, choisirRelais, lettreEntree, lettreAdmis, lettreRecode,
         lettreAdieu, adieuAuthentique, lettreMessage, messageAuthentique, MESSAGE_JOURS, LETTRE_KIND,
         suiviDemande, pourCherche, demandesOuvertes, mercisRecents as mercisDe } from '../engine/boite.js';
import { prenomAmi, profilDonne, statutAmi, ajouterAmi, retirerAmi, nouvelIdAmi, memeEntreprise, direQuoi, direQuoiTu } from '../engine/amis.js';
import { parcoursDe } from '../engine/parcours.js';
import { pistesPour } from '../engine/requete.js';
import { phraseCritere } from '../engine/critere.js';
import { S, bus, saveData, saveProfile, logJ } from './etat.js';
import { publier, lire, ecouter, evenement } from './relais.js';

/* ce qui part dans le profil donné : jamais « Mon visage » (8.1.0) */
export function profilDonneIci(p, companies){
  const d = profilDonne(p, companies);
  delete d.visage;
  return d;
}

let etat = etatVide();
let charge = null;
export function chargerReseau(){
  return charge || (charge = kvGet(RESEAU_KEY).then(v => {
    try { etat = elaguer(normaliserEtat(JSON.parse(v || 'null'))); } catch (e) { etat = etatVide(); }
  }).catch(() => {}));
}
const sauver = () => kvSet(RESEAU_KEY, JSON.stringify(etat)).catch(() => {});
export const etatReseau = () => etat;

/* ---------- ma boîte : la clé, née au premier QR donné ---------- */
export async function assurerBoite(){
  if (S.profile.boite) return S.profile.boite;
  S.profile.boite = await nouvelleCle();
  saveProfile();
  return S.profile.boite;
}
export function assurerIdAmi(){
  if (!S.profile.amiId){ S.profile.amiId = nouvelIdAmi(); saveProfile(); }
  return S.profile.amiId;
}
export const prenomMoi = () => prenomDe(S.profile.name);
const moi = () => ({ prenom: prenomMoi(), cle: S.profile.boite && S.profile.boite.pub });
/* ceux à qui l'on peut écrire : un ami dont le QR porte une clé */
export const amisJoignables = () => (S.profile.amis || []).filter(a => a.cle);
export const amiDe = id => (S.profile.amis || []).find(a => a.id === id) || null;
const amiDeCle = cle => (S.profile.amis || []).find(a => a.cle && a.cle === cle) || null;

/* écrire à UNE clé : scellée pour elle, rangée sous son étiquette ; le
   relais peut l'oublier passé l'expiration (NIP-40). Rend combien de
   relais l'ont prise. */
async function ecrire(cleDest, lettre, exp){
  const ev = await evenement([['x', await etiquetteBoite(cleDest)], ['expiration', String(Math.floor(exp / 1000))]],
    await sceller(cleDest, lettre));
  return publier(ev);
}

/* ---------- l'amitié est RÉCIPROQUE (décision du 7 octobre 2026) ----------
   Ajouter quelqu'un lui donne mon profil. La lettre attend la fin de
   « Annuler » dans l'état : elle part même si l'app se ferme, ou au
   retour du réseau. */
const DELAI_ANNULER = 31000;
export async function donnerMonProfil(ami){
  if (!ami || !ami.cle || !prenomMoi()) return false;
  await chargerReseau();
  const b = await assurerBoite();
  assurerIdAmi();
  const l = lettreAmi({ prenom: prenomMoi(), cle: b.pub }, profilDonneIci(S.profile, S.companies));
  etat = { ...etat, envois: [...(etat.envois || []).filter(x => x.cle !== ami.cle),
                             { id: l.id, cle: ami.cle, lettre: l, quand: Date.now() + DELAI_ANNULER, exp: Date.now() + 14 * 864e5 }] };
  await sauver();
  planifierEnvois();
  return true;
}
let minuterie = null;
function planifierEnvois(){
  const quand = Math.min(...(etat.envois || []).map(x => Number(x.quand) || 0).filter(q => q > Date.now()));
  if (!Number.isFinite(quand)) return;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { renvoyer().then(sauver).then(planifierEnvois).catch(() => {}); },
                         Math.max(0, quand - Date.now()) + 200);
}
/* mon profil change (un parcours complété) : mes amis reçoivent la
   nouvelle version, sans « Annuler » — c'est ce qu'ils ont déjà, en plus
   juste. La première fois, on retient l'empreinte sans rien envoyer. */
async function profilAJour(){
  if (!prenomMoi() || !S.profile.amiId || !S.profile.boite) return;
  const donne = profilDonneIci(S.profile, S.companies);
  const emp = await empreinteProfil(donne);
  if (etat.profilEnvoye === emp) return;
  const premiere = !etat.profilEnvoye;
  etat = { ...etat, profilEnvoye: emp };
  if (premiere) return;
  const de = { prenom: prenomMoi(), cle: S.profile.boite.pub };
  const exp = Date.now() + 14 * 864e5;
  const nouveaux = amisJoignables().map(a => {
    const l = lettreAmi(de, donne, 'maj');
    return { id: l.id, cle: a.cle, lettre: l, quand: Date.now(), exp };
  });
  etat = { ...etat, envois: [...(etat.envois || []).filter(x => !(x.lettre && x.lettre.motif === 'maj')), ...nouveaux] };
}
/* retirer, des deux côtés : la lettre attend la fin de « Annuler », et
   porte la preuve que c'est bien moi */
export async function direAdieu(ami){
  if (!ami || !ami.cle || !S.profile.amiId) return false;
  await chargerReseau();
  const b = await assurerBoite();
  const l = await lettreAdieu({ ...moi(), priv: b.priv }, S.profile.amiId, ami.cle);
  etat = { ...etat, envois: [...(etat.envois || []).filter(x => x.cle !== ami.cle),
                             { id: l.id, cle: ami.cle, lettre: l, quand: Date.now() + DELAI_ANNULER, exp: Date.now() + 14 * 864e5 }] };
  await sauver();
  planifierEnvois();
  return true;
}
/* « Annuler » : ce qui n'est pas encore parti ne part pas */
export async function reprendreMonProfil(ami){
  await chargerReseau();
  etat = { ...etat, envois: (etat.envois || []).filter(x => x.cle !== (ami && ami.cle)) };
  await sauver();
}
/* une lettre qui ne doit pas se perdre entre dans la file AVANT de
   partir, et n'en sort qu'une fois partie */
async function envoyerSur(cle, lettre, exp){
  const x = { id: nouvelIdAmi().slice(0, 16), cle, lettre, quand: Date.now(), exp };
  etat = { ...etat, envois: [...(etat.envois || []), x] };
  await sauver();
  const n = await ecrire(cle, lettre, exp).catch(() => 0);
  if (n){
    etat = { ...etat, envois: (etat.envois || []).filter(y => y.id !== x.id) };
    await sauver();
  }
  return n;
}
async function renvoyer(){
  const reste = [];
  for (const x of etat.envois || []){
    if (x.exp <= Date.now()) continue;
    if ((Number(x.quand) || 0) > Date.now()){ reste.push(x); continue; }
    const n = await ecrire(x.cle, x.lettre, x.exp).catch(() => 0);
    if (!n) reste.push(x);
  }
  const encore = new Set((etat.envois || []).map(x => x.id));
  etat = { ...etat, envois: reste.filter(x => encore.has(x.id)) };
}
/* combien de MES messages attendent le réseau (le hors ligne le dit) */
export const messagesEnAttente = () => (etat.envois || []).filter(x => x.lettre && x.lettre.t === 'message').length;

/* le profil de qui m'a ajouté : il entre dans mes amis, sans aperçu —
   c'est la règle. Une mise à jour ne rajoute jamais un ami retiré. */
function recevoirAmi(l){
  const st = statutAmi(S.profile.amis, l.profil, S.profile.amiId);
  if (st !== 'nouveau' && st !== 'maj') return false;
  if (l.motif === 'maj' && st === 'nouveau') return false;
  S.profile.amis = ajouterAmi(S.profile.amis, l.profil);
  saveProfile();
  if (st === 'nouveau') logJ(`${prenomAmi(l.profil)} t’a ajouté à ses amis`);
  return true;
}
async function recevoirAdieu(l){
  if (!await adieuAuthentique(l, S.profile.boite.priv)) return false;
  const a = (S.profile.amis || []).find(x => x.id === l.ami && x.cle === l.de.cle);
  if (!a) return false;
  S.profile.amis = retirerAmi(S.profile.amis, a.id);
  saveProfile();
  logJ(`${prenomAmi(a)} et toi n’êtes plus amis`);
  return true;
}

/* ---------- les sauts : qui ne trouve rien fait suivre ---------- */
async function faireSuivre(l){
  const b = S.profile.boite;
  const cibles = choisirRelais(amisJoignables(), l, [l.de.cle, l.par && l.par.cle, b.pub]);
  if (!cibles.length) return;
  const jeton = await jetonRelais(l.cercle > 1 ? l.par.cle : l.de.cle, moi());
  const lettre = lettreRelais(l, moi(), jeton);
  const reste = [];
  for (const a of cibles) if (!await ecrire(a.cle, lettre, l.exp).catch(() => 0))
    reste.push({ id: nouvelIdAmi().slice(0, 16), cle: a.cle, lettre, quand: Date.now(), exp: l.exp });
  etat = { ...etat, recues: etat.recues.map(x => x.id === l.id ? { ...x, statut: 'transmise', vers: cibles.length } : x),
           envois: [...(etat.envois || []), ...reste] };
}
/* le premier maillon, lu par moi seul : c'est MON ami */
const nomDeCle = (cle, sinon) => { const a = amiDeCle(cle); return a ? prenomAmi(a) : sinon; };
async function premierMaillon(chaine){
  if (!chaine || !chaine.length) return '';
  const j = await ouvrirJeton(S.profile.boite.priv, chaine[0]);
  return j ? nomDeCle(j.cle, j.prenom) : '';
}
async function nommerTrouve(l){
  const par = await premierMaillon(l.chaine);
  const d = etat.demandes.find(x => x.id === l.demande);
  if (d && par) etat = { ...etat, demandes: etat.demandes.map(x => x === d ? { ...x, trouve: { ...x.trouve, par } } : x) };
}
async function nommerDon(l){
  const par = await premierMaillon(l.chaine);
  if (par) etat = { ...etat, dons: etat.dons.map(x => x.id === l.id ? { ...x, par } : x) };
}
async function remercierChaine(m){
  logJ(`Merci de ${m.de.prenom} : la demande que tu as fait suivre a trouvé quelqu’un chez ${m.entreprise.nom}`);
  if (!(m.suite || []).length) return;
  const suivant = await ouvrirJeton(S.profile.boite.priv, m.suite[0]);
  if (suivant) await ecrire(suivant.cle, lettreMerci(moi(), m, m.suite.slice(1)), Date.now() + 14 * 864e5).catch(() => 0);
}

/* UNE lettre de ma boîte, ouverte et traitée : la même à la relève et en
   direct. Rend vrai si quelque chose a changé. */
async function absorberLettre(ev){
  const b = S.profile.boite;
  if (!b) return false;
  const ctx = { companies: S.companies, moi: b.pub, amis: S.profile.amis, parcours: parcoursDe(S.profile, S.companies),
                pistesPour, sansRelais: !!(S.profile.flags && S.profile.flags.sansRelais), today: todayISO(),
                portes: (S.profile.groupes || []).filter(g => g.type === 'demande').map(g => g.porte),
                codes: (S.profile.groupes || []).map(g => g.code) };
  const l = normaliserLettre(await ouvrir(b.priv, ev.content));
  const r = traiterLettre(etat, l, ctx);
  if (r.quoi === 'recode'){ await (await import('./groupes.js')).changerCode(l).catch(() => {}); return true; }
  if (r.etat === etat) return false;
  etat = r.etat;
  if (r.quoi === 'ami') recevoirAmi(l);
  if (r.quoi === 'adieu') await recevoirAdieu(l);
  if (r.quoi === 'message') await recevoirMessage(l);
  if (r.quoi === 'merci'){
    const m = etat.mercis.at(-1);
    logJ(`Merci de ${m.de.prenom} : ${m.contact.name} (${m.entreprise.nom})`);
  }
  /* PRÉVENU TOUT DE SUITE (décision 18) : qui demande sait qu'on a
     trouvé, sans savoir qui — le contact suivra le oui */
  if (r.quoi === 'demande') await envoyerSur(l.de.cle, lettreTrouve(l), l.exp);
  if (r.quoi === 'suivre') await faireSuivre(l);
  if (r.quoi === 'trouve') await nommerTrouve(l);
  if (r.quoi === 'don') await nommerDon(l);
  if (r.quoi === 'merci-relais') await remercierChaine(etat.mercis.at(-1));
  if (r.quoi === 'admis') await (await import('./groupes.js')).entrerAdmis(l).catch(() => {});
  return true;
}
/* EN DIRECT tant qu'une conversation est ouverte. Rend de quoi arrêter. */
export async function ecouterBoite(surChange){
  await chargerReseau();
  const b = S.profile.boite;
  if (!b) return () => {};
  return ecouter({ kinds: [LETTRE_KIND], '#x': [await etiquetteBoite(b.pub)], since: Math.floor(Date.now() / 1000) - 60 },
    async ev => { if (await absorberLettre(ev)){ await sauver(); surChange(); } });
}

/* ---------- parler à un ami ----------
   Un message entre dans la file AVANT de partir : sans réseau, il reste
   « pas encore parti » et repart à la relève suivante. Il porte la
   preuve que c'est moi. */
export async function preparerMessage(ami, texte){
  await chargerReseau();
  const b = await assurerBoite();
  return lettreMessage({ ...moi(), priv: b.priv }, texte, ami.cle);
}
export const posterMessage = (ami, l) => envoyerSur(ami.cle, l, l.at + MESSAGE_JOURS * 864e5);
export const enAttente = id => (etat.envois || []).some(x => x.lettre && x.lettre.id === id);
async function recevoirMessage(l){
  if (!await messageAuthentique(l, S.profile.boite.priv)) return false;
  const a = amiDeCle(l.de.cle);
  if (!a) return false;
  await (await import('./messages.js')).ajouterRecu(a.id, l);
  return true;
}

/* ---------- relever ma boîte ----------
   À l'ouverture, au retour sur l'app, toutes les cinq minutes tant
   qu'elle est à l'écran. Une heure de marge : un relais lent ne doit
   rien faire perdre. */
let enCours = null;
export function relever(){
  if (enCours) return enCours;
  enCours = (async () => {
    await chargerReseau();
    const b = S.profile.boite;
    if (!b) return false;
    const debut = Date.now();
    await profilAJour();
    if ((etat.envois || []).length) await renvoyer();
    await renvoyerDemandes();
    const { evs, lus } = await lire({ kinds: [LETTRE_KIND], '#x': [await etiquetteBoite(b.pub)],
                                      since: Math.max(0, Math.floor(etat.depuis / 1000) - 3600) });
    let change = false;
    for (const ev of evs) if (await absorberLettre(ev)) change = true;
    /* une relève où AUCUN relais n'a répondu n'a rien appris */
    if (lus) etat.depuis = debut;
    await sauver();
    if (change) bus.refresh();
    return change;
  })().catch(() => false).finally(() => { enCours = null; });
  return enCours;
}
let derniere = 0;
export function demarrerReseau(){
  chargerReseau().then(() => {
    bus.refresh();
    relever(); derniere = Date.now();
    planifierEnvois();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - derniere > 60000){ derniere = Date.now(); relever(); }
  });
  /* le réseau revient : ce qui attendait repart tout de suite */
  addEventListener('online', () => { derniere = Date.now(); relever(); });
  setInterval(() => { if (document.visibilityState === 'visible'){ derniere = Date.now(); relever(); } }, 5 * 60000);
}

/* ============================================================
   DEMANDER — « quelqu'un chez Aztek ? », ou un métier et une ville
   ============================================================ */
const mesGroupes = () => S.profile.groupes || [];
/* la place : trois demandes ouvertes au plus (règle 7) */
export const placePourDemander = () => placeLibre(etat);
/* « Karim, Léa et BTS SIO Lille » : à qui part une demande faite depuis
   Réseau — mes amis qui ont une boîte, puis mes groupes */
export const destinataires = () => [...amisJoignables().map(prenomAmi), ...mesGroupes().map(g => g.nom || 'Groupe')];
export const quiDeListe = l => l.length > 1 ? l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1] : (l[0] || '');
/* la phrase EXACTE qui part : rien d'autre ne voyage (règle 3) */
export const phraseDemande = (prenom, quoi, cherche) => `${prenom} cherche quelqu’un ${quoi}${pourCherche(cherche)}.`;
export const quoiDe = x => x.critere ? phraseCritere(x.critere) : 'chez ' + ((x.entreprise && x.entreprise.nom) || x.name || '');

/* `cible` : une piste, ou `{ critere }`. `amis` : à qui (par défaut, tous
   ceux qui ont une boîte) ; `groupes` : vrai pour la poser aussi dans
   chaque groupe. Rend la demande notée, ou null si rien n'est parti. */
export async function demander(cible, { amis = amisJoignables(), groupes = true } = {}){
  await chargerReseau();
  const b = await assurerBoite();
  const now = Date.now();
  const crit = cible && cible.critere;
  const cherche = S.profile.recherche || '';
  const l = lettreDemande({ prenom: prenomMoi(), cle: b.pub }, crit ? { critere: crit } : cible, now, cherche);
  /* SANS RÉSEAU, elle attend, et part à son retour (`renvoyerDemandes`) :
     rien ne se perd, on peut la faire dans le métro */
  const hors = navigator.onLine === false;
  const versGroupes = groupes && mesGroupes().length > 0;
  if (hors && !amis.length && !versGroupes) return null;
  const partis = hors ? 0 : (await Promise.all(amis.map(a => ecrire(a.cle, l, l.exp).catch(() => 0)))).filter(n => n > 0).length;
  const dansGroupes = !hors && versGroupes ? await (await import('./groupes.js')).demanderAuxGroupes(l).catch(() => []) : [];
  if (!hors && !partis && !dansGroupes.length) return null;
  const dem = { id: l.id, pisteId: crit ? null : cible.id, at: now, exp: l.exp, vers: hors ? amis.length : partis };
  /* à qui elle est partie, quand ce sont des amis nommés (une demande
     faite depuis une piste, à ceux qui y sont passés) */
  if (!groupes) dem.noms = amis.map(prenomAmi).filter(Boolean).slice(0, 3);
  if (hors){
    dem.attente = { lettre: l, amis: amis.map(a => a.cle), groupes: versGroupes };
    if (versGroupes) dem.groupes = mesGroupes().map(g => g.nom || 'Groupe');
  } else if (dansGroupes.length) dem.groupes = dansGroupes;
  if (l.cherche) dem.cherche = l.cherche;
  if (crit) dem.critere = l.critere; else dem.entreprise = l.entreprise;
  etat = { ...etat, demandes: [...etat.demandes, dem] };
  await sauver();
  logJ(`Demandé à ${aQui(dem)} : quelqu’un ${quoiDe(dem)}`, crit ? undefined : cible.id);
  bus.refresh();
  return dem;
}
/* le réseau revient : les demandes qui attendaient partent, et ne sont
   « envoyées » qu'à ce moment-là */
async function renvoyerDemandes(){
  if (navigator.onLine === false || !etat.demandes.some(d => d.attente)) return false;
  let change = false;
  for (const d of etat.demandes.filter(x => x.attente && x.exp > Date.now())){
    const a = d.attente;
    const partis = (await Promise.all((a.amis || []).map(cle => ecrire(cle, a.lettre, a.lettre.exp).catch(() => 0)))).filter(n => n > 0).length;
    const dansGroupes = a.groupes && mesGroupes().length ? await (await import('./groupes.js')).demanderAuxGroupes(a.lettre).catch(() => []) : [];
    if (!partis && !dansGroupes.length) continue;
    etat = { ...etat, demandes: etat.demandes.map(x => {
      if (x.id !== d.id) return x;
      const y = { ...x, at: Date.now(), vers: partis };
      delete y.attente;
      if (dansGroupes.length) y.groupes = dansGroupes; else delete y.groupes;
      return y;
    }) };
    change = true;
  }
  if (change){ await sauver(); bus.refresh(); }
  return change;
}
/* « Karim », « 2 amis et BTS SIO Lille » */
export function aQui(d){
  if ((d.noms || []).length) return quiDeListe(d.noms);
  const amis = d.vers ? `${d.vers} ami${d.vers > 1 ? 's' : ''}` : '';
  return [amis, (d.groupes || []).join(', ')].filter(Boolean).join(' et ');
}
export const demandeDe = id => etat.demandes.find(x => x.id === id) || null;
/* toutes mes demandes ouvertes — et celles dont le contact attend
   encore qu'on le prenne —, la plus récente d'abord */
export const mesDemandes = () => etat.demandes
  .filter(d => d.exp > Date.now() || donPour(d.id))
  .slice().sort((a, b) => b.at - a.at);
export const suivi = d => suiviDemande(etat, d);
/* la demande d'une piste : ouverte, ou dont le contact attend encore
   qu'on le prenne */
export const demandeDePiste = id => etat.demandes.filter(d => d.pisteId === id)
  .find(d => d.exp > Date.now() || (donPour(d.id) || {}).statut === 'nouveau') || null;

/* ============================================================
   ON TE DONNE — le contact qui répond à ma demande
   ============================================================ */
export const donPour = demId => etat.dons.find(x => x.demande === demId && x.statut !== 'ecarte') || null;
export const donDe = id => etat.dons.find(x => x.id === id) || null;
export const donsNouveaux = () => etat.dons.filter(x => x.statut === 'nouveau');
const pisteDeDemande = id => { const d = demandeDe(id); return d && d.pisteId ? S.companies.find(c => c.id === d.pisteId) || null : null; };
/* la piste du contact : celle de la demande, sinon la mienne du même nom,
   sinon elle naîtra */
export const pisteDuDon = d => pisteDeDemande(d.demande) || S.companies.find(x => !x.closedReason && memeEntreprise(x, d.entreprise)) || null;
/* « Karim t'a donné Julie Marchand », ou qui Y EST */
export const quiDonne = d => d.par ? `${d.de.prenom}, par ${d.par}` : d.de.prenom;
export const roleDuDon = d => d.contact.role || (d.soi ? direQuoi(d.soi.quoi, d.soi.maintenant) : '');
/* « Ajouter à mes pistes » : le contact entre dans la piste (elle naît
   s'il le faut), garde qui l'a donné (`via` : le premier mail le dira),
   et la chaîne est remerciée sans un geste de plus. Rend de quoi
   défaire, pour « Annuler ». */
export async function ajouterDon(id){
  const d = donDe(id);
  if (!d || d.statut !== 'nouveau') return null;
  let piste = pisteDuDon(d), neuve = false;
  if (!piste){
    piste = normalizeCompany({ id: uid(), name: d.entreprise.nom, city: d.entreprise.ville || '', createdAt: Date.now(),
                               ...(d.entreprise.siren ? { siren: d.entreprise.siren } : {}) });
    S.companies.push(piste);
    neuve = true;
  }
  const k = d.contact;
  /* QUI ME L'A DONNÉ : le premier mail le dira (« Karim m'a conseillé de
     vous écrire »). Pas quand c'est lui qu'on présente. */
  const ct = normalizeContact({ ...k, ...(d.soi ? {} : { via: d.de.prenom, ...(d.accord ? { accord: true } : {}) }) });
  piste.contacts = [...(piste.contacts || []), ct];
  const trace = { d: todayISO(), t: `Contact donné par ${d.de.prenom} : ${k.name}` };
  (piste.history = piste.history || []).push(trace);
  piste.updatedAt = Date.now();
  saveData();
  etat = { ...etat, dons: etat.dons.map(x => x.id === d.id ? { ...x, statut: 'ajoute', piste: piste.id } : x) };
  await sauver();
  logJ(`Contact reçu de ${d.de.prenom} : ${k.name} (${piste.name})`, piste.id);
  /* la chaîne est remerciée : qui a donné, et le premier maillon */
  const b = S.profile.boite;
  if (b){
    const exp = Date.now() + 14 * 864e5;
    ecrire(d.de.cle, lettreMerci(moi(), d), exp).catch(() => {});
    if ((d.chaine || []).length) ouvrirJeton(b.priv, d.chaine[0]).then(j => j
      && ecrire(j.cle, lettreMerci(moi(), d, d.chaine.slice(1)), exp)).catch(() => {});
  }
  bus.refresh();
  return {
    piste, ct, neuve,
    async defaire(){
      if (neuve) S.companies = S.companies.filter(x => x.id !== piste.id);
      else {
        piste.contacts = (piste.contacts || []).filter(x => x.id !== ct.id);
        piste.history = (piste.history || []).filter(x => x !== trace);
      }
      saveData();
      etat = { ...etat, dons: etat.dons.map(x => x.id === d.id ? { ...x, statut: 'nouveau', piste: undefined } : x) };
      await sauver();
      bus.refresh();
    }
  };
}

/* ============================================================
   ON TE DEMANDE — et ton téléphone a trouvé quelqu'un
   ============================================================ */
export const recueDe = id => etat.recues.find(x => x.id === id) || null;
/* ce que je peux donner : moi d'abord (c'est moi qu'on cherche), puis
   mes contacts joignables */
function contactSoi(){
  const p = S.profile, nom = String(p.name || '').trim();
  const moyen = p.email ? { email: p.email } : p.phone ? { phone: p.phone } : null;
  return nom && moyen ? { name: nom, ...moyen } : null;
}
export function choixPour(r){
  const ct = (r.trouve || []).map(t => {
    const c = S.companies.find(x => x.id === t.pisteId);
    const k = c && (c.contacts || []).find(y => y.id === t.ctId);
    return k ? { c, ct: k } : null;
  }).filter(Boolean);
  return [...(r.soi && contactSoi() ? [{ soi: true, ct: contactSoi(), c: null }] : []), ...ct];
}
/* « Tom, par Karim », « Inès, dans BTS SIO Lille » */
export const parDe = r => r.par ? nomDeCle(r.par.cle, r.par.prenom) : '';
export const quiCherche = r => r.par ? `${r.de.prenom}, par ${parDe(r)},` : r.groupeNom ? `${r.de.prenom}, dans ${r.groupeNom},` : r.de.prenom;
export const ditChoix = (r, x) => x.soi ? 'tu ' + direQuoiTu(r.soi.quoi, r.soi.maintenant) : (x.ct.role || '');
/* ce que mon téléphone a trouvé pour elle : le premier choix */
export const trouvePour = r => (r && r.statut === 'a-voir' ? choixPour(r)[0] : null) || null;
export const ditTrouve = x => x.soi ? 'tu y es' : 'tu as ' + x.ct.name;
/* « ON TE DEMANDE » : ce que mon téléphone a trouvé pour la demande d'un
   ami (ou d'un ami d'ami), et qui attend ma réponse. Une demande vue dans
   un groupe se lit dans le groupe. */
export const recuesAVoir = () => etat.recues.filter(r => !r.groupe && r.statut === 'a-voir' && r.exp > Date.now() && choixPour(r).length)
  .sort((a, b) => a.exp - b.exp);
/* DONNER (ou se donner, ou présenter quelqu'un qui est d'accord) : la
   lettre part vers qui demande, jamais par un groupe */
export async function donnerRecue(id, i = 0, accord = false){
  const r = recueDe(id);
  if (!r) return false;
  const x = choixPour(r)[i];
  if (!x) return false;
  await chargerReseau();
  const b = await assurerBoite();
  const l = lettreDon({ prenom: prenomMoi(), cle: b.pub }, r, x.ct, x.soi ? { soi: r.soi } : { piste: x.c, accord });
  if (!await ecrire(r.de.cle, l, r.exp).catch(() => 0)) return false;
  etat = { ...etat, recues: etat.recues.map(y => y.id === r.id ? { ...y, statut: 'donnee', donne: x.ct.name } : y) };
  await sauver();
  logJ(`Donné à ${r.de.prenom} : ${x.ct.name} (${x.soi ? r.entreprise.nom : x.c.name})`, x.c ? x.c.id : undefined);
  bus.refresh();
  return true;
}
/* « Je connais quelqu'un » : un nom et de quoi le joindre, donnés par moi */
export async function donnerConnu(id, ct){
  const r = recueDe(id);
  if (!r) return false;
  await chargerReseau();
  const b = await assurerBoite();
  const l = lettreDon({ prenom: prenomMoi(), cle: b.pub }, r, ct, {});
  if (!await ecrire(r.de.cle, l, r.exp).catch(() => 0)) return false;
  etat = { ...etat, recues: etat.recues.map(y => y.id === r.id ? { ...y, statut: 'donnee', donne: ct.name } : y) };
  await sauver();
  logJ(`Donné à ${r.de.prenom} : ${ct.name} (${quoiDe(r).replace(/^chez /, '')})`);
  bus.refresh();
  return true;
}
/* FAIRE SUIVRE À MES AMIS : mon jeton, scellé pour qui demande ; rend à
   combien elle est partie */
export async function suivreAmis(id){
  const r = recueDe(id);
  if (!r || !S.profile.boite) return 0;
  const l = { v: 1, t: 'demande', id: r.id, de: r.de, exp: r.exp, cercle: r.cercle || 1,
              ...(r.par ? { par: r.par, chaine: r.chaine } : {}),
              ...(r.entreprise ? { entreprise: r.entreprise } : { critere: r.critere }) };
  await faireSuivre(l);
  await sauver();
  bus.refresh();
  const apres = recueDe(id);
  return apres && apres.statut === 'transmise' ? apres.vers : 0;
}
export async function masquerRecue(id){
  etat = { ...etat, recues: etat.recues.map(y => y.id === id ? { ...y, statut: 'ecartee' } : y) };
  await sauver();
  bus.refresh();
}
/* une demande vue dans un groupe : la même lettre, le même moteur — mais
   on ne la fait pas suivre tout seul (dans un groupe, chacun relaie à son
   tour). La réponse va à la boîte de qui demande. */
export async function recevoirDemandeGroupe(l, code, nomGroupe){
  await chargerReseau();
  const b = await assurerBoite();
  const ctx = { companies: S.companies, moi: b.pub, amis: S.profile.amis, parcours: parcoursDe(S.profile, S.companies),
                pistesPour, sansRelais: true, today: todayISO() };
  const r = traiterLettre(etat, l, ctx);
  if (r.etat === etat) return null;
  etat = { ...r.etat, recues: r.etat.recues.map(x => x.id === l.id ? { ...x, groupe: code, groupeNom: nomGroupe } : x) };
  await sauver();
  if (r.quoi === 'demande'){ await envoyerSur(l.de.cle, lettreTrouve(l, { groupe: true }), l.exp); bus.refresh(); }
  return r.quoi;
}
/* le merci d'un ami se lit deux jours, dans notre conversation */
export const mercisRecents = () => mercisDe(etat);

/* ============================================================
   ENTRER DANS UN GROUPE « SUR DEMANDE » (lot 5c)
   ============================================================ */
export const attentes = () => etat.attentes || [];
export const entreesPour = porte => (etat.entrees || []).filter(x => x.porte === porte && x.statut === 'attente');
export async function demanderEntree(p){
  await chargerReseau();
  const b = await assurerBoite();
  assurerIdAmi();
  const l = lettreEntree({ prenom: prenomMoi(), cle: b.pub }, p.porte, S.profile.amiId);
  const exp = Date.now() + 14 * 864e5;
  const partis = (await Promise.all(p.responsables.map(c => ecrire(c, l, exp).catch(() => 0)))).filter(n => n > 0).length;
  if (!partis) return false;
  etat = { ...etat, attentes: [...attentes().filter(a => a.porte !== p.porte), { porte: p.porte, nom: p.nom, at: Date.now() }] };
  await sauver();
  bus.refresh();
  return true;
}
export async function envoyerRecode(cles, rc){
  await chargerReseau();
  const b = await assurerBoite();
  const l = lettreRecode({ prenom: prenomMoi(), cle: b.pub }, rc);
  let partis = 0;
  for (const c of cles) if (await envoyerSur(c, l, Date.now() + 14 * 864e5)) partis++;
  return partis;
}
export async function repondreEntree(id, ouvrir_, groupe){
  const x = (etat.entrees || []).find(y => y.id === id);
  if (!x) return false;
  if (ouvrir_){
    const b = await assurerBoite();
    const l = lettreAdmis({ prenom: prenomMoi(), cle: b.pub }, groupe);
    if (!await envoyerSur(x.de.cle, l, Date.now() + 14 * 864e5)) return false;
  }
  etat = { ...etat, entrees: etat.entrees.map(y => y.id === id ? { ...y, statut: ouvrir_ ? 'admis' : 'refuse' } : y) };
  await sauver();
  bus.refresh();
  return true;
}
