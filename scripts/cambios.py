"""Registro de cambios detallado (cambios.json) a partir del historial de git.

Cada versión de NOVEDADES (index.html) tiene su día y su hora de publicación; los commits que tocan código
(la web, los scripts, la app de Android, las Actions o las traducciones) se reparten entre versiones por esa
hora. Los commits que solo guardan datos (cartera, instrumentos, análisis) no salen: son privados.

Uso: python3 scripts/cambios.py [--pendiente archivo.txt]
  --pendiente: texto del commit que aún no está hecho (asunto en la primera línea y viñetas debajo), para
  que la versión que se va a publicar salga ya con su detalle.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CODIGO = ["index.html", "sw.js", "en.json", "scripts", "android", ".github"]
FUERA = re.compile(r"^(Co-Authored-By|Claude-Session|Signed-off-by):", re.I)


def versiones():
    html = (RAIZ / "index.html").read_text(encoding="utf-8")
    out = []
    for m in re.finditer(r"\{ v: '([\d.]+)', f: '([\d-]+)'(?:, h: '([\d:]+)')?, t: '((?:[^'\\]|\\.)*)'", html):
        v, f, h, t = m.groups()
        out.append({"v": v, "f": f, "h": h or "23:59", "t": t.replace("\\'", "'")})
    return sorted(out, key=lambda x: (x["f"], x["h"]))


def commits():
    sep = "\x1e"
    txt = subprocess.run(
        ["git", "log", "--reverse", "--date=format-local:%Y-%m-%d %H:%M", f"--format={sep}%ad%n%s%n%b", "--", *CODIGO],
        cwd=RAIZ, capture_output=True, text=True, check=True,
    ).stdout
    out = []
    for bloque in txt.split(sep)[1:]:
        lineas = bloque.strip("\n").split("\n")
        cuando, asunto = lineas[0], (lineas[1] if len(lineas) > 1 else "").strip()
        asunto = re.sub(r"\s*\(sin publicar\)", "", asunto)  # lo que se preparaba en una rama antes de publicar
        detalle = [l.strip().lstrip("-• ").strip() for l in lineas[2:] if l.strip() and not FUERA.match(l.strip())]
        if re.match(r"^Prueba temporal", asunto, re.I):
            continue  # pruebas de las Actions que se quitan enseguida: no son cambios de la app
        out.append({"cuando": cuando, "asunto": asunto, "detalle": detalle})
    return out


def main():
    vs = versiones()
    if not vs:
        sys.exit("No encuentro NOVEDADES en index.html")
    por = {x["v"]: [] for x in vs}
    for c in commits():
        destino = next((x["v"] for x in vs if c["cuando"] <= f"{x['f']} {x['h']}"), vs[-1]["v"])
        por[destino].append(c)
    if "--pendiente" in sys.argv:
        t = Path(sys.argv[sys.argv.index("--pendiente") + 1]).read_text(encoding="utf-8").strip().split("\n")
        det = [l.strip().lstrip("-• ").strip() for l in t[1:] if l.strip() and not FUERA.match(l.strip())]
        por[vs[-1]["v"]].append({"cuando": f"{vs[-1]['f']} {vs[-1]['h']}", "asunto": t[0].strip(), "detalle": det})
    salida = [{**x, "commits": por[x["v"]][::-1]} for x in vs[::-1]]
    (RAIZ / "cambios.json").write_text(json.dumps({"versiones": salida}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"cambios.json: {len(salida)} versiones, {sum(len(x['commits']) for x in salida)} cambios")


if __name__ == "__main__":
    main()
