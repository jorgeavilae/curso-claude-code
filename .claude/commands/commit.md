---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: [pista opcional sobre el tipo o el alcance]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git init:*), Bash(echo:*)
---

## Contexto

- Estado actual: !`git status --short`
- Cambios (staged y unstaged): !`git diff HEAD 2>/dev/null || git diff --cached`
- Rama actual: !`git branch --show-current`
- Últimos commits (para seguir el estilo del repo): !`git log --oneline -10 2>/dev/null || echo "(sin commits todavía)"`

## Tarea

Crea **un único commit** con los cambios actuales siguiendo [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/).

Pista del usuario (puede estar vacía): $ARGUMENTS

### Formato

```
<tipo>(<alcance opcional>)<!>: <descripción>

<cuerpo opcional>

<pie opcional>
```

### Tipos permitidos

- `feat`: nueva funcionalidad
- `fix`: corrección de un error
- `docs`: solo documentación
- `style`: formato, sin cambios de lógica
- `refactor`: cambio de código que no corrige ni añade funcionalidad
- `perf`: mejora de rendimiento
- `test`: añadir o corregir tests
- `build`: sistema de build o dependencias
- `ci`: configuración de integración continua
- `chore`: tareas de mantenimiento que no tocan `src` ni tests
- `revert`: revierte un commit anterior

### Reglas

1. La descripción va en minúsculas, en imperativo, sin punto final y con un máximo de ~72 caracteres en la primera línea.
2. El alcance (opcional) es el módulo o capa afectada, por ejemplo `auth`, `vendehumos`, `db`.
3. Si hay un cambio incompatible, añade `!` tras el tipo/alcance y un pie `BREAKING CHANGE: <explicación>`.
4. El cuerpo explica el **porqué**, no el qué. Omítelo si el cambio es trivial.
5. Si los cambios mezclan varios propósitos distintos, avisa al usuario y propón dividirlos en varios commits en lugar de forzar uno solo.
6. No incluyas archivos que probablemente contengan secretos (`.env`, credenciales, `data/*.db`). Avisa si los detectas.
7. Nunca uses `--no-verify`, `--amend` ni `git push`, salvo que el usuario lo pida explícitamente.
8. Si el repo no tiene commits todavía, usa `chore: initial commit` (o el mensaje que indique el usuario si respeta el formato). Si no hay repo git, ejecuta `git init` antes.
9. Termina el mensaje de commit con esta línea de atribución, separada por una línea en blanco:

   `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

### Pasos

1. Analiza los cambios del contexto y decide el tipo, el alcance y la descripción.
2. Si no hay nada en staging, añade solo los archivos relevantes con `git add <archivos>` (evita `git add .` a ciegas).
3. Ejecuta `git commit` pasando el mensaje con un heredoc para respetar los saltos de línea.
4. Muestra al usuario el mensaje final del commit y el resultado de `git status`.

Si no hay cambios que commitear, dilo y no hagas nada más.
