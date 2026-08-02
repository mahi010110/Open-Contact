/* ============================================================
   OpenContact — interface · mode Prospecter (#17)
   Des candidatures en série : je coche mes pistes, et chaque
   envoi part vers UNE personne visible et choisie — jamais un
   « premier email » deviné. Une boîte sans contact joignable
   propose « ＋ ajoute quelqu'un » au lieu d'être écartée (N6).
   Puis « Une par une » ou « En campagne ».
   ============================================================ */
import { esc } from '../engine/utils.js';
import { STATUSES, nextActionContact } from '../engine/model.js';
import { filterCompanies } from '../engine/filter.js';
import { S, bus, isClosed } from './state.js';
import { openSheet, toast, btn, ic, softReorder } from './dom.js';
import { sortState, sortArgs } from './sort.js';
import { filterState, filterArgs, affinerBtnHTML, bindAffinerBtn } from './affiner.js';
import { openMail } from './mail.js';
import { openContactEditor } from './contact.js';
import { openCampaignWizard } from './campagnes.js';
import { whoCandidates, whoLineHTML, whoInline, openWhoPicker } from './qui.js';

/* la personne proposée d'office : celle de la prochaine action, sinon
   la première activée avec email, sinon la première joignable (#14) */
function defaultCt(c){
  const na = nextActionContact(c);
  if (na && na.email) return na;
  const withMail = (c.contacts || []).filter(t => t.email);
  return withMail.find(t => t.activatedAt) || withMail[0] || null;
}

export function openProspect(){
  const alive = () => S.companies.filter(c => !isClosed(c));
  if (!alive().length) return;
  const sel = new Set();
  const st = sortState('status');            /* « À contacter » en tête par défaut */
  const ft = filterState();                  /* propre à cet écran (#8) */
  const sh = openSheet({ title: 'Prospecter — qui ?', icon: 'mail' });

  /* qui recevra, piste par piste (#1). Écrire n'est pas donner : le
     défaut reste UNE personne — celle de la prochaine action — sinon un
     tap enverrait trois candidatures à la même boîte. En ajouter est un
     geste, jamais un effet de bord. */
  const keepMap = new Map();
  const keepOf = c => {
    if (!keepMap.has(c.id)){
      const d = defaultCt(c);
      keepMap.set(c.id, new Set(d ? [d.id] : []));
    }
    return keepMap.get(c.id);
  };
  const pairsOf = c => {
    const cand = whoCandidates(c, 'ecrire');
    /* aucune personne joignable : la piste suit quand même, pour que
       l'assistant l'écarte À VUE (« 1 piste sans email ») plutôt qu'elle
       disparaisse en silence ici */
    if (!cand.length) return [{ c, ct: null }];
    return cand.filter(t => keepOf(c).has(t.id)).map(ct => ({ c, ct }));
  };
  const allPairs = () => alive().filter(c => sel.has(c.id)).flatMap(pairsOf);
  const nWho = () => allPairs().filter(p => p.ct).length;

  const bGo = btn('Continuer', 'btn-primary', () => {
    if (!sel.size){ toast('Coche au moins une piste.'); return; }
    const pairs = allPairs();
    if (!pairs.some(p => p.ct)){ toast('Choisis au moins une personne.'); return; }
    sh.close();
    chooseMode(pairs);
  });
  const sync = () => {
    const n = nWho();
    bGo.textContent = n ? `Continuer (${n})` : 'Continuer';
    bGo.classList.toggle('btn-off', !n);
  };

  /* choisir les personnes d'une piste — le composant partagé */
  const pickWho = c => openWhoPicker(c, keepOf(c), {
    verbe: 'ecrire',
    /* plus personne de retenu = la piste n'est plus prospectée : le dire
       tout de suite plutôt que l'écarter en silence au « Continuer » */
    onChange: keep => { if (!keep.size) sel.delete(c.id); render(); },
    onAdd: () => openContactEditor({ company: c, onDone: () => { sel.add(c.id); render(); } })
  });

  const render = () => {
    const list = filterCompanies(alive(), { ...filterArgs(ft), ...sortArgs(st) });
    sh.body.innerHTML =
      `<div class="listbar">
         <button class="linklike" id="pkAll">${sel.size ? 'Tout décocher' : 'Tout cocher'}</button>
         ${affinerBtnHTML(ft, st)}
       </div>
       <div class="pick-list">
         ${list.map(c =>
           `<div class="pk-duo">
              <button class="pick pk${sel.has(c.id) ? ' on' : ''}" data-id="${c.id}" aria-pressed="${sel.has(c.id)}">
                ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
                <div class="pk-m"><b>${esc(c.name)}</b>
                  <span>${STATUSES[c.status].label}${
                    /* déjà échappé par whoInline — il porte son icône */
                    whoInline(c, keepOf(c), 'ecrire') && ' · ' + whoInline(c, keepOf(c), 'ecrire')
                    || ''}</span></div>
              </button>
              ${whoLineHTML(c, keepOf(c), 'ecrire')}
            </div>`).join('')}
       </div>`;
    sh.body.querySelectorAll('.pk').forEach(b =>
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        if (sel.has(id)){ sel.delete(id); }
        else {
          sel.add(id);
          /* re-cocher une piste dont on avait tout décoché : la personne
             par défaut revient — sinon « Continuer » l'ignorerait */
          const c = alive().find(x => x.id === id);
          const d = c && !keepOf(c).size && defaultCt(c);
          if (d){ keepOf(c).add(d.id); render(); return; }
        }
        b.classList.toggle('on', sel.has(id));
        b.setAttribute('aria-pressed', sel.has(id));
        sync();
      }));
    sh.body.querySelectorAll('[data-who]').forEach(b =>
      b.addEventListener('click', () => {
        const c = alive().find(x => x.id === b.dataset.who);
        if (c) pickWho(c);
      }));
    sh.body.querySelectorAll('[data-addct]').forEach(b =>
      b.addEventListener('click', () => {
        const c = alive().find(x => x.id === b.dataset.addct);
        if (c) openContactEditor({ company: c, onDone: () => { sel.add(c.id); render(); } });
      }));
    /* le lien dit ce que le tap va faire, et il porte sur ce qui est
       AFFICHÉ — filtrer puis « Tout cocher » remplace l'ancien raccourci
       « Cocher les N à contacter », en mieux (#8) */
    sh.body.querySelector('#pkAll').addEventListener('click', () => {
      if (sel.size) sel.clear();
      else for (const c of list){
        sel.add(c.id);
        const d = !keepOf(c).size && defaultCt(c);
        if (d) keepOf(c).add(d.id);
      }
      render();
    });
    bindAffinerBtn(sh.body, ft, st, { pool: alive }, () => { const play = softReorder('.modal-b .pk'); render(); play(); });
    sync();
  };
  sh.setFoot([bGo]);
  render();
}

/* la bifurcation : une décision, deux chemins. Le titre compte les
   pistes, et n'ajoute les personnes que si les deux diffèrent (#1) */
function chooseMode(pairs){
  const nP = pairs.length;
  const nC = new Set(pairs.map(x => x.c.id)).size;
  const sh = openSheet({
    title: nC + ' piste' + (nC > 1 ? 's' : '') + (nP === nC ? '' : ' · ' + nP + ' personnes'),
    icon: 'mail'
  });
  sh.body.innerHTML =
    `<div class="pick-list">
       <button class="pick" id="pmOne"><b>${ic('mail', 'ic-14')} Une par une</b>
         <span>maintenant</span></button>
       <button class="pick" id="pmCamp"><b>${ic('flag', 'ic-14')} En campagne</b>
         <span>sur 2 semaines</span></button>
     </div>`;
  sh.body.querySelector('#pmOne').addEventListener('click', () => { sh.close(); run(pairs); });
  sh.body.querySelector('#pmCamp').addEventListener('click', () => { sh.close(); openCampaignWizard(pairs); });
}

/* la série : un composeur après l'autre, vers la personne choisie.
   « Passer » avance, la croix arrête tout — tout de suite. */
function run(pairs){
  let i = 0;
  const next = () => {
    if (i >= pairs.length){
      toast('Série terminée — ' + pairs.length + ' piste' + (pairs.length > 1 ? 's' : '') + ' traitée' + (pairs.length > 1 ? 's' : '') + ' ✓');
      bus.refresh();
      return;
    }
    const { c, ct } = pairs[i++];
    openMail(c, {
      ctId: ct && ct.id,
      progress: i + '/' + pairs.length,
      onDone: next,
      onQuit: () => { toast('Prospection arrêtée.'); bus.refresh(); }
    });
  };
  next();
}
