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
   Pour chaque relais choisi : connexion WebSocket réelle, REQ
   NIP-01, attente d'un EOSE. Moins de 2 relais sains = échec.
   Ne sonde pas le WebRTC (impossible sans deux réseaux réels) —
   la chaîne complète est couverte par e2e-liaison.mjs en local.
   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1
   (le poste de dev peut être derrière un proxy qui bloque wss).
   ============================================================ */
if (process.env.OC_SONDE_RELAIS !== '1'){
  console.log('↷ sonde sautée — OC_SONDE_RELAIS=1 pour sonder les relais publics (CI).');
  process.exit(0);
}

const RealWebSocket = globalThis.WebSocket;

/* 1. la liste que l'app compose vraiment — lue à sa source */
const { RELAIS_DEFAUT } = await import('../../engine/transport.js');
const relais = [...new Set(RELAIS_DEFAUT)];
if (!relais.length){ console.error('RELAIS_DEFAUT est vide — la sonde ne sonde rien.'); process.exit(1); }
console.log('relais épinglés par l’app : ' + relais.length);

/* 2. sonde réelle : connexion + REQ → EOSE */
const sonde = url => new Promise(res => {
  let fini = false;
  let ws = null;
  const bilan = why => {
    if (fini) return;
    fini = true;
    clearTimeout(t);
    if (ws){ ws.onerror = ws.onmessage = ws.onopen = null; try { ws.close(); } catch (e) {} }
    res(why);
  };
  const t = setTimeout(() => bilan('délai'), 10000);
  try { ws = new RealWebSocket(url); } catch (e) { return bilan('connexion'); }
  ws.onerror = () => bilan('connexion');
  ws.onopen = () => {
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

/* LE PLANCHER D'ÉCHEC EST 2, et c'est le minimum RÉEL de l'app : avec
   deux relais sains, deux pairs se trouvent. Il ne monte pas à neuf —
   un relais public tombe pour la nuit sans que le produit soit en
   cause, et une CI qui rougit pour ça finit par ne plus être lue.
   Mais un plancher bas laisse la liste POURRIR en silence : c'est ce
   qui est arrivé à hornetstorage, mort et vert pendant des semaines.
   Les morts sont donc nommés à part, en fin de rapport, là où on les
   voit — et le jour où la liste se dégrade vraiment, c'est ce bloc
   qu'on relit. */
const PLANCHER = 2;
const sains = [], morts = [];
for (const url of relais){
  const r = await sonde(url);
  (r === 'sain' ? sains : morts).push(url + (r === 'sain' ? '' : ' — ' + r));
  console.log((r === 'sain' ? '✓' : '✗') + ' ' + url + ' — ' + r);
}
console.log(`\n${sains.length}/${relais.length} relais épinglés répondent (NIP-01).`);
if (morts.length){
  console.log('\nÉPINGLÉS MUETS — à remplacer dans RELAIS_DEFAUT (engine/transport.js) :');
  for (const m of morts) console.log('  · ' + m);
}
if (sains.length < PLANCHER){
  console.error('\nTRANSPORT PUBLIC DÉGRADÉ : moins de ' + PLANCHER + ' relais sains — le partage ' +
    'en groupe et la sync ne peuvent pas trouver de pair en conditions réelles (#14).');
  process.exit(1);
}
process.exit(0);
