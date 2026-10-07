/* ============================================================
   OpenContact — auto-tests du moteur (?test dans l'URL)
   Le gardien de l'extraction : si tout est vert, le moteur rend
   exactement ce qu'il rendait avant le découpage en modules.
   Chargé à la demande par app.js — résultats en console et dans
   window.__ocTests ; le toast est affiché par l'interface.
   ============================================================ */
import { esc, normName, extractCity, surUnRang, distKm, todayISO, localISO } from './engine/utils.js';
import { KDF_ITER, encryptOC2, decryptOC2, deriveKey, bytesToB64,
         fnv, ocKeystream, unsealOC1 } from './engine/crypto.js';
import { APP_VERSION, VECU, normalizeCompany, normalizeContact, normalizeProfile,
         pushHist, fillTpl, CLOSE_REASONS, TROUS, crochets, remplirTrous, safeUrl, summarizeChanges,
         RECHERCHES, dateLongue, dureeRecherche, periodeValide, phraseRecherche, resumeRecherche,
         manquesProfil, emailPlausible, majModelesDefaut, defaultTemplates,
         prendCeQueJeCherche, PREND_MOT, modeleConseille,
         isActiveCt, nextActionContact,
         PROMPTS_MAX, PROMPT_MAX_LEN } from './engine/model.js';
import { communityView, parseInput, sharePayload, fullPayload,
         encodeOCQ, splitOCQ, makeOCQJoiner, OCQP_CHUNK,
         makeRdvCode, rdvNorm, rdvWrap, rdvParse, linkWrap, linkParse,
         encodeOCA, decodeOCA, estOCA } from './engine/exchange.js';
import { findMatch, mergeIncoming, contactKey } from './engine/merge.js';
import { syncMerge, mergeTombs, TOMBS_MAX } from './engine/sync.js';
import { filterCompanies, filterOrphans, searchHint, NATURAL_DIR } from './engine/filter.js';
import { scoreOf } from './engine/score.js';
import { DATA_KEY, PROFILE_KEY, JOURNAL_KEY, ORPHANS_KEY, TOMBS_KEY, SYNC_KEY,
         RELAYS_KEY, TURN_KEY, DEVICE_KEY, DEVICES_KEY, PROMO_KEY, VAULT_KEY,
         ANALYSIS_KEY, VUS_KEY, SEALABLE, THEME_KEY, VIEW_KEY, OLD_V2, OLD_V1, CLES_A_EFFACER,
         kvGet, kvSet, kvDel, vaultActive, vaultDetach, vaultReseal } from './engine/storage.js';
import { causeLiaison, relayTally, liaisonStage, parseTurn, turnText, TURN_MAX, RELAIS_DEFAUT } from './engine/transport.js';
import { clePortage, sceller as scellerPortage, ouvrir as ouvrirPortageMsg, decouper, rassembler, recolte,
         PORTAGE_PART, PORTAGE_PARTS_MAX, makeCleEchange, cleEntre, decouperScelle, rassemblerScelle } from './engine/portage.js';
import { VAULT_WORDS, PHRASE_LEN, makeVaultPhrase, normVaultPhrase, phraseUnknownWords,
         createVault, unlockWithPin, unlockWithPhrase, unlockWithPrf,
         setPin, addPrfWrap, rotateVault,
         rotateVaultResumable, prevKeyOf, clearPrev,
         sealValue, openValue, isSealed } from './engine/vault.js';
import { edAvailable, makeDeviceKeys, recoveryKeys, ringInit, ringAddDevice,
         ringCommand, ringTransfer, ringRecover, ringRekey, ringRename, nomAppareil,
         mergeRing, actionsFor, verifyRing, deviceIn } from './engine/ring.js';
import { DAILY_CAP, buildCampaign, dueSends, dueSendsAll, sentTodayAll,
         markSent, markReplied, markError, stopCompanyTargets,
         pauseCampaign, resumeCampaign, stopCampaign, campaignStats,
         inSendWindow, addDays as cAddDays } from './engine/campaign.js';
import { buildMime, encodeHeader, toB64Url, authUrl, parseCallback, pkcePair } from './engine/mailer.js';
import { dueFollowups, contactFromSignature, exchangeLog, exchangeTotals, nextActionSuggestions,
         silentPistes, derniereTrace, recuesDormantes, jamaisDonnees, canalCourt,
         SILENCE_RELANCE, SILENCE_DERNIERE, SILENCE_TROP_TARD,
         sansFilet, FILET_MIN_PISTES, FILET_JOURS, aDemarrer } from './engine/assist.js';
import { rappelICS, lienAgendaGoogle, formeAgenda, RAPPEL_HEURE } from './engine/agenda.js';
import { normalizeParcours, parcoursDe, periodeParcours, phraseParcours, PARCOURS_MAX } from './engine/parcours.js';
import { nouvelIdAmi, idAmiValide, cleEntreprise, memeEntreprise, profilDonne, normalizeAmi, normalizeAmis,
         statutAmi, ajouterAmi, retirerAmi, prenomAmi, enCours, direExperience, portesAmis, AMIS_MAX } from './engine/amis.js';
import { nouvelleCle, boiteValide, cleValide, etiquetteBoite, sceller, ouvrir, lettreDemande, lettreDon, lettreMerci,
         contactDonne, normaliserLettre, contactsPour, etatVide, normaliserEtat, elaguer, peutDemander,
         demandeDePiste, traiterLettre, DEMANDE_JOURS, DEMANDES_OUVERTES_MAX } from './engine/boite.js';
import { interpreter, retirer, remplacer, chercherPistes, raisonDe, propositions, elargir,
         contexteRecherche, porteurs, deptDuCp, villeFrequente, deptDePiste, zoneDe, metierDuMoment,
         fraicheur, METIER, metierDuProfil, villeConnue, lieuDuProfil, metierEtiquetteDuProfil, rayonDe,
         correction, fautes, fautesPermises } from './engine/requete.js';
import { questionsAnnuaire, lireAnnuaire, decouvertes, versPiste, motsInterdits, casse, offresAlternance, LBA, LOIN_KM,
         domaineDeNaf, ANNUAIRE, questionSiren, questionNom, questionSite, lireSite,
         complements, dirigeantsAjoutables, lienGens, suggestionsNom, sousLigneNom, WIKIDATA, genreQuestion,
         ajoutsProfil, loinDe, offresStage, HELLOWORK, questionClearbit, lireClearbit, CLEARBIT,
         ecarter, rendre, sirensEcartes, cleVus, lireVus, nouveauxDe, noterVus, VUS_RECHERCHES } from './engine/annuaire.js';
import { BMO, marche, niveauDiplome, aideEmbauche, euros, AIDE_FIN } from './engine/marche.js';
import { questionWikidata, lireWikidata, questionResume, lireResume, questionBodacc, lireBodacc,
         carte, WIKIPEDIA_FR, BODACC, LINKEDIN_PAGE, aQui, estGrande, travailDe, TRAVAIL } from './engine/carte.js';
import { makeMission, missionUsable, revokeMission, foldCampaignReport,
         signMission, openMissionWire } from './engine/mission.js';
import { normCode, pairKey } from './engine/ordinateur.js';
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
    /* UNE ADRESSE POSTALE TIENT SUR PLUSIEURS LIGNES, et la ville est
       sur la DERNIÈRE. Sans ça, une adresse sans virgule rendait le
       texte entier comme ville — et cette ville nourrit l'anti-doublon
       (`merge.js`) autant que le champ `city` d'une piste reçue. */
    'extractCity lit la dernière ligne d’une adresse multi-ligne': () =>
      eq(extractCity('12 rue du Rempart Saint-Étienne\n31000 Toulouse'), 'Toulouse'),
    'extractCity : une ligne vide en fin ne décale rien': () =>
      eq(extractCity('12 rue X\n59000 Lille\n\n'), 'Lille'),
    'extractCity : le cas d’UNE ligne ne bouge pas': () =>
      eq(extractCity('12 rue X, 59000 Lille'), extractCity('12 rue X, 59000 Lille')),
    /* ce qui SORT vers un service tiers se replie sur un rang : un
       `%0A` au milieu d'une destination ne se géocode pas */
    'surUnRang recolle les lignes par une virgule': () =>
      eq(surUnRang('12 rue du Rempart\n31000 Toulouse'), '12 rue du Rempart, 31000 Toulouse'),
    'surUnRang laisse une valeur d’une ligne intacte': () =>
      eq(surUnRang('12 rue X, 59000 Lille'), '12 rue X, 59000 Lille'),
    'surUnRang ne rend rien pour du vide': () => eq(surUnRang('\n  \n'), ''),
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
    /* un PDF, une photo, un texte quelconque : la cause est une MAUVAISE
       PIÈCE, pas une panne. Avant, l'erreur de JSON.parse remontait telle
       quelle et l'écran affichait « Unexpected token '%' … not valid
       JSON » — en anglais, à un étudiant qui s'est trompé de fichier. */
    'parseInput : un fichier qui n’est pas un .oc rend « format », jamais l’erreur brute': async () => {
      for (const brut of ['%PDF-1.4\n%âãÏÓ\n1 0 obj', 'bonjour', '{ "companies": [', '\u0089PNG\r\n']){
        try { await parseInput(brut); throw new Error('accepté : ' + brut); }
        catch (e) { eq(e.message, 'format'); }
      }
    },

    /* — tests de sécurité — */
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
    'transport : causeLiaison nomme la panne, et se tait quand elle ne sait pas': () => {
      /* les trois textes que Trystero rend par `onJoinError` — vérifiés
         dans le bundle vendorisé, pas devinés */
      eq(causeLiaison({ error: 'incorrect room password when decrypting offer' }), 'motdepasse');
      eq(causeLiaison({ error: 'incorrect room password when decrypting answer' }), 'motdepasse');
      eq(causeLiaison({ error: 'could not connect to peer abc after exchanging SDP; '
        + 'configure TURN servers with turnConfig or rtcConfig.iceServers' }), 'sansturn');
      eq(causeLiaison({ error: 'could not connect to peer abc after exchanging SDP; '
        + 'check that your TURN server URLs and credentials are reachable by both peers' }), 'turnmuet');
      /* une chaîne nue passe aussi : l'appelant ne doit pas avoir à
         connaître la forme de l'objet */
      eq(causeLiaison('incorrect room password when decrypting offer'), 'motdepasse');
      /* ON NE DEVINE PAS. Un texte que la prochaine version changerait
         doit rendre `inconnu` — jamais une cause fausse, qui enverrait
         retaper un code à qui a besoin d'un TURN. */
      eq(causeLiaison({ error: 'quelque chose de neuf' }), 'inconnu');
      eq(causeLiaison(null), 'inconnu');
      eq(causeLiaison(undefined), 'inconnu');
      eq(causeLiaison({}), 'inconnu');
    },
    'transport : relayTally compte les sockets par état, ET ceux qui PORTENT': () => {
      const vide = { total: 0, open: 0, pending: 0, vivants: 0, refus: 0, muets: 0 };
      eq(relayTally(null), vide);
      eq(relayTally({}), vide);
      const socks = { a: { readyState: 1 }, b: { readyState: 0 }, c: { readyState: 3 }, d: null };
      /* SANS PREUVE, ON N'ACCUSE PERSONNE : un appelant qui ne sait pas
         qui a porté ne doit pas faire dire à cette fonction que les
         relais sont muets. `vivants` vaut alors `open`. */
      eq(relayTally(socks), { total: 3, open: 1, pending: 1, vivants: 1, refus: 0, muets: 0 });
      /* LE SILENCE SE COMPTE, MAIS IL NE CONDAMNE PAS. Un socket ouvert
         qui n'a encore rien porté rejoint `muets` — c'est ce que le
         rapport de diagnostic doit pouvoir dire — et il reste VIVANT.
         Une version exigeait la preuve inverse, et elle a fait crier
         « Pas de connexion » sur un vrai téléphone pendant que la
         liaison s'établissait : en données mobiles les accusés arrivent
         en ordre dispersé. Un faux positif de panne fait RENONCER, ce
         qui coûte plus cher que l'attente qu'il prétend abréger. */
      eq(relayTally(socks, new Set(), new Set(), new Set()),
         { total: 3, open: 1, pending: 1, vivants: 0, refus: 0, muets: 0 });
      /* il parle, mais n'a rien porté : vivant, et COMPTÉ pour le rapport */
      eq(relayTally(socks, new Set(['a']), new Set(), new Set()),
         { total: 3, open: 1, pending: 1, vivants: 1, refus: 0, muets: 1 });
      eq(relayTally(socks, new Set(['a'])), { total: 3, open: 1, pending: 1, vivants: 1, refus: 0, muets: 0 });
      /* un relais qui a porté mais dont le socket est retombé ne
         compte pas : c'est `readyState` qui commande l'ouverture */
      eq(relayTally({ z: { readyState: 3 } }, new Set(['z'])),
         { total: 1, open: 0, pending: 0, vivants: 0, refus: 0, muets: 0 });
    },
    'transport : AVALER EN SILENCE n’est ni répondre ni refuser': () => {
      /* LA PANNE DES DEUX TÉLÉPHONES, réduite à ses termes. Un relais
         ouvre le socket, sert les lectures, puis prend nos publications
         SANS UN MOT : ni `OK true`, ni `OK false`. Les trois mesures
         précédentes le comptaient vivant — socket ouvert, il a parlé,
         il n'a pas refusé — et l'écran tournait à l'infini sur les
         trois surfaces à la fois.
         Ce qui le distingue d'un relais sain n'est PAS son bavardage :
         c'est qu'il n'a jamais rien porté. */
      const socks = { a: { readyState: 1 }, b: { readyState: 1 } };
      const avale = relayTally(socks, new Set(['a', 'b']), new Set(), new Set());
      /* ils se COMPTENT — le rapport peut le dire — mais ils restent
         vivants : rien ne prouve encore qu'ils ne porteront pas. */
      eq(avale, { total: 2, open: 2, pending: 0, vivants: 2, refus: 0, muets: 2 });
      /* L'ÉCRAN N'INVENTE DONC PAS UNE PANNE. C'est le délai
         (`SANS_PAIR_*`) qui sort de l'attente vaine, pas un jugement sur
         le silence — un délai ne se trompe sur personne. */
      eq(liaisonStage({ peers: 0, exchanged: false, rtcFail: false, graceOver: true,
                        relays: avale }), 'wait');
      /* et un refus EXPLICITE, lui, condamne toujours */
      eq(liaisonStage({ peers: 0, exchanged: false, rtcFail: false, graceOver: true,
                        relays: relayTally(socks, new Set(['a', 'b']), new Set(['a', 'b']), new Set()) }), 'norelay');
    },
    'transport : RÉPONDRE N’EST PAS RELAYER — un relais qui refuse ne vit pas': () => {
      const socks = { a: { readyState: 1 }, b: { readyState: 1 } };
      const ont = new Set(['a', 'b']);
      /* les deux ont porté : les deux vivent */
      eq(relayTally(socks, ont), { total: 2, open: 2, pending: 0, vivants: 2, refus: 0, muets: 0 });
      /* `a` a répondu « OK false » MAIS il avait déjà porté : un plafond
         de débit passager ne le condamne pas pour la session. */
      eq(relayTally(socks, ont, new Set(['a']), ont),
         { total: 2, open: 2, pending: 0, vivants: 2, refus: 0, muets: 0 });
      /* celui qui refuse SANS avoir jamais porté, lui, sort des vivants
         — c'est la seule preuve sur laquelle on condamne. */
      eq(relayTally(socks, ont, new Set(['a']), new Set(['b'])),
         { total: 2, open: 2, pending: 0, vivants: 1, refus: 1, muets: 0 });
      /* AUCUN n'a porté et tous refusent : plus personne pour la
         découverte. C'est le cas mesuré le 18/09 chez qui ne joignait
         que des relais restreints — l'écran disait « En attente » à
         l'infini. */
      eq(relayTally(socks, ont, new Set(['a', 'b']), new Set()),
         { total: 2, open: 2, pending: 0, vivants: 0, refus: 2, muets: 0 });
      /* et c'est bien « Pas de connexion » qui en sort, pas une attente */
      eq(liaisonStage({ peers: 0, exchanged: false, rtcFail: false, graceOver: true,
                        relays: { total: 2, open: 2, vivants: 0, refus: 2 } }), 'norelay');
      /* un socket fermé qui aurait refusé ne se compte nulle part */
      eq(relayTally({ z: { readyState: 0 } }, new Set(['z']), new Set(['z'])),
         { total: 1, open: 0, pending: 1, vivants: 0, refus: 0, muets: 0 });
    },
    'transport : des sockets ouverts mais muets ne sont pas une attente': () => {
      const base = { peers: 0, exchanged: false, rtcFail: false, graceOver: true };
      /* sept relais joints, aucun qui parle : attendre n'y changera
         rien, donc on dit la panne au lieu d'accuser le pair absent */
      eq(liaisonStage({ ...base, relays: { total: 9, open: 7, vivants: 0 } }), 'norelay');
      /* avant le délai de grâce, on ne crie pas au loup */
      eq(liaisonStage({ ...base, graceOver: false, relays: { total: 9, open: 7, vivants: 0 } }),
         'connecting');
      /* un seul relais qui répond suffit à rendre l'attente honnête */
      eq(liaisonStage({ ...base, relays: { total: 9, open: 7, vivants: 1 } }), 'wait');
      /* et un pair connecté prime sur tout le reste */
      eq(liaisonStage({ ...base, peers: 1, exchanged: true,
        relays: { total: 9, open: 7, vivants: 0 } }), 'on');
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
    /* Deux appareils ne se trouvent que sur un relais COMMUN. Sans
       liste, Trystero en tire cinq sur quarante-trois d'après l'`appId`
       — les mêmes cinq pour tout le monde, et jamais les autres : cinq
       pannes possibles pour un seul échec, sans repli. La liste est
       donc épinglée, et deux propriétés doivent tenir dans le temps. */
    'transport : la liste de relais garde son ancrage et sa largeur': () => {
      /* ① LE PONT ENTRE VERSIONS TIENT — mais seulement par ce qui en est
         un. Un appareil resté sur l'ancienne version n'écoute que les
         cinq du tirage par défaut ; trois d'entre eux ne portent plus
         rien pour personne (mesuré deux fois le 18/09), donc les garder
         n'aurait relié aucun camarade. Ces deux-là, si : ce sont eux le
         terrain commun, et les retirer casserait vraiment le partage
         entre un téléphone à jour et celui qui ne l'est pas. */
      for (const r of ['wss://nostr-relay.corb.net', 'wss://nostr.sathoarder.com'])
        eq(RELAIS_DEFAUT.includes(r), true);
      /* ② et la liste ÉLARGIT : cinq relais, c'est le point de départ,
         pas l'arrivée — sans marge, une panne redevient fatale */
      eq(RELAIS_DEFAUT.length > 5, true);
      /* ③ que des adresses de relais valides, sans doublon */
      eq(RELAIS_DEFAUT.every(u => /^wss:\/\/[a-z0-9.\-]+(\/[\w\-/]*)?$/.test(u)), true);
      eq(new Set(RELAIS_DEFAUT).size, RELAIS_DEFAUT.length);
      /* ④ CE QUI A ÉTÉ MESURÉ MUET NE REVIENT PAS EN DOUCE. Ces quatre
         répondaient parfaitement aux lectures et ne relayaient rien, aux
         deux passages du 18/09 : les réinscrire sur leur bonne mine
         coûterait quatre sockets et une redondance en peinture. Pour en
         reprendre un : le re-mesurer d'abord (mode routine de
         `sonde-decouverte-relais.mjs`), puis le retirer d'ici, dans le
         même geste. */
      for (const r of ['wss://basspistol.org', 'wss://relay.libernet.app',
                       'wss://hornetstorage.net/relay', 'wss://purplerelay.com'])
        eq(RELAIS_DEFAUT.includes(r), false);
      /* ⑤ NI CE QUI A ÉTÉ MESURÉ NUISIBLE. damus limite puis bannit le
         trafic normal de l'app, et a refusé une RÉPONSE en pleine
         négociation entre deux vraies machines — la liaison est tombée.
         mostro avale sans un mot, cinq relevés sur cinq. */
      for (const r of ['wss://relay.damus.io', 'wss://relay.mostro.network', 'wss://relay.mostr.pub'])
        eq(RELAIS_DEFAUT.includes(r), false);
    },
    /* LE PORTAGE PAR RELAIS (engine/portage.js) : le tuyau qui reste
       quand aucun chemin direct ne s'ouvre entre deux téléphones. */
    'portage : aller-retour d’un partage découpé, parts dans le désordre et en double': async () => {
      const list = Array.from({ length: 60 }, (_, i) => ({ id: 'p' + i, name: 'Piste ' + i,
        city: 'Lille', contacts: [{ id: 'c' + i, name: 'Contact ' + i, email: 'c' + i + '@ex.test' }] }));
      const payload = sharePayload(list, null, '');
      const k = await clePortage('abcde23456');
      const { x, n, parts } = await decouper(payload, 120);
      ok(n > 2);
      const rec = recolte();
      eq(rec.manque(), null);
      let fini = null;
      const ordre = parts.map((_, i) => i).reverse();
      for (const i of [ordre[0], ...ordre]){
        const m = await ouvrirPortageMsg(k, await scellerPortage(k, { t: 'part', de: 'A', x, i, n, d: parts[i] }));
        ok(m);
        fini = rec.ajouter(m) || fini;
        if (!fini) ok(rec.manque().length > 0);
      }
      ok(fini);
      eq(await rassembler(fini), JSON.parse(JSON.stringify(payload)));
    },
    'portage : sans le bon code, un message ne s’ouvre pas': async () => {
      const k1 = await clePortage('abcde23456');
      const k2 = await clePortage('abcde23457');
      ok(k1.sujet !== k2.sujet);
      ok(/^oc-portage-[0-9a-f]{32}$/.test(k1.sujet));
      /* le sujet que voit un relais ne contient pas le code */
      ok(!k1.sujet.includes('abcde'));
      const txt = await scellerPortage(k1, { t: 'demande', de: 'B', r: 'r1', manque: null });
      eq(await ouvrirPortageMsg(k2, txt), null);
      eq((await ouvrirPortageMsg(k1, txt)).r, 'r1');
      eq(await ouvrirPortageMsg(k1, 'bruit.pas-du-base64'), null);
      eq(await ouvrirPortageMsg(k1, txt.slice(0, -4) + 'AAAA'), null);
    },
    'portage : un message mal formé est refusé, même scellé': async () => {
      const k = await clePortage('abcde23456');
      for (const m of [
        { t: 'ordre', de: 'A' },
        { t: 'part', de: 'A', x: 'x', i: 3, n: 3, d: 'QQ==' },
        { t: 'part', de: 'A', x: 'x', i: 0, n: PORTAGE_PARTS_MAX + 1, d: 'QQ==' },
        { t: 'part', de: 'A', x: 'x', i: 0, n: 1, d: 'Q'.repeat(PORTAGE_PART * 2) },
        { t: 'demande', de: 'A', r: 'r', manque: [-1] },
        { t: 'recu', de: '', r: 'r' }
      ]) eq(await ouvrirPortageMsg(k, await scellerPortage(k, m)), null);
    },
    'portage : un groupe et un rendez-vous ne partagent jamais un sujet': async () => {
      const rdv = await clePortage('abcde23456');
      const grp = await clePortage('abcde23456', 'groupe');
      ok(rdv.sujet !== grp.sujet);
      const txt = await scellerPortage(grp, { t: 'present', de: 'C' });
      eq(await ouvrirPortageMsg(rdv, txt), null);
      eq((await ouvrirPortageMsg(grp, txt)).t, 'present');
    },
    'portage : la récolte d’un groupe suit plusieurs envois et les oublie': async () => {
      const rec = recolte();
      const m = (x, i, n) => ({ t: 'part', de: 'A', x, i, n, d: 'QQ==' });
      eq(rec.ajouter(m('x1', 0, 2)), null);
      eq(rec.ajouter(m('x2', 1, 3)), null);
      eq(rec.manque('x1'), [1]);
      eq(rec.manque('x2'), [0, 2]);
      ok(rec.ajouter(m('x1', 1, 2)));
      rec.oublier('x1');
      eq(rec.manque('x1'), null);
      eq(rec.enCours(), ['x2']);
    },
    /* « MES APPAREILS » : la clé des données ne dépend PAS de la phrase */
    'portage : deux appareils fabriquent la même clé, un troisième non': async () => {
      const A = await makeCleEchange(), B = await makeCleEchange(), C = await makeCleEchange();
      const kAB = await cleEntre(A.priv, B.pub, 'dev-a', 'dev-b');
      const kBA = await cleEntre(B.priv, A.pub, 'dev-b', 'dev-a');
      const kCB = await cleEntre(C.priv, B.pub, 'dev-a', 'dev-b');
      const privee = { kind: 'full', companies: [{ name: 'Piste', notes: 'note intime' }] };
      const e = await decouperScelle(privee, kAB, 40);
      ok(e.n > 1);
      eq(await rassemblerScelle(e.parts, kBA), privee);
      let e1 = '', e2 = '';
      try { await rassemblerScelle(e.parts, kCB); } catch (x) { e1 = x.message; }
      try { await rassembler(e.parts); } catch (x) { e2 = x.message; }
      eq(e1, 'motdepasse');
      eq(e2, 'format');
    },
    'portage : la présence d’un appareil se valide, une présence tronquée non': async () => {
      const k = await clePortage('abcde23456', 'appareils');
      const A = await makeCleEchange();
      const bon = { t: 'hello', de: 's1', id: 'dev-a', nom: 'iPhone · Safari', pub: '', sig: '', xpub: A.pub };
      eq((await ouvrirPortageMsg(k, await scellerPortage(k, bon))).xpub, A.pub);
      eq(await ouvrirPortageMsg(k, await scellerPortage(k, Object.assign({}, bon, { xpub: 'court' }))), null);
      eq(await ouvrirPortageMsg(k, await scellerPortage(k, Object.assign({}, bon, { id: '' }))), null);
    },
    'portage : un envoi trop gros refuse de se découper': async () => {
      const u = new Uint8Array(PORTAGE_PART * (PORTAGE_PARTS_MAX + 16));
      for (let i = 0; i < u.length; i += 65536) crypto.getRandomValues(u.subarray(i, i + 65536));
      let e = '';
      try { await decouper({ bruit: bytesToB64(u) }); } catch (x) { e = x.message; }
      eq(e, 'troplourd');
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
    'profil : école et recherche se normalisent — un choix connu, une date qui existe, ou rien': () => {
      const p = normalizeProfile({ ecole: '  Lycée Eiffel  ', recherche: 'cdi', debut: '2027-02-31', fin: 'demain', rythme: 7 });
      eq(p.ecole, 'Lycée Eiffel');
      eq(p.recherche, '');                     /* « cdi » n'est pas une recherche du profil */
      eq(p.debut, '');                          /* le 31 février n'existe pas */
      eq(p.fin, '');
      eq(p.rythme, '7');
      const vieux = normalizeProfile({ name: 'Moi' });          /* profil d'avant la 6.31 */
      eq(vieux.ecole, ''); eq(vieux.recherche, ''); eq(vieux.debut, '');
      ok(Object.keys(RECHERCHES).join() === 'stage,alternance,emploi');
    },
    'recherche : la durée se déduit des deux dates, bornes incluses': () => {
      eq(dateLongue('2027-09-01'), '1er septembre 2027');
      eq(dateLongue('2027-01-06', false), '6 janvier');
      eq(dateLongue('2027-02-14', true, true), '14 févr. 2027');
      eq(dateLongue('2027-02-30'), '');
      /* du lundi 4 janvier au vendredi 5 février : cinq semaines de travail */
      eq(dureeRecherche('2027-01-04', '2027-02-05', 'stage'), '5 semaines');
      eq(dureeRecherche('2027-01-06', '2027-01-08', 'stage'), '3 jours');
      eq(dureeRecherche('2027-03-01', '2027-08-31', 'stage'), '6 mois');   /* long : en mois */
      eq(dureeRecherche('2027-09-01', '2029-08-31', 'alternance'), '2 ans');
      eq(dureeRecherche('2027-09-01', '2028-08-31', 'alternance'), '1 an');
      eq(dureeRecherche('2027-09-01', '2029-02-28', 'alternance'), '18 mois');
      eq(dureeRecherche('2027-02-01', '2027-01-01', 'stage'), null);      /* la fin avant le début */
      ok(!periodeValide('2027-02-01', '2027-01-01'));
      ok(periodeValide('2027-02-01', ''));                                /* une seule date : rien à contredire */
    },
    'recherche : la phrase du mail dit le type, la durée et la période': () => {
      /* rien choisi : exactement ce que le modèle disait avant */
      eq(phraseRecherche({}), 'un stage');
      eq(phraseRecherche({ recherche: 'stage', debut: '2027-01-04', fin: '2027-02-12' }),
         'un stage de 6 semaines, du 4 janvier au 12 février 2027');
      /* à cheval sur deux années : chaque date porte la sienne */
      eq(phraseRecherche({ recherche: 'stage', debut: '2026-12-14', fin: '2027-02-19' }),
         'un stage de 10 semaines, du 14 décembre 2026 au 19 février 2027');
      eq(phraseRecherche({ recherche: 'stage', debut: '2027-01-04' }), 'un stage à partir du 4 janvier 2027');
      eq(phraseRecherche({ recherche: 'alternance', debut: '2027-09-01', fin: '2029-08-31' }),
         'une alternance de 2 ans à partir du 1er septembre 2027');
      /* l'emploi n'a pas de fin, même si une date traîne d'avant */
      eq(phraseRecherche({ recherche: 'emploi', debut: '2027-07-01', fin: '2027-09-01' }),
         'un emploi à partir du 1er juillet 2027');
      eq(resumeRecherche({ recherche: 'stage', debut: '2027-01-04', fin: '2027-02-12' }), 'Stage · 4 janv. → 12 févr. 2027');
      eq(resumeRecherche({ recherche: 'alternance', debut: '2027-09-01', fin: '2029-08-31' }), 'Alternance · 2 ans dès le 1er sept. 2027');
      eq(resumeRecherche({}), '');
    },
    'profil : ce qui manque à un mail de candidature, dans l’ordre du mail': () => {
      eq(manquesProfil({}).join(), 'formation,école,ce que tu cherches,email');
      eq(manquesProfil({ formation: 'BTS', ecole: 'X', recherche: 'stage', email: 'a@b.fr' }).length, 0);
      ok(emailPlausible('sam.martin@lycee.fr'));
      ok(!emailPlausible('sam.martin@lycee'));      /* le domaine manque */
      ok(!emailPlausible('sam.martin.lycee.fr'));   /* le @ manque */
      ok(!emailPlausible('sam martin@lycee.fr'));
    },
    'modèle de candidature : sans lien de CV, la présentation RESTE': () => {
      /* Le défaut d'origine : « Je suis en … et je cherche un stage. Mon CV :
         {{cv}} » sur une seule ligne. Sans lien, la règle « Étiquette :
         {{jeton}} » faisait sauter la ligne entière — la présentation avec. */
      const c = normalizeCompany({ name: 'Zeta' });
      const [cand] = defaultTemplates();
      const sansCv = normalizeProfile({ name: 'Ana B', formation: 'BTS SIO', email: 'a@b.fr' });
      ok(fillTpl(cand.body, c, null, sansCv).includes('Je suis en BTS SIO et je cherche un stage.'));
      ok(!fillTpl(cand.body, c, null, sansCv).includes('Mon CV'));
      const alt = normalizeProfile({ name: 'Ana B', formation: 'BTS SIO', ecole: 'CFA Afia', recherche: 'alternance',
        debut: '2027-09-01', fin: '2029-08-31', rythme: '3 jours / 2 jours', email: 'a@b.fr' });
      const mail = fillTpl(cand.body, c, null, alt);
      ok(mail.includes('je cherche une alternance de 2 ans à partir du 1er septembre 2027.'));
      ok(mail.includes('\nRythme : 3 jours / 2 jours\n'));
      ok(mail.endsWith('Ana B\nCFA Afia\na@b.fr'));
      eq(fillTpl(cand.subject, c, null, alt), 'Candidature alternance BTS SIO — Ana B');
      /* le rythme ne suit que l'alternance */
      ok(!fillTpl(cand.body, c, null, { ...alt, recherche: 'stage' }).includes('Rythme'));
      /* l'emploi n'écrit pas « Candidature emploi » */
      eq(fillTpl(cand.subject, c, null, { ...alt, recherche: 'emploi' }), 'Candidature BTS SIO — Ana B');
    },
    'par où commencer : seulement ce qui n’a jamais démarré': () => {
      /* le défaut joué : écrire à Aztek, fermer « et ensuite ? », et la
         retrouver dans « Par où commencer » avec l'icône mail */
      ok(aDemarrer(normalizeCompany({ name: 'Neuve' })));
      ok(aDemarrer(normalizeCompany({ name: 'À contacter', status: 'todo' })));
      ok(!aDemarrer(normalizeCompany({ name: 'Écrite', status: 'active' })));
      ok(!aDemarrer(normalizeCompany({ name: 'Répondu', status: 'reply' })));
      ok(!aDemarrer(normalizeCompany({ name: 'Planifiée', status: 'todo', nextAction: '2026-10-08' })));
      ok(!aDemarrer(normalizeCompany({ name: 'Close', status: 'todo', closedReason: Object.keys(CLOSE_REASONS)[0] })));
      ok(!aDemarrer(null));
    },
    'agenda : le rappel .ics suit la RFC 5545 — heure locale, alarme, échappement, lignes de 75 octets': () => {
      const ics = rappelICS({ uid: 'p-1/2026', titre: 'Relancer Marc — Aztek, Lille; RH', date: '2026-10-08',
        details: 'Prochaine action\nOpenContact', maintenant: new Date('2026-10-01T10:00:00Z') });
      const l = ics.split('\r\n');
      ok(ics.endsWith('\r\n'), 'fin de ligne CRLF');
      eq(l[0], 'BEGIN:VCALENDAR');
      ok(l.includes('DTSTART:20261008T' + RAPPEL_HEURE.replace(':', '') + '00'), 'heure flottante, sans fuseau');
      ok(l.includes('DTEND:20261008T091500'));
      ok(l.includes('DTSTAMP:20261001T100000Z'));
      ok(l.includes('UID:p-12026@opencontact'), 'UID sans caractère spécial');
      ok(l.includes('TRIGGER:PT0M') && l.includes('BEGIN:VALARM'), 'une alarme fait sonner le téléphone');
      ok(ics.includes('SUMMARY:Relancer Marc — Aztek\\, Lille\\; RH'), 'virgule et point-virgule échappés');
      ok(ics.includes('DESCRIPTION:Prochaine action\\nOpenContact'), 'retour à la ligne échappé');
      const enc = new TextEncoder();
      ok(l.every(x => enc.encode(x).length <= 75), 'aucune ligne au-delà de 75 octets');
      const long = rappelICS({ titre: 'é'.repeat(120), date: '2026-10-08' });
      ok(long.split('\r\n').every(x => enc.encode(x).length <= 75), 'le pliage compte en octets, pas en caractères');
      ok(long.split('\r\n').some(x => x.startsWith(' ')), 'la suite d’une ligne pliée commence par une espace');
      /* une date qui n'en est pas une, ou rien à rappeler : rien du tout */
      eq(rappelICS({ titre: 'x', date: '2026-13-45' }), '');
      eq(rappelICS({ titre: '  ', date: '2026-10-08' }), '');
    },
    'agenda : le lien Google pré-remplit le titre et les deux heures, et la forme suit l’appareil': () => {
      const u = new URL(lienAgendaGoogle({ titre: 'Relancer Marc — Aztek', date: '2026-10-08', details: 'OpenContact' }));
      eq(u.origin + u.pathname, 'https://calendar.google.com/calendar/render');
      eq(u.searchParams.get('action'), 'TEMPLATE');
      eq(u.searchParams.get('text'), 'Relancer Marc — Aztek');
      eq(u.searchParams.get('dates'), '20261008T090000/20261008T091500');
      eq(u.searchParams.get('details'), 'OpenContact');
      eq(lienAgendaGoogle({ titre: 'x', date: 'demain' }), '');
      /* l'agenda d'Apple ouvre un .ics, celui d'Android non */
      eq(formeAgenda('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15'), 'ics');
      eq(formeAgenda('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'), 'ics');
      eq(formeAgenda('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0'), 'google');
      eq(formeAgenda('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0'), 'google');
      eq(formeAgenda(''), 'google');
    },
    /* ---------- LA BARRE DE RECHERCHE COMPREND CE QU'ON TAPE ----------
       docs/recherche.md : « une table d'au moins cent phrases réelles →
       leurs étiquettes attendues ». La signature lit famille:libellé dans
       l'ordre, puis le texte resté texte — c'est ce que l'écran montre. */
    'barre : cent phrases réelles → leurs étiquettes, et l’ambiguïté reste texte': () => {
      const ctx = { today: '2026-10-01', villes: ['Hem', 'Lille', 'Paris'], prenoms: ['Awa', 'Jean-Marc', 'Léa'] };
      const sig = q => {
        const r = interpreter(q, ctx);
        return [r.etiquettes.map(e => e.famille + ':' + e.label).join(' '),
                r.texte.length ? '| ' + r.texte.join(' ') : ''].filter(Boolean).join(' ');
      };
      const R = 'recherche:', M = 'metier:', L = 'lieu:', S = 'statut:', G = 'groupe:';
      const TABLE = {
        'alternance': R + 'Alternance', 'Alternance': R + 'Alternance', 'alternant': R + 'Alternance',
        'alternants': R + 'Alternance', 'apprentissage': R + 'Alternance', 'contrat pro': R + 'Alternance',
        'contrat de professionnalisation': R + 'Alternance', 'alternance alternant': R + 'Alternance',
        'stage': R + 'Stage', 'stages': R + 'Stage', 'stagiaire': R + 'Stage',
        'stage de fin d’études': R + 'Stage', 'emploi': R + 'Emploi', 'job': R + 'Emploi',
        'CDI': R + 'CDI', 'cdd': R + 'CDD', 'freelance': R + 'Freelance',
        'cyber': M + 'Cybersécurité', 'cybersécurité': M + 'Cybersécurité', 'Cybersecurite': M + 'Cybersécurité',
        'sécurité informatique': M + 'Cybersécurité', 'entreprise cyber': M + 'Cybersécurité',
        'cloud': M + 'Cloud', 'hébergeur': M + 'Cloud', 'data center': M + 'Cloud',
        'data': M + 'Data', 'big data': M + 'Data', 'ESN': M + 'ESN', 'SSII': M + 'ESN', 'l’ESN': M + 'ESN',
        'dev': M + 'Développement', 'développeur web': M + 'Développement', 'SLAM': M + 'Développement',
        'web': M + 'Développement', 'réseau': M + 'Réseau', 'réseaux': M + 'Réseau',
        'systèmes et réseaux': M + 'Réseau', 'SISR': M + 'Réseau', 'admin sys': M + 'Réseau',
        'support': M + 'Support', 'helpdesk': M + 'Support', 'help desk': M + 'Support',
        'startup': M + 'Startup', 'start-up': M + 'Startup', 'secteur public': M + 'Secteur public',
        'collectivités': M + 'Secteur public', 'grande entreprise': M + 'Grande entreprise',
        'industrie': M + 'Industrie', 'santé': M + 'Santé',
        'Lille': L + 'Lille', 'lille': L + 'Lille', 'Lyon': L + 'Lyon', 'Saint-Étienne': L + 'Saint-Étienne',
        'St-Etienne': L + 'Saint-Étienne', 'saint étienne': L + 'Saint-Étienne',
        'Villeneuve-d\'Ascq': L + 'Villeneuve-d’Ascq', 'villeneuve d’ascq': L + 'Villeneuve-d’Ascq',
        'Aix-en-Provence': L + 'Aix-en-Provence', 'Le Mans': L + 'Le Mans', 'La Rochelle': L + 'La Rochelle',
        'Clermont-Ferrand': L + 'Clermont-Ferrand', 'Paris': L + 'Paris',
        'Issy-les-Moulineaux': L + 'Issy-les-Moulineaux', 'Lens': L + 'Lens', 'Hem': L + 'Hem',
        '59': L + 'Nord (59)', '75': L + 'Paris (75)', '69': L + 'Rhône (69)', '2A': L + 'Corse-du-Sud (2A)',
        '974': L + 'La Réunion (974)', '59000': L + '59000', 'Nord': L + 'Nord (59)',
        'Gironde': L + 'Gironde (33)', 'Haute-Garonne': L + 'Haute-Garonne (31)',
        'Hauts-de-France': L + 'Hauts-de-France', 'IDF': L + 'Île-de-France', 'île-de-france': L + 'Île-de-France',
        'PACA': L + 'Provence-Alpes-Côte d’Azur', 'Bretagne': L + 'Bretagne',
        'près de moi': L + 'Près de moi', 'autour de moi': L + 'Près de moi',
        'à contacter': S + 'À contacter', 'a contacter': S + 'À contacter', 'en cours': S + 'En cours',
        'réponse': S + 'Réponse', 'entretien': S + 'Réponse', 'sans nouvelles': S + 'Sans nouvelles',
        'sans réponse': S + 'Sans nouvelles', 'à relancer': S + 'À relancer', 'en retard': S + 'En retard',
        'aujourd’hui': S + 'Aujourd’hui', 'cette semaine': S + 'Cette semaine', 'à planifier': S + 'À planifier',
        'clôturées': S + 'Clôturées', 'décroché': S + 'Décroché', 'refusé': S + 'Refusé', 'refus': S + 'Refusé',
        'abandonné': S + 'Abandonné',
        'recommandées': G + 'Recommandées', 'piston': G + 'Recommandées', 'Léa': G + 'Léa', 'lea': G + 'Léa',
        'Jean-Marc': G + 'Jean-Marc', 'PME': 'taille:PME', 'TPE': 'taille:TPE', 'petite entreprise': 'taille:TPE',
        'ETI': 'taille:ETI', 'pme lille': 'taille:PME ' + L + 'Lille',
        /* l'ambiguïté et le précis restent TEXTE (principe 2) */
        'Orange': '| orange', 'Capgemini': '| capgemini', 'Fortinet': '| fortinet', 'pentest': '| pentest',
        'SOC': '| soc', 'Var': '| var', '20': '| 20', '00123': '| 00123', '123': '| 123',
        'Webhelp': '| webhelp', 'Lillebonne': '| lillebonne', 'Toulousaine': '| toulousaine',
        'c++': '| c++', 'C#': '| c#', 'node.js': '| node.js', '"Lens"': '| lens', '« Lille »': '| lille',
        'Groupe Ravenel': '| groupe ravenel',
        /* les phrases entières */
        'alternance Lille': R + 'Alternance ' + L + 'Lille', 'alternance à Lille': R + 'Alternance ' + L + 'Lille',
        'stage cyber Lyon': R + 'Stage ' + M + 'Cybersécurité ' + L + 'Lyon',
        'cyber 69': M + 'Cybersécurité ' + L + 'Rhône (69)',
        'alternance BTS SIO SISR': R + 'Alternance ' + M + 'Réseau',
        'stage dev chez Capgemini à Toulouse': R + 'Stage ' + M + 'Développement ' + L + 'Toulouse | capgemini',
        'Orange Lille': L + 'Lille | orange', 'orange, lille': L + 'Lille | orange',
        'cdi paris': R + 'CDI ' + L + 'Paris', 'en cours Lyon': S + 'En cours ' + L + 'Lyon',
        'sans nouvelles cyber': S + 'Sans nouvelles ' + M + 'Cybersécurité',
        'Léa alternance': G + 'Léa ' + R + 'Alternance', 'Lumen Data': M + 'Data | lumen',
        'Mairie de Lille': L + 'Lille | mairie',
        'alternance idf réseau': R + 'Alternance ' + L + 'Île-de-France ' + M + 'Réseau',
        'cybersécurité Hauts-de-France alternance': M + 'Cybersécurité ' + L + 'Hauts-de-France ' + R + 'Alternance',
        'le': '', '': '', '   ': ''
      };
      ok(Object.keys(TABLE).length >= 100);
      const faux = Object.entries(TABLE).filter(([q, v]) => sig(q) !== v).map(([q, v]) => `${q} → ${sig(q)} (attendu ${v})`);
      if (faux.length) throw new Error(faux.join(' ; '));
    },
    'barre : aucun mot perdu — chaque mot finit dans une étiquette, le texte ou la liaison': () => {
      const ctx = { today: '2026-10-01', villes: ['Lille'], prenoms: ['Léa'] };
      for (const q of ['stage dev chez Capgemini à Toulouse', 'alternance BTS SIO SISR Lille', '"Lens" c++ Orange',
                       'Léa en cours 59 Fortinet', 'l’ESN de la région parisienne', 'sans nouvelles à Lyon',
                       'Saint-Étienne 42000 node.js']){
        const r = interpreter(q, ctx);
        r.jetons.forEach((t, k) => {
          const d = r.destins[k];
          ok(['etiquette', 'texte', 'liaison'].includes(d));
          if (d === 'texte') ok(r.texte.some(x => x.includes(t.mot)));
          if (d === 'etiquette') ok(r.etiquettes.some(e => e.spans.some(([a, b]) => t.debut >= a && t.fin <= b)));
        });
      }
    },
    'barre : retirer une étiquette retire SES mots du champ, et le mot de liaison qui la précède': () => {
      const ctx = { today: '2026-10-01', villes: [], prenoms: [] };
      const sans = (q, famille) => retirer(q, interpreter(q, ctx).etiquettes.find(e => e.famille === famille).spans);
      eq(sans('alternance à Lille', 'lieu'), 'alternance');
      eq(sans('stage cyber Lyon', 'metier'), 'stage Lyon');
      eq(sans('cherche l’ESN', 'metier'), 'cherche');
      eq(sans('alternance alternant Lyon', 'recherche'), 'Lyon');            /* les deux mots de la même étiquette */
      eq(sans('sans nouvelles à Lille', 'statut'), 'à Lille');
      eq(retirer('"Lens" Lille', [[0, 6]]), 'Lille');
      eq(remplacer('alternance Lille', interpreter('alternance Lille', ctx).etiquettes[1].spans, '59'), 'alternance 59');
      eq(remplacer('alternance à Lille', interpreter('alternance à Lille', ctx).etiquettes[1].spans, '59'), 'alternance 59');
      eq(remplacer('à Lille en cours', interpreter('à Lille en cours', ctx).etiquettes[0].spans, '59'), '59 en cours');
      eq(deptDuCp('59650'), '59'); eq(deptDuCp('20190'), '2A'); eq(deptDuCp('20200'), '2B');
      eq(deptDuCp('97400'), '974'); eq(deptDuCp('5965'), '');
    },
    'barre : chercher — ce qui correspond pleinement passe devant, et la raison se lit': () => {
      const P = (o) => normalizeCompany({ status: 'todo', domain: 'esn', ...o });
      const A = P({ id: 'a', name: 'Advalys', city: 'Lille', positions: ['alternance'], vecu: 'alternance', vecuQui: 'Léa', updatedAt: 1 });
      const B = P({ id: 'b', name: 'Bureau Muet', city: 'Lille', positions: [], updatedAt: 3 });
      const C = P({ id: 'c', name: 'Cabinet Stages', city: 'Lille', positions: ['stage'], updatedAt: 4 });
      const D = P({ id: 'd', name: 'Delta Lyon', city: 'Lyon', positions: ['alternance'], updatedAt: 5 });
      const E = P({ id: 'e', name: 'Écho', city: 'Lille', positions: ['alternance'], updatedAt: 2 });
      const ctx = contexteRecherche([A, B, C, D, E], '2026-10-01');
      const r = chercherPistes([A, B, C, D, E], { q: 'alternance Lille', ctx, pertinence: true });
      /* C refuse (ses postes sont dits, sans alternance) ; D est à Lyon ;
         B ne dit rien : il reste, APRÈS ceux qui prennent */
      eq(r.liste.map(c => c.id), ['a', 'e', 'b']);
      eq(raisonDe(A, r.interp).accent, 'Léa y a été en alternance');      /* la plus forte d'abord */
      eq(raisonDe(E, r.interp).accent, 'prend des alternants');
      eq(raisonDe(B, r.interp).accent, '');
      /* sans pertinence (un tri choisi), le rang reste, l'ordre choisi aussi */
      eq(chercherPistes([A, B, C, D, E], { q: 'alternance Lille', ctx }).liste.map(c => c.id), ['e', 'a', 'b']);
    },
    'barre : une étiquette ne perd JAMAIS ce que le texte trouvait (sauf numéro et état)': () => {
      const P = (o) => normalizeCompany({ status: 'todo', domain: 'esn', ...o });
      const L = [
        P({ id: '1', name: 'Lyon Data Center', city: 'Villeurbanne' }),
        P({ id: '2', name: 'Cyberdéfense Sud', city: 'Toulouse', domain: 'esn' }),
        P({ id: '3', name: 'Atelier', city: 'Paris', contacts: [{ name: 'Léa Fontaine', email: 'l@a.test' }] }),
        P({ id: '4', name: 'Breizh Net', city: 'Nantes', desc: 'clients en Bretagne' }),
        P({ id: '5', name: 'Alt', city: 'Lille', positions: ['stage'], desc: 'ouvre l’alternance en 2027' }),
        P({ id: '6', name: 'Phone', city: 'Lyon', contacts: [{ name: 'X', phone: '06 59 12 34 56' }] }),
        P({ id: '7', name: 'Note', city: 'Lyon', status: 'todo', notes: 'attendre la réponse' })
      ];
      const ctx = { today: '2026-10-01', villes: ['Lille', 'Lyon'], prenoms: ['Léa'] };
      for (const q of ['lyon', 'cyber', 'léa', 'bretagne', 'alternance']){
        const texte = filterCompanies(L, { q }).map(c => c.id).sort();
        const barre = chercherPistes(L, { q, ctx }).liste.map(c => c.id);
        for (const id of texte) if (!barre.includes(id)) throw new Error(`« ${q} » perd la piste ${id}`);
      }
      /* « Lyon Data Center » est à Villeurbanne : il reste, mais APRÈS Lyon */
      eq(chercherPistes(L, { q: 'lyon', ctx }).liste.map(c => c.id).slice(-1), ['1']);
      /* les deux exceptions, voulues : un numéro n'est plus un bout de téléphone… */
      ok(!chercherPistes(L, { q: '59', ctx }).liste.some(c => c.id === '6'));
      /* … et un état n'est pas un mot écrit dans une note */
      ok(!chercherPistes(L, { q: 'réponse', ctx }).liste.some(c => c.id === '7'));
    },
    'barre : les mots de l’écran se cherchent — sans nouvelles, en retard, à planifier, clôturées': () => {
      const P = (o) => normalizeCompany({ status: 'todo', domain: 'esn', ...o });
      const today = '2026-10-01';
      const L = [
        P({ id: 'muet', name: 'Muet', status: 'active', history: [{ d: '2026-09-01', t: 'Mail envoyé' }], updatedAt: 1 }),
        P({ id: 'tard', name: 'Tard', status: 'active', nextAction: '2026-09-28', nextActionText: 'Relancer' }),
        P({ id: 'auj', name: 'Auj', status: 'reply', nextAction: today, nextActionText: 'Appeler' }),
        P({ id: 'neuf', name: 'Neuf', status: 'todo' }),
        P({ id: 'fin', name: 'Fin', status: 'active', closedReason: 'won' })
      ];
      const ctx = { today, villes: [], prenoms: [] };
      const ids = q => chercherPistes(L, { q, ctx }).liste.map(c => c.id).sort();
      eq(ids('sans nouvelles'), ['muet']);
      eq(ids('en retard'), ['tard']);
      eq(ids('aujourd’hui'), ['auj']);
      eq(ids('à relancer'), ['muet', 'tard']);
      eq(ids('à planifier'), ['neuf']);
      eq(ids('en cours'), ['muet', 'tard']);
      eq(ids('décroché'), ['fin']);
      eq(ids('clôturées'), ['fin']);
      ok(!ids('en cours').includes('fin'));            /* une piste close n'est plus « en cours » */
    },
    'barre : proposer quand c’est vide — jamais une recherche sans réponse, le profil d’abord': () => {
      const P = (o) => normalizeCompany({ status: 'todo', domain: 'esn', ...o });
      const L = [
        P({ id: '1', name: 'Un', city: 'Lille', positions: ['alternance'], vecu: 'stage', vecuQui: 'Awa' }),
        P({ id: '2', name: 'Deux', city: 'Lille' }),
        P({ id: '3', name: 'Trois', city: 'Lyon', positions: ['stage'] })
      ];
      const ctx = contexteRecherche(L, '2026-10-01');
      eq(villeFrequente(L), 'Lille');
      const p = propositions(L, { recherche: 'alternance' }, ctx);
      eq(p[0].q, 'alternance Lille');
      eq(p[0].label, 'Alternance · Lille');
      eq(p[0].n, 2);
      ok(p.every(x => x.n > 0));
      ok(p.some(x => x.q === 'recommandées' && x.n === 1));
      ok(!p.some(x => x.q === 'sans nouvelles'));       /* rien ne se tait : pas de proposition */
      eq(propositions([], { recherche: 'stage' }, ctx), []);
    },
    'barre : élargir — une ville gagne son département, une recherche vide propose ce qu’on retrouve': () => {
      const P = (o) => normalizeCompany({ status: 'todo', domain: 'esn', ...o });
      const L = [
        P({ id: '1', name: 'Un', city: 'Lille', address: '1 rue X\n59000 Lille' }),
        P({ id: '2', name: 'Deux', city: 'Villeneuve-d’Ascq', address: '2 av Y\n59650 Villeneuve-d’Ascq' }),
        P({ id: '3', name: 'Orange Business', city: 'Paris' })
      ];
      const ctx = contexteRecherche(L, '2026-10-01');
      const e = elargir(L, 'Lille', { ctx });
      eq(e[0].label, 'Nord (59)'); eq(e[0].q, '59'); eq(e[0].n, 2); eq(e[0].genre, 'autour');
      const v = elargir(L, 'Orange Lille', { ctx });
      ok(v.length && v.every(x => x.genre === 'sans' && x.n > 0));
      ok(v.some(x => x.q === 'Orange' && x.label === 'Lille'));
    },
    /* ---------- LE SIREN, et « À découvrir » (recherche.md, lot 2) ---------- */
    'contrat : le SIREN — neuf chiffres ou rien, il voyage, il reconnaît la même entreprise sous un autre nom': () => {
      eq(normalizeCompany({ name: 'A', siren: '326 820 065' }).siren, '326820065');
      eq(normalizeCompany({ name: 'A', siren: '12345' }).siren, undefined);      /* un faux numéro fusionnerait deux entreprises */
      eq(normalizeCompany({ name: 'A' }).siren, undefined);
      ok(!('siren' in (normalizeCompany({ name: 'A', siren: 'x' }).extra || {})));
      /* il voyage : public, et c'est lui qui dédoublonne chez le receveur */
      eq(communityView(normalizeCompany({ name: 'A', siren: '326820065' })).siren, '326820065');
      /* même numéro, même entreprise, quel que soit le nom */
      const mes = [normalizeCompany({ id: 'm', name: 'Sopra Steria', city: 'Lille', siren: '326820065' })];
      const st = mergeIncoming([{ name: 'SOPRA STERIA GROUP', city: 'Annecy', siren: '326820065', website: 'https://soprasteria.test' }], mes);
      eq(st.addedC, 0); eq(mes.length, 1); eq(mes[0].website, 'https://soprasteria.test');
      /* deux numéros différents : deux entreprises, même homonymes et même ville */
      const h = [normalizeCompany({ id: 'h', name: 'Atelier', city: 'Lyon', siren: '111111111' })];
      eq(mergeIncoming([{ name: 'Atelier', city: 'Lyon', siren: '222222222' }], h).addedC, 1);
      /* un SIREN reçu complète une piste qui n'en avait pas */
      const v = [normalizeCompany({ id: 'v', name: 'Lumen Data', city: 'Lille' })];
      mergeIncoming([{ name: 'Lumen Data', city: 'Lille', siren: '333333333' }], v);
      eq(v[0].siren, '333333333');
    },
    'annuaire : aucun mot privé ne part — contact, note, prénom, profil, état': () => {
      const L = [normalizeCompany({ name: 'Advalys', city: 'Lille', notes: 'rappeler Bertrand lundi', desc: 'cabinet cyber',
        vecu: 'stage', vecuQui: 'Léa',
        contacts: [{ name: 'Julie Marchand', email: 'julie@advalys.test', phone: '06 59 12 34 56' }] })];
      const interdits = motsInterdits(L, [{ name: 'Nadia Berthier' }], { name: 'Inès Martin', email: 'ines@x.test' });
      const ctx = { today: '2026-10-01', villes: ['Lille'], prenoms: ['Léa'] };
      const parts = q => questionsAnnuaire(interpreter(q, ctx), { interdits }).join(' ');
      for (const q of ['julie', 'Marchand lille', 'bertrand', 'nadia', 'inès', 'Léa', 'sans nouvelles lille', 'en cours'])
        if (/q=/.test(parts(q)) && /(julie|marchand|bertrand|nadia|ines|lea)/i.test(parts(q)))
          throw new Error(`« ${q} » emporte un mot privé : ${parts(q)}`);
      /* rien d'utile après le tri : rien ne part du tout */
      eq(parts('julie'), ''); eq(parts('bertrand'), ''); eq(parts('Léa'), '');
      /* l'état de TES pistes ne regarde que toi */
      eq(parts('sans nouvelles lille'), '');
      /* un mot de note qui est AUSSI public (« cyber » dans une description) peut partir */
      ok(/q=cyber/.test(parts('cyber')));
      /* le mot privé part seul, le reste de la question reste */
      ok(/departement=59/.test(parts('Marchand lille')) && !/marchand/i.test(parts('Marchand lille')));
    },
    'annuaire : la question — le métier en codes, le lieu, la taille, et rien sans texte ni lieu': () => {
      const ctx = { today: '2026-10-01', villes: [], prenoms: [] };
      const Q = (q, o) => questionsAnnuaire(interpreter(q, ctx), o || {}).map(u => new URL(u));
      /* UNE VILLE : autour de son centre (le bon établissement, à sa vraie
         distance), et la jumelle du département, bornée aux 10-499 */
      const [a, a2] = Q('alternance à Lille');
      eq(a.origin, ANNUAIRE); eq(a.pathname, '/near_point');
      eq(a.searchParams.get('lat'), '50.631'); eq(a.searchParams.get('long'), '3.047'); eq(a.searchParams.get('radius'), '15');
      ok(!a.searchParams.has('departement'));
      ok(a.searchParams.get('activite_principale').includes('62.01Z'));    /* sans métier : le numérique, c'est le produit */
      eq(a.searchParams.get('etat_administratif'), 'A');
      ok(!a.searchParams.has('q'));                                         /* « alternance » ne regarde pas le registre */
      eq(a2.pathname, '/search'); eq(a2.searchParams.get('departement'), '59');
      eq(a2.searchParams.get('tranche_effectif_salarie'), '11,12,21,22,31,32');
      /* un département : la liste et sa jumelle */
      const d = Q('alternance 59');
      eq(d.map(u => u.pathname), ['/search', '/search']); eq(d[0].searchParams.get('departement'), '59');
      const c = Q('cyber Lyon');
      eq(c.length, 3);                                                      /* les noms qui portent « cyber » d'abord */
      eq(c[0].searchParams.get('q'), 'cyber'); ok(!c[1].searchParams.has('q'));
      eq(c[0].searchParams.get('departement'), '69');
      /* « cyber » dans le nom ne dit pas qu'on peut y être accueilli : dix salariés et plus */
      eq(c[0].searchParams.get('tranche_effectif_salarie'), '11,12,21,22,31,32,41,42,51,52,53');
      eq(c[1].pathname, '/near_point');
      eq(c[2].searchParams.get('tranche_effectif_salarie'), '11,12,21,22,31,32');
      eq(c.map(u => genreQuestion(u.toString())), ['metier', 'liste', 'liste']);
      /* réseau : ni boutiques (61.20Z, 61.90Z), et les intégrateurs (46.51Z) */
      const r = Q('réseau Lille')[0].searchParams.get('activite_principale').split(',');
      ok(r.includes('46.51Z') && r.includes('61.10Z') && !r.includes('61.20Z') && !r.includes('61.90Z'));
      eq(genreQuestion(Q('Capgemini Toulouse')[0].toString()), 'nom');
      eq(Q('alternance à Lille').length, 2);
      eq(Q('pme Lille').length, 1);                                         /* une taille tapée décide seule */
      eq(Q('Capgemini Toulouse').length, 1);
      eq(Q('cyber').length, 1);                                             /* seul : pas toutes les ESN de France */
      eq(Q('réseau').length, 0);                                            /* ni texte ni lieu : rien ne part */
      eq(Q('alternance').length, 0);
      eq(Q('59000 dev')[0].searchParams.get('code_postal'), '59000');
      eq(Q('idf data')[0].searchParams.get('region'), '11');
      eq(Q('pme Lille')[0].searchParams.get('categorie_entreprise'), 'PME');
      eq(Q('tpe 59')[0].searchParams.get('tranche_effectif_salarie'), '00,01,02,03');
      eq(Q('grande entreprise 31')[0].searchParams.get('categorie_entreprise'), 'GE');
      eq(Q('industrie 59')[0].searchParams.get('section_activite_principale'), 'C');
      eq(Q('Capgemini Toulouse')[0].searchParams.get('q'), 'capgemini');
      /* près de moi : les établissements autour du point, rayon borné */
      const [p] = Q('près de moi', { userPos: { lat: 50.6292, lng: 3.0573 }, rayon: 80 });
      eq(p.pathname, '/near_point'); eq(p.searchParams.get('radius'), '50'); eq(p.searchParams.get('lat'), '50.62920');
      eq(Q('près de moi').length, 0);                                       /* sans position : rien */
    },
    'annuaire : lire une réponse — le bon établissement, la casse, l’effectif, les dirigeants': () => {
      const json = { results: [{
        siren: '326820065', nom_complet: 'SOPRA STERIA GROUP (SOPRA STERIA)', nom_raison_sociale: 'SOPRA STERIA GROUP',
        sigle: 'SOPRA STERIA', activite_principale: '62.02A', categorie_entreprise: 'GE', tranche_effectif_salarie: '53',
        date_creation: '1968-01-01', nombre_etablissements_ouverts: 61,
        siege: { siret: '32682006500001', est_siege: true, numero_voie: '3', type_voie: 'RUE', libelle_voie: 'DU PRE FAUCON',
                 code_postal: '74940', libelle_commune: 'ANNECY', latitude: '45.91', longitude: '6.13', activite_principale: '62.02A' },
        matching_etablissements: [
          { siret: '32682006500102', code_postal: '59000', libelle_commune: 'LILLE', numero_voie: '12',
            type_voie: 'RUE', libelle_voie: 'NATIONALE', latitude: '50.6366', longitude: '3.0630' },
          { siret: '32682006500300', code_postal: '59650', libelle_commune: "VILLENEUVE-D'ASCQ", latitude: '50.62', longitude: '3.15' }
        ],
        dirigeants: [{ nom: 'DUPONT', prenoms: 'MARIE', qualite: 'Directeur général', type_dirigeant: 'personne physique' },
                     { denomination: 'CABINET AUDIT', qualite: 'Commissaire aux comptes', type_dirigeant: 'personne morale' }]
      }, { siren: 'pas-un-siren' }], total_results: 2 };
      const [r, autre] = lireAnnuaire(json, { ville: 'villeneuve d ascq' });
      eq(autre, undefined);                                                 /* un résultat sans SIREN valide ne passe pas */
      eq(r.nom, 'Sopra Steria Group'); eq(r.ville, 'Villeneuve-d’Ascq'); eq(r.cp, '59650'); eq(r.dept, '59');
      eq(r.effectif, '10 000 salariés et plus'); eq(r.activite, 'Conseil en systèmes et logiciels informatiques');
      eq(r.dirigeants.map(d => d.nom), ['Marie Dupont', 'Cabinet Audit']); eq(r.dirigeants[0].personne, true);
      eq(r.siege, false); eq(r.etablissements, 61);
      /* sans ville cherchée mais avec une position : le plus proche */
      const [p] = lireAnnuaire(json, { userPos: { lat: 50.637, lng: 3.063 } });
      eq(p.ville, 'Lille'); eq(p.adresse, '12 Rue Nationale\n59000 Lille'); ok(p.distance < 1);
      /* sans rien : le premier qui correspond */
      eq(lireAnnuaire(json)[0].ville, 'Lille');
      eq(lireAnnuaire(null), []); eq(lireAnnuaire({ results: 'x' }), []);
      /* la forme RELEVÉE en vrai (sonde-annuaire.mjs) : un établissement ne
         porte qu'une chaîne d'adresse, et la liste garde les fermés */
      const vrai = { results: [{ siren: '479766842', nom_raison_sociale: 'CAPGEMINI TECHNOLOGY SERVICES',
        activite_principale: '62.02A', tranche_effectif_salarie: '53',
        siege: { est_siege: true, numero_voie: '145', type_voie: 'QUAI', libelle_voie: 'DU PRESIDENT ROOSEVELT',
                 code_postal: '92130', libelle_commune: 'ISSY-LES-MOULINEAUX', latitude: '48.82', longitude: '2.26',
                 etat_administratif: 'A' },
        matching_etablissements: [
          { adresse: '21 AVENUE LE CORBUSIER 59800 LILLE', code_postal: '59800', libelle_commune: 'LILLE',
            latitude: '50.6378', longitude: '3.0703', etat_administratif: 'F' },
          { adresse: 'LILLE LOMME 7 AVENUE MARIE-LOUISE DELWAULLE 59160 LILLE', code_postal: '59160',
            libelle_commune: 'LILLE', latitude: '50.6314', longitude: '3.0207', etat_administratif: 'A' }] }] };
      const [cap] = lireAnnuaire(vrai, { ville: 'lille' });
      eq(cap.adresse, 'Lille Lomme 7 Avenue Marie-Louise Delwaulle\n59160 Lille');   /* l'ouvert, pas le fermé */
      eq(cap.cp, '59160');
      eq(lireAnnuaire(vrai)[0].cp, '59160');                     /* même sans ville cherchée */
      eq(casse('IBM FRANCE'), 'IBM France'); eq(casse('LA POSTE'), 'La Poste'); eq(casse('Orange'), 'Orange');
      eq(domaineDeNaf('63.11Z'), 'cloud'); eq(domaineDeNaf('62.01Z'), 'esn'); eq(domaineDeNaf('84.11Z'), 'public');
      eq(domaineDeNaf('25.62B'), 'industrie'); eq(domaineDeNaf('47.11F'), 'commerce'); eq(domaineDeNaf('01.11Z'), 'autre');
    },
    'annuaire : une entreprise = une ligne, et l’ajouter garde ce qu’on a cherché': () => {
      const r = (siren, nom, sigle) => ({ siren, nom, sigle: sigle || '', ville: 'Lille', naf: '62.02A', activite: 'Conseil' });
      const mes = [normalizeCompany({ name: 'Sopra Steria', siren: '326820065' }), normalizeCompany({ name: 'Lumen Data' }),
                   normalizeCompany({ name: 'SII' })];
      const d = decouvertes([[r('326820065', 'Sopra Steria Group'), r('111111111', 'Lumen Data'), r('222222222', 'Advens')],
                             [r('222222222', 'Advens'), r('333333333', 'Société pour l’informatique', 'SII'), r('444444444', 'Wavestone')]], mes);
      /* déjà là par SIREN, par nom, par sigle ; et Advens une seule fois */
      eq(d.map(x => x.nom), ['Advens', 'Wavestone']);
      const ctx = { today: '2026-10-01', villes: [], prenoms: [] };
      const p = versPiste({ ...r('222222222', 'Advens'), adresse: '1 Rue X\n59000 Lille', lat: 50.6, lng: 3.0 },
        interpreter('cyber lille', ctx));
      eq(p.domain, 'cyber');               /* trouvée par « cyber », elle le reste */
      eq(p.siren, '222222222'); eq(p.contacts, []);           /* aucune personne importée d'office */
      eq(normalizeCompany(p).siren, '222222222');
      eq(versPiste(r('5', 'X'), interpreter('lille', ctx)).domain, 'esn');   /* sinon le code d'activité décide */
    },
    /* ---------- docs/sources.md, lot 4 : une liste qui peut t'accueillir ---------- */
    'sources : l’employeur se lit, une personne ne s’affiche pas': () => {
      const rep = { results: [
        { siren: '111111111', nom_raison_sociale: 'ADVENS', tranche_effectif_salarie: 'NN', complements: { liste_idcc: ['1486'] } },
        { siren: '222222222', nom_raison_sociale: 'PETITE SAS', tranche_effectif_salarie: '12' },
        { siren: '333333333', nom_raison_sociale: 'NOUVELLE', tranche_effectif_salarie: 'NN' },
        { siren: '444444444', nom_raison_sociale: 'SANS PERSONNE', tranche_effectif_salarie: '00' },
        { siren: '555555555', nom_complet: 'JEAN DUPONT (CYBER-PENTESTER)', nature_juridique: '1000',
          complements: { est_entrepreneur_individuel: true } },
        { siren: '666666666', nom_raison_sociale: 'SIEGE EMPLOYEUR', siege: { caractere_employeur: 'O' } }] };
      const l = lireAnnuaire(rep);
      eq(l.map(r => r.employeur), [true, true, null, false, null, true]);
      eq(l[0].effectif, 'a des salariés');           /* la convention le dit, la tranche ne dit rien */
      eq(l[1].effectif, '20-49 salariés');
      eq(l[2].effectif, '');                          /* on ne sait pas : rien ne s'invente */
      eq(l.map(r => r.personne), [false, false, false, false, true, false]);
      /* « À découvrir » ne montre jamais une personne… */
      eq(decouvertes([l], []).map(r => r.siren).includes('555555555'), false);
      /* … et l'employeur passe devant l'inconnu, qui passe devant celle qui ne déclare personne */
      eq(decouvertes([l], []).map(r => r.siren), ['111111111', '222222222', '666666666', '333333333', '444444444']);
    },
    'sources : plusieurs questions, une liste — fusion par rangs, le nom tapé d’abord': () => {
      const r = (siren, o) => ({ siren, nom: 'E' + siren, ville: 'Lille', employeur: null, ...o });
      /* deux questions qui se recoupent : celle que les DEUX rendent monte */
      const d = decouvertes([[r('1'), r('2'), r('3')], [r('4'), r('3'), r('5')]], []);
      eq(d[0].siren, '3');
      eq(d.map(x => x.siren).sort(), ['1', '2', '3', '4', '5']);   /* une entreprise = une ligne */
      /* un NOM tapé garde l'ordre de l'annuaire, même devant un employeur */
      const n = decouvertes([[r('9', { employeur: null }), r('8', { employeur: true })], [r('7', { employeur: true })]],
        [], { genres: ['nom', 'liste'] });
      eq(n.map(x => x.siren), ['9', '8', '7']);
      /* un MÉTIER tapé en texte (« cyber ») passe devant la liste large */
      const m = decouvertes([[r('6')], [r('5', { employeur: true })]], [], { genres: ['metier', 'liste'] });
      eq(m.map(x => x.siren), ['6', '5']);
      /* la plus proche, par PALIERS : 3 et 4 km ne se départagent pas par la distance */
      const p = decouvertes([[r('a', { distance: 30 }), r('b', { distance: 4 }), r('c', { distance: 3 })]], [],
        { userPos: { lat: 50, lng: 3 } });
      eq(p.map(x => x.siren), ['b', 'c', 'a']);
      /* sans position, la ville tapée d'abord */
      const v = decouvertes([[r('x', { ville: 'Roubaix' }), r('y', { ville: 'Lille' })]], [], { ville: 'lille' });
      eq(v.map(x => x.siren), ['y', 'x']);
    },
    'sources : ta zone — déduite de tes pistes, sans ex æquo, et elle part comme un lieu': () => {
      const P = (city, o) => normalizeCompany({ name: 'P' + Math.random(), city, ...o });
      eq(zoneDe([P('Lille'), P('Roubaix'), P('Lyon')]), { dept: '59', label: 'Nord (59)' });
      eq(zoneDe([P('Lille')]), null);                                   /* une piste ne fait pas une zone */
      eq(zoneDe([P('Lille'), P('Roubaix'), P('Lyon'), P('Villeurbanne')]), null);   /* ex æquo : on ne devine pas */
      eq(zoneDe([P('Lille', { closedReason: 'dropped' }), P('Roubaix', { closedReason: 'dropped' }), P('Lyon')]), null);
      const ctx = { today: '2026-10-05', villes: [], prenoms: [] };
      const Q = (q, o) => questionsAnnuaire(interpreter(q, ctx), o || {}).map(u => new URL(u));
      eq(Q('réseau').length, 0);                                        /* sans zone : rien ne part */
      const [z] = Q('réseau', { zone: { dept: '59' } });
      eq(z.searchParams.get('departement'), '59');
      eq(Q('réseau Lyon', { zone: { dept: '59' } })[1].searchParams.get('departement'), '69');   /* un lieu tapé gagne */
      eq(Q('réseau Lyon', { zone: { dept: '59' } })[0].searchParams.get('lat'), '45.758');
      eq(Q('', { zone: { dept: '59' } }).length, 0);                    /* la barre vide ne demande rien */
      /* une question vidée par le tri ne part pas, même vers ta zone */
      eq(questionsAnnuaire(interpreter('bertrand', ctx), { zone: { dept: '59' }, parDefaut: true, interdits: new Set(['bertrand']) }).length, 0);
      eq(Q('', { zone: { dept: '59' }, parDefaut: true }).length, 2);   /* le tap sur le segment, barre vide : ta zone */
      /* aucune personne demandée, dans aucune question */
      for (const u of [...Q('cyber Lille'), ...Q('alternance 59'), ...Q('Capgemini Toulouse')])
        eq(u.searchParams.get('est_entrepreneur_individuel'), 'false');
    },
    'sources : le métier du moment — tes pistes engagées, le récent d’abord': () => {
      const t = '2026-10-05';
      const P = (domain, status, d, o) => normalizeCompany({ name: 'P' + Math.random(), domain, status,
        history: d ? [{ d, t: 'x' }] : [], createdAt: Date.parse('2024-01-01'), ...o });
      eq(fraicheur(P('cyber', 'active', '2026-10-03'), t), 100);
      eq(fraicheur(P('cyber', 'active', '2026-09-25'), t), 70);
      eq(fraicheur(P('cyber', 'active', '2025-01-01'), t), 10);
      eq(metierDuMoment([P('cyber', 'active', '2026-10-01'), P('cyber', 'reply', '2026-09-28')], t), 'cyber');
      eq(metierDuMoment([P('cyber', 'active', '2026-10-01')], t), '');                    /* une piste ne suffit pas */
      eq(metierDuMoment([P('cyber', 'todo', '2026-10-01'), P('cyber', 'todo', '2026-10-01')], t), '');   /* jamais contactées */
      /* le récent l'emporte sur le nombre : deux pistes cloud de l'an dernier < deux cyber de la semaine */
      eq(metierDuMoment([P('cloud', 'active', '2025-03-01'), P('cloud', 'reply', '2025-03-02'),
                         P('cyber', 'active', '2026-10-02'), P('cyber', 'reply', '2026-10-01')], t), 'cyber');
      /* sans écart net, on ne devine pas */
      eq(metierDuMoment([P('cloud', 'active', '2026-10-02'), P('cyber', 'active', '2026-10-02')], t), '');
      /* la barre vide le propose APRÈS ta recherche déclarée, qu'il resserre ;
         deux propositions qui rendent les mêmes pistes n'en font qu'une */
      const ctxL = { today: t, villes: ['Lille', 'Paris'], prenoms: [] };
      const L = [P('cyber', 'active', '2026-10-01', { city: 'Lille' }), P('cyber', 'reply', '2026-09-30', { city: 'Lille' }),
                 P('esn', 'todo', '', { city: 'Lille' }), P('esn', 'todo', '', { city: 'Paris' })];
      const pr = propositions(L, normalizeProfile({ recherche: 'alternance' }), ctxL);
      eq(pr[0].q, 'alternance Lille');
      eq(pr[1].q, 'alternance cyber Lille');
      const L2 = [P('cyber', 'active', '2026-10-01', { city: 'Lille' }), P('cyber', 'reply', '2026-09-30', { city: 'Lille' }),
                  P('esn', 'todo', '', { city: 'Paris' })];
      const pr2 = propositions(L2, normalizeProfile({ recherche: 'alternance' }), ctxL);
      eq(pr2[0].q, 'alternance Lille');
      ok(!pr2.some(x => x.q === 'alternance cyber Lille'));
    },
    'carte : Wikidata et le BODACC ne reçoivent QUE le SIREN, Wikipédia que le titre': () => {
      const w = new URL(questionWikidata('326820065'));
      ok(w.searchParams.get('query').includes('wdt:P1616 "326820065"'));
      eq(questionWikidata('32682006" } DELETE {'), ''); eq(questionWikidata(''), '');
      const b = new URL(questionBodacc('326820065'));
      eq(b.origin + b.pathname, BODACC);
      eq(b.searchParams.get('where'), 'registre like "326820065"');
      eq(questionBodacc('3268'), '');
      eq(questionResume('https://fr.wikipedia.org/wiki/Sopra_Steria'), WIKIPEDIA_FR + 'Sopra_Steria');
      eq(questionResume('https://evil.test/wiki/X'), ''); eq(questionResume(''), '');
    },
    'carte : lire Wikidata — https d’abord, la page LinkedIn, une vignette, jamais un « Q1234 »': () => {
      const B = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
      const r = lireWikidata({ results: { bindings: [
        B({ site: 'http://www.inetum.com', desc: 'entreprise de services numériques', li: 'inetum', mereLabel: 'Q99999',
            logo: 'http://commons.wikimedia.org/wiki/Special:FilePath/INETUM%20LOGO.png', article: 'https://fr.wikipedia.org/wiki/Inetum' }),
        B({ site: 'https://www.inetum.com/', mereLabel: 'Bain Capital' })] } });
      eq(r.site, 'https://www.inetum.com/');
      eq(r.linkedin, LINKEDIN_PAGE + 'inetum');
      eq(r.logo, 'https://commons.wikimedia.org/wiki/Special:FilePath/INETUM%20LOGO.png?width=96');
      eq(r.groupe, 'Bain Capital');
      eq(r.article, 'https://fr.wikipedia.org/wiki/Inetum');
      const vide = lireWikidata({ results: { bindings: [] } });
      eq([vide.site, vide.linkedin, vide.logo, vide.groupe], ['', '', '', '']);
      eq(lireWikidata({ results: { bindings: [B({ li: 'x"><script>' })] } }).linkedin, '');
    },
    'carte : le résumé — la première phrase, sans parenthèses, coupée à un mot': () => {
      eq(lireResume({ extract: 'Inetum est une entreprise de services du numérique française (ESN) créée en 1970. Elle emploie 27 000 personnes.' }),
         'Inetum est une entreprise de services du numérique française créée en 1970.');
      const long = lireResume({ extract: 'ChapsVision ' + 'est une entreprise française éditrice de logiciels d’analyse des données '.repeat(4) });
      ok(long.length <= 181 && long.endsWith('…') && !/\s…$/.test(long));
      eq(lireResume({ type: 'disambiguation', extract: 'Orange peut désigner…' }), '');
      eq(lireResume(null), '');
    },
    'carte : le BODACC — une procédure en cours se lit, une ancienne ou close se tait': () => {
      const A = (date, jugement) => ({ familleavis: 'collective', dateparution: date, jugement });
      const t = '2026-10-05';
      eq(lireBodacc({ results: [A('2026-03-12', JSON.stringify({ nature: 'Jugement d\'ouverture de liquidation judiciaire', date: '2026-03-10' })),
                                { familleavis: 'dpc', dateparution: '2026-07-01' }] }, t).procedure,
         { nature: 'liquidation judiciaire', date: '2026-03-10' });
      eq(lireBodacc({ results: [A('2025-01-08', { nature: 'Jugement d\'ouverture d\'une procédure de redressement judiciaire' })] }, t).procedure.nature,
         'redressement judiciaire');
      eq(lireBodacc({ results: [A('2021-05-01', { nature: 'Jugement d\'ouverture de liquidation judiciaire' })] }, t).procedure, null);
      eq(lireBodacc({ results: [A('2026-02-01', { nature: 'Jugement de clôture de la procédure de sauvegarde' })] }, t).procedure, null);
      eq(lireBodacc({ results: [A('2026-02-01', 'Jugement prononçant quelque chose de neuf')] }, t).procedure.nature, 'procédure collective');
      eq(lireBodacc({ results: [] }, t).procedure, null);
      eq(lireBodacc(null, t).procedure, null);
    },
    'carte : l’annuaire lit les conventions collectives, qui disent un employeur': () => {
      const [r] = lireAnnuaire({ results: [{ siren: '851035329', nom_raison_sociale: 'CHAPSVISION',
        complements: { liste_idcc: ['1486'] } }] });
      eq(r.conventions, ['1486']); eq(r.employeur, true);
    },
    'carte : une valeur par fait — ta parole, puis les sources, puis les missions': () => {
      const r = { siren: '812345678', nom: 'Advens', tranche: '22', naf: '62.02A', creation: '2009-03-12', etablissements: 4,
                  activite: 'Conseil en systèmes et logiciels informatiques',
                  dirigeants: [{ nom: 'Thomas Leroy', qualite: 'Président', personne: true },
                               { nom: 'Cabinet Audit Nord', qualite: 'Commissaire aux comptes', personne: false }] };
      const k = carte({ r, wd: { desc: 'entreprise française', site: 'https://www.advens.fr/' } });
      /* « entreprise française » ne dit rien, et le libellé de l'INSEE non
         plus : ce sont les missions qui parlent */
      eq(k.quoi, null);
      eq(k.missions, { texte: 'Conseil et intégration informatique', tonMetier: false });
      eq(k.taille, '100 à 199 salariés');
      eq(k.ecrire.cible, 'dirigeant'); eq(k.ecrire.nom, 'Thomas Leroy');
      eq(k.site, 'https://www.advens.fr/');
      eq(k.sources, ['Annuaire des entreprises', 'Wikidata']);
      /* le chiffre d'affaires, la création, les sites : partis (ils ne départagent rien) */
      ok(!('chiffres' in k)); ok(!JSON.stringify(k).includes('2009'));
      /* ton métier, celui que dit ta formation */
      eq(carte({ r, metier: 'reseau' }).missions.tonMetier, true);
      eq(carte({ r: { ...r, naf: '62.01Z' }, metier: 'reseau' }).missions.tonMetier, false);
      /* Wikipédia dit ce qu'elle fait ; le groupe se lit avec la taille */
      const k2 = carte({ r, resume: 'Advens est une entreprise française de cybersécurité.', wd: { groupe: 'Groupe Nord' } });
      eq(k2.quoi.src, 'wikipedia');
      eq(k2.taille, '100 à 199 salariés · groupe Groupe Nord');
      eq(k2.sources, ['Annuaire des entreprises', 'Wikipédia', 'Wikidata']);
      eq(carte({ r, wd: { groupe: 'Advens' } }).taille, '100 à 199 salariés');   /* le groupe qui porte son propre nom ne se dit pas */
      /* ta phrase passe devant tout ; le site de la fiche ne se redit pas */
      const k3 = carte({ piste: { name: 'Advens', desc: 'SOC à Lille, 3 alternants', website: 'advens.fr' }, r,
                         resume: 'Advens est…', wd: { site: 'https://www.advens.fr/' } });
      eq(k3.quoi, { texte: 'SOC à Lille, 3 alternants', src: 'toi' }); eq(k3.site, '');
      /* sans missions connues, le libellé de l'INSEE reste le dernier recours */
      eq(carte({ r: { naf: '10.71C', tranche: '03', activite: 'Boulangerie' } }).quoi, { texte: 'Boulangerie', src: 'annuaire' });
      /* les géants ; une entreprise sans salarié n'a pas de taille */
      eq(carte({ r: { tranche: '53' } }).taille, '10 000 salariés et plus');
      eq(carte({ r: { tranche: '00' } }).taille, '');
      /* une grande : on écrit au recrutement */
      eq(carte({ r: { ...r, tranche: '52' } }).ecrire.cible, 'recrutement');
    },
    'carte : une seule alerte, la plus forte — fermée passe devant une procédure': () => {
      const proc = { procedure: { nature: 'redressement judiciaire', date: '2026-03-10' } };
      eq(carte({ r: { fermee: true, fermeeLe: '2026-04-01' }, bodacc: proc }).alerte, { texte: 'Entreprise fermée', date: '2026-04-01' });
      eq(carte({ r: {}, bodacc: proc }).alerte, { texte: 'Redressement judiciaire', date: '2026-03-10' });
      eq(carte({ r: {}, bodacc: proc }).sources, ['BODACC']);
      eq(carte({ r: {}, bodacc: { procedure: null } }).alerte, null);
      eq(carte({ r: {}, bodacc: { procedure: null } }).sources, []);      /* rien à dire, rien à citer */
    },
    'à qui écrire : le dirigeant d’une PME, par son nom — le recrutement d’une grande': () => {
      const dirs = [{ nom: 'Cabinet Audit Nord', qualite: 'Commissaire aux comptes', personne: false },
                    { nom: 'Thomas Leroy', qualite: 'Président', personne: true }];
      const pme = aQui({ nom: 'Advens', tranche: '22', categorie: 'PME', dirigeants: dirs });
      eq(pme.cible, 'dirigeant'); eq(pme.nom, 'Thomas Leroy'); eq(pme.qualite, 'président');
      eq(new URL(pme.url).searchParams.get('keywords'), 'Thomas Leroy Advens');
      /* 250 salariés et plus, ou une filiale d'un groupe : un service recrute */
      for (const r of [{ tranche: '32' }, { tranche: '53' }, { tranche: '12', categorie: 'GE' }, { tranche: '21', categorie: 'ETI' }]){
        ok(estGrande(r));
        const g = aQui({ nom: 'Sopra Steria', dirigeants: dirs, ...r });
        eq(g.cible, 'recrutement'); eq(g.nom, '');
        eq(new URL(g.url).searchParams.get('keywords'), 'Sopra Steria recrutement');
      }
      /* sans dirigeant qui soit une PERSONNE : le recrutement, jamais une société-holding */
      eq(aQui({ nom: 'X', tranche: '11', dirigeants: [dirs[0]] }).cible, 'recrutement');
      /* aucune adresse devinée, jamais */
      ok(!JSON.stringify(pme).includes('@'));
      eq(aQui({}), null);
    },
    'ce que tu y ferais : le code d’activité devient un travail, et ses métiers': () => {
      eq(travailDe({ naf: '62.03Z' }).metiers, ['reseau', 'cloud']);
      ok(/infogérance/.test(travailDe({ naf: '62.03Z' }).texte));
      eq(travailDe({ naf: '62.01Z' }).metiers, ['dev']);
      /* hors du numérique : un service informatique, seulement passé 50 salariés */
      eq(travailDe({ naf: '86.10Z', tranche: '42' }).texte, 'informatique interne');
      eq(travailDe({ naf: '84.11Z', tranche: '12' }), null);
      eq(travailDe({ naf: '10.71C', tranche: '03' }), null);
      eq(travailDe({}), null);
      /* chaque métier nommé existe dans la barre */
      for (const t of Object.values(TRAVAIL)) for (const m of t.metiers) ok(METIER[m], m);
    },
    'utile : le nom qu’on reconnaît, la ville et son centre, ce qui tombe trop loin': () => {
      const L = res => lireAnnuaire({ results: res });
      const [euro, onisep, tdf, rcbt] = L([
        { siren: '111111111', nom_raison_sociale: 'EURO-INFORMATION EUROPEENNE DE TRAITEMENT DE L’INFORMATION', sigle: 'EURO INFORMATION' },
        { siren: '222222222', nom_raison_sociale: 'OFFICE NATIONAL D’INFORMATION SUR LES ENSEIGNEMENTS ET LES PROFESSIONS', sigle: 'ONISEP' },
        { siren: '333333333', nom_raison_sociale: 'T D F', sigle: 'TDF' },
        { siren: '444444444', nom_raison_sociale: 'RESEAU CLUBS BOUYGUES TELECOM', sigle: 'RCBT' }]);
      eq([euro.nom, onisep.nom, tdf.nom, rcbt.nom], ['Euro Information', 'ONISEP', 'TDF', 'Reseau Clubs Bouygues Telecom']);
      ok(/Traitement de l/.test(euro.raison));                       /* le nom complet reste lisible */
      /* une piste saisie sous le nom complet ne revient pas */
      eq(decouvertes([[euro]], [normalizeCompany({ name: 'Euro-Information Européenne de Traitement de l’Information' })]).length, 0);
      /* « Lille » porte son centre ; au-delà de LOIN_KM, ce n'est plus Lille */
      const e = interpreter('alternance Lille', { today: '2026-10-06', villes: [], prenoms: [] }).etiquettes.find(x => x.famille === 'lieu');
      eq(e.centre, [50.631, 3.047]);
      const pres = { siren: '555555555', nom: 'Près', distance: 4 }, loin = { siren: '666666666', nom: 'Loin', distance: 72 };
      eq(decouvertes([[loin, pres]], [], { loin: LOIN_KM }).map(r => r.nom), ['Près']);
      eq(decouvertes([[loin, pres]], []).length, 2);                 /* sans ville, rien n'est écarté */
      /* l'annuaire ne remplit pas « En bref » : c'est ta phrase */
      eq(versPiste({ siren: '777777777', nom: 'X', naf: '62.01Z', activite: 'Programmation informatique' }).desc, '');
    },
    'utile : ta formation dit ton métier — ou rien': () => {
      eq(metierDuProfil({ formation: 'BTS SIO option SISR' }), 'reseau');
      eq(metierDuProfil({ formation: 'BTS SIO SLAM' }), 'dev');
      eq(metierDuProfil({ formation: 'Master cyber' }), 'cyber');
      eq(metierDuProfil({ formation: 'BUT informatique' }), '');      /* ne dit aucun métier */
      eq(metierDuProfil({ formation: 'Licence commerce' }), '');      /* un secteur n'est pas un métier */
      eq(metierDuProfil({ formation: 'Master cloud et sécurité' }), ''); /* deux métiers : on ne tranche pas */
      eq(metierDuProfil({}), ''); eq(metierDuProfil(null), '');
    },
    'utile : qui recrute en alternance — un lien vers le service public, le métier et le point, rien d’autre': () => {
      const ctx = { today: '2026-10-06', villes: [], prenoms: [] };
      const O = (q, o) => offresAlternance(interpreter(q, ctx), o);
      const a = new URL(O('alternance réseau Lille').url);
      eq(a.origin + a.pathname, LBA);
      eq(a.searchParams.get('romes'), 'M1801,M1810'); eq(a.searchParams.get('lat'), '50.631'); eq(a.searchParams.get('lon'), '3.047');
      eq(a.searchParams.get('radius'), '30'); eq(a.searchParams.get('address'), 'Lille');
      eq([...a.searchParams.keys()].sort(), ['address', 'job_name', 'lat', 'lon', 'radius', 'romes']);
      eq(O('alternance réseau Lille').lieu, 'Lille');
      eq(O('stage Lille'), null);                                    /* un stage : pas ce service */
      eq(O('Lille'), null);                                          /* rien ne dit « alternance » */
      ok(O('Lille', { recherche: 'alternance' }));                   /* ton profil le dit */
      eq(O('stage Lille', { recherche: 'alternance' }), null);       /* ce que tu tapes gagne sur le profil */
      eq(O('alternance 59'), null);                                  /* un département n'a pas de centre */
      eq(new URL(O('alternance Lille', { metier: 'dev' }).url).searchParams.get('romes'), 'M1805');   /* le métier de ta formation */
      /* le libellé décide (relevé) : cloud et cyber passent par un libellé mesuré porteur */
      for (const q of ['alternance cloud Nantes', 'alternance cybersécurité Lille'])
        eq(new URL(O(q).url).searchParams.get('job_name'), 'Administration réseau');
      /* sans lieu tapé, le centre de tes pistes, s'il est donné */
      eq(new URL(O('alternance', { centre: { lat: 45.758, lng: 4.835, nom: 'Lyon' } }).url).searchParams.get('address'), 'Lyon');
    },
    'à ta mesure : la ville du profil n’est utile que si l’app sait où elle est': () => {
      eq(villeConnue('lille').nom, 'Lille'); eq(villeConnue('St-Étienne').nom, 'Saint-Étienne');
      eq(villeConnue('  LYON ').dept, '69');
      eq(villeConnue('Trifouillis-les-Oies'), null); eq(villeConnue(''), null); eq(villeConnue(null), null);
      const l = lieuDuProfil({ ville: 'Lille', rayon: 30 });
      eq([l.famille, l.cle, l.ville, l.dept, l.rayon, l.profil], ['lieu', 'ville:lille', 'lille', '59', 30, true]);
      eq(l.centre, [50.631, 3.047]);
      eq(lieuDuProfil({ ville: 'Lille' }).rayon, 15);                 /* le rayon par défaut */
      eq(lieuDuProfil({ ville: 'Nulle-Part' }), null);
      eq(rayonDe({ rayon: 5 }), 5); eq(rayonDe({ rayon: 12 }), 15); eq(rayonDe(null), 15);
      eq(metierEtiquetteDuProfil({ formation: 'BTS SIO SLAM' }).cle, 'dev');
      eq(metierEtiquetteDuProfil({ formation: 'BUT informatique' }), null);
      /* le profil se normalise : un rayon inconnu prend le plus proche */
      eq(normalizeProfile({ rayon: 20 }).rayon, 15); eq(normalizeProfile({ rayon: 100 }).rayon, 30);
      eq(normalizeProfile({ rayon: 'x' }).rayon, 15); eq(normalizeProfile({ ville: '  Lille  ' }).ville, 'Lille');
      eq(normalizeProfile({}).ville, ''); eq(normalizeProfile({}).ecartees, []);
    },
    'à ta mesure : le profil ajoute ce que la barre ne dit pas, et seulement ça': () => {
      const ctx = { today: '2026-10-06', villes: [], prenoms: [] };
      const P = { ville: 'Lille', rayon: 5, formation: 'BTS SIO SISR' };
      const A = (q, sans) => ajoutsProfil(interpreter(q, ctx), P, sans);
      /* barre vide : ta ville et ton métier, l'un et l'autre visibles */
      let a = A('');
      eq(a.lieu.cle, 'ville:lille'); eq(a.metier.cle, 'reseau');
      eq(a.interp.etiquettes.map(e => e.id), ['metier:reseau', 'lieu:ville:lille']);
      /* une ville tapée gagne sur la tienne ; un métier tapé sur ta formation */
      a = A('alternance dev Lyon');
      eq(a.lieu, null); eq(a.metier, null); eq(a.lieuPropose, null);
      /* un NOM tapé se cherche partout : pas de métier qui le bride, la ville oui */
      a = A('Orange');
      eq(a.metier, null); eq(a.lieu.cle, 'ville:lille');
      /* retirés, ils restent PROPOSÉS — et ne partent plus */
      a = A('alternance', { lieu: true, metier: true });
      eq(a.lieu, null); eq(a.metier, null); eq(a.lieuPropose.cle, 'ville:lille'); eq(a.metierPropose.cle, 'reseau');
      eq(a.interp.etiquettes.map(e => e.id), ['recherche:alternance']);
      /* l'état de tes pistes ne regarde pas l'annuaire */
      eq(A('sans nouvelles').lieu, null);
      /* sans profil, rien ne change */
      const z = interpreter('alternance', ctx);
      eq(ajoutsProfil(z, {}).interp, z);
      /* ce qui part : le CENTRE de la ville, ton rayon — jamais le texte du profil */
      const u = questionsAnnuaire(A('alternance').interp, {});
      const pt = new URL(u[0]);
      eq(pt.pathname, '/near_point'); eq(pt.searchParams.get('radius'), '5');
      eq(pt.searchParams.get('lat'), '50.631');
      eq(pt.searchParams.get('activite_principale'), '62.02A,62.03Z,62.09Z,61.10Z,46.51Z');
      ok(!u.join('|').includes('SISR') && !u.join('|').toLowerCase().includes('lille'));
      /* une ville TAPÉE prend aussi ton rayon */
      eq(new URL(questionsAnnuaire(interpreter('Lyon', ctx), { rayonVille: 30 })[0]).searchParams.get('radius'), '30');
      eq(new URL(questionsAnnuaire(interpreter('Lyon', ctx), {})[0]).searchParams.get('radius'), '15');
      eq(loinDe(5), 10); eq(loinDe(15), 30); eq(loinDe(30), 50); eq(loinDe(0), 30);
    },
    'à ta mesure : les offres de stage — un lien HelloWork, des mots MESURÉS porteurs': () => {
      const ctx = { today: '2026-10-06', villes: [], prenoms: [] };
      const S = (q, o) => offresStage(interpreter(q, ctx), o);
      const a = new URL(S('stage réseau Lille').url);
      eq(a.origin + a.pathname, HELLOWORK);
      eq(a.searchParams.get('k'), 'stage réseau'); eq(a.searchParams.get('l'), 'Lille');
      eq([...a.searchParams.keys()].sort(), ['k', 'l']);
      eq(new URL(S('stage dev Lyon').url).searchParams.get('k'), 'stage développeur');
      eq(new URL(S('stage cybersécurité Rennes').url).searchParams.get('k'), 'stage cybersécurité');
      /* « stage support informatique » : une offre à Marseille — pas gardé */
      eq(new URL(S('stage support Marseille').url).searchParams.get('k'), 'stage informatique');
      eq(new URL(S('stage Nantes').url).searchParams.get('k'), 'stage informatique');
      eq(S('alternance Lille'), null);                          /* pas un stage */
      eq(S('stage'), null);                                     /* aucun lieu */
      eq(S('Lille'), null);                                     /* rien ne dit stage */
      ok(S('Lille', { recherche: 'stage' }));                    /* ton profil le dit */
      eq(new URL(S('stage', { ville: 'Lyon', metier: 'dev' }).url).searchParams.get('l'), 'Lyon');
    },
    'à ta mesure : le site de l’établissement — sa taille et son travail, quand l’INSEE les sait': () => {
      const j = { results: [
        { siren: '111111111', nom_raison_sociale: 'FIDUCIAL INFORMATIQUE', activite_principale: '62.02A', tranche_effectif_salarie: '41',
          matching_etablissements: [{ libelle_commune: 'VILLENEUVE-D’ASCQ', code_postal: '59650', tranche_effectif_salarie: '03',
            activite_principale: '62.01Z', est_siege: false, caractere_employeur: 'O', latitude: 50.62, longitude: 3.14 }] },
        { siren: '222222222', nom_raison_sociale: 'CAPGEMINI', activite_principale: '62.02A', tranche_effectif_salarie: '53',
          matching_etablissements: [{ libelle_commune: 'LILLE', code_postal: '59000', tranche_effectif_salarie: 'NN', activite_principale: '62.02A' }] },
        { siren: '333333333', nom_raison_sociale: 'ORANGE BUSINESS', activite_principale: '62.02A', tranche_effectif_salarie: '52',
          matching_etablissements: [{ libelle_commune: 'LESQUIN', code_postal: '59810', tranche_effectif_salarie: '00' }] },
        { siren: '444444444', nom_raison_sociale: 'SIEGE SEUL', activite_principale: '62.02A', tranche_effectif_salarie: '12',
          siege: { libelle_commune: 'LILLE', code_postal: '59000', tranche_effectif_salarie: '03', est_siege: true } }
      ] };
      const [f, c, o, s1] = lireAnnuaire(j, {});
      eq([f.trancheIci, f.effectifIci, f.nafIci], ['03', '6-9 salariés', '62.01Z']);
      eq(travailDe(f).texte, 'développement de logiciels');      /* le travail du SITE */
      eq([c.trancheIci, c.nafIci], ['', '']);                     /* « NN » : non diffusé */
      eq(o.trancheIci, '');                                       /* « 00 » relevé sur des sites qui emploient */
      eq(s1.trancheIci, '');                                      /* le siège montré faute de mieux n'est pas « ici » */
      eq(carte({ r: f }).taille, '6 à 9 salariés ici · 500 à 999 en tout');
      eq(carte({ r: c }).taille, '10 000 salariés et plus');
      /* un code ancien du site ne dit rien : celui de l'entreprise reprend */
      eq(travailDe({ naf: '62.02A', nafIci: '72.1Z' }).texte, 'conseil et intégration informatique');
    },
    'à ta mesure : « Pas pour moi » ne revient pas, ta formation passe devant': () => {
      const r = (siren, naf, d) => ({ siren, nom: 'E' + siren, naf, employeur: true, distance: d, ville: 'Lille' });
      const l = [r('100000001', '62.03Z', 2), r('100000002', '62.01Z', 12), r('100000003', '62.01Z', 3)];
      const o = { userPos: { lat: 50.6, lng: 3 } };
      eq(decouvertes([l], [], o).map(x => x.siren), ['100000001', '100000003', '100000002']);
      /* SLAM → le développement d'abord, à égalité d'employeur, avant la distance */
      eq(decouvertes([l], [], { ...o, metier: 'dev' }).map(x => x.siren), ['100000003', '100000002', '100000001']);
      let e = ecarter([], { siren: '100000003', nom: 'E3' }, 5);
      eq(e, [{ siren: '100000003', nom: 'E3', at: 5 }]);
      eq(decouvertes([l], [], { ...o, ecartees: sirensEcartes(e) }).map(x => x.siren), ['100000001', '100000002']);
      e = ecarter(e, { siren: '100000003', nom: 'E3' }, 9);      /* deux fois : une ligne */
      eq(e.length, 1); eq(e[0].at, 9);
      eq(rendre(e, '100000003'), []);
      /* le profil garde les écartées, sans doublon, bornées */
      const p = normalizeProfile({ ecartees: [{ siren: '100000003', nom: 'X', at: 1 }, { siren: '100000003' }, { siren: '12' }] });
      eq(p.ecartees, [{ siren: '100000003', nom: 'X', at: 1 }]);
      eq(normalizeProfile({ ecartees: Array.from({ length: 320 }, (_, i) => ({ siren: String(100000000 + i) })) }).ecartees.length, 300);
    },
    'à ta mesure : « Nouveau » — seulement en refaisant une recherche': () => {
      const u1 = 'https://x.test/search?q=a&page=1', u1p2 = 'https://x.test/search?q=a&page=2';
      eq(cleVus([u1]), cleVus([u1p2]));                            /* la page ne change pas la recherche */
      ok(cleVus([u1]) !== cleVus(['https://x.test/search?q=b&page=1']));
      let v = lireVus(null);
      const k = cleVus([u1]);
      eq([...nouveauxDe(v, k, ['111111111'])], []);                  /* la première fois, rien n'est « nouveau » */
      v = noterVus(v, k, ['111111111', '222222222'], 1);
      eq([...nouveauxDe(v, k, ['111111111', '333333333'])], ['333333333']);
      v = lireVus(JSON.stringify(noterVus(v, k, ['333333333'], 2)));
      eq([...nouveauxDe(v, k, ['333333333'])], []);
      /* borné : les plus vieilles recherches partent */
      for (let i = 0; i < VUS_RECHERCHES + 5; i++) v = noterVus(v, 'k' + i, ['111111111'], 10 + i);
      eq(Object.keys(v.r).length, VUS_RECHERCHES); ok(!v.r[k]);
      eq(lireVus('pas du json'), { v: 1, r: {} });
    },
    'à ta mesure : le site par Clearbit — le nom exact, jamais un homonyme étranger': () => {
      const L = (nom, l) => lireClearbit(l.map(([name, domain]) => ({ name, domain })), nom);
      /* relevé le 6/10 : le premier résultat était souvent un autre */
      eq(L('Advens', [['Leading BIM Service Provider', 'advenser.com'], ['Advens', 'advens.fr'], ['ADVENS - HOSTING', 'advens.ru']]), 'https://advens.fr');
      eq(L('Inetum', [['Inetum', 'gfi-info.fr'], ['Inetum', 'inetum.com']]), 'https://inetum.com');   /* le domaine qui EST le nom */
      eq(L('Keyrus', [['Keyrus', 'keyrus.consulting'], ['Keyrus', 'keyrus.com']]), 'https://keyrus.com');
      eq(L('Linkt', [['Linktree', 'linktr.ee'], ['Linkt', 'linkt.com.au']]), '');                   /* l'homonyme australien */
      eq(L('Trustteam', [['Trustteam', 'trustteam.be'], ['Trustteam', 'trustteam.fr']]), 'https://trustteam.fr');
      eq(L('Euro Information', [['Euro-Information', 'e-i.com']]), 'https://e-i.com');
      eq(L('Incomm', [['InComm Payments', 'incomm.com']]), '');
      eq(lireClearbit('pas une liste', 'X'), ''); eq(lireClearbit(null, 'X'), '');
      eq(L('Evil', [['Evil', 'javascript:alert(1)']]), '');
      eq(questionClearbit('Euro Information'), CLEARBIT + 'Euro%20Information');
      eq(questionClearbit(''), '');
    },
    'à ta mesure : le marché — les embauches prévues (BMO 2026), la région quand le département se tait': () => {
      eq(BMO.size, 101);
      const n = marche('59', 'reseau');
      eq([n.lieu, n.quoi], ['Nord', 'réseau et support']); ok(n.n >= 30 && n.part > 0 && n.part <= 100);
      eq(marche('59', 'dev').quoi, 'développement'); eq(marche('59', '').quoi, 'informatique');
      ok(marche('59', '').n === marche('59', 'dev').n + marche('59', 'reseau').n);
      eq(marche('23', 'dev').lieu, 'Nouvelle-Aquitaine');          /* trop peu dans la Creuse : la région */
      eq(marche('99', 'dev'), null); eq(marche('', 'dev'), null);
    },
    'à ta mesure : l’aide à l’embauche d’un apprenti — un montant sûr, ou rien': () => {
      eq([niveauDiplome('BTS SIO SISR'), niveauDiplome('BUT informatique'), niveauDiplome('Master cybersécurité'),
          niveauDiplome('Titre pro TSSR'), niveauDiplome('Licence pro ASUR'), niveauDiplome('Bac pro SN'),
          niveauDiplome('CAP'), niveauDiplome('École 42'), niveauDiplome('')], [5, 6, 7, 5, 6, 4, 3, 0, 0]);
      const P = { recherche: 'alternance', formation: 'BTS SIO' };
      eq(aideEmbauche({ tranche: '12' }, P, '2026-10-06'), { montant: 4500, grande: false });
      eq(aideEmbauche({ tranche: '53' }, P, '2026-10-06'), { montant: 1500, grande: true });
      eq(aideEmbauche({ tranche: '', categorie: 'PME' }, P, '2026-10-06').montant, 4500);
      eq(aideEmbauche({ tranche: 'NN' }, P, '2026-10-06'), null);           /* taille inconnue : rien */
      eq(aideEmbauche({ tranche: '12' }, { ...P, formation: 'Master' }, '2026-10-06').montant, 2000);
      eq(aideEmbauche({ tranche: '53' }, { ...P, formation: 'Master' }, '2026-10-06').montant, 750);
      eq(aideEmbauche({ tranche: '53' }, { ...P, formation: 'Bac pro' }, '2026-10-06'), null);  /* pas prévu */
      eq(aideEmbauche({ tranche: '12' }, { ...P, debut: '2027-09-01' }, '2026-10-06'), null);  /* après le dispositif */
      eq(aideEmbauche({ tranche: '12' }, P, AIDE_FIN), null);
      eq(aideEmbauche({ tranche: '12' }, { ...P, recherche: 'stage' }, '2026-10-06'), null);
      eq(aideEmbauche({ tranche: '12' }, { ...P, formation: 'École 42' }, '2026-10-06'), null);
      eq(euros(4500), '4\u202f500\u00a0€'); eq(euros(750), '750\u00a0€');
    },
    'à ta mesure : une faute de frappe se PROPOSE, jamais ne s’applique': () => {
      eq(fautes('lile', 'lille', 1), 1); eq(fautes('stgae', 'stage', 1), 1);   /* deux lettres inversées : une faute */
      eq(fautes('abcd', 'wxyz', 1), 2);
      eq([fautesPermises('abc'), fautesPermises('lile'), fautesPermises('toulouze')], [0, 1, 2]);
      const C = q => correction(q);
      eq(C('alternance Lile').q, 'alternance Lille'); eq(C('alternance Lile').label, 'Lille');
      eq(C('stgae Lille').q, 'stage Lille');
      eq(C('saint etiene').q, 'Saint-Étienne');
      eq(C('alternanse').label, 'Alternance');
      eq(C('stage reseua').label, 'Réseau');
      /* ce qui se comprend déjà, ou ce qui ne ressemble à rien, ne bouge pas */
      for (const q of ['alternance Lille', 'Orange', 'Thales', 'Sopra', 'pme', 'abc', '59', '', 'devis', 'Lidl', 'Alten', 'Vinci'])
        eq(C(q), null, q);
      /* ce qui trouve quelque chose tel quel n'est pas une faute (« Lilly » peut être une piste) */
      eq(correction('Lilly', null, t => t === 'Lilly'), null);
      ok(correction('Lilly'));
    },
    'fiche enrichie : la question ne porte QUE le SIREN, ou le nom qu’on tape': () => {
      const u = new URL(questionSiren('326820065'));
      eq(u.origin, ANNUAIRE); eq(u.searchParams.get('q'), '326820065');
      eq(u.searchParams.get('etat_administratif'), null);      /* une entreprise fermée doit revenir */
      eq(questionSiren('3268'), ''); eq(questionSiren('32682006X'), ''); eq(questionSiren(undefined), '');
      const c = normalizeCompany({ name: 'Orange', city: 'Lille', notes: 'Rappeler Paul lundi',
        contacts: [{ name: 'Paul Martin', email: 'p@o.test' }] });
      eq(deptDePiste(c), '59');
      const n = new URL(questionNom(c, deptDePiste(c)));
      /* le nom, le département, et RIEN de privé : ni la note, ni le contact */
      eq([...n.searchParams.keys()].sort(), ['departement', 'etat_administratif', 'per_page', 'q']);
      eq(n.searchParams.get('q'), 'Orange'); eq(n.searchParams.get('departement'), '59');
      ok(!n.toString().includes('Paul') && !n.toString().includes('Rappeler'));
      eq(new URL(questionNom(normalizeCompany({ name: 'Aztek' }))).searchParams.get('departement'), null);
      eq(questionNom(normalizeCompany({ name: 'X' })), '');
      /* le TEXTE tapé dans le champ « Entreprise », tel quel */
      eq(new URL(questionNom('  Capgemini ')).searchParams.get('q'), 'Capgemini');
      eq(questionNom('C'), '');
      eq(deptDePiste(normalizeCompany({ name: 'A', address: '3 rue X\n69002 Lyon' })), '69');
      eq(deptDePiste(normalizeCompany({ name: 'A' })), '');
    },
    'fiche enrichie : le site par Wikidata — le SIREN seul entre dans la requête': () => {
      const u = new URL(questionSite('479766842'));
      eq(u.origin + u.pathname, WIKIDATA);
      ok(u.searchParams.get('query').includes('wdt:P1616 "479766842"'));
      ok(u.searchParams.get('query').includes('wdt:P856'));
      eq(questionSite('47976684" } DELETE {'), '');               /* rien d'autre qu'un SIREN n'y entre */
      eq(lireSite({ results: { bindings: [{ site: { value: 'http://www.capgemini.com' } },
                                          { site: { value: 'https://www.capgemini.com/fr-fr/' } }] } }),
         'https://www.capgemini.com/fr-fr/');                        /* https d'abord */
      eq(lireSite({ results: { bindings: [{ site: { value: 'http://exemple.fr' } }] } }), 'http://exemple.fr');
      eq(lireSite({ results: { bindings: [{ site: { value: 'javascript:alert(1)' } }] } }), '');
      eq(lireSite({ results: { bindings: [] } }), ''); eq(lireSite(null), '');
    },
    'fiche enrichie : compléter les vides, jamais écraser — et la position suit l’adresse': () => {
      const r = { siren: '326820065', ville: 'Lille', adresse: '12 Rue Nationale\n59000 Lille', lat: 50.63, lng: 3.06,
                  activite: 'Conseil en systèmes et logiciels informatiques', naf: '62.02A' };
      const vide = normalizeCompany({ name: 'Sopra Steria' });
      eq(complements(vide, r, 'https://www.soprasteria.com'), {
        siren: '326820065', city: 'Lille', address: '12 Rue Nationale\n59000 Lille', lat: 50.63, lng: 3.06,
        desc: 'Conseil et intégration informatique', domain: 'esn', website: 'https://www.soprasteria.com' });   /* les missions, pas l'INSEE */
      /* ce que tu as écrit reste, et la position ne vient pas contredire ton adresse */
      const plein = normalizeCompany({ name: 'Sopra Steria', city: 'Villeneuve-d’Ascq', address: '1 avenue X\n59650 Villeneuve-d’Ascq',
        desc: 'ESN', website: 'soprasteria.com', domain: 'cyber', siren: '326820065' });
      eq(complements(plein, r, 'https://www.soprasteria.com'), {});
      eq(complements(vide, null, ''), {});
      /* le dirigeant : une personne, jamais une société, et pas deux fois */
      const avec = normalizeCompany({ name: 'A', contacts: [{ name: 'Marie Dupont', role: 'DG' }] });
      const rr = { dirigeants: [{ nom: 'Marie Dupont', personne: true }, { nom: 'Cabinet Audit', personne: false },
                                { nom: 'Jean Petit', personne: true }] };
      eq(dirigeantsAjoutables(avec, rr).map(d => d.nom), ['Jean Petit']);
      /* une entreprise fermée se lit comme telle */
      const [f] = lireAnnuaire({ results: [{ siren: '111111111', nom_raison_sociale: 'VIEILLE BOITE',
        etat_administratif: 'C', date_fermeture: '2024-06-30', siege: { libelle_commune: 'LILLE' } }] });
      eq(f.fermee, true); eq(f.fermeeLe, '2024-06-30');
    },
    'fiche enrichie : UN lien pour trouver quelqu’un — le nom, et l’école s’il y en a une': () => {
      const g = lienGens('Sopra Steria', { ecole: 'IUT de Lille', notes: 'privé' });
      eq(new URL(g.url).searchParams.get('keywords'), 'Sopra Steria IUT de Lille');
      eq(g.aria, 'Anciens de IUT de Lille chez Sopra Steria, sur LinkedIn');
      eq(new URL(lienGens('Aztek', {}).url).searchParams.get('keywords'), 'Aztek');
      ok(!lienGens('Aztek', { ecole: '', notes: 'privé' }).url.includes('priv'));
      eq(lienGens('  ', {}), null);
    },
    'le nom se reconnaît en le tapant : ni personne, ni association, ni code — la ville et la taille': () => {
      const E = (siren, nom, naf, o = {}) => ({ siren, nom_complet: nom, nom_raison_sociale: nom, activite_principale: naf,
        tranche_effectif_salarie: o.tr || '', nature_juridique: o.nj || '5710', etat_administratif: 'A',
        siege: { est_siege: true, libelle_commune: o.ville || 'PARIS', code_postal: '75001' } });
      const l = suggestionsNom({ results: [
        E('330703844', 'CAPGEMINI', '70.10Z', { tr: '52' }),
        E('479766842', 'CAPGEMINI TECHNOLOGY SERVICES', '62.02A', { tr: '53', ville: 'LE BOURGET-DU-LAC' }),
        E('111222333', 'CE CAPGEMINI TS', '94.20Z', { ville: 'NANTES' }),            /* un comité d'entreprise */
        E('222333444', 'JEAN DUPONT', '62.01Z', { nj: '1000' }),                      /* une personne */
        E('330703844', 'CAPGEMINI', '70.10Z', { tr: '52' })                           /* deux fois la même */
      ] });
      eq(l.map(r => r.siren), ['330703844', '479766842']);
      eq(sousLigneNom(l[1]), 'Le Bourget-du-Lac · 10 000 salariés et plus');
      ok(l.every(r => !/\d{2}\.\d{2}[A-Z]/.test(sousLigneNom(r))));            /* jamais un code d'activité */
      eq(suggestionsNom({ results: Array.from({ length: 9 }, (_, i) => E('10000000' + i, 'A' + i, '62.01Z')) }).length, 5);
      eq(suggestionsNom(null), []);
    },
    'mon parcours : ce qui se saisit, ce qui se déduit des pistes, et rien d’inventé': () => {
      const l = normalizeParcours([
        { id: 'a', entreprise: '  Sopra   Steria ', quoi: 'stage', debut: '2025-04', fin: '2025-06' },
        { entreprise: 'Advens', quoi: 'alternance', debut: '2025-09', fin: '2025-03' },   /* fin avant début : retirée */
        { entreprise: 'X', quoi: 'cdi' }, { entreprise: '', quoi: 'stage' }, null, 'texte',
        { id: '<script>', entreprise: 'Y', quoi: 'emploi', debut: '2024-13', pisteId: 'p 1' }
      ]);
      eq(l.length, 3);
      eq(l[0], { id: 'a', entreprise: 'Sopra Steria', quoi: 'stage', debut: '2025-04', fin: '2025-06' });
      eq(l[1].fin, ''); eq(l[1].debut, '2025-09');
      ok(l[2].id !== '<script>'); eq(l[2].debut, ''); eq(l[2].pisteId, undefined);
      eq(normalizeParcours(Array.from({ length: 30 }, (_, i) => ({ entreprise: 'E' + i, quoi: 'stage' }))).length, PARCOURS_MAX);
      eq(normalizeParcours('x'), []);
      /* déduit : MA déclaration seulement (sans prénom), stage ou alternance */
      const pistes = [
        normalizeCompany({ id: 'p1', name: 'Advens', vecu: 'alternance' }),
        normalizeCompany({ id: 'p2', name: 'Wavestone', vecu: 'stage', vecuQui: 'Léa' }),
        normalizeCompany({ id: 'p3', name: 'Orange', vecu: 'entretien' }),
        normalizeCompany({ id: 'p4', name: 'Sopra Steria', vecu: 'stage' })
      ];
      const tout = parcoursDe({ parcours: [{ id: 's', entreprise: 'SOPRA STERIA', quoi: 'stage', debut: '2025-04', fin: '2025-06' }] }, pistes);
      eq(tout.map(e => e.entreprise), ['SOPRA STERIA', 'Advens']);   /* pas Léa, pas l'entretien, pas deux fois Sopra */
      eq(tout[1].deduit, true); eq(tout[1].pisteId, 'p1');
      /* une ligne saisie liée à sa piste prend la place de la déduite */
      eq(parcoursDe({ parcours: [{ entreprise: 'Advens SAS', quoi: 'alternance', debut: '2025-09', pisteId: 'p1' }] }, pistes)
        .map(e => e.entreprise), ['Advens SAS', 'Sopra Steria']);
      /* en cours d'abord, puis le plus récent */
      const tri = parcoursDe({ parcours: [{ entreprise: 'A', quoi: 'stage', debut: '2023-01', fin: '2023-03' },
        { entreprise: 'B', quoi: 'emploi', debut: '2024-06', fin: '2024-08' },
        { entreprise: 'C', quoi: 'alternance', debut: '2025-09' }] }, []);
      eq(tri.map(e => e.entreprise), ['C', 'B', 'A']);
      eq(periodeParcours({ debut: '2025-09' }), 'depuis 2025');
      eq(periodeParcours({ debut: '2024-09', fin: '2025-06' }), '2024-2025');
      eq(periodeParcours({ debut: '2025-04', fin: '2025-06' }), '2025');
      eq(periodeParcours({}), '');
      eq(phraseParcours(tri), 'alternance chez C (depuis 2025), emploi chez B (2024)');
      eq(phraseParcours([]), '');
    },
    'mon parcours : la ligne « Expérience » du mail, et elle part quand il n’y a rien': () => {
      const c = normalizeCompany({ name: 'Aztek' });
      const [cand] = defaultTemplates();
      const p = normalizeProfile({ name: 'Inès Martin', formation: 'BTS SIO',
        parcours: [{ entreprise: 'Sopra Steria', quoi: 'stage', debut: '2025-04', fin: '2025-06' }] });
      const m = fillTpl(cand.body, c, null, p, { companies: [normalizeCompany({ id: 'p1', name: 'Advens', vecu: 'alternance' })] });
      ok(m.includes('Expérience : stage chez Sopra Steria (2025), alternance chez Advens'));
      /* sans parcours : la ligne disparaît en entier, aucune cicatrice */
      const vide = fillTpl(cand.body, c, null, normalizeProfile({ name: 'Inès', formation: 'BTS SIO' }), { companies: [] });
      ok(!vide.includes('Expérience'));
      /* sans `companies` (un appelant ancien) : la partie saisie reste */
      ok(fillTpl(cand.body, c, null, p).includes('Expérience : stage chez Sopra Steria (2025)'));
      /* le modèle de départ des 6.31 à 6.46, jamais retouché, prend la ligne ;
         un modèle retouché ne bouge pas */
      const ancien = { ...cand, body: cand.body.replace('Expérience : {{parcours}}\n', '') };
      eq(majModelesDefaut([ancien])[0].body, cand.body);
      const retouche = { ...ancien, body: ancien.body + ' ' };
      eq(majModelesDefaut([retouche])[0].body, retouche.body);
      eq(normalizeProfile({}).parcours, []);
    },
    /* ---------- les amis (docs/reseau.md, lot 2) ---------- */
    'amis : le nom d’une entreprise se reconnaît sous sa forme juridique, jamais par ressemblance': () => {
      eq(cleEntreprise('Aztek'), 'aztek');
      eq(cleEntreprise('AZTEK SAS'), 'aztek');
      eq(cleEntreprise('Aztek S.A.S.'), 'aztek');
      eq(cleEntreprise('Groupe SEB'), 'seb');
      eq(cleEntreprise('Air France'), 'airfrance');          /* « France » peut être le nom : il reste */
      eq(cleEntreprise('SAS'), 'sas');                       /* un nom fait QUE d'une forme garde ses mots */
      ok(memeEntreprise({ name: 'Aztek' }, { entreprise: 'AZTEK SAS' }));
      ok(!memeEntreprise({ name: 'Aztek' }, { entreprise: 'Aztec' }));       /* une lettre : pas la même */
      ok(!memeEntreprise({ name: 'Orange' }, { entreprise: 'Orange Bank' }));
      /* deux SIREN connus décident seuls — même sous deux noms, ou contre un nom identique */
      ok(memeEntreprise({ name: 'Sopra Steria Group', siren: '326820065' }, { entreprise: 'Sopra', siren: '326820065' }));
      ok(!memeEntreprise({ name: 'Aztek', siren: '111111111' }, { entreprise: 'Aztek', siren: '222222222' }));
      ok(!memeEntreprise({ name: '' }, { entreprise: '' }));
    },
    'amis : le profil donné ne porte que l’identifiant, le nom et le parcours': () => {
      const pistes = [
        normalizeCompany({ id: 'p1', name: 'Advens', vecu: 'alternance', siren: '123456789', notes: 'privé',
          status: 'reply', contacts: [{ name: 'Julie', email: 'julie@advens.test' }] }),
        normalizeCompany({ id: 'p2', name: 'Wavestone', vecu: 'stage', vecuQui: 'Léa' })
      ];
      const p = normalizeProfile({ name: 'Inès  Martin', email: 'ines@x.test', phone: '0600000000', formation: 'BTS SIO',
        ecole: 'Lycée X', ville: 'Lille', amiId: nouvelIdAmi(),
        parcours: [{ entreprise: 'Quick', quoi: 'emploi', debut: '2024-06', fin: '2024-08' }],
        amis: [{ id: nouvelIdAmi(), nom: 'Karim Benali', parcours: [{ entreprise: 'Aztek', quoi: 'alternance' }] }] });
      const d = profilDonne(p, pistes);
      eq(Object.keys(d).sort(), ['id', 'kind', 'nom', 'parcours', 'v']);
      eq(d.nom, 'Inès Martin');
      eq(d.parcours.map(e => e.entreprise), ['Quick', 'Advens']);   /* pas Léa : son parcours, pas le mien */
      eq(d.parcours[1], { entreprise: 'Advens', quoi: 'alternance', debut: '', fin: '', siren: '123456789' });
      const txt = JSON.stringify(d);
      /* rien du suivi, rien de joignable, et JAMAIS le profil d'un ami (il ne se repartage pas) */
      for (const x of ['ines@x.test', '0600000000', 'BTS SIO', 'Lycée', 'Lille', 'privé', 'julie', 'reply', 'p1', 'Karim', 'Aztek', 'Wavestone'])
        ok(!txt.includes(x));
    },
    'amis : ce qui arrive se remet aux invariants, ou se refuse': () => {
      const id = nouvelIdAmi();
      ok(idAmiValide(id)); ok(id.length >= 22);
      ok(nouvelIdAmi() !== nouvelIdAmi());
      eq(normalizeAmi({ id: 'court', nom: 'X' }), null);
      eq(normalizeAmi({ id, nom: '   ' }), null);
      eq(normalizeAmi(null), null);
      const a = normalizeAmi({ id, nom: ' Karim   Benali ', email: 'k@x.test', notes: 'n',
        parcours: [{ entreprise: 'Aztek', quoi: 'alternance', debut: '2025-09', siren: '12', pisteId: 'p9' },
                   { entreprise: 'X', quoi: 'cdi' }, { entreprise: '', quoi: 'stage' }, 'texte',
                   { entreprise: 'Quick', quoi: 'emploi', debut: '2024-06', fin: '2024-01' }] });
      eq(a, { id, nom: 'Karim Benali', parcours: [
        { entreprise: 'Aztek', quoi: 'alternance', debut: '2025-09', fin: '' },
        { entreprise: 'Quick', quoi: 'emploi', debut: '2024-06', fin: '' }] });
      /* une liste : un ami par identifiant (le plus récent), plafonnée */
      const l = normalizeAmis([{ id, nom: 'Vieux', recu: 1 }, { id, nom: 'Neuf', recu: 2 }, { id: 'x', nom: 'Y' }]);
      eq(l.map(x => x.nom), ['Neuf']);
      eq(normalizeAmis(Array.from({ length: AMIS_MAX + 5 }, () => ({ id: nouvelIdAmi(), nom: 'A' }))).length, AMIS_MAX);
      eq(normalizeAmis('x'), []);
      eq(normalizeProfile({}).amis, []);
      eq(normalizeProfile({ amiId: 'pas bon' }).amiId, undefined);
    },
    'amis : ajouter, mettre à jour, retirer — et jamais soi-même': () => {
      const moi = nouvelIdAmi(), k = nouvelIdAmi();
      const karim = { id: k, nom: 'Karim', parcours: [{ entreprise: 'Aztek', quoi: 'alternance', debut: '', fin: '' }] };
      eq(statutAmi([], karim, moi), 'nouveau');
      eq(statutAmi([], { ...karim, id: moi }, moi), 'moi');
      eq(statutAmi([], null, moi), 'invalide');
      let amis = ajouterAmi([], karim, 10);
      eq(amis.length, 1); eq(amis[0].recu, 10);
      eq(statutAmi(amis, normalizeAmi(karim), moi), 'identique');
      const maj = { ...karim, parcours: [...karim.parcours, { entreprise: 'Quick', quoi: 'emploi', debut: '', fin: '' }] };
      eq(statutAmi(amis, normalizeAmi(maj), moi), 'maj');
      amis = ajouterAmi(amis, maj, 20);
      eq(amis.length, 1); eq(amis[0].parcours.length, 2);            /* remplacé, jamais doublé */
      eq(retirerAmi(amis, k), []);
      eq(prenomAmi({ nom: 'Karim Benali' }), 'Karim');
    },
    'amis : en cours ou passé, et la phrase qui va avec': () => {
      const t = '2026-10-07';
      ok(enCours({ debut: '2025-09' }, t));
      ok(enCours({ debut: '2025-09', fin: '2027-06' }, t));            /* finit plus tard : il y est encore */
      ok(enCours({ debut: '2025-09', fin: '2026-10' }, t));
      ok(!enCours({ debut: '2025-09', fin: '2026-09' }, t));
      ok(!enCours({ debut: '', fin: '' }, t));                          /* sans dates on ne sait pas : passé */
      eq(direExperience({ quoi: 'alternance', debut: '2025-09' }, t).court, 'y est en alternance');
      eq(direExperience({ quoi: 'alternance', debut: '2025-09' }, t).tu, 'y es en alternance');
      eq(direExperience({ quoi: 'alternance' }, t).court, 'y a été en alternance');
      eq(direExperience({ quoi: 'stage' }, t).court, VECU.stage.court);  /* la même phrase que « J'y suis passé » */
      eq(direExperience({ quoi: 'stage' }, t).tu, VECU.stage.tu);
      eq(direExperience({ quoi: 'alternance' }, t).poids, VECU.alternance.poids);
      eq(direExperience({ quoi: 'emploi', debut: '2026-01' }, t).court, 'y travaille');
      eq(direExperience({ quoi: 'emploi', debut: '2020-01', fin: '2021-01' }, t).court, 'y a travaillé');
      eq(direExperience({ quoi: 'cdi' }, t), null);
      /* quelqu'un qui y est MAINTENANT passe devant toute déclaration passée */
      ok(direExperience({ quoi: 'stage', debut: '2026-09' }, t).poids > VECU.alternance.poids);
    },
    'amis : qui, parmi tes amis, est passé par chaque piste — le plus fort d’abord': () => {
      const t = '2026-10-07';
      const pistes = [normalizeCompany({ id: 'az', name: 'AZTEK SAS' }),
                      normalizeCompany({ id: 'so', name: 'Sopra Steria Group', siren: '326820065' }),
                      normalizeCompany({ id: 'or', name: 'Orange' })];
      const amis = normalizeAmis([
        { id: nouvelIdAmi(), nom: 'Karim Benali', parcours: [
          { entreprise: 'Aztek', quoi: 'stage', debut: '2024-04', fin: '2024-06' },
          { entreprise: 'Aztek', quoi: 'alternance', debut: '2025-09' }] },
        { id: nouvelIdAmi(), nom: 'Awa Diallo', parcours: [{ entreprise: 'Aztek', quoi: 'stage' },
          { entreprise: 'Sopra', quoi: 'emploi', siren: '326820065' }] }]);
      const m = portesAmis(pistes, amis, t);
      eq(m.get('az').map(x => x.prenom + ' ' + x.court), ['Karim y est en alternance', 'Awa y a fait son stage']);
      eq(m.get('so').map(x => x.prenom + ' ' + x.court), ['Awa y a travaillé']);
      ok(!m.has('or'));
      eq(portesAmis(pistes, [], t).size, 0);
      /* la barre et la fiche les lisent à côté de « J'y suis passé », une personne une fois */
      const az = normalizeCompany({ id: 'az', name: 'AZTEK SAS', vecu: 'stage', vecuQui: 'Awa' });
      eq(porteurs(az, m).map(x => x.prenom), ['Karim', 'Awa']);
      const wa = normalizeCompany({ id: 'wa', name: 'Wavestone', vecu: 'stage', vecuQui: 'Léa' });
      eq(porteurs(wa, m).map(x => x.prenom + ' ' + x.court), ['Léa y a fait son stage']);
      eq(porteurs(normalizeCompany({ id: 'or', name: 'Orange' }), m), []);
    },
    'amis : la barre comprend leurs prénoms et dit la raison': () => {
      const t = '2026-10-07';
      const pistes = [normalizeCompany({ id: 'az', name: 'Aztek', city: 'Roubaix' }),
                      normalizeCompany({ id: 'qu', name: 'Quick', city: 'Lille' })];
      const amis = normalizeAmis([{ id: nouvelIdAmi(), nom: 'Karim Benali',
        parcours: [{ entreprise: 'AZTEK', quoi: 'alternance', debut: '2025-09' }] },
        { id: nouvelIdAmi(), nom: 'Zoé Muette', parcours: [{ entreprise: 'Ailleurs', quoi: 'stage' }] }]);
      const ctx = contexteRecherche(pistes, t, portesAmis(pistes, amis, t));
      ok(ctx.prenoms.includes('Karim'));
      ok(!ctx.prenoms.includes('Zoé'));                  /* elle ne porte aucune piste : pas d'étiquette vide */
      const r = chercherPistes(pistes, { q: 'Karim', ctx });
      eq(r.liste.map(c => c.id), ['az']);
      eq(raisonDe(r.liste[0], r.interp, ctx).accent, 'Karim y est en alternance');
      const rec = chercherPistes(pistes, { q: 'recommandées', ctx });
      eq(rec.liste.map(c => c.id), ['az']);
      /* sans amis, rien ne change */
      eq(contexteRecherche(pistes, t).prenoms, []);
    },
    'OCA1 : le profil donné fait l’aller-retour, et rien d’autre ne se lit comme lui': async () => {
      const d = profilDonne(normalizeProfile({ name: 'Inès Martin', amiId: nouvelIdAmi(),
        parcours: [{ entreprise: 'Quick', quoi: 'emploi', debut: '2024-06', fin: '2024-08' }] }), []);
      const txt = await encodeOCA(d);
      ok(txt.startsWith('OCA1.')); ok(estOCA(txt)); ok(estOCA(' ' + txt.slice(0, 20) + '\n' + txt.slice(20)));
      ok(txt.length < 400);                                       /* un QR net, sans animation */
      eq(normalizeAmi(await decodeOCA(txt)), normalizeAmi(d));
      ok(!estOCA('OCQ1.abc')); ok(!estOCA('OCR1.abc'));
      for (const mauvais of ['OCA1.%%%', 'OCA1.', 'OCA1.' + 'A'.repeat(30000)]){
        let code = '';
        try { await decodeOCA(mauvais); } catch (e) { code = e.message; }
        ok(code === 'format' || code === 'troplourd');
      }
      /* un partage de pistes déguisé n'est pas un profil */
      const piege = await encodeOCA({ kind: 'share', companies: [] });
      let code = '';
      try { await decodeOCA(piege); } catch (e) { code = e.message; }
      eq(code, 'format');
      /* et un profil n'est pas un partage de pistes : la fusion ne le lit pas */
      code = '';
      try { await parseInput(txt); } catch (e) { code = e.message; }
      eq(code, 'format');
    },
    /* ---------- la boîte aux lettres (docs/reseau.md, lot 3) ---------- */
    'boîte : une lettre scellée pour une clé ne s’ouvre qu’avec elle': async () => {
      const lea = await nouvelleCle(), karim = await nouvelleCle();
      ok(boiteValide(lea)); ok(cleValide(lea.pub)); ok(!cleValide('court'));
      const l = { v: 1, t: 'demande', id: 'abcdefgh12', secret: 'Aztek' };
      const s = await sceller(lea.pub, l);
      ok(s.startsWith('OCB1.')); ok(!s.includes('Aztek'));
      eq(await ouvrir(lea.priv, s), l);
      eq(await ouvrir(karim.priv, s), null);                      /* pas pour lui */
      eq(await ouvrir(lea.priv, s.slice(0, -4) + 'AAAA'), null);  /* abîmée */
      eq(await ouvrir(lea.priv, 'OCQ1.xxx'), null);
      /* deux lettres pour la même clé ne se ressemblent pas : la clé jetable change */
      ok((await sceller(lea.pub, l)) !== s);
      /* l'étiquette : stable pour une clé, différente d'une clé à l'autre, sans rien de la clé */
      const t = await etiquetteBoite(lea.pub);
      ok(/^oc-boite-[0-9a-f]{32}$/.test(t)); eq(await etiquetteBoite(lea.pub), t);
      ok(t !== await etiquetteBoite(karim.pub)); ok(!t.includes(lea.pub.slice(0, 10)));
      let pris = '';
      try { await sceller('pas-une-cle', l); } catch (e) { pris = e.message; }
      eq(pris, 'cle');
    },
    'boîte : une demande ne porte que l’entreprise, le prénom, le cercle et l’expiration': async () => {
      const k = await nouvelleCle(), now = Date.parse('2026-10-07T12:00:00Z');
      const d = lettreDemande({ prenom: 'Inès', cle: k.pub },
        normalizeCompany({ id: 'p', name: 'AZTEK SAS', siren: '123456789', notes: 'privé', status: 'reply',
          contacts: [{ name: 'Julie', email: 'j@a.test' }] }), now);
      eq(Object.keys(d).sort(), ['cercle', 'de', 'entreprise', 'exp', 'id', 't', 'v']);
      eq(d.entreprise, { nom: 'AZTEK SAS', siren: '123456789' });
      eq(Object.keys(d.de).sort(), ['cle', 'prenom']);
      eq(d.exp, now + DEMANDE_JOURS * 864e5);
      ok(!/privé|reply|Julie/.test(JSON.stringify(d)));
      eq(normaliserLettre(d, now).t, 'demande');
      eq(normaliserLettre(d, d.exp + 1), null);                                  /* expirée : elle ne part plus */
      eq(normaliserLettre({ ...d, cercle: 2 }, now), null);                       /* le cercle 2 n'existe pas encore */
      eq(normaliserLettre({ ...d, exp: now + 40 * 864e5 }, now), null);           /* plus de 14 jours : refusée */
      eq(normaliserLettre({ ...d, de: { prenom: 'X', cle: 'faux' } }, now), null);
      eq(normaliserLettre({ ...d, v: 2 }, now), null);
      eq(normaliserLettre(null, now), null);
    },
    'boîte : un don ne porte que de quoi joindre le contact, jamais une note': async () => {
      const k = await nouvelleCle(), now = Date.now();
      const dem = normaliserLettre(lettreDemande({ prenom: 'Inès', cle: k.pub }, { name: 'Aztek' }, now), now);
      const ct = normalizeContact({ name: 'Julie Marchand', role: 'RH', email: 'julie@aztek.test', note: 'très privé',
        conf: 'ok', activatedAt: '2026-10-01' });
      eq(contactDonne(ct), { name: 'Julie Marchand', role: 'RH', email: 'julie@aztek.test' });
      const don = lettreDon({ prenom: 'Léa', cle: k.pub }, dem, ct);
      ok(!/privé|conf|activatedAt/.test(JSON.stringify(don)));
      const n = normaliserLettre(don, now);
      eq(n.contact, { name: 'Julie Marchand', role: 'RH', email: 'julie@aztek.test' });
      eq(n.demande, dem.id);
      /* sans rien pour le joindre, un contact n'est pas un don */
      eq(normaliserLettre({ ...don, contact: { name: 'Julie' } }, now), null);
      const m = normaliserLettre(lettreMerci({ prenom: 'Inès', cle: k.pub }, n), now);
      eq(m.t, 'merci'); eq(m.contact, { name: 'Julie Marchand' });
    },
    'boîte : ce que mon téléphone trouve pour une demande — mes contacts joignables, jamais l’exemple': () => {
      const pistes = [
        normalizeCompany({ id: 'a', name: 'Aztek', contacts: [{ id: 'c1', name: 'Julie', email: 'j@a.test' },
          { id: 'c2', name: 'Sans moyen' }, { id: 'c3', name: 'Paul', phone: '0600' }] }),
        normalizeCompany({ id: 'd', name: 'AZTEK SAS', demo: true, contacts: [{ id: 'c4', name: 'Fictif', email: 'f@x.test' }] }),
        normalizeCompany({ id: 'o', name: 'Orange', contacts: [{ id: 'c5', name: 'Zoé', email: 'z@o.test' }] })];
      eq(contactsPour(pistes, { nom: 'AZTEK SAS' }), [{ pisteId: 'a', ctId: 'c1' }, { pisteId: 'a', ctId: 'c3' }]);
      eq(contactsPour(pistes, { nom: 'Quick' }), []);
    },
    'boîte : l’état — trois demandes ouvertes, rien deux fois, rien chez qui ne trouve rien': async () => {
      const moi = await nouvelleCle(), lea = await nouvelleCle(), now = Date.now();
      let e = normaliserEtat(etatVide());
      ok(peutDemander(e, now));
      for (let i = 0; i < DEMANDES_OUVERTES_MAX; i++)
        e = { ...e, demandes: [...e.demandes, { id: 'demande0' + i, pisteId: 'p' + i, entreprise: { nom: 'E' + i }, at: now, exp: now + 864e5 }] };
      ok(!peutDemander(e, now));
      ok(peutDemander(e, now + 2 * 864e5));                     /* expirées, elles libèrent la place */
      eq(demandeDePiste(e, 'p1', now).id, 'demande01');
      eq(demandeDePiste(e, 'p1', now + 2 * 864e5), null);
      /* une demande reçue : gardée, montrée seulement si j'ai trouvé */
      const pistes = [normalizeCompany({ id: 'a', name: 'Aztek', contacts: [{ id: 'c1', name: 'Julie', email: 'j@a.test' }] })];
      const d1 = normaliserLettre(lettreDemande({ prenom: 'Tom', cle: lea.pub }, { name: 'AZTEK SAS' }, now), now);
      let r = traiterLettre(e, d1, { companies: pistes, moi: moi.pub, now });
      eq(r.quoi, 'demande'); eq(r.etat.recues.at(-1).statut, 'a-voir');
      eq(traiterLettre(r.etat, d1, { companies: pistes, moi: moi.pub, now }).quoi, null);   /* une fois */
      const d2 = normaliserLettre(lettreDemande({ prenom: 'Tom', cle: lea.pub }, { name: 'Quick' }, now), now);
      const r2 = traiterLettre(r.etat, d2, { companies: pistes, moi: moi.pub, now });
      eq(r2.quoi, null); eq(r2.etat.recues.at(-1).statut, 'rien');                        /* règle 6 */
      /* ma propre demande, revenue par mon autre appareil, ne me sollicite pas */
      const d3 = normaliserLettre(lettreDemande({ prenom: 'Moi', cle: moi.pub }, { name: 'Aztek' }, now), now);
      eq(traiterLettre(e, d3, { companies: pistes, moi: moi.pub, now }).quoi, null);
      /* un don ne vaut que pour MA demande */
      const mienne = e.demandes[0];
      const don = normaliserLettre(lettreDon({ prenom: 'Léa', cle: lea.pub }, mienne, { name: 'Julie', email: 'j@a.test' }), now);
      const r3 = traiterLettre(e, don, { moi: moi.pub, now });
      eq(r3.quoi, 'don'); eq(r3.etat.dons.at(-1).statut, 'nouveau');
      eq(traiterLettre(r3.etat, don, { moi: moi.pub, now }).quoi, null);
      const etranger = normaliserLettre(lettreDon({ prenom: 'X', cle: lea.pub }, { id: 'inconnue01', entreprise: { nom: 'Z' } },
        { name: 'A', email: 'a@b.test' }), now);
      eq(traiterLettre(e, etranger, { moi: moi.pub, now }).quoi, null);
      /* un merci ne vaut que pour un don que j'ai fait */
      const rDonne = { ...r.etat, recues: r.etat.recues.map(x => x.id === d1.id ? { ...x, statut: 'donnee' } : x) };
      const merci = normaliserLettre(lettreMerci({ prenom: 'Tom', cle: lea.pub },
        { demande: d1.id, entreprise: { nom: 'AZTEK SAS' }, contact: { name: 'Julie' } }), now);
      eq(traiterLettre(rDonne, merci, { moi: moi.pub, now }).quoi, 'merci');
      /* ajouté, annulé, rajouté : un seul merci par demande */
      const remerci = normaliserLettre(lettreMerci({ prenom: 'Tom', cle: lea.pub },
        { demande: d1.id, entreprise: { nom: 'AZTEK SAS' }, contact: { name: 'Julie' } }), now);
      eq(traiterLettre(traiterLettre(rDonne, merci, { moi: moi.pub, now }).etat, remerci, { moi: moi.pub, now }).quoi, null);
      eq(traiterLettre(r.etat, merci, { moi: moi.pub, now }).quoi, null);
      /* au-delà de 30 jours, on oublie */
      eq(elaguer(r3.etat, now + 60 * 864e5).demandes, []);
      eq(normaliserEtat('x').demandes, []);
    },
    'boîte : la clé suit le profil, part dans le QR, et un ami ancien n’en a pas': async () => {
      const b = await nouvelleCle();
      const p = normalizeProfile({ name: 'Inès Martin', amiId: nouvelIdAmi(), boite: b });
      eq(p.boite, b);
      eq(normalizeProfile({ boite: { pub: 'x', priv: 'y' } }).boite, undefined);
      const d = profilDonne(p, []);
      eq(d.cle, b.pub);
      ok(!JSON.stringify(d).includes(b.priv));                   /* la clé privée ne part jamais */
      eq(normalizeAmi({ ...d, recu: 1 }).cle, b.pub);
      eq(normalizeAmi({ id: nouvelIdAmi(), nom: 'Ancien' }).cle, undefined);
      eq(statutAmi([normalizeAmi({ ...d, cle: undefined })], normalizeAmi(d), 'x'), 'maj');   /* redonné avec sa clé : mis à jour */
      /* MES APPAREILS : le profil le plus récent gagne, mais la boîte ne se
         perd jamais — mes amis ont scanné ce QR-là */
      const vide = { companies: [], orphans: [], tombs: [] };
      const recent = normalizeProfile({ name: 'Inès Martin', updatedAt: 2000 });
      const ancien = { ...vide, profile: { ...p, updatedAt: 1000 } };
      const r1 = syncMerge({ ...vide, profile: recent }, ancien);          /* le distant gagne, sans boîte */
      eq(r1.stats.profile, 'remote');
      eq(r1.profile.boite, b);
      eq(r1.profile.amiId, p.amiId);
      const r2 = syncMerge(ancien, { ...vide, profile: recent });          /* le local gagne, sans boîte */
      eq(r2.stats.profile, 'local');
      eq(r2.profile.boite, b);
    },
    'premier mail : un manque qui rendrait le mail FAUX devient un crochet, jamais un trou muet': () => {
      /* Le défaut joué le 30 septembre 2026 : profil vide, le premier mail
         d'un étudiant disait « Je suis en et je cherche un stage » et
         partait sans signature, d'un tap. */
      const c = normalizeCompany({ name: 'Aztek' });
      const [cand] = defaultTemplates();
      const vide = normalizeProfile({});
      const brouillon = fillTpl(cand.body, c, null, vide, { trous: true });
      ok(brouillon.includes('Je suis en [' + TROUS.formation + '] et je cherche un stage.'));
      ok(brouillon.endsWith('Bien à vous,\n[' + TROUS.moi + ']'));
      /* l'école, le téléphone, le CV : leur absence retire une ligne, rien de faux */
      ok(!/Mon CV|Rythme|—/.test(brouillon.split('\n\n').slice(2).join('\n\n')));
      /* sans l'option, rien ne change pour un envoi en série : pas de crochet inventé */
      eq(crochets(fillTpl(cand.body, c, null, vide)).length, 1);
      /* un profil rempli ne laisse QUE l'accroche, avec ou sans l'option */
      const plein = normalizeProfile({ name: 'Ana B', formation: 'BTS SIO', email: 'a@b.fr' });
      eq(fillTpl(cand.body, c, null, plein, { trous: true }), fillTpl(cand.body, c, null, plein));
      /* l'objet ne prend jamais de crochet : c'est au corps de le dire */
      ok(!/\[/.test(fillTpl(cand.subject, c, null, vide)));
    },
    'premier mail : les crochets se trouvent tous, dans l’ordre, à leur place exacte': () => {
      const c = normalizeCompany({ name: 'Aztek' });
      const [cand] = defaultTemplates();
      const brouillon = fillTpl(cand.body, c, null, normalizeProfile({}), { trous: true });
      const cr = crochets(brouillon);
      eq(cr.length, 3);
      ok(/^\[Une phrase précise/.test(cr[0].texte));
      eq(cr[1].texte, '[' + TROUS.formation + ']');
      eq(cr[2].texte, '[' + TROUS.moi + ']');
      for (const x of cr) eq(brouillon.slice(x.debut, x.fin), x.texte);
      eq(crochets('Bonjour,\nRien à remplir ici.').length, 0);
      eq(crochets('').length, 0);
      eq(crochets(null).length, 0);
      /* un crochet ouvert jamais fermé n'est pas un trou */
      eq(crochets('Je suis [en BTS').length, 0);
    },
    'premier mail : compléter son profil en écrivant remplit les trous SUR PLACE, sans toucher au reste': () => {
      const c = normalizeCompany({ name: 'Aztek' });
      const [cand] = defaultTemplates();
      const brouillon = fillTpl(cand.body, c, null, normalizeProfile({}), { trous: true });
      /* l'étudiant a écrit son accroche : elle doit survivre au profil */
      const ecrit = brouillon.replace(crochets(brouillon)[0].texte, 'Votre SOC managé pour les PME m’intéresse.');
      const apres = remplirTrous(ecrit, normalizeProfile({ name: 'Ana B', formation: 'BTS SIO' }));
      ok(apres.includes('Votre SOC managé pour les PME m’intéresse.'));
      ok(apres.includes('Je suis en BTS SIO et je cherche un stage.'));
      ok(apres.endsWith('Bien à vous,\nAna B'));
      eq(crochets(apres).length, 0);
      /* une valeur encore absente laisse son trou */
      const moitie = remplirTrous(ecrit, normalizeProfile({ name: 'Ana B' }));
      eq(crochets(moitie).map(x => x.texte).join(), '[' + TROUS.formation + ']');
      /* rien à remplir : le texte revient tel quel */
      eq(remplirTrous(ecrit, normalizeProfile({})), ecrit);
    },
    'modèles de départ : un modèle jamais retouché passe à la version du jour, un modèle retouché jamais': () => {
      const ancien = { id: 'a1', name: 'Candidature spontanée', subject: 'Candidature stage {{formation}} — {{moi}}',
        body: 'Bonjour {{contact}},\n\n[Une phrase précise sur ce qu\'ils font. Pas « votre entreprise m\'intéresse » — ils le lisent dix fois par jour.]\n\nJe suis en {{formation}} et je cherche un stage. Mon CV : {{cv}}\nJe peux passer en parler quand vous voulez.\n\nBien à vous,\n{{moi}} — {{tel}} — {{email}}' };
      const retouche = { ...ancien, id: 'a2', body: ancien.body.replace('Bonjour', 'Salut') };
      const [neuf, garde] = majModelesDefaut([ancien, retouche]);
      eq(neuf.id, 'a1');                               /* même modèle, même place */
      ok(neuf.body.includes('{{recherche}}'));
      eq(neuf.subject, 'Candidature {{type}} {{formation}} — {{moi}}');
      ok(garde === retouche);                           /* pas une virgule de changée */
      /* idempotent, et c'est normalizeProfile qui s'en charge au chargement */
      eq(JSON.stringify(majModelesDefaut([neuf])), JSON.stringify([neuf]));
      const p = normalizeProfile({ templates: [ancien, retouche] });
      ok(p.templates[0].body.includes('{{recherche}}'));
      eq(p.templates[1].body, retouche.body);
    },
    'sans filet : ne parle que quand RIEN ne rattraperait la perte': () => {
      const J = 86400000, now = Date.UTC(2027, 0, 31);
      const base = { pistes: 24, derniereCopie: 0, appareils: [], maintenant: now };
      ok(sansFilet(base));                                                   /* 24 pistes, rien ailleurs */
      ok(!sansFilet({ ...base, pistes: FILET_MIN_PISTES - 1 }));              /* trop peu pour s'inquiéter */
      ok(!sansFilet({ ...base, derniereCopie: now - 3 * J }));                /* une copie récente */
      ok(sansFilet({ ...base, derniereCopie: now - (FILET_JOURS + 1) * J })); /* une copie trop vieille */
      ok(!sansFilet({ ...base, appareils: [{ id: 'b', seen: now - 2 * J }] })); /* un appareil qui s'est montré */
      /* une phrase créée puis jamais retapée ailleurs ne relie rien */
      ok(sansFilet({ ...base, appareils: [{ id: 'b', seen: now - 90 * J }] }));
      ok(!sansFilet());                                                       /* sans rien : muet */
    },
    'recherche : une piste prend-elle ce que tu cherches ? oui, non — ou on ne sait pas': () => {
      const alt = { positions: ['alternance', 'cdi'] };
      eq(prendCeQueJeCherche(alt, 'alternance'), true);
      eq(prendCeQueJeCherche(alt, 'stage'), false);
      eq(prendCeQueJeCherche(alt, 'emploi'), true);                /* un CDI est un emploi */
      eq(prendCeQueJeCherche({ positions: [] }, 'stage'), null);   /* la piste ne dit rien */
      eq(prendCeQueJeCherche(alt, ''), null);                      /* on ne sait pas ce que TU cherches */
      ok(PREND_MOT.alternance && PREND_MOT.stage && PREND_MOT.emploi);
    },
    'effacer cet appareil : une seule liste, qui n’oublie pas les vieilles clés': () => {
      /* une base vide relit `oc_data_v2` au chargement : l'oublier ici
         ressuscitait des pistes d'avant la v3 sur un appareil « effacé » */
      ok(CLES_A_EFFACER.includes(OLD_V2) && CLES_A_EFFACER.includes(OLD_V1));
      for (const k of [DATA_KEY, PROFILE_KEY, JOURNAL_KEY, ORPHANS_KEY, TOMBS_KEY, SYNC_KEY,
                       RELAYS_KEY, TURN_KEY, DEVICE_KEY, DEVICES_KEY, PROMO_KEY, VAULT_KEY, ANALYSIS_KEY, VUS_KEY])
        ok(CLES_A_EFFACER.includes(k), k + ' doit partir');
      /* tout ce qui se scelle est une donnée : tout ce qui se scelle s'efface */
      for (const k of SEALABLE) ok(CLES_A_EFFACER.includes(k), k + ' (scellable) doit partir');
      ok(!CLES_A_EFFACER.includes(THEME_KEY));                       /* un réglage d'affichage reste */
    },
    'composeur : le modèle arrive pré-choisi d’après le statut de la piste': () => {
      const tpls = defaultTemplates();                    /* Candidature, Relance, Remerciement */
      eq(modeleConseille(tpls, { status: 'todo' }), 0);
      eq(modeleConseille(tpls, { status: 'active' }), 1);  /* on attend une réponse : on relance */
      eq(modeleConseille(tpls, { status: 'reply' }), 0);   /* une réponse ne décide rien : comme avant */
      /* un modèle renommé ne casse rien : on retombe sur le premier */
      eq(modeleConseille([{ name: 'Ma relance' }, { name: 'Autre' }], { status: 'active' }), 0);
      eq(modeleConseille([], null), 0);
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
    'filtres : plusieurs valeurs s’additionnent, les familles se croisent': () => {
      const list = [
        normalizeCompany({ name: 'Cyb', domain: 'cyber', status: 'todo' }),
        normalizeCompany({ name: 'Cloud', domain: 'cloud', status: 'active' }),
        normalizeCompany({ name: 'Esn', domain: 'esn', status: 'todo' })
      ];
      /* dans une famille : « cyber OU cloud » */
      eq(filterCompanies(list, { domain: ['cyber', 'cloud'], sort: 'az' }).map(c => c.name),
         ['Cloud', 'Cyb']);
      /* d'une famille à l'autre : « (cyber ou cloud) ET à contacter » */
      eq(filterCompanies(list, { domain: ['cyber', 'cloud'], status: ['todo'] }).map(c => c.name),
         ['Cyb']);
      /* un tableau VIDE ne filtre rien — c'est l'état de départ */
      eq(filterCompanies(list, { domain: [], status: [] }).length, 3);
      /* la forme historique, une chaîne, marche toujours */
      eq(filterCompanies(list, { domain: 'esn' }).map(c => c.name), ['Esn']);
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
    'anneau : seul le principal renomme — un nom changé ailleurs est refusé': async () => {
      eq(nomAppareil('  iPhone   de\tSam \n'), 'iPhone de Sam');
      eq(nomAppareil('x'.repeat(60)).length, 40);
      if (!(await edAvailable())) return;
      const kA = await makeDeviceKeys(), kB = await makeDeviceKeys();
      const rec = await recoveryKeys('x', 15000);
      let ring = await ringInit({ id: 'A', name: 'iPhone · Safari' }, kA.pub, kA.seed, rec.pub);
      ring = await ringAddDevice(ring, kA.seed, { id: 'B', name: 'iPhone · Safari', pub: kB.pub });
      const chezB = (await mergeRing(null, ring)).ring;
      /* le principal renomme B : signé, accepté par B, seq monté */
      const r2 = await ringRename(ring, kA.seed, 'A', 'B', 'iPhone de Léa');
      ok(await verifyRing(r2, kA.pub));
      eq(r2.seq, ring.seq + 1);
      const m = await mergeRing(chezB, r2);
      ok(m.changed);
      eq(deviceIn(m.ring, 'B').name, 'iPhone de Léa');
      /* B n'est pas le principal : refus explicite */
      try { await ringRename(chezB, kB.seed, 'B', 'B', 'Moi'); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'principal'); }
      /* un nom changé à la main, sans la signature du principal, ne passe pas */
      const falsifie = JSON.parse(JSON.stringify(r2));
      falsifie.devices.find(d => d.id === 'A').name = 'Usurpé';
      falsifie.seq += 1;
      ok(!(await mergeRing(m.ring, falsifie)).changed);
      /* nom vide refusé ; même nom = rien à re-signer */
      try { await ringRename(r2, kA.seed, 'A', 'B', '   '); throw new Error('accepté !'); }
      catch (e) { eq(e.message, 'vide'); }
      eq((await ringRename(r2, kA.seed, 'A', 'B', ' iPhone de Léa ')).seq, r2.seq);
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
    'missions Ordinateur : bornées, révocables, rapport replié sans doublon': () => {
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
    'missions Ordinateur : fil signé — vecteur figé, altération et expiration refusées': async () => {
      if (!(await edAvailable())) return;
      /* graine fixe 0..31 : la signature Ed25519 est DÉTERMINISTE — ce
         vecteur est vérifié à l'identique par le cœur Rust de l’ordinateur
         (natif/coeur). S'il casse, le format du fil a changé. */
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
    'ordinateur : code toléré à la saisie, clé du code = vecteur du cœur Rust': async () => {
      eq(normCode(' abcd 2345 '), 'ABCD-2345');
      eq(normCode('abcd-2345'), 'ABCD-2345');
      eq(normCode('AB'), 'AB');
      /* la dérivation (PBKDF2 « code: », 120 000 itér.) DOIT donner la
         même clé que natif/coeur (enveloppe.rs, vecteur figé) : on
         scelle avec la clé dérivée, on ouvre avec la clé brute du vecteur */
      const selB64 = btoa(String.fromCharCode(...Array.from({ length: 16 }, (_, i) => i)));
      const k = await pairKey('abcd2345', selB64);
      const env = await sealValue(k, 'canal', 'preuve');
      const raw = Uint8Array.from(atob('0zhUpHdF75HUrzrxzTIA1kwhXaMNsx8wJzed3TBbiwk='), c => c.charCodeAt(0));
      const kBrut = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
      eq(await openValue(kBrut, 'canal', env), 'preuve');
    },
    'ordinateur : distribution — le bon fichier pour le bon système': () => {
      /* le système d'après le navigateur ; un téléphone = « autre »,
         il ne télécharge pas, il apprend que ça se passe sur l’ordinateur */
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
        { name: 'OpenContact-Ordinateur-linux-x64.AppImage', url: 'u1' },
        { name: 'OpenContact-Ordinateur-linux-x64.deb', url: 'u2' },
        { name: 'OpenContact-Ordinateur-windows-x64-setup.exe', url: 'u3' },
        { name: 'OpenContact-Ordinateur-macos-universel.dmg', url: 'u4' }
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
      /* le texte reste lisible et STABLE : six lignes, toujours les
         mêmes — et AUCUN numéro de version, il ne distingue plus rien.
         La sixième est le TRANSPORT, ajoutée le 6 septembre 2026 : le
         rapport n'en disait rien, et c'est pourtant la seule panne
         qu'on ne peut pas voir à distance. */
      eq(txt.split('\n').length, 6);
      ok(/Transport : \d+ relais · \d+ joint\(s\) · \d+ qui porte\(nt\)/.test(txt));
      ok(txt.startsWith('Appareil : '));
      ok(!/\d+\.\d+\.\d+/.test(txt));
      ok(txt.includes('390×844') && txt.includes('2 piste(s)') && txt.includes('hors ligne'));
    },
    'diagnostic : une app vide se raconte quand même, sans mentir sur les poids': () => {
      /* le premier rapport d'un étudiant sera souvent celui-là : rien
         de saisi, un bug au démarrage. Il doit rester complet — et ne
         pas inventer « 1 Ko » de documents là où il n'y en a aucun. */
      const txt = diagnosticText(diagnosticData({ backend: 'memory' }));
      eq(txt.split('\n').length, 6);
      ok(txt.includes('mémoire (rien ne survit)'));
      /* sans transport connu, la ligne existe quand même et dit zéro :
         une ligne qui disparaît casse la comparaison entre rapports */
      ok(txt.includes('Transport : 0 relais · 0 joint(s) · 0 qui porte(nt)'));
      ok(txt.includes('Documents : 0 (0 Ko)'));
      ok(txt.includes('sans protection') && txt.includes('appareils non reliés'));
      ok(txt.includes('inconnu') && txt.includes('0×0'));
    },
    'diagnostic : les relais qui refusent ET ceux qui avalent se disent': () => {
      /* SANS ces nombres, le rapport disait « 9 relais · 9 joints ·
         9 qui répondent » pendant que la découverte était impossible —
         la fausse bonne nouvelle parfaite, et le lecteur cherchait la
         panne ailleurs. */
      const avec = diagnosticText(diagnosticData({
        relais: { total: 9, open: 9, vivants: 5, refus: 4 } }));
      ok(avec.includes('9 relais · 9 joint(s) · 5 qui porte(nt) · 4 qui refuse(nt) de relayer'));
      /* ET LE TROISIÈME ÉTAT, celui des deux téléphones : ouverts, ne
         refusant rien, et ne portant rien. « Il refuse » se répare en
         changeant de relais ; « il avale » demande de le re-mesurer.
         Deux gestes différents, donc deux mots différents. */
      const silence = diagnosticText(diagnosticData({
        relais: { total: 10, open: 10, vivants: 0, refus: 0, muets: 10 } }));
      ok(silence.includes('10 relais · 10 joint(s) · 0 qui porte(nt) · 10 qui avale(nt) en silence'));
      ok(!silence.includes('refuse'));
      /* mais rien à signaler ne s'écrit pas : l'encre va à ce qui change */
      const sans = diagnosticText(diagnosticData({
        relais: { total: 9, open: 9, vivants: 9, refus: 0, muets: 0 } }));
      ok(!sans.includes('refuse') && !sans.includes('avale'));
      /* et la ligne garde son compte : six lignes, toujours les mêmes */
      eq(avec.split('\n').length, 6);
      eq(sans.split('\n').length, 6);
      eq(silence.split('\n').length, 6);
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
    /* ---------- « j'y suis passé » ----------
       Mesuré dans les données 2025 : 3 % d'entretiens à froid, 40 % quand
       quelqu'un est dedans. C'est la seule chose qui change d'un ordre de
       grandeur, et rien n'en traversait le partage. */
    'vécu : vocabulaire fermé, et un nom qui ne déborde pas': () => {
      eq(normalizeCompany({ name: 'A', vecu: 'stage' }).vecu, 'stage');
      /* valeur inventée = champ absent, pas « autre » : on ne devine pas
         ce que quelqu'un a vécu */
      eq(normalizeCompany({ name: 'A', vecu: 'patron' }).vecu, undefined);
      eq(normalizeCompany({ name: 'A' }).vecu, undefined);
      /* pas de déclaration, pas de nom qui traîne */
      eq(normalizeCompany({ name: 'A', vecuQui: 'Léa' }).vecuQui, undefined);
      eq(normalizeCompany({ name: 'A', vecu: 'stage', vecuQui: '  Léa  ' }).vecuQui, 'Léa');
      /* un nom reçu finit dans une phrase à l'écran, pas dans un roman */
      eq(normalizeCompany({ name: 'A', vecu: 'stage', vecuQui: 'x'.repeat(200) }).vecuQui.length, 40);
    },
    'vécu : il voyage AVEC un prénom, et seulement s’il existe': () => {
      const c = normalizeCompany({ name: 'Adrastia', vecu: 'stage', status: 'reply', notes: 'privé' });
      const sans = normalizeCompany({ name: 'Ostral', status: 'reply', notes: 'privé' });
      const p = sharePayload([c, sans], null, 'Léa');
      eq(p.companies[0].vecu, 'stage');
      eq(p.companies[0].vecuQui, 'Léa');
      /* un partage sans déclaration reste ANONYME — le prénom ne part pas
         tout seul, c'est ce qui garde l'invariant ① intact */
      eq(p.companies[1].vecu, undefined);
      eq(p.companies[1].vecuQui, undefined);
      /* et le privé ne bouge pas d'un pouce */
      eq(p.companies[0].status, undefined);
      eq(p.companies[0].notes, undefined);
    },
    'vécu : la fusion garde le PLUS FORT, jamais le premier arrivé': () => {
      /* deux camarades, la même boîte : l'un y connaît quelqu'un, l'autre
         y a fait son alternance. C'est l'alternance qui ouvre la porte. */
      const mien = [normalizeCompany({ name: 'Adrastia', vecu: 'connait', vecuQui: 'Sam' })];
      mergeIncoming([{ name: 'Adrastia', vecu: 'alternance', vecuQui: 'Léa' }], mien);
      eq(mien[0].vecu, 'alternance');
      eq(mien[0].vecuQui, 'Léa');
      /* et l'inverse n'écrase rien : l'invariant ② tient dans les deux sens */
      mergeIncoming([{ name: 'Adrastia', vecu: 'entretien', vecuQui: 'Tom' }], mien);
      eq(mien[0].vecu, 'alternance');
      eq(mien[0].vecuQui, 'Léa');
      /* rien chez moi, quelque chose chez l'autre : je le prends */
      const vide = [normalizeCompany({ name: 'Ostral' })];
      mergeIncoming([{ name: 'Ostral', vecu: 'stage', vecuQui: 'Awa' }], vide);
      eq(vide[0].vecu, 'stage');
      eq(vide[0].vecuQui, 'Awa');
    },
    'vécu : l’ordre du vocabulaire est le contrat de tri': () => {
      const p = k => VECU[k].poids;
      ok(p('alternance') > p('stage') && p('stage') > p('entretien') && p('entretien') > p('connait'));
      eq(Object.keys(VECU).length, 4);
    },
    /* Les pistes sans nouvelles : celles qu'on a contactées, qui n'ont
       pas répondu, et qu'on a laissées sans prochaine action. Le tri
       fait la moitié du travail — le reste tient dans QUI est exclu. */
    'aides : sans nouvelles — jamais les pistes qu’on n’a pas engagées': () => {
      const c = (id, o) => Object.assign({ id, name: id, status: 'active',
        history: [{ d: '2026-06-01', t: 'Statut → En cours' }] }, o);
      const l = silentPistes([
        c('engagee'),                                   /* 45 j de silence */
        c('jamais', { status: 'todo' }),                /* pas commencée : « Par où commencer » s'en occupe */
        c('planifiee', { nextAction: '2026-07-20' }),   /* elle a une suite prévue */
        c('close', { closedReason: 'rejected' }),       /* elle est finie */
        c('fraiche', { history: [{ d: '2026-07-12', t: 'x' }] })  /* 3 j : trop tôt pour dire quoi que ce soit */
      ], '2026-07-15');
      eq(l.map(x => x.id), ['engagee']);
    },
    /* CE QUI NE CIRCULE PAS ENCORE. « Échanger » racontait ce qui a
       circulé — un classeur. Ces deux lectures répondent à « qu'est-ce
       que je fais maintenant », et sans une donnée nouvelle : le
       journal note déjà quelles pistes sont entrées, de qui, et
       lesquelles sont sorties. */
    'aides : reçues et jamais reprises — qui compte, et à partir de quand': () => {
      const J = jour => Date.UTC(2026, 6, jour);
      const journal = [
        { t: J(1),  txt: 'Reçu de Léa : +3 piste(s)',    ids: ['dort', 'lancee', 'planif'] },
        { t: J(9),  txt: 'Reçu du groupe : +1 piste(s)', ids: ['fraiche'] },
        { t: J(5),  txt: 'Reçu de Awa : +1 piste(s)',    ids: ['dort'] },
        { t: J(2),  txt: 'Donné (QR) : 1 piste(s)',      ids: ['mienne'] }
      ];
      const c = (id, o) => Object.assign({ id, name: id, status: 'todo' }, o);
      const l = recuesDormantes([
        c('dort'),                                  /* reçue, jamais touchée */
        c('lancee', { status: 'active' }),          /* engagée : plus dormante */
        c('planif', { nextAction: '2026-07-20' }),  /* une suite est prévue */
        c('fraiche'),                               /* reçue il y a 6 j : trop tôt */
        c('mienne'),                                /* la tienne, jamais reçue */
        c('close', { closedReason: 'rejected' })
      ], journal, '2026-07-15');
      eq(l.map(x => x.id), ['dort']);
      /* le PREMIER donneur, pas le dernier : c'est lui qui te l'a mise
         dans les mains, et c'est à lui qu'on peut revenir en parler */
      eq(l[0].qui, 'Léa');
      eq(l[0].jours, 14);
      /* L'ORDRE fait le service rendu : ce à quoi on peut écrire TOUT
         DE SUITE passe devant, puis les mieux remplies. Douze pistes
         reçues le même jour ont le même âge — l'ancienneté ne trie rien
         et ne vient qu'en dernier. */
      const w = (id, o) => Object.assign({ id, name: id, status: 'todo' }, o);
      const meme = [{ t: J(1), txt: 'Reçu de Léa : +3 piste(s)', ids: ['nue', 'deux', 'mail'] }];
      const tri = recuesDormantes([
        w('nue'),
        w('deux', { contacts: [{ name: 'A' }, { name: 'B' }] }),
        w('mail', { contacts: [{ name: 'C', email: 'c@x.test' }] })
      ], meme, '2026-07-15');
      eq(tri.map(x => x.id), ['mail', 'deux', 'nue']);
      /* le seuil est celui du silence, pas un second chiffre à défendre */
      eq(recuesDormantes([c('fraiche')],
        [{ t: J(9), txt: 'Reçu du groupe : +1 piste(s)', ids: ['fraiche'] }],
        new Date(J(9 + SILENCE_RELANCE)).toISOString().slice(0, 10)).length, 1);
      eq(recuesDormantes([c('fraiche')],
        [{ t: J(9), txt: 'Reçu du groupe : +1 piste(s)', ids: ['fraiche'] }],
        new Date(J(9 + SILENCE_RELANCE - 1)).toISOString().slice(0, 10)).length, 0);
    },
    'aides : jamais données — muet tant qu’on n’a jamais donné': () => {
      const c = (id, o) => Object.assign({ id, name: id, status: 'todo', updatedAt: 1 }, o);
      const pistes = [c('a', { updatedAt: 3 }), c('b', { updatedAt: 9 }),
                      c('close', { closedReason: 'won' }), c('demo', { demo: true })];
      /* aucun don encore : le grand bouton « Donner » dit déjà tout, et
         lister toutes ses pistes ne serait pas un conseil mais un
         inventaire */
      eq(jamaisDonnees(pistes, [{ t: 1, txt: 'Reçu du groupe : +1 piste(s)', ids: ['a'] }]), []);
      /* dès qu'on a donné une fois, le reste devient une vraie question */
      const l = jamaisDonnees(pistes, [{ t: 1, txt: 'Donné (QR) : 1 piste(s)', ids: ['a'] }]);
      eq(l.map(x => x.id), ['b']);                 /* ni « a » donnée, ni close, ni demo */
    },
    'aides : sans nouvelles — trois crans, tirés des données de relance': () => {
      const a = j => silentPistes([{ id: 'x', name: 'X', status: 'active',
        history: [{ d: '2026-07-15', t: 'x' }] }],
        new Date(Date.UTC(2026, 6, 15 + j)).toISOString().slice(0, 10))[0];
      eq(a(SILENCE_RELANCE - 1), undefined);                   /* muet avant 7 j */
      eq(a(SILENCE_RELANCE).cran, 'soon');                     /* première relance */
      eq(a(SILENCE_DERNIERE - 1).cran, 'soon');
      eq(a(SILENCE_DERNIERE).cran, 'now');                     /* dernière relance */
      eq(a(SILENCE_TROP_TARD - 1).cran, 'now');
      eq(a(SILENCE_TROP_TARD).cran, 'late');
      /* le geste change AVEC le cran : passé le dernier seuil, relancer
         ne paie plus — l'app propose la sortie, pas une 3ᵉ relance.
         C'est ce qui empêche la pile de grandir sans fin. */
      eq(a(SILENCE_RELANCE).geste, 'relancer');
      eq(a(SILENCE_TROP_TARD).geste, 'clore');
    },
    'aides : sans nouvelles — le plus long d’abord, une réponse pèse plus': () => {
      const c = (id, jour, status) => ({ id, name: id, status,
        history: [{ d: jour, t: 'x' }] });
      const l = silentPistes([
        c('vieux', '2026-06-01', 'active'),
        c('recent', '2026-07-01', 'active'),
        c('recent-repondu', '2026-07-01', 'reply')
      ], '2026-07-20');
      eq(l.map(x => x.id), ['vieux', 'recent-repondu', 'recent']);
    },
    /* `updatedAt` seul mentirait : corriger une faute dans le nom d'une
       piste le remet à jour et effacerait trois semaines de silence. */
    'aides : la dernière trace vient de l’historique, pas d’updatedAt': () => {
      const c = { id: 'x', name: 'X', status: 'active',
        history: [{ d: '2026-06-01', t: 'Statut → En cours' }],
        updatedAt: Date.UTC(2026, 6, 14) };            /* « modifiée hier » */
      eq(derniereTrace(c, '2026-07-15'), 44);
      /* sans historique, on se rabat sur updatedAt — mieux que rien */
      eq(derniereTrace({ updatedAt: Date.UTC(2026, 6, 1) }, '2026-07-15'), 14);
      /* une date future (horloge de travers) ne crée pas de silence négatif */
      eq(derniereTrace({ history: [{ d: '2027-01-01', t: 'x' }] }, '2026-07-15'), 0);
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
      eq(fil.find(x => x.t === 45).enrichi, 1);            /* les complétées sont retenues */
      eq(fil.find(x => x.t === 30).n, 12);
      /* UN ÉCHANGE QUI N'APPORTE RIEN DE NEUF A QUAND MÊME MARCHÉ.
         Le receveur avait déjà tout : `n` vaut 0, et c'est `enrichi`
         qui dit ce qui s'est passé. Sans lui la ligne rendait
         « 0 piste », ce qui se lit comme une panne — le défaut qui a
         fait conclure « le partage ne marche pas ». */
      const rien = exchangeLog([{ t: 5, txt: 'Reçu de Léa : +0 piste(s), 12 complétée(s)' }]);
      eq(rien.length, 1);
      eq(rien[0].n, 0);
      eq(rien[0].enrichi, 12);
      /* et une entrée d'AVANT ce champ reste lisible : elle ne rend
         pas NaN, elle rend 0 */
      const vieux = exchangeLog([{ t: 5, txt: 'Reçu du groupe : +3 piste(s)' }]);
      eq(vieux[0].n, 3);
      eq(vieux[0].enrichi, 0);
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
    /* LE MOT DU CANAL, ET LA COLONNE QU'IL TIENT.
       Deux choses se jouent ici, et la seconde est la plus chère :
       ① §7 — « QR rendez-vous » est un second mot pour ce que le
         lecteur a tapé sous le nom « QR » ;
       ② la LARGEUR — mesuré sur un vrai fil, « partage en groupe »
         poussait le compte à la ligne dès 360 px et faisait occuper
         au compte quatre abscisses différentes.
       Et la règle qui garde l'histoire : le JOURNAL n'est jamais
       réécrit. Une entrée d'avant ce lot garde son texte, se relit
       telle quelle, et c'est cette table — et elle seule — qui la dit
       court à l'écran. */
    'aides : canalCourt dit le canal avec le mot du bouton': () => {
      eq(canalCourt('partage en groupe'), 'groupe');
      eq(canalCourt('QR rendez-vous'), 'QR');
      eq(canalCourt('QR'), 'QR');
      eq(canalCourt('fichier'), 'fichier');
      /* l'adjectif reste : le cadenas est un fait du partage, et il
         tient dans la colonne — on ne raccourcit que ce qui déborde */
      eq(canalCourt('fichier chiffré'), 'fichier chiffré');
      /* la forme d'avant le renommage passe par la même porte */
      eq(canalCourt('partage promo'), 'groupe');
      /* UN CANAL QU'ON NE CONNAÎT PAS SE DIT TEL QUEL. C'est la même
         règle que `causeLiaison` : on se tait plutôt que d'inventer.
         Rendre '' effacerait la colonne d'une entrée légitime. */
      eq(canalCourt('pigeon voyageur'), 'pigeon voyageur');
      eq(canalCourt(''), '');
      eq(canalCourt(null), '');
      eq(canalCourt(undefined), '');
      /* et le fil s'en sert sans que le journal bouge d'un caractère */
      const fil = exchangeLog([
        { t: 1, txt: 'Donné (partage en groupe) : 7 piste(s)' },
        { t: 2, txt: 'Donné (QR rendez-vous) : 2 piste(s)' }
      ]);
      eq(fil.map(x => x.canal).join(','), 'QR rendez-vous,partage en groupe');
      eq(fil.map(x => canalCourt(x.canal)).join(','), 'QR,groupe');
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
      ok(AI_FAMILIES.chatgpt.channel === 'ordinateur' && !AI_FAMILIES.chatgpt.key);
      ok(AI_FAMILIES.ollama.channel === 'ordinateur' && !AI_FAMILIES.ollama.key);
      ok(AI_FAMILIES.openai.channel === 'ordinateur' && AI_FAMILIES.openai.key);
      const p = draftPrompt({ company: { name: 'OVHcloud', city: 'Roubaix' },
        contactName: 'Théo', profile: { name: 'Mahé', formation: 'BTS SIO' } });
      ok(/OVHcloud \(Roubaix\)/.test(p) && /Théo/.test(p) && /Mahé, BTS SIO/.test(p));
      ok(/120 mots max/.test(p));
      try { await aiComplete({ provider: 'openai', key: 'x' }, 'test'); throw new Error('parti !'); }
      catch (e) { eq(e.message, 'viaordinateur'); }
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
         « réponse », rapport de l’ordinateur : aucun des deux ne sait qui) */
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
