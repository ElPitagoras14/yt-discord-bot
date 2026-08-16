# local-mp3-catalog Specification

## Purpose

Escaneo y cacheo de una whitelist de archivos `.mp3` desde una carpeta compartida, releída de forma perezosa al vencer un TTL, expuesta para búsqueda/filtrado y para la resolución validada de un archivo antes de construir cualquier ruta del filesystem.

## Requirements

### Requirement: Descubrimiento de archivos del catálogo local

El sistema SHALL exponer un catálogo de los archivos de audio disponibles en la carpeta local compartida, listando únicamente archivos con extensión `.mp3` ubicados directamente en la raíz de esa carpeta.

#### Scenario: Carpeta con archivos mp3

- **WHEN** la carpeta compartida contiene `cancion-a.mp3` y `cancion-b.mp3`
- **THEN** el catálogo incluye ambos archivos, cada uno con su nombre de archivo y su nombre visible

#### Scenario: Archivos con extensión no soportada

- **WHEN** la carpeta compartida contiene `cancion.mp3`, `podcast.m4a` y `notas.txt`
- **THEN** el catálogo incluye únicamente `cancion.mp3`

#### Scenario: Subcarpetas presentes

- **WHEN** la carpeta compartida contiene un archivo `cancion.mp3` en la raíz y una subcarpeta `rock/` con `otra.mp3` dentro
- **THEN** el catálogo incluye únicamente `cancion.mp3` y no desciende a la subcarpeta

#### Scenario: Carpeta vacía

- **WHEN** la carpeta compartida no contiene ningún archivo `.mp3`
- **THEN** el catálogo resulta una lista vacía y no se produce ningún error

#### Scenario: Carpeta inexistente o inaccesible

- **WHEN** la carpeta compartida no existe o no puede leerse
- **THEN** el catálogo resulta una lista vacía, se registra el error en el log, y el bot continúa operando sin interrumpir otras funciones

### Requirement: Caché del catálogo con lectura perezosa y TTL

El sistema SHALL cachear en memoria el resultado del último escaneo y SHALL releer la carpeta únicamente cuando se solicite el catálogo y hayan transcurrido al menos 10 segundos desde la última lectura. El sistema MUST NOT ejecutar un proceso de refresco en segundo plano.

#### Scenario: Solicitudes consecutivas dentro del TTL

- **WHEN** se solicita el catálogo dos veces separadas por menos de 10 segundos
- **THEN** la carpeta se lee del filesystem una sola vez y la segunda solicitud se responde desde la caché

#### Scenario: Solicitud posterior al vencimiento del TTL

- **WHEN** se solicita el catálogo habiendo transcurrido 10 segundos o más desde la última lectura
- **THEN** la carpeta se relee del filesystem y la caché se reemplaza con el resultado nuevo

#### Scenario: Archivo agregado mientras el bot está corriendo

- **WHEN** se sube un archivo `nuevo.mp3` a la carpeta compartida y luego se solicita el catálogo con el TTL ya vencido
- **THEN** el catálogo incluye `nuevo.mp3` sin necesidad de reiniciar el bot

#### Scenario: Archivo eliminado mientras el bot está corriendo

- **WHEN** se elimina un archivo de la carpeta compartida y luego se solicita el catálogo con el TTL ya vencido
- **THEN** el catálogo deja de incluir ese archivo

### Requirement: Lectura no bloqueante del filesystem

El sistema SHALL leer la carpeta compartida mediante una operación asíncrona, sin bloquear el event loop de Node.

#### Scenario: Lectura del catálogo durante el refresco

- **WHEN** se dispara una relectura de la carpeta por vencimiento del TTL
- **THEN** la lectura se realiza de forma asíncrona y el bot puede seguir atendiendo otras interacciones mientras se completa

### Requirement: Búsqueda de archivos por texto

El sistema SHALL permitir filtrar el catálogo por un texto de búsqueda, devolviendo las entradas cuyo nombre visible contenga ese texto sin distinguir mayúsculas de minúsculas.

#### Scenario: Búsqueda con coincidencias

- **WHEN** el catálogo contiene `Bohemian Rhapsody.mp3` y `Radio Gaga.mp3` y se busca el texto `rap`
- **THEN** el resultado incluye `Bohemian Rhapsody.mp3` y no incluye `Radio Gaga.mp3`

#### Scenario: Búsqueda sin distinción de mayúsculas

- **WHEN** el catálogo contiene `Bohemian Rhapsody.mp3` y se busca el texto `BOHEMIAN`
- **THEN** el resultado incluye `Bohemian Rhapsody.mp3`

#### Scenario: Búsqueda sin coincidencias

- **WHEN** se busca un texto que no coincide con ninguna entrada del catálogo
- **THEN** el resultado es una lista vacía

#### Scenario: Búsqueda con texto vacío

- **WHEN** se busca con un texto vacío
- **THEN** el resultado incluye todas las entradas del catálogo

### Requirement: Resolución validada de un archivo del catálogo

El sistema SHALL proveer una operación que resuelva un nombre de archivo recibido contra las entradas conocidas del catálogo, devolviendo la entrada correspondiente solo si coincide exactamente con una de ellas. El sistema MUST NOT construir rutas del filesystem concatenando valores no validados.

#### Scenario: Nombre de archivo presente en el catálogo

- **WHEN** se resuelve el nombre `cancion.mp3` y el catálogo lo contiene
- **THEN** se devuelve la entrada correspondiente con su ruta dentro de la carpeta compartida

#### Scenario: Nombre de archivo ausente del catálogo

- **WHEN** se resuelve un nombre que no figura en el catálogo
- **THEN** no se devuelve ninguna entrada y no se accede al filesystem con ese valor

#### Scenario: Intento de path traversal

- **WHEN** se resuelve un valor como `../../etc/passwd` o `subcarpeta/archivo.mp3`
- **THEN** no se devuelve ninguna entrada, porque el valor no coincide con ninguna entrada conocida del catálogo
