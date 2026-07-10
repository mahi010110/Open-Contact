/* ============================================================
   OpenContact — interface · le DIRECT (P2P, WebRTC via Trystero)
   Deux salles bien distinctes, jamais mélangées :
   · « Mes appareils » — une phrase de liaison PERSONNELLE ; tout
     circule (privé inclus) et le plus récent gagne (engine/sync).
   · « Salle de promo » — un mot de passe de GROUPE ; seules les
     fiches partageables circulent (sharePayload), avec le même
     aperçu avant fusion que par fichier.
   La signalisation passe par des relais publics (Nostr), les
   données voyagent chiffrées de pair à pair. Rien n'est stocké
   ailleurs que sur les appareils. La lib (58 Ko) est chargée
   paresseusement — zéro poids au démarrage.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { sharePayload, fullPayload } from '../engine/exchange.js';
import { syncMerge } from '../engine/sync.js';
import { SYNC_KEY, RELAYS_KEY, kvGet, kvSet } from '../engine/storage.js';
import { S, bus, isClosed, applySynced, logJ } from './state.js';
import { openSheet, toast, btn, ic, showUndo } from './dom.js';
import { mergePreviewInto } from './recevoir.js';

let libP = null;
const loadLib = () => libP || (libP = import('../assets/vendor/trystero-nostr.min.js'));

async function sha256hex(s){
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
}
/* la phrase ne sort jamais telle quelle : la salle porte un hash.
   Relais personnalisés possibles (oc_relays_v1) — utile si un
   établissement héberge le sien ou si les relais publics sont bloqués. */
async function openRoom(kind, phrase){
  const { joinRoom } = await loadLib();
  const id = kind + '-' + (await sha256hex('opencontact·' + kind + '·' + phrase)).slice(0, 24);
  const cfg = { appId: 'opencontact', password: phrase };
  try {
    const urls = JSON.parse(await kvGet(RELAYS_KEY) || 'null');
    if (Array.isArray(urls) && urls.length) cfg.relayConfig = { urls };
  } catch (e) {}
  return joinRoom(cfg, id);
}
/* phrase de liaison : 10 caractères sans ambiguïté, faciles à taper */
function makePhrase(){
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const u = crypto.getRandomValues(new Uint8Array(10));
  const c = i => abc[u[i] % abc.length];
  return [0, 1, 2, 3, 4].map(c).join('') + '-' + [5, 6, 7, 8, 9].map(c).join('');
}

/* ============ Mes appareils : sync complète, LWW ============ */
export function openAppareils(){
  let room = null;
  let peers = 0;
  let onChange = null;
  const leave = () => {
    if (onChange){ document.removeEventListener('oc:change', onChange); onChange = null; }
    if (room){ try { room.leave(); } catch (e) {} room = null; }
  };
  const sh = openSheet({ title: 'Mes appareils', icon: 'switch', onClose: leave });
  const q = s => sh.body.querySelector(s);

  const setStatus = txt => { const el = q('#syStatus'); if (el) el.innerHTML = txt; };

  async function connect(phrase){
    await kvSet(SYNC_KEY, phrase);
    sh.body.innerHTML =
      `<div class="sy-phrase"><span>${esc(phrase)}</span></div>
       <p class="hint" style="text-align:center">Sur l’autre appareil : <b>Échanger → Mes appareils</b>, puis cette phrase.</p>
       <div class="sy-status" id="syStatus">${ic('radio', 'ic-14')} Connexion…</div>
       <div class="sy-log" id="syLog"></div>`;
    sh.setFoot([
      btn('Changer de phrase', 'btn-ghost', () => { leave(); start(true); }),
      btn('Fermer', 'btn-primary', () => sh.close())
    ]);

    let lastSent = '';
    let sendFull = null;
    let undoSnap = null;
    const sendState = () => {
      if (!sendFull || !peers) return;
      const payload = fullPayload(S.companies, S.profile, S.orphans, S.tombs);
      const j = JSON.stringify(payload);
      if (j === lastSent) return;   /* rien de neuf = on ne renvoie pas (stop au ping-pong) */
      lastSent = j;
      sendFull(payload);
    };
    try {
      room = await openRoom('sync', phrase);
    } catch (e) {
      setStatus(`${ic('square-alert', 'ic-14')} Pas de connexion — réseau bloqué ? La sauvegarde .oc marche toujours.`);
      return;
    }
    {
      const action = room.makeAction('full');
      sendFull = d => action.send(d);
      action.onMessage = obj => {
        if (!obj || obj.kind !== 'full' || !Array.isArray(obj.companies)) return;
        const r = syncMerge(obj, { companies: S.companies, orphans: S.orphans, profile: S.profile, tombs: S.tombs });
        const st = r.stats;
        const changed = st.addedC + st.updatedC + st.removedC + st.addedO + (st.profile === 'remote' ? 1 : 0);
        if (changed){
          undoSnap = undoSnap || {
            companies: JSON.stringify(S.companies), orphans: JSON.stringify(S.orphans),
            profile: JSON.stringify(S.profile), tombs: JSON.stringify(S.tombs)
          };
          applySynced(r);
          bus.refresh();
          logJ('Sync appareils : +' + st.addedC + ', ' + st.updatedC + ' maj, ' + st.removedC + ' suppr.');
          const log = q('#syLog');
          if (log) log.innerHTML =
            `<ul class="rc-lines">
               ${st.addedC ? `<li>${ic('plus', 'ic-14')} <b>${st.addedC}</b> reçue${st.addedC > 1 ? 's' : ''}</li>` : ''}
               ${st.updatedC ? `<li>${ic('pencil', 'ic-14')} <b>${st.updatedC}</b> mise${st.updatedC > 1 ? 's' : ''} à jour</li>` : ''}
               ${st.removedC ? `<li>${ic('trash', 'ic-14')} <b>${st.removedC}</b> supprimée${st.removedC > 1 ? 's' : ''}</li>` : ''}
               ${st.addedO ? `<li>${ic('contact', 'ic-14')} <b>${st.addedO}</b> contact${st.addedO > 1 ? 's' : ''} à rattacher</li>` : ''}
               ${st.profile === 'remote' ? `<li>${ic('user', 'ic-14')} profil repris (plus récent)</li>` : ''}
             </ul>`;
          const snap = undoSnap;
          showUndo(`${ic('check', 'ic-14')} Appareils synchronisés.`, () => {
            applySynced({
              companies: JSON.parse(snap.companies), orphans: JSON.parse(snap.orphans),
              profile: JSON.parse(snap.profile), tombs: JSON.parse(snap.tombs)
            });
            bus.refresh();
            toast('Sync annulée — tout est revenu comme avant.');
          });
        }
        setStatus(`${ic('check', 'ic-14')} À jour ✓ — ${peers} appareil${peers > 1 ? 's' : ''} en face`);
        sendState();   /* converge : ne repart que si quelque chose a changé */
      };
    }
    room.onPeerJoin = () => {
      peers++;
      setStatus(`${ic('radio', 'ic-14')} ${peers} appareil${peers > 1 ? 's' : ''} en face — envoi…`);
      sendState();
    };
    room.onPeerLeave = () => {
      peers = Math.max(0, peers - 1);
      setStatus(peers ? `${ic('radio', 'ic-14')} ${peers} appareil${peers > 1 ? 's' : ''} en face`
                      : `${ic('clock', 'ic-14')} En attente de l’autre appareil… (laisse la feuille ouverte)`);
    };
    setStatus(`${ic('clock', 'ic-14')} En attente de l’autre appareil… (laisse la feuille ouverte)`);
    /* tant que la feuille est ouverte, chaque enregistrement se propage */
    onChange = () => sendState();
    document.addEventListener('oc:change', onChange);
  }

  async function start(forceNew){
    const saved = forceNew ? '' : (await kvGet(SYNC_KEY) || '');
    if (saved){ connect(saved); return; }
    sh.setTitle('Mes appareils');
    sh.body.innerHTML =
      `<p class="pd" style="margin:0 0 12px">Téléphone + ordinateur : une <b>phrase de liaison</b>, et tout se synchronise en direct — suivi privé compris (ce sont tes appareils).</p>
       <div class="pick-list">
         <button class="pick" id="syNew"><b>${ic('sparkles', 'ic-14')} Premier appareil</b><span>créer ma phrase de liaison</span></button>
         <button class="pick" id="syJoin"><b>${ic('switch', 'ic-14')} Appareil suivant</b><span>taper la phrase déjà créée</span></button>
       </div>`;
    sh.setFoot([btn('Fermer', 'btn-ghost', () => sh.close())]);
    q('#syNew').addEventListener('click', () => connect(makePhrase()));
    q('#syJoin').addEventListener('click', () => {
      sh.body.innerHTML =
        `<div class="field"><label for="syPhrase">La phrase de l’autre appareil</label>
           <input id="syPhrase" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ex : k7m3p-9xq2f"></div>`;
      const go = () => { const v = q('#syPhrase').value.trim().toLowerCase(); if (v) connect(v); };
      q('#syPhrase').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      sh.setFoot([btn('← Retour', 'btn-ghost', () => start(true)), btn('Relier', 'btn-primary', go)]);
      q('#syPhrase').focus();
    });
  }
  start(false);
}

/* ============ Salle de promo : partage communautaire en direct ============ */
export function openPromo(){
  let room = null;
  let peers = 0;
  const queue = [];      /* payloads reçus, présentés un par un */
  let showing = false;
  const leave = () => { if (room){ try { room.leave(); } catch (e) {} room = null; } };
  const sh = openSheet({ title: 'Salle de promo', icon: 'radio', onClose: leave });
  const q = s => sh.body.querySelector(s);

  const ask = () => {
    sh.body.innerHTML =
      `<p class="pd" style="margin:0 0 12px">Un mot de passe pour toute la promo, et les fiches circulent en direct — <b>jamais ton suivi privé</b>.</p>
       <div class="field"><label for="prPass">Mot de passe de la salle</label>
         <input id="prPass" autocomplete="off" autocapitalize="off" placeholder="ex : promo-sio-2026"></div>`;
    const go = () => { const v = q('#prPass').value.trim(); if (v) enter(v); };
    q('#prPass').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    sh.setFoot([btn('Fermer', 'btn-ghost', () => sh.close()), btn('Entrer', 'btn-primary', go)]);
    q('#prPass').focus();
  };

  async function enter(pass){
    sh.body.innerHTML =
      `<div class="sy-status" id="prStatus">${ic('radio', 'ic-14')} Connexion…</div>
       <p class="hint" id="prHint" style="text-align:center">Chacun garde la feuille ouverte ; chaque envoi montre un aperçu avant fusion.</p>`;
    sh.setFoot([btn('Quitter la salle', 'btn-ghost', () => { leave(); ask(); }), btn('Fermer', 'btn-primary', () => sh.close())]);
    const setStatus = txt => { const el = q('#prStatus'); if (el) el.innerHTML = txt; };
    try {
      room = await openRoom('promo', pass);
    } catch (e) {
      setStatus(`${ic('square-alert', 'ic-14')} Pas de connexion — réseau bloqué ? Le fichier .oc marche toujours.`);
      return;
    }
    const share = room.makeAction('share');

    const mine = () => S.companies.filter(c => !isClosed(c) && !c.demo);
    const refreshStatus = () => {
      const n = mine().length;
      setStatus(peers
        ? `${ic('radio', 'ic-14')} <b>${peers}</b> camarade${peers > 1 ? 's' : ''} dans la salle`
        : `${ic('clock', 'ic-14')} Personne d’autre pour l’instant…`);
      const old = q('#prSend');
      if (old) old.remove();
      if (peers && n){
        const b = btn(`Envoyer mes ${n} piste${n > 1 ? 's' : ''}`, 'btn-primary', () => {
          share.send(sharePayload(mine()));
          logJ('Donné (salle de promo) : ' + n + ' piste(s)');
          toast('Parti vers ' + peers + ' camarade' + (peers > 1 ? 's' : '') + ' ✓');
        }, 'share');
        b.id = 'prSend';
        b.style.width = '100%';
        b.style.marginTop = '12px';
        q('#prStatus').after(b);
      }
    };
    const showNext = () => {
      if (showing || !queue.length) return;
      showing = true;
      const { obj, from } = queue.shift();
      const psh = openSheet({ title: 'Reçu en direct', icon: 'inbox', onClose: () => { showing = false; showNext(); } });
      mergePreviewInto(psh, obj, { from, onCancel: () => psh.close() });
    };
    share.onMessage = (obj, meta) => {
      if (!obj || obj.kind !== 'share' || !Array.isArray(obj.companies)) return;
      obj.companies = obj.companies.filter(x => x && typeof x === 'object' && x.name).slice(0, 2000);
      if (!obj.companies.length) return;
      queue.push({ obj, from: 'camarade ' + String((meta && meta.peerId) || '').slice(0, 4) });
      showNext();
    };
    room.onPeerJoin = () => { peers++; refreshStatus(); };
    room.onPeerLeave = () => { peers = Math.max(0, peers - 1); refreshStatus(); };
    refreshStatus();
  }
  ask();
}
