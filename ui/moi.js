/* ============================================================
   OpenContact — interface · « Moi »
   Ce qui n'appartient qu'à l'utilisateur : profil (remplit les
   emails), CV & lettre en PDF (IndexedDB, séparés des pistes),
   modèles d'emails, sauvegarde complète (mot de passe optionnel),
   restauration, aide condensée — et le coup de pouce IA, rangé
   ici sans faire d'ombre au reste.
   ============================================================ */
import { normalizeCompany, normalizeContact, normalizeProfile, APP_VERSION } from '../engine/model.js';
import { fullPayload, parseInput } from '../engine/exchange.js';
import { encryptOC2 } from '../engine/crypto.js';
import { fmtSize, todayISO, esc } from '../engine/utils.js';
import { mergeTombs } from '../engine/sync.js';
import { docGet, docPut } from '../engine/storage.js';
import { listDocs, docKind, docTitle, pickPdf, removeDoc } from './docs.js';
import { S, bus, saveData, saveProfile, saveOrphans, saveTombs, logJ } from './state.js';
import { $, ic, toast, btn, openSheet, confirmSheet, showUndo, bindDeleteGesture,
         lockRowHTML, bindLockRow } from './dom.js';
import { openProfil, openTemplates } from './profil.js';
import { openAppareils } from './direct.js';
import { getSync } from './synclive.js';
import { isProtected, openProtectFlow, openManageSheet, verrouLabel, requireCode } from './verrou.js';
import { openConnexions, openAssistantIA, mailStateLabel, mailAccount, aiStateLabel, aiConnection } from './connexions.js';
import { loadCompanion, openAddCompanion, openCompanionSheet } from './compagnon.js';
import { COMPAGNON, IA, ENVOI_DIRECT } from './perimetre.js';
import { openDiagnostic } from './diagnostic.js';
import { DIST_PAGE } from '../engine/distribution.js';

/* ---------- garder une copie (.oc complet) ---------- */
export function downloadBackup(pass){
  const doIt = async () => {
    const payload = fullPayload(S.companies, S.profile, S.orphans, S.tombs);
    const txt = pass ? await encryptOC2(payload, pass) : JSON.stringify(payload);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' }));
    a.download = 'opencontact-copie-' + todayISO() + '.oc';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    /* Plus rien ne l'AFFICHE (l'état de la carte est parti le 4 août 2026),
       mais on continue de l'écrire : c'est un fait daté, il voyage déjà
       dans le `.oc` et la sync, et le jour où un état revient il repart
       d'une vraie date au lieu d'une ardoise vide. */
    S.profile.flags.lastBackupAt = Date.now();
    saveProfile();
    logJ('Copie téléchargée' + (pass ? ' (chiffrée)' : ''));
    /* dire lequel des deux : un champ ouvert mais laissé vide donne une
       copie en clair — le retour ne doit pas laisser croire l'inverse */
    toast(pass ? 'Copie chiffrée ✓' : 'Copie gardée ✓');
    bus.refresh();
  };
  return doIt();
}

/* ---------- restauration (remplace tout, annulable ~30 s) ---------- */
function restoreFile(file){
  const r = new FileReader();
  r.onload = () => treatRestore(String(r.result));
  r.readAsText(file);
}
async function treatRestore(raw, pass){
  let obj;
  try {
    obj = await parseInput(raw, pass);
  } catch (e) {
    if (e.message === 'besoinpass' || e.message === 'motdepasse'){
      if (e.message === 'motdepasse') toast('Mot de passe incorrect.');
      askRestorePass(raw);
      return;
    }
    toast(e.message === 'format' ? 'Ce fichier n’est pas une copie OpenContact.' : 'Lecture impossible : ' + e.message);
    return;
  }
  if (obj.kind === 'share'){
    toast('Un partage, pas une copie : ouvre-le dans Échanger → Recevoir.');
    return;
  }
  const n = obj.companies.length;
  const cur = S.companies.length;
  const ok = await confirmSheet({
    title: 'Restaurer cette copie ?', icon: 'reload', danger: true, okLabel: 'Tout remplacer',
    msg: `Le fichier contient <b>${n} piste${n > 1 ? 's' : ''}</b>${obj.profile ? ', le profil' : ''}${obj.orphans ? ', ' + obj.orphans.length + ' contact(s) à rattacher' : ''}.<br>
          Ta base actuelle (<b>${cur} piste${cur > 1 ? 's' : ''}</b>) sera <b>entièrement remplacée</b>.`
    /* « — annulable pendant 30 secondes » est parti : la barre Annuler
       arrive deux secondes plus tard et le dit elle-même. Ce qui reste
       ici est ce qu'on ne peut PAS deviner — combien de pistes dans le
       fichier, combien on en a. C'est ça qui justifie la question. */
  });
  if (!ok) return;
  const snap = {
    companies: JSON.stringify(S.companies),
    profile: JSON.stringify(S.profile),
    orphans: JSON.stringify(S.orphans),
    tombs: JSON.stringify(S.tombs)
  };
  S.companies = obj.companies.map(normalizeCompany);
  if (obj.profile) S.profile = normalizeProfile(obj.profile);
  S.orphans = Array.isArray(obj.orphans) ? obj.orphans.map(normalizeContact) : [];
  /* les suppressions repartent de la sauvegarde : sans ça, une vieille
     pierre tombale re-supprimerait une piste restaurée à la sync suivante */
  S.tombs = mergeTombs(Array.isArray(obj.tombs) ? obj.tombs : [], []);
  saveData(); saveProfile(); saveOrphans(); saveTombs();
  logJ('Copie restaurée : ' + n + ' piste(s)');
  bus.refresh();
  showUndo(`${ic('check', 'ic-14')} Restauré : ${n} piste${n > 1 ? 's' : ''}.`, () => {
    S.companies = JSON.parse(snap.companies).map(normalizeCompany);
    S.profile = normalizeProfile(JSON.parse(snap.profile));
    S.orphans = JSON.parse(snap.orphans).map(normalizeContact);
    S.tombs = mergeTombs(JSON.parse(snap.tombs), []);
    saveData(); saveProfile(); saveOrphans(); saveTombs();
    logJ('Restauration annulée');
    bus.refresh();
    toast('Restauration annulée');
  });
}
function askRestorePass(raw){
  const sh = openSheet({ title: 'Copie protégée', icon: 'lock', focus: '#rsPass' });
  sh.body.innerHTML =
    `<div class="field"><label for="rsPass">Mot de passe de la copie</label>
       <input id="rsPass" type="password" autocomplete="off"></div>`;
  const go = () => { const p = sh.body.querySelector('#rsPass').value; sh.close(); treatRestore(raw, p); };
  sh.body.querySelector('#rsPass').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  sh.setFoot([btn('Déverrouiller', 'btn-primary', go)]);
}

/* ---------- CV & lettres : deux tiroirs (#4) ----------
   La carte ne montre que deux lignes — « CV » et « Lettres » — quel que
   soit le nombre de documents : elle ne grandit plus. Taper une ligne
   ouvre la liste de ce type, où vivent l'ajout et les gestes. */
const DOC_KINDS = {
  cv: { label: 'CV', add: 'Ajouter un CV', vide: 'Ton CV partira avec tes emails.' },
  lm: { label: 'Lettres', add: 'Ajouter une lettre', vide: 'Ta lettre partira avec tes emails.' }
};

function openDocs(kind, onChange){
  const k = DOC_KINDS[kind];
  const sh = openSheet({ title: k.label, icon: 'attachment' });
  const render = async () => {
    const docs = (await listDocs()).filter(d => docKind(d.key) === kind);
    if (!sh.body.isConnected) return;
    sh.body.innerHTML = docs.length
      ? docs.map(d =>
          `<div class="doc-row" data-key="${esc(d.key)}">
             <div class="sw-in">
               <div class="doc-name" role="button" tabindex="0" aria-label="Voir ${esc(docTitle(d))}">${esc(docTitle(d))}</div>
               <span class="doc-size">${fmtSize(d.size)}</span>
             </div>
           </div>`).join('')
      : `<p class="doc-vide">${k.vide}</p>`;
    /* taper le nom ouvre le PDF */
    sh.body.querySelectorAll('.doc-name').forEach(m => {
      const open = async () => {
        const doc = await docGet(m.closest('.doc-row').dataset.key).catch(() => null);
        if (!doc) return;
        const url = URL.createObjectURL(new Blob([doc.blob], { type: doc.type || 'application/pdf' }));
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      };
      m.addEventListener('click', open);
      m.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }
      });
    });
    /* retirer : glisser au doigt, poubelle au survol à la souris, jamais
       de confirmation — la barre « Annuler » rattrape 30 s et le PDF est
       gardé de côté le temps de la barre (CLAUDE.md §6) */
    sh.body.querySelectorAll('.doc-row').forEach(row => {
      const d = docs.find(x => x.key === row.dataset.key);
      if (!d) return;
      bindDeleteGesture(row, async () => {
        await removeDoc(d.key).catch(() => {});
        render();
        if (onChange) onChange();
        showUndo(`${ic('check', 'ic-14')} « ${esc(docTitle(d))} » retiré.`, async () => {
          const { key, ...val } = d;
          await docPut(key, val).catch(() => {});
          render();
          if (onChange) onChange();
          toast('Document restauré.');
        });
      }, docTitle(d));
    });
    if (onChange) onChange();
  };
  sh.setFoot([btn(k.add, 'btn-primary', () => pickPdf(kind, render), 'plus')]);
  render();
}

async function renderDocs(){
  const box = $('#moiDocs');
  if (!box) return;
  const docs = await listDocs();
  const kinds = Object.keys(DOC_KINDS);
  /* la même ligne que partout (`rg-row`) : « doc-door » était son sosie,
     avec ses propres classes et sa propre CSS pour rien */
  box.innerHTML = kinds.map((kind, i) => {
    const n = docs.filter(d => docKind(d.key) === kind).length;
    return `<button class="rg-row${i === kinds.length - 1 ? ' rg-last' : ''}" data-kind="${kind}">
              <span class="rg-n">${DOC_KINDS[kind].label}</span>
              <span class="rg-s">${n ? n + ' document' + (n > 1 ? 's' : '') : 'aucun'}</span>
              ${ic('chevron-right', 'ic-14')}
            </button>`;
  }).join('');
  box.querySelectorAll('[data-kind]').forEach(b =>
    b.addEventListener('click', () => openDocs(b.dataset.kind, renderDocs)));
}

/* ---------- l'écran : Profil & données + Réglages (#20) ---------- */
function syncLabel(){
  const sy = getSync();
  if (!sy.phrase) return 'non relié';
  if (sy.state === 'on') return sy.peers + ' relié' + (sy.peers > 1 ? 's' : '');
  if (sy.state === 'link') return 'premier échange…';
  if (sy.state === 'err' || sy.state === 'norelay') return 'pas de connexion';
  if (sy.state === 'rtcfail') return 'rien ne passe';
  return 'en attente';
}
/* L'état de la copie (« aucune copie », « N pistes depuis ta copie »,
   « à jour », « en double ») est RETIRÉ — décision du mainteneur, 4 août
   2026. C'était la décision #4 : un compteur qui pousse au geste. Il
   poussait à chaque passage, et la carte porte déjà son verbe.
   `lastBackupAt` continue d'être écrit (voir `downloadBackup`) : c'est un
   fait, pas un affichage — le jour où un état revient ici, il ne repart
   pas d'une ardoise vide. */

/* les lignes de Réglages — des portes, plus des boutons (#7) : la ligne
   entière se tape, le réglage s'ouvre dans sa feuille. C'est la décision
   #21 (« le nom d'abord, l'écran ensuite ») et la même grammaire que les
   tiroirs CV / Lettres. Messagerie et IA exigent le code : sans
   protection, l'ÉTAT dit le vrai premier geste — « à protéger » — et
   taper mène quand même à la protection (N9 reste réglé).

   PAS de pictogramme : on scanne une liste par ses deux premiers mots à
   gauche (NN/g), et l'icône les repoussait de 22 px — assez pour que
   « Mes appareils » passe à deux lignes sur un vrai téléphone. Une icône
   aide quand elle éclaire un libellé obscur ; ici les libellés sont
   clairs, elle ne faisait que prendre la place. */
const rgRow = (id, nom, etat, last, dep) =>
  `<button class="rg-row${last ? ' rg-last' : ''}${dep ? ' rg-dep' : ''}" id="${id}">
     <span class="rg-n">${nom}</span>
     <span class="rg-s"${id === 'moiSync' ? ' id="moiSyncSt"' : (id === 'moiComp' ? ' id="moiCompSt"' : '')}>${etat}</span>
     ${ic('chevron-right', 'ic-14')}
   </button>`;

function reglagesRowsHTML(){
  const prot = isProtected();
  /* les lignes se composent avant de s'écrire : le recentrage en retire
     (CLAUDE.md §0), et c'est la DERNIÈRE présente qui porte `rg-last` —
     sinon masquer le Compagnon laisserait un trait en bas de liste */
  const rows = [
    ['moiVerrou', 'Protection', verrouLabel(), false],
    ['moiSync', 'Mes appareils', syncLabel(), false]
  ];
  /* le pré-requis ne remplace l'état que s'il n'y a rien à dire : une
     messagerie déjà branchée le dit, même si le coffre a disparu.
     Deux lignes attendaient la MÊME chose et le disaient chacune dans
     son coin (« à protéger », deux fois) : rien ne montrait que c'est
     la ligne du dessus qui les débloque toutes les deux. Elles nomment
     donc leur cause et s'effacent tant qu'elle n'est pas levée — taper
     mène quand même à la protection (N9 reste réglé). */
  if (ENVOI_DIRECT) rows.push(['moiCx', 'Ma messagerie',
    (!prot && !mailAccount()) ? 'après Protection' : mailStateLabel(),
    !prot && !mailAccount()]);
  if (IA) rows.push(['moiAi', 'Mon assistant IA',
    (!prot && !aiConnection()) ? 'après Protection' : aiStateLabel(),
    !prot && !aiConnection()]);
  /* l'état, pas la phrase : « il s'installe sur ton ordinateur » se
     dit sur le 2ᵉ écran, là où on peut vraiment le faire (#21).
     Cette liste reste sans pictogramme (voir plus haut) ; le Compagnon
     a son icône propre — un écran d'ordinateur — sur SES feuilles,
     là où elle distingue quelque chose (#4). */
  if (COMPAGNON) rows.push(['moiComp', 'Le Compagnon', 'pas installé', false]);
  /* Sans compte ni analytique, une app locale ne renvoie rien : le
     seul chemin de retour est un texte que l'étudiant copie lui-même
     (docs/roadmap.md §3).
     SANS état : la ligne portait le numéro de version, il est parti
     avec lui. En ligne, OpenContact est une seule app à une seule
     adresse — un numéro n'y distingue plus rien, il se lisait juste
     à chaque passage dans les réglages. */
  rows.push(['moiDiag', 'Signaler un problème', '', false]);
  return (
    rows.map(([id, nom, etat, dep], i) =>
      rgRow(id, nom, etat, i === rows.length - 1, dep)).join('') +
    `<div class="rg-foot">
       <button class="linklike" id="moiRestore">${ic('reload', 'ic-14')} Restaurer une copie</button>
       <input type="file" id="moiRestoreFile" accept=".oc,.txt,.json,application/octet-stream,application/json,text/plain" hidden>
     </div>`);
}
/* l'état du lien vit : peers, liaison, rupture */
function bindSyncLive(root){
  if (root.__onSync) document.removeEventListener('oc:sync', root.__onSync);
  root.__onSync = () => {
    if (root.hidden){ document.removeEventListener('oc:sync', root.__onSync); root.__onSync = null; return; }
    const lbl = root.querySelector('#moiSyncSt');
    if (lbl) lbl.textContent = syncLabel();
  };
  document.addEventListener('oc:sync', root.__onSync);
}

function bindReglages(box){
  const q = s => box.querySelector(s);
  q('#moiVerrou').addEventListener('click', () =>
    isProtected() ? openManageSheet() : openProtectFlow());
  q('#moiSync').addEventListener('click', openAppareils);
  /* N9 : l'état a dit « à protéger d'abord » — la ligne y mène tout droit.
     Les trois lignes suivantes peuvent être absentes (CLAUDE.md §0) : on
     branche ce qui existe, jamais ce qui devrait exister. */
  q('#moiCx')?.addEventListener('click', () =>
    isProtected() ? openConnexions() : openProtectFlow());
  q('#moiAi')?.addEventListener('click', () =>
    isProtected() ? openAssistantIA() : openProtectFlow());
  q('#moiComp')?.addEventListener('click', async () => {
    const assoc = await loadCompanion().catch(() => null);
    if (assoc){ openCompanionSheet(assoc); return; }
    if (mqWideMoi.matches){ openAddCompanion(); return; }
    try {
      await navigator.clipboard.writeText(DIST_PAGE);
      toast('Lien copié — ouvre-le sur ton ordinateur.');
    } catch (e) { toast('Copie impossible ici — le lien : ' + DIST_PAGE); }
  });
  if (COMPAGNON) loadCompanion().then(a => {
    const st = q('#moiCompSt');
    if (a && st) st.textContent = 'associé — ' + (a.nom || 'ton ordinateur');
  }).catch(() => {});
  q('#moiDiag').addEventListener('click', openDiagnostic);
  const rf = q('#moiRestoreFile');
  /* restaurer = rare et sensible (#4) : rangé ici, le code d'abord */
  q('#moiRestore').addEventListener('click', async () => {
    if (await requireCode('Ton code, pour restaurer')) rf.click();
  });
  rf.addEventListener('change', () => { if (rf.files[0]) restoreFile(rf.files[0]); });
}

/* mobile : Réglages est le 2ᵉ écran de « Moi » (la porte #20) — un vrai
   écran re-rendu par bus.refresh, jamais une feuille qui gèlerait ses états */
let reglagesOpen = false;
const mqWideMoi = matchMedia('(min-width:901px)');
mqWideMoi.addEventListener('change', () => { if (S.route === 'moi') renderMoi(); });

/* Revenir de Réglages : le chevron le fait, mais il vit dans le coin le
   plus dur à atteindre au pouce. Deux chemins s'y ajoutent — jamais ne le
   remplacent (Apple HIG : un geste complète un bouton visible) :
   · retaper « Moi » dans la barre du bas, comme un onglet iOS qu'on
     retape pour remonter à sa racine — c'est la zone la plus facile ;
   · glisser depuis le bord gauche. */
export function closeReglages(){
  if (!reglagesOpen) return false;
  reglagesOpen = false;
  renderMoi();
  return true;
}
function bindEdgeBack(root){
  let x0 = null, y0 = null;
  root.addEventListener('touchstart', e => {
    const t = e.touches[0];
    x0 = t.clientX <= 24 ? t.clientX : null;   /* depuis le bord seulement */
    y0 = t.clientY;
  }, { passive: true });
  root.addEventListener('touchend', e => {
    if (x0 == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = Math.abs(t.clientY - y0);
    x0 = null;
    if (dx > 60 && dy < 50) closeReglages();
  });
}

export function renderMoi(){
  const root = $('#view-moi');
  const wide = mqWideMoi.matches;

  if (!wide && reglagesOpen){
    root.innerHTML =
      `<div class="page-inner">
         <div class="td-head td-back">
           <button class="abtn" id="moiBack" aria-label="Retour à Moi">${ic('chevron-left', 'ic-14')}</button>
           <h1>Réglages</h1>
         </div>
         ${/* La version ne flotte plus seule en bas : elle est l'ÉTAT de
              « Signaler un problème », dans la liste. C'est le même
              chiffre, à l'endroit où on le cherche — quand ça cloche. */''}
         <fieldset class="fset fset-plain">${reglagesRowsHTML()}</fieldset>
       </div>`;
    root.querySelector('#moiBack').addEventListener('click', closeReglages);
    bindEdgeBack(root);
    bindReglages(root);
    bindSyncLive(root);
    return;
  }

  const p = S.profile;
  const pReady = p.name && p.email;
  const showBackup = !!(S.companies.length || p.name);   /* rien à copier = carte absente */

  /* « Moi » est une FEUILLE DE PROPRIÉTÉS, pas une pile de cartes.
     Trois règles d'origine, appliquées telles quelles :
     · « put the object's name on the first page » + l'icône en haut à
       gauche → la page dit d'abord QUI, au lieu d'une carte « Mon profil »
       dont le bouton répétait le titre ;
     · « group boxes are visually heavy… use sparingly » et « only when the
       group doesn't contain all controls on the surface » → quatre cartes
       deviennent deux cadres, rangés par usage et non par objet ;
     · « buttons that apply only to a page go on the page » → « Télécharger »
       reste DANS son groupe, il ne descend pas en pied de page. */
  const objet =
    /* Ce qui est rempli s'AFFICHE, tout de suite. L'écran exigeait le nom
       ET l'email pour montrer quoi que ce soit : on tapait son nom, et
       l'écran répondait par la même phrase d'accueil, comme si rien
       n'avait été saisi. Dès qu'il y a un nom, c'est lui qu'on lit — et
       la phrase, qui n'avait plus rien à apprendre, s'en va.
       Ce qui manque ne se signale PAS : ni pastille, ni phrase. Remplir
       son profil n'est pas urgent, et une marque sur cet écran pèserait
       autant qu'un retard de relance sans rien coûter si on l'ignore.
       C'est le VERBE du bouton qui porte l'écart — « Compléter » tant
       qu'il reste quelque chose, « Modifier » ensuite : un mot, pas un
       objet de plus. */
    `<div class="obj">
       ${ic('user', 'ic-24')}
       <div class="obj-m">
         ${p.name
           ? `<span class="obj-n">${esc(p.name)}</span>
              ${/* une ligne par donnée, et chacune se coupe à sa fin. Jointes
                   par <br> dans un bloc en `overflow-wrap:anywhere`, elles se
                   brisaient n'importe où : sur un 360, l'adresse rendait
                   « …ounchiouene@example » puis « .fr » seul sur sa ligne. */''}
              <div class="obj-s">${[p.formation, p.email].filter(Boolean)
                 .map(v => `<span class="obj-l" title="${esc(v)}">${esc(v)}</span>`).join('')}</div>`
           : `<p class="obj-empty">Ton nom, ta formation, ton email remplissent
                chaque email que tu envoies.</p>
              <button class="btn btn-sm btn-primary" id="moiProfil">Remplir mon profil</button>`}
       </div>
       ${p.name ? `<button class="btn btn-sm" id="moiProfil">${pReady ? 'Modifier' : 'Compléter'}</button>` : ''}
     </div>`;

  const envoi =
    `<fieldset class="fset">
       <legend>Ce que j’envoie</legend>
       <button class="rg-row" id="moiTpl">
         <span class="rg-n">Modèles d’emails</span>
         <span class="rg-s">${p.templates.length}</span>
         ${ic('chevron-right', 'ic-14')}
       </button>
       <div id="moiDocs"></div>
     </fieldset>`;

  /* Le bord ambre part avec l'état qu'il soulignait : un cadre qui crie
     sans qu'aucun mot ne dise pourquoi serait pire que les deux. La
     classe `.fs-alert` reste au kit (CLAUDE.md §6), simplement plus
     posée ici.
     « privé inclus » reste — c'est la seule chose que la carte ne peut
     PAS dire autrement : ce fichier emporte le suivi privé, et ça se
     sait avant de l'envoyer à quelqu'un. Il monte simplement DANS la
     légende, où il ne coûte plus sa propre ligne : un cadre nommé
     « Ma copie » a de la place à droite de son nom, et l'étiquette y
     qualifie ce qu'elle nomme au lieu de flotter au-dessus du geste. */
  const copie = showBackup ? `
     <fieldset class="fset">
       <legend>Ma copie <span class="lg-note">${ic('lock', 'ic-14')} privé inclus</span></legend>
       ${lockRowHTML({ id: 'moiBk', action: 'Télécharger' })}
     </fieldset>` : '';

  /* « General first, Advanced last » : les réglages ferment la page.
     Au pouce c'est une porte ; à la souris, la 2ᵉ colonne les déplie. */
  const reglages = `<fieldset class="fset">
       <legend>Réglages</legend>
       ${reglagesRowsHTML()}
     </fieldset>`;

  root.innerHTML =
    `<div class="page-inner${wide ? ' page-wide' : ''}">
       <div class="td-head"><h1>Moi</h1>
         <div class="td-date td-lock" title="privé — jamais partagé" aria-label="privé — jamais partagé">${ic('lock', 'ic-14')}</div></div>
       ${wide
         ? `<div class="moi-cols"><div>${objet}${envoi}${copie}</div><div>${reglages}</div></div>`
         : objet + envoi + copie +
           `<button class="rg-row rg-last moi-rg" id="moiReglages">
              <span class="rg-n">Réglages</span>
              <span class="rg-s">${verrouLabel()}</span>
              ${ic('chevron-right', 'ic-14')}
            </button>`}
       ${/* La barre de statut qui portait la version est masquée au pouce :
            sur téléphone, RIEN ne disait quelle version tournait. Il
            fallait chercher un détail d'interface pour deviner si la mise
            à jour était passée — on a perdu des heures là-dessus. */''}
       <p class="moi-ver">OpenContact ${APP_VERSION}</p>
     </div>`;

  root.querySelector('#moiProfil').addEventListener('click', () => openProfil());
  root.querySelector('#moiTpl').addEventListener('click', openTemplates);
  /* le mot de passe est facultatif : au repos il ne pèse qu'un bouton
     compact au bout de la ligne (#8 — l'avancé se replie derrière un
     signe, jamais une phrase). Tapé, il s'étire en champ ; re-tapé, il
     se referme et l'oublie. Un seul contrôle, deux états (#19-4). */
  const bk = root.querySelector('#moiBk') ? bindLockRow(root, 'moiBk') : null;
  root.querySelector('#moiBkDo')?.addEventListener('click', () => downloadBackup(bk.value()));
  if (wide) bindReglages(root);
  else root.querySelector('#moiReglages').addEventListener('click', () => {
    reglagesOpen = true;
    renderMoi();
    root.scrollTop = 0;
  });
  bindSyncLive(root);
  renderDocs();
}
