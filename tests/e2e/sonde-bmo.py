"""OpenContact — sonde : l'enquête « Besoins en main-d'œuvre » (BMO) 2026.

Ce que France Travail publie sur data.gouv.fr (licence ouverte), relu ici
pour les métiers de l'informatique : les recrutements prévus et la part
jugée difficile, par département. La sonde imprime la table que l'app
range dans engine/marche.js — une donnée par an, relevée, jamais supposée.

Bibliothèque standard seulement (un .xlsx est un zip de XML).
INFORMATIVE : elle relève, elle ne fait pas rougir la CI.
"""
import io
import json
import re
import sys
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

URL = 'https://www.data.gouv.fr/fr/datasets/r/228917c7-c22e-4766-835e-fcb923f29b3d'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def lire_xlsx(octets):
    z = zipfile.ZipFile(io.BytesIO(octets))
    noms = z.namelist()
    partages = []
    if 'xl/sharedStrings.xml' in noms:
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            partages.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    feuilles = sorted(n for n in noms if re.match(r'xl/worksheets/sheet\d+\.xml$', n))
    print('feuilles :', feuilles)
    tables = []
    for f in feuilles:
        lignes = []
        for row in ET.fromstring(z.read(f)).iter('{%s}row' % NS['m']):
            vals = {}
            for c in row.findall('m:c', NS):
                col = re.sub(r'\d', '', c.get('r'))
                v = c.find('m:v', NS)
                if v is None:
                    is_ = c.find('m:is', NS)
                    val = ''.join(t.text or '' for t in is_.iter('{%s}t' % NS['m'])) if is_ is not None else ''
                elif c.get('t') == 's':
                    val = partages[int(v.text)]
                else:
                    val = v.text
                vals[col] = val
            lignes.append(vals)
        tables.append((f, lignes))
    return tables


def col_index(c):
    n = 0
    for ch in c:
        n = n * 26 + (ord(ch) - 64)
    return n


def nombre(v):
    try:
        return float(str(v).replace(',', '.'))
    except (TypeError, ValueError):
        return None


def main():
    req = urllib.request.Request(URL, headers={'User-Agent': 'opencontact-sonde/1 (+github)'})
    octets = urllib.request.urlopen(req, timeout=60).read()
    print('BMO 2026 :', len(octets), 'octets')
    tables = lire_xlsx(octets)
    for nom, lignes in tables:
        print(f'— {nom} : {len(lignes)} lignes')
        for l in lignes[:4]:
            print('   ', json.dumps([l[k] for k in sorted(l, key=col_index)], ensure_ascii=False)[:400])
    # la table de données : celle dont l'en-tête nomme un code métier
    for nom, lignes in tables:
        entete_i = next((i for i, l in enumerate(lignes[:10]) if any('tier' in str(v).lower() for v in l.values())), None)
        if entete_i is None:
            continue
        entete = {k: str(v).strip() for k, v in lignes[entete_i].items()}
        print('EN-TÊTE', json.dumps(entete, ensure_ascii=False))
        inv = {v.lower(): k for k, v in entete.items()}

        def colonne(*cles):
            for cle in cles:
                for v, k in inv.items():
                    if v == cle.lower() or v.startswith(cle.lower()):
                        return k
            return None
        c_code = colonne('code métier bmo', 'code metier bmo', 'metier')
        c_nom = colonne('nom métier bmo', 'nom metier bmo', 'nommetier')
        c_dep = colonne('dept', 'département', 'departement')
        c_nomdep = colonne('nomdept', 'nom département', 'nom departement')
        c_met, c_xmet, c_smet = colonne('met'), colonne('xmet'), colonne('smet')
        print('COLONNES', c_code, c_nom, c_dep, c_nomdep, c_met, c_xmet, c_smet)
        it = {}
        par = {}
        secrets = 0
        for l in lignes[entete_i + 1:]:
            nomm = str(l.get(c_nom, ''))
            if not re.search(r'informati|réseau|reseau|télécom|telecom|système|systeme|données', nomm, re.I):
                continue
            code = str(l.get(c_code, ''))
            it[code] = nomm
            dep = str(l.get(c_dep, '')).strip()
            met, xmet = nombre(l.get(c_met)), nombre(l.get(c_xmet))
            if met is None:
                secrets += 1
                continue
            d = par.setdefault(dep, {})
            a = d.setdefault(code, [0, 0])
            a[0] += met
            a[1] += xmet or 0
        print('MÉTIERS INFORMATIQUE :')
        for k, v in sorted(it.items()):
            nat = sum(par[d][k][0] for d in par if k in par[d])
            dif = sum(par[d][k][1] for d in par if k in par[d])
            print(f'   {k} · {v} · France {int(nat)} projets · {round(100 * dif / nat) if nat else "?"} % difficiles')
        print('lignes au secret statistique :', secrets)
        compact = {d: {k: [int(round(a[0])), int(round(a[1]))] for k, a in sorted(v.items())} for d, v in sorted(par.items())}
        texte = json.dumps(compact, ensure_ascii=False, separators=(',', ':'))
        for i in range(0, len(texte), 1500):
            print('BMOJSON ' + texte[i:i + 1500])
        print('BMOFIN', len(compact), 'départements')
        break


if __name__ == '__main__':
    try:
        main()
    except Exception as e:  # informative
        print('ÉCHEC de la sonde BMO :', repr(e))
        sys.exit(0)
