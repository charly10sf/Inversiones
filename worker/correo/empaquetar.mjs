// Mete las imágenes de los correos (worker/correo/img) en src/correo-imagenes.js, en base64, para que el Worker las sirva
// en /correo/img/<nombre>. Se vuelve a correr al cambiar una imagen: node worker/correo/empaquetar.mjs
// (las imágenes salen de cabecera.html e iconos.html con Playwright, a 2x)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), 'img');
const tipos = { '.png': 'image/png', '.jpg': 'image/jpeg' };
const out = {};
for (const f of fs.readdirSync(dir).sort()) {
  const ext = path.extname(f); if (!tipos[ext]) continue;
  // la huella va en la dirección (?v=…): Gmail guarda las imágenes por dirección y, si no cambia, enseña la vieja
  const bytes = fs.readFileSync(path.join(dir, f));
  out[path.basename(f, ext)] = [tipos[ext], bytes.toString('base64'), createHash('sha256').update(bytes).digest('hex').slice(0, 10)];
}
const js = `// HECHO POR worker/correo/empaquetar.mjs: no tocar a mano. Las imágenes de los correos: nombre -> [tipo, base64, huella]\nexport const IMAGENES = ${JSON.stringify(out, null, 0).replace(/\],"/g, '],\n"')};\n`;
fs.writeFileSync(path.join(dir, '..', '..', 'src', 'correo-imagenes.js'), js);
console.log(Object.keys(out).join(' '), Math.round(js.length / 1024) + ' KB');
