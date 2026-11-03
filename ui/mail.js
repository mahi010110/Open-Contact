/* ============================================================
   OpenContact — interface · écrire un email
   Gabarit rempli (moteur), destinataire choisi, envoi via l'app
   mail de l'appareil — ou DIRECTEMENT depuis l'app quand une
   messagerie est connectée (l'adresse d'envoi est visible, le
   repli « Ouvrir dans Mail » reste à un tap, une expiration ne
   perd jamais le brouillon). « Envoyé ✓ » nourrit le suivi puis
   propose la suite — la boucle qui entretient « Aujourd'hui ».
   ============================================================ */
import { esc, todayISO } from '../engine/utils.js';
import { brouillon, garderBrouillon, oublierBrouillon, ecrireBrouillonsMaintenant } from './brouillons.js';
import { fillTpl, crochets, remplirTrous, pushHist, modeleConseille } from '../engine/model.js';
import { sendMail } from '../engine/mailer.js';
import { bytesToB64 } from '../engine/crypto.js';
import { docGet } from '../engine/storage.js';
import { aiComplete, draftPrompt, splitDraft } from '../engine/ai.js';
import { SILENCE_RELANCE } from '../engine/assist.js';
import { S, bus, saveData, logJ, activateContact } from './state.js';
import { openSheet, toast, btn, el, ic, showUndo, champGrandit, avantImage, choixHTML } from './dom.js';
import { askNextAction } from './actions.js';
import { openProfil } from './profil.js';
import { listDocs, docKind, docTitle, pickPdf } from './docs.js';
import { mailAccount, freshToken, openConnexions, aiConnection, aiCompleteViaOrdinateur } from './connexions.js';
import { IA, ENVOI_DIRECT } from './perimetre.js';
import { carteConnue } from './fiche-annuaire.js';
import { euros } from '../engine/marche.js';

/* Les seuls champs qui nourrissent une accroche : ce qu'ils font, avec
   quoi ils travaillent, ce qu'un camarade a soufflé. Le process et
   l'adresse n'aident pas à écrire la première phrase — ils restent sur
   la fiche. Sans rien de tout ça, le site est la matière : un tap pour
   aller la chercher. */
const webH = w => /^https?:\/\//i.test(w) ? w : 'https://' + w;
export function savoirHTML(c){
  /* Sans « En bref », la carte de l'entreprise (ui/carte.js) a souvent
     la phrase qui manque — ce qu'elle fait, selon Wikipédia ou
     l'annuaire — et sa taille, qui dit à qui l'on écrit (« une équipe de
     150 » ne s'écrit pas comme « un groupe de 50 000 »). Seulement ce que
     la fiche ouverte a déjà appris : écrire ne lance aucune question. */
  const k = carteConnue(c);
  const quoi = !c.desc && k ? (k.quoi && k.quoi.src !== 'toi' ? k.quoi.texte : k.missions ? k.missions.texte : '') : '';
  const taille = k ? k.taille : '';
  const lignes = [
    c.desc ? ['En bref', esc(c.desc)] : quoi ? ['Activité', esc(quoi)] : null,
    taille ? ['Taille', esc(taille)] : null,
    /* l'aide à l'embauche d'un apprenti : un argument pour la lettre,
       que la PME ne connaît pas toujours (engine/marche.js) */
    k && k.aide ? ['Aide', `l’État lui verse jusqu’à ${euros(k.aide.montant)} la 1<sup>re</sup> année${k.aide.grande ? ', sous conditions' : ''}`] : null,
    c.techs ? ['Technos', esc(c.techs)] : null,
    c.tips ? ['Conseils', esc(c.tips)] : null,
    (!c.desc && !quoi && !c.techs && !c.tips && c.website)
      ? ['Site', `<a href="${esc(webH(c.website))}" target="_blank" rel="noopener">${
          esc(c.website.replace(/^https?:\/\//i, '').replace(/\/$/, ''))} ${ic('external-link', 'ic-14')}</a>`] : null
  ].filter(Boolean);
  if (!lignes.length) return '';
  /* OUVERT D'OFFICE, comme sur la fiche (« sans devoir appuyer », le
     mainteneur, 5 octobre) — et il se replie d'un tap, le même triangle
     que la fiche (`fi-hist`) : une fois l'accroche écrite, la place
     revient au message (lot D). */
  return `<details class="fi-hist ml-know" open><summary class="ml-know-h">À savoir</summary>
    ${lignes.map(([l, v]) => `<div class="fk"><span class="fk-l">${l}</span><span class="fk-v">${v}</span></div>`).join('')}
  </details>`;
}

export function openMail(c, opts){
  opts = opts || {};
  const cts = (c.contacts || []).filter(t => t.email);
  const tpls = S.profile.templates;
  let logged = false;
  let sending = false;
  /* en série (Prospecter) : « Passer » ou « Envoyée » enchaînent la
     suivante ; la croix (ou Échap) arrête TOUTE la série immédiatement */
  let done = false;
  const advance = () => { if (opts.onDone){ const f = opts.onDone; opts.onDone = null; f(); } };
  /* le composeur prend la place de la fiche (#16, fin du double-modal
     N8) : même fenêtre partout, en bas au pouce, centrée sur l’ordinateur */
  /* `modal-compose` : la fenêtre prend sa hauteur et c'est le MESSAGE
     qui la reçoit. Écrire est la seule chose qu'on fait ici, et 170 px
     de zone d'écriture — la même valeur au pouce et sur 1280x800, huit
     lignes visibles pour dix écrites, la phrase coupée en deux —
     c'était l'écran du téléphone resservi tel quel. */
  const sh = openSheet({
    /* « Écrire » dans la barre ; la piste, en tête du contenu, en entier.
       Dans la barre elle se coupait à 320 px (« Écrire — Orange Cyb… »),
       et c'est justement quand on écrit à cinq pistes d'affilée
       (Prospecter, « 2/5 ») qu'il faut lire à qui l'on écrit. */
    title: 'Écrire',
    /* le champ est choisi une fois le brouillon posé (plus bas) */
    icon: 'mail', className: 'modal-compose', focus: '[data-ouvrir]',
    /* R3-b : au poste, la série le pose dans sa colonne (ui/serie.js) */
    dans: opts.dans,
    onClose: () => { oublier(); ecrireBrouillonsMaintenant(); if (done) return; done = true; if (opts.onQuit) opts.onQuit(); }
  });
  /* messagerie connectée ? Hors périmètre, la réponse est « non » et tout
     le composeur retombe de lui-même sur `mailto:` — pied, pièce jointe,
     raccourci clavier compris (CLAUDE.md §0). */
  const acct = ENVOI_DIRECT ? mailAccount() : null;
  /* la personne choisie arrive pré-sélectionnée (#14) — jamais devinée */
  const initIdx = Math.max(0, cts.findIndex(t => t.id === opts.ctId));
  /* le modèle aussi arrive pré-choisi, d'après le statut de la piste */
  const tplInit = modeleConseille(tpls, c);
  /* une personne : son nom, et son rôle en encre sourde */
  const quiHTML = t => esc(t.name || t.email) + (t.role ? ` <span class="ml-role">${esc(t.role)}</span>` : '');
  const quiTexte = t => (t.name || t.email) + (t.role ? ' — ' + t.role : '');
  sh.body.innerHTML =
    `<p class="ml-pour" id="mPour"><b>${esc(c.name)}</b>${opts.progress ? `<span class="ml-n">${esc(opts.progress)}</span>` : ''}</p>
     ${/* LE PRÉAMBULE EST LE CONTENU VARIABLE, PAS LE MESSAGE.
          À qui, quel modèle, l'objet, ce qu'on sait d'elle : selon la
          piste, ça pèse de 230 à 400 px — et c'est la zone d'écriture
          qui payait la différence, jusqu'à ne plus montrer que 43 % du
          brouillon. Un geste ne peut pas changer de taille selon le
          remplissage d'une fiche. Le plancher du champ Message est ce
          qui lui rend sa place (`styles/app.css`, `.fld-body`). */''}
     ${/* À QUI, ET AVEC QUEL MODÈLE : deux LIGNES, plus deux champs
          (lot D, 29 octobre 2026 — le mainteneur : « la section envoi de
          message, peu UX et ergonomique »). Toute messagerie pose « À »
          et son destinataire sur une ligne ; ici aussi, et le message
          gagne les deux étiquettes posées au-dessus. Chaque ligne DIT sa
          valeur et s'ouvre sur le choix, la forme de « Thème »
          (`choixHTML`) — jamais un menu déroulant (GOV.UK : le menu en
          dernier recours), plus la roue d'iOS pour trois mots. Pas des
          puces non plus : essayées le même jour, quatre personnes
          joignables prenaient quatre rangs et poussaient le message aux
          trois quarts de l'écran, pour un choix que l'app fait déjà —
          le modèle d'après le statut, la personne d'après l'action. Une
          seule option : la valeur se lit, sans contrôle — un choix à une
          option n'en est pas un. */''}
     <div class="ml-a">
       <span class="ml-l" id="mToL">À</span>
       ${cts.length > 1
         ? `<button class="ml-v" id="mTo" aria-labelledby="mToL mToV" aria-haspopup="dialog"><span id="mToV">${quiHTML(cts[initIdx])}</span>${ic('chevron-right', 'ic-14')}</button>`
         : `<span class="fld-ro${cts.length ? '' : ' ml-rien'}">${cts.length ? quiHTML(cts[0]) : 'aucun email sur cette piste'}</span>`}
     </div>
     <div class="ml-a">
       <span class="ml-l" id="mTplL">Modèle</span>
       ${tpls.length > 1
         ? `<button class="ml-v" id="mTpl" aria-labelledby="mTplL mTplV" aria-haspopup="dialog"><span id="mTplV">${esc(tpls[tplInit].name)}</span>${ic('chevron-right', 'ic-14')}</button>`
         : `<span class="fld-ro">${esc((tpls[0] || {}).name || '')}</span>`}
     </div>
     ${/* L'OBJET S'AFFICHE EN ENTIER.
          Une ligne de 350 px montre ~41 caractères. Le gabarit de
          relance en produit 71 : mesuré, la moitié de l'objet vivait
          hors du champ, et c'est la seule phrase du message qui décide
          si le reste sera ouvert. Un champ qui ne montre pas sa propre
          valeur ne sert à rien — la même règle a déjà fait passer le
          formulaire de piste à une colonne au pouce.
          Il grandit donc avec son texte (deux lignes couvrent la
          fenêtre visée), et le compteur dit le plafond : 60 caractères,
          au-delà desquels un téléphone coupe l'objet dans sa liste.
          C'est une DONNÉE, comme le compte de « Affiner ③ » — pas un
          avertissement : rien ne change de couleur, rien ne bloque. */''}
     <div class="field fld-subj"><label for="mSubj">Objet<span class="fld-n" id="mSubjN" aria-hidden="true"></span></label><textarea id="mSubj" rows="1" enterkeyhint="next"></textarea></div>
     ${/* CE QU'ON SAIT D'ELLE, LÀ OÙ ON ÉCRIT SUR ELLE.
          Le modèle demande une accroche précise en première position ;
          la matière pour l'écrire — ce qu'ils font, leurs technos, le
          conseil qu'un camarade a laissé — vivait sur la fiche, DERRIÈRE
          cette feuille. Il fallait fermer, lire, retenir, rouvrir,
          taper. C'est exactement le travail que l'app est censée
          épargner, et c'est le seul endroit où il paie : une accroche
          nourrie de recherche fait passer les réponses de ~7 % à ~17 %.
          Rien n'est inventé et rien n'est inséré : ses propres notes,
          posées sous les yeux, sélectionnables. Le même mot et le même
          dessin que sur la fiche (« À savoir », `.fk`) — c'est la même
          chose, elle ne doit pas s'apprendre deux fois.
          Absent quand il n'y a rien à savoir : un cadre vide dirait
          seulement qu'on n'a rien préparé, et le site, lui, mène
          quelque part. */''}
     ${opts.sansSavoir ? '' : savoirHTML(c)}
     <div class="field fld-body"><label for="mBody">Message</label><textarea id="mBody" aria-describedby="mTrou"></textarea>
       <button class="linklike" id="mBrouillon" hidden>${ic('undo', 'ic-14')} Reprendre mon brouillon</button>
       <p class="hint warn" id="mTrou" hidden>Remplace le texte entre crochets.</p>
       ${(IA && aiConnection()) ? `<button class="linklike" id="mAi" style="margin-top:2px">${ic('sparkles', 'ic-14')} Proposer un brouillon</button>` : ''}</div>
     <div class="attach-line" id="mAttach"></div>
     <p class="hint" id="mHint"></p>`;

  const q = s => sh.body.querySelector(s);
  /* ce que les puces retiennent : la personne, le modèle */
  let ctIdx = initIdx, tplIdx = tplInit;
  /* une seule personne joignable : le choix est déjà fait */
  const currentCt = () => cts[ctIdx] || (c.contacts || [])[0] || null;
  /* l'objet grandit avec son texte. Le plafond est à quatre lignes —
     deux fois la fenêtre visée : au-delà, ce n'est plus un objet
     d'email, et laisser le champ manger la feuille punirait le corps.
     Un objet n'a pas de ligne : Entrée passe au message, et un
     copier-coller multiligne se remet à plat en entrant. */
  const OBJET_CIBLE = 60, OBJET_LIGNES = 4;
  /* appelé par `sync()`, donc par TOUS les chemins qui posent un objet —
     le gabarit, la frappe, le brouillon IA, l'annulation du brouillon.
     Un chemin qui l'oubliait laissait un champ d'une ligne sur un objet
     de trois. Le garde-fou de valeur le rend gratuit quand seul le
     message a bougé : sans lui, chaque caractère du corps relancerait
     une mesure de mise en page. `force` sert au redimensionnement, où
     la valeur n'a pas changé mais le repli, si. */
  let objetVu = null;
  /* LE MESSAGE GRANDIT AVEC SON TEXTE (lot D, 13 octobre 2026 : « quand
     on écrit, c'est horrible »). Il défilait DANS son cadre, au milieu
     d'une feuille qui défile aussi : deux défilements l'un dans l'autre
     sous le même pouce, et le début du brouillon caché au-dessus du
     curseur — mesuré en 390 × 844, les deux premières lignes. §6 le
     disait pour tout champ qu'on relit : c'est la FEUILLE qui défile,
     jamais l'endroit où l'on travaille. Le plancher reste (CSS) : la
     place de rédaction ne dépend toujours pas de ce qu'on sait de
     l'entreprise. Mesuré à chaque `sync()`, donc par tous les chemins
     qui posent un texte — le gabarit, la frappe, le brouillon, son
     annulation. */
  const pousserCorps = champGrandit(q('#mBody'));
  function syncObjet(force){
    const t = q('#mSubj');
    if (!t || (!force && t.value === objetVu)) return;
    if (t.value.includes('\n')) t.value = t.value.replace(/\s*\n+\s*/g, ' ');
    objetVu = t.value;
    /* la hauteur se pose à l'image, avec celle du message (ui/dom.js,
       `avantImage`). `scrollHeight` ne compte jamais la bordure : sans
       elle, chaque mesure rogne deux pixels et une dernière ligne finit
       par se couper. */
    avantImage({
      preparer: () => { t.style.height = 'auto'; },
      lire: () => {
        const st = getComputedStyle(t);
        const plafond = (parseFloat(st.lineHeight) || 20) * OBJET_LIGNES + parseFloat(st.paddingTop) + parseFloat(st.paddingBottom);
        return Math.ceil(Math.min(t.scrollHeight, plafond) + t.offsetHeight - t.clientHeight);
      },
      ecrire: h => { t.style.height = h + 'px'; }
    });
    q('#mSubjN').textContent = t.value.length + '/' + OBJET_CIBLE;
  }
  const aMail = document.createElement('a');
  aMail.className = 'btn';
  aMail.textContent = 'Ouvrir dans Mail';
  aMail.style.textDecoration = 'none';
  /* LE CROCHET NE PART JAMAIS CHEZ LE RECRUTEUR. Joué le 30 septembre
     2026 : profil vide, « Ouvrir dans Mail » envoyait d'un tap la
     consigne entre crochets, « Je suis en et je cherche un stage » et
     aucune signature — le tout premier mail d'un étudiant. Tant qu'un
     crochet reste, les trois sorties s'arrêtent : l'erreur se dit SOUS
     le champ (§6), la saisie reste, et le crochet est SÉLECTIONNÉ — il
     suffit de taper pour le remplacer. Aucune porte à franchir : un
     crochet qu'on veut vraiment envoyer n'existe pas dans un mail de
     candidature. Inscrit en premier, pour passer avant `logPrep` et
     `parti` : un mail qui n'est pas parti n'a pas à s'écrire au journal. */
  aMail.addEventListener('click', e => {
    if (!pasPret()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  });
  function pasPret(){
    const t = q('#mBody');
    const [x] = crochets(t.value);
    q('#mTrou').hidden = !x;
    if (!x){ t.removeAttribute('aria-invalid'); return false; }
    t.setAttribute('aria-invalid', 'true');
    t.focus();
    t.setSelectionRange(x.debut, x.fin);
    return true;
  }

  /* ce que le modèle a produit, pour savoir plus tard si l'étudiant y a touché */
  const genere = { objet: '', corps: '' };
  function fill(){
    const t = tpls[tplIdx];
    if (!t) return;
    const ct = currentCt();
    q('#mSubj').value = genere.objet = fillTpl(t.subject, c, ct, S.profile, { companies: S.companies });
    q('#mBody').value = genere.corps = fillTpl(t.body, c, ct, S.profile, { trous: true, companies: S.companies });
    sync();
  }
  /* Le profil a été complété depuis le composeur. Un brouillon intact se
     recalcule en entier (l'école, le téléphone reviennent) ; un brouillon
     touché garde tout ce que l'étudiant a écrit, seuls ses trous se
     remplissent. Avant, les deux cas recalculaient : l'accroche qu'on
     venait d'écrire disparaissait sans un mot (invariant ②). */
  function apresProfil(){
    if (!sh.body.isConnected) return;
    const touche = q('#mBody').value !== genere.corps;
    if (!touche && q('#mSubj').value === genere.objet){ fill(); return; }
    q('#mBody').value = remplirTrous(q('#mBody').value, S.profile);
    if (q('#mSubj').value === genere.objet){
      const t = tpls[tplIdx];
      if (t) q('#mSubj').value = genere.objet = fillTpl(t.subject, c, currentCt(), S.profile, { companies: S.companies });
    }
    sync();
  }
  /* indisponible = absent (loi #6) : sans adresse, ni « Envoyer » ni
     « Ouvrir dans Mail » — « Copier » devient LE bouton. Le pied se
     recompose au changement de destinataire.

     Et « Envoyée ✓ » n'existe qu'APRÈS un geste d'envoi. Il s'affichait
     d'emblée, à 8 px du bouton principal, alors qu'il n'y avait encore
     rien à confirmer — le pied comptait quatre boutons sur deux rangs
     (121 px, seule feuille de l'app dans ce cas) et le ratage le plus
     cher du produit se jouait sur cet écart : email marqué envoyé sans
     annulation possible, statut basculé, piste suivante enchaînée.
     Le pied suit maintenant le MOMENT : d'abord faire partir, ensuite
     seulement le dire. Bénéfice inattendu — une piste sans adresse peut
     enfin se marquer écrite : on copie, on colle dans LinkedIn, on
     revient, « Envoyée ✓ » est là. Elle ne le pouvait pas du tout. */
  let manual = false;               /* le message est parti : proposer « Envoyée ✓ » */
  let lastEmail = null;
  const syncFoot = () => {
    const ct = currentCt();
    const email = (ct && ct.email) || '';
    if (email === lastEmail) return;
    lastEmail = email;
    const foot = [];
    bCopy.classList.toggle('btn-primary', !email && !manual);
    aMail.classList.toggle('btn-primary', !acct && !manual);
    aMail.classList.toggle('btn-ghost', !!acct && !manual);
    bMarked.classList.add('btn-primary');
    if (manual){
      /* De retour, la question n'est plus « comment l'envoyer » mais
         « est-ce parti ? » — « Envoyée ✓ » prend donc l'accent. Le geste
         d'envoi reste en second : si l'application mail ne s'est pas
         ouverte, ou s'il faut recopier le texte, il est encore là. */
      foot.push(email ? aMail : bCopy);
      foot.push(bMarked);
    } else {
      foot.push(bCopy);
      if (email) foot.push(aMail);
      if (email && acct) foot.push(bSend);
    }
    sh.setFoot(foot);
    if (opts.onDone) sh.ov.querySelector('.modal-f').prepend(bSkip);
  };
  /* le geste qui fait passer le pied au second moment */
  const parti = () => { if (manual) return; manual = true; lastEmail = null; syncFoot(); };
  /* Copier ne bascule PAS le pied sur-le-champ. Recomposer un pied juste
     après un tap déplace les boutons sous le pouce qui vient de taper :
     mesuré, « Envoyée ✓ » atterrissait à l'endroit exact que le doigt
     venait de quitter. C'est au RETOUR — on est allé coller le message
     ailleurs, on revient — que la question « c'est parti ? » se pose, et
     là plus rien n'est en vol. `visibilitychange` couvre le changement
     d'application au téléphone, `focus` le changement de fenêtre au
     poste. */
  let copie = false;
  const auRetour = () => { if (copie && sh.body.isConnected) parti(); };
  const surVisible = () => { if (!document.hidden) auRetour(); };
  document.addEventListener('visibilitychange', surVisible);
  window.addEventListener('focus', auRetour);
  /* l'objet se replie autrement à chaque largeur : tourner le téléphone
     laissait un champ de deux lignes contenant une ligne, ou l'inverse */
  const surTaille = () => { if (sh.body.isConnected) syncObjet(true); };
  window.addEventListener('resize', surTaille);
  const oublier = () => {
    document.removeEventListener('visibilitychange', surVisible);
    window.removeEventListener('focus', auRetour);
    window.removeEventListener('resize', surTaille);
  };
  function sync(){
    syncObjet();
    pousserCorps.aLImage();
    /* l'erreur part dès que le dernier crochet est remplacé — jamais avant */
    if (!q('#mTrou').hidden && !crochets(q('#mBody').value).length){
      q('#mTrou').hidden = true;
      q('#mBody').removeAttribute('aria-invalid');
    }
    const ct = currentCt();
    const email = ct && ct.email;
    if (email){
      aMail.href = 'mailto:' + encodeURIComponent(email) +
        '?subject=' + encodeURIComponent(q('#mSubj').value) +
        '&body=' + encodeURIComponent(q('#mBody').value);
      /* « Destinataire : » redisait le libellé du champ posé deux rangs
         plus haut. L'adresse seule, sous un champ intitulé
         « Destinataire », ne peut être que celle du destinataire. */
      q('#mHint').innerHTML = acct
        ? `Depuis <b>${esc(acct.email || 'ta messagerie')}</b> → ${esc(email)}`
        : `${esc(email)}` + (ENVOI_DIRECT
            ? ` <button class="linklike" id="mDirect" style="min-height:0;padding:0 4px">Envoyer directement depuis l’app ?</button>`
            : '');
      q('#mDirect')?.addEventListener('click', () => openConnexions());
    } else {
      aMail.removeAttribute('href');
      /* SANS ADRESSE, À QUI ? La piste venue de l'annuaire n'a personne :
         le composeur nomme la personne que la carte connaît et ouvre la
         recherche qui la trouve — rien n'est deviné. */
      const qui = (carteConnue(c) || {}).ecrire;
      q('#mHint').innerHTML = qui && qui.url
        ? `Pas d’email — Copier, puis <a class="linklike" href="${esc(qui.url)}" target="_blank" rel="noopener">${
            qui.cible === 'dirigeant' ? esc(qui.nom) + ' sur LinkedIn' : 'le recrutement sur LinkedIn'}${ic('external-link', 'ic-12')}</a>`
        : 'Pas d’email — Copier, puis LinkedIn ou le site.';
    }
    /* Profil vide = le message part SANS SIGNATURE, chez un recruteur.
       Le lien reste au poids de son voisin — mais il garde le plancher du
       doigt (`--ctl`), que `min-height:0` lui retirait : il rendait 17 px
       de haut. L'exemption WCAG pour un lien « en ligne » ne le couvre
       pas — il n'est pas DANS une phrase, il est collé derrière une
       adresse e-mail, et il ouvre une feuille entière. La ligne grandit
       donc de 27 px, et seulement dans cet état-là : elle disparaît dès
       que le nom, la formation et la recherche sont là. */
    /* Et pas seulement sans nom. Sans formation, la présentation du modèle
       se lit « Je suis en et je cherche… » ; sans recherche choisie, elle
       dit « un stage » à qui cherche une alternance. Les deux se voient
       dans le message juste en dessous, mais pas ce qui les répare — le
       lien le dit, ICI, au moment où ça compte (aide au moment du geste,
       NN/g). L'école et le téléphone n'y sont pas : leur absence retire
       une ligne, elle ne rend rien faux. */
    if (!S.profile.name || !String(S.profile.formation || '').trim() || !S.profile.recherche){
      const b = el(`<button class="linklike" id="mProfil">Compléter mon profil</button>`);
      b.addEventListener('click', () => openProfil(apresProfil));
      q('#mHint').classList.add('hint-act');
      /* l'espace reste dans le DOM : la grille flex l'ignore pour le
         dessin (c'est `gap` qui écarte), mais tout ce qui LIT le texte —
         extraction, copie, outil d'assistance — verrait sinon
         « sophie@x.testCompléter mon profil » d'un seul tenant */
      q('#mHint').append(' ', b);
    }
    syncFoot();
  }

  /* ---- joindre CV / LM : vraie pièce jointe PDF (#16, #4) ----
     La ligne n'existe qu'avec l'envoi direct (un mailto ne joint rien) ;
     sans aucun document, un « joindre un CV » discret la remplace. */
  const picked = { cv: '', lm: '' };
  let docs = [];
  async function renderAttach(){
    const box = q('#mAttach');
    if (!box || !acct) return;
    docs = await listDocs();
    if (!sh.body.isConnected) return;
    if (!docs.length){
      box.innerHTML = `<button class="linklike" id="mAttAdd">${ic('attachment', 'ic-14')} joindre un CV</button>`;
      box.querySelector('#mAttAdd').addEventListener('click', () =>
        pickPdf('cv', k => { picked.cv = k; renderAttach(); }));
      return;
    }
    const sel = kind =>
      `<label class="att-sel">${kind === 'cv' ? 'CV' : 'LM'}
         <select data-att="${kind}">
           <option value="">Aucun</option>
           ${docs.filter(d => docKind(d.key) === kind).map(d =>
             `<option value="${esc(d.key)}"${picked[kind] === d.key ? ' selected' : ''}>${esc(docTitle(d))}</option>`).join('')}
         </select>
       </label>`;
    box.innerHTML = `${ic('attachment', 'ic-14')} ${sel('cv')} ${sel('lm')}`;
    box.querySelectorAll('[data-att]').forEach(s =>
      s.addEventListener('change', () => { picked[s.dataset.att] = s.value; }));
  }
  /* les documents choisis, prêts pour l'envoi (base64) */
  async function pickedAttachments(){
    const out = [];
    for (const key of [picked.cv, picked.lm].filter(Boolean)){
      const d = await docGet(key).catch(() => null);
      if (!d || !d.blob) continue;
      const buf = new Uint8Array(await new Blob([d.blob]).arrayBuffer());
      out.push({ name: d.name || 'document.pdf', type: d.type || 'application/pdf', b64: bytesToB64(buf) });
    }
    return out;
  }
  /* trace « préparé » une seule fois, au premier geste concret */
  function logPrep(){
    if (logged) return;
    logged = true;
    const ct = currentCt();
    const who = ct ? (ct.name || ct.email) : '';
    if (ct) activateContact(c, ct);                     /* #14 : écrit = activé */
    pushHist(c, 'Email préparé' + (who ? ' — ' + who : ''));
    logJ('Email préparé : ' + c.name + (who ? ' (' + who + ')' : ''), c.id);
    saveData();
  }
  /* la boucle d'après-envoi — la même, que l'envoi soit direct ou marqué */
  function markSentAndFollow(){
    const ct = currentCt();
    const who = ct ? (ct.name || ct.email) : '';
    if (ct) activateContact(c, ct);                     /* #14 : écrit = activé */
    pushHist(c, 'Email envoyé' + (who ? ' — ' + who : ''));
    logJ('Email envoyé : ' + c.name + (who ? ' (' + who + ')' : ''), c.id);
    if (c.status === 'todo') c.status = 'active';
    if (!c.appliedAt) c.appliedAt = todayISO();
    c.updatedAt = Date.now();
    saveData();
    oublierBrouillon(c.id);                             /* parti : le brouillon n'a plus d'objet */
    if (opts.onEnvoye) opts.onEnvoye();                 /* la file de la série le dit */
    done = true;
    sh.close();
    bus.refresh();
    askNextAction(c, {
      title: 'Et ensuite ?',
      preset: 'Relancer' + (who ? ' ' + who : ''),
      conseil: SILENCE_RELANCE,                         /* « Dans 7 jours », sous le pouce */
      ctId: ct && ct.id,                                /* la relance vise la personne */
      onDone: advance
    });
  }
  /* CHANGER DE MODÈLE OU DE PERSONNE REFAIT LE BROUILLON — et ce que la
     main y avait écrit revient d'un tap (invariant ②). Le menu d'avant
     refaisait le texte sans un mot : une accroche écrite, un modèle
     effleuré, et elle disparaissait. Un brouillon que personne n'a
     touché se refait en silence : il n'y a rien à perdre. */
  const poserValeurs = () => {
    if (q('#mToV')) q('#mToV').innerHTML = quiHTML(cts[ctIdx]);
    if (q('#mTplV')) q('#mTplV').textContent = tpls[tplIdx].name;
  };
  const appliquer = (poser, annonce) => {
    const avant = { objet: q('#mSubj').value, corps: q('#mBody').value, ct: ctIdx, tpl: tplIdx };
    const touche = avant.objet !== genere.objet || avant.corps !== genere.corps;
    poser();
    poserValeurs();
    fill();
    garder();
    if (touche) showUndo(annonce(), () => {
      if (!sh.body.isConnected) return;
      ctIdx = avant.ct; tplIdx = avant.tpl;
      poserValeurs();
      q('#mSubj').value = avant.objet;
      q('#mBody').value = avant.corps;
      sync();
      garder();
    });
  };
  /* la feuille du choix : les options de « Thème », la retenue cochée ;
     un tap choisit et referme, le composeur reprend la main */
  const ouvrirChoix = (titre, options, actuel, poser, annonce) => {
    const s2 = openSheet({ title: titre, icon: 'mail' });
    s2.body.innerHTML = choixHTML(options, actuel, { attr: 'data-mchoix' });
    s2.body.querySelectorAll('[data-mchoix]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.mchoix;
      s2.close();
      if (i !== actuel) appliquer(() => poser(i), annonce);
    }));
  };
  q('#mTo')?.addEventListener('click', () => ouvrirChoix('Destinataire', cts.map((t, i) => [i, quiTexte(t)]), ctIdx,
    i => { ctIdx = i; }, () => 'Brouillon refait pour ' + ((cts[ctIdx] || {}).name || (cts[ctIdx] || {}).email || 'cette personne') + '.'));
  q('#mTpl')?.addEventListener('click', () => ouvrirChoix('Modèle', tpls.map((t, i) => [i, t.name]), tplIdx,
    i => { tplIdx = i; }, () => 'Modèle « ' + tpls[tplIdx].name + ' » posé.'));
  q('#mSubj').addEventListener('input', sync);
  q('#mSubj').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    q('#mBody').focus();
  });
  q('#mBody').addEventListener('input', sync);
  /* R3 : CE QU'ON ÉCRIT SE GARDE, sur cet appareil. Seulement ce que la
     main a tapé — jamais le modèle tel quel : rouvrir sur un texte
     qu'on n'a pas touché, c'est le modèle, et il se recalcule de
     lui-même. Pas depuis `sync()` : `fill()` l'appelle à l'ouverture et
     effacerait le brouillon avant qu'il revienne. */
  const garder = () => {
    const objet = q('#mSubj').value, corps = q('#mBody').value;
    if (objet === genere.objet && corps === genere.corps) oublierBrouillon(c.id);
    else garderBrouillon(c, { objet, corps, ctId: (currentCt() || {}).id, statut: c.status });
  };
  q('#mSubj').addEventListener('input', garder);
  q('#mBody').addEventListener('input', garder);
  aMail.addEventListener('click', logPrep);
  /* brouillon IA : le texte tombe dans le champ ÉDITABLE — relecture
     par construction, le gabarit reste le repli */
  q('#mAi')?.addEventListener('click', async () => {
    const b = q('#mAi');
    b.disabled = true;
    b.textContent = 'L’IA rédige…';
    try {
      const ct = currentCt();
      const conn = aiConnection();
      /* l'intention vient du modèle que l'utilisateur a DÉJÀ choisi juste
         au-dessus : sans elle, une « Relance » produisait une première
         candidature. C'est son propre choix, pas une donnée de suivi. */
      const tpl = tpls[tplIdx];
      const prompt = draftPrompt({
        company: c, contactName: ct && ct.name, contactRole: ct && ct.role,
        profile: S.profile, intent: tpl && tpl.name
      });
      const txt = conn && conn.channel === 'ordinateur'
        ? await aiCompleteViaOrdinateur(conn, prompt, { cancelled: () => !sh.body.isConnected })
        : await aiComplete(conn, prompt);
      if (!sh.body.isConnected) return;   /* feuille fermée entre-temps */
      if (txt){
        /* un brouillon écrase un texte que l'utilisateur a peut-être écrit :
           c'est un geste lourd, il a droit à son Annuler (invariant ②) */
        const avant = { subject: q('#mSubj').value, body: q('#mBody').value };
        const { subject, body } = splitDraft(txt);
        if (subject) q('#mSubj').value = subject;   /* sinon l'objet du modèle reste */
        q('#mBody').value = body;
        sync();
        showUndo(`${ic('sparkles', 'ic-14')} Brouillon proposé — relis avant d’envoyer.`, () => {
          if (!sh.body.isConnected) return;
          q('#mSubj').value = avant.subject;
          q('#mBody').value = avant.body;
          sync();
          toast('Ton texte est revenu.');
        });
      }
      else toast('L’IA n’a rien proposé — le modèle reste là.');
    } catch (e) {
      if (e.message === 'annule' || !sh.body.isConnected) return;   /* abandon voulu : silence */
      toast(e.message === 'quota' ? 'Quota IA atteint — le modèle reste là.'
        : e.message === 'cle' ? 'Clé refusée — vérifie-la dans Connexions.'
        : e.message === 'modele' ? 'Choisis un modèle dans Connexions — la liste vient du fournisseur.'
        : e.message === 'ordinateur' ? 'Associe l’ordinateur dans « Mes appareils » d’abord.'
        : e.message === 'eteint' ? 'Ton ordinateur est éteint — ouvre l’ordinateur.'
        : e.message === 'runtime' ? 'Le moteur IA de ton ordinateur ne répond pas — il est bien installé ?'
        : e.message === 'occupe' ? 'Une rédaction est déjà en cours — un instant.'
        : 'L’IA ne répond pas — le modèle reste là.');
    }
    b.disabled = false;
    b.innerHTML = ic('sparkles', 'ic-14') + ' Proposer un brouillon';
  });

  const bCopy = btn('Copier', '', async () => {
    if (pasPret()) return;
    logPrep();
    try {
      await navigator.clipboard.writeText('Objet : ' + q('#mSubj').value + '\n\n' + q('#mBody').value);
      toast('Message copié.');
    } catch (e) {
      q('#mBody').select();
      toast('Sélectionné — copie avec Ctrl/Cmd+C.');
    }
    copie = true;     /* le pied ne bouge pas maintenant — voir `auRetour` */
  }, 'copy');
  const bMarked = btn('Envoyée ✓', '', markSentAndFollow);

  /* jeton expiré / révoqué : le brouillon ne bouge pas, la
     reconnexion s'empile au-dessus */
  const askReconnect = () => {
    const s2 = openSheet({
      title: 'Reconnexion',
      icon: 'mail', className: 'modal-confirm'
    });
    s2.body.innerHTML = '<p class="cf-msg">' + (acct.provider === 'gmail' ? 'Gmail' : 'Outlook') + ' demande de te reconnecter. Ton brouillon ne bouge pas.</p>';
    s2.setFoot([
      el(`<a class="btn" href="${aMail.href || '#'}" style="text-decoration:none">Ouvrir dans Mail</a>`),
      btn('Reconnecter', 'btn-primary', () => { s2.close(); openConnexions(); })
    ]);
  };
  const doSend = async () => {
    const ct = currentCt();
    if (!ct || !ct.email){ toast('Ajoute une adresse e-mail — ou copie le message.'); return; }
    if (sending || pasPret()) return;
    sending = true;
    logPrep();
    bSend.disabled = true;
    bSend.textContent = 'Envoi…';
    try {
      const attachments = await pickedAttachments();
      const token = await freshToken(acct.provider);
      await sendMail(acct.provider, token, {
        from: acct.email, to: ct.email,
        subject: q('#mSubj').value, body: q('#mBody').value,
        attachments
      });
      markSentAndFollow();
    } catch (e) {
      sending = false;
      bSend.disabled = false;
      bSend.textContent = 'Envoyer';
      if (e.message === 'expire') askReconnect();
      else toast('Pas parti — réessaie, ou ouvre dans Mail.');
    }
  };
  const bSend = acct ? btn('Envoyer', 'btn-primary', doSend, 'mail') : null;
  const bSkip = btn('Passer →', 'btn-ghost', () => { done = true; sh.close(); advance(); });

  /* passer par Mail fait apparaître le marquage à la main */
  aMail.addEventListener('click', parti);
  if (acct){
    /* ordinateur : Ctrl/Cmd+Entrée envoie */
    sh.body.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && lastEmail && !sending) doSend();
    });
  }
  fill();
  /* LE BROUILLON REVIENT où on l'avait laissé — la personne, l'objet, le
     message. Si la piste a changé de statut depuis (une réponse est
     arrivée), le modèle d'aujourd'hui est sans doute plus juste : le
     brouillon se propose, il ne s'impose pas. */
  const br = brouillon(c);
  if (br){
    const poser = () => {
      const i = br.ctId ? cts.findIndex(t => t.id === br.ctId) : -1;
      if (i >= 0){ ctIdx = i; poserValeurs(); }
      q('#mSubj').value = br.objet;
      q('#mBody').value = br.corps;
      q('#mBrouillon').hidden = true;
      sync();
    };
    if (!br.perime) poser();
    else {
      q('#mBrouillon').hidden = false;
      q('#mBrouillon').addEventListener('click', () => { poser(); garder(); q('#mBody').focus(); });
    }
  }
  /* LE CURSEUR LÀ OÙ IL RESTE QUELQUE CHOSE À ÉCRIRE. Il s'ouvrait dans
     l'objet, déjà rempli (49/60), pendant que la seule chose à écrire —
     l'accroche entre crochets — attendait deux champs plus bas, et qu'au
     doigt le clavier montait pour rien (audit du 28 octobre 2026). Le
     motif de dialogue d'ARIA (APG) pose le focus initial là où la
     feuille attend une saisie, pas forcément sur son premier champ : ici
     c'est le crochet, et il est SÉLECTIONNÉ — il suffit de taper pour le
     remplacer, comme après le refus de « Ouvrir dans Mail ». Sans
     crochet (un brouillon repris, déjà écrit), l'objet comme avant. */
  const trou = crochets(q('#mBody').value)[0];
  (trou || !cts.length ? q('#mBody') : q('#mSubj')).dataset.ouvrir = '';
  /* le focus d'ouverture part à l'image (openSheet), inscrit avant
     celle-ci : à la même image, le crochet est encore à sa place, et le
     curseur n'a pas bougé si personne n'a encore touché la feuille */
  if (trou) requestAnimationFrame(() => {
    const t = q('#mBody');
    if (document.activeElement !== t || t.selectionStart !== t.selectionEnd) return;
    const [x] = crochets(t.value);
    if (x) t.setSelectionRange(x.debut, x.fin);
  });
  renderAttach();
  return sh;
}
