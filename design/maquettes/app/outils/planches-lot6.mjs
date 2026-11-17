/* Les planches du lot 6 (l'ordinateur, un poste de travail), telles que montrées au mainteneur.
   Usage : node design/maquettes/app/outils/planches-lot6.mjs [dossier]
   « Avant » vient de l'app actuelle (voir planches-lot4.mjs). */
import { mkdir, access } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer, ROOT } from './maquette.mjs';
import { planche } from './planche.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'planches-lot6');
const P = path.join(OUT, 'propres');
await mkdir(P, { recursive: true });
const AV = process.env.OC_AVANT || path.join(ROOT, 'tests/e2e/captures/audit/chromium');
const avant = n => path.join(AV, n + '.png');
try { await access(avant('10-capture--1280')); } catch (e) {
  console.log('Pas de captures de l’app actuelle dans ' + AV + ' : lancer OC_AUDIT_POSTE=1 node tests/e2e/audit-captures.mjs'); process.exit(1);
}
const OFFRE = 'Alternance – Technicien·ne systèmes et réseaux (H/F)\nRéseaux et Systèmes du Nord · Lille\n\nAlternance de 2 ans, à partir de septembre 2027.\nRythme : 3 semaines en entreprise, 1 semaine à l’école.\n\nTes missions\n- Installer et suivre les serveurs de nos clients (Linux, Windows Server)\n- Gérer leurs réseaux : pare-feu, VLAN, wifi\n- Répondre à leurs demandes d’assistance\n\nProfil : BTS SIO option SISR, ou équivalent.\n\nCandidatures avant le 15 décembre 2026, auprès de Thomas Leroy, responsable technique : t.leroy@rsn-lille.fr';
const REPONSE = 'Vauban Infra ; Pierre Lambert ; p.lambert@vauban-infra.fr ; écrit ; 30/10/2026\nCitadelle Réseaux ; ; ; écrit ; 04/11/2026\nEscaut Data ; Romain Petit ; r.petit@escaut-data.fr ; réponse ; 13/11/2026\nAdvens ; Camille Roussel ; c.roussel@advens.fr ; écrit ; 28/10/2026\n ; Nadia Rahmani ; nadia.rahmani@gmail.com ; écrit ; 05/11/2026';
const coller = (p, sel, txt) => p.evaluate(([s, t]) => { const dt = new DataTransfer(); dt.setData('text/plain', t);
  (s ? document.querySelector(s) : document.body).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, [sel, txt]);
const { ouvrir, fermer, etat } = await lancer();
const T = '#tel ';
const bas = p => p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; });
{ const { ctx, p } = await ouvrir(390, 844, false, true, { calme: true });
  const img = async n => { await p.waitForTimeout(250); await p.screenshot({ path: path.join(P, n + '.png') }); };
  await p.click(T + '.nav [data-id="trouver"]'); await p.click(T + '.q'); await coller(p, T + '.q', OFFRE); await img('t1-offre');
  await p.click(T + '.s-liste [data-a="ent"][data-id="rsn"]'); await img('t2-page');
  await p.click(T + '.pied [data-a="garder"]'); await p.click(T + '.pied [data-a="ecrire"]'); await img('t3-message');
  await p.click(T + '[data-a="retour"]'); await p.click(T + '.nav [data-id="pistes"]'); await bas(p); await p.click(T + '[data-a="x-mails"]'); await img('t4-mails');
  await p.click(T + '[data-a="x-coller"]'); await p.click(T + '[data-a="x-lire"]'); await img('t5-apercu');
  await p.click(T + '[data-a="x-ajouter"]'); await p.waitForTimeout(6200); await bas(p); await p.click(T + 'details[data-p="bac"] summary'); await bas(p); await img('t6-bac');
  await ctx.close(); }
{ const { ctx, p } = await ouvrir(1440, 900, false, false, { calme: true });
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded();
  const img = async n => { await p.waitForTimeout(250); await cadre.screenshot({ path: path.join(P, n + '.png') }); };
  await p.click('#poste .p-onglets [data-id="pistes"]'); await coller(p, null, OFFRE); await img('p1-offre');
  await p.keyboard.press('g'); await p.click('#poste .c2 .pied [data-a="ecrire"]'); await img('p2-message');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  await coller(p, null, REPONSE); await img('p3-mails');
  await p.click('#poste .sheet [data-a="fermer"]');
  await p.evaluate(() => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(186000)], 'CV-Ines-Martin-2027.pdf', { type: 'application/pdf' }));
    document.querySelector('#poste .p-corps').dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true })); });
  await img('p4-depot');
  await ctx.close(); }
await fermer();
const A = n => path.join(P, n + '.png');
await planche({ sortie: path.join(OUT, 'lot6-ordinateur.png'), poste: true, pile: true, titre: 'Lot 6 à l’ordinateur : un poste de travail',
  sousTitre: 'Avant : une fiche de 14 champs pour une piste, et le tableau. Après : on colle, on dépose, le clavier fait le reste.',
  avant: [[avant('10-capture--1280'), 'Ajouter une piste : 14 champs à remplir'], [avant('02-pistes--1280'), 'Mes pistes : le tableau à trois colonnes']],
  apres: [[A('p1-offre'), '1. Ctrl V n’importe où : l’app lit l’offre, l’entreprise va dans la barre'], [A('p2-message'), '2. G garde. Le message cite l’offre, ta phrase à écrire est sélectionnée'],
    [A('p3-mails'), '3. Depuis mes e-mails : la réponse de ton assistant, collée, puis l’aperçu'], [A('p4-depot'), '4. Dépose un fichier : ton CV va dans « CV et lettres »']] });
await planche({ sortie: path.join(OUT, 'lot6-telephone.png'), titre: 'Lot 6 au téléphone : coller une offre, depuis mes e-mails',
  sousTitre: 'À gauche l’app d’aujourd’hui. À droite la maquette : la même offre collée dans la barre de Trouver, puis le bas de Pistes.',
  avant: [[avant('10-capture--390'), 'Nouvelle piste, « Depuis mes e-mails » dessous'], [avant('24-rattacher--390'), 'Rattacher un contact']],
  apres: [[A('t1-offre'), '1. L’offre collée dans la barre'], [A('t2-page'), '2. L’offre sur la page de l’entreprise'], [A('t3-message'), '3. Le message cite l’offre'],
    [A('t4-mails'), '4. Depuis mes e-mails : trois gestes'], [A('t5-apercu'), '5. L’aperçu, puis « Annuler »'], [A('t6-bac'), '6. Le bac, seulement s’il contient quelqu’un']] });
console.log('planches dans ' + OUT + ' · ERREURS', etat.erreurs);
