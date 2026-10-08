---
name: new-feature
description: Genera un plan de desarrollo con TDD estricto para una nueva feature de Resttek, pide aprobación al usuario, y si la aprueba la implementa en un git worktree. Avisa por Slack (MCP) al aceptarse el plan y al terminar la implementación, siempre con confirmación previa del usuario (aprobar, no enviar o editar) y con un mensaje de una sola frase. Úsala cuando el usuario pida una nueva feature, funcionalidad o endpoint.
argument-hint: <descripción de la feature>
---

# new-feature

Flujo en cuatro fases. No saltes ninguna ni cambies el orden.

La feature a desarrollar es: `$ARGUMENTS`. Si está vacía o es ambigua, pregunta al usuario con `AskUserQuestion` antes de planificar.

## Fase 1: Plan

1. Lee `CLAUDE.md` y los documentos relevantes de `docs/` (`arquitectura/`, `dominio/`, `revisiones/`).
2. Explora el código afectado. **Identifica qué estilo de la API aplica**: hexagonal/DDD (`contexts/employee/`) o por capas (`restaurant`, `dish`, `ingredient`, `order`). Sigue el estilo del código vecino, no mezcles.
3. Redacta el plan en español con estas secciones:
   - **Resumen y alcance** (qué entra y qué no).
   - **Paquetes y ficheros afectados** (rutas concretas, alias `@...` y extensión `.js` en imports).
   - **Ciclos TDD ordenados**: lista numerada de ciclos pequeños. Cada ciclo indica:
     - 🔴 **Red**: el test que se escribe primero (fichero, nombre, comportamiento que verifica).
     - 🟢 **Green**: el código mínimo para que pase.
     - 🔵 **Refactor**: limpieza posible sin romper tests.
   - **Riesgos y trampas** (p. ej. `errorHandler` decide el HTTP por nombre de clase; `OrderController` no usa `next`; cableado en ficheros de rutas; `mergeParams`; design system duplicado en las tres apps).
   - **Verificación final**: `npm test` y, si toca frontends, `npm run build -w @resttek/web-<app>`.
4. **Reglas de TDD estricto** que el plan debe respetar:
   - Ningún código de producción sin un test que falle antes por la razón correcta.
   - Un ciclo = un comportamiento. Primero se ve fallar el test, luego se escribe lo mínimo.
   - Capa API: tests unitarios Vitest junto al código, dobles en `mocks/`.
   - Los frontends no tienen infraestructura de tests. Si la feature toca frontends, indícalo en el plan como excepción explícita, mantén la lógica testable en la API y propón al usuario si quiere añadir tests de frontend (no los añadas sin su aprobación).

## Fase 2: Aprobación

1. Muestra el plan completo al usuario.
2. Pregunta con `AskUserQuestion` si el plan le parece bien. Opciones: aprobar, modificar, cancelar.
3. Si pide cambios, ajusta el plan y vuelve a preguntar. Si cancela, termina sin tocar nada.
4. **No implementes nada hasta tener aprobación explícita.**
5. Al recibir la aprobación, propón un aviso por Slack (ver sección "Notificaciones", que exige confirmación del usuario antes de enviar): una frase corta con la feature y que se inicia la implementación.

## Fase 3: Implementación en un worktree

1. Comprueba que el directorio es un repositorio git (`git rev-parse --is-inside-work-tree`). Si no lo es, **detente y avisa al usuario**: los worktrees requieren git. No hagas `git init` sin su permiso.
2. Crea el worktree con la herramienta `EnterWorktree` (carga su esquema con `ToolSearch` si hace falta), con una rama `feature/<slug-de-la-feature>`. Todos los cambios se hacen dentro de él, nunca en el árbol principal.
3. Ejecuta `npm install` en el worktree si no hay `node_modules`.
4. Ejecuta el baseline `npm test` y confirma que parte en verde. Si ya falla, informa al usuario antes de continuar.
5. Para **cada ciclo del plan**, en orden:
   1. Escribe solo el test (Red).
   2. Ejecútalo (`cd packages/api && npx vitest run <fichero>`) y **comprueba que falla por la razón esperada**. Si pasa o falla por otro motivo, corrige el test antes de seguir.
   3. Escribe el código mínimo (Green) y ejecuta de nuevo hasta que pase.
   4. Refactoriza si procede y ejecuta `npm test` completo.
6. Código y comentarios en inglés; textos de dominio y documentación en español.
7. Al terminar los ciclos: `npm test` completo en verde, builds de los frontends afectados, y revisa si hay que actualizar `docs/`.
8. Haz commit en la rama del worktree (mensajes claros, un commit por ciclo o agrupados de forma coherente). No hagas push ni abras PR salvo que el usuario lo pida.

## Fase 4: Cierre

1. Propón un aviso por Slack (con confirmación previa del usuario, ver "Notificaciones"): una frase corta que diga que la feature está implementada, sin detalles técnicos.
2. Informa al usuario en español con el resumen completo (feature, rama y ruta del worktree, resultado de los tests con nº y estado, desviaciones respecto al plan) y cómo integrar los cambios (merge de la rama, o `ExitWorktree` para conservarlo o eliminarlo; pregunta antes de borrar).

## Notificaciones por Slack

Se envían con el **MCP de Slack del proyecto** (`mcp__<servidor>__<herramienta>`; es un MCP propio que se está creando).

- Busca la herramienta con `ToolSearch` (por ejemplo la query `slack`). Cárgala antes de llamarla.
- **Mensaje corto**: una sola frase, en español, que diga solo la feature y el hito (`Plan aprobado` / `Implementación terminada`). Sin detalles técnicos de implementación (ficheros, ciclos TDD, ramas, rutas, nº de tests, etc.): solo la feature.
- **Confirmación previa obligatoria**: antes de **cada** envío a Slack, muestra al usuario el mensaje exacto y pregunta con `AskUserQuestion`. Opciones:
  - **Aprobar**: se envía tal cual.
  - **No enviar**: se omite el envío (salta el paso) y el flujo continúa sin avisar.
  - **Editar**: el usuario indica el nuevo texto (opción "Other" o petición posterior); muestra el mensaje editado y vuelve a pedir confirmación.
- **No envíes nada a Slack sin que el usuario haya aprobado ese mensaje concreto.**
- **Si el MCP no está disponible o la llamada falla**: no bloquees el flujo. Díselo al usuario claramente (no finjas que se envió) y continúa.
- No incluyas secretos, credenciales ni el email del usuario en los mensajes.

> TODO: cuando el MCP exista, fijar aquí el nombre exacto de la herramienta y el canal por defecto.
