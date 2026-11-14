"""14 nov 2026, auditoría (tercera parte, claude/auditoria-noche-14nov.md): una prueba por cada cosa. Sin red: las llamadas a
Claude se imitan.

Uso: python3 -m unittest discover -s tests/scripts
"""
import datetime as dt
import json
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import informe as I  # noqa: E402
import precios as P  # noqa: E402

AHORA = dt.datetime(2026, 11, 14, 9, 0, tzinfo=dt.timezone.utc)


def hace(horas):
    return (AHORA - dt.timedelta(hours=horas)).isoformat()


class OrdenDeLasIdeas(unittest.TestCase):
    """Las ideas que siguen se publican en el orden que les da la IA cada día, no en el que tenían. En el ensayo la IA ponía
    Western Digital la última, con confianza baja, y en la app habría seguido de idea n.º 1."""

    def asentar(self, previas, ideas):
        hoy = dt.datetime.now(dt.timezone.utc).date().isoformat()
        previa = {"generado": hoy + "T06:00:00+00:00", "ideas": [{"s": s, "n": s, "desde": hoy, "tesis": "la de antes"} for s in previas]}
        porval = {s: {"s": s, "r": "buy", "pot": 30, "na": 12, "p": 10} for s in set(previas) | {i["s"] for i in ideas}}
        return I.asentar(previa, ideas, [], [], porval, {}, [])[0]

    def test_las_que_siguen_van_en_el_orden_de_la_ia(self):
        out = self.asentar(["WDC", "COHR", "TRE.MC", "SZG.DE", "PRY.MI"],
                           [{"s": s, "tesis": "la de hoy", "confianza": c} for s, c in (("TRE.MC", "media"), ("SZG.DE", "media"), ("PRY.MI", "media"), ("COHR", "baja"), ("WDC", "baja"))])
        self.assertEqual([i["s"] for i in out], ["TRE.MC", "SZG.DE", "PRY.MI", "COHR", "WDC"])
        self.assertEqual(out[-1]["confianza"], "baja")
        self.assertEqual(out[0]["tesis"], "la de hoy")

    def test_la_que_la_ia_ya_no_propone_y_sigue_va_detras(self):
        # la IA deja de proponer WDC sin noticia grave: sigue por constancia, pero ya no la primera
        out = self.asentar(["WDC", "COHR", "TRE.MC"], [{"s": "TRE.MC", "tesis": "t"}, {"s": "COHR", "tesis": "t"}])
        self.assertEqual([i["s"] for i in out], ["TRE.MC", "COHR", "WDC"])
        self.assertEqual(out[-1].get("sigue"), 1)

    def test_una_nueva_entra_en_el_puesto_que_le_da_la_ia(self):
        out = self.asentar(["WDC", "COHR"], [{"s": "NUEVA", "tesis": "t"}, {"s": "COHR", "tesis": "t"}, {"s": "WDC", "tesis": "t"}])
        self.assertEqual([i["s"] for i in out], ["NUEVA", "COHR", "WDC"])


class MismaNota(unittest.TestCase):
    """La misma nota en varios medios contaba como varias fuentes (se quitaban repetidos por los 60 primeros caracteres)."""

    TESORO = [("El Boletín", "El secretario del Tesoro de EEUU rechaza más subidas de tipos de la Fed"),
              ("El Confidencial", 'El secretario del Tesoro de EEUU, contrario a subir tipos: "No es algo que yo haría si estuviera en la Fed"'),
              ("Demócrata", "El secretario del Tesoro de EEUU rechaza más subidas de tipos: No es algo que yo haría si estuviera en la Fed")]

    def test_tres_medios_con_la_misma_nota_son_una(self):
        lista = [{"t": t, "f": f, "z": "Tipos", "d": hace(k)} for k, (f, t) in enumerate(self.TESORO)]
        lista.append({"t": "El bono americano se suma a las tensiones en la IA con un nuevo aumento de rentabilidad que lo lleva al 5,1%", "f": "El Economista", "z": "Tipos", "d": hace(5)})
        g = P.agrupar_notas(lista)
        self.assertEqual(len(g), 2)
        self.assertEqual(g[0]["f"], "El Boletín")
        self.assertEqual(g[0]["mas"], ["El Confidencial", "Demócrata"])
        self.assertNotIn("mas", g[1])
        self.assertEqual(len(P.elegir_mercado(lista, por_zona=3, total=30)), 2)

    def test_dos_noticias_distintas_del_mismo_tema_no(self):
        self.assertFalse(P.misma_nota("El IBEX 35 sube un 0,27 % y cierra en 20.000 puntos en una sesión marcada por la cautela",
                                      "El Ibex 35 sube un 3,36% en la semana y recupera los 20.000 puntos pese al terremoto en Nvidia"))
        self.assertFalse(P.misma_nota("Repsol sube", "Repsol sube"[::-1]))
        self.assertTrue(P.misma_nota("Repsol sube", "Repsol sube"))  # iguales, aunque sean cortos

    def test_el_informe_la_pasa_una_vez_y_dice_donde_mas_sale(self):
        guard = I.noticias_yahoo
        I.noticias_yahoo = lambda s, n=8: []
        try:
            precios = {"instrumentos": {}, "noticias": {"mercado": [{"t": t, "f": f, "z": "Tipos", "d": hace(k), "u": f"https://e/{k}"} for k, (f, t) in enumerate(self.TESORO)]}}
            texto, fuentes = I.material([], precios, {})
        finally:
            I.noticias_yahoo = guard
        self.assertEqual(len(fuentes), 1)
        self.assertIn("[la misma nota sale también en El Confidencial, Demócrata: es una sola fuente]", texto)
        self.assertIn("es una sola fuente aunque la publiquen varios medios", I.INSTRUCCIONES)

    def test_contar_fuentes(self):
        fs = [{"t": t, "f": f} for f, t in self.TESORO]
        self.assertEqual(I.fuentes_distintas(fs), 1)
        # dos artículos del mismo medio, una fuente; otro medio con otra noticia, dos
        eco = [{"t": "La inflación de la zona euro en el 4% inhabilita moderar el alza de tipos", "f": "El Economista"},
               {"t": "El temor a una Fed más agresiva desata otra vez la venta de deuda y dispara el bono de EEUU al 5,1%", "f": "El Economista"}]
        self.assertEqual(I.fuentes_distintas(eco), 1)
        self.assertEqual(I.fuentes_distintas(eco + fs), 2)
        # Yahoo Finance reúne medios: dos notas distintas suyas cuentan como dos
        self.assertEqual(I.fuentes_distintas([{"t": "Fed officials signal a December hike is on the table", "f": "Yahoo Finance"},
                                              {"t": "Treasury yields jump as traders price in tighter policy", "f": "Yahoo Finance"}]), 2)


class AlertaAlta(unittest.TestCase):
    """Una alerta alta pide dos fuentes o un dato propio. La del 13 nov («la Fed podría subir tipos en diciembre, 93,5 %»)
    salía de un solo titular de Cryptonews.net."""

    FUENTES = [{"t": "¡La probabilidad de que la Reserva Federal tome una decisión sobre los tipos de interés en diciembre ha aumentado al 93,5%!", "f": "Cryptonews.net", "u": "https://e/1"},
               {"t": "Los modelos económicos sugieren que la Fed tendría que llevar los tipos casi al 7%", "f": "El Economista", "u": "https://e/2"},
               {"t": "El secretario del Tesoro de EEUU rechaza más subidas de tipos de la Fed", "f": "El Boletín", "u": "https://e/3"},
               {"t": "El secretario del Tesoro de EEUU rechaza más subidas de tipos: No es algo que yo haría si estuviera en la Fed", "f": "Demócrata", "u": "https://e/4"}]
    TEXTO = ("## Mercado por zonas\nDatos:\n- EEUU: S&P 500 7561.67 puntos (-0.4 % hoy, -2.04 % en un mes, 10.46 % en el año, 12.23 % a un año)\n"
             "- Tipos y riesgo: Bono EEUU 10 años 5.154 % (1.2 % hoy)\nNoticias:\n[1] 2026-11-13 Cryptonews.net (Tipos): la probabilidad ha aumentado al 93,5%\n"
             "## Posición btc\nBitcoin (BTC, Cripto, id btc), precio 61963.85 €, hoy -4.03 %")

    def alerta(self, **a):
        inf = {"alertas": [{"t": "La Fed podría subir tipos en diciembre", "id": "ishares-us", "urgencia": "alta", **a}]}
        return I.asentar_alertas(inf, self.FUENTES, self.TEXTO)["alertas"][0]

    def test_con_una_sola_fuente_baja_a_media(self):
        a = self.alerta(fuentes=[1])
        self.assertEqual(a["urgencia"], "media")
        self.assertEqual(a["rebajada"], 1)
        self.assertEqual([f["f"] for f in a["fuentes"]], ["Cryptonews.net"])

    def test_sin_fuentes_tambien(self):
        self.assertEqual(self.alerta()["urgencia"], "media")
        self.assertEqual(self.alerta(fuentes=["x", 99])["urgencia"], "media")

    def test_la_misma_nota_en_dos_medios_no_son_dos_fuentes(self):
        self.assertEqual(self.alerta(fuentes=[3, 4])["urgencia"], "media")

    def test_con_dos_fuentes_distintas_sigue_alta(self):
        a = self.alerta(fuentes=[1, 2])
        self.assertEqual(a["urgencia"], "alta")
        self.assertNotIn("rebajada", a)

    def test_con_un_dato_propio_sigue_alta(self):
        a = self.alerta(fuentes=[1], dato="Bitcoin, hoy −4,03 %")
        self.assertEqual(a["urgencia"], "alta")
        self.assertEqual(self.alerta(dato="bono a 10 años en el 5,15 %")["urgencia"], "alta")
        self.assertEqual(self.alerta(dato="precio 61.963,85 €")["urgencia"], "alta")

    def test_una_cifra_que_solo_esta_en_un_titular_no_es_un_dato_propio(self):
        a = self.alerta(fuentes=[1], dato="probabilidad del 93,5 %")
        self.assertEqual(a["urgencia"], "media")
        self.assertNotIn("dato", a)
        # ni un número redondo pequeño que sale en cualquier parte («S&P 500», «10 años»)
        self.assertEqual(self.alerta(dato="el S&P 500 y el bono a 10 años")["urgencia"], "media")

    def test_como_mucho_dos_altas(self):
        inf = {"alertas": [{"t": f"alerta {k}", "id": "btc", "urgencia": "alta", "fuentes": [1, 2]} for k in range(4)]}
        out = I.asentar_alertas(inf, self.FUENTES, self.TEXTO)["alertas"]
        self.assertEqual([a["urgencia"] for a in out], ["alta", "alta", "media", "media"])
        self.assertEqual([a.get("rebajada") for a in out], [None, None, 2, 2])
        self.assertIn("como\n  mucho dos", I.INSTRUCCIONES)

    def test_una_alerta_media_no_se_toca(self):
        inf = I.asentar_alertas({"alertas": [{"t": "x", "id": "btc", "urgencia": "media"}, "rota", {"id": "sin texto"}]}, self.FUENTES, self.TEXTO)
        self.assertEqual(inf["alertas"], [{"t": "x", "id": "btc", "urgencia": "media", "fuentes": []}])

    def test_el_encargo_lo_pide(self):
        self.assertIn("«alta» solo si lo cuentan dos fuentes distintas", I.INSTRUCCIONES)
        self.assertIn('"fuentes": [1, 2], "dato"', I.INSTRUCCIONES)


class UnidadesDeMercado(unittest.TestCase):
    """Los datos de mercado iban sin unidad: «Bitcoin 62.576,99» (euros) y «Brent 95,94» (dólares). El informe del 13 nov
    avisó, con urgencia alta, de que «el precio en euros de la posición parece estar en dólares»."""

    MERCADOS = {"^GSPC": {"nombre": "S&P 500", "grupo": "EEUU", "moneda": "USD", "precio": 7561.67, "variacion_dia": -0.4, "fecha": "2026-11-13"},
                "^TNX": {"nombre": "Bono EEUU 10 años", "grupo": "Tipos y riesgo", "moneda": "USD", "precio": 5.154, "variacion_dia": 1.2, "fecha": "2026-11-13"},
                "EURUSD=X": {"nombre": "Euro / dólar", "grupo": "Divisas", "moneda": "USD", "precio": 1.1024, "variacion_dia": -0.2, "fecha": "2026-11-14"},
                "BZ=F": {"nombre": "Brent", "grupo": "Materias primas", "moneda": "USD", "precio": 96.39, "variacion_dia": 1.1, "fecha": "2026-11-13"},
                "BTC-EUR": {"nombre": "Bitcoin", "grupo": "Cripto", "moneda": "EUR", "precio": 61957.5, "variacion_dia": -4.0, "fecha": "2026-11-14"}}

    def material(self):
        guard = (I.noticias_yahoo, I.hoy_madrid)
        I.noticias_yahoo = lambda s, n=8: []
        I.hoy_madrid = lambda: "2026-11-14"
        try:
            return I.material([], {"instrumentos": {}, "noticias": {}, "mercados": self.MERCADOS, "fx": {"USD": 0.907112}}, {})[0]
        finally:
            I.noticias_yahoo, I.hoy_madrid = guard

    def test_cada_dato_lleva_su_unidad(self):
        t = self.material()
        self.assertIn("Bitcoin 61957.5 euros (", t)
        self.assertIn("Brent 96.39 dólares por barril (", t)
        self.assertIn("S&P 500 7561.67 puntos (", t)
        self.assertIn("Bono EEUU 10 años 5.154 % (rentabilidad del bono, no un precio) (", t)
        self.assertIn("Euro / dólar 1.1024 dólares por euro (", t)

    def test_un_mercado_nuevo_va_en_puntos_o_en_su_moneda(self):
        self.assertEqual(I.unidad_mercado("^AEX", {"grupo": "Europa", "moneda": "EUR"}), " puntos")
        self.assertEqual(I.unidad_mercado("ETH-EUR", {"grupo": "Cripto", "moneda": "EUR"}), " euros")
        self.assertEqual(I.unidad_mercado("CL=F", {"grupo": "Materias primas", "moneda": "USD"}), " dólares")
        self.assertEqual(I.unidad_mercado("X", {}), "")

    def test_el_dato_del_viernes_no_es_de_hoy_el_sabado(self):
        t = self.material()
        self.assertIn("S&P 500 7561.67 puntos (-0.4 % el 2026-11-13, su última sesión,", t)
        self.assertIn("no es de hoy: di\n  el día", I.INSTRUCCIONES)
        self.assertIn("Bitcoin 61957.5 euros (-4.0 % hoy,", t)

    def test_la_decision_tampoco_llama_hoy_al_cierre_del_viernes(self):
        guard = I.hoy_madrid
        I.hoy_madrid = lambda: "2026-11-14"
        try:
            z = I.contexto_zonas({"mercados": self.MERCADOS})
        finally:
            I.hoy_madrid = guard
        self.assertIn("S&P 500 -0.4 % el 2026-11-13, su última sesión,", z)
        self.assertIn("Bitcoin -4.0 % hoy,", z)

    def test_el_encargo_lo_explica(self):
        self.assertIn("los precios de las posiciones van en\n  euros", I.INSTRUCCIONES)
        self.assertIn("«parece\n  estar en otra moneda»", I.INSTRUCCIONES)


class PrensaEnEspanolDeLasEuropeas(unittest.TestCase):
    """Google Noticias (prensa en español) solo repasaba las 98 españolas, cada 50 minutos. Ahora, cada 3 horas, y el resto
    del cupo es para las europeas que no tienen en Yahoo ni un titular que las nombre."""

    def setUp(self):
        self.lote = I.LOTE_GOOGLE
        I.LOTE_GOOGLE = 4

    def tearDown(self):
        I.LOTE_GOOGLE = self.lote

    def valores(self):
        return [{"s": "REP.MC", "n": "Repsol, S.A.", "z": "España"}, {"s": "SAN.MC", "n": "Banco Santander, S.A.", "z": "España"},
                {"s": "EOAN.DE", "n": "E.ON SE", "z": "Europa"}, {"s": "BEI.DE", "n": "Beiersdorf Aktiengesellschaft", "z": "Europa"},
                {"s": "SAP.DE", "n": "SAP SE", "z": "Europa"}, {"s": "NUE.DE", "n": "Nueva AG", "z": "Europa"}, {"s": "AAPL", "n": "Apple Inc.", "z": "EEUU"}]

    def cache(self):
        ajena = {"t": "AF Gruppen reports strong Q3 profit", "r": "Norwegian builder", "f": "Yahoo Finance", "u": "https://finance.yahoo.com/a", "d": hace(30)}
        return {"REP.MC": {"n": [], "fy": hace(1), "fg": hace(1)}, "SAN.MC": {"n": [], "fy": hace(1), "fg": hace(4)},
                "EOAN.DE": {"n": [ajena], "fy": hace(1)}, "BEI.DE": {"n": [], "fy": hace(1), "fg": hace(20)},
                "SAP.DE": {"n": [{"t": "SAP raises cloud outlook", "r": "", "f": "Yahoo Finance", "u": "https://finance.yahoo.com/b", "d": hace(3)}], "fy": hace(1)},
                "AAPL": {"n": [], "fy": hace(1)}}

    def test_reparto(self):
        lote = [x["s"] for x in I.lote_google(self.cache(), self.valores(), AHORA)]
        # la española que lleva más de 3 horas; luego las europeas sin titular propio, antes la que nunca se ha mirado. Ni la
        # española mirada hace una hora, ni la europea con titulares suyos, ni la que Yahoo aún no ha mirado, ni las de EEUU
        self.assertEqual(lote, ["SAN.MC", "EOAN.DE", "BEI.DE"])

    def test_una_europea_mirada_hace_poco_espera(self):
        c = self.cache()
        c["BEI.DE"]["fg"] = hace(2)
        self.assertEqual([x["s"] for x in I.lote_google(c, self.valores(), AHORA)], ["SAN.MC", "EOAN.DE"])

    def test_con_titulares_de_google_sigue_sin_titular_propio_de_yahoo(self):
        # si no, en cuanto Google le encontrara uno dejaría de mirarse
        c = self.cache()
        c["BEI.DE"]["n"] = [{"t": "Beiersdorf mejora sus previsiones", "f": "Expansión", "u": "https://news.google.com/rss/articles/x", "d": hace(21)}]
        self.assertTrue(I.sin_titular_propio(c, self.valores()[3]))
        self.assertFalse(I.sin_titular_propio(c, self.valores()[4]))

    def test_las_espanolas_primero_si_no_caben_todas(self):
        v = [{"s": f"E{k}.MC", "n": f"Empresa {k}", "z": "España"} for k in range(6)] + self.valores()[2:4]
        lote = I.lote_google(self.cache(), v, AHORA)
        self.assertEqual([x["z"] for x in lote], ["España"] * 4)

    def test_el_nombre_que_se_busca(self):
        self.assertEqual(I.nombre_corto("Beiersdorf Aktiengesellschaft", "BEI.DE"), "Beiersdorf")
        self.assertEqual(I.nombre_corto("British American Tobacco p.l.c.", "BATS.L"), "British American Tobacco")
        self.assertEqual(I.nombre_corto("Repsol, S.A.", "REP.MC"), "Repsol")
        self.assertEqual(I.nombre_corto("Banco Santander, S.A.", "SAN.MC"), "Banco Santander")


if __name__ == "__main__":
    unittest.main()
