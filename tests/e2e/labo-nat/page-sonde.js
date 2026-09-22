const J = { envoyes: [], acks: [], recus: [], cands: {}, pair: false, erreurs: [], pcs: [] };
window.__J = J;
const typeDe = c => { try { const o = JSON.parse(c);
  return o.offer ? 'offre' : o.answer ? 'réponse' : o.candidate ? 'candidat' : 'annonce'; } catch (e) { return '?'; } };
const WS = window.WebSocket;
window.WebSocket = class extends WS {
  constructor(u, p){ super(u, p);
    this.addEventListener('message', e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m[0] === 'OK') J.acks.push({ id: m[1], ok: m[2] === true, raison: String(m[3] || '') });
      else if (m[0] === 'EVENT' && m[2]) J.recus.push({ id: m[2].id, type: typeDe(m[2].content) }); }); }
  send(d){ try { const m = JSON.parse(d); if (m[0] === 'EVENT') J.envoyes.push({ id: m[1].id, type: typeDe(m[1].content) }); } catch (e) {}
    return super.send(d); }
};
const PCS = [];
const PC = window.RTCPeerConnection;
window.RTCPeerConnection = class extends PC {
  constructor(c){ super(c); PCS.push(this); const n = PCS.length;
    const T0 = window.__T0 || (window.__T0 = Date.now());
    const note = (x) => (J.trace || (J.trace = [])).push(((Date.now() - T0) / 1000).toFixed(1) + 's pc' + n + ' ' + x);
    const cnt = sdp => (String(sdp || '').match(/a=candidate:[^\r\n]*/g) || []).map(l => l.split(' ')[7]).join(',');
    const sl = this.setLocalDescription.bind(this), sr = this.setRemoteDescription.bind(this);
    this.setRemoteDescription = d => { if (d && d.type){ note('remote ' + d.type + ' [' + cnt(d.sdp) + ']');
      (J.sdps || (J.sdps = [])).push('pc' + n + ' REÇU ' + d.type + '\n' + d.sdp); }
      return sr(d).catch(e => { note('remote ÉCHEC ' + e.message); throw e; }); };
    this.setLocalDescription = d => sl(d).then(r => { const l = this.localDescription;
      if (this.remoteDescription || (l && l.type === 'answer')) note('local ' + (l && l.type) + ' posée');
      return r; }, e => { note('local ÉCHEC ' + e.message); throw e; });
    this.addEventListener('iceconnectionstatechange', () => { if (this.remoteDescription) note('ice ' + this.iceConnectionState); });
    this.addEventListener('icegatheringstatechange', () => { if (this.remoteDescription) note('gathering ' + this.iceGatheringState); });
    this.addEventListener('icecandidate', e => { const t = e.candidate && e.candidate.type; if (t) J.cands[t] = (J.cands[t] || 0) + 1; }); }
};
/* la paire de candidats réellement retenue par la liaison établie */
window.__paire = async () => {
  for (const pc of PCS){
    if (pc.connectionState !== 'connected') continue;
    const st = await pc.getStats();
    let paire = null; const c = {};
    st.forEach(r => { if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded') paire = r;
      if (r.type === 'local-candidate' || r.type === 'remote-candidate') c[r.id] = r; });
    if (paire) return { local: c[paire.localCandidateId]?.candidateType + ' ' + c[paire.localCandidateId]?.address,
                        distant: c[paire.remoteCandidateId]?.candidateType + ' ' + c[paire.remoteCandidateId]?.address };
  }
  return null;
};
const { joinRoom } = await import('/trystero.js');
window.__rejoindre = (relais, salle, phrase) => {
  const room = joinRoom({ appId: 'opencontact', password: phrase, relayConfig: { urls: relais },
    /* le STUN du labo, par adresse : les noms de Trystero ne se résolvent pas ici */
    rtcConfig: { iceServers: [{ urls: 'stun:100.64.9.1:19302' }] },
    ...(new URLSearchParams(location.search).get('trickle') === '0' ? { trickleIce: false } : {}) }, salle,
    { onJoinError: e => J.erreurs.push(String((e && e.error) || e)) });
  room.onPeerJoin = () => { J.pair = true; };
  window.__room = room;
};
/* vieillir la réserve d'offres : une salle quelconque, tout de suite —
   comme « Mes appareils » qui en ouvre une au démarrage de l'app */
window.__chauffer = relais => joinRoom({ appId: 'opencontact', password: 'chauffe', relayConfig: { urls: relais },
  rtcConfig: { iceServers: [{ urls: 'stun:100.64.9.1:19302' }] } }, 'chauffe-' + Math.random().toString(36).slice(2));
window.__pret = true;
