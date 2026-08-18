/* ============================================================
   OpenContact — interface · « Échanger »
   Deux verbes : Donner · Recevoir. En dessous, le Partage en groupe
   (un lieu vivant — la promo en direct, bêta discrète). Puis le fil
   de ce qui a réellement circulé, relu dans le journal privé : un
   écran qui ne montre que des portes ne se comprend pas d'un regard,
   parce qu'il n'y a rien à comprendre. Tout en bas, le rappel qui
   compte : jamais le privé. La sync de MES appareils vit dans « Moi ».
   ============================================================ */
import { esc, localISO, todayISO } from '../engine/utils.js';
import { STATUSES } from '../engine/model.js';
import { exchangeLog, exchangeTotals, recuesDormantes, jamaisDonnees } from '../engine/assist.js';
import { S, isClosed, saveJournal } from './state.js';
import { $, ic, openSheet, bindDeleteGesture, showUndo, annoncer } from './dom.js';
import { frDate, diffDays } from './dates.js';
import { openDonner } from './donner.js';
import { openRecevoir } from './recevoir.js';
import { openPromo } from './direct.js';
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
/* Le contenu d'un échange, écrit UNE fois. Il s'ouvre en feuille au
   pouce — un écran à la fois, on descend puis on remonte — et s'affiche
   dans le panneau de droite au poste, à côté de la liste. Deux
   contenants, jamais deux textes : c'est la même chose qu'on regarde. */
function contenuEchange(x, rappel = true){
  const pistes = x.ids.map(id => S.companies.find(c => c.id === id)).filter(Boolean);
  const perdues = x.ids.length - pistes.length;
  const donne = x.sens === 'donne';
  return {
    donne,
    titre: donne ? 'Ce que tu as donné' : 'Ce que tu as reçu',
    icone: donne ? 'share' : 'inbox',
    html:
      /* Le rappel « par quel canal, quel jour » n'a de sens que dans la
         FEUILLE : là, la ligne qu'on vient de taper a disparu derrière.
         Au poste elle reste à l'écran, à 22 px sur la gauche — le rappel
         serait la même phrase écrite deux fois côte à côte. */
      `${rappel ? `<p class="ec-quand">${esc(donne ? x.canal : (x.qui || 'le groupe'))} · ${quand(x.t)}</p>` : ''}
       ${pistes.length ? `<div class="pick-list">${pistes.map(c =>
          `<button class="pick" data-id="${esc(c.id)}">
             <div class="pk-m"><b>${esc(c.name)}</b>
               <span>${esc([STATUSES[c.status] && STATUSES[c.status].label, c.city]
                 .filter(Boolean).join(' · '))}</span></div>
             ${ic('chevron-right', 'ic-14')}
           </button>`).join('')}</div>` : ''}
       ${perdues ? `<p class="hint">${perdues} piste${perdues > 1 ? 's' : ''} ${
          perdues > 1 ? 'ne sont plus' : 'n’est plus'} dans ton suivi.</p>` : ''}`
  };
}
/* les pistes d'un contenu mènent à leur fiche, où qu'il soit affiché */
function bindContenu(zone, avant){
  zone.querySelectorAll('[data-id]').forEach(b =>
    b.addEventListener('click', () => {
      const c = S.companies.find(p => p.id === b.dataset.id);
      if (avant) avant();
      if (c) openFiche(c);
    }));
}
function openEchange(x){
  const k = contenuEchange(x);
  const sh = openSheet({ title: k.titre, icon: k.icone });
  sh.body.innerHTML = k.html;
  bindContenu(sh.body, () => sh.close());
}

/* le fil montre 8 lignes, comme les autres listes de l'app — et,
   comme elles, il se déplie d'un tap. Il ne le faisait pas : le
   compte de l'en-tête annonçait douze échanges au-dessus de huit
   lignes, sans rien pour aller voir les quatre autres. */
const FIL_CAP = 8;
let filDeplie = false;
/* Au poste, la ligne retenue et son contenu vivent CÔTE À CÔTE (motif
   liste-détail : Material 3 « list-detail », Apple HIG « split view »).
   L'index de la ligne lue, donc — et il vaut pour la session, comme le
   tri et les filtres. Au pouce, il ne sert pas : on descend dans une
   feuille et on remonte, un écran à la fois. */
let filSel = 0;
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
    `<h2 class="tr-h">${ic('switch', 'ic-14')} Tes échanges${
      tot.n ? ` <span class="tr-n">${tot.n}</span>` : ''}</h2>`;
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
        /* LA DATE TIENT SA COLONNE — et c'est un retour en arrière assumé.
           Elle avait rejoint la phrase au nom de la PROXIMITÉ (ce qui est
           proche est perçu comme lié, NN/g), parce qu'au poste elle
           vivait à 400 px du texte. Le remède a produit un défaut pire,
           photographié au pouce : la ligne entière s'élidant d'un bloc,
           c'est la DATE qui se faisait couper — « sam. 08/… » — dès que
           le canal s'allongeait (« le groupe » plutôt que « QR »).

           La même source tranche l'arbitrage, et dans l'autre sens :
           NN/g, *The Anatomy of a List Entry*, demande que chaque
           information garde LA MÊME PLACE d'une ligne à l'autre — c'est
           ce qui permet de balayer une colonne au lieu de lire chaque
           ligne. Des dates en escalier, dont certaines tronquées, ne se
           balaient pas.

           Donc : la date sort de la phrase, ne rétrécit jamais
           (`flex:none`), et c'est la PHRASE qui s'élide — elle porte
           l'identité de la ligne en tête (« 24 pistes reçues »), ce qui
           se perd en bout est le canal. La proximité reste tenue au
           poste par la colonne de gauche, large de 550 px, pas de 1000. */
        const dedans =
          `<b>${ic(x.sens === 'donne' ? 'share' : 'inbox', 'ic-14')} ${esc(phrase)}</b>
           <span class="ec-when">${quand(x.t)}</span>`;
        /* Le chevron ne se pose que sur les lignes qui MÈNENT quelque
           part : les anciennes entrées, qui n'ont pas gardé leurs
           identifiants, restent du texte — promettre une ouverture
           qui n'arrive pas coûte plus qu'un chevron manquant.
           Le `.sw-in` est ce que `bindDeleteGesture` réclame : glisser
           au pouce, poubelle au survol — le motif de suppression de
           l'app, pas un bouton de plus dans la ligne. */
        /* Au poste, la ligne ne « mène » plus ailleurs : elle SE LIT à
           côté. Le chevron — la promesse d'un aller-retour — ne s'y
           affiche donc pas, et la ligne lue prend le navy du châssis,
           la couleur qui dit « tu es ici » (§4). */
        const lue = mqWide.matches && i === filSel;
        const dedansLigne = x.ids.length
          ? `<button class="ec-row ec-open${lue ? ' ec-lue' : ''}" data-fil="${i}"${
              lue ? ' aria-current="true"' : ''}>${dedans}${
              mqWide.matches ? '' : ic('chevron-right', 'ic-14')}</button>`
          : `<div class="ec-row">${dedans}</div>`;
        return `<div class="ec-l" data-l="${i}"><div class="sw-in">${dedansLigne}</div></div>`;
      }).join('') +
      (reste ? `<button class="linklike tr-more" id="ecMore">Voir les ${reste} autres</button>` : '');
  return `<section class="tranche ec-fil${fil.length ? '' : ' ec-vide'}">
            ${head}<div class="ec-body">${corps}</div>
          </section>`;
}

/* ============================================================
   CE QUI RÉCLAME QUELQUE CHOSE — la place forte de l'écran

   « Échanger » racontait ce qui a circulé. C'est un classeur : il
   répond à « qu'est-ce qui s'est passé », jamais à « je fais quoi
   maintenant » — la seule question que ce produit existe pour
   résoudre. Pire, le panneau de droite montrait les pistes DÉJÀ
   données : la donnée la moins actionnable de l'app, celle qui ne
   demande rien et ne mène nulle part.

   Cet onglet existe pourtant à cause d'un chiffre : ~3 % d'entretiens
   à froid contre ~40 % quand quelqu'un est dedans. Quand un camarade
   te tend douze pistes et qu'elles dorment, c'est ce 40:1 qui dort.

   La place forte revient donc à ce qui ne circule PAS encore. Le fil
   reste — une trace a sa valeur — mais il redescend au rang de trace.
   Une seule tranche à la fois (§6) : ce qu'on t'a donné passe avant ce
   que tu n'as pas donné, parce qu'un cadeau qu'on laisse par terre
   coûte plus cher qu'un cadeau qu'on n'a pas fait. */
function reprendreHTML(){
  const dort = recuesDormantes(S.companies, S.journal, todayISO());
  if (dort.length){
    /* TROIS, jamais douze. Le parcours joué à deux personnes l'a montré
       et aucune mesure ne l'aurait fait : douze pistes reçues le même
       jour de la même personne donnaient douze lignes identiques —
       « de Léa · Lille · 19 j » répété, un papier peint. C'est
       exactement l'inventaire que « Par où commencer » a appris à ne pas
       être : en proposer trois en fait un choix, en lister douze rend la
       décision à celui qu'on voulait aider.
       Le compte reste dit UNE fois, dans le titre — c'est là qu'il pèse,
       et il n'encombre aucune ligne. */
    const n = dort.length;
    return `<section class="tranche ec-repr">
        <h2 class="tr-h">${ic('inbox', 'ic-14')} Reçues, jamais reprises
          <span class="tr-n">${n}</span></h2>
        <div class="rows">${dort.slice(0, 3).map(x =>
          `<button class="ec-rep" data-rep="${esc(x.id)}">
             <span class="rep-m"><b>${esc(x.name)}</b>
               <span>${esc([x.qui ? 'de ' + x.qui : 'du groupe', x.city,
                 x.contacts ? x.contacts + ' contact' + (x.contacts > 1 ? 's' : '') : '']
                 .filter(Boolean).join(' · '))}</span></span>
             <span class="mark mark-${x.cran}">${x.jours} j</span>
           </button>`).join('')}</div>
      </section>`;
  }
  /* rien ne dort : reste l'autre sens de l'échange — mais seulement si
     l'utilisateur connaît déjà le geste (le moteur rend vide sinon) */
  const jamais = jamaisDonnees(S.companies, S.journal);
  if (!jamais.length) return '';
  const n = jamais.length;
  return `<section class="tranche ec-repr">
      <h2 class="tr-h">${ic('share', 'ic-14')} Jamais données
        <span class="tr-n">${n}</span></h2>
      <div class="rows">${jamais.slice(0, 3).map(x =>
        `<button class="ec-rep" data-rep="${esc(x.id)}">
           <span class="rep-m"><b>${esc(x.name)}</b>
             <span>${esc([STATUSES[x.status] && STATUSES[x.status].label, x.city]
               .filter(Boolean).join(' · '))}</span></span>
         </button>`).join('')}</div>
    </section>`;
}

/* ---- LE PANNEAU DE DROITE, au poste seulement ----
   L'écran ne montrait que des PORTES : deux verbes, une entrée de
   groupe, et un relevé de reçus. La règle du produit est pourtant
   écrite (§6) — « un écran montre les affaires de l'utilisateur, pas
   des portes », et son corollaire : un écran qui PEUT montrer une
   donnée et ne le fait pas tombe sous la même règle. Or il l'avait, la
   donnée : les pistes que chaque échange a fait circuler. Elles
   vivaient derrière un clic et une feuille modale.
   Au poste elles se posent à côté de la liste — c'est le motif
   liste-détail, celui de Material 3 (« list-detail ») et d'Apple HIG
   (« split view ») : on parcourt à gauche, on lit à droite, sans perdre
   sa place et sans ouvrir quoi que ce soit. La ligne la plus récente est
   retenue d'emblée, comme le veut ce motif sur un grand écran : un
   panneau vide à l'arrivée serait la porte qu'on vient de supprimer.
   Au pouce, rien ne change : on descend dans une feuille, on remonte. */
function detailHTML(){
  const fil = filVisible();
  const x = fil[filSel];
  if (!x || !x.ids.length)
    return `<aside class="ec-detail">
              <p class="ec-rien">${fil.length
                ? 'Cet échange est plus ancien que le suivi de ses pistes : il ne les retrouve pas.'
                : 'Les pistes qu’un échange fait circuler s’affichent ici.'}</p>
            </aside>`;
  const k = contenuEchange(x, false);
  return `<aside class="ec-detail">
            <h2 class="tr-h">${ic(k.icone, 'ic-14')} ${esc(k.titre)}</h2>
            <div class="ec-detail-b">${k.html}</div>
          </aside>`;
}

export function renderEchanger(){
  const root = $('#view-echanger');
  const wide = mqWide.matches;
  /* la ligne lue doit exister : supprimer la dernière du fil, ou replier
     la liste, laisserait l'index dans le vide et le panneau muet */
  const nFil = filVisible().length;
  if (filSel >= nFil) filSel = Math.max(0, nFil - 1);
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
       ${/* Le chevron dit « cette LIGNE mène ailleurs ». Il n'a de sens
            que sur une ligne pleine largeur — au pouce. Au poste, la
            porte devient un contrôle taillé à son mot : un chevron
            coincé dans un bouton de 170 px ne promet plus rien, il
            encombre. */''}
       ${wide ? '' : ic('chevron-right', 'ic-14')}
     </button>`;
  /* Pas de rappel de confidentialité ICI. Il répétait, en pied d'écran
     et en permanence, ce que « Donner » dit déjà au moment du geste —
     « Seules les fiches partent — jamais ton suivi privé » — c'est-à-dire
     là où la question se pose vraiment. Deux fois la même phrase, dont
     une qu'on lit cent fois sans jamais rien partager. */
  const priv = '';
  root.innerHTML =
    `<div class="page-inner${wide ? ' page-wide' : ''}">
       <div class="td-head"><h1>Échanger</h1></div>
       ${/* Au pouce, l'ordre s'inverse : on LIT ce qui s'est passé en haut,
            on AGIT en bas — là où le pouce arrive sans changer de prise.
            Posés en tête, les deux gestes vivaient à 17 % de la hauteur,
            le point le plus dur à atteindre d'une main. Au poste, la
            souris ne connaît pas cette contrainte : les gestes gardent
            leur colonne à gauche, en tête de lecture. */''}
       ${/* Au poste, la tranche vit DANS la colonne de gauche, au-dessus
             du fil. Pleine largeur, son cran d'urgence tombait à 900 px
             de la ligne qu'il qualifie — la faute de proximité corrigée
             sur le fil, refaite aussitôt. Dans une colonne de 420 px il
             se lit avec sa ligne, comme sur « Mes pistes ». Et la
             gauche est la première chose lue : c'est bien là que va ce
             qui réclame quelque chose. */''}
       ${/* Le POUCE ne change pas. Il garde le dessin qu'il avait : on
             lit en haut, on agit en bas, les deux verbes au-dessus de la
             barre et la porte en pleine largeur — un doigt, une colonne,
             de grandes cibles. Ce qui suit ne concerne que le poste. */''}
       ${wide
         ? `<div class="ec-actes">${gestes}</div>
            <div class="ec-cols">
              <div class="ec-gauche">${reprendreHTML()}${filHTML()}</div>
              ${detailHTML()}
            </div>`
         : filHTML() + gestes + priv}
     </div>`;
  root.querySelector('#ecGive')?.addEventListener('click', openDonner);
  root.querySelector('#ecRecv').addEventListener('click', openRecevoir);
  root.querySelector('#ecPromo').addEventListener('click', openPromo);
  const fil = filVisible();
  /* CHANGER DE LIGNE NE RE-REND PAS L'ÉCRAN. La première version
     appelait `renderEchanger()` : le bouton qu'on venait de taper
     quittait le document, et le navigateur rendait le focus au `<body>`
     — au clavier, on repartait en haut de la page à chaque ligne lue.
     C'est le défaut WCAG 2.4.3 corrigé pour les suppressions deux lots
     plus tôt, et re-introduit ici par un re-rendu de confort. On
     échange donc le seul panneau qui change, et la ligne garde le
     focus. */
  const choisir = (i) => {
    const x = fil[i];
    if (!x) return;
    filSel = i;
    const vieux = root.querySelector('.ec-detail');
    if (vieux){
      vieux.outerHTML = detailHTML();
      bindContenu(root.querySelector('.ec-detail'), null);
    }
    root.querySelectorAll('.ec-row[data-fil]').forEach(b => {
      const on = +b.dataset.fil === i;
      b.classList.toggle('ec-lue', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    /* et ça se DIT : tout le côté droit de l'écran vient de changer sans
       que le focus bouge — sans annonce, qui n'a pas l'écran ne sait
       même pas qu'il s'est passé quelque chose (WCAG 4.1.3) */
    const n = x.ids.length;
    annoncer(`${contenuEchange(x, false).titre} : ${n} piste${n > 1 ? 's' : ''}.`);
  };
  /* Au poste, taper une ligne la LIT à côté ; au pouce, elle s'ouvre.
     Même geste, deux contenants — voir `detailHTML`. */
  root.querySelectorAll('[data-fil]').forEach(b =>
    b.addEventListener('click', () => {
      const i = +b.dataset.fil;
      if (wide) choisir(i);
      else { const x = fil[i]; if (x) openEchange(x); }
    }));
  /* LE CLAVIER, qui est l'efficacité même d'un grand écran : ↑ et ↓
     passent d'un échange à l'autre sans quitter la main du clavier —
     c'est ce que fait tout couple liste-détail (WAI-ARIA APG : le focus
     ROULE dans la liste, il ne la quitte pas). Les lignes trop anciennes
     pour retrouver leurs pistes ne sont pas focalisables : elles ne
     mènent nulle part, les flèches n'ont donc rien à y faire. */
  if (wide) root.querySelector('.ec-body')?.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const rows = [...root.querySelectorAll('.ec-row[data-fil]')];
    const ici = rows.indexOf(document.activeElement);
    const suiv = rows[(ici < 0 ? filSel : ici) + (e.key === 'ArrowDown' ? 1 : -1)];
    if (!suiv) return;
    e.preventDefault();
    suiv.focus();
    choisir(+suiv.dataset.fil);
  });
  /* une ligne qui réclame mène LÀ OÙ L'ON AGIT : sa fiche, en un tap.
     Pas de panneau intermédiaire, pas d'aperçu — le geste attendu est
     d'écrire ou de planifier, et c'est la fiche qui les porte. */
  root.querySelectorAll('[data-rep]').forEach(b =>
    b.addEventListener('click', () => {
      const c = S.companies.find(x => x.id === b.dataset.rep);
      if (c) openFiche(c);
    }));
  const det = root.querySelector('.ec-detail');
  if (det) bindContenu(det, null);
  /* SUPPRIMER UNE LIGNE DU FIL — le motif de l'app, pas un bouton de
     plus : glisser au pouce, poubelle au survol, et la barre « Annuler »
     à la place d'une confirmation (CLAUDE.md §6). Ce qu'on retire, c'est
     l'entrée du journal qui a produit la ligne ; « Annuler » la remet à
     SA place, pas à la fin — sinon l'ordre du fil changerait tout seul. */
  root.querySelectorAll('.ec-l').forEach(node => {
    const x = fil[+node.dataset.l];
    if (!x) return;
    bindDeleteGesture(node, () => {
      const e = S.journal[x.i];
      if (!e) return;
      S.journal.splice(x.i, 1);
      saveJournal();
      renderEchanger();
      showUndo('Ligne retirée du fil.', () => {
        S.journal.splice(x.i, 0, e);
        saveJournal();
        renderEchanger();
      });
    }, 'cette ligne du fil');
  });
  root.querySelector('#ecMore')?.addEventListener('click', () => { filDeplie = true; renderEchanger(); });
}
