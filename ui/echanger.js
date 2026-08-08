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
import { STATUSES } from '../engine/model.js';
import { exchangeLog, exchangeTotals } from '../engine/assist.js';
import { S, isClosed } from './state.js';
import { $, ic, openSheet } from './dom.js';
import { frDate, diffDays } from './dates.js';
import { openDonner } from './donner.js';
import { openRecevoir } from './recevoir.js';
import { openPromo } from './direct.js';
import { groupeDoorHTML, openGroupe } from './groupe.js';
import { openFiche } from './fiche.js';

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

/* ---- ce qu'un échange a fait circuler ----
   Une ligne qui ne mène nulle part est un reçu, pas un outil :
   « 3 pistes reçues · Marco » répond « il s'est passé quelque chose »
   et rien de plus. Les deux questions que se pose vraiment un
   étudiant — ce que Marco lui a donné, ce qu'il a déjà donné au
   groupe — n'avaient aucune réponse à l'écran. Elles en ont une ici.
   Une ligne écrite avant que le journal note les identifiants n'en a
   pas : elle reste lisible, elle ne s'ouvre simplement pas. */
function openEchange(x){
  const pistes = x.ids.map(id => S.companies.find(c => c.id === id)).filter(Boolean);
  const perdues = x.ids.length - pistes.length;
  const donne = x.sens === 'donne';
  const sh = openSheet({ title: donne ? 'Ce que tu as donné' : 'Ce que tu as reçu',
    icon: donne ? 'share' : 'inbox' });
  sh.body.innerHTML =
    `<p class="ec-quand">${esc(donne ? x.canal : (x.qui || 'le groupe'))} · ${quand(x.t)}</p>
     ${pistes.length ? `<div class="pick-list">${pistes.map(c =>
        `<button class="pick" data-id="${esc(c.id)}">
           <div class="pk-m"><b>${esc(c.name)}</b>
             <span>${esc([STATUSES[c.status] && STATUSES[c.status].label, c.city]
               .filter(Boolean).join(' · '))}</span></div>
           ${ic('chevron-right', 'ic-14')}
         </button>`).join('')}</div>` : ''}
     ${perdues ? `<p class="hint">${perdues} piste${perdues > 1 ? 's' : ''} ${
        perdues > 1 ? 'ne sont plus' : 'n’est plus'} dans ton suivi.</p>` : ''}`;
  sh.body.querySelectorAll('[data-id]').forEach(b =>
    b.addEventListener('click', () => {
      const c = S.companies.find(p => p.id === b.dataset.id);
      sh.close();
      if (c) openFiche(c);
    }));
}

/* le fil montre 8 lignes, comme les autres listes de l'app — et,
   comme elles, il se déplie d'un tap. Il ne le faisait pas : le
   compte de l'en-tête annonçait douze échanges au-dessus de huit
   lignes, sans rien pour aller voir les quatre autres. */
const FIL_CAP = 8;
let filDeplie = false;
/* les lignes réellement à l'écran — le rendu et les écouteurs lisent
   la MÊME liste, sinon un tap ouvre l'échange d'à côté */
function filVisible(){
  const tous = exchangeLog(S.journal, 0);
  return filDeplie ? tous : tous.slice(0, FIL_CAP);
}

function filHTML(){
  const fil = filVisible();
  const reste = exchangeLog(S.journal, 0).length - fil.length;
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
  /* Un état vide enseigne, il ne constate pas. « Rien n'a encore
     circulé » disait qu'il n'y a rien — ce que le vide disait déjà — et
     laissait un nouveau venu sans idée de ce que cette place recevra.
     La phrase dit maintenant ce qui s'inscrira là, dans les mots des
     deux gestes juste à côté, sans les redire à l'impératif. */
  const corps = !fil.length
    ? `<p class="ec-rien">Les pistes que tu donnes et celles que tu reçois s’inscrivent ici.</p>`
    : fil.map((x, i) => {
        const quoi = x.n + ' piste' + (x.n > 1 ? 's' : '');
        const phrase = x.sens === 'donne'
          ? `${quoi} donnée${x.n > 1 ? 's' : ''} · ${x.canal}`
          : `${quoi} reçue${x.n > 1 ? 's' : ''} · ${x.qui || 'le groupe'}`;
        const dedans =
          `<b>${ic(x.sens === 'donne' ? 'share' : 'inbox', 'ic-14')} ${esc(phrase)}</b>
           <span class="ec-when">${quand(x.t)}</span>`;
        /* Le chevron ne se pose que sur les lignes qui MÈNENT quelque
           part : les anciennes entrées, qui n'ont pas gardé leurs
           identifiants, restent du texte — promettre une ouverture
           qui n'arrive pas coûte plus qu'un chevron manquant. */
        return x.ids.length
          ? `<button class="ec-row ec-open" data-fil="${i}">${dedans}${ic('chevron-right', 'ic-14')}</button>`
          : `<div class="ec-row">${dedans}</div>`;
      }).join('') +
      (reste ? `<button class="linklike tr-more" id="ecMore">Voir les ${reste} autres</button>` : '');
  return `<section class="tranche ec-fil${fil.length ? '' : ' ec-vide'}">
            ${head}<div class="ec-body">${corps}</div>
          </section>`;
}

export function renderEchanger(){
  const root = $('#view-echanger');
  const wide = mqWide.matches;
  /* « Donner » sans rien à donner était une action MORTE : on tapait le
     bouton principal de l'écran, un toast passait trois secondes, et
     rien ne se produisait. C'est la loi #6, déjà appliquée au composeur
     (sans adresse, « Envoyer » n'existe pas et « Copier » devient LE
     bouton) : l'indisponible est ABSENT, jamais grisé, jamais mort.
     Ici « Recevoir » prend donc la place — c'est le seul des deux qui
     marche quand on n'a encore rien, et c'est justement par là qu'on
     commence quand un camarade nous partage sa liste. */
  const aDonner = S.companies.some(c => !isClosed(c) && !c.demo);
  const gestes =
    `<div class="hero2${aDonner ? '' : ' hero1'}">
       ${aDonner ? `<button class="btn btn-primary hero" id="ecGive">${ic('share', 'ic-20')}<span>Donner</span></button>` : ''}
       <button class="btn${aDonner ? '' : ' btn-primary'} hero" id="ecRecv">${ic('inbox', 'ic-20')}<span>Recevoir</span></button>
     </div>
     <!-- une porte, pas une carte à bouton : « Entrer » ne disait rien de
          plus que la ligne elle-même. Exactement la porte « Réglages »
          de « Moi » — on tape la carte entière. -->
     <button class="pcard moi-door" id="ecPromo">
       <span class="md-m"><b>${ic('radio', 'ic-14')} Partage en groupe</b></span>
       ${ic('chevron-right', 'ic-14')}
     </button>
     ${/* Les gens, juste sous les deux verbes : c'est avec eux que ça
          circule, et c'est le prénom d'un d'entre eux qui rend une
          déclaration « j'y suis passé » actionnable. */''}
     ${groupeDoorHTML()}`;
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
  root.querySelector('#ecGive')?.addEventListener('click', openDonner);
  root.querySelector('#ecRecv').addEventListener('click', openRecevoir);
  root.querySelector('#ecPromo').addEventListener('click', openPromo);
  root.querySelector('#ecGroupe').addEventListener('click', openGroupe);
  const fil = filVisible();
  root.querySelectorAll('[data-fil]').forEach(b =>
    b.addEventListener('click', () => { const x = fil[+b.dataset.fil]; if (x) openEchange(x); }));
  root.querySelector('#ecMore')?.addEventListener('click', () => { filDeplie = true; renderEchanger(); });
}
