# SuperLista — MVP de listas de supermercado

Laravel 12 + Inertia/React (Breeze) + MySQL + spatie/laravel-permission,
con **app móvil React Native (Expo)** en `mobile/` que consume la API REST (Sanctum).

## Correr el proyecto

Con **Valet** ya configurado: entrá directo a **http://lista-supermercado.test** ✨
(el PHP default de la terminal ya es 8.5; si una terminal vieja muestra 8.1, corré `source ~/.zshrc`).

```bash
# MySQL (Homebrew) tiene que estar corriendo
brew services start mysql@8.0

# Alternativa a valet:
php artisan serve

# Frontend en desarrollo (opcional; ya hay build de producción en public/build)
npm run dev

# Scheduler para listas recurrentes (en otra terminal)
php artisan schedule:work
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
(el teléfono no resuelve `.test`) y levantá `php artisan serve --host=0.0.0.0`.

## App móvil (React Native + Expo)

```bash
cd mobile
npm install

# En el teléfono (Expo Go) — el backend tiene que escuchar en la red local:
php artisan serve --host=0.0.0.0 --port=8000
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
