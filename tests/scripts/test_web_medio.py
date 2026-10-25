"""0.7c: cada noticia guarda la web de su medio («w») para que la app enseñe su logo. Sin red.

Uso: python3 -m unittest discover -s tests/scripts
"""
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import precios as P  # noqa: E402


class WebMedio(unittest.TestCase):
    def item(self, source):
        return ET.fromstring(f"<item><title>Repsol sube - Expansión</title>{source}</item>")

    def test_de_google_noticias(self):
        self.assertEqual(P.web_medio(self.item('<source url="https://www.expansion.com">Expansión</source>')), "expansion.com")
        self.assertEqual(P.web_medio(self.item('<source url="https://cincodias.elpais.com/">Cinco Días</source>')), "cincodias.elpais.com")

    def test_sin_web(self):
        self.assertIsNone(P.web_medio(self.item("<source>Expansión</source>")))
        self.assertIsNone(P.web_medio(self.item("")))
        self.assertIsNone(P.web_medio(self.item('<source url="no es una web">X</source>')))


if __name__ == "__main__":
    unittest.main()
