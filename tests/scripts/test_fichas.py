"""0.7: fichas por empresa con seis factores. La lectura de prensa de la Action clasifica cada titular y rellena
la ficha de cada empresa; lo viejo se va solo. Sin Gemini.

Uso: python3 -m unittest discover -s tests/scripts
"""
import datetime as dt
import json
import re
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

    def test_solo_enlaces_http(self):
        # revisión aparte de la 0.7: un enlace «javascript:» de un RSS no llega a la ficha
        fuentes = [{"t": "Trampa", "u": "javascript:alert(1)", "f": "X"}, {"t": "Buena", "u": "https://ejemplo.es/b", "f": "EFE"}]
        fichas = F.nuevas()
        F.aplicar_lectura(fichas, "SAN.MC", {"fa": {"negocio": {"s": "+", "p": 2, "txt": "Gana más.", "fuentes": [1, 2]}}}, fuentes, "2026-10-23T10:00:00+00:00")
        self.assertEqual([f["u"] for f in fichas["e"]["SAN.MC"]["fa"]["negocio"]["fuentes"]], ["https://ejemplo.es/b"])

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
                                  "afecta": [{"pais": "United States", "sector": "Materiales", "s": "+", "p": 2}, {"zona": "Europa", "sector": "Materiales", "industria": "Steel", "s": "-", "p": 2}, {"s": "+"}]},
                                 {"k": "sin afectados", "fa": "macro", "txt": "Nada.", "afecta": []}], FUENTES, "2026-10-23T10:00:00+00:00")
        self.assertEqual(len(fichas["temas"]), 1)
        t = fichas["temas"][0]
        self.assertEqual((t["k"], t["fa"], len(t["afecta"]), len(t["fuentes"])), ("aranceles-al-acero", "politico", 2, 2))
        self.assertEqual(t["afecta"][1]["industria"], "Steel")


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

    def test_lo_leido_antes_de_las_fichas_se_vuelve_a_leer_una_vez(self):
        # leída antes de las fichas, con las mismas noticias: sin ficha, se vuelve a leer; con ficha o leída ya con
        # las fichas (aunque no saliera ninguna), no
        respuesta = {"SAN.MC": dict(LEIDO, tit={"1": ["negocio", "+", 2]}, fa={"negocio": LEIDO["fa"]["negocio"]})}
        pedidas = []
        def gemini(cuerpo, clave, modelo):
            pedidas.append(cuerpo["contents"][0]["parts"][0]["text"])
            return {"candidates": [{"content": {"parts": [{"text": json.dumps(respuesta)}]}}], "usageMetadata": {}}
        I.gemini_modelo = gemini
        cache = {"SAN.MC": {"n": FUENTES[:1]}, "BBVA.MC": {"n": FUENTES[1:2]}, "REP.MC": {"n": FUENTES[2:3]}}
        valores = [{"s": s, "n": s, "p": 8.1, "m": "EUR", "pot": 12, "sector": "Financiero"} for s in cache]
        fichas = F.nuevas()
        F.aplicar_lectura(fichas, "BBVA.MC", LEIDO, FUENTES, I.ahora())
        lectura = {"SAN.MC": {"d": "2026-10-22T10:00:00+00:00", "h": I.huella(cache["SAN.MC"]["n"])},
                   "BBVA.MC": {"d": "2026-10-22T10:00:00+00:00", "h": I.huella(cache["BBVA.MC"]["n"])},
                   "REP.MC": {"d": "2026-10-24T08:00:00+00:00", "h": I.huella(cache["REP.MC"]["n"])}}
        self.assertEqual(I.leer_lote(lectura, cache, valores, {}, "clave", fichas), 1)
        self.assertEqual(len(pedidas), 1)
        self.assertIn("## SAN.MC", pedidas[0])
        self.assertNotIn("## BBVA.MC", pedidas[0])
        self.assertNotIn("## REP.MC", pedidas[0])
        self.assertIn("SAN.MC", fichas["e"])
        # y la pasada siguiente, ya nada que leer
        self.assertEqual(I.leer_lote(lectura, cache, valores, {}, "clave", fichas), 0)

    def test_un_json_roto_no_tira_toda_la_pasada(self):
        # una comilla sin escapar en una empresa: las demás se leen igual
        bien = json.dumps(dict(LEIDO, tit={"1": ["negocio", "+", 2]}, fa={"negocio": LEIDO["fa"]["negocio"]}))
        texto = '{"SAN.MC": ' + bien + ', "BBVA.MC": {"imp": "positivo", "txt": "Dice "hola" sin escapar"}, "REP.MC": ' + bien + '}'
        I.gemini_modelo = lambda cuerpo, clave, modelo: {"candidates": [{"content": {"parts": [{"text": texto}]}}], "usageMetadata": {}}
        cache = {"SAN.MC": {"n": FUENTES[:1]}, "BBVA.MC": {"n": FUENTES[1:2]}, "REP.MC": {"n": FUENTES[2:3]}}
        valores = [{"s": s, "n": s, "p": 8.1, "m": "EUR", "pot": 12, "sector": "Financiero"} for s in cache]
        lectura, fichas = {}, F.nuevas()
        self.assertEqual(I.leer_lote(lectura, cache, valores, {}, "clave", fichas), 2)
        self.assertEqual(sorted(lectura), ["REP.MC", "SAN.MC"])
        self.assertEqual(sorted(fichas["e"]), ["REP.MC", "SAN.MC"])

    def test_un_lote_atascado_se_parte_y_lo_que_no_sale_se_aparta(self):
        # Gemini no devuelve nada si en el lote va TOX.MC: se parte hasta un grupo pequeño, lo demás se lee y el grupo
        # de TOX.MC se aparta hasta que tenga noticias nuevas
        llamadas = []
        def gemini(cuerpo, clave, modelo):
            texto = cuerpo["contents"][0]["parts"][0]["text"]
            syms = re.findall(r"^## (\S+)", texto, flags=re.M)
            llamadas.append(syms)
            res = {} if "TOX.MC" in syms else {s: dict(LEIDO, tit={"1": ["negocio", "+", 2]}, fa={"negocio": LEIDO["fa"]["negocio"]}) for s in syms}
            return {"candidates": [{"content": {"parts": [{"text": json.dumps(res)}]}}], "usageMetadata": {}}
        I.gemini_modelo = gemini
        syms = [f"E{i:02d}.MC" for i in range(15)] + ["TOX.MC"] + [f"E{i:02d}.MC" for i in range(15, 30)]
        cache = {s: {"n": [dict(FUENTES[0], t=f"{s} gana más")]} for s in syms}
        valores = [{"s": s, "n": s, "p": 8.1, "m": "EUR", "pot": 12, "sector": "Financiero"} for s in syms]
        lectura, fichas = {}, F.nuevas()
        n = I.leer_lote(lectura, cache, valores, {}, "clave", fichas)
        self.assertGreaterEqual(n, len(syms) - 2 * I.LOTE_MIN_PARTIR)
        self.assertNotIn("TOX.MC", lectura)
        self.assertIn("TOX.MC", fichas["sin"])
        self.assertLessEqual(len(fichas["sin"]), 2 * I.LOTE_MIN_PARTIR)
        self.assertLessEqual(len(llamadas), 9)
        # la siguiente pasada no las vuelve a pedir; con noticias nuevas, sí
        llamadas.clear()
        self.assertEqual(I.leer_lote(lectura, cache, valores, {}, "clave", fichas), 0)
        self.assertEqual(llamadas, [])
        cache["E03.MC" if "E03.MC" in fichas["sin"] else next(iter(fichas["sin"]))]["n"].append(dict(FUENTES[1]))
        I.leer_lote(lectura, cache, valores, {}, "clave", fichas)
        self.assertEqual(len(llamadas), 1)
        # y al podar, solo las que siguen en el radar
        F.podar(fichas, {"TOX.MC"})
        self.assertEqual(list(fichas["sin"]), ["TOX.MC"])

    def test_si_gemini_no_lee_nada_no_se_aparta_nada(self):
        I.gemini_modelo = lambda cuerpo, clave, modelo: {"candidates": [{"content": {"parts": [{"text": "{}"}]}}], "usageMetadata": {}}
        syms = [f"E{i:02d}.MC" for i in range(20)]
        cache = {s: {"n": [dict(FUENTES[0], t=f"{s} gana más")]} for s in syms}
        valores = [{"s": s, "n": s, "p": 8.1, "m": "EUR", "pot": 12, "sector": "Financiero"} for s in syms]
        lectura, fichas = {}, F.nuevas()
        self.assertEqual(I.leer_lote(lectura, cache, valores, {}, "clave", fichas), 0)
        self.assertEqual(fichas.get("sin") or {}, {})

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
            Path(d, "precios.json").write_text("{\"generado\": \"x\"}")
            I.guardar_fichas(fichas, d, {"SAN.MC"})
            leidas = json.loads(Path(d, "fichas.json").read_text())
            marca = json.loads(Path(d, "precios.json").read_text()).get("fichas_id")
        self.assertEqual(leidas["v"], 1)
        self.assertIn("SAN.MC", leidas["e"])
        self.assertTrue(leidas["generado"])
        self.assertEqual(marca, leidas["generado"])  # la app sabe por precios.json cuándo volver a bajarlas


if __name__ == "__main__":
    unittest.main()


class Temas(unittest.TestCase):
    def setUp(self):
        self.gm, self.nt, self.dormir = I.gemini_modelo, I.P.noticias, I.time.sleep
        I.time.sleep = lambda x: None
        self.pedidos = []
        I.USO.clear()

    def tearDown(self):
        I.gemini_modelo, I.P.noticias, I.time.sleep = self.gm, self.nt, self.dormir
        I.USO.clear()

    def test_leer_temas_cada_3_horas_con_flash_lite(self):
        I.P.noticias = lambda q, n=6, debe=None, cuando="30d": [{"t": f"{q}, titular {i}", "u": f"https://ejemplo.es/{i}", "f": "EFE", "d": "2026-10-23T08:00:00+00:00"} for i in range(n)]
        temas = {"temas": [{"k": "aranceles acero", "fa": "politico", "txt": "Suben los aranceles al acero.", "plazo": "medio", "fuentes": [1],
                            "afecta": [{"zona": "Europa", "sector": "Materiales", "s": "-", "p": 2}]}]}

        def gemini_de_prueba(cuerpo, clave, modelo):
            self.pedidos.append(modelo)
            return {"candidates": [{"content": {"parts": [{"text": json.dumps(temas)}]}}], "usageMetadata": {}}
        I.gemini_modelo = gemini_de_prueba
        fichas = F.nuevas()
        precios = {"noticias": {"mercado": [{"t": "El BCE mantiene los tipos", "f": "EFE", "d": "2026-10-23T07:00:00+00:00", "u": "https://ejemplo.es/m"}]}}
        self.assertEqual(I.leer_temas(fichas, "clave", precios), 1)
        self.assertEqual(self.pedidos, ["gemini-3.5-flash-lite"])
        self.assertEqual(fichas["temas"][0]["afecta"][0]["sector"], "Materiales")
        self.assertEqual(fichas["temas"][0]["fuentes"][0]["u"], "https://ejemplo.es/m")  # las del mercado van primero
        self.assertEqual(I.leer_temas(fichas, "clave", precios), 0)  # hasta dentro de 3 horas, nada
        self.assertEqual(len(self.pedidos), 1)

    def test_sin_clave_no_hace_nada(self):
        self.assertEqual(I.leer_temas(F.nuevas(), "", {}), 0)
