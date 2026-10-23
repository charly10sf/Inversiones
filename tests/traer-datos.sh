#!/bin/sh
# Los datos de verdad para las pruebas: lo último de las ramas «datos» y «catalogo» (las que escriben las Actions),
# copiado en tests/.datos/<rama>/. Las pruebas sirven de ahí lo que la app pide a raw.githubusercontent.com.
set -e
cd "$(dirname "$0")/.."
for rama in datos catalogo; do
  git fetch -q --depth=1 origin "+$rama:refs/remotes/origin/$rama"
  rm -rf "tests/.datos/$rama" && mkdir -p "tests/.datos/$rama"
  git archive "origin/$rama" | tar -x -C "tests/.datos/$rama"
done
echo "datos: $(ls tests/.datos/datos | wc -l) archivos · catálogo: $(find tests/.datos/catalogo -type f | wc -l)"
