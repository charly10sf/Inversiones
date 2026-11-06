"""Pruebas de scripts/traducir.py con datos de verdad (tests/.datos/datos, ver tests/traer-datos.sh) y la IA (Claude) de
imitación, en directo y por lotes.

Uso: python3 -m unittest discover -s tests/scripts
"""
import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import traducir as T  # noqa: E402

DATOS = RAIZ / "tests" / ".datos" / "datos"


class Traducir(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "ant").mkdir()
        (self.tmp / "sal").mkdir()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def escribir(self, nombre, datos):
        (self.tmp / "sal" / nombre).write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")

    def correr(self, llamar=None, lotes=False):
        """llamar(lista) -> traducciones: hace de Claude (se le pasa lo que pide traducir.py en cada tanda). Con lotes, las
        tandas van por la API por lotes de imitación."""
        guardado = (T.I.peticion_claude, T.I.peticion_claude_get, T.I.CLAUDE_LOTES, T.I.time.sleep, os.environ.get("ANTHROPIC_RADAR_KEY"))
        os.environ["ANTHROPIC_RADAR_KEY"] = "prueba" if llamar else ""
        T.I.CLAUDE_LOTES = lotes
        T.I.time.sleep = lambda s: None
        T.I.USO.clear()
        self.lotes = []

        def responder(cuerpo):
            lista = json.loads(cuerpo["messages"][0]["content"].split("Textos:\n", 1)[1])
            return {"model": "claude-haiku-5-5", "content": [{"type": "text", "text": json.dumps({"t": llamar(lista)})}], "usage": {"input_tokens": 100, "output_tokens": 80}}
        pedidos = {}

        def get(ruta, clave, metodo="GET", cuerpo=None, texto=False):
            if metodo == "POST" and ruta.endswith("/batches"):
                pedidos.update({r["custom_id"]: r["params"] for r in cuerpo["requests"]})
                self.lotes.append(len(cuerpo["requests"]))
                return {"id": "b1", "processing_status": "ended", "results_url": "https://api.anthropic.com/v1/messages/batches/b1/results"}
            if ruta.endswith("/results"):
                return "\n".join(json.dumps({"custom_id": k, "result": {"type": "succeeded", "message": responder(p)}}) for k, p in pedidos.items())
            return {"id": "b1", "processing_status": "ended"}
        T.I.peticion_claude = lambda cuerpo, clave: responder(cuerpo)
        T.I.peticion_claude_get = get
        try:
            T.main(str(RAIZ / "instrumentos.json"), str(self.tmp / "ant"), str(self.tmp / "sal"))
        finally:
            T.I.peticion_claude, T.I.peticion_claude_get, T.I.CLAUDE_LOTES, T.I.time.sleep, clave = guardado
            if clave is None:
                os.environ.pop("ANTHROPIC_RADAR_KEY", None)
            else:
                os.environ["ANTHROPIC_RADAR_KEY"] = clave
        return json.loads((self.tmp / "sal" / "traduccion-en.json").read_text(encoding="utf-8"))

    def test_noticias_por_comunidad(self):
        # noticias["_region"] es {comunidad: [noticias]}: antes tumbaba toda la traducción (0.5b)
        self.escribir("precios.json", {"noticias": {
            "mercado": [{"t": "El Ibex 35 pierde los 19.000 puntos por la caída de la banca"}],
            "_region": {"madrid": [{"t": "La Comunidad de Madrid baja el tramo autonómico del IRPF para los jóvenes"}], "vacia": []},
        }})
        pedidos = []

        def falso(lista):
            pedidos.extend(lista)
            return ["EN " + x for x in lista]
        out = self.correr(falso)
        self.assertEqual(len(out["t"]), 2)
        self.assertTrue(any("Madrid" in x for x in pedidos))
        # lo de todos va antes que lo de cada comunidad
        self.assertIn("Ibex", pedidos[0])

    def test_fichas(self):
        # 0.7: lo que pesa en cada empresa y los temas también se traducen (las claves y los nombres, no)
        self.escribir("fichas.json", {"v": 1, "temas": [{"k": "aranceles-acero", "fa": "politico", "txt": "Estados Unidos sube los aranceles al acero de Europa y la UE responde", "afecta": [{"zona": "Europa", "sector": "Materiales"}]}],
                                      "e": {"REP.MC": {"n": "Repsol", "fa": {"negocio": {"s": "+", "p": 2, "plazo": "medio", "txt": "Recompra acciones y sube el dinero para el accionista"}}, "tit": {"1c8f8911": ["negocio", "+", 2, "2026-10-23"]}}}})
        pedidos = []

        def falso(lista):
            pedidos.extend(lista)
            return ["EN " + x for x in lista]
        out = self.correr(falso)
        self.assertEqual(sorted(pedidos), ["Estados Unidos sube los aranceles al acero de Europa y la UE responde", "Recompra acciones y sube el dinero para el accionista"])
        self.assertEqual(len(out["t"]), 2)

    def test_sin_clave_no_rompe(self):
        self.escribir("precios.json", {"noticias": {"_region": {"madrid": [{"t": "Ayudas de la Comunidad de Madrid para la compra de vivienda"}]}}})
        out = self.correr()
        self.assertEqual(out["t"], {})

    @unittest.skipUnless((DATOS / "precios.json").exists(), "sin tests/.datos (sh tests/traer-datos.sh)")
    def test_datos_reales(self):
        for f in ("precios.json", "informe.json", "escaneo.json"):
            shutil.copy(DATOS / f, self.tmp / "sal" / f)
        vistos = []

        def falso(lista):
            vistos.extend(lista)
            return ["EN " + x for x in lista]
        out = self.correr(falso)
        self.assertGreater(len(out["t"]), 50, "con los datos de ahora tiene que haber textos que traducir")
        self.assertEqual(len(vistos), len(out["t"]))

    def test_por_lote_todas_las_tandas_van_juntas_y_se_apunta_lo_que_cuestan(self):
        # 0.8.2d: 130 textos son 3 tandas de 60: un solo lote, y cada tanda con su coste (a mitad de precio)
        self.escribir("precios.json", {"noticias": {"mercado": [{"t": f"El Ibex 35 sube por la banca y las eléctricas, día {i}"} for i in range(130)]}})
        out = self.correr(lambda lista: ["EN " + x for x in lista], lotes=True)
        self.assertEqual(self.lotes, [3])
        self.assertEqual(len(out["t"]), 130)
        uso = [x for x in out["uso"] if x["que"] == "traducir"]
        self.assertEqual(len(uso), 3)
        self.assertTrue(all(x["lote"] and x["m"] == "claude-haiku-5-5" for x in uso))
        self.assertAlmostEqual(uso[0]["coste"], (100 * 0.10 + 80 * 0.50) / 1e6 / 2)

    def test_si_el_lote_no_sale_sigue_en_directo(self):
        hechas = []

        def lote_que_falla(tandas, clave=None):
            raise T.Parar("el lote no ha salido")

        def directo(tanda, clave=None):
            hechas.append(len(tanda))
            return ["EN " + x for x in tanda]
        textos = [f"Texto número {i} de la prueba para la traducción" for i in range(70)]
        hecho, dudosos, solos = T.traducir_todo(textos, None, llamar=directo, lote=lote_que_falla)
        self.assertEqual(len(hecho), 70)
        self.assertEqual(hechas, [60, 10])

    def test_una_tanda_del_lote_que_no_cuadra_se_parte(self):
        vueltas = []

        def lote(tandas, clave=None):
            vueltas.append([len(t) for t in tandas])
            return [None if len(t) == 60 else ["EN " + x for x in t] for t in tandas]
        textos = [f"Texto número {i} de la prueba para la traducción" for i in range(60)]
        hecho, dudosos, solos = T.traducir_todo(textos, None, lote=lote)
        self.assertEqual(vueltas, [[60], [30, 30]])
        self.assertEqual(len(hecho), 60)


if __name__ == "__main__":
    unittest.main()
