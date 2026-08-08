/* ============================================================
   OpenContact — moteur · mon groupe
   Les camarades avec qui on échange, et le profil qu'on leur donne.

   POURQUOI ÇA EXISTE. Une candidature à froid décroche un entretien
   dans ~3 % des cas, une candidature portée par quelqu'un qui est
   dedans dans ~40 %. Le partage transportait des ENTREPRISES ; depuis
   « j'y suis passé » il transporte aussi un prénom. Mais « Léa y a
   fait son stage » ne mène nulle part si Léa n'est nulle part : il
   manquait la personne derrière le prénom.

   CE QUE CE FICHIER N'EST PAS. Un carnet d'adresses. L'app est un
   outil d'action, pas une base de données (§1) : un membre du groupe
   n'existe ici que parce qu'on peut lui DEMANDER quelque chose.
   D'où le minimum vital de champs, et pas un de plus.

   L'INVARIANT QUI TIENT TOUT. Un membre du groupe est la vie privée
   de QUELQU'UN D'AUTRE. Il ne sort donc JAMAIS dans un partage
   communautaire — ni sa ligne, ni son email, ni le fait qu'il soit
   dans mon groupe. Il voyage seulement vers MES appareils et dans MA
   copie personnelle. C'est plus strict que le suivi privé ordinaire,
   parce que la donnée n'est même pas la mienne.
   ============================================================ */
import { normName } from './utils.js';
import { safeId, safeUrl } from './model.js';

/* Un groupe de promo, c'est trente personnes. Le plafond est là pour
   qu'un fichier reçu ne puisse pas faire enfler la clé, pas pour
   brider qui que ce soit. */
export const GROUPE_MAX = 200;
const CAP = { prenom: 40, nom: 40, formation: 60, email: 120, phone: 30, note: 140 };
const coupe = (v, n) => String(v || '').trim().replace(/\s+/g, ' ').slice(0, n);

/* Le profil qui VOYAGE — un sous-ensemble choisi, jamais l'objet
   complet. Modèles d'emails, prompts, lettre, fiches confirmées,
   drapeaux : rien de tout ça ne regarde le groupe. Ce qui part est ce
   qui sert à recontacter quelqu'un et à savoir qui il est. */
export const CARTE_CHAMPS = ['prenom', 'nom', 'formation', 'email', 'phone', 'link'];

/* Le prénom est le SEUL champ obligatoire : c'est lui qui relie une
   déclaration « j'y suis passé » à une personne. Sans lui, l'entrée
   ne sert à rien et on la refuse plutôt que de garder une ligne
   muette dans une liste. */
export function normalizeMembre(x){
  x = x || {};
  /* Un profil ne porte qu'un `name` (« Léa Martin ») : on en tire le
     prénom, parce que c'est la forme sous laquelle une déclaration
     voyage. Mais le découpage ne s'applique qu'à `name` : un `prenom` donné
     explicitement est pris tel quel, parce que « Anne-Marie » et « Léa
     Marie » sont des prénoms, pas un prénom plus un nom. Le découper
     produirait un nom de famille inventé — et le même mot deux fois. */
  const donne = coupe(x.prenom, CAP.prenom);
  const morceaux = coupe(x.name, CAP.prenom + CAP.nom + 1).split(' ');
  const out = {
    id: safeId(x.id),
    prenom: donne || coupe(morceaux[0], CAP.prenom),
    nom: coupe(x.nom || (donne ? '' : morceaux.slice(1).join(' ')), CAP.nom),
    formation: coupe(x.formation, CAP.formation),
    email: coupe(x.email, CAP.email),
    phone: coupe(x.phone, CAP.phone),
    link: safeUrl(x.link),
    note: coupe(x.note, CAP.note)
  };
  return out.prenom ? out : null;
}

/* Deux entrées désignent la même personne si elles partagent un email
   OU un prénom+nom complet. Les deux comptent, pas seulement le
   premier trouvé : Léa qui redonne son profil depuis une autre adresse
   ne doit pas apparaître deux fois, et son ancien email ne doit pas
   pour autant être remplacé (la divergence est comptée, §4).
   Deux « Léa » sans nom de famille, en revanche, ne fusionnent PAS :
   mieux vaut deux lignes qu'un mélange de deux personnes — et c'est
   exactement le cas où `trouverMembre` refusera de deviner. */
export function membreKeys(m){
  const out = [];
  const mail = String((m && m.email) || '').trim().toLowerCase();
  if (mail) out.push('e:' + mail);
  const nom = normName((m && m.nom) || '');
  if (nom) out.push('n:' + normName(m.prenom) + '|' + nom);
  if (!out.length) out.push('i:' + ((m && m.id) || ''));
  return out;
}
export const membreKey = m => membreKeys(m)[0];

/* Fusionner deux versions d'une même personne : on COMPLÈTE les vides,
   jamais on n'écrase (invariant ②). Une divergence est comptée, pas
   importée — si Léa a changé d'email, c'est à l'utilisateur de
   trancher, pas à un fichier reçu. */
function completer(ex, x, stats){
  for (const k of ['prenom', 'nom', 'formation', 'email', 'phone', 'link', 'note']){
    const v = x[k];
    if (!v) continue;
    if (!ex[k]){ ex[k] = v; stats.filled++; }
    else if (ex[k] !== v) stats.conflicts++;
  }
}

/* Applique des entrées reçues sur MON groupe, en place.
   Rend de quoi écrire un aperçu honnête avant d'enregistrer. */
export function mergeMembres(entrants, mes){
  const stats = { added: 0, filled: 0, conflicts: 0, skipped: 0 };
  const index = new Map();
  const ranger = m => { for (const k of membreKeys(m)) if (!index.has(k)) index.set(k, m); };
  for (const m of mes) ranger(m);
  for (const brut of (entrants || [])){
    const m = normalizeMembre(brut);
    if (!m){ stats.skipped++; continue; }
    const ex = membreKeys(m).map(k => index.get(k)).find(Boolean);
    if (ex){ completer(ex, m, stats); ranger(ex); continue; }
    if (mes.length >= GROUPE_MAX){ stats.skipped++; continue; }
    mes.push(m);
    ranger(m);
    stats.added++;
  }
  return stats;
}

/* Aperçu AVANT d'enregistrer : la fusion tourne à blanc sur une copie,
   exactement comme pour les pistes. Aucun geste lourd ne s'applique
   sans que l'utilisateur ait vu ce qu'il fait. */
export function mergeMembresPreview(entrants, mes){
  const copie = JSON.parse(JSON.stringify(mes || []));
  const stats = mergeMembres(entrants, copie);
  return { stats, apres: copie };
}

/* ---------- relier une déclaration à une personne ----------
   « Léa y a fait son stage » n'est actionnable que si Léa est
   quelqu'un. La recherche se fait sur le prénom replié (accents
   compris : « Léa » trouve « Lea »).

   Deux Léa dans la promo → on ne devine pas. Rendre la mauvaise
   personne serait pire que n'en rendre aucune : l'utilisateur
   écrirait au mauvais camarade en croyant l'app. */
export function trouverMembre(groupe, prenom){
  const p = normName(prenom);
  if (!p) return null;
  const hits = (groupe || []).filter(m => normName(m.prenom) === p);
  return hits.length === 1 ? hits[0] : null;
}

/* ---------- ce qui a circulé avec chacun ----------
   Ce qui empêche cette liste d'être un carnet d'adresses : chaque
   ligne porte l'histoire réelle de l'échange. Le journal note « reçu
   de Marco : 3 pistes » depuis toujours ; on relie ces lignes aux
   personnes plutôt que d'inventer un compteur de plus. */
export function bilanMembre(log, membre){
  const p = normName(membre && membre.prenom);
  let recu = 0, dernier = 0;
  for (const x of (log || [])){
    if (x.sens !== 'recu' || !x.qui) continue;
    /* « Marco » ou « Marco Delaunay » dans le journal : on compare le
       premier mot, la forme sous laquelle un prénom est écrit. */
    if (normName(String(x.qui).split(/\s+/)[0]) !== p) continue;
    recu += x.n;
    if (x.t > dernier) dernier = x.t;
  }
  return { recu, dernier };
}

/* Le groupe rangé pour l'écran : ceux qui ont donné en premier — la
   liste répond « qui m'aide » avant « qui je connais ». À égalité,
   l'ordre alphabétique, pour que la place d'un nom ne bouge pas. */
export function trierGroupe(groupe, log){
  return (groupe || []).slice().sort((a, b) => {
    const ba = bilanMembre(log, a), bb = bilanMembre(log, b);
    if (bb.recu !== ba.recu) return bb.recu - ba.recu;
    return a.prenom.localeCompare(b.prenom, 'fr');
  });
}

/* ---------- mon profil, en partance ----------
   `champs` = ce que l'utilisateur a coché. Rien n'est envoyé par
   défaut au-delà du prénom : c'est SA donnée, il décide de chaque
   ligne, et ce qui n'est pas coché n'existe pas dans le fichier. */
export function carteDeProfil(profile, champs){
  const p = profile || {};
  const veut = new Set(Array.isArray(champs) ? champs : CARTE_CHAMPS);
  const entier = coupe(p.name, CAP.prenom + CAP.nom + 1).split(' ');
  const out = { prenom: coupe(entier[0], CAP.prenom) };
  if (veut.has('nom')) out.nom = coupe(entier.slice(1).join(' '), CAP.nom);
  if (veut.has('formation')) out.formation = coupe(p.formation, CAP.formation);
  if (veut.has('email')) out.email = coupe(p.email, CAP.email);
  if (veut.has('phone')) out.phone = coupe(p.phone, CAP.phone);
  if (veut.has('link')) out.link = safeUrl(p.portfolio);
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out.prenom ? out : null;
}

/* Ce qu'un profil sortant montre à l'utilisateur avant de partir —
   la même liste que ce que le fichier contiendra, mot pour mot.
   « Voir avant d'envoyer » vaut pour ses propres données aussi. */
export function resumeCarte(carte){
  if (!carte) return [];
  return [carte.prenom, carte.nom, carte.formation, carte.email, carte.phone, carte.link]
    .filter(Boolean);
}
