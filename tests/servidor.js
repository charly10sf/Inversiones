// Servidor estático mínimo para las pruebas (sin dependencias). Uso: node tests/servidor.js [carpeta] [puerto]
// Sirve la carpeta (la raíz del repositorio o dist/) con gzip si el navegador lo pide, como GitHub Pages.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { extname, join, normalize, resolve } from 'node:path';

const raiz = resolve(process.argv[2] || '.');
const puerto = +(process.argv[3] || 8765);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const COMPRIME = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.webmanifest', '.txt']);

createServer(async (req, res) => {
  try {
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';
    const f = normalize(join(raiz, ruta));
    if (!f.startsWith(raiz)) { res.writeHead(403).end(); return; }
    const st = await stat(f).catch(() => null);
    if (!st || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
    let cuerpo = await readFile(f);
    const ext = extname(f), cab = { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Last-Modified': st.mtime.toUTCString() };
    if (COMPRIME.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { cuerpo = gzipSync(cuerpo, { level: 9 }); cab['Content-Encoding'] = 'gzip'; }
    cab['Content-Length'] = cuerpo.length;
    res.writeHead(200, cab).end(req.method === 'HEAD' ? undefined : cuerpo);
  } catch (e) { res.writeHead(500).end(String(e)); }
}).listen(puerto, () => console.log(`GrowFolio de pruebas en http://localhost:${puerto}/ (${raiz})`));
