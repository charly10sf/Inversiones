"""Pruebas del radar ampliado (5 nov 2026) en scripts/precios.py, sin Yahoo: el descubrimiento por tamaño
(sin mirar lo que recomiendan los analistas), las fichas por turnos y el reparto entre radar.json y
radar-mas.json.

Uso: python3 -m unittest discover -s tests/scripts
"""
import datetime as dt
import sys
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import precios as P  # noqa: E402


def hace(horas):
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=horas)).replace(microsecond=0).isoformat()


def cita(sim, cap, nota="2.0 - Buy", exchange="NMS", moneda="USD", nombre=None):
    return {"symbol": sim, "marketCap": cap, "averageAnalystRating": nota, "exchange": exchange, "currency": moneda,
            "quoteType": "EQUITY", "longName": nombre or sim}


class Descubrir(unittest.TestCase):
    def setUp(self):
        import yfinance
        self.yf, self.cambio = yfinance.screen, P.cambio_hoy
        P.cambio_hoy = lambda moneda, fx: 1.0
        # una página por región; solo se rellenan EE. UU., Alemania y España
        self.paginas = {
            "us": [cita("AAPL", 3e12), cita("BIGU", 5e9, nota="4.6 - Sell"), cita("NOAN", 4e9, nota=None),
                   cita("SMALL", 1e9), cita("SAP", 2.5e11, nombre="SAP SE"), cita("BRK.B", 9e11)],
            "de": [cita("APC.DE", 3e12, nota=None, exchange="GER", moneda="EUR", nombre="Apple Inc."),
                   cita("SAP.DE", 2.5e11, exchange="GER", moneda="EUR", nombre="SAP SE"),
                   cita("HEN3.DE", 3e10, nota="3.1 - Hold", exchange="GER", moneda="EUR"),
                   cita("KLEIN.DE", 4e8, exchange="GER", moneda="EUR")],
            "es": [cita("TSK.MC", 7e8, nota=None, exchange="MCE", moneda="EUR"),
                   cita("XPBR.MC", 2e10, nota=None, exchange="MCE", moneda="EUR"),
                   cita("ITX.MC", 1.5e11, exchange="MCE", moneda="EUR")],
        }

        def screen(q, offset=0, size=250, **kw):
            reg, texto = None, str(q.to_dict())
            for r in self.paginas:
                if f"'{r}'" in texto:
                    reg = r
            return {"quotes": self.paginas.get(reg, []) if offset == 0 else []}
        yfinance.screen = screen
        P.yf.screen = screen

    def tearDown(self):
        import yfinance
        yfinance.screen = self.yf
        P.yf.screen = self.yf
        P.cambio_hoy = self.cambio

    def test_por_tamano_sin_mirar_la_nota(self):
        elegidas, diag = P.descubrir({}, {"ITX.MC"})
        sims = [s for s, _ in elegidas]
        # entra la que los analistas dicen «vender» (lo que digan no cuenta) y la de «mantener»
        self.assertIn("BIGU", sims)
        self.assertIn("HEN3.DE", sims)
        # fuera: las de menos del mínimo, la de otra bolsa sin nota (Apple en Fráncfort), la de EE. UU. sin nota,
        # las clases con punto, Latibex y las que ya están en la lista fija
        for fuera in ("SMALL", "KLEIN.DE", "APC.DE", "NOAN", "BRK.B", "XPBR.MC", "ITX.MC"):
            self.assertNotIn(fuera, sims)
        # en España cuenta también la que no tiene nota
        self.assertIn("TSK.MC", sims)
        # la misma empresa en Europa y en EE. UU.: se queda la de Europa
        self.assertIn("SAP.DE", sims)
        self.assertNotIn("SAP", sims)
        self.assertEqual(diag["repetidas"], 1)
        # de mayor a menor
        caps = {"AAPL": 3e12, "SAP.DE": 2.5e11, "HEN3.DE": 3e10, "BIGU": 5e9, "TSK.MC": 7e8}
        self.assertEqual(sims, sorted(sims, key=lambda s: -caps[s]))
        self.assertEqual(diag["version"], 3)


class Turnos(unittest.TestCase):
    def test_primero_las_que_no_tienen_y_luego_las_viejas(self):
        tareas = [(f"S{i}", "EEUU") for i in range(20)]
        antes = {f"S{i}": {"s": f"S{i}", "f": hace(5 + i)} for i in range(10)}      # las 10 primeras, viejas
        antes.update({f"S{i}": {"s": f"S{i}", "f": hace(0.2)} for i in range(10, 15)})  # 5 recién hechas
        viejo, P.RADAR_MIN_PASADA = P.RADAR_MIN_PASADA, 8
        try:
            r = [s for s, _ in P.elegir_renovar(tareas, antes)]
        finally:
            P.RADAR_MIN_PASADA = viejo
        self.assertEqual(len(r), 8)
        self.assertEqual(r[:5], ["S15", "S16", "S17", "S18", "S19"])   # sin ficha
        self.assertEqual(r[5:], ["S9", "S8", "S7"])                     # las más viejas primero
        self.assertFalse(set(r) & {f"S{i}" for i in range(10, 15)})     # las de hace un rato, no

    def test_tope_por_ejecucion(self):
        tareas = [(f"S{i}", "EEUU") for i in range(3000)]
        r = P.elegir_renovar(tareas, {})
        self.assertEqual(len(r), max(P.RADAR_MIN_PASADA, -(-3000 // P.RADAR_PASADAS)))
        self.assertEqual(len(P.elegir_renovar(tareas, {}, todas=True)), 3000)

    def test_clave_empresa(self):
        self.assertEqual(P.clave_empresa("SAP SE"), P.clave_empresa("Sap"))
        self.assertEqual(P.clave_empresa("Apple Inc."), "apple")
        self.assertNotEqual(P.clave_empresa("Banco Santander, S.A."), P.clave_empresa("Santander Consumer"))


if __name__ == "__main__":
    unittest.main()
