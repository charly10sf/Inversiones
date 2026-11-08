# El relevo de la IA (Cloud Run)

Qué es: un servicio mínimo en Google Cloud Run que reenvía al Worker de Cloudflare lo que la app no puede mandarle
directamente cuando los operadores españoles bloquean Cloudflare durante los partidos de LaLiga. El código es
`servidor.mjs` (Node 22, sin dependencias). La app lo usa desde `src/js/32a-ruta-worker.js` (constante `RELEVO`).

Lo que ve: el token de la cuenta y el cuerpo de cada petición (la pregunta y lo que la IA necesita de la cartera). Lo
pasa y no lo guarda: no hay base de datos ni disco, y su registro solo apunta método, ruta (sin lo de detrás de «?»),
estado y tiempo. Ojo: Cloud Run apunta por su cuenta cada petición (dirección entera con la consulta, IP, navegador,
estado, tiempo) en Cloud Logging, 30 días. Se quita con la exclusión del paso 6.

## Lo que hay que hacer una vez (con Carlos delante; NADA de esto sin su sí)

Cuenta: toison.web.app@gmail.com (en el Chrome de Carlos, /u/3), proyecto growfolio-a79a9.

1. **Plan Blaze** (Firebase → Uso y facturación → Detalles y configuración → Modificar plan). Pide una cuenta de
   facturación con tarjeta. Es gasto potencial nuevo: solo con el sí explícito de Carlos.
2. **Presupuesto con alerta** (Google Cloud → Facturación → Presupuestos y alertas → Crear): 1 € (o 5 €) al mes para el
   proyecto, avisos al 50, 90 y 100 % al correo. Avisa, no corta.
3. **APIs** (Google Cloud → APIs y servicios → Habilitar): Cloud Run Admin API, Cloud Build API, Artifact Registry API.
4. **Dos cuentas de servicio** (IAM y administración → Cuentas de servicio → Crear):
   - `relevo` (relevo@growfolio-a79a9.iam.gserviceaccount.com): **sin ningún papel**. Es con la que corre el servicio:
     así no puede leer Firestore ni nada del proyecto.
   - `relevo-publica`: papeles «Desarrollador de código fuente de Cloud Run» (roles/run.sourceDeveloper), «Usuario de
     cuenta de servicio» (roles/iam.serviceAccountUser) y «Consumidor de Service Usage»
     (roles/serviceusage.serviceUsageConsumer). Claves → Agregar clave → JSON. Si el primer despliegue se queja de
     permisos (crear el repositorio `cloud-run-source-deploy` o el bucket `run-sources-…`), añadir lo que diga el error.
5. **GitHub** (charly10sf/Inversiones → Settings → Secrets and variables → Actions): secreto `GCP_RELEVO` = el JSON
   del paso 4; variable `RELEVO_EN_VIVO` = `si`. Luego Actions → Relevo → Run workflow (o al llegar a main). Al acabar,
   la Action dice la dirección (…run.app) y si /salud da 200.
6. **Que Google no guarde las direcciones** (Logging → Enrutador de registros → _Default → Editar → Agregar exclusión):
   nombre `relevo`, filtro
   `resource.type="cloud_run_revision" AND resource.labels.service_name="toison-relevo" AND log_name:"requests"`.
7. **La app**: poner la dirección del paso 5 en `RELEVO` (src/js/32a-ruta-worker.js), pasar las pruebas y publicar con
   el sí de Carlos.
8. **Comprobarlo** un fin de semana con partido, desde el wifi de Carlos: la IA tiene que contestar y en «Lo último de la
   IA» salir «va por el relevo media hora».

En Cloudflare no hay que tocar nada. El Worker nuevo (X-Toison-Relevo, para el banco) sale con la Action «Worker» al
llegar a main.

## Cómo está puesto (relevo.yml)

europe-southwest1 (Madrid, precio de nivel 1), público (quién eres lo mira el Worker con tu token), 1 vCPU, 256 MiB,
hasta 80 peticiones a la vez por instancia, 0 instancias parado (no cuesta nada), como mucho 2 (tope de gasto si
alguien lo abusa), 300 s por petición (la IA tarda 60–100 s). En el propio servicio: solo las rutas de la app, solo
desde charly10sf.github.io y toison.es, 120 peticiones por minuto y 8 abiertas a la vez por IP, 20 s para subir el
cuerpo y 20 MB como mucho.

No vale toison.es/api/… con Firebase Hosting: Hosting corta a los 60 s y las respuestas de la IA tardan más. Tampoco un
dominio propio en Cloud Run (api.toison.es) en Madrid: el mapeo de dominios no está en esa región. La app no lo necesita.

Si se cambian los sitios del Worker (ORIGENES_EXTRA), cambiar también ORIGENES en relevo.yml.
