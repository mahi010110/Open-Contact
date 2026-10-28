/* ============================================================
   OpenContact — interface · la série au poste (lot R3-b)
   Décision 0003 : « le composeur suit le même motif quand la série
   Prêts à partir arrive : la file, le mail, et à droite ce qui aide à
   l'écrire ». Au pouce, rien ne change : un mail par écran
   (`ecrireEnSerie`, ui/prospect.js) — deux dessins seulement parce que
   l'usage diffère (§5) : au poste on garde la série sous les yeux.

   Une fenêtre, trois colonnes :
   · la FILE — chaque mail et où il en est (à écrire, parti, passé) ;
     un clic ou ↑ ↓ y mènent ;
   · le MAIL — le composeur de toujours, posé dans la colonne
     (`openMail(c, { dans })`) : mêmes gestes, mêmes gardes, mêmes
     brouillons ; rien ne part sans le geste d'envoi de chaque mail ;
   · ce qui AIDE à l'écrire — « À savoir », les notes, l'historique de
     la piste. Absent quand il n'y a rien : jamais un cadre vide.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { S, bus } from './state.js';
import { openSheet, ic, toast } from './dom.js';
import { openMail, savoirHTML } from './mail.js';
import { frDate } from './dates.js';

/* la série : un composeur après l'autre, vers la personne choisie.
   « Passer » avance, la croix arrête tout — tout de suite. La même
   série part d'« Aujourd'hui » (R3, « Écrire les N mails »). */
/* la série finie : LA MÊME phrase au pouce et au poste, dite d'un seul
   endroit — un résultat qui n'est plus à l'écran, la feuille partie */
const finDeSerie = n => toast('Série terminée — ' + n + ' piste' + (n > 1 ? 's' : '') + ' traitée' + (n > 1 ? 's' : '') + ' ✓');
export function ecrireEnSerie(pairs){
  let i = 0;
  const next = () => {
    if (i >= pairs.length){
      finDeSerie(pairs.length);
      bus.refresh();
      return;
    }
    const { c, ct } = pairs[i++];
    openMail(c, {
      ctId: ct && ct.id,
      progress: i + '/' + pairs.length,
      onDone: next,
      onQuit: () => { bus.refresh(); }
    });
  };
  next();
}

const mqWide = matchMedia('(min-width:901px)');
const ETAT = { a: 'à écrire', p: 'parti', s: 'passé' };

export function ouvrirSerie(pairs){
  if (!pairs.length) return;
  if (!mqWide.matches) { ecrireEnSerie(pairs); return; }
  const etats = pairs.map(() => 'a');
  let k = -1, fini = false, enCours = null;
  const win = openSheet({
    title: 'Écrire', icon: 'mail', className: 'modal-serie',
    onClose: () => {
      fini = true;
      if (enCours) enCours.close();
      bus.refresh();
    }
  });
  win.body.innerHTML =
    `<div class="se-grille">
       <nav class="se-file" aria-label="Les mails de la série"></nav>
       <div class="se-mail"></div>
       <aside class="se-aide" aria-label="Pour l’écrire"></aside>
     </div>`;
  const file = win.body.querySelector('.se-file');
  const zone = win.body.querySelector('.se-mail');
  const aide = win.body.querySelector('.se-aide');

  const dessinerFile = () => {
    file.innerHTML = `<ol class="se-liste">${pairs.map(({ c }, i) =>
      `<li><button class="se-l${i === k ? ' on' : ''}" data-k="${i}"${i === k ? ' aria-current="true"' : ''}>
         <b class="se-n">${esc(c.name)}</b><span class="se-e">${etats[i] === 'p' ? ic('check', 'ic-12') + ' ' : ''}${ETAT[etats[i]]}</span>
       </button></li>`).join('')}</ol>`;
    file.querySelectorAll('.se-l').forEach(b => b.addEventListener('click', () => aller(+b.dataset.k)));
  };
  file.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const j = k + (e.key === 'ArrowDown' ? 1 : -1);
    if (j >= 0 && j < pairs.length){ aller(j); file.querySelector(`[data-k="${j}"]`)?.focus(); }
  });
  const dessinerAide = c => {
    const savoir = savoirHTML(c);
    const notes = String(c.notes || '').trim();
    const hist = (c.history || []).slice(-6).reverse();
    aide.innerHTML = savoir
      + (notes ? `<section class="se-bloc"><h3 class="se-h">Mes notes</h3><p class="se-notes">${esc(notes)}</p></section>` : '')
      + (hist.length ? `<section class="se-bloc"><h3 class="se-h">Historique</h3><ul class="se-hist">${hist.map(h =>
          `<li><span class="se-d">${esc(h.d ? frDate(h.d) : '')}</span> ${esc(h.t || '')}</li>`).join('')}</ul></section>` : '');
  };

  /* le mail suivant à écrire, en partant d'ici ; aucun : la série est faite */
  const suivante = () => {
    if (fini) return;
    const j = etats.findIndex((e, i) => e === 'a' && i > k);
    const r = j >= 0 ? j : etats.indexOf('a');
    if (r >= 0) { aller(r); return; }
    fini = true;
    win.close();
    finDeSerie(pairs.length);
  };
  function aller(i){
    if (fini || i === k && enCours) return;
    k = i;
    const { c, ct } = pairs[i];
    dessinerFile();
    dessinerAide(c);
    let parti = false;
    enCours = openMail(c, {
      dans: zone, sansSavoir: true,
      ctId: ct && ct.id,
      progress: (i + 1) + '/' + pairs.length,
      onEnvoye: () => { parti = true; etats[i] = 'p'; dessinerFile(); },
      /* « Passer », ou la suite d'après l'envoi */
      onDone: () => { if (!parti) etats[i] = 's'; enCours = null; dessinerFile(); suivante(); },
      onQuit: () => {}
    });
  }
  aller(0);
}
