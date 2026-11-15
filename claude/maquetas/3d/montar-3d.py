# Monta las dos cáscaras de la maqueta del 3D (ordenador y móvil) a partir de la app de verdad (v0.9-rediseno, fb6b73e)
# sacada con tests/snap-3d.mjs: el DOM de Hoy, y el de Reparto dentro de un <template> para cambiar de página sin recargar.
import re, shutil, glob, os
SNAP = '/home/claude/snap'; DIST = '/home/claude/inversiones/dist/assets'; OUT = '/home/claude/maq/sitio'
os.makedirs(OUT + '/assets', exist_ok=True)
for f in glob.glob(DIST + '/*.woff2') + glob.glob(DIST + '/*.webp'): shutil.copy(f, OUT + '/assets/')
shutil.copy(glob.glob(DIST + '/app-*.css')[0], OUT + '/assets/app.css')
def cuerpo(h):
    m = re.search(r'<body[^>]*>(.*)</body>', h, flags=re.S); return m.group(1)
def cascara(ancho, destino, disp):
    h = open(f'{SNAP}/hoy-{ancho}.html').read(); r = open(f'{SNAP}/reparto-{ancho}.html').read()
    h = re.sub(r'assets/app-[0-9a-f]+\.css', 'assets/app.css', h)
    h = re.sub(r'<title>.*?</title>', '<title>Toisón · maqueta del 3D</title>', h, flags=re.S)
    h = h.replace('<html ', f'<html data-mq-disp="{disp}" ', 1)
    h = h.replace('</head>', '<link rel="stylesheet" href="mq.css">\n<script src="mq3d.js" defer></script>\n<script src="mq.js" defer></script>\n</head>', 1)
    # el CSS que la app mete al bajar un trozo (el de Análisis, #pavCss): Hoy no lo lleva y Reparto sí
    for m in re.finditer(r'<style id="([^"]+)"[^>]*>.*?</style>', r, flags=re.S):
        if f'<style id="{m.group(1)}"' not in h: h = h.replace('</head>', m.group(0) + '\n</head>', 1)
    h = h.replace('</body>', '<template id="mqReparto">' + cuerpo(r) + '</template>\n</body>', 1)
    open(f'{OUT}/{destino}', 'w').write(h)
    print(destino, len(h))
cascara(1440, 'pc.html', 'pc')
cascara(390, 'movil.html', 'movil')
for f in ['mq.js', 'mq3d.js', 'mq.css', 'index.html']:
    if os.path.exists(f): shutil.copy(f, OUT + '/' + f)
