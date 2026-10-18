#!/usr/bin/env python3
"""La IA que trabaja aunque la web esté cerrada: escaneo de prensa de toda la bolsa e informe de Gemini.

Uso: python scripts/informe.py instrumentos.json anterior/ salida/

Lo llama la GitHub Action después de precios.py, en cada pasada (cada 20 minutos entre semana):
1. Noticias de un lote de empresas del radar (las que más tiempo llevan sin mirar): Yahoo Finance con
   su resumen y Google Noticias en español. Así se recorren las ~840 empresas varias veces al día.
   Se guardan en noticias-cache.json.
2. Gemini lee la prensa de unas 70 empresas con noticias nuevas y apunta, para cada una, qué ha
   pasado, si es bueno o malo, cuánto importa y si hay un catalizador (escaneo.json, "lectura").
3. Cada 2 horas:
   - el informe de tu cartera y del mercado (informe.json): qué ha pasado, si es bueno o malo, qué
     fuentes coinciden y qué vigilar;
   - la decisión: entre todas las empresas con buenos números y buena prensa, Gemini elige las que
     merecen dinero nuevo y las que conviene evitar, contrastando números y noticias (escaneo.json,
     "decision").
Todo es público y sin cantidades: la cartera cifrada no se toca. Si la clave permite la búsqueda de
Google, el informe además busca en internet.

Necesita el secreto GEMINI_API_KEY en el repositorio. Sin él, solo se actualizan las noticias.
"""
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import yfinance as yf

import precios as P  # noqa: E402  (noticias de Google, contraste de las ideas)

MODELO = os.environ.get("GEMINI_MODELO", "gemini-3.8-flash")
GEMINI = "https://generativelanguage.googleapis.com/v1beta"
HORAS_INFORME = 2          # como mucho uno cada 2 horas
MAX_IDEAS = 0               # las ideas ya no van en el informe: salen del escaneo
LOTE_YAHOO = 45             # empresas por pasada con noticias de Yahoo Finance
LOTE_GOOGLE = 20            # y con Google Noticias en español
LOTE_LECTURA = 70           # empresas que lee Gemini en cada pasada
MAX_NOTICIAS = 8            # noticias guardadas por empresa
DIAS_NOTICIA = 21
CANDIDATAS = 45             # empresas entre las que decide cada 2 horas
DECISION_V = 2              # sube si cambia lo que devuelve la decisión: así se rehace en la siguiente pasada
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


DIAG = {"yahoo_rss": 0, "yahoo_rss_vacias": 0, "yahoo_rss_error": 0, "yahoo_api": 0, "google": 0, "google_error": 0}


def noticias_yahoo(simbolo, n=NOTICIAS_POR_ACTIVO):
    """Noticias de Yahoo Finance de un símbolo con su resumen: primero por su RSS (rápido y sin
    sesión) y, si falla, por la API de yfinance."""
    out = []
    try:
        import email.utils
        import xml.etree.ElementTree as ET
        url = "https://feeds.finance.yahoo.com/rss/2.0/headline?s=" + urllib.parse.quote(simbolo) + "&region=US&lang=en-US"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (inversiones)"})
        raiz = ET.fromstring(urllib.request.urlopen(req, timeout=12).read())
        for it in raiz.iter("item"):
            titulo = (it.findtext("title") or "").strip()
            if not titulo:
                continue
            try:
                fecha = email.utils.parsedate_to_datetime(it.findtext("pubDate")).astimezone(dt.timezone.utc).replace(microsecond=0).isoformat()
            except Exception:  # noqa: BLE001
                fecha = None
            desc = re.sub(r"<[^>]+>", "", it.findtext("description") or "").strip()
            out.append({"t": titulo, "r": desc[:500], "f": (it.findtext("source") or "Yahoo Finance").strip(), "d": fecha, "u": it.findtext("link")})
            if len(out) >= n:
                break
        DIAG["yahoo_rss" if out else "yahoo_rss_vacias"] += 1
        if out:
            return out
    except Exception as e:  # noqa: BLE001
        DIAG["yahoo_rss_error"] += 1
        if DIAG["yahoo_rss_error"] <= 2:
            print(f"rss {simbolo}: {e}")
    if DIAG["yahoo_rss_error"] > 5 and DIAG["yahoo_api"] == 0 and DIAG["yahoo_rss"] == 0:
        return out  # si el RSS no va y la API tampoco ha dado nada, no se pierde tiempo
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
        if out:
            DIAG["yahoo_api"] += 1
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
- Para cada posición: qué ha pasado de verdad en los últimos días (con fechas), si es bueno o
  malo para la acción y por qué, y qué vigilar (fecha o precio). Si no hay nada relevante, dilo en una frase.
- En español de España, frases cortas y concretas, sin avisos legales. Sintetiza: no repitas en una
  sección lo que ya has dicho en otra.
Responde solo con un bloque ```json con este formato:
{
  "resumen": "dos frases cortas como mucho: lo que más afecta hoy a esta cartera y por qué",
  "mercado": [{"t": "título corto", "detalle": "una o dos frases", "impacto": "positivo|negativo|neutral", "fuentes": [1, 2]}],
  "posiciones": {"<id>": {"novedades": "una o dos frases", "impacto": "positivo|negativo|neutral|mixto", "contraste": "qué fuentes coinciden y cuáles no, en pocas palabras", "vigilar": "fecha o precio", "fuentes": [3]}},
  "alertas": [{"t": "algo que pide atención ya", "id": "<id de posición o ticker>", "urgencia": "alta|media"}]
}
Una entrada en "posiciones" por cada posición. "mercado": de 2 a 5. "alertas": de 0 a 4."""


def marcar(dir_salida, clave_id, valor):
    """precios.json lleva la fecha de cada archivo de la IA: la web sabe así cuándo volver a leerlos."""
    ruta = f"{dir_salida}/precios.json"
    p = leer(ruta)
    if p:
        p[clave_id] = valor
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(p, f, ensure_ascii=False, separators=(",", ":"))


def informe_cartera(ruta_inst, dir_anterior, dir_salida, clave):
    """Devuelve True si ha escrito un informe nuevo."""
    previo = leer(f"{dir_anterior}/informe.json")
    destino = f"{dir_salida}/informe.json"

    def marcar_inf(generado):
        marcar(dir_salida, "informe_id", generado)

    def conservar(motivo):
        print(f"informe: {motivo}")
        if previo:
            with open(destino, "w", encoding="utf-8") as f:
                json.dump(previo, f, ensure_ascii=False, separators=(",", ":"))
            marcar_inf(previo.get("generado"))
        return False

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
    marcar_inf(inf["generado"])
    print(f"informe: listo ({len(inf.get('posiciones') or {})} posiciones, búsqueda de Google: {busqueda})")
    return True


# ---------------------------------------------------------------- escaneo de toda la bolsa

def nombre_corto(n, s):
    n = re.sub(r",?\s+(S\.?A\.?U?|S\.?p\.?A\.?|N\.?V\.?|SE|AG|plc|PLC|Inc\.?|Corp\.?|Corporation|Holdings?|Group|Ltd\.?|ASA|AB|Oyj|Company)\b.*$", "", n or "")
    return n.split(",")[0].strip() or s


def cuando(d):
    try:
        x = dt.datetime.fromisoformat(str(d).replace("Z", "+00:00"))
        return x if x.tzinfo else x.replace(tzinfo=dt.timezone.utc)
    except Exception:  # noqa: BLE001
        return None


def huella(lista):
    return hashlib.sha1("|".join(x.get("t", "") for x in lista).encode()).hexdigest()[:10]


def mezclar(cache, sim, nuevas, campo):
    e = cache.setdefault(sim, {"n": []})
    limite = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=DIAS_NOTICIA)
    vistos, out = set(), []
    for x in list(nuevas) + list(e.get("n") or []):
        k = re.sub(r"\W+", "", (x.get("t") or "").lower())[:70]
        f = cuando(x.get("d"))
        if not k or k in vistos or (f and f < limite) or P.RUIDO.search(x.get("t") or ""):
            continue
        vistos.add(k)
        out.append({kk: x.get(kk) for kk in ("t", "r", "f", "d", "u") if x.get(kk)})
    out.sort(key=lambda x: x.get("d") or "", reverse=True)
    e["n"] = out[:MAX_NOTICIAS]
    e[campo] = ahora()


def actualizar_noticias(cache, valores):
    """Noticias de las empresas que más tiempo llevan sin mirar (las nuevas, primero)."""
    lote = sorted(valores, key=lambda x: (cache.get(x["s"]) or {}).get("fy") or "")[:LOTE_YAHOO]
    with cf.ThreadPoolExecutor(max_workers=4) as ex:
        for x, ns in ex.map(lambda x: (x, noticias_yahoo(x["s"], 6)), lote):
            mezclar(cache, x["s"], ns, "fy")
    lote_g = sorted(valores, key=lambda x: (x.get("z") != "España", (cache.get(x["s"]) or {}).get("fg") or ""))[:LOTE_GOOGLE]
    for x in lote_g:
        nombre = nombre_corto(x.get("n"), x["s"])
        try:
            ns = P.noticias(f'"{nombre}" (acciones OR bolsa OR resultados OR analistas OR beneficio OR "precio objetivo")', 5, re.escape(nombre.split()[0]) if nombre.split() else None)
            DIAG["google"] += 1
        except Exception as e:  # noqa: BLE001
            DIAG["google_error"] += 1
            print(f"google {x['s']}: {e}")
            ns = []
        mezclar(cache, x["s"], ns, "fg")
        time.sleep(0.3)
    validos = {x["s"] for x in valores}
    for s in [s for s in cache if s not in validos]:
        del cache[s]
    print(f"escaneo: noticias de {len(lote)} empresas en Yahoo y {len(lote_g)} en Google; {sum(1 for v in cache.values() if v.get('n'))} con noticias")


def datos_idea(x, medianas):
    fav, con = P.contraste_idea(x, medianas)
    return (f"{x.get('n')} ({x['s']}, cotiza en {x.get('z')}, sede en {x.get('pais') or '?'}, {x.get('sector')}): precio {x.get('p')} {x.get('m')}, {x.get('na')} analistas, "
            f"consenso {x.get('r')}, objetivo medio a 12 meses {x.get('obj')} ({x.get('pot')} % de recorrido), PER futuro {x.get('perf')}, "
            f"beneficio esperado {x.get('epsg') if x.get('epsg') is not None else x.get('eg')} %, dividendo {x.get('div') or 0} %, 1 año {x.get('c1a')} %, "
            f"contraste de la web {fav} señales a favor y {con} en contra")


LEER = """Vigilas la prensa de cientos de empresas para un inversor particular español. Para cada empresa
tienes sus datos y sus noticias numeradas (titulares de Google Noticias en español y de Yahoo Finance con
su resumen). Para cada una, en una frase: qué dicen de verdad las noticias (con fecha), si es bueno o
malo para la acción, cuánto importa y si hay un catalizador próximo. Ignora el relleno (anuncios de
productos, gráficos de cotización, notas de prensa vacías, noticias de otra empresa con el mismo nombre).
Solo lo que digan las noticias: nada inventado. En español de España.
Responde con un objeto JSON: {"<ticker>": {"imp": "positivo|negativo|neutral|mixto", "rel": 0-3, "txt": "una frase", "cat": "catalizador y fecha, o vacío", "fuentes": [números]}}
"rel": 0 si no hay nada relevante, 1 poco, 2 importante, 3 cambia la tesis. Una entrada por empresa."""


def leer_lote(lectura, cache, valores, medianas, clave):
    """Gemini lee la prensa de las empresas con noticias que todavía no ha leído (las de mejores
    números, primero)."""
    pend = []
    for x in valores:
        e = cache.get(x["s"]) or {}
        if not e.get("n"):
            continue
        h = huella(e["n"])
        if (lectura.get(x["s"]) or {}).get("h") == h:
            continue
        fav, con = P.contraste_idea(x, medianas)
        pend.append((fav - 0.9 * con + min(x.get("pot") or 0, 50) / 50, x, h))
    pend.sort(key=lambda t: -t[0])
    lote = pend[:LOTE_LECTURA]
    if not lote:
        print("escaneo: nada nuevo que leer")
        return 0
    fuentes, bloques = [], []
    for _, x, _ in lote:
        lineas = []
        for n in (cache[x["s"]]["n"] or [])[:6]:
            fuentes.append(n)
            lineas.append(f"[{len(fuentes)}] {(n.get('d') or '')[:10]} {n.get('f') or ''}: {n['t']}" + (f" — {n['r'][:300]}" if n.get("r") else ""))
        bloques.append(f"## {x['s']}\n{datos_idea(x, medianas)}\n" + "\n".join(lineas))
    hoy = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    cuerpo = {"systemInstruction": {"parts": [{"text": LEER}]}, "contents": [{"role": "user", "parts": [{"text": f"Hoy es {hoy}.\n\n" + "\n\n".join(bloques)}]}],
              "generationConfig": {"maxOutputTokens": 32768, "responseMimeType": "application/json", "thinkingConfig": {"thinkingLevel": "low"}}}
    texto, _ = texto_de(gemini(cuerpo, clave))
    res = extraer_json(texto) or {}
    n = 0
    for _, x, h in lote:
        r = res.get(x["s"])
        if not isinstance(r, dict):
            continue
        fs = []
        for k in r.get("fuentes") or []:
            try:
                f = fuentes[int(k) - 1]
            except (ValueError, IndexError, TypeError):
                continue
            if f.get("u") and len(fs) < 2:
                fs.append({kk: f.get(kk) for kk in ("t", "u", "f", "d")})
        try:
            rel = max(0, min(3, int(r.get("rel") or 0)))
        except (TypeError, ValueError):
            rel = 0
        lectura[x["s"]] = {"d": ahora(), "h": h, "imp": r.get("imp") if r.get("imp") in ("positivo", "negativo", "neutral", "mixto") else "neutral",
                           "rel": rel, "txt": (r.get("txt") or "")[:300], "cat": (r.get("cat") or "")[:160], "fuentes": fs}
        n += 1
    print(f"escaneo: Gemini ha leído la prensa de {n} empresas")
    return n


DECIDIR = """Eres el analista jefe de un inversor particular español que busca dónde poner dinero nuevo a 6-12
meses en acciones sueltas (compra en Trade Republic). Tu equipo ha leído la prensa de cientos de empresas;
aquí tienes las candidatas con sus números (analistas, recorrido, valoración, beneficio esperado, tendencia y
el contraste de siete señales de la web) y lo que dice su prensa reciente, con las noticias numeradas.
Decide tú. Reglas:
- Solo recomiendas una empresa si los números Y la prensa van a favor. Si la prensa contradice a los
  analistas, o depende de una sola fuente, baja la confianza o descártala, y dilo.
- Busca un motor concreto (un catalizador con fecha o un cambio de tendencia), que esté razonablemente
  barata y que el balance aguante.
- El plazo importa: no es lo mismo ganar un 50 % en 3 meses que en 3 años. El objetivo de los analistas es
  a 12 meses; para cada idea estima tú en cuántos meses se puede materializar la mayor parte de la subida
  (por su catalizador) y cuánto esperas que suba en ese plazo (puede ser menos que lo de los analistas).
  Ordena por lo que dan al año, netas de impuestos, no por la subida total.
- Fiscalidad de un residente en España: las ganancias pagan entre el 19 y el 23 %. Los dividendos de
  empresas con sede en Suiza (35 %), Alemania (26,4 %), Italia (26 %), Dinamarca (27 %), Suecia (30 %),
  Finlandia (35 %), Bélgica (30 %), Austria (27,5 %), Irlanda (25 %), Noruega (25 %) o Portugal (25 %) traen
  una retención en origen de la que en la renta solo recupera el 15 %: si el dividendo es una parte
  importante de la tesis, cuéntalo. EEUU (15 %), Países Bajos (15 %), Francia (12,8 %), Reino Unido (0 %) y
  España no le hacen perder nada. Al comprar paga una tasa del 0,2 % en España, 0,4 % en Francia y 0,1 % en Italia.
- Máximo 5 ideas, de mejor a peor. Si ninguna está clara, devuelve "ideas" vacío y explícalo en "comentario".
- Añade hasta 5 empresas a evitar por lo que dice su prensa, aunque los analistas digan comprar.
- En "plazos", para TODAS las candidatas que no descartes por su prensa (aunque no estén entre tus ideas),
  estima en cuántos meses se puede materializar la mayor parte de su subida y cuánto: la web lo usa para
  comparar cualquier idea en "al año". Si no hay un catalizador claro, usa 12 meses y lo de los analistas,
  o menos si la prensa o los números no lo sostienen.
- Nada inventado; cita las noticias por número. En español de España, frases cortas.
Responde con un objeto JSON:
{"comentario": "dos frases: cómo está el panorama y qué has buscado",
 "ideas": [{"s": "ticker", "tesis": "una o dos frases", "catalizador": "qué y cuándo", "riesgo": "...", "contraste": "qué coincide y qué no", "confianza": "alta|media|baja", "plazo_meses": 6, "subida_pct": 20, "fiscalidad": "lo que pagaría o perdería en impuestos, si importa", "fuentes": [n]}],
 "evitar": [{"s": "ticker", "motivo": "...", "fuentes": [n]}],
 "plazos": [{"s": "ticker", "meses": 6, "subida_pct": 15, "por": "qué marca ese plazo, en pocas palabras (por ejemplo: resultados del 6 nov)"}]}"""


def decidir(lectura, cache, valores, medianas, tuyas, clave):
    limite = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
    buenas, malas = [], []
    for x in valores:
        if x["s"] in tuyas:
            continue
        le = lectura.get(x["s"])
        fresca = le and cuando(le.get("d")) and cuando(le["d"]) > limite
        fav, con = P.contraste_idea(x, medianas)
        pot = x.get("pot") or 0
        if fresca and le["rel"] >= 2 and le["imp"] == "negativo" and (x.get("na") or 0) >= 8 and x.get("r") in ("buy", "strong_buy"):
            malas.append((le["rel"] + fav, x))
        prensa = fresca and le["rel"] >= 2 and le["imp"] in ("positivo", "mixto")
        if (prensa and fav >= 3 and pot >= 5) or (fav >= 5 and con == 0 and pot >= 10):
            buenas.append((fav - 0.9 * con + (le["rel"] if prensa else 0) + min(pot, 50) / 25, x))
    buenas.sort(key=lambda t: -t[0])
    malas.sort(key=lambda t: -t[0])
    cands = [x for _, x in buenas[:CANDIDATAS]] + [x for _, x in malas[:10]]
    if not cands:
        return None
    fuentes, bloques = [], []
    for x in cands:
        le = lectura.get(x["s"]) or {}
        lineas = []
        for n in ((cache.get(x["s"]) or {}).get("n") or [])[:3]:
            fuentes.append(n)
            lineas.append(f"[{len(fuentes)}] {(n.get('d') or '')[:10]} {n.get('f') or ''}: {n['t']}")
        prensa = f"Prensa ({le.get('imp')}, relevancia {le.get('rel')}): {le.get('txt')}" + (f" Catalizador: {le.get('cat')}." if le.get("cat") else "") if le else "Prensa: sin leer todavía."
        bloques.append(f"## {x['s']}\n{datos_idea(x, medianas)}\n{prensa}\n" + "\n".join(lineas))
    hoy = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    cuerpo = {"systemInstruction": {"parts": [{"text": DECIDIR}]}, "contents": [{"role": "user", "parts": [{"text": f"Hoy es {hoy}.\n\n" + "\n\n".join(bloques)}]}],
              "generationConfig": {"maxOutputTokens": 32768, "responseMimeType": "application/json", "thinkingConfig": {"thinkingLevel": "high"}}}
    texto, _ = texto_de(gemini(cuerpo, clave))
    d = extraer_json(texto)
    if not d:
        return None
    porsim = {x["s"]: x for x in cands}

    def fs_de(nums):
        out = []
        for k in nums or []:
            try:
                f = fuentes[int(k) - 1]
            except (ValueError, IndexError, TypeError):
                continue
            if f.get("u") and len(out) < 4:
                out.append({kk: f.get(kk) for kk in ("t", "u", "f", "d")})
        return out
    def num(v, lo, hi):
        try:
            v = float(v)
        except (TypeError, ValueError):
            return None
        return v if lo <= v <= hi else None
    ideas = [{**i, "n": (porsim.get(i.get("s")) or {}).get("n"), "fuentes": fs_de(i.get("fuentes")),
              "plazo_meses": num(i.get("plazo_meses"), 1, 60), "subida_pct": num(i.get("subida_pct"), -80, 400)}
             for i in (d.get("ideas") or []) if isinstance(i, dict) and i.get("s") in porsim][:5]
    evitar = [{**i, "n": (porsim.get(i.get("s")) or {}).get("n"), "fuentes": fs_de(i.get("fuentes"))} for i in (d.get("evitar") or []) if isinstance(i, dict) and i.get("s") in porsim][:5]
    plazos = {}
    for i in d.get("plazos") or []:
        if not isinstance(i, dict) or i.get("s") not in porsim:
            continue
        m, sub = num(i.get("meses"), 1, 60), num(i.get("subida_pct"), -80, 400)
        if m and sub is not None:
            plazos[i["s"]] = {"meses": m, "subida_pct": sub, "por": str(i.get("por") or "")[:120]}
    for i in ideas:
        if i.get("plazo_meses") and i.get("subida_pct") is not None and i["s"] not in plazos:
            plazos[i["s"]] = {"meses": i["plazo_meses"], "subida_pct": i["subida_pct"], "por": str(i.get("catalizador") or "")[:120]}
    return {"generado": ahora(), "modelo": MODELO, "v": DECISION_V, "comentario": d.get("comentario") or "", "ideas": ideas, "evitar": evitar, "plazos": plazos, "candidatas": len(cands)}


def main(ruta_inst, dir_anterior, dir_salida):
    clave = (os.environ.get("GEMINI_API_KEY") or "").strip()
    instrumentos = leer(ruta_inst).get("instrumentos") or []
    radar = leer(f"{dir_salida}/radar.json")
    valores = radar.get("valores") or []
    cache = leer(f"{dir_anterior}/noticias-cache.json") or {}
    esc = leer(f"{dir_anterior}/escaneo.json") or {}
    lectura = {k: v for k, v in (esc.get("lectura") or {}).items() if any(x["s"] == k for x in valores)} if valores else (esc.get("lectura") or {})
    decision = esc.get("decision")
    medianas = P.per_sector_mediano(valores)
    tuyas = {(i.get("yahoo") or "") for i in instrumentos}
    if valores:
        try:
            actualizar_noticias(cache, valores)
        except Exception as e:  # noqa: BLE001
            print(f"escaneo: fallaron las noticias ({e})")
        if clave:
            try:
                leer_lote(lectura, cache, valores, medianas, clave)
            except Exception as e:  # noqa: BLE001
                print(f"escaneo: falló la lectura de Gemini ({str(e)[:200]})")
    nuevo = informe_cartera(ruta_inst, dir_anterior, dir_salida, clave)
    viejo = not decision or decision.get("v") != DECISION_V or not hace_menos_de(decision.get("generado") or "", HORAS_INFORME)
    if clave and valores and (nuevo or viejo):
        try:
            d = decidir(lectura, cache, valores, medianas, tuyas, clave)
            if d:
                decision = d
                print(f"escaneo: decisión con {d['candidatas']} candidatas, {len(d['ideas'])} ideas y {len(d['evitar'])} a evitar")
        except Exception as e:  # noqa: BLE001
            print(f"escaneo: falló la decisión de Gemini ({str(e)[:200]})")
    hace24 = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=24)
    salida = {"generado": ahora(), "lectura": lectura, "decision": decision,
              "con_noticias": sum(1 for v in cache.values() if v.get("n")), "leidas_24h": sum(1 for v in lectura.values() if cuando(v.get("d")) and cuando(v["d"]) > hace24),
              "noticias": sum(len(v.get("n") or []) for v in cache.values()), "empresas": len(valores), "fuentes_pasada": DIAG}
    with open(f"{dir_salida}/noticias-cache.json", "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, separators=(",", ":"))
    with open(f"{dir_salida}/escaneo.json", "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))
    marcar(dir_salida, "escaneo_id", salida["generado"])


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
