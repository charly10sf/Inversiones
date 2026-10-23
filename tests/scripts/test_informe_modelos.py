"""El informe de la Action con el 3.8 (o el 3.6): si no contestan y el que hay es de hace menos de 6 horas, se
queda ese; uno hecho con Flash-Lite solo si el anterior es más viejo. Uno de Flash-Lite se intenta mejorar en
la siguiente pasada, sin esperar las 2 horas. Sin Gemini.

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
import informe as I  # noqa: E402

LITE = "gemini-3.5-flash-lite"


def hace(horas):
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=horas)).isoformat(timespec="seconds")


def respuesta():
    texto = "```json\n" + json.dumps({"resumen": "Todo en orden.", "posiciones": {}}) + "\n```"
    return {"candidates": [{"content": {"parts": [{"text": texto}]}}], "usageMetadata": {"promptTokenCount": 16000, "candidatesTokenCount": 2600, "thoughtsTokenCount": 5000}}


class InformeSinFlashLite(unittest.TestCase):
    def setUp(self):
        self.originales = (I.gemini_modelo, I.material)
        I.material = lambda instrumentos, precios, radar: ("Noticias de prueba.", [])
        self.pedidos = []
        self.dir = tempfile.TemporaryDirectory()
        self.anterior = Path(self.dir.name, "anterior")
        self.salida = Path(self.dir.name, "salida")
        self.anterior.mkdir()
        self.salida.mkdir()
        I.USO.clear()
        del I.ERRORES[:]
        del I.FALLOS[:]

    def tearDown(self):
        I.gemini_modelo, I.material = self.originales
        self.dir.cleanup()
        I.USO.clear()
        del I.ERRORES[:]
        del I.FALLOS[:]

    def previo(self, horas, modelo="gemini-3.8-flash"):
        (self.anterior / "informe.json").write_text(json.dumps({"generado": hace(horas), "modelo": modelo, "resumen": "El de antes.", "posiciones": {}}))

    def google(self, contestan):
        """Gemini de prueba: la búsqueda nunca (no entra en el plan gratis); sin búsqueda, solo los modelos de `contestan`"""
        def gemini_de_prueba(cuerpo, clave, modelo):
            busca = bool(cuerpo.get("tools"))
            self.pedidos.append((modelo, busca))
            if busca:
                raise RuntimeError("429: limit: 0")
            if modelo not in contestan:
                raise RuntimeError("503: This model is currently experiencing high demand.")
            return respuesta()
        I.gemini_modelo = gemini_de_prueba

    def informe(self):
        hecho = I.informe_cartera("no-hay.json", str(self.anterior), str(self.salida), "clave")
        return hecho, json.loads((self.salida / "informe.json").read_text())

    def test_con_uno_reciente_no_publica_uno_de_flash_lite(self):
        self.previo(3)
        self.google(contestan={LITE})
        hecho, inf = self.informe()
        self.assertFalse(hecho)
        self.assertEqual(inf["resumen"], "El de antes.")
        self.assertNotIn(LITE, [m for m, _ in self.pedidos])
        self.assertEqual(I.FALLOS, [])  # lo esperado: no sale como fallo en la web

    def test_con_uno_viejo_vale_flash_lite(self):
        self.previo(7)
        self.google(contestan={LITE})
        hecho, inf = self.informe()
        self.assertTrue(hecho)
        self.assertEqual(inf["modelo"], LITE)
        self.assertTrue(any("503" in x for x in inf["intentos"]))

    def test_uno_de_flash_lite_se_mejora_sin_esperar_dos_horas(self):
        self.previo(0.5, modelo=LITE)
        self.google(contestan={"gemini-3.8-flash"})
        hecho, inf = self.informe()
        self.assertTrue(hecho)
        self.assertEqual(inf["modelo"], "gemini-3.8-flash")

    def test_uno_bueno_de_hace_menos_de_dos_horas_se_queda(self):
        self.previo(1)
        self.google(contestan={"gemini-3.8-flash"})
        hecho, _ = self.informe()
        self.assertFalse(hecho)
        self.assertEqual(self.pedidos, [])


if __name__ == "__main__":
    unittest.main()
