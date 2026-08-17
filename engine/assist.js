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
/* ---------- les pistes SANS NOUVELLES ----------
   Le trou mesuré : une piste qu'on a contactée, qui n'a jamais répondu
   et à qui on n'a pas donné de prochaine action, disparaît. Elle
   n'apparaît nulle part sur « Aujourd'hui », et dans « Mes pistes » elle
   affiche « à planifier » — le même mot qu'elle dorme depuis cinq jours
   ou depuis trois mois. L'app tient pourtant la date : elle la jetait.

   DEUX PRÉCAUTIONS, et elles font tout le dessin.

   ① Seules les pistes ENGAGÉES comptent. Une piste jamais contactée
   (`todo`) n'est pas en train de filer entre les doigts : elle n'a pas
   commencé, et « Par où commencer » s'en occupe. Traiter les deux
   pareil noierait le vrai signal sous vingt-quatre lignes.

   ② Le silence n'est pas une DETTE, c'est une DÉCISION. Une pile de
   retards qui rougit et ne décroît jamais est ce qui fait abandonner
   les outils de suivi — et la spec dit déjà « jamais culpabilisant ».
   D'où le troisième cran : passé ~45 jours, la littérature sur la
   relance ne dit plus « relance encore », elle dit « passe à autre
   chose ». L'app doit donc proposer la SORTIE, pas une troisième
   relance. C'est ce qui empêche la pile de grandir.

   Les seuils viennent des données, pas du goût : on relance après
   5 à 7 jours OUVRÉS (≈ 7 à 10 jours calendaires), une deuxième fois
   une à deux semaines plus tard, et on s'arrête là.
     < 7 j   → rien. Trop tôt : harceler ici ferait fuir.
     7–20 j  → `soon`  — c'est le moment de la première relance
     21–44 j → `now`   — deuxième et dernière relance
     ≥ 45 j  → `late`  — relancer ne paie plus : clore, ou décider de
                         garder en connaissance de cause. */
export const SILENCE_RELANCE = 7;
export const SILENCE_DERNIERE = 21;
export const SILENCE_TROP_TARD = 45;

/* la dernière trace d'activité : l'entrée d'historique la plus récente,
   sinon `updatedAt`. On ne prend pas `updatedAt` seul — corriger une
   faute dans le nom d'une piste le remet à jour et effacerait trois
   semaines de silence. */
export function derniereTrace(c, today){
  const hist = (c.history || []).map(h => h && h.d).filter(Boolean).sort();
  const jour = hist.length ? hist[hist.length - 1]
    : (c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0, 10) : null);
  if (!jour || jour > today) return 0;
  return daysBetween(jour, today);
}

export function silentPistes(companies, today){
  const out = [];
  for (const c of (companies || [])){
    if (c.closedReason || c.nextAction) continue;
    if (!c.status || c.status === 'todo') continue;      /* ① jamais engagée */
    const jours = derniereTrace(c, today);
    if (jours < SILENCE_RELANCE) continue;               /* trop tôt pour dire quoi que ce soit */
    const cran = jours >= SILENCE_TROP_TARD ? 'late'
               : jours >= SILENCE_DERNIERE ? 'now' : 'soon';
    out.push({ id: c.id, name: c.name, jours, cran, status: c.status,
      /* passé le dernier seuil, le geste utile n'est plus « relancer » */
      geste: cran === 'late' ? 'clore' : 'relancer' });
  }
  /* le plus silencieux d'abord ; à égalité, celui qui avait répondu —
     laisser filer une piste qui t'a répondu coûte plus cher que tout */
  const poids = s => (s === 'reply' ? 2 : 1);
  out.sort((a, b) => (b.jours - a.jours) || (poids(b.status) - poids(a.status))
                  || String(a.name).localeCompare(String(b.name), 'fr'));
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
/* `i` = la place de l'entrée dans le journal. Une ligne d'échange est
   dérivée (un texte analysé), pas stockée : sans cet indice, la ligne
   qu'on voit ne sait pas désigner l'entrée qui l'a produite — et on ne
   peut donc pas la supprimer. */
export function exchangeLog(journal, limit = 8){
  const out = [];
  let i = -1;
  for (const e of (journal || [])){
    i++;
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
    if (m){ out.push({ i, t, sens: 'donne', canal: m[1], n: +m[2], qui: '', ids }); continue; }
    m = RE_RECU.exec(txt);
    if (m){
      const qui = m[1] ? '' : m[2];                       /* « du groupe » = anonyme */
      out.push({ i, t, sens: 'recu', canal: '', n: +m[3], ids,
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

/* ============================================================
   CE QUI NE CIRCULE PAS ENCORE

   « Échanger » racontait ce qui a circulé : un classeur, qui répond
   à « qu'est-ce qui s'est passé ? ». Or le produit dit de lui-même
   qu'il est un outil de MOTIVATION ET D'ACTION, et cet onglet existe
   à cause d'un seul chiffre — une candidature à froid décroche un
   entretien dans ~3 % des cas, portée par quelqu'un qui est dedans
   dans ~40 %. Un rapport de 40 pour 1, dont l'écran ne faisait rien.

   Ces deux lectures ne demandent AUCUNE donnée nouvelle : le journal
   note déjà quelles pistes sont entrées, de qui, et lesquelles sont
   sorties (`logJ(..., ids)`). Tout est là depuis le début, personne
   ne le relisait.
   ============================================================ */

/* ---------- ① ce qu'on t'a donné et que tu n'as pas touché ----------
   Le cas le plus cher du produit : un camarade te tend douze pistes,
   elles atterrissent dans « Mes pistes » indifférenciées, et elles y
   dorment. Le 40:1 est là, intact, inutilisé.
   Le seuil réutilise `SILENCE_RELANCE` — sept jours — plutôt que d'en
   inventer un second : sous une semaine ce n'est pas de la négligence,
   c'est le délai normal entre recevoir et s'y mettre. Un chiffre de
   moins à défendre, et le même mot dans toute l'app.
   `qui` vient du PREMIER don : c'est celui qui te l'a mise dans les
   mains, et c'est à lui que tu peux revenir en parler. */
export function recuesDormantes(companies, journal, today){
  const venue = new Map();
  for (const x of exchangeLog(journal, 0)){
    if (x.sens !== 'recu' || !x.t) continue;
    const jour = new Date(x.t).toISOString().slice(0, 10);
    for (const id of x.ids){
      const dejaVu = venue.get(id);
      if (!dejaVu || jour < dejaVu.jour) venue.set(id, { jour, qui: x.qui || '' });
    }
  }
  const out = [];
  for (const c of (companies || [])){
    if (!c || c.demo || c.closedReason) continue;
    /* « pas touchée » au sens strict : jamais engagée ET rien de prévu.
       Une piste qu'on a contactée puis laissée filer est déjà couverte
       par `silentPistes` — deux tranches pour le même objet noieraient
       le signal (§6 : une seule tranche de suggestion à la fois). */
    if (c.status !== 'todo' || c.nextAction) continue;
    const v = venue.get(c.id);
    if (!v || v.jour > today) continue;
    const jours = daysBetween(v.jour, today);
    if (jours < SILENCE_RELANCE) continue;
    /* les MÊMES crans que le silence : l'app n'a qu'un seul langage
       d'urgence (§6), et en ouvrir un second pour ce cas-ci obligerait
       à réapprendre à lire une couleur d'un écran à l'autre */
    const cran = jours >= SILENCE_TROP_TARD ? 'late'
               : jours >= SILENCE_DERNIERE ? 'now' : 'soon';
    out.push({ id: c.id, name: c.name, qui: v.qui, jours, cran,
      city: c.city || '', contacts: (c.contacts || []).length,
      joignable: (c.contacts || []).some(t => t && t.email) });
  }
  /* L'ORDRE EST CELUI DE « Par où commencer », et pour la même raison :
     choisir à la place de l'utilisateur est le service rendu. Douze
     pistes reçues, c'est douze décisions avant le premier geste — et le
     premier geste n'arrive jamais.
     Le critère du 40:1 (quelqu'un peut la porter) est déjà satisfait
     par TOUTES : elles ont été données. Ce qui les départage ensuite est
     donc ce à quoi on peut écrire tout de suite, puis les mieux
     remplies. L'ancienneté ne vient qu'après : douze pistes arrivées le
     même jour ont toutes le même âge, il ne trie rien. */
  out.sort((a, b) => (b.joignable - a.joignable)
                  || (b.contacts - a.contacts)
                  || (b.jours - a.jours)
                  || String(a.name).localeCompare(String(b.name), 'fr'));
  return out;
}

/* ---------- ② les tiennes que le groupe n'a jamais vues ----------
   L'autre sens du même échange. Volontairement SECOND : tant qu'on n'a
   jamais donné, le grand bouton « Donner » dit déjà tout, et lister
   vingt-quatre pistes « jamais données » à quelqu'un qui vient
   d'arriver n'est pas un conseil, c'est un inventaire. La fonction rend
   donc une liste vide tant qu'aucun don n'a eu lieu : c'est l'appelant
   qui choisit d'afficher, mais le moteur ne fabrique pas un reproche
   pour un geste que l'utilisateur ne connaît pas encore. */
export function jamaisDonnees(companies, journal){
  const sorties = new Set();
  let aDejaDonne = false;
  for (const x of exchangeLog(journal, 0)){
    if (x.sens !== 'donne') continue;
    aDejaDonne = true;
    for (const id of x.ids) sorties.add(id);
  }
  if (!aDejaDonne) return [];
  return (companies || [])
    .filter(c => c && !c.demo && !c.closedReason && !sorties.has(c.id))
    .map(c => ({ id: c.id, name: c.name, city: c.city || '',
      status: c.status, updatedAt: c.updatedAt || 0 }))
    /* la plus récente d'abord : c'est celle que le groupe n'a pas
       encore vue passer, et celle qu'on a le plus en tête */
    .sort((a, b) => (b.updatedAt - a.updatedAt)
                 || String(a.name).localeCompare(String(b.name), 'fr'));
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
