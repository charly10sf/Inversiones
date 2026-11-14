# El relevo de la IA (Cloud Run)

Qué es: un servicio mínimo en Google Cloud Run que reenvía al Worker de Cloudflare lo que la app no puede mandarle
directamente cuando los operadores españoles bloquean Cloudflare durante los partidos de LaLiga. El código es
`servidor.mjs` (Node 22, sin dependencias). La app lo usa desde `src/js/32a-ruta-worker.js` (constante `RELEVO`): prueba
primero el Worker y, si no llega, va por el relevo (la IA, el banco, el ISIN, los correos y las gráficas).

Lo que ve: el token de la cuenta y el cuerpo de cada petición (la pregunta y lo que la IA necesita de la cartera). Lo
pasa y no lo guarda: no hay base de datos ni disco, y su registro solo apunta método, ruta (sin lo de detrás de «?»),
estado y tiempo. Cloud Run apuntaría por su cuenta cada petición (dirección con la consulta, IP, navegador): eso lo
quita la exclusión de Cloud Logging que pone `montar.sh`.

## Dónde está y cuánto puede costar

En un proyecto de Google **aparte** (por defecto `toison-relevo`), con su facturación. El proyecto de Firebase
(growfolio-a79a9) no se toca y sigue en Spark, gratis: Firestore, Hosting y las cuentas siguen parándose en su límite
gratis en vez de cobrar.

- Hoy (unos 10 usuarios): 0 € (dentro de lo gratis de Cloud Run hasta unos 80 usuarios). Con 1.000, unos 5 € al mes.
- Como mucho 1 instancia: aunque alguien lo abusara un mes entero, no pasaría de unos 60 $.
- Presupuesto de 5 € al mes con avisos al correo al 20 % (1 €), 50 %, 90 % y 100 %. Al llegar al 100 %, el servicio
  privado `toison-corte` (`corte/servidor.mjs`) quita la facturación del proyecto y Google para el relevo: ya no puede
  cobrar más. Google avisa con unas horas de retraso, así que el gasto se puede pasar un poco del tope.
- Si se corta: la app sigue; sin relevo sale el aviso del bloqueo. Para volver: Facturación → Mis proyectos → poner la
  cuenta al proyecto y lanzar la Action «Relevo» (o `montar.sh` otra vez).
- Si la cuenta de facturación nueva empieza con la prueba gratis de Google (créditos de 90 días), al acabar Google pide
  «activar la cuenta completa»; si no se hace, el relevo se para. Apuntarlo en ESTADO con la fecha.

## Montarlo (una vez, con Carlos delante; NADA de esto sin su sí)

Cuenta de Google: toison.web.app@gmail.com (en el Chrome de Carlos).

1. **Carlos** crea la cuenta de facturación con su tarjeta (console.cloud.google.com → Facturación → Crear cuenta) y
   copia su ID (tipo 01ABCD-23EFGH-45IJKL). Claude no mete tarjetas ni claves.
2. En **Cloud Shell** (el icono `>_` de arriba en la consola):
   `curl -fsSL https://raw.githubusercontent.com/charly10sf/Inversiones/v0.8.3d-ia/relevo/montar.sh | bash -s -- ID_FACTURACION`
   Hace todo lo demás (proyecto, APIs, las tres cuentas de servicio, la entrada sin clave para GitHub, el corte, el
   presupuesto, la exclusión de registros y el relevo) y al acabar dice la dirección del relevo y tres variables.
3. **GitHub** (charly10sf/Inversiones → Settings → Secrets and variables → Actions → Variables): `RELEVO_PROYECTO`,
   `RELEVO_WIF` y `RELEVO_EN_VIVO` = `si`, con lo que dijo el paso 2. Son variables, no secretos: no hay claves.
4. **La app**: poner la dirección en `RELEVO` (src/js/32a-ruta-worker.js), pasar «Pruebas» y publicar con el sí de Carlos.
5. **Comprobarlo** un fin de semana con partido, desde el wifi de Carlos: la IA tiene que contestar y en «Lo último de la
   IA» salir que va por el relevo.

En Cloudflare no hay que tocar nada. El Worker nuevo (X-Toison-Relevo, para el banco) sale con la Action «Worker» al
llegar a main.

## Las cuentas de servicio

- `relevo@…`: con la que corre el relevo. Sin ningún papel: no puede leer nada de ningún proyecto.
- `relevo-publica@…`: la de la Action «Relevo». Sin clave: entra con Workload Identity, que solo acepta la Action de
  `main` de charly10sf/Inversiones. Papeles: «Desarrollador de código fuente de Cloud Run», «Consumidor de Service
  Usage» y «Usuario de cuenta de servicio» sobre `relevo@` y sobre la de Compute (la que construye).
- `corte@…`: la de `toison-corte`. Solo «Gestor de facturación del proyecto» en este proyecto (quitarle la
  facturación) y «Invocador de Cloud Run» de su propio servicio (para que Pub/Sub le avise).

## Cómo está puesto

europe-southwest1 (Madrid, precio de nivel 1), público (quién eres lo mira el Worker con tu token), 1 vCPU, 256 MiB,
hasta 80 peticiones a la vez, 0 instancias parado (no cuesta nada), como mucho 1, 300 s por petición (la IA tarda
60–100 s). En el propio servicio: solo las rutas de la app (/salud, /claude, /isin, /intradia, /historico, /banco/…,
/correo…), solo desde charly10sf.github.io y toison.es, 120 peticiones por minuto y 8 abiertas a la vez por IP, 20 s
para subir el cuerpo y 20 MB como mucho.

No vale toison.es/api/… con Firebase Hosting: Hosting corta a los 60 s y las respuestas de la IA tardan más. Tampoco un
dominio propio en Cloud Run (api.toison.es) en Madrid: el mapeo de dominios no está en esa región. La app no lo necesita.

Si se cambian los sitios del Worker (ORIGENES_EXTRA), cambiar también ORIGENES en relevo.yml y en montar.sh. Si el
Worker gana una ruta que la app pide con `fetchWorker`, añadirla a RUTAS en servidor.mjs.
