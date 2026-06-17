# CLAUDE.md

## Git

- No hacer commit después de cada cambio individual. Agrupar cambios relacionados y commitear solo cuando el usuario lo pida explícitamente.
- No incluir `Co-Authored-By: Claude` ni ninguna línea de coautoría en los mensajes de commit.

## Build

- No ejecutar `pnpm build` ni `tsc` después de cada cambio. Solo verificar compilación con `tsc --noEmit` cuando sea necesario para validar tipos.
