"""0.8.3: las fichas en dos archivos. fichas.json lleva los temas, «sin» y las empresas del núcleo (radar.json y las
carteras); fichas-mas.json, el resto. Al leer la pasada anterior se juntan, y un fichas.json viejo, sin partir, vale.

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

HOY = dt.datetime.now(dt.timezone.utc).isoformat()


def ficha(txt):
    return {"n": txt, "d": HOY, "fa": {"negocio": {"s": "+", "p": 2, "txt": txt, "d": HOY}}, "tit": {}}


def todas():
    return {"v": 1, "generado": HOY, "e": {"SAN.MC": ficha("a"), "AAPL": ficha("b"), "NRG": ficha("c"), "WDC": ficha("d")},
            "temas": [{"k": "bce", "fa": "macro", "txt": "Tipos", "d": HOY, "fuentes": [], "afecta": []}], "sin": {"XYZ": "huella"}}


class Partir(unittest.TestCase):
    def test_las_fuentes_de_cada_empresa_sin_titulo_ni_fecha(self):
        fuentes = [{"t": "Santander gana más", "u": "https://ejemplo.es/1", "f": "Expansión", "d": HOY}]
        fichas = F.nuevas()
        F.aplicar_lectura(fichas, "SAN.MC", {"fa": {"negocio": {"s": "+", "p": 2, "txt": "Gana más.", "fuentes": [1]}}}, fuentes, HOY)
        self.assertEqual(fichas["e"]["SAN.MC"]["fa"]["negocio"]["fuentes"], [{"u": "https://ejemplo.es/1", "f": "Expansión"}])
        # las que ya estaban guardadas con título y fecha se recortan al podar; los temas siguen con su título
        viejo = {"e": {"AAPL": {"d": HOY, "fa": {"negocio": {"s": "+", "p": 1, "txt": "x", "d": HOY, "fuentes": fuentes}}, "tit": {}}},
                 "temas": [{"k": "bce", "fa": "macro", "txt": "x", "d": HOY, "fuentes": fuentes, "afecta": []}]}
        F.podar(viejo, None)
        self.assertEqual(viejo["e"]["AAPL"]["fa"]["negocio"]["fuentes"], [{"u": "https://ejemplo.es/1", "f": "Expansión"}])
        self.assertEqual(viejo["temas"][0]["fuentes"][0]["t"], "Santander gana más")

    def test_partir_y_juntar(self):
        principal, resto = F.partir(todas(), {"SAN.MC", "AAPL"})
        self.assertEqual(set(principal["e"]), {"SAN.MC", "AAPL"})
        self.assertEqual(set(resto["e"]), {"NRG", "WDC"})
        self.assertEqual(principal["mas"], 2)
        self.assertEqual(principal["mas_s"], ["NRG", "WDC"])
        # los temas y «sin» van solo en el principal
        self.assertEqual(len(principal["temas"]), 1)
        self.assertIn("sin", principal)
        self.assertNotIn("temas", resto)
        junto = F.juntar(principal, resto)
        self.assertEqual(set(junto["e"]), {"SAN.MC", "AAPL", "NRG", "WDC"})
        self.assertNotIn("mas", junto)
        self.assertNotIn("mas_s", junto)
        self.assertEqual(junto["temas"], todas()["temas"])

    def test_juntar_un_archivo_viejo_o_nada(self):
        viejo = todas()
        self.assertEqual(F.juntar(viejo, {})["e"].keys(), viejo["e"].keys())
        self.assertEqual(F.juntar({}, {})["e"], {})
        # si una empresa está en los dos (pasó al núcleo), manda la del principal
        p = {"e": {"AAPL": ficha("nueva")}}
        r = {"e": {"AAPL": ficha("vieja"), "NRG": ficha("c")}}
        self.assertEqual(F.juntar(p, r)["e"]["AAPL"]["n"], "nueva")

    def test_guardar_fichas_escribe_los_dos(self):
        with tempfile.TemporaryDirectory() as d:
            I.guardar_fichas(todas(), d, {"SAN.MC", "AAPL", "NRG", "WDC"}, {"SAN.MC", "AAPL"})
            principal = json.loads(Path(d, "fichas.json").read_text(encoding="utf-8"))
            resto = json.loads(Path(d, "fichas-mas.json").read_text(encoding="utf-8"))
            self.assertEqual(set(principal["e"]), {"SAN.MC", "AAPL"})
            self.assertEqual(principal["mas"], 2)
            self.assertEqual(set(resto["e"]), {"NRG", "WDC"})
            self.assertEqual(resto["generado"], principal["generado"])
            # la siguiente pasada lo vuelve a juntar sin perder ninguna
            self.assertEqual(len(F.juntar(principal, resto)["e"]), 4)

    def test_si_falta_el_resto_de_antes_no_se_guardan(self):
        """Revisión aparte: con «mas» en el fichas.json anterior y sin fichas-mas.json, guardar perdería el resto."""
        with tempfile.TemporaryDirectory() as ant, tempfile.TemporaryDirectory() as sal:
            principal, _ = F.partir(todas(), {"SAN.MC", "AAPL"})
            Path(ant, "fichas.json").write_text(json.dumps(principal), encoding="utf-8")
            Path(ant, "fichas-mas.json").write_text("", encoding="utf-8")   # como lo deja «git show … > archivo || true»
            Path(sal, "radar.json").write_text(json.dumps({"valores": [{"s": "SAN.MC"}, {"s": "AAPL"}]}), encoding="utf-8")
            inst = Path(ant, "instrumentos.json"); inst.write_text(json.dumps({"instrumentos": []}), encoding="utf-8")
            viejos = (I.actualizar_noticias, I.noticias_de_carteras, I.informe_cartera)
            I.actualizar_noticias = lambda *a, **k: None
            I.noticias_de_carteras = lambda *a, **k: None
            I.informe_cartera = lambda *a, **k: None
            try:
                I.main(str(inst), ant, sal)
            finally:
                I.actualizar_noticias, I.noticias_de_carteras, I.informe_cartera = viejos
            self.assertFalse(Path(sal, "fichas.json").exists())
            self.assertFalse(Path(sal, "fichas-mas.json").exists())

    def test_sin_nucleo_todo_en_uno(self):
        with tempfile.TemporaryDirectory() as d:
            I.guardar_fichas(todas(), d, None)
            principal = json.loads(Path(d, "fichas.json").read_text(encoding="utf-8"))
            self.assertEqual(len(principal["e"]), 4)
            self.assertNotIn("mas", principal)
            self.assertFalse(Path(d, "fichas-mas.json").exists())


if __name__ == "__main__":
    unittest.main()
