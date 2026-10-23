"""Sonda temporal (GrowIA): repite con la clave de la Action la conversación que a Carlos le daba «No hay conexión con
Google»: Flash-Lite pide herramientas y, al devolverle los resultados, ¿qué contesta Google?"""
import json
import os
import urllib.error
import urllib.request

C = json.load(open("carga.json"))
CLAVE = os.environ["GEMINI_API_KEY"]
BASE = "https://generativelanguage.googleapis.com/v1beta"
PREGUNTA = "¿Compro NatWest Group plc (NWG.L)? Contrástalo con las noticias y dime cuánto meter, desde dónde y con qué impuesto."
ORIGEN = "https://charly10sf.github.io"


def pedir(modelo, contents, pensar=None, forzar=False):
    cuerpo = {"systemInstruction": {"parts": [{"text": C["sistema"]}]}, "contents": contents, "tools": C["herramientas"],
              "generationConfig": {"maxOutputTokens": 16384, **({"thinkingConfig": {"thinkingLevel": pensar}} if pensar else {})},
              **({"toolConfig": {"functionCallingConfig": {"mode": "ANY", "allowedFunctionNames": ["buscar_empresa", "simular_compra"]}}} if forzar else {})}
    datos = json.dumps(cuerpo, ensure_ascii=False).encode()
    req = urllib.request.Request(f"{BASE}/models/{modelo}:streamGenerateContent?alt=sse", data=datos, method="POST",
                                 headers={"content-type": "application/json", "x-goog-api-key": CLAVE, "Origin": ORIGEN})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            st, cab, txt = r.status, dict(r.headers), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        st, cab, txt = e.code, dict(e.headers), e.read().decode("utf-8", "replace")
    partes = []
    for bloque in txt.replace("\r", "").split("\n\n"):
        d = "".join(l[5:].strip() for l in bloque.split("\n") if l.startswith("data:"))
        if not d:
            continue
        try:
            ch = json.loads(d)
        except Exception:  # noqa: BLE001
            continue
        for c in (ch.get("candidates") or [])[:1]:
            for pt in (c.get("content") or {}).get("parts") or []:
                if pt.get("thought") and not pt.get("thoughtSignature"):
                    continue
                partes.append(pt)
    return st, {k: v for k, v in cab.items() if k.lower().startswith("access-control") or k.lower() in ("content-type", "content-length")}, txt, partes, len(datos)


def caso(modelo, pensar=None):
    out = {"modelo": modelo}
    contents = [{"role": "user", "parts": [{"text": PREGUNTA}]}]
    for vuelta in range(6):
        st, cab, txt, partes, tam = pedir(modelo, contents, pensar, forzar=(vuelta == 0))
        paso = {"estado": st, "cabeceras": cab, "bytes_enviados": tam, "llamadas": [p["functionCall"] for p in partes if "functionCall" in p],
                "texto": "".join(p.get("text", "") for p in partes if "text" in p)[:600], "firma": any("thoughtSignature" in p for p in partes)}
        if st != 200:
            paso["cuerpo"] = txt[:1500]
        out[f"vuelta {vuelta}"] = paso
        if st != 200 or not paso["llamadas"]:
            break
        contents.append({"role": "model", "parts": partes})
        contents.append({"role": "user", "parts": [{"functionResponse": {"name": p["functionCall"]["name"], **({"id": p["functionCall"]["id"]} if p["functionCall"].get("id") else {}),
                         "response": C["resultados"].get(p["functionCall"]["name"]) or {"error": "sin datos en la sonda"}}} for p in partes if "functionCall" in p]})
    return out


def preflight():
    req = urllib.request.Request(f"{BASE}/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse", method="OPTIONS",
                                 headers={"Origin": ORIGEN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,x-goog-api-key"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers)


res = {"preflight": preflight(), "lite": caso("gemini-3.5-flash-lite"), "lite2": caso("gemini-3.5-flash-lite"), "flash38": caso("gemini-3.8-flash", "high")}
print(json.dumps(res, ensure_ascii=False, indent=1, default=str))
