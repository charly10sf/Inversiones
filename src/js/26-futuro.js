/* =====================================================================
   Futuro: cuánto podrías tener si sigues aportando
   Se simulan 2.000 caminos de mercado mes a mes. Cada tipo de activo tiene una rentabilidad
   esperada y una volatilidad a largo plazo; con tu mezcla (y cómo cambia al ir aportando) sale la
   rentabilidad y el riesgo de la cartera cada mes. De los 2.000 resultados se sacan los escenarios:
   "si va mal" es el percentil 10 (1 de cada 10 caminos sale peor), "lo probable" la mediana y
   "si va bien" el percentil 90.
   ===================================================================== */
const SUPUESTOS = {
  rv: { n: 'Fondos de bolsa', mu: 7, sd: 16 },
  acc: { n: 'Acciones sueltas', mu: 7, sd: 25 },
  rf: { n: 'Renta fija', mu: 2.5, sd: 2.5 },
  oro: { n: 'Oro', mu: 4, sd: 15 },
  mp: { n: 'Plata y otras materias primas', mu: 3, sd: 25 },
  cripto: { n: 'Bitcoin', mu: 8, sd: 50 },
  ef: { n: 'Efectivo', mu: 1.5, sd: 0 },
};
// correlaciones a largo plazo entre tipos de activo (las que no están, 0)
const CORREL = { 'rv|acc': 0.75, 'rv|rf': 0.2, 'rv|oro': 0.1, 'rv|cripto': 0.35, 'acc|rf': 0.15, 'acc|oro': 0.1, 'acc|cripto': 0.3, 'rf|oro': 0.25, 'rf|cripto': 0.05, 'oro|cripto': 0.15, 'rv|mp': 0.3, 'acc|mp': 0.3, 'rf|mp': 0.05, 'oro|mp': 0.6, 'cripto|mp': 0.15 };
const corr = (a, b) => (a === b ? 1 : CORREL[a + '|' + b] ?? CORREL[b + '|' + a] ?? 0);
const INFLACION = 2;
const HORIZONTES = [5, 10, 15, 20, 25, 30];
const META_HITOS = [100000, 250000, 500000, 1000000];

function claseProy(inst) {
  if (!inst) return 'rv';
  if (inst.tipo === 'Acción') return 'acc';
  if (inst.clase === 'Renta fija' || inst.clase === 'Monetario') return 'rf';
  if (inst.clase === 'Oro') return 'oro';
  if (inst.clase === 'Materias primas') return 'mp';
  if (inst.clase === 'Cripto') return 'cripto';
  return 'rv';
}
function aportacionActual() { return sum(aportacionesActivas(), ({ a }) => +a.importe || 0); }
function cfgProy() {
  const c = S.proy || {};
  return { aport: c.aport != null ? c.aport : Math.round(aportacionActual()), subida: c.subida ?? 0, bolsa: c.bolsa ?? 7, real: c.real ?? false };
}

/* generador aleatorio con semilla: los escenarios no bailan cada vez que se pinta la página */
function azar(semilla) {
  let a = semilla >>> 0;
  const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let resto = null;
  return () => { // normal estándar (Box-Muller)
    if (resto != null) { const r = resto; resto = null; return r; }
    let x = 0, y = 0; while (x === 0) x = u(); y = u();
    const m = Math.sqrt(-2 * Math.log(x));
    resto = m * Math.sin(2 * Math.PI * y);
    return m * Math.cos(2 * Math.PI * y);
  };
}

/* el plan de verdad (lo que aportas hoy, la bolsa al 7 %, en euros de cada año): lo que usan Inicio, el Paso a paso,
   las metas y GrowIA. Los «¿y si…?» de Objetivos > Proyección (cfgProy) solo cambian esa pantalla */
const cfgPlan = () => ({ aport: Math.round(aportacionActual()), subida: 0, bolsa: 7, real: false });
function proyeccion(M, cfg = cfgPlan()) {
  const mezcla = {};
  for (const f of M.filas) { const k = claseProy(f.inst); mezcla[k] = (mezcla[k] || 0) + f.valor; }
  mezcla.ef = (mezcla.ef || 0) + (M.liquidez || 0);
  const clave = JSON.stringify([Object.keys(mezcla).sort().map((k) => [k, Math.round(mezcla[k] / 50)]), cfg, aportacionesActivas().map(({ a }) => [a.instrumento, a.importe])]);
  if (!(S.proyCache instanceof Map)) S.proyCache = new Map();
  if (S.proyCache.has(clave)) return S.proyCache.get(clave);
  const MESES_N = 30 * 12, N = 2000;
  const sup = JSON.parse(JSON.stringify(SUPUESTOS));
  sup.rv.mu = cfg.bolsa; sup.acc.mu = cfg.bolsa;
  const claves = Object.keys(sup);
  // dónde está el dinero hoy y adónde van las aportaciones
  const ahora = Object.fromEntries(claves.map((k) => [k, 0]));
  for (const f of M.filas) ahora[claseProy(f.inst)] += f.valor;
  ahora.ef += M.liquidez;
  const destino = Object.fromEntries(claves.map((k) => [k, 0]));
  const act = aportacionesActivas();
  const totAp = sum(act, ({ a }) => +a.importe || 0);
  if (totAp > 0) for (const { a } of act) destino[claseProy(S.inst[a.instrumento])] += (+a.importe || 0) / totAp; else destino.rv = 1;
  // camino esperado de la mezcla: con él se saca la rentabilidad y el riesgo de cada mes
  const v = { ...ahora };
  const mu = new Float64Array(MESES_N), sd = new Float64Array(MESES_N), aporte = new Float64Array(MESES_N);
  for (let t = 0; t < MESES_N; t++) {
    const A = cfg.aport * Math.pow(1 + cfg.subida / 100, Math.floor(t / 12));
    aporte[t] = A;
    const tot = sum(claves.map((k) => v[k])) || 1;
    const w = Object.fromEntries(claves.map((k) => [k, v[k] / tot]));
    let m = 0, var2 = 0;
    for (const i of claves) { m += w[i] * sup[i].mu / 100; for (const j of claves) var2 += w[i] * w[j] * corr(i, j) * (sup[i].sd / 100) * (sup[j].sd / 100); }
    mu[t] = m; sd[t] = Math.sqrt(Math.max(var2, 0));
    for (const k of claves) v[k] = v[k] * Math.pow(1 + sup[k].mu / 100, 1 / 12) + A * destino[k];
  }
  // 2.000 caminos
  const rnd = azar(20261017);
  const vals = Array.from({ length: MESES_N }, () => new Float64Array(N));
  for (let n = 0; n < N; n++) {
    let V = M.total;
    for (let t = 0; t < MESES_N; t++) {
      const deriva = (Math.log(1 + mu[t]) - (sd[t] * sd[t]) / 2) / 12, vol = sd[t] / Math.sqrt(12);
      V = V * Math.exp(deriva + vol * rnd()) + aporte[t];
      vals[t][n] = V;
    }
  }
  const pct = (arr, q) => arr[Math.min(arr.length - 1, Math.max(0, Math.round(q * (arr.length - 1))))];
  const out = { p10: [], p25: [], p50: [], p75: [], p90: [], aportado: [], fechas: [], mu: mu[0] * 100, sd: sd[0] * 100, mu10: mu[119] * 100, sd10: sd[119] * 100, ahora, destino, sup, cfg };
  let puesto = M.total;
  const hoy = new Date();
  out.fechas.push(iso(hoy)); out.aportado.push(M.total);
  for (const q of ['p10', 'p25', 'p50', 'p75', 'p90']) out[q].push(M.total);
  for (let t = 0; t < MESES_N; t++) {
    const orden = Float64Array.from(vals[t]).sort();
    const def = cfg.real ? Math.pow(1 + INFLACION / 100, (t + 1) / 12) : 1;
    puesto += aporte[t] / def;   // cada aportación, en euros de hoy si se mira así (deflactada en su mes)
    out.p10.push(pct(orden, 0.1) / def); out.p25.push(pct(orden, 0.25) / def); out.p50.push(pct(orden, 0.5) / def); out.p75.push(pct(orden, 0.75) / def); out.p90.push(pct(orden, 0.9) / def);
    out.aportado.push(puesto);
    out.fechas.push(iso(new Date(hoy.getFullYear(), hoy.getMonth() + t + 1, Math.min(hoy.getDate(), 28))));
  }
  S.proyCache.set(clave, out);
  if (S.proyCache.size > 4) S.proyCache.delete(S.proyCache.keys().next().value);
  return out;
}

const cuando = (meses) => { const a = Math.floor(meses / 12), m = meses % 12; return a ? `${a} ${a === 1 ? 'año' : 'años'}${m ? ` y ${m} ${m === 1 ? 'mes' : 'meses'}` : ''}` : `${m} ${m === 1 ? 'mes' : 'meses'}`; };
const anioDe = (iso8) => iso8.slice(0, 4);
function hito(pr, serie, meta) { const i = serie.findIndex((x) => x >= meta); return i < 0 ? null : i; }
function euCorto(n) {
  if (S.oculto) return '•••• €';
  if (n >= 999500) { const t = fmtNum(n / 1e6, n >= 1e7 ? 1 : 2).replace(/,0+$/, '').replace(/(,\d)0$/, '$1'); return t + (t === '1' ? ' millón €' : ' millones €'); }
  const paso = Math.abs(n) < 1000 ? 10 : Math.abs(n) < 10000 ? 100 : 1000;
  return fmtNum(Math.round(n / paso) * paso, 0) + ' €';
}

