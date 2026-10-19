/* ============================================================
   OpenContact — interface · « Échanger »
   (13 octobre 2026 : « une boîte de réception, les conversations comme
   Discord, exactement comme les messageries traditionnelles »)
   La BOÎTE d'abord : toutes les conversations, groupes et amis, la plus
   récente en haut (ui/conversations.js) ; au poste, la conversation
   choisie se pose à droite de la liste. Puis ce qui ne circule pas
   encore (« Reçues, jamais reprises »). Puis l'Historique de ce qui a
   circulé, derrière une ligne — une trace, pas une place forte. Les deux
   verbes, Donner · Recevoir, sous le pouce. Tout en bas, le rappel qui
   compte : jamais le privé. La sync de MES appareils vit dans « Moi ».
   ============================================================ */
import { esc, localISO, todayISO } from '../engine/utils.js';
import { STATUSES } from '../engine/model.js';
import { canalCourt, exchangeLog, recuesDormantes, jamaisDonnees } from '../engine/assist.js';
import { S, isClosed, saveJournal } from './state.js';
import { $, ic, openSheet, bindDeleteGesture, showUndo } from './dom.js';
import { frDate, diffDays } from './dates.js';
import { openDonner } from './donner.js';
import { openRecevoir } from './recevoir.js';
import { openPromo } from './direct.js';
import { boiteHTML, bindBoite } from './conversations.js';
import { PARTAGE_DIRECT } from './perimetre.js';
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
      /* LE MÊME MOT QUE LA LIGNE QUI A OUVERT CETTE FEUILLE. §7 le
         demande, et prévient que le glissement se fait toujours ICI —
         dans la feuille secondaire, jamais dans le titre : la rangée
         disait « groupe », ce rappel disait « partage en groupe ». */
      `${rappel ? `<p class="ec-quand">${esc(donne ? canalCourt(x.canal) : (x.qui || 'groupe'))} · ${quand(x.t)}</p>` : ''}
       ${pistes.length ? `<div class="pick-list">${pistes.map(c =>
          `<button class="pick" data-id="${esc(c.id)}">
             <div class="pk-m"><b>${esc(c.name)}</b>
               <span class="pk-s">${esc([STATUSES[c.status] && STATUSES[c.status].label, c.city]
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

/* ---- LE FIL DÉFILE, IL NE SE PAGINE PAS ----
   Il s'arrêtait à 8 lignes et offrait « Voir les N autres ». Le geste
   était juste — le compte de l'en-tête annonçait douze échanges
   au-dessus de huit lignes, il fallait bien un chemin vers les quatre
   autres — mais le PLAFOND, lui, était emprunté à un voisin dont ce
   n'était pas la situation.

   Deux différences, et elles décident :
   ① `today.js` plafonne à 8 parce que plusieurs tranches partagent UN
     seul défilement : sans plafond, « En retard » enterrerait
     « Bientôt ». `pistes.js` plafonne à 60 pour une raison mesurée —
     2 000 lignes gelaient l'écran 250 ms à chaque frappe. Le fil, lui,
     est SEUL dans sa propre région défilante (`.ec-body`), et les deux
     verbes vivent en dehors, épinglés sous elle : le plafond ne
     protégeait donc rien. Un bouton « voir plus » posé dans une boîte
     qui défile déjà fait remonter le doigt pour rouvrir ce que le
     défilement allait chercher tout seul.
   ② Il se déclenchait à 8, très en dessous de tous les seuils publiés.
     Baymard place le passage à « load more » entre 30 et 70 articles
     (10 à 30 au premier écran sur mobile) ; NN/g réserve pagination et
     « load more » aux listes LONGUES et homogènes qu'on fouille pour y
     trouver un élément précis — leur bénéfice est de dire où l'on en
     est et ce qu'il reste à faire. Ici la liste est courte, finie,
     chronologique, et l'ascenseur dit déjà tout ça honnêtement (c'est
     la différence entre une liste complète dans une région bornée et
     un défilement infini, que NN/g reproche justement de mentir sur la
     longueur restante).

   Le plafond ne disparaît pas pour autant : il redevient ce qu'il est
   chez `pistes.js`, un garde-fou de PERFORMANCE, et il se pose là où la
   mesure le demande. Relevé sur cet écran, rendu complet du fil :
   10 lignes → 4 ms · 50 → 8 ms · 200 → 65 ms · 500 → 200 ms — et un
   téléphone d'entrée de gamme multiplie ça par quatre à huit. 50 tient
   dans la bande que Baymard recommande et laisse le bouton invisible
   pour qui a une vie normale : un étudiant fait quelques dizaines
   d'échanges sur toute sa recherche, pas cinquante. */
const FIL_CAP = 50;
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
  /* Un état vide enseigne, il ne constate pas. « Rien n'a encore
     circulé » disait qu'il n'y a rien — ce que le vide disait déjà — et
     laissait un nouveau venu sans idée de ce que cette place recevra.
     La phrase dit maintenant ce qui s'inscrira là, dans les mots des
     deux gestes juste à côté, sans les redire à l'impératif. */
  const corps = !fil.length
    ? `<p class="ec-rien">Les pistes que tu donnes et celles que tu reçois s’inscrivent ici.</p>`
    : fil.map((x, i) => {
        /* ---- L'ANATOMIE D'UNE LIGNE DU FIL ----
           Relevé sur l'écran réel, huit lignes : « 12 pistes », « 3
           pistes », « 7 pistes », « 24 pistes »… Les huit têtes de ligne
           étaient un NOMBRE suivi du même mot. Or la tête porte
           l'attribut distinctif (§6, règle 1 — NN/g, *The Anatomy of a
           List Entry*), et le contrôle qui tranche est la comparaison de
           deux lignes voisines : si leurs têtes se ressemblent, la
           mauvaise chose est mise en avant. Elles se ressemblaient
           toutes.
           Ce qui distingue vraiment deux échanges, c'est AVEC QUI —
           Léa, le groupe, Awa — ou PAR QUOI — QR, fichier. Et c'était
           écrit en FIN de phrase, c'est-à-dire dans la zone qui s'élide
           la première : l'identité de la ligne rangée à l'endroit le
           plus fragile. Mesuré à 360 px : la phrase demandait 225 px
           pour 225 disponibles — elle tenait au pixel près, et le
           moindre nom long la faisait plier sur le mot qui compte.

           La ligne se range donc en trois valeurs, de la plus
           discriminante à la moins :
             ① le SENS, en colonne fixe — c'est le partage binaire que
               l'œil cherche d'abord, et une colonne alignée se balaie
               sans se lire (NN/g : chaque information à la même place
               d'une ligne à l'autre) ;
             ② AVEC QUI, qui prend l'encre : c'est la seule valeur
               vraiment variable de la ligne, donc la seule qui mérite
               l'encre (§6, règle 1) ;
             ③ le COMPTE, une donnée, en typo de donnée et en gris.
           La date ne bouge pas : sa colonne est un acquis, et l'annexe
           dit pourquoi on ne la ramène pas dans la phrase.

           PAS DE PICTOGRAMME de sens. Il doublait le mot qu'il
           accompagnait (`inbox` + « reçues ») et repoussait de 24 px les
           deux premiers mots — la raison exacte pour laquelle les lignes
           de Réglages n'en portent pas (`ui/moi.js`) : « on scanne une
           liste par ses deux premiers mots à gauche ; une icône aide
           quand elle éclaire un libellé obscur ». « Reçu » et « Donné »
           n'ont rien d'obscur, et §7 tranche pareil — le mot gagne sur
           l'icône qu'on ne devine pas. */
        const sens = x.sens === 'donne' ? 'Donné' : 'Reçu';
        /* « groupe », sans article, des deux côtés. L'article ne se
           voyait pas tant que la colonne d'en face disait « partage en
           groupe » ; une fois les deux raccourcis, « Reçu · le groupe »
           et « Donné · groupe » se sont retrouvés l'un sous l'autre —
           le même objet écrit de deux façons dans une colonne qu'on
           BALAIE. C'est ce que §7 interdit, et la colonne d'à côté
           tranche la forme : on y lit « Marie-Charlotte », pas
           « de Marie-Charlotte ». */
        const avec = x.sens === 'donne' ? canalCourt(x.canal) : (x.qui || 'groupe');
        /* « 0 piste » se lit comme un échec. Or un échange qui n'apporte
           aucune piste NEUVE a parfaitement fonctionné : le receveur
           avait déjà tout. La ligne dit donc ce qui s'est passé — les
           pistes complétées si elles existent, sinon « rien de neuf ». */
        const compte = x.n > 0
          ? x.n + ' piste' + (x.n > 1 ? 's' : '')
          : (x.enrichi > 0
              ? x.enrichi + ' complétée' + (x.enrichi > 1 ? 's' : '')
              : 'rien de neuf');
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
        /* `.ec-quoi` n'est PAS un emballage décoratif, et son rôle a
           changé : il est en `display:contents` à TOUTES les largeurs,
           donc ses deux enfants sont des colonnes de la rangée — pas
           une phrase qui plie. Il portait la différence entre les deux
           surfaces jusqu'à ce qu'une mesure la démente : tant que le
           compte suivait le nom, son abscisse dépendait de la longueur
           du nom, et le fil rendait quatre abscisses différentes pour
           lui. Ce que garde le poste n'est plus le mécanisme, ce sont
           des colonnes plus larges (`styles/app.css`).
           L'enveloppe reste : `display:contents` aplatit le RENDU, pas
           l'arbre — c'est elle qui donne au canal court et au compte
           leur seul parent commun. */
        const dedans =
          `<span class="ec-dir">${esc(sens)}</span>
           <span class="ec-quoi"><span class="ec-avec">${esc(avec)}</span>
             <span class="ec-n">${esc(compte)}</span></span>
           <span class="ec-when">${quand(x.t)}</span>`;
        /* Le chevron ne se pose que sur les lignes qui MÈNENT quelque
           part : les anciennes entrées, qui n'ont pas gardé leurs
           identifiants, restent du texte — promettre une ouverture
           qui n'arrive pas coûte plus qu'un chevron manquant.
           Le `.sw-in` est ce que `bindDeleteGesture` réclame : glisser
           au pouce, poubelle au survol — le motif de suppression de
           l'app, pas un bouton de plus dans la ligne. */
        /* L'historique vit dans SA feuille, au pouce comme au poste : une
           ligne y mène toujours ailleurs — le chevron le promet. (Au
           poste elle se lisait à côté de la liste ; cette place est
           maintenant celle de la conversation ouverte.) */
        const dedansLigne = x.ids.length
          ? `<button class="ec-row ec-open sw-cible" data-fil="${i}">${dedans}${ic('chevron-right', 'ic-14')}</button>`
          : `<div class="ec-row">${dedans}</div>`;
        return `<div class="ec-l" data-l="${i}"><div class="sw-in">${dedansLigne}</div></div>`;
      }).join('') +
      (reste ? `<button class="linklike tr-more" id="ecMore">Voir les ${reste} autres</button>` : '');
  /* dans SA feuille, le titre « Historique » dit déjà de quoi il s'agit :
     l'en-tête de tranche n'y redit rien */
  return `<section class="tranche ec-fil${fil.length ? '' : ' ec-vide'}">
            <div class="ec-body">${corps}</div>
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

/* ---- L'HISTORIQUE, derrière une ligne ----
   Ce qui a circulé — pistes données, pistes reçues — reste lisible, et
   chaque échange mène encore à ses pistes. Mais c'est une TRACE : elle
   ne prend plus le haut de l'écran, que la boîte occupe. Une ligne
   « Historique » en bas de la boîte, et sa feuille. */
function ouvrirHistorique(){
  const sh = openSheet({ title: 'Historique', icon: 'switch', className: 'modal-histo' });
  const rendre = () => {
    sh.body.innerHTML = filHTML();
    const fil = filVisible();
    sh.body.querySelectorAll('[data-fil]').forEach(b =>
      b.addEventListener('click', () => { const x = fil[+b.dataset.fil]; if (x) openEchange(x); }));
    /* SUPPRIMER UNE LIGNE DU FIL — le motif de l'app, pas un bouton de
       plus : glisser au pouce, poubelle au survol, et la barre
       « Annuler » à la place d'une confirmation (CLAUDE.md §6). Ce qu'on
       retire, c'est l'entrée du journal qui a produit la ligne ;
       « Annuler » la remet à SA place, pas à la fin — sinon l'ordre du
       fil changerait tout seul. */
    sh.body.querySelectorAll('.ec-l').forEach(node => {
      const x = fil[+node.dataset.l];
      if (!x) return;
      bindDeleteGesture(node, () => {
        const e = S.journal[x.i];
        if (!e) return;
        S.journal.splice(x.i, 1);
        saveJournal();
        rendre();
        renderEchanger();
        showUndo('Ligne retirée du fil.', () => {
          S.journal.splice(x.i, 0, e);
          saveJournal();
          if (sh.body.isConnected) rendre();
          renderEchanger();
        });
      }, 'cette ligne du fil');
    });
    /* les lignes révélées se déplient, elles ne surgissent pas (§4) */
    sh.body.querySelector('#ecMore')?.addEventListener('click', () => {
      const avant = filVisible().length;
      filDeplie = true;
      rendre();
      sh.body.querySelectorAll('.ec-l').forEach((n, i) => { if (i >= avant) n.classList.add('ec-neuve'); });
    });
  };
  rendre();
}

/* le volet du poste, où se pose la conversation choisie : le MÊME
   élément d'un rendu à l'autre. La boîte se redessine à chaque message
   reçu ; la conversation ouverte, elle, garde son fil, son champ et ce
   qu'on y tapait. */
let volet = null;
/* hors d'« Échanger », la conversation de droite se ferme. Cachée, elle
   resterait « sous les yeux » pour l'app : ce qui arrive pendant qu'on
   regarde ailleurs se marquerait lu, et la même conversation ouverte
   ailleurs (une feuille) existerait deux fois. Au retour, la boîte la
   repose, là où on l'avait laissée. */
window.addEventListener('hashchange', () => {
  if (!volet || /^#\/echanger\b/.test(location.hash)) return;
  const d = volet.querySelector(':scope > .dock');
  if (d && d.fermer) d.fermer();
});

export function renderEchanger(){
  const root = $('#view-echanger');
  const wide = mqWide.matches;
  /* « Donner » sans rien à donner était une action MORTE : l'indisponible
     est ABSENT, jamais grisé (loi #6). « Recevoir » prend la place — c'est
     par là qu'on commence quand un camarade nous partage sa liste. */
  const aDonner = S.companies.some(c => !isClosed(c) && !c.demo);
  const gestes =
    `<div class="hero2">
       ${aDonner ? `<button class="btn btn-primary hero" id="ecGive">${ic('share', 'ic-14')}<span>Donner</span></button>` : ''}
       <button class="btn${aDonner ? '' : ' btn-primary'} hero" id="ecRecv">${ic('inbox', 'ic-14')}<span>Recevoir</span></button>
     </div>
     ${PARTAGE_DIRECT ? `<button class="pcard moi-door" id="ecPromo">
       <span class="md-m"><b>${ic('radio', 'ic-14')} Partage en groupe</b></span>
       ${wide ? '' : ic('chevron-right', 'ic-14')}
     </button>` : ''}`;
  const b = boiteHTML(wide);
  const nHisto = exchangeLog(S.journal, 0).length;
  /* l'historique : une ligne, seulement s'il y a une trace à relire */
  const histo = nHisto ? `<button class="bx-histo" id="ecHisto">${ic('switch', 'ic-14')}<span class="bx-histo-l">Historique</span>
      <span class="bx-histo-n">${nHisto}</span>${ic('chevron-right', 'ic-14')}</button>` : '';
  /* « Reçues, jamais reprises » est né pour le poste, et il y reste :
     c'est une décision, gardée par e2e-ux-audit.mjs */
  const colonne = `${b.html}${wide ? reprendreHTML() : ''}${histo}`;
  /* au poste, deux volets dès qu'il y a une conversation : la liste à
     gauche, la conversation à droite. Sans conversation, une seule
     colonne — un volet vide ne serait qu'un trou. */
  /* et seulement sous les yeux : fermer la conversation en quittant
     l'onglet relance un rendu AVANT que la route ait changé — il ne doit
     pas la reposer (l'adresse, elle, a déjà changé) */
  const deux = wide && !b.vide && /^#\/echanger\b/.test(location.hash);
  if (volet && !deux){ const d = volet.querySelector(':scope > .dock'); if (d && d.fermer) d.fermer(); }
  /* UN NOUVEAU RENDU NE DOIT RIEN COÛTER à qui lit ou écrit. La boîte
     se redessine à chaque message reçu : la place dans la liste et le
     focus se gardent (WCAG 2.4.3), et au poste la conversation ouverte
     ne quitte JAMAIS le document — sortie puis remise, elle perdrait
     son focus (on tapait), sa sélection et son défilement. */
  const foc = root.contains(document.activeElement) ? document.activeElement : null;
  const ligneFoc = foc && foc.dataset.fil ? foc.dataset.fil : (foc && foc.id && !volet?.contains(foc) ? '#' + foc.id : '');
  const defile = root.querySelector('.bx-zone, .bx-gauche')?.scrollTop || 0;
  const gauche = deux && volet && root.contains(volet) ? root.querySelector('.bx-gauche') : null;
  if (gauche){
    root.querySelector('.ec-actes').innerHTML = gestes;
    gauche.innerHTML = colonne;
  } else {
    root.innerHTML =
      `<div class="page-inner${wide ? ' page-wide' : ''} ec-boite">
         <div class="td-head"><h1>Échanger</h1></div>
         ${wide
           ? `<div class="ec-actes">${gestes}</div>
              ${deux ? `<div class="bx-cols"><div class="bx-gauche">${colonne}</div><div class="bx-volet-ici"></div></div>`
                     : `<div class="bx-seule">${colonne}</div>`}`
           : `<div class="bx-zone">${colonne}</div>${gestes}`}
       </div>`;
    if (deux){
      if (!volet){ volet = document.createElement('div'); volet.className = 'bx-volet'; volet.id = 'bxVolet'; }
      root.querySelector('.bx-volet-ici').replaceWith(volet);
    }
  }
  const zone = root.querySelector('.bx-zone, .bx-gauche');
  if (zone && defile) zone.scrollTop = defile;
  if (ligneFoc){
    const n = ligneFoc.startsWith('#') ? root.querySelector(ligneFoc) : root.querySelector(`[data-fil="${CSS.escape(ligneFoc)}"]`);
    if (n && n !== document.activeElement) n.focus({ preventScroll: true });
  }
  root.querySelector('#ecGive')?.addEventListener('click', openDonner);
  root.querySelector('#ecRecv').addEventListener('click', openRecevoir);
  root.querySelector('#ecPromo')?.addEventListener('click', openPromo);
  root.querySelector('#ecHisto')?.addEventListener('click', ouvrirHistorique);
  bindBoite(root, { volet: deux ? volet : null, rendre: renderEchanger });
  /* une ligne qui réclame mène LÀ OÙ L'ON AGIT : sa fiche, en un tap */
  root.querySelectorAll('[data-rep]').forEach(btn =>
    btn.addEventListener('click', () => {
      const c = S.companies.find(x => x.id === btn.dataset.rep);
      if (c) openFiche(c);
    }));
}
