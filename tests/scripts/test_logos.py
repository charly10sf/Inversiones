"""0.8.3: logos desde el servidor (scripts/logos.py). Sin salir a internet: la «web» de cada empresa es un diccionario
de direcciones con su contenido.

Uso: python3 -m unittest discover -s tests/scripts
"""
import datetime as dt
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts"))
import logos as L  # noqa: E402


def png(lado, color=(200, 30, 30, 255), ancho=None):
    im = Image.new("RGBA", (ancho or lado, lado), color)
    # algo de dibujo para que no sea un color liso
    for i in range(min(lado, ancho or lado)):
        im.putpixel((i, i), (255, 255, 255, 255))
    b = io.BytesIO()
    im.save(b, "PNG")
    return b.getvalue()


def ico(lado):
    im = Image.new("RGBA", (lado, lado), (10, 120, 200, 255))
    b = io.BytesIO()
    im.save(b, "ICO", sizes=[(lado, lado)])
    return b.getvalue()


def web(paginas):
    """abrir_url de mentira: paginas = {url: (bytes, content-type)}."""
    visto = []

    def abrir(url, timeout=10):
        visto.append(url)
        if url in paginas:
            d, ct = paginas[url]
            return d, ct, url
        return None
    abrir.visto = visto
    return abrir


def pagina(links):
    return (f"<html><head>{links}</head><body>hola</body></html>".encode(), "text/html; charset=utf-8")


class Candidatas(unittest.TestCase):
    def test_apple_touch_icon_gana_al_favicon(self):
        c, _ = L.candidatas('<link rel="icon" href="/f.png" sizes="32x32"><link rel="apple-touch-icon" href="/a.png" sizes="180x180">', "https://x.com/")
        self.assertEqual(c[0][1], "https://x.com/a.png")
        self.assertIn("https://x.com/favicon.ico", [u for _, u in c])        # las de siempre, al final

    def test_la_de_mayor_tamano_primero_y_rutas_relativas(self):
        c, _ = L.candidatas('<link rel="shortcut icon" href="img/p.png" sizes="16x16"><link rel="icon" href="img/g.png" sizes="192x192">', "https://x.com/es/")
        self.assertEqual(c[0][1], "https://x.com/es/img/g.png")

    def test_los_svg_no_se_leen(self):
        c, _ = L.candidatas('<link rel="icon" href="/l.svg" type="image/svg+xml" sizes="any"><link rel="apple-touch-icon" href="/a.svg">', "https://x.com/")
        self.assertNotIn("https://x.com/l.svg", [u for _, u in c])
        self.assertNotIn("https://x.com/a.svg", [u for _, u in c])

    def test_manifiesto(self):
        _, m = L.candidatas('<link rel="manifest" href="/site.webmanifest">', "https://x.com/")
        self.assertEqual(m, ["https://x.com/site.webmanifest"])
        i = L.del_manifiesto('{"icons":[{"src":"/i/192.png","sizes":"192x192"},{"src":"/i/512.png","sizes":"512x512"},{"src":"/i/v.svg","type":"image/svg+xml"}]}', "https://x.com/site.webmanifest")
        self.assertEqual(sorted(i), [(192, "https://x.com/i/192.png"), (512, "https://x.com/i/512.png")])
        self.assertEqual(L.del_manifiesto("no es json", "https://x.com/"), [])


class Imagenes(unittest.TestCase):
    def test_pequena_no_vale(self):
        self.assertIsNone(L.imagen_valida(png(32)))
        self.assertIsNone(L.imagen_valida(ico(16)))

    def test_no_cuadrada_no_vale(self):
        self.assertIsNone(L.imagen_valida(png(80, ancho=300)))

    def test_lisa_o_transparente_no_vale(self):
        liso = io.BytesIO()
        Image.new("RGBA", (128, 128), (5, 5, 5, 255)).save(liso, "PNG")
        self.assertIsNone(L.imagen_valida(liso.getvalue()))
        tr = io.BytesIO()
        Image.new("RGBA", (128, 128), (0, 0, 0, 0)).save(tr, "PNG")
        self.assertIsNone(L.imagen_valida(tr.getvalue()))
        self.assertIsNone(L.imagen_valida(b"<html>no soy una imagen</html>"))

    def test_buena_se_deja_en_128_sin_agrandar(self):
        im = L.imagen_valida(png(512))
        self.assertIsNotNone(im)
        w = Image.open(io.BytesIO(L.a_webp(im)))
        self.assertEqual(w.format, "WEBP")
        self.assertEqual(w.size, (128, 128))
        w2 = Image.open(io.BytesIO(L.a_webp(L.imagen_valida(png(90)))))
        self.assertEqual(w2.size, (90, 90))                     # no se agranda


class Buscar(unittest.TestCase):
    def test_apple_touch_icon_de_la_pagina(self):
        w = web({"https://acme.com/": pagina('<link rel="apple-touch-icon" href="/touch.png" sizes="180x180"><link rel="icon" href="/f.ico">'),
                 "https://acme.com/touch.png": (png(180), "image/png"), "https://acme.com/f.ico": (ico(32), "image/x-icon")})
        r = L.buscar_logo("acme.com", w)
        self.assertIsNotNone(r)
        self.assertEqual(r[1], "https://acme.com/touch.png")

    def test_con_www_si_el_dominio_pelado_no_contesta(self):
        w = web({"https://www.acme.com/": pagina('<link rel="apple-touch-icon" href="/t.png">'), "https://www.acme.com/t.png": (png(180), "image/png")})
        self.assertEqual(L.buscar_logo("acme.com", w)[1], "https://www.acme.com/t.png")

    def test_si_la_mejor_no_vale_prueba_la_siguiente(self):
        w = web({"https://acme.com/": pagina('<link rel="apple-touch-icon" href="/rota.png" sizes="180x180"><link rel="icon" href="/ok.png" sizes="96x96">'),
                 "https://acme.com/ok.png": (png(96), "image/png")})
        self.assertEqual(L.buscar_logo("acme.com", w)[1], "https://acme.com/ok.png")

    def test_manifiesto_cuando_la_pagina_solo_tiene_favicon_pequeno(self):
        w = web({"https://acme.com/": pagina('<link rel="icon" href="/f.ico" sizes="16x16"><link rel="manifest" href="/m.json">'),
                 "https://acme.com/f.ico": (ico(16), "image/x-icon"),
                 "https://acme.com/m.json": (b'{"icons":[{"src":"/i512.png","sizes":"512x512"}]}', "application/json"),
                 "https://acme.com/i512.png": (png(512), "image/png")})
        self.assertEqual(L.buscar_logo("acme.com", w)[1], "https://acme.com/i512.png")

    def test_direcciones_de_siempre_si_la_pagina_no_dice_nada(self):
        w = web({"https://acme.com/": pagina(""), "https://acme.com/apple-touch-icon.png": (png(180), "image/png")})
        self.assertEqual(L.buscar_logo("acme.com", w)[1], "https://acme.com/apple-touch-icon.png")

    def test_sin_web_se_prueban_igual_las_de_siempre(self):
        w = web({"https://acme.com/apple-touch-icon.png": (png(180), "image/png")})
        self.assertEqual(L.buscar_logo("acme.com", w)[1], "https://acme.com/apple-touch-icon.png")

    def test_nada_que_valga(self):
        w = web({"https://acme.com/": pagina('<link rel="icon" href="/f.ico" sizes="16x16">'), "https://acme.com/f.ico": (ico(16), "image/x-icon")})
        self.assertIsNone(L.buscar_logo("acme.com", w))

    def test_a_mano_va_primero(self):
        w = web({"https://acme.com/": pagina('<link rel="apple-touch-icon" href="/t.png">'), "https://acme.com/t.png": (png(180), "image/png"),
                 "https://cdn.otro.com/logo.png": (png(256), "image/png")})
        self.assertEqual(L.buscar_logo("acme.com", w, {"acme.com": "https://cdn.otro.com/logo.png"})[1], "https://cdn.otro.com/logo.png")

    def test_limites_de_intentos(self):
        links = "".join(f'<link rel="icon" href="/{i}.png" sizes="{100 + i}x{100 + i}">' for i in range(30))
        w = web({"https://acme.com/": pagina(links)})
        self.assertIsNone(L.buscar_logo("acme.com", w, max_intentos=5))
        self.assertLessEqual(len([u for u in w.visto if u.endswith(".png")]), 5)


class Direcciones(unittest.TestCase):
    def test_limpiar(self):
        self.assertEqual(L.limpiar("https://www.Grupoacs.com/es?x=1"), "grupoacs.com")
        self.assertEqual(L.limpiar("abc.xyz"), "abc.xyz")
        for malo in (None, "", "sin punto", "a..com", "ex ample.com", "localhost"):
            self.assertIsNone(L.limpiar(malo), malo)

    def test_no_entra_en_redes_internas(self):
        for host in ("127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.169.254", "localhost"):
            self.assertFalse(L.es_publica(host), host)
        self.assertIsNone(L.abrir("http://127.0.0.1:8000/"))
        self.assertIsNone(L.abrir("file:///etc/passwd"))


class Pasada(unittest.TestCase):
    def preparar(self, tmp):
        tmp = Path(tmp)
        (tmp / "anterior").mkdir()
        (tmp / "anterior" / "radar.json").write_text(json.dumps({"valores": [{"s": "A", "w": "acme.com"}, {"s": "B", "w": "https://www.beta.es/"}, {"s": "C"}]}))
        (tmp / "anterior" / "radar-mas.json").write_text(json.dumps({"valores": [{"s": "D", "w": "delta.com"}]}))
        (tmp / "anterior" / "catalogo-mas.json").write_text(json.dumps({"cols": ["isin", "dom"], "v": [["X1", "gestora.com"], ["X2", None]]}))
        (tmp / "instrumentos.json").write_text(json.dumps({"instrumentos": [{"id": "i", "dominio": "ishares.com"}, {"id": "j"}]}))
        return tmp

    def test_dominios_de_todas_las_fuentes(self):
        with tempfile.TemporaryDirectory() as t:
            t = self.preparar(t)
            self.assertEqual(L.dominios(t / "instrumentos.json", t / "anterior"), {"acme.com", "beta.es", "delta.com", "gestora.com", "ishares.com"})

    def test_pasada_completa_y_siguiente_sin_repetir(self):
        paginas = {"https://acme.com/apple-touch-icon.png": (png(180), "image/png"), "https://beta.es/apple-touch-icon.png": (png(200), "image/png")}
        with tempfile.TemporaryDirectory() as t:
            t = self.preparar(t)
            hoy = dt.datetime(2026, 11, 7, tzinfo=dt.timezone.utc)
            w = web(paginas)
            r = L.principal(t / "instrumentos.json", t / "anterior", t / "salida", minutos=5, hilos=2, abrir_url=w, ahora=hoy)
            self.assertEqual((r["publicados"], r["fallidos"], r["dominios"]), (2, 3, 5))
            ind = json.loads((t / "salida" / "logos.json").read_text())
            self.assertEqual((ind["v"], ind["d"]), (1, ["acme.com", "beta.es"]))
            self.assertTrue((t / "salida" / "logos" / "acme.com.webp").exists())
            est = json.loads((t / "salida" / "logos-estado.json").read_text())
            self.assertEqual(sorted(est["sin"]), ["delta.com", "gestora.com", "ishares.com"])
            # el día siguiente: lo de la rama de logos pasa a «anterior»; no se vuelve a mirar nada
            ant2 = t / "anterior2"
            ant2.mkdir()
            for f in ("logos.json", "logos-estado.json"):
                (ant2 / f).write_text((t / "salida" / f).read_text())
            (ant2 / "logos").mkdir()
            for f in (t / "salida" / "logos").glob("*.webp"):
                (ant2 / "logos" / f.name).write_bytes(f.read_bytes())
            for f in ("radar.json", "radar-mas.json", "catalogo-mas.json"):
                (ant2 / f).write_text((t / "anterior" / f).read_text())
            w2 = web(paginas)
            r2 = L.principal(t / "instrumentos.json", ant2, t / "salida2", minutos=5, hilos=2, abrir_url=w2, ahora=hoy + dt.timedelta(days=1))
            self.assertEqual(w2.visto, [])
            self.assertEqual(r2["publicados"], 2)
            self.assertTrue((t / "salida2" / "logos" / "beta.es.webp").exists())          # lo ya hecho se conserva
            # a los 15 días se reintentan los que no tenían (y siguen sin tenerlo); los logos, no (90 días)
            w3 = web(paginas)
            L.principal(t / "instrumentos.json", ant2, t / "salida3", minutos=5, hilos=2, abrir_url=w3, ahora=hoy + dt.timedelta(days=15))
            self.assertTrue(any("delta.com" in u for u in w3.visto))
            self.assertFalse(any("acme.com" in u for u in w3.visto))

    def test_un_logo_viejo_que_ya_no_se_encuentra_se_conserva(self):
        with tempfile.TemporaryDirectory() as t:
            t = self.preparar(t)
            ant = t / "anterior"
            (ant / "logos").mkdir()
            (ant / "logos" / "acme.com.webp").write_bytes(L.a_webp(L.imagen_valida(png(180))))
            (ant / "logos-estado.json").write_text(json.dumps({"ok": {"acme.com": "2026-01-01"}, "sin": {}}))
            hoy = dt.datetime(2026, 11, 7, tzinfo=dt.timezone.utc)
            r = L.principal(t / "instrumentos.json", ant, t / "salida", minutos=5, hilos=2, abrir_url=web({}), ahora=hoy)
            self.assertIn("acme.com", json.loads((t / "salida" / "logos.json").read_text())["d"])
            self.assertEqual(r["publicados"], 1)

    def test_el_tiempo_se_acaba(self):
        with tempfile.TemporaryDirectory() as t:
            t = self.preparar(t)
            r = L.principal(t / "instrumentos.json", t / "anterior", t / "salida", minutos=0, hilos=2, abrir_url=web({}))
            self.assertEqual(r["tarde"], 5)
            self.assertEqual(r["nuevos"], 0)


if __name__ == "__main__":
    unittest.main()
