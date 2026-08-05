/* ============================================================
   OpenContact — interface · le verrouillage (profil protégé)
   Le seul écran vraiment nouveau du chantier : plein écran,
   pavé au pouce (mobile) / clavier (ordinateur), biométrie en
   accélérateur optionnel, « Code oublié ? » vers la phrase de
   secours. La création est un parcours en feuille : une décision
   par écran — code, phrase écrite sur papier, sauvegarde chiffrée
   bloquante (D15). Verrouillage auto : 5 min mobile / 15 min
   ordinateur (D6) — l'interface se voile, la clé reste attachée :
   la sync et les gestes déjà validés continuent.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { bytesToB64, b64ToBytes, encryptOC2 } from '../engine/crypto.js';
import { fullPayload } from '../engine/exchange.js';
import { PIN_LEN, makeVaultPhrase, phraseUnknownWords,
         createVault, unlockWithPin, unlockWithPhrase, unlockWithPrf,
         setPin, addPrfWrap, removePrfWrap,
         rotateVaultResumable, prevKeyOf, clearPrev } from '../engine/vault.js';
import { VAULT_KEY, kvGet, kvSet, kvDel,
         vaultAttach, vaultDetach, vaultSealAll, vaultOpenAll, vaultReseal } from '../engine/storage.js';
import { ensureRing, recoverRing, rekeyRing } from './synclive.js';
import { S, bus, logJ } from './state.js';
import { el, ic, btn, toast, openSheet, confirmSheet } from './dom.js';

let meta = null;          /* métadonnée oc_vault_v1 (null = non protégé) */
let lockEl = null;        /* l'écran verrouillé, quand il est affiché */
let lastTouch = Date.now();
let idleTimer = null;

export const isProtected = () => !!meta;
export const isLocked = () => !!lockEl;

const saveMeta = () => kvSet(VAULT_KEY, JSON.stringify(meta));
const isDesktop = () => matchMedia('(min-width:901px)').matches;
const IDLE_MS = () => (isDesktop() ? 15 : 5) * 60000;

/* ---------- pavé de saisie du code — réutilisé partout ----------
   root reçoit les points + les touches ; onFull(code) est appelé à
   6 chiffres. L'api permet d'effacer, de désactiver, de secouer. */
function padUI(root, onFull, opts){
  opts = opts || {};
  let code = '';
  let off = false;
  root.innerHTML =
    `<div class="lock-dots" role="status" aria-label="Code">${
      Array.from({ length: PIN_LEN }, () => '<span class="dot"></span>').join('')}</div>
     <div class="lock-pad">${
      [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="pad-k" data-d="${d}">${d}</button>`).join('')}
      ${opts.bio ? `<button class="pad-k pad-side" data-bio aria-label="Déverrouiller par empreinte">${ic('shield', 'ic-20')}</button>` : '<span></span>'}
      <button class="pad-k" data-d="0">0</button>
      <button class="pad-k pad-side" data-back aria-label="Effacer">${ic('arrow-left', 'ic-20')}</button>
     </div>
     <p class="lock-msg" role="alert"></p>`;
  const dots = Array.from(root.querySelectorAll('.dot'));
  const msg = root.querySelector('.lock-msg');
  const paint = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
  const push = d => {
    if (off || code.length >= PIN_LEN) return;
    code += d;
    msg.textContent = '';
    paint();
    if (code.length === PIN_LEN){ const c = code; setTimeout(() => onFull(c), 60); }
  };
  root.addEventListener('click', e => {
    const k = e.target.closest('.pad-k');
    if (!k) return;
    if (k.dataset.d != null) push(k.dataset.d);
    else if (k.hasAttribute('data-back')){ code = code.slice(0, -1); paint(); }
    else if (k.hasAttribute('data-bio') && opts.onBio) opts.onBio();
  });
  const api = {
    clear(){ code = ''; paint(); },
    say(t){ msg.textContent = t || ''; },
    shake(t){
      api.clear();
      api.say(t);
      const z = root.querySelector('.lock-dots');
      z.classList.remove('lock-err');
      void z.offsetWidth;
      z.classList.add('lock-err');
    },
    disable(v){ off = !!v; root.classList.toggle('pad-off', off); },
    key(e){          /* saisie clavier (ordinateur) */
      if (/^[0-9]$/.test(e.key)){ e.preventDefault(); push(e.key); }
      else if (e.key === 'Backspace'){ e.preventDefault(); code = code.slice(0, -1); paint(); }
    }
  };
  return api;
}

/* ---------- délai progressif après échecs (persiste au rechargement) */
function failDelay(n){
  if (n < 5) return 0;
  return [30, 60, 300][Math.min(n - 5, 2)] * 1000;
}
async function registerFail(){
  meta.guard = meta.guard || { n: 0, until: 0 };
  meta.guard.n++;
  const d = failDelay(meta.guard.n);
  if (d) meta.guard.until = Date.now() + d;
  await saveMeta();
}
async function clearFails(){
  if (meta.guard){ delete meta.guard; await saveMeta(); }
}

/* ---------- l'écran verrouillé ---------- */
function showLock(){
  return new Promise(resolve => {
    lockEl = el(
      `<div class="lock" role="dialog" aria-modal="true" aria-label="OpenContact est verrouillé">
         <div class="lock-in">
           <div class="lock-title">OPEN-CONTACT</div>
           <div class="lock-state">Verrouillé</div>
           <div class="lock-body"></div>
           <button class="linklike" id="lkForgot">Code oublié ?</button>
         </div>
       </div>`);
    document.body.append(lockEl);
    /* L'écran verrouillé ne doit RIEN montrer. Or le toast (~4 s) et la
       barre « Annuler » (~30 s) sont posés en `fixed` et survivaient
       au-dessus de lui : verrouiller juste après avoir supprimé une piste
       affichait « Supprimée : Capgemini » sur l'écran de verrouillage.
       On les masque le temps du verrou plutôt que de les détruire — leur
       minuterie continue, et « Annuler » est encore là au déverrouillage. */
    document.documentElement.classList.add('oc-locked');
    const hasBio = !!(meta.wraps && meta.wraps.prf) && !!navigator.credentials;
    const done = un => {
      document.documentElement.classList.remove('oc-locked');
      document.removeEventListener('keydown', onKey, true);
      clearInterval(waitTimer);
      lockEl.remove();
      lockEl = null;
      lastTouch = Date.now();
      resolve(un);
    };
    let busy = false;          /* une vérification est en cours (PBKDF2 ~1 s) */
    const pad = padUI(lockEl.querySelector('.lock-body'), async code => {
      busy = true;
      pad.disable(true);
      try {
        const un = await unlockWithPin(meta, code);
        await clearFails();
        done(un);
      } catch (e) {
        busy = false;
        await registerFail();
        refreshWait();
        if (!(meta.guard && meta.guard.until > Date.now())) pad.shake('Ce n’est pas ça.');
      }
    }, {
      bio: hasBio,
      onBio: () => tryBioUnlock().then(un => { if (un){ clearFails(); done(un); } })
    });
    /* délai après échecs répétés : compte à rebours sobre */
    const refreshWait = () => {
      if (busy) return;
      const until = (meta.guard && meta.guard.until) || 0;
      const left = Math.ceil((until - Date.now()) / 1000);
      if (left > 0){
        pad.disable(true);
        pad.say('Réessaie dans ' + (left > 90 ? Math.ceil(left / 60) + ' min' : left + ' s') + '.');
      } else {
        pad.disable(false);
        if (until) pad.say('');
      }
    };
    const waitTimer = setInterval(refreshWait, 1000);
    refreshWait();
    const onKey = e => {
      if (document.querySelector('.overlay')) return;   /* une feuille est ouverte au-dessus */
      pad.key(e);
    };
    document.addEventListener('keydown', onKey, true);
    lockEl.querySelector('#lkForgot').addEventListener('click', () =>
      openRecovery(un => done(un)));
    /* biométrie tentée d'office à l'ouverture */
    if (hasBio) tryBioUnlock().then(un => { if (un && lockEl){ clearFails(); done(un); } }).catch(() => {});
  });
}

/* ---------- Code oublié ? — la récupération d'urgence (D7) ----------
   La phrase prouvée : cet appareil devient l'appareil principal,
   l'ancien est écarté, code ET phrase renouvelés, données re-scellées
   sous une nouvelle clé, sauvegarde chiffrée obligatoire avant la fin.
   Honnêteté : les anciennes copies déjà exportées restent ouvrables
   avec l'ancienne phrase. */
function openRecovery(onUnlocked){
  const sh = openSheet({ title: 'Code oublié', icon: 'lock', focus: '#rcPhrase',
    guard: () => true });
  const q = s => sh.body.querySelector(s);
  let oldPhrase = '', un = null, newPin = '', newPhrase = '';

  const stepPhrase = () => {
    sh.body.innerHTML = stepsHTML(1, 4) +
      `<div class="field"><label for="rcPhrase">Ta phrase de secours</label>
         <textarea id="rcPhrase" rows="3" autocapitalize="none" autocomplete="off"
           placeholder="Les 12 mots, dans l’ordre, séparés par des espaces"></textarea>
         ${/* Trois textes pour un champ : le libellé le nomme, l'invite
              donne la forme, et « Celle que tu as écrite sur papier »
              ne faisait que rappeler. Cette ligne n'existe QUE pour
              dire l'erreur — même dessin que « Vérifions » juste
              au-dessus, où elle attend déjà d'avoir quelque chose à
              signaler. */''}
         <p class="hint" id="rcHint" hidden></p></div>`;
    sh.setFoot([btn('Vérifier', 'btn-primary', async () => {
      const phrase = q('#rcPhrase').value;
      const bad = phraseUnknownWords(phrase);
      const hint = q('#rcHint');
      if (bad.length){
        hint.hidden = false;
        hint.textContent = 'Mot inconnu : « ' + bad[0] + ' » — vérifie l’orthographe.';
        hint.classList.add('warn');
        return;
      }
      try { un = await unlockWithPhrase(meta, phrase); }
      catch (e) {
        hint.hidden = false;
        hint.textContent = 'Ce n’est pas la bonne phrase. Vérifie l’ordre des mots.';
        hint.classList.add('warn');
        return;
      }
      oldPhrase = phrase;
      stepNewPin();
    })]);
  };

  /* L'écran d'annonce est parti — le même défaut que l'accueil du
     parcours de protection : quatre phrases qui racontent les trois
     étapes suivantes, aucune donnée, un bouton pour passer. On vient de
     prouver sa phrase de secours ; on veut son app, pas un sommaire.
     Le seul fait qu'on ne peut PAS deviner — les anciennes copies
     s'ouvrent encore avec l'ancienne phrase — descend sur l'écran de la
     nouvelle copie, là où il veut dire quelque chose. */

  const stepNewPin = () => {
    sh.setTitle('Nouveau code');
    sh.body.innerHTML = stepsHTML(2, 4) + '<div id="rcPad"></div>';
    sh.setFoot(null);
    newCodePad(q('#rcPad'), code => {
      newPin = code;
      newPhrase = makeVaultPhrase();
      phraseCeremony(sh, newPhrase, doRotate, [3, 4]);
    });
  };

  const doRotate = async () => {
    sh.setTitle('Renouvellement…');
    sh.body.innerHTML = '';   /* le titre dit « Renouvellement… » : le redire dessous n'ajoute rien */
    sh.setFoot(null);
    /* ordre vital : la nouvelle métadonnée D'ABORD (elle embarque
       l'ancienne clé scellée sous la nouvelle — `prev`), le
       re-scellement ensuite. Interrompu ici = repris au prochain
       déverrouillage, sans rien perdre (voir initVerrou). */
    const rot = await rotateVaultResumable(meta, { phrase: oldPhrase }, newPin, newPhrase);
    meta = rot.meta;
    await saveMeta();
    await vaultReseal(rot.oldKey, rot.key);
    meta = clearPrev(meta);
    await saveMeta();
    un = { key: rot.key, gen: meta.gen };
    await recoverRing(oldPhrase, newPhrase).catch(() => {});
    logJ('Récupération d’urgence : protection et phrase renouvelées');
    backupCeremony(sh, newPhrase, finish,
      'Une nouvelle copie chiffrée, à garder ailleurs. '
      + 'Tes anciennes copies s’ouvrent encore avec l’ancienne phrase.', [4, 4]);
  };

  const finish = () => {
    sh.close(null, true);
    toast('Récupéré ✓ — cet appareil est ton appareil principal.');
    oldPhrase = newPhrase = newPin = '';
    onUnlocked(un);
  };

  stepPhrase();
}

/* codes refusés : suites et répétitions évidentes */
export function isWeakPin(code){
  if (/^(\d)\1+$/.test(code)) return true;
  const asc = '01234567890123456789', desc = '98765432109876543210';
  return asc.includes(code) || desc.includes(code);
}

/* ---------- où j'en suis, sans le lire ----------
   Protéger ses données, c'est quatre écrans à la suite, et rien ne
   disait où l'on en était : on avançait dans un couloir sans savoir
   s'il en restait un ou cinq. La seule indication vivait dans un mot
   — « Dernière étape : » — au milieu d'une phrase du dernier écran,
   c'est-à-dire trop tard et à l'endroit où on ne la cherche pas.
   Trois traits, pleins derrière, vides devant. Ça se comprend sans
   être lu, ça ne coûte pas un mot, et le parcours cesse de se subir. */
const stepsHTML = (i, n) =>
  `<div class="pf-steps" role="img" aria-label="Étape ${i} sur ${n}">${
    Array.from({ length: n }, (_, k) => `<span${k < i ? ' class="on"' : ''}></span>`).join('')}</div>`;

/* ---------- cérémonies communes ---------- */
/* choisir un code : saisie + confirmation, codes triviaux refusés */
function newCodePad(root, onDone){
  let first = '';
  const pad = padUI(root, code => {
    if (!first){
      if (isWeakPin(code)){ pad.shake('Trop facile à deviner.'); return; }
      first = code;
      pad.clear();
      pad.say('Encore une fois, pour confirmer.');
      return;
    }
    if (code !== first){ first = ''; pad.shake('Pas le même code — recommence.'); return; }
    onDone(code);
  });
  return pad;
}
/* la phrase : affichée, écrite sur papier, 2 mots re-vérifiés */
function phraseCeremony(sh, phrase, onOk, etape){
  const q = s => sh.body.querySelector(s);
  const pas = etape ? stepsHTML(etape[0], etape[1]) : '';
  const show = () => {
    sh.setTitle('Ta phrase de secours');
    sh.body.innerHTML =
      pas + `<ol class="phrase-grid">${phrase.split(' ').map(w => `<li>${esc(w)}</li>`).join('')}</ol>
       ${/* Une seule phrase, et c'est la seule de tout le parcours qui
            mérite d'être entière : la sécurité l'exige, au moment du
            geste (§7). « Rien à voir avec ta phrase de liaison
            d'appareils » est partie — elle expliquait un NON-rapport
            avec une fonction que l'utilisateur n'a peut-être jamais
            ouverte, et créait la confusion qu'elle prétendait lever. */''}
       <p class="hint warn">Écris-la sur papier : sans elle, un code oublié ne se récupère pas.</p>`;
    sh.setFoot([btn('Je l’ai écrite', 'btn-primary', verify)]);
  };
  const verify = () => {
    const words = phrase.split(' ');
    const a = Math.floor(Math.random() * 6), b = 6 + Math.floor(Math.random() * 6);
    sh.setTitle('Vérifions');
    sh.body.innerHTML =
      pas + `${/* deux mots de six lettres : ils tiennent côte à côte même au
             pouce. La règle générale (un champ par rang sous 901 px)
             existe pour les valeurs longues — un email, un rôle — pas
             pour ça. */''}
       <div class="grid2 grid2-tight">
         <div class="field"><label for="vw1">Mot n°${a + 1}</label>
           <input id="vw1" autocapitalize="none" autocomplete="off"></div>
         <div class="field"><label for="vw2">Mot n°${b + 1}</label>
           <input id="vw2" autocapitalize="none" autocomplete="off"></div>
       </div>
       <p class="hint" id="vwHint" hidden></p>`;
    sh.setFoot([
      btn('Revoir la phrase', 'btn-ghost', show),
      btn('Continuer', 'btn-primary', () => {
        const w1 = q('#vw1').value.trim().toLowerCase();
        const w2 = q('#vw2').value.trim().toLowerCase();
        if (w1 !== words[a] || w2 !== words[b]){
          /* la ligne n'existe QUE pour dire l'erreur : au repos, deux
             champs nommés « Mot n°3 » et « Mot n°9 » se comprennent seuls */
          q('#vwHint').hidden = false;
          q('#vwHint').textContent = 'Ce n’est pas ça — reprends ton papier.';
          q('#vwHint').classList.add('warn');
          return;
        }
        onOk();
      })
    ]);
  };
  show();
}
/* la sauvegarde chiffrée bloquante (D15/D7) — chiffrée avec la phrase */
function backupCeremony(sh, phrase, onOk, introTxt, etape){
  sh.setTitle('Ta copie');
  const pas = etape ? stepsHTML(etape[0], etape[1]) : '';
  /* Le test muet : masquer les explications vidait CET écran, et lui
     seul — tout son corps était une phrase. Or c'est l'étape qu'on ne
     peut PAS sauter. « Une copie de tout » promettait ce qu'on peut
     MONTRER : ce qu'elle contient, compté sur les vraies données. On
     voit ce qu'on sauvegarde au lieu de le lire, et le chiffrement
     descend en attribut du fichier plutôt qu'en promesse. */
  const quoiHTML =
    `<ul class="rc-lines cp-what">
       <li class="cp-file" hidden></li>
       <li>${ic('briefcase', 'ic-14')} <b>${S.companies.length}</b> piste${S.companies.length > 1 ? 's' : ''}</li>
       ${S.orphans.length ? `<li>${ic('contact', 'ic-14')} <b>${S.orphans.length}</b> contact${S.orphans.length > 1 ? 's' : ''} à rattacher</li>` : ''}
       <li>${ic('user', 'ic-14')} ton profil, tes modèles</li>
       <li>${ic('lock', 'ic-14')} chiffrée par ta phrase de secours</li>
     </ul>`;
  sh.body.innerHTML = pas +
    (introTxt ? `<p class="pd" style="margin:0 0 10px">${introTxt}</p>` : '') + quoiHTML;
  const fname = 'opencontact-copie-' + todayISO() + '.oc';
  const bDl = btn('Télécharger la copie', 'btn-primary', async () => {
    const txt = await encryptOC2(fullPayload(S.companies, S.profile, S.orphans, S.tombs), phrase);
    const A = document.createElement('a');
    A.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' }));
    A.download = fname;
    document.body.append(A);
    A.click();
    A.remove();
    setTimeout(() => URL.revokeObjectURL(A.href), 4000);
    /* La seule étape FORCÉE ne disait pas qu'elle avait marché : mesuré,
       le texte était mot pour mot identique avant et après, et aucun
       toast. Sur un téléphone, un téléchargement ne se voit pas — le nom
       du fichier est le seul FAIT qui prouve qu'il existe.
       Il s'AJOUTE à l'inventaire au lieu de le remplacer : ce qu'on
       vient de lire reste vrai, et rien ne disparaît sous le doigt.
       Le conseil, lui, est transitoire — il désigne un fichier qui
       existe enfin, et un toast est fait pour ça. */
    const li = sh.body.querySelector('.cp-file');
    if (li){
      li.hidden = false;
      li.innerHTML = `${ic('check', 'ic-14')} <b>${esc(fname)}</b>`;
    }
    toast('Copie faite — mets-la ailleurs qu’ici.');
    bEnd.disabled = false;
    bEnd.classList.add('btn-primary');
    bDl.classList.remove('btn-primary');
  }, 'download');
  const bEnd = btn('Terminer', '', onOk);
  bEnd.disabled = true;
  sh.setFoot([bDl, bEnd]);
}

/* ---------- biométrie / passkey (accélérateur optionnel, P1-3) ---------- */
export function bioAvailable(){
  return !!(window.PublicKeyCredential && navigator.credentials &&
            window.isSecureContext);
}
export const bioEnrolled = () => !!(meta && meta.wraps && meta.wraps.prf);
async function tryBioUnlock(){
  const w = meta.wraps && meta.wraps.prf;
  if (!w || !w.e) return null;
  try {
    const cred = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: b64ToBytes(w.id) }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: b64ToBytes(w.e) } } }
    } });
    const r = cred.getClientExtensionResults();
    const secret = r.prf && r.prf.results && r.prf.results.first;
    if (!secret) return null;
    return await unlockWithPrf(meta, new Uint8Array(secret));
  } catch (e) { return null; }
}
export async function enrollBio(pin){
  const cred = await navigator.credentials.create({ publicKey: {
    rp: { name: 'OpenContact' },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'opencontact', displayName: 'OpenContact' },
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
    extensions: { prf: {} }
  } });
  const evalIn = crypto.getRandomValues(new Uint8Array(32));
  const got = await navigator.credentials.get({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    allowCredentials: [{ type: 'public-key', id: cred.rawId }],
    userVerification: 'required',
    extensions: { prf: { eval: { first: evalIn } } }
  } });
  const r = got.getClientExtensionResults();
  const secret = r.prf && r.prf.results && r.prf.results.first;
  if (!secret) throw new Error('prf');
  meta = await addPrfWrap(meta, { pin }, new Uint8Array(secret), bytesToB64(new Uint8Array(cred.rawId)));
  meta.wraps.prf.e = bytesToB64(evalIn);
  await saveMeta();
}
export async function dropBio(){
  meta = removePrfWrap(meta);
  await saveMeta();
}

/* ---------- démarrage & verrouillage auto ---------- */
export async function initVerrou(){
  const raw = await kvGet(VAULT_KEY);
  if (!raw){ meta = null; return false; }
  try { meta = JSON.parse(raw); } catch (e) { meta = null; return false; }
  const un = await showLock();
  vaultAttach(un.key);
  if (meta.prev){
    /* rotation interrompue : finir le re-scellement, puis solder */
    try {
      const pk = await prevKeyOf(meta, un.key);
      if (pk){
        await vaultReseal(pk, un.key);
        meta = clearPrev(meta);
        await saveMeta();
        logJ('Rotation du coffre reprise et terminée après interruption');
      }
    } catch (e) {}
  }
  vaultSealAll().catch(() => {});     /* migration : sceller l'existant (idempotent) */
  startIdleWatch();
  return true;
}
export function lockNow(){
  if (!meta || lockEl) return;
  /* la clé RESTE attachée : la sync et une campagne validée continuent —
     le verrou protège l'écran, le coffre protège le disque */
  showLock().then(() => bus.refresh());
}
function startIdleWatch(){
  const touch = () => { lastTouch = Date.now(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, touch, { passive: true, capture: true }));
  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
    if (meta && !lockEl && Date.now() - lastTouch > IDLE_MS()) lockNow();
  }, 20000);
}

/* ---------- re-authentification des gestes sensibles (P1-2) ----------
   Le pavé de re-preuve partage le MÊME garde-fou d'échecs que l'écran
   verrouillé (compteur persistant, délai progressif) : un téléphone
   déverrouillé emprunté n'offre pas d'essais illimités ici non plus.
   Le clavier tape les chiffres (ordinateur), comme sur l'écran verrouillé. */
function proofPad(sh, onOk){
  const root = sh.body.querySelector('.rq-pad');
  const pad = padUI(root, async code => {
    pad.disable(true);
    try {
      await unlockWithPin(meta, code);
      await clearFails();
      onOk(code);
    } catch (e) {
      await registerFail();
      if (!holdIfGuarded()){ pad.disable(false); pad.shake('Ce n’est pas ça.'); }
    }
  });
  /* délai actif : pavé tenu fermé, compte à rebours sobre */
  const holdIfGuarded = () => {
    if (!root.isConnected) return true;
    const left = Math.ceil((((meta.guard && meta.guard.until) || 0) - Date.now()) / 1000);
    if (left <= 0) return false;
    pad.clear();
    pad.disable(true);
    pad.say('Réessaie dans ' + (left > 90 ? Math.ceil(left / 60) + ' min' : left + ' s') + '.');
    setTimeout(() => { if (root.isConnected && !holdIfGuarded()){ pad.disable(false); pad.say(''); } }, 1000);
    return true;
  };
  holdIfGuarded();
  sh.ov.addEventListener('keydown', e => pad.key(e));
  return pad;
}
export function requireCode(title){
  if (!meta) return Promise.resolve(true);
  return new Promise(resolve => {
    let okv = false;
    const sh = openSheet({
      title: title || 'Ton code', icon: 'lock', className: 'modal-confirm',
      onClose: () => resolve(okv)
    });
    sh.body.innerHTML = '<div id="rqPad" class="rq-pad"></div>';
    proofPad(sh, () => { okv = true; sh.close(null, true); });
  });
}

/* ---------- création : « Protéger tes données » ---------- */
export function openProtectFlow(){
  if (meta){ openManageSheet(); return; }
  let pin = '', phrase = '', saved = false;
  const sh = openSheet({
    title: 'Protéger tes données', icon: 'lock', focus: '.x'
    /* Pas de garde à la sortie. Elle demandait « Abandonner ? » en
       expliquant elle-même que rien n'est encore protégé et qu'on
       pourra recommencer : une confirmation dont le message dit qu'il
       n'y a rien à perdre ne protège personne, elle ajoute une couche
       à un parcours qui en a déjà quatre. La croix veut dire « je
       renonce », et ici renoncer ne coûte rien. */
  });
  const q = s => sh.body.querySelector(s);

  /* L'écran d'accueil est parti. Il ne contenait AUCUNE donnée : trois
     promesses (« un code pour ouvrir l'app », « tes données chiffrées »,
     « tes appareils sous contrôle ») et un bouton pour passer à la
     suite. C'est la définition d'une porte — un écran incapable
     d'afficher quoi que ce soit de réel appartient à la navigation, pas
     à un parcours (§6). Et la décision était DÉJÀ prise : on arrive ici
     en tapant « Protection » dans les réglages.
     Sa dernière ligne mentait en plus : « optionnel, sauf pour connecter
     une messagerie ou une IA » désignait deux capacités que le
     recentrage a retirées de l'écran. Le parcours passe de cinq écrans
     à quatre, et commence par le seul qui demande quelque chose. */
  const stepPin = () => {
    sh.setTitle('Ton code');
    /* « Six chiffres » : le pavé affiche SIX cases vides. Compter des
       cases est immédiat, lire qu'il y en a six ne l'est pas plus. */
    sh.body.innerHTML = stepsHTML(1, 3) + `<div id="lkPad"></div>`;
    sh.setFoot(null);
    newCodePad(q('#lkPad'), code => {
      pin = code;
      phrase = phrase || makeVaultPhrase();
      phraseCeremony(sh, phrase, () => backupCeremony(sh, phrase, finish, null, [3, 3]), [2, 3]);
    });
  };

  const finish = async () => {
    const made = await createVault(pin, phrase);
    meta = made.meta;
    await saveMeta();
    vaultAttach(made.key);
    await vaultSealAll();
    await ensureRing(phrase).catch(() => {});   /* cet appareil devient le principal */
    startIdleWatch();
    saved = true;
    logJ('Données protégées (verrouillage activé)');
    sh.close(null, true);
    bus.refresh();
    toast('Protégé ✓');
    /* L'empreinte ne se propose PLUS ici. Elle arrivait en cinquième
       couche d'un parcours qui en compte quatre, par-dessus le toast
       qui venait d'annoncer le succès — et elle est déjà dans
       « Verrouillage » (`#vgBio`), à un tap de Moi → Protection. Une
       question posée deux fois n'est pas une aide, c'est une porte de
       plus à refermer. On finit sur le succès. */
    pin = phrase = '';
  };

  stepPin();
}

/* ---------- gestion (depuis « Moi ») ---------- */
export function openManageSheet(){
  const sh = openSheet({ title: 'Verrouillage', icon: 'lock' });
  const render = () => {
    sh.body.innerHTML =
      /* « Protégé » est déjà l'étiquette de la ligne qui ouvre cette
         feuille, et le délai se découvre en s'en servant — le redire ici
         est une légende sur un écran qui n'a que des gestes. */
      `<div class="pick-list">
         <button class="pick" id="vgLock"><b>Verrouiller maintenant</b></button>
         <button class="pick" id="vgPin"><b>Changer mon code</b></button>
         ${/* Le papier se perd, et la phrase ne se REVOIT pas : elle n'est
              jamais écrite sur le disque, seul un enrobage de la clé
              maîtresse l'est. La seule porte honnête est donc d'en
              refaire une — avec le code, qu'on a encore. Sans elle,
              un code oublié devenait définitif sans que rien ne le
              dise. */''}
         <button class="pick" id="vgPhrase"><b>Refaire ma phrase de secours</b></button>
         ${bioAvailable() ? `<button class="pick" id="vgBio"><b>${bioEnrolled() ? 'Retirer' : 'Activer'} l’empreinte / le visage</b></button>` : ''}
       </div>
       <button class="linklike" id="vgOff" style="margin-top:14px;color:var(--red)">Ne plus protéger…</button>`;
    const q = s => sh.body.querySelector(s);
    q('#vgLock').addEventListener('click', () => { sh.close(); lockNow(); });
    q('#vgPin').addEventListener('click', changePin);
    q('#vgPhrase').addEventListener('click', redoPhrase);
    q('#vgBio')?.addEventListener('click', async () => {
      if (bioEnrolled()){ await dropBio(); toast('Retiré.'); render(); return; }
      askCurrentPin('Ton code actuel', async pin => {
        try { await enrollBio(pin); toast('Activé ✓'); }
        catch (e) { toast('Pas disponible ici — le code suffit.'); }
        render();
      });
    });
    q('#vgOff').addEventListener('click', async () => {
      const sure = await confirmSheet({ title: 'Ne plus protéger ?', danger: true, okLabel: 'Ne plus protéger', icon: 'lock',
        msg: 'Tes données redeviennent lisibles sur cet appareil, et les connexions qui exigent la protection seront retirées.' });
      if (!sure) return;
      askCurrentPin('Ton code, pour confirmer', async () => {
        await vaultOpenAll();          /* tout ré-écrire en clair d'abord */
        await kvDel(VAULT_KEY);        /* puis seulement retirer la métadonnée */
        vaultDetach();
        meta = null;
        logJ('Verrouillage retiré');
        sh.close(null, true);
        bus.refresh();
        toast('Ce n’est plus protégé.');
      });
    });
  };
  const askCurrentPin = (title, then) => {
    const s2 = openSheet({ title, icon: 'lock', className: 'modal-confirm' });
    s2.body.innerHTML = '<div id="cpPad" class="rq-pad"></div>';
    proofPad(s2, code => { s2.close(null, true); then(code); });
  };
  /* ---- refaire la phrase de secours (papier perdu, code encore su) ----
     Même chaîne que la récupération d'urgence, à une différence près :
     l'accès est prouvé par le CODE, pas par l'ancienne phrase — c'est
     tout l'objet. Le code, lui, ne change pas.
     Trois conséquences, dans l'ordre où elles arrivent :
     ① le coffre se re-scelle sous une clé neuve (rotateVaultResumable
        pose d'abord la métadonnée, qui embarque l'ancienne clé : une
        coupure ici se rattrape au prochain déverrouillage) ;
     ② l'anneau d'appareils doit porter la clé de la nouvelle phrase,
        sinon le secours d'urgence désignerait encore l'ancienne — et on
        ne s'en apercevrait que le jour où il faut s'en servir ;
     ③ les copies déjà exportées restent chiffrées par l'ANCIENNE
        phrase. Ça ne se devine pas, donc ça se dit — au moment où l'on
        propose d'en faire une neuve. */
  const redoPhrase = () => askCurrentPin('Ton code, pour refaire la phrase', async pin => {
    const s2 = openSheet({ title: 'Nouvelle phrase de secours', icon: 'lock' });
    const neuve = makeVaultPhrase();
    phraseCeremony(s2, neuve, async () => {
      s2.setTitle('Renouvellement…');
      s2.body.innerHTML = '';
      s2.setFoot(null);
      const rot = await rotateVaultResumable(meta, { pin }, pin, neuve);
      meta = rot.meta;
      await saveMeta();
      await vaultReseal(rot.oldKey, rot.key);
      meta = clearPrev(meta);
      await saveMeta();
      await rekeyRing(neuve).catch(() => {});
      logJ('Phrase de secours renouvelée');
      backupCeremony(s2, neuve, () => {
        s2.close(null, true);
        toast('Nouvelle phrase enregistrée ✓');
      }, 'Une copie neuve, chiffrée par cette phrase. Tes anciennes copies s’ouvrent encore avec l’ancienne.', [3, 3]);
    }, [2, 3]);
  });

  const changePin = () => askCurrentPin('Ton code actuel', cur => {
    const s2 = openSheet({ title: 'Nouveau code', icon: 'lock', className: 'modal-confirm' });
    s2.body.innerHTML = '<div id="npPad"></div>';
    newCodePad(s2.body.querySelector('#npPad'), async code => {
      meta = await setPin(meta, { pin: cur }, code);
      await saveMeta();
      logJ('Code du verrouillage changé');
      s2.close(null, true);
      toast('Nouveau code enregistré ✓');
    });
  });
  render();
}

/* l'étiquette d'état pour la ligne de « Moi » */
/* L'ÉTAT, jamais l'explication : « se verrouille seul » décrit un
   comportement, pas un état, et il n'entrait pas dans la colonne — la
   ligne affichait « protégé — se verrouille s… ». Le délai exact se dit
   sur la feuille Verrouillage, là où on peut agir dessus. */
export function verrouLabel(){
  return meta ? 'protégé' : 'non protégé';
}

/* commande « verrouiller » reçue de l'appareil principal (anneau) */
document.addEventListener('oc:ringlock', () => lockNow());
