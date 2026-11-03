/* ============================================================
   UN JEU DE DONNÉES À GRANDE ÉCHELLE (« vérifie avec des données en
   grand nombre », le mainteneur, 21 octobre 2026)

   Les scénarios sèment trois pistes, un ami, un groupe de quatre
   messages : c'est ce qui les rend lisibles, et c'est aussi ce qui
   cache tout ce qui casse au-delà. Ce module fabrique un étudiant AU
   BOUT de ce que l'app accepte — ses plafonds réels, lus dans le moteur,
   pas des chiffres ronds :
   · 400 pistes, de tous les états, avec contacts, actions, notes,
     historique, « J'y suis passé » ;
   · 200 amis (le plafond d'`amis`), chacun avec un parcours ;
   · 5 groupes (le plafond), de 30 à 45 membres, et des centaines de
     messages sur sept jours — dont des dons de pistes, des demandes et
     des mentions ;
   · 120 conversations privées, de 2 à 300 messages (le plafond par ami) ;
   · la boîte aux lettres pleine : mes 3 demandes ouvertes et 25 de plus
     ces trente jours, 60 demandes reçues, des contacts donnés, des
     mercis, 18 personnes qui attendent à la porte d'un groupe ;
   · le journal plein (200), 40 contacts à rattacher, 30 brouillons.
   Déterministe : la même graine rend le même étudiant.
   ============================================================ */
import { nouvelleCle } from '../../engine/boite.js';
import { nouveauCode, nouvelleCleSignature } from '../../engine/groupe.js';

const M = 60000, H = 60 * M, J = 24 * H;

/* un tirage reproductible (mulberry32) */
function hasard(graine){
  let a = graine >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (a0, b0) => a0 + Math.floor(r() * (b0 - a0 + 1));
  const un = l => l[Math.floor(r() * l.length)];
  const id = (n = 16) => Array.from({ length: n }, () => un('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789')).join('');
  return { r, int, un, id, oui: p => r() < p };
}

const PRENOMS = ['Léa', 'Karim', 'Inès', 'Hugo', 'Sofia', 'Yanis', 'Chloé', 'Mehdi', 'Manon', 'Lucas', 'Jade', 'Rayan',
  'Camille', 'Nathan', 'Sarah', 'Adam', 'Emma', 'Ilyes', 'Louise', 'Théo', 'Amira', 'Noah', 'Lina', 'Enzo', 'Zoé',
  'Bilal', 'Clara', 'Sami', 'Anaïs', 'Mathis', 'Maëlys', 'Ayoub', 'Juliette', 'Kenza', 'Tom', 'Nour', 'Axel', 'Rose',
  'Wassim', 'Alice', 'Imran', 'Eva', 'Malik', 'Léna', 'Gabriel', 'Yasmine', 'Arthur', 'Selma', 'Paul', 'Maya'];
const NOMS = ['Martin', 'Benali', 'Dubois', 'Nguyen', 'Moreau', 'Haddad', 'Lefebvre', 'Garcia', 'Roux', 'Diallo',
  'Fournier', 'Mercier', 'Bouzid', 'Lambert', 'Faure', 'Chevalier', 'Traoré', 'Girard', 'André', 'Kaci', 'Bonnet',
  'Dupont', 'Lopez', 'Fontaine', 'Rousseau', 'Mansouri', 'Blanc', 'Guerin', 'Muller', 'Henry'];
const RACINES = ['Advens', 'Wallix', 'Sopra', 'Orange', 'Thales', 'Capgemini', 'Atos', 'Inetum', 'Alten', 'Akkodis',
  'Sogeti', 'Devoteam', 'Stormshield', 'Synacktiv', 'Ozon', 'Nexia', 'Datalink', 'Arcanum', 'Cyberis', 'Vaultis',
  'Netsys', 'Kalidea', 'Proxima', 'Helios', 'Altair', 'Opteam', 'Cloudnet', 'Infosec', 'Logipro', 'Numeria'];
const SUFFIXES = ['', ' Cyberdefense', ' Group', ' Solutions', ' Services', ' Lille', ' Nord', ' Consulting', ' Digital',
  ' Technologies', ' Systèmes', ' Réseaux', ' Global Solution Center', ' Informatique', ' Sécurité'];
const VILLES = ['Lille', 'Roubaix', 'Tourcoing', 'Villeneuve-d’Ascq', 'Lens', 'Arras', 'Douai', 'Valenciennes', 'Amiens',
  'Paris', 'Lyon', 'Rennes', 'Nantes', 'Bordeaux', 'Toulouse', 'Marseille', 'Strasbourg', 'Rouen', 'Reims', 'Dunkerque'];
const DOMAINES = ['esn', 'cyber', 'cloud', 'dsi', 'public', 'startup', 'industrie', 'commerce', 'sante', 'autre'];
const ROLES = ['RH', 'Responsable SOC', 'DSI', 'Chargée de recrutement', 'Tuteur alternance', 'Ingénieur réseau',
  'Directeur technique', 'Talent acquisition', 'Responsable infrastructure', 'Pentester'];
const MOTS = ['Quelqu’un a une piste en réseau ?', 'Forum jeudi à 14 h, salle B12', 'Je viens d’avoir un entretien chez @',
  'Ils prennent des alternants en cyber', 'Regarde https://advens.fr/carrieres', 'Merci pour la piste !',
  'Le CV en une page, c’est mieux', 'Quelqu’un connaît le tuteur de chez @ ?', 'J’ai relancé trois boîtes ce matin',
  'Ils m’ont répondu au bout de dix jours', 'La date limite pour la convention, c’est vendredi',
  'Qui vient au salon de l’alternance samedi ?', 'Je partage mes pistes de Roubaix ce soir',
  'Attention, l’offre de stage est fermée', 'C’est bon pour moi, j’ai signé !', 'Quelqu’un a un contact RH chez @ ?',
  'Pensez à mettre vos technos dans le mail', 'Le prof a dit que la soutenance est en juin',
  'Je cherche encore pour janvier', 'Ils font du SOC 24/7, c’est intéressant'];
const PRIVE = ['Salut !', 'Tu as eu une réponse ?', 'Je t’envoie le contact ce soir', 'Merci beaucoup !', 'Tu peux relire mon mail ?',
  'Oui, ils prennent encore', 'On se voit au forum ?', 'J’ai un entretien demain', 'Bonne chance !', 'Tu connais quelqu’un chez Thales ?',
  'Je te donne mes pistes de Lens', 'Super, j’ai signé', 'Ok, je regarde', 'C’est à quelle heure ?', 'Envoie-moi ton CV'];

const jour = t => new Date(t).toISOString().slice(0, 10);

/* `now` : l'instant du jeu ; `graine` : le même étudiant à chaque fois.
   Les tailles se règlent pour mesurer aussi en dessous des plafonds. */
export async function jeuMassif({ now = Date.now(), graine = 21, pistes: NP = 400, amis: NA = 200, groupes: NG = 5,
  conversations: NC = 120, motsParGroupe = [640, 380, 260, 140, 60] } = {}){
  const h = hasard(graine);
  const nomPersonne = () => h.un(PRENOMS) + ' ' + h.un(NOMS);
  const cleFactice = () => h.id(87);

  /* ---------- les pistes ---------- */
  const companies = [];
  const vus = new Set();
  for (let i = 0; companies.length < NP; i++){
    const name = h.un(RACINES) + h.un(SUFFIXES) + (i >= RACINES.length * SUFFIXES.length / 2 ? ' ' + h.int(2, 99) : '');
    if (vus.has(name)) continue;
    vus.add(name);
    const city = h.un(VILLES);
    const ferme = h.oui(0.1), etat = h.r();
    const status = ferme ? 'reply' : etat < 0.4 ? 'todo' : etat < 0.8 ? 'active' : 'reply';
    const nbCt = h.oui(0.2) ? 0 : h.int(1, 4);
    const contacts = Array.from({ length: nbCt }, (_, k) => {
      const n = nomPersonne();
      const ct = { id: 'ct' + i + '_' + k, name: n, role: h.un(ROLES) };
      if (h.oui(0.7)) ct.email = n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.') + '@exemple.test';
      if (h.oui(0.3)) ct.phone = '06 ' + h.int(10, 99) + ' ' + h.int(10, 99) + ' ' + h.int(10, 99) + ' ' + h.int(10, 99);
      if (h.oui(0.2)) ct.link = 'https://www.linkedin.com/in/' + h.id(8).toLowerCase();
      return ct;
    });
    const cree = now - h.int(1, 120) * J;
    const c = { id: 'p' + String(i).padStart(4, '0'), name, city, domain: h.un(DOMAINES), status, contacts,
      positions: [h.un(['stage', 'alternance', 'cdi'])], techs: h.oui(0.5) ? 'Linux, Cisco, Python' : '',
      notes: h.oui(0.4) ? 'Vu au forum. Rappeler en ' + h.un(['janvier', 'mars', 'avril']) + '. ' + 'Ils cherchent quelqu’un pour le SOC.'.repeat(h.int(1, 3)) : '',
      createdAt: cree, updatedAt: cree + h.int(0, 30) * J, history: [] };
    if (status !== 'todo'){
      c.appliedAt = jour(cree + h.int(0, 20) * J);
      const nb = h.int(1, 10);
      for (let k = 0; k < nb; k++) c.history.push({ d: jour(cree + k * 3 * J), t: h.un(['Mail envoyé', 'Relance', 'Appel', 'Réponse reçue', 'Entretien']) });
    }
    if (ferme){ c.closedReason = h.un(['won', 'rejected', 'dropped']); c.closedAt = jour(c.updatedAt); }
    else if (status !== 'todo' && h.oui(0.55)){
      c.nextAction = jour(now + h.int(-12, 21) * J);
      c.nextActionText = h.un(['Relancer', 'Appeler', 'Envoyer le CV', 'Préparer l’entretien', 'Faire le point']);
    }
    if (h.oui(0.12)){ c.vecu = h.un(['stage', 'alternance', 'entretien', 'connait']); c.vecuQui = h.un(PRENOMS); }
    companies.push(c);
  }

  /* ---------- moi, et mes amis ---------- */
  const boite = await nouvelleCle();
  const moi = 'MoiMoiMoiMoi' + h.id(10);
  const amis = Array.from({ length: NA }, (_, i) => {
    const nb = h.int(0, 3);
    return { id: 'ami' + String(i).padStart(3, '0') + h.id(14), nom: nomPersonne(), recu: now - h.int(1, 200) * J, cle: cleFactice(),
      parcours: Array.from({ length: nb }, () => {
        const p = h.oui(0.5) ? h.un(companies).name : h.un(RACINES) + h.un(SUFFIXES);
        return { entreprise: p, quoi: h.un(['stage', 'alternance', 'emploi']), debut: '2025-0' + h.int(1, 9) };
      }) };
  });

  /* ---------- mes groupes ---------- */
  const NOMS_GROUPES = ['BTS SIO Lille', 'Promo cyber 2026', 'Club réseau IUT', 'Alternance Nord', 'SISR 2e année'];
  const groupesProfil = [], groupesEtat = {};
  for (let g = 0; g < NG; g++){
    const code = nouveauCode();
    const nbMembres = h.int(30, 45);
    const membres = {};
    const ids = [];
    for (let k = 0; k < nbMembres; k++){
      const a = k < NA ? amis[(g * 37 + k) % NA] : null;
      const id = a ? a.id : 'mb' + g + '_' + k + h.id(14);
      ids.push(id);
      membres[id] = { prenom: a ? a.nom.split(' ')[0] : h.un(PRENOMS), at: now - h.int(0, 6) * J };
    }
    const fil = [];
    const n = motsParGroupe[g] ?? 100;
    for (let k = 0; k < n; k++){
      const at = now - 7 * J + Math.round((k + 1) * (7 * J - H) / n);
      const de = h.un(ids);
      let texte = h.un(MOTS);
      const cite = [];
      if (texte.endsWith('@')){ texte += 'Advens'; }
      if (h.oui(0.03)){ texte = '@Maheydine ' + texte; cite.push(moi); }
      const x = { t: 'mot', id: 'g' + g + 'm' + String(k).padStart(5, '0'), de, prenom: membres[de].prenom, texte, at };
      if (cite.length) x.cite = cite;
      fil.push(x);
    }
    const entree = { code, nom: NOMS_GROUPES[g], at: now - h.int(20, 90) * J };
    /* le premier groupe est « sur demande », et j'en suis le chef : sa
       porte a des gens qui attendent */
    if (g === 0){
      const sign = await nouvelleCleSignature();
      Object.assign(entree, { type: 'demande', porte: 'porte' + h.id(12), chef: sign.pub, sign });
      membres[moi] = { prenom: 'Maheydine', at: now - J, sign: sign.pub, cle: boite.pub };
    }
    groupesProfil.push(entree);
    groupesEtat[code] = { nom: NOMS_GROUPES[g], fil, membres, depuis: now - H, vu: now - h.int(1, 5) * J, presence: now - H };
  }

  /* ---------- mes conversations privées ---------- */
  const fils = {};
  for (let i = 0; i < Math.min(NC, NA); i++){
    const a = amis[i];
    const n = i === 0 ? 300 : i < 5 ? h.int(150, 300) : h.int(2, 60);
    const debut = now - h.int(1, 25) * J;
    const m = Array.from({ length: n }, (_, k) => ({ id: 'c' + i + 'x' + String(k).padStart(4, '0') + h.id(4), moi: h.oui(0.45),
      texte: h.un(PRIVE), at: Math.min(now - M, debut + Math.round(k * (now - debut) / n)) }));
    /* une conversation sur trois a des messages que je n'ai pas lus */
    const vu = i % 3 === 0 ? (m[Math.max(0, n - h.int(1, 8))] || {}).at - 1 : now;
    fils[a.id] = { m, vu };
  }

  /* ---------- la boîte aux lettres ---------- */
  const pisteOuverte = () => h.un(companies.filter(c => !c.closedReason));
  const demandes = [];
  for (let i = 0; i < 28; i++){
    const p = pisteOuverte();
    const at = i < 3 ? now - h.int(1, 6) * J : now - h.int(15, 29) * J;
    const d = { id: 'dm' + String(i).padStart(3, '0') + h.id(10), pisteId: p.id, entreprise: { nom: p.name }, at, exp: at + 14 * J,
      vers: h.int(3, 40), cherche: 'alternance' };
    if (h.oui(0.5)) d.trouve = { at: at + h.int(1, 3) * J, cercle: h.int(1, 3), chaine: [], par: h.un(PRENOMS) };
    demandes.push(d);
  }
  const recues = Array.from({ length: 60 }, (_, i) => {
    const a = amis[i % NA], p = pisteOuverte();
    const statut = i < 35 ? 'a-voir' : i < 45 ? 'donnee' : 'rien';
    const ct = p.contacts[0];
    return { id: 'rc' + String(i).padStart(3, '0') + h.id(10), de: { prenom: a.nom.split(' ')[0], cle: a.cle },
      entreprise: { nom: p.name }, exp: now + h.int(1, 13) * J, at: now - h.int(0, 12) * J, cercle: 1, statut,
      cherche: h.un(['stage', 'alternance', 'emploi']), trouve: statut === 'a-voir' && ct ? [{ pisteId: p.id, ctId: ct.id }] : [] };
  });
  const dons = demandes.filter(d => d.trouve).slice(0, 14).map((d, i) => ({ id: 'dn' + String(i).padStart(3, '0') + h.id(10),
    demande: d.id, de: { prenom: h.un(PRENOMS), cle: cleFactice() }, entreprise: d.entreprise,
    contact: { name: nomPersonne(), role: h.un(ROLES), email: 'contact' + i + '@exemple.test' }, at: d.trouve.at + H,
    statut: i < 8 ? 'nouveau' : 'ajoute' }));
  const mercis = recues.filter(r => r.statut === 'donnee').map((r, i) => ({ id: 'mc' + String(i).padStart(3, '0') + h.id(10),
    demande: r.id, de: r.de, entreprise: r.entreprise, contact: { name: nomPersonne() }, at: r.at + J }));
  const porte = groupesProfil[0] && groupesProfil[0].porte;
  const entrees = porte ? Array.from({ length: 18 }, (_, i) => ({ id: 'en' + String(i).padStart(3, '0') + h.id(10), porte,
    de: { prenom: h.un(PRENOMS), cle: cleFactice() }, ami: 'ent' + i + h.id(16), at: now - h.int(0, 10) * J, statut: 'attente' })) : [];
  const reseau = { v: 1, depuis: now - H, demandes, recues, dons, mercis, lus: [], envois: [], entrees, attentes: [] };

  /* ---------- le reste ---------- */
  const journal = Array.from({ length: 200 }, (_, i) => {
    const t = now - (200 - i) * 6 * H;
    const ids = Array.from({ length: h.int(1, 12) }, () => h.un(companies).id);
    return h.oui(0.5) ? { t, txt: 'Reçu de ' + h.un(PRENOMS) + ' : +' + ids.length + ' piste(s)', ids }
      : h.oui(0.5) ? { t, txt: 'Donné (' + h.un(['QR', 'fichier', 'groupe']) + ') : ' + ids.length + ' piste(s)', ids }
      : { t, txt: h.un(['Fiche modifiée', 'Mail envoyé', 'Piste ajoutée', 'Copie téléchargée']) };
  });
  const orphans = Array.from({ length: 40 }, (_, i) => ({ id: 'or' + i, name: nomPersonne(), role: h.un(ROLES),
    email: 'orphelin' + i + '@exemple.test', extra: { company: h.un(RACINES) } }));
  const brouillons = { v: 1, b: Object.fromEntries(companies.filter(c => c.status === 'todo').slice(0, 30)
    .map(c => [c.id, { objet: 'Candidature alternance — ' + c.name, corps: 'Bonjour,\n\nJe vous écris…', at: now - h.int(0, 20) * J, statut: c.status }])) };

  const profil = { name: 'Maheydine Test', email: 'moi@prive.test', formation: 'BTS SIO SISR', ecole: 'Lycée Baggio',
    recherche: 'alternance', ville: 'Lille', rayon: 15, amiId: moi, boite, amis, groupes: groupesProfil,
    parcours: [{ id: 'pa1', entreprise: 'Advens', quoi: 'stage', debut: '2025-05', fin: '2025-07' }] };

  return { companies, profil, groupes: groupesEtat, messages: { v: 1, fils }, fils: { v: 1, epingles: [], muets: [] },
           reseau, journal, orphans, brouillons,
           compte: { pistes: companies.length, amis: amis.length, groupes: NG,
                     mots: Object.values(groupesEtat).reduce((s, g) => s + g.fil.length, 0),
                     conversations: Object.keys(fils).length,
                     messages: Object.values(fils).reduce((s, f) => s + f.m.length, 0),
                     demandes: demandes.length, recues: recues.length, dons: dons.length, entrees: entrees.length } };
}

/* écrit le jeu dans le stockage de la page, puis recharge : semer sans
   recharger mesure l'état d'avant (CLAUDE.md §5) */
export async function semerMassif(page, jeu){
  await page.evaluate(async j => {
    const st = await import('./engine/storage.js'); await st.kvInit();
    await st.kvSet(st.DATA_KEY, JSON.stringify(j.companies));
    await st.kvSet(st.PROFILE_KEY, JSON.stringify(j.profil));
    await st.kvSet(st.GROUPES_KEY, JSON.stringify(j.groupes));
    await st.kvSet(st.MESSAGES_KEY, JSON.stringify(j.messages));
    await st.kvSet(st.FILS_KEY, JSON.stringify(j.fils));
    await st.kvSet(st.RESEAU_KEY, JSON.stringify(j.reseau));
    await st.kvSet(st.JOURNAL_KEY, JSON.stringify(j.journal));
    await st.kvSet(st.ORPHANS_KEY, JSON.stringify(j.orphans));
    await st.kvSet(st.BROUILLONS_KEY, JSON.stringify(j.brouillons));
  }, jeu);
  await page.reload();
}
