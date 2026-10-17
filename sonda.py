import json, datetime as dt, urllib.request, urllib.parse, xml.etree.ElementTree as ET
import yfinance as yf
import pandas as pd

def df(x, n=12):
    try:
        if x is None: return None
        if isinstance(x, pd.DataFrame):
            return json.loads(x.head(n).reset_index().to_json(orient="records", date_format="iso"))
        if isinstance(x, pd.Series):
            return json.loads(x.head(n).to_json(date_format="iso"))
        return x
    except Exception as e:
        return f"ERR {e}"

out = {}
for s in ["REP.MC", "IAG.MC", "BATS.L", "BTI", "REPYY", "ICAGY", "ITX.MC", "SAN.MC"]:
    o = {}
    t = yf.Ticker(s)
    for nombre, f in [
        ("recommendations", lambda: df(t.recommendations)),
        ("upgrades_downgrades", lambda: df(t.upgrades_downgrades.sort_index(ascending=False) if t.upgrades_downgrades is not None else None, 15)),
        ("analyst_price_targets", lambda: t.analyst_price_targets),
        ("earnings_estimate", lambda: df(t.earnings_estimate)),
        ("growth_estimates", lambda: df(t.growth_estimates)),
        ("news", lambda: t.news[:3]),
        ("info", lambda: {k: v for k, v in t.info.items() if not isinstance(v, (list, dict)) and k != "longBusinessSummary"}),
        ("calendar", lambda: {k: str(v) for k, v in (t.calendar or {}).items()}),
    ]:
        try:
            o[nombre] = f()
        except Exception as e:
            o[nombre] = "ERR " + repr(e)
    out[s] = o

fondos = {}
for s in ["0P0001XF42.F", "LU0389811539.LU", "0P00012I6A.F", "IVV", "IEUR", "EEM", "VB", "SCZ", "PHAU.L"]:
    o = {}
    t = yf.Ticker(s)
    try:
        o["info"] = {k: v for k, v in t.info.items() if not isinstance(v, (list, dict)) and k != "longBusinessSummary"}
    except Exception as e:
        o["info"] = "ERR " + repr(e)
    try:
        fd = t.funds_data
        o["top_holdings"] = df(fd.top_holdings, 12)
        o["asset_classes"] = fd.asset_classes
        o["fund_overview"] = fd.fund_overview
    except Exception as e:
        o["funds_data"] = "ERR " + repr(e)
    fondos[s] = o

merc = {}
for s in ["^IBEX", "^STOXX50E", "^GSPC", "^NDX", "BZ=F", "GC=F", "EURUSD=X", "^GDAXI", "^VIX"]:
    try:
        t = yf.Ticker(s)
        h = t.history(period="5d")
        merc[s] = {"n": len(h), "ult": float(h["Close"].iloc[-1]) if len(h) else None, "prev": t.fast_info["previousClose"], "cur": t.fast_info["currency"]}
    except Exception as e:
        merc[s] = "ERR " + repr(e)

gn = {}
for q in ["Repsol acciones", "IAG acciones", "British American Tobacco acciones"]:
    try:
        url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(q + " when:14d") + "&hl=es&gl=ES&ceid=ES:es"
        x = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20).read()
        items = []
        for it in ET.fromstring(x).iter("item"):
            items.append({c.tag: (c.text or "") for c in it if c.tag in ("title", "link", "pubDate", "source")})
            if len(items) >= 8: break
        gn[q] = items
    except Exception as e:
        gn[q] = "ERR " + repr(e)

json.dump({"generado": dt.datetime.utcnow().isoformat(), "acciones": out, "fondos": fondos, "mercados": merc, "google_news": gn}, open("salida.json", "w"), indent=1, default=str, ensure_ascii=False)
print("ok")
