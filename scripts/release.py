"""El release de GitHub de cada versión: nombre y descripción, sacados de NOVEDADES (index.html) y de cambios.json.

Uso:
  python3 scripts/release.py --version 0.2.3 --nombre   -> «0.2.3: Cartera nueva y los días sin bolsa»
  python3 scripts/release.py --version 0.2.3            -> la descripción en Markdown
  python3 scripts/release.py --todas                    -> todas las versiones, de la primera a la última, en JSON
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
REPO = "charly10sf/Inversiones"
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
CADENA = r"'((?:[^'\\]|\\.)*)'"


def limpio(t):
    return t.replace("\\'", "'")


def versiones():
    html = (RAIZ / "index.html").read_text(encoding="utf-8")
    i = html.index("const NOVEDADES = [")
    j = html.index("\n];", i)
    bloque = html[i:j]
    cabeceras = list(re.finditer(r"\n  \{ v: '([\d.]+)', f: '([\d-]+)'(?:, h: '([\d:]+)')?, t: " + CADENA, bloque))
    out = []
    for k, m in enumerate(cabeceras):
        fin = cabeceras[k + 1].start() if k + 1 < len(cabeceras) else len(bloque)
        cosas = [(limpio(a), limpio(b)) for a, b in re.findall(r"t: " + CADENA + r", x: " + CADENA, bloque[m.end():fin])]
        v, f, h, t = m.groups()
        out.append({"v": v, "f": f, "h": h or "", "t": limpio(t), "cosas": cosas})
    return sorted(out, key=lambda x: [int(n) for n in x["v"].split(".")])


def cambios():
    try:
        datos = json.loads((RAIZ / "cambios.json").read_text(encoding="utf-8"))
        return {x["v"]: x.get("commits", []) for x in datos.get("versiones", [])}
    except Exception:
        return {}


def fecha(f, h):
    a, m, d = (int(x) for x in f.split("-"))
    return f"el {d} de {MESES[m - 1]} de {a}" + (f" a las {h}" if h else "")


def nombre(x):
    return f"{x['v']}: {x['t']}"


def cuerpo(x, anterior, cam):
    l = [f"Publicada {fecha(x['f'], x['h'])}.", ""]
    if x["cosas"]:
        l += ["### Novedades", ""]
        l += [f"- **{t}.** {d}" if not t.endswith((".", "?", "!")) else f"- **{t}** {d}" for t, d in x["cosas"]]
        l.append("")
    hechos = cam.get(x["v"], [])
    if hechos:
        l += ["### Todos los cambios", ""]
        for c in hechos[::-1]:
            l.append(f"- {c['asunto']}")
            l += [f"  - {d}" for d in c.get("detalle", [])[:12]]
        l.append("")
    if anterior:
        l.append(f"[Todas las diferencias con la {anterior['v']}](https://github.com/{REPO}/compare/v{anterior['v']}...v{x['v']})")
    return "\n".join(l).strip() + "\n"


def main():
    vs, cam = versiones(), cambios()
    if "--todas" in sys.argv:
        print(json.dumps([{"v": x["v"], "f": x["f"], "h": x["h"], "nombre": nombre(x), "cuerpo": cuerpo(x, vs[k - 1] if k else None, cam)} for k, x in enumerate(vs)], ensure_ascii=False))
        return
    v = sys.argv[sys.argv.index("--version") + 1]
    k = next(i for i, x in enumerate(vs) if x["v"] == v)
    print(nombre(vs[k]) if "--nombre" in sys.argv else cuerpo(vs[k], vs[k - 1] if k else None, cam), end="" if "--nombre" in sys.argv else "")


if __name__ == "__main__":
    main()
