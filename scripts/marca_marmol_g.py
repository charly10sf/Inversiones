"""Las imágenes de la marca con el Mármol G (0.8.3): iconos de la app y la portada de la presentación.

    python scripts/marca_marmol_g.py [carpeta]   (por defecto, la raíz del repositorio)

Hace, siempre igual (semillas fijas):
  favicon.svg                                   el símbolo plano sobre el negro del Mármol G
  toison-16.png, toison-32.png                  el símbolo de la rejilla pequeña (small.py del Design System)
  toison-180/192/512.png, toison-maskable-512   el símbolo plano sobre la piedra (marmol-g-pc.webp)
  apple-touch-icon.png, icon-192/512.png, icon-maskable-512.png   copias con los nombres viejos
  toison-marmol.webp                            la portada de Mármol en la presentación: el relieve y la
                                                palabra TOISÓN SIN FONDO (detrás va la textura de la app)

El relieve y la geometría salen del Design System «Toisón» 1.3 (project/fuentes/src: geom.py, relief3.py,
small.py y m_parts.py), copiados aquí en lo que hace falta. La palabra se pinta con Chrome (Ibarra Real Nova
de fonts/), con el Chrome del sistema y Playwright de Python.

Necesita numpy, scipy, matplotlib, Pillow y playwright (Python).
"""
import base64
import io
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from matplotlib.path import Path as MPath

RAIZ = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------ colores (Mármol G)
NEGRO = '#000000'
ORO = '#e3b45f'          # el oro del logo
CREMA = '#f6ead5'

# ------------------------------------------------------------------ geometría (geom.py 1.3)
MASTER = dict(
    a=80.9, b=50.0, ai=54.1, bi=46.4,
    bar_hw=61.15, bar_y0=-76.0, bar_y1=-66.7,
    ech=True, ech_y1=-57.0, ech_hw0=16.25,
    sh_hw0=9.05, sh_hw1=12.25, sh_y1=60.0,
    pl_hw=20.5, pl_y1=67.2,
    flutes=[-5.5, 0.0, 5.5], fl_w=1.9, fl_y0=-40.5, fl_y1=38.5,
)
# small.py 1.3: la rejilla de 32 y de 16
SMALL = {
    32: dict(cx=16, cy=16.5, a=15, b=9.5, ai=10, bi=8, bar_hw=11, bar_y0=-14.5, bar_y1=-12.5,
             ech=True, ech_y1=-10.5, ech_hw0=4, sh_hw0=2, sh_hw1=3, sh_y1=11.5, pl_hw=4, pl_y1=13.5,
             flutes=[], fl_w=1, fl_y0=0, fl_y1=0),
    16: dict(cx=8, cy=8.5, a=7, b=4.5, ai=4.5, bi=3.5, bar_hw=5, bar_y0=-7.5, bar_y1=-5.5,
             ech=False, ech_y1=-5.5, ech_hw0=1, sh_hw0=1, sh_hw1=1, sh_y1=5.5, pl_hw=3, pl_y1=6.5,
             flutes=[], fl_w=1, fl_y0=0, fl_y1=0),
}


def column_outline(p):
    hw, y0, y1 = p['bar_hw'], p['bar_y0'], p['bar_y1']
    pts = [(-hw, y0), (hw, y0), (hw, y1)]
    pts += [(p['ech_hw0'], y1), (p['sh_hw0'], p['ech_y1'])] if p['ech'] else [(p['sh_hw0'], y1)]
    pts += [(p['sh_hw1'], p['sh_y1']), (p['pl_hw'], p['sh_y1']), (p['pl_hw'], p['pl_y1']),
            (-p['pl_hw'], p['pl_y1']), (-p['pl_hw'], p['sh_y1']), (-p['sh_hw1'], p['sh_y1'])]
    pts += [(-p['sh_hw0'], p['ech_y1']), (-p['ech_hw0'], y1)] if p['ech'] else [(-p['sh_hw0'], y1)]
    return pts + [(-hw, y1)]


def rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float64) / 255


def masks(p, W, H, k, tx, ty, ss):
    def lienzo():
        return Image.new('L', (W * ss, H * ss), 0)

    def elipse(img, a, b, fill):
        ImageDraw.Draw(img).ellipse([(tx - a * k) * ss, (ty - b * k) * ss, (tx + a * k) * ss, (ty + b * k) * ss], fill=fill)
    o = lienzo(); elipse(o, p['a'], p['b'], 255); elipse(o, p['ai'], p['bi'], 0)
    c = lienzo(); ImageDraw.Draw(c).polygon([((x * k + tx) * ss, (y * k + ty) * ss) for x, y in column_outline(p)], fill=255)
    f = lienzo(); d = ImageDraw.Draw(f)
    for fx in p['flutes']:
        w = p['fl_w'] / 2
        d.rectangle([((fx - w) * k + tx) * ss, (p['fl_y0'] * k + ty) * ss,
                     ((fx + w) * k + tx) * ss - 1, (p['fl_y1'] * k + ty) * ss - 1], fill=255)
    baja = lambda im: np.asarray(im.reduce(ss) if ss > 1 else im).astype(np.float64) / 255
    return baja(o), baja(c), baja(f)


def plano(p, W, H, k, tx, ty, fondo, ss=16, metal=True):
    """El símbolo plano (como favicon.svg): la O en crema, la T de metal (degradado del logo), estrías caladas.
    fondo: array H x W x 3 (0..1). Devuelve array H x W x 3."""
    O, C, F = masks(p, W, H, k, tx, ty, ss)
    Ccut = np.clip(C - F, 0, 1)
    o_vis = O * (1 - C)
    out = fondo.copy()
    # sombra suave (la del favicon: hacia abajo, negra)
    todo = np.maximum(O, C)
    sombra = ndi.gaussian_filter(ndi.shift(todo, (max(1, 1.1 * k), 0), order=1), max(.6, 1.2 * k)) * .55
    out *= (1 - sombra)[..., None]
    y = (np.arange(H)[:, None] - (ty + p['bar_y0'] * k)) / ((p['pl_y1'] - p['bar_y0']) * k)
    y = np.clip(np.broadcast_to(y, (H, W)), 0, 1)
    if metal:   # #f7dfa8 → #e3b45f (52 %) → #b5863a
        c1, c2, c3 = rgb('#f7dfa8'), rgb(ORO), rgb('#b5863a')
        t = y[..., None]
        oro = np.where(t < .52, c1 + (c2 - c1) * (t / .52), c2 + (c3 - c2) * ((t - .52) / .48))
    else:
        oro = np.broadcast_to(rgb(ORO), (H, W, 3))
    crema = rgb('#fbf3e6') + (rgb('#e2d2bb') - rgb('#fbf3e6')) * y[..., None]
    out = out * (1 - o_vis[..., None]) + crema * o_vis[..., None]
    out = out * (1 - Ccut[..., None]) + oro * Ccut[..., None]
    return np.clip(out, 0, 1)


def encajar(W, H, frac):
    x0, y0, x1, y1 = -MASTER['a'], MASTER['bar_y0'], MASTER['a'], MASTER['pl_y1']
    k = W * frac / (x1 - x0)
    return k, W / 2 - (x0 + x1) / 2 * k, H / 2 - (y0 + y1) / 2 * k


def a_img(a, alfa=None):
    a = (np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)
    if alfa is not None:
        return Image.fromarray(np.dstack([a, (np.clip(alfa, 0, 1) * 255 + .5).astype(np.uint8)]), 'RGBA')
    return Image.fromarray(a, 'RGB')


def esquinas(im, radio):
    """recorta en cuadrado redondeado (el rx 44 de 200 del favicon)"""
    N = im.size[0]
    m = Image.new('L', (N * 8, N * 8), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, N * 8 - 1, N * 8 - 1], radius=int(radio * N * 8), fill=255)
    im = im.convert('RGBA'); im.putalpha(m.resize((N, N), Image.LANCZOS))
    return im


# ------------------------------------------------------------------ la piedra
def piedra(N, raiz):
    """N x N de la textura del ordenador (vetas finas), con la luz suave de arriba (como #acabadoTema::after)."""
    t = Image.open(raiz / 'marmol-g-pc.webp').convert('RGB')
    # un trozo cuadrado donde cruzan dos vetas, no el centro vacío
    lado = 760
    x0, y0 = 420, 120
    t = t.crop((x0, y0, x0 + lado, y0 + lado)).resize((N, N), Image.LANCZOS)
    a = np.asarray(t).astype(np.float64) / 255
    yy, xx = np.mgrid[0:N, 0:N] / N
    luz = np.exp(-(((xx - .5) / .55) ** 2 + ((yy - .32) / .45) ** 2)) * .045
    return np.clip(a + luz[..., None], 0, 1)


# ------------------------------------------------------------------ relieve (relief3.py 1.3)
U_REF = 8.62
GOLD = [(-0.2, '#2E1E06'), (0.13, '#5A3B0D'), (0.23, '#7A5418'), (0.5, '#B0812C'),
        (0.73, '#DCAE5E'), (0.80, '#EAC572'), (0.91, '#F7DC96'), (1.0, '#FFF0C4')]
CREAM = [(-0.2, '#6E604C'), (0.13, '#8E7E66'), (0.23, '#A6957B'), (0.5, '#CCBCA2'),
         (0.73, '#EEE0C8'), (0.85, '#F8EFDF'), (1.0, '#FFFBF2')]
VEIN_CREAM = '#B99A70'
LIGHT = np.array([-0.55, -0.75, 1.0]); LIGHT = LIGHT / np.linalg.norm(LIGHT)


def ramp(v, stops):
    xs = np.array([s for s, _ in stops]); cs = np.array([rgb(c) for _, c in stops])
    return np.stack([np.interp(v, xs, cs[:, k]) for k in range(3)], -1)


class Noise:
    def __init__(self, rng, shape):
        self.rng, self.shape = rng, shape

    def __call__(self, sigma):
        sigma = max(sigma, 0.35)
        H, W = self.shape
        if sigma > 8:
            f = sigma / 4.0
            small = (int(np.ceil(H / f)) + 4, int(np.ceil(W / f)) + 4)
            n = ndi.gaussian_filter(self.rng.standard_normal(small), 4.0, mode='wrap')
            n = ndi.zoom(n, f, order=3)[:H, :W]
            if n.shape != (H, W):
                n = np.pad(n, ((0, H - n.shape[0]), (0, W - n.shape[1])), mode='edge')
        else:
            n = ndi.gaussian_filter(self.rng.standard_normal(self.shape), sigma)
        return (n - n.mean()) / (n.std() + 1e-9)

    def fbm(self, base, octaves=5):
        out = np.zeros(self.shape); a = 1.0
        for i in range(octaves):
            out += a * self(base / 2 ** i); a *= 0.55
        return out / (out.std() + 1e-9)


def _seg_d(XU, YU, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    t = np.clip(((XU - ax) * vx + (YU - ay) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.hypot(XU - ax - t * vx, YU - ay - t * vy)


def poly_sd(XU, YU, pts):
    d = np.full(XU.shape, 1e9)
    for i in range(len(pts)):
        (ax, ay), (bx, by) = pts[i], pts[(i + 1) % len(pts)]
        d = np.minimum(d, _seg_d(XU, YU, ax, ay, bx, by))
    inside = MPath(pts).contains_points(np.c_[XU.ravel(), YU.ravel()]).reshape(XU.shape)
    return np.where(inside, d, -d)


def ell_sd(XU, YU, rx, ry):
    f = (XU / rx) ** 2 + (YU / ry) ** 2 - 1
    g = 2 * np.sqrt((XU / rx ** 2) ** 2 + (YU / ry ** 2) ** 2) + 1e-6
    return -f / g


def symbol_layer(Wc, Hc, S, ox, oy, p=MASTER, seed=7, bw_gold=2.8, bw_o=3.2, flute_depth=0.75):
    """relief3.symbol_layer tal cual (sin juntas ni brillos de muestra): (color premultiplicado, alfa, sombra)"""
    rng = np.random.default_rng(seed)
    nz = Noise(rng, (Hc, Wc))
    q = S / U_REF
    Yp, Xp = np.mgrid[0:Hc, 0:Wc].astype(np.float64)
    XU = (Xp + 0.5 - ox) / S
    YU = (Yp + 0.5 - oy) / S
    sd_ring = np.minimum(ell_sd(XU, YU, p['a'], p['b']), -ell_sd(XU, YU, p['ai'], p['bi']))
    sd_gold = poly_sd(XU, YU, column_outline(p))
    sd_fl = np.full((Hc, Wc), -1e9)
    w = p['fl_w'] / 2
    for xc in p['flutes']:
        sd_fl = np.maximum(sd_fl, poly_sd(XU, YU, [(xc - w, p['fl_y0']), (xc + w, p['fl_y0']), (xc + w, p['fl_y1']), (xc - w, p['fl_y1'])]))
    flutes = sd_fl > 0

    def shift(a, dx, dy):
        return ndi.shift(a, (dy * S, dx * S), order=1, mode='constant')

    def blur(a, s):
        return ndi.gaussian_filter(a, s * S)

    def shade(h, a=2.4):
        gy, gx = np.gradient(ndi.gaussian_filter(h, max(0.7 * q, 0.35)))
        nx, ny = -a * gx * S, -a * gy * S
        norm = np.sqrt(nx ** 2 + ny ** 2 + 1)
        return (nx * LIGHT[0] + ny * LIGHT[1] + LIGHT[2]) / norm

    aO = np.clip(sd_ring * S + 0.5, 0, 1)
    aG = np.clip(sd_gold * S + 0.5, 0, 1)
    aAll = np.maximum(aO, aG)
    sh1 = blur(shift(aAll, 1.5, 1.9), 2.2)
    sh2 = blur(shift(aAll, 4.6, 5.6), 9.0)
    sh = 1 - (1 - 0.90 * sh1) * (1 - 0.88 * sh2)

    t = np.clip(np.clip(sd_ring, 0, None) / bw_o, 0, 1)
    hO = t * t * (3 - 2 * t)
    colO = ramp(shade(hO), CREAM)
    fO = nz.fbm(260 * q, 5)
    veO = (np.exp(-((fO - 0.4) / 0.022) ** 2) + 0.7 * np.exp(-((fO + 0.7) / 0.018) ** 2)) * np.clip(0.45 + 0.55 * nz(40 * q), 0.1, 1)
    cloud = np.clip(0.5 + 0.5 * nz.fbm(90 * q, 4), 0, 1)
    colO *= (1 - 0.05 * cloud + 0.01 * nz(1.2 * q))[..., None]
    colO = colO * (1 - 0.38 * veO[..., None]) + rgb(VEIN_CREAM) * 0.38 * veO[..., None]
    shg = 1 - (1 - 0.75 * blur(shift(aG, 0.8, 1.1), 1.0)) * (1 - 0.45 * blur(shift(aG, 2.2, 3.0), 3.0))
    colO *= (1 - shg)[..., None]

    hG = np.clip(np.clip(sd_gold, 0, None) / bw_gold, 0, 1)
    dF = np.clip(sd_fl, 0, None)
    hG = np.where(flutes, hG - flute_depth * np.clip(dF / w, 0, 1) * np.clip(hG, 0, 1), hG)
    sG = shade(hG)
    colG = ramp(sG, GOLD)
    grad = 1 + 0.05 * (-XU / 80 - YU / 80)
    br = ndi.gaussian_filter(rng.standard_normal((Hc, Wc)), (max(0.6 * q, 0.35), max(3.0 * q, 0.5)))
    grain = 1 + 0.030 * br / (br.std() + 1e-9) + 0.035 * nz(30 * q) + 0.015 * nz(1.0 * q)
    colG *= (grad * grain)[..., None]
    occ = np.where(flutes, 0.45 + 0.55 * np.clip(1 - dF / w, 0, 1), 1.0)
    colG *= occ[..., None]
    colG = colG + 0.18 * (np.clip(sG - 0.88, 0, 1) / 0.12)[..., None]

    A = aO * (1 - aG) + aG
    prem = colO * (aO * (1 - aG))[..., None] + colG * aG[..., None]
    return np.clip(prem, 0, None), A, 1 - sh


def _down(a, W, H):
    if a.ndim == 2:
        return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((W, H), Image.LANCZOS)).astype(np.float64)
    return np.stack([_down(a[..., c], W, H) for c in range(a.shape[2])], -1)


def relieve_rgba(W, H, S, ox, oy, ss=2):
    """el relieve sin fondo: RGBA con la sombra en negro transparente (como appicon.adaptive_foreground)"""
    prem, A, shm = symbol_layer(W * ss, H * ss, S * ss, ox * ss, oy * ss)
    prem, A, shm = _down(prem, W, H), np.clip(_down(A, W, H), 0, 1), np.clip(_down(shm, W, H), 0, 1)
    alfa = 1 - (1 - A) * shm
    col = np.where(alfa[..., None] > 1e-4, prem / np.maximum(alfa[..., None], 1e-4), 0)
    return np.clip(col, 0, 1), np.clip(alfa, 0, 1)


# ------------------------------------------------------------------ la palabra (con Chrome)
def palabra_rgba(W, H, cy, raiz):
    """TOISÓN en Ibarra Real Nova, crema con su sombra, sobre transparente. cy: línea media de la palabra."""
    from playwright.sync_api import sync_playwright
    fuente = base64.b64encode((raiz / 'fonts' / 'ibarra.woff2').read_bytes()).decode()
    html = f'''<!doctype html><html><head><style>
@font-face{{font-family:Ibarra;src:url(data:font/woff2;base64,{fuente}) format('woff2');font-weight:400 800}}
html,body{{margin:0;background:transparent}}
.w{{position:absolute;left:0;right:0;top:{cy}px;transform:translateY(-50%);text-align:center;padding-left:.16em;
  font:500 112px/1 Ibarra;letter-spacing:.16em;
  background:linear-gradient(180deg,#fffaf0 0%,#f3e6cf 46%,#cdb894 100%);-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 3px 3px rgb(0 0 0/.7)) drop-shadow(0 10px 18px rgb(0 0 0/.55))}}
</style></head><body><div class="w">TOISÓN</div></body></html>'''
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=2)
        pg.set_content(html)
        pg.evaluate('document.fonts.ready')
        png = pg.screenshot(omit_background=True)
        b.close()
    im = Image.open(io.BytesIO(png)).convert('RGBA').resize((W, H), Image.LANCZOS)
    a = np.asarray(im).astype(np.float64) / 255
    return a[..., :3], a[..., 3]


def sobre(c_arr, a_arr, c_ab, a_ab):
    """c_arr/a_arr encima de c_ab/a_ab (colores sin premultiplicar)"""
    a = a_arr + a_ab * (1 - a_arr)
    c = (c_arr * a_arr[..., None] + c_ab * (a_ab * (1 - a_arr))[..., None]) / np.maximum(a[..., None], 1e-6)
    return c, a


# ------------------------------------------------------------------ las piezas
def favicon_svg():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200">
<defs><radialGradient id="f" cx="50%" cy="32%" r="78%"><stop offset="0" stop-color="#161616"/><stop offset=".55" stop-color="#070707"/><stop offset="1" stop-color="#000"/></radialGradient>
<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7dfa8"/><stop offset=".52" stop-color="#e3b45f"/><stop offset="1" stop-color="#b5863a"/></linearGradient>
<linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf3e6"/><stop offset="1" stop-color="#e2d2bb"/></linearGradient>
<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2.2" stdDeviation="2.4" flood-color="#000" flood-opacity=".7"/></filter></defs>
<rect x="-100" y="-100" width="200" height="200" rx="44" fill="url(#f)"/><g transform="translate(0 4.5) scale(0.98)" filter="url(#s)"><path d="M-80.9 0A80.9 50 0 1 1 80.9 0A80.9 50 0 1 1 -80.9 0ZM-54.1 0A54.1 46.4 0 1 0 54.1 0A54.1 46.4 0 1 0 -54.1 0Z" fill="url(#o)"/><path d="M-61.15 -76L61.15 -76L61.15 -66.7L16.25 -66.7L9.05 -57L12.25 60L20.5 60L20.5 67.2L-20.5 67.2L-20.5 60L-12.25 60L-9.05 -57L-16.25 -66.7L-61.15 -66.7ZM-6.45 -40.5L-6.45 38.5L-4.55 38.5L-4.55 -40.5ZM-0.95 -40.5L-0.95 38.5L0.95 38.5L0.95 -40.5ZM4.55 -40.5L4.55 38.5L6.45 38.5L6.45 -40.5Z" fill="url(#m)"/></g></svg>
'''


def icono_pequeno(n):
    """16 y 32: la rejilla de small.py, plano, sobre negro con esquinas del favicon"""
    p = SMALL[n]
    fondo = np.zeros((n, n, 3)) + rgb('#050505')
    img = plano(p, n, n, 1.0, p['cx'], p['cy'], fondo, ss=16, metal=False)
    return esquinas(a_img(img), 44 / 200)


def icono(N, frac, redondo):
    """el símbolo plano sobre la piedra. frac: ancho del símbolo. redondo: esquinas del favicon (si no, a sangre)"""
    k, tx, ty = encajar(N, N, frac)
    ty += 0.0225 * N    # como el translate(0 4.5) del favicon
    img = plano(MASTER, N, N, k, tx, ty, piedra(N, RAIZ), ss=4 if N > 200 else 8)
    im = a_img(img)
    return esquinas(im, 44 / 200) if redondo else im


def portada(raiz):
    """1120 x 640: el relieve con el centro de la O en (558, 249) a 2,08 px por u (lo que dibuja prVec encima)
    y TOISÓN debajo; sin fondo"""
    W, H = 1120, 640
    c1, a1 = relieve_rgba(W, H, 2.08, 558, 249, ss=2)
    c2, a2 = palabra_rgba(W, H, 503, raiz)
    c, a = sobre(c1, a1, c2, a2)
    return a_img(c, a)


def main():
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ
    (dest / 'favicon.svg').write_text(favicon_svg())
    icono_pequeno(16).save(dest / 'toison-16.png', optimize=True)
    icono_pequeno(32).save(dest / 'toison-32.png', optimize=True)
    # los de la pantalla de inicio: a sangre (el sistema les pone su forma); el símbolo al 70 % del ancho, como los de borgoña de la 0.8
    for n in (180, 192, 512):
        icono(n, 0.70, False).save(dest / f'toison-{n}.png', optimize=True)
    # el adaptable: el símbolo dentro del círculo seguro (80 %)
    icono(512, 0.58, False).save(dest / 'toison-maskable-512.png', optimize=True)
    for viejo, nuevo in (('apple-touch-icon.png', 'toison-180.png'), ('icon-192.png', 'toison-192.png'),
                         ('icon-512.png', 'toison-512.png'), ('icon-maskable-512.png', 'toison-maskable-512.png')):
        shutil.copyfile(dest / nuevo, dest / viejo)
    portada(RAIZ).save(dest / 'toison-marmol.webp', quality=86, method=6)
    for f in ('favicon.svg', 'toison-16.png', 'toison-32.png', 'toison-180.png', 'toison-192.png', 'toison-512.png',
              'toison-maskable-512.png', 'toison-marmol.webp'):
        print(f, round((dest / f).stat().st_size / 1024, 1), 'KB')


if __name__ == '__main__':
    main()
