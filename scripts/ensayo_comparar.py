#!/usr/bin/env python3
"""13 nov 2026 (auditoría): la decisión de las ideas y el informe de la cartera con OTRO código u OTRO modelo, sobre los
mismos datos, para verlos lado a lado. Solo lo lanza el ensayo de «Precios» (precios.yml, trabajo «comparar»). No publica
nada: lo deja todo en una carpeta que la Action sube como artefacto.

Uso: python ensayo_comparar.py <carpeta de scripts> <etiqueta> <instrumentos.json> <datos> <salida> [modelo] [solo-decision]

  <carpeta de scripts>  de dónde se cargan informe.py, precios.py y fichas.py (los de la rama, o los de main bajados aparte)
  <etiqueta>            cómo se llaman los archivos que deja: decision-<etiqueta>.json, informe-<etiqueta>.json…
  <datos>               lo que dejó la pasada del ensayo (radar.json, radar-mas.json, precios.json, noticias-cache.json,
                        escaneo.json) y escaneo-anterior.json (lo publicado antes, de donde sale «lo que dijiste la vez anterior»)
  [modelo]              si se da (claude-sonnet-5-5), todo se pide con ese en vez de con el del radar
  [solo-decision]       no hace el informe

Deja en <salida>: la decisión y el informe, lo que se le mandó a la IA (pedido-*.txt), lo que contestó tal cual
(respuesta-*.txt) y lo que costó (uso-<etiqueta>.json).
"""
import inspect
import json
import os
import shutil
import sys
import tempfile


def main(carpeta, etiqueta, ruta_inst, datos, salida, modelo="", solo_decision=""):
    sys.path.insert(0, os.path.abspath(carpeta))
    import informe as I  # noqa: E402 (se carga de la carpeta que toque)
    import precios as P  # noqa: E402

    if modelo:
        I.CLAUDE_MODELO = modelo
    # aquí no hay prisa: que el lote (mitad de precio) tenga tiempo de salir antes de pedirlo en directo
    I.PRESUPUESTO = 10 ** 6
    I.CLAUDE_ESPERA_SUELTA = 900
    os.makedirs(salida, exist_ok=True)
    de_verdad = I.ia

    def ia(p, que=None, *a, **k):
        que = que or inspect.stack()[1].function
        with open(f"{salida}/pedido-{que}-{etiqueta}.txt", "w", encoding="utf-8") as f:
            f.write((p.get("system") or "") + "\n\n=====\n\n" + I.texto_del_pedido(p))
        msg = de_verdad(p, que, *a, **k)
        with open(f"{salida}/respuesta-{que}-{etiqueta}.txt", "w", encoding="utf-8") as f:
            f.write(I.texto_de(msg)[0])
        return msg
    I.ia = ia

    def leer(nombre):
        return I.leer(f"{datos}/{nombre}") or {}

    # lo mismo que prepara informe.main() antes de decidir
    instrumentos = (I.leer(ruta_inst) or {}).get("instrumentos") or []
    valores = leer("radar.json").get("valores") or []
    todas = valores + [x for x in (leer("radar-mas.json").get("valores") or []) if x.get("s")]
    cache = leer("noticias-cache.json")
    en_radar = {x["s"] for x in todas}
    lectura = {k: v for k, v in (leer("escaneo.json").get("lectura") or {}).items() if k in en_radar}
    previa = leer("escaneo-anterior.json").get("decision")
    medianas = P.per_sector_mediano(valores)
    tuyas = {(i.get("yahoo") or "") for i in instrumentos}
    entre = I.con_ideas_previas(valores, todas, previa) if hasattr(I, "con_ideas_previas") else valores
    try:
        d = I.decidir(lectura, cache, entre, medianas, tuyas, leer("precios.json"), previa=previa)
        with open(f"{salida}/decision-{etiqueta}.json", "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, indent=1)
        print(f"{etiqueta}: decisión con {(d or {}).get('candidatas')} candidatas, ideas {[i.get('s') for i in (d or {}).get('ideas') or []]}, "
              f"evitar {[i.get('s') for i in (d or {}).get('evitar') or []]}")
    except Exception as e:  # noqa: BLE001
        print(f"{etiqueta}: falló la decisión ({str(e)[:300]})")

    if not solo_decision:
        with tempfile.TemporaryDirectory() as tmp:
            vacio, sal = f"{tmp}/anterior", f"{tmp}/salida"
            os.makedirs(vacio)
            os.makedirs(sal)
            for n in ("precios.json", "radar.json"):
                if os.path.exists(f"{datos}/{n}"):
                    shutil.copy(f"{datos}/{n}", sal)
            os.environ["INFORME_FORZAR"] = "1"
            try:
                I.informe_cartera(ruta_inst, vacio, sal)
                if os.path.exists(f"{sal}/informe.json"):
                    shutil.copy(f"{sal}/informe.json", f"{salida}/informe-{etiqueta}.json")
                    print(f"{etiqueta}: informe escrito")
                else:
                    print(f"{etiqueta}: el informe no ha salido")
            except Exception as e:  # noqa: BLE001
                print(f"{etiqueta}: falló el informe ({str(e)[:300]})")

    with open(f"{salida}/uso-{etiqueta}.json", "w", encoding="utf-8") as f:
        json.dump(I.USO, f, ensure_ascii=False, indent=1)
    for x in I.USO:
        print(f"{etiqueta}: {x.get('que')} con {x.get('m')}: {x.get('in')} de entrada, {x.get('out')} de salida, "
              f"{'por lote' if x.get('lote') else 'en directo'}, {x.get('coste'):.4f} US$")
    print(f"{etiqueta}: en total {sum(x.get('coste') or 0 for x in I.USO):.4f} US$")
    if I.CLAUDE_ERRORES:
        print(f"{etiqueta}: errores: {I.CLAUDE_ERRORES}")


# ---------------------------------------------------------------------------------------------------------------------
# 14 nov 2026 (auditoría, quinta parte): la lectura de prensa de las empresas, lado a lado. Lo de arriba compara la decisión
# y el informe; lo que cambia en cómo se lee cada empresa (las notas repetidas, el día de publicación, la relevancia 3) no
# se veía. Dos pasos:
#   python ensayo_comparar.py --muestra <scripts de la rama> <datos> <muestra.json> <cuántas>
#   python ensayo_comparar.py --lecturas <carpeta de scripts> <etiqueta> <datos> <salida>
# El primero elige las empresas (una vez, con el código de la rama, para que todos lean las mismas); el segundo las lee de
# cero con el código de la carpeta que se le dé y deja lecturas-<etiqueta>.json, lo pedido y lo contestado.

def _datos(I, datos):
    def leer(nombre):
        return I.leer(f"{datos}/{nombre}") or {}
    valores = leer("radar.json").get("valores") or []
    todas = valores + [x for x in (leer("radar-mas.json").get("valores") or []) if x.get("s")]
    return leer, valores, todas, leer("noticias-cache.json")


def muestra(carpeta, datos, ruta, cuantas="120"):
    """Las empresas que se leen lado a lado: las que tienen notas repetidas entre lo que se lee, las de relevancia 3, las que
    tienen un artículo de pasada marcado con peso y unas cuantas al azar (siempre las mismas)."""
    import random
    sys.path.insert(0, os.path.abspath(carpeta))
    import informe as I  # noqa: E402
    import fichas as F  # noqa: E402
    leer, _, todas, cache = _datos(I, datos)
    n = int(cuantas)
    lectura = leer("escaneo.json").get("lectura") or {}
    marcas = {**(leer("fichas-mas.json").get("e") or {}), **(leer("fichas.json").get("e") or {})}
    comp = I.compartidas(cache)
    suyas = {x["s"]: I.propias(cache, x, comp) for x in todas}
    con = [x for x in todas if suyas[x["s"]]]
    repes = sorted(((len(suyas[x["s"]][:6]) - len(I.notas_de_empresa(x, suyas[x["s"]][:6])), x["s"]) for x in con), reverse=True)
    repetidas = [s for k, s in repes if k > 0]
    rel3 = [s for s, _ in sorted(((s, le.get("d") or "") for s, le in lectura.items() if (le.get("rel") or 0) >= 3 and suyas.get(s)), key=lambda t: t[1], reverse=True)]

    def con_pasada(x):
        tit = (marcas.get(x["s"]) or {}).get("tit") or {}
        return any(I.de_pasada(t["t"]) and (tit.get(F.clave_titulo(t["t"])) or [0, 0, 0])[2] >= 2 for t in suyas[x["s"]][:6])
    pasada = sorted(x["s"] for x in con if con_pasada(x))
    elegidas, de = [], {}

    def meter(lista, cuantas_, por):
        k = 0
        for s in lista:
            if k >= cuantas_ or len(elegidas) >= n:
                break
            if s not in de:
                elegidas.append(s)
                de[s] = por
                k += 1
    meter([s for s in os.environ.get("ENSAYO_SIEMPRE", "").replace(" ", "").split(",") if suyas.get(s)], n, "caso")   # los casos de la auditoría
    meter(repetidas, round(n * 0.4), "repetidas")
    meter(rel3, round(n * 0.25), "rel3")
    meter(pasada, round(n * 0.2), "pasada")
    resto = sorted(x["s"] for x in con if x["s"] not in de)
    random.Random(14112026).shuffle(resto)
    meter(resto, n, "azar")
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump({"empresas": elegidas, "por": de}, f, ensure_ascii=False, indent=1)
    print(f"muestra: {len(elegidas)} empresas ({', '.join(f'{k} {sum(1 for v in de.values() if v == k)}' for k in ('caso', 'repetidas', 'rel3', 'pasada', 'azar'))}); "
          f"en los datos hay {len(repetidas)} con notas repetidas, {len(rel3)} de relevancia 3 y {len(pasada)} con un artículo de pasada con peso")


def lecturas(carpeta, etiqueta, datos, salida):
    """Lee de cero la prensa de las empresas de la muestra con el código de `carpeta`."""
    import time
    sys.path.insert(0, os.path.abspath(carpeta))
    import informe as I  # noqa: E402
    import precios as P  # noqa: E402
    I.PRESUPUESTO = 10 ** 6
    I.INICIO = time.time()
    I.CLAUDE_ESPERA_LOTE = 1500
    I.CLAUDE_ESPERA_SUELTA = 900
    os.makedirs(salida, exist_ok=True)
    _, valores, todas, cache = _datos(I, datos)
    elegidas = (I.leer(f"{salida}/muestra.json") or {}).get("empresas") or []
    por_s = {x["s"]: x for x in todas}
    quienes = [por_s[s] for s in elegidas if s in por_s]
    k = [0]

    def guardar(cuerpo, msg):
        k[0] += 1
        with open(f"{salida}/pedido-leer-{etiqueta}-{k[0]}.txt", "w", encoding="utf-8") as f:
            f.write((cuerpo.get("system") or "") + "\n\n=====\n\n" + I.texto_del_pedido(cuerpo))
        with open(f"{salida}/respuesta-leer-{etiqueta}-{k[0]}.txt", "w", encoding="utf-8") as f:
            f.write(I.texto_de(msg)[0] if msg else "(sin respuesta)")
    por_lote, en_directo = I.mensajes_por_lote, I.ia

    def lote(pedidos, clave, tope=None):
        res = por_lote(pedidos, clave, tope)
        for i, cuerpo in pedidos.items():
            guardar(cuerpo, res.get(i))
        return res

    def directo(p, que=None, *a, **kw):
        msg = en_directo(p, que, *a, **kw)
        guardar(p, msg)
        return msg
    I.mensajes_por_lote, I.ia = lote, directo
    lectura, fichas = {}, {"e": {}}
    try:
        n = I.leer_lote(lectura, cache, quienes, P.per_sector_mediano(valores), fichas)
        print(f"{etiqueta}: leídas {n} de {len(quienes)} empresas")
    except Exception as e:  # noqa: BLE001
        print(f"{etiqueta}: falló la lectura ({str(e)[:300]})")
    with open(f"{salida}/lecturas-{etiqueta}.json", "w", encoding="utf-8") as f:
        json.dump({"lectura": lectura, "tit": {s: e.get("tit") for s, e in fichas["e"].items()}, "fa": {s: e.get("fa") for s, e in fichas["e"].items()}}, f, ensure_ascii=False, indent=1)
    with open(f"{salida}/uso-lecturas-{etiqueta}.json", "w", encoding="utf-8") as f:
        json.dump(I.USO, f, ensure_ascii=False, indent=1)
    print(f"{etiqueta}: {len(I.USO)} peticiones, {sum(x.get('in') or 0 for x in I.USO)} de entrada, {sum(x.get('out') or 0 for x in I.USO)} de salida, "
          f"{sum(1 for x in I.USO if x.get('lote'))} por lote, en total {sum(x.get('coste') or 0 for x in I.USO):.4f} US$")
    if I.CLAUDE_ERRORES:
        print(f"{etiqueta}: errores: {I.CLAUDE_ERRORES}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--muestra" and 5 <= len(sys.argv) <= 6:
        muestra(*sys.argv[2:])
    elif len(sys.argv) == 6 and sys.argv[1] == "--lecturas":
        lecturas(*sys.argv[2:])
    elif not 6 <= len(sys.argv) <= 8:
        sys.exit(__doc__)
    else:
        main(*sys.argv[1:])
