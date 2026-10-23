"""La lectura de prensa de la Action va con Flash-Lite (y el 3.6 de reserva), nunca con el 3.8, que queda
para el informe y las ideas: en el plan gratis el 3.8 solo tiene 20 peticiones al día. Sin Gemini.

Uso: python3 -m unittest discover -s tests/scripts
"""
import json
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import informe as I  # noqa: E402


def respuesta(texto="{}"):
    return {"candidates": [{"content": {"parts": [{"text": texto}]}}],
            "usageMetadata": {"promptTokenCount": 15000, "candidatesTokenCount": 9000, "thoughtsTokenCount": 300}}


class LecturaConFlashLite(unittest.TestCase):
    def setUp(self):
        self.original = I.gemini_modelo
        self.pedidos = []
        I.USO.clear()
        del I.ERRORES[:]

    def tearDown(self):
        I.gemini_modelo = self.original
        I.USO.clear()
        del I.ERRORES[:]

    def test_leer_lote_pide_primero_flash_lite(self):
        lectura_json = json.dumps({"SAN.MC": {"imp": "positivo", "rel": 2, "txt": "Gana más de lo esperado.", "cat": "", "fuentes": [1]}})

        def gemini_de_prueba(cuerpo, clave, modelo):
            self.pedidos.append(modelo)
            return respuesta(lectura_json)
        I.gemini_modelo = gemini_de_prueba
        cache = {"SAN.MC": {"n": [{"t": "Santander gana más de lo esperado", "u": "https://ejemplo.es/1", "d": "2026-10-23", "f": "Expansión"}]}}
        valores = [{"s": "SAN.MC", "n": "Banco Santander", "p": 8.1, "m": "EUR", "pot": 12, "sector": "Financial Services"}]
        lectura = {}
        leidas = I.leer_lote(lectura, cache, valores, {}, "clave")
        self.assertEqual(leidas, 1)
        self.assertEqual(self.pedidos, ["gemini-3.5-flash-lite"])
        self.assertEqual(I.USO[-1]["m"], "gemini-3.5-flash-lite")
        self.assertEqual(I.USO[-1]["que"], "leer_lote")

    def test_sin_cupo_de_flash_lite_va_al_3_6_y_nunca_al_3_8(self):
        def sin_cupo(cuerpo, clave, modelo):
            self.pedidos.append(modelo)
            raise RuntimeError("429: sin cupo")
        I.gemini_modelo = sin_cupo
        with self.assertRaises(RuntimeError):
            I.gemini({"contents": []}, "clave", modelos=I.LECTURA)
        self.assertEqual(self.pedidos, ["gemini-3.5-flash-lite", "gemini-3.6-flash"])
        self.assertNotIn(I.MODELO, self.pedidos)

    def test_el_informe_y_las_ideas_siguen_con_el_3_8(self):
        def gemini_de_prueba(cuerpo, clave, modelo):
            self.pedidos.append(modelo)
            return respuesta()
        I.gemini_modelo = gemini_de_prueba
        I.gemini({"contents": []}, "clave")
        self.assertEqual(self.pedidos, [I.MODELO])
        self.assertEqual(I.MODELO, "gemini-3.8-flash")


if __name__ == "__main__":
    unittest.main()
