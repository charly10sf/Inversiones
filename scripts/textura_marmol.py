"""La textura del Mármol G (0.8.3): negro AMOLED con vetas grises largas y suaves, sin ninguna de oro.

Sale siempre igual (semillas fijas). Hace las dos que usa la app:
  marmol-g.webp     1170 × 2535, para el móvil (3 px por punto en un móvil de 390)
  marmol-g-pc.webp  2880 × 1800, desde 900 px de ancho

    python scripts/textura_marmol.py [carpeta]   (por defecto, la raíz del repositorio)

Parte de la receta de la maqueta del 6 nov (claude/sesiones-6nov-marmol.md en el Proyecto), calmada esa tarde.

0.8.3c (8 nov): antes salían a 780 × 1690 y 1600 × 1000, a calidad 82. En una pantalla de 2560 la del ordenador se
estiraba 1,6 veces y las vetas se veían borrosas y con dientes (Carlos: «en MUY baja calidad»). Ahora se dibujan más
grandes con el mismo dibujo: lo que se medía en píxeles (la nube de 18 px y el suavizado de 0,6 px de cada veta) se
multiplica por lo que crece la imagen (px), así que se ve igual, solo que nítido. El paso a 8 bits lleva un ruido de
menos de un tono (sin él, la nube oscura salía en escalones) y se guarda a calidad 90. El Mármol dorado y el Marfil
dorado salen de este mismo dibujo, sin pasar por un webp ya comprimido (textura_float).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

# (ancho, alto, escala, px): escala, cuántas vetas caben a lo ancho frente al móvil; px, cuánto crece frente a la
# medida para la que se eligió el dibujo (780 de ancho en el móvil, 1600 en el ordenador)
MOVIL = (1170, 2535, 1.0, 1170 / 780)
PC = (2880, 1800, 1600 / 780, 2880 / 1600)
CALIDAD = 90


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


def capa(img, sem, ang, freq, turb, finura, color, fuerza, temblor, px=1.0):
    """una familia de vetas: largas y onduladas (el temblor fino, casi nada: con más, parecían rayos)"""
    alto, ancho = img.shape[:2]
    y, x = np.mgrid[0:alto, 0:ancho] / ancho
    a = np.radians(ang)
    u = x * np.cos(a) + y * np.sin(a)
    t = ruido(sem, 3, 1.2, alto, ancho) * turb + ruido(sem + 50, 3, 4, alto, ancho) * turb * temblor
    m = (1 - np.abs(np.sin((u * freq + t) * np.pi))) ** finura
    m = m * np.clip((ruido(sem + 100, 3, 1.5, alto, ancho) - 0.42) * 2.2, 0, 1) * fuerza
    m = gaussian_filter(m, 0.6 * px)[..., None]
    return img * (1 - m) + np.array(color, float) * m


# (semilla, ángulo, frecuencia, turbulencia, finura, color, fuerza, temblor)
# 6 nov, tarde: Carlos vio las vetas de la maqueta G (blancas, finas, con resplandor y temblor) «como rayos, nada serio».
# Estas son grises, largas y suaves, sin resplandor: mármol negro pulido. 6 nov, 19:00: la veta ancha (la primera)
# más fina y más floja, que en el ordenador parecía una cinta de seda o humo más que mármol (Carlos: con vetas)
CAPAS = [
    (1, 58, 1.1, 1.1, 32, (120, 118, 114), .42, .03),
    (2, 50, 2.4, 1.3, 40, (150, 148, 144), .45, .03),
    (6, 70, 3.4, 1.2, 120, (170, 168, 164), .30, .02),
]


def textura_float(ancho, alto, escala=1.0, px=1.0):
    """el Mármol G en RGB de 0 a 1, sin pasar a 8 bits (de aquí salen también los dos dorados)"""
    # el fondo, negro con nubes muy suaves (como mucho 16 de 255: sigue siendo negro de AMOLED casi en todo)
    nubes = gaussian_filter(ruido(11, 5, 2, alto, ancho), 18 * px)
    nubes = (nubes - nubes.min()) / (nubes.max() - nubes.min() + 1e-9)
    img = np.zeros((alto, ancho, 3)) + (nubes ** 2)[..., None] * np.array((16, 16, 15.5))
    for sem, ang, freq, turb, fin, col, fz, tem in CAPAS:
        img = capa(img, sem, ang, freq * escala, turb, fin, col, fz, tem, px)
    return np.clip(img, 0, 255) / 255


def a_imagen(a, sem=7):
    """de RGB 0–1 a 8 bits, con un ruido triangular de menos de un tono para que los degradados oscuros no salgan en escalones"""
    rng = np.random.default_rng(sem)
    n = rng.random(a.shape[:2]) - rng.random(a.shape[:2])
    return Image.fromarray(np.clip(a * 255 + n[..., None] + .5, 0, 255).astype(np.uint8), 'RGB')


def textura(ancho, alto, escala=1.0, px=1.0):
    return a_imagen(textura_float(ancho, alto, escala, px))


def main():
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent
    for nombre, medida in (('marmol-g.webp', MOVIL), ('marmol-g-pc.webp', PC)):
        textura(*medida).save(dest / nombre, quality=CALIDAD, method=6)
        print(nombre, round((dest / nombre).stat().st_size / 1024, 1), 'KB')


if __name__ == '__main__':
    main()
