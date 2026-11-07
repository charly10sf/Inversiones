"""0.8.2f: cuánto acierta el radar (scripts/aciertos.py). Sin internet: la «rama datos» es una carpeta temporal.

Uso: python3 -m unittest discover -s tests/scripts
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import aciertos as A  # noqa: E402


def indice(precio_por_dia):
    return [[d, p] for d, p in sorted(precio_por_dia.items())]


class Datos:
    """Una carpeta con lo que bajaría la Action de la rama «datos»"""

    def __init__(self):
        self.t = tempfile.TemporaryDirectory()
        self.dir = self.t.name

    def escribir(self, nombre, obj):
        with open(f"{self.dir}/{nombre}", "w", encoding="utf-8") as f:
            json.dump(obj, f)

    def poner(self, ideas=(), evitar=(), radar=(), precios=None, ref=None, plazos=None, mas=None):
        self.escribir("escaneo.json", {"decision": {
            "ideas": [{"s": s} for s in ideas], "evitar": [{"s": s} for s in evitar], "radar": list(radar), "plazos": plazos or {}}})
        self.escribir("radar.json", {"valores": [{"s": s, "pe": p, "p": p, "m": "EUR"} for s, p in (precios or {}).items()]})
        self.escribir("radar-mas.json", {"valores": [{"s": s, "pe": p, "m": "USD"} for s, p in (mas or {}).items()]})
        self.escribir("historico.json", {"instrumentos": {A.REFERENCIA: indice(ref or {})}})


def dia(n):
    import datetime as dt
    return (dt.date(2026, 11, 7) + dt.timedelta(days=n)).isoformat()


class PruebasAciertos(unittest.TestCase):
    def setUp(self):
        self.d = Datos()
        self.addCleanup(self.d.t.cleanup)
        self.salida = f"{self.d.dir}/salida.json"

    def pasada(self, n, anterior=None, **kw):
        self.d.poner(**kw)
        return A.main(self.d.dir, anterior, self.salida, hoy=dia(n))

    def test_primera_pasada_apunta_precio_y_referencia_sin_resultados(self):
        ref = {dia(-3): 100.0}
        e = self.pasada(0, ideas=["WDC"], evitar=["RHM.DE"], radar=["NVDA", "WDC"], precios={"WDC": 50.0, "RHM.DE": 20.0, "NVDA": 100.0},
                        ref=ref, plazos={"WDC": {"meses": 9, "subida_pct": 35, "por": "x"}})
        self.assertEqual(len(e["entradas"]), 4)
        wdc = [x for x in e["entradas"] if x["s"] == "WDC" and x["cat"] == "idea"][0]
        self.assertEqual((wdc["d"], wdc["pe"], wdc["ref"]), (dia(0), 50.0, 100.0))
        self.assertEqual(wdc["plazo"], {"meses": 9, "subida_pct": 35})
        self.assertTrue(all(not x["res"] for x in e["entradas"]))
        # lo mismo en dos listas son dos entradas distintas: se mide cada lista por separado
        self.assertEqual(sorted(x["cat"] for x in e["entradas"] if x["s"] == "WDC"), ["idea", "radar"])

    def test_no_se_repite_mientras_siga_en_la_lista_ni_dos_veces_el_mismo_dia(self):
        ref = {dia(-3): 100.0, dia(5): 101.0}
        self.pasada(0, ideas=["WDC"], precios={"WDC": 50.0}, ref=ref)
        e = self.pasada(0, self.salida, ideas=["WDC"], precios={"WDC": 50.0}, ref=ref)
        e = self.pasada(5, self.salida, ideas=["WDC"], precios={"WDC": 52.0}, ref=ref)
        self.assertEqual(len(e["entradas"]), 1)
        self.assertEqual(e["entradas"][0]["vista"], dia(5))
        self.assertEqual(e["entradas"][0]["pe"], 50.0)

    def test_si_desaparece_mas_de_una_semana_y_vuelve_es_una_entrada_nueva(self):
        ref = {dia(-3): 100.0, dia(20): 100.0}
        self.pasada(0, ideas=["WDC"], precios={"WDC": 50.0}, ref=ref)
        self.pasada(2, self.salida, ideas=[], radar=["NVDA"], precios={"WDC": 51.0, "NVDA": 1.0}, ref=ref)
        e = self.pasada(20, self.salida, ideas=["WDC"], precios={"WDC": 60.0}, ref=ref)
        ideas = [x for x in e["entradas"] if x["cat"] == "idea"]
        self.assertEqual([x["d"] for x in ideas], [dia(0), dia(20)])
        self.assertEqual(ideas[1]["pe"], 60.0)

    def test_a_los_30_dias_fija_retorno_indice_y_exceso_y_no_lo_cambia_despues(self):
        ref = {dia(-3): 100.0, dia(29): 103.0, dia(30): 104.0, dia(31): 90.0}
        self.pasada(0, ideas=["WDC"], precios={"WDC": 50.0}, ref=ref)
        e = self.pasada(29, self.salida, ideas=["WDC"], precios={"WDC": 55.0}, ref=ref)
        self.assertEqual(e["entradas"][0]["res"], {})        # aún no toca
        e = self.pasada(30, self.salida, ideas=["WDC"], precios={"WDC": 55.0}, ref=ref)
        r = e["entradas"][0]["res"]["30"]
        self.assertEqual((r["ret"], r["ref"], r["exceso"]), (10.0, 4.0, 6.0))
        e = self.pasada(31, self.salida, ideas=["WDC"], precios={"WDC": 10.0}, ref=ref)
        self.assertEqual(e["entradas"][0]["res"]["30"]["ret"], 10.0)  # queda fijo
        self.assertNotIn("90", e["entradas"][0]["res"])

    def test_resumen_por_lista_y_plazo(self):
        ref = {dia(-3): 100.0, dia(30): 100.0}
        self.pasada(0, ideas=["A", "B", "C"], evitar=["D"], precios={"A": 10.0, "B": 10.0, "C": 10.0, "D": 10.0}, ref=ref)
        e = self.pasada(30, self.salida, ideas=["A", "B", "C"], evitar=["D"], precios={"A": 12.0, "B": 9.0, "C": 11.0, "D": 8.0}, ref=ref)
        i = e["resumen"]["idea"]["plazos"]["30"]
        self.assertEqual(i["n"], 3)
        self.assertEqual(i["suben_pct"], 66.7)
        self.assertEqual(i["ganan_al_indice_pct"], 66.7)
        self.assertEqual(i["exceso_mediano"], 10.0)
        self.assertEqual(i["exceso_medio"], 6.67)
        ev = e["resumen"]["evitar"]["plazos"]["30"]
        self.assertEqual((ev["n"], ev["suben_pct"], ev["exceso_mediano"]), (1, 0.0, -20.0))
        self.assertEqual(e["resumen"]["radar"], {"entradas": 0, "plazos": {}})

    def test_sin_precio_hoy_no_da_alta_y_a_su_plazo_se_espera_antes_de_perderlo(self):
        ref = {dia(-3): 100.0, dia(30): 100.0, dia(45): 100.0}
        e = self.pasada(0, ideas=["X", "Y"], precios={"Y": 10.0}, ref=ref)
        self.assertEqual([x["s"] for x in e["entradas"]], ["Y"])        # X no tiene precio: no se apunta
        # Y desaparece de la tabla de precios justo a su plazo: se espera, y a los 10 días se da por perdida
        e = self.pasada(30, self.salida, ideas=["Y"], precios={"Z": 1.0}, ref=ref)
        self.assertEqual(e["entradas"][0]["res"], {})
        e = self.pasada(40, self.salida, ideas=["Y"], precios={"Z": 1.0}, ref={**ref, dia(40): 100.0})
        self.assertEqual(e["entradas"][0]["res"]["30"], {"f": dia(40), "sin_dato": True})
        self.assertEqual(e["resumen"]["idea"]["plazos"]["30"]["sin_dato"], 1)
        self.assertEqual(e["resumen"]["idea"]["plazos"]["30"]["n"], 0)

    def test_precio_de_radar_mas_y_en_dolares_sin_pe_no_se_inventa(self):
        d = self.d
        d.escribir("escaneo.json", {"decision": {"ideas": [{"s": "AAA"}, {"s": "BBB"}], "evitar": [], "radar": []}})
        d.escribir("radar.json", {"valores": [{"s": "AAA", "p": 7.0, "m": "USD"}]})                  # en dólares y sin pe: no vale
        d.escribir("radar-mas.json", {"valores": [{"s": "BBB", "pe": 8.0, "m": "USD"}, {"s": "AAA", "p": 7.0, "m": "EUR"}]})
        d.escribir("historico.json", {"instrumentos": {A.REFERENCIA: indice({dia(0): 100.0})}})
        e = A.main(d.dir, None, self.salida, hoy=dia(0))
        self.assertEqual(sorted((x["s"], x["pe"]) for x in e["entradas"]), [("AAA", 7.0), ("BBB", 8.0)])

    def test_faltan_datos_no_toca_nada_ni_falla(self):
        d = Datos()
        self.addCleanup(d.t.cleanup)
        previo = f"{d.dir}/previo.json"
        Path(previo).write_text(json.dumps({"v": 1, "entradas": [{"s": "A"}], "ultima": "2026-01-01"}), encoding="utf-8")
        self.assertIsNone(A.main(d.dir, previo, f"{d.dir}/nada.json", hoy=dia(0)))
        self.assertFalse(Path(f"{d.dir}/nada.json").exists())

    def test_precio_en_busca_el_ultimo_anterior_y_no_se_va_muy_lejos(self):
        s = [("2026-01-02", 1.0), ("2026-01-09", 2.0)]
        self.assertEqual(A.precio_en(s, "2026-01-09"), 2.0)
        self.assertEqual(A.precio_en(s, "2026-01-12"), 2.0)
        self.assertIsNone(A.precio_en(s, "2026-01-01"))
        self.assertIsNone(A.precio_en(s, "2026-03-01"))
        self.assertIsNone(A.precio_en([], "2026-01-01"))

    def test_el_archivo_lleva_la_nota_de_uso_interno_y_es_json_valido(self):
        self.pasada(0, ideas=["A"], precios={"A": 1.0}, ref={dia(-1): 100.0})
        j = json.loads(Path(self.salida).read_text(encoding="utf-8"))
        self.assertIn("Uso interno", j["nota"])
        self.assertEqual(j["v"], 1)
        self.assertEqual(j["ultima"], dia(0))


if __name__ == "__main__":
    unittest.main()
