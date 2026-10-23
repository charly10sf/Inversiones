/* =====================================================================
   El banco: el efectivo de cada plataforma con el saldo real de tu cuenta (open banking, solo lectura, con
   Enable Banking a través del Worker de GrowFolio, que es quien guarda la clave). Solo cuentas de dinero: acciones
   y fondos no entran en el open banking. La sesión y las cuentas van en tu cartera cifrada (S.cartera.bancos); el
   Worker no guarda nada. De momento solo para las cuentas de la lista del Worker (modo de pruebas de Enable Banking).
   ===================================================================== */
const WORKER = 'https://growfolio.growfolio-web-app.workers.dev';
// en pruebas (?dev) se puede apuntar a otro Worker
const urlWorker = () => (CFG.dev && LS.get('inv-worker-dev', '')) || WORKER;
const bancosDe = (pl) => ((S.cartera && S.cartera.bancos) || []).filter((b) => !pl || b.plataforma === pl);
const finCuenta = (b) => (b.fin ? `···${b.fin}` : '');
