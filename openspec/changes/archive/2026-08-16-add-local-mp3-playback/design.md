## Context

El bot solo reproduce audio vía YouTube (`yt-dlp` + `ffmpeg`, streaming efímero, sin nada persistido en disco). `AudioSourceStrategy` (`src/music/interfaces.ts`) ya existe como interfaz, pero `MusicManager` inyecta una única instancia (`ffmpegService`) que se propaga fija a cada `GuildQueue` — nunca se resuelve por canción, porque hasta ahora solo hay una fuente posible.

El deploy es Docker Compose de un solo host: dev corre en Windows con Docker Desktop (bind mounts traducidos vía WSL2/Hyper-V), prod corre en una VM completamente Linux (Docker Engine nativo, sin capa de traducción). Esta asimetría entre entornos es relevante para varias decisiones de este documento (ver `LocalCatalogService`).

`openspec/specs/` no tiene capacidades previas capturadas, así que no hay contratos existentes que romper a nivel de specs — el único **BREAKING** es interno (firma de constructor), sin impacto en comandos ni datos persistidos.

## Goals / Non-Goals

**Goals:**
- Permitir reproducir archivos `.mp3` de una carpeta compartida desde un nuevo subcomando `/play local`, con selección vía autocomplete nativo de Discord.
- Generalizar `AudioSourceStrategy` para que se resuelva **por canción** (`Song.source`) en vez de una sola vez por `GuildQueue`.
- Permitir subir mp3 dinámicamente sin reconstruir la imagen del bot ni versionar binarios en git.
- Mantener el camino de reproducción sin llamadas de red adicionales (todo disco local).

**Non-Goals:**
- Duración de canciones (no se trackea hoy para ninguna fuente).
- Subcarpetas/categorías en el catálogo (carpeta plana únicamente).
- Formatos de audio distintos a `.mp3`.
- Actualización instantánea del catálogo vía `fs.watch` (se opta por lectura perezosa con TTL, ver Decisiones).
- Autenticación/autorización del servicio de subida (`filebrowser`): el compose lo deja con su configuración por defecto y el README documenta que configurar credenciales es responsabilidad de quien despliega (ver D8).
- Comando de refresco manual del catálogo: el TTL de 10s en modo perezoso lo vuelve innecesario (ver D8).

## Decisions

### D1 - `/play local` como subcomando de `/play`, no un comando nuevo

Se suma `local` a los subcomandos ya existentes `/play url` y `/play query` dentro del mismo `SlashCommandBuilder`. `play.ts` gana una tercera rama en `execute()` y un handler `autocomplete()` que hoy no existe, el cual discrimina por `interaction.options.getSubcommand()`. Costo aceptado: el cooldown de `interaction-create.ts` (indexado por `command.data.name`) queda compartido entre los tres subcomandos en vez de ser independiente por cada uno.

**Alternativa descartada:** un comando independiente `/play-local` (el planteo original). Se descarta porque fragmenta el listado de comandos de Discord y rompe la consistencia con el patrón de subcomandos ya establecido en el repo; a cambio solo aportaría un cooldown propio, beneficio menor frente al costo de descubribilidad.

### D2 - Almacenamiento: volumen Docker compartido + `filebrowser` (Opción A)

Se agrega el servicio `filebrowser` con la imagen `gtstef/filebrowser` (`restart: unless-stopped`), que expone una UI web para subir mp3. Todos los volúmenes son **named volumes**, sin bind mounts al host:

- `mp3_storage`: volumen compartido entre ambos contenedores — montado en el bot (`/app/mp3s`, solo lectura) y en `filebrowser` (`/srv`, lectura/escritura). Es el único volumen que ambos servicios comparten.
- `filebrowser_data` (`/home/filebrowser/data`): estado interno del propio `filebrowser` (archivo de configuración, base de datos y caché), que el bot nunca toca.

Datos verificados contra la documentación y el Dockerfile oficiales del fork Quantum (`gtsteffaniak/filebrowser`), que difieren de la imagen original `filebrowser/filebrowser`:
- El contenedor escucha en el **puerto 80**, con un healthcheck cableado a ese puerto; se publica en el host mapeando `8080:80` sin cambiar el puerto interno.
- Su directorio de datos es **`/home/filebrowser/data`** (allí viven `config.yaml`, la base de datos y la caché). **No existe `/database`** en esta imagen: ese path pertenece a la imagen original, no a este fork — por eso se usa un único volumen de estado en lugar de dos.
- La configuración por defecto que trae la imagen ya declara `server.sources` con `path: "/srv"`, por lo que montar `mp3_storage` en `/srv` permite que el catálogo quede servido sin escribir un `config.yaml` propio. Esto es relevante porque los `sources` se definen por archivo de configuración y no por la UI, y ese archivo vive dentro del volumen de estado.
- El proceso corre **non-root como UID:GID 1000:1000**, lo cual importa para que pueda escribir en `mp3_storage`.

`LocalFileStrategy` lee el archivo directo del filesystem (`ffmpeg -i /app/mp3s/<archivo>`) sin ningún salto de red en el camino de reproducción, y sin agregar dependencias nuevas al bot. Montar `mp3_storage` como solo-lectura en el bot refuerza D6: el bot nunca escribe ni borra en el catálogo, solo `filebrowser` lo hace.

**Alternativas descartadas:**
- **Bind mounts a rutas del host** (`/ruta/host:/srv/mp3`): innecesario, ya que los mp3 y el estado de `filebrowser` se administran íntegramente vía su UI web y no requieren acceso directo desde el filesystem del host. Los named volumes además evitan diferencias de permisos y de rutas entre el entorno de dev (Windows) y el de prod (VM Linux).
- **MinIO** (S3-compatible): requiere SDK nuevo en el bot (`@aws-sdk/client-s3` o similar), credenciales, y un servicio con su propio volumen. Se descarta por complejidad no justificada para un deploy de un solo host; se justificaría si el bot escalara a múltiples instancias u hosts.
- **Backend propio** (API REST hecha a medida): mismo costo de integración que MinIO más el mantenimiento continuo de un servicio escrito por el proyecto.

### D3 - `LocalCatalogService`: catálogo plano, solo `.mp3`

El servicio escanea la carpeta compartida y expone una lista `{ fileName, displayName }` que consumen tanto el autocomplete como la validación en `execute`. Alcance inicial deliberadamente mínimo: sin recursión en subcarpetas y filtrando únicamente la extensión `.mp3`.

**Alternativa descartada:** catálogo recursivo con subcarpetas como categorías y whitelist de varias extensiones de audio. Se descarta por alcance: agrega decisiones abiertas (cómo mostrar la categoría, cómo resolver colisiones de nombre entre carpetas) sin necesidad demostrada todavía. Ambas extensiones son aditivas y no romperían el contrato del servicio, así que pueden incorporarse después sin cambiar cómo lo usa `play.ts`.

### D4 - Refresco de caché: lectura perezosa (read-through) con TTL de 10s, async desde el inicio

`getCatalog()` chequea si pasaron ≥10s desde la última lectura; si sí, hace `fs.promises.readdir(...)` (async, sin bloquear el event loop) y reemplaza la caché antes de devolverla; si no, devuelve la caché tal cual. No hay `setInterval` ni proceso de fondo: el refresco se dispara por demanda, solo cuando alguien realmente usa el comando. Esta lectura ocurre dentro del handler de `autocomplete`/`execute`, lo cual relaja la regla "cero I/O dentro del handler" planteada inicialmente pensando en un backend remoto (MinIO): un `readdir` a disco local tarda submilisegundos a pocos ms, muy por debajo del límite de 3s que exige Discord para responder una interacción de autocomplete — no hace falta debounce.

**Alternativas descartadas:**
- **Loop de refresco en segundo plano** (`setInterval` recurrente): agrega ciclo de vida a manejar (arranque, limpieza en shutdown) y sigue leyendo disco aunque nadie use el bot, sin ningún beneficio sobre la variante perezosa.
- **`fs.watch`/inotify para invalidación instantánea**: se descarta por complejidad, no por fiabilidad. La objeción original era que los bind mounts de Docker Desktop en Windows pierden eventos de `inotify` al cruzar la capa WSL2/Hyper-V; con la decisión de usar **named volumes** (D2) esa objeción ya no aplica, porque el volumen vive dentro del filesystem Linux del contenedor en ambos entornos y los eventos llegarían bien tanto en dev como en prod. Aun así se mantiene descartada: agrega un segundo mecanismo de invalidación (watcher + su manejo de errores y reinicio) que hay que mantener, para ahorrar como máximo 10s de latencia en un catálogo que cambia esporádicamente. Queda como mejora incremental si el retraso llegara a molestar en el uso real.

### D5 - `Song.source` + resolución de estrategia por canción

`Song` gana `source: "youtube" | "local"`. `MusicManager`/`GuildQueue` dejan de recibir una `AudioSourceStrategy` fija en el constructor y en su lugar resuelven la estrategia correspondiente al momento de reproducir cada canción (`playNext()`), según su `source`. `FFmpegService` (la estrategia de YouTube) mantiene su pipe-chain de dos procesos (`yt-dlp` → `ffmpeg`, stream efímero); `LocalFileStrategy` es un solo proceso `ffmpeg -i <path>` y usa la constante `FFMPEG.MP3_ARGS` que hoy está sin uso. El contrato `AudioResourceHandle { resource, cleanup }` no cambia: ya es lo bastante genérico para encapsular tanto el cleanup de dos procesos encadenados como el de uno solo.

**Alternativa descartada:** mantener una estrategia fija por `GuildQueue` y crear una cola separada por tipo de fuente. Se descarta porque impediría el requisito central de mezclar canciones de YouTube y locales en una misma cola con un flujo de reproducción único.

### D6 - Validación de seguridad en `execute`, no solo en autocomplete

`execute` de `/play local` resuelve el `fileName` recibido contra la caché de `LocalCatalogService` (whitelist) antes de construir cualquier path; si no matchea ninguna entrada conocida, se rechaza con un mensaje de error sin tocar el filesystem. Mismo criterio que ya aplica `sanitizeInput` a las URLs de YouTube. Como efecto secundario cubre la condición de carrera "el archivo sugerido por autocomplete fue borrado antes de ejecutar el comando": la validación falla igual y responde un error amigable en vez de que `ffmpeg` reviente sin contexto.

**Alternativa descartada:** confiar en el valor entregado por el autocomplete y construir el path directo con él (`path.join(baseDir, value)`). Se descarta porque el `value` de una opción de slash command es texto libre dentro del payload de la interacción: el autocomplete es solo una sugerencia de UI y nada impide enviar un valor arbitrario (por ejemplo, un intento de path traversal) directo a la API, salteándose la interfaz.

### D7 - `/queue` muestra la fuente por canción

`AUDIO_MESSAGES.QUEUE.CURRENT_SONG`/`SONG_ITEM` pasan a recibir el `source` del `Song` y anteponen un indicador al título (por ejemplo 📺 YouTube / 💽 Local), de modo que en una cola mixta se distinga el origen de cada entrada.

**Alternativa descartada:** dejar `/queue` sin indicar la fuente, mostrando solo el título. Se descarta porque con colas mixtas dos entradas de igual nombre serían indistinguibles y se pierde información útil sobre por qué una canción podría comportarse distinto (por ejemplo, fallar por red en el caso de YouTube).

### D8 - Exposición y operación de `filebrowser`: puerto publicado, auth documentada, sin refresco manual

La UI de `filebrowser` se expone publicando su puerto en el host desde el compose (`8080:80`), accesible por `IP-de-la-VM:8080`, sin depender de un reverse proxy. Tampoco se agrega ningún comando de refresco manual del catálogo.

Sobre la autenticación: la imagen arranca con credenciales por defecto **`admin` / `admin`** y no existe un sistema genérico de override por variables de entorno (el `config.yaml` es el método principal), pero sí se soporta la variable **`FILEBROWSER_ADMIN_PASSWORD`** específicamente para la contraseña del admin. Dado que el puerto queda publicado, el compose referencia esa variable desde el entorno (`${FILEBROWSER_ADMIN_PASSWORD}`) siguiendo exactamente el mismo patrón que ya usa `DISCORD_TOKEN`: el repo no contiene el secreto, y quien despliega debe definirlo en su `.env`. Se prefiere la variable de entorno sobre poner `auth.adminPassword` en el `config.yaml`, porque la documentación advierte que ese valor **reinicia la contraseña en cada arranque**.

**Alternativas descartadas:**
- **Detrás de un reverse proxy** (Dokploy/Traefik u otro): evita publicar puertos y permite TLS y dominio propio, pero ata este cambio a una pieza de infraestructura externa que el compose del repo no define, y que cada quien despliega distinto.
- **Solo red interna, sin publicar puerto**: máxima seguridad por defecto, pero obliga a túnel SSH o `docker exec` para cada subida, lo cual contradice el objetivo de "subir mp3 dinámicamente" de forma cómoda.
- **Dejar la autenticación en su valor por defecto sin intervención**: era el planteo inicial ("documentar, no configurar"), pero se ajusta al verificar que el default de la imagen es `admin`/`admin` y que el puerto queda publicado en el host. Referenciar `${FILEBROWSER_ADMIN_PASSWORD}` desde el entorno mantiene el espíritu de la decisión (el repo no contiene secretos, la responsabilidad sigue siendo de quien despliega) sin dejar una contraseña trivial por omisión.
- **Deshabilitar la autenticación** (`auth.methods.noauth: true`): soportado por la imagen, pero su propia documentación desaconseja usarlo en cualquier despliegue expuesto; incompatible con publicar el puerto en el host.
- **Comando de refresco manual del catálogo** (por ejemplo `/play local` con una opción, o un comando admin que fuerce `LocalCatalogService.refresh()`): con TTL de 10s el retraso máximo es imperceptible en la práctica; agregarlo sería superficie de comando sin necesidad demostrada. Queda como mejora incremental si el retraso llegara a molestar.

## Risks / Trade-offs

- **[Risk]** `filebrowser` queda publicado en un puerto del host y su credencial por defecto es `admin`/`admin`: si la VM es alcanzable desde internet y no se define contraseña, cualquiera podría subir o borrar archivos → **Mitigación**: el compose exige `${FILEBROWSER_ADMIN_PASSWORD}` desde el entorno (D8) y el README lo documenta como paso obligatorio del despliegue; el bot monta `mp3_storage` como solo-lectura, así que el peor caso afecta el catálogo pero nunca da escritura al bot. Si el riesgo no es aceptable en un despliegue dado, no publicar el puerto y usar un reverse proxy con TLS es un cambio aislado de compose.
- **[Risk]** El tag `latest` de `gtstef/filebrowser` sigue el canal estable (hoy la serie v1.5.x) y la sintaxis de su configuración cambia en la serie v2 (por ejemplo, el puerto se mueve de `server.port` a `http.port`): cuando v2 pase a estable, un pull automático podría romper la configuración → **Mitigación**: fijar un tag de versión explícito en vez de `latest`, y no usar `pull_policy: always` en este servicio, de modo que la actualización sea una decisión deliberada. El estado vive en `filebrowser_data`, aislado de `mp3_storage`, así que una falla del servicio de subida nunca afecta la reproducción.
- **[Risk]** `filebrowser` corre como UID:GID 1000:1000 y necesita escribir en `mp3_storage`; según cómo Docker inicialice el volumen, el propietario podría no permitirlo → **Mitigación**: verificar la escritura real subiendo un archivo desde la UI como parte de las tareas de infraestructura, antes de dar por buena la configuración.
- **[Risk]** Cooldown compartido entre `/play url`, `/play query` y `/play local` al ser subcomandos del mismo `data.name` → **Mitigación**: el cooldown por defecto es bajo (3s); si se vuelve un problema real, es una mejora incremental aislada, no bloquea este cambio.
- **[Risk]** Catálogo grande (cientos de archivos) podría hacer perceptible el filtrado por substring en cada tecleo → **Mitigación**: fuera de escala esperada para un bot personal; si crece, es optimización futura sin cambiar el contrato de `LocalCatalogService`.
- **[Risk]** Cambio de firma en el constructor de `MusicManager`/`GuildQueue` (BREAKING interno) → **Mitigación**: no hay API pública ni estado persistido que dependa de esa firma; se actualiza completo en el mismo cambio, sin necesidad de migración.
- **[Risk]** Los mp3 viven en un named volume administrado por Docker, no en una ruta del host: hacer backup o cargar archivos en lote es menos directo que copiar a una carpeta → **Mitigación**: la UI de `filebrowser` cubre el flujo de subida esperado; para backup puntual sigue disponible `docker run --rm -v mp3_storage:/data ...` o `docker cp`. Si el uso en lote se vuelve frecuente, agregar un bind mount después es un cambio aislado de compose.

## Migration Plan

Cambio aditivo: no hay datos persistidos que migrar (las colas son en memoria y efímeras por guild). El despliegue implica:
1. Publicar la nueva versión de la imagen del bot junto con los cambios de `compose.yml`/`compose.dev.yml` (named volumes `mp3_storage`, `filebrowser_db`, `filebrowser_config` + servicio `filebrowser`) en el mismo despliegue, ya que el bot espera que `mp3_storage` exista.
2. Definir `FILEBROWSER_ADMIN_PASSWORD` en el `.env` del despliegue antes del primer arranque, junto a las variables de Discord ya existentes.
3. Verificar en el primer arranque que `filebrowser` sirve el contenido de `mp3_storage` y que puede escribir en él, y subir los primeros mp3 vía su UI, ya que el volumen arranca vacío.
4. Rollback: revertir a la imagen/compose anterior; `mp3_storage` conserva los archivos subidos y el código viejo simplemente lo ignora, así que no hay pérdida de datos al volver atrás.

## Open Questions

- ¿La configuración por defecto de la imagen (que sirve `/srv`) queda efectivamente disponible al montar un named volume vacío en `/home/filebrowser/data`, o hace falta proveer un `config.yaml` propio? Depende de cómo Docker inicialice ese volumen a partir del contenido de la imagen; se resuelve verificándolo en el primer arranque (tarea 1.7). Si hiciera falta un `config.yaml` propio, habría que decidir cómo entregarlo sin bind mount (por ejemplo, escribiéndolo una vez dentro del volumen).
- ¿Qué versión concreta de `gtstef/filebrowser` fijar? Conviene un tag explícito en lugar de `latest`, dado que la sintaxis de configuración difiere entre la serie v1.5.x (estable actual) y la v2.
