/* ============================================================
   E2E — « ÇA NE MARCHE PAS QUAND ON N'EST PAS SUR LE MÊME WIFI »

   Tous les autres scénarios font vivre les deux navigateurs sur la
   MÊME machine : ils se relient par la boucle locale, sans percer un
   seul NAT. La plainte la plus fréquente sur le P2P était donc, ici,
   ni reproductible ni réfutable — et le seul outil qui s'en approchait
   (`e2e-liaison.mjs`) SIMULE la panne en retirant les candidats ICE
   au receveur, ce qui prouve le message affiché, jamais le transport.

   Celui-ci monte deux vrais réseaux (`reseaux-labo.mjs`, espaces de
   noms Linux, deux NAT, un STUN local) et joue le partage en groupe
   d'un réseau à l'autre, dans trois mondes :

     ① deux box       → la liaison DOIT passer ;
     ② box + mobile   → elle DOIT passer aussi (ICE apprend l'adresse
                        du pair sur le paquet qui arrive) ;
     ③ deux mobiles   → elle NE PEUT PAS passer, et l'app doit le DIRE
                        avec le bon geste — c'est la seule panne que le
                        produit ne peut pas réparer (§8), donc la seule
                        qu'il doit nommer sans se tromper.

   ET IL JOUE LE TÉMOIN D'ABORD. Un WebRTC nu traverse le laboratoire
   avant qu'OpenContact n'y touche : sans ce contrôle, un laboratoire
   mal réglé rend « l'app est cassée » — c'est arrivé en l'écrivant, et
   c'est exactement la faute que la sonde des relais avait déjà payée.
   Le témoin rouge n'accuse personne : il dit que l'instrument est
   cassé, et s'arrête là.

   Demande root et `iproute2` — il ne tourne donc que sur demande :
   `OC_LABO_RESEAUX=1 node tests/e2e/e2e-reseaux-separes.mjs`.
   Sans ça, il se déclare SAUTÉ, jamais vert.
   ============================================================ */
import { chromium, chromiumPath, SHOTS, serveRepo, attendre } from './outils.mjs';
import { startLocalRelay } from './relais-local.mjs';
import { monter, demonter, startStun, chromiumDansNs, temoinWebRTC, labPossible, NET } from './reseaux-labo.mjs';

const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const saute = m => { console.log('SAUTÉ — ' + m); process.exit(0); };

if (process.env.OC_LABO_RESEAUX !== '1')
  saute('deux réseaux réels demandent root et iproute2 : OC_LABO_RESEAUX=1 pour le jouer');
const manque = await labPossible();
if (manque) saute(manque);

const stun = await startStun();
const { server, base } = await serveRepo({ hote: NET });
const relay = await startLocalRelay({ tls: true, hote: NET });
const navs = [];
const fin = async () => {
  for (const n of navs) { try { await n.close(); } catch (e) {} }
  relay.close(); server.close(); stun.close();
  await demonter();
};

/* Le serveur est en clair (`http://10.0.9.1:…`) : deux espaces de noms
   ne partagent pas `localhost`, et un certificat pour une adresse de
   laboratoire n'apprendrait rien. Le drapeau rend l'origine sûre —
   sans quoi `crypto.subtle` et le reste n'existent pas et on mesurerait
   une app amputée. */
const lance = async ns => {
  const n = await chromium.launch({
    executablePath: await chromiumDansNs(ns, chromiumPath()),
    args: ['--unsafely-treat-insecure-origin-as-secure=' + base]
  });
  navs.push(n);
  return n;
};

const mondes = [
  { mode: 'cone',       dit: 'deux box (deux wifi différents)',   passe: true },
  { mode: 'mixte',      dit: 'une box et un mobile',              passe: true },
  { mode: 'symetrique', dit: 'deux mobiles (NAT d’opérateur)',    passe: false }
];

for (const monde of mondes){
  await monter(monde.mode);
  const navA = await lance('ocA');
  const navB = await lance('ocB');

  /* ---- le témoin, avant tout ---- */
  const temoin = await temoinWebRTC(navA, navB, stun.url, monde.passe ? 30000 : 20000);
  if (temoin !== monde.passe){
    if (monde.passe)
      fail(`LABORATOIRE CASSÉ (${monde.dit}) : un WebRTC NU ne traverse pas ces deux réseaux. `
        + 'Rien ne peut être conclu sur OpenContact tant que ce témoin est rouge — '
        + 'le NAT du laboratoire est à revoir, pas l’application.');
    else
      fail(`LABORATOIRE TROP GENTIL (${monde.dit}) : un WebRTC nu passe alors que deux NAT `
        + 'symétriques ne le permettent pas. Le monde ③ ne prouve donc plus rien.');
    await fin();
    process.exit(1);
  }
  console.log(`témoin (${monde.dit}) : liaison nue ${temoin ? 'établie' : 'impossible'}, comme attendu ✓`);

  /* ---- puis l'app, par le vrai bouton ---- */
  const page = async (nav, n) => {
    const ctx = await nav.newContext({ ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 }, hasTouch: true });
    /* le STUN du laboratoire remplace les publics, injoignables ici ;
       un éventuel TURN de l'app resterait, mais il n'y en a aucun */
    await ctx.addInitScript(([u]) => {
      const Vrai = window.RTCPeerConnection;
      window.RTCPeerConnection = function(cfg, ...r){
        cfg = Object.assign({}, cfg);
        cfg.iceServers = [{ urls: u }].concat((cfg.iceServers || [])
          .filter(s => /^turns?:/.test(String(s.urls))));
        return new Vrai(cfg, ...r);
      };
      window.RTCPeerConnection.prototype = Vrai.prototype;
    }, [stun.url]);
    const p = await ctx.newPage();
    await p.goto(base, { waitUntil: 'load' });
    await p.evaluate(async ([url, n]) => {
      const st = await import('./engine/storage.js');
      await st.kvInit();
      await st.kvSet(st.RELAYS_KEY, JSON.stringify([url]));
      if (n) await st.kvSet(st.DATA_KEY, JSON.stringify(Array.from({ length: n }, (x, i) => ({
        id: 'r-' + i, name: 'Piste ' + i, city: 'Lille', status: 'todo', updatedAt: 1000 + i }))));
    }, [relay.url, n]);
    await p.reload({ waitUntil: 'load' });
    return p;
  };
  const A = await page(navA, 12);
  const B = await page(navB, 0);
  await attendre(A, async () => (await import('./ui/state.js')).S.companies.length === 12);

  for (const p of [A, B]){
    await p.click('.bottomnav a[data-r="echanger"]');
    await p.waitForSelector('#ecPromo');
    await p.click('#ecPromo');
    await p.waitForSelector('#prPass');
    await p.fill('#prPass', 'labo-deux-reseaux');
    await p.click('.modal-f .btn-primary');
    await p.waitForSelector('#prStatus');
  }
  const statut = async p => (await p.textContent('#prStatus') || '').replace(/\s+/g, ' ').trim();
  let relie = false;
  for (let i = 0; i < 35 && !relie; i++){
    await A.waitForTimeout(2000);
    relie = /camarade/.test(await statut(A)) && /camarade/.test(await statut(B));
  }

  if (monde.passe){
    if (!relie){
      fail(`partage en groupe (${monde.dit}) : pas relié en 70 s alors qu'un WebRTC nu passe `
        + `sur ces mêmes deux réseaux — statut A : « ${await statut(A)} »`);
    } else {
      /* relié ne suffit pas : ce sont les PISTES qui doivent traverser */
      await A.click('.modal-f .btn-primary');
      let recu = true;
      try { await B.waitForSelector('.rc-big', { timeout: 30000 }); } catch (e) { recu = false; }
      if (!recu) fail(`partage en groupe (${monde.dit}) : relié, mais rien n'arrive en face`);
      else console.log(`partage en groupe (${monde.dit}) : relié et 12 pistes passées ✓`);
    }
  } else {
    if (relie){
      fail(`partage en groupe (${monde.dit}) : relié alors que deux NAT symétriques `
        + 'l’interdisent — le laboratoire ne reproduit pas ce qu’il prétend');
    } else {
      /* LA PANNE QU'ON NE PEUT PAS RÉPARER SE DIT, ET AVEC LE BON GESTE.
         « En attente de ton groupe » serait un mensonge : personne ne
         viendra, et le repli (QR, fichier) marche, lui, tout de suite. */
      const s = await statut(A);
      if (!/réseaux|QR|fichier/i.test(s))
        fail(`deux mobiles : l'écran n'explique pas la panne ni le repli — « ${s} »`);
      else console.log(`partage en groupe (${monde.dit}) : impossible, et l'écran le dit — « ${s} » ✓`);
    }
  }
  await A.screenshot({ path: `${SHOTS}/reseaux-${monde.mode}-A.png` });
  await B.screenshot({ path: `${SHOTS}/reseaux-${monde.mode}-B.png` });
  for (const n of navs.splice(0)) await n.close();
}

await fin();
console.log(process.exitCode ? 'E2E deux réseaux : ÉCHEC' : 'E2E deux réseaux : OK');
