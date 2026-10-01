# SuperLista — MVP de listas de supermercado

Laravel 12 + Inertia/React (Breeze) + MySQL + spatie/laravel-permission,
con **app móvil React Native (Expo)** en `mobile/` que consume la API REST (Sanctum).

## Correr el proyecto

Todo en Docker (OrbStack). La base `superlista` está en el **MySQL compartido de la Mac**
(`~/Sites/mysql`, `localhost:3306`, root sin contraseña).

```bash
(cd ~/Sites/mysql && docker compose up -d)   # una vez; después arranca solo con OrbStack
docker compose up -d --build                 # web + API en :8000 y scheduler de listas recurrentes

# Comandos de Laravel, adentro del contenedor
docker compose exec app php artisan migrate

# Frontend: los assets compilados están en public/build. Tras tocar JSX:
npm run build        # o `npm run dev` para desarrollo (Node de Homebrew)
```

App en http://localhost:8000

## Usuarios demo

| Email | Password | |
|---|---|---|
| demo@superlista.test | password | Dueño de "Compra semanal" (recurrente cada 7 días) |
| ana@superlista.test | password | Editora de "Compra semanal", dueña de "Asado del sábado" |

También se pueden registrar usuarios nuevos en `/register`.

## Features

- **Listas de compras** con ítems (producto + cantidad), progreso y creación de productos al vuelo.
- **Compartir listas** con usuarios específicos por email, con roles por lista usando
  spatie/laravel-permission en modo *teams* (`team_id` = id de la lista):
  - `list-owner`: ver, editar, compartir, eliminar
  - `list-editor`: ver y editar
  - `list-viewer`: solo lectura
- **Despensa (stock)**: qué tenés y cuánto, con mínimo configurable; debajo del mínimo queda "En falta".
- **Modo súper** 🛒: botones grandes "✓ Lo tengo" / "✗ No hay" para marcar mientras comprás.
  Marcar comprado suma la cantidad a tu despensa (y desmarcar la resta).
- **Recomendaciones de dónde comprar**: cargás tus tiendas con productos y precios; el sistema
  junta tus faltantes (despensa bajo mínimo + ítems pendientes de tus listas) y rankea las
  tiendas por cobertura y precio total estimado.
- **Listas recurrentes**: al crear/editar una lista podés setear "repetir cada X días".
  El comando `superlista:process-recurring` (agendado a las 06:00) resetea los ítems a
  pendiente y reprograma la próxima fecha.

## Arquitectura

- `app/Services/ListSharing.php` — asignación de roles spatie con contexto de team por lista.
- `app/Services/StoreRecommender.php` — cálculo de faltantes y ranking de tiendas.
- `app/Policies/ShoppingListPolicy.php` — autorización vía permisos spatie (`view-list`,
  `edit-list`, `share-list`, `delete-list`) evaluados en el team de la lista.
- `app/Console/Commands/ProcessRecurringLists.php` — reset de listas recurrentes.
- Páginas React en `resources/js/Pages/` (Dashboard, Lists, Pantry, Stores, Recommendations).

## Geolocalización, ofertas y carrito online

- **Tiendas con ubicación**: coordenadas por tienda (botón "📍 Estoy acá" al crearla) y
  distancia desde tu ubicación en las recomendaciones (`?lat=&lng=`, haversine en `Store::distanceTo`).
- **Supermercados cercanos (API real)**: `GET /api/stores/nearby?lat=&lng=&radius=` busca súper
  reales alrededor tuyo y los agregás con un toque. Usa **Google Places** si definís
  `GOOGLE_MAPS_API_KEY` en el `.env` (recomendado en producción: mejores datos, horarios y rating);
  sin key cae a **OpenStreetMap/Overpass** (gratis, sin registro). Servicio en
  `app/Services/NearbyStores.php`, resultados cacheados 15 min.
- **Ofertas**: `sale_price` + `sale_ends_at` por producto/tienda. Las recomendaciones usan el
  precio vigente y muestran sección "Ofertas activas" con % de descuento.
- **Carrito online (v1)**: desde una lista, copia/comparte lo pendiente y abre la web del súper
  (campo `website` por tienda). La v2 (carrito automático + push) está en `ROADMAP.md`.

Ver **`ROADMAP.md`** para el backlog completo de ideas (UX, negocio, monetización, seguridad).

## Perfil, imágenes, gastos y mapa

- **Fotos de perfil, categorías y productos**: subidas al disco público y achicadas con
  `spatie/image` (`app/Services/ImageStorage.php`, avatares 256px, productos 512px).
- **Gastos compartidos (splitwise)**: cada miembro anota lo que gastó en la lista; el total se
  divide en partes iguales y `app/Services/ExpenseSplitter.php` simplifica deudas
  ("Ana le tiene que dar $3000 a Demo").
- **Amigos**: `GET /api/friends` (gente con la que compartís listas) + chips de acceso rápido al compartir.
- **Mapa**: web con Leaflet/OpenStreetMap en Tiendas (markers + agregar desde popup);
  app con react-native-maps (solo iOS/Android; en web se ve la lista).
- **Secciones Categorías y Productos** (menú del avatar en la web) con foto/ícono.

⚠️ Para probar la app en el teléfono con imágenes: poné `APP_URL=http://TU-IP-LAN:8000` en `.env`
(el contenedor ya escucha en toda la red local en el puerto 8000).

## App móvil (React Native + Expo)

```bash
cd mobile
npm install

# En el teléfono (Expo Go): con el backend en Docker (puerto 8000) alcanza
npx expo start            # escanear el QR con Expo Go

# En el navegador (para desarrollo rápido):
npx expo start --web
```

La app detecta sola la IP de tu máquina (usa el `hostUri` de Expo), así que si el
backend corre en la misma compu que `expo start`, funciona sin configurar nada.

- **API**: `routes/api.php` + `app/Http/Controllers/Api/*` (tokens Sanctum, mismos
  services y policies que la web).
- **App**: `mobile/src/app/` con expo-router — login, tabs (Listas, Despensa,
  Comprar, Tiendas) y detalle de lista con modo súper (updates optimistas).

## Seeds

`php artisan db:seed` crea roles/permisos, usuarios demo, productos, tiendas con precios,
despensa y listas compartidas de ejemplo.

## Tests

```bash
docker compose exec app php artisan test
```

Usan SQLite en memoria (`phpunit.xml` con `<server force>`), nunca la base de desarrollo.

Corre toda la suite (sqlite en memoria, no toca tu base de datos) — correrla
antes de cada commit para saber que nada se rompió. Cubre:

- **`tests/Feature/Api/`**: todos los endpoints de la API, agrupados por recurso
  (auth y cuenta pre-armada, productos con canónicos, categorías, despensa,
  listas, ítems, compartir, tiendas, cercanos con HTTP fakeado, recomendaciones,
  home, perfil, gastos). Incluye los casos de permisos (403/404 sobre recursos
  ajenos) y de normalización ("LECHE" ≡ "leche").
- **`tests/Feature/Web/`**: smoke de todas las páginas Inertia + acciones web clave.
- **`tests/Feature/EndToEndFlowTest.php`**: recorrido completo de dos usuarios
  (registro → lista compartida → compra → despensa → gastos → recomendaciones).

Para correr un solo archivo: `php artisan test --filter=ListItemApiTest`.
