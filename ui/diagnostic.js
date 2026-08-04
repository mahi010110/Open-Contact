/* ============================================================
   OpenContact — interface · « Signaler un problème »
   Le chemin de retour d'une bêta sans serveur (docs/roadmap.md §3) :
   sans compte ni analytique, rien ne remonte tout seul. L'app
   fabrique donc le texte de diagnostic, le MONTRE en entier, et le
   laisse partir dans le presse-papier — c'est l'étudiant qui le
   colle, et il a lu ce qu'il colle.

   Rien de personnel n'y entre : `engine/diagnostic.js` ne compte
   que des nombres, et c'est lui qui porte les tests.
   ============================================================ */
import { APP_VERSION } from '../engine/model.js';
import { diagnosticData, diagnosticText } from '../engine/diagnostic.js';
import { getBackend } from '../engine/storage.js';
import { DIST_REPO } from '../engine/distribution.js';
import { esc } from '../engine/utils.js';
import { listDocs } from './docs.js';
import { getSync } from './synclive.js';
import { isProtected } from './verrou.js';
import { S } from './state.js';
import { btn, toast, openSheet } from './dom.js';

export const ISSUES_URL = `https://github.com/${DIST_REPO}/issues/new`;

/* l'environnement se lit ICI (c'est de l'écran), les faits se
   calculent LÀ-BAS (c'est du moteur) — règle de sens unique §3 */
export async function collectDiagnostic(){
  const sy = getSync();
  return diagnosticData({
    version: APP_VERSION,
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
  /* La phrase reste : le geste envoie un texte hors de l'app, et §7
     réserve exactement à ce moment-là le droit d'écrire une phrase
     entière. Elle dit ce que le texte N'A PAS — c'est la seule chose
     que la lecture du bloc ne donne pas d'un coup d'œil. */
  sh.body.innerHTML =
    `<p class="hint">Aucun nom, aucune adresse — que des nombres.</p>
     <pre class="diag" tabindex="0" aria-label="Texte de diagnostic">${esc(txt)}</pre>`;
  sh.setFoot([
    btn('Copier', 'btn-primary', async () => {
      try { await navigator.clipboard.writeText(txt); toast('Copié — colle-le dans une issue.'); }
      catch (e) { toast('Copie impossible ici — sélectionne le texte.'); }
    }, 'copy'),
    btn('Ouvrir GitHub', '', () => window.open(ISSUES_URL, '_blank', 'noopener'), 'external-link')
  ]);
  return sh;
}
