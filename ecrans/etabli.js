/* ============================================================
   OpenContact · la nouvelle interface · le poste, un établi
   (docs/brief-refonte.md, lot 6 ; la maquette validée le 17 novembre)

   À l'ordinateur, deux gestes de plus, et aucun bouton pour eux :
   · COLLER n'importe où (Ctrl V, hors d'un champ) : une offre en fait une
     piste, un lien se cherche, la réponse de son assistant ouvre « Depuis
     mes e-mails » — le même chemin que la barre de Trouver (collerTexte).
   · DÉPOSER un fichier sur la fenêtre : un CV ou une lettre va dans
     « CV et lettres » (avec « Annuler »), une copie .oc s'ouvre avec son
     aperçu, des pistes reçues dans « Recevoir ». Pendant qu'on glisse, la
     fenêtre dit où il ira.
   Verrouillée, ou une feuille ouverte, l'app ne prend rien.
   ============================================================ */
import { $, esc } from './outils.js';
import { C, rendre, annuler, toast, feuilleOuverte } from './coque.js';
import { collerTexte } from './trouver.js';
import { rangerPdf, retirerDoc } from './docs.js';
import { ouvrirM, M } from './moi-nav.js';
import { restaurerTexte } from './copie.js';
import { estVerrouille } from './verrou.js';
import { estOffre } from '../engine/offre.js';
import { lireReponseEmails } from '../engine/emails.js';
import { extraireOCQ } from '../engine/exchange.js';

const ERR_DOC = { pdf: 'Un CV ou une lettre se garde en PDF : enregistre-le en PDF, puis dépose-le.',
  lourd: 'Trop lourd (8 Mo au plus) : allège le PDF.', stockage: 'Ce navigateur ne peut pas ranger le fichier ici.' };
const DIT = { cv: 'Ton CV ira dans « CV et lettres ».', fichier: 'Une copie .oc s’ouvre avec son aperçu.', texte: 'L’app lit l’offre, et en fait une piste.' };
const occupe = () => !C.poste || estVerrouille() || !!feuilleOuverte();

/* ce qu'on glisse, avant de le lâcher : le navigateur ne dit que le genre */
function genre(dt){
  const it = dt && dt.items ? Array.from(dt.items) : [];
  const f = it.find(x => x.kind === 'file');
  if (f) return /pdf|msword|officedocument|opendocument/.test(f.type) ? 'cv' : 'fichier';
  const ty = Array.from((dt && dt.types) || []);
  return ty.includes('text/plain') || ty.includes('text/uri-list') ? 'texte' : '';
}
async function deposerFichier(f){
  if (/\.(pdf|docx?|odt)$/i.test(f.name) || /pdf|msword|officedocument|opendocument/.test(f.type)){
    const kind = /lettre|motivation/i.test(f.name) ? 'lm' : 'cv';
    const r = await rangerPdf(kind, f);
    if (r.erreur){ toast(ERR_DOC[r.erreur] || ERR_DOC.stockage); return; }
    M.docs = null;            /* « CV et lettres » se relit */
    ouvrirM('docs', '');
    annuler(`${f.name} ajouté`, async () => { await retirerDoc(r.key).catch(() => {}); M.docs = null; rendre(); });
    return;
  }
  const raw = f.size <= 4e6 ? await f.text().catch(() => '') : '';
  const t = raw.trim();
  /* une copie, des pistes reçues, un fichier chiffré : le chemin de
     « Restaurer › Depuis un fichier », qui reconnaît chacun */
  if (/\.oc$/i.test(f.name) || /^(\{|\[|OC1\.|OC2\.|OCQ1\.)/.test(t)){ restaurerTexte(raw, f.lastModified); return; }
  /* une offre (ou la réponse de son assistant) gardée dans un fichier texte */
  if (t && (estOffre(t) || lireReponseEmails(t) || extraireOCQ(t))){ collerTexte(t); return; }
  toast('L’app reçoit ici une offre, une copie .oc ou un CV.');
}

export function brancherEtabli(){
  document.addEventListener('paste', ev => {
    if (occupe()) return;
    const t = ev.target;
    if (t && t.matches && t.matches('input, textarea, select, [contenteditable="true"]')) return;
    const x = ev.clipboardData && ev.clipboardData.getData('text');
    if (!x || !x.trim()) return;
    ev.preventDefault();
    collerTexte(x);
  });
  const fen = $('#oc .fen');
  if (!fen) return;
  const depot = document.createElement('div');
  depot.className = 'depot';
  depot.hidden = true;
  depot.setAttribute('aria-hidden', 'true');
  fen.appendChild(depot);
  let n = 0;
  const cacher = () => { n = 0; depot.hidden = true; };
  fen.addEventListener('dragenter', ev => {
    const g = genre(ev.dataTransfer);
    if (!g || occupe()) return;
    ev.preventDefault();
    n++;
    const e = $('.ecran', fen);
    if (e){ depot.style.top = (e.offsetTop + 6) + 'px'; depot.style.height = Math.max(80, e.offsetHeight - 12) + 'px'; }
    depot.innerHTML = `<p><b>Dépose ici</b>${esc(DIT[g])}</p>`;
    depot.hidden = false;
  });
  fen.addEventListener('dragover', ev => { if (depot.hidden) return; ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy'; });
  fen.addEventListener('dragleave', () => { if (--n <= 0) cacher(); });
  fen.addEventListener('drop', ev => {
    if (depot.hidden) return;
    ev.preventDefault();
    cacher();
    const dt = ev.dataTransfer, f = dt && dt.files && dt.files[0];
    if (f){ deposerFichier(f); return; }
    const t = dt && (dt.getData('text/plain') || dt.getData('text/uri-list'));
    if (t && t.trim()) collerTexte(t);
  });
  /* un glisser qui sort de la fenêtre sans lâcher, ou qu'on annule par Échap */
  addEventListener('dragend', cacher);
  addEventListener('blur', cacher);
}
