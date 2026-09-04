/* ============================================================
   OpenContact — sonde du transport PUBLIC (incident #14)
   La CI ne doit pas rester verte quand les relais Nostr publics que
   l'application compose sont morts ou muets.

   ELLE SONDAIT LA LISTE D'AVANT L'ÉPINGLAGE. Cette sonde laissait le
   bundle vendorisé faire SA sélection (mélange déterministe par
   appId) — ce qui était juste tant que l'app s'en remettait à lui.
   Depuis, `RELAIS_DEFAUT` en épingle NEUF, et le tirage du bundle
   n'en rendait que cinq : les quatre ajoutés exprès parce qu'ils sont
   les plus fréquentés — damus.io, nos.lol, mostr.pub, purplerelay —
   n'ont jamais été sondés une seule fois. Le commentaire disait
   pourtant « ceux que l'application choisit RÉELLEMENT » : c'était
   vrai avant l'épinglage, l'épinglage l'a rendu faux.
   On lit donc la SOURCE : la liste que l'app compose vraiment. Que
   les neuf soient bien composés est prouvé ailleurs, par
   `e2e-liaison.mjs`, contre un vrai relais local.

   ELLE ACCUSAIT LES RELAIS DE SES PROPRES PANNES DE RÉSEAU. C'est le
   défaut le plus cher qu'une sonde puisse avoir, et il ne se voit que
   le jour où il se déclenche : sans réseau sortant, les neuf
   échouaient tous de la même façon, et le rapport rendait
   « ÉPINGLÉS MUETS — à remplacer dans RELAIS_DEFAUT » suivi des NEUF.
   Quelqu'un qui suit le conseil remplace neuf relais en bonne santé.
   Mesuré ici même : TCP et TLS ouvrent jusqu'à `relay.damus.io`, mais
   la WebSocket passe par un mandataire qui rend 403 — 0/9, et pas un
   seul relais en cause. La sonde tourne dans la CI à chaque poussée
   ET deux fois par semaine sans personne devant : elle doit savoir
   dire « je n'ai pas pu mesurer ».

   Elle sait maintenant, grâce à DEUX contrôles qui répondent chacun à
   une question différente, et sans une dépendance de plus :

   ① UN RELAIS LOCAL, sondé par la MÊME fonction (`relais-local.mjs`,
     un vrai NIP-01 écrit à la main). Il répond à : « ma sonde
     sait-elle encore reconnaître un relais sain ? » Si ce contrôle
     échoue, c'est l'instrument qui est cassé, pas le monde — et
     nommer un seul relais public serait un mensonge. C'est la règle
     du dépôt : la sonde passe par le même chemin que la mesure,
     sinon elle ne prouve rien.
   ② UNE CONNEXION TCP NUE vers chaque relais qui a échoué. Elle
     répond à : « le chemin est-il coupé au socket, ou plus haut ? »
     Les relais se servent ainsi de contrôle les uns aux autres —
     aucun tiers à ajouter, aucune adresse de plus à maintenir.

   Pour chaque relais choisi : connexion WebSocket réelle, REQ
   NIP-01, attente d'un EOSE. Moins de 2 relais sains = échec.
   Ne sonde pas le WebRTC (impossible sans deux réseaux réels) —
   la chaîne complète est couverte par e2e-liaison.mjs en local.
   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1
   (le poste de dev peut être derrière un proxy qui bloque wss).
   ============================================================ */
import net from 'node:net';
import { pathToFileURL } from 'node:url';
import { startLocalRelay } from './relais-local.mjs';

const RealWebSocket = globalThis.WebSocket;

/* 2. sonde réelle : connexion + REQ → EOSE.
   `ouvert` DISTINGUE les deux moitiés du chemin : une WebSocket qui ne
   s'ouvre jamais et un relais qui s'ouvre puis se tait ne sont pas la
   même panne, et c'est précisément ce que l'ancienne version
   confondait — les deux sortaient en « connexion ». */
export const sonde = url => new Promise(res => {
  let fini = false;
  let ouvert = false;
  let ws = null;
  const bilan = why => {
    if (fini) return;
    fini = true;
    clearTimeout(t);
    if (ws){ ws.onerror = ws.onmessage = ws.onopen = null; try { ws.close(); } catch (e) {} }
    res({ etat: why, ouvert });
  };
  const t = setTimeout(() => bilan(ouvert ? 'muet' : 'connexion'), 10000);
  try { ws = new RealWebSocket(url); } catch (e) { return bilan('connexion'); }
  ws.onerror = () => bilan(ouvert ? 'muet' : 'connexion');
  ws.onopen = () => {
    ouvert = true;
    const subId = 'oc-sonde-' + Math.random().toString(36).slice(2, 10);
    ws.send(JSON.stringify(['REQ', subId, { kinds: [21000], since: Math.floor(Date.now() / 1000), '#x': ['oc-sonde'] }]));
  };
  ws.onmessage = e => {
    try {
      const [type] = JSON.parse(e.data);
      if (type === 'EOSE') bilan('sain');
      else if (type === 'NOTICE' || type === 'CLOSED') bilan('refus');
    } catch (x) {}
  };
});

/* ---- contrôle ② : le socket nu, pour savoir OÙ le chemin est coupé ---- */
export const tcpOuvre = url => new Promise(res => {
  let u;
  try { u = new URL(url); } catch (e) { return res(false); }
  const port = u.port ? +u.port : (u.protocol === 'ws:' ? 80 : 443);
  const s = net.connect({ host: u.hostname, port });
  const fin = ok => { clearTimeout(t); s.removeAllListeners(); try { s.destroy(); } catch (e) {} res(ok); };
  const t = setTimeout(() => fin(false), 6000);
  s.on('connect', () => fin(true));
  s.on('error', () => fin(false));
});

/* ---- contrôle ① : la sonde reconnaît-elle encore un relais sain ? ----
   Rendu : '' si la sonde sait mesurer, sinon la raison de son échec. */
export async function controleLocal(){
  let local = null;
  try {
    local = await startLocalRelay();
    const r = await sonde(local.url);
    if (r.etat !== 'sain')
      return 'le relais LOCAL, qui répond EOSE par construction, est rendu « ' + r.etat + ' »';
    return '';
  } catch (e) {
    return 'le relais local n’a pas démarré — ' + (e && e.message);
  } finally {
    if (local) local.close();
  }
}

/* ---- le relevé : chaque relais, et la COUCHE où le chemin casse ----
   `suspects` = la WebSocket s'est ouverte, donc le relais a répondu au
   moins une fois : ce qui suit est SA faute, et il se nomme.
   `coupes` = elle ne s'est jamais ouverte, et c'est peut-être nous :
   on ne nomme personne à charge. */
export async function relever(relais, dire = () => {}){
  const sains = [], suspects = [], coupes = [];
  for (const url of relais){
    const r = await sonde(url);
    if (r.etat === 'sain'){ sains.push(url); dire('✓ ' + url + ' — sain'); continue; }
    /* la WebSocket ne s'est pas ouverte : est-ce le relais, ou le chemin ? */
    const tcp = r.ouvert ? true : await tcpOuvre(url);
    const dit = !r.ouvert && !tcp ? 'injoignable — même le socket refuse'
              : !r.ouvert ? 'coupé plus haut — le socket ouvre, pas la WebSocket'
              : r.etat;
    (r.ouvert ? suspects : coupes).push(url + ' — ' + dit);
    dire('✗ ' + url + ' — ' + dit);
  }
  return { sains, suspects, coupes };
}

/* LE PLANCHER D'ÉCHEC EST 2, et c'est le minimum RÉEL de l'app : avec
   deux relais sains, deux pairs se trouvent. Il ne monte pas à neuf —
   un relais public tombe pour la nuit sans que le produit soit en
   cause, et une CI qui rougit pour ça finit par ne plus être lue.
   Mais un plancher bas laisse la liste POURRIR en silence : c'est ce
   qui est arrivé à hornetstorage, mort et vert pendant des semaines.
   Les morts sont donc nommés à part, en fin de rapport, là où on les
   voit — et le jour où la liste se dégrade vraiment, c'est ce bloc
   qu'on relit. */
export const PLANCHER = 2;

/* ---- LE VERDICT COLLECTIF, une fonction PURE ----
   Un relais isolé qui ne répond pas est un relais en panne ; NEUF qui
   ne s'ouvrent même pas, c'est la machine qui n'a pas de réseau. Tant
   qu'aucune WebSocket ne s'est ouverte, on n'a mesuré aucun relais —
   et on ne nomme personne.
   Elle est pure exprès : c'est la branche qui ne se déclenche QUE le
   jour où le réseau tombe, donc celle qui pourrirait sans qu'on le
   voie. `e2e-sonde-relais.mjs` l'exerce à chaque passage de la suite. */
export function verdict({ sains, suspects, coupes, total }){
  const lignes = [`\n${sains.length}/${total} relais épinglés répondent (NIP-01).`];
  if (!sains.length && !suspects.length)
    return { code: 1, mesure: false, lignes: [...lignes,
      '\nRIEN N’A PU ÊTRE MESURÉ : pas une seule WebSocket ne s’est ouverte, sur '
      + total + ' relais. Le contrôle local vient pourtant de passer, donc la sonde '
      + 'fonctionne : c’est le réseau sortant de cette machine qui manque — mandataire, '
      + 'pare-feu, ou wss filtré.'
      + '\n  CE RELEVÉ NE DIT RIEN SUR LES RELAIS. Ne remplace aucune adresse de '
      + 'RELAIS_DEFAUT sur la foi de ce rapport : rejoue-le depuis un réseau ouvert.'] };

  if (suspects.length)
    lignes.push('\nÉPINGLÉS MUETS — à remplacer dans RELAIS_DEFAUT (engine/transport.js) :',
      ...suspects.map(m => '  · ' + m));
  if (coupes.length)
    lignes.push('\nNON MESURÉS depuis cette machine — le chemin est coupé avant le relais, '
      + 'ils ne sont accusés de rien :', ...coupes.map(m => '  · ' + m));
  if (sains.length < PLANCHER)
    return { code: 1, mesure: true, lignes: [...lignes,
      '\nTRANSPORT PUBLIC DÉGRADÉ : moins de ' + PLANCHER + ' relais sains — le partage '
      + 'en groupe et la sync ne peuvent pas trouver de pair en conditions réelles (#14).'] };
  return { code: 0, mesure: true, lignes };
}

/* ---- lancée en script : c'est la CI qui parle au monde réel ---- */
async function principal(){
  if (process.env.OC_SONDE_RELAIS !== '1'){
    console.log('↷ sonde sautée — OC_SONDE_RELAIS=1 pour sonder les relais publics (CI).');
    return 0;
  }
  /* la liste que l'app compose vraiment — lue à sa source */
  const { RELAIS_DEFAUT } = await import('../../engine/transport.js');
  const relais = [...new Set(RELAIS_DEFAUT)];
  if (!relais.length){ console.error('RELAIS_DEFAUT est vide — la sonde ne sonde rien.'); return 1; }
  console.log('relais épinglés par l’app : ' + relais.length);

  const casse = await controleLocal();
  if (casse){
    console.error('\nSONDE CASSÉE : ' + casse + '. L’instrument ne sait plus reconnaître un '
      + 'relais sain — ce qu’il dirait des relais publics ne vaudrait rien. Rien n’est prouvé '
      + 'sur eux, ne touche pas à RELAIS_DEFAUT.');
    return 1;
  }
  console.log('contrôle : un relais local est bien vu « sain » — la sonde sait mesurer ✓');

  const r = await relever(relais, m => console.log(m));
  const v = verdict({ ...r, total: relais.length });
  for (const l of v.lignes) (v.code ? console.error : console.log)(l);
  return v.code;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href)
  process.exit(await principal());
