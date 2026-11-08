"""El Mármol dorado de Toisón Dorado (0.8.3a): el Mármol G con las vetas teñidas de oro al 50 %.

Receta elegida por Carlos el 7 nov (claude/sesion-temas-toison-dorado.md del Proyecto): L = media de RGB; t = L / max(L);
oro = mapa de t con paradas (0 → negro, 0,25 → rgb(.28,.20,.08), 0,60 → rgb(.73,.56,.29), 1 → rgb(.94,.86,.66));
salida = original × 0,5 + oro × 0,5 × 1,05, recortada a [0, 1]. Sale de las dos texturas del Mármol G:
  marmol-g.webp     → marmol-dorado.webp
  marmol-g-pc.webp  → marmol-dorado-pc.webp

    python scripts/textura_marmol_dorado.py [carpeta]   (por defecto, la raíz del repositorio)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

PARADAS = [(0.0, (0, 0, 0)), (0.25, (.28, .20, .08)), (0.60, (.73, .56, .29)), (1.0, (.94, .86, .66))]


def dorar(img):
    a = np.asarray(img.convert('RGB'), dtype=np.float64) / 255
    lum = a.mean(axis=2)
    t = lum / max(lum.max(), 1e-9)
    xs = [p for p, _ in PARADAS]
    oro = np.stack([np.interp(t, xs, [c[i] for _, c in PARADAS]) for i in range(3)], axis=2)
    sal = np.clip(a * .5 + oro * .5 * 1.05, 0, 1)
    return Image.fromarray((sal * 255 + .5).astype(np.uint8), 'RGB')


def main():
    raiz = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    for de, a in (('marmol-g.webp', 'marmol-dorado.webp'), ('marmol-g-pc.webp', 'marmol-dorado-pc.webp')):
        dorar(Image.open(raiz / de)).save(raiz / a, quality=90, method=6)
        print(a, (raiz / a).stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
