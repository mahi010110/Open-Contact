/* ============================================================
   OpenContact — interface · l'entreprise se reconnaît pendant qu'on
   tape son nom

   LE MINIMUM, AU BON MOMENT (décision du mainteneur, 7 octobre 2026).
   Retrouver une piste dans l'annuaire demandait trois temps : un lien
   « Trouver dans l'annuaire » posé sur la fiche, puis une liste « C'est
   laquelle ? » dont chaque ligne portait un code d'activité (« 70.10Z »),
   puis un bouton « Compléter ma fiche ». Le moment où l'on SAIT de quelle
   entreprise il s'agit, c'est quand on écrit son nom : c'est là qu'elle
   se propose, comme une adresse se propose quand on la tape.

   · la question part après une pause, à partir de trois lettres, et ne
     porte que ce qu'on a tapé dans le champ « Entreprise » (et le
     département de la ville, s'il y en a une) — rien d'autre ;
   · la liste dit la ville et la taille, en mots, jamais un code ; ni
     personne, ni association (engine/annuaire.js, `suggestionsNom`) ;
   · un tap choisit : le nom s'écrit comme l'annuaire l'écrit, et
     l'appelant reçoit l'entreprise (il remplit ce qui manquait, sous les
     yeux, avant « Enregistrer ») ; retaper le nom oublie le choix ;
   · hors ligne, ou sans réponse, rien ne s'affiche : on tape son nom et
     on continue, comme avant.
   ============================================================ */
import { esc, debounce } from '../engine/utils.js';
import { questionNom, suggestionsNom, sousLigneNom } from '../engine/annuaire.js';
import { lireUrl } from './decouvrir.js';
import { annoncer } from './dom.js';

let n = 0;
/* `o.dept()` : le département où chercher (la ville déjà tapée), ou rien ;
   `o.choisi(r)` : l'entreprise choisie, ou `null` quand le nom change */
export function brancherNom(champ, o){
  if (!champ) return;
  o = o || {};
  const field = champ.closest('.field') || champ.parentElement;
  field.classList.add('ac-wrap');
  const box = document.createElement('div');
  box.className = 'ac-list';
  box.id = 'acNom' + (++n);
  box.hidden = true;
  field.append(box);
  /* `aria-expanded` n'existe pas sur un champ de texte (ARIA 1.2) : le
     nom d'entreprise est un `<textarea>` qui se replie, il ne peut pas
     être un `combobox`. Ce qu'un lecteur d'écran doit savoir passe donc
     par l'annonce du nombre d'entreprises proposées — ce que fait le
     composant d'autocomplétion de GOV.UK. */
  champ.setAttribute('aria-autocomplete', 'list');
  champ.setAttribute('aria-controls', box.id);
  let choix = null, ctrl = null, liste = [], dit = 0;
  const cacher = () => { box.hidden = true; box.innerHTML = ''; dit = 0; };
  const chercher = debounce(async () => {
    const t = champ.value.trim();
    /* rien ne part pour un champ qu'on a quitté : la liste ne s'y
       montrerait pas, la question n'aurait servi à personne */
    if (t.length < 3 || navigator.onLine === false || document.activeElement !== champ
        || (choix && t === choix.nom)){ cacher(); return; }
    ctrl?.abort();
    ctrl = new AbortController();
    try {
      const j = await lireUrl(questionNom(t, o.dept ? o.dept() : ''), ctrl.signal);
      if (champ.value.trim() !== t || document.activeElement !== champ) return;   /* la frappe a continué */
      liste = suggestionsNom(j);
      if (!liste.length){ cacher(); return; }
      box.innerHTML = liste.map((r, i) =>
        `<button type="button" class="ac-item ac-nom" data-i="${i}"><b>${esc(r.nom)}</b>${
          sousLigneNom(r) ? `<span>${esc(sousLigneNom(r))}</span>` : ''}</button>`).join('');
      /* dit une fois par liste, et de nouveau quand le compte change */
      if (box.hidden || dit !== liste.length)
        annoncer(`${liste.length} entreprise${liste.length > 1 ? 's' : ''} proposée${liste.length > 1 ? 's' : ''}`);
      dit = liste.length;
      box.hidden = false;
    } catch (e){ cacher(); }
  }, 400);
  champ.addEventListener('input', () => {
    if (choix && champ.value.trim() !== choix.nom){ choix = null; o.choisi?.(null); }
    chercher();
  });
  /* `pointerdown` et non `click` : le champ perdrait le focus avant, et
     la liste se refermerait sous le doigt */
  box.addEventListener('pointerdown', e => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    e.preventDefault();
    prendre(liste[Number(b.dataset.i)]);
  });
  box.addEventListener('keydown', e => {
    const b = e.target.closest('[data-i]');
    if (b && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); prendre(liste[Number(b.dataset.i)]); }
    if (e.key === 'Escape'){ e.stopPropagation(); cacher(); champ.focus(); }
  });
  champ.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !box.hidden){ e.stopPropagation(); cacher(); }
    if (e.key === 'ArrowDown' && !box.hidden){ e.preventDefault(); box.querySelector('[data-i]')?.focus(); }
  });
  champ.addEventListener('blur', () => setTimeout(() => { if (!box.contains(document.activeElement)) cacher(); }, 150));
  function prendre(r){
    if (!r) return;
    choix = r;
    champ.value = r.nom;
    cacher();
    /* les autres écouteurs du champ (le doublon, la hauteur) suivent */
    champ.dispatchEvent(new Event('input', { bubbles: true }));
    o.choisi?.(r);
    champ.focus();
  }
}
