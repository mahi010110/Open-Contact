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
  /* Le CADRE À LÉGENDE de « Moi », pas un panneau plein. Le fil tient
     toujours sa région — c'est lui qui garde les deux gestes au pouce,
     quel que soit le remplissage — mais il le fait avec le trait fin et
     la légende en encoche qui rangent déjà « Ce que j'envoie ». Un aplat
     bordé et biseauté faisait un bloc de plus sur un écran qui n'en a
     que trois.
     Et rien de superflu dedans : la légende dit ce que c'est, le compte
     dit combien. La phrase qui expliquait à quoi sert la page a disparu
     — les deux verbes juste dessous l'enseignent mieux qu'elle. */
  const corps = !fil.length
    ? `<p class="ec-rien">Rien n’a encore circulé.</p>`
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
  /* La légende NE DÉFILE PAS : elle est posée dans le trait du cadre,
     hors du corps qui glisse. Quand le titre vivait dans la zone
     défilante, neuf pixels suffisaient sur un écran court à le faire
     passer sous sa propre bordure — on lisait « TES ÉCHANGES » coupé
     en deux. */
  return `<fieldset class="fset ec-fil${fil.length ? '' : ' ec-vide'}">
            <legend>Tes échanges${tot.n ? ` <span class="tr-n">${tot.n}</span>` : ''}</legend>
            <div class="ec-body">${corps}</div>
          </fieldset>`;
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
