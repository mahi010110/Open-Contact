/* ============================================================
   SONDE — UN RELAIS GARDE-T-IL UNE LETTRE POUR QUELQU'UN QUI
   N'EST PAS LÀ ? (docs/reseau.md, lot 3 — la demande à ses amis)

   Tout ce que l'app publie jusqu'ici est ÉPHÉMÈRE : la découverte, le
   portage, la sync de mes appareils n'atteignent que qui écoute AU
   MÊME INSTANT. Une demande à un ami, elle, doit l'ATTENDRE : il
   ouvrira l'app dans une heure, ou demain. Avant de concevoir quoi que
   ce soit dessus, on mesure la capacité dont ça dépend — c'est la
   leçon de §8, payée trois fois : une sonde mesure ce dont la
   fonctionnalité a BESOIN, pas ce qui est commode à mesurer.

   Ce dont elle a besoin, et donc ce qu'on mesure, relais par relais
   et forme par forme :
     · ACCEPTE — le relais répond `OK true` à la publication ;
     · RELU    — une AUTRE connexion, anonyme, qui arrive après coup et
                 ne connaît que l'étiquette, retrouve l'événement avant
                 l'EOSE. C'est exactement le téléphone de l'ami qui
                 s'ouvre plus tard ;
     · GARDÉ   — les marqueurs publiés par les passages précédents de
                 la sonde (la CI la joue à chaque poussée, et le lundi
                 et le jeudi même sans commit) sont-ils encore là, et
                 depuis combien de jours ? Une demande vit 14 jours.

   Les FORMES essayées, parce que les relais n'acceptent pas tout :
     · 1059  — l'enveloppe des messages privés de Nostr (NIP-59) ; NIP-17
               conseille aux relais de ne la rendre qu'à son destinataire
               authentifié, donc une lecture anonyme peut être refusée ;
     · 4     — l'ancien message direct, déprécié mais encore servi ;
     · 30078 — les « données d'application » (NIP-78), adressables ;
     · 8571  — un kind ordinaire qu'aucun client n'affiche.
   Le contenu est du bruit en base64 de la taille d'une demande chiffrée :
   on ne publie rien de lisible, et rien qui s'affiche dans un fil.

   CONTRÔLE OBLIGATOIRE : le relais local, en mode `garde`, doit rendre
   les quatre formes ACCEPTÉ + RELU. Sans ça la sonde ne conclut rien —
   un instrument qui accuse neuf relais sains ne se corrige pas.

   Réseau sortant requis : ne tourne que si OC_SONDE_RELAIS=1.
   Sans, seul le contrôle local tourne (et doit passer).
   ============================================================ */
import { startLocalRelay } from './relais-local.mjs';
import { RELAIS_DEFAUT } from '../../engine/transport.js';
import { relayTopic } from '../../assets/vendor/trystero-nostr.min.js';

const RESEAU = process.env.OC_SONDE_RELAIS === '1';
const ATTENTE_MS = 12000;
const FORMES = [
  { kind: 1059, nom: 'enveloppe NIP-59', tags: () => [['p', hex(32)]] },
  { kind: 4,    nom: 'message direct',   tags: () => [['p', hex(32)]] },
  { kind: 30078, nom: 'données d’app',   tags: () => [['d', 'oc-' + hex(8)]] },
  { kind: 8571, nom: 'kind ordinaire',   tags: () => [] }
];
const JOURS_RELUS = [1, 2, 3, 4, 7, 10, 14];

function hex(n){
  return [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
}
const bruit = n => Buffer.from(crypto.getRandomValues(new Uint8Array(n))).toString('base64');
const jour = (decalage = 0) => new Date(Date.now() - decalage * 864e5).toISOString().slice(0, 10);
const marqueur = (kind, j) => `oc-sonde-boite-${kind}-${j}`;

/* une connexion : envoie, attend les réponses, se ferme toute seule */
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
          const f = d => { if (pred(d)) vus.push(d); if (finPred(d)){ ecoutes.delete(f); clearTimeout(t); r({ vus, eose: true }); } };
          const t = setTimeout(() => { ecoutes.delete(f); r({ vus, eose: false }); }, ms);
          ecoutes.add(f);
        }),
        fermer: () => { try { ws.close(); } catch (e) {} }
      });
    };
  });
}

/* publier une forme, puis la relire d'une AUTRE connexion */
async function sonder(url){
  const out = { url, ouvert: false, formes: {} };
  const a = await connecter(url);
  if (!a) return out;
  out.ouvert = true;
  const sujet = 'oc-sonde-' + hex(8);
  const publies = [];
  for (const f of FORMES){
    const tags = [['x', sujet], ...f.tags()];
    const ev = await relayTopic.evenement(f.kind, tags, bruit(600));
    a.envoyer(['EVENT', ev]);
    const ok = await a.attendre(d => d[0] === 'OK' && d[1] === ev.id);
    out.formes[f.kind] = { accepte: !!(ok && ok[2] === true), raison: ok ? String(ok[3] || '') : 'pas de réponse', relu: false, jours: [] };
    publies.push(ev);
    /* le marqueur du jour, pour les passages suivants */
    const mq = await relayTopic.evenement(f.kind, [['x', marqueur(f.kind, jour())], ...f.tags()], bruit(64));
    a.envoyer(['EVENT', mq]);
    await a.attendre(d => d[0] === 'OK' && d[1] === mq.id, 4000);
  }
  a.fermer();
  await new Promise(r => setTimeout(r, 1500));
  /* LA SECONDE CONNEXION : un autre téléphone, plus tard, qui ne connaît
     que l'étiquette — ni la clé qui a signé, ni l'instant de l'envoi */
  const b = await connecter(url);
  if (!b) return out;
  b.envoyer(['REQ', 'relu', { kinds: FORMES.map(f => f.kind), '#x': [sujet] }]);
  const r = await b.recueillir(d => d[0] === 'EVENT' && d[1] === 'relu', d => d[0] === 'EOSE' && d[1] === 'relu');
  for (const d of r.vus) if (out.formes[d[2].kind] && publies.some(e => e.id === d[2].id)) out.formes[d[2].kind].relu = true;
  /* LES JOURS PASSÉS : les marqueurs laissés par les passages précédents */
  const anciens = [];
  for (const f of FORMES) for (const j of JOURS_RELUS) anciens.push(marqueur(f.kind, jour(j)));
  b.envoyer(['REQ', 'garde', { kinds: FORMES.map(f => f.kind), '#x': anciens }]);
  const g = await b.recueillir(d => d[0] === 'EVENT' && d[1] === 'garde', d => d[0] === 'EOSE' && d[1] === 'garde');
  for (const d of g.vus){
    const x = (d[2].tags || []).find(t => t[0] === 'x');
    const m = x && /^oc-sonde-boite-(\d+)-(\d{4}-\d{2}-\d{2})$/.exec(x[1]);
    if (!m || !out.formes[m[1]]) continue;
    const age = Math.round((Date.now() - Date.parse(m[2] + 'T12:00:00Z')) / 864e5);
    if (!out.formes[m[1]].jours.includes(age)) out.formes[m[1]].jours.push(age);
  }
  b.fermer();
  return out;
}

const ligne = r => {
  if (!r.ouvert) return `  ${r.url} — injoignable`;
  return `  ${r.url}\n` + FORMES.map(f => {
    const x = r.formes[f.kind] || {};
    const etat = !x.accepte ? `refusé (${(x.raison || '').slice(0, 60)})` : x.relu ? 'gardé et RELU' : 'accepté, pas relu';
    const jours = (x.jours || []).sort((a, b) => a - b);
    return `      ${String(f.kind).padEnd(5)} ${f.nom.padEnd(18)} ${etat}${jours.length ? ` · marqueurs retrouvés à ${jours.join(', ')} j` : ''}`;
  }).join('\n');
};

/* ---- le contrôle : sans lui, la sonde ne conclut rien ---- */
let echec = false;
const local = await startLocalRelay({ garde: true });
const t = await sonder(local.url);
local.close();
const controle = FORMES.every(f => t.formes[f.kind] && t.formes[f.kind].accepte && t.formes[f.kind].relu);
console.log('contrôle (relais local qui garde) :\n' + ligne(t));
if (!controle){
  console.error('ÉCHEC : le relais local ne rend pas les quatre formes — la sonde ne sait pas mesurer, elle ne conclut rien');
  echec = true;
}
/* la sonde sait-elle aussi dire NON ? Un relais qui ne garde rien
   (l'ancien relais local) doit rendre « accepté, pas relu » partout */
const sansGarde = await startLocalRelay({});
const n = await sonder(sansGarde.url);
sansGarde.close();
if (FORMES.some(f => n.formes[f.kind] && n.formes[f.kind].relu)){
  console.error('ÉCHEC : un relais qui ne garde rien est lu comme s’il gardait — la sonde dit oui à tout');
  echec = true;
} else console.log('contre-épreuve : un relais qui ne garde rien rend « accepté, pas relu » ✓');

if (!RESEAU){
  console.log('↷ relais publics non sondés (OC_SONDE_RELAIS=1 pour les sonder)');
} else if (!echec){
  console.log('\nrelais de l’app (RELAIS_DEFAUT) :');
  const res = [];
  for (const url of RELAIS_DEFAUT){
    const r = await sonder(url);
    res.push(r);
    console.log(ligne(r));
  }
  /* le bilan, par forme : combien de relais la gardent et la rendent */
  console.log('\nbilan — relais qui gardent et rendent, par forme :');
  for (const f of FORMES){
    const ok = res.filter(r => r.formes[f.kind] && r.formes[f.kind].relu).length;
    const plusVieux = Math.max(0, ...res.flatMap(r => (r.formes[f.kind] && r.formes[f.kind].jours) || []));
    console.log(`  ${String(f.kind).padEnd(5)} ${f.nom.padEnd(18)} ${ok}/${res.length}${plusVieux ? ` · le plus vieux marqueur retrouvé : ${plusVieux} j` : ''}`);
  }
}
process.exitCode = echec ? 1 : 0;
console.log(echec ? 'SONDE boîte : ÉCHEC' : 'SONDE boîte : OK');
setTimeout(() => process.exit(process.exitCode), 200);
