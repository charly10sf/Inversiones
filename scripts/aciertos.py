#!/usr/bin/env python3
"""0.8.2f: cuánto acierta el radar. USO INTERNO: mide, no se enseña en la app ni se cuenta fuera (publicar resultados pasados
de ideas es publicidad regulada: antes, el abogado de la 0.9).

Uso: python scripts/aciertos.py datos/ [aciertos-anterior.json] [aciertos.json]

Cada pasada (a diario, de lunes a viernes) mira en la rama «datos» lo que el radar y la IA llevan hoy:
  - «idea»:   las ideas de la IA (escaneo.json → decision.ideas),
  - «evitar»: las que la IA dice evitar (decision.evitar),
  - «radar»:  las que la web lleva entre sus mejores (decision.radar),
y apunta cada una la primera vez que sale, con su precio en euros de ese día (radar.json y radar-mas.json, campo «pe») y el
del índice de referencia (Fidelity MSCI World, en historico.json). Una empresa que sigue en la lista no se vuelve a
apuntar; si desaparece más de 7 días y vuelve, es una entrada nueva.
A los 30, 90, 180 y 365 días de cada entrada (la primera pasada desde esa fecha), apunta cuánto ha subido o bajado la
empresa, cuánto el índice y la diferencia (el «exceso»), y lo deja fijo. Con eso saca, por lista y plazo: cuántas entradas
hay, qué parte sube, qué parte gana al índice y el exceso mediano y medio.

Límites que se dicen en el propio archivo: empieza a contar desde la primera pasada (no reconstruye el pasado); el precio
de la empresa no incluye dividendos y el fondo sí; pocas entradas no dicen nada; y quien acierta una vez no es que acierte.
Nunca falla por falta de datos: lo dice y deja el archivo como estaba.
"""
import datetime as dt
import json
import statistics
import sys

HORIZONTES = (30, 90, 180, 365)
REFERENCIA = "fidelity-world"
HUECO_MAX = 7          # días sin salir en la lista para que cuente como entrada nueva
PACIENCIA_DATO = 10    # días de margen antes de dar por perdido el precio de una empresa a su plazo
HUECO_REF = 10         # días como mucho entre la fecha pedida y el último precio del índice
CATEGORIAS = ("idea", "evitar", "radar")


def leer(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {}


def fecha(s):
    return dt.date.fromisoformat(str(s)[:10])


def precios_eur(datos):
    """símbolo → precio en euros de hoy, de las dos listas del radar"""
    out = {}
    for nombre in ("radar.json", "radar-mas.json"):
        for x in leer(f"{datos}/{nombre}").get("valores") or []:
            s = x.get("s")
            p = x.get("pe")
            if p is None and x.get("m") == "EUR":
                p = x.get("p")
            if s and isinstance(p, (int, float)) and p > 0:
                out.setdefault(s, float(p))
    return out


def serie_referencia(datos):
    h = ((leer(f"{datos}/historico.json").get("instrumentos") or {}).get(REFERENCIA)) or []
    return [(str(d), float(p)) for d, p in h if isinstance(p, (int, float)) and p > 0]


def precio_en(serie, dia):
    """último precio de la serie en esa fecha o antes; None si no hay o el último está demasiado lejos"""
    if not serie:
        return None
    dia = str(dia)[:10]
    previo = [(d, p) for d, p in serie if d <= dia]
    if not previo:
        return None
    d, p = previo[-1]
    if (fecha(dia) - fecha(d)).days > HUECO_REF:
        return None
    return p


def listas_de_hoy(datos):
    dec = leer(f"{datos}/escaneo.json").get("decision") or {}
    ideas = [x.get("s") for x in (dec.get("ideas") or []) if isinstance(x, dict) and x.get("s")]
    evitar = [x.get("s") for x in (dec.get("evitar") or []) if isinstance(x, dict) and x.get("s")]
    radar = [s for s in (dec.get("radar") or []) if isinstance(s, str) and s]
    plazos = dec.get("plazos") if isinstance(dec.get("plazos"), dict) else {}
    return {"idea": ideas, "evitar": evitar, "radar": radar}, plazos


def estado_vacio():
    return {"v": 1, "entradas": [], "ultima": None}


def apuntar(estado, hoy, listas, pe, serie, plazos):
    """Altas del día: cada símbolo de cada lista que no tenga una entrada abierta. Devuelve (altas, sin_precio)."""
    altas = sin_precio = 0
    ref = precio_en(serie, hoy)
    for cat in CATEGORIAS:
        for s in dict.fromkeys(listas.get(cat) or []):
            abiertas = [e for e in estado["entradas"] if e["s"] == s and e["cat"] == cat]
            ultima = abiertas[-1] if abiertas else None
            if ultima and (fecha(hoy) - fecha(ultima["vista"])).days <= HUECO_MAX:
                ultima["vista"] = max(ultima["vista"], hoy)
                continue
            p = pe.get(s)
            if p is None or ref is None:
                sin_precio += 1
                continue
            e = {"s": s, "cat": cat, "d": hoy, "pe": round(p, 4), "ref": round(ref, 4), "vista": hoy, "res": {}}
            if cat == "idea" and isinstance(plazos.get(s), dict):
                e["plazo"] = {k: plazos[s].get(k) for k in ("meses", "subida_pct") if plazos[s].get(k) is not None}
            estado["entradas"].append(e)
            altas += 1
    return altas, sin_precio


def evaluar(estado, hoy, pe, serie):
    """Fija el resultado de cada entrada a sus 30, 90, 180 y 365 días, la primera vez que toca. Devuelve cuántos nuevos."""
    nuevos = 0
    ref_hoy = precio_en(serie, hoy)
    for e in estado["entradas"]:
        dias = (fecha(hoy) - fecha(e["d"])).days
        for h in HORIZONTES:
            k = str(h)
            if k in e["res"] or dias < h:
                continue
            p = pe.get(e["s"])
            if p is None or ref_hoy is None:
                # el precio puede faltar un día suelto: se espera un poco antes de darlo por perdido
                if dias >= h + PACIENCIA_DATO:
                    e["res"][k] = {"f": hoy, "sin_dato": True}
                    nuevos += 1
                continue
            r = (p / e["pe"] - 1) * 100
            b = (ref_hoy / e["ref"] - 1) * 100
            e["res"][k] = {"f": hoy, "ret": round(r, 2), "ref": round(b, 2), "exceso": round(r - b, 2)}
            nuevos += 1
    return nuevos


def resumen(estado):
    out = {}
    for cat in CATEGORIAS:
        por_plazo = {}
        entradas = [e for e in estado["entradas"] if e["cat"] == cat]
        for h in HORIZONTES:
            k = str(h)
            con = [e["res"][k] for e in entradas if k in e["res"] and not e["res"][k].get("sin_dato")]
            perdidos = sum(1 for e in entradas if k in e["res"] and e["res"][k].get("sin_dato"))
            if not con and not perdidos:
                continue
            ex = [x["exceso"] for x in con]
            por_plazo[k] = {
                "n": len(con),
                "sin_dato": perdidos,
                "suben_pct": round(100 * sum(1 for x in con if x["ret"] > 0) / len(con), 1) if con else None,
                "ganan_al_indice_pct": round(100 * sum(1 for x in ex if x > 0) / len(ex), 1) if ex else None,
                "exceso_mediano": round(statistics.median(ex), 2) if ex else None,
                "exceso_medio": round(statistics.mean(ex), 2) if ex else None,
            }
        out[cat] = {"entradas": len(entradas), "plazos": por_plazo}
    return out


NOTA = ("Uso interno: no se enseña en la app ni se publica. Cuenta desde la primera pasada, sin reconstruir el pasado. El precio "
        "de la empresa no incluye dividendos y el índice (Fidelity MSCI World, acumulación) sí. Con pocas entradas no dice nada. "
        "«evitar»: ganar al índice aquí es lo contrario de acertar.")


def main(datos, anterior=None, salida=None, hoy=None):
    hoy = hoy or dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    estado = leer(anterior) if anterior else {}
    if not isinstance(estado.get("entradas"), list):
        estado = estado_vacio()
    pe = precios_eur(datos)
    serie = serie_referencia(datos)
    listas, plazos = listas_de_hoy(datos)
    if not pe or not serie or not any(listas.values()):
        print("aciertos: faltan datos (precios, índice o listas del radar); no se toca nada")
        return None
    altas, sin_precio = apuntar(estado, hoy, listas, pe, serie, plazos)
    nuevos = evaluar(estado, hoy, pe, serie)
    estado["ultima"] = hoy
    estado["generado"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    estado["resumen"] = resumen(estado)
    estado["nota"] = NOTA
    print(f"aciertos: {altas} altas, {sin_precio} sin precio, {nuevos} resultados nuevos; {len(estado['entradas'])} entradas en total")
    if salida:
        with open(salida, "w", encoding="utf-8") as f:
            json.dump(estado, f, ensure_ascii=False, separators=(",", ":"))
    return estado


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit("uso: python scripts/aciertos.py datos/ [aciertos-anterior.json] [aciertos.json]")
    main(a[0], a[1] if len(a) > 1 else None, a[2] if len(a) > 2 else None)
