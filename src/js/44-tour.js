/* =====================================================================
   Tour: la primera vez (y desde Ajustes) enseña cada pestaña, resaltando dónde está.
   ===================================================================== */
/* 0.8 (paso 5p): el tutorial por capítulos, uno por cada botón de la barra y la IA (TOUR_CAP), con su número romano. Casi
   todo se toca: «prueba» es lo que se pide y «hecho» lo que cuenta como hecho (un selector que se toca, o «mueve» para
   deslizar el dedo por algo); «toca» es un botón de la barra que, al tocarlo, lleva al paso siguiente él solo. «si»
   quita el paso cuando no hay con qué enseñarlo (sin posiciones no hay gráfica ni fichas). El motor está en
   46-lo-nuevo.js. La maqueta aprobada (3 nov) es https://claude.ai/artifact/THN75znmPR44S1A94LYbev */
const TOUR_CAP = ['Hoy', 'Análisis', 'Mercados', 'Ideas', 'Tú', 'La IA'];
const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const conPosiciones = () => ((S.cartera && S.cartera.posiciones) || []).length > 0;
const navSel = (k) => `.navbar [data-ir="${k}"], .nav [data-ir="${k}"], .riel [data-ir="${k}"]`;
const otroRango = () => (S.rango === '1A' ? '1M' : '1A');
const TOUR = [
  { c: 0, v: 'cartera', sel: '.navbar, .nav, .riel-nav', logo: true, ola: true, indice: true, t: 'Te enseño Toisón', x: 'Seis capítulos cortos, uno por cada botón y la IA. Puedes saltarlo y repetirlo cuando quieras desde Tú.' },
  { c: 0, v: 'cartera', sel: '#grafEvo', si: conPosiciones, t: 'Tu patrimonio, día a día', x: 'Todo sumado, con lo de hoy y lo ganado desde que compraste.', prueba: () => (matchMedia('(hover: hover)').matches ? 'Pasa el ratón por la gráfica' : 'Desliza el dedo por la gráfica'), hecho: { mueve: '#grafEvo' } },
  { c: 0, v: 'cartera', sel: '.hero-rangos', si: conPosiciones, t: 'Cualquier periodo', x: 'Un día, una semana, un año o desde tu primera compra.', prueba: () => `Toca ${otroRango()}`, hecho: () => `.hero-rangos [data-rango="${otroRango()}"]` },
  { c: 0, v: 'cartera', sel: '.hero-ojo', t: 'El ojo esconde las cifras', x: 'Para abrir la app en el metro sin que nadie vea cuánto tienes. Otro toque y vuelven.', prueba: 'Tócalo', hecho: '.hero-ojo', salir: () => { if (TOURE && TOURE.oculto0 != null && S.oculto !== TOURE.oculto0) { S.oculto = TOURE.oculto0; LS.set('inv-oculto', S.oculto); pintar(); } }, antes: () => { if (TOURE) TOURE.oculto0 = !!S.oculto; } },
  { c: 0, v: 'cartera', sel: '.ag-card, .car-agenda-mini', t: 'Tu mes y lo que viene', x: 'Tus aportaciones programadas, los resultados de lo que tienes y las fechas que importan, con los días que faltan.' },
  { c: 1, v: 'cartera', sel: navSel('posiciones'), toca: 'posiciones', t: 'Análisis: tu cartera por dentro', x: 'Lo que tienes, fila a fila, y en pestañas la rentabilidad, el riesgo, el reparto, Hacienda y más.', prueba: 'Toca Análisis' },
  { c: 1, v: 'posiciones', sel: '.pest-av', t: 'Todo, en pestañas', x: 'Posiciones, rentabilidad, riesgo, reparto, dividendos, costes, Hacienda y lo que opina la IA. En modo básico, solo las de siempre.' },
  { c: 1, v: 'posiciones', sel: '.car-pos .fila[data-pos]', si: conPosiciones, conFicha: true, t: 'Cada posición, su ficha', x: 'Su gráfica, lo que opinan los analistas y lo que pagarías si la vendieras hoy.', prueba: 'Toca una', hecho: '.fila[data-pos]' },
  { c: 2, v: 'posiciones', sel: navSel('mercados'), toca: 'mercados', t: 'Mercados: lo de fuera', x: 'Bolsas, tipos, divisas y materias primas, y en una frase lo que significa para lo tuyo.', prueba: 'Toca Mercados' },
  { c: 2, v: 'mercados', sel: '.merc-busca', t: 'Busca lo que quieras', x: 'Cualquier fondo, acción, ETF o cripto, aunque no lo tengas: su precio, su ficha y lo que opinan los analistas.' },
  { c: 3, v: 'mercados', sel: navSel('expertos'), toca: 'expertos', t: 'Ideas: lo que dicen los analistas', x: 'Su opinión sobre lo tuyo, las ideas del radar de unas 840 empresas y las que sigues.', prueba: 'Toca Ideas' },
  { c: 3, v: 'expertos', sel: '.exp-tabs', t: 'Lo tuyo, el radar y lo que sigues', x: 'Las ideas del radar son las mismas para todos; con cada una ves qué cambiaría en tu cartera. Lo que hagas lo decides tú.' },
  { c: 4, v: 'expertos', sel: navSel('tu'), toca: 'tu', t: 'Tú: lo tuyo y tus ajustes', get x() { return esPublico() ? 'Tu perfil, tus objetivos, tu plan de aportaciones, las novedades y este tutorial.' : 'Tu perfil, tus objetivos, el Paso a paso, las novedades y este tutorial.'; }, prueba: 'Toca Tú' },
  { c: 4, v: 'tu', sel: '.temas', t: 'Tu diseño', x: 'Mármol, Marfil o Borgoña. Se cambia al momento y se recuerda.', prueba: 'Toca uno', hecho: '[data-elige-tema]' },
  { c: 5, v: 'tu', sel: '#bAsesor, .riel-ia', abre: true, t: 'La IA, desde cualquier pantalla', x: 'Siempre arriba a la derecha (en el ordenador, en el menú de la izquierda), con tus números delante.', prueba: 'Tócala', hecho: '#bAsesor, .riel-ia' },
  { c: 5, v: 'tu', sel: '.asesor .as-cab', ia: true, antes: () => { if (!document.querySelector('.asesor')) abrirAsesor(); }, t: 'Pregúntale', get x() { return hayClaveIA() ? 'Explica y calcula con tu cartera: «¿Cómo va Repsol?» o «¿qué supondría aportar 500 € más?». Lo que hagas lo decides tú.' : 'Explica y calcula con tu cartera. Para contestarte necesita una clave gratuita de Google: aquí mismo te dice cómo sacarla en dos minutos.'; } },
  { fin: true, v: 'cartera', empezar: true, antes: () => cerrarAsesor(), t: 'Ya conoces Toisón', get x() { return itemsEmpezar().some((y) => !y.ok) ? 'Quedan unos pasos para que la app trabaje con tus números. Te esperan en Hoy hasta que acabes.' : 'Tu cartera ya está lista. El tutorial se queda en Tú por si quieres repetirlo.'; } },
];
/* Para empezar: lo mismo al final del tutorial y en Inicio mientras falte algo (a los nuevos, el primer mes) */
const hayClaveIA = () => claudeSinClave() || !!((AS.claves && AS.claves.google) || LS.get(LS_CLAVE.google) || (S.cartera && S.cartera.asesor && S.cartera.asesor[CAMPO_CLAVE.google]));
