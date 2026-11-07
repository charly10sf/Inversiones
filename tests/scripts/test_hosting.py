"""0.8.3 · toison.es en Firebase Hosting: hosting/firebase.json y la Action «Hosting» (.github/workflows/hosting.yml).

Lo que no puede romperse al mudarse: /app sin barra va a /app/ (y /app/ no vuelve a saltar: se probó con el emulador que
un «source» de glob con /app hacía un bucle), lo que dice qué versión hay se pide siempre fresco, lo que lleva huella se
guarda un año, la dirección vieja puede leer version.json (así sabe que la nueva existe) y no se publica nada en toison.es
sin la variable HOSTING_EN_VIVO = si.
"""
import json
import re
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


class Hosting(unittest.TestCase):
    def setUp(self):
        self.h = json.loads((RAIZ / 'hosting' / 'firebase.json').read_text(encoding='utf-8'))['hosting']
        self.wf = (RAIZ / '.github' / 'workflows' / 'hosting.yml').read_text(encoding='utf-8')

    def cabeceras(self, ruta):
        """las cabeceras que tocan a una ruta (globs de Firebase, lo justo para estas)"""
        def casa(glob):
            rx = re.escape(glob).replace(r'\*\*', '.*').replace(r'\*', '[^/]*')
            rx = re.sub(r'@\\\(([^)]*)\\\)', lambda m: '(' + m.group(1).replace(r'\|', '|') + ')', rx)
            return re.fullmatch(rx, ruta) is not None
        out = {}
        for h in self.h['headers']:
            if casa(h['source']):
                for kv in h['headers']:
                    out.setdefault(kv['key'], []).append(kv['value'])
        return out

    def test_app_sin_barra(self):
        r = self.h['redirects']
        self.assertEqual(len(r), 1)
        self.assertEqual(r[0]['destination'], '/app/')
        self.assertTrue(re.fullmatch(r[0]['regex'], '/app'))
        self.assertIsNone(re.fullmatch(r[0]['regex'], '/app/'))
        self.assertNotIn('trailingSlash', self.h)
        self.assertEqual(self.h['public'], 'sitio')

    def test_cache(self):
        for ruta in ('/app/', '/app/sw.js', '/app/version.json', '/app/manifest.webmanifest', '/index.html', '/'):
            self.assertEqual(self.cabeceras(ruta).get('Cache-Control'), ['no-cache'], ruta)
        self.assertEqual(self.cabeceras('/app/assets/app-0123456789.js').get('Cache-Control'), ['public, max-age=31536000, immutable'])
        self.assertEqual(self.cabeceras('/app/en/novedades-abc.json').get('Cache-Control'), ['public, max-age=31536000, immutable'])

    def test_la_vieja_puede_leer_version(self):
        self.assertEqual(self.cabeceras('/app/version.json').get('Access-Control-Allow-Origin'), ['https://charly10sf.github.io'])
        self.assertIsNone(self.cabeceras('/app/index.html').get('Access-Control-Allow-Origin'))

    def test_no_publica_en_vivo_sin_permiso(self):
        self.assertIn('HOSTING_EN_VIVO', self.wf)
        self.assertRegex(self.wf, r'live\) if \[ "\$EN_VIVO" != "si" \]')
        self.assertIn('FIREBASE_HOSTING', self.wf)
        self.assertIn('--config hosting/firebase.json', self.wf)
        # la web va sin su CNAME ni su app/ de redirección (en Firebase, /app es la app de verdad)
        self.assertIn('--exclude=CNAME', self.wf)
        self.assertIn('--exclude=app', self.wf)


if __name__ == '__main__':
    unittest.main()
