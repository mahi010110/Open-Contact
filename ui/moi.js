/* ============================================================
   OpenContact — interface · « Moi »
   Ce qui n'appartient qu'à l'utilisateur : profil (remplit les
   emails), CV & lettre en PDF (IndexedDB, séparés des pistes),
   modèles d'emails, sauvegarde complète (mot de passe optionnel),
   restauration, aide condensée — et le coup de pouce IA, rangé
   ici sans faire d'ombre au reste.
   ============================================================ */
import { APP_VERSION, normalizeCompany, normalizeContact, normalizeProfile } from '../engine/model.js';
import { fullPayload, parseInput } from '../engine/exchange.js';
import { encryptOC2 } from '../engine/crypto.js';
import { fmtSize, todayISO, esc } from '../engine/utils.js';
import { mergeTombs } from '../engine/sync.js';
import { docGet, docPut } from '../engine/storage.js';
import { listDocs, docKind, docTitle, pickPdf, removeDoc } from './docs.js';
import { S, bus, saveData, saveProfile, saveOrphans, saveTombs, logJ } from './state.js';
import { $, ic, toast, btn, openSheet, confirmSheet, showUndo, bindDeleteGesture } from './dom.js';
import { openProfil, openTemplates } from './profil.js';
import { openAppareils } from './direct.js';
import { getSync } from './synclive.js';
import { isProtected, openProtectFlow, openManageSheet, verrouLabel, requireCode } from './verrou.js';
import { openConnexions, openAssistantIA, mailStateLabel, mailAccount, aiStateLabel, aiConnection } from './connexions.js';
import { loadCompanion, openAddCompanion, openCompanionSheet } from './compagnon.js';
import { DIST_PAGE } from '../engine/distribution.js';

/* ---------- garder une copie (.oc complet) ---------- */
export function downloadBackup(pass){
  const doIt = async () => {
    const payload = fullPayload(S.companies, S.profile, S.orphans, S.tombs);
    const txt = pass ? await encryptOC2(payload, pass) : JSON.stringify(payload);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' }));
    a.download = 'opencontact-sauvegarde-' + todayISO() + '.oc';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    /* l'état « N pistes depuis ta dernière copie » repart d'ici (#4) */
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
    toast(e.message === 'format' ? 'Ce fichier n’est pas une sauvegarde OpenContact.' : 'Lecture impossible : ' + e.message);
    return;
  }
  if (obj.kind === 'share'){
    toast('C’est un partage de pistes, pas une sauvegarde — passe par Échanger → Recevoir pour le fusionner.');
    return;
  }
  const n = obj.companies.length;
  const cur = S.companies.length;
  const ok = await confirmSheet({
    title: 'Restaurer cette sauvegarde ?', icon: 'reload', danger: true, okLabel: 'Tout remplacer',
    msg: `Le fichier contient <b>${n} piste${n > 1 ? 's' : ''}</b>${obj.profile ? ', le profil' : ''}${obj.orphans ? ', ' + obj.orphans.length + ' contact(s) à rattacher' : ''}.<br>
          Ta base actuelle (<b>${cur} piste${cur > 1 ? 's' : ''}</b>) sera <b>entièrement remplacée</b> — annulable pendant 30 secondes.`
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
  logJ('Sauvegarde restaurée : ' + n + ' piste(s)');
  bus.refresh();
  showUndo(`${ic('check', 'ic-14')} Restauré : ${n} piste${n > 1 ? 's' : ''}.`, () => {
    S.companies = JSON.parse(snap.companies).map(normalizeCompany);
    S.profile = normalizeProfile(JSON.parse(snap.profile));
    S.orphans = JSON.parse(snap.orphans).map(normalizeContact);
    S.tombs = mergeTombs(JSON.parse(snap.tombs), []);
    saveData(); saveProfile(); saveOrphans(); saveTombs();
    logJ('Restauration annulée');
    bus.refresh();
    toast('Restauration annulée — tout est revenu comme avant.');
  });
}
function askRestorePass(raw){
  const sh = openSheet({ title: 'Sauvegarde protégée', icon: 'lock', focus: '#rsPass' });
  sh.body.innerHTML =
    `<div class="field"><label for="rsPass">Mot de passe de la sauvegarde</label>
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
      });
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
  box.innerHTML = Object.keys(DOC_KINDS).map(kind => {
    const n = docs.filter(d => docKind(d.key) === kind).length;
    return `<button class="doc-door" data-kind="${kind}">
              <span class="doc-door-n">${DOC_KINDS[kind].label}</span>
              <span class="doc-door-s">${n ? n + ' document' + (n > 1 ? 's' : '') : 'aucun'}</span>
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
  if (sy.state === 'on') return 'relié — ' + sy.peers + ' en face';
  if (sy.state === 'link') return 'relié — premier échange…';
  if (sy.state === 'err' || sy.state === 'norelay') return 'relié — réseau bloqué ?';
  if (sy.state === 'rtcfail') return 'relié — liaison directe en échec';
  return 'relié — en attente';
}
/* « N pistes depuis ta dernière copie » — l'état qui pousse au geste (#4) ;
   se calme quand les appareils reliés dupliquent déjà les données */
function backupState(){
  const last = Number((S.profile.flags || {}).lastBackupAt) || 0;
  return {
    last,
    linked: !!getSync().phrase,
    n: S.companies.filter(c => (c.updatedAt || 0) > last).length
  };
}

/* les lignes de Réglages — des portes, plus des boutons (#7) : la ligne
   entière se tape, le réglage s'ouvre dans sa feuille. C'est la décision
   #21 (« le nom d'abord, l'écran ensuite ») et la même grammaire que les
   tiroirs CV / Lettres. Messagerie et IA exigent le code : sans
   protection, l'ÉTAT dit le vrai premier geste — « à protéger d'abord » —
   et taper mène quand même à la protection (N9 reste réglé). */
const rgRow = (id, icon, nom, etat, last) =>
  `<button class="rg-row${last ? ' rg-last' : ''}" id="${id}">
     <span class="rg-n">${ic(icon, 'ic-14')}${nom}</span>
     <span class="rg-s"${id === 'moiSync' ? ' id="moiSyncSt"' : (id === 'moiComp' ? ' id="moiCompSt"' : '')}>${etat}</span>
     ${ic('chevron-right', 'ic-14')}
   </button>`;

function reglagesRowsHTML(){
  const prot = isProtected();
  return (
    rgRow('moiVerrou', 'lock', 'Protection', verrouLabel()) +
    rgRow('moiSync', 'switch', 'Mes appareils', syncLabel()) +
    /* le pré-requis ne remplace l'état que s'il n'y a rien à dire : une
       messagerie déjà branchée le dit, même si le coffre a disparu */
    rgRow('moiCx', 'mail', 'Ma messagerie',
          (!prot && !mailAccount()) ? 'à protéger d’abord' : mailStateLabel()) +
    rgRow('moiAi', 'sparkles', 'Mon assistant IA',
          (!prot && !aiConnection()) ? 'à protéger d’abord' : aiStateLabel()) +
    /* #4 : l'éclair distingue le Compagnon de « Mes appareils », qui
       portaient le même signe. Provisoire — le pack n'a pas d'icône
       d'ordinateur et zap sert aussi à « Aujourd'hui ». */
    /* l'état, pas la phrase : « il s'installe sur ton ordinateur » se
       dit sur le 2ᵉ écran, là où on peut vraiment le faire (#21) */
    rgRow('moiComp', 'zap', 'Le Compagnon', 'pas installé', true) +
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
  /* N9 : l'état a dit « à protéger d'abord » — la ligne y mène tout droit */
  q('#moiCx').addEventListener('click', () =>
    isProtected() ? openConnexions() : openProtectFlow());
  q('#moiAi').addEventListener('click', () =>
    isProtected() ? openAssistantIA() : openProtectFlow());
  q('#moiComp').addEventListener('click', async () => {
    const assoc = await loadCompanion().catch(() => null);
    if (assoc){ openCompanionSheet(assoc); return; }
    if (mqWideMoi.matches){ openAddCompanion(); return; }
    try {
      await navigator.clipboard.writeText(DIST_PAGE);
      toast('Lien copié — ouvre-le sur ton ordinateur.');
    } catch (e) { toast('Copie impossible ici — le lien : ' + DIST_PAGE); }
  });
  loadCompanion().then(a => {
    const st = q('#moiCompSt');
    if (a && st) st.textContent = 'associé — ' + (a.nom || 'ton ordinateur');
  }).catch(() => {});
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

export function renderMoi(){
  const root = $('#view-moi');
  const wide = mqWideMoi.matches;

  if (!wide && reglagesOpen){
    root.innerHTML =
      `<div class="page-inner">
         <div class="td-head">
           <button class="btn icon-btn" id="moiBack" aria-label="Retour à Moi">${ic('arrow-left', 'ic-14')}</button>
           <h2>Réglages</h2>
         </div>
         <div class="pcard">${reglagesRowsHTML()}</div>
       </div>`;
    root.querySelector('#moiBack').addEventListener('click', () => { reglagesOpen = false; renderMoi(); });
    bindReglages(root);
    bindSyncLive(root);
    return;
  }

  const p = S.profile;
  const pReady = p.name && p.email;
  const bk = backupState();
  const showBackup = !!(S.companies.length || p.name);   /* rien à copier = carte absente */
  const bkPromote = showBackup && !bk.linked && (!bk.last || bk.n > 0);
  /* l'état, jamais l'explication (A) : un mot, ou un chiffre quand il
     pousse à agir (décision #11) */
  const bkState = bk.linked
    ? 'en double'
    : !bk.last
      ? 'aucune copie'
      : bk.n
        ? `<b>${bk.n} piste${bk.n > 1 ? 's' : ''}</b> depuis ta copie`
        : 'à jour';

  const cards =
    `<div class="pcard">
       <h3>${ic('user', 'ic-14')} Mon profil</h3>
       <p class="pd">${pReady
          ? `<b>${esc(p.name)}</b>${p.formation ? ' · ' + esc(p.formation) : ''}`
          : 'à remplir'}</p>
       <div class="pc-actions">
         <button class="btn ${pReady ? '' : 'btn-primary'}" id="moiProfil">${ic('pencil', 'ic-14')} ${pReady ? 'Modifier' : 'Remplir mon profil'}</button>
         <button class="btn" id="moiTpl">${ic('mail', 'ic-14')} Modèles d’emails (${p.templates.length})</button>
       </div>
     </div>

     <div class="pcard">
       <h3>${ic('attachment', 'ic-14')} Mes CV &amp; lettres</h3>
       <div id="moiDocs"></div>
     </div>

     ${showBackup ? `
     <div class="pcard">
       <h3>${ic('save', 'ic-14')} Garder une copie <span class="tag-priv">${ic('lock', 'ic-14')} privé inclus</span></h3>
       <p class="pd">${bkState}</p>
       <div class="pc-actions">
         <button class="btn ${bkPromote ? 'btn-primary' : ''}" id="moiBackup">${ic('download', 'ic-14')} Garder une copie</button>
         <button class="btn icon-btn bk-lock" id="moiBkLock" aria-pressed="false"
                 aria-label="Protéger la copie par un mot de passe" title="Protéger par un mot de passe">${ic('lock', 'ic-14')}</button>
       </div>
       <div class="bk-line" id="moiBkLine" hidden>
         <input id="moiBkPass" class="bk-pass" type="password" autocomplete="new-password"
                placeholder="Mot de passe" aria-label="Mot de passe de la copie">
       </div>
       <div class="stor-line" id="moiStor"></div>
     </div>` : ''}`;

  const reglages = `<div class="pcard">
       ${wide ? `<h3>${ic('settings-2', 'ic-14')} Réglages</h3>` : ''}
       ${reglagesRowsHTML()}
     </div>`;

  root.innerHTML =
    `<div class="page-inner${wide ? ' page-wide' : ''}">
       <div class="td-head"><h2>Moi</h2>
         <div class="td-date" title="privé — jamais partagé" aria-label="privé — jamais partagé">${ic('lock', 'ic-14')}</div></div>
       ${wide
         ? `<div class="moi-cols"><div>${cards}</div><div>${reglages}</div></div>`
         : cards +
           `<button class="pcard moi-door" id="moiReglages">
              <span class="md-m"><b>${ic('settings-2', 'ic-14')} Réglages</b></span>
              ${ic('chevron-right', 'ic-14')}
            </button>`}
       <div class="moi-ver">OpenContact ${APP_VERSION}</div>
     </div>`;

  root.querySelector('#moiProfil').addEventListener('click', () => openProfil());
  root.querySelector('#moiTpl').addEventListener('click', openTemplates);
  /* le mot de passe est facultatif : au repos il ne pèse qu'une icône à
     côté du geste (#8 — l'avancé se replie derrière un signe, jamais une
     phrase). Tapée, elle ouvre le champ ; re-tapée, elle le referme et
     l'oublie. Un seul contrôle, deux états (#19-4). */
  const bkPass = root.querySelector('#moiBkPass');
  const bkLine = root.querySelector('#moiBkLine');
  const bkLock = root.querySelector('#moiBkLock');
  bkLock?.addEventListener('click', () => {
    const on = bkLine.hidden;
    bkLine.hidden = !on;
    bkLock.classList.toggle('on', on);
    bkLock.setAttribute('aria-pressed', String(on));
    if (on) bkPass.focus(); else bkPass.value = '';
  });
  root.querySelector('#moiBackup')?.addEventListener('click', () =>
    downloadBackup(bkLine && !bkLine.hidden ? bkPass.value : ''));
  if (wide) bindReglages(root);
  else root.querySelector('#moiReglages').addEventListener('click', () => {
    reglagesOpen = true;
    renderMoi();
    root.scrollTop = 0;
  });
  bindSyncLive(root);
  renderDocs();
  if (navigator.storage && navigator.storage.estimate){
    navigator.storage.estimate().then(({ usage, quota }) => {
      if (usage != null && quota){
        const el = $('#moiStor');
        if (el) el.textContent = fmtSize(usage) + ' sur ' + fmtSize(quota);
      }
    }).catch(() => {});
  }
}
