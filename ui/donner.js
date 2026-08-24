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
import { openSheet, toast, btn, ic, softReorder, lockRowHTML, bindLockRow, collerEnHaut } from './dom.js';
import { sortState, sortArgs } from './sort.js';
import { filterState, filterArgs, barreListeHTML, bindBarreListe, majTout,
         direCombien, rienTrouveHTML } from './affiner.js';
import { openRoom, leaveRoom, watchLiaison } from './synclive.js';
import { makeQrSvg } from './qr.js';
import { whoCandidates, whoLineHTML, whoInline, openWhoPicker } from './qui.js';

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
  const st = sortState('recent');
  const ft = filterState();                  /* propre à cet écran (#8) */
  let qs = '';                               /* ce qu'on cherche dans la liste */
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
    /* LA SITUATION D'ABORD, LE MOYEN DERRIÈRE. La question qu'on se pose
       en donnant est « l'autre est là, ou pas ? » — pas « QR ou
       fichier ? ». Mais le moyen ne se supprime pas : §6 garde ce qui
       porte un NOM DE FICHIER, et « .oc » est ce qu'on cherchera plus
       tard dans ses téléchargements. Il passe donc derrière le point
       médian, la grammaire de sous-information de l'app, au lieu de
       tenir une seconde ligne que le pied ne peut pas porter. Le mot est
       « fichier », pas « .oc » : c'est celui que l'étudiant connaît, et
       l'extension se lit de toute façon sur l'écran suivant.
       Une seule action remplie par écran (Material 3) — celle que la
       surface rend la plus probable : le QR au pouce, le fichier au poste. */
    const bQR = btn('En personne · QR', wide ? '' : 'btn-primary', stepQR, 'grid-3x3');
    const bFile = btn('À distance · fichier', wide ? 'btn-primary' : '', stepFile, 'file');
    bQR.id = 'dnQR'; bFile.id = 'dnFile';
    /* CE QUI MANQUE SE DIT LÀ OÙ L'ON DÉCIDE. Écarter quelqu'un dans la
       fiche d'une piste se voit sur SA ligne (« 2 sur 3 ») — mais vingt
       lignes plus bas, plus rien ne le rappelle. Le total vivait en tête
       d'écran, au-dessus de la liste ; il rejoint le pied, à côté des
       deux canaux : c'est l'instant où l'on envoie, donc le dernier
       moment utile pour apprendre qu'une personne ne partira pas. Un
       ÉTAT, pas une explication — il ne se montre que s'il a quelque
       chose à dire. */
    const sCut = document.createElement('span');
    sCut.className = 'dn-cut';
    sCut.hidden = true;
    sh.setFoot(wide ? [sCut, bFile, bQR] : [sCut, bQR, bFile]);
    sh.body.innerHTML = barreListeHTML({ q: qs, ft, st, tout: !unsel.size,
      n: chosen().length, total: alive().length }) + '<div id="dnItems"></div>';

    const syncCount = () => {
      const k = chosen().length;
      const t = alive().length;
      const cut = cutCount();
      majTout(sh.body, { tout: !unsel.size, n: k, total: t });
      /* CE QUI PART SE COMPTE DANS LE PIED, pas dans la barre. Les deux
         autres feuilles ont ce compte dans leur bouton d'action
         (« Continuer (3) », « Envoyer 3 pistes ») ; « Donner » n'en a pas,
         ses deux canaux ne portent pas de nombre. Il vit donc ici, à
         côté d'eux — l'instant où l'on décide — et seulement quand il
         dit quelque chose : tout coché et personne d'écarté, il se tait. */
      const bouts = [];
      if (k !== t) bouts.push(`${k} / ${t} pistes`);
      if (cut) bouts.push(cut + ' personne' + (cut > 1 ? 's' : '') + ' écartée' + (cut > 1 ? 's' : ''));
      sCut.hidden = !bouts.length;
      sCut.textContent = bouts.join(' · ');
      /* rien de coché = rien à envoyer : l'action est IMPOSSIBLE, elle se
         désactive. Avant, elle dépliait la liste pour dire ce qui
         manquait — un détour qui n'existe plus, la liste étant là. */
      for (const b of [bQR, bFile]) b.disabled = !k;
    };
    const listed = () => filterCompanies(alive(), { q: qs, ...filterArgs(ft), ...sortArgs(st) });
    /* Les LIGNES seules. Séparées de la barre parce que le champ de
       recherche ne doit pas être recréé à chaque frappe : le curseur
       sauterait et le clavier se refermerait sous le doigt. */
    const renderItems = () => {
      const box = q('#dnItems');
      if (!box) return;
      const list = listed();
      box.innerHTML = !list.length ? rienTrouveHTML() :
        `<div class="pick-list pk-inverse">
           ${list.map(c =>
             `<div class="pk-duo${unsel.has(c.id) ? ' pk-out' : ''}">
                <button class="pick pk${unsel.has(c.id) ? '' : ' on'}" data-id="${c.id}" aria-pressed="${!unsel.has(c.id)}">
                  ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
                  <div class="pk-m"><b>${esc(c.name)}</b>
                    <span class="pk-s">${STATUSES[c.status].label}${c.city ? ' · ' + esc(c.city) : ''}${
                      /* déjà échappé par whoInline — il porte son icône */
                      whoInline(c, keepOf(c), 'donner') && ' · ' + whoInline(c, keepOf(c), 'donner')
                      || ''}</span></div>
                </button>
                ${whoLineHTML(c, keepOf(c), 'donner')}
              </div>`).join('')}
         </div>`;
      box.querySelectorAll('.pk').forEach(b =>
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
      box.querySelectorAll('[data-who]').forEach(b =>
        b.addEventListener('click', () => {
          const c = alive().find(x => x.id === b.dataset.who);
          if (c) openWhoPicker(c, keepOf(c), { verbe: 'donner', onChange: renderItems });
        }));
      syncCount();
      direCombien(list.length, qs);
    };
    const glisser = () => { const play = softReorder('.modal-b .pk'); renderItems(); play(); };
    bindBarreListe(sh.body, {
      ft, st, pool: alive,
      onQ: v => { qs = v; glisser(); },
      onTout: () => {
        const rienDecoche = unsel.size === 0;
        unsel.clear();
        if (rienDecoche) alive().forEach(c => unsel.add(c.id));
        renderItems();
      },
      onAffine: glisser
    });
    collerEnHaut(sh.body.querySelector('.stick-guet'), sh.body.querySelector('.listbar'));
    renderItems();
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
    try { compact = await encodeOCQ(chosen(), keepFn, moiQui()); } catch (e) {}
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
    const payload = sharePayload(chosen(), keepFn, moiQui());
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
      const payload = sharePayload(chosen(), keepFn, moiQui());
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
