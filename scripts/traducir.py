#!/usr/bin/env python3
"""0.4: lo que escribe Gemini en la Action, también en inglés.

Uso: python scripts/traducir.py instrumentos.json anterior/ salida/

Lo llama la Action después de informe.py. Junta los textos en español del informe de prensa (informe.json), de la
decisión de ideas y de las lecturas de prensa de cada empresa (escaneo.json) y los titulares de lo que sigue
GrowFolio (precios.json); los que aún no tiene traducidos se los pasa a Gemini (el modelo más barato, Flash-Lite)
por tandas, y lo guarda todo en traduccion-en.json: {clave del texto en español: el texto en inglés}. Cada texto se
traduce una sola vez; lo que deja de usarse se borra a los tres días. La web en inglés cambia los textos al cargarlos.

La clave es FNV-1a de 32 bits sobre las unidades UTF-16 del texto más su largo, igual que claveTr() en la web.
"""
import datetime as dt
import json
import os
import re
import sys
import time

import informe as I  # noqa: E402  (las llamadas a Gemini, con sus reintentos y su clave en cabecera o en la dirección)

MODELO_TRAD = os.environ.get("GEMINI_TRAD", "gemini-3.5-flash-lite")
LOTE = 60          # textos por llamada
MAX_LLAMADAS = 8   # llamadas por pasada, como mucho (contando las tandas partidas): lo que falte, en la siguiente
TIEMPO_MAX = 300   # segundos para traducir en cada pasada, para no comerse los 20 minutos de la Action
DIAS_GUARDA = 3    # lo que deja de usarse se queda este tiempo por si vuelve
DIAS_FALLO = 2     # un texto que Gemini no consigue traducir solo no se vuelve a pedir hasta pasados estos días
# claves que no son texto para leer (enlaces, fechas, símbolos, nombres, etiquetas) o subárboles que no se pintan
SALTA = {"u", "f", "d", "h", "s", "id", "n", "modelo", "generado", "impacto", "imp", "urgencia", "confianza", "zona", "dato",
         "fuentes", "noticias", "fuentes_pasada", "gemini", "empresas", "con_noticias", "leidas_24h", "v", "rel", "web"}
ES = re.compile(r"\b(de|del|la|las|los|el|que|para|con|por|una?|está|son|hay|se|su|sus|más|años?|hoy|tras|sin|muy)\b|[áéíóúñ¿¡]", re.I)


def clave(s):
    b = s.encode("utf-16-le")
    h = 0x811C9DC5
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}{len(b) // 2:x}"


def es_espanol(s):
    return len(s) >= 12 and s.count(" ") >= 2 and not s.startswith("http") and len(ES.findall(s)) >= 2


def textos(o, out, prio):
    if isinstance(o, dict):
        for k, v in o.items():
            if k not in SALTA:
                textos(v, out, prio)
    elif isinstance(o, list):
        for v in o:
            textos(v, out, prio)
    elif isinstance(o, str):
        s = o.strip()
        if es_espanol(s) and (s not in out or out[s] > prio):
            out[s] = prio


def leer(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return None


class Parar(Exception):
    """Gemini no responde (red, cupo, clave): no tiene sentido seguir pidiendo en esta pasada."""


def traducir(lista, clave_api):
    """Una tanda: [es] -> [en] en el mismo orden, o None si la respuesta no cuadra. Lanza Parar si Gemini no responde."""
    pide = ("Traduce al inglés cada texto de la lista. Son notas sobre bolsa y empresas que lee un inversor particular "
            "en una app de finanzas personales: inglés natural, sencillo y directo. Reglas: deja las cifras exactamente "
            "como vienen (con su formato español: 1.234,5 €; 5,1 %), los nombres de empresas, índices, tickers, medios "
            "y personas, y lo que vaya entre llaves {así} sin tocar; no añadas ni quites información. Devuelve solo JSON: "
            '{"t": [las traducciones, en el mismo orden y el mismo número que la entrada]}.\n\nTextos:\n'
            + json.dumps(lista, ensure_ascii=False))
    cuerpo = {"contents": [{"role": "user", "parts": [{"text": pide}]}],
              "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json", "maxOutputTokens": 16000}}
    # solo el modelo barato: el principal tiene su propio cupo gratis y lo necesita informe.py
    try:
        r = I.gemini_modelo(cuerpo, clave_api, MODELO_TRAD)
        I.apuntar_uso(MODELO_TRAD, r, "traducir")
    except Exception as e:  # noqa: BLE001  (HTTP, red, tiempo de espera, JSON roto…)
        raise Parar(f"{MODELO_TRAD} no responde ({str(e)[:120]})") from e
    try:
        txt, _ = I.texto_de(r)
        o = I.extraer_json(txt)
    except Exception:  # noqa: BLE001
        o = None
    t = o.get("t") if isinstance(o, dict) else None
    if isinstance(t, list) and len(t) == len(lista) and all(isinstance(x, str) and x.strip() for x in t):
        return [x.strip() for x in t]
    print(f"traducción: {MODELO_TRAD} devolvió otra cosa ({len(t) if isinstance(t, list) else '?'} de {len(lista)})")
    return None


def traducir_todo(falta, clave_api, llamar=traducir):
    """Las tandas que quepan en la pasada. Si una no cuadra, se parte en dos y las mitades van al final de la cola: un
    texto raro no bloquea a los demás. Devuelve ({es: en}, [en tandas que fallaron], [sueltos que no salen])."""
    hecho, dudosos, solos, cola = {}, set(), [], [falta[k:k + LOTE] for k in range(0, len(falta), LOTE)]
    llamadas, inicio = 0, time.monotonic()
    while cola and llamadas < MAX_LLAMADAS and time.monotonic() - inicio < TIEMPO_MAX:
        tanda = cola.pop(0)
        llamadas += 1
        try:
            en = llamar(tanda, clave_api)
        except Parar as e:
            print(f"traducción: {e}; lo que falta, en la siguiente pasada")
            break
        if en:
            hecho.update(zip(tanda, en))
        elif len(tanda) == 1:
            solos.append(tanda[0])
        else:
            dudosos.update(tanda)
            m = len(tanda) // 2
            cola += [tanda[:m], tanda[m:]]
    return hecho, [x for x in dudosos if x not in hecho and x not in solos], solos


def main(ruta_inst, dir_anterior, dir_salida):
    clave_api = os.environ.get("GEMINI_API_KEY", "").strip()
    previo = leer(f"{dir_anterior}/traduccion-en.json") or {}
    t, usado = dict(previo.get("t") or {}), dict(previo.get("u") or {})
    # x: textos de tandas que fallaron (van al final de la cola la próxima vez); n: sueltos que Gemini no consigue
    # traducir, que no se vuelven a pedir hasta pasados unos días
    dudoso, nopedir = dict(previo.get("x") or {}), dict(previo.get("n") or {})
    hoy = dt.date.today().isoformat()

    def guardar(t, usado, dudoso, nopedir):
        with open(f"{dir_salida}/traduccion-en.json", "w", encoding="utf-8") as f:
            json.dump({"v": 1, "generado": I.ahora(), "t": t, "u": usado, "x": dudoso, "n": nopedir,
                       "uso": [x for x in (previo.get("uso") or []) if I.hace_menos_de(x.get("t") or "", 48)] + I.USO}, f,
                      ensure_ascii=False, separators=(",", ":"))

    try:
        # lo que hay que tener en inglés, con prioridad: 0 lo de todos (informe, decisión), 1 las ideas y lo que sigue
        # GrowFolio, 2 los titulares, 3 las lecturas del resto del radar (las más recientes antes)
        hace_falta = {}
        inf = leer(f"{dir_salida}/informe.json")
        if inf:
            textos(inf, hace_falta, 0)
        esc = leer(f"{dir_salida}/escaneo.json") or {}
        dec = esc.get("decision") or {}
        textos(dec, hace_falta, 0)
        destacadas = {x.get("s") for x in (dec.get("ideas") or []) + (dec.get("evitar") or []) if isinstance(x, dict)}
        try:
            instrumentos = json.load(open(ruta_inst, encoding="utf-8"))
            instrumentos = instrumentos if isinstance(instrumentos, list) else instrumentos.get("instrumentos", [])
            destacadas |= {str(i.get("yahoo") or "") for i in instrumentos if isinstance(i, dict)}
        except Exception:  # noqa: BLE001
            pass
        lect = esc.get("lectura") or {}
        for sim, x in sorted(lect.items(), key=lambda kv: str((kv[1] or {}).get("d") or ""), reverse=True):
            textos(x, hace_falta, 1 if sim in destacadas else 3)
        pre = leer(f"{dir_salida}/precios.json") or {}
        for clave_n, lista in (pre.get("noticias") or {}).items():
            # 0.5b: noticias["_region"] no es una lista sino {comunidad: [noticias]} (desde la 0.2.2). Antes se recorría
            # como lista, fallaba toda la traducción y lo de GrowIA no salía nunca en inglés
            if isinstance(lista, dict):
                trozos, prio = [x for x in lista.values() if isinstance(x, list)], 3
            else:
                trozos, prio = [lista if isinstance(lista, list) else []], 2
            for trozo in trozos:
                for n in trozo:
                    s = str((n.get("t") if isinstance(n, dict) else "") or "").strip()
                    if es_espanol(s) and s not in hace_falta:
                        hace_falta[s] = prio

        reciente = (dt.date.today() - dt.timedelta(days=DIAS_FALLO)).isoformat()
        falta = [s for s, p in sorted(hace_falta.items(), key=lambda kv: (clave(kv[0]) in dudoso, kv[1]))
                 if clave(s) not in t and nopedir.get(clave(s), "") < reciente]
        print(f"traducción: {len(hace_falta)} textos en español, {len(falta)} sin traducir")
        hechos = 0
        if clave_api and falta:
            nuevo, dudosos, solos = traducir_todo(falta, clave_api)
            for es, x in nuevo.items():
                t[clave(es)] = x
                dudoso.pop(clave(es), None)
                nopedir.pop(clave(es), None)
            for es in dudosos:
                dudoso[clave(es)] = hoy
            for es in solos:
                nopedir[clave(es)] = hoy
            hechos = len(nuevo)
            if solos:
                print(f"traducción: {len(solos)} textos no salen; se reintentan en {DIAS_FALLO} días")
        print(f"traducción: {hechos} nuevas con {MODELO_TRAD}")

        # lo que se usa ahora, con la fecha de hoy; lo que no, se queda unos días y luego se borra
        for s in hace_falta:
            c = clave(s)
            if c in t:
                usado[c] = hoy
        limite = (dt.date.today() - dt.timedelta(days=DIAS_GUARDA)).isoformat()
        t = {c: v for c, v in t.items() if usado.get(c, "") >= limite}
        usado = {c: d for c, d in usado.items() if c in t}
        dudoso = {c: d for c, d in dudoso.items() if d >= limite}
        nopedir = {c: d for c, d in nopedir.items() if d >= limite}
        guardar(t, usado, dudoso, nopedir)
        print(f"traducción: {len(t)} guardadas")
    except Exception as e:  # noqa: BLE001
        # pase lo que pase, la rama datos se publica entera desde salida/: sin este archivo, se perdería todo lo traducido
        print(f"traducción: error ({e}); se queda la de la pasada anterior")
        guardar(dict(previo.get("t") or {}), dict(previo.get("u") or {}), dict(previo.get("x") or {}), dict(previo.get("n") or {}))


if __name__ == "__main__":
    main(*sys.argv[1:4])
