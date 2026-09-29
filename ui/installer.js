/* ============================================================
   OpenContact — interface · installer l'app sur l'écran d'accueil

   Sur iPhone, ce n'est pas un confort : Safari efface tout ce qu'un
   site a écrit s'il n'a pas été ouvert depuis sept jours — et une app
   posée sur l'écran d'accueil y échappe (WebKit, « Updates to Storage
   Policy », 2023). L'utilisateur type (§1) est sur iPhone, et Safari
   ne propose JAMAIS l'installation de lui-même : il faut savoir où
   toucher. Depuis iOS 26, « Partager » s'est même rangé dans le menu
   « ⋯ ».

   Sur Android, Chrome sait proposer l'installation : il le signale par
   `beforeinstallprompt`, qu'on garde pour le rejouer au moment où
   l'étudiant le demande. On ne bloque PAS sa petite bannière à lui
   (`preventDefault`) : elle touche ceux qui ne passeront jamais par
   « Moi ».

   Rien ne s'affiche une fois l'app installée, ni au poste : une
   capacité qui ne sert à rien ici est absente, jamais grisée (§0).
   ============================================================ */
import { openSheet, ic } from './dom.js';

let invite = null;          /* l'événement `beforeinstallprompt` gardé */
let installeeIci = false;   /* `appinstalled` reçu pendant cette session */

export function ecouterInstallation(){
  window.addEventListener('beforeinstallprompt', e => { invite = e; });
  window.addEventListener('appinstalled', () => {
    installeeIci = true;
    invite = null;
    document.dispatchEvent(new CustomEvent('oc:installee'));
  });
}

export function estInstallee(){
  return installeeIci
    || matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;
}
/* la ligne n'a de sens qu'au doigt, dans le navigateur */
export const proposerInstallation = () =>
  !estInstallee() && matchMedia('(pointer:coarse)').matches;

const surIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function installer(){
  /* Android : l'invite du système, si Chrome l'a préparée. Elle ne se
     joue qu'une fois ; si elle refuse, on montre le chemin à la main. */
  if (invite){
    const e = invite;
    invite = null;
    try {
      await e.prompt();
      const choix = await e.userChoice;
      if (choix && choix.outcome === 'accepted'){
        installeeIci = true;
        document.dispatchEvent(new CustomEvent('oc:installee'));
      }
      return;
    } catch (err) { /* déjà jouée, ou refusée : le chemin à la main */ }
  }
  const ios = surIOS();
  const sh = openSheet({ title: 'Installer l’app', icon: 'download' });
  sh.body.innerHTML =
    `<ol class="inst-pas">
       ${ios
         ? `<li>Touche <b>${ic('share', 'ic-14')} Partager</b> — dans la barre de Safari, ou dans le menu <b>⋯</b> depuis iOS 26.</li>
            <li>Choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.</li>`
         : `<li>Ouvre le menu <b>⋮</b> du navigateur.</li>
            <li>Choisis <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>.</li>`}
     </ol>
     ${/* la seule phrase de la feuille, et elle prévient d'une perte qu'on
          ne peut pas voir venir (critère de §8) — seulement là où elle
          est vraie */''}
     ${ios ? '<p class="hint warn">Safari efface les données d’un site non ouvert depuis sept jours. Celles d’une app installée restent.</p>' : ''}`;
  /* pas de « Compris » : la croix ferme, et un bouton qui la double
     n'ajoute qu'un geste à lire (§7) */
}
