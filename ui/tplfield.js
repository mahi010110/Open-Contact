/* ============================================================
   OpenContact — interface · champ de gabarit sans code (#17)
   Jamais de {{...}} à l'écran : l'utilisateur voit un vrai texte
   rempli. Les bouts qui changent selon la personne (prénom,
   entreprise…) sont des jetons insécables surlignés en douceur,
   remplis d'un exemple réel ; le reste s'écrit en texte normal.
   À l'enregistrement, le gabarit {{...}} d'origine est resérialisé
   — le format stocké ne change pas. Sert au wizard de campagne et
   aux modèles d'emails.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { S } from './state.js';

/* quand une valeur d'exemple manque, le jeton se lit en français —
   la même table nomme les jetons insérables (« Insérer : … ») */
export const TPL_LABELS = {
  contact: 'la personne', entreprise: 'l’entreprise', ville: 'la ville',
  moi: 'ton nom', formation: 'ta formation', tel: 'ton téléphone',
  email: 'ton email', cv: 'ton CV', portfolio: 'ton portfolio'
};
const FALLBACK = TPL_LABELS;

/* les valeurs d'exemple : la 1ʳᵉ cible réelle quand on l'a, le profil sinon */
export function tplSample(company, ct){
  const p = S.profile || {};
  return {
    entreprise: (company && company.name) || '',
    contact: (ct && ct.name) || '',
    ville: (company && company.city) || '',
    moi: p.name || '', formation: p.formation || '',
    tel: p.phone || '', email: p.email || '',
    cv: p.cvUrl || '', portfolio: p.portfolio || ''
  };
}

export function tplField(el, o){
  o = o || {};
  const sample = o.sample || {};
  el.classList.add('tpl-field');
  if (o.multiline === false) el.classList.add('tpl-single');
  el.contentEditable = 'true';
  el.spellcheck = false;

  const render = tpl => {
    el.innerHTML = String(tpl || '').split(/(\{\{\w+\}\})/g).map(part => {
      const m = /^\{\{(\w+)\}\}$/.exec(part);
      if (!m) return esc(part);
      const k = m[1];
      const v = sample[k] || FALLBACK[k] || k;
      return `<span class="tvar" data-k="${esc(k)}" contenteditable="false"
                    title="Se remplit tout seul selon le contact">${esc(v)}</span>`;
    }).join('');
  };
  render(o.value);

  /* coller = texte brut, jamais du HTML étranger */
  el.addEventListener('paste', e => {
    e.preventDefault();
    const txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  });

  const api = {
    el,
    set: render,
    /* insère un jeton au curseur (ou en fin de champ) — le geste des
       boutons « Insérer : la personne · l'entreprise · … » */
    insert(k){
      const span = document.createElement('span');
      span.className = 'tvar';
      span.dataset.k = k;
      span.contentEditable = 'false';
      span.title = 'Se remplit tout seul selon le contact';
      span.textContent = sample[k] || FALLBACK[k] || k;
      const s = window.getSelection();
      if (s && s.rangeCount && el.contains(s.anchorNode)){
        const r = s.getRangeAt(0);
        r.deleteContents();
        r.insertNode(span);
        r.setStartAfter(span);
        r.collapse(true);
        s.removeAllRanges();
        s.addRange(r);
      } else {
        el.append(span);
      }
    },
    /* resérialise le gabarit : texte tel quel, jetons → {{clé}} */
    get(){
      let out = '';
      const walk = n => {
        for (const ch of n.childNodes){
          if (ch.nodeType === 3){ out += ch.nodeValue; continue; }
          if (ch.nodeType !== 1) continue;
          if (ch.classList && ch.classList.contains('tvar')){ out += '{{' + ch.dataset.k + '}}'; continue; }
          if (ch.tagName === 'BR'){ out += '\n'; continue; }
          /* les blocs (div/p) que le navigateur crée à Entrée = retours */
          if (out && !out.endsWith('\n')) out += '\n';
          walk(ch);
        }
      };
      walk(el);
      return out;
    }
  };

  bindAtMenu(el, api, o.multiline === false);
  return api;
}

/* ---------- insérer au « @ » ----------
   Plus aucun bouton d'insertion : on tape `@` en début de mot, une petite
   liste s'ouvre sous le curseur, on choisit. C'est ce que font les
   éditeurs de gabarits sérieux (Mailchimp, Brevo, Unlayer) — neuf boutons
   alignés sous le champ, personne.

   Le `@` d'une adresse e-mail ne déclenche rien : il suit une lettre, et
   la liste n'ouvre qu'en DÉBUT de mot. */
const AT_RE = /(^|\s)@(\p{L}*)$/u;
function bindAtMenu(el, api, single){
  let pop = null, items = [], cur = 0;

  const close = () => { pop?.remove(); pop = null; items = []; };

  /* le texte du nœud courant jusqu'au curseur — c'est là que vit le `@` */
  const contexte = () => {
    const s = window.getSelection();
    if (!s || !s.rangeCount || !el.contains(s.anchorNode)) return null;
    const n = s.anchorNode;
    if (n.nodeType !== 3) return null;
    const m = AT_RE.exec(n.nodeValue.slice(0, s.anchorOffset));
    return m ? { node: n, debut: s.anchorOffset - m[2].length - 1, fin: s.anchorOffset, q: m[2] } : null;
  };

  const choisir = k => {
    const c = contexte();
    if (c){
      const r = document.createRange();
      r.setStart(c.node, c.debut);
      r.setEnd(c.node, c.fin);
      r.deleteContents();
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
    close();
    api.insert(k);
    el.focus();
  };

  const dessine = q => {
    const bas = q.toLowerCase();
    items = Object.keys(TPL_LABELS).filter(k => TPL_LABELS[k].toLowerCase().includes(bas));
    if (!items.length){ close(); return; }
    cur = Math.min(cur, items.length - 1);
    if (!pop){
      pop = document.createElement('div');
      pop.className = 'at-pop';
      pop.setAttribute('role', 'listbox');
      document.body.append(pop);
      pop.addEventListener('mousedown', e => e.preventDefault());   /* garder le curseur */
    }
    pop.innerHTML = items.map((k, i) =>
      `<button role="option" aria-selected="${i === cur}" class="${i === cur ? 'on' : ''}" data-k="${k}">${esc(TPL_LABELS[k])}</button>`).join('');
    pop.querySelectorAll('[data-k]').forEach(b =>
      b.addEventListener('click', () => choisir(b.dataset.k)));
    /* sous le curseur, et jamais hors de l'écran */
    const s = window.getSelection();
    const r = s && s.rangeCount ? s.getRangeAt(0).cloneRange() : null;
    const box = r ? r.getBoundingClientRect() : el.getBoundingClientRect();
    const x = Math.min(box.left || el.getBoundingClientRect().left, innerWidth - 210);
    pop.style.left = Math.max(8, x) + 'px';
    pop.style.top = Math.min(box.bottom + 4, innerHeight - 180) + 'px';
  };

  el.addEventListener('input', () => {
    const c = contexte();
    if (c) dessine(c.q); else close();
  });
  el.addEventListener('blur', () => setTimeout(close, 120));
  el.addEventListener('keydown', e => {
    if (pop){
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
        e.preventDefault();
        cur = (cur + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length;
        dessine(contexte()?.q || '');
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab'){ e.preventDefault(); choisir(items[cur]); return; }
      if (e.key === 'Escape'){ e.preventDefault(); close(); return; }
    }
    if (single && e.key === 'Enter') e.preventDefault();
  });
}
