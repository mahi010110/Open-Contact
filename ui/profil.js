/* ============================================================
   OpenContact — interface · profil & modèles d'emails
   Le profil remplit les emails ({{moi}}, {{formation}}, {{tel}}…),
   les modèles se gèrent ici : modifier, ajouter, retirer,
   revenir aux modèles de départ. Tout reste local.
   ============================================================ */
import { esc, uid } from '../engine/utils.js';
import { defaultTemplates, RECHERCHES, dureeRecherche, periodeValide, emailPlausible,
         jetonsRecherche } from '../engine/model.js';
import { S, bus, saveProfile } from './state.js';
import { openSheet, confirmSheet, toast, showUndo, btn, ic, clavier, champGrandit } from './dom.js';
import { tplField, tplSample, TPL_LABELS } from './tplfield.js';

/* ---------- profil ----------
   CE QUE TES MAILS DISENT DE TOI. Chaque champ ici part dans un mail ;
   aucun n'est demandé « au cas où » (RGPD art. 5, minimisation — et de
   toute façon rien ne quitte l'appareil). Quatre groupes rangés dans
   l'ordre où le recruteur lit : qui tu es, ce que tu cherches, comment
   te répondre, où voir ton travail. Un `fieldset` par groupe : c'est ce
   qui fait annoncer le groupe à un lecteur d'écran (WCAG 1.3.1).
   Ce que tu cherches décide des champs suivants : un stage a un début
   et une fin, une alternance un rythme en plus, un emploi une date de
   disponibilité. Montrer les trois d'un coup, c'est demander à chacun
   de trier ce qui ne le concerne pas.
   Rien n'est marqué obligatoire : tout est facultatif, et marquer chaque
   champ « (facultatif) » ne serait que du bruit (GOV.UK). Ce qui manque
   se voit ailleurs — dans « Moi », en creux, et dans l'aperçu du bas. */
const CHAMPS = ['name', 'formation', 'ecole', 'recherche', 'debut', 'fin', 'rythme',
                'phone', 'email', 'cvUrl', 'portfolio'];
const DATES = {
  stage:      ['Du', 'Au'],
  alternance: ['Début', 'Fin'],
  emploi:     ['Disponible dès le', null]
};

export function openProfil(onDone, opts = {}){
  const p = S.profile;
  const d = Object.fromEntries(CHAMPS.map(k => [k, p[k] || '']));   /* le brouillon */
  const lire = () => Object.fromEntries(CHAMPS.map(k => [k, String(d[k] || '').trim()]));
  /* comparé sous la même forme que ce qui s'enregistre : une espace
     traînée d'un ancien profil ne doit pas faire croire à un changement */
  const init = JSON.stringify(lire());
  const sh = openSheet({
    title: 'Mon profil', icon: 'user', focus: opts.focus || '#pfName',
    /* Le même garde-fou que la fiche : onze champs se tapent en plusieurs
       minutes, et un glissé vers le bas les jetait sans un mot. La
       question ne se pose que si quelque chose a VRAIMENT changé. */
    guard: () => JSON.stringify(lire()) === init || confirmSheet({
      title: 'Quitter sans enregistrer ?', icon: 'square-alert', danger: true,
      okLabel: 'Quitter',
      msg: 'Tes changements ne sont pas enregistrés.'
    })
  });
  const q = s => sh.body.querySelector(s);
  const un = (id, label, val, attrs = '') =>
    `<div class="field fld-1l"><label for="${id}">${label}</label>
       <textarea id="${id}" rows="1" ${attrs}>${esc(val)}</textarea></div>`;
  sh.body.innerHTML =
    `<fieldset class="pf-grp"><legend>Toi</legend>
       <div class="field"><label for="pfName">Prénom et nom</label>
         <input id="pfName" value="${esc(d.name)}" placeholder="Ex : Sam Martin" autocomplete="name" ${clavier('nom')}></div>
       ${/* Formation et école se REPLIENT au lieu de défiler : « Lycée
            polyvalent Gustave Eiffel d'Armentières » ne tient pas dans un
            champ d'une ligne, et ce qui se cache est ce qu'on a écrit
            soi-même (§6, `.fld-1l`). */''}
       <div class="grid2">
         ${un('pfFormation', 'Formation', d.formation, 'placeholder="Ex : BTS SIO 2e année" autocomplete="off" enterkeyhint="next"')}
         ${un('pfEcole', 'École', d.ecole, `placeholder="Ex : Lycée Gustave Eiffel" autocomplete="off" enterkeyhint="next" ${clavier('nom')}`)}
       </div>
     </fieldset>
     <fieldset class="pf-grp"><legend id="pfRechL">Ce que tu cherches</legend>
       ${/* Des puces, pas une liste déroulante : trois choix se voient
            d'un coup (GOV.UK : ne jamais cacher un petit jeu d'options).
            Un seul à la fois — la phrase du mail n'en dit qu'un — et
            re-taper la puce allumée la retire, comme « J'y suis passé ». */''}
       <div class="datechips" role="group" aria-labelledby="pfRechL">
         ${Object.keys(RECHERCHES).map(k =>
           `<button class="dchip${d.recherche === k ? ' on' : ''}" data-r="${k}"
                    aria-pressed="${d.recherche === k}">${RECHERCHES[k].label}</button>`).join('')}
       </div>
       <div id="pfRech"></div>
     </fieldset>
     <fieldset class="pf-grp"><legend>Pour te répondre</legend>
       <div class="grid2">
         <div class="field"><label for="pfEmail">Email</label>
           <input id="pfEmail" type="email" value="${esc(d.email)}" autocomplete="email" inputmode="email"
                  aria-describedby="pfEmailErr" ${clavier('email')}>
           <p class="hint warn" id="pfEmailErr" hidden>Il manque le @ ou le domaine.</p></div>
         <div class="field"><label for="pfPhone">Téléphone</label>
           <input id="pfPhone" type="tel" value="${esc(d.phone)}" autocomplete="tel" inputmode="tel" ${clavier('tel')}></div>
       </div>
     </fieldset>
     <fieldset class="pf-grp"><legend>Tes liens</legend>
       <div class="grid2">
         <div class="field"><label for="pfCv">Lien de ton CV</label>
           <input id="pfCv" type="url" value="${esc(d.cvUrl)}" placeholder="https://…" autocomplete="url" ${clavier('lien')}></div>
         <div class="field"><label for="pfPortfolio">LinkedIn ou portfolio</label>
           <input id="pfPortfolio" type="url" value="${esc(d.portfolio)}" placeholder="https://…" autocomplete="url" ${clavier('lien')}></div>
       </div>
     </fieldset>
     ${/* L'APERÇU : ce que chaque champ devient, pendant qu'on le tape
          (ISO 9241-110, auto-descriptivité ; Nielsen, visibilité de
          l'état). C'est une DONNÉE — les phrases exactes du modèle de
          candidature, remplies —, pas une explication. Ce qui manque s'y
          lit en creux, à sa place dans la phrase. */''}
     <div class="pf-ap" aria-labelledby="pfApL">
       <span class="pf-ap-l" id="pfApL">Dans tes emails</span>
       <div class="pf-ap-t" id="pfAp"></div>
     </div>`;

  /* ---- ce que tu cherches : les champs suivent le choix ---- */
  const rendreRecherche = () => {
    const box = q('#pfRech');
    const lb = DATES[d.recherche];
    if (!lb){ box.innerHTML = ''; return; }
    const duree = d.recherche !== 'emploi' ? dureeRecherche(d.debut, d.fin, d.recherche) : null;
    box.innerHTML =
      `<div class="grid2 grid2-tight pf-dates">
         <div class="field"><label for="pfDebut">${lb[0]}</label>
           <input id="pfDebut" type="date" value="${esc(d.debut)}"></div>
         ${lb[1] ? `<div class="field"><div class="lbl-row"><label for="pfFin">${lb[1]}</label>
             <span class="fld-n pf-duree" id="pfDuree">${duree || ''}</span></div>
           <input id="pfFin" type="date" value="${esc(d.fin)}" aria-describedby="pfPerErr"></div>` : ''}
       </div>
       <p class="hint warn" id="pfPerErr" hidden>La fin tombe avant le début.</p>
       ${d.recherche === 'alternance'
         ? un('pfRythme', 'Rythme', d.rythme, 'placeholder="Ex : 3 jours en entreprise, 2 à l’école" autocomplete="off" enterkeyhint="done"')
         : ''}`;
    for (const [id, k] of [['#pfDebut', 'debut'], ['#pfFin', 'fin']]){
      const inp = q(id);
      if (!inp) continue;
      /* les deux : selon le moteur et la version, la roue d'iOS ne rend
         pas toujours `input` */
      const maj = () => { d[k] = inp.value; majDuree(); apercu(); };
      inp.addEventListener('input', maj);
      inp.addEventListener('change', maj);
    }
    const ry = q('#pfRythme');
    if (ry) branche1l(ry, v => { d.rythme = v; apercu(); });
  };
  const majDuree = () => {
    const el = q('#pfDuree');
    const ok = periodeValide(d.debut, d.fin);
    if (el) el.textContent = ok ? (dureeRecherche(d.debut, d.fin, d.recherche) || '') : '';
    /* l'erreur ne s'efface pas en silence : dès que la période redevient
       juste, le message part (Baymard — on ne laisse pas un reproche
       sur un champ corrigé) */
    if (ok) montrerErreur('#pfFin', '#pfPerErr', false);
  };
  sh.body.querySelectorAll('.dchip[data-r]').forEach(b =>
    b.addEventListener('click', () => {
      const etait = d.recherche === b.dataset.r;
      d.recherche = etait ? '' : b.dataset.r;
      sh.body.querySelectorAll('.dchip[data-r]').forEach(o => {
        const on = o.dataset.r === d.recherche;
        o.classList.toggle('on', on);
        o.setAttribute('aria-pressed', String(on));
      });
      rendreRecherche();
      apercu();
    }));

  /* ---- les valeurs d'un rang qui se replient (§6, `.fld-1l`) ---- */
  function branche1l(ta, surChange){
    ta.addEventListener('input', () => {
      if (/[\r\n]/.test(ta.value)){
        const i = ta.selectionStart;
        ta.value = ta.value.replace(/[\r\n]+/g, ' ');
        ta.selectionStart = ta.selectionEnd = i;
      }
      surChange(ta.value);
    });
    champGrandit(ta);
    /* Entrée passe au champ suivant : c'est une valeur, pas de la prose */
    ta.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const tous = [...sh.body.querySelectorAll('input, textarea, button.dchip')];
      const suiv = tous[tous.indexOf(ta) + 1];
      if (suiv) suiv.focus(); else ta.blur();
    });
  }
  branche1l(q('#pfFormation'), v => { d.formation = v; apercu(); });
  branche1l(q('#pfEcole'), v => { d.ecole = v; apercu(); });
  for (const [id, k] of [['#pfName', 'name'], ['#pfPhone', 'phone'], ['#pfEmail', 'email'],
                         ['#pfCv', 'cvUrl'], ['#pfPortfolio', 'portfolio']])
    q(id).addEventListener('input', e => { d[k] = e.target.value; apercu(); });

  /* ---- une erreur se dit sur son champ, au moment où on le QUITTE ----
     Pas pendant la frappe : « adresse invalide » au deuxième caractère
     est un reproche pour une adresse qui n'est pas finie (Baymard :
     valider à la sortie du champ, jamais à la touche). */
  function montrerErreur(champ, msg, oui){
    const c = q(champ), m = q(msg);
    if (!c || !m) return;
    m.hidden = !oui;
    if (oui) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
  }
  const emailFaux = () => d.email.trim() && !emailPlausible(d.email);
  q('#pfEmail').addEventListener('blur', () => montrerErreur('#pfEmail', '#pfEmailErr', emailFaux()));
  q('#pfEmail').addEventListener('input', () => { if (!emailFaux()) montrerErreur('#pfEmail', '#pfEmailErr', false); });

  /* ---- l'aperçu : les lignes du modèle de candidature, remplies ---- */
  const APERCU = ['Je suis en {{formation}} et je cherche {{recherche}}.', 'Rythme : {{rythme}}',
                  'Mon CV : {{cv}}', '', '{{moi}}', '{{ecole}}', '{{tel}} — {{email}}'];
  function apercu(){
    const v = { moi: d.name.trim(), formation: d.formation.trim(), tel: d.phone.trim(),
                email: d.email.trim(), cv: d.cvUrl.trim(), ...jetonsRecherche(d) };
    q('#pfAp').innerHTML = APERCU
      /* le rythme n'existe que pour l'alternance ; ailleurs, sa ligne
         n'est pas un manque, elle n'a pas lieu d'être */
      .filter(l => !l.includes('{{rythme}}') || d.recherche === 'alternance')
      .map(l => l.replace(/\{\{(\w+)\}\}/g, (s, k) => v[k]
        ? esc(v[k]) : `<span class="pf-creux">${esc(TPL_LABELS[k] || k)}</span>`))
      .map(l => l ? `<p>${l}</p>` : '<p class="pf-ap-sep"></p>').join('');
  }

  rendreRecherche();
  apercu();
  sh.setFoot([
    btn('Enregistrer', 'btn-primary', () => {
      const v = lire();
      /* ce qui partirait faux se RETIENT, sur son champ — la feuille
         reste ouverte avec tout ce qui a été tapé */
      if (v.email && !emailPlausible(v.email)){
        montrerErreur('#pfEmail', '#pfEmailErr', true);
        q('#pfEmail').focus();
        return;
      }
      /* l'emploi n'a pas de fin : une date restée d'un « stage » essayé
         avant ne doit pas retenir un champ qui n'est même plus affiché */
      if (DATES[v.recherche]?.[1] && !periodeValide(v.debut, v.fin)){
        montrerErreur('#pfFin', '#pfPerErr', true);
        q('#pfFin')?.focus();
        return;
      }
      for (const k of CHAMPS) p[k] = v[k];
      saveProfile();
      sh.close(null, true);
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
