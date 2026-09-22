/* Le NAT de cette maison est-il ORDINAIRE ou SYMÉTRIQUE ?
   Deux STUN différents, UNE connexion : un NAT ordinaire garde le même
   port public quelle que soit la destination (un seul srflx) ; un NAT
   symétrique en ouvre un par destination (deux srflx) — et là, seul un
   TURN relie deux appareils. C'est le test qu'un téléphone peut faire
   tout seul, avec les deux STUN que Trystero compose déjà (Google et
   Cloudflare). usage : node detecter-nat.mjs [espace] */
import { chromium, chromiumPath } from '../outils.mjs';
import { navigateurDans } from './navigateur.mjs';
const b = await chromium.launch({ executablePath: navigateurDans(process.argv[2] || 'oc-ha', chromiumPath()),
  args: ['--unsafely-treat-insecure-origin-as-secure=http://100.64.9.1:8080'] });
const p = await b.newPage();
await p.goto('http://100.64.9.1:8080/');
const r = await p.evaluate(async () => {
  /* deux STUN différents, UNE connexion : un NAT ordinaire garde le même
     port public quelle que soit la destination ; un NAT symétrique en
     ouvre un par destination */
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:100.64.9.1:19302' }, { urls: 'stun:100.64.9.1:3478' }] });
  pc.createDataChannel('x');
  const srflx = new Set();
  pc.onicecandidate = e => { const c = e.candidate; if (c && c.type === 'srflx' && c.protocol === 'udp') srflx.add(c.address + ':' + c.port); };
  await pc.setLocalDescription();
  await new Promise(r => setTimeout(r, 2500));
  pc.close();
  return [...srflx];
});
console.log('srflx vus :', r.join(' , '), '→', r.length > 1 ? 'NAT SYMÉTRIQUE (un port par destination)' : 'NAT ordinaire (port stable)');
await b.close();
