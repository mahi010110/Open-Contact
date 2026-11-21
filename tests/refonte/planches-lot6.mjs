/* ============================================================
   OpenContact · la nouvelle interface · les planches du lot 6
   (le poste, un établi), telles que montrées au mainteneur.

   Usage : OC_AVANT=<captures de l'app actuelle> node tests/refonte/planches-lot6.mjs [dossier]
   (les captures : OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs)

   Joué comme tests/refonte/jouer-lot6.mjs, en haute définition et sans
   mouvement : une offre collée au téléphone, le clavier à l'ordinateur,
   déposer un fichier, « Depuis mes e-mails » et le bac « À rattacher ».
   ============================================================ */
import path from 'path';
import { access, mkdir } from 'fs/promises';
import { lancer } from './outils.mjs';
import { ROOT } from '../e2e/outils.mjs';
import { startLocalRelay } from '../e2e/relais-local.mjs';
import { planche } from '../../design/maquettes/app/outils/planche.mjs';

const relay = await startLocalRelay({ tls: true, garde: true });
const { OUT, ouvrir, fermer, etat } = await lancer('planches-lot6');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('10-capture--390')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const T = '.ecran ';
/* `barre` : garder la barre « Annuler » ; `main` : garder le focus (le clavier le montre) */
const img = async (p, n, { barre = false, main = false } = {}) => { await p.waitForTimeout(350);
  await p.evaluate(([b, m]) => { const c = document.querySelector('.couche-a'); if (c && !b) c.innerHTML = '';
    if (!m && document.activeElement && document.activeElement.blur) document.activeElement.blur(); }, [barre, main]);
  await p.screenshot({ path: path.join(P, n + '.png') }); };
const attendre = async (p, fn, ms = 15000) => { for (const fin = Date.now() + ms; Date.now() < fin; await p.waitForTimeout(150)) if (await p.evaluate(fn).catch(() => false)) return true; return false; };
const onglet = async (p, id) => { await p.click(`.onglets [data-id="${id}"]`); await p.waitForTimeout(350); };
const coller = (p, sel, texte) => p.evaluate(([sel, texte]) => {
  const el = sel ? document.querySelector(sel) : document.body;
  const dt = new DataTransfer(); dt.setData('text/plain', texte);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
}, [sel, texte]);
const INTERCEPTER = () => {
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]');
    if (a && /^(mailto|tel|sms):|^https?:/.test(a.getAttribute('href'))) e.preventDefault(); }, true);
  window.open = () => null;
};
const PDF = [...Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')];
const lu = p => attendre(p, () => /Lu dans l’offre/i.test(document.querySelector('.ecran').innerText));

const OFFRE = 'Alternance – Technicien·ne systèmes et réseaux (H/F)\nRéseaux et Systèmes du Nord · Lille\n\nAlternance de 2 ans, à partir de septembre 2027.\nRythme : 3 semaines en entreprise, 1 semaine à l’école.\n\nTes missions\n- Installer et suivre les serveurs de nos clients (Linux, Windows Server)\n- Gérer leurs réseaux : pare-feu, VLAN, wifi\n- Répondre à leurs demandes d’assistance\n\nProfil : BTS SIO option SISR, ou équivalent.\n\nCandidatures avant le 15 décembre 2026, auprès de Thomas Leroy, responsable technique : t.leroy@rsn-lille.fr';
const OFFRE_POSTE = 'Alternance – Administrateur·rice systèmes (H/F)\nCitadelle Réseaux · Lille\n\nAlternance de 2 ans, dès septembre 2027.\nRythme : 2 jours à l’école, 3 jours en entreprise.\n\nVos missions\n- Administrer les serveurs Windows et Linux\n- Superviser le réseau de nos clients\n- Rédiger la documentation\n\nPostulez avant le 10 janvier 2027 auprès de Karine Duhamel, présidente : k.duhamel@citadelle-reseaux.fr';
const REPONSE = 'Voici ce que j’ai trouvé dans tes e-mails :\n\n'
  + 'Nord Infogérance ; Marc Delattre ; m.delattre@nord-infogerance.fr ; écrit ; 12/11/2026\n'
  + 'Datagora ; Sophie Marchal ; sophie@datagora.fr ; réponse ; 18/11/2026\n'
  + 'Kiabi ; Lucie Petit ; lucie.petit@kiabi.test ; écrit ; 05/11/2026\n'
  + ' ; Paul Girard ; paul.girard@worldline.test ; écrit ; 03/11/2026\n'
  + 'Lys Informatique ; ; ; refus ; 14/11/2026';
const PISTES = [
  { id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1, contacts: [{ id: 'k1', name: 'Léa Roux', role: 'RH', email: 'lea.roux@kiabi.test' }] },
  { id: 'wor', name: 'Worldline', city: 'Seclin', status: 'todo', createdAt: 2 },
  { id: 'opa', name: 'Opale Systèmes', city: 'Lille', siren: '812000013', status: 'todo', createdAt: 3,
    contacts: [{ id: 'o1', name: 'Sandrine Lefebvre', role: 'présidente', email: 's.lefebvre@opale.test' }] }
];
const INES = { name: 'Inès Martin', formation: 'BTS SIO SISR', recherche: 'alternance', ville: 'Lille', rayon: 15, ecole: 'Lycée Baggio', updatedAt: Date.now() - 864e5 };
const tel = { mobile: true, echelle: 2, calme: true, relais: relay.url, presse: true };

/* ---------- une offre, au téléphone ---------- */
const A = await ouvrir(390, 844, { ...tel, adresse: '#/trouver', profil: INES, pistes: PISTES });
const ap = A.p;
await ap.evaluate(INTERCEPTER);
await ap.click(T + '.q'); await ap.waitForTimeout(300);
await coller(ap, T + '.q', OFFRE);
await lu(ap);
await img(ap, 'a1-collee');
await ap.click(T + '.r-c[data-a="ent"][data-id="812000001"]'); await ap.waitForTimeout(500);
await img(ap, 'a2-entreprise');
await ap.click(T + '.pied [data-a="garder"]'); await ap.waitForTimeout(500);
await onglet(ap, 'pistes');
await img(ap, 'a3-a-faire');
const rsn = await ap.evaluate(() => { const r = [...document.querySelectorAll('.ecran .r-c[data-a="piste"]')].find(x => /Réseaux et Systèmes du Nord/.test(x.innerText)); return r ? r.getAttribute('data-id') : ''; });
await ap.click(T + `.r-c[data-a="piste"][data-id="${rsn}"]`); await ap.waitForTimeout(450);
await ap.click(T + 'details.pli[data-p="offre"] summary'); await ap.waitForTimeout(250);
await ap.evaluate(() => { const d = document.querySelector('.ecran details.pli[data-p="offre"]'); if (d) d.scrollIntoView({ block: 'start' }); });
await img(ap, 'a4-piste');
await ap.click(T + '[data-a="ecrire"]'); await ap.waitForTimeout(500);
await img(ap, 'a5-ecrire');
await A.ctx.close();
/* sans le nom de l'entreprise, puis sans réseau */
const B = await ouvrir(390, 844, { ...tel, adresse: '#/trouver', profil: INES, pistes: PISTES });
const bp = B.p;
await bp.click(T + '.q'); await bp.waitForTimeout(300);
await coller(bp, T + '.q', 'Stage – Assistant(e) administrateur réseau (F/H)\nStage de 6 mois dès janvier 2027, au sein de notre DSI.\nMissions\n- Superviser le réseau\n- Tenir à jour l’inventaire du parc\nContact : Julie Moreau, chargée de recrutement (julie.moreau@exemple.fr)');
await bp.waitForTimeout(400);
await img(bp, 'a6-sans-nom', { main: true });
await bp.click(T + '[data-a="fermer-r"]'); await bp.waitForTimeout(250);
await bp.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<span class="ic" style="position:absolute;left:-99px;mask-image:url(assets/icons/radio.svg);-webkit-mask-image:url(assets/icons/radio.svg)"></span>'));
await bp.waitForTimeout(300);
await B.ctx.setOffline(true);
await bp.click(T + '.q'); await bp.waitForTimeout(250);
await coller(bp, T + '.q', OFFRE_POSTE);
await bp.waitForTimeout(500);
await img(bp, 'a7-hors-ligne');
await B.ctx.close();

/* ---------- à l'ordinateur, le clavier d'abord ---------- */
const C = await ouvrir(1280, 800, { relais: relay.url, calme: true, presse: true, adresse: '#/pistes', profil: INES, pistes: PISTES });
const cp = C.p;
await cp.evaluate(INTERCEPTER);
await coller(cp, null, OFFRE_POSTE);
await lu(cp);
await img(cp, 'p1-offre');
await cp.keyboard.press('g'); await cp.waitForTimeout(450);
await cp.keyboard.press('p'); await cp.waitForTimeout(450);
await cp.keyboard.press('Enter'); await cp.waitForTimeout(500);
await img(cp, 'p2-crochet', { main: true });
await cp.keyboard.type('Votre travail pour les PME de la métropole me parle : je veux en être.');
await cp.keyboard.press('Control+Enter'); await cp.waitForTimeout(600);
await img(cp, 'p3-oui', { main: true });
await cp.keyboard.press('Enter'); await cp.waitForTimeout(500);
await img(cp, 'p4-suivante', { main: true });
/* déposer */
await cp.keyboard.press('t'); await cp.waitForTimeout(350);
await cp.evaluate(o => {
  const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(o)], 'CV Inès Martin.pdf', { type: 'application/pdf' }));
  document.querySelector('#oc .fen .ecran').dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
}, PDF);
await img(cp, 'p5-depose');
await cp.evaluate(o => {
  document.querySelector('#oc .fen').dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
  const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(o)], 'CV Inès Martin.pdf', { type: 'application/pdf' }));
  const c = document.querySelector('#oc .fen .ecran');
  for (const t of ['dragenter', 'dragover', 'drop']) c.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }));
}, PDF);
await attendre(cp, () => /CV Inès Martin/.test(document.querySelector('.ecran').innerText));
await img(cp, 'p6-cv', { barre: true });
const COPIE = JSON.stringify({ kind: 'full', v: 3, at: Date.now() - 864e5, companies: [{ id: 'kia', name: 'Kiabi', city: 'Hem', status: 'todo', createdAt: 1 },
  { id: 'dta', name: 'Datagora', city: 'Roubaix', status: 'todo', createdAt: 5 }], profile: { name: 'Inès Martin' } });
await cp.evaluate(c => {
  const dt = new DataTransfer(); dt.items.add(new File([c], 'opencontact-copie-2026-11-20.oc', { type: '' }));
  const e = document.querySelector('#oc .fen .ecran');
  for (const t of ['dragenter', 'dragover', 'drop']) e.dispatchEvent(new DragEvent(t, { dataTransfer: dt, bubbles: true, cancelable: true }));
}, COPIE);
await attendre(cp, () => /Datagora/.test(document.querySelector('.ecran').innerText));
await img(cp, 'p7-copie');
/* la réponse de son assistant, collée n'importe où */
await coller(cp, null, REPONSE);
await attendre(cp, () => /Dans sa réponse/i.test(document.querySelector('.couche-f').innerText));
await img(cp, 'p8-emails');
await C.ctx.close();

/* ---------- « Depuis mes e-mails » et le bac, au téléphone ---------- */
const E = await ouvrir(390, 844, { ...tel, adresse: '#/pistes', profil: INES, pistes: PISTES });
const ep = E.p;
await img(ep, 'e1-pistes');
await ep.click(T + '[data-a="x-mails"]'); await ep.waitForSelector('.couche-f .x-pas');
await ep.click('.couche-f [data-a="x-consigne"]'); await ep.waitForTimeout(300);
await img(ep, 'e2-consigne');
await ep.fill('.couche-f .x-rep', REPONSE);
await ep.click('.couche-f [data-a="x-lire"]'); await ep.waitForTimeout(350);
await img(ep, 'e3-apercu');
await ep.click('.couche-f [data-a="x-ajouter"]'); await ep.waitForTimeout(500);
await img(ep, 'e4-ajoutees', { barre: true });
await ep.click(T + 'details.bac summary'); await ep.waitForTimeout(250);
await ep.evaluate(() => document.querySelector('.ecran details.bac').scrollIntoView({ block: 'center' }));
await img(ep, 'e5-bac');
await ep.click(T + '[data-a="x-rattacher"]'); await ep.waitForSelector('.couche-f .choix');
await img(ep, 'e6-rattacher');
await E.ctx.close();
await fermer();
relay.close();

const X = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot6-offre.png'), reelle: true,
  titre: 'Code, lot 6 au téléphone : coller une offre',
  sousTitre: 'Avant : on recopie l’offre à la main dans « Nouvelle piste ». Après : on la colle dans Trouver, l’app y lit l’entreprise, le poste, la date et la personne.',
  avant: [[avant('10-capture--390'), 'Nouvelle piste, à la main'], [avant('08-ecrire--390'), 'Écrire']],
  apres: [[X('a1-collee'), '1. Collée : l’entreprise est cherchée, l’offre attend'], [X('a2-entreprise'), '2. Ce que l’app a lu de l’offre'],
    [X('a3-a-faire'), '3. Gardée, avec la personne de l’offre'], [X('a4-piste'), '4. Sur la piste, tout le texte replié'],
    [X('a5-ecrire'), '5. Le message cite l’offre'], [X('a6-sans-nom'), '6. Sans entreprise lue : son nom'], [X('a7-hors-ligne'), '7. Sans réseau : elle attend']] });
await planche({ sortie: path.join(OUT, 'lot6-clavier.png'), poste: true, pile: true,
  titre: 'Code, lot 6 à l’ordinateur : le clavier d’abord',
  sousTitre: 'Ctrl V n’importe où, G garde, P, ↵ écrit (le crochet est choisi : on tape sa phrase), Ctrl ↵ envoie, ↵ « Oui, envoyé », ↵ « Suivante ».',
  avant: [[avant('02-pistes--1280'), 'Pistes'], [avant('08-ecrire--1280'), 'Écrire']],
  apres: [[X('p1-offre'), '1. Ctrl V : l’offre collée, l’entreprise choisie'], [X('p2-crochet'), '2. G, P, ↵ : le crochet choisi'],
    [X('p3-oui'), '3. Ctrl ↵ : Mail s’ouvre, « Oui, envoyé » a la main'], [X('p4-suivante'), '4. ↵ : « Suivante » a la main']] });
await planche({ sortie: path.join(OUT, 'lot6-deposer.png'), poste: true, pile: true,
  titre: 'Code, lot 6 à l’ordinateur : déposer un fichier, coller une réponse',
  sousTitre: 'La fenêtre dit où ira ce qu’on glisse. Un CV va dans « CV et lettres », une copie s’ouvre avec son aperçu, la réponse de son assistant aussi.',
  avant: [[avant('14-moi--1280'), 'Moi'], [avant('13-recevoir--1280'), 'Recevoir']],
  apres: [[X('p5-depose'), '1. Pendant qu’on glisse'], [X('p6-cv'), '2. Le CV, avec « Annuler »'],
    [X('p7-copie'), '3. Une copie : son aperçu'], [X('p8-emails'), '4. La réponse de l’assistant collée : l’aperçu']] });
await planche({ sortie: path.join(OUT, 'lot6-emails.png'), reelle: true,
  titre: 'Code, lot 6 au téléphone : « Depuis mes e-mails » et le bac',
  sousTitre: 'Trois gestes dans l’ordre : copier la consigne, la porter à son assistant, coller sa réponse. Puis l’aperçu, « Annuler ». Le bac ne paraît que s’il contient quelqu’un.',
  avant: [[avant('10-capture--390'), 'Le lien, dans Nouvelle piste'], [avant('24-rattacher--390'), 'Contacts à rattacher']],
  apres: [[X('e1-pistes'), '1. En bas de Pistes'], [X('e2-consigne'), '2. Trois gestes'], [X('e3-apercu'), '3. Ce que la réponse ajoute'],
    [X('e4-ajoutees'), '4. Ajoutées, déjà écrites'], [X('e5-bac'), '5. Le bac : la piste proposée'], [X('e6-rattacher'), '6. Rattacher']] });
console.log('planches dans ' + OUT + ' · ERREURS ' + etat.erreurs.length);
if (etat.erreurs.length) console.log(etat.erreurs.slice(0, 5).join('\n'));
