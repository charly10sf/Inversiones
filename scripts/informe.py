#!/usr/bin/env python3
"""La IA que trabaja aunque la web esté cerrada: escaneo de prensa de toda la bolsa e informe de la IA (Claude).

Uso: python scripts/informe.py instrumentos.json anterior/ salida/

Lo llama la GitHub Action después de precios.py, en cada pasada (cada 20 minutos entre semana):
1. Noticias de un lote de empresas del radar (las que más tiempo llevan sin mirar): Yahoo Finance con
   su resumen y Google Noticias en español. Desde el 6 nov 2026 son las de todo el radar (radar.json y
   radar-mas.json, unas 2.860), las que más tiempo llevan sin mirar primero.
   Se guardan en noticias-cache.json.
2. Claude lee la prensa de hasta 400 empresas con noticias nuevas (las leídas hace más tiempo, primero;
   por la API por lotes, a mitad de precio) y apunta, para cada una, qué ha
   pasado, si es bueno o malo, cuánto importa y si hay un catalizador (escaneo.json, "lectura").
3. Cada 2 horas, el informe de tu cartera y del mercado (informe.json): qué ha pasado, si es bueno o
   malo, qué fuentes coinciden y qué vigilar.
4. Una vez al día, la decisión: entre todas las empresas con buenos números y buena prensa, la IA elige
   las que merecen dinero nuevo y las que conviene evitar (escaneo.json, "decision"). Con constancia: ve lo
   que dijo la vez anterior, las ideas siguen salvo que llegue una noticia que cambie la tesis o se rompan
   sus números, entran como mucho dos nuevas al día y lo que estas semanas se ha recomendado no pasa a
   "evitar" sin una noticia así. Entre una decisión y la siguiente solo se revisa eso, sin preguntar a la IA.
   Cada cambio queda apuntado con su motivo ("cambios").
Todo es público y sin cantidades: la cartera cifrada no se toca. Con INFORME_BUSQUEDA=1, el informe además busca
en internet (la búsqueda de Claude, 1 céntimo cada una).

0.8.2d (6 nov 2026, «todo con Claude»): todo va con Claude (Haiku 5.5) y la clave del workspace «Toisón radar» (secreto
ANTHROPIC_RADAR_KEY, con su propio límite de gasto), sin Gemini y sin reserva; lo que no corre prisa, por la API por
lotes (mitad de precio). Sin la clave, solo se actualizan las noticias; si Claude no sale, se queda lo anterior.
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
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

import yfinance as yf

import precios as P  # noqa: E402  (noticias de Google, contraste de las ideas)
# 9 nov 2026: precios.json guarda ahora hasta 60 titulares de mercado (para la página de Noticias); la IA sigue leyendo
# 30, hasta 3 por zona, como antes: ni más gasto ni menos zonas
elegir_mercado = P.elegir_mercado
agrupar_notas = P.agrupar_notas
import fichas as F  # noqa: E402  (0.7: fichas por empresa con seis factores)

HORAS_INFORME = 2          # como mucho uno cada 2 horas
MAX_IDEAS = 0               # las ideas ya no van en el informe: salen del escaneo
# 6 nov 2026: el radar son 2.864 empresas (radar.json + radar-mas.json) y se leen todas. Se baja la prensa de más empresas
# por pasada (la vuelta entera de Yahoo, unas 18 pasadas) y la IA lee unas 400 por pasada, en 8 peticiones de 50 dentro de un
# mismo lote de la API por lotes de Anthropic. OJO: cada petición lleva como mucho una tanda de 50 (unos 46.000 tokens de
# entrada): Haiku cobra el triple y más por encima de 100.000 de entrada en una sola petición.
LOTE_YAHOO = int(os.environ.get("INFORME_LOTE_YAHOO", "160"))    # empresas por pasada con noticias de Yahoo Finance
LOTE_GOOGLE = int(os.environ.get("INFORME_LOTE_GOOGLE", "40"))   # y con Google Noticias en español
HILOS_YAHOO = 6
LOTE_LECTURA = 50           # empresas por petición (0.7: 50, porque ahora clasifica cada titular); sin lotes, las que lee cada pasada
LOTE_LECTURA_LOTES = int(os.environ.get("INFORME_LECTURAS_POR_PASADA", "400"))  # empresas por pasada cuando van por la API por lotes
TANDA_MAX_CARACTERES = 260000  # una petición no pasa de esto (unos 75.000 tokens): si pasa, se parte antes de mandarla
RONDAS_LOTE = 4             # lo que no sale se parte en dos y va en otro lote, hasta 3 veces después de la primera
LOTE_MIN_PARTIR = 3         # si se atasca, se parte el lote hasta grupos de este tamaño
# 13 nov 2026 (auditoría): la Action tiene 40 minutos en total (precios, esto, traducción, publicar). Antes eran 20 y esto
# podía pasar de 13: tras la noche o el fin de semana tocaba todo a la vez (lecturas, temas, informe y decisión), la pasada
# se cortaba sin publicar y lo que había cobrado Claude se tiraba (el 7 nov, 10 de 12 pasadas). Ahora cada cosa mira el
# tiempo que queda antes de empezar (hay_tiempo) y, si no llega, se deja para la pasada siguiente, por lote y a mitad de
# precio, en vez de pedirla deprisa en directo.
PRESUPUESTO = int(os.environ.get("INFORME_PRESUPUESTO", "780"))
INICIO = time.time()
TIEMPO_TEMAS, TIEMPO_INFORME, TIEMPO_DECISION = 120, 180, 240   # segundos que tienen que quedar para empezar cada cosa
INICIO_FICHAS = "2026-10-23T16:20"  # desde aquí, cada lectura rellena la ficha de la empresa (0.7)
MAX_NOTICIAS = 8            # noticias guardadas por empresa
DIAS_NOTICIA = 21
CANDIDATAS = 40             # empresas entre las que decide
DECISION_V = 6              # sube si cambia lo que devuelve la decisión: así se rehace en la siguiente pasada
HORAS_DECISION = 20         # la decisión se rehace una vez al día; entre medias solo se mira si hay una noticia gorda
# el informe sin búsqueda en internet salvo con INFORME_BUSQUEDA=1 (cada búsqueda, 1 céntimo y unos 8.000 tokens más)
BUSQUEDA = os.environ.get("INFORME_BUSQUEDA") == "1"
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


def queda():
    """Los segundos que le quedan a esta pasada para la IA."""
    return PRESUPUESTO - (time.time() - INICIO)


def hay_tiempo(que, hace_falta):
    """False (y lo dice) si a la pasada no le queda tiempo para empezar `que`: se hará en la siguiente."""
    if queda() >= hace_falta:
        return True
    print(f"{que}: quedan {max(0, round(queda()))} s de la pasada y hacen falta {hace_falta}; se deja para la siguiente")
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
            out.append({"t": titulo, "r": desc[:500], "f": (it.findtext("source") or "Yahoo Finance").strip(), "d": fecha, "u": it.findtext("link"), "w": P.web_medio(it)})
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
            web = re.sub(r"^www\.", "", (urllib.parse.urlparse((c.get("provider") or {}).get("url") or "").hostname or "").lower()) or None
            out.append({"t": titulo, "r": (c.get("summary") or "")[:500], "f": ((c.get("provider") or {}).get("displayName") or c.get("publisher") or "Yahoo Finance"), "d": fecha, "u": url, "w": web})
        if out:
            DIAG["yahoo_api"] += 1
    except Exception as e:  # noqa: BLE001
        print(f"noticias {simbolo}: {e}")
    return out


# ---------------------------------------------------------------- la IA: Claude, por la API por lotes si se puede

USO = []                    # los tokens y lo que ha costado cada llamada de esta pasada (van a escaneo.json, «ia.uso»)
USADOS = set()              # los modelos que han respondido
CLAUDE_API = os.environ.get("CLAUDE_API", "https://api.anthropic.com/v1/messages")
CLAUDE_MODELO = os.environ.get("CLAUDE_RADAR_MODELO", "claude-haiku-5-5")
CLAUDE_MAX_SALIDA = 32000
# La API por lotes de Anthropic cobra la mitad. Medido con 50 empresas: el lote tarda unos 2 minutos. La lectura de prensa
# espera CLAUDE_RADAR_ESPERA segundos; el informe, la decisión y los temas (una petición sola), CLAUDE_RADAR_ESPERA_SUELTA.
# Si no llega a tiempo, se cancela y se pide en directo. CLAUDE_RADAR_LOTES=0 lo apaga.
CLAUDE_LOTES = os.environ.get("CLAUDE_RADAR_LOTES", "1") != "0"
CLAUDE_ESPERA_LOTE = int(os.environ.get("CLAUDE_RADAR_ESPERA", "420"))
CLAUDE_ESPERA_SUELTA = int(os.environ.get("CLAUDE_RADAR_ESPERA_SUELTA", "240"))
LOTES_APAGADOS = [False]   # tras un fallo del lote, el resto de la pasada va en directo
CLAUDE_ERRORES = []         # lo que ha fallado con Claude en esta pasada (va a escaneo.json para verlo en la web)
CLAUDE_APAGADO = False      # tras un fallo de clave o de saldo, el resto de la pasada va sin Claude
# precio por millón de tokens (entrada, salida). Haiku cobra más cuando UNA petición pasa de 100.000 de entrada; por lotes,
# la mitad. Los mismos que usa la app (MODELOS_CLAUDE) y el Worker (PRECIOS_CLAUDE)
PRECIOS = {"claude-haiku-5-5": (0.10, 0.50), "claude-sonnet-5-5": (2.0, 10.0)}
PRECIO_HAIKU_GRANDE = (0.50, 2.50)


def clave_claude():
    return (os.environ.get("ANTHROPIC_RADAR_KEY") or "").strip()


def coste(modelo, entrada, salida, lote=False, busquedas=0):
    """Lo que cuesta una llamada en dólares (la caché no se usa aquí: todo va al precio de entrada)."""
    pi, po = PRECIO_HAIKU_GRANDE if modelo == "claude-haiku-5-5" and entrada > 1e5 else PRECIOS.get(modelo, PRECIOS["claude-haiku-5-5"])
    c = (entrada * pi + salida * po) / 1e6
    return round((c / 2 if lote else c) + busquedas * 0.01, 6)


def peticion_claude(cuerpo, clave):
    req = urllib.request.Request(CLAUDE_API, data=json.dumps(cuerpo).encode(), method="POST",
                                 headers={"content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.loads(r.read())


def peticion_claude_get(ruta, clave, metodo="GET", cuerpo=None, texto=False):
    req = urllib.request.Request(CLAUDE_API.rsplit("/v1/", 1)[0] + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, method=metodo,
                                 headers={"content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01"})
    with urllib.request.urlopen(req, timeout=120) as r:
        crudo = r.read().decode("utf-8", "replace")
    return crudo if texto else json.loads(crudo)


def espera_lote(tope=None):
    """Lo que se espera a un lote: `tope` (o CLAUDE_ESPERA_LOTE), sin pasar del tiempo que le queda a la pasada (mínimo 20 s)."""
    return min(CLAUDE_ESPERA_LOTE if tope is None else tope, max(20, PRESUPUESTO - (time.time() - INICIO)))


def mensajes_por_lote(pedidos, clave, tope=None):
    """Varias peticiones en UN lote de la API por lotes (mitad de precio): {id: cuerpo} -> {id: mensaje o None}. Cada
    petición va aparte (su límite de 100.000 tokens de entrada es por petición). Si no termina a tiempo, se cancela y se
    aprovecha lo que ya haya salido. Lanza RuntimeError si el lote no sale o no deja resultados."""
    b = peticion_claude_get("/v1/messages/batches", clave, "POST", {"requests": [{"custom_id": k, "params": p} for k, p in pedidos.items()]})
    t0, espera = time.time(), espera_lote(tope)
    while b.get("processing_status") != "ended":
        if time.time() - t0 > espera:
            try:
                peticion_claude_get(f"/v1/messages/batches/{b['id']}/cancel", clave, "POST", {})
                for _ in range(6):  # unos segundos para que termine de cancelarse y se pueda leer lo hecho
                    time.sleep(5)
                    b = peticion_claude_get(f"/v1/messages/batches/{b['id']}", clave)
                    if b.get("processing_status") == "ended":
                        break
            except Exception:  # noqa: BLE001
                pass
            break
        time.sleep(10)
        b = peticion_claude_get(f"/v1/messages/batches/{b['id']}", clave)
    if b.get("processing_status") != "ended" or not b.get("results_url"):
        raise RuntimeError(f"lote sin terminar tras {round(time.time() - t0)} s" if b.get("processing_status") != "ended" else "lote sin resultados")
    crudo = peticion_claude_get(b["results_url"].replace("https://api.anthropic.com", ""), clave, texto=True)
    salida, malas = {k: None for k in pedidos}, collections.Counter()
    for linea in crudo.splitlines():
        try:
            o = json.loads(linea)
        except json.JSONDecodeError:
            continue
        res = o.get("result") or {}
        if res.get("type") == "succeeded" and o.get("custom_id") in salida:
            salida[o["custom_id"]] = res.get("message")
        else:
            # 6 nov: que el registro diga por qué no sale una petición del lote (antes, nada)
            e = res.get("error") or {}
            e = e.get("error") if isinstance(e.get("error"), dict) else e
            malas[f"{res.get('type')}: {str(e.get('type') or '')} {str(e.get('message') or '')[:140]}".strip()] += 1
    for motivo, n in malas.most_common(3):
        print(f"claude: {n} de {len(pedidos)} peticiones del lote no han salido ({motivo})")
    return salida


def mensaje_por_lote(cuerpo, clave, tope=None):
    """Una petición por la API por lotes: la crea, espera a que termine y devuelve el mensaje, con la misma forma que el
    de la API normal. Lanza RuntimeError si no sale a tiempo (y cancela el lote) o si sale con error."""
    b = peticion_claude_get("/v1/messages/batches", clave, "POST", {"requests": [{"custom_id": "radar", "params": cuerpo}]})
    t0, espera = time.time(), espera_lote(tope)
    while b.get("processing_status") != "ended":
        if time.time() - t0 > espera:
            try:
                peticion_claude_get(f"/v1/messages/batches/{b['id']}/cancel", clave, "POST", {})
            except Exception:  # noqa: BLE001
                pass
            raise RuntimeError(f"lote sin terminar tras {round(espera)} s")
        time.sleep(10)
        b = peticion_claude_get(f"/v1/messages/batches/{b['id']}", clave)
    if not b.get("results_url"):
        raise RuntimeError("lote sin resultados")
    crudo = peticion_claude_get(b["results_url"].replace("https://api.anthropic.com", ""), clave, texto=True)
    linea = json.loads(crudo.splitlines()[0])
    res = linea.get("result") or {}
    if res.get("type") != "succeeded":
        raise RuntimeError(f"lote {res.get('type')}: {str(res.get('error') or '')[:200]}")
    return res["message"]


def pedido(sistema, texto, salida=8192, json_=False, pensar=False, buscar=0):
    """El cuerpo de una petición a Claude. json_: que conteste solo con un JSON. pensar: el informe («low») y la decisión
    (True, esfuerzo medio); si no, sin pensar (Haiku 5.5 piensa por defecto y en la lectura de prensa se gastaba los 32.000 tokens
    de salida pensando: stop_reason=max_tokens con un solo bloque «thinking», 5 nov 22:09). buscar: usos de la búsqueda."""
    if json_:
        sistema += "\n\nResponde solo con un JSON válido, sin texto antes ni después y sin bloques de código."
    p = {"model": CLAUDE_MODELO, "max_tokens": min(int(salida), CLAUDE_MAX_SALIDA), "messages": [{"role": "user", "content": texto}]}
    if sistema.strip():
        p["system"] = sistema.strip()
    if pensar:
        p["output_config"] = {"effort": pensar if isinstance(pensar, str) else "medium"}
    else:
        p["thinking"] = {"type": "disabled"}
    if buscar:
        p["tools"] = [{"type": "web_search_20250305", "name": "web_search", "max_uses": int(buscar)}]
    return p


def texto_del_pedido(p):
    """El texto que se manda (para medirlo o partirlo)."""
    c = (p.get("messages") or [{}])[0].get("content")
    return c if isinstance(c, str) else "".join(b.get("text", "") for b in c or [] if isinstance(b, dict))


def apuntar_uso(msg, que, lote=False):
    """Apunta los tokens de una respuesta de Claude y lo que ha costado (US$, con el precio de lotes si fue por lote)."""
    u = (msg or {}).get("usage") or {}
    modelo = (msg or {}).get("model") or CLAUDE_MODELO
    entrada = (u.get("input_tokens") or 0) + (u.get("cache_read_input_tokens") or 0) + (u.get("cache_creation_input_tokens") or 0)
    salida, busq = u.get("output_tokens") or 0, ((u.get("server_tool_use") or {}).get("web_search_requests") or 0)
    USADOS.add(modelo)
    USO.append({"t": ahora(), "m": modelo, "que": que, "in": entrada, "cache": u.get("cache_read_input_tokens") or 0, "out": salida,
                "busq": busq, "lote": bool(lote), "coste": coste(modelo, entrada, salida, lote, busq)})


def ia(p, que=None, lote=True, tope=None):
    """Una llamada a Claude con el cuerpo `p` (de pedido()): por la API por lotes si se puede (si no sale a tiempo, en
    directo) o en directo. Reintenta si está saturado; si la clave no vale o no hay saldo, apaga Claude para el resto de la
    pasada. Si pensando se queda sin sitio, una vez más sin pensar. Devuelve el mensaje de Claude; lanza RuntimeError si no
    sale (y el que llama se queda con lo de la pasada anterior)."""
    global CLAUDE_APAGADO
    que = que or {"leer_trozo": "leer_lote"}.get(inspect.stack()[1].function, inspect.stack()[1].function)
    clave = clave_claude()
    if not clave:
        raise RuntimeError("sin ANTHROPIC_RADAR_KEY")
    if CLAUDE_APAGADO:
        raise RuntimeError("Claude apagado en esta pasada (clave o saldo)")
    ultimo, intento = None, 0
    while intento < 3:
        try:
            por_lote, msg = False, None
            if lote and CLAUDE_LOTES and not LOTES_APAGADOS[0]:
                try:
                    msg = mensaje_por_lote(p, clave, CLAUDE_ESPERA_SUELTA if tope is None else tope)
                    por_lote = True
                except urllib.error.HTTPError as e:
                    if e.code in (401, 403):
                        raise
                    LOTES_APAGADOS[0] = True
                    print(f"claude: el lote no ha salido (HTTP {e.code}), sigo en directo")
                except (RuntimeError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError) as e:
                    LOTES_APAGADOS[0] = True
                    print(f"claude: el lote no ha salido ({str(e)[:120]}), sigo en directo")
            if msg is None:
                msg = peticion_claude(p, clave)
            if not texto_de(msg)[0].strip():
                if "output_config" in p and msg.get("stop_reason") == "max_tokens":
                    print(f"claude: {que} se ha quedado sin sitio pensando; otra vez sin pensar")
                    p = {**{k: v for k, v in p.items() if k != "output_config"}, "thinking": {"type": "disabled"}}
                    intento += 1
                    continue
                # 0.8.2: que el registro diga qué llegó (motivo de parada, tipos de bloque y tokens) y no solo «vacía»
                tipos = ",".join(str(b.get("type")) for b in (msg.get("content") or [])) or "ninguno"
                u = msg.get("usage") or {}
                ultimo = (f"respuesta vacía de {msg.get('model')}: stop_reason={msg.get('stop_reason')}, bloques={tipos}, "
                          f"in={u.get('input_tokens')}, out={u.get('output_tokens')}")
                break
            apuntar_uso(msg, que, por_lote)
            return msg
        except urllib.error.HTTPError as e:
            texto = e.read().decode("utf-8", "replace")
            ultimo = f"claude {e.code}: {texto[:300]}"
            if e.code in (401, 403) or (e.code in (400, 429) and re.search(r"credit|billing|balance|usage limit|spend", texto, re.I)):
                CLAUDE_APAGADO = True
                break
            if e.code in (429, 500, 502, 503, 529) and intento < 2:
                time.sleep(15 * (intento + 1))
                intento += 1
                continue
            break
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            ultimo = f"claude: {e}"
            if intento < 2:
                time.sleep(10)
                intento += 1
                continue
            break
    CLAUDE_ERRORES.append(f"{que}: {str(ultimo or 'sin respuesta')[:160]}")
    raise RuntimeError(ultimo or "claude: sin respuesta")


def texto_de(msg):
    """El texto de una respuesta de Claude (sin lo que ha pensado ni las búsquedas) y la respuesta entera."""
    return "".join(b.get("text", "") for b in ((msg or {}).get("content") or []) if isinstance(b, dict) and b.get("type") == "text"), msg


def webs_de(msg):
    """Las páginas que ha encontrado la búsqueda en internet de Claude, como fuentes del informe."""
    out = []
    for b in (msg or {}).get("content") or []:
        if isinstance(b, dict) and b.get("type") == "web_search_tool_result" and isinstance(b.get("content"), list):
            for w in b["content"]:
                if isinstance(w, dict) and w.get("url") and all(x["u"] != w["url"] for x in out):
                    out.append({"t": w.get("title") or w["url"], "u": w["url"], "f": w.get("title")})
    return out


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


def extraer_por_clave(texto, claves):
    """Si el JSON entero no se lee (un carácter roto en una de 50 empresas), lo que venga bien de cada una."""
    dec, res = json.JSONDecoder(), {}
    for k in claves:
        m = re.search(r'"' + re.escape(k) + r'"\s*:\s*\{', texto)
        if not m:
            continue
        try:
            o, _ = dec.raw_decode(texto, m.end() - 1)
        except ValueError:
            continue
        if isinstance(o, dict):
            res[k] = o
    return res


def material(instrumentos, precios, radar):
    """Todo lo que lee la IA, con cada noticia numerada para que pueda citarla."""
    fuentes, bloques = [], []

    def citar(lista):
        lineas = []
        # 14 nov 2026 (auditoría): la misma nota en varios medios va una sola vez y dice en cuáles más sale
        for x in agrupar_notas(lista):
            fuentes.append({"t": x["t"], "u": x.get("u"), "f": x.get("f"), "d": x.get("d"), **({"mas": x["mas"]} if x.get("mas") else {})})
            n = len(fuentes)
            zona = f" ({x['z']})" if x.get("z") else ""
            mas = f" [la misma nota sale también en {', '.join(x['mas'])}: es una sola fuente]" if x.get("mas") else ""
            lineas.append(f"[{n}] {dia_pub(x)} {x.get('f') or ''}{zona}: {x['t']}" + (f" — {x['r']}" if x.get("r") else "") + mas)
        return lineas

    N = precios.get("noticias") or {}
    P = precios.get("instrumentos") or {}
    # mercado
    merc = elegir_mercado(N.get("mercado") or [], por_zona=3, total=30)
    for s in MERCADO:
        merc += noticias_yahoo(s, 3)
    mm = precios.get("mercados") or {}
    grupos = {}
    hoy = hoy_madrid()
    for sim, v in mm.items():
        r = v.get("rent") or {}
        grupos.setdefault(v.get("grupo") or "Otros", []).append(
            f"{v.get('nombre')} {round(v['precio'], 4) if isinstance(v.get('precio'), (int, float)) else v.get('precio')}{unidad_mercado(sim, v)} ({v.get('variacion_dia')} % {dia_del_dato(v, hoy)}, {r.get('1m')} % en un mes, {r.get('ytd')} % en el año, {r.get('1a')} % a un año)")
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
        datos = [f"{inst.get('nombre')} ({inst.get('corto')}, {inst.get('tipo')}, id {iid})"] + precio_y_dia(p)
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


# 14 nov 2026 (auditoría): los datos de mercado iban sin unidad («Bitcoin 62.576,99» en euros y «Brent 95,94» en dólares).
# El informe del 13 nov sacó una alerta alta: «el precio en euros de la posición [de bitcoin] parece estar en dólares», porque
# la prensa hablaba de 70.000 dólares y el dato decía 61.963 sin más.
UNIDAD_MERCADO = {"^TNX": " % (rentabilidad del bono, no un precio)", "^IRX": " % (rentabilidad de la letra, no un precio)", "^VIX": " puntos",
                  "DX-Y.NYB": " puntos", "EURUSD=X": " dólares por euro", "EURGBP=X": " libras por euro", "JPY=X": " yenes por dólar",
                  "BZ=F": " dólares por barril", "GC=F": " dólares por onza", "SI=F": " dólares por onza", "HG=F": " dólares por libra de peso",
                  "NG=F": " dólares por millón de BTU", "BTC-EUR": " euros"}
MONEDA_PALABRA = {"EUR": "euros", "USD": "dólares", "GBP": "libras", "JPY": "yenes", "CHF": "francos suizos"}


def unidad_mercado(sim, v):
    """En qué va la cifra de un dato de mercado: los índices, en puntos; los tipos, en %; las divisas, las materias primas y
    la cripto, en su moneda."""
    if sim in UNIDAD_MERCADO:
        return UNIDAD_MERCADO[sim]
    if str(sim).startswith("^") or v.get("grupo") in ("Europa", "EEUU", "Asia y emergentes"):
        return " puntos"
    return f" {MONEDA_PALABRA.get(v.get('moneda'), v.get('moneda'))}" if v.get("moneda") else ""


def dia_del_dato(v, hoy=None):
    """«hoy», o de qué día es el dato de un mercado si no es de hoy (el fin de semana, o Wall Street antes de abrir)."""
    fecha = str(v.get("fecha") or "")[:10]
    return f"el {fecha}, su última sesión" if fecha and fecha < (hoy or hoy_madrid()) else "hoy"


def hoy_madrid():
    try:
        from zoneinfo import ZoneInfo
        return dt.datetime.now(ZoneInfo("Europe/Madrid")).date().isoformat()
    except Exception:  # noqa: BLE001
        return dt.datetime.now(dt.timezone.utc).date().isoformat()


def precio_y_dia(p, hoy=None):
    """El precio de una posición y lo que se movió, diciendo de qué día es si no es de hoy. 13 nov 2026 (auditoría): los
    fondos publican su valor con uno o dos días de retraso y se le pasaba a la IA como «hoy»: el informe decía «el fondo sube
    un 1,87 % hoy, pero el S&P 500 baja» y ponía «mixto» en 6 de los 8 fondos que traían el dato del día 11."""
    fecha = str(p.get("fecha") or "")[:10]
    if fecha and fecha < (hoy or hoy_madrid()):
        return [f"último precio {p.get('precio')} €, del {fecha} (no hay otro más nuevo)", f"ese día, el {fecha}, {p.get('variacion_dia')} % (no es de hoy)"]
    return [f"precio {p.get('precio')} €", f"hoy {p.get('variacion_dia')} %"]


# 14 nov 2026 (auditoría, quinta parte): la fecha del hecho. Cada noticia llevaba delante su fecha a secas y la IA la tomaba
# por la del hecho: «El 13 de noviembre [Corteva] rebajó la guía… y la acción cayó un 24 %» (fue el jueves 12; los artículos
# son del 13 y uno lo dice: «fell by 24.30 percent on Thursday»). Ahora la fecha va con su día de la semana, para que «el
# jueves» o «ayer» se puedan contar, y en la hora del medio: una de cada diez noticias de Yahoo sale entre las 0:00 y las
# 5:00 UTC, que en Nueva York todavía es la tarde del día anterior.
DIAS_SEMANA = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
REGLA_FECHA = """La fecha que lleva delante cada noticia es el día en que se publicó (con su día de la semana), no el día del hecho: muchas
cuentan lo que pasó el día anterior. Pon el día de un hecho solo si la noticia dice cuándo fue («ayer», «el jueves»,
«el 12 de noviembre»), contándolo desde el día de publicación. Si no lo dice, no escribas «el 13 de noviembre hizo X»:
cuenta el hecho sin día y, si quieres decir de cuándo es, ponlo al final entre paréntesis: «(noticias del 13 de noviembre)»."""


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
- Para cada posición: qué ha pasado de verdad en los últimos días (con fechas), si es positivo o
  negativo para la empresa y por qué, y qué vigilar (fecha o precio). Si no hay nada relevante, dilo en una frase.
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
- Salvo cuando el dato de una posición dice de qué día es («del 2026-11-11», «no es de hoy»): los fondos publican su valor
  con uno o dos días de retraso. Ese movimiento no es de hoy: no lo llames «hoy» ni lo compares con lo que hacen hoy los
  índices; di de qué día es («su último valor, del 11 de noviembre, subió un 1,9 %») y, para hoy, lo que hacen los
  mercados que sigue. No digas que el dato no cuadra.
- Cada dato de mercado lleva su unidad (puntos, %, dólares por barril, euros…) y los precios de las posiciones van en
  euros. La prensa suele dar el bitcoin, el oro o el petróleo en dólares: no es un error ni un dato que no cuadre; con
  «Euros por cada unidad de» sale la cuenta (70.000 dólares × 0,907 = 63.500 euros). No avises de que un precio «parece
  estar en otra moneda». Si un dato de mercado dice de qué día es («el 2026-11-13, su última sesión»), no es de hoy: di
  el día («el viernes el S&P 500 bajó un 0,4 %»), no «hoy».
- Fuentes: cuando una noticia dice «la misma nota sale también en…», es una sola fuente aunque la publiquen varios medios;
  dos fuentes son dos medios que lo cuentan cada uno por su lado.
- {REGLA_FECHA}
- Alertas: la urgencia «alta» es la excepción, para lo que puede cambiar en pocos días lo que vale una posición; como
  mucho dos, y lo demás «media». Y «alta» solo si lo cuentan dos fuentes distintas (ponlas en "fuentes") o lo confirma un
  dato de los que te doy (un precio o un movimiento de «Datos» o de la posición, no una cifra de un titular): copia en
  "dato" solo esa cifra («Bitcoin -3,94 % hoy»). Con una sola fuente y sin dato propio, «media», y dilo en el texto
  («según un solo medio»).
- "impacto" y el texto dicen lo mismo: si el texto empieza por "malo para…", el impacto es negativo; si es "bueno para…",
  positivo; si hay de las dos cosas, mixto. Nunca un impacto positivo con un texto que empieza por "malo".
Responde solo con un bloque ```json con este formato:
{
  "resumen": "dos frases cortas como mucho: lo que más afecta hoy a esta cartera y por qué",
  "mercado": [{"zona": "EEUU|Europa|España|Asia|Emergentes|Global", "t": "título corto", "detalle": "dos o tres frases con cifras y fechas", "implica": "una frase: qué supone para esta cartera", "impacto": "positivo|negativo|neutral|mixto", "fuentes": [1, 2]}],
  "macro": [{"t": "qué (BCE, inflación EEUU, bono 10 años...)", "dato": "la cifra, escrita a la española: coma decimal y espacio antes del % (5,12 %; 1,1235)", "lectura": "una frase"}],
  "posiciones": {"<id>": {"novedades": "una o dos frases", "impacto": "positivo|negativo|neutral|mixto", "contraste": "qué fuentes coinciden y cuáles no, en pocas palabras", "vigilar": "fecha o precio", "fuentes": [3]}},
  "alertas": [{"t": "algo que pide atención ya", "id": "<id de posición o ticker>", "urgencia": "alta|media", "fuentes": [1, 2], "dato": "el dato propio que lo confirma, tal cual viene, o vacío"}]
}
Una entrada en "posiciones" por cada posición. "mercado": de 4 a 7, de al menos tres zonas distintas si
hay noticias de ellas. "macro": de 0 a 5, solo los que tengan su cifra en los datos, en las noticias o en lo que encuentres. "alertas": de 0 a 4.""".replace("{REGLA_FECHA}", REGLA_FECHA.replace("\n", "\n  "))


def fuentes_distintas(fs):
    """Cuántas fuentes de verdad hay en una lista de noticias: dos del mismo medio, o la misma nota en dos medios, cuentan
    como una."""
    fs = [f for f in fs if isinstance(f, dict) and f.get("t")]
    grupo = list(range(len(fs)))

    def raiz(i):
        while grupo[i] != i:
            i = grupo[i]
        return i
    for i in range(len(fs)):
        for j in range(i):
            mi, mj = _llano(fs[i].get("f")).strip(), _llano(fs[j].get("f")).strip()
            # Yahoo Finance no es un medio: reúne los de otros
            mismo_medio = mi and mi == mj and mi != "yahoo finance"
            if mismo_medio or P.misma_nota(fs[i]["t"], fs[j]["t"]):
                grupo[raiz(i)] = raiz(j)
    return len({raiz(i) for i in range(len(fs))})


def _cifras(texto, a_la_espanola=False):
    """Las cifras de un texto, con sus decimales: [(valor, decimales)]. A la española, «62.576,99» y «5,15»."""
    out = []
    for m in re.findall(r"\d[\d.,]*", str(texto or "")):
        m = m.rstrip(".,")
        cands = [m.replace(".", "").replace(",", ".")] if a_la_espanola else []
        cands.append(m.replace(",", "") if not a_la_espanola else m.replace(",", "."))
        for c in cands:
            try:
                out.append((float(c), len(c.split(".")[1]) if "." in c else 0))
            except ValueError:
                continue
    return out


def dato_propio(dato, datos_txt):
    """Si el «dato» de una alerta está de verdad en los datos que se le dieron a la IA (no en los titulares): alguna de sus
    cifras, con decimales o de cuatro dígitos o más, coincide con una de los datos al redondear."""
    propios = [abs(v) for v, _ in _cifras(datos_txt)]
    for v, dec in _cifras(dato, a_la_espanola=True):
        if dec == 0 and v < 1000:
            continue  # «10 años», «S&P 500», «3 meses»: no son un dato
        margen = 0.5 * 10 ** -dec + 1e-9
        if any(abs(p - v) <= margen for p in propios):
            return True
    return False


ALTAS_MAX = 2


def asentar_alertas(inf, fuentes, texto):
    """14 nov 2026 (auditoría): una alerta alta pide dos fuentes o un dato propio. La primera alerta del informe del 13 nov
    («la Fed podría subir tipos en diciembre, probabilidad del 93,5 %», urgencia alta) salía de un solo titular de
    Cryptonews.net. La IA cita ahora las noticias de cada alerta y el dato que la confirma; aquí se comprueba: con menos de
    dos fuentes distintas y sin un dato que esté en lo que se le dio, la alerta baja a «media»."""
    datos_txt = "\n".join(x for x in str(texto or "").splitlines() if not re.match(r"\s*\[\d+\]", x))
    out = []
    for a in inf.get("alertas") or []:
        if not isinstance(a, dict) or not a.get("t"):
            continue
        fs = []
        for n in a.get("fuentes") or []:
            try:
                f = fuentes[int(n) - 1]
            except (ValueError, IndexError, TypeError):
                continue
            if f not in fs:
                fs.append(f)
        a = {**a, "fuentes": [f for f in fs if f.get("u")][:4]}
        con_dato = bool(a.get("dato")) and dato_propio(a.get("dato"), datos_txt)
        if not con_dato:
            a.pop("dato", None)
        if a.get("urgencia") == "alta" and fuentes_distintas(fs) < 2 and not con_dato:
            a["urgencia"] = "media"
            a["rebajada"] = 1
        # y como mucho ALTAS_MAX altas (las primeras): en el primer ensayo, con la regla nueva, la IA puso «alta» a todo lo que
        # tenía dos fuentes (4 de 4 alertas; con el encargo de antes daba 2)
        elif a.get("urgencia") == "alta" and sum(1 for x in out if x.get("urgencia") == "alta") >= ALTAS_MAX:
            a["urgencia"] = "media"
            a["rebajada"] = 2
        out.append(a)
    inf["alertas"] = out
    return inf


def marcar(dir_salida, clave_id, valor):
    """precios.json lleva la fecha de cada archivo de la IA: la web sabe así cuándo volver a leerlos."""
    ruta = f"{dir_salida}/precios.json"
    p = leer(ruta)
    if p:
        p[clave_id] = valor
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump(p, f, ensure_ascii=False, separators=(",", ":"))


def informe_cartera(ruta_inst, dir_anterior, dir_salida):
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

    if not clave_claude():
        return conservar("sin ANTHROPIC_RADAR_KEY, se deja el anterior")
    if previo.get("generado") and hace_menos_de(previo["generado"], HORAS_INFORME) and not os.environ.get("INFORME_FORZAR"):
        return conservar("el último tiene menos de 2 horas")
    if not hay_tiempo("informe", TIEMPO_INFORME):
        return conservar("sin tiempo en esta pasada, se deja el anterior")
    instrumentos = leer(ruta_inst).get("instrumentos") or []
    precios = leer(f"{dir_salida}/precios.json")
    radar = leer(f"{dir_salida}/radar.json")
    texto, fuentes = material(instrumentos, precios, radar)
    print(f"informe: {len(fuentes)} noticias, {len(texto)} caracteres")
    hoy = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    # 0.8.2d: Haiku pensando y por lote; con INFORME_BUSQUEDA=1, con 3 búsquedas en internet como mucho. Esfuerzo bajo: en el
    # ensayo del 6 nov, con el medio escribió 25.600 de los 32.768 tokens de salida (sin pensar eran unos 5.000) y se podía
    # quedar cortado
    p = pedido(INSTRUCCIONES, f"Hoy es {hoy}.\n\n{texto}", 32768, pensar="low", buscar=3 if BUSQUEDA else 0)
    try:
        resp = ia(p, "informe_cartera")
        modelo_usado = resp.get("model") or CLAUDE_MODELO
        texto_r, _ = texto_de(resp)
        web = webs_de(resp)
        busqueda = bool(web)
        inf = extraer_json(texto_r)
        if not inf or not isinstance(inf.get("posiciones"), dict):
            return conservar("la respuesta de la IA no trae un informe válido")
    except Exception as e:  # noqa: BLE001
        return conservar(f"falló la IA: {str(e)[:200]}")
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
    asentar_alertas(inf, fuentes, texto)
    inf.update({"generado": ahora(), "modelo": modelo_usado, "noticias_leidas": len(fuentes), "busqueda": busqueda, "web": web[:15]})
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(inf, f, ensure_ascii=False, separators=(",", ":"))
    marcar_inf(inf["generado"])
    print(f"informe: listo ({len(inf.get('posiciones') or {})} posiciones, búsqueda en internet: {busqueda})")
    return True


# ---------------------------------------------------------------- escaneo de toda la bolsa

def nombre_corto(n, s):
    n = re.sub(r",?\s+(S\.?A\.?U?|S\.?p\.?A\.?|N\.?V\.?|SE|AG|plc|PLC|p\.l\.c\.|Inc\.?|Corp\.?|Corporation|Holdings?|Group|Ltd\.?|ASA|AB|Oyj|Company|Aktiengesellschaft|A/S|KGaA|SGPS|\(publ\))(?![\w])(.*)$", "", n or "")
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
        out.append({kk: x.get(kk) for kk in ("t", "r", "f", "d", "u", "w") if x.get(kk)})
    out.sort(key=lambda x: x.get("d") or "", reverse=True)
    e["n"] = out[:MAX_NOTICIAS]
    e[campo] = ahora()


# 14 nov 2026 (auditoría): la prensa en español (Google Noticias) solo la veían las 98 españolas, cada 50 minutos; las otras
# 2.716 empresas, nunca. Y de las europeas, 330 de 1.063 no tienen en Yahoo ni un titular que las nombre (E.ON, Prosus,
# Beiersdorf, British American Tobacco, Prudential, Ørsted…): la IA no tenía nada suyo que leer. Ahora las españolas se
# repasan cada 3 horas y el resto del cupo de cada pasada es para esas europeas, cada 12 horas. El mismo número de consultas.
HORAS_GOOGLE_ES = 3
HORAS_GOOGLE_EU = 12


def de_google(n):
    return "news.google." in str(n.get("u") or "")


def sin_titular_propio(cache, x):
    """Si a la empresa ya la ha mirado Yahoo y no tiene de allí ni un titular que la nombre."""
    e = cache.get(x["s"]) or {}
    return bool(e.get("fy")) and not any(nombra(x, n) for n in (e.get("n") or []) if not de_google(n))


def lote_google(cache, valores, ahora_dt=None):
    """Las empresas a las que toca mirar la prensa en español en esta pasada: primero las españolas que llevan más de
    HORAS_GOOGLE_ES sin mirarse y, con lo que quede del cupo, las europeas sin titulares propios en Yahoo que llevan más de
    HORAS_GOOGLE_EU; en los dos grupos, antes las que más tiempo llevan."""
    ahora_dt = ahora_dt or dt.datetime.now(dt.timezone.utc)

    def fg(x):
        return (cache.get(x["s"]) or {}).get("fg") or ""

    def toca(x, horas):
        d = cuando(fg(x)) if fg(x) else None
        return d is None or ahora_dt - d >= dt.timedelta(hours=horas)
    es = sorted((x for x in valores if x.get("z") == "España" and toca(x, HORAS_GOOGLE_ES)), key=fg)[:LOTE_GOOGLE]
    eu = sorted((x for x in valores if x.get("z") == "Europa" and toca(x, HORAS_GOOGLE_EU) and sin_titular_propio(cache, x)), key=fg)
    return es + eu[: max(0, LOTE_GOOGLE - len(es))]


def actualizar_noticias(cache, valores):
    """Noticias de las empresas que más tiempo llevan sin mirar (las nuevas, primero)."""
    lote = sorted(valores, key=lambda x: (cache.get(x["s"]) or {}).get("fy") or "")[:LOTE_YAHOO]
    with cf.ThreadPoolExecutor(max_workers=HILOS_YAHOO) as ex:
        for x, ns in ex.map(lambda x: (x, noticias_yahoo(x["s"], 6)), lote):
            mezclar(cache, x["s"], ns, "fy")
    lote_g = lote_google(cache, valores)
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
            f"beneficio esperado {x.get('epsg') if x.get('epsg') is not None else x.get('eg')} %, dividendo {x.get('div') or 0} %, {en_un_ano(x.get('c1a'))}, "
            f"contraste de la web {fav} señales a favor y {con} en contra")


def en_un_ano(c1a):
    """Lo que ha hecho la cotización en el último año, dicho con verbo y en pasado. 14 nov 2026 (ensayos de la auditoría):
    «últimos 12 meses 0,7 %» Haiku lo leyó dos veces como el beneficio de Técnicas Reunidas (iba detrás de «beneficio
    esperado»), y «la acción en 12 meses 0,7 %», una de tres veces como una previsión («la web solo calcula un 0,7 %»)."""
    try:
        v = float(c1a)
    except (TypeError, ValueError):
        return "sin dato de lo que ha hecho la acción en el último año"
    return f"en el último año la acción ha {'subido' if v >= 0 else 'bajado'} un {abs(c1a)} % (ya pasado, no es una previsión)"


def tendencia_idea(x):
    """La tendencia de la cotización, para la decisión: hoy, frente a sus medias de 50 y 200 sesiones y a su máximo de 52
    semanas. 13 nov 2026 (auditoría): el encargo de la decisión dice que las candidatas traen «tendencia» y no la traían;
    decidía con el recorrido hasta el precio objetivo, que se dispara justo cuando la acción se hunde y los analistas aún no
    han tocado sus objetivos (Western Digital: 108 % de recorrido con el precio un 25 % por debajo de su media de 50)."""
    p = x.get("p")
    if not p:
        return ""

    def frente(v):
        return f"{round((p / v - 1) * 100, 1)} %" if v else "?"
    t = [f"hoy {x.get('v')} %" if x.get("v") is not None else "", f"{frente(x.get('m50'))} frente a su media de 50 sesiones",
         f"{frente(x.get('m200'))} frente a la de 200", f"{frente(x.get('mx'))} desde su máximo de 52 semanas"]
    return "Tendencia: " + ", ".join(y for y in t if y) + "."


# 13 nov 2026 (auditoría): el RSS de Yahoo devuelve lo mismo para muchos tickers europeos que no conoce («AF Gruppen
# reports strong Q3 profit» colgaba de 78 empresas). Un enlace que cuelga de COMPARTIDA_MIN empresas o más y no nombra a
# la empresa (ni su nombre ni su ticker, en el titular o en el resumen) no se le pasa a la IA. Medido con los datos del
# 13 nov: 875 titulares de 15.919 (5,5 %), de los que la propia IA había marcado 816 como relleno (peso 0), 5 con peso 1 y
# ninguno con más; 81 empresas se quedan sin nada que leer.
COMPARTIDA_MIN = 10
GENERICAS = set("the and of de la el los las group grupo holding holdings company companies corporation corp inc plc sa se ag nv ab asa "
                "oyj spa ltd limited co banco bank banca first american united national international global general new compagnie "
                "societe sociedad financiere industries trust investment capital energy".split())


def _llano(t):
    return "".join(c for c in unicodedata.normalize("NFD", str(t or "").lower()) if unicodedata.category(c) != "Mn")


def nombra(x, n):
    """Si la noticia `n` nombra a la empresa `x`: una de las dos primeras palabras propias de su nombre, o su ticker en
    mayúsculas, en el titular o en el resumen. Ante la duda (sin nombre ni ticker que buscar), sí."""
    palabras = [w for w in re.split(r"[^a-z0-9]+", _llano(x.get("n"))) if len(w) >= 3 and w not in GENERICAS][:2]
    raiz = re.split(r"[.\-]", str(x.get("s") or ""))[0]
    raiz = raiz if len(raiz) >= 2 else ""
    if not palabras and not raiz:
        return True
    crudo = f"{n.get('t') or ''} {n.get('r') or ''}"
    texto = _llano(crudo)
    if any(re.search(r"(?<![a-z0-9])" + re.escape(w) + r"(?![a-z0-9])", texto) for w in palabras):
        return True
    return bool(raiz) and re.search(r"(?<![A-Za-z0-9])" + re.escape(raiz.upper()) + r"(?![A-Za-z0-9])", crudo) is not None


def compartidas(cache):
    """Los enlaces que cuelgan de COMPARTIDA_MIN empresas o más."""
    c = collections.Counter(n.get("u") for e in cache.values() if isinstance(e, dict) for n in (e.get("n") or []) if n.get("u"))
    return {u for u, k in c.items() if k >= COMPARTIDA_MIN}


def propias(cache, x, comp):
    """Las noticias guardadas de la empresa, sin las compartidas que no la nombran."""
    return [n for n in ((cache.get(x["s"]) or {}).get("n") or []) if not (n.get("u") in comp and not nombra(x, n))]


# 14 nov 2026 (auditoría, quinta parte): la misma nota repetida, también en lo que lee la IA de cada empresa. Con la regla de
# los titulares de mercado tal cual no vale: todos los titulares de una empresa comparten su nombre, y «Better Dividend
# Stock for Retirees: IBM vs. ADP» pasaba por la misma nota que «…: IBM vs. Microchip» (1.263 «repetidos» de 12.224, casi
# todos falsos). Aquí el nombre y el ticker de la empresa no cuentan y las dos tienen que ser de los mismos días: así
# «Beam anuncia datos positivos» (10 nov) no se junta con «Beam presentará datos» (4 nov). Con los datos del 14 nov son 196
# titulares de 12.224 en 158 empresas, y entran 143 que antes no cabían entre los seis que se leen.
DIAS_MISMA_NOTA = 2
OTROS_TITULOS = 3           # de una nota repetida, los otros titulares que se le enseñan a la IA


def palabras_empresa(x):
    """Las palabras del nombre de la empresa y su ticker: salen en casi todos sus titulares y no dicen si dos cuentan lo mismo."""
    w = set(re.split(r"[^a-z0-9]+", _llano(x.get("n"))))
    w.add(re.split(r"[.\-]", str(x.get("s") or ""))[0].lower())
    return {y for y in w if y}


def notas_de_empresa(x, lista):
    """Las noticias de la empresa con cada nota una sola vez, en el mismo orden. Dos son la misma nota si cuentan lo mismo
    (P.misma_nota, sin las palabras del nombre) y se publicaron con DIAS_MISMA_NOTA días de diferencia como mucho. De cada
    grupo se queda la que más texto trae (titular y resumen) y lleva: en «mas», los otros medios que la publican; en
    «_otros», los otros titulares (se le enseñan a la IA y heredan su marca en la ficha); y en «_d0», la primera fecha en
    que salió, que es la que más se acerca a la del hecho."""
    sin, grupos = palabras_empresa(x), []
    for n in lista:
        if not isinstance(n, dict) or not n.get("t"):
            continue
        d = fecha_de(n.get("d"))
        for g in grupos:
            cerca = d is not None and all(fecha_de(y.get("d")) is not None and abs((d - fecha_de(y.get("d"))).days) <= DIAS_MISMA_NOTA for y in g)
            if cerca and any(P.misma_nota(n["t"], y["t"], sin) for y in g):
                g.append(n)
                break
        else:
            grupos.append([n])
    out = []
    for g in grupos:
        if len(g) == 1:
            out.append(g[0])
            continue
        uno = max(g, key=lambda y: len(y.get("t") or "") + len((y.get("r") or "")[:300]))
        otros = [y for y in g if y is not uno]
        medios = []
        for y in otros:
            if y.get("f") and y["f"] != uno.get("f") and y["f"] not in medios:
                medios.append(y["f"])
        rep = {**uno, "_otros": [{k: y.get(k) for k in ("t", "f", "d") if y.get(k)} for y in otros], "_d0": min(str(y.get("d") or "") for y in g)}
        if medios:
            rep["mas"] = medios[:4]
        out.append(rep)
    return out


def dia_pub(n, d=None):
    """El día en que se publicó una noticia, con el de la semana y en la hora de su medio (la prensa en español de Google
    Noticias, la de Madrid; Yahoo Finance, la de Nueva York): «jue 2026-11-12»."""
    t = cuando(d or n.get("d"))
    if t is None:
        return str(d or n.get("d") or "")[:10]
    try:
        from zoneinfo import ZoneInfo
        t = t.astimezone(ZoneInfo("Europe/Madrid" if de_google(n) else "America/New_York"))
    except Exception:  # noqa: BLE001
        pass
    return f"{DIAS_SEMANA[t.weekday()]} {t.date().isoformat()}"


def hoy_con_dia():
    """«sáb 2026-11-14», en la hora de Madrid."""
    h = fecha_de(hoy_madrid())
    return f"{DIAS_SEMANA[h.weekday()]} {h.isoformat()}"


def linea_noticia(k, n, resumen=300):
    """La línea numerada de una noticia en lo que lee la IA: el día en que se publicó (el primero, si la nota se repite), el
    medio, el titular, el resumen y, si la nota se repite, dónde más sale."""
    cola = ""
    if n.get("_otros"):
        otros = "; ".join((f"{o['f']}, " if o.get("f") and o["f"] != n.get("f") else "") + f"«{o['t'][:110]}»" for o in n["_otros"][:OTROS_TITULOS])
        cola = f" [la misma nota, repetida: es una sola noticia y una sola fuente. También: {otros}]"
    return (f"[{k}] {dia_pub(n, n.get('_d0'))} {n.get('f') or ''}: {n['t']}" + (f" — {n['r'][:resumen]}" if resumen and n.get("r") else "") + cola)


def citadas_por_peso(r, fuentes, s):
    """Los números de las noticias que cita la lectura de `s`, de más a menos peso según la propia IA («tit») y sin las que
    ella misma marca como relleno (peso 0), y la fecha de la más reciente con peso 2 o más. Solo las de su bloque. 13 nov
    2026 (auditoría): se guardaban las dos primeras que citaba, y 305 de 2.409 lecturas enseñaban como fuente un titular que
    la IA había marcado como relleno (en Audax, dos notas de Klépierre y Ramsay)."""
    pesos = {}
    tit = r.get("tit")
    for k, v in (tit.items() if isinstance(tit, dict) else []):
        try:
            pesos[int(k)] = F.peso_de(v[2] if isinstance(v, (list, tuple)) and len(v) > 2 else 0)
        except (TypeError, ValueError):
            continue

    def suya(k):
        return 1 <= k <= len(fuentes) and fuentes[k - 1].get("_s", s) == s
    nums = []
    for k in r.get("fuentes") or []:
        try:
            k = int(k)
        except (TypeError, ValueError):
            continue
        if suya(k) and k not in nums:
            nums.append(k)
    con_peso = sorted((k for k in nums if pesos.get(k, 1) > 0), key=lambda k: -pesos.get(k, 1))
    # de una nota repetida cuenta la primera vez que salió: que otro medio la publique dos días después no la hace nueva
    fechas = [str(fuentes[k - 1].get("_d0") or fuentes[k - 1].get("d") or "") for k, p_ in pesos.items() if p_ >= 2 and suya(k)]
    return (con_peso or nums), (max(fechas) if any(fechas) else None)


# 14 nov 2026 (auditoría, quinta parte): relevancia 3 («cambia la tesis») con una mención de pasada. PepsiCo salió «negativo,
# cambia la tesis» por una frase del resumen de «Procter & Gamble or PepsiCo: The One Dividend Stock I'd Hold for the Next
# 20 Years». La relevancia 3 es la que saca y mete ideas de un día para otro (gorda()), así que además de pedírselo a la IA
# en el encargo se comprueba aquí: tiene que apoyarse en alguna noticia de peso que no sea una comparación entre acciones,
# una lista o lo que hace un fondo. Con los datos del 14 nov, 9 de 12.164 titulares marcados son de esos y llevan peso 3, y
# ninguna de las 173 lecturas de relevancia 3 se apoya solo en ellos: es una red para un caso raro, no un filtro.
# OJO con el encargo: en el primer ensayo decía además «el peso 3 y "rel" 3 son la excepción», y Haiku bajó la relevancia de
# todo (de 27 y 32 lecturas con 3, de 120, a 12 y 8; una opa de exclusión se quedó en 2). Ahora solo habla de la mención de
# pasada. Lo que sí enseñó ese ensayo: la relevancia 3 baila (de 30 lecturas publicadas con 3, releídas con el mismo código
# salieron 3 solo 12 y 16).
DE_PASADA = re.compile(
    r"\bvs\.?(?!\w)"                                                             # «Abbott vs. Medtronic»
    r"|^[^:?]{2,60}\b(or|o)\b[^:?]{2,60}[:?]"                                     # «Visa or Mastercard: I Can Only Pick One…»
    r"|^(top |the |best |los |las |mis )?\d+ [^:]{0,70}\b(stocks?|acciones|valores|etfs?)\b"   # «3 British Dividend Stocks…»
    r"|\b(better|best)\b[^:]{0,50}\bstocks?\b|\bstocks? to (buy|watch|own|hold)\b|\bdividend stocks?\b"
    r"|\$[\d.,]+ ?(million|billion|bn|m|b)? (fund|portfolio)\b|\bportfolio in\b"   # «A $9.2 Billion Fund Dumps These 3 Stocks»
    r"|\b(buys|adds|sells|dumps)\b[^:]{0,60}\bon (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? \d", re.I)   # un ETF que compra


def de_pasada(t):
    """Si el titular es de un artículo que no va de una empresa: una comparación, una lista o las compras de un fondo."""
    return bool(DE_PASADA.search(str(t or "")))


def rel_fundada(rel, r, fuentes, s):
    """La relevancia que se guarda. Un 3 se queda en 3 solo si alguna de las noticias de peso de la empresa (las de peso 3
    según la propia IA; si no marca ninguna con 3, las de peso 2) va de ella y no es un artículo de pasada (de_pasada). Si
    todas lo son, o si no ha marcado ninguna noticia suya con peso 2 o más, baja a 2."""
    tit = r.get("tit")
    if rel < 3 or not isinstance(tit, dict) or not tit:
        return rel
    pesos = {}
    for k, v in tit.items():
        try:
            k = int(k)
            if 1 <= k <= len(fuentes) and fuentes[k - 1].get("_s", s) == s:
                pesos[k] = F.peso_de(v[2] if isinstance(v, (list, tuple)) and len(v) > 2 else 0)
        except (TypeError, ValueError):
            continue
    fuertes = [k for k, p_ in pesos.items() if p_ >= 3] or [k for k, p_ in pesos.items() if p_ >= 2]
    if fuertes and not all(de_pasada(fuentes[k - 1].get("t")) for k in fuertes):
        return 3
    print(f"escaneo: {s} baja de relevancia 3 a 2: " + ("solo la sostienen artículos de pasada" if fuertes else "ninguna de sus noticias lleva peso 2 o más"))
    return 2


LEER = """Vigilas la prensa de cientos de empresas para un inversor particular español. Para cada empresa
tienes sus datos y sus noticias numeradas (titulares de Google Noticias en español y de Yahoo Finance con
su resumen). Para cada empresa:
1. En una frase: qué dicen de verdad las noticias (con fecha), si es positivo o negativo para la empresa, cuánto
   importa y si hay algo con fecha que pueda moverla pronto.
2. Cada titular numerado, en uno de estos factores, con su signo para la empresa ("+" positivo, "-" negativo,
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
{REGLA_FECHA}
Cuando una noticia dice «la misma nota, repetida», es una sola noticia aunque salga en varios medios o varias veces: no
pesa más por repetirse.
Responde con un objeto JSON:
{"<ticker>": {"imp": "positivo|negativo|neutral|mixto", "rel": 0-3, "txt": "una frase", "cat": "lo que puede moverla y cuándo, o vacío", "fuentes": [números],
  "tit": {"<número>": ["factor", "signo", peso]},
  "fa": {"<factor>": {"s": "signo", "p": peso, "plazo": "corto|medio|largo", "txt": "una frase", "fuentes": [números]}}}}
"rel": 0 si no hay nada relevante, 1 poco, 2 importante, 3 cambia la tesis. Una entrada por empresa; en "fa",
solo los factores que tengan noticias de peso 1 o más.""".replace("{REGLA_FECHA}", REGLA_FECHA)


def leer_lote(lectura, cache, valores, medianas, fichas=None, tuyas=()):
    """La IA lee la prensa de las empresas con noticias que todavía no ha leído. Primero las de las carteras, luego las
    que nunca se han leído y luego las leídas hace más tiempo (6 nov 2026: antes iban las de mejores números, pero el
    radar ya no se elige por lo que dicen los analistas). 0.7: de paso clasifica cada titular y rellena las fichas.
    Con Claude y la API por lotes se leen hasta LOTE_LECTURA_LOTES empresas por pasada (peticiones de 50 dentro de un
    mismo lote); si no, LOTE_LECTURA como siempre."""
    global CLAUDE_APAGADO
    pend, comp, suyas = [], compartidas(cache), {}
    for x in valores:
        suyas[x["s"]] = propias(cache, x, comp)
        if not suyas[x["s"]]:
            continue
        h = huella(suyas[x["s"]])
        antes = lectura.get(x["s"]) or {}
        # leída ya con estas noticias: no se vuelve a leer. Salvo si fue antes de las fichas y no tiene la suya: si no,
        # una empresa sin titulares nuevos se quedaría sin ficha hasta que salieran (el 24 oct, 322 de 814)
        sin_ficha = fichas is not None and x["s"] not in fichas.get("e", {}) and (antes.get("d") or "") < INICIO_FICHAS
        if antes.get("h") == h and not sin_ficha:
            continue
        if fichas is not None and (fichas.get("sin") or {}).get(x["s"]) == h:
            continue
        pend.append(((0 if x["s"] in tuyas else 1, 1 if antes.get("d") else 0, antes.get("d") or ""), x, h))
    pend.sort(key=lambda t: t[0])
    por_lote = bool(clave_claude()) and CLAUDE_LOTES and not LOTES_APAGADOS[0] and not CLAUDE_APAGADO
    lote = pend[:LOTE_LECTURA_LOTES if por_lote else LOTE_LECTURA]
    if not lote:
        print("escaneo: nada nuevo que leer")
        return 0
    sin = fichas.setdefault("sin", {}) if fichas is not None else {}
    t0 = time.time()

    def construir(trozo):
        """El cuerpo de la petición de estas empresas y la lista numerada de sus noticias."""
        fuentes, bloques = [], []
        for _, x, _ in trozo:
            lineas = []
            # cada nota, una vez (notas_de_empresa): las repetidas ya no ocupan sitio entre las seis que se leen. La huella
            # («h») sigue siendo la de todos los titulares guardados: así este cambio no hace releer nada por sí solo
            for n in notas_de_empresa(x, suyas[x["s"]])[:6]:
                fuentes.append({**n, "_s": x["s"]})
                lineas.append(linea_noticia(len(fuentes), n))
            bloques.append(f"## {x['s']}\n{datos_idea(x, medianas)}\n" + "\n".join(lineas))
        return pedido(LEER, f"Hoy es {hoy_con_dia()}.\n\n" + "\n\n".join(bloques), 32768, json_=True), fuentes

    def aplicar(trozo, texto, fuentes):
        """Apunta lo que ha contestado la IA de estas empresas y devuelve (cuántas, las que no han venido)."""
        res = extraer_json(texto)
        if res is None:
            res = extraer_por_clave(texto, [x["s"] for _, x, _ in trozo])
            print(f"escaneo: la respuesta no era un JSON entero; se aprovechan {len(res)} de {len(trozo)} empresas")
        n = 0
        for _, x, h in trozo:
            r = res.get(x["s"])
            if not isinstance(r, dict):
                continue
            fs = []
            citadas, dn = citadas_por_peso(r, fuentes, x["s"])
            for k in citadas:
                f = fuentes[k - 1]
                if f.get("u") and len(fs) < 2:
                    fs.append({kk: f.get(kk) for kk in ("t", "u", "f", "d", "w") if f.get(kk)})
            try:
                rel = max(0, min(3, int(r.get("rel") or 0)))
            except (TypeError, ValueError):
                rel = 0
            rel = rel_fundada(rel, r, fuentes, x["s"])
            antes = lectura.get(x["s"]) or {}
            nueva = {"d": ahora(), "h": h, "imp": r.get("imp") if r.get("imp") in ("positivo", "negativo", "neutral", "mixto") else "neutral",
                     "rel": rel, "txt": (r.get("txt") or "")[:300], "cat": (r.get("cat") or "")[:160], "fuentes": fs}
            if rel >= 3:  # desde cuándo es gorda con este signo y de cuándo es su última noticia de peso (ver gorda())
                sigue = (antes.get("rel") or 0) >= 3 and antes.get("imp") == nueva["imp"]
                nueva["g"] = (antes.get("g") or antes.get("d") or nueva["d"]) if sigue else nueva["d"]
                if dn:
                    nueva["dn"] = dn
            lectura[x["s"]] = nueva
            if fichas is not None:
                F.aplicar_lectura(fichas, x["s"], r, fuentes, lectura[x["s"]]["d"], x.get("n"))
            n += 1
        return n, [t for t in trozo if not isinstance(res.get(t[1]["s"]), dict)]

    def leer_trozo(trozo):
        """Una llamada con estas empresas; apunta lo leído y devuelve las que no han venido."""
        cuerpo, fuentes = construir(trozo)
        texto, _ = texto_de(ia(cuerpo, "leer_lote", lote=False))
        return aplicar(trozo, texto, fuentes)

    def en_peticiones(trozo):
        """Las peticiones de un trozo: una de 50 empresas (LOTE_LECTURA) y, si se pasara de tamaño, más pequeñas.
        Cada petición es [(trozo, cuerpo, fuentes)]: la de Haiku cobra mucho más con más de 100.000 de entrada."""
        out = []
        for i in range(0, len(trozo), LOTE_LECTURA):
            parte = trozo[i:i + LOTE_LECTURA]
            cuerpo, fuentes = construir(parte)
            if len(texto_del_pedido(cuerpo)) > TANDA_MAX_CARACTERES and len(parte) > 1:
                m = len(parte) // 2
                out += en_peticiones(parte[:m]) + en_peticiones(parte[m:])
            else:
                out.append((parte, cuerpo, fuentes))
        return out

    def ronda_por_lote(trozo, tamano):
        """Un lote con todas las peticiones de estas empresas (en trozos de `tamano`). Devuelve (cuántas leídas, las que
        no han venido). Lanza lo que lance el lote si no sale."""
        peticiones = []
        for i in range(0, len(trozo), tamano):
            peticiones += en_peticiones(trozo[i:i + tamano])
        pedidos = {f"t{k}": c for k, (_, c, _) in enumerate(peticiones)}
        print(f"escaneo: lote con {len(pedidos)} peticiones ({len(trozo)} empresas)")
        mensajes = mensajes_por_lote(pedidos, clave_claude())
        n, faltan = 0, []
        for k, (parte, _, fuentes) in enumerate(peticiones):
            msg = mensajes.get(f"t{k}")
            if msg is None or not texto_de(msg)[0].strip():
                if msg:
                    u = msg.get("usage") or {}
                    print(f"escaneo: respuesta vacía de {msg.get('model')}: stop_reason={msg.get('stop_reason')}, in={u.get('input_tokens')}, out={u.get('output_tokens')}")
                faltan += parte
                continue
            apuntar_uso(msg, "leer_lote", lote=True)
            m, f2 = aplicar(parte, texto_de(msg)[0], fuentes)
            n += m
            faltan += f2
        return n, faltan

    nivel = 0
    if por_lote:
        # Una ronda con todas las peticiones en un lote. Lo que no sale (Haiku falla al azar en un 10-15 % de las tandas) se
        # parte a la mitad y va en otro lote, hasta grupos de LOTE_MIN_PARTIR o hasta que se acabe el tiempo de la pasada.
        tamano = LOTE_LECTURA
        try:
            n, faltan = ronda_por_lote(lote, tamano)
        except (RuntimeError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError) as e:
            if isinstance(e, urllib.error.HTTPError) and e.code in (401, 403):
                CLAUDE_APAGADO = True  # la clave no vale: el resto de la pasada, sin IA
                CLAUDE_ERRORES.append(f"leer_lote: lote {e.code}")
            LOTES_APAGADOS[0] = True
            print(f"claude: el lote no ha salido ({str(e)[:120]}), sigo en directo con una tanda")
            por_lote = False
        else:
            while faltan and nivel < RONDAS_LOTE - 1 and tamano > LOTE_MIN_PARTIR and n and time.time() - INICIO < PRESUPUESTO * 0.55:
                nivel += 1
                tamano = max(LOTE_MIN_PARTIR, tamano // 2)
                print(f"escaneo: {len(faltan)} empresas sin leer; otro lote en grupos de {tamano}")
                try:
                    m, faltan = ronda_por_lote(faltan, tamano)
                except (RuntimeError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError) as e:
                    print(f"claude: el lote de repaso no ha salido ({str(e)[:120]}); lo que falta, en la siguiente pasada")
                    break
                n += m
    if not por_lote:
        # sin lotes: como siempre, una tanda en directo
        lote = lote[:LOTE_LECTURA]
        n, faltan = leer_trozo(lote)
        # Si la IA se atasca con algo del lote (el 24 oct, 377 tokens para 50 empresas, dos pasadas seguidas con el
        # mismo lote), se parte en dos lo que no ha venido, hasta grupos de 3 o 4.
        while faltan and len(faltan) > LOTE_MIN_PARTIR and nivel < 4 and time.time() - t0 < 180 and (n or nivel == 0):
            mitad = (len(faltan) + 1) // 2
            nivel += 1
            print(f"escaneo: {len(faltan)} empresas sin leer; otra vez en dos mitades")
            quedan = []
            for parte in (faltan[:mitad], faltan[mitad:]):
                m, f2 = leer_trozo(parte)
                n += m
                quedan += f2
            faltan = quedan
    # Lo que tampoco sale así se aparta (fichas.json → sin, con la huella de sus noticias) hasta que tenga noticias
    # nuevas: si no, frenaría siempre. Solo si se ha llegado a un grupo pequeño (si se ha parado por tiempo, se sigue
    # en la siguiente pasada)
    if faltan and n and nivel and len(faltan) <= 2 * LOTE_MIN_PARTIR:
        for _, x, h in faltan:
            sin[x["s"]] = h
        print(f"escaneo: {len(faltan)} empresas apartadas hasta que tengan noticias nuevas: {', '.join(x['s'] for _, x, _ in faltan)}")
    print(f"escaneo: la IA ha leído la prensa de {n} empresas de {len(pend)} pendientes")
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
- Mira la línea «Tendencia» de cada una. El recorrido hasta el precio objetivo se dispara cuando la acción cae deprisa y
  los analistas aún no han tocado sus objetivos: si cotiza muy por debajo de sus medias de 50 y de 200 sesiones, ese
  recorrido vale menos; dilo en «riesgo» y baja la confianza, o espera a que deje de caer. Y no repitas la misma apuesta:
  si varias candidatas dependen de lo mismo (el mismo sector, el mismo cliente, la misma noticia), elige la mejor.
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
- {REGLA_FECHA}
  Y «la misma nota, repetida» es una sola fuente aunque salga en varios medios.
- Lenguaje llano: lo lee alguien que no es experto. Nada de jerga sin explicar (catalizador, capex,
  amplitud de mercado, soportes, recorrido, múltiplos, rotación sectorial, risk-off...): dilo con palabras
  normales o explícalo en la misma frase. La tesis, en una o dos frases que entienda cualquiera.
Responde con un objeto JSON:
{"comentario": "dos frases: cómo está el panorama y qué has buscado (en primera persona del singular: «He buscado…», nunca «Hemos»)",
 "ideas": [{"s": "ticker", "tesis": "una o dos frases", "catalizador": "qué y cuándo", "riesgo": "...", "contraste": "qué coincide y qué no", "confianza": "alta|media|baja", "plazo_meses": 6, "subida_pct": 20, "fiscalidad": "lo que pagaría o perdería en impuestos, si importa", "fuentes": [n]}],
 "evitar": [{"s": "ticker", "motivo": "...", "fuentes": [n]}],
 "cambios": [{"s": "ticker", "antes": "idea|evitar|nada", "ahora": "idea|evitar|fuera", "motivo": "...", "fuentes": [n]}],
 "plazos": [{"s": "ticker", "meses": 6, "subida_pct": 15, "por": "qué marca ese plazo, en pocas palabras (por ejemplo: resultados del 6 nov)"}]}""".replace("{REGLA_FECHA}", REGLA_FECHA.replace("\n", "\n  "))


def gorda(lectura, s, desde=None, signo="negativo"):
    """Una noticia que cambia la tesis (relevancia 3 de la lectura de prensa), de la última semana y, si se
    dice, posterior a la decisión anterior. Es lo único que deja cambiar de opinión de un día para otro."""
    le = lectura.get(s) or {}
    # 13 nov 2026 (auditoría):
    # «d» es la última vez que se leyó; «g», desde cuándo la lectura es gorda con este signo; «dn», la fecha de su última
    # noticia de peso. Para «posterior a la decisión» cuentan «g» y «dn»: antes se miraba «d», y bastaba un titular de
    # relleno nuevo para releer la empresa y que una noticia que la decisión ya había visto pasara por nueva y sacara la idea
    d = cuando(le.get("d"))
    if d is None or (le.get("rel") or 0) < 3 or le.get("imp") != signo:
        return False
    if d < dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7):
        return False
    if desde is None:
        return True
    g, dn = cuando(le.get("g")), cuando(le.get("dn"))
    if g is None and dn is None:
        return d > desde  # lecturas de antes del 13 nov, sin esas fechas: como siempre
    return any(t is not None and t > desde for t in (g, dn))


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
    """Constancia sobre lo que propone la IA (por si no hace caso del encargo):
    - las ideas de la vez anterior siguen, salvo noticia gorda, números rotos o que lleven casi un mes y
      la IA explique por qué deja de proponerla;
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
    # 14 nov 2026 (auditoría): el orden es el de la IA de hoy, no el de la vez anterior. Antes las que seguían conservaban
    # su puesto: en el ensayo la IA ponía Western Digital la última, con confianza baja, y en la app seguía de idea n.º 1.
    # Las que la IA ya no propone y siguen por constancia («sigue») van detrás, en el orden que tenían.
    puesto = {i["s"]: k for k, i in enumerate(ideas)}
    out.sort(key=lambda o: (0, puesto[o["s"]]) if o["s"] in puesto else (1, 0))
    # y una de confianza baja nunca va por delante de una de media o alta (Carlos, 14 nov: «evidentemente, si es confianza
    # baja no puede estar arriba»). En un ensayo la IA repitió el orden del día anterior y dejó primeras a Western Digital y
    # a Coherent diciendo a la vez que les tenía confianza baja. Entre las de igual confianza, el orden de la IA.
    out.sort(key=lambda o: 1 if o.get("confianza") == "baja" else 0)
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
    """Entre una decisión y la siguiente (cada pasada de 20 minutos): sin preguntar a la IA, una idea solo sale
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


def con_ideas_previas(valores, todas, decision):
    """Las empresas entre las que se decide (las de radar.json) más las ideas y las «evitar» de la vez anterior que ya no
    están ahí pero siguen en el radar ampliado (radar-mas.json). 13 nov 2026 (auditoría): Salzgitter pasó al radar ampliado
    el 6 nov y se quedó de idea sin que nadie volviera a mirar sus números (para «rota» era «un fallo de datos») ni se la
    enseñara a la IA: no podía salir nunca."""
    dentro = {x["s"] for x in valores}
    por_s = {x["s"]: x for x in todas if x.get("s")}
    previas = [i.get("s") for k in ("ideas", "evitar") for i in ((decision or {}).get(k) or []) if isinstance(i, dict)]
    return list(valores) + [por_s[s] for s in dict.fromkeys(previas) if s in por_s and s not in dentro]


def contexto_zonas(precios):
    """Una línea por zona con cómo van sus índices (hoy, mes y año), para que la IA pese la geografía."""
    grupos = {}
    for v in (precios.get("mercados") or {}).values():
        r = v.get("rent") or {}
        # 14 nov 2026 (auditoría): con el día del dato si no es de hoy (el sábado decía «hoy» del cierre del viernes)
        grupos.setdefault(v.get("grupo") or "Otros", []).append(f"{v.get('nombre')} {v.get('variacion_dia')} % {dia_del_dato(v)}, {r.get('1m')} % mes, {r.get('ytd')} % año")
    return "\n".join(f"- {g}: " + "; ".join(xs) for g, xs in grupos.items())


# 14 nov 2026 (auditoría, quinta parte): las «mejores de la web» no miraban la prensa. Son las que mejor puntúan por sus
# números (recorrido, consenso, analistas, PER y contraste); la decisión las protege (no pasan a «evitar» sin una noticia
# mala gorda) y se las nombra a la IA. Nvidia seguía entre ellas, con un 76 % de recorrido, con su consejero delegado
# fuera: los precios objetivo de los analistas tardan semanas en moverse y la prensa, horas. Ahora miran la lectura de
# prensa de la última semana: con una noticia que cambia la tesis y no es buena (negativa o mixta) la empresa sale de la
# lista hasta que la lectura cambie, y con una negativa importante pierde puntos. La web hace lo mismo (13-expertos.js,
# prensaEnContra): si se toca aquí, allí también.
PRENSA_DIAS = 7
PRENSA_RESTA = 0.6


def prensa_en_contra(le, ahora_dt=None):
    """Lo que pesa la lectura de prensa de una empresa en las «mejores de la web»: "fuera" si en los últimos PRENSA_DIAS
    días se ha leído una noticia que cambia la tesis (relevancia 3) y no es buena (negativa o mixta); "resta" si hay una
    negativa importante (relevancia 2); None si no hay nada en contra o la lectura es más vieja."""
    d = cuando((le or {}).get("d"))
    if d is None or d < (ahora_dt or dt.datetime.now(dt.timezone.utc)) - dt.timedelta(days=PRENSA_DIAS):
        return None
    rel, imp = le.get("rel") or 0, le.get("imp")
    if rel >= 3 and imp in ("negativo", "mixto"):
        return "fuera"
    return "resta" if rel >= 2 and imp == "negativo" else None


def mejores_de_la_web(valores, medianas, tuyas=(), lectura=None, ahora_dt=None):
    """Las que más le gustan a la web, de mejor a peor, como [(puntos, empresa)]: su misma puntuación aproximada (recorrido,
    consenso, analistas, PER y contraste) y lo que diga su prensa de la última semana (prensa_en_contra)."""
    web = []
    for x in valores:
        if x["s"] in tuyas or x.get("pot") is None:
            continue
        fav, con = P.contraste_idea(x, medianas)
        rm, na, perf = x.get("rm") or 3, x.get("na") or 0, x.get("perf") or 0
        if x["pot"] >= 10 and na >= 8 and rm <= 2.4 and x.get("r") in ("buy", "strong_buy") and fav >= 3 and con <= 2 and (x.get("c1a") or 0) > -35:
            prensa = prensa_en_contra((lectura or {}).get(x["s"]), ahora_dt)
            if prensa == "fuera":
                continue
            pts = 1.2 * min(x["pot"], 50) / 50 + max(-1, min(1, (2.6 - rm) / 1.6)) + 0.5 * min(na, 30) / 30 + 0.22 * fav - 0.3 * con
            pts += 0.4 if 0 < perf < 10 else 0.3 if 0 < perf < 15 else 0.1 if 0 < perf < 22 else -0.3 if perf >= 30 else 0
            web.append((pts - (PRENSA_RESTA if prensa == "resta" else 0), x))
    web.sort(key=lambda t: -t[0])
    return web


def decidir(lectura, cache, valores, medianas, tuyas, precios=None, previa=None):
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
    # las que más le gustan a la web, aunque no tengan prensa reciente: la IA les pone plazo para que la web no compare
    # su "al año" solo con el objetivo de los analistas
    web = mejores_de_la_web(valores, medianas, tuyas, lectura)
    radar_top = [x["s"] for _, x in web[:9]]
    porval = {x["s"]: x for x in valores}
    comp = compartidas(cache)
    # las ideas de la vez anterior entran siempre en la lista, para que la IA pueda mantenerlas
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
        for n in notas_de_empresa(x, propias(cache, x, comp))[:3]:
            fuentes.append(n)
            lineas.append(linea_noticia(len(fuentes), n, resumen=0))
        prensa = f"Prensa ({le.get('imp')}, relevancia {le.get('rel')}): {le.get('txt')}" + (f" Catalizador: {le.get('cat')}." if le.get("cat") else "") if le else "Prensa: sin leer todavía."
        bloques.append(f"## {x['s']}\n{datos_idea(x, medianas)}\n{tendencia_idea(x)}\n{prensa}\n" + "\n".join(lineas))
    hoy = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d")
    obligadas = ", ".join(x["s"] for x in cands[:CANDIDATAS] if x not in [m for _, m in malas[:10]])
    zonas = contexto_zonas(precios or {})
    memoria = ""
    if previa and (previa.get("ideas") or previa.get("evitar")):
        li = "\n".join(f"- {i.get('s')} ({i.get('n')}), propuesta desde {i.get('desde') or str(previa.get('generado'))[:10]}: {i.get('tesis') or ''}" for i in previa.get("ideas") or [])
        le = "\n".join(f"- {e.get('s')} ({e.get('n')}): {e.get('motivo') or ''}" for e in previa.get("evitar") or [])
        memoria = (f"\n\n## Lo que dijiste la vez anterior ({str(previa.get('generado'))[:16].replace('T', ' ')} UTC)\nIdeas:\n{li or '- ninguna'}\nA evitar:\n{le or '- ninguna'}"
                   f"\nLas que la web lleva entre sus mejores estos días (por sus números, y sin las que tienen la prensa en contra): {', '.join(radar_top) or 'ninguna'}.")
    texto_pedido = f"Hoy es {hoy}.\n\n" + (f"## Cómo van los mercados por zonas\n{zonas}\n\n" if zonas else "") + "\n\n".join(bloques) + memoria + f"\n\nEn \"plazos\" pon una entrada para cada una de estas, sin saltarte ninguna: {obligadas}."
    # 0.8.2d: Haiku pensando (esfuerzo medio) y por lote. Si no sale, se quedan las ideas de la vez anterior y se reintenta
    # en otra pasada (a las 2 horas)
    # 14 nov 2026 (auditoría): la decisión puede ir con otro modelo (CLAUDE_DECIDIR_MODELO; en la Action, la variable del
    # repositorio del mismo nombre). Vacío o un modelo que no esté en PRECIOS: el del radar, como siempre. En el ensayo,
    # Sonnet 5.5 costó 0,053 US$ por decisión (Haiku, 0,006) y fue el único que no leyó mal ningún dato.
    cuerpo = pedido(DECIDIR, texto_pedido, 32768, json_=True, pensar=True)
    otro = os.environ.get("CLAUDE_DECIDIR_MODELO", "").strip()
    if otro in PRECIOS:
        cuerpo["model"] = otro
    msg = ia(cuerpo, "decidir")
    texto, _ = texto_de(msg)
    modelo_usado = msg.get("model") or CLAUDE_MODELO
    d = extraer_json(texto)
    if not d:
        CLAUDE_ERRORES.append(f"decidir: la respuesta no traía JSON ({len(texto)} caracteres)")
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
    # las que siguen de antes conservan su plazo si la IA no lo ha repetido
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


def leer_temas(fichas, precios, valores=()):
    """0.7: cada 3 horas, la IA lee los titulares por tema y por sector (y los del mercado) y dice a qué
    zonas, países y sectores toca cada tema. Van a fichas.json → temas; la app los junta con la ficha de cada
    empresa por su país, su zona y su sector."""
    if not clave_claude() or hace_menos_de(fichas.get("temas_d") or "", HORAS_TEMAS) or not hay_tiempo("temas", TIEMPO_TEMAS):
        return 0
    fuentes, vistos = [], set()

    def sumar(lista):
        for n in lista or []:
            k = F.clave_titulo(n.get("t"))
            if n.get("t") and k not in vistos and not P.RUIDO.search(n["t"]):
                vistos.add(k)
                fuentes.append({kk: n.get(kk) for kk in ("t", "f", "d", "u") if n.get(kk)})
    sumar(elegir_mercado(((precios or {}).get("noticias") or {}).get("mercado") or [], por_zona=3, total=30))
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
    texto_pedido = "Titulares:\n" + "\n".join(lineas) + ("\n\nTemas de la vez anterior:\n" + "\n".join(antes) if antes else "")
    industrias = [k for k, _ in collections.Counter(x.get("ind") for x in valores if x.get("ind")).most_common(70)]
    sistema = LEER_TEMAS.format(sectores=", ".join(SECTORES), industrias=", ".join(industrias) or "Airlines, Banks - Regional")
    texto, _ = texto_de(ia(pedido(sistema, texto_pedido, 16384, json_=True), "leer_temas"))
    res = extraer_json(texto) or {}
    temas = res.get("temas") if isinstance(res, dict) else None
    if not isinstance(temas, list):
        CLAUDE_ERRORES.append(f"leer_temas: la respuesta no traía la lista ({len(texto)} caracteres)")
        return 0
    F.aplicar_temas(fichas, temas, fuentes, ahora())
    fichas["temas_d"] = ahora()
    print(f"temas: {len(temas)} de {len(fuentes)} titulares")
    return len(temas)


def guardar_fichas(fichas, dir_salida, validos, nucleo=None):
    """0.8.3: en dos archivos (fichas.partir): fichas.json con los temas y el núcleo (radar.json y las carteras) y
    fichas-mas.json con el resto. Sin núcleo (sin radar esta vez), todo en fichas.json, como antes."""
    F.podar(fichas, validos)
    fichas["generado"] = ahora()
    principal, resto = F.partir(fichas, nucleo) if nucleo else (fichas, None)
    with open(f"{dir_salida}/fichas.json", "w", encoding="utf-8") as f:
        json.dump(principal, f, ensure_ascii=False, separators=(",", ":"))
    if resto is not None:
        with open(f"{dir_salida}/fichas-mas.json", "w", encoding="utf-8") as f:
            json.dump(resto, f, ensure_ascii=False, separators=(",", ":"))
    marcar(dir_salida, "fichas_id", fichas["generado"])
    print(f"fichas: {len(fichas['e'])} empresas ({len(principal['e'])} en fichas.json), {sum(len(x['fa']) for x in fichas['e'].values())} factores, {len(fichas.get('temas') or [])} temas")


def uso_anterior(esc):
    """Lo apuntado en las pasadas de las últimas 48 horas. 0.8.2d: va en escaneo.json → ia.uso (antes, gemini.uso, con
    las de Gemini y las de Claude juntas: de esas solo siguen las de Claude, con lo que costaron)."""
    viejo = ((esc.get("ia") or {}).get("uso")) if isinstance(esc.get("ia"), dict) else None
    if viejo is None:
        viejo = [{**x, "lote": bool(x.get("lote")), "coste": coste(x.get("m"), x.get("in") or 0, x.get("out") or 0, bool(x.get("lote")))}
                 for x in ((esc.get("gemini") or {}).get("uso") or []) if str(x.get("m") or "").startswith("claude")]
    return [x for x in viejo if isinstance(x, dict) and hace_menos_de(x.get("t") or "", 48)]


DIAS_COSTE = 40


def coste_por_dias(previo, uso, hoy=None):
    """{día (UTC): {cosa: US$}} de los últimos DIAS_COSTE días: lo que ya había más las llamadas de esta pasada. 13 nov 2026
    (auditoría): «uso» solo guarda 48 horas, y para saber lo que cuesta un sábado o un domingo había que ir a la Console."""
    dias = {d: dict(v) for d, v in (previo or {}).items() if isinstance(v, dict)}
    for x in uso or []:
        d = dias.setdefault(str(x.get("t") or "")[:10], {})
        q = x.get("que") or "?"
        d[q] = round(d.get(q, 0) + float(x.get("coste") or 0), 6)
    limite = ((hoy or dt.datetime.now(dt.timezone.utc).date()) - dt.timedelta(days=DIAS_COSTE)).isoformat()
    return {d: v for d, v in sorted(dias.items()) if d >= limite}


def estado_ia(esc, hay_ia):
    """escaneo.json → ia: si hay clave (activo), si ha ido bien esta pasada (ok), si se ha apagado por la clave o el saldo,
    los últimos fallos, los modelos que han contestado, cada llamada de las últimas 48 horas (uso: t, m, que, in, cache,
    out, busq, lote, coste en US$) y lo que han costado las de las últimas 24 horas (coste_24h, US$)."""
    uso = uso_anterior(esc) + USO
    return {"activo": hay_ia, "ok": hay_ia and not CLAUDE_ERRORES and not CLAUDE_APAGADO, "apagado": CLAUDE_APAGADO, "errores": CLAUDE_ERRORES[-4:],
            "modelos": sorted(USADOS), "uso": uso, "coste_dias": coste_por_dias(((esc.get("ia") or {}).get("coste_dias")) if isinstance(esc.get("ia"), dict) else None, USO),
            "coste_24h": round(sum(x.get("coste") or 0 for x in uso if hace_menos_de(x.get("t") or "", 24)), 4)}


def main(ruta_inst, dir_anterior, dir_salida):
    hay_ia = bool(clave_claude())
    instrumentos = leer(ruta_inst).get("instrumentos") or []
    radar = leer(f"{dir_salida}/radar.json")
    valores = radar.get("valores") or []
    # 6 nov 2026: la prensa y la lectura de la IA son de todo el radar (radar.json y radar-mas.json); la decisión, el
    # informe y los temas siguen con las de radar.json
    # (si esta vez no está, el de la pasada anterior: si no, se podarían las lecturas y las fichas de casi 2.000 empresas)
    mas = ((leer(f"{dir_salida}/radar-mas.json") or leer(f"{dir_anterior}/radar-mas.json") or {}).get("valores") or []) if valores else []
    todas = valores + [x for x in mas if x.get("s")]
    cache = leer(f"{dir_anterior}/noticias-cache.json") or {}
    esc = leer(f"{dir_anterior}/escaneo.json") or {}
    en_radar = {x["s"] for x in todas}
    lectura = {k: v for k, v in (esc.get("lectura") or {}).items() if k in en_radar} if valores else (esc.get("lectura") or {})
    decision = esc.get("decision")
    medianas = P.per_sector_mediano(valores)
    tuyas = {(i.get("yahoo") or "") for i in instrumentos}
    ant_fichas, ant_mas = leer(f"{dir_anterior}/fichas.json"), leer(f"{dir_anterior}/fichas-mas.json")
    # 0.8.3 (revisión aparte): si la pasada anterior dice que hay resto (mas > 0) y fichas-mas.json no está, esta vez no
    # se guardan las fichas: se quedan los dos archivos de antes (precios.yml los copia) en vez de perder ~1.700
    fichas_sin_resto = bool((ant_fichas or {}).get("mas")) and not (ant_mas or {}).get("e")
    if fichas_sin_resto:
        print("fichas: falta fichas-mas.json de la pasada anterior; esta vez no se guardan (se quedan las de antes)")
    fichas = F.juntar(ant_fichas, ant_mas)
    if valores:
        try:
            actualizar_noticias(cache, todas)
        except Exception as e:  # noqa: BLE001
            print(f"escaneo: fallaron las noticias ({e})")
        try:
            noticias_de_carteras(cache, instrumentos, todas, leer(f"{dir_salida}/precios.json"))
        except Exception as e:  # noqa: BLE001
            print(f"escaneo: fallaron las noticias de las carteras ({e})")
        if hay_ia:
            try:
                leer_lote(lectura, cache, todas, medianas, fichas, tuyas)
            except Exception as e:  # noqa: BLE001
                print(f"escaneo: falló la lectura de la IA ({str(e)[:200]})")
            try:
                leer_temas(fichas, leer(f"{dir_salida}/precios.json"), valores)
            except Exception as e:  # noqa: BLE001
                print(f"temas: falló la lectura de la IA ({str(e)[:200]})")
    informe_cartera(ruta_inst, dir_anterior, dir_salida)
    # una decisión nueva al día (o si cambia su formato); entre medias, solo se revisa si hay una noticia gorda
    viejo = not decision or decision.get("v") != DECISION_V or not hace_menos_de(decision.get("generado") or "", HORAS_DECISION)
    valores_dec = con_ideas_previas(valores, todas, decision)
    if not viejo and valores:
        decision = revisar(decision, lectura, valores_dec)
    # si la última vez falló (Claude saturado o sin saldo, por ejemplo), no se reintenta hasta pasadas 2 horas
    intento = esc.get("intento_decision")
    if viejo and intento and hace_menos_de(intento, 2):
        viejo = False
    # 0.8.2d: el ensayo de la Action (sin publicar) decide aunque no toque, para medir lo que cuesta
    viejo = viejo or bool(os.environ.get("INFORME_DECIDIR"))
    # (13 nov, auditoría) si no queda tiempo, la decisión se deja para la pasada siguiente, sin apuntar el intento: así no
    # espera 2 horas
    if hay_ia and valores and viejo and hay_tiempo("decisión", TIEMPO_DECISION):
        intento = ahora()
        try:
            d = decidir(lectura, cache, valores_dec, medianas, tuyas, leer(f"{dir_salida}/precios.json"), previa=decision)
            if d:
                decision = d
                print(f"escaneo: decisión con {d['candidatas']} candidatas, {len(d['ideas'])} ideas y {len(d['evitar'])} a evitar")
        except Exception as e:  # noqa: BLE001
            print(f"escaneo: falló la decisión de la IA ({str(e)[:200]})")
    hace24 = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=24)
    salida = {"generado": ahora(), "lectura": lectura, "decision": decision, "intento_decision": intento if (decision or {}).get("generado", "") < (intento or "") else None,
              "ia": estado_ia(esc, hay_ia),
              "con_noticias": sum(1 for v in cache.values() if v.get("n")), "leidas_24h": sum(1 for v in lectura.values() if cuando(v.get("d")) and cuando(v["d"]) > hace24),
              "noticias": sum(len(v.get("n") or []) for v in cache.values()), "empresas": len(todas), "empresas_nucleo": len(valores), "fuentes_pasada": DIAG}
    with open(f"{dir_salida}/noticias-cache.json", "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, separators=(",", ":"))
    if not fichas_sin_resto:
        guardar_fichas(fichas, dir_salida, en_radar if valores else None, ({x["s"] for x in valores} | tuyas) - {""} if valores else None)
    with open(f"{dir_salida}/escaneo.json", "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))
    marcar(dir_salida, "escaneo_id", salida["generado"])


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
