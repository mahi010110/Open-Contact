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
import { normalizeContact } from '../engine/model.js';
import { RELAIS_DEFAUT } from '../engine/transport.js';
import { kvGet, kvSet, RELAYS_KEY, RESEAU_KEY } from '../engine/storage.js';
import { nouvelleCle, etiquetteBoite, sceller, ouvrir, lettreDemande, lettreDon, lettreMerci, lettreAmi, normaliserLettre,
         etatVide, normaliserEtat, elaguer, peutDemander, demandeDePiste, traiterLettre, prenomDe,
         LETTRE_KIND } from '../engine/boite.js';
import { prenomAmi, profilDonne, statutAmi, ajouterAmi, nouvelIdAmi } from '../engine/amis.js';
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
async function publier(ev){
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
async function lire(filtre){
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
const echecEnvoi = () => toast('Envoi impossible — vérifie ta connexion.');
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
/* « Annuler » : ce qui n'est pas encore parti ne part pas */
export async function reprendreMonProfil(ami){
  await chargerReseau();
  etat = { ...etat, envois: (etat.envois || []).filter(x => x.cle !== (ami && ami.cle)) };
  await sauver();
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
   c'est la règle, pas une proposition. Déjà là et pareil : rien. */
function recevoirAmi(l){
  const st = statutAmi(S.profile.amis, l.profil, S.profile.amiId);
  if (st !== 'nouveau' && st !== 'maj') return false;
  S.profile.amis = ajouterAmi(S.profile.amis, l.profil);
  saveProfile();
  if (st === 'nouveau'){
    const p = prenomAmi(l.profil);
    logJ(`${p} t’a ajouté à ses amis`);
    toast(`${p} est dans tes amis.`);
  }
  return true;
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
    if ((etat.envois || []).length) await renvoyer();
    const { evs, lus } = await lire({ kinds: [LETTRE_KIND], '#x': [await etiquetteBoite(b.pub)],
                                      since: Math.max(0, Math.floor(etat.depuis / 1000) - 3600) });
    let change = false;
    for (const ev of evs){
      const l = normaliserLettre(await ouvrir(b.priv, ev.content));
      const r = traiterLettre(etat, l, { companies: S.companies, moi: b.pub });
      if (r.etat === etat) continue;
      etat = r.etat;
      change = true;
      if (r.quoi === 'ami') recevoirAmi(l);
      if (r.quoi === 'merci'){
        const m = etat.mercis.at(-1);
        logJ(`Merci de ${m.de.prenom} : ${m.contact.name} (${m.entreprise.nom})`);
        toast(`${m.de.prenom} te dit merci pour ${m.contact.name}.`);
      }
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
    if (etat.demandes.length || etat.recues.length || etat.dons.length) bus.refresh();
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
  return { demande: d, don, peut: !d && peutDemander(etat) && amisJoignables().length > 0 && !!String(S.profile.name || '').trim() };
}
/* « Tes amis » : ce qu'on te demande (et que tu as), ce qu'on t'a donné.
   Une ligne = la piste (l'attribut distinctif, §6), la raison en accent,
   puis le contact en jeu. */
const contactsTrouves = r => r.trouve.map(t => {
  const c = S.companies.find(x => x.id === t.pisteId);
  const ct = c && (c.contacts || []).find(y => y.id === t.ctId);
  return ct ? { c, ct } : null;
}).filter(Boolean);
export function lignesAmis(){
  const out = [];
  for (const r of etat.recues){
    if (r.statut !== 'a-voir' || r.exp <= Date.now()) continue;
    const cts = contactsTrouves(r);
    if (cts.length) out.push({ sorte: 'demande', id: r.id, nom: cts[0].c.name,
                               raison: `${r.de.prenom} cherche quelqu’un`, qui: 'tu as ' + cts[0].ct.name });
  }
  for (const d of etat.dons){
    if (d.statut !== 'nouveau') continue;
    const c = pisteDeDemande(d.demande);
    out.push({ sorte: 'don', id: d.id, nom: c ? c.name : d.entreprise.nom,
               raison: `${d.de.prenom} t’a donné`, qui: d.contact.name });
  }
  return out;
}
export function ouvrirLigne(sorte, id){
  if (sorte === 'demande'){ const r = etat.recues.find(x => x.id === id); if (r) ouvrirRecue(r); }
  else { const d = etat.dons.find(x => x.id === id); if (d) ouvrirDon(d); }
}

/* ---------- DEMANDER ---------- */
export function ouvrirDemander(c, apres){
  const amis = amisJoignables();
  const sh = openSheet({ title: 'Demander à mes amis', icon: 'users' });
  const prenom = prenomDe(S.profile.name);
  /* LA PHRASE QUI PART, mot pour mot, et à qui. Rien d'autre ne voyage :
     ni ta piste, ni tes notes, ni où tu en es (règle 3). */
  sh.body.innerHTML =
    `<div class="gr-mot" id="dmMot">${esc(prenom)} cherche quelqu’un chez ${esc(c.name)}.</div>
     <p class="dm-qui" id="dmQui">${ic('users', 'ic-14')} ${esc(amis.map(prenomAmi).join(' · '))}</p>`;
  const go = btn('Demander', 'btn-primary', async () => {
    go.disabled = true;
    await chargerReseau();
    const b = await assurerBoite();
    const now = Date.now();
    const l = lettreDemande({ prenom, cle: b.pub }, c, now);
    const partis = (await Promise.all(amis.map(a => ecrire(a.cle, l, l.exp).catch(() => 0)))).filter(n => n > 0).length;
    if (!partis){
      go.disabled = false;
      echecEnvoi();
      return;
    }
    etat = { ...etat, demandes: [...etat.demandes, { id: l.id, pisteId: c.id, entreprise: l.entreprise, at: now, exp: l.exp, vers: partis }] };
    await sauver();
    logJ(`Demandé à ${partis} ami${partis > 1 ? 's' : ''} : quelqu’un chez ${c.name}`, c.id);
    sh.close();
    if (apres) apres();
    bus.refresh();
  }, 'users');
  go.id = 'dmGo';
  sh.setFoot([go]);
}
/* l'état d'une demande en cours, sur la fiche : un fait, pas un bouton */
export function demandeEnCoursHTML(d){
  const j = new Date(d.at).toISOString().slice(0, 10);
  const quand = j === todayISO() ? 'aujourd’hui' : frDate(j);
  return `<p class="fi-demande" id="fiDemande">${ic('clock', 'ic-14')} Demandé à ${d.vers} ami${d.vers > 1 ? 's' : ''} · ${quand}</p>`;
}

/* ---------- ON TE DEMANDE ---------- */
/* un contact tel qu'il partirait — ou tel qu'il arrive : le nom, puis
   de quoi le joindre. La même forme des deux côtés de l'échange. */
const contactHTML = (k, id) =>
  `<div class="obj"><div class="obj-m"><span class="obj-n" id="${id}">${esc(k.name)}</span>
     <div class="obj-s">${[k.role, k.email, k.phone, k.link].filter(Boolean)
       .map(v => `<span class="obj-l">${esc(v)}</span>`).join('')}</div></div></div>`;
function ouvrirRecue(r){
  const cts = contactsTrouves(r);
  if (!cts.length) return;
  const sh = openSheet({ title: `${r.de.prenom} cherche quelqu’un`, icon: 'users' });
  /* CE QUE TU DONNERAIS, en entier — le contact, rien de ton suivi.
     Un seul contact (le cas courant) n'est pas un choix : il se lit, et
     « Donner » tient le pied. Plusieurs : on en choisit un, le pied
     donne toujours. */
  let choisi = 0;
  const ligne = ({ ct }) => [ct.role, ct.email || ct.phone || ct.link].filter(Boolean).join(' · ');
  const dessiner = () => {
    sh.body.innerHTML = `<p class="dm-qui dm-chez">chez ${esc(cts[0].c.name)}</p>` + (cts.length === 1
      ? contactHTML(cts[0].ct, 'drNom')
      : `<div class="pick-list" id="drListe">${cts.map((x, i) =>
          `<button class="pick pk${i === choisi ? ' on' : ''}" data-i="${i}" aria-pressed="${i === choisi}">
             ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
             <div class="pk-m"><b>${esc(x.ct.name)}</b>${ligne(x) ? `<span class="pk-s">${esc(ligne(x))}</span>` : ''}</div>
           </button>`).join('')}</div>`);
    sh.body.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => { choisi = +b.dataset.i; dessiner(); }));
  };
  dessiner();
  const donner = btn('Donner', 'btn-primary', async () => {
    const x = cts[choisi];
    donner.disabled = true;
    await chargerReseau();
    const b = await assurerBoite();
    const l = lettreDon({ prenom: prenomDe(S.profile.name), cle: b.pub }, r, x.ct);
    const n = await ecrire(r.de.cle, l, r.exp).catch(() => 0);
    if (!n){ donner.disabled = false; echecEnvoi(); return; }
    etat = { ...etat, recues: etat.recues.map(y => y.id === r.id ? { ...y, statut: 'donnee', donne: x.ct.name } : y) };
    await sauver();
    logJ(`Donné à ${r.de.prenom} : ${x.ct.name} (${x.c.name})`, x.c.id);
    sh.close();
    bus.refresh();
    /* le résultat est sur le téléphone d'un autre : il se dit (§6, ②) */
    toast(`${x.ct.name} donné à ${r.de.prenom}.`);
  }, 'share');
  donner.id = 'drDonner';
  const ignorer = btn('Ignorer', '', async () => {
    etat = { ...etat, recues: etat.recues.map(y => y.id === r.id ? { ...y, statut: 'ecartee' } : y) };
    await sauver();
    sh.close();
    bus.refresh();
  });
  ignorer.id = 'drIgnorer';
  sh.setFoot([ignorer, donner]);
}

/* ---------- ON TE DONNE ---------- */
export function ouvrirDon(d, apres){
  const sh = openSheet({ title: `${d.de.prenom} t’a donné`, icon: 'user' });
  const c = pisteDeDemande(d.demande);
  const k = d.contact;
  sh.body.innerHTML = contactHTML(k, 'ddNom') + `<p class="dm-qui">pour ${esc(c ? c.name : d.entreprise.nom)}</p>`;
  const ajouter = btn('Ajouter à la piste', 'btn-primary', async () => {
    let piste = c;
    if (!piste) return;
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
    /* LA CHAÎNE EST REMERCIÉE, sans un geste de plus (règle du MIT) */
    const b = S.profile.boite;
    if (b) ecrire(d.de.cle, lettreMerci({ prenom: prenomDe(S.profile.name), cle: b.pub }, d), Date.now() + 14 * 864e5).catch(() => {});
    showUndo(`${ic('check', 'ic-14')} ${esc(k.name)} ajouté à ${esc(piste.name)}.`, async () => {
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
  sh.setFoot(c ? [ignorer, ajouter] : [ignorer]);
}

/* pour les gardes : l'état tel que l'écran le lit */
export const etatReseau = () => etat;
