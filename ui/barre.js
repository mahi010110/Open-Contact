/* ============================================================
   OpenContact — interface · LA BARRE
   (la refonte, fiche 0014 : l'expérience d'Arc Search, le style 98)

   Une seule entrée pour tout ce qu'on fait dans l'app : retrouver une
   piste, faire un geste dessus (« relancer Advens », « entretien Aztek
   jeudi 14h »), aller quelque part (« réglages »), chercher dans ses
   pistes ou dans l'annuaire, ajouter une entreprise — et « Prépare la
   page » d'une entreprise qu'on n'a pas encore.

   DEUX DESSINS, parce que le téléphone et l'ordinateur sont deux choses
   différentes (le mainteneur, 9 novembre 2026) :
   · au téléphone, le + de la barre du bas ouvre une FEUILLE : le champ
     en tête, le clavier ouvert d'un tap, « Nouvelle piste » au pied ;
   · au poste, c'est une PALETTE — la fenêtre de commande d'Arc, de
     Linear ou de Raycast, en fenêtre 98 : étroite, posée haut, ouverte
     par le champ de la barre latérale, par « / » ou par Ctrl K ; ↓ ↑ ↵
     suffisent, Échap la range.
   Une seule liste dessous : le moteur (`engine/commande.js`) dit ce
   qu'il a compris, ligne par ligne, et ce fichier le montre.

   QUATRE RÈGLES d'écran, qui suivent celles du moteur :
   1. LA BARRE VIDE N'EST JAMAIS VIDE : ce qu'il y a à faire, les pistes
      ouvertes en dernier, et — en pointillé — ce qu'on peut y taper
      (« proposé en pointillé, posé en plein », CLAUDE.md §6). Le prix de
      la nouveauté se paie là : rien à deviner.
   2. LA PREMIÈRE LIGNE EST LA RÉPONSE : Entrée la joue.
   3. RIEN NE CHANGE SANS UN TAP, et ce qui change s'annule
      (`ui/gestes.js`, invariant ②).
   4. RIEN NE PART VERS L'ANNUAIRE PENDANT LA FRAPPE : « Prépare la
      page » est un geste — c'est lui qui pose la question, avec les mots
      qu'on vient de lire sur la ligne.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { comprendre, amorces, etatCourt } from '../engine/commande.js';
import { aFaire } from '../engine/etape.js';
import { questionNom, suggestionsNom, sousLigneNom } from '../engine/annuaire.js';
import { S, bus } from './state.js';
import { $, ic, openSheet, annoncer, clavier } from './dom.js';
import { recentes } from './recents.js';
import { faireGeste, faireEtape } from './gestes.js';
import { portesDuJour } from './amis.js';
import { openCapture } from './capture.js';
import { ouvrirSur } from './pistes.js';

const mqLarge = matchMedia('(min-width:901px)');
const piste = id => S.companies.find(c => c.id === id);
const contexte = () => ({ companies: S.companies, profile: S.profile, today: todayISO() });

/* ---------- où mène un mot ---------- */
const ALLER = {
  accueil: () => { location.hash = '#/aujourdhui'; },
  pistes: () => ouvrirSur(''),
  rangees: () => ouvrirSur('clôturées'),
  decouvrir: () => ouvrirSur('', 'decouvrir'),
  reseau: () => { location.hash = '#/reseau'; },
  moi: () => { location.hash = '#/moi'; },
  cv: () => { location.hash = '#/moi'; },
  lettres: () => { location.hash = '#/moi'; },
  aide: () => { location.href = 'aide.html'; },
  prospecter: async () => (await import('./prospect.js')).openProspect(),
  amis: async () => (await import('./amis.js')).openMesAmis(),
  qr: async () => (await import('./amis.js')).openMonQR(),
  donner: async () => (await import('./donner.js')).openDonner(),
  recevoir: async () => (await import('./recevoir.js')).openRecevoir(),
  profil: async () => (await import('./profil.js')).openProfil(() => bus.refresh()),
  modeles: async () => (await import('./profil.js')).openTemplates(),
  copie: async () => (await import('./moi.js')).downloadBackup(),
  reglages: async () => (await import('./moi.js')).openReglages(),
  theme: async () => (await import('./moi.js')).openTheme()
};

/* ---------- ce que montre la barre vide ---------- */
function lignesVides(){
  const ctx = contexte();
  const l = [];
  const f = aFaire(S.companies, { today: ctx.today, profile: S.profile, portes: portesDuJour() });
  /* ouverte depuis « Aujourd'hui », la barre ne redit pas la file qu'on
     a sous les yeux, juste derrière elle : rien ne se dit deux fois (§6) */
  const faire = S.route === 'aujourdhui' ? [] : [...f.engage, ...f.propose].slice(0, 3);
  for (const e of faire){
    const c = piste(e.id);
    if (!c) continue;
    l.push({ type: 'etape', groupe: 'À faire', id: c.id, etape: e, icone: e.icone || 'zap',
      titre: e.titre, detail: [c.name, e.genre === 'contrat' ? 'décroché' : etatCourt(c, ctx.today)].filter(Boolean).join(' · ') });
  }
  const vus = new Set(l.map(x => x.id));
  for (const c of recentes(4)){
    if (vus.has(c.id) || l.filter(x => x.type === 'piste').length >= 3) continue;
    l.push({ type: 'piste', groupe: 'Ouvertes récemment', id: c.id, icone: 'briefcase',
      titre: c.name, detail: [etatCourt(c, ctx.today), c.city].filter(Boolean).join(' · ') });
  }
  return { lignes: l, essais: amorces(ctx) };
}

/* ---------- le dessin d'une liste ---------- */
function ligneHTML(l, i, actif){
  const approx = l.approx ? ' ?' : '';
  return `<button type="button" class="br-rang${i === actif ? ' br-actif' : ''}${l.approx ? ' br-approx' : ''}" role="option"
            id="brL${i}" data-i="${i}" aria-selected="${i === actif}">
            ${ic(l.icone || 'chevron-right', 'ic-16')}
            <span class="br-t"><b>${esc(l.titre)}${approx}</b>${l.detail ? `<span class="br-s">${esc(l.detail)}</span>` : ''}</span>
            ${l.bouton ? `<span class="br-geste">${esc(l.bouton)}</span>` : ''}
          </button>`;
}
function listeHTML(lignes, actif){
  let groupe = null, html = '';
  lignes.forEach((l, i) => {
    if (l.groupe && l.groupe !== groupe){ groupe = l.groupe; html += `<h3 class="br-lbl">${esc(groupe)}</h3>`; }
    html += ligneHTML(l, i, actif);
  });
  return html;
}

/* ---------- une barre : un champ, une boîte, et de quoi fermer ----------
   `o.fermer()` range la barre (la feuille se ferme, le panneau se
   replie) ; `o.vide` : faut-il montrer « Nouvelle piste » dans la liste
   (au poste — au téléphone, il tient le pied de la feuille). */
function monter(champ, boite, o){
  let lignes = [], actif = 0, essais = [], etat = 'liste', ctrl = null;
  const dessiner = () => {
    const q = champ.value.trim();
    let html = '';
    if (etat !== 'liste'){ html = etat; }
    else if (!lignes.length && q) html = `<p class="br-rien">Rien pour « ${esc(q)} ».</p>`;
    else html = `<div role="listbox" aria-label="Propositions">${listeHTML(lignes, actif)}</div>`;
    if (etat === 'liste' && !q && essais.length)
      html += `<h3 class="br-lbl">Essaie</h3>
               <div class="br-essais">${essais.map((e, i) =>
                 `<button type="button" class="br-essai" data-essai="${i}">${esc(e)}</button>`).join('')}</div>`;
    if (etat === 'liste' && !q && o.vide)
      html += `<button type="button" class="br-rang br-neuve" data-neuve>${ic('plus', 'ic-16')}
                 <span class="br-t"><b>Nouvelle piste</b></span></button>`;
    boite.innerHTML = html;
    const a = boite.querySelector('.br-actif');
    champ.setAttribute('aria-activedescendant', a ? a.id : '');
    if (a && o.suivre) a.scrollIntoView({ block: 'nearest' });
  };
  const calculer = () => {
    ctrl?.abort();
    etat = 'liste';
    const q = champ.value.trim();
    if (!q){ const v = lignesVides(); lignes = v.lignes; essais = v.essais; actif = -1; }
    else { lignes = comprendre(q, contexte()).lignes.filter(l => l.type !== 'geste' || l.action !== 'demander' || o.peutDemander()); actif = lignes.length ? 0 : -1; essais = []; }
    dessiner();
    if (q && lignes.length) annoncer(lignes.length + ' proposition' + (lignes.length > 1 ? 's' : '') + '. ' + lignes[0].titre + '.');
  };

  /* « Prépare la page » : la question part ICI, sur le tap, avec le nom
     qu'on vient de lire — puis la liste des entreprises, ou la page si
     l'annuaire n'en connaît qu'une */
  async function preparer(nom){
    const ajouter = { type: 'ajouter', icone: 'plus', nom, titre: 'Ajouter « ' + nom + ' » à mes pistes', detail: '' };
    const dire = phrase => { etat = 'liste'; lignes = [ajouter]; actif = 0; dessiner();
      boite.insertAdjacentHTML('afterbegin', `<p class="br-rien">${esc(phrase)}</p>`); annoncer(phrase); };
    if (navigator.onLine === false) return dire('Hors ligne : l’annuaire reviendra avec le réseau.');
    ctrl?.abort();
    ctrl = new AbortController();
    etat = `<div class="br-prepa" role="status"><b>Je prépare la page de « ${esc(nom)} »</b>
              <span class="br-jauge" aria-hidden="true"><i></i></span></div>`;
    dessiner();
    try {
      const { lireUrl, ouvrirPage } = await import('./decouvrir.js');
      const l = suggestionsNom(await lireUrl(questionNom(nom, ''), ctrl.signal));
      if (champ.value.trim() && !champ.value.trim().toLowerCase().includes(nom.toLowerCase().slice(0, 3)) ) return;
      if (!l.length) return dire('L’annuaire ne connaît pas « ' + nom + ' ».');
      if (l.length === 1){ o.fermer(); ouvrirPage(l[0]); return; }
      etat = 'liste';
      lignes = [...l.map(r => ({ type: 'entreprise', groupe: 'Dans l’annuaire', icone: 'building', r,
        titre: r.nom, detail: sousLigneNom(r) })), ajouter];
      actif = 0;
      dessiner();
      annoncer(l.length + ' entreprises dans l’annuaire.');
    } catch (e){
      if (e && e.name === 'AbortError') return;
      dire(e && e.limite ? 'L’annuaire est très demandé. Réessaie dans un instant.' : 'L’annuaire ne répond pas.');
    }
  }

  async function jouer(l){
    if (!l) return;
    if (l.type === 'preparer') return preparer(l.nom);
    o.fermer();
    switch (l.type){
      case 'geste': return faireGeste(l);
      case 'etape': return faireEtape(piste(l.id), l.etape);
      case 'piste': { const c = piste(l.id); if (c) (await import('./fiche.js')).openFiche(c); return; }
      case 'ami': {
        const a = (S.profile.amis || []).find(x => x.id === l.id);
        if (!a) return;
        if (a.cle) return (await import('./messages.js')).ouvrirConversation(a);
        return (await import('./amis.js')).openAmi(a);
      }
      case 'aller': return (ALLER[l.vers] || ALLER.accueil)();
      case 'chercher': return ouvrirSur(l.q);
      case 'decouvrir': return ouvrirSur(l.q, 'decouvrir');
      case 'lien': return openCapture({ name: l.nom, website: l.lien, direct: true });
      case 'contact': return openCapture({ coord: l.valeur });
      case 'ajouter': return openCapture(l.nom ? { name: l.nom } : {});
      case 'entreprise': return (await import('./decouvrir.js')).ouvrirPage(l.r);
    }
  }

  champ.addEventListener('input', calculer);
  champ.addEventListener('keydown', e => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      if (!lignes.length) return;
      e.preventDefault();
      actif = e.key === 'ArrowDown' ? (actif + 1) % lignes.length : (actif <= 0 ? lignes.length - 1 : actif - 1);
      dessiner();
    } else if (e.key === 'Enter'){
      e.preventDefault();
      jouer(lignes[actif < 0 ? 0 : actif]);
    }
  });
  /* `click` suffit : les rangées ne prennent pas le focus au pointeur
     (`mousedown` retenu), donc le champ garde le clavier ouvert jusqu'au
     geste, et rien ne se referme sous le doigt */
  boite.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  boite.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.essai != null){
      champ.value = essais[Number(b.dataset.essai)] || '';
      champ.focus();
      calculer();
      return;
    }
    if ('neuve' in b.dataset){ o.fermer(); openCapture(); return; }
    if (b.dataset.i != null) jouer(lignes[Number(b.dataset.i)]);
  });
  return { calculer, annuler: () => ctrl?.abort() };
}

const peutDemander = () => { try { return !!peutDemanderAmis && peutDemanderAmis(); } catch (e) { return false; } };
let peutDemanderAmis = null;
import('./reseau.js').then(m => { peutDemanderAmis = m.peutDemanderAmis; }).catch(() => {});

/* ---------- la fenêtre de la barre ----------
   DEUX DESSINS, la même fenêtre (`.modal-barre`, le style décide) :
   · au téléphone, le CHAMP EST EN BAS, là où on l'a touché (la barre du
     bas) et juste au-dessus du clavier ; ce que la barre propose se lit
     au-dessus. Le champ ne saute pas à l'autre bout de l'écran au
     moment où on le touche (la barre d'adresse de Safari, la recherche
     d'iOS, Arc Search font de même) ;
   · à l'ordinateur, une palette : étroite, posée haut, le champ en tête
     et la liste qui grandit dessous. */
function ouvrirFeuille(texte){
  let barre = null;
  const sh = openSheet({ title: 'Chercher', icon: 'search', className: 'modal-barre', focus: '#brQ',
    onClose: () => barre && barre.annuler() });
  sh.body.innerHTML =
    `<label class="br-champ" for="brQ">${ic('search', 'ic-16')}
       <input id="brQ" type="text" placeholder="Entreprise, métier, ville, action…" aria-label="Chercher, ouvrir, ajouter, agir"
              autocomplete="off" enterkeyhint="go" role="combobox" aria-expanded="true" aria-controls="brListe"
              aria-autocomplete="list" ${clavier('cherche')}>
     </label>
     <div class="br-liste" id="brListe"></div>`;
  const champ = sh.body.querySelector('#brQ');
  /* « Nouvelle piste » ferme la liste, barre vide : la dernière ligne —
     au téléphone, celle qui touche le champ, sous le pouce. Plus de
     bouton au pied : le pied, au téléphone, c'est le champ lui-même. */
  barre = monter(champ, sh.body.querySelector('#brListe'),
    { fermer: () => sh.close(), peutDemander, vide: true, suivre: mqLarge.matches });
  if (texte) champ.value = texte;
  barre.calculer();
  return sh;
}

/* ---------- la porte d'entrée : le +, la barre latérale, « / », Ctrl K ----------
   Une seule barre, deux habits : la feuille du téléphone et la palette
   du poste sont la MÊME fenêtre (`.modal-barre`) — le style décide. */
export function ouvrirBarre(texte){
  return ouvrirFeuille(texte);
}
/* au poste : le bouton de la barre latérale, qui a le dessin d'un champ */
export function brancherBarre(){
  $('#cmdOuvrir')?.addEventListener('click', () => ouvrirBarre());
  $('#btnAddTop')?.addEventListener('click', () => openCapture());
}
