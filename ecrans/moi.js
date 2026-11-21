/* ============================================================
   OpenContact · la nouvelle interface · Moi
   (docs/brief-refonte.md §12, lot 4 ; la maquette validée le
   17 novembre 2026 : « Super », avec la consigne « Sois attentif aux
   détails »)

   Ce que l'étudiant dit de lui, et ce qui lui reste quand il change de
   téléphone. Cinq lignes, chacune avec son état : Mon profil, CV et
   lettres, Mes messages types, Ma copie, Réglages.

   CE QU'ON DIT DE SOI SERT TOUT DE SUITE : l'école, le téléphone, le
   rythme, le parcours et le lien du CV entrent dans le mail d'une piste ;
   une ligne dont la valeur manque disparaît (engine/model.js, `fillTpl`).
   Pas de bouton « Enregistrer » : ce qu'on tape est gardé — en mémoire à
   la frappe, dans le stockage une fraction de seconde plus tard.

   Au téléphone, une page de Moi est poussée ; au poste, la liste à
   gauche, la page à droite, et la ligne ouverte s'allume. « Ma copie »
   (la copie, la phrase de secours, les appareils, restaurer) vit dans
   copie.js, avec la mécanique de liaison et de dépôt (liaison.js,
   phrase.js) reprise de l'app actuelle. Le code de verrouillage (lot 5)
   vit dans verrou.js, avec l'écran verrouillé ; Réglages l'ouvre.
   ============================================================ */
import { $, $$, ic, esc, remplacer } from './outils.js';
import { S, bus, saveProfile, choisirTheme } from './etat.js';
import { C, inscrirePage, rendre, annuler, toast, cles, ouvrirFeuille, fermerFeuille } from './coque.js';
import { APP_VERSION, RECHERCHES, RAYONS, manquesDits, dureeRecherche, periodeValide, emailPlausible } from '../engine/model.js';
import { PARCOURS, PARCOURS_MAX, parcoursDe, periodeParcours, normalizeParcours } from '../engine/parcours.js';
import { AIDES, ORDRE_AIDES, normaliserAide, basculerAide } from '../engine/aide.js';
import { vuParMesAmis } from '../engine/amis.js';
import { villeConnue, correction, rayonDe } from '../engine/requete.js';
import { MODELES, modeleDe, modeleModifie, nombreModifies, poserModele, retablirModele, jetonsDe } from '../engine/modeles.js';
import { uid, fmtSize } from '../engine/utils.js';
import { effacerCetAppareil } from '../engine/storage.js';
import { visageHTML } from './visage.js';
import { quandJour } from './dates.js';
import { listDocs, docKind, docTitle, rangerPdf, retirerDoc, remettreDoc, ouvrirDoc } from './docs.js';
import { proposerInstallation, surIOS, inviteSysteme, ecouterInstallation } from './installer.js';
import { texteDiagnostic } from './diagnostic.js';
import { envoyerTexte, partagePossible } from './fichier.js';
import { oublierBrouillons } from './pistes.js';
import { M, lien, ouvrirM, fermerM, LIGNE_M } from './moi-nav.js';
import { PAGES_COPIE, gesteCopie, apresCopie, surInputCopie, ligneCopie, demarrerCopie, copieExiste, ouvrirPhrase, terminer } from './copie.js';
import { estProtege, ouvrirCode, demanderCode } from './verrou.js';

const PAGES_M = { profil: () => pageProfil(), docs: () => pageDocs(), modeles: () => pageModeles(), modele: k => pageModele(k),
  reglages: () => pageReglages(), aideconf: () => pageAideConf(), ...PAGES_COPIE };
const TITRES_M = { profil: 'Profil', docs: 'Documents', modeles: 'Messages types', modele: 'Modèle', copie: 'Ma copie', phrase: 'Phrase',
  relier: 'Relier', restauration: 'Restaurer', reglages: 'Réglages', aideconf: 'Aide' };
const LIGNES = ['profil', 'docs', 'modeles', 'copie', 'reglages'];
const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const maj = t => t ? t[0].toUpperCase() + t.slice(1) : t;

/* ============================================================
   LA LISTE : cinq lignes, chacune dit son état
   ============================================================ */
const ligneMoi = (t, titre, detail, cl) => {
  const on = C.poste && LIGNE_M((M.sel || { t: 'profil' }).t) === t;
  return `<div class="rang nav-r${cl ? ' ' + cl : ''}${on ? ' on' : ''}" data-a="m-ouvrir" data-id="${t}" role="button" tabindex="0"${on ? ' aria-current="true"' : ''}>`
    + `<div class="r-c"><b>${titre}</b>${detail ? `<span>${esc(detail)}</span>` : ''}</div>${ic('chevron-right')}</div>`;
};
/* « 1 CV · 2 lettres · lien ajouté » : le lien du profil est ce qui part
   VRAIMENT dans le mail — la ligne qui dirait « aucun » à côté d'un CV en
   ligne mentirait. Tant que les documents ne sont pas lus, on ne dit rien. */
function resumeDocs(){
  if (M.docs === null) return '';
  const cv = M.docs.filter(d => docKind(d.key) === 'cv').length, lm = M.docs.length - cv;
  return [cv ? `${cv} CV` : '', lm ? pl(lm, 'lettre') : '', S.profile.cvUrl ? 'lien ajouté' : ''].filter(Boolean).join(' · ') || 'aucun';
}
function listeHTML(){
  const p = S.profile, manque = manquesDits(p), n = nombreModifies(p), cp = ligneCopie();
  const resume = [p.formation, RECHERCHES[p.recherche] ? RECHERCHES[p.recherche].label.toLowerCase() : '', p.ville].filter(Boolean).join(' · ');
  return (p.name ? `<div class="s-moi"><div class="ami-t">${visageHTML(p.amiId || p.name, 'grand')}<div><b>${esc(p.name)}</b>${resume ? `<span>${esc(resume)}</span>` : ''}</div></div></div>` : '')
    + '<div class="rangs s-liste">'
    + ligneMoi('profil', 'Mon profil', manque.length ? 'à compléter : ' + manque.slice(0, 3).join(', ') : '')
    + ligneMoi('docs', 'CV et lettres', resumeDocs())
    + ligneMoi('modeles', 'Mes messages types', n ? `${n} modifié${n > 1 ? 's' : ''}` : '3 modèles')
    + ligneMoi('copie', 'Ma copie', cp.texte, cp.alerte ? 'alerte-r' : '')
    + ligneMoi('reglages', 'Réglages', '')
    + '</div>';
}

/* ============================================================
   MON PROFIL : ce qu'on remplit sert tout de suite
   ============================================================ */
const CHAMP = { nom: 'name', formation: 'formation', ecole: 'ecole', rythme: 'rythme', tel: 'phone', lien: 'cvUrl' };
const LIM = { name: 80, formation: 120, ecole: 120, rythme: 120, phone: 40, cvUrl: 300 };
const champ = (l, k, v, a = '') => `<label class="fld"><span class="et">${l}</span><input class="m-f" data-k="${k}" type="text" value="${esc(v || '')}" ${a}></label>`;
/* une valeur d'UN rang qui n'y tient pas se REPLIE (CLAUDE.md §6) : un
   <input> la couperait, et ce qui se cache est ce qu'on a écrit soi-même */
const champUn = (l, k, v, a = '') => `<label class="fld"><span class="et">${l}</span><textarea class="zone un m-f" rows="1" data-k="${k}" ${a}>${esc(v || '')}</textarea></label>`;

function blocRecherche(){
  const p = S.profile, q = p.recherche;
  if (!RECHERCHES[q]) return '';
  const emploi = q === 'emploi', dm = emploi ? '' : dureeRecherche(p.debut, p.fin, q);
  return (q === 'alternance' ? champUn('Rythme', 'rythme', p.rythme, 'placeholder="2 jours à l’école, 3 jours en entreprise" autocomplete="off" enterkeyhint="next"') : '')
    + `<div class="dates2${emploi ? ' un' : ''}">`
    + `<label class="fld"><span class="et">${emploi ? 'Disponible dès le' : 'À partir de'}</span><input class="m-f" data-k="debut" type="date" value="${esc(p.debut || '')}"></label>`
    + (emploi ? '' : `<label class="fld"><span class="et">Jusqu’au<span class="fld-n m-duree">${esc(dm || '')}</span></span><input class="m-f" data-k="fin" type="date" value="${esc(p.fin || '')}" aria-describedby="m-err-per"></label>`)
    + '</div><p class="err m-err-per" id="m-err-per" hidden>La date de fin est avant la date de début.</p>';
}
const blocRayon = () => villeConnue(S.profile.ville)
  ? `<div class="seg m-rayon" role="group" aria-label="Jusqu’où">${RAYONS.map(r => `<button${rayonDe(S.profile) === r ? ' class="on"' : ''} data-a="m-rayon" data-v="${r}" aria-pressed="${rayonDe(S.profile) === r}">${r} km</button>`).join('')}</div>` : '';
function blocParcours(){
  const l = parcoursDe(S.profile, S.companies);
  return `<fieldset class="gb m-parcours"><legend>Mon parcours</legend>${l.map(e => `<div class="pers" data-a="m-exp-edit" data-v="${esc(e.id)}" role="button" tabindex="0">`
    + `<div class="r-c"><b>${esc(e.entreprise)}</b><span>${esc([PARCOURS[e.quoi].label, periodeParcours(e)].filter(Boolean).join(' · '))}</span></div>${ic('chevron-right')}</div>`).join('')}`
    + `<button class="lien ajout" data-a="m-exp">${ic('plus')}Ajouter une expérience</button></fieldset>`;
}
/* « Je peux aider » n'existe que si quelqu'un peut le lire : un ami, ou un
   QR déjà donné — sans personne en face, une offre ne va nulle part */
const aideVisible = () => !!(S.profile.amiId || (S.profile.amis || []).length);
function blocAide(){
  if (!aideVisible()) return '';
  const a = normaliserAide(S.profile.aide);
  return `<fieldset class="gb m-aide-c"><legend>Je peux aider</legend><div class="cks">${ORDRE_AIDES.map(k => { const on = a.includes(k);
    return `<button class="ck${on ? ' on' : ''}" data-a="m-aide" data-v="${k}" role="checkbox" aria-checked="${on}">${ic(on ? 'checkbox-on' : 'checkbox')}<span class="ck-t"><b>${esc(AIDES[k].mot)}</b></span></button>`; }).join('')}</div></fieldset>`;
}
/* tiré du profil qui PART (engine/amis.js) : l'écran ne peut pas dire autre chose que ce qui sort */
const vuHTML = () => { const v = vuParMesAmis(S.profile, S.companies); return esc([v.nom || 'Ton nom', ...v.entreprises, ...v.aides].join(' · ')); };
function pageProfil(){
  const p = S.profile;
  const h = '<div class="s-page ecr">'
    + champ('Prénom et nom', 'nom', p.name, 'placeholder="Ex : Sam Martin" autocomplete="name" autocorrect="off" spellcheck="false" enterkeyhint="next"')
    + champUn('Formation', 'formation', p.formation, 'placeholder="Ex : BTS SIO option SLAM" autocomplete="off" enterkeyhint="next"')
    + champUn('École', 'ecole', p.ecole, 'placeholder="Elle signe tes mails" autocomplete="off" enterkeyhint="next"')
    + '<div class="et m-et">Tu cherches</div>'
    + `<div class="puces m-quoi" role="group" aria-label="Tu cherches">${Object.keys(RECHERCHES).map(k => `<button class="puce${p.recherche === k ? ' on' : ''}" data-a="m-quoi" data-v="${k}" aria-pressed="${p.recherche === k}">${RECHERCHES[k].label}</button>`).join('')}</div>`
    + `<div class="m-rech-c">${blocRecherche()}</div>`
    + champ('Autour de', 'ville', p.ville, 'autocomplete="address-level2" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="next" aria-describedby="m-err-ville"')
    + '<p class="err m-err-ville" id="m-err-ville" hidden></p>'
    + `<div class="m-rayon-c">${blocRayon()}</div>`
    + champ('Téléphone', 'tel', p.phone, 'inputmode="tel" autocomplete="tel" enterkeyhint="next"')
    + champ('E-mail', 'mail', p.email, 'inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="email" enterkeyhint="done" aria-describedby="m-err-mail"')
    + '<p class="err m-err-mail" id="m-err-mail" hidden>Adresse incomplète (exemple : prenom.nom@gmail.com).</p>'
    + blocParcours() + blocAide()
    + `<fieldset class="gb"><legend>Ce que tes amis voient</legend><p class="m-vu">${vuHTML()}</p><p class="doux">Jamais tes pistes, ni ton suivi, ni tes notes.</p></fieldset></div>`;
  return { titre: 'Profil', corps: h };
}

/* ---- ce qu'on tape : gardé tout de suite ----
   En mémoire à la frappe (le mail d'une piste lit le profil), dans le
   stockage 400 ms après la dernière touche, et au plus tard quand on
   quitte l'écran. */
let sale = false, tSave = null;
function marquer(){ sale = true; clearTimeout(tSave); tSave = setTimeout(vider, 400); }
export function vider(){
  clearTimeout(tSave);
  if (!sale) return;
  sale = false;
  saveProfile();
  /* les brouillons que personne n'a touchés repartent du nouveau texte ;
     les autres ne bougent pas (invariant ②) */
  oublierBrouillons();
  majListe();
}
bus.editionEnCours = () => sale;
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') vider(); });
addEventListener('pagehide', vider);
/* la liste se redessine sur place (au téléphone elle n'existe que tant
   qu'aucune page n'est ouverte) : un état qui change — les documents lus,
   une copie faite — se voit sans qu'on y retourne */
function majListe(){
  const l = $('.ecran .m-liste');
  if (l) remplacer(l, (C.poste ? '<div class="s-tete"><h3>Moi</h3></div>' : '') + listeHTML());
}
lien.majListe = majListe;
const lienPropre = v => (v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && /^[^\s/]+\.[a-z]{2,}(\/|$)/i.test(v)) ? 'https://' + v : v;
function dire(er, champ, txt){
  if (!er) return;
  er.innerHTML = txt || '';
  er.hidden = !txt;
  if (champ){ if (txt) champ.setAttribute('aria-invalid', 'true'); else champ.removeAttribute('aria-invalid'); }
}
function villeSaisie(t){
  const p = S.profile, v = t.value.replace(/\s+/g, ' ').trim(), er = $('.m-err-ville', t.closest('.s-page'));
  t.__vu = t.value;
  /* le rayon n'a de sens qu'autour d'une ville reconnue : le bloc ne se
     redessine que s'il apparaît ou disparaît — jamais sous un doigt qui
     est en train de le toucher */
  const rayon = () => { const z = $('.ecran .m-rayon-c'); if (z && !!villeConnue(p.ville) !== !!$('.m-rayon', z)) remplacer(z, blocRayon()); };
  if (!v){ dire(er, t, ''); if (p.ville){ p.ville = ''; marquer(); } rayon(); return; }
  const c = villeConnue(v);
  if (c){
    dire(er, t, '');
    t.value = c.nom;
    if (p.ville !== c.nom){ p.ville = c.nom; marquer(); }
    rayon();
    return;
  }
  /* une ville que la table ne connaît pas se dit sous son champ, la saisie
     gardée ; une faute de frappe se PROPOSE (jamais appliquée) */
  const cor = correction(v), prop = cor && cor.etiquette.famille === 'lieu' && villeConnue(cor.q) ? villeConnue(cor.q).nom : '';
  dire(er, t, `Je ne trouve pas « ${esc(v)} ». Essaie la ville la plus proche.`
    + (prop ? ` <button class="lien" data-a="m-ville-prop" data-v="${esc(prop)}">${esc(prop)} ?</button>` : ''));
}
function datesSaisies(t){
  const p = S.profile, z = t.closest('.m-rech-c');
  if (!z) return;
  const d = $('[data-k="debut"]', z), f = $('[data-k="fin"]', z);
  const vd = d ? d.value : '', vf = f ? f.value : '', ok = periodeValide(vd, vf);
  dire($('.m-err-per', z), f, ok ? '' : 'La date de fin est avant la date de début.');
  const du = $('.m-duree', z);
  if (du) du.textContent = ok ? (dureeRecherche(vd, vf, p.recherche) || '') : '';
  /* une période fausse ne s'enregistre pas : le champ garde ce qu'on a tapé, l'erreur le dit */
  if (!ok) return;
  if (p.debut !== vd){ p.debut = vd; marquer(); }
  if (f && p.fin !== vf){ p.fin = vf; marquer(); }
}
function champSaisi(t, fin){
  const k = t.getAttribute('data-k'), p = S.profile, v = t.value.replace(/\s+/g, ' ').trim();
  if (CHAMP[k]){
    const cle = CHAMP[k];
    let x = v;
    if (k === 'lien' && fin){ x = lienPropre(v); if (x !== v) t.value = x; }
    x = x.slice(0, LIM[cle]);
    if ((p[cle] || '') !== x){ p[cle] = x; marquer(); majVuNom(); }
    return;
  }
  if (k === 'mail'){
    const er = $('.m-err-mail', t.closest('.s-page'));
    if (!v || emailPlausible(v)){ dire(er, t, ''); if (er) er.hidden = true; if ((p.email || '') !== v){ p.email = v; marquer(); } }
    else if (fin){ er.hidden = false; t.setAttribute('aria-invalid', 'true'); }
    return;
  }
  if (k === 'ville'){ if (fin && t.value !== t.__vu) villeSaisie(t); return; }
  if (k === 'debut' || k === 'fin') datesSaisies(t);
}
const majVu = () => { const z = $('.ecran .m-vu'); if (z) z.innerHTML = vuHTML(); };
const majVuNom = () => { if ($('.ecran .m-vu')) majVu(); };
/* une ligne d'un rang : Entrée passe au champ suivant, jamais à la ligne */
function plier(t){
  if (/[\r\n]/.test(t.value)){ const i = t.selectionStart; t.value = t.value.replace(/[\r\n]+/g, ' '); t.selectionStart = t.selectionEnd = i; }
}
function grandir(t){ if (!t || !t.offsetParent) return; t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }

/* ============================================================
   CV ET LETTRES : ce qu'on envoie
   ============================================================ */
async function chargerDocs(){
  M.docs = await listDocs();
  majListe();
}
const DOCS = { cv: ['CV', 'Ajouter un CV'], lm: ['Lettres', 'Ajouter une lettre'] };
function ligneDoc(d){
  const t = docTitle(d), sous = [fmtSize(d.size), d.added ? 'ajouté ' + quandJour(d.added) : ''].filter(Boolean).join(' · ');
  return `<div class="gl" data-g="doc-retirer" data-id="${esc(d.key)}"><div class="dessous-g" aria-hidden="true">Retirer</div>`
    + `<div class="rang doc"><div class="r-c" data-a="m-doc-ouvrir" data-id="${esc(d.key)}" role="button" tabindex="0"><b>${esc(t)}</b><span>${esc(sous)}</span></div>`
    + `<button class="x-l" data-a="m-doc-retirer" data-id="${esc(d.key)}" aria-label="Retirer ${esc(t)}">${ic('close')}</button></div></div>`;
}
const ERR_DOC = { pdf: 'Ce n’est pas un PDF. Enregistre ton document en PDF, puis ajoute-le.', lourd: 'Trop lourd (8 Mo au plus) : allège le PDF.',
  stockage: 'Ce navigateur ne peut pas ranger le fichier ici.' };
function pageDocs(){
  const l = M.docs || [];
  const bloc = (kind, mt) => `<div class="et m-et${mt ? ' m-et2' : ''}">${DOCS[kind][0]}</div><div class="rangs">${l.filter(d => docKind(d.key) === kind).map(ligneDoc).join('')}`
    + `<label class="rang plus-r fichier">${ic('plus')}${DOCS[kind][1]}<input type="file" class="m-fichier" data-k="${kind}" accept="application/pdf,.pdf" aria-label="${DOCS[kind][1]}"></label></div>`;
  return { titre: 'Documents', corps: '<div class="s-page ecr">' + bloc('cv', false) + bloc('lm', true)
    + `<p class="err m-err-d"${M.docErr ? '' : ' hidden'}>${esc(ERR_DOC[M.docErr] || '')}</p>`
    + champ('Le lien vers ton CV', 'lien', S.profile.cvUrl, 'inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://" autocomplete="url" enterkeyhint="done"').replace('class="fld"', 'class="fld m-lien"')
    + '<p class="doux">Un mail ouvert depuis l’app ne peut pas joindre de fichier. Avec un lien, ton CV part dans le message.</p></div>' };
}
async function fichierChoisi(t){
  const f = t.files && t.files[0];
  t.value = '';
  if (!f) return;
  const r = await rangerPdf(t.getAttribute('data-k'), f);
  M.docErr = r.erreur || '';
  if (!r.erreur) await chargerDocs();
  rendre();
}
async function retirerDocument(key){
  const d = (M.docs || []).find(x => x.key === key);
  if (!d) return;
  await retirerDoc(key).catch(() => {});
  await chargerDocs();
  rendre();
  annuler(`« ${docTitle(d)} » retiré`, async () => {
    const { key: k, ...val } = d;
    await remettreDoc(k, val).catch(() => {});
    await chargerDocs();
    rendre();
  });
}

/* ============================================================
   MES MESSAGES TYPES : la ligne dit seulement si je l'ai changé
   ============================================================ */
function pageModeles(){
  return { titre: 'Messages types', corps: '<div class="s-page"><div class="rangs">' + MODELES.map(m =>
    `<div class="rang nav-r" data-a="m-ouvrir" data-id="modele" data-v="${m.k}" role="button" tabindex="0"><div class="r-c"><b>${m.mot}</b>${modeleModifie(S.profile, m.k) ? '<span>modifié</span>' : ''}</div>${ic('chevron-right')}</div>`).join('') + '</div></div>' };
}
const jetonsHTML = t => { const j = jetonsDe(t);
  return j.map(x => `<dt><code>{{${x.jeton}}}</code></dt><dd>${esc(x.sens)}</dd>`).join(''); };
function pageModele(k){
  const m = MODELES.find(x => x.k === k) || MODELES[0], t = modeleDe(S.profile, m.k), j = jetonsHTML(t);
  return { titre: 'Modèle', corps: `<div class="s-page ecr"><h4 class="m-h">${m.mot}</h4>`
    + `<label class="fld"><span class="et">Objet</span><textarea class="zone un m-tpl" rows="1" data-k="${m.k}" data-p="o">${esc(t.subject)}</textarea></label>`
    + `<label class="fld"><span class="et">Message</span><textarea class="zone m-tpl" data-k="${m.k}" data-p="m">${esc(t.body)}</textarea></label>`
    + `<details class="pli jetons"${j ? '' : ' hidden'}><summary>Ce que l’app remplace${ic('chevron-right')}</summary><dl class="m-jetons">${j}</dl>`
    + '<p class="doux">Une ligne dont la valeur manque disparaît du message.</p></details>'
    + `<div class="bas-p m-ret"${modeleModifie(S.profile, m.k) ? '' : ' hidden'}><button class="btn-g" data-a="m-tpl-retablir" data-v="${m.k}">Rétablir le modèle d’origine</button></div></div>` };
}
function modeleSaisi(t){
  const k = t.getAttribute('data-k'), z = t.closest('.s-page');
  const o = $('.m-tpl[data-p="o"]', z), b = $('.m-tpl[data-p="m"]', z);
  S.profile.templates = poserModele(S.profile, k, { subject: o.value, body: b.value });
  marquer();
  const j = jetonsHTML({ subject: o.value, body: b.value }), d = $('.jetons', z);
  $('.m-jetons', z).innerHTML = j;
  d.hidden = !j;
  $('.m-ret', z).hidden = !modeleModifie(S.profile, k);
}

/* ============================================================
   RÉGLAGES : chaque ligne dit son état et ouvre ses choix
   ============================================================ */
const MOT_THEME = { auto: 'automatique', light: 'clair', dark: 'sombre' };
function pageReglages(){
  const p = S.profile, ligne = (a, t, d, id) => `<div class="rang nav-r" data-a="${a}"${id ? ` data-id="${id}"` : ''} role="button" tabindex="0"><div class="r-c"><b>${t}</b>${d ? `<span>${esc(d)}</span>` : ''}</div>${ic('chevron-right')}</div>`;
  const rien = !(S.companies.length || p.name);
  return { titre: 'Réglages', corps: '<div class="s-page"><div class="rangs">'
    + ligne('m-code-f', 'Code de verrouillage', estProtege() ? 'protégé' : 'aucun')
    + ligne('m-theme-f', 'Thème', MOT_THEME[S.themeChoix] || 'automatique')
    + ((p.amis || []).length ? ligne('m-suivre-f', 'Demandes de mes amis', p.flags.sansRelais ? 'arrêtées' : 'transmises') : '')
    + (proposerInstallation() ? ligne('m-installer', 'Installer l’app', 'pas installée') : '')
    + ligne('m-ouvrir', 'Aide et confidentialité', '', 'aideconf')
    + ligne('m-diag', 'Signaler un problème', '')
    + '</div>'
    + (rien ? '' : `<div class="bas-p"><button class="btn s danger" data-a="m-effacer">${ic('trash')}Effacer cet appareil</button></div>`)
    + `<p class="version">OpenContact ${esc(APP_VERSION)}</p></div>` };
}
/* ce qui sort de l'appareil, et quand — dit pour qui ne l'a pas lu, avec
   les pages qui le disent en entier */
function pageAideConf(){
  return { titre: 'Aide', corps: '<div class="s-page"><h4>Tout reste chez toi</h4><p>Aucun compte, aucun serveur OpenContact, aucune mesure de ce que tu fais.</p>'
    + '<div class="et m-et m-et2">Ce qui sort, et quand</div><ul class="questions">'
    + '<li>Quand tu cherches : ce que tu tapes pour trouver une entreprise part à l’annuaire public des entreprises. Jamais un contact ni tes notes.</li>'
    + '<li>Quand tu écris à ta classe ou à un ami : le message part chiffré, par des relais publics qui ne peuvent pas le lire.</li>'
    + '<li>Quand tu demandes quelqu’un : ton prénom et l’entreprise, à tes amis et à ta classe.</li>'
    + '<li>Quand tu donnes des pistes : le nom, la ville et les contacts. Jamais ton suivi ni tes notes.</li>'
    + '<li>Quand tu relies un autre appareil : tes pistes passent de l’un à l’autre, chiffrées.</li>'
    + '<li>Avec une phrase de secours : ta copie part scellée sur les relais. Sans tes douze mots, personne ne l’ouvre.</li></ul>'
    + `<div class="liens-p"><a class="lien" href="aide.html" target="_blank" rel="noopener">L’aide en entier${ic('external-link')}</a>`
    + `<a class="lien" href="confidentialite.html" target="_blank" rel="noopener">Confidentialité${ic('external-link')}</a></div></div>` };
}

/* ============================================================
   LES FEUILLES : une question courte chacune
   ============================================================ */
const TITRES_F = { experience: 'Parcours', theme: 'Thème', suivre: 'Demandes', installer: 'Installer', diag: 'Rapport', effacer: 'Effacer' };
function feuille(type, o = {}){
  const f = { type, ...o, titre: TITRES_F[type], rendre: rendreF, geste: gesteF, focus: o.focus || '' };
  ouvrirFeuille(f);
  return f;
}
/* un choix parmi deux ou trois : la coche suit le tap, la feuille reste ouverte, l'effet se voit dessous */
const choixHTML = (l, actuel, a) => `<div class="rangs choix" role="radiogroup">${l.map(([v, t]) => { const on = String(v) === String(actuel);
  return `<button class="rang act" data-a="${a}" data-v="${v}" role="radio" aria-checked="${on}"><div class="r-c"><b>${t}</b></div>${on ? ic('check') : ''}</button>`; }).join('')}</div>`;
function cocher(v){
  $$('.couche-f .choix [role="radio"]').forEach(r => {
    const on = r.getAttribute('data-v') === String(v), c = $('.ic', r);
    r.setAttribute('aria-checked', String(on));
    if (on && !c) r.insertAdjacentHTML('beforeend', ic('check'));
    if (!on && c) c.remove();
  });
}
function rendreF(f){
  if (f.type === 'experience'){
    const { x, e } = f;
    const quoi = Object.keys(PARCOURS).map(k => `<button${x.quoi === k ? ' class="on"' : ''} aria-pressed="${x.quoi === k}" data-a="m-exp-q" data-v="${k}">${PARCOURS[k].label}</button>`).join('');
    const per = x.debut ? periodeParcours({ debut: x.debut, fin: x.fin }) : '';
    return { corps: `<div class="seg" role="group" aria-label="Stage, alternance ou emploi">${quoi}</div>`
      + `<label class="fld m-top"><span class="et">L’entreprise</span><input class="m-exp-e" type="text" autocomplete="organization" autocorrect="off" spellcheck="false" value="${esc(x.entreprise)}"></label><p class="err m-err-e" hidden></p>`
      + `<div class="dates2"><label class="fld"><span class="et">Début</span><input class="m-exp-d" type="month" value="${esc(x.debut)}"></label>`
      + `<label class="fld"><span class="et">Fin<span class="fld-n m-exp-per">${esc(per)}</span></span><input class="m-exp-f" type="month" value="${esc(x.fin)}"></label></div>`
      + '<p class="err m-err-f" hidden></p>'
      + (e && e.deduit ? `<p class="doux">Cette ligne vient de ta piste « ${esc(e.entreprise)} » (J’y suis passé). Pour la retirer, change la piste.</p>`
        : e ? `<div class="bas-p"><button class="btn s danger" data-a="m-exp-retirer">${ic('trash')}Retirer de mon parcours</button></div>` : ''),
      pied: `<button class="btn p" data-a="m-exp-ok">${e ? 'Enregistrer' : 'Ajouter'}</button>` };
  }
  if (f.type === 'theme') return { corps: choixHTML([['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']], S.themeChoix, 'm-theme') };
  if (f.type === 'suivre') return { corps: choixHTML([[false, 'Les faire suivre à mes amis'], [true, 'Ne pas les faire suivre']], !!S.profile.flags.sansRelais, 'm-suivre') };
  if (f.type === 'installer')
    return { corps: '<ol class="etapes">' + (surIOS()
      ? '<li><span>1</span>Touche Partager : le carré avec une flèche. S’il n’y est pas, il est dans le menu ⋯.</li><li><span>2</span>Choisis « Sur l’écran d’accueil ».</li><li><span>3</span>Touche « Ajouter ».</li>'
      : '<li><span>1</span>Ouvre le menu ⋮ du navigateur.</li><li><span>2</span>Choisis « Installer l’application » ou « Ajouter à l’écran d’accueil ».</li>') + '</ol>'
      + (surIOS() ? '<p class="doux">Installée, l’app garde tes pistes même si tu ne l’ouvres pas pendant un moment.</p>' : '') };
  if (f.type === 'diag')
    return { corps: `<pre class="diag" tabindex="0" aria-label="Texte du rapport">${esc(f.txt)}</pre>`,
      pied: partagePossible() ? `<button class="btn p" data-a="m-diag-envoyer">${ic('share')}Envoyer</button>` : `<button class="btn p" data-a="m-diag-envoyer">${ic('copy')}Copier</button>` };
  if (f.type === 'effacer'){
    const n = S.companies.length, nd = M.docs ? M.docs.length : 0, ou = C.poste ? 'cet ordinateur' : 'ce téléphone';
    const quoi = [n ? 'tes ' + pl(n, 'piste') : 'ton profil', n ? 'tes amis' : 'tes réglages', n ? 'tes messages' : '', nd ? 'tes ' + pl(nd, 'document') : ''].filter(Boolean);
    const filet = copieExiste();
    return { corps: '<p class="fort">Effacer cet appareil ?</p>'
      + `<p class="doux">${esc(maj(quoi.slice(0, -1).join(', ') + ' et ' + quoi[quoi.length - 1]))} quittent ${ou}.${filet ? ' Ta copie, elle, reste où tu l’as gardée.' : ' Sans copie, ils sont perdus.'}</p>`
      + (filet || !n ? '' : `<button class="btn s m-top" data-a="m-copie-ici">${ic('download')}Télécharger une copie</button>`),
      pied: '<button class="btn danger" data-a="m-effacer-ok">Effacer</button>' };
  }
  return { corps: '' };
}
function gesteF(a, el, ev, f){
  const z = $('.couche-f');
  if (a === 'm-exp-q'){
    const v = el.getAttribute('data-v');
    f.x.quoi = v;
    $$('.seg [data-a="m-exp-q"]', z).forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    return;
  }
  if (a === 'm-exp-ok'){ enregistrerExp(f); return; }
  if (a === 'm-exp-retirer'){
    const e = f.e, avant = normalizeParcours(S.profile.parcours), i = avant.findIndex(y => y.id === e.id);
    S.profile.parcours = avant.filter(y => y.id !== e.id);
    saveProfile(); oublierBrouillons();
    fermerFeuille(); rendre();
    annuler(`${e.entreprise} retiré de ton parcours`, () => {
      const l = normalizeParcours(S.profile.parcours);
      l.splice(Math.max(0, i), 0, e);
      S.profile.parcours = normalizeParcours(l);
      saveProfile(); oublierBrouillons();
    });
    return;
  }
  if (a === 'm-theme'){ choisirTheme(el.getAttribute('data-v')); cocher(el.getAttribute('data-v')); rendre(); return; }
  if (a === 'm-suivre'){
    const non = el.getAttribute('data-v') === 'true';
    S.profile.flags.sansRelais = non; saveProfile();
    cocher(el.getAttribute('data-v')); rendre();
    return;
  }
  if (a === 'm-diag-envoyer'){
    envoyerTexte(f.txt).then(r => {
      if (r === 'copie') toast('Copié : colle-le où tu veux.');
      else if (r === 'echec') toast('Copie impossible ici : sélectionne le texte.');
    });
    return;
  }
  if (a === 'm-copie-ici'){ fermerFeuille(); gesteCopie('m-copie-ici', el, ev); return; }
  if (a === 'm-effacer-ok'){
    /* protégé, le code d'abord : on n'efface pas un téléphone qu'on a seulement ramassé */
    const effacer = () => effacerCetAppareil().catch(() => {}).then(() => location.replace(location.pathname));
    if (!estProtege()){ effacer(); return; }
    demanderCode('Ton code, pour effacer').then(pin => { if (pin) effacer(); });
    return;
  }
}
function enregistrerExp(f){
  const z = $('.couche-f'), en = $('.m-exp-e', z).value.replace(/\s+/g, ' ').trim(), d = $('.m-exp-d', z).value, fi = $('.m-exp-f', z).value;
  const dit = (sel, txt, champ) => { const er = $(sel, z); er.textContent = txt; er.hidden = false; if (champ) champ.focus(); };
  $('.m-err-e', z).hidden = true; $('.m-err-f', z).hidden = true;
  if (!en){ dit('.m-err-e', 'Il manque l’entreprise.', $('.m-exp-e', z)); return; }
  if (d && fi && fi < d){ dit('.m-err-f', 'La fin est avant le début.', $('.m-exp-f', z)); return; }
  const e = f.e, liste = normalizeParcours(S.profile.parcours);
  /* une ligne déduite d'une piste devient une ligne saisie, LIÉE à sa
     piste : elle prend sa place au lieu de s'y ajouter */
  const id = e && !e.deduit ? e.id : uid();
  if (!liste.some(y => y.id === id) && liste.length >= PARCOURS_MAX){ dit('.m-err-e', 'Vingt expériences au plus.'); return; }
  const neuf = { id, entreprise: en, quoi: f.x.quoi, debut: d, fin: fi, ...(e && e.pisteId ? { pisteId: e.pisteId } : {}) };
  const i = liste.findIndex(y => y.id === id);
  if (i >= 0) liste[i] = neuf; else liste.push(neuf);
  S.profile.parcours = normalizeParcours(liste);
  saveProfile(); oublierBrouillons();
  fermerFeuille(); rendre();
}
function ouvrirExp(e){
  const x = { entreprise: '', quoi: 'stage', debut: '', fin: '', ...(e || {}) };
  feuille('experience', { e, x, focus: e ? '' : '.m-exp-e' });
}
async function ouvrirInstaller(){
  if (await inviteSysteme()){ rendre(); return; }
  feuille('installer');
}
async function ouvrirRapport(){
  feuille('diag', { txt: await texteDiagnostic() });
}

/* ============================================================
   LES GESTES
   ============================================================ */
function geste(a, el, ev){
  const id = el ? el.getAttribute('data-id') || '' : '', v = el ? el.getAttribute('data-v') || '' : '', p = S.profile;
  if (a === 'm-ouvrir'){ if (id === 'phrase') ouvrirPhrase(el); else ouvrirM(id, v, el); return; }
  if (a === 'm-retour'){ terminer(); return; }
  if (a === 'm-quoi'){
    p.recherche = p.recherche === v ? '' : v;
    $$('.ecran .m-quoi .puce').forEach(b => { const on = b.getAttribute('data-v') === p.recherche; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const z = $('.ecran .m-rech-c');
    if (z){ remplacer(z, blocRecherche()); $$('.zone', z).forEach(grandir); }
    marquer();
    return;
  }
  if (a === 'm-rayon'){
    p.rayon = Number(v);
    $$('.ecran .m-rayon button').forEach(b => { const on = b === el; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    marquer();
    return;
  }
  if (a === 'm-aide'){
    const l = basculerAide(p.aide, v);
    if (l.length) p.aide = l; else delete p.aide;
    const on = l.includes(v);
    el.classList.toggle('on', on);
    el.setAttribute('aria-checked', String(on));
    const c = $('.ic', el);
    if (c){ const u = `url(assets/icons/${on ? 'checkbox-on' : 'checkbox'}.svg)`; c.style.webkitMaskImage = u; c.style.maskImage = u; }
    majVu();
    marquer();
    return;
  }
  if (a === 'm-ville-prop'){
    const f = $('.ecran [data-k="ville"]');
    if (f){ f.value = v; villeSaisie(f); f.focus({ preventScroll: true }); }
    return;
  }
  if (a === 'm-exp'){ ouvrirExp(null); return; }
  if (a === 'm-exp-edit'){ const e = parcoursDe(p, S.companies).find(x => x.id === v); if (e) ouvrirExp(e); return; }
  if (a === 'm-tpl-retablir'){
    const avant = modeleDe(p, v), copie = { subject: avant.subject, body: avant.body };
    p.templates = retablirModele(p, v);
    saveProfile(); oublierBrouillons();
    rendre();
    annuler('Modèle d’origine rétabli', () => { p.templates = poserModele(p, v, copie); saveProfile(); oublierBrouillons(); });
    return;
  }
  if (a === 'm-doc-ouvrir'){ ouvrirDoc(id).then(ok => { if (!ok) toast('Ce document n’est plus là.'); }); return; }
  if (a === 'm-doc-retirer' || a === 'doc-retirer'){ retirerDocument(id); return; }
  if (a === 'm-code-f'){ ouvrirCode(); return; }
  if (a === 'm-theme-f'){ feuille('theme'); return; }
  if (a === 'm-suivre-f'){ feuille('suivre'); return; }
  if (a === 'm-installer'){ ouvrirInstaller(); return; }
  if (a === 'm-diag'){ ouvrirRapport(); return; }
  if (a === 'm-effacer'){ feuille('effacer'); return; }
  return gesteCopie(a, el, ev);
}
/* ce qu'on tape, en délégation sur l'écran : il survit aux redessins */
function brancher(ecran){
  if (ecran.__moiB) return;
  ecran.__moiB = true;
  ecran.addEventListener('input', ev => {
    const t = ev.target;
    if (t.matches('.m-f')){ if (t.tagName === 'TEXTAREA'){ plier(t); grandir(t); } champSaisi(t, false); }
    else if (t.matches('.m-tpl')){ if (t.classList.contains('un')) plier(t); grandir(t); modeleSaisi(t); }
    else surInputCopie(t);
  });
  ecran.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches('.m-f')) champSaisi(t, true);
    else if (t.matches('.m-fichier')) fichierChoisi(t);
  });
  ecran.addEventListener('focusout', ev => {
    const t = ev.target;
    if (t.matches && t.matches('.m-f')) champSaisi(t, true);
    vider();
  });
  /* Entrée dans un champ d'un rang : le suivant, jamais un retour à la ligne */
  ecran.addEventListener('keydown', ev => {
    const t = ev.target;
    if (ev.key !== 'Enter' || ev.isComposing || !t.matches || !t.matches('textarea.un, input.m-f')) return;
    ev.preventDefault();
    const l = $$('input.m-f, textarea.m-f, textarea.m-tpl, .puce', ecran).filter(x => x.offsetParent);
    const s = l[l.indexOf(t) + 1];
    if (s) s.focus(); else t.blur();
  });
}
function apres(t, z){
  brancher($('.ecran'));
  $$('.zone', z).forEach(grandir);

  if (t === 'docs' && M.docs === null) chargerDocs().then(() => rendre());
  apresCopie(t, z);
}

for (const t of Object.keys(PAGES_M)) inscrirePage(t, {
  titre: () => TITRES_M[t],
  rendre: p => PAGES_M[t](p.id),
  geste: (a, el, ev) => geste(a, el, ev),
  apres: (p, ecran) => apres(t, ecran),
  /* ouvrir pour écrire n'est pas ouvrir pour relire : un profil sans nom
     s'ouvre sur son champ (CLAUDE.md §6) */
  focus: (p, ecran) => { if (t === 'profil') focusNom(ecran); }
});
function focusNom(z){
  if (S.profile.name) return;
  const n = $('[data-k="nom"]', z);
  if (n) n.focus({ preventScroll: true });
}

/* ============================================================
   L'ONGLET
   ============================================================ */
let demarre = false;
function demarrer(){
  if (demarre) return;
  demarre = true;
  ecouterInstallation();
  chargerDocs().catch(() => { M.docs = []; });
  demarrerCopie();
  document.addEventListener('oc:installee', () => { if (C.onglet === 'moi') rendre(); });
}
function rendreTel(ecran){
  remplacer(ecran, `<div class="defile"><div class="s-tete"><h3>Moi</h3></div><div class="m-liste">${listeHTML()}</div></div>`);
  brancher(ecran);
}
function rendrePoste(ecran, premier){
  if (premier || !$('.mc1', ecran))
    ecran.innerHTML = '<div class="p-col c1 mc1"><div class="defile m-liste"></div></div><div class="p-col c2 mc2"></div>';
  remplacer($('.m-liste', ecran), `<div class="s-tete"><h3>Moi</h3></div>${listeHTML()}`);
  let sel = M.sel || { t: 'profil', id: '' };
  if (!PAGES_M[sel.t]) sel = M.sel = { t: 'profil', id: '' };
  const x = PAGES_M[sel.t](sel.id), rc2 = $('.mc2', ecran), k = sel.t + '|' + sel.id;
  const h = `<div class="defile">${x.corps || ''}</div><div class="pied"${x.pied ? '' : ' hidden'}>${x.pied || ''}</div>`;
  const neuve = rc2.getAttribute('data-k') !== k;
  if (!neuve) remplacer(rc2, h); else { rc2.innerHTML = h; rc2.setAttribute('data-k', k); }
  brancher(ecran);
  apres(sel.t, rc2);
  if (neuve && sel.t === 'profil') focusNom(rc2);
}

export default {
  id: 'moi',
  rendre(ecran, { poste, premier }){ demarrer(); (poste ? rendrePoste : rendreTel)(ecran, premier); },
  geste(a, el, ev){ geste(a, el, ev); },
  quitter(){ vider(); },
  clavier(ev, { champ, poste }){
    if (!poste || champ) return false;
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return false;
    ev.preventDefault();
    const i = LIGNES.indexOf(LIGNE_M((M.sel || { t: 'profil' }).t));
    const j = Math.max(0, Math.min(LIGNES.length - 1, i + (ev.key === 'ArrowDown' ? 1 : -1)));
    M.sel = { t: LIGNES[j], id: '' };
    rendre();
    const on = $('.ecran .m-liste .rang.on');
    if (on){ on.focus({ preventScroll: true }); on.scrollIntoView({ block: 'nearest' }); }
    return true;
  },
  etat(){
    return `<span>${esc(S.profile && S.profile.name ? S.profile.name : 'Profil à compléter')}</span>` + cles([[['↑', '↓'], 'choisir']]);
  }
};
