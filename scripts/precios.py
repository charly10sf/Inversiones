#!/usr/bin/env python3
"""Descarga precios, histórico, analistas, noticias y mercados para la web.

Uso: python scripts/precios.py instrumentos.json anterior/ salida/

Escribe dos archivos en salida/:
- precios.json: lo que cambia durante el día (precios, analistas, noticias, mercados, ideas). Pesa poco
  porque la web lo vuelve a leer cada 2 minutos.
- historico.json: los cierres de cada instrumento (10 años) y de cada mercado (1 año). La web lo lee
  al abrirse y cuando cambia el día.
anterior/ tiene los dos archivos de la ejecución anterior (si existen).

- Todo lo de la cartera se pasa a euros con el tipo de cambio de cada día.
- El histórico llega hasta 10 años. Si un fondo es más joven que eso, se completa hacia atrás
  con un ETF que sigue el mismo índice ("proxy" en instrumentos.json), escalado al primer día
  del fondo, y se apunta hasta qué fecha es prestado.
- Si algo falla, se conservan los últimos datos buenos (de anterior.json) para que la web no se
  quede en blanco. Los instrumentos que fallan quedan con "estado": "antiguo".
- No lee ni escribe cantidades: la cartera va cifrada y este script no la toca.
"""
import datetime as dt
import email.utils
import json
import math
import re
import sys
import time
import traceback
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

import pandas as pd
import yfinance as yf

# Escala SRRI de riesgo (1-7) según la volatilidad anual en %
BANDAS_RIESGO = [0.5, 2, 5, 10, 15, 25]
ANIOS_HISTORICO = 10
ANIOS_DIARIO = 2  # más atrás, un punto por semana
HORAS_LENTO = 2   # analistas, fundamentales y noticias: como mucho cada 2 horas (no cambian tanto)

# Campos de cada instrumento que salen de consultas lentas y se reutilizan entre ejecuciones
CLAVES_LENTAS = ("nombre_largo", "sector", "industria", "analistas", "fundamentales", "per", "per_futuro",
                 "dividendo_pct", "beta", "proximos_resultados", "ex_dividendo", "estimaciones", "fondo")

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

ACCION_ANALISTA = {"up": "Sube", "down": "Baja", "init": "Empieza", "main": "Mantiene", "reit": "Reitera"}

MERCADOS = [
    ("^IBEX", "Ibex 35"), ("^STOXX50E", "Euro Stoxx 50"), ("^GDAXI", "DAX"),
    ("^GSPC", "S&P 500"), ("^NDX", "Nasdaq 100"), ("^N225", "Nikkei 225"),
    ("EURUSD=X", "Euro / dólar"), ("BZ=F", "Brent"), ("GC=F", "Oro"),
    ("BTC-EUR", "Bitcoin"), ("^TNX", "Bono EEUU 10 años"), ("^VIX", "VIX"),
]

NOTICIAS_MERCADO = ["Ibex 35 bolsa", "Wall Street bolsa", "BCE tipos de interés", "Reserva Federal tipos"]

# Lista de ideas: valores grandes que se pueden comprar en Trade Republic
RADAR = {
    "España": ["ACS.MC", "ACX.MC", "AENA.MC", "AMS.MC", "ANA.MC", "ANE.MC", "BBVA.MC", "BKT.MC", "CABK.MC", "CLNX.MC",
               "COL.MC", "ELE.MC", "ENG.MC", "FDR.MC", "FER.MC", "GRF.MC", "IAG.MC", "IBE.MC", "IDR.MC", "ITX.MC",
               "LOG.MC", "MAP.MC", "MRL.MC", "MTS.MC", "NTGY.MC", "PUIG.MC", "RED.MC", "REP.MC", "ROVI.MC", "SAB.MC",
               "SAN.MC", "SCYR.MC", "SLR.MC", "TEF.MC", "UNI.MC"],
    "Europa": ["ASML.AS", "SAP.DE", "MC.PA", "OR.PA", "RMS.PA", "SIE.DE", "ALV.DE", "TTE.PA", "AIR.PA", "SAN.PA",
               "SU.PA", "AI.PA", "BNP.PA", "DTE.DE", "MUV2.DE", "RHM.DE", "IFX.DE", "ENEL.MI", "ISP.MI", "UCG.MI",
               "RACE.MI", "INGA.AS", "ADYEN.AS", "NOVO-B.CO", "NESN.SW", "ROG.SW", "NOVN.SW", "UBSG.SW", "AZN.L",
               "SHEL.L", "HSBA.L", "ULVR.L", "RR.L", "BP.L", "GSK.L", "BATS.L"],
    "EEUU": ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "AVGO", "TSLA", "BRK-B", "JPM", "V", "MA", "LLY",
             "UNH", "XOM", "KO", "PEP", "PG", "COST", "WMT", "NFLX", "AMD", "PLTR", "ORCL", "CRM", "ADBE", "DIS",
             "MCD", "NKE", "BA", "INTC"],
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


def redondeo(x, cifras=6):
    """Redondeo a cifras significativas para el histórico (ahorra espacio)."""
    if x is None or x == 0:
        return x
    return float(f"{x:.{cifras}g}")


def serie_cierres(simbolo, periodo="max"):
    t = yf.Ticker(simbolo)
    h = t.history(period=periodo, interval="1d", auto_adjust=False)
    if h is None or h.empty:
        raise RuntimeError(f"sin histórico para {simbolo}")
    s = h["Close"].dropna()
    s = s[s > 0]
    s.index = pd.to_datetime(s.index).tz_localize(None).normalize()
    s = s[~s.index.duplicated(keep="last")]
    meta = t.history_metadata or {}
    return t, s, meta


def tipos_de_cambio():
    """Series diarias: cuántas unidades de cada moneda vale 1 EUR."""
    fx = {}
    for moneda, simbolo, periodo in (("USD", "EURUSD=X", "max"), ("GBP", "EURGBP=X", "max"),
                                     ("CHF", "EURCHF=X", "1mo"), ("DKK", "EURDKK=X", "1mo"), ("JPY", "EURJPY=X", "1mo")):
        try:
            _, s, _ = serie_cierres(simbolo, periodo)
            fx[moneda] = s
        except Exception:  # noqa: BLE001
            if moneda in ("USD", "GBP"):
                raise
            traceback.print_exc()
    return fx


def normaliza_moneda(moneda):
    if moneda in ("GBp", "GBX"):
        return "GBP", 0.01
    if moneda == "ILA":
        return "ILS", 0.01
    return moneda, 1.0


def a_euros(serie, moneda, fx):
    """Convierte una serie de precios a euros con el cambio de cada día."""
    if moneda in (None, "EUR"):
        return serie
    moneda, factor = normaliza_moneda(moneda)
    if moneda not in fx:
        raise RuntimeError(f"moneda sin tipo de cambio: {moneda}")
    cambio = fx[moneda].reindex(serie.index.union(fx[moneda].index)).ffill().bfill().reindex(serie.index)
    return serie * factor / cambio


def cambio_hoy(moneda, fx):
    """Euros por unidad de la moneda indicada, al último cambio disponible (None si no se sabe)."""
    if moneda in (None, "EUR"):
        return 1.0
    moneda, factor = normaliza_moneda(moneda)
    if moneda not in fx:
        return None
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


def info_de(t):
    try:
        return t.info or {}
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        return {}


# ---------------------------------------------------------------- cálculos sobre series

def rentabilidad(serie, desde):
    if serie.index[0] > desde + pd.Timedelta(days=7):
        return None  # la serie no llega tan atrás
    previo = serie[serie.index <= desde]
    base = float(previo.iloc[-1]) if len(previo) else float(serie.iloc[0])
    return num((float(serie.iloc[-1]) / base - 1) * 100, 2)


def anualizada(total_pct, anios):
    if total_pct is None:
        return None
    return num(((1 + total_pct / 100) ** (1 / anios) - 1) * 100, 2)


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


def caida_maxima(s):
    """Mayor caída desde un máximo previo, en % (negativo)."""
    if len(s) < 2:
        return None
    return num(float((s / s.cummax() - 1).min()) * 100, 2)


def rsi(s, n=14):
    d = s.diff().dropna()
    if len(d) < n + 1:
        return None
    sube = d.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    baja = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    if float(baja.iloc[-1]) == 0:
        return 100.0
    return num(100 - 100 / (1 + float(sube.iloc[-1]) / float(baja.iloc[-1])), 1)


def tecnico(s):
    """Medias, RSI y distancia al máximo. s: serie diaria en euros."""
    precio = float(s.iloc[-1])
    m50 = float(s.tail(50).mean()) if len(s) >= 50 else None
    m200 = float(s.tail(200).mean()) if len(s) >= 200 else None
    ultimo = s[s.index >= s.index[-1] - pd.Timedelta(days=365)]
    tendencia = None
    if m50 and m200:
        if precio > m200 and m50 > m200:
            tendencia = "alcista"
        elif precio < m200 and m50 < m200:
            tendencia = "bajista"
        else:
            tendencia = "lateral"
    return {
        "media50": num(m50, 6), "media200": num(m200, 6),
        "vs_media200": num((precio / m200 - 1) * 100, 2) if m200 else None,
        "rsi": rsi(s.tail(300)),
        "dist_max52": num((precio / float(ultimo.max()) - 1) * 100, 2),
        "caida_max_1a": caida_maxima(ultimo),
        "tendencia": tendencia,
    }


def por_anios(s):
    """Rentabilidad de cada año natural (el actual, en lo que va de año)."""
    out = {}
    cierres = s.groupby(s.index.year).last()
    anios = list(cierres.index)
    for i, a in enumerate(anios):
        if i == 0:
            primero = s[s.index.year == a]
            if primero.index[0].month > 1 or primero.index[0].day > 10:
                continue  # año incompleto: no se puede comparar
            base = float(primero.iloc[0])
        else:
            base = float(cierres.iloc[i - 1])
        out[str(a)] = num((float(cierres.iloc[i]) / base - 1) * 100, 2)
    return out


def comprimir(s, anios_diario=ANIOS_DIARIO, cifras=6):
    """Diario en los últimos años y semanal antes (viernes), para que el archivo no pese demasiado."""
    corte = s.index[-1] - pd.Timedelta(days=int(365.25 * anios_diario))
    viejo = s[s.index < corte]
    if len(viejo):
        semanal = viejo.resample("W-FRI").last().dropna()
        s = pd.concat([semanal, s[s.index >= corte]])
        s = s[~s.index.duplicated(keep="last")].sort_index()
    return [[d.date().isoformat(), redondeo(float(v), cifras)] for d, v in s.items()]


# ---------------------------------------------------------------- noticias (Google News en español)

def noticias(consulta, n=6):
    url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(consulta + " when:30d") + "&hl=es&gl=ES&ceid=ES:es"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (inversiones)"})
    raiz = ET.fromstring(urllib.request.urlopen(req, timeout=20).read())
    out, vistos = [], set()
    for it in raiz.iter("item"):
        titulo = (it.findtext("title") or "").strip()
        fuente = (it.findtext("source") or "").strip()
        if fuente and titulo.endswith(" - " + fuente):
            titulo = titulo[: -len(fuente) - 3].strip()
        clave = re.sub(r"\W+", "", titulo.lower())[:60]
        if not titulo or clave in vistos:
            continue
        vistos.add(clave)
        try:
            fecha = email.utils.parsedate_to_datetime(it.findtext("pubDate")).astimezone(dt.timezone.utc).replace(microsecond=0).isoformat()
        except Exception:  # noqa: BLE001
            fecha = None
        out.append({"t": titulo, "f": fuente, "d": fecha, "u": it.findtext("link")})
    out.sort(key=lambda x: x["d"] or "", reverse=True)
    return out[:n]


# ---------------------------------------------------------------- acciones y fondos

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
    except Exception:  # noqa: BLE001
        return None


def estimaciones(t):
    """Crecimiento del beneficio por acción que esperan los analistas este año y el que viene."""
    try:
        e = t.earnings_estimate
        if e is None or e.empty:
            return None
        out = {}
        for periodo, nombre in (("0y", "este_anio"), ("+1y", "siguiente")):
            if periodo in e.index:
                f = e.loc[periodo]
                crec = num(f.get("growth"))
                n = f.get("numberOfAnalysts")
                if crec is not None:
                    out[nombre] = {"crec": num(crec * 100, 1), "n": int(n) if n == n and n is not None else None}
        return out or None
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        return None


def ex_dividendo(t):
    try:
        f = (t.calendar or {}).get("Ex-Dividend Date")
        if isinstance(f, dt.date) and f >= dt.date.today():
            return f.isoformat()
    except Exception:  # noqa: BLE001
        pass
    return None


def proximos_resultados(t):
    try:
        cal = t.calendar or {}
        fechas = cal.get("Earnings Date") or []
        hoy = dt.date.today()
        futuras = sorted(f for f in fechas if isinstance(f, dt.date) and f >= hoy)
        return futuras[0].isoformat() if futuras else None
    except Exception:  # noqa: BLE001
        return None


def votos_analistas(t):
    """Cuántos analistas dicen comprar, mantener o vender: ahora y hace 3 meses."""
    try:
        r = t.recommendations
        if r is None or r.empty:
            return None
        filas = {str(f["period"]): f for f in r.to_dict(orient="records")}
        conv = lambda f: {k: int(f.get(k) or 0) for k in ("strongBuy", "buy", "hold", "sell", "strongSell")}  # noqa: E731
        out = {"ahora": conv(filas["0m"])} if "0m" in filas else {}
        if "-3m" in filas:
            out["hace3m"] = conv(filas["-3m"])
        return out or None
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        return None


def cambios_analistas(t, a_eur):
    """Subidas, bajadas y nuevos precios objetivo de los últimos 12 meses."""
    try:
        u = t.upgrades_downgrades
        if u is None or u.empty:
            return []
        u = u.copy()
        u.index = pd.to_datetime(u.index).tz_localize(None)
        u = u[u.index >= pd.Timestamp.now() - pd.Timedelta(days=365)].sort_index(ascending=False).head(8)
        out = []
        for fecha, f in u.iterrows():
            obj = num(f.get("currentPriceTarget"))
            prev = num(f.get("priorPriceTarget"))
            out.append({
                "fecha": fecha.date().isoformat(),
                "firma": f.get("Firm"),
                "accion": ACCION_ANALISTA.get(f.get("Action"), f.get("Action")),
                "de": f.get("FromGrade") or None,
                "a": f.get("ToGrade") or None,
                "objetivo": num(obj * a_eur, 4) if obj and a_eur else None,
                "objetivo_antes": num(prev * a_eur, 4) if prev and a_eur else None,
            })
        return out
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        return []


def datos_accion(t, info, moneda, fx, precio_local):
    """Analistas, valoración, sector y dividendo de una acción."""
    a_eur = cambio_hoy(moneda, fx) or 1.0
    obj = lambda k: num(info.get(k) * a_eur, 4) if info.get(k) is not None else None  # noqa: E731
    pct = lambda k: num(info.get(k) * 100, 2) if info.get(k) is not None else None  # noqa: E731
    rec = info.get("recommendationKey")
    return {
        "nombre_largo": info.get("longName"),
        "sector": SECTORES.get(info.get("sector"), info.get("sector")),
        "industria": info.get("industry"),
        "analistas": {
            "recomendacion": RECOMENDACION.get(rec, rec),
            "clave": rec,
            "media": num(info.get("recommendationMean"), 2),
            "num": info.get("numberOfAnalystOpinions"),
            "objetivo": obj("targetMeanPrice"),
            "objetivo_alto": obj("targetHighPrice"),
            "objetivo_bajo": obj("targetLowPrice"),
            "votos": votos_analistas(t),
            "cambios": cambios_analistas(t, a_eur),
        } if rec or info.get("targetMeanPrice") else None,
        "fundamentales": {
            "capitalizacion": num(info["marketCap"] * a_eur, 0) if info.get("marketCap") else None,
            "per": num(info.get("trailingPE"), 2),
            "per_futuro": num(info.get("forwardPE"), 2),
            "peg": num(info.get("trailingPegRatio"), 2),
            "pvc": num(info.get("priceToBook"), 2),
            "ev_ebitda": num(info.get("enterpriseToEbitda"), 2),
            "margen": pct("profitMargins"),
            "roe": pct("returnOnEquity"),
            "crec_ingresos": pct("revenueGrowth"),
            "crec_beneficio": pct("earningsGrowth"),
            "deuda_capital": num(info.get("debtToEquity"), 1),
            "payout": pct("payoutRatio"),
            "beta": num(info.get("beta"), 2),
        },
        "per": num(info.get("trailingPE"), 2),
        "per_futuro": num(info.get("forwardPE"), 2),
        "dividendo_pct": dividendo_anual_pct(t, precio_local, moneda),
        "beta": num(info.get("beta"), 2),
        "proximos_resultados": proximos_resultados(t),
        "ex_dividendo": ex_dividendo(t),
        "estimaciones": estimaciones(t),
    }


def datos_fondo(info):
    estrellas = info.get("morningStarOverallRating")
    return {
        "nombre_largo": info.get("longName"),
        "fondo": {
            "morningstar": estrellas if estrellas else None,
            "morningstar_riesgo": info.get("morningStarRiskRating") or None,
            "patrimonio": num(info.get("totalAssets"), 0),
            "per_cartera": num(info.get("trailingPE"), 2),
        },
    }


def serie_con_proxy(eur, inst, fx):
    """Completa hacia atrás con un ETF del mismo índice. Devuelve (serie, fecha hasta la que es prestada)."""
    proxy = inst.get("proxy")
    inicio_objetivo = eur.index[-1] - pd.Timedelta(days=int(365.25 * ANIOS_HISTORICO))
    if not proxy or eur.index[0] <= inicio_objetivo + pd.Timedelta(days=30):
        return eur, None
    try:
        _, ps, pmeta = serie_cierres(proxy, "max")
        p_eur = a_euros(ps, pmeta.get("currency") or "EUR", fx).dropna()
        d0 = eur.index[0]
        base = p_eur[p_eur.index <= d0]
        if base.empty:
            return eur, None
        escala = float(eur.iloc[0]) / float(base.iloc[-1])
        antes = p_eur[p_eur.index < d0] * escala
        return pd.concat([antes, eur]).sort_index(), d0.date().isoformat()
    except Exception:  # noqa: BLE001
        traceback.print_exc()
        return eur, None


def lento_al_dia(prev):
    try:
        t = dt.datetime.fromisoformat(prev["lento"])
        return dt.datetime.now(dt.timezone.utc) - t < dt.timedelta(hours=HORAS_LENTO)
    except Exception:  # noqa: BLE001
        return False


def procesar(inst, fx, prev=None):
    simbolo = inst.get("yahoo") or buscar_simbolo(inst["isin"])
    t, s, meta = serie_cierres(simbolo, "max")
    moneda = meta.get("currency") or "EUR"
    propio = a_euros(s, moneda, fx).dropna()
    if propio.empty:
        raise RuntimeError("serie en euros vacía")
    largo, proxy_hasta = serie_con_proxy(propio, inst, fx)
    hoy = propio.index[-1]
    largo = largo[largo.index >= hoy - pd.Timedelta(days=int(365.25 * ANIOS_HISTORICO))]

    un_anio = propio[propio.index >= hoy - pd.Timedelta(days=366)]
    precio = float(propio.iloc[-1])
    anterior = float(propio.iloc[-2]) if len(propio) > 1 else None
    vol = volatilidad(propio)
    r3 = rentabilidad(largo, hoy - pd.Timedelta(days=int(365.25 * 3)))
    r5 = rentabilidad(largo, hoy - pd.Timedelta(days=int(365.25 * 5)))
    r10 = rentabilidad(largo, hoy - pd.Timedelta(days=int(365.25 * 10)))

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
            "1m": rentabilidad(largo, hoy - pd.Timedelta(days=30)),
            "3m": rentabilidad(largo, hoy - pd.Timedelta(days=91)),
            "6m": rentabilidad(largo, hoy - pd.Timedelta(days=182)),
            "ytd": rentabilidad(largo, pd.Timestamp(year=hoy.year, month=1, day=1) - pd.Timedelta(days=1)),
            "1a": rentabilidad(largo, hoy - pd.Timedelta(days=365)),
            "3a": r3, "5a": r5, "10a": r10,
            "3a_anual": anualizada(r3, 3), "5a_anual": anualizada(r5, 5), "10a_anual": anualizada(r10, 10),
        },
        "anios": por_anios(largo),
        "volatilidad": vol,
        "riesgo": riesgo(vol),
        "tecnico": tecnico(propio),
        "historico": comprimir(largo),
        "historico_desde": largo.index[0].date().isoformat(),
        "proxy": inst.get("proxy") if proxy_hasta else None,
        "proxy_hasta": proxy_hasta,
        "estado": "ok",
        "actualizado": ahora(),
    }
    if prev and lento_al_dia(prev):
        out.update({k: prev[k] for k in CLAVES_LENTAS if k in prev})
        out["lento"] = prev["lento"]
        return out
    info = info_de(t)
    if inst.get("tipo") == "Acción":
        out.update(datos_accion(t, info, moneda, fx, float(s.iloc[-1])))
    elif str(inst.get("tipo", "")).startswith("Fondo"):
        out.update(datos_fondo(info))
    else:
        out["nombre_largo"] = info.get("longName")
    out["lento"] = ahora()
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


def participaciones_etf(simbolo, n=10):
    """Las mayores empresas de un ETF: sirven para ver qué hay dentro de cada fondo indexado."""
    th = yf.Ticker(simbolo).funds_data.top_holdings
    if th is None or th.empty:
        raise RuntimeError(f"sin participaciones para {simbolo}")
    out = []
    for sim, f in th.head(n).iterrows():
        w = num(f.get("Holding Percent"))
        if w:
            out.append({"s": str(sim), "n": f.get("Name"), "w": num(w * 100, 3)})
    return out


# ---------------------------------------------------------------- mercados y radar

def mercado(simbolo, nombre):
    _, s, meta = serie_cierres(simbolo, "2y")
    hoy = s.index[-1]
    anterior = float(s.iloc[-2]) if len(s) > 1 else None
    precio = float(s.iloc[-1])
    ultimo = s[s.index >= hoy - pd.Timedelta(days=366)]
    return {
        "nombre": nombre,
        "moneda": meta.get("currency") or ("EUR" if simbolo.startswith("^") and simbolo != "^GSPC" else None),
        "precio": num(precio, 6),
        "cierre_anterior": num(anterior, 6),
        "variacion_dia": num((precio / anterior - 1) * 100, 2) if anterior else None,
        "fecha": hoy.date().isoformat(),
        "rent": {
            "1m": rentabilidad(s, hoy - pd.Timedelta(days=30)),
            "ytd": rentabilidad(s, pd.Timestamp(year=hoy.year, month=1, day=1) - pd.Timedelta(days=1)),
            "1a": rentabilidad(s, hoy - pd.Timedelta(days=365)),
        },
        "historico": [[d.date().isoformat(), redondeo(float(v), 5)] for d, v in ultimo.items()],
    }


def radar(fx):
    out = []
    for zona, simbolos in RADAR.items():
        for sim in simbolos:
            try:
                info = yf.Ticker(sim).info or {}
                precio = info.get("currentPrice") or info.get("regularMarketPrice")
                if not precio:
                    continue
                moneda = info.get("currency") or "EUR"
                a_eur = cambio_hoy(moneda, fx)
                objetivo = info.get("targetMeanPrice")
                cambio_1a = info.get("52WeekChange")
                div = info.get("dividendYield")
                out.append({
                    "s": sim,
                    "n": info.get("shortName") if len(info.get("longName") or "") > 34 else (info.get("longName") or info.get("shortName") or sim),
                    "z": zona,
                    "sector": SECTORES.get(info.get("sector"), info.get("sector")),
                    "m": moneda,
                    "p": num(precio, 4),
                    "pe": num(precio * a_eur, 4) if a_eur else None,
                    "v": num(info.get("regularMarketChangePercent"), 2),
                    "r": info.get("recommendationKey"),
                    "rm": num(info.get("recommendationMean"), 2),
                    "na": info.get("numberOfAnalystOpinions"),
                    "obj": num(objetivo, 4),
                    "pot": num((objetivo / precio - 1) * 100, 1) if objetivo else None,
                    "per": num(info.get("trailingPE"), 1),
                    "perf": num(info.get("forwardPE"), 1),
                    "div": num(div, 2) if div is not None else None,
                    "c1a": num(cambio_1a * 100, 1) if cambio_1a is not None else None,
                    "cap": num(info["marketCap"] * a_eur, 0) if info.get("marketCap") and a_eur else None,
                })
            except Exception as e:  # noqa: BLE001
                print(f"radar {sim}: {e}")
            time.sleep(0.15)
    return out


# ---------------------------------------------------------------- principal

def leer_json(ruta):
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


def main(ruta_inst, dir_anterior, dir_salida):
    with open(ruta_inst, encoding="utf-8") as f:
        config = json.load(f)
    instrumentos = config["instrumentos"]
    anterior = leer_json(f"{dir_anterior}/precios.json")
    hist_anterior = leer_json(f"{dir_anterior}/historico.json")
    prev_inst = anterior.get("instrumentos", {})
    # el histórico anterior vuelve a su sitio para poder reutilizarlo si algo falla
    for iid, h in (hist_anterior.get("instrumentos") or {}).items():
        if iid in prev_inst:
            prev_inst[iid] = {**prev_inst[iid], "historico": h}
    prev_merc = anterior.get("mercados", {})
    for sim, h in (hist_anterior.get("mercados") or {}).items():
        if sim in prev_merc:
            prev_merc[sim] = {**prev_merc[sim], "historico": h}
    prev_sect = anterior.get("sectores_etf", {})
    prev_part = anterior.get("participaciones_etf", {})
    prev_not = anterior.get("noticias", {})

    errores = []
    fx = tipos_de_cambio()

    salida = {
        "version": 3,
        "generado": ahora(),
        "fx": {m: num(1 / float(s.iloc[-1]), 6) for m, s in fx.items()},
        "instrumentos": {},
        "sectores_etf": {},
        "participaciones_etf": {},
        "mercados": {},
        "noticias": {},
        "noticias_generado": None,
        "radar": None,
        "errores": errores,
    }

    for inst in instrumentos:
        iid = inst["id"]
        try:
            salida["instrumentos"][iid] = procesar(inst, fx, prev_inst.get(iid))
            print(f"ok   {iid:20s} {salida['instrumentos'][iid]['precio']} desde {salida['instrumentos'][iid]['historico_desde']}")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            errores.append(f"{iid}: {e}")
            if iid in prev_inst:
                viejo = dict(prev_inst[iid])
                viejo["estado"] = "antiguo"
                salida["instrumentos"][iid] = viejo
            print(f"FALLO {iid}: {e}")

    etfs = sorted({e for inst in instrumentos for e in (inst.get("sector_etf") or {})})
    hoy = dt.date.today().isoformat()
    for etf in etfs:
        try:
            salida["sectores_etf"][etf] = sectores_etf(etf)
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            errores.append(f"sectores {etf}: {e}")
            if etf in prev_sect:
                salida["sectores_etf"][etf] = prev_sect[etf]
        # las mayores empresas de cada ETF, una vez al día
        if (anterior.get("participaciones_fecha") == hoy) and etf in prev_part:
            salida["participaciones_etf"][etf] = prev_part[etf]
            continue
        try:
            salida["participaciones_etf"][etf] = participaciones_etf(etf)
        except Exception as e:  # noqa: BLE001
            errores.append(f"participaciones {etf}: {e}")
            if etf in prev_part:
                salida["participaciones_etf"][etf] = prev_part[etf]
    salida["participaciones_fecha"] = hoy

    for sim, nombre in MERCADOS:
        try:
            salida["mercados"][sim] = mercado(sim, nombre)
        except Exception as e:  # noqa: BLE001
            errores.append(f"mercado {sim}: {e}")
            if sim in prev_merc:
                salida["mercados"][sim] = prev_merc[sim]

    # Noticias: como mucho cada 2 horas (Google News limita si se le pregunta demasiado)
    if prev_not and hace_menos_de(anterior.get("noticias_generado") or "", HORAS_LENTO):
        salida["noticias"] = prev_not
        salida["noticias_generado"] = anterior.get("noticias_generado")
    else:
        consultas = [("mercado", q) for q in NOTICIAS_MERCADO]
        consultas += [(inst["id"], inst["noticias"]) for inst in instrumentos if inst.get("noticias")]
        for clave, q in consultas:
            try:
                salida["noticias"].setdefault(clave, []).extend(noticias(q, 8 if clave == "mercado" else 8))
            except Exception as e:  # noqa: BLE001
                errores.append(f"noticias {q}: {e}")
                if clave in prev_not and clave not in salida["noticias"]:
                    salida["noticias"][clave] = prev_not[clave]
            time.sleep(0.3)
        if "mercado" in salida["noticias"]:
            m = sorted(salida["noticias"]["mercado"], key=lambda x: x["d"] or "", reverse=True)
            vistos, unicos = set(), []
            for x in m:
                k = re.sub(r"\W+", "", x["t"].lower())[:60]
                if k not in vistos:
                    vistos.add(k)
                    unicos.append(x)
            salida["noticias"]["mercado"] = unicos[:16]
        salida["noticias_generado"] = ahora()

    # La lista de ideas se renueva una vez al día (son ~100 consultas)
    prev_radar = anterior.get("radar") or {}
    if prev_radar.get("fecha") == hoy and prev_radar.get("valores"):
        salida["radar"] = prev_radar
    else:
        try:
            valores = radar(fx)
            salida["radar"] = {"fecha": hoy, "generado": ahora(), "valores": valores} if valores else prev_radar or None
            print(f"radar: {len(valores)} valores")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            errores.append(f"radar: {e}")
            salida["radar"] = prev_radar or None

    # El histórico va aparte: pesa mucho y solo cambia una vez al día
    historico = {"generado": salida["generado"], "instrumentos": {}, "mercados": {}}
    for iid, v in salida["instrumentos"].items():
        if "historico" in v:
            historico["instrumentos"][iid] = v.pop("historico")
    for sim, v in salida["mercados"].items():
        if "historico" in v:
            historico["mercados"][sim] = v.pop("historico")
    ult = [h[-1][0] for h in historico["instrumentos"].values() if h]
    salida["historico_id"] = max(ult) if ult else None

    with open(f"{dir_salida}/precios.json", "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, separators=(",", ":"))
    with open(f"{dir_salida}/historico.json", "w", encoding="utf-8") as f:
        json.dump(historico, f, ensure_ascii=False, separators=(",", ":"))

    buenos = sum(1 for v in salida["instrumentos"].values() if v.get("estado") == "ok")
    print(f"{buenos}/{len(instrumentos)} instrumentos al día; {len(errores)} errores")
    for e in errores:
        print("  -", e)
    # Solo falla la ejecución si no ha salido nada bueno (así no se pisa el archivo anterior con basura)
    if buenos == 0:
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
