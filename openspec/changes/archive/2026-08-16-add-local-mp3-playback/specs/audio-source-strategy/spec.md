## ADDED Requirements

### Requirement: Identificación de la fuente de cada canción

Cada canción de la cola SHALL llevar un identificador de fuente que indique si su audio proviene de YouTube o de un archivo local.

#### Scenario: Canción encolada desde YouTube

- **WHEN** una canción se encola mediante `/play url` o `/play query`
- **THEN** la canción queda registrada con fuente YouTube

#### Scenario: Canción encolada desde el catálogo local

- **WHEN** una canción se encola mediante `/play local`
- **THEN** la canción queda registrada con fuente local

### Requirement: Resolución de la estrategia de reproducción por canción

El sistema SHALL resolver la estrategia de reproducción correspondiente a cada canción en el momento de reproducirla, según su fuente, en lugar de usar una única estrategia fija para toda la cola.

#### Scenario: Reproducción de una canción de YouTube

- **WHEN** llega el turno de reproducir una canción con fuente YouTube
- **THEN** se utiliza la estrategia de YouTube, que obtiene el audio mediante `yt-dlp` encadenado a `ffmpeg`

#### Scenario: Reproducción de una canción local

- **WHEN** llega el turno de reproducir una canción con fuente local
- **THEN** se utiliza la estrategia de archivo local, que reproduce el archivo directamente con un único proceso `ffmpeg`, sin invocar `yt-dlp`

#### Scenario: Cola con canciones de ambas fuentes

- **WHEN** la cola contiene una canción de YouTube seguida de una canción local
- **THEN** cada una se reproduce con su estrategia correspondiente y la transición entre ellas ocurre automáticamente, sin intervención del usuario

### Requirement: Contrato uniforme de recursos de audio

Todas las estrategias de reproducción SHALL exponer el mismo contrato hacia la cola, entregando un recurso de audio reproducible junto con su operación de limpieza, independientemente de cuántos procesos externos utilicen internamente.

#### Scenario: Limpieza al terminar una canción de YouTube

- **WHEN** finaliza o se interrumpe la reproducción de una canción de YouTube
- **THEN** se liberan todos los procesos externos involucrados en esa reproducción

#### Scenario: Limpieza al terminar una canción local

- **WHEN** finaliza o se interrumpe la reproducción de una canción local
- **THEN** se libera el proceso externo involucrado en esa reproducción

#### Scenario: Fallo al preparar una canción

- **WHEN** una canción no puede prepararse para reproducción, sea cual sea su fuente
- **THEN** se registra el error, esa canción se descarta y la cola continúa con la siguiente

### Requirement: Reproducción de archivos locales sin acceso a red

La estrategia de archivo local SHALL leer el audio directamente desde la carpeta compartida montada en el contenedor, sin realizar peticiones de red durante la reproducción.

#### Scenario: Reproducción de un archivo del catálogo

- **WHEN** se reproduce una canción con fuente local
- **THEN** el audio se obtiene del filesystem local y la reproducción no depende de la disponibilidad de servicios externos

### Requirement: Visualización de la fuente en la cola

El comando `/queue` SHALL mostrar, para cada canción listada, un indicador de su fuente además de su título.

#### Scenario: Cola con canciones de ambas fuentes

- **WHEN** un usuario ejecuta `/queue` y la cola contiene una canción de YouTube y una local
- **THEN** cada entrada se muestra con un indicador que permite distinguir su fuente

#### Scenario: Canción en reproducción

- **WHEN** un usuario ejecuta `/queue` y hay una canción reproduciéndose
- **THEN** esa entrada se muestra destacada como la canción actual e incluye igualmente el indicador de su fuente

#### Scenario: Cola vacía

- **WHEN** un usuario ejecuta `/queue` y no hay canciones en la cola
- **THEN** se responde el mensaje de cola vacía ya existente, sin cambios
