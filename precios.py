#!/usr/bin/env python3
"""Descarga precios, histórico, analistas, noticias y mercados para la web.

Uso: python scripts/precios.py instrumentos.json anterior/ salida/

Escribe tres archivos en salida/:
- precios.json: lo que cambia durante el día (precios, analistas, noticias y mercados). Pesa poco
  porque la web lo vuelve a leer cada 2 minutos.
- radar.json: las empresas en las que buscar ideas, con analistas, valoración y tendencia. Son unas
  400 fijas (Ibex, continuo, grandes de Europa y EEUU) más las que el buscador de Yahoo encuentra
  cada día en toda la bolsa de EEUU y Europa con recomendación de compra. La ficha se renueva cada
  3 horas y los precios en cada ejecución.
- historico.json: los cierres de cada instrumento (10 años) y de cada mercado (1 año). La web lo lee
  al abrirse y cuando cambia el día.
anterior/ tiene los archivos de la ejecución anterior (si existen).

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
                 "dividendo_pct", "beta", "proximos_resultados", "ex_dividendo", "estimaciones", "fondo",
                 "dividendos_pagos")

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

# (símbolo, nombre, grupo). Los grupos ordenan la pestaña Mercados y lo que lee Gemini por regiones.
MERCADOS = [
    ("^IBEX", "Ibex 35", "Europa"), ("^STOXX50E", "Euro Stoxx 50", "Europa"), ("^GDAXI", "DAX", "Europa"),
    ("^FCHI", "CAC 40", "Europa"), ("^FTSE", "FTSE 100", "Europa"),
    ("^GSPC", "S&P 500", "EEUU"), ("^NDX", "Nasdaq 100", "EEUU"), ("^RUT", "Russell 2000", "EEUU"),
    ("^N225", "Nikkei 225", "Asia y emergentes"), ("^HSI", "Hang Seng", "Asia y emergentes"),
    ("000001.SS", "Shanghái", "Asia y emergentes"), ("^NSEI", "Nifty 50 (India)", "Asia y emergentes"),
    ("^BVSP", "Bovespa (Brasil)", "Asia y emergentes"),
    ("^TNX", "Bono EEUU 10 años", "Tipos y riesgo"), ("^IRX", "Letra EEUU 3 meses", "Tipos y riesgo"), ("^VIX", "VIX", "Tipos y riesgo"),
    ("EURUSD=X", "Euro / dólar", "Divisas"), ("EURGBP=X", "Euro / libra", "Divisas"), ("JPY=X", "Dólar / yen", "Divisas"),
    ("DX-Y.NYB", "Índice dólar", "Divisas"),
    ("BZ=F", "Brent", "Materias primas"), ("GC=F", "Oro", "Materias primas"), ("SI=F", "Plata", "Materias primas"),
    ("HG=F", "Cobre", "Materias primas"),
    ("NG=F", "Gas natural", "Materias primas"),
    ("BTC-EUR", "Bitcoin", "Cripto"),
]

# 0.4: el mapa del mundo de Mercados. Las bolsas de cada país que no están ya en MERCADOS (esas se reutilizan).
# (país, símbolos a probar en orden, nombre[, ETF para el mes y el año]). Sin histórico: solo hoy, el mes y el año.
# Oriente Medio (23 oct): Yahoo ya no da el histórico de sus índices, solo el último cierre y el anterior; «hoy» sale de
# ahí y el mes y el año, del ETF de iShares de ese país (en dólares, a los que esas monedas van atadas). Argentina y Turquía no
# están a propósito: con su inflación, su bolsa en moneda local sale siempre en verde y el color engañaría.
MAPA = [
    ("CA", ["^GSPTSE"], "S&P/TSX"), ("MX", ["^MXX"], "IPC"), ("CL", ["^IPSA"], "IPSA"),
    ("IT", ["FTSEMIB.MI"], "FTSE MIB"), ("NL", ["^AEX"], "AEX"), ("CH", ["^SSMI"], "SMI"),
    ("SE", ["^OMX"], "OMX Estocolmo 30"), ("BE", ["^BFX"], "BEL 20"), ("PT", ["PSI20.LS"], "PSI"),
    ("AT", ["^ATX"], "ATX"), ("DK", ["^OMXC25", "^OMXC20"], "OMX Copenhague 25"), ("IE", ["^ISEQ"], "ISEQ"),
    ("NO", ["OBX.OL"], "OBX"), ("FI", ["^OMXH25"], "OMX Helsinki 25"), ("PL", ["WIG20.WA"], "WIG20"),
    ("GR", ["GD.AT"], "Bolsa de Atenas"), ("KR", ["^KS11"], "KOSPI"), ("TW", ["^TWII"], "Taiex"),
    ("AU", ["^AXJO"], "ASX 200"), ("NZ", ["^NZ50"], "NZX 50"), ("SG", ["^STI"], "Straits Times"),
    ("ID", ["^JKSE"], "Yakarta"), ("MY", ["^KLSE"], "KLCI"), ("TH", ["^SET.BK"], "SET"),
    ("PH", ["PSEI.PS"], "PSEi"), ("IL", ["TA35.TA"], "TA-35"), ("SA", ["^TASI.SR"], "Tadawul", "KSA"),
    ("ZA", ["^J203.JO", "STX40.JO"], "Top 40 (Johannesburgo)"), ("EG", ["^CASE30"], "EGX 30"),
    ("AE", ["DFMGI.AE"], "DFM (Dubái)", "UAE"), ("QA", ["^GNRI.QA"], "QE Index", "QAT"), ("KW", ["^BKM50.KW"], "Boursa Kuwait 50", "KWT"),
]

# aparte de Mercados: solo para la cuenta atrás de GTA VI de la web (Take-Two es la dueña de Rockstar)
EXTRA = [("TTWO", "Take-Two Interactive")]

# titulares de mercado por zonas, para que la IA vea el mundo entero y no solo España y Wall Street
NOTICIAS_MERCADO = [
    ("España", "Ibex 35 bolsa"), ("EEUU", "Wall Street bolsa"), ("Europa", "bolsas europeas Euro Stoxx DAX"),
    ("Tipos", "BCE tipos de interés"), ("Tipos", "Reserva Federal tipos"), ("Tipos", "inflación IPC zona euro Estados Unidos"),
    ("Tipos", "bonos rentabilidad bono 10 años"), ("Asia", "bolsas asiáticas China Japón"),
    ("Emergentes", "mercados emergentes bolsa India Brasil"), ("Materias primas", "petróleo Brent OPEP"),
    ("Materias primas", "oro precio onza"), ("Divisas", "dólar euro divisas"), ("Cripto", "bitcoin criptomonedas mercado"),
]

# Noticias de cada comunidad autónoma, solo las que tocan el dinero de quien vive allí: impuestos, ayudas, vivienda.
# El titular tiene que nombrar la comunidad (o su gobierno) y hablar de dinero. Cada 6 horas, en noticias["_region"].
HORAS_REGION = 6
TEMAS_DINERO = "impuestos OR IRPF OR deducción OR bonificación OR ayudas OR vivienda OR alquiler OR hipoteca OR sucesiones OR donaciones"
RE_DINERO = r"impuest|IRPF|tribut|deducci|bonific|rebaja fiscal|rebaja de impuestos|ayudas?\b|subvenci|cheque|\bbono\b|hipotec|avales?\b|sucesiones|donaci|declaraci[oó]n de la renta"
# fuera la política, las protestas y los despachos aunque hablen de vivienda o de dinero público
RE_FUERA = r"acampada|manifestaci|protesta|despacho|pol[eé]mic|oposici[oó]n|\bPSOE\b|\bPP\b|\bVox\b|Podemos|Sumar|juicio|imputad|tribunal|elecciones|encuesta|Asamblea"
COMUNIDADES_NOTICIAS = [
    ("andalucia", "Andalucía", r"Andaluc|Junta de Andaluc|Moreno Bonilla"),
    ("aragon", "Aragón", r"Arag[oó]n|Azc[oó]n"),
    ("asturias", "Asturias", r"Asturi|Principado"),
    ("baleares", "Baleares", r"Balear|Mallorca|Govern balear"),
    ("canarias", "Canarias", r"Canari"),
    ("cantabria", "Cantabria", r"Cantabr"),
    ("clm", '"Castilla-La Mancha"', r"Castilla-La Mancha|Castilla La Mancha|Page\b|Junta de Comunidades"),
    ("cyl", '"Castilla y León"', r"Castilla y Le[oó]n|Ma[nñ]ueco"),
    ("cataluna", "Cataluña OR Generalitat", r"Catalu|Generalitat|Catalunya"),
    ("ceuta", "Ceuta", r"Ceuta"),
    ("valencia", '"Comunitat Valenciana" OR Generalitat Valenciana', r"Valencian|Comunitat|Generalitat"),
    ("extremadura", "Extremadura", r"Extremadura|extreme[nñ]"),
    ("galicia", "Galicia OR Xunta", r"Galicia|Xunta|galleg"),
    ("madrid", '"Comunidad de Madrid"', r"Comunidad de Madrid|Ayuso|madrile[nñ]"),
    ("melilla", "Melilla", r"Melilla"),
    ("murcia", '"Región de Murcia"', r"Murcia|L[oó]pez Miras"),
    ("navarra", "Navarra", r"Navarr|Chivite"),
    ("paisvasco", "Euskadi OR Bizkaia OR Gipuzkoa OR Álava", r"Euskadi|Pa[ií]s Vasco|Bizkaia|Gipuzkoa|[AÁ]lava|vasc|Diputaci[oó]n Foral"),
    ("rioja", '"La Rioja"', r"Rioja|riojan"),
]


def noticias_region(prev):
    """Las noticias de dinero de cada comunidad (como mucho 4 por comunidad, de los últimos 7 días)."""
    reg, errores = {}, []
    for cid, q, zona in COMUNIDADES_NOTICIAS:
        try:
            reg[cid] = noticias(f"({q}) ({TEMAS_DINERO})", 4, f"(?!.*(?:{RE_FUERA}))(?=.*(?:{zona}))(?=.*(?:{RE_DINERO}))", "7d")
        except Exception as e:  # noqa: BLE001
            errores.append(f"noticias de {cid}: {e}")
            if cid in prev:
                reg[cid] = prev[cid]
        time.sleep(0.4)
    return reg, errores


# Lista de ideas: unas 380 empresas que se pueden comprar en Trade Republic. Ibex 35 y buena parte
# del mercado continuo, las grandes de Europa (Euro Stoxx 50, DAX, CAC 40, Italia, Países Bajos,
# Suiza, nórdicos y Londres) y las grandes de EEUU. Si un símbolo deja de existir, se salta solo.
RADAR = {
    "España": [
        # Ibex 35
        "ACS.MC", "ACX.MC", "AENA.MC", "AMS.MC", "ANA.MC", "ANE.MC", "BBVA.MC", "BKT.MC", "CABK.MC", "CLNX.MC",
        "COL.MC", "ELE.MC", "ENG.MC", "FDR.MC", "FER.MC", "GRF.MC", "IAG.MC", "IBE.MC", "IDR.MC", "ITX.MC",
        "LOG.MC", "MAP.MC", "MRL.MC", "MTS.MC", "NTGY.MC", "PUIG.MC", "RED.MC", "REP.MC", "ROVI.MC", "SAB.MC",
        "SAN.MC", "SCYR.MC", "SLR.MC", "TEF.MC", "UNI.MC",
        # mercado continuo
        "ALM.MC", "CIE.MC", "VIS.MC", "VID.MC", "EBRO.MC", "FAE.MC", "PSG.MC", "CASH.MC", "A3M.MC", "GEST.MC",
        "PHM.MC", "MVC.MC", "DOM.MC", "ENC.MC", "TRE.MC", "GRE.MC", "ADX.MC", "OHLA.MC", "LDA.MC",
        "R4.MC", "MCM.MC", "TLGO.MC", "TUB.MC", "ENO.MC", "CAF.MC", "ECR.MC", "EDR.MC", "MEL.MC",
        "DIA.MC", "GSJ.MC", "PRS.MC", "AMP.MC", "SQRL.MC", "NXT.MC", "LGT.MC", "HBX.MC", "CIRSA.MC", "ATRY.MC",
    ],
    "Europa": [
        # Euro Stoxx 50
        "ASML.AS", "SAP.DE", "MC.PA", "OR.PA", "RMS.PA", "SIE.DE", "ALV.DE", "TTE.PA", "AIR.PA", "SAN.PA",
        "SU.PA", "AI.PA", "BNP.PA", "DTE.DE", "MUV2.DE", "RHM.DE", "IFX.DE", "ENEL.MI", "ISP.MI", "UCG.MI",
        "RACE.MI", "INGA.AS", "ADYEN.AS", "ADS.DE", "AD.AS", "ABI.BR", "ARGX.BR", "CS.PA", "BAS.DE", "BAYN.DE",
        "BMW.DE", "DB1.DE", "DBK.DE", "DHL.DE", "ENI.MI", "EL.PA", "MBG.DE", "NOKIA.HE", "PRX.AS", "SAF.PA",
        "STLAM.MI", "VOW3.DE", "DG.PA", "WKL.AS", "ENR.DE",
        # DAX
        "BEI.DE", "CBK.DE", "CON.DE", "DTG.DE", "EOAN.DE", "FRE.DE", "HEI.DE", "HNR1.DE", "HEN3.DE", "MRK.DE",
        "MTX.DE", "P911.DE", "PAH3.DE", "QIA.DE", "RWE.DE", "SHL.DE", "SY1.DE", "VNA.DE", "ZAL.DE", "BNR.DE",
        "G1A.DE",
        # CAC 40
        "ACA.PA", "BN.PA", "CA.PA", "CAP.PA", "DSY.PA", "ENGI.PA", "GLE.PA", "HO.PA", "KER.PA", "LR.PA",
        "ML.PA", "ORA.PA", "PUB.PA", "RI.PA", "SGO.PA", "STMPA.PA", "VIE.PA", "EN.PA", "RNO.PA", "AM.PA",
        "ERF.PA", "TEP.PA", "URW.PA", "VIV.PA",
        # Italia
        "G.MI", "PST.MI", "LDO.MI", "PRY.MI", "SRG.MI", "TRN.MI", "MB.MI", "BAMI.MI", "MONC.MI", "CPR.MI",
        "FBK.MI", "BMED.MI", "TIT.MI",
        # Países Bajos y Bélgica
        "HEIA.AS", "PHIA.AS", "ASM.AS", "BESI.AS", "NN.AS", "ABN.AS", "KPN.AS", "UMG.AS", "KBC.BR", "UCB.BR",
        # nórdicos
        "NOVO-B.CO", "DSV.CO", "VWS.CO", "MAERSK-B.CO", "CARL-B.CO", "ATCO-A.ST", "VOLV-B.ST", "ERIC-B.ST",
        "INVE-B.ST", "SAND.ST", "NDA-FI.HE", "EQNR.OL", "DNB.OL", "NHY.OL",
        # Suiza
        "NESN.SW", "RO.SW", "NOVN.SW", "UBSG.SW", "ABBN.SW", "ZURN.SW", "CFR.SW", "LONN.SW", "SIKA.SW",
        "GIVN.SW", "ALC.SW", "HOLN.SW", "SREN.SW", "PGHN.SW", "LOGN.SW",
        # Londres
        "AZN.L", "SHEL.L", "HSBA.L", "ULVR.L", "RR.L", "BP.L", "GSK.L", "BATS.L", "RIO.L", "GLEN.L",
        "LSEG.L", "DGE.L", "REL.L", "BARC.L", "LLOY.L", "NWG.L", "BA.L", "NG.L", "VOD.L", "TSCO.L",
        "PRU.L", "AAL.L", "IMB.L", "CPG.L", "EXPN.L", "STAN.L", "LGEN.L", "AV.L", "III.L", "HLN.L",
        "SSE.L", "BT-A.L", "RKT.L",
    ],
    "EEUU": [
        "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "AVGO", "TSLA", "BRK-B", "JPM", "V", "MA", "LLY",
        "UNH", "XOM", "KO", "PEP", "PG", "COST", "WMT", "NFLX", "AMD", "PLTR", "ORCL", "CRM", "ADBE", "DIS",
        "MCD", "NKE", "BA", "INTC", "JNJ", "ABBV", "MRK", "PFE", "TMO", "ABT", "DHR", "AMGN", "GILD", "ISRG",
        "BMY", "CVS", "MDT", "SYK", "VRTX", "REGN", "ZTS", "HD", "LOW", "TGT", "SBUX", "BKNG", "ABNB", "UBER",
        "CMG", "TJX", "MAR", "BAC", "WFC", "C", "GS", "MS", "SCHW", "BLK", "AXP", "PYPL", "SPGI", "CB", "PGR",
        "CVX", "COP", "SLB", "OXY", "EOG", "LIN", "CAT", "DE", "GE", "HON", "RTX", "LMT", "NOC", "GD",
        "UNP", "UPS", "FDX", "MMM", "ETN", "PH", "CSCO", "QCOM", "TXN", "AMAT", "LRCX", "KLAC", "MU", "MRVL",
        "ADI", "NOW", "INTU", "SNOW", "PANW", "CRWD", "FTNT", "ANET", "SHOP", "IBM", "ACN", "T", "VZ", "TMUS",
        "CMCSA", "NEE", "DUK", "SO", "PLD", "AMT", "EQIX", "O", "SPOT", "MELI", "TSM", "BABA", "PDD", "NU",
        "COIN", "HOOD", "DELL", "APP", "CEG", "VST", "GEV", "WM", "ICE", "CME", "KKR", "BX", "APO", "MO", "PM",
        "CL", "MDLZ", "KHC", "HSY", "LULU", "F", "GM", "RIVN",
    ],
}
HORAS_RADAR = 3   # analistas y cuentas del radar: cada 3 horas; los precios, en cada ejecución
HILOS_RADAR = 6

# Además de la lista fija, una vez al día se recorre toda la bolsa de EEUU y de Europa con el buscador
# de Yahoo Finance: entran las empresas medianas y grandes que los analistas recomiendan comprar y que
# no estaban ya. Así ninguna idea buena se queda fuera por no estar en la lista.
# región de Yahoo: (zona de la web, sufijo y código de su bolsa principal, capitalización mínima en
# euros, páginas de 250). Xetra, Londres y Zúrich también cotizan muchas empresas extranjeras grandes,
# así que allí hay que bajar más páginas para llegar a las medianas de casa.
DESCUBRIR = {
    "us": ("EEUU", "", None, 4e9, 5),
    "es": ("España", ".MC", "MCE", 3e8, 1),
    "gb": ("Europa", ".L", "LSE", 2e9, 4),
    "de": ("Europa", ".DE", "GER", 1.5e9, 7),
    "fr": ("Europa", ".PA", "PAR", 1.5e9, 2),
    "it": ("Europa", ".MI", "MIL", 1.5e9, 2),
    "nl": ("Europa", ".AS", "AMS", 1.5e9, 1),
    "be": ("Europa", ".BR", "BRU", 1.5e9, 1),
    "ch": ("Europa", ".SW", "EBS", 2e9, 3),
    "se": ("Europa", ".ST", "STO", 2e9, 2),
    "dk": ("Europa", ".CO", "CPH", 2e9, 1),
    "no": ("Europa", ".OL", "OSL", 2e9, 1),
    "fi": ("Europa", ".HE", "HEL", 1.5e9, 1),
    "pt": ("Europa", ".LS", "LIS", 1e9, 1),
    "at": ("Europa", ".VI", "VIE", 1.5e9, 1),
    "ie": ("Europa", ".IR", "ISE", 1.5e9, 1),
}
NOTA_MAX_DESCUBRIR = 2.3   # nota media de los analistas (1 compra fuerte, 5 venta fuerte)
MAX_DESCUBIERTAS = 550
HORAS_DESCUBRIR = 20
BOLSAS_US = {"NMS", "NYQ", "NGM", "NCM", "ASE", "BTS", "PCX"}


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
    return t, al_dia(s, meta), meta


def al_dia(s, meta):
    """Con el histórico «max», Yahoo a veces aún no trae la vela del último día (de madrugada salía el cierre de
    anteayer: IAG a 4,886 € del 19 cuando el 20 cerró a 4,94). Su último precio y su hora sí vienen en los
    metadatos: si son de un día posterior al último del histórico, se añade; si son del mismo día, se pone al día."""
    try:
        p, ts = meta.get("regularMarketPrice"), meta.get("regularMarketTime")
        if not p or p <= 0 or not ts or s.empty:
            return s
        tz = meta.get("exchangeTimezoneName") or "UTC"
        # según la versión de yfinance llega como número (segundos) o ya como fecha
        cuando = pd.Timestamp(ts, unit="s", tz="UTC") if isinstance(ts, (int, float)) else pd.Timestamp(ts)
        if cuando.tzinfo is None:
            cuando = cuando.tz_localize("UTC")
        cuando = cuando.tz_convert(tz)
        if pd.Timestamp.now(tz=tz) - cuando > pd.Timedelta(days=6):
            return s
        dia = pd.Timestamp(cuando.date())
        ultimo = s.index[-1]
        salto = abs(float(p) / float(s.iloc[-1]) - 1)
        if (dia > ultimo and salto < 0.5) or (dia == ultimo and salto < 0.2):
            s = s.copy()
            s.loc[dia] = float(p)
            s = s.sort_index()
    except Exception:  # noqa: BLE001
        traceback.print_exc()
    return s


def intradia(instrumentos, salida):
    """Precios cada 30 minutos de los últimos 5 días, en euros, para la gráfica de 1 día y 1 semana.
    Los fondos no cotizan durante el día: la web usa su valor liquidativo diario."""
    fx = {}
    for moneda, sim in (("USD", "EURUSD=X"), ("GBP", "EURGBP=X")):
        try:
            h = yf.Ticker(sim).history(period="5d", interval="30m")["Close"].dropna()
            h.index = pd.to_datetime(h.index).tz_convert("UTC")
            fx[moneda] = h
        except Exception:  # noqa: BLE001
            traceback.print_exc()
    out = {}
    for inst in instrumentos:
        iid = inst["id"]
        v = salida["instrumentos"].get(iid) or {}
        sim = v.get("simbolo") or inst.get("yahoo")
        if not sim or str(inst.get("tipo", "")).startswith("Fondo") or sim.startswith("0P"):
            continue
        try:
            h = yf.Ticker(sim).history(period="5d", interval="30m")["Close"].dropna()
            if h.empty:
                continue
            h.index = pd.to_datetime(h.index).tz_convert("UTC")
            moneda, factor = normaliza_moneda(v.get("moneda") or "EUR")
            h = h * factor
            if moneda != "EUR":
                if moneda not in fx:
                    continue
                cambio = fx[moneda].reindex(h.index.union(fx[moneda].index)).ffill().bfill().reindex(h.index)
                h = h / cambio
            out[iid] = [[t.strftime("%Y-%m-%dT%H:%MZ"), redondeo(float(p), 6)] for t, p in h.items() if p == p]
        except Exception as e:  # noqa: BLE001
            print(f"intradía {iid}: {e}")
        time.sleep(0.2)
    return out


def tipos_de_cambio():
    """Series diarias: cuántas unidades de cada moneda vale 1 EUR."""
    fx = {}
    for moneda, simbolo, periodo in (("USD", "EURUSD=X", "max"), ("GBP", "EURGBP=X", "max"),
                                     ("CHF", "EURCHF=X", "1mo"), ("DKK", "EURDKK=X", "1mo"), ("JPY", "EURJPY=X", "1mo"),
                                     ("SEK", "EURSEK=X", "1mo"), ("NOK", "EURNOK=X", "1mo")):
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


def candidatos_simbolo(isin):
    """Todos los símbolos de Yahoo para un ISIN, primero los que suelen tener histórico: el del fondo
    (0P…), luego las bolsas grandes en euros y al final las regionales alemanas (.SG, .MU…), que a
    menudo solo dan el último precio."""
    try:
        res = yf.Search(isin, max_results=10, news_count=0, lists_count=0, raise_errors=False)
        quotes = res.quotes or []
    except Exception:  # noqa: BLE001
        quotes = []
    vistos = []
    for q in quotes:
        sim = q.get("symbol")
        if sim and sim not in vistos:
            vistos.append(sim)

    def orden(sim):
        if sim.startswith("0P"):
            return 0
        if sim.endswith((".DE", ".AS", ".PA", ".MI", ".MC")):
            return 1
        if sim.endswith((".F", ".SW", ".L", ".VI", ".BR", ".LS", ".IR")):
            return 2
        if "." not in sim:
            return 3
        return 4
    return sorted(vistos, key=orden)


def buscar_simbolo(isin):
    c = candidatos_simbolo(isin)
    if not c:
        raise RuntimeError(f"no encuentro símbolo para {isin}")
    return c[0]


def serie_por_isin(isin, periodo="max"):
    """El primer símbolo del ISIN que tenga histórico de verdad (al menos 20 cierres)."""
    fallos = []
    for sim in candidatos_simbolo(isin)[:8]:
        try:
            t, s, meta = serie_cierres(sim, periodo)
            if len(s) >= 20:
                return sim, t, s, meta
            fallos.append(f"{sim}: {len(s)} cierres")
        except Exception as ex:  # noqa: BLE001
            fallos.append(str(ex))
    raise RuntimeError(f"ningún símbolo con histórico para {isin}: {'; '.join(fallos[:4]) or 'Yahoo no da resultados'}")


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

RUIDO = re.compile(r"^Precio de acciones, noticias|Gráfico de acciones|^Cotización de |\(\w+\d{6}[CP]\d+\)|cotización e historial", re.I)


def noticias(consulta, n=6, debe=None, cuando="30d"):
    url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(consulta + " when:" + cuando) + "&hl=es&gl=ES&ceid=ES:es"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (inversiones)"})
    raiz = ET.fromstring(urllib.request.urlopen(req, timeout=20).read())
    out, vistos = [], set()
    for it in raiz.iter("item"):
        titulo = (it.findtext("title") or "").strip()
        fuente = (it.findtext("source") or "").strip()
        if fuente and titulo.endswith(" - " + fuente):
            titulo = titulo[: -len(fuente) - 3].strip()
        clave = re.sub(r"\W+", "", titulo.lower())[:60]
        if not titulo or clave in vistos or RUIDO.search(titulo):
            continue
        if debe and not re.search(debe, titulo, re.I):
            continue
        vistos.add(clave)
        try:
            fecha = email.utils.parsedate_to_datetime(it.findtext("pubDate")).astimezone(dt.timezone.utc).replace(microsecond=0).isoformat()
        except Exception:  # noqa: BLE001
            fecha = None
        out.append({"t": titulo, "f": fuente, "d": fecha, "u": it.findtext("link")})
        if len(out) >= n * 3:
            break
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


def pagos_dividendo(t, moneda_local, precio_local):
    """Los dividendos de los dos últimos años: fecha ex-dividendo e importe por acción, en la misma unidad que el
    precio (en Londres, peniques). De aquí sale en la web lo que cobrarás cada mes de los próximos 12."""
    try:
        d = t.dividends
        if d is None or d.empty:
            return []
        d = d.copy()
        d.index = pd.to_datetime(d.index).tz_localize(None)
        d = d[(d.index >= pd.Timestamp.now() - pd.Timedelta(days=730)) & (d > 0)]
        if d.empty:
            return []
        f = 1.0
        if moneda_local in ("GBp", "GBX") and precio_local:
            anual = float(d[d.index >= pd.Timestamp.now() - pd.Timedelta(days=365)].sum()) / precio_local * 100
            if 0 < anual < 0.5:
                f = 100.0
        return [[i.date().isoformat(), num(float(v) * f, 6)] for i, v in d.items()]
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


def rec_de_votos(v):
    """Yahoo a veces da los votos de los analistas pero no su consenso (recommendationKey "none", como BAT): se saca
    de los votos, en la misma escala de 1 (compra fuerte) a 5 (venta fuerte)."""
    try:
        n = sum(v)
        if n < 3:
            return None, None
        media = sum((k + 1) * x for k, x in enumerate(v)) / n
        clave = "strong_buy" if media <= 1.5 else "buy" if media <= 2.5 else "hold" if media <= 3.5 else "underperform" if media <= 4.5 else "sell"
        return clave, round(media, 2)
    except Exception:  # noqa: BLE001
        return None, None


ORDEN_VOTOS = ("strongBuy", "buy", "hold", "sell", "strongSell")


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
    media = num(info.get("recommendationMean"), 2)
    votos = votos_analistas(t)
    if (not rec or rec == "none") and votos and votos.get("ahora"):
        r2, m2 = rec_de_votos([votos["ahora"].get(k, 0) for k in ORDEN_VOTOS])
        if r2:
            rec, media = r2, media or m2
    return {
        "nombre_largo": info.get("longName"),
        "sector": SECTORES.get(info.get("sector"), info.get("sector")),
        "industria": info.get("industry"),
        "analistas": {
            "recomendacion": RECOMENDACION.get(rec, rec),
            "clave": rec,
            "media": media,
            "num": info.get("numberOfAnalystOpinions"),
            "objetivo": obj("targetMeanPrice"),
            "objetivo_alto": obj("targetHighPrice"),
            "objetivo_bajo": obj("targetLowPrice"),
            "votos": votos,
            "cambios": cambios_analistas(t, a_eur),
        } if rec or info.get("targetMeanPrice") else None,
        "fundamentales": {
            "capitalizacion": num(info["marketCap"] * (cambio_hoy(normaliza_moneda(moneda)[0], fx) or 1.0), 0) if info.get("marketCap") else None,
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
        "dividendos_pagos": pagos_dividendo(t, moneda, precio_local),
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


def corregir_saltos(s, bajo=0.5, alto=2.0):
    """Algunos fondos cambian de unidad en Yahoo (por ejemplo, de 10 a 1) y la serie da un salto que
    no es real. Un fondo no se mueve un 50 % en un día: se reescala todo lo anterior al salto."""
    s = s.copy()
    r = s / s.shift(1)
    for fecha, ratio in r[(r < bajo) | (r > alto)].items():
        s.loc[s.index < fecha] *= float(ratio)
        print(f"  salto corregido el {fecha.date()} (x{float(ratio):.4f})")
    return s


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
    # el símbolo fijado en instrumentos.json; si no, el que funcionó la vez anterior; si no, se busca por ISIN
    simbolo = inst.get("yahoo") or (prev or {}).get("simbolo")
    try:
        if not simbolo:
            raise RuntimeError("sin símbolo")
        t, s, meta = serie_cierres(simbolo, "max")
        if len(s) < 20 and not inst.get("yahoo"):
            raise RuntimeError("poco histórico")
    except Exception:  # noqa: BLE001
        if inst.get("yahoo") or not inst.get("isin"):
            raise
        simbolo, t, s, meta = serie_por_isin(inst["isin"], "max")
    moneda = meta.get("currency") or "EUR"
    propio = a_euros(s, moneda, fx).dropna()
    if propio.empty:
        raise RuntimeError("serie en euros vacía")
    if str(inst.get("tipo", "")).startswith("Fondo") or inst.get("tipo") in ("ETC", "ETF"):
        propio = corregir_saltos(propio)
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

def mercado(simbolo, nombre, grupo=None):
    _, s, meta = serie_cierres(simbolo, "2y")
    hoy = s.index[-1]
    anterior = float(s.iloc[-2]) if len(s) > 1 else None
    precio = float(s.iloc[-1])
    ultimo = s[s.index >= hoy - pd.Timedelta(days=366)]
    return {
        "nombre": nombre,
        "grupo": grupo,
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


def hoy_por_meta(simbolo):
    """El último cierre y el anterior, de los metadatos de Yahoo (para los índices de los que ya no da el histórico).
    Con el plazo de un día, «chartPreviousClose» es el cierre del día de antes. Devuelve (fecha, variación %)."""
    t = yf.Ticker(simbolo)
    t.history(period="1d", interval="1d", auto_adjust=False)
    m = t.history_metadata or {}
    p, ant, ts = m.get("regularMarketPrice"), m.get("chartPreviousClose"), m.get("regularMarketTime")
    if not p or not ant or p <= 0 or ant <= 0 or not ts:
        raise RuntimeError("sin último cierre")
    cuando = pd.Timestamp(ts, unit="s", tz="UTC") if isinstance(ts, (int, float)) else pd.Timestamp(ts)
    if cuando.tzinfo is None:
        cuando = cuando.tz_localize("UTC")
    cuando = cuando.tz_convert(m.get("exchangeTimezoneName") or "UTC")
    if pd.Timestamp.now(tz=cuando.tz) - cuando > pd.Timedelta(days=10):
        raise RuntimeError("sin datos recientes")
    return cuando.date().isoformat(), num((p / ant - 1) * 100, 2)


def mes_y_anio(simbolo):
    """El mes y el año de un ETF (el respaldo de los índices sin histórico): (mes %, año %) o (None, None)."""
    try:
        _, s, _ = serie_cierres(simbolo, "1y")
    except Exception:  # noqa: BLE001
        return None, None
    if len(s) < 20:
        return None, None
    hoy = s.index[-1]
    return rentabilidad(s, hoy - pd.Timedelta(days=30)), rentabilidad(s, pd.Timestamp(year=hoy.year, month=1, day=1) - pd.Timedelta(days=1))


def bolsa_mapa(pais, simbolos, nombre, etf=None):
    """Lo justo para pintar un país en el mapa: cómo va hoy, en el mes y en el año (en su moneda)."""
    fallo = None
    for sim in simbolos:
        try:
            # 23 oct: Yahoo devolvía el año de Tadawul y del EGX 30 con un solo cierre; si el año viene así, se prueba
            # con dos años, y si tampoco, con su último cierre y el anterior (y el mes y el año, del ETF si lo hay)
            for periodo in ("1y", "2y"):
                _, s, _ = serie_cierres(sim, periodo)
                if len(s) >= 20:
                    break
            if len(s) < 20:
                f, v = hoy_por_meta(sim)
                m, y = mes_y_anio(etf) if etf else (None, None)
                return sim, {"n": nombre, "p": pais, "f": f, "v": v, "m": m, "y": y, **({"my": etf} if m is not None or y is not None else {})}
            hoy = s.index[-1]
            if pd.Timestamp.now() - hoy > pd.Timedelta(days=10):
                raise RuntimeError("sin datos recientes")
            ant = float(s.iloc[-2]) if len(s) > 1 else None
            return sim, {
                "n": nombre, "p": pais, "f": hoy.date().isoformat(),
                "v": num((float(s.iloc[-1]) / ant - 1) * 100, 2) if ant else None,
                "m": rentabilidad(s, hoy - pd.Timedelta(days=30)),
                "y": rentabilidad(s, pd.Timestamp(year=hoy.year, month=1, day=1) - pd.Timedelta(days=1)),
            }
        except Exception as e:  # noqa: BLE001
            fallo = e
    raise RuntimeError(f"{pais} {simbolos}: {fallo}")


def bolsas_mapa(anterior):
    """Todas las del mapa a la vez (en paralelo: son casi 30 y cada una tarda lo suyo). Si una falla, se queda
    la de la vez anterior; si no había, ese país sale en gris."""
    import concurrent.futures as cf
    prev = anterior.get("mapa") or {}
    out, fallos = {}, []
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        futuros = {ex.submit(bolsa_mapa, *x): x for x in MAPA}
        for fu in cf.as_completed(futuros):
            pais, simbolos = futuros[fu][:2]
            try:
                sim, v = fu.result()
                out[sim] = v
            except Exception as e:  # noqa: BLE001
                fallos.append(str(e))
                # el de la pasada anterior, mientras no tenga más de diez días: después, mejor sin dato que uno viejo
                limite = (dt.date.today() - dt.timedelta(days=10)).isoformat()
                viejo = next(((k, v) for k, v in prev.items() if v.get("p") == pais and str(v.get("f") or "") >= limite
                              and any(v.get(c) is not None for c in ("v", "m", "y"))), None)
                if viejo:
                    out[viejo[0]] = viejo[1]
    if fallos:
        print("mapa, sin datos:", "; ".join(fallos))
    return out


def dominio(web):
    """repsol.com a partir de https://www.repsol.com/es/index.html (para el logo)."""
    if not web:
        return None
    try:
        host = urllib.parse.urlparse(web if "://" in web else "https://" + web).hostname or ""
        return host[4:] if host.startswith("www.") else host or None
    except Exception:  # noqa: BLE001
        return None


def pct(x, nd=1):
    f = num(x, 8)
    return num(f * 100, nd) if f is not None else None


def nota_analistas(texto):
    """'1.8 - Buy' -> 1.8"""
    try:
        return float(str(texto).split("-")[0].strip())
    except (TypeError, ValueError):
        return None


def descubrir(fx, fijas):
    """Recorre la bolsa de EEUU y Europa con el buscador de Yahoo y devuelve [(símbolo, zona)] de las
    empresas con recomendación de compra que no están en la lista fija, más un diagnóstico."""
    from yfinance import EquityQuery
    diag = {"version": 2, "fecha": ahora(), "por_region": {}, "errores": [], "muestras": {}}
    vistos, candidatos = set(fijas), []
    for reg, (zona, sufijo, bolsa, minimo, paginas) in DESCUBRIR.items():
        n_reg = 0
        for pagina in range(paginas):
            try:
                filtros = [EquityQuery("eq", ["region", reg]), EquityQuery("gt", ["intradaymarketcap", 3e8])]
                if bolsa:
                    filtros.append(EquityQuery("eq", ["exchange", bolsa]))
                q = EquityQuery("and", filtros)
                r = yf.screen(q, offset=pagina * 250, size=250, sortField="intradaymarketcap", sortAsc=False)
                quotes = (r or {}).get("quotes") or []
            except Exception as e:  # noqa: BLE001
                diag["errores"].append(f"{reg} p{pagina}: {str(e)[:160]}")
                break
            if pagina == 0:
                diag["muestras"][reg] = [f'{x.get("symbol")}|{x.get("exchange")}|{x.get("averageAnalystRating")}' for x in quotes[:4]] + [f"total {len(quotes)}"]
            for x in quotes:
                sim = x.get("symbol") or ""
                if sim in vistos or x.get("quoteType", "EQUITY") != "EQUITY":
                    continue
                if reg == "us":
                    if "." in sim or (x.get("exchange") and x.get("exchange") not in BOLSAS_US):
                        continue
                elif not sim.endswith(sufijo):
                    continue
                nota = nota_analistas(x.get("averageAnalystRating"))
                if nota is None or nota > NOTA_MAX_DESCUBRIR:
                    continue
                cap_eur = (x.get("marketCap") or 0) * (cambio_hoy(normaliza_moneda(x.get("currency") or "EUR")[0], fx) or 1.0)
                if cap_eur < minimo:
                    continue
                vistos.add(sim)
                candidatos.append((nota, -cap_eur, sim, zona))
                n_reg += 1
            if len(quotes) < 250:
                break
            time.sleep(0.4)
        diag["por_region"][reg] = n_reg
    candidatos.sort()
    elegidas = [(sim, zona) for _, _, sim, zona in candidatos[:MAX_DESCUBIERTAS]]
    diag["candidatas"] = len(candidatos)
    diag["elegidas"] = len(elegidas)
    return elegidas, diag


def fechas_radar(info, precio, a_eur):
    """Próximos resultados y dividendo de una empresa, con lo que ya trae su ficha (sin consultas de más):
    rd (día de resultados en su bolsa), rh ('a' antes de abrir, 'c' tras el cierre; solo en EE. UU., donde
    Yahoo lo sabe), re (fecha estimada), xd (fecha ex-dividendo), dp (día de pago) y dve (euros por acción;
    dva si es una estimación con el último que pagó)."""
    from zoneinfo import ZoneInfo
    out = {}
    hoy = dt.date.today()
    utc = lambda ts: dt.datetime.fromtimestamp(int(ts), dt.timezone.utc) if ts else None  # noqa: E731
    try:
        r = utc(info.get("earningsTimestampStart") or info.get("earningsTimestamp"))
        tz = info.get("exchangeTimezoneName") or "UTC"
        if r:
            loc = r.astimezone(ZoneInfo(tz))
            if loc.date() >= hoy - dt.timedelta(days=1):
                out["rd"] = loc.date().isoformat()
                if tz.startswith("America/"):
                    hm = loc.hour * 60 + loc.minute
                    if 0 < hm < 9 * 60 + 30:
                        out["rh"] = "a"
                    elif hm >= 15 * 60:
                        out["rh"] = "c"
                if info.get("isEarningsDateEstimate"):
                    out["re"] = 1
    except Exception:  # noqa: BLE001
        traceback.print_exc()
    try:
        x = utc(info.get("exDividendDate"))
        if x and x.date() >= hoy - dt.timedelta(days=2):
            out["xd"] = x.date().isoformat()
            pago = utc(info.get("dividendDate"))
            if pago and pago.date() >= x.date():
                out["dp"] = pago.date().isoformat()
            ultimo = utc(info.get("lastDividendDate"))
            valor = info.get("lastDividendValue")
            if valor and precio:
                # en Londres el precio va en peniques y el dividendo a veces en libras
                if (info.get("currency") in ("GBp", "GBX")) and valor / precio < 0.002:
                    valor *= 100
                exacto = bool(ultimo and ultimo.date() == x.date())
                # si aún no está anunciado y paga cada trimestre, mejor el dividendo anual de ahora entre cuatro
                # (recoge las subidas); si paga cada mes o cada semestre, el último que pagó
                anual = info.get("dividendRate")
                if not exacto and anual and 0.8 <= (anual / 4) / valor <= 1.25:
                    valor = anual / 4
                if a_eur:
                    out["dve"] = num(valor * a_eur, 4)
                    if not exacto:
                        out["dva"] = 1
    except Exception:  # noqa: BLE001
        traceback.print_exc()
    return out


def radar_ficha(sim, zona, fx):
    """Todo lo que hace falta para contrastar una idea: analistas (y cómo han cambiado en 3 meses),
    rango de precios objetivo, valoración, crecimiento esperado, rentabilidad, deuda y tendencia."""
    t = yf.Ticker(sim)
    info = t.info or {}
    precio = info.get("currentPrice") or info.get("regularMarketPrice")
    if not precio:
        return None
    moneda = info.get("currency") or "EUR"
    a_eur = cambio_hoy(moneda, fx)
    a_eur_base = cambio_hoy(normaliza_moneda(moneda)[0], fx)
    objetivo = info.get("targetMeanPrice")
    eps, epsf = info.get("trailingEps"), info.get("forwardEps")
    div = info.get("dividendYield")
    cambio_1a = info.get("52WeekChange")
    nombre = info.get("shortName") if len(info.get("longName") or "") > 34 else (info.get("longName") or info.get("shortName") or sim)
    x = {
        "s": sim, "n": nombre, "z": zona,
        "sector": SECTORES.get(info.get("sector"), info.get("sector")), "ind": info.get("industry"),
        "m": moneda, "p": num(precio, 4), "pe": num(precio * a_eur, 4) if a_eur else None,
        "v": num(info.get("regularMarketChangePercent"), 2),
        "r": info.get("recommendationKey"), "rm": num(info.get("recommendationMean"), 2),
        "na": info.get("numberOfAnalystOpinions"),
        "obj": num(objetivo, 4), "tb": num(info.get("targetLowPrice"), 4), "ta": num(info.get("targetHighPrice"), 4),
        "pot": num((objetivo / precio - 1) * 100, 1) if objetivo else None,
        "per": num(info.get("trailingPE"), 1), "perf": num(info.get("forwardPE"), 1),
        "epsg": num((epsf / eps - 1) * 100, 1) if eps and epsf and eps > 0 else None,
        "eg": pct(info.get("earningsGrowth")), "rg": pct(info.get("revenueGrowth")),
        "roe": pct(info.get("returnOnEquity")), "mg": pct(info.get("profitMargins")),
        "de": num(info.get("debtToEquity"), 0), "beta": num(info.get("beta"), 2),
        "div": num(div, 2) if div is not None else None,
        "c1a": num(cambio_1a * 100, 1) if cambio_1a is not None else None,
        "m50": num(info.get("fiftyDayAverage"), 4), "m200": num(info.get("twoHundredDayAverage"), 4),
        "mx": num(info.get("fiftyTwoWeekHigh"), 4), "mn": num(info.get("fiftyTwoWeekLow"), 4),
        "cap": num(info["marketCap"] * a_eur_base, 0) if info.get("marketCap") and a_eur_base else None,
        "w": dominio(info.get("website")), "pais": info.get("country"),
        "f": ahora(),
    }
    x.update(fechas_radar(info, precio, a_eur))
    v = votos_analistas(t)
    if v and v.get("ahora"):
        x["v0"] = [v["ahora"][k] for k in ORDEN_VOTOS]
        if v.get("hace3m"):
            x["v3"] = [v["hace3m"][k] for k in ORDEN_VOTOS]
        if not x.get("r") or x["r"] == "none":
            r2, m2 = rec_de_votos(x["v0"])
            if r2:
                x["r"], x["rm"] = r2, x.get("rm") or m2
    return x


# Lo que alguien mete a mano en la web y GrowFolio no seguía: la web lo apunta en la colección «simbolos» de
# Firestore (solo el ticker o el ISIN, sin quién lo pide; se puede leer sin clave) y aquí entra en el radar, marcado
# como pedido («pd»): así tiene precio en euros, moneda, gráfica y fechas para todos, sin salir como idea.
FIRESTORE_PEDIDAS = "https://firestore.googleapis.com/v1/projects/growfolio-a79a9/databases/(default)/documents/simbolos?pageSize=300"
RE_PEDIDA = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{0,19}$")


def pedidas_firestore():
    out, url = [], FIRESTORE_PEDIDAS
    for _ in range(5):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                j = json.load(r)
        except Exception as e:  # noqa: BLE001
            print("pedidas: no se pudo leer la lista:", e)
            break
        for d in j.get("documents", []) or []:
            f = d.get("fields", {}) or {}
            s = ((f.get("s") or {}).get("stringValue") or "").strip().upper()
            isin = ((f.get("isin") or {}).get("stringValue") or "").strip().upper()
            if (s and RE_PEDIDA.match(s)) or re.match(r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$", isin):
                out.append({"s": s if RE_PEDIDA.match(s or "-") else "", "isin": isin})
        tok = j.get("nextPageToken")
        if not tok:
            break
        url = FIRESTORE_PEDIDAS + "&pageToken=" + urllib.parse.quote(tok)
    print(f"pedidas: {len(out)}")
    return out[:400]


def zona_pedida(sim):
    return "España" if sim.endswith(".MC") else "EEUU" if "." not in sim else "Europa"


def radar(fx, previo, extra=()):
    """Renueva la ficha de cada empresa (en paralelo). Si una falla, se queda la de la vez anterior."""
    import concurrent.futures as cf
    antes = {x["s"]: x for x in (previo or [])}
    tareas = [(sim, zona) for zona, simbolos in RADAR.items() for sim in simbolos]
    fijas = {sim for sim, _ in tareas}
    tareas += [(sim, zona) for sim, zona in extra if sim not in fijas]
    nuevos, fallos = {}, []

    def una(sim, zona):
        for intento in range(2):
            try:
                time.sleep(0.1)
                return radar_ficha(sim, zona, fx)
            except Exception as e:  # noqa: BLE001
                if intento:
                    raise e
                time.sleep(1.5)
        return None

    with cf.ThreadPoolExecutor(max_workers=HILOS_RADAR) as ex:
        futuros = {ex.submit(una, sim, zona): sim for sim, zona in tareas}
        for fu in cf.as_completed(futuros):
            sim = futuros[fu]
            try:
                x = fu.result()
                if x:
                    nuevos[sim] = x
                else:
                    fallos.append(sim)
            except Exception as e:  # noqa: BLE001
                fallos.append(sim)
                print(f"radar {sim}: {e}")
    out, nombres = [], {}
    clave = lambda x: re.sub(r"\b(inc|corp|corporation|plc|sa|s a|nv|n v|ag|se|ltd|co|company|holdings?|group|the|spa|s p a|asa|ab|oyj)\b", "", re.sub(r"[^a-z0-9 ]+", " ", (x.get("n") or "").lower())).split()  # noqa: E731
    for sim, _ in tareas:
        x = nuevos.get(sim) or antes.get(sim)
        if not x:
            continue
        k = " ".join(clave(x))
        if sim not in fijas and k and k in nombres:
            # la misma empresa en otra bolsa: se queda la de la lista fija o la que siguen más analistas
            i = nombres[k]
            if out[i]["s"] not in fijas and (x.get("na") or 0) > (out[i].get("na") or 0):
                out[i] = x
            continue
        nombres[k] = len(out)
        out.append(x)
    if fallos:
        print(f"radar: {len(fallos)} sin datos nuevos: {' '.join(sorted(fallos))}")
    return out


def radar_precios(valores, fx):
    """Precio y variación del día de todas las empresas del radar en pocas consultas, para que el
    potencial hasta el precio objetivo se recalcule en cada ejecución (cada 20 minutos)."""
    sims = [x["s"] for x in valores]
    nuevos = {}
    for i in range(0, len(sims), 100):
        trozo = sims[i:i + 100]
        try:
            df = yf.download(trozo, period="5d", interval="1d", progress=False, auto_adjust=False, threads=True, group_by="column")
            cierre = df["Close"]
            for sim in trozo:
                if sim not in cierre:
                    continue
                c = cierre[sim].dropna()
                c = c[c > 0]
                if len(c) >= 2:
                    nuevos[sim] = (float(c.iloc[-1]), float(c.iloc[-2]))
        except Exception:  # noqa: BLE001
            traceback.print_exc()
    for x in valores:
        if x["s"] not in nuevos:
            continue
        p, ant = nuevos[x["s"]]
        a_eur = cambio_hoy(x.get("m") or "EUR", fx)
        x["p"] = num(p, 4)
        x["pe"] = num(p * a_eur, 4) if a_eur else x.get("pe")
        x["v"] = num((p / ant - 1) * 100, 2)
        if x.get("obj"):
            x["pot"] = num((x["obj"] / p - 1) * 100, 1)
    return len(nuevos)


def radar_historico(valores):
    """Un año de cierres semanales de cada empresa del radar, en su moneda, para la gráfica de su ficha en la
    web (la de las que no tienes). En pocas consultas, de cien en cien. Las semanas sin dato toman el cierre
    anterior, así que cada serie va de semana en semana desde «d»."""
    sims = [x["s"] for x in valores]
    out = {}
    for i in range(0, len(sims), 100):
        trozo = sims[i:i + 100]
        try:
            df = yf.download(trozo, period="1y", interval="1wk", progress=False, auto_adjust=False, threads=True, group_by="column")
            cierre = df["Close"]
            for sim in trozo:
                if sim not in cierre:
                    continue
                c = cierre[sim].ffill().dropna()
                c = c[c > 0]
                if len(c) >= 10:
                    out[sim] = {"d": c.index[0].strftime("%Y-%m-%d"), "v": [num(float(v), 4) for v in c.values]}
        except Exception:  # noqa: BLE001
            traceback.print_exc()
    return {"generado": ahora(), "paso": 7, "s": out} if out else None


# ---------------------------------------------------------------- principal

def per_sector_mediano(valores):
    g = {}
    for x in valores:
        if x.get("sector") and x.get("perf") and 0 < x["perf"] < 80:
            g.setdefault(x["sector"], []).append(x["perf"])
    return {k: sorted(v)[len(v) // 2] for k, v in g.items()}


def contraste_idea(x, medianas):
    """Las mismas siete comprobaciones que hace la web (a favor, en contra), para elegir de qué ideas
    bajar titulares."""
    favor = contra = 0
    def sumar(ok, mal):
        nonlocal favor, contra
        favor += 1 if ok else 0
        contra += 1 if (mal and not ok) else 0
    na, rm, p = x.get("na") or 0, x.get("rm"), x.get("p")
    if rm is not None:
        sumar(na >= 8 and rm <= 2.2, rm >= 2.8 or na < 4)
    v0, v3 = x.get("v0"), x.get("v3")
    if v0 and v3 and sum(v0) and sum(v3):
        d = (v0[0] + v0[1]) / sum(v0) - (v3[0] + v3[1]) / sum(v3)
        sumar(d >= 0.03, d <= -0.03)
    pot, tb = x.get("pot"), x.get("tb")
    if pot is not None and p:
        sumar(pot >= 15 and (not tb or (tb / p - 1) * 100 >= -12), pot < 5)
    crec = x.get("epsg") if x.get("epsg") is not None else x.get("eg")
    if crec is not None:
        sumar(crec >= 5, crec <= -5)
    perf, med = x.get("perf"), medianas.get(x.get("sector"))
    if perf and perf > 0 and med:
        sumar(perf <= med * 0.9, perf >= med * 1.35)
    elif perf is not None and perf <= 0:
        sumar(False, True)
    m50, m200 = x.get("m50"), x.get("m200")
    if m50 and m200 and p:
        sumar(p > m200 and m50 > m200, p < m200 and m50 < m200)
    roe, de, banco = x.get("roe"), x.get("de"), x.get("sector") == "Financiero"
    if roe is not None:
        sumar(roe >= 12 and (banco or de is None or de < 150), roe < 4 or (not banco and de is not None and de > 250))
    return favor, contra


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
        "extra": {},
        "noticias": {},
        "noticias_generado": None,
        "radar_id": None,
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

    for sim, nombre, grupo in MERCADOS:
        try:
            salida["mercados"][sim] = mercado(sim, nombre, grupo)
        except Exception as e:  # noqa: BLE001
            errores.append(f"mercado {sim}: {e}")
            if sim in prev_merc:
                salida["mercados"][sim] = prev_merc[sim]

    try:
        salida["mapa"] = bolsas_mapa(anterior)
    except Exception as e:  # noqa: BLE001
        traceback.print_exc()
        salida["mapa"] = anterior.get("mapa") or {}

    prev_extra = anterior.get("extra", {})
    for sim, nombre in EXTRA:
        try:
            v = mercado(sim, nombre)
            v.pop("historico", None)
            salida["extra"][sim] = v
        except Exception as e:  # noqa: BLE001
            errores.append(f"extra {sim}: {e}")
            if sim in prev_extra:
                salida["extra"][sim] = prev_extra[sim]

    # Noticias: como mucho cada 2 horas (Google News limita si se le pregunta demasiado)
    if prev_not and hace_menos_de(anterior.get("noticias_generado") or "", HORAS_LENTO):
        salida["noticias"] = prev_not
        salida["noticias_generado"] = anterior.get("noticias_generado")
    else:
        consultas = [("mercado", q, None, z) for z, q in NOTICIAS_MERCADO]
        consultas += [(inst["id"], inst["noticias"], inst.get("noticias_filtro"), None) for inst in instrumentos if inst.get("noticias")]
        for clave, q, debe, zona in consultas:
            try:
                lista = noticias(q, 6 if zona else 8, debe)
                for x in lista:
                    if zona:
                        x["z"] = zona
                salida["noticias"].setdefault(clave, []).extend(lista)
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
            # hasta 3 por zona y el resto por fecha, 30 como mucho
            por_zona = {}
            for x in unicos:
                por_zona.setdefault(x.get("z"), []).append(x)
            elegidas = [x for xs in por_zona.values() for x in xs[:3]]
            resto = [x for x in unicos if x not in elegidas]
            elegidas += resto[: max(0, 30 - len(elegidas))]
            salida["noticias"]["mercado"] = sorted(elegidas, key=lambda x: x["d"] or "", reverse=True)
        salida["noticias_generado"] = ahora()

    # las de cada comunidad, aparte y más despacio
    prev_reg = (prev_not or {}).get("_region") or {}
    if prev_reg and hace_menos_de(anterior.get("noticias_region_generado") or "", HORAS_REGION):
        salida["noticias"]["_region"] = prev_reg
        salida["noticias_region_generado"] = anterior.get("noticias_region_generado")
    else:
        reg, err = noticias_region(prev_reg)
        errores += err
        salida["noticias"]["_region"] = reg
        salida["noticias_region_generado"] = ahora()
        print("noticias por comunidad:", {k: len(v) for k, v in reg.items()})

    # Radar de ideas: la ficha de cada empresa cada HORAS_RADAR horas y los precios en cada ejecución.
    # Va en radar.json (pesa bastante) y la web solo lo vuelve a leer cuando cambia radar_id.
    prev_radar = leer_json(f"{dir_anterior}/radar.json") or anterior.get("radar") or {}
    previos = prev_radar.get("valores") or []
    # las descubiertas en toda la bolsa: una vez al día; mientras, las de la vez anterior
    extra = [tuple(x) for x in (prev_radar.get("descubiertas") or [])]
    diag = prev_radar.get("descubrir")
    nuevo_descubrir = not extra or (diag or {}).get("version") != 2 or not hace_menos_de((diag or {}).get("fecha") or "", HORAS_DESCUBRIR)
    if nuevo_descubrir:
        try:
            fijas = {sim for simbolos in RADAR.values() for sim in simbolos}
            halladas, diag = descubrir(fx, fijas)
            if halladas:
                extra = halladas
            print(f"descubrir: {diag.get('elegidas')} de {diag.get('candidatas')} candidatas {diag.get('por_region')}")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            diag = {"fecha": ahora(), "errores": [str(e)[:300]]}
            errores.append(f"descubrir: {e}")
    # lo que se ha metido a mano y no seguíamos (ni en la lista fija, ni descubiertas, ni en instrumentos.json)
    try:
        propias = {str(i.get("yahoo") or "").upper() for i in instrumentos}
        fijas_todas = {sim for simbolos in RADAR.values() for sim in simbolos} | {s for s, _ in extra} | propias
        pedidas = [x["s"] for x in pedidas_firestore() if x["s"]]
        pedidas = [s for s in dict.fromkeys(pedidas) if s not in fijas_todas][:150]
    except Exception as e:  # noqa: BLE001
        traceback.print_exc()
        pedidas = []
    # sin las fechas de resultados y dividendos (radar de antes de la 0.2), se renueva ya en vez de esperar 3 horas
    con_fechas = any(("rd" in x or "xd" in x) for x in previos[:300])
    completo = previos and "v0" in "".join(json.dumps(x) for x in previos[:20]) and con_fechas and hace_menos_de(prev_radar.get("generado") or "", HORAS_RADAR) and not nuevo_descubrir
    radar_sal = dict(prev_radar) if completo else None
    if not completo:
        try:
            valores = radar(fx, previos, list(extra) + [(s, zona_pedida(s)) for s in pedidas])
            radar_sal = {"fecha": hoy, "generado": ahora(), "valores": valores} if valores else (prev_radar or None)
            print(f"radar: {len(valores)} empresas renovadas")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            errores.append(f"radar: {e}")
            radar_sal = prev_radar or None
    if radar_sal and radar_sal.get("valores"):
        # las pedidas nuevas, si no tocaba renovar el radar entero: solo sus fichas
        hay = {x["s"] for x in radar_sal["valores"]}
        for s in [s for s in pedidas if s not in hay][:40]:
            try:
                x = radar_ficha(s, zona_pedida(s), fx)
                if x:
                    radar_sal["valores"].append(x)
            except Exception as e:  # noqa: BLE001
                print("pedida sin ficha:", s, e)
        pd = set(pedidas)
        for x in radar_sal["valores"]:
            if x.get("s") in pd:
                x["pd"] = 1
            else:
                x.pop("pd", None)
        radar_sal["pedidas"] = pedidas
        try:
            n = radar_precios(radar_sal["valores"], fx)
            radar_sal["precios"] = ahora()
            print(f"radar: precios de {n} empresas")
        except Exception as e:  # noqa: BLE001
            traceback.print_exc()
            errores.append(f"radar precios: {e}")
        radar_sal["descubiertas"] = [list(x) for x in extra]
        radar_sal["descubrir"] = diag
        radar_sal["universo"] = sum(len(v) for v in RADAR.values()) + len(extra)
        with open(f"{dir_salida}/radar.json", "w", encoding="utf-8") as f:
            json.dump(radar_sal, f, ensure_ascii=False, separators=(",", ":"))
        salida["radar_id"] = (radar_sal.get("generado") or "") + "|" + (radar_sal.get("precios") or "")
        # el histórico de un año de cada empresa del radar (para la gráfica de su ficha): una vez al día
        prev_rh = leer_json(f"{dir_anterior}/radar-hist.json")
        rh = prev_rh if prev_rh and hace_menos_de(prev_rh.get("generado") or "", 20) else None
        if not rh:
            try:
                rh = radar_historico(radar_sal["valores"]) or prev_rh
                if rh and rh is not prev_rh:
                    print(f"radar: histórico de {len(rh.get('s') or {})} empresas")
            except Exception as e:  # noqa: BLE001
                traceback.print_exc()
                errores.append(f"radar histórico: {e}")
                rh = prev_rh
        if rh:
            with open(f"{dir_salida}/radar-hist.json", "w", encoding="utf-8") as f:
                json.dump(rh, f, ensure_ascii=False, separators=(",", ":"))
            salida["radar_hist_id"] = rh.get("generado")
        salida["radar_generado"] = radar_sal.get("generado")
        salida["radar_n"] = len(radar_sal["valores"])

    # Titulares de las mejores ideas del radar (como mucho cada 2 horas), para contrastar con la prensa
    # lo que dicen los números. Las elige como la web: muchos analistas, consenso de compra y recorrido.
    prev_ni = anterior.get("noticias_ideas") or {}
    if prev_ni and anterior.get("noticias_ideas_v") == 3 and hace_menos_de(anterior.get("noticias_ideas_generado") or "", HORAS_LENTO):
        salida["noticias_ideas"] = prev_ni
        salida["noticias_ideas_generado"] = anterior.get("noticias_ideas_generado")
        salida["noticias_ideas_v"] = 3
    elif radar_sal and radar_sal.get("valores"):
        tuyas = {(inst.get("yahoo") or "") for inst in instrumentos}
        cand = [x for x in radar_sal["valores"] if x.get("s") not in tuyas and (x.get("na") or 0) >= 8 and (x.get("rm") or 9) <= 2.4
                and x.get("r") in ("buy", "strong_buy") and (x.get("pot") or 0) >= 10 and (x.get("c1a") if x.get("c1a") is not None else 0) >= -35]
        medianas = per_sector_mediano(radar_sal["valores"])
        puntos = {x["s"]: contraste_idea(x, medianas) for x in cand}
        cand = [x for x in cand if puntos[x["s"]][0] >= 3 and puntos[x["s"]][1] <= 2]
        cand.sort(key=lambda x: -(puntos[x["s"]][0] - 0.9 * puntos[x["s"]][1] + (x.get("pot") or 0) / 100))
        salida["noticias_ideas"] = {}
        for x in cand[:20]:
            nombre = re.sub(r",?\s+(S\.?A\.?U?|S\.?p\.?A\.?|N\.?V\.?|SE|AG|plc|PLC|Inc\.?|Corp\.?|Corporation|Holdings?|Group|Ltd\.?|ASA|AB|Oyj|Company)\b.*$", "", x.get("n") or "").split(",")[0].strip() or x["s"]
            clave = re.escape(nombre.split()[0]) if nombre.split() else None
            try:
                # con palabras de bolsa, para no traer noticias de productos que se llaman igual
                ns = noticias(f'"{nombre}" (acciones OR bolsa OR resultados OR analistas OR beneficio OR "precio objetivo")', 5, clave)
                if ns:
                    salida["noticias_ideas"][x["s"]] = ns
            except Exception as e:  # noqa: BLE001
                errores.append(f"noticias {x['s']}: {e}")
                if x["s"] in prev_ni:
                    salida["noticias_ideas"][x["s"]] = prev_ni[x["s"]]
            time.sleep(0.3)
        salida["noticias_ideas_generado"] = ahora()
        salida["noticias_ideas_v"] = 3

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
    try:
        intra = intradia(instrumentos, salida)
        with open(f"{dir_salida}/intradia.json", "w", encoding="utf-8") as f:
            json.dump({"generado": salida["generado"], "p": intra}, f, ensure_ascii=False, separators=(",", ":"))
        print(f"intradía: {len(intra)} instrumentos")
    except Exception:  # noqa: BLE001
        traceback.print_exc()
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
