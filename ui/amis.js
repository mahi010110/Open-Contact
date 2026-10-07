/* ============================================================
   OpenContact — interface · les amis (docs/reseau.md, lot 2)

   Un ami est quelqu'un dont tu as le PROFIL : son nom et son parcours.
   Ce que ça te rapporte se lit AILLEURS, là où tu travailles — « Karim
   y est en alternance » sur ta piste Aztek, dans la barre, dans
   « Aujourd'hui » —, pas dans un écran à visiter. Ici, il n'y a donc
   que le geste et la liste :

   · « Mon QR » montre ton profil dans l'image, et dit EXACTEMENT ce
     qu'il contient (ton nom, ton parcours) : on voit ce qu'on donne
     avant de le donner (le « choisis ce que tu partages » de NameDrop,
     ramené à ce qui sert) ;
   · « Scanner » est le scanner de « Recevoir » — un seul pour tout ;
   · l'aperçu d'un profil reçu passe AVANT tout ajout (invariant ②), et
     montre tout de suite ce qu'il rapporte : les entreprises de ses
     expériences qui sont déjà dans tes pistes ;
   · la fiche d'un ami : son parcours, chaque entreprise qui mène à ta
     piste ou qui s'y ajoute d'un tap, et « Retirer » — nommé, rouge, en
     dernier, rattrapable 30 s. Personne n'est prévenu (LinkedIn fait
     pareil : retirer quelqu'un ne lui envoie rien).

   Le mot est « ami » (§7, décision du 7 octobre 2026) : une personne
   dont tu as le profil. « Groupe » reste le collectif, « contact » la
   personne dans une entreprise.
   ============================================================ */
import { esc, todayISO, uid } from '../engine/utils.js';
import { normalizeCompany } from '../engine/model.js';
import { PARCOURS, periodeParcours } from '../engine/parcours.js';
import { nouvelIdAmi, profilDonne, statutAmi, ajouterAmi, retirerAmi, prenomAmi,
         portesAmis, memeEntreprise, classerAmis, chercherAmis, TRIS_AMIS, TRI_AMIS_DEFAUT } from '../engine/amis.js';
import { encodeOCA } from '../engine/exchange.js';
import { S, bus, saveData, saveProfile, logJ, deletePiste } from './state.js';
import { openSheet, toast, btn, ic, showUndo, bindDeleteGesture } from './dom.js';
import { sortState, sortSectionHTML, bindSortSection, sortChipHTML, bindSortChip, sensDe } from './sort.js';
import { makeQrSvg } from './qr.js';

/* ce que le parcours de tes amis dit de tes pistes — calculé à la
   demande : l'index du moteur le rend linéaire, rien à mémoriser */
export const portesDuJour = () => portesAmis(S.companies, S.profile.amis, todayISO());

const pisteDe = e => S.companies.find(c => !c.closedReason && memeEntreprise(c, e))
                  || S.companies.find(c => memeEntreprise(c, e)) || null;
const ligneExperience = e => [PARCOURS[e.quoi] && PARCOURS[e.quoi].label, periodeParcours(e)].filter(Boolean).join(' · ');
/* la sous-ligne d'un ami dans la liste : où il est passé, le plus
   récent d'abord — c'est ce qui le distingue d'un autre Karim */
const resumeAmi = a => (a.parcours || []).map(e => e.entreprise).join(' · ');

/* LA LISTE VIT DANS « MES PISTES » (docs/reseau.md, lot 4) : une portée à
   côté d'« À découvrir », triable comme les pistes. « Échanger » ne garde
   que les gestes d'échange — « Scanner », « Mon QR ». Une liste, une
   place. */

/* ---------- mon QR ----------
   L'identifiant se tire ICI, au premier don : un profil qui n'a jamais
   été donné n'en a pas besoin. */
export async function openMonQR(o = {}){
  const p = S.profile;
  if (!String(p.name || '').trim()){
    /* SANS NOM, PAS DE QR : ton ami recevrait un profil qu'il ne pourrait
       pas reconnaître. Plutôt qu'une feuille qui l'explique, l'app ouvre
       directement ce qui manque — ton profil, le curseur sur le nom — et
       montre le QR dès qu'il est enregistré (§6, « peut-il être
       implicite ? »). */
    const { openProfil } = await import('./profil.js');
    openProfil(() => { if (String(S.profile.name || '').trim()) openMonQR(o); }, { focus: '#pfName' });
    return null;
  }
  const sh = openSheet({ title: 'Mon QR', icon: 'grid-3x3' });
  if (!p.amiId){ p.amiId = nouvelIdAmi(); saveProfile(); }
  /* LA BOÎTE NAÎT ICI aussi (lot 3) : le QR porte la clé où tes amis
     pourront te demander quelqu'un. Un vieux navigateur sans WebCrypto
     donne son QR sans elle — on ne pourra pas lui écrire, c'est tout. */
  try { await (await import('./reseau.js')).assurerBoite(); } catch (e) {}
  const donne = profilDonne(p, S.companies);
  let txt, svg;
  try {
    txt = await encodeOCA(donne);
    svg = await makeQrSvg(txt);
  } catch (e) {
    sh.body.innerHTML = `<p class="hint warn">Ce navigateur est trop ancien.</p>`;
    return sh;
  }
  if (!sh.body.isConnected) return sh;
  sh.body.innerHTML =
    `<div class="qr-wrap" role="img" aria-label="Mon profil en QR, à faire scanner">${svg}</div>
     ${/* CE QUI PART, en entier, sous l'image : rien de caché derrière
          un QR. Le nom et les entreprises — c'est tout. */''}
     <div class="mq-donne" id="mqDonne">
       <b>${esc(donne.nom)}</b>
       ${donne.parcours.length
         ? `<span>${esc(donne.parcours.map(e => (PARCOURS[e.quoi] ? PARCOURS[e.quoi].label + ' chez ' : '') + e.entreprise).join(' · '))}</span>`
         : `<button class="linklike" id="mqParcours">${ic('plus', 'ic-14')} Ajouter mon parcours</button>`}
     </div>`;
  sh.body.querySelector('#mqParcours')?.addEventListener('click', async () => {
    sh.close();
    (await import('./profil.js')).openProfil(() => openMonQR(o));
  });
  /* À DISTANCE : le même profil en texte, à coller dans « Recevoir →
     Texte ». La phrase dit où le coller — c'est l'ami qui la lira. */
  /* le bouton DIT qu'il a copié, là où l'on vient de toucher — pas un
     toast de plus pour un résultat qu'on regarde déjà */
  const copier = btn('Copier', '', async () => {
    try {
      await navigator.clipboard.writeText(`Mon profil OpenContact — colle ce message dans Échanger › Recevoir › Texte :\n${txt}`);
      copier.innerHTML = ic('check', 'ic-14') + ' Copié';
    } catch (e) { toast('Copie impossible ici — montre plutôt le QR.'); }
  }, 'copy');
  const scanner = btn('Scanner', '', async () => {
    sh.close();
    (await import('./recevoir.js')).openRecevoir({ scanner: true, apres: o.apres });
  }, 'grid-3x3');
  copier.id = 'mqCopier'; scanner.id = 'mqScan';
  sh.setFoot([copier, scanner]);
  return sh;
}

/* ---------- un profil reçu : l'aperçu AVANT ----------
   Appelé par « Recevoir » quand ce qu'on a scanné ou collé est un
   profil. `a` est déjà remis aux invariants (normalizeAmi) : « Recevoir »
   refuse, avant d'arriver ici, ce qui ne se lit pas comme un profil. */
export function apercuAmi(sh, a, o = {}){
  const st = statutAmi(S.profile.amis, a, S.profile.amiId);
  const prenom = prenomAmi(a);
  sh.setTitle(a.nom);
  /* Deux ÉTATS, pas des explications : ton propre QR (photographié,
     recopié), ou un ami déjà là sans rien de neuf. Rien à ajouter —
     on le lit, on ferme. */
  const etat = st === 'moi' ? 'C’est ton profil.' : st === 'identique' ? 'Déjà dans tes amis.' : '';
  /* L'AMITIÉ EST RÉCIPROQUE (décision du 7 octobre 2026) : l'ajouter lui
     donne ton profil. Ça se dit AVANT le geste — c'est ton nom et ton
     parcours qui partent, et on ne le devinerait pas. Un QR d'avant les
     boîtes (sans clé) ne peut rien recevoir : rien à dire. */
  sh.body.innerHTML = parcoursHTML(a, { lecture: true })
    + (etat ? `<p class="am-etat" id="amEtat">${ic('check', 'ic-14')} ${etat}</p>`
      : a.cle ? `<p class="dm-qui" id="amReci">${ic('users', 'ic-14')} ${esc(prenom)} aura aussi ton profil.</p>` : '');
  if (etat){
    sh.setFoot([btn('OK', 'btn-primary', () => sh.close())]);
    return;
  }
  const ajouter = () => {
    const avant = (S.profile.amis || []).slice();
    S.profile.amis = ajouterAmi(S.profile.amis, a);
    saveProfile();
    bus.refresh();
    sh.close();
    if (o.apres) o.apres();
    /* ton profil part vers lui — ou attend le réseau, puis part */
    if (a.cle) import('./reseau.js').then(m => m.donnerMonProfil(a)).catch(() => {});
    showUndo(`${ic('check', 'ic-14')} ${esc(prenom)} ${st === 'maj' ? 'est à jour' : 'est dans tes amis'}.`, () => {
      S.profile.amis = avant;
      saveProfile();
      bus.refresh();
      if (o.apres) o.apres();
      /* annuler, c'est aussi ne pas lui donner ton profil */
      if (a.cle) import('./reseau.js').then(m => m.reprendreMonProfil(a)).catch(() => {});
    });
  };
  const ok = btn(st === 'maj' ? 'Mettre à jour' : 'Ajouter ' + prenom, 'btn-primary', async () => {
    /* SANS NOM, PAS DE PROFIL À DONNER : comme pour « Mon QR », l'app
       ouvre ce qui manque, le curseur sur le nom, et ajoute dès qu'il est
       enregistré (§6, « peut-il être implicite ? ») */
    if (a.cle && !String(S.profile.name || '').trim()){
      const { openProfil } = await import('./profil.js');
      openProfil(() => { if (String(S.profile.name || '').trim()) ajouter(); }, { focus: '#pfName' });
      return;
    }
    ajouter();
  }, st === 'maj' ? 'reload' : 'plus');
  ok.id = 'amAjouter';
  sh.setFoot(o.onBack ? [btn('← Retour', 'btn-ghost', o.onBack), ok] : [ok]);
}

/* Les expériences d'un ami. Une entreprise déjà dans tes pistes le DIT
   (en accent, c'est un atout, pas une urgence) — c'est ce que l'ami te
   rapporte, et ça se voit avant même de l'ajouter. Hors lecture, elle
   mène à ta fiche ; les autres s'ajoutent à tes pistes d'un tap. */
function parcoursHTML(a, { lecture = false } = {}){
  if (!(a.parcours || []).length) return '';
  return `<div class="pick-list am-par">${a.parcours.map((e, i) => {
    const c = pisteDe(e);
    /* « dans tes pistes » ne se dit qu'à l'APERÇU, où rien d'autre ne
       le montre. Dans la fiche de l'ami, le chevron le dit déjà (la
       ligne mène à ta piste), et le « + Piste » des autres l'inverse. */
    const sous = `<span class="pk-s">${c && lecture ? `<span class="am-tienne">dans tes pistes</span>${ligneExperience(e) ? ' · ' : ''}` : ''}${esc(ligneExperience(e))}</span>`;
    const m = `<div class="pk-m"><b>${esc(e.entreprise)}</b>${sous}</div>`;
    if (lecture) return `<div class="pick am-ro">${m}</div>`;
    return c
      ? `<button class="pick" data-piste="${esc(c.id)}">${m}${ic('chevron-right', 'ic-14')}</button>`
      : `<div class="pick am-ro">${m}<button class="btn btn-sm" data-ajout="${i}" aria-label="Ajouter ${esc(e.entreprise)} à mes pistes">${ic('plus', 'ic-14')} Piste</button></div>`;
  }).join('')}</div>`;
}

/* ---------- la fiche d'un ami ----------
   La même au pouce (une feuille) et au poste (à côté de la liste) : ses
   entreprises — qui mènent à ta piste ou s'y ajoutent d'un tap —, et
   « Retirer de mes amis », nommé, rouge, en dernier. */
function ficheAmiHTML(a){
  /* UN PROFIL DONNÉ AVANT LES DEMANDES (6.54) n'a pas de boîte : on
     ne peut rien lui demander tant qu'il n'a pas redonné son QR. Une
     fois, et c'est le seul endroit où ça se dit — le geste, pas la
     raison. */
  return parcoursHTML(a)
    + (a.cle ? '' : `<p class="hint" id="amAncien">${ic('reload', 'ic-14')} Rescanne son QR pour lui demander quelqu’un.</p>`)
    + `<div class="pick-list pick-sortie">
         <button class="pick pick-danger" id="amRetirer"><b>${ic('trash', 'ic-14')} Retirer de mes amis</b></button>
       </div>`;
}
function lierFicheAmi(box, a, { apres, fermer } = {}){
  const frais = () => (S.profile.amis || []).find(x => x.id === a.id) || a;
  box.querySelectorAll('[data-piste]').forEach(b => b.addEventListener('click', async () => {
    const c = S.companies.find(x => x.id === b.dataset.piste);
    if (c) (await import('./fiche.js')).openFiche(c);
  }));
  box.querySelectorAll('[data-ajout]').forEach(b => b.addEventListener('click', () => {
    const e = frais().parcours[+b.dataset.ajout];
    if (!e) return;
    ajouterPiste(e, prenomAmi(frais()), () => apres && apres());
    if (apres) apres();
  }));
  box.querySelector('#amRetirer')?.addEventListener('click', () => {
    if (fermer) fermer();
    retirerAvecAnnuler(a, apres);
  });
}
/* retirer, rattrapable — personne n'est prévenu (LinkedIn fait pareil) */
function retirerAvecAnnuler(a, apres){
  const avant = (S.profile.amis || []).slice();
  S.profile.amis = retirerAmi(S.profile.amis, a.id);
  saveProfile();
  bus.refresh();
  if (apres) apres();
  showUndo(`${esc(prenomAmi(a))} n’est plus dans tes amis.`, () => {
    S.profile.amis = avant;
    saveProfile();
    bus.refresh();
    if (apres) apres();
  });
}
export function openAmi(a, apres){
  const sh = openSheet({ title: a.nom, icon: 'user' });
  const dessiner = () => {
    if (!sh.body.isConnected) return;
    const frais = (S.profile.amis || []).find(x => x.id === a.id) || a;
    sh.body.innerHTML = ficheAmiHTML(frais);
    lierFicheAmi(sh.body, frais, { apres: () => { dessiner(); if (apres) apres(); }, fermer: () => sh.close() });
  };
  dessiner();
  return sh;
}

/* ---------- l'onglet « Amis » de « Mes pistes » (lot 4) ----------
   Un ami se lit comme une piste : la même rangée, le même geste pour le
   retirer, le même tri. Sa ligne dit ce qu'il T'OUVRE — des onglets
   voisins montrent des choses de même nature (NN/g) : ses entreprises,
   celles de tes pistes d'abord, en accent. */
export const triAmis = sortState(TRI_AMIS_DEFAUT);
let choisiAmi = null;
export const amisClasses = q => chercherAmis(
  classerAmis(S.profile.amis, S.companies, todayISO(), triAmis.levels[0].sort, sensDe(triAmis)), q);
function sousLigneAmi(o){
  if (!o.lignes.length) return 'aucune entreprise';
  const dans = o.lignes.filter(l => l.pisteId).map(l => l.entreprise);
  const autres = o.lignes.filter(l => !l.pisteId).map(l => l.entreprise);
  return (dans.length ? `<span class="am-tienne">${esc(dans.join(', '))}, dans tes pistes</span>` : '')
    + (dans.length && autres.length ? ' · ' : '') + esc(autres.join(' · '));
}
function ligneAmiHTML({ a, o }, sel){
  return (
    `<div class="row-item am-row${sel ? ' am-sel' : ''}" data-ami="${esc(a.id)}">
       <div class="sw-in">
         <div class="ri-main sw-cible" role="button" tabindex="0" aria-label="Ouvrir ${esc(a.nom)}"${sel ? ' aria-current="true"' : ''}>
           <h3>${esc(a.nom)}</h3>
           <div class="ri-sub">${sousLigneAmi(o)}</div>
         </div>
       </div>
     </div>`);
}
export function vueAmisHTML(classes, { q, wide }){
  if (!(S.profile.amis || []).length)
    /* L'ÉTAT VIDE ENSEIGNE (§6) : ce que la liste montrera, et les deux
       gestes qui la remplissent — les mêmes qu'« Échanger » */
    return (
      `<div class="td-empty" id="avVide">
         <div class="tde-ic">${ic('users', 'ic-24')}</div>
         <h2>Tes amis t’ouvrent leurs entreprises</h2>
         <div class="tde-actions">
           <button class="btn btn-primary" id="avMonQR">${ic('user', 'ic-14')} Mon QR</button>
           <button class="btn" id="avScan">${ic('grid-3x3', 'ic-14')} Scanner</button>
         </div>
       </div>`);
  if (!classes.length) return `<div class="empty-list" id="avRien">Aucun ami ne correspond.</div>`;
  const x = wide ? (classes.find(c => c.a.id === choisiAmi) || classes[0]) : null;
  if (x) choisiAmi = x.a.id;
  const liste = `<div class="rows am-rows">${classes.map(c => ligneAmiHTML(c, !!x && c.a.id === x.a.id)).join('')}</div>`;
  /* AU POSTE, la fiche vit à côté de la liste (liste-détail, comme
     « À découvrir ») ; au pouce, le tap ouvre sa feuille */
  return x
    ? `<div class="dc-split">
         <div class="dc-col">${liste}</div>
         <aside class="dc-detail am-detail" data-ami="${esc(x.a.id)}" aria-label="${esc(x.a.nom)}">
           <h2 class="ap-nom">${esc(x.a.nom)}</h2>${ficheAmiHTML(x.a)}
         </aside>
       </div>`
    : liste;
}
export function lierVueAmis(box, { wide, rendre }){
  if (!box) return;
  box.querySelector('#avMonQR')?.addEventListener('click', () => openMonQR({ apres: rendre }));
  box.querySelector('#avScan')?.addEventListener('click', async () =>
    (await import('./recevoir.js')).openRecevoir({ scanner: true, apres: rendre }));
  const trouve = id => (S.profile.amis || []).find(a => a.id === id);
  box.querySelectorAll('.am-row').forEach(row => {
    const a = trouve(row.dataset.ami);
    if (!a) return;
    const main = row.querySelector('.ri-main');
    const ouvrir = () => {
      if (!wide){ openAmi(a, rendre); return; }
      if (choisiAmi === a.id) return;
      choisiAmi = a.id;
      rendre();
      box.querySelector(`.am-row[data-ami="${CSS.escape(a.id)}"] .ri-main`)?.focus({ preventScroll: true });
    };
    main.addEventListener('click', ouvrir);
    main.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ouvrir(); } });
    /* au poste, la fiche suit le clavier, comme dans « À découvrir » */
    if (wide) main.addEventListener('focus', () => { if (choisiAmi !== a.id){ choisiAmi = a.id; rendre(); box.querySelector(`.am-row[data-ami="${CSS.escape(a.id)}"] .ri-main`)?.focus({ preventScroll: true }); } });
    /* RETIRER AU GESTE, comme une piste : glisser au doigt, la croix au
       survol — avec SON mot, et « Annuler » */
    bindDeleteGesture(row, () => retirerAvecAnnuler(a, rendre), a.nom, { mot: 'Retirer' });
  });
  const aside = box.querySelector('.am-detail');
  if (aside){
    const a = trouve(aside.dataset.ami);
    if (a) lierFicheAmi(aside, a, { apres: rendre });
  }
}
/* le tri des amis : la même feuille que celle des pistes, leurs critères */
export function openTriAmis(rendre){
  const sh = openSheet({ title: 'Trier', icon: 'sort-vertical' });
  const dessiner = () => {
    sh.body.innerHTML = sortSectionHTML(triAmis, TRIS_AMIS);
    bindSortSection(sh.body, triAmis, () => { rendre(); dessiner(); });
  };
  dessiner();
  return sh;
}
export const triAmisChipHTML = () => sortChipHTML(triAmis, TRIS_AMIS);
export const lierTriAmisChip = (box, rendre) => bindSortChip(box, triAmis, rendre);

/* Une entreprise du parcours d'un ami devient une piste : son nom, et
   son SIREN s'il l'a donné — rien d'autre n'est inventé. La fiche dira
   d'elle-même « Karim y est en alternance ». */
function ajouterPiste(e, prenom, apres){
  const c = normalizeCompany({ id: uid(), name: e.entreprise, createdAt: Date.now(), ...(e.siren ? { siren: e.siren } : {}) });
  c.history = [{ d: todayISO(), t: 'Ajoutée depuis le parcours de ' + prenom }];
  S.companies.push(c);
  saveData();
  logJ('Piste ajoutée depuis le parcours de ' + prenom + ' : ' + c.name, c.id);
  bus.refresh();
  showUndo(`${ic('check', 'ic-14')} « ${esc(c.name)} » ajoutée.`, () => { deletePiste(c); bus.refresh(); apres(); });
}
