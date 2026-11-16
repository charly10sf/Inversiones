"""Pruebas del contador de peticiones (scripts/peticiones.py), sin red.

Uso: python3 -m unittest discover -s tests/scripts
"""
import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import peticiones as PET  # noqa: E402


class Contador(unittest.TestCase):
    def setUp(self):
        PET._CUENTA.clear()

    def test_sitio_y_tipo(self):
        casos = {
            "https://query2.finance.yahoo.com/v8/finance/chart/AAPL?range=5d": ("yahoo", "chart"),
            "https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=x": ("yahoo", "quoteSummary"),
            "https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL": ("yahoo", "quote"),
            "https://query2.finance.yahoo.com/v1/finance/search?q=IE00B4L5Y983": ("yahoo", "search"),
            "https://query1.finance.yahoo.com/v1/finance/screener?crumb=x": ("yahoo", "screener"),
            "https://query1.finance.yahoo.com/v1/test/getcrumb": ("yahoo", "crumb"),
            "https://fc.yahoo.com": ("yahoo", "cookie"),
            "https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL": ("yahoo", "rss"),
            "https://news.google.com/rss/search?q=x": ("google", "noticias"),
            "https://api.anthropic.com/v1/messages": ("anthropic", "claude"),
            "https://firestore.googleapis.com/v1/projects/x": ("firestore", "lista"),
        }
        for url, esperado in casos.items():
            self.assertEqual(PET.sitio_y_tipo(url), esperado, url)

    def test_cuenta_por_fuente(self):
        with PET.fuente("radar_precios"):
            PET.apuntar("https://query2.finance.yahoo.com/v8/finance/chart/A", 200)
            PET.apuntar("https://query2.finance.yahoo.com/v8/finance/chart/B", 429)
        PET.apuntar("https://news.google.com/rss/search?q=x", 200)
        r = PET.resumen()
        self.assertEqual(r["total"], {"yahoo": 2, "google": 1})
        self.assertEqual(r["fuentes"]["radar_precios"]["yahoo"], 2)
        self.assertEqual(r["fuentes"]["radar_precios"]["respuestas"], {"yahoo/429": 1})
        self.assertEqual(r["fuentes"]["otros"]["google"], 1)

    def test_suma_del_dia(self):
        with tempfile.TemporaryDirectory() as d:
            ruta = f"{d}/peticiones.json"
            hoy = dt.datetime(2026, 11, 16, 10, 7, tzinfo=dt.timezone.utc)
            with PET.fuente("fx"):
                PET.apuntar("https://query2.finance.yahoo.com/v8/finance/chart/EURUSD=X", 200)
            anterior = {"dia_fecha": "2026-11-16", "pasadas_dia": 3, "dia": {"fuentes": {"fx": {"yahoo": 21, "tipos": {"yahoo/chart": 21}, "respuestas": {}}}, "total": {"yahoo": 21}}}
            j = PET.guardar(ruta, "precios", anterior, hoy)
            self.assertEqual(j["pasadas_dia"], 4)
            self.assertEqual(j["dia"]["total"]["yahoo"], 22)
            # informe.py completa el mismo archivo: no es otra pasada
            PET._CUENTA.clear()
            PET.apuntar("https://feeds.finance.yahoo.com/rss/2.0/headline?s=A", 200)
            j = PET.guardar(ruta, "informe", anterior, hoy)
            self.assertEqual(j["pasadas_dia"], 4)
            self.assertEqual(j["dia"]["total"]["yahoo"], 23)
            self.assertEqual(set(json.load(open(ruta))["pasada"]), {"precios", "informe"})

    def test_otro_dia_empieza_de_cero(self):
        with tempfile.TemporaryDirectory() as d:
            PET.apuntar("https://query2.finance.yahoo.com/v8/finance/chart/A", 200)
            anterior = {"dia_fecha": "2026-11-15", "pasadas_dia": 9, "dia": {"fuentes": {}, "total": {"yahoo": 900}}}
            j = PET.guardar(f"{d}/p.json", "precios", anterior, dt.datetime(2026, 11, 16, 6, 7, tzinfo=dt.timezone.utc))
            self.assertEqual(j["pasadas_dia"], 1)
            self.assertEqual(j["dia"]["total"]["yahoo"], 1)


if __name__ == "__main__":
    unittest.main()
