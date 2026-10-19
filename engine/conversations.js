/* ============================================================
   OpenContact — moteur · la boîte « Échanger »
   (retour du mainteneur, 13 octobre 2026 : « une boîte de réception, le
   suivi des nouveaux messages dans les groupes, les conversations comme
   Discord — faire exactement comme les messageries traditionnelles »)

   Les groupes et les amis vivaient à trois endroits : les groupes dans
   « Échanger », les amis sous « Pistes › Amis », les nouveautés dans
   « Aujourd'hui ». Ce fichier en fait UNE liste, celle de toutes les
   messageries : la conversation la plus récente en haut, les épinglées
   avant tout, ce qui n'est pas lu compté, ce dont on a coupé le son
   laissé hors du chiffre de l'onglet.

   Il ne lit ni le réseau ni l'écran : l'interface lui tend, pour chaque
   conversation, son nom, son dernier message et ce qui n'est pas lu
   (ui/conversations.js). Il tient aussi les préférences que l'on règle
   sur une conversation (oc_fils_v1) : épingler, couper le son.
   ============================================================ */

/* une conversation se désigne par sa sorte et son identifiant : le
   CODE d'un groupe (un secret — la clé de stockage est scellée), ou
   l'identifiant d'un ami */
export const cleFil = (sorte, id) => (sorte === 'groupe' ? 'g:' : 'a:') + id;
const CLE = /^[ga]:[A-Za-z0-9_-]{4,64}$/;

/* au-delà, une épingle ne sert plus à rien : tout serait en haut */
export const EPINGLES_MAX = 5;
export const MUETS_MAX = 50;

export const prefsVides = () => ({ v: 1, epingles: [], muets: [] });
const liste = (a, max) => [...new Set((Array.isArray(a) ? a : []).filter(x => typeof x === 'string' && CLE.test(x)))].slice(0, max);
export function normaliserPrefs(o){
  const p = o && typeof o === 'object' ? o : {};
  return { v: 1, epingles: liste(p.epingles, EPINGLES_MAX), muets: liste(p.muets, MUETS_MAX) };
}
export const estEpingle = (p, cle) => p.epingles.includes(cle);
export const estMuet = (p, cle) => p.muets.includes(cle);
/* épingler en haut de la pile : la plus récente épinglée passe devant ;
   à la sixième, la plus ancienne retombe dans la liste */
export function basculerEpingle(p, cle){
  if (!CLE.test(String(cle || ''))) return p;
  if (estEpingle(p, cle)) return { ...p, epingles: p.epingles.filter(x => x !== cle) };
  return { ...p, epingles: [cle, ...p.epingles].slice(0, EPINGLES_MAX) };
}
export function basculerMuet(p, cle){
  if (!CLE.test(String(cle || ''))) return p;
  return { ...p, muets: estMuet(p, cle) ? p.muets.filter(x => x !== cle) : [cle, ...p.muets].slice(0, MUETS_MAX) };
}
/* un groupe qui change de code (un membre retiré, une nouvelle
   invitation) garde son épingle et son silence */
export function renommerFil(p, ancienne, nouvelle){
  if (!CLE.test(String(nouvelle || ''))) return p;
  const r = a => a.map(x => x === ancienne ? nouvelle : x);
  return { ...p, epingles: r(p.epingles), muets: r(p.muets) };
}
/* un groupe quitté, un ami retiré : ce qu'on avait réglé part avec */
export function oublierFil(p, cle){
  return { ...p, epingles: p.epingles.filter(x => x !== cle), muets: p.muets.filter(x => x !== cle) };
}

/* LA LISTE. Chaque fil arrive résumé par l'interface :
     { cle, sorte: 'groupe'|'ami', nom, at, apercu, n, attente }
   `at` = le moment de la dernière activité (le dernier message, ou
   l'entrée dans le groupe s'il n'y en a pas) ; `n` = ce qui n'est pas
   lu ; `cite` = parmi ce qui n'est pas lu, ce qui me nomme (lot F2) ; `attente` = un groupe où l'on a demandé à entrer, pas encore
   ouvert. Ordre : les épinglées, dans l'ordre où on les a épinglées,
   puis toutes les autres de la plus récente à la plus ancienne. */
export function boite(fils, prefs = prefsVides()){
  const rangs = (Array.isArray(fils) ? fils : []).filter(f => f && CLE.test(String(f.cle || '')))
    .map(f => ({ ...f, n: Math.max(0, Number(f.n) || 0), cite: Math.max(0, Number(f.cite) || 0), at: Number(f.at) || 0,
                 epingle: estEpingle(prefs, f.cle), muet: estMuet(prefs, f.cle) }));
  const ep = prefs.epingles.map(c => rangs.find(r => r.cle === c)).filter(Boolean);
  const autres = rangs.filter(r => !r.epingle).sort((a, b) => b.at - a.at || String(a.nom).localeCompare(String(b.nom), 'fr'));
  return [...ep, ...autres];
}

/* LES FILTRES de WhatsApp — Tout, Non lus, Groupes, Amis. Ils ne
   s'offrent qu'à partir de quatre conversations : trois lignes se lisent
   d'un coup d'œil. C'est une liste FERMÉE : un filtre qui ne montrerait
   rien reste à sa place, éteint (§6, « Proposer un filtre ») — la rangée
   ne change pas de forme sous le doigt quand on lit un message. */
export const FILTRES = ['tout', 'nonlus', 'groupes', 'amis'];
export function filtrer(rangs, f){
  if (f === 'nonlus') return rangs.filter(r => r.n > 0);
  if (f === 'groupes') return rangs.filter(r => r.sorte === 'groupe');
  if (f === 'amis') return rangs.filter(r => r.sorte === 'ami');
  return rangs;
}
export const filtresUtiles = rangs => rangs.length < 4 ? [] : FILTRES;
export const filtreVide = (rangs, f) => f !== 'tout' && !filtrer(rangs, f).length;

/* LE CHIFFRE DE L'ONGLET : les CONVERSATIONS qui attendent, pas les
   messages — trois messages de Karim sont une seule chose à faire. Une
   conversation dont on a coupé le son n'y entre pas : c'est à ça que sert
   de le couper (PatternFly : un compte qui ne descend jamais à zéro
   devient un papier peint). SAUF quand on m'y nomme (lot F2) :
   « @Karim » perce le silence, comme sur Slack, Discord ou WhatsApp —
   couper le son d'un groupe, c'est ne plus suivre sa conversation, pas
   ne plus entendre qu'on m'appelle. */
export const aLire = rangs => rangs.filter(r => r.n > 0 && (!r.muet || r.cite > 0)).length;
export const chiffreOnglet = n => !n ? '' : n > 99 ? '99+' : String(n);

/* OUVRIR LÀ OÙ L'ON S'ÉTAIT ARRÊTÉ (Slack, Discord) : le premier
   message qui n'est pas de moi et qui est arrivé après ma dernière
   visite. -1 : rien de neuf. */
export function premierNonLu(items, vu, estDeMoi){
  const v = Number(vu) || 0;
  return (Array.isArray(items) ? items : []).findIndex(x => x && Number(x.at) > v && !estDeMoi(x));
}
