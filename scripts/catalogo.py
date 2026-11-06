"""Catálogo común: precio e histórico diarios de los fondos, ETF, oro y cripto de catalogo.json.

Uso: python scripts/catalogo.py catalogo.json anterior salida

Para que cualquiera que use la web (también los amigos con su cartera en el móvil) encuentre su fondo
exacto, con su clase y su ISIN, y la web le ponga precio. Se ejecuta una vez al día (catalogo.yml):
- salida/catalogo-precios.json: un índice ligero con nombre, ISIN, símbolo, tipo, región y el precio
  en euros de cada uno (lo lee la web al abrir).
- salida/cat/<id>.json: el histórico en euros de cada uno (diario los 2 últimos años y semanal antes,
  hasta 10 años). La web solo baja el de lo que tienes.
- salida/catalogo-mas.json y catalogo-ampliado.json: el catálogo ampliado con las listas de Xetra y la CNMV
  (más abajo, «el catálogo ampliado»).
El símbolo de Yahoo de cada ISIN se guarda y se reutiliza al día siguiente.
"""

import json
import os
import re
import sys
import time
import traceback

import pandas as pd
import yfinance as yf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalogo_listas as LISTAS  # noqa: E402
from precios import a_euros, num, pedidas_firestore, redondeo, rentabilidad, serie_cierres, serie_por_isin, tipos_de_cambio  # noqa: E402

# El catálogo ampliado (5 nov 2026): además de catalogo.json, los ETF/ETC/ETN de Xetra y los fondos españoles de la
# CNMV a los que Yahoo pone precio (unos 5.700). catalogo-precios.json (lo que baja la web al abrir) sigue con
# catalogo.json y lo pedido; el resto va en catalogo-mas.json, que la web baja solo al buscar o añadir un fondo, con
# el precio de cada día y su año en cierres semanales (cat/<id>.json). El símbolo de Yahoo de cada ISIN se busca una
# vez y se guarda en catalogo-ampliado.json (rama catalogo); si Yahoo no lo encuentra, no se vuelve a probar en una
# semana. catalogo-semilla.json (en el repositorio) trae los símbolos del primer relleno.
MODO = os.environ.get("CATALOGO_MODO", "completo")  # «rapido»: lo lanza la web al pedir un ISIN; solo catalogo.json y lo pedido
RELLENO_MIN = float(os.environ.get("CATALOGO_RELLENO_MIN", "20"))  # minutos para buscar símbolos nuevos cada día
DIAS_REINTENTO = 7
DIAS_SIN_PRECIO = 10  # lo del catálogo ampliado sin precio nuevo se queda con el último estos días
TROZO_DESCARGA = 200
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEMILLA = os.path.join(RAIZ, "catalogo-semilla.json")
COLS_MAS = ["isin", "n", "c", "s", "t", "cl", "r", "m", "dom", "p", "pa", "f", "r1a"]

GESTORAS = [
    (r"^vanguard", "vanguard.com"), (r"^ishares", "ishares.com"), (r"^fidelity", "fidelity.es"), (r"^amundi|^lyxor", "amundi.com"),
    (r"^xtrackers", "dws.com"), (r"^spdr", "ssga.com"), (r"^invesco", "invesco.com"), (r"^wisdomtree", "wisdomtree.eu"),
    (r"^cobas", "cobasam.com"), (r"^azvalor", "azvalor.com"), (r"^magallanes", "magallanesvalue.com"), (r"^bestin", "bestinver.es"),
    (r"^myinvestor", "myinvestor.es"), (r"^groupama", "groupama-am.com"), (r"^vaneck", "vaneck.com"), (r"^global x", "globalxetfs.com"),
    (r"^avantis", "avantisinvestors.com"), (r"^true value", "truevalue.es"), (r"^neuberger", "nb.com"), (r"^xetra", "deutsche-boerse.com"),
    # los de Xetra (5 nov 2026)
    (r"^ubs", "ubs.com"), (r"^hsbc", "hsbc.com"), (r"^jpm|^jp ?morgan", "jpmorgan.com"), (r"^franklin", "franklintempleton.com"),
    (r"^l&g|^legal & general", "lgim.com"), (r"^first trust", "ftglobalportfolios.com"), (r"^hanetf", "hanetf.com"),
    (r"^21shares", "21shares.com"), (r"^coinshares", "coinshares.com"), (r"^bnp", "bnpparibas-am.com"), (r"^deka", "deka.de"),
    (r"^ossiam", "ossiam.com"), (r"^pimco", "pimco.com"), (r"^krane", "kraneshares.com"), (r"^dimensional", "dimensional.com"),
    (r"^goldman", "gsam.com"), (r"^bitwise", "bitwiseinvestments.com"), (r"^leverage shares", "leverageshares.com"),
    (r"^granite", "graniteshares.com"), (r"^janus", "janushenderson.com"), (r"^abrdn", "abrdn.com"), (r"^state street", "ssga.com"),
    (r"^expat", "expat.bg"), (r"^ark ", "ark-funds.com"), (r"^tabula", "tabulaim.com"), (r"^rize", "rizeetf.com"),
    (r"^bbva", "bbvaassetmanagement.com"), (r"^santander", "santanderassetmanagement.es"), (r"^caixabank", "caixabankam.com"),
    (r"^ibercaja", "ibercajagestion.com"), (r"^kutxabank", "kutxabankgestion.es"), (r"^bankinter", "bankinter.com"),
    (r"^mutuafondo", "mutuactivos.com"), (r"^renta 4", "r4.com"), (r"^abanca", "abanca.com"), (r"^unicaja", "unicajabanco.es"),
]
# los fondos españoles, por el grupo de su gestora en la CNMV
GRUPOS_DOM = [
    (r"santander", "santanderassetmanagement.es"), (r"caixa", "caixabankam.com"), (r"bilbao vizcaya|bbva", "bbvaassetmanagement.com"),
    (r"bankinter", "bankinter.com"), (r"credit agricole", "amundi.es"), (r"ibercaja", "ibercajagestion.com"), (r"renta 4", "r4.com"),
    (r"mutua madrile", "mutuactivos.com"), (r"kutxabank", "kutxabankgestion.es"), (r"andbank", "andbank.es"),
    (r"banco cooperativo", "gescooperativo.es"), (r"abante", "abanteasesores.com"), (r"banca march", "march-am.com"),
    (r"gvc gaesco", "gvcgaesco.es"), (r"caja laboral", "laboralkutxa.com"), (r"mapfre", "mapfre.es"), (r"unicaja", "unicajabanco.es"),
    (r"gesiuris", "gesiuris.com"), (r"santalucia", "santaluciaam.es"), (r"singular", "singularbank.es"), (r"bestinver", "bestinver.es"),
    (r"arquia", "arquia.com"), (r"trea", "treacapital.com"), (r"abanca", "abanca.com"), (r"mediolanum", "bancomediolanum.es"),
    (r"azvalor", "azvalor.com"), (r"cobas", "cobasam.com"), (r"magallanes", "magallanesvalue.com"), (r"myinvestor", "myinvestor.es"),
    (r"deutsche bank", "dws.com"), (r"ubs", "ubs.com"), (r"catalana occidente", "gco.com"), (r"metagestion", "metagestion.com"),
]
CRIPTO_DOM = {"BTC": "bitcoin.org", "ETH": "ethereum.org", "SOL": "solana.com", "XRP": "xrpl.org", "ADA": "cardano.org", "DOGE": "dogecoin.com",
              "DOT": "polkadot.network", "LINK": "chain.link", "AVAX": "avax.network", "LTC": "litecoin.org", "BNB": "bnbchain.org",
              "TRX": "tron.network", "XLM": "stellar.org", "SHIB": "shibatoken.com", "USDC": "circle.com"}
MUNDO = {"EEUU": 70, "Europa": 15, "Japón y Pacífico": 8, "Canadá": 3, "Otros": 4}
TODO_MUNDO = {"EEUU": 62, "Europa": 14, "Japón y Pacífico": 7, "Emergentes": 11, "Canadá": 3, "Otros": 3}


def serie_por_nombre(texto, periodo="10y"):
    """Para los fondos que Yahoo no encuentra por ISIN: busca por nombre ("q" en catalogo.json) y se queda
    con el primer fondo o ETF cuyo nombre lleve todas las palabras de la búsqueda, primero los de
    acumulación de clase A, que son los que se venden en España."""
    palabras = [w for w in re.split(r"\s+", texto.lower()) if w]
    try:
        quotes = yf.Search(texto, max_results=15, news_count=0, lists_count=0, raise_errors=False).quotes or []
    except Exception:  # noqa: BLE001
        quotes = []
    cands = []
    for q in quotes:
        nombre = (q.get("longname") or q.get("shortname") or "").lower()
        if q.get("symbol") and q.get("quoteType") in ("MUTUALFUND", "ETF") and all(w in nombre for w in palabras):
            cands.append((0 if re.search(r"\ba[- ]?acc", nombre) else 1 if "acc" in nombre else 2, q["symbol"], nombre))
    for _, sim, nombre in sorted(cands):
        try:
            t, s, meta = serie_cierres(sim, periodo)
            if len(s) >= 20:
                return sim, t, s, meta, nombre
        except Exception:  # noqa: BLE001
            pass
    vistos = ", ".join(f"{q.get('symbol')} {q.get('quoteType')} {(q.get('longname') or q.get('shortname') or '')[:50]}" for q in quotes[:8])
    raise RuntimeError(f"nada en Yahoo para «{texto}»: {vistos or 'sin resultados'}")


def region_de(nombre):
    n = nombre.lower()
    if re.search(r"s&p|\bus\b|u\.s\.|usa|america|nasdaq|russell|dow|eeuu|ee\.\s?uu|estados unidos|norteam", n):
        return {"EEUU": 100}
    if re.search(r"all[- ]world|acwi|all cap|lifestrategy|global aggregate", n):
        return dict(TODO_MUNDO)
    if re.search(r"emerging|emergentes|\bem\b|india|china|brasil|brazil", n):
        return {"Emergentes": 100}
    if re.search(r"japan|jap[oó]n", n):
        return {"Japón y Pacífico": 100}
    if re.search(r"pacific", n):
        return {"Japón y Pacífico": 100}
    if re.search(r"europe|europ|euro |eurozone|emu|stoxx|dax|ibex|espa", n):
        return {"Europa": 100}
    if re.search(r"world|global|developed|mundial|internacional", n):
        return dict(MUNDO)
    return {"Global": 100}


def clase_de(nombre, tipo):
    n = nombre.lower()
    if tipo == "Cripto":
        return "Cripto"
    # los ETP de cripto (21Shares, CoinShares, WisdomTree Bitcoin…) van con la cripto
    if tipo in ("ETC", "ETF") and re.search(r"bitcoin|ethereum|crypto|solana|\bxrp\b", n):
        return "Cripto"
    # las de mineras de oro son acciones, no oro
    if re.search(r"miner|mining", n):
        return "Renta variable"
    if re.search(r"gold|\boro\b", n):
        return "Oro"
    # plata, platino, paladio, cobre o cestas de materias primas (los ETF de petroleras son acciones: no llevan «physical» ni son ETC)
    if re.search(r"silver|platinum|palladium|copper|commodit|brent|crude|\bwti\b|precious metal", n) and (tipo == "ETC" or re.search(r"physical|commodit|2x|3x|leveraged", n)):
        return "Materias primas"
    if re.search(r"overnight|tr[ée]sorerie|liquidity|monetari|money market|\bcash\b|liquidez|tesorer", n):
        return "Monetario"
    if re.search(r"bond|govt|government|aggregate|renta fija|ultrashort|duration|credit|\bbonos\b|\bdeuda\b|garantizado|\brf\b", n):
        return "Renta fija"
    return "Renta variable"


def tipo_web(tipo, nombre, clase):
    if tipo == "Fondo":
        if clase in ("Renta fija", "Monetario"):
            return "Fondo de renta fija"
        return "Fondo indexado" if re.search(r"index|indice|s&p|msci|ftse|stoxx", nombre.lower()) else "Fondo"
    if tipo == "ETC" or (tipo == "ETF" and clase in ("Oro", "Materias primas") and not re.search(r"commodit", nombre.lower())):
        return "ETC"
    return tipo


def corto_de(nombre, largo=28):
    # sin la clase (P Acc, D Acc, AE-C, IE-C, 1C, IC, M…), que va justo antes de Acc/Dist/EUR o al final
    t = re.sub(r"\s(?:[A-Z]|[A-Z]{2}-[A-Z]|\d[A-Z]|IC|M)(?=\s+(?:Acc|Dist|EUR|FI)\b|\s*$)", " ", nombre)
    t = t.replace("(IE)", " ").replace("Hedged", "cubierto")
    t = re.sub(r"\b(Index Fund|Index|Fund|Stock|UCITS|ETF|Acc|Dist|EUR|Class|FI|Investor)\b", " ", t)
    t = re.sub(r"\s+", " ", t).strip(" -,")
    if not largo:
        return t or nombre
    return (t[:largo] if t else nombre[:largo]).strip()


def dominio_de(nombre, simbolo):
    if simbolo and simbolo.endswith("-EUR"):
        return CRIPTO_DOM.get(simbolo.split("-")[0])
    n = nombre.lower()
    for patron, dom in GESTORAS:
        if re.search(patron, n):
            return dom
    return None


# Para los que se añaden con "v": 1 en catalogo.json, el nombre que les ponemos se compara con el que tiene Yahoo para
# ese ISIN. Si no se parecen, no se publica y queda en «dudas» para revisarlo: así nunca sale un nombre con el
# precio de otro fondo. Yahoo abrevia mucho en los fondos (Glb Stk Idx...), de ahí las equivalencias.
NO_CUENTA = set("""ucits etf etc etp fund fonds fondo fi index idx class shares share acc accumulating accumulation dist
distributing inc income eur usd gbp chf a b c d e i p r t z ae ie lc nc bp ic 1c 1d 2c plc sicav icav the of and
de del la el y en dr swap investor inv sub units unit cap c-eur a-acc-eur acc-eur comprobar antes irlanda de""".split())
EQUIV = {"lyxor": "amundi", "blackrock": "ishares", "bgf": "ishares", "dws": "xtrackers", "glb": "global", "gbl": "global",
         "stk": "stock", "eq": "equity", "eqty": "equity", "mkts": "markets", "mkt": "markets", "jpn": "japan", "pac": "pacific",
         "dev": "developed", "wld": "world", "wrld": "world", "tech": "technology", "sm": "small", "bd": "bond", "bds": "bond",
         "bonds": "bond", "govt": "government", "gov": "government", "corp": "corporate", "infl": "inflation", "lnkd": "linked",
         "st": "short", "trm": "term", "opps": "opportunities", "opp": "opportunities", "gr": "growth", "grw": "growth",
         "div": "dividend", "divs": "dividend", "em": "emerging", "emerg": "emerging", "europ": "europe", "eurozone": "euro",
         "emu": "euro", "us": "usa", "hdg": "hedged", "h": "hedged", "min": "minimum", "vol": "volatility", "sp": "sp", "nasdaq100": "nasdaq", "100": "nasdaq100", "intl": "international",
         "sust": "sustainable", "infra": "infrastructure", "ai": "intelligence", "artificial": "intelligence"}


def fichas(nombre):
    n = re.sub(r"\(antes [^)]*\)", " ", nombre.lower()).replace("s&p", " sp ").replace("&", " ").replace("-", " ")
    return {EQUIV.get(w, w) for w in re.findall(r"[a-z0-9]+", n) if w not in NO_CUENTA}


# lo que distingue a dos fondos de la misma gestora y el mismo índice: si uno lo dice y el otro no, no son el mismo
CLAVE = set("""value momentum quality minimum volatility size small mid dividend esg sri screened leveraged doble apalancado
inverse short equal weight growth emerging europe usa japan china india pacific latin korea brazil canada government corporate
bond gold silver platinum technology health energy financials banks utilities materials industrials discretionary staples
communication property inflation treasury high yield hedged bitcoin ethereum""".split())


def se_parece(mio, suyo):
    a, b = fichas(mio), fichas(suyo)
    if not a or not b:
        return False
    marca = fichas(mio.split()[0])
    if marca and not (marca & b):
        return False
    if (a & CLAVE) != (b & CLAVE):
        return False
    return len(a & b) / len(a) >= 0.5


def compacta(s):
    """Diario los dos últimos años; antes, un punto por semana (hasta 10 años)."""
    if s.empty:
        return []
    fin = s.index[-1]
    reciente = s[s.index >= fin - pd.Timedelta(days=730)]
    viejo = s[(s.index < fin - pd.Timedelta(days=730)) & (s.index >= fin - pd.Timedelta(days=3660))]
    if len(viejo):
        viejo = viejo.resample("W-FRI").last().dropna()
    junta = pd.concat([viejo, reciente])
    return [[d.date().isoformat(), redondeo(float(v), 6)] for d, v in junta.items()]


# ---------- el catálogo ampliado ----------
def _sin_tildes(t):
    return t.lower().translate(str.maketrans("áéíóúüñàèìòùç", "aeiouunaeiouc"))


GENERICAS = set("fi fil fondo fund fondos clase class serie de del la el los las y e en a acc dist eur usd sa plc".split())


def _fichas_es(t):
    return [w for w in re.findall(r"[a-z0-9]+", _sin_tildes(t)) if w not in GENERICAS and (len(w) > 1 or w.isdigit()) and w != "0"]


def cuadra_cnmv(mio, suyo):
    """¿El nombre que Yahoo da para un ISIN de la CNMV es el de ese fondo? Yahoo abrevia (Rta Fja, Cred, Sel, Mltg…):
    una palabra cuenta si es la misma o si empiezan igual (4 letras, o una es el principio de la otra). Vale si
    coincide la primera palabra y al menos la mitad de las nuestras, o si casi todo el nombre de Yahoo está en el
    nuestro («Short Term Selection FI» para «Ginvest GPS FI, Short Term Selection»). Si los dos llevan números (el
    año de un fondo con fecha), tienen que ser los mismos. Sin nombre en Yahoo, vale el ISIN."""
    a, b = _fichas_es(mio), _fichas_es(suyo)
    if not b:
        return True
    if not a:
        return False

    def esta(w, en):
        if w.isdigit():
            return w in en
        return any(u == w or (len(w) >= 3 and len(u) >= 3 and (u[:4] == w[:4] or u.startswith(w) or w.startswith(u))) for u in en if not u.isdigit())
    na, nb = {w for w in a if w.isdigit()}, {w for w in b if w.isdigit()}
    if na and nb and na != nb:
        return False
    cubre_a = sum(1 for w in a if esta(w, b)) / len(a)
    cubre_b = sum(1 for w in b if esta(w, a)) / len(b)
    return (esta(a[0], b) and cubre_a >= 0.5) or (len(b) >= 2 and cubre_b >= 0.75)


def dominio_grupo(grupo):
    g = _sin_tildes(grupo or "")
    return next((dom for patron, dom in GRUPOS_DOM if re.search(patron, g)), None)


def hoy_iso():
    return pd.Timestamp.now(tz="UTC").date().isoformat()


def reciente(fecha, dias):
    try:
        return (pd.Timestamp(hoy_iso()) - pd.Timestamp(fecha)).days < dias
    except Exception:  # noqa: BLE001
        return False


def leer(ruta, defecto=None):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return defecto


def resolver(e):
    """El símbolo de Yahoo de un ISIN de las listas, con su moneda y su nombre (para comprobarlo y enseñarlo)."""
    sim, _, s, meta = serie_por_isin(e["isin"], "3mo")
    suyo = (meta.get("longName") or meta.get("shortName") or "").strip()
    return {"s": sim, "m": meta.get("currency") or "EUR", "yn": suyo[:140], "yt": (meta.get("instrumentType") or "").upper()}


def universo(prev, semilla):
    """Las dos listas de hoy, con lo que ya se sabía de cada ISIN (símbolo, moneda, nombre de Yahoo, cuándo falló).
    Si una lista no se puede bajar, se sigue con la de ayer."""
    u_prev = (prev or {}).get("u") or {}
    listas = dict((prev or {}).get("listas") or {})
    try:
        xetra = LISTAS.bajar_xetra()
        listas["xetra"] = hoy_iso()
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        xetra = [{"isin": k, **{c: v for c, v in e.items() if c in ("n", "t", "g")}} for k, e in u_prev.items() if e.get("o") == "x"]
    try:
        cnmv, mes = LISTAS.bajar_cnmv()
        listas["cnmv"] = mes
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        cnmv = [{"isin": k, **{c: v for c, v in e.items() if c in ("n", "t", "g")}} for k, e in u_prev.items() if e.get("o") == "c"]
    u = LISTAS.juntar(xetra, cnmv)
    for isin, e in u.items():
        viejo = u_prev.get(isin) or (semilla or {}).get(isin) or {}
        for k in ("s", "m", "yn", "yt", "no", "dud"):
            if k in viejo:
                e[k] = viejo[k]
    print(f"catálogo ampliado: {len(xetra)} de Xetra, {len(cnmv)} de la CNMV, {len(u)} ISIN")
    return {"listas": listas, "u": u}


def yahoo_contesta():
    try:
        return bool(resolver({"isin": "IE00B4L5Y983"}).get("s"))
    except Exception:  # noqa: BLE001
        return False


def rellenar(u, excluir, minutos, pausa=0.25):
    """Busca el símbolo de los ISIN que aún no lo tienen, hasta «minutos». Si Yahoo deja de contestar (muchos
    fallos seguidos), para y no apunta esos fallos (no es que no estén: es que hoy no responde)."""
    pend = [e for k, e in u.items() if not e.get("s") and k not in excluir and not reciente(e.get("no"), DIAS_REINTENTO)]
    t0, hechos, bien, seguidos = time.time(), 0, 0, []
    for e in pend:
        if time.time() - t0 > minutos * 60:
            break
        try:
            r = resolver(e)
            e.update(r)
            e.pop("no", None)
            e.pop("dud", None)
            if e.get("o") == "c" and not cuadra_cnmv(e["n"], r["yn"]):
                e["dud"] = 1
            bien += 1
            seguidos = []
        except Exception:  # noqa: BLE001
            e["no"] = hoy_iso()
            seguidos.append(e)
            if len(seguidos) >= 40:
                # los pendientes son sobre todo los que Yahoo no tiene: 40 seguidos puede ser normal. Se prueba uno que
                # sí tiene (el iShares Core MSCI World); si tampoco sale, es que Yahoo no contesta
                if yahoo_contesta():
                    seguidos = []
                    continue
                for x in seguidos:
                    x.pop("no", None)
                print("relleno: 40 fallos seguidos, Yahoo no contesta; se para hasta mañana")
                break
        hechos += 1
        time.sleep(pausa)
    print(f"relleno: {hechos} de {len(pend)} pendientes, {bien} con símbolo, en {round(time.time() - t0)} s")
    return hechos


def corto_mas(nombre, origen):
    """El nombre corto (el que va en negrita en el buscador) de lo del catálogo ampliado."""
    if origen == "c":
        # «Renta 4 Multigestion FI, Fractal Global, clase A» → «Fractal Global»; «Bestinver Renta FI, clase R» → «Bestinver Renta»
        m = re.match(r"(.*?)\s+FI\b,?(.*)", nombre)
        base, resto = (m.group(1), m.group(2)) if m else (nombre, "")
        partes = [x.strip() for x in resto.split(",") if x.strip()]
        t = next((x for x in partes if not x.lower().startswith("clase")), None) or base
    else:
        # «Vanguard Funds PLC - Vanguard EUR Eurozone…»: lo de delante es el paraguas; «… UCITS ETF - USD Acc»: lo de detrás, la clase
        trozos = re.split(r"\s*-\s+", nombre, maxsplit=1)
        izq, der = trozos[0], (trozos[1] if len(trozos) > 1 else "")
        if der and re.search(r"\b(plc|icav|sicav|funds|etfs)\b", izq, re.I):
            marca = izq.split()[0]
            t = der if der.lower().startswith(marca.lower()[:4]) else f"{marca} {der}"
        else:
            t = izq
        t = corto_de(t, None)
    t = re.sub(r"\s+", " ", t).strip(" -,")
    return t if len(t) <= 28 else (t[:29].rsplit(" ", 1)[0] or t[:28])


def ficha_mas(isin, e, s_eur):
    """La ficha de catalogo-mas.json (como las de catalogo-precios.json, sin lo que no hace falta para buscar)."""
    nombre = e.get("n") if e.get("o") == "c" else (e.get("yn") or e.get("n") or isin)
    if nombre == nombre.upper():
        nombre = LISTAS.titulo(nombre)
    tipo = e.get("t") or "ETF"
    clase = clase_de(nombre, tipo)
    # Xetra ya dice cuáles son de renta fija («RENTEN»)
    if clase == "Renta variable" and "RENTEN" in (e.get("g") or "").upper():
        clase = "Renta fija"
    hoy = s_eur.index[-1]
    return {
        "isin": isin, "n": nombre, "c": corto_mas(nombre, e.get("o")), "s": e["s"], "t": tipo_web(tipo, nombre, clase), "cl": clase,
        "r": None if clase in ("Oro", "Materias primas", "Cripto") else region_de(nombre), "m": e.get("m") or "EUR",
        "dom": dominio_de(nombre, e["s"]) or (dominio_grupo(e.get("g")) if e.get("o") == "c" else None),
        # seis cifras significativas (no seis decimales): catalogo-mas.json pesa un 15 % menos
        "p": redondeo(float(s_eur.iloc[-1]), 6), "pa": redondeo(float(s_eur.iloc[-2]), 6) if len(s_eur) > 1 else None,
        "f": hoy.date().isoformat(), "r1a": rentabilidad(s_eur, hoy - pd.Timedelta(days=365)),
    }


def semanal(s):
    """El último año, un cierre por semana (y el último día), para la gráfica de la consulta."""
    fin = s.index[-1]
    a = s[s.index >= fin - pd.Timedelta(days=372)]
    w = a.resample("W-FRI").last().dropna()
    if len(w) and w.index[-1] > fin:
        w = w.iloc[:-1]
    w = pd.concat([w, a.iloc[-1:]])
    w = w[~w.index.duplicated(keep="last")]
    return [[d.date().isoformat(), redondeo(float(v), 6)] for d, v in w.items()]


def precios_mas(items, fx, dir_salida):
    """El precio de cada día y el año de todo el catálogo ampliado en pocas consultas (de 200 en 200)."""
    por_sim = {}
    for isin, e in items:
        por_sim.setdefault(e["s"], []).append((isin, e))
    sims = list(por_sim)
    fichas_ = {}
    t0 = time.time()
    for i in range(0, len(sims), TROZO_DESCARGA):
        trozo = sims[i:i + TROZO_DESCARGA]
        try:
            df = yf.download(trozo, period="1y", interval="1d", progress=False, auto_adjust=False, threads=True, group_by="column")
            cierre = df["Close"]
        except Exception:  # noqa: BLE001
            traceback.print_exc()
            continue
        for sim in trozo:
            if sim not in cierre:
                continue
            c = cierre[sim].dropna()
            c = c[c > 0]
            if len(c) < 2:
                continue
            c.index = pd.to_datetime(c.index).tz_localize(None).normalize()
            c = c[~c.index.duplicated(keep="last")]
            for isin, e in por_sim[sim]:
                try:
                    s_eur = a_euros(c, e.get("m") or "EUR", fx).dropna()
                    if len(s_eur) < 2:
                        continue
                    x = ficha_mas(isin, e, s_eur)
                    cid = "c-" + isin.lower()
                    fichas_[cid] = x
                    with open(f"{dir_salida}/cat/{cid}.json", "w", encoding="utf-8") as f:
                        json.dump({"h": semanal(s_eur), "sem": 1}, f, separators=(",", ":"))
                except Exception:  # noqa: BLE001
                    traceback.print_exc()
    print(f"catálogo ampliado: precio de {len(fichas_)} de {len(items)} en {round(time.time() - t0)} s")
    return fichas_


def escribir_mas(fichas_, generado, dir_salida):
    filas = [[x.get(k) for k in COLS_MAS] for _, x in sorted(fichas_.items())]
    with open(f"{dir_salida}/catalogo-mas.json", "w", encoding="utf-8") as f:
        json.dump({"generado": generado, "cols": COLS_MAS, "v": filas}, f, ensure_ascii=False, separators=(",", ":"))


def leer_mas(ruta):
    j = leer(ruta) or {}
    cols = j.get("cols") or COLS_MAS
    return {("c-" + str(fila[0]).lower()): dict(zip(cols, fila)) for fila in j.get("v") or [] if fila and fila[0]}, j.get("generado")


def ampliado(cat_ids, dir_anterior, dir_salida, fx, modo=None):
    """El catálogo ampliado entero: listas, símbolos nuevos, precios y catalogo-mas.json. Devuelve {id, n} para
    catalogo-precios.json (la web vuelve a bajar catalogo-mas.json solo cuando cambia el id)."""
    modo = modo or MODO
    prev = leer(f"{dir_anterior}/catalogo-ampliado.json")
    prev_mas, prev_gen = leer_mas(f"{dir_anterior}/catalogo-mas.json")

    def traer(cid):
        try:
            os.replace(f"{dir_anterior}/cat/{cid}.json", f"{dir_salida}/cat/{cid}.json")
        except Exception:  # noqa: BLE001
            pass
    if modo != "completo":
        # lanzado desde la web al pedir un ISIN: se queda lo de esta mañana, tal cual
        if prev is not None:
            with open(f"{dir_salida}/catalogo-ampliado.json", "w", encoding="utf-8") as f:
                json.dump(prev, f, ensure_ascii=False, separators=(",", ":"))
        quedan = {k: v for k, v in prev_mas.items() if k not in cat_ids}
        for cid in quedan:
            traer(cid)
        if quedan:
            escribir_mas(quedan, prev_gen, dir_salida)
        return {"id": prev_gen, "n": len(quedan)} if quedan else None
    est = universo(prev, leer(SEMILLA, {}).get("u") if os.path.exists(SEMILLA) else None)
    u = est["u"]
    excluir = {k for k in u if "c-" + k.lower() in cat_ids}
    rellenar(u, excluir, RELLENO_MIN)
    # el nombre de Yahoo de los fondos españoles se vuelve a comprobar cada día (por si cambia la regla o el nombre)
    for e in u.values():
        if e.get("o") == "c" and e.get("s"):
            if cuadra_cnmv(e.get("n") or "", e.get("yn") or ""):
                e.pop("dud", None)
            else:
                e["dud"] = 1
    items = [(k, e) for k, e in u.items() if e.get("s") and not e.get("dud") and k not in excluir]
    fichas_ = precios_mas(items, fx, dir_salida)
    # lo que hoy no ha traído precio se queda con el de los últimos días
    vivos = {"c-" + k.lower() for k, _ in items}
    for cid, x in prev_mas.items():
        if cid not in fichas_ and cid in vivos and reciente(x.get("f"), DIAS_SIN_PRECIO):
            fichas_[cid] = x
            traer(cid)
    generado = pd.Timestamp.now(tz="UTC").isoformat(timespec="seconds")
    est["generado"] = generado
    est["dudas"] = [[k, e.get("n"), e.get("yn"), e.get("s")] for k, e in u.items() if e.get("dud")][:400]
    with open(f"{dir_salida}/catalogo-ampliado.json", "w", encoding="utf-8") as f:
        json.dump(est, f, ensure_ascii=False, separators=(",", ":"))
    escribir_mas(fichas_, generado, dir_salida)
    con = sum(1 for e in u.values() if e.get("s"))
    print(f"catálogo ampliado: {len(fichas_)} en catalogo-mas.json; {con} de {len(u)} con símbolo; {len(est['dudas'])} dudas por el nombre")
    return {"id": generado, "n": len(fichas_)}


def main(ruta_cat, dir_anterior, dir_salida):
    cat = json.load(open(ruta_cat, encoding="utf-8"))
    # los fondos y ETF que alguien ha metido a mano por su ISIN y no estaban (la lista común «simbolos» de Firestore)
    try:
        hay = {(e.get("isin") or "").upper() for e in cat.get("valores", [])}
        nuevos = [x["isin"] for x in pedidas_firestore() if x["isin"] and not x["s"] and x["isin"] not in hay]
        # si ya está en el catálogo ampliado, con el símbolo que se sabe (así no se vuelve a buscar)
        u_prev = (leer(f"{dir_anterior}/catalogo-ampliado.json") or {}).get("u") or {}
        cat["valores"] = cat.get("valores", []) + [{"isin": i, "pd": 1, **({"su": u_prev[i]["s"]} if (u_prev.get(i) or {}).get("s") else {})}
                                                   for i in dict.fromkeys(nuevos)][:150]
        print(f"pedidos por ISIN: {len(nuevos)}")
    except Exception:  # noqa: BLE001
        traceback.print_exc()
    prev = {}
    try:
        prev = (json.load(open(f"{dir_anterior}/catalogo-precios.json", encoding="utf-8")).get("v") or {})
    except Exception:  # noqa: BLE001
        pass
    os.makedirs(f"{dir_salida}/cat", exist_ok=True)
    fx = tipos_de_cambio()
    salida, errores, dudas = {}, [], []
    for e in cat.get("valores", []):
        isin = (e.get("isin") or "").upper()
        cid = ("c-" + (isin or e.get("s", "")).lower()).replace("=", "").replace("^", "")
        yn = None
        try:
            sim = e.get("s") or (prev.get(cid) or {}).get("s") or e.get("su")
            try:
                if not sim:
                    raise RuntimeError("sin símbolo")
                # en cripto, "s" es el mercado de Bitvavo (para el precio en directo) y "sy", si lo hay, el símbolo de
                # Yahoo del que sale el histórico (a veces solo en dólares: se pasa a euros como todo lo demás)
                _, s, meta = serie_cierres(e.get("sy") or sim, "10y")
                if len(s) < 20 and not e.get("s"):
                    raise RuntimeError("poco histórico")
            except Exception:  # noqa: BLE001
                if e.get("s") or not isin:
                    raise
                try:
                    sim, _, s, meta = serie_por_isin(isin, "10y")
                except Exception:  # noqa: BLE001
                    if not e.get("q"):
                        raise
                    # (meta de yfinance es perezoso: copiarlo con dict() falla en «tradingPeriods»)
                    sim, _, s, meta, yn = serie_por_nombre(e["q"])
            moneda = meta.get("currency") or "EUR"
            s_eur = a_euros(s, moneda, fx).dropna()
            if s_eur.empty:
                raise RuntimeError("sin precios")
            suyo = meta.get("longName") or meta.get("shortName") or ""
            if e.get("v") and e.get("n") and not se_parece(e["n"], suyo):
                dudas.append([cid, e["n"], suyo, sim])
                raise RuntimeError(f"el nombre no cuadra: Yahoo dice «{suyo}»")
            nombre = e.get("n") or suyo or sim
            tipo = e.get("t") or ("Cripto" if sim.endswith("-EUR") else "Fondo" if sim.startswith("0P") else "ETF")
            # lo pedido por ISIN que Yahoo da como «acción»: si es un ETC o ETP (oro, plata, bitcoin…) va como ETC;
            # si es una empresa de verdad, no es para el catálogo (la app la pide por su ticker y va al radar)
            if not e.get("t") and (meta.get("instrumentType") or "").upper() == "EQUITY":
                if re.search(r"\b(etc|etp|etn|physical)\b", nombre.lower()):
                    tipo = "ETC"
                elif not re.search(r"\b(etf|ucits|fund|fonds|index)\b", nombre.lower()):
                    raise RuntimeError(f"es una acción ({nombre}): va al radar, no al catálogo")
            clase = clase_de(nombre, tipo)
            hoy = s_eur.index[-1]
            salida[cid] = {
                "n": nombre, "c": corto_de(nombre), "isin": isin or None, "s": sim, "t": tipo_web(tipo, nombre, clase), "cl": clase,
                "r": {"Global": 100} if clase in ("Oro", "Materias primas", "Cripto") else region_de(nombre), "m": moneda,
                "pais": isin[:2] if isin else None, "dom": dominio_de(nombre, sim),
                "p": num(float(s_eur.iloc[-1]), 6), "pa": num(float(s_eur.iloc[-2]), 6) if len(s_eur) > 1 else None,
                "f": hoy.date().isoformat(),
                "r1a": rentabilidad(s_eur, hoy - pd.Timedelta(days=365)),
            }
            if e.get("a"):
                salida[cid]["a"] = e["a"]
            if e.get("pd"):
                salida[cid]["pd"] = 1
            if yn:
                salida[cid]["yn"] = yn  # el nombre que tiene en Yahoo, para comprobar que es el fondo bueno
            with open(f"{dir_salida}/cat/{cid}.json", "w", encoding="utf-8") as f:
                json.dump({"h": compacta(s_eur)}, f, separators=(",", ":"))
            print(f"ok   {cid:22s} {sim:16s} {salida[cid]['p']}")
        except Exception as ex:  # noqa: BLE001
            donde = traceback.extract_tb(ex.__traceback__)[-1] if ex.__traceback__ else None
            errores.append(f"{cid}: {ex!r}" + (f" ({os.path.basename(donde.filename)}:{donde.lineno} {donde.name})" if donde else ""))
            if cid in prev:
                salida[cid] = prev[cid]
                try:
                    os.replace(f"{dir_anterior}/cat/{cid}.json", f"{dir_salida}/cat/{cid}.json")
                except Exception:  # noqa: BLE001
                    pass
        time.sleep(0.4)
    mas = None
    try:
        mas = ampliado(set(salida), dir_anterior, dir_salida, fx)
    except Exception:  # noqa: BLE001
        # si falla, catalogo.json y lo pedido salen igual (sin catalogo-mas.json la web busca como antes)
        traceback.print_exc()
        errores.append(f"catálogo ampliado: {traceback.format_exc(limit=1)[-300:]}")
    generado = pd.Timestamp.now(tz="UTC").isoformat(timespec="seconds")
    with open(f"{dir_salida}/catalogo-precios.json", "w", encoding="utf-8") as f:
        # los que fallan, con el motivo (los registros de las Actions no siempre se pueden leer desde fuera)
        j = {"generado": generado, "v": salida, "errores": errores[:400], "dudas": dudas}
        if mas:
            j["mas"] = mas
        json.dump(j, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(salida)} en el catálogo; {len(errores)} errores ({len(dudas)} por el nombre)")
    for x in errores:
        print("  -", x)
    if not salida:
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
