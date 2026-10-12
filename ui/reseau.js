/* ============================================================
   OpenContact — interface · « Quelqu'un chez Aztek ? »
   (docs/reseau.md, lot 3 — la demande à ses amis)

   Trois moments, et chacun vit là où l'on est déjà :
   · DEMANDER — sur la fiche d'une piste, à la place du bandeau
     « Karim y est en alternance » quand personne ne peut te porter.
     La feuille montre la phrase EXACTE qui part, et à qui ;
   · ON TE DEMANDE — dans « Aujourd'hui », tranche « Tes amis », et
     seulement si ton téléphone a trouvé quelqu'un chez cette
     entreprise dans tes pistes (règle 6 : rien ne s'affiche chez qui
     ne trouve rien). Tu vois ce que tu donnerais avant de le donner ;
   · ON TE DONNE — dans la même tranche, et sur la fiche : le contact
     arrive par un aperçu, « Ajouter à la piste », puis « Annuler ».
     Ton ami est remercié tout seul.

   Le transport est une boîte aux lettres sur les relais publics,
   chiffrée pour un seul destinataire (engine/boite.js) : la lettre
   attend que le téléphone de l'ami s'ouvre. Rien ne tourne chez
   OpenContact (§10).
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { normalizeContact, normalizeCompany } from '../engine/model.js';
import { uid } from '../engine/utils.js';
import { RELAIS_DEFAUT } from '../engine/transport.js';
import { kvGet, kvSet, RELAYS_KEY, RESEAU_KEY } from '../engine/storage.js';
import { nouvelleCle, etiquetteBoite, sceller, ouvrir, lettreDemande, lettreDon, lettreMerci, lettreAmi, normaliserLettre, empreinteProfil,
         etatVide, normaliserEtat, elaguer, peutDemander, demandeDePiste, traiterLettre, prenomDe,
         jetonRelais, ouvrirJeton, lettreRelais, lettreTrouve, choisirRelais, lettreEntree, lettreAdmis, lettreRecode,
         LETTRE_KIND } from '../engine/boite.js';
import { prenomAmi, profilDonne, statutAmi, ajouterAmi, nouvelIdAmi, memeEntreprise, direQuoi, direQuoiTu } from '../engine/amis.js';
import { parcoursDe } from '../engine/parcours.js';
import { pistesPour } from '../engine/requete.js';
import { phraseCritere } from '../engine/critere.js';
import { S, bus, saveData, saveProfile, logJ } from './state.js';
import { openSheet, toast, btn, ic, showUndo } from './dom.js';
import { frDate } from './dates.js';

let etat = etatVide();
let charge = null;
const lib = () => import('../assets/vendor/trystero-nostr.min.js');

export function chargerReseau(){
  return charge || (charge = kvGet(RESEAU_KEY).then(v => {
    try { etat = elaguer(normaliserEtat(JSON.parse(v || 'null'))); } catch (e) { etat = etatVide(); }
  }).catch(() => {}));
}
const sauver = () => kvSet(RESEAU_KEY, JSON.stringify(etat)).catch(() => {});

/* ---------- ma boîte : la clé, née au premier « Mon QR » ---------- */
export async function assurerBoite(){
  if (S.profile.boite) return S.profile.boite;
  S.profile.boite = await nouvelleCle();
  saveProfile();
  return S.profile.boite;
}
const moi = () => ({ prenom: prenomDe(S.profile.name), cle: S.profile.boite && S.profile.boite.pub });
/* ceux à qui l'on peut écrire : un ami dont le QR porte une clé (6.55+) */
export const amisJoignables = () => (S.profile.amis || []).filter(a => a.cle);

/* ---------- les relais : les mêmes que tout le reste ---------- */
async function relais(){
  try {
    const urls = JSON.parse(await kvGet(RELAYS_KEY) || 'null');
    if (Array.isArray(urls) && urls.length) return urls;
  } catch (e) {}
  return RELAIS_DEFAUT;
}
function connexion(url, ms = 8000){
  return new Promise(res => {
    let ws;
    const t = setTimeout(() => { try { ws && ws.close(); } catch (e) {} res(null); }, ms);
    try { ws = new WebSocket(url); } catch (e) { clearTimeout(t); res(null); return; }
    ws.onerror = () => {};
    ws.onopen = () => { clearTimeout(t); res(ws); };
  });
}
/* une lettre part sur chaque relais ; elle est partie si UN l'a prise
   (`OK true` — la seule preuve qu'un relais garde, §8) */
export async function publier(ev){
  const urls = await relais();
  const oks = await Promise.all(urls.map(async url => {
    const ws = await connexion(url);
    if (!ws) return false;
    return new Promise(res => {
      const t = setTimeout(() => { try { ws.close(); } catch (e) {} res(false); }, 6000);
      ws.onmessage = m => {
        let d; try { d = JSON.parse(m.data); } catch (e) { return; }
        if (d[0] === 'OK' && d[1] === ev.id){ clearTimeout(t); try { ws.close(); } catch (e) {} res(d[2] === true); }
      };
      ws.send(JSON.stringify(['EVENT', ev]));
    });
  }));
  return oks.filter(Boolean).length;
}
/* `lus` : combien de relais ont répondu jusqu'au bout. Zéro, et la relève
   n'a rien appris : on ne la compte pas comme faite. */
export async function lire(filtre){
  const urls = await relais();
  const vus = new Map();
  let lus = 0;
  await Promise.all(urls.map(async url => {
    const ws = await connexion(url);
    if (!ws) return;
    await new Promise(res => {
      const t = setTimeout(() => { try { ws.close(); } catch (e) {} res(); }, 8000);
      ws.onmessage = m => {
        let d; try { d = JSON.parse(m.data); } catch (e) { return; }
        if (d[0] === 'EVENT' && d[1] === 'boite' && d[2] && d[2].id) vus.set(d[2].id, d[2]);
        if (d[0] === 'EOSE' && d[1] === 'boite'){ lus++; clearTimeout(t); try { ws.close(); } catch (e) {} res(); }
      };
      ws.send(JSON.stringify(['REQ', 'boite', filtre]));
    });
  }));
  return { evs: [...vus.values()], lus };
}
/* l'échec d'un envoi, le même partout : rien n'est parti, et le seul
   geste qui le répare est de retrouver du réseau */
export const echecEnvoi = () => toast('Envoi impossible — vérifie ta connexion.');
/* ÉCOUTER tant qu'une feuille est ouverte (les groupes, lot 5) : un
   abonnement qui reste ouvert sur chaque relais, et qui rend chaque
   événement nouveau dès qu'il passe. Rend de quoi l'arrêter. Un relais
   qui tombe se tait — la relève suivante rattrape ce qu'il a manqué. */
export function ecouter(filtre, surEvenement){
  const ouverts = [];
  let fini = false;
  const vus = new Set();
  relais().then(urls => urls.forEach(async url => {
    const ws = await connexion(url);
    if (!ws) return;
    if (fini){ try { ws.close(); } catch (e) {} return; }
    ouverts.push(ws);
    ws.onmessage = m => {
      let d; try { d = JSON.parse(m.data); } catch (e) { return; }
      if (d[0] === 'EVENT' && d[1] === 'ecoute' && d[2] && d[2].id && !vus.has(d[2].id)){
        vus.add(d[2].id);
        surEvenement(d[2]);
      }
    };
    ws.send(JSON.stringify(['REQ', 'ecoute', filtre]));
  }));
  return () => { fini = true; ouverts.forEach(ws => { try { ws.close(); } catch (e) {} }); };
}
/* un événement signé, prêt à publier : l'étiquette, l'expiration, le scellé */
export async function evenement(tags, contenu){
  const { relayTopic } = await lib();
  return relayTopic.evenement(LETTRE_KIND, tags, contenu);
}
/* écrire à UNE clé : scellée pour elle, rangée sous son étiquette,
   et le relais peut l'oublier passé l'expiration (NIP-40) */
async function ecrire(cleDest, lettre, exp){
  const { relayTopic } = await lib();
  const ev = await relayTopic.evenement(LETTRE_KIND,
    [['x', await etiquetteBoite(cleDest)], ['expiration', String(Math.floor(exp / 1000))]],
    await sceller(cleDest, lettre));
  return publier(ev);
}

/* ---------- l'amitié est RÉCIPROQUE (décision du 7 octobre 2026) ----------
   Ajouter quelqu'un lui donne ton profil, obligatoirement : Inès scanne
   le QR de Karim, Karim reçoit le sien sans un geste — un seul scan
   suffit. Ce qui part est exactement ce que porterait son QR (OCA1).
   La lettre ne part pas tout de suite : elle attend que la barre
   « Annuler » soit passée (invariant ②), dans l'état — donc aussi si
   l'app se ferme entre-temps, ou s'il n'y a pas de réseau : elle repart
   à la relève suivante. « Obligatoirement » ne dépend ni du réseau de
   l'instant, ni d'une app restée ouverte. */
const DELAI_ANNULER = 31000;
export async function donnerMonProfil(ami){
  if (!ami || !ami.cle || !String(S.profile.name || '').trim()) return false;
  await chargerReseau();
  const b = await assurerBoite();
  if (!S.profile.amiId){ S.profile.amiId = nouvelIdAmi(); saveProfile(); }
  const l = lettreAmi({ prenom: prenomDe(S.profile.name), cle: b.pub }, profilDonne(S.profile, S.companies));
  const quand = Date.now() + DELAI_ANNULER;
  etat = { ...etat, envois: [...(etat.envois || []).filter(x => x.cle !== ami.cle),
                             { id: l.id, cle: ami.cle, lettre: l, quand, exp: Date.now() + 14 * 864e5 }] };
  await sauver();
  planifierEnvois();
  return true;
}
/* une lettre qui attend la fin de « Annuler » part À SON HEURE — même si
   l'app a été rechargée entre-temps : sans ça, elle attendait la relève
   suivante, cinq minutes plus tard (mesuré dans e2e-demande.mjs) */
let minuterie = null;
function planifierEnvois(){
  /* seulement ce qui attend ENCORE « Annuler » : une lettre déjà due qui
     n'est pas partie (pas de réseau) repart à la relève suivante, pas
     dans une boucle qui tournerait hors ligne */
  const quand = Math.min(...(etat.envois || []).map(x => Number(x.quand) || 0).filter(q => q > Date.now()));
  if (!Number.isFinite(quand)) return;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => { renvoyer().then(sauver).then(planifierEnvois).catch(() => {}); },
                         Math.max(0, quand - Date.now()) + 200);
}
/* LES PROFILS RESTENT À JOUR TOUT SEULS (lot 4) : à chaque relève, si
   mon profil donné a changé depuis la dernière fois — un parcours
   complété, une alternance qui commence —, mes amis reçoivent la
   nouvelle version. Pas de « Annuler » ici : rien n'est ajouté chez eux,
   c'est ce qu'ils ont déjà, en plus juste. La première fois, on retient
   l'empreinte sans rien envoyer : ils viennent de recevoir ce profil. */
async function profilAJour(){
  if (!String(S.profile.name || '').trim() || !S.profile.amiId || !S.profile.boite) return;
  const donne = profilDonne(S.profile, S.companies);
  const emp = await empreinteProfil(donne);
  if (etat.profilEnvoye === emp) return;
  const premiere = !etat.profilEnvoye;
  etat = { ...etat, profilEnvoye: emp };
  if (premiere) return;
  const de = { prenom: prenomDe(S.profile.name), cle: S.profile.boite.pub };
  const exp = Date.now() + 14 * 864e5;
  const nouveaux = amisJoignables().map(a => {
    const l = lettreAmi(de, donne, 'maj');
    return { id: l.id, cle: a.cle, lettre: l, quand: Date.now(), exp };
  });
  etat = { ...etat, envois: [...(etat.envois || []).filter(x => !(x.lettre && x.lettre.motif === 'maj')), ...nouveaux] };
}
/* « Annuler » : ce qui n'est pas encore parti ne part pas */
export async function reprendreMonProfil(ami){
  await chargerReseau();
  etat = { ...etat, envois: (etat.envois || []).filter(x => x.cle !== (ami && ami.cle)) };
  await sauver();
}
/* UNE LETTRE QUI NE DOIT PAS SE PERDRE (« trouvé ») : elle entre dans la
   file AVANT de partir et n'en sort qu'une fois partie. Une app fermée
   au mauvais instant — juste après avoir noté la demande, avant d'avoir
   écrit — la renvoie à la relève suivante ; sans ça, la demande étant
   déjà notée, personne ne la réécrivait jamais (e2e-groupe-demande). */
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
    if ((Number(x.quand) || 0) > Date.now()){ reste.push(x); continue; }   /* « Annuler » est encore là */
    const n = await ecrire(x.cle, x.lettre, x.exp).catch(() => 0);
    if (!n) reste.push(x);
  }
  /* entre-temps, un « Annuler » a pu retirer une lettre : on ne la remet pas */
  const encore = new Set((etat.envois || []).map(x => x.id));
  etat = { ...etat, envois: reste.filter(x => encore.has(x.id)) };
}
/* le profil de qui m'a ajouté : il entre dans mes amis, sans aperçu —
   c'est la règle, pas une proposition. Déjà là et pareil : rien. Une
   MISE À JOUR ne vaut que pour quelqu'un qui est déjà là : elle ne
   rajoute jamais un ami qu'on a retiré. */
function recevoirAmi(l){
  const st = statutAmi(S.profile.amis, l.profil, S.profile.amiId);
  if (st !== 'nouveau' && st !== 'maj') return false;
  if (l.motif === 'maj' && st === 'nouveau') return false;
  S.profile.amis = ajouterAmi(S.profile.amis, l.profil);
  saveProfile();
  if (st === 'nouveau'){
    const p = prenomAmi(l.profil);
    logJ(`${p} t’a ajouté à ses amis`);
    toast(`${p} est dans tes amis.`);
  }
  return true;
}

/* ---------- les sauts (lot 4b) ----------
   Rien ne s'affiche chez qui ne trouve rien (règle 6) : son téléphone
   fait SUIVRE la demande à ses amis — d'abord ceux dont le parcours
   touche l'entreprise —, avec son jeton scellé pour le maillon d'avant.
   Ce qui n'a pas pu partir repart à la relève suivante. */
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
/* le premier maillon, lu par moi seul : c'est MON ami, je le nomme
   comme je le connais */
const nomDeCle = (cle, sinon) => { const a = (S.profile.amis || []).find(x => x.cle === cle); return a ? prenomAmi(a) : sinon; };
async function premierMaillon(chaine){
  if (!chaine || !chaine.length) return '';
  const j = await ouvrirJeton(S.profile.boite.priv, chaine[0]);
  return j ? nomDeCle(j.cle, j.prenom) : '';
}
async function nommerTrouve(l){
  const par = await premierMaillon(l.chaine);
  const d = etat.demandes.find(x => x.id === l.demande);
  if (d && par) etat = { ...etat, demandes: etat.demandes.map(x => x === d ? { ...x, trouve: { ...x.trouve, par } } : x) };
  const quoi = d ? (d.entreprise && d.entreprise.nom ? 'chez ' + d.entreprise.nom : phraseCritere(d.critere)) : '';
  /* le résultat vient d'un autre téléphone : il se dit (§6, ②) */
  toast(`${par ? 'Un ami de ' + par : 'Un ami'} a trouvé quelqu’un ${quoi}.`);
}
async function nommerDon(l){
  const par = await premierMaillon(l.chaine);
  if (par) etat = { ...etat, dons: etat.dons.map(x => x.id === l.id ? { ...x, par } : x) };
}
/* le merci REMONTE : je le dis, puis je le passe au maillon suivant —
   lui seul ouvre son jeton */
async function remercierChaine(m){
  toast(`${m.de.prenom} te dit merci : quelqu’un a été trouvé chez ${m.entreprise.nom}, grâce à toi.`);
  logJ(`Merci de ${m.de.prenom} : la demande que tu as fait suivre a trouvé quelqu’un chez ${m.entreprise.nom}`);
  if (!(m.suite || []).length) return;
  const suivant = await ouvrirJeton(S.profile.boite.priv, m.suite[0]);
  if (suivant) await ecrire(suivant.cle, lettreMerci(moi(), m, m.suite.slice(1)), Date.now() + 14 * 864e5).catch(() => 0);
}

/* ---------- relever ma boîte ----------
   À l'ouverture, au retour sur l'app, et toutes les cinq minutes tant
   qu'elle est à l'écran. Une heure de marge sur la dernière relève :
   un relais lent ne doit rien faire perdre. */
let enCours = null;
export function relever(){
  if (enCours) return enCours;
  enCours = (async () => {
    await chargerReseau();
    const b = S.profile.boite;
    if (!b) return;
    const debut = Date.now();
    await profilAJour();
    if ((etat.envois || []).length) await renvoyer();
    const { evs, lus } = await lire({ kinds: [LETTRE_KIND], '#x': [await etiquetteBoite(b.pub)],
                                      since: Math.max(0, Math.floor(etat.depuis / 1000) - 3600) });
    let change = false;
    const ctx = { companies: S.companies, moi: b.pub, amis: S.profile.amis, parcours: parcoursDe(S.profile, S.companies),
                  pistesPour, sansRelais: !!(S.profile.flags && S.profile.flags.sansRelais), today: todayISO(),
                  portes: (S.profile.groupes || []).filter(g => g.type === 'demande').map(g => g.porte),
                  codes: (S.profile.groupes || []).map(g => g.code) };
    for (const ev of evs){
      const l = normaliserLettre(await ouvrir(b.priv, ev.content));
      const r = traiterLettre(etat, l, ctx);
      /* le groupe a changé de code (lot 5c2) : rien ne change dans la
         boîte, tout se passe dans le groupe — la lettre ne doit donc pas
         être sautée comme « rien de neuf » */
      if (r.quoi === 'recode'){ await (await import('./groupes.js')).changerCode(l).catch(() => {}); continue; }
      if (r.etat === etat) continue;
      etat = r.etat;
      change = true;
      if (r.quoi === 'ami') recevoirAmi(l);
      if (r.quoi === 'merci'){
        const m = etat.mercis.at(-1);
        logJ(`Merci de ${m.de.prenom} : ${m.contact.name} (${m.entreprise.nom})`);
        toast(`${m.de.prenom} te dit merci pour ${m.contact.name}.`);
      }
      /* PRÉVENU TOUT DE SUITE (décision 18) : qui demande sait qu'on a
         trouvé, sans savoir qui — le contact suivra le oui */
      if (r.quoi === 'demande') await envoyerSur(l.de.cle, lettreTrouve(l), l.exp);
      if (r.quoi === 'suivre') await faireSuivre(l);
      if (r.quoi === 'trouve') await nommerTrouve(l);
      if (r.quoi === 'don') await nommerDon(l);
      if (r.quoi === 'merci-relais') await remercierChaine(etat.mercis.at(-1));
      /* on m'a ouvert la porte d'un groupe « sur demande » (lot 5c) */
      if (r.quoi === 'admis') await (await import('./groupes.js')).entrerAdmis(l).catch(() => {});
    }
    /* une relève où AUCUN relais n'a répondu n'a rien appris : la compter
       ferait sauter, au retour du réseau, les lettres arrivées entre-temps */
    if (lus) etat.depuis = debut;
    await sauver();
    if (change) bus.refresh();
  })().catch(() => {}).finally(() => { enCours = null; });
  return enCours;
}
let derniere = 0;
export function demarrerReseau(){
  chargerReseau().then(() => {
    if (etat.demandes.length || etat.recues.length || etat.dons.length || etat.entrees.length || etat.attentes.length) bus.refresh();
    relever(); derniere = Date.now();
    planifierEnvois();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - derniere > 60000){ derniere = Date.now(); relever(); }
  });
  setInterval(() => { if (document.visibilityState === 'visible'){ derniere = Date.now(); relever(); } }, 5 * 60000);
}

/* ---------- ce que la fiche et « Aujourd'hui » lisent ---------- */
const pisteDeDemande = id => {
  const d = etat.demandes.find(x => x.id === id);
  return d ? S.companies.find(c => c.id === d.pisteId) || null : null;
};
export function reseauDePiste(c){
  const d = demandeDePiste(etat, c.id);
  const don = etat.dons.find(x => x.statut === 'nouveau' && pisteDeDemande(x.demande) === c) || null;
  return { demande: d, don, peut: !d && peutDemanderAmis() };
}
/* « Tes amis » : ce qu'on te demande (et que tu as), ce qu'on t'a donné.
   Une ligne = la piste (l'attribut distinctif, §6), la raison en accent,
   puis le contact en jeu. */
const contactsTrouves = r => r.trouve.map(t => {
  const c = S.companies.find(x => x.id === t.pisteId);
  const ct = c && (c.contacts || []).find(y => y.id === t.ctId);
  return ct ? { c, ct } : null;
}).filter(Boolean);
/* « j'y suis » : c'est MOI le contact — mon nom, et de quoi me joindre
   (l'e-mail du profil, sinon son téléphone) ; sans rien, je ne peux pas
   être donné */
function contactSoi(){
  const p = S.profile, nom = String(p.name || '').trim();
  const moyen = p.email ? { email: p.email } : p.phone ? { phone: p.phone } : null;
  return nom && moyen ? { name: nom, ...moyen } : null;
}
/* ce que je pourrais donner : moi d'abord (c'est moi qu'on cherche),
   puis mes contacts */
const choixPour = r => [...(r.soi && contactSoi() ? [{ soi: true, ct: contactSoi(), c: null }] : []), ...contactsTrouves(r)];
const parDe = r => r.par ? nomDeCle(r.par.cle, r.par.prenom) : '';
const quiCherche = r => r.par ? `${r.de.prenom}, par ${parDe(r)}, cherche quelqu’un`
  : r.groupeNom ? `${r.de.prenom}, dans ${r.groupeNom}, cherche quelqu’un` : `${r.de.prenom} cherche quelqu’un`;
const quiDonne = d => d.par ? `${d.de.prenom}, par ${d.par}, t’a donné` : `${d.de.prenom} t’a donné`;
export function lignesAmis(){
  const out = [];
  for (const r of etat.recues){
    if (r.statut !== 'a-voir' || r.exp <= Date.now()) continue;
    const [x] = choixPour(r);
    if (!x) continue;
    out.push({ sorte: 'demande', id: r.id, nom: x.soi ? r.entreprise.nom : x.c.name, raison: quiCherche(r),
               qui: x.soi ? 'tu ' + direQuoiTu(r.soi.quoi, r.soi.maintenant) : 'tu as ' + x.ct.name });
  }
  for (const d of etat.dons){
    if (d.statut !== 'nouveau') continue;
    const c = pisteDeDemande(d.demande);
    /* « j'y suis » se dit comme sur la fiche : qui Y EST, par qui */
    out.push({ sorte: 'don', id: d.id, nom: c ? c.name : d.entreprise.nom,
               raison: d.soi ? `${d.contact.name} ${direQuoi(d.soi.quoi, d.soi.maintenant)}` : quiDonne(d),
               qui: d.soi ? (d.par ? 'par ' + d.par : '') : d.contact.name });
  }
  return out;
}
export function ouvrirLigne(sorte, id){
  if (sorte === 'demande'){ const r = etat.recues.find(x => x.id === id); if (r) ouvrirRecue(r); }
  else { const d = etat.dons.find(x => x.id === id); if (d) ouvrirDon(d); }
}

/* ---------- DEMANDER ---------- */
/* `c` : une piste, ou `{ critere }` — un métier et une ville de la table
   (décision 19) */
export function ouvrirDemander(c, apres){
  const amis = amisJoignables();
  const groupes = mesGroupes();
  const sh = openSheet({ title: libelleDemander(), icon: 'users' });
  const prenom = prenomDe(S.profile.name);
  const crit = c && c.critere;
  const quoi = crit ? phraseCritere(crit) : 'chez ' + c.name;
  /* LA PHRASE QUI PART, mot pour mot, et à qui. Rien d'autre ne voyage :
     ni ta piste, ni tes notes, ni où tu en es (règle 3). Et elle va plus
     loin que tes amis s'ils ne connaissent personne : ça se dit AVANT */
  sh.body.innerHTML =
    `<div class="gr-mot" id="dmMot">${esc(prenom)} cherche quelqu’un ${esc(quoi)}.</div>
     <p class="dm-qui" id="dmQui">${ic('users', 'ic-14')} ${esc([
       ...(amis.length ? [amis.map(prenomAmi).join(' · ') + ', puis leurs amis'] : []),
       ...groupes.map(g => g.nom || 'Groupe')].join(' · '))}</p>`;
  const go = btn('Demander', 'btn-primary', async () => {
    go.disabled = true;
    await chargerReseau();
    const b = await assurerBoite();
    const now = Date.now();
    const l = lettreDemande({ prenom, cle: b.pub }, crit ? { critere: crit } : c, now);
    const partis = (await Promise.all(amis.map(a => ecrire(a.cle, l, l.exp).catch(() => 0)))).filter(n => n > 0).length;
    /* et dans chaque groupe, que tout le groupe la voie (décision 20) */
    const dansGroupes = groupes.length ? await (await import('./groupes.js')).demanderAuxGroupes(l).catch(() => []) : [];
    if (!partis && !dansGroupes.length){
      go.disabled = false;
      echecEnvoi();
      return;
    }
    const dem = { id: l.id, pisteId: crit ? null : c.id, at: now, exp: l.exp, vers: partis };
    if (dansGroupes.length) dem.groupes = dansGroupes;
    if (crit) dem.critere = l.critere; else dem.entreprise = l.entreprise;
    etat = { ...etat, demandes: [...etat.demandes, dem] };
    await sauver();
    logJ(`Demandé à ${aQui(dem)} : quelqu’un ${quoi}`, crit ? undefined : c.id);
    sh.close();
    if (apres) apres();
    bus.refresh();
  }, 'users');
  go.id = 'dmGo';
  sh.setFoot([go]);
}
/* l'état d'une demande en cours, sur la fiche : un fait, pas un bouton */
export function demandeEnCoursHTML(d){
  /* quelqu'un a trouvé : on le sait avant son oui (décision 18) */
  if (d.trouve)
    return `<p class="fi-demande fi-trouve" id="fiDemande">${ic('check', 'ic-14')} Trouvé ${d.trouve.groupe ? 'dans un groupe'
      : 'chez un ami' + (d.trouve.par ? ' de ' + esc(d.trouve.par) : '')} · en attente</p>`;
  const j = new Date(d.at).toISOString().slice(0, 10);
  const quand = j === todayISO() ? 'aujourd’hui' : frDate(j);
  return `<p class="fi-demande" id="fiDemande">${ic('clock', 'ic-14')} Demandé à ${esc(aQui(d))} · ${quand}</p>`;
}
/* « 2 amis », « BTS SIO Lille », « 2 amis et BTS SIO Lille » */
function aQui(d){
  const amis = d.vers ? `${d.vers} ami${d.vers > 1 ? 's' : ''}` : '';
  const gr = (d.groupes || []).join(', ');
  return [amis, gr].filter(Boolean).join(' et ');
}
/* les demandes par métier et ville : elles n'ont pas de fiche, elles se
   lisent dans « Amis », là où on les a faites */
export const demandesCritere = () => etat.demandes.filter(d => d.critere && d.exp > Date.now());
/* À QUI L'ON PEUT DEMANDER : ses amis qui ont une boîte, et ses groupes
   (lot 5b, décision 20 — tout le groupe voit la demande) */
const mesGroupes = () => S.profile.groupes || [];
export const peutDemanderAmis = () => peutDemander(etat) && (amisJoignables().length > 0 || mesGroupes().length > 0)
  && !!String(S.profile.name || '').trim();
/* le geste dit à qui il demande — « mes amis » quand il y en a, sinon
   le groupe : un mot juste, pas une catégorie de plus */
export const libelleDemander = () => amisJoignables().length ? 'Demander à mes amis'
  : mesGroupes().length > 1 ? 'Demander à mes groupes' : 'Demander à mon groupe';
export const phraseDemande = d => phraseCritere(d.critere);

/* ---------- ON TE DEMANDE ---------- */
/* un contact tel qu'il partirait — ou tel qu'il arrive : le nom, puis
   de quoi le joindre. La même forme des deux côtés de l'échange. */
const contactHTML = (k, id) =>
  `<div class="obj"><div class="obj-m"><span class="obj-n" id="${id}">${esc(k.name)}</span>
     <div class="obj-s">${[k.role, k.email, k.phone, k.link].filter(Boolean)
       .map(v => `<span class="obj-l">${esc(v)}</span>`).join('')}</div></div></div>`;
function ouvrirRecue(r){
  const choix = choixPour(r);
  if (!choix.length) return;
  const sh = openSheet({ title: `${r.de.prenom} cherche quelqu’un`, icon: 'users' });
  /* CE QUE TU DONNERAIS, en entier — le contact, rien de ton suivi.
     Un seul choix (le cas courant) n'est pas un choix : il se lit, et le
     geste tient le pied. Plusieurs : on en choisit un. « J'y suis »
     passe en premier : c'est toi qu'on cherche, et le geste le dit —
     « Tom peut m'écrire » (décision 10 : un seul oui, le tien). */
  let choisi = 0;
  const dit = x => x.soi ? 'tu ' + direQuoiTu(r.soi.quoi, r.soi.maintenant) : x.ct.role;
  const ligne = x => [dit(x), x.ct.email || x.ct.phone || x.ct.link].filter(Boolean).join(' · ');
  const chez = x => x.soi ? r.entreprise.nom : x.c.name;
  const donner = btn('Donner', 'btn-primary', async () => {
    const x = choix[choisi];
    donner.disabled = true;
    await chargerReseau();
    const b = await assurerBoite();
    const l = lettreDon({ prenom: prenomDe(S.profile.name), cle: b.pub }, r, x.ct, x.soi ? { soi: r.soi } : { piste: x.c });
    const n = await ecrire(r.de.cle, l, r.exp).catch(() => 0);
    if (!n){ donner.disabled = false; echecEnvoi(); return; }
    etat = { ...etat, recues: etat.recues.map(y => y.id === r.id ? { ...y, statut: 'donnee', donne: x.ct.name } : y) };
    await sauver();
    logJ(`Donné à ${r.de.prenom} : ${x.ct.name} (${chez(x)})`, x.c ? x.c.id : undefined);
    sh.close();
    bus.refresh();
    /* le résultat est sur le téléphone d'un autre : il se dit (§6, ②) */
    toast(x.soi ? `${r.de.prenom} a ton contact.` : `${x.ct.name} donné à ${r.de.prenom}.`);
  }, 'share');
  donner.id = 'drDonner';
  const ignorer = btn('Ignorer', '', async () => {
    etat = { ...etat, recues: etat.recues.map(y => y.id === r.id ? { ...y, statut: 'ecartee' } : y) };
    await sauver();
    sh.close();
    bus.refresh();
  });
  ignorer.id = 'drIgnorer';
  const dessiner = () => {
    const x = choix[choisi];
    sh.body.innerHTML = `<p class="dm-qui dm-chez" id="drChez">chez ${esc(chez(x))}${r.par ? ' · par ' + esc(parDe(r)) : ''}</p>` + (choix.length === 1
      ? contactHTML({ ...x.ct, role: dit(x) }, 'drNom')
      : `<div class="pick-list" id="drListe">${choix.map((y, i) =>
          `<button class="pick pk${i === choisi ? ' on' : ''}" data-i="${i}" aria-pressed="${i === choisi}">
             ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
             <div class="pk-m"><b>${esc(y.ct.name)}</b>${ligne(y) ? `<span class="pk-s">${esc(ligne(y))}</span>` : ''}</div>
           </button>`).join('')}</div>`);
    sh.body.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { choisi = +b.dataset.i; dessiner(); }));
    /* le geste dit ce qui part : toi, ou un contact */
    donner.innerHTML = `${ic('share', 'ic-14')} ${esc(x.soi ? `${r.de.prenom} peut m’écrire` : 'Donner')}`;
  };
  dessiner();
  sh.setFoot([ignorer, donner]);
}

/* ---------- LES DEMANDES D'UN GROUPE (lot 5b, décisions 20, 28, 29) ----------
   Une demande vue dans un groupe est la MÊME lettre qu'un ami aurait
   reçue : le téléphone la passe au même moteur — il cherche dans mes
   pistes et mon parcours, sans rien montrer s'il ne trouve rien. Une
   différence : il ne la fait PAS suivre tout seul. Dans un groupe,
   chacun relaie à son tour (« Faire suivre »). La réponse, elle, va à
   la boîte de qui demande, jamais au groupe. */
export async function recevoirDemandeGroupe(l, code, nomGroupe){
  await chargerReseau();
  const b = await assurerBoite();
  const ctx = { companies: S.companies, moi: b.pub, amis: S.profile.amis, parcours: parcoursDe(S.profile, S.companies),
                pistesPour, sansRelais: true, today: todayISO() };
  const r = traiterLettre(etat, l, ctx);
  if (r.etat === etat) return null;
  etat = { ...r.etat, recues: r.etat.recues.map(x => x.id === l.id ? { ...x, groupe: code, groupeNom: nomGroupe } : x) };
  await sauver();
  /* prévenu tout de suite, sans dire qui (décision 18) */
  if (r.quoi === 'demande'){
    await envoyerSur(l.de.cle, lettreTrouve(l, { groupe: true }), l.exp);
    bus.refresh();
  }
  return r.quoi;
}
export const recueDe = id => etat.recues.find(x => x.id === id) || null;
export const demandeFaite = id => etat.demandes.find(x => x.id === id) || null;
/* ce que mon téléphone a trouvé pour elle : le premier choix, ou rien */
export const trouvePour = r => (r && r.statut === 'a-voir' ? choixPour(r)[0] : null) || null;
export const ditTrouve = x => x.soi ? 'tu y es' : 'tu as ' + x.ct.name;
export function repondreDemande(id){ const r = recueDe(id); if (r) ouvrirRecue(r); }
/* « JE CONNAIS QUELQU'UN » : ce qu'aucune app ne sait — un nom et de
   quoi le joindre, donnés par moi, à qui demande seulement */
export async function donnerConnu(id, ct){
  const r = recueDe(id);
  if (!r) return false;
  await chargerReseau();
  const b = await assurerBoite();
  const l = lettreDon({ prenom: prenomDe(S.profile.name), cle: b.pub }, r, ct, {});
  if (!await ecrire(r.de.cle, l, r.exp).catch(() => 0)){ echecEnvoi(); return false; }
  etat = { ...etat, recues: etat.recues.map(y => y.id === r.id ? { ...y, statut: 'donnee', donne: ct.name } : y) };
  await sauver();
  const chez = r.entreprise ? r.entreprise.nom : phraseCritere(r.critere);
  logJ(`Donné à ${r.de.prenom} : ${ct.name} (${chez})`);
  bus.refresh();
  return true;
}
/* FAIRE SUIVRE À MES AMIS : le même saut que le lot 4b — mon jeton,
   scellé pour qui demande ; le merci remontera par moi */
export async function suivreAmis(id){
  const r = recueDe(id);
  if (!r || !S.profile.boite) return 0;
  const l = { v: 1, t: 'demande', id: r.id, de: r.de, exp: r.exp, cercle: 1,
              ...(r.entreprise ? { entreprise: r.entreprise } : { critere: r.critere }) };
  await faireSuivre(l);
  await sauver();
  bus.refresh();
  const apres = recueDe(id);
  return apres && apres.statut === 'transmise' ? apres.vers : 0;
}

/* ---------- ENTRER DANS UN GROUPE « SUR DEMANDE » (lot 5c) ----------
   Qui scanne la porte demande à entrer : une lettre à chaque
   responsable, scellée pour lui. On attend sa réponse — la porte ne
   donne jamais le code. */
export const attentes = () => etat.attentes || [];
export const entreesPour = porte => (etat.entrees || []).filter(x => x.porte === porte && x.statut === 'attente');
export async function demanderEntree(p){
  await chargerReseau();
  const b = await assurerBoite();
  if (!S.profile.amiId){ S.profile.amiId = nouvelIdAmi(); saveProfile(); }
  const l = lettreEntree({ prenom: prenomDe(S.profile.name), cle: b.pub }, p.porte, S.profile.amiId);
  const exp = Date.now() + 14 * 864e5;
  const partis = (await Promise.all(p.responsables.map(c => ecrire(c, l, exp).catch(() => 0)))).filter(n => n > 0).length;
  if (!partis){ echecEnvoi(); return false; }
  etat = { ...etat, attentes: [...attentes().filter(a => a.porte !== p.porte), { porte: p.porte, nom: p.nom, at: Date.now() }] };
  await sauver();
  bus.refresh();
  return true;
}
/* le NOUVEAU code d'un groupe, à chacun des autres membres, scellé pour
   lui seul (lot 5c2) — par la file d'envoi : une app fermée au mauvais
   instant ne laisse personne derrière */
export async function envoyerRecode(cles, rc){
  await chargerReseau();
  const b = await assurerBoite();
  const l = lettreRecode({ prenom: prenomDe(S.profile.name), cle: b.pub }, rc);
  let partis = 0;
  for (const c of cles) if (await envoyerSur(c, l, Date.now() + 14 * 864e5)) partis++;
  return partis;
}
/* accepter : le code, scellé pour lui seul ; refuser : rien ne part */
export async function repondreEntree(id, ouvrir, groupe){
  const x = (etat.entrees || []).find(y => y.id === id);
  if (!x) return false;
  if (ouvrir){
    const b = await assurerBoite();
    const l = lettreAdmis({ prenom: prenomDe(S.profile.name), cle: b.pub }, groupe);
    if (!await envoyerSur(x.de.cle, l, Date.now() + 14 * 864e5)){ echecEnvoi(); return false; }
  }
  etat = { ...etat, entrees: etat.entrees.map(y => y.id === id ? { ...y, statut: ouvrir ? 'admis' : 'refuse' } : y) };
  await sauver();
  bus.refresh();
  return true;
}

/* ---------- ON TE DONNE ---------- */
/* le bandeau de la fiche : qui t'a donné quoi — ou qui Y EST */
export const bandeauDon = d => d.soi
  ? `${d.contact.name} ${direQuoi(d.soi.quoi, d.soi.maintenant)}${d.par ? ' · par ' + d.par : ''}`
  : `${quiDonne(d)} ${d.contact.name}`;
export function ouvrirDon(d, apres){
  const sh = openSheet({ title: quiDonne(d), icon: 'user' });
  /* une demande par métier et ville n'avait pas de piste : celle du
     contact est la mienne si je l'ai déjà, sinon elle naîtra */
  const c = pisteDeDemande(d.demande) || S.companies.find(x => !x.closedReason && memeEntreprise(x, d.entreprise)) || null;
  const k = d.contact;
  const lieu = [c ? c.name : d.entreprise.nom, !c && d.entreprise.ville].filter(Boolean).join(' · ');
  sh.body.innerHTML = contactHTML({ ...k, role: k.role || (d.soi ? direQuoi(d.soi.quoi, d.soi.maintenant) : '') }, 'ddNom')
    + `<p class="dm-qui">pour ${esc(lieu)}</p>`;
  const ajouter = btn(c ? 'Ajouter à la piste' : 'Ajouter à mes pistes', 'btn-primary', async () => {
    let piste = c, neuve = false;
    if (!piste){
      piste = normalizeCompany({ id: uid(), name: d.entreprise.nom, city: d.entreprise.ville || '', createdAt: Date.now(),
                                 ...(d.entreprise.siren ? { siren: d.entreprise.siren } : {}) });
      S.companies.push(piste);
      neuve = true;
    }
    const ct = normalizeContact({ ...k });
    piste.contacts = [...(piste.contacts || []), ct];
    (piste.history = piste.history || []).push({ d: todayISO(), t: `Contact donné par ${d.de.prenom} : ${k.name}` });
    piste.updatedAt = Date.now();
    saveData();
    etat = { ...etat, dons: etat.dons.map(x => x.id === d.id ? { ...x, statut: 'ajoute' } : x) };
    await sauver();
    logJ(`Contact reçu de ${d.de.prenom} : ${k.name} (${piste.name})`, piste.id);
    sh.close();
    if (apres) apres();
    bus.refresh();
    /* LA CHAÎNE EST REMERCIÉE, sans un geste de plus (règle du MIT) :
       qui a donné, et le premier maillon — qui passera à son tour */
    const b = S.profile.boite;
    if (b){
      const exp = Date.now() + 14 * 864e5;
      ecrire(d.de.cle, lettreMerci(moi(), d), exp).catch(() => {});
      if ((d.chaine || []).length) ouvrirJeton(b.priv, d.chaine[0]).then(j => j
        && ecrire(j.cle, lettreMerci(moi(), d, d.chaine.slice(1)), exp)).catch(() => {});
    }
    showUndo(`${ic('check', 'ic-14')} ${esc(k.name)} ajouté à ${esc(piste.name)}.`, async () => {
      if (neuve) S.companies = S.companies.filter(x => x.id !== piste.id);
      piste.contacts = (piste.contacts || []).filter(x => x.id !== ct.id);
      saveData();
      etat = { ...etat, dons: etat.dons.map(x => x.id === d.id ? { ...x, statut: 'nouveau' } : x) };
      await sauver();
      if (apres) apres();
      bus.refresh();
    });
  }, 'plus');
  ajouter.id = 'ddAjouter';
  const ignorer = btn('Ignorer', '', async () => {
    etat = { ...etat, dons: etat.dons.map(x => x.id === d.id ? { ...x, statut: 'ecarte' } : x) };
    await sauver();
    sh.close();
    if (apres) apres();
    bus.refresh();
  });
  sh.setFoot([ignorer, ajouter]);
}

/* pour les gardes : l'état tel que l'écran le lit */
export const etatReseau = () => etat;
