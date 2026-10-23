/* =====================================================================
   Arranque
   Nada de botón de actualizar: los precios llegan solos por los sockets, precios.json se vuelve a
   leer cada 2 minutos en segundo plano y el histórico cuando cambia el día.
   ===================================================================== */
let tickPrecios, tickEstado;
async function recargarPrecios() {
  const antes = S.precios && S.precios.generado;
  try { await cargarPrecios(); } catch (e) { return; }
  if (!S.cartera) return;
  if (S.precios.generado !== antes) {
    await Promise.all([cargarHistorico(), cargarIntradia(), cargarIA(), cargarRadar(), cargarInforme()]);
    pintar(); LIVE.resuscribir(); escaneoLuego(1500);
  } else programarParche();
  revisarAnalisisIA();
  revisarWeb();
}
function arrancar() {
  if (!S.pendRevisado && LS.get('inv-pend-enc')) { S.pendRevisado = true; aplicarPendiente().finally(arrancar); return; }
  sumarInstPropios();
  setTimeout(() => cargarHistCatalogo().then((n) => { if (n) pintar(); }), 50);
  S.vista = vistaDeHash() || LS.get('inv-vista', 'cartera');
  if (S.vista === 'plan') { S.vista = 'cartera'; S.carTab = 'plan'; }
  if (!esVista(S.vista)) S.vista = 'cartera';
  montar();
  pintar();
  LIVE.iniciar();
  cargarIA().then(() => { if (S.vista === 'analisis') pintar(); refrescarToca(); });
  // el análisis y la clave llegan un poco después de pintar: hasta entonces, la tarjeta de GrowIA de Cartera
  // dice «cargando» (antes decía «aún sin activar» aunque la tuvieras activada) y luego se rehace sola
  Promise.all([cargarAsesor(), cargarAnalisisPropio(S.iaRemoto)]).then(() => { S.iaListo = true; if (['analisis', 'expertos'].includes(S.vista)) pintar(); refrescarToca(); setTimeout(revisarAnalisisIA, 4000); setTimeout(() => mostrarPreguntaIA(), 3000); });
  // 0.6: pedirNota va en el trozo de opiniones; solo se baja si toca pedirla
  apuntarDiaUso(); setTimeout(() => { if (tocaNota()) pedirNota(); }, 150000); setTimeout(() => pedirAvisoVersiones(), 12000);
  if (PERFIL_CUENTA) setTimeout(() => revisarRespuestas(), 5000);
  if (PERFIL_CUENTA) comprobarAcceso();
  setTimeout(() => globoNuevo(), 3500);
  setTimeout(() => revisarKit(), 2500);
  // lo que tienes metido a mano y GrowFolio aún no sigue: se pide su precio (cuando ya están el radar y el catálogo)
  { let n = 0; const mira = () => { if ((!S.radar || !S.cat) && n++ < 10) { setTimeout(mira, 5000); return; } revisarPedidos(); refrescarCatLocal().catch(() => {}); }; setTimeout(mira, 6000); }
  clearInterval(tickPrecios); clearInterval(tickEstado);
  // con los avisos del navegador activados, los precios siguen llegando aunque GrowFolio esté en segundo plano
  tickPrecios = setInterval(() => { if (!document.hidden || (avisosCfg().on && !appAvisos())) recargarPrecios(); }, 120000);
  clearInterval(S.tickAvisos);
  S.tickAvisos = setInterval(() => { if (S.cartera && document.hidden && avisosCfg().on && !appAvisos()) { try { S.M = calcular(); revisarAvisos(S.M); } catch (e) { console.warn(e); } } }, 120000);
  tickEstado = setInterval(programarParche, 30000);
  setTimeout(bienvenida, 700);
  // el banco: la vuelta de dar permiso y el saldo del efectivo (al abrir y cada pocas horas)
  // 0.6: lo del banco va en su trozo; solo se baja al volver de dar permiso al banco o si tienes alguno conectado
  const q = new URLSearchParams(location.search);
  if (q.has('state') && (q.has('code') || q.has('error'))) setTimeout(() => vueltaDelBanco().catch((e) => console.warn('banco', e)), 1500);
  setTimeout(() => { if (bancosDe().length) { sincronizarBancos(false); avisoCaducaBanco(); } }, 9000);
  clearInterval(S.tickBanco); S.tickBanco = setInterval(() => { if (!document.hidden && bancosDe().length) sincronizarBancos(false); }, 30 * 60e3);
  // con cuenta: el nombre va también dentro de tu perfil cifrado y los cambios de otros dispositivos llegan solos
  if (PERFIL_CUENTA) {
    nombreEnCuenta();
    vigilarCuenta();
    if (S.avisoConflicto) { S.avisoConflicto = false; setTimeout(() => toast('Tu cuenta tenía cambios más recientes de otro dispositivo: se ha quedado esa versión', 6000), 1200); }
    setTimeout(avisoIOS, 6000);
    if (!S.cuentaLeida || LS.get('inv-pend-cuenta')) setTimeout(sincronizarCuenta, 3000);
  }
  revisarWeb();
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && window.InversionesApp && Date.now() - appRevisadaT > (S.cartera ? 3600000 : 120000)) revisarApp();
  if (document.hidden || !S.cartera) return;
  LIVE.asegurar();
  if (Date.now() - S.ultimaCarga > 60000) recargarPrecios(); else { programarParche(); revisarAnalisisIA(); }
});
window.addEventListener('online', () => { S.fallosSubir = 0; if (S.cartera) { LIVE.asegurar(); recargarPrecios(); } if (PERFIL_CUENTA && (S.cartera || LS.get('inv-pend-cuenta'))) sincronizarCuenta(); });

