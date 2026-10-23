"""0.6d: la Action apunta los tokens de cada llamada a Gemini (para saber lo que costaría la IA de pago). Sin Gemini.

Uso: python3 -m unittest discover -s tests/scripts
"""
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import informe as I  # noqa: E402

RESP = {"candidates": [{"content": {"parts": [{"text": "{}"}]}}],
        "usageMetadata": {"promptTokenCount": 41000, "cachedContentTokenCount": 30000, "candidatesTokenCount": 9000, "thoughtsTokenCount": 1200}}


class UsoGemini(unittest.TestCase):
    def setUp(self):
        self.original = I.gemini_modelo
        I.USO.clear()

    def tearDown(self):
        I.gemini_modelo = self.original
        I.USO.clear()

    def test_apunta_modelo_quien_llama_y_tokens(self):
        I.gemini_modelo = lambda cuerpo, clave, modelo: RESP

        def leer_lote_de_prueba():
            return I.gemini({"contents": []}, "clave")
        leer_lote_de_prueba()
        self.assertEqual(len(I.USO), 1)
        u = I.USO[0]
        self.assertEqual((u["m"], u["que"], u["in"], u["cache"], u["out"], u["pensar"]), (I.MODELO, "leer_lote_de_prueba", 41000, 30000, 9000, 1200))

    def test_con_el_modelo_de_reserva(self):
        def falla_el_primero(cuerpo, clave, modelo):
            if modelo == I.MODELO:
                raise RuntimeError("429: sin cupo")
            return RESP
        I.gemini_modelo = falla_el_primero
        I.gemini({"contents": []}, "clave")
        self.assertEqual([u["m"] for u in I.USO], [I.RESERVA[0]])


if __name__ == "__main__":
    unittest.main()
