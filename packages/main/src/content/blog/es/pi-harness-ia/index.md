---
title: 'Pi, el arnés de IA donde vivo, y lo que arregló la 1.4.0'
description: 'Uso Pi a diario dentro de un contenedor Docker. La 1.4.0 no añade funciones nuevas: arregla las molestias de cada día, y eso es justo lo que quería.'
pubDate: 2026-11-01T12:00:00.000Z
lang: es
cover: './cover.webp'
coverAlt: 'Pi, el arnés de IA donde vivo, y lo que arregló la 1.4.0'
categories: ['ia']
tags: ['pi', 'ia', 'herramientas', 'desarrollo']
translationKey: 'pi-ai-harness'
draft: false
math: false
author: 'Jose Maldonado "Yukiteru Amano"'
---

Hay herramientas que pruebo una tarde y desinstalo sin pena. Pi no es una de ellas. Llevo meses abriéndolo cada mañana dentro de un contenedor Docker, con un proyecto montado y el resto de mi disco invisible para él, y en ese tiempo ha pasado de experimento a la forma en que trabajo. El 21 de octubre de 2026 publicó la versión 1.4.0, once días antes de que escriba esto, y su [registro de cambios](https://pi.dev/changelog/releases/1.4.0) cuenta algo poco habitual en un lanzamiento: casi todo lo que trae son arreglos.

Lo que me enganchó no es una lista de funciones que marcar en una hoja de cálculo. Es la forma del arnés, la capa que pone herramientas, contexto y permisos alrededor del modelo: extensiones y servidores MCP para conectar lo que falta, codemode para agrupar llamadas dentro de un script, compactación que mantiene viva una sesión larga y una interfaz de terminal que se comporta como tal. Si esa capa está mal pensada, el mejor modelo del mundo resulta incómodo de usar.

La 1.4.0 no cambia el producto. Arregla la terminal que quedaba sucia al salir, la compactación que fallaba con razonamientos largos y los scripts en paralelo que se rendían sin hueco libre. Nada de eso luce en una diapositiva y todo se nota cada día. Escribo esto como opinión personal, con lo que me gusta, lo que me cuesta y sin disfrazar el lanzamiento de lo que no es.

## Cómo lo uso cada día

Pi vive en un contenedor, no en mi sistema. Lo ejecuto con [pi-dockerized](/proyectos/pi-dockerized), un fork de opencode-dockerized que migré a Pi ([código en GitHub](https://github.com/yukiteruamano/pi-dockerized)), y el modelo de aislamiento ya lo conté en [Docker y agentes de IA](/blog/docker-agentes-ia-aislados/). El contenedor corre con mi UID y mi GID, sin `sudo` y sin capacidades, y el agente solo ve el directorio del proyecto que le monto.

Hay un detalle de diseño que explica por qué lo elegí. Pi no trae un sistema de permisos propio, así que la política se aplica desde una extensión de seguridad guardada en la imagen y montada en solo lectura. Las extensiones son Pi Packages instaladas con `pi install` que viven en el host, también en lectura: una sesión no puede añadirse capacidades a sí misma y un rebuild no vuelve a descargarlas.

El día a día se parece al que ya describí para otros agentes: construir, autenticar, arrancar y trabajar. La diferencia está dentro. `pi-dockerized audit` lista las llamadas que el guard bloqueó, `doctor` revisa el guard, las credenciales y el reenvío de SSH y GPG, y cada sesión imprime una línea con lo que puede alcanzar. Cuando algo falla, miro ahí antes de suponer nada.

```sh
curl -fsSL https://raw.githubusercontent.com/yukiteruamano/pi-dockerized/master/install.sh | bash
pi-dockerized build
pi-dockerized auth
pi-dockerized run ~/proyectos/mi-app
pi-dockerized audit
```

## Lo que 1.4.0 arregla de verdad

Los cinco arreglos que más he notado caben en una tabla, y ninguno es una función que puedas enseñar en una demo. Son las cosas que me hacían perder un minuto varias veces por semana.

| Molestia diaria                       | Qué cambió la 1.4.0                            |
| ------------------------------------- | ---------------------------------------------- |
| Dos scripts de codemode a la vez      | Esperan hasta 60 s a un worker libre           |
| Compactación en sesiones largas       | Los resúmenes usan el límite del modelo        |
| Terminal sucia tras un cierre anómalo | Pi restaura ratón, foco y pantalla             |
| `grep` que dejaba de ser regex        | Ejecuta `rg --no-config`                       |
| Dos diálogos de extensión a la vez    | El segundo ya no pierde la promesa del primero |

La compactación es la pieza que decide si una sesión larga sigue viva o se rompe, y hasta esta versión los resúmenes tenían un tope fijo de salida. Cuando el modelo se pasaba razonando, la compactación moría con el mensaje «generation hit the token cap» y el turno quedaba a medias. Ahora los resúmenes usan el límite de salida del modelo, y `compaction.reserveTokens` se queda con un solo trabajo: marcar cuándo empieza la compactación.

Codemode es la parte que uso para trabajo por lotes, porque un script puede encadenar varias llamadas a herramientas sin pedirme permiso veinte veces. Su límite eran dos workers y fallaba en cuanto estaban ocupados, algo que pasaba con scripts en paralelo o con subagentes dentro del mismo proceso. Desde la 1.4.0 esos scripts esperan hasta 60 segundos a que quede un worker libre, y `PI_CODEMODE_MAX_WORKERS` sube el techo de dos.

El resto de la lista es más silencioso, y precisamente por eso importa más. Son fallos que no aparecen en una captura de pantalla pero que te arruinan la tarde entera y te obligan a reiniciar la sesión.

Rex suma en esta versión soporte de terminal: enlaces OSC 8, truecolor e imágenes inline. El arreglo de salida merece mención aparte, porque no se nota hasta que falta. Si Pi se cerraba sin su secuencia normal de limpieza, la terminal se quedaba en modo de seguimiento del ratón, con informes de foco y teclado Kitty activos, y el prompt se llenaba de secuencias de escape que había que limpiar a mano.

El caso de los diálogos concurrentes sí me tocó a diario. Si abrías un segundo diálogo de extensión, el primero desaparecía y su promesa no se resolvía nunca, así que el flujo quedaba colgado en silencio y tocaba reiniciar la sesión para recuperarlo.

Otros arreglos son pequeños y muy específicos. Una sesión reanudada o una navegación por `/tree` podía dejar las herramientas de extensión inactivas. Una llamada a herramienta cortada por el límite de salida rompía todas las peticiones posteriores de esa sesión. `/compact` con instrucciones las ignoraba cuando la compactación partía un turno. Un `mcp.json` o un `managed-install.json` que empezara con BOM de UTF-8 fallaba al parsear, y el BOM aparece de verdad porque Windows PowerShell 5.1 lo escribe al reescribir el fichero.

Tres detalles que parecían menores y me tocaron de cerca. El `grep` seguía a `RIPGREP_CONFIG_PATH`, así que un `--fixed-strings` en la configuración de ripgrep convertía una búsqueda por regex en literal sin avisar. La exportación a HTML mostraba asteriscos literales en negritas y cursivas junto a puntuación CJK. Un bloque `$$` sin cerrar se tragaba todas las tablas Markdown que vinieran detrás.

## Lo que todavía me cuesta

La superficie de configuración sigue siendo la parte incómoda. `models.json` está mejor documentado desde esta versión, con una referencia generada desde su propio esquema que cubre cada proveedor, cada modelo, cada override y cada campo de compatibilidad, pero que esa referencia exista también dice algo: hay mucho que aprender antes de tener el arnés a tu gusto. Yo lo he ido montando a base de copiar lo que funcionaba y de leer errores.

Las extensiones son la otra factura. La 1.4.0 arregla rutas de importación que las rompían y cambia quién ve las cabeceras de atribución: los handlers `before_provider_headers` ya no reciben las de OpenRouter, NVIDIA NIM y OpenCode. Cambios razonables que te obligan a releer tu propia extensión.

También están los modelos por defecto, que cambian sin que yo haga nada. El de GitHub Copilot pasó a `gpt-6.1-sol` porque Copilot retiró `gpt-5.4`, el de NVIDIA a `nvidia/nemotron-3.5-super-vl-120b-a12b` y el de Xiaomi a `mimo-v2.6-pro`. Ninguno es malo, pero si tenías una preferencia en la cabeza, ya no es la que arranca.

## Por qué el pulido pesa más que una función nueva

Mi argumento es que un arnés se juzga por la fricción, no por el catálogo. He cambiado de herramienta dos veces no porque le faltara una función, sino porque me hacía perder tiempo en cosas tontas. La 1.4.0 no presume de nada nuevo: arregla la terminal, la compactación, la cola de codemode y unos cuantos parseos. Nada de eso se presenta como novedad, y todo se nota en la primera sesión larga.

Esa elección tiene un coste y lo digo claro. Un lanzamiento de pulido no atrae a nadie nuevo y no da titulares. A cambio, la herramienta que ya uso pierde esa clase de sorpresas, que es todo lo que le pido a estas alturas.

## El arnés que me quedo

Sigo abriendo Pi cada mañana y sigo sin echarlo de menos cuando trabajo en otra cosa. Lo que me convence no es una versión concreta sino la sensación de que el arnés está cuidado: extensiones que se pueden quitar y poner, codemode que aguanta una tanda de llamadas, compactación que no se cae y una terminal que vuelve limpia. La 1.4.0 no cambió mi forma de trabajar; la hizo menos frágil.

Si ya usas Pi, esta versión te va a ahorrar las molestias que yo venía sufriendo. Si no lo usas, no te va a conquistar por sí sola. Lo que sí sostengo es que en un arnés que abres a diario, el pulido es la función que más se usa.

Actualiza, revisa tus extensiones y sigue programando dentro de la caja.
