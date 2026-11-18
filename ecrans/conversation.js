/* ============================================================
   OpenContact · la nouvelle interface · une conversation
   (docs/brief-refonte.md §12, lot 3 ; la maquette validée le
   17 novembre 2026)

   Un groupe ou un ami, comme dans toutes les messageries : au
   téléphone elle prend l'écran (la barre d'onglets s'efface), au poste
   elle s'ouvre en fenêtre. Le fil s'ouvre là où l'on s'était arrêté
   (« 3 nouveaux »), le jour se dit une fois, chaque message porte son
   heure. On écrit en bas ; le champ reste en main après l'envoi.

   Dans un groupe : ses membres en tête (ils ouvrent « Groupe »), les
   messages qui s'effacent au bout de sept jours, les pistes données
   (« Voir » ouvre l'aperçu), la demande d'un camarade (« Répondre » :
   la réponse ne passe jamais par le groupe). Avec un ami : nos
   messages, et sa demande quand mon téléphone a trouvé quelqu'un.

   Ce que la conversation ne fait pas, exprès : ni « vu », ni « en train
   d'écrire », ni aperçu de lien — les deux premiers disent à l'autre
   quand tu regardes, le troisième ferait partir une requête vers une
   adresse qu'un autre a choisie.
   ============================================================ */
import { $, $$, ic, esc, prenomDe } from './outils.js';
import { S } from './etat.js';
import { rendre, toast } from './coque.js';
import { decouperLiens } from '../engine/liens.js';
import { prenomsPour } from '../engine/groupe.js';
import { heureDe, memeJour, jourFil, quandListe } from './dates.js';
import { visageHTML, blasonHTML } from './visage.js';
import { amiDe, recueDe, trouvePour, ditTrouve, ecouterBoite, relever, enAttente, mercisRecents,
         quoiDe } from './boite.js';
import { filAvec, vuDe as vuAmi, marquerAmiLu, suivreOuverte, envoyer as envoyerAmi } from './messages.js';
import { groupe, filDeGroupe, nomDe, membresVus, moiId, jEcris, reglagesIci, DUREE_DITE, quiAttend, estPris, estMasque,
         vu as vuGroupe, vuDe as vuGroupeDe, ecrireMot, ecouterGroupe, releverGroupes, jeSuisResponsable, mesGroupes,
         quoiDeLettre } from './groupes.js';

export const cleConv = (sorte, id) => (sorte === 'groupe' ? 'g:' : 'a:') + id;
export const parseCle = k => ({ sorte: String(k).startsWith('g:') ? 'groupe' : 'ami', id: String(k).slice(2) });
export function existe(k){
  const { sorte, id } = parseCle(k);
  return sorte === 'groupe' ? mesGroupes().some(g => g.code === id) : !!amiDe(id);
}
export function titreConv(k){
  const { sorte, id } = parseCle(k);
  if (sorte === 'groupe') return nomDe(id);
  const a = amiDe(id);
  return a ? a.nom : 'Conversation';
}

/* ---------- ce qui se garde le temps de la session ---------- */
const brouillons = new Map();   /* ce qu'on a commencé à écrire, par conversation */
const fenetres = new Map();     /* la fenêtre rendue : son premier message */
const avant = new Map();        /* ce qui était lu À L'OUVERTURE : la ligne « N nouveaux » se pose après */
const colles = new Map();       /* la conversation suivait-elle son bas ? */

/* LA FENÊTRE : les 60 derniers messages, ou depuis un peu avant le
   premier non-lu (120 au plus), et « Voir les N messages d'avant » */
const FENETRE = 60, FENETRE_MAX = 120, PAS_AVANT = 60;
function debutFenetre(fil, neuf, ancre){
  if (ancre){ const i = fil.findIndex(x => x.id === ancre); if (i >= 0) return i; }
  const n = fil.length;
  let d = Math.max(0, n - FENETRE);
  const p = fil.findIndex(neuf);
  if (p >= 0 && p - 10 < d) d = Math.max(0, p - 10, n - FENETRE_MAX);
  return d;
}

/* LE TEXTE D'UN MESSAGE : les liens se tapent, seulement sur un tap
   (http et https, sans référent) ; « @Karim » se marque quand Karim est
   du groupe ; tout le reste est échappé */
const plie = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MENTION = /@[\p{L}\p{N}'’-]+/gu;
function marquer(v, prenoms){
  if (!prenoms.length || !v.includes('@')) return esc(v);
  const connus = new Set(prenoms.map(plie));
  let out = '', i = 0;
  for (const m of v.matchAll(MENTION)){
    if (m.index > 0 && /[\p{L}\p{N}]/u.test(v[m.index - 1])) continue;
    let nom = m[0].slice(1);
    while (nom && !connus.has(plie(nom)) && /['’-]$/.test(nom)) nom = nom.slice(0, -1);
    if (!connus.has(plie(nom))) continue;
    out += esc(v.slice(i, m.index)) + `<b class="cite">@${esc(nom)}</b>`;
    i = m.index + 1 + nom.length;
  }
  return out + esc(v.slice(i));
}
const texteHTML = (texte, prenoms = []) => decouperLiens(texte).map(x => x.t === 'lien'
  ? `<a class="lien-m" href="${esc(x.href)}" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer">${esc(x.v)}</a>`
  : marquer(x.v, prenoms)).join('');

const jour = t => `<div class="jour-m" role="separator">${esc(jourFil(t))}</div>`;
const nouveauxL = n => `<div class="nouv-m" role="separator"><span>${n} nouveau${n > 1 ? 'x' : ''}</span></div>`;
const avantL = n => n > 0 ? `<button class="lien avant-m" data-a="r-avant">${n > 1 ? 'Voir les ' + n + ' messages' : 'Voir le message'} d’avant</button>` : '';
const moiB = (corps, at, att) => `<div class="b moi">${corps}${att ? `<span class="h att">${ic('clock')}pas encore parti</span>` : `<span class="h">${esc(heureDe(at))}</span>`}</div>`;
const autreB = (graine, qui, at, corps, cl = '', a = '') =>
  `<div class="msg">${visageHTML(graine)}<div class="b${cl}"${a}><span class="qui">${esc(qui)} · ${esc(heureDe(at))}</span>${corps}</div></div>`;

/* la demande d'un camarade : ce que mon téléphone a trouvé se dit en
   accent, et « Répondre » ouvre les réponses ; la réponse ne passe
   jamais par le groupe */
function demandeB(k, r, x, mien){
  if (mien) return moiB(`<b class="dem-t">Tu cherches quelqu’un ${esc(x.quoi)}.</b>`, x.at);
  const t = trouvePour(r);
  const etat = r && r.statut === 'donnee' ? `<span class="fait-a">${ic('check')}Tu lui as donné ${esc(r.donne || 'un contact')}</span>`
    : r && r.statut === 'transmise' ? `<span class="fait-a">${ic('check')}Tu l’as fait suivre</span>` : '';
  const corps = `<b class="dem-t">${esc(x.phrase)}</b>`
    + (x.relais ? `<span class="sous-m">relayée par ${esc(x.relais)}</span>` : '')
    + (t && !etat ? `<span class="trouve-m">${ic('check')}${esc(ditTrouve(t))}</span>` : '')
    + (etat || `<button class="btn s${t ? ' p' : ''}" data-a="r-repondre" data-id="${esc(k + '|' + x.id)}">Répondre</button>`);
  return autreB(x.graine, x.qui, x.at, corps, ' dem');
}

/* ---------- le fil d'un groupe ---------- */
function filGroupe(k, code){
  const g = groupe(code), moi = moiId();
  const fil = filDeGroupe(code).filter(x => !(x.t === 'demande' && estMasque(code, x.id)));
  const vuA = avant.has(k) ? avant.get(k) : vuGroupeDe(code);
  const neuf = x => x.t !== 'retire' && x.de !== moi && x.at > vuA;
  const f = fenetres.get(k) || {};
  const debut = debutFenetre(fil, neuf, f.ancre);
  fenetres.set(k, { debut, ancre: (fil[debut] || {}).id || '', ids: fil.map(x => x.id) });
  const n = fil.filter(neuf).length;
  const prenoms = membresVus(g).map(m => m.prenom).concat(S.profile.name ? [prenomDe(S.profile.name)] : []);
  const resp = jeSuisResponsable(code);
  let pose = false, h = '';
  fil.slice(debut).forEach((x, i) => {
    const prec = i ? fil[debut + i - 1] : null;
    if (!prec || !memeJour(prec.at, x.at)) h += jour(x.at);
    if (neuf(x) && !pose){ pose = true; h += nouveauxL(n); }
    const mien = x.de === moi;
    if (x.t === 'retire'){
      h += autreB(x.de, mien ? 'Toi' : x.prenom, x.at, `<span class="retire-m">${ic('eye-off')}Retiré par ${x.parDe === moi ? 'toi' : esc(x.par || 'un responsable')}</span>`, ' retire');
      return;
    }
    if (x.t === 'demande'){
      const l = x.lettre || {};
      const r = mien ? null : recueDe(x.id);
      h += demandeB(k, r, { id: x.id, at: x.at, graine: x.de, qui: x.prenom, quoi: quoiDeLettre(l),
        phrase: `${x.prenom} cherche quelqu’un ${quoiDeLettre(l)}.`, relais: x.relais && x.relais.prenom }, mien);
      return;
    }
    /* un responsable peut retirer le message d'un autre : il s'ouvre au tap */
    const geste = resp && !mien ? ` data-a="r-msg" data-id="${esc(k + '|' + x.id)}" role="button" tabindex="0"` : '';
    if (x.t === 'mot'){
      if (mien) h += moiB(texteHTML(x.texte, prenoms), x.at);
      else h += autreB(x.de, x.prenom, x.at, texteHTML(x.texte, prenoms),
        (Array.isArray(x.cite) && x.cite.includes(moi) ? ' pour-moi' : '') + (geste ? ' tap' : ''), geste);
      return;
    }
    /* des pistes données au groupe */
    const nb = `${x.nb} piste${x.nb > 1 ? 's' : ''}`;
    if (mien){ h += moiB(`Tu as donné ${esc(nb)} au groupe.`, x.at); return; }
    const pris = estPris(code, x.id);
    h += autreB(x.de, x.prenom, x.at, `${esc(x.prenom)} donne ${esc(nb)}.`
      + `<button class="carte-don" data-a="r-voir" data-id="${esc(k + '|' + x.id)}">${ic('briefcase')}<b>${esc(nb)}</b><span>${pris ? 'dans tes pistes' : 'Voir'}</span></button>`, geste ? ' tap' : '', geste);
  });
  return `<p class="efface">Les messages s’effacent au bout de ${DUREE_DITE[reglagesIci(code).j] || '7 jours'}.</p>`
    + (fil.length ? avantL(debut) + h : '<p class="efface">Aucun message pour l’instant.</p>');
}

/* ---------- le fil avec un ami ---------- */
const SALVE = 5 * 60000;
function filAmi(k, id){
  const a = amiDe(id);
  if (!a) return '';
  const pr = prenomDe(a.nom);
  const msgs = filAvec(id).map(m => ({ ...m, sorte: 'm' }));
  /* son merci, deux jours */
  const mercis = mercisRecents().filter(m => a.cle && m.de && m.de.cle === a.cle)
    .map(m => ({ sorte: 'merci', id: m.id, at: m.at, m }));
  const fil = [...msgs, ...mercis].sort((x, y) => x.at - y.at);
  const vuA = avant.has(k) ? avant.get(k) : vuAmi(id);
  const neuf = x => x.sorte === 'm' ? (!x.moi && x.at > vuA) : x.at > vuA;
  const f = fenetres.get(k) || {};
  const debut = debutFenetre(fil, neuf, f.ancre);
  fenetres.set(k, { debut, ancre: (fil[debut] || {}).id || '', ids: fil.map(x => x.id) });
  const n = fil.filter(neuf).length;
  let pose = false, h = '';
  fil.slice(debut).forEach((x, i) => {
    const prec = i ? fil[debut + i - 1] : null;
    if (!prec || !memeJour(prec.at, x.at)) h += jour(x.at);
    if (neuf(x) && !pose){ pose = true; h += nouveauxL(n); }
    if (x.sorte === 'merci'){
      const m = x.m;
      /* quand c'est moi qu'on a présenté, le merci ne me nomme pas */
      const pour = m.contact && m.contact.name !== String(S.profile.name || '').trim() ? ' pour ' + esc(m.contact.name) : '';
      h += `<p class="evt-m">${ic('check')}${esc(pr)} te dit merci${pour}${m.entreprise ? (pour ? ', chez ' : ', pour ') + esc(m.entreprise.nom) : ''}.</p>`;
      return;
    }
    const att = x.moi && enAttente(x.id);
    /* l'heure une fois par salve, comme Messages et WhatsApp */
    const suite = prec && prec.sorte === 'm' && prec.moi === x.moi && x.at - prec.at < SALVE && memeJour(prec.at, x.at);
    if (x.moi) h += `<div class="b moi${suite && !att ? ' suite' : ''}">${texteHTML(x.texte)}${att ? `<span class="h att">${ic('clock')}pas encore parti</span>` : suite ? '' : `<span class="h">${esc(heureDe(x.at))}</span>`}</div>`;
    else h += suite ? `<div class="msg suite"><span class="vz-place"></span><div class="b">${texteHTML(x.texte)}</div></div>`
      : autreB(id, pr, x.at, texteHTML(x.texte));
  });
  return fil.length ? avantL(debut) + h : '<p class="efface">Aucun message pour l’instant.</p>';
}

/* ---------- la tête : les membres d'un groupe, qui frappe à la porte ---------- */
function teteGroupe(code){
  const g = groupe(code), moi = moiId();
  const autres = membresVus(g).filter(m => m.de !== moi).map(m => m.prenom);
  const noms = [...autres.slice(0, 4), 'toi'];
  const reste = autres.length - 4;
  const qui = quiAttend(code), x = qui[0];
  return `<button class="conv-t" data-a="r-groupe" data-id="${esc(code)}">${blasonHTML(nomDe(code))}<span>${esc(noms.join(' · '))}${reste > 0 ? ` et ${reste} autre${reste > 1 ? 's' : ''}` : ''}</span>${ic('chevron-right')}</button>`
    + (x ? `<div class="entree-r"><p>${visageHTML(x.ami || x.de.prenom)}<span><b>${esc(x.de.prenom)}</b> veut entrer${qui.length > 1 ? `<small> · ${qui.length - 1} autre${qui.length > 2 ? 's' : ''} attend${qui.length > 2 ? 'ent' : ''}</small>` : ''}</span></p>`
      + `<div class="deux"><button class="btn s" data-a="r-entree" data-id="${esc(code)}" data-v="${esc('non|' + x.id)}">Refuser</button>`
      + `<button class="btn s p" data-a="r-entree" data-id="${esc(code)}" data-v="${esc('oui|' + x.id)}">Accepter</button></div></div>` : '');
}

/* ---------- le pied : écrire ----------
   Il ne porte pas ce qu'on a tapé : il ne se refait donc jamais sous les
   doigts, et le brouillon se repose à chaque rendu */
function piedConv(k){
  const { sorte, id } = parseCle(k);
  const champ = (max, mot) => `<label class="champ m-champ"><textarea class="m-in" rows="1" data-id="${esc(k)}" maxlength="${max}" placeholder="${esc(mot)}" aria-label="${esc(mot)}" enterkeyhint="send" autocomplete="off"></textarea></label>`
    + `<button class="envoi" data-a="r-envoyer" data-id="${esc(k)}" aria-label="Envoyer">${ic('arrow-up')}</button>`;
  if (sorte === 'groupe'){
    const donner = `<button class="btn icone" data-a="r-donner" data-id="${esc(id)}" aria-label="Donner des pistes au groupe">${ic('briefcase')}</button>`;
    if (!jEcris(id)) return `<div class="compo">${donner}<p class="seuls">Seuls les responsables écrivent ici.</p></div>`;
    return `<div class="puces mention" role="group" aria-label="Nommer quelqu’un" hidden></div><div class="compo">${donner}${champ(280, 'Écrire au groupe')}</div>`;
  }
  const a = amiDe(id);
  if (!a || !a.cle) return `<div class="compo"><p class="seuls">Rescanne son QR pour lui écrire.</p></div>`;
  return `<div class="compo">${champ(1000, 'Écrire à ' + prenomDe(a.nom))}</div>`;
}

/* la page entière, au téléphone ; la fenêtre, au poste */
export function convPage(k){
  const { sorte, id } = parseCle(k);
  if (!existe(k)) return { titre: 'Conversation', corps: '<div class="panneau"><p>Cette conversation n’existe plus.</p></div>' };
  return { titre: titreConv(k), tete: sorte === 'groupe' ? teteGroupe(id) : '',
    corps: `<div class="fil-c" data-conv="${esc(k)}">${sorte === 'groupe' ? filGroupe(k, id) : filAmi(k, id)}</div>`,
    pied: piedConv(k), classe: 'conv' };
}

/* ---------- ouvrir, écouter, lire ----------
   EN DIRECT tant que la conversation est ouverte : un mot écrit en face
   arrive sans rien toucher. Fermée, la relève prend le relais. */
let ecoute = null;
export function arreterEcoute(){
  if (ecoute){ const e = ecoute; ecoute = null; if (e.stop) e.stop(); }
  suivreOuverte(null);
}
function marquerLu(k){
  const { sorte, id } = parseCle(k);
  if (sorte === 'groupe') vuGroupe(id); else marquerAmiLu(id);
}
async function ecouterConv(k){
  if (ecoute && ecoute.k === k) return;
  arreterEcoute();
  const e = { k, stop: null };
  ecoute = e;
  const { sorte, id } = parseCle(k);
  const vif = () => { if (ecoute !== e) return; marquerLu(k); rendre(); };
  if (sorte === 'ami') suivreOuverte(id, vif);
  const f = sorte === 'groupe' ? await ecouterGroupe(id, vif) : await ecouterBoite(vif);
  if (ecoute === e) e.stop = f; else f();
  /* et une relève : ce qui est arrivé pendant que l'app était fermée,
     ce qui attendait de partir */
  Promise.all([sorte === 'groupe' ? releverGroupes() : Promise.resolve(false), relever()])
    .then(r => { if (ecoute === e && r.some(Boolean)){ marquerLu(k); rendre(); } });
}
/* juste avant d'ouvrir : ce qui était lu, pour poser « N nouveaux » */
export function preparer(k){
  const { sorte, id } = parseCle(k);
  avant.set(k, sorte === 'groupe' ? vuGroupeDe(id) : vuAmi(id));
  fenetres.delete(k);
  colles.delete(k);
}
/* après chaque rendu : le brouillon reposé, le bas suivi, le direct */
export function brancherConv(z, k, premier){
  const d = $('.defile', z) || z;
  const ta = $('.m-in', z);
  if (ta){
    if (!ta.value && brouillons.get(k)) ta.value = brouillons.get(k);
    grandir(ta);
    majEnvoi(z, ta);
    if (!ta.__branche){
      ta.__branche = true;
      ta.addEventListener('input', () => { brouillons.set(k, ta.value); grandir(ta); majEnvoi(z, ta); proposer(z, ta, k); });
      ta.addEventListener('keydown', ev => {
        if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing) return;
        /* au doigt, Entrée va à la ligne dans un message à un ami
           (Messages, WhatsApp) ; un mot de groupe tient sur une ligne */
        if (parseCle(k).sorte === 'ami' && matchMedia('(pointer:coarse)').matches) return;
        ev.preventDefault();
        envoyerConv(k);
      });
    }
  }
  /* l'envoi ne prend pas le focus : le clavier reste ouvert */
  $$('.envoi', z).forEach(b => { if (!b.__branche){ b.__branche = true; ['pointerdown', 'mousedown'].forEach(t => b.addEventListener(t, e => e.preventDefault())); } });
  if (!d.__branche){
    d.__branche = true;
    d.addEventListener('scroll', () => colles.set(k, d.scrollHeight - d.scrollTop - d.clientHeight < 40), { passive: true });
  }
  if (premier){
    /* sur la ligne « N nouveaux », un peu au-dessus ; au bas sinon */
    const l = $('.nouv-m', d);
    d.scrollTop = l ? Math.max(0, l.offsetTop - d.clientHeight * 0.25) : d.scrollHeight;
    colles.set(k, !l);
    marquerLu(k);
    ecouterConv(k);
  } else if (colles.get(k) !== false) d.scrollTop = d.scrollHeight;
}
function grandir(ta){
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight + 2, 6 * 22 + 20) + 'px';
}
/* la flèche s'allume quand il y a de quoi envoyer */
function majEnvoi(z, ta){
  const b = $('.envoi', z);
  if (b) b.classList.toggle('pret', !!ta.value.trim());
}
/* « @ » ouvre les prénoms au-dessus du champ ; un tap l'écrit */
function proposer(z, ta, k){
  const box = $('.mention', z);
  if (!box) return;
  const av = ta.value.slice(0, ta.selectionStart ?? ta.value.length);
  const m = av.match(/(?:^|[^\p{L}\p{N}])@([\p{L}\p{N}'’-]*)$/u);
  const { id } = parseCle(k);
  const noms = m ? prenomsPour(m[1], membresVus(groupe(id)), moiId()) : [];
  box.hidden = !noms.length;
  box.innerHTML = noms.map(n => `<button class="puce" data-a="r-nommer" data-v="${esc(n)}">@${esc(n)}</button>`).join('');
}
export function nommer(z, nom){
  const ta = $('.m-in', z);
  if (!ta) return;
  const av = ta.value.slice(0, ta.selectionStart ?? ta.value.length);
  const m = av.match(/(?:^|[^\p{L}\p{N}])@([\p{L}\p{N}'’-]*)$/u);
  if (!m) return;
  const debut = av.length - m[1].length - 1, fin = ta.selectionStart ?? ta.value.length;
  const mot = '@' + nom + ' ';
  ta.value = ta.value.slice(0, debut) + mot + ta.value.slice(fin);
  const ici = debut + mot.length;
  ta.focus();
  ta.setSelectionRange(ici, ici);
  ta.dispatchEvent(new Event('input'));
}

/* ---------- envoyer ---------- */
let envoiEnCours = false;
export async function envoyerConv(k){
  const z = zoneDe(k);
  const ta = z && $('.m-in', z);
  const texte = ta ? ta.value.trim() : '';
  if (!texte || envoiEnCours) return;
  envoiEnCours = true;
  try {
    const { sorte, id } = parseCle(k);
    if (sorte === 'groupe'){
      if (!await ecrireMot(id, texte)){ toast('Pas de réseau : ton message n’est pas parti.'); return; }
    } else {
      const a = amiDe(id);
      const r = a && await envoyerAmi(a, texte);
      if (!r){ toast('Ce message n’a pas pu s’écrire.'); return; }
      r.parti.then(() => rendre());
    }
    brouillons.delete(k);
    ta.value = '';
    ta.dispatchEvent(new Event('input'));
    colles.set(k, true);
    rendre();
    ta.focus({ preventScroll: true });
  } finally { envoiEnCours = false; }
}
/* la zone où vit une conversation : la page, ou la fenêtre du poste */
export const zoneDe = k => $$('.ecran').map(e => $('.conv-w', e) || e).find(z => $(`[data-conv="${CSS.escape(k)}"]`, z)) || null;
/* « Voir les N messages d'avant » : le morceau d'avant, sans rien
   déplacer sous les yeux */
export function voirAvant(k){
  const z = zoneDe(k), d = z && $('.defile', z);
  const f = fenetres.get(k);
  if (!d || !f) return;
  f.ancre = (f.ids || [])[Math.max(0, f.debut - PAS_AVANT)] || '';
  const bas = d.scrollHeight - d.scrollTop;
  colles.set(k, false);
  rendre();
  d.scrollTop = d.scrollHeight - bas;
}
/* la ligne d'une conversation dans la liste */
export function ligneConv(r, on){
  const tete = r.sorte === 'groupe' ? blasonHTML(r.nom) : visageHTML(r.id);
  const etat = [r.n ? 'non lue' : '', r.cite ? 'on t’y nomme' : '', r.epingle ? 'épinglée' : '', r.muet ? 'son coupé' : ''].filter(Boolean);
  const dedans = `${tete}<div class="r-c"><b>${esc(r.nom)}</b><span>${esc(r.apercu || 'Aucun message pour l’instant')}</span></div>`
    + `<div class="c-d"><span class="s-h">${esc(r.attente ? '' : quandListe(r.at))}</span><span class="c-i">${r.muet ? ic('bell-off') : ''}${r.epingle ? ic('bookmark') : ''}${r.cite ? '<b class="c-at" aria-hidden="true">@</b>' : ''}${r.n ? '<i class="pt"></i>' : ''}</span></div>`;
  if (r.attente) return `<div class="rang conv attente">${dedans}</div>`;
  return `<div class="rang conv${r.n ? ' nonlu' : ''}${on ? ' on' : ''}" data-a="r-conv" data-id="${esc(r.cle)}" role="button" tabindex="0" aria-label="${esc([r.nom, ...etat, r.apercu].filter(Boolean).join(', '))}">${dedans}</div>`;
}
