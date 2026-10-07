# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Resttek: plataforma de gestión de restaurantes. Monorepo con **npm workspaces** (`packages/*`): una API (`api`), tres apps Angular 21 (`web-admin`, `web-empleados`, `web-clientes`) y una librería compartida (`web-shared`). La documentación y los textos de dominio están en español.

La documentación detallada está en `docs/` (`arquitectura/`, `dominio/`, `revisiones/`). Léela antes de cambios grandes; `docs/revisiones/` lista inconsistencias conocidas entre paquetes.

## Comandos

Todo se lanza desde la raíz:

```bash
npm install                # instala todos los workspaces
npm run seed               # puebla SQLite con datos de prueba (idempotente: INSERT OR IGNORE)
npm run dev:api            # API en :3000 (tsx watch)
npm run dev:admin          # :4200
npm run dev:empleados      # :4201
npm run dev:clientes       # :4202
npm test                   # solo tests de la API (Vitest)
```

- Un test concreto: `cd packages/api && npx vitest run src/path/to/file.test.ts` (o `-t "nombre del test"`). Modo watch: `npm run test:watch` dentro de `packages/api`.
- Build de un frontend: `npm run build -w @resttek/web-admin` (idem para los otros). No hay linter configurado ni tests en los frontends.
- Credenciales de prueba tras el seed: la contraseña de cada usuario es su propio email (p. ej. `admin@resttek.com`).
- `scripts/seed-issues.sh` crea issues de GitHub desde `scripts/issues.json` (requiere `gh` y `jq`; admite `--dry-run`). No tiene relación con la app.

## Arquitectura de la API (`packages/api`)

Express 5 + TypeScript, ESM, SQLite (`sqlite3`), JWT + bcrypt. Todo cuelga de `/api/v1` salvo `/health`.

**Conviven dos estilos; identifica cuál aplica antes de tocar código:**

1. **Hexagonal + DDD solo en `src/contexts/employee/`** (domain / application / infrastructure). `Employee` es la única entidad real (constructor privado + `create()`), con casos de uso de un solo método `execute()` e interfaces con prefijo `I` (`IEmployeeRepository`). `contexts/shared/` contiene el value object `Email`, los middlewares (`authenticate`, `authorize`) y el `errorHandler`.
2. **Por capas en `restaurant`, `dish`, `ingredient`, `order`**: carpetas transversales `models/`, `repositories/`, `services/`, `controllers/`, `routes/`, un fichero por dominio. Las entidades son `interface` planas; la validación vive en los servicios y en funciones `normalizeX()` de `models/`. La interfaz del repositorio no lleva prefijo `I` y está en el mismo fichero que su implementación Sqlite.

Puntos que requieren leer varios ficheros para entenderlos:

- **Cableado de dependencias**: se hace en los propios ficheros de rutas (`new Repo → new Service → new Controller`). Excepción: `employee`, que usa `contexts/employee/infrastructure/http/dependencies.ts`. Los routers bajo `/restaurants/:restaurantId/...` necesitan `Router({ mergeParams: true })`.
- **Errores**: `AppError` → errores en `errors/DomainErrors.ts`. El `errorHandler` decide el HTTP por el **nombre de la clase** (404 para los `*NotFoundError` listados allí, 401 `InvalidCredentialsError`, 400 el resto de `AppError`, 500 lo demás). Trampas: `OrderNotFoundError` no está en la lista de 404, y `OrderController` no usa `next(error)` (hace su propio try/catch), así que el mismo error da 404 en `GET /orders/:id` y 400 en el `PATCH` de estado.
- **Autorización de pedidos**: ninguna ruta de `orders` aplica `authorize()`; basta un JWT válido. `clientId` sale del JWT, no del body.
- **Pedidos**: al crear, las cantidades se expanden (`quantity: 3` → 3 filas de `order_items` con `quantity: 1`) para seguir el estado de cada unidad. `GET /orders/active` exige `?restaurantId=`.
- **Path aliases** (`@config`, `@errors`, `@shared`, `@employee`, `@models`, `@repositories`, `@services`, `@controllers`, `@routes`, `@scripts`) definidos en `tsconfig.json` (`baseUrl: ./src`); en tests los resuelve `vite-tsconfig-paths`. Los imports llevan extensión `.js` (ESM `nodenext`).
- **Base de datos**: `config/database.ts` exporta una instancia única `dbConfig`. Tablas creadas al arrancar (`CREATE TABLE IF NOT EXISTS`, sin sistema de migraciones). Fichero `packages/api/resttek.db`; con `NODE_ENV=test` usa `:memory:`. Las columnas snake_case se renombran a camelCase con alias en el SQL.
- **Tests**: unitarios, junto al código, con dobles en carpetas `mocks/`. No hay tests HTTP (`supertest` está instalado pero sin usar), así que rutas, middlewares y `errorHandler` no están cubiertos.

## Arquitectura de los frontends

Angular 21, standalone components, signals, zoneless (sin `zone.js`). Cada app hace proxy de `/api` a `localhost:3000` vía `proxy.conf.json`; `API_URL` vale `/api/v1`.

- **`web-shared`** se consume **directamente desde el fuente** (`main: src/index.ts`, sin compilar): auth (`AuthStore`/`AuthService`/`authGuard`), interceptors (`authInterceptor` añade Bearer; `errorInterceptor` limpia sesión en 401), `LoginComponent`, `RegisterComponent` y el token `API_URL`. Los cambios requieren reiniciar el dev server del frontend.
- **Estructura desigual**: `web-admin` y `web-empleados` usan `features/<feature>/{models,pages,services,store}` con el patrón Store (signals privadas + `asReadonly()`, servicios HTTP convertidos con `firstValueFrom`). `web-clientes` centraliza modelos y servicios en `core/`, y sus componentes llaman a los servicios con `.subscribe()`; su único store es `CartStore` (local).
- **Polling** (no hay websockets): `OrderStore` en empleados cada 30 s; en clientes, `my-orders` cada 10 s y `order-detail` cada 5 s con `setInterval`.
- **Roles**: el gerente es `'manager'` (no `'gerente'`); roles válidos: admin, manager, camarero, cocinero, cliente. El filtrado de menú por rol en `web-empleados` es solo de navegación; la autorización real está en la API.
- **Design system duplicado**: `web-shared/src/lib/styles/base.css` no lo importa nadie. Cada app tiene su copia en `src/styles.css` (la de empleados tiene 46 líneas propias extra). Un cambio de estilo común hay que replicarlo en las tres apps.
- `web-admin` y `web-empleados` importan `environment.apiUrl` directamente; `web-clientes` y el `AuthService` de `web-shared` inyectan `API_URL`.
