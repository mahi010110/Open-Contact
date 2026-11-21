/* ============================================================
   OpenContact · la nouvelle interface · donner, recevoir
   (docs/brief-refonte.md §12, lot 3 ; la maquette validée le
   17 novembre 2026)

   DONNER : les pistes, toutes cochées, puis le canal comme pour écrire
   (groupe, QR, fichier, texte), et le geste en bas. Ce qui part est la
   vue communautaire (engine/exchange.js) : le nom, la ville, les
   contacts. Le suivi et les notes ne partent jamais (invariant ①).

   RECEVOIR : un QR, un fichier ou un texte — et ce qu'on te tend se
   reconnaît tout seul : des pistes, le profil d'un ami, l'invitation
   d'un groupe, sa porte. Des pistes passent TOUJOURS par l'aperçu
   (nouvelle, déjà dans tes pistes), puis « Annuler » (invariant ②).

   LE LIEN (lot 5) : le texte et le QR portent une adresse de l'app dont
   le fragment est l'OCQ1 (CONTRAT.md §2). Un camarade qui n'a pas l'app
   la tape ou la scanne avec son appareil photo : l'app s'ouvre sur « On
   te donne 3 pistes », chacune avec la personne à qui écrire. Aucun
   prénom n'y part : c'est la messagerie qui dit qui l'envoie.
   ============================================================ */
import { $, $$, ic, esc } from './outils.js';
import { S, saveData, logJ } from './etat.js';
import { C, rendre, annuler, toast, allerA, ouvrirFeuille, rendreFeuille, fermerFeuille, feuilleOuverte } from './coque.js';
import { todayISO } from '../engine/utils.js';
import { normalizeCompany } from '../engine/model.js';
import { sharePayload, encodeOCQ, splitOCQ, makeOCQJoiner, parseInput, extraireOCA, decodeOCA, lienPistes } from '../engine/exchange.js';
import { mergeIncoming, findMatch, contactKey } from '../engine/merge.js';
import { estInvitation, estCodeTape, lireInvitation, estPorte, lirePorte } from '../engine/groupe.js';
import { normalizeAmi } from '../engine/amis.js';
import { makeQrSvg, startScan } from './qr.js';
import { enregistrerFichier, envoyerTexte, partagePossible } from './fichier.js';
import { prenomMoi } from './boite.js';
import { mesGroupes, nomDe, donnerAuGroupe, marquerPris, oublierPris } from './groupes.js';
import { R, ouvrirR, fermerR, apercuAmiFeuille, apercuGroupeFeuille, apercuPorteFeuille } from './reseau.js';

const ouvertes = () => S.companies.filter(c => !c.closedReason && !c.demo);
/* l'adresse de cette app, sans son fragment : celle que le lien ouvrira */
const adresseApp = () => location.origin + location.pathname;
const QR_MAX = 1800;     /* au-delà, un QR ne se lit plus bien : il défile */
const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/* ============================================================
   DONNER
   ============================================================ */
const NOMS = { groupe: 'Groupe', qr: 'QR', fichier: 'Fichier', texte: 'Texte' };
export function commencerDon(groupe){
  const g = groupe || (mesGroupes()[0] || {}).code || '';
  R.don = { canal: g ? 'groupe' : 'qr', groupe: g, decoches: new Set(), depuis: groupe ? 'conv' : '' };
}
const choisies = () => ouvertes().filter(c => !R.don.decoches.has(c.id));
export function pageDonner(){
  if (!R.don) commencerDon();
  const D = R.don, l = ouvertes(), n = choisies().length;
  const can = (mesGroupes().length ? ['groupe'] : []).concat(['qr', 'fichier', 'texte']);
  if (!can.includes(D.canal)) D.canal = can[0];
  let h = `<div class="s-page ecr"><div class="seg canaux" role="group" aria-label="Comment">${can.map(x =>
    `<button data-a="r-don-canal" data-v="${x}" aria-pressed="${x === D.canal}"${x === D.canal ? ' class="on"' : ''}>${NOMS[x]}</button>`).join('')}</div>`;
  if (D.canal === 'groupe' && mesGroupes().length > 1)
    h += `<div class="puces don-g">${mesGroupes().map(g => `<button class="puce${g.code === D.groupe ? ' on' : ''}" data-a="r-don-g" data-v="${esc(g.code)}" aria-pressed="${g.code === D.groupe}">${esc(nomDe(g.code))}</button>`).join('')}</div>`;
  /* l'offre collée reste aussi chez toi (CONTRAT.md §3) : la phrase le dit
     dès qu'une piste en porte une */
  h += `<p class="hint">Partent : le nom, la ville, les contacts. ${l.some(c => c.offre) ? 'Tes notes, tes offres et ton suivi' : 'Tes notes et ton suivi'} restent chez toi.</p>`;
  if (!l.length) h += '<div class="panneau en-page"><p>Tes pistes arrivent ici. Garde d’abord quelques entreprises.</p></div>';
  else {
    h += `<div class="rangs">${l.map(c => {
      const on = !D.decoches.has(c.id), k = (c.contacts || []).length;
      return `<button class="ck pk" data-a="r-don-sel" data-v="${esc(c.id)}" role="checkbox" aria-checked="${on}">${ic(on ? 'checkbox-on' : 'checkbox')}`
        + `<span class="ck-t"><b>${esc(c.name)}</b><small>${esc([c.city, k ? pl(k, 'contact') : ''].filter(Boolean).join(' · ') || 'ajoutée à la main')}</small></span></button>`;
    }).join('')}</div>`;
    if (l.length > 1) h += `<button class="lien" data-a="r-don-tout">${D.decoches.size ? 'Tout cocher' : 'Tout décocher'}</button>`;
  }
  const g = D.groupe && nomDe(D.groupe);
  const lab = !n ? 'Choisis au moins une piste' : D.canal === 'groupe' ? `Donner ${pl(n, 'piste')} à ${g}`
    : D.canal === 'qr' ? 'Montrer le QR' : D.canal === 'fichier' ? (partagePossible() ? 'Envoyer le fichier' : 'Télécharger le fichier')
    : (partagePossible() ? 'Envoyer le texte' : 'Copier le texte');
  return { titre: 'Donner', corps: h + '</div>', pied: `<button class="btn p" data-a="r-don-ok"${n ? '' : ' disabled'}>${esc(lab)}</button>` };
}
export async function donnerOk(b){
  const D = R.don, list = choisies(), n = list.length;
  if (!n) return;
  const ids = list.map(c => c.id);
  if (D.canal === 'groupe'){
    b.disabled = true;
    const ok = await donnerAuGroupe(D.groupe, list).catch(() => false);
    b.disabled = false;
    if (!ok){ toast('Pas de réseau : les pistes ne sont pas parties.'); return; }
    logJ('Donné (groupe) : ' + n + ' piste(s)', null, ids);
    /* la conversation le montre : « Tu as donné 3 pistes au groupe » */
    R.don = null;
    const k = 'g:' + D.groupe;
    if (C.poste){ R.sel = null; ouvrirR('conv', k); }
    else if (D.depuis === 'conv') fermerR();
    else { fermerR(); setTimeout(() => ouvrirR('conv', k), 0); }
    return;
  }
  const payload = sharePayload(list, null, prenomMoi());
  if (D.canal === 'qr'){
    b.disabled = true;
    let compact = null, svgs = null;
    let lien = '';
    try {
      compact = await encodeOCQ(list, null, prenomMoi());
      /* un seul QR : il porte l'ADRESSE, que l'appareil photo d'un camarade
         sans l'app sait ouvrir ; trop long, l'OCQ1 seul, ou il défile */
      lien = lienPistes(adresseApp(), compact);
      const parts = lien.length <= QR_MAX ? [lien] : compact.length > QR_MAX ? splitOCQ(compact) : [compact];
      if (parts[0] !== lien) lien = '';
      svgs = await Promise.all(parts.map(makeQrSvg));
    } catch (e) {}
    b.disabled = false;
    if (!svgs){ toast('Le QR n’est pas disponible ici : passe par le fichier.'); return; }
    R.qr = { n, svgs, i: 0, lien: !!lien };
    logJ('Donné (QR) : ' + n + ' piste(s)', null, ids);
    ouvrirR('qr', '', b);
    return;
  }
  if (D.canal === 'fichier'){
    const nom = 'opencontact-pistes-' + todayISO() + '.oc';
    const r = await enregistrerFichier(JSON.stringify(payload), nom, 'Pistes OpenContact');
    if (r === 'renonce') return;
    logJ('Donné (fichier) : ' + n + ' piste(s)', null, ids);
    if (r === 'telechargement') toast(nom + ' téléchargé.');
    return;
  }
  /* le texte porte un LIEN : la messagerie le rend tapable, et l'app
     s'ouvre dessus ; sans compression (très vieux navigateur), le JSON */
  let texte = JSON.stringify(payload);
  try { texte = `${pl(n, 'piste')} pour toi sur OpenContact : ${lienPistes(adresseApp(), await encodeOCQ(list, null, prenomMoi()))}`; } catch (e) {}
  const r = await envoyerTexte(texte);
  if (r === 'renonce') return;
  if (r === 'echec'){ toast('Copie impossible ici : passe par le fichier.'); return; }
  logJ('Donné (texte) : ' + n + ' piste(s)', null, ids);
  if (r === 'copie'){ b.classList.add('fait'); b.innerHTML = ic('check') + 'Copié'; }
}
export function gesteDon(a, el){
  const v = el.getAttribute('data-v');
  if (a === 'r-don-canal'){ R.don.canal = v; rendre(); return true; }
  if (a === 'r-don-g'){ R.don.groupe = v; rendre(); return true; }
  if (a === 'r-don-sel'){ const d = R.don.decoches; d.has(v) ? d.delete(v) : d.add(v); rendre(); return true; }
  if (a === 'r-don-tout'){ const d = R.don.decoches; if (d.size) d.clear(); else ouvertes().forEach(c => d.add(c.id)); rendre(); return true; }
  if (a === 'r-don-ok'){ donnerOk(el); return true; }
  return false;
}
/* le QR : les pistes dans l'image, sans réseau ; au-delà d'un QR, il
   défile en plusieurs parties */
let tQR = null;
export function pageQR(){
  const q = R.qr;
  if (!q) return { titre: 'QR', corps: '<div class="panneau"><p>Ce QR n’est plus là.</p></div>' };
  return { titre: 'QR', corps: `<div class="s-page"><div class="qr-b" role="img" aria-label="QR à faire scanner">${q.svgs[q.i % q.svgs.length]}</div>`
    + `<p class="code-n">${pl(q.n, 'piste')}</p>`
    + (q.svgs.length > 1 ? `<p class="doux centre-t qr-part">partie ${q.i % q.svgs.length + 1}/${q.svgs.length} · laisse défiler</p>` : '')
    + `<p class="doux centre-t">${q.lien ? 'Il se scanne, même sans l’app : on voit les pistes avant de les prendre.' : 'Il se scanne depuis « Recevoir » : on voit les pistes avant de les prendre.'}</p></div>`,
    pied: '<button class="btn p" data-a="r-fin-qr">Terminé</button>' };
}
export function animerQR(z){
  clearInterval(tQR);
  const q = R.qr;
  if (!q || q.svgs.length < 2) return;
  tQR = setInterval(() => {
    const b = $('.qr-b', z), p = $('.qr-part', z);
    if (!b || !b.isConnected){ clearInterval(tQR); return; }
    q.i = (q.i + 1) % q.svgs.length;
    b.innerHTML = q.svgs[q.i];
    if (p) p.textContent = `partie ${q.i + 1}/${q.svgs.length} · laisse défiler`;
  }, 900);
}

/* ============================================================
   RECEVOIR
   ============================================================ */
const ERRS = {
  vide: 'Rien à lire : colle le message reçu en entier.',
  format: 'Ce n’est pas un partage OpenContact : vérifie le fichier ou le texte reçu.',
  troplourd: 'Trop lourd pour être ouvert (plus de 4 Mo).',
  tropdepistes: 'Plus de 2 000 pistes d’un coup : trop pour être ouvert.',
  altéré: 'Ce fichier a été modifié après l’envoi : demande-le à nouveau.',
  noqr: 'Ce navigateur est trop ancien pour ce contenu : passe par le fichier.'
};
const messageLecture = code => ERRS[code] || 'Impossible de lire ce contenu.';

/* `o.mode` : '' (le menu), 'scan', 'coller', 'mdp' ; `o.pour` : 'ami' ou
   'groupe' quand on scanne depuis « Ajouter un ami » ou « Rejoindre » */
export function ouvrirRecevoir(o = {}){
  const f = { titre: o.titre || 'Recevoir', mode: o.mode || '', pour: o.pour || '', err: '', texte: '', raw: '', pass: '',
    rendre: rendreRecevoir, geste: gesteRecevoir, focus: o.mode === 'coller' ? '.r-texte' : '',
    apres: z => brancherRecevoir(z, f), fermee: () => arreterScan() };
  ouvrirFeuille(f);
}
function rendreRecevoir(f){
  if (f.mode === 'scan') return { corps: `<div class="scan-b"><video class="scan-v" playsinline muted></video><div class="scan-m"></div></div>`
      + `<p class="doux centre-t scan-d">${esc(f.dit || 'Vise le QR.')}</p>`,
    pied: '<button class="btn" data-a="rc-coller">' + ic('clipboard') + 'Coller un texte</button>' };
  if (f.mode === 'coller') return { corps: `<label class="fld"><span class="et">Le texte reçu</span><textarea class="zone court r-texte" placeholder="Colle ici ce qu’on t’a envoyé" spellcheck="false">${esc(f.texte)}</textarea></label>`
      + `<p class="err r-err"${f.err ? '' : ' hidden'}>${esc(f.err)}</p>`,
    pied: '<button class="btn p" data-a="rc-lire">Lire</button>' };
  if (f.mode === 'mdp') return { corps: `<p class="doux">${ic('lock')} Chiffré : demande le mot de passe à qui te l’a donné.</p>`
      + `<label class="fld"><span class="et">Mot de passe</span><input class="r-pass" type="password" autocomplete="off" value="${esc(f.pass)}"${f.err ? ' aria-invalid="true"' : ''}></label>`
      + `<p class="err r-err"${f.err ? '' : ' hidden'}>${esc(f.err)}</p>`,
    pied: '<button class="btn p" data-a="rc-mdp">Déverrouiller</button>' };
  return { corps: `<div class="rangs">`
      + `<button class="rang act" data-a="rc-scan">${ic('grid-3x3')}<div class="r-c"><b>Scanner un QR</b></div></button>`
      + `<label class="rang act fichier">${ic('file')}<div class="r-c"><b>Ouvrir un fichier</b></div><input type="file" class="r-fichier" accept=".oc,.txt,.json,application/octet-stream,text/plain,application/json" aria-label="Ouvrir un fichier"></label>`
      + `<button class="rang act" data-a="rc-coller">${ic('clipboard')}<div class="r-c"><b>Coller un texte</b></div></button></div>`
      + `<p class="err r-err"${f.err ? '' : ' hidden'}>${esc(f.err)}</p>` };
}
let stopScan = null;
function arreterScan(){ if (stopScan){ const s = stopScan; stopScan = null; s(); } }
function brancherRecevoir(z, f){
  const fi = $('.r-fichier', z);
  if (fi && !fi.__b){ fi.__b = true; fi.addEventListener('change', () => {
    const file = fi.files && fi.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => lire(f, String(rd.result));
    rd.readAsText(file);
  }); }
  const ta = $('.r-texte', z);
  if (ta && !ta.__b){ ta.__b = true; ta.addEventListener('input', () => { f.texte = ta.value; }); }
  const pw = $('.r-pass', z);
  if (pw && !pw.__b){ pw.__b = true; pw.addEventListener('input', () => { f.pass = pw.value; });
    pw.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); lire(f, f.raw, f.pass); } }); }
  const v = $('.scan-v', z);
  if (v && !stopScan && !v.__b){
    v.__b = true;
    const joint = makeOCQJoiner();
    startScan(v, raw => {
      if (extraireOCA(raw) || estInvitation(raw) || estPorte(raw)){ arreterScan(); lire(f, raw); return false; }
      const part = joint(raw);
      if (!part){ arreterScan(); lire(f, raw); return false; }
      if (part.done){ arreterScan(); lire(f, part.text); return false; }
      const d = $('.scan-d', z);
      if (d) d.textContent = `QR qui défile : ${part.got}/${part.total}, continue de viser.`;
      return true;
    }).then(s => { if (feuilleOuverte() === f && f.mode === 'scan') stopScan = s; else s(); }).catch(e => {
      f.dit = e.message === 'camera-refusee' ? 'La caméra est bloquée : autorise-la dans les réglages du navigateur, ou colle le texte reçu.'
        : 'Pas de caméra ici : colle le texte reçu.';
      const d = $('.scan-d', z); if (d) d.textContent = f.dit;
      const b = $('.scan-b', z); if (b) b.hidden = true;
    });
  }
}
function gesteRecevoir(a, el, ev, f){
  if (a === 'rc-scan'){ f.mode = 'scan'; f.dit = ''; f.titre = 'Scanner'; rendreFeuille(); return; }
  if (a === 'rc-coller'){ arreterScan(); f.mode = 'coller'; f.err = ''; rendreFeuille(); const t = $('.couche-f .r-texte'); if (t) t.focus(); return; }
  if (a === 'rc-lire'){ lire(f, f.texte); return; }
  if (a === 'rc-mdp'){ lire(f, f.raw, f.pass); return; }
  /* les feuilles d'un ami, d'un groupe, d'une porte reconnus en route */
  if (f.suite && f.suite.geste) f.suite.geste(a, el, ev, f);
}
function erreur(f, code){
  f.err = messageLecture(code);
  if (!f.mode || f.mode === 'scan'){ if (f.mode === 'scan'){ f.mode = 'coller'; f.texte = ''; } }
  rendreFeuille();
}
/* ce qu'on te tend se reconnaît tout seul */
async function lire(f, raw, pass){
  arreterScan();
  const inv = (estInvitation(raw) || estCodeTape(raw)) && lireInvitation(raw);
  if (inv){ apercuGroupeFeuille(f, inv); return; }
  const porte = estPorte(raw) && lirePorte(raw);
  if (porte){ apercuPorteFeuille(f, porte); return; }
  const oca = extraireOCA(raw);
  if (oca){
    let ami = null;
    try { ami = normalizeAmi(await decodeOCA(oca)); } catch (e) {}
    if (!ami){ erreur(f, 'format'); return; }
    apercuAmiFeuille(f, ami);
    return;
  }
  let obj;
  try { obj = await parseInput(raw, pass); }
  catch (e) {
    if (e.message === 'besoinpass'){ f.raw = raw; f.mode = 'mdp'; f.err = ''; f.pass = ''; f.titre = 'Fichier protégé'; rendreFeuille(); return; }
    if (e.message === 'motdepasse'){ f.raw = raw; f.mode = 'mdp'; f.err = 'Ce n’est pas le bon mot de passe.'; rendreFeuille(); return; }
    erreur(f, e.message);
    return;
  }
  fermerFeuille();
  montrerApercu(obj, {});
}

/* ============================================================
   UN LIEN : quelqu'un te donne des pistes (le premier jour, souvent)
   ============================================================ */
export async function ouvrirLien(ocq){
  let obj = null;
  try { obj = await parseInput(ocq); } catch (e) {}
  if (!obj || !obj.companies.length){ toast('Ce lien est abîmé : demande-le à nouveau.'); return; }
  ouvrirFeuille({ titre: 'Recevoir', obj, rendre: rendreLien, geste: gesteLien });
}
/* chacune avec la personne à qui écrire : c'est ce qui fait d'une piste
   donnée un geste possible tout de suite */
function rendreLien(f){
  const l = lignesApercu(f.obj), nouv = l.filter(x => x.neuve).length, compl = l.filter(x => !x.neuve && x.plus).length;
  const lignes = l.slice(0, 200).map(({ x, neuve, plus }) => {
    const ct = (x.contacts || []).find(t => t.name);
    const qui = ct ? ct.name + (ct.role ? ', ' + ct.role : '') : '';
    return `<div class="rang"><div class="r-c"><b>${esc(x.name)}</b>`
      + (neuve ? (x.city ? `<span>${esc(x.city)}</span>` : '') + (qui ? `<span class="plus">${esc(qui)}</span>` : '')
        : `<span${plus ? ' class="plus"' : ''}>${esc('déjà dans tes pistes' + (plus ? ' · ' + pl(plus, 'contact') + ' de plus' : ''))}</span>`)
      + `</div>${neuve ? '' : ic('check')}</div>`;
  }).join('');
  const mot = nouv === l.length ? (nouv > 1 ? `Ajouter les ${nouv} pistes` : 'Ajouter la piste') : `Ajouter ${pl(nouv, 'piste')}`;
  return { corps: `<p class="fort don-t">On te donne ${pl(l.length, 'piste')}</p><div class="rangs rc-l">${lignes}</div>`
      + (nouv || compl ? '' : '<p class="doux m-top">Tout est déjà dans tes pistes.</p>'),
    pied: nouv ? `<button class="btn p" data-a="r-lien-ok">${ic('plus')}${mot}</button>`
      : compl ? `<button class="btn p" data-a="r-lien-ok">${ic('plus')}Compléter ${pl(compl, 'piste')}</button>` : '' };
}
function gesteLien(a, el, ev, f){
  if (a !== 'r-lien-ok') return;
  const snapshot = JSON.stringify(S.companies);
  const stats = mergeIncoming(f.obj.companies, S.companies);
  saveData();
  logJ('Reçu par un lien : +' + stats.addedC + ' piste(s), ' + stats.enriched + ' complétée(s)', null, stats.ids);
  fermerFeuille();
  /* l'app s'ouvre sur ses pistes : « À faire » propose d'écrire */
  allerA('pistes');
  annuler(stats.addedC ? `${pl(stats.addedC, 'piste')} ajoutée${stats.addedC > 1 ? 's' : ''}` : `${pl(stats.enriched, 'piste')} complétée${stats.enriched > 1 ? 's' : ''}`, () => {
    S.companies = JSON.parse(snapshot).map(normalizeCompany);
    saveData();
    logJ('Fusion annulée');
  });
}

/* ============================================================
   L'APERÇU : ce qui arrive, avant d'y toucher
   ============================================================ */
export function montrerApercu(obj, { de = '', dans = '', groupe = '', id = '' } = {}){
  R.recu = { obj, de, dans, groupe, id };
  ouvrirR('apercu', '');
}
function lignesApercu(obj){
  return obj.companies.map(raw => {
    const x = normalizeCompany(raw);
    const m = findMatch(x, S.companies);
    if (!m) return { x, neuve: true };
    const connus = new Set((m.contacts || []).map(contactKey).filter(Boolean));
    const plus = (x.contacts || []).filter(t => { const k = contactKey(t); return k && !connus.has(k); }).length;
    return { x, neuve: false, plus };
  });
}
export function pageApercu(){
  const r = R.recu;
  if (!r) return { titre: 'Recevoir', corps: '<div class="panneau"><p>Rien à recevoir pour l’instant.</p></div>' };
  const l = lignesApercu(r.obj);
  const nouv = l.filter(x => x.neuve).length, compl = l.filter(x => !x.neuve && x.plus).length;
  const h = `<div class="s-page"><h4>${esc(r.de ? 'De ' + r.de : pl(l.length, 'piste') + ' reçue' + (l.length > 1 ? 's' : ''))}</h4>`
    + `<div class="lieu">${esc([r.de ? pl(l.length, 'piste') : '', r.dans ? 'dans ' + r.dans : ''].filter(Boolean).join(' · ') || 'à ajouter à tes pistes')}</div>`
    + `<div class="rangs rc-l">${l.slice(0, 200).map(({ x, neuve, plus }) => {
      const k = (x.contacts || []).length;
      const sous = neuve ? ['nouvelle', x.city, k ? pl(k, 'contact') : ''].filter(Boolean).join(' · ')
        : 'déjà dans tes pistes' + (plus ? ' · ' + pl(plus, 'contact') + ' de plus' : '');
      return `<div class="rang"><div class="r-c"><b>${esc(x.name)}</b><span${neuve || plus ? ' class="plus"' : ''}>${esc(sous)}</span></div>${neuve ? '' : ic('check')}</div>`;
    }).join('')}</div></div>`;
  const pied = nouv ? `<button class="btn p" data-a="r-prendre">${ic('plus')}Ajouter ${pl(nouv, 'piste')}</button>`
    : compl ? `<button class="btn p" data-a="r-prendre">${ic('plus')}Compléter ${pl(compl, 'piste')}</button>`
    : '<button class="btn" data-a="r-rien">Rien de neuf</button>';
  return { titre: 'Recevoir', corps: h, pied };
}
export function prendre(){
  const r = R.recu;
  if (!r) return;
  const snapshot = JSON.stringify(S.companies);
  const stats = mergeIncoming(r.obj.companies, S.companies);
  saveData();
  logJ('Reçu' + (r.de ? ' de ' + r.de : '') + ' : +' + stats.addedC + ' piste(s), ' + stats.enriched + ' complétée(s)', null, stats.ids);
  if (r.groupe && r.id) marquerPris(r.groupe, r.id);
  R.recu = null;
  const dit = stats.addedC ? `${pl(stats.addedC, 'piste')} ajoutée${stats.addedC > 1 ? 's' : ''}`
    : `${pl(stats.enriched, 'piste')} complétée${stats.enriched > 1 ? 's' : ''}`;
  fermerR();
  C.vient = 'pistes';
  annuler(dit, () => {
    S.companies = JSON.parse(snapshot).map(normalizeCompany);
    saveData();
    logJ('Fusion annulée');
    if (r.groupe && r.id) oublierPris(r.groupe, r.id);
  });
  rendre();
}
