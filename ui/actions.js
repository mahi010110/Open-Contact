/* ============================================================
   OpenContact — interface · feuilles d'action
   Les trois micro-décisions du quotidien, une à la fois :
   « et ensuite ? » (prochaine action), « reporter à quand ? »,
   « clôturer pourquoi ? ». Chaque tap valide et referme.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { CLOSE_REASONS } from '../engine/model.js';
import { bus, setNextAction, closePiste } from './state.js';
import { openSheet, toast, ic, btn } from './dom.js';
import { plusDaysISO, nextMondayISO, frDate } from './dates.js';
import { nextActionSuggestions } from '../engine/assist.js';

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
       </div></div>`;
  const pick = iso => {
    const txt = sh.body.querySelector('#naTxt').value.trim() || 'Faire le point';
    /* mode formulaire (fiche) : la valeur revient à l'appelant, qui
       n'enregistrera qu'au « Confirmer » */
    if (opts.onPick){
      opts.onPick(txt, iso);
      sh.close();
      return;
    }
    setNextAction(c, txt, iso, opts.ctId);
    sh.close();
    toast('Noté : ' + txt + ' — ' + frDate(iso));
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
  return sh;
}

/* « Reporter à quand ? » — le verbe ne change pas, seulement la date */
export function reportAction(c){
  const choix = dateChoices();
  const sh = openSheet({ title: 'Reporter', icon: 'clock' });
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
       </div></div>`;
  const pick = iso => {
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
     </div>
     <p class="hint">${ic('archive', 'ic-14')} Elle reste dans « Mes pistes », tu peux la rouvrir.</p>`;
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
