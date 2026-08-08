/* ============================================================
   OpenContact — interface · mon groupe
   Les camarades, et le profil qu'on échange avec eux.

   CE QUE CET ÉCRAN DOIT ÊTRE, ET SURTOUT PAS ÊTRE. Pas un carnet
   d'adresses : l'app est un outil d'action (§1), et une liste de noms
   qu'on ne fait que consulter serait le premier écran mort du produit.
   Chaque ligne porte donc ce qui a RÉELLEMENT circulé avec la
   personne, et mène à un geste — lui écrire, ou lui demander une
   entrée quelque part.

   POURQUOI LE PRÉNOM SUFFIT À CHANGER LES CHIFFRES. « Léa y a fait son
   stage » sur une fiche ne mène nulle part tant que Léa n'est
   personne. Le groupe est ce qui transforme une déclaration en geste :
   c'est le seul rôle de ce fichier, et le reste en découle.

   POURQUOI ON NE POUSSE PAS VERS LE MAIL. Mesuré (Roghanizad & Bohns,
   2017) : la même demande faite de vive voix aboutit 34 fois plus
   souvent que par e-mail — et celui qui écrit ne sent pas la
   différence. Une promo se voit en cours. L'app propose donc de
   demander en vrai d'abord, et garde le message pour ceux qui ne sont
   pas dans la même pièce.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { CARTE_CHAMPS, carteDeProfil, resumeCarte, mergeMembres,
         mergeMembresPreview, trierGroupe, bilanMembre } from '../engine/groupe.js';
import { cardPayload, encodeOCQPayload } from '../engine/exchange.js';
import { exchangeLog } from '../engine/assist.js';
import { S, bus, saveGroupe, saveProfile, logJ } from './state.js';
import { openSheet, toast, btn, ic, showUndo, bindDeleteGesture } from './dom.js';
import { makeQrSvg } from './qr.js';

/* Ce que MON profil emporte. Le prénom part toujours (sans lui, rien
   ne relie) ; le reste se coche une fois et se retient — un réglage
   TOUJOURS visible au moment du geste, jamais un choix pris en
   silence dans le dos de l'utilisateur. */
const CHAMP_MOT = { nom: 'Nom', formation: 'Formation', email: 'E-mail',
                    phone: 'Téléphone', link: 'Portfolio' };
const champsChoisis = () => {
  const f = (S.profile && S.profile.flags && S.profile.flags.carte);
  return Array.isArray(f) ? f.filter(k => CARTE_CHAMPS.includes(k)) : ['formation', 'email'];
};
export const maCarte = () => carteDeProfil(S.profile, ['prenom'].concat(champsChoisis()));

const nomComplet = m => [m.prenom, m.nom].filter(Boolean).join(' ');

/* ---------- la porte, sur l'écran Échanger ----------
   Elle porte une DONNÉE, pas un libellé : combien de personnes, et
   celui qui t'a le plus donné. Une porte qui ne dit que son nom est un
   menu — et nommer le plus généreux plutôt que le dernier arrivé,
   c'est répondre « qui m'aide » et non « qui j'ai croisé ». */
export function groupeDoorHTML(){
  const n = S.groupe.length;
  const tete = n ? trierGroupe(S.groupe, exchangeLog(S.journal, 0))[0] : null;
  return (
    `<button class="pcard moi-door" id="ecGroupe">
       <span class="md-m"><b>${ic('users', 'ic-14')} Mon groupe</b></span>
       ${n ? `<span class="rg-s">${n} · ${esc(nomComplet(tete))}</span>` : ''}
       ${ic('chevron-right', 'ic-14')}
     </button>`);
}

/* ---------- la liste ---------- */
export function openGroupe(){
  const sh = openSheet({ title: 'Mon groupe', icon: 'users' });
  const dessine = () => {
    const log = exchangeLog(S.journal, 0);
    const liste = trierGroupe(S.groupe, log);
    sh.body.innerHTML = liste.length
      ? `<div class="gr-list">${liste.map(m => {
          const b = bilanMembre(log, m);
          return (
            `<div class="sw-wrap gr-w" data-id="${esc(m.id)}"><div class="sw-in">
               <button class="rg-row gr-row" data-open="${esc(m.id)}">
                 <span class="rg-n">${esc(nomComplet(m))}</span>
                 ${b.recu ? `<span class="rg-s">${b.recu} piste${b.recu > 1 ? 's' : ''} reçue${b.recu > 1 ? 's' : ''}</span>`
                          : m.formation ? `<span class="rg-s">${esc(m.formation)}</span>` : ''}
                 ${ic('chevron-right', 'ic-14')}
               </button>
             </div></div>`);
        }).join('')}</div>`
      /* Un état vide enseigne. Celui-ci dit ce que la place recevra et
         par quel geste — le bouton juste en dessous. */
      : `<p class="ec-rien">Les camarades avec qui tu échanges ton profil s’inscrivent ici.</p>`;
    sh.body.querySelectorAll('[data-open]').forEach(b =>
      b.addEventListener('click', () => {
        const m = S.groupe.find(x => x.id === b.dataset.open);
        if (m) openMembre(m);
      }));
    /* suppression au geste + Annuler, comme partout — jamais de
       confirmation pour un retrait unitaire réversible */
    sh.body.querySelectorAll('.gr-w').forEach(n =>
      bindDeleteGesture(n, () => {
        const i = S.groupe.findIndex(x => x.id === n.dataset.id);
        if (i < 0) return;
        const [oté] = S.groupe.splice(i, 1);
        saveGroupe();
        dessine();
        showUndo(`${ic('check', 'ic-14')} ${esc(oté.prenom)} retiré.`, () => {
          S.groupe.splice(i, 0, oté);
          saveGroupe();
          dessine();
        });
      }));
    sh.setFoot([btn('Échanger nos profils', 'btn-primary', openEchangerProfil, 'switch')]);
  };
  dessine();
  return sh;
}

/* ---------- une personne ----------
   Ce qu'on peut faire avec elle, pas ce qu'on sait d'elle. */
function openMembre(m){
  const sh = openSheet({ title: nomComplet(m), icon: 'contact' });
  const log = exchangeLog(S.journal, 0);
  const b = bilanMembre(log, m);
  const lignes = [m.formation, m.email, m.phone, m.link].filter(Boolean);
  sh.body.innerHTML =
    `${lignes.length ? `<p class="gr-coord">${lignes.map(esc).join('<br>')}</p>` : ''}
     ${/* Un compte est une DONNÉE, pas une explication : il ne prend pas
          la classe `hint`, qui appartient à ce qui commente l'écran. */''}
     ${b.recu ? `<p class="gr-bilan">${ic('inbox', 'ic-14')} ${b.recu} piste${b.recu > 1 ? 's' : ''} reçue${b.recu > 1 ? 's' : ''} de ${esc(m.prenom)}</p>` : ''}`;
  sh.setFoot(m.email
    ? [btn('Écrire', 'btn-primary', () => {
        location.href = 'mailto:' + encodeURIComponent(m.email);
        sh.close();
      }, 'mail')]
    : null);
}

/* ---------- échanger nos profils ----------
   Le QR porte les données : un profil tient largement dans un seul
   code, donc ça marche hors ligne, sans réseau, sans relais. Chacun
   montre le sien, chacun scanne : l'échange se fait en deux gestes de
   trois secondes, exactement comme deux cartes qu'on se tend. */
export function openEchangerProfil(){
  const sh = openSheet({ title: 'Mon profil', icon: 'switch' });
  const q = s => sh.body.querySelector(s);

  const menu = () => {
    const carte = maCarte();
    sh.setTitle('Mon profil');
    if (!carte){
      /* Sans prénom, il n'y a rien à donner. On ne montre pas un écran
         mort : on mène au seul endroit qui débloque. */
      sh.body.innerHTML = `<p class="ec-rien">Remplis ton prénom dans « Moi » pour pouvoir l’échanger.</p>`;
      sh.setFoot(null);
      return;
    }
    sh.body.innerHTML =
      /* Ce qui part est écrit AVANT le choix du canal, en toutes
         lettres. Sur ses propres données comme sur celles des autres :
         on voit ce qui sort avant que ça sorte. */
      `<div class="gr-carte">${resumeCarte(carte).map(esc).join('<br>')}</div>
       <div class="datechips" role="group" aria-label="Ce que j’envoie">
         ${CARTE_CHAMPS.filter(k => k !== 'prenom').map(k => {
           const on = champsChoisis().includes(k);
           return `<button class="dchip${on ? ' on' : ''}" data-c="${k}" aria-pressed="${on}">${CHAMP_MOT[k]}</button>`;
         }).join('')}
       </div>
       <div class="pick-list" style="margin-top:14px">
         <button class="pick" id="grQR"><b>${ic('grid-3x3', 'ic-14')} En personne</b><span>QR à scanner</span></button>
         <button class="pick" id="grFile"><b>${ic('file', 'ic-14')} À distance</b><span>fichier .oc</span></button>
       </div>`;
    sh.body.querySelectorAll('[data-c]').forEach(b =>
      b.addEventListener('click', () => {
        const k = b.dataset.c;
        const l = champsChoisis();
        const suite = l.includes(k) ? l.filter(x => x !== k) : l.concat([k]);
        S.profile.flags.carte = suite;
        saveProfile();
        menu();
      }));
    q('#grQR').addEventListener('click', etapeQR);
    q('#grFile').addEventListener('click', etapeFichier);
    sh.setFoot(null);
  };

  const etapeQR = async () => {
    const carte = maCarte();
    let svg;
    try { svg = await makeQrSvg(await encodeOCQPayload(cardPayload(carte))); }
    catch (e){ toast('Le QR n’est pas disponible ici — passe par le fichier.'); etapeFichier(); return; }
    sh.setTitle('Mon profil — QR');
    sh.body.innerHTML = `<div class="qr-wrap" role="img" aria-label="QR de mon profil">${svg}</div>`;
    /* L'échange est réciproque et ça ne se devine pas d'un QR seul :
       « Scanner le sien » est le deuxième geste, posé comme un bouton
       parce que c'en est un. */
    sh.setFoot([btn('Retour', 'btn-ghost', menu, 'arrow-left'),
                btn('Scanner le sien', 'btn-primary', () => { sh.close(); ouvrirScan(); }, 'grid-3x3')]);
  };

  const etapeFichier = () => {
    const carte = maCarte();
    const txt = JSON.stringify(cardPayload(carte));
    const fname = 'opencontact-profil-' + todayISO() + '.oc';
    sh.setTitle('Mon profil — fichier');
    sh.body.innerHTML =
      `<div class="pick-list">
         ${navigator.share ? `<button class="pick" id="grShare"><b>${ic('share', 'ic-14')} Partager</b></button>` : ''}
         <button class="pick" id="grDl"><b>${ic('download', 'ic-14')} Télécharger</b><span>${fname}</span></button>
         <button class="pick" id="grCopy"><b>${ic('copy', 'ic-14')} Copier</b></button>
       </div>`;
    q('#grShare')?.addEventListener('click', async () => {
      const file = new File([txt], fname, { type: 'application/octet-stream' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Mon profil OpenContact' });
        else await navigator.share({ title: 'Mon profil OpenContact', text: txt });
        toast('Parti ✓');
      } catch (e) { /* partage annulé : pas une erreur */ }
    });
    q('#grDl').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([txt], { type: 'application/octet-stream' }));
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Fichier téléchargé ✓');
    });
    q('#grCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(txt); toast('Copié — colle-le où tu veux.'); }
      catch (e) { toast('Copie impossible ici — passe par Télécharger.'); }
    });
    sh.setFoot([btn('Retour', 'btn-ghost', menu, 'arrow-left')]);
  };

  menu();
}

/* ---------- demander à quelqu'un du groupe ----------
   Le paiement de tout le reste. Une fiche qui dit « Léa y a fait son
   stage » n'a servi à rien tant qu'on n'a pas parlé à Léa — et ce qui
   empêche d'y aller n'est pas l'information, c'est la gêne : mesuré
   (Flynn & Bohns, 2008), on sous-estime d'environ MOITIÉ la
   probabilité qu'on nous dise oui. L'écran ne motive pas, il enlève le
   coût : la phrase est déjà écrite, il n'y a plus qu'à l'envoyer — ou
   mieux, à la dire. */
export function openDemander(c, membre, v){
  const sh = openSheet({ title: 'Demander à ' + membre.prenom, icon: 'message-text' });
  const mot = `Salut ${membre.prenom}, tu ${v.tu} chez ${c.name} ? `
            + `Je postule là-bas — tu peux me dire à qui écrire ?`;
  sh.body.innerHTML =
    /* La seule chose qui ne se devine pas, et elle change tout : vous
       êtes dans le même cours, et la demande faite là aboutit 34 fois
       plus souvent que par écrit. Huit mots, parce qu'un neuvième ne
       dirait rien de plus. */
    `<p class="hint">${ic('users', 'ic-14')} Demande-lui en vrai : bien plus efficace qu’un message.</p>
     <div class="gr-mot">${esc(mot)}</div>`;
  const copier = btn('Copier le message', 'btn-primary', async () => {
    try { await navigator.clipboard.writeText(mot); toast('Copié ✓'); sh.close(); }
    catch (e) { toast('Copie impossible ici — sélectionne le texte.'); }
  }, 'copy');
  sh.setFoot(membre.email
    ? [btn('Écrire', 'btn-ghost', () => {
        location.href = 'mailto:' + encodeURIComponent(membre.email) +
          '?subject=' + encodeURIComponent(c.name) + '&body=' + encodeURIComponent(mot);
        sh.close();
      }, 'mail'), copier]
    : [copier]);
}

/* Recevoir un profil passe par « Recevoir » — un seul endroit où
   entrent les choses des autres, quel que soit ce qu'elles contiennent.
   Deux portes d'entrée voudraient dire deux fois les mêmes défenses. */
async function ouvrirScan(){
  const { openRecevoir } = await import('./recevoir.js');
  openRecevoir();
}

/* ---------- recevoir un profil : l'aperçu AVANT ----------
   Mêmes règles que pour les pistes, invariant ② compris : la fusion
   tourne à blanc, on montre, puis on écrit — et on peut annuler. */
export function ajouterCarte(carte, opts){
  opts = opts || {};
  const av = mergeMembresPreview([carte], S.groupe);
  if (!av.stats.added && !av.stats.filled){
    if (!opts.muet) toast(`${carte.prenom} est déjà dans ton groupe.`);
    return av.stats;
  }
  const snap = JSON.stringify(S.groupe);
  const st = mergeMembres([carte], S.groupe);
  saveGroupe();
  logJ('Profil reçu : ' + carte.prenom);
  bus.refresh();
  showUndo(`${ic('check', 'ic-14')} ${esc(carte.prenom)} ajouté à ton groupe.`, () => {
    S.groupe = JSON.parse(snap);
    saveGroupe();
    bus.refresh();
  });
  return st;
}

/* Ce qu'un aperçu de partage dit d'un profil joint — une ligne, à
   côté du compte de pistes. Un profil n'est pas une piste : il ne se
   compte pas avec elles, il s'annonce. */
export function carteLigneHTML(carte){
  if (!carte || !carte.prenom) return '';
  return `<li>${ic('contact', 'ic-14')} le profil de <b>${esc(carte.prenom)}</b></li>`;
}
