"""Catálogo común: precio e histórico diarios de los fondos, ETF, oro y cripto de catalogo.json.

Uso: python scripts/catalogo.py catalogo.json anterior salida

Para que cualquiera que use la web (también los amigos con su cartera en el móvil) encuentre su fondo
exacto, con su clase y su ISIN, y la web le ponga precio. Se ejecuta una vez al día (catalogo.yml):
- salida/catalogo-precios.json: un índice ligero con nombre, ISIN, símbolo, tipo, región y el precio
  en euros de cada uno (lo lee la web al abrir).
- salida/cat/<id>.json: el histórico en euros de cada uno (diario los 2 últimos años y semanal antes,
  hasta 10 años). La web solo baja el de lo que tienes.
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
from precios import a_euros, num, pedidas_firestore, redondeo, rentabilidad, serie_cierres, serie_por_isin, tipos_de_cambio  # noqa: E402

GESTORAS = [
    (r"^vanguard", "vanguard.com"), (r"^ishares", "ishares.com"), (r"^fidelity", "fidelity.es"), (r"^amundi|^lyxor", "amundi.com"),
    (r"^xtrackers", "dws.com"), (r"^spdr", "ssga.com"), (r"^invesco", "invesco.com"), (r"^wisdomtree", "wisdomtree.eu"),
    (r"^cobas", "cobasam.com"), (r"^azvalor", "azvalor.com"), (r"^magallanes", "magallanesvalue.com"), (r"^bestin", "bestinver.es"),
    (r"^myinvestor", "myinvestor.es"), (r"^groupama", "groupama-am.com"), (r"^vaneck", "vaneck.com"), (r"^global x", "globalxetfs.com"),
    (r"^avantis", "avantisinvestors.com"), (r"^true value", "truevalue.es"), (r"^neuberger", "nb.com"), (r"^xetra", "deutsche-boerse.com"),
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
    if re.search(r"s&p|\bus\b|u\.s\.|usa|america|nasdaq|russell|dow", n):
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
    # las de mineras de oro son acciones, no oro
    if re.search(r"miner|mining", n):
        return "Renta variable"
    if re.search(r"gold|\boro\b", n):
        return "Oro"
    # plata, platino, paladio, cobre o cestas de materias primas (los ETF de petroleras son acciones: no llevan «physical» ni son ETC)
    if re.search(r"silver|platinum|palladium|copper|commodit|brent|crude|\bwti\b|precious metal", n) and (tipo == "ETC" or re.search(r"physical|commodit|2x|3x|leveraged", n)):
        return "Materias primas"
    if re.search(r"overnight|tr[ée]sorerie|liquidity|monetari|money market|\bcash\b", n):
        return "Monetario"
    if re.search(r"bond|govt|government|aggregate|renta fija|ultrashort|duration|credit", n):
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


def corto_de(nombre):
    # sin la clase (P Acc, D Acc, AE-C, IE-C, 1C, IC, M…), que va justo antes de Acc/Dist/EUR o al final
    t = re.sub(r"\s(?:[A-Z]|[A-Z]{2}-[A-Z]|\d[A-Z]|IC|M)(?=\s+(?:Acc|Dist|EUR|FI)\b|\s*$)", " ", nombre)
    t = t.replace("(IE)", " ").replace("Hedged", "cubierto")
    t = re.sub(r"\b(Index Fund|Index|Fund|Stock|UCITS|ETF|Acc|Dist|EUR|Class|FI|Investor)\b", " ", t)
    t = re.sub(r"\s+", " ", t).strip(" -,")
    return (t[:28] if t else nombre[:28]).strip()


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


def main(ruta_cat, dir_anterior, dir_salida):
    cat = json.load(open(ruta_cat, encoding="utf-8"))
    # los fondos y ETF que alguien ha metido a mano por su ISIN y no estaban (la lista común «simbolos» de Firestore)
    try:
        hay = {(e.get("isin") or "").upper() for e in cat.get("valores", [])}
        nuevos = [x["isin"] for x in pedidas_firestore() if x["isin"] and not x["s"] and x["isin"] not in hay]
        cat["valores"] = cat.get("valores", []) + [{"isin": i, "pd": 1} for i in dict.fromkeys(nuevos)][:150]
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
            sim = e.get("s") or (prev.get(cid) or {}).get("s")
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
    generado = pd.Timestamp.now(tz="UTC").isoformat(timespec="seconds")
    with open(f"{dir_salida}/catalogo-precios.json", "w", encoding="utf-8") as f:
        # los que fallan, con el motivo (los registros de las Actions no siempre se pueden leer desde fuera)
        json.dump({"generado": generado, "v": salida, "errores": errores[:400], "dudas": dudas}, f, ensure_ascii=False, separators=(",", ":"))
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
