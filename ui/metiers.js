/* ============================================================
   OpenContact — interface · TOUS LES MÉTIERS (lot R9-b)
   (docs/propositions/R9-tous-les-metiers.md)

   La table du ROME pèse un demi-mégaoctet : elle ne se lit qu'une fois,
   au calme après le démarrage ou au premier mot tapé — jamais au
   démarrage. Elle vient du cache de l'app (sw.js),
   pas du réseau. Tant qu'elle n'est pas lue, la barre comprend ce
   qu'elle comprenait : rien n'attend.
   ============================================================ */

let index = null, enCours = null;
/* l'index, s'il est prêt ; sinon null */
export const metiersPrets = () => index;
export function chargerMetiers(){
  if (index) return Promise.resolve(index);
  if (enCours) return enCours;
  enCours = Promise.all([import('../engine/metiers-donnees.js'), import('../engine/metiers.js')])
    .then(([d, m]) => (index = m.indexMetiers(d)))
    .catch(() => null)
    .finally(() => { enCours = null; });
  return enCours;
}
