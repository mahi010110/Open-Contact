/* ============================================================
   OpenContact — interface · capture d'une piste (#7, #3)
   Une piste = l'entreprise ET le contact, saisis ensemble. Deux
   formulaires, un par appareil : au pouce trois champs et la
   rafale (« Suivant » enchaîne, « Compléter » ouvre la fiche) ;
   sur l'ordinateur le formulaire complet d'emblée — le même que
   « Modifier » — et un seul bouton, « Terminer ». Une personne
   sans entreprise part dans le bac « à rattacher » — jamais
   bloqué, rien ne se perd. L'anti-doublon (moteur) demande avant
   de créer un homonyme.
   ============================================================ */
import { esc, uid, todayISO, debounce } from '../engine/utils.js';
import { normalizeCompany, contactHasData } from '../engine/model.js';
import { findMatch } from '../engine/merge.js';
import { S, bus, saveData, logJ, addOrphan, attachContact, ctLabel } from './state.js';
import { openSheet, toast, btn, ic } from './dom.js';
import { openFiche } from './fiche.js';
import { sharedFieldsHTML, bindSharedFields } from './edit.js';

/* nadia@ovhcloud.com → « Ovhcloud » : l'entreprise se devine de l'email —
   proposée en un tap, jamais imposée. Les domaines personnels se taisent. */
const PERSO = ['gmail', 'outlook', 'hotmail', 'yahoo', 'orange', 'free', 'laposte',
  'wanadoo', 'sfr', 'icloud', 'protonmail', 'proton', 'live', 'msn', 'gmx', 'aol'];
export function companyFromEmail(email){
  const m = /@([a-z0-9-]+)\./i.exec(String(email || '').trim());
  if (!m) return '';
  const dom = m[1].toLowerCase();
  if (PERSO.includes(dom) || dom.length < 3) return '';
  return dom[0].toUpperCase() + dom.slice(1);
}

export function openCapture(prefill){
  prefill = prefill || {};
  /* le contexte décide du formulaire, pas la largeur d'un bloc (#3) */
  const wide = matchMedia('(min-width:901px)').matches;
  /* ordinateur : le formulaire complet part d'une piste à blanc, déjà
     porteuse de ce qu'un partage a apporté (site, description) */
  const brouillon = wide ? normalizeCompany({
    name: prefill.name || '', website: prefill.website || '', desc: prefill.desc || ''
  }) : null;
  const NOM = wide ? '#edName' : '#cpName';

  const sh = openSheet({
    title: prefill.website ? 'Piste reçue du partage' : 'Nouvelle piste',
    icon: 'plus', className: wide ? 'modal-fiche' : '', focus: NOM
  });
  /* ordinateur : le contact prend la grammaire du formulaire partagé
     (un libellé par champ) ; au pouce il garde son en-tête unique */
  const contactHTML = wide
    ? `<div class="grid2">
         <div class="field"><label for="cpCtName">Contact</label>
           <input id="cpCtName" placeholder="Ex : Nadia Rahmani" autocomplete="off"></div>
         <div class="field"><label for="cpCtCoord">Email ou téléphone</label>
           <input id="cpCtCoord" placeholder="nadia@…  ou  06 12 34 56 78" autocomplete="off"></div>
       </div>`
    : `<div class="lbl-row"><label for="cpCtName">Le contact</label></div>
       <div class="field"><input id="cpCtName" placeholder="Ex : Nadia Rahmani" autocomplete="off"></div>
       <div class="field"><input id="cpCtCoord" placeholder="Son email ou son téléphone" autocomplete="off"></div>`;
  const mailsHTML = `<button class="linklike" id="cpMails">${ic('sparkles', 'ic-14')} Depuis mes e-mails</button>`;

  sh.body.innerHTML = wide
    ? `${sharedFieldsHTML(brouillon)}${contactHTML}${mailsHTML}`
    : `<div class="lbl-row"><label for="cpName">L’entreprise</label></div>
       <div class="field">
         <input id="cpName" value="${esc(prefill.name || '')}" placeholder="Ex : Orange Cyberdefense" autocomplete="off">
         <div class="dup-note" id="cpDup" hidden></div>
         <button class="linklike" id="cpFromMail" hidden></button>
       </div>
       ${prefill.website ? `<div class="cp-carry">${ic('link', 'ic-14')} <span>${esc(prefill.website)}</span></div>` : ''}
       ${contactHTML}${mailsHTML}`;

  const q = s => sh.body.querySelector(s);
  const v = s => q(s).value.trim();
  /* ordinateur : l'avertissement de doublon et l'entreprise devinée se
     posent sous le nom, dans le formulaire partagé */
  const champs = wide ? bindSharedFields(sh.body) : null;
  if (wide) q(NOM).closest('.field').insertAdjacentHTML('beforeend',
    `<div class="dup-note" id="cpDup" hidden></div>
     <button class="linklike" id="cpFromMail" hidden></button>`);

  /* ce que dit le champ « email ou téléphone » */
  const coord = () => {
    const t = v('#cpCtCoord');
    if (!t) return {};
    if (t.includes('@')) return { email: t };
    if (t.replace(/\D/g, '').length >= 8) return { phone: t };
    return { note: t };
  };
  const contactData = () => {
    const data = Object.assign({ id: uid(), name: v('#cpCtName') }, coord());
    return contactHasData(data) ? data : null;
  };

  /* anti-doublon (sur le nom) + entreprise devinée de l'email */
  let dup = null;
  const checkDup = () => {
    const name = v(NOM);
    dup = name ? findMatch({ name }, S.companies) : null;
    const box = q('#cpDup');
    if (dup){
      box.hidden = false;
      box.innerHTML =
        `${ic('square-alert', 'ic-14')} Tu as déjà <b>${esc(dup.name)}</b>${dup.city ? ' (' + esc(dup.city) + ')' : ''} — c’est la même entreprise ?
         <button class="btn btn-sm" id="cpOpen">Ouvrir sa fiche</button>`;
      box.querySelector('#cpOpen').addEventListener('click', () => {
        /* rien ne se perd : le lien reçu et le contact saisi complètent
           la fiche existante (jamais d'écrasement) */
        if (prefill.website && !dup.website){
          dup.website = prefill.website;
          dup.updatedAt = Date.now();
          saveData();
        }
        const ct = contactData();
        if (ct){ attachContact(dup, ct); toast(ctLabel(ct) + ' → rangé dans « ' + dup.name + ' » ✓'); }
        sh.close();
        openFiche(dup);
      });
      bPrim.textContent = 'Créer quand même';
    } else {
      box.hidden = true;
      bPrim.textContent = LABEL;
    }
  };
  const checkMail = () => {
    const b = q('#cpFromMail');
    const guess = !v(NOM) && companyFromEmail(coord().email);
    b.hidden = !guess;
    if (guess){
      b.innerHTML = `${ic('lightbulb', 'ic-14')} <span>Entreprise : <b>${esc(guess)}</b> ?</span>`;
      b.onclick = () => { q(NOM).value = guess; checkDup(); checkMail(); };
    }
  };

  /* créer — rend la piste (ou null si c'était un contact seul → bac) */
  const save = () => {
    const name = v(NOM);
    const ct = contactData();
    if (!name && !ct){
      toast('Une entreprise, ou au moins un contact.');
      q(NOM).focus();
      return undefined;
    }
    if (!name){
      /* la personne seule va au bac « à rattacher » — jamais bloqué */
      addOrphan(ct);
      toast('✓ ' + ctLabel(ct) + ' gardé de côté');
      return null;
    }
    const c = normalizeCompany({
      id: uid(), name,
      website: prefill.website || '', desc: prefill.desc || '',
      contacts: ct ? [ct] : [],
      createdAt: Date.now()
    });
    if (champs) champs.apply(c);      /* ordinateur : tout le formulaire */
    c.history = [{ d: todayISO(), t: prefill.website ? 'Piste reçue du partage' : 'Piste créée' }];
    S.companies.push(c);
    saveData();
    logJ('Piste créée : ' + c.name, c.id);
    return c;
  };

  /* Le bouton primaire dit ce qu'il fait sur CET appareil : au pouce
     « Suivant » enchaîne la piste d'après, sur l'ordinateur « Terminer »
     ferme — le formulaire y est déjà complet, il n'y a rien à compléter. */
  const LABEL = wide ? 'Terminer' : 'Suivant';
  const bPrim = btn(LABEL, 'btn-primary', () => {
    const c = save();
    if (c === undefined) return;
    if (wide){
      sh.close();
      bus.refresh();
      if (c) toast('✓ ' + c.name + ' ajoutée');
      return;
    }
    if (c) toast('✓ ' + c.name + ' ajoutée');
    ['#cpName', '#cpCtName', '#cpCtCoord'].forEach(s => { q(s).value = ''; });
    prefill = {};
    checkDup();
    checkMail();
    bus.refresh();
    q(NOM).focus();
  });
  /* « Compléter » = créé ET la fiche s'ouvre pour le reste (au pouce) */
  const bMore = wide ? null : btn('Compléter', '', () => {
    const c = save();
    if (c === undefined) return;
    sh.close();
    bus.refresh();
    if (c) openFiche(c);
  });

  /* l'import d'e-mails est une SOURCE de pistes (#5) — il vit ici,
     pas dans « Recevoir » (réservé à ce qu'un camarade envoie) */
  q('#cpMails').addEventListener('click', async () => {
    sh.close();
    (await import('./recevoir.js')).openImportMails();
  });
  q(NOM).addEventListener('input', debounce(checkDup, 250));
  q('#cpCtCoord').addEventListener('input', debounce(checkMail, 250));
  if (wide)
    /* un formulaire long ne se valide pas d'une Entrée distraite —
       Ctrl/Cmd + Entrée, comme le composeur */
    sh.body.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') bPrim.click();
    });
  else
    sh.body.querySelectorAll('input').forEach(i =>
      i.addEventListener('keydown', e => { if (e.key === 'Enter') bPrim.click(); }));
  sh.setFoot(bMore ? [bMore, bPrim] : [bPrim]);
  checkDup();
  checkMail();
}
