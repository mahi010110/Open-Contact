/* ============================================================
   OpenContact · la nouvelle interface · ce que mes amis ouvrent
   (docs/brief-refonte.md §12, lot 3)

   Un ami est quelqu'un qui t'a DONNÉ son profil : on y lit où il est
   passé. Ce qu'il t'ouvre se lit là où l'on travaille — sur la page
   d'une entreprise (« Karim y est en alternance »), sur une piste (la
   suite propose de lui demander à qui écrire), et la réponse revient
   sur la même piste. Rien ici ne part sur le réseau.
   ============================================================ */
import { portesAmis } from '../engine/amis.js';
import { todayISO } from '../engine/utils.js';
import { S } from './etat.js';
import { amisJoignables, placePourDemander, prenomMoi, demandeDePiste, donPour, suivi, aQui } from './boite.js';

/* les amis passés par une entreprise (une piste, ou une ligne de
   l'annuaire) : le plus fort d'abord — quelqu'un qui y est MAINTENANT */
export function porteurs(e){
  if (!e || !(S.profile.amis || []).length) return [];
  const c = { id: '_', name: e.name || e.nom || '', siren: e.siren || '' };
  return portesAmis([c], S.profile.amis, todayISO()).get('_') || [];
}
/* pour la suite des pistes (engine/suite.js) : par piste, l'ami à qui
   l'on peut demander, et la demande déjà partie */
export function optionsAmis(){
  const portes = new Map(), demandes = new Map();
  const amis = S.profile.amis || [];
  const peut = amis.length && placePourDemander() && !!prenomMoi();
  if (peut){
    const joignables = new Set(amisJoignables().map(a => a.id));
    for (const [id, l] of portesAmis(S.companies, amis, todayISO())){
      const x = l.find(y => joignables.has(y.amiId));
      if (x) portes.set(id, { prenom: x.prenom, court: x.court, amiId: x.amiId });
    }
  }
  for (const c of S.companies){
    const d = demandeDePiste(c.id);
    if (!d) continue;
    const don = donPour(d.id);
    demandes.set(c.id, { a: aQui(d), trouvee: !!suivi(d).etapes[1].at, id: d.id,
      don: don && don.statut === 'nouveau' ? { de: don.de.prenom, nom: don.contact.name, id: don.id, soi: !!don.soi,
        ami: ((S.profile.amis || []).find(a => a.cle && a.cle === don.de.cle) || {}).id || '' } : null });
  }
  return { portes, demandes };
}
