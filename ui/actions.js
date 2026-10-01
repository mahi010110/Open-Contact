/* ============================================================
   OpenContact — interface · feuilles d'action
   Les trois micro-décisions du quotidien, une à la fois :
   « et ensuite ? » (prochaine action), « reporter à quand ? »,
   « clôturer pourquoi ? ». Chaque tap valide et referme.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { CLOSE_REASONS } from '../engine/model.js';
import { S, bus, setNextAction, closePiste, saveProfile } from './state.js';
import { openSheet, toast, ic, btn } from './dom.js';
import { plusDaysISO, nextMondayISO, frDate } from './dates.js';
import { nextActionSuggestions } from '../engine/assist.js';
import { rappelICS, lienAgendaGoogle, formeAgenda } from '../engine/agenda.js';

const DATE_CHOICES = [
  ['Demain', () => plusDaysISO(1)],
  ['+3 jours', () => plusDaysISO(3)],
  ['+7 jours', () => plusDaysISO(7)],
  ['Lundi', nextMondayISO]
];
/* Deux raccourcis qui tombent le MÊME jour, c'est un choix pour rien :
   un dimanche, « Lundi » et « Demain » donnent la même date, et l'écran
   demande de trancher entre deux boutons identiques. On ne garde que le
   premier — le plus court à comprendre. */
const dateChoices = () => {
  const vus = new Set();
  return DATE_CHOICES.map(([nom, fn]) => [nom, fn()])
    .filter(([, iso]) => !vus.has(iso) && vus.add(iso));
};

/* LE RAPPEL PAR L'AGENDA DU TÉLÉPHONE. Une app web ne peut pas prévenir
   sans serveur (§10) : « je fais quoi maintenant » dépendait de penser à
   l'ouvrir. L'agenda, lui, sonne. La case vit LÀ où l'on choisit la date
   — c'est l'instant où le rappel a un sens — et elle se souvient d'une
   fois sur l'autre (`flags.rappelAgenda`, dans le profil, comme la date
   de la dernière copie) : qui veut ses rappels les veut à chaque fois.
   Quelle forme — fichier .ics ou lien Google — l'appareil le dit
   (`formeAgenda`) : ce n'est pas une question à poser. */
const agendaHTML = id =>
  `<label class="ckline"><input type="checkbox" id="${id}"${(S.profile.flags || {}).rappelAgenda ? ' checked' : ''}> Me le rappeler dans mon agenda</label>`;
function caseAgenda(root, id){
  const box = root.querySelector('#' + id);
  box.addEventListener('change', () => {
    S.profile.flags = S.profile.flags || {};
    S.profile.flags.rappelAgenda = box.checked;
    saveProfile();
  });
  return () => box.checked;
}
/* Appelé DANS le geste qui choisit la date : un téléchargement ou une
   fenêtre qui s'ouvre hors d'un geste est bloqué par le navigateur. */
export function ouvrirAgenda(c, txt, iso){
  const titre = (txt || 'Faire le point') + ' — ' + c.name;
  const details = 'Prochaine action notée dans OpenContact.';
  if (formeAgenda(navigator.userAgent) === 'ics'){
    const ics = rappelICS({ uid: c.id + '-' + iso, titre, date: iso, details });
    if (!ics) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'rappel-' + iso + '.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return;
  }
  const url = lienAgendaGoogle({ titre, date: iso, details });
  if (url) window.open(url, '_blank', 'noopener');
}

/* champ date + bouton OK : le bouton apparaît dès qu'une date est posée */
function bindDateOk(root, inputSel, okSel, pick){
  const inp = root.querySelector(inputSel);
  const okB = root.querySelector(okSel);
  const sync = () => { okB.hidden = !inp.value; };
  inp.addEventListener('input', sync);
  inp.addEventListener('change', sync);
  okB.addEventListener('click', () => { if (inp.value) pick(inp.value); });
}

/* « Et ensuite ? » — un verbe + une date ; taper une date valide et
   referme. En modification (une date existe déjà — opts.presetDate),
   « OK » valide un changement du « Quoi ? » seul en gardant la date. */
export function askNextAction(c, opts){
  opts = opts || {};
  const choix = dateChoices();
  /* « Quoi ? » est DÉJÀ RÉPONDU quand on peut le deviner. Trois boutons
     de verbes posés sous le champ ressemblaient à des actions alors
     qu'ils ne faisaient que le remplir : il fallait les lire, comprendre
     ce qu'ils font, puis en choisir un. Le service rendu est le même
     sans rien montrer — le champ arrive rempli du verbe le plus probable
     pour l'état de la piste, les autres vivent dans la liste native du
     champ (`datalist`), qui n'apparaît que si l'on vient y toucher.
     Cas courant : lire, taper une date, fini. Zéro clavier, zéro lecture
     de plus, et plus jamais « Faire le point » enregistré par défaut. */
  const verbes = nextActionSuggestions(c);
  const valeur = opts.preset != null ? opts.preset : (c.nextActionText || verbes[0] || '');
  const sh = openSheet({
    title: opts.title || 'Prochaine action ?',
    icon: 'calendar',
    /* on ne vole le focus — donc on n'ouvre le clavier — que s'il reste
       vraiment quelque chose à saisir */
    focus: valeur ? null : '#naTxt',
    onClose: () => { if (opts.onDone) opts.onDone(); }
  });
  sh.body.innerHTML =
    `<div class="na-company">${esc(c.name)}</div>
     <div class="field"><label for="naTxt">Quoi ?</label>
       <input id="naTxt" value="${esc(valeur)}" list="naSug"
              placeholder="Ex : Relancer le RH" autocomplete="off">
       <datalist id="naSug">${verbes.map(v => `<option value="${esc(v)}"></option>`).join('')}</datalist>
     </div>
     <div class="field"><label id="naWhen">Quand ?</label>
       <div class="datechips" role="group" aria-labelledby="naWhen">
         ${/* le jour SOUS le raccourci : « +3 jours » oblige à compter,
              « mer. 05/08 » se lit. Les mêmes puces qu'à « Reporter » :
              même décision, même enchaînement, donc même dessin. */''}
         ${choix.map(([nom, iso], i) =>
           `<button class="dchip dchip-d" data-i="${i}"><b>${nom}</b><span>${frDate(iso)}</span></button>`).join('')}
       </div>
     </div>
     <div class="field"><label for="naDate">Ou une date précise</label>
       <div class="date-row">
         <input id="naDate" type="date" min="${plusDaysISO(0)}">
         <button class="btn btn-primary" id="naOk" hidden>OK</button>
       </div></div>
     ${agendaHTML('naAgenda')}`;
  const veutAgenda = caseAgenda(sh.body, 'naAgenda');
  const pick = iso => {
    const txt = sh.body.querySelector('#naTxt').value.trim() || 'Faire le point';
    if (veutAgenda()) ouvrirAgenda(c, txt, iso);
    /* mode formulaire (fiche) : la valeur revient à l'appelant, qui
       n'enregistrera qu'au « Confirmer » */
    if (opts.onPick){
      opts.onPick(txt, iso);
      sh.close();
      return;
    }
    setNextAction(c, txt, iso, opts.ctId);
    sh.close();
    bus.refresh();
  };
  sh.body.querySelectorAll('.dchip-d').forEach(b =>
    b.addEventListener('click', () => pick(choix[+b.dataset.i][1])));
  /* la date précise se VALIDE : sur mobile, la roue déclenche des
     `change` intermédiaires — fermer au premier aurait pris la mauvaise date */
  bindDateOk(sh.body, '#naDate', '#naOk', pick);
  /* une date existe déjà : changer seulement le « Quoi ? » se valide
     (OK ou Entrée), la date en place est gardée */
  if (opts.presetDate){
    sh.body.querySelector('#naTxt').addEventListener('keydown', e => {
      if (e.key === 'Enter') pick(opts.presetDate);
    });
    sh.setFoot([btn('OK — garder ' + frDate(opts.presetDate), 'btn-primary', () => pick(opts.presetDate))]);
  }
  /* LA RÉPONSE CONSEILLÉE SE TAPE EN BAS. Après un envoi, la relance a
     un délai que les données donnent — 5 à 7 jours ouvrés (§6,
     `SILENCE_RELANCE`) — et décider QUAND aide nettement à faire
     (Gollwitzer et Sheeran, 2006). Elle n'était qu'une puce parmi
     quatre : on fermait la feuille, et rien n'était prévu. Elle tient
     maintenant le pied, sous le pouce ; les puces restent pour un autre
     jour, et la croix pour ne rien prévoir. */
  else if (opts.conseil > 0){
    const iso = plusDaysISO(opts.conseil);
    sh.setFoot([btn('Dans ' + opts.conseil + ' jours', 'btn-primary', () => pick(iso))]);
  }
  return sh;
}

/* « Reporter à quand ? » — le verbe ne change pas, seulement la date */
export function reportAction(c){
  const choix = dateChoices();
  const sh = openSheet({ title: 'Reporter', icon: 'calendar' });
  sh.body.innerHTML =
    `<div class="na-company">${esc(c.nextActionText || 'Faire le point')} — ${esc(c.name)}</div>
     ${/* EXACTEMENT les raccourcis d'« Et ensuite ? ». C'est la même
          question — quelle date — posée depuis la même ligne, à un
          bouton d'écart : elle ne peut pas avoir deux dessins. Elle en
          avait deux (trois pavés pleine largeur ici, trois puces
          là-bas), et le commentaire d'à côté affirmait le contraire. */''}
     <div class="datechips" role="group" aria-label="Reporter à">
       ${choix.map(([nom, iso], i) =>
         `<button class="dchip dchip-d" data-i="${i}"><b>${nom}</b><span>${frDate(iso)}</span></button>`).join('')}
     </div>
     <div class="field" style="margin-top:12px"><label for="rpDate">Ou une date précise</label>
       <div class="date-row">
         <input id="rpDate" type="date" min="${plusDaysISO(0)}">
         <button class="btn btn-primary" id="rpOk" hidden>OK</button>
       </div></div>
     ${agendaHTML('rpAgenda')}`;
  const veutAgenda = caseAgenda(sh.body, 'rpAgenda');
  const pick = iso => {
    if (veutAgenda()) ouvrirAgenda(c, c.nextActionText, iso);
    /* reporter ne change ni le verbe ni la personne visée (#14) */
    setNextAction(c, c.nextActionText, iso, c.nextActionCt);
    sh.close();
    toast('Reporté à ' + frDate(iso) + '.');
    bus.refresh();
  };
  sh.body.querySelectorAll('.dchip-d').forEach(b =>
    b.addEventListener('click', () => pick(choix[+b.dataset.i][1])));
  bindDateOk(sh.body, '#rpDate', '#rpOk', pick);
}

/* « Clôturer » — une raison, un tap ; la piste reste dans « Mes pistes » */
export function askClose(c, opts){
  opts = opts || {};
  const sh = openSheet({ title: 'Clôturer la piste', icon: 'archive' });
  sh.body.innerHTML =
    `<div class="na-company">${esc(c.name)}</div>
     <div class="pick-list">
       ${Object.keys(CLOSE_REASONS).map(k =>
         /* « Décroché », « Refusé », « Abandonné » se suffisent : le mot
            d'encouragement vit dans le toast qui suit, pas sous le bouton */
         `<button class="pick pick-close" data-r="${k}" style="--c:${CLOSE_REASONS[k].color}">
            <b>${CLOSE_REASONS[k].label}</b>
          </button>`).join('')}
     ${/* « Elle reste dans Mes pistes » rassurait sur un geste qui se
          défait : la fiche d'une piste clôturée porte « Rouvrir », et un
          toast confirme juste après. Une phrase qui protège d'une peur,
          pas d'une perte, ne protège personne. */''}
     </div>`;
  sh.body.querySelectorAll('.pick-close').forEach(b =>
    b.addEventListener('click', () => {
      closePiste(c, b.dataset.r);
      sh.close();
      toast(b.dataset.r === 'won'
        ? '🎉 Décroché — félicitations !'
        : 'Piste clôturée (' + CLOSE_REASONS[b.dataset.r].label + ').');
      if (opts.onDone) opts.onDone();
      bus.refresh();
    }));
}
