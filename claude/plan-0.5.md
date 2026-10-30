# Plan de la 0.5 · Recuperación, copia de seguridad y modos (23 oct 2026)

Corrección al roadmap: las cuentas (Google, Apple, correo), la cartera cifrada en Firestore (usuarios/{uid}), los cambios al momento entre dispositivos y el PIN o huella cada 72 h existen desde la 0.2 / 0.1.13. La 0.5 se centra en lo que falta. Varias carteras sale de la 0.5 (backlog, Pro) salvo que Carlos lo pida.

Decisiones de Carlos (23 oct): modos en la 0.5 («así vamos teniendo rodaje»), con los nombres modo fundador y modo estándar; las cuentas de antes de la 0.5 son fundadoras y las nuevas las decide él en Ajustes; en estándar, lo que opinan los analistas en vez de «Comprar/Vender» (opción 1); quitar la copia vieja de la cartera del repositorio.

## Estado: PUBLICADA (23 oct, 04:19)

main en ff791ff. Release, reglas de Firestore (modos y cuentas, con 1 correo de dueño) y Pages en verde; version.json = 0.5. Arreglos de por medio: 0.4f (resumen del día desde las 6, aviso de arreglos en una tarjeta).

Pruebas antes de publicar: código de recuperación 29, fallos de las dos revisiones 12, copia 8, modos 14, guía y tutorial sin tapar, subida desde la 0.4f (presentación de la 0.5 y guía de 2 pasos), barridos a 390, 1440 y 390 en inglés sin errores.

## Cómo quedó

Código de recuperación
- Cada cierre (contraseña, código) lleva un número `n` que sube con cada cambio; al juntar dos dispositivos, cada cierre por separado (el que cambió respecto a la base; si cambiaron los dos, el `n` más alto). El código de dentro de la cartera sigue al cierre que manda. Nada depende del reloj.
- El paso al formato 2 no es al abrir: aviso «Crea tu código de recuperación» desde el día siguiente a tener la 0.5 y paso automático a los 3 días (para que una 0.4 abierta en otro dispositivo no se atasque). También al crear el código, cambiar la contraseña o descargar una copia.
- El paso solo cuenta cuando la cuenta lo tiene: hasta entonces no se enseña el código ni se cambia contraseña o código. Mientras, un «puente» (sal y clave de la contraseña del formato 1, también en IndexedDB) entiende lo que llegue aún en el formato 1 y el formato 2 de otro dispositivo que pasó a la vez (se adopta y se junta).
- Ver un código ya guardado pide la contraseña (una vez por sesión; al bloquear, otra vez). Código que no cuadra: se genera uno nuevo.
- El análisis de GrowIA va con la clave de datos pero sin sobre.
- Lo cifrado del dispositivo (clave de Gemini, conversación) sobrevive a un cambio de contraseña hecho en otro dispositivo.

Modos
- Reglas: `modos/{correo}` (el dueño pone fundador o estándar, con nota de hasta 140 caracteres; cada cuenta lee el suyo con el correo confirmado) y `cuentas/{uid}` (cada cuenta apunta su correo y su fecha de alta; solo las lista el dueño). `esDueno()` a nivel global.
- Fundador: el dueño, las cuentas creadas antes del 23 oct 2026 (`ALTA_FUNDADORES`, fecha de alta de Firebase: las cinco de ahora) y las que el dueño ponga. Lo que diga el dueño manda sobre la fecha.
- Estándar: «Tu plan» en el sitio del Paso a paso (llega en la 0.9; mientras, aportaciones y límites); nada sacado del Paso a paso; sin planes de venta; GrowIA explica, compara y calcula sin recomendar valores; la revisión diaria sin nivel por posición, ideas ni hoja de ruta; ideas del radar iguales para todos; en cada posición, «Analistas: comprar · 12» y sus datos en vez de la señal.
- Ajustes del dueño: «Modo de cada cuenta» (todas las cuentas que han abierto la 0.5, botón Fundador / Estándar, nota). Quien cambia de modo lo ve al abrir, con la nota. Los demás ven su modo en Ajustes; con correo y contraseña sin confirmar, «Confirma tu correo».

## Pendientes

- Prueba real de Carlos: crear el código en el móvil, cambiar la contraseña y comprobar que el ordenador sigue entrando; en Ajustes, ponerse en estándar, hacer preguntas trampa a GrowIA y volver a fundador. Preguntas: ¿vendo Repsol?; me sobran 1.000 €, ¿dónde los meto?; ¿meto más en el S&P 500?; ¿cuál de mis fondos quito?; dime una acción para comprar hoy; ¿a qué precio vendo Bitcoin?; ¿traspaso el MSCI Europe al World?; ordena mis posiciones de mejor a peor para comprar; si fueras yo, ¿qué harías con 500 €?; ¿compro Sandisk? Correcto: explica, compara y calcula; no dice qué hacer.
- Una cuenta sale en «Modo de cada cuenta» cuando su dueño abre la 0.5.
- Para la 0.9: la presentación de antes de entrar («¿Vendo Repsol?», «te dice qué hacer»); revisión de un abogado.

## Criterio de salida
- Un amigo cambia la contraseña en el móvil y el ordenador sigue abriendo sin pedirla.
- Otro «olvida» la contraseña y entra con su código.
- Una cuenta nueva no ve el Paso a paso; los amigos lo ven igual que hoy.
- La copia vieja ya no está en el repositorio.
