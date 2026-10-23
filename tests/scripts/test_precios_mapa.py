"""Pruebas de las bolsas del mapa en scripts/precios.py, sin Yahoo (serie_cierres de imitación).

Uso: python3 -m unittest discover -s tests/scripts
"""
import sys
import unittest
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import precios as P  # noqa: E402


def serie(n, ultimo=100.0):
    dias = pd.bdate_range(end=pd.Timestamp.now().normalize(), periods=n)
    return pd.Series([ultimo * (1 - 0.001 * (n - 1 - i)) for i in range(n)], index=dias)


class BolsasMapa(unittest.TestCase):
    def setUp(self):
        self.original = P.serie_cierres

    def tearDown(self):
        P.serie_cierres = self.original

    def test_con_el_anio_entero(self):
        P.serie_cierres = lambda sim, periodo="max": (None, serie(250), {})
        sim, v = P.bolsa_mapa("SA", ["^TASI.SR"], "Tadawul")
        self.assertEqual(sim, "^TASI.SR")
        self.assertIsNotNone(v["v"])
        self.assertIsNotNone(v["m"])

    def test_anio_vacio_prueba_dos_anios(self):
        pedidos = []

        def falsa(sim, periodo="max"):
            pedidos.append(periodo)
            return None, (serie(1) if periodo == "1y" else serie(500)), {}
        P.serie_cierres = falsa
        _, v = P.bolsa_mapa("EG", ["^CASE30"], "EGX 30")
        self.assertEqual(pedidos, ["1y", "2y"])
        self.assertIsNotNone(v["v"])

    def test_sin_historia_hoy_del_ultimo_cierre_y_mes_y_anio_del_etf(self):
        # como Yahoo con Tadawul el 23 oct: un solo cierre; el ETF KSA, el año entero
        P.serie_cierres = lambda sim, periodo="max": (None, serie(250) if sim == "KSA" else serie(1), {})
        hoy = pd.Timestamp.now().date().isoformat()
        orig = P.hoy_por_meta
        P.hoy_por_meta = lambda sim: (hoy, -2.32)
        try:
            sim, v = P.bolsa_mapa("SA", ["^TASI.SR"], "Tadawul", "KSA")
            self.assertEqual((sim, v["v"], v["f"], v["my"]), ("^TASI.SR", -2.32, hoy, "KSA"))
            self.assertIsNotNone(v["m"])
            # sin ETF (Egipto): solo hoy
            _, v = P.bolsa_mapa("EG", ["^CASE30"], "EGX 30")
            self.assertEqual((v["v"], v["m"], v["y"]), (-2.32, None, None))
            self.assertNotIn("my", v)
        finally:
            P.hoy_por_meta = orig

    def test_sin_historia_falla_y_se_queda_el_de_antes_si_tiene_datos(self):
        P.serie_cierres = lambda sim, periodo="max": (None, serie(1), {})
        orig = P.hoy_por_meta

        def sin(sim):
            raise RuntimeError("sin último cierre")
        P.hoy_por_meta = sin
        self.addCleanup(lambda: setattr(P, "hoy_por_meta", orig))
        with self.assertRaises(RuntimeError):
            P.bolsa_mapa("SA", ["^TASI.SR"], "Tadawul")
        hoy = pd.Timestamp.now().date().isoformat()
        vacio = {"^TASI.SR": {"n": "Tadawul", "p": "SA", "f": hoy, "v": None, "m": None, "y": None}}
        bueno = {"^TASI.SR": {"n": "Tadawul", "p": "SA", "f": hoy, "v": 0.5, "m": 1.0, "y": 3.0}}
        viejo_mapa = P.MAPA
        P.MAPA = [("SA", ["^TASI.SR"], "Tadawul")]
        try:
            self.assertEqual(P.bolsas_mapa({"mapa": vacio}), {})
            self.assertEqual(P.bolsas_mapa({"mapa": bueno}), bueno)
        finally:
            P.MAPA = viejo_mapa


if __name__ == "__main__":
    unittest.main()
