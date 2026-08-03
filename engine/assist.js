/* ============================================================
   OpenContact — moteur · aides (sans IA d'abord)
   Le socle marche sans aucune IA : priorisation locale des
   relances dues, et extraction d'un contact depuis une signature
   d'email collée (heuristique, aucune donnée qui sort). Quand une
   IA est branchée, elle ne fait que PROPOSER un brouillon dans le
   composeur — jamais un envoi (P6-2, côté UI).
   Fonctions pures, aucun accès au DOM ni au réseau.
   ============================================================ */

/* ---------- les verbes qu'on propose pour la prochaine action ----------
   Le geste le plus répété de l'app — « Fait ✓ → et ensuite ? » — obligeait
   à TAPER au clavier sur un téléphone, alors que la date, elle, avait ses
   raccourcis. Sans rien saisir, l'action devenait « Faire le point » :
   une semaine plus tard, l'étudiant lit ça et ne sait plus ce qu'il
   voulait dire.

   L'ORDRE EST LE CONTRAT : le premier est le plus probable, c'est lui que
   l'interface pose d'office dans le champ — l'utilisateur n'a donc rien à
   lire ni à choisir, il lit et tape une date. Les suivants ne s'offrent
   que s'il vient toucher le champ (liste native). Le texte libre reste
   maître : ces verbes proposent, ils n'enferment pas. */
const VERBES = {
  todo:   ['Envoyer la candidature', 'Trouver un contact', 'Appeler'],
  active: ['Relancer', 'Appeler', 'Repasser sur place'],
  reply:  ['Répondre', 'Préparer l’entretien', 'Envoyer le CV']
};
export function nextActionSuggestions(c){
  const base = VERBES[(c && c.status) || 'todo'] || VERBES.todo;
  /* ne jamais proposer le libellé DÉJÀ posé : le tap ne changerait rien
     (règle : un filtre qui ne peut rien filtrer coûte un tap) */
  const dejaLa = String((c && c.nextActionText) || '').trim().toLowerCase();
  return base.filter(v => v.toLowerCase() !== dejaLa);
}

/* ---------- priorisation locale des relances ----------
   Une piste « à relancer » = une prochaine action datée aujourd'hui
   ou passée. On classe par retard (le plus en retard d'abord), puis
   par avancement (une piste déjà relancée prime : ne pas la lâcher). */
export function dueFollowups(companies, today){
  const out = [];
  for (const c of (companies || [])){
    if (c.closedReason || !c.nextAction) continue;
    if (c.nextAction > today) continue;
    const lateDays = daysBetween(c.nextAction, today);
    const touches = (c.history || []).filter(h => /envoyé|relance|préparé/i.test(h.t)).length;
    out.push({ id: c.id, name: c.name, when: c.nextAction, lateDays,
      verb: c.nextActionText || 'Faire le point', touches });
  }
  out.sort((a, b) => (b.lateDays - a.lateDays) || (b.touches - a.touches));
  return out;
}
/* ---------- le fil des échanges, relu dans le journal ----------
   « Échanger » ne montrait que deux portes : aucune donnée de
   l'utilisateur, donc rien à comprendre d'un regard. Ce qu'il a déjà
   donné et reçu est pourtant écrit dans son journal privé depuis
   toujours. On le relit ici plutôt que d'ajouter un champ au journal :
   un nouveau format ne ferait apparaître que les échanges d'APRÈS la
   mise à jour, et l'historique existant resterait invisible.
   Le prix de ce choix, c'est que les libellés de logJ deviennent un
   contrat : ils sont verrouillés par les tests, et le jour où l'un
   d'eux change de phrase, ça casse ici, bruyamment.
   « Reçu (analyse IA triée) » n'est PAS un échange avec la promo :
   la forme « Reçu de … » l'exclut par construction. */
const RE_DONNE = /^Donné \(([^)]+)\)\s*:\s*(\d+)\s*piste/;
/* « du groupe » aujourd'hui, « de la promo » hier : le journal garde des
   entrées écrites avant le changement de mot, et elles doivent rester
   lisibles — un renommage à l'écran ne réécrit pas l'histoire. Les deux
   formes désignent le même anonyme, d'où la même sortie. */
const RE_RECU  = /^Reçu (?:du (groupe)|de (la promo|.+?))\s*:\s*\+(\d+)\s*piste/;
export function exchangeLog(journal, limit = 8){
  const out = [];
  for (const e of (journal || [])){
    const txt = e && typeof e.txt === 'string' ? e.txt : '';
    /* un journal peut revenir d'une sauvegarde ou d'un autre appareil :
       un horodatage absent ou abîmé vaut 0, jamais NaN — sinon l'écran
       afficherait « NaN-NaN-NaN » au lieu d'une date. L'échange, lui,
       reste compté : ce qui a circulé a circulé. */
    const t = Number.isFinite(+(e && e.t)) ? +e.t : 0;
    /* Les pistes de l'échange, quand l'entrée les porte. Un journal
       écrit avant que ce champ existe — ou revenu d'une sauvegarde —
       n'en a pas : la ligne reste lisible, elle ne s'ouvre juste pas. */
    const ids = Array.isArray(e && e.ids) ? e.ids.filter(x => typeof x === 'string' && x) : [];
    let m = RE_DONNE.exec(txt);
    if (m){ out.push({ t, sens: 'donne', canal: m[1], n: +m[2], qui: '', ids }); continue; }
    m = RE_RECU.exec(txt);
    if (m){
      const qui = m[1] ? '' : m[2];                       /* « du groupe » = anonyme */
      out.push({ t, sens: 'recu', canal: '', n: +m[3], ids,
        qui: qui === 'la promo' ? '' : qui });            /* ancienne forme, même sens */
    }
  }
  out.sort((a, b) => (b.t || 0) - (a.t || 0));
  return limit > 0 ? out.slice(0, limit) : out;
}
/* ce qui a circulé en tout — le compte que l'écran affiche en tête */
export function exchangeTotals(journal){
  const all = exchangeLog(journal, 0);
  return {
    donne: all.filter(x => x.sens === 'donne').reduce((s, x) => s + x.n, 0),
    recu: all.filter(x => x.sens === 'recu').reduce((s, x) => s + x.n, 0),
    n: all.length
  };
}

function daysBetween(a, b){
  const d1 = Date.UTC(...a.split('-').map((n, i) => i === 1 ? +n - 1 : +n));
  const d2 = Date.UTC(...b.split('-').map((n, i) => i === 1 ? +n - 1 : +n));
  return Math.round((d2 - d1) / 86400000);
}

/* ---------- signature → contact (heuristique locale) ----------
   Colle une signature d'email : on en tire nom, rôle, email,
   téléphone, lien — tout ce qui est reconnaissable, sans jamais
   inventer. Rien ne part sur le réseau. */
const RE_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const RE_PHONE = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?){2,5}\d{2,4}/;
const RE_URL = /\b((?:https?:\/\/|www\.)[^\s<>()]+)/i;
const ROLE_HINT = /\b(RH|DRH|DSI|RSSI|CTO|CEO|DG|responsable|charg[ée]e?|recruteu(?:r|se)|manager|directrice?|ing[ée]nieure?|talent|people|consultante?)\b/i;

export function contactFromSignature(text){
  const raw = String(text || '');
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const out = {};
  const emailM = raw.match(RE_EMAIL);
  if (emailM) out.email = emailM[0].toLowerCase();
  const phoneM = raw.replace(RE_EMAIL, ' ').match(RE_PHONE);
  if (phoneM && phoneM[0].replace(/\D/g, '').length >= 8) out.phone = phoneM[0].replace(/\s+/g, ' ').trim();
  const urlM = raw.match(RE_URL);
  if (urlM) out.link = urlM[1].replace(/[.,;]$/, '');
  /* le nom : une ligne courte « Prénom Nom » sans @, sans chiffres,
     de préférence la première — les signatures commencent par le nom */
  for (const l of lines){
    if (RE_EMAIL.test(l) || /\d/.test(l) || l.length > 48) continue;
    if (/^[A-ZÀ-Ÿ][\wÀ-ÿ'’-]+(?:\s+[A-ZÀ-Ÿ][\wÀ-ÿ'’.-]+){1,3}$/.test(l) && !ROLE_HINT.test(l)){
      out.name = l;
      break;
    }
  }
  /* le rôle : une ligne qui sent la fonction, ou l'entête « — » */
  for (const l of lines){
    if (l === out.name) continue;
    const m = l.match(ROLE_HINT);
    if (m && l.length <= 60){ out.role = l.replace(/^[-–—•·|]\s*/, '').trim(); break; }
  }
  /* dériver un nom de l'email si aucune ligne n'a donné (p.nom@x → P. Nom) */
  if (!out.name && out.email){
    const local = out.email.split('@')[0].replace(/\d+/g, '');
    const parts = local.split(/[._-]+/).filter(p => p.length > 1);
    if (parts.length >= 2)
      out.name = parts.slice(0, 2).map(p => p[0].toUpperCase() + p.slice(1)).join(' ');
  }
  return (out.name || out.email || out.phone) ? out : null;
}
