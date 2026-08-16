# play-local-subcommand Specification

## Purpose

El subcomando `/play local`, su comportamiento de autocomplete sobre el catálogo local, y la validación en el momento de ejecutar antes de encolar la canción.

## Requirements

### Requirement: Subcomando `/play local`

El comando `/play` SHALL ofrecer un subcomando `local` con una opción de texto obligatoria para elegir un archivo del catálogo local, junto a los subcomandos ya existentes `url` y `query`.

#### Scenario: Subcomando disponible

- **WHEN** un usuario escribe `/play` en un servidor de Discord
- **THEN** Discord ofrece los subcomandos `url`, `query` y `local`

#### Scenario: Contexto restringido a servidores

- **WHEN** un usuario intenta usar `/play local` fuera de un servidor
- **THEN** el comando no está disponible, igual que el resto de subcomandos de `/play`

### Requirement: Sugerencias de autocomplete sobre el catálogo

El subcomando `/play local` SHALL responder a las interacciones de autocomplete de Discord con sugerencias tomadas del catálogo local, filtradas por el texto que el usuario haya escrito, y SHALL limitar la respuesta a un máximo de 25 sugerencias.

#### Scenario: Usuario escribe texto parcial

- **WHEN** el usuario escribe `boh` en la opción de `/play local` y el catálogo contiene `Bohemian Rhapsody.mp3`
- **THEN** Discord muestra `Bohemian Rhapsody.mp3` entre las sugerencias

#### Scenario: Catálogo con más de 25 coincidencias

- **WHEN** el texto escrito coincide con 40 archivos del catálogo
- **THEN** la respuesta contiene exactamente 25 sugerencias, respetando el límite de Discord

#### Scenario: Sin coincidencias

- **WHEN** el texto escrito no coincide con ningún archivo del catálogo
- **THEN** se responde una lista vacía de sugerencias, sin error

#### Scenario: Catálogo vacío

- **WHEN** el catálogo local no contiene ningún archivo
- **THEN** se responde una lista vacía de sugerencias, sin error

#### Scenario: Autocomplete no afecta a otros subcomandos

- **WHEN** el usuario escribe en las opciones de `/play url` o `/play query`
- **THEN** no se ofrecen sugerencias de autocomplete, ya que esas opciones son de texto libre

### Requirement: Validación del archivo al ejecutar el comando

Al ejecutar `/play local`, el sistema SHALL resolver el valor recibido contra el catálogo local antes de encolar la canción, y SHALL rechazar la ejecución con un mensaje de error si el valor no corresponde a un archivo conocido del catálogo.

#### Scenario: Archivo válido del catálogo

- **WHEN** el usuario ejecuta `/play local` con un valor que corresponde a un archivo presente en el catálogo
- **THEN** la canción se encola y se confirma al usuario

#### Scenario: Valor arbitrario enviado sin pasar por la interfaz

- **WHEN** se ejecuta `/play local` con un valor que no figura en el catálogo, por ejemplo un intento de path traversal
- **THEN** el sistema responde un mensaje de error, no encola nada y no accede al filesystem con ese valor

#### Scenario: Archivo eliminado entre la sugerencia y la ejecución

- **WHEN** el usuario selecciona un archivo sugerido por autocomplete pero ese archivo ya fue eliminado del catálogo al momento de ejecutar
- **THEN** el sistema responde un mensaje de error indicando que el archivo no está disponible, en lugar de fallar durante la reproducción

### Requirement: Encolado con el mismo flujo de reproducción

Una vez validado el archivo, `/play local` SHALL agregar la canción a la cola del servidor usando el mismo flujo que los subcomandos existentes, creando la cola si no existe e iniciando la reproducción si la cola estaba inactiva.

#### Scenario: Primera canción del servidor

- **WHEN** un usuario en un canal de voz ejecuta `/play local` y no existe cola para ese servidor
- **THEN** se crea la cola, se encola la canción y comienza la reproducción

#### Scenario: Cola ya reproduciendo

- **WHEN** un usuario ejecuta `/play local` mientras la cola está reproduciendo otra canción
- **THEN** la canción se agrega al final de la cola y la reproducción en curso no se interrumpe

#### Scenario: Usuario fuera de un canal de voz

- **WHEN** un usuario que no está en un canal de voz ejecuta `/play local`
- **THEN** el sistema responde el mismo mensaje de error que ya usan los demás subcomandos de `/play` y no encola nada
