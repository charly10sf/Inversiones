"""Sonda temporal (2): metadatos de los índices sin histórico y ETF de cada país como sustituto."""
import json
import yfinance as yf

INDICES = ["^TASI.SR", "^CASE30", "DFMGI.AE", "^GNRI.QA", "^BKM50.KW", "WIKWT.FGI", "WIKWT-LOC.FGI"]
ETF = ["KSA", "UAE", "QAT", "KWT", "EGPT", "FLSA"]
BUSCAR = ["FTSE ADX General", "ADX General Index", "QE Index", "Qatar All Share", "MSCI Saudi Arabia ETF", "MSCI UAE ETF", "MSCI Qatar ETF", "MSCI Kuwait ETF", "Egypt ETF"]
out = {"indices": {}, "etf": {}, "buscar": {}}
for s in INDICES:
    t = yf.Ticker(s); r = {}
    try:
        h = t.history(period="1y", interval="1d", auto_adjust=False)
        r["dias"] = int(h["Close"].notna().sum()) if not h.empty else 0
        w = t.history(period="2y", interval="1wk", auto_adjust=False)
        r["semanas"] = int(w["Close"].notna().sum()) if not w.empty else 0
        m = t.history_metadata or {}
        r["meta"] = {k: m.get(k) for k in ("regularMarketPrice", "chartPreviousClose", "previousClose", "regularMarketTime", "currency", "exchangeTimezoneName", "fiftyTwoWeekHigh", "fiftyTwoWeekLow", "longName", "shortName")}
    except Exception as e:  # noqa: BLE001
        r["error"] = str(e)[:200]
    out["indices"][s] = r
for s in ETF:
    try:
        h = yf.Ticker(s).history(period="1y", interval="1d", auto_adjust=False)
        c = h["Close"].dropna() if not h.empty else None
        out["etf"][s] = {"dias": int(len(c)) if c is not None else 0, "ultimo": str(c.index[-1].date()) if c is not None and len(c) else None,
                         "hoy": round((c.iloc[-1] / c.iloc[-2] - 1) * 100, 2) if c is not None and len(c) > 1 else None}
    except Exception as e:  # noqa: BLE001
        out["etf"][s] = str(e)[:200]
for q in BUSCAR:
    try:
        out["buscar"][q] = [{k: x.get(k) for k in ("symbol", "shortname", "quoteType")} for x in yf.Search(q, max_results=6).quotes]
    except Exception as e:  # noqa: BLE001
        out["buscar"][q] = str(e)[:200]
print(json.dumps(out, ensure_ascii=False, indent=1, default=str))
