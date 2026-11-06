"""La textura del Mármol G (0.8.3): negro AMOLED con vetas blancas marcadas, sin ninguna de oro.

Sale siempre igual (semillas fijas). Hace las dos que usa la app y toison.es:
  marmol-g.webp     780 × 1690, para el móvil
  marmol-g-pc.webp  1600 × 1000, desde 900 px de ancho (la del móvil, estirada, se veía borrosa)

    python scripts/textura_marmol.py [carpeta]   (por defecto, la raíz del repositorio)

Receta de la maqueta del 6 nov (claude/sesiones-6nov-marmol.md en el Proyecto).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom


def ruido(sem, octavas, base, alto, ancho):
    """suma de octavas de rejillas aleatorias ampliadas (cúbica); entre 0 y 1, media 0,5"""
    rng = np.random.default_rng(sem)
    total = np.zeros((alto, ancho))
    amp, suma = 1.0, 0.0
    for o in range(octavas):
        cx = int(base * 2 ** o) + 2
        cy = max(2, int(round(cx * alto / ancho)) + 2)
        r = rng.random((cy, cx))
        g = zoom(r, (alto / cy, ancho / cx), order=3)[:alto, :ancho]
        if g.shape != (alto, ancho):
            g = np.pad(g, ((0, alto - g.shape[0]), (0, ancho - g.shape[1])), mode='edge')
        total += g * amp
        suma += amp
        amp *= 0.5
    return total / suma


def capa(img, sem, ang, freq, turb, finura, color, fuerza, desenfoque):
    alto, ancho = img.shape[:2]
    y, x = np.mgrid[0:alto, 0:ancho] / ancho
    a = np.radians(ang)
    u = x * np.cos(a) + y * np.sin(a)
    t = ruido(sem, 3, 2, alto, ancho) * turb + ruido(sem + 50, 6, 10, alto, ancho) * turb * 0.07
    m = (1 - np.abs(np.sin((u * freq + t) * np.pi))) ** finura
    if desenfoque:
        m = np.maximum(m, gaussian_filter(m, desenfoque) * 0.6)
    m = m * np.clip((ruido(sem + 100, 4, 2, alto, ancho) - 0.42) * 3.2, 0, 1) * fuerza
    m = m[..., None]
    return img * (1 - m) + np.array(color, float) * m


# (semilla, ángulo, frecuencia, turbulencia, finura, color, fuerza, desenfoque)
CAPAS_G = [
    (1, 62, 1.6, 2.2, 34, (238, 236, 232), .78, 2.5),
    (2, 48, 3.2, 3.0, 90, (222, 220, 216), .39, 0),
    (6, 75, 4.0, 2.6, 160, (228, 226, 222), .25, 0),
]


def textura(ancho, alto, escala=1.0):
    nubes = gaussian_filter(ruido(11, 5, 3, alto, ancho), 6)
    nubes = (nubes - nubes.min()) / (nubes.max() - nubes.min() + 1e-9)
    img = np.zeros((alto, ancho, 3)) + nubes[..., None] * np.array((1, 1, 1), float)
    for sem, ang, freq, turb, fin, col, fz, b in CAPAS_G:
        img = capa(img, sem, ang, freq * escala, turb, fin, col, fz, b)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def main():
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    textura(780, 1690).save(dest / 'marmol-g.webp', quality=82, method=6)
    textura(1600, 1000, 1600 / 780).save(dest / 'marmol-g-pc.webp', quality=82, method=6)
    for f in ('marmol-g.webp', 'marmol-g-pc.webp'):
        print(f, round((dest / f).stat().st_size / 1024, 1), 'KB')


if __name__ == '__main__':
    main()
