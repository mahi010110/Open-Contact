/* ============================================================
   OpenContact — interface · la boîte de « Réseau »
   (retour du mainteneur, 13 octobre 2026 : « une boîte de réception,
   le suivi des nouveaux messages dans les groupes, afficher les
   conversations comme Discord — exactement comme les messageries
   traditionnelles, attention à la sécurité aussi »)

   Toutes les conversations — mes groupes, mes amis — dans UNE liste, la
   plus récente en haut (engine/conversations.js). Chaque ligne : un
   visage, le nom, le dernier message, l'heure, et ce qui n'est pas lu.
   Une ligne ouvre sa conversation : une feuille au pouce, une fenêtre
   au poste, comme toutes les feuilles de l'app (8.1.0 : la conversation
   posée à droite de la liste n'est pas revenue). L'onglet ne porte
   aucun chiffre ; il change de couleur quand quelqu'un attend (le calme,
   R10). Appui long (clic droit, touche menu) : épingler, couper le son,
   marquer comme lu.

   Rien de plus ne sort : la liste se construit avec ce que l'appareil a
   déjà, scellé. Pas d'aperçu de lien, pas de « vu », pas de « en train
   d'écrire » — trois choses que les messageries font et qui disent à
   d'autres quand on regarde (docs/reseau.md, décision 37).
   ============================================================ */
import { esc } from '../engine/utils.js';
import { FILS_KEY, kvGet, kvSet } from '../engine/storage.js';
import { prefsVides, normaliserPrefs, boite, filtrer, filtresUtiles, filtreVide,
         basculerEpingle, basculerMuet, renommerFil, oublierFil, cleFil, phraseEcrits } from '../engine/conversations.js';
import { S, bus } from './state.js';
import { openSheet, ic, appuiLong, annoncer } from './dom.js';
import { quandListe } from './dates.js';
import { visageHTML, blasonHTML } from './visage.js';
import { resumeGroupes, ouvrirGroupe, marquerGroupeLu, groupesPlein, ouvrirNouveauGroupe } from './groupes.js';
import { resumeConversations, ouvrirConversation, marquerAmiLu } from './messages.js';
import { amisJoignables } from './reseau.js';

/* ---------- ce qu'on a réglé sur chaque conversation (oc_fils_v1) ---------- */
let prefs = prefsVides();
let charge = null;
export function chargerFils(){
  return charge || (charge = kvGet(FILS_KEY).then(v => {
    try { prefs = normaliserPrefs(JSON.parse(v || 'null')); } catch (e) { prefs = prefsVides(); }
  }).catch(() => {}));
}
const sauver = () => kvSet(FILS_KEY, JSON.stringify(prefs)).catch(() => {});
export async function renommerGroupe(ancien, nouveau){
  await chargerFils();
  prefs = renommerFil(prefs, cleFil('groupe', ancien), cleFil('groupe', nouveau));
  sauver();
}
export async function oublierConversation(sorte, id){
  await chargerFils();
  prefs = oublierFil(prefs, cleFil(sorte, id));
  sauver();
}

export const rangsBoite = () => boite([...resumeGroupes(), ...resumeConversations()], prefs);

/* LE CALME (R10) : aucun chiffre sur un onglet — « Aujourd'hui » dit
   qui t'a écrit, à l'heure où tu l'ouvres (`ecritsDuJour`), et une
   conversation qui attend s'écrit en gras avec son point, dans la boîte */

/* ---------- la liste ---------- */
let filtre = 'tout';
const MOTS_FILTRE = { tout: 'Tout', nonlus: 'Non lus', groupes: 'Groupes', amis: 'Amis' };
/* ce qui attend QUELQU'UN, dit d'une phrase dans « Aujourd'hui » (R10) */
export const ecritsDuJour = () => phraseEcrits(rangsBoite());
/* la boîte, ouverte sur ce qui n'est pas lu */
export function ouvrirNonLus(){
  filtre = 'nonlus';
  if (/^#\/(reseau|echanger)\b/.test(location.hash)) bus.refresh();
  else location.hash = '#/reseau';
}

function ligneHTML(r){
  const tete = r.sorte === 'groupe' ? blasonHTML(r.nom, 'bx-vz') : visageHTML(r.id, 'bx-vz');
  const etat = [r.n ? 'non lue' : '', r.cite ? `on t’y nomme` : '',
    r.epingle ? 'épinglée' : '', r.muet ? 'son coupé' : ''].filter(Boolean);
  const dedans =
    `${tete}
     <span class="bx-m"><b class="bx-n">${esc(r.nom)}</b><span class="bx-p">${r.apercu ? esc(r.apercu) : 'Aucun message pour l’instant'}</span></span>
     <span class="bx-d"><time>${esc(r.attente ? '' : quandListe(r.at))}</time>
       <span class="bx-i">${r.muet ? ic('bell-off', 'ic-14') : ''}${r.epingle ? ic('bookmark', 'ic-14') : ''}${
         r.cite ? '<span class="bx-at" aria-hidden="true">@</span>' : ''}${
         /* au calme (R10), un point, jamais un compte : le gras dit déjà
            « pas lu », le nombre ne ferait que presser */
         r.n ? '<span class="bx-pt" aria-hidden="true"></span>' : ''}</span></span>`;
  /* un groupe où l'on a demandé à entrer : une ligne qui ne s'ouvre pas
     encore — « en attente » à la place du dernier message, et une seule fois */
  if (r.attente) return `<div class="bx-l bx-attente" role="listitem">${dedans}</div>`;
  const aria = [r.nom, ...etat, r.apercu].filter(Boolean).join(', ');
  return `<div role="listitem"><button class="bx-l${r.n ? ' bx-nonlu' : ''}" data-fil="${esc(r.cle)}"${
    r.sorte === 'groupe' ? ` data-groupe="${esc(r.id)}"` : ` data-ami="${esc(r.id)}"`} aria-label="${esc(aria)}">${dedans}</button></div>`;
}
export function boiteHTML(){
  const tous = rangsBoite();
  const offerts = filtresUtiles(tous);
  /* un filtre qui ne montre plus rien rend la liste entière : on ne
     reste jamais devant un cadre vide après avoir lu le dernier non-lu */
  if (!offerts.includes(filtre) || filtreVide(tous, filtre)) filtre = 'tout';
  const rangs = filtrer(tous, filtre);
  const ecrire = amisJoignables().length;
  const nAmis = (S.profile.amis || []).length;
  const plein = groupesPlein();
  /* sans conversation, le cadre n'est pas une liste : une phrase et un geste */
  const item = h => tous.length ? `<div role="listitem">${h}</div>` : `<div>${h}</div>`;
  return {
    vide: !tous.length,
    html:
      (offerts.length ? `<div class="datechips bx-filtres" role="group" aria-label="Afficher">${offerts.map(f => {
        const vide = filtreVide(tous, f);
        return `<button class="dchip${f === filtre ? ' on' : ''}" data-filtre="${f}" aria-pressed="${f === filtre}"${
          vide ? ' disabled' : ''}>${MOTS_FILTRE[f]}</button>`; }).join('')}</div>` : '')
      + `<div class="bx-liste${tous.length ? '' : ' bx-vide'}"${tous.length ? ' role="list" aria-label="Conversations"' : ''}>${
         /* vide, le cadre dit ce qu'il recevra — pas qu'il n'y a rien */
         tous.length ? '' : '<p class="bx-rien">Tes groupes et tes amis apparaissent ici.</p>'}${
         rangs.map(ligneHTML).join('')}
         ${/* « MES AMIS », une ligne de la liste (R1, décision 0002) : les
              amis quittent « Pistes » pour vivre avec leurs conversations.
              Elle se lit comme une rangée qui mène (son chevron, son
              compte), pas comme un geste en encre sourde. */
           item(`<button class="bx-amis" id="bxAmis">${ic('users', 'ic-14')}<span class="bx-amis-l">Mes amis</span>${
             nAmis ? `<span class="bx-amis-n">${nAmis}</span>` : ''}${ic('chevron-right', 'ic-14')}</button>`)}
         ${/* les deux façons d'en commencer une — en encre sourde, en dernier :
              la ligne « Ajouter un compte » d'iOS */''}
         ${ecrire ? item(`<button class="bx-plus" id="bxEcrire">${ic('message-text', 'ic-14')} Écrire à un ami</button>`) : ''}
         ${plein ? '' : item(`<button class="bx-plus" id="ecGrNeuf">${ic('plus', 'ic-14')} Nouveau groupe</button>`)}
       </div>`
  };
}

/* ---------- ouvrir une conversation ---------- */
function ouvrir(r, apres){
  if (!r || r.attente) return;
  if (r.sorte === 'groupe') return ouvrirGroupe(r.id, apres);
  const a = (S.profile.amis || []).find(x => x.id === r.id);
  if (a) return ouvrirConversation(a, apres);
}

/* le menu d'une conversation : épingler, couper le son, marquer comme
   lu. Une ligne qui n'attend rien n'offre pas « marquer comme lu ». */
function menuFil(r, apres){
  const sh = openSheet({ title: r.nom, icon: r.sorte === 'groupe' ? 'message-text' : 'user' });
  const rangs = [
    { id: 'bxEpingler', icone: 'bookmark', mot: r.epingle ? 'Désépingler' : 'Épingler',
      faire: () => { prefs = basculerEpingle(prefs, r.cle); } },
    { id: 'bxSon', icone: 'bell-off', mot: r.muet ? 'Remettre le son' : 'Couper le son',
      faire: () => { prefs = basculerMuet(prefs, r.cle); } },
    ...(r.n ? [{ id: 'bxLu', icone: 'check', mot: 'Marquer comme lu',
      faire: () => { if (r.sorte === 'groupe') marquerGroupeLu(r.id); else marquerAmiLu(r.id); } }] : [])
  ];
  sh.body.innerHTML = `<div class="pick-list">${rangs.map(x =>
    `<button class="pick" id="${x.id}"><b>${ic(x.icone, 'ic-14')} ${x.mot}</b></button>`).join('')}</div>`;
  rangs.forEach(x => sh.body.querySelector('#' + x.id).addEventListener('click', () => {
    x.faire();
    sauver();
    sh.close();
    bus.refresh();
    /* la ligne a changé de place ou de chiffre sans prendre le focus */
    annoncer(`${r.nom} : ${x.mot.toLowerCase()}.`);
    if (apres) apres();
  }));
}

/* « Écrire à un ami » : la liste des amis à qui l'on peut écrire, avec
   leur visage — un tap ouvre la conversation */
function ouvrirEcrire(ouvrirAmi){
  const amis = amisJoignables().slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const sh = openSheet({ title: 'Écrire', icon: 'message-text' });
  sh.body.innerHTML = `<div class="pick-list">${amis.map(a =>
    `<button class="pick bx-ami" data-ami="${esc(a.id)}">${visageHTML(a.id, 'bx-vz')}<b>${esc(a.nom)}</b></button>`).join('')}</div>`;
  sh.body.querySelectorAll('[data-ami]').forEach(b => b.addEventListener('click', () => {
    const a = amis.find(x => x.id === b.dataset.ami);
    sh.close();
    if (a) ouvrirAmi(a);
  }));
}

/* la liste, branchée : une ligne ouvre sa conversation */
export function bindBoite(root, { rendre }){
  const liste = root.querySelector('.bx-liste');
  if (!liste) return;
  const tous = () => rangsBoite();
  root.querySelectorAll('[data-filtre]').forEach(b => b.addEventListener('click', () => {
    filtre = b.dataset.filtre;
    rendre();
    const n = filtrer(tous(), filtre).length;
    annoncer(`${n} conversation${n > 1 ? 's' : ''}.`);
  }));
  liste.querySelectorAll('.bx-l[data-fil]').forEach(b => {
    b.addEventListener('click', () => ouvrir(tous().find(x => x.cle === b.dataset.fil), rendre));
    appuiLong(b, () => { const r = tous().find(x => x.cle === b.dataset.fil); if (r) menuFil(r, rendre); });
  });
  root.querySelector('#bxEcrire')?.addEventListener('click', () => ouvrirEcrire(a => ouvrirConversation(a, rendre)));
  root.querySelector('#bxAmis')?.addEventListener('click', async () =>
    (await import('./amis.js')).openMesAmis(rendre));
  root.querySelector('#ecGrNeuf')?.addEventListener('click', () => ouvrirNouveauGroupe(rendre, 'Nouveau groupe'));
}
