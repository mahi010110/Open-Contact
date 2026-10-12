/* ============================================================
   Demander « quelqu'un dans la cybersécurité à Lille » (docs/reseau.md,
   lot 4b, décision 19)

   Une demande à ses amis vise une entreprise — ou un MÉTIER et une VILLE.
   Elle ne porte alors que des clés de la table de l'app : le métier de
   la barre (engine/requete.js, METIER) et le nom d'une ville de la table
   (engine/lieux.js). Jamais un mot tapé, jamais une ville lue dans mes
   pistes (un lieu-dit peut dire où j'habite) : ce qui ne vient pas de la
   table ne part pas, et ce qui arrive est revalidé ici.

   Module sans dépendance au reste du moteur : la boîte aux lettres
   l'importe pour valider une lettre, la barre pour la construire.
   ============================================================ */
import { VILLES } from './lieux.js';

/* la phrase de chaque métier — les clés sont celles de METIER */
export const CRITERE_METIER = {
  cyber: 'dans la cybersécurité', cloud: 'dans le cloud', esn: 'dans une ESN',
  dsi: 'dans une grande entreprise', public: 'dans le secteur public', startup: 'dans une startup',
  industrie: 'dans l’industrie', commerce: 'dans le commerce', sante: 'dans la santé',
  dev: 'dans le développement', reseau: 'dans le réseau', support: 'dans le support', data: 'dans la data'
};
const NOMS = new Set(VILLES.map(v => v.nom));
export const villeDeTable = nom => typeof nom === 'string' && NOMS.has(nom);

export function critereValide(o){
  if (!o || typeof o !== 'object') return null;
  const c = {};
  if (typeof o.metier === 'string' && Object.prototype.hasOwnProperty.call(CRITERE_METIER, o.metier)) c.metier = o.metier;
  if (villeDeTable(o.ville)) c.ville = o.ville;
  return c.metier || c.ville ? c : null;
}
/* « à Lille », « au Havre », « aux Ulis » */
const aVille = nom => /^Le /.test(nom) ? 'au ' + nom.slice(3)
  : /^Les /.test(nom) ? 'aux ' + nom.slice(4) : 'à ' + nom;
export function phraseCritere(c){
  const v = critereValide(c);
  if (!v) return '';
  return [v.metier && CRITERE_METIER[v.metier], v.ville && aVille(v.ville)].filter(Boolean).join(' ');
}
