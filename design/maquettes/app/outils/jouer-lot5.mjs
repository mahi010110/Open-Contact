/* Rejouer le lot 5 de la maquette : les états, le premier jour, le vide, les erreurs,
   le hors ligne, l'écran verrouillé.
   Usage : node design/maquettes/app/outils/jouer-lot5.mjs [dossier des captures]
   Il parcourt les gestes du lot au téléphone et à l'ordinateur, écrit ses captures,
   et finit par « ÉCHECS 0 · ERREURS 0 » quand rien n'a cassé. */
import { mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer, deborde } from './maquette.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'lot5');
await mkdir(OUT, { recursive: true });
const { ouvrir: ouvrirM, fermer, etat } = await lancer();
const ouvrir = (w, h, sombre, mobile) => ouvrirM(w, h, sombre, mobile, { calme: true });
let echecs = 0;
const verifie = (nom, ok) => { if (!ok) echecs++; console.log((ok ? 'ok   ' : 'ÉCHEC') + ' ' + nom); };
const T = '#tel ';
const petites = p => p.evaluate(() => [...document.querySelectorAll('#tel button, #tel a, #tel [role="button"], #tel label.champ, #tel .fld input, #tel summary, #tel label.fichier')]
  .filter(e => e.offsetParent && !e.classList.contains('lien-t') && !e.closest('.regie')).map(e => { const b = e.getBoundingClientRect(); return { t: (e.textContent || e.getAttribute('aria-label') || e.className).trim().slice(0, 28), w: Math.round(b.width), h: Math.round(b.height) }; })
  .filter(x => x.h < 44 || x.w < 44));
const vues = new Set();
const texte = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/ /g, ' ') : ''; }, sel);
const annule = p => texte(p, '#tel .annule span');
const nPistes = p => p.evaluate(() => { const b = document.querySelector('#tel .nav [data-id="pistes"] b'); return b ? +b.textContent : 0; });
const scene = async (p, s) => { await p.click('#scenes'); await p.click(`.r-menu [data-scene="${s}"]`); await p.waitForTimeout(150); };
const taper = async (p, pre, code) => { for (const c of code) await p.click(`#tel [data-a="${pre}-chiffre"][data-v="${c}"]`); };
const jour = async (p, j) => { await p.click(`[data-jour="${j}"]`); await p.waitForTimeout(150); };
{
  const { ctx, p } = await ouvrir(390, 844, false, true);
  const shot = async n => { (await petites(p)).forEach(x => vues.add(JSON.stringify(x))); await p.screenshot({ path: `${OUT}/t-${n}.png` }); };
  // ---------- le premier jour : retrouver ce qu'on avait ----------
  await jour(p, '1'); await shot('01-j1');
  verifie('« J’ai déjà OpenContact » sous les trois questions', (await texte(p, '#tel .deja')).includes('J’ai déjà OpenContact'));
  await p.click(T + '[data-a="e-retrouver"]'); await p.waitForTimeout(150); await shot('02-retrouver');
  await p.click(T + '[data-a="e-retrouver-phrase"]');
  await p.fill(T + '.m-phrase', 'girafe cuivre lanterne marée olive tambour prairie vitrail ruche balcon neige ancr'); await p.click(T + '[data-a="m-restaurer-ok"]');
  verifie('un mot inconnu se nomme', (await texte(p, '#tel .m-err')).includes('« ancr »')); await shot('03-mot-inconnu');
  await p.fill(T + '.m-phrase', 'cuivre girafe lanterne marée olive tambour prairie vitrail ruche balcon neige ancre'); await p.click(T + '[data-a="m-restaurer-ok"]');
  verifie('l’ordre faux se dit', (await texte(p, '#tel .m-err')).includes('ordre'));
  await p.click(T + '[data-a="m-phrase-coller"]'); await p.click(T + '[data-a="m-restaurer-ok"]'); await shot('04-tout-ramener');
  await p.click(T + '[data-a="m-tout-ramener"]'); await p.waitForTimeout(200);
  verifie('tout est revenu : 8 pistes', (await nPistes(p)) === 8);
  await p.click(T + '.annule button'); await p.waitForTimeout(200);
  verifie('« Annuler » rend le téléphone neuf', await p.$eval('[data-jour="1"]', b => b.classList.contains('on')));
  await p.click(T + '[data-a="e-retrouver"]'); await p.waitForTimeout(150);
  await p.setInputFiles(T + '.m-fichier[data-k="copie"]', { name: 'CV-Ines.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(900) });
  verifie('un fichier qui n’est pas une copie se dit', (await texte(p, '#tel .m-err-f')).includes('.oc')); await shot('05-mauvais-fichier');
  await p.click(T + '[data-a="e-retrouver-appareil"]'); await shot('06-autre-appareil');
  await p.click(T + '[data-a="e-relie-neuf"]'); await p.waitForTimeout(200);
  verifie('l’autre appareil ramène tout', (await nPistes(p)) === 8);
  // ---------- arriver par quelqu'un ----------
  await scene(p, 'lien'); await shot('07-lien-karim');
  verifie('le lien de Karim s’ouvre sur ses pistes', (await texte(p, '#tel .sheet')).includes('Karim te donne 3 pistes'));
  await p.click(T + '[data-a="e-cadeau-ok"]'); await p.waitForTimeout(150); await shot('08-trois-pistes');
  verifie('3 pistes, et « À faire » propose d’écrire', (await nPistes(p)) === 3 && (await p.$$(T + '.s-afaire .rang')).length === 3);
  await p.click(T + '.annule button');
  verifie('« Annuler » les retire', (await nPistes(p)) === 0);
  // ---------- l'annuaire en panne ----------
  await jour(p, '8'); await scene(p, 'panne'); await shot('09-panne');
  verifie('Trouver dit la panne', (await texte(p, '#tel .t-corps')).includes('L’annuaire ne répond pas'));
  await p.click(T + '.q'); await p.fill(T + '.q', 'cyber'); await p.waitForTimeout(150); await shot('10-panne-cherche');
  verifie('en panne, la recherche ne montre que mes pistes', (await texte(p, '#tel .t-corps')).includes('seules tes pistes se cherchent')
    && await p.$$eval(T + '.t-corps .rang.ent', r => r.length > 0 && r.every(x => x.textContent.includes('dans tes pistes'))));
  await p.click(T + '[data-a="fermer-r"]'); await p.click(T + '[data-a="e-reessayer"]'); await p.waitForTimeout(200);
  verifie('« Réessayer » ramène la liste', (await p.$$(T + '.s-liste .rang.ent')).length > 0);
  // ---------- hors ligne ----------
  await p.click('#horsligne'); await shot('11-hl-trouver');
  await p.click(T + '.nav [data-id="reseau"]'); await p.click(T + '[data-a="r-conv"][data-id="bts"]');
  await p.fill(T + '.m-in', 'Je passe au forum jeudi.'); await p.click(T + '[data-a="r-envoyer"]').catch(async () => { await p.press(T + '.m-in', 'Enter'); });
  await p.waitForTimeout(150); await shot('12-hl-message');
  verifie('le message n’est « pas encore parti »', (await texte(p, '#tel .fil-c')).includes('pas encore parti'));
  await p.click(T + '[data-a="retour"]'); await shot('13-hl-reseau');
  verifie('Réseau dit ce qui attend', (await texte(p, '#tel .hl-l')).includes('1 message partira'));
  await p.click(T + '.nav [data-id="pistes"]'); await p.click(T + '.rang.l[data-id="nor"] .r-c'); await p.click(T + '.suite-b [data-a="ecrire"]');
  await p.click(T + '[data-a="canal"][data-v="linkedin"]'); await shot('14-hl-linkedin');
  verifie('hors ligne, LinkedIn se copie', (await texte(p, '#tel .pied')).includes('Copier mon mot'));
  await p.click(T + '.nav [data-id="moi"]'); await p.click(T + '[data-a="m-ouvrir"][data-v="copie"]');
  await p.click(T + '[data-a="m-ouvrir"][data-v="phrase"]'); await p.click(T + '[data-a="m-phrase-ok"]'); await shot('15-hl-phrase');
  verifie('la copie partira avec le réseau', (await texte(p, '#tel .s-page')).includes('partira avec le réseau'));
  await p.click('#horsligne');
  verifie('le réseau revenu, la copie est déposée', (await texte(p, '#tel .s-page')).includes('copie déposée'));
  await p.click(T + '.nav [data-id="reseau"]');
  verifie('le réseau revenu, plus rien n’attend', !(await p.$(T + '.hl-l')));
  // ---------- choisir son code, puis verrouiller ----------
  await p.click(T + '.nav [data-id="moi"]'); await p.click(T + '[data-a="m-ouvrir"][data-v="reglages"]'); await p.click(T + '[data-a="m-code"]'); await p.waitForTimeout(150);
  await taper(p, 'c', '123456'); await shot('16-code-encore');
  await taper(p, 'c', '123465');
  verifie('deux codes différents : recommencer', (await texte(p, '#tel .c-err')).includes('pas les mêmes')); await shot('17-code-different');
  await taper(p, 'c', '246810'); await taper(p, 'c', '246810');
  verifie('le code choisi, l’app est protégée', (await texte(p, '#tel [data-a="m-code"]')).includes('protégé'));
  await p.click(T + '[data-a="m-code"]'); await p.waitForTimeout(150); await shot('18-code-protege');
  await p.click(T + '[data-a="v-maintenant"]'); await shot('19-verrouille');
  verifie('verrouillée, rien ne se voit derrière', await p.evaluate(() => document.querySelector('#tel .ecran').inert));
  await taper(p, 'v', '000000');
  verifie('un code faux se dit', (await texte(p, '#tel .v-err')).includes('Code faux')); await shot('20-code-faux');
  await taper(p, 'v', '246810');
  verifie('le bon code rouvre', !(await p.$(T + '.verrou')));
  // ---------- code oublié ----------
  await scene(p, 'verrou'); await p.click(T + '[data-a="v-oublie"]'); await shot('21-oublie');
  await p.click(T + '[data-a="v-coller"]'); await p.click(T + '[data-a="v-phrase-ok"]'); await shot('22-nouveau-code');
  await taper(p, 'v', '135790'); await taper(p, 'v', '135790');
  verifie('la phrase rouvre, et un nouveau code est pris', !(await p.$(T + '.verrou')));
  await scene(p, 'verrou'); for (let i = 0; i < 5; i++) await taper(p, 'v', '111111');
  verifie('cinq essais : il faut attendre', (await texte(p, '#tel .v-err')).includes('Trop d’essais') && await p.$eval(T + '.touche', b => b.disabled)); await shot('23-attendre');
  await p.click(T + '[data-a="v-oublie"]'); await p.click(T + '[data-a="v-effacer"]'); await shot('24-effacer');
  await p.click(T + '[data-a="v-effacer-ok"]'); await p.waitForTimeout(200);
  verifie('effacé, on repart du jour 1', await p.$eval('[data-jour="1"]', b => b.classList.contains('on')) && !(await p.$(T + '.verrou')));
  // ---------- hors ligne, le premier jour ----------
  await p.click('#horsligne');
  await p.click(T + '.puce:has-text("Alternance")'); await p.click(T + '.puce:has-text("BTS SIO SISR")'); await p.fill(T + '.f-ville', 'lille'); await p.click(T + '[data-a="voir"]'); await p.waitForTimeout(200);
  verifie('sans piste, pas de « Tes pistes restent là »', !(await texte(p, '#tel .t-corps')).includes('Tes pistes')); await shot('25-hl-j1');
  await p.click(T + '.nav [data-id="reseau"]'); await p.click(T + '[data-a="r-rejoindre"]'); await p.waitForTimeout(150);
  await p.fill(T + '.r-prenom', 'Inès').catch(() => {}); await p.click(T + '[data-a="r-scan-code"]'); await p.click(T + '[data-a="r-rejoindre-ok"]');
  verifie('hors ligne, rejoindre sa classe le dit', (await texte(p, '#tel .r-err-c')).includes('Pas de réseau')); await shot('26-hl-rejoindre');
  await p.click('#horsligne');
  console.log('débordement horizontal', await deborde(p));
  await ctx.close();
}
for (const [w, h, sombre] of [[390, 844, true], [360, 640, false]]){
  const { ctx, p } = await ouvrir(w, h, sombre, true);
  const n = `${w}${sombre ? '-sombre' : ''}`;
  await scene(p, 'verrou'); await p.screenshot({ path: `${OUT}/t-30-verrou-${n}.png` });
  await taper(p, 'v', '123456');
  await p.click(T + '.nav [data-id="moi"]'); await p.click(T + '[data-a="m-ouvrir"][data-v="reglages"]'); await p.click(T + '[data-a="m-code-off"]').catch(() => {});
  await p.click(T + '[data-a="m-code"]'); await p.waitForTimeout(150); await p.click(T + '[data-a="m-code-off"]'); await p.waitForTimeout(150);
  await p.click(T + '[data-a="m-code"]'); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/t-31-code-${n}.png` });
  await scene(p, 'lien'); await p.screenshot({ path: `${OUT}/t-32-lien-${n}.png` });
  console.log('débordement en ' + n, await deborde(p));
  await ctx.close();
}
for (const sombre of [false, true]){
  const { ctx, p } = await ouvrir(1440, 900, sombre);
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  const s = sombre ? '-sombre' : '';
  await scene(p, 'verrou'); await cadre.screenshot({ path: `${OUT}/p-verrou${s}.png` });
  if (!sombre){
    await p.keyboard.type('123456'); await p.waitForTimeout(150);
    verifie('au poste, le clavier rouvre l’app', !(await p.$('#poste .verrou')));
    await jour(p, '1'); await p.click('#poste .p-onglets [data-id="pistes"]'); await cadre.screenshot({ path: `${OUT}/p-j1-pistes.png` });
    verifie('au poste, zéro piste : une colonne', await p.$eval('#poste .pc2', e => getComputedStyle(e).display === 'none'));
    await p.click('#poste .p-onglets [data-id="reseau"]'); await cadre.screenshot({ path: `${OUT}/p-j1-reseau.png` });
    await p.click('#poste .p-onglets [data-id="trouver"]'); await cadre.screenshot({ path: `${OUT}/p-j1-trouver.png` });
    await jour(p, '8'); await p.click('#horsligne'); await p.click('#poste .p-onglets [data-id="pistes"]'); await cadre.screenshot({ path: `${OUT}/p-hl-pistes.png` });
    verifie('au poste, la barre d’état dit « Hors ligne »', (await texte(p, '#poste .p-etat')).includes('Hors ligne'));
    await p.click('#horsligne');
    await scene(p, 'lien'); await cadre.screenshot({ path: `${OUT}/p-lien.png` });
  }
  console.log('débordement horizontal au poste', await deborde(p));
  await ctx.close();
}
console.log('cibles sous 44 px au téléphone :', [...vues].join(' '));
console.log('ÉCHECS', echecs, '· ERREURS', etat.erreurs);
await fermer();
