#!/usr/bin/env python3
"""Compara lo que sale de dos pasadas de precios.py hechas a la vez (16 nov 2026): una con el código de main y otra con el
de la rama. Dice cada diferencia, separando lo que es de una bolsa abierta (el precio se mueve entre una petición y otra)
de lo que es de una bolsa cerrada (ahí tiene que salir igual).

Uso: python scripts/equivalencia.py dir_main dir_rama (lo usa el ensayo «equivalencia» de precios.yml)
"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import horario as H  # noqa: E402

# lo que lleva la hora de la pasada y cambia siempre
HORAS = {"generado", "actualizado", "f", "precios", "radar_id", "radar_mas_id", "radar_hist_id", "noticias_generado",
         "noticias_region_generado", "noticias_ideas_generado", "radar_generado", "historico_id", "escaneo_id", "lento"}
ARCHIVOS = ("precios.json", "radar.json", "radar-mas.json", "radar-hist.json", "historico.json", "intradia.json")


def leer(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return None


def diferencias(a, b, ruta=""):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k in HORAS:
                continue
            if k not in a or k not in b:
                yield ruta + "/" + k, a.get(k, "∅"), b.get(k, "∅")
            else:
                yield from diferencias(a[k], b[k], ruta + "/" + k)
    elif isinstance(a, list) and isinstance(b, list) and a and isinstance(a[0], dict) and "s" in a[0]:
        da, db = {x.get("s"): x for x in a}, {x.get("s"): x for x in b}
        for k in sorted(set(da) | set(db), key=str):
            if k not in da or k not in db:
                yield f"{ruta}[{k}]", "∅" if k not in da else "está", "∅" if k not in db else "está"
            else:
                yield from diferencias(da[k], db[k], f"{ruta}[{k}]")
    elif a != b:
        yield ruta, a, b


def simbolo_de(ruta):
    """El símbolo al que se refiere una diferencia (para saber si su bolsa estaba abierta)."""
    if "[" in ruta:
        return ruta.split("[", 1)[1].split("]", 1)[0]
    partes = ruta.strip("/").split("/")
    for i, p in enumerate(partes):
        if p in ("mercados", "extra", "mapa", "s", "p") and i + 1 < len(partes):
            return partes[i + 1]
    return None


def explicada(nombre, ruta, x, y, a, b, seg):
    """17 nov 2026 (revisión): dos diferencias con la bolsa cerrada que no vienen de la rama, y se cuentan aparte:
    «main sin la vela»: en el radar, main enseña como precio el cierre anterior al último que tiene la rama (Yahoo deja la
    vela del día sin cierre pasada la medianoche de su bolsa: main se queda en la víspera; la rama, con lo guardado o
    completado con su último precio); «objetivo en otra moneda»: el precio objetivo de una ficha que las dos piden por su
    lado y Yahoo convierte de moneda al momento (menos de un 0,5 % y con el mismo precio)."""
    if nombre not in ("radar.json", "radar-mas.json") or "[" not in ruta:
        return None
    sim, campo = simbolo_de(ruta), ruta.rsplit("/", 1)[-1]
    va = {v.get("s"): v for v in a.get("valores") or []}.get(sim) or {}
    vb = {v.get("s"): v for v in b.get("valores") or []}.get(sim) or {}
    e = seg.get(sim)
    # (también cuando el último cierre es igual al anterior: ACS.MC, 91,05 el viernes y el lunes; main enseña el viernes
    # con la variación del jueves al viernes y solo cambia la variación)
    if isinstance(e, list) and len(e) >= 4 and va.get("p") is not None \
            and (va.get("p") != vb.get("p") or va.get("v") != vb.get("v")) \
            and abs(float(va["p"]) - float(e[2])) <= 1e-6 * max(1.0, abs(float(e[2]))):
        return "main sin la vela"
    if va.get("p") == vb.get("p") and isinstance(x, (int, float)) and isinstance(y, (int, float)) and y \
            and abs(x / y - 1) < 0.001 and campo in ("pe", "cap", "dve"):
        return "cambio del euro"
    if va.get("p") == vb.get("p") and campo in ("obj", "ta", "tb", "pot"):
        oa, ob = va.get("obj"), vb.get("obj")
        if isinstance(oa, (int, float)) and isinstance(ob, (int, float)) and oa and abs(oa / ob - 1) < 0.005:
            return "objetivo en otra moneda"
    return None


def main(d_main, d_rama):
    ahora = dt.datetime.now(dt.timezone.utc)
    inst = (leer(os.path.join(d_main, "precios.json")) or {}).get("instrumentos") or {}
    seg = (leer(os.path.join(d_rama, "seguimiento.json")) or {}).get("precios") or {}
    total_cerradas = 0
    total_explicadas = {}
    for nombre in ARCHIVOS:
        a, b = leer(os.path.join(d_main, nombre)), leer(os.path.join(d_rama, nombre))
        if a is None and b is None:
            continue
        if a is None or b is None:
            print(f"{nombre}: solo está en {'la rama' if a is None else 'main'}")
            continue
        abiertas, cerradas, otras, explicadas = [], [], [], []
        for ruta, x, y in diferencias(a, b):
            sim = simbolo_de(ruta)
            if sim in inst:
                sim = inst[sim].get("simbolo") or sim
            if sim is None:
                otras.append((ruta, x, y))
            elif H.bolsa_de(sim) is None or H.en_sesion(sim, ahora):
                abiertas.append((ruta, x, y))
            else:
                por = explicada(nombre, ruta, x, y, a, b, seg)
                if por:
                    explicadas.append((ruta, x, y, por))
                    total_explicadas[por] = total_explicadas.get(por, 0) + 1
                else:
                    cerradas.append((ruta, x, y))
        total_cerradas += len(cerradas)
        print(f"{nombre}: {len(cerradas)} diferencias con la bolsa cerrada, {len(explicadas)} explicadas, {len(abiertas)} con la bolsa abierta o sin horario, {len(otras)} otras")
        for titulo, lista in (("CERRADA", cerradas), ("otra", otras), ("abierta", abiertas)):
            for ruta, x, y in lista[:25 if titulo != "abierta" else 8]:
                print(f"   {titulo:8s} {ruta}: {str(x)[:90]} → {str(y)[:90]}")
        for ruta, x, y, por in explicadas[:12]:
            print(f"   ({por}) {ruta}: {str(x)[:60]} → {str(y)[:60]}")
    print(f"total con la bolsa cerrada: {total_cerradas}; explicadas aparte: {total_explicadas or 0}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(*sys.argv[1:])
