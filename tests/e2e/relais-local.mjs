/* ============================================================
   OpenContact — tests de bout en bout · relais Nostr LOCAL
   Un vrai relais NIP-01 minimal (EVENT / REQ / CLOSE / EOSE / OK),
   serveur WebSocket RFC 6455 écrit à la main — zéro dépendance,
   comme tout l'outillage. Il permet de jouer la chaîne P2P entière
   (bibliothèque → WebSocket → découverte → WebRTC → transfert)
   avec deux vrais navigateurs, sans dépendre des relais publics.
   Rien ici n'est chargé par l'application.
   En `tls: true`, le relais parle wss:// avec un certificat
   auto-signé jetable (généré par openssl à la volée) : la CSP de
   l'application n'autorise que wss:, et le contexte de test passe
   `ignoreHTTPSErrors` pour l'accepter.
   ============================================================ */
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import os from 'os';
import path from 'path';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/* certificat auto-signé jetable pour 127.0.0.1 — test uniquement */
async function throwawayCert(){
  const dir = await mkdtemp(path.join(os.tmpdir(), 'oc-relais-'));
  const key = path.join(dir, 'k.pem');
  const cert = path.join(dir, 'c.pem');
  await promisify(execFile)('openssl', ['req', '-x509', '-newkey', 'ec',
    '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-keyout', key, '-out', cert,
    '-days', '2', '-nodes', '-subj', '/CN=127.0.0.1',
    '-addext', 'subjectAltName=IP:127.0.0.1']);
  const out = { key: await readFile(key), cert: await readFile(cert) };
  await rm(dir, { recursive: true, force: true });
  return out;
}

/* ---- trames RFC 6455 : encoder (serveur → client, sans masque) ---- */
function encodeFrame(opcode, payload){
  const len = payload.length;
  let head;
  if (len < 126){
    head = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536){
    head = Buffer.alloc(4);
    head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(len, 2);
  } else {
    head = Buffer.alloc(10);
    head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([head, payload]);
}

/* ---- trames RFC 6455 : décoder au fil de l'eau (client → serveur) ---- */
function makeDecoder(onText, onClose, onPing){
  let buf = Buffer.alloc(0);
  let fragments = null;   /* message fragmenté en cours (opcode 0) */
  return chunk => {
    buf = Buffer.concat([buf, chunk]);
    for (;;){
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126){
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2); off = 4;
      } else if (len === 127){
        if (buf.length < 10) return;
        const big = buf.readBigUInt64BE(2);
        if (big > 16n * 1024n * 1024n){ onClose(); return; }   /* jamais un Go en mémoire */
        len = Number(big); off = 10;
      }
      const maskLen = masked ? 4 : 0;
      if (buf.length < off + maskLen + len) return;
      let payload = buf.subarray(off + maskLen, off + maskLen + len);
      if (masked){
        const mask = buf.subarray(off, off + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }
      buf = buf.subarray(off + maskLen + len);
      if (opcode === 8){ onClose(); return; }
      if (opcode === 9){ onPing(payload); continue; }
      if (opcode === 10) continue;                        /* pong : ignoré */
      if (opcode === 1 || opcode === 2 || opcode === 0){
        if (opcode !== 0 && !fin){ fragments = [payload]; continue; }
        if (opcode === 0){
          if (!fragments) continue;
          fragments.push(payload);
          if (!fin) continue;
          payload = Buffer.concat(fragments); fragments = null;
        }
        onText(payload.toString('utf8'));
      }
    }
  };
}

/* ---- le relais : NIP-01 réduit à ce que Trystero utilise ---- */
/* `muet` : le relais accepte la connexion WebSocket et ne répond
   PLUS JAMAIS. C'est la panne qu'un `readyState === 1` ne voit pas, et
   celle qui laissait l'app sur « En attente de ton autre appareil »
   indéfiniment. Sans ce double, on ne peut pas prouver la correction :
   un relais mort refuse le socket, un relais muet l'accepte.

   `refus` : il LIT normalement (REQ → EOSE) et REFUSE les écritures
   (EVENT → OK false), sans rien retransmettre. C'est la panne d'un
   relais public d'aujourd'hui — NIP-42, allow-list, paiement,
   anti-spam — et c'est la plus trompeuse des trois : il répond, donc
   il passait pour vivant, et l'app attendait un pair qui ne pouvait
   pas être annoncé. Mesuré sur les relais épinglés le 18/09 : quatre
   sur neuf étaient dans cet état exact pendant que la sonde de lecture
   en rendait sept sur neuf « sains ».

   `avale` : LE PIRE DES QUATRE, et celui qui a échappé à toutes les
   versions précédentes. Il lit normalement (REQ → EOSE) et prend nos
   publications SANS RIEN DIRE — ni `OK true`, ni `OK false` — et sans
   rien retransmettre. Il n'est donc ni muet (il parle), ni refusant
   (il ne refuse rien) : l'app le comptait vivant, et rendait « En
   attente » à l'infini. C'est la panne que le mainteneur a rencontrée
   sur deux vrais téléphones, sur les trois fonctions à la fois.
   Ce double est ce qui rend la correction PROUVABLE : sans lui, on ne
   peut pas distinguer « l'app mesure le portage » de « l'app mesure
   le bavardage », puisque le relais sain fait les deux. */
/* `limite` : { n, ms } — au-delà de `n` publications par adresse IP sur
   une fenêtre glissante de `ms`, il répond `OK false "rate-limited"` et
   ne relaie pas. C'est l'anti-spam des relais publics, et il ne choisit
   pas ses victimes : il frappe ce qui arrive EN DERNIER dans une rafale.
   Dans une négociation Trystero, ce sont les candidats ICE de la réponse
   — ceux dont dépend une liaison entre deux réseaux (voir
   `sonde-candidats-relais.mjs`).
   `perdCandidats` : il refuse les seuls événements qui portent un
   candidat ICE (les clés du contenu sont en clair). Aucun relais réel ne
   vise ainsi ; c'est le cas ISOLÉ, pour prouver le mécanisme sans
   dépendre d'un seuil.
   `hote` : l'adresse d'écoute (le labo NAT écoute hors de la boucle). */
export async function startLocalRelay({ silent = true, tls = false, port = 0, hote = '127.0.0.1',
                                        muet = false, refus = false, avale = false,
                                        limite = null, perdCandidats = false } = {}){
  const conns = new Set();          /* { sock, send, subs: Map<subId, filtres[]> } */
  const log = (...a) => { if (!silent) console.log('[relais]', ...a); };
  const recents = new Map();        /* IP → horodatages des publications acceptées */
  const stats = { recus: 0, refuses: 0, raisons: {} };
  const refuser = (conn, ev, raison) => {
    stats.refuses++;
    stats.raisons[raison] = (stats.raisons[raison] || 0) + 1;
    conn.send(['OK', ev.id, false, raison]);
  };

  const matches = (ev, f) => {
    if (f.kinds && !f.kinds.includes(ev.kind)) return false;
    if (typeof f.since === 'number' && ev.created_at < f.since - 60) return false;
    if (f['#x']){
      const topics = (ev.tags || []).filter(t => t[0] === 'x').map(t => t[1]);
      if (!topics.some(t => f['#x'].includes(t))) return false;
    }
    return true;
  };

  const server = tls
    ? https.createServer(await throwawayCert(), (req, res) => { res.writeHead(426); res.end(); })
    : http.createServer((req, res) => { res.writeHead(426); res.end(); });
  server.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key'];
    if (!key){ sock.destroy(); return; }
    const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n' +
      'Connection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    const conn = {
      sock,
      subs: new Map(),
      send: obj => { try { sock.write(encodeFrame(1, Buffer.from(JSON.stringify(obj)))); } catch (e) {} }
    };
    conns.add(conn);
    const bye = () => { conns.delete(conn); try { sock.destroy(); } catch (e) {} };
    const decode = makeDecoder(text => {
      let msg;
      try { msg = JSON.parse(text); } catch (e) { return; }
      if (!Array.isArray(msg)) return;
      if (muet) return;                    /* il écoute et ne dit rien */
      if (msg[0] === 'EVENT' && msg[1] && msg[1].id){
        const ev = msg[1];
        log('EVENT kind', ev.kind);
        if (refus){
          /* la forme exacte d'un relais restreint : il répond, poliment,
             et ne relaie rien — c'est sa réponse qui le trahit */
          conn.send(['OK', ev.id, false, 'restricted: we do not accept events from this pubkey']);
          return;
        }
        /* il avale : rien ne sort, et RIEN NE LE DIT. Pas d'accusé, pas
           de refus, pas de retransmission — seul le silence sur CETTE
           publication-là le distingue d'un relais sain, et c'est
           précisément ce que l'app doit savoir lire. */
        if (avale) return;
        stats.recus++;
        if (perdCandidats && /"candidate"\s*:/.test(String(ev.content || ''))){
          refuser(conn, ev, 'rate-limited: slow down');
          return;
        }
        if (limite){
          const ip = conn.sock.remoteAddress || '?';
          const maintenant = Date.now();
          const t = (recents.get(ip) || []).filter(x => maintenant - x < limite.ms);
          if (t.length >= limite.n){ recents.set(ip, t); refuser(conn, ev, 'rate-limited: slow down'); return; }
          t.push(maintenant);
          recents.set(ip, t);
        }
        conn.send(['OK', ev.id, true, '']);
        for (const c of conns)
          for (const [subId, filters] of c.subs)
            if (filters.some(f => matches(ev, f))){ c.send(['EVENT', subId, ev]); break; }
      } else if (msg[0] === 'REQ' && typeof msg[1] === 'string'){
        conn.subs.set(msg[1], msg.slice(2).filter(f => f && typeof f === 'object'));
        log('REQ', msg[1]);
        conn.send(['EOSE', msg[1]]);
      } else if (msg[0] === 'CLOSE' && typeof msg[1] === 'string'){
        conn.subs.delete(msg[1]);
      }
    }, bye, payload => { try { sock.write(encodeFrame(10, payload)); } catch (e) {} });
    sock.on('data', decode);
    sock.on('error', bye);
    sock.on('close', bye);
  });

  await new Promise(r => server.listen(port, hote, r));
  const url = (tls ? 'wss' : 'ws') + '://' + hote + ':' + server.address().port;
  return {
    url,
    server,
    stats,
    clients: () => conns.size,
    close: () => { for (const c of conns) try { c.sock.destroy(); } catch (e) {} server.close(); }
  };
}
