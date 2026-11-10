/* ============================================================
   OpenContact — moteur · la prochaine étape, et où en est la recherche
   (la refonte — « l'app fait le travail », fiche 0014)

   « Je fais quoi maintenant ? » (CLAUDE.md §1) avait trois réponses
   selon l'écran : une action datée sur « Aujourd'hui », trois icônes
   muettes à côté, « Aucune — Planifier » sur la fiche. La refonte n'en
   veut qu'UNE par piste, la même partout : un titre qui dit quoi faire,
   et un seul bouton, nommé, qui le fait.

   L'ordre est celui du parcours, de la fin vers le début :
     1. un contrat décroché dont la suite n'est pas finie (`contrat.js`) ;
     2. une action prévue, due aujourd'hui ou en retard ;
     3. une piste engagée qui se tait depuis sept jours (`silentPistes`) ;
     4. une réponse reçue, et rien de prévu ;
     5. une piste jamais commencée : demander à qui y est passé, écrire à
        qui l'on peut joindre, sinon trouver à qui écrire ;
     6. une action prévue plus tard, ou une attente : rien à faire, et
        l'app le dit au lieu de se taire.

   Le bouton vient du VERBE de l'action (« Relancer Claire » → Relancer,
   qui ouvre le mail ; « Entretien à 14 h » → Préparer, qui ouvre la
   page). Une table, pas une IA. Ce qu'elle ne reconnaît pas reste une
   case à cocher : « Fait ».

   Fonctions pures : l'écran demande, le moteur répond.
   ============================================================ */
import { fold } from './filter.js';
import { silentPistes, aDemarrer, derniereTrace, SILENCE_RELANCE } from './assist.js';
import { suiteDe } from './contrat.js';
import { aQuiEcrire, plusJours, prenomDe } from './commande.js';
import { porteurs } from './requete.js';
import { todayISO } from './utils.js';

const plier = s => fold(s);

/* le geste que dit le texte d'une action — ou rien */
export function gesteDuTexte(c, texte){
  const t = plier(texte);
  const mail = aQuiEcrire(c);
  if (/relanc/.test(t)) return mail ? { bouton: 'Relancer', icone: 'mail', action: 'mail', ct: mail.id } : null;
  if (/entretien|rdv|rendez|visio|entrevue/.test(t)) return { bouton: 'Préparer', icone: 'book-open', action: 'fiche' };
  if (/appel|telephon/.test(t)){
    const p = (c.contacts || []).find(x => x.phone);
    return p ? { bouton: 'Appeler', icone: 'phone', action: 'tel', ct: p.id, tel: p.phone } : null;
  }
  if (/ecri|envoy|candidat|postul|mail|repond|remerci/.test(t) && mail)
    return { bouton: 'Écrire', icone: 'mail', action: 'mail', ct: mail.id };
  return null;
}

/* `o` : { today, portes, profile, peutDemander }
   — `portes` : ce que le parcours de tes amis dit de tes pistes
     (`portesAmis`), pour savoir qui peut te porter ;
   — `peutDemander` : l'écran sait s'il reste un ami ou un groupe à qui
     demander (le moteur ne lit pas la boîte aux lettres).
   Rend `null` pour une piste qui n'a plus d'étape (refusée, rangée,
   décrochée et finie). */
export function prochaineEtape(c, o){
  o = o || {};
  if (!c) return null;
  const today = o.today || todayISO();
  const base = { id: c.id, nom: c.name };

  /* 1 · le contrat */
  if (c.closedReason){
    const s = suiteDe(c, o.profile);
    if (!s || s.finie) return null;
    return { ...base, genre: 'contrat', quand: 'maintenant', titre: s.prochaine.label, note: s.prochaine.note || '',
      etape: s.prochaine.id, bouton: 'Fait', icone: 'check', action: 'cocher',
      sous: 'Décroché · étape ' + (s.faites + 1) + ' sur ' + s.etapes.length };
  }

  /* 2 · ce qui est prévu */
  if (c.nextAction){
    const titre = c.nextActionText || 'Faire le point';
    if (c.nextAction > today)
      return { ...base, genre: 'prevu', quand: 'bientot', titre, date: c.nextAction, bouton: '', action: 'fiche' };
    const g = gesteDuTexte(c, titre) || { bouton: 'Fait', icone: 'check', action: 'fait' };
    return { ...base, genre: c.nextAction < today ? 'retard' : 'jour', quand: 'maintenant', titre, date: c.nextAction, ...g };
  }

  /* 5 · jamais commencée */
  if (aDemarrer(c)){
    const qui = porteurs(c, o.portes)[0];
    const mail = aQuiEcrire(c);
    const joignable = (c.contacts || []).some(t => t.email || t.phone || t.link);
    if (qui && !joignable)
      return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Demander à ' + qui.prenom,
        raison: qui.prenom + ' ' + qui.court, bouton: 'Demander', icone: 'message-text', action: 'porteur' };
    if (mail)
      return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Écrire à ' + (prenomDe(mail) || c.name),
        raison: qui ? qui.prenom + ' ' + qui.court : '', bouton: 'Écrire', icone: 'mail', action: 'mail', ct: mail.id };
    if (o.peutDemander && !joignable)
      return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Trouver quelqu’un à qui écrire',
        bouton: 'Demander', icone: 'users', action: 'amis' };
    return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Trouver à qui écrire',
      bouton: 'Trouver', icone: 'user', action: 'contact' };
  }

  /* 3 · le silence */
  const sil = silentPistes([c], today)[0];
  if (sil){
    const mail = aQuiEcrire(c);
    const derniere = sil.cran !== 'soon';
    return { ...base, genre: 'silence', quand: 'maintenant', silence: { jours: sil.jours, cran: sil.cran },
      titre: derniere ? 'Relancer une dernière fois' : 'Relancer' + (mail && prenomDe(mail) ? ' ' + prenomDe(mail) : ''),
      ...(mail ? { bouton: 'Relancer', icone: 'mail', action: 'mail', ct: mail.id }
               : { bouton: 'Planifier', icone: 'calendar', action: 'quand' }) };
  }

  /* 4 · une réponse, et rien de prévu */
  if (c.status === 'reply')
    return { ...base, genre: 'suite', quand: 'maintenant', titre: 'Prévoir la suite',
      bouton: 'Planifier', icone: 'calendar', action: 'quand' };

  /* 6 · en attente : la relance viendra, et l'app dit quand */
  const depuis = derniereTrace(c, today);
  return { ...base, genre: 'attente', quand: 'attente', titre: 'En attente de réponse',
    date: plusJours(today, Math.max(1, SILENCE_RELANCE - depuis)), bouton: '', action: 'fiche' };
}

/* ---------- où en est la recherche ----------
   Les quatre états d'une piste, dans l'ordre du parcours, avec leur
   compte : c'est la recherche entière en une ligne. Chaque case porte la
   recherche qui la montre dans « Mes pistes » — un nombre est une
   promesse, l'arrivée montre ce nombre-là (CLAUDE.md §5, promesse 5).
   Les mots sont ceux des statuts : rien de neuf à apprendre.
   `ici` : la case la plus avancée qui n'est pas vide. */
export function parcours(companies){
  const cs = (companies || []).filter(c => c && !c.demo);
  const ouvertes = cs.filter(c => !c.closedReason);
  const cases = [
    { id: 'todo', label: 'À contacter', q: 'à contacter', n: ouvertes.filter(c => (c.status || 'todo') === 'todo').length },
    { id: 'active', label: 'En cours', q: 'en cours', n: ouvertes.filter(c => c.status === 'active').length },
    { id: 'reply', label: 'Réponse', q: 'réponse', n: ouvertes.filter(c => c.status === 'reply').length },
    { id: 'won', label: 'Décroché', q: 'décroché', n: cs.filter(c => c.closedReason === 'won').length }
  ];
  let ici = -1;
  cases.forEach((k, i) => { if (k.n) ici = i; });
  return cases.map((k, i) => ({ ...k, ici: i === ici }));
}
