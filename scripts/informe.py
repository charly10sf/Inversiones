#!/usr/bin/env python3
"""La IA que trabaja aunque la web esté cerrada: escaneo de prensa de toda la bolsa e informe de Gemini.

Uso: python scripts/informe.py instrumentos.json anterior/ salida/

Lo llama la GitHub Action después de precios.py, en cada pasada (cada 20 minutos entre semana):
1. Noticias de un lote de empresas del radar (las que más tiempo llevan sin mirar): Yahoo Finance con
   su resumen y Google Noticias en español. Así se recorren las ~840 empresas varias veces al día.
   Se guardan en noticias-cache.json.
2. Gemini lee la prensa de unas 70 empresas con noticias nuevas y apunta, para cada una, qué ha
   pasado, si es bueno o malo, cuánto importa y si hay un catalizador (escaneo.json, "lectura").
3. Cada 2 horas, el informe de tu cartera y del mercado (informe.json): qué ha pasado, si es bueno o
   malo, qué fuentes coinciden y qué vigilar.
4. Una vez al día, la decisión: entre todas las empresas con buenos números y buena prensa, Gemini elige
   las que merecen dinero nuevo y las que conviene evitar (escaneo.json, "decision"). Con constancia: ve lo
   que dijo la vez anterior, las ideas siguen salvo que llegue una noticia que cambie la tesis o se rompan
   sus números, entran como mucho dos nuevas al día y lo que estas semanas se ha recomendado no pasa a
   "evitar" sin una noticia así. Entre una decisión y la siguiente solo se revisa eso, sin preguntar a Gemini.
   Cada cambio queda apuntado con su motivo ("cambios").
Todo es público y sin cantidades: la cartera cifrada no se toca. Si la clave permite la búsqueda de
Google, el informe además busca en internet.

Necesita el secreto GEMINI_API_KEY en el repositorio. Sin él, solo se actualizan las noticias.
"""
import collections
import concurrent.futures as cf
import datetime as dt
import inspect
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
import fichas as F  # noqa: E402  (0.7: fichas por empresa con seis factores)

MODELO = os.environ.get("GEMINI_MODELO", "gemini-3.8-flash")
GEMINI = "https://generativelanguage.googleapis.com/v1beta"
HORAS_INFORME = 2          # como mucho uno cada 2 horas
HORAS_INFORME_LITE = 6     # con un informe de menos de 6 horas, si el 3.8 y el 3.6 no responden se queda ese (no
                           # se publica uno hecho con Flash-Lite, más flojo); uno de Flash-Lite se rehace en la
                           # siguiente pasada en que el 3.8 o el 3.6 contesten
MAX_IDEAS = 0               # las ideas ya no van en el informe: salen del escaneo
LOTE_YAHOO = 45             # empresas por pasada con noticias de Yahoo Finance
LOTE_GOOGLE = 20            # y con Google Noticias en español
LOTE_LECTURA = 50           # empresas que lee Gemini en cada pasada (0.7: 50, porque ahora clasifica cada titular)
MAX_NOTICIAS = 8            # noticias guardadas por empresa
DIAS_NOTICIA = 21
CANDIDATAS = 40             # empresas entre las que decide
DECISION_V = 6              # sube si cambia lo que devuelve la decisión: así se rehace en la siguiente pasada
HORAS_DECISION = 20         # la decisión se rehace una vez al día; entre medias solo se mira si hay una noticia gorda
DIAS_MEMORIA = 14           # lo recomendado en estos días no pasa a "evitar" sin una noticia que cambie la tesis
NUEVAS_POR_DIA = 2          # ideas nuevas por decisión, como mucho (más si otras salen por una noticia gorda)
DIAS_IDEA = 28              # pasado este tiempo, una idea puede dejar sitio a otra mejor sin noticia de por medio
MAX_IDEAS_DEC = 5
NOTICIAS_POR_ACTIVO = 8
# para los fondos, las noticias de lo que siguen
NOTICIAS_DE = {"ishares-us": "^GSPC", "amundi-europe": "^STOXX50E", "vanguard-em": "EEM", "vanguard-smallcap": "VSS", "nb-short": None, "phau": "GC=F", "btc": "BTC-USD"}
# noticias de Yahoo Finance de los grandes índices y precios de cada zona
MERCADO = ["^GSPC", "^IXIC", "^STOXX50E", "^GDAXI", "^IBEX", "^N225", "^HSI", "EEM", "^TNX", "BZ=F", "GC=F", "EURUSD=X", "BTC-USD"]


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


ERRORES = []                # lo que ha fallado con Gemini en esta pasada (va a escaneo.json para verlo en la web)
FALLOS = []                 # las llamadas que no salieron ni con los modelos de reserva
USADOS = set()              # los modelos que han respondido
RESERVA = ["gemini-3.6-flash", "gemini-3.5-flash-lite"]  # si se acaba el cupo gratuito del modelo principal
# La lectura de prensa va con Flash-Lite (el de más cupo gratis y el más barato): así el 3.8, con 20 peticiones al
# día en el plan gratis, queda para el informe y las ideas. Si a Flash-Lite se le acaba el cupo, el 3.6; nunca el 3.8.
LECTURA = ["gemini-3.5-flash-lite", "gemini-3.6-flash"]
USO = []                    # 0.6d: los tokens de cada llamada de esta pasada (para saber lo que costaría la IA de pago)


def apuntar_uso(modelo, resp, que):
    """Apunta los tokens de una respuesta de Gemini: entrada (y cuánta salió de la caché), salida y razonamiento."""
    u = (resp or {}).get("usageMetadata") or {}
    USO.append({"t": ahora(), "m": modelo, "que": que, "in": u.get("promptTokenCount") or 0, "cache": u.get("cachedContentTokenCount") or 0,
                "out": u.get("candidatesTokenCount") or 0, "pensar": u.get("thoughtsTokenCount") or 0, "herr": u.get("toolUsePromptTokenCount") or 0,
                "busq": bool(((resp or {}).get("candidates") or [{}])[0].get("groundingMetadata"))})


def gemini(cuerpo, clave, reserva=True, modelos=None):
    """Llama a Gemini; si se acaba el cupo del modelo (429), prueba con los de reserva, que tienen su
    propio cupo gratuito. Si un modelo no acepta el nivel de razonamiento, lo quita. `modelos` cambia
    la lista entera (el primero y sus reservas)."""
    que = inspect.stack()[1].function
    orden = list(modelos) if modelos else [MODELO] + ([m for m in RESERVA if m != MODELO] if reserva else [])
    for modelo in orden:
        try:
            r = gemini_modelo(cuerpo, clave, modelo)
            USADOS.add(modelo)
            apuntar_uso(modelo, r, que)
            return r
        except RuntimeError as e:
            txt = str(e)
            if txt.startswith("400") and re.search(r"thinking", txt, re.I):
                gc = dict(cuerpo.get("generationConfig") or {})
                gc.pop("thinkingConfig", None)
                try:
                    r = gemini_modelo({**cuerpo, "generationConfig": gc}, clave, modelo)
                    USADOS.add(modelo)
                    apuntar_uso(modelo, r, que)
                    return r
                except RuntimeError as e2:
                    txt = str(e2)
            ERRORES.append(f"{modelo}: {txt[:160]}")
            if not (txt.startswith("429") or txt.startswith("404") or txt.startswith("5")):
                if reserva:
                    FALLOS.append(txt[:160])
                raise
            print(f"gemini: {modelo} no responde ({txt[:80]}), pruebo otro")
    if reserva:
        FALLOS.append(ERRORES[-1] if ERRORES else "sin respuesta")
    raise RuntimeError(ERRORES[-1] if ERRORES else "sin respuesta")


def gemini_modelo(cuerpo, clave, modelo):
    """Prueba la clave en la cabecera y, si Google no la acepta así, en la dirección (las claves nuevas
    de AI Studio empiezan por AQ.). Reintenta si Google pide esperar."""
    global MODO
    ruta = f"models/{modelo}:generateContent"
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
            zona = f" ({x['z']})" if x.get("z") else ""
            lineas.append(f"[{n}] {(x.get('d') or '')[:10]} {x.get('f') or ''}{zona}: {x['t']}" + (f" — {x['r']}" if x.get("r") else ""))
        return lineas

    N = precios.get("noticias") or {}
    P = precios.get("instrumentos") or {}
    # mercado
    merc = list(N.get("mercado") or [])[:30]
    for s in MERCADO:
        merc += noticias_yahoo(s, 3)
    mm = precios.get("mercados") or {}
    grupos = {}
    for v in mm.values():
        r = v.get("rent") or {}
        grupos.setdefault(v.get("grupo") or "Otros", []).append(
            f"{v.get('nombre')} {round(v['precio'], 4) if isinstance(v.get('precio'), (int, float)) else v.get('precio')} ({v.get('variacion_dia')} % hoy, {r.get('1m')} % en un mes, {r.get('ytd')} % en el año, {r.get('1a')} % a un año)")
    datos_m = "\n".join(f"- {g}: " + "; ".join(xs) for g, xs in grupos.items())
    fx = precios.get("fx") or {}
    if fx:
        datos_m += "\n- Euros por cada unidad de: " + ", ".join(f"{k} {v}" for k, v in fx.items() if isinstance(v, (int, float)))
    bloques.append("## Mercado por zonas\nDatos:\n" + datos_m + "\nNoticias (entre paréntesis, la zona):\n" + "\n".join(citar(merc)))
    # posiciones
    for inst in instrumentos:
        iid = inst["id"]
        p = P.get(iid) or {}
        a = p.get("analistas") or {}
        t = p.get("tecnico") or {}
        datos = [f"{inst.get('nombre')} ({inst.get('corto')}, {inst.get('tipo')}, id {iid})", f"precio {p.get('precio')} €", f"hoy {p.get('variacion_dia')} %"]
        if inst.get("region"):
            datos.append("zonas " + ", ".join(f"{k} {v} %" for k, v in inst["region"].items()))
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
- Mercado: repasa el mundo por zonas (EEUU, Europa, España, Asia, emergentes) y lo que las cruza a todas
  (tipos e inflación, bonos, divisas, materias primas, cripto). Usa los datos de cada zona (hoy, mes, año)
  y las noticias para explicar qué ha movido los precios, con cifras y fechas. En cada punto, "implica":
  qué significa para las posiciones de esta cartera (cuáles y en qué sentido, según sus zonas) o "nada
  directo" si no les toca.
- Macro: los datos que más pesan ahora (tipos del BCE y de la Fed, inflación, bono a 10 años, euro/dólar,
  petróleo...) con su cifra y una frase de lectura para un inversor español. Solo cifras que estén en los
  datos, en las noticias o en lo que encuentres buscando.
- Para cada posición: qué ha pasado de verdad en los últimos días (con fechas), si es bueno o
  malo para la acción y por qué, y qué vigilar (fecha o precio). Si no hay nada relevante, dilo en una frase.
- En español de España, frases cortas y concretas, sin avisos legales. Sintetiza: no repitas en una
  sección lo que ya has dicho en otra.
- Lenguaje llano: lo lee alguien que no es experto. Nada de jerga sin explicar (catalizador, capex,
  amplitud de mercado, soportes, recorrido, múltiplos, rotación sectorial, risk-off...): dilo con palabras
  normales o explícalo en la misma frase. Cada texto corto empieza por lo que significa para quien invierte
  ("malo para tus fondos de EEUU: …") y después el dato.
- Proporción: un movimiento de menos del 1 % en un día, sin una noticia propia, no es ni bueno ni malo:
  "impacto" neutral y dilo así ("apenas se mueve: sigue al mercado"). "positivo" o "negativo" solo con una
  noticia concreta del activo o un movimiento grande. No dramatices.
- Nombra lo que tiene de verdad: sus posiciones son las de los datos (fondos del S&P 500, del mundo, de
  Europa, acciones sueltas...). No le atribuyas "tus tecnológicas" ni nada que no tenga.
- Nada de soportes, resistencias ni niveles técnicos inventados en "vigilar": qué y cuándo, en palabras
  ("resultados del 29 de octubre", "la Fed, el 28 de octubre") o un precio que salga en las noticias. Nunca
  una fecha suelta como 2026-10-28. Si no hay nada concreto, "nada especial".
- No pongas la fecha de hoy en los textos ("este 21 de octubre de 2026"): ya se sabe que es de hoy.
- Los datos de cada zona y de cada posición son los de hoy: si una noticia dice otra cifra (más vieja), manda la de los datos.
- "impacto" y el texto dicen lo mismo: si el texto empieza por "malo para…", el impacto es negativo; si es "bueno para…",
  positivo; si hay de las dos cosas, mixto. Nunca un impacto positivo con un texto que empieza por "malo".
Responde solo con un bloque ```json con este formato:
{
  "resumen": "dos frases cortas como mucho: lo que más afecta hoy a esta cartera y por qué",
  "mercado": [{"zona": "EEUU|Europa|España|Asia|Emergentes|Global", "t": "título corto", "detalle": "dos o tres frases con cifras y fechas", "implica": "una frase: qué supone para esta cartera", "impacto": "positivo|negativo|neutral|mixto", "fuentes": [1, 2]}],
  "macro": [{"t": "qué (BCE, inflación EEUU, bono 10 años...)", "dato": "la cifra, escrita a la española: coma decimal y espacio antes del % (5,12 %; 1,1235)", "lectura": "una frase"}],
  "posiciones": {"<id>": {"novedades": "una o dos frases", "impacto": "positivo|negativo|neutral|mixto", "contraste": "qué fuentes coinciden y cuáles no, en pocas palabras", "vigilar": "fecha o precio", "fuentes": [3]}},
  "alertas": [{"t": "algo que pide atención ya", "id": "<id de posición o ticker>", "urgencia": "alta|media"}]
}
Una entrada en "posiciones" por cada posición. "mercado": de 4 a 7, de al menos tres zonas distintas si
hay noticias de ellas. "macro": de 0 a 5, solo los que tengan su cifra en los datos, en las noticias o en lo que encuentres. "alertas": de 0 a 4."""


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
    previo_lite = "flash-lite" in str(previo.get("modelo") or "")
    if previo.get("generado") and not previo_lite and hace_menos_de(previo["generado"], HORAS_INFORME) and not os.environ.get("INFORME_FORZAR"):
        return conservar("el último tiene menos de 2 horas")
    # sin Flash-Lite mientras el que hay sea reciente: mejor uno de hace unas horas que uno nuevo más flojo
    buenos = [m for m in [MODELO] + RESERVA if "flash-lite" not in m]
    vale_lite = not previo.get("generado") or not hace_menos_de(previo["generado"], HORAS_INFORME_LITE)
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
    intentos = []  # por qué no salió con el modelo principal (se guarda en informe.json para verlo sin los registros)
    try:
        try:
            n_err = len(ERRORES)
            resp = gemini({**base, "tools": [{"google_search": {}}]}, clave, reserva=False)
        except RuntimeError as e:
            intentos += [f"con búsqueda: {x}" for x in ERRORES[n_err:]]
            del ERRORES[n_err:]  # sin búsqueda en el plan gratuito: es lo esperado, no un fallo
            print(f"informe: sin búsqueda de Google ({str(e)[:160]})")
            busqueda = False
            n_err = len(ERRORES)
            try:
                # si el 3.8 y el 3.6 no contestan, salta al except de abajo y se queda el anterior (sin marcarlo como
                # fallo: es lo esperado, y se reintenta en la siguiente pasada)
                resp = gemini(base, clave) if vale_lite else gemini(base, clave, reserva=False, modelos=buenos)
            finally:
                intentos += ERRORES[n_err:]
        modelo_usado = USO[-1]["m"] if USO else MODELO
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
    inf.update({"generado": ahora(), "modelo": modelo_usado, "noticias_leidas": len(fuentes), "busqueda_google": busqueda, "web": web[:15],
                "intentos": [str(x)[:240] for x in intentos][-6:]})
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
su resumen). Para cada empresa:
1. En una frase: qué dicen de verdad las noticias (con fecha), si es bueno o malo para la acción, cuánto
   importa y si hay algo con fecha que pueda moverla pronto.
2. Cada titular numerado, en uno de estos factores, con su signo para la acción ("+" bueno, "-" malo,
   "=" neutro, "±" mixto) y su peso (0 relleno, 1 poco, 2 importante, 3 cambia la tesis):
   - negocio: resultados, ventas, márgenes, deuda, previsiones, dividendos, contratos, directivos, compras de empresas.
   - sector: lo que les pasa a su sector y a sus competidores; precios de lo que vende o de lo que compra.
   - macro: tipos de interés, inflación, divisa, materias primas, cómo va la economía de sus países.
   - politico: aranceles, sanciones, elecciones, leyes, impuestos, multas, reguladores, juicios.
   - social: huelgas, boicots, quejas de clientes, reputación, hábitos de consumo, medio ambiente.
   - mercado: cambios de recomendación o de precio objetivo de los analistas, entradas y salidas de índices,
     compras y ventas de grandes accionistas, movimientos de la cotización.
3. Para cada factor con alguna noticia de peso 1 o más: una frase con lo que pasa, su signo, su peso y a qué
   plazo pesa ("corto": días o semanas; "medio": meses; "largo": años).
El relleno (anuncios de productos, gráficos de cotización, notas de prensa vacías, noticias de otra empresa
con el mismo nombre) lleva peso 0 y no cuenta para los factores. Solo lo que digan las noticias: nada
inventado. En español de España, con palabras normales (sin jerga como catalizador, soportes o múltiplos) y
con proporción: un movimiento pequeño sin noticia propia no es ni bueno ni malo.
Responde con un objeto JSON:
{"<ticker>": {"imp": "positivo|negativo|neutral|mixto", "rel": 0-3, "txt": "una frase", "cat": "lo que puede moverla y cuándo, o vacío", "fuentes": [números],
  "tit": {"<número>": ["factor", "signo", peso]},
  "fa": {"<factor>": {"s": "signo", "p": peso, "plazo": "corto|medio|largo", "txt": "una frase", "fuentes": [números]}}}}
"rel": 0 si no hay nada relevante, 1 poco, 2 importante, 3 cambia la tesis. Una entrada por empresa; en "fa",
solo los factores que tengan noticias de peso 1 o más."""


def leer_lote(lectura, cache, valores, medianas, clave, fichas=None, tuyas=()):
    """Gemini lee la prensa de las empresas con noticias que todavía no ha leído (las de las carteras y las de
    mejores números, primero). 0.7: de paso clasifica cada titular por factor y rellena las fichas."""
    pend = []
    for x in valores:
        e = cache.get(x["s"]) or {}
        if not e.get("n"):
            continue
        h = huella(e["n"])
        if (lectura.get(x["s"]) or {}).get("h") == h:
            continue
        fav, con = P.contraste_idea(x, medianas)
        pend.append((fav - 0.9 * con + min(x.get("pot") or 0, 50) / 50 + (20 if x["s"] in tuyas else 0), x, h))
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
    texto, _ = texto_de(gemini(cuerpo, clave, modelos=LECTURA))
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
        if fichas is not None:
            F.aplicar_lectura(fichas, x["s"], r, fuentes, lectura[x["s"]]["d"], x.get("n"))
        n += 1
    print(f"escaneo: Gemini ha leído la prensa de {n} empresas")
    return n


DECIDIR = """Eres el analista jefe de un inversor particular español que busca dónde poner dinero nuevo a 6-12
meses en acciones sueltas. Tu equipo ha leído la prensa de cientos de empresas;
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
- Fiscalidad de un residente en España: las ganancias pagan del 19 al 30 % según cuánto se gane en el año. Los dividendos de
  empresas con sede en Suiza (35 %), Alemania (26,4 %), Italia (26 %), Dinamarca (27 %), Suecia (30 %),
  Finlandia (35 %), Bélgica (30 %), Austria (27,5 %), Irlanda (25 %), Noruega (25 %) o Portugal (25 %) traen
  una retención en origen de la que en la renta solo recupera el 15 %: si el dividendo es una parte
  importante de la tesis, cuéntalo. EEUU (15 %), Países Bajos (15 %), Francia (12,8 %), Reino Unido (0 %) y
  España no le hacen perder nada. Al comprar paga una tasa del 0,2 % en España, 0,4 % en Francia y 0,1 % en Italia.
- Mira cómo van los mercados de cada zona (vienen al principio): reparte la mirada entre regiones y, si una zona
  va débil o depende de algo que está cambiando (tipos, divisa, petróleo), exige más a sus empresas y dilo.
- Máximo 5 ideas, de mejor a peor. Si ninguna está clara, devuelve "ideas" vacío y explícalo en "comentario".
- Añade hasta 5 empresas a evitar por lo que dice su prensa, aunque los analistas digan comprar.
- Sé constante. Al final viene lo que dijiste la vez anterior. El inversor no puede recibir cinco ideas
  distintas en dos días, ni que un día le digas que compre algo y al siguiente que lo evite. Mantén tus ideas
  anteriores salvo que haya una noticia nueva que cambie la tesis o se hayan roto sus números (los analistas
  ya no dicen comprar, o ya ha llegado a su objetivo). Una caída de la cotización o una opinión suelta no basta.
  Como mucho dos ideas nuevas al día.
- No pongas en "evitar" una empresa que propusiste o que la web lleva entre sus mejores estas semanas (viene
  en la lista), salvo una noticia nueva que cambie la tesis.
- En "cambios", cada empresa que entra o sale respecto a la vez anterior, con el motivo y la noticia que lo justifica.
- En "plazos", para TODAS las candidatas que no descartes por su prensa (aunque no estén entre tus ideas),
  estima en cuántos meses se puede materializar la mayor parte de su subida y cuánto: la web lo usa para
  comparar cualquier idea en "al año". Si no hay un catalizador claro, usa 12 meses y lo de los analistas,
  o menos si la prensa o los números no lo sostienen.
- Nada inventado; cita las noticias por número. En español de España, frases cortas.
- Lenguaje llano: lo lee alguien que no es experto. Nada de jerga sin explicar (catalizador, capex,
  amplitud de mercado, soportes, recorrido, múltiplos, rotación sectorial, risk-off...): dilo con palabras
  normales o explícalo en la misma frase. La tesis, en una o dos frases que entienda cualquiera.
Responde con un objeto JSON:
{"comentario": "dos frases: cómo está el panorama y qué has buscado (en primera persona del singular: «He buscado…», nunca «Hemos»)",
 "ideas": [{"s": "ticker", "tesis": "una o dos frases", "catalizador": "qué y cuándo", "riesgo": "...", "contraste": "qué coincide y qué no", "confianza": "alta|media|baja", "plazo_meses": 6, "subida_pct": 20, "fiscalidad": "lo que pagaría o perdería en impuestos, si importa", "fuentes": [n]}],
 "evitar": [{"s": "ticker", "motivo": "...", "fuentes": [n]}],
 "cambios": [{"s": "ticker", "antes": "idea|evitar|nada", "ahora": "idea|evitar|fuera", "motivo": "...", "fuentes": [n]}],
 "plazos": [{"s": "ticker", "meses": 6, "subida_pct": 15, "por": "qué marca ese plazo, en pocas palabras (por ejemplo: resultados del 6 nov)"}]}"""


def gorda(lectura, s, desde=None, signo="negativo"):
    """Una noticia que cambia la tesis (relevancia 3 de la lectura de prensa), de la última semana y, si se
    dice, posterior a la decisión anterior. Es lo único que deja cambiar de opinión de un día para otro."""
    le = lectura.get(s) or {}
    d = cuando(le.get("d"))
    if d is None or (le.get("rel") or 0) < 3 or le.get("imp") != signo:
        return False
    if d < dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7):
        return False
    return desde is None or d > desde


def rota(x):
    """Los números ya no sostienen la idea: los analistas dejan de decir comprar o ya casi ha llegado al objetivo.
    Si la empresa no está hoy en el radar (un fallo de datos), no cuenta."""
    if not x:
        return None
    if x.get("r") not in ("buy", "strong_buy"):
        return "los analistas ya no dicen comprar"
    if x.get("pot") is not None and x["pot"] < 5:
        return "ya casi ha llegado al precio que esperaban los analistas"
    return None


def fecha_de(t):
    try:
        return dt.date.fromisoformat(str(t)[:10])
    except Exception:  # noqa: BLE001
        return None


def apuntar(hist, s, k, hoy_s, inicio=None):
    h = hist.setdefault(s, {})
    h[k] = [(h.get(k) or [str(inicio or hoy_s)[:10]])[0], hoy_s]


def asentar(previa, ideas, evitar, cambios_g, porval, lectura, radar_top):
    """Constancia sobre lo que propone Gemini (por si no hace caso del encargo):
    - las ideas de la vez anterior siguen, salvo noticia gorda, números rotos o que lleven casi un mes y
      Gemini explique por qué deja de proponerla;
    - entran como mucho NUEVAS_POR_DIA nuevas (o tantas como hayan salido por una noticia gorda);
    - lo que estas semanas ha estado en "evitar" no pasa a idea sin una noticia buena gorda;
    - lo que estas semanas se ha propuesto (aquí o entre las mejores de la web) no pasa a "evitar" sin una
      noticia mala gorda, y nunca está en las dos listas a la vez.
    Devuelve las ideas, las de evitar, los cambios con su motivo y el historial de cada empresa."""
    hoy = dt.datetime.now(dt.timezone.utc).date()
    hoy_s = hoy.isoformat()
    previa = previa or {}
    desde = cuando(previa.get("generado"))
    hist = {k: dict(v) for k, v in (previa.get("hist") or {}).items() if isinstance(v, dict)}

    def reciente(s, k):
        f = (hist.get(s) or {}).get(k)
        d = fecha_de(f[1]) if f else None
        return bool(d) and (hoy - d).days <= DIAS_MEMORIA

    def cambio(s, n, antes, ahora_, motivo, fuentes):
        return {"s": s, "n": n, "antes": antes, "ahora": ahora_, "motivo": str(motivo or "")[:300], "fuentes": fuentes or [], "d": hoy_s}

    previas = [i for i in (previa.get("ideas") or []) if isinstance(i, dict) and i.get("s")]
    nuevas = {i["s"]: i for i in ideas}
    dice = {c.get("s"): c for c in cambios_g if isinstance(c, dict) and c.get("s")}
    s_evitar = {e["s"] for e in evitar}
    out, cam, salen = [], [], 0
    for p in previas:
        s = p["s"]
        if s in nuevas:
            out.append({**nuevas[s], "desde": p.get("desde") or hoy_s})
            continue
        le = lectura.get(s) or {}
        rot = rota(porval.get(s))
        d0 = fecha_de(p.get("desde"))
        larga = d0 is not None and (hoy - d0).days > DIAS_IDEA
        if gorda(lectura, s, desde) or rot:
            cam.append(cambio(s, p.get("n"), "idea", "evitar" if s in s_evitar else "fuera", le.get("txt") if not rot else rot, le.get("fuentes") if not rot else []))
            salen += 1
        elif larga and s in dice:
            cam.append(cambio(s, p.get("n"), "idea", "fuera", dice[s].get("motivo") or "lleva casi un mes entre las ideas y hay otras mejores", dice[s].get("fuentes")))
            salen += 1
        else:
            out.append({**p, "sigue": 1})
    cupo = MAX_IDEAS_DEC if not previas else max(NUEVAS_POR_DIA, salen)
    for i in ideas:
        if len(out) >= MAX_IDEAS_DEC or cupo <= 0:
            break
        s = i["s"]
        if s in {o["s"] for o in out}:
            continue
        if reciente(s, "evitar") and not gorda(lectura, s, None, "positivo"):
            continue
        out.append({**i, "desde": hoy_s})
        cupo -= 1
        if previas:
            cam.append(cambio(s, i.get("n"), "evitar" if reciente(s, "evitar") else "nada", "idea", (dice.get(s) or {}).get("motivo") or i.get("tesis"), i.get("fuentes")))
    ids = {o["s"] for o in out}
    ev = []
    for e in evitar:
        s = e["s"]
        if s in ids:
            continue
        protegida = reciente(s, "idea") or reciente(s, "radar") or s in radar_top
        if protegida and not gorda(lectura, s):
            continue
        ev.append(e)
        if protegida and not any(c["s"] == s for c in cam):
            cam.append(cambio(s, e.get("n"), "idea", "evitar", e.get("motivo") or (lectura.get(s) or {}).get("txt"), e.get("fuentes")))
    for o in out:
        apuntar(hist, o["s"], "idea", hoy_s, o.get("desde"))
    for e in ev:
        apuntar(hist, e["s"], "evitar", hoy_s)
    for s in radar_top:
        apuntar(hist, s, "radar", hoy_s)
    # el historial, solo de lo que ha salido en el último mes
    hist = {s: h for s, h in hist.items() if any((fecha_de(v[1]) or hoy) >= hoy - dt.timedelta(days=30) for v in h.values() if isinstance(v, list) and v)}
    viejos = [c for c in (previa.get("cambios") or []) if isinstance(c, dict) and (fecha_de(c.get("d")) or hoy) >= hoy - dt.timedelta(days=3) and not any(x["s"] == c.get("s") for x in cam)]
    return out, ev, (cam + viejos)[:12], hist


def revisar(decision, lectura, valores):
    """Entre una decisión y la siguiente (cada pasada de 20 minutos): sin preguntar a Gemini, una idea solo sale
    si llega una noticia que cambia la tesis o se rompen sus números. Lo demás se queda como estaba."""
    if not decision or not decision.get("ideas"):
        return decision
    porval = {x["s"]: x for x in valores}
    desde = cuando(decision.get("revisada") or decision.get("generado"))
    hoy_s = dt.datetime.now(dt.timezone.utc).date().isoformat()
    quedan, cam = [], []
    for i in decision["ideas"]:
        s = i.get("s")
        rot = rota(porval.get(s))
        if gorda(lectura, s, desde) or rot:
            le = lectura.get(s) or {}
            cam.append({"s": s, "n": i.get("n"), "antes": "idea", "ahora": "fuera", "motivo": (rot or le.get("txt") or "")[:300], "fuentes": [] if rot else (le.get("fuentes") or []), "d": hoy_s})
        else:
            quedan.append(i)
    if not cam:
        return decision
    print(f"escaneo: salen de las ideas {', '.join(c['s'] for c in cam)} por una noticia gorda o porque se han roto sus números")
    return {**decision, "ideas": quedan, "cambios": (cam + (decision.get("cambios") or []))[:12], "revisada": ahora()}


def contexto_zonas(precios):
    """Una línea por zona con cómo van sus índices (hoy, mes y año), para que Gemini pese la geografía."""
    grupos = {}
    for v in (precios.get("mercados") or {}).values():
        r = v.get("rent") or {}
        grupos.setdefault(v.get("grupo") or "Otros", []).append(f"{v.get('nombre')} {v.get('variacion_dia')} % hoy, {r.get('1m')} % mes, {r.get('ytd')} % año")
    return "\n".join(f"- {g}: " + "; ".join(xs) for g, xs in grupos.items())


def decidir(lectura, cache, valores, medianas, tuyas, clave, precios=None, previa=None):
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
    # las que más le gustan a la web (con su misma puntuación aproximada: recorrido, consenso, analistas,
    # PER y contraste), aunque no tengan prensa reciente: Gemini les pone plazo para que la web no compare
    # su "al año" solo con el objetivo de los analistas
    web = []
    for x in valores:
        if x["s"] in tuyas or x.get("pot") is None:
            continue
        fav, con = P.contraste_idea(x, medianas)
        rm, na, perf = x.get("rm") or 3, x.get("na") or 0, x.get("perf") or 0
        if x["pot"] >= 10 and na >= 8 and rm <= 2.4 and x.get("r") in ("buy", "strong_buy") and fav >= 3 and con <= 2 and (x.get("c1a") or 0) > -35:
            pts = 1.2 * min(x["pot"], 50) / 50 + max(-1, min(1, (2.6 - rm) / 1.6)) + 0.5 * min(na, 30) / 30 + 0.22 * fav - 0.3 * con
            pts += 0.4 if 0 < perf < 10 else 0.3 if 0 < perf < 15 else 0.1 if 0 < perf < 22 else -0.3 if perf >= 30 else 0
            web.append((pts, x))
    web.sort(key=lambda t: -t[0])
    radar_top = [x["s"] for _, x in web[:9]]
    porval = {x["s"]: x for x in valores}
    # las ideas de la vez anterior entran siempre en la lista, para que Gemini pueda mantenerlas
    de_antes = [porval[i["s"]] for i in ((previa or {}).get("ideas") or []) if isinstance(i, dict) and i.get("s") in porval and i["s"] not in tuyas]
    vistos, orden = set(), []
    for x in de_antes + [x for _, x in web[:20]] + cands:  # luego las de la web: son las que más importa que tengan plazo
        if x["s"] not in vistos:
            vistos.add(x["s"])
            orden.append(x)
    cands = orden
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
    obligadas = ", ".join(x["s"] for x in cands[:CANDIDATAS] if x not in [m for _, m in malas[:10]])
    zonas = contexto_zonas(precios or {})
    memoria = ""
    if previa and (previa.get("ideas") or previa.get("evitar")):
        li = "\n".join(f"- {i.get('s')} ({i.get('n')}), propuesta desde {i.get('desde') or str(previa.get('generado'))[:10]}: {i.get('tesis') or ''}" for i in previa.get("ideas") or [])
        le = "\n".join(f"- {e.get('s')} ({e.get('n')}): {e.get('motivo') or ''}" for e in previa.get("evitar") or [])
        memoria = (f"\n\n## Lo que dijiste la vez anterior ({str(previa.get('generado'))[:16].replace('T', ' ')} UTC)\nIdeas:\n{li or '- ninguna'}\nA evitar:\n{le or '- ninguna'}"
                   f"\nLas que la web lleva entre sus mejores estos días: {', '.join(radar_top) or 'ninguna'}.")
    pedido = f"Hoy es {hoy}.\n\n" + (f"## Cómo van los mercados por zonas\n{zonas}\n\n" if zonas else "") + "\n\n".join(bloques) + memoria + f"\n\nEn \"plazos\" pon una entrada para cada una de estas, sin saltarte ninguna: {obligadas}."
    cuerpo = {"systemInstruction": {"parts": [{"text": DECIDIR}]}, "contents": [{"role": "user", "parts": [{"text": pedido}]}],
              "generationConfig": {"maxOutputTokens": 32768, "responseMimeType": "application/json", "thinkingConfig": {"thinkingLevel": "high"}}}
    texto, _ = texto_de(gemini(cuerpo, clave))
    modelo_usado = USO[-1]["m"] if USO else MODELO  # el que ha decidido (la lectura de esta pasada va con otro)
    d = extraer_json(texto)
    if not d:
        ERRORES.append(f"decisión: la respuesta no traía JSON ({len(texto)} caracteres)")
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
    cambios_g = [{**c, "fuentes": fs_de(c.get("fuentes"))} for c in (d.get("cambios") or []) if isinstance(c, dict) and c.get("s")]
    ideas, evitar, cambios, hist = asentar(previa, ideas, evitar, cambios_g, porval, lectura, radar_top)
    # las que siguen de antes conservan su plazo si Gemini no lo ha repetido
    for s, v in ((previa or {}).get("plazos") or {}).items():
        if s not in plazos and any(i["s"] == s for i in ideas):
            plazos[s] = v
    for i in ideas:
        if i.get("plazo_meses") and i.get("subida_pct") is not None and i["s"] not in plazos:
            plazos[i["s"]] = {"meses": i["plazo_meses"], "subida_pct": i["subida_pct"], "por": str(i.get("catalizador") or "")[:120]}
    return {"generado": ahora(), "modelo": modelo_usado, "v": DECISION_V, "comentario": d.get("comentario") or "", "ideas": ideas, "evitar": evitar,
            "cambios": cambios, "hist": hist, "radar": radar_top, "plazos": plazos, "candidatas": len(cands)}


def noticias_de_carteras(cache, instrumentos, valores, precios):
    """0.7: los titulares de las acciones de las carteras (los de precios.json, que son los que la app enseña en
    cada ficha) también se leen y se marcan, junto con los del radar."""
    en_radar = {x["s"] for x in valores}
    nots = (precios or {}).get("noticias") or {}
    n = 0
    for i in instrumentos:
        s, lista = i.get("yahoo"), nots.get(i.get("id")) or []
        if i.get("tipo") == "Acción" and s in en_radar and lista:
            antes = huella((cache.get(s) or {}).get("n") or [])
            mezclar(cache, s, lista, "fp")
            n += huella(cache[s]["n"]) != antes
    if n:
        print(f"escaneo: titulares nuevos de {n} acciones de las carteras")


# 0.7: noticias por tema, país y sector (lo que toca a muchas empresas a la vez). Las del mercado (precios.json,
# noticias["mercado"]: bolsas, tipos, divisas, materias primas) se suman a estas.
TEMAS_CONSULTAS = [
    "aranceles comercio exterior empresas", "sanciones Rusia China empresas", "elecciones mercados inversores",
    "Comisión Europea regulación multa empresas", "impuesto banca energéticas Gobierno", "Estados Unidos aranceles importaciones",
    "huelga trabajadores empresa", "boicot consumidores marca", "consumo hogares gasto confianza",
    "economía España PIB", "economía Alemania", "economía China", "economía Estados Unidos empleo",
    "sector bancario banca márgenes", "sector eléctrico renovables precio luz", "farmacéuticas medicamentos precios",
    "fabricantes automóvil coche eléctrico", "semiconductores chips inteligencia artificial", "sector inmobiliario vivienda precios",
    "defensa gasto militar empresas", "lujo moda ventas", "operadoras telecomunicaciones", "aerolíneas turismo reservas",
    "construcción infraestructuras contratos", "aseguradoras seguros",
]
HORAS_TEMAS = 3
SECTORES = ["Industria", "Financiero", "Tecnología", "Salud", "Consumo cíclico", "Materiales", "Consumo básico", "Energía",
            "Comunicaciones", "Servicios públicos", "Inmobiliario"]
LEER_TEMAS = """Lees titulares de economía, política y sociedad de los últimos días para un inversor particular
español con acciones de España, Europa y EEUU. Junta los que hablen de lo mismo en temas (como mucho 15: los que
más pueden mover las acciones) y, para cada uno:
- "fa": "macro" (tipos de interés, inflación, divisa, materias primas, economía de un país), "politico" (aranceles,
  sanciones, elecciones, leyes, impuestos, multas, reguladores), "social" (huelgas, boicots, consumo, reputación) o
  "sector" (lo que le pasa a un sector entero).
- "txt": una frase con lo que pasa y por qué importa a quien tiene acciones.
- "afecta": a qué acciones toca: por "zona" (España, Europa o EEUU) o, si es de un país concreto, por "pais" (en
  inglés, como United States, Spain, Germany, France, United Kingdom, Italy, Switzerland, Netherlands, China, Japan;
  no hace falta poner los dos), y por "sector" (uno de: {sectores}; sin sector si toca a todos). Si dentro del
  sector solo toca a un tipo de empresa (aerolíneas, defensa, bancos, eléctricas, petroleras…), pon también
  "industria", tal cual en esta lista: {industrias}. Con el signo para esas acciones ("+" bueno, "-" malo, "=" neutro, "±" mixto) y su peso (1 poco,
  2 importante, 3 cambia mucho). Un tema puede ser bueno para unos y malo para otros: unos aranceles son malos para
  quien exporta y buenos para quien compite con lo importado. Pon solo lo que se deduzca de los titulares.
- "plazo": "corto" (días o semanas), "medio" (meses) o "largo" (años). "fuentes": los números de los titulares.
- "k": una clave corta del tema. Si un tema sigue de la vez anterior (abajo), usa su misma clave.
Un tema toca a muchas empresas: lo de una sola empresa (sus contratos, sus resultados) no es un tema.
Nada inventado y nada de relleno (opiniones sueltas, listas de «acciones para comprar»). En español de
España, con palabras normales.
Responde con un objeto JSON: {{"temas": [{{"k": "...", "fa": "...", "txt": "...", "plazo": "...", "fuentes": [números],
"afecta": [{{"zona": "...", "pais": "...", "sector": "...", "industria": "...", "s": "...", "p": 2}}]}}]}}"""


def leer_temas(fichas, clave, precios, valores=()):
    """0.7: cada 3 horas, Flash-Lite lee los titulares por tema y por sector (y los del mercado) y dice a qué
    zonas, países y sectores toca cada tema. Van a fichas.json → temas; la app los junta con la ficha de cada
    empresa por su país, su zona y su sector."""
    if not clave or hace_menos_de(fichas.get("temas_d") or "", HORAS_TEMAS):
        return 0
    fuentes, vistos = [], set()

    def sumar(lista):
        for n in lista or []:
            k = F.clave_titulo(n.get("t"))
            if n.get("t") and k not in vistos and not P.RUIDO.search(n["t"]):
                vistos.add(k)
                fuentes.append({kk: n.get(kk) for kk in ("t", "f", "d", "u") if n.get(kk)})
    sumar(((precios or {}).get("noticias") or {}).get("mercado"))
    for q in TEMAS_CONSULTAS:
        try:
            sumar(P.noticias(q, 4, cuando="3d"))
            DIAG["google"] += 1
        except Exception as e:  # noqa: BLE001
            DIAG["google_error"] += 1
            print(f"temas «{q}»: {e}")
        time.sleep(0.3)
    if len(fuentes) < 10:
        print(f"temas: solo {len(fuentes)} titulares, lo dejo para la próxima")
        return 0
    lineas = [f"[{i}] {(n.get('d') or '')[:10]} {n.get('f') or ''}: {n['t']}" for i, n in enumerate(fuentes, 1)]
    antes = [f"- {t['k']}: {t['txt']}" for t in fichas.get("temas") or []][:20]
    pedido = "Titulares:\n" + "\n".join(lineas) + ("\n\nTemas de la vez anterior:\n" + "\n".join(antes) if antes else "")
    industrias = [k for k, _ in collections.Counter(x.get("ind") for x in valores if x.get("ind")).most_common(70)]
    cuerpo = {"systemInstruction": {"parts": [{"text": LEER_TEMAS.format(sectores=", ".join(SECTORES), industrias=", ".join(industrias) or "Airlines, Banks - Regional")}]}, "contents": [{"role": "user", "parts": [{"text": pedido}]}],
              "generationConfig": {"maxOutputTokens": 16384, "responseMimeType": "application/json", "thinkingConfig": {"thinkingLevel": "low"}}}
    texto, _ = texto_de(gemini(cuerpo, clave, modelos=LECTURA))
    res = extraer_json(texto) or {}
    temas = res.get("temas") if isinstance(res, dict) else None
    if not isinstance(temas, list):
        ERRORES.append(f"temas: la respuesta no traía la lista ({len(texto)} caracteres)")
        return 0
    F.aplicar_temas(fichas, temas, fuentes, ahora())
    fichas["temas_d"] = ahora()
    print(f"temas: {len(temas)} de {len(fuentes)} titulares")
    return len(temas)


def guardar_fichas(fichas, dir_salida, validos):
    F.podar(fichas, validos)
    fichas["generado"] = ahora()
    with open(f"{dir_salida}/fichas.json", "w", encoding="utf-8") as f:
        json.dump(fichas, f, ensure_ascii=False, separators=(",", ":"))
    marcar(dir_salida, "fichas_id", fichas["generado"])
    print(f"fichas: {len(fichas['e'])} empresas, {sum(len(x['fa']) for x in fichas['e'].values())} factores, {len(fichas.get('temas') or [])} temas")


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
    fichas = leer(f"{dir_anterior}/fichas.json") or F.nuevas()
    if valores:
        try:
            actualizar_noticias(cache, valores)
        except Exception as e:  # noqa: BLE001
            print(f"escaneo: fallaron las noticias ({e})")
        try:
            noticias_de_carteras(cache, instrumentos, valores, leer(f"{dir_salida}/precios.json"))
        except Exception as e:  # noqa: BLE001
            print(f"escaneo: fallaron las noticias de las carteras ({e})")
        if clave:
            try:
                leer_lote(lectura, cache, valores, medianas, clave, fichas, tuyas)
            except Exception as e:  # noqa: BLE001
                print(f"escaneo: falló la lectura de Gemini ({str(e)[:200]})")
            try:
                leer_temas(fichas, clave, leer(f"{dir_salida}/precios.json"), valores)
            except Exception as e:  # noqa: BLE001
                print(f"temas: falló la lectura de Gemini ({str(e)[:200]})")
    nuevo = informe_cartera(ruta_inst, dir_anterior, dir_salida, clave)
    # una decisión nueva al día (o si cambia su formato); entre medias, solo se revisa si hay una noticia gorda
    viejo = not decision or decision.get("v") != DECISION_V or not hace_menos_de(decision.get("generado") or "", HORAS_DECISION)
    if not viejo and valores:
        decision = revisar(decision, lectura, valores)
    # si la última vez falló (cuota de Gemini agotada, por ejemplo), no se reintenta hasta pasadas 2 horas
    intento = esc.get("intento_decision")
    if viejo and intento and hace_menos_de(intento, 2):
        viejo = False
    if clave and valores and viejo:
        intento = ahora()
        try:
            d = decidir(lectura, cache, valores, medianas, tuyas, clave, leer(f"{dir_salida}/precios.json"), previa=decision)
            if d:
                decision = d
                print(f"escaneo: decisión con {d['candidatas']} candidatas, {len(d['ideas'])} ideas y {len(d['evitar'])} a evitar")
        except Exception as e:  # noqa: BLE001
            print(f"escaneo: falló la decisión de Gemini ({str(e)[:200]})")
    hace24 = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=24)
    salida = {"generado": ahora(), "lectura": lectura, "decision": decision, "intento_decision": intento if (decision or {}).get("generado", "") < (intento or "") else None, "gemini": {"ok": not FALLOS, "errores": (FALLOS or ERRORES)[-4:], "modelos": sorted(USADOS), "con_clave": bool(clave),
                                     "uso": [x for x in ((esc.get("gemini") or {}).get("uso") or []) if hace_menos_de(x.get("t") or "", 48)] + USO},
              "con_noticias": sum(1 for v in cache.values() if v.get("n")), "leidas_24h": sum(1 for v in lectura.values() if cuando(v.get("d")) and cuando(v["d"]) > hace24),
              "noticias": sum(len(v.get("n") or []) for v in cache.values()), "empresas": len(valores), "fuentes_pasada": DIAG}
    with open(f"{dir_salida}/noticias-cache.json", "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, separators=(",", ":"))
    guardar_fichas(fichas, dir_salida, {x["s"] for x in valores} if valores else None)
    with open(f"{dir_salida}/escaneo.json", "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))
    marcar(dir_salida, "escaneo_id", salida["generado"])


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
