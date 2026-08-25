#!/usr/bin/env python3
"""Assembla le pagine del sito ARTES.

    python3 build.py           # ricostruisce tutto
    python3 build.py --check   # verifica soltanto, non scrive (exit 1 se cambia)

Il guscio — head, header, mega menu, barra viste, footer — sta una volta
sola in `src/shell.html`. Ogni pagina in `src/pages/` contiene solo il
proprio `<main>`, preceduto da un front-matter:

    <!--
    title: Titolo della pagina
    description: Meta description per i motori di ricerca.
    nav: contract.html      # voce di menu da evidenziare (opzionale)
    view: index.html        # vista del prototipo da evidenziare (opzionale)
    -->
    <main> … </main>

I file prodotti finiscono nella root, che è ciò che GitHub Pages serve.
Non modificare a mano le pagine in root: vanno rigenerate da qui.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent
SHELL = ROOT / 'src' / 'shell.html'
PAGES = ROOT / 'src' / 'pages'

# La voce "Settori" nel menu non è un link ma il trigger del mega menu:
# si evidenzia per classe, non per href.
NAV_TRIGGER = 'settori'


def parse_page(path):
    """Separa il front-matter dal corpo della pagina."""
    raw = path.read_text()
    m = re.match(r'\s*<!--(.*?)-->\s*(.*)', raw, re.S)
    if not m:
        raise SystemExit(f'{path.name}: manca il front-matter iniziale')

    meta = {}
    for line in m.group(1).strip().splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if ':' not in line:
            raise SystemExit(f'{path.name}: riga di front-matter non valida: {line!r}')
        key, value = line.split(':', 1)
        meta[key.strip()] = value.strip()

    for required in ('title', 'description'):
        if required not in meta:
            raise SystemExit(f'{path.name}: manca "{required}" nel front-matter')

    return meta, m.group(2).rstrip() + '\n'


def activate(html, target, region_end):
    """Aggiunge is-active alla voce indicata, cercandola solo nella sua zona.

    Header e barra viste contengono entrambi un link a index.html: senza
    limitare la ricerca alla zona giusta si accenderebbero tutti e due.
    """
    if not target:
        return html

    region, rest = html[:region_end], html[region_end:]

    if target == NAV_TRIGGER:
        old, new = 'class="nav__trigger"', 'class="nav__trigger is-active"'
    else:
        old, new = f'<a href="{target}">', f'<a href="{target}" class="is-active">'

    if old not in region:
        raise SystemExit(f'build: "{target}" non trovato nel guscio')

    return region.replace(old, new, 1) + rest


def escape_attr(text):
    return text.replace('&', '&amp;').replace('"', '&quot;')


def render(shell, meta, main):
    html = shell.replace('{{title}}', meta['title'])
    html = html.replace('{{description}}', escape_attr(meta['description']))
    html = html.replace('{{main}}', main.rstrip('\n'))

    # L'header finisce dove inizia la barra viste; la barra viste dove
    # finisce il primo </nav> successivo.
    header_end = html.index('</header>')
    view_end = header_end + html[header_end:].index('</nav>')

    html = activate(html, meta.get('nav'), header_end)
    html = activate(html, meta.get('view'), view_end)
    return html


def main():
    check = '--check' in sys.argv

    if not SHELL.exists():
        raise SystemExit('build: manca src/shell.html')

    shell = SHELL.read_text()
    sources = sorted(PAGES.glob('*.html'))
    if not sources:
        raise SystemExit('build: nessuna pagina in src/pages/')

    stale = []
    for path in sources:
        meta, body = parse_page(path)
        html = render(shell, meta, body)
        out = ROOT / path.name

        if out.exists() and out.read_text() == html:
            print(f'  = {path.name}')
            continue

        stale.append(path.name)
        if check:
            print(f'  ! {path.name} — non allineata')
        else:
            out.write_text(html)
            print(f'  → {path.name}')

    if check and stale:
        print(f'\n{len(stale)} pagine da rigenerare: python3 build.py')
        return 1

    print(f'\n{len(sources)} pagine' + ('' if check else f', {len(stale)} riscritte'))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
