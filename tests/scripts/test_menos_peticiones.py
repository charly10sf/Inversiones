"""Pruebas de lo que deja de pedirse a Yahoo sin que cambie lo que sale (16 nov 2026), sin red.

Uso: python3 -m unittest discover -s tests/scripts
"""
import datetime as dt
import sys
import unittest
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import horario as H  # noqa: E402
import precios as P  # noqa: E402

UTC = dt.timezone.utc


def t(s):
    return dt.datetime.fromisoformat(s).replace(tzinfo=UTC)


class Horario(unittest.TestCase):
    # 16 nov 2026 es lunes; en invierno Nueva York va a UTC-5 y Madrid a UTC+1
    def test_eeuu_abierta_se_pide(self):
        self.assertTrue(H.en_sesion("AAPL", t("2026-11-16T15:00")))
        self.assertFalse(H.quieto("AAPL", t("2026-11-16T14:47"), t("2026-11-16T15:07")))

    def test_eeuu_por_la_manana_con_lo_de_despues_del_cierre(self):
        # el viernes cerró a las 21:00 UTC; la ventana acaba a las 22:15
        self.assertTrue(H.quieto("AAPL", t("2026-11-16T06:07"), t("2026-11-16T09:07")))
        self.assertFalse(H.quieto("AAPL", t("2026-11-13T21:47"), t("2026-11-16T06:07")))

    def test_fin_de_semana(self):
        self.assertTrue(H.quieto("AAPL", t("2026-11-14T00:17"), t("2026-11-15T16:17")))
        self.assertTrue(H.quieto("SAN.MC", t("2026-11-13T18:07"), t("2026-11-14T04:17")))
        self.assertFalse(H.quieto("SAN.MC", t("2026-11-13T17:27"), t("2026-11-14T04:17")))

    def test_madrid(self):
        # cierra a las 17:30 de Madrid (16:30 UTC); la ventana acaba a las 17:45 UTC y abre a las 07:45 UTC
        self.assertFalse(H.quieto("SAN.MC", t("2026-11-16T17:27"), t("2026-11-16T17:47")))
        self.assertTrue(H.quieto("SAN.MC", t("2026-11-16T17:47"), t("2026-11-16T18:07")))
        self.assertTrue(H.quieto("SAN.MC", t("2026-11-16T17:47"), t("2026-11-17T07:27")))
        self.assertFalse(H.quieto("SAN.MC", t("2026-11-16T17:47"), t("2026-11-17T07:47")))

    def test_verano(self):
        # julio: Nueva York a UTC-4, cierra a las 20:00 UTC
        self.assertTrue(H.quieto("MSFT", t("2026-07-14T21:27"), t("2026-07-15T10:07")))
        self.assertFalse(H.quieto("MSFT", t("2026-07-14T21:07"), t("2026-07-15T10:07")))

    def test_lo_que_no_esta_en_la_tabla_se_pide_siempre(self):
        for sim in ("EURUSD=X", "BTC-EUR", "GC=F", "^TNX", "^VIX", "^TASI.SR", "TA35.TA", "XYZ.KS", "0P0001XF42.F"):
            self.assertIsNone(H.bolsa_de(sim), sim)
            self.assertFalse(H.quieto(sim, t("2026-11-15T23:00"), t("2026-11-15T23:20")), sim)

    def test_revision_cripto_fondos_de_eeuu_e_india_se_piden_siempre(self):
        # 16 nov 2026 (revisión): la cripto en otras monedas y los fondos de EEUU (valor liquidativo horas después del
        # cierre) caían en el horario de las acciones de EEUU; la India abre algunos sábados y domingos
        for sim in ("ETH-GBP", "SOL-USDT", "BTC-CHF", "VFIAX", "FXAIX", "^NSEI"):
            self.assertIsNone(H.bolsa_de(sim), sim)
            self.assertFalse(H.quieto(sim, t("2026-11-14T03:00"), t("2026-11-14T12:00")), sim)
        # las clases de acciones de EEUU siguen con su horario
        for sim in ("BRK-B", "BF-A", "GOOGL", "AAPL"):
            self.assertEqual(H.bolsa_de(sim)[0], "America/New_York", sim)

    def test_revision_mexico_con_el_horario_de_nueva_york(self):
        # en el verano de EEUU la Bolsa Mexicana abre a las 7:30 de México (13:30 UTC): a las 13:45 ya está en sesión
        self.assertTrue(H.en_sesion("^MXX", t("2026-07-15T13:45")))
        self.assertFalse(H.quieto("^MXX", t("2026-07-14T21:30"), t("2026-07-15T13:45")))
        # en invierno, de 8:30 a 15:00 (14:30 a 21:00 UTC)
        self.assertFalse(H.en_sesion("^MXX", t("2026-11-17T13:45")))
        self.assertTrue(H.en_sesion("^MXX", t("2026-11-17T14:30")))

    def test_revision_semanas_con_un_solo_cambio_de_hora(self):
        # 16 mar 2026: Nueva York ya en verano (cierra a las 20:00 UTC) y Madrid todavía en invierno (16:30 UTC)
        self.assertTrue(H.quieto("AAPL", t("2026-03-16T21:20"), t("2026-03-16T23:00")))
        self.assertFalse(H.quieto("AAPL", t("2026-03-16T21:10"), t("2026-03-16T23:00")))
        self.assertTrue(H.quieto("SAN.MC", t("2026-03-16T17:50"), t("2026-03-16T23:00")))
        # 27 oct 2026: Madrid ya en invierno (abre a las 08:00 UTC) y Nueva York todavía en verano (abre a las 13:30 UTC)
        self.assertTrue(H.en_sesion("SAN.MC", t("2026-10-27T07:50")))
        self.assertTrue(H.en_sesion("AAPL", t("2026-10-27T13:20")))
        self.assertFalse(H.en_sesion("AAPL", t("2026-10-27T13:10")))

    def test_sin_hora_se_pide(self):
        self.assertFalse(H.quieto("AAPL", None, t("2026-11-15T12:00")))


class RadarPrecios(unittest.TestCase):
    def setUp(self):
        self.original = P.yf.download
        self.pedidos = []

        def download(trozo, **k):
            self.pedidos.append(list(trozo))
            dias = pd.bdate_range(end="2026-11-16", periods=5)
            datos = {s: [10.0, 10.0, 10.0, 11.0, 12.0] for s in trozo}
            cols = pd.MultiIndex.from_product([["Close"], list(trozo)])
            return pd.DataFrame([[datos[s][i] for s in trozo] for i in range(5)], index=dias, columns=cols)
        P.yf.download = download

    def tearDown(self):
        P.yf.download = self.original

    def test_lo_cerrado_sale_de_lo_guardado_y_igual(self):
        fx = {"USD": pd.Series([1.10]), "GBP": pd.Series([0.85])}
        ahora = t("2026-11-16T18:07")  # Madrid cerrada desde las 17:45 UTC; Nueva York abierta
        valores = [{"s": "AAPL", "m": "USD", "obj": 300.0}, {"s": "SAN.MC", "m": "EUR"}, {"s": "NUEVA.MC", "m": "EUR"}]
        estado = {"SAN.MC": ["2026-11-16T17:47:00+00:00", 9.5, 9.0, "2026-11-16"], "AAPL": ["2026-11-16T17:47:00+00:00", 200.0, 190.0, "2026-11-13"]}
        n = P.radar_precios(valores, fx, estado, ahora)
        self.assertEqual(n, 3)
        # solo se pide lo que tiene la bolsa abierta y lo que no se había pedido nunca
        self.assertEqual(sorted(s for tr in self.pedidos for s in tr), ["AAPL", "NUEVA.MC"])
        san = valores[1]
        self.assertEqual((san["p"], san["v"]), (9.5, P.num((9.5 / 9.0 - 1) * 100, 2)))
        aapl = valores[0]
        self.assertEqual(aapl["p"], 12.0)
        self.assertEqual(aapl["pe"], P.num(12.0 / 1.10, 4))
        self.assertEqual(aapl["pot"], P.num((300.0 / 12.0 - 1) * 100, 1))
        # lo pedido queda apuntado con su hora; lo guardado no cambia de hora
        self.assertEqual(estado["NUEVA.MC"], ["2026-11-16T18:07:00+00:00", 12.0, 11.0, "2026-11-16"])
        self.assertEqual(estado["SAN.MC"][0], "2026-11-16T17:47:00+00:00")

    def test_sin_estado_se_pide_todo_como_antes(self):
        valores = [{"s": "AAPL", "m": "USD"}, {"s": "SAN.MC", "m": "EUR"}]
        P.radar_precios(valores, {"USD": pd.Series([1.10])}, None, t("2026-11-15T12:00"))
        self.assertEqual(sorted(s for tr in self.pedidos for s in tr), ["AAPL", "SAN.MC"])

    def test_el_euro_se_rehace_con_el_cambio_de_ahora(self):
        # con Nueva York cerrada el precio en dólares no cambia, pero el euro sí: pe sale con el cambio de esta pasada
        valores = [{"s": "AAPL", "m": "USD"}]
        estado = {"AAPL": ["2026-11-16T06:07:00+00:00", 200.0, 190.0, "2026-11-13"]}
        P.radar_precios(valores, {"USD": pd.Series([1.25])}, estado, t("2026-11-16T09:07"))
        self.assertEqual(self.pedidos, [])
        self.assertEqual(valores[0]["pe"], P.num(200.0 / 1.25, 4))

    def test_revision_lo_guardado_sin_la_vela_de_la_ultima_sesion_se_pide(self):
        # 16 nov 2026 (revisión): si Yahoo no traía aún la vela del día cuando se guardó (el cierre de anteayer), no vale
        # para toda la noche: se vuelve a pedir. Igual lo guardado sin día (la forma de antes) o con otra forma
        ahora = t("2026-11-16T23:07")
        valores = [{"s": s, "m": "EUR"} for s in ("SAN.MC", "BBVA.MC", "ITX.MC", "IBE.MC", "REP.MC")]
        estado = {"SAN.MC": ["2026-11-16T17:47:00+00:00", 9.5, 9.0, "2026-11-13"],
                  "BBVA.MC": ["2026-11-16T17:47:00+00:00", 9.5, 9.0],
                  "ITX.MC": ["2026-11-16T17:47:00+00:00", None, 9.0, "2026-11-16"],
                  "IBE.MC": "roto",
                  "REP.MC": ["2026-11-16T17:47:00+00:00", 14.0, 13.5, "2026-11-16"]}
        P.radar_precios(valores, {}, estado, ahora)
        self.assertEqual(sorted(s for tr in self.pedidos for s in tr), ["BBVA.MC", "IBE.MC", "ITX.MC", "SAN.MC"])
        self.assertEqual(valores[4]["p"], 14.0)
        # lo pedido se guarda con el día de su última vela
        self.assertEqual(estado["SAN.MC"][3], "2026-11-16")
        self.assertEqual(estado["SAN.MC"][1:3], [12.0, 11.0])

    def _con_ticker(self, meta, filas, sims, dias, ahora):
        cols = pd.MultiIndex.from_product([["Close", "Open"], sims])
        P.yf.download = lambda trozo, **k: pd.DataFrame(filas, index=dias, columns=cols)
        tickers = []

        class Falso:
            def __init__(self, sim):
                tickers.append(sim)
                self.history_metadata = meta

            def history(self, **k):
                return None
        original, P.yf.Ticker = P.yf.Ticker, Falso
        try:
            valores, estado = [{"s": x, "m": "EUR"} for x in sims], {}
            P.radar_precios(valores, {}, estado, ahora)
        finally:
            P.yf.Ticker = original
        return valores, estado, tickers

    def test_revision_vela_del_dia_sin_cierre_se_completa(self):
        # 16 nov 2026, 22:35 UTC (0:35 en Helsinki): Yahoo da la vela del lunes con el cierre vacío y el precio solo en
        # los metadatos. Antes salía el cierre del viernes como de hoy; ahora, el último precio, si es de ese día
        dias = pd.bdate_range(end="2026-11-16", periods=5)
        filas = [[7.4, 9.0, 7.3, 9.0], [7.7, 9.1, 7.6, 9.1], [7.6, 9.2, 7.5, 9.2], [7.294, 9.3, 7.5, 9.3], [float("nan"), 9.4, 7.28, 9.35]]
        meta = {"regularMarketPrice": 7.21, "exchangeTimezoneName": "Europe/Helsinki",
                "regularMarketTime": int(pd.Timestamp("2026-11-16T16:29:32Z").timestamp())}
        valores, estado, tickers = self._con_ticker(meta, filas, ["NOKIA.HE", "SAN.MC"], dias, t("2026-11-16T22:35"))
        self.assertEqual(tickers, ["NOKIA.HE"])
        self.assertEqual((valores[0]["p"], valores[0]["v"]), (7.21, P.num((7.21 / 7.294 - 1) * 100, 2)))
        self.assertEqual(estado["NOKIA.HE"][1:], [7.21, 7.294, "2026-11-16"])
        self.assertTrue(H.quieto("NOKIA.HE", t("2026-11-16T22:35"), t("2026-11-17T03:00"), estado["NOKIA.HE"][3]))
        self.assertEqual(valores[1]["p"], 9.4)

    def test_revision_vela_de_un_dia_nuevo_sin_cierre_no_repite_el_precio(self):
        # pasada la medianoche, una vela del martes sin cierre y el último precio del lunes: el lunes sigue siendo el
        # último cierre y el viernes el anterior (ACS.MC salía con 0 %)
        dias = list(pd.bdate_range(end="2026-11-16", periods=4)) + [pd.Timestamp("2026-11-17")]
        filas = [[92.0, 92.0], [93.5, 93.0], [93.05, 93.0], [91.05, 92.0], [float("nan"), 91.1]]
        meta = {"regularMarketPrice": 91.05, "exchangeTimezoneName": "Europe/Madrid",
                "regularMarketTime": int(pd.Timestamp("2026-11-16T16:35:00Z").timestamp())}
        cols = pd.MultiIndex.from_product([["Close", "Open"], ["ACS.MC"]])
        valores, estado, _ = self._con_ticker(meta, [[f[0], f[1]] for f in filas], ["ACS.MC"], pd.DatetimeIndex(dias), t("2026-11-16T23:13"))
        self.assertEqual(valores[0]["v"], P.num((91.05 / 93.05 - 1) * 100, 2))
        self.assertEqual(estado["ACS.MC"][1:], [91.05, 93.05, "2026-11-16"])
        # y con el último precio con la hora del martes (como lo dio Yahoo), igual: esa vela no es la que falta
        meta["regularMarketTime"] = int(pd.Timestamp("2026-11-16T23:05:00Z").timestamp())
        valores, estado, tickers = self._con_ticker(meta, [[f[0], f[1]] for f in filas], ["ACS.MC"], pd.DatetimeIndex(dias), t("2026-11-16T23:13"))
        self.assertEqual(tickers, [])
        self.assertEqual(valores[0]["v"], P.num((91.05 / 93.05 - 1) * 100, 2))

    def test_revision_cierre_casi_igual_al_anterior_se_vuelve_a_pedir(self):
        dias = pd.bdate_range(end="2026-11-16", periods=5)
        cols = pd.MultiIndex.from_product([["Close"], ["ACS.MC"]])
        P.yf.download = lambda trozo, **k: pd.DataFrame([[92.0], [93.5], [93.05], [91.0500030517578], [91.05]], index=dias, columns=cols)
        valores, estado = [{"s": "ACS.MC", "m": "EUR"}], {}
        P.radar_precios(valores, {}, estado, t("2026-11-16T23:13"))
        self.assertEqual(estado["ACS.MC"][3], "")

    def test_revision_vela_repetida_no_da_cero(self):
        # 16 nov 2026, 22:53 UTC: Yahoo dio dos veces la vela del lunes (ACS.MC 91,05 y 91,05) y salía 0 %; con lo
        # guardado se habría quedado así toda la noche
        dias = list(pd.bdate_range(end="2026-11-16", periods=4)) + [pd.Timestamp("2026-11-16")]
        cols = pd.MultiIndex.from_product([["Close"], ["ACS.MC"]])
        P.yf.download = lambda trozo, **k: pd.DataFrame([[92.0], [93.5], [93.05], [91.05], [91.05]], index=dias, columns=cols)
        valores, estado = [{"s": "ACS.MC", "m": "EUR"}], {}
        P.radar_precios(valores, {}, estado, t("2026-11-16T22:53"))
        self.assertEqual(valores[0]["v"], P.num((91.05 / 93.05 - 1) * 100, 2))
        self.assertEqual(estado["ACS.MC"][1:], [91.05, 93.05, "2026-11-16"])

    def test_revision_cierre_igual_al_anterior_se_vuelve_a_pedir(self):
        dias = pd.bdate_range(end="2026-11-16", periods=5)
        cols = pd.MultiIndex.from_product([["Close"], ["MDLZ"]])
        P.yf.download = lambda trozo, **k: pd.DataFrame([[60.0], [61.0], [62.0], [63.0], [63.0]], index=dias, columns=cols)
        valores, estado = [{"s": "MDLZ", "m": "USD"}], {}
        P.radar_precios(valores, {}, estado, t("2026-11-16T22:53"))
        self.assertEqual(estado["MDLZ"][3], "")
        self.assertFalse(H.quieto("MDLZ", H.leer_hora(estado["MDLZ"][0]), t("2026-11-17T03:00"), estado["MDLZ"][3]))

    def test_revision_festivo_se_pide(self):
        # 26 nov 2026, Acción de Gracias: la última vela de AAPL es del 25; esa noche se sigue pidiendo, como antes
        self.assertFalse(H.quieto("AAPL", t("2026-11-26T22:30"), t("2026-11-27T03:00"), "2026-11-25"))
        self.assertTrue(H.quieto("AAPL", t("2026-11-25T22:30"), t("2026-11-26T03:00"), "2026-11-25"))
        self.assertEqual(H.dia_ultima_sesion("AAPL", t("2026-11-16T03:00")), "2026-11-13")
        self.assertEqual(H.dia_ultima_sesion("^N225", t("2026-11-16T23:00")), "2026-11-16")


if __name__ == "__main__":
    unittest.main()


class FichaEnMenosPeticiones(unittest.TestCase):
    """La ficha del radar: los votos de los analistas en el mismo quoteSummary de t.info y sin la serie del PEG."""

    def setUp(self):
        self.original = P._fetch_yf
        self.llamadas = []

        def falso(quote, modules):
            self.llamadas.append(list(modules))
            res = {"price": {"currentPrice": 10.0}, "financialData": {"targetMeanPrice": 12.0}}
            if "recommendationTrend" in modules:
                res["recommendationTrend"] = {"trend": [{"period": "0m", "strongBuy": 3, "buy": 5, "hold": 2, "sell": 0, "strongSell": 0},
                                                        {"period": "-3m", "strongBuy": 2, "buy": 4, "hold": 3, "sell": 1, "strongSell": 0}], "maxAge": 86400}
            return {"quoteSummary": {"result": [res]}}
        P._fetch_yf = falso

    def tearDown(self):
        P._fetch_yf = self.original

    def test_los_nombres_de_yfinance_siguen_ahi(self):
        import inspect
        from yfinance.scrapers import quote
        fuente = inspect.getsource(quote.Quote._fetch_info)
        self.assertIn(repr(P.INFO_MODULOS).replace('"', "'"), fuente)
        self.assertIn("_already_fetched_complementary", inspect.getsource(quote.Quote._fetch_complementary))
        self.assertIs(quote.Quote._fetch, P._fetch_con_votos)
        t = P.yf.Ticker("AAPL")
        self.assertTrue(hasattr(t, "_quote"))

    def test_votos_en_la_misma_peticion(self):
        t = P.juntar_votos(P.yf.Ticker("AAPL"))
        r = t._quote._fetch(P.INFO_MODULOS)
        # lo de t.info sale igual que sin los votos (el módulo se quita antes de que yfinance lo aplane)
        self.assertNotIn("recommendationTrend", r["quoteSummary"]["result"][0])
        v = P.votos_analistas(t)
        self.assertEqual(v, {"ahora": {"strongBuy": 3, "buy": 5, "hold": 2, "sell": 0, "strongSell": 0},
                             "hace3m": {"strongBuy": 2, "buy": 4, "hold": 3, "sell": 1, "strongSell": 0}})
        self.assertEqual(self.llamadas, [P.INFO_MODULOS + ["recommendationTrend"]])
        self.assertTrue(t._quote._already_fetched_complementary)

    def test_sin_marcar_va_como_antes(self):
        t = P.yf.Ticker("AAPL")
        t._quote._fetch(P.INFO_MODULOS)
        self.assertEqual(self.llamadas, [P.INFO_MODULOS])
        self.assertFalse(getattr(t._quote, "_already_fetched_complementary", False))


class MapaConLaBolsaCerrada(unittest.TestCase):
    def setUp(self):
        self.original = P.bolsa_mapa
        self.pedidos = []

        def falso(pais, simbolos, nombre, etf=None):
            self.pedidos.append(pais)
            return simbolos[0], {"n": nombre, "p": pais, "f": "2026-11-13", "v": 1.0, "m": 2.0, "y": 3.0}
        P.bolsa_mapa = falso

    def tearDown(self):
        P.bolsa_mapa = self.original

    def test_sabado_solo_lo_que_no_tiene_horario(self):
        anterior = {"mapa": {"^SSMI": {"n": "SMI", "p": "CH", "f": "2026-11-13", "v": 0.5, "m": 1.0, "y": 9.0},
                             "^TASI.SR": {"n": "Tadawul", "p": "SA", "f": "2026-11-13", "v": 0.1}}}
        estado = {"CH": "2026-11-13T18:07:00+00:00", "SA": "2026-11-13T18:07:00+00:00"}
        out = P.bolsas_mapa(anterior, estado, t("2026-11-14T04:17"))
        self.assertEqual(out["^SSMI"], anterior["mapa"]["^SSMI"])
        self.assertNotIn("CH", self.pedidos)
        self.assertIn("SA", self.pedidos)  # el Golfo abre en domingo: siempre se pide
        self.assertEqual(len(self.pedidos), len(P.MAPA) - 1)
        self.assertEqual(estado["SA"], "2026-11-14T04:17:00+00:00")

    def test_revision_sin_la_vela_del_viernes_se_pide(self):
        anterior = {"mapa": {"^SSMI": {"n": "SMI", "p": "CH", "f": "2026-11-12", "v": 0.5, "m": 1.0, "y": 9.0}}}
        P.bolsas_mapa(anterior, {"CH": "2026-11-13T18:07:00+00:00"}, t("2026-11-14T04:17"))
        self.assertIn("CH", self.pedidos)

    def test_con_la_bolsa_abierta_se_pide(self):
        anterior = {"mapa": {"^SSMI": {"n": "SMI", "p": "CH", "f": "2026-11-16", "v": 0.5}}}
        P.bolsas_mapa(anterior, {"CH": "2026-11-16T09:07:00+00:00"}, t("2026-11-16T10:07"))
        self.assertIn("CH", self.pedidos)


class ZonasHorariasGuardadas(unittest.TestCase):
    def test_las_actions_guardan_la_zona_de_cada_simbolo(self):
        # sin el archivo de yfinance, cada símbolo cuesta una petición de más en cada pasada (la de su zona horaria)
        for flujo in ("precios.yml", "catalogo.yml"):
            yml = (RAIZ / ".github" / "workflows" / flujo).read_text(encoding="utf-8")
            self.assertIn("path: ~/.cache/py-yfinance/tkr-tz.db", yml, flujo)
            self.assertIn("uses: actions/cache@v4", yml, flujo)


class EnsayoEquivalencia(unittest.TestCase):
    def test_revision_compara_lo_lento_y_puede_seguir_desde_horas_antes(self):
        # 16 nov 2026 (revisión): la equivalencia solo miraba 12 minutos después; con seguimiento_de, la rama sigue desde
        # la primera pasada de otra equivalencia (horas antes). Y las dos pasadas piden lo lento y radar-mas
        yml = (RAIZ / ".github" / "workflows" / "precios.yml").read_text(encoding="utf-8")
        trabajo = yml.split("\n  equivalencia:\n", 1)[1]
        self.assertIn("seguimiento_de:", yml.split("jobs:")[0])
        self.assertIn('gh run download "${{ inputs.seguimiento_de }}" -n equivalencia', trabajo)
        self.assertIn("actions: read", trabajo)
        self.assertIn('("anterior/radar-mas.json", lambda d: d.update(precios=viejo))', trabajo)
        self.assertIn("v.update(lento=viejo)", trabajo)


class EquivalenciaExplicadas(unittest.TestCase):
    def test_revision_main_sin_la_vela_y_objetivo_en_otra_moneda(self):
        import equivalencia as E
        a = {"valores": [{"s": "NOKIA.HE", "p": 7.294, "v": -4.5}, {"s": "BAKKA.OL", "p": 500.0, "obj": 489.8753},
                         {"s": "SAN.MC", "p": 9.0}]}
        b = {"valores": [{"s": "NOKIA.HE", "p": 7.21, "v": -1.15}, {"s": "BAKKA.OL", "p": 500.0, "obj": 489.7028},
                         {"s": "SAN.MC", "p": 9.1}]}
        seg = {"NOKIA.HE": ["2026-11-16T18:52:39+00:00", 7.21, 7.294, "2026-11-16"],
               "SAN.MC": ["2026-11-16T18:52:39+00:00", 9.1, 9.05, "2026-11-16"]}
        self.assertEqual(E.explicada("radar.json", "/valores[NOKIA.HE]/v", -4.5, -1.15, a, b, seg), "main sin la vela")
        self.assertEqual(E.explicada("radar-mas.json", "/valores[BAKKA.OL]/obj", 489.8753, 489.7028, a, b, seg), "objetivo en otra moneda")
        a["valores"][2]["pe"], b["valores"][2]["pe"], b["valores"][2]["p"] = 9.0, 9.001, 9.0
        self.assertEqual(E.explicada("radar.json", "/valores[SAN.MC]/pe", 9.0, 9.001, a, b, seg), "cambio del euro")
        b["valores"][2]["p"] = 9.1
        # una diferencia de precio de verdad no se explica
        self.assertIsNone(E.explicada("radar.json", "/valores[SAN.MC]/p", 9.0, 9.1, a, b, seg))
        self.assertIsNone(E.explicada("precios.json", "/mercados/^IBEX/precio", 1, 2, a, b, seg))
