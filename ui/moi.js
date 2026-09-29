/* ============================================================
   OpenContact — interface · « Moi »
   Ce qui n'appartient qu'à l'utilisateur : profil (remplit les
   emails), CV & lettre en PDF (IndexedDB, séparés des pistes),
   modèles d'emails, sauvegarde complète (mot de passe optionnel),
   restauration, aide condensée — et le coup de pouce IA, rangé
   ici sans faire d'ombre au reste.
   ============================================================ */
import { normalizeCompany, normalizeContact, normalizeProfile, APP_VERSION,
         resumeRecherche, manquesProfil } from '../engine/model.js';
import { fullPayload, parseInput } from '../engine/exchange.js';
import { encryptOC2 } from '../engine/crypto.js';
import { fmtSize, todayISO, esc } from '../engine/utils.js';
import { mergeTombs } from '../engine/sync.js';
import { docGet, docPut, effacerCetAppareil } from '../engine/storage.js';
import { sansFilet, FILET_MIN_PISTES } from '../engine/assist.js';
import { listDocs, docKind, docTitle, pickPdf, removeDoc } from './docs.js';
import { S, bus, saveData, saveProfile, saveOrphans, saveTombs, logJ } from './state.js';
import { $, ic, toast, btn, openSheet, confirmSheet, showUndo, bindDeleteGesture,
         lockRowHTML, bindLockRow } from './dom.js';
import { openProfil, openTemplates } from './profil.js';
import { openAppareils } from './direct.js';
import { getSync, loadDevices } from './synclive.js';
import { isProtected, openProtectFlow, openManageSheet, verrouLabel, requireCode } from './verrou.js';
import { openConnexions, openAssistantIA, mailStateLabel, mailAccount, aiStateLabel, aiConnection } from './connexions.js';
import { loadOrdinateur, openAddOrdinateur, openOrdinateurSheet } from './ordinateur.js';
import { ORDINATEUR, IA, ENVOI_DIRECT } from './perimetre.js';
import { openDiagnostic } from './diagnostic.js';
import { DIST_PAGE } from '../engine/distribution.js';

/* ---------- garder une copie (.oc complet) ----------
   UNE COPIE VAUT PAR L'ENDROIT OÙ ELLE EST. Téléchargée sur un
   téléphone, elle reste sur ce téléphone : elle rattrape un navigateur
   vidé, pas un téléphone perdu, volé ou changé — et c'est le cas
   courant. Au doigt, la copie passe donc par la feuille de partage du
   système (Web Share, niveau 2) : Drive, Fichiers iCloud, un mail à
   soi-même — l'étudiant choisit, rien ne passe par nous (§10). Au poste,
   ou quand le navigateur ne sait pas partager un fichier, c'est le
   téléchargement d'avant, sans rien perdre. */
function partageCopie(){
  return matchMedia('(pointer:coarse)').matches && typeof navigator.canShare === 'function'
    && typeof navigator.share === 'function';
}
/* Chrome n'accepte de partager qu'une liste fermée d'extensions (.txt,
   .json, .pdf, images…) : un `.oc` y est refusé en silence. On essaie
   le vrai nom d'abord, puis le même fichier en `.oc.txt` — que
   « Restaurer » et « Recevoir » lisent pareil. */
function fichierPartageable(txt, nom){
  for (const [n, type] of [[nom, 'application/octet-stream'], [nom + '.txt', 'text/plain']]){
    const f = new File([txt], n, { type });
    try { if (navigator.canShare({ files: [f] })) return f; } catch (e) {}
  }
  return null;
}
export function downloadBackup(pass){
  const doIt = async () => {
    const payload = fullPayload(S.companies, S.profile, S.orphans, S.tombs);
    const txt = pass ? await encryptOC2(payload, pass) : JSON.stringify(payload);
    const nom = 'opencontact-copie-' + todayISO() + '.oc';
    const f = partageCopie() ? fichierPartageable(txt, nom) : null;
    if (f){
      try {
        await navigator.share({ files: [f], title: 'Copie OpenContact' });
      } catch (e) {
        /* renoncer n'est pas une panne : rien n'est parti, rien à dire */
        if (e && e.name === 'AbortError') return;
        telecharger(txt, nom);
      }
    } else telecharger(txt, nom);
    /* Un fait daté : il voyage dans le `.oc` et la sync, et c'est lui
       qui fait taire « sans filet » (engine/assist.js) pendant 30 jours. */
    S.profile.flags.lastBackupAt = Date.now();
    saveProfile();
    logJ('Copie gardée' + (pass ? ' (chiffrée)' : ''));
    /* dire lequel des deux : un champ ouvert mais laissé vide donne une
       copie en clair — le retour ne doit pas laisser croire l'inverse */
    toast(pass ? 'Copie chiffrée ✓' : 'Copie gardée ✓');
    bus.refresh();
  };
  return doIt();
}
function telecharger(txt, nom){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' }));
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
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
/* « Ton CV partira avec tes emails » était FAUX sur le web : l'app y
   écrit par `mailto:`, qui ne sait rien joindre, et la ligne de pièce
   jointe du composeur n'existe qu'avec l'envoi direct (§0, masqué). Un
   étudiant rangeait son CV ici, envoyait vingt candidatures, et aucun
   recruteur ne l'a jamais reçu — une erreur qu'il ne pouvait pas voir
   venir, puisqu'il ne voit pas le mail arrivé. La phrase dit donc ce
   qui marche VRAIMENT : le lien du profil, qui part dans le mail. Elle
   reste affichée même quand un PDF est rangé : c'est justement là
   qu'on croit l'affaire réglée. */
const DOC_KINDS = ENVOI_DIRECT ? {
  cv: { label: 'CV', add: 'Ajouter un CV', vide: 'Ton CV partira avec tes emails.' },
  lm: { label: 'Lettres', add: 'Ajouter une lettre', vide: 'Ta lettre partira avec tes emails.' }
} : {
  cv: { label: 'CV', add: 'Ajouter un CV', vide: 'Aucun CV rangé ici.' },
  lm: { label: 'Lettres', add: 'Ajouter une lettre', vide: 'Aucune lettre rangée ici.' }
};

function openDocs(kind, onChange){
  const k = DOC_KINDS[kind];
  const sh = openSheet({ title: k.label, icon: 'attachment' });
  const render = async () => {
    const docs = (await listDocs()).filter(d => docKind(d.key) === kind);
    if (!sh.body.isConnected) return;
    sh.body.innerHTML = (docs.length
      ? docs.map(d =>
          `<div class="doc-row" data-key="${esc(d.key)}">
             <div class="sw-in">
               <div class="doc-name" role="button" tabindex="0" aria-label="Voir ${esc(docTitle(d))}">${esc(docTitle(d))}</div>
               <span class="doc-size">${fmtSize(d.size)}</span>
             </div>
           </div>`).join('')
      : `<p class="doc-vide">${k.vide}</p>`)
      /* écrites EN CLAIR ici, pas dans DOC_KINDS : le relevé de sobriété
         ne lit que le texte posé dans le gabarit, et deux phrases rangées
         dans une constante lui échappaient */
      + (ENVOI_DIRECT ? '' : kind === 'cv'
        ? `<p class="hint">Un email ne joint pas de fichier : c’est le lien de ton profil qui part.</p>
           <button class="linklike" id="docLien">${ic('link', 'ic-14')} Mettre le lien</button>`
        : `<p class="hint">Un email ne joint pas de fichier : ta lettre, c’est le message lui-même.</p>`);
    sh.body.querySelector('#docLien')?.addEventListener('click', () => {
      sh.close();
      openProfil(null, { focus: '#pfCv' });
    });
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
    /* le lien du profil est ce qui part VRAIMENT dans un email : la
       ligne qui dirait « aucun » à côté d'un CV en ligne mentirait */
    const etat = [n ? n + ' document' + (n > 1 ? 's' : '') : '',
                  kind === 'cv' && S.profile.cvUrl ? 'lien' : ''].filter(Boolean).join(' · ');
    return `<button class="rg-row${i === kinds.length - 1 ? ' rg-last' : ''}" data-kind="${kind}">
              <span class="rg-n">${DOC_KINDS[kind].label}</span>
              <span class="rg-s">${etat || 'aucun'}</span>
              ${ic('chevron-right', 'ic-14')}
            </button>`;
  }).join('');
  box.querySelectorAll('[data-kind]').forEach(b =>
    b.addEventListener('click', () => openDocs(b.dataset.kind, renderDocs)));
}

/* ---------- l'écran : un objet, deux cadres rangés par USAGE ----------
   « Moi » répond à trois questions, dans cet ordre : est-ce que mes
   emails me présentent bien ? (le profil, « Ce que j'envoie ») ; est-ce
   que je risque de tout perdre ? (« À l'abri ») ; et qui m'aide si ça
   cloche ? (les lignes du bas). Avant, la deuxième vivait à trois
   endroits — la copie ici, la restauration et les appareils derrière une
   porte « Réglages » — alors que télécharger et restaurer sont les deux
   moitiés d'un même geste : le jour où l'on doit restaurer, on cherche
   là où l'on a téléchargé.

   PLUS DE PORTE « RÉGLAGES » AU POUCE (décision #20, revue le 29 septembre
   2026). Elle cachait quatre lignes derrière un mot qui ne promet ni
   « mon ordinateur » ni « ma copie » (parfum d'information, Pirolli &
   Card) — pendant que 306 px restaient vides sous elle, en 390 × 844,
   dans la zone la plus facile du pouce (§5). Le poste les montrait déjà
   dépliées : il reste UN dessin pour les deux ergonomies, ce que §5
   demande par défaut. */
function syncLabel(){
  const sy = getSync();
  if (!sy.phrase) return 'non relié';
  if (sy.state === 'on') return sy.peers + ' relié' + (sy.peers > 1 ? 's' : '');
  if (sy.state === 'link') return 'premier échange…';
  if (sy.state === 'err' || sy.state === 'norelay') return 'pas de connexion';
  if (sy.state === 'rtcfail') return 'rien ne passe';
  return 'en attente';
}

/* les lignes : des portes, pas des boutons (#7) — la ligne entière se
   tape, le réglage s'ouvre dans sa feuille. PAS de pictogramme : on
   scanne une liste par ses deux premiers mots (NN/g), et l'icône les
   repoussait de 22 px — assez pour que « Mes appareils » passe à deux
   lignes sur un vrai téléphone. */
const rgRow = (id, nom, etat, last, dep) =>
  `<button class="rg-row${last ? ' rg-last' : ''}${dep ? ' rg-dep' : ''}" id="${id}">
     <span class="rg-n">${nom}</span>
     <span class="rg-s"${id === 'moiSync' ? ' id="moiSyncSt"' : (id === 'moiComp' ? ' id="moiCompSt"' : '')}>${etat}</span>
     ${ic('chevron-right', 'ic-14')}
   </button>`;
const lignes = rows => rows.map(([id, nom, etat, dep], i) =>
  rgRow(id, nom, etat, i === rows.length - 1, dep)).join('');

/* Qui a vu ces pistes ailleurs ? La liste des appareils vit dans le
   stockage (lecture asynchrone) : elle est gardée ici et relue à chaque
   rendu. Tant qu'elle n'est pas lue, on ne SAIT pas — et on ne dit rien :
   annoncer « sans filet » à tort serait pire que le taire une seconde. */
let appareilsVus = null;
function etatFilet(){
  if (appareilsVus === null) return false;
  return sansFilet({
    pistes: S.companies.length,
    derniereCopie: (S.profile.flags || {}).lastBackupAt || 0,
    appareils: appareilsVus
  });
}
function relireAppareils(){
  const avant = etatFilet();
  loadDevices().then(list => {
    appareilsVus = Array.isArray(list) ? list : [];
    if (etatFilet() !== avant && S.route === 'moi') renderMoi();
  }).catch(() => {});
}

/* ---------- « À l'abri » : ne rien perdre, ne rien laisser lire ---------- */
function abriHTML(showBackup, filet){
  const n = S.companies.length;
  return `<fieldset class="fset${filet ? ' fs-alert' : ''}" id="moiAbri">
       <legend>À l’abri</legend>
       ${/* LE SEUL ÉTAT DE COPIE, ET IL NE PARLE QUE SANS FILET. Celui du
            4 août parlait à chaque passage (« N pistes depuis ta copie »)
            et il est parti pour ça. Celui-ci ne dit rien tant qu'un
            appareil relié ou une copie récente rattraperait la perte —
            `sansFilet`, engine/assist.js. Il nomme le fait, pas la
            consigne : les deux gestes qui le règlent sont juste dessous.
            Le bord ambre du cadre revient avec lui : §6 le réserve à un
            état qui peut tout coûter, et c'est exactement celui-là. */''}
       ${filet ? `<p class="hint warn abri-etat" id="moiFilet">${ic('square-alert', 'ic-14')} Tes ${n} pistes n’existent que sur cet appareil.</p>` : ''}
       ${lignes([
         ['moiSync', 'Mes appareils', syncLabel(), false],
         ['moiVerrou', 'Protection', verrouLabel(), false]
       ])}
       <div class="abri-copie">
         ${showBackup ? `
         ${/* « privé inclus » : la seule chose que le bouton ne peut PAS dire
              autrement — ce fichier emporte le suivi privé, et ça se sait
              avant de l'envoyer à quelqu'un. */''}
         <div class="lbl-row"><span class="abri-l">Ma copie <span class="lg-note">privé inclus</span></span></div>
         ${lockRowHTML({ id: 'moiBk', action: partageCopie() ? 'Mettre à l’abri' : 'Télécharger' })}` : ''}
         ${/* Restaurer vit À CÔTÉ de télécharger — et reste là même sans
              rien à copier : le cas le plus fréquent de restauration est
              justement un appareil neuf, donc vide. */''}
         <button class="linklike" id="moiRestore">${ic('reload', 'ic-14')} Restaurer une copie</button>
         <input type="file" id="moiRestoreFile" accept=".oc,.txt,.json,application/octet-stream,application/json,text/plain" hidden>
       </div>
     </fieldset>`;
}

/* ---------- le bas : ce qui ne sert que quand ça cloche ---------- */
function basHTML(showBackup){
  const prot = isProtected();
  const rows = [];
  /* le pré-requis ne remplace l'état que s'il n'y a rien à dire ; les trois
     lignes suivantes peuvent être absentes (CLAUDE.md §0) : on branche ce
     qui existe, jamais ce qui devrait exister */
  if (ENVOI_DIRECT) rows.push(['moiCx', 'Ma messagerie',
    (!prot && !mailAccount()) ? 'après Protection' : mailStateLabel(),
    !prot && !mailAccount()]);
  if (IA) rows.push(['moiAi', 'Mon assistant IA',
    (!prot && !aiConnection()) ? 'après Protection' : aiStateLabel(),
    !prot && !aiConnection()]);
  if (ORDINATEUR) rows.push(['moiComp', 'L’ordinateur', 'pas installé', false]);
  /* UNE ligne pour deux pages, et elle mène à l'aide : c'est ce qu'un
     étudiant cherche depuis l'app. Les deux pages se renvoient l'une à
     l'autre, et elles répondent hors ligne comme le reste. */
  rows.push(['moiAide', 'Aide et confidentialité', '', false]);
  rows.push(['moiDiag', 'Signaler un problème', '', false]);
  return `<div class="moi-bas">
       ${lignes(rows)}
       ${/* PARTIR PROPREMENT. L'effacement n'existait qu'à distance, commandé
            par l'appareil principal : sur un poste du lycée, au CDI ou sur
            l'ordinateur d'un proche, rien ne permettait de partir sans
            laisser son suivi — et les contacts que le groupe a donnés avec.
            Une sortie visible rend aussi l'essai moins risqué. Absente
            quand il n'y a rien à effacer. */''}
       ${showBackup ? `<button class="linklike moi-efface" id="moiEfface">${ic('trash', 'ic-14')} Effacer cet appareil</button>` : ''}
     </div>`;
}

/* l'état du lien vit : peers, liaison, rupture */
function bindSyncLive(root){
  if (root.__onSync) document.removeEventListener('oc:sync', root.__onSync);
  root.__onSync = () => {
    if (root.hidden){ document.removeEventListener('oc:sync', root.__onSync); root.__onSync = null; return; }
    const lbl = root.querySelector('#moiSyncSt');
    if (lbl) lbl.textContent = syncLabel();
    /* un appareil vient de se montrer : il peut suffire à lever « sans filet » */
    relireAppareils();
  };
  document.addEventListener('oc:sync', root.__onSync);
}

function bindLignes(box){
  const q = s => box.querySelector(s);
  q('#moiVerrou').addEventListener('click', () =>
    isProtected() ? openManageSheet() : openProtectFlow());
  q('#moiSync').addEventListener('click', openAppareils);
  q('#moiCx')?.addEventListener('click', () =>
    isProtected() ? openConnexions() : openProtectFlow());
  q('#moiAi')?.addEventListener('click', () =>
    isProtected() ? openAssistantIA() : openProtectFlow());
  q('#moiComp')?.addEventListener('click', async () => {
    const assoc = await loadOrdinateur().catch(() => null);
    if (assoc){ openOrdinateurSheet(assoc); return; }
    if (mqWideMoi.matches){ openAddOrdinateur(); return; }
    try {
      await navigator.clipboard.writeText(DIST_PAGE);
      toast('Lien copié — ouvre-le sur ton ordinateur.');
    } catch (e) { toast('Copie impossible ici — le lien : ' + DIST_PAGE); }
  });
  if (ORDINATEUR) loadOrdinateur().then(a => {
    const st = q('#moiCompSt');
    if (a && st) st.textContent = 'associé — ' + (a.nom || 'ton ordinateur');
  }).catch(() => {});
  q('#moiAide').addEventListener('click', () =>
    window.open('aide.html', '_blank', 'noopener'));
  q('#moiDiag').addEventListener('click', openDiagnostic);
  const rf = q('#moiRestoreFile');
  /* restaurer = rare et sensible (#4) : le code d'abord */
  q('#moiRestore').addEventListener('click', async () => {
    if (await requireCode('Ton code, pour restaurer')) rf.click();
  });
  rf.addEventListener('change', () => { if (rf.files[0]) restoreFile(rf.files[0]); });
  q('#moiEfface')?.addEventListener('click', effacerIci);
}

const mqWideMoi = matchMedia('(min-width:901px)');
mqWideMoi.addEventListener('change', () => { if (S.route === 'moi') renderMoi(); });

export function renderMoi(){
  const root = $('#view-moi');
  const wide = mqWideMoi.matches;
  const p = S.profile;
  const manques = manquesProfil(p);
  const pReady = p.name && !manques.length;
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
    `<div class="obj${p.name ? ' obj-moi' : ''}">
       ${ic('user', 'ic-24')}
       <div class="obj-m">
         ${p.name
           ? `<span class="obj-n">${esc(p.name)}</span>`
           : `<p class="obj-empty">Ta formation, ton école et ce que tu cherches
                remplissent chaque email que tu envoies.</p>
              <button class="btn btn-sm btn-primary" id="moiProfil">Remplir mon profil</button>`}
       </div>
       ${p.name ? `<button class="btn btn-sm" id="moiProfil">${pReady ? 'Modifier' : 'Compléter'}</button>` : ''}
       ${/* Les données passent SOUS le bouton, sur toute la largeur. À côté
            de lui, elles perdaient 80 px : « Alternance · 2 ans dès le 1er
            sep… » rendait la date, c'est-à-dire la seule chose qu'on vient
            lire. Le nom reste face au bouton qui le modifie.
            Une ligne par donnée, et chacune se coupe à sa fin. Jointes par
            <br> dans un bloc en `overflow-wrap:anywhere`, elles se brisaient
            n'importe où : sur un 360, l'adresse rendait « …@example » puis
            « .fr » seul sur sa ligne.
            Formation et école sur UNE ligne : ce sont deux moitiés de la
            même réponse (« où tu en es »), et la ligne peut s'élider — c'est
            une donnée (§4). Ce qui MANQUE se lit en creux, sans couleur ni
            pastille : remplir son profil n'est pas urgent, mais un manque
            nommé se comble, un « Compléter » vague se remet à plus tard. */''}
       ${p.name ? `<div class="obj-s">${[[p.formation, p.ecole].filter(Boolean).join(' · '),
                                    resumeRecherche(p), p.email].filter(Boolean)
                 .map(v => `<span class="obj-l" title="${esc(v)}">${esc(v)}</span>`).join('')}
                ${manques.length ? `<span class="obj-l obj-creux">${manques.map(m => esc(m) + ' ?').join(' · ')}</span>` : ''}</div>` : ''}
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
  const filet = showBackup && etatFilet();
  const abri = abriHTML(showBackup, filet);
  const bas = basHTML(showBackup);

  /* « General first, Advanced last » : ce qui ne sert que quand ça cloche
     ferme la page. Au poste, la colonne de droite porte l'abri et le bas :
     l'ordre de lecture reste le même, de gauche à droite. */
  root.innerHTML =
    `<div class="page-inner${wide ? ' page-wide' : ''}">
       ${/* PLUS DE CADENAS À CÔTÉ DU TITRE. Il disait « privé », pendant
            que celui de « Chiffrer » disait « mot de passe » et que la
            ligne « Protection » disait « non protégé » : trois sens pour
            un signe, et le titre affirmait « verrouillé » au-dessus d'un
            état qui dit le contraire. Toute l'app est privée par défaut ;
            le cadenas ne sert plus qu'à ce qui verrouille. */''}
       <div class="td-head"><h1>Moi</h1></div>
       ${wide
         ? `<div class="moi-cols"><div>${objet}${envoi}</div><div>${abri}${bas}</div></div>`
         : objet + envoi + abri + bas}
       ${/* La barre de statut qui porte la version est masquée au pouce :
            sur téléphone, RIEN ne disait quelle version tournait. Il
            fallait chercher un détail d'interface pour deviner si la mise
            à jour était passée — on a perdu des heures là-dessus. Elle
            ferme maintenant une page pleine, au lieu de flotter seule au
            milieu d'un vide. */''}
       <p class="moi-ver">OpenContact ${APP_VERSION}</p>
     </div>`;

  root.querySelector('#moiProfil').addEventListener('click', () => openProfil());
  root.querySelector('#moiTpl').addEventListener('click', openTemplates);
  /* le mot de passe est facultatif : au repos il ne pèse qu'un bouton
     compact au bout de la ligne (#8). Tapé, il s'étire en champ ; re-tapé,
     il se referme et l'oublie. Un seul contrôle, deux états (#19-4). */
  const bk = root.querySelector('#moiBk') ? bindLockRow(root, 'moiBk') : null;
  root.querySelector('#moiBkDo')?.addEventListener('click', () => downloadBackup(bk.value()));
  bindLignes(root);
  bindSyncLive(root);
  renderDocs();
  relireAppareils();
}

/* ---------- effacer cet appareil ----------
   Le seul geste de l'écran qui ne se rattrape pas : `confirmSheet` s'y
   justifie, et il montre ce qu'on ne peut PAS deviner (§6) — combien
   part, et s'il existe un filet ailleurs. Protégé, le code d'abord :
   quelqu'un qui passe devant un téléphone déverrouillé ne doit pas
   pouvoir tout effacer d'un tap de plus que la restauration. */
async function effacerIci(){
  if (!(await requireCode('Ton code, pour effacer'))) return;
  const docs = await listDocs().catch(() => []);
  const n = S.companies.length;
  const filet = !sansFilet({ pistes: Math.max(n, FILET_MIN_PISTES),
    derniereCopie: (S.profile.flags || {}).lastBackupAt || 0, appareils: appareilsVus || [] });
  const ok = await confirmSheet({
    title: 'Effacer cet appareil ?', icon: 'trash', danger: true, okLabel: 'Tout effacer',
    msg: `<b>${n} piste${n > 1 ? 's' : ''}</b>, ton profil${docs.length ? ` et <b>${docs.length} document${docs.length > 1 ? 's' : ''}</b>` : ''} partent de cet appareil.<br>
          ${filet
            ? 'Une copie récente ou un autre appareil les garde encore.'
            : '<b>Ni copie récente ni autre appareil</b> : ce sera définitif.'}`
  });
  if (!ok) return;
  await effacerCetAppareil();
  location.replace(location.pathname);
}
