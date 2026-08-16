## 1. Infraestructura: volumen compartido y servicio de subida

- [x] 1.1 Elegir y fijar un tag de versión explícito de `gtstef/filebrowser` de la serie estable v1.5.x, en lugar de `latest`, para evitar un salto automático a la serie v2 que cambia la sintaxis de configuración
- [x] 1.2 Agregar a `compose.yml` los named volumes `mp3_storage` y `filebrowser_data`
- [x] 1.3 Agregar a `compose.yml` el servicio `filebrowser` con `restart: unless-stopped`, el volumen `filebrowser_data` en `/home/filebrowser/data`, el montaje de `mp3_storage` en `/srv` (que coincide con el `source` por defecto de la imagen) y el puerto publicado como `8080:80` (D2, D8)
- [x] 1.4 Pasar `FILEBROWSER_ADMIN_PASSWORD` al servicio `filebrowser` desde el entorno, siguiendo el mismo patrón que `DISCORD_TOKEN`, y documentarlo en el `.env` de ejemplo si existe
- [x] 1.5 Montar `mp3_storage` en el servicio `discord-bot` en `/app/mp3s` como solo lectura (D2)
- [x] 1.6 Replicar los cambios equivalentes en `compose.dev.yml`
- [x] 1.7 Definir la variable de entorno con la ruta de la carpeta local de mp3 (con `/app/mp3s` como valor por defecto) y pasarla al servicio del bot
- [x] 1.8 Levantar el compose y verificar que `filebrowser` lista el contenido de `mp3_storage` con la configuración por defecto de la imagen; si el named volume vacío en `/home/filebrowser/data` deja al servicio sin `config.yaml`, resolver cómo proveerlo sin bind mount (Open Question de `design.md`)
- [x] 1.9 Verificar que `filebrowser` (que corre como UID:GID 1000:1000) puede efectivamente escribir en `mp3_storage`, subiendo un archivo desde la UI
- [x] 1.10 Verificar que el mp3 subido desde la UI queda visible dentro del contenedor del bot en `/app/mp3s`

## 2. Modelo de datos y contrato de estrategias

- [x] 2.1 Agregar el discriminador `source: "youtube" | "local"` a `Song` en `src/music/types.ts`, junto con el campo necesario para identificar el archivo local
- [x] 2.2 Definir en `src/music/interfaces.ts` el contrato del resolver de estrategias por canción y el contrato de `LocalCatalogService`
- [x] 2.3 Actualizar `src/commands/audio/play.ts` para que las canciones encoladas por `url` y `query` se marquen con `source: "youtube"`

## 3. Catálogo local

- [x] 3.1 Crear `src/music/LocalCatalogService.ts` con lectura asíncrona (`fs.promises.readdir`) de la carpeta configurada, filtrando solo archivos `.mp3` de la raíz (sin recursión)
- [x] 3.2 Implementar la caché en memoria con lectura perezosa y TTL de 10 segundos, sin proceso de fondo (D4)
- [x] 3.3 Implementar el filtrado por texto sin distinción de mayúsculas sobre el nombre visible
- [x] 3.4 Implementar la resolución validada de un nombre de archivo contra las entradas conocidas, devolviendo la ruta solo ante coincidencia exacta (D6)
- [x] 3.5 Manejar carpeta vacía, inexistente o inaccesible devolviendo catálogo vacío y registrando el error, sin interrumpir el bot
- [x] 3.6 Agregar la constante de TTL y la ruta base del catálogo a `src/constants/audio.ts`

## 4. Estrategia de reproducción local

- [x] 4.1 Crear `src/music/LocalFileStrategy.ts` que implemente `AudioSourceStrategy` reproduciendo el archivo con un único proceso `ffmpeg`, usando `AUDIO_CONSTANTS.FFMPEG.MP3_ARGS`
- [x] 4.2 Implementar el manejo de errores del proceso y el `cleanup` del handle, siguiendo el criterio ya usado en `FFmpegService` pero sin la lógica de pipe entre dos procesos
- [x] 4.3 Aplicar el volumen por defecto al recurso de audio, igual que hace la estrategia de YouTube

## 5. Resolución de estrategia por canción

- [x] 5.1 Cambiar `MusicManager` para que deje de recibir una única `AudioSourceStrategy` y provea en su lugar la resolución por fuente
- [x] 5.2 Cambiar `GuildQueue` para que resuelva la estrategia dentro de `playNext()` según el `source` de la canción, en vez de usar la instancia fija del constructor
- [x] 5.3 Verificar que el manejo de errores existente sigue funcionando: si una canción falla al prepararse, se descarta y la cola continúa con la siguiente

## 6. Subcomando `/play local`

- [x] 6.1 Agregar el subcomando `local` al `SlashCommandBuilder` de `src/commands/audio/play.ts`, con una opción obligatoria marcada como autocompletable
- [x] 6.2 Implementar `play.autocomplete()` discriminando por `interaction.options.getSubcommand()`, filtrando el catálogo y respondiendo un máximo de 25 sugerencias
- [x] 6.3 Agregar la rama `local` en `play.execute()`: validar el valor contra el catálogo, construir el `Song` con `source: "local"` y rechazar con mensaje de error si no coincide
- [x] 6.4 Reutilizar el flujo existente de encolado: validación de canal de voz, creación de cola si no existe, `enqueue` y arranque de reproducción si estaba inactiva
- [x] 6.5 Agregar a `src/constants/messages.ts` los mensajes de error nuevos (archivo no disponible, catálogo vacío)

## 7. Visualización de la fuente en la cola

- [x] 7.1 Actualizar `AUDIO_MESSAGES.QUEUE.CURRENT_SONG` y `SONG_ITEM` en `src/constants/audio-messages.ts` para recibir el `source` y anteponer su indicador
- [x] 7.2 Actualizar `src/commands/audio/queue.ts` para pasar el `source` de cada canción al construir el listado

## 8. Verificación

- [x] 8.1 Ejecutar `tsc --noEmit` y corregir errores de tipos
- [x] 8.2 Desplegar los comandos actualizados y verificar en Discord que `/play local` ofrece sugerencias mientras se escribe
- [x] 8.3 Verificar reproducción de un mp3 local de punta a punta: selección, encolado y audio en el canal de voz
- [x] 8.4 Verificar una cola mixta: encolar una canción de YouTube y una local, y confirmar que la transición entre ambas ocurre automáticamente
- [x] 8.5 Verificar que `/queue` distingue correctamente la fuente de cada entrada
- [x] 8.6 Verificar el rechazo de un valor arbitrario en `/play local` (por ejemplo un intento de path traversal enviado sin pasar por la interfaz)
- [x] 8.7 Verificar que un mp3 subido con el bot corriendo aparece en el autocomplete sin reiniciar, dentro del margen del TTL

## 9. Documentación

- [x] 9.1 Documentar en `README.md` el volumen compartido, el servicio de subida y cómo acceder a su UI
- [x] 9.2 Documentar de forma prominente que definir `FILEBROWSER_ADMIN_PASSWORD` es un paso obligatorio del despliegue, dado que el puerto queda publicado en el host y la credencial por defecto de la imagen es `admin`/`admin` (D8)
- [x] 9.3 Actualizar la sección de features del `README.md` para mencionar la reproducción de mp3 locales
