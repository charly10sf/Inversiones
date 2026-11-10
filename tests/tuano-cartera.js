// 0.8.6 · La cartera de prueba de Tu año (la de la maqueta): MSCI World desde marzo de 2023 con 300 € al mes,
// Emergentes, oro, Repsol y bitcoin, cada una con su compra y su fecha (lotes de verdad, sin compras supuestas).
// Lo usan tests/tu-ano-086.spec.js y las capturas.
export async function meterCarteraTuAno(page) {
  await page.evaluate(async () => {
    const pos = [];
    // cada posición con un lote de verdad: fecha, unidades y lo que costó (al precio de ese día, del histórico)
    const add = (i, pl, f, eur) => {
      if (!S.inst[i]) return;
      const h = histDe(i), p = (h && precioEn(h, f, 'antes')) || precioInst(i), u = Math.round((eur / p) * 1e6) / 1e6;
      pos.push({ id: 'p' + (pos.length + 1), instrumento: i, plataforma: pl, cantidad: u, coste: eur, fecha: f, desde: f, lotes: [{ f, u, c: eur }] });
    };
    add('fidelity-world', 'MyInvestor', '2023-03-01', 6700);
    add('vanguard-em', 'MyInvestor', '2023-09-04', 2600);
    add('phau', 'Trade Republic', '2024-02-05', 2100);
    add('repsol', 'Trade Republic', '2024-05-13', 3300);
    add('btc', 'Bitvavo', '2024-01-22', 1400);
    S.cartera.posiciones.push(...pos);
    S.cartera.efectivo = [{ plataforma: 'Trade Republic', importe: 240 }];
    S.cartera.aportaciones = [{ id: 'a1', instrumento: 'fidelity-world', plataforma: 'MyInvestor', importe: 300, dia: 1, desde: '2023-04-01' }];
    await guardarCartera('prueba'); pintar();
  });
}
