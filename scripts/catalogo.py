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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from precios import a_euros, buscar_simbolo, num, redondeo, rentabilidad, serie_cierres, tipos_de_cambio  # noqa: E402

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
    if re.search(r"gold|\boro\b", n):
        return "Oro"
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
    if tipo == "ETC" or (tipo == "ETF" and clase == "Oro"):
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
    prev = {}
    try:
        prev = (json.load(open(f"{dir_anterior}/catalogo-precios.json", encoding="utf-8")).get("v") or {})
    except Exception:  # noqa: BLE001
        pass
    os.makedirs(f"{dir_salida}/cat", exist_ok=True)
    fx = tipos_de_cambio()
    salida, errores = {}, []
    for e in cat.get("valores", []):
        isin = (e.get("isin") or "").upper()
        cid = ("c-" + (isin or e.get("s", "")).lower()).replace("=", "").replace("^", "")
        try:
            sim = e.get("s") or (prev.get(cid) or {}).get("s") or buscar_simbolo(isin)
            _, s, meta = serie_cierres(sim, "10y")
            moneda = meta.get("currency") or "EUR"
            s_eur = a_euros(s, moneda, fx).dropna()
            if s_eur.empty:
                raise RuntimeError("sin precios")
            nombre = e.get("n") or meta.get("longName") or meta.get("shortName") or sim
            tipo = e.get("t") or ("Cripto" if sim.endswith("-EUR") else "ETF")
            clase = clase_de(nombre, tipo)
            hoy = s_eur.index[-1]
            salida[cid] = {
                "n": nombre, "c": corto_de(nombre), "isin": isin or None, "s": sim, "t": tipo_web(tipo, nombre, clase), "cl": clase,
                "r": {"Global": 100} if clase in ("Oro", "Cripto") else region_de(nombre), "m": moneda,
                "pais": isin[:2] if isin else None, "dom": dominio_de(nombre, sim),
                "p": num(float(s_eur.iloc[-1]), 6), "pa": num(float(s_eur.iloc[-2]), 6) if len(s_eur) > 1 else None,
                "f": hoy.date().isoformat(),
                "r1a": rentabilidad(s_eur, hoy - pd.Timedelta(days=365)),
            }
            if e.get("a"):
                salida[cid]["a"] = e["a"]
            with open(f"{dir_salida}/cat/{cid}.json", "w", encoding="utf-8") as f:
                json.dump({"h": compacta(s_eur)}, f, separators=(",", ":"))
            print(f"ok   {cid:22s} {sim:16s} {salida[cid]['p']}")
        except Exception as ex:  # noqa: BLE001
            errores.append(f"{cid}: {ex}")
            if cid in prev:
                salida[cid] = prev[cid]
                try:
                    os.replace(f"{dir_anterior}/cat/{cid}.json", f"{dir_salida}/cat/{cid}.json")
                except Exception:  # noqa: BLE001
                    pass
        time.sleep(0.4)
    generado = pd.Timestamp.now(tz="UTC").isoformat(timespec="seconds")
    with open(f"{dir_salida}/catalogo-precios.json", "w", encoding="utf-8") as f:
        json.dump({"generado": generado, "v": salida}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(salida)} en el catálogo; {len(errores)} errores")
    for x in errores:
        print("  -", x)
    if not salida:
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
