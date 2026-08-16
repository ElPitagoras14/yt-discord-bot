# CLAUDE.md

## Idioma

- Responder siempre en español, incluyendo el contenido de artefactos de OpenSpec (proposal, design, specs, tasks).
- Mantener en inglés los encabezados de sección de los artefactos (`## Why`, `## What Changes`, `## Capabilities`, `### New Capabilities`, `### Modified Capabilities`, `## Impact`, etc.) y los tokens estructurales que las herramientas parsean literalmente (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`, `### Requirement:`, `#### Scenario:`, `WHEN`/`THEN`).
- Mantener también en inglés otras palabras/términos importantes: nombres de capacidades (kebab-case), identificadores de código, nombres de archivos/servicios, y palabras clave como `BREAKING`. El texto descriptivo alrededor de esos términos va en español.

## Git

- No hacer commit después de cada cambio individual. Agrupar cambios relacionados y commitear solo cuando el usuario lo pida explícitamente.
- No incluir `Co-Authored-By: Claude` ni ninguna línea de coautoría en los mensajes de commit.
- Al aplicar un change de OpenSpec (`/opsx:apply`), trabajar siempre desde una rama nueva creada a partir de `main` actualizada (hacer `git pull` de `main` antes de crear la rama). No implementar directamente sobre `main` ni configurar la rama nueva con upstream hacia `main`.

## Build

- No ejecutar `pnpm build` ni `tsc` después de cada cambio. Solo verificar compilación con `tsc --noEmit` cuando sea necesario para validar tipos.
