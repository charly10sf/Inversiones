"""El Mármol dorado de Toisón Dorado (0.8.3a): el Mármol G con las vetas teñidas de oro al 50 %.

Receta elegida por Carlos el 7 nov (claude/sesion-temas-toison-dorado.md del Proyecto): L = media de RGB; t = L / max(L);
oro = mapa de t con paradas (0 → negro, 0,25 → rgb(.28,.20,.08), 0,60 → rgb(.73,.56,.29), 1 → rgb(.94,.86,.66));
salida = original × 0,5 + oro × 0,5 × 1,05, recortada a [0, 1]. Sale de las dos texturas del Mármol G:
  marmol-g.webp     → marmol-dorado.webp
  marmol-g-pc.webp  → marmol-dorado-pc.webp

    python scripts/textura_marmol_dorado.py [carpeta]   (por defecto, la raíz del repositorio)

0.8.3b (revisión del 8 nov): el Mármol G trae los cuadraditos de 16 px de su compresión en la nube oscura; en gris no se
ven, pero teñidos de oro sí (escalones junto a la tabla de Posiciones). Antes de teñir se alisa la nube y se dejan las
vetas como estaban: veta = lo que es más claro que su entorno (desenfoque de 12 px) en más de 0,005, del todo a partir de
0,02; el resto se cambia por su desenfoque de 10 px. Se guarda a calidad 95 (a 90 la compresión vuelve a hacer cuadros).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

PARADAS = [(0.0, (0, 0, 0)), (0.25, (.28, .20, .08)), (0.60, (.73, .56, .29)), (1.0, (.94, .86, .66))]


def alisar(img, r_nube=10, r_entorno=12, desde=.005, hasta=.02):
    """La nube sin los cuadros de la compresión; las vetas, intactas. Devuelve RGB en [0, 1]."""
    src = img.convert('RGB')
    a = np.asarray(src, dtype=np.float64) / 255
    nube = np.asarray(src.filter(ImageFilter.GaussianBlur(r_nube)), dtype=np.float64) / 255
    entorno = np.asarray(src.filter(ImageFilter.GaussianBlur(r_entorno)), dtype=np.float64) / 255
    veta = np.clip((a.mean(axis=2) - entorno.mean(axis=2) - desde) / (hasta - desde), 0, 1)
    veta = np.asarray(Image.fromarray((veta * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1)), dtype=np.float64)[..., None] / 255
    return np.clip(a * veta + nube * (1 - veta), 0, 1)


def dorar(img):
    a = alisar(img)
    lum = a.mean(axis=2)
    t = lum / max(lum.max(), 1e-9)
    xs = [p for p, _ in PARADAS]
    oro = np.stack([np.interp(t, xs, [c[i] for _, c in PARADAS]) for i in range(3)], axis=2)
    sal = np.clip(a * .5 + oro * .5 * 1.05, 0, 1)
    return Image.fromarray((sal * 255 + .5).astype(np.uint8), 'RGB')


def main():
    raiz = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    for de, a in (('marmol-g.webp', 'marmol-dorado.webp'), ('marmol-g-pc.webp', 'marmol-dorado-pc.webp')):
        dorar(Image.open(raiz / de)).save(raiz / a, quality=95, method=6)
        print(a, (raiz / a).stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
