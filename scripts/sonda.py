# Sonda: qué es cada ISIN para Yahoo (nombre, símbolo con histórico, moneda y último precio) y qué fondos salen
# al buscar por nombre. No publica nada: deja sonda.json en la rama sonda-out para revisarlo.
import json, sys
import yfinance as yf
sys.path.insert(0, "scripts")
from candidatos import A, B, C


def info(sim):
    t = yf.Ticker(sim)
    h = t.history(period="3mo", interval="1d")
    m = t.history_metadata or {}
    d = {"s": sim, "cierres": int(len(h)), "ult": float(h["Close"].dropna().iloc[-1]) if len(h) else None, "moneda": m.get("currency"),
         "n": m.get("longName") or m.get("shortName"), "tipo": m.get("instrumentType")}
    try:
        d["isin"] = t.isin
    except Exception:  # noqa: BLE001
        pass
    return d


out = {"A": {}, "B": {}, "C": {}}
for isin, mio in A:
    r = {"mio": mio, "quotes": [], "bueno": None}
    try:
        qs = yf.Search(isin, max_results=10, news_count=0, lists_count=0, raise_errors=False).quotes or []
    except Exception as e:  # noqa: BLE001
        qs = []
        r["err"] = str(e)[:150]
    for q in qs[:6]:
        r["quotes"].append({"s": q.get("symbol"), "tipo": q.get("quoteType"), "n": q.get("longname") or q.get("shortname"), "bolsa": q.get("exchange")})
    for q in sorted(r["quotes"], key=lambda q: (0 if (q["s"] or "").startswith("0P") else 1 if (q["s"] or "").endswith((".DE", ".AS", ".PA", ".MI", ".MC")) else 2)):
        try:
            d = info(q["s"])
            if d["cierres"] >= 20:
                r["bueno"] = d
                break
        except Exception as e:  # noqa: BLE001
            q["err"] = str(e)[:100]
    out["A"][isin] = r
for texto in B:
    res = []
    try:
        qs = yf.Search(texto, max_results=12, news_count=0, lists_count=0, raise_errors=False).quotes or []
    except Exception:  # noqa: BLE001
        qs = []
    for q in qs:
        if q.get("quoteType") not in ("MUTUALFUND", "ETF", "EQUITY"):
            continue
        d = {"s": q.get("symbol"), "tipo": q.get("quoteType"), "n": q.get("longname") or q.get("shortname"), "bolsa": q.get("exchange")}
        try:
            d.update({k: v for k, v in info(d["s"]).items() if k in ("cierres", "ult", "moneda", "isin")})
        except Exception as e:  # noqa: BLE001
            d["err"] = str(e)[:100]
        res.append(d)
    out["B"][texto] = res
for sim in C:
    try:
        out["C"][sim] = info(sim)
    except Exception as e:  # noqa: BLE001
        out["C"][sim] = {"err": str(e)[:150]}
json.dump(out, open("salida/sonda.json", "w"), ensure_ascii=False, indent=1)
print(sum(1 for r in out["A"].values() if r["bueno"]), "de", len(out["A"]), "ISIN con precio")
