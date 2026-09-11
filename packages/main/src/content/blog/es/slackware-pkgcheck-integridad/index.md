---
title: 'slackware-pkgcheck, integridad verificada para Slackware Linux'
description: 'Creé slackware-pkgcheck para auditar Slackware Linux, recorre los paquetes instalados, detecta ficheros perdidos y librerías rotas. Explico cómo funciona.'
pubDate: 2026-09-11T20:38:56.013Z
lang: es
categories: ['software']
tags: ['personal', 'desarrollo']
cover: './cover.webp'
coverAlt: ''
translationKey: 'slackware-pkgcheck-integrity'
draft: false
math: false
author: 'Jose Maldonado "Yukiteru Amano"'
---

Hace unas semanas publiqué la primera versión estable de [slackware-pkgcheck](https://github.com/yukiteruamano/slackware-pkgcheck), una herramienta que verifica que todos los ficheros registrados por los paquetes de Slackware existan de verdad en el disco. La versión actual llega con 320 pruebas automatizadas y un 98% de cobertura de código, y también está disponible en [PyPI](https://pypi.org/project/slackware-pkgcheck/).

## ¿Por qué Slackware necesita un verificador de integridad?

Slackware es la distribución Linux viva más antigua y también la más honesta sobre lo que es. No resuelve dependencias automáticamente, no esconde nada detrás de capas de abstracción y confía en que el administrador sabe lo que hace. Esa filosofía tiene un precio. Cuando algo se rompe en silencio, por ejemplo un fichero borrado por error, una desinstalación a medias o una actualización que pisó un directorio, el sistema no te avisa. Te enteras cuando el programa falla.

Otras distribuciones tienen respuestas parciales. Los sistemas basados en RPM verifican con `rpm -V`, Debian compara con `debsums` y Gentoo reconstruye dependencias rotas con `revdep-rebuild`. Slackware, en cambio, guarda un registro completo de cada paquete instalado en `/var/log/packages/`, con una sección `FILE LIST` que enumera cada fichero, y nadie la estaba explotando de forma sistemática. Ese registro era un inventario sin auditor. La diferencia es importante. Tener la lista de lo que debería existir y no comprobarla nunca equivale a no tenerla. El inventario, por fin, bajo vigilancia.

Creé esta herramienta por una razón práctica. Administro sistemas Slackware y quería responder a una pregunta simple con una respuesta fiable. ¿Sigue intacto todo lo que instalé? Quería la respuesta en segundos, paquete por paquete, sin falsos positivos que me hicieran perder tardes enteras.

## ¿De dónde sabe cada paquete qué ficheros instaló?

Cada paquete instalado deja un fichero de texto en `/var/log/packages/`. Dentro hay una sección `FILE LIST` con las rutas de todo lo que el paquete colocó en el sistema. El primer problema técnico fue leer eso a escala. Un sistema Slackware completo acumula miles de paquetes y cientos de miles de rutas. Abrir cada registro desde Python, uno por uno, funciona pero es lento.

La solución fue delegar la extracción masiva en `ripgrep`. Un solo proceso recorre todo el directorio y emite, de una pasada, cada ruta bajo cada `FILE LIST`, etiquetada con su paquete. Si `rg` no está instalado, la herramienta usa un lector Python puro más lento pero funcional. Esa decisión resume una filosofía que mantuve en todo el proyecto. Rápido por defecto, funcional siempre.

El lector no traga sin masticar. Los registros reales tienen peculiaridades. Los nombres con bytes no ASCII vienen escapados en octal (`\NNN`), algunos paquetes de terceros añaden secciones como `REQUIRES` después de la lista, y hay entradas que nunca existen en disco aunque todo esté bien. Los scripts de `install/` son metadatos del paquete, no ficheros instalados. Los nodos de `dev/` o las rutas de `sys/` y `proc/` son efímeros por naturaleza. Todo eso se filtra antes de verificar nada, y se cuenta por separado para que el informe sea transparente sobre lo que se excluyó y por qué.

## ¿Cómo comprueba miles de ficheros sin eternizarse?

La verificación usa un grupo de hilos que lanza llamadas `lstat` en paralelo. El detalle del `lstat` frente al `stat` habitual no es casual. `lstat` no sigue el enlace final, así que un enlace simbólico roto cuenta como presente. Y tiene razón de ser. El enlace existe físicamente en el disco. Si su destino falta, eso es un problema de dependencias, no de integridad de ficheros, y la herramienta lo trata en otra fase.

Cada ruta recibe uno de seis estados. Existe, falta, solo queda copia de seguridad, sin acceso, pendiente de revisión o error de verificación. La gracia está en que faltar no siempre significa lo mismo, y el informe distingue los matices en lugar de volcar una lista plana de ausencias.

Slackware tiene una convención propia para los ficheros de configuración que complica el análisis ingenuo. Un paquete registra `foo.conf.new` y su script de instalación lo renombra a `foo.conf`, salvo que ese fichero ya exista, en cuyo caso conserva el sufijo `.new` para que el administrador revise el cambio pendiente. La herramienta respeta esa semántica al pie de la letra. Si el `.new` sigue en disco, lo marca como pendiente de revisión. Si solo existe la versión renombrada, todo está bien. Si no hay rastro de ninguna, entonces sí falta. Del mismo modo, si la ruta registrada no existe pero hay una variante `.bak` u `.orig`, se informa como solo-respaldo en vez de perdida. Son distinciones pequeñas que evitan sustos grandes.

| Estado           | Significado                         | Qué hacer             |
| ---------------- | ----------------------------------- | --------------------- |
| Existe           | El fichero está en disco            | Nada                  |
| Falta            | No hay rastro de la ruta registrada | Reinstalar el paquete |
| Solo respaldo    | Existe variante `.bak` u `.orig`    | Revisar la copia      |
| Pendiente `.new` | Nueva configuración sin revisar     | Comparar y decidir    |
| Sin acceso       | Requiere privilegios de root        | Repetir con `sudo`    |
| Error            | Falló la propia comprobación        | Investigar el caso    |

## ¿Cómo detecta librerías rotas?

La comprobación de integridad responde si los ficheros están. La segunda pregunta, igual de incómoda, es si los binarios funcionan. Un ejecutable presente pero con una librería dinámica ausente falla al arrancar, y eso no lo detecta ningún `lstat`. Para ese caso añadí un modo opcional inspirado en el `revdep-rebuild` de Gentoo. Con `--check-libs-deps`, la herramienta ejecuta `ldd` sobre cada binario y librería ELF del sistema, en paralelo, y anota toda dependencia marcada como `not found`.

Aquí tomé una decisión de seguridad consciente. `ldd` ejecuta el cargador dinámico sobre el objetivo, así que solo debe usarse en instalaciones de confianza. Por eso el modo es opt-in, el entorno se sanea (se fijan variables de idioma y se limpian `LD_LIBRARY_PATH`, `LD_PRELOAD` y compañeras que podrían secuestrar la carga) y el manual lo advierte sin rodeos. Un paso más allá, `--check-libs-symbols` usa `nm -D` para buscar símbolos indefinidos que ninguna librería instalada provee, con la advertencia honesta de que produce falsos positivos por enlace tardío y carga dinámica. Prefiero una herramienta que avisa de sus límites que una que finge certeza. La comodidad nunca gana a la seguridad.

El informe agrupa los binarios rotos por paquete e intenta adivinar qué paquete debería proveer cada librería ausente comparando sonames. Esa atribución es aproximada por diseño. Cuando el nombre no coincide con nada instalado, lo dice claramente en vez de inventar un culpable.

## ¿Cómo se usa en la práctica?

La instalación usa `uv` y la ejecución normal pide root, porque hay ficheros protegidos que solo root puede comprobar. Sin privilegios, la herramienta lo advierte y verifica solo lo accesible en lugar de fallar.

```sh
uv sync
sudo uv run pkgcheck
sudo uv run pkgcheck --json
sudo uv run pkgcheck --check-libs-deps
uv run pkgcheck --orphans --orphans-root /
uv run pkgcheck --diff --from latest --to /var/log/pkgcheck/pkgcheck-....json --json
```

Cada ejecución guarda un log automático en `/var/log/pkgcheck/`, en texto o JSON, con escritura atómica y permisos `0644`. El modo `--orphans` invierte la pregunta. En vez de buscar lo registrado que falta, recorre el disco buscando ficheros que ningún paquete reclama, como restos de un `make install` manual. Y `--diff` compara dos ejecuciones para ver qué cambió entre ambas, algo útil después de una actualización grande.

La 1.0.0 salió a finales de agosto de 2026 con el motor de dependencias `ldd`, y la 1.0.2 de septiembre de 2026 consolidó la calidad con 320 pruebas. La primera auditoría tarda minutos.

La interfaz habla siete idiomas y detecta el del sistema automáticamente. Parece un detalle cosmético, pero una herramienta de administración que solo habla inglés deja fuera a mucha gente que administra servidores.

## ¿Qué decisiones de diseño sostienen la herramienta?

Detrás de cada comprobación hay decisiones que no se ven en el informe pero determinan si puedes fiarte de él. La primera es la validación defensiva de entradas. Todas las rutas, sufijos y prefijos que acepta la herramienta pasan por validadores dedicados antes de tocar el sistema de ficheros o un subproceso. Incluso los tipos están elegidos con intención. Los validadores aceptan `object` en vez de `str` para que los chequeos de tipo sean significativos también para analizadores estáticos. Parece un tecnicismo, pero es la diferencia entre defenderse de verdad y aparentarlo.

La segunda es el trato con los privilegios. Algunas rutas solo se pueden comprobar como root. Si la ejecutas sin ellos en una terminal interactiva, te pregunta si quieres relanzarla con `sudo`. Con `--elevate` lo hace sin preguntar y con `--no-elevate` se limita a lo accesible y avisa. Nada de fallos crípticos ni de pedir root para operaciones que no lo necesitan.

Sin fricción innecesaria.

La tercera es la escritura de logs. Cada informe se escribe de forma atómica mediante fichero temporal y renombrado, con permisos `0644` explícitos. Si dos ejecuciones colisionan en el mismo segundo, se añade un sufijo único en vez de sobrescribir. Son detalles aburridos hasta el día en que salvan una auditoría.

En el plano técnico, el proyecto se somete a una disciplina poco común en utilidades pequeñas. Reglas estrictas de lint, tipado estático estricto, 320 pruebas con un 98% de cobertura, auditoría de dependencias y hooks de pre-commit. No es postureo. Cuando una herramienta pide `sudo` y recorre tu sistema de ficheros, la calidad del código forma parte de su contrato de confianza.

## ¿Qué límites tiene la herramienta?

Conviene ser claro sobre lo que no hace. No comprueba contenidos, solo existencia. Un fichero corrupto con el nombre correcto pasa el filtro. No es un sistema de detección de intrusos. Tampoco verifica firmas ni compara hashes contra un origen confiable. Su trabajo es responder una pregunta concreta. ¿Coincide el disco con el inventario?

El modo de símbolos indefinidos, como ya dije, puede generar falsos positivos. El escaneo de huérfanos excluye directorios enteros como `home/` para no ahogarse en ruido. Y el análisis completo con `ldd` sobre todo el sistema es caro, por eso es opcional. Cada límite está documentado en el propio proyecto. Una herramienta honesta sobre sus fronteras resulta más útil que una ambiciosa que calla las suyas.

El JSON merece una nota aparte. Sus claves son estables y nunca se traducen, así que puedes programar auditorías nocturnas por cron y comparar semanas distintas sin romper nada. Las salidas contemplan el modo silencioso para que la automatización nunca tenga que parsear prosa humana.

## Lo que Slackware me enseñó sobre la confianza

Slackware confía en el administrador y a cambio le exige atención. Esta herramienta nació de esa misma lógica. No pretende sustituir el criterio de quien administra, sino darle ojos donde antes solo había fe. Un inventario auditado, un informe que distingue matices y unos límites declarados sin vergüenza.

Si administras Slackware, pruébala. El código está abierto, la instalación lleva minutos y el primer informe suele deparar alguna sorpresa. Después de todo, para eso existen las auditorías. Para encontrar lo que dabas por sentado.

Audita, informa y se aparta.
