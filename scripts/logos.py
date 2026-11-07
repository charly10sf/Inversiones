"""Logos de las empresas y las gestoras, servidos desde Toisón (0.8.3).

Hasta ahora la app pedía cada logo al servicio de iconos de Google: Google se enteraba de qué empresas mira cada
usuario, y para 8 de las 45 mayores solo tenía un icono de 16 px (salían las iniciales). Esta Action busca, para
cada dominio que conoce Toisón, el icono más grande de la propia web de la empresa (apple-touch-icon, los iconos del
manifiesto o el favicon), lo deja en 128 px (webp) y lo publica en la rama «logos». La app lo pide ahí.

Uso: python scripts/logos.py instrumentos.json anterior salida
  anterior/  lo que hay en las ramas de datos y de logos: radar.json, radar-mas.json, catalogo-mas.json y, de la
             pasada anterior, logos.json, logos-estado.json y logos/*.webp (todo opcional).
  salida/    lo que se publica: logos/<dominio>.webp, logos.json (el índice que lee la app: {"v":1,"g":fecha,"d":[…]})
             y logos-estado.json (cuándo se probó cada dominio; lo usa solo esta Action).

Va por tandas: los dominios nuevos primero, luego los que llevan más de VIGENCIA_DIAS, y los que no tienen logo se
reintentan a los REINTENTO_DIAS. Se para al llegar a LOGOS_MINUTOS (por defecto 40) y la siguiente pasada sigue.
logos-manual.json (en la raíz) permite dar a mano la dirección de la imagen de un dominio que falla: {"dominio": "url"}.
"""
import datetime as dt
import io
import ipaddress
import json
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image, ImageStat

LADO = 128            # px del logo guardado (nunca se agranda)
MIN_LADO = 64         # por debajo se vería pixelado: se queda en iniciales
VIGENCIA_DIAS = 90    # un logo ya bajado se vuelve a mirar a los 90 días
REINTENTO_DIAS = 14   # un dominio sin logo se vuelve a probar a los 14 días
MAX_BYTES = 2_000_000
UA = "Mozilla/5.0 (compatible; ToisonLogos/1.0; +https://toison.es)"
DOMINIO = re.compile(r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$")
FALLBACKS = (("/apple-touch-icon.png", 180), ("/apple-touch-icon-precomposed.png", 180), ("/favicon.png", 48), ("/favicon.ico", 32))


# ----------------------------------------------------------------------------------------------------------------
# qué dominios hay
# ----------------------------------------------------------------------------------------------------------------
def limpiar(d):
    d = str(d or "").strip().lower()
    d = re.sub(r"^https?://", "", d).split("/")[0].split("?")[0]
    d = re.sub(r"^www\.", "", d)
    return d if DOMINIO.match(d) and len(d) <= 100 else None


def _json(ruta):
    try:
        return json.loads(Path(ruta).read_text(encoding="utf-8"))
    except Exception:
        return None


def dominios(instrumentos, anterior):
    """Todos los dominios que usa la app: el radar (campo «w»), el catálogo ampliado (columna «dom») y los
    instrumentos de instrumentos.json («dominio»). Más los de logos-manual.json."""
    out = set()
    for f in ("radar.json", "radar-mas.json"):
        j = _json(Path(anterior) / f) or {}
        for x in j.get("valores") or []:
            out.add(limpiar(x.get("w")))
    cm = _json(Path(anterior) / "catalogo-mas.json") or {}
    cols = cm.get("cols") or []
    if "dom" in cols and isinstance(cm.get("v"), list):
        i = cols.index("dom")
        for fila in cm["v"]:
            if len(fila) > i:
                out.add(limpiar(fila[i]))
    ins = _json(instrumentos) or {}
    lista = ins.get("instrumentos") or []
    for x in (lista.values() if isinstance(lista, dict) else lista):
        out.add(limpiar(x.get("dominio")))
    manual = _json(Path(__file__).resolve().parents[1] / "logos-manual.json") or {}
    for d in manual:
        out.add(limpiar(d))
    out.discard(None)
    return out


# ----------------------------------------------------------------------------------------------------------------
# buscar la imagen en la web de la empresa
# ----------------------------------------------------------------------------------------------------------------
class _Enlaces(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.base = None

    def handle_starttag(self, tag, attrs):
        a = {k.lower(): (v or "") for k, v in attrs}
        if tag == "link" and a.get("href"):
            self.links.append(a)
        elif tag == "base" and a.get("href") and not self.base:
            self.base = a["href"]


def _lado(sizes, defecto):
    """«180x180», «57x57 72x72», «any» → el mayor lado declarado."""
    n = [int(m) for m in re.findall(r"(\d+)\s*[xX×]\s*\d+", sizes or "")]
    if n:
        return max(n)
    return 512 if (sizes or "").strip().lower() == "any" else defecto


def candidatas(html, base):
    """(puntos, url, esManifiesto) por orden: de las etiquetas <link> de la página y, al final, las direcciones de
    siempre en la raíz. Los SVG no se leen (Pillow no los abre)."""
    p = _Enlaces()
    try:
        p.feed(html)
    except Exception:
        pass
    raiz = urllib.parse.urljoin(base, p.base) if p.base else base
    out, manifiestos = {}, []
    for a in p.links:
        rel = a.get("rel", "").lower().split()
        href = urllib.parse.urljoin(raiz, a["href"].strip())
        if not href.startswith(("http://", "https://")):
            continue
        if "manifest" in rel:
            manifiestos.append(href)
            continue
        if href.lower().split("?")[0].endswith(".svg") or "svg" in a.get("type", "").lower():
            continue
        if any(r.startswith("apple-touch-icon") for r in rel):
            pts = _lado(a.get("sizes"), 180) + 20          # arte cuadrado y sin transparencia raros: preferido
        elif "icon" in rel:
            pts = _lado(a.get("sizes"), 32)
        else:
            continue
        out[href] = max(out.get(href, 0), pts)
    for ruta, pts in FALLBACKS:
        href = urllib.parse.urljoin(base, ruta)
        out.setdefault(href, pts)
    return sorted(((v, k) for k, v in out.items()), reverse=True), manifiestos


def del_manifiesto(texto, base):
    j = None
    try:
        j = json.loads(texto)
    except Exception:
        return []
    out = []
    for ic in (j.get("icons") or []) if isinstance(j, dict) else []:
        if not isinstance(ic, dict) or not ic.get("src"):
            continue
        href = urllib.parse.urljoin(base, str(ic["src"]))
        if href.lower().split("?")[0].endswith(".svg") or "svg" in str(ic.get("type", "")).lower():
            continue
        if href.startswith(("http://", "https://")):
            out.append((_lado(ic.get("sizes"), 64), href))
    return out


def imagen_valida(datos):
    """Una imagen de verdad (cuadrada, de 64 px o más y que no sea toda del mismo color) o None."""
    try:
        im = Image.open(io.BytesIO(datos))
        im.load()
    except Exception:
        return None
    im = im.convert("RGBA")
    w, h = im.size
    if min(w, h) < MIN_LADO or not (0.75 <= w / h <= 1.34):
        return None
    ext = ImageStat.Stat(im).extrema
    if all(lo == hi for lo, hi in ext):
        return None
    if ext[3][1] == 0:        # transparente del todo
        return None
    return im


def a_webp(im):
    """Cuadrado de LADO como mucho (sin agrandar), con transparencia, en webp."""
    w, h = im.size
    if max(w, h) > LADO:
        e = LADO / max(w, h)
        im = im.resize((max(1, round(w * e)), max(1, round(h * e))), Image.LANCZOS)
        w, h = im.size
    if w != h:
        lado = max(w, h)
        c = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
        c.paste(im, ((lado - w) // 2, (lado - h) // 2))
        im = c
    b = io.BytesIO()
    im.save(b, "WEBP", quality=88, method=6)
    return b.getvalue()


def es_publica(host):
    """Que el nombre no apunte a una dirección privada o local (la Action no debe entrar en redes internas)."""
    try:
        for r in socket.getaddrinfo(host, None):
            if not ipaddress.ip_address(r[4][0]).is_global:
                return False
        return True
    except Exception:
        return False


class _Redir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        u = urllib.parse.urlparse(newurl)
        if u.scheme not in ("http", "https") or not es_publica(u.hostname or ""):
            raise urllib.error.URLError("redirección no permitida")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_abridor = urllib.request.build_opener(_Redir)


def abrir(url, timeout=10):
    """(bytes, content-type, url final) o None. Solo http(s) a direcciones públicas; hasta MAX_BYTES."""
    try:
        u = urllib.parse.urlparse(url)
        if u.scheme not in ("http", "https") or not es_publica(u.hostname or ""):
            return None
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en,es;q=0.8"})
        with _abridor.open(req, timeout=timeout) as r:
            datos = r.read(MAX_BYTES + 1)
            if len(datos) > MAX_BYTES:
                return None
            return datos, r.headers.get("Content-Type", ""), r.geturl()
    except Exception:
        return None


def buscar_logo(dom, abrir_url=abrir, manual=None, max_intentos=8):
    """Devuelve (webp, url de origen) o None. Primero lo que se dio a mano, luego los iconos de la página de
    inicio (con www o sin él), los del manifiesto y las direcciones de siempre."""
    pruebas = []
    if manual and manual.get(dom):
        pruebas.append(manual[dom])
    base, html = None, ""
    for b in (f"https://{dom}/", f"https://www.{dom}/", f"http://{dom}/"):
        r = abrir_url(b)
        if r and ("html" in (r[1] or "").lower() or b"<link" in r[0][:200000].lower()):
            base, html = r[2] or b, r[0][:600000].decode("utf-8", "replace")
            break
    if base:
        cands, manifiestos = candidatas(html, base)
        extra = []
        for m in manifiestos[:1]:
            r = abrir_url(m)
            if r:
                extra = del_manifiesto(r[0].decode("utf-8", "replace"), r[2] or m)
        todas = dict((u, p) for p, u in cands)
        for p, u in extra:
            todas[u] = max(todas.get(u, 0), p)
        pruebas += [u for u, _ in sorted(todas.items(), key=lambda x: -x[1])]
    else:
        for ruta, _ in FALLBACKS:
            pruebas.append(f"https://{dom}{ruta}")
    for url in pruebas[:max_intentos]:
        r = abrir_url(url)
        if not r:
            continue
        im = imagen_valida(r[0])
        if im is not None:
            return a_webp(im), url
    return None


# ----------------------------------------------------------------------------------------------------------------
# la pasada
# ----------------------------------------------------------------------------------------------------------------
def _fecha(s):
    try:
        return dt.date.fromisoformat(s)
    except Exception:
        return None


def pendientes(doms, estado, hoy):
    """Orden de trabajo: primero los nunca probados, luego los logos viejos y por último los fallidos que ya toca
    reintentar. Los que se probaron hace poco, fuera."""
    ok, sin = estado.get("ok", {}), estado.get("sin", {})
    nuevos = sorted(d for d in doms if d not in ok and d not in sin)
    viejos = sorted((d for d in doms if d in ok and (hoy - (_fecha(ok[d]) or dt.date.min)).days >= VIGENCIA_DIAS), key=lambda d: ok[d])
    fallidos = sorted((d for d in doms if d in sin and (hoy - (_fecha(sin[d]) or dt.date.min)).days >= REINTENTO_DIAS), key=lambda d: sin[d])
    return nuevos + fallidos + viejos


def principal(instrumentos, anterior, salida, minutos=None, hilos=12, abrir_url=abrir, ahora=None):
    anterior, salida = Path(anterior), Path(salida)
    (salida / "logos").mkdir(parents=True, exist_ok=True)
    hoy = (ahora or dt.datetime.now(dt.timezone.utc)).date()
    minutos = float(os.environ.get("LOGOS_MINUTOS", 40)) if minutos is None else minutos
    limite = time.time() + minutos * 60
    doms = dominios(instrumentos, anterior)
    estado = _json(anterior / "logos-estado.json") or {}
    ok, sin = dict(estado.get("ok", {})), dict(estado.get("sin", {}))
    # lo que ya había
    for f in (anterior / "logos").glob("*.webp") if (anterior / "logos").is_dir() else []:
        (salida / "logos" / f.name).write_bytes(f.read_bytes())
    ok = {d: v for d, v in ok.items() if (salida / "logos" / f"{d}.webp").exists()}
    manual = {limpiar(k): v for k, v in (_json(Path(__file__).resolve().parents[1] / "logos-manual.json") or {}).items() if limpiar(k)}
    cola = pendientes(doms, {"ok": ok, "sin": sin}, hoy)
    print(f"{len(doms)} dominios; {len(ok)} con logo; {len(cola)} por mirar en esta pasada (hasta {minutos:g} min)")

    def uno(d):
        if time.time() > limite:
            return d, "tarde", None
        try:
            return d, "ok", buscar_logo(d, abrir_url, manual)
        except Exception as e:  # una web rara no tumba la pasada
            return d, "error", str(e)

    nuevos = fallidos = tarde = 0
    with ThreadPoolExecutor(max_workers=hilos) as ex:
        for d, que, r in ex.map(uno, cola):
            if que == "tarde":
                tarde += 1
            elif que == "ok" and r:
                (salida / "logos" / f"{d}.webp").write_bytes(r[0])
                ok[d] = hoy.isoformat()
                sin.pop(d, None)
                nuevos += 1
            else:
                if d not in ok:
                    sin[d] = hoy.isoformat()
                else:                          # había logo: se conserva el viejo y se vuelve a mirar mañana
                    ok[d] = (hoy - dt.timedelta(days=VIGENCIA_DIAS - 1)).isoformat()
                fallidos += 1
    # índice para la app: solo los dominios que Toisón conoce y tienen archivo
    con = sorted(d for d in ok if d in doms or (salida / "logos" / f"{d}.webp").exists())
    (salida / "logos.json").write_text(json.dumps({"v": 1, "g": hoy.isoformat(), "d": con}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (salida / "logos-estado.json").write_text(json.dumps({"ok": ok, "sin": {d: v for d, v in sin.items() if d in doms}}, ensure_ascii=False, sort_keys=True, separators=(",", ":")), encoding="utf-8")
    resumen = f"Logos: {len(con)} publicados de {len(doms)} dominios; esta pasada: {nuevos} nuevos, {fallidos} sin logo, {tarde} sin mirar por tiempo"
    print(resumen)
    if os.environ.get("GITHUB_OUTPUT"):          # la Action solo publica si ha cambiado algo
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
            f.write(f"cambio={'1' if (nuevos or fallidos) else '0'}\n")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(resumen + "\n")
    return {"publicados": len(con), "dominios": len(doms), "nuevos": nuevos, "fallidos": fallidos, "tarde": tarde}


if __name__ == "__main__":
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    principal(sys.argv[1], sys.argv[2], sys.argv[3])
