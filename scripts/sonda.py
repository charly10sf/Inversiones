import json, time, traceback, urllib.request, xml.etree.ElementTree as ET
import yfinance as yf
import pandas as pd
out = {}
def safe(f):
    try: return f()
    except Exception as e: return f"ERR {type(e).__name__}: {e}"
hist = {}
for s in ["0P0001XF42.F","LU0389811539.LU","0P00012I6A.F","0P00012I66.F","0P0001FAME.F","PHAU.L","REP.MC","BATS.L","IAG.MC","BTC-EUR","SXR8.DE","IMAE.AS","EUNM.DE","IS3N.DE","IUSN.DE","CSPX.L","EURUSD=X","EURGBP=X"]:
    def h(s=s):
        d = yf.Ticker(s).history(period="max", interval="1d", auto_adjust=False)
        c = d["Close"].dropna()
        return {"inicio": str(c.index[0].date()), "fin": str(c.index[-1].date()), "n": len(c), "ult": float(c.iloc[-1])}
    hist[s] = safe(h)
out["hist"] = hist
info = {}
KEYS = ["longName","shortName","currency","quoteType","category","fundFamily","morningStarOverallRating","morningStarRiskRating","totalAssets","ytdReturn","threeYearAverageReturn","fiveYearAverageReturn","annualReportExpenseRatio","netExpenseRatio","marketCap","trailingPE","forwardPE","priceToBook","profitMargins","revenueGrowth","earningsGrowth","debtToEquity","payoutRatio","dividendYield","beta","52WeekChange","fiftyTwoWeekChangePercent","currentPrice","regularMarketPrice","regularMarketChangePercent","recommendationKey","recommendationMean","numberOfAnalystOpinions","targetMeanPrice","targetHighPrice","targetLowPrice","trailingPegRatio","returnOnEquity","freeCashflow","enterpriseToEbitda","sector","industry","fiftyDayAverage","twoHundredDayAverage"]
for s in ["0P0001XF42.F","LU0389811539.LU","0P00012I6A.F","0P00012I66.F","0P0001FAME.F","PHAU.L","REP.MC","BATS.L","IAG.MC"]:
    def i(s=s):
        d = yf.Ticker(s).info or {}
        return {k: d.get(k) for k in KEYS if d.get(k) is not None} | {"_nkeys": len(d)}
    info[s] = safe(i)
out["info"] = info
rec = {}
for s in ["REP.MC","BATS.L","IAG.MC","SAN.MC","AAPL"]:
    t = yf.Ticker(s)
    rec[s] = {
        "recommendations": safe(lambda: t.recommendations.to_dict(orient="records") if t.recommendations is not None else None),
        "upgrades": safe(lambda: [dict(r, fecha=str(ix)) for ix, r in t.upgrades_downgrades.head(8).iterrows()] if t.upgrades_downgrades is not None else None),
        "targets": safe(lambda: t.analyst_price_targets),
        "news": safe(lambda: [{"t": (n.get("content") or n).get("title"), "p": ((n.get("content") or {}).get("provider") or {}).get("displayName"), "d": (n.get("content") or {}).get("pubDate")} for n in (t.news or [])[:3]]),
    }
out["rec"] = rec
mk = {}
for s in ["^IBEX","^STOXX50E","^GSPC","^NDX","^N225","^GDAXI","BZ=F","GC=F","^TNX","EURUSD=X","^VIX","ES10Y.BOND"]:
    def m(s=s):
        d = yf.Ticker(s).history(period="5d")
        return {"ult": float(d["Close"].dropna().iloc[-1]), "cur": (yf.Ticker(s).history_metadata or {}).get("currency")}
    mk[s] = safe(m)
out["mercados"] = mk
# radar timing
t0 = time.time(); r = {}
for s in ["SAN.MC","ITX.MC","IBE.MC","BBVA.MC","ASML.AS","MSFT","NVDA","NOVO-B.CO","NESN.SW","AZN.L"]:
    def i2(s=s):
        d = yf.Ticker(s).info or {}
        return {k: d.get(k) for k in ["longName","currency","currentPrice","recommendationKey","numberOfAnalystOpinions","targetMeanPrice","52WeekChange","regularMarketChangePercent"]}
    r[s] = safe(i2)
out["radar"] = r; out["radar_seg"] = round(time.time() - t0, 1)
def rss(q):
    url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(q) + "&hl=es&gl=ES&ceid=ES:es"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    x = urllib.request.urlopen(req, timeout=20).read()
    root = ET.fromstring(x)
    return [{"t": it.findtext("title"), "d": it.findtext("pubDate"), "s": it.findtext("source"), "l": it.findtext("link")[:80]} for it in root.iter("item")][:4]
import urllib.parse
out["rss"] = {q: safe(lambda q=q: rss(q)) for q in ["Repsol acciones", "IAG bolsa", "Ibex 35"]}
json.dump(out, open("salida/sonda.json", "w"), ensure_ascii=False, indent=1, default=str)
print("hecho")
