/* ============================================================
   OpenContact · la nouvelle interface · rejouer le lot 6
   (le poste, un établi ; docs/refonte-reprendre.md §8)

   Usage : node tests/refonte/jouer-lot6.mjs [dossier des captures]

   ① UNE OFFRE AU TÉLÉPHONE : collée dans la barre de Trouver, l'app y lit
     l'entreprise (dans la barre), le poste, le contrat, le rythme, la date
     et la personne ; l'offre attend en étiquette. « Garder » l'emporte :
     la personne de l'offre, « L'offre » sur la piste (tout le texte
     replié), « jusqu'au 15 déc. » dans « À faire », et le message cite
     l'offre, « Dans l'offre » au-dessus ;
   ② LA FUITE D'ABORD : l'offre ne part jamais dans un partage (le lien de
     « Donner » ne porte ni ses missions ni son texte) ;
   ③ DEUX FOIS, SANS NOM, HORS LIGNE, SUR UNE PISTE QU'ON A : pas de
     doublon ; sans entreprise lue, la barre demande son nom ; sans
     réseau, l'entreprise se reconnaît au retour ; une piste qu'on a
     reçoit l'offre (« Annuler » la retire) ;
   ④ AU POSTE, LE CLAVIER D'ABORD : Ctrl V hors d'un champ, G garde,
     P, ↓, ↵ ouvre pour écrire avec le crochet choisi, on tape sa phrase,
     Ctrl ↵ envoie (la touche se lit dans le bouton), ↵ « Oui, envoyé »,
     ↵ « Suivante » ; un lien de pistes collé ouvre son aperçu ;
   ⑤ DÉPOSER sur la fenêtre : elle dit où ira ce qu'on glisse ; un CV va
     dans « CV et lettres » (« Annuler »), un .docx se refuse en le
     disant, une copie .oc s'ouvre avec son aperçu, des pistes reçues dans
     « Recevoir », une offre en texte devient une piste, une photo se
     refuse ; verrouillée, l'app ne prend rien ;
   ⑥ DEPUIS MES E-MAILS : copier la consigne, coller la réponse, l'aperçu
     (neuves, contact de plus, sans entreprise), « Ajouter », « Annuler » ;
     les erreurs sous le champ ; au poste, la réponse collée n'importe où
     ouvre l'aperçu ;
   ⑦ LE BAC « À RATTACHER » : seulement s'il contient quelqu'un ; la piste
     que porte son e-mail est proposée ; rattacher, jeter, « Annuler » ;
   ⑧ 360 et 390, clair et sombre : rien ne déborde, les cibles font 44 px.
     Finit par « ÉCHECS 0 · ERREURS 0 ».
   ============================================================ */
import path from 'path';
import { lancer, deborde, petites, lireCle } from './outils.mjs';
import { startLocalRelay } from '../e2e/relais-local.mjs';
import { extraireOCQ, decodeOCQ, encodeOCQ, sharePayload, lienPistes } from '../../engine/exchange.js';
import { normalizeCompany } from '../../engine/model.js';
import { createVault, sealValue } from '../../engine/vault.js';
import { CONSIGNE_EMAILS } from '../../engine/emails.js';
import { nouvelleCle } from '../../engine/boite.js';

const relay = await startLocalRelay({ tls: true, garde: true });
const { OUT, ouvrir, verifier, fermer, etat, base } = await lancer('lot6');
const img = async (p, nom, barre = false) => { await p.waitForTimeout(300); if (!barre) await p.evaluate(() => { const c = document.querySelector('.couche-a'); if (c) c.innerHTML = ''; });
  await p.screenshot({ path: path.join(OUT, nom + '.png') }); };
const T = '.ecran ';
const attendre = async (p, fn, arg, ms = 12000) => {
  for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(150))
    if (await p.evaluate(fn, arg).catch(() => false)) return true;
  return false;
};
const lire = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/ /g, ' ').replace(/\s+/g, ' ') : ''; }, sel);
const tout = p => lire(p, '.ecran');
const feuille = p => lire(p, '.couche-f');
const barreA = p => lire(p, '.couche-a');
const onglet = async (p, id) => { await p.click(`.onglets [data-id="${id}"]`); await p.waitForTimeout(350); };
/* l'onglet re-tapé remonte à sa racine */
const racine = async (p, id) => { await onglet(p, id); if (await p.evaluate(() => !!document.querySelector('.ecran .retour, .ecran [data-a="retour"]'))) await onglet(p, id); };
/* coller, comme le ferait le système : un événement « paste » qui porte le texte */
const coller = (p, sel, texte) => p.evaluate(([sel, texte]) => {
  const el = sel ? document.querySelector(sel) : document.body;
  const dt = new DataTransfer(); dt.setData('text/plain', texte);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, [sel, texte]);
/* glisser un fichier (ou un texte) sur la fenêtre, puis le lâcher — ou pas */
const glisserSur = (p, quoi, lacher = true) => p.evaluate(([q, lacher]) => {
  const dt = new DataTransfer();
  if (q.texte) dt.setData('text/plain', q.texte);
  else dt.items.add(new File([q.octets ? new Uint8Array(q.octets) : q.contenu], q.nom, { type: q.type || '' }));
  const cible = document.querySelector('#oc .fen .ecran');
  const ev = t => cible.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }));
  ev('dragenter'); ev('dragover');
  const d = document.querySelector('.depot');
  const vu = d && !d.hidden ? d.innerText.replace(/\s+/g, ' ').trim() : '';
  if (lacher) ev('drop'); else ev('dragleave');
  return vu;
}, [quoi, lacher]);
const depotCache = p => p.evaluate(() => { const d = document.querySelector('.depot'); return !d || d.hidden; });
/* ce qui sort de l'app (un mail, un lien) se note, rien ne part */
const INTERCEPTER = () => {
  window.__ouverts = [];
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && /^(mailto|tel|sms):|^https?:/.test(a.getAttribute('href'))){ e.preventDefault(); window.__ouverts.push(a.href); }
  }, true);
  window.open = u => { window.__ouverts.push(String(u)); return null; };
};
const ouverts = p => p.evaluate(() => window.__ouverts || []);
const PDF = [...Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')];

const OFFRE = 'Alternance – Technicien·ne systèmes et réseaux (H/F)\nRéseaux et Systèmes du Nord · Lille\n\nAlternance de 2 ans, à partir de septembre 2027.\nRythme : 3 semaines en entreprise, 1 semaine à l’école.\n\nTes missions\n- Installer et suivre les serveurs de nos clients (Linux, Windows Server)\n- Gérer leurs réseaux : pare-feu, VLAN, wifi\n- Répondre à leurs demandes d’assistance\n\nProfil : BTS SIO option SISR, ou équivalent.\n\nCandidatures avant le 15 décembre 2026, auprès de Thomas Leroy, responsable technique : t.leroy@rsn-lille.fr';
const OFFRE_SANS = 'Stage – Assistant(e) administrateur réseau (F/H)\nStage de 6 mois dès janvier 2027, au sein de notre DSI.\nMissions\n- Superviser le réseau\n- Tenir à jour l’inventaire du parc\nContact : Julie Moreau, chargée de recrutement (julie.moreau@exemple.fr)';
const OFFRE_POSTE = 'Alternance – Administrateur·rice systèmes (H/F)\nCitadelle Réseaux · Lille\n\nAlternance de 2 ans, dès septembre 2027.\nRythme : 2 jours à l’école, 3 jours en entreprise.\n\nVos missions\n- Administrer les serveurs Windows et Linux\n- Superviser le réseau de nos clients\n- Rédiger la documentation\n\nPostulez avant le 10 janvier 2027 auprès de Karine Duhamel, présidente : k.duhamel@citadelle-reseaux.fr';
const REPONSE = 'Voici ce que j’ai trouvé dans tes e-mails :\n\n'
  + 'Nord Infogérance ; Marc Delattre ; m.delattre@nord-infogerance.fr ; écrit ; 12/11/2026\n'
  + 'Datagora ; Sophie Marchal ; sophie@datagora.fr ; réponse ; 18/11/2026\n'
  + 'Kiabi ; Lucie Petit ; lucie.petit@kiabi.test ; écrit ; 05/11/2026\n'
  + ' ; Paul Girard ; paul.girard@worldline.test ; écrit ; 03/11/2026\n'
  + 'Lys Informatique ; ; ; refus ; 14/11/2026\n\nDis-moi si tu veux plus de détails.';

const NOTE_PRIVEE = 'NOTE-TRES-PRIVEE';
const PISTES = [
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1, contacts: [{ id: 'k1', name: 'Léa Roux', role: 'RH', email: 'lea.roux@kiabi.test' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', createdAt: 2, notes: NOTE_PRIVEE },
  { id: 'opa', name: 'Opale Systèmes', city: 'Lille', siren: '812000013', status: 'todo', createdAt: 3,
    contacts: [{ id: 'o1', name: 'Sandrine Lefebvre', role: 'présidente', email: 's.lefebvre@opale.test' }] }
];
const INES = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15, ecole: 'Lycée Baggio', updatedAt: Date.now() - 864e5 };
/* un ami : Réseau a de quoi montrer « Donner des pistes » */
const AMI = { id: 'KarimKarimKarim01', nom: 'Karim Benali', cle: (await nouvelleCle()).pub, parcours: [{ entreprise: 'Thales', quoi: 'alternance', debut: '2025-09', fin: '' }] };
let t;

/* =================== ① UNE OFFRE AU TÉLÉPHONE =================== */
const A = await ouvrir(390, 844, { mobile: true, calme: true, presse: true, relais: relay.url, adresse: '#/trouver', profil: { ...INES, amis: [AMI] }, pistes: PISTES });
const ap = A.p;
await ap.evaluate(INTERCEPTER);
await ap.click(T + '.q');
await ap.waitForTimeout(300);
verifier(/Coller un lien ou une offre/.test(await tout(ap)), 'Trouver : la barre touchée propose « Coller un lien ou une offre »');
await img(ap, '01-tel-barre');
/* le presse-papier, par la ligne « Coller » */
await ap.evaluate(t => navigator.clipboard.writeText(t), OFFRE);
await ap.click(T + '[data-a="coller"]');
verifier(await attendre(ap, () => /Lu dans l’offre/i.test(document.querySelector('.ecran').innerText)), 'l’offre collée : l’entreprise lue se cherche (« Lu dans l’offre »)');
t = await tout(ap);
verifier(await ap.inputValue(T + '.q') === 'Réseaux et Systèmes du Nord', 'l’entreprise lue va dans la barre · ' + await ap.inputValue(T + '.q'));
verifier(/Offre : Technicien·ne systèmes et réseaux/.test(t) && await ap.isVisible(T + '.o-tags .etq-o'), 'l’offre attend en étiquette sous la barre');
verifier(/RÉSEAUX ET SYSTÈMES DU NORD|Réseaux et Systèmes du Nord/i.test(t), 'l’annuaire la reconnaît');
await img(ap, '02-tel-offre-collee');
await ap.click(T + '.r-c[data-a="ent"][data-id="812000001"]');
await ap.waitForTimeout(500);
t = await tout(ap);
verifier(/L’offre/i.test(t) && /Technicien·ne systèmes et réseaux/.test(t) && /Alternance, 2 ans, à partir de septembre 2027/.test(t)
  && /3 semaines en entreprise, 1 semaine à l’école/.test(t) && /15 décembre/.test(t), 'la page de l’entreprise : « L’offre » (poste, contrat, rythme, jusqu’au) · ' + t.slice(0, 200));
verifier(/Installer et suivre les serveurs/.test(t) && /Gérer leurs réseaux/.test(t), 'la page : les missions de l’offre');
verifier(/À qui écrire\s*TL\s*Thomas Leroy\s*responsable technique · dans l’offre/i.test(t) && !/Claire Durand/.test(t),
  '« À qui écrire » : la personne de l’offre, à la place du dirigeant');
await img(ap, '03-tel-entreprise-offre');
verifier(!(await deborde(ap)).length && !(await petites(ap)).length, '390 : la page avec son offre tient · ' + JSON.stringify(await petites(ap)));
await ap.click(T + '.pied [data-a="garder"]');
await ap.waitForTimeout(500);
let d = await lireCle(ap, 'oc_data_v3');
const rsn = d.find(c => /Réseaux et Systèmes du Nord/i.test(c.name));
verifier(rsn && rsn.offre && rsn.offre.poste === 'Technicien·ne systèmes et réseaux' && rsn.offre.avant === '2026-12-15' && /Candidatures avant/.test(rsn.offre.texte),
  'gardée : la piste emporte l’offre (poste, date, tout le texte)');
verifier(rsn && rsn.contacts.length === 1 && rsn.contacts[0].name === 'Thomas Leroy' && rsn.contacts[0].email === 't.leroy@rsn-lille.fr',
  'gardée : la personne de l’offre, à la place du dirigeant de l’annuaire · ' + JSON.stringify(rsn && rsn.contacts));
verifier(rsn && rsn.history[0].t === 'Gardée, avec son offre', 'gardée : l’historique le dit');
verifier(!(await ap.isVisible(T + '.o-tags')), 'gardée : l’étiquette part avec elle');
/* Pistes : « jusqu'au 15 déc. » dans « À faire », la date dans sa phrase */
await onglet(ap, 'pistes');
t = await tout(ap);
verifier(/Thomas Leroy · jusqu’au 15 déc\./.test(t), 'À faire : « Thomas Leroy · jusqu’au 15 déc. » · ' + t.slice(0, 300));
await img(ap, '04-tel-afaire');
await ap.click(T + `.r-c[data-a="piste"][data-id="${rsn.id}"]`);
await ap.waitForTimeout(450);
t = await tout(ap);
verifier(/L’offre court jusqu’au 15 décembre\./.test(t), 'la page de la piste : « L’offre court jusqu’au 15 décembre. »');
await ap.click(T + 'details.pli[data-p="offre"] summary');
await ap.waitForTimeout(250);
verifier(/Alternance, 2 ans/.test(await tout(ap)), 'la page de la piste : « L’offre » se déplie');
await ap.click(T + 'details.o-t summary');
await ap.waitForTimeout(250);
verifier(/Profil : BTS SIO option SISR/.test(await tout(ap)), '« Tout le texte » : l’offre entière, gardée');
await img(ap, '05-tel-piste-offre');
/* écrire : le message cite l'offre, « Dans l'offre » au-dessus */
await ap.click(T + '[data-a="ecrire"]');
await ap.waitForTimeout(500);
t = await tout(ap);
const msg = (await ap.inputValue(T + '.e-m')).replace(/[\u00a0\u202f]/g, ' ');
verifier(msg.includes('Je réponds à votre offre « Technicien·ne systèmes et réseaux ».'), 'le message cite l’offre · ' + msg.slice(0, 160));
verifier(/Dans l’offre/i.test(t) && /Installer et suivre les serveurs/.test(t), 'écrire : « Dans l’offre » posé au-dessus, pour l’accroche');
verifier(msg.indexOf('Je réponds à votre offre') < msg.indexOf('['), 'la citation précède le crochet de l’accroche');
await img(ap, '06-tel-ecrire-offre');
await ap.goBack(); await ap.waitForTimeout(300);
await ap.goBack(); await ap.waitForTimeout(300);

/* =================== ② LA FUITE D'ABORD =================== */
await onglet(ap, 'reseau');
await ap.click(T + '[data-a="r-donner"]'); await ap.waitForTimeout(400);
await ap.click(T + '[data-a="r-don-canal"][data-v="texte"]'); await ap.waitForTimeout(250);
await ap.click(T + '[data-a="r-don-ok"]'); await ap.waitForTimeout(600);
const envoye = await ap.evaluate(() => navigator.clipboard.readText());
const ocq = extraireOCQ(envoye);
const recu = ocq ? await decodeOCQ(ocq) : null;
const dit = JSON.stringify(recu || {});
verifier(recu && recu.companies.some(c => /Réseaux et Systèmes du Nord/i.test(c.name)) && /Thomas Leroy/.test(dit), 'Donner : la piste part, avec la personne à qui écrire');
verifier(recu && !/offre|Installer et suivre|Candidatures avant|semaines en entreprise|2026-12-15/.test(dit) && !dit.includes(NOTE_PRIVEE),
  'LA FUITE D’ABORD : ni l’offre, ni ses missions, ni son texte ne partent dans un partage');
await ap.goBack().catch(() => {}); await ap.waitForTimeout(300);

/* =================== ③ DEUX FOIS, SANS NOM, HORS LIGNE =================== */
await racine(ap, 'trouver');
await ap.click(T + '.q'); await ap.waitForTimeout(250);
await coller(ap, T + '.q', OFFRE);
await ap.waitForTimeout(500);
t = await tout(ap);
verifier(/Cette offre est déjà sur sa piste\./.test(t) && !(await ap.isVisible(T + '.o-tags')), 'collée deux fois : « déjà sur sa piste », pas d’étiquette');
d = await lireCle(ap, 'oc_data_v3');
verifier(d.length === 4, 'collée deux fois : pas de doublon · ' + d.length);
verifier(await ap.$$eval(T + '.r-c[data-a="ent"]', l => l.filter(x => /Réseaux et Systèmes du Nord/i.test(x.innerText)).length) === 1, 'une entreprise = une ligne : elle ne revient pas en double');
await img(ap, '07-tel-deja');
/* sans entreprise lue : la barre la demande */
await ap.click(T + '[data-a="fermer-r"]').catch(() => {}); await ap.waitForTimeout(250);
await ap.click(T + '.q'); await ap.waitForTimeout(250);
await coller(ap, T + '.q', OFFRE_SANS);
await ap.waitForTimeout(400);
const sansNom = await ap.evaluate(() => { const q = document.querySelector('.ecran .q'); return { v: q.value, ph: q.placeholder, focus: document.activeElement === q }; });
verifier(sansNom.v === '' && sansNom.ph === 'Le nom de l’entreprise' && sansNom.focus, 'sans entreprise lue : la barre vide demande son nom, le curseur y est · ' + JSON.stringify(sansNom));
t = await tout(ap);
verifier(/Offre : Assistant\(e\) administrateur réseau/.test(t), 'sans entreprise lue : l’offre attend quand même');
verifier(/Dans quelle entreprise \? Tape son nom\./.test(t) && !/Coller un lien ou une offre/.test(t), 'sans entreprise lue : « Dans quelle entreprise ? Tape son nom. », rien d’autre');
await img(ap, '08-tel-sans-nom');
await ap.keyboard.type('Opale');
verifier(await attendre(ap, () => /Opale Systèmes|OPALE SYSTÈMES/i.test(document.querySelector('.ecran').innerText)), 'son nom tapé : l’entreprise se trouve');
await ap.click(T + '.r-c[data-a="ent"]');
await ap.waitForTimeout(450);
t = await tout(ap);
verifier(/Ajouter l’offre à la piste/.test(t), 'une piste qu’on a déjà : « Ajouter l’offre à la piste » · ' + t.slice(0, 200));
await img(ap, '09-tel-ajouter-offre');
await ap.click(T + '.pied [data-a="o-ajouter"]');
await ap.waitForTimeout(400);
verifier(/Offre ajoutée à Opale Systèmes/.test(await barreA(ap)), 'l’offre ajoutée : « Annuler » la rattrape');
d = await lireCle(ap, 'oc_data_v3');
let opa = d.find(c => c.id === 'opa');
verifier(opa.offre && opa.offre.type === 'stage' && opa.contacts.some(c => c.name === 'Julie Moreau') && opa.contacts.some(c => c.name === 'Sandrine Lefebvre'),
  'l’offre ajoutée : la personne de l’offre s’ajoute, celle qu’on avait reste');
await ap.click('.couche-a [data-a="annuler"], .couche-a button');
await ap.waitForTimeout(400);
d = await lireCle(ap, 'oc_data_v3');
opa = d.find(c => c.id === 'opa');
verifier(!opa.offre && opa.contacts.length === 1, '« Annuler » : la piste revient comme avant');
/* hors ligne : l'entreprise se reconnaîtra au retour du réseau */
await racine(ap, 'trouver');
await ap.click(T + '[data-a="fermer-r"]').catch(() => {}); await ap.waitForTimeout(250);
await ap.evaluate(() => fetch('assets/icons/radio.svg').then(r => r.text()));
await ap.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<span class="ic" style="position:absolute;left:-99px;mask-image:url(assets/icons/radio.svg);-webkit-mask-image:url(assets/icons/radio.svg)"></span>'));
await ap.waitForTimeout(200);
await A.ctx.setOffline(true);
await ap.click(T + '.q'); await ap.waitForTimeout(250);
await coller(ap, T + '.q', OFFRE_POSTE);
await ap.waitForTimeout(500);
t = await tout(ap);
verifier(/Pas de réseau : l’entreprise se reconnaîtra quand il revient\./.test(t), 'hors ligne : « l’entreprise se reconnaîtra quand il revient » · ' + t.slice(0, 200));
verifier(await ap.inputValue(T + '.q') === 'Citadelle Réseaux' && /Offre : Administrateur·rice systèmes/.test(t), 'hors ligne : l’offre se lit quand même, sans réseau');
await img(ap, '10-tel-hors-ligne');
await A.ctx.setOffline(false);
verifier(await attendre(ap, () => /Lu dans l’offre/i.test(document.querySelector('.ecran').innerText)), 'le réseau revient : l’entreprise se reconnaît');
await A.ctx.close();

/* =================== ④ AU POSTE, LE CLAVIER D'ABORD =================== */
const B = await ouvrir(1280, 800, { relais: relay.url, presse: true, adresse: '#/pistes', profil: INES, pistes: PISTES });
const bp = B.p;
await bp.evaluate(INTERCEPTER);
await img(bp, '11-poste-pistes');
await coller(bp, null, OFFRE_POSTE);
verifier(await attendre(bp, () => /Lu dans l’offre/i.test(document.querySelector('.ecran').innerText)), 'au poste, Ctrl V n’importe où : Trouver s’ouvre sur l’offre');
t = await tout(bp);
verifier(/Offre : Administrateur·rice systèmes/.test(t) && /L’offre/i.test(t) && /2 jours à l’école, 3 jours en entreprise/.test(t), 'au poste : l’étiquette, et l’offre dans la page de l’entreprise choisie');
verifier(await bp.evaluate(() => !!document.querySelector('.ecran .rang.ent.on')), 'au poste : la première entreprise est choisie');
await img(bp, '12-poste-offre');
await bp.keyboard.press('g');
await bp.waitForTimeout(450);
d = await lireCle(bp, 'oc_data_v3');
const cit = d.find(c => /Citadelle Réseaux/i.test(c.name));
verifier(cit && cit.offre && cit.contacts[0].name === 'Karine Duhamel', 'G : gardée avec son offre et sa personne');
await bp.keyboard.press('p');
await bp.waitForTimeout(450);
verifier(await bp.evaluate(() => location.hash.includes('pistes')), 'P : Pistes');
/* la piste qu'on vient de garder est celle que Pistes montre ; ↓ ↑ s'y promènent */
const choisie = () => bp.evaluate(() => { const on = document.querySelector('.ecran .pc1 .rang.l.on .r-c'); return on ? on.getAttribute('data-id') : ''; });
verifier(await choisie() === cit.id, 'P : la piste qu’on vient de garder est choisie · ' + await choisie());
await bp.keyboard.press('ArrowDown'); await bp.waitForTimeout(200);
const apres = await choisie();
await bp.keyboard.press('ArrowUp'); await bp.waitForTimeout(200);
verifier(apres && apres !== cit.id && await choisie() === cit.id, '↓ puis ↑ : la ligne d’après, puis celle-ci');
verifier(/↵\s*écrire/i.test(await lire(bp, '.p-etat')), 'la barre d’état annonce « ↵ écrire » · ' + await lire(bp, '.p-etat'));
await img(bp, '13-poste-choisie');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(500);
const crochet = await bp.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('e-m') ? a.value.slice(a.selectionStart, a.selectionEnd) : ''; });
verifier(/^\[Une phrase précise/.test(crochet) && /\]$/.test(crochet), '↵ : le message s’ouvre, le crochet choisi · ' + crochet.slice(0, 50));
verifier(/Ctrl ↵/.test(await lire(bp, T + '.pc3 .pied .btn.p')), 'la touche qui envoie se lit dans son bouton (« Ctrl ↵ »)');
const m4 = (await bp.inputValue(T + '.pc3 .e-m')).replace(/[\u00a0\u202f]/g, ' ');
verifier(m4.includes('Je réponds à votre offre « Administrateur·rice systèmes ».'), 'au poste aussi, le message cite l’offre');
await img(bp, '14-poste-crochet');
await bp.keyboard.type('Votre travail pour les PME de la métropole me parle : je veux en être.');
await bp.keyboard.press('Control+Enter');
await bp.waitForTimeout(600);
const sortis = await ouverts(bp);
verifier(sortis.some(u => u.startsWith('mailto:k.duhamel@citadelle-reseaux.fr') && decodeURIComponent(u).includes('je veux en être')), 'Ctrl ↵ : Mail s’ouvre avec le message écrit');
verifier(await bp.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-a') === 'envoye'), 'après l’envoi : « Oui, envoyé » a la main');
await img(bp, '15-poste-oui');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(500);
const suiv = await bp.evaluate(() => document.activeElement && document.activeElement.classList.contains('suivante') ? document.activeElement.innerText : '');
verifier(/Suivante/.test(suiv), '↵ : « Oui, envoyé », puis « Suivante » a la main · ' + suiv);
d = await lireCle(bp, 'oc_data_v3');
verifier(d.find(c => c.id === cit.id).status === 'active', '« Oui, envoyé » : la piste passe en attente');
await img(bp, '16-poste-suivante');
await bp.keyboard.press('Enter');
await bp.waitForTimeout(500);
const crochet2 = await bp.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('e-m') ? a.value.slice(a.selectionStart, a.selectionEnd) : ''; });
verifier(/^\[Une phrase précise/.test(crochet2), '↵ : « Suivante » ouvre le message d’après, le crochet choisi');
/* P, puis ↵ : hors d'un bouton (la page, ou son titre), le geste de la piste choisie */
await bp.keyboard.press('Escape').catch(() => {});
await bp.evaluate(() => document.activeElement && document.activeElement.blur());
await bp.keyboard.press('t'); await bp.waitForTimeout(300);
await bp.keyboard.press('p'); await bp.waitForTimeout(400);
const surTitre = await bp.evaluate(() => /^(H[1-4]|BODY)$/.test(document.activeElement.tagName));
await bp.keyboard.press('Enter'); await bp.waitForTimeout(500);
const crochet3 = await bp.evaluate(() => { const a = document.activeElement; return a && a.classList.contains('e-m') ? a.value.slice(a.selectionStart, a.selectionEnd) : ''; });
verifier(surTitre && /^\[Une phrase précise/.test(crochet3), 'P, puis ↵ : le message de la piste choisie, le crochet choisi · ' + surTitre + ' ' + crochet3.slice(0, 30));
/* un lien de pistes collé au poste : son aperçu */
const lien = lienPistes(base + '/refonte.html', await encodeOCQ([normalizeCompany({ name: 'Lomme Systèmes', city: 'Lomme' })]));
await bp.click(T + '.pc1 h2, .ecran h2').catch(() => {});
await bp.evaluate(() => document.activeElement && document.activeElement.blur());
await coller(bp, null, '1 piste pour toi sur OpenContact : ' + lien);
verifier(await attendre(bp, () => /On te donne/.test(document.querySelector('.couche-f').innerText)), 'un lien de pistes collé : « On te donne… », l’aperçu');
await bp.keyboard.press('Escape'); await bp.waitForTimeout(300);

/* =================== ⑤ DÉPOSER =================== */
await bp.keyboard.press('t'); await bp.waitForTimeout(300);
const vuPdf = await glisserSur(bp, { nom: 'CV Inès Martin.pdf', type: 'application/pdf', octets: PDF }, false);
verifier(/Dépose ici/.test(vuPdf) && /Ton CV ira dans « CV et lettres »\./.test(vuPdf), 'glisser un PDF : la fenêtre dit où il ira · ' + vuPdf);
verifier(await depotCache(bp), 'ressorti sans lâcher : la fenêtre redevient elle-même');
await bp.evaluate(() => { window.__dtPdf = null; });
/* la photo du dépôt, avant de lâcher */
await bp.evaluate(o => {
  const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(o)], 'CV Inès Martin.pdf', { type: 'application/pdf' }));
  document.querySelector('#oc .fen .ecran').dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
}, PDF);
await img(bp, '17-poste-depose');
await bp.evaluate(() => { const d = document.querySelector('.depot'); document.querySelector('#oc .fen').dispatchEvent(new DragEvent('dragleave', { bubbles: true })); });
verifier(await depotCache(bp), 'dragleave : le dépôt s’efface');
await glisserSur(bp, { nom: 'CV Inès Martin.pdf', type: 'application/pdf', octets: PDF });
verifier(await attendre(bp, () => /CV Inès Martin/.test(document.querySelector('.ecran').innerText)), 'lâché : le CV est dans « CV et lettres »');
verifier(/CV Inès Martin\.pdf ajouté/.test(await barreA(bp)), 'lâché : « Annuler » le rattrape');
await img(bp, '18-poste-cv-depose', true);
await bp.click('.couche-a button');
verifier(await attendre(bp, () => !/CV Inès Martin/.test(document.querySelector('.ecran').innerText)), '« Annuler » : le CV repart');
await glisserSur(bp, { nom: 'Lettre.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', contenu: 'PK' });
await bp.waitForTimeout(300);
verifier(/se garde en PDF/.test(await barreA(bp)), 'un .docx : refusé, en disant quoi faire');
/* une copie .oc */
const COPIE = JSON.stringify({ kind: 'full', v: 3, at: Date.now() - 864e5, companies: [{ id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1 },
  { id: 'dta', name: 'Datagora', city: 'Roubaix', status: 'todo', createdAt: 5 }], profile: { name: 'Inès Martin' } });
const vuCopie = await glisserSur(bp, { nom: 'opencontact-copie-2026-11-20.oc', type: '', contenu: COPIE });
verifier(/Une copie \.oc s’ouvre avec son aperçu\./.test(vuCopie), 'glisser une copie : « Une copie .oc s’ouvre avec son aperçu. »');
verifier(await attendre(bp, () => /Datagora/.test(document.querySelector('.ecran').innerText) && /Ajouter/.test(document.querySelector('.ecran').innerText)), 'lâchée : la copie s’ouvre avec son aperçu');
await img(bp, '19-poste-copie-deposee');
/* des pistes reçues, en fichier */
const PARTAGE = JSON.stringify(sharePayload([normalizeCompany({ name: 'Deûle Réseaux', city: 'Lambersart' })]));
await glisserSur(bp, { nom: 'pistes-de-karim.oc', type: '', contenu: PARTAGE });
verifier(await attendre(bp, () => location.hash.includes('reseau') && /Deûle Réseaux/.test(document.querySelector('.ecran').innerText)), 'des pistes reçues en fichier : l’aperçu de « Recevoir », dans Réseau');
await img(bp, '19b-poste-pistes-recues');
await bp.keyboard.press('t'); await bp.waitForTimeout(300);
/* une offre glissée en texte */
const vuTexte = await glisserSur(bp, { texte: OFFRE });
verifier(/L’app lit l’offre, et en fait une piste\./.test(vuTexte), 'glisser un texte : « L’app lit l’offre, et en fait une piste. »');
verifier(await attendre(bp, () => /Cette offre|Lu dans l’offre/i.test(document.querySelector('.ecran').innerText)), 'lâchée : l’offre se lit comme collée');
/* une photo : refusée en le disant */
await glisserSur(bp, { nom: 'photo.jpg', type: 'image/jpeg', contenu: 'pas une copie' });
await bp.waitForTimeout(300);
verifier(/reçoit ici une offre, une copie \.oc ou un CV/.test(await barreA(bp)), 'une photo : « L’app reçoit ici une offre, une copie .oc ou un CV. »');
await B.ctx.close();

/* =================== ⑥ DEPUIS MES E-MAILS =================== */
const E = await ouvrir(390, 844, { mobile: true, calme: true, presse: true, relais: relay.url, adresse: '#/pistes', profil: INES, pistes: PISTES });
const ep = E.p;
verifier(!(await ep.isVisible(T + 'details.bac')), 'le bac « À rattacher » n’existe pas quand il est vide');
await ep.click(T + '[data-a="x-mails"]');
await ep.waitForSelector('.couche-f .x-pas');
t = await feuille(ep);
verifier(/Depuis mes e-mails/i.test(t) && /Copier la consigne/.test(t) && /Colle-la dans ton assistant, avec tes e-mails\./.test(t) && /Colle sa réponse ici/.test(t),
  'Depuis mes e-mails : trois gestes, dans l’ordre où ils se font');
await img(ep, '20-tel-emails');
await ep.click('.couche-f [data-a="x-consigne"]');
await ep.waitForTimeout(300);
verifier(await ep.evaluate(() => navigator.clipboard.readText()) === CONSIGNE_EMAILS && /Consigne copiée/.test(await feuille(ep)), 'la consigne se copie, le bouton le dit');
await ep.click('.couche-f [data-a="x-lire"]');
await ep.waitForTimeout(250);
verifier(/Il manque la réponse de ton assistant\./.test(await feuille(ep)), 'rien de collé : l’erreur sous le champ');
await ep.fill('.couche-f .x-rep', 'Désolé, je ne peux pas lire tes e-mails.');
await ep.click('.couche-f [data-a="x-lire"]');
await ep.waitForTimeout(250);
verifier(/Aucune ligne ne se lit/.test(await feuille(ep)) && await ep.inputValue('.couche-f .x-rep') !== '', 'une réponse sans lignes : l’erreur, la saisie reste');
await img(ep, '21-tel-emails-erreur');
await ep.fill('.couche-f .x-rep', REPONSE);
await ep.click('.couche-f [data-a="x-lire"]');
await ep.waitForTimeout(350);
t = await feuille(ep);
verifier(/Dans sa réponse/i.test(t) && /Nord Infogérance\s*nouvelle · écrit le 12 nov\. · Marc Delattre/.test(t) && /Datagora\s*nouvelle · réponse le 18 nov\./.test(t)
  && /Kiabi\s*déjà dans tes pistes · Lucie Petit s’ajoute/.test(t) && /Paul Girard\s*sans entreprise · ira dans « À rattacher »/.test(t)
  && /Lys Informatique\s*nouvelle · refus le 14 nov\./.test(t), 'l’aperçu : neuves, un contact de plus, un sans entreprise · ' + t.slice(0, 420));
verifier(/Ajouter 3 pistes/.test(t), 'le pied : « Ajouter 3 pistes »');
await img(ep, '22-tel-emails-apercu');
verifier(!(await deborde(ep)).length && !(await petites(ep)).length, '390 : l’aperçu tient');
await ep.click('.couche-f [data-a="x-ajouter"]');
await ep.waitForTimeout(500);
d = await lireCle(ep, 'oc_data_v3');
const nor = d.find(c => c.name === 'Nord Infogérance'), dat = d.find(c => c.name === 'Datagora'), lys = d.find(c => c.name === 'Lys Informatique');
verifier(d.length === 6 && nor && nor.status === 'active' && nor.appliedAt === '2026-11-12' && nor.contacts[0].email === 'm.delattre@nord-infogerance.fr',
  'ajoutées : déjà écrites, datées, avec la personne · ' + d.length);
verifier(dat && dat.status === 'reply' && lys && lys.closedReason === 'rejected', 'ajoutées : la réponse et le refus suivent');
verifier(d.find(c => c.id === 'kia').contacts.length === 2, 'Kiabi : Lucie Petit s’ajoute, Léa Roux reste');
verifier(/3 pistes ajoutées/.test(await barreA(ep)), 'la barre « Annuler » dit ce qui a changé · ' + await barreA(ep));
await img(ep, '23-tel-emails-ajoutees', true);
/* ⑦ le bac */
t = await tout(ep);
verifier(/À rattacher · 1/i.test(t), 'le bac paraît : « À rattacher · 1 »');
await ep.click(T + 'details.bac summary');
await ep.waitForTimeout(250);
t = await tout(ep);
verifier(/Paul Girard\s*paul\.girard@worldline\.test · → Worldline \?/.test(t), 'le bac : la piste que porte son e-mail est proposée · ' + t.slice(-300));
await img(ep, '24-tel-bac');
await ep.click(T + '[data-a="x-rattacher"]');
await ep.waitForSelector('.couche-f .choix');
t = await feuille(ep);
verifier(/Rattacher/i.test(t) && /À quelle piste \?\s*Worldline\s*proposée/i.test(t), 'Rattacher : la piste proposée en premier · ' + t.slice(0, 200));
verifier(/Jeter ce contact/.test(t), 'Rattacher : « Jeter ce contact », rouge, en dernier');
await img(ep, '25-tel-rattacher');
await ep.click('.couche-f [data-a="x-rattacher-a"][data-id="wor"]');
await ep.waitForTimeout(450);
d = await lireCle(ep, 'oc_data_v3');
verifier(d.find(c => c.id === 'wor').contacts.some(c => c.name === 'Paul Girard') && !(await ep.isVisible(T + 'details.bac')), 'rattaché : Paul Girard sur Worldline, le bac disparaît');
verifier(/Contact rattaché à Worldline/.test(await barreA(ep)), 'rattaché : « Annuler »');
await ep.click('.couche-a button');
await ep.waitForTimeout(400);
verifier(await ep.isVisible(T + 'details.bac') && !(await lireCle(ep, 'oc_data_v3')).find(c => c.id === 'wor').contacts.length, '« Annuler » : Paul Girard revient au bac');
/* « Annuler » l'ajout entier : rien ne reste */
await ep.click(T + '[data-a="x-mails"]');
await ep.waitForSelector('.couche-f .x-pas');
await ep.fill('.couche-f .x-rep', 'Brasserie Numérique ; Nora Belkacem ; nora@brasserie.test ; écrit ; 10/11/2026');
await ep.click('.couche-f [data-a="x-lire"]'); await ep.waitForTimeout(250);
await ep.click('.couche-f [data-a="x-ajouter"]'); await ep.waitForTimeout(400);
await ep.click('.couche-a button'); await ep.waitForTimeout(400);
verifier(!(await lireCle(ep, 'oc_data_v3')).some(c => c.name === 'Brasserie Numérique'), '« Annuler » : l’ajout entier repart');
/* jeter un contact du bac, puis le reprendre */
if (await ep.evaluate(() => !document.querySelector('.ecran details.bac').open)) await ep.click(T + 'details.bac summary');
await ep.click(T + '[data-a="x-rattacher"]');
await ep.waitForSelector('.couche-f [data-a="x-jeter"]');
await ep.click('.couche-f [data-a="x-jeter"]'); await ep.waitForTimeout(400);
verifier(!(await ep.isVisible(T + 'details.bac')) && /Contact jeté/.test(await barreA(ep)), 'jeter : le bac se vide, « Annuler »');
await ep.click('.couche-a button'); await ep.waitForTimeout(350);
verifier(await ep.isVisible(T + 'details.bac'), '« Annuler » : il revient');
await E.ctx.close();
/* au poste : la réponse collée n'importe où ouvre l'aperçu */
const F = await ouvrir(1280, 800, { relais: relay.url, adresse: '#/moi', profil: INES, pistes: PISTES });
await coller(F.p, null, REPONSE);
verifier(await attendre(F.p, () => /Dans sa réponse/i.test(document.querySelector('.couche-f').innerText) && location.hash.includes('pistes')), 'au poste, la réponse collée n’importe où : l’aperçu, sur Pistes');
await img(F.p, '26-poste-emails');
await F.p.keyboard.press('Escape'); await F.p.waitForTimeout(250);
/* verrouillée : l'app ne prend rien */
await F.ctx.close();
const PH = 'abri ballon cadre domino ecole fumer gazon hiver invite jardin kayak lampe';
const { meta, key } = await createVault('280941', PH, { iter: 20000 });
const G = await ouvrir(1280, 800, { verrouille: true, relais: relay.url,
  cles: { oc_vault_v1: JSON.stringify(meta), oc_profile_v1: await sealValue(key, 'oc_profile_v1', JSON.stringify(INES)), oc_data_v3: await sealValue(key, 'oc_data_v3', JSON.stringify(PISTES)) } });
await coller(G.p, null, OFFRE);
await G.p.waitForTimeout(300);
const vuVerrou = await glisserSur(G.p, { texte: OFFRE });
verifier(!vuVerrou && !/Offre/.test(await lire(G.p, '.ecran')), 'verrouillée : ni le collage ni le dépôt ne passent');
/* verrouillée en route (« Verrouiller maintenant ») : la fenêtre, derrière, ne prend rien non plus */
await G.p.keyboard.type('280941');
verifier(await attendre(G.p, () => document.documentElement.classList.contains('pret') && !document.querySelector('.couche-v .verrou'), null, 25000), 'le code tapé : l’app s’ouvre');
await G.p.evaluate(() => import('/ecrans/verrou.js').then(m => m.verrouiller()));
await G.p.waitForSelector('.couche-v .verrou');
await coller(G.p, null, OFFRE);
await G.p.waitForTimeout(300);
const vuVerrou2 = await glisserSur(G.p, { texte: OFFRE });
verifier(!vuVerrou2 && !/Offre :/.test(await lire(G.p, '.ecran')), 'verrouillée en route : ni le collage ni le dépôt ne passent');
await G.ctx.close();

/* =================== ⑧ 360 et 390, clair et sombre =================== */
for (const [w, h, sombre] of [[390, 844, true], [360, 640, false], [360, 640, true]]){
  const X = await ouvrir(w, h, { mobile: true, calme: true, sombre, presse: true, relais: relay.url, adresse: '#/trouver', profil: INES, pistes: PISTES });
  const xp = X.p, nom = `${w}${sombre ? '-sombre' : ''}`;
  await xp.click(T + '.q'); await xp.waitForTimeout(250);
  await coller(xp, T + '.q', OFFRE);
  await attendre(xp, () => /Lu dans l’offre/i.test(document.querySelector('.ecran').innerText));
  verifier(!(await deborde(xp)).length && !(await petites(xp)).length, `${nom} : l’offre collée tient · ${JSON.stringify(await petites(xp))}`);
  await img(xp, '27-offre-' + nom);
  await xp.click(T + '.r-c[data-a="ent"][data-id="812000001"]'); await xp.waitForTimeout(450);
  verifier(!(await deborde(xp)).length && !(await petites(xp)).length, `${nom} : la page et son offre tiennent · ${JSON.stringify(await petites(xp))}`);
  await img(xp, '28-entreprise-' + nom);
  await onglet(xp, 'pistes');
  await xp.click(T + '[data-a="x-mails"]'); await xp.waitForSelector('.couche-f .x-pas');
  await xp.fill('.couche-f .x-rep', REPONSE);
  await xp.click('.couche-f [data-a="x-lire"]'); await xp.waitForTimeout(300);
  verifier(!(await deborde(xp)).length && !(await petites(xp)).length, `${nom} : l’aperçu des e-mails tient · ${JSON.stringify(await petites(xp))}`);
  await img(xp, '29-emails-' + nom);
  await xp.click('.couche-f [data-a="x-ajouter"]'); await xp.waitForTimeout(400);
  await xp.click(T + 'details.bac summary'); await xp.waitForTimeout(250);
  verifier(!(await deborde(xp)).length && !(await petites(xp)).length, `${nom} : le bac tient · ${JSON.stringify(await petites(xp))}`);
  await img(xp, '30-bac-' + nom);
  await X.ctx.close();
}
const Z = await ouvrir(1280, 800, { sombre: true, relais: relay.url, adresse: '#/trouver', profil: INES, pistes: PISTES });
await coller(Z.p, null, OFFRE_POSTE);
await attendre(Z.p, () => /Lu dans l’offre/i.test(document.querySelector('.ecran').innerText));
await img(Z.p, '31-poste-offre-sombre');
await Z.p.evaluate(o => {
  const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(o)], 'CV.pdf', { type: 'application/pdf' }));
  document.querySelector('#oc .fen .ecran').dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
}, PDF);
await img(Z.p, '32-poste-depose-sombre');
await Z.ctx.close();

await fermer();
relay.close();
console.log(`\nÉCHECS ${etat.echecs.length} · ERREURS ${etat.erreurs.length}`);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 8).join('\n'));
console.log('captures dans ' + OUT);
process.exit(etat.echecs.length || etat.erreurs.length ? 1 : 0);
