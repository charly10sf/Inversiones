import json, yfinance as yf
ISINS = {"IE00BYX5MX67": "Fidelity S&P 500 Index Fund", "IE00BYX5PR43": "Fidelity MSCI Japan Index Fund", "IE00BYX5PP84": "Fidelity MSCI Pacific ex Japan Index Fund", "ES0179556008": "True Value FI"}
out = {}
for isin, nombre in ISINS.items():
    r = {"isin": [], "nombre": []}
    for k, q in (("isin", isin), ("nombre", nombre)):
        try:
            res = yf.Search(q, max_results=15, news_count=0, lists_count=0, raise_errors=False)
            for x in res.quotes or []:
                sim = x.get("symbol")
                d = {"s": sim, "tipo": x.get("quoteType"), "bolsa": x.get("exchange"), "n": x.get("longname") or x.get("shortname")}
                try:
                    h = yf.Ticker(sim).history(period="1mo", interval="1d")
                    d["cierres_mes"] = int(len(h))
                    d["ult"] = float(h["Close"].dropna().iloc[-1]) if len(h) else None
                    d["moneda"] = (yf.Ticker(sim).history_metadata or {}).get("currency")
                except Exception as e:
                    d["err"] = str(e)[:120]
                r[k].append(d)
        except Exception as e:
            r[k] = str(e)
    out[isin] = r
json.dump(out, open("salida/sonda.json", "w"), ensure_ascii=False, indent=1)
