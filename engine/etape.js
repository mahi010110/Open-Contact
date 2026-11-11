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
import { silentPistes, aDemarrer, derniereTrace, dueFollowups, SILENCE_RELANCE } from './assist.js';
import { prendCeQueJeCherche, PREND_MOT } from './model.js';
import { scoreOf } from './score.js';
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
    /* une raison, la plus forte, et elle se lit sur la ligne : quelqu'un
       qui peut te porter d'abord (40 contre 3) ; sinon ce qui l'a fait
       monter — « prend des alternants », le mot du profil */
    const recherche = o.profile && o.profile.recherche;
    const raison = qui ? qui.prenom + ' ' + qui.court
      : prendCeQueJeCherche(c, recherche) === true ? PREND_MOT[recherche] || '' : '';
    if (qui && !joignable)
      return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Demander à ' + qui.prenom,
        raison: qui.prenom + ' ' + qui.court, bouton: 'Demander', icone: 'message-text', action: 'porteur' };
    if (mail)
      return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Écrire à ' + (prenomDe(mail) || c.name),
        raison, bouton: 'Écrire', icone: 'mail', action: 'mail', ct: mail.id };
    /* pas d'adresse, mais un numéro : la voix est le canal qui reste —
       et celui qui marche le mieux (§8) */
    const tel = (c.contacts || []).find(t => t.phone);
    if (tel)
      return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Appeler ' + (prenomDe(tel) || c.name),
        raison, bouton: 'Appeler', icone: 'phone', action: 'tel', ct: tel.id, tel: tel.phone };
    if (o.peutDemander && !joignable)
      return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Trouver quelqu’un à qui écrire',
        raison, bouton: 'Demander', icone: 'users', action: 'amis' };
    return { ...base, genre: 'demarrer', quand: 'maintenant', titre: 'Trouver à qui écrire',
      raison, bouton: 'Trouver', icone: 'user', action: 'contact' };
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

/* ---------- ce qui s'est passé en dernier ----------
   Le contexte d'une étape, en une ligne : la dernière chose FAITE sur la
   piste (« Email envoyé », « Réponse reçue », « Piste créée »), avec son
   jour. C'est ce qu'il faut savoir pour agir sans ouvrir la fiche. Une
   date posée (« À faire : … ») n'est pas un fait : elle est écartée. */
export function dernierFait(c){
  const h = ((c && c.history) || []).filter(x => x && x.d && x.t && !/^À faire :/.test(x.t));
  if (!h.length) return null;
  let dernier = h[0];
  for (const x of h) if (String(x.d) >= String(dernier.d)) dernier = x;
  return { d: dernier.d, t: String(dernier.t) };
}

/* ---------- le plan est contingent ----------
   « Relancer si pas de réponse » (docs/principes.md, 6). La réponse
   arrive : la relance prévue n'a plus d'objet, elle tombe. Rend `true`
   si elle a été retirée — l'appelant garde de quoi annuler. Une autre
   action prévue (un entretien, un envoi) ne bouge pas. */
export function tomberRelance(c){
  if (!c || !c.nextAction || !/relanc/.test(plier(c.nextActionText || ''))) return false;
  c.nextAction = '';
  c.nextActionText = '';
  delete c.nextActionCt;
  return true;
}

/* ---------- ce qu'il y a à faire, dans l'ordre ----------
   Une seule liste pour « Aujourd'hui » et pour la barre vide, en quatre
   temps :
   · `engage`  — ce que tu as prévu et qui est dû, le plus en retard
                 d'abord (`dueFollowups`), puis la suite d'un contrat
                 décroché. Tout se montre : ce sont tes engagements.
   · `propose` — ce que l'app propose : les pistes qui se taisent, une
                 réponse sans suite, puis de quoi commencer — TROIS au
                 plus, les mieux placées (CLAUDE.md §6, « Choisir à la
                 place de l'utilisateur est le service rendu ») : qui peut
                 te porter, ce qui prend ce que tu cherches, qui l'on
                 peut joindre, la fiche la mieux remplie.
   · `bientot` — ce qui est prévu plus tard, par date.
   · `attente` — ce qui attend une réponse, par date de relance.
   Rend des étapes (`prochaineEtape`), jamais des pistes : l'écran n'a
   rien à recalculer. */
export const DEMARRER_MAX = 3;
export function aFaire(companies, o){
  o = o || {};
  const today = o.today || todayISO();
  const cs = (companies || []).filter(Boolean);
  const par = new Map(cs.map(c => [c.id, c]));
  const etapes = new Map();
  for (const c of cs){
    const e = prochaineEtape(c, { ...o, today });
    if (e) etapes.set(c.id, e);
  }
  const de = genre => [...etapes.values()].filter(e => e.genre === genre);
  const dus = dueFollowups(cs, today).map(x => etapes.get(x.id)).filter(Boolean);
  const muettes = silentPistes(cs, today).map(s => etapes.get(s.id)).filter(e => e && e.genre === 'silence');
  const recherche = o.profile && o.profile.recherche;
  const rangPrend = c => { const v = prendCeQueJeCherche(c, recherche); return v === true ? 2 : v === null ? 1 : 0; };
  const joignable = c => (c.contacts || []).some(t => t.email);
  const porte = c => porteurs(c, o.portes).length > 0;
  const debut = de('demarrer').map(e => ({ e, c: par.get(e.id) })).sort((a, b) =>
      (porte(b.c) - porte(a.c)) || (rangPrend(b.c) - rangPrend(a.c)) || (joignable(b.c) - joignable(a.c))
      || (scoreOf(b.c) - scoreOf(a.c)) || String(a.c.name).localeCompare(String(b.c.name), 'fr'))
    .slice(0, DEMARRER_MAX).map(x => x.e);
  const parDate = (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.nom).localeCompare(String(b.nom), 'fr');
  return {
    engage: [...dus, ...de('contrat')],
    propose: [...muettes, ...de('suite'), ...debut],
    bientot: de('prevu').sort(parDate),
    attente: de('attente').sort(parDate),
    aDemarrer: de('demarrer').length
  };
}

/* ---------- avant un entretien : ce qu'il faut demander ----------
   S'entraîner est couvert partout (simulateurs, questions types) ; se
   préparer à CETTE entreprise ne l'est par personne. Et ce qui fait
   rompre un contrat se demande avant de le signer : 65 % des apprentis
   qui rompent citent l'employeur ou le poste (Dares Analyses n° 63), et
   le taux de rupture monte dans les très petites entreprises. Trois
   questions, pas un cours — c'est une hypothèse que rien n'a encore
   évaluée (reports/Accompagner la recherche de stage.md), d'où trois
   lignes et pas une de plus. */
export const A_DEMANDER = {
  alternance: ['Qui sera ton tuteur', 'Tes missions, concrètement', 'Le rythme école et entreprise'],
  stage: ['Qui t’encadre', 'Tes missions, concrètement', 'Les horaires'],
  emploi: ['Tes missions, concrètement', 'Avec qui tu travailles', 'La période d’essai']
};
export const estEntretien = texte => /entretien|rdv|rendez|visio|entrevue/.test(plier(texte));
export const aDemander = recherche => A_DEMANDER[recherche] || A_DEMANDER.stage;
