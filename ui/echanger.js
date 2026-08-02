/* ============================================================
   OpenContact — interface · « Échanger »
   Deux verbes : Donner · Recevoir. En dessous, le Partage en groupe
   (un lieu vivant — la promo en direct, bêta discrète). Puis le fil
   de ce qui a réellement circulé, relu dans le journal privé : un
   écran qui ne montre que des portes ne se comprend pas d'un regard,
   parce qu'il n'y a rien à comprendre. Tout en bas, le rappel qui
   compte : jamais le privé. La sync de MES appareils vit dans « Moi ».
   ============================================================ */
import { localISO } from '../engine/utils.js';
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
  const head =
    `<h3 class="tr-h">${ic('switch', 'ic-14')} Tes échanges ${tot.n ? `<span class="tr-n">${tot.n}</span>` : ''}</h3>`;
  /* Le fil est un PANNEAU, pas un bloc de texte : il tient sa région,
     les lignes s'y remplissent par le haut et la place qui reste est la
     sienne — celle des échanges à venir. Sans lui, descendre les gestes
     au pouce ouvrait un trou de 370 px au milieu de l'écran ; avec lui,
     les gestes se posent toujours au même endroit, que le journal porte
     huit lignes, une seule ou aucune. */
  const corps = !fil.length
    ? `<div class="ec-rien">
         <div class="tde-ic">${ic('switch', 'ic-24')}</div>
         <b>Rien n’a encore circulé</b>
         <p>Donne tes pistes à ta promo, ou récupère les siennes —
            ce qui part et ce qui arrive s’inscrira ici.</p>
       </div>`
    : `<p class="ec-sub ec-tot">${tot.donne} donnée${tot.donne > 1 ? 's' : ''} ·
          ${tot.recu} reçue${tot.recu > 1 ? 's' : ''}</p>
       ${fil.map(x => {
         const titre = x.sens === 'donne'
           ? 'Donné · ' + x.canal
           : 'Reçu de ' + (x.qui || 'la promo');
         /* le compte reste COLLÉ à son libellé : dans une colonne large,
            un `space-between` les jetterait à 700 px l'un de l'autre et
            l'œil lirait deux objets sans rapport. Seule la date tient la
            colonne de droite — c'est ce qu'on aligne dans un journal. */
         return `<div class="ec-row">
                   <div class="ec-row-m">
                     <b>${ic(x.sens === 'donne' ? 'share' : 'inbox', 'ic-14')} ${titre}</b>
                     <span class="ec-sub"><b>${x.n}</b> piste${x.n > 1 ? 's' : ''}</span>
                   </div>
                   <span class="ec-sub ec-when">${quand(x.t)}</span>
                 </div>`;
       }).join('')}`;
  /* Le bandeau NE DÉFILE PAS. Il vivait dans la zone qui glisse : sur un
     écran court, neuf pixels de défilement suffisaient à le faire passer
     sous sa propre bordure — on lisait « TES ÉCHANGES » coupé en deux.
     Un panneau a un bandeau fixe et un corps qui glisse dessous. */
  return `<section class="ec-fil${fil.length ? '' : ' ec-vide'}">
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
  /* le rappel de confidentialité appartient aux GESTES — il parle de ce
     qui part. Au poste il reste donc dans leur colonne ; centré sur
     1060 px il se serait collé au fil, qui ne fait rien partir. */
  const priv = `<p class="hint ec-foot">${ic('lock', 'ic-14')} Données locales — jamais le privé.</p>`;
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
