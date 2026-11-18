/* ============================================================
   OpenContact · la nouvelle interface · les groupes
   (docs/refonte-reprendre.md §8 ; la mécanique de ui/groupes.js,
   reprise sans son interface)

   Une classe, une promo, un club : on s'y écrit des messages qui
   s'effacent au bout de sept jours, on s'y donne des pistes, on y
   demande quelqu'un. Tout passe par les relais, scellé par le code du
   groupe (engine/groupe.js) : chacun reçoit à sa prochaine ouverture,
   et l'aperçu passe avant toute fusion (invariant ②).

   Les mêmes données que l'app actuelle (`oc_groupes_v1`, et
   `S.profile.groupes`), les mêmes messages : les deux interfaces sont
   dans le même groupe. Ce fichier ne dessine rien ; ce qui arrive sans
   qu'on l'ait demandé (le groupe supprimé, un retrait) se dit par
   `avis.dire`, que l'écran branche.
   ============================================================ */
import { kvGet, kvSet, GROUPES_KEY } from '../engine/storage.js';
import { nouvelId, LETTRE_KIND, pourCherche } from '../engine/boite.js';
import { phraseCritere } from '../engine/critere.js';
import { sharePayload } from '../engine/exchange.js';
import { decouper, rassembler } from '../engine/portage.js';
import { GROUPES_MAX, MOT_MAX, nouveauCode, nomGroupe, invitation,
         cleGroupe, sceller, ouvrirMessage, normaliserMessage, dureeDe, groupeVide, normaliserGroupe,
         traiterMessage, elaguerGroupe, filDe, membresDe, nouveaux, presenceAredire,
         relaisVersGroupe, porteInvitation, nouvelleCleSignature, presenceSignee, presenceVerifiee,
         responsables, estResponsable, adjointVerifie, nomination, redireNomination,
         retrait, exclusion, recode, retraitVerifie, excluVerifie, recodeVerifie, migrerGroupe,
         MOT_JOURS, reglages as reglagesMsg, fin as finMsg, reglagesVerifies, finVerifiee, motPermis, reglagesDe,
         citesDe, mentionsNonLues } from '../engine/groupe.js';
import { cleFil } from '../engine/conversations.js';
import { S, bus, saveProfile } from './etat.js';
import { publier, lire, ecouter, evenement } from './relais.js';
import { assurerBoite, assurerIdAmi, recevoirDemandeGroupe, attentes, entreesPour, demanderEntree,
         envoyerRecode, prenomMoi } from './boite.js';

/* ce qui arrive sans geste de ma part, dit par l'écran */
export const avis = { dire(){}, bascule(){} };

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
export const groupe = code => etat[code] || (etat[code] = groupeVide());
const moi = () => S.profile.amiId;
export const moiId = moi;
/* le nom tel qu'on le connaît : celui de l'invitation, sinon celui
   qu'ont dit les autres — jamais un nom par défaut répété au groupe */
const nomConnu = code => { const g = mesGroupes().find(x => x.code === code); return (g && g.nom) || (etat[code] && etat[code].nom) || ''; };
export const nomDe = code => nomConnu(code) || 'Groupe';
export const entreeDe = code => mesGroupes().find(g => g.code === code);
export const surDemande = code => { const e = entreeDe(code); return e && e.type === 'demande' ? e : null; };
/* les membres qu'on montre : sans celui dont le retrait attend « Annuler » */
export const membresVus = g => membresDe(g).filter(m => !(g.aRetirer && g.aRetirer.membre === m.de));
export const jeSuisResponsable = code => { const e = surDemande(code); return !!e && !!e.sign && estResponsable(groupe(code), e.chef, e.sign.pub); };
/* LE CHEF (décision 31) : la clé de signature de qui l'a créé */
export const chefDe = code => { const e = entreeDe(code); return (e && e.chef) || ''; };
export const jeSuisChef = code => { const e = entreeDe(code); return !!(e && e.chef && e.sign && e.sign.pub === e.chef); };
export const peutRegler = code => { const e = entreeDe(code); return !!e && (!e.chef || (!!e.sign && estResponsable(groupe(code), e.chef, e.sign.pub))); };
export const reglagesIci = code => reglagesDe(groupe(code), surDemande(code) ? 'demande' : 'ouvert');
/* « qui écrit : les responsables » (décision 34) */
export const jEcris = code => !(reglagesIci(code).ecrire === 'resp' && !peutRegler(code));
export const DUREE_DITE = { 1: '24 heures', 7: '7 jours', 30: '30 jours' };
/* qui attend à la porte (je suis responsable) */
export const quiAttend = code => {
  const e = surDemande(code);
  if (!e || !jeSuisResponsable(code)) return [];
  const g = groupe(code);
  return entreesPour(e.porte).filter(x => !(g.membres || {})[x.ami]);
};
/* le rôle d'un membre, dit à côté de son prénom */
export function roleDe(code, de){
  const chef = chefDe(code);
  if (!chef) return '';
  const r = responsables(groupe(code), chef).find(x => x.de === de);
  if (r) return r.chef ? 'chef' : 'adjoint';
  if (de === moi()){
    if (jeSuisChef(code)) return 'chef';
    const e = surDemande(code);
    return e && e.sign && (groupe(code).adjoints || {})[moi()] ? 'adjoint' : '';
  }
  return '';
}

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
  let m = { t: 'membre', de: moi(), prenom: prenomMoi(), nom: nomConnu(code), at, cle: (await assurerBoite()).pub };
  const e = entreeDe(code);
  if (e && e.sign) m = await presenceSignee(e.sign.priv, { ...m, sign: e.sign.pub });
  const n = await poster(code, m).catch(() => 0);
  if (!n) return;
  etat[code] = traiterMessage({ ...g, presence: at }, m);
  const a = e && e.type === 'demande' && (g.adjoints || {})[moi()];
  if (a && a.sig) await poster(code, redireNomination(a, moi(), at)).catch(() => 0);
  await sauver();
}
/* un mot : « @Karim » nomme Karim (la mention se déduit du texte) */
export async function ecrireMot(code, texte){
  const t = String(texte || '').replace(/\s+/g, ' ').trim().slice(0, MOT_MAX);
  if (!t || !jEcris(code)) return false;
  const j = reglagesIci(code).j;
  const cite = citesDe(t, membresVus(groupe(code)), moi());
  const m = { t: 'mot', id: nouvelId(), de: moi(), prenom: prenomMoi(), texte: t, at: Date.now(),
              ...(j !== MOT_JOURS ? { j } : {}), ...(cite.length ? { cite } : {}) };
  if (!await poster(code, m).catch(() => 0)) return false;
  etat[code] = { ...traiterMessage(groupe(code), m), vu: m.at };
  await sauver();
  return true;
}

/* ---------- relever : à l'ouverture, au retour, toutes les 5 minutes ---------- */
let enCours = null;
export function releverGroupes(){
  if (enCours) return enCours;
  enCours = (async () => {
    await chargerGroupes();
    const liste = mesGroupes();
    if (!liste.length || !moi()) return false;
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
    for (const g of liste){
      const h = groupe(g.code);
      if ((h.retires || []).some(r => r.aDire)) await direRetraits(g.code);
      if (h.aRetirer && h.aRetirer.quand <= Date.now()) await executerRetrait(g.code);
    }
    await sauver();
    if (change) bus.refresh();
    return change;
  })().catch(() => false).finally(() => { enCours = null; });
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
    if (m && m.t === 'membre' && m.sign){
      if (chefDe(code)) m = await presenceVerifiee(m);
      else { const { sign, sig, ...r } = m; m = r; }
    }
    if (m && (m.t === 'adjoint' || m.t === 'retrait' || m.t === 'exclu')){ if (surDemande(code)) signes.push([code, m]); continue; }
    if (m && (m.t === 'reglages' || m.t === 'fin')){ signes.push([code, m]); continue; }
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
  for (const code of exclusDe) sortirExclu(code);
  for (const code of finis) sortirFin(code);
  /* un groupe rejoint par son code seul apprend son nom des autres */
  let appris = false;
  const liste = mesGroupes().map(g => !g.nom && etat[g.code] && etat[g.code].nom ? (appris = true, { ...g, nom: etat[g.code].nom }) : g);
  if (appris){ S.profile.groupes = liste; saveProfile(); }
  return change;
}
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
  bus.refresh();
  avis.dire(`${g.nom || 'Le groupe'} a été supprimé${par ? ' par ' + par : ''}.`);
}
function sortirExclu(code){
  const g = mesGroupes().find(x => x.code === code);
  if (!g) return;
  S.profile.groupes = mesGroupes().filter(x => x.code !== code);
  saveProfile();
  delete etat[code];
  sauver();
  bus.refresh();
  avis.dire(`Tu n’es plus dans ${g.nom || 'ce groupe'}.`);
}

/* EN DIRECT tant que la conversation est ouverte. Rend de quoi arrêter. */
export async function ecouterGroupe(code, surChange){
  const k = await cle(code);
  return ecouter({ kinds: [LETTRE_KIND], '#x': [k.etiquette], since: Math.floor(Date.now() / 1000) - 60 }, async ev => {
    if (await absorber([ev], new Map([[k.etiquette, code]]))){ await sauver(); surChange(); }
  });
}

/* ---------- la ligne d'un groupe, dans la liste des conversations ---------- */
const apercuDe = x => {
  const qui = x.de === moi() ? 'Toi' : x.prenom;
  if (x.t === 'retire') return 'Message retiré';
  if (x.t === 'demande') return `${x.de === moi() ? 'Tu cherches' : x.prenom + ' cherche'} quelqu’un ${quoiDeLettre(x.lettre)}`;
  if (x.t === 'mot') return `${qui} : ${x.texte}`;
  return `${x.de === moi() ? 'Tu as donné' : x.prenom + ' a donné'} ${x.nb} piste${x.nb > 1 ? 's' : ''}`;
};
export const quoiDeLettre = l => (l.entreprise ? 'chez ' + l.entreprise.nom : phraseCritere(l.critere)) + pourCherche(l.cherche);
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
    /* les groupes où j'ai demandé à entrer : une ligne qui ne s'ouvre pas encore */
    ...attentes().filter(a => !portes.has(a.porte)).map(a => ({
      cle: cleFil('groupe', a.porte), sorte: 'groupe', id: a.porte, nom: a.nom || 'Groupe', at: a.at || 0,
      apercu: 'en attente', n: 0, attente: true }))
  ];
}
export const groupesPlein = () => mesGroupes().length + attentes().filter(a => !mesGroupes().some(g => g.porte === a.porte)).length >= GROUPES_MAX;

/* ---------- entrer : créer, ou rejoindre ---------- */
async function entrer(g){
  assurerIdAmi();
  await chargerGroupes();
  S.profile.groupes = [...mesGroupes().filter(x => x.code !== g.code), g].slice(0, GROUPES_MAX);
  saveProfile();
  groupe(g.code);
  await direPresence(g.code);     /* sans réseau : elle repartira à la relève */
  await sauver();
  bus.refresh();
}
/* le chef, c'est la clé de signature qu'il crée ici (décision 31) */
export async function creer(nom){
  const n = nomGroupe(nom);
  if (!n || mesGroupes().length >= GROUPES_MAX) return '';
  const sign = await nouvelleCleSignature();
  const g = { code: nouveauCode(), nom: n, at: Date.now(), chef: sign.pub, sign };
  await entrer(g);
  return g.code;
}
/* ce que l'on saura AVANT d'entrer : un état, jamais une explication */
export function etatInvitation(inv){
  if (mesGroupes().some(g => g.code === inv.code)) return { dit: 'Tu es déjà dans ce groupe.', dedans: inv.code };
  if (mesGroupes().length >= GROUPES_MAX) return { dit: `Tu es déjà dans ${GROUPES_MAX} groupes.`, fini: true };
  return { dit: '' };
}
export async function rejoindre(inv){
  const e = etatInvitation(inv);
  if (e.dedans) return inv.code;
  if (e.fini) return '';
  await entrer({ code: inv.code, nom: inv.nom || (etat[inv.code] && etat[inv.code].nom) || '', at: Date.now(),
                 ...(inv.chef ? { chef: inv.chef } : {}) });
  return inv.code;
}
/* LA PORTE d'un groupe « sur demande » : on DEMANDE à entrer */
export function etatPorte(p){
  const dedans = mesGroupes().find(g => g.porte === p.porte);
  if (dedans) return { dit: 'Tu es déjà dans ce groupe.', fini: true, dedans: dedans.code };
  if (attentes().some(a => a.porte === p.porte)) return { dit: 'Ta demande est partie.', fini: true };
  if (mesGroupes().length + attentes().length >= GROUPES_MAX) return { dit: `Tu es déjà dans ${GROUPES_MAX} groupes.`, fini: true };
  return { dit: '' };
}
export const frapper = p => demanderEntree(p);
/* un responsable m'a ouvert : j'entre, avec ma clé de signature à moi */
export async function entrerAdmis(l){
  await chargerGroupes();
  if (mesGroupes().some(g => g.code === l.code) || mesGroupes().length >= GROUPES_MAX) return;
  const sign = await nouvelleCleSignature();
  await entrer({ code: l.code, nom: l.nom, at: Date.now(), type: 'demande', porte: l.porte, chef: l.chef, sign });
}
/* accepter ou refuser qui frappe à la porte */
export async function repondreAEntree(code, id, ouvrir_){
  const e = surDemande(code);
  if (!e) return false;
  const { repondreEntree } = await import('./boite.js');
  return repondreEntree(id, ouvrir_, { porte: e.porte, code, nom: nomConnu(code), chef: e.chef });
}

/* ce qui était lu : la ligne « N nouveaux » se pose après */
export function vu(code){
  if (!mesGroupes().some(g => g.code === code) || !etat[code]) return;
  etat[code] = { ...etat[code], vu: Date.now() };
  setTimeout(sauver, 0);
}
export const vuDe = code => (etat[code] && etat[code].vu) || 0;
export const filDeGroupe = code => filDe(groupe(code));

/* ---------- donner des pistes AU GROUPE ----------
   la vue communautaire, en morceaux scellés — jamais le suivi */
export async function donnerAuGroupe(code, list){
  const payload = sharePayload(list, null, prenomMoi());
  const d = await decouper(payload);
  const at = Date.now();
  const base = { t: 'part', id: nouvelId(), de: moi(), prenom: prenomMoi(), nb: list.length, n: d.n, at };
  for (let i = 0; i < d.n; i++){
    const n = await poster(code, { ...base, i, d: d.parts[i] }).catch(() => 0);
    if (!n) return false;
  }
  let g = groupe(code);
  for (let i = 0; i < d.n; i++) g = traiterMessage(g, { ...base, i, d: d.parts[i] });
  etat[code] = { ...g, vu: at };
  await sauver();
  bus.refresh();
  return true;
}
/* les pistes d'un don, rassemblées pour l'aperçu */
export async function lirePistes(code, id){
  const x = groupe(code).fil.find(y => y.id === id);
  if (!x) return null;
  try { return { obj: await rassembler(x.d), de: x.prenom }; } catch (e) { return null; }
}
export const estPris = (code, id) => (groupe(code).pris || []).includes(id);
export function marquerPris(code, id){
  const g = groupe(code);
  etat[code] = { ...g, pris: [...(g.pris || []), id] };
  sauver();
}
export function oublierPris(code, id){
  const g = groupe(code);
  etat[code] = { ...g, pris: (g.pris || []).filter(x => x !== id) };
  sauver();
}

/* ---------- la demande au groupe (lot 5b) ----------
   Tout le groupe la voit ; la réponse ne passe jamais par lui. */
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
export const estMasque = (code, id) => (groupe(code).masques || []).includes(id);
export async function masquer(code, id){
  const g = groupe(code);
  etat[code] = { ...g, masques: [...(g.masques || []), id] };
  await sauver();
  bus.refresh();
}
/* faire suivre une demande à un autre de mes groupes, « relayée par » */
export async function relayerVers(code, x){
  const m = relaisVersGroupe(x, moi(), prenomMoi());
  if (!m) return false;
  if (!await poster(code, m).catch(() => 0)) return false;
  etat[code] = traiterMessage(groupe(code), normaliserMessage(m, m.at));
  await sauver();
  bus.refresh();
  return true;
}

/* ---------- inviter ----------
   le code pour un groupe ouvert ; pour un groupe « sur demande », la
   PORTE — les clés de boîte de ceux qui ouvrent, jamais le code */
export async function invitationDe(code){
  const e = surDemande(code);
  if (!e) return { txt: invitation({ code, nom: nomConnu(code), chef: chefDe(code) }), porte: false };
  const cles_ = responsables(groupe(code), e.chef).map(r => r.cle).filter(Boolean);
  if (jeSuisResponsable(code)) cles_.unshift((await assurerBoite()).pub);
  const r = [...new Set(cles_)];
  return { txt: r.length ? porteInvitation({ nom: nomConnu(code), porte: e.porte, responsables: r }) : '', porte: true };
}

/* ---------- les réglages (décisions 31 à 35) ---------- */
export async function publierReglages(code, change){
  const e = entreeDe(code);
  const g = groupe(code);
  const r = { ...reglagesDe(g, e && e.type === 'demande' ? 'demande' : 'ouvert'), nom: nomDe(code), ...change };
  const m = await reglagesMsg(e && e.chef ? e.sign : null, { de: moi(), code, nom: r.nom, j: r.j, ecrire: r.ecrire, entree: r.entree, porte: r.porte || (e && e.porte) });
  if (!await poster(code, m).catch(() => 0)) return false;
  etat[code] = traiterMessage(groupe(code), { ...m, verifie: true });
  appliquerReglages(code);
  await sauver();
  bus.refresh();
  return true;
}
/* vers « sur demande », le groupe change de code : l'ancienne invitation
   porte le code, et le code EST la clé. Rend le code en vigueur. */
export async function changerEntree(code, entree){
  const e = entreeDe(code);
  if (!e || !e.chef || !e.sign) return '';
  if (entree === 'ouvert') return await publierReglages(code, { entree: 'ouvert', porte: undefined }) ? code : '';
  const porte = e.porte || nouvelId();
  await assurerBoite();
  const nouveau = await recoder(code);
  if (!nouveau) return '';
  return await publierReglages(nouveau, { entree: 'demande', porte }) ? nouveau : '';
}
async function recoder(code){
  const e = entreeDe(code);
  const g = groupe(code);
  const nouveau = nouveauCode();
  const rc = await recode(e.sign, { ancien: code, code: nouveau });
  const boites = membresDe(g).filter(m => m.de !== moi()).map(m => g.membres[m.de].cle).filter(Boolean);
  if (boites.length && !await envoyerRecode(boites, rc).catch(() => 0)) return '';
  basculer(code, nouveau, '');
  return nouveau;
}
/* NOUVELLE INVITATION (décision 35) : l'ancienne ne marchera plus */
export const nouvelleInvitation = code => recoder(code);

const DELAI_ANNULER = 31000;
/* chaque geste lourd se rattrape : il rend sa fonction « Annuler » */
export function quitter(code){
  const g = mesGroupes().find(x => x.code === code);
  if (!g) return null;
  const garde = etat[code];
  S.profile.groupes = mesGroupes().filter(x => x.code !== code);
  saveProfile();
  delete etat[code];
  sauver();
  bus.refresh();
  let annule = false;
  const t = setTimeout(() => { if (!annule) poster(code, { t: 'depart', de: moi(), at: Date.now() }).catch(() => {}); }, DELAI_ANNULER);
  return () => {
    annule = true;
    clearTimeout(t);
    S.profile.groupes = [...mesGroupes(), g].slice(0, GROUPES_MAX);
    saveProfile();
    etat[code] = garde;
    sauver();
  };
}
export function supprimerPourTous(code){
  const g = mesGroupes().find(x => x.code === code);
  const e = entreeDe(code);
  if (!g || !jeSuisChef(code)) return null;
  const garde = etat[code];
  S.profile.groupes = mesGroupes().filter(x => x.code !== code);
  saveProfile();
  delete etat[code];
  sauver();
  bus.refresh();
  let annule = false;
  const t = setTimeout(async () => { if (!annule) poster(code, await finMsg(e.sign, { de: moi(), code })).catch(() => {}); }, DELAI_ANNULER);
  return () => {
    annule = true;
    clearTimeout(t);
    S.profile.groupes = [...mesGroupes(), g].slice(0, GROUPES_MAX);
    saveProfile();
    etat[code] = garde;
    sauver();
  };
}
/* ce qu'un responsable peut faire sur un autre membre */
export function gestesSur(code, de){
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
export async function nommer(code, de){
  const e = surDemande(code);
  const v = groupe(code).membres[de];
  if (!e || !e.sign || !v || !v.sign || !v.cle) return null;
  const m = await nomination(e.sign.priv, { de: moi(), membre: de, sign: v.sign, cle: v.cle });
  const g0 = traiterMessage(groupe(code), { ...m, verifie: true });
  etat[code] = { ...g0, adjoints: { ...g0.adjoints, [de]: { ...g0.adjoints[de], aDire: m.at + DELAI_ANNULER } } };
  await sauver();
  bus.refresh();
  let annule = false;
  const t = setTimeout(() => { if (!annule) direNominations(code); }, DELAI_ANNULER);
  return () => {
    annule = true;
    clearTimeout(t);
    const g = groupe(code);
    const { [de]: _, ...reste } = g.adjoints || {};
    etat[code] = { ...g, adjoints: reste };
    sauver();
  };
}
/* RETIRER un message : il garde sa place, « Retiré par Inès » */
export async function retirerMessage(code, id){
  const e = surDemande(code);
  if (!e || !e.sign) return null;
  const at = Date.now();
  const g1 = traiterMessage(groupe(code), { t: 'retrait', de: moi(), id, at, verifie: true });
  etat[code] = { ...g1, retires: (g1.retires || []).map(r => r.id === id ? { ...r, aDire: at + DELAI_ANNULER } : r) };
  await sauver();
  bus.refresh();
  let annule = false;
  const t = setTimeout(() => { if (!annule) direRetraits(code); }, DELAI_ANNULER);
  return () => {
    annule = true;
    clearTimeout(t);
    const h = groupe(code);
    etat[code] = { ...h, retires: (h.retires || []).filter(r => r.id !== id) };
    sauver();
  };
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
/* RETIRER un membre : le groupe change de code, le nouveau part par la
   boîte à chacun des autres — jamais par le groupe que l'exclu lit encore */
export function retirerMembre(code, de){
  const v = groupe(code).membres[de];
  if (!v) return null;
  etat[code] = { ...groupe(code), aRetirer: { membre: de, quand: Date.now() + DELAI_ANNULER } };
  sauver();
  bus.refresh();
  let annule = false;
  const t = setTimeout(() => { if (!annule) executerRetrait(code); }, DELAI_ANNULER);
  return () => {
    annule = true;
    clearTimeout(t);
    const { aRetirer, ...h } = groupe(code);
    etat[code] = h;
    sauver();
  };
}
async function executerRetrait(code){
  const e = surDemande(code);
  const g = etat[code];
  if (!e || !e.sign || !g || !g.aRetirer || g.aRetirer.quand > Date.now()) return;
  const membre = g.aRetirer.membre;
  const nouveau = nouveauCode();
  const rc = await recode(e.sign, { ancien: code, code: nouveau, exclu: membre });
  const boites = membresDe(g).filter(m => m.de !== moi() && m.de !== membre).map(m => g.membres[m.de].cle).filter(Boolean);
  await envoyerRecode(boites, rc).catch(() => 0);
  await poster(code, await exclusion(e.sign, { de: moi(), membre })).catch(() => 0);
  basculer(code, nouveau, membre);
}
function basculer(ancien, nouveau, exclu){
  etat[nouveau] = migrerGroupe(groupe(ancien), exclu);
  delete etat[ancien];
  S.profile.groupes = mesGroupes().map(x => x.code === ancien ? { ...x, code: nouveau } : x);
  saveProfile();
  sauver();
  /* l'épingle et le son coupé suivent le groupe sous son nouveau code */
  import('./fils.js').then(m => m.renommerGroupe(ancien, nouveau)).catch(() => {});
  direPresence(nouveau);
  avis.bascule(ancien, nouveau);
  bus.refresh();
}
/* la lettre d'un responsable : le groupe a changé de code */
export async function changerCode(l){
  await chargerGroupes();
  const e = mesGroupes().find(x => x.code === l.ancien && x.chef);
  if (!e || l.exclu === moi() || mesGroupes().some(x => x.code === l.code)) return;
  if (!await recodeVerifie(groupe(l.ancien), e.chef, l)) return;
  basculer(l.ancien, l.code, l.exclu);
}

/* ---------- au démarrage ---------- */
let derniere = 0;
export function demarrerGroupes(){
  chargerGroupes().then(() => {
    if (!mesGroupes().length) return;
    bus.refresh();
    releverGroupes(); derniere = Date.now();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && mesGroupes().length && Date.now() - derniere > 60000){ derniere = Date.now(); releverGroupes(); }
  });
  addEventListener('online', () => { if (mesGroupes().length){ derniere = Date.now(); releverGroupes(); } });
  setInterval(() => { if (document.visibilityState === 'visible' && mesGroupes().length){ derniere = Date.now(); releverGroupes(); } }, 5 * 60000);
}
