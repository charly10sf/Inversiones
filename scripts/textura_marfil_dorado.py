"""El Marfil dorado de Toisón Dorado (0.8.3a): un mármol crema con vetas de oro, sacado de las mismas vetas del Mármol G.

Elegido por Carlos el 8 nov (claude/sesion-marfil-dorado.md del Proyecto), la propuesta «A · Crema Marfil»:
L = media de RGB del Mármol G; t = L / percentil 99,7 de L (recortado a 1) y v = t ** 1,25 son las vetas;
nube = L / percentil 75 (recortada a 1) es la nube de fondo. Base = fondo de Marfil (#ede1cc) con un 5 % de
#d9c39c donde hay nube; oro = de #a87a2a (veta fina) a #e3b45f (veta gorda) según v; salida = base × (1 − k) + oro × k
con k = v × 0,85 (como mucho 0,85). Sale del mismo dibujo que el Mármol G (textura_marmol.py), a la misma medida:
  marfil-dorado.webp     1170 × 2535, para el móvil
  marfil-dorado-pc.webp  2880 × 1800, desde 900 px de ancho

    python scripts/textura_marfil_dorado.py [carpeta]   (por defecto, la raíz del repositorio)

0.8.3c (8 nov): antes salía del webp del Mármol G ya comprimido y a 1600 × 1000; ahora, del dibujo sin comprimir
(textura_float) y más grande, como los otros dos.
"""
import sys
from pathlib import Path

import numpy as np

from textura_marmol import CALIDAD, MOVIL, PC, a_imagen, textura_float

FONDO = np.array([0xed, 0xe1, 0xcc]) / 255
NUBE = np.array([0xd9, 0xc3, 0x9c]) / 255
ORO_FINO = np.array([0xa8, 0x7a, 0x2a]) / 255
ORO_GORDO = np.array([0xe3, 0xb4, 0x5f]) / 255


def marfil(a):
    """a: el Mármol G en RGB de 0 a 1; devuelve el Marfil dorado, también de 0 a 1 (los percentiles no dependen de la escala)"""
    lum = a.mean(axis=2)
    v = np.clip(lum / max(np.percentile(lum, 99.7), 1e-9), 0, 1) ** 1.25
    nube = np.clip(lum / max(np.percentile(lum, 75), 1e-9), 0, 1)[..., None]
    base = FONDO * (1 - .05 * nube) + NUBE * (.05 * nube)
    oro = ORO_FINO * (1 - v[..., None]) + ORO_GORDO * v[..., None]
    k = np.clip(v * .85, 0, .85)[..., None]
    return np.clip(base * (1 - k) + oro * k, 0, 1)


def main():
    raiz = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    for nombre, medida in (('marfil-dorado.webp', MOVIL), ('marfil-dorado-pc.webp', PC)):
        a_imagen(marfil(textura_float(*medida))).save(raiz / nombre, quality=CALIDAD, method=6)
        print(nombre, (raiz / nombre).stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
