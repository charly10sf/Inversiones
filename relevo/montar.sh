#!/usr/bin/env bash
# El relevo de Toisón, montado de una vez (0.8.3d). Se lanza en Cloud Shell (la terminal de la consola de Google, con la
# cuenta de Carlos ya dentro), DESPUÉS de que Carlos haya creado la cuenta de facturación con su tarjeta:
#
#   curl -fsSL https://raw.githubusercontent.com/charly10sf/Inversiones/v0.8.3d-ia/relevo/montar.sh | bash -s -- ID_FACTURACION
#
# ID_FACTURACION es el de la cuenta de facturación (Facturación → «ID de la cuenta de facturación», tipo 01ABCD-23EFGH-45IJKL).
# Segundo argumento opcional: el id del proyecto (por defecto toison-relevo; si está cogido en Google, otro).
#
# Lo que hace, todo en un proyecto NUEVO y APARTE (el de Firebase, growfolio-a79a9, no se toca y sigue en Spark, gratis):
#   1. crea el proyecto y le pone la facturación;
#   2. enciende las APIs justas;
#   3. tres cuentas de servicio: relevo (con la que corre el relevo, SIN NINGÚN PAPEL), relevo-publica (la que usa la
#      Action «Relevo» de GitHub para publicar, sin clave: entra con Workload Identity, y solo desde relevo.yml en main
#      de charly10sf/Inversiones) y corte-gasto (la que quita la facturación si se llega al tope; solo puede eso y ver
#      el proyecto, y solo en este proyecto);
#   4. el corte del gasto: el servicio privado toison-corte, un tema de Pub/Sub y un presupuesto de 5 € al mes con
#      avisos al correo al 20 % (1 €), 50 %, 90 % y 100 %; al 100 %, toison-corte quita la facturación y Google para
#      el relevo (no puede cobrar más; Google avisa con horas de retraso: se puede pasar un poco);
#   5. que Google no apunte las direcciones de las peticiones del relevo (exclusión en Cloud Logging);
#   6. el relevo: toison-relevo en Madrid, 1 instancia como mucho, 0 cuando no se usa;
#   7. dice lo que hay que poner en GitHub (variables, no secretos) y en la app (RELEVO).
#
# Se puede volver a lanzar: lo que ya está, lo deja.
set -euo pipefail

FACT="${1:?Falta el ID de la cuenta de facturación (Facturación → ID de la cuenta de facturación)}"
P="${2:-toison-relevo}"
R="europe-southwest1"
REPO="charly10sf/Inversiones"
REPO_ID="1423240718"        # el id de GitHub del repo (no cambia aunque se renombre)
DUENO_ID="227480622"        # el de charly10sf
RAMA="${RAMA:-v0.8.3d-ia}"
TOPE="${TOPE:-5}"
WORKER="https://growfolio.growfolio-web-app.workers.dev"
ORIGENES="https://charly10sf.github.io,https://toison.es"

paso() { printf '\n== %s\n' "$*"; }
cuenta() { echo "$1@$P.iam.gserviceaccount.com"; }

paso "1. Proyecto $P y facturación $FACT"
if ! gcloud projects describe "$P" >/dev/null 2>&1; then
  gcloud projects create "$P" --name="Toison relevo" || { echo "No se pudo crear $P (¿cogido?). Vuelve a lanzarlo con otro id: … | bash -s -- $FACT toison-relevo-2"; exit 1; }
fi
gcloud config set project "$P" >/dev/null
gcloud billing projects link "$P" --billing-account="$FACT" >/dev/null
N="$(gcloud projects describe "$P" --format='value(projectNumber)')"
MONEDA="$(gcloud billing accounts describe "$FACT" --format='value(currencyCode)' 2>/dev/null || echo EUR)"
echo "proyecto $P (n.º $N), moneda $MONEDA"

paso "2. APIs"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com pubsub.googleapis.com cloudbilling.googleapis.com \
  billingbudgets.googleapis.com logging.googleapis.com cloudresourcemanager.googleapis.com

paso "3. Cuentas de servicio"
for sa in relevo relevo-publica corte-gasto; do
  gcloud iam service-accounts describe "$(cuenta $sa)" >/dev/null 2>&1 || gcloud iam service-accounts create "$sa" --display-name="Toison $sa"
done
# Google tarda unos segundos en ver las cuentas nuevas
sleep 15
papel() { gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$1" --role="$2" --condition=None >/dev/null; }
papel "$(cuenta relevo-publica)" roles/run.sourceDeveloper
papel "$(cuenta relevo-publica)" roles/serviceusage.serviceUsageConsumer
# corte-gasto: quitar la facturación (projectManager) y poder leer si la tiene (browser)
papel "$(cuenta corte-gasto)" roles/billing.projectManager
papel "$(cuenta corte-gasto)" roles/browser
# la que construye en «--source» (la de Compute por defecto) necesita construir para Cloud Run
COMPUTE="$N-compute@developer.gserviceaccount.com"
papel "$COMPUTE" roles/run.builder
# relevo-publica puede «hacerse pasar» por relevo (para publicarlo con ella) y por la que construye
for sa in "$(cuenta relevo)" "$COMPUTE"; do
  gcloud iam service-accounts add-iam-policy-binding "$sa" --member="serviceAccount:$(cuenta relevo-publica)" --role=roles/iam.serviceAccountUser >/dev/null
done

paso "3b. Entrada de GitHub sin clave (Workload Identity): solo relevo.yml en main de $REPO"
# solo ese workflow en main: ni otra rama, ni otro workflow del mismo repo (Pages hace npm ci en main)
MAPEO="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.workflow_ref=assertion.workflow_ref"
CONDICION="assertion.workflow_ref=='$REPO/.github/workflows/relevo.yml@refs/heads/main' && assertion.repository_id=='$REPO_ID' && assertion.repository_owner_id=='$DUENO_ID'"
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub"
if gcloud iam workload-identity-pools providers describe github --location=global --workload-identity-pool=github >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc github --location=global --workload-identity-pool=github \
    --attribute-mapping="$MAPEO" --attribute-condition="$CONDICION"
else
  gcloud iam workload-identity-pools providers create-oidc github --location=global --workload-identity-pool=github \
    --display-name="GitHub Actions" --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="$MAPEO" --attribute-condition="$CONDICION"
fi
gcloud iam service-accounts add-iam-policy-binding "$(cuenta relevo-publica)" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github/attribute.repository_id/$REPO_ID" >/dev/null
WIF="projects/$N/locations/global/workloadIdentityPools/github/providers/github"

paso "Código (rama $RAMA)"
SRC="$HOME/toison-relevo-src"
rm -rf "$SRC"
git clone --quiet --depth 1 --branch "$RAMA" "https://github.com/$REPO" "$SRC"

paso "4. El corte del gasto (tope $TOPE $MONEDA al mes)"
gcloud run deploy toison-corte --source "$SRC/relevo/corte" --region "$R" --no-allow-unauthenticated \
  --service-account "$(cuenta corte-gasto)" --cpu 1 --memory 256Mi --min-instances 0 --max-instances 1 --timeout 60 \
  --set-env-vars "PROYECTO=$P,TOPE=$TOPE" --quiet
CORTE="$(gcloud run services describe toison-corte --region "$R" --format='value(status.url)')"
gcloud run services add-iam-policy-binding toison-corte --region "$R" --member="serviceAccount:$(cuenta corte-gasto)" --role=roles/run.invoker >/dev/null
# Pub/Sub firma la llamada como corte-gasto@ (en los proyectos nuevos ya viene; si su agente aún no existe, se crea)
gcloud beta services identity create --service=pubsub.googleapis.com >/dev/null 2>&1 || true
gcloud iam service-accounts add-iam-policy-binding "$(cuenta corte-gasto)" --role=roles/iam.serviceAccountTokenCreator \
  --member="serviceAccount:service-$N@gcp-sa-pubsub.iam.gserviceaccount.com" >/dev/null || echo "(sin el papel del agente de Pub/Sub: en proyectos nuevos no hace falta)"
gcloud pubsub topics describe gasto-relevo >/dev/null 2>&1 || gcloud pubsub topics create gasto-relevo
SUSC=(--push-endpoint="$CORTE" --push-auth-service-account="$(cuenta corte-gasto)" --ack-deadline=60 --min-retry-delay=10s --max-retry-delay=600s)
if gcloud pubsub subscriptions describe gasto-relevo-corte >/dev/null 2>&1; then
  gcloud pubsub subscriptions update gasto-relevo-corte "${SUSC[@]}"
else
  gcloud pubsub subscriptions create gasto-relevo-corte --topic gasto-relevo "${SUSC[@]}"
fi
PRESUPUESTOS="$(gcloud billing budgets list --billing-account="$FACT" --billing-project="$P" --format='value(displayName)')"
if ! printf '%s\n' "$PRESUPUESTOS" | grep -qx "Relevo Toison"; then
  gcloud billing budgets create --billing-account="$FACT" --billing-project="$P" --display-name="Relevo Toison" \
    --budget-amount="${TOPE}${MONEDA}" --filter-projects="projects/$P" \
    --threshold-rule=percent=0.2 --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
    --notifications-rule-pubsub-topic="projects/$P/topics/gasto-relevo"
fi

paso "5. Que Google no apunte las direcciones del relevo"
if gcloud logging sinks describe _Default --format='value(exclusions[].name)' | tr ';,' '\n\n' | grep -qx relevo; then
  echo "(la exclusión ya estaba)"
else
  gcloud logging sinks update _Default --add-exclusion=name=relevo,filter='resource.type="cloud_run_revision" AND resource.labels.service_name="toison-relevo" AND logName:"requests"'
fi
# sin ella, Google guardaría 30 días cada dirección (con lo que va detrás de «?»: qué tiene cada uno) y su IP: se para
gcloud logging sinks describe _Default --format='value(exclusions[].name)' | tr ';,' '\n\n' | grep -qx relevo \
  || { echo "ERROR: la exclusión de registros no ha quedado puesta. No se publica el relevo."; exit 1; }

paso "6. El relevo"
gcloud run deploy toison-relevo --source "$SRC/relevo" --region "$R" --allow-unauthenticated \
  --cpu 1 --memory 256Mi --concurrency 80 --min-instances 0 --max-instances 1 --timeout 300 --cpu-boost \
  --service-account "$(cuenta relevo)" \
  --set-env-vars "^@^DESTINO=$WORKER@ORIGENES=$ORIGENES" --quiet
URL="$(gcloud run services describe toison-relevo --region "$R" --format='value(status.url)')"
CODIGO="$(curl -s --max-time 30 -o /dev/null -w '%{http_code}' "$URL/salud" || true)"

paso "7. Hecho"
echo "Relevo:   $URL  (/salud → $CODIGO)"
echo "Corte:    $CORTE (privado)"
echo
echo "En GitHub ($REPO → Settings → Secrets and variables → Actions → Variables):"
echo "  RELEVO_PROYECTO = $P"
echo "  RELEVO_WIF      = $WIF"
echo "  RELEVO_EN_VIVO  = si"
echo "En la app: RELEVO = '$URL' (src/js/32a-ruta-worker.js)"
