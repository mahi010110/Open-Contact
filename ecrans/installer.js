/* ============================================================
   OpenContact · la nouvelle interface · installer l'app sur l'écran
   d'accueil (repris de ui/installer.js, sans rien de l'ancienne interface)

   Sur iPhone, ce n'est pas un confort : Safari efface tout ce qu'un
   site a écrit s'il n'a pas été ouvert depuis sept jours — et une app
   posée sur l'écran d'accueil y échappe (WebKit, « Updates to Storage
   Policy », 2023). Safari ne propose JAMAIS l'installation de lui-même :
   il faut savoir où toucher.

   Sur Android, Chrome sait proposer l'installation : il le signale par
   `beforeinstallprompt`, qu'on garde pour le rejouer au moment où
   l'étudiant le demande. On ne bloque PAS sa petite bannière à lui.

   Rien ne s'affiche une fois l'app installée, ni au poste : une
   capacité qui ne sert à rien ici est absente, jamais grisée (§0).
   ============================================================ */
let invite = null;          /* l'événement `beforeinstallprompt` gardé */
let installeeIci = false;   /* `appinstalled` reçu pendant cette session */
let ecoute = false;

export function ecouterInstallation(){
  if (ecoute) return;
  ecoute = true;
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

export const surIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/* Android : l'invite du système, si Chrome l'a préparée. Elle ne se joue
   qu'une fois. Rend `true` si elle a parlé (le chemin à la main est alors
   inutile), `false` sinon : l'écran montre les étapes. */
export async function inviteSysteme(){
  if (!invite) return false;
  const e = invite;
  invite = null;
  try {
    await e.prompt();
    const choix = await e.userChoice;
    if (choix && choix.outcome === 'accepted'){
      installeeIci = true;
      document.dispatchEvent(new CustomEvent('oc:installee'));
    }
    return true;
  } catch (err) { return false; }
}
