"""Pruebas de scripts/traducir.py con datos de verdad (tests/.datos/datos, ver tests/traer-datos.sh) y sin Gemini.

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

    def correr(self, llamar=None):
        """llamar(lista) -> traducciones: hace de Gemini (se le pasa lo que pide traducir.py en cada tanda)"""
        os.environ["GEMINI_API_KEY"] = "prueba" if llamar else ""
        viejo = T.I.gemini_modelo

        def gemini_falso(cuerpo, clave, modelo):
            pide = cuerpo["contents"][0]["parts"][0]["text"]
            lista = json.loads(pide.split("Textos:\n", 1)[1])
            return {"candidates": [{"content": {"parts": [{"text": json.dumps({"t": llamar(lista)})}]}}]}
        T.I.gemini_modelo = gemini_falso
        try:
            T.main(str(RAIZ / "instrumentos.json"), str(self.tmp / "ant"), str(self.tmp / "sal"))
        finally:
            T.I.gemini_modelo = viejo
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


if __name__ == "__main__":
    unittest.main()
