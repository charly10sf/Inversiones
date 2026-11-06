"""6 nov 2026: la IA del radar lee unas 400 empresas por pasada, en peticiones de 50 dentro de un solo lote de la API por
lotes de Anthropic (mitad de precio). Cada petición lleva como mucho 50 empresas (Haiku cobra más con 100.000 tokens de
entrada en una sola petición), lo que no sale se parte y va en otro lote, y las más antiguas van primero.
Sin red: las peticiones se imitan.

Uso: python3 -m unittest discover -s tests/scripts
"""
import json
import os
import re
import sys
import unittest
import urllib.error
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import informe as I  # noqa: E402


def lectura_de(simbolos):
    return json.dumps({s: {"imp": "positivo", "rel": 1, "txt": f"lectura de {s}", "cat": "", "fuentes": [1], "tit": {}, "fa": {}} for s in simbolos})


def mensaje(simbolos):
    return {"model": "claude-haiku-5-5", "content": [{"type": "text", "text": lectura_de(simbolos)}], "stop_reason": "end_turn",
            "usage": {"input_tokens": 46000, "output_tokens": 17000}}


def simbolos_de(texto):
    return re.findall(r"^## (\S+)", texto, re.M)


def empresas(n):
    valores = [{"s": f"E{i}", "n": f"Empresa {i}", "p": 1.0, "m": "EUR", "pot": 1, "sector": "x", "z": "España"} for i in range(n)]
    cache = {f"E{i}": {"n": [{"t": f"titular {i}", "u": f"https://ejemplo.es/{i}", "d": "2026-11-06", "f": "Prensa"}]} for i in range(n)}
    return valores, cache


class LotesVarios(unittest.TestCase):
    def setUp(self):
        self.guardado = (I.peticion_claude_get, I.peticion_claude, I.time.sleep, I.CLAUDE_LOTES, I.LOTE_LECTURA_LOTES, I.TANDA_MAX_CARACTERES)
        self.env = dict(os.environ)
        I.time.sleep = lambda s: None
        I.CLAUDE_LOTES = True
        I.LOTES_APAGADOS[0] = False
        I.CLAUDE_APAGADO = False
        I.USO.clear(); I.CLAUDE_ERRORES.clear()
        os.environ["ANTHROPIC_RADAR_KEY"] = "k"
        self.lotes = []      # cada lote: la lista de peticiones (id, símbolos)
        self.fallan = set()  # símbolos que el lote no devuelve la primera vez
        self.directas = []

    def tearDown(self):
        (I.peticion_claude_get, I.peticion_claude, I.time.sleep, I.CLAUDE_LOTES, I.LOTE_LECTURA_LOTES, I.TANDA_MAX_CARACTERES) = self.guardado
        I.LOTES_APAGADOS[0] = False
        I.CLAUDE_APAGADO = False
        I.USO.clear(); I.CLAUDE_ERRORES.clear()
        os.environ.clear(); os.environ.update(self.env)

    def lote_imitado(self, devolver=None, caer=False):
        """Imita la API por lotes: acaba al instante y contesta cada petición con todas sus empresas menos las de self.fallan
        (una sola vez). `devolver(id, simbolos)` puede cambiar el resultado de una petición."""
        pendientes = {}

        def get(ruta, clave, metodo="GET", cuerpo=None, texto=False):
            if metodo == "POST" and ruta.endswith("/batches"):
                if caer:
                    raise urllib.error.URLError("sin red")
                peticiones = [(r["custom_id"], simbolos_de(r["params"]["messages"][0]["content"]), r["params"]) for r in cuerpo["requests"]]
                for _, _, params in peticiones:
                    self.assertEqual(params["model"], "claude-haiku-5-5")
                    self.assertEqual(params["thinking"], {"type": "disabled"})
                self.lotes.append([(i, s) for i, s, _ in peticiones])
                pendientes["b1"] = peticiones
                return {"id": "b1", "processing_status": "in_progress"}
            if ruta.endswith("/results"):
                lineas = []
                for i, simbolos, _ in pendientes["b1"]:
                    vistos = [s for s in simbolos if s not in self.fallan]
                    res = devolver(i, simbolos) if devolver else {"type": "succeeded", "message": mensaje(vistos)}
                    lineas.append(json.dumps({"custom_id": i, "result": res}))
                self.fallan.clear()
                return "\n".join(lineas) + "\n"
            return {"id": "b1", "processing_status": "ended", "results_url": "https://api.anthropic.com/v1/messages/batches/b1/results"}
        I.peticion_claude_get = get

    def test_120_empresas_van_en_un_lote_de_tres_peticiones_de_50_como_mucho(self):
        self.lote_imitado()
        valores, cache = empresas(120)
        lectura = {}
        n = I.leer_lote(lectura, cache, valores, {})
        self.assertEqual(n, 120)
        self.assertEqual(len(lectura), 120)
        self.assertEqual(len(self.lotes), 1)
        self.assertEqual([len(s) for _, s in self.lotes[0]], [50, 50, 20])
        self.assertTrue(all(len(s) <= I.LOTE_LECTURA for _, s in self.lotes[0]))
        self.assertTrue(all(u.get("lote") for u in I.USO))
        self.assertEqual(len(I.USO), 3)

    def test_lo_que_no_viene_se_parte_y_va_en_otro_lote(self):
        self.lote_imitado()
        self.fallan = {"E5", "E70"}
        valores, cache = empresas(120)
        lectura = {}
        n = I.leer_lote(lectura, cache, valores, {})
        self.assertEqual(n, 120)
        self.assertEqual(len(self.lotes), 2)
        repaso = sorted(s for _, ss in self.lotes[1] for s in ss)
        self.assertEqual(repaso, ["E5", "E70"])
        self.assertIn("E5", lectura)
        self.assertIn("E70", lectura)

    def test_una_peticion_entera_que_falla_se_reparte_en_mitades(self):
        def devolver(i, simbolos):
            if i == "t1" and not self.lotes[1:]:  # la segunda petición del primer lote
                return {"type": "errored", "error": {"type": "overloaded_error"}}
            return {"type": "succeeded", "message": mensaje(simbolos)}
        self.lote_imitado(devolver)
        valores, cache = empresas(120)
        lectura = {}
        n = I.leer_lote(lectura, cache, valores, {})
        self.assertEqual(n, 120)
        self.assertEqual([len(s) for _, s in self.lotes[1]], [25, 25])

    def test_van_primero_las_de_las_carteras_luego_las_nunca_leidas_y_luego_las_mas_antiguas(self):
        self.lote_imitado()
        I.LOTE_LECTURA_LOTES = 4
        valores, cache = empresas(8)
        lectura = {
            "E0": {"d": "2026-11-05T10:00:00+00:00", "h": "viejo"},
            "E3": {"d": "2026-11-01T10:00:00+00:00", "h": "viejo"},
            "E4": {"d": "2026-11-03T10:00:00+00:00", "h": "viejo"},
            "E6": {"d": "2026-11-02T10:00:00+00:00", "h": "viejo"},
        }
        I.leer_lote(lectura, cache, valores, {}, None, tuyas={"E7"})
        leidas = [s for _, ss in self.lotes[0] for s in ss]
        # E7 (de una cartera), luego las que nunca se han leído (E1, E2, E5) y las demás quedan para otra pasada
        self.assertEqual(sorted(leidas), ["E1", "E2", "E5", "E7"])
        self.assertEqual(leidas[0], "E7")
        # la pasada siguiente sigue con las leídas hace más tiempo: E3, E6, E4, E0 (E0 ya tiene lectura nueva si no se tocó)
        I.LOTE_LECTURA_LOTES = 3
        self.lotes.clear()
        I.leer_lote(lectura, cache, valores, {}, None, tuyas=set())
        leidas = [s for _, ss in self.lotes[0] for s in ss]
        self.assertEqual(leidas, ["E3", "E6", "E4"])

    def test_una_peticion_demasiado_grande_se_parte_antes_de_mandarla(self):
        self.lote_imitado()
        I.TANDA_MAX_CARACTERES = 800
        valores, cache = empresas(10)
        lectura = {}
        n = I.leer_lote(lectura, cache, valores, {})
        self.assertEqual(n, 10)
        self.assertGreater(len(self.lotes[0]), 1)
        self.assertEqual(sum(len(s) for _, s in self.lotes[0]), 10)

    def test_si_el_lote_no_sale_se_lee_una_tanda_en_directo(self):
        self.lote_imitado(caer=True)
        I.peticion_claude = lambda cuerpo, clave: (self.directas.append(simbolos_de(cuerpo["messages"][0]["content"])), mensaje(simbolos_de(cuerpo["messages"][0]["content"])))[1]
        valores, cache = empresas(120)
        lectura = {}
        n = I.leer_lote(lectura, cache, valores, {})
        self.assertEqual(n, 50)
        self.assertTrue(I.LOTES_APAGADOS[0])
        self.assertEqual(len(self.directas), 1)
        self.assertEqual(len(self.directas[0]), 50)

    def test_sin_clave_de_claude_no_se_lee_nada(self):
        # 0.8.2d: sin Gemini de reserva; sin la clave del radar, main() ni siquiera llama a leer_lote, y si se le llama no lee
        os.environ.pop("ANTHROPIC_RADAR_KEY", None)
        I.peticion_claude_get = lambda *a, **k: self.fail("no debe usar la API por lotes")
        I.peticion_claude = lambda *a, **k: self.fail("no debe llamar a Claude")
        valores, cache = empresas(120)
        with self.assertRaises(RuntimeError):
            I.leer_lote({}, cache, valores, {})

    def test_con_la_clave_mala_se_apaga_claude_y_no_se_lee_nada(self):
        def get(ruta, clave, metodo="GET", cuerpo=None, texto=False):
            raise urllib.error.HTTPError(I.CLAUDE_API, 401, "no", {}, None)
        I.peticion_claude_get = get
        I.peticion_claude = lambda *a, **k: self.fail("con la clave mala, nada en directo")
        valores, cache = empresas(60)
        with self.assertRaises(RuntimeError):
            I.leer_lote({}, cache, valores, {})
        self.assertTrue(I.CLAUDE_APAGADO)


class VariasPeticiones(unittest.TestCase):
    def test_mensajes_por_lote_devuelve_none_en_las_que_fallan_y_cancela_lo_que_no_acaba(self):
        guardado = (I.peticion_claude_get, I.time.sleep, I.CLAUDE_ESPERA_LOTE)
        I.time.sleep = lambda s: None
        llamadas = []
        estados = iter(["in_progress", "canceling", "ended"])

        def get(ruta, clave, metodo="GET", cuerpo=None, texto=False):
            llamadas.append((metodo, ruta))
            if metodo == "POST" and ruta.endswith("/batches"):
                self.assertEqual([r["custom_id"] for r in cuerpo["requests"]], ["a", "b"])
                return {"id": "b9", "processing_status": "in_progress"}
            if ruta.endswith("/results"):
                return json.dumps({"custom_id": "a", "result": {"type": "succeeded", "message": mensaje(["X"])}}) + "\n" + json.dumps({"custom_id": "b", "result": {"type": "canceled"}}) + "\n"
            if ruta.endswith("/cancel"):
                return {"id": "b9", "processing_status": "canceling"}
            return {"id": "b9", "processing_status": next(estados), "results_url": "https://api.anthropic.com/v1/messages/batches/b9/results"}
        I.peticion_claude_get = get
        I.CLAUDE_ESPERA_LOTE = -1  # no da tiempo: se cancela y se aprovecha lo que haya salido
        try:
            r = I.mensajes_por_lote({"a": {"model": "m"}, "b": {"model": "m"}}, "k")
        finally:
            I.peticion_claude_get, I.time.sleep, I.CLAUDE_ESPERA_LOTE = guardado
        self.assertIsNotNone(r["a"])
        self.assertIsNone(r["b"])
        self.assertIn(("POST", "/v1/messages/batches/b9/cancel"), llamadas)


if __name__ == "__main__":
    unittest.main()
