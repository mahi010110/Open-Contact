/* ============================================================
   OpenContact · la nouvelle interface · Réseau
   (docs/brief-refonte.md §12, lot 3 ; la maquette validée le
   17 novembre 2026 : « Go »)

   Les gens, et ce qu'ils t'ouvrent. « Mes demandes » en tête, suivies
   comme un colis ; les conversations (la classe, les amis) ; « Mes
   amis » et ce que chacun t'ouvre ; Donner · Recevoir en bas. Le
   premier jour : rejoindre sa classe, ajouter un ami, recevoir des
   pistes.

   Au téléphone, une conversation, un ami, une demande, un groupe sont
   des PAGES poussées. Au poste, la liste à gauche, ce qu'on ouvre à
   droite, et la conversation en fenêtre (8.1.0, choisi par le
   mainteneur). LE CALME : aucun chiffre ; l'onglet change de couleur
   quand quelque chose attend.

   La mécanique (relais, boîte aux lettres, groupes) vit à côté
   (ecrans/boite.js, ecrans/groupes.js, ecrans/messages.js) : les mêmes
   données et les mêmes lettres que l'app actuelle.
   ============================================================ */
import { $, $$, ic, esc, remplacer, prenomDe } from './outils.js';
import { S, saveData, saveProfile, logJ, deletePiste, undeletePiste } from './etat.js';
import { C, inscrirePage, pousser, retour, rendre, allerA, annuler, toast, cles, pageOuverte,
         ouvrirFeuille, rendreFeuille, fermerFeuille, feuilleOuverte } from './coque.js';
import { todayISO, uid } from '../engine/utils.js';
import { normalizeCompany } from '../engine/model.js';
import { ceQuOuvre, direExperience, direQuoi, statutAmi, ajouterAmi, retirerAmi, prenomAmi, memeEntreprise } from '../engine/amis.js';
import { direAide } from '../engine/aide.js';
import { codeAffiche, lireInvitation, lirePorte, nomGroupe, GROUPES_MAX, NOM_MAX, DUREES } from '../engine/groupe.js';
import { CRITERE_METIER, villeDeTable, phraseCritere } from '../engine/critere.js';
import { CERCLE_MAX, pourCherche } from '../engine/boite.js';
import { encodeOCA } from '../engine/exchange.js';
import { makeQrSvg } from './qr.js';
import { envoyerTexte, partagePossible } from './fichier.js';
import { visageHTML, blasonHTML } from './visage.js';
import { quandJour } from './dates.js';
import { chargerReseau, demarrerReseau, assurerBoite, assurerIdAmi, prenomMoi, amisJoignables, amiDe, profilDonneIci,
         donnerMonProfil, direAdieu, reprendreMonProfil, mesDemandes, demandeDe, suivi, donPour, quiDonne, aQui, quoiDe,
         phraseDemande, placePourDemander, destinataires, quiDeListe, demander, ajouterDon, recueDe, choixPour, ditChoix,
         quiCherche, donnerRecue, donnerConnu, suivreAmis, masquerRecue, messagesEnAttente, pisteDuDon, recuesAVoir,
         ditTrouve, trouvePour, parDe } from './boite.js';
import { chargerGroupes, demarrerGroupes, mesGroupes, groupe, nomDe, membresVus, moiId, roleDe, jeSuisChef, peutRegler,
         surDemande, reglagesIci, DUREE_DITE, creer, etatInvitation, rejoindre, etatPorte, frapper, invitationDe,
         publierReglages, changerEntree, nouvelleInvitation, quitter, supprimerPourTous, gestesSur, nommer as nommerAdjoint,
         retirerMessage, retirerMembre, masquer, relayerVers, groupesPlein, lirePistes, repondreAEntree, avis, chefDe,
         jEcris } from './groupes.js';
import { chargerMessages, oublierAmi } from './messages.js';
import { chargerFils, rangsBoite, attendReseau, ilYaQuelqueChose, epingler, couperSon, oublierConversation } from './fils.js';
import { convPage, brancherConv, arreterEcoute, preparer, envoyerConv, voirAvant, nommer, ligneConv, parseCle, existe,
         titreConv } from './conversation.js';
import { pageDonner, gesteDon, commencerDon, pageQR, animerQR, ouvrirRecevoir, pageApercu, prendre, montrerApercu } from './echange.js';
import { ouvrirPiste, ouvrirEcrire } from './pistes.js';

/* ce que l'écran garde, le temps de la session */
export const R = { sel: null, conv: null, don: null, recu: null, qr: null };
const pl = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/* « sept. 2025 » */
const moisAn = m => { const [y, mo] = String(m).split('-'); return mo ? MOIS_C[Number(mo) - 1] + ' ' + y : y; };
const insec = t => String(t).replace(/« /g, '« ').replace(/ »/g, ' »').replace(/ ([?!:;])/g, ' $1');

/* ---------- ouvrir, refermer ---------- */
export function ouvrirR(t, id = '', depuis){
  if (C.onglet !== 'reseau') allerA('reseau');
  if (t === 'conv'){
    preparer(id);
    if (C.poste){ R.conv = id; rendre(); return; }
    pousser({ t: 'conv', id }, depuis);
    return;
  }
  if (C.poste){ R.sel = { t, id }; rendre(); return; }
  pousser({ t, id }, depuis);
}
export function fermerR(){
  if (C.poste){ R.sel = null; rendre(); return; }
  if (pageOuverte()) retour();
}

/* ---------- les lignes ---------- */
/* une demande, suivie comme un colis : trois cases */
function colis(d){
  const { etapes, courante } = suivi(d);
  const c = etapes.map((x, i) => courante === -1 || i < courante ? 'p' : i === courante ? 'm' : '');
  return `<div class="colis" aria-hidden="true">${c.map(x => `<i${x ? ` class="${x}"` : ''}></i>`).join('')}</div>`;
}
function sousDemande(d){
  if (d.attente) return { t: 'Partira dès que le réseau revient' };
  const don = donPour(d.id);
  if (don && don.statut === 'nouveau') return { t: don.soi ? `Reçu : le contact de ${don.de.prenom}` : `Reçu : ${don.contact.name}, par ${quiDonne(don)}`, plus: true };
  if (don && don.statut === 'ajoute') return { t: `${don.contact.name} est dans tes pistes` };
  const { etapes } = suivi(d);
  if (etapes[1].at) return { t: 'Trouvée, en attente de son accord' };
  if (d.exp <= Date.now()) return { t: 'Personne n’a été trouvé' };
  return { t: 'Envoyée ' + quandJour(d.at) };
}
const selOn = (t, id) => C.poste && !R.conv && !!R.sel && R.sel.t === t && R.sel.id === id;
function ligneDemande(d){
  const s = sousDemande(d), on = selOn('demande', d.id);
  return `<div class="rang conv${on ? ' on' : ''}" data-a="r-demande" data-id="${esc(d.id)}" role="button" tabindex="0">`
    + `<div class="r-c"><b>Quelqu’un ${esc(quoiDe(d))}</b><span${s.plus ? ' class="plus"' : ''}>${esc(s.t)}</span></div>${colis(d)}</div>`;
}
/* ce qu'un ami t'ouvre, dit d'une ligne : « en alternance chez OVH · +1 » */
const CHEZ = { alternance: ['en alternance chez', 'a été en alternance chez'], stage: ['en stage chez', 'a fait son stage chez'],
  emploi: ['travaille chez', 'a travaillé chez'] };
const direChez = l => (CHEZ[l.quoi] ? CHEZ[l.quoi][l.enCours ? 0 : 1] + ' ' : '') + l.entreprise;
function ligneAmi(a){
  const o = ceQuOuvre(a, S.companies, todayISO()), l = o.lignes[0];
  const on = selOn('ami', a.id);
  return `<div class="rang conv${on ? ' on' : ''}" data-a="r-ami" data-id="${esc(a.id)}" role="button" tabindex="0">${visageHTML(a.id)}`
    + `<div class="r-c"><b>${esc(a.nom)}</b><span${l ? ' class="plus"' : ''}>${esc(l ? direChez(l) + (o.lignes.length > 1 ? ' · +' + (o.lignes.length - 1) : '') : 'aucune entreprise')}</span></div>${ic('chevron-right')}</div>`;
}
/* ce qu'on me demande, et que mon téléphone a trouvé : qui je peux
   donner se lit en accent */
function ligneRecue(r){
  const t = trouvePour(r);
  const cle = r.par ? r.par.cle : r.de.cle, ami = (S.profile.amis || []).find(a => a.cle === cle);
  return `<div class="rang conv" data-a="r-recue" data-id="${esc(r.id)}" role="button" tabindex="0">${visageHTML(ami ? ami.id : cle)}`
    + `<div class="r-c"><b>Quelqu’un ${esc(quoiDe(r))}</b><span class="plus">${esc([r.par ? `pour ${r.de.prenom}, par ${parDe(r)}` : 'pour ' + r.de.prenom, t ? ditTrouve(t) : ''].filter(Boolean).join(' · '))}</span></div>${ic('chevron-right')}</div>`;
}
const plusR = (a, mot, icone = 'plus') => `<button class="rang plus-r" data-a="${a}">${ic(icone)}${esc(mot)}</button>`;
const peutDemanderIci = () => placePourDemander() && (amisJoignables().length > 0 || mesGroupes().length > 0);

function listeHTML(){
  const amis = S.profile.amis || [];
  if (!ilYaQuelqueChose())
    return '<div class="panneau"><p>Ta classe et tes amis apparaissent ici.<br>Ils te disent où ils sont passés et qui contacter.</p>'
      + '<button class="btn p" data-a="r-rejoindre">Rejoindre ma classe</button><button class="btn" data-a="r-ajami">Ajouter un ami</button>'
      + '<button class="btn" data-a="r-recevoir">Recevoir des pistes</button></div>';
  let h = '';
  const na = messagesEnAttente();
  if (navigator.onLine === false || na) h += `<div class="hl-l">${ic('clock')}<span>${na
    ? `Pas de réseau : ${pl(na, 'message')} partir${na > 1 ? 'ont' : 'a'} dès qu’il revient.` : 'Pas de réseau : ce qui arrive attendra son retour.'}</span></div>`;
  const recues = recuesAVoir();
  if (recues.length) h += '<div class="s-et">On te demande</div><div class="rangs s-liste">' + recues.map(ligneRecue).join('') + '</div>';
  const dem = mesDemandes();
  h += '<div class="s-et">Mes demandes</div><div class="rangs s-liste">' + dem.map(ligneDemande).join('')
    + (peutDemanderIci() ? plusR('r-demander', 'Demander quelqu’un') : '')
    + (!dem.length && !peutDemanderIci() ? '<p class="vide-r">Tes amis et ta classe répondront ici.</p>' : '') + '</div>';
  const rangs = rangsBoite();
  h += '<div class="s-et">Conversations</div><div class="rangs s-liste">'
    + rangs.map(r => ligneConv(r, C.poste && R.conv === r.cle)).join('')
    + (groupesPlein() ? '' : plusR('r-rejoindre', mesGroupes().length ? 'Nouveau groupe' : 'Rejoindre ma classe')) + '</div>';
  h += `<div class="s-et">Mes amis${amis.length ? ' · ' + amis.length : ''}</div><div class="rangs s-liste">`
    + amis.slice().sort((x, y) => x.nom.localeCompare(y.nom, 'fr')).map(ligneAmi).join('') + plusR('r-ajami', 'Ajouter un ami') + '</div>';
  return h;
}
const basHTML = () => ilYaQuelqueChose()
  ? '<div class="pied r-bas"><button class="btn" data-a="r-donner">Donner des pistes</button><button class="btn" data-a="r-recevoir">Recevoir</button></div>' : '';

/* ============================================================
   LES PAGES
   ============================================================ */
/* UN AMI : ce qu'il t'ouvre, chaque entreprise avec « Garder » ou
   « Voir la piste » ; lui écrire ; le retirer, en rouge, en dernier */
function pageAmi(id){
  const a = amiDe(id);
  if (!a) return { titre: 'Ami', corps: '<div class="panneau"><p>Cet ami n’est plus dans ta liste.</p></div>' };
  const o = ceQuOuvre(a, S.companies, todayISO());
  const aide = direAide(a.aide);
  const depuis = a.recu ? 'ami depuis ' + quandJour(a.recu) : '';
  const lignes = o.lignes.map(l => {
    const q = [direQuoi(l.quoi, l.enCours), l.debut ? (l.enCours ? 'depuis ' : 'en ') + moisAn(l.debut) : ''].filter(Boolean).join(' ');
    return `<div class="pers"><div class="r-c"><b>${esc(l.entreprise)}</b><span class="plus">${esc(q)}</span></div>`
      + (l.pisteId ? `<button class="btn s" data-a="r-piste" data-id="${esc(l.pisteId)}">Voir la piste</button>`
        : `<button class="btn s" data-a="r-garder" data-id="${esc(id)}" data-v="${esc(l.entreprise)}">Garder</button>`) + '</div>';
  }).join('');
  const h = `<div class="s-page"><div class="ami-t">${visageHTML(a.id, 'grand')}<div><h4>${esc(a.nom)}</h4>`
    + `<div class="lieu">${esc([depuis, aide].filter(Boolean).join(' · '))}</div></div></div>`
    + `<fieldset class="gb"><legend>Ce que ${esc(prenomAmi(a))} t’ouvre</legend>${lignes || '<p class="doux">Aucune entreprise pour l’instant.</p>'}</fieldset>`
    + (a.cle ? '' : `<p class="doux">${ic('reload')}Rescanne son QR pour lui écrire.</p>`)
    + `<div class="bas-p"><button class="btn s danger" data-a="r-retirer" data-id="${esc(id)}">${ic('trash')}Retirer de mes amis</button></div></div>`;
  return { titre: 'Ami', corps: h, pied: a.cle ? `<button class="btn p" data-a="r-ecrire" data-id="${esc(id)}">${ic('message-text')}Écrire à ${esc(prenomAmi(a))}</button>` : '' };
}

/* UNE DEMANDE, suivie comme un colis : la phrase, à qui, trois étapes,
   et le contact reçu, qu'on ajoute d'un tap */
function pageDemande(id){
  const d = demandeDe(id);
  if (!d) return { titre: 'Demande', corps: '<div class="panneau"><p>Cette demande est terminée.</p></div>' };
  const { etapes, courante } = suivi(d), don = donPour(d.id);
  const NOMS_E = ['Envoyée', 'Trouvée', 'Reçu'];
  const sous = (x, i) => i === 0 && d.attente ? 'partira avec le réseau' : i === courante ? 'en cours' : x.at ? (i === 1 && x.par ? 'chez un ami de ' + x.par : i === 1 && x.ou === 'groupe' ? 'dans un groupe' : quandJour(x.at)) : 'à venir';
  let h = `<div class="s-page"><blockquote class="cite">${esc(insec(phraseDemande(prenomMoi() || 'Toi', quoiDe(d), d.cherche)))}</blockquote>`
    + `<p class="doux a-qui-d">À ${esc(aQui(d))}</p>`
    + `<ol class="colis-g">${etapes.map((x, i) => {
      const fait = courante === -1 || i < courante, cours = i === courante;
      return `<li class="colis-e"${cours ? ' aria-current="step"' : ''}><div class="barre-c"><i style="width:${fait ? 100 : cours ? 50 : 0}%"></i></div><b>${NOMS_E[i]}</b><span>${esc(sous(x, i))}</span></li>`;
    }).join('')}</ol>`;
  if (!don && etapes[1].at) h += '<p class="doux">Quelqu’un a été trouvé. Son contact te sera donné s’il est d’accord.</p>';
  else if (!don && d.exp > Date.now()) h += '<p class="doux">Ta demande passe d’elle-même aux amis de tes amis. La réponse arrivera ici.</p>';
  else if (!don) h += '<p class="doux">Personne n’a été trouvé en deux semaines.</p>';
  let pied = '';
  if (don){
    const piste = pisteDuDon(don), role = don.contact.role || (don.soi ? direQuoi(don.soi.quoi, don.soi.maintenant) : '');
    const ami = don.soi && (S.profile.amis || []).find(a => a.cle === don.de.cle);
    h += `<fieldset class="gb"><legend>Reçu</legend><div class="pers prop">${visageHTML(ami ? ami.id : don.contact.name)}<div class="r-c"><b>${esc(don.contact.name)}</b>`
      + `<span>${esc([role, piste ? piste.name : don.entreprise.nom].filter(Boolean).join(' · '))}</span></div></div>`
      + `<p class="doux">${don.soi ? `C’est ${esc(don.de.prenom)} en personne : tu peux lui écrire.` : `Par ${esc(quiDonne(don))}${don.accord ? ', avec son accord pour que tu lui écrives' : ''}.`}</p>`
      + (don.statut === 'ajoute' && don.piste ? `<button class="btn p large" data-a="r-ecrire-don" data-id="${esc(don.piste)}">Écrire à ${esc(prenomDe(don.contact.name))}</button>` : '')
      + '</fieldset>';
    if (don.statut === 'nouveau') pied = `<button class="btn p" data-a="r-ajouter-don" data-id="${esc(don.id)}">${ic('plus')}Ajouter à mes pistes</button>`;
  }
  return { titre: 'Demande', corps: h + '</div>', pied };
}

/* UN GROUPE : son nom, l'invitation, les réglages chez qui peut régler,
   les membres, la sortie — l'ordre des « Infos du groupe » de WhatsApp */
const MEMBRES_VUS = 8;
let tousMembres = '';
function pageGroupe(code){
  if (!mesGroupes().some(g => g.code === code)) return { titre: 'Groupe', corps: '<div class="panneau"><p>Tu n’es plus dans ce groupe.</p></div>' };
  const g = groupe(code), moi = moiId(), r = reglagesIci(code), chef = chefDe(code);
  const autres = membresVus(g).filter(m => m.de !== moi);
  const lignes = [{ de: moi, prenom: (prenomMoi() || 'Toi') + ' (toi)' }, ...autres];
  const vus = tousMembres === code || lignes.length <= MEMBRES_VUS + 1 ? lignes : lignes.slice(0, MEMBRES_VUS);
  const rangee = (a, nom, etat) => `<button class="rang act reg" data-a="${a}" data-id="${esc(code)}"><div class="r-c"><b>${nom}</b><span>${esc(etat)}</span></div>${ic('chevron-right')}</button>`;
  const regl = peutRegler(code) ? [rangee('r-reg-nom', 'Nom', nomDe(code)),
    ...(chef ? [rangee('r-reg-entree', 'Entrée', r.entree === 'demande' ? 'sur demande' : 'ouvert')] : []),
    rangee('r-reg-duree', 'Messages', DUREE_DITE[r.j]),
    ...(chef ? [rangee('r-reg-ecrire', 'Qui écrit', r.ecrire === 'resp' ? 'les responsables' : 'tout le monde')] : [])] : [];
  const h = `<div class="s-page"><div class="ami-t">${blasonHTML(nomDe(code), 'grand')}<div><h4>${esc(nomDe(code))}</h4>`
    + `<div class="lieu">${pl(lignes.length, 'membre')} · messages effacés au bout de ${DUREE_DITE[r.j]}</div></div></div>`
    + `<div class="rangs g-inv"><button class="rang act" data-a="r-inviter" data-id="${esc(code)}">${ic('plus')}<div class="r-c"><b>Inviter</b><span>le QR, le code, ou un message à envoyer</span></div>${ic('chevron-right')}</button></div>`
    + (regl.length ? `<div class="et g-et">Réglages</div><div class="rangs">${regl.join('')}</div>` : '')
    + `<div class="et g-et">Membres</div><div class="rangs">${vus.map(m => {
      const role = roleDe(code, m.de), gestes = m.de !== moi && gestesSur(code, m.de).length;
      const dedans = `${visageHTML(m.de)}<div class="r-c"><b>${esc(m.prenom)}</b>${role ? `<span>${role}</span>` : ''}</div>`;
      return gestes ? `<button class="rang act membre" data-a="r-membre" data-id="${esc(code)}" data-v="${esc(m.de)}">${dedans}${ic('chevron-right')}</button>`
        : `<div class="rang">${dedans}</div>`;
    }).join('')}${vus.length < lignes.length ? `<button class="rang plus-r" data-a="r-tous" data-id="${esc(code)}">Voir les ${lignes.length - vus.length} autres</button>` : ''}</div>`
    + `<div class="bas-p"><button class="btn s danger" data-a="r-quitter" data-id="${esc(code)}">${ic('logout')}Quitter le groupe</button>`
    + (jeSuisChef(code) ? `<button class="btn s danger" data-a="r-supprimer" data-id="${esc(code)}">${ic('trash')}Supprimer le groupe</button>` : '') + '</div></div>';
  return { titre: 'Groupe', corps: h };
}

/* INVITER : le QR, le code (ou la porte d'un groupe « sur demande »), et
   le message à envoyer là où la classe se parle, Discord compris */
const invitations = new Map();   /* code → { txt, porte, svg } */
async function preparerInvitation(code){
  const inv = await invitationDe(code);
  let svg = '';
  try { svg = inv.txt ? await makeQrSvg(inv.txt) : ''; } catch (e) {}
  invitations.set(code, { ...inv, svg });
  rendre();
}
const texteInvitation = (code, inv) => inv.porte
  ? `Demande à entrer dans « ${nomDe(code)} » sur OpenContact. Copie ce message, puis Réseau › Recevoir › Coller un texte :\n${inv.txt}`
  : `Rejoins « ${nomDe(code)} » sur OpenContact : on s’y donne des pistes de stage et d’alternance. Copie ce message, puis Réseau › Recevoir › Coller un texte :\n${inv.txt}`;
function pageInviter(code){
  const inv = invitations.get(code);
  if (!inv){ preparerInvitation(code); return { titre: 'Inviter', corps: `<div class="s-page"><h4>${esc(nomDe(code))}</h4><p class="doux">Un instant…</p></div>` }; }
  const h = `<div class="s-page"><h4>${esc(nomDe(code))}</h4>`
    + (inv.svg ? `<div class="qr-b" role="img" aria-label="Le QR du groupe, à faire scanner">${inv.svg}</div>` : '')
    + (inv.porte ? '<p class="doux centre-t">Qui le scanne demande à entrer : tu acceptes chaque entrée.</p>' : `<p class="code-g">${esc(codeAffiche(code))}</p>`)
    + '<p class="doux centre-t">Envoie l’invitation là où ta classe se parle : Discord, un groupe de messages.</p>'
    + (jeSuisChef(code) ? `<div class="centre"><button class="btn s" data-a="r-nouvelle-inv" data-id="${esc(code)}">${ic('reload')}Nouvelle invitation</button></div>` : '')
    + '</div>';
  return { titre: 'Inviter', corps: h, pied: inv.txt ? `<button class="btn p" data-a="r-envoyer-inv" data-id="${esc(code)}">${ic(partagePossible() ? 'share' : 'copy')}${partagePossible() ? 'Envoyer l’invitation' : 'Copier l’invitation'}</button>` : '' };
}

/* le registre des pages : au téléphone elles sont poussées, au poste
   elles s'ouvrent à droite */
const PAGES_R = { ami: pageAmi, demande: pageDemande, groupe: pageGroupe, inviter: pageInviter,
  donner: () => pageDonner(), qr: () => pageQR(), apercu: () => pageApercu() };
for (const t of Object.keys(PAGES_R)) inscrirePage(t, {
  titre: p => PAGES_R[t](p.id).titre,
  rendre: p => PAGES_R[t](p.id),
  geste: (a, el, ev) => geste(a, el, ev),
  apres: (p, ecran) => apresPage(t, ecran)
});
inscrirePage('conv', {
  plein: true,
  titre: p => titreConv(p.id),
  rendre: p => convPage(p.id),
  geste: (a, el, ev) => geste(a, el, ev),
  apres: (p, ecran, premier) => { if (existe(p.id)) brancherConv(ecran, p.id, premier); }
});
function apresPage(t, z){
  arreterEcoute();
  if (t === 'qr') animerQR(z);
}

/* ============================================================
   LES FEUILLES : une question courte chacune
   ============================================================ */
/* un groupe et une demande voient ton PRÉNOM : sans nom, la feuille le
   demande d'abord, et le garde dans ton profil */
const champPrenom = () => prenomMoi() ? '' : '<label class="fld"><span class="et">Ton prénom</span><input class="r-prenom" type="text" autocomplete="given-name" autocorrect="off" spellcheck="false" maxlength="40"></label><p class="err r-err-p" hidden></p>';
function lirePrenom(){
  if (prenomMoi()) return true;
  const f = $('.couche-f .r-prenom'), v = f ? f.value.replace(/\s+/g, ' ').trim() : '';
  if (!v){ const e = $('.couche-f .r-err-p'); if (e){ e.textContent = 'Il manque ton prénom.'; e.hidden = false; } if (f) f.focus(); return false; }
  S.profile.name = v;
  saveProfile();
  return true;
}
const erreurF = (sel, txt, champ) => { const e = $('.couche-f ' + sel); if (e){ e.textContent = txt; e.hidden = false; } if (champ){ const c = $('.couche-f ' + champ); if (c) c.focus(); } };
function feuille(type, o = {}){
  const f = { type, ...o, titre: o.titre || TITRES[type], rendre: rendreF, geste: gesteF, apres: z => apresF(z, f) };
  ouvrirFeuille(f);
  return f;
}
const TITRES = { demander: 'Demande', rejoindre: 'Groupe', ami: 'Ami', repondre: 'Répondre', menu: 'Conversation', membre: 'Membre',
  reglage: 'Réglage', confirmer: 'Nouvelle invitation ?' };
const METIERS = ['cyber', 'reseau', 'dev', 'cloud', 'data', 'support'];
function rendreF(f){
  if (f.type === 'demander'){
    const ville = villeDeTable(S.profile.ville) ? S.profile.ville : '';
    const sans = S.companies.filter(c => !c.closedReason && !c.demo && !(c.contacts || []).length);
    const quoi = f.mode === 'entreprise' ? (f.e && S.companies.find(c => c.id === f.e) ? 'chez ' + S.companies.find(c => c.id === f.e).name : '')
      : phraseCritere({ metier: f.m, ville });
    f.quoi = quoi;
    const corps = `<div class="seg canaux" role="group" aria-label="Tu cherches quelqu’un"><button data-a="f-mode" data-v="metier" aria-pressed="${f.mode === 'metier'}"${f.mode === 'metier' ? ' class="on"' : ''}>Dans un métier</button>`
      + `<button data-a="f-mode" data-v="entreprise" aria-pressed="${f.mode === 'entreprise'}"${f.mode === 'entreprise' ? ' class="on"' : ''}>Chez une entreprise</button></div>`
      + (f.mode === 'metier' ? `<div class="puces">${METIERS.map(k => `<button class="puce${f.m === k ? ' on' : ''}" data-a="f-m" data-v="${k}" aria-pressed="${f.m === k}">${esc(CRITERE_METIER[k].replace(/^dans (la |le |l’|une |un )?/, '').replace(/^./, x => x.toUpperCase()))}</button>`).join('')}</div>`
        : sans.length ? `<div class="puces">${sans.slice(0, 12).map(c => `<button class="puce${f.e === c.id ? ' on' : ''}" data-a="f-e" data-v="${esc(c.id)}" aria-pressed="${f.e === c.id}">${esc(c.name)}</button>`).join('')}</div>`
        : '<p class="doux">Toutes tes pistes ont déjà quelqu’un à qui écrire.</p>')
      + champPrenom()
      + (quoi ? `<div class="et" style="margin-top:14px">Ce qui part</div><blockquote class="cite">${esc(insec(phraseDemande(prenomMoi() || '[ton prénom]', quoi, S.profile.recherche)))}</blockquote>`
        + `<p class="doux a-qui-d">À ${esc(quiDeListe(destinataires()))}${amisJoignables().length ? ', puis à leurs amis' : ''}</p>` : '')
      + '<p class="err r-err" hidden></p>';
    return { corps, pied: `<button class="btn p" data-a="f-demander"${quoi ? '' : ' disabled'}>Envoyer</button>` };
  }
  if (f.type === 'rejoindre'){
    if (f.mode === 'creer') return { corps: champPrenom() + `<label class="fld"><span class="et">Nom du groupe</span><input class="r-nomg" type="text" maxlength="${NOM_MAX}" placeholder="ex : BTS SIO Lille" autocomplete="off" autocorrect="off" spellcheck="false"></label><p class="err r-err-g" hidden></p>`,
      pied: '<button class="btn p" data-a="f-creer">Créer</button>' };
    return { corps: champPrenom() + `<label class="fld"><span class="et">Le code de ta classe</span><input class="r-code" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="ex : k7m3p-9xq2f-h4tn8"></label><p class="err r-err-c" hidden></p>`
      + `<button class="btn" data-a="f-scan-code">${ic('grid-3x3')}Scanner le QR</button>`
      + `<p class="doux">${prenomMoi() ? `Le groupe verra ton prénom : ${esc(prenomMoi())}.` : 'Le groupe verra ton prénom, et rien d’autre.'}</p>`
      + '<button class="lien" data-a="f-creer-mode">Pas encore de groupe ? Créer celui de ta classe</button>',
      pied: '<button class="btn p" data-a="f-rejoindre">Rejoindre</button>' };
  }
  if (f.type === 'ami'){
    if (!prenomMoi()) return { corps: '<p class="doux">Ton ami verra ton nom : c’est lui qui te reconnaît.</p>' + champPrenom()
      .replace('Ton prénom', 'Ton nom').replace('given-name', 'name'), pied: '<button class="btn p" data-a="f-nom-ok">Montrer mon QR</button>' };
    if (!f.svg){ preparerQRAmi(f); return { corps: '<p class="doux centre-t">Un instant…</p>' }; }
    const d = f.donne;
    return { corps: `<div class="qr-b" role="img" aria-label="Mon profil en QR, à faire scanner">${f.svg}</div>`
      + `<p class="doux centre-t">Il contient ton nom, ${esc(d.nom)}${d.parcours.length ? ', et où tu es passé : ' + esc(d.parcours.map(e => e.entreprise).join(', ')) : ''}.</p>`
      + `<div class="centre"><button class="btn" data-a="f-scan-ami">${ic('grid-3x3')}Scanner le sien</button></div>`,
      pied: `<button class="btn p" data-a="f-envoyer-profil">${ic(partagePossible() ? 'share' : 'copy')}${partagePossible() ? 'Envoyer mon profil' : 'Copier mon profil'}</button>` };
  }
  if (f.type === 'repondre') return rendreRepondre(f);
  if (f.type === 'menu'){
    const r = f.r;
    const rangs = [['f-epingler', 'bookmark', r.epingle ? 'Désépingler' : 'Épingler'], ['f-son', 'bell-off', r.muet ? 'Remettre le son' : 'Couper le son'],
      ...(r.n ? [['f-lu', 'check', 'Marquer comme lu']] : [])];
    return { corps: `<div class="rangs">${rangs.map(([a, i, m]) => `<button class="rang act" data-a="${a}">${ic(i)}<div class="r-c"><b>${m}</b></div></button>`).join('')}</div>` };
  }
  if (f.type === 'membre'){
    const v = groupe(f.code).membres[f.de] || {}, gestes = gestesSur(f.code, f.de);
    return { corps: `<div class="ami-t">${visageHTML(f.de, 'grand')}<div><h4>${esc(v.prenom || '')}</h4></div></div>`
      + (gestes.includes('nommer') ? `<div class="centre" style="margin-top:14px"><button class="btn" data-a="f-nommer">${ic('check')}Nommer adjoint</button></div>` : '')
      + (gestes.includes('retirer') ? `<div class="bas-p"><button class="btn s danger" data-a="f-retirer-membre">${ic('trash')}Retirer du groupe</button></div>` : '') };
  }
  if (f.type === 'msg') return { corps: `<p class="doux">${esc(f.dit)}</p><div class="bas-p"><button class="btn s danger" data-a="f-retirer-msg">${ic('eye-off')}Retirer ce message</button></div>` };
  if (f.type === 'reglage'){
    if (f.cle === 'nom') return { corps: `<label class="fld"><span class="et">Nom du groupe</span><input class="r-nomg" type="text" maxlength="${NOM_MAX}" value="${esc(nomDe(f.code))}" autocomplete="off"></label><p class="err r-err-g" hidden></p>`,
      pied: '<button class="btn p" data-a="f-reg-nom">Enregistrer</button>' };
    const r = reglagesIci(f.code);
    const OPT = { entree: [['ouvert', 'Ouvert'], ['demande', 'Sur demande']], duree: DUREES.map(j => [String(j), DUREE_DITE[j]]),
      ecrire: [['tous', 'Tout le monde'], ['resp', 'Les responsables']] }[f.cle];
    const actuel = { entree: r.entree, duree: String(r.j), ecrire: r.ecrire }[f.cle];
    const DIT = { entree: { ouvert: 'Qui a l’invitation entre.', demande: 'Les responsables acceptent chaque entrée.' } }[f.cle];
    return { corps: `<div class="rangs" role="radiogroup">${OPT.map(([v, m]) => `<button class="rang act choix" data-a="f-reg" data-v="${esc(v)}" role="radio" aria-checked="${v === actuel}"><div class="r-c"><b>${esc(m)}</b></div>${v === actuel ? ic('check') : ''}</button>`).join('')}</div>`
      + (DIT && DIT[actuel] ? `<p class="doux">${esc(DIT[actuel])}</p>` : '') + '<p class="err r-err" hidden></p>' };
  }
  if (f.type === 'confirmer') return { corps: '<p>L’ancienne invitation ne marchera plus. Les membres restent dans le groupe.</p><p class="err r-err" hidden></p>',
    pied: '<button class="btn" data-a="fermer-f">Garder</button><button class="btn p" data-a="f-confirmer">Changer</button>' };
  return { corps: '' };
}
function apresF(z, f){
  const ent = (sel, a) => { const i = $(sel, z); if (i && !i.__b){ i.__b = true; i.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); gesteF(a, i, e, f); } }); } };
  ent('.r-code', 'f-rejoindre'); ent('.r-nomg', f.type === 'reglage' ? 'f-reg-nom' : 'f-creer');
  if (f.type === 'ami' && !prenomMoi()) ent('.r-prenom', 'f-nom-ok');
}
async function preparerQRAmi(f){
  if (f.prepa) return;
  f.prepa = true;
  try {
    await assurerBoite();
    assurerIdAmi();
    f.donne = profilDonneIci(S.profile, S.companies);
    f.txt = await encodeOCA(f.donne);
    f.svg = await makeQrSvg(f.txt);
  } catch (e) { f.svg = '<p class="err">Ce navigateur est trop ancien pour un QR.</p>'; }
  if (feuilleOuverte() === f) rendreFeuille();
}

/* RÉPONDRE à la demande d'un camarade : ce que mon téléphone a trouvé
   d'abord, « Je connais quelqu'un », « Faire suivre », « Masquer ». La
   réponse va à qui demande, jamais au groupe. */
function rendreRepondre(f){
  const r = recueDe(f.id), x = f.x;
  const phrase = r ? `${r.de.prenom}${r.par ? ', par ' + parDe(r) + ',' : ''} cherche quelqu’un ${quoiDe(r)}${pourCherche(r.cherche)}.`
    : `${x.prenom} cherche quelqu’un ${x.quoi}.`;
  const tete = `<blockquote class="cite">${esc(insec(phrase))}</blockquote>`;
  if (f.mode === 'connais') return { corps: `<p class="doux">${esc(r ? r.de.prenom : x.prenom)} le recevra directement, sans passer par le groupe.</p>`
      + '<label class="fld"><span class="et">Son nom</span><input class="r-cn" type="text" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="80"></label>'
      + '<label class="fld"><span class="et">Son e-mail ou son téléphone</span><input class="r-cc" type="text" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" maxlength="120"></label><p class="err r-err" hidden></p>',
    pied: `<button class="btn" data-a="f-rep-retour">Retour</button><button class="btn p" data-a="f-donner-connu">Donner à ${esc(r ? r.de.prenom : x.prenom)}</button>` };
  if (f.mode === 'donner'){
    const c = choixPour(r)[f.i || 0];
    const p = prenomDe(c.ct.name);
    const lien = !c.soi && (c.ct.email || c.ct.phone) ? (c.ct.email
      ? `mailto:${c.ct.email}?subject=${encodeURIComponent('Je peux te présenter quelqu’un ?')}&body=${encodeURIComponent(`Bonjour ${p}, ${r.de.prenom} cherche quelqu’un ${quoiDe(r)}. Je peux lui donner ton contact ?`)}`
      : `sms:${String(c.ct.phone).replace(/[^\d+]/g, '')}?&body=${encodeURIComponent(`Bonjour ${p}, ${r.de.prenom} cherche quelqu’un ${quoiDe(r)}. Je peux lui donner ton contact ?`)}`) : '';
    return { corps: tete + `<div class="pers prop">${visageHTML(c.soi && S.profile.amiId ? S.profile.amiId : c.ct.name)}<div class="r-c"><b>${esc(c.ct.name)}</b><span>${esc([ditChoix(r, c), c.ct.email || c.ct.phone].filter(Boolean).join(' · '))}</span></div></div>`
      + (c.soi ? '' : `<label class="ck accord">${ic(f.accord ? 'checkbox-on' : 'checkbox')}<input type="checkbox" class="visuellement-cache r-accord" data-a="f-accord"${f.accord ? ' checked' : ''}><span class="ck-t"><b>${esc(p)} est d’accord</b></span></label>`
        + (lien ? `<a class="lien" href="${esc(lien)}">Lui demander</a>` : ''))
      + '<p class="err r-err" hidden></p>',
      pied: `<button class="btn" data-a="f-rep-retour">Retour</button><button class="btn p" data-a="f-donner">${esc(c.soi ? `${r.de.prenom} peut m’écrire` : f.accord ? 'Présenter ' + p : 'Donner')}</button>` };
  }
  if (f.mode === 'suivre'){
    const autres = (f.code ? mesGroupes().filter(g => g.code !== f.code) : []);
    return { corps: tete + `<div class="rangs">${amisJoignables().length ? `<button class="rang act" data-a="f-suivre-amis">${ic('users')}<div class="r-c"><b>À mes amis</b></div></button>` : ''}`
      + autres.map(g => `<button class="rang act" data-a="f-suivre-g" data-v="${esc(g.code)}">${ic('message-text')}<div class="r-c"><b>À ${esc(nomDe(g.code))}</b></div></button>`).join('') + '</div><p class="err r-err" hidden></p>',
      pied: '<button class="btn" data-a="f-rep-retour">Retour</button>' };
  }
  const choix = r ? choixPour(r) : [];
  const peutSuivre = (!r || (r.cercle || 1) < CERCLE_MAX) && (amisJoignables().length || (f.code && mesGroupes().length > 1));
  return { corps: tete + `<div class="rangs">`
    + choix.map((c, i) => `<button class="rang act" data-a="f-rep-donner" data-v="${i}">${ic('user')}<div class="r-c"><b>${esc(c.soi ? `${r.de.prenom} peut m’écrire` : 'Donner ' + c.ct.name)}</b></div>${ic('chevron-right')}</button>`).join('')
    + `<button class="rang act" data-a="f-rep-connais">${ic('user')}<div class="r-c"><b>Je connais quelqu’un</b></div>${ic('chevron-right')}</button>`
    + (peutSuivre ? `<button class="rang act" data-a="f-rep-suivre">${ic('redo')}<div class="r-c"><b>Faire suivre</b></div>${ic('chevron-right')}</button>` : '')
    + `<button class="rang act" data-a="f-masquer">${ic('eye-off')}<div class="r-c"><b>Masquer</b></div></button></div><p class="err r-err" hidden></p>` };
}
const pasDeReseau = () => erreurF('.r-err', 'Pas de réseau : rien n’est parti. Réessaie quand il revient.');

async function gesteF(a, el, ev, f){
  const v = el && el.getAttribute ? el.getAttribute('data-v') : null;
  /* DEMANDER */
  if (a === 'f-mode'){ f.mode = v; rendreFeuille(); return; }
  if (a === 'f-m'){ f.m = v; rendreFeuille(); return; }
  if (a === 'f-e'){ f.e = v; rendreFeuille(); return; }
  if (a === 'f-demander'){
    if (!lirePrenom() || !f.quoi) return;
    el.disabled = true;
    const ville = villeDeTable(S.profile.ville) ? S.profile.ville : '';
    const cible = f.mode === 'entreprise' ? S.companies.find(c => c.id === f.e) : { critere: { metier: f.m, ...(ville ? { ville } : {}) } };
    const d = await demander(cible);
    el.disabled = false;
    if (!d){ pasDeReseau(); return; }
    fermerFeuille();
    ouvrirR('demande', d.id);
    return;
  }
  /* REJOINDRE, CRÉER */
  if (a === 'f-creer-mode'){ f.mode = 'creer'; rendreFeuille(); const n = $('.couche-f .r-nomg'); if (n) n.focus(); return; }
  if (a === 'f-scan-code'){ fermerFeuille(); ouvrirRecevoir({ mode: 'scan', titre: 'Scanner' }); return; }
  if (a === 'f-rejoindre'){
    if (!lirePrenom()) return;
    const champ = $('.couche-f .r-code'), brut = champ ? champ.value : '';
    if (!brut.trim()){ erreurF('.r-err-c', 'Il manque le code.', '.r-code'); return; }
    const p = lirePorte(brut);
    if (p){ await frapperPorte(p, el); return; }
    const inv = lireInvitation(brut);
    if (!inv){ erreurF('.r-err-c', 'Le code a 15 caractères, en trois blocs de cinq.', '.r-code'); return; }
    await entrerDans(inv, el);
    return;
  }
  if (a === 'f-creer'){
    if (!lirePrenom()) return;
    const champ = $('.couche-f .r-nomg'), nom = nomGroupe(champ ? champ.value : '');
    if (!nom){ erreurF('.r-err-g', 'Il manque un nom.', '.r-nomg'); return; }
    if (mesGroupes().length >= GROUPES_MAX){ erreurF('.r-err-g', `Tu es déjà dans ${GROUPES_MAX} groupes.`); return; }
    el.disabled = true;
    const code = await creer(nom);
    el.disabled = false;
    if (!code){ erreurF('.r-err-g', 'Ce groupe n’a pas pu se créer.'); return; }
    logJ('Groupe créé : ' + nom);
    fermerFeuille();
    ouvrirR('inviter', code);
    return;
  }
  /* AJOUTER UN AMI */
  if (a === 'f-nom-ok'){ if (lirePrenom()) rendreFeuille(); return; }
  if (a === 'f-scan-ami'){ fermerFeuille(); ouvrirRecevoir({ mode: 'scan', titre: 'Scanner' }); return; }
  if (a === 'f-envoyer-profil'){
    const r = await envoyerTexte(`Mon profil OpenContact : colle ce message dans Réseau › Recevoir › Coller un texte :\n${f.txt}`);
    if (r === 'copie'){ el.classList.add('fait'); el.innerHTML = ic('check') + 'Copié'; }
    else if (r === 'echec') toast('Copie impossible ici : montre plutôt le QR.');
    return;
  }
  /* RÉPONDRE */
  if (a === 'f-rep-retour'){ f.mode = ''; rendreFeuille(); return; }
  if (a === 'f-rep-donner'){ f.mode = 'donner'; f.i = Number(v) || 0; f.accord = false; rendreFeuille(); return; }
  if (a === 'f-accord'){ f.accord = !!el.checked; rendreFeuille(); return; }
  if (a === 'f-rep-connais'){ f.mode = 'connais'; rendreFeuille(); const n = $('.couche-f .r-cn'); if (n) n.focus(); return; }
  if (a === 'f-rep-suivre'){ f.mode = 'suivre'; rendreFeuille(); return; }
  if (a === 'f-donner'){
    el.disabled = true;
    const r = recueDe(f.id), c = r && choixPour(r)[f.i || 0];
    const ok = await donnerRecue(f.id, f.i || 0, !!f.accord);
    el.disabled = false;
    if (!ok){ pasDeReseau(); return; }
    fermerFeuille();
    toast(c && c.soi ? `${r.de.prenom} a ton contact.` : `${r.de.prenom} a le contact de ${c.ct.name}.`);
    rendre();
    return;
  }
  if (a === 'f-donner-connu'){
    const nom = ($('.couche-f .r-cn') || {}).value || '', j = (($('.couche-f .r-cc') || {}).value || '').trim();
    const n = nom.replace(/\s+/g, ' ').trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(j) ? j : '', tel = !email && (j.match(/\d/g) || []).length >= 8 ? j : '';
    if (!n){ erreurF('.r-err', 'Il manque son nom.', '.r-cn'); return; }
    if (!email && !tel){ erreurF('.r-err', 'Il manque de quoi le joindre : un e-mail ou un téléphone.', '.r-cc'); return; }
    el.disabled = true;
    const ok = await donnerConnu(f.id, { name: n, email, phone: tel });
    el.disabled = false;
    if (!ok){ pasDeReseau(); return; }
    fermerFeuille();
    toast(`${(recueDe(f.id) || {}).de ? recueDe(f.id).de.prenom : f.x.prenom} a le contact de ${n}.`);
    rendre();
    return;
  }
  if (a === 'f-suivre-amis'){
    const n = await suivreAmis(f.id);
    if (!n){ pasDeReseau(); return; }
    fermerFeuille();
    toast(`Suivie à ${pl(n, 'ami')}.`);
    rendre();
    return;
  }
  if (a === 'f-suivre-g'){
    const x = groupe(f.code).fil.find(y => y.id === f.id);
    if (!x || !await relayerVers(v, x)){ pasDeReseau(); return; }
    fermerFeuille();
    toast(`Suivie dans ${nomDe(v)}.`);
    return;
  }
  if (a === 'f-masquer'){
    if (f.code) await masquer(f.code, f.id); else await masquerRecue(f.id);
    fermerFeuille();
    rendre();
    return;
  }
  /* LE MENU D'UNE CONVERSATION */
  if (a === 'f-epingler' || a === 'f-son' || a === 'f-lu'){
    if (a === 'f-epingler') epingler(f.r.cle);
    else if (a === 'f-son') couperSon(f.r.cle);
    else { const { sorte, id } = parseCle(f.r.cle); if (sorte === 'groupe') (await import('./groupes.js')).vu(id); else (await import('./messages.js')).marquerAmiLu(id); }
    fermerFeuille();
    rendre();
    return;
  }
  /* UN MEMBRE (chez un responsable) */
  if (a === 'f-nommer'){
    const v_ = groupe(f.code).membres[f.de] || {};
    fermerFeuille();
    const defaire = await nommerAdjoint(f.code, f.de);
    if (defaire) annuler(`${v_.prenom} est adjoint`, defaire);
    rendre();
    return;
  }
  if (a === 'f-retirer-membre'){
    const v_ = groupe(f.code).membres[f.de] || {};
    fermerFeuille();
    const defaire = retirerMembre(f.code, f.de);
    if (defaire) annuler(`${v_.prenom} n’est plus dans le groupe`, defaire);
    rendre();
    return;
  }
  if (a === 'f-retirer-msg'){
    fermerFeuille();
    const defaire = await retirerMessage(f.code, f.id);
    if (defaire) annuler('Message retiré', defaire);
    rendre();
    return;
  }
  /* LES RÉGLAGES D'UN GROUPE */
  if (a === 'f-reg-nom'){
    const nom = nomGroupe(($('.couche-f .r-nomg') || {}).value || '');
    if (!nom){ erreurF('.r-err-g', 'Il manque un nom.', '.r-nomg'); return; }
    if (nom === nomDe(f.code)){ fermerFeuille(); return; }
    el.disabled = true;
    const ok = await publierReglages(f.code, { nom });
    el.disabled = false;
    if (!ok){ erreurF('.r-err-g', 'Pas de réseau : le nom n’a pas changé.'); return; }
    fermerFeuille();
    rendre();
    return;
  }
  if (a === 'f-reg'){
    const r = reglagesIci(f.code);
    const actuel = { entree: r.entree, duree: String(r.j), ecrire: r.ecrire }[f.cle];
    if (v === actuel) return;
    $$('.couche-f [data-a="f-reg"]').forEach(b => { b.disabled = true; });
    let ok = false, code = f.code;
    if (f.cle === 'entree'){ code = await changerEntree(f.code, v); ok = !!code; }
    else ok = await publierReglages(f.code, f.cle === 'duree' ? { j: Number(v) } : { ecrire: v });
    if (!ok){ $$('.couche-f [data-a="f-reg"]').forEach(b => { b.disabled = false; }); erreurF('.r-err', 'Pas de réseau : rien n’a changé.'); return; }
    fermerFeuille();
    if (code !== f.code) suivreCode(f.code, code);
    rendre();
    return;
  }
  if (a === 'f-confirmer'){
    el.disabled = true;
    const nc = await nouvelleInvitation(f.code);
    el.disabled = false;
    if (!nc){ erreurF('.r-err', 'Pas de réseau : l’invitation n’a pas changé.'); return; }
    invitations.delete(f.code);
    fermerFeuille();
    suivreCode(f.code, nc);
    rendre();
    return;
  }
}

/* entrer dans un groupe : depuis le code tapé, ou l'aperçu d'une
   invitation reconnue par « Recevoir » */
async function entrerDans(inv, el){
  const e = etatInvitation(inv);
  if (e.fini){ erreurF('.r-err-c', e.dit); return; }
  if (el) el.disabled = true;
  const code = await rejoindre(inv);
  if (el) el.disabled = false;
  if (!code) return;
  logJ('Groupe rejoint : ' + (inv.nom || nomDe(code)));
  fermerFeuille();
  ouvrirR('conv', 'g:' + code);
}
async function frapperPorte(p, el){
  const e = etatPorte(p);
  if (e.dedans){ fermerFeuille(); ouvrirR('conv', 'g:' + e.dedans); return; }
  if (e.fini){ erreurF('.r-err-c', e.dit); erreurF('.r-err', e.dit); return; }
  if (el) el.disabled = true;
  const ok = await frapper(p);
  if (el) el.disabled = false;
  if (!ok){ pasDeReseau(); erreurF('.r-err-c', 'Pas de réseau : ta demande n’est pas partie.'); return; }
  fermerFeuille();
  toast(`Demande partie : ${p.nom || 'le groupe'} t’ouvrira.`);
  rendre();
}
/* un groupe qui change de code sous nos yeux : ce qui était ouvert suit */
function suivreCode(ancien, nouveau){
  const ka = 'g:' + ancien, kn = 'g:' + nouveau;
  if (R.conv === ka) R.conv = kn;
  if (R.sel && R.sel.id === ancien) R.sel = { ...R.sel, id: nouveau };
  if (R.don && R.don.groupe === ancien) R.don.groupe = nouveau;
  const pile = C.piles.reseau || [];
  pile.forEach(p => { if (p.id === ancien) p.id = nouveau; if (p.id === ka) p.id = kn; });
  try { history.replaceState({ ...history.state, pile: pile.map(p => ({ ...p })) }, '', location.href); } catch (e) {}
}
avis.bascule = (ancien, nouveau) => { suivreCode(ancien, nouveau); };
avis.dire = t => toast(t);

/* ---------- les aperçus que « Recevoir » reconnaît en route ---------- */
export function apercuAmiFeuille(f, ami){
  const st = statutAmi(S.profile.amis, ami, S.profile.amiId), pr = prenomAmi(ami);
  f.titre = 'Ami';
  f.rendre = () => {
    const lignes = (ami.parcours || []).map(e => {
      const d = direExperience(e, todayISO());
      const dans = S.companies.some(c => memeEntreprise(c, e));
      return `<div class="rang"><div class="r-c"><b>${esc(e.entreprise)}</b><span class="plus">${esc([d ? d.court : '', dans ? 'dans tes pistes' : ''].filter(Boolean).join(' · '))}</span></div></div>`;
    }).join('');
    const etat = st === 'moi' ? 'C’est ton profil.' : st === 'identique' ? 'Déjà dans tes amis.' : '';
    return { corps: `<div class="ami-t">${visageHTML(ami.id, 'grand')}<div><h4>${esc(ami.nom)}</h4></div></div>`
      + (lignes ? `<div class="rangs" style="margin-top:14px">${lignes}</div>` : '')
      + (etat ? `<p class="doux">${ic('check')}${etat}</p>` : (ami.cle ? `<p class="doux">${esc(pr)} aura aussi ton profil.</p>` : '') + champPrenom().replace('Ton prénom', 'Ton nom')),
      pied: etat ? '<button class="btn p" data-a="fermer-f">OK</button>'
        : `<button class="btn p" data-a="f-ajouter-ami">${ic(st === 'maj' ? 'reload' : 'plus')}${st === 'maj' ? 'Mettre à jour' : 'Ajouter ' + esc(pr)}</button>` };
  };
  f.geste = (a) => {
    if (a !== 'f-ajouter-ami' || !lirePrenom()) return;
    const avant = (S.profile.amis || []).slice();
    S.profile.amis = ajouterAmi(S.profile.amis, ami);
    saveProfile();
    logJ(`${pr} ajouté à tes amis`);
    fermerFeuille();
    /* mon profil part vers lui, après « Annuler » */
    if (ami.cle) donnerMonProfil(ami).catch(() => {});
    annuler(`${pr} ${st === 'maj' ? 'est à jour' : 'est dans tes amis'}`, () => {
      S.profile.amis = avant;
      saveProfile();
      if (ami.cle) reprendreMonProfil(ami).catch(() => {});
    });
    if (C.onglet !== 'reseau') allerA('reseau'); else rendre();
  };
  f.apres = () => {};
  rendreFeuille();
}
export function apercuGroupeFeuille(f, inv){
  const e = etatInvitation(inv);
  f.titre = inv.nom || 'Groupe';
  f.rendre = () => ({ corps: `<div class="ami-t">${blasonHTML(inv.nom || 'Groupe', 'grand')}<div><h4>${esc(inv.nom || 'Un groupe')}</h4></div></div>`
      + champPrenom() + `<p class="doux">${esc(e.dit || (prenomMoi() ? `Le groupe verra ton prénom : ${prenomMoi()}.` : 'Le groupe verra ton prénom, et rien d’autre.'))}</p><p class="err r-err-c" hidden></p>`,
    pied: e.fini ? '<button class="btn p" data-a="fermer-f">OK</button>' : `<button class="btn p" data-a="f-entrer">${e.dedans ? 'Ouvrir' : 'Rejoindre'}</button>` });
  f.geste = (a, el) => { if (a === 'f-entrer' && lirePrenom()) entrerDans(inv, el); };
  f.apres = () => {};
  rendreFeuille();
}
export function apercuPorteFeuille(f, p){
  const e = etatPorte(p);
  f.titre = p.nom || 'Groupe';
  f.rendre = () => ({ corps: `<div class="ami-t">${blasonHTML(p.nom || 'Groupe', 'grand')}<div><h4>${esc(p.nom || 'Un groupe')}</h4><div class="lieu">sur demande</div></div></div>`
      + champPrenom() + `<p class="doux">${esc(e.dit || (prenomMoi() ? `Le groupe verra ton prénom : ${prenomMoi()}.` : 'Le groupe verra ton prénom, et rien d’autre.'))}</p><p class="err r-err" hidden></p><p class="err r-err-c" hidden></p>`,
    pied: e.dedans ? '<button class="btn p" data-a="f-entrer">Ouvrir</button>' : e.fini ? '<button class="btn p" data-a="fermer-f">OK</button>'
      : '<button class="btn p" data-a="f-entrer">Demander à entrer</button>' });
  f.geste = (a, el) => { if (a === 'f-entrer' && lirePrenom()) frapperPorte(p, el); };
  f.apres = () => {};
  rendreFeuille();
}

/* ============================================================
   LES GESTES
   ============================================================ */
function garderEntreprise(amiId, nom){
  const a = amiDe(amiId), e = a && (a.parcours || []).find(x => x.entreprise === nom);
  if (!e) return;
  const c = normalizeCompany({ id: uid(), name: e.entreprise, createdAt: Date.now(), ...(e.siren ? { siren: e.siren } : {}) });
  c.history = [{ d: todayISO(), t: 'Gardée depuis le parcours de ' + prenomAmi(a) }];
  S.companies.push(c);
  saveData();
  logJ('Piste ajoutée depuis le parcours de ' + prenomAmi(a) + ' : ' + c.name, c.id);
  C.vient = 'pistes';
  annuler(`${c.name} gardée`, () => deletePiste(c));
  rendre();
}
function retirerAmiGeste(id){
  const a = amiDe(id);
  if (!a) return;
  const avant = (S.profile.amis || []).slice();
  S.profile.amis = retirerAmi(S.profile.amis, id);
  saveProfile();
  logJ(`${prenomAmi(a)} retiré de tes amis`);
  direAdieu(a).catch(() => {});
  if (C.poste) R.sel = null; else if (pageOuverte()) retour();
  annuler(`${prenomAmi(a)} et toi n’êtes plus amis`, () => {
    S.profile.amis = avant;
    saveProfile();
    reprendreMonProfil(a).catch(() => {});
  });
  /* sa conversation part avec lui, une fois « Annuler » passé */
  setTimeout(() => { if (!amiDe(id)){ oublierAmi(id); oublierConversation('ami', id); } }, 31000);
  rendre();
}
function geste(a, el, ev){
  if (!a.startsWith('r-') && a !== 'piste') return false;
  const id = el ? el.getAttribute('data-id') || '' : '', v = el ? el.getAttribute('data-v') : null;
  if (a === 'r-conv'){ const r = rangsBoite().find(x => x.cle === id); if (r && !r.attente) ouvrirR('conv', id, el); return true; }
  if (a === 'r-ami'){ ouvrirR('ami', id, el); return true; }
  if (a === 'r-demande'){ ouvrirR('demande', id, el); return true; }
  if (a === 'r-recue'){ if (recueDe(id)) feuille('repondre', { id, code: '', mode: '' }); return true; }
  if (a === 'r-groupe'){ tousMembres = ''; ouvrirR('groupe', id, el); return true; }
  if (a === 'r-inviter'){ invitations.delete(id); ouvrirR('inviter', id, el); return true; }
  if (a === 'r-tous'){ tousMembres = id; rendre(); return true; }
  if (a === 'r-ecrire'){ ouvrirR('conv', 'a:' + id, el); return true; }
  if (a === 'r-piste' || a === 'piste'){ ouvrirPiste(id, el); return true; }
  if (a === 'r-garder'){ garderEntreprise(id, v); return true; }
  if (a === 'r-retirer'){ retirerAmiGeste(id); return true; }
  if (a === 'r-demander'){ feuille('demander', { mode: 'metier', m: 'cyber', e: '' }); return true; }
  if (a === 'r-rejoindre'){ feuille('rejoindre', { mode: '', titre: mesGroupes().length ? 'Nouveau groupe' : 'Groupe' }); return true; }
  if (a === 'r-ajami'){ feuille('ami', {}); return true; }
  if (a === 'r-recevoir'){ ouvrirRecevoir(); return true; }
  if (a === 'r-donner'){ commencerDon(id); ouvrirR('donner', id, el); return true; }
  if (a.startsWith('r-don-')) return gesteDon(a, el);
  if (a === 'r-fin-qr'){ R.qr = null; fermerR(); return true; }
  if (a === 'r-prendre'){ prendre(); return true; }
  if (a === 'r-rien'){ R.recu = null; fermerR(); return true; }
  if (a === 'r-ajouter-don'){
    ajouterDon(id).then(x => {
      if (!x) return;
      C.vient = 'pistes';
      annuler(x.neuve ? `Nouvelle piste : ${x.piste.name}` : `Contact ajouté à ${x.piste.name}`, () => x.defaire());
      rendre();
    });
    return true;
  }
  if (a === 'r-ecrire-don'){ ouvrirEcrire(id, 'premier', el); return true; }
  /* une conversation */
  if (a === 'r-envoyer'){ envoyerConv(id); return true; }
  if (a === 'r-avant'){ const z = el.closest('[data-conv]'); if (z) voirAvant(z.getAttribute('data-conv')); return true; }
  if (a === 'r-nommer'){ nommer(el.closest('.ecran, .conv-w'), v); return true; }
  if (a === 'r-fermer-conv'){ R.conv = null; arreterEcoute(); rendre(); return true; }
  if (a === 'r-voir'){
    const [k, mid] = id.split('|'), code = parseCle(k).id;
    lirePistes(code, mid).then(x => {
      if (!x){ toast('Ces pistes ne se lisent pas.'); return; }
      montrerApercu(x.obj, { de: x.de, dans: nomDe(code), groupe: code, id: mid });
    });
    return true;
  }
  if (a === 'r-repondre'){
    const [k, rid] = id.split('|'), { sorte, id: cid } = parseCle(k);
    const x = sorte === 'groupe' ? groupe(cid).fil.find(y => y.id === rid) : null;
    if (!recueDe(rid) && !x) return true;
    const l = x && x.lettre;
    feuille('repondre', { id: rid, code: sorte === 'groupe' ? cid : '', mode: '',
      x: x ? { prenom: x.prenom, quoi: quoiDe(l || {}), id: rid } : null });
    return true;
  }
  if (a === 'r-msg'){
    const [k, mid] = id.split('|'), code = parseCle(k).id, x = groupe(code).fil.find(y => y.id === mid);
    if (x) feuille('msg', { titre: 'Message de ' + x.prenom, code, id: mid, dit: x.texte || `${x.nb} pistes données` });
    return true;
  }
  if (a === 'r-entree'){
    const [oui, eid] = String(v).split('|');
    el.disabled = true;
    repondreAEntree(id, eid, oui === 'oui').then(ok => { if (!ok) toast('Pas de réseau : rien n’est parti.'); rendre(); });
    return true;
  }
  /* un groupe : inviter, régler, quitter */
  if (a === 'r-envoyer-inv'){
    const inv = invitations.get(id);
    if (!inv) return true;
    envoyerTexte(texteInvitation(id, inv)).then(r => {
      if (r === 'copie'){ el.classList.add('fait'); el.innerHTML = ic('check') + 'Copié'; }
      else if (r === 'echec') toast('Copie impossible ici : montre plutôt le QR.');
    });
    return true;
  }
  if (a === 'r-nouvelle-inv'){ feuille('confirmer', { code: id }); return true; }
  if (a === 'r-reg-nom'){ feuille('reglage', { titre: 'Nom', code: id, cle: 'nom', focus: '.r-nomg' }); return true; }
  if (a === 'r-reg-entree'){ feuille('reglage', { titre: 'Entrée', code: id, cle: 'entree' }); return true; }
  if (a === 'r-reg-duree'){ feuille('reglage', { titre: 'Messages', code: id, cle: 'duree' }); return true; }
  if (a === 'r-reg-ecrire'){ feuille('reglage', { titre: 'Qui écrit', code: id, cle: 'ecrire' }); return true; }
  if (a === 'r-membre'){ feuille('membre', { code: id, de: v }); return true; }
  if (a === 'r-quitter' || a === 'r-supprimer'){
    const nom = nomDe(id);
    const defaire = a === 'r-quitter' ? quitter(id) : supprimerPourTous(id);
    if (!defaire) return true;
    if (R.conv === 'g:' + id){ R.conv = null; arreterEcoute(); }
    if (C.poste) R.sel = null;
    else { C.piles.reseau = []; history.replaceState({ ...history.state, pile: [] }, '', '#/reseau'); }
    annuler(a === 'r-quitter' ? `Tu as quitté ${nom}` : `${nom} est supprimé`, defaire);
    rendre();
    return true;
  }
  return false;
}

/* l'appui long (le clic droit au poste) sur une conversation : épingler,
   couper le son, marquer comme lu */
let tLong = null;
function brancherAppuiLong(z){
  if (z.__long) return;
  z.__long = true;
  const ouvrirMenu = row => {
    const r = rangsBoite().find(x => x.cle === row.getAttribute('data-id'));
    if (r) feuille('menu', { titre: r.nom, r });
  };
  z.addEventListener('contextmenu', ev => { const row = ev.target.closest('.rang.conv[data-a="r-conv"]'); if (row){ ev.preventDefault(); ouvrirMenu(row); } });
  z.addEventListener('touchstart', ev => {
    const row = ev.target.closest('.rang.conv[data-a="r-conv"]');
    clearTimeout(tLong);
    if (!row) return;
    tLong = setTimeout(() => { tLong = 'fait'; ouvrirMenu(row); }, 550);
  }, { passive: true });
  const fin = () => { if (tLong !== 'fait') clearTimeout(tLong); };
  z.addEventListener('touchmove', fin, { passive: true });
  z.addEventListener('touchend', ev => { if (tLong === 'fait'){ ev.preventDefault(); tLong = null; } else clearTimeout(tLong); });
  z.addEventListener('touchcancel', fin);
}

/* ============================================================
   L'ONGLET
   ============================================================ */
function rendreTel(ecran){
  arreterEcoute();
  remplacer(ecran, `<div class="defile"><div class="s-tete"><h3>Réseau</h3></div>${listeHTML()}</div>${basHTML()}`);
  brancherAppuiLong(ecran);
}
function rendrePoste(ecran, premier){
  if (premier || !$('.rc1', ecran))
    ecran.innerHTML = '<div class="p-col c1 rc1"><div class="defile r-liste"></div><div class="r-bas-c"></div></div><div class="p-col c2 rc2"></div><div class="r-fen"></div>';
  ecran.classList.toggle('zero', !ilYaQuelqueChose());
  remplacer($('.r-liste', ecran), `<div class="s-tete"><h3>Réseau</h3></div>${listeHTML()}`);
  remplacer($('.r-bas-c', ecran), basHTML());
  brancherAppuiLong($('.r-liste', ecran));
  /* à droite : ce qu'on a ouvert, sinon la première demande, sinon le
     premier ami */
  if (R.sel && !PAGES_R[R.sel.t]) R.sel = null;
  if (!R.sel){
    const d = mesDemandes()[0], a = (S.profile.amis || []).slice().sort((x, y) => x.nom.localeCompare(y.nom, 'fr'))[0];
    if (d) R.sel = { t: 'demande', id: d.id }; else if (a) R.sel = { t: 'ami', id: a.id };
  }
  const rc2 = $('.rc2', ecran);
  const k = R.sel ? R.sel.t + '|' + R.sel.id : '';
  if (R.sel){
    const x = PAGES_R[R.sel.t](R.sel.id);
    const h = `<div class="defile">${x.corps || ''}</div><div class="pied"${x.pied ? '' : ' hidden'}>${x.pied || ''}</div>`;
    if (rc2.getAttribute('data-k') === k) remplacer(rc2, h); else { rc2.innerHTML = h; rc2.setAttribute('data-k', k); }
    if (R.sel.t === 'qr') animerQR(rc2);
  } else { rc2.innerHTML = '<div class="p-vide"><p>Choisis une demande, une conversation ou un ami.</p></div>'; rc2.removeAttribute('data-k'); }
  /* la conversation en fenêtre, posée sur la droite */
  const fen = $('.r-fen', ecran);
  if (R.conv && !existe(R.conv)){ R.conv = null; arreterEcoute(); }
  rc2.classList.toggle('sous-fen', !!R.conv);
  if (R.conv){
    const x = convPage(R.conv), meme = fen.getAttribute('data-k') === R.conv;
    if (!meme){
      fen.innerHTML = `<section class="win conv-w conv" role="dialog" aria-label="${esc(x.titre)}"><div class="tb"><span class="tb-t">${esc(x.titre)}</span>`
        + `<button class="x" data-a="r-fermer-conv" aria-label="Fermer">${ic('close')}</button></div>`
        + `<div class="p-tete"${x.tete ? '' : ' hidden'}>${x.tete || ''}</div><div class="defile fil-d">${x.corps}</div><div class="pied">${x.pied}</div></section>`;
      fen.setAttribute('data-k', R.conv);
      const w = $('.conv-w', fen);
      $('.p-tete', w).__h = x.tete || ''; $('.pied', w).__h = x.pied;
      brancherConv(w, R.conv, true);
      const ta = $('.m-in', w);
      if (ta) ta.focus({ preventScroll: true });
    } else {
      const w = $('.conv-w', fen);
      const poser = (z, h) => { z.hidden = !h; if (z.__h === h) return; remplacer(z, h); z.__h = h; };
      $('.tb-t', w).textContent = x.titre;
      poser($('.p-tete', w), x.tete || '');
      remplacer($('.defile', w), x.corps);
      poser($('.pied', w), x.pied);
      brancherConv(w, R.conv, false);
    }
  } else { if (fen.firstChild){ fen.innerHTML = ''; arreterEcoute(); } fen.removeAttribute('data-k'); }
}

let demarre = false;
function demarrer(){
  if (demarre) return;
  demarre = true;
  Promise.all([chargerReseau(), chargerGroupes(), chargerMessages(), chargerFils()]).then(() => rendre());
  demarrerReseau();
  demarrerGroupes();
}

export default {
  id: 'reseau',
  attend: () => { demarrer(); return attendReseau(); },
  rendre(ecran, { poste, premier }){ demarrer(); (poste ? rendrePoste : rendreTel)(ecran, premier); },
  geste(a, el, ev){ geste(a, el, ev); },
  quitter(){ arreterEcoute(); },
  clavier(ev, { champ, poste }){
    if (!poste) return false;
    if (ev.key === 'Escape' && R.conv && (!champ || ev.target.closest('.conv-w'))){ ev.preventDefault(); R.conv = null; arreterEcoute(); rendre(); return true; }
    if (champ) return false;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){
      const l = $$('.ecran .r-liste [role="button"][data-a]');
      if (!l.length) return false;
      ev.preventDefault();
      const i = l.indexOf(document.activeElement);
      const j = i < 0 ? 0 : Math.min(l.length - 1, Math.max(0, i + (ev.key === 'ArrowDown' ? 1 : -1)));
      l[j].focus();
      l[j].scrollIntoView({ block: 'nearest' });
      return true;
    }
    return false;
  },
  etat(){
    const na = (S.profile.amis || []).length, ng = mesGroupes().length;
    return `<span>${pl(na, 'ami')}</span><span>${pl(ng, 'groupe')}</span>`
      + cles([ilYaQuelqueChose() ? [['↑', '↓'], 'choisir'] : null, ilYaQuelqueChose() ? [['↵'], 'ouvrir'] : null, R.conv ? [['Échap'], 'fermer'] : null]);
  }
};
