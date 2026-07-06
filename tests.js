/* ============================================================
   OpenContact — auto-tests du moteur (?test dans l'URL)
   Le gardien de l'extraction : si tout est vert, le moteur rend
   exactement ce qu'il rendait avant le découpage en modules.
   Chargé à la demande par app.js — résultats en console et dans
   window.__ocTests ; le toast est affiché par l'interface.
   ============================================================ */
import { esc, normName, extractCity, distKm } from './engine/utils.js';
import { KDF_ITER, encryptOC2, decryptOC2, deriveKey, bytesToB64,
         fnv, ocKeystream, unsealOC1 } from './engine/crypto.js';
import { normalizeCompany } from './engine/model.js';
import { communityView, parseInput } from './engine/exchange.js';
import { findMatch, mergeIncoming } from './engine/merge.js';

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
    'normalizeCompany : héritage v1, domaine inconnu, extra (D3)': () => {
      const c = normalizeCompany({ name: 'X', contact: 'Ana', email: 'a@b.fr', domain: 'zzz', champFutur: 42 });
      eq(c.domain, 'autre');
      eq(c.contacts.length, 1);
      eq(c.contacts[0].email, 'a@b.fr');
      eq(c.extra, { champFutur: 42 });
    },
    'communityView : aucune fuite privée': () => {
      const v = communityView(normalizeCompany({
        name: 'X', status: 'sent', notes: 'secret',
        appliedAt: '2026-01-01', nextAction: '2026-02-01',
        history: [{ d: '2026-01-01', t: 'x' }]
      }));
      for (const k of ['status', 'notes', 'appliedAt', 'nextAction', 'history', 'id', 'demo']) ok(!(k in v));
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
        { name: 'Beta', status: 'won', notes: 'privé du voisin' }
      ], comps);
      const a = comps[0], b = comps[1];
      eq(st.addedC, 1); eq(st.enriched, 1); eq(st.addedCt, 1); eq(st.conflicts, 2);
      eq(a.desc, 'garde-moi'); eq(a.techs, 'Azure');
      eq(a.contacts[0].name, 'Ana'); eq(a.contacts[0].phone, '0601');
      eq(a.contacts[0].conf, 'doubt'); eq(a.contacts[1].conf, 'doubt');
      eq(b.status, 'todo'); eq(b.notes, '');
    },
    'parseInput : garde-fous de taille (D4)': async () => {
      try { await parseInput('x'.repeat(4000001)); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'troplourd'); }
      const many = JSON.stringify({ companies: Array.from({ length: 2001 }, (_, i) => ({ name: 'c' + i })) });
      try { await parseInput(many); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'tropdepistes'); }
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
