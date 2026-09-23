/* ============================================================
   OpenContact — moteur · le PORTAGE par relais (rendez-vous QR)

   POURQUOI IL EXISTE. Deux téléphones qui se rencontrent par le QR de
   rendez-vous se trouvent par les relais Nostr, puis ouvrent un chemin
   DIRECT (WebRTC) pour faire passer les fiches. Entre un téléphone en
   données mobiles et un autre réseau, ce chemin n'existe souvent pas :
   le NAT de l'opérateur le ferme, et sans TURN rien ne le rouvre
   (CLAUDE.md §8 — aucun TURN ouvert ne tient, mesuré). L'écran restait
   alors sur « En attente de l'autre appareil… » pendant que les deux
   appareils, eux, se parlaient déjà : par les relais.

   Donc les relais portent aussi les fiches. Ils ont exactement le
   statut qu'un TURN tiers aurait : ils transportent des octets qu'ils
   ne peuvent pas lire. Rien ne tourne chez OpenContact (§10), rien
   n'est stocké — les événements sont éphémères.

   CE QUI VOYAGE. Toujours la vue communautaire (`sharePayload`) : le
   portage change le tuyau, jamais le contenu (invariant ①). Chaque
   message est scellé par AES-GCM avec une clé dérivée du code du
   rendez-vous, que seuls les deux appareils connaissent — le code
   n'est jamais publié, le sujet non plus (PBKDF2, voir `clePortage`).

   LE PROTOCOLE, trois messages :
   · demande — le receveur : « je suis là, envoie » (et, s'il a déjà
     des parts, lesquelles lui MANQUENT) ;
   · part    — le donneur : un morceau du partage compressé ;
   · recu    — le receveur : « tout est arrivé », pour que l'écran du
     donneur puisse dire « Envoyé ✓ » ;
   · repli   — le receveur : « rien n'arrive, je passe au QR hors
     ligne » — les deux écrans basculent ENSEMBLE (§8), le donneur ne
     reste pas seul sur un rendez-vous que plus personne n'habite.
   Un événement éphémère n'atteint que qui écoute AU MOMENT où il
   passe : c'est pour ça que le donneur n'envoie qu'en RÉPONSE à une
   demande, et que le receveur redemande tant qu'il lui manque quelque
   chose. Aucun horaire à deviner, aucune perte définitive.

   Fonctions pures (WebCrypto + compression natives), aucun DOM.
   ============================================================ */
import { bytesToB64, b64ToBytes } from './crypto.js';
import { gonflerBorne } from './exchange.js';

/* La taille d'une part se MESURE (tests/e2e/sonde-portage-relais.mjs) :
   ce que les relais publics portent réellement, pas ce qu'on voudrait
   qu'ils portent. Relevé du 23/09, relais par relais : les sept qui
   s'ouvrent portent tous 64 Ko, quatre jusqu'à 100 Ko, et une rafale
   de douze événements de 12 Ko à 150 ms d'écart passe entière. Une
   part de 9 000 octets fait un événement d'environ 16 Ko — le quart
   du plus petit plafond mesuré. 26 pistes tiennent en une part. */
export const PORTAGE_PART = 9000;       /* octets compressés par part */
export const PORTAGE_PARTS_MAX = 64;    /* au-delà : fichier ou QR hors ligne */
export const PORTAGE_ITER = 100000;     /* PBKDF2 : le sujet ne se devine pas depuis le code */
const SEL = 'opencontact·portage·v1';
const TYPES = ['demande', 'part', 'recu', 'repli'];

/* code canonique → { sujet, cle }. Un seul PBKDF2 donne les deux :
   16 octets pour nommer le sujet, 32 pour la clé. Le sujet est ce que
   voit un relais ; sans le code, il ne mène à rien. */
export async function clePortage(code){
  if (!(crypto && crypto.subtle)) throw new Error('nocrypto');
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(code)),
    'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(SEL), iterations: PORTAGE_ITER, hash: 'SHA-256' },
    base, 48 * 8));
  const sujet = 'oc-portage-' + Array.from(bits.subarray(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('');
  const cle = await crypto.subtle.importKey('raw', bits.subarray(16, 48), { name: 'AES-GCM' }, false,
    ['encrypt', 'decrypt']);
  return { sujet, cle };
}

/* un message → texte publiable (iv.chiffré, base64) */
export async function sceller(k, msg){
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k.cle,
    new TextEncoder().encode(JSON.stringify(msg))));
  return bytesToB64(iv) + '.' + bytesToB64(ct);
}

/* texte reçu → message VALIDE, ou null. Tout ce qui n'a pas été scellé
   avec le code (bruit, autre salle, altération) rend null sans bruit :
   un relais peut nous livrer n'importe quoi. */
export async function ouvrir(k, txt){
  try {
    const s = String(txt || '');
    if (s.length > PORTAGE_PART * 3) return null;
    const [a, b] = s.split('.');
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(a) }, k.cle, b64ToBytes(b));
    const m = JSON.parse(new TextDecoder().decode(pt));
    return messageValide(m) ? m : null;
  } catch (e) { return null; }
}

const idOk = x => typeof x === 'string' && x.length > 0 && x.length <= 64;
const entier = (x, max) => Number.isInteger(x) && x >= 0 && x < max;
export function messageValide(m){
  if (!m || typeof m !== 'object' || !TYPES.includes(m.t) || !idOk(m.de)) return false;
  if (m.t === 'demande')
    return idOk(m.r) && (m.manque == null
      || (Array.isArray(m.manque) && m.manque.length <= PORTAGE_PARTS_MAX
          && m.manque.every(i => entier(i, PORTAGE_PARTS_MAX))));
  if (m.t === 'recu' || m.t === 'repli') return idOk(m.r);
  return idOk(m.x) && Number.isInteger(m.n) && m.n >= 1 && m.n <= PORTAGE_PARTS_MAX
    && entier(m.i, m.n) && typeof m.d === 'string' && m.d.length > 0
    && m.d.length <= Math.ceil(PORTAGE_PART / 3) * 4;
}

/* le partage → { x, n, parts } : JSON compressé, découpé, chaque
   morceau en base64. `x` nomme CET envoi — un receveur ne mélange
   jamais les parts de deux envois. */
export async function decouper(payload, taille = PORTAGE_PART){
  if (typeof CompressionStream === 'undefined') throw new Error('noqr');
  const json = new TextEncoder().encode(JSON.stringify(payload));
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const z = new Uint8Array(await new Response(stream).arrayBuffer());
  const n = Math.max(1, Math.ceil(z.length / taille));
  if (n > PORTAGE_PARTS_MAX) throw new Error('troplourd');
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(bytesToB64(z.subarray(i * taille, (i + 1) * taille)));
  const x = bytesToB64(crypto.getRandomValues(new Uint8Array(9)));
  return { x, n, parts };
}

/* les parts reçues → le partage. Même lecture BORNÉE que le QR : un
   envoi obèse ou piégé est refusé, jamais déplié en mémoire. */
export async function rassembler(parts){
  const morceaux = parts.map(b64ToBytes);
  const tout = new Uint8Array(morceaux.reduce((s, m) => s + m.length, 0));
  let o = 0;
  for (const m of morceaux){ tout.set(m, o); o += m.length; }
  return gonflerBorne(tout);
}

/* la récolte du receveur : les parts arrivent dans le désordre, en
   double (plusieurs relais portent le même événement), parfois pas du
   tout. `ajouter` rend les parts complètes dès qu'un envoi est entier ;
   `manque` dit quoi redemander. */
export function recolte(){
  const envois = new Map();          /* x → { n, parts[] } */
  let courant = null;                /* l'envoi le plus avancé */
  const reste = e => e.parts.reduce((k, p) => k + (p ? 0 : 1), 0);
  return {
    ajouter(m){
      if (!m || m.t !== 'part') return null;
      let e = envois.get(m.x);
      if (!e){
        if (envois.size >= 4) return null;       /* un bavard ne remplit pas la mémoire */
        e = { n: m.n, parts: new Array(m.n).fill(null) };
        envois.set(m.x, e);
      }
      if (e.n !== m.n) return null;
      e.parts[m.i] = m.d;
      if (!courant || reste(e) < reste(courant)) courant = e;
      return reste(e) === 0 ? e.parts.slice() : null;
    },
    /* null : rien reçu encore (on demande tout) ; sinon les indices absents */
    manque(){
      if (!courant) return null;
      const out = [];
      courant.parts.forEach((p, i) => { if (!p) out.push(i); });
      return out;
    },
    /* combien de parts sur combien — pour dire que ça avance */
    avance(){ return courant ? { recues: courant.n - reste(courant), n: courant.n } : null; }
  };
}
