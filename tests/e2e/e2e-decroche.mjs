/* E2E : UN GESTE QUI DÉCROCHE NE PART PAS AU BORD.

   Ce fichier garde une faute de construction, pas un écran : dans un
   conteneur `flex` qui se REPLIE, un enfant en `margin-left:auto` ne
   reste pas « à droite de son voisin » — il passe sur un rang à lui et
   file au bord droit, avec tout le vide de la rangée à sa gauche.

   CE QUI S'ÉTAIT PASSÉ. Le mainteneur a signalé que « la case
   itinéraire est très mal faite ». Mesuré aux quatre largeurs
   servies : le bouton décrochait à CHACUNE, avec 184 à 294 px de vide
   à sa gauche. En cherchant si la faute vivait ailleurs, deux autres
   instances du même motif sont sorties — le bandeau « Clôturée » de la
   fiche (à 125 % et à 200 %) et la ligne d'identité une fois repliée.
   Aucune n'était visible à la relecture du CSS : les trois règles
   avaient l'air correctes séparément, c'est leur COMBINAISON avec le
   repli qui produit le défaut.

   LE CRITÈRE, ET POURQUOI IL NE SUR-ACCUSE PAS. Un élément calé à
   droite n'a rien de fautif tant qu'il PARTAGE son rang : c'est même
   le motif normal d'une barre d'outils. Le défaut est la conjonction
   de trois choses — le conteneur s'est replié (plus d'un rang),
   l'élément est SEUL sur le sien, et il est collé au bord droit avec
   du vide derrière lui. Les trois ensemble, rien de moins.

   Ce critère a coûté une leçon. Sa première version groupait les rangs
   par `top` ; or deux enfants d'un même rang n'ont pas le même `top`
   dès que le conteneur les centre verticalement. Elle rendait 24
   signalements dont 23 faux — assez pour qu'un rapport pareil ne soit
   jamais corrigé, la faute que ce dépôt a déjà payée avec la sonde des
   relais puis celle du focus. Les rangs se déduisent donc du
   CHEVAUCHEMENT vertical, et le relevé est tombé à la seule instance
   réelle.

   ET UN TROU QUI A FAILLI TOUT ANNULER. La première version ne
   regardait que `par.children` : un nœud de texte NU posé dans un
   conteneur flex devient un enfant anonyme, il occupe un rang, et
   `children` ne le voit pas. La rangée « adresse + bouton » — le
   défaut d'origine EXACT, celui qui a fait écrire ce fichier — n'avait
   donc qu'un seul « enfant » aux yeux de la sonde, et la mutation qui
   la replantait est passée au VERT. C'est la leçon générale de ce
   dépôt sous une forme de plus : un contrôle ne prouve rien tant qu'on
   n'a pas replanté le défaut d'ORIGINE, dans sa forme d'origine — une
   mutation ressemblante ne suffit pas, celle-ci l'était et ne prenait
   pas le même chemin.

   DEUX SONDES, dans les deux sens. Un balayage qui ne trouve rien se
   lit comme une réussite, et c'est le pire des faux verts : la
   première plante le défaut et vérifie qu'il ressort. Mais une garde
   trop large ne casse rien non plus — elle rend zéro : la seconde
   plante un élément calé à droite qui PARTAGE son rang, et vérifie
   qu'il est laissé tranquille. */
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
  ['fiche clôturée', './ui/fiche.js', 'openFiche', 'pisteClose'],
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

/* AUCUNE EXEMPTION, et c'est le but : le critère est si étroit qu'une
   construction saine le passe sans avoir à se déclarer. Le jour où une
   exemption devient nécessaire, elle se nomme ici avec sa raison —
   jamais une classe « partout », jamais un écran en entier. */
const EXEMPTES = [];

const SONDE = (exemptes) => {
  const out = [];
  const SEL = 'button,a[href],[role="button"],[tabindex="0"],input,select,textarea,summary';
  const vis = n => { const r = n.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && getComputedStyle(n).visibility !== 'hidden'; };
  document.querySelectorAll('*').forEach(par => {
    const cs = getComputedStyle(par);
    if (!/flex/.test(cs.display) || cs.flexWrap !== 'wrap') return;
    /* UN TEXTE NU EST UN ENFANT DE RANG, MÊME S'IL N'EST PAS DANS
       `children`. Un nœud de texte posé directement dans un conteneur
       flex devient un enfant ANONYME : il occupe un rang, il en pousse
       d'autres, et `par.children` ne le voit pas. Une première version
       s'arrêtait donc à « moins de deux enfants » sur une rangée
       « adresse + bouton » — le défaut d'origine EXACT — et la
       mutation qui le replantait est passée au VERT. Chaque rectangle
       d'un texte nu compte pour lui-même : un texte qui se replie en
       occupe autant que de lignes. */
    const kids = [...par.children].filter(vis).map(n => ({ n, r: n.getBoundingClientRect() }));
    [...par.childNodes].forEach(t => {
      if (t.nodeType !== 3 || !t.textContent.trim()) return;
      const rg = document.createRange(); rg.selectNodeContents(t);
      [...rg.getClientRects()].forEach(r => { if (r.width > 1) kids.push({ n: null, r }); });
    });
    if (kids.length < 2) return;
    /* UN RANG SE DÉDUIT DU CHEVAUCHEMENT, PAS DU `top`. Sous
       `align-items:center`, deux enfants du même rang ont des `top`
       différents — c'est ce qui faisait rendre 23 faux signalements. */
    const rangs = [];
    kids.forEach(k => { const r = k.r;
      let L = rangs.find(l => r.top < l.bas - 2 && r.bottom > l.haut + 2);
      if (!L){ L = { haut: r.top, bas: r.bottom, items: [] }; rangs.push(L); }
      L.haut = Math.min(L.haut, r.top); L.bas = Math.max(L.bas, r.bottom);
      L.items.push(k); });
    if (rangs.length < 2) return;              /* pas replié : rien à dire */
    const pr = par.getBoundingClientRect();
    const gauche = pr.left + (parseFloat(cs.paddingLeft) || 0);
    const droite = pr.right - (parseFloat(cs.paddingRight) || 0);
    rangs.forEach(L => {
      if (L.items.length !== 1) return;        /* partage son rang : normal */
      const { n, r } = L.items[0];
      if (!n) return;                          /* un texte nu n'est pas un geste */
      const vide = r.left - gauche;
      if (vide < 40) return;                   /* calé à gauche : normal */
      if (r.right < droite - 4) return;        /* ni à gauche ni au bord : centré, autre sujet */
      /* UN AMAS DE GESTES N'EST PAS UN GESTE ORPHELIN, et c'est une
         CONSTRUCTION, pas une exception nommée. Quand ce qui descend
         porte lui-même plusieurs contrôles, c'est une barre d'outils :
         la caler à droite sous son contenu est le motif normal, et §5
         l'a même mesuré et arrêté pour « Aujourd'hui » (le nom prend
         toute la largeur, les gestes passent dessous). Ce que ce
         fichier garde est le cas inverse — UN contrôle seul, jeté au
         bord, avec le vide de la rangée à sa gauche. */
      const gestes = n.matches(SEL) ? 0 : n.querySelectorAll(SEL).length;
      if (gestes >= 2) return;
      const cls = [...n.classList].sort().join('.');
      const parCls = [...par.classList].sort().join('.');
      if (exemptes.some(e => parCls.includes(e.par) && cls.split('.').includes(e.cls))) return;
      out.push({ sig: n.tagName + (cls ? '.' + cls : ''), par: par.tagName + (parCls ? '.' + parCls : ''),
        vide: Math.round(vide), txt: n.textContent.trim().replace(/\s+/g, ' ').slice(0, 28) });
    });
  });
  return out;
};

const semer = p => p.evaluate(async () => {
  const st = await import('./engine/storage.js'); await st.kvInit();
  const J = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  await st.kvSet(st.DATA_KEY, JSON.stringify([
    { id: 'cbal', name: 'Capgemini', city: 'Lille', status: 'contacted', domain: 'esn',
      nextAction: J(-2), nextActionText: 'Relancer', notes: 'Note. '.repeat(6),
      techs: 'Azure, Python', address: '12 rue du Rempart Saint-Étienne, 31000 Toulouse',
      updatedAt: 9,
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
      updatedAt: 4, contacts: [] },
    /* DEUX ÉTATS QUE LE BALAYAGE N'OUVRAIT PAS, ET QUI PORTAIENT TOUS
       DEUX LE DÉFAUT (§5 : un contrôle ne garde que les états qu'il met
       en place). Une piste CLÔTURÉE, pour son bandeau « Rouvrir » ; une
       ADRESSE, pour la ligne « Itinéraire » d'« À savoir ». Sans elles
       le fichier serait resté vert sur les deux instances qui l'ont
       fait écrire. */
    { id: 'p7', name: 'Groupement Interprofessionnel des Systèmes', city: 'Saint-Étienne',
      status: 'todo', domain: 'esn', closedReason: 'rejected', closedAt: Date.now() - 3 * 864e5,
      updatedAt: 3, contacts: [] }
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

let vusRepliés = 0, prisDefaut = false, laisseSain = false;

/* 320 px À 125 % ET À 200 % SONT DANS LA LISTE POUR UNE RAISON MESURÉE :
   le bandeau « Clôturée » ne décrochait à AUCUNE autre taille. §5 le dit
   déjà pour les cibles — on mesure aussi la bande intermédiaire, pas
   seulement les deux extrêmes — et ici c'est le texte agrandi sur le
   plus petit écran qui révèle le défaut. */
for (const [W, ergo, Z] of [[320, 'pouce', 1], [320, 'pouce', 1.25], [320, 'pouce', 2],
                            [360, 'pouce', 1], [390, 'pouce', 1], [390, 'pouce', 1.25],
                            [1280, 'poste', 1], [1280, 'poste', 1.25]]){
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
      if (quoi === 'pisteClose'){ m[fn](S.companies.find(x => x.closedReason), {}); return; }
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
    /* « À savoir » est replié au pouce : sans ce dépli, la ligne
       d'adresse — celle qui a fait écrire ce fichier — n'existe pas. */
    await p.evaluate(() => document.querySelectorAll('.overlay details, .view details')
      .forEach(d => { d.open = true; }));
    await p.waitForTimeout(150);
    const r = await p.evaluate(SONDE, EXEMPTES);
    vusRepliés += await p.evaluate(() => {
      let n = 0;
      document.querySelectorAll('*').forEach(e => {
        const c = getComputedStyle(e);
        if (!/flex/.test(c.display) || c.flexWrap !== 'wrap') return;
        const k = [...e.children].filter(x => x.getBoundingClientRect().width > 1);
        if (k.length < 2) return;
        const tops = new Set(k.map(x => Math.round(x.getBoundingClientRect().top / 4)));
        if (tops.size > 1) n++;
      });
      return n;
    });
    for (const x of r)
      fail(`décrochage ${ergo} ${W}px@${Z * 100}% · ${nom} · ${x.sig} dans ${x.par} — `
        + `seul sur son rang et collé au bord droit, ${x.vide} px de vide à sa gauche `
        + `(« ${x.txt} »). Une rangée qui se replie rend son geste au bord GAUCHE, `
        + `taillé à son mot : \`margin-left:auto\` n'a de sens que tant qu'on partage le rang`);
  }

  /* ---- LES DEUX SONDES, DANS LES DEUX SENS ----
     Elles ne s'exécutent qu'une fois. Ce qu'elles prouvent est que
     l'INSTRUMENT voit juste — pas que l'écran est bon. La seconde est
     celle qui manquait à la première version de ce fichier : une garde
     trop large ne casse rien, elle rend zéro, et zéro se lit comme une
     réussite. */
  if (!prisDefaut){
    prisDefaut = await p.evaluate(sonde => {
      const box = document.createElement('div');
      box.className = 'sndWrap';
      box.style.cssText = 'position:fixed;left:0;top:0;width:300px;display:flex;flex-wrap:wrap;'
        + 'gap:8px;background:#fff;z-index:9999';
      box.innerHTML = '<span class="sndTxt" style="flex:none;width:280px">une phrase qui prend tout le rang</span>'
        + '<button class="sndBtn" style="margin-left:auto">Geste</button>';
      document.body.append(box);
      const r = (0, eval)('(' + sonde + ')')([]);
      const pris = r.some(x => x.sig.includes('sndBtn'));
      box.remove();
      return pris;
    }, SONDE.toString()).catch(e => { console.error('sonde :', String(e).slice(0, 100)); return false; });
  }
  if (!laisseSain){
    laisseSain = await p.evaluate(sonde => {
      /* LE CAS SAIN : un geste calé à droite qui PARTAGE son rang, dans
         un conteneur par ailleurs replié. Il ne doit JAMAIS ressortir —
         c'est le motif normal d'une barre d'outils. */
      const box = document.createElement('div');
      box.className = 'sndOk';
      box.style.cssText = 'position:fixed;left:0;top:0;width:300px;display:flex;flex-wrap:wrap;'
        + 'align-items:center;gap:8px;background:#fff;z-index:9999';
      box.innerHTML = '<span class="okA" style="flex:none;width:120px">court</span>'
        + '<button class="okB" style="margin-left:auto;height:40px">Geste</button>'
        + '<span class="okC" style="flex:none;width:280px">le rang suivant, en entier</span>';
      document.body.append(box);
      const r = (0, eval)('(' + sonde + ')')([]);
      const propre = !r.some(x => x.par.includes('sndOk'));
      box.remove();
      return propre;
    }, SONDE.toString()).catch(e => { console.error('sonde :', String(e).slice(0, 100)); return false; });
  }
  await ctx.close();
}

if (!prisDefaut)
  fail('décrochage : la sonde « geste au bord droit » n’a pas été vue — le balayage ne mesure plus rien');
if (!laisseSain)
  fail('décrochage : la sonde « geste sain » a été accusée — le critère s’est élargi et ne garde plus rien');
if (vusRepliés < 20)
  fail(`décrochage : ${vusRepliés} rangées repliées rencontrées seulement — le balayage ne voit plus l’app`);
if (!process.exitCode)
  console.log(`décrochage : ${vusRepliés} rangées repliées sur ${SURFACES.length} surfaces × 8 tailles, `
    + 'aucun geste ne part seul au bord droit ✓');

console.log(errors.length ? 'Erreurs console : ' + errors.slice(0, 3).join(' | ') : 'Zéro erreur console.');
if (errors.length) process.exitCode = 1;
await browser.close();
server.close();
console.log(process.exitCode ? 'E2E décrochage : ÉCHEC' : 'E2E décrochage : OK');
