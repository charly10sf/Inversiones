"""Sonda temporal: qué devuelve Yahoo para las bolsas de Oriente Medio (rama sonda-yahoo, se borra después)."""
import json
import yfinance as yf

CANDIDATOS = {
    "SA": ["^TASI.SR", "TASI.SR"],
    "EG": ["^CASE30", "^EGX30", "EGX30.CA", "^CASE"],
    "AE": ["^FADGI", "FADGI.AD", "^ADI", "^DFMGI", "DFMGI.AE", "^ADX"],
    "QA": ["^QSI", "QSI.QA", "^GNRI.QA", "^QEAS"],
    "KW": ["^BKP", "^KWSE", "BKP.KW", "^MKWI"],
}
BUSCAR = ["Tadawul All Share", "EGX 30", "Abu Dhabi index", "DFM General", "Qatar Exchange index", "Boursa Kuwait", "Kuwait index"]
out = {"series": {}, "buscar": {}}
for pais, sims in CANDIDATOS.items():
    for s in sims:
        r = {}
        for per in ("1y", "2y", "max"):
            try:
                h = yf.Ticker(s).history(period=per, interval="1d", auto_adjust=False)
                c = h["Close"] if not h.empty else None
                r[per] = {"filas": int(len(h)), "con_cierre": int(c.notna().sum()) if c is not None else 0,
                          "ultimo": str(c.dropna().index[-1].date()) if c is not None and c.notna().any() else None,
                          "valor": float(c.dropna().iloc[-1]) if c is not None and c.notna().any() else None}
            except Exception as e:  # noqa: BLE001
                r[per] = {"error": str(e)[:200]}
        out["series"][f"{pais} {s}"] = r
for q in BUSCAR:
    try:
        out["buscar"][q] = [{k: x.get(k) for k in ("symbol", "shortname", "exchange", "quoteType")} for x in yf.Search(q, max_results=8).quotes]
    except Exception as e:  # noqa: BLE001
        out["buscar"][q] = str(e)[:200]
print(json.dumps(out, ensure_ascii=False, indent=1))
