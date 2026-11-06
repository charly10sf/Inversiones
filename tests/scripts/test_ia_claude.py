"""0.8.2d (6 nov 2026, «todo con Claude»): la IA de la Action es solo Claude (Haiku 5.5, clave ANTHROPIC_RADAR_KEY del
workspace «Toisón radar»), sin Gemini ni reserva; lo que no corre prisa, por la API por lotes (mitad de precio). Cada
llamada queda apuntada con lo que ha costado en escaneo.json → ia.uso. Sin red: las peticiones se imitan.

Uso: python3 -m unittest discover -s tests/scripts
"""
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import informe as I  # noqa: E402

CLA = {"model": "claude-haiku-5-5", "content": [{"type": "text", "text": "{\"de\": \"claude\"}"}], "stop_reason": "end_turn",
       "usage": {"input_tokens": 900, "cache_read_input_tokens": 100, "output_tokens": 300}}


def p():
    return I.pedido("Eres el radar.", "Lee esto.", 50000, json_=True)


class Base(unittest.TestCase):
    def setUp(self):
        self.guardado = (I.peticion_claude, I.peticion_claude_get, I.time.sleep, I.CLAUDE_LOTES, I.CLAUDE_ESPERA_SUELTA, I.material)
        self.env = dict(os.environ)
        I.time.sleep = lambda s: None
        I.CLAUDE_LOTES = False
        I.LOTES_APAGADOS[0] = False
        I.USO.clear(); I.CLAUDE_ERRORES.clear(); I.CLAUDE_APAGADO = False
        os.environ["ANTHROPIC_RADAR_KEY"] = "k"
        self.llamadas = []

    def tearDown(self):
        (I.peticion_claude, I.peticion_claude_get, I.time.sleep, I.CLAUDE_LOTES, I.CLAUDE_ESPERA_SUELTA, I.material) = self.guardado
        I.LOTES_APAGADOS[0] = False
        I.USO.clear(); I.CLAUDE_ERRORES.clear(); I.CLAUDE_APAGADO = False
        os.environ.clear(); os.environ.update(self.env)

    def lote(self, tipo="succeeded", acaba=True, mensaje=CLA):
        estados = iter(["in_progress", "ended"] if acaba else ["in_progress"] * 50)

        def get(ruta, clave, metodo="GET", cuerpo=None, texto=False):
            self.llamadas.append((metodo, ruta))
            if metodo == "POST" and ruta.endswith("/batches"):
                self.pedido_lote = cuerpo["requests"][0]["params"]
                return {"id": "b1", "processing_status": "in_progress"}
            if ruta.endswith("/results"):
                res = {"type": tipo, "message": mensaje} if tipo == "succeeded" else {"type": tipo, "error": {"type": "overloaded_error"}}
                return json.dumps({"custom_id": "radar", "result": res}) + "\n"
            if ruta.endswith("/cancel"):
                return {}
            return {"id": "b1", "processing_status": next(estados), "results_url": "https://api.anthropic.com/v1/messages/batches/b1/results"}
        I.peticion_claude_get = get


class Pedido(Base):
    def test_sin_pensar_por_defecto_y_pensando_en_el_informe_y_la_decision(self):
        x = p()
        self.assertEqual((x["model"], x["max_tokens"], x["thinking"]), ("claude-haiku-5-5", 32000, {"type": "disabled"}))
        self.assertIn("Responde solo con un JSON", x["system"])
        self.assertNotIn("tools", x)
        y = I.pedido("Eres el analista.", "Decide.", 32768, pensar=True, buscar=3)
        self.assertNotIn("thinking", y)
        self.assertEqual(y["output_config"], {"effort": "medium"})
        self.assertEqual(y["tools"], [{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}])

    def test_coste_con_el_precio_de_anthropic(self):
        self.assertAlmostEqual(I.coste("claude-haiku-5-5", 1e5, 1e6), 0.51)
        self.assertAlmostEqual(I.coste("claude-haiku-5-5", 1e5, 1e6, lote=True), 0.255)
        # Haiku, con más de 100.000 de entrada en UNA petición, cobra el tramo alto
        self.assertAlmostEqual(I.coste("claude-haiku-5-5", 200000, 0), 0.10)
        self.assertAlmostEqual(I.coste("claude-haiku-5-5", 1000, 0, busquedas=2), 0.0201)


class Llamada(Base):
    def test_en_directo_y_se_apunta_con_su_coste(self):
        vistos = []
        I.peticion_claude = lambda cuerpo, clave: (vistos.append((cuerpo, clave)), CLA)[1]
        r = I.ia(p(), "leer_temas", lote=False)
        self.assertEqual(json.loads(I.texto_de(r)[0])["de"], "claude")
        self.assertEqual(vistos[0][1], "k")
        u = I.USO[-1]
        self.assertEqual((u["m"], u["que"], u["in"], u["cache"], u["out"], u["lote"]), ("claude-haiku-5-5", "leer_temas", 1000, 100, 300, False))
        self.assertAlmostEqual(u["coste"], (1000 * 0.10 + 300 * 0.50) / 1e6)

    def test_sin_clave_no_llama_y_lanza(self):
        os.environ.pop("ANTHROPIC_RADAR_KEY", None)
        I.peticion_claude = lambda *a: self.fail("sin clave no se llama")
        with self.assertRaises(RuntimeError):
            I.ia(p(), "x", lote=False)

    def test_por_lote_a_mitad_de_precio(self):
        I.CLAUDE_LOTES = True
        self.lote()
        I.peticion_claude = lambda *a: self.fail("no debe pedir en directo")
        I.ia(p(), "decidir")
        self.assertTrue(I.USO[-1]["lote"])
        self.assertAlmostEqual(I.USO[-1]["coste"], (1000 * 0.10 + 300 * 0.50) / 1e6 / 2)
        self.assertEqual(self.llamadas[0], ("POST", "/v1/messages/batches"))
        self.assertEqual(self.pedido_lote["thinking"], {"type": "disabled"})

    def test_si_el_lote_no_termina_se_cancela_y_va_en_directo(self):
        I.CLAUDE_LOTES = True
        I.CLAUDE_ESPERA_SUELTA = -1
        self.lote(acaba=False)
        I.peticion_claude = lambda cuerpo, clave: CLA
        I.ia(p(), "informe_cartera")
        self.assertIn(("POST", "/v1/messages/batches/b1/cancel"), self.llamadas)
        self.assertTrue(I.LOTES_APAGADOS[0])
        self.assertFalse(I.USO[-1]["lote"])

    def test_si_el_lote_da_error_va_en_directo(self):
        I.CLAUDE_LOTES = True
        self.lote(tipo="errored")
        I.peticion_claude = lambda cuerpo, clave: CLA
        I.ia(p(), "leer_temas")
        self.assertTrue(I.LOTES_APAGADOS[0])
        self.assertFalse(I.USO[-1]["lote"])

    def test_saturado_reintenta(self):
        veces = []

        def a_veces(cuerpo, clave):
            veces.append(1)
            if len(veces) == 1:
                raise urllib.error.HTTPError(I.CLAUDE_API, 529, "saturado", {}, io.BytesIO(b"overloaded"))
            return CLA
        I.peticion_claude = a_veces
        I.ia(p(), "x", lote=False)
        self.assertEqual(len(veces), 2)

    def test_clave_mala_o_sin_saldo_apaga_claude_para_la_pasada(self):
        for codigo, cuerpo in [(401, b"invalid x-api-key"), (400, b"Your credit balance is too low"), (429, b"You have reached your usage limit")]:
            I.CLAUDE_APAGADO = False
            veces = []

            def falla(c, clave):
                veces.append(1)
                raise urllib.error.HTTPError(I.CLAUDE_API, codigo, "no", {}, io.BytesIO(cuerpo))
            I.peticion_claude = falla
            with self.assertRaises(RuntimeError):
                I.ia(p(), "leer_lote", lote=False)
            self.assertTrue(I.CLAUDE_APAGADO, codigo)
            self.assertEqual(len(veces), 1, codigo)
            # y lo siguiente de la pasada ni lo intenta
            with self.assertRaises(RuntimeError):
                I.ia(p(), "informe_cartera", lote=False)
            self.assertEqual(len(veces), 1)
        self.assertTrue(any(e.startswith("leer_lote:") for e in I.CLAUDE_ERRORES))

    def test_pensando_sin_sitio_repite_sin_pensar(self):
        vacia = {"model": "claude-haiku-5-5", "content": [{"type": "thinking", "thinking": "…"}], "stop_reason": "max_tokens", "usage": {"input_tokens": 10, "output_tokens": 32000}}
        vistos = []
        I.peticion_claude = lambda cuerpo, clave: (vistos.append(cuerpo), vacia if len(vistos) == 1 else CLA)[1]
        I.ia(I.pedido("s", "t", 32768, pensar=True), "decidir", lote=False)
        self.assertEqual(len(vistos), 2)
        self.assertIn("output_config", vistos[0])
        self.assertEqual(vistos[1]["thinking"], {"type": "disabled"})
        self.assertNotIn("output_config", vistos[1])

    def test_una_respuesta_vacia_sin_pensar_es_un_fallo(self):
        I.peticion_claude = lambda cuerpo, clave: {"model": "m", "content": [], "stop_reason": "end_turn", "usage": {}}
        with self.assertRaises(RuntimeError):
            I.ia(p(), "leer_temas", lote=False)
        self.assertIn("respuesta vacía", I.CLAUDE_ERRORES[-1])


class Informe(Base):
    def setUp(self):
        super().setUp()
        I.material = lambda instrumentos, precios, radar: ("Noticias de prueba.", [{"t": "Titular", "u": "https://ejemplo.es/1", "f": "EFE"}])
        self.dir = tempfile.TemporaryDirectory()
        self.ant, self.sal = Path(self.dir.name, "ant"), Path(self.dir.name, "sal")
        self.ant.mkdir(); self.sal.mkdir()
        (self.sal / "precios.json").write_text("{}")
        self.inst = Path(self.dir.name, "instrumentos.json")
        self.inst.write_text('{"instrumentos": []}')

    def tearDown(self):
        self.dir.cleanup()
        super().tearDown()

    def respuesta(self, extra=None):
        texto = json.dumps({"resumen": "Todo en orden.", "posiciones": {"x": {"txt": "bien", "fuentes": [1]}}})
        return {"model": "claude-haiku-5-5", "content": (extra or []) + [{"type": "text", "text": texto}], "stop_reason": "end_turn", "usage": {"input_tokens": 24000, "output_tokens": 5000}}

    def previo(self, horas):
        import datetime as dt
        g = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=horas)).isoformat(timespec="seconds")
        (self.ant / "informe.json").write_text(json.dumps({"generado": g, "modelo": "claude-haiku-5-5", "resumen": "El de antes.", "posiciones": {}}))

    def correr(self):
        I.informe_cartera(str(self.inst), str(self.ant), str(self.sal))
        return json.loads((self.sal / "informe.json").read_text())

    def test_hace_uno_nuevo_con_haiku_pensando_y_sin_buscar(self):
        vistos = []
        I.peticion_claude = lambda cuerpo, clave: (vistos.append(cuerpo), self.respuesta())[1]
        inf = self.correr()
        self.assertEqual((inf["resumen"], inf["modelo"], inf["busqueda"]), ("Todo en orden.", "claude-haiku-5-5", False))
        self.assertEqual(inf["posiciones"]["x"]["fuentes"][0]["u"], "https://ejemplo.es/1")
        self.assertNotIn("tools", vistos[0])
        self.assertEqual(vistos[0]["output_config"], {"effort": "medium"})
        self.assertEqual(I.USO[-1]["que"], "informe_cartera")

    def test_con_busqueda_las_webs_van_de_fuentes(self):
        os.environ["INFORME_BUSQUEDA"] = "1"
        I.BUSQUEDA = True
        try:
            web = [{"type": "server_tool_use", "id": "s1", "name": "web_search", "input": {"query": "bolsa"}},
                   {"type": "web_search_tool_result", "tool_use_id": "s1", "content": [{"type": "web_search_result", "url": "https://prensa.es/a", "title": "Lo de hoy"}]}]
            vistos = []
            I.peticion_claude = lambda cuerpo, clave: (vistos.append(cuerpo), self.respuesta(web))[1]
            inf = self.correr()
        finally:
            I.BUSQUEDA = False
        self.assertEqual(vistos[0]["tools"][0]["max_uses"], 3)
        self.assertTrue(inf["busqueda"])
        self.assertEqual(inf["web"], [{"t": "Lo de hoy", "u": "https://prensa.es/a", "f": "Lo de hoy"}])

    def test_uno_de_menos_de_dos_horas_se_queda(self):
        self.previo(1)
        I.peticion_claude = lambda *a: self.fail("no toca")
        self.assertEqual(self.correr()["resumen"], "El de antes.")

    def test_si_falla_la_ia_o_no_hay_clave_se_queda_el_anterior(self):
        self.previo(5)

        def falla(c, clave):
            raise urllib.error.HTTPError(I.CLAUDE_API, 500, "no", {}, io.BytesIO(b"api_error"))
        I.peticion_claude = falla
        self.assertEqual(self.correr()["resumen"], "El de antes.")
        os.environ.pop("ANTHROPIC_RADAR_KEY", None)
        I.peticion_claude = lambda *a: self.fail("sin clave no se llama")
        self.assertEqual(self.correr()["resumen"], "El de antes.")


class Escaneo(Base):
    def test_el_campo_ia_de_escaneo_json(self):
        import datetime as dt
        hace = lambda h: (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=h)).isoformat(timespec="seconds")
        # lo de antes venía en gemini.uso, con Gemini y Claude juntos: solo siguen las de Claude, con su coste
        esc = {"gemini": {"uso": [{"t": hace(1), "m": "gemini-3.5-flash-lite", "que": "leer_lote", "in": 10, "out": 10},
                                  {"t": hace(2), "m": "claude-haiku-5-5", "que": "leer_lote", "in": 32000, "out": 12000, "lote": True},
                                  {"t": hace(50), "m": "claude-haiku-5-5", "que": "leer_lote", "in": 1, "out": 1}]}}
        I.peticion_claude = lambda cuerpo, clave: CLA
        I.ia(p(), "leer_temas", lote=False)
        e = I.estado_ia(esc, True)
        self.assertEqual(sorted(e), ["activo", "apagado", "coste_24h", "errores", "modelos", "ok", "uso"])
        self.assertEqual([x["que"] for x in e["uso"]], ["leer_lote", "leer_temas"])
        self.assertAlmostEqual(e["uso"][0]["coste"], (32000 * 0.10 + 12000 * 0.50) / 1e6 / 2)
        self.assertAlmostEqual(e["coste_24h"], round(e["uso"][0]["coste"] + e["uso"][1]["coste"], 4))
        self.assertTrue(e["ok"] and e["activo"])
        # la pasada siguiente lee ia.uso (y ya no gemini)
        self.assertEqual(len(I.uso_anterior({"ia": {"uso": e["uso"]}, "gemini": {"uso": esc["gemini"]["uso"]}})), 2)
        # sin clave: no activo ni ok
        self.assertFalse(I.estado_ia({}, False)["ok"])

    def test_coste_ia_py_suma_lo_de_la_pasada(self):
        import datetime as dt
        ahora = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
        with tempfile.TemporaryDirectory() as d:
            Path(d, "escaneo.json").write_text(json.dumps({"ia": {"uso": [{"t": ahora, "m": "claude-haiku-5-5", "que": "leer_lote", "in": 32000, "out": 12000, "lote": True, "coste": 0.0046}]}}))
            Path(d, "traduccion-en.json").write_text(json.dumps({"uso": [{"t": ahora, "m": "claude-haiku-5-5", "que": "traducir", "in": 1800, "out": 1500, "lote": True, "coste": 0.0005}]}))
            r = subprocess.run([sys.executable, str(RAIZ / "scripts" / "coste_ia.py"), d], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn("leer_lote: 1 llamadas (1 por lote)", r.stdout)
        self.assertIn("total de la pasada: 0.0051 US$", r.stdout)


if __name__ == "__main__":
    unittest.main()
