/* ============================================================
   OpenContact · la nouvelle interface · les onglets qui viennent
   (docs/refonte-reprendre.md §8)

   Pendant la phase 2, la nouvelle interface grandit un lot à la fois.
   Pistes, Réseau et Moi ont leur place dans la barre dès le lot 1 —
   la navigation ne bouge plus — mais leurs écrans arrivent aux lots 2,
   3 et 4 (Pistes et Réseau sont arrivés). En attendant :
   · Pistes montre ce que Trouver a gardé, et chaque ligne s'enlève au
     glissé (ou par sa croix), avec « Annuler » : un essai ne laisse pas
     de trace qu'on ne puisse pas défaire ;
   · Réseau et Moi disent quel lot les apporte.
   Ce fichier disparaît quand le dernier de ces écrans arrive.
   ============================================================ */
import { esc, ic, remplacer } from './outils.js';
import { S, deletePiste, undeletePiste } from './etat.js';
import { rendre, allerA, annuler, cles } from './coque.js';

const vide = (titre, texte, geste) => `<div class="defile"><div class="s-tete"><h3>${titre}</h3></div>`
  + `<div class="panneau"><p><b>${texte}</b></p>${geste || ''}</div></div>`;

function pistesHTML(){
  const l = [...S.companies].sort((a, b) => (b.createdAt || b.updatedAt || 0) - (a.createdAt || a.updatedAt || 0));
  if (!l.length) return vide('Pistes', 'Tes pistes arrivent ici.',
    '<p class="doux">Garde une entreprise dans Trouver.</p><button class="btn" data-a="aller" data-id="trouver">Trouver des entreprises</button>');
  const ligne = c => `<div class="gl" data-g="retirer" data-id="${esc(c.id)}"><div class="dessous-g" aria-hidden="true">Retirer</div>`
    + `<div class="rang l"><div class="r-c"><b>${esc(c.name)}</b><span class="sl">${esc([c.city, (c.contacts || [])[0] ? 'écrire à ' + c.contacts[0].name : ''].filter(Boolean).join(' · ') || 'ajoutée à la main')}</span></div>`
    + `<button class="x-l" data-a="retirer" data-id="${esc(c.id)}" aria-label="Retirer ${esc(c.name)}">${ic('close')}</button></div></div>`;
  return `<div class="defile"><div class="s-tete"><h3>Pistes<small>${l.length}</small></h3></div>`
    + `<div class="rangs s-liste">${l.map(ligne).join('')}</div>`
    + '<p class="fin-m">La suite de cet écran arrive au lot 2 : «\u00a0À faire\u00a0», les étapes, la page de chaque piste.</p></div>';
}
function retirer(id){
  const c = S.companies.find(x => x.id === id);
  if (!c) return;
  deletePiste(c);
  annuler(`${c.name} : retirée`, () => undeletePiste(c));
  rendre();
}

export const pistes = {
  id: 'pistes',
  compte: () => S.companies.length ? String(S.companies.length) : '',
  rendre(ecran){ remplacer(ecran, pistesHTML()); },
  geste(a, el){
    const id = el ? el.getAttribute('data-id') : '';
    if (a === 'aller') allerA(id);
    else if (a === 'retirer') retirer(id);
  },
  etat: () => `<span>${S.companies.length} piste${S.companies.length > 1 ? 's' : ''}</span>` + cles([[['T'], 'trouver']])
};
export const moi = {
  id: 'moi',
  rendre(ecran){ ecran.innerHTML = vide('Moi', 'Moi arrive au lot 4 : ton profil, tes CV, ta copie, les réglages.'); },
  etat: () => `<span>${esc(S.profile && S.profile.name ? S.profile.name : 'Profil à compléter')}</span>`
};
