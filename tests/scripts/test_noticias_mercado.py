"""9 nov 2026: los titulares de mercado para la página de Noticias. Más por zona (5), 60 en total, sin repetidos y sin
páginas de cotización. Sin red.

Uso: python3 -m unittest discover -s tests/scripts
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import precios as P  # noqa: E402


def n(t, z, d):
    return {"t": t, "z": z, "d": f"2026-11-09T{d:02d}:00:00+00:00", "u": "https://x", "f": "X"}


class Mercado(unittest.TestCase):
    def test_por_zona_y_total(self):
        lista = [n(f"Titular España {i}", "España", i) for i in range(10)] + [n(f"Titular Asia {i}", "Asia", i) for i in range(3)]
        e = P.elegir_mercado(lista, por_zona=5, total=8)
        self.assertEqual(len(e), 8)
        self.assertEqual(sum(1 for x in e if x["z"] == "Asia"), 3)
        self.assertEqual([x["d"] for x in e], sorted([x["d"] for x in e], reverse=True))

    def test_sin_repetidos(self):
        e = P.elegir_mercado([n("El Ibex sube un 1 %", "España", 9), n("El Ibex sube un 1 %!", "Tipos", 8)])
        self.assertEqual(len(e), 1)

    def test_ruido(self):
        self.assertTrue(P.RUIDO.search("Precio del Crudo Brent Hoy. Cotización en Tiempo Real"))
        self.assertTrue(P.RUIDO.search("Cotización de hoy del euro"))
        self.assertFalse(P.RUIDO.search("El Ibex 35 sube más del 1 % aupado por la banca"))
        self.assertFalse(P.RUIDO.search("Bolsa e Ibex 35 hoy, en directo | Las tecnológicas caen"))

    def test_mas_consultas(self):
        self.assertGreaterEqual(len(P.NOTICIAS_MERCADO), 19)
        self.assertEqual(P.NOTICIAS_MERCADO_CUANDO, "3d")


if __name__ == "__main__":
    unittest.main()
