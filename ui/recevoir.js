/* ============================================================
   OpenContact — interface · Recevoir de la promo
   Scanner un QR (données OU rendez-vous P2P — reconnu tout seul,
   le code se tape aussi sans caméra) / ouvrir un fichier / coller
   → aperçu AVANT (« 12 reçues, dont 4 nouvelles », fusion à blanc
   sur une copie) → fusion réelle sans écrasement → « Annuler »
   ~30 s (instantané restauré tel quel).
   ============================================================ */
import { esc } from '../engine/utils.js';
import { ORDINATEUR } from './perimetre.js';
import { parseInput, makeOCQJoiner, rdvParse, rdvNorm, decodeOCA, extraireOCA } from '../engine/exchange.js';
import { mergeIncoming } from '../engine/merge.js';
import { normalizeCompany } from '../engine/model.js';
import { normalizeAmi } from '../engine/amis.js';
import { S, bus, saveData, logJ } from './state.js';
import { openSheet, toast, btn, ic, showUndo, annoncer } from './dom.js';
import { openRoom, leaveRoom, watchLiaison, deviceSelf, ensureKeys, ouvrirPortage } from './synclive.js';
import { SANS_PAIR_RECEVEUR_MS, PORTAGE_APRES_MS, PORTAGE_RELANCE_MS, PORTAGE_SILENCE_MS } from '../engine/transport.js';
import { recolte, rassembler } from '../engine/portage.js';
import { startScan } from './qr.js';
import { probeOrdinateur, ordinateurCall } from '../engine/ordinateur.js';
import { makeMission, signMission } from '../engine/mission.js';
import { loadOrdinateur } from './ordinateur.js';
import { requireCode } from './verrou.js';
import { mailAnalysis, beginMailAnalysis, markMailAnalysisRunning,
         failMailAnalysis, clearMailAnalysis, reconcileMailAnalysis,
         subscribeMailAnalysis } from './analyse.js';

/* Ce qu'on dit quand la lecture échoue. Chaque phrase dit CE QUI NE VA
   PAS, puis ce qu'on peut faire (NN/g, règles des messages d'erreur ;
   ISO 24495-1, langage clair) — jamais un mot d'ingénieur (« format
   compact », « scellement ») ni une question (« est-ce bien… ? ») qui
   laisse la personne deviner. Le mot de passe faux n'est pas ici : il
   se dit sur son champ. Et un code inconnu ne remonte JAMAIS tel quel —
   c'est ainsi qu'un PDF choisi par erreur affichait une erreur de
   JavaScript en anglais. */
const ERRS = {
  vide: 'Rien à lire — colle le message reçu en entier.',
  format: 'Ce n’est pas un partage OpenContact — vérifie le fichier ou le texte reçu.',
  troplourd: 'Trop lourd pour être ouvert (plus de 4 Mo).',
  tropdepistes: 'Plus de 2 000 pistes d’un coup : trop pour être ouvert.',
  altéré: 'Ce fichier a été modifié après l’envoi — demande-le à nouveau.',
  noqr: 'Ce navigateur est trop ancien pour ce contenu — passe par le fichier.'
};
export const messageLecture = code => ERRS[code] || 'Impossible de lire ce contenu.';

/* `o.scanner` : ouvrir directement sur la caméra — c'est la porte de
   « Amis » (Scanner). Le scanner est le MÊME : il reconnaît tout seul un
   QR de pistes, un rendez-vous ou un profil. `o.apres` : ce que l'écran
   d'en dessous doit redessiner quand un ami arrive. */
export function openRecevoir(o = {}){
  let stopScan = null;
  let room = null;         /* salle de rendez-vous (QR OCR1 / code tapé) */
  let rdvWatch = null;     /* honnêteté de la liaison du rendez-vous */
  let gen = 0;
  const halt = () => { if (stopScan){ stopScan(); stopScan = null; } };
  /* les départs s'enchaînent et s'attendent : retaper le MÊME code
     sans laisser la salle précédente se fermer laisserait la liaison
     en morceaux des deux côtés (voir leaveRoom) */
  let leaving = Promise.resolve();
  let portage = null;       /* le portage par relais du rendez-vous en cours */
  const leaveRdv = ({ garderPortage = false } = {}) => {
    if (rdvWatch){ rdvWatch.stop(); rdvWatch = null; }
    if (portage){ if (!garderPortage) portage.fermer(); portage = null; }
    const old = room;
    room = null;
    leaving = leaving.then(() => leaveRoom(old));
    return leaving;
  };
  /* caméra et salle se coupent quelle que soit la façon de fermer */
  const sh = openSheet({ title: 'Recevoir', icon: 'inbox', onClose: () => { gen++; halt(); leaveRdv(); } });
  const q = s => sh.body.querySelector(s);

  /* Recevoir = ce qu'un CAMARADE t'envoie (#5) — l'import de ses propres
     e-mails vit dans la capture (« Ajouter une piste → depuis mes e-mails ») */
  const menu = () => {
    gen++;
    halt();
    leaveRdv();
    sh.setTitle('Recevoir');
    sh.body.innerHTML =
      /* les mots de « Donner », un par rangée : ce que l'autre a montré
         ou envoyé. Le titre de la feuille porte le verbe ; « scanner le
         QR », « .oc », « coller le texte » redisaient chacun leur mot. */
      `<div class="pick-list">
         <button class="pick" id="rcScan"><b>${ic('grid-3x3', 'ic-14')} QR</b></button>
         <button class="pick" id="rcFile"><b>${ic('folder', 'ic-14')} Fichier</b></button>
         <button class="pick" id="rcPaste"><b>${ic('clipboard', 'ic-14')} Texte</b></button>
       </div>
       ${/* Rien sous les trois choix : « Aperçu avant fusion — annulable »
            annonçait l'écran suivant, qui s'appelle littéralement « Aperçu
            avant fusion » et porte lui-même son bouton. Une promesse tenue
            deux secondes plus tard n'a pas besoin d'être écrite avant. */''}
       <input type="file" id="rcInput" accept=".oc,.txt,.json,application/octet-stream,text/plain,application/json" hidden>`;
    q('#rcScan').addEventListener('click', scan);
    q('#rcFile').addEventListener('click', () => q('#rcInput').click());
    q('#rcPaste').addEventListener('click', paste);
    q('#rcInput').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => treat(String(r.result));
      r.readAsText(f);
    });
    sh.setFoot(null);
  };

  /* ---- scanner — QR de données (simple ou animé) OU QR de
     rendez-vous : reconnu tout seul ; sans caméra, le code se tape ---- */
  const scan = async () => {
    sh.setTitle('Scanner');
    sh.body.innerHTML =
      `<div class="scan-box"><video id="rcVideo" playsinline muted></video><div class="scan-mark"></div></div>
       <div class="scan-prog" id="rcProg" hidden></div>
       <p class="hint" style="text-align:center" id="rcScanHint">Vise le QR.</p>
       ${/* Le code de rendez-vous n'existe que pour des PISTES : un QR de
            profil n'en affiche aucun. Ouvert depuis « Amis », le champ
            ne proposerait que de taper quelque chose qui n'est nulle
            part — le chemin sans caméra y est le texte copié. */
         o.scanner ? '' : `<div class="field" style="margin-top:10px"><label for="rcCode">Ou le code affiché</label>
         <div class="date-row">
           <input id="rcCode" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ex : k7m3p-9xq2f">
           <button class="btn btn-primary" id="rcCodeGo" hidden>OK</button>
         </div></div>`}`;
    /* ouvert depuis « Amis », le scanner EST la feuille : sa croix
       suffit, un « Retour » dirait deux fois la même chose. Reste le
       chemin à distance — le profil copié par l'ami, collé ici. */
    if (o.scanner){
      const t = btn('Texte', '', paste, 'clipboard');
      t.id = 'rcTexte';
      sh.setFoot([t]);
    } else sh.setFoot([btn('← Retour', 'btn-ghost', menu)]);
    const codeInp = q('#rcCode');
    const codeGo = q('#rcCodeGo');
    const goCode = () => { const c = rdvNorm(codeInp.value); if (c) joinRdv(c); };
    codeInp?.addEventListener('input', () => { codeGo.hidden = !rdvNorm(codeInp.value); });
    codeInp?.addEventListener('keydown', e => { if (e.key === 'Enter') goCode(); });
    codeGo?.addEventListener('click', goCode);
    const joiner = makeOCQJoiner();
    try {
      stopScan = await startScan(q('#rcVideo'), raw => {
        const code = rdvParse(raw);
        if (code){ joinRdv(code); return false; }
        if (extraireOCA(raw)){ halt(); treat(raw); return false; }
        const part = joiner(raw);
        if (!part){ halt(); treat(raw); return false; }
        if (part.done){ halt(); treat(part.text); return false; }
        const p = q('#rcProg');
        if (p){ p.hidden = false; p.textContent = `QR animé — reçu ${part.got}/${part.total}, continue de viser`; }
        return true;   /* il manque des parties : on continue */
      });
    } catch (e) {
      const box = q('.scan-box');
      if (box) box.hidden = true;
      /* Refusée et absente appellent deux gestes différents : l'une se
         débloque dans les réglages, l'autre non. Les confondre sous
         « indisponible », c'était laisser chercher un réglage qui
         n'existe pas — ou ne jamais savoir qu'il existe. Le champ du
         code est juste dessous : c'est lui, le chemin sans caméra. */
      const h = q('#rcScanHint');
      const sans = o.scanner ? 'colle le profil qu’il t’a copié (Texte).' : 'tape le code affiché sur l’autre téléphone.';
      if (h) h.textContent = e.message === 'camera-refusee'
        ? 'La caméra est bloquée. Autorise-la dans les réglages du navigateur, ou ' + sans
        : 'Pas de caméra ici. ' + sans.charAt(0).toUpperCase() + sans.slice(1);
    }
  };

  /* ---- rendez-vous : l'appairage P2P fait passer les fiches ---- */
  const joinRdv = async code => {
    halt();
    const my = ++gen;
    await leaveRdv();
    if (my !== gen) return;
    sh.setTitle('Réception');
    sh.body.innerHTML = `<div class="qr-prog">${ic('clock', 'ic-14')} Connexion…</div>`;
    sh.setFoot([btn('← Retour', 'btn-ghost', menu)]);
    let r;
    let joined = false, joinedAt = 0;
    let got = false;
    /* la dernière part arrivée PAR LES RELAIS — tant qu'elles arrivent,
       l'échange avance, même sans chemin direct */
    let dernier = 0;
    const rec = recolte();
    const direReception = () => {
      const el = q('#rcRdvSt'), a = rec.avance();
      if (el) el.innerHTML = `${ic('radio', 'ic-14')} Relié — réception…${a && a.n > 1 ? ' ' + a.recues + '/' + a.n : ''}`;
    };
    const demandeId = Math.random().toString(36).slice(2, 12);
    /* un seul chemin de repli, partagé par la salle qui n'ouvre pas et
       par la liaison qui ne prend pas : deux rangements qui divergent
       finissent toujours par diverger pour de bon. */
    const depuis = Date.now();
    const replier = () => {
      w.stop();
      if (portage && portage.repli) portage.repli();
      leaveRdv();
      toast('Liaison impossible — scanne le QR hors ligne.');
      scan();
    };
    const w = watchLiaison(() => joined ? 1 : 0, (stage, cause) => {
      if (my !== gen || joined || got) return;
      const el = q('#rcRdvSt');
      if (!el) return;
      /* LES DEUX MOITIÉS BASCULENT ENSEMBLE. En face, « Donner » quitte
         le rendez-vous tout seul et affiche le QR hors ligne, qui porte
         les fiches dans l'image — ni relais, ni NAT, ni réseau. Si ce
         côté-ci restait sur une phrase à lire, l'échange s'arrêterait
         quand même : il faut quelqu'un qui SCANNE. On rouvre donc le
         scanner, et les deux téléphones se retrouvent sans qu'on leur
         demande de comprendre une panne de transport.
         Sans relais, rien ne passe — ni direct ni portage : on bascule. */
      if (stage === 'norelay'){ replier(); return; }
      /* MÊME EXCEPTION QU'EN FACE : « ce n'est pas le même code » n'est
         pas une panne de réseau, et l'autre écran ne bascule pas non
         plus — refaire le rendez-vous coûte dix secondes (§8). */
      if (stage === 'rtcfail' && cause === 'motdepasse'){
        el.innerHTML = `${ic('square-alert', 'ic-14')} Ce n’est pas le même code — refaites le rendez-vous.`;
        return;
      }
      /* L'ÉCHEC DU DIRECT NE FAIT PLUS BASCULER. C'était la panne de la
         5G : les deux téléphones se trouvaient par les relais, le NAT de
         l'opérateur fermait le chemin direct, et l'écran attendait
         « l'autre appareil » qui était pourtant là. Les relais portent
         maintenant les fiches (engine/portage.js) : tant que des parts
         arrivent, l'échange avance. On ne bascule que sur le SILENCE. */
      if (dernier){
        if (Date.now() - dernier > PORTAGE_SILENCE_MS){ replier(); return; }
        direReception();
        return;
      }
      /* ET PERSONNE NE VIENT. On vient de scanner : l'autre est là, son
         QR allumé. Si rien n'arrive — ni liaison, ni une seule part par
         les relais —, son écran à lui a basculé sur le QR hors ligne.
         On rouvre donc le scanner : il n'y a plus qu'à viser. */
      const attend = stage === 'wait' || stage === 'rtcfail';
      if (attend && Date.now() - depuis > SANS_PAIR_RECEVEUR_MS){ replier(); return; }
      el.innerHTML = attend ? `${ic('clock', 'ic-14')} En attente de l’autre appareil…`
        : `${ic('clock', 'ic-14')} Connexion…`;
    });
    try {
      r = await openRoom('give', code, { onJoinError: e => w.fail(e) });
    } catch (e) {
      w.stop();
      if (my !== gen) return;
      replier();
      return;
    }
    if (my !== gen){ w.stop(); await leaveRoom(r); return; }
    room = r;
    rdvWatch = w;
    sh.body.innerHTML = `<div class="qr-prog" id="rcRdvSt">${ic('clock', 'ic-14')} Connexion…</div>`;
    /* LE MÊME CONTRÔLE, QUEL QUE SOIT LE TUYAU. Direct ou relais, ce qui
       arrive est ce qu'un autre appareil a fabriqué : même borne que
       par fichier (D4), même aperçu avant fusion. */
    const accepter = obj => {
      if (got || my !== gen || !obj || obj.kind !== 'share' || !Array.isArray(obj.companies)) return false;
      obj.companies = obj.companies.filter(x => x && typeof x === 'object' && x.name).slice(0, 2000);
      if (!obj.companies.length) return false;
      if (JSON.stringify(obj.companies).length > 4000000) return false;
      got = true;
      return true;
    };
    const give = r.makeAction('give');
    give.onMessage = obj => {
      if (!accepter(obj)) return;
      leaveRdv();
      mergePreviewInto(sh, obj, { onBack: menu });
    };
    r.onPeerJoin = () => {
      joined = true;
      joinedAt = Date.now();
      const el = q('#rcRdvSt');
      if (el) el.innerHTML = `${ic('radio', 'ic-14')} Relié — réception…`;
    };
    /* LE PORTAGE — la voie qui reste quand le direct ne s'ouvre pas.
       Le direct garde sa chance (`PORTAGE_APRES_MS`) ; ensuite on
       demande par les relais, et on redemande ce qui manque. Si le
       portage ne s'ouvre pas (navigateur trop ancien), rien ne change :
       le direct et le repli restent ce qu'ils étaient. */
    let p = null;
    let t1 = null, iv = null;
    try {
      p = await ouvrirPortage(code, async m => {
        if (got || my !== gen || m.t !== 'part') return;
        dernier = Date.now();
        const parts = rec.ajouter(m);
        if (!parts){ direReception(); return; }
        let obj;
        try { obj = await rassembler(parts); } catch (e) { return; }
        if (!accepter(obj)) return;
        clearTimeout(t1); clearInterval(iv);
        /* « reçu » part AVANT de quitter, deux fois : sans lui, l'écran
           d'en face ne saurait jamais que c'est arrivé */
        const fini = { t: 'recu', r: demandeId };
        await p.envoyer(fini).catch(() => {});
        setTimeout(() => p.envoyer(fini).catch(() => {}).finally(() => p.fermer()), 1200);
        leaveRdv({ garderPortage: true });
        mergePreviewInto(sh, obj, { onBack: menu });
      });
    } catch (e) { p = null; }
    if (my !== gen){ if (p) p.fermer(); return; }
    if (p){
      const demander = () => {
        if (got || my !== gen) return;
        if (joined && Date.now() - joinedAt < PORTAGE_APRES_MS) return;
        p.envoyer({ t: 'demande', r: demandeId, manque: rec.manque() }).catch(() => {});
      };
      t1 = setTimeout(() => { demander(); iv = setInterval(demander, PORTAGE_RELANCE_MS); }, PORTAGE_APRES_MS);
      portage = {
        fermer: () => { clearTimeout(t1); clearInterval(iv); p.fermer(); },
        repli: () => p.envoyer({ t: 'repli', r: demandeId }).catch(() => {})
      };
    }
  };

  /* ---- coller ---- */
  const paste = () => {
    sh.setTitle('Coller');
    sh.body.innerHTML =
      `<div class="field"><label for="rcTxt">Le texte reçu</label>
         <textarea id="rcTxt" style="min-height:140px" placeholder="Colle ici le contenu partagé"></textarea></div>`;
    sh.setFoot([btn('← Retour', 'btn-ghost', o.scanner ? scan : menu), btn('Lire', 'btn-primary', () => treat(q('#rcTxt').value))]);
    q('#rcTxt').focus();
  };

  /* ---- mot de passe (fichiers OC2) ----
     `faux` : celui qu'on vient de refuser. Il reste dans le champ,
     sélectionné, et l'erreur se lit dessous — pas dans un toast en haut
     de l'écran pendant que le champ se vide (WCAG 3.3.1). */
  const askPass = (raw, faux) => {
    sh.setTitle('Fichier protégé');
    sh.body.innerHTML =
      `<p class="hint" style="margin:0 0 10px">${ic('lock', 'ic-14')} Chiffré — demande le mot de passe à l’expéditeur.</p>
       <div class="field"><label for="rcPass">Mot de passe</label>
         <input id="rcPass" type="password" autocomplete="off" aria-describedby="rcPassErr">
         <p class="hint warn" id="rcPassErr" hidden>Ce n’est pas le bon mot de passe.</p></div>`;
    const champ = q('#rcPass');
    const go = () => treat(raw, champ.value);
    sh.setFoot([btn('← Retour', 'btn-ghost', menu), btn('Déverrouiller', 'btn-primary', go)]);
    champ.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    if (faux != null){
      champ.value = faux;
      champ.setAttribute('aria-invalid', 'true');
      q('#rcPassErr').hidden = false;
      champ.select();
    }
    champ.focus();
  };

  /* ---- lecture + aperçu ---- */
  const treat = async (raw, pass, extra) => {
    halt();
    /* UN PROFIL, PAS DES PISTES : il ne se fusionne pas dans le suivi,
       il s'ajoute aux amis — après son propre aperçu (ui/amis.js) */
    const oca = extraireOCA(raw);
    if (oca){
      let ami;
      try {
        ami = normalizeAmi(await decodeOCA(oca));
        if (!ami) throw new Error('format');
      } catch (e) { toast(messageLecture(e.message)); return; }
      (await import('./amis.js')).apercuAmi(sh, ami, { onBack: o.scanner ? scan : menu, apres: o.apres });
      return;
    }
    let obj;
    try {
      obj = await parseInput(raw, pass);
    } catch (e) {
      if (e.message === 'besoinpass'){ askPass(raw); return; }
      if (e.message === 'motdepasse'){ askPass(raw, pass); return; }
      toast(messageLecture(e.message));
      return;
    }
    mergePreviewInto(sh, obj, Object.assign({ onBack: menu }, extra || {}));
  };

  if (o.scanner) scan();
  else menu();
}

/* ---- depuis mes e-mails : une source de la capture (#5) ----
   L'IA lit chez toi, propose ici — feuille autonome, ouverte depuis
   « Ajouter une piste ». Le prompt guidé reste le repli. Avec le
   Ordinateur, la mission est mémorisée avant son départ : fermer cette
   feuille ou l'app ne la perd plus, et le résultat revient dans le
   même aperçu triable. */
export function openImportMails(){
  let stopAnalysis = null;
  let gen = 0;
  const leaveAnalysis = () => { if (stopAnalysis){ stopAnalysis(); stopAnalysis = null; } };
  const sh = openSheet({ title: 'Depuis mes e-mails', icon: 'sparkles',
    onClose: () => { gen++; leaveAnalysis(); } });
  const q = s => sh.body.querySelector(s);

  const treat = async raw => {
    let obj;
    try {
      obj = await parseInput(raw);
    } catch (e) {
      toast(messageLecture(e.message));
      return;
    }
    mergePreviewInto(sh, obj, { select: true, onBack: mails });
  };

  const mails = async () => {
    const view = ++gen;
    leaveAnalysis();
    sh.setTitle('Depuis mes e-mails');
    const prompt = (S.profile.prompts.find(p => /mails?|e-?mails?/i.test(p.name)) || S.profile.prompts[0]);
    /* la lecture automatique de la boîte est de la surface ordinateur ;
       le chemin « je colle » qui suit, lui, marche partout */
    const assoc = ORDINATEUR ? await loadOrdinateur().catch(() => null) : null;
    if (view !== gen || !sh.body.isConnected) return;
    const pending = mailAnalysis();
    const pendingPick = pending ? (pending.state === 'ready'
      ? `<button class="pick" id="rcLastAnalysis"><b>${ic('sparkles', 'ic-14')} La dernière analyse</b>
           <span>${pending.count} piste${pending.count > 1 ? 's' : ''} proposée${pending.count > 1 ? 's' : ''} à trier</span></button>`
      : (pending.state === 'error'
        ? `<button class="pick" id="rcAnalysisError"><b>${ic('square-alert', 'ic-14')} La dernière analyse s’est arrêtée</b></button>`
        : `<button class="pick" id="rcCurrentAnalysis"><b>${ic('clock', 'ic-14')} Analyse en cours</b></button>`)) : '';
    sh.body.innerHTML =
      `${pendingPick ? `<div class="pick-list">${pendingPick}</div>` : ''}
       ${assoc ? `
       <!-- deux frères, deux libellés parallèles : seul le nombre de jours
            change, donc seul le nombre de jours s'écrit -->
       <div class="lbl-row" style="margin:0 0 6px"><label>ton ordinateur lit</label></div>
       <div class="pick-list">
         <button class="pick" id="rcScan7"><b>${ic('zap', 'ic-14')} Les 7 derniers jours</b></button>
         <button class="pick" id="rcScan30"><b>${ic('zap', 'ic-14')} Les 30 derniers jours</b></button>
       </div>
       <div class="lbl-row" style="margin:12px 0 6px"><label>ou à la main</label></div>` : ''}
       ${(ORDINATEUR && !assoc) ? `<p class="hint">${ic('lightbulb', 'ic-14')} ${matchMedia('(min-width:901px)').matches
         ? 'Avec l’ordinateur, ton ordinateur fait la lecture tout seul — Moi → Mes appareils.'
         : 'L’ordinateur s’installe et s’associe depuis ton ordinateur — ouvre OpenContact là-bas.'}</p>` : ''}
       ${/* TROIS GESTES, DANS L'ORDRE OÙ ILS SE FONT, ET LE PREMIER EST
            LE BOUTON. La feuille disait « Copie le prompt, colle-le dans
            ton assistant IA avec tes e-mails » en haut, pendant que le
            bouton qui copie vivait en bas à gauche, en second plan : on
            lisait la consigne, puis on CHERCHAIT où la faire. Numérotés,
            les gestes n'ont plus à être racontés — l'ordre se voit, et
            chaque étape se fait là où elle est écrite (le motif des pas
            d'« Installer l'app »). Une seule phrase reste, l'étape 2 :
            elle se passe HORS de l'app, rien à l'écran ne peut la montrer.
            « Prompt » est devenu « consigne », le mot de §0 : un mot
            anglais de technicien n'a rien à faire dans un bouton (§7). */''}
       <ol class="inst-pas mail-pas">
         <li><button class="btn btn-sm" id="rcPrompt">${ic('copy', 'ic-14')} Copier la consigne</button></li>
         <li>Colle-la dans ton assistant IA, avec <span style="white-space:nowrap">tes e-mails</span>.</li>
         <li><label for="rcMailTxt">Colle sa réponse ici :</label>
           <div class="field"><textarea id="rcMailTxt"></textarea></div></li>
       </ol>`;
    q('#rcLastAnalysis')?.addEventListener('click', showReady);
    q('#rcCurrentAnalysis')?.addEventListener('click', () => showProgress(pending.mid));
    q('#rcAnalysisError')?.addEventListener('click', showError);
    q('#rcScan7')?.addEventListener('click', () => scan(7));
    q('#rcScan30')?.addEventListener('click', () => scan(30));
    /* copiée, l'étape le DIT sur place — pas de toast pour un état qui
       se lit sur le bouton qu'on vient de toucher (§6). Le toast, lui,
       passait par `role="status"` : un lecteur d'écran l'entendait, et
       un libellé qui change sous le focus ne s'annonce pas partout. La
       région vivante de la coque reprend donc la phrase (`annoncer`). */
    q('#rcPrompt').addEventListener('click', async e => {
      const b = e.currentTarget;
      try {
        await navigator.clipboard.writeText(prompt.text);
        b.innerHTML = `${ic('check', 'ic-14')} Consigne copiée`;
        annoncer('Consigne copiée.');
      } catch (err) { toast('Copie impossible ici.'); }
    });
    sh.setFoot([btn('Lire', 'btn-primary', () => treat(q('#rcMailTxt').value))]);
    if (pending && (pending.state === 'sending' || pending.state === 'running'))
      reconcileMailAnalysis().catch(() => {});

    async function showReady(){
      const rec = mailAnalysis();
      if (!rec || rec.state !== 'ready'){ mails(); return; }
      gen++;
      leaveAnalysis();
      await mergeReadyAnalysisInto(sh, mails);
    }

    function showError(){
      const rec = mailAnalysis();
      if (!rec || rec.state !== 'error'){ mails(); return; }
      gen++;
      leaveAnalysis();
      sh.setTitle('Analyse interrompue');
      sh.body.innerHTML =
        `<p class="hint warn" style="margin:8px 0 12px">${ic('square-alert', 'ic-14')} ${esc(rec.error)}</p>`;
      sh.setFoot([
        btn('← Retour', 'btn-ghost', mails),
        btn('Oublier et recommencer', 'btn-primary', async () => { await clearMailAnalysis(rec.mid); mails(); })
      ]);
    }

    function showProgress(mid){
      const mine = ++gen;
      leaveAnalysis();
      sh.setTitle('Lecture en cours');
      sh.body.innerHTML =
        `<p class="hint" style="margin:12px 0">${ic('zap', 'ic-14')} Ton ordinateur lit tes e-mails
           et l’IA locale prépare des propositions.</p>
         <p class="hint" id="rcScanSt">Tu peux fermer : le résultat reviendra dans Aujourd’hui.</p>`;
      const cancel = async () => {
        const rec = mailAnalysis();
        if (!rec || rec.mid !== mid){ mails(); return; }
        const st = q('#rcScanSt');
        if (st) st.textContent = 'Annulation auprès de ton ordinateur…';
        const assoc2 = await loadOrdinateur().catch(() => null);
        const found = assoc2 && await probeOrdinateur();
        if (!found){
          if (st) st.textContent = 'Ton ordinateur ne répond pas : ouvre l’ordinateur pour confirmer l’annulation.';
          return;
        }
        try {
          const rep = await ordinateurCall(found.base, assoc2.k, { t: 'revoquer', mid });
          if (!rep || rep.t !== 'ok') throw new Error('revoquer');
          await clearMailAnalysis(mid);
          toast('Analyse annulée');
          mails();
        } catch (e) {
          if (st) st.textContent = 'Annulation non confirmée — réessaie quand l’ordinateur répond.';
        }
      };
      sh.setFoot([btn('Annuler l’analyse', 'btn-ghost', cancel)]);
      stopAnalysis = subscribeMailAnalysis(rec => {
        if (mine !== gen || !sh.body.isConnected || !rec || rec.mid !== mid) return;
        if (rec.state === 'ready') showReady();
        else if (rec.state === 'error') showError();
      });
      reconcileMailAnalysis().catch(() => {});
    }

    /* Mission bornée, visible, annulable. Sa trace est écrite avant le
       réseau pour fermer la petite course « accepté puis app fermée ». */
    async function scan(jours){
      const old = mailAnalysis();
      if (old){
        if (old.state === 'ready') showReady();
        else if (old.state === 'error') showError();
        else showProgress(old.mid);
        return;
      }
      const assoc2 = await loadOrdinateur().catch(() => null);
      if (!assoc2) return;
      if (!await requireCode('Ton code, pour lancer la lecture')) return;
      const found = await probeOrdinateur();
      if (!found){ toast('Ton ordinateur est éteint — ouvre l’ordinateur d’abord.'); return; }
      try {
        const self = await deviceSelf();
        const keys = await ensureKeys();
        const m = makeMission('mail-scan', { jours, prompt: prompt.text });
        const wire = await signMission(m, self.id, keys.seed);
        await beginMailAnalysis({
          mid: m.mid, days: jours, startedAt: m.createdAt, expiresAt: m.expiresAt
        });
        showProgress(m.mid);
        let rep;
        try { rep = await ordinateurCall(found.base, assoc2.k, { t: 'mission', wire }); }
        catch (e) {
          /* Le paquet a pu être accepté avant la coupure : garder le mid
             et laisser la réconciliation trancher, plutôt que le perdre. */
          await markMailAnalysisRunning(m.mid);
          toast('Connexion interrompue — ton ordinateur peut continuer, le résultat reste suivi.');
          return;
        }
        if (!rep || rep.t !== 'mission-ok'){
          await failMailAnalysis(m.mid, 'L’ordinateur a refusé cette analyse.');
          return;
        }
        await markMailAnalysisRunning(m.mid);
        reconcileMailAnalysis().catch(() => {});
      } catch (err) {
        const msg = err && err.message === 'stockage'
          ? 'Impossible de mémoriser cette analyse : vérifie le stockage avant de réessayer.'
          : 'Impossible de lancer l’analyse — ' + (err && err.message || 'réessaie.');
        toast(msg);
        if (sh.body.isConnected) mails();
      }
    }
  };

  mails();
}

/* Ouverture directe depuis le chip d'Aujourd'hui. Annuler ferme seulement
   l'aperçu : la proposition reste disponible jusqu'à fusion ou abandon
   explicite dans « Depuis mes e-mails ». */
export async function openPendingMailAnalysis(){
  const rec = mailAnalysis();
  if (!rec || rec.state !== 'ready'){ toast('Aucune analyse prête à trier.'); return; }
  const sh = openSheet({ title: 'Propositions de l’analyse', icon: 'sparkles' });
  sh.body.innerHTML = `<p class="hint">${ic('clock', 'ic-14')} Ouverture du résultat…</p>`;
  await mergeReadyAnalysisInto(sh, () => sh.close());
}

async function mergeReadyAnalysisInto(sh, onBack){
  const rec = mailAnalysis();
  if (!rec || rec.state !== 'ready'){ if (onBack) onBack(); return; }
  let obj;
  try { obj = await parseInput(rec.result); }
  catch (e) {
    await failMailAnalysis(rec.mid, 'Le résultat mémorisé est devenu illisible.');
    toast('Ce résultat ne peut plus être lu.');
    if (onBack) onBack();
    return;
  }
  mergePreviewInto(sh, obj, {
    select: true,
    onBack,
    onDone: () => { clearMailAnalysis(rec.mid).catch(() => {}); }
  });
}

/* ---- aperçu avant fusion + fusion + annulation — réutilisé par le
   direct (partage en groupe) : mêmes règles, quel que soit le canal ---- */
export function mergePreviewInto(sh, obj, opts){
  opts = opts || {};
  /* la copie telle qu'elle est arrivée, avant que la fusion à blanc
     n'y touche : c'est elle qu'on restaure si on le demande */
  const copieBrute = obj.kind === 'full' ? JSON.parse(JSON.stringify(obj)) : null;
  /* fusion à blanc sur une copie : l'aperçu dit tout, rien n'est touché */
  const dry = mergeIncoming(obj.companies, JSON.parse(JSON.stringify(S.companies)));
  const n = obj.companies.length;
  /* une proposition d'IA se TRIE (opts.select) — un partage de
     camarade se prend en bloc : mêmes règles de fusion ensuite */
  const unsel = new Set();
  sh.setTitle('Aperçu avant fusion');
  sh.body.innerHTML =
    `<div class="rc-recap">
       ${opts.from ? `<p class="hint" style="margin:0 0 8px">${ic('radio', 'ic-14')} Reçu en direct de <b>${esc(opts.from)}</b></p>` : ''}
       <div class="rc-big">${n} piste${n > 1 ? 's' : ''} ${opts.select ? 'proposée' : 'reçue'}${n > 1 ? 's' : ''}</div>
       <ul class="rc-lines">
         <li>${ic('plus', 'ic-14')} <b>${dry.addedC}</b> nouvelle${dry.addedC > 1 ? 's' : ''}</li>
         ${dry.enriched ? `<li>${ic('pencil', 'ic-14')} <b>${dry.enriched}</b> complétée${dry.enriched > 1 ? 's' : ''}</li>` : ''}
         ${dry.addedCt ? `<li>${ic('contact', 'ic-14')} <b>${dry.addedCt}</b> contact${dry.addedCt > 1 ? 's' : ''} ajouté${dry.addedCt > 1 ? 's' : ''}</li>` : ''}
         ${dry.conflicts ? `<li class="rc-warn">${ic('square-alert', 'ic-14')} <b>${dry.conflicts}</b> divergence${dry.conflicts > 1 ? 's' : ''} — l’existant est gardé</li>` : ''}
       </ul>
       ${/* Une COPIE ouverte ici : fusionner ajoute ses pistes sans rien
            écraser, et c'est le bon défaut. Mais la phrase qui disait
            « va dans Moi » envoyait refaire le chemin jusqu'aux Réglages
            pour rouvrir le même fichier. Le geste est posé ici, avec la
            même question et le même Annuler que depuis « Moi ». */''}
       ${obj.kind === 'full' ? `<div class="pick-sortie">
            <button class="btn btn-sm btn-danger" id="rcRestore">${ic('reload', 'ic-14')} Restaurer cette copie</button>
          </div>` : ''}
       ${opts.select && n ? `<div class="pick-list pk-inverse" style="margin:10px 0 4px">
         ${obj.companies.slice(0, 200).map((c, i) =>
           `<button class="pick pk on" data-sel="${i}" aria-pressed="true">
              ${ic('checkbox', 'ic-20 ic-off')}${ic('checkbox-on', 'ic-20 ic-on')}
              <div class="pk-m"><b>${esc(c.name || '')}</b>
                <span class="pk-s">${esc([c.city, (c.contacts || []).length ? (c.contacts.length + ' contact' + (c.contacts.length > 1 ? 's' : '')) : ''].filter(Boolean).join(' · '))}</span></div>
            </button>`).join('')}
       </div>` : ''}
       ${/* « Rien n'est écrasé, tu peux annuler juste après » : l'écran
            s'appelle « Aperçu avant fusion », la ligne de divergence dit
            déjà « l'existant est gardé », et la barre Annuler arrive au
            geste suivant. Trois fois la même promesse sur un seul écran. */''}
       ${opts.onDiscard ? `<button class="linklike" id="rcDiscard">Écarter ces propositions</button>` : ''}
     </div>`;
  const bGo = btn(dry.addedC + dry.enriched + dry.addedCt === 0 ? 'Rien à ajouter' : 'Fusionner', 'btn-primary', () => {
    const chosen = opts.select ? obj.companies.filter((_, i) => !unsel.has(i)) : obj.companies;
    if (!chosen.length){ toast('Tout est décoché — rien à fusionner.'); return; }
    const snapshot = JSON.stringify(S.companies);
    const stats = mergeIncoming(chosen, S.companies);
    saveData();
    logJ('Reçu' + (opts.from ? ' de ' + opts.from : (opts.select ? ' (analyse IA triée)' : ' du groupe')) + ' : +' + stats.addedC + ' piste(s), ' + stats.enriched + ' complétée(s)',
      null, stats.ids);
    sh.close();
    bus.refresh();
    offerUndo(snapshot, stats);
    if (opts.onDone) opts.onDone(stats);
  });
  const relabel = () => {
    if (!opts.select) return;
    const kept = n - unsel.size;
    bGo.textContent = kept ? `Fusionner (${kept})` : 'Rien de coché';
  };
  sh.body.querySelectorAll('[data-sel]').forEach(b =>
    b.addEventListener('click', () => {
      const i = +b.dataset.sel;
      unsel.has(i) ? unsel.delete(i) : unsel.add(i);
      b.classList.toggle('on', !unsel.has(i));
      b.setAttribute('aria-pressed', String(!unsel.has(i)));
      relabel();
    }));
  relabel();
  sh.body.querySelector('#rcDiscard')?.addEventListener('click', () => opts.onDiscard());
  /* chargé au geste : moi.js importe déjà ce fichier-ci, un import
     en retour ferait une boucle */
  sh.body.querySelector('#rcRestore')?.addEventListener('click', async () => {
    const { restaurerObjet } = await import('./moi.js');
    if (await restaurerObjet(copieBrute)) sh.close();
  });
  /* « Retour » seulement quand il ramène quelque part (le menu Recevoir,
     l'écran des e-mails) — c'est la seule exception à « la croix
     suffit ». Quand il ne ferait que fermer, la croix s'en charge. */
  sh.setFoot(opts.onBack ? [btn('Retour', 'btn-ghost', () => opts.onBack(), 'arrow-left'), bGo] : [bGo]);
}

/* ---- « Annuler » ~30 s : l'instantané d'avant fusion, restauré tel quel ---- */
function offerUndo(snapshot, stats){
  showUndo(
    `${ic('check', 'ic-14')} Fusion faite : +${stats.addedC} nouvelle${stats.addedC > 1 ? 's' : ''}, ${stats.enriched} complétée${stats.enriched > 1 ? 's' : ''}.`,
    () => {
      S.companies = JSON.parse(snapshot).map(normalizeCompany);
      saveData();
      logJ('Fusion annulée');
      bus.refresh();
    });
}
