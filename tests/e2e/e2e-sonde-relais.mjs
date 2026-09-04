/* ============================================================
   E2E — LA SONDE DES RELAIS DIT-ELLE LA VÉRITÉ ?

   `sonde-relais-publics.mjs` parle au monde réel : la CI la joue à
   chaque poussée ET deux fois par semaine, sans personne devant. Son
   rapport est le SEUL élément sur lequel on décide de remplacer une
   adresse dans `RELAIS_DEFAUT` — c'est écrit dans la feuille de route.
   Un rapport faux ne coûte donc pas un test rouge : il coûte neuf
   relais en bonne santé remplacés à la main.

   Elle avait exactement ce défaut. Sans réseau sortant, les neuf
   échouaient de la même façon et le rapport rendait « ÉPINGLÉS MUETS
   — à remplacer » suivi des neuf. Mesuré depuis un bac à sable dont
   le mandataire rend 403 sur les WebSockets : TCP et TLS ouvraient
   pourtant jusqu'à `relay.damus.io`. Zéro relais en cause, neuf
   accusés.

   Ce scénario fabrique le monde entier en local — donc il ne demande
   AUCUN réseau et tourne dans la suite comme les autres. Cinq relais,
   cinq états connus d'avance :

     · deux SAINS      (`relais-local.mjs`, un vrai NIP-01) ;
     · un MUET         — il accepte la WebSocket puis se tait : c'est
                         la panne d'un vrai relais, celle qu'il FAUT
                         nommer ;
     · un COUPÉ        — le socket ouvre, l'upgrade est refusée :
                         c'est le mandataire, celui qu'il ne faut
                         SURTOUT pas accuser ;
     · un INJOIGNABLE  — port fermé.

   On exige que chacun soit rangé au bon endroit, et — c'est le cœur —
   que la branche « je n'ai pas pu mesurer » se déclenche quand aucune
   WebSocket ne s'ouvre. Cette branche-là ne se joue QUE le jour où le
   réseau tombe : sans ce scénario, elle pourrirait sans que personne
   ne le voie, ce qui est précisément ce qui vient d'arriver.
   ============================================================ */
import http from 'node:http';
import net from 'node:net';
import crypto from 'node:crypto';
import { startLocalRelay } from './relais-local.mjs';
import { relever, verdict, PLANCHER, controleLocal } from './sonde-relais-publics.mjs';

const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
/* PAS DE ✓ APRÈS UN ÉCHEC : il ferait lire « ça marche » juste à côté de
   « ça casse », et c'est la ligne verte qu'on retient. `bilan` ne parle
   que si rien n'a rougi PENDANT le bloc qu'il conclut. */
let rouges = 0;
const bilan = msg => {
  const eu = process.exitCode ? 1 : 0;
  if (eu === rouges) console.log(msg);
  rouges = eu;
};
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/* un relais qui ACCEPTE la WebSocket puis ne répond jamais */
async function relaisMuet(){
  /* LES SOCKETS UPGRADÉS SE GARDENT. `server.close()` cesse d'accepter
     mais ne touche pas aux connexions déjà passées en WebSocket : sans
     ce jeu, le scénario affichait « OK » puis ne rendait jamais la
     main — le processus restait vivant sur un socket que plus personne
     ne lisait. Un test qui ne se termine pas est un test qu'on finit
     par retirer de la suite. */
  const vivants = new Set();
  const s = http.createServer((q, r) => { r.writeHead(426); r.end(); });
  s.on('upgrade', (req, sock) => {
    const k = req.headers['sec-websocket-key'];
    if (!k){ sock.destroy(); return; }
    const a = crypto.createHash('sha1').update(k + GUID).digest('base64');
    sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n'
      + 'Connection: Upgrade\r\nSec-WebSocket-Accept: ' + a + '\r\n\r\n');
    vivants.add(sock);
    sock.on('close', () => vivants.delete(sock));
    /* … et puis plus rien : le relais est là, il se tait */
  });
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  return { url: 'ws://127.0.0.1:' + s.address().port,
    close: () => { for (const c of vivants) try { c.destroy(); } catch (e) {} s.close(); } };
}

/* un serveur qui ouvre le socket mais REFUSE l'upgrade — un mandataire */
async function chemincoupe(){
  const s = http.createServer((q, r) => { r.writeHead(403); r.end(); });
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  return { url: 'ws://127.0.0.1:' + s.address().port, close: () => s.close() };
}

/* un port qu'on ouvre puis qu'on ferme : plus rien n'écoute */
async function portMort(){
  const s = net.createServer();
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const port = s.address().port;
  await new Promise(r => s.close(r));
  return { url: 'ws://127.0.0.1:' + port };
}

/* ---- ① l'instrument se contrôle lui-même ---- */
{
  const casse = await controleLocal();
  if (casse) fail('le contrôle local échoue alors que rien n’est cassé — ' + casse);
  else bilan('contrôle local : un relais qui répond EOSE est bien vu « sain » ✓');
}

/* ---- ② chaque panne est rangée au bon endroit ---- */
const sain1 = await startLocalRelay();
const sain2 = await startLocalRelay();
const muet = await relaisMuet();
const coupe = await chemincoupe();
const mort = await portMort();
{
  const liste = [sain1.url, sain2.url, muet.url, coupe.url, mort.url];
  const r = await relever(liste);
  const v = verdict({ ...r, total: liste.length });
  const dedans = (arr, u) => arr.some(x => x.startsWith(u));

  if (r.sains.length !== 2 || !r.sains.includes(sain1.url) || !r.sains.includes(sain2.url))
    fail('les deux relais sains ne sont pas vus : ' + JSON.stringify(r.sains));
  if (!dedans(r.suspects, muet.url))
    fail('le relais MUET n’est pas nommé — c’est pourtant sa faute : ' + JSON.stringify(r.suspects));
  if (r.suspects.length !== 1)
    fail('un innocent est accusé avec le muet : ' + JSON.stringify(r.suspects));
  if (!dedans(r.coupes, coupe.url) || !/coupé plus haut/.test(r.coupes.join(' ')))
    fail('le chemin coupé n’est pas reconnu comme tel : ' + JSON.stringify(r.coupes));
  if (!dedans(r.coupes, mort.url) || !/injoignable/.test(r.coupes.join(' ')))
    fail('le port fermé n’est pas reconnu comme injoignable : ' + JSON.stringify(r.coupes));
  if (v.code !== 0)
    fail('deux relais sains suffisent (plancher ' + PLANCHER + '), et le verdict rend ' + v.code);
  if (!v.mesure) fail('le verdict se dit « rien mesuré » alors que deux relais ont répondu');
  const txt = v.lignes.join('\n');
  if (!/ÉPINGLÉS MUETS/.test(txt)) fail('le rapport ne propose pas de remplacer le relais muet');
  if (txt.split('NON MESURÉS')[1]?.includes(muet.url))
    fail('le relais muet est rangé chez les non mesurés — il serait blanchi à tort');
  bilan('cinq relais, cinq états : sain ×2, muet nommé, chemin coupé et port fermé '
    + 'mis à part sans être accusés ✓');
}

/* ---- ③ LA BRANCHE QUI COMPTE : aucune WebSocket ne s'ouvre ----
   C'est le cas qui a produit le faux rapport. Le monde est ici sans
   aucun relais joignable — et la sonde doit refuser de nommer qui que
   ce soit. */
{
  const liste = [coupe.url, mort.url, (await portMort()).url];
  const r = await relever(liste);
  const v = verdict({ ...r, total: liste.length });
  const txt = v.lignes.join('\n');
  if (r.sains.length || r.suspects.length)
    fail('un relais est déclaré sain ou suspect alors qu’aucune WebSocket ne s’est ouverte');
  if (v.mesure) fail('la sonde croit avoir mesuré quelque chose alors qu’elle n’a rien mesuré');
  if (!/NE DIT RIEN SUR LES RELAIS/.test(txt))
    fail('sans réseau, le rapport ne prévient pas qu’il ne prouve rien :\n' + txt);
  if (/ÉPINGLÉS MUETS|à remplacer/.test(txt))
    fail('sans réseau, le rapport propose QUAND MÊME de remplacer des adresses — '
      + 'c’est le défaut d’origine, neuf relais sains accusés :\n' + txt);
  if (v.code !== 1) fail('sans réseau, la sonde devrait échouer bruyamment, pas rendre 0');
  bilan('aucune WebSocket ouverte : la sonde dit « je n’ai pas pu mesurer » et '
    + 'n’accuse personne ✓');
}

/* ---- ④ la sonde reste FRANCHE quand le transport se dégrade vraiment ----
   Un seul relais sain, c'est sous le plancher : elle doit rougir, et
   nommer le coupable — sinon on aurait acheté la prudence au prix du
   silence. */
{
  /* `verdict` est PURE : on la nourrit du relevé qu'on a déjà, plutôt
     que de re-sonder le relais muet pour dix secondes de plus. */
  const v = verdict({ sains: [sain1.url], suspects: [muet.url + ' — muet'],
    coupes: [], total: 2 });
  if (v.code !== 1) fail('un seul relais sain passe sous le plancher : la sonde doit rougir');
  if (!/TRANSPORT PUBLIC DÉGRADÉ/.test(v.lignes.join('\n')))
    fail('le transport dégradé n’est pas dit');
  if (!v.lignes.join('\n').includes(muet.url)) fail('le relais muet n’est pas nommé');
  bilan('transport vraiment dégradé : elle rougit et nomme le coupable — '
    + 'la prudence n’a pas coûté le silence ✓');
}

sain1.close(); sain2.close(); muet.close(); coupe.close();
console.log(process.exitCode ? 'E2E sonde relais : ÉCHEC' : 'E2E sonde relais : OK');
