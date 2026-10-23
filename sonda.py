"""Sonda temporal (coste de la IA): mide con la clave de la Action los tokens de cada llamada de GrowFolio a Gemini.
Parte A: la Action (lectura de prensa, informe, decisión de ideas, traducción) con los datos de hoy de la rama datos.
Parte B: GrowIA en la app (preguntas típicas, en fundador y en estándar) y la revisión diaria de la cartera.
Para el conteo de entrada, countTokens; para la salida, la llamada de verdad con Flash-Lite (el 3.8 y el 3.6 de la
clave de la Action están sin cupo hoy)."""
import inspect
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, "repo/scripts")
CLAVE = os.environ["GEMINI_API_KEY"]
BASE = "https://generativelanguage.googleapis.com/v1beta"
LITE = "gemini-3.5-flash-lite"
RES = {"inicio": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())}


def guardar():
    json.dump(RES, open("resultado.json", "w"), ensure_ascii=False, indent=1, default=str)


def post(ruta, cuerpo, timeout=200):
    req = urllib.request.Request(f"{BASE}/{ruta}", data=json.dumps(cuerpo, ensure_ascii=False).encode(), method="POST",
                                 headers={"content-type": "application/json", "x-goog-api-key": CLAVE})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read()), time.time() - t0
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")[:500], time.time() - t0
    except Exception as e:  # noqa: BLE001
        return f"EXC {type(e).__name__}: {e}", None, time.time() - t0


def contar(cuerpo, modelo="gemini-3.8-flash"):
    req = {"generateContentRequest": {"model": f"models/{modelo}", **{k: v for k, v in cuerpo.items() if k in ("contents", "systemInstruction", "tools")}}}
    st, j, _ = post(f"models/{modelo}:countTokens", req, 60)
    if st == 200:
        return j.get("totalTokens")
    if modelo != LITE:
        return contar(cuerpo, LITE)
    return f"error {st}: {str(j)[:200]}"


def uso(j):
    u = (j or {}).get("usageMetadata") or {}
    return {k: u.get(k) for k in ("promptTokenCount", "cachedContentTokenCount", "candidatesTokenCount", "thoughtsTokenCount", "toolUsePromptTokenCount", "totalTokenCount")}


def lite(cuerpo, timeout=200):
    c = json.loads(json.dumps(cuerpo))
    gc = c.get("generationConfig") or {}
    gc.pop("thinkingConfig", None)
    c["generationConfig"] = gc
    return post(f"models/{LITE}:generateContent", c, timeout)


# ---------- Parte A: la Action ----------
def parte_a():
    import informe as I
    import traducir as T
    reg = RES.setdefault("action", [])
    trad = {"n": 0}

    def captura(cuerpo, clave, modelo):
        pila = [f.function for f in inspect.stack()[1:7]]
        if "traducir" in pila:
            trad["n"] += 1
            if trad["n"] > 3:
                raise RuntimeError("429: límite de la sonda para traducir")
        entrada = contar(cuerpo, modelo)
        st, j, t = lite(cuerpo)
        reg.append({"pila": pila, "modelo_pedido": modelo, "entrada_conteo": entrada,
                    "con_busqueda": any("google_search" in json.dumps(x) for x in (cuerpo.get("tools") or [])),
                    "max_salida": (cuerpo.get("generationConfig") or {}).get("maxOutputTokens"),
                    "pensar": ((cuerpo.get("generationConfig") or {}).get("thinkingConfig") or {}).get("thinkingLevel"),
                    "lite_estado": st, "lite_uso": uso(j) if st == 200 else None, "lite_seg": round(t, 1),
                    "lite_error": None if st == 200 else str(j)[:300]})
        guardar()
        if st != 200:
            raise RuntimeError(f"{st}: {str(j)[:200]}")
        return j

    I.gemini_modelo = captura
    I.HORAS_INFORME = 0
    I.HORAS_DECISION = 0
    try:
        I.main("repo/instrumentos.json", "anterior", "salida")
    except Exception as e:  # noqa: BLE001
        RES["action_error"] = repr(e)[:300]
    try:
        T.main("repo/instrumentos.json", "anterior", "salida")
    except Exception as e:  # noqa: BLE001
        RES["traducir_error"] = repr(e)[:300]
    esc = json.load(open("anterior/escaneo.json"))
    inf = json.load(open("anterior/informe.json"))
    RES["datos"] = {k: esc.get(k) for k in ("leidas_24h", "con_noticias", "noticias", "empresas")}
    RES["datos"]["noticias_leidas_informe"] = inf.get("noticias_leidas")
    RES["datos"]["modelos_escaneo"] = (esc.get("gemini") or {}).get("modelos")
    tr = json.load(open("anterior/traduccion-en.json"))
    RES["datos"]["textos_traducidos"] = len(tr.get("t") or {})
    guardar()


# ---------- Parte B: GrowIA en la app ----------
PREGUNTAS = [
    "¿Cómo va mi cartera hoy?",
    "¿Compro NatWest Group plc (NWG.L)? Contrástalo con las noticias y dime cuánto meter, desde dónde y con qué impuesto.",
    "¿Qué pasa si vendo la mitad de Repsol? ¿Cuánto pagaría a Hacienda?",
    "¿Cuánto tendré en 10 años si aporto 600 € al mes?",
    "Busca en el radar empresas europeas para diversificar lo que tengo.",
]


def conversacion(carga, pregunta):
    contents = [{"role": "user", "parts": [{"text": pregunta}]}]
    rondas = []
    for _ in range(6):
        cuerpo = {"systemInstruction": {"parts": [{"text": carga["chat_sistema"]}]}, "contents": contents, "tools": carga["herramientas"],
                  "generationConfig": {"maxOutputTokens": 16384}}
        st, j, t = post(f"models/{LITE}:generateContent", cuerpo)
        if st != 200:
            rondas.append({"estado": st, "error": str(j)[:300]})
            break
        partes = (((j.get("candidates") or [{}])[0]).get("content") or {}).get("parts") or []
        llamadas = [p["functionCall"] for p in partes if "functionCall" in p]
        r = {"uso": uso(j), "seg": round(t, 1), "llamadas": [x["name"] for x in llamadas], "texto_chars": len("".join(p.get("text", "") for p in partes))}
        rondas.append(r)
        if not llamadas:
            break
        contents.append({"role": "model", "parts": partes})
        resp = []
        for x in llamadas:
            if x["name"] == "buscar_en_internet":
                consulta = (x.get("args") or {}).get("consulta", "")
                st2, j2, _ = post(f"models/{LITE}:generateContent", {"contents": [{"role": "user", "parts": [{"text": f"Busca en internet y resume en español de España, con cifras y fechas: {consulta}"}]}], "tools": [{"google_search": {}}]})
                txt = "".join(p.get("text", "") for p in (((j2 or {}).get("candidates") or [{}])[0].get("content") or {}).get("parts", [])) if st2 == 200 else ""
                r.setdefault("busquedas", []).append({"estado": st2, "uso": uso(j2) if st2 == 200 else None})
                out = {"resumen": txt[:4000] or "Sin resultados."}
            else:
                out = carga["resultados"].get(x["name"]) or {"error": "sin datos en la sonda"}
            resp.append({"functionResponse": {"name": x["name"], **({"id": x["id"]} if x.get("id") else {}), "response": out if isinstance(out, dict) else {"resultado": out}}})
        contents.append({"role": "user", "parts": resp})
    return rondas


def parte_b():
    for modo in ("fundador", "estandar"):
        carga = json.load(open(f"carga-{modo}.json"))
        sal = RES.setdefault("app", {}).setdefault(modo, {})
        base = {"systemInstruction": {"parts": [{"text": carga["chat_sistema"]}]}, "tools": carga["herramientas"], "contents": [{"role": "user", "parts": [{"text": "hola"}]}]}
        sal["conteo_chat_base"] = contar(base)
        sal["conteo_solo_sistema"] = contar({"systemInstruction": base["systemInstruction"], "contents": base["contents"]})
        rev = {"systemInstruction": {"parts": [{"text": carga["revision_sistema"]}]}, "tools": carga["herramientas"], "contents": [{"role": "user", "parts": [{"text": carga["revision_pedido"]}]}],
               "generationConfig": {"maxOutputTokens": 24000}}
        sal["conteo_revision"] = contar(rev)
        sal["resultados_tokens"] = {k: contar({"contents": [{"role": "user", "parts": [{"text": json.dumps(v, ensure_ascii=False)}]}]}) for k, v in carga["resultados"].items()}
        guardar()
        sal["preguntas"] = {}
        for q in PREGUNTAS:
            sal["preguntas"][q] = conversacion(carga, q)
            guardar()
        if modo == "fundador":
            st, j, t = post(f"models/{LITE}:generateContent", {k: v for k, v in rev.items() if k != "tools"})
            sal["revision_lite"] = {"estado": st, "uso": uso(j) if st == 200 else None, "seg": round(t, 1), "error": None if st == 200 else str(j)[:300]}
            guardar()


for parte in (parte_b, parte_a):
    try:
        parte()
    except Exception as e:  # noqa: BLE001
        RES.setdefault("errores", []).append(f"{parte.__name__}: {e!r}"[:400])
    guardar()
RES["fin"] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
guardar()
