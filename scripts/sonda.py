# Sonda: prueba el Worker de GrowFolio (/isin) desde fuera, como lo haría la app
import json, urllib.request, time
W = "https://growfolio.growfolio-web-app.workers.dev"
out = {}
def pide(ruta, origen="https://charly10sf.github.io"):
    req = urllib.request.Request(W + ruta, headers={"Origin": origen, "User-Agent": "sonda"})
    t = time.time()
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            j = json.load(r); st = r.status
    except urllib.error.HTTPError as e:
        st = e.code
        try: j = json.load(e)
        except Exception: j = {"cuerpo": "?"}
    except Exception as e:
        st, j = None, {"err": str(e)[:200]}
    if isinstance(j, dict) and "h" in j: j["h"] = f"{len(j['h'])} cierres, último {j['h'][-1] if j['h'] else None}"
    return {"status": st, "seg": round(time.time() - t, 2), "j": j}
out["salud"] = pide("/salud")
for c in ["DE000A2T0VU5", "LU0996182563", "US0378331005", "IE00B4L5Y984", "XS0000000000", "ES0112611001"]:
    out[c] = pide(f"/isin?c={c}")
out["sin_origen"] = pide("/isin?c=DE000A2T0VU5", origen="https://otro.example")
import os
os.makedirs("salida", exist_ok=True)
json.dump(out, open("salida/sonda.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False, indent=1)[:3000])
