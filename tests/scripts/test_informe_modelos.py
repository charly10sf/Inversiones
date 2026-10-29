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

    def test_sin_busqueda_en_el_plan_gratis(self):
        # 0.7d: en el plan gratis la búsqueda da 429 siempre: ya no se intenta en cada pasada
        self.previo(7)
        self.google(contestan={"gemini-3.8-flash"})
        self.informe()
        self.assertEqual(self.pedidos, [("gemini-3.8-flash", False)])

    def test_con_busqueda_si_se_activa(self):
        self.previo(7)
        self.google(contestan={"gemini-3.8-flash"})
        antes, I.BUSQUEDA = I.BUSQUEDA, True
        try:
            self.informe()
        finally:
            I.BUSQUEDA = antes
        self.assertEqual(self.pedidos[0], ("gemini-3.8-flash", True))


def respuesta_ideas():
    texto = json.dumps({"comentario": "Mercado tranquilo.", "ideas": [], "evitar": [], "plazos": {}})
    return {"candidates": [{"content": {"parts": [{"text": texto}]}}], "usageMetadata": {"promptTokenCount": 20000, "candidatesTokenCount": 3500, "thoughtsTokenCount": 6000}}


class IdeasSinFlashLite(unittest.TestCase):
    """0.7d: las ideas del día con el 3.8 o el 3.6. Si no contesta ninguno, se quedan las de antes (sin fallo en la
    web) y se reintenta; Flash-Lite solo si las que hay tienen más de 2 días o no hay."""

    def setUp(self):
        self.originales = (I.gemini_modelo, I.P.contraste_idea, I.datos_idea, I.contexto_zonas)
        I.P.contraste_idea = lambda x, medianas: (5, 0)
        I.datos_idea = lambda x, medianas: "Datos de prueba."
        I.contexto_zonas = lambda precios: ""
        self.pedidos = []
        I.USO.clear()
        del I.ERRORES[:]
        del I.FALLOS[:]

    def tearDown(self):
        I.gemini_modelo, I.P.contraste_idea, I.datos_idea, I.contexto_zonas = self.originales
        I.USO.clear()
        del I.ERRORES[:]
        del I.FALLOS[:]

    def google(self, contestan):
        def gemini_de_prueba(cuerpo, clave, modelo):
            self.pedidos.append(modelo)
            if modelo not in contestan:
                raise RuntimeError("503: This model is currently experiencing high demand.")
            return respuesta_ideas()
        I.gemini_modelo = gemini_de_prueba

    def decidir(self, horas_previa):
        valores = [{"s": "PRB.MC", "n": "Prueba", "pot": 20, "na": 3, "rm": 2.0, "r": "buy", "perf": 0, "c1a": 5}]
        previa = {"generado": hace(horas_previa), "v": I.DECISION_V, "ideas": [], "evitar": []} if horas_previa is not None else None
        return I.decidir({}, {}, valores, {}, set(), "clave", {}, previa=previa)

    def test_con_ideas_de_ayer_no_usa_flash_lite(self):
        self.google(contestan={LITE})
        with self.assertRaises(RuntimeError):
            self.decidir(22)
        self.assertEqual(self.pedidos, ["gemini-3.8-flash", "gemini-3.6-flash"])
        self.assertEqual(I.FALLOS, [])  # lo esperado: no sale como fallo en la web

    def test_con_el_3_8_saturado_decide_el_3_6(self):
        self.google(contestan={"gemini-3.6-flash"})
        self.decidir(22)
        self.assertEqual(self.pedidos, ["gemini-3.8-flash", "gemini-3.6-flash"])

    def test_sin_ideas_recientes_vale_flash_lite(self):
        self.google(contestan={LITE})
        self.decidir(72)
        self.assertEqual(self.pedidos[-1], LITE)
        self.google(contestan={LITE})
        self.pedidos.clear()
        self.decidir(None)
        self.assertEqual(self.pedidos[-1], LITE)


if __name__ == "__main__":
    unittest.main()
