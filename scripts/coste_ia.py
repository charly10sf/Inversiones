#!/usr/bin/env python3
"""0.8.2d: lo que ha costado la IA (Claude) en una pasada de «Precios», para medirlo sin abrir la Console de Anthropic.

Uso: python scripts/coste_ia.py salida/ [desde]

Lee escaneo.json → ia.uso (lo de informe.py) y traduccion-en.json → uso (lo de traducir.py) y suma, por cada cosa, las
llamadas desde `desde` (ISO, UTC; por defecto, las de la última hora): tokens de entrada y de salida, cuántas fueron por
lote y lo que han costado en US$ con el precio de Anthropic (por lotes, la mitad). Lo cobra el workspace «Toisón radar».
Al final, lo de las últimas 24 horas y lo que saldría al mes a ese ritmo. Nunca falla: si no hay datos, lo dice.
"""
import datetime as dt
import json
import sys


def leer(ruta):
    try:
        with open(ruta, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {}


def main(carpeta, desde=None):
    ahora = dt.datetime.now(dt.timezone.utc)
    desde = desde or (ahora - dt.timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M")
    hace24 = (ahora - dt.timedelta(hours=24)).isoformat(timespec="seconds")
    uso = [x for x in (((leer(f"{carpeta}/escaneo.json").get("ia") or {}).get("uso")) or []) if isinstance(x, dict)]
    uso += [x for x in (leer(f"{carpeta}/traduccion-en.json").get("uso") or []) if isinstance(x, dict) and str(x.get("m") or "").startswith("claude")]
    if not uso:
        print("coste de la IA: no hay llamadas apuntadas")
        return
    suma = {}
    for x in uso:
        if str(x.get("t") or "") < desde:
            continue
        s = suma.setdefault(x.get("que") or "?", [0, 0, 0, 0, 0.0])
        s[0] += 1
        s[1] += int(x.get("in") or 0)
        s[2] += int(x.get("out") or 0)
        s[3] += 1 if x.get("lote") else 0
        s[4] += float(x.get("coste") or 0)
    total = sum(v[4] for v in suma.values())
    print(f"coste de la IA desde {desde} UTC:")
    for k, (n, ent, sal, lote, c) in sorted(suma.items(), key=lambda kv: -kv[1][4]):
        print(f"  {k}: {n} llamadas ({lote} por lote), {ent:,} tokens de entrada y {sal:,} de salida, {c:.4f} US$".replace(",", "."))
    dia = sum(float(x.get("coste") or 0) for x in uso if str(x.get("t") or "") >= hace24)
    print(f"  total de la pasada: {total:.4f} US$; últimas 24 h: {dia:.4f} US$ (a ese ritmo, unos {dia * 30:.2f} US$ al mes)")
    print(f"::notice title=Coste de la IA::pasada {total:.4f} US$ · 24 h {dia:.4f} US$ · al mes ~{dia * 30:.2f} US$")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
