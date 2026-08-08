/* ============================================================
   OpenContact — interface · mon groupe

   CE FICHIER A ÉTÉ RÉÉCRIT EN LE VIDANT. Première version : quatre
   feuilles neuves (une liste, une personne, « échanger nos profils »
   avec son QR et son fichier, une demande) plus une porte sur
   « Échanger ». C'était un deuxième produit greffé à côté du premier,
   avec son propre rituel d'échange à côté de celui qui existait déjà.

   La loi de Tesler dit qui paie la complexité irréductible : le
   concepteur, ou l'utilisateur. J'avais choisi l'utilisateur — un
   écran à visiter, un rituel à apprendre, cinq cases à cocher. Or
   « chaque option configurable est une décision que le concepteur n'a
   pas prise », et elle se repaie à chaque passage.

   CE QUI RESTE TIENT EN UNE PHRASE : ton groupe n'est pas une liste
   que tu construis, c'est la TRACE de ce que tu as échangé. Google a
   mesuré la même chose sur le graphe social implicite (KDD 2010) : les
   gens ne rangent pas leurs contacts, mais leurs interactions le font
   pour eux, et plus justement qu'eux.

   Donc : aucun écran « groupe » dans le quotidien. On coche une case
   en donnant ses pistes, le camarade entre tout seul, et son prénom
   devient tapable là où il sert — sur la fiche. La liste ne vit que
   dans les Réglages, parce que voir et pouvoir effacer les données
   d'AUTRUI est un devoir, pas une fonctionnalité.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { CARTE_ENVOI, carteDeProfil, resumeCarte, mergeMembres,
         mergeMembresPreview, trierGroupe, bilanMembre } from '../engine/groupe.js';
import { exchangeLog } from '../engine/assist.js';
import { S, bus, saveGroupe, logJ } from './state.js';
import { openSheet, toast, btn, ic, showUndo, bindDeleteGesture } from './dom.js';

/* Ce que MON profil emporte : prénom, formation, e-mail. Fixé, pas
   réglable. Un sélecteur de champs aurait transféré à l'utilisateur
   une décision que le produit peut prendre — et ces trois-là sont
   exactement ce qu'un étudiant donne à un camarade de promo. Qui n'en
   veut pas décoche la case entière : le choix reste binaire. */
export const maCarte = () => carteDeProfil(S.profile, CARTE_ENVOI);

/* Ce que la case « Joindre mon profil » emporte, écrit noir sur blanc
   au moment du geste : voir ce qui sort avant que ça sorte. */
export const monProfilEnClair = () => resumeCarte(maCarte()).join(' · ');

const nomComplet = m => [m.prenom, m.nom].filter(Boolean).join(' ');

/* ---------- l'état de la ligne dans les Réglages ---------- */
export const groupeLabel = () => {
  const n = S.groupe.length;
  return n ? n + ' personne' + (n > 1 ? 's' : '') : '';
};

/* ---------- Réglages · mon groupe ----------
   Sa raison d'être n'est PAS de consulter ses camarades — c'est de
   voir et de pouvoir effacer des coordonnées qui ne sont pas les
   siennes. Elle vit donc avec « Protection » et « Mes appareils », pas
   dans le flux du quotidien. Chaque ligne porte quand même ce qui a
   circulé : c'est ce qui la distingue d'un carnet d'adresses. */
export function openGroupeReglages(){
  const sh = openSheet({ title: 'Mon groupe', icon: 'users' });
  const dessine = () => {
    const log = exchangeLog(S.journal, 0);
    const liste = trierGroupe(S.groupe, log);
    sh.body.innerHTML = liste.length
      ? `<div class="gr-list">${liste.map(m => {
          const b = bilanMembre(log, m);
          const dit = [b.recu ? b.recu + ' piste' + (b.recu > 1 ? 's' : '') + ' reçue' + (b.recu > 1 ? 's' : '') : '',
                       m.email].filter(Boolean).join(' · ');
          return (
            `<div class="sw-wrap gr-w" data-id="${esc(m.id)}"><div class="sw-in">
               <div class="gr-row">
                 <span class="rg-n">${esc(nomComplet(m))}</span>
                 <span class="rg-s">${esc(dit)}</span>
               </div>
             </div></div>`);
        }).join('')}</div>`
      /* Un état vide enseigne : il dit par quel geste la place se
         remplit, et ce geste est celui qui existe déjà. */
      : `<p class="ec-rien">Les camarades à qui tu donnes des pistes en joignant ton profil s’inscrivent ici.</p>`;
    sh.body.querySelectorAll('.gr-w').forEach(n => {
      const m = S.groupe.find(x => x.id === n.dataset.id);
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
      }, m ? nomComplet(m) : '');
    });
  };
  dessine();
  return sh;
}

/* ---------- demander à quelqu'un du groupe ----------
   LE seul écran neuf de tout ce lot, et le seul qui paie. Une fiche
   qui dit « Léa y a fait son stage » n'a servi à rien tant qu'on n'a
   pas parlé à Léa — et ce qui empêche d'y aller n'est pas
   l'information, c'est la gêne : on sous-estime d'environ moitié la
   probabilité qu'on nous dise oui (Flynn & Bohns, 2008). L'écran
   n'encourage pas, il enlève le coût : la phrase est déjà écrite. */
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

/* ---------- recevoir quelqu'un ----------
   Aucun écran à lui : un profil arrive accroché à des pistes, par
   « Recevoir », qui a déjà son aperçu et son Annuler. On s'y branche,
   on n'en ouvre pas un deuxième. */
export function ajouterCarte(carte, opts){
  opts = opts || {};
  const av = mergeMembresPreview([carte], S.groupe);
  if (!av.stats.added && !av.stats.filled) return av.stats;
  const snap = JSON.stringify(S.groupe);
  const st = mergeMembres([carte], S.groupe);
  saveGroupe();
  logJ('Profil reçu : ' + carte.prenom);
  if (!opts.muet){
    bus.refresh();
    showUndo(`${ic('check', 'ic-14')} ${esc(carte.prenom)} ajouté à ton groupe.`, () => {
      S.groupe = JSON.parse(snap);
      saveGroupe();
      bus.refresh();
    });
  }
  return st;
}

/* La ligne que l'aperçu de « Recevoir » ajoute à son récapitulatif —
   une ligne dans une liste qui existe déjà, pas un écran de plus. */
export function carteLigneHTML(carte){
  if (!carte || !carte.prenom) return '';
  return `<li>${ic('contact', 'ic-14')} le profil de <b>${esc(carte.prenom)}</b></li>`;
}
