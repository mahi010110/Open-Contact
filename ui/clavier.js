/* ============================================================
   OpenContact — interface · le clavier au poste (lot R8)
   (docs/propositions/R8-le-clavier.md)

   ① Ctrl K (⌘K) ouvre « Chercher » : un champ, une liste. On tape un nom,
     on choisit d'une flèche, Entrée fait. Elle ne propose que des gestes
     qui existent déjà à l'écran (engine/clavier.js `paletteDe`).
   ② Chaque lettre s'écrit DANS le bouton qu'elle commande, au poste
     seulement (`toucheHTML`), et se dit au lecteur d'écran
     (`aria-keyshortcuts`). Rien au pouce : il n'a pas de clavier.
   ③ « Touches d'une lettre », dans Réglages : allumées par défaut,
     éteintes d'un tap (WCAG 2.1.4). Ctrl K reste : un modificateur ne se
     déclenche pas en parlant.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { lettreDe, estPalette, nomAria, nomPalette, ariaPalette, paletteDe } from '../engine/clavier.js';
import { S, bus, lot, saveProfile } from './state.js';
import { openSheet, ic, choixHTML, clavier, apresRetours } from './dom.js';

const mqPoste = matchMedia('(min-width:901px)');
export const auPoste = () => mqPoste.matches;
const surMac = () => /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');
export const lettresCoupees = () => !!(S.profile && S.profile.flags && S.profile.flags.sansLettres);
/* la rangée de Réglages et les touches n'existent qu'au poste, lot ouvert */
export const clavierActif = () => lot('clavier') && auPoste();
export const dansChamp = t => !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')));

/* la lettre d'un appui, prête à agir — '' sinon. Pendant la préversion,
   l'ancien chemin reste entier : sans le lot, rien ne se coupe ici. */
export function lettreActive(e){
  return lettreDe(e, { coupees: lot('clavier') && lettresCoupees(), champ: dansChamp(e.target) });
}
/* la touche écrite dans son bouton : au poste, lot ouvert, touches
   allumées — et muette pour le lecteur d'écran, qui l'entend par
   `aria-keyshortcuts` sur le bouton lui-même */
export function toucheHTML(k){
  if (!clavierActif() || lettresCoupees()) return '';
  return `<kbd class="kbd-btn" aria-hidden="true">${esc(k.toUpperCase())}</kbd>`;
}
export function toucheAttr(k){
  return clavierActif() && !lettresCoupees() ? ` aria-keyshortcuts="${nomAria(k)}"` : '';
}
/* pour un bouton construit par `btn()` */
export function poserTouche(b, k){
  const t = toucheHTML(k);
  if (!t || !b) return b;
  b.insertAdjacentHTML('beforeend', t);
  b.setAttribute('aria-keyshortcuts', nomAria(k));
  return b;
}

/* ---------- ① « Chercher » ---------- */
let ouverte = null;
async function gestes(){
  const g = [
    { id: 'nouvelle', libelle: 'Nouvelle piste', mots: 'ajouter' },
    { id: 'aujourdhui', libelle: 'Aujourd’hui' },
    { id: 'pistes', libelle: 'Mes pistes' },
    { id: lot('reseau') ? 'reseau' : 'echanger', libelle: lot('reseau') ? 'Réseau' : 'Échanger' },
    { id: 'moi', libelle: 'Moi' },
    { id: 'profil', libelle: 'Mon profil' }
  ];
  if (lot('semaine')) g.push({ id: 'semaine', libelle: 'Ma semaine' });
  if ((S.profile.amis || []).length) g.push({ id: 'amis', libelle: 'Mes amis' });
  g.push({ id: 'touches', libelle: 'Touches d’une lettre', mots: 'clavier raccourcis' });
  return g;
}
const ECRANS = new Set(['aujourdhui', 'pistes', 'reseau', 'echanger', 'moi']);
async function faire(p){
  const c = p.sorte === 'piste' && S.companies.find(x => x.id === p.id);
  const a = p.sorte === 'ami' && (S.profile.amis || []).find(x => x.id === p.id);
  if (c && p.geste === 'ouvrir') return (await import('./fiche.js')).openFiche(c);
  if (c && p.geste === 'ecrire') return (await import('./fiche.js')).ecrirePiste(c);
  if (c && p.geste === 'planifier') return (await import('./actions.js')).askNextAction(c);
  if (a && p.geste === 'ecrire') return (await import('./messages.js')).ouvrirConversation(a);
  if (a && p.geste === 'ouvrir') return (await import('./amis.js')).openAmi(a);
  switch (p.geste){
    case 'nouvelle': return (await import('./capture.js')).openCapture();
    case 'aujourdhui': case 'pistes': case 'reseau': case 'echanger': case 'moi':
      location.hash = '#/' + p.geste; return;
    case 'profil': return (await import('./profil.js')).openProfil();
    case 'semaine': return (await import('./semaine.js')).ouvrirSemaine();
    case 'amis': return (await import('./amis.js')).openMesAmis();
    case 'touches': return ouvrirTouches();
  }
}
export async function ouvrirPalette(){
  if (ouverte){ ouverte.querySelector('#pkQ')?.focus(); return; }
  const liste = await gestes();
  const sh = openSheet({ title: 'Chercher', icon: 'search', className: 'modal-palette', focus: '#pkQ',
    onClose: () => { ouverte = null; } });
  ouverte = sh.ov;
  sh.body.innerHTML =
    `<input class="search pk-q" id="pkQ" type="text" role="combobox" aria-expanded="true" aria-controls="pkListe"
       aria-autocomplete="list" aria-label="Chercher une piste, un ami, un geste" ${clavier('cherche')}>
     <ul class="pk-liste" id="pkListe" role="listbox" aria-label="Propositions"></ul>`;
  const q = sh.body.querySelector('#pkQ'), ul = sh.body.querySelector('#pkListe');
  let props = [], sel = 0;
  const rendre = () => {
    props = paletteDe(q.value, { pistes: S.companies, amis: S.profile.amis || [], gestes: liste });
    sel = Math.min(sel, Math.max(0, props.length - 1));
    ul.innerHTML = props.length
      ? props.map((p, i) => `<li class="pk-o${i === sel ? ' pk-sel' : ''}" role="option" id="pkO${i}" data-i="${i}" aria-selected="${i === sel}">
          ${ic(p.sorte === 'piste' ? (p.geste === 'ecrire' ? 'mail' : p.geste === 'planifier' ? 'calendar' : 'briefcase')
              : p.sorte === 'ami' ? (p.geste === 'ecrire' ? 'message-text' : 'user') : 'chevron-right', 'ic-14')}
          <b>${esc(p.libelle)}</b>${p.sous ? `<span class="pk-s">${esc(p.sous)}</span>` : ''}</li>`).join('')
      : `<li class="pk-vide" role="presentation">Rien pour « ${esc(q.value.trim())} ».</li>`;
    q.setAttribute('aria-activedescendant', props.length ? 'pkO' + sel : '');
    ul.querySelector('.pk-sel')?.scrollIntoView({ block: 'nearest' });
  };
  const lancer = async i => {
    const p = props[i];
    if (!p) return;
    sh.close();
    /* un ÉCRAN se choisit une fois l'entrée de la feuille rendue : sinon
       le retour en vol défait la navigation (`apresRetours`) */
    if (ECRANS.has(p.geste) && p.sorte === 'geste') await apresRetours();
    faire(p);
  };
  q.addEventListener('input', () => { sel = 0; rendre(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      if (!props.length) return;
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + props.length) % props.length;
      rendre();
    } else if (e.key === 'Enter' && !e.isComposing){
      e.preventDefault();
      lancer(sel);
    }
  });
  ul.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) lancer(+li.dataset.i); });
  /* la souris déplace la sélection : un seul surlignage à la fois */
  ul.addEventListener('mousemove', e => {
    const li = e.target.closest('[data-i]');
    if (!li || +li.dataset.i === sel) return;
    ul.querySelector('.pk-sel')?.classList.remove('pk-sel');
    ul.querySelector('[aria-selected="true"]')?.setAttribute('aria-selected', 'false');
    sel = +li.dataset.i;
    li.classList.add('pk-sel'); li.setAttribute('aria-selected', 'true');
    q.setAttribute('aria-activedescendant', li.id);
  });
  rendre();
  return sh;
}

/* ---------- ③ « Touches d'une lettre » ---------- */
export function ouvrirTouches(){
  const sh = openSheet({ title: 'Touches d’une lettre', icon: 'settings-2' });
  const dessiner = () => {
    sh.body.innerHTML = choixHTML([['oui', 'Allumées'], ['non', 'Éteintes']], lettresCoupees() ? 'non' : 'oui', { attr: 'data-touches' });
    sh.body.querySelectorAll('[data-touches]').forEach(b => b.addEventListener('click', () => {
      S.profile.flags.sansLettres = b.dataset.touches === 'non';
      if (!S.profile.flags.sansLettres) delete S.profile.flags.sansLettres;
      saveProfile();
      dessiner();
      sh.body.querySelector(`[data-touches="${b.dataset.touches}"]`)?.focus({ preventScroll: true });
      const st = document.querySelector('#moiTouches .rg-s');
      if (st) st.textContent = lettresCoupees() ? 'éteintes' : 'allumées';
      poserEnTete();
      bus.refresh();
    }));
  };
  dessiner();
  return sh;
}

/* ---------- le bouton de « Chercher », dans l'en-tête du poste ----------
   Ctrl K s'écrit dans ce qu'il commande, comme les lettres : un bouton
   discret à côté de « Ajouter ». */
function poserBoutonPalette(){
  const ou = document.querySelector('.hdr-actions');
  let b = document.querySelector('#btnPalette');
  if (!lot('clavier')){ b?.remove(); return; }
  if (!ou || b) return;
  b = document.createElement('button');
  b.className = 'btn btn-ghost hdr-palette';
  b.id = 'btnPalette';
  b.setAttribute('aria-keyshortcuts', ariaPalette(surMac()));
  b.innerHTML = `${ic('search', 'ic-14')} Chercher <kbd class="kbd-btn" aria-hidden="true">${nomPalette(surMac())}</kbd>`;
  b.addEventListener('click', ouvrirPalette);
  ou.prepend(b);
}
/* l'en-tête du poste : « Chercher », et N dans « Ajouter » — reposés à
   chaque changement qui les touche (préversion, touches coupées, passage
   du pouce au poste), jamais deux fois */
export function poserEnTete(){
  poserBoutonPalette();
  const top = document.querySelector('#btnAddTop');
  if (!top) return;
  top.querySelector('.kbd-btn')?.remove();
  top.removeAttribute('aria-keyshortcuts');
  const t = toucheHTML('n');
  if (t){ top.insertAdjacentHTML('beforeend', t); top.setAttribute('aria-keyshortcuts', 'N'); }
}

/* ---------- Ctrl K, partout au poste ---------- */
let installe = false;
export function installerClavier(){
  if (installe) return;
  installe = true;
  mqPoste.addEventListener('change', poserEnTete);
  document.addEventListener('keydown', e => {
    if (!estPalette(e) || !clavierActif() || document.querySelector('.lock')) return;
    e.preventDefault();
    ouvrirPalette();
  });
}
