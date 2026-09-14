/* ============================================================
   OpenContact — interface · modifier la fiche (champs partagés)
   Tout ce qui peut circuler dans un partage : identité, domaine,
   site, adresse, technos, postes, process, conseils. Le suivi
   privé (statut, notes, actions) ne passe jamais par ici.
   ============================================================ */
import { esc, debounce, surUnRang } from '../engine/utils.js';
import { DOMAINS, POSITIONS, VECU, pushHist } from '../engine/model.js';
import { suggestAddresses } from '../engine/geo.js';
import { bus, saveData, logJ } from './state.js';
import { openSheet, toast, btn, clavier, champGrandit } from './dom.js';

const FIELDS = ['name','city','domain','desc','website','address','techs','process','tips'];

/* Le formulaire des champs partagés, en un seul endroit : « Modifier »
   s'en sert pour une fiche existante, la capture sur ordinateur pour une
   piste neuve (#3). Les deux écrans évoluent donc ensemble. */
/* `ed-form` : au pouce une colonne, au poste DEUX. Une seule colonne de
   860 px dans une fenêtre de 900 donnait des champs trop longs à lire,
   un formulaire qui déborde, et le contact repoussé sous la ligne de
   flottaison — alors que la place était à côté, pas en dessous. */
export function sharedFieldsHTML(c){
  return (
    `<div class="ed-form">
     <div class="grid2">
       <div class="field"><label for="edName">Entreprise *</label><input id="edName" value="${esc(c.name)}" ${clavier('nom')}></div>
       <div class="field"><label for="edCity">Ville</label><input id="edCity" value="${esc(c.city)}" ${clavier('nom')}></div>
     </div>
     <div class="field"><label for="edDomain">Domaine</label>
       <select id="edDomain">${Object.keys(DOMAINS).map(k =>
         `<option value="${k}"${c.domain === k ? ' selected' : ''}>${DOMAINS[k].label}</option>`).join('')}</select></div>
     <div class="field"><label for="edDesc">En un mot</label>
       <textarea id="edDesc" class="ta-s" placeholder="Ce qu'elle fait, pourquoi elle t'intéresse">${esc(c.desc)}</textarea></div>
     <div class="grid2">
       <div class="field"><label for="edWebsite">Site web</label>
         <input id="edWebsite" type="url" value="${esc(c.website)}" placeholder="https://…" autocomplete="off" ${clavier('lien')}></div>
       ${/* UNE ADRESSE NE TIENT PAS SUR UN RANG DE TÉLÉPHONE, et un
            `<input>` ne sait pas se replier — il défile. Mesuré avec une
            adresse ordinaire : 33 à 194 px de texte cachés à TOUTES les
            largeurs de téléphone, 390 px à 100 % compris. Ce n'est pas
            un cas extrême, c'est le cas courant.
            Elle devient donc un champ qui grandit — le motif que §6
            nomme et que le composeur emploie déjà pour l'objet d'un
            mail. Elle reste une valeur d'UNE ligne : Entrée passe au
            champ suivant et un collage multiligne se recolle, comme
            dans un `<input>`. `.ac-list` suit toute seule, elle se pose
            sous l'enveloppe et non sous le champ. */''}
       <div class="field ac-wrap fld-adr"><label for="edAddress">Adresse</label>
         <textarea id="edAddress" rows="2" placeholder="Ex : 12 rue du Rempart\n31000 Toulouse" autocomplete="off" ${clavier('nom')}>${esc(c.address)}</textarea>
         <div class="ac-list" id="edAc" hidden></div></div>
     </div>
     ${/* même mesure, même réponse : une liste de technos cachait 6 à
          160 px. Et c'est le dernier champ de texte de la feuille,
          d'où « done » plutôt que « next ». */''}
     <div class="field fld-1l"><label for="edTechs">Technos</label>
       <textarea id="edTechs" rows="1" placeholder="Ex : SOC, Fortinet, Linux" autocomplete="off" enterkeyhint="done" ${clavier('nom')}>${esc(c.techs)}</textarea></div>
     <div class="field"><label id="edPosL">Postes recherchés</label>
       <div class="datechips" role="group" aria-labelledby="edPosL">
         ${Object.keys(POSITIONS).map(k =>
           `<button class="dchip${c.positions.includes(k) ? ' on' : ''}" data-p="${k}"
                    aria-pressed="${c.positions.includes(k)}">${POSITIONS[k]}</button>`).join('')}
       </div></div>
     ${/* « J'y suis passé » — la seule chose qui fait passer une
          candidature de 3 % à 40 % d'entretiens quand elle circule dans
          le groupe. Des puces, pas une liste déroulante : on répond en
          un tap, et le champ vide est la réponse la plus fréquente.
          Re-taper la puce active la retire — c'est la seule façon de
          revenir en arrière sans ajouter un « aucun » qui alourdirait
          les cinq choix à six. */''}
     <div class="field"><label id="edVecuL">J’y suis passé</label>
       <div class="datechips" role="group" aria-labelledby="edVecuL">
         ${Object.keys(VECU).map(k =>
           `<button class="dchip${c.vecu === k ? ' on' : ''}" data-v="${k}"
                    aria-pressed="${c.vecu === k}">${VECU[k].quoi}</button>`).join('')}
       </div></div>
     <div class="field"><label for="edProcess">Process de recrutement</label>
       <textarea id="edProcess" class="ta-s" placeholder="Ex : CV → entretien RH → test technique">${esc(c.process)}</textarea></div>
     <div class="field"><label for="edTips">Conseils pour postuler</label>
       <textarea id="edTips" class="ta-s" placeholder="Ex : passer par le forum, citer tel projet…">${esc(c.tips)}</textarea></div>
     </div>`);
}

/* Branche les postes et l'autocomplétion d'adresse, puis rend `apply(c)` :
   écrit les champs saisis dans la piste. Ne valide rien, n'enregistre
   rien — l'écran appelant décide. */
export function bindSharedFields(root){
  const q = s => root.querySelector(s);
  root.querySelectorAll('.dchip').forEach(b =>
    b.addEventListener('click', () => {
      /* Les postes se cumulent (on cherche stage OU alternance) ; « j'y
         suis passé » ne peut être qu'UNE chose — on n'a pas fait à la
         fois son stage ET son alternance là-bas dans la même phrase.
         Même composant, deux comportements, et c'est la donnée qui
         décide : `data-v` = exclusif, `data-p` = cumulable. */
      if (b.dataset.v){
        const etait = b.classList.contains('on');
        root.querySelectorAll('.dchip[data-v]').forEach(o => {
          o.classList.remove('on'); o.setAttribute('aria-pressed', 'false');
        });
        if (etait) return;                       /* re-taper = retirer */
        b.classList.add('on'); b.setAttribute('aria-pressed', 'true');
        return;
      }
      b.classList.toggle('on');
      b.setAttribute('aria-pressed', b.classList.contains('on'));
    }));

  /* adresse : suggestions pendant la frappe — un tap remplit l'adresse,
     la ville (si vide) et retient les coordonnées pour « Près de moi » */
  let picked = null;      /* {label, city, lat, lng} de la suggestion choisie */
  const acBox = q('#edAc');
  const acHide = () => { acBox.hidden = true; acBox.innerHTML = ''; };
  const acSearch = debounce(async v => {
    if (v.length < 4){ acHide(); return; }
    const sug = await suggestAddresses(v);
    if (surUnRang(q('#edAddress').value) !== v) return;   /* la frappe a continué */
    if (!sug.length){ acHide(); return; }
    acBox.innerHTML = sug.map((s, i) =>
      `<button type="button" class="ac-item" data-i="${i}">${esc(s.label)}</button>`).join('');
    acBox.hidden = false;
    acBox.querySelectorAll('.ac-item').forEach(b =>
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        picked = sug[+b.dataset.i];
        q('#edAddress').value = picked.label;
        /* une suggestion est plus longue que ce qu'on a tapé : sans ce
           rappel, le champ garde la hauteur de la frappe et recoupe ce
           qu'on vient de choisir */
        pousseAdresse();
        if (!q('#edCity').value.trim() && picked.city) q('#edCity').value = picked.city;
        acHide();
      }));
  }, 350);
  /* LES TROIS CHAMPS DE PROSE SE LISENT EN ENTIER (§6, le motif nommé
     « un champ dont la VALEUR doit se lire en entier »). Ils restaient
     bloqués à 48 px : mesuré à 320 px, « Ils recrutent surtout en
     janvier et en juin. Le test porte s… » se faisait couper en
     hauteur, et trois champs d'un coup à 125 %. Ce sont les phrases que
     l'utilisateur écrit pour s'en resservir au moment de candidater —
     l'élision ne se justifie que pour un aperçu, jamais pour ça. */
  root.querySelectorAll('textarea.ta-s').forEach(champGrandit);

  /* ---- UNE ADRESSE POSTALE N'EST PAS UNE VALEUR D'UN RANG ----
     C'est le champ libre du GOV.UK Design System, et ses avantages sont
     ceux que le DWP écrit noir sur blanc : il « gère n'importe quel
     format d'adresse, permet le copier-coller, et évite à l'utilisateur
     de deviner quelle partie va dans quelle case ». Son seul défaut
     déclaré — on ne peut pas en extraire les sous-parties — ne coûte
     rien ICI : `address` est une chaîne unique dans le modèle, jamais
     découpée, et l'app ne se sert jamais de ses morceaux.
     Entrée fait donc un retour à la ligne, comme dans tout champ libre,
     et une adresse collée garde la forme qu'elle avait.
     Ce qui sort vers un service tiers se replie, lui : `surUnRang`
     (moteur) recolle les lignes par une virgule pour l'itinéraire et
     pour la recherche d'adresse — un `%0A` au milieu d'une destination
     ne se géocode pas. La donnée garde ses lignes, l'URL non. */
  const pousseAdresse = champGrandit(q('#edAddress'));

  /* ---- LES TECHNOS RESTENT UNE VALEUR D'UN SEUL RANG ----
     Ce n'est pas une adresse : c'est une énumération séparée par des
     virgules, et rien n'y attend de retour à la ligne. Elle se replie
     pour se LIRE (le champ grandit) sans devenir de la prose pour
     autant. L'ordre compte — on nettoie AVANT de mesurer la hauteur,
     sinon un collage multiligne fait grandir le champ d'un rang qui
     disparaît aussitôt. */
  const techs = q('#edTechs');
  techs.addEventListener('input', () => {
    if (!/[\r\n]/.test(techs.value)) return;
    const i = techs.selectionStart;
    techs.value = techs.value.replace(/[\r\n]+/g, ' ');
    techs.selectionStart = techs.selectionEnd = i;
  });
  champGrandit(techs);
  techs.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    techs.blur();
  });

  q('#edAddress').addEventListener('input', e => { picked = null; acSearch(surUnRang(e.target.value)); });
  q('#edAddress').addEventListener('blur', () => setTimeout(acHide, 150));

  return {
    nom: () => q('#edName').value.trim(),
    focusNom: () => q('#edName').focus(),
    apply(c){
      const addrBefore = c.address;
      c.name = q('#edName').value.trim();
      c.city = q('#edCity').value.trim();
      c.domain = q('#edDomain').value;
      c.desc = q('#edDesc').value.trim();
      c.website = q('#edWebsite').value.trim();
      /* les lignes se gardent — c'est la forme que l'utilisateur a
         choisie ; seules les lignes vides de début et de fin partent */
      c.address = q('#edAddress').value.replace(/^[\s\r\n]+|[\s\r\n]+$/g, '');
      c.techs = q('#edTechs').value.trim();
      c.process = q('#edProcess').value.trim();
      c.tips = q('#edTips').value.trim();
      /* coordonnées : la suggestion choisie fait foi ; une adresse
         réécrite à la main invalide les anciennes */
      if (picked){ c.lat = picked.lat; c.lng = picked.lng; }
      else if (c.address !== addrBefore){ c.lat = null; c.lng = null; }
      c.positions = Array.from(root.querySelectorAll('.dchip.on[data-p]')).map(b => b.dataset.p);
      const v = root.querySelector('.dchip.on[data-v]');
      /* chez soi, `vecuQui` reste vide : c'est moi. Le prénom ne
         s'attache qu'au moment du partage. */
      if (v){ c.vecu = v.dataset.v; delete c.vecuQui; }
      else { delete c.vecu; delete c.vecuQui; }
    }
  };
}

export function openEditPiste(c, onDone){
  const sh = openSheet({ title: 'Modifier — ' + c.name, icon: 'pencil', className: 'modal-fiche', focus: '#edName' });
  sh.body.innerHTML =
    /* La pastille suffit. « Ces infos circulent dans les partages — ton
       suivi jamais » expliquait la pastille : c'est le motif documenté
       (`tag-share`) qui porte la distinction, la phrase ne faisait que
       la traduire, sur un écran où l'on vient taper, pas lire. */
    `<div style="margin:0 0 14px"><span class="tag-share">partagé</span></div>
     ${sharedFieldsHTML(c)}`;
  const champs = bindSharedFields(sh.body);

  sh.setFoot([
    btn('Enregistrer', 'btn-primary', () => {
      if (!champs.nom()){ toast('Le nom de la structure est obligatoire.'); champs.focusNom(); return; }
      const snap = () => JSON.stringify(FIELDS.map(f => c[f]).concat([c.positions, c.lat, c.lng]));
      const before = snap();
      champs.apply(c);
      if (snap() !== before){
        pushHist(c, 'Fiche complétée');
        logJ('Fiche complétée : ' + c.name, c.id);
        c.updatedAt = Date.now();
        saveData();
      }
      sh.close();
      bus.refresh();
      if (onDone) onDone();
    })
  ]);
}
