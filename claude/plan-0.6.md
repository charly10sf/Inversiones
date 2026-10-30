# Plan de la 0.6 · Cimientos (23 oct 2026)

Objetivo del roadmap: partir, probar y cargar por trozos sin que nadie note nada. Se hace en la rama v0.6 y no se publica hasta cumplir el criterio de salida.

Plan escrito y construido con Opus 5.5 (no con Fable, como dice la regla 5), en la sesión de noche del 23 oct que Carlos dejó a su criterio.

## Punto de partida (medido el 23 oct con la 0.5a)

- index.html: 1,93 MB (363 KB de CSS y 1,56 MB de JS en un solo script, 20.118 líneas, unas 1.850 funciones y constantes globales). Por la red, con gzip: 571 KB.
- Al abrir con la cuenta ya creada se bajan unos 3,2 MB sin comprimir; comprimido, como lo sirven Pages y GitHub, 932 KB (sin el SDK de Firebase).
- Al abrir todo espera a los datos y la entrada dura 4,25 s.
- No había pruebas en el repositorio: las de cada versión estaban en la carpeta temporal de cada sesión.

## Lista cerrada

1. Pruebas en el repositorio (tests/) que pasan en Actions en cada push: Firebase de imitación, datos de verdad de las ramas datos y catalogo, nada de internet. Humo en 360/390/1440, español e inglés, fundador y estándar, sin errores de JS. Y pruebas de Python de los scripts.
2. El código partido por secciones en src/css y src/js. Siguen siendo un script clásico con el ámbito global compartido; pasar a módulos con import/export, poco a poco y después.
3. Build con Vite: dist/ con el JS y el CSS minificados y con huella en el nombre. Sin build ya no funciona (index.html es solo la cáscara).
4. Carga por secciones: Inicio primero; lo demás, al abrirlo.
5. en.json partido por sección.
6. Presupuesto de rendimiento en CI.
7. VERSION en un solo sitio (src/js/version.js).
8. Despliegue de Pages desde Actions.

Fuera (backlog): pasar a módulos ES, partir el CSS por secciones, la letra servida desde GrowFolio en vez de Google Fonts (privacidad y velocidad; candidata a la 0.8), escaneo y radar más ligeros (con el Worker en la 0.7).

## Cómo se mide

- Abrir con la cuenta ya creada, sin nada en la caché del navegador (como el día que sale una versión), con la CPU 4 veces más lenta y 4G de 9 Mbit/s y 150 ms (tests/rendimiento.spec.js, `npm run rendimiento`).
- «Descarga inicial»: bytes por la red, comprimidos, hasta Inicio. Sin Firebase ni la letra (los sirve Google).
- «Lista»: cuándo está todo para pintar Inicio (marca gf-listo). «Inicio pintado»: cuándo se ve, saltando la entrada.
- En CI: < 800 KB y lista en < 2 s.

## Estado (23 oct, 15:50): PUBLICADA (merge en main a las 15:00) y 0.6a a las 15:45

Pruebas en verde en Actions en cada commit (build, Python, Playwright, presupuesto y subida desde lo publicado).

- [x] Pruebas: 18 pruebas de Playwright (14 de humo, en 360, 390 y 1.440 según cada una): crear cuenta y cartera, cada pestaña y subpestaña sin salirse, fundador y estándar, inglés, código de recuperación, recargar, recuperar con el código, importar una captura con GrowIA de imitación, la guía sin tapar, cada trozo, qué pasa si un trozo no se baja, el mapa con banderas y su desplegable, GrowIA te pregunta (no repite lo contestado) y GrowIA busca en internet (Flash-Lite primero; sin cupo, el de la conversación). Más el build, el rendimiento y la subida desde main. Pruebas de Python de traducir.py.
- [x] Código partido: 21 archivos de CSS y 62 de JS, sin cambiar un byte al partir (comprobado). build/analizar.js y build/mover.js para repartir.
- [x] Build con Vite (build/growfolio-vite.js). El JS y el CSS minificados conservan los nombres de arriba del todo y el modo estricto (comprobado por la revisión).
- [x] Trozos: mapa del mundo, panel de GrowIA y recorte, GTA VI, novedades (con casi toda la historia de NOVEDADES), banco, opiniones y respuestas, leer capturas. El treemap («Tu cartera de un vistazo») se queda en el núcleo porque sale en Inicio. El escaneo ya se pedía después de abrir; el radar no se ha aplazado porque da precio a las acciones que no están en precios.json (opción para la 0.7).
- [x] en.json partido: el del núcleo pesa 132 KB comprimido (antes 178). El inglés de las vistas principales es idéntico al de la 0.5a (los mismos 1.124 textos).
- [x] Presupuesto en CI.
- [x] VERSION en src/js/version.js; release.py, cambios.py y la Action de Android leen de src/.
- [x] Workflow «Pages»: publica cuando «Pruebas» pasa en main y deja una versión más de assets/ y en/ para quien la tenga abierta. Está también en main desde el 23 oct (13:50), para poder lanzarlo a mano antes del merge.
- [x] Revisión aparte (otro agente, sin ver el trabajo): 13 hallazgos, todos arreglados. Lo gordo: el orden para pasar a Pages desde Actions, los trozos de la versión anterior que desaparecían al publicar, el service worker guardando una página sin su JS, los errores tapados por los relevos y lo que venía detrás de un relevo que no se bajaba, y frases de inglés en el trozo equivocado.
- [x] Lleva los arreglos publicados en main hasta la 0.5d (búsqueda de GrowIA con Flash-Lite, preguntas de GrowIA sin repetir, banderas y desplegables en el ordenador, «Actualizar»). VERSION en la rama: 0.5d.
- [x] Pruebas que fallaban de vez en cuando con toda la tanda a la vez (avisos de la cuenta nueva que llegan tarde): arregladas. De paso, la guía sigue a lo resaltado si algo aparece encima a mitad de un paso.
- [x] Barrido de cada pestaña en ordenador y móvil, español e inglés (23 oct): sin errores de JS; los textos en inglés que faltaban (recuento de señales, nombres de bolsas, una frase del plan de venta), arreglados.

Números (abrir con la cuenta ya creada):

| | 0.5a | 0.6 |
|---|---:|---:|
| Por la red (comprimido) | 932 KB | 750 KB |
| Sin comprimir | 3,2 MB | 2,5 MB |
| Lista (gf-listo) | 2,05 s | 1,6–1,9 s |
| Inicio pintado, saltando la entrada | 3,05 s | 2,5–3,1 s |

El criterio del roadmap «Inicio pintado en < 2 s» no se cumple: lo que queda es pintar Inicio (estilos y maquetación de una página muy larga) con la CPU lenta, y además la entrada dura 4,25 s. En CI se mide «lista < 2 s». Decidido por Carlos (23 oct, al probarla): la entrada, más corta. Sale entera la primera vez de cada día en cada dispositivo; las demás, corta (GrowFolio ya montado y dentro en cuanto ha cargado, 0,75 s como poco), así que en las visitas de siempre Inicio sale en menos de 2 s. En CI se sigue midiendo «lista < 2 s» (1,7 s).

## Para publicar

1. [x] (23 oct, 14:35: todo bien, igual que la publicada) Carlos la prueba en su ordenador con su cuenta de verdad: `git checkout v0.6`, `npm ci`, `npm run build`, `npm run preview` y abrir http://localhost:8766 (es el build, como saldrá publicado; con `npm run dev`, en http://localhost:5173). localhost está entre los dominios permitidos de Firebase por defecto; si no entra, se añade en Authentication → Settings → Authorized domains. Lo que toque ahí se guarda en su cartera de verdad.
2. [x] Carlos decide lo de «Inicio pintado < 2 s»: entrada más corta (hecho).
3. [x] Claude escribe las novedades ES/EN de la 0.6 y pone VERSION = '0.6' (hecho: «Abre antes», «La entrada, más corta», «Más probada antes de llegarte», con dibujos y sin guía). Borrador: «Abre antes»: GrowFolio baja un 20 % menos al abrir y está lista antes; el mapa del mundo, GrowIA, GTA VI y las novedades se cargan la primera vez que los abres.
4. [x] (hecho a las 14:51) Carlos, el mismo día que el merge: Settings → Pages → Build and deployment → Source: «GitHub Actions»; Actions → «Pages» → Run workflow (main); cuando esté en verde, comprobar que la web abre con la 0.5d. Si se cambia el origen y el merge se deja para otro día, lo que se suba a main entretanto (version.json de cada versión, un arreglo) no se publica solo: hay que lanzar «Pages» a mano.
5. [x] (15:00; pruebas y Pages en verde) Claude hace el merge de v0.6 a main (choques en index.html, sw.js, en.json y cambios.json: se queda la versión de v0.6, que ya lleva todo lo de main; comprobado el 23 oct). «Pruebas» pasa en main y «Pages» publica solo (unos 10 minutos). Carlos abre la web y la app y comprueba que sale la 0.6 con sus novedades.
6. Los arreglos que salgan en main mientras tanto, llevarlos a src/ antes del merge (hechos hasta la 0.5d).

## Criterio de salida (el del roadmap)

- [x] Build en CI y pruebas en verde en cada commit.
- [x] Descarga inicial < 800 KB: 750 KB comprimido (sin comprimir, de 3,2 a 2,5 MB; el «2,3 MB» del roadmap era una estimación).
- [x] Nadie nota nada: una cartera creada con la 0.5a abre igual con la 0.6 (total, posiciones y código), y Inicio, Plan, Análisis, Expertos y Mercados se ven igual píxel a píxel. Falta la prueba con la cartera real de Carlos.

## Después de publicar

- La rama v0.6 y la rama de prueba sonda-yahoo (una Action para mirar qué da Yahoo de Oriente Medio) se pueden borrar desde GitHub: desde aquí no hay permiso.
- Lo que sube a main la Action (version.json, app.json) no lanza «Pruebas» (los push con GITHUB_TOKEN no lanzan otras Actions), así que la web publicada se queda con el version.json del commit de antes hasta la próxima publicación. La app de Android lo lee de raw.githubusercontent.com, así que no le afecta.
