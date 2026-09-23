/* Un Chromium DANS un espace réseau du labo. Playwright pilote le
   navigateur par des tubes (--remote-debugging-pipe), pas par le
   réseau : un petit lanceur qui passe par `ip netns exec` suffit, et
   le navigateur ne voit plus que la maison où on l'a posé. Le lanceur
   s'écrit hors du dépôt. */
import { writeFileSync, chmodSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
export function navigateurDans(ns, chromium){
  const dir = path.join(process.env.TMPDIR || os.tmpdir(), 'oc-labo');
  mkdirSync(dir, { recursive: true });
  const exe = path.join(dir, 'chromium-' + ns + '.sh');
  writeFileSync(exe, '#!/bin/sh\nexec ip netns exec ' + ns + ' ' + (chromium || 'chromium') + ' "$@"\n');
  chmodSync(exe, 0o755);
  return exe;
}
