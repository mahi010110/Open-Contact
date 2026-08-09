/* ============================================================
   OpenContact — interface · profil & modèles d'emails
   Le profil remplit les emails ({{moi}}, {{formation}}, {{tel}}…),
   les modèles se gèrent ici : modifier, ajouter, retirer,
   revenir aux modèles de départ. Tout reste local.
   ============================================================ */
import { esc, uid } from '../engine/utils.js';
import { defaultTemplates } from '../engine/model.js';
import { S, bus, saveProfile } from './state.js';
import { openSheet, confirmSheet, toast, showUndo, btn, ic, clavier } from './dom.js';
import { tplField, tplSample } from './tplfield.js';

/* ---------- profil ---------- */
export function openProfil(onDone){
  const p = S.profile;
  const sh = openSheet({ title: 'Mon profil', icon: 'user', focus: '#pfName' });
  sh.body.innerHTML =
    /* « Privé — sert à remplir tes emails » vivait ici en tête. « Moi » le
       dit déjà, au moment où l'on décide d'ouvrir cette feuille ; et
       « privé » est l'état par défaut de toute l'app, pas une propriété
       de cet écran-là. */
    `<div class="grid2">
       <div class="field"><label for="pfName">Prénom & nom</label>
         <input id="pfName" value="${esc(p.name)}" placeholder="Ex : Sam Martin" autocomplete="name" ${clavier('nom')}></div>
       <div class="field"><label for="pfFormation">Formation</label>
         <input id="pfFormation" value="${esc(p.formation)}" placeholder="Ex : BTS SIO 2e année" autocomplete="off"></div>
     </div>
     <div class="grid2">
       <div class="field"><label for="pfPhone">Téléphone</label>
         <input id="pfPhone" type="tel" value="${esc(p.phone)}" autocomplete="tel" inputmode="tel" ${clavier('tel')}></div>
       <div class="field"><label for="pfEmail">Email</label>
         <input id="pfEmail" type="email" value="${esc(p.email)}" autocomplete="email" inputmode="email" ${clavier('email')}></div>
     </div>
     <div class="field"><label for="pfCv">Lien CV</label>
       <input id="pfCv" type="url" value="${esc(p.cvUrl)}" placeholder="https://…" autocomplete="off" ${clavier('lien')}></div>
     <div class="field"><label for="pfPortfolio">Portfolio / LinkedIn</label>
       <input id="pfPortfolio" type="url" value="${esc(p.portfolio)}" placeholder="https://…" autocomplete="off" ${clavier('lien')}></div>`;
  const v = s => sh.body.querySelector(s).value.trim();
  sh.setFoot([
    btn('Enregistrer', 'btn-primary', () => {
      p.name = v('#pfName'); p.formation = v('#pfFormation');
      p.phone = v('#pfPhone'); p.email = v('#pfEmail');
      p.cvUrl = v('#pfCv'); p.portfolio = v('#pfPortfolio');
      saveProfile();
      toast('Profil enregistré ✓');
      sh.close();
      bus.refresh();
      if (onDone) onDone();
    })
  ]);
}

/* ---------- modèles d'emails — jamais de {{...}} à l'écran (#17) ---------- */
export function openTemplates(){
  const sh = openSheet({ title: 'Modèles d’emails', icon: 'mail' });
  const render = () => {
    sh.body.innerHTML =
      /* la même ligne que les Réglages : nom + chevron. L'objet répété
         sous chaque nom n'aidait pas — on ouvre pour le lire. */
      `<div class="pcard" style="margin:0">
         ${S.profile.templates.map((t, i) =>
           `<button class="rg-row${i === S.profile.templates.length - 1 ? ' rg-last' : ''}" data-i="${i}">
              <span class="rg-n">${esc(t.name)}</span>
              ${ic('chevron-right', 'ic-14')}
            </button>`).join('')}
       </div>`;
    sh.body.querySelectorAll('.rg-row').forEach(b =>
      b.addEventListener('click', () => editTemplate(S.profile.templates[+b.dataset.i], render)));
    sh.setFoot([
      btn('Modèles de départ', 'btn-ghost', async () => {
        const ok = await confirmSheet({
          title: 'Revenir aux modèles de départ ?', danger: true, okLabel: 'Réinitialiser',
          msg: 'Tes modèles actuels seront remplacés par les trois modèles d’origine.'
        });
        if (!ok) return;
        S.profile.templates = defaultTemplates();
        saveProfile();
        toast('Modèles réinitialisés.');
        render();
      }),
      btn('Nouveau modèle', 'btn-primary', () =>
        editTemplate({ id: uid(), name: '', subject: '', body: '' }, render, true), 'plus')
    ]);
  };
  render();
}

function editTemplate(t, onBack, isNew){
  const sh = openSheet({ title: isNew ? 'Nouveau modèle' : t.name, icon: 'pencil', className: 'modal-fiche', focus: '#tpName' });
  const sample = tplSample(null, null);
  sh.body.innerHTML =
    `<div class="field"><label for="tpName">Nom du modèle</label>
       <input id="tpName" value="${esc(t.name)}" placeholder="Ex : Relance après forum"></div>
     <div class="field"><label>Objet</label><div id="tpSubject"></div></div>
     <div class="field"><label>Message</label><div id="tpBody"></div></div>
     <p class="tpl-insert">Tape <b>@</b> pour insérer un prénom, une entreprise…</p>`;
  const fSubj = tplField(sh.body.querySelector('#tpSubject'), { value: t.subject, sample, multiline: false });
  const fBody = tplField(sh.body.querySelector('#tpBody'), { value: t.body, sample });
  const v = s => sh.body.querySelector(s).value;
  const foot = [
    btn('Enregistrer', 'btn-primary', () => {
      const name = v('#tpName').trim();
      if (!name){ toast('Donne un nom au modèle.'); return; }
      t.name = name;
      t.subject = fSubj.get();
      t.body = fBody.get();
      if (isNew) S.profile.templates.push(t);
      saveProfile();
      toast('Modèle enregistré ✓');
      sh.close();
      onBack();
    })
  ];
  if (!isNew && S.profile.templates.length > 1){
    /* Le geste est réversible, donc il ne se demande pas — il se fait, et
       la barre Annuler tient trente secondes (catalogue §6). La question
       « Supprimer ce modèle ? » était une TROISIÈME couche par-dessus la
       liste et la fiche du modèle, et elle ne montrait rien de neuf : on
       est déjà DANS le modèle, son nom est le titre de la feuille. Elle
       ne protégeait rien non plus — la suppression était définitive.
       Elle l'est moins maintenant qu'avant. */
    foot.unshift(btn('Supprimer', 'btn-ghost btn-danger', () => {
      const rang = S.profile.templates.findIndex(x => x.id === t.id);
      S.profile.templates = S.profile.templates.filter(x => x.id !== t.id);
      saveProfile();
      sh.close();
      onBack();
      showUndo(`${ic('trash', 'ic-14')} « ${esc(t.name)} » retiré.`, () => {
        S.profile.templates.splice(Math.max(0, rang), 0, t);   /* à sa place */
        saveProfile();
        onBack();
      });
    }, 'trash'));
  }
  sh.setFoot(foot);
}
