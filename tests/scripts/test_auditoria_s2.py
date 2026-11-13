"""13 nov 2026, auditoría de las noticias, las señales y el coste (claude/auditoria-noticias-senales-coste.md): una prueba
por cada fallo corregido. Sin red: las llamadas a Claude se imitan.

Uso: python3 -m unittest discover -s tests/scripts
"""
import datetime as dt
import json
import os
import re
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import coste_ia as C  # noqa: E402
import informe as I  # noqa: E402
import precios as P  # noqa: E402


def ahora(horas=0):
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=horas)).replace(microsecond=0).isoformat()


def empresa(s, nombre, **mas):
    return {"s": s, "n": nombre, "p": 10.0, "m": "EUR", "z": "Europa", "sector": "Industria", "r": "buy", "pot": 30, "na": 12, **mas}


class Base(unittest.TestCase):
    def setUp(self):
        self.guardado = (I.peticion_claude, I.time.sleep, I.CLAUDE_LOTES, I.INICIO, I.PRESUPUESTO)
        self.env = dict(os.environ)
        I.time.sleep = lambda s: None
        I.CLAUDE_LOTES = False
        I.LOTES_APAGADOS[0] = False
        I.USO.clear(); I.CLAUDE_ERRORES.clear(); I.CLAUDE_APAGADO = False
        os.environ["ANTHROPIC_RADAR_KEY"] = "k"
        self.pedidos = []

    def tearDown(self):
        (I.peticion_claude, I.time.sleep, I.CLAUDE_LOTES, I.INICIO, I.PRESUPUESTO) = self.guardado
        I.LOTES_APAGADOS[0] = False
        I.USO.clear(); I.CLAUDE_ERRORES.clear(); I.CLAUDE_APAGADO = False
        os.environ.clear(); os.environ.update(self.env)

    def claude_dice(self, respuesta):
        """Claude contesta `respuesta` (un dict, o una función del texto que recibe) a cada petición en directo."""
        def pedir(cuerpo, clave):
            texto = I.texto_del_pedido(cuerpo)
            self.pedidos.append(texto)
            r = respuesta(texto) if callable(respuesta) else respuesta
            return {"model": "claude-haiku-5-5", "content": [{"type": "text", "text": json.dumps(r)}], "stop_reason": "end_turn",
                    "usage": {"input_tokens": 1000, "output_tokens": 300}}
        I.peticion_claude = pedir


class TiempoDeLaPasada(Base):
    """Fallo 1: la pasada no cabía en sus 20 minutos, se cortaba sin publicar y lo cobrado por Claude se tiraba."""

    def test_la_action_tiene_sitio_para_la_peor_pasada(self):
        yml = (RAIZ / ".github/workflows/precios.yml").read_text(encoding="utf-8")
        total = int(re.search(r"runs-on: ubuntu-latest\n(?:\s*#.*\n)*\s*timeout-minutes: (\d+)", yml).group(1))
        traducir = int(re.search(r"name: Traducir al inglés\n\s*timeout-minutes: (\d+)", yml).group(1))
        # precios.py (hasta 7 min medidos), la IA (su presupuesto más la última cosa que empiece, 5 min), la traducción y publicar
        self.assertGreaterEqual(total, 7 + I.PRESUPUESTO / 60 + 5 + traducir + 2)

    def test_sin_tiempo_no_se_empieza_el_informe_ni_los_temas(self):
        I.INICIO = I.time.time() - I.PRESUPUESTO + 30  # quedan 30 segundos
        self.assertFalse(I.hay_tiempo("informe", I.TIEMPO_INFORME))
        self.claude_dice({"temas": []})
        self.assertEqual(I.leer_temas({"temas": []}, {}, []), 0)
        self.assertEqual(self.pedidos, [])  # ni se piden los titulares ni se llama a Claude

    def test_con_tiempo_si(self):
        I.INICIO = I.time.time()
        self.assertTrue(I.hay_tiempo("informe", I.TIEMPO_INFORME))
        self.assertGreater(I.PRESUPUESTO, I.TIEMPO_DECISION + I.TIEMPO_INFORME)

    def test_sin_tiempo_el_informe_se_queda_con_el_anterior(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            ant, sal = Path(d, "ant"), Path(d, "sal")
            ant.mkdir(); sal.mkdir()
            previo = {"generado": ahora(5), "resumen": "el de antes", "posiciones": {}}
            (ant / "informe.json").write_text(json.dumps(previo), encoding="utf-8")
            inst = Path(d, "instrumentos.json"); inst.write_text('{"instrumentos": []}', encoding="utf-8")
            I.INICIO = I.time.time() - I.PRESUPUESTO  # no queda nada
            self.claude_dice({"posiciones": {}})
            self.assertFalse(I.informe_cartera(str(inst), str(ant), str(sal)))
            self.assertEqual(json.loads((sal / "informe.json").read_text(encoding="utf-8"))["resumen"], "el de antes")
            self.assertEqual(self.pedidos, [])


class FuentesDeLaLectura(Base):
    """Fallos 2 y 6: la lectura enseñaba como fuente titulares que la propia IA marcaba como relleno, y se leían titulares
    que Yahoo cuelga de decenas de empresas."""

    def test_las_fuentes_van_por_peso_y_sin_relleno(self):
        fuentes = [{"t": "Klépierre: transactions in own shares", "u": "https://e/1", "d": "2026-11-13T17:08:00+00:00", "_s": "ADX.MC"},
                   {"t": "Ramsay: general meeting", "u": "https://e/2", "d": "2026-11-13T16:35:00+00:00", "_s": "ADX.MC"},
                   {"t": "Audax se apunta al radar alcista", "u": "https://e/3", "d": "2026-11-13T12:50:00+00:00", "_s": "ADX.MC"},
                   {"t": "Audax eleva los ingresos y recorta un 38% el beneficio", "u": "https://e/4", "d": "2026-11-12T17:57:00+00:00", "_s": "ADX.MC"},
                   {"t": "De otra empresa", "u": "https://e/5", "d": "2026-11-13T18:00:00+00:00", "_s": "OTRA"}]
        r = {"fuentes": [1, 2, 3, 4, 5, "x", 99], "tit": {"1": ["mercado", "=", 0], "2": ["mercado", "=", 0], "3": ["mercado", "+", 1], "4": ["negocio", "±", 2], "5": ["negocio", "+", 3]}}
        nums, dn = I.citadas_por_peso(r, fuentes, "ADX.MC")
        self.assertEqual(nums, [4, 3])                      # la de más peso primero, sin relleno y sin la de otra empresa
        self.assertEqual(dn, "2026-11-12T17:57:00+00:00")   # la última de peso 2 o más, de las suyas

    def test_sin_marcas_se_quedan_las_que_cita(self):
        fuentes = [{"t": "a", "u": "https://e/1", "_s": "X"}, {"t": "b", "u": "https://e/2", "_s": "X"}]
        self.assertEqual(I.citadas_por_peso({"fuentes": [2, 1]}, fuentes, "X"), ([2, 1], None))
        self.assertEqual(I.citadas_por_peso({"fuentes": [1], "tit": {"1": ["mercado", "=", 0]}}, fuentes, "X")[0], [1])  # todo relleno: lo que cite

    def test_la_lectura_guarda_la_fuente_de_peso(self):
        valores = [empresa("ADX.MC", "Audax Renovables, S.A.")]
        cache = {"ADX.MC": {"n": [{"t": "Nota de otra empresa", "u": "https://e/1", "d": "2026-11-13T17:08:00+00:00", "f": "Yahoo Finance"},
                                  {"t": "Audax eleva los ingresos y recorta un 38% el beneficio", "u": "https://e/2", "d": "2026-11-12T17:57:00+00:00", "f": "Expansión"}]}}
        self.claude_dice({"ADX.MC": {"imp": "mixto", "rel": 2, "txt": "Audax ingresa más y gana menos.", "cat": "", "fuentes": [1, 2],
                                     "tit": {"1": ["mercado", "=", 0], "2": ["negocio", "±", 2]}, "fa": {}}})
        lectura = {}
        self.assertEqual(I.leer_lote(lectura, cache, valores, {}), 1)
        self.assertEqual([f["u"] for f in lectura["ADX.MC"]["fuentes"]], ["https://e/2"])
        self.assertNotIn("dn", lectura["ADX.MC"])  # las fechas de «gorda», solo en las de relevancia 3 (escaneo.json lo baja la web)
        self.assertNotIn("g", lectura["ADX.MC"])
        self.assertNotIn("_s", json.dumps(lectura))

    def test_lo_que_yahoo_cuelga_de_muchas_empresas_no_se_lee(self):
        comun = {"t": "AF Gruppen reports strong Q3 profit, revenue growth", "r": "AF Gruppen ASA posted higher profit.", "u": "https://e/af", "d": "2026-11-12T08:00:00+00:00"}
        valores = [empresa(f"E{i}.ST", f"Empresa Número{i} AB") for i in range(I.COMPARTIDA_MIN)] + [empresa("AFG.OL", "AF Gruppen ASA"), empresa("NCC-B.ST", "NCC AB (publ)")]
        cache = {x["s"]: {"n": [dict(comun)]} for x in valores}
        cache["NCC-B.ST"]["n"].append({"t": "NCC wins hospital contract in Sweden", "u": "https://e/ncc", "d": "2026-11-13T08:00:00+00:00"})
        comp = I.compartidas(cache)
        self.assertEqual(comp, {"https://e/af"})
        por = {x["s"]: x for x in valores}
        self.assertEqual(I.propias(cache, por["E0.ST"], comp), [])                                         # no la nombra: fuera
        self.assertEqual(len(I.propias(cache, por["AFG.OL"], comp)), 1)                                    # es la suya: se queda
        self.assertEqual([n["u"] for n in I.propias(cache, por["NCC-B.ST"], comp)], ["https://e/ncc"])    # se queda con la propia
        self.claude_dice(lambda texto: {s: {"imp": "neutral", "rel": 1, "txt": "x", "cat": "", "fuentes": [], "tit": {}, "fa": {}} for s in re.findall(r"^## (\S+)", texto, re.M)})
        lectura = {}
        self.assertEqual(I.leer_lote(lectura, cache, valores, {}), 2)
        self.assertEqual(sorted(lectura), ["AFG.OL", "NCC-B.ST"])
        self.assertNotIn("AF Gruppen", self.pedidos[0].split("## NCC-B.ST")[1].split("##")[0])

    def test_un_titular_con_el_mismo_texto_y_otro_enlace_no_es_compartido(self):
        # «Transaction in Own Shares» es el título de la nota de cada empresa: mismo texto, distinto enlace
        valores = [empresa(f"E{i}.L", f"Empresa Número{i} plc") for i in range(I.COMPARTIDA_MIN + 2)]
        cache = {x["s"]: {"n": [{"t": "Transaction in Own Shares", "u": f"https://e/{i}", "d": "2026-11-12"}]} for i, x in enumerate(valores)}
        self.assertEqual(I.compartidas(cache), set())
        self.assertEqual(len(I.propias(cache, valores[0], set())), 1)

    def test_nombra_por_nombre_o_por_ticker(self):
        self.assertTrue(I.nombra(empresa("BT-A.L", "BT Group plc"), {"t": "BT Group H1 Earnings Call Highlights"}))
        self.assertTrue(I.nombra(empresa("CFR.SW", "Compagnie Financière Richemont SA"), {"t": "Richemont shares slide 8%"}))
        self.assertTrue(I.nombra(empresa("OHB.DE", "OHB SE"), {"t": "What OHB (OHB) Said on Its Q3 Earnings Call"}))
        self.assertFalse(I.nombra(empresa("MELE.BR", "Melexis NV"), {"t": "Novartis eyes Rhapsido’s broader use", "r": "Novartis will now approach regulators."}))
        self.assertFalse(I.nombra(empresa("IF.MI", "Banca IFIS S.p.A."), {"t": "What to do if rates rise", "r": "if you hold bonds"}))  # «if» no es el ticker IF


class IdeasFueraDelNucleo(Base):
    """Fallo 3: una idea que pasaba de radar.json a radar-mas.json se quedaba para siempre sin que nadie la mirara."""

    def test_la_idea_del_radar_ampliado_entra_en_la_decision(self):
        nucleo = [empresa("WDC", "Western Digital")]
        todas = nucleo + [empresa("SZG.DE", "Salzgitter AG", r="hold"), empresa("OTRA.DE", "Otra AG")]
        decision = {"generado": ahora(5), "ideas": [{"s": "SZG.DE"}, {"s": "WDC"}], "evitar": [{"s": "NOESTA"}]}
        vd = I.con_ideas_previas(nucleo, todas, decision)
        self.assertEqual([x["s"] for x in vd], ["WDC", "SZG.DE"])
        self.assertEqual(I.con_ideas_previas(nucleo, todas, None), nucleo)

    def test_y_sale_si_se_rompen_sus_numeros(self):
        nucleo = [empresa("WDC", "Western Digital")]
        todas = nucleo + [empresa("SZG.DE", "Salzgitter AG", r="hold")]
        decision = {"generado": ahora(5), "ideas": [{"s": "SZG.DE", "n": "Salzgitter"}, {"s": "WDC", "n": "WD"}]}
        # antes: con solo el núcleo, Salzgitter era «un fallo de datos» y seguía
        self.assertEqual([i["s"] for i in I.revisar(decision, {}, nucleo)["ideas"]], ["SZG.DE", "WDC"])
        d = I.revisar(decision, {}, I.con_ideas_previas(nucleo, todas, decision))
        self.assertEqual([i["s"] for i in d["ideas"]], ["WDC"])
        self.assertEqual(d["cambios"][0]["motivo"], "los analistas ya no dicen comprar")


class NoticiaGorda(Base):
    """Fallo 4: una noticia que la decisión ya había visto pasaba por nueva al releer la empresa por un titular de relleno."""

    def setUp(self):
        super().setUp()
        self.decision = I.cuando(ahora(10))

    def test_releida_sin_noticia_de_peso_nueva_no_es_nueva(self):
        lectura = {"X": {"d": ahora(1), "g": ahora(30), "dn": ahora(28), "rel": 3, "imp": "negativo"}}
        self.assertFalse(I.gorda(lectura, "X", self.decision))
        self.assertTrue(I.gorda(lectura, "X"))  # sigue siendo gorda: solo que no es nueva

    def test_con_noticia_de_peso_posterior_si(self):
        lectura = {"X": {"d": ahora(1), "g": ahora(30), "dn": ahora(2), "rel": 3, "imp": "negativo"}}
        self.assertTrue(I.gorda(lectura, "X", self.decision))

    def test_si_pasa_a_gorda_despues_de_la_decision_si_aunque_la_noticia_sea_anterior(self):
        lectura = {"X": {"d": ahora(1), "g": ahora(1), "dn": ahora(12), "rel": 3, "imp": "negativo"}}
        self.assertTrue(I.gorda(lectura, "X", self.decision))

    def test_las_lecturas_de_antes_siguen_como_siempre(self):
        self.assertTrue(I.gorda({"X": {"d": ahora(1), "rel": 3, "imp": "negativo"}}, "X", self.decision))
        self.assertFalse(I.gorda({"X": {"d": ahora(11), "rel": 3, "imp": "negativo"}}, "X", self.decision))

    def test_la_lectura_apunta_desde_cuando_es_gorda(self):
        valores = [empresa("X", "Equis Corp")]
        cache = {"X": {"n": [{"t": "Equis cuts guidance", "u": "https://e/1", "d": ahora(40)}, {"t": "Equis: 3 reasons to watch", "u": "https://e/2", "d": ahora(1)}]}}
        primera = ahora(30)
        lectura = {"X": {"d": primera, "h": "vieja", "rel": 3, "imp": "negativo", "txt": "", "fuentes": []}}
        self.claude_dice({"X": {"imp": "negativo", "rel": 3, "txt": "Rebaja su previsión.", "cat": "", "fuentes": [1], "tit": {"1": ["negocio", "-", 3], "2": ["mercado", "=", 0]}, "fa": {}}})
        I.leer_lote(lectura, cache, valores, {})
        self.assertEqual(lectura["X"]["g"], primera)             # ya lo era: se queda la fecha de entonces
        self.assertEqual(lectura["X"]["dn"], cache["X"]["n"][0]["d"])
        self.assertFalse(I.gorda(lectura, "X", self.decision))   # releída por un titular de relleno: no es nueva
        self.claude_dice({"X": {"imp": "positivo", "rel": 3, "txt": "La compran.", "cat": "", "fuentes": [1], "tit": {}, "fa": {}}})
        cache["X"]["n"].insert(0, {"t": "Equis to be acquired", "u": "https://e/3", "d": ahora(0)})
        I.leer_lote(lectura, cache, valores, {})
        self.assertGreater(lectura["X"]["g"], primera)           # cambia de signo: gorda desde ahora


class DatoQueNoEsDeHoy(Base):
    """Fallo 5: el valor de un fondo, de hace dos días, se le pasaba a la IA como «hoy»."""

    def test_un_fondo_con_valor_de_anteayer_no_dice_hoy(self):
        d = I.precio_y_dia({"precio": 12.593, "variacion_dia": 1.87, "fecha": "2026-11-11"}, hoy="2026-11-13")
        self.assertFalse(any(x.startswith("hoy") for x in d))
        self.assertIn("del 2026-11-11", d[0])
        self.assertIn("no es de hoy", d[1])

    def test_un_precio_de_hoy_si(self):
        self.assertEqual(I.precio_y_dia({"precio": 30.89, "variacion_dia": 3.31, "fecha": "2026-11-13"}, hoy="2026-11-13"), ["precio 30.89 €", "hoy 3.31 %"])
        self.assertEqual(I.precio_y_dia({"precio": 1, "variacion_dia": 0}, hoy="2026-11-13")[1], "hoy 0 %")  # sin fecha, como antes

    def test_el_material_del_informe_lo_lleva_y_el_encargo_lo_explica(self):
        guard = I.noticias_yahoo
        I.noticias_yahoo = lambda s, n=8: []
        try:
            inst = [{"id": "ishares-us", "nombre": "iShares US", "corto": "S&P 500", "tipo": "Fondo indexado"}]
            precios = {"instrumentos": {"ishares-us": {"precio": 12.593, "variacion_dia": 1.87, "fecha": "2020-01-02"}}, "noticias": {}}
            texto, _ = I.material(inst, precios, {})
        finally:
            I.noticias_yahoo = guard
        bloque = texto.split("## Posición ishares-us")[1]
        self.assertIn("del 2020-01-02", bloque)
        self.assertNotIn("hoy 1.87", bloque)
        self.assertIn("no lo llames «hoy»", I.INSTRUCCIONES)


class TendenciaEnLaDecision(Base):
    """Fallo 7: el encargo de la decisión daba por hecha una «tendencia» que las candidatas no traían."""

    def test_la_linea_de_tendencia(self):
        t = I.tendencia_idea({"s": "WDC", "p": 295.11, "v": -5.17, "m50": 394.6368, "m200": 421.8983, "mx": 590.0})
        self.assertEqual(t, "Tendencia: hoy -5.17 %, -25.2 % frente a su media de 50 sesiones, -30.1 % frente a la de 200, -50.0 % desde su máximo de 52 semanas.")
        self.assertEqual(I.tendencia_idea({"s": "X"}), "")
        self.assertIn("? frente a la de 200", I.tendencia_idea({"s": "X", "p": 10, "m50": 9}))

    def test_la_decision_la_recibe(self):
        valores = [empresa("WDC", "Western Digital", r="strong_buy", pot=107.8, na=24, rm=1.5, perf=7.3, v=-5.17, m50=394.6, m200=421.9, mx=590.0, p=295.11,
                           epsg=42.1, roe=30, v0=[10, 10, 4, 0, 0], v3=[8, 9, 6, 0, 1], c1a=97.2)]
        cache = {"WDC": {"n": [{"t": "Western Digital climbs", "u": "https://e/1", "d": ahora(5)}]}}
        lectura = {"WDC": {"d": ahora(2), "rel": 2, "imp": "positivo", "txt": "Sube su previsión."}}
        self.claude_dice({"comentario": "x", "ideas": [], "evitar": [], "cambios": [], "plazos": []})
        I.decidir(lectura, cache, valores, P.per_sector_mediano(valores), set(), {})
        self.assertIn("Tendencia: hoy -5.17 %, -25.2 % frente a su media de 50 sesiones", self.pedidos[0])
        self.assertIn("la acción en 12 meses 97.2 %", self.pedidos[0])  # no «últimos 12 meses» a secas: Haiku lo leía como beneficio
        self.assertIn("línea «Tendencia»", I.DECIDIR)


class ObjetivoImposible(unittest.TestCase):
    """Fallo 8: un precio objetivo en otra unidad daba un recorrido del 1.150 %."""

    def test_un_objetivo_doce_veces_el_precio_no_vale(self):
        self.assertIsNone(P.objetivo_creible(3757.7, 300.5))    # TEM.L, 13 nov
        self.assertIsNone(P.objetivo_creible(3.0, 300.5))
        self.assertEqual(P.objetivo_creible(958.69, 270.6), 958.69)  # Burford: 254 % de recorrido, raro pero posible
        self.assertEqual(P.objetivo_creible(128.3, 91.05), 128.3)
        self.assertIsNone(P.objetivo_creible(None, 10))
        self.assertIsNone(P.objetivo_creible(10, 0))


class CostePorDias(unittest.TestCase):
    """Para medir un sábado y un domingo sin abrir la Console."""

    def test_suma_por_dia_y_por_cosa_y_olvida_lo_viejo(self):
        previo = {"2026-11-13": {"leer_lote": 0.2}, "2026-01-01": {"leer_lote": 9}}
        uso = [{"t": "2026-11-13T20:00:00+00:00", "que": "leer_lote", "coste": 0.03}, {"t": "2026-11-14T00:20:00+00:00", "que": "decidir", "coste": 0.005},
               {"t": "2026-11-14T04:20:00+00:00", "que": "decidir", "coste": 0.001}]
        d = I.coste_por_dias(previo, uso, hoy=dt.date(2026, 11, 14))
        self.assertEqual(d, {"2026-11-13": {"leer_lote": 0.23}, "2026-11-14": {"decidir": 0.006}})
        self.assertEqual(previo["2026-11-13"], {"leer_lote": 0.2})  # no toca lo que recibe

    def test_la_tabla_separa_entre_semana_sabado_y_domingo(self):
        lineas = C.tabla_dias({"2026-11-13": {"leer_lote": 0.3, "traducir": 0.1}, "2026-11-14": {"leer_lote": 0.2}, "2026-11-15": {"leer_lote": 0.1}})
        self.assertIn("2026-11-13 vie  0.4000 US$  (leer_lote 0.300, traducir 0.100)", lineas[0])
        self.assertIn("2026-11-14 sáb", lineas[1])
        self.assertIn("lunes a viernes 0.400 US$ (1 días) · sábado 0.200 US$ (1 días) · domingo 0.100 US$ (1 días)", lineas[3])
        self.assertIn("al mes: unos 9.98 US$", lineas[4])  # 0,4 × 21,7 + (0,2 + 0,1) × 4,35


class AlcanceDeLaTraduccion(unittest.TestCase):
    """La traducción al inglés se puede dejar en lo esencial o parar (TRADUCIR_ALCANCE); por defecto, todo, como siempre."""

    def setUp(self):
        import traducir as T
        self.T = T
        self.env = os.environ.get("TRADUCIR_ALCANCE")
        self.hace_falta = {"El informe de hoy dice que la bolsa sube": 0, "La idea de la semana es esta empresa": 1,
                           "Un titular de la prensa de hoy": 2, "La lectura de una empresa del resto del radar": 3,
                           "Otra lectura que ya está traducida": 3}
        self.t = {T.clave("Otra lectura que ya está traducida"): "Another reading"}

    def tearDown(self):
        os.environ.pop("TRADUCIR_ALCANCE", None)
        if self.env is not None:
            os.environ["TRADUCIR_ALCANCE"] = self.env

    def falta(self, alcance=None):
        return self.T.lo_que_falta(self.hace_falta, self.t, {}, {}, "2026-11-01", alcance)

    def test_por_defecto_todo_como_siempre(self):
        os.environ.pop("TRADUCIR_ALCANCE", None)
        self.assertEqual(len(self.falta()), 4)
        os.environ["TRADUCIR_ALCANCE"] = "una cosa rara"
        self.assertEqual(len(self.falta()), 4)

    def test_esencial_deja_fuera_el_resto_del_radar(self):
        os.environ["TRADUCIR_ALCANCE"] = "Esencial"
        self.assertEqual(self.falta(), ["El informe de hoy dice que la bolsa sube", "La idea de la semana es esta empresa", "Un titular de la prensa de hoy"])

    def test_nada_no_pide_nada(self):
        os.environ["TRADUCIR_ALCANCE"] = "nada"
        self.assertEqual(self.falta(), [])
        self.assertEqual(len(self.falta("todo")), 4)  # el alcance dado a mano manda sobre la variable

    def test_la_action_lo_lee_de_la_variable_del_repositorio(self):
        yml = (RAIZ / ".github/workflows/precios.yml").read_text(encoding="utf-8")
        self.assertIn("TRADUCIR_ALCANCE: ${{ inputs.traduccion || vars.TRADUCIR_ALCANCE || 'todo' }}", yml)


class EnsayoLadoALado(unittest.TestCase):
    """El ensayo guarda lo que sale y, con «comparar», decide con main, con la rama y con otro modelo sobre lo mismo."""

    def test_el_ensayo_no_publica_y_guarda_el_artefacto(self):
        yml = (RAIZ / ".github/workflows/precios.yml").read_text(encoding="utf-8")
        self.assertIn("name: ensayo-pasada", yml)
        self.assertIn("if: ${{ inputs.ensayo && inputs.comparar != '' }}", yml)
        publicar = yml.split("- name: Publicar en la rama datos")[1][:80]
        self.assertIn("if: ${{ !inputs.ensayo }}", publicar)
        # el modelo de «comparar» entra por una variable de entorno, no pegado en la orden
        self.assertNotIn('"${{ inputs.comparar }}"', yml)

    def test_el_script_carga_el_codigo_de_la_carpeta_que_se_le_da(self):
        import subprocess
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            datos, sal = Path(d, "datos"), Path(d, "sal")
            datos.mkdir()
            (datos / "radar.json").write_text('{"valores": []}', encoding="utf-8")
            inst = Path(d, "instrumentos.json"); inst.write_text('{"instrumentos": []}', encoding="utf-8")
            env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_RADAR_KEY"}
            r = subprocess.run([sys.executable, str(RAIZ / "scripts/ensayo_comparar.py"), str(RAIZ / "scripts"), "prueba", str(inst), str(datos), str(sal), "claude-sonnet-5-5", "solo-decision"],
                               capture_output=True, text=True, env=env, timeout=120)
            self.assertEqual(r.returncode, 0, r.stderr[-400:])
            self.assertIn("prueba: en total 0.0000 US$", r.stdout)  # sin clave no gasta ni falla
            self.assertTrue((sal / "uso-prueba.json").exists())


if __name__ == "__main__":
    unittest.main()
