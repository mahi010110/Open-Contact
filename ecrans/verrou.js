/* ============================================================
   OpenContact · la nouvelle interface · le code et l'écran verrouillé
   (docs/brief-refonte.md §12, lot 5 ; la maquette validée le
   17 novembre 2026)

   Repris de ui/verrou.js, sans rien de l'ancienne interface : le même
   coffre (`oc_vault_v1`, engine/vault.js), les mêmes valeurs scellées au
   repos (engine/storage.js), le même compteur d'essais. Un téléphone
   protégé par l'une s'ouvre par l'autre.

   · LE PAVÉ, le même pour choisir son code et pour rouvrir l'app : six
     cases, des touches « 98 » sous le pouce ; au poste, le clavier suffit.
   · L'ÉCRAN VERROUILLÉ ne laisse rien voir derrière lui, ni « Annuler »
     ni un retour. Cinq codes faux, puis une attente qui s'allonge (30 s,
     1 min, 5 min), retenue au rechargement.
   · « CODE OUBLIÉ ? » : la phrase de secours, puis un nouveau code. Sans
     phrase, effacer cet appareil : c'est la seule sortie, et l'écran le
     dit.
   · CHOISIR SON CODE (Moi › Réglages) : le code, encore une fois, puis la
     phrase de secours. Elle existe ? on la tape une fois : le coffre a
     besoin des douze mots pour se laisser rouvrir par eux, et l'appareil
     ne les garde jamais. Elle n'existe pas ? on la crée, comme dans « Ma
     copie ».
   · Protégé, trois gestes redemandent le code : retirer le code, effacer
     cet appareil, changer de phrase (le coffre suit la phrase).
   Verrouillée, l'app garde sa clé : la liaison, la boîte et les groupes
   continuent. Le verrou protège l'écran, le coffre protège le disque.
   ============================================================ */
import { $, $$, ic, esc, remplacer, annoncer } from './outils.js';
import { logJ } from './etat.js';
import { rendre, annuler, ouvrirFeuille, rendreFeuille, fermerFeuille, feuilleOuverte } from './coque.js';
import { PIN_LEN, codeTropFacile, createVault, unlockWithPin, unlockWithPhrase, setPin,
         rotateVaultResumable, prevKeyOf, clearPrev } from '../engine/vault.js';
import { VAULT_KEY, kvGet, kvSet, kvDel, effacerCetAppareil, vaultAttach, vaultDetach,
         vaultSealAll, vaultOpenAll, vaultReseal } from '../engine/storage.js';
import { nouvellePhrase, motsAVerifier } from '../engine/moi.js';
import { chargerMoi, aUnePhrase, adopterPhrase, erreurPhrase, estMaPhrase } from './phrase.js';
import { rekeyRing } from './liaison.js';

let meta = null;          /* la métadonnée du coffre (null : pas de code) */
export const estProtege = () => !!meta;
/* l'écran verrouillé est là : rien ne se colle ni ne se dépose derrière */
export const estVerrouille = () => !!V;
const sauverMeta = () => kvSet(VAULT_KEY, JSON.stringify(meta));
async function lireCoffre(){
  try { const raw = await kvGet(VAULT_KEY); meta = raw ? JSON.parse(raw) : null; } catch (e) { meta = null; }
  if (meta && !(meta.wraps && meta.wraps.pin)) meta = null;
}
/* le journal privé ne s'écrit qu'une fois chargé : avant, il serait écrasé */
let enSession = false;
const aNoter = [];
const noter = t => { if (enSession) logJ(t); else aNoter.push(t); };
export function apresChargement(){ enSession = true; aNoter.splice(0).forEach(t => logJ(t)); }
const minutes = () => matchMedia('(min-width:901px)').matches ? 15 : 5;

/* ---------- le pavé ---------- */
const casesHTML = n => `<div class="cases" role="img" aria-label="${n} chiffre${n > 1 ? 's' : ''} sur ${PIN_LEN}">`
  + Array.from({ length: PIN_LEN }, (_, i) => `<i${i < n ? ' class="on"' : ''}></i>`).join('') + '</div>';
const paveHTML = (pre, off) => '<div class="pave">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'x'].map(k => !k ? '<span></span>'
  : k === 'x' ? `<button class="touche" data-a="${pre}-efface" aria-label="Effacer le dernier chiffre"${off ? ' disabled' : ''}>${ic('arrow-left')}</button>`
  : `<button class="touche" data-a="${pre}-chiffre" data-v="${k}"${off ? ' disabled' : ''}>${k}</button>`).join('') + '</div>';
const etapesHTML = (e, n) => `<div class="etapes-b" role="img" aria-label="Étape ${e} sur ${n}">`
  + Array.from({ length: n }, (_, i) => `<i${i < e ? ' class="on"' : ''}></i>`).join('') + '</div>';

/* ---------- les essais : cinq, puis une attente qui s'allonge ----------
   Le compte vit dans la métadonnée (il survit à un rechargement) et il
   est le même pour l'écran verrouillé et pour le code redemandé. */
const delaiApres = n => n < 5 ? 0 : [30, 60, 300][Math.min(n - 5, 2)] * 1000;
async function rater(){
  meta.guard = meta.guard || { n: 0, until: 0 };
  meta.guard.n++;
  const d = delaiApres(meta.guard.n);
  if (d) meta.guard.until = Date.now() + d;
  await sauverMeta();
}
async function reussir(){ if (meta && meta.guard){ delete meta.guard; await sauverMeta(); } }
const resteS = () => meta ? Math.max(0, Math.ceil((((meta.guard && meta.guard.until) || 0) - Date.now()) / 1000)) : 0;
const dureeDite = s => s > 90 ? Math.ceil(s / 60) + ' min' : s + ' s';
const tropDit = s => `Trop d’essais. Réessaie dans ${dureeDite(s)}.`;
const CODE_FAUX = 'Code faux.';
const TROP_FACILE = 'Trop facile à deviner. Choisis-en un autre.';
const PAS_PAREILS = 'Les deux codes ne sont pas les mêmes. Recommence.';

/* ============================================================
   L'ÉCRAN VERROUILLÉ
   ============================================================ */
let V = null, fin = null, avantFocus = null, tAttente = null;
const couche = () => $('.couche-v');
function titreV(){ return V.vue === 'oublie' ? 'Code oublié' : V.vue === 'effacer' ? 'Effacer' : 'OpenContact'; }
function corpsV(){
  if (V.vue === 'oublie')
    return '<label class="fld"><span class="et">Ta phrase de secours</span>'
      + `<textarea class="zone court v-phrase" placeholder="Les douze mots, dans l’ordre" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(V.texte)}</textarea></label>`
      + `<p class="err v-err-p"${V.err ? '' : ' hidden'}>${esc(V.err)}</p>`
      + `<button class="btn s v-coller" data-a="v-coller">${ic('clipboard')}Coller</button>`
      + `<div class="v-pied"><button class="btn p" data-a="v-phrase-ok"${V.occupe ? ' disabled' : ''}>${V.occupe ? 'Vérification…' : 'Ouvrir'}</button></div>`
      + '<div class="bas-p"><p class="doux">Sans code ni phrase, ce qui est ici ne se rouvre pas.</p>'
      + `<button class="btn s danger" data-a="v-effacer">${ic('trash')}Effacer cet appareil</button></div>`
      + '<button class="btn-g v-ret" data-a="v-retour">Retour</button>';
  if (V.vue === 'effacer')
    return '<p class="fort">Effacer cet appareil ?</p>'
      + '<p class="doux">Tu repars de zéro. Une copie, ou un autre appareil relié, te ramèneront le reste.</p>'
      + `<div class="v-pied"><button class="btn danger" data-a="v-effacer-ok">${ic('trash')}Effacer</button></div>`
      + '<button class="btn-g v-ret" data-a="v-retour">Retour</button>';
  const neuf = V.vue === 'nouveau', r = neuf ? 0 : resteS();
  const err = r ? tropDit(r) : V.err;
  return `<div class="v-etat">${ic('lock')}<b>${neuf ? (V.premier ? 'Encore une fois' : 'Choisis un nouveau code') : 'Verrouillé'}</b></div>`
    + casesHTML(V.saisie.length)
    + `<p class="err v-err"${err ? '' : ' hidden'}>${esc(err)}</p>`
    + paveHTML('v', r > 0 || V.occupe)
    + (neuf ? '' : '<button class="lien v-oublie" data-a="v-oublie">Code oublié ?</button>');
}
/* `entier` : la vue change (son titre aussi) ; sinon seul le contenu
   suit, et la touche tapée garde la main */
function majV(entier){
  const z = couche();
  if (!z || !V) return;
  if (entier || !$('.v-c', z)){
    z.innerHTML = `<div class="verrou"><section class="win v-win" role="dialog" aria-modal="true" aria-label="${V.vue ? titreV() : 'OpenContact est verrouillé'}" tabindex="-1">`
      + `<div class="tb"><span class="tb-t">${titreV()}</span></div><div class="v-c">${corpsV()}</div></section></div>`;
    const cible = $('.v-phrase', z) || $('.v-win', z);
    if (cible) cible.focus({ preventScroll: true });
    return;
  }
  remplacer($('.v-c', z), corpsV());
}
function attendre(){
  clearInterval(tAttente);
  tAttente = setInterval(() => {
    if (!V || !resteS()){ clearInterval(tAttente); if (V){ V.err = ''; majV(); } return; }
    majV();
  }, 1000);
}
function montrer(){
  return new Promise(res => {
    fin = res;
    avantFocus = document.activeElement;
    V = { vue: '', saisie: '', premier: '', err: '', texte: '', occupe: false };
    document.documentElement.classList.add('verrouille');
    const app = $('#oc');
    if (app) app.inert = true;
    majV(true);
    if (resteS()) attendre();
  });
}
function ouvrir(un){
  const f = fin;
  fin = null;
  V = null;
  clearInterval(tAttente);
  const z = couche();
  if (z) z.innerHTML = '';
  document.documentElement.classList.remove('verrouille');
  const app = $('#oc');
  if (app) app.inert = false;
  derniere = Date.now();
  if (avantFocus && avantFocus.isConnected && avantFocus.focus) avantFocus.focus({ preventScroll: true });
  avantFocus = null;
  if (f) f(un);
}
function chiffreV(d){
  if (!V || V.occupe || (V.vue && V.vue !== 'nouveau')) return;
  if (V.vue !== 'nouveau' && resteS()) return;
  if (V.saisie.length >= PIN_LEN) return;
  V.saisie += d;
  V.err = '';
  majV();
  /* la sixième case se peint avant qu'on vérifie */
  if (V.saisie.length === PIN_LEN){ const code = V.saisie; setTimeout(() => pleinV(code), 60); }
}
function effaceV(){
  if (!V || V.occupe || (V.vue && V.vue !== 'nouveau')) return;
  V.saisie = V.saisie.slice(0, -1);
  majV();
}
async function pleinV(code){
  if (!V) return;
  if (V.vue === 'nouveau'){
    if (!V.premier){
      if (codeTropFacile(code)){ V.saisie = ''; V.err = TROP_FACILE; annoncer(V.err); majV(); return; }
      V.premier = code; V.saisie = '';
      majV(true);
      return;
    }
    if (code !== V.premier){ V.premier = ''; V.saisie = ''; V.err = PAS_PAREILS; annoncer(V.err); majV(true); return; }
    V.occupe = true; majV();
    try {
      meta = await setPin(meta, { phrase: V.phrase }, code);
      delete meta.guard;
      await sauverMeta();
    } catch (e) {
      V.occupe = false; V.premier = ''; V.saisie = ''; V.err = 'Le code n’a pas pu changer. Recommence.';
      majV(true);
      return;
    }
    noter('Code oublié : un nouveau code, par la phrase de secours');
    ouvrir({ key: V.cle });
    return;
  }
  V.occupe = true; majV();
  let un = null;
  try { un = await unlockWithPin(meta, code); } catch (e) {}
  if (un){ await reussir(); ouvrir(un); return; }
  await rater();
  if (!V) return;
  V.occupe = false; V.saisie = ''; V.err = CODE_FAUX;
  const r = resteS();
  annoncer(r ? tropDit(r) : CODE_FAUX);
  majV();
  if (r) attendre();
}
async function phraseV(){
  const v = V.texte || '';
  const e = erreurPhrase(v);
  const dire = t => { V.err = t; V.occupe = false; majV(); const ta = $('.v-phrase', couche()); if (ta) ta.focus({ preventScroll: true }); annoncer(t); };
  if (e){ dire(e); return; }
  V.occupe = true; V.err = ''; majV();
  let un = null;
  try { un = await unlockWithPhrase(meta, v); } catch (e2) {}
  if (!V) return;
  if (!un){ dire('Ces douze mots ne vont pas ensemble dans cet ordre. Vérifie l’ordre.'); return; }
  V = { vue: 'nouveau', saisie: '', premier: '', err: '', texte: '', occupe: false, phrase: v, cle: un.key };
  majV(true);
}
function gesteV(ev){
  const b = ev.target.closest('[data-a]');
  if (!b || !V) return;
  const a = b.getAttribute('data-a');
  if (a === 'v-chiffre'){ chiffreV(b.getAttribute('data-v')); return; }
  if (a === 'v-efface'){ effaceV(); return; }
  if (a === 'v-oublie'){ V = { ...V, vue: 'oublie', err: '', texte: '', saisie: '' }; majV(true); return; }
  if (a === 'v-coller'){
    navigator.clipboard.readText().then(t => { V.texte = t || ''; V.err = ''; majV(); })
      .catch(() => { V.err = 'Colle ici avec un appui long : ce navigateur ne laisse pas l’app lire le presse-papier.'; majV(); });
    return;
  }
  if (a === 'v-phrase-ok'){ phraseV(); return; }
  if (a === 'v-effacer'){ V.vue = 'effacer'; V.err = ''; majV(true); return; }
  if (a === 'v-retour'){ V.vue = V.vue === 'effacer' ? 'oublie' : ''; V.err = ''; majV(true); return; }
  if (a === 'v-effacer-ok'){ b.disabled = true; effacerCetAppareil().catch(() => {}).then(() => location.replace(location.pathname)); }
}
/* le clavier : rien ne passe à l'app derrière ; la tabulation reste dans
   l'écran verrouillé ; au poste, les chiffres se tapent sans viser */
function toucheV(ev){
  if (!V) return;
  ev.stopPropagation();
  if (ev.key === 'Tab'){
    const l = $$('button:not(:disabled), textarea', couche()).filter(x => x.offsetParent);
    const i = l.indexOf(document.activeElement);
    if (!l.length){ ev.preventDefault(); return; }
    if (ev.shiftKey && i <= 0){ ev.preventDefault(); l[l.length - 1].focus(); }
    else if (!ev.shiftKey && (i < 0 || i === l.length - 1)){ ev.preventDefault(); l[0].focus(); }
    return;
  }
  const t = ev.target;
  if (t && t.matches && t.matches('textarea, input')) return;
  if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (/^[0-9]$/.test(ev.key)){ ev.preventDefault(); chiffreV(ev.key); }
  else if (ev.key === 'Backspace'){ ev.preventDefault(); effaceV(); }
}
let branche = false;
function brancherV(){
  if (branche) return;
  branche = true;
  addEventListener('keydown', toucheV, true);
  const z = couche();
  if (z){
    z.addEventListener('click', gesteV);
    z.addEventListener('input', ev => { if (V && ev.target.matches('.v-phrase')){ V.texte = ev.target.value; if (V.err){ V.err = ''; const e = $('.v-err-p', z); if (e) e.hidden = true; } } });
  }
}

/* ---------- au démarrage : rien ne se lit avant le code ---------- */
export async function ouvrirAuDemarrage(){
  brancherV();
  await lireCoffre();
  if (!meta) return;
  const un = await montrer();
  vaultAttach(un.key);
  /* un changement de phrase coupé en route : le finir, puis solder */
  if (meta.prev){
    try {
      const pk = await prevKeyOf(meta, un.key);
      if (pk){ await vaultReseal(pk, un.key); meta = clearPrev(meta); await sauverMeta(); }
    } catch (e) {}
  }
  vaultSealAll().catch(() => {});
  surveiller();
}
/* « Verrouiller maintenant », l'inactivité, l'ordre d'un autre appareil */
export function verrouiller(){
  if (!meta || V) return;
  brancherV();
  montrer().then(() => rendre());
}
document.addEventListener('oc:ringlock', () => verrouiller());

/* ---------- sans toi : 5 minutes au téléphone, 15 au poste ---------- */
let derniere = Date.now(), tVeille = null, veille = false;
function verifierVeille(){ if (meta && !V && Date.now() - derniere > minutes() * 60000) verrouiller(); }
function surveiller(){
  if (!veille){
    veille = true;
    const touche = () => { derniere = Date.now(); };
    ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, touche, { passive: true, capture: true }));
    /* revenue au premier plan, l'app regarde tout de suite : le temps
       passé ailleurs compte */
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verifierVeille(); });
  }
  clearInterval(tVeille);
  tVeille = setInterval(verifierVeille, 20000);
}

/* ============================================================
   LE CODE, DANS UNE FEUILLE : le choisir, le redemander, le retirer
   ============================================================ */
/* `f.type` : 'choisir' (Moi › Réglages) ou 'preuve' (un geste qui le redemande) */
function rendreCode(f){
  const r = f.choix ? 0 : resteS(), er = r ? tropDit(r) : f.err;
  const pad = mot => `<p class="fort c-t">${mot}</p>${casesHTML(f.saisie.length)}`
    + `<p class="err c-err"${er ? '' : ' hidden'}>${esc(er)}</p>${paveHTML('c', f.occupe || r > 0)}`;
  if (f.type === 'preuve') return { corps: pad(f.mot) };
  if (meta && f.retirer) return { corps: pad('Ton code') };
  if (meta && !f.choix)
    return { corps: '<p class="fort m-fort">Cet appareil est protégé par un code.</p>'
      + `<p class="doux">Il se verrouille au bout de ${minutes()} minutes sans toi.</p>`
      + `<div class="bas-p"><button class="btn s danger" data-a="c-retirer">${ic('lock')}Retirer le code</button></div>`,
      pied: `<button class="btn p" data-a="c-maintenant">${ic('lock')}Verrouiller maintenant</button>` };
  const e = f.etape, prog = etapesHTML(e, 3);
  if (e <= 2) return { corps: prog + pad(e === 1 ? 'Choisis ton code' : 'Encore une fois') };
  const occ = f.occupe ? ' disabled' : '', patience = 'Un instant…';
  if (f.mode === 'taper')
    return { corps: prog + '<p class="fort m-fort">Ta phrase de secours</p><p class="doux m-doux">Tape-la : si tu oublies ton code, c’est elle qui rouvre l’app.</p>'
      + '<label class="fld"><span class="et">Les douze mots, dans l’ordre</span>'
      + `<textarea class="zone court c-phrase" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">${esc(f.texte)}</textarea></label>`
      + `<p class="err c-err"${f.err ? '' : ' hidden'}>${esc(f.err)}</p>`
      + `<div class="c-ligne"><button class="btn s" data-a="c-coller">${ic('clipboard')}Coller</button><button class="lien" data-a="c-perdue">Je ne l’ai plus</button></div>`,
      pied: `<button class="btn p" data-a="c-taper-ok"${occ}>${f.occupe ? patience : 'Protéger'}</button>` };
  if (f.verif){
    const [a, b] = f.idx;
    const champ = n => `<label class="fld"><span class="et">Mot n°${n + 1}</span><input class="c-vw" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done"></label>`;
    return { corps: prog + `<p class="fort m-fort">Vérifions.</p><div class="dates2">${champ(a)}${champ(b)}</div><p class="err c-err"${f.err ? '' : ' hidden'}>${esc(f.err)}</p>`,
      pied: `<button class="btn" data-a="c-revoir"${occ}>Revoir la phrase</button><button class="btn p" data-a="c-verif"${occ}>${f.occupe ? patience : 'Continuer'}</button>` };
  }
  return { corps: prog + '<p class="fort m-fort">Ta phrase de secours</p>'
    + `<p class="doux m-doux">Code oublié, c’est elle qui rouvre l’app. Écris-la sur papier, dans l’ordre.${f.remplace ? ' Elle remplace l’ancienne.' : ''}</p>`
    + `<ol class="mots">${f.mots.map((m, i) => `<li><span>${i + 1}</span>${esc(m)}</li>`).join('')}</ol>`,
    pied: '<button class="btn p" data-a="c-notee">Je l’ai notée</button>' };
}
/* une feuille qui sert à taper un code : la touche tapée garde la main */
const majF = f => { if (feuilleOuverte() === f) rendreFeuille(); };
let tF = null;
function attendreF(f){
  clearInterval(tF);
  tF = setInterval(() => { if (feuilleOuverte() !== f || !resteS()){ clearInterval(tF); f.err = ''; majF(f); return; } majF(f); }, 1000);
}
function chiffreF(f, d){
  if (f.occupe || f.saisie.length >= PIN_LEN) return;
  if (!f.choix && resteS()) return;
  f.saisie += d; f.err = '';
  majF(f);
  if (f.saisie.length === PIN_LEN){ const code = f.saisie; setTimeout(() => pleinF(f, code), 60); }
}
async function pleinF(f, code){
  if (feuilleOuverte() !== f) return;
  /* CHOISIR : deux fois le même, jamais un code qu'on devine */
  if (f.choix){
    if (f.etape === 1){
      if (codeTropFacile(code)){ f.saisie = ''; f.err = TROP_FACILE; annoncer(f.err); majF(f); return; }
      f.premier = code; f.saisie = ''; f.etape = 2; majF(f);
      return;
    }
    if (code !== f.premier){ f.premier = ''; f.saisie = ''; f.etape = 1; f.err = PAS_PAREILS; annoncer(f.err); majF(f); return; }
    f.pin = code; f.saisie = '';
    await chargerMoi();
    f.mode = aUnePhrase() ? 'taper' : 'creer';
    if (f.mode === 'creer'){ f.mots = nouvellePhrase().split(' '); f.idx = motsAVerifier(); }
    f.etape = 3; f.err = '';
    majF(f);
    return;
  }
  /* PROUVER : le code d'aujourd'hui, avec le même compte d'essais */
  f.occupe = true; majF(f);
  let un = null;
  try { un = await unlockWithPin(meta, code); } catch (e) {}
  if (feuilleOuverte() !== f) return;
  f.occupe = false; f.saisie = '';
  if (!un){
    await rater();
    f.err = CODE_FAUX;
    const r = resteS();
    annoncer(r ? tropDit(r) : CODE_FAUX);
    majF(f);
    if (r) attendreF(f);
    return;
  }
  await reussir();
  if (f.type === 'preuve'){ f.rendu = true; f.prouve(code); fermerFeuille(); return; }
  retirerCode(un.key);
}
async function proteger(f, phrase, neuve){
  f.occupe = true; f.err = ''; majF(f);
  try {
    const made = await createVault(f.pin, phrase);
    meta = made.meta;
    await sauverMeta();
    vaultAttach(made.key);
    await vaultSealAll();
    if (neuve) await adopterPhrase(phrase);
  } catch (e) {
    meta = null; vaultDetach();
    f.occupe = false; f.err = 'Le code n’a pas pu s’enregistrer. Réessaie.';
    majF(f);
    return;
  }
  f.pin = '';
  surveiller();
  noter('Code de verrouillage choisi');
  fermerFeuille();
  rendre();
}
async function retirerCode(key){
  const avant = meta;
  try { await vaultOpenAll(); await kvDel(VAULT_KEY); } catch (e) { return; }
  vaultDetach();
  meta = null;
  clearInterval(tVeille);
  noter('Code de verrouillage retiré');
  fermerFeuille();
  rendre();
  annuler('Code retiré', async () => {
    meta = avant;
    await sauverMeta();
    vaultAttach(key);
    await vaultSealAll();
    surveiller();
    noter('Code de verrouillage remis');
    rendre();
  });
}
function gesteCode(a, el, ev, f){
  const z = $('.couche-f');
  if (a === 'c-chiffre'){ chiffreF(f, el.getAttribute('data-v')); return; }
  if (a === 'c-efface'){ if (!f.occupe){ f.saisie = f.saisie.slice(0, -1); majF(f); } return; }
  if (a === 'c-maintenant'){ fermerFeuille(); setTimeout(verrouiller, 0); return; }
  if (a === 'c-retirer'){ f.retirer = true; f.saisie = ''; f.err = ''; majF(f); if (resteS()) attendreF(f); return; }
  if (a === 'c-notee'){ f.verif = true; f.err = ''; majF(f); const i = $('.c-vw', z); if (i) i.focus(); return; }
  if (a === 'c-revoir'){ f.verif = false; f.err = ''; majF(f); return; }
  if (a === 'c-verif'){
    const l = $$('.c-vw', z).map(i => i.value.trim().toLowerCase());
    if (l[0] !== f.mots[f.idx[0]] || l[1] !== f.mots[f.idx[1]]){ f.err = 'Ce n’est pas ça : reprends ton papier.'; majF(f); return; }
    proteger(f, f.mots.join(' '), true);
    return;
  }
  if (a === 'c-perdue'){ f.mode = 'creer'; f.remplace = true; f.mots = nouvellePhrase().split(' '); f.idx = motsAVerifier(); f.verif = false; f.err = ''; majF(f); return; }
  if (a === 'c-coller'){
    navigator.clipboard.readText().then(t => { f.texte = t || ''; f.err = ''; majF(f); })
      .catch(() => { f.err = 'Colle ici avec un appui long : ce navigateur ne laisse pas l’app lire le presse-papier.'; majF(f); });
    return;
  }
  if (a === 'c-taper-ok'){
    const v = f.texte || '', e = erreurPhrase(v);
    if (e){ f.err = e; majF(f); const t = $('.c-phrase', z); if (t) t.focus(); return; }
    f.occupe = true; f.err = ''; majF(f);
    estMaPhrase(v).then(oui => {
      if (feuilleOuverte() !== f) return;
      if (!oui){ f.occupe = false; f.err = 'Ce n’est pas ta phrase de secours. Vérifie l’ordre des mots.'; majF(f); return; }
      proteger(f, v, false);
    });
  }
}
function apresCode(z, f){
  const sec = $('.sheet', z);
  if (sec && !sec.__code){
    sec.__code = true;
    /* au poste, les chiffres se tapent sans viser une touche */
    sec.addEventListener('keydown', ev => {
      if (feuilleOuverte() !== f || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.target.matches && ev.target.matches('textarea, input')) return;
      const pave = $('.pave', sec);
      if (!pave) return;
      if (/^[0-9]$/.test(ev.key)){ ev.preventDefault(); chiffreF(f, ev.key); }
      else if (ev.key === 'Backspace'){ ev.preventDefault(); if (!f.occupe){ f.saisie = f.saisie.slice(0, -1); majF(f); } }
    });
    sec.addEventListener('input', ev => {
      if (ev.target.matches('.c-phrase')) f.texte = ev.target.value;
      if (f.err && ev.target.matches('.c-phrase, .c-vw')){ f.err = ''; const e = $('.c-err', sec); if (e) e.hidden = true; }
    });
    sec.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' && !ev.isComposing && ev.target.matches && ev.target.matches('.c-vw')){ ev.preventDefault(); gesteCode('c-verif', ev.target, ev, f); }
    });
  }
  /* une étape nouvelle prend la main : ce qui s'écrit, sinon son titre —
     un lecteur d'écran entend « Encore une fois », pas « 1, bouton ».
     Entre deux chiffres, la touche tapée la garde. */
  const vue = [f.type, f.retirer, f.etape, f.mode, f.verif, !!meta].join('|');
  if (!sec || f.vu === vue) return;
  f.vu = vue;
  const cible = $('.c-phrase', sec) || $('.c-vw', sec) || $('.sh-c .c-t, .sh-c .m-fort', sec);
  if (!cible) return;
  if (!/^(TEXTAREA|INPUT)$/.test(cible.tagName)) cible.tabIndex = -1;
  cible.focus({ preventScroll: true });
}
/* Moi › Réglages › Code de verrouillage */
export function ouvrirCode(){
  const f = { titre: 'Code', type: 'choisir', choix: !meta, etape: 1, saisie: '', premier: '', err: '', texte: '', occupe: false,
    rendre: rendreCode, geste: gesteCode };
  f.apres = z => apresCode(z, f);
  f.fermee = () => { f.pin = ''; clearInterval(tF); };
  ouvrirFeuille(f);
  if (resteS() && !f.choix) attendreF(f);
}
/* un geste qui redemande le code : le code prouvé, ou null si l'on renonce */
export function demanderCode(mot){
  if (!meta) return Promise.resolve('');
  return new Promise(res => {
    const f = { titre: 'Code', type: 'preuve', mot: mot || 'Ton code', saisie: '', err: '', occupe: false,
      rendre: rendreCode, geste: gesteCode, prouve: pin => res(pin) };
    f.apres = z => apresCode(z, f);
    f.fermee = () => { clearInterval(tF); if (!f.rendu) res(null); };
    ouvrirFeuille(f);
    if (resteS()) attendreF(f);
  });
}

/* ---------- la phrase change : le coffre la suit ----------
   « UNE SEULE PHRASE » : celle qui ramène tout sur un téléphone neuf est
   aussi celle qui rouvre l'app, code oublié. Une phrase nouvelle (changée,
   ou ramenée d'ailleurs) re-scelle le coffre sous elle ; le code, déjà
   prouvé par l'appelant, ne change pas. */
export async function estPhraseDuCoffre(phrase){
  if (!meta) return true;
  try { await unlockWithPhrase(meta, phrase); return true; } catch (e) { return false; }
}
export async function alignerCoffre(phrase, pin){
  if (!meta || await estPhraseDuCoffre(phrase)) return true;
  try {
    const rot = await rotateVaultResumable(meta, { pin }, pin, phrase);
    meta = rot.meta;
    await sauverMeta();
    await vaultReseal(rot.oldKey, rot.key);
    meta = clearPrev(meta);
    await sauverMeta();
    await rekeyRing(phrase).catch(() => {});
    noter('Phrase de secours : le code suit la nouvelle phrase');
    return true;
  } catch (e) { return false; }
}
