/* Rejouer le lot 6 de la maquette : l'ordinateur, un poste de travail.
   Coller une offre (au téléphone dans la barre de Trouver, à l'ordinateur n'importe où),
   le clavier d'abord, déposer un fichier sur la fenêtre.
   Usage : node design/maquettes/app/outils/jouer-lot6.mjs [dossier des captures]
   Il parcourt les gestes du lot au téléphone et à l'ordinateur, écrit ses captures,
   et finit par « ÉCHECS 0 · ERREURS 0 » quand rien n'a cassé. */
import { mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import { lancer, deborde } from './maquette.mjs';
const OUT = process.argv[2] || path.join(os.tmpdir(), 'oc-maquette', 'lot6');
await mkdir(OUT, { recursive: true });
const { ouvrir: ouvrirM, fermer, etat } = await lancer();
const ouvrir = (w, h, sombre, mobile) => ouvrirM(w, h, sombre, mobile, { calme: true });
let echecs = 0;
const verifie = (nom, ok) => { if (!ok) echecs++; console.log((ok ? 'ok   ' : 'ÉCHEC') + ' ' + nom); };
const T = '#tel ', P = '#poste ';
const petites = p => p.evaluate(() => [...document.querySelectorAll('#tel button, #tel a, #tel [role="button"], #tel label.champ, #tel .fld input, #tel summary, #tel label.fichier')]
  .filter(e => e.offsetParent && !e.classList.contains('lien-t') && !e.closest('.regie')).map(e => { const b = e.getBoundingClientRect(); return { t: (e.textContent || e.getAttribute('aria-label') || e.className).trim().slice(0, 28), w: Math.round(b.width), h: Math.round(b.height) }; })
  .filter(x => x.h < 44 || x.w < 44));
const vues = new Set();
const plat = s => String(s || '').replace(/[  ]/g, ' ');
const texte = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : ''; }, sel).then(plat);
const valeur = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.value : ''; }, sel).then(plat);
const nPistes = (p, ou) => p.evaluate(s => { const b = document.querySelector(s); return b ? +b.textContent : 0; }, ou + (ou === T ? '.nav' : '.p-onglets') + ' [data-id="pistes"] b');
const focus = p => p.evaluate(() => { const a = document.activeElement; return { c: a.className || '', t: (a.textContent || '').trim(), sel: a.value ? a.value.slice(a.selectionStart, a.selectionEnd) : '' }; });
const scene = async (p, s) => { await p.click('#scenes'); await p.click(`.r-menu [data-scene="${s}"]`); await p.waitForTimeout(150); };
const jour = async (p, j) => { await p.click(`[data-jour="${j}"]`); await p.waitForTimeout(150); };
/* coller comme le fait le système : un événement « paste » qui porte le texte, sur un champ ou hors d'un champ */
const coller = (p, sel, txt) => p.evaluate(([s, t]) => { const dt = new DataTransfer(); dt.setData('text/plain', t);
  (s ? document.querySelector(s) : document.body).dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, [sel, txt]);
/* glisser un fichier sur la fenêtre de l'ordinateur, puis le lâcher (ou pas) */
const glisser = (p, nom, type, taille, lacher) => p.evaluate(([n, ty, ta, l]) => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(ta)], n, { type: ty }));
  const c = document.querySelector('#poste .p-corps'); c.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
  if (l) c.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, [nom, type, taille, lacher]);
/* l'offre de la régie (OFFRE_RSN dans la maquette), telle qu'on la copie d'un site d'offres */
const OFFRE = 'Alternance – Technicien·ne systèmes et réseaux (H/F)\nRéseaux et Systèmes du Nord · Lille\n\nAlternance de 2 ans, à partir de septembre 2027.\nRythme : 3 semaines en entreprise, 1 semaine à l’école.\n\nTes missions\n- Installer et suivre les serveurs de nos clients (Linux, Windows Server)\n- Gérer leurs réseaux : pare-feu, VLAN, wifi\n- Répondre à leurs demandes d’assistance\n\nProfil : BTS SIO option SISR, ou équivalent.\n\nCandidatures avant le 15 décembre 2026, auprès de Thomas Leroy, responsable technique : t.leroy@rsn-lille.fr';
const SANS_NOM = 'Stage – Développeur web (H/F)\nUne PME lilloise recrute\n\nStage de 3 mois, à partir d’avril 2027.\n\nTes missions\n- Développer des sites\n- Corriger des bugs\n\nCandidatures avant le 10 janvier, contact : Julie Morel, j.morel@exemple.fr';

{ // ---------- au téléphone : l'offre entre par la barre de Trouver ----------
  const { ctx, p } = await ouvrir(390, 844, false, true);
  const shot = async n => { (await petites(p)).forEach(x => vues.add(JSON.stringify(x))); await p.screenshot({ path: `${OUT}/t-${n}.png` }); };
  await p.click(T + '.nav [data-id="trouver"]');
  verifie('retouche : « Voir la suivante » quand il n’en reste qu’une', (await texte(p, T + '.suite-l')).includes('Voir la suivante'));
  await p.click(T + '.q'); await shot('01-barre');
  verifie('la barre propose de coller une offre', (await texte(p, T + '[data-a="coller"]')).includes('Coller un lien ou une offre'));
  await coller(p, T + '.q', OFFRE); await p.waitForTimeout(150); await shot('02-offre-collee');
  verifie('l’entreprise lue va dans la barre', (await valeur(p, T + '.q')) === 'Réseaux et Systèmes du Nord');
  verifie('l’offre attend en étiquette', (await texte(p, T + '.etq-o')).includes('Offre : Technicien·ne systèmes et réseaux'));
  verifie('le clavier se range : le geste suivant est « Garder »', await p.evaluate(() => !document.activeElement.matches('#tel .q')));
  await p.click(T + '.s-liste [data-a="ent"][data-id="rsn"]'); await p.waitForTimeout(150); await shot('03-page');
  const pg = await texte(p, T + '.defile');
  verifie('la page dit l’offre : le poste, la date, les missions', pg.includes('L’offre') && pg.includes('mardi 15 décembre') && pg.includes('Gérer leurs réseaux'));
  verifie('à qui écrire : la personne que l’offre nomme', pg.includes('Thomas Leroy') && pg.includes('dans l’offre'));
  await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; }); await shot('04-page-bas');
  const n0 = await nPistes(p, T);
  await p.click(T + '.pied [data-a="garder"]'); await p.waitForTimeout(150);
  verifie('« Garder » fait une piste', (await nPistes(p, T)) === n0 + 1);
  await p.click(T + '.pied [data-a="ecrire"]'); await p.waitForTimeout(150); await shot('05-message');
  const msg = await valeur(p, T + '.e-m');
  verifie('le message cite l’offre', msg.includes('Je réponds à votre offre « Technicien·ne systèmes et réseaux ».'));
  verifie('le message va à la personne de l’offre', (await valeur(p, T + '.e-a')) === 't.leroy@rsn-lille.fr' && msg.startsWith('Bonjour Thomas Leroy,'));
  verifie('« Dans l’offre » au-dessus du message', (await texte(p, T + '.savoir')).includes('Dans l’offre'));
  await p.click(T + '[data-a="retour"]'); await p.waitForTimeout(150);
  verifie('la suite dit jusqu’à quand court l’offre', (await texte(p, T + '.suite-b')).includes('L’offre court jusqu’au mardi 15 décembre.'));
  await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; }); await shot('06-piste-bas');
  verifie('la piste garde l’offre, repliée', !!(await p.$(T + 'details[data-p="offre"]')));
  await p.click(T + '.nav [data-id="trouver"]'); await p.click(T + '.q'); await coller(p, T + '.q', OFFRE); await p.waitForTimeout(150); await shot('07-deja');
  verifie('la même offre, collée deux fois : pas de doublon', (await texte(p, T + '.o-deja')).includes('Cette offre est déjà sur sa piste.') && !(await p.$(T + '.etq-o')));
  await p.click(T + '[data-a="fermer-r"]'); await p.click(T + '.q'); await coller(p, T + '.q', SANS_NOM); await p.waitForTimeout(150); await shot('08-sans-nom');
  verifie('une offre sans entreprise lue demande son nom', (await texte(p, T + '.t-corps')).includes('Dans quelle entreprise ? Tape son nom.') && (await p.$eval(T + '.q', e => e.placeholder)) === 'Le nom de l’entreprise');
  await p.fill(T + '.q', 'Brasserie'); await p.waitForTimeout(150); await shot('09-tape-nom');
  const n1 = await nPistes(p, T);
  await p.click(T + '.s-liste [data-a="garder"][data-id="bra"]'); await p.waitForTimeout(150);
  verifie('l’offre part avec l’entreprise qu’on garde', (await nPistes(p, T)) === n1 + 1 && !(await p.$(T + '.etq-o')));
  await p.click(T + '[data-a="fermer-r"]'); await p.click('#horsligne'); await p.click(T + '.q'); await coller(p, T + '.q', OFFRE.replace(/Réseaux et Systèmes du Nord/, 'CHU de Lille')); await p.waitForTimeout(150); await shot('10-hors-ligne');
  verifie('hors ligne : l’offre attend le réseau', (await texte(p, T + '.t-corps')).includes('l’entreprise se reconnaîtra quand il revient'));
  await p.click('#horsligne'); await p.waitForTimeout(150);
  verifie('le réseau revient : l’entreprise se reconnaît', !!(await p.$(T + '.s-liste [data-id="chu"]')));
  // ---------- « Depuis mes e-mails » et le bac « à rattacher », en bas de Pistes ----------
  await p.click(T + '.nav [data-id="pistes"]'); await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; }); await shot('11-bas-pistes');
  verifie('« Depuis mes e-mails » ferme Pistes ; pas de bac vide', !!(await p.$(T + '[data-a="x-mails"]')) && !(await p.$(T + 'details[data-p="bac"]')));
  await p.click(T + '[data-a="x-mails"]'); await p.waitForTimeout(150); await shot('12-mails');
  verifie('trois gestes, le premier est un bouton', (await texte(p, T + '.sheet .etapes li:first-child')).includes('Copier la consigne'));
  await p.click(T + '[data-a="x-lire"]'); await p.waitForTimeout(100);
  verifie('rien de collé : l’erreur sous le champ', (await texte(p, T + '.x-err')).includes('Il manque la réponse de ton assistant.'));
  await p.click(T + '[data-a="x-coller"]'); await p.click(T + '[data-a="x-lire"]'); await p.waitForTimeout(150); await shot('13-apercu');
  const ap = await texte(p, T + '.sheet');
  verifie('l’aperçu dit ce qui est neuf, ce qui est là, ce qui ira au bac', ap.includes('nouvelle') && ap.includes('déjà dans tes pistes') && ap.includes('Camille Roussel s’ajoute') && ap.includes('ira dans « À rattacher »'));
  const n2 = await nPistes(p, T);
  await p.click(T + '[data-a="x-ajouter"]'); await p.waitForTimeout(150); await shot('14-ajoutees');
  verifie('« Ajouter » : les pistes neuves et « Annuler »', (await nPistes(p, T)) === n2 + 3 && (await texte(p, T + '.annule')).includes('3 pistes ajoutées · 1 contact à rattacher'));
  await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; });
  verifie('le bac paraît : il contient quelqu’un', (await texte(p, T + 'details[data-p="bac"] summary')).includes('À rattacher · 1'));
  await p.click(T + 'details[data-p="bac"] summary'); await p.evaluate(() => { const d = document.querySelector('#tel .defile'); d.scrollTop = d.scrollHeight; }); await shot('15-bac');
  await p.click(T + '[data-a="x-rattacher"]'); await p.waitForTimeout(150); await shot('16-rattacher');
  await p.click(T + '[data-a="x-rattacher-a"][data-id="vau"]'); await p.waitForTimeout(150);
  verifie('rattaché : le bac se vide, « Annuler » le rend', !(await p.$(T + 'details[data-p="bac"]')) && (await texte(p, T + '.annule')).includes('Contact rattaché à Vauban Infra'));
  await p.click(T + '.annule [data-a="annuler"]'); await p.waitForTimeout(100);
  verifie('« Annuler » remet le contact au bac', !!(await p.$(T + 'details[data-p="bac"]')));
  console.log('débordement horizontal', await deborde(p));
  await ctx.close();
}
{ // ---------- le plus petit téléphone ----------
  const { ctx, p } = await ouvrir(360, 640, false, true);
  await p.click(T + '.nav [data-id="trouver"]'); await p.click(T + '.q'); await coller(p, T + '.q', OFFRE); await p.waitForTimeout(150);
  await p.screenshot({ path: `${OUT}/t360-offre.png` });
  await p.click(T + '.s-liste [data-a="ent"][data-id="rsn"]'); await p.waitForTimeout(150); await p.screenshot({ path: `${OUT}/t360-page.png` });
  console.log('débordement en 360', await deborde(p));
  await ctx.close();
}
for (const sombre of [false, true]){ // ---------- à l'ordinateur : le clavier d'abord ----------
  const { ctx, p } = await ouvrir(1440, 900, sombre);
  const cadre = await p.$('.poste-cadre'); await cadre.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  const s = sombre ? '-sombre' : '';
  const shot = async n => { await p.waitForTimeout(150); await cadre.screenshot({ path: `${OUT}/p-${n}${s}.png` }); };
  verifie('chaque onglet souligne sa lettre', (await p.$$eval(P + '.p-onglets u', l => l.map(u => u.textContent).join(''))) === 'TPRM');
  await p.click(P + '.p-onglets [data-id="pistes"]');
  await coller(p, null, OFFRE); await p.waitForTimeout(150); await shot('01-coller');
  verifie('au poste, coller hors d’un champ ouvre Trouver sur l’offre', (await valeur(p, P + '.q')) === 'Réseaux et Systèmes du Nord' && (await texte(p, P + '.c2')).includes('L’offre'));
  verifie('la barre d’état dit la touche pour coller', (await texte(p, P + '.p-etat')).includes('coller une offre'));
  if (!sombre){
    await p.keyboard.press('g'); await p.waitForTimeout(150); await shot('02-gardee');
    verifie('G garde l’entreprise avec son offre', (await texte(p, P + '.c2 .pied')).includes('Préparer mon message') && !!(await p.$(P + '.t-corps .s-liste [data-id="rsn"]')));
    await p.click(P + '.c2 .pied [data-a="ecrire"]'); await p.waitForTimeout(150); await shot('03-ecrire');
    const f = await focus(p);
    verifie('ouvrir pour écrire sélectionne le crochet', f.c.includes('e-m') && f.sel.startsWith('[Une phrase précise'));
    verifie('la touche d’envoi se lit dans son bouton', (await texte(p, P + '.pc3 .pied .btn.p kbd')).includes('↵'));
    await p.keyboard.type('Vos missions sur les réseaux de vos clients sont celles de ma formation.');
    await p.keyboard.press('Control+Enter'); await p.waitForTimeout(150); await shot('04-parti');
    verifie('Ctrl ↵ envoie, puis « Oui, envoyé » a la main', (await focus(p)).t === 'Oui, envoyé');
    await p.keyboard.press('Enter'); await p.waitForTimeout(150); await shot('05-suivante');
    verifie('↵ confirme, puis « Suivante » a la main', (await focus(p)).t.startsWith('Suivante : Nord Infogérance'));
    await p.keyboard.press('Enter'); await p.waitForTimeout(150); await shot('06-suivante-ouverte');
    const f2 = await focus(p);
    verifie('la suivante s’ouvre, son crochet sélectionné', f2.c.includes('e-m') && f2.sel.startsWith('[') && (await texte(p, P + '.pc2 h4')) === 'Nord Infogérance');
    await p.keyboard.press('Escape'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100);
    verifie('Échap rend la liste au clavier', (await texte(p, P + '.p-liste-c .rang.on b')) !== 'Nord Infogérance');
    await p.keyboard.press('r'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100); await shot('07-reseau');
    verifie('R ouvre Réseau ; ↓ allume la ligne suivante', (await texte(p, P + '.r-liste .rang.on b')) === 'BTS SIO Lille' && !!(await p.$(P + '.conv-w')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    verifie('Échap ferme la conversation', !(await p.$(P + '.conv-w')));
    await p.keyboard.press('m'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(100); await shot('08-moi');
    verifie('M ouvre Moi ; ↓ passe à « CV et lettres »', (await texte(p, P + '.m-liste .rang.on b')) === 'CV et lettres');
    await p.keyboard.press('p'); await glisser(p, 'CV-Ines-Martin-2027.pdf', 'application/pdf', 186000, false); await shot('09-depot');
    verifie('glisser un CV : la fenêtre dit où il ira', (await texte(p, P + '.depot')).includes('Ton CV ira dans « CV et lettres ».'));
    await p.evaluate(() => document.querySelector('#poste .p-corps').dispatchEvent(new DragEvent('drop', { dataTransfer: new DataTransfer(), bubbles: true, cancelable: true })));
    await glisser(p, 'CV-Ines-Martin-2027.pdf', 'application/pdf', 186000, true); await p.waitForTimeout(150); await shot('10-cv-range');
    verifie('le CV déposé est rangé, avec « Annuler »', (await texte(p, P + '.rc2')).includes('CV-Ines-Martin-2027.pdf') && (await texte(p, P + '.annule')).includes('ajouté'));
    await glisser(p, 'opencontact-copie-2026-11-02.oc', '', 52000, true); await p.waitForTimeout(150); await shot('11-copie');
    verifie('une copie déposée s’ouvre avec son aperçu', (await texte(p, P + '.rc2')).includes('Rien n’est effacé'));
    await glisser(p, 'pistes-de-karim.oc', '', 9000, true); await p.waitForTimeout(150); await shot('12-pistes-recues');
    verifie('des pistes déposées s’ouvrent dans Recevoir', (await texte(p, P + '.rc2')).includes('De Karim'));
    await glisser(p, 'photo.png', 'image/png', 9000, true); await p.waitForTimeout(150);
    verifie('un autre fichier : l’app dit ce qu’elle reçoit', (await texte(p, P + '.annule')).includes('une offre, une copie .oc ou un CV'));
    await jour(p, '1'); await coller(p, null, OFFRE); await p.waitForTimeout(150); await shot('13-premier-jour');
    verifie('le premier jour aussi, l’offre fait une piste', (await texte(p, P + '.c2')).includes('L’offre') && !(await texte(p, P + '.p-etat')).includes('autour de'));
    await jour(p, '8'); await p.click(P + '.p-onglets [data-id="pistes"]');
    await coller(p, null, 'Vauban Infra ; Pierre Lambert ; p.lambert@vauban-infra.fr ; écrit ; 30/10/2026\nCitadelle Réseaux ; ; ; écrit ; 04/11/2026\nEscaut Data ; Romain Petit ; r.petit@escaut-data.fr ; réponse ; 13/11/2026\nAdvens ; Camille Roussel ; c.roussel@advens.fr ; écrit ; 28/10/2026\n ; Nadia Rahmani ; nadia.rahmani@gmail.com ; écrit ; 05/11/2026');
    await p.waitForTimeout(150); await shot('14-mails-colles');
    verifie('au poste, coller la réponse de l’assistant ouvre son aperçu', (await texte(p, P + '.sheet')).includes('Dans sa réponse'));
    await p.click(P + '[data-a="x-ajouter"]'); await p.waitForTimeout(150); await shot('15-mails-ajoutees');
    verifie('la première piste neuve s’ouvre, son message prêt', (await texte(p, P + '.pc2 h4')) === 'Vauban Infra' && (await texte(p, P + '.pc3')).includes('Je reviens vers vous'));
    await jour(p, '90'); await p.click(P + '.p-onglets [data-id="pistes"]'); await p.evaluate(() => { const d = document.querySelector('#poste .p-liste-c'); d.scrollTop = d.scrollHeight; }); await shot('16-j90-bas');
    verifie('au mois 3, le bac attend en bas de Pistes', (await texte(p, P + 'details[data-p="bac"] summary')).includes('À rattacher · 1'));
  } else {
    await p.keyboard.press('g'); await p.click(P + '.c2 .pied [data-a="ecrire"]'); await p.waitForTimeout(150); await shot('03-ecrire');
    await p.keyboard.press('p'); await glisser(p, 'CV-Ines-Martin-2027.pdf', 'application/pdf', 186000, false); await shot('09-depot');
  }
  console.log('débordement horizontal au poste', await deborde(p));
  await ctx.close();
}
console.log('cibles sous 44 px au téléphone :', [...vues].join(' '));
console.log('ÉCHECS', echecs, '· ERREURS', etat.erreurs);
await fermer();
