## Why

Hoy el bot solo puede reproducir audio resuelto vía YouTube (con `yt-dlp` + `ffmpeg`). No hay forma de reproducir mp3 propios del usuario (canciones que no están en YouTube, o que se prefiere no transmitir desde ahí). Agregar esto de forma directa es incómodo por dos razones concretas ya encontradas en el código: `AudioSourceStrategy` se inyecta una sola vez por `GuildQueue`/`MusicManager` en vez de resolverse por canción, y el `StringSelectMenu` de Discord (usado hoy en `/play query`) tiene un tope duro de 25 opciones sin filtro de texto — inviable para un catálogo de mp3 que crezca.

## What Changes

- Se agrega un nuevo subcomando `/play local` (junto a los ya existentes `/play url` y `/play query`) que usa **autocomplete** nativo de Discord (ya soportado por el framework de comandos pero sin usar hasta ahora) para buscar y elegir del catálogo local de mp3 mientras el usuario escribe.
- Se agrega un `LocalCatalogService` que escanea una carpeta compartida y plana de archivos `.mp3` y cachea la lista en memoria, refrescada por polling con TTL (sin `fs.watch`, por la conocida falta de fiabilidad de inotify en bind mounts de Docker Desktop).
- Se agrega un `LocalFileStrategy` que implementa `AudioSourceStrategy` y reproduce un archivo del catálogo directo con un solo proceso `ffmpeg -i <path>` (sin `yt-dlp`, sin pipe-chain) — usando por fin la constante `FFMPEG.MP3_ARGS` que ya existía sin uso.
- **Se generaliza la resolución de la estrategia de reproducción**: `Song` gana un discriminador `source: "youtube" | "local"`, y `GuildQueue`/`MusicManager` resuelven el `AudioSourceStrategy` **por canción** al momento de reproducir, en vez de recibir una sola estrategia fija para toda la cola. **BREAKING** (solo interno): el constructor de `MusicManager`/`GuildQueue` pasa de recibir un `strategy` único a un resolver de estrategias; no hay cambios en la API pública ni de cara al usuario.
- `/queue` ahora muestra la fuente de cada canción (por ejemplo, un emoji/etiqueta que distingue YouTube de local) junto al título.
- Se agrega un nuevo servicio tipo `filebrowser` a `compose.yml`/`compose.dev.yml` que comparte un volumen de Docker con el contenedor del bot, para poder subir mp3 dinámicamente vía interfaz web sin reconstruir la imagen ni versionar binarios en git.
- Seguridad: el archivo elegido vía autocomplete en `/play local` se revalida en el momento de ejecutar el comando contra el catálogo en memoria (whitelist) antes de construir cualquier path de filesystem — nunca se confía en el input crudo del usuario, siguiendo el mismo criterio que ya aplica `sanitizeInput` a las URLs de YouTube.

Fuera de alcance para este cambio: duración de las canciones (no se registra hoy para ninguna de las dos fuentes), subcarpetas/categorías en el catálogo de mp3 (solo carpeta plana), y formatos de audio distintos a mp3.

## Capabilities

### New Capabilities
- `local-mp3-catalog`: escaneo y cacheo de una whitelist de archivos `.mp3` desde una carpeta compartida, refrescada por polling con TTL, expuesta para búsqueda/filtrado.
- `play-local-subcommand`: el subcomando `/play local`, su comportamiento de autocomplete sobre el catálogo, y la validación en el momento de ejecutar antes de encolar.
- `audio-source-strategy`: resolución de la estrategia de reproducción por canción (YouTube vs local) y visibilización de la fuente de cada canción en `/queue`.

### Modified Capabilities
_Ninguna — `openspec/specs/` no tiene capacidades existentes capturadas para el comportamiento actual de reproducción, así que no hay nada contra lo cual hacer delta; todo lo anterior se captura como specs nuevas._

## Impact

- **Código**: `src/music/interfaces.ts`, `src/music/types.ts` (`Song.source`), `src/music/GuildQueue.ts`, `src/music/MusicManager.ts`, `src/music/FFmpegService.ts` (se mantiene como la estrategia de YouTube), nuevos `src/music/LocalFileStrategy.ts` y `src/music/LocalCatalogService.ts`, `src/commands/audio/play.ts` (nuevo subcomando `local` + autocomplete handler), `src/commands/audio/queue.ts`, `src/constants/audio-messages.ts`, `src/constants/audio.ts` (ahora usa `MP3_ARGS`).
- **Infraestructura**: `compose.yml` y `compose.dev.yml` ganan un volumen de Docker compartido y un servicio tipo `filebrowser`; `Dockerfile` no se ve afectado (sin dependencias nativas nuevas con la Opción A).
- **Dependencias**: ninguna nueva en el bot en sí (la Opción A evita agregar un SDK de S3/MinIO o un backend propio).
- **Documentación**: `README.md` necesita una sección sobre cómo montar el volumen compartido y usar la interfaz de subida.
