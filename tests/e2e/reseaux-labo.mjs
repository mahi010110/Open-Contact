/* ============================================================
   OpenContact — outillage · DEUX RÉSEAUX, DEUX NAT
   Le seul défaut qu'aucun scénario ne pouvait voir : jusqu'ici les
   deux navigateurs vivaient sur la MÊME machine et se reliaient par
   la boucle locale. « Ça ne marche pas quand on n'est pas sur le
   même wifi » n'était donc ni reproductible ni réfutable.

   Ce module fabrique, en espaces de noms réseau Linux, ce que
   personne n'avait :

     root ns  = « l'internet »  10.0.9.1 (serveur, relais wss, STUN)
     ocAr     = la box de A     LAN 10.0.1.1  /  WAN 10.0.9.10
     ocA      = le téléphone A  10.0.1.2
     ocBr     = la box de B     LAN 10.0.2.1  /  WAN 10.0.9.11
     ocB      = le téléphone B  10.0.2.2

   Aucune route ne va de 10.0.1.0/24 à 10.0.2.0/24 : il faut sortir,
   et donc percer deux NAT. Trois mondes :

     · `cone`       — deux box ordinaires (mappage indépendant de la
                      destination) : le perçage marche, c'est deux
                      wifi différents ;
     · `mixte`      — une box et un opérateur mobile ;
     · `symetrique` — deux opérateurs mobiles : un port public
                      différent par destination, l'adresse apprise du
                      STUN ne vaut rien, RIEN ne perce sans TURN.

   DEUX PIÈGES PAYÉS EN L'ÉCRIVANT, tous deux dans le sens qui accuse
   l'app à tort :

   ① UN `MASQUERADE` NU N'EST PAS UNE BOX. Le paquet entrant arrive
     avant que la sortie ait créé son suivi de connexion ; il s'inscrit
     pour le compte du ROUTEUR et vole le port, si bien que le mappage
     dérive de celui qu'a appris le STUN. Mesuré : même un WebRTC NU
     échouait. Une box fait l'inverse — le port public d'un socket ne
     dépend pas de qui on appelle. D'où le DNAT entrant + le SNAT
     sortant du mode `cone`.
   ② SANS STUN JOIGNABLE, TOUT ÉCHOUE POUR UNE AUTRE RAISON. Le
     laboratoire n'a pas d'internet, donc les serveurs STUN publics que
     la bibliothèque compose (Google, Cloudflare) n'y répondent jamais
     — on en pose un, minuscule, sur « l'internet » local, et on le
     substitue dans la page. Sans lui on mesurerait l'absence de STUN
     en croyant mesurer le NAT.

   D'où la règle que ce module impose à qui s'en sert : **on joue le
   TÉMOIN avant l'app.** `temoinWebRTC()` relie deux pages par un canal
   de données nu. S'il ne passe pas, c'est le laboratoire qui est
   cassé, et accuser OpenContact serait un rapport faux — la faute que
   le dépôt a déjà payée avec la sonde des relais.

   Demande root et `iproute2`. Rien ici n'est chargé par l'application.
   ============================================================ */
import http from 'node:http';
import dgram from 'node:dgram';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, chmod, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
export const NET = '10.0.9.1';
async function ip(...args){ return run('ip', args); }
const silence = p => p.catch(() => {});

/* ---------- le laboratoire existe-t-il seulement ? ----------
   Un scénario qui ne peut pas mesurer le DIT ; il ne rougit pas et ne
   verdit pas. C'est la leçon de `sonde-relais-publics.mjs`. */
export async function labPossible(){
  if (process.getuid && process.getuid() !== 0) return 'il faut être root';
  try { await run('ip', ['-V']); } catch (e) { return 'iproute2 (`ip`) absent'; }
  try { await run('iptables', ['-V']); } catch (e) { return 'iptables absent'; }
  return '';
}

export async function demonter(){
  for (const n of ['ocA', 'ocB', 'ocAr', 'ocBr']) await silence(ip('netns', 'del', n));
  for (const l of ['br-oc', 'wA', 'wB']) await silence(ip('link', 'del', l));
}

/* `mode` : cone | mixte | symetrique */
export async function monter(mode = 'cone'){
  await demonter();
  await ip('link', 'add', 'br-oc', 'type', 'bridge');
  await ip('addr', 'add', NET + '/24', 'dev', 'br-oc');
  await ip('link', 'set', 'br-oc', 'up');
  for (const n of ['ocA', 'ocB', 'ocAr', 'ocBr']){
    await ip('netns', 'add', n);
    await ip('-n', n, 'link', 'set', 'lo', 'up');
  }
  const modes = mode === 'symetrique' ? { A: 'symetrique', B: 'symetrique' }
    : mode === 'mixte' ? { A: 'cone', B: 'symetrique' } : { A: 'cone', B: 'cone' };
  for (const [l, box, hote, lan, wan] of [['A', 'ocAr', 'ocA', 1, '10.0.9.10'],
                                          ['B', 'ocBr', 'ocB', 2, '10.0.9.11']]){
    await ip('link', 'add', 'w' + l, 'type', 'veth', 'peer', 'name', 'wan' + l);
    await ip('link', 'set', 'w' + l, 'master', 'br-oc', 'up');
    await ip('link', 'set', 'wan' + l, 'netns', box);
    await ip('-n', box, 'addr', 'add', wan + '/24', 'dev', 'wan' + l);
    await ip('-n', box, 'link', 'set', 'wan' + l, 'up');
    await ip('-n', box, 'route', 'add', 'default', 'via', NET);

    await ip('link', 'add', 'l' + l, 'type', 'veth', 'peer', 'name', 'lan' + l);
    await ip('link', 'set', 'l' + l, 'netns', box);
    await ip('link', 'set', 'lan' + l, 'netns', hote);
    await ip('-n', box, 'addr', 'add', `10.0.${lan}.1/24`, 'dev', 'l' + l);
    await ip('-n', box, 'link', 'set', 'l' + l, 'up');
    await ip('-n', hote, 'addr', 'add', `10.0.${lan}.2/24`, 'dev', 'lan' + l);
    await ip('-n', hote, 'link', 'set', 'lan' + l, 'up');
    await ip('-n', hote, 'route', 'add', 'default', 'via', `10.0.${lan}.1`);

    const dans = (...a) => run('ip', ['netns', 'exec', box, ...a]);
    await dans('sysctl', '-qw', 'net.ipv4.ip_forward=1');
    if (modes[l] === 'symetrique'){
      await dans('iptables', '-t', 'nat', '-A', 'POSTROUTING', '-o', 'wan' + l,
        '-j', 'MASQUERADE', '--random-fully');
    } else {
      /* la box : le port public d'un socket ne dépend pas du correspondant */
      await dans('iptables', '-t', 'nat', '-A', 'PREROUTING', '-i', 'wan' + l,
        '-p', 'udp', '-j', 'DNAT', '--to-destination', `10.0.${lan}.2`);
      await dans('iptables', '-t', 'nat', '-A', 'POSTROUTING', '-o', 'wan' + l,
        '-j', 'SNAT', '--to-source', wan);
    }
  }
  return { mode, modes };
}

/* ---------- un STUN minimal (RFC 5389) sur « l'internet » local ----------
   Les serveurs publics que la bibliothèque compose ne sont pas
   joignables ici ; sans celui-ci on mesurerait leur absence en croyant
   mesurer le NAT. Binding Request → XOR-MAPPED-ADDRESS, rien d'autre. */
const MAGIC = 0x2112A442;
export function startStun(hote = NET, port = 3478){
  const s = dgram.createSocket('udp4');
  let vus = 0;
  s.on('message', (msg, r) => {
    if (msg.length < 20 || msg.readUInt16BE(0) !== 0x0001) return;
    vus++;
    const attr = Buffer.alloc(12);
    attr.writeUInt16BE(0x0020, 0); attr.writeUInt16BE(8, 2);
    attr.writeUInt8(1, 5); attr.writeUInt16BE(r.port ^ (MAGIC >>> 16), 6);
    const ip4 = r.address.split('.').map(Number);
    attr.writeUInt32BE((((ip4[0] << 24 | ip4[1] << 16 | ip4[2] << 8 | ip4[3]) >>> 0) ^ MAGIC) >>> 0, 8);
    const out = Buffer.alloc(32);
    out.writeUInt16BE(0x0101, 0); out.writeUInt16BE(12, 2); out.writeUInt32BE(MAGIC, 4);
    msg.copy(out, 8, 8, 20);
    attr.copy(out, 20);
    s.send(out, r.port, r.address);
  });
  return new Promise(r => s.bind(port, hote, () =>
    r({ url: `stun:${hote}:${port}`, demandes: () => vus, close: () => s.close() })));
}

/* un Chromium qui vit DANS un espace de noms réseau : Playwright parle
   au navigateur par des tubes, `ip netns exec` les laisse passer */
export async function chromiumDansNs(ns, binaire){
  const dir = await mkdtemp(path.join(os.tmpdir(), 'oc-ns-'));
  const p = path.join(dir, 'chromium-' + ns + '.sh');
  await writeFile(p, `#!/bin/sh\nexec ip netns exec ${ns} ${binaire} "$@"\n`);
  await chmod(p, 0o755);
  return p;
}

/* ---------- LE TÉMOIN ----------
   WebRTC nu, aucune ligne d'OpenContact : deux pages, un canal de
   données, la même signalisation qu'un carnet de brouillon. Il répond
   à « mon laboratoire laisse-t-il seulement passer une liaison ? » —
   et c'est LUI qui a dit que le premier NAT était faux. */
export async function temoinWebRTC(navA, navB, stunUrl, ms = 30000){
  const boite = new Map();
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/put'){
      let b = ''; req.on('data', d => b += d);
      req.on('end', () => { boite.set(u.searchParams.get('k'), b); res.writeHead(200); res.end('ok'); });
      return;
    }
    if (u.pathname === '/get'){
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(boite.get(u.searchParams.get('k')) || '');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><meta charset="utf-8"><title>témoin</title>');
  });
  await new Promise(r => srv.listen(0, NET, r));
  const base = `http://${NET}:${srv.address().port}`;
  const A = await (await navA.newContext()).newPage();
  const B = await (await navB.newContext()).newPage();
  await A.goto(base); await B.goto(base);
  const jouer = (page, role) => page.evaluate(async ([role, stunUrl, base]) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: stunUrl }] });
    const put = (k, v) => fetch(base + '/put?k=' + k, { method: 'POST', body: v });
    const get = async k => { for (;;){ const r = await (await fetch(base + '/get?k=' + k)).text();
      if (r) return r; await new Promise(x => setTimeout(x, 300)); } };
    /* on n'attend la moisson qu'un temps borné : un candidat qui ne
       vient pas ne doit pas bloquer la mesure */
    const moisson = () => new Promise(r => { const t = setTimeout(r, 5000);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete'){ clearTimeout(t); r(); } }); });
    if (role === 'A'){
      const dc = pc.createDataChannel('x');
      window.__ouvert = new Promise(r => dc.onopen = () => r(true));
      await pc.setLocalDescription(await pc.createOffer());
      await moisson();
      await put('offer', JSON.stringify(pc.localDescription));
      await pc.setRemoteDescription(JSON.parse(await get('answer')));
    } else {
      window.__ouvert = new Promise(r => pc.ondatachannel = e => e.channel.onopen = () => r(true));
      await pc.setRemoteDescription(JSON.parse(await get('offer')));
      await pc.setLocalDescription(await pc.createAnswer());
      await moisson();
      await put('answer', JSON.stringify(pc.localDescription));
    }
  }, [role, stunUrl, base]);
  await Promise.all([jouer(A, 'A'), jouer(B, 'B')]);
  const fini = p => p.evaluate(t => Promise.race([window.__ouvert,
    new Promise(r => setTimeout(() => r(false), t))]), ms);
  const ok = (await fini(A)) && (await fini(B));
  await A.context().close(); await B.context().close();
  srv.close();
  return ok;
}
