/* ============================================================
   OpenContact — moteur · un suivi qui se remplit seul (lot R2)
   (docs/propositions/R2-suivi.md, validée le 20 octobre 2026)

   Le suivi demande d'être tenu à la main, et c'est là qu'on abandonne
   les outils de suivi : on cesse de les remplir, puis de les ouvrir.
   Deux moments le montrent, et ce fichier répond aux deux sans une clé
   nouvelle — tout se déduit de ce que l'app tient déjà :

   ① PENDANT la recherche, où l'on en est d'un coup d'œil : combien de
     pistes écrites, combien de réponses, combien de décrochées.
   ② AU RETOUR d'une pause, trois choses à faire, choisies par l'app —
     jamais le compte de ce qui a glissé, jamais les jours manqués. On
     rouvre l'app pour se remettre en route ; on ne doit pas y trouver
     une dette.

   Fonctions pures, aucun accès au DOM ni au réseau.
   ============================================================ */
import { SILENCE_RELANCE, aEcrit } from './assist.js';

/* ---------- ① tes chiffres ----------
   Un entonnoir, donc chaque chiffre contient le suivant : une réponse
   suppose un mail, une piste décrochée suppose une réponse.

   · ÉCRITE : une date de candidature (`appliedAt`, posée par
     « Envoyée ✓ »), ou une piste qui a quitté « À contacter » — qui
     écrit depuis sa propre messagerie a écrit (le même prédicat que les
     premiers pas, pour qu'un mail compte partout pareil).
   · RÉPONSE : le statut « Réponse », ou un passage par lui dans
     l'historique (une piste qui a répondu puis qu'on a reclassée a
     quand même répondu), ou une clôture qui suppose une réponse :
     décrochée ou refusée. Un refus EST une réponse — « ils m'ont dit
     non » n'est pas un silence.
   · DÉCROCHÉE : close en « Décroché ».
   Une piste abandonnée sans un mot ne compte nulle part. Les pistes
   d'exemple non plus : elles montrent l'écran tel qu'il sera. */
const RE_REPONSE = /Statut → Réponse/;
export const aRepondu = c => !!c && (c.status === 'reply'
  || c.closedReason === 'won' || c.closedReason === 'rejected'
  || (c.history || []).some(h => h && RE_REPONSE.test(h.t || '')));
export const aDecroche = c => !!c && c.closedReason === 'won';

export function mesChiffres(companies){
  const cs = (companies || []).filter(c => c && !c.demo);
  return {
    ecrites: cs.filter(aEcrit).length,
    reponses: cs.filter(aRepondu).length,
    decrochees: cs.filter(aDecroche).length
  };
}

/* La ligne, en mots. Rien tant qu'aucune piste n'est écrite : trois
   zéros ne disent rien à qui commence, et l'appelant garde alors le
   compte de pistes. Ensuite, les trois toujours — un entonnoir qui
   perd une marche quand elle vaut zéro ne se lit plus d'un regard, et
   chaque chiffre doit garder sa place d'un jour à l'autre (§6). Le
   zéro s'accorde au singulier, comme on le dit. */
const accorde = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
export function chiffresTexte(ch){
  if (!ch || !ch.ecrites) return '';
  return [accorde(ch.ecrites, 'écrite'), accorde(ch.reponses, 'réponse'),
          accorde(ch.decrochees, 'décrochée')].join(' · ');
}

/* ---------- ② le dernier geste ----------
   « Une pause » se mesure aux GESTES, pas aux visites : l'app n'écrit
   pas quand on l'ouvre, et ne doit pas commencer à le faire. Deux
   traces, prises ensemble :
   · le `updatedAt` des pistes — il ne bouge que sous un geste (écrire,
     planifier, cocher, clore, compléter, accepter une fusion), et il
     voyage avec la synchronisation : un soir passé sur l'ordinateur
     compte aussi sur le téléphone, dont le journal ne sait rien ;
   · les lignes du journal qui NOMMENT une piste (`cid` ou `ids`) —
     donner des pistes, en recevoir, demander quelqu'un. C'est ce qui
     écarte ce qui arrive sans geste : un merci, un ami qui t'ajoute,
     la synchronisation qui se raconte. Aucune de ces lignes ne nomme
     de piste, et aucune liste de phrases n'est à tenir.
   0 = aucune trace : quelqu'un qui n'a jamais rien fait n'est pas en
   pause, il n'a pas commencé. */
export function derniereActivite(companies, journal){
  let t = 0;
  for (const c of (companies || [])){
    if (!c || c.demo) continue;
    const u = Number(c.updatedAt) || 0;
    if (u > t) t = u;
  }
  for (const e of (journal || [])){
    if (!e || !(e.cid || (Array.isArray(e.ids) && e.ids.length))) continue;
    const u = Number(e.t) || 0;
    if (u > t) t = u;
  }
  return t;
}

/* Le seuil est celui de la relance (`SILENCE_RELANCE`, 7 jours) : un
   chiffre de moins à défendre, et le même mot dans toute l'app. Sous
   une semaine, ce n'est pas une pause, c'est la vie entre deux cours. */
export const PAUSE_JOURS = SILENCE_RELANCE;
const JOUR = 864e5;
export function enPause(companies, journal, maintenant = Date.now()){
  const cs = (companies || []).filter(Boolean);
  /* les pistes d'exemple font taire la reprise, comme les premiers pas */
  if (!cs.length || cs.some(c => c.demo)) return false;
  const t = derniereActivite(cs, journal);
  return t > 0 && maintenant - t >= PAUSE_JOURS * JOUR;
}

/* ---------- ③ les trois choses à reprendre ----------
   L'app choisit, dans cet ordre :
   1. ce qui a une date dépassée — ou du jour : une relance d'aujourd'hui
      reste une urgence, seul le chiffre du retard disparaît ;
   2. puis ce qui se tait (une piste engagée, sans suite) ;
   3. puis par où commencer (ce qui n'a jamais démarré).
   L'appelant passe chaque famille DÉJÀ classée — l'ordre de chacune vit
   là où elle est déjà tenue (`dueFollowups`, `silentPistes`, « Par où
   commencer ») — et ce choix ne fait que remplir trois places. Une
   piste ne prend qu'une place. Rien à reprendre = liste vide, et
   l'écran redevient celui de tous les jours. */
export const REPRENDRE = 3;
export function reprendre({ dues = [], muettes = [], debuts = [] } = {}, n = REPRENDRE){
  const out = [], pris = new Set();
  const prendre = (liste, sorte) => {
    for (const x of liste){
      if (out.length >= n) return;
      const id = x && x.id;
      if (!id || pris.has(id)) continue;
      pris.add(id);
      out.push({ sorte, id, item: x });
    }
  };
  prendre(dues, 'action');
  prendre(muettes, 'silence');
  prendre(debuts, 'debut');
  return out;
}
