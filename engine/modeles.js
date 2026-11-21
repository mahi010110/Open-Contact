/* ============================================================
   OpenContact — moteur · « Mes messages types » (la refonte, lot 4)

   Trois messages portent toute la recherche : la candidature, la
   relance, le remerciement. Ils vivent dans le profil (`templates`) et se
   reconnaissent à leur NOM de départ — c'est ainsi que le composeur de
   Pistes les retrouve. Ici : lequel est lequel, ce qui le distingue de
   l'original, ce que l'app y remplace (en mots, jamais une syntaxe à
   deviner), et comment revenir au modèle d'origine.

   Un modèle qu'on retire du profil (l'ancienne interface le permettait)
   ne casse rien : le composeur retombe sur celui d'origine, et le premier
   changement le remet dans le profil. Les autres modèles du profil, ceux
   que l'on a ajoutés, ne sont jamais touchés (invariant ②).

   Fonctions pures — aucun accès au DOM, aucun état.
   ============================================================ */
import { defaultTemplates } from './model.js';
import { uid } from './utils.js';

export const MODELES = Object.freeze([
  Object.freeze({ k: 'premier', nom: 'Candidature spontanée', mot: 'Candidature' }),
  Object.freeze({ k: 'relance', nom: 'Relance', mot: 'Relance' }),
  Object.freeze({ k: 'merci', nom: 'Remerciement après entretien', mot: 'Remerciement' })
]);
const modeleDeCle = k => MODELES.find(m => m.k === k) || null;

/* le modèle d'origine, tel que l'app le livre (jamais le même objet deux
   fois : `defaultTemplates` en fabrique de neufs) */
export function originalDe(k){
  const m = modeleDeCle(k);
  return m ? defaultTemplates().find(t => t.name === m.nom) || null : null;
}
/* celui du profil, sinon l'original : le composeur et l'écran lisent la
   même chose */
export function modeleDe(profile, k){
  const m = modeleDeCle(k);
  if (!m) return null;
  const l = (profile && Array.isArray(profile.templates)) ? profile.templates : [];
  return l.find(t => t && t.name === m.nom) || originalDe(k);
}
/* modifié = différent de l'original, objet ou message ; un modèle absent
   du profil n'est pas « modifié » : c'est l'original qui sert */
export function modeleModifie(profile, k){
  const m = modeleDeCle(k), o = originalDe(k);
  const l = (profile && Array.isArray(profile.templates)) ? profile.templates : [];
  const t = m && l.find(x => x && x.name === m.nom);
  return !!(t && o && (t.subject !== o.subject || t.body !== o.body));
}
export const nombreModifies = profile => MODELES.filter(m => modeleModifie(profile, m.k)).length;

/* la nouvelle liste de modèles du profil, SANS rien muter : le modèle
   change de texte, ou entre dans la liste s'il n'y était pas. L'objet est
   d'une seule ligne. */
export function poserModele(profile, k, { subject, body }){
  const m = modeleDeCle(k);
  const l = (profile && Array.isArray(profile.templates)) ? profile.templates.slice() : [];
  if (!m) return l;
  const objet = String(subject == null ? '' : subject).replace(/\s*[\r\n]+\s*/g, ' ');
  const corps = String(body == null ? '' : body);
  const i = l.findIndex(t => t && t.name === m.nom);
  if (i >= 0) l[i] = { ...l[i], subject: objet, body: corps };
  else l.push({ id: uid(), name: m.nom, subject: objet, body: corps });
  return l;
}
export function retablirModele(profile, k){
  const o = originalDe(k);
  return o ? poserModele(profile, k, { subject: o.subject, body: o.body }) : ((profile && profile.templates) || []).slice();
}

/* ce que l'app remplace, en mots. Seuls les jetons que l'écran peut
   expliquer sont listés ; un jeton inconnu reste du texte, comme dans le
   mail. Le lien LinkedIn / portfolio n'y est pas : aucun écran ne le
   demande (CONTRAT.md §3 garde la donnée, `fillTpl` la remplit encore). */
export const JETONS = Object.freeze({
  contact: 'la personne, ou « Madame, Monsieur »',
  entreprise: 'l’entreprise',
  ville: 'la ville de l’entreprise',
  type: 'stage ou alternance',
  formation: 'ta formation',
  recherche: 'ce que tu cherches, avec tes dates',
  rythme: 'ton rythme, pour une alternance',
  parcours: 'ton parcours',
  cv: 'le lien vers ton CV',
  via: 'l’ami qui te recommande',
  offre: 'le poste de l’offre, si tu l’as collée',
  date: 'le jour de ton premier message',
  moi: 'ton nom',
  ecole: 'ton école',
  tel: 'ton téléphone',
  email: 'ton e-mail'
});
/* les jetons qu'un modèle emploie vraiment, dans l'ordre où il les dit,
   chacun une fois */
export function jetonsDe(modele){
  const texte = String((modele && modele.subject) || '') + '\n' + String((modele && modele.body) || '');
  const vus = [];
  for (const m of texte.matchAll(/\{\{(\w+)\}\}/g))
    if (Object.hasOwn(JETONS, m[1]) && !vus.includes(m[1])) vus.push(m[1]);
  return vus.map(j => ({ jeton: j, sens: JETONS[j] }));
}
