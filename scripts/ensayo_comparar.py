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


if __name__ == "__main__":
    if not 6 <= len(sys.argv) <= 8:
        sys.exit(__doc__)
    main(*sys.argv[1:])
