/* =====================================================================
   Tu opinión: qué se ve mal, qué falla o qué idea tienes, y en qué parte. Sale como un mensaje de
   WhatsApp (o compartir / copiar) hacia quien te pasó la web: no hay servidor ni se guarda nada fuera.
   ===================================================================== */
const SITIOS_OP = [['general', 'La app en general'], ['cartera', 'Inicio'], ['plan', 'Inicio: plan y movimientos'], ['ruta', 'Paso a paso'], ['expertos', 'Expertos e ideas'], ['analisis', 'Análisis'], ['fiscal', 'Hacienda'], ['futuro', 'Tus objetivos'], ['mercados', 'Mercados y calendario'], ['asesor', 'GrowIA (Pregúntale)'], ['ficha', 'La ficha de una posición'], ['operacion', 'Apuntar compras o ventas'], ['android', 'App de Android y widget']];
const TIPOS_OP = [['mal', 'Algo se ve mal'], ['falla', 'Algo no funciona'], ['idea', 'Una idea'], ['otra', 'Otra cosa']];
/* Las opiniones y los fallos van a Firestore (colección «opiniones»), con la cuenta de quien las manda: así se sabe
   seguro que han llegado. Solo las lee el dueño, en Ajustes > Opiniones recibidas (ver leerOpiniones). Sin cuenta no
   se pueden mandar desde aquí: el formulario ofrece copiarlas o compartirlas por WhatsApp. */
async function mandarOpinion(o) {
  if (!PERFIL_CUENTA) throw new Error('sin cuenta');
  await fbCargar();
  if (!FB.user) throw new Error('sin sesión');
  await conTiempo(FB.fs.addDoc(FB.fs.collection(FB.db, 'opiniones'), { uid: FB.user.uid, correo: FB.user.email || null, tipo: o.tipo || null, sitio: o.sitio || null, texto: String(o.texto || '').slice(0, 4000), quien: o.quien || null, info: o.info || null, nota: o.nota ?? null, v: VERSION, cuando: FB.fs.serverTimestamp() }), 10000);
}
/* Las opiniones que llegan, para el dueño: las reglas de Firestore solo dejan leerlas a los correos de BANCO_EMAILS
   (la Action «Reglas de Firestore» los pone al publicarlas; no están en el repositorio). A los demás les dice que no
   y la fila de Ajustes no sale. */
const fechaOpi = (o) => (o.cuando && o.cuando.toDate ? o.cuando.toDate() : null);
async function leerOpiniones(n = 200) {
  if (!PERFIL_CUENTA || S.noDueno) return null;
  await fbCargar(); if (!FB.user) return null;
  const f = FB.fs;
  try {
    const r = await conTiempo(f.getDocs(f.query(f.collection(FB.db, 'opiniones'), f.orderBy('cuando', 'desc'), f.limit(n))), 10000);
    return r.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (/permission/i.test(String((e && e.code) || e))) S.noDueno = true;
    return null;
  }
}
