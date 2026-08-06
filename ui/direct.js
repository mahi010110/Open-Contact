/* ============================================================
   OpenContact — interface · le DIRECT (P2P, WebRTC via Trystero)
   Deux mondes bien distincts, jamais mélangés :
   · « Mes appareils » — le lien est PERSISTANT : synclive.js garde
     la connexion en arrière-plan tant que la phrase existe. Cette
     feuille n'est que le poste de gestion : statut, dernier lot
     reçu, profil à reprendre, appareils reliés, rompre le lien.
   · « Partage en groupe » — un mot de passe de GROUPE ; seules les
     fiches partageables circulent (sharePayload), avec le même
     aperçu avant fusion que par fichier. Bêta discrète.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { fnv } from '../engine/crypto.js';
import { sharePayload, linkWrap, linkParse } from '../engine/exchange.js';
import { PROMO_KEY, RELAYS_KEY, TURN_KEY, kvGet, kvSet } from '../engine/storage.js';
import { parseTurn, turnText } from '../engine/transport.js';
import { S, bus, isClosed, logJ } from './state.js';
import { openSheet, confirmSheet, toast, btn, ic } from './dom.js';
import { mergePreviewInto } from './recevoir.js';
import { makeQrSvg, startScan } from './qr.js';
import { getSync, startSync, breakLink, keepMyProfile, makePhrase, openRoom, leaveRoom,
         watchLiaison, deviceSelf, loadDevices, removeDevice, DEVICES_MAX,
         getRing, amMain, ringDo, ringMakeMain } from './synclive.js';
import { deviceIn } from '../engine/ring.js';
import { requireCode } from './verrou.js';
import { loadCompanion, openAddCompanion, openCompanionSheet, openCompanionPhoneSheet, companionPresence } from './compagnon.js';
import { COMPAGNON } from './perimetre.js';
import { whoCandidates, whoLineHTML, openWhoPicker } from './qui.js';
import { filterCompanies } from '../engine/filter.js';
import { sortState, sortArgs } from './sort.js';
import { filterState, filterArgs, affinerBtnHTML, bindAffinerBtn } from './affiner.js';

const isDesktop = () => matchMedia('(min-width:901px)').matches;
const relayList = async () => {
  try {
    const urls = JSON.parse(await kvGet(RELAYS_KEY) || '[]');
    return Array.isArray(urls) ? urls.filter(x => typeof x === 'string').slice(0, 8) : [];
  } catch (e) { return []; }
};
const turnList = async () => {
  try {
    const t = JSON.parse(await kvGet(TURN_KEY) || '[]');
    return Array.isArray(t) ? t : [];
  } catch (e) { return []; }
};
/* `extra` : les réglages du LIEN lui-même (changer la phrase, rompre).
   Ils vivaient dispersés — un lien flottant sous la liste et un bouton
   dans le pied — alors qu'ils répondent à la même question que les
   relais : « comment cette liaison est-elle réglée ? ». Un seul volet
   replié, donc, au lieu de trois affordances à trier du regard ; et le
   titre suit ce qu'il contient. */
const relaySettingsHTML = (urls, turn, extra) =>
  `<details class="pcard pcard-details sy-relays" style="margin-top:14px">
     <summary><h3>${ic('settings-2', 'ic-14')} ${extra ? 'Réglages du lien' : 'Connexion avancée'}</h3></summary>
     ${/* Ce qu'on vient chercher EN PREMIER se lit en premier : on ouvre
          ce volet pour changer la phrase ou couper le lien bien plus
          souvent que pour saisir un relais. Posés en bas, ces deux
          gestes vivaient sous deux zones de texte qu'il fallait
          dépasser. */''}
     ${extra || ''}
     ${extra ? '<div class="lbl-row" style="margin-top:14px"><label>Connexion</label></div>' : ''}
     ${/* l'intro dit QUAND s'en servir ; la forme à respecter descend sous
          SON champ, là où on la lit au moment de taper. Mélangées, elles
          faisaient une phrase que personne ne finit. */''}
     <p class="hint">Seulement si ton réseau bloque la liaison — sinon, laisse vide.</p>
     <div class="field"><label for="syRelays">Relais personnalisés</label>
       <textarea id="syRelays" class="ta-s" spellcheck="false" autocapitalize="off"
         placeholder="wss://relais.exemple.org">${esc(urls.join('\n'))}</textarea></div>
     <div class="field"><label for="syTurn">Serveur TURN — si la liaison directe échoue</label>
       <textarea id="syTurn" class="ta-s" spellcheck="false" autocapitalize="off"
         placeholder="turns:relais.exemple.org:443 utilisateur motdepasse">${esc(turnText(turn))}</textarea></div>
     ${/* la seule action de la carte : elle se voit. Elle flottait en bas
          à gauche, en gris, plus discrète que les champs qu'elle valide. */''}
     <div class="pc-actions"><button class="btn btn-sm btn-primary" id="sySaveRelays">Enregistrer</button></div>
     <button class="linklike" id="syPublicRelays"${urls.length || (turn && turn.length) ? '' : ' hidden'}>Réinitialiser</button>
   </details>`;
function parseRelays(raw){
  const values = String(raw || '').split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
  if (values.length > 8) throw new Error('huit');
  const out = [];
  for (const value of values){
    let u;
    try { u = new URL(value); } catch (e) { throw new Error('adresse'); }
    if (u.protocol !== 'wss:' || !u.hostname || u.username || u.password) throw new Error('adresse');
    if (!out.includes(u.href)) out.push(u.href);
  }
  return out;
}
function wireRelays(q, phrase, rerender){
  const save = async (urls, turn) => {
    await kvSet(RELAYS_KEY, JSON.stringify(urls));
    await kvSet(TURN_KEY, JSON.stringify(turn));
    if (phrase) await startSync(phrase, true);   /* relais changés : on reprend la liaison */
    toast(urls.length || turn.length
      ? 'Réglages enregistrés — la liaison redémarre.'
      : 'Réglage d’origine rétabli.');
    rerender();
  };
  q('#sySaveRelays')?.addEventListener('click', async () => {
    let urls;
    try { urls = parseRelays(q('#syRelays').value); }
    catch (e) { toast(e.message === 'huit' ? 'Huit relais maximum.' : 'Adresse attendue : wss://…'); return; }
    let turn;
    try { turn = parseTurn(q('#syTurn').value); }
    catch (e) { toast(e.message === 'quatre' ? 'Quatre serveurs TURN maximum.' : 'TURN attendu : turns:hôte:port utilisateur motdepasse'); return; }
    await save(urls, turn);
  });
  q('#syPublicRelays')?.addEventListener('click', () => save([], []));
}
/* la ligne Compagnon — présente avec ou sans phrase de liaison */
const compRowHTML = comp => comp
  ? `<button class="dev-row dev-open" id="devComp"><b>${esc(comp.nom || 'Compagnon')}</b> <span class="tag-beta">compagnon</span>
       <span class="dev-sub" id="devCompSub">état… · gérer ›</span></button>`
  : '';
function wireComp(q, comp, render){
  q('#devAddComp')?.addEventListener('click', () => openAddCompanion(render));
  q('#devCompInfo')?.addEventListener('click', () => openCompanionPhoneSheet());
  if (!comp) return;
  q('#devComp')?.addEventListener('click', () => openCompanionSheet(comp, render));
  companionPresence().then(p => {
    const el = q('#devCompSub');
    if (el) el.textContent = (p && p.state === 'on' ? 'prêt' : 'éteint') + ' · gérer ›';
  });
}

const agoLabel = t => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return 'à l’instant';
  if (m < 60) return 'il y a ' + m + ' min';
  const h = Math.round(m / 60);
  if (h < 24) return 'il y a ' + h + ' h';
  return 'il y a ' + Math.round(h / 24) + ' j';
};

/* ---------- feuille d'un appareil : les commandes du principal ----------
   Chaque geste re-demande le code ; la commande voyage dans l'anneau
   signé et s'applique quand l'appareil se reconnecte — l'interface
   est honnête sur cette limite. */
function openDeviceSheet(d, onDone){
  const sh = openSheet({ title: d.name, icon: 'switch' });
  /* le quotidien visible ; l'administration de flotte repliée (N10) —
     de la sécurité, rare, non bloquante (loi #8) */
  sh.body.innerHTML =
    `<p class="hint" style="margin:0 0 10px">Vu ${agoLabel(d.seen || 0)}.</p>
     <div class="pick-list">
       <button class="pick" id="dvRemove"><b>Retirer de mes appareils</b></button>
     </div>
     <details class="srt-adv" style="margin-top:10px">
       <summary>Sécurité avancée</summary>
       <div class="pick-list">
         <button class="pick" id="dvLock"><b>Verrouiller cet appareil</b><span>à sa prochaine connexion</span></button>
         <button class="pick" id="dvMain"><b>En faire l’appareil principal</b></button>
         <button class="pick" id="dvBan"><b>Retirer et changer les clés</b><span>appareil perdu ou douteux</span></button>
         <button class="pick pick-danger" id="dvWipe"><b>Effacer ses données</b><span>à sa prochaine connexion</span></button>
       </div>
     </details>`;
  const q = s => sh.body.querySelector(s);
  const doCmd = async (cmd, confirmOpts, doneMsg) => {
    if (confirmOpts && !await confirmSheet(confirmOpts)) return;
    if (!await requireCode('Ton code, pour confirmer')) return;
    if (cmd === 'main') await ringMakeMain(d.id);
    else await ringDo(cmd, d.id);
    sh.close(null, true);
    toast(doneMsg);
    onDone();
  };
  q('#dvLock').addEventListener('click', () =>
    doCmd('lock', null, 'Il se verrouillera dès qu’il se reconnectera.'));
  q('#dvMain').addEventListener('click', () =>
    doCmd('main', { title: 'Transférer le rôle ?', okLabel: 'Transférer', icon: 'switch',
      msg: `<b>${esc(d.name)}</b> devient ton appareil principal. Celui-ci redevient un appareil ordinaire.` },
      'Rôle transféré ✓'));
  q('#dvRemove').addEventListener('click', () =>
    doCmd('remove', { title: 'Retirer cet appareil ?', danger: true, okLabel: 'Retirer', icon: 'trash',
      msg: `<b>${esc(d.name)}</b> sort de tes appareils et ne se synchronisera plus. Rien n’y est effacé.` },
      'Retiré — il l’apprendra à sa prochaine connexion.'));
  q('#dvBan').addEventListener('click', () =>
    doCmd('ban', { title: 'Retirer et changer les clés ?', danger: true, okLabel: 'Retirer', icon: 'trash',
      msg: `<b>${esc(d.name)}</b> est écarté et les clés du groupe changent. Il connaît encore la phrase de liaison — <b>change-la aussi</b> pour l’écarter vraiment.` },
      'Écarté. Pense à changer la phrase de liaison.'));
  q('#dvWipe').addEventListener('click', () =>
    doCmd('wipe', { title: 'Effacer ses données ?', danger: true, okLabel: 'Effacer', icon: 'square-alert',
      msg: `<b>${esc(d.name)}</b> effacera ses données OpenContact à sa prochaine connexion. Si quelqu’un l’en empêche, change aussi les clés et la phrase.` },
      'Demandé — il effacera à sa prochaine connexion.'));
}

/* ============ Mes appareils : gestion du lien persistant ============ */
export function openAppareils(){
  let onSync = null;
  /* la caméra du scan de phrase : elle se coupe quelle que soit la
     façon de quitter — retour, fermeture, ou scan réussi */
  const stopCam = () => { if (stopCam.fn){ stopCam.fn(); stopCam.fn = null; } };
  stopCam.fn = null;
  /* N11 : la phrase donne accès à tout le privé — masquée par défaut
     dès qu'un appareil est relié, révélée d'un tap ; visible tant
     qu'on est en train de relier (il faut pouvoir la recopier) */
  let revealPhrase = null;
  const sh = openSheet({
    title: 'Mes appareils', icon: 'switch', clearToast: true,
    onClose: () => { stopCam(); if (onSync){ document.removeEventListener('oc:sync', onSync); onSync = null; } }
  });
  const q = s => sh.body.querySelector(s);

  /* le statut dit ce qui est PROUVÉ : relais joints, pair en face,
     échange reçu — jamais « à jour » sur la foi de la salle (#14) */
  const statusHTML = () => {
    const sy = getSync();
    const r = sy.relays || {};
    /* Sept états, un seul vocabulaire. « Relais », « liaison directe »,
       « serveur TURN » ne veulent rien dire pour un étudiant : ces mots
       restent dans « Connexion avancée », là où ils sont un RÉGLAGE.
       Ici on dit ce qui se passe et ce qu'il reste à faire — et deux
       états qui signifient la même chose pour l'utilisateur (aucun
       relais joignable / pas de connexion) le disent pareil. */
    const reessayer = ` <button class="btn btn-sm" id="syRetry">Réessayer</button>`;
    if (sy.state === 'on')
      return `${ic('radio', 'ic-14')} <b>${sy.peers}</b> appareil${sy.peers > 1 ? 's' : ''} relié${sy.peers > 1 ? 's' : ''} — à jour`;
    if (sy.state === 'link')
      return `${ic('radio', 'ic-14')} <b>${sy.peers}</b> appareil${sy.peers > 1 ? 's' : ''} relié${sy.peers > 1 ? 's' : ''} — premier échange…`;
    /* Le statut dit l'ÉTAT, pas la marche à suivre : la ligne juste
       au-dessus donne déjà le chemin exact (« Moi → Mes appareils →
       Entrer une phrase »), et deux fois la même consigne à deux lignes
       d'écart, c'est une de trop. Le compte de relais part avec :
       « 5/5 » ne veut rien dire pour qui lit, et le détail vit dans
       « Connexion avancée » pour qui le cherche. */
    if (sy.state === 'wait')
      return `${ic('clock', 'ic-14')} En attente de ton autre appareil`;
    if (sy.state === 'norelay' || sy.state === 'err')
      return `${ic('square-alert', 'ic-14')} Pas de connexion — ton réseau la bloque ?${reessayer}`;
    if (sy.state === 'rtcfail')
      return `${ic('square-alert', 'ic-14')} Ton autre appareil est là, mais rien ne passe — essaie Connexion avancée`;
    return `${ic('clock', 'ic-14')} Connexion…`;
  };

  /* le rôle d'un appareil dans l'anneau — '' si pas d'anneau */
  const roleOf = id => {
    const r = getRing();
    const d = r && deviceIn(r, id);
    return d ? (r.main === id ? 'main' : d.role) : '';
  };
  const roleTag = id => {
    const role = roleOf(id);
    if (role === 'main') return ' <span class="tag-main">principal</span>';
    if (role === 'companion') return ' <span class="tag-beta">compagnon</span>';
    return '';
  };

  async function renderLinked(){
    const sy = getSync();
    const self = await deviceSelf();
    const devs = await loadDevices();
    const st = sy.lastStats;
    const iAmMain = await amMain();
    const comp = await loadCompanion();
    const relays = await relayList();
    const turn = await turnList();
    const phraseShown = revealPhrase === null ? !devs.length : revealPhrase;
    sh.setTitle('Mes appareils');
    sh.body.innerHTML =
      `<div class="sy-phrase"><span>${phraseShown ? esc(sy.phrase) : '••••• – •••••'}</span>
         <button class="abtn abtn-sm" id="syEye" aria-label="${phraseShown ? 'Masquer' : 'Afficher'} la phrase"
                 title="${phraseShown ? 'Masquer' : 'Afficher'}">${ic(phraseShown ? 'eye-off' : 'eye', 'ic-14')}</button></div>
       ${/* Relier DEUX DE SES PROPRES APPAREILS demandait de retaper douze
            caractères à la main, sans faute, sur un clavier de téléphone —
            alors que donner une piste à un camarade a QR, fichier et
            presse-papier depuis toujours. On soignait l'inconnu et on
            laissait l'utilisateur recopier pour lui-même.
            Le QR porte le même secret que la phrase : il n'apparaît donc
            QUE quand elle est à l'écran, et disparaît avec elle. */''}
       ${phraseShown ? `<div class="sy-link">
           <div class="qr-wrap qr-mini" id="syQr" role="img" aria-label="QR de la phrase de liaison"></div>
           <button class="btn btn-sm" id="syCopy">${ic('copy', 'ic-14')} Copier la phrase</button>
         </div>` : ''}
       ${/* Plus une seule consigne ici. Elle décrivait d'abord l'écran où
            l'on se trouve, puis ce qu'il montre : un QR sous un titre
            « Mes appareils », avec un bouton « Copier la phrase » à
            côté, n'a besoin de personne pour dire qu'il se scanne — et
            des points à la place de la phrase, sous un œil barré, se
            comprennent sans qu'on les commente. Ce qui se voit ne se
            lit pas deux fois. */''}
       <div class="sy-status" id="syStatus">${statusHTML()}</div>
       <div class="sy-log">${st ? `
         <ul class="rc-lines">
           ${st.addedC ? `<li>${ic('plus', 'ic-14')} <b>${st.addedC}</b> reçue${st.addedC > 1 ? 's' : ''}</li>` : ''}
           ${st.updatedC ? `<li>${ic('pencil', 'ic-14')} <b>${st.updatedC}</b> mise${st.updatedC > 1 ? 's' : ''} à jour</li>` : ''}
           ${st.removedC ? `<li>${ic('trash', 'ic-14')} <b>${st.removedC}</b> supprimée${st.removedC > 1 ? 's' : ''}</li>` : ''}
           ${st.addedO ? `<li>${ic('contact', 'ic-14')} <b>${st.addedO}</b> contact${st.addedO > 1 ? 's' : ''} à rattacher</li>` : ''}
           ${st.profile === 'remote' ? `<li>${ic('user', 'ic-14')} profil : la version la plus récente a été prise
              ${sy.prevProfile ? '<button class="btn btn-sm" id="syKeepProf">Garder plutôt la mienne</button>' : ''}</li>` : ''}
         </ul>` : ''}</div>
       <div class="sy-devs">
         ${/* « Appareils reliés » au-dessus d'une liste où l'on est SEUL
              annonce un pluriel qui n'existe pas, et redit ce que le
              statut vient de dire. La légende attend d'avoir quelque
              chose à coiffer. */''}
         ${devs.length || comp ? '<div class="lbl-row" style="margin-bottom:6px"><label>Appareils reliés</label></div>' : ''}
         <div class="dev-row"><b>${esc(self.name)}</b>${roleTag(self.id)}<span class="dev-sub">cet appareil</span></div>
         ${devs.map(d => iAmMain && roleOf(d.id)
           ? `<button class="dev-row dev-open" data-dev="${esc(d.id)}"><b>${esc(d.name)}</b>${roleTag(d.id)}
                <span class="dev-sub">${agoLabel(d.seen || 0)} · gérer ›</span></button>`
           : `<div class="dev-row hov-row"><b>${esc(d.name)}</b>${roleTag(d.id)}<span class="dev-sub">${agoLabel(d.seen || 0)}</span>
                <button class="abtn abtn-sm abtn-del hov-soft" data-rm="${esc(d.id)}" aria-label="Retirer ${esc(d.name)}" title="Retirer">${ic('trash', 'ic-14')}</button>
              </div>`).join('')}
         ${comp ? compRowHTML(comp)
           : (COMPAGNON && iAmMain
             ? (isDesktop()
               ? `<button class="linklike" id="devAddComp" style="margin-top:6px">${ic('plus', 'ic-14')} Ajouter le Compagnon</button>`
               : `<button class="dev-row dev-open" id="devCompInfo"><b>Le Compagnon</b><span class="dev-sub">pas installé · voir ›</span></button>`)
             : '')}
         ${/* Quand je ne suis pas le principal, les lignes d'appareils sont
              des <div> sans chevron ni survol : elles ne se proposent pas.
              Expliquer une absence, c'est la rendre présente. */''}
         ${1 + devs.length > DEVICES_MAX
           ? `<p class="hint warn" style="margin-top:6px">Plus de ${DEVICES_MAX} appareils — change la phrase pour écarter les inconnus.</p>`
           : ''}
       </div>
       ${relaySettingsHTML(relays, turn,
         `<div class="lk-set">
            ${/* Deux mots soulignés flottaient dans 110 px de vide : la cible
                 fait bien ses 44 px, mais rien ne la DESSINE, et les trois
                 bords gauches du volet ne s'alignaient pas (57 / 45 / 37 px).
                 On reprend le dessin de « Verrouillage » — une liste
                 d'actions, puis la sortie dangereuse en rouge dessous : un
                 seul langage dans l'app pour ce couple-là. */''}
            <div class="pick-list">
              <button class="pick" id="syNewPhrase"><b>Changer la phrase de liaison</b></button>
            </div>
            <button class="linklike lk-cut" id="syBreak">Rompre le lien</button>
          </div>`)}`;

    q('#syEye')?.addEventListener('click', () => { revealPhrase = !phraseShown; renderLinked(); });
    q('#syRetry')?.addEventListener('click', () => startSync(sy.phrase, true));
    q('#syKeepProf')?.addEventListener('click', keepMyProfile);
    q('#syNewPhrase')?.addEventListener('click', async () => {
      if (await requireCode('Ton code, pour changer la phrase')) renderStart(true);
    });
    sh.body.querySelectorAll('[data-rm]').forEach(b =>
      b.addEventListener('click', async () => {
        const d = devs.find(x => x.id === b.dataset.rm);
        const ok = await confirmSheet({
          title: 'Retirer cet appareil ?', danger: true, okLabel: 'Retirer', icon: 'trash',
          msg: `<b>${esc(d ? d.name : 'Appareil')}</b> sort de la liste. Il connaît encore la phrase — pour l’écarter vraiment, change aussi la phrase de liaison.`
        });
        if (!ok) return;
        if (!await requireCode('Ton code, pour retirer')) return;
        await removeDevice(b.dataset.rm);
        render();
      }));
    /* je suis le principal : chaque appareil s'ouvre en feuille de gestion */
    sh.body.querySelectorAll('[data-dev]').forEach(b =>
      b.addEventListener('click', () => {
        const d = devs.find(x => x.id === b.dataset.dev);
        if (d) openDeviceSheet(d, render);
      }));
    wireComp(q, comp, render);
    wireRelays(q, sy.phrase, render);
    /* le QR se peint après coup : `makeQrSvg` est asynchrone, et un
       re-rendu peut avoir eu lieu entre-temps — d'où le test du nœud */
    if (phraseShown) makeQrSvg(linkWrap(sy.phrase))
      .then(svg => { const n = q('#syQr'); if (n) n.innerHTML = svg; })
      .catch(() => { const n = q('#syQr'); if (n) n.remove(); });
    q('#syCopy')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(sy.phrase); toast('Phrase copiée.'); }
      catch (e) { toast('Copie impossible ici — tape-la à la main.'); }
    });
    q('#syBreak')?.addEventListener('click', async () => {
      const ok = await confirmSheet({
        title: 'Rompre le lien ?', danger: true, okLabel: 'Rompre', icon: 'switch',
        msg: 'Cet appareil ne se synchronisera plus. Rien n’est effacé — tes pistes restent ici, les autres appareils gardent les leurs.'
      });
      if (!ok) return;
      if (!await requireCode('Ton code, pour rompre le lien')) return;
      await breakLink();
      toast('Lien rompu');
      render();
    });
    /* Pied vide, exprès. `setFoot` pose son bouton à ~96 % de la
       hauteur — l'endroit le plus facile à atteindre au pouce — et
       « Rompre le lien » l'occupait SEUL, sur un écran qui n'a rien à
       valider : la meilleure place offerte au seul geste qui coupe.
       Il rejoint « Changer la phrase » dans les réglages du lien, où
       l'on ne va que délibérément. */
    sh.setFoot(null);
  }

  async function renderStart(changing){
    const comp = await loadCompanion();
    const relays = await relayList();
    const turn = await turnList();
    sh.setTitle('Mes appareils');
    sh.body.innerHTML =
      `<p class="hint" style="margin:0 0 12px">${changing
         ? 'Nouvelle phrase = nouveau lien — à retaper sur les autres appareils.'
         : 'Une phrase de liaison, et tes appareils restent à jour — suivi compris.'}</p>
       <div class="pick-list">
         <button class="pick" id="syNew"><b>${ic('sparkles', 'ic-14')} Créer une phrase</b></button>
         <button class="pick" id="syJoin"><b>${ic('switch', 'ic-14')} Entrer une phrase</b></button>
       </div>
       ${comp ? `<div class="sy-devs" style="margin-top:14px">
           <div class="lbl-row" style="margin-bottom:6px"><label>Appareils reliés</label></div>
           ${compRowHTML(comp)}
         </div>` : ''}
       ${COMPAGNON && !changing && !comp && isDesktop()
         ? `<button class="linklike" id="devAddComp" style="margin-top:12px">${ic('plus', 'ic-14')} Ajouter le Compagnon</button>`
         : ''}
       ${COMPAGNON && !changing && !comp && !isDesktop()
         ? `<div class="sy-devs"><button class="dev-row dev-open" id="devCompInfo"><b>Le Compagnon</b><span class="dev-sub">pas installé · voir ›</span></button></div>`
         : ''}
       ${relaySettingsHTML(relays, turn)}`;
    sh.setFoot(changing ? [btn('← Retour', 'btn-ghost', render)] : null);
    wireComp(q, comp, render);
    wireRelays(q, '', render);
    q('#syNew').addEventListener('click', () => { startSync(makePhrase()); render(); });
    q('#syJoin').addEventListener('click', () => {
      /* Le scan D'ABORD, la saisie en repli : viser un QR ne peut pas
         se tromper de lettre, retaper si. Sans caméra — ordinateur de
         salle, permission refusée — le champ reste, et il devient le
         chemin normal sans que rien ne se casse. */
      sh.body.innerHTML =
        `<div class="scan-box" id="syScanBox" hidden><video id="syVideo" playsinline muted></video><div class="scan-mark"></div></div>
         <button class="btn" id="syScan" style="width:100%">${ic('grid-3x3', 'ic-14')} Scanner le QR de l’autre appareil</button>
         <p class="hint" id="syScanHint" hidden></p>
         <div class="field" style="margin-top:12px"><label for="syPhrase">Ou tape la phrase</label>
           <input id="syPhrase" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ex : k7m3p-9xq2f"></div>`;
      const go = v => {
        const p = String(v ?? q('#syPhrase').value).trim().toLowerCase();
        if (!p) return;
        stopCam();
        startSync(p);
        render();
      };
      q('#syScan').addEventListener('click', async () => {
        q('#syScanBox').hidden = false;
        q('#syScan').hidden = true;
        try {
          stopCam();
          stopCam.fn = await startScan(q('#syVideo'), raw => {
            const p = linkParse(raw);
            if (!p){
              /* un QR qui n'est pas une phrase de liaison : on le dit et
                 on continue de viser, plutôt que de relier n'importe quoi */
              const h = q('#syScanHint');
              if (h){ h.hidden = false; h.textContent = 'Ce QR n’est pas une phrase de liaison.'; h.classList.add('warn'); }
              return true;
            }
            go(p);
            return false;
          });
        } catch (e) {
          q('#syScanBox').hidden = true;
          const h = q('#syScanHint');
          if (h){ h.hidden = false; h.textContent = 'Caméra indisponible — tape la phrase.'; }
          q('#syPhrase').focus();
        }
      });
      q('#syPhrase').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      sh.setFoot([btn('← Retour', 'btn-ghost', () => { stopCam(); renderStart(changing); }),
                  btn('Relier', 'btn-primary', () => go())]);
    });
  }

  function render(){
    if (getSync().phrase) renderLinked();
    else renderStart(false);
  }
  /* l'état vivant pilote la feuille : peers, appareils, lot reçu…
     — sauf pendant une saisie (phrase, relais/TURN ouverts) : un
     re-rendu au mauvais moment mangerait le texte tapé. Le statut
     seul, lui, se rafraîchit toujours. */
  onSync = () => {
    if (sh.body.querySelector('#syPhrase')) return;
    if (sh.body.querySelector('.sy-relays[open]')){
      const el = sh.body.querySelector('#syStatus');
      if (el){
        el.innerHTML = statusHTML();
        el.querySelector('#syRetry')?.addEventListener('click', () => startSync(getSync().phrase, true));
      }
      return;
    }
    render();
  };
  document.addEventListener('oc:sync', onSync);
  render();
}

/* ============ Partage en groupe : communautaire, en direct ============ */
export function openPromo(){
  let room = null;
  let peers = 0;
  let watch = null;         /* honnêteté de la liaison (relais / pair / WebRTC) */
  const queue = [];         /* payloads reçus, présentés un par un */
  const seen = new Set();   /* le même envoi ne se représente pas */
  let showing = false;
  /* quitter rend une promesse, et les départs s'enchaînent : re-entrer
     dans le MÊME groupe sans attendre la fin du départ laisserait la
     salle en morceaux des deux côtés (voir leaveRoom) */
  let leaving = Promise.resolve();
  const leave = () => {
    if (watch){ watch.stop(); watch = null; }
    const old = room;
    room = null;
    peers = 0;
    leaving = leaving.then(() => leaveRoom(old));
    return leaving;
  };
  const sh = openSheet({ title: 'Partage en groupe', icon: 'radio', onClose: leave });
  const q = s => sh.body.querySelector(s);

  const ask = async () => {
    const last = (await kvGet(PROMO_KEY)) || '';
    /* le code EST la clé : un bouton discret le remplit d'une phrase
       forte (comme la liaison des appareils) ; qui veut le sien tape le
       sien. Plus de bouton « copier » à côté (#6) : générer copie déjà —
       c'est le seul code qu'on ne connaisse pas par cœur — et un appui
       long sur le code le recopie à tout moment. */
    sh.body.innerHTML =
      `<div class="field"><label for="prPass">Mot de passe du groupe</label>
         <div class="date-row">
           <input id="prPass" autocomplete="off" autocapitalize="off" placeholder="ex : sio-lille-2026"
                  title="Appui long pour copier" value="${esc(last)}">
           <button class="btn icon-btn" id="prGen" aria-label="Générer un code fort" title="Générer un code fort">${ic('reload', 'ic-14')}</button>
         </div></div>`;
    const go = () => { const v = q('#prPass').value.trim(); if (v){ kvSet(PROMO_KEY, v); enter(v); } };
    const copier = async (msg) => {
      const v = q('#prPass').value.trim();
      if (!v) return;
      try { await navigator.clipboard.writeText(v); toast(msg); }
      catch (e) { toast('Copie impossible ici — recopie-le à la main.'); }
    };
    q('#prPass').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    q('#prGen').addEventListener('click', () => {
      q('#prPass').value = makePhrase();
      copier('Code généré et copié — partage-le au groupe.');
    });
    /* appui long (pouce) / clic maintenu (souris) sur le code lui-même */
    let hold = null;
    const inp = q('#prPass');
    inp.addEventListener('pointerdown', () => {
      clearTimeout(hold);
      hold = setTimeout(() => copier('Code copié — partage-le au groupe.'), 550);
    });
    ['pointerup', 'pointercancel', 'pointerleave', 'blur', 'input']
      .forEach(e => inp.addEventListener(e, () => clearTimeout(hold)));
    sh.setFoot([btn('Entrer', 'btn-primary', go)]);
    q('#prPass').focus();
  };

  async function enter(pass){
    await leave();
    sh.body.innerHTML =
      `<div class="sy-status" id="prStatus">${ic('radio', 'ic-14')} Connexion…</div>
       <div id="prZone"></div>`;
    sh.setFoot([btn('Quitter le groupe', 'btn-ghost', () => { leave(); ask(); })]);
    const setStatus = txt => { const el = q('#prStatus'); if (el) el.innerHTML = txt; };
    /* le statut dit l'étape prouvée — pas « personne » quand c'est le
       transport qui est mort (#14) */
    const stageStatus = stage => {
      if (peers) return;   /* refreshStatus a la main dès qu'on est en face */
      if (stage === 'norelay')
        setStatus(`${ic('square-alert', 'ic-14')} Pas de connexion — le QR et le fichier .oc marchent toujours.`);
      else if (stage === 'rtcfail')
        setStatus(`${ic('square-alert', 'ic-14')} Quelqu’un est là, mais rien ne passe — prends le QR ou le fichier`);
      else if (stage === 'wait')
        setStatus(`${ic('clock', 'ic-14')} En attente de ton groupe`);
      else
        setStatus(`${ic('clock', 'ic-14')} Connexion…`);
    };
    watch = watchLiaison(() => peers, stageStatus);
    try {
      room = await openRoom('promo', pass, { onJoinError: () => watch && watch.fail() });   /* préfixe historique — compat */
    } catch (e) {
      leave();
      setStatus(`${ic('square-alert', 'ic-14')} Pas de connexion — réseau bloqué ? Le fichier .oc marche toujours.`);
      return;
    }
    const share = room.makeAction('share');

    const mine = () => S.companies.filter(c => !isClosed(c) && !c.demo);
    /* ce qui part : tout par défaut, élagable d'un tap */
    const unsel = new Set();
    const chosen = () => mine().filter(c => !unsel.has(c.id));
    let choosing = false;
    /* qui part, piste par piste (#2) — c'est le canal le plus exposé :
       un envoi live à toute une salle, pas un fichier qu'on relit */
    const keepMap = new Map();
    const keepOf = c => {
      if (!keepMap.has(c.id)) keepMap.set(c.id, new Set(whoCandidates(c, 'donner').map(t => t.id)));
      return keepMap.get(c.id);
    };
    const keepFn = c => { const s = keepMap.get(c.id); return s ? [...s] : null; };
    /* la même liste que « Mes pistes » : elle mérite le même contrôle —
       il manquait ici, cet écran étant arrivé après les autres (#8) */
    const st = sortState('recent');
    const ft = filterState();
    const listed = () => filterCompanies(mine(), { ...filterArgs(ft), ...sortArgs(st) });
    const refreshStatus = () => {
      const n = chosen().length;
      if (peers) setStatus(`${ic('radio', 'ic-14')} <b>${peers}</b> camarade${peers > 1 ? 's' : ''} dans le groupe`);
      else if (watch) watch.tick();   /* l'étape honnête reprend la main */
      const zone = q('#prZone');
      if (!zone) return;
      if (!peers){ zone.innerHTML = ''; return; }
      /* connecté mais rien de partageable : le DIRE, ne pas laisser un
         vide muet (les pistes d'exemple et closes ne partent pas) */
      if (!mine().length){
        zone.innerHTML =
          /* « ajoute une piste depuis Mes pistes » désigne un onglet de la
             barre du bas, visible à l'instant même. L'état seul suffit. */
          `<p class="hint" style="text-align:center">${ic('info-box', 'ic-14')} Rien à partager.</p>`;
        return;
      }
      zone.innerHTML =
        `<button class="btn btn-primary pr-send" id="prSend"${n ? '' : ' disabled'}>${ic('share', 'ic-14')} Envoyer ${n ? n + ' piste' + (n > 1 ? 's' : '') : '…'}</button>
         <div style="text-align:center;margin-top:6px"><span class="tag-share">jamais le privé</span></div>
         <button class="lb-act lb-fold" id="prPick" style="margin-top:6px" aria-expanded="${choosing}">
           <span>Choisir ce qui part</span>${ic('chevron-down', 'ic-14')}
         </button>
         ${choosing ? `<div class="listbar" style="margin-top:8px">
           <button class="lb-act" id="prAll" aria-pressed="${!unsel.size}">
             ${ic(unsel.size ? 'checkbox' : 'checkbox-on', 'ic-14')}<span>Tout</span>
           </button>${affinerBtnHTML(ft, st, { leger: true })}</div>
         <div class="pick-list pk-inverse">
           ${listed().map(c =>
             `<div class="pk-duo${unsel.has(c.id) ? ' pk-out' : ''}">
                <button class="pick pk${unsel.has(c.id) ? '' : ' on'}" data-id="${c.id}" aria-pressed="${!unsel.has(c.id)}">
                  ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
                  <div class="pk-m"><b>${esc(c.name)}</b>${c.city ? `<span>${esc(c.city)}</span>` : ''}</div>
                </button>
                ${whoLineHTML(c, keepOf(c), 'donner')}
              </div>`).join('')}
         </div>` : ''}`;
      q('#prSend').addEventListener('click', () => {
        const list = chosen();
        if (!list.length) return;
        share.send(sharePayload(list, keepFn));
        logJ('Donné (partage en groupe) : ' + list.length + ' piste(s)', null, list.map(c => c.id));
        toast('Parti vers ' + peers + ' camarade' + (peers > 1 ? 's' : '') + ' ✓');
      });
      q('#prPick').addEventListener('click', () => { choosing = !choosing; refreshStatus(); });
      bindAffinerBtn(zone, ft, st, { pool: mine }, refreshStatus);
      q('#prAll')?.addEventListener('click', () => {
        const rienDecoche = unsel.size === 0;
        unsel.clear();
        if (rienDecoche) mine().forEach(c => unsel.add(c.id));
        refreshStatus();
      });
      zone.querySelectorAll('[data-who]').forEach(b =>
        b.addEventListener('click', () => {
          const c = mine().find(x => x.id === b.dataset.who);
          if (c) openWhoPicker(c, keepOf(c), { verbe: 'donner', onChange: refreshStatus });
        }));
      zone.querySelectorAll('.pk').forEach(b =>
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          unsel.has(id) ? unsel.delete(id) : unsel.add(id);
          b.classList.toggle('on', !unsel.has(id));
          /* une piste écartée l'est ENTIÈRE : sa commande « qui » avec elle */
          b.parentElement.classList.toggle('pk-out', unsel.has(id));
          b.setAttribute('aria-pressed', !unsel.has(id));
          const n2 = chosen().length;
          const send = q('#prSend');
          send.disabled = !n2;
          send.innerHTML = `${ic('share', 'ic-14')} Envoyer ${n2 ? n2 + ' piste' + (n2 > 1 ? 's' : '') : '…'}`;
          /* la case « Tout » porte l'état : elle suit chaque tap */
          const bAll = q('#prAll');
          if (bAll){
            const tout = !unsel.size;
            bAll.setAttribute('aria-pressed', tout);
            bAll.innerHTML = ic(tout ? 'checkbox-on' : 'checkbox', 'ic-14') + '<span>Tout</span>';
          }
        }));
    };
    const showNext = () => {
      if (showing || !queue.length) return;
      showing = true;
      const { obj, from } = queue.shift();
      const psh = openSheet({ title: 'Reçu en direct', icon: 'inbox', onClose: () => { showing = false; showNext(); } });
      mergePreviewInto(psh, obj, { from });
    };
    share.onMessage = (obj, meta) => {
      if (!obj || obj.kind !== 'share' || !Array.isArray(obj.companies)) return;
      obj.companies = obj.companies.filter(x => x && typeof x === 'object' && x.name).slice(0, 2000);
      if (!obj.companies.length) return;
      /* le même envoi (re-clic, rediffusion) ne réapparaît pas —
         une empreinte, pas le JSON entier : 30 envois retenus ne
         doivent pas peser 120 Mo. Envoi obèse refusé comme par
         fichier (D4, 4 Mo). */
      const json = JSON.stringify(obj.companies);
      if (json.length > 4000000) return;
      const key = json.length + ':' + fnv(json).toString(36);
      if (seen.has(key)) return;
      seen.add(key);
      if (seen.size > 30) seen.delete(seen.values().next().value);
      queue.push({ obj, from: 'camarade ' + String((meta && meta.peerId) || '').slice(0, 4) });
      showNext();
    };
    room.onPeerJoin = () => { peers++; refreshStatus(); };
    room.onPeerLeave = () => { peers = Math.max(0, peers - 1); refreshStatus(); };
    refreshStatus();
  }
  ask();
}
