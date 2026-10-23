/* Las opiniones que llegan, para el dueño: las reglas de Firestore solo dejan leerlas a los correos de BANCO_EMAILS
   (la Action «Reglas de Firestore» los pone al publicarlas; no están en el repositorio). A los demás les dice que no
   y la fila de Ajustes no sale. */
const fechaOpi = (o) => (o.cuando && o.cuando.toDate ? o.cuando.toDate() : null);
const opiOcupado = () => document.hidden || !!document.querySelector('.hoja-fondo, .tour, .estreno, .intro, .ficha-fondo') || !!S.ficha;
/* ¿Qué te parece GrowFolio? Cuando alguien la ha usado 5 días distintos (no hace falta seguidos), un rato después de
   abrirla le sale una vez: de 1 a 5 estrellas y, si quiere, un comentario (con 3 o menos, qué mejoraría). Llega como
   las opiniones, con la nota. Si la cierra sin contestar, vuelve al mes, y como mucho dos veces. */
function apuntarDiaUso() {
  const d = LS.get('inv-dias-uso', []), h = hoyIso();
  if (!d.includes(h)) LS.set('inv-dias-uso', [...d, h].slice(-60));
}
function tocaNota() {
  if (!S.cartera || LS.get('inv-nota', null) || !PERFIL_CUENTA) return false;
  if (LS.get('inv-dias-uso', []).length < 5) return false;
  const l = LS.get('inv-nota-luego', null);
  return !l || (l.n < 2 && Date.now() - l.t > 30 * 864e5);
}
