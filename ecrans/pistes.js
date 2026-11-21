/* ============================================================
   OpenContact · la nouvelle interface · Pistes, une piste, écrire
   (docs/brief-refonte.md §4 et §12, lot 2 ; maquette validée le
   17 novembre 2026, « Super »)

   PISTES dit quoi faire, puis range : « À faire » en tête, trois lignes
   au plus, un bouton chacune ; puis les pistes par étape (c'est oui,
   réponse, à contacter, en attente, terminées). La phrase et le geste
   de chaque piste viennent du moteur (engine/suite.js), les mêmes
   partout.

   UNE PISTE est une page : la suite (une phrase, un seul bouton
   rempli), « Il s'est passé quelque chose ? » (J'ai écrit · On m'a
   répondu · C'est non), les gens, l'entreprise, l'historique, mes notes.

   ÉCRIRE, un message en quatre formes : le mail (« Ouvrir dans Mail »),
   le mot LinkedIn (« Copier et ouvrir LinkedIn », 200 caractères), ce
   qu'on dit au téléphone (« Appeler »), le texte d'un formulaire
   (« Copier et ouvrir leur site »). Rien ne part avec un crochet. Au
   retour : « C'est parti ? », d'un tap, puis le rappel dans l'agenda et
   « Suivante ».

   Au poste, la liste, la piste et le message sont côte à côte.
   ============================================================ */
import { $, $$, ic, esc, plat, initiales, prenomDe, annoncer, remplacer } from './outils.js';
import { S, saveData, saveProfile, logJ, deletePiste, undeletePiste } from './etat.js';
import { C, rendre, pousser, retour, inscrirePage, annuler, allerA, cles, ouvrirFeuille, fermerFeuille,
         pageOuverte, remplacerPage } from './coque.js';
import { relireSiren, carteDe, suivreCarte } from './carte.js';
import { laSuite, aFaire, etapeDe, suivante, noterEnvoi, noterEcrit, noterEntretien, noterReponse, clore, rouvrir,
         canalDefaut, quiContacter, CANAUX, CANAUX_DE, PAR, LI_MAX, joursDepuisEcrit, plusJours, jourCourt,
         quandPasse } from '../engine/suite.js';
import { suiteDe, cocherSuite } from '../engine/contrat.js';
import { fillTpl, crochets, remplirTrous, normalizeContact, normalizeCompany, emailPlausible, RECHERCHES,
         pushHist } from '../engine/model.js';
import { modeleDe as modeleDuProfil } from '../engine/modeles.js';
import { formeAgenda, rappelICS, lienAgendaGoogle } from '../engine/agenda.js';
import { aQui } from '../engine/carte.js';
import { todayISO } from '../engine/utils.js';
import { metierDuProfil } from '../engine/requete.js';
import { optionsAmis, porteurs } from './amis.js';
import { amiDe, demander, ajouterDon, phraseDemande, prenomMoi, amisJoignables } from './boite.js';
import { visageHTML } from './visage.js';
import { basPistesHTML, gesteBas } from './emails.js';
import { offreHTML, offreSavoirHTML } from './offre.js';

/* ---------- l'état de l'écran (cette visite) ---------- */
const P = {
  pm: {},        /* id → « parti » (C'est parti ?), « quoi » (On m'a répondu), « quand » (le jour d'un entretien) */
  envoi: {},     /* id → { k, canal } : ce qui vient de partir */
  ecritAuj: {},  /* id → vrai : écrit pendant cette visite (le rappel, la suivante) */
  rappel: {},    /* id → le jour du rappel posé */
  agendaE: {},   /* id → vrai : l'entretien est dans l'agenda */
  sel: '',       /* au poste : la piste ouverte */
  canalP: {},    /* au poste : le canal choisi par piste */
  qp: '',        /* la recherche, à partir de dix pistes */
  ouv: {},       /* les plis ouverts */
  dem: {},       /* id → l'ami à qui l'on va demander (« Karim recevra : ») */
  viser: ''      /* au poste, après un rendu : ce qui prend la main (le crochet, « Oui, envoyé », « Suivante ») */
};
const MOD = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
/* les brouillons et ce qui vient de partir survivent à un aller-retour
   dans l'app Mail (une page qu'iOS recharge) : sessionStorage, le temps
   de l'onglet, rien qui sorte de l'appareil */
const SESSION = 'oc_refonte_ecrire';
let br = {};
try { const x = JSON.parse(sessionStorage.getItem(SESSION) || 'null'); if (x){ br = x.br || {}; P.envoi = x.envoi || {}; P.pm = x.pm || {}; } } catch (e) {}
const garderSession = () => { try { sessionStorage.setItem(SESSION, JSON.stringify({ br, envoi: P.envoi, pm: P.pm })); } catch (e) {} };

const pisteDe = id => S.companies.find(c => c.id === id) || null;
const today = () => todayISO();
/* ce que mes amis ouvrent (engine/amis.js) et les demandes parties
   (ecrans/boite.js) : lu une fois par rendu, pas une fois par ligne */
let optAmis = null;
const amisOpt = () => { if (!optAmis){ optAmis = optionsAmis(); queueMicrotask(() => { optAmis = null; }); } return optAmis; };
const opt = () => ({ today: today(), profile: S.profile, ...amisOpt() });
const suiteDeP = c => laSuite(c, opt());
const recherche = () => S.profile.recherche || '';
/* la typographie française : pas de « 7 » seul en fin de ligne, pas de
   guillemet ni de point d'interrogation seul au début de la suivante */
const insec = t => String(t).replace(/« /g, '« ').replace(/ »/g, ' »').replace(/ ([?!:;])/g, ' $1').replace(/(\d) (?=\S)/g, '$1 ');
const ilYa = d => { const n = Math.round((Date.parse(today()) - Date.parse(d)) / 864e5);
  return n <= 0 ? 'aujourd’hui' : n === 1 ? 'hier' : jourCourt(d); };

/* ---------- la liste ---------- */
const gesteDe = s => s.a === 'ecrire' || s.a === 'demande' || s.a === 'don' ? s.a : 'piste';
function ligneAF(x, i){
  if (x.ranger) return `<div class="rang l rg"><div class="r-c"><b>${x.ranger.length} piste${x.ranger.length > 1 ? 's' : ''} sans réponse</b><span>depuis plus de 45 jours</span></div>`
    + `<button class="btn s${i || C.poste ? '' : ' p'}" data-a="ranger">Ranger</button></div>`;
  const c = pisteDe(x.id), s = x.s, on = C.poste && P.sel === x.id;
  return `<div class="rang l${on ? ' on' : ''}"><div class="r-c" data-a="piste" data-id="${esc(x.id)}" role="button" tabindex="0"${on ? ' aria-current="true"' : ''}>`
    + `<b>${esc(c.name)}</b><span${s.plus ? ' class="plus"' : ''}>${esc(insec(s.l))}</span></div>`
    + (s.c ? `<button class="btn s${i || C.poste ? '' : ' p'}" data-a="${gesteDe(s)}" data-id="${esc(x.id)}"${s.k ? ` data-k="${s.k}"` : ''}>${esc(s.c)}</button>` : ic('chevron-right'))
    + '</div>';
}
function ligneG(c){
  const s = suiteDeP(c), on = C.poste && P.sel === c.id;
  return `<div class="gl" data-id="${esc(c.id)}" data-g="supprimer"><div class="dessous-g" aria-hidden="true">Supprimer</div>`
    + `<div class="rang l${on ? ' on' : ''}"><div class="r-c" data-a="piste" data-id="${esc(c.id)}" role="button" tabindex="0"${on ? ' aria-current="true"' : ''}>`
    + `<b>${esc(c.name)}</b><span${s.plus ? ' class="plus"' : ''}>${esc(insec(s.l))}</span></div>${ic('chevron-right')}</div></div>`;
}
const videPistes = () => '<div class="panneau"><p>Les entreprises que tu gardes arrivent ici.<br>L’app te dit ensuite quoi faire pour chacune.</p>'
  + '<button class="btn p" data-a="aller" data-id="trouver">Trouver des entreprises</button></div>';
function corpsPistes(){
  const ids = S.companies.filter(c => !c.demo);
  if (!ids.length) return videPistes() + basPistesHTML(P.ouv.bac);
  if (P.qp.trim()){
    const w = plat(P.qp).split(' ').filter(Boolean);
    const t = ids.filter(c => { const n = plat(c.name); return w.every(x => n.includes(x)); });
    return t.length ? `<div class="rangs s-liste haut">${t.map(ligneG).join('')}</div>` : '<div class="panneau"><p>Aucune piste ne porte ce nom.</p></div>';
  }
  const af = aFaire(ids, opt()), dans = new Set(af.filter(x => x.id).map(x => x.id));
  let h = '';
  if (af.length) h += `<div class="et s-et">À faire</div><div class="s-afaire">${af.map(ligneAF).join('')}</div>`;
  else if (ids.some(c => !c.closedReason)) h += `<div class="et s-et">À faire</div><p class="tout-fait">${ic('check')}C’est tout pour aujourd’hui.</p>`;
  const grp = (titre, f, tri) => {
    const l = ids.filter(c => !dans.has(c.id) && f(c));
    if (tri) l.sort(tri);
    return l.length ? `<div class="et s-et">${titre} · ${l.length}</div><div class="rangs s-liste">${l.map(ligneG).join('')}</div>` : '';
  };
  h += grp('C’est oui', c => etapeDe(c) === 'oui') + grp('Réponse', c => etapeDe(c) === 'reponse') + grp('À contacter', c => etapeDe(c) === 'garde')
    + grp('En attente', c => etapeDe(c) === 'ecrit', (a, b) => joursDepuisEcrit(a, today()) - joursDepuisEcrit(b, today()));
  const fin = ids.filter(c => etapeDe(c) === 'fin');
  if (fin.length) h += `<details class="term" data-p="term"${P.ouv.term ? ' open' : ''}><summary>Terminées · ${fin.length}${ic('chevron-right')}</summary>`
    + `<div class="rangs">${fin.map(ligneG).join('')}</div></details>`;
  return h + basPistesHTML(P.ouv.bac);
}
const chercheP = () => '<label class="champ">' + ic('search') + '<input type="search" class="qp" placeholder="Chercher une piste" aria-label="Chercher une piste" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></label>';

/* ---------- la page d'une piste ---------- */
const entreprise = new Map();   /* siren → ce que l'annuaire en dit */
function rDe(c){
  if (!c.siren) return null;
  if (entreprise.has(c.siren)) return entreprise.get(c.siren);
  const r = relireSiren(c.siren, () => rendre());
  if (r){ entreprise.set(c.siren, r); suivreCarte(r.siren, () => rendre(), r.nom, { egapro: r.egapro }); }
  return r;
}
function faitsHTML(c){
  const r = rDe(c);
  if (!r) return '';
  const k = carteDe(r, c, metierDuProfil(S.profile), S.profile);
  const f = [];
  const fait = k.missions ? k.missions.texte : k.quoi ? k.quoi.texte : '';
  if (fait) f.push(['Ils font', esc(fait)]);
  if (k.taille) f.push(['Taille', esc(k.taille)]);
  if (k.comptes) f.push(['Comptes', esc(k.comptes.texte)]);
  if (k.recemment) f.push(['Récemment', esc(k.recemment[0].toUpperCase() + k.recemment.slice(1))]);
  return f.length ? `<dl class="faits">${f.map(([t, v]) => `<div><dt>${t}</dt><dd>${v}</dd></div>`).join('')}</dl>` : '';
}
function blocSuite(c, s){
  const id = c.id, x = [];
  if (s.oui){
    const su = suiteDe(c, S.profile);
    if (!su) return '';
    const quoi = RECHERCHES[su.t] ? su.t : 'emploi';
    return `<div class="oui-t"><span class="coche">${ic('check')}</span><b>C’est oui !</b></div>`
      + `<p class="doux">${esc(c.name)} te prend en ${quoi === 'alternance' ? 'alternance' : quoi === 'stage' ? 'stage' : 'emploi'}. Il reste :</p><div class="cks">`
      + su.etapes.map(e => `<button class="ck${e.fait ? ' fait' : ''}" data-a="etape" data-v="${e.id}" data-id="${esc(id)}" role="checkbox" aria-checked="${!!e.fait}">`
        + ic(e.fait ? 'checkbox-on' : 'checkbox') + `<span class="ck-t"><b>${esc(e.label)}</b>${e.note ? `<small>${esc(e.note)}</small>` : ''}</span>`
        + (e.fait ? `<span class="d">${esc(ilYa(e.fait))}</span>` : '') + '</button>').join('') + '</div>';
  }
  let h = `<p class="fort">${esc(insec(s.t))}</p>` + (s.s ? `<p class="doux">${esc(insec(s.s))}</p>` : '');
  if (s.q) h += `<ul class="questions">${s.q.map(q => `<li>${esc(q)}</li>`).join('')}</ul>`;
  if (s.b && !(C.poste && s.k))
    h += `<button class="btn p large" data-a="${s.a === 'ranger1' ? 'ranger1' : gesteDe(s)}" data-id="${esc(id)}"${s.k ? ` data-k="${s.k}"` : ''}>${esc(s.b)}</button>`;
  if (s.entretien && s.entretien >= today())
    x.push(P.agendaE[id] ? `<span class="fait-a">${ic('check')}Dans ton agenda</span>`
      : `<button class="btn s" data-a="agenda-e" data-id="${esc(id)}">${ic('calendar')}Ajouter à mon agenda</button>`);
  if (etapeDe(c) === 'ecrit' && P.ecritAuj[id]){
    x.push(P.rappel[id] ? `<span class="fait-a">${ic('check')}Rappel le ${esc(jourCourt(P.rappel[id]))}</span>`
      : `<button class="btn s" data-a="rappel" data-id="${esc(id)}">${ic('calendar')}Rappel dans mon agenda</button>`);
    const nx = suivante(S.companies, id, opt());
    if (nx) x.push(`<button class="btn s suivante" data-a="ecrire" data-id="${esc(nx.id)}" data-k="premier">Suivante : ${esc(nx.name)}${ic('arrow-right')}</button>`);
  }
  if (s.fin) x.push(`<button class="btn s" data-a="rouvrir" data-id="${esc(id)}">Rouvrir</button>`);
  if (x.length) h += `<div class="extras">${x.join('')}</div>`;
  return h;
}
/* CE QUE MES AMIS OUVRENT, dans « Les gens » : qui y est passé (et lui
   demander à qui écrire), puis le contact qu'il m'a donné, proposé en
   pointillé — posé en plein quand on l'ajoute */
function gensAmis(c){
  const id = c.id, o = amisOpt(), dem = o.demandes.get(id), joignables = new Set(amisJoignables().map(a => a.id));
  let h = porteurs(c).slice(0, 2).map(x => {
    const peut = !dem && !(c.contacts || []).length && o.portes.has(id) && joignables.has(x.amiId);
    return `<div class="pers">${visageHTML(x.amiId)}<div class="r-c"><b>${esc(x.prenom)}</b><span>${esc(x.court)}</span></div>`
      + (dem && dem.a && dem.a.includes(x.prenom) ? `<span class="s-ok">${ic('check')}demandé</span>`
        : peut ? `<button class="btn s" data-a="demande" data-id="${esc(id)}" data-v="${esc(x.amiId)}">Demander</button>` : '') + '</div>';
  }).join('');
  if (dem && dem.don) h += `<div class="pers prop">${visageHTML(dem.don.soi && dem.don.ami ? dem.don.ami : dem.don.nom)}<div class="r-c"><b>${esc(dem.don.nom)}</b>`
    + `<span>${esc(dem.don.soi ? 'te donne son contact' : 'donné par ' + dem.don.de)}</span></div></div>`;
  return h;
}
function pageP(c){
  const id = c.id, s = suiteDeP(c), pm = P.pm[id];
  let bloc, evs = '';
  if (pm === 'parti'){
    const en = P.envoi[id] || {}, appel = en.canal === 'appel';
    bloc = `<p class="fort">${appel ? 'Tu as pu appeler ?' : en.k === 'merci' ? 'Ton merci est parti ?' : 'C’est parti ?'}</p>`
      + '<p class="doux">Dis-le d’un tap : l’app note la date et compte les jours pour toi.</p>'
      + `<div class="deux"><button class="btn" data-a="pas-encore" data-id="${esc(id)}">Pas encore</button>`
      + `<button class="btn p" data-a="envoye" data-id="${esc(id)}">${appel ? 'Oui, j’ai appelé' : 'Oui, envoyé'}</button></div>`;
  } else if (pm === 'quoi'){
    bloc = '<p class="fort">C’est quoi ?</p><div class="evs">'
      + `<button class="btn" data-a="ev" data-v="non" data-id="${esc(id)}">Un refus</button>`
      + `<button class="btn" data-a="pm" data-v="quand" data-id="${esc(id)}">Un entretien</button>`
      + `<button class="btn" data-a="ev" data-v="autre" data-id="${esc(id)}">Autre chose</button></div>`
      + `<button class="btn-g" data-a="pm" data-v="" data-id="${esc(id)}">Annuler</button>`;
  } else if (pm === 'quand'){
    const j = [1, 2, 3, 6].map(n => plusJours(today(), n));
    bloc = '<p class="fort">Un entretien ! C’est quand ?</p><div class="puces">'
      + j.map((d, i) => `<button class="puce" data-a="quand" data-v="${d}" data-id="${esc(id)}">${i ? esc(jourCourt(d)[0].toUpperCase() + jourCourt(d).slice(1)) : 'Demain'}</button>`).join('')
      + '</div>'
      + `<div class="autre-j"><label class="fld"><span class="et">Un autre jour</span><input type="date" class="jour-e" data-id="${esc(id)}" min="${today()}"></label>`
      + `<button class="btn s" data-a="quand-ok" data-id="${esc(id)}" hidden>OK</button></div>`
      + `<button class="btn-g" data-a="pm" data-v="" data-id="${esc(id)}">Annuler</button>`;
  } else if (pm === 'demande' && amiDe(P.dem[id] || (amisOpt().portes.get(id) || {}).amiId)){
    /* LA PHRASE EXACTE qui part, et à qui : rien d'autre ne voyage */
    const a = amiDe(P.dem[id] || amisOpt().portes.get(id).amiId);
    bloc = `<p class="fort">${esc(prenomDe(a.nom))} recevra :</p>`
      + `<blockquote class="cite">${esc(insec(phraseDemande(prenomMoi() || 'Toi', 'chez ' + c.name, recherche())))}</blockquote>`
      + '<p class="err d-err" hidden></p>'
      + `<div class="deux"><button class="btn" data-a="pm" data-v="" data-id="${esc(id)}">Annuler</button>`
      + `<button class="btn p" data-a="demander" data-id="${esc(id)}">Envoyer</button></div>`;
  } else bloc = blocSuite(c, s);
  const et = etapeDe(c);
  if (!pm && !s.fin && et !== 'oui'){
    const b = et === 'reponse'
      ? [(!s.entretien && !s.k ? `<button class="btn" data-a="pm" data-v="quand" data-id="${esc(id)}">Un entretien</button>` : ''),
         `<button class="btn" data-a="ev" data-v="oui" data-id="${esc(id)}">Ils me prennent</button>`,
         `<button class="btn" data-a="ev" data-v="non" data-id="${esc(id)}">C’est non</button>`]
      : [`<button class="btn" data-a="ev" data-v="ecrit" data-id="${esc(id)}">J’ai écrit</button>`,
         `<button class="btn" data-a="pm" data-v="quoi" data-id="${esc(id)}">On m’a répondu</button>`,
         `<button class="btn" data-a="ev" data-v="non" data-id="${esc(id)}">C’est non</button>`];
    evs = `<div class="et" style="margin-top:18px">Il s’est passé quelque chose ?</div><div class="evs">${b.join('')}</div>`;
  }
  const gens = '<fieldset class="gb"><legend>Les gens</legend>'
    + (c.contacts || []).map((t, i) => {
      const k = (t.email ? ic('mail') : '') + (t.phone ? ic('phone') : '') + (t.link ? ic('link') : '');
      const nom = t.name || t.email || t.phone || t.link;
      return `<div class="pers" data-a="contact" data-v="${i}" data-id="${esc(id)}" role="button" tabindex="0"><div class="s-init" aria-hidden="true">${esc(initiales(nom))}</div>`
        + `<div class="r-c"><b>${esc(nom)}</b><span>${esc(t.role || (t.name ? '' : 'ajouté à la main'))}</span></div>`
        + (k ? `<span class="canaux-i">${k}</span>` : '') + ic('chevron-right') + '</div>';
    }).join('')
    + gensAmis(c)
    + `<button class="lien ajout" data-a="contact" data-v="-1" data-id="${esc(id)}">${ic('plus')}Ajouter quelqu’un</button></fieldset>`;
  const pli = (k, t, x) => `<details class="pli" data-p="${k}"${P.ouv[k] ? ' open' : ''}><summary>${t}${ic('chevron-right')}</summary>${x}</details>`;
  const f = faitsHTML(c), h = c.history || [];
  const plis = '<div class="plis">' + (c.offre ? pli('offre', 'L’offre', offreHTML(c.offre, true)) : '') + (f ? pli('ent', 'L’entreprise', f) : '')
    + pli('hist', 'Historique · ' + h.length, `<ul class="hist">${h.slice().reverse().map(x => `<li><span>${esc(ilYa(x.d))}</span>${esc(x.t)}</li>`).join('')}</ul>`)
    + pli('notes', 'Mes notes', `<textarea class="zone n-notes" data-id="${esc(id)}" rows="3" placeholder="Ce que tu veux retenir" aria-label="Mes notes">${esc(c.notes || '')}</textarea>`
      + '<p class="doux" style="margin:6px 0 12px">Privées. Elles ne partent jamais dans un partage.</p>') + '</div>';
  const bas = !s.fin && et !== 'oui' ? `<div class="bas-p"><button class="btn-g" data-a="lacher" data-id="${esc(id)}">Laisser tomber cette piste</button></div>` : '';
  return `<div class="s-page"><h4>${esc(c.name)}</h4><div class="lieu">${esc(c.city || 'Ajoutée à la main')}</div>`
    + `<fieldset class="gb suite-b"><legend>La suite</legend>${bloc}</fieldset>${evs}${gens}${plis}${bas}</div>`;
}

/* ---------- écrire : un message, quatre formes ---------- */
/* les trois messages types se retrouvent à leur nom (engine/modeles.js) :
   celui du profil, sinon l'original — c'est aussi ce que « Moi › Mes
   messages types » modifie */
const modeleDe = k => modeleDuProfil(S.profile, k);
function signature(){
  const p = S.profile;
  return ['Bien à vous,', p.name || '[ton nom]', p.ecole, [p.phone, p.email].filter(Boolean).join(' — ')].filter(Boolean).join('\n');
}
function modele(c, k, canal){
  const ct = quiContacter(c), p = S.profile, moi = p.name || '[ton nom]', f = p.formation || '[ta formation]';
  const ch = (RECHERCHES[p.recherche] || RECHERCHES.stage).un, qui = ct && ct.name ? ct.name : '';
  const d = { o: '', m: '', a: canal === 'mail' ? (ct && ct.email) || '' : canal === 'appel' ? (ct && ct.phone) || '' : '', script: [] };
  if (canal === 'appel'){
    const depuis = c.appliedAt ? 'le ' + jourCourt(c.appliedAt).replace(/^\S+ /, '') : 'il y a quelques jours';
    d.script = k === 'relance'
      ? [`« Bonjour, je m’appelle ${moi}. Je vous ai écrit ${depuis} pour ${ch}. »`, '« Je voulais savoir si vous aviez pu lire ma candidature. »', '« Je peux vous la renvoyer, ou passer en parler. »']
      : k === 'reponse' ? [`« Bonjour, ${moi}. Merci pour votre réponse. »`, '« Je vous appelle pour en parler de vive voix. »']
      : [`« Bonjour, je m’appelle ${moi}. Je suis en ${f}. »`, `« Je cherche ${ch} : est-ce que je peux parler à ${qui || 'la personne qui s’occupe du recrutement'} ? »`,
         `« Vous prenez des ${p.recherche === 'stage' ? 'stagiaires' : p.recherche === 'alternance' ? 'alternants' : 'débutants'} ? À qui j’envoie ma candidature ? »`];
    return d;
  }
  if (canal === 'linkedin'){
    const ville = p.ville ? ' à ' + p.ville : '';
    d.m = k === 'relance' ? `Bonjour ${qui},\nJe reviens vers vous au sujet de ma candidature pour ${ch}.\n[Du neuf depuis, en une phrase.]\n${moi}`
      : k === 'merci' ? `Bonjour ${qui},\nMerci pour notre entretien.\n[Un point marquant, en une phrase.]\n${moi}`
      : `Bonjour${qui ? ' ' + qui : ''},\n${ct && ct.via ? ct.via + ' m’a conseillé de vous écrire.\n' : ''}[Une phrase sur eux, courte.]\nJe suis en ${f} et je cherche ${ch}${ville}. Puis-je vous envoyer ma candidature ?\n${moi}`;
    d.m = d.m.replace('Bonjour ,', 'Bonjour,');
    return d;
  }
  if (k === 'reponse'){
    d.o = 'Re : ma candidature chez ' + c.name;
    d.m = `Bonjour ${qui || 'Madame, Monsieur'},\n\nMerci pour votre réponse.\n\n[Ce qu’ils t’ont demandé : ton CV, tes dates, tes disponibilités.]\n\n${signature()}`;
    return d;
  }
  const t = modeleDe(k);
  const vise = canal === 'site' && ct ? { ...ct, via: '' } : ct;
  d.o = fillTpl(t.subject, c, vise, p, { trous: true, companies: S.companies });
  d.m = fillTpl(t.body, c, vise, p, { trous: true, companies: S.companies });
  if (canal === 'site'){ d.o = ''; d.m = d.m.replace(/^Bonjour [^\n]*,/, 'Bonjour,'); }
  return d;
}
/* le profil ou un modèle a changé (« Moi ») : les brouillons que personne
   n'a touchés repartent du nouveau texte, les autres ne bougent pas
   (invariant ②) */
export function oublierBrouillons(k){
  Object.keys(br).forEach(key => { if ((!k || key.split('|')[1] === k) && !br[key].touche) delete br[key]; });
  garderSession();
}
function brouillon(id, k, canal){
  const cle = id + '|' + k + '|' + canal;
  if (!br[cle]){
    const c = pisteDe(id), d = modele(c, k, canal);
    br[cle] = { o: insec(d.o), m: insec(d.m), a: d.a, script: d.script.map(insec) };
    garderSession();
  }
  return br[cle];
}
const lienLI = c => { const ct = quiContacter(c); if (ct && ct.link && /linkedin\.com/i.test(ct.link)) return ct.link;
  return 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(ct && ct.name ? ct.name + ' ' + c.name : c.name + ' recrutement'); };
const lienSite = c => c.website ? c.website : 'https://duckduckgo.com/?q=' + encodeURIComponent(c.name + ' ' + (c.city || ''));
function savoir(c, k){
  if (k === 'premier' && c.offre && (c.offre.missions || []).length) return offreSavoirHTML(c.offre);
  if (k === 'merci' || k === 'reponse')
    return c.notes && c.notes.trim() ? `<div class="savoir"><span class="et">Tes notes</span><p>${esc(c.notes.trim())}</p></div>` : '';
  const r = rDe(c), l = [];
  if (r){
    const kk = carteDe(r, c, metierDuProfil(S.profile), S.profile);
    if (kk.missions) l.push(kk.missions.texte); else if (kk.quoi) l.push(kk.quoi.texte);
    if (kk.recemment) l.push(kk.recemment[0].toUpperCase() + kk.recemment.slice(1));
  }
  if (c.desc) l.unshift(c.desc);
  return l.length ? `<div class="savoir"><span class="et">À savoir</span><p>${esc(l.join(' · '))}</p></div>` : '';
}
function ecrireHTML(id, k, canal){
  const c = pisteDe(id), ct = quiContacter(c), d = brouillon(id, k, canal), poste = C.poste;
  let corps = `<p class="a-qui"><span>À</span> <b>${esc(ct && ct.name ? ct.name : c.name)}</b>${ct && ct.name ? `<span> · ${esc(c.name)}</span>` : ''}</p>`;
  corps += `<div class="seg canaux" role="group" aria-label="Par où">${(CANAUX_DE[k] || CANAUX_DE.premier).map(x =>
    `<button${x === canal ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"'} data-a="canal" data-v="${x}" data-id="${esc(id)}">${CANAUX[x]}</button>`).join('')}</div>`;
  if (!S.profile.name) corps += '<label class="fld"><span class="et">Ton nom</span><input class="e-nom" type="text" autocomplete="name" autocorrect="off" spellcheck="false" placeholder="Prénom et nom, pour signer"></label>';
  /* au poste, la touche qui envoie se lit dans le bouton qu'elle presse */
  const sav = savoir(c, k), kbd = poste ? `<kbd>${MOD} ↵</kbd>` : '';
  let pied = '';
  if (canal === 'mail'){
    corps += `<label class="fld"><span class="et">À</span><input class="e-a" type="text" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" value="${esc(d.a)}" placeholder="Son adresse"></label><p class="err e-err-a" hidden></p>`
      + `<label class="fld"><span class="et">Objet<span class="fld-n e-n-o">${d.o.length}/60</span></span><textarea class="zone un e-o" rows="1">${esc(d.o)}</textarea></label><p class="err e-err-o" hidden></p>`
      + sav + `<label class="fld"><span class="et">Message</span><span class="err e-err" hidden></span><textarea class="zone e-m">${esc(d.m)}</textarea></label>`;
    pied = `<button class="btn court" data-a="copier" data-id="${esc(id)}">${ic('copy')}Copier</button><button class="btn p" data-a="envoyer" data-id="${esc(id)}">${ic('mail')}Ouvrir dans Mail${kbd}</button>`;
  } else if (canal === 'linkedin'){
    const n = d.m.length;
    corps += sav + `<label class="fld"><span class="et">Message<span class="fld-n e-n-m${n > LI_MAX ? ' trop' : ''}">${n}/${LI_MAX}</span></span><span class="err e-err" hidden></span><textarea class="zone court e-m">${esc(d.m)}</textarea></label>`
      + '<p class="hint">Puis colle-le dans ton invitation. Sans LinkedIn payant, seules quelques invitations par mois peuvent porter un mot.</p>';
    pied = `<a class="btn p" href="${esc(lienLI(c))}" target="_blank" rel="noopener noreferrer" data-a="envoyer" data-id="${esc(id)}">Copier et ouvrir LinkedIn${ic('external-link')}${kbd}</a>`;
  } else if (canal === 'appel'){
    corps += `<label class="fld"><span class="et">Numéro</span><input class="e-a" type="tel" inputmode="tel" autocomplete="off" value="${esc(d.a)}" placeholder="Son numéro, ou le standard"></label><p class="err e-err-a" hidden></p>`
      + (d.a ? '' : `<p class="hint">Le standard est souvent sur leur site : <a class="lien-t" href="${esc(lienSite(c))}" target="_blank" rel="noopener noreferrer">${c.website ? esc(c.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) : 'chercher leur site'}</a>.</p>`)
      + `<div class="et" style="margin-bottom:6px">Ce que tu peux dire</div><ol class="script">${d.script.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`;
    pied = `<button class="btn p" data-a="envoyer" data-id="${esc(id)}">${ic('phone')}Appeler${kbd}</button>`;
  } else {
    corps += sav + `<label class="fld"><span class="et">Le texte</span><span class="err e-err" hidden></span><textarea class="zone e-m">${esc(d.m)}</textarea></label>`
      + '<p class="hint">Puis colle-le dans leur formulaire de contact, ou sur leur page carrières.</p>';
    pied = `<a class="btn p" href="${esc(lienSite(c))}" target="_blank" rel="noopener noreferrer" data-a="envoyer" data-id="${esc(id)}">${c.website ? 'Copier et ouvrir leur site' : 'Copier et chercher leur site'}${ic('external-link')}${kbd}</a>`;
  }
  if (navigator.onLine === false && (canal === 'linkedin' || canal === 'site')){
    corps += `<p class="hl-l">${ic('radio')}<span>Pas de réseau : copie ${canal === 'linkedin' ? 'ton mot, tu le colleras dans LinkedIn' : 'le texte, tu le colleras sur leur site'} plus tard.</span></p>`;
    pied = `<button class="btn p" data-a="copier" data-id="${esc(id)}">${ic('copy')}${canal === 'linkedin' ? 'Copier mon mot' : 'Copier le texte'}${kbd}</button>`;
  }
  return { corps, pied };
}
/* où l'on écrit : la page « Écrire » au téléphone, la colonne de droite au poste */
function ecrEnCours(){
  if (C.poste){
    const c = pisteDe(P.sel); if (!c) return null;
    const k = suiteDeP(c).k; if (!k) return null;
    const canal = P.canalP[c.id] || canalDefaut(c, k, quiContacter(c));
    return { id: c.id, k, canal, d: brouillon(c.id, k, canal) };
  }
  const p = pageOuverte();
  if (!p || p.t !== 'ecrire') return null;
  return { id: p.id, k: p.k, canal: p.canal, d: brouillon(p.id, p.k, p.canal) };
}
const zoneEcr = () => C.poste ? $('.ecran .pc3') : $('.ecran');
function grandir(t){ if (!t || !t.offsetParent) return; t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
function brancherEcrire(z){
  const E = ecrEnCours();
  if (!E || !z) return;
  const d = E.d;
  $$('.zone', z).forEach(grandir);
  const o = $('.e-o', z), m = $('.e-m', z), a = $('.e-a', z), nom = $('.e-nom', z);
  if (o) o.addEventListener('input', () => { d.o = o.value.replace(/\n/g, ' '); d.touche = 1; grandir(o); const n = $('.e-n-o', z); if (n) n.textContent = d.o.length + '/60'; garderSession(); });
  if (o) o.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); m && m.focus(); } });
  if (m) m.addEventListener('input', () => { d.m = m.value; d.touche = 1; grandir(m); const n = $('.e-n-m', z); if (n){ n.textContent = d.m.length + '/' + LI_MAX; n.classList.toggle('trop', d.m.length > LI_MAX); } garderSession(); });
  if (a) a.addEventListener('input', () => { d.a = a.value.trim(); garderSession(); const er = $('.e-err-a', z); if (er) er.hidden = true; });
  if (nom) nom.addEventListener('change', () => {
    const v = nom.value.trim().slice(0, 80);
    if (!v) return;
    S.profile.name = v; saveProfile();
    /* le nom remplit tous les brouillons, sans rien effacer de ce qui est écrit */
    Object.values(br).forEach(x => { x.m = remplirTrous(x.m, S.profile); x.o = remplirTrous(x.o, S.profile); x.script = (x.script || []).map(s => s.split('[ton nom]').join(v)); });
    garderSession();
    rendre();
  });
}
function erreur(z, sel, txt, champ){ const p = $(sel, z); if (p){ p.textContent = txt; p.hidden = false; } if (champ) try { champ.focus(); } catch (e) {} }
/* tant qu'un crochet reste, rien ne sort : l'erreur le dit, et le
   crochet se sélectionne pour être remplacé d'un geste */
function crochetOk(z, d){
  const o = $('.e-o', z), m = $('.e-m', z);
  const co = d.o ? crochets(d.o)[0] : null, cm = crochets(d.m)[0];
  const x = co || cm, champ = co ? o : m;
  if (!x) return true;
  erreur(z, co ? '.e-err-o' : '.e-err', 'Remplace ce qui est entre crochets.');
  if (champ){ try { champ.focus(); champ.setSelectionRange(x.debut, x.fin); } catch (e) {} }
  return false;
}
function copier(txt, ta, b){
  const fin = () => { if (b){ const o = b.innerHTML; b.innerHTML = ic('check') + 'Copié'; setTimeout(() => { if (b.isConnected) b.innerHTML = o; }, 1600); } };
  const repli = () => { if (ta){ try { ta.focus(); ta.select(); } catch (e) {} } };
  try { navigator.clipboard.writeText(txt).then(fin, repli); } catch (e) { repli(); }
}
/* l'adresse ou le numéro tapés là restent sur la personne */
function garderCoord(c, canal, v){
  v = String(v || '').trim();
  if (!v || (canal !== 'mail' && canal !== 'appel')) return;
  const ct = quiContacter(c), f = canal === 'mail' ? 'email' : 'phone';
  if (ct){ if (!ct[f]){ ct[f] = v; c.updatedAt = Date.now(); saveData(); } }
  else { (c.contacts = c.contacts || []).push(normalizeContact({ [f]: v })); c.updatedAt = Date.now(); saveData(); }
}
function envoyer(ev, b){
  const E = ecrEnCours();
  if (!E){ ev.preventDefault(); return; }
  const z = zoneEcr(), d = E.d, c = pisteDe(E.id), ta = $('.e-m', z), ia = $('.e-a', z);
  if (E.canal === 'mail' && !emailPlausible(d.a)){ ev.preventDefault(); erreur(z, '.e-err-a', d.a.trim() ? 'Adresse incomplète (exemple : prenom.nom@gmail.com)' : 'Il manque son adresse.', ia); return; }
  if (E.canal === 'appel' && !String(d.a).trim()){ ev.preventDefault(); erreur(z, '.e-err-a', 'Il manque son numéro.', ia); return; }
  if (E.canal !== 'appel' && !crochetOk(z, d)){ ev.preventDefault(); return; }
  if (E.canal === 'linkedin' && d.m.length > LI_MAX){ ev.preventDefault(); erreur(z, '.e-err', `Trop long pour une invitation : ${LI_MAX} caractères au plus.`, ta); return; }
  garderCoord(c, E.canal, d.a);
  if (E.canal === 'linkedin' || E.canal === 'site') copier(d.m, ta);
  if (E.canal === 'mail'){ ev.preventDefault(); ouvrirLien('mailto:' + encodeURIComponent(d.a.trim()).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(d.o) + '&body=' + encodeURIComponent(d.m)); }
  if (E.canal === 'appel'){ ev.preventDefault(); ouvrirLien('tel:' + String(d.a).replace(/[^\d+]/g, '')); }
  P.envoi[E.id] = { k: E.k, canal: E.canal };
  P.pm[E.id] = 'parti';
  if (C.poste) P.viser = 'oui';
  garderSession();
  /* le lien s'ouvre d'abord ; la page revient ensuite sur « C'est parti ? » */
  setTimeout(() => { if (!C.poste && pageOuverte() && pageOuverte().t === 'ecrire') retour(); else rendre(); }, b.tagName === 'A' ? 80 : 30);
}
/* le mail et l'appel s'ouvrent par un lien qu'on touche : l'app de mail
   ou de téléphone de l'appareil prend la main */
function ouvrirLien(href){
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
function faitEnvoi(id){
  const c = pisteDe(id), en = P.envoi[id] || { k: 'premier', canal: '' };
  noterEnvoi(c, { k: en.k, canal: en.canal, ct: quiContacter(c), today: today() });
  saveData();
  logJ('Envoyé (' + (en.canal || '?') + ') : ' + c.name, c.id);
  if (en.k === 'premier' || en.k === 'relance') P.ecritAuj[id] = true;
  delete P.envoi[id]; P.pm[id] = '';
  /* les brouillons de ce geste repartent du modèle la prochaine fois */
  Object.keys(br).forEach(k => { if (k.startsWith(id + '|' + en.k + '|')) delete br[k]; });
  garderSession();
}

/* ---------- l'agenda du téléphone ---------- */
function ouvrirAgenda(c, titre, iso, heure){
  const details = 'Noté dans OpenContact.';
  if (formeAgenda(navigator.userAgent) === 'ics'){
    const ics = rappelICS({ uid: c.id + '-' + iso, titre, date: iso, details, ...(heure ? { heure } : {}) });
    if (!ics) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'rappel-' + iso + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return;
  }
  const url = lienAgendaGoogle({ titre, date: iso, details, ...(heure ? { heure } : {}) });
  if (url) window.open(url, '_blank', 'noopener');
}

/* ---------- la feuille d'un contact ---------- */
function champ(l, cl, v, attrs){ return `<label class="fld"><span class="et">${l}</span><input class="${cl}" type="text" value="${esc(v || '')}" ${attrs || ''}></label>`; }
function feuilleContact(id, i){
  const c = pisteDe(id), ct = i >= 0 ? c.contacts[i] : null;
  const r = c.siren ? rDe(c) : null, q = r ? aQui(r, c.name) : null;
  const prop = !ct && q && q.cible === 'dirigeant' && !(c.contacts || []).some(x => x.name === q.nom) ? q : null;
  ouvrirFeuille({
    titre: 'Contact',
    focus: ct ? '.c-n' : prop ? '.prop-b' : '.c-n',
    rendre: () => ({
      corps: (prop ? `<button class="pers prop prop-b" data-a="proposer"><div class="s-init" aria-hidden="true">${esc(initiales(prop.nom))}</div><div class="r-c"><b>${esc(prop.nom)}</b><span>${esc(prop.qualite)} · d’après l’annuaire</span></div>${ic('plus')}</button>` : '')
        + (!ct && !prop ? `<a class="lien" href="${esc(lienLI(c))}" target="_blank" rel="noopener noreferrer">Trouver qui recrute sur LinkedIn${ic('external-link')}</a>` : '')
        + champ('Nom', 'c-n', ct && ct.name, 'autocomplete="off" autocorrect="off" spellcheck="false"')
        + champ('Rôle', 'c-r', ct && ct.role, 'autocomplete="off"')
        + champ('E-mail', 'c-m', ct && ct.email, 'inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off"') + '<p class="err c-err" hidden></p>'
        + champ('Téléphone', 'c-t', ct && ct.phone, 'inputmode="tel" autocomplete="off"')
        + champ('LinkedIn', 'c-l', ct && ct.link, 'inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="Le lien de son profil"'),
      pied: '<button class="btn p" data-a="garder-ct">Enregistrer</button>'
    }),
    geste(a, el){
      const z = $('.couche-f');
      if (a === 'proposer'){ $('.c-n', z).value = prop.nom; $('.c-r', z).value = prop.qualite; el.hidden = true; $('.c-m', z).focus(); return; }
      if (a !== 'garder-ct') return;
      const v = s => { const x = $(s, z); return x ? x.value.trim() : ''; };
      const n = { name: v('.c-n'), role: v('.c-r'), email: v('.c-m'), phone: v('.c-t'), link: v('.c-l') };
      if (n.email && !emailPlausible(n.email)){ const er = $('.c-err', z); er.textContent = 'Adresse incomplète (exemple : prenom.nom@gmail.com)'; er.hidden = false; $('.c-m', z).focus(); return; }
      if (n.name || n.email || n.phone || n.link){
        if (ct){ Object.assign(ct, normalizeContact({ ...ct, ...n, id: ct.id })); pushHist(c, 'Contact modifié : ' + (n.name || n.email || n.phone)); }
        else { (c.contacts = c.contacts || []).push(normalizeContact(n)); pushHist(c, 'Contact ajouté : ' + (n.name || n.email || n.phone)); }
        c.updatedAt = Date.now();
        saveData();
        /* les brouillons ouverts prennent ce qui manquait, sans rien effacer */
        Object.keys(br).forEach(key => { if (!key.startsWith(id + '|')) return; const d = br[key], canal = key.split('|')[2];
          if (!d.a) d.a = canal === 'mail' ? n.email : canal === 'appel' ? n.phone : '';
          if (n.name) d.m = d.m.replace('Bonjour Madame, Monsieur,', 'Bonjour ' + n.name + ','); });
        garderSession();
      }
      fermerFeuille();
      rendre();
    }
  });
}

/* ---------- les gestes ---------- */
function instantane(c){ return JSON.parse(JSON.stringify(c)); }
function remettre(snap){
  const i = S.companies.findIndex(x => x.id === snap.id);
  const c = normalizeCompany(snap);
  if (i >= 0) S.companies[i] = c; else S.companies.push(c);
  saveData();
}
function ouvrirPiste(id, depuis){
  if (C.poste){ P.sel = id; rendre(); return; }
  pousser({ t: 'piste', id }, depuis);
}
function ouvrirEcrire(id, k, depuis){
  const c = pisteDe(id);
  if (!c) return;
  k = k || suiteDeP(c).k || 'premier';
  if (C.poste){ if (C.onglet !== 'pistes') allerA('pistes'); P.sel = id; P.viser = 'crochet'; rendre(); return; }
  const canal = canalDefaut(c, k, quiContacter(c));
  if (C.onglet !== 'pistes') allerA('pistes');
  const p = pageOuverte();
  if (p && p.t === 'ecrire'){ pousser({ t: 'piste', id }); }
  else if (!p || p.id !== id) pousser({ t: 'piste', id }, depuis);
  pousser({ t: 'ecrire', id, k, canal });
}
function evenement(c, v){
  const snap = instantane(c);
  if (v === 'ecrit'){ noterEcrit(c, today()); P.ecritAuj[c.id] = true; saveData(); logJ('Écrit : ' + c.name, c.id); return; }
  if (v === 'autre'){ noterReponse(c); P.pm[c.id] = ''; saveData(); return; }
  if (v === 'non'){ clore(c, 'rejected', today()); P.pm[c.id] = ''; saveData(); logJ('Refus : ' + c.name, c.id);
    annuler(c.name + ' : c’est non', () => remettre(snap)); return; }
  if (v === 'oui'){ clore(c, 'won', today()); saveData(); logJ('Décroché : ' + c.name, c.id);
    annuler(c.name + ' : c’est oui', () => remettre(snap)); }
}
function geste(a, el, ev){
  if (gesteBas(a, el)) return true;
  const id = el ? el.getAttribute('data-id') || '' : '', v = el ? el.getAttribute('data-v') : null, c = id ? pisteDe(id) : null;
  if (a === 'aller'){ allerA(id); return true; }
  if (a === 'piste' && c){ ouvrirPiste(id, el); return true; }
  if (a === 'ecrire' && c){ ouvrirEcrire(id, el.getAttribute('data-k'), el); return true; }
  if (a === 'envoyer'){ envoyer(ev, el); return true; }
  if (a === 'copier'){
    const E = ecrEnCours(); if (!E) return true;
    const z = zoneEcr();
    if (E.canal !== 'appel' && !crochetOk(z, E.d)) return true;
    copier((E.d.o ? E.d.o + '\n\n' : '') + E.d.m, $('.e-m', z), el);
    P.envoi[E.id] = { k: E.k, canal: E.canal }; P.pm[E.id] = 'parti'; if (C.poste) P.viser = 'oui'; garderSession();
    setTimeout(() => { if (!C.poste && pageOuverte() && pageOuverte().t === 'ecrire') retour(); else rendre(); }, 900);
    return true;
  }
  if (a === 'canal' && c){
    if (C.poste){ P.canalP[id] = v; rendre(); }
    else { const p = pageOuverte(); if (p && p.t === 'ecrire') remplacerPage({ canal: v }); }
    return true;
  }
  if (a === 'pm' && c){ P.pm[id] = v || ''; garderSession(); rendre(); return true; }
  if (a === 'pas-encore' && c){ P.pm[id] = ''; delete P.envoi[id]; garderSession(); rendre(); return true; }
  if (a === 'envoye' && c){ faitEnvoi(id); C.vient = 'pistes'; if (C.poste) P.viser = 'suivante'; rendre(); return true; }
  if (a === 'ev' && c){ evenement(c, v); rendre(); return true; }
  if ((a === 'quand' || a === 'quand-ok') && c){
    const jour = a === 'quand' ? v : ($('.jour-e', el.closest('.autre-j')) || {}).value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(jour || ''))) return true;
    noterEntretien(c, jour); P.pm[id] = ''; saveData(); logJ('Entretien : ' + c.name, c.id); garderSession(); rendre();
    return true;
  }
  if (a === 'etape' && c){
    c.suite = cocherSuite(c, S.profile, v, today()); c.updatedAt = Date.now(); saveData();
    rendre();
    return true;
  }
  if (a === 'rappel' && c){
    const jour = plusJours(today(), 7), ct = quiContacter(c);
    ouvrirAgenda(c, 'Relancer ' + (prenomDe(ct && ct.name) || c.name) + ' — ' + c.name, jour);
    P.rappel[id] = jour; rendre(); return true;
  }
  if (a === 'agenda-e' && c){ ouvrirAgenda(c, 'Entretien — ' + c.name, c.nextAction, '09:00'); P.agendaE[id] = true; rendre(); return true; }
  if (a === 'rouvrir' && c){ rouvrir(c); saveData(); rendre(); return true; }
  if (a === 'lacher' && c){
    const snap = instantane(c);
    clore(c, 'dropped', today(), 'Laissée de côté'); saveData();
    annuler(c.name + ' laissée de côté', () => remettre(snap));
    rendre();
    return true;
  }
  if (a === 'ranger1' && c){ const snap = instantane(c); clore(c, 'dropped', today()); saveData(); annuler(c.name + ' rangée', () => remettre(snap)); rendre(); return true; }
  if (a === 'ranger'){
    const af = aFaire(S.companies, opt()).find(x => x.ranger);
    if (!af) return true;
    const snaps = af.ranger.map(x => instantane(pisteDe(x)));
    af.ranger.forEach(x => clore(pisteDe(x), 'dropped', today()));
    saveData();
    annuler(`${snaps.length} piste${snaps.length > 1 ? 's' : ''} rangée${snaps.length > 1 ? 's' : ''}`, () => snaps.forEach(remettre));
    rendre();
    return true;
  }
  if (a === 'supprimer' && c){
    deletePiste(c);
    if (P.sel === id) P.sel = '';
    annuler(c.name + ' supprimée', () => undeletePiste(c));
    rendre();
    return true;
  }
  if (a === 'contact' && c){ feuilleContact(id, Number(v)); return true; }
  /* DEMANDER À UN AMI qui y est passé : la phrase et « Envoyer » sur la page */
  if (a === 'demande' && c){
    P.dem[id] = v || '';
    P.pm[id] = 'demande';
    if (C.poste){ P.sel = id; if (C.onglet !== 'pistes') allerA('pistes'); rendre(); }
    else { const p = pageOuverte(); if (!p || p.t !== 'piste' || p.id !== id) ouvrirPiste(id, el); else rendre(); }
    return true;
  }
  if (a === 'demander' && c){
    const am = amiDe(P.dem[id] || (amisOpt().portes.get(id) || {}).amiId);
    if (!am) return true;
    el.disabled = true;
    demander(c, { amis: [am], groupes: false }).then(d => {
      el.disabled = false;
      if (!d){ const e = $('.ecran .d-err'); if (e){ e.textContent = 'Pas de réseau : ta demande n’est pas partie.'; e.hidden = false; } return; }
      pushHist(c, 'Demandé à ' + prenomDe(am.nom));
      c.updatedAt = Date.now();
      saveData();
      P.pm[id] = '';
      rendre();
    });
    return true;
  }
  /* le contact qu'un ami m'a donné : il entre dans la piste */
  if (a === 'don' && c){
    const dem = amisOpt().demandes.get(id);
    if (!dem || !dem.don) return true;
    ajouterDon(dem.don.id).then(x => {
      if (!x) return;
      annuler(`Contact ajouté à ${x.piste.name}`, () => x.defaire());
      rendre();
    });
    return true;
  }
  return false;
}

/* ---------- les pages (au téléphone) ---------- */
inscrirePage('piste', {
  titre: () => 'Piste',
  rendre(p){ const c = pisteDe(p.id); return c ? { titre: 'Piste', corps: pageP(c) } : { titre: 'Piste', corps: '<div class="panneau"><p>Cette piste n’existe plus.</p></div>' }; },
  geste: (a, el, ev) => geste(a, el, ev),
  apres: (p, ecran) => brancherPage(ecran)
});
inscrirePage('ecrire', {
  titre: p => ({ premier: 'Écrire', relance: 'Relancer', merci: 'Merci', reponse: 'Répondre' })[p.k] || 'Écrire',
  rendre(p){
    const c = pisteDe(p.id);
    if (!c) return { corps: '' };
    const x = ecrireHTML(p.id, p.k, p.canal);
    return { titre: ({ premier: 'Écrire', relance: 'Relancer', merci: 'Merci', reponse: 'Répondre' })[p.k] || 'Écrire',
      corps: `<div class="s-page ecr">${x.corps}</div>`, pied: x.pied };
  },
  geste: (a, el, ev) => geste(a, el, ev),
  apres: (p, ecran) => brancherEcrire(ecran)
});
/* les notes s'écrivent sans bouton ; un pli garde son état */
let tNotes = null;
function brancherPage(z){
  $$('.n-notes', z).forEach(t => {
    grandir(t);
    t.addEventListener('input', () => {
      const c = pisteDe(t.getAttribute('data-id')); if (!c) return;
      c.notes = t.value; grandir(t);
      clearTimeout(tNotes); tNotes = setTimeout(() => { c.updatedAt = Date.now(); saveData(); }, 500);
    });
  });
  $$('details[data-p]', z).forEach(d => d.addEventListener('toggle', () => { P.ouv[d.getAttribute('data-p')] = d.open; if (d.open) $$('.zone', d).forEach(grandir); }));
  $$('.jour-e', z).forEach(i => {
    const ok = i.closest('.autre-j') && $('[data-a="quand-ok"]', i.closest('.autre-j'));
    const montrer = () => { if (ok) ok.hidden = !/^\d{4}-\d{2}-\d{2}$/.test(i.value); };
    i.addEventListener('input', montrer);
    i.addEventListener('change', montrer);
  });
}

/* ---------- l'onglet ---------- */
function rendreTel(ecran, premier){
  const n = S.companies.filter(c => !c.demo).length;
  if (premier || !$('.p-liste-c', ecran)){
    ecran.innerHTML = '<div class="defile"><div class="s-tete"><h3>Pistes<small class="n-p"></small></h3></div><div class="p-cherche-c"></div><div class="p-liste-c"></div></div>';
  }
  $('.n-p', ecran).textContent = n || '';
  const pc = $('.p-cherche-c', ecran);
  if (n >= 10 && !pc.firstChild){ pc.innerHTML = chercheP(); brancherCherche(pc); }
  else if (n < 10 && pc.firstChild){ pc.innerHTML = ''; P.qp = ''; }
  remplacer($('.p-liste-c', ecran), corpsPistes());
  brancherPage(ecran);
}
function brancherCherche(z){
  const q = $('.qp', z);
  if (!q) return;
  q.value = P.qp;
  q.addEventListener('input', () => { P.qp = q.value; rendre(); });
  q.addEventListener('keydown', e => { if (e.key === 'Escape'){ P.qp = ''; q.value = ''; rendre(); } });
}
function rendrePoste(ecran, premier){
  const ids = S.companies.filter(c => !c.demo);
  if (premier || !$('.pc1', ecran)){
    ecran.innerHTML = '<div class="p-col c1 pc1"><div class="p-cherche-c"></div><div class="defile p-liste-c"></div></div><div class="p-col pc2"></div><div class="p-col pc3"></div>';
  }
  ecran.classList.toggle('zero', !ids.length);
  if (ids.length && (!P.sel || !pisteDe(P.sel))){ const af = aFaire(ids, opt()).filter(x => x.id); P.sel = af.length ? af[0].id : ids[0].id; }
  const pc = $('.p-cherche-c', ecran);
  if (ids.length >= 10 && !pc.firstChild){ pc.innerHTML = chercheP(); brancherCherche(pc); }
  else if (ids.length < 10 && pc.firstChild) pc.innerHTML = '';
  remplacer($('.p-liste-c', ecran), corpsPistes());
  const c2 = $('.pc2', ecran), c3 = $('.pc3', ecran), c = pisteDe(P.sel);
  if (!c){
    c2.innerHTML = '<div class="p-vide"><p>Ta piste s’ouvre ici.</p></div>'; c3.innerHTML = ''; c2.removeAttribute('data-id');
    return;
  }
  const meme = c2.getAttribute('data-id') === c.id;
  const h2 = `<div class="defile">${pageP(c)}</div>`;
  if (meme) remplacer(c2, h2); else { c2.innerHTML = h2; c2.setAttribute('data-id', c.id); }
  const s = suiteDeP(c);
  const memeE = c3.getAttribute('data-k') === c.id + '|' + (s.k || '') + '|' + (P.canalP[c.id] || '');
  if (s.k){
    const canal = P.canalP[c.id] || canalDefaut(c, s.k, quiContacter(c)), x = ecrireHTML(c.id, s.k, canal);
    const h3 = `<div class="defile"><div class="s-page ecr"><div class="c3-t">${esc(s.b)}</div>${x.corps}</div></div><div class="pied">${x.pied}</div>`;
    if (memeE && !P.pm[c.id]) remplacer(c3, h3); else { c3.innerHTML = h3; c3.setAttribute('data-k', c.id + '|' + s.k + '|' + (P.canalP[c.id] || '')); }
    brancherEcrire(c3);
  } else {
    c3.removeAttribute('data-k');
    c3.innerHTML = `<div class="p-vide"><p><b>Rien à écrire pour l’instant.</b>${esc(s.s || '')}</p></div>`;
  }
  brancherPage(c2);
  viser(ecran);
  if (!ecran.__entree){
    ecran.__entree = true;
    /* ↵ sur une ligne de la liste : le geste de sa piste (écrire, relancer…) */
    ecran.addEventListener('keydown', ev => {
      if (ev.key !== 'Enter' || ev.ctrlKey || ev.metaKey || !C.poste || !ev.target.matches || !ev.target.matches('.pc1 .r-c[data-a="piste"]')) return;
      const id = ev.target.getAttribute('data-id');
      if (!gesteEntree(id)) return;
      ev.preventDefault(); ev.stopPropagation();
      faireEntree(id);
    });
  }
}
/* ce que ↵ ouvre sur la piste choisie : le geste de sa ligne dans « À faire » */
function gesteEntree(id){ const c = id && pisteDe(id); if (!c || P.pm[id]) return null; const s = suiteDeP(c); return s && (s.k || s.a === 'demande') ? s : null; }
function faireEntree(id){
  const s = gesteEntree(id);
  if (!s) return false;
  P.sel = id;
  if (s.k) ouvrirEcrire(id, s.k);
  else { P.pm[id] = 'demande'; rendre(); }
  return true;
}
/* ouvrir pour écrire pose le curseur sur le premier crochet : il suffit de
   taper sa phrase ; « Oui, envoyé » puis « Suivante » ont la main ensuite —
   une séance s'enchaîne sans la souris */
function viser(ecran){
  const v = P.viser;
  if (!v) return;
  P.viser = '';
  if (v === 'crochet'){
    const z = $('.pc3', ecran);
    for (const t of z ? [$('.e-o', z), $('.e-m', z)] : []){
      const x = t && crochets(t.value)[0];
      if (x){ t.focus(); try { t.setSelectionRange(x.debut, x.fin); } catch (e) {} return; }
    }
    const m = z && $('.e-m', z);
    if (m) m.focus({ preventScroll: true });
    return;
  }
  const el = v === 'oui' ? $('.pc2 [data-a="envoye"]', ecran) : v === 'suivante' ? $('.pc2 .suivante', ecran) : null;
  if (el) el.focus({ preventScroll: true });
}
function choisir(pas){
  const l = $$('.ecran .pc1 .r-c[data-a="piste"]').map(x => x.getAttribute('data-id'));
  if (!l.length) return;
  /* rien de choisi : ↓ prend la première, ↑ la dernière */
  const i = l.indexOf(P.sel);
  P.sel = i < 0 ? l[pas < 0 ? l.length - 1 : 0] : l[Math.min(l.length - 1, Math.max(0, i + pas))];
  rendre();
  const on = $$('.ecran .pc1 .r-c[data-a="piste"]').find(x => x.getAttribute('data-id') === P.sel);
  if (on){ on.focus({ preventScroll: true }); on.scrollIntoView({ block: 'nearest' }); }
}

/* au poste, la piste qu'on vient de garder (Trouver, ses e-mails) est
   celle que Pistes montre : P, puis ↵, et l'on écrit */
export function choisirPiste(id){ if (C.poste && id) P.sel = id; }

export default {
  id: 'pistes',
  compte: () => { const n = S.companies.filter(c => !c.demo).length; return n ? String(n) : ''; },
  rendre(ecran, { poste, premier }){ (poste ? rendrePoste : rendreTel)(ecran, premier); },
  geste(a, el, ev){ geste(a, el, ev); },
  clavier(ev, { champ, poste, mod }){
    if (!poste) return false;
    if (mod){
      if (ev.key !== 'Enter') return false;
      const b = $('.ecran .pc3 .pied .btn.p');
      if (!b) return false;
      ev.preventDefault();
      b.click();
      return true;
    }
    if (champ) return false;
    /* ↵ hors d'un bouton (la page, son titre, où la coque pose la main en
       changeant d'onglet) : le geste de la piste choisie — P, puis ↵ */
    const neutre = ev.target === document.body || ev.target === $('.ecran') || /^H[1-4]$/.test(ev.target.tagName || '');
    if (ev.key === 'Enter' && neutre && faireEntree(P.sel)){ ev.preventDefault(); return true; }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp'){ ev.preventDefault(); choisir(ev.key === 'ArrowDown' ? 1 : -1); return true; }
    if (ev.key === '/' && $('.ecran .qp')){ ev.preventDefault(); $('.ecran .qp').focus(); return true; }
    return false;
  },
  etat(){
    const ids = S.companies.filter(c => !c.demo), af = aFaire(ids, opt()), g = gesteEntree(P.sel);
    return `<span>${ids.length} piste${ids.length > 1 ? 's' : ''}</span>` + (af.length ? `<span>${af.length} à faire</span>` : '')
      + cles([ids.length ? [['↑', '↓'], 'choisir'] : null, g ? [['↵'], (g.c || g.b || 'ouvrir').toLowerCase()] : null, ids.length >= 10 ? [['/'], 'chercher'] : null]);
  }
};
/* Trouver et la page d'une entreprise ouvrent l'écriture d'une piste
   gardée : « Préparer mon message » */
export { ouvrirEcrire, ouvrirPiste };
