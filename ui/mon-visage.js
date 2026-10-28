/* ============================================================
   OpenContact — interface · dessiner mon visage
   (le mainteneur, 28 octobre 2026 : « j'aimerais bien pouvoir dessiner
   son propre dessin » ; son choix entre trois idées : « Mon visage »)

   La grille des visages de l'app, 5 × 5 cases. Une case touchée
   s'allume, et sa jumelle de l'autre côté avec elle : le dessin reste
   symétrique, comme un visage, et il faut deux fois moins de gestes
   pour le faire. Six teintes, celles de l'app. On part de son visage
   actuel — le tiré, ou le dernier dessiné —, et l'aperçu le montre tel
   que les amis le verront, à côté du nom.

   Ce qui sort : le motif et la teinte, dans le profil donné à un ami
   (OCA1, `profilDonne`), et par lui dans la mise à jour qui part toute
   seule chez ceux qui l'ont. Jamais dans un groupe — on y voit le
   dessin d'un ami parce que son profil est déjà chez soi —, jamais dans
   un partage de pistes.
   ============================================================ */
import { esc } from '../engine/utils.js';
import { motifDe, normaliserVisage, basculerCase, caseAllumee } from '../engine/visage.js';
import { nouvelIdAmi } from '../engine/amis.js';
import { S, bus, saveProfile } from './state.js';
import { openSheet, btn, ic } from './dom.js';
import { visageDessinHTML, TEINTES_VZ } from './visage.js';

/* le nom de chaque teinte, pour qui n'a pas l'écran */
const NOMS_TEINTES = ['Bleu-vert', 'Encre', 'Orange', 'Vert', 'Rouge', 'Gris'];

/* l'identifiant sous lequel mes amis me connaissent : le visage tiré en
   vient, et c'est sur lui que mon dessin se pose chez eux */
const assurerId = () => {
  if (!S.profile.amiId){ S.profile.amiId = nouvelIdAmi(); saveProfile(); }
  return S.profile.amiId;
};

export function ouvrirMonVisage(){
  const id = assurerId();
  const tire = motifDe(id);
  const depart = normaliserVisage(S.profile.visage) || tire;
  let m = depart.m, t = depart.t;
  /* pas de « Quitter sans enregistrer ? » : un dessin se refait en dix
     touches, et une question de plus coûte plus qu'elle ne protège (§6,
     « une porte se décide » — e2e-sobriete ②) */
  const sh = openSheet({ title: 'Mon visage', icon: 'user' });
  const nom = String(S.profile.name || '').trim() || 'Toi';
  const dessiner = (focus) => {
    const cases = [];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++){
      const on = caseAllumee(m, x, y);
      cases.push(`<button type="button" class="mv-c${on ? ' on' : ''}" data-x="${x}" data-y="${y}" aria-pressed="${on}"
        aria-label="Ligne ${y + 1}, case ${x + 1}"></button>`);
    }
    sh.body.innerHTML =
      `<div class="mv-grille ${TEINTES_VZ[t]}" role="group" aria-label="Le dessin">${cases.join('')}</div>
       <div class="mv-teintes" role="radiogroup" aria-label="Couleur">${TEINTES_VZ.map((c, i) =>
         `<button type="button" class="mv-t ${c}" role="radio" aria-checked="${i === t}" data-t="${i}" aria-label="${NOMS_TEINTES[i]}">${
           i === t ? ic('check', 'ic-14') : ''}</button>`).join('')}</div>
       ${/* l'aperçu : la ligne où les amis le verront, à ses trois tailles */''}
       <div class="mv-apercu" aria-hidden="true">${visageDessinHTML({ m, t }, 'bx-vz')}
         <b>${esc(nom)}</b>${visageDessinHTML({ m, t }, 'vz-m')}${visageDessinHTML({ m, t }, 'vz-s')}</div>
       ${m !== tire.m || t !== tire.t
         ? `<button type="button" class="btn btn-sm mv-origine" id="mvOrigine">${ic('reload', 'ic-14')} Visage d’origine</button>` : ''}`;
    sh.body.querySelectorAll('.mv-c').forEach(b => b.addEventListener('click', () => {
      m = basculerCase(m, +b.dataset.x, +b.dataset.y);
      dessiner(`.mv-c[data-x="${b.dataset.x}"][data-y="${b.dataset.y}"]`);
    }));
    sh.body.querySelectorAll('.mv-t').forEach(b => b.addEventListener('click', () => {
      t = +b.dataset.t;
      dessiner(`.mv-t[data-t="${t}"]`);
    }));
    sh.body.querySelector('#mvOrigine')?.addEventListener('click', () => {
      m = tire.m; t = tire.t;
      dessiner('.mv-c');
    });
    /* le contrôle touché garde le focus d'un rendu à l'autre : la grille
       se redessine, la main ne la perd pas (clavier, lecteur d'écran) */
    if (focus) sh.body.querySelector(focus)?.focus({ preventScroll: true });
    /* rien de dessiné : il n'y a rien à enregistrer */
    go.disabled = !m;
  };
  const go = btn('Enregistrer', 'btn-primary', () => {
    /* le visage d'origine n'est pas un dessin : rien ne part de plus */
    if (m === tire.m && t === tire.t) delete S.profile.visage;
    else S.profile.visage = { m, t };
    saveProfile();
    sh.close(null, true);
    bus.refresh();
  });
  go.id = 'mvGo';
  sh.setFoot([go]);
  dessiner();
  return sh;
}
