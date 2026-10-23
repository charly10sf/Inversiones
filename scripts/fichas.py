"""0.7: fichas por empresa con seis factores (negocio, sector, macro, político y regulatorio, social y reputación,
mercado) y los temas que tocan a muchas a la vez (bancos centrales, aranceles, elecciones…).

La Action las rellena al leer la prensa con Flash-Lite (informe.py) y las guarda en fichas.json, en la rama datos:
  {"v": 1, "generado": "...",
   "e": {"<ticker>": {"n": "nombre", "d": "última lectura",
                      "fa": {"<factor>": {"s": "+|-|=|±", "p": 1-3, "plazo": "corto|medio|largo", "txt": "...", "d": "...",
                                          "fuentes": [{"t", "u", "f", "d"}]}},
                      "tit": {"<clave del titular>": ["factor", "signo", peso, "AAAA-MM-DD"]}}},
   "temas": [{"k": "...", "fa": "macro|politico|social", "txt": "...", "plazo": "...", "d": "...", "fuentes": [...],
              "afecta": [{"pais": "...", "sector": "...", "s": "+", "p": 2}]}]}
La app junta en cada ficha lo de la empresa y los temas de su país y su sector, y marca cada titular de sus listas
de noticias con la clave del titular (la misma cuenta en src/js: claveTitular)."""
import datetime as dt
import re
import unicodedata

FACTORES = ("negocio", "sector", "macro", "politico", "social", "mercado")
SIGNOS = ("+", "-", "=", "±")
PLAZOS = ("corto", "medio", "largo")
DIAS_FACTOR = 60      # un factor sin noticias nuevas en 60 días se borra
DIAS_TITULAR = 30     # las marcas de los titulares, 30 días (las listas de noticias de la app enseñan 30)
DIAS_TEMA = 21        # un tema, 3 semanas
MAX_TEMAS = 40


def norm_titulo(t):
    """El titular en minúsculas, sin tildes ni signos y con un solo espacio (como normTitular en la app)."""
    t = unicodedata.normalize("NFD", str(t or "")).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", t)).strip()[:120]


def clave_titulo(t):
    """FNV-1a de 32 bits del titular normalizado, en 8 cifras hexadecimales (igual que claveTitular en la app)."""
    h = 0x811C9DC5
    for c in norm_titulo(t).encode("ascii"):
        h ^= c
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def _sin_tildes(x):
    return unicodedata.normalize("NFD", str(x or "")).encode("ascii", "ignore").decode("ascii").lower().strip()


def factor_de(x):
    f = _sin_tildes(x)
    f = {"politica": "politico", "regulatorio": "politico", "reputacion": "social", "economia": "macro"}.get(f, f)
    return f if f in FACTORES else None


def signo_de(x):
    s = str(x or "").strip()
    s = {"+/-": "±", "+-": "±", "mixto": "±", "positivo": "+", "negativo": "-", "neutral": "=", "neutro": "=", "−": "-"}.get(s.lower(), s)
    return s if s in SIGNOS else "="


def peso_de(x, lo=0):
    try:
        return max(lo, min(3, int(x)))
    except (TypeError, ValueError):
        return lo


def plazo_de(x):
    p = _sin_tildes(x)
    return p if p in PLAZOS else "medio"


def _fuentes(nums, fuentes, n=2):
    out = []
    for k in nums or []:
        try:
            f = fuentes[int(k) - 1]
        except (ValueError, IndexError, TypeError):
            continue
        if f.get("u") and len(out) < n and all(f.get("u") != o.get("u") for o in out):
            out.append({kk: f.get(kk) for kk in ("t", "u", "f", "d") if f.get(kk)})
    return out


def _fecha(x):
    try:
        return dt.datetime.fromisoformat(str(x).replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def nuevas():
    return {"v": 1, "generado": None, "e": {}, "temas": []}


def aplicar_lectura(fichas, s, r, fuentes, ahora, nombre=None):
    """Mete en la ficha de `s` lo que ha leído Gemini: los factores que traen noticia (los demás se quedan como
    estaban) y la marca de cada titular. `r` es la entrada de la empresa en la respuesta; `fuentes`, la lista
    numerada del lote."""
    e = fichas.setdefault("e", {}).setdefault(s, {"fa": {}, "tit": {}})
    e.setdefault("fa", {})
    e.setdefault("tit", {})
    if nombre:
        e["n"] = str(nombre)[:80]
    e["d"] = ahora
    for k, v in (r.get("tit") or {}).items():
        try:
            f = fuentes[int(k) - 1]
        except (ValueError, IndexError, TypeError):
            continue
        if not isinstance(v, (list, tuple)) or not v:
            continue
        fa = factor_de(v[0])
        if not fa or not f.get("t"):
            continue
        e["tit"][clave_titulo(f["t"])] = [fa, signo_de(v[1] if len(v) > 1 else None), peso_de(v[2] if len(v) > 2 else 0), str(f.get("d") or ahora)[:10]]
    for k, v in (r.get("fa") or {}).items():
        fa = factor_de(k)
        if not fa or not isinstance(v, dict) or not str(v.get("txt") or "").strip():
            continue
        p = peso_de(v.get("p"), 1)
        e["fa"][fa] = {"s": signo_de(v.get("s")), "p": p, "plazo": plazo_de(v.get("plazo")), "txt": str(v["txt"]).strip()[:280],
                       "d": ahora, "fuentes": _fuentes(v.get("fuentes"), fuentes)}
    return e


def aplicar_temas(fichas, temas, fuentes, ahora):
    """Los temas que tocan a muchas empresas a la vez (lectura de los titulares por país, sector y tema). Uno nuevo
    con la misma clave sustituye al anterior."""
    lista = {t.get("k"): t for t in fichas.get("temas") or [] if t.get("k")}
    for t in temas or []:
        if not isinstance(t, dict):
            continue
        fa = factor_de(t.get("fa"))
        txt = str(t.get("txt") or "").strip()
        k = re.sub(r"[^a-z0-9]+", "-", _sin_tildes(t.get("k") or txt))[:48].strip("-")
        if fa not in ("macro", "politico", "social", "sector") or not txt or not k:
            continue
        afecta = []
        for a in t.get("afecta") or []:
            if not isinstance(a, dict) or not (a.get("pais") or a.get("sector") or a.get("zona")):
                continue
            afecta.append({kk: str(a[kk])[:40] for kk in ("pais", "sector", "zona") if a.get(kk)} | {"s": signo_de(a.get("s")), "p": peso_de(a.get("p"), 1)})
        if not afecta:
            continue
        lista[k] = {"k": k, "fa": fa, "txt": txt[:280], "plazo": plazo_de(t.get("plazo")), "d": ahora, "fuentes": _fuentes(t.get("fuentes"), fuentes, 3), "afecta": afecta[:12]}
    fichas["temas"] = sorted(lista.values(), key=lambda t: t.get("d") or "", reverse=True)[:MAX_TEMAS]


def podar(fichas, validos, ahora_dt=None):
    """Quita lo viejo: factores de más de 60 días, marcas de titulares de más de 30, temas de más de 21 y las
    empresas que ya no están en el radar ni en las carteras."""
    ahora_dt = ahora_dt or dt.datetime.now(dt.timezone.utc)
    lim_f = ahora_dt - dt.timedelta(days=DIAS_FACTOR)
    lim_t = (ahora_dt - dt.timedelta(days=DIAS_TITULAR)).date().isoformat()
    lim_tema = ahora_dt - dt.timedelta(days=DIAS_TEMA)
    e = fichas.setdefault("e", {})
    for s in list(e):
        if validos is not None and s not in validos:
            del e[s]
            continue
        x = e[s]
        x["fa"] = {k: v for k, v in (x.get("fa") or {}).items() if (_fecha(v.get("d")) or ahora_dt) >= lim_f}
        x["tit"] = {k: v for k, v in (x.get("tit") or {}).items() if isinstance(v, list) and len(v) >= 4 and str(v[3]) >= lim_t}
        if not x["fa"] and not x["tit"]:
            del e[s]
    fichas["temas"] = [t for t in fichas.get("temas") or [] if (_fecha(t.get("d")) or ahora_dt) >= lim_tema]
    return fichas
