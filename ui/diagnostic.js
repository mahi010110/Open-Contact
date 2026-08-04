/* ============================================================
   OpenContact — interface · « Signaler un problème »
   Sans compte ni analytique, rien ne remonte tout seul. L'app
   fabrique donc le texte de diagnostic, le MONTRE en entier, et le
   laisse partir dans le presse-papier — c'est l'étudiant qui le
   colle, où il veut : un message, un mail, un formulaire. L'app ne
   nomme aucune destination, elle n'en connaît aucune.

   Rien de personnel n'y entre : `engine/diagnostic.js` ne compte
   que des nombres, et c'est lui qui porte les tests. Le bloc est
   affiché en entier — c'est la preuve, et elle remplace la phrase
   qui promettait la même chose en moins sûr.
   ============================================================ */
import { diagnosticData, diagnosticText } from '../engine/diagnostic.js';
import { getBackend } from '../engine/storage.js';
import { esc } from '../engine/utils.js';
import { listDocs } from './docs.js';
import { getSync } from './synclive.js';
import { isProtected } from './verrou.js';
import { S } from './state.js';
import { btn, toast, openSheet } from './dom.js';

/* l'environnement se lit ICI (c'est de l'écran), les faits se
   calculent LÀ-BAS (c'est du moteur) — règle de sens unique §3 */
export async function collectDiagnostic(){
  const sy = getSync();
  return diagnosticData({
    ua: navigator.userAgent,
    langue: navigator.language,
    largeur: window.innerWidth,
    hauteur: window.innerHeight,
    installee: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
    /* le thème RÉELLEMENT posé sur la page, pas la préférence gardée :
       c'est celui-là qu'on regardait quand ça a cloché */
    theme: document.documentElement.dataset.theme || S.theme,
    enLigne: navigator.onLine !== false,
    backend: getBackend(),
    protection: isProtected(),
    relie: !!sy.phrase,
    companies: S.companies,
    orphans: S.orphans,
    tombs: S.tombs,
    journal: S.journal,
    profile: S.profile,
    documents: await listDocs().catch(() => [])
  });
}

export async function openDiagnostic(){
  const txt = diagnosticText(await collectDiagnostic());
  const sh = openSheet({ title: 'Signaler un problème', icon: 'square-alert' });
  sh.body.innerHTML =
    `<pre class="diag" tabindex="0" aria-label="Texte de diagnostic">${esc(txt)}</pre>`;
  /* Un seul geste, donc un seul bouton. « Où le coller » ne regarde
     pas l'app : le presse-papier va dans un message, un mail, un
     formulaire — et rien ici ne vieillira le jour où le dépôt
     déménage. */
  sh.setFoot([
    btn('Copier', 'btn-primary', async () => {
      try { await navigator.clipboard.writeText(txt); toast('Copié — colle-le où tu veux.'); }
      catch (e) { toast('Copie impossible ici — sélectionne le texte.'); }
    }, 'copy')
  ]);
  return sh;
}
