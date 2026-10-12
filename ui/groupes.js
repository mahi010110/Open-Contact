/* ============================================================
   OpenContact — interface · les groupes (docs/reseau.md, lot 5)

   Une classe, une promo, un club : on s'y donne des pistes et on s'y
   écrit des messages qui s'effacent au bout de sept jours. Tout passe
   par les relais, scellé par le code du groupe (engine/groupe.js) :
   plus besoin d'être là en même temps — chacun reçoit à sa prochaine
   ouverture, et l'aperçu passe avant toute fusion (invariant ②).

   Trois places, pas une de plus :
   · « Échanger » — le cadre « Groupes » : Créer, Rejoindre, une rangée
     par groupe avec ce qui est arrivé depuis la dernière fois ;
   · la feuille d'un groupe — les prénoms, le fil, et le pied pour
     écrire ou donner ;
   · « Membres » — les prénoms, l'invitation, Quitter.
   ============================================================ */
import { esc, localISO } from '../engine/utils.js';
import { kvGet, kvSet, GROUPES_KEY } from '../engine/storage.js';
import { nouvelId, LETTRE_KIND } from '../engine/boite.js';
import { nouvelIdAmi } from '../engine/amis.js';
import { sharePayload } from '../engine/exchange.js';
import { decouper, rassembler } from '../engine/portage.js';
import { GROUPES_MAX, MOT_MAX, NOM_MAX, nouveauCode, codeNorm, codeAffiche, nomGroupe, invitation, lireInvitation,
         cleGroupe, sceller, ouvrirMessage, normaliserMessage, dureeDe, groupeVide, normaliserGroupe,
         traiterMessage, elaguerGroupe, filDe, membresDe, nouveaux, presenceAredire,
         relaisVersGroupe, peutRelayerGroupe } from '../engine/groupe.js';
import { phraseCritere } from '../engine/critere.js';
import { emailPlausible } from '../engine/model.js';
import { S, bus, saveProfile } from './state.js';
import { openSheet, toast, btn, ic, showUndo, clavier, champGrandit } from './dom.js';
import { frDate, diffDays } from './dates.js';
import { makeQrSvg } from './qr.js';
import { publier, lire, ecouter, evenement, echecEnvoi, amisJoignables, recevoirDemandeGroupe, recueDe, chargerReseau,
         trouvePour, ditTrouve, repondreDemande, donnerConnu, suivreAmis } from './reseau.js';

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

const cles = new Map();
const cle = code => { if (!cles.has(code)) cles.set(code, cleGroupe(code)); return cles.get(code); };

/* ---------- écrire au groupe ---------- */
async function poster(code, msg){
  const k = await cle(code);
  const ev = await evenement([['x', k.etiquette], ['expiration', String(Math.floor((msg.at + dureeDe(msg.t)) / 1000))]],
    await sceller(k, msg));
  return publier(ev);
}
async function direPresence(code){
  const g = groupe(code);
  const at = Date.now();
  const m = { t: 'membre', de: moi(), prenom: prenomMoi(), nom: nomConnu(code), at };
  const n = await poster(code, m).catch(() => 0);
  if (!n) return;
  etat[code] = traiterMessage({ ...g, presence: at }, m);
  await sauver();
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
    await sauver();
    if (change) bus.refresh();
  })().catch(() => {}).finally(() => { enCours = null; });
  return enCours;
}
async function absorber(evs, parEtiquette){
  let change = false;
  for (const ev of evs){
    const x = (ev.tags || []).find(t => t[0] === 'x');
    const code = x && parEtiquette.get(x[1]);
    if (!code) continue;
    const m = normaliserMessage(await ouvrirMessage(await cle(code), ev.content));
    const avant = groupe(code);
    const apres = traiterMessage(avant, m);
    if (apres !== avant){
      etat[code] = apres; change = true;
      /* une demande d'un AUTRE : mon téléphone cherche, sans rien montrer
         s'il ne trouve rien (règle 6) */
      if (m.t === 'demande') await recevoirDemandeGroupe(m.lettre, code, nomDe(code)).catch(() => null);
    }
  }
  /* un groupe rejoint par son code seul apprend son nom des autres : il
     rejoint le profil, pour que mes autres appareils le sachent aussi */
  let appris = false;
  const liste = mesGroupes().map(g => !g.nom && etat[g.code] && etat[g.code].nom ? (appris = true, { ...g, nom: etat[g.code].nom }) : g);
  if (appris){ S.profile.groupes = liste; saveProfile(); }
  return change;
}

/* ---------- « Échanger » : le cadre « Groupes » ----------
   Le même dessin que « Amis » juste à côté : le mot, deux gestes taillés
   à leur mot. Dessous, une rangée par groupe — ses affaires, pas une
   porte (§6, règle 2) : ce qui est arrivé depuis la dernière fois, en
   chiffre, et rien quand il n'y a rien. À cinq groupes, les deux gestes
   ne sont plus là : l'indisponible est absent, jamais grisé. */
export function groupesHTML(){
  const liste = mesGroupes();
  const plein = liste.length >= GROUPES_MAX;
  return `<div class="pcard ec-groupes" role="group" aria-label="Groupes">
      <div class="ec-gr-h">
        <b class="ec-gr-t">${ic('message-text', 'ic-14')} Groupes</b>
        ${plein ? '' : `<span class="ec-gr-g">
          <button class="btn btn-sm" id="ecGrCreer">${ic('plus', 'ic-14')} Créer</button>
          <button class="btn btn-sm" id="ecGrRejoindre">${ic('grid-3x3', 'ic-14')} Rejoindre</button>
        </span>`}
      </div>
      ${liste.length ? `<div class="gr-liste">${liste.map(g => {
        const n = etat[g.code] ? nouveaux(etat[g.code], moi()) : 0;
        return `<button class="gr-ligne" data-groupe="${esc(g.code)}">
            <b>${esc(nomDe(g.code))}</b>
            ${n ? `<span class="gr-n" aria-label="${n} nouveau${n > 1 ? 'x' : ''}">${n}</span>` : ''}
            ${ic('chevron-right', 'ic-14')}
          </button>`;
      }).join('')}</div>` : ''}
    </div>`;
}
export function bindGroupes(root, apres){
  root.querySelector('#ecGrCreer')?.addEventListener('click', () => ouvrirCreer(apres));
  root.querySelector('#ecGrRejoindre')?.addEventListener('click', () => ouvrirRejoindre(apres));
  root.querySelectorAll('[data-groupe]').forEach(b => b.addEventListener('click', () => ouvrirGroupe(b.dataset.groupe, apres)));
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
    sh.body.innerHTML =
      `<div class="field"><label for="grNom">Nom du groupe</label>
         <input id="grNom" maxlength="${NOM_MAX}" ${clavier('nom')} placeholder="ex : BTS SIO Lille"></div>`;
    const champ = sh.body.querySelector('#grNom');
    const go = async () => {
      const nom = nomGroupe(champ.value);
      if (!nom) return;
      const g = { code: nouveauCode(), nom, at: Date.now() };
      bGo.disabled = true;
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
  const go = () => { const inv = lireInvitation(champ.value); if (inv) rejoindre(sh, inv, apres); };
  const bGo = btn('Rejoindre', 'btn-primary', go);
  const bScan = btn('Scanner', '', async () => {
    sh.close();
    (await import('./recevoir.js')).openRecevoir({ scanner: true, apres });
  }, 'grid-3x3');
  bGo.id = 'grRejoindreGo'; bScan.id = 'grScan';
  const maj = () => {
    const inv = lireInvitation(champ.value);
    bGo.hidden = !inv;
    qui.hidden = !inv;
    if (inv) qui.innerHTML = etatInvitation(inv);
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
    await entrer({ code: inv.code, nom: inv.nom || (etat[inv.code] && etat[inv.code].nom) || '', at: Date.now() });
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

/* ---------- un groupe : les prénoms, le fil, le pied pour écrire ---------- */
function quand(t){
  const iso = localISO(new Date(t));
  const d = diffDays(iso);
  if (d === 0) return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return d === -1 ? 'hier' : frDate(iso);
}
const quoiDe = l => l.entreprise ? 'chez ' + l.entreprise.nom : phraseCritere(l.critere);
/* DEMANDE TROUVÉE PAR MON TÉLÉPHONE : elle passe EN TÊTE, à mon nom
   (décision 29 — dans un groupe chacun croit qu'un autre répondra ;
   s'adresser à quelqu'un par son nom, c'est ce qui marche) */
/* MA demande : celle dont je suis l'auteur (sa clé est la mienne) — pas
   celle que j'ai seulement relayée d'un autre groupe */
const maDemande = x => !!S.profile.boite && x.lettre.de.cle === S.profile.boite.pub;
const trouveeParMoi = x => x.t === 'demande' && !maDemande(x) && !!trouvePour(recueDe(x.id));
function demandeHTML(x){
  const mien = maDemande(x);
  const r = mien ? null : recueDe(x.id);
  const t = trouvePour(r);
  const etatRep = r && r.statut === 'donnee' ? 'Donné' : r && r.statut === 'transmise' ? 'Tu l’as fait suivre' : '';
  return `<li class="gr-m gr-dem${mien ? ' gr-moi' : ''}${t ? ' gr-trouvee' : ''}">
      <span class="gr-qui"><b>${mien ? 'Toi' : esc(x.prenom)}</b> <time>${esc(quand(x.at))}</time></span>
      <p>${ic('users', 'ic-14')} ${mien ? 'Tu cherches' : esc(x.prenom) + ' cherche'} quelqu’un ${esc(quoiDe(x.lettre))}</p>
      ${x.relais ? `<span class="gr-sous">relayée par ${esc(x.relais.prenom)}</span>` : ''}
      ${t ? `<span class="gr-tu">${ic('check', 'ic-14')} ${esc(ditTrouve(t))}</span>` : ''}
      ${mien ? '' : etatRep ? `<span class="gr-pris">${ic('check', 'ic-14')} ${etatRep}</span>`
        : `<button class="btn btn-sm${t ? ' btn-primary' : ''}" data-repondre="${esc(x.id)}">Répondre</button>`}
    </li>`;
}
function filHTML(code){
  const g = groupe(code);
  const fil = filDe(g).filter(x => !trouveeParMoi(x));
  return fil.map(x => {
    const mien = x.de === moi();
    const tete = `<span class="gr-qui"><b>${mien ? 'Toi' : esc(x.prenom)}</b> <time>${esc(quand(x.at))}</time></span>`;
    if (x.t === 'demande') return demandeHTML(x);
    if (x.t === 'mot') return `<li class="gr-m${mien ? ' gr-moi' : ''}">${tete}<p>${esc(x.texte)}</p></li>`;
    const pris = (g.pris || []).includes(x.id);
    return `<li class="gr-m gr-don${mien ? ' gr-moi' : ''}">${tete}
        <p>${ic('share', 'ic-14')} ${x.nb} piste${x.nb > 1 ? 's' : ''}</p>
        ${mien ? '' : pris ? `<span class="gr-pris">${ic('check', 'ic-14')} dans tes pistes</span>`
          : `<button class="btn btn-sm" data-voir="${esc(x.id)}">Voir</button>`}
      </li>`;
  }).join('');
}
export async function ouvrirGroupe(code, apres){
  /* ce que MON téléphone a trouvé vit dans la boîte (oc_reseau_v1) : sans
     elle, une demande trouvée ne passerait pas en tête */
  await Promise.all([chargerGroupes(), chargerReseau()]);
  let arret = null;
  const sh = openSheet({ title: nomDe(code), icon: 'message-text', className: 'modal-groupe',
    onClose: () => { if (arret) arret(); vu(code); if (apres) apres(); } });
  const q = s => sh.body.querySelector(s);
  const rendre = async () => {
    if (!sh.body.isConnected) return;
    const g = groupe(code);
    const autres = membresDe(g).filter(m => m.de !== moi());
    const fil = filDe(g);
    const enTete = fil.filter(trouveeParMoi);
    const bas = sh.body.scrollHeight - sh.body.scrollTop - sh.body.clientHeight < 40;
    sh.setTitle(nomDe(code));
    sh.body.innerHTML =
      `${autres.length ? `<button class="gr-membres" id="grMembres">${ic('users', 'ic-14')}
           <span class="gr-membres-t">${esc([...autres.map(m => m.prenom), 'toi'].join(' · '))}</span>${ic('chevron-right', 'ic-14')}</button>` : ''}
       ${!autres.length && !fil.length ? `<div class="gr-inviter" id="grInviter"></div>` : ''}
       ${enTete.length ? `<ol class="gr-fil gr-entete" id="grEnTete">${enTete.map(demandeHTML).join('')}</ol>` : ''}
       <p class="gr-ephem">${ic('clock', 'ic-14')} Les messages s’effacent au bout de 7 jours.</p>
       <ol class="gr-fil" id="grFil">${filHTML(code)}</ol>`;
    q('#grMembres')?.addEventListener('click', () => ouvrirMembres(code, sh));
    if (q('#grInviter')) inviterDans(q('#grInviter'), code);
    sh.body.querySelectorAll('[data-voir]').forEach(b => b.addEventListener('click', () => voirPistes(code, b.dataset.voir, rendre)));
    sh.body.querySelectorAll('[data-repondre]').forEach(b => b.addEventListener('click', () => {
      const x = groupe(code).fil.find(y => y.id === b.dataset.repondre);
      if (x) ouvrirReponse(code, x, rendre);
    }));
    if (bas || !rendu) sh.body.scrollTop = sh.body.scrollHeight;
    rendu = true;
  };
  let rendu = false;

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
    const m = { t: 'mot', id: nouvelId(), de: moi(), prenom: prenomMoi(), texte, at: Date.now() };
    bEnv.disabled = true;
    const n = await poster(code, m).catch(() => 0);
    bEnv.disabled = false;
    if (!n){ echecEnvoi(); return; }
    etat[code] = { ...traiterMessage(groupe(code), m), vu: m.at };
    await sauver();
    champ.value = '';
    champ.dispatchEvent(new Event('input'));
    rendre();
    sh.body.scrollTop = sh.body.scrollHeight;
  };
  champ.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); envoyer(); } });
  const bEnv = btn('', 'icon-btn', envoyer, 'arrow-up');
  bEnv.id = 'grEnvoyer'; bEnv.setAttribute('aria-label', 'Envoyer'); bEnv.title = 'Envoyer';
  const bDon = btn('Donner', '', async () => {
    (await import('./donner.js')).openDonner({ groupe: { code, nom: nomDe(code) }, apres: rendre });
  }, 'share');
  bDon.id = 'grDonner';
  const pied = document.createElement('div');
  pied.className = 'gr-pied';
  pied.append(bDon, champ, bEnv);
  sh.setFoot([pied]);

  await rendre();
  /* EN DIRECT tant que la feuille est ouverte : un mot écrit en face
     arrive sans rien toucher ; fermée, la relève prend le relais */
  const k = await cle(code);
  arret = ecouter({ kinds: [LETTRE_KIND], '#x': [k.etiquette], since: Math.floor(Date.now() / 1000) - 60 }, async ev => {
    if (await absorber([ev], new Map([[k.etiquette, code]]))){ await sauver(); rendre(); }
  });
  releverGroupes().then(rendre);
  return sh;
}
function vu(code){
  if (!etat[code]) return;
  etat[code] = { ...etat[code], vu: Date.now() };
  sauver();
  bus.refresh();
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
  const sh = openSheet({ title: `${x.prenom} cherche quelqu’un`, icon: 'users' });
  const autres = mesGroupes().filter(g => g.code !== code && !(groupe(g.code).fil || []).some(y => y.id === x.id));
  const versGroupes = peutRelayerGroupe(x) ? autres : [];
  const fin = () => { sh.close(); apres(); };
  const accueil = () => {
    sh.setTitle(`${x.prenom} cherche quelqu’un`);
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
         <p class="hint warn" id="rpErr" hidden>Une adresse e-mail ou un numéro de téléphone.</p></div>`;
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
async function inviterDans(box, code){
  const txt = invitation({ code, nom: nomConnu(code) });
  let svg = '';
  try { svg = await makeQrSvg(txt); } catch (e) {}
  if (!box.isConnected) return;
  box.innerHTML =
    `${svg ? `<div class="qr-wrap" role="img" aria-label="Le QR du groupe, à faire scanner">${svg}</div>` : ''}
     <p class="gr-code"><span>Code</span> <b id="grCodeAff">${esc(codeAffiche(code))}</b></p>`;
  const copier = btn('Copier', 'btn-sm', async () => {
    try {
      await navigator.clipboard.writeText(`Rejoins « ${nomDe(code)} » sur OpenContact — Échanger › Groupes › Rejoindre : ${codeAffiche(code)}\n${txt}`);
      copier.innerHTML = ic('check', 'ic-14') + ' Copié';
    } catch (e) { toast('Copie impossible ici — montre plutôt le QR.'); }
  }, 'copy');
  copier.id = 'grCopier';
  box.append(copier);
}
function ouvrirMembres(code, shGroupe){
  const g = groupe(code);
  const sh = openSheet({ title: 'Membres', icon: 'users' });
  const noms = [...membresDe(g).filter(m => m.de !== moi()).map(m => m.prenom), 'Toi'];
  sh.body.innerHTML =
    `<ul class="gr-noms">${noms.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
     <div class="gr-inviter" id="grInviter"></div>
     <div class="pick-sortie"><button class="btn btn-sm btn-danger" id="grQuitter">${ic('logout', 'ic-14')} Quitter le groupe</button></div>`;
  inviterDans(sh.body.querySelector('#grInviter'), code);
  sh.body.querySelector('#grQuitter').addEventListener('click', () => { sh.close(); shGroupe.close(); quitter(code); });
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
