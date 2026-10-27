/* ============================================================
   OpenContact — interface · ma semaine (lot R4)
   Une ligne en tête d'« Aujourd'hui », qui se touche (son chevron le
   dit) et ouvre « Ma semaine » : l'objectif réglé d'un tap, le compte
   qui se remplit seul, et le vendredi la revue, qu'on peut donner à son
   groupe. Le moteur compte et écrit la phrase (engine/semaine.js) ;
   ici, rien ne s'ajoute à ce qu'il rend.
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { maSemaine, reglerObjectif, phraseRevue, OBJECTIF_MIN, OBJECTIF_MAX } from '../engine/semaine.js';
import { S, bus, saveProfile } from './state.js';
import { openSheet, ic, btn, toast } from './dom.js';
import { groupesOuJEcris, direAuGroupe } from './groupes.js';

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const semaine = () => maSemaine(S.profile.semaine, S.companies, todayISO());

/* la ligne : un nombre, pas un retard — rien ne rougit en dessous */
export function semaineHTML(){
  const s = semaine();
  const part = Math.min(100, Math.round(100 * s.mails / s.objectif));
  const dit = s.revue
    ? `<span class="ts-l">Ma semaine</span>
       <span class="ts-n">${pluriel(s.mails, 'mail')} · ${pluriel(s.reponses, 'réponse')} · ${pluriel(s.pistes, 'piste')}</span>`
    : `<span class="ts-l">Cette semaine</span>
       <span class="ts-n"><b>${s.mails}</b> sur ${pluriel(s.objectif, 'mail')}</span>
       <span class="ts-barre" aria-hidden="true"><i style="width:${part}%"></i></span>`;
  return `<button class="td-semaine" id="tdSemaine"><span class="ts-dit">${dit}</span>${ic('chevron-right', 'ic-14')}</button>`;
}

export function ouvrirSemaine(){
  const sh = openSheet({ title: 'Ma semaine', icon: 'calendar' });
  const rendre = () => {
    const s = semaine();
    const groupes = s.revue ? groupesOuJEcris() : [];
    sh.body.innerHTML =
      `<section class="sm-bloc">
         <h3 class="sm-h">Objectif</h3>
         <div class="sm-pas" role="group" aria-label="Objectif de la semaine">
           <button class="btn btn-ghost sm-moins" id="smMoins" aria-label="Un mail de moins"${s.objectif <= OBJECTIF_MIN ? ' disabled' : ''}>−</button>
           <span class="sm-obj" id="smObj" aria-live="polite">${pluriel(s.objectif, 'mail')}</span>
           <button class="btn btn-ghost sm-plus" id="smPlus" aria-label="Un mail de plus"${s.objectif >= OBJECTIF_MAX ? ' disabled' : ''}>+</button>
         </div>
         <p class="sm-fait" id="smFait"><b>${s.mails}</b> parti${s.mails > 1 ? 's' : ''} depuis lundi</p>
       </section>
       ${s.revue ? `<section class="sm-bloc">
         <h3 class="sm-h">Revue</h3>
         <p class="sm-phrase" id="smPhrase">${esc(phraseRevue(s))}</p>
       </section>` : ''}`;
    const regler = d => {
      S.profile.semaine = reglerObjectif(S.profile.semaine, s.lundi, s.objectif + d);
      saveProfile();
      rendre();
      bus.refresh();
    };
    sh.body.querySelector('#smMoins').addEventListener('click', () => regler(-1));
    sh.body.querySelector('#smPlus').addEventListener('click', () => regler(+1));
    /* le vendredi, un geste : la phrase part dans UN groupe, choisi */
    sh.setFoot(groupes.length ? [btn('Partager au groupe', 'btn-primary', () => partager(sh, groupes, phraseRevue(s)), 'users')] : null);
  };
  rendre();
}

async function partager(sh, groupes, phrase){
  const envoyer = async g => {
    if (!await direAuGroupe(g.code, phrase)){ toast('Pas parti — réessaie quand tu as du réseau.'); return; }
    sh.close();
    toast(`Partagé dans ${g.nom || 'ton groupe'}`);
  };
  if (groupes.length === 1){ await envoyer(groupes[0]); return; }
  const choix = openSheet({ title: 'Groupe', icon: 'users' });
  choix.body.innerHTML = `<div class="pick-list">${groupes.map((g, i) =>
    `<button class="pick" data-i="${i}"><b>${esc(g.nom || 'Groupe')}</b>${ic('chevron-right', 'ic-14')}</button>`).join('')}</div>`;
  choix.body.querySelectorAll('.pick').forEach(b => b.addEventListener('click', async () => {
    choix.close();
    await envoyer(groupes[+b.dataset.i]);
  }));
}
