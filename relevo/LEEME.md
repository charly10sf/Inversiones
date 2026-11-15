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
- Como mucho 1 instancia. Eso limita la CPU (unos 60 $ al mes si alguien lo tuviera ocupado el mes entero), pero no la
  salida a internet, que también se paga (unos 0,12 $/GB): quien lo abusara pidiendo gráficas desde muchas IP podría
  gastar varios dólares por hora. Por eso hay topes por IP (60 peticiones por minuto; las IPv6, por su /64) y, sobre
  todo, el corte.
- EL TOPE DE VERDAD ES EL CORTE: presupuesto de 5 € al mes con avisos al correo al 20 % (1 €), 50 %, 90 % y 100 %. Al
  llegar al 100 %, el servicio privado `toison-corte` (`corte/servidor.mjs`) quita la facturación del proyecto y Google
  para el relevo: ya no puede cobrar más. Google avisa con unas horas de retraso, así que el gasto se puede pasar algo
  del tope. Tras montarlo hay que probar que corta de verdad (abajo).
- Si se corta: la app sigue; sin relevo sale el aviso del bloqueo. Para volver:
  - El mes siguiente: Facturación → Mis proyectos → poner la cuenta al proyecto (o `gcloud billing projects link toison-relevo --billing-account=…`). El relevo vuelve solo en unos 5 minutos (probado el 14 nov); si no, lanzar `montar.sh` otra vez.
  - El mismo mes: el gasto del mes ya pasa del tope, así que antes hay que subirlo (si no, el próximo aviso lo vuelve a
    cortar): `gcloud run services update toison-corte --region europe-southwest1 --update-env-vars TOPE=10` y subir
    también el presupuesto «Relevo Toison» en la consola. Luego vaciar los avisos atrasados:
    `gcloud pubsub subscriptions seek gasto-relevo-corte --time=$(date -u +%Y-%m-%dT%H:%M:%SZ)`. El corte, además,
    no hace caso a los avisos de hace más de una hora ni a los de otro mes.
- Si la cuenta de facturación nueva empieza con la prueba gratis de Google (créditos de 90 días), al acabar Google pide
  «activar la cuenta completa»; si no se hace, el relevo se para. Apuntarlo en ESTADO con la fecha.

## Montarlo (una vez, con Carlos delante; NADA de esto sin su sí)

Cuenta de Google: toison.web.app@gmail.com (en el Chrome de Carlos).

1. **Carlos** crea la cuenta de facturación con su tarjeta (console.cloud.google.com → Facturación → Crear cuenta) y
   copia su ID (tipo 01ABCD-23EFGH-45IJKL). Claude no mete tarjetas ni claves.
2. En **Cloud Shell** (el icono `>_` de arriba en la consola):
   `curl -fsSL https://raw.githubusercontent.com/charly10sf/Inversiones/v0.8.3d-ia/relevo/montar.sh | RAMA=v0.8.3d-ia bash -s -- ID_FACTURACION`
   (cuando esté en main, `…/main/relevo/montar.sh | RAMA=main bash -s -- …`)
   Hace todo lo demás (proyecto, APIs, las tres cuentas de servicio, la entrada sin clave para GitHub, el corte, el
   presupuesto, la exclusión de registros y el relevo) y al acabar dice la dirección del relevo y tres variables.
3. **GitHub** (charly10sf/Inversiones → Settings → Secrets and variables → Actions → Variables): `RELEVO_PROYECTO`,
   `RELEVO_WIF` y `RELEVO_EN_VIVO` = `si`, con lo que dijo el paso 2. Son variables, no secretos: no hay claves.
4. **La app**: poner la dirección en `RELEVO` (src/js/32a-ruta-worker.js), pasar «Pruebas» y publicar con el sí de Carlos.
5. **Probar el corte** (una vez, recién montado): mandar un aviso falso con más gasto que el tope y mirar que se
   quita la facturación; luego volver a ponerla (Facturación → Mis proyectos) y comprobar que el relevo responde. Los
   avisos de verdad llevan el gasto real (casi 0 €), así que no lo vuelven a cortar:
   `gcloud pubsub topics publish gasto-relevo --message="{\"costAmount\":6,\"budgetAmount\":5,\"currencyCode\":\"EUR\",\"costIntervalStart\":\"$(date -u +%Y-%m-01T00:00:00Z)\"}"`
6. **Comprobarlo** un fin de semana con partido, desde el wifi de Carlos: la IA tiene que contestar y en «Lo último de la
   IA» salir que va por el relevo.

En Cloudflare no hay que tocar nada. El Worker nuevo (X-Toison-Relevo, para el banco) sale con la Action «Worker» al
llegar a main.

## Las cuentas de servicio

- `relevo@…`: con la que corre el relevo. Sin ningún papel: no puede leer nada de ningún proyecto.
- `relevo-publica@…`: la de la Action «Relevo». Sin clave: entra con Workload Identity, que solo acepta el workflow
  relevo.yml en `main` de charly10sf/Inversiones (por el id del repo y del dueño; ningún otro workflow, ni Pages, que
  hace npm ci en main y ya no tiene id-token en el build). Papeles: «Desarrollador de código fuente de Cloud Run», «Consumidor de Service
  Usage» y «Usuario de cuenta de servicio» sobre `relevo@` y sobre la de Compute (la que construye).
- `corte-gasto@…`: la de `toison-corte`. Solo «Gestor de facturación del proyecto» y «Navegador» en este proyecto
  (quitarle la facturación y ver si la tiene) e «Invocador de Cloud Run» de su propio servicio (para que Pub/Sub le
  avise). La Action «Relevo» no publica el corte: un cambio en `corte/` se publica volviendo a lanzar `montar.sh`.

## Cómo está puesto

europe-southwest1 (Madrid, precio de nivel 1), público (quién eres lo mira el Worker con tu token), 1 vCPU, 256 MiB,
hasta 80 peticiones a la vez, 0 instancias parado (no cuesta nada), como mucho 1, 300 s por petición (la IA tarda
60–100 s). Lo de entrar sin cuenta (allUsers como invocador) lo pone `montar.sh`; la Action no lo toca. En el propio servicio: solo las rutas de la app (/salud, /claude, /isin, /intradia, /historico, /banco/…,
/correo…), solo desde charly10sf.github.io y toison.es, 60 peticiones por minuto y 8 abiertas a la vez por IP, 20 s
para subir el cuerpo y 20 MB como mucho.

No vale toison.es/api/… con Firebase Hosting: Hosting corta a los 60 s y las respuestas de la IA tardan más. Tampoco un
dominio propio en Cloud Run (api.toison.es) en Madrid: el mapeo de dominios no está en esa región. La app no lo necesita.

Si se cambian los sitios del Worker (ORIGENES_EXTRA), cambiar también ORIGENES en relevo.yml y en montar.sh. Si el
Worker gana una ruta que la app pide con `fetchWorker`, añadirla a RUTAS en servidor.mjs.
