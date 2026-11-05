"""Las dos listas oficiales con las que se amplía el catálogo (5 nov 2026):

- XETRA: el CSV de Deutsche Börse con todo lo que se negocia en Xetra. De ahí salen los ETF, ETC y ETN
  (unos 3.650 ISIN). Los nombres vienen muy abreviados («ISHS3-USEQHINE ()DLD»): el nombre que se enseña
  es el de Yahoo.
- CNMV: el fichero mensual de información individual de los fondos españoles (un zip con FONDREGISTRO_AAAAMM.xml,
  unas 2.900 clases con su ISIN, su nombre y su gestora). Su FONDMENS trae el valor liquidativo de cada día
  del mes: la fuente oficial y gratis del NAV de los fondos españoles (todavía no se usa).

Las dos se bajan cada día en catalogo.yml; si una falla, se sigue con la lista del día anterior.
"""

import csv
import io
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}
XETRA_PAGINA = "https://www.cashmarket.deutsche-boerse.com/cash-en/trading/Tradable-Instruments-Xetra/xetra"
XETRA_DIRECTO = "https://www.xetra.com/xetra-en/allTradableInstruments.csv"
CNMV_PAGINA = "https://www.cnmv.es/portal/publicaciones/descarga-informacion-individual"


def bajar(url, segundos=90):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=segundos) as r:
        return r.read()


# ---------- Xetra ----------
def leer_xetra(texto):
    """Los ETF, ETC y ETN del CSV de Xetra, uno por ISIN: {isin, n (el nombre abreviado), t (ETF o ETC), g (grupo)}.
    Los ETN (casi todos cripto o apalancados) van como ETC, igual que en la app."""
    lineas = texto.splitlines()
    i = next(k for k, l in enumerate(lineas) if l.startswith("Product Status") or (";ISIN;" in l and "Instrument" in l))
    vistos, out = set(), []
    for f in csv.DictReader(io.StringIO("\n".join(lineas[i:])), delimiter=";"):
        tipo = (f.get("Instrument Type") or "").strip().upper()
        isin = (f.get("ISIN") or "").strip().upper()
        if tipo not in ("ETF", "ETC", "ETN") or not re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}\d", isin) or isin in vistos:
            continue
        if (f.get("Instrument Status") or "Active").strip() != "Active":
            continue
        vistos.add(isin)
        out.append({"isin": isin, "n": (f.get("Instrument") or "").strip(), "t": "ETF" if tipo == "ETF" else "ETC",
                    "g": (f.get("Product Assignment Group Description") or "").strip()})
    return out


def bajar_xetra():
    for url in (XETRA_DIRECTO, None):
        try:
            if url is None:
                # la dirección del CSV cambia (lleva un código): se saca de la página
                pag = bajar(XETRA_PAGINA).decode("utf-8", "replace")
                m = re.search(r'href="([^"]*allTradableInstruments[^"]*\.csv)"', pag)
                if not m:
                    raise RuntimeError("la página de Xetra no enlaza el CSV")
                url = m.group(1) if m.group(1).startswith("http") else "https://www.cashmarket.deutsche-boerse.com" + m.group(1)
            t = bajar(url).decode("utf-8", "replace")
            if "ISIN" in t[:5000] and "<html" not in t[:500].lower():
                return leer_xetra(t)
        except Exception as ex:  # noqa: BLE001
            print(f"xetra {url}: {ex}")
    raise RuntimeError("no se ha podido bajar la lista de Xetra")


# ---------- CNMV ----------
SIGLAS = set("""FI FIL FII FIM FIAMM ESG ISR RF RV USA EEUU EE UU PB GVC BBVA CBNK MSCI II III IV V VI VII VIII IX X XI XII
AM SA SGIIC ETF EUR USD DB UBS BCE OCDE CI A&G TR GS JP IA CB BK UCITS ETC ETP ETN SG JPM DZ GBP CHF PLC ICAV SICAV
EM US UK AI SRI PAB CTB S&P""".split())
MINUSCULAS = set("de del la las el los y e en a al o u con por para sin".split())


def titulo(texto):
    """«BESTINVER RENTA, FI» → «Bestinver Renta, FI» (las siglas, en mayúsculas; las palabras pequeñas, en minúsculas)."""
    palabras = []
    for k, w in enumerate(re.split(r"(\s+)", texto.strip())):
        if not w or w.isspace():
            palabras.append(w)
            continue
        base = re.sub(r"[^\wÁÉÍÓÚÑÜ&]", "", w.upper())
        if base in SIGLAS or re.fullmatch(r"\d+[A-Z]?", base) or ("&" in base and len(base) <= 5):
            palabras.append(w.upper())
        elif k and base.lower() in MINUSCULAS:
            palabras.append(w.lower())
        else:
            palabras.append("-".join(p[:1].upper() + p[1:].lower() for p in w.split("-")))
    return "".join(palabras)


def nombre_cnmv(den, comp, clase):
    """El nombre de una clase de un fondo español: «Bestinver Renta FI, clase R». La clase 0 o única no se dice."""
    n = titulo(re.sub(r",\s*(F\.?I\.?)\b", r" \1", den.strip(), flags=re.I))
    if not re.search(r"\bF\.?I\.?L?\b", n):
        n += " FI"
    if comp and not re.fullmatch(r"COMPARTIMENTO\s*\d*", comp.strip(), re.I):
        # «GESTION BOUTIQUE VI / GESTIVALUE CAPITAL»: el compartimento es lo que va detrás de la barra
        n += ", " + titulo(re.split(r"\s*/\s*", comp.strip())[-1])
    c = re.sub(r"^CLASE\s*", "", (clase or "").strip(), flags=re.I)
    if c and not re.fullmatch(r"0|[ÚU]NICA|GENERAL", c, re.I):
        n += ", clase " + (c.upper() if len(c) <= 3 else titulo(c))
    return n


def leer_cnmv_registro(xml):
    """Las clases de FONDREGISTRO: {isin, n, t (Fondo, o ETF si la CNMV lo marca), g (grupo de la gestora)}."""
    raiz = ET.fromstring(xml)
    out, vistos = [], set()
    for e in raiz.iter("Entidad"):
        den = e.findtext("Denominacion") or ""
        etf = (e.findtext("ETF") or "").strip().upper() in ("SI", "SÍ", "S")
        grupo = (e.findtext("Gestora/GrupoGestora/DenominacionGrupoGestora") or e.findtext("Gestora/DenominacionGestora") or "").strip()
        for comp in e.findall("Compartimento"):
            dc = comp.findtext("DenominacionCompartimento") or ""
            for cl in comp.findall("Clase"):
                isin = (cl.findtext("ISIN") or "").strip().upper()
                if not re.fullmatch(r"[A-Z]{2}[A-Z0-9]{9}\d", isin) or isin in vistos:
                    continue
                vistos.add(isin)
                out.append({"isin": isin, "n": nombre_cnmv(den, dc, cl.findtext("DenominacionClase") or ""),
                            "t": "ETF" if etf else "Fondo", "g": grupo})
    return out


def leer_cnmv_zip(datos):
    z = zipfile.ZipFile(io.BytesIO(datos))
    nombre = next((x for x in z.namelist() if re.fullmatch(r"FONDREGISTRO_\d{6}\.xml", x, re.I)), None)
    if not nombre:
        raise RuntimeError(f"el zip de la CNMV no trae FONDREGISTRO: {z.namelist()[:6]}")
    return leer_cnmv_registro(z.read(nombre)), re.search(r"\d{6}", nombre).group(0)


def enlaces_cnmv(html):
    """Los enlaces de descarga de la página de la CNMV, el más reciente primero (como salen en la página)."""
    return [u.replace("&amp;", "&") for u in dict.fromkeys(re.findall(r'href="(https?://[^"]*/webservices/verdocumento/ver\?e=[^"]+)"', html))]


def bajar_cnmv():
    # la página de la CNMV a veces tarda en contestar: hasta tres intentos
    for intento in range(3):
        try:
            html = bajar(CNMV_PAGINA, 60).decode("utf-8", "replace")
            break
        except Exception as ex:  # noqa: BLE001
            if intento == 2:
                raise
            print(f"cnmv, página: {ex}; otra vez")
            time.sleep(15)
    enlaces = enlaces_cnmv(html)
    if not enlaces:
        raise RuntimeError("la página de la CNMV no tiene enlaces de descarga")
    for u in enlaces[:4]:
        try:
            datos = bajar(u, 180)
            if datos[:2] == b"PK":
                return leer_cnmv_zip(datos)
        except Exception as ex:  # noqa: BLE001
            print(f"cnmv {u[-20:]}: {ex}")
    raise RuntimeError("ningún enlace de la CNMV trae el registro de fondos")


# ---------- las dos juntas ----------
def juntar(xetra, cnmv):
    """Una entrada por ISIN; si un ETF español está en las dos, vale la de Xetra."""
    out = {}
    for e in xetra:
        out[e["isin"]] = {**e, "o": "x"}
    for e in cnmv:
        if e["isin"] not in out:
            out[e["isin"]] = {**e, "o": "c"}
    return out
