/* ============================================================
   OpenContact — le registre des destinations
   (docs/recadrage.md, décision 0002)

   Les écrans qu'un onglet ouvre, leur titre, et les ANCIENNES
   adresses. Le recadrage déplace des écrans (« Échanger » devient
   « Réseau ») ; une adresse déjà donnée — un favori, un lien collé
   dans la conversation de la classe, l'écran d'accueil d'un
   téléphone — doit toujours mener quelque part : à son nouvel
   emplacement, jamais à un écran par défaut qui ferait croire que
   l'app a perdu quelque chose.

   Fonctions pures : app.js lit l'adresse, le registre dit où aller.
   ============================================================ */

/* toutes les destinations connues ; `titre` suit `document.title`.
   « Réseau » (R1, décision 0002) prend la place d'« Échanger » : l'une
   OU l'autre est présente, selon le lot (`navigation`, plus bas). */
export const DESTINATIONS = Object.freeze([
  Object.freeze({ id: 'aujourdhui', titre: 'Aujourd’hui' }),
  Object.freeze({ id: 'pistes', titre: 'Mes pistes' }),
  Object.freeze({ id: 'echanger', titre: 'Échanger' }),
  Object.freeze({ id: 'reseau', titre: 'Réseau' }),
  Object.freeze({ id: 'moi', titre: 'Moi' })
]);
export const ACCUEIL = 'aujourdhui';

/* La barre selon le lot « reseau » : les destinations présentes, dans
   l'ordre de la barre, et l'ancienne adresse dans les DEUX sens — une
   adresse donnée depuis un appareil en préversion (`#/reseau`) mène à
   « Échanger » sur un appareil qui ne l'est pas, et l'inverse. */
export function navigation(reseau){
  return reseau
    ? { ids: ['aujourdhui', 'pistes', 'reseau', 'moi'], alias: { echanger: 'reseau' } }
    : { ids: ['aujourdhui', 'pistes', 'echanger', 'moi'], alias: { reseau: 'echanger' } };
}
/* `#/pistes`, `#pistes`, `#/pistes/` désignent la même route ; ce qui
   suit la route (`?…`) ne la change pas */
export function routeDe(hash){
  return String(hash || '').replace(/^#\/?/, '').replace(/[/?].*$/, '').toLowerCase();
}

/* Où mène une adresse.
   `ids` : les destinations présentes ; `alias` : { ancienne: nouvelle }.
   Rend `{ id, ancienne }` — `ancienne` est vrai quand l'adresse a été
   redirigée, pour que l'écran puisse réécrire la barre d'adresse.
   Un alias suit sa chaîne (deux déménagements successifs), mais une
   boucle s'arrête : on ne tourne jamais en rond, on retombe sur l'accueil. */
export function destination(hash, { ids = navigation(false).ids, alias = {} } = {}){
  let r = routeDe(hash);
  const vus = new Set();
  let ancienne = false;
  while (!ids.includes(r) && Object.prototype.hasOwnProperty.call(alias, r) && !vus.has(r)){
    vus.add(r);
    r = alias[r];
    ancienne = true;
  }
  if (!ids.includes(r)) return { id: ACCUEIL, ancienne: false };
  return { id: r, ancienne };
}

export function titreDe(id, liste = DESTINATIONS){
  const d = liste.find(x => x.id === id);
  return d ? d.titre : '';
}
