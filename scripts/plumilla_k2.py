"""0.8.3a · Los iconos de plumilla de Riesgo, Reparto y Herramientas para la K2 (43b-navegacion.js, ICO_SEC).

Como los de ICONOS_PL (10-pintado.js): la línea central escrita con una plumilla elíptica de 2,2 × 1,1 (los verticales,
el doble de gruesos), puntas rectas, simplificada a 0,12 y en relativo con un decimal. Hace falta shapely
(pip install shapely). Saca un JSON con los tres «d»: python3 scripts/plumilla_k2.py
"""
import math, json
from shapely.geometry import LineString, LinearRing, Polygon
from shapely.ops import unary_union
from shapely import affinity
from shapely.geometry.polygon import orient
W, H = 1.1, 0.55   # semiejes de la plumilla
def arco(cx, cy, r, a0, a1, n=48):
    return [(cx + r*math.cos(math.radians(a0 + (a1-a0)*i/n)), cy + r*math.sin(math.radians(a0 + (a1-a0)*i/n))) for i in range(n+1)]
def bez(p0, p1, p2, p3, n=24):
    o=[]
    for i in range(n+1):
        t=i/n; u=1-t
        o.append((u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0], u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]))
    return o
def trazo(pts, cerrado=False):
    g = LinearRing(pts) if cerrado else LineString(pts)
    g = affinity.scale(g, 1, W/H, origin=(0, 0))
    b = g.buffer(W, quad_segs=16, cap_style='flat', join_style='round')
    return affinity.scale(b, 1, H/W, origin=(0, 0))
def svg(geoms):
    u = unary_union(geoms).simplify(0.12)
    polys = [u] if u.geom_type == 'Polygon' else list(u.geoms)
    out = []; cur = None
    def f(v): s = f'{v:.1f}'.rstrip('0').rstrip('.') ; s = s if s not in ('-0', '') else '0'; return s.replace('0.', '.', 1) if s.startswith('0.') else (s.replace('-0.', '-.', 1) if s.startswith('-0.') else s)
    for p in polys:
        p = orient(p, 1.0)
        for ring in [p.exterior] + list(p.interiors):
            c = [(round(x, 1), round(y, 1)) for x, y in list(ring.coords)[:-1]]
            d = f'M{f(c[0][0])} {f(c[0][1])}l'
            prev = c[0]; parts = []
            for x, y in c[1:]:
                dx, dy = round(x-prev[0], 1), round(y-prev[1], 1)
                if dx == 0 and dy == 0: continue
                a, b = f(dx), f(dy)
                parts.append(a + ('' if b.startswith('-') else ' ') + b if not parts else ((' ' if not a.startswith('-') else '') + a + ('' if b.startswith('-') else ' ') + b))
                prev = (x, y)
            out.append(d + ''.join(parts) + 'z')
    return ''.join(out)
# Riesgo: un escudo con la marca de bien
escudo = [(12, 3.5), (19, 6.1)] + [(19, y) for y in (8, 11.4)][1:] + bez((19, 11.4), (19, 15.7), (16.1, 19), (12, 20.5))[1:] + bez((12, 20.5), (7.9, 19), (5, 15.7), (5, 11.4))[1:] + [(5, 6.1)]
riesgo = svg([trazo(escudo, True), trazo([(8.9, 12.1), (11.1, 14.3), (15.4, 9.9)])])
# Reparto: la tarta con su porción separada
tarta = [(11, 13), (11, 4.4)] + arco(11, 13, 8.6, -90, -360)[1:] + [(11, 13)]
tarta = [(11, 13)] + arco(11, 13, 8.4, -90, -360, 72) + [(11, 13)]
porcion = [(14, 10), (14, 3.6)] + arco(14, 10, 6.4, -90, 0)[1:] + [(14, 10)]
reparto = svg([trazo(tarta[:-1], True), trazo(porcion[:-1], True)])
# Herramientas: una llave inglesa
cab = arco(15.3, 8.7, 4.4, -12, 282, 64)
herr = svg([trazo(cab), trazo([(12.2, 11.8), (4.6, 19.4)])])
print(json.dumps({'riesgo': riesgo, 'reparto': reparto, 'herramientas': herr}, indent=1))
