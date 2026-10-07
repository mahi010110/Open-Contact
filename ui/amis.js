/* ============================================================
   OpenContact — interface · les amis (docs/reseau.md, lot 2)

   Un ami est quelqu'un dont tu as le PROFIL : son nom et son parcours.
   Ce que ça te rapporte se lit AILLEURS, là où tu travailles — « Karim
   y est en alternance » sur ta piste Aztek, dans la barre, dans
   « Aujourd'hui » —, pas dans un écran à visiter. Ici, il n'y a donc
   que le geste et la liste :

   · « Mon QR » montre ton profil dans l'image, et dit EXACTEMENT ce
     qu'il contient (ton nom, ton parcours) : on voit ce qu'on donne
     avant de le donner (le « choisis ce que tu partages » de NameDrop,
     ramené à ce qui sert) ;
   · « Scanner » est le scanner de « Recevoir » — un seul pour tout ;
   · l'aperçu d'un profil reçu passe AVANT tout ajout (invariant ②), et
     montre tout de suite ce qu'il rapporte : les entreprises de ses
     expériences qui sont déjà dans tes pistes ;
   · la fiche d'un ami : son parcours, chaque entreprise qui mène à ta
     piste ou qui s'y ajoute d'un tap, et « Retirer » — nommé, rouge, en
     dernier, rattrapable 30 s. Personne n'est prévenu (LinkedIn fait
     pareil : retirer quelqu'un ne lui envoie rien).

   Le mot est « ami » (§7, décision du 7 octobre 2026) : une personne
   dont tu as le profil. « Groupe » reste le collectif, « contact » la
   personne dans une entreprise.
   ============================================================ */
import { esc, todayISO, uid } from '../engine/utils.js';
import { normalizeCompany } from '../engine/model.js';
import { PARCOURS, periodeParcours } from '../engine/parcours.js';
import { nouvelIdAmi, profilDonne, statutAmi, ajouterAmi, retirerAmi, prenomAmi,
         portesAmis, memeEntreprise } from '../engine/amis.js';
import { encodeOCA } from '../engine/exchange.js';
import { S, bus, saveData, saveProfile, logJ, deletePiste } from './state.js';
import { openSheet, toast, btn, ic, showUndo } from './dom.js';
import { makeQrSvg } from './qr.js';

/* ce que le parcours de tes amis dit de tes pistes — calculé à la
   demande : l'index du moteur le rend linéaire, rien à mémoriser */
export const portesDuJour = () => portesAmis(S.companies, S.profile.amis, todayISO());

const pisteDe = e => S.companies.find(c => !c.closedReason && memeEntreprise(c, e))
                  || S.companies.find(c => memeEntreprise(c, e)) || null;
const ligneExperience = e => [PARCOURS[e.quoi] && PARCOURS[e.quoi].label, periodeParcours(e)].filter(Boolean).join(' · ');
/* la sous-ligne d'un ami dans la liste : où il est passé, le plus
   récent d'abord — c'est ce qui le distingue d'un autre Karim */
const resumeAmi = a => (a.parcours || []).map(e => e.entreprise).join(' · ');

/* ---------- la liste ---------- */
export function openAmis(){
  const sh = openSheet({ title: 'Amis', icon: 'users' });
  const dessiner = () => {
    if (!sh.body.isConnected) return;
    const amis = (S.profile.amis || []).slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    sh.body.innerHTML = amis.length
      ? `<div class="pick-list" id="amListe">${amis.map(a =>
          `<button class="pick" data-ami="${esc(a.id)}"><div class="pk-m"><b>${esc(a.nom)}</b>${
            resumeAmi(a) ? `<span class="pk-s">${esc(resumeAmi(a))}</span>` : ''}</div>${
            ic('chevron-right', 'ic-14')}</button>`).join('')}</div>`
      /* L'état vide enseigne le produit (§6) — en une phrase, et ce
         qu'elle promet est ce qui se VERRA sur les pistes */
      : `<p class="doc-vide" id="amVide">Tes pistes diront où tes amis sont passés.</p>`;
    sh.body.querySelectorAll('[data-ami]').forEach(b => b.addEventListener('click', () => {
      const a = (S.profile.amis || []).find(x => x.id === b.dataset.ami);
      if (a) openAmi(a, dessiner);
    }));
  };
  dessiner();
  const scanner = btn('Scanner', '', async () => (await import('./recevoir.js')).openRecevoir({ scanner: true, apres: dessiner }), 'grid-3x3');
  const monQR = btn('Mon QR', 'btn-primary', () => openMonQR({ apres: dessiner }), 'user');
  scanner.id = 'amScan'; monQR.id = 'amMonQR';
  sh.setFoot([scanner, monQR]);
  return sh;
}

/* ---------- mon QR ----------
   L'identifiant se tire ICI, au premier don : un profil qui n'a jamais
   été donné n'en a pas besoin. */
export async function openMonQR(o = {}){
  const p = S.profile;
  if (!String(p.name || '').trim()){
    /* SANS NOM, PAS DE QR : ton ami recevrait un profil qu'il ne pourrait
       pas reconnaître. Plutôt qu'une feuille qui l'explique, l'app ouvre
       directement ce qui manque — ton profil, le curseur sur le nom — et
       montre le QR dès qu'il est enregistré (§6, « peut-il être
       implicite ? »). */
    const { openProfil } = await import('./profil.js');
    openProfil(() => { if (String(S.profile.name || '').trim()) openMonQR(o); }, { focus: '#pfName' });
    return null;
  }
  const sh = openSheet({ title: 'Mon QR', icon: 'grid-3x3' });
  if (!p.amiId){ p.amiId = nouvelIdAmi(); saveProfile(); }
  /* LA BOÎTE NAÎT ICI aussi (lot 3) : le QR porte la clé où tes amis
     pourront te demander quelqu'un. Un vieux navigateur sans WebCrypto
     donne son QR sans elle — on ne pourra pas lui écrire, c'est tout. */
  try { await (await import('./reseau.js')).assurerBoite(); } catch (e) {}
  const donne = profilDonne(p, S.companies);
  let txt, svg;
  try {
    txt = await encodeOCA(donne);
    svg = await makeQrSvg(txt);
  } catch (e) {
    sh.body.innerHTML = `<p class="hint warn">Ce navigateur est trop ancien.</p>`;
    return sh;
  }
  if (!sh.body.isConnected) return sh;
  sh.body.innerHTML =
    `<div class="qr-wrap" role="img" aria-label="Mon profil en QR, à faire scanner">${svg}</div>
     ${/* CE QUI PART, en entier, sous l'image : rien de caché derrière
          un QR. Le nom et les entreprises — c'est tout. */''}
     <div class="mq-donne" id="mqDonne">
       <b>${esc(donne.nom)}</b>
       ${donne.parcours.length
         ? `<span>${esc(donne.parcours.map(e => (PARCOURS[e.quoi] ? PARCOURS[e.quoi].label + ' chez ' : '') + e.entreprise).join(' · '))}</span>`
         : `<button class="linklike" id="mqParcours">${ic('plus', 'ic-14')} Ajouter mon parcours</button>`}
     </div>`;
  sh.body.querySelector('#mqParcours')?.addEventListener('click', async () => {
    sh.close();
    (await import('./profil.js')).openProfil(() => openMonQR(o));
  });
  /* À DISTANCE : le même profil en texte, à coller dans « Recevoir →
     Texte ». La phrase dit où le coller — c'est l'ami qui la lira. */
  /* le bouton DIT qu'il a copié, là où l'on vient de toucher — pas un
     toast de plus pour un résultat qu'on regarde déjà */
  const copier = btn('Copier', '', async () => {
    try {
      await navigator.clipboard.writeText(`Mon profil OpenContact — colle ce message dans Échanger › Recevoir › Texte :\n${txt}`);
      copier.innerHTML = ic('check', 'ic-14') + ' Copié';
    } catch (e) { toast('Copie impossible ici — montre plutôt le QR.'); }
  }, 'copy');
  const scanner = btn('Scanner', '', async () => {
    sh.close();
    (await import('./recevoir.js')).openRecevoir({ scanner: true, apres: o.apres });
  }, 'grid-3x3');
  copier.id = 'mqCopier'; scanner.id = 'mqScan';
  sh.setFoot([copier, scanner]);
  return sh;
}

/* ---------- un profil reçu : l'aperçu AVANT ----------
   Appelé par « Recevoir » quand ce qu'on a scanné ou collé est un
   profil. `a` est déjà remis aux invariants (normalizeAmi) : « Recevoir »
   refuse, avant d'arriver ici, ce qui ne se lit pas comme un profil. */
export function apercuAmi(sh, a, o = {}){
  const st = statutAmi(S.profile.amis, a, S.profile.amiId);
  const prenom = prenomAmi(a);
  sh.setTitle(a.nom);
  /* Deux ÉTATS, pas des explications : ton propre QR (photographié,
     recopié), ou un ami déjà là sans rien de neuf. Rien à ajouter —
     on le lit, on ferme. */
  const etat = st === 'moi' ? 'C’est ton profil.' : st === 'identique' ? 'Déjà dans tes amis.' : '';
  /* L'AMITIÉ EST RÉCIPROQUE (décision du 7 octobre 2026) : l'ajouter lui
     donne ton profil. Ça se dit AVANT le geste — c'est ton nom et ton
     parcours qui partent, et on ne le devinerait pas. Un QR d'avant les
     boîtes (sans clé) ne peut rien recevoir : rien à dire. */
  sh.body.innerHTML = parcoursHTML(a, { lecture: true })
    + (etat ? `<p class="am-etat" id="amEtat">${ic('check', 'ic-14')} ${etat}</p>`
      : a.cle ? `<p class="dm-qui" id="amReci">${ic('users', 'ic-14')} ${esc(prenom)} aura aussi ton profil.</p>` : '');
  if (etat){
    sh.setFoot([btn('OK', 'btn-primary', () => sh.close())]);
    return;
  }
  const ajouter = () => {
    const avant = (S.profile.amis || []).slice();
    S.profile.amis = ajouterAmi(S.profile.amis, a);
    saveProfile();
    bus.refresh();
    sh.close();
    if (o.apres) o.apres();
    /* ton profil part vers lui — ou attend le réseau, puis part */
    if (a.cle) import('./reseau.js').then(m => m.donnerMonProfil(a)).catch(() => {});
    showUndo(`${ic('check', 'ic-14')} ${esc(prenom)} ${st === 'maj' ? 'est à jour' : 'est dans tes amis'}.`, () => {
      S.profile.amis = avant;
      saveProfile();
      bus.refresh();
      if (o.apres) o.apres();
      /* annuler, c'est aussi ne pas lui donner ton profil */
      if (a.cle) import('./reseau.js').then(m => m.reprendreMonProfil(a)).catch(() => {});
    });
  };
  const ok = btn(st === 'maj' ? 'Mettre à jour' : 'Ajouter ' + prenom, 'btn-primary', async () => {
    /* SANS NOM, PAS DE PROFIL À DONNER : comme pour « Mon QR », l'app
       ouvre ce qui manque, le curseur sur le nom, et ajoute dès qu'il est
       enregistré (§6, « peut-il être implicite ? ») */
    if (a.cle && !String(S.profile.name || '').trim()){
      const { openProfil } = await import('./profil.js');
      openProfil(() => { if (String(S.profile.name || '').trim()) ajouter(); }, { focus: '#pfName' });
      return;
    }
    ajouter();
  }, st === 'maj' ? 'reload' : 'plus');
  ok.id = 'amAjouter';
  sh.setFoot(o.onBack ? [btn('← Retour', 'btn-ghost', o.onBack), ok] : [ok]);
}

/* Les expériences d'un ami. Une entreprise déjà dans tes pistes le DIT
   (en accent, c'est un atout, pas une urgence) — c'est ce que l'ami te
   rapporte, et ça se voit avant même de l'ajouter. Hors lecture, elle
   mène à ta fiche ; les autres s'ajoutent à tes pistes d'un tap. */
function parcoursHTML(a, { lecture = false } = {}){
  if (!(a.parcours || []).length) return '';
  return `<div class="pick-list am-par">${a.parcours.map((e, i) => {
    const c = pisteDe(e);
    /* « dans tes pistes » ne se dit qu'à l'APERÇU, où rien d'autre ne
       le montre. Dans la fiche de l'ami, le chevron le dit déjà (la
       ligne mène à ta piste), et le « + Piste » des autres l'inverse. */
    const sous = `<span class="pk-s">${c && lecture ? `<span class="am-tienne">dans tes pistes</span>${ligneExperience(e) ? ' · ' : ''}` : ''}${esc(ligneExperience(e))}</span>`;
    const m = `<div class="pk-m"><b>${esc(e.entreprise)}</b>${sous}</div>`;
    if (lecture) return `<div class="pick am-ro">${m}</div>`;
    return c
      ? `<button class="pick" data-piste="${esc(c.id)}">${m}${ic('chevron-right', 'ic-14')}</button>`
      : `<div class="pick am-ro">${m}<button class="btn btn-sm" data-ajout="${i}" aria-label="Ajouter ${esc(e.entreprise)} à mes pistes">${ic('plus', 'ic-14')} Piste</button></div>`;
  }).join('')}</div>`;
}

/* ---------- la fiche d'un ami ---------- */
function openAmi(a, apres){
  const sh = openSheet({ title: a.nom, icon: 'user' });
  const dessiner = () => {
    if (!sh.body.isConnected) return;
    const frais = (S.profile.amis || []).find(x => x.id === a.id) || a;
    /* UN PROFIL DONNÉ AVANT LES DEMANDES (6.54) n'a pas de boîte : on
       ne peut rien lui demander tant qu'il n'a pas redonné son QR. Une
       fois, et c'est le seul endroit où ça se dit — le geste, pas la
       raison. */
    sh.body.innerHTML = parcoursHTML(frais)
      + (frais.cle ? '' : `<p class="hint" id="amAncien">${ic('reload', 'ic-14')} Rescanne son QR pour lui demander quelqu’un.</p>`)
      + `<div class="pick-list pick-sortie">
           <button class="pick pick-danger" id="amRetirer"><b>${ic('trash', 'ic-14')} Retirer de mes amis</b></button>
         </div>`;
    sh.body.querySelectorAll('[data-piste]').forEach(b => b.addEventListener('click', async () => {
      const c = S.companies.find(x => x.id === b.dataset.piste);
      if (c) (await import('./fiche.js')).openFiche(c);
    }));
    sh.body.querySelectorAll('[data-ajout]').forEach(b => b.addEventListener('click', () => {
      const e = frais.parcours[+b.dataset.ajout];
      if (!e) return;
      ajouterPiste(e, prenomAmi(frais), dessiner);
      dessiner();
    }));
    sh.body.querySelector('#amRetirer').addEventListener('click', () => {
      const avant = (S.profile.amis || []).slice();
      S.profile.amis = retirerAmi(S.profile.amis, a.id);
      saveProfile();
      bus.refresh();
      sh.close();
      if (apres) apres();
      showUndo(`${esc(prenomAmi(a))} n’est plus dans tes amis.`, () => {
        S.profile.amis = avant;
        saveProfile();
        bus.refresh();
        if (apres) apres();
      });
    });
  };
  dessiner();
  return sh;
}

/* Une entreprise du parcours d'un ami devient une piste : son nom, et
   son SIREN s'il l'a donné — rien d'autre n'est inventé. La fiche dira
   d'elle-même « Karim y est en alternance ». */
function ajouterPiste(e, prenom, apres){
  const c = normalizeCompany({ id: uid(), name: e.entreprise, createdAt: Date.now(), ...(e.siren ? { siren: e.siren } : {}) });
  c.history = [{ d: todayISO(), t: 'Ajoutée depuis le parcours de ' + prenom }];
  S.companies.push(c);
  saveData();
  logJ('Piste ajoutée depuis le parcours de ' + prenom + ' : ' + c.name, c.id);
  bus.refresh();
  showUndo(`${ic('check', 'ic-14')} « ${esc(c.name)} » ajoutée.`, () => { deletePiste(c); bus.refresh(); apres(); });
}
