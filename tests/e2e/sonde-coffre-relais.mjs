/* ============================================================
   SONDE — UN RELAIS GARDE-T-IL UNE COPIE SCELLÉE ? (lot R5,
   docs/propositions/R5-un-seul-moi.md, « La première étape : mesurer »)

   « Un seul moi » range sur les relais une copie scellée par la phrase
   de secours, pour la ramener sur un téléphone neuf. Avant d'écrire une
   ligne de cette fonctionnalité, on mesure ce dont elle a BESOIN (la
   leçon de §8, payée trois fois) :
     · TAILLE   — un événement de 8, 32, 64, 128 Ko est-il ACCEPTÉ, puis
                  RELU d'une autre connexion ? Elle dit en combien de
                  morceaux une copie se coupe ;
     · GARDE    — les marqueurs déposés par les passages précédents de la
                  sonde (la CI la joue à chaque poussée, le lundi et le
                  jeudi même sans commit) sont-ils encore là, et depuis
                  combien de jours ? La copie est redéposée à chaque
                  ouverture ; il lui faut sept jours au moins ;
     · REMPLACE — un dépôt « adressable » (NIP-33, kind 30078) remplace-
                  t-il le précédent sous la même étiquette ? Sinon chaque
                  ouverture empilerait une copie de plus.
   Le contenu est du bruit en base64 : rien de lisible, rien qui s'affiche.

   CONTRÔLE OBLIGATOIRE : le relais local en mode `garde` doit rendre
   toutes les tailles ACCEPTÉ + RELU et le remplacement ; un relais qui ne
   garde rien doit rendre « accepté, pas relu ». Sinon la sonde ne
   conclut rien.

   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1.
   ============================================================ */
import { startLocalRelay } from './relais-local.mjs';
import { RELAIS_DEFAUT } from '../../engine/transport.js';
import { relayTopic } from '../../assets/vendor/trystero-nostr.min.js';

const RESEAU = process.env.OC_SONDE_RELAIS === '1';
const ATTENTE_MS = 15000;
const TAILLES_KO = [8, 32, 64, 128];
const KIND = 30078;
const JOURS_RELUS = [1, 2, 3, 4, 7, 10, 14];

const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
/* du bruit base64 de `ko` kilo-octets une fois encodé — tiré par
   tranches : `getRandomValues` refuse plus de 64 Ko d'un coup */
const bruit = ko => {
  const o = new Uint8Array(Math.floor(ko * 1024 * 3 / 4));
  for (let i = 0; i < o.length; i += 65536) crypto.getRandomValues(o.subarray(i, i + 65536));
  return Buffer.from(o).toString('base64');
};
const jour = (decalage = 0) => new Date(Date.now() - decalage * 864e5).toISOString().slice(0, 10);
const marqueur = j => `oc-sonde-coffre-${j}`;

function connecter(url){
  return new Promise(resolve => {
    let ws;
    const fin = setTimeout(() => { try { ws.close(); } catch (e) {} resolve(null); }, ATTENTE_MS);
    try { ws = new WebSocket(url); } catch (e) { clearTimeout(fin); resolve(null); return; }
    const ecoutes = new Set();
    ws.onmessage = m => { let d; try { d = JSON.parse(m.data); } catch (e) { return; } for (const f of ecoutes) f(d); };
    ws.onerror = () => {};
    ws.onopen = () => {
      clearTimeout(fin);
      resolve({
        envoyer: x => ws.send(JSON.stringify(x)),
        attendre: (pred, ms = ATTENTE_MS) => new Promise(r => {
          const f = d => { if (pred(d)){ ecoutes.delete(f); clearTimeout(t); r(d); } };
          const t = setTimeout(() => { ecoutes.delete(f); r(null); }, ms);
          ecoutes.add(f);
        }),
        recueillir: (pred, finPred, ms = ATTENTE_MS) => new Promise(r => {
          const vus = [];
          const f = d => { if (pred(d)) vus.push(d); if (finPred(d)){ ecoutes.delete(f); clearTimeout(t); r(vus); } };
          const t = setTimeout(() => { ecoutes.delete(f); r(vus); }, ms);
          ecoutes.add(f);
        }),
        fermer: () => { try { ws.close(); } catch (e) {} }
      });
    };
  });
}
const publier = async (c, ev) => {
  c.envoyer(['EVENT', ev]);
  const ok = await c.attendre(d => d[0] === 'OK' && d[1] === ev.id);
  return { accepte: !!(ok && ok[2] === true), raison: ok ? String(ok[3] || '') : 'pas de réponse' };
};

async function sonder(url){
  const out = { url, ouvert: false, tailles: {}, remplace: null, jours: [] };
  const a = await connecter(url);
  if (!a) return out;
  out.ouvert = true;
  const sujet = 'oc-sonde-' + hex(8);
  /* le marqueur du jour et le remplacement passent EN PREMIER, sur une
     connexion qui n'a encore rien publié de gros. Relevé le 26 octobre :
     quatre relais refusent 64 Ko (« event too large ») puis COUPENT la
     connexion — tout ce qui suivait se perdait sans réponse, et la garde
     de sept jours n'aurait jamais pu se lire chez eux. */
  await publier(a, await relayTopic.evenement(KIND, [['d', marqueur(jour())], ['x', marqueur(jour())]], bruit(1)));
  const d = `${sujet}-r`;
  const v1 = await relayTopic.evenement(KIND, [['d', d], ['x', sujet + '-r']], bruit(1));
  await publier(a, v1);
  await new Promise(r => setTimeout(r, 1100));        /* un created_at plus récent */
  const v2 = await relayTopic.evenement(KIND, [['d', d], ['x', sujet + '-r']], bruit(1));
  const ok2 = await publier(a, v2);
  a.fermer();
  /* chaque taille sur SA connexion : un refus qui coupe ne compte que
     pour sa taille */
  const publies = {};
  for (const ko of TAILLES_KO){
    const c = await connecter(url);
    const ev = await relayTopic.evenement(KIND, [['d', `${sujet}-${ko}`], ['x', sujet]], bruit(ko));
    out.tailles[ko] = c ? { ...(await publier(c, ev)), relu: false } : { accepte: false, raison: 'injoignable', relu: false };
    publies[ev.id] = ko;
    if (c) c.fermer();
  }
  await new Promise(r => setTimeout(r, 1500));
  /* LA SECONDE CONNEXION : le téléphone neuf, qui ne connaît que l'étiquette */
  const b = await connecter(url);
  if (!b) return out;
  b.envoyer(['REQ', 'relu', { kinds: [KIND], '#x': [sujet] }]);
  for (const e of await b.recueillir(x => x[0] === 'EVENT' && x[1] === 'relu', x => x[0] === 'EOSE' && x[1] === 'relu'))
    if (publies[e[2].id]) out.tailles[publies[e[2].id]].relu = true;
  b.envoyer(['REQ', 'rempl', { kinds: [KIND], '#x': [sujet + '-r'] }]);
  const rv = await b.recueillir(x => x[0] === 'EVENT' && x[1] === 'rempl', x => x[0] === 'EOSE' && x[1] === 'rempl');
  out.remplace = ok2.accepte ? (rv.length === 1 && rv[0][2].id === v2.id ? 'remplacé' : rv.length > 1 ? 'empilé' : rv.length ? 'ancien gardé' : 'rien relu') : 'refusé';
  b.envoyer(['REQ', 'garde', { kinds: [KIND], '#x': JOURS_RELUS.map(j => marqueur(jour(j))) }]);
  for (const e of await b.recueillir(x => x[0] === 'EVENT' && x[1] === 'garde', x => x[0] === 'EOSE' && x[1] === 'garde')){
    const x = (e[2].tags || []).find(t => t[0] === 'x');
    const m = x && /^oc-sonde-coffre-(\d{4}-\d{2}-\d{2})$/.exec(x[1]);
    if (!m) continue;
    const age = Math.round((Date.now() - Date.parse(m[1] + 'T12:00:00Z')) / 864e5);
    if (!out.jours.includes(age)) out.jours.push(age);
  }
  b.fermer();
  return out;
}

const ligne = r => !r.ouvert ? `  ${r.url} — injoignable` : `  ${r.url}\n`
  + TAILLES_KO.map(ko => { const x = r.tailles[ko] || {};
      return `      ${String(ko).padStart(3)} Ko  ${!x.accepte ? `refusé (${(x.raison || '').slice(0, 60)})` : x.relu ? 'gardé et RELU' : 'accepté, pas relu'}`; }).join('\n')
  + `\n      remplacement : ${r.remplace}${r.jours.length ? ` · marqueurs retrouvés à ${r.jours.sort((a, b) => a - b).join(', ')} j` : ''}`;

/* ---- le contrôle : sans lui, la sonde ne conclut rien ---- */
let echec = false;
const local = await startLocalRelay({ garde: true });
const t = await sonder(local.url);
local.close();
console.log('contrôle (relais local qui garde) :\n' + ligne(t));
if (!TAILLES_KO.every(ko => t.tailles[ko] && t.tailles[ko].accepte && t.tailles[ko].relu)){
  console.error('ÉCHEC : le relais local ne rend pas toutes les tailles — la sonde ne sait pas mesurer, elle ne conclut rien');
  echec = true;
}
/* le relais qui refuse 64 Ko PUIS COUPE (la forme relevée sur quatre
   relais publics) : le marqueur et le remplacement doivent quand même
   se lire — sinon la garde de sept jours n'est jamais mesurée chez eux */
const coupe = await startLocalRelay({ garde: true, tailleMax: 60000 });
const tc = await sonder(coupe.url);
const marqueDeposee = coupe.gardes.some(e => (e.tags || []).some(x => x[0] === 'x' && x[1] === marqueur(jour())));
coupe.close();
console.log('contrôle (relais qui refuse 64 Ko et coupe) :\n' + ligne(tc));
if (!marqueDeposee || tc.remplace !== 'remplacé' || !tc.tailles[32].relu || tc.tailles[64].accepte){
  console.error('ÉCHEC : un relais qui coupe après un refus fait perdre le marqueur ou le remplacement — la garde ne se mesurerait pas');
  echec = true;
}
const sansGarde = await startLocalRelay({});
const n = await sonder(sansGarde.url);
sansGarde.close();
if (TAILLES_KO.some(ko => n.tailles[ko] && n.tailles[ko].relu)){
  console.error('ÉCHEC : un relais qui ne garde rien est lu comme s’il gardait — la sonde dit oui à tout');
  echec = true;
} else console.log('contre-épreuve : un relais qui ne garde rien rend « accepté, pas relu » ✓');

if (!RESEAU){
  console.log('↷ relais publics non sondés (OC_SONDE_RELAIS=1 pour les sonder)');
} else if (!echec){
  console.log('\nrelais de l’app (RELAIS_DEFAUT) :');
  const res = [];
  for (const url of RELAIS_DEFAUT){ const r = await sonder(url); res.push(r); console.log(ligne(r)); }
  console.log('\nbilan — relais qui gardent et rendent, par taille :');
  for (const ko of TAILLES_KO)
    console.log(`  ${String(ko).padStart(3)} Ko  ${res.filter(r => r.tailles[ko] && r.tailles[ko].relu).length}/${res.length}`);
  console.log(`  remplacement : ${res.filter(r => r.remplace === 'remplacé').length}/${res.length}`);
  console.log(`  marqueur de 7 jours ou plus retrouvé : ${res.filter(r => r.jours.some(j => j >= 7)).length}/${res.length}`);
}
process.exitCode = echec ? 1 : 0;
console.log(echec ? 'SONDE coffre : ÉCHEC' : 'SONDE coffre : OK');
setTimeout(() => process.exit(process.exitCode), 200);
