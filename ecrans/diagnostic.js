/* ============================================================
   OpenContact · la nouvelle interface · « Signaler un problème »
   (repris de ui/diagnostic.js, sans rien de l'ancienne interface)

   Sans compte ni analytique, rien ne remonte tout seul. L'app fabrique
   donc le texte de diagnostic, le MONTRE en entier, et le laisse partir :
   c'est l'étudiant qui choisit à qui — un message, un mail, un
   formulaire. L'app ne nomme aucune destination, elle n'en connaît
   aucune. Rien de personnel n'y entre : `engine/diagnostic.js` ne compte
   que des nombres, et c'est lui qui porte les tests. Le bloc est
   affiché en entier — c'est la preuve.
   ============================================================ */
import { diagnosticData, diagnosticText } from '../engine/diagnostic.js';
import { getBackend } from '../engine/storage.js';
import { listDocs } from './docs.js';
import { getSync, relaySnapshot, echecLiaison } from './liaison.js';
import { S } from './etat.js';
import { estProtege } from './verrou.js';

/* l'environnement se lit ICI (c'est de l'écran), les faits se calculent
   LÀ-BAS (c'est du moteur) — règle de sens unique §3 */
export async function texteDiagnostic(){
  const sy = getSync();
  return diagnosticText(diagnosticData({
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
    protection: estProtege(),
    relie: !!sy.phrase,
    relais: relaySnapshot(),
    echec: echecLiaison(),
    companies: S.companies,
    orphans: S.orphans,
    tombs: S.tombs,
    journal: S.journal,
    profile: S.profile,
    documents: await listDocs().catch(() => [])
  }));
}
