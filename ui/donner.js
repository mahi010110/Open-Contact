/* ============================================================
   OpenContact — interface · Donner à la promo
   UN écran, pas trois. Les pistes qui partent se choisissent en
   haut ; en dessous, les trois façons de les faire passer vivent
   côte à côte — onglets au pouce (glissables), tout visible à la
   souris. Ce ne sont pas des étapes : ce sont trois chemins vers
   la même chose, et c'est très exactement ce à quoi servent des
   onglets. Le suivi privé ne part jamais : tout passe par
   sharePayload (vue communautaire) ou OCQ1/OCQP — qui l'excluent
   par construction.

   Le réseau ne se réveille jamais tout seul : le rendez-vous P2P
   n'est ouvert que si l'onglet QR est réellement affiché, et il
   est rendu (`onHide`) dès qu'on le quitte. À la souris, où le QR
   n'est qu'une colonne parmi d'autres, on s'en tient au QR hors
   ligne — un rendez-vous se demande alors d'un bouton.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { STATUSES } from '../engine/model.js';
import { sharePayload, encodeOCQ, splitOCQ, makeRdvCode, rdvNorm, rdvWrap } from '../engine/exchange.js';
import { filterCompanies } from '../engine/filter.js';
import { encryptOC2 } from '../engine/crypto.js';
import { S, isClosed, logJ } from './state.js';
import { openSheet, toast, btn, ic, softReorder, tabsUI } from './dom.js';
import { sortState, sortArgs } from './sort.js';
import { filterState, filterArgs, affinerBtnHTML, bindAffinerBtn } from './affiner.js';
import { openRoom, watchLiaison } from './synclive.js';
import { makeQrSvg } from './qr.js';
import { whoCandidates, whoLineHTML, openWhoPicker } from './qui.js';

const QR_HARD_MAX = 1800;     /* caractères par QR : au-delà, rendez-vous P2P ou QR animé */
/* l'onglet retenu d'une ouverture à l'autre — « if users are likely to
   start with the last tab displayed, make the tab persist ». En mémoire
   seulement : ça ne vaut pas une clé de stockage. */
let dernierOnglet = 0;

export function openDonner(){
  /* jamais les pistes d'exemple : leurs contacts sont fictifs */
  const alive = () => S.companies.filter(c => !isClosed(c) && !c.demo);
  if (!alive().length){ toast('Rien à donner pour l’instant — ajoute d’abord une piste.'); return; }
  const unsel = new Set();
  const st = sortState('recent');
  const ft = filterState();                  /* propre à cet écran (#8) */
  let choosing = false;
  const chosen = () => alive().filter(c => !unsel.has(c.id));
  /* qui part, piste par piste (#2) : tout le monde par défaut — une
     entrée n'apparaît ici que si on y a touché, et `keepFn` rend alors
     null pour dire « tout », ce que sharePayload attend */
  const keepMap = new Map();
  const keepOf = c => {
    if (!keepMap.has(c.id)) keepMap.set(c.id, new Set(whoCandidates(c, 'donner').map(t => t.id)));
    return keepMap.get(c.id);
  };
  const keepFn = c => { const s = keepMap.get(c.id); return s ? [...s] : null; };
  /* le compte de personnes n'est utile que s'il est incomplet */
  const cutCount = () => chosen().reduce((n, c) => {
    const s = keepMap.get(c.id);
    return n + (s ? whoCandidates(c, 'donner').length - s.size : 0);
  }, 0);
  /* salle de rendez-vous éventuelle : fermée à chaque changement d'écran */
  let room = null;
  let rdvWatch = null;     /* honnêteté de la liaison du rendez-vous */
  let gen = 0;
  const leaveRdv = () => {
    if (rdvWatch){ rdvWatch.stop(); rdvWatch = null; }
    if (room){ try { room.leave(); } catch (e) {} room = null; }
  };
  const enter = () => { gen++; leaveRdv(); return gen; };
  const sh = openSheet({ title: 'Donner', icon: 'share', onClose: () => { gen++; leaveRdv(); } });
  const q = s => sh.body.querySelector(s);

  /* ---- l'écran unique : ce qui part, puis par où ---- */
  const wide = () => matchMedia('(min-width:901px)').matches;
  let tb = null;                    /* la barre d'onglets, au pouce */

  const syncCount = () => {
    const k = chosen().length;
    const t = alive().length;
    const cut = cutCount();
    const el = q('#dnCount');
    if (!el) return;
    el.textContent = (k === t ? k : k + ' / ' + t) + ' piste' + (t > 1 ? 's' : '') +
      (cut ? ' · ' + cut + ' personne' + (cut > 1 ? 's' : '') + ' écartée' + (cut > 1 ? 's' : '') : '');
    q('#dnPick').textContent = choosing ? 'Replier' : 'Choisir…';
  };

  /* la sélection change → ce qui part change : le chemin affiché se
     refait, sinon le QR mentirait sur son contenu */
  const rejouer = () => {
    if (tb) tb.refresh();
    else renderLarge();
  };

  const renderList = () => {
    const zone = q('#dnList');
    if (!zone) return;
    if (!choosing){ zone.hidden = true; zone.innerHTML = ''; syncCount(); return; }
    const list = filterCompanies(alive(), { ...filterArgs(ft), ...sortArgs(st) });
    zone.hidden = false;
    zone.innerHTML =
      `<div class="listbar"><button class="linklike" id="dnAll">${unsel.size ? 'Tout cocher' : 'Tout décocher'}</button>${affinerBtnHTML(ft, st)}</div>
       <div class="pick-list">
         ${list.map(c =>
           `<div class="pk-duo">
              <button class="pick pk${unsel.has(c.id) ? '' : ' on'}" data-id="${c.id}" aria-pressed="${!unsel.has(c.id)}">
                ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
                <div class="pk-m"><b>${esc(c.name)}</b>
                  <span>${STATUSES[c.status].label}${c.city ? ' · ' + esc(c.city) : ''}</span></div>
              </button>
              ${whoLineHTML(c, keepOf(c), 'donner')}
            </div>`).join('')}
       </div>`;
    bindAffinerBtn(zone, ft, st, {}, () => { const play = softReorder('.modal-b .pk'); renderList(); play(); });
    zone.querySelectorAll('.pk').forEach(b =>
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        unsel.has(id) ? unsel.delete(id) : unsel.add(id);
        b.classList.toggle('on', !unsel.has(id));
        b.setAttribute('aria-pressed', !unsel.has(id));
        syncCount();
        rejouer();
      }));
    zone.querySelectorAll('[data-who]').forEach(b =>
      b.addEventListener('click', () => {
        const c = alive().find(x => x.id === b.dataset.who);
        if (c) openWhoPicker(c, keepOf(c), { verbe: 'donner', onChange: () => { renderList(); rejouer(); } });
      }));
    zone.querySelector('#dnAll').addEventListener('click', () => {
      const rienDecoche = unsel.size === 0;
      unsel.clear();
      if (rienDecoche) alive().forEach(c => unsel.add(c.id));
      renderList();
      rejouer();
    });
    syncCount();
  };

  /* ================= les trois chemins ================= */

  /* --- QR --- le contenu tient dans l'image (hors ligne) quand il est
     petit ; sinon c'est un rendez-vous P2P, et sinon encore le fichier */
  const paneQR = async (zone, { reseau }) => {
    const my = enter();
    const n = chosen().length;
    zone.innerHTML = `<div class="qr-prog">${ic('clock', 'ic-14')} Préparation…</div>`;
    let compact = null;
    try { compact = await encodeOCQ(chosen(), keepFn); } catch (e) {}
    if (my !== gen || !zone.isConnected) return;
    if (compact && compact.length <= QR_HARD_MAX){ qrDonnees(zone, compact, n, my); return; }
    if (reseau && navigator.onLine){ qrRendezVous(zone, compact, n, my); return; }
    if (compact){ qrDonnees(zone, compact, n, my); return; }
    zone.innerHTML =
      `<p class="hint" style="text-align:center">Trop de pistes pour un QR hors ligne.</p>`;
    if (!reseau && navigator.onLine){
      const b = btn('Créer un rendez-vous', 'btn-sm btn-primary',
        () => qrRendezVous(zone, compact, n, enter()));
      b.style.margin = '10px auto 0';
      b.style.display = 'flex';
      zone.append(b);
    }
  };

  const qrDonnees = async (zone, compact, n, my) => {
    const parts = compact.length > QR_HARD_MAX ? splitOCQ(compact) : [compact];
    let svgs;
    try { svgs = await Promise.all(parts.map(makeQrSvg)); }
    catch (e) {
      if (my !== gen || !zone.isConnected) return;
      zone.innerHTML = `<p class="hint" style="text-align:center">Le QR n’est pas disponible ici — passe par le fichier.</p>`;
      return;
    }
    if (my !== gen || !zone.isConnected) return;
    zone.innerHTML =
      `<div class="qr-wrap" role="img" aria-label="QR à faire scanner">${svgs[0]}</div>
       ${svgs.length > 1 ? `<div class="qr-prog" id="dnQrProg">partie 1/${svgs.length} — laisse défiler</div>` : ''}`;
    sh.setStatus(`${ic('check', 'ic-14')} hors ligne — un scan suffit`, 'ok');
    if (svgs.length > 1){
      let i = 0;
      const t = setInterval(() => {
        const wrap = zone.querySelector('.qr-wrap'), prog = zone.querySelector('#dnQrProg');
        if (!wrap || !wrap.isConnected){ clearInterval(t); return; }
        i = (i + 1) % svgs.length;
        wrap.innerHTML = svgs[i];
        prog.textContent = `partie ${i + 1}/${svgs.length} — laisse défiler`;
      }, 900);
    }
    logJ('Donné (QR) : ' + n + ' piste(s)');
  };

  const qrRendezVous = async (zone, compact, n, my) => {
    const repli = () => {
      if (compact){ toast('Pas de connexion — QR hors ligne.'); qrDonnees(zone, compact, n, enter()); }
      else { toast('Pas de connexion — passe par le fichier.'); if (tb) tb.show(1); }
    };
    zone.innerHTML = `<div class="qr-prog">${ic('clock', 'ic-14')} Connexion…</div>`;
    sh.setStatus(`${ic('clock', 'ic-14')} connexion aux relais…`);
    const code = makeRdvCode();
    let r, svg, sent = 0;
    /* l'attente dit l'étape prouvée : relais morts ou liaison en échec
       se disent dans la barre d'état, avec le repli à portée */
    const w = watchLiaison(() => sent, stage => {
      if (my !== gen || sent) return;
      if (stage === 'norelay') sh.setStatus(`${ic('square-alert', 'ic-14')} aucun relais joignable`, 'warn');
      else if (stage === 'rtcfail') sh.setStatus(`${ic('square-alert', 'ic-14')} liaison en échec`, 'warn');
      else if (stage === 'wait') sh.setStatus(`${ic('clock', 'ic-14')} en attente de l’autre appareil…`);
      else sh.setStatus(`${ic('clock', 'ic-14')} connexion aux relais…`);
    });
    try {
      [r, svg] = await Promise.all([openRoom('give', rdvNorm(code), { onJoinError: () => w.fail() }),
        makeQrSvg(rdvWrap(code))]);
    } catch (e) {
      w.stop();
      if (my === gen) repli();
      return;
    }
    if (my !== gen || !zone.isConnected){ w.stop(); try { r.leave(); } catch (e) {} return; }
    room = r;
    rdvWatch = w;
    zone.innerHTML =
      `<div class="qr-wrap" role="img" aria-label="QR de rendez-vous">${svg}</div>
       <div class="sy-phrase"><span>${esc(code)}</span></div>
       ${compact ? '<button class="linklike" id="dnOffline" style="display:flex;margin:2px auto 0">Sans réseau ? QR hors ligne</button>' : ''}`;
    zone.querySelector('#dnOffline')?.addEventListener('click', repli);
    const give = room.makeAction('give');
    const payload = sharePayload(chosen(), keepFn);
    room.onPeerJoin = () => {
      give.send(payload);
      sent++;
      if (sent === 1) logJ('Donné (QR rendez-vous) : ' + n + ' piste(s)');
      sh.setStatus(`${ic('check', 'ic-14')} envoyé — ${sent} appareil${sent > 1 ? 's' : ''}`, 'ok');
    };
  };

  /* --- le .oc, quel que soit son véhicule --- */
  const fname = () => 'opencontact-pistes-' + todayISO() + '.oc';
  const fabrique = async () => {
    const boite = sh.body.querySelector('#dnCrypt');
    const crypt = !!(boite && boite.checked);
    const champ = sh.body.querySelector('#dnPass');
    const pass = crypt && champ ? champ.value : '';
    if (crypt && !pass){
      toast('Choisis un mot de passe — ou décoche « Chiffrer ».');
      champ?.focus();
      return null;
    }
    const payload = sharePayload(chosen(), keepFn);
    const txt = pass ? await encryptOC2(payload, pass) : JSON.stringify(payload);
    logJ('Donné (fichier' + (pass ? ' chiffré' : '') + ') : ' + chosen().length + ' piste(s)');
    return txt;
  };
  const chiffrerHTML = () =>
    `<label class="ckline dn-crypt"><input type="checkbox" id="dnCrypt"> Chiffrer</label>
     <div class="field" id="dnPassF" hidden>
       <label for="dnPass">Mot de passe</label>
       <input id="dnPass" type="password" autocomplete="new-password">
     </div>`;
  const bindChiffrer = root => {
    root.querySelector('#dnCrypt')?.addEventListener('change', e => {
      root.querySelector('#dnPassF').hidden = !e.target.checked;
      if (e.target.checked) root.querySelector('#dnPass').focus();
    });
  };

  const paneFichier = (zone, o) => {
    sh.setStatus(null);
    zone.innerHTML =
      `<div class="pc-actions">
         <button class="btn btn-sm btn-primary" id="dnDl">Télécharger</button>
         ${navigator.share ? '<button class="btn btn-sm" id="dnShare">Partager</button>' : ''}
       </div>
       <p class="pd dn-fname">${esc(fname())}</p>
       ${o && o.sansCrypt ? '' : chiffrerHTML()}`;
    bindChiffrer(zone);
    zone.querySelector('#dnDl').addEventListener('click', async () => {
      const txt = await fabrique();
      if (txt == null) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' }));
      a.download = fname();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Fichier téléchargé ✓');
    });
    zone.querySelector('#dnShare')?.addEventListener('click', async () => {
      const txt = await fabrique();
      if (txt == null) return;
      const file = new File([txt], fname(), { type: 'application/octet-stream' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Pistes OpenContact' });
        else await navigator.share({ title: 'Pistes OpenContact', text: txt });
        toast('Parti ✓');
      } catch (e) { /* partage annulé : pas une erreur */ }
    });
  };

  const paneTexte = (zone, o) => {
    sh.setStatus(null);
    zone.innerHTML =
      `<div class="field dn-blob">
         <textarea id="dnBlob" readonly aria-label="Le texte à copier"></textarea>
       </div>
       <button class="btn btn-sm btn-primary" id="dnCopy">Copier</button>
       ${o && o.sansCrypt ? '' : chiffrerHTML()}`;
    bindChiffrer(zone);
    /* l'aperçu montre ce qui partira vraiment — en clair tant que
       « Chiffrer » n'est pas coché, illisible dès qu'il l'est */
    const apercu = async () => {
      const t = zone.querySelector('#dnBlob');
      if (!t) return;
      try { t.value = JSON.stringify(sharePayload(chosen(), keepFn)); } catch (e) { t.value = ''; }
    };
    apercu();
    zone.querySelector('#dnCopy').addEventListener('click', async () => {
      const txt = await fabrique();
      if (txt == null) return;
      try { await navigator.clipboard.writeText(txt); toast('Copié — colle-le où tu veux.'); }
      catch (e) { toast('Copie impossible ici — passe par Télécharger.'); }
    });
  };

  /* ================= l'assemblage ================= */
  const enteteHTML =
    `<div class="dn-what">
       <span class="dn-count" id="dnCount"></span>
       <button class="linklike" id="dnPick"></button>
     </div>
     <div id="dnList" hidden></div>`;

  /* à la souris : tout est là, rien à découvrir d'un clic */
  const renderLarge = () => {
    enter();
    sh.body.innerHTML =
      `${enteteHTML}
       <div class="dn-large">
         <div class="dn-qr" id="dnQRZone"></div>
         <div class="dn-sep"></div>
         <div class="dn-ways">
           <fieldset class="fset"><legend>Un fichier</legend><div id="dnFileZone"></div></fieldset>
           <fieldset class="fset"><legend>Du texte</legend><div id="dnTextZone"></div></fieldset>
           <div id="dnCryptZone"></div>
         </div>
       </div>`;
    bindEntete();
    paneQR(q('#dnQRZone'), { reseau: false });
    /* les deux cadres sont visibles EN MÊME TEMPS ici : « Chiffrer » ne
       peut pas vivre dans chacun — un seul réglage, posé sous les deux */
    paneFichier(q('#dnFileZone'), { sansCrypt: true });
    paneTexte(q('#dnTextZone'), { sansCrypt: true });
    q('#dnCryptZone').innerHTML = chiffrerHTML();
    bindChiffrer(q('#dnCryptZone'));
    sh.setFoot(null);
  };

  /* au pouce : trois onglets, glissables — le réseau n'existe que là */
  const renderNarrow = () => {
    sh.body.innerHTML = `${enteteHTML}<div id="dnTabs"></div>`;
    bindEntete();
    tb = tabsUI(q('#dnTabs'), [
      { id: 'dnQR', label: 'QR',
        render: z => paneQR(z, { reseau: true }),
        onHide: () => { enter(); sh.setStatus(null); } },
      { id: 'dnFile', label: 'Fichier', render: paneFichier },
      { id: 'dnText', label: 'Texte', render: paneTexte }
    ], { start: dernierOnglet, onChange: i => { dernierOnglet = i; } });
    sh.setFoot(null);
  };

  function bindEntete(){
    q('#dnPick').addEventListener('click', () => { choosing = !choosing; renderList(); });
    renderList();
    syncCount();
  }

  const dessine = () => (wide() ? renderLarge() : renderNarrow());
  dessine();
  /* franchir le seuil ne doit pas laisser un écran d'un autre contexte */
  const mq = matchMedia('(min-width:901px)');
  const onMq = () => { if (sh.ov.isConnected) dessine(); };
  mq.addEventListener('change', onMq);
}
