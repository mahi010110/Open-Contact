/* ============================================================
   OpenContact · la nouvelle interface · la phrase de secours
   (docs/refonte-reprendre.md §8 ; repris de ui/moi-phrase.js, sans rien
   de l'ancienne interface : mêmes clés, même copie déposée)

   Une phrase de douze mots, et trois choses qu'elle fait :
   · elle se crée dans « Moi › Ma copie » ;
   · tant qu'elle existe, la copie se DÉPOSE toute seule sur les relais,
     scellée, à l'ouverture et quand elle a changé (engine/moi.js) —
     sans phrase, rien ne part ;
   · sur un téléphone neuf, les douze mots ramènent ce qui a été déposé
     (« Restaurer une copie › Avec ma phrase de secours »), après un
     aperçu et avec un « Annuler » (invariant ②).
   L'appareil garde les CLÉS tirées de la phrase, jamais la phrase
   (`oc_moi_v1`).

   Ce fichier ne sait que la mécanique ; l'écran vit dans copie.js. Le
   coffre du code de verrouillage (verrou.js) s'ouvre par la MÊME phrase :
   une seule phrase pour tout, comme dans l'app actuelle.
   ============================================================ */
import { MOI_KEY, SYNC_KEY, kvGet, kvSet } from '../engine/storage.js';
import { fullPayload } from '../engine/exchange.js';
import { clesDe, clesValides, defautPhrase, semaineDe, etiquetteSemaine, cleSemaine, posteSemaine, nouvelAppareil,
         sceller, ouvrirScelle, decouper, evenementsDepot, rassembler, fusionnerCopies, fautDeposer, empreinte,
         MOI_KIND, SEMAINES_LUES } from '../engine/moi.js';
import { phraseUnknownWords } from '../engine/vault.js';
import { S } from './etat.js';
import { publierLot, lire } from './relais.js';

const lib = () => import('../assets/vendor/trystero-nostr.min.js');

/* ---------- l'état de cet appareil ---------- */
let etat = null;          /* { v, cles, appareil, depot: { at, empreinte, relais, n } } */
let charge = null;
export function chargerMoi(){
  return charge || (charge = kvGet(MOI_KEY).then(v => {
    const o = JSON.parse(v || 'null');
    etat = o && clesValides(o.cles) && typeof o.appareil === 'string' ? o : null;
  }).catch(() => { etat = null; charge = null; }));
}
const sauver = () => kvSet(MOI_KEY, JSON.stringify(etat)).catch(() => {});
const prevenir = () => document.dispatchEvent(new CustomEvent('oc:moi'));
export const aUnePhrase = () => !!etat;
export const depotAt = () => (etat && etat.depot && etat.depot.at) || 0;
/* ce que l'écran en dit : { existe, trop, depot: { at, relais } | null } */
export const etatPhrase = () => ({ existe: !!etat, trop: !!(etat && etat.trop),
  depot: etat && etat.depot ? { at: etat.depot.at, relais: etat.depot.relais } : null });

/* ---------- ce qui cloche dans une phrase tapée ----------
   La même phrase d'erreur partout où l'on tape ses douze mots (restaurer,
   l'écran verrouillé, le code qu'on choisit), sous le champ, la saisie
   gardée. Le premier mot inconnu passe avant le compte : une faute
   colle souvent deux mots ensemble. */
export function erreurPhrase(v){
  const d = defautPhrase(v);
  if (d === 'vide') return 'Tape les douze mots de ta phrase.';
  if (d === 'mot') return `« ${phraseUnknownWords(v)[0]} » n’est pas dans la liste des mots. Vérifie l’orthographe.`;
  if (d === 'nombre') return `Il faut les douze mots : tu en as ${String(v).trim().split(/\s+/).length}.`;
  return '';
}
/* ces douze mots sont-ils la phrase de cet appareil ? (on compare les
   clés qu'on en tire : la phrase, elle, n'est gardée nulle part) */
export async function estMaPhrase(phrase){
  await chargerMoi();
  if (!etat) return false;
  try { return (await clesDe(phrase)).scelle === etat.cles.scelle; } catch (e) { return false; }
}

/* ---------- adopter une phrase ----------
   Une phrase qui CHANGE efface ce que cet appareil avait déposé sous
   l'ancienne : « Changer de phrase » rend l'ancienne inutile (la parade à
   une phrase lue). */
export async function adopterPhrase(phrase, cles){
  await chargerMoi();
  cles = cles || await clesDe(phrase);
  const ancien = etat;
  if (ancien && ancien.cles.scelle === cles.scelle){ deposer(true); return; }
  etat = { v: 1, cles, appareil: (ancien && ancien.appareil) || nouvelAppareil(), depot: null };
  await sauver();
  prevenir();
  if (ancien) effacerDepots(ancien).catch(() => {});
  deposer(true);
}

/* ---------- déposer ---------- */
async function contenu(){
  const c = fullPayload(S.companies, S.profile, S.orphans, S.tombs);
  c.appareil = etat.appareil;
  /* la liaison de mes appareils voyage DANS le scellé : les douze mots
     ramènent aussi le lien, sans phrase de liaison à retaper */
  const liaison = await kvGet(SYNC_KEY).catch(() => '');
  if (liaison) c.liaison = liaison;
  return c;
}
const idDepot = () => nouvelAppareil();
let enCours = null;
export function deposer(force){
  if (!etat) return Promise.resolve(false);
  if (enCours) return enCours;
  const e0 = etat;
  enCours = (async () => {
    const now = Date.now();
    const c = await contenu();
    const emp = await empreinte(c);
    if (!force && !fautDeposer(e0.depot, emp, now)) return false;
    const morceaux = decouper(await sceller(e0.cles, c), idDepot());
    if (!morceaux){
      /* au-delà de 64 morceaux, la copie ne se dépose pas : le fichier
         de copie reste le chemin, et l'écran le dit */
      if (!e0.trop){ e0.trop = true; await sauver(); prevenir(); }
      return false;
    }
    const sem = semaineDe(now);
    const sk = await cleSemaine(e0.cles, sem);
    const eti = await etiquetteSemaine(e0.cles, sem);
    const poste = await posteSemaine(e0.cles, e0.appareil, sem);
    const { relayTopic } = await lib();
    const evs = [];
    for (const e of evenementsDepot(eti, poste, morceaux, now))
      evs.push(await relayTopic.evenementCle(sk, e.kind, e.tags, e.contenu));
    const n = await publierLot(evs);
    if (!n || etat !== e0) return false;
    e0.depot = { at: now, empreinte: emp, relais: n, n: Math.max(morceaux.length, (e0.depot && e0.depot.n) || 0) };
    delete e0.trop;
    await sauver();
    prevenir();
    return true;
  })().catch(() => false).finally(() => { enCours = null; });
  return enCours;
}
/* ce que cet appareil avait déposé sous une ANCIENNE phrase : remplacé
   par du vide (NIP-33) et demandé à l'effacement (NIP-09), semaine par
   semaine. Au mieux : un relais qui ne fait ni l'un ni l'autre l'oublie
   à l'expiration. */
async function effacerDepots(ancien){
  const { relayTopic } = await lib();
  const now = Date.now(), s0 = semaineDe(now);
  const n = Math.max(1, (ancien.depot && ancien.depot.n) || 1);
  const exp = String(Math.floor(now / 1000) + 86400);
  const evs = [];
  for (let i = 0; i < SEMAINES_LUES; i++){
    const sk = await cleSemaine(ancien.cles, s0 - i);
    const eti = await etiquetteSemaine(ancien.cles, s0 - i);
    const poste = await posteSemaine(ancien.cles, ancien.appareil, s0 - i);
    const pub = relayTopic.clePublique(sk);
    const ds = [...Array(n).keys()].map(j => eti + '.' + poste + '.' + j);
    for (const d of ds) evs.push(await relayTopic.evenementCle(sk, MOI_KIND, [['d', d], ['x', eti], ['expiration', exp]], ''));
    evs.push(await relayTopic.evenementCle(sk, 5, ds.map(d => ['a', MOI_KIND + ':' + pub + ':' + d]), ''));
  }
  await publierLot(evs);
}

/* ---------- au fil des ouvertures ----------
   Une tentative à l'ouverture, au retour sur l'app, en la quittant, et
   tous les quarts d'heure tant qu'elle est à l'écran. `fautDeposer`
   décide : rien ne part si rien n'a changé dans la semaine. */
let derniere = 0;
const tenter = () => {
  if (!etat || Date.now() - derniere < 60000) return;
  derniere = Date.now();
  deposer();
};
let demarre = false;
export function demarrerMoi(){
  if (demarre) return;
  demarre = true;
  chargerMoi().then(tenter);
  document.addEventListener('visibilitychange', tenter);
  setInterval(() => { if (document.visibilityState === 'visible') tenter(); }, 15 * 60000);
}

/* ---------- retrouver ----------
   Les douze mots tapés → les clés → ce qui a été déposé sur les relais
   ces neuf dernières semaines. `lus` : combien de relais ont répondu
   jusqu'au bout — zéro, et « rien trouvé » ne veut rien dire. */
export async function chercherCopie(cles){
  const { relayTopic } = await lib();
  const s0 = semaineDe(Date.now());
  const auteurs = [], xs = [];
  for (let i = 0; i < SEMAINES_LUES; i++){
    auteurs.push(relayTopic.clePublique(await cleSemaine(cles, s0 - i)));
    xs.push(await etiquetteSemaine(cles, s0 - i));
  }
  const { evs, lus } = await lire({ kinds: [MOI_KIND], authors: auteurs, '#x': xs });
  const siens = new Set(auteurs);
  const ouverts = [];
  for (const d of rassembler(evs.filter(e => siens.has(e.pubkey)))){
    try { ouverts.push({ at: d.at, obj: await ouvrirScelle(cles, d.texte) }); } catch (e) {}
  }
  return { copie: fusionnerCopies(ouverts), lus };
}
