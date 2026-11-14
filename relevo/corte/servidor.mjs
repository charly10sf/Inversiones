/* =====================================================================
   El corte del gasto del relevo (0.8.3d): un servicio de Cloud Run, privado, que recibe los avisos del presupuesto
   del proyecto del relevo (por Pub/Sub) y, si el gasto del mes llega al tope, QUITA LA FACTURACIÓN de ese proyecto.
   Sin facturación, Google para el relevo y ya no puede cobrar nada más. La app sigue: sin relevo, sale el aviso del
   bloqueo de siempre.

   Lo que hace con cada aviso: lee el gasto (costAmount) y el tope (TOPE, o el del presupuesto si no hay TOPE). Si el
   gasto llega al tope, pregunta a Cloud Billing si el proyecto tiene facturación y, si la tiene, la quita. Si no
   llega, no hace nada. No ve ni toca nada de la app: ni tokens, ni carteras, ni el Worker.

   Solo puede quitar la facturación de su proyecto: corre con la cuenta de servicio corte@…, que solo tiene «Gestor de
   facturación del proyecto» (roles/billing.projectManager) en el proyecto del relevo. Para volver a ponerla, a mano en
   la consola (Facturación → Mis proyectos) y volver a publicar el relevo (relevo/LEEME.md).

   Sin dependencias: Node 22. Google avisa con unas horas de retraso: el gasto se puede pasar un poco del tope.
   ===================================================================== */
import { createServer } from 'node:http';

const METADATA = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
const BILLING = 'https://cloudbilling.googleapis.com/v1';

// lo que llega de Pub/Sub (push): { message: { data: base64(JSON del presupuesto) } }
export function leerAviso(cuerpo) {
  try {
    const m = JSON.parse(cuerpo).message || {};
    const d = JSON.parse(Buffer.from(String(m.data || ''), 'base64').toString('utf8'));
    const gasto = Number(d.costAmount), tope = Number(d.budgetAmount);
    if (!Number.isFinite(gasto)) return null;
    return { gasto, tope: Number.isFinite(tope) ? tope : null, moneda: String(d.currencyCode || '') };
  } catch (e) { return null; }
}

export function crearCorte({
  proyecto = process.env.PROYECTO || '',
  tope = process.env.TOPE ? Number(process.env.TOPE) : null,
  metadata = METADATA,
  billing = BILLING,
  pedir = fetch,
  registrar = (linea) => console.log(linea),
} = {}) {
  const token = async () => {
    const r = await pedir(metadata, { headers: { 'Metadata-Flavor': 'Google' } });
    if (!r.ok) throw new Error(`metadata ${r.status}`);
    return (await r.json()).access_token;
  };
  // devuelve lo que ha hecho: 'nada' (no llega al tope), 'ya' (ya no tenía facturación) o 'cortado'
  async function decidir(aviso) {
    const limite = tope ?? aviso.tope;
    if (!(limite > 0) || aviso.gasto < limite) return 'nada';
    const t = await token();
    const cab = { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' };
    const info = await pedir(`${billing}/projects/${proyecto}/billingInfo`, { headers: cab });
    if (!info.ok) throw new Error(`billingInfo ${info.status}`);
    if (!(await info.json()).billingEnabled) return 'ya';
    const r = await pedir(`${billing}/projects/${proyecto}/billingInfo`, { method: 'PUT', headers: cab, body: JSON.stringify({ billingAccountName: '' }) });
    if (!r.ok) throw new Error(`quitar ${r.status}`);
    return 'cortado';
  }

  return createServer(async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(404); return res.end(); }
    const trozos = [];
    let n = 0;
    for await (const t of req) { n += t.length; if (n > 64 * 1024) { res.writeHead(413); return res.end(); } trozos.push(t); }
    const aviso = leerAviso(Buffer.concat(trozos).toString('utf8'));
    // un aviso que no se entiende: 204 para que Pub/Sub no lo repita sin fin
    if (!aviso) { registrar('aviso ilegible'); res.writeHead(204); return res.end(); }
    try {
      const hecho = await decidir(aviso);
      registrar(`gasto ${aviso.gasto} ${aviso.moneda} de ${tope ?? aviso.tope}: ${hecho}`);
      res.writeHead(204); res.end();
    } catch (e) {
      // no se pudo quitar: 500, y Pub/Sub lo vuelve a mandar
      registrar(`no se pudo cortar: ${String((e && e.message) || e).slice(0, 120)}`);
      res.writeHead(500); res.end();
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.PROYECTO) { console.error('falta PROYECTO'); process.exit(1); }
  const s = crearCorte();
  s.listen(Number(process.env.PORT || 8080), () => console.log(`corte del gasto de ${process.env.PROYECTO}`));
  process.on('SIGTERM', () => s.close(() => process.exit(0)));
}
