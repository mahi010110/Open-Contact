/* ============================================================
   OpenContact — les formations qu'on choisit d'un tap
   (docs/brief-refonte.md, lot 1 : la question « Tu étudies »)

   Le premier jour, Trouver pose trois questions, et la deuxième se
   répond d'un tap : les formations du public de l'app (BTS SIO, BUT
   informatique). Chacune dit le MÉTIER qu'elle vise — c'est lui qui
   choisit les entreprises de la liste et qui écrit « colle à ta
   formation » — et le mot que la recherche en retient
   (« Systèmes et réseaux »).

   Une table, pas une devinette : ce que le texte libre comprend déjà
   (`metierDuProfil`, engine/requete.js) reste la règle pour toute
   autre formation. La table ne fait qu'ajouter ce que le texte ne lit
   pas (« BUT R&T ») et garder ce qu'il refuse exprès : un BUT
   informatique ne dit aucun métier, parce qu'on y fait aussi bien du
   développement que du réseau.

   Fonctions pures, sans dépendance : engine/requete.js les lit.
   ============================================================ */

export const FORMATIONS = Object.freeze([
  Object.freeze({ nom: 'BTS SIO SISR', metier: 'reseau', mot: 'Systèmes et réseaux',
    aussi: Object.freeze(['bts sio option sisr', 'bts sisr', 'sisr']) }),
  Object.freeze({ nom: 'BTS SIO SLAM', metier: 'dev', mot: 'Développement',
    aussi: Object.freeze(['bts sio option slam', 'bts slam', 'slam']) }),
  Object.freeze({ nom: 'BUT Informatique', metier: '', mot: '',
    aussi: Object.freeze(['but info']) }),
  Object.freeze({ nom: 'BUT R&T', metier: 'reseau', mot: 'Réseaux et télécoms',
    aussi: Object.freeze(['but rt', 'but r et t', 'but reseaux et telecoms', 'but reseaux et telecommunications']) })
]);

/* la forme qu'on compare : sans accents ni casse, « & » gardé (R&T),
   les espaces resserrés */
const plat = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9&]+/g, ' ').trim();

/* La formation de la table que ce texte désigne, ou `null` : le nom
   exact (casse et accents mis à part) ou une de ses autres écritures.
   Jamais un morceau : « BTS SIO » seul ne dit pas l'option. */
export function formationConnue(texte){
  const k = plat(texte);
  if (!k) return null;
  return FORMATIONS.find(f => plat(f.nom) === k || f.aussi.includes(k)) || null;
}
