"""0.9: el radar con Claude si hay ANTHROPIC_RADAR_KEY; sin ella, Gemini como siempre; si Claude falla, Gemini.
Sin red: las peticiones se imitan.

Uso: python3 -m unittest discover -s tests/scripts
"""
import io
import json
import os
import sys
import unittest
import urllib.error
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import informe as I  # noqa: E402

GEM = {"candidates": [{"content": {"parts": [{"text": "{\"de\": \"gemini\"}"}]}}], "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 5}}
CLA = {"model": "claude-haiku-5-5", "content": [{"type": "text", "text": "{\"de\": \"claude\"}"}], "stop_reason": "end_turn",
       "usage": {"input_tokens": 900, "cache_read_input_tokens": 100, "output_tokens": 300}}
CUERPO = {"systemInstruction": {"parts": [{"text": "Eres el radar."}]}, "contents": [{"role": "user", "parts": [{"text": "Lee esto."}]}],
          "generationConfig": {"maxOutputTokens": 50000, "responseMimeType": "application/json", "thinkingConfig": {"thinkingLevel": "low"}}}


def leer_lote():  # el nombre de la función que llama es el «que» del registro
    return I.gemini(CUERPO, os.environ.get("GEMINI_API_KEY") or I.SIN_GEMINI, modelos=I.LECTURA)


class RadarClaude(unittest.TestCase):
    def setUp(self):
        self.g, self.c, self.sleep = I.gemini_modelo, I.peticion_claude, I.time.sleep
        I.time.sleep = lambda s: None
        self.pedidos = []
        I.gemini_modelo = lambda cuerpo, clave, modelo: (self.pedidos.append(("gemini", modelo)), GEM)[1]
        I.USO.clear(); I.CLAUDE_ERRORES.clear(); I.CLAUDE_APAGADO = False
        self.env = dict(os.environ)

    def tearDown(self):
        I.gemini_modelo, I.peticion_claude, I.time.sleep = self.g, self.c, self.sleep
        I.USO.clear(); I.CLAUDE_ERRORES.clear(); I.CLAUDE_APAGADO = False
        os.environ.clear(); os.environ.update(self.env)

    def test_sin_clave_de_claude_va_gemini(self):
        os.environ.pop("ANTHROPIC_RADAR_KEY", None); os.environ["GEMINI_API_KEY"] = "g"
        I.peticion_claude = lambda *a: self.fail("no debe llamar a Claude")
        r = leer_lote()
        self.assertEqual(json.loads(I.texto_de(r)[0])["de"], "gemini")
        self.assertEqual(self.pedidos[0], ("gemini", I.LECTURA[0]))

    def test_con_clave_va_claude_con_su_formato(self):
        os.environ["ANTHROPIC_RADAR_KEY"] = "k"; os.environ["GEMINI_API_KEY"] = "g"
        vistos = []
        I.peticion_claude = lambda cuerpo, clave: (vistos.append((cuerpo, clave)), CLA)[1]
        r = leer_lote()
        self.assertEqual(json.loads(I.texto_de(r)[0])["de"], "claude")
        cuerpo, clave = vistos[0]
        self.assertEqual(clave, "k")
        self.assertEqual(cuerpo["model"], "claude-haiku-5-5")
        self.assertEqual(cuerpo["max_tokens"], I.CLAUDE_MAX_SALIDA)
        self.assertIn("JSON", cuerpo["system"])
        self.assertEqual(cuerpo["messages"], [{"role": "user", "content": "Lee esto."}])
        self.assertNotIn("tools", cuerpo)
        self.assertEqual(self.pedidos, [])
        # los tokens, al mismo registro, con el nombre del modelo
        self.assertEqual(I.USO[-1]["m"], "claude-haiku-5-5")
        self.assertEqual((I.USO[-1]["que"], I.USO[-1]["in"], I.USO[-1]["cache"], I.USO[-1]["out"]), ("leer_lote", 1000, 100, 300))

    def test_la_busqueda_de_google_pasa_a_la_de_claude(self):
        pedido = I.a_claude({**CUERPO, "tools": [{"google_search": {}}]}, "claude-haiku-5-5")
        self.assertEqual(pedido["tools"][0]["type"], "web_search_20250305")

    def test_si_claude_falla_sigue_gemini(self):
        os.environ["ANTHROPIC_RADAR_KEY"] = "k"; os.environ["GEMINI_API_KEY"] = "g"

        def falla(cuerpo, clave):
            raise urllib.error.HTTPError(I.CLAUDE_API, 529, "overloaded", {}, io.BytesIO(b'{"error":"overloaded"}'))
        I.peticion_claude = falla
        r = leer_lote()
        self.assertEqual(json.loads(I.texto_de(r)[0])["de"], "gemini")
        self.assertTrue(I.CLAUDE_ERRORES and "529" in I.CLAUDE_ERRORES[0])
        self.assertFalse(I.CLAUDE_APAGADO)

    def test_sin_saldo_se_apaga_para_la_pasada(self):
        os.environ["ANTHROPIC_RADAR_KEY"] = "k"; os.environ["GEMINI_API_KEY"] = "g"
        n = []

        def sin_saldo(cuerpo, clave):
            n.append(1)
            raise urllib.error.HTTPError(I.CLAUDE_API, 400, "bad", {}, io.BytesIO(b'{"error":{"message":"Your credit balance is too low"}}'))
        I.peticion_claude = sin_saldo
        leer_lote(); leer_lote()
        self.assertTrue(I.CLAUDE_APAGADO)
        self.assertEqual(len(n), 1)  # la segunda ya ni lo intenta

    def test_solo_con_claude_y_falla_lanza(self):
        os.environ["ANTHROPIC_RADAR_KEY"] = "k"; os.environ.pop("GEMINI_API_KEY", None)

        def falla(cuerpo, clave):
            raise urllib.error.HTTPError(I.CLAUDE_API, 401, "no", {}, io.BytesIO(b"invalid x-api-key"))
        I.peticion_claude = falla
        with self.assertRaises(RuntimeError):
            leer_lote()
        self.assertEqual(self.pedidos, [])


if __name__ == "__main__":
    unittest.main()
