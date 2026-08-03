/* ============================================================
   OpenContact — interface · « Échanger »
   Deux verbes : Donner · Recevoir. En dessous, le Partage en groupe
   (un lieu vivant — la promo en direct, bêta discrète). Puis le fil
   de ce qui a réellement circulé, relu dans le journal privé : un
   écran qui ne montre que des portes ne se comprend pas d'un regard,
   parce qu'il n'y a rien à comprendre. Tout en bas, le rappel qui
   compte : jamais le privé. La sync de MES appareils vit dans « Moi ».
   ============================================================ */
import { esc, localISO } from '../engine/utils.js';
import { exchangeLog, exchangeTotals } from '../engine/assist.js';
import { S } from './state.js';
import { $, ic } from './dom.js';
import { frDate, diffDays } from './dates.js';
import { openDonner } from './donner.js';
import { openRecevoir } from './recevoir.js';
import { openPromo } from './direct.js';

/* Deux conceptions, pas une page élastique : au pouce, une colonne —
   les gestes d'abord, le fil dessous ; au poste, les gestes tiennent
   dans une colonne étroite et le fil occupe la place restante. */
const mqWide = matchMedia('(min-width:901px)');
mqWide.addEventListener('change', () => { if (S.route === 'echanger') renderEchanger(); });

/* un journal porte des horodatages, pas des dates d'agenda : « hier »
   et « aujourd'hui » se disent, le reste se date */
function quand(t){
  if (!t) return '';                      /* horodatage perdu : rien plutôt qu'une fausse date */
  const iso = localISO(new Date(t));
  const d = diffDays(iso);
  return d === 0 ? 'aujourd’hui' : d === -1 ? 'hier' : frDate(iso);
}

function filHTML(){
  const fil = exchangeLog(S.journal, 8);
  const tot = exchangeTotals(S.journal);
  /* PAS DE CADRE. Le journal n'est pas un objet à encadrer, c'est une
     tranche — la même grammaire que « En retard » ou « Bientôt » sur
     « Aujourd'hui » : un libellé en petites capitales, son compte, puis
     les lignes. Rendu au trait, l'écran respire sur toute sa largeur au
     lieu de tenir dans une boîte.

     Et UNE ligne par échange, pas deux. Le canal, le nombre et la date
     s'empilaient en L — trois blocs que l'œil devait recomposer. Ils
     forment maintenant une phrase qui se lit d'un trait, « 100 pistes
     données · QR », la date seule tenant la colonne de droite comme
     dans tout journal. Le total en sous-titre est parti : chaque ligne
     porte déjà son compte, et le badge de l'en-tête dit combien il y en
     a eu. */
  const head =
    `<h3 class="tr-h">${ic('switch', 'ic-14')} Tes échanges${
      tot.n ? ` <span class="tr-n">${tot.n}</span>` : ''}</h3>`;
  const corps = !fil.length
    ? `<p class="ec-rien">Rien n’a encore circulé.</p>`
    : fil.map(x => {
        const quoi = x.n + ' piste' + (x.n > 1 ? 's' : '');
        const phrase = x.sens === 'donne'
          ? `${quoi} donnée${x.n > 1 ? 's' : ''} · ${x.canal}`
          : `${quoi} reçue${x.n > 1 ? 's' : ''} · ${x.qui || 'le groupe'}`;
        return `<div class="ec-row">
                  <b>${ic(x.sens === 'donne' ? 'share' : 'inbox', 'ic-14')} ${esc(phrase)}</b>
                  <span class="ec-when">${quand(x.t)}</span>
                </div>`;
      }).join('');
  return `<section class="tranche ec-fil${fil.length ? '' : ' ec-vide'}">
            ${head}<div class="ec-body">${corps}</div>
          </section>`;
}

export function renderEchanger(){
  const root = $('#view-echanger');
  const wide = mqWide.matches;
  const gestes =
    `<div class="hero2">
       <button class="btn btn-primary hero" id="ecGive">${ic('share', 'ic-20')}<span>Donner</span></button>
       <button class="btn hero" id="ecRecv">${ic('inbox', 'ic-20')}<span>Recevoir</span></button>
     </div>
     <!-- une porte, pas une carte à bouton : « Entrer » ne disait rien de
          plus que la ligne elle-même. Exactement la porte « Réglages »
          de « Moi » — on tape la carte entière. -->
     <button class="pcard moi-door" id="ecPromo">
       <span class="md-m"><b>${ic('radio', 'ic-14')} Partage en groupe</b></span>
       ${ic('chevron-right', 'ic-14')}
     </button>`;
  /* Pas de rappel de confidentialité ICI. Il répétait, en pied d'écran
     et en permanence, ce que « Donner » dit déjà au moment du geste —
     « Seules les fiches partent — jamais ton suivi privé » — c'est-à-dire
     là où la question se pose vraiment. Deux fois la même phrase, dont
     une qu'on lit cent fois sans jamais rien partager. */
  const priv = '';
  root.innerHTML =
    `<div class="page-inner${wide ? ' page-wide' : ''}">
       <div class="td-head"><h2>Échanger</h2></div>
       ${/* Au pouce, l'ordre s'inverse : on LIT ce qui s'est passé en haut,
            on AGIT en bas — là où le pouce arrive sans changer de prise.
            Posés en tête, les deux gestes vivaient à 17 % de la hauteur,
            le point le plus dur à atteindre d'une main. Au poste, la
            souris ne connaît pas cette contrainte : les gestes gardent
            leur colonne à gauche, en tête de lecture. */''}
       ${wide
         ? `<div class="ec-cols"><div class="ec-actes">${gestes}${priv}</div>${filHTML()}</div>`
         : filHTML() + gestes + priv}
     </div>`;
  root.querySelector('#ecGive').addEventListener('click', openDonner);
  root.querySelector('#ecRecv').addEventListener('click', openRecevoir);
  root.querySelector('#ecPromo').addEventListener('click', openPromo);
}
