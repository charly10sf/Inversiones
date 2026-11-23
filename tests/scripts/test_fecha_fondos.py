"""23 nov: el día del valor liquidativo de un fondo (al_dia en scripts/precios.py). Sin internet: series y metadatos
como los que dio Yahoo ese lunes a las 18:55.

Uso: python3 -m unittest discover -s tests/scripts
"""
import sys
import unittest
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import precios as P  # noqa: E402


def serie(pares):
    return pd.Series([p for _, p in pares], index=pd.to_datetime([d for d, _ in pares]))


def meta(precio, cuando_utc, tipo="MUTUALFUND", tz="Europe/Berlin"):
    return {"regularMarketPrice": precio, "regularMarketTime": int(pd.Timestamp(cuando_utc, tz="UTC").timestamp()),
            "exchangeTimezoneName": tz, "instrumentType": tipo}


class FechaFondos(unittest.TestCase):
    def setUp(self):
        # que «ahora» sea el lunes 23 por la tarde (al_dia descarta metadatos de hace más de 6 días)
        self._now = pd.Timestamp.now
        pd.Timestamp.now = staticmethod(lambda tz=None: pd.Timestamp("2026-11-23 18:55", tz="Europe/Madrid").tz_convert(tz or "UTC"))

    def tearDown(self):
        pd.Timestamp.now = self._now

    def test_amundi_luxemburgo_va_al_viernes(self):
        # LU0389811539.LU: histórico hasta el jueves; 375,55 publicado el lunes a las 7:55 de Fráncfort = el del viernes
        s = serie([("2026-11-18", 386.57), ("2026-11-19", 383.87)])
        r = P.al_dia(s, meta(375.55, "2026-11-23 06:55"))
        self.assertEqual(r.index[-1], pd.Timestamp("2026-11-20"))
        self.assertAlmostEqual(r.iloc[-1], 375.55)
        self.assertNotIn(pd.Timestamp("2026-11-23"), r.index)

    def test_amundi_con_el_viernes_ya_puesto_no_inventa_el_lunes(self):
        # cuando Yahoo ya trae el viernes en el histórico, el mismo valor del lunes por la mañana no es un día más
        s = serie([("2026-11-19", 383.87), ("2026-11-20", 375.55)])
        r = P.al_dia(s, meta(375.55, "2026-11-23 06:55"))
        self.assertEqual(list(r.index[-2:]), [pd.Timestamp("2026-11-19"), pd.Timestamp("2026-11-20")])

    def test_publicado_un_martes_es_del_lunes(self):
        s = serie([("2026-11-20", 375.55)])
        r = P.al_dia(s, meta(380.0, "2026-11-24 06:55"))
        self.assertEqual(r.index[-1], pd.Timestamp("2026-11-23"))

    def test_fondo_de_frankfurt_con_hora_de_cierre_no_cambia(self):
        # 0P00012I6A.F: el jueves a las 22:00 con el valor del jueves; el histórico ya llega al viernes
        s = serie([("2026-11-19", 281.675), ("2026-11-20", 272.797)])
        r = P.al_dia(s, meta(281.675, "2026-11-19 21:00"))
        self.assertEqual(r.index[-1], pd.Timestamp("2026-11-20"))
        self.assertAlmostEqual(r.iloc[-1], 272.797)
        # y si el histórico va un día por detrás, el valor del jueves va al jueves
        s = serie([("2026-11-18", 285.658)])
        r = P.al_dia(s, meta(281.675, "2026-11-19 21:00"))
        self.assertEqual(r.index[-1], pd.Timestamp("2026-11-19"))

    def test_fondo_de_londres_y_de_nueva_york(self):
        s = serie([("2026-11-18", 28.258)])
        r = P.al_dia(s, meta(27.846, "2026-11-19 16:30", tz="Europe/London"))
        self.assertEqual(r.index[-1], pd.Timestamp("2026-11-19"))
        s = serie([("2026-11-18", 487.962)])
        r = P.al_dia(s, meta(480.292, "2026-11-19 21:00", tz="America/New_York"))
        self.assertEqual(r.index[-1], pd.Timestamp("2026-11-19"))

    def test_una_accion_por_la_manana_sigue_siendo_de_hoy(self):
        # lo que cotiza (no MUTUALFUND) se queda en el día de su hora, aunque sea por la mañana
        s = serie([("2026-11-20", 27.0)])
        r = P.al_dia(s, meta(27.4, "2026-11-23 09:30", tipo="EQUITY", tz="Europe/Madrid"))
        self.assertEqual(r.index[-1], pd.Timestamp("2026-11-23"))


if __name__ == "__main__":
    unittest.main()
