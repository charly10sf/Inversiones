"""El Mármol dorado de Toisón Dorado (0.8.3a): el Mármol G con las vetas teñidas de oro al 50 %.

Receta elegida por Carlos el 7 nov (claude/sesion-temas-toison-dorado.md del Proyecto): L = media de RGB; t = L / max(L);
oro = mapa de t con paradas (0 → negro, 0,25 → rgb(.28,.20,.08), 0,60 → rgb(.73,.56,.29), 1 → rgb(.94,.86,.66));
salida = original × 0,5 + oro × 0,5 × 1,05, recortada a [0, 1]. Sale del mismo dibujo que el Mármol G
(textura_marmol.py), a la misma medida:
  marmol-dorado.webp     1170 × 2535, para el móvil
  marmol-dorado-pc.webp  2880 × 1800, desde 900 px de ancho

    python scripts/textura_marmol_dorado.py [carpeta]   (por defecto, la raíz del repositorio)

0.8.3c (8 nov): antes se teñían los webp del Mármol G ya comprimidos (con sus cuadraditos de 16 px, que la 0.8.3b
alisaba) y a 1600 × 1000; en una pantalla grande las vetas de oro se veían borrosas y con dientes. Ahora se tiñe el
dibujo sin comprimir (textura_float), así que ya no hace falta alisar nada.
"""
import sys
from pathlib import Path

import numpy as np

from textura_marmol import CALIDAD, MOVIL, PC, a_imagen, textura_float

PARADAS = [(0.0, (0, 0, 0)), (0.25, (.28, .20, .08)), (0.60, (.73, .56, .29)), (1.0, (.94, .86, .66))]


def dorar(a):
    """a: el Mármol G en RGB de 0 a 1; devuelve el Mármol dorado, también de 0 a 1"""
    lum = a.mean(axis=2)
    t = lum / max(lum.max(), 1e-9)
    xs = [p for p, _ in PARADAS]
    oro = np.stack([np.interp(t, xs, [c[i] for _, c in PARADAS]) for i in range(3)], axis=2)
    return np.clip(a * .5 + oro * .5 * 1.05, 0, 1)


def main():
    raiz = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    for nombre, medida in (('marmol-dorado.webp', MOVIL), ('marmol-dorado-pc.webp', PC)):
        a_imagen(dorar(textura_float(*medida))).save(raiz / nombre, quality=CALIDAD, method=6)
        print(nombre, (raiz / nombre).stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
