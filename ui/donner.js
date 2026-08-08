/* ============================================================
   OpenContact — interface · Donner à la promo
   Une feuille, une décision : QR (en personne) ou fichier .oc
   (à distance, chiffrable d'une case). Tout part par défaut —
   élagable d'un tap, triable comme partout. Le suivi privé ne
   part jamais : tout passe par sharePayload (vue communautaire)
   ou OCQ1/OCQP — qui l'excluent par construction.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { STATUSES } from '../engine/model.js';
import { sharePayload, encodeOCQ, splitOCQ, makeRdvCode, rdvNorm, rdvWrap } from '../engine/exchange.js';
import { filterCompanies } from '../engine/filter.js';
import { encryptOC2 } from '../engine/crypto.js';
import { S, isClosed, logJ } from './state.js';
import { openSheet, toast, btn, ic, softReorder, lockRowHTML, bindLockRow } from './dom.js';
import { sortState, sortArgs } from './sort.js';
import { filterState, filterArgs, affinerBtnHTML, bindAffinerBtn } from './affiner.js';
import { openRoom, leaveRoom, watchLiaison } from './synclive.js';
import { makeQrSvg } from './qr.js';
import { whoCandidates, whoLineHTML, whoInline, openWhoPicker } from './qui.js';
import { maCarte, monProfilEnClair } from './groupe.js';
import { saveProfile } from './state.js';

/* Le prénom qui accompagne « j'y suis passé ». Il ne part QUE sur les
   pistes portant une déclaration (voir communityView) : un partage sans
   déclaration reste anonyme, exactement comme avant. */
const moiQui = () => String((S.profile && S.profile.name) || '').trim().split(/\s+/)[0] || '';

const QR_HARD_MAX = 1800;     /* caractères par QR : au-delà, rendez-vous P2P ou QR animé */

export function openDonner(){
  /* jamais les pistes d'exemple : leurs contacts sont fictifs */
  const alive = () => S.companies.filter(c => !isClosed(c) && !c.demo);
  if (!alive().length){ toast('Rien à donner pour l’instant — ajoute d’abord une piste.'); return; }
  const unsel = new Set();
  /* joindre mon profil : retenu d'un partage à l'autre, mais jamais
     appliqué en silence — la ligne dit ce qu'il emporte, à chaque fois */
  let joindre = !!(S.profile && S.profile.flags && S.profile.flags.joindreProfil);
  const carteJointe = () => (joindre ? maCarte() : null);
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
  /* les départs s'enchaînent et s'attendent — une salle qu'on quitte
     met un instant à se fermer vraiment (voir leaveRoom) */
  let leaving = Promise.resolve();
  const leaveRdv = () => {
    if (rdvWatch){ rdvWatch.stop(); rdvWatch = null; }
    const old = room;
    room = null;
    leaving = leaving.then(() => leaveRoom(old));
    return leaving;
  };
  const enter = () => { gen++; leaveRdv(); return gen; };
  const sh = openSheet({ title: 'Donner', icon: 'share', onClose: () => { gen++; leaveRdv(); } });
  const q = s => sh.body.querySelector(s);

  /* ---- l'écran : QR ou fichier — tout part par défaut, élagable ---- */
  const stepHow = () => {
    enter();
    sh.setTitle('Donner');
    /* mobile = le terrain : QR d'abord ; desktop = le poste : fichier
       d'abord, le QR devient le pont vers le téléphone (#18) */
    const wide = matchMedia('(min-width:901px)').matches;
    /* la SITUATION en gras, le moyen en donnée : au moment de donner, la
       question qu'on se pose est « l'autre est là, ou pas ? » — pas « QR
       ou fichier ? ». Le moyen reste écrit dessous, personne n'est perdu. */
    const optQR = `<button class="pick" id="dnQR"><b>${ic('grid-3x3', 'ic-14')} En personne</b><span>${wide ? 'QR à scanner avec un téléphone' : 'QR à scanner'}</span></button>`;
    const optFile = `<button class="pick" id="dnFile"><b>${ic('file', 'ic-14')} À distance</b><span>fichier .oc</span></button>`;
    /* ce qui part AVANT comment ça part : on ne choisit pas un canal sans
       savoir ce qu'on met dedans. La liste dépliée pousse les deux choix
       vers le bas — c'est l'ordre de lecture, et le pouce les trouve mieux. */
    /* Pas de rappel de confidentialité en tête. Il se lisait à chaque
       ouverture, disait une règle du produit et non un geste à faire, et
       repoussait vers le bas la seule chose qui se décide ici : ce qui
       part. Ce que l'app ne partage jamais, elle ne le partage jamais —
       l'écrire cent fois ne le rend pas plus vrai. */
    sh.body.innerHTML =
      `<div class="dn-src">
         <div class="dn-what">
           <span class="dn-count" id="dnCount"></span>
           <button class="lb-act lb-fold" id="dnPick" aria-expanded="false">
             <span>Choisir</span>${ic('chevron-down', 'ic-14')}
           </button>
         </div>
         ${/* Ce qui part de MOI avec les pistes. Sans lui, le camarade
              reçoit « une piste où quelqu'un a fait son stage » : le
              prénom voyage déjà (vecuQui), mais il ne mène à personne
              tant que la personne n'est pas dans son groupe.
              Décoché par défaut à la première ouverture — un partage
              est anonyme tant qu'on n'a pas dit le contraire — puis le
              choix se retient, TOUJOURS accompagné de ce qu'il
              emporte, mot pour mot. Retenu n'est pas silencieux. */''}
         ${maCarte() ? `<div class="dn-moi">
           <button class="lb-act" id="dnMoi" aria-pressed="false">
             ${ic('checkbox', 'ic-14')}<span>Joindre mon profil</span>
           </button>
           <span class="dn-moi-q" id="dnMoiQ" hidden></span>
         </div>` : ''}
         <div id="dnList" hidden></div>
       </div>
       <div class="pick-list">
         ${wide ? optFile + optQR : optQR + optFile}
       </div>`;
    const syncCount = () => {
      const k = chosen().length;
      const t = alive().length;
      const cut = cutCount();
      q('#dnCount').textContent = (k === t ? k : k + ' / ' + t) + ' piste' + (t > 1 ? 's' : '') +
        (cut ? ' · ' + cut + ' personne' + (cut > 1 ? 's' : '') + ' écartée' + (cut > 1 ? 's' : '') : '');
      /* le mot ne bascule plus — « Choisir » puis « Replier » sur la même
         cible obligeait à relire pour savoir où l'on en était. Le chevron
         dit l'état, comme partout ailleurs dans l'app. */
      q('#dnPick').setAttribute('aria-expanded', choosing);
      /* la case « Tout » porte l'état : elle suit chaque tap individuel */
      const bAll = q('#dnAll');
      if (bAll){
        const tout = !unsel.size;
        bAll.setAttribute('aria-pressed', tout);
        bAll.innerHTML = ic(tout ? 'checkbox-on' : 'checkbox', 'ic-14') + '<span>Tout</span>';
      }
    };
    const renderList = () => {
      const zone = q('#dnList');
      if (!choosing){ zone.hidden = true; zone.innerHTML = ''; syncCount(); return; }
      const list = filterCompanies(alive(), { ...filterArgs(ft), ...sortArgs(st) });
      zone.hidden = false;
      zone.innerHTML =
        `<div class="listbar">
           <button class="lb-act" id="dnAll" aria-pressed="${!unsel.size}">
             ${ic(unsel.size ? 'checkbox' : 'checkbox-on', 'ic-14')}<span>Tout</span>
           </button>${affinerBtnHTML(ft, st, { leger: true })}</div>
         <div class="pick-list pk-inverse">
           ${list.map(c =>
             `<div class="pk-duo${unsel.has(c.id) ? ' pk-out' : ''}">
                <button class="pick pk${unsel.has(c.id) ? '' : ' on'}" data-id="${c.id}" aria-pressed="${!unsel.has(c.id)}">
                  ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
                  <div class="pk-m"><b>${esc(c.name)}</b>
                    <span>${STATUSES[c.status].label}${c.city ? ' · ' + esc(c.city) : ''}${
                      /* déjà échappé par whoInline — il porte son icône */
                      whoInline(c, keepOf(c), 'donner') && ' · ' + whoInline(c, keepOf(c), 'donner')
                      || ''}</span></div>
                </button>
                ${whoLineHTML(c, keepOf(c), 'donner')}
              </div>`).join('')}
         </div>`;
      bindAffinerBtn(zone, ft, st, { pool: alive }, () => { const play = softReorder('.modal-b .pk'); renderList(); play(); });
      zone.querySelectorAll('.pk').forEach(b =>
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          unsel.has(id) ? unsel.delete(id) : unsel.add(id);
          b.classList.toggle('on', !unsel.has(id));
          /* une piste écartée l'est ENTIÈRE : sa commande « qui » s'éteint
             avec elle — choisir des personnes pour ce qui ne part pas
             n'a pas de sens */
          b.parentElement.classList.toggle('pk-out', unsel.has(id));
          b.setAttribute('aria-pressed', !unsel.has(id));
          syncCount();
        }));
      zone.querySelectorAll('[data-who]').forEach(b =>
        b.addEventListener('click', () => {
          const c = alive().find(x => x.id === b.dataset.who);
          if (c) openWhoPicker(c, keepOf(c), { verbe: 'donner', onChange: renderList });
        }));
      zone.querySelector('#dnAll').addEventListener('click', () => {
        const rienDecoche = unsel.size === 0;
        unsel.clear();
        if (rienDecoche) alive().forEach(c => unsel.add(c.id));
        renderList();
      });
      syncCount();
    };
    /* La ligne dit ce qu'elle emporte, mot pour mot, et seulement quand
       elle est cochée : décochée, elle n'a rien à annoncer. */
    const syncMoi = () => {
      const b = q('#dnMoi');
      if (!b) return;
      b.setAttribute('aria-pressed', joindre);
      b.classList.toggle('on', joindre);
      b.innerHTML = ic(joindre ? 'checkbox-on' : 'checkbox', 'ic-14') + '<span>Joindre mon profil</span>';
      const quoi = q('#dnMoiQ');
      quoi.hidden = !joindre;
      quoi.textContent = joindre ? monProfilEnClair() : '';
    };
    q('#dnMoi')?.addEventListener('click', () => {
      joindre = !joindre;
      S.profile.flags.joindreProfil = joindre;
      saveProfile();
      syncMoi();
    });
    syncMoi();
    q('#dnPick').addEventListener('click', () => { choosing = !choosing; renderList(); });
    /* Rien de coché : le canal ne peut pas partir, mais gronder ne fait
       pas avancer. « Coche au moins une piste » laissait l'écran EXACTEMENT
       où il était, avec la liste encore repliée — la chose à faire cachée
       derrière un deuxième tap qu'il fallait deviner. Le bouton ouvre donc
       le choix : un tap, et on est là où il faut. */
    const need = fn => () => {
      if (chosen().length){ fn(); return; }
      if (!choosing){ choosing = true; renderList(); }
    };
    q('#dnQR').addEventListener('click', need(stepQR));
    q('#dnFile').addEventListener('click', need(stepFile));
    sh.setFoot(null);
    renderList();
    syncCount();
  };

  /* ---- QR : petit lot → QR de données (hors ligne, un scan) ;
     gros lot → rendez-vous P2P, repli QR animé — tout seul ---- */
  const stepQR = async () => {
    const my = enter();
    const n = chosen().length;
    /* la sélection se fige ICI, avec son compte : les deux voyagent
       ensemble jusqu'au journal, sinon la ligne d'échange dirait un
       nombre et rouvrirait une autre liste */
    const ids = chosen().map(c => c.id);
    let compact = null;
    try { compact = await encodeOCQ(chosen(), keepFn, moiQui(), carteJointe()); } catch (e) {}
    if (my !== gen) return;
    if (compact && compact.length <= QR_HARD_MAX){ stepQRData(compact, n, ids); return; }
    if (navigator.onLine){ stepQRRdv(compact, n, ids); return; }
    if (compact){ stepQRData(compact, n, ids); return; }
    toast('Le QR n’est pas disponible sur ce navigateur — passe par le fichier.');
    stepFile();
  };

  /* le QR porte les données (OCQ1) — animé en plusieurs parties si besoin */
  const stepQRData = async (compact, n, ids) => {
    const my = enter();
    const parts = compact.length > QR_HARD_MAX ? splitOCQ(compact) : [compact];
    let svgs;
    try {
      svgs = await Promise.all(parts.map(makeQrSvg));
    } catch (e) {
      /* générateur indisponible : un écran bloqué sans un mot n'est
         pas une réponse — le fichier marche toujours */
      if (my !== gen) return;
      toast('Le QR n’est pas disponible ici — passe par le fichier.');
      stepFile();
      return;
    }
    if (my !== gen) return;
    sh.setTitle(`QR — ${n} piste${n > 1 ? 's' : ''}`);
    sh.body.innerHTML =
      `<div class="qr-wrap" role="img" aria-label="QR à faire scanner">${svgs[0]}</div>
       ${svgs.length > 1 ? `<div class="qr-prog" id="dnQrProg">partie 1/${svgs.length} — laisse défiler</div>` : ''}
`;
    if (svgs.length > 1){
      let i = 0;
      const t = setInterval(() => {
        const wrap = q('.qr-wrap'), prog = q('#dnQrProg');
        if (!wrap || !document.body.contains(wrap)){ clearInterval(t); return; }   /* étape quittée */
        i = (i + 1) % svgs.length;
        wrap.innerHTML = svgs[i];
        prog.textContent = `partie ${i + 1}/${svgs.length} — laisse défiler`;
      }, 900);
    }
    logJ('Donné (QR) : ' + n + ' piste(s)', null, ids);
    sh.setFoot([btn('← Retour', 'btn-ghost', stepHow), btn('Fichier plutôt', '', stepFile)]);
  };

  /* le QR est un code de rendez-vous (OCR1) : l'autre appareil scanne
     ou tape le code, l'appairage P2P fait passer les fiches — sans
     limite de nombre. Échec de connexion = repli silencieux. */
  const stepQRRdv = async (compact, n, ids) => {
    const my = enter();
    await leaving;
    if (my !== gen) return;
    const fallback = () => {
      if (compact){ toast('Pas de connexion — QR hors ligne.'); stepQRData(compact, n, ids); }
      else { toast('Pas de connexion — passe par le fichier.'); stepFile(); }
    };
    sh.setTitle(`QR — ${n} piste${n > 1 ? 's' : ''}`);
    sh.body.innerHTML = `<div class="qr-prog">${ic('clock', 'ic-14')} Connexion…</div>`;
    sh.setFoot([btn('← Retour', 'btn-ghost', stepHow)]);
    const code = makeRdvCode();
    let r, svg;
    let sent = 0;
    /* l'attente dit l'étape prouvée — relais morts ou liaison directe
       en échec basculent d'eux-mêmes vers le repli affiché */
    const w = watchLiaison(() => sent, stage => {
      if (my !== gen || sent) return;
      const el = q('#dnRdvSt');
      if (!el) return;
      if (stage === 'norelay')
        el.innerHTML = `${ic('square-alert', 'ic-14')} Pas de connexion`;
      else if (stage === 'rtcfail')
        el.innerHTML = `${ic('square-alert', 'ic-14')} Liaison impossible`;
      else if (stage === 'wait')
        el.innerHTML = `${ic('clock', 'ic-14')} En attente…`;
      else
        el.innerHTML = `${ic('clock', 'ic-14')} Connexion…`;
    });
    try {
      [r, svg] = await Promise.all([openRoom('give', rdvNorm(code), { onJoinError: () => w.fail() }),
        makeQrSvg(rdvWrap(code))]);
    } catch (e) {
      w.stop();
      if (my === gen) fallback();
      return;
    }
    if (my !== gen){ w.stop(); await leaveRoom(r); return; }
    room = r;
    rdvWatch = w;
    sh.body.innerHTML =
      /* Sous le code : rien qui s'explique. La phrase qui détaillait le
         geste de l'autre personne est partie — un QR affiché et un code
         lisible n'ont pas besoin qu'on dise à quoi ils servent. Restent
         les deux seules choses qui ne se devinent pas : où en est la
         liaison, et par où passer si le réseau est mort. */
      `<div class="qr-wrap" role="img" aria-label="QR de rendez-vous">${svg}</div>
       <div class="sy-phrase"><span>${esc(code)}</span></div>
       <div class="qr-prog" id="dnRdvSt">${ic('clock', 'ic-14')} Connexion…</div>
       <button class="linklike" id="dnOffline" style="display:flex;margin:2px auto 0">Sans réseau ?</button>`;
    q('#dnOffline').addEventListener('click', fallback);
    const give = r.makeAction('give');
    const payload = sharePayload(chosen(), keepFn, moiQui(), carteJointe());
    r.onPeerJoin = () => {
      give.send(payload);
      sent++;
      if (sent === 1) logJ('Donné (QR rendez-vous) : ' + n + ' piste(s)', null, ids);
      const el = q('#dnRdvSt');
      if (el) el.innerHTML = `${ic('check', 'ic-14')} Envoyé ✓ — ${sent} appareil${sent > 1 ? 's' : ''}`;
    };
  };

  /* ---- fichier .oc : case « Chiffrer », 3 sorties ---- */
  const stepFile = () => {
    enter();
    const n = chosen().length;
    const ids = chosen().map(c => c.id);
    const fname = 'opencontact-pistes-' + todayISO() + '.oc';
    sh.setTitle(`Fichier — ${n} piste${n > 1 ? 's' : ''}`);
    sh.body.innerHTML =
      `<div class="pick-list">
         ${navigator.share ? `<button class="pick" id="dnShare"><b>${ic('share', 'ic-14')} Partager</b></button>` : ''}
         <button class="pick" id="dnDl"><b>${ic('download', 'ic-14')} Télécharger</b><span>${fname}</span></button>
         <button class="pick" id="dnCopy"><b>${ic('copy', 'ic-14')} Copier</b></button>
       </div>
       ${/* Le même objet que « Ma copie » (ui/dom.js) : la case à cocher,
            son libellé, le champ et son cadre pesaient quatre lignes pour
            une question facultative. Ici le cadenas n'a pas de bouton à
            côté de lui — les trois sorties sont au-dessus — il prend donc
            la ligne entière en s'ouvrant. */''}
       <div style="margin-top:12px">${lockRowHTML({ id: 'dnCrypt' })}</div>
       <p class="hint" id="dnWarn" hidden>Perdu = irrécupérable.</p>`;
    const lock = bindLockRow(sh.body, 'dnCrypt', on => { q('#dnWarn').hidden = !on; });
    const make = async () => {
      const pass = lock.value();
      if (lock.on() && !pass){
        toast('Choisis un mot de passe — ou referme le cadenas.');
        q('#dnCryptPass').focus();
        return null;
      }
      const payload = sharePayload(chosen(), keepFn, moiQui(), carteJointe());
      const txt = pass ? await encryptOC2(payload, pass) : JSON.stringify(payload);
      logJ('Donné (fichier' + (pass ? ' chiffré' : '') + ') : ' + n + ' piste(s)', null, ids);
      return txt;
    };
    const share = q('#dnShare');
    if (share) share.addEventListener('click', async () => {
      const txt = await make();
      if (txt == null) return;
      const file = new File([txt], fname, { type: 'application/octet-stream' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Pistes OpenContact' });
        else await navigator.share({ title: 'Pistes OpenContact', text: txt });
        toast('Parti ✓');
      } catch (e) { /* partage annulé : pas une erreur */ }
    });
    q('#dnDl').addEventListener('click', async () => {
      const txt = await make();
      if (txt == null) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' }));
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Fichier téléchargé ✓');
    });
    q('#dnCopy').addEventListener('click', async () => {
      const txt = await make();
      if (txt == null) return;
      try { await navigator.clipboard.writeText(txt); toast('Copié — colle-le où tu veux.'); }
      catch (e) { toast('Copie impossible ici — passe par Télécharger.'); }
    });
    sh.setFoot([btn('← Retour', 'btn-ghost', stepHow)]);
  };

  stepHow();
}
