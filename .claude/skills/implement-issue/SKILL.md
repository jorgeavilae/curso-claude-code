---
name: implement-issue
description: Implementa el plan de desarrollo ya publicado como comentario en una issue concreta de GitHub (generado antes con la skill new-feature), indicada por su número. Aplica TDD estricto, crea un git worktree para trabajar y hace un commit por cada tarea del plan. Si la feature afecta a varios agentes (paquetes), cada agente trabaja en su propio worktree. No planifica: si la issue no tiene plan, hay que ejecutar antes new-feature. Úsala cuando el usuario pida implementar el plan de una issue.
argument-hint: <número de issue>
---

# implement-issue

Esta skill **solo implementa** un plan existente. La planificación (y la publicación del plan en la issue) es cosa de `new-feature`.

La issue a implementar es: `$ARGUMENTS`.

Si está vacía o no es un número entero positivo, **detente y pide el número** con `AskUserQuestion`. No adivines ni elijas una issue por tu cuenta.

## Fase 1: Leer el plan

1. Comprueba que `gh` está disponible y autenticado (`gh auth status`). Si no, avisa al usuario y detente.
2. Lee la issue con sus comentarios: `gh issue view <n> --comments` (usa `--json title,body,state,comments` si necesitas procesarlo).
3. Localiza el **plan** entre los comentarios (suele tener tareas/ciclos TDD, ficheros y verificación). Si hay varios, usa el más reciente que sea un plan completo; si hay ambigüedad, pregunta cuál. Si no hay plan, **detente y díselo al usuario**: no inventes uno ni lo planifiques tú: indica al usuario que ejecute antes `/new-feature <n>`.
4. Lee `CLAUDE.md` y los `docs/` relevantes, y explora el código afectado. Identifica el estilo de la API que aplica (hexagonal en `contexts/employee/`, por capas en el resto) y sigue el del código vecino.
5. Extrae del plan una **lista numerada de tareas** (una por ciclo/comportamiento). Si una tarea es demasiado grande para un solo ciclo TDD, divídela y dilo.
6. Muestra al usuario un resumen breve: título de la issue, tareas, paquetes/agentes afectados. Si la issue está `CLOSED`, o el plan contradice el código actual, avísalo y pregunta antes de seguir.

## Fase 2: Worktree(s)

Determina qué **agentes** (paquetes) afecta el plan: `api`, `web-admin`, `web-empleados`, `web-clientes`, `web-shared`.

### Un solo agente afectado

1. Comprueba `git rev-parse --is-inside-work-tree`. Si no es repositorio git, detente y avisa (no hagas `git init`).
2. Crea el worktree con `EnterWorktree` (carga su esquema con `ToolSearch` si hace falta), rama `issue-<n>-<slug-corto>`. Todo el trabajo va dentro de él; nunca en el árbol principal.
3. `npm install` si falta `node_modules`, y baseline `npm test` en verde. Si ya falla, informa antes de continuar.

### Varios agentes afectados

1. Define las **tareas por agente** y las dependencias entre ellos. El contrato (p. ej. un endpoint de la API) se implementa antes que sus consumidores: lanza primero el agente de `api`/`web-shared` y después los frontends que dependan de él; los independientes pueden ir en paralelo.
2. Lanza **un subagente por agente/paquete** con la herramienta `Agent` y `isolation: "worktree"`, de modo que **cada uno trabaja en su propio git worktree** y su propia rama (`issue-<n>-<paquete>`). En el prompt de cada uno incluye: número y título de la issue, sus tareas del plan (texto íntegro), el contrato con los otros agentes, las reglas de la Fase 3 y la instrucción de hacer commit por tarea.
3. Cada subagente solo toca ficheros de su paquete. Si un cambio exige tocar otro paquete, que lo reporte en lugar de hacerlo.
4. Al terminar todos, **integra** (sin push) en un worktree de integración (`EnterWorktree`, rama `issue-<n>-<slug-corto>`): merge de las ramas de cada agente, resuelve conflictos y ejecuta `npm test` y los builds de frontends afectados.

## Fase 3: Implementación con TDD estricto

Aplica a quien implemente (tú o cada subagente). Para **cada tarea del plan, en orden**:

1. 🔴 **Red**: escribe solo el test. Ejecútalo (`cd packages/api && npx vitest run <fichero>`) y **comprueba que falla por la razón esperada** (no por error de import o sintaxis). Si pasa o falla por otro motivo, corrige el test antes de seguir.
2. 🟢 **Green**: escribe el código **mínimo** para que pase. Ejecuta de nuevo hasta verde.
3. 🔵 **Refactor**: limpia si procede y ejecuta `npm test` completo (todo en verde).
4. **Commit de la tarea**: un commit por tarea completada, con su test y su código juntos, siguiendo el comando `commit` (Conventional Commits, p. ej. `feat(api): ...`, con `Refs #<n>` en el cuerpo). No agrupes tareas en un commit ni dejes tareas sin commitear.

Reglas:

- Ningún código de producción sin un test previo que haya fallado. Un ciclo = un comportamiento.
- Tests API: Vitest junto al código, dobles en `mocks/`. Los frontends no tienen infraestructura de tests: la lógica testable va en la API y los frontends se verifican con `npm run build -w @resttek/web-<app>` tras cada tarea; no añadas tests de frontend sin aprobación del usuario.
- Respeta las trampas de `CLAUDE.md` (`errorHandler` por nombre de clase, `OrderController` sin `next`, cableado en ficheros de rutas, `mergeParams`, design system duplicado en las tres apps, `web-shared` sin compilar).
- Código y comentarios en inglés; documentación y textos de dominio en español.
- Si el plan es incorrecto o una tarea no se puede hacer como está escrita, detente en esa tarea, explica el motivo y pregunta; no te desvíes en silencio.

## Fase 4: Cierre

1. Verificación final: `npm test` completo y builds de los frontends afectados. Revisa si hay que actualizar `docs/`.
2. Comprueba con `git log --oneline` que hay un commit por tarea y que el árbol está limpio.
3. **No hagas push, PR ni comentarios en la issue** salvo que el usuario lo pida: son acciones visibles externamente.
4. Informa en español: issue implementada, tareas completadas (con su commit), rama(s) y ruta(s) de worktree, resultado de tests (nº y estado), desviaciones respecto al plan, y cómo integrar (merge, o `ExitWorktree` para conservar/eliminar; pregunta antes de borrar).
