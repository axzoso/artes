# Icone del sito ricavate dal simbolo del logo (griglia 3x3 di assets/artes-logo.png: celle da ~63 px, spazi da 5 px, colori sotto).
# La griglia è ridisegnata in modo geometrico (non ridimensionata) perché alle misure piccole celle e spazi cadano su pixel interi.
#   py -3 tools/rev2/favicon.py   -> wp/artes-core/icone/{icona.svg, favicon.ico, apple-touch-icon.png, icona-512.png}
# Richiede Pillow (py -3 -m pip install pillow). Il plugin le stampa in <head> se in WordPress non è impostata un'"Icona del sito".
from pathlib import Path
from PIL import Image, ImageDraw

CHIARO, MEDIO, ROSSO = '#C6C6C5', '#88888D', '#E11417'
GRIGLIA = [[CHIARO, CHIARO, CHIARO],
           [CHIARO, MEDIO, MEDIO],
           [CHIARO, MEDIO, ROSSO]]
out = Path(__file__).resolve().parents[2] / 'wp' / 'artes-core' / 'icone'
out.mkdir(parents=True, exist_ok=True)

# Misure piccole: cella e spazio interi scelti a mano (3 celle + 2 spazi <= lato).
PICCOLE = {16: (4, 2), 32: (10, 1), 48: (15, 1)}


def disegna(lato, cella, spazio, sfondo=None, margine=0):
    im = Image.new('RGBA', (lato, lato), sfondo or (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    totale = 3 * cella + 2 * spazio
    o = margine + (lato - 2 * margine - totale) // 2
    for r, riga in enumerate(GRIGLIA):
        for c, colore in enumerate(riga):
            x, y = o + c * (cella + spazio), o + r * (cella + spazio)
            d.rectangle([x, y, x + cella - 1, y + cella - 1], fill=colore)
    return im


def proporzionale(lato, sfondo=None, margine=0):
    utile = lato - 2 * margine
    spazio = max(1, round(utile * 5 / 198))
    cella = (utile - 2 * spazio) // 3
    return disegna(lato, cella, spazio, sfondo, margine)


ico = [disegna(n, *PICCOLE[n]) for n in (16, 32, 48)]
ico[2].save(out / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
# iOS mette lo sfondo nero alle icone trasparenti: fondo bianco e margine.
proporzionale(180, sfondo='#FFFFFF', margine=22).save(out / 'apple-touch-icon.png', optimize=True)
proporzionale(512).save(out / 'icona-512.png', optimize=True)

celle = ''.join(
    f'<rect x="{c * 68}" y="{r * 68}" width="63" height="63" fill="{colore}"/>'
    for r, riga in enumerate(GRIGLIA) for c, colore in enumerate(riga))
(out / 'icona.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 199 199">{celle}</svg>\n', encoding='utf-8')
print('icone in', out, sorted(p.name for p in out.iterdir()))
