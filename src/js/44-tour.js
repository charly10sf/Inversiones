/* =====================================================================
   Tour: la primera vez (y desde Ajustes) enseña cada pestaña, resaltando dónde está.
   ===================================================================== */
const TOUR = [
  { v: 'cartera', sel: '.navbar, .nav', logo: true, ola: true, t: 'Te damos la bienvenida', x: () => (innerWidth < 760 ? 'Todo está en estos cinco botones: Inicio en el centro, a la izquierda lo que haces tú y a la derecha lo de fuera. Te enseñamos cada uno en un minuto.' : 'Todo está en estas cinco pestañas. Te enseñamos cada una en un minuto y, al final, qué hacer hoy para empezar.') },
  { v: 'cartera', sel: '.hero-cifra', t: 'Inicio: lo que tienes', x: 'Todo sumado, con lo que ganas o pierdes hoy. Desliza el dedo por la gráfica para ver cualquier día. El ojo oculta las cifras.' },
  { v: 'cartera', sel: '.car-agenda-mini', t: 'Tu calendario', x: 'Resultados y dividendos de lo que tienes, tus aportaciones, la Fed y el BCE y las fechas de la renta, con los días que faltan.' },
  { v: 'cartera', pos: true, sel: '#hPos ~ .der', t: 'Tus posiciones, justo debajo', x: 'Toca una para ver su ficha; debajo del valor, lo ganado desde que la compraste. El «+» es para lo que ya tenías antes de Toisón y las flechas, para cada compra o venta desde hoy. A su lado eliges el orden.' },
  { v: 'ruta', sel: '.navbar [data-ir="ruta"], .nav [data-ir="ruta"]', suave: true, get t() { return esPublico() ? L('Plan: tus aportaciones y tus límites', 'Plan: your contributions and limits') : 'Pasos: qué hacer este mes'; }, get x() { return esPublico() ? L('Lo que aportas cada mes y si tu cartera se sale de los límites que te has puesto. En la 0.9, también tus reglas.', 'What you put in each month and whether your portfolio goes beyond the limits you set. In 0.9, your rules too.') : 'En orden y con lo urgente arriba: qué, cuánto y por qué. Lo haces y lo marcas. Si no toca nada, también te lo dice.'; } },
  { v: 'analisis', sel: '.navbar [data-ir="analisis"], .nav [data-ir="analisis"]', suave: true, t: 'Análisis: cómo vas', x: 'La nota de la IA a tu cartera, tus objetivos frente a lo que tienes y cuánto podrías llegar a tener. En época de renta, también Hacienda.' },
  { v: 'expertos', sel: '.navbar [data-ir="expertos"], .nav [data-ir="expertos"]', suave: true, t: 'Expertos: qué comprar', x: 'Lo que dicen los analistas de lo tuyo y las ideas de compra, con las tres que mejor te encajan en verde.' },
  { v: 'mercados', sel: '.navbar [data-ir="mercados"], .nav [data-ir="mercados"]', suave: true, t: 'Mercados: lo de fuera', x: 'Bolsas, tipos, divisas y materias primas, con lo que significa para ti, y el buscador para consultar cualquier fondo, acción o cripto.' },
  { v: 'cartera', sel: '#bAsesor', t: 'Pregúntale', x: '«¿Cómo va Repsol?» o «¿qué supondría aportar 500 € más?». La IA contesta con tus números delante.' },
  { v: 'cartera', empezar: true, t: 'Tus primeros pasos', x: 'Empieza por el primero. Los tienes arriba en Inicio hasta que acabes, y el tutorial queda en Ajustes por si quieres repetirlo.' },
];
/* 0.8 (rediseño, paso 4): con un diseño de Toisón, el tutorial recorre la barra nueva (Cartera · Mercados · Hoy · Ideas ·
   Tú) y la IA de la cabecera. Con GrowFolio, TOUR de siempre */
const TOUR_TS = [
  { v: 'cartera', sel: '.navbar, .nav', logo: true, ola: true, t: 'Te damos la bienvenida', x: () => (innerWidth < 760 ? 'Todo está en estos cinco botones: Hoy en el centro, tu cartera y los mercados a la izquierda, y las ideas y lo tuyo a la derecha. Te lo enseñamos en un minuto.' : 'Todo está en estas cinco pestañas. Te enseñamos cada una en un minuto y, al final, por dónde empezar.') },
  { v: 'cartera', sel: '.hero-cifra', t: 'Hoy: lo que tienes', x: 'Todo sumado, con lo que ganas o pierdes hoy. Desliza el dedo por la gráfica para ver cualquier día. El ojo oculta las cifras.' },
  { v: 'cartera', sel: '.car-agenda-mini, .ag-card', t: 'Lo que viene', x: 'Resultados y dividendos de lo que tienes, tus aportaciones, la Fed y el BCE y las fechas de la renta, con los días que faltan.' },
  { v: 'posiciones', sel: '.navbar [data-ir="posiciones"], .nav [data-ir="posiciones"]', suave: true, t: 'Cartera: lo tuyo, fila a fila', x: 'Tus posiciones, lo que opina la IA de tu cartera y lo que pagarás en la renta. Toca una posición para ver su ficha.' },
  { v: 'mercados', sel: '.navbar [data-ir="mercados"], .nav [data-ir="mercados"]', suave: true, t: 'Mercados: lo de fuera', x: 'Bolsas, tipos, divisas y materias primas, con lo que significa para tu cartera, y el buscador para consultar cualquier fondo, acción o cripto.' },
  { v: 'expertos', sel: '.navbar [data-ir="expertos"], .nav [data-ir="expertos"]', suave: true, t: 'Ideas: lo que dicen los analistas', x: 'Su opinión sobre lo tuyo, las ideas del radar y las que sigues. Son las mismas para todos; lo que hagas lo decides tú.' },
  { v: 'tu', sel: '.navbar [data-ir="tu"], .nav [data-ir="tu"]', suave: true, t: 'Tú: tus metas y tus ajustes', get x() { return esPublico() ? 'Tu perfil, tus objetivos, tu plan de aportaciones y los ajustes, con este tutorial por si quieres repetirlo.' : 'Tu perfil, tus objetivos, el Paso a paso y los ajustes, con este tutorial por si quieres repetirlo.'; } },
  { v: 'cartera', sel: '#bAsesor', t: 'La IA, desde cualquier pantalla', x: '«¿Cómo va Repsol?» o «¿qué supondría aportar 500 € más?». Contesta con tus números delante.' },
  { v: 'cartera', empezar: true, t: 'Tus primeros pasos', x: 'Empieza por el primero. Los tienes en Hoy hasta que acabes, y el tutorial queda en Tú por si quieres repetirlo.' },
];
const tourBase = () => (navToison() ? TOUR_TS : TOUR);
/* Para empezar: lo mismo al final del tutorial y en Inicio mientras falte algo (a los nuevos, el primer mes) */
const hayClaveIA = () => !!((AS.claves && AS.claves.google) || LS.get(LS_CLAVE.google) || (S.cartera && S.cartera.asesor && S.cartera.asesor[CAMPO_CLAVE.google]));
