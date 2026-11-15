"""14 nov 2026, auditoría (quinta parte, claude/auditoria-tarde-14nov.md): una prueba por cada cosa. Sin red: las llamadas a
Claude se imitan.

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
import fichas as F  # noqa: E402
import informe as I  # noqa: E402
import precios as P  # noqa: E402


def ahora(horas=0):
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=horas)).replace(microsecond=0).isoformat()


def empresa(s, nombre, **mas):
    return {"s": s, "n": nombre, "p": 10.0, "m": "EUR", "z": "Europa", "sector": "Industria", "r": "buy", "pot": 30, "na": 12, **mas}


def buena(s, nombre, **mas):
    """Una empresa que pasa los números de las «mejores de la web»."""
    return empresa(s, nombre, **{**dict(r="strong_buy", pot=40, na=24, rm=1.5, perf=7.3, v=1, m50=9, m200=8, mx=12, epsg=42.1, roe=30,
                                        v0=[10, 10, 4, 0, 0], v3=[8, 9, 6, 0, 1], c1a=20), **mas})


class Base(unittest.TestCase):
    def setUp(self):
        self.guardado = (I.peticion_claude, I.time.sleep, I.CLAUDE_LOTES, I.INICIO, I.PRESUPUESTO)
        self.env = dict(os.environ)
        I.time.sleep = lambda s: None
        I.CLAUDE_LOTES = False
        I.LOTES_APAGADOS[0] = False
        I.USO.clear(); I.CLAUDE_ERRORES.clear(); I.CLAUDE_APAGADO = False
        os.environ["ANTHROPIC_RADAR_KEY"] = "k"
        os.environ.pop("CLAUDE_DECIDIR_MODELO", None)
        self.pedidos = []

    def tearDown(self):
        (I.peticion_claude, I.time.sleep, I.CLAUDE_LOTES, I.INICIO, I.PRESUPUESTO) = self.guardado
        I.LOTES_APAGADOS[0] = False
        I.USO.clear(); I.CLAUDE_ERRORES.clear(); I.CLAUDE_APAGADO = False
        os.environ.clear(); os.environ.update(self.env)

    def claude_dice(self, respuesta):
        def pedir(cuerpo, clave):
            texto = I.texto_del_pedido(cuerpo)
            self.pedidos.append(texto)
            r = respuesta(texto) if callable(respuesta) else respuesta
            return {"model": "claude-haiku-5-5", "content": [{"type": "text", "text": json.dumps(r)}], "stop_reason": "end_turn",
                    "usage": {"input_tokens": 1000, "output_tokens": 300}}
        I.peticion_claude = pedir


# ------------------------------------------------------------------ 1. la misma nota, en la lectura de las empresas

HBX = empresa("HBX.MC", "HBX Group International plc", z="España")
NOTAS_HBX = [
    {"t": "HBX Group nombra a Carlos Muñoz nuevo CEO a partir del 1 de diciembre", "f": "Nexotur.com", "d": "2026-11-11T09:00:00+00:00", "u": "https://news.google.com/a"},
    {"t": "HBX GROUP nombra a Carlos Muñoz CEO", "f": "Gaceta del Turismo", "d": "2026-11-11T08:00:00+00:00", "u": "https://news.google.com/b"},
    {"t": "HBX Group nombra a Carlos Muñoz nuevo consejero delegado", "f": "Business People", "d": "2026-11-10T18:00:00+00:00", "u": "https://news.google.com/c"},
    {"t": "HBX Group gana un 12 % más hasta septiembre y sube su previsión", "f": "Expansión", "d": "2026-11-05T08:00:00+00:00", "u": "https://news.google.com/d"},
]


class MismaNotaEnLasEmpresas(Base):
    """La misma nota en varios medios se le pasaba a la IA de cada empresa tantas veces como salía, y ocupaba sitio entre los
    seis titulares que lee. Con la regla de los titulares de mercado tal cual, el nombre de la empresa hacía «la misma nota»
    de artículos distintos."""

    def test_el_nombre_de_la_empresa_no_cuenta(self):
        ibm = empresa("IBM", "International Business Machines")
        a, b = "Better Dividend Stock for Retirees: IBM vs. ADP", "IBM lifts full-year outlook after strong mainframe demand"
        self.assertFalse(P.misma_nota(a, b, I.palabras_empresa(ibm)))
        amh = empresa("AMH", "American Homes 4 Rent")
        dos = [{"t": "American Homes 4 Rent raises its dividend by 8%", "d": "2026-11-06T10:00:00+00:00", "f": "Yahoo Finance"},
               {"t": "American Homes 4 Rent Q3 Earnings Call Highlights", "d": "2026-11-06T09:00:00+00:00", "f": "Yahoo Finance"}]
        self.assertTrue(P.misma_nota("American Homes 4 Rent buys rent homes", "American Homes 4 Rent sells homes for rent"))  # con la regla de mercado, sí
        self.assertEqual(len(I.notas_de_empresa(amh, dos)), 2)

    def test_tres_medios_con_la_misma_nota_son_una(self):
        out = I.notas_de_empresa(HBX, NOTAS_HBX)
        self.assertEqual(len(out), 2)
        uno = out[0]
        self.assertEqual(uno["f"], "Nexotur.com")                      # la que más texto trae
        self.assertEqual(uno["mas"], ["Gaceta del Turismo", "Business People"])
        self.assertEqual([o["t"] for o in uno["_otros"]], [NOTAS_HBX[1]["t"], NOTAS_HBX[2]["t"]])
        self.assertEqual(uno["_d0"], "2026-11-10T18:00:00+00:00")       # la primera vez que salió
        self.assertNotIn("_otros", out[1])
        self.assertNotIn("_otros", NOTAS_HBX[0])                        # lo guardado no se toca

    def test_con_dias_de_por_medio_no_es_la_misma(self):
        beam = empresa("BEAM", "Beam Therapeutics Inc.")
        dos = [{"t": "Beam Therapeutics Announces Positive Topline Pivotal Data from BEACON Phase 1/2 Trial of Risto-cel in Sickle Cell Disease", "d": "2026-11-10T12:00:00+00:00"},
               {"t": "Beam Therapeutics to Present Updated Clinical Data from BEACON Phase 1/2 Trial of Risto-cel in Sickle Cell Disease", "d": "2026-11-04T12:00:00+00:00"}]
        self.assertEqual(len(I.notas_de_empresa(beam, dos)), 2)
        juntas = [dict(dos[0]), {**dos[1], "d": "2026-11-09T12:00:00+00:00"}]
        self.assertEqual(len(I.notas_de_empresa(beam, juntas)), 1)

    def test_la_ia_la_lee_una_vez_y_entra_otra_noticia(self):
        viejas = [{"t": t, "f": "Cinco Días", "d": f"2026-11-0{4 - k}T08:00:00+00:00", "u": f"https://news.google.com/v{k}"} for k, t in enumerate((
            "HBX Group compra una plataforma de reservas en Brasil", "Los bajistas reducen su posición en HBX Group", "HBX Group renueva su línea de crédito con seis bancos",
            "Barclays inicia la cobertura de HBX Group con sobreponderar"))]
        cache = {"HBX.MC": {"n": NOTAS_HBX + viejas}}                   # ocho guardadas: antes se leían las seis primeras
        lectura, fichas = {}, {"e": {}}
        self.claude_dice({"HBX.MC": {"imp": "neutral", "rel": 1, "txt": "Nombra consejero delegado.", "fuentes": [1], "tit": {"1": ["negocio", "=", 1]}}})
        self.assertEqual(I.leer_lote(lectura, cache, [HBX], {}, fichas), 1)
        texto = self.pedidos[0]
        lineas = [x for x in texto.split("\n") if re.match(r"\[\d+\]", x)]
        self.assertEqual(len(lineas), 6)                                # seis notas distintas: las tres repetidas son una
        self.assertEqual(sum("Carlos Muñoz" in x for x in lineas), 1)
        self.assertIn("[la misma nota, repetida: es una sola noticia y una sola fuente. También: Gaceta del Turismo, «HBX GROUP nombra a Carlos Muñoz CEO»; "
                      "Business People, «HBX Group nombra a Carlos Muñoz nuevo consejero delegado»]", lineas[0])
        self.assertIn("renueva su línea de crédito", texto)             # la séptima, que antes no cabía
        # la huella sigue siendo la de todo lo guardado: el cambio no hace releer nada por sí solo
        self.assertEqual(lectura["HBX.MC"]["h"], I.huella(cache["HBX.MC"]["n"]))
        self.assertEqual(I.leer_lote(lectura, cache, [HBX], {}, fichas), 0)
        # y en la ficha, los otros titulares de la nota heredan su marca
        tit = fichas["e"]["HBX.MC"]["tit"]
        for n in NOTAS_HBX[:3]:
            self.assertEqual(tit[F.clave_titulo(n["t"])][:3], ["negocio", "=", 1])
        self.assertIn("«la misma nota, repetida»", I.LEER)

    def test_la_decision_tambien(self):
        x = buena("HBX.MC", "HBX Group International plc")
        self.claude_dice({"comentario": "x", "ideas": [], "evitar": [], "cambios": [], "plazos": []})
        I.decidir({}, {"HBX.MC": {"n": NOTAS_HBX}}, [x], P.per_sector_mediano([x]), set(), {})
        lineas = [l for l in self.pedidos[0].split("\n") if re.match(r"\[\d+\]", l)]
        self.assertEqual(len(lineas), 2)
        self.assertIn("la misma nota, repetida", lineas[0])
        self.assertIn("«la misma nota, repetida» es una sola fuente", I.DECIDIR)

    def test_la_ultima_noticia_de_peso_es_de_cuando_salio_por_primera_vez(self):
        fuentes = [{**I.notas_de_empresa(HBX, NOTAS_HBX)[0], "_s": "HBX.MC"}]
        _, dn = I.citadas_por_peso({"fuentes": [1], "tit": {"1": ["negocio", "-", 3]}}, fuentes, "HBX.MC")
        self.assertEqual(dn, "2026-11-10T18:00:00+00:00")


# ------------------------------------------------------------------ 2. la fecha del hecho

class FechaDelHecho(Base):
    """«El 13 de noviembre [Corteva] rebajó la guía y la acción cayó un 24 %»: fue el jueves 12; los artículos eran del 13. La
    fecha de cada noticia iba a secas y la IA la tomaba por la del hecho."""

    def test_el_dia_de_publicacion_con_su_dia_de_la_semana_y_en_la_hora_del_medio(self):
        yahoo = {"u": "https://finance.yahoo.com/news/x", "d": "2026-11-13T01:19:00+00:00"}     # las 20:19 del jueves en Nueva York
        self.assertEqual(I.dia_pub(yahoo), "jue 2026-11-12")
        self.assertEqual(I.dia_pub({**yahoo, "d": "2026-11-13T14:00:00+00:00"}), "vie 2026-11-13")
        google = {"u": "https://news.google.com/rss/articles/x", "d": "2026-11-12T23:30:00+00:00"}  # las 0:30 del viernes en Madrid
        self.assertEqual(I.dia_pub(google), "vie 2026-11-13")
        self.assertEqual(I.dia_pub({"d": None}), "")
        self.assertRegex(I.hoy_con_dia(), r"^(lun|mar|mié|jue|vie|sáb|dom) \d{4}-\d\d-\d\d$")

    def test_la_linea_que_lee_la_ia(self):
        n = {"t": "Corteva Inc. (CTVA) Falls Harder Than Wall Street", "f": "Yahoo Finance", "d": "2026-11-13T01:19:00+00:00", "u": "https://finance.yahoo.com/a",
             "r": "Corteva fell by 24.30 percent on Thursday to close at $9.19 apiece."}
        self.assertEqual(I.linea_noticia(7, n), "[7] jue 2026-11-12 Yahoo Finance: Corteva Inc. (CTVA) Falls Harder Than Wall Street — Corteva fell by 24.30 percent on Thursday to close at $9.19 apiece.")
        self.assertEqual(I.linea_noticia(7, n, resumen=0), "[7] jue 2026-11-12 Yahoo Finance: Corteva Inc. (CTVA) Falls Harder Than Wall Street")
        # de una nota repetida, el primer día en que salió
        self.assertTrue(I.linea_noticia(1, I.notas_de_empresa(HBX, NOTAS_HBX)[0]).startswith("[1] mar 2026-11-10 Nexotur.com: "))

    def test_la_lectura_la_decision_y_el_informe_la_reciben_asi(self):
        ctva = buena("CTVA", "Corteva, Inc.", z="EEUU")
        cache = {"CTVA": {"n": [{"t": "Corteva cuts its 2026 profit outlook", "f": "Yahoo Finance", "d": "2026-11-13T01:19:00+00:00", "u": "https://finance.yahoo.com/a"}]}}
        self.claude_dice({"CTVA": {"imp": "negativo", "rel": 2, "txt": "Rebaja su previsión.", "fuentes": [1], "tit": {"1": ["negocio", "-", 2]}}})
        I.leer_lote({}, cache, [ctva], {})
        self.assertRegex(self.pedidos[0], r"^Hoy es (lun|mar|mié|jue|vie|sáb|dom) \d{4}-\d\d-\d\d\.")
        self.assertIn("[1] jue 2026-11-12 Yahoo Finance: Corteva cuts its 2026 profit outlook", self.pedidos[0])
        self.claude_dice({"comentario": "x", "ideas": [], "evitar": [], "cambios": [], "plazos": []})
        I.decidir({}, cache, [ctva], P.per_sector_mediano([ctva]), set(), {})
        self.assertIn("[1] jue 2026-11-12 Yahoo Finance: Corteva cuts its 2026 profit outlook", self.pedidos[1])
        guard = I.noticias_yahoo
        I.noticias_yahoo = lambda s, n=8: []
        try:
            precios = {"instrumentos": {}, "noticias": {"mercado": [{"t": "El Ibex cierra la semana con una subida del 3,36 %", "f": "Expansión", "d": "2026-11-13T17:40:00+00:00",
                                                                     "u": "https://news.google.com/x", "z": "España"}]}}
            texto, _ = I.material([], precios, {})
        finally:
            I.noticias_yahoo = guard
        self.assertIn("[1] vie 2026-11-13 Expansión (España): El Ibex cierra la semana", texto)

    def test_los_tres_encargos_lo_piden(self):
        for encargo in (I.LEER, I.DECIDIR, I.INSTRUCCIONES):
            self.assertIn("es el día en que se publicó (con su día de la semana), no el día del hecho", encargo)
            self.assertIn("no escribas «el 13 de noviembre hizo X»", encargo)
            self.assertIn("ponlo al final entre paréntesis: «(noticias del 13 de noviembre)»", encargo)
            # en el primer ensayo «di según noticias del…» hizo que 108 de 120 lecturas empezaran así
            self.assertNotIn("di «según noticias", encargo)
            self.assertNotIn("{REGLA_FECHA}", encargo)


# ------------------------------------------------------------------ 3. relevancia 3 con una mención de pasada

PEP = empresa("PEP", "PepsiCo, Inc.", z="EEUU")
NOTAS_PEP = [
    {"t": "Procter & Gamble or PepsiCo: The One Dividend Stock I’d Hold for the Next 20 Years", "f": "Yahoo Finance", "d": "2026-11-13T14:17:00+00:00", "u": "https://finance.yahoo.com/1",
     "r": "Procter & Gamble declared its quarterly dividend in October, while PepsiCo cut its 2026 core EPS growth outlook."},
    {"t": "A $9.2 Billion Fund Dumps These 3 Stocks", "f": "Yahoo Finance", "d": "2026-11-13T16:06:00+00:00", "u": "https://finance.yahoo.com/2"},
    {"t": "PepsiCo (PEP) Plans 1,000 North America Job Cuts In Elliott Backed Turnaround", "f": "Yahoo Finance", "d": "2026-11-12T13:09:00+00:00", "u": "https://finance.yahoo.com/3"},
]


class RelevanciaTresConUnaMencionDePasada(Base):
    """PepsiCo salió «negativo, cambia la tesis» por una frase del resumen de un artículo que comparaba dos acciones por su
    dividendo. La relevancia 3 es la que saca y mete ideas de un día para otro."""

    def fuentes(self):
        return [{**n, "_s": "PEP"} for n in NOTAS_PEP]

    def test_que_es_un_articulo_de_pasada(self):
        si = ["Procter & Gamble or PepsiCo: The One Dividend Stock I’d Hold for the Next 20 Years", "A $9.2 Billion Fund Dumps These 3 Stocks",
              "Abbott vs. Medtronic: Which Dividend Stock Pays You More in 10 Years?", "3 British Dividend Stocks To Watch", "Better Dividend Stock for Retirees: IBM vs. ADP",
              "A $1,500,000 Portfolio in Clorox, Kimberly-Clark and PepsiCo Pays $67,627 a Year in Dividends", "iShares Core S&P Mid-Cap (IJH) Adds Glaukos and TechnipFMC on Nov. 3",
              "Best Growth Stocks to Buy for November 13th"]
        no = ["PepsiCo (PEP) Plans 1,000 North America Job Cuts In Elliott Backed Turnaround", "Corteva Q3 Earnings Call Highlights Brazil Woes and Outlook Cut",
              "Kongsberg Gruppen (OB:KOG) Stock Faces Q3 Earnings Backlog Versus Margin Risk", "Nvidia's 60% target cut exposes a Wall Street split",
              "LTC Properties Inc (LTC) (Q3 2026) Earnings Call Highlights: SHOP Portfolio Surges", "El Banco de España multa con 16,5 millones a Sabadell", ""]
        for t in si:
            self.assertTrue(I.de_pasada(t), t)
        for t in no:
            self.assertFalse(I.de_pasada(t), t)

    def test_un_3_que_solo_sale_de_un_articulo_de_pasada_baja_a_2(self):
        r = {"rel": 3, "tit": {"1": ["negocio", "-", 3], "2": ["mercado", "-", 1], "3": ["negocio", "±", 2]}}
        self.assertEqual(I.rel_fundada(3, r, self.fuentes(), "PEP"), 2)

    def test_con_una_noticia_de_peso_3_que_va_de_la_empresa_sigue_en_3(self):
        r = {"rel": 3, "tit": {"1": ["negocio", "-", 3], "3": ["negocio", "-", 3]}}
        self.assertEqual(I.rel_fundada(3, r, self.fuentes(), "PEP"), 3)
        # sin ninguna de peso 3, valen las de peso 2
        self.assertEqual(I.rel_fundada(3, {"tit": {"3": ["negocio", "-", 2]}}, self.fuentes(), "PEP"), 3)
        self.assertEqual(I.rel_fundada(3, {"tit": {"1": ["negocio", "-", 2], "2": ["mercado", "-", 2]}}, self.fuentes(), "PEP"), 2)

    def test_un_3_sin_ninguna_noticia_suya_de_peso_baja_a_2(self):
        self.assertEqual(I.rel_fundada(3, {"tit": {"1": ["negocio", "-", 1], "3": ["negocio", "=", 0]}}, self.fuentes(), "PEP"), 2)
        otra = self.fuentes() + [{"t": "Coca-Cola profit warning", "_s": "KO"}]
        self.assertEqual(I.rel_fundada(3, {"tit": {"4": ["negocio", "-", 3]}}, otra, "PEP"), 2)    # la de peso es de otra empresa

    def test_lo_demas_no_se_toca(self):
        self.assertEqual(I.rel_fundada(2, {"tit": {"1": ["negocio", "-", 3]}}, self.fuentes(), "PEP"), 2)
        self.assertEqual(I.rel_fundada(3, {}, self.fuentes(), "PEP"), 3)              # sin marcas no hay con qué comprobarlo
        self.assertEqual(I.rel_fundada(0, {"tit": {}}, self.fuentes(), "PEP"), 0)

    def test_la_lectura_lo_guarda_como_2_y_no_como_noticia_gorda(self):
        self.claude_dice({"PEP": {"imp": "negativo", "rel": 3, "txt": "Recorta su previsión.", "fuentes": [1], "tit": {"1": ["negocio", "-", 3], "2": ["mercado", "-", 1], "3": ["negocio", "±", 2]}}})
        lectura = {}
        I.leer_lote(lectura, {"PEP": {"n": NOTAS_PEP}}, [PEP], {})
        self.assertEqual(lectura["PEP"]["rel"], 2)
        self.assertNotIn("g", lectura["PEP"])
        self.assertFalse(I.gorda(lectura, "PEP"))

    def test_el_encargo_lo_pide(self):
        self.assertIn('Para dar peso 3 o "rel" 3, el hecho tiene que ser el asunto de alguna de las noticias de la empresa', I.LEER)
        self.assertIn("Lo que solo se menciona\nde pasada en un artículo que va de otra cosa", I.LEER)
        self.assertIn("no pasa de 2 por sí solo", I.LEER)
        # y no le pide ser más duro con todo lo demás: en el primer ensayo «son la excepción» bajó la relevancia de todo
        self.assertNotIn("son la excepción", I.LEER)


# ------------------------------------------------------------------ 4. las «mejores de la web» miran la prensa

class MejoresDeLaWebMiranLaPrensa(Base):
    """Nvidia seguía entre las «mejores de la web», con un 76 % de recorrido, con su consejero delegado fuera: la lista salía
    solo de los números."""

    AHORA = dt.datetime(2026, 11, 14, 12, 0, tzinfo=dt.timezone.utc)

    def lectura(self, rel, imp, dias=1):
        return {"d": (self.AHORA - dt.timedelta(days=dias)).isoformat(), "rel": rel, "imp": imp, "txt": "x"}

    def test_que_prensa_cuenta(self):
        pc = lambda *a, **k: I.prensa_en_contra(self.lectura(*a, **k), self.AHORA)  # noqa: E731
        self.assertEqual(pc(3, "negativo"), "fuera")
        self.assertEqual(pc(3, "mixto"), "fuera")                       # Nvidia: «mixto, cambia la tesis»
        self.assertEqual(pc(2, "negativo"), "resta")
        self.assertIsNone(pc(3, "positivo"))
        self.assertIsNone(pc(2, "mixto"))
        self.assertIsNone(pc(1, "negativo"))
        self.assertIsNone(pc(3, "negativo", dias=8))                    # una lectura de hace más de una semana ya no cuenta
        self.assertIsNone(I.prensa_en_contra(None, self.AHORA))
        self.assertIsNone(I.prensa_en_contra({"rel": 3, "imp": "negativo"}, self.AHORA))

    def test_la_lista(self):
        valores = [buena("NVDA", "NVIDIA", pot=76), buena("MU", "Micron", pot=30), buena("TEAM", "Atlassian", pot=45), buena("ASML.AS", "ASML", pot=25)]
        med = P.per_sector_mediano(valores)
        orden = lambda lec: [x["s"] for _, x in I.mejores_de_la_web(valores, med, set(), lec, self.AHORA)]  # noqa: E731
        self.assertEqual(orden(None), ["NVDA", "TEAM", "MU", "ASML.AS"])            # sin lecturas, por sus números, como antes
        lec = {"NVDA": self.lectura(3, "mixto"), "TEAM": self.lectura(2, "negativo"), "MU": self.lectura(2, "positivo")}
        self.assertEqual(orden(lec), ["MU", "ASML.AS", "TEAM"])                     # Nvidia sale; Atlassian pierde puntos y baja
        puntos = lambda lec: {x["s"]: p for p, x in I.mejores_de_la_web(valores, med, set(), lec, self.AHORA)}  # noqa: E731
        self.assertAlmostEqual(puntos(None)["TEAM"] - puntos(lec)["TEAM"], I.PRENSA_RESTA)
        self.assertEqual(puntos(None)["MU"], puntos(lec)["MU"])
        self.assertEqual(orden({"NVDA": self.lectura(3, "mixto", dias=9)}), ["NVDA", "TEAM", "MU", "ASML.AS"])
        self.assertEqual([x["s"] for _, x in I.mejores_de_la_web(valores, med, {"NVDA"}, None, self.AHORA)], ["TEAM", "MU", "ASML.AS"])  # las de la cartera, fuera como siempre

    def test_la_decision_no_la_cuenta_entre_las_mejores_ni_la_protege(self):
        valores = [buena("NVDA", "NVIDIA", pot=76), buena("MU", "Micron", pot=30)]
        lectura = {"NVDA": {"d": ahora(2), "rel": 3, "imp": "mixto", "txt": "Su consejero delegado deja el cargo."}}
        previa = {"generado": ahora(24), "ideas": [], "evitar": []}
        self.claude_dice({"comentario": "x", "ideas": [], "evitar": [], "cambios": [], "plazos": []})
        d = I.decidir(lectura, {}, valores, P.per_sector_mediano(valores), set(), {}, previa={**previa, "ideas": [{"s": "MU", "n": "Micron", "desde": ahora(48)[:10]}]})
        self.assertEqual(d["radar"], ["MU"])
        self.assertIn("(por sus números, y sin las que tienen la prensa en contra): MU.", self.pedidos[0])
        self.assertNotIn("NVDA", d["hist"])                              # no queda apuntada como «radar»: no la protege de «evitar»

    def test_la_web_usa_la_misma_regla(self):
        js = (RAIZ / "src/js/13-expertos.js").read_text(encoding="utf-8")
        self.assertIn(f"const PRENSA_DIAS = {I.PRENSA_DIAS}, PRENSA_RESTA = {I.PRENSA_RESTA};", js)
        self.assertIn("if ((le.rel || 0) >= 3 && (le.imp === 'negativo' || le.imp === 'mixto')) return 'fuera';", js)
        self.assertIn("return (le.rel || 0) >= 2 && le.imp === 'negativo' ? 'resta' : null;", js)
        self.assertIn("(!deGrowIA.has(x.s) && prensaEnContra(x.s) === 'fuera')", js)


# ------------------------------------------------------------------ el ensayo de las lecturas, lado a lado

class EnsayoDeLasLecturas(unittest.TestCase):
    """El ensayo lado a lado solo comparaba la decisión y el informe. Lo que cambia en la lectura de cada empresa necesita
    leer las mismas empresas con los dos códigos, y más de una vez: la IA no contesta dos veces igual."""

    def test_la_action_no_hace_la_pasada_ni_publica_con_solo_comparar(self):
        yml = (RAIZ / ".github/workflows/precios.yml").read_text(encoding="utf-8")
        precios, comparar = yml.split("\n  comparar:\n")
        self.assertIn("if: ${{ !(inputs.ensayo && inputs.solo_comparar) }}", precios.split("jobs:")[1][:400])
        self.assertNotIn("git push", comparar)                            # la comparación no publica nada
        self.assertIn("git archive FETCH_HEAD radar.json radar-mas.json precios.json noticias-cache.json escaneo.json", comparar)
        self.assertIn("for e in main main2; do python scripts/ensayo_comparar.py --lecturas /tmp/main/scripts", comparar)
        self.assertIn("for e in rama$N rama$((N + 1)); do python scripts/ensayo_comparar.py --lecturas scripts", comparar)
        self.assertNotIn('"${{ inputs.lecturas }}"', yml)                # entra por una variable de entorno
        self.assertNotIn("${{ inputs.sin }}\"", yml.replace("SIN: ${{ inputs.sin }}", ""))

    def test_lecturas_sin_decision_ni_informe_y_las_variantes_en_lugar_de_la_rama(self):
        """partes=lecturas: main dos veces y la rama (o cada variante de «sin») dos veces en la misma tanda, sin gastar en
        la decisión ni en el informe."""
        comparar = (RAIZ / ".github/workflows/precios.yml").read_text(encoding="utf-8").split("\n  comparar:\n")[1]
        paso = comparar.split('elif [ "$PARTES" = "lecturas" ]; then')[1].split("else")[0]
        self.assertNotIn("ensayo_comparar.py", paso)                      # ni decisión ni informe
        self.assertIn('if [ "$PARTES" != "lecturas-rama" ]; then\n              for e in main main2', comparar)
        self.assertIn('ENSAYO_SIN="$v" python scripts/ensayo_comparar.py --lecturas scripts "sin-$v-$k"', comparar)

    def test_lo_que_el_ensayo_sabe_quitar_esta_en_el_encargo(self):
        """ENSAYO_SIN quita trozos del encargo de lectura por su texto: si el encargo cambia y el ensayo no, no quitaría nada."""
        codigo = (RAIZ / "scripts/ensayo_comparar.py").read_text(encoding="utf-8")
        for trozo in ("Cuando una noticia dice «la misma nota, repetida», es una sola noticia aunque salga en varios medios o varias veces: no\npesa más por repetirse.\n",
                      'Para dar peso 3 o "rel" 3, el hecho tiene que ser el asunto de alguna de las noticias de la empresa. Lo que solo se menciona\n',
                      I.REGLA_FECHA + "\n"):
            self.assertIn(trozo, I.LEER)
        self.assertIn("pesa más por repetirse.\\n", codigo)
        self.assertIn('Para dar peso 3 o \\"rel\\" 3'.replace('\\"', '"'), codigo.replace('\\"', '"'))

    def test_la_muestra_y_la_lectura_con_el_codigo_que_se_le_da(self):
        import subprocess
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            datos, sal = Path(d, "datos"), Path(d, "sal")
            datos.mkdir(); sal.mkdir()
            dia = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)).isoformat()
            notas = [{**n, "d": dia} for n in NOTAS_HBX[:3]] + [{"t": "HBX Group gana un 12 % más", "f": "Expansión", "d": dia, "u": "https://news.google.com/d"}]
            json.dump({"valores": [HBX, PEP, empresa("SIN", "Sin Noticias SA")]}, open(datos / "radar.json", "w"))
            json.dump({"HBX.MC": {"n": notas}, "PEP": {"n": [{**n, "d": dia} for n in NOTAS_PEP]}}, open(datos / "noticias-cache.json", "w"))
            json.dump({"lectura": {"PEP": {"d": dia, "rel": 3, "imp": "negativo", "txt": "x"}}}, open(datos / "escaneo.json", "w"))
            r = subprocess.run([sys.executable, str(RAIZ / "scripts/ensayo_comparar.py"), "--muestra", str(RAIZ / "scripts"), str(datos), str(sal / "muestra.json"), "10"],
                               capture_output=True, text=True, env={**os.environ, "ENSAYO_SIEMPRE": ""})
            self.assertEqual(r.returncode, 0, r.stderr)
            m = json.load(open(sal / "muestra.json"))
            self.assertEqual(m["por"], {"HBX.MC": "repetidas", "PEP": "rel3"})    # la que no tiene noticias no entra
            # sin clave no se llama a Claude: no lee ninguna, pero deja sus archivos y no rompe
            env = {k: v for k, v in os.environ.items() if k not in ("ANTHROPIC_RADAR_KEY", "CLAUDE_API_KEY", "ANTHROPIC_API_KEY")}
            r = subprocess.run([sys.executable, str(RAIZ / "scripts/ensayo_comparar.py"), "--lecturas", str(RAIZ / "scripts"), "rama", str(datos), str(sal)],
                               capture_output=True, text=True, env={**env, "CLAUDE_API": "http://127.0.0.1:9/no"})
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("lectura", json.load(open(sal / "lecturas-rama.json")))
            self.assertTrue((sal / "uso-lecturas-rama.json").exists())


if __name__ == "__main__":
    unittest.main()
