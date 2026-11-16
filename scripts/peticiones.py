"""Cuenta las peticiones que hace cada pasada, por parte («fuente») y por sitio (16 nov 2026).

Se activa al importarlo con activar(): envuelve las peticiones de curl_cffi (yfinance), de requests y de urllib, así que
cuenta todo lo que sale sin tocar cada llamada. Cada parte de la pasada se marca con `with fuente("radar_precios"):`; lo
que no se marca va a «otros». Las partes van una detrás de otra (los hilos de una parte cuentan para esa parte).

guardar(ruta, programa) escribe peticiones.json: lo de esta pasada (por fuente, sitio, tipo de petición y respuesta) y la
suma del día (UTC), que sigue desde el peticiones.json de la pasada anterior. No dice nada de nadie: solo cuántas.
"""
import collections
import contextlib
import datetime as dt
import json
import threading
import urllib.parse

_CANDADO = threading.Lock()
_FUENTE = ["otros"]
# (fuente, sitio, tipo, respuesta) -> n
_CUENTA = collections.Counter()
_ACTIVO = [False]


@contextlib.contextmanager
def fuente(nombre):
    antes = _FUENTE[0]
    _FUENTE[0] = nombre
    try:
        yield
    finally:
        _FUENTE[0] = antes


def sitio_y_tipo(url):
    """De una dirección, el sitio (yahoo, google, anthropic, firestore, bitvavo u otro) y, en Yahoo, el tipo de
    petición (chart, quoteSummary, quote, search, screener, crumb, cookie, rss, news…)."""
    try:
        p = urllib.parse.urlsplit(str(url))
    except Exception:  # noqa: BLE001
        return "otro", "?"
    host, ruta = (p.hostname or "").lower(), p.path or ""
    if host.endswith("yahoo.com"):
        if host.startswith("feeds."):
            return "yahoo", "rss"
        if host.startswith("fc.") or host.startswith("guce.") or host.startswith("consent."):
            return "yahoo", "cookie"
        for clave, tipo in (("/finance/chart", "chart"), ("/finance/quoteSummary", "quoteSummary"), ("/finance/quote", "quote"),
                            ("/finance/search", "search"), ("/finance/screener", "screener"), ("getcrumb", "crumb"),
                            ("timeseries", "timeseries"), ("/finance/options", "options"), ("xhr/ncp", "news"),
                            ("/news", "news"), ("/finance/spark", "spark")):
            if clave in ruta:
                return "yahoo", tipo
        if host in ("finance.yahoo.com", "www.yahoo.com", "yahoo.com"):
            return "yahoo", "pagina"
        return "yahoo", "otra"
    if host.endswith("news.google.com"):
        return "google", "noticias"
    if host.endswith("anthropic.com"):
        return "anthropic", "claude"
    if host.endswith("googleapis.com"):
        return "firestore", "lista"
    if host.endswith("bitvavo.com"):
        return "bitvavo", "precio"
    return "otro", host or "?"


def apuntar(url, respuesta):
    sitio, tipo = sitio_y_tipo(url)
    with _CANDADO:
        _CUENTA[(_FUENTE[0], sitio, tipo, str(respuesta))] += 1


def _codigo(r):
    for a in ("status_code", "status", "code"):
        v = getattr(r, a, None)
        if isinstance(v, int):
            return v
    return "?"


def activar():
    """Envuelve curl_cffi, requests y urllib (una vez). Si alguna no está instalada, se cuenta lo demás."""
    if _ACTIVO[0]:
        return
    _ACTIVO[0] = True
    try:
        from curl_cffi import requests as cr
        orig = cr.Session.request

        def request(self, method, url, *a, **k):
            try:
                r = orig(self, method, url, *a, **k)
            except Exception as e:  # noqa: BLE001
                apuntar(url, "error:" + type(e).__name__)
                raise
            apuntar(url, _codigo(r))
            return r
        cr.Session.request = request
    except Exception:  # noqa: BLE001
        pass
    try:
        import requests
        orig_r = requests.Session.request

        def request_r(self, method, url, *a, **k):
            try:
                r = orig_r(self, method, url, *a, **k)
            except Exception as e:  # noqa: BLE001
                apuntar(url, "error:" + type(e).__name__)
                raise
            apuntar(url, _codigo(r))
            return r
        requests.Session.request = request_r
    except Exception:  # noqa: BLE001
        pass
    import urllib.request as ur
    orig_u = ur.OpenerDirector.open

    def open_u(self, fullurl, *a, **k):
        url = fullurl.full_url if hasattr(fullurl, "full_url") else fullurl
        try:
            r = orig_u(self, fullurl, *a, **k)
        except Exception as e:  # noqa: BLE001
            apuntar(url, getattr(e, "code", None) or ("error:" + type(e).__name__))
            raise
        apuntar(url, _codigo(r))
        return r
    ur.OpenerDirector.open = open_u


def resumen():
    """{fuente: {sitio: n, …, "tipos": {sitio/tipo: n}, "respuestas": {sitio/respuesta: n}}} y el total por sitio."""
    with _CANDADO:
        cuenta = dict(_CUENTA)
    por = {}
    total = collections.Counter()
    for (f, sitio, tipo, resp), n in cuenta.items():
        e = por.setdefault(f, {"tipos": {}, "respuestas": {}})
        e[sitio] = e.get(sitio, 0) + n
        e["tipos"][f"{sitio}/{tipo}"] = e["tipos"].get(f"{sitio}/{tipo}", 0) + n
        if str(resp) not in ("200",):
            e["respuestas"][f"{sitio}/{resp}"] = e["respuestas"].get(f"{sitio}/{resp}", 0) + n
        total[sitio] += n
    return {"fuentes": por, "total": dict(total)}


def sumar(a, b):
    """Suma dos resúmenes (para el total del día)."""
    out = json.loads(json.dumps(a or {"fuentes": {}, "total": {}}))
    for f, e in (b or {}).get("fuentes", {}).items():
        d = out["fuentes"].setdefault(f, {"tipos": {}, "respuestas": {}})
        for k, v in e.items():
            if isinstance(v, dict):
                for k2, v2 in v.items():
                    d.setdefault(k, {})[k2] = d.setdefault(k, {}).get(k2, 0) + v2
            else:
                d[k] = d.get(k, 0) + v
    for k, v in (b or {}).get("total", {}).items():
        out["total"][k] = out["total"].get(k, 0) + v
    return out


def guardar(ruta, programa, anterior=None, ahora=None):
    """Escribe en ruta (peticiones.json) lo de este programa en esta pasada («pasada».programa) y lo suma al día. Si
    el archivo ya existe (precios.py lo escribe antes que informe.py), se completa. «anterior» es el peticiones.json
    de la pasada anterior, del que sigue la suma del día si es del mismo día UTC."""
    ahora = ahora or dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    dia = ahora.date().isoformat()
    try:
        with open(ruta, encoding="utf-8") as f:
            j = json.load(f)
    except Exception:  # noqa: BLE001
        j = {}
    if not j:
        prev = anterior or {}
        j = {"generado": ahora.isoformat(), "pasada": {}, "dia": prev.get("dia") if prev.get("dia_fecha") == dia else None,
             "dia_fecha": dia, "pasadas_dia": (prev.get("pasadas_dia") or 0) if prev.get("dia_fecha") == dia else 0}
        j["pasadas_dia"] += 1
    r = resumen()
    j["pasada"][programa] = r
    j["dia"] = sumar(j.get("dia"), r)
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(j, f, ensure_ascii=False, separators=(",", ":"))
    return j


def imprimir(programa):
    r = resumen()
    print(f"peticiones de {programa}: {r['total']}")
    for f, e in sorted(r["fuentes"].items(), key=lambda kv: -sum(v for k, v in kv[1].items() if not isinstance(v, dict))):
        sitios = {k: v for k, v in e.items() if not isinstance(v, dict)}
        print(f"  {f:22s} {sitios} {e['tipos']}" + (f" fallos {e['respuestas']}" if e["respuestas"] else ""))
