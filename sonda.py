"""Sonda temporal (3): las bolsas de Oriente Medio con el precios.py nuevo, contra Yahoo de verdad."""
import json
import precios as P

out = {}
for x in P.MAPA:
    if x[0] in ("SA", "EG", "AE", "QA", "KW", "IL"):
        try:
            out[x[0]] = P.bolsa_mapa(*x)
        except Exception as e:  # noqa: BLE001
            out[x[0]] = "ERROR " + str(e)[:200]
print(json.dumps(out, ensure_ascii=False, indent=1, default=str))
