#!/usr/bin/env python3
"""Informe de prensa de Gemini: la parte de la IA que trabaja aunque la web esté cerrada.

Uso: python scripts/informe.py instrumentos.json anterior/ salida/

Cada pocas horas (lo llama la GitHub Action después de precios.py):
1. Junta las noticias de los últimos días de cada posición, del mercado y de las ideas mejor
   contrastadas del radar: titulares de Google Noticias (en español) y noticias de Yahoo Finance
   con su resumen (en inglés).
2. Se las pasa a Gemini junto con los datos de la web (precio, analistas, objetivo, tendencia) y le
   pide un informe contrastado: qué ha pasado de verdad, si es bueno o malo para cada una, qué fuentes
   coinciden y cuáles no, y qué vigilar. Si la clave permite la búsqueda de Google, además busca en
   internet por su cuenta.
3. Escribe salida/informe.json (público, sin cantidades: la cartera cifrada no se toca).

Necesita el secreto GEMINI_API_KEY en el repositorio. Sin él, deja el informe anterior tal cual.
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import yfinance as yf

MODELO = os.environ.get("GEMINI_MODELO", "gemini-3.8-flash")
GEMINI = "https://generativelanguage.googleapis.com/v1beta"
HORAS_INFORME = 2          # como mucho uno cada 2 horas
MAX_IDEAS = 12
NOTICIAS_POR_ACTIVO = 8
# para los fondos, las noticias de lo que siguen
NOTICIAS_DE = {"ishares-us": "^GSPC", "amundi-europe": "^STOXX50E", "vanguard-em": "EEM", "vanguard-smallcap": "VSS", "nb-short": None, "phau": "GC=F", "btc": "BTC-USD"}
MERCADO = ["^GSPC", "^STOXX50E", "^IBEX", "BZ=F", "EURUSD=X"]


def ahora():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def leer(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {}


def hace_menos_de(iso, horas):
    try:
        return dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(iso) < dt.timedelta(hours=horas)
    except Exception:  # noqa: BLE001
        return False


def noticias_yahoo(simbolo, n=NOTICIAS_POR_ACTIVO):
    """Noticias de Yahoo Finance de un símbolo, con su resumen. Formato nuevo y antiguo de yfinance."""
    out = []
    try:
        for x in (yf.Ticker(simbolo).get_news(count=n) or [])[:n]:
            c = x.get("content") or x
            titulo = c.get("title")
            if not titulo:
                continue
            url = ((c.get("canonicalUrl") or {}).get("url") or (c.get("clickThroughUrl") or {}).get("url") or c.get("link"))
            fecha = c.get("pubDate") or c.get("displayTime")
            if not fecha and c.get("providerPublishTime"):
                fecha = dt.datetime.fromtimestamp(c["providerPublishTime"], dt.timezone.utc).isoformat()
            out.append({"t": titulo, "r": (c.get("summary") or "")[:500], "f": ((c.get("provider") or {}).get("displayName") or c.get("publisher") or "Yahoo Finance"), "d": fecha, "u": url})
    except Exception as e:  # noqa: BLE001
        print(f"noticias {simbolo}: {e}")
    return out


def peticion(ruta, cuerpo, clave, modo):
    url = f"{GEMINI}/{ruta}" + (f"?key={urllib.parse.quote(clave)}" if modo == "query" else "")
    cab = {"content-type": "application/json"}
    if modo == "cabecera":
        cab["x-goog-api-key"] = clave
    req = urllib.request.Request(url, data=json.dumps(cuerpo).encode(), headers=cab, method="POST")
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.loads(r.read())


MODO = "cabecera"


def gemini(cuerpo, clave):
    """Llama a Gemini. Prueba la clave en la cabecera y, si Google no la acepta así, en la dirección
    (las claves nuevas de AI Studio empiezan por AQ.). Reintenta si Google pide esperar."""
    global MODO
    ruta = f"models/{MODELO}:generateContent"
    ultimo = None
    for k, modo in enumerate([MODO, "query" if MODO == "cabecera" else "cabecera"]):
        for intento in range(3):
            try:
                r = peticion(ruta, cuerpo, clave, modo)
                MODO = modo
                return r
            except urllib.error.HTTPError as e:
                texto = e.read().decode("utf-8", "replace")
                ultimo = f"{e.code}: {texto[:300]}"
                if k == 0 and e.code in (400, 401, 403) and re.search(r"API key|API_KEY|ACCESS_TOKEN_TYPE|UNAUTHENTICATED|credential", texto, re.I):
                    MODO = "query" if modo == "cabecera" else "cabecera"
                    break  # prueba el otro modo
                sin_cupo = e.code == 429 and re.search(r"limit:\s*0\b|free.?tier.*not|not available", texto, re.I)
                if (e.code == 429 and not sin_cupo or e.code >= 500) and intento < 2:
                    espera = 20 * (intento + 1)
                    m = re.search(r'"retryDelay":\s*"(\d+)', texto)
                    if m:
                        espera = min(90, int(m.group(1)) + 2)
                    time.sleep(espera)
                    continue
                raise RuntimeError(ultimo) from e
    raise RuntimeError(ultimo or "sin respuesta")


def texto_de(resp):
    c = (resp.get("candidates") or [{}])[0]
    return "".join(p.get("text", "") for p in ((c.get("content") or {}).get("parts") or []) if not p.get("thought")), c


def extraer_json(texto):
    bloques = re.findall(r"```(?:json)?\s*([\s\S]*?)```", texto)
    cands = list(reversed(bloques))
    i, j = texto.find("{"), texto.rfind("}")
    if i >= 0 and j > i:
        cands.append(texto[i:j + 1])
    for c in cands:
        try:
            o = json.loads(c)
            if isinstance(o, dict):
                return o
        except Exception:  # noqa: BLE001
            pass
    return None


def material(instrumentos, precios, radar):
    """Todo lo que lee Gemini, con cada noticia numerada para que pueda citarla."""
    fuentes, bloques = [], []

    def citar(lista):
        lineas = []
        for x in lista:
            fuentes.append({"t": x["t"], "u": x.get("u"), "f": x.get("f"), "d": x.get("d")})
            n = len(fuentes)
            lineas.append(f"[{n}] {(x.get('d') or '')[:10]} {x.get('f') or ''}: {x['t']}" + (f" — {x['r']}" if x.get("r") else ""))
        return lineas

    N = precios.get("noticias") or {}
    P = precios.get("instrumentos") or {}
    # mercado
    merc = list(N.get("mercado") or [])[:10]
    for s in MERCADO:
        merc += noticias_yahoo(s, 4)
    mm = precios.get("mercados") or {}
    datos_m = "; ".join(f"{v.get('nombre')} {v.get('precio')} ({v.get('variacion_dia')} % hoy, {((v.get('rent') or {}).get('ytd'))} % en el año)" for v in mm.values())
    bloques.append("## Mercado\nDatos: " + datos_m + "\n" + "\n".join(citar(merc)))
    # posiciones
    for inst in instrumentos:
        iid = inst["id"]
        p = P.get(iid) or {}
        a = p.get("analistas") or {}
        t = p.get("tecnico") or {}
        datos = [f"{inst.get('nombre')} ({inst.get('corto')}, {inst.get('tipo')}, id {iid})", f"precio {p.get('precio')} €", f"hoy {p.get('variacion_dia')} %"]
        if a.get("objetivo"):
            datos.append(f"{a.get('num')} analistas, consenso {a.get('recomendacion')}, objetivo medio {a.get('objetivo')} € (rango {a.get('objetivo_bajo')}-{a.get('objetivo_alto')})")
        if t.get("tendencia"):
            datos.append(f"tendencia {t.get('tendencia')}, {t.get('vs_media200')} % sobre su media de 200 sesiones")
        if p.get("proximos_resultados"):
            datos.append(f"próximos resultados {p.get('proximos_resultados')}")
        lista = list(N.get(iid) or [])[:NOTICIAS_POR_ACTIVO]
        sim = NOTICIAS_DE.get(iid, inst.get("yahoo")) if iid in NOTICIAS_DE else (inst.get("yahoo") if inst.get("tipo") == "Acción" else None)
        if sim:
            lista += noticias_yahoo(sim)
        bloques.append(f"## Posición {iid}\n" + ", ".join(str(x) for x in datos) + "\n" + ("\n".join(citar(lista)) if lista else "(sin noticias recientes)"))
    # ideas: las que ya tienen titulares (las mejor contrastadas, elegidas por precios.py)
    NI = precios.get("noticias_ideas") or {}
    porsim = {x["s"]: x for x in (radar.get("valores") or [])}
    for s in list(NI.keys())[:MAX_IDEAS]:
        x = porsim.get(s) or {}
        datos = f"{x.get('n')} ({s}, {x.get('z')}, {x.get('sector')}): precio {x.get('p')} {x.get('m')}, {x.get('na')} analistas, consenso {x.get('r')}, objetivo medio {x.get('obj')} ({x.get('pot')} % de recorrido), PER futuro {x.get('perf')}, 1 año {x.get('c1a')} %"
        lista = list(NI.get(s) or [])[:5] + noticias_yahoo(s, 5)
        bloques.append(f"## Idea {s}\n{datos}\n" + "\n".join(citar(lista)))
    return "\n\n".join(bloques), fuentes


INSTRUCCIONES = """Eres el analista de prensa de una web privada de inversión de un inversor particular español.
Lee las noticias numeradas de cada activo (titulares en español de Google Noticias y noticias de Yahoo
Finance con su resumen) junto con sus datos, y escribe un informe contrastado. Reglas:
- Solo hechos que estén en las noticias o que encuentres buscando en internet; nada inventado. Cita las
  noticias por su número en "fuentes".
- Contrasta: di qué fuentes coinciden y cuáles no. Si solo hay una fuente, dilo. Ignora titulares de
  relleno (anuncios, gráficos de cotización, notas de prensa sin contenido).
- Para cada posición y cada idea: qué ha pasado de verdad en los últimos días (con fechas), si es bueno o
  malo para la acción y por qué, y qué vigilar (fecha o precio). Si no hay nada relevante, dilo en una frase.
- En español de España, frases cortas y concretas, sin avisos legales.
Responde solo con un bloque ```json con este formato:
{
  "resumen": "dos o tres frases: qué mueve hoy los mercados y qué afecta a esta cartera",
  "mercado": [{"t": "título corto", "detalle": "una o dos frases", "impacto": "positivo|negativo|neutral", "fuentes": [1, 2]}],
  "posiciones": {"<id>": {"novedades": "...", "impacto": "positivo|negativo|neutral|mixto", "contraste": "qué fuentes coinciden y cuáles no", "vigilar": "...", "fuentes": [3]}},
  "ideas": {"<ticker>": {"novedades": "...", "impacto": "positivo|negativo|neutral|mixto", "contraste": "...", "riesgo": "...", "fuentes": [7]}},
  "alertas": [{"t": "algo que pide atención ya", "id": "<id de posición o ticker>", "urgencia": "alta|media"}]
}
Una entrada en "posiciones" por cada posición y en "ideas" por cada idea. "mercado": de 2 a 5. "alertas": de 0 a 4."""


def main(ruta_inst, dir_anterior, dir_salida):
    previo = leer(f"{dir_anterior}/informe.json")
    destino = f"{dir_salida}/informe.json"

    def marcar(generado):
        ruta = f"{dir_salida}/precios.json"
        p = leer(ruta)
        if p:
            p["informe_id"] = generado
            with open(ruta, "w", encoding="utf-8") as f:
                json.dump(p, f, ensure_ascii=False, separators=(",", ":"))

    def conservar(motivo):
        print(f"informe: {motivo}")
        if previo:
            with open(destino, "w", encoding="utf-8") as f:
                json.dump(previo, f, ensure_ascii=False, separators=(",", ":"))
            marcar(previo.get("generado"))

    clave = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not clave:
        return conservar("sin GEMINI_API_KEY, se deja el anterior")
    if previo.get("generado") and hace_menos_de(previo["generado"], HORAS_INFORME) and not os.environ.get("INFORME_FORZAR"):
        return conservar("el último tiene menos de 2 horas")
    instrumentos = leer(ruta_inst).get("instrumentos") or []
    precios = leer(f"{dir_salida}/precios.json")
    radar = leer(f"{dir_salida}/radar.json")
    texto, fuentes = material(instrumentos, precios, radar)
    print(f"informe: {len(fuentes)} noticias, {len(texto)} caracteres")
    hoy = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    pedido = f"Hoy es {hoy}.\n\n{texto}"
    base = {"systemInstruction": {"parts": [{"text": INSTRUCCIONES}]}, "contents": [{"role": "user", "parts": [{"text": pedido}]}],
            "generationConfig": {"maxOutputTokens": 32768, "thinkingConfig": {"thinkingLevel": "high"}}}
    busqueda, web = True, []
    try:
        try:
            resp = gemini({**base, "tools": [{"google_search": {}}]}, clave)
        except RuntimeError as e:
            print(f"informe: sin búsqueda de Google ({str(e)[:160]})")
            busqueda = False
            resp = gemini(base, clave)
        texto_r, cand = texto_de(resp)
        for g in ((cand.get("groundingMetadata") or {}).get("groundingChunks") or []):
            w = g.get("web") or {}
            if w.get("uri"):
                web.append({"t": w.get("title") or w["uri"], "u": w["uri"], "f": w.get("title")})
        if not web:
            busqueda = False
        inf = extraer_json(texto_r)
        if not inf or not isinstance(inf.get("posiciones"), dict):
            return conservar("la respuesta de Gemini no trae un informe válido")
    except Exception as e:  # noqa: BLE001
        return conservar(f"falló Gemini: {e}")
    # cada número de fuente pasa a su titular y enlace
    def fuentes_de(nums):
        out = []
        for n in nums or []:
            try:
                f = fuentes[int(n) - 1]
            except (ValueError, IndexError, TypeError):
                continue
            if f.get("u") and f not in out:
                out.append(f)
        return out[:6]
    for grupo in ("posiciones", "ideas"):
        for v in (inf.get(grupo) or {}).values():
            if isinstance(v, dict):
                v["fuentes"] = fuentes_de(v.get("fuentes"))
    for v in inf.get("mercado") or []:
        if isinstance(v, dict):
            v["fuentes"] = fuentes_de(v.get("fuentes"))
    inf.update({"generado": ahora(), "modelo": MODELO, "noticias_leidas": len(fuentes), "busqueda_google": busqueda, "web": web[:15]})
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(inf, f, ensure_ascii=False, separators=(",", ":"))
    marcar(inf["generado"])
    print(f"informe: listo ({len(inf.get('posiciones') or {})} posiciones, {len(inf.get('ideas') or {})} ideas, búsqueda de Google: {busqueda})")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
