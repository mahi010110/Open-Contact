/* Rejouer le lot 4 de la maquette : Moi, le profil, les documents, la copie, les réglages.
   Usage : node design/maquettes/app/outils/jouer-lot4.mjs [dossier des captures]
   Il parcourt les gestes du lot au téléphone et à l’ordinateur, écrit ses captures,
   et finit par « ERREURS 0 » quand rien n’a cassé. */
import { mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer } from './maquette.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'lot4');
await mkdir(OUT, { recursive: true });
const { ouvrir: ouvrirM, fermer, etat } = await lancer();
const ouvrir = (w, h, sombre, mobile) => ouvrirM(w, h, sombre, mobile, { calme: true });
let echecs = 0;
const verifie = (nom, ok) => { if (!ok) echecs++; console.log((ok ? 'ok   ' : 'ÉCHEC') + ' ' + nom); };
const deb = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const T = '#tel ';
const petites = p => p.evaluate(() => [...document.querySelectorAll('#tel button, #tel a, #tel [role="button"], #tel label.champ, #tel .fld input, #tel summary, #tel label.fichier')]
  .filter(e => e.offsetParent && !e.classList.contains('lien-t') && !e.closest('.regie')).map(e => { const b = e.getBoundingClientRect(); return { t: (e.textContent || e.className).trim().slice(0, 28), w: Math.round(b.width), h: Math.round(b.height) }; })
  .filter(x => x.h < 44 || x.w < 44));
const vues = new Set();
const remplirChamp = async (p, sel, v) => { await p.fill(sel, v); await p.dispatchEvent(sel, 'change'); };
const annule = p => p.evaluate(() => { const a = document.querySelector('#tel .annule span'); return a ? a.textContent : ''; });
const nPistes = p => p.evaluate(() => { const b = document.querySelector('#tel .nav [data-id="pistes"] b'); return b ? +b.textContent : 0; });
{
  const { ctx, p } = await ouvrir(390, 844, false, true);
  const shot = async n => { (await petites(p)).forEach(x => vues.add(JSON.stringify(x))); await p.screenshot({ path: `${OUT}/t-${n}.png` }); };
  await p.click(T + '.nav [data-id="moi"]'); await shot('01-moi');
  verifie('Ma copie prévient : seulement sur cet appareil', (await p.textContent(T + '[data-v="copie"] .r-c span')).trim() === 'seulement sur cet appareil');
  await p.click(T + '[data-a="m-ouvrir"][data-v="profil"]'); await shot('02-profil');
  await remplirChamp(p, T + '.m-f[data-k="ecole"]', 'CFA du Nord');
  await remplirChamp(p, T + '.m-f[data-k="tel"]', '06 12 34 56 78');
  await p.click(T + '[data-a="m-rayon"][data-v="30"]');
  verifie('le rayon passe à 30 km', await p.$eval(T + '[data-a="m-rayon"][data-v="30"]', b => b.classList.contains('on')));
  await p.click(T + '[data-a="m-rayon"][data-v="15"]');
  await p.click(T + '[data-a="m-exp"]'); await p.waitForTimeout(150); await shot('03-experience');
  await p.fill(T + '.m-exp-e', 'Escaut Data'); await p.fill(T + '.m-exp-d', '2025'); await p.click(T + '[data-a="m-exp-ok"]');
  await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; }); await shot('04-profil-bas');
  // une expérience se rouvre, se modifie, se retire, et revient avec « Annuler »
  await p.click(T + '[data-a="m-exp-edit"][data-v="0"]'); await p.waitForTimeout(150);
  verifie('rouverte, l’expérience ne fait pas monter le clavier', await p.evaluate(() => !document.activeElement.matches('input,textarea')));
  await shot('04b-experience-modifier');
  await p.click(T + '[data-a="m-exp-retirer"]');
  verifie('retirée, « Annuler » la propose', (await annule(p)).includes('Escaut Data'));
  await p.click(T + '.annule button');
  verifie('« Annuler » la remet', (await p.textContent(T + '.gb')).includes('Escaut Data'));
  await p.click(T + '.nav [data-id="pistes"]'); await p.click(T + '.rang.l[data-id="nor"] .r-c'); await p.click(T + '.suite-b [data-a="ecrire"]'); await p.click(T + '[data-a="canal"][data-v="mail"]');
  const m = (await p.$eval(T + '.e-m', t => t.value)).replace(/ /g, ' ');
  ['Rythme : 2 jours', 'Expérience : Stage chez Escaut Data (2025)', 'CFA du Nord', '06 12 34 56 78'].forEach(x => verifie('le mail porte « ' + x + ' »', m.includes(x)));
  const o = await p.$eval(T + '.e-o', t => ({ v: t.value, h: t.getBoundingClientRect().height, sh: t.scrollHeight, ch: t.clientHeight }));
  verifie('l’objet se lit en entier (' + o.v + ')', o.sh <= o.ch + 2);
  await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = 420; }); await shot('05-mail-profil');
  await p.click(T + '.nav [data-id="moi"]'); await p.click(T + '[data-a="m-ouvrir"][data-v="docs"]'); await shot('06-docs');
  await p.setInputFiles(T + '.m-fichier[data-k="lm"]', { name: 'Lettre-Septentrion.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(64000) });
  await remplirChamp(p, T + '.m-f[data-k="lien"]', 'https://cv.exemple.fr/ines'); await shot('07-docs-ajout');
  verifie('« ajouté aujourd’hui »', (await p.textContent(T + '.s-page')).includes('ajouté aujourd’hui'));
  await p.click(T + '[data-a="retour"]'); await p.click(T + '[data-a="m-ouvrir"][data-v="modeles"]'); await shot('08-modeles');
  await p.click(T + '[data-a="m-ouvrir"][data-v="modele"][data-id="premier"]');
  verifie('« Rétablir » caché tant que rien ne change', await p.$eval(T + '.m-ret', d => d.hidden));
  await p.fill(T + '.m-tpl[data-p="o"]', 'Alternance {{formation}} — {{moi}}');
  verifie('le modèle touché montre « Rétablir »', !(await p.$eval(T + '.m-ret', d => d.hidden)));
  await p.dispatchEvent(T + '.m-tpl[data-p="o"]', 'change');
  await p.click(T + 'details.jetons summary'); await shot('09-modele');
  await p.click(T + '[data-a="m-tpl-retablir"]');
  verifie('rétabli, « Annuler » le propose', (await annule(p)).includes('rétabli'));
  await p.click(T + '.annule button');
  verifie('« Annuler » rend mon objet', (await p.$eval(T + '.m-tpl[data-p="o"]', t => t.value)).startsWith('Alternance'));
  await p.click(T + '[data-a="retour"]');
  verifie('la liste dit « modifié »', (await p.textContent(T + '[data-id="premier"]')).includes('modifié'));
  await p.click(T + '[data-a="retour"]');
  await p.click(T + '[data-a="m-ouvrir"][data-v="copie"]'); await shot('10-copie');
  // la ligne du mot de passe
  await p.click(T + '[data-a="m-verrou"]'); await p.waitForTimeout(100);
  verifie('le cadenas s’ouvre en champ', await p.evaluate(() => document.activeElement.matches('.lr-pass')));
  await p.click(T + '.lr-do'); await shot('10b-copie-chiffrer');
  verifie('sans mot de passe, l’erreur le dit', !(await p.$eval(T + '.m-err-v', e => e.hidden)));
  await p.fill(T + '.lr-pass', 'tournesol'); await p.click(T + '.lr-do');
  verifie('téléchargée, chiffrée', (await annule(p)).includes('chiffrée'));
  await p.click(T + '[data-a="m-ouvrir"][data-v="phrase"]'); await shot('11-phrase');
  await p.click(T + '[data-a="m-phrase-ok"]'); await shot('12-copie-ok');
  await p.click(T + '[data-a="m-ouvrir"][data-v="relier"]'); await shot('13-relier'); await p.click(T + '[data-a="m-relie"]');
  verifie('l’ordinateur est relié', (await p.textContent(T + '.s-page')).includes('Ordinateur'));
  await p.click(T + '[data-a="m-appareil"][data-v="1"]'); await p.waitForTimeout(150); await shot('13b-appareil');
  await p.click(T + '[data-a="m-appareil-retirer"]');
  verifie('retiré, « Annuler » le propose', (await annule(p)).includes('Ordinateur'));
  await p.click(T + '.annule button');
  // restaurer : par la phrase (tout est déjà là), puis par un fichier (deux pistes de plus)
  await p.click(T + '[data-a="m-restaurer"]'); await p.waitForTimeout(150); await shot('14-restaurer');
  await p.click(T + '[data-a="m-restaurer-phrase"]'); await p.fill(T + '.m-phrase', 'girafe cuivre lanterne'); await p.click(T + '[data-a="m-restaurer-ok"]'); await shot('15-phrase-courte');
  await p.click(T + '[data-a="m-phrase-coller"]'); await p.click(T + '[data-a="m-restaurer-ok"]'); await shot('16-apercu-phrase');
  verifie('la copie déposée : tout est déjà là', (await p.textContent(T + '.s-page')).includes('tout est déjà là'));
  await p.click(T + '[data-a="m-retour"]');
  await p.click(T + '[data-a="m-restaurer"]'); await p.waitForTimeout(150);
  await p.setInputFiles(T + '.m-fichier[data-k="copie"]', { name: 'opencontact-copie-2026-10-02.oc', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await p.waitForTimeout(150); await shot('16b-apercu-fichier');
  const avant = await nPistes(p);
  await p.click(T + '[data-a="m-restaurer-ajouter"]');
  verifie('deux pistes de plus (' + avant + ' → ' + (await nPistes(p)) + ')', (await nPistes(p)) === avant + 2);
  await shot('16c-restauree');
  await p.click(T + '.annule button');
  verifie('« Annuler » les retire', (await nPistes(p)) === avant);
  await p.click(T + '[data-a="retour"]'); console.log('Ma copie après :', (await p.textContent(T + '[data-v="copie"] .r-c span')).trim());
  await p.click(T + '[data-a="m-ouvrir"][data-v="reglages"]'); await shot('17-reglages');
  await p.click(T + '[data-a="m-theme-f"]'); await p.waitForTimeout(150);
  await p.click(T + '[data-a="m-theme"][data-v="sombre"]'); await shot('18-sombre');
  verifie('thème sombre appliqué, la coche a suivi', (await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark'
    && (await p.$eval(T + '[data-a="m-theme"][data-v="sombre"]', b => b.getAttribute('aria-checked'))) === 'true');
  await p.click(T + '[data-a="m-theme"][data-v="auto"]'); await p.click(T + '.sheet [data-a="fermer"]');
  verifie('la ligne dit « automatique »', (await p.textContent(T + '[data-a="m-theme-f"]')).includes('automatique'));
  await p.click(T + '[data-a="m-suivre-f"]'); await p.waitForTimeout(150); await p.click(T + '[data-a="m-suivre"][data-v="false"]'); await p.click(T + '.sheet [data-a="fermer"]');
  verifie('demandes gardées', (await p.textContent(T + '[data-a="m-suivre-f"]')).includes('gardées'));
  await p.click(T + '[data-a="m-code"]'); await p.waitForTimeout(150); await p.fill(T + '.m-code1', '123456'); await p.fill(T + '.m-code2', '123465'); await p.click(T + '[data-a="m-code-ok"]'); await shot('19-code-erreur');
  await p.fill(T + '.m-code2', '123456'); await p.click(T + '[data-a="m-code-ok"]'); await shot('20-code-ok');
  verifie('« protégé », sans toast', (await p.textContent(T + '[data-a="m-code"]')).includes('protégé') && !(await annule(p)));
  await p.click(T + '[data-a="m-installer"]'); await p.waitForTimeout(150); await shot('21-installer'); await p.click(T + '.sheet [data-a="fermer"]');
  await p.click(T + '[data-a="m-aide-page"]'); await shot('22-aide'); await p.click(T + '[data-a="retour"]');
  await p.click(T + '[data-a="m-effacer"]'); await p.waitForTimeout(150); await shot('23-effacer');
  await p.click(T + '[data-a="m-effacer-ok"]'); await p.waitForTimeout(200);
  verifie('après « Effacer », on repart du jour 1', await p.$eval('[data-jour="1"]', b => b.classList.contains('on')));
  await p.click(T + '.nav [data-id="moi"]'); await shot('24-j1-moi');
  // un téléphone neuf : la phrase ramène tout, « Annuler » le rend neuf
  await p.click(T + '[data-a="m-ouvrir"][data-v="copie"]'); await shot('25-j1-copie');
  await p.click(T + '[data-a="m-restaurer"]'); await p.waitForTimeout(150);
  await p.click(T + '[data-a="m-restaurer-phrase"]'); await p.click(T + '[data-a="m-phrase-coller"]'); await p.click(T + '[data-a="m-restaurer-ok"]'); await shot('26-j1-apercu');
  await p.click(T + '[data-a="m-tout-ramener"]'); await p.waitForTimeout(200); await shot('27-j1-tout-revenu');
  verifie('tout est revenu : jour 8, 8 pistes', (await p.$eval('[data-jour="8"]', b => b.classList.contains('on'))) && (await nPistes(p)) === 8);
  await p.click(T + '.annule button'); await p.waitForTimeout(200);
  verifie('« Annuler » le rend neuf', await p.$eval('[data-jour="1"]', b => b.classList.contains('on')));
  console.log('débordement horizontal', await deb(p));
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir(390, 844, true, true);
  await p.click(T + '.nav [data-id="moi"]'); await p.screenshot({ path: `${OUT}/t-30-sombre-moi.png` });
  await p.click(T + '[data-a="m-ouvrir"][data-v="copie"]'); await p.click(T + '[data-a="m-verrou"]'); await p.waitForTimeout(100); await p.screenshot({ path: `${OUT}/t-31-sombre-copie.png` });
  await ctx.close();
}
{
  const { ctx, p } = await ouvrir(360, 640, false, true);
  await p.click(T + '.nav [data-id="moi"]'); await p.screenshot({ path: `${OUT}/t-40-360-moi.png` });
  await p.click(T + '[data-a="m-ouvrir"][data-v="copie"]'); await p.screenshot({ path: `${OUT}/t-41-360-copie.png` });
  await p.click(T + '[data-a="m-verrou"]'); await p.waitForTimeout(100); await p.screenshot({ path: `${OUT}/t-42-360-chiffrer.png` });
  console.log('débordement en 360', await deb(p));
  await ctx.close();
}
for (const sombre of [false, true]){
  const { ctx, p } = await ouvrir(1440, 900, sombre);
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  await cadre.screenshot({ path: `${OUT}/p-moi${sombre ? '-sombre' : ''}.png` });
  if (!sombre){
    await p.click('#poste [data-a="m-ouvrir"][data-v="copie"]'); await cadre.screenshot({ path: `${OUT}/p-copie.png` });
    verifie('au poste, « Ma copie » s’allume à gauche', await p.$eval('#poste [data-v="copie"]', e => e.classList.contains('on')));
    await p.click('#poste [data-a="m-ouvrir"][data-v="phrase"]'); await p.click('#poste [data-a="m-phrase-ok"]');
    verifie('au poste, « Je l’ai notée » revient à Ma copie', (await p.textContent('#poste .rc2')).includes('Créée'));
    await p.click('#poste [data-a="m-ouvrir"][data-v="modeles"]'); await p.click('#poste [data-a="m-ouvrir"][data-v="modele"][data-id="relance"]');
    await cadre.screenshot({ path: `${OUT}/p-modele.png` });
  }
  console.log('débordement horizontal au poste', await deb(p));
  await ctx.close();
}
console.log('cibles sous 44 px au téléphone :', [...vues].join(' '));
console.log('ÉCHECS', echecs, '· ERREURS', etat.erreurs);
await fermer();
