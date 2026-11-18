/* ============================================================
   OpenContact · la nouvelle interface · les relais
   (docs/refonte-reprendre.md §8 ; repris de ui/reseau.js, sans rien
   de l'ancienne interface)

   Une boîte aux lettres et des groupes, sans serveur à nous (§10) :
   tout passe par des relais Nostr publics, les MÊMES que l'app actuelle
   (`oc_relays_v1`, sinon `RELAIS_DEFAUT`). Ce fichier ne sait que
   parler aux relais : publier un événement, lire ce qui attend sous une
   étiquette, écouter tant qu'une conversation est ouverte. Ce qui est
   scellé, et pour qui, se décide ailleurs (engine/boite.js,
   engine/groupe.js).

   Une lettre est partie si UN relais a répondu `OK true` : la seule
   preuve qu'un relais garde (CLAUDE.md §8, « un relais qui répond
   n'est pas un relais qui relaie »).
   ============================================================ */
import { RELAIS_DEFAUT } from '../engine/transport.js';
import { kvGet, RELAYS_KEY } from '../engine/storage.js';
import { LETTRE_KIND } from '../engine/boite.js';

const lib = () => import('../assets/vendor/trystero-nostr.min.js');

async function relais(){
  try {
    const urls = JSON.parse(await kvGet(RELAYS_KEY) || 'null');
    if (Array.isArray(urls) && urls.length) return urls;
  } catch (e) {}
  return RELAIS_DEFAUT;
}
function connexion(url, ms = 8000){
  return new Promise(res => {
    let ws;
    const t = setTimeout(() => { try { ws && ws.close(); } catch (e) {} res(null); }, ms);
    try { ws = new WebSocket(url); } catch (e) { clearTimeout(t); res(null); return; }
    ws.onerror = () => {};
    ws.onopen = () => { clearTimeout(t); res(ws); };
  });
}

/* une lettre part sur chaque relais ; rend combien l'ont prise */
export async function publier(ev){
  const urls = await relais();
  const oks = await Promise.all(urls.map(async url => {
    const ws = await connexion(url);
    if (!ws) return false;
    return new Promise(res => {
      const t = setTimeout(() => { try { ws.close(); } catch (e) {} res(false); }, 6000);
      ws.onmessage = m => {
        let d; try { d = JSON.parse(m.data); } catch (e) { return; }
        if (d[0] === 'OK' && d[1] === ev.id){ clearTimeout(t); try { ws.close(); } catch (e) {} res(d[2] === true); }
      };
      ws.send(JSON.stringify(['EVENT', ev]));
    });
  }));
  return oks.filter(Boolean).length;
}

/* `lus` : combien de relais ont répondu jusqu'au bout. Zéro, et la relève
   n'a rien appris : elle ne compte pas comme faite. */
export async function lire(filtre){
  const urls = await relais();
  const vus = new Map();
  let lus = 0;
  await Promise.all(urls.map(async url => {
    const ws = await connexion(url);
    if (!ws) return;
    await new Promise(res => {
      const t = setTimeout(() => { try { ws.close(); } catch (e) {} res(); }, 8000);
      ws.onmessage = m => {
        let d; try { d = JSON.parse(m.data); } catch (e) { return; }
        if (d[0] === 'EVENT' && d[1] === 'boite' && d[2] && d[2].id) vus.set(d[2].id, d[2]);
        if (d[0] === 'EOSE' && d[1] === 'boite'){ lus++; clearTimeout(t); try { ws.close(); } catch (e) {} res(); }
      };
      ws.send(JSON.stringify(['REQ', 'boite', filtre]));
    });
  }));
  return { evs: [...vus.values()], lus };
}

/* ÉCOUTER tant qu'une conversation est ouverte : un abonnement qui reste
   ouvert sur chaque relais, et qui rend chaque événement neuf dès qu'il
   passe. Rend de quoi l'arrêter. Un relais qui tombe se tait : la relève
   suivante rattrape ce qu'il a manqué. */
export function ecouter(filtre, surEvenement){
  const ouverts = [];
  let fini = false;
  const vus = new Set();
  relais().then(urls => urls.forEach(async url => {
    const ws = await connexion(url);
    if (!ws) return;
    if (fini){ try { ws.close(); } catch (e) {} return; }
    ouverts.push(ws);
    ws.onmessage = m => {
      let d; try { d = JSON.parse(m.data); } catch (e) { return; }
      if (d[0] === 'EVENT' && d[1] === 'ecoute' && d[2] && d[2].id && !vus.has(d[2].id)){
        vus.add(d[2].id);
        surEvenement(d[2]);
      }
    };
    ws.send(JSON.stringify(['REQ', 'ecoute', filtre]));
  }));
  return () => { fini = true; ouverts.forEach(ws => { try { ws.close(); } catch (e) {} }); };
}

/* un événement signé, prêt à publier : l'étiquette, l'expiration, le scellé */
export async function evenement(tags, contenu){
  const { relayTopic } = await lib();
  return relayTopic.evenement(LETTRE_KIND, tags, contenu);
}
