"""Pruebas del catálogo ampliado (5 nov 2026), sin red: las listas de Xetra y de la CNMV (con un CSV y un XML
pequeños de muestra en tests/scripts/muestras), los nombres de los fondos españoles, la comprobación del nombre
de Yahoo, el relleno de símbolos y el reparto entre catalogo-precios.json y catalogo-mas.json.

Uso: python3 -m unittest discover -s tests/scripts
"""
import io
import json
import os
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parents[2]
MUESTRAS = Path(__file__).resolve().parent / "muestras"
sys.path.insert(0, str(RAIZ / "scripts"))
import catalogo as C  # noqa: E402
import catalogo_listas as L  # noqa: E402


class Listas(unittest.TestCase):
    def test_xetra_solo_etf_etc_etn_activos_y_sin_repetir(self):
        x = L.leer_xetra((MUESTRAS / "xetra-muestra.csv").read_text(encoding="utf-8"))
        isins = [e["isin"] for e in x]
        self.assertEqual(len(isins), len(set(isins)))
        self.assertNotIn("AT000000STR1", isins)   # una acción
        self.assertNotIn("IE00INACTIV1", isins)   # inactivo
        self.assertEqual(len(x), 6)
        por = {e["isin"]: e for e in x}
        self.assertEqual(por["CH0445689208"]["t"], "ETC")   # los ETN van como ETC
        self.assertEqual(por["BG9000011163"]["t"], "ETF")
        self.assertIn("PASSIV", por["BG9000011163"]["g"])

    def test_cnmv_desde_el_zip(self):
        b = io.BytesIO()
        with zipfile.ZipFile(b, "w") as z:
            z.writestr("FONDREGISTRO_202608.xml", (MUESTRAS / "fondregistro-muestra.xml").read_bytes())
            z.writestr("FONDMENS_202608.xml", "<FondMens/>")
        fondos, mes = L.leer_cnmv_zip(b.getvalue())
        self.assertEqual(mes, "202608")
        por = {e["isin"]: e for e in fondos}
        self.assertEqual(len(fondos), 4)                      # sin el repetido ni el ISIN roto
        self.assertEqual(por["ES0114675004"]["n"], "Bestinver Renta FI, clase R")
        self.assertEqual(por["ES0114675038"]["n"], "Bestinver Renta FI")   # la clase 0 no se dice
        self.assertEqual(por["ES0141116048"]["n"], "Gestion Boutique VI FI, Gestivalue Capital, clase A")
        self.assertEqual(por["ES0105336038"]["t"], "ETF")
        self.assertEqual(por["ES0105336038"]["n"], "BBVA Accion Ibex FI Cotizado Armonizado, clase Estándar")
        self.assertEqual(por["ES0114675004"]["g"], "BESTINVER")
        self.assertIn("ANDBANK", por["ES0141116048"]["g"])    # sin grupo: la gestora

    def test_zip_sin_registro(self):
        b = io.BytesIO()
        with zipfile.ZipFile(b, "w") as z:
            z.writestr("OTRA_202608.xml", "<x/>")
        with self.assertRaises(RuntimeError):
            L.leer_cnmv_zip(b.getvalue())

    def test_enlaces_de_la_pagina_de_la_cnmv(self):
        html = ('<a href="https://www.cnmv.es/webservices/verdocumento/ver?e=AAA%2fB">Agosto</a>'
                '<a href="https://www.cnmv.es/webservices/verdocumento/ver?e=CCC">Julio</a>'
                '<a href="https://www.cnmv.es/webservices/verdocumento/ver?e=AAA%2fB">Agosto</a>')
        self.assertEqual(L.enlaces_cnmv(html), ["https://www.cnmv.es/webservices/verdocumento/ver?e=AAA%2fB",
                                                 "https://www.cnmv.es/webservices/verdocumento/ver?e=CCC"])

    def test_juntar_xetra_manda(self):
        j = L.juntar([{"isin": "ES0105336038", "n": "BBVA IBEX ETF", "t": "ETF", "g": ""}],
                     [{"isin": "ES0105336038", "n": "BBVA Accion Ibex", "t": "ETF", "g": "BBVA"},
                      {"isin": "ES0114675004", "n": "Bestinver Renta FI, clase R", "t": "Fondo", "g": "BESTINVER"}])
        self.assertEqual(j["ES0105336038"]["o"], "x")
        self.assertEqual(j["ES0114675004"]["o"], "c")

    def test_titulo(self):
        self.assertEqual(L.titulo("CAIXABANK RENTA FIJA EURO, FI"), "Caixabank Renta Fija Euro, FI")
        self.assertEqual(L.titulo("A&P LIFESCIENCE"), "A&P Lifescience")
        self.assertEqual(L.titulo("FONDO DE LA BOLSA EEUU II"), "Fondo de la Bolsa EEUU II")


class Nombres(unittest.TestCase):
    def test_cuadra_con_las_abreviaturas_de_yahoo(self):
        self.assertTrue(C.cuadra_cnmv("Bestinver Renta FI, clase R", "Bestinver Renta FI R"))
        self.assertTrue(C.cuadra_cnmv("Caixabank Renta Fija Alta Calidad Crediticia FI, clase Estándar",
                                      "CaixaBank Rta Fja Alta Calidad Cred FI Estandar"))
        self.assertTrue(C.cuadra_cnmv("Mutuafondo 2029 II FI, clase L", "Mutuafondo 2029 II FI L"))
        # los que el ensayo del 5 nov daba por dudosos sin serlo
        for mio, suyo in [("Mi Cartera Renta Fija Soberana FI", "Mi Cartera Renta Fija Soberana FI"), ("DB Corto Plazo FI, clase I", "DB Corto Plazo I FI"),
                          ("A&P Lifescience Fund FI, clase A", "A&P Lifescience Fund A FI"), ("Santalucia Renta Variable Emergentes FI, clase B", "Santalucía RV Emergentes B FI"),
                          ("Ginvest Gps FI, Short Term Selection, clase Serie 0", "Short Term Selection FI"), ("Gvcgaesco T.f.t. FI", "GVC Gaesco T.F.T. FI"),
                          ("Solventis Hermes Multigestion F.I., Atenea, clase GD", "Solventis Hermes Mltg Atenea GD FI"), ("Bankinter Inverso EE.UU. FI, clase R", "Bankinter Inverso EEUU R FI"),
                          ("Caixabank Seleccion Compromiso Futuro 0/30 RV FI, clase Sin Retro", "Caixabank Sel Cmprms Ftr 0/30 Rv SR FI"), ("Mutuafondo Lp FI, clase L", "Mutuafondo LP L FI")]:
            self.assertTrue(C.cuadra_cnmv(mio, suyo), (mio, suyo))
        self.assertTrue(C.cuadra_cnmv("Unicaja Renta Variable Global FI, clase I", ""))   # Yahoo sin nombre: vale el ISIN

    def test_no_cuadra_otro_fondo(self):
        self.assertFalse(C.cuadra_cnmv("Bestinver Renta FI, clase R", "Cobas Internacional FI"))
        self.assertFalse(C.cuadra_cnmv("Mutuafondo 2029 II FI, clase L", "Mutuafondo 2031 FI L"))
        self.assertFalse(C.cuadra_cnmv("Mutuafondo 2029 FI, clase L", "Mutuafondo 2031 FI L"))

    def test_dominio_por_grupo(self):
        self.assertEqual(C.dominio_grupo("BANCO BILBAO VIZCAYA ARGENTARIA, S.A."), "bbvaassetmanagement.com")
        self.assertEqual(C.dominio_grupo("MUTUA MADRILEÑA"), "mutuactivos.com")
        self.assertIsNone(C.dominio_grupo("NADIE"))


class Relleno(unittest.TestCase):
    def setUp(self):
        self.resolver = C.resolver

    def tearDown(self):
        C.resolver = self.resolver

    def test_guarda_simbolo_y_marca_dudas_y_fallos(self):
        def falso(e):
            if e["isin"] == "ES000000NO01":
                raise RuntimeError("Yahoo no da resultados")
            return {"s": "0P1.F", "m": "EUR", "yn": "Otro Fondo Distinto FI" if e["isin"] == "ES000000DU01" else "Bestinver Renta FI R", "yt": "MUTUALFUND"}
        C.resolver = falso
        u = {"ES000000OK01": {"o": "c", "n": "Bestinver Renta FI, clase R"},
             "ES000000DU01": {"o": "c", "n": "Bestinver Renta FI, clase R"},
             "ES000000NO01": {"o": "c", "n": "X FI"},
             "ES000000YA01": {"o": "c", "n": "Y FI", "no": C.hoy_iso()},          # falló hoy: no se vuelve a probar
             "ES000000EX01": {"o": "c", "n": "Z FI"}}
        for k, e in u.items():
            e["isin"] = k
        C.rellenar(u, {"ES000000EX01"}, 5, pausa=0)
        self.assertEqual(u["ES000000OK01"]["s"], "0P1.F")
        self.assertNotIn("dud", u["ES000000OK01"])
        self.assertEqual(u["ES000000DU01"]["dud"], 1)
        self.assertEqual(u["ES000000NO01"]["no"], C.hoy_iso())
        self.assertNotIn("s", u["ES000000YA01"])
        self.assertNotIn("s", u["ES000000EX01"])

    def test_muchos_que_no_estan_seguidos_no_paran_el_relleno(self):
        # el 5 nov se paró a los 222 de 808: casi todos los pendientes son los que Yahoo no tiene
        def falso(e):
            if e["isin"] == "IE00B4L5Y983":
                return {"s": "EUNL.DE", "m": "EUR", "yn": "iShares", "yt": "ETF"}
            if e["isin"].endswith("99"):
                return {"s": "X.DE", "m": "EUR", "yn": "X", "yt": "ETF"}
            raise RuntimeError("Yahoo no da resultados")
        C.resolver = falso
        u = {f"IE{k:08d}00": {"isin": f"IE{k:08d}00", "o": "x", "n": "ETF"} for k in range(120)}
        u["IE0000000099"] = {"isin": "IE0000000099", "o": "x", "n": "ETF"}
        C.rellenar(u, set(), 5, pausa=0)
        self.assertEqual(sum(1 for e in u.values() if e.get("no")), 120)
        self.assertEqual(u["IE0000000099"]["s"], "X.DE")

    def test_si_yahoo_deja_de_contestar_se_para_sin_apuntar_fallos(self):
        llamadas = []

        def falso(e):
            llamadas.append(e["isin"])
            raise RuntimeError("429")
        C.resolver = falso
        u = {f"IE{k:010d}": {"isin": f"IE{k:010d}", "o": "x", "n": "ETF"} for k in range(100)}
        C.rellenar(u, set(), 5, pausa=0)
        self.assertEqual(len(llamadas), 41)   # 40 y la prueba con uno que sí está
        self.assertFalse(any("no" in e for e in u.values()))


def serie(n=300, base=10.0):
    idx = pd.bdate_range(end=pd.Timestamp.now().normalize(), periods=n)
    return pd.Series([base * (1 + k / 1000) for k in range(n)], index=idx)


class Ampliado(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.mkdtemp()
        self.ant, self.sal = os.path.join(self.d, "ant"), os.path.join(self.d, "sal")
        os.makedirs(f"{self.ant}/cat")
        os.makedirs(f"{self.sal}/cat")
        self.orig = (L.bajar_xetra, L.bajar_cnmv, C.yf.download, C.RELLENO_MIN, C.SEMILLA, C.resolver)
        L.bajar_xetra = lambda: [{"isin": "IE00B4L5Y983", "n": "ISHS CORE MSCI WLD", "t": "ETF", "g": "EXCHANGE TRADED FUNDS - PASSIV"},
                                 {"isin": "IE00BZ163G84", "n": "VANG.EUR CORP BD", "t": "ETF", "g": "EXCHANGE TRADED FUNDS - RENTEN"},
                                 {"isin": "IE0000000001", "n": "EN EL NUCLEO", "t": "ETF", "g": ""}]
        L.bajar_cnmv = lambda: ([{"isin": "ES0114675004", "n": "Bestinver Renta FI, clase R", "t": "Fondo", "g": "BESTINVER"},
                                 {"isin": "ES0000000DUD", "n": "Bestinver Renta FI, clase R", "t": "Fondo", "g": "BESTINVER"}], "202608")
        C.SEMILLA = os.path.join(self.d, "semilla.json")
        with open(C.SEMILLA, "w") as f:
            json.dump({"u": {"IE00B4L5Y983": {"s": "EUNL.DE", "m": "EUR", "yn": "iShares Core MSCI World UCITS ETF USD (Acc)"},
                             "IE00BZ163G84": {"s": "VECP.DE", "m": "EUR", "yn": "Vanguard EUR Corporate Bond UCITS ETF"},
                             "ES0114675004": {"s": "0P0000.F", "m": "EUR", "yn": "Bestinver Renta FI R"},
                             "ES0000000DUD": {"s": "0P9999.F", "m": "EUR", "yn": "Otra Cosa FI", "dud": 1},
                             "IE0000000001": {"s": "NUC.DE", "m": "EUR", "yn": "Nucleo"}}}, f)
        C.RELLENO_MIN = 0
        C.resolver = lambda e: (_ for _ in ()).throw(RuntimeError("no hace falta"))
        self.pedidos = []

        def descarga(trozo, **k):
            self.pedidos.append(list(trozo))
            datos = {s: serie(base=20 if s == "VECP.DE" else 10) for s in trozo if s != "0P0000.F"}
            return pd.concat({"Close": pd.DataFrame(datos)}, axis=1)
        C.yf.download = descarga

    def tearDown(self):
        L.bajar_xetra, L.bajar_cnmv, C.yf.download, C.RELLENO_MIN, C.SEMILLA, C.resolver = self.orig

    def test_completo(self):
        # un día anterior: el fondo de Bestinver tenía precio de ayer (hoy Yahoo no lo trae)
        ayer = (pd.Timestamp.now() - pd.Timedelta(days=1)).date().isoformat()
        with open(f"{self.ant}/catalogo-mas.json", "w") as f:
            json.dump({"generado": "x", "cols": C.COLS_MAS, "v": [["ES0114675004", "Bestinver Renta FI, clase R", "Bestinver Renta", "0P0000.F", "Fondo", "Renta fija", None, "EUR", "bestinver.es", 5, 4.9, ayer, 3]]}, f)
        with open(f"{self.ant}/cat/c-es0114675004.json", "w") as f:
            json.dump({"h": [[ayer, 5]]}, f)
        mas = C.ampliado({"c-ie0000000001"}, self.ant, self.sal, {}, modo="completo")
        self.assertEqual(mas["n"], 3)
        j = C.leer(f"{self.sal}/catalogo-mas.json")
        filas = {f[0]: dict(zip(j["cols"], f)) for f in j["v"]}
        self.assertEqual(set(filas), {"IE00B4L5Y983", "IE00BZ163G84", "ES0114675004"})   # ni el del núcleo ni el dudoso
        self.assertEqual(filas["IE00B4L5Y983"]["n"], "iShares Core MSCI World UCITS ETF USD (Acc)")   # el nombre de Yahoo
        self.assertEqual(filas["IE00B4L5Y983"]["dom"], "ishares.com")
        self.assertEqual(filas["IE00BZ163G84"]["cl"], "Renta fija")
        self.assertEqual(filas["ES0114675004"]["p"], 5)      # el de ayer
        self.assertTrue(os.path.exists(f"{self.sal}/cat/c-es0114675004.json"))
        h = C.leer(f"{self.sal}/cat/c-ie00b4l5y983.json")
        self.assertEqual(h["sem"], 1)
        self.assertLess(len(h["h"]), 60)                     # un año, semanal
        self.assertNotIn("NUC.DE", sum(self.pedidos, []))
        est = C.leer(f"{self.sal}/catalogo-ampliado.json")
        self.assertEqual(est["listas"]["cnmv"], "202608")
        self.assertEqual(est["dudas"][0][0], "ES0000000DUD")
        # al día siguiente, con la lista de la CNMV caída, se sigue con la de ayer
        os.replace(f"{self.sal}/catalogo-ampliado.json", f"{self.ant}/catalogo-ampliado.json")
        L.bajar_cnmv = lambda: (_ for _ in ()).throw(RuntimeError("caída"))
        sal2 = os.path.join(self.d, "sal2")
        os.makedirs(f"{sal2}/cat")
        C.ampliado(set(), self.ant, sal2, {}, modo="completo")
        est2 = C.leer(f"{sal2}/catalogo-ampliado.json")
        self.assertIn("ES0114675004", est2["u"])
        self.assertEqual(est2["u"]["ES0114675004"]["s"], "0P0000.F")

    def test_rapido_copia_lo_de_esta_manana(self):
        with open(f"{self.ant}/catalogo-mas.json", "w") as f:
            json.dump({"generado": "g1", "cols": C.COLS_MAS, "v": [["IE00B4L5Y983", "iShares", "iShares", "EUNL.DE", "ETF", "Renta variable", None, "EUR", None, 1, 1, "2026-11-05", 1],
                                                                  ["ES0114675004", "Bestinver", "Bestinver", "0P0000.F", "Fondo", "Renta fija", None, "EUR", None, 1, 1, "2026-11-05", 1]]}, f)
        with open(f"{self.ant}/cat/c-ie00b4l5y983.json", "w") as f:
            f.write('{"h":[]}')
        with open(f"{self.ant}/catalogo-ampliado.json", "w") as f:
            f.write('{"u":{}}')
        # el de Bestinver lo ha pedido alguien: pasa al núcleo y deja catalogo-mas.json
        mas = C.ampliado({"c-es0114675004"}, self.ant, self.sal, {}, modo="rapido")
        self.assertEqual(mas, {"id": "g1", "n": 1})
        self.assertEqual(self.pedidos, [])
        self.assertTrue(os.path.exists(f"{self.sal}/cat/c-ie00b4l5y983.json"))
        self.assertTrue(os.path.exists(f"{self.sal}/catalogo-ampliado.json"))

    def test_ficha_de_un_fondo_espanol(self):
        x = C.ficha_mas("ES0114675004", {"o": "c", "n": "Ibercaja Bolsa Europa FI, clase A", "t": "Fondo", "s": "0P1.F", "m": "EUR", "g": "IBERCAJA"}, serie())
        self.assertEqual(x["t"], "Fondo")
        self.assertEqual(x["cl"], "Renta variable")
        self.assertEqual(x["r"], {"Europa": 100})
        self.assertEqual(x["dom"], "ibercajagestion.com")
        self.assertIsNotNone(x["r1a"])


if __name__ == "__main__":
    unittest.main()
