/* E2E : DANS UNE LISTE, UNE VALEUR A UN BORD — ou elle ne se balaie pas.

   Ce fichier est la généralisation d'un défaut signalé sur photo par le
   mainteneur, corrigé une première fois de façon incomplète, puis
   corrigé au fond. Il ne garde pas UNE liste : il balaie toutes celles
   que l'app sait afficher, parce que le défaut n'avait rien de
   particulier au fil des échanges.

   CE QUI S'ÉTAIT PASSÉ. Dans « Échanger », le compte (« 24 pistes »)
   vivait dans la même phrase que le canal. Sa position dépendait donc
   de la longueur du canal : mesuré sur un vrai fil, QUATRE abscisses
   pour le compte et TROIS pour la date. NN/g (*The Anatomy of a List
   Entry*) demande l'inverse — chaque information à la même place d'une
   ligne à l'autre — parce qu'une liste se BALAIE : l'œil descend une
   colonne et compare des entrées entre elles. Une valeur qui se déplace
   d'une ligne à l'autre oblige à LIRE chaque ligne.

   LE CRITÈRE, ET POURQUOI CELUI-LÀ. On ne peut pas exiger « tout est
   aligné » : une sous-ligne qui s'élide a un bord droit qui varie, et
   c'est normal. Ce qui distingue une colonne d'une valeur qui flotte,
   c'est qu'elle a UN BORD STABLE — le gauche si elle est calée à
   gauche, le droit si elle est calée à droite. Une valeur dont les DEUX
   bords bougent n'est ancrée à rien : elle ne se balaie dans aucun
   sens. C'est exactement ce que faisait le compte du fil, et c'est un
   critère qu'une liste saine passe sans qu'on ait rien à lui déclarer.

   LE SECOND CONTRÔLE vient d'un défaut que ce fichier n'aurait PAS vu,
   et il faut le dire : en passant le fil en `subgrid`, l'enveloppe des
   rangées s'est mise à gonfler (256 px au lieu de 44) pendant que le
   contrôle, lui, restait à 44. Les deux gardes du fil mesuraient le
   CONTRÔLE ; c'est une capture d'écran qui a vu la liste six fois trop
   haute. On mesure donc aussi l'écart entre une rangée et ce qu'elle
   contient : une enveloppe beaucoup plus haute que son contenu est de
   la place que personne n'a demandée.

   DEUX SONDES, parce qu'un balayage qui ne trouve rien se lit comme une
   réussite et que c'est le pire des faux verts. Chacune plante le
   défaut qu'elle garde et vérifie qu'il ressort. */
import { chromium, chromiumPath, serveRepo } from './outils.mjs';

const { server, base } = await serveRepo();
const browser = await chromium.launch({ executablePath: chromiumPath() });
const fail = m => { console.error('ÉCHEC :', m); process.exitCode = 1; };
const errors = [];

/* LES SURFACES, ET POURQUOI CELLES-LÀ. §5 : « un contrôle ne garde que
   les ÉTATS qu'il met en place ». La première version en ouvrait 13 et
   laissait dehors des feuilles LIVRÉES et visibles — dont le partage en
   groupe, qui est pourtant la TROISIÈME des listes à cocher que §6
   nomme d'un seul souffle avec Donner et Prospecter. Une garde qui
   couvre deux sœurs sur trois ne garde pas le motif, elle garde deux
   écrans.
   Ce qui reste dehors est dehors pour une raison : les campagnes,
   l'ordinateur et l'analyse des mails sont masqués par `ui/perimetre.js`
   (§0), donc les ouvrir mesurerait un écran que personne ne voit. */
const SURFACES = [
  ['Aujourd’hui', 'route', 'aujourdhui', 'rien'], ['Mes pistes', 'route', 'pistes', 'rien'],
  ['Échanger', 'route', 'echanger', 'rien'], ['Moi', 'route', 'moi', 'rien'],
  ['fiche', './ui/fiche.js', 'openFiche', 'piste'],
  ['modifier', './ui/edit.js', 'openEditPiste', 'piste'],
  ['écrire', './ui/mail.js', 'openMail', 'piste'],
  ['contact', './ui/contact.js', 'openContactEditor', 'rien'],
  ['capture', './ui/capture.js', 'openCapture', 'rien'],
  ['rattacher', './ui/contact.js', 'openAttach', 'orphelin'],
  ['affiner', './ui/affiner.js', 'openAffinerSheet', 'affiner'],
  ['→ qui', './ui/qui.js', 'openWhoPicker', 'qui'],
  ['donner', './ui/donner.js', 'openDonner', 'rien'],
  ['prospecter', './ui/prospect.js', 'openProspect', 'rien'],
  ['partage en groupe', './ui/direct.js', 'openPromo', 'rien'],
  ['recevoir', './ui/recevoir.js', 'openRecevoir', 'rien'],
  ['verrouillage', './ui/verrou.js', 'openProtectFlow', 'rien'],
  ['profil', './ui/profil.js', 'openProfil', 'rien'],
  ['modèles', './ui/profil.js', 'openTemplates', 'rien']
];

/* UNE SEULE EXEMPTION, ET ELLE EST ASSUMÉE, PAS OUVERTE.
   §5 demande qu'une exception soit NOMMABLE : celle-ci nomme sa liste,
   ses deux classes et sa raison, et rien d'autre au monde n'y échappe.

   Le fil ne peut pas tenir ses deux colonnes de données sous 390 px, et
   c'est de l'ARITHMÉTIQUE. Réserver une vraie colonne au compte demande
   6,25 rem — mesuré, parce que le vocabulaire de cette colonne va de
   « 7 pistes » à « 1480 complétées », et que même « rien de neuf »
   dépasse l'ancien plancher. Avec elle, cinq colonnes plus le plancher
   de 6 rem du nom (§4 : une identité plie, elle ne s'ampute jamais)
   demandent plus que les 292 à 332 px d'un petit téléphone, et c'est le
   CHEVRON qui part sur un second étage, seul, sous chaque rangée.
   Balayé de 5,75 à 6,5 rem de colonne, de 4,2 à 4,8 rem de date et de
   5 à 8 px de gouttière : aucune combinaison ne le sauve sous 390 px,
   ni à 125 %.

   Une colonne fixe a donc été écrite, mesurée, puis RETIRÉE — elle
   troquait une dérive rare contre un chevron orphelin sur chaque
   rangée, ce qui est pire. Et le mécanisme qui, lui, réglait tout
   (`subgrid`) a cassé l'app sur le téléphone du mainteneur : il
   n'était vérifié que sur Chromium, seul moteur installé ici.

   Ce qui a réglé le défaut d'origine — le compte à quatre abscisses
   photographié — c'est `canalCourt`, en amont : le canal dit « groupe »
   et non « partage en groupe », donc il ne pousse plus rien.

   LA QUESTION QUI RESTE EST DE TEXTE, PAS DE CSS, et elle appartient au
   mainteneur : ce compte a-t-il besoin de répéter « pistes » à chaque
   rangée (§6, règle 1 — l'encre va à ce qui change, et un mot répété
   huit fois est du papier peint) ? Raccourci, tout rentre, et
   l'exemption disparaît. */
const EXEMPTES = [
  { liste: 'ec-l', cls: 'ec-n',
    pourquoi: 'le vocabulaire du compte va de 8 à 15 caractères ; lui réserver sa colonne '
      + 'chasse le chevron sur un second étage sous 390 px' },
  { liste: 'ec-l', cls: 'ec-when',
    pourquoi: 'même cause : la date ne bouge que sur la rangée que le compte a fait replier' }
];

const SONDE = (exemptes) => {
  const out = [];
  const sig = n => n.tagName + '.' + [...n.classList].sort().join('.');
  const vis = n => { const r = n.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && getComputedStyle(n).visibility !== 'hidden'; };
  const listes = [];
  document.querySelectorAll('*').forEach(par => {
    const kids = [...par.children].filter(vis);
    if (kids.length < 3) return;
    const groupes = {};
    kids.forEach(k => { (groupes[sig(k)] ||= []).push(k); });
    for (const [s, g] of Object.entries(groupes)){
      if (g.length < 3 || s === 'DIV.') continue;
      /* UNE LISTE EST UN EMPILEMENT. Sans ce filtre, tout groupe
         HORIZONTAL — la barre d'onglets, les colonnes du tableau —
         ressort : leurs bords diffèrent par construction, c'est leur
         raison d'être. Une liste vraie : chaque rangée sous la
         précédente, toutes du même bord gauche et de la même largeur. */
      const b = g.map(n => n.getBoundingClientRect());
      const empile = b.every((r, i) => i === 0 || r.top >= b[i - 1].bottom - 2);
      const memeBoite = new Set(b.map(r => Math.round(r.left) + 'x' + Math.round(r.width))).size === 1;
      if (empile && memeBoite) listes.push({ sig: s, rows: g });
    }
  });
  for (const L of listes){

    /* ① LES VALEURS ONT-ELLES UN BORD ? */
    const parClasse = {};
    L.rows.forEach((r, i) => {
      r.querySelectorAll('*').forEach(n => {
        if (!vis(n)) return;
        /* seulement ce qui porte son PROPRE texte : un conteneur hérite
           des bords de ses enfants et rapporterait deux fois la même
           chose */
        if (![...n.childNodes].some(c => c.nodeType === 3 && c.textContent.trim())) return;
        const cls = [...n.classList].sort().join('.');
        if (!cls) return;                      /* nommable seulement (§5) */
        const b = n.getBoundingClientRect();
        (parClasse[cls] ||= []).push({ i, l: Math.round(b.left), r: Math.round(b.right),
          t: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 24) });
      });
    });
    for (const [cls, vals] of Object.entries(parClasse)){
      if (new Set(vals.map(v => v.i)).size < 3) continue;
      /* UNE COLONNE, C'EST UNE CELLULE PAR RANGÉE. Quand une classe
         paraît DEUX fois dans la même rangée, ce n'est pas une colonne
         qui dérive : c'est une grappe ou une grille, et elle a autant
         d'abscisses que de colonnes, par construction. Sans ce filtre le
         balayage accusait `.fl-chip` d'« Affiner » sur six tailles — or
         `.fl-grid` est une grille à DEUX colonnes parfaitement tenues
         (x=19 et x=184, toutes larges de 158), empilée trois fois.
         C'est la faute que ce dépôt a déjà payée deux fois (la sonde des
         relais, puis celle du focus) : sur-accuser rend un rapport que
         personne ne corrige. Le critère ne se relâche pas pour autant —
         une vraie colonne reste vérifiée à l'unité près. */
      const parRang = {};
      vals.forEach(v => { parRang[v.i] = (parRang[v.i] || 0) + 1; });
      if (Object.values(parRang).some(n => n > 1)) continue;
      const G = new Set(vals.map(v => v.l)), D = new Set(vals.map(v => v.r));
      /* l'exemption vise UNE classe DANS UNE liste — jamais une classe
         partout, jamais une liste en entier */
      if (exemptes.some(e => L.sig.includes(e.liste) && cls.split('.').includes(e.cls))) continue;
      if (G.size > 1 && D.size > 1)
        out.push({ type: 'bord', liste: L.sig, cls, n: new Set(vals.map(v => v.i)).size,
          g: [...G].slice(0, 4), d: [...D].slice(0, 4), ex: vals.slice(0, 3).map(v => v.t) });
    }
    /* ② L'ENVELOPPE EST-ELLE PLUS HAUTE QUE CE QU'ELLE CONTIENT ? */
    for (const r of L.rows){
      const rb = r.getBoundingClientRect();
      const kids = [...r.querySelectorAll('*')].filter(vis)
        .map(n => n.getBoundingClientRect()).filter(b => b.height > 0);
      if (!kids.length) continue;
      const haut = Math.min(...kids.map(b => b.top)), bas = Math.max(...kids.map(b => b.bottom));
      const contenu = bas - haut;
      if (rb.height > contenu + 48 && rb.height > contenu * 1.8){
        out.push({ type: 'vide', liste: L.sig, cls: '(rangée)', n: L.rows.length,
          h: Math.round(rb.height), c: Math.round(contenu),
          ex: [r.textContent.replace(/\s+/g, ' ').trim().slice(0, 34)] });
        break;                                  /* une par liste suffit */
      }
    }
  }
  return out;
};

const semer = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js'); await st.kvInit();
  const J = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  await st.kvSet(st.DATA_KEY, JSON.stringify([
    { id: 'cbal', name: 'Capgemini', city: 'Lille', status: 'contacted', domain: 'esn',
      nextAction: J(-2), nextActionText: 'Relancer', notes: 'Note. '.repeat(6),
      techs: 'Azure, Python', updatedAt: 9,
      contacts: [{ id: 'c1', name: 'Nadia Bensaïd', role: 'RH', email: 'n@ex.fr' }] },
    { id: 'p2', name: 'Société Générale Global Solution Centre', city: 'Saint-Étienne-du-Rouvray',
      status: 'todo', domain: 'banque / assurance et services financiers', updatedAt: 8, contacts: [] },
    { id: 'p3', name: 'OVH', city: 'Roubaix', status: 'reply', domain: 'cloud',
      nextAction: J(1), nextActionText: 'Envoyer le CV', updatedAt: 7,
      contacts: [{ id: 'c3', name: 'Léa', role: 'CTO', email: 'l@o.fr' }] },
    { id: 'p4', name: 'Thales', city: 'Toulouse', status: 'todo', domain: 'défense',
      updatedAt: 6, contacts: [] },
    { id: 'p5', name: 'Atos', city: 'Bezons', status: 'contacted', domain: 'esn',
      nextAction: J(-9), nextActionText: 'Relancer', updatedAt: 5, contacts: [] },
    { id: 'p6', name: 'Orange Cyberdefense', city: 'Lyon', status: 'reply', domain: 'cyber',
      updatedAt: 4, contacts: [] }
  ]));
  /* un contact « à rattacher », sans quoi la feuille du bac ne s'ouvre
     sur rien et le balayage croirait l'avoir mesurée */
  await st.kvSet(st.ORPHANS_KEY, JSON.stringify([
    { id: 'o1', name: 'Nadia Bensaïd', email: 'recrutement@exemple.fr' },
    { id: 'o2', name: 'Marie-Charlotte Vandenberghe', email: 'mc@exemple.fr' }
  ]));
  const j = Date.now();
  /* LE CONTENU LE PLUS LARGE QUE L'APP SACHE PRODUIRE, pas le plus
     commode : « rien de neuf » et « 148 complétées » partagent la
     colonne du compte avec « 7 pistes », et c'est cet écart qui faisait
     dériver la colonne. Un jeu d'essai poli ne mesure rien. */
  await st.kvSet(st.JOURNAL_KEY, JSON.stringify([
    { t: j - 1 * 864e5, txt: 'Donné (QR) : 24 piste(s)', ids: ['cbal'] },
    { t: j - 2 * 864e5, txt: 'Reçu de Léa : +0 piste(s), 0 complétée(s)', ids: ['p2'] },
    /* QUATRE CHIFFRES, et ce n'est pas une coquetterie. Tout l'intérêt
       des colonnes partagées est qu'un compte plus large élargisse la
       COLONNE pour tout le monde au lieu de décaler sa seule rangée.
       Tant que la graine plafonnait à trois chiffres, cette promesse
       n'était prouvée par rien — et c'est exactement l'erreur qui avait
       laissé passer le premier remède, calé sur « 24 pistes » devant un
       « 148 complétées » qu'il n'avait jamais vu. */
    { t: j - 3 * 864e5, txt: 'Reçu de Marie-Charlotte : +0 piste(s), 1480 complétée(s)', ids: ['p3'] },
    { t: j - 4 * 864e5, txt: 'Donné (fichier chiffré) : 1000 piste(s)', ids: ['p4'] },
    { t: j - 5 * 864e5, txt: 'Donné (partage en groupe) : 7 piste(s)', ids: ['p5'] },
    { t: j - 6 * 864e5, txt: 'Fait : Relancer Léa — Capgemini' }
  ]));
});

let vuesListes = 0, prisBord = false, prisVide = false;

for (const [W, ergo, Z] of [[320, 'pouce', 1], [360, 'pouce', 1], [390, 'pouce', 1],
                            [390, 'pouce', 1.25], [1280, 'poste', 1], [1280, 'poste', 1.25]]){
  const ctx = await browser.newContext({ viewport: { width: W, height: 860 },
    hasTouch: W < 901, isMobile: W < 901 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  await p.goto(base, { waitUntil: 'load' });
  await semer(p);
  await p.reload({ waitUntil: 'load' });
  if (Z !== 1) await p.addStyleTag({ content: `html{font-size:${16 * Z}px}` });
  await p.waitForSelector('#view-aujourdhui:not([hidden])');

  for (const [nom, mod, fn, quoi] of SURFACES){
    await p.evaluate(async () => { const { topSheet } = await import('./ui/dom.js');
      let s, n = 0; while ((s = topSheet()) && n++ < 5){ s.close(null, true);
        await new Promise(r => setTimeout(r, 110)); } });
    await p.evaluate(async ([mod, fn, quoi]) => {
      if (mod === 'route'){ location.hash = '#/' + fn; return; }
      const { S } = await import('./ui/state.js');
      const m = await import(mod);
      const c = S.companies.find(x => x.id === 'cbal');
      /* LES ARGUMENTS SONT COPIÉS SUR LES VRAIS APPELS, pas devinés :
         une feuille ouverte avec un objet de fantaisie mesure un écran
         qui n'existe pas. Chacun vient du site d'appel de l'app. */
      if (quoi === 'piste'){ m[fn](c, {}); return; }
      if (quoi === 'orphelin'){
        const st = await import('./engine/storage.js');
        const o = JSON.parse((await st.kvGet(st.ORPHANS_KEY)) || '[]')[0];
        m[fn](o); return;
      }
      if (quoi === 'affiner'){
        const a = await import('./ui/affiner.js');
        const so = await import('./ui/sort.js');
        m[fn](a.filterState(), so.sortState('recent'),
          { withStatus: true, pool: () => S.companies }, () => {});
        return;
      }
      if (quoi === 'qui'){
        m[fn](c, new Set((c.contacts || []).map(x => x.id)), { verbe: 'donner' });
        return;
      }
      m[fn](null);
    }, [mod, fn, quoi]).catch(() => {});
    await p.waitForTimeout(430);
    const r = await p.evaluate(SONDE, EXEMPTES);
    vuesListes += await p.evaluate(() => document.querySelectorAll('.pk,.row-item,.ec-l,.pick').length);
    for (const x of r){
      if (x.type === 'bord')
        fail(`colonnes ${ergo} ${W}px@${Z * 100}% · ${nom} · « .${x.cls} » flotte sur ${x.n} rangs — `
          + `bords gauches ${x.g.join('/')} et droits ${x.d.join('/')} : aucun n’est stable, `
          + `la valeur ne se balaie dans aucun sens (« ${x.ex.join(' | ')} »)`);
      else
        fail(`colonnes ${ergo} ${W}px@${Z * 100}% · ${nom} · une rangée de ${x.liste} fait ${x.h} px `
          + `pour ${x.c} px de contenu — l’enveloppe gonfle sans que rien ne le demande `
          + `(« ${x.ex[0]} »)`);
    }
  }

  /* ---- LES DEUX SONDES ----
     Elles ne s'exécutent qu'une fois, sur la première ergonomie : ce
     qu'elles prouvent est que l'INSTRUMENT voit, pas que l'écran est
     bon. On les plante dans une liste fabriquée, jamais dans l'app. */
  if (!prisBord){
    const vu = await p.evaluate(sonde => {
      const box = document.createElement('div');
      box.id = 'sondeCol';
      box.style.cssText = 'position:fixed;left:0;top:0;width:300px;background:#fff;z-index:9999';
      box.innerHTML = [['court', 'A'], ['un peu plus long', 'BB'], ['nettement plus long encore', 'CCC']]
        .map(([a, b]) => `<div class="sndRow" style="display:flex;gap:6px;padding:4px">`
          + `<span class="sndNom">${a}</span><span class="sndVal">${b}</span></div>`).join('');
      document.body.append(box);
      const r = (0, eval)('(' + sonde + ')')([]);
      const pris = r.some(x => x.type === 'bord' && x.cls === 'sndVal');
      box.remove();
      return pris;
    }, SONDE.toString()).catch(e => { console.error('sonde :', String(e).slice(0,100)); return false; });
    prisBord = vu;
  }
  if (!prisVide){
    const vu = await p.evaluate(sonde => {
      const box = document.createElement('div');
      box.id = 'sondeVide';
      box.style.cssText = 'position:fixed;left:0;top:0;width:300px;background:#fff;z-index:9999';
      box.innerHTML = [1, 2, 3].map(i =>
        `<div class="sndBig" style="height:240px"><span class="sndTxt">ligne ${i}</span></div>`).join('');
      document.body.append(box);
      const r = (0, eval)('(' + sonde + ')')([]);
      const pris = r.some(x => x.type === 'vide' && x.liste.includes('sndBig'));
      box.remove();
      return pris;
    }, SONDE.toString()).catch(e => { console.error('sonde :', String(e).slice(0,100)); return false; });
    prisVide = vu;
  }
  await ctx.close();
}

if (!prisBord)
  fail('colonnes : la sonde « valeur qui flotte » n’a pas été vue — le balayage ne mesure plus rien');
if (!prisVide)
  fail('colonnes : la sonde « enveloppe qui gonfle » n’a pas été vue — le balayage ne mesure plus rien');
if (vuesListes < 200)
  fail(`colonnes : ${vuesListes} lignes de liste rencontrées seulement — le balayage ne voit plus l’app`);
if (!process.exitCode)
  console.log(`colonnes : ${vuesListes} lignes de liste sur ${SURFACES.length} surfaces × 6 tailles, `
    + 'chaque valeur répétée garde un bord et aucune enveloppe ne gonfle ✓');

console.log(errors.length ? 'Erreurs console : ' + errors.slice(0, 3).join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E colonnes : ÉCHEC' : 'E2E colonnes : OK');
