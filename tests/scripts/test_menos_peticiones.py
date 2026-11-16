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
        estado = {"SAN.MC": ["2026-11-16T17:47:00+00:00", 9.5, 9.0], "AAPL": ["2026-11-16T17:47:00+00:00", 200.0, 190.0]}
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
        self.assertEqual(estado["NUEVA.MC"], ["2026-11-16T18:07:00+00:00", 12.0, 11.0])
        self.assertEqual(estado["SAN.MC"][0], "2026-11-16T17:47:00+00:00")

    def test_sin_estado_se_pide_todo_como_antes(self):
        valores = [{"s": "AAPL", "m": "USD"}, {"s": "SAN.MC", "m": "EUR"}]
        P.radar_precios(valores, {"USD": pd.Series([1.10])}, None, t("2026-11-15T12:00"))
        self.assertEqual(sorted(s for tr in self.pedidos for s in tr), ["AAPL", "SAN.MC"])

    def test_el_euro_se_rehace_con_el_cambio_de_ahora(self):
        # con Nueva York cerrada el precio en dólares no cambia, pero el euro sí: pe sale con el cambio de esta pasada
        valores = [{"s": "AAPL", "m": "USD"}]
        estado = {"AAPL": ["2026-11-16T06:07:00+00:00", 200.0, 190.0]}
        P.radar_precios(valores, {"USD": pd.Series([1.25])}, estado, t("2026-11-16T09:07"))
        self.assertEqual(self.pedidos, [])
        self.assertEqual(valores[0]["pe"], P.num(200.0 / 1.25, 4))


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

    def test_con_la_bolsa_abierta_se_pide(self):
        anterior = {"mapa": {"^SSMI": {"n": "SMI", "p": "CH", "f": "2026-11-16", "v": 0.5}}}
        P.bolsas_mapa(anterior, {"CH": "2026-11-16T09:07:00+00:00"}, t("2026-11-16T10:07"))
        self.assertIn("CH", self.pedidos)
