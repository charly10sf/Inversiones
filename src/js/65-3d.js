/* =====================================================================
   0.9 · El 3D y su movimiento (elegido por Carlos el 15 nov). El 3D de verdad va en el trozo «3d» (trozos/3d.js: la moneda
   de Hoy, el anillo del reparto y la gráfica que se transforma); aquí, solo cuándo se baja y la rueda de la cifra.
   - Se baja DESPUÉS de pintar Hoy, con el móvil libre (o ya, si lo pide el anillo al verse): no cuenta en lo que carga al
     abrir. Con el ahorro de datos del móvil, o con inv-sin-3d, no se baja. Mientras llega, o si falla, se queda lo plano.
   - En las pruebas automáticas no se baja, salvo que la prueba lo pida con inv-3d-prueba.
   ===================================================================== */
const tresDSi = () => {
  try { const c = navigator.connection; if (c && c.saveData) return false; } catch (e) { /* sin ese dato, como si no */ }
  return (!navigator.webdriver || !!LS.get('inv-3d-prueba', false)) && !LS.get('inv-sin-3d', false);
};
let tresDPedido = 0, tresDLuego = 0;   // 0, sin pedir; 1, apuntado para luego; 2, bajando
function pedir3D(ya) {
  if (window.T3D || tresDPedido === 2 || (tresDPedido === 1 && !ya) || !tresDSi()) return;
  const baja = () => { if (tresDPedido === 2 || window.T3D) return; tresDPedido = 2; cargarTrozo('3d').catch(() => { tresDPedido = 0; }); };   // si no baja, se queda lo plano y no se dice nada
  if (ya) { clearTimeout(tresDLuego); baja(); return; }
  tresDPedido = 1;
  tresDLuego = setTimeout(() => (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(baja, { timeout: 3000 }), 2600);
}
/* después de cada pintado: lo pide (una vez) y, si ya está, recoloca la moneda y el anillo */
function poner3D() { if (window.T3D) window.T3D.poner(); else pedir3D(); }

/* la rueda de dígitos de la cifra del patrimonio: cada dígito rueda hasta su sitio y, con un precio nuevo, solo los que
   cambian. El texto de verdad sigue dentro (para leerlo, copiarlo y para las pruebas); la tira del 0 al 9 es de CSS
   (39-movimiento.css). Si la cifra cambia de forma (un dígito más), se pone sin rodar. */
function ruedaCifra(el, txt, desdeCero) {
  const ds = [...txt], esD = (c) => c >= '0' && c <= '9';
  let cols = el.children.length === ds.length && [...el.children].every((c, i) => c.className === (esD(ds[i]) ? 'rd' : 'rp')) ? [...el.children] : null;
  if (!cols) {
    el.innerHTML = ds.map((c) => (esD(c) ? `<span class="rd" style="--d:${desdeCero ? 0 : c}">${c}</span>` : `<span class="rp">${esc(c)}</span>`)).join('');
    if (!desdeCero) return;
    cols = [...el.children]; void el.offsetWidth;
  }
  cols.forEach((c, i) => { if (!esD(ds[i])) { if (c.textContent !== ds[i]) c.textContent = ds[i]; return; } if (c.textContent !== ds[i]) c.textContent = ds[i]; c.style.setProperty('--i', i); c.style.setProperty('--d', ds[i]); });
}
