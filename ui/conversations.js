/* ============================================================
   OpenContact — interface · la boîte « Échanger »
   (retour du mainteneur, 13 octobre 2026 : « une boîte de réception,
   le suivi des nouveaux messages dans les groupes, afficher les
   conversations comme Discord — exactement comme les messageries
   traditionnelles, attention à la sécurité aussi »)

   Toutes les conversations — mes groupes, mes amis — dans UNE liste, la
   plus récente en haut (engine/conversations.js). Chaque ligne : un
   visage, le nom, le dernier message, l'heure, et ce qui n'est pas lu.
   · au pouce, une ligne ouvre sa conversation en feuille ;
   · au poste, la conversation se pose à droite de la liste (Discord,
     Slack), et ↑ ↓ passent de l'une à l'autre.
   L'onglet porte le nombre de conversations qui attendent. Appui long
   (clic droit, touche menu) : épingler, couper le son, marquer comme lu.

   Rien de plus ne sort : la liste se construit avec ce que l'appareil a
   déjà, scellé. Pas d'aperçu de lien, pas de « vu », pas de « en train
   d'écrire » — trois choses que les messageries font et qui disent à
   d'autres quand on regarde (docs/reseau.md, décision 37).
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { FILS_KEY, kvGet, kvSet } from '../engine/storage.js';
import { prefsVides, normaliserPrefs, boite, filtrer, filtresUtiles, filtreVide, aLire, chiffreOnglet,
         basculerEpingle, basculerMuet, renommerFil, oublierFil, cleFil } from '../engine/conversations.js';
import { S, bus, isClosed, lot } from './state.js';
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

/* ---------- LE CHIFFRE DES ONGLETS ----------
   « Échanger 3 » : trois CONVERSATIONS attendent, quel que soit le
   nombre de messages ; celles dont on a coupé le son n'y entrent pas.
   « Aujourd'hui 2 » : deux actions prévues aujourd'hui ou déjà passées.
   Le chiffre se lit aussi à voix haute : il entre dans le nom de
   l'onglet. */
const aFaire = () => {
  const t = todayISO();
  return S.companies.filter(c => !isClosed(c) && !c.demo && c.nextAction && c.nextAction <= t).length;
};
const NOMS = { aujourdhui: 'Aujourd’hui', echanger: 'Échanger', reseau: 'Réseau' };
function poser(route, n, dit){
  document.querySelectorAll(`nav [data-r="${route}"]`).forEach(lien => {
    let b = lien.querySelector('.nav-n');
    if (!b){
      b = document.createElement('span');
      b.className = 'nav-n';
      b.setAttribute('aria-hidden', 'true');
      lien.append(b);
    }
    b.textContent = chiffreOnglet(n);
    b.hidden = !n;
    lien.setAttribute('aria-label', NOMS[route] + (n ? ', ' + dit : ''));
  });
}
export function majOnglets(){
  const n = aLire(rangsBoite());
  poser(lot('reseau') ? 'reseau' : 'echanger', n, `${n} conversation${n > 1 ? 's' : ''} non lue${n > 1 ? 's' : ''}`);
  const a = aFaire();
  poser('aujourdhui', a, `${a} action${a > 1 ? 's' : ''} à faire`);
}

/* ---------- la liste ---------- */
let filtre = 'tout';
let selCle = '';          /* au poste : la conversation posée à droite */
export const conversationChoisie = () => selCle;
/* aller lire une conversation là où elle vit : « Échanger », posée à
   droite de la boîte (au poste) — depuis la fiche d'un ami, par exemple */
export function ouvrirDansBoite(sorte, id){
  selCle = cleFil(sorte, id);
  filtre = 'tout';
  const ici = lot('reseau') ? 'reseau' : 'echanger';
  if (new RegExp('^#\\/' + ici + '\\b').test(location.hash)) bus.refresh();
  else location.hash = '#/' + ici;
}
const MOTS_FILTRE = { tout: 'Tout', nonlus: 'Non lus', groupes: 'Groupes', amis: 'Amis' };

function ligneHTML(r, sel){
  const tete = r.sorte === 'groupe' ? blasonHTML(r.nom, 'bx-vz') : visageHTML(r.id, 'bx-vz');
  const etat = [r.n ? `${r.n} nouveau${r.n > 1 ? 'x' : ''}` : '', r.cite ? `on t’y nomme` : '',
    r.epingle ? 'épinglée' : '', r.muet ? 'son coupé' : ''].filter(Boolean);
  const dedans =
    `${tete}
     <span class="bx-m"><b class="bx-n">${esc(r.nom)}</b><span class="bx-p">${r.apercu ? esc(r.apercu) : 'Aucun message pour l’instant'}</span></span>
     <span class="bx-d"><time>${esc(r.attente ? '' : quandListe(r.at))}</time>
       <span class="bx-i">${r.muet ? ic('bell-off', 'ic-14') : ''}${r.epingle ? ic('bookmark', 'ic-14') : ''}${
         r.cite ? '<span class="bx-at" aria-hidden="true">@</span>' : ''}${
         r.n ? `<span class="bx-c">${r.n > 99 ? '99+' : r.n}</span>` : ''}</span></span>`;
  /* un groupe où l'on a demandé à entrer : une ligne qui ne s'ouvre pas
     encore — « en attente » à la place du dernier message, et une seule fois */
  if (r.attente) return `<div class="bx-l bx-attente" role="listitem">${dedans}</div>`;
  const aria = [r.nom, ...etat, r.apercu].filter(Boolean).join(', ');
  return `<div role="listitem"><button class="bx-l${r.n ? ' bx-nonlu' : ''}${sel ? ' bx-sel' : ''}" data-fil="${esc(r.cle)}"${
    r.sorte === 'groupe' ? ` data-groupe="${esc(r.id)}"` : ` data-ami="${esc(r.id)}"`}${sel ? ' aria-current="true"' : ''} aria-label="${esc(aria)}">${dedans}</button></div>`;
}
export function boiteHTML(wide){
  const tous = rangsBoite();
  const offerts = filtresUtiles(tous);
  /* un filtre qui ne montre plus rien rend la liste entière : on ne
     reste jamais devant un cadre vide après avoir lu le dernier non-lu */
  if (!offerts.includes(filtre) || filtreVide(tous, filtre)) filtre = 'tout';
  const rangs = filtrer(tous, filtre);
  if (wide && !rangs.some(r => r.cle === selCle && !r.attente)) selCle = (rangs.find(r => !r.attente) || {}).cle || '';
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
         rangs.map(r => ligneHTML(r, wide && r.cle === selCle)).join('')}
         ${/* « MES AMIS », une ligne de la liste (R1, décision 0002) : les
              amis quittent « Pistes » pour vivre avec leurs conversations.
              Elle se lit comme une rangée qui mène (son chevron, son
              compte), pas comme un geste en encre sourde. */
           lot('reseau') ? item(`<button class="bx-amis" id="bxAmis">${ic('users', 'ic-14')}<span class="bx-amis-l">Mes amis</span>${
             nAmis ? `<span class="bx-amis-n">${nAmis}</span>` : ''}${ic('chevron-right', 'ic-14')}</button>`) : ''}
         ${/* les deux façons d'en commencer une — en encre sourde, en dernier :
              la ligne « Ajouter un compte » d'iOS */''}
         ${ecrire ? item(`<button class="bx-plus" id="bxEcrire">${ic('message-text', 'ic-14')} Écrire à un ami</button>`) : ''}
         ${plein ? '' : item(`<button class="bx-plus" id="ecGrNeuf">${ic('plus', 'ic-14')} Nouveau groupe</button>`)}
       </div>`
  };
}

/* ---------- ouvrir une conversation ---------- */
function ouvrir(r, { dans, apres } = {}){
  if (!r || r.attente) return;
  if (r.sorte === 'groupe') return ouvrirGroupe(r.id, apres, { dans });
  const a = (S.profile.amis || []).find(x => x.id === r.id);
  if (a) return ouvrirConversation(a, apres, { dans });
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

/* la liste, branchée. `volet` : au poste, l'endroit où se pose la
   conversation choisie ; au pouce, rien — une ligne ouvre sa feuille. */
export function bindBoite(root, { volet, rendre }){
  const liste = root.querySelector('.bx-liste');
  if (!liste) return;
  const tous = () => rangsBoite();
  root.querySelectorAll('[data-filtre]').forEach(b => b.addEventListener('click', () => {
    filtre = b.dataset.filtre;
    rendre();
    const n = filtrer(tous(), filtre).length;
    annoncer(`${n} conversation${n > 1 ? 's' : ''}.`);
  }));
  const choisir = (cle, focus) => {
    const r = tous().find(x => x.cle === cle);
    if (!r || r.attente) return;
    if (!volet){ ouvrir(r, { apres: rendre }); return; }
    selCle = cle;
    liste.querySelectorAll('.bx-l[data-fil]').forEach(b => {
      const on = b.dataset.fil === cle;
      b.classList.toggle('bx-sel', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    /* la conversation déjà posée ne se rouvre pas : elle perdrait ce
       qu'on y tapait */
    if (volet.querySelector(':scope > .dock')?.dataset.fil !== cle && enCours !== cle) poserDans(volet, r);
    /* le focus reste sur la ligne (Safari ne le donne pas au clic), et
       tout le côté droit qui change se DIT : il change sans le focus
       (WCAG 4.1.3) */
    if (focus) focus.focus();
    annoncer(r.sorte === 'groupe' ? `Groupe ${r.nom}.` : `Conversation avec ${r.nom}.`);
  };
  liste.querySelectorAll('.bx-l[data-fil]').forEach(b => {
    b.addEventListener('click', () => choisir(b.dataset.fil, b));
    appuiLong(b, () => { const r = tous().find(x => x.cle === b.dataset.fil); if (r) menuFil(r, rendre); });
  });
  /* LE CLAVIER, au poste : ↑ ↓ passent d'une conversation à l'autre, et
     la conversation suit (le motif liste-détail, WAI-ARIA APG) */
  if (volet) liste.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...liste.querySelectorAll('.bx-l[data-fil]')];
    const ici = rows.indexOf(document.activeElement);
    const suiv = rows[(ici < 0 ? rows.findIndex(r => r.dataset.fil === selCle) : ici) + (e.key === 'ArrowDown' ? 1 : -1)];
    if (!suiv) return;
    e.preventDefault();
    choisir(suiv.dataset.fil, suiv);
  });
  /* au poste, une conversation qui a sa ligne se pose à droite ; une
     conversation NEUVE s'ouvre en feuille — sans ligne pour la tenir, le
     prochain rendu de la liste la remplacerait par une autre. Le premier
     message parti, elle a sa ligne. */
  const ouvrirAmi = a => {
    const cle = cleFil('ami', a.id);
    if (!volet || !tous().some(r => r.cle === cle)){ ouvrirConversation(a, rendre); return; }
    choisir(cle, liste.querySelector(`[data-fil="${CSS.escape(cle)}"]`));
  };
  root.querySelector('#bxEcrire')?.addEventListener('click', () => ouvrirEcrire(ouvrirAmi));
  root.querySelector('#bxAmis')?.addEventListener('click', async () =>
    (await import('./amis.js')).openMesAmis(rendre));
  const neuf = root.querySelector('#ecGrNeuf');
  neuf?.addEventListener('click', () => ouvrirNouveauGroupe(rendre, 'Nouveau groupe'));
  /* au poste, la conversation choisie se pose — une seule fois : un
     nouveau rendu de la liste ne la rouvre pas (la boîte se redessine
     à chaque message reçu, la conversation garde son fil et son champ) */
  if (volet && selCle){
    const deja = volet.querySelector(':scope > .dock');
    if ((!deja || deja.dataset.fil !== selCle) && enCours !== selCle) poserDans(volet, tous().find(x => x.cle === selCle));
  }
}
/* poser une conversation dans le volet. Ouvrir la marque lue, ce qui
   redessine la boîte AVANT que l'ouverture soit finie : `enCours` dit
   au rendu qui suit qu'elle est déjà en route — sans lui, il la
   rouvrirait, et chaque ouverture en relancerait une autre. */
let enCours = '';
function poserDans(volet, r){
  if (!r) return;
  enCours = r.cle;
  Promise.resolve(ouvrir(r, { dans: volet })).finally(() => {
    const d = volet.querySelector(':scope > .dock');
    if (d && enCours === r.cle) d.dataset.fil = r.cle;
    if (enCours === r.cle) enCours = '';
  });
}
