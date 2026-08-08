/* ============================================================
   OpenContact — auto-tests du moteur (?test dans l'URL)
   Le gardien de l'extraction : si tout est vert, le moteur rend
   exactement ce qu'il rendait avant le découpage en modules.
   Chargé à la demande par app.js — résultats en console et dans
   window.__ocTests ; le toast est affiché par l'interface.
   ============================================================ */
import { esc, normName, extractCity, distKm, todayISO, localISO } from './engine/utils.js';
import { KDF_ITER, encryptOC2, decryptOC2, deriveKey, bytesToB64,
         fnv, ocKeystream, unsealOC1 } from './engine/crypto.js';
import { APP_VERSION, normalizeCompany, normalizeContact, normalizeProfile,
         pushHist, fillTpl, safeUrl, summarizeChanges,
         isActiveCt, nextActionContact,
         PROMPTS_MAX, PROMPT_MAX_LEN } from './engine/model.js';
import { communityView, parseInput, sharePayload, fullPayload,
         encodeOCQ, splitOCQ, makeOCQJoiner, OCQP_CHUNK,
         makeRdvCode, rdvNorm, rdvWrap, rdvParse, linkWrap, linkParse } from './engine/exchange.js';
import { findMatch, mergeIncoming, contactKey } from './engine/merge.js';
import { syncMerge, mergeTombs, TOMBS_MAX } from './engine/sync.js';
import { filterCompanies, filterOrphans, searchHint, NATURAL_DIR } from './engine/filter.js';
import { scoreOf } from './engine/score.js';
import { DATA_KEY, PROFILE_KEY, JOURNAL_KEY, ORPHANS_KEY, TOMBS_KEY, SYNC_KEY,
         RELAYS_KEY, TURN_KEY, DEVICE_KEY, DEVICES_KEY, PROMO_KEY, VAULT_KEY,
         ANALYSIS_KEY, SEALABLE, THEME_KEY, VIEW_KEY, OLD_V2, OLD_V1,
         kvGet, kvSet, kvDel, vaultActive, vaultDetach, vaultReseal } from './engine/storage.js';
import { relayTally, liaisonStage, parseTurn, turnText, TURN_MAX } from './engine/transport.js';
import { VAULT_WORDS, PHRASE_LEN, makeVaultPhrase, normVaultPhrase, phraseUnknownWords,
         createVault, unlockWithPin, unlockWithPhrase, unlockWithPrf,
         setPin, addPrfWrap, rotateVault,
         rotateVaultResumable, prevKeyOf, clearPrev,
         sealValue, openValue, isSealed } from './engine/vault.js';
import { edAvailable, makeDeviceKeys, recoveryKeys, ringInit, ringAddDevice,
         ringCommand, ringTransfer, ringRecover, ringRekey, mergeRing, actionsFor,
         verifyRing, deviceIn } from './engine/ring.js';
import { DAILY_CAP, buildCampaign, dueSends, dueSendsAll, sentTodayAll,
         markSent, markReplied, markError, stopCompanyTargets,
         pauseCampaign, resumeCampaign, stopCampaign, campaignStats,
         inSendWindow, addDays as cAddDays } from './engine/campaign.js';
import { buildMime, encodeHeader, toB64Url, authUrl, parseCallback, pkcePair } from './engine/mailer.js';
import { dueFollowups, contactFromSignature, exchangeLog, exchangeTotals, nextActionSuggestions } from './engine/assist.js';
import { makeMission, missionUsable, revokeMission, foldCampaignReport,
         signMission, openMissionWire } from './engine/mission.js';
import { normCode, pairKey } from './engine/companion.js';
import { osFromUA, assetsForOS, DIST_PAGE } from './engine/distribution.js';
import { browserFromUA, systemFromUA, diagnosticData, diagnosticText } from './engine/diagnostic.js';
import { AI_FAMILIES, browserProviders, aiComplete, draftPrompt } from './engine/ai.js';
import { normaliseMailAnalysis } from './ui/analyse.js';

export async function runSelfTests(){
  const R = [];
  const eq = (a, b) => {
    if (JSON.stringify(a) !== JSON.stringify(b))
      throw new Error(`attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`);
  };
  const ok = v => { if (!v) throw new Error('condition fausse'); };
  const tests = {
    'esc neutralise le HTML': () =>
      eq(esc('<b a="1">&\''), '&lt;b a=&quot;1&quot;&gt;&amp;&#39;'),
    'normName : accents & ponctuation': () =>
      eq(normName('Éco-Truc & Cie'), 'ecotruccie'),
    'extractCity retire le code postal': () =>
      eq(extractCity('12 rue X, 59000 Lille'), 'Lille'),
    'distKm Paris–Lille ≈ 204': () =>
      ok(Math.abs(distKm(48.8566, 2.3522, 50.6329, 3.0573) - 204) < 8),
    'OC2 : aller-retour (format versionné)': async () => {
      const src = { a: 1, t: 'héllo' };
      const enc = await encryptOC2(src, 'mdp');
      ok(enc.startsWith('OC2.1.' + KDF_ITER + '.'));
      eq(await decryptOC2(enc, 'mdp'), src);
    },
    'OC2 : rejette un mauvais mot de passe': async () => {
      const enc = await encryptOC2({ a: 1 }, 'bon');
      try { await decryptOC2(enc, 'mauvais'); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'motdepasse'); }
    },
    'OC2 : lit l’ancien format v3 (150 000 it.)': async () => {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey('x', salt, 150000);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('{"k":9}')));
      const legacy = 'OC2.' + bytesToB64(salt) + '.' + bytesToB64(iv) + '.' + bytesToB64(ct);
      eq(await decryptOC2(legacy, 'x'), { k: 9 });
    },
    'OC1 : lecture compatible': () => {
      const data = new TextEncoder().encode('{"companies":[]}');
      const ks = ocKeystream(fnv('OpenContact·communauté·v1'), data.length);
      const out = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) out[i] = data[i] ^ ks[i];
      const body = bytesToB64(out);
      eq(unsealOC1('OC1.' + fnv(body).toString(16) + '.' + body), { companies: [] });
    },
    'OCR1 : code de rendez-vous — généré, encapsulé, relu': () => {
      const code = makeRdvCode();
      ok(/^[a-z2-9]{5}-[a-z2-9]{5}$/.test(code));
      eq(rdvParse(rdvWrap(code)), rdvNorm(code));
      eq(rdvParse('OCR1. K7M3P-9XQ2F '), 'k7m3p9xq2f');   /* tolérant : casse, espaces, tiret */
      eq(rdvParse('OCQ1.abc'), null);                     /* les données ne sont pas un rendez-vous */
      /* la phrase de liaison de MES appareils : un autre préfixe, exprès.
         Le rendez-vous ouvre une salle de partage ; la phrase de liaison
         donne accès à tout le privé — les confondre serait la pire
         erreur possible, donc ils ne se lisent pas l'un pour l'autre. */
      eq(linkParse(linkWrap('k7m3p-9xq2f')), 'k7m3p-9xq2f');
      eq(linkParse(' OCL1.K7M3P-9XQ2F '), 'k7m3p-9xq2f');   /* casse et espaces tolérés */
      eq(linkParse(rdvWrap('k7m3p9xq2f')), null);           /* un rendez-vous n'est PAS une phrase */
      eq(rdvParse(linkWrap('k7m3p-9xq2f')), null);          /* et l'inverse non plus */
      eq(linkParse('OCL1.'), null);
      eq(linkParse('OCL1.-abc'), null);                     /* pas de tiret en tête */
      eq(linkParse('n’importe quoi'), null);
      eq(rdvNorm('hello'), '');                           /* trop court une fois normalisé */
    },
    'normalizeCompany : héritage v1, domaine inconnu, extra (D3)': () => {
      const c = normalizeCompany({ name: 'X', contact: 'Ana', email: 'a@b.fr', domain: 'zzz', champFutur: 42 });
      eq(c.domain, 'autre');
      eq(c.contacts.length, 1);
      eq(c.contacts[0].email, 'a@b.fr');
      eq(c.extra, { champFutur: 42 });
    },
    'communityView : aucune fuite privée': () => {
      const v = communityView(normalizeCompany({
        name: 'X', status: 'active', notes: 'secret',
        appliedAt: '2026-01-01', nextAction: '2026-02-01', nextActionText: 'Relancer',
        closedAt: '2026-03-01', closedReason: 'dropped',
        history: [{ d: '2026-01-01', t: 'x' }]
      }));
      for (const k of ['status', 'notes', 'appliedAt', 'nextAction', 'nextActionText',
                       'closedAt', 'closedReason', 'history', 'id', 'demo']) ok(!(k in v));
    },
    '#14 : champs d’action optionnels — absents quand vides, gardés quand posés': () => {
      const nu = normalizeContact({ name: 'A' });
      ok(!('activatedAt' in nu)); ok(!('src' in nu));
      const on = normalizeContact({ name: 'A', activatedAt: '2026-07-01T10:00:00Z', src: 'promo' });
      eq(on.activatedAt, '2026-07-01');                  /* horodatage → tronqué au jour */
      eq(on.src, 'promo');
      ok(!('activatedAt' in normalizeContact({ name: 'A', activatedAt: 'zzz' })));
      ok(!('src' in normalizeContact({ name: 'A', src: 'autre' })));
      const c = normalizeCompany({ name: 'X', nextActionCt: 'ct_1', contacts: [{ id: 'ct_1', name: 'A' }] });
      eq(c.nextActionCt, 'ct_1');
      ok(!('nextActionCt' in normalizeCompany({ name: 'X' })));
      ok(!('nextActionCt' in normalizeCompany({ name: 'X', nextActionCt: '"><b>' })));
      ok(isActiveCt(on) && !isActiveCt(nu));
      ok(nextActionContact(c) === c.contacts[0]);
      eq(nextActionContact(normalizeCompany({ name: 'X', nextActionCt: 'ct_9' })), null);
    },
    '#14 : migration en lecture — les champs remontent d’extra (vieil appareil)': () => {
      const ct = normalizeContact({ name: 'A', extra: { activatedAt: '2026-06-01', src: 'promo', garde: 1 } });
      eq(ct.activatedAt, '2026-06-01'); eq(ct.src, 'promo'); eq(ct.extra, { garde: 1 });
      const c = normalizeCompany({ name: 'X', extra: { nextActionCt: 'ct_9', garde: 2 } });
      eq(c.nextActionCt, 'ct_9'); eq(c.extra, { garde: 2 });
      ok(!('extra' in normalizeContact({ name: 'A', extra: { src: 'promo' } })));
    },
    '#14 : communityView ne fuit rien — champs et doublons d’extra purgés': () => {
      const v = communityView({ name: 'X', nextActionCt: 'ct_1',
        extra: { nextActionCt: 'ct_1', garde: 1 },
        contacts: [{ name: 'Ana', activatedAt: '2026-06-01', src: 'promo',
                     extra: { activatedAt: '2026-06-01', src: 'promo', garde: 2 } }] });
      ok(!('nextActionCt' in v)); eq(v.extra, { garde: 1 });
      ok(!('activatedAt' in v.contacts[0])); ok(!('src' in v.contacts[0]));
      eq(v.contacts[0].extra, { garde: 2 });
    },
    '#14 : fusion — activation entrante vidée, contact reçu marqué « promo »': () => {
      const comps = [normalizeCompany({ name: 'Alpha', city: 'Lille',
        contacts: [{ name: 'Ana', email: 'ana@x.fr', activatedAt: '2026-05-01' }] })];
      mergeIncoming([
        { name: 'Alpha', city: 'Lille', contacts: [
          { name: 'Ana', email: 'ana@x.fr', activatedAt: '2026-06-15' },
          { name: 'Rémi', email: 'remi@x.fr', activatedAt: '2026-06-15' }] },
        { name: 'Beta', nextActionCt: 'ct_1', contacts: [{ name: 'Zoé', email: 'z@x.fr', activatedAt: '2026-01-01' }] }
      ], comps);
      const a = comps[0], b = comps[1];
      eq(a.contacts[0].activatedAt, '2026-05-01');       /* mon suivi reste le mien */
      ok(!('src' in a.contacts[0]));                     /* pas re-marqué */
      ok(!a.contacts[1].activatedAt);                    /* l’entrant est vidé */
      eq(a.contacts[1].src, 'promo');
      ok(!b.nextActionCt);
      ok(!b.contacts[0].activatedAt); eq(b.contacts[0].src, 'promo');
    },
    '#16 : MIME sans pièce jointe — texte simple inchangé': () => {
      const m = buildMime({ from: 'a@x.fr', to: 'b@y.fr', subject: 'Salut', body: 'corps' });
      ok(m.includes('Content-Type: text/plain; charset=UTF-8'));
      ok(!m.includes('multipart'));
      ok(m.includes(btoa('corps')));
    },
    '#16 : MIME avec pièce jointe — multipart/mixed complet': () => {
      const m = buildMime({ from: 'a@x.fr', to: 'b@y.fr', subject: 'CV', body: 'voici',
        attachments: [{ name: 'cv "cyber".pdf', type: 'application/pdf', b64: 'QUJD' }] });
      const bd = /boundary="([^"]+)"/.exec(m);
      ok(!!bd && m.includes('multipart/mixed'));
      ok(m.split('--' + bd[1]).length === 4);            /* texte + pièce + fermeture */
      ok(m.includes('Content-Disposition: attachment; filename="cv cyber.pdf"'));
      ok(m.includes('QUJD'));
      ok(m.trim().endsWith('--' + bd[1] + '--'));
    },
    'statuts : migration v5 → 3 crans + clôture': () => {
      eq(normalizeCompany({ name: 'X', status: 'sent' }).status, 'active');
      eq(normalizeCompany({ name: 'X', status: 'followup' }).status, 'active');
      eq(normalizeCompany({ name: 'X', status: 'interview' }).status, 'reply');
      eq(normalizeCompany({ name: 'X', status: 'inconnu' }).status, 'todo');
      const won = normalizeCompany({ name: 'X', status: 'won', updatedAt: Date.UTC(2026, 0, 15) });
      eq(won.closedReason, 'won'); eq(won.closedAt, '2026-01-15'); eq(won.status, 'reply');
      const rej = normalizeCompany({ name: 'X', status: 'rejected' });
      eq(rej.closedReason, 'rejected'); ok(!!rej.closedAt);
      /* les nouvelles valeurs passent inchangées */
      const c = normalizeCompany({ name: 'X', status: 'active', closedReason: 'dropped', closedAt: '2026-02-02' });
      eq(c.status, 'active'); eq(c.closedReason, 'dropped'); eq(c.closedAt, '2026-02-02');
      eq(normalizeCompany({ name: 'X', closedReason: 'zzz' }).closedReason, '');
    },
    'findMatch : même ville = fusion, ville ≠ = nouvelle': () => {
      const comps = [normalizeCompany({ name: 'Capgemini', city: 'Lille' })];
      ok(findMatch({ name: 'capgemini', city: 'LILLE' }, comps) === comps[0]);
      ok(findMatch({ name: 'Capgemini', city: 'Paris' }, comps) === null);
    },
    'findMatch : homonymes ambigus → nouvelle piste (B8)': () => {
      const two = [
        normalizeCompany({ name: 'Capgemini', city: 'Lille' }),
        normalizeCompany({ name: 'Capgemini', city: 'Paris' })
      ];
      ok(findMatch({ name: 'Capgemini' }, two) === null);
      const one = [normalizeCompany({ name: 'Capgemini', city: 'Lille' })];
      ok(findMatch({ name: 'Capgemini' }, one) === one[0]);
    },
    'fusion : complète sans écraser · conflits (D2) · ✓→? (S5) · privé exclu': () => {
      const comps = [normalizeCompany({
        name: 'Alpha', city: 'Lille', desc: 'garde-moi',
        contacts: [{ name: 'Ana', email: 'ana@x.fr' }]
      })];
      const st = mergeIncoming([
        { name: 'Alpha', city: 'Lille', desc: 'autre desc', techs: 'Azure',
          contacts: [
            { name: 'Ana Dupont', email: 'ana@x.fr', phone: '0601', conf: 'ok' },
            { name: 'Rémi', email: 'remi@x.fr', conf: 'ok' }
          ] },
        { name: 'Beta', status: 'won', notes: 'privé du voisin',
          nextActionText: 'Relancer', nextAction: '2026-01-01', closedReason: 'dropped' }
      ], comps);
      const a = comps[0], b = comps[1];
      eq(st.addedC, 1); eq(st.enriched, 1); eq(st.addedCt, 1); eq(st.conflicts, 2);
      eq(a.desc, 'garde-moi'); eq(a.techs, 'Azure');
      eq(a.contacts[0].name, 'Ana'); eq(a.contacts[0].phone, '0601');
      eq(a.contacts[0].conf, 'doubt'); eq(a.contacts[1].conf, 'doubt');
      eq(b.status, 'todo'); eq(b.notes, '');
      eq(b.nextAction, ''); eq(b.nextActionText, '');
      eq(b.closedAt, ''); eq(b.closedReason, '');
    },
    'parseInput : garde-fous de taille (D4)': async () => {
      try { await parseInput('x'.repeat(4000001)); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'troplourd'); }
      const many = JSON.stringify({ companies: Array.from({ length: 2001 }, (_, i) => ({ name: 'c' + i })) });
      try { await parseInput(many); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'tropdepistes'); }
    },

    /* — tests de sécurité (docs/audit-securite.md) — */
    'OC2 : contenu altéré → refusé (tag GCM)': async () => {
      const enc = await encryptOC2({ a: 1 }, 'mdp');
      const p = enc.split('.');
      const ct = Array.from(atob(p[5]), ch => ch.charCodeAt(0));
      ct[0] ^= 0xFF;                                     /* un octet retourné */
      p[5] = btoa(String.fromCharCode.apply(null, ct));
      try { await decryptOC2(p.join('.'), 'mdp'); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'motdepasse'); }
    },
    'OCQ1 : bombe de décompression → refusée (troplourd)': async () => {
      if (typeof CompressionStream === 'undefined') return;
      /* quelques Ko compressés qui gonflent au-delà de la borne de 4 Mo */
      const raw = new TextEncoder().encode('"' + 'x'.repeat(4200000) + '"');
      const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const u8 = new Uint8Array(await new Response(stream).arrayBuffer());
      ok(u8.length < 100000);                            /* la bombe est bien petite */
      const b64url = bytesToB64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      try { await parseInput('OCQ1.' + b64url); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'troplourd'); }
    },
    'sécurité : un id piégé est régénéré, un id normal est gardé (S2)': () => {
      eq(normalizeCompany({ name: 'X', id: 'c_abc_12345' }).id, 'c_abc_12345');
      const evil = normalizeCompany({ name: 'X', id: '"><img src=x onerror=alert(1)>' });
      ok(/^[A-Za-z0-9._-]{1,64}$/.test(evil.id));
      const ct = normalizeContact({ name: 'A', id: '"><b>' });
      ok(/^[A-Za-z0-9._-]{1,64}$/.test(ct.id));
    },
    'sécurité : une date piégée est vidée, une date ISO passe (S3)': () => {
      const c = normalizeCompany({ name: 'X', nextAction: '<img src=x>', appliedAt: 'zzz',
        closedAt: '2026-01-05T10:00:00Z', closedReason: 'won', verifiedAt: '2026-02-03' });
      eq(c.nextAction, ''); eq(c.appliedAt, '');
      eq(c.closedAt, '2026-01-05');                      /* horodatage → tronqué au jour */
      eq(c.verifiedAt, '2026-02-03');
      eq(normalizeCompany({ name: 'X', nextAction: '2026-03-01' }).nextAction, '2026-03-01');
    },
    'sécurité : « __proto__ » reçu = donnée ignorée, jamais un détournement (S4)': () => {
      const evil = JSON.parse('{"name":"X","futur":1,"__proto__":{"pwned":1},"extra":{"__proto__":{"pwned":2},"garde":3}}');
      const c = normalizeCompany(evil);
      ok(!('pwned' in {}));                              /* Object.prototype intact */
      ok(!('pwned' in c));
      eq(c.extra.futur, 1); eq(c.extra.garde, 3);
      ok(!Object.keys(c.extra).includes('__proto__'));
      const p = normalizeProfile(JSON.parse('{"name":"Moi","__proto__":{"pwned":4}}'));
      ok(!('pwned' in {}));
      eq(p.name, 'Moi');
      /* un id littéralement « __proto__ » reste une simple clé de la sync */
      const r = syncMerge({ companies: [{ id: '__proto__', name: 'Y', updatedAt: 5 }],
                            tombs: [{ id: '__proto__', t: 1 }] },
                          { companies: [], tombs: [] });
      ok(!('pwned' in {}));
      eq(r.companies.length, 1);
      eq(r.companies[0].name, 'Y');
    },

    /* — l'état honnête d'une liaison P2P (incident #14) — */
    'transport : relayTally compte les sockets par état': () => {
      eq(relayTally(null), { total: 0, open: 0, pending: 0 });
      eq(relayTally({}), { total: 0, open: 0, pending: 0 });
      eq(relayTally({
        a: { readyState: 1 }, b: { readyState: 0 }, c: { readyState: 3 }, d: null
      }), { total: 3, open: 1, pending: 1 });
    },
    'transport : la salle seule ne vaut jamais « à jour »': () => {
      const base = { relays: { total: 5, open: 0 }, peers: 0, exchanged: false, rtcFail: false, graceOver: false };
      /* démarrage : relais pas encore ouverts = connexion, pas une promesse */
      eq(liaisonStage(base), 'connecting');
      /* aucun relais passé le délai de grâce = panne DITE */
      eq(liaisonStage({ ...base, graceOver: true }), 'norelay');
      /* relais joints, personne en face = attente honnête */
      eq(liaisonStage({ ...base, relays: { total: 5, open: 2 } }), 'wait');
      /* pair annoncé mais WebRTC en échec = dit aussi */
      eq(liaisonStage({ ...base, relays: { total: 5, open: 2 }, rtcFail: true }), 'rtcfail');
      /* …sauf si les relais sont morts : la panne amont prime */
      eq(liaisonStage({ ...base, rtcFail: true, graceOver: true }), 'norelay');
      /* pair connecté SANS échange reçu = liaison, pas « à jour » */
      eq(liaisonStage({ ...base, relays: { total: 5, open: 2 }, peers: 1 }), 'link');
      /* « à jour » exige pair + échange réellement reçu */
      eq(liaisonStage({ ...base, relays: { total: 5, open: 2 }, peers: 1, exchanged: true }), 'on');
    },
    'transport : parseTurn accepte le bon, refuse le reste': () => {
      eq(parseTurn(''), []);
      eq(parseTurn('turns:r.exemple.org:443 moi secret'),
        [{ urls: 'turns:r.exemple.org:443', username: 'moi', credential: 'secret' }]);
      eq(turnText(parseTurn('turns:a.fr:443 u p\nturn:b.fr:3478 v q')), 'turns:a.fr:443 u p\nturn:b.fr:3478 v q');
      let e1 = ''; try { parseTurn('wss://pas-turn.fr u p'); } catch (e) { e1 = e.message; }
      eq(e1, 'adresse');
      /* RTCPeerConnection refuse turn: sans identifiants — parseTurn aussi */
      let e2 = ''; try { parseTurn('turn:a.fr:3478'); } catch (e) { e2 = e.message; }
      eq(e2, 'adresse');
      let e3 = ''; try { parseTurn('turn:a.fr un deux trois'); } catch (e) { e3 = e.message; }
      eq(e3, 'adresse');
      let e4 = ''; try { parseTurn(Array.from({ length: TURN_MAX + 1 }, (x, i) => 'turn:h' + i + '.fr u p').join('\n')); } catch (e) { e4 = e.message; }
      eq(e4, 'quatre');
    },

    /* — tests de contrat (CONTRAT.md) : ce qui ne doit JAMAIS casser — */
    'contrat : clés de stockage inchangées': () => {
      eq(DATA_KEY, 'oc_data_v3');
      eq(PROFILE_KEY, 'oc_profile_v1');
      eq(JOURNAL_KEY, 'oc_journal_v1');
      eq(ORPHANS_KEY, 'oc_orphans_v1');
      eq(TOMBS_KEY, 'oc_tombs_v1');
      eq(SYNC_KEY, 'oc_sync_v1');
      eq(RELAYS_KEY, 'oc_relays_v1');
      eq(TURN_KEY, 'oc_turn_v1');
      ok(SEALABLE.has(TURN_KEY));   /* des identifiants TURN se scellent comme les relais */
      eq(DEVICE_KEY, 'oc_device_v1');
      eq(DEVICES_KEY, 'oc_devices_v1');
      eq(PROMO_KEY, 'oc_promo_v1');
      eq(VAULT_KEY, 'oc_vault_v1');
      eq(THEME_KEY, 'oc_theme');
      eq(VIEW_KEY, 'oc_view');
      eq(OLD_V2, 'oc_data_v2');
      eq(OLD_V1, 'ais_stage_targets_v1');
    },
    'dates : todayISO est en heure locale, jamais UTC': () => {
      const d = new Date();
      const manuel = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
                     '-' + String(d.getDate()).padStart(2, '0');
      eq(todayISO(), manuel);
      eq(localISO(new Date(2026, 0, 5)), '2026-01-05');
    },
    'liens : safeUrl neutralise les schémas dangereux (S1)': () => {
      eq(safeUrl('javascript:alert(1)'), '');
      eq(safeUrl('data:text/html,x'), '');
      eq(safeUrl('vbscript:x'), '');
      eq(safeUrl('https://linkedin.com/in/ana'), 'https://linkedin.com/in/ana');
      eq(safeUrl('HTTP://x.fr/y'), 'HTTP://x.fr/y');
      eq(safeUrl('linkedin.com/in/ana'), 'https://linkedin.com/in/ana');
      eq(safeUrl(''), '');
      eq(normalizeContact({ name: 'A', link: 'javascript:alert(1)' }).link, '');
      eq(normalizeContact({ name: 'A', link: 'linkedin.com/in/a' }).link, 'https://linkedin.com/in/a');
    },
    'sync appareils : LWW par updatedAt, ajouts, tombstones': () => {
      const A = {
        companies: [
          normalizeCompany({ id: 'c1', name: 'Alpha', notes: 'version A', updatedAt: 100 }),
          normalizeCompany({ id: 'c2', name: 'Beta', updatedAt: 100 })
        ],
        orphans: [], profile: normalizeProfile({ name: 'Moi A', updatedAt: 50 }), tombs: []
      };
      const B = {
        companies: [
          normalizeCompany({ id: 'c1', name: 'Alpha', notes: 'version B plus récente', status: 'active', updatedAt: 200 }),
          normalizeCompany({ id: 'c3', name: 'Gamma', updatedAt: 100 })
        ],
        orphans: [normalizeContact({ id: 'o1', name: 'Léo' })],
        profile: normalizeProfile({ name: 'Moi B', updatedAt: 80 }),
        tombs: [{ id: 'c2', t: 300 }]
      };
      const r = syncMerge(B, A);
      eq(r.stats.addedC, 1);                       /* Gamma */
      eq(r.stats.updatedC, 1);                     /* Alpha version B */
      eq(r.stats.removedC, 1);                     /* Beta tuée par la tombstone */
      eq(r.stats.addedO, 1);
      eq(r.stats.profile, 'remote');
      const names = r.companies.map(c => c.name).sort();
      eq(names, ['Alpha', 'Gamma']);
      const alpha = r.companies.find(c => c.id === 'c1');
      eq(alpha.notes, 'version B plus récente');   /* le privé circule entre MES appareils */
      eq(alpha.status, 'active');
      eq(r.profile.name, 'Moi B');
      eq(r.tombs, [{ id: 'c2', t: 300 }]);
    },
    'sync appareils : une fiche modifiée APRÈS suppression ressuscite': () => {
      const local = { companies: [normalizeCompany({ id: 'c1', name: 'X', updatedAt: 500 })], tombs: [] };
      const remote = { companies: [], tombs: [{ id: 'c1', t: 400 }] };
      const r = syncMerge(remote, local);
      eq(r.companies.length, 1);
      eq(r.stats.removedC, 0);
    },
    'sync appareils : idempotente et symétrique (convergence)': () => {
      const A = { companies: [normalizeCompany({ id: 'c1', name: 'X', updatedAt: 100 })], tombs: [{ id: 'z', t: 10 }] };
      const B = { companies: [normalizeCompany({ id: 'c1', name: 'X ancien', updatedAt: 50 }),
                              normalizeCompany({ id: 'c2', name: 'Y', updatedAt: 60 })], tombs: [] };
      const ab = syncMerge(B, A);
      const ab2 = syncMerge(B, { companies: ab.companies, tombs: ab.tombs });
      eq(ab2.stats.addedC + ab2.stats.updatedC + ab2.stats.removedC, 0);   /* rejouer = rien */
      const ba = syncMerge(A, B);
      eq(ab.companies.map(c => c.id).sort(), ba.companies.map(c => c.id).sort());
      eq(ab.companies.find(c => c.id === 'c1').name, ba.companies.find(c => c.id === 'c1').name);
    },
    'sync appareils : mergeTombs plafonne et garde les plus récentes': () => {
      const many = Array.from({ length: TOMBS_MAX + 50 }, (_, i) => ({ id: 'k' + i, t: i }));
      const m = mergeTombs(many, [{ id: 'k0', t: 9999 }]);
      eq(m.length, TOMBS_MAX);
      eq(m[0], { id: 'k0', t: 9999 });
    },
    'profil : prompts IA — un seul défaut, bornés (8 × 4 000)': () => {
      const p = normalizeProfile({});
      eq(p.prompts.length, 1);
      eq(p.prompts[0].name, 'Mes emails → pistes');
      ok(p.prompts[0].text.includes('"kind":"share"'));
      const many = normalizeProfile({ prompts: Array.from({ length: 12 }, (_, i) => ({ name: 'P' + i, text: 'x'.repeat(9000) })) });
      eq(many.prompts.length, PROMPTS_MAX);
      eq(many.prompts[0].text.length, PROMPT_MAX_LEN);
      eq(normalizeProfile({ prompts: [{ text: 'y' }] }).prompts[0].name, 'Prompt');
    },
    'contrat : OCQP — découpe du QR animé et réassemblage dans le désordre': () => {
      const court = 'OCQ1.petit';
      eq(splitOCQ(court), [court]);                       /* court = un seul QR, format inchangé */
      const long = 'OCQ1.' + 'x'.repeat(OCQP_CHUNK * 2 + 100);
      const parts = splitOCQ(long);
      eq(parts.length, 3);
      ok(parts.every((p, i) => p.startsWith('OCQP.' + (i + 1) + '.3.')));
      const j = makeOCQJoiner();
      let r = null;
      for (const p of [parts[2], parts[0], parts[1]]) r = j(p);   /* n'importe quel ordre */
      eq(r.done, true);
      eq(r.text, long);
      eq(j('OCQ1.abc'), null);                            /* pas une tranche : au lecteur normal */
      /* les doublons ne comptent qu'une fois */
      const j2 = makeOCQJoiner();
      j2(parts[0]); j2(parts[0]);
      eq(j2(parts[0]).got, 1);
    },
    'contrat : enveloppe « full » — champ tombs optionnel': () => {
      const prof = normalizeProfile({ name: 'Moi' });
      ok(!('tombs' in fullPayload([], prof)));
      eq(fullPayload([], prof, null, [{ id: 'a', t: 1 }]).tombs, [{ id: 'a', t: 1 }]);
    },
    'contrat : schéma d’une piste normalisée (27 champs exacts)': () => {
      eq(Object.keys(normalizeCompany({ name: 'X' })).sort(),
         ['address','appliedAt','city','closedAt','closedReason','confirmations','contacts',
          'createdAt','demo','desc','domain','history','id','lat','lng','name','nextAction',
          'nextActionText','notes','positions','process','status','techs','tips',
          'updatedAt','verifiedAt','website'].sort());
    },
    'contrat : schéma d’un contact normalisé (8 champs exacts)': () => {
      eq(Object.keys(normalizeContact({ name: 'A' })).sort(),
         ['conf','email','id','link','name','note','phone','role'].sort());
    },
    'contrat : enveloppe « share » — v4, sans profil ni champ privé': () => {
      const p = sharePayload([normalizeCompany({ name: 'X', status: 'active', notes: 'privé',
        appliedAt: '2026-01-01', nextActionText: 'Relancer', closedReason: 'dropped' })]);
      eq(p.v, 4); eq(p.kind, 'share'); eq(p.app, APP_VERSION);
      ok(!('profile' in p));
      for (const k of ['status','notes','appliedAt','nextAction','nextActionText',
                       'closedAt','closedReason','history','id','demo']) ok(!(k in p.companies[0]));
    },
    'contrat : enveloppe « full » — v4, avec profil (sauvegarde complète)': () => {
      const prof = normalizeProfile({ name: 'Moi' });
      const p = fullPayload([normalizeCompany({ name: 'X', notes: 'privé' })], prof);
      eq(p.v, 4); eq(p.kind, 'full'); eq(p.app, APP_VERSION);
      ok(p.profile === prof);
      eq(p.companies[0].notes, 'privé');   /* la sauvegarde, elle, garde le privé */
      ok(!('orphans' in p));               /* champ optionnel : absent si vide */
      const o = [normalizeContact({ name: 'Léo', email: 'leo@x.fr' })];
      eq(fullPayload([], prof, o).orphans, o);
    },
    'contrat : OCQ1 — aller-retour compact (QR), sans privé': async () => {
      if (typeof CompressionStream === 'undefined') return;   /* API absente : repli fichier assuré par l’UI */
      const src = normalizeCompany({ name: 'Oméga', city: 'Arras', techs: 'PfSense',
        status: 'active', notes: 'privé', contacts: [{ name: 'Zoé', email: 'z@x.fr' }] });
      const txt = await encodeOCQ([src]);
      ok(txt.startsWith('OCQ1.'));
      ok(!txt.includes('+') && !txt.includes('/') && !txt.includes('='));   /* base64url pur */
      const obj = await parseInput(txt);
      eq(obj.kind, 'share');
      eq(obj.companies[0].name, 'Oméga'); eq(obj.companies[0].techs, 'PfSense');
      ok(!('notes' in obj.companies[0]) && !('status' in obj.companies[0]));
      const dest = [];
      mergeIncoming(obj.companies, dest);
      eq(dest[0].contacts[0].email, 'z@x.fr');
    },
    'contrat : partage → réception, aller-retour sans perte (clair)': async () => {
      const src = normalizeCompany({ name: 'Gamma', city: 'Lyon', domain: 'cloud',
        techs: 'K8s', contacts: [{ name: 'Léa', email: 'lea@x.fr' }] });
      const obj = await parseInput(JSON.stringify(sharePayload([src])));
      eq(obj.kind, 'share');
      const dest = [];
      const st = mergeIncoming(obj.companies, dest);
      eq(st.addedC, 1);
      eq(dest[0].name, 'Gamma'); eq(dest[0].city, 'Lyon'); eq(dest[0].techs, 'K8s');
      eq(dest[0].contacts[0].email, 'lea@x.fr');
      eq(dest[0].status, 'todo'); eq(dest[0].notes, '');
    },
    'contrat : partage chiffré — mot de passe exigé puis accepté': async () => {
      const txt = await encryptOC2(sharePayload([normalizeCompany({ name: 'Delta' })]), 'promo2026');
      try { await parseInput(txt); throw new Error('accepté sans mot de passe !'); }
      catch (e) { eq(e.message, 'besoinpass'); }
      const obj = await parseInput(txt, 'promo2026');
      eq(obj.companies[0].name, 'Delta');
    },
    'OC1 : contenu altéré → refusé': () => {
      try { unsealOC1('OC1.abcd.QUJDRA=='); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'altéré'); }
    },
    'fusion : idempotente (re-fusionner le même fichier n’ajoute rien)': () => {
      const incoming = [{ name: 'Epsilon', city: 'Nice', contacts: [{ name: 'Sam', email: 's@x.fr' }] }];
      const dest = [];
      mergeIncoming(incoming, dest);
      const st2 = mergeIncoming(incoming, dest);
      eq(dest.length, 1);
      eq(st2.addedC, 0); eq(st2.addedCt, 0); eq(st2.conflicts, 0);
    },
    'profil : normalizeProfile répare les invariants': () => {
      const p = normalizeProfile(null);
      ok(Array.isArray(p.templates) && p.templates.length >= 1);
      ok(Array.isArray(p.confirmedIds));
      ok(p.flags && typeof p.flags === 'object');
      const q = normalizeProfile({ name: 'Moi', templates: 'cassé', confirmedIds: null, flags: 3 });
      eq(q.name, 'Moi');
      ok(Array.isArray(q.templates) && q.templates.length >= 1);
      ok(Array.isArray(q.confirmedIds));
      ok(q.flags && typeof q.flags === 'object');
    },
    'gabarits : fillTpl remplit piste, contact et profil': () => {
      const c = normalizeCompany({ name: 'Zeta', city: 'Lille' });
      const prof = normalizeProfile({ name: 'Ana B', formation: 'AIS' });
      eq(fillTpl('{{contact}} / {{entreprise}} ({{ville}}) — {{moi}}, {{formation}}', c, null, prof),
         'Madame, Monsieur / Zeta (Lille) — Ana B, AIS');
      eq(fillTpl('{{contact}}', c, { name: 'Léo' }, prof), 'Léo');
    },
    'gabarits : un jeton vide referme son trou, jamais « — » ni « en formation , »': () => {
      const c = normalizeCompany({ name: 'Zeta' });
      const vide = normalizeProfile({});
      /* le séparateur collé au jeton vide part avec lui */
      eq(fillTpl('Candidature spontanée — {{formation}}', c, null, vide), 'Candidature spontanée');
      /* « Étiquette : {{jeton}} » : la ligne entière saute */
      eq(fillTpl('Bonjour,\nVous trouverez mon CV ici : {{cv}}\nMerci.', c, null, vide),
         'Bonjour,\nMerci.');
      /* une ligne qui ne pesait que des jetons vides disparaît */
      eq(fillTpl('Merci,\n{{moi}} — {{tel}} — {{email}}', c, null, vide), 'Merci,');
      /* au milieu d'une phrase : l'espace parasite avant la virgule part */
      eq(fillTpl('En formation {{formation}}, je cherche.', c, null, vide),
         'En formation, je cherche.');
      /* rempli, rien n'est retouché — même les jetons voisins */
      const plein = normalizeProfile({ name: 'Ana B', formation: 'AIS', phone: '06', email: 'a@b.fr' });
      eq(fillTpl('Merci,\n{{moi}} — {{tel}} — {{email}}', c, null, plein),
         'Merci,\nAna B — 06 — a@b.fr');
      /* une ligne SANS jeton vide garde sa typographie française */
      eq(fillTpl('Merci {{moi}} !\nBien à vous : {{email}}', c, null, plein),
         'Merci Ana B !\nBien à vous : a@b.fr');
    },
    'score : borné 0–100, croissant avec la complétude': () => {
      const vide = scoreOf(normalizeCompany({ name: 'X' }));
      const pleine = scoreOf(normalizeCompany({
        name: 'X', city: 'Lille', desc: 'd', website: 'w', techs: 't', process: 'p', tips: 'c',
        positions: ['stage'], contacts: [{ name: 'A', email: 'a@b.fr' }],
        lat: 50, lng: 3, verifiedAt: new Date().toISOString().slice(0,10), confirmations: 3
      }));
      ok(vide >= 0 && vide <= 100 && pleine >= 0 && pleine <= 100);
      ok(pleine > vide);
    },
    'filtres : q / domaine / statut + tri A→Z (sans lire l’écran)': () => {
      const list = [
        normalizeCompany({ name: 'Bravo', city: 'Paris', domain: 'cyber', status: 'active', techs: 'Azure' }),
        normalizeCompany({ name: 'Alpha', city: 'Lille', domain: 'esn' })
      ];
      eq(filterCompanies(list, { q: 'azure' }).map(c => c.name), ['Bravo']);
      eq(filterCompanies(list, { domain: 'esn' }).map(c => c.name), ['Alpha']);
      eq(filterCompanies(list, { status: 'active' }).map(c => c.name), ['Bravo']);
      eq(filterCompanies(list, { sort: 'az' }).map(c => c.name), ['Alpha', 'Bravo']);
    },
    'recherche : les accents se plient, et DEUX mots cherchent deux mots': () => {
      const list = [
        normalizeCompany({ name: 'Cyberdéfense Lyon', city: 'Lyon', domain: 'cyber',
          techs: 'SOC managé, Fortinet', contacts: [{ name: 'Léa Bérard', role: 'RH' }] }),
        normalizeCompany({ name: 'CloudNine', city: 'Lille', domain: 'cloud',
          desc: 'Société d’hébergement, agréée HDS' }),
        normalizeCompany({ name: 'Thales', city: 'Gennevilliers', domain: 'cyber' })
      ];
      const noms = q => filterCompanies(list, { q }).map(c => c.name);
      /* on tape sans accent sur un téléphone — la fiche, elle, en porte */
      eq(noms('cyberdefense'), ['Cyberdéfense Lyon']);
      eq(noms('societe'), ['CloudNine']);
      eq(noms('berard'), ['Cyberdéfense Lyon']);
      eq(noms('Bérard'), ['Cyberdéfense Lyon']);          /* et l'inverse marche aussi */
      /* deux mots venus de DEUX champs, dans n'importe quel ordre */
      eq(noms('cyber lyon'), ['Cyberdéfense Lyon']);
      eq(noms('lyon cyber'), ['Cyberdéfense Lyon']);
      eq(noms('lea cyber'), ['Cyberdéfense Lyon']);
      eq(noms('  CYBER  ').length, 2);                    /* espaces et casse : sans effet */
      eq(noms('zzz'), []);
      eq(noms('').length, 3);                             /* rien tapé = tout */
      /* l’apostrophe typographique de la donnée se tape droite */
      eq(noms("d'hebergement"), ['CloudNine']);
    },
    'recherche : la ligne dit POURQUOI elle est là — sauf si c’est déjà à l’écran': () => {
      const c = normalizeCompany({ name: 'Cyberdéfense Lyon', city: 'Lyon', domain: 'cyber',
        techs: 'SOC managé, Fortinet', contacts: [{ name: 'Léa Bérard', role: 'RH' }] });
      const vu = { skip: ['name', 'city'] };
      /* le nom explique « cyber » : rien à ajouter */
      eq(searchHint(c, 'cyber', vu), null);
      /* la techno, elle, est invisible sur la ligne */
      const h = searchHint(c, 'soc', vu);
      eq(h.field, 'techs');
      eq(h.text.slice(h.marks[0][0], h.marks[0][0] + h.marks[0][1]), 'SOC');
      /* trouvé sans accent, surligné AVEC : les positions restent alignées */
      const b = searchHint(c, 'berard', vu);
      eq(b.field, 'contact');
      eq(b.text.slice(b.marks[0][0], b.marks[0][0] + b.marks[0][1]), 'Bérard');
      /* un mot déjà visible + un mot caché : c’est le caché qui parle */
      eq(searchHint(c, 'lea cyber', vu).field, 'contact');
      /* un long champ se coupe autour de la trouvaille, jamais au milieu du mot */
      const long = normalizeCompany({ name: 'X',
        desc: 'a'.repeat(120) + ' agréée HDS depuis 2019 ' + 'b'.repeat(120) });
      const e = searchHint(long, 'hds', { skip: ['name', 'city'], max: 40 });
      eq(e.text.slice(e.marks[0][0], e.marks[0][0] + e.marks[0][1]), 'HDS');
      ok(e.text.length <= 42, 'l’extrait tient dans sa fenêtre');
      /* l'extrait garde le mot qui PORTE la trouvaille : se caler sur
         l'espace d'après rendait « …SOC », soit le mot cherché tout seul
         — rien de plus que le surlignage. Il recule donc. */
      const porte = normalizeCompany({ name: 'Thales', techs: 'Cybersécurité, SOC' });
      eq(searchHint(porte, 'soc', vu).text, 'Cybersécurité, SOC');
      eq(searchHint(c, '', vu), null);
      eq(searchHint(c, 'zzz', vu), null);
    },
    'recherche : le bac « à rattacher » suit, l’écran ne se contredit plus': () => {
      const bac = [
        { name: 'Nadia Rahmani', role: 'RH', email: 'n.rahmani@orange.fr', extra: { company: 'Orange Cyberdefense' } },
        { name: 'Paul Mercier', phone: '0612345678' }
      ];
      eq(filterOrphans(bac, 'nadia').map(o => o.name), ['Nadia Rahmani']);
      eq(filterOrphans(bac, 'rahmani orange').map(o => o.name), ['Nadia Rahmani']);
      eq(filterOrphans(bac, '0612').map(o => o.name), ['Paul Mercier']);
      eq(filterOrphans(bac, 'zzz'), []);
      eq(filterOrphans(bac, '').length, 2);
      eq(filterOrphans(null, 'x'), []);
    },
    'tri « À faire » : la prochaine action la plus proche d’abord, sans rien de prévu à la fin': () => {
      const list = [
        normalizeCompany({ name: 'SansRien', updatedAt: 900 }),
        normalizeCompany({ name: 'Loin', nextAction: '2030-06-01', updatedAt: 1 }),
        normalizeCompany({ name: 'Retard', nextAction: '2020-01-01', updatedAt: 1 })
      ];
      eq(filterCompanies(list, { sort: 'action' }).map(c => c.name), ['Retard', 'Loin', 'SansRien']);
    },
    'tri « Près de moi » : distance croissante, sans coordonnées à la fin': () => {
      const list = [
        normalizeCompany({ name: 'SansCoord' }),
        normalizeCompany({ name: 'Paris', lat: 48.85, lng: 2.35 }),
        normalizeCompany({ name: 'Lille', lat: 50.63, lng: 3.06 })
      ];
      eq(filterCompanies(list, { sort: 'dist', userPos: { lat: 50.69, lng: 3.17 } }).map(c => c.name),
         ['Lille', 'Paris', 'SansCoord']);
      eq(filterCompanies(list, { sort: 'dist', dir: 'desc', userPos: { lat: 50.69, lng: 3.17 } }).map(c => c.name),
         ['Paris', 'Lille', 'SansCoord']);
    },
    'tri : ↑↓ inverse chaque critère, les vides restent en fin': () => {
      const list = [
        normalizeCompany({ name: 'Bravo', updatedAt: 300 }),
        normalizeCompany({ name: 'Alpha', nextAction: '2030-06-01', updatedAt: 100 }),
        normalizeCompany({ name: 'Charlie', nextAction: '2020-01-01', updatedAt: 200 })
      ];
      eq(filterCompanies(list, { sort: 'az', dir: 'desc' }).map(c => c.name), ['Charlie', 'Bravo', 'Alpha']);
      eq(filterCompanies(list, { sort: 'action', dir: 'desc' }).map(c => c.name), ['Alpha', 'Charlie', 'Bravo']);
      eq(filterCompanies(list, { sort: 'recent', dir: 'asc' }).map(c => c.name), ['Alpha', 'Charlie', 'Bravo']);
    },
    'tri multi-niveaux : principal + départages, chacun son sens (3 max)': () => {
      const list = [
        normalizeCompany({ name: 'ActifLoin', status: 'active', nextAction: '2030-01-01', updatedAt: 1 }),
        normalizeCompany({ name: 'ActifTot', status: 'active', nextAction: '2026-01-01', updatedAt: 2 }),
        normalizeCompany({ name: 'Todo', status: 'todo', updatedAt: 3 })
      ];
      eq(filterCompanies(list, { sorts: [{ sort: 'status' }, { sort: 'action' }] }).map(c => c.name),
         ['Todo', 'ActifTot', 'ActifLoin']);
      /* le départage a SON sens, indépendant du principal */
      eq(filterCompanies(list, { sorts: [{ sort: 'status' }, { sort: 'action', dir: 'desc' }] }).map(c => c.name),
         ['Todo', 'ActifLoin', 'ActifTot']);
      /* « dist » sans position et critère inconnu : ignorés sans casse */
      eq(filterCompanies(list, { sorts: [{ sort: 'dist' }, { sort: 'zzz' }, { sort: 'az' }] }).map(c => c.name),
         ['ActifLoin', 'ActifTot', 'Todo']);
      /* au-delà de 3 niveaux : coupé — et rien ne se perd */
      eq(filterCompanies(list, { sorts: [{ sort: 'az' }, { sort: 'recent' }, { sort: 'action' }, { sort: 'score' }] }).length, 3);
    },
    'tri : dir absent = sens naturel du critère': () => {
      eq(NATURAL_DIR.recent, 'desc'); eq(NATURAL_DIR.az, 'asc'); eq(NATURAL_DIR.action, 'asc');
      const list = [normalizeCompany({ name: 'A', updatedAt: 1 }), normalizeCompany({ name: 'B', updatedAt: 2 })];
      eq(filterCompanies(list, { sort: 'recent' }).map(c => c.name),
         filterCompanies(list, { sort: 'recent', dir: 'desc' }).map(c => c.name));
    },
    'fiche : le « Confirmer » résume ce qui a réellement changé': () => {
      const avant = { status: 'todo', notes: '', nextAction: '', nextActionText: '' };
      eq(summarizeChanges(avant, { status: 'active', notes: 'vu au forum', nextAction: '2026-01-05', nextActionText: 'Relancer' }),
         'Statut → En cours · À faire : Relancer — 05/01/2026 · Notes modifiées');
      eq(summarizeChanges(avant, Object.assign({}, avant)), '');   /* rien de changé = rien d'écrit */
      eq(summarizeChanges({ status: 'todo', notes: '', nextAction: '2026-01-05', nextActionText: 'X' },
                          { status: 'todo', notes: '', nextAction: '', nextActionText: '' }),
         'Action retirée');
    },
    'prochaine action : changer le « Quoi ? » seul se valide (non-régression)': async () => {
      const { askNextAction } = await import('./ui/actions.js');
      const c = normalizeCompany({ name: 'TestQuoi', nextAction: '2030-01-02', nextActionText: 'Relancer' });
      let got = null;
      const sh = askNextAction(c, {
        preset: 'Relancer', presetDate: '2030-01-02',
        onPick: (txt, iso) => { got = { txt, iso }; }
      });
      try {
        sh.body.querySelector('#naTxt').value = 'Relancer Mme Z';
        const okBtn = sh.ov.querySelector('.modal-f .btn-primary');
        ok(okBtn);                             /* le bouton de validation existe */
        okBtn.click();
        eq(got, { txt: 'Relancer Mme Z', iso: '2030-01-02' });
        /* « refermée » ne veut plus dire « retirée du document » : depuis
           que la sortie glisse, la feuille y reste ~140 ms pour ses seuls
           pixels. Elle est fermée dès qu'elle porte `ov-out` — la même
           définition que celle dont le reste de l'app se sert
           (`sheetOpen`, ui/dom.js). */
        ok(sh.ov.classList.contains('ov-out') || !document.body.contains(sh.ov));
      } finally {
        try { sh.close(null, true); } catch (e) {}
      }
    },
    'historique : pushHist plafonne à 40 entrées': () => {
      const c = normalizeCompany({ name: 'X' });
      for (let i = 0; i < 50; i++) pushHist(c, 't' + i);
      eq(c.history.length, 40);
      eq(c.history[39].t, 't49');
    },
    'doublons : contactKey — email > téléphone > nom+rôle': () => {
      eq(contactKey({ email: ' Ana@X.fr ' }), 'e:ana@x.fr');
      eq(contactKey({ phone: '06 01 02 03 04' }), 'p:0601020304');
      eq(contactKey({ name: 'Ana', role: 'RH' }), 'n:anarh');
      eq(contactKey({}), '');
    },
    /* ---------- le coffre (profil protégé) ---------- */
    'coffre : liste de mots — 256, uniques, phrase normalisée': () => {
      eq(VAULT_WORDS.length, 256);
      eq(new Set(VAULT_WORDS).size, 256);
      ok(VAULT_WORDS.every(w => /^[a-z]{3,9}$/.test(w)));
      eq(normVaultPhrase('  Éclair   FORÊT, chien '), 'eclair foret chien');
      eq(phraseUnknownWords('aigle zzz ancre'), ['zzz']);
      const r = makeVaultPhrase(n => new Uint8Array(n));   /* octets à 0 → 12 × 1er mot */
      eq(r, Array(PHRASE_LEN).fill(VAULT_WORDS[0]).join(' '));
    },
    'coffre : vecteurs stables — méta v1, OCV1, déverrouillage': async () => {
      /* hasard compteur : la méta et l'enveloppe sont figées — si ce
         test casse, le FORMAT a changé et les coffres existants aussi */
      let n = 0;
      const rnd = len => { const u = new Uint8Array(len); for (let i = 0; i < len; i++) u[i] = (n++) & 255; return u; };
      const phrase = makeVaultPhrase(rnd);
      eq(phrase, 'aigle ancre avion balai balle bambou banane barque bassin bateau biche bijou');
      const { meta, key } = await createVault('123456', phrase, { rnd, iter: 15000, at: 1752624000000 });
      eq(JSON.stringify(meta), '{"v":1,"gen":1,"at":1752624000000,"wraps":{"pin":{"it":15000,"s":"LC0uLzAxMjM0NTY3ODk6Ow==","i":"PD0+P0BBQkNERUZH","c":"orzOHlSEfKCq8U0YCZfi+MbyTvblwxdJyoJvZwsGA3F2YcW3woL6OQSh87xmSTcI"},"phrase":{"it":15000,"s":"SElKS0xNTk9QUVJTVFVWVw==","i":"WFlaW1xdXl9gYWJj","c":"MhygJSivFk2uv1yv13efdkeiCjokvjtsppmnWv0GRh9MWqj38reXiHqaDoQV5q7y"}}}');
      const u = await unlockWithPin(meta, '123456');
      const env = await sealValue(u.key, 'oc_test', 'secret-value', rnd);
      eq(env, 'OCV1.ZGVmZ2hpamtsbW5v.CYeg+aWD3YHyn/RP7tmFlR8op+Fo22JbQ24ZGA==');
      ok(isSealed(env));
      eq(await openValue(key, 'oc_test', env), 'secret-value');
    },
    'coffre : mauvais code, phrase tolérante, AAD lié au nom': async () => {
      const rnd = len => crypto.getRandomValues(new Uint8Array(len));
      const phrase = makeVaultPhrase(rnd);
      const { meta, key } = await createVault('123456', phrase, { iter: 15000 });
      try { await unlockWithPin(meta, '000000'); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'code'); }
      try { await unlockWithPhrase(meta, 'aigle aigle aigle'); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'phrase'); }
      const u = await unlockWithPhrase(meta, '  ' + phrase.toUpperCase() + ' ');
      ok(!!u.key);
      const env = await sealValue(key, 'oc_sync_v1', 'ma phrase de liaison');
      try { await openValue(key, 'oc_data_v3', env); throw new Error('ouvert !'); }
      catch (e) { eq(e.message, 'coffre'); }
    },
    'coffre : nouveau code, PRF, rotation (gén. +1, ancien code refusé)': async () => {
      const phrase = makeVaultPhrase();
      const { meta } = await createVault('111111', phrase, { iter: 15000 });
      /* changer le code exige de re-prouver un moyen d'accès */
      const meta2 = await setPin(meta, { pin: '111111' }, '222222', { iter: 15000 });
      ok(!!(await unlockWithPin(meta2, '222222')).key);
      try { await setPin(meta, { pin: '999999' }, '333333', { iter: 15000 }); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'code'); }
      /* PRF : un secret externe enveloppe et déverrouille */
      const secret = new Uint8Array(32).fill(7);
      const meta3 = await addPrfWrap(meta2, { pin: '222222' }, secret, 'cred-1', { iter: 15000 });
      ok(!!(await unlockWithPrf(meta3, secret)).key);
      try { await unlockWithPrf(meta3, new Uint8Array(32).fill(8)); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'secret'); }
      /* rotation : nouvelle clé maîtresse, génération incrémentée */
      const rot = await rotateVault(meta3, '444444', makeVaultPhrase(), { iter: 15000 });
      eq(rot.meta.gen, 2);
      try { await unlockWithPin(rot.meta, '222222'); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'code'); }
      ok(!!(await unlockWithPin(rot.meta, '444444')).key);
    },
    'coffre : rotation interrompue — reprise par `prev`, rien de perdu': async () => {
      const phrase = makeVaultPhrase();
      const { meta, key } = await createVault('111111', phrase, { iter: 15000 });
      const e1 = await sealValue(key, 'k1', 'valeur-1');
      const e2 = await sealValue(key, 'k2', 'valeur-2');
      /* la rotation exige de re-prouver un secret, jamais la clé seule */
      try { await rotateVaultResumable(meta, { pin: '999999' }, '222222', makeVaultPhrase(), { iter: 15000 }); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'code'); }
      const rot = await rotateVaultResumable(meta, { phrase }, '222222', makeVaultPhrase(), { iter: 15000 });
      eq(rot.meta.gen, 2);
      ok(isSealed(rot.meta.prev));
      /* « crash » simulé : la méta est écrite, seule k1 est re-scellée */
      const n1 = await sealValue(rot.key, 'k1', await openValue(rot.oldKey, 'k1', e1));
      /* reprise au déverrouillage suivant : la nouvelle clé rouvre l'ancienne */
      const pk = await prevKeyOf(rot.meta, rot.key);
      ok(!!pk);
      eq(await openValue(pk, 'k2', e2), 'valeur-2');       /* l'ancienne enveloppe se relit */
      eq(await openValue(rot.key, 'k1', n1), 'valeur-1');  /* la re-scellée aussi */
      /* soldée : prev retiré, l'ancien code ne rentre plus */
      const done = clearPrev(rot.meta);
      ok(!done.prev);
      eq(await prevKeyOf(done, rot.key), null);
      try { await unlockWithPin(rot.meta, '111111'); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'code'); }
    },
    'anneau : signé, vérifié, TOFU, falsification refusée': async () => {
      if (!(await edAvailable())) return;   /* vieux navigateur : dégradé assumé */
      const kA = await makeDeviceKeys(), kB = await makeDeviceKeys();
      const rec = await recoveryKeys('aigle ancre avion', 15000);
      let ring = await ringInit({ id: 'A', name: 'Pixel' }, kA.pub, kA.seed, rec.pub);
      ok(await verifyRing(ring, kA.pub));
      ring = await ringAddDevice(ring, kA.seed, { id: 'B', name: 'MacBook', pub: kB.pub });
      eq(ring.devices.length, 2);
      const mB = await mergeRing(null, ring);         /* B apprend l'anneau (TOFU) */
      ok(mB.changed);
      const forged = await ringCommand(ring, kB.seed, 'wipe', 'A');   /* signé par B */
      ok(!(await mergeRing(mB.ring, forged)).changed);
    },
    'anneau : commandes ciblées, appliquées une seule fois': async () => {
      if (!(await edAvailable())) return;
      const kA = await makeDeviceKeys(), kB = await makeDeviceKeys();
      const rec = await recoveryKeys('x', 15000);
      let ring = await ringInit({ id: 'A', name: 'A' }, kA.pub, kA.seed, rec.pub);
      ring = await ringAddDevice(ring, kA.seed, { id: 'B', name: 'B', pub: kB.pub });
      ring = await ringCommand(ring, kA.seed, 'lock', 'B', 'c1');
      const acts = actionsFor(ring, 'B', []);
      eq(acts, [{ cid: 'c1', cmd: 'lock' }]);
      eq(actionsFor(ring, 'B', ['c1']), []);          /* déjà appliquée */
      eq(actionsFor(ring, 'A', []), []);              /* ne me vise pas */
    },
    'anneau : bannir = génération +1, le retour d’un banni est ignoré': async () => {
      if (!(await edAvailable())) return;
      const kA = await makeDeviceKeys(), kB = await makeDeviceKeys();
      const rec = await recoveryKeys('x', 15000);
      let ring = await ringInit({ id: 'A', name: 'A' }, kA.pub, kA.seed, rec.pub);
      ring = await ringAddDevice(ring, kA.seed, { id: 'B', name: 'B', pub: kB.pub });
      const banned = await ringCommand(ring, kA.seed, 'ban', 'B');
      eq(banned.gen, 2);
      ok(!deviceIn(banned, 'B'));
      ok(!(await mergeRing(banned, ring)).changed);   /* l'ancien anneau ne redescend pas */
    },
    'anneau : transfert du rôle signé par l’ancien principal': async () => {
      if (!(await edAvailable())) return;
      const kA = await makeDeviceKeys(), kB = await makeDeviceKeys();
      const rec = await recoveryKeys('x', 15000);
      let ring = await ringInit({ id: 'A', name: 'A' }, kA.pub, kA.seed, rec.pub);
      ring = await ringAddDevice(ring, kA.seed, { id: 'B', name: 'B', pub: kB.pub });
      const mB = await mergeRing(null, ring);
      const t = await ringTransfer(ring, kA.seed, 'B');
      const mB2 = await mergeRing(mB.ring, t);
      ok(mB2.changed);
      eq(mB2.ring.main, 'B');
      eq(deviceIn(mB2.ring, 'A').role, 'member');
    },
    'anneau : le principal renouvelle la clé de secours SANS l’ancienne phrase': async () => {
      if (!(await edAvailable())) return;
      const kA = await makeDeviceKeys(), kB = await makeDeviceKeys();
      const rec = await recoveryKeys('phrase perdue', 15000);
      let ring = await ringInit({ id: 'A', name: 'A' }, kA.pub, kA.seed, rec.pub);
      ring = await ringAddDevice(ring, kA.seed, { id: 'B', name: 'B', pub: kB.pub });
      const mB = await mergeRing(null, ring);            /* B connaît l'anneau et son principal */
      const neuve = await recoveryKeys('phrase neuve', 15000);
      /* A refait sa phrase : il signe avec SA clé d'appareil, pas avec
         l'ancienne clé de secours — c'est tout l'intérêt, il l'a perdue */
      const rk = await ringRekey(ring, kA.seed, 'A', neuve.pub);
      const mB2 = await mergeRing(mB.ring, rk);
      ok(mB2.changed, 'B accepte : signé par le principal qu’il connaît');
      ok(!mB2.recovered, 'ce n’est pas une récupération — personne n’est écarté');
      eq(mB2.ring.recovery, neuve.pub);
      eq(mB2.ring.gen, 1);                               /* la génération ne bouge pas */
      eq(mB2.ring.main, 'A');
      eq((mB2.ring.devices || []).length, 2);            /* B est toujours là */
      /* et la récupération d'urgence marche avec la NOUVELLE phrase */
      const secours = await ringRecover(mB2.ring, neuve.seed, { id: 'B', name: 'B' }, kB.pub,
        (await recoveryKeys('encore une autre', 15000)).pub);
      ok((await mergeRing(mB2.ring, secours)).recovered, 'la phrase neuve ouvre bien le secours');
      /* l'ancienne, elle, ne prouve plus rien */
      const vieux = await ringRecover(mB2.ring, rec.seed, { id: 'B', name: 'B' }, kB.pub, neuve.pub);
      ok(!(await mergeRing(mB2.ring, vieux)).recovered, 'l’ancienne phrase ne récupère plus');
      /* un appareil qui n'est pas le principal ne peut pas re-clé */
      let refus = '';
      try { await ringRekey(mB2.ring, kB.seed, 'B', neuve.pub); }
      catch (e) { refus = e.message; }
      eq(refus, 'principal');
    },
    'anneau : récupération par la phrase — vraie acceptée, fausse refusée': async () => {
      if (!(await edAvailable())) return;
      const kA = await makeDeviceKeys(), kB = await makeDeviceKeys();
      const rec = await recoveryKeys('bonne phrase', 15000);
      let ring = await ringInit({ id: 'A', name: 'A' }, kA.pub, kA.seed, rec.pub);
      ring = await ringAddDevice(ring, kA.seed, { id: 'B', name: 'B', pub: kB.pub });
      const newRec = await recoveryKeys('phrase renouvelee', 15000);
      const good = await ringRecover(ring, rec.seed, { id: 'B', name: 'B' }, kB.pub, newRec.pub);
      const mA = await mergeRing(ring, good);
      ok(mA.changed && mA.recovered);
      eq(mA.ring.main, 'B');
      eq(mA.ring.gen, 2);
      const badRec = await recoveryKeys('mauvaise phrase', 15000);
      const bad = await ringRecover(ring, badRec.seed, { id: 'B', name: 'B' }, kB.pub, newRec.pub);
      ok(!(await mergeRing(ring, bad)).changed);
    },
    'missions Compagnon : bornées, révocables, rapport replié sans doublon': () => {
      const m = makeMission('campaign-run', { campaignId: 'cp1' }, { at: 1000, mid: 'ms1' });
      ok(missionUsable(m, 1000 + 86400000));                    /* dans la fenêtre */
      ok(!missionUsable(m, 1000 + 31 * 86400000));              /* expirée */
      ok(!missionUsable(revokeMission(m), 2000));               /* révoquée */
      try { makeMission('exfiltrer', {}); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'mission'); }
      /* le rapport se replie sur le journal : rejouer = rien de plus */
      const steps = [{ subject: 's', body: 'b' }, { subject: 's', body: 'b' }, { subject: 's', body: 'b' }];
      let c = buildCampaign({ steps, launchAt: '2026-07-16', targets: [{ cid: 'c1', email: 'a@x.fr' }] });
      const sid = dueSends(c, '2026-07-16')[0].sid;
      const report = { mid: 'ms1', sent: [{ sid, at: '2026-07-16' }, { sid, at: '2026-07-16' }] };
      c = foldCampaignReport(c, report);
      eq(c.log.length, 1);
      c = foldCampaignReport(c, report);                        /* l'autre canal rejoue */
      eq(c.log.length, 1);
      eq(dueSends(c, '2026-07-16').length, 0);
    },
    'missions Compagnon : fil signé — vecteur figé, altération et expiration refusées': async () => {
      if (!(await edAvailable())) return;
      /* graine fixe 0..31 : la signature Ed25519 est DÉTERMINISTE — ce
         vecteur est vérifié à l'identique par le cœur Rust du Compagnon
         (compagnon/coeur). S'il casse, le format du fil a changé. */
      const seedB64 = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i)));
      const pub = 'A6EHv_POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg';
      const m = { v: 1, mid: 'ms-test-1', kind: 'campaign-run', params: { cpId: 'cp1' },
        createdAt: 1752624000000, expiresAt: 1755216000000, revoked: false };
      const wire = await signMission(m, 'A', seedB64);
      eq(wire.sig, 'oUjaqwFsq0uAA8vtYzgIgQ1itQtkz7vP6+zNJs2WVn6+FDj/Tl9dBRRsSdPi1TJW+kAFST0Qbd5CdZ+WkHsBBw==');
      eq((await openMissionWire(wire, pub, 1752624000001)).mid, 'ms-test-1');
      /* un octet changé = rien ne s'ouvre */
      eq(await openMissionWire({ m: wire.m.replace('cp1', 'cp2'), sig: wire.sig, dev: 'A' }, pub, 1752624000001), null);
      /* mauvaise clé publique = rien (le dernier caractère base64url ne
         porte que des bits ignorés — on altère un caractère UTILE) */
      eq(await openMissionWire(wire, 'B6EHv_POEL4dcN0Y50vAmWfk1jCbpQ1fHdyGZBJVMbg', 1752624000001), null);
      /* signée mais expirée = rien (missionUsable est dans le fil) */
      eq(await openMissionWire(wire, pub, 1755216000001), null);
    },
    'compagnon : code toléré à la saisie, clé du code = vecteur du cœur Rust': async () => {
      eq(normCode(' abcd 2345 '), 'ABCD-2345');
      eq(normCode('abcd-2345'), 'ABCD-2345');
      eq(normCode('AB'), 'AB');
      /* la dérivation (PBKDF2 « code: », 120 000 itér.) DOIT donner la
         même clé que compagnon/coeur (enveloppe.rs, vecteur figé) : on
         scelle avec la clé dérivée, on ouvre avec la clé brute du vecteur */
      const selB64 = btoa(String.fromCharCode(...Array.from({ length: 16 }, (_, i) => i)));
      const k = await pairKey('abcd2345', selB64);
      const env = await sealValue(k, 'canal', 'preuve');
      const raw = Uint8Array.from(atob('0zhUpHdF75HUrzrxzTIA1kwhXaMNsx8wJzed3TBbiwk='), c => c.charCodeAt(0));
      const kBrut = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
      eq(await openValue(kBrut, 'canal', env), 'preuve');
    },
    'compagnon : distribution — le bon fichier pour le bon système': () => {
      /* le système d'après le navigateur ; un téléphone = « autre »,
         il ne télécharge pas, il apprend que ça se passe sur l'ordinateur */
      eq(osFromUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'windows');
      eq(osFromUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'mac');
      eq(osFromUA('Mozilla/5.0 (X11; Linux x86_64)'), 'linux');
      eq(osFromUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'autre');
      eq(osFromUA('Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile'), 'autre');
      eq(osFromUA('Mozilla/5.0 (X11; CrOS x86_64)'), 'autre');
      eq(osFromUA(''), 'autre');
      /* le choix dans la liste RÉELLE des assets — deb avant AppImage,
         setup.exe pour Windows, dmg pour macOS, rien pour « autre » */
      const assets = [
        { name: 'OpenContact-Compagnon-linux-x64.AppImage', url: 'u1' },
        { name: 'OpenContact-Compagnon-linux-x64.deb', url: 'u2' },
        { name: 'OpenContact-Compagnon-windows-x64-setup.exe', url: 'u3' },
        { name: 'OpenContact-Compagnon-macos-universel.dmg', url: 'u4' }
      ];
      eq(assetsForOS(assets, 'linux').map(a => a.url), ['u2', 'u1']);
      eq(assetsForOS(assets, 'windows').map(a => a.url), ['u3']);
      eq(assetsForOS(assets, 'mac').map(a => a.url), ['u4']);
      eq(assetsForOS(assets, 'autre').length, 0);
      eq(assetsForOS(null, 'linux').length, 0);
      ok(/^https:\/\/github\.com\/.+\/releases\/latest$/.test(DIST_PAGE));
    },
    'diagnostic : le navigateur et le système, au grain qui sert': () => {
      /* Edge, Opera et Chrome-sur-iOS se déclarent tous « Chrome » ou
         « Safari » : c'est l'ORDRE des motifs qui tranche, et c'est lui
         qu'on épingle ici — une inversion rendrait tous les rapports
         d'Edge illisibles sans que rien ne le signale. */
      const nav = ua => browserFromUA(ua).nom + ' ' + browserFromUA(ua).version;
      eq(nav('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'), 'Edge 130');
      eq(nav('Mozilla/5.0 (Windows NT 10.0) Chrome/129.0.0.0 Safari/537.36 OPR/115.0.0.0'), 'Opera 115');
      eq(nav('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36'), 'Chrome 130');
      eq(nav('Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36'), 'Samsung Internet 27');
      eq(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0.0.0 Mobile/15E148 Safari/604.1'), 'Chrome 130');
      eq(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1'), 'Safari 17');
      eq(nav('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0'), 'Firefox 131');
      eq(browserFromUA('').nom, 'inconnu');
      eq(systemFromUA('Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile'), 'Android');
      eq(systemFromUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)'), 'iOS');
      eq(systemFromUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'Windows');
      eq(systemFromUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'macOS');
      eq(systemFromUA('Mozilla/5.0 (X11; CrOS x86_64)'), 'ChromeOS');
      eq(systemFromUA('Mozilla/5.0 (X11; Linux x86_64)'), 'Linux');
      eq(systemFromUA(''), 'inconnu');
    },
    'diagnostic : rien de personnel n’en sort — que des nombres': () => {
      /* L'invariant du module : il reçoit tout le suivi, il n'en rend
         que des comptes. Le texte part hors de l'app (presse-papier →
         issue publique) — c'est le seul endroit de l'app où une fuite
         serait publique ET définitive. */
      const secrets = ['Dassault Systèmes', 'Jean Dupont', 'jean.dupont@exemple.fr',
        '06 12 34 56 78', '12 rue des Lilas, 31000 Toulouse', 'Relance envoyée',
        'Mahi Étudiant', 'mahi@exemple.fr', 'Mon modèle de relance'];
      const d = diagnosticData({
        ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
        langue: 'fr-FR', largeur: 390, hauteur: 844, theme: 'dark', backend: 'idb',
        installee: true, enLigne: false, protection: true, relie: true,
        companies: [
          { name: 'Dassault Systèmes', address: '12 rue des Lilas, 31000 Toulouse',
            contacts: [{ name: 'Jean Dupont', email: 'jean.dupont@exemple.fr', phone: '06 12 34 56 78' }] },
          { name: 'Autre Boîte', contacts: [] }
        ],
        orphans: [{ name: 'Jean Dupont', email: 'jean.dupont@exemple.fr' }],
        tombs: [{ id: 'c1', t: 1 }, { id: 'c2', t: 2 }, { id: 'c3', t: 3 }],
        journal: [{ t: 1, txt: 'Relance envoyée' }],
        profile: { name: 'Mahi Étudiant', email: 'mahi@exemple.fr',
                   templates: [{ name: 'Mon modèle de relance', body: 'Bonjour' }] },
        documents: [{ key: 'cv_1', size: 240000 }, { key: 'lm_1', size: 180000 }]
      });
      /* les faits, d'abord */
      eq([d.pistes, d.contacts, d.arattacher, d.suppressions], [2, 1, 1, 3]);
      eq([d.documents, d.modeles, d.journal], [2, 1, 1]);
      eq(d.navigateur + ' · ' + d.systeme, 'Chrome 130 · Android');
      eq([d.installee, d.enLigne, d.protection, d.relie, d.theme], [true, false, true, true, 'sombre']);
      eq(d.stockage, 'IndexedDB');
      ok(d.octets > 0 && d.octetsDocs === 420000);
      /* puis l'invariant, sur l'objet ET sur le texte qui part */
      const txt = diagnosticText(d);
      const brut = JSON.stringify(d) + '\n' + txt;
      for (const s of secrets)
        if (brut.includes(s)) throw new Error('« ' + s +' » a fui dans le diagnostic');
      /* le texte reste lisible et STABLE : cinq lignes, toujours les
         mêmes — et AUCUN numéro de version, il ne distingue plus rien */
      eq(txt.split('\n').length, 5);
      ok(txt.startsWith('Appareil : '));
      ok(!/\d+\.\d+\.\d+/.test(txt));
      ok(txt.includes('390×844') && txt.includes('2 piste(s)') && txt.includes('hors ligne'));
    },
    'diagnostic : une app vide se raconte quand même, sans mentir sur les poids': () => {
      /* le premier rapport d'un étudiant sera souvent celui-là : rien
         de saisi, un bug au démarrage. Il doit rester complet — et ne
         pas inventer « 1 Ko » de documents là où il n'y en a aucun. */
      const txt = diagnosticText(diagnosticData({ backend: 'memory' }));
      eq(txt.split('\n').length, 5);
      ok(txt.includes('mémoire (rien ne survit)'));
      ok(txt.includes('Documents : 0 (0 Ko)'));
      ok(txt.includes('sans protection') && txt.includes('appareils non reliés'));
      ok(txt.includes('inconnu') && txt.includes('0×0'));
    },
    'aides : relances dues — retard d’abord, pistes travaillées ensuite': () => {
      const comps = [
        { id: 'c1', name: 'A', nextAction: '2026-07-01', history: [{ t: 'Email envoyé' }, { t: 'Relance envoyée' }] },
        { id: 'c2', name: 'B', nextAction: '2026-07-01' },
        { id: 'c3', name: 'C', nextAction: '2026-07-16' },
        { id: 'c4', name: 'D', nextAction: '2026-08-01' },          /* futur : exclu */
        { id: 'c5', name: 'E', nextAction: '2026-07-01', closedReason: 'won' }
      ];
      eq(dueFollowups(comps, '2026-07-16').map(x => x.id), ['c1', 'c2', 'c3']);
      eq(dueFollowups(comps, '2026-07-16')[0].lateDays, 15);
    },
    /* Les verbes proposés après « Fait ✓ » : ils suivent l'état de la
       piste, et ne reproposent jamais celui qui est déjà posé — un tap
       qui ne change rien est un tap volé. */
    'aides : les verbes proposés suivent l’état de la piste': () => {
      const v = s => nextActionSuggestions({ status: s });
      ok(v('todo')[0] === 'Envoyer la candidature', 'à contacter : envoyer d’abord');
      ok(v('active')[0] === 'Relancer', 'en cours : relancer d’abord');
      ok(v('reply')[0] === 'Répondre', 'réponse : répondre d’abord');
      ok(v('todo').length === 3 && v('active').length === 3, 'trois verbes, pas plus');
      /* un état inconnu (ancienne donnée, format futur) ne casse rien */
      ok(nextActionSuggestions({ status: 'zzz' }).length === 3, 'état inconnu : le défaut');
      ok(nextActionSuggestions(null).length === 3, 'aucune piste : le défaut');
      /* déjà « Relancer » posé : on ne le repropose pas */
      const dup = nextActionSuggestions({ status: 'active', nextActionText: '  relancer ' });
      ok(!dup.some(x => x.toLowerCase() === 'relancer'), 'le libellé déjà posé disparaît');
      ok(dup.length === 2, 'les deux autres restent');
    },
    /* « Échanger » relit le journal pour montrer ce qui a circulé. Les
       phrases de logJ deviennent donc un contrat : si l'une d'elles
       change de forme, c'est ICI que ça doit casser — pas en silence
       sur l'écran de l'utilisateur, qui verrait sa liste se vider. */
    'aides : le fil des échanges se relit dans le journal': () => {
      const j = [
        { t: 10, txt: 'Donné (QR) : 3 piste(s)' },
        { t: 20, txt: 'Reçu de la promo : +5 piste(s), 2 complétée(s)' },
        { t: 30, txt: 'Donné (fichier chiffré) : 12 piste(s)' },
        { t: 40, txt: 'Reçu de Karim : +1 piste(s), 0 complétée(s)' },
        /* le mot a changé à l'écran ; le journal, lui, garde les DEUX
           formes — une entrée écrite avant le renommage doit rester
           lisible, un changement de vocabulaire ne réécrit pas l'histoire */
        { t: 45, txt: 'Reçu du groupe : +9 piste(s), 1 complétée(s)' },
        { t: 50, txt: 'Donné (partage en groupe) : 7 piste(s)' },
        { t: 60, txt: 'Donné (QR rendez-vous) : 2 piste(s)' },
        /* rien à voir avec la promo : ne doit jamais entrer dans le fil */
        { t: 70, txt: 'Reçu (analyse IA triée) : +4 piste(s), 0 complétée(s)' },
        { t: 80, txt: 'Fait : Relancer Léa — Capgemini' },
        { t: 90, txt: 'Supprimée : Atos' }
      ];
      const fil = exchangeLog(j);
      eq(fil.length, 7);
      eq(fil[0].t, 60);                                    /* le plus récent d'abord */
      eq(fil[0].canal, 'QR rendez-vous');
      eq(fil.map(x => x.sens).join(','), 'donne,donne,recu,recu,donne,recu,donne');
      eq(fil.find(x => x.t === 40).qui, 'Karim');           /* reçu d'une personne nommée */
      eq(fil.find(x => x.t === 20).qui, '');                /* ancienne forme : « la promo » = anonyme */
      eq(fil.find(x => x.t === 45).qui, '');                /* nouvelle forme : « du groupe » = idem */
      eq(fil.find(x => x.t === 45).n, 9);
      eq(fil.find(x => x.t === 30).n, 12);
      ok(!fil.some(x => x.t === 70), 'l’analyse IA n’est pas un échange avec la promo');
      eq(exchangeLog(j, 2).length, 2);
      eq(exchangeLog(j, 0).length, 7);                      /* 0 = tout */
      const tot = exchangeTotals(j);
      eq(tot.donne, 24);                                    /* 3 + 12 + 7 + 2 */
      eq(tot.recu, 15);                                     /* 5 + 1 + 9 */
      eq(tot.n, 7);
      eq(exchangeLog(null).length, 0);
      eq(exchangeLog([{ t: 1 }, { t: 2, txt: null }]).length, 0);
      /* un journal revenu d'une sauvegarde peut avoir perdu ses
         horodatages : l'échange reste compté, la date vaut 0 — jamais
         NaN, sinon l'écran afficherait « NaN-NaN-NaN » */
      const abime = exchangeLog([
        { txt: 'Donné (QR) : 3 piste(s)' },
        { t: 'hier', txt: 'Reçu de la promo : +2 piste(s), 0 complétée(s)' }
      ]);
      eq(abime.length, 2);
      eq(abime.every(x => Number.isFinite(x.t)), true);
      eq(exchangeTotals([{ txt: 'Donné (QR) : 3 piste(s)' }]).donne, 3);
      /* les identifiants remontent quand l'entrée les porte — c'est eux
         qui rendent la ligne ouvrable ; sans eux elle reste du texte */
      eq(fil.every(x => Array.isArray(x.ids)), true);
      eq(fil.find(x => x.t === 60).ids, []);
      const avecIds = exchangeLog([
        { t: 1, txt: 'Donné (QR) : 2 piste(s)', ids: ['pi-a', 'pi-b'] },
        { t: 2, txt: 'Reçu de Karim : +1 piste(s), 0 complétée(s)', ids: 'pas un tableau' },
        { t: 3, txt: 'Donné (fichier) : 1 piste(s)', ids: ['pi-c', 42, null, ''] }
      ]);
      eq(avecIds.find(x => x.t === 1).ids, ['pi-a', 'pi-b']);
      eq(avecIds.find(x => x.t === 2).ids, []);          /* champ abîmé : ignoré, pas de casse */
      eq(avecIds.find(x => x.t === 3).ids, ['pi-c']);    /* seules les chaînes non vides passent */
    },
    'fusion : les pistes touchées sont nommées — « Tes échanges » les rouvre': () => {
      const comps = [normalizeCompany({ id: 'pi-ex', name: 'Alpha', city: 'Lille' })];
      const st = mergeIncoming([
        { name: 'Alpha', city: 'Lille', techs: 'Azure' },      /* complète l'existante */
        { name: 'Beta', city: 'Paris' },                       /* nouvelle */
        { name: 'Alpha', city: 'Lille' }                       /* ne change rien : divergence nulle */
      ], comps);
      eq(st.addedC, 1); eq(st.enriched, 1);
      /* une seule fois chacune, et rien qui n'ait bougé */
      eq(st.ids.length, 2);
      eq(st.ids.includes('pi-ex'), true);
      eq(st.ids.includes(comps.find(c => c.name === 'Beta').id), true);
      /* les identifiants désignent bien des pistes du suivi */
      eq(st.ids.every(id => comps.some(c => c.id === id)), true);
      /* DEUX fiches entrantes qui complètent la MÊME piste : elle est
         nommée une fois, pas deux — sinon la feuille de « Tes échanges »
         listerait la même piste en double */
      const c2 = [normalizeCompany({ id: 'pi-un', name: 'Gamma' })];
      const st2 = mergeIncoming([
        { name: 'Gamma', city: 'Nantes' },
        { name: 'Gamma', techs: 'Kubernetes' }
      ], c2);
      eq(st2.ids, ['pi-un']);
    },
    'aides : signature collée → contact, sans jamais inventer': () => {
      const got = contactFromSignature(
        'Nadia Rahmani\nResponsable RH — Orange Cyberdefense\nnadia.rahmani@orange.fr\nTél : +33 6 12 34 56 78\nwww.orangecyberdefense.com');
      eq(got.name, 'Nadia Rahmani');
      ok(/Responsable RH/.test(got.role));
      eq(got.email, 'nadia.rahmani@orange.fr');
      ok(got.phone.replace(/\D/g, '').length >= 9);
      ok(/orangecyberdefense/.test(got.link));
      eq(contactFromSignature('theo.vasseur@ovh.com').name, 'Theo Vasseur');  /* dérivé de l'email */
      eq(contactFromSignature('Bonjour, cordialement'), null);
    },
    'IA : familles, prompt cadré, erreurs sans réseau': async () => {
      eq(browserProviders().sort(), ['anthropic', 'gemini', 'openrouter']);
      ok(AI_FAMILIES.chatgpt.channel === 'companion' && !AI_FAMILIES.chatgpt.key);
      ok(AI_FAMILIES.ollama.channel === 'companion' && !AI_FAMILIES.ollama.key);
      ok(AI_FAMILIES.openai.channel === 'companion' && AI_FAMILIES.openai.key);
      const p = draftPrompt({ company: { name: 'OVHcloud', city: 'Roubaix' },
        contactName: 'Théo', profile: { name: 'Mahé', formation: 'BTS SIO' } });
      ok(/OVHcloud \(Roubaix\)/.test(p) && /Théo/.test(p) && /Mahé, BTS SIO/.test(p));
      ok(/120 mots max/.test(p));
      try { await aiComplete({ provider: 'openai', key: 'x' }, 'test'); throw new Error('parti !'); }
      catch (e) { eq(e.message, 'viacompagnon'); }
      try { await aiComplete({ provider: 'anthropic', key: '' }, 'test'); throw new Error('parti !'); }
      catch (e) { eq(e.message, 'cle'); }
      try { await aiComplete({ provider: 'openrouter', key: '' }, 'test'); throw new Error('parti !'); }
      catch (e) { eq(e.message, 'cle'); }
      /* jamais de modèle implicite : sans choix, refus court — le
         modèle vient TOUJOURS de la liste vivante du fournisseur */
      try { await aiComplete({ provider: 'anthropic', key: 'k', model: '' }, 'test'); throw new Error('parti !'); }
      catch (e) { eq(e.message, 'modele'); }
    },
    'envoi direct : MIME — entêtes UTF-8, corps base64, base64url': () => {
      eq(encodeHeader('Hello'), 'Hello');                       /* ASCII : inchangé */
      eq(encodeHeader('Candidature — été'), '=?UTF-8?B?Q2FuZGlkYXR1cmUg4oCUIMOpdMOp?=');
      const m = buildMime({ from: 'moi@x.fr', to: 'rh@y.fr', subject: 'Stage été', body: 'Bonjour à vous.' });
      ok(m.startsWith('From: moi@x.fr\r\nTo: rh@y.fr\r\nSubject: =?UTF-8?B?'));
      ok(m.includes('Content-Type: text/plain; charset=UTF-8'));
      ok(m.includes('Content-Transfer-Encoding: base64'));
      const body64 = m.split('\r\n\r\n')[1].replace(/\r\n/g, '');
      eq(atob(body64), unescape(encodeURIComponent('Bonjour à vous.')));
      eq(toB64Url('a+b/c'), btoa('a+b/c').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
    },
    'envoi direct : URLs OAuth et retour de popup': async () => {
      const g = authUrl('gmail', 'CID', 'https://x/oauth.html', { state: 's1' });
      ok(g.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
      ok(g.includes('response_type=token') && g.includes('state=s1') && g.includes('gmail.send'));
      const o = authUrl('outlook', 'CID', 'https://x/oauth.html', { state: 's2', challenge: 'CH' });
      ok(o.includes('code_challenge=CH') && o.includes('code_challenge_method=S256'));
      eq(parseCallback('https://x/oauth.html#access_token=T&expires_in=3599&state=s1'),
         { access_token: 'T', expires_in: '3599', state: 's1' });
      eq(parseCallback('https://x/oauth.html?code=C&state=s2').code, 'C');
      const pk = await pkcePair();
      ok(pk.verifier.length >= 43 && /^[A-Za-z0-9_-]+$/.test(pk.challenge));
    },
    'campagne : montage — opposition imposée, personnalisation figée': () => {
      const steps = [
        { subject: 'Candidature — {{entreprise}}', body: 'Bonjour {{contact}}.' },
        { subject: 'Re', body: 'Relance 1' },
        { subject: 'Re', body: 'Relance 2' }
      ];
      const c = buildCampaign({ name: 'T', steps, launchAt: '2026-07-16',
        targets: [{ cid: 'c1', name: 'Ana', company: 'Orange', email: 'a@x.fr' }] });
      ok(c.steps.every(s => /je m’arrête là/.test(s.body)));   /* imposée, jamais retirée */
      eq(c.targets[0].msgs[0].subject, 'Candidature — Orange');
      ok(/Bonjour Ana/.test(c.targets[0].msgs[0].body));
      eq(c.state, 'ready');
      /* sans email = pas de cible ; zéro cible = erreur */
      try { buildCampaign({ steps, launchAt: '2026-07-16', targets: [{ cid: 'c2', name: 'X' }] }); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'cibles'); }
    },
    'campagne : cadence 15/jour, glissement, idempotence (rejeu du journal)': () => {
      const steps = [{ subject: 's', body: 'b' }, { subject: 's', body: 'b' }, { subject: 's', body: 'b' }];
      const targets = Array.from({ length: 20 }, (_, i) => ({ cid: 'c' + i, email: 'p' + i + '@x.fr' }));
      let c = buildCampaign({ steps, targets, launchAt: '2026-07-16' });
      const due = dueSends(c, '2026-07-16');
      eq(due.length, DAILY_CAP);
      for (const d of due) c = markSent(c, d.sid, '2026-07-16');
      eq(dueSends(c, '2026-07-16').length, 0);          /* la cadence du jour est prise */
      const n = c.log.length;
      c = markSent(c, due[0].sid, '2026-07-16');        /* rejouer le même envoi */
      eq(c.log.length, n);
      eq(dueSends(c, '2026-07-17').length, 5);          /* le reste a glissé */
    },
    'campagne : plafond GLOBAL 15/j toutes campagnes ; fenêtre d’envoi': () => {
      const steps = [{ subject: 's', body: 'b' }, { subject: 's', body: 'b' }, { subject: 's', body: 'b' }];
      const mk = id => buildCampaign({ id, steps, launchAt: '2026-07-16',
        targets: Array.from({ length: 10 }, (_, i) => ({ cid: id + i, email: id + i + '@x.fr' })) });
      let a = mk('ca');
      const b = mk('cb');
      /* 10 envois déjà partis dans A aujourd'hui : il n'en reste que 5
         pour TOUTES les campagnes — jamais 15 par campagne */
      for (const d of dueSends(a, '2026-07-16')) a = markSent(a, d.sid, '2026-07-16');
      eq(sentTodayAll([a, b], '2026-07-16'), 10);
      const due = dueSendsAll([a, b], '2026-07-16');
      eq(due.length, 5);
      ok(due.every(d => d.cpId === 'cb'));
      /* le lendemain, le plafond global repart — B a ses 10 premiers messages */
      eq(dueSendsAll([a, b], '2026-07-17').length, 10);
      /* fenêtre d'envoi imposée : jours ouvrés, 8 h → 18 h 59, heure locale */
      ok(inSendWindow(new Date(2026, 6, 16, 10, 0)));    /* jeudi 10 h */
      ok(inSendWindow(new Date(2026, 6, 16, 8, 0)));
      ok(!inSendWindow(new Date(2026, 6, 16, 7, 59)));
      ok(!inSendWindow(new Date(2026, 6, 16, 19, 0)));
      ok(!inSendWindow(new Date(2026, 6, 18, 10, 0)));   /* samedi */
      ok(!inSendWindow(new Date(2026, 6, 19, 10, 0)));   /* dimanche */
    },
    'campagne : relances J+7 sur la date d’envoi RÉELLE ; réponse = stop': () => {
      const steps = [{ subject: 's', body: 'b' }, { subject: 's', body: 'b' }, { subject: 's', body: 'b' }];
      let c = buildCampaign({ steps, launchAt: '2026-07-16',
        targets: [{ cid: 'c1', email: 'a@x.fr' }, { cid: 'c2', email: 'b@x.fr' }] });
      /* c1 part le 16, c2 seulement le 18 (l'utilisateur n'a pas appuyé) */
      c = markSent(c, dueSends(c, '2026-07-16')[0].sid, '2026-07-16');
      c = markSent(c, dueSends(c, '2026-07-18').find(d => d.cid === 'c2').sid, '2026-07-18');
      eq(dueSends(c, '2026-07-22').length, 0);          /* rien avant J+7 */
      const d23 = dueSends(c, '2026-07-23');
      eq(d23.length, 1);                                 /* c1 seulement (16+7) */
      eq(d23[0].cid, 'c1'); eq(d23[0].step, 1);
      ok(dueSends(c, '2026-07-25').some(d => d.cid === 'c2' && d.step === 1));
      /* réponse : plus jamais rien pour cette piste — non débrayable */
      c = markReplied(c, 'c1');
      ok(!dueSends(c, '2026-07-30').some(d => d.cid === 'c1'));
      /* erreur d'envoi : marquée, jamais re-tentée en silence */
      c = markError(c, 't2');
      eq(dueSends(c, '2026-08-30').length, 0);
      eq(c.state, 'done');                               /* plus aucune cible active */
    },
    'campagne : plusieurs personnes chez la même entreprise (#1)': () => {
      const steps = [{ subject: 's', body: 'b' }, { subject: 's', body: 'b' }, { subject: 's', body: 'b' }];
      let c = buildCampaign({ steps, launchAt: '2026-07-16', targets: [
        { cid: 'cap', name: 'Léa', email: 'lea@cap.fr', company: 'Capgemini' },
        { cid: 'cap', name: 'Marc', email: 'marc@cap.fr', company: 'Capgemini' },
        { cid: 'cap', name: 'Sofia', email: 'sofia@cap.fr', company: 'Capgemini' },
        { cid: 'ovh', name: 'Nadia', email: 'nadia@ovh.fr', company: 'OVH' }
      ] });
      /* trois personnes, une entreprise : les identifiants ne se marchent pas dessus */
      eq(new Set(c.targets.map(t => t.tid)).size, 4);
      const st = campaignStats(c);
      eq(st.targets, 4);                                 /* personnes visées */
      eq(st.pistes, 2);                                  /* entreprises */
      eq(dueSends(c, '2026-07-16').length, 4);
      /* Léa répond : elle seule se tait, Marc et Sofia continuent */
      const lea = c.targets.find(t => t.who === 'Léa');
      c = markReplied(c, 'cap', lea.tid);
      const due = dueSends(c, '2026-07-16');
      eq(due.length, 3);
      ok(!due.some(d => d.who === 'Léa'));
      ok(due.some(d => d.who === 'Marc') && due.some(d => d.who === 'Sofia'));
      eq(campaignStats(c).replied, 1);
      /* « arrêter toute l'entreprise » : les autres cessent SANS compter
         comme des réponses — seule Léa a répondu */
      c = stopCompanyTargets(c, 'cap');
      const due2 = dueSends(c, '2026-07-16');
      eq(due2.length, 1);
      eq(due2[0].cid, 'ovh');
      eq(campaignStats(c).replied, 1);
      eq(campaignStats(c).done, 2);
      /* sans tid, c'est toute l'entreprise qui se tait (fiche en
         « réponse », rapport de l'ordinateur : aucun des deux ne sait qui) */
      let d = buildCampaign({ steps, launchAt: '2026-07-16', targets: [
        { cid: 'cap', name: 'Léa', email: 'lea@cap.fr' },
        { cid: 'cap', name: 'Marc', email: 'marc@cap.fr' }
      ] });
      d = markReplied(d, 'cap');
      eq(dueSends(d, '2026-07-16').length, 0);
      eq(campaignStats(d).replied, 2);
      eq(d.state, 'done');
    },
    'partage : ne faire sortir que les personnes retenues (#2)': () => {
      const c = normalizeCompany({ name: 'Capgemini', contacts: [
        { id: 'ct1', name: 'Léa', email: 'lea@cap.fr' },
        { id: 'ct2', name: 'Marc', email: 'marc@cap.fr' },
        { id: 'ct3', name: 'Sofia', email: 'sofia@cap.fr' }
      ] });
      /* rien de précisé = tout part, comme avant */
      eq(communityView(c).contacts.length, 3);
      eq(sharePayload([c]).companies[0].contacts.length, 3);
      /* une sélection ne fait sortir qu'elle */
      const deux = communityView(c, ['ct1', 'ct3']);
      eq(deux.contacts.map(t => t.name).join(','), 'Léa,Sofia');
      eq(deux.name, 'Capgemini');                        /* la fiche, elle, est entière */
      /* une liste VIDE est un choix : la fiche part seule */
      eq(communityView(c, []).contacts.length, 0);
      /* sharePayload prend une fonction piste → personnes retenues */
      const p = sharePayload([c], x => x.id === c.id ? ['ct2'] : null);
      eq(p.companies[0].contacts.map(t => t.name).join(','), 'Marc');
      /* et rien de privé ne suit la personne retenue */
      ok(!('id' in p.companies[0].contacts[0]));
      ok(!('activatedAt' in p.companies[0].contacts[0]));
    },
    'campagne : pause / reprise / arrêt ; bords de date': () => {
      const steps = [{ subject: 's', body: 'b' }, { subject: 's', body: 'b' }, { subject: 's', body: 'b' }];
      let c = buildCampaign({ steps, launchAt: '2026-07-16', targets: [{ cid: 'c1', email: 'a@x.fr' }] });
      c = pauseCampaign(c);
      eq(dueSends(c, '2026-07-16').length, 0);
      c = resumeCampaign(c);
      eq(dueSends(c, '2026-07-16').length, 1);
      c = stopCampaign(c);
      eq(c.state, 'stopped');
      eq(dueSends(c, '2026-07-16').length, 0);
      eq(cAddDays('2026-01-31', 7), '2026-02-07');
      eq(cAddDays('2026-12-28', 7), '2027-01-04');
      eq(cAddDays('2028-02-28', 7), '2028-03-06');       /* bissextile */
      /* stats */
      let cc = buildCampaign({ steps, launchAt: '2026-07-16', targets: [{ cid: 'c1', email: 'a@x.fr' }] });
      let day = '2026-07-16';
      for (let i = 0; i < 40 && cc.state === 'ready'; i++){
        for (const d of dueSends(cc, day)) cc = markSent(cc, d.sid, day);
        day = cAddDays(day, 1);
      }
      eq(cc.state, 'done');
      eq(campaignStats(cc).sent, 3);
    },
    'analyse e-mails : résultat sensible scellé au repos': () => {
      eq(ANALYSIS_KEY, 'oc_analysis_v1');
      ok(SEALABLE.has(ANALYSIS_KEY));
    },
    'analyse e-mails : reprise valide, mission expirée signalée': () => {
      const now = 1900000000000;
      const ready = normaliseMailAnalysis({
        mid: 'ms-test', days: 30, state: 'ready', startedAt: now - 1000,
        expiresAt: now + 1000, result: '{"companies":[]}', count: 6
      }, now);
      eq({ mid: ready.mid, days: ready.days, state: ready.state, count: ready.count },
         { mid: 'ms-test', days: 30, state: 'ready', count: 6 });
      const expired = normaliseMailAnalysis({
        mid: 'ms-old', days: 7, state: 'running', startedAt: now - 2000, expiresAt: now - 1
      }, now);
      eq(expired.state, 'error');
      ok(/expiré/.test(expired.error));
    },
    'verrou : codes triviaux refusés (suites, répétitions)': async () => {
      const { isWeakPin } = await import('./ui/verrou.js');
      ok(isWeakPin('000000'));
      ok(isWeakPin('123456'));
      ok(isWeakPin('654321'));
      ok(isWeakPin('901234'));
      ok(!isWeakPin('280941'));
    },
    'stockage : valeur scellée sans clé = `verrou`, jamais un null': async () => {
      if (vaultActive()) return;   /* un vrai coffre est ouvert : ne pas interférer */
      const probe = 'oc_probe_vault';
      const { key } = await createVault('123456', makeVaultPhrase(), { iter: 15000 });
      const env = await sealValue(key, probe, '{"x":1}');
      await kvSet(probe, env);     /* déjà scellée : écrite telle quelle */
      try { await kvGet(probe); throw new Error('lisible !'); }
      catch (e) { eq(e.message, 'verrou'); }
      eq(await openValue(key, probe, env), '{"x":1}');
      await kvDel(probe);
      eq(await kvGet(probe), null);
    },
    'stockage : re-scellement reprenable — l’enveloppe déjà migrée est reconnue': async () => {
      if (vaultActive()) return;   /* un vrai coffre est ouvert : ne pas interférer */
      let p0 = null, r0 = null;
      try { p0 = await kvGet(PROMO_KEY); r0 = await kvGet(RELAYS_KEY); }
      catch (e) { return; }        /* valeurs scellées d'un vrai coffre : ne pas toucher */
      const vOld = await createVault('111111', makeVaultPhrase(), { iter: 15000 });
      const vNew = await createVault('222222', makeVaultPhrase(), { iter: 15000 });
      await kvSet(PROMO_KEY, await sealValue(vOld.key, PROMO_KEY, 'ancienne'));
      /* rotation interrompue simulée : celle-ci est DÉJÀ sous la nouvelle clé */
      await kvSet(RELAYS_KEY, await sealValue(vNew.key, RELAYS_KEY, 'deja-migree'));
      const n = await vaultReseal(vOld.key, vNew.key);
      eq(n, 1);                    /* une seule re-scellée, l'autre reconnue et gardée */
      eq(await kvGet(PROMO_KEY), 'ancienne');
      eq(await kvGet(RELAYS_KEY), 'deja-migree');
      vaultDetach();
      await (p0 == null ? kvDel(PROMO_KEY) : kvSet(PROMO_KEY, p0));
      await (r0 == null ? kvDel(RELAYS_KEY) : kvSet(RELAYS_KEY, r0));
    }
  };
  for (const name of Object.keys(tests)){
    try { await tests[name](); R.push({ test: name, résultat: '✓' }); }
    catch (e) { R.push({ test: name, résultat: '✗ ' + (e && e.message) }); }
  }
  const ko = R.filter(r => r.résultat !== '✓').length;
  console.table(R);
  if (ko) console.warn('Auto-tests :', ko, 'échec(s) sur', R.length);
  window.__ocTests = R;
  return R;
}
