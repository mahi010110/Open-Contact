/* ============================================================
   OpenContact — les drapeaux de livraison et la préversion
   (docs/recadrage.md, docs/decisions/0004-drapeaux-et-preversion.md)

   Deux sortes de drapeaux, à ne pas confondre :
   · le PÉRIMÈTRE (ui/perimetre.js) : ce qui appartient à une autre
     surface, ou ce qui est reporté par choix. C'est une décision de
     produit, sans date : elle dure tant que la décision dure.
   · la LIVRAISON (ici) : un lot du recadrage, arrivé dans main mais
     pas encore vérifié avec de vraies personnes. Il vit le temps d'un
     test : il naît avec son lot, s'allume en préversion, s'ouvre à
     tous, puis part avec l'ancien chemin.

   D'où la DATE DE RETRAIT. Un drapeau de livraison qui reste devient
   de la dette — deux chemins à tenir pour toujours (Hodgson, « Feature
   Toggles », martinfowler.com). Celui qui la dépasse fait échouer
   ?test : on l'ouvre et on retire l'ancien chemin, ou on repousse la
   date exprès, dans le même commit qui dit pourquoi.

   Fonctions pures : l'écran lit la préversion de l'appareil
   (`oc_preversion_v1`), le moteur dit ce qui s'allume.
   ============================================================ */

/* Un drapeau : `id` (ce que le code demande), `lot` (le lot du
   recadrage), `nom` (ce que lit le testeur dans Réglages), `raison`,
   `cree` et `retrait` (dates ISO), `ouvert` (visible pour tous). */
export const DRAPEAUX = Object.freeze([
  Object.freeze({
    id: 'reseau', lot: 'R1', nom: 'l’onglet Réseau',
    raison: 'Les gens au même endroit : l’onglet Réseau remplace Échanger, le + fait tout entrer, Partager part des pistes (décision 0002).',
    cree: '2026-10-19', retrait: '2027-03-31', ouvert: false
  }),
  Object.freeze({
    id: 'suivi', lot: 'R2', nom: 'tes chiffres et le retour après une pause',
    raison: 'Un suivi qui se remplit seul : tes chiffres en tête de Pistes, et après 7 jours sans un geste, trois choses à reprendre (proposition R2).',
    cree: '2026-10-20', retrait: '2027-03-31', ouvert: false
  }),
  Object.freeze({
    id: 'prets', lot: 'R3', nom: 'les mails prêts à partir',
    raison: 'Prêts à partir : les relances dues et les premiers mails écrits d’affilée depuis Aujourd’hui, et les brouillons gardés sur cet appareil (proposition R3).',
    cree: '2026-10-20', retrait: '2027-03-31', ouvert: false
  }),
  Object.freeze({
    id: 'semaine', lot: 'R4', nom: 'ma semaine',
    raison: 'Ma semaine : un objectif de mails le lundi, qui se remplit seul, et la revue du vendredi, partagée au groupe d’un geste (proposition R4).',
    cree: '2026-10-20', retrait: '2027-03-31', ouvert: false
  }),
  Object.freeze({
    id: 'aide', lot: 'R7', nom: 'ceux qui aident',
    raison: 'Ceux qui aident : « Je peux aider » dans Moi, la piste décrochée qui propose d’aider à son tour, la demande de 20 minutes chez l’ami et le merci qui revient (proposition R7).',
    cree: '2026-10-20', retrait: '2027-03-31', ouvert: false
  }),
  Object.freeze({
    id: 'clavier', lot: 'R8', nom: 'le clavier au poste',
    raison: 'Le clavier au poste : Ctrl K cherche et fait, une lettre par geste du jour écrite dans son bouton, et une rangée de Réglages pour couper les touches d’une lettre (WCAG 2.1.4, proposition R8).',
    cree: '2026-10-20', retrait: '2027-03-31', ouvert: false
  })
]);

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/* six mois au plus entre la naissance et le retrait : le temps d'un lot,
   de sa préversion et de la version qui retire l'ancien chemin */
export const DUREE_MAX_JOURS = 183;

const jours = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

/* ce qui ne va pas dans un drapeau, en mots ; [] s'il est bon */
export function defauts(d){
  const f = [];
  if (!d || typeof d !== 'object') return ['pas un drapeau'];
  if (!/^[a-z][a-z0-9-]*$/.test(d.id || '')) f.push('id');
  if (!/^R\d+$/.test(d.lot || '')) f.push('lot');
  if (!String(d.nom || '').trim()) f.push('nom');
  if (!String(d.raison || '').trim()) f.push('raison');
  if (!ISO.test(d.cree || '') || isNaN(Date.parse(d.cree))) f.push('cree');
  if (!ISO.test(d.retrait || '') || isNaN(Date.parse(d.retrait))) f.push('retrait');
  else if (!f.includes('cree')){
    const n = jours(d.cree, d.retrait);
    if (n <= 0) f.push('retrait avant la naissance');
    else if (n > DUREE_MAX_JOURS) f.push('retrait trop loin');
  }
  if (typeof d.ouvert !== 'boolean') f.push('ouvert');
  return f;
}

/* les drapeaux dont la date de retrait est passée — ?test les refuse */
export function perimes(liste, jourISO){
  return (liste || []).filter(d => ISO.test(d.retrait || '') && d.retrait < jourISO);
}

/* ce qui s'allume : un lot ouvert pour tous, ou un lot en test sur un
   appareil en préversion. Un id inconnu est ÉTEINT — jamais une
   exception : un écran qui demande un drapeau retiré retombe sur
   l'ancien chemin, qui est celui de tout le monde. */
export function actif(liste, id, preversion){
  const d = (liste || []).find(x => x.id === id);
  if (!d) return false;
  return d.ouvert || !!preversion;
}

/* ce que la préversion allume aujourd'hui (les lots pas encore ouverts) ;
   vide → la ligne « Préversion » n'a rien à faire et ne s'affiche pas */
export function enTest(liste){
  return (liste || []).filter(d => !d.ouvert);
}

/* la valeur stockée : '1' allumée, rien sinon. Une valeur inconnue est
   éteinte — la préversion ne s'allume jamais par accident. */
export const lirePreversion = raw => raw === '1';
export const ecrirePreversion = on => (on ? '1' : null);
