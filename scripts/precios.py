#!/usr/bin/env python3
"""Descarga precios y datos de mercado de los instrumentos de instrumentos.json.

Uso: python scripts/precios.py instrumentos.json anterior.json salida/precios.json

- Todo se pasa a euros con el tipo de cambio de cada día.
- Si un instrumento falla, se conservan sus últimos datos buenos (de anterior.json)
  y se marca con "estado": "antiguo", para que la web no se quede en blanco.
- No lee ni escribe cantidades: la cartera va cifrada y este script no la toca.
"""
import datetime as dt
import json
import math
import sys
import traceback

import pandas as pd
import yfinance as yf

# Escala SRRI de riesgo (1-7) según la volatilidad anual en %
BANDAS_RIESGO = [0.5, 2, 5, 10, 15, 25]

SECTORES = {
    "technology": "Tecnología", "Technology": "Tecnología",
    "financial_services": "Financiero", "Financial Services": "Financiero",
    "healthcare": "Salud", "Healthcare": "Salud",
    "consumer_cyclical": "Consumo cíclico", "Consumer Cyclical": "Consumo cíclico",
    "consumer_defensive": "Consumo básico", "Consumer Defensive": "Consumo básico",
    "industrials": "Industria", "Industrials": "Industria",
    "communication_services": "Comunicaciones", "Communication Services": "Comunicaciones",
    "energy": "Energía", "Energy": "Energía",
    "basic_materials": "Materiales", "Basic Materials": "Materiales",
    "realestate": "Inmobiliario", "Real Estate": "Inmobiliario",
    "utilities": "Servicios públicos", "Utilities": "Servicios públicos",
}

RECOMENDACION = {
    "strong_buy": "Compra fuerte", "buy": "Comprar", "hold": "Mantener",
    "underperform": "Infraponderar", "sell": "Vender", "strong_sell": "Venta fuerte",
    "none": None,
}


def ahora():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def num(x, nd=6):
    """Número limpio para JSON (None si no es un número finito)."""
    try:
        f = float(x)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return round(f, nd)


def redondeo(x):
    """Redondeo con 6 cifras significativas para el histórico (ahorra espacio)."""
    if x is None or x == 0:
        return x
    return float(f"{x:.6g}")


def serie_cierres(simbolo, periodo="1y"):
    t = yf.Ticker(simbolo)
    h = t.history(period=periodo, interval="1d", auto_adjust=False)
    if h is None or h.empty:
        raise RuntimeError(f"sin histórico para {simbolo}")
    s = h["Close"].dropna()
    s.index = pd.to_datetime(s.index).tz_localize(None).normalize()
    s = s[~s.index.duplicated(keep="last")]
    meta = t.history_metadata or {}
    return t, s, meta


def tipos_de_cambio():
    """Series diarias: cuántos USD y GBP vale 1 EUR."""
    fx = {}
    for moneda, simbolo in (("USD", "EURUSD=X"), ("GBP", "EURGBP=X")):
        _, s, _ = serie_cierres(simbolo, "2y")
        fx[moneda] = s
    return fx


def a_euros(serie, moneda, fx):
    """Convierte una serie de precios a euros con el cambio de cada día."""
    if moneda in (None, "EUR"):
        return serie
    factor = 1.0
    if moneda in ("GBp", "GBX"):
        moneda, factor = "GBP", 0.01
    if moneda not in fx:
        raise RuntimeError(f"moneda sin tipo de cambio: {moneda}")
    cambio = fx[moneda].reindex(serie.index.union(fx[moneda].index)).ffill().bfill().reindex(serie.index)
    return serie * factor / cambio


def cambio_hoy(moneda, fx):
    """Euros por unidad de la moneda indicada, al último cambio disponible."""
    if moneda in (None, "EUR"):
        return 1.0
    factor = 1.0
    if moneda in ("GBp", "GBX"):
        moneda, factor = "GBP", 0.01
    return factor / float(fx[moneda].iloc[-1])


def buscar_simbolo(isin):
    res = yf.Search(isin, max_results=5, news_count=0, lists_count=0, raise_errors=False)
    for q in res.quotes or []:
        if q.get("symbol"):
            return q["symbol"]
    raise RuntimeError(f"no encuentro símbolo para {isin}")


def hora_iso(valor):
    """yfinance devuelve la hora del último precio como número o como Timestamp según la versión."""
    if valor is None:
        return None
    try:
        if isinstance(valor, (int, float)):
            return dt.datetime.fromtimestamp(valor, dt.timezone.utc).isoformat()
        t = pd.Timestamp(valor)
        if t.tzinfo is None:
            t = t.tz_localize("UTC")
        return t.tz_convert("UTC").isoformat()
    except Exception:  # noqa: BLE001
        return None


def rentabilidad(serie, desde):
    s = serie[serie.index >= desde]
    if len(s) < 2:
        return None
    previo = serie[serie.index < desde]
    base = float(previo.iloc[-1]) if len(previo) else float(s.iloc[0])
    return num((float(serie.iloc[-1]) / base - 1) * 100, 2)


def volatilidad(serie_eur):
    """Volatilidad anual (%) con los rendimientos diarios del último año."""
    s = serie_eur[serie_eur.index >= serie_eur.index[-1] - pd.Timedelta(days=365)]
    r = (s / s.shift(1)).dropna()
    r = r[r > 0].apply(math.log)
    if len(r) < 20:
        return None
    dias = (s.index[-1] - s.index[0]).days or 365
    obs_por_anio = len(r) * 365 / dias
    return num(float(r.std()) * math.sqrt(obs_por_anio) * 100, 2)


def riesgo(vol):
    if vol is None:
        return None
    return 1 + sum(vol >= b for b in BANDAS_RIESGO)


def dividendo_anual_pct(t, precio_moneda_local, moneda_local):
    try:
        d = t.dividends
        if d is None or d.empty or not precio_moneda_local:
            return 0.0
        d.index = pd.to_datetime(d.index).tz_localize(None)
        ultimo_anio = d[d.index >= pd.Timestamp.now() - pd.Timedelta(days=365)]
        pct = float(ultimo_anio.sum()) / precio_moneda_local * 100
        # En Londres el precio va en peniques; si el dividendo viene en libras, sale 100 veces menor
        if moneda_local in ("GBp", "GBX") and 0 < pct < 0.5:
            pct *= 100
        return num(pct, 2)
    except Exception:
        return None


def proximos_resultados(t):
    try:
        cal = t.calendar or {}
        fechas = cal.get("Earnings Date") or []
        hoy = dt.date.today()
        futuras = sorted(f for f in fechas if isinstance(f, dt.date) and f >= hoy)
        return futuras[0].isoformat() if futuras else None
    except Exception:
        return None


def datos_accion(t, moneda, fx, precio_local):
    """Analistas, valoración, sector y dividendo de una acción."""
    info = {}
    try:
        info = t.info or {}
    except Exception:
        traceback.print_exc()
    a_eur = cambio_hoy(moneda, fx)
    obj = lambda k: num(info.get(k) * a_eur, 4) if info.get(k) is not None else None  # noqa: E731
    rec = info.get("recommendationKey")
    return {
        "sector": SECTORES.get(info.get("sector"), info.get("sector")),
        "industria": info.get("industry"),
        "analistas": {
            "recomendacion": RECOMENDACION.get(rec, rec),
            "media": num(info.get("recommendationMean"), 2),
            "num": info.get("numberOfAnalystOpinions"),
            "objetivo": obj("targetMeanPrice"),
            "objetivo_alto": obj("targetHighPrice"),
            "objetivo_bajo": obj("targetLowPrice"),
        } if rec or info.get("targetMeanPrice") else None,
        "per": num(info.get("trailingPE"), 2),
        "per_futuro": num(info.get("forwardPE"), 2),
        "dividendo_pct": dividendo_anual_pct(t, precio_local, moneda),
        "beta": num(info.get("beta"), 2),
        "proximos_resultados": proximos_resultados(t),
    }


def procesar(inst, fx):
    simbolo = inst.get("yahoo") or buscar_simbolo(inst["isin"])
    t, s, meta = serie_cierres(simbolo, "2y")
    moneda = meta.get("currency") or "EUR"
    eur = a_euros(s, moneda, fx).dropna()
    if eur.empty:
        raise RuntimeError("serie en euros vacía")

    hoy = eur.index[-1]
    un_anio = eur[eur.index >= hoy - pd.Timedelta(days=366)]
    precio = float(eur.iloc[-1])
    anterior = float(eur.iloc[-2]) if len(eur) > 1 else None
    vol = volatilidad(eur)

    out = {
        "simbolo": simbolo,
        "moneda": moneda,
        "precio": num(precio, 6),
        "precio_local": num(float(s.iloc[-1]), 6),
        "cierre_anterior": num(anterior, 6),
        "variacion_dia": num((precio / anterior - 1) * 100, 2) if anterior else None,
        "fecha": hoy.date().isoformat(),
        "hora_mercado": hora_iso(meta.get("regularMarketTime")),
        "max52": num(float(un_anio.max()), 6),
        "min52": num(float(un_anio.min()), 6),
        "rent": {
            "1m": rentabilidad(eur, hoy - pd.Timedelta(days=30)),
            "3m": rentabilidad(eur, hoy - pd.Timedelta(days=91)),
            "ytd": rentabilidad(eur, pd.Timestamp(year=hoy.year, month=1, day=1)),
            "1a": rentabilidad(eur, hoy - pd.Timedelta(days=365)),
        },
        "volatilidad": vol,
        "riesgo": riesgo(vol),
        "historico": [[d.date().isoformat(), redondeo(float(v))] for d, v in un_anio.items()],
        "estado": "ok",
        "actualizado": ahora(),
    }
    if inst.get("tipo") == "Acción":
        out.update(datos_accion(t, moneda, fx, float(s.iloc[-1])))
    return out


def sectores_etf(simbolo):
    pesos = yf.Ticker(simbolo).funds_data.sector_weightings or {}
    res = {}
    for clave, valor in pesos.items():
        if isinstance(valor, dict):
            valor = valor.get("raw")
        v = num(valor)
        if v:
            nombre = SECTORES.get(clave, clave)
            res[nombre] = round(res.get(nombre, 0) + v * 100, 2)
    if not res:
        raise RuntimeError(f"sin sectores para {simbolo}")
    return res


def main(ruta_inst, ruta_anterior, ruta_salida):
    with open(ruta_inst, encoding="utf-8") as f:
        instrumentos = json.load(f)["instrumentos"]
    try:
        with open(ruta_anterior, encoding="utf-8") as f:
            anterior = json.load(f)
    except Exception:
        anterior = {}
    prev_inst = anterior.get("instrumentos", {})
    prev_sect = anterior.get("sectores_etf", {})

    errores = []
    fx = tipos_de_cambio()

    salida = {
        "generado": ahora(),
        "fx": {"USD": num(1 / float(fx["USD"].iloc[-1]), 6), "GBP": num(1 / float(fx["GBP"].iloc[-1]), 6)},
        "instrumentos": {},
        "sectores_etf": {},
        "errores": errores,
    }

    for inst in instrumentos:
        iid = inst["id"]
        try:
            salida["instrumentos"][iid] = procesar(inst, fx)
            print(f"ok   {iid:20s} {salida['instrumentos'][iid]['precio']}")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            errores.append(f"{iid}: {e}")
            if iid in prev_inst:
                viejo = dict(prev_inst[iid])
                viejo["estado"] = "antiguo"
                salida["instrumentos"][iid] = viejo
            print(f"FALLO {iid}: {e}")

    etfs = sorted({e for inst in instrumentos for e in (inst.get("sector_etf") or {})})
    for etf in etfs:
        try:
            salida["sectores_etf"][etf] = sectores_etf(etf)
            print(f"ok   sectores {etf}")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            errores.append(f"sectores {etf}: {e}")
            if etf in prev_sect:
                salida["sectores_etf"][etf] = prev_sect[etf]

    with open(ruta_salida, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))

    buenos = sum(1 for v in salida["instrumentos"].values() if v.get("estado") == "ok")
    print(f"{buenos}/{len(instrumentos)} instrumentos al día; {len(errores)} errores")
    # Solo falla la ejecución si no ha salido nada bueno (así no se pisa el archivo anterior con basura)
    if buenos == 0:
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
