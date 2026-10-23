"""0.7: fichas por empresa con seis factores. La lectura de prensa de la Action clasifica cada titular y rellena
la ficha de cada empresa; lo viejo se va solo. Sin Gemini.

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
import fichas as F  # noqa: E402
import informe as I  # noqa: E402

FUENTES = [
    {"t": "Santander gana un 12 % más en el trimestre", "u": "https://ejemplo.es/1", "f": "Expansión", "d": "2026-10-22T08:00:00+00:00"},
    {"t": "El BCE mantiene los tipos de interés", "u": "https://ejemplo.es/2", "f": "Cinco Días", "d": "2026-10-21T08:00:00+00:00"},
    {"t": "Santander, en el gráfico del día", "u": "https://ejemplo.es/3", "f": "Bolsamanía", "d": "2026-10-20T08:00:00+00:00"},
]
LEIDO = {"imp": "positivo", "rel": 2, "txt": "Gana más de lo esperado.", "cat": "", "fuentes": [1],
         "tit": {"1": ["negocio", "+", 2], "2": ["Macro", "=", 1], "3": ["mercado", "=", 0], "9": ["negocio", "+", 3]},
         "fa": {"negocio": {"s": "+", "p": 2, "plazo": "medio", "txt": "Beneficio un 12 % mayor.", "fuentes": [1]},
                "político": {"s": "-", "p": 1, "plazo": "largo", "txt": "Impuesto a la banca en el aire.", "fuentes": [2]},
                "inventado": {"s": "+", "p": 3, "txt": "No es un factor."}}}


class Claves(unittest.TestCase):
    def test_titulares_iguales_con_otra_forma_dan_la_misma_clave(self):
        self.assertEqual(F.clave_titulo("Repsol sube un 3%, ¡récord!"), F.clave_titulo("  repsol SUBE un 3 % record "))
        self.assertNotEqual(F.clave_titulo("Repsol sube"), F.clave_titulo("Repsol baja"))
        self.assertRegex(F.clave_titulo("Repsol sube"), r"^[0-9a-f]{8}$")

    def test_clave_conocida(self):
        # la misma cuenta que claveTitular en la app (src/js/13-expertos.js): si cambia una, cambia la otra
        self.assertEqual(F.norm_titulo("Ibérdrola: ¡beneficio récord! (+8,5 %)"), "iberdrola beneficio record 8 5")
        self.assertEqual(F.clave_titulo("hola"), "b2c65197")


class Fichas(unittest.TestCase):
    def test_aplicar_lectura(self):
        fichas = F.nuevas()
        e = F.aplicar_lectura(fichas, "SAN.MC", LEIDO, FUENTES, "2026-10-23T10:00:00+00:00", "Banco Santander")
        self.assertEqual(e["n"], "Banco Santander")
        self.assertEqual(set(e["fa"]), {"negocio", "politico"})
        self.assertEqual(e["fa"]["negocio"]["fuentes"][0]["u"], "https://ejemplo.es/1")
        self.assertEqual(e["fa"]["politico"]["s"], "-")
        self.assertEqual(e["tit"][F.clave_titulo(FUENTES[1]["t"])], ["macro", "=", 1, "2026-10-21"])
        self.assertEqual(e["tit"][F.clave_titulo(FUENTES[2]["t"])][2], 0)
        self.assertEqual(len(e["tit"]), 3)  # el 9 no existe en el lote

    def test_lo_nuevo_sustituye_y_lo_demas_se_queda(self):
        fichas = F.nuevas()
        F.aplicar_lectura(fichas, "SAN.MC", LEIDO, FUENTES, "2026-10-20T10:00:00+00:00")
        F.aplicar_lectura(fichas, "SAN.MC", {"fa": {"negocio": {"s": "-", "p": 3, "txt": "Recorta previsiones.", "fuentes": [1]}}}, FUENTES, "2026-10-23T10:00:00+00:00")
        fa = fichas["e"]["SAN.MC"]["fa"]
        self.assertEqual((fa["negocio"]["s"], fa["negocio"]["p"], fa["negocio"]["d"][:10]), ("-", 3, "2026-10-23"))
        self.assertEqual(fa["politico"]["d"][:10], "2026-10-20")

    def test_podar(self):
        fichas = F.nuevas()
        viejas = [dict(f, d="2026-08-01T08:00:00+00:00") for f in FUENTES]
        F.aplicar_lectura(fichas, "SAN.MC", LEIDO, viejas, "2026-08-01T10:00:00+00:00")
        F.aplicar_lectura(fichas, "BBVA.MC", LEIDO, FUENTES, "2026-10-22T10:00:00+00:00")
        F.aplicar_lectura(fichas, "FUERA.MC", LEIDO, FUENTES, "2026-10-22T10:00:00+00:00")
        F.aplicar_temas(fichas, [{"k": "BCE tipos", "fa": "macro", "txt": "El BCE no toca los tipos.", "afecta": [{"zona": "Europa", "sector": "Financiero", "s": "=", "p": 1}], "fuentes": [2]}], FUENTES, "2026-09-01T10:00:00+00:00")
        F.podar(fichas, {"SAN.MC", "BBVA.MC"}, dt.datetime(2026, 10, 23, tzinfo=dt.timezone.utc))
        self.assertNotIn("FUERA.MC", fichas["e"])
        self.assertNotIn("SAN.MC", fichas["e"])  # factores de hace más de 60 días y titulares de más de 30
        self.assertIn("BBVA.MC", fichas["e"])
        self.assertEqual(fichas["temas"], [])

    def test_temas(self):
        fichas = F.nuevas()
        F.aplicar_temas(fichas, [{"k": "Aranceles al acero", "fa": "Política", "txt": "EEUU sube los aranceles al acero.", "plazo": "medio", "fuentes": [1, 2],
                                  "afecta": [{"pais": "United States", "sector": "Materiales", "s": "+", "p": 2}, {"zona": "Europa", "sector": "Materiales", "s": "-", "p": 2}, {"s": "+"}]},
                                 {"k": "sin afectados", "fa": "macro", "txt": "Nada.", "afecta": []}], FUENTES, "2026-10-23T10:00:00+00:00")
        self.assertEqual(len(fichas["temas"]), 1)
        t = fichas["temas"][0]
        self.assertEqual((t["k"], t["fa"], len(t["afecta"]), len(t["fuentes"])), ("aranceles-al-acero", "politico", 2, 2))


class LecturaConFichas(unittest.TestCase):
    def setUp(self):
        self.original = I.gemini_modelo
        I.USO.clear()

    def tearDown(self):
        I.gemini_modelo = self.original
        I.USO.clear()

    def test_leer_lote_rellena_las_fichas_y_la_lectura_de_siempre(self):
        respuesta = {"SAN.MC": dict(LEIDO, tit={"1": ["negocio", "+", 2]}, fa={"negocio": LEIDO["fa"]["negocio"]})}
        I.gemini_modelo = lambda cuerpo, clave, modelo: {"candidates": [{"content": {"parts": [{"text": json.dumps(respuesta)}]}}], "usageMetadata": {}}
        cache = {"SAN.MC": {"n": FUENTES[:1]}}
        valores = [{"s": "SAN.MC", "n": "Banco Santander", "p": 8.1, "m": "EUR", "pot": 12, "sector": "Financiero"}]
        lectura, fichas = {}, F.nuevas()
        self.assertEqual(I.leer_lote(lectura, cache, valores, {}, "clave", fichas, {"SAN.MC"}), 1)
        self.assertEqual((lectura["SAN.MC"]["imp"], lectura["SAN.MC"]["rel"]), ("positivo", 2))
        self.assertEqual(fichas["e"]["SAN.MC"]["fa"]["negocio"]["txt"], "Beneficio un 12 % mayor.")
        self.assertIn(F.clave_titulo(FUENTES[0]["t"]), fichas["e"]["SAN.MC"]["tit"])

    def test_las_noticias_de_las_carteras_entran_en_la_lectura(self):
        cache = {"REP.MC": {"n": [{"t": "Repsol, en el radar", "d": "2026-10-20T08:00:00+00:00"}]}}
        hoy = dt.datetime.now(dt.timezone.utc).isoformat()
        precios = {"noticias": {"repsol": [{"t": "Repsol descubre petróleo en Alaska", "u": "https://ejemplo.es/r", "f": "EFE", "d": hoy}], "fondo": [{"t": "Un fondo", "d": hoy}]}}
        instrumentos = [{"id": "repsol", "yahoo": "REP.MC", "tipo": "Acción"}, {"id": "fondo", "yahoo": "0P000", "tipo": "Fondo"}]
        I.noticias_de_carteras(cache, instrumentos, [{"s": "REP.MC"}], precios)
        self.assertEqual(cache["REP.MC"]["n"][0]["t"], "Repsol descubre petróleo en Alaska")
        self.assertNotIn("0P000", cache)

    def test_guardar_fichas(self):
        fichas = F.nuevas()
        F.aplicar_lectura(fichas, "SAN.MC", LEIDO, FUENTES, I.ahora())
        with tempfile.TemporaryDirectory() as d:
            I.guardar_fichas(fichas, d, {"SAN.MC"})
            leidas = json.loads(Path(d, "fichas.json").read_text())
        self.assertEqual(leidas["v"], 1)
        self.assertIn("SAN.MC", leidas["e"])
        self.assertTrue(leidas["generado"])


if __name__ == "__main__":
    unittest.main()
