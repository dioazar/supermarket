# SuperLista — Roadmap de ideas y mejoras

Brainstorm iterativo (2026-07). ✅ = implementado en este MVP · 🔜 = próximo paso natural · 💡 = idea a validar

## 1. UX / Diseño

- ✅ Mobile-first en web y app, con navegación inferior tipo app en el celular.
- ✅ Modo súper con botones grandes y updates optimistas (funciona con mala señal).
- 🔜 **Modo offline real**: cola de cambios local (SQLite/AsyncStorage) que sincroniza al volver la señal. En un súper con sótano esto es la diferencia entre usable e inservible.
- 🔜 **Ordenar la lista por góndola**: categorías ordenables por tienda (primero verdulería, después lácteos…) para recorrer el súper sin zigzaguear.
- 🔜 Autocompletado con historial personal: "leche" sugiere la marca/cantidad que siempre comprás.
- 🔜 Agregar por voz ("agregá 2 kilos de tomate") y por foto del ticket (OCR) para cargar stock post-compra en un toque.
- 💡 Código de barras: escanear producto para agregarlo a lista/despensa (expo-camera + Open Food Facts).
- 💡 Widget de pantalla de inicio (iOS/Android) con la lista activa.
- 💡 Modo "compra en pareja": dos personas en el mismo súper, la lista se divide en vivo y se ve quién agarra qué (websockets/Pusher).
- 💡 Dark mode y accesibilidad (tamaños de fuente, contraste AA).

## 2. Funcionalidades

- ✅ **Geolocalización**: tiendas con coordenadas, distancia desde tu ubicación y "cerca tuyo" en recomendaciones.
- ✅ **Descubrimiento de supermercados cercanos**: Google Places (con API key) o OpenStreetMap/Overpass (sin key) → alta de tienda con un toque.
- ✅ **Ofertas**: precio promocional con vencimiento por producto/tienda; las recomendaciones usan el precio vigente y muestran las ofertas activas.
- ✅ **Carrito para el sitio del súper (v1)**: botón que arma el texto del carrito y abre la web de la tienda para pegarlo/buscarlo.
- 🔜 **Carrito automático (v2)**: integración real por súper (APIs o scraping headless de Coto Digital, Carrefour, Jumbo/Cencosud, DIA Online) que carga el carrito y te avisa por **push notification** "tu carrito está listo, falta pagar". Requiere: workers en cola, credenciales del usuario cifradas por tienda, y mantenimiento por cambios de las webs. Empezar por UNA cadena con API pública/estable.
- 🔜 **Ofertas automáticas**: scraper diario de páginas de ofertas de las cadenas + APIs tipo Precios Claros (SEPA, dataset público argentino de precios) para poblar precios y ofertas sin carga manual. Es el killer feature para Argentina: precios reales sin que el usuario cargue nada.
- 🔜 Notificaciones push: "se te está por acabar la yerba", "mañana se reinicia tu lista semanal", "X compartió una lista con vos", "oferta en algo que te falta".
- 🔜 Historial de precios por producto → gráfico de inflación personal, "este producto subió 12% este mes".
- 🔜 Recetas → lista: "milanesas con puré para 4" genera los ingredientes que no tenés en despensa.
- 💡 Presupuesto por compra: tope de gasto y semáforo mientras marcás en el súper.
- 💡 Despensa inteligente: consumo promedio por producto (compraste leche 4 veces en 30 días → te avisa antes de que falte).
- 💡 Listas plantilla públicas de la comunidad ("asado para 10", "bebé recién nacido").

## 3. Negocio / Monetización

- 💡 **Freemium**: gratis hasta 3 listas y 2 miembros por lista; Premium (~USD 2-3/mes): listas/miembros ilimitados, historial de precios, ofertas automáticas, modo offline, sin publicidad.
- 💡 **Afiliación con cadenas**: comisión por carrito armado que termina en compra online (el "carrito v2" es justamente el pipeline de conversión). Es el modelo de Instacart sin logística propia.
- 💡 **Retail media**: posicionamiento pago de ofertas ("patrocinado") cuando el usuario ya declaró que le falta ese producto — intención de compra pura, el sueño de cualquier marca. Cuidar no romper la confianza: siempre marcado como patrocinado.
- 💡 **Datos agregados y anónimos**: índice de precios/canasta por barrio para consultoras y medios (con consentimiento explícito, nunca datos individuales).
- 💡 B2B: versión para restaurantes/kioscos (control de stock + pedidos a proveedores) con el mismo motor.
- 💡 Growth: compartir listas es viral por diseño (cada lista compartida invita usuarios). Deep links de invitación + onboarding sin fricción (login social) para explotarlo.

## 4. Seguridad / Técnica

- 🔜 Rate limiting por usuario en la API (throttle en rutas sensibles: login, share).
- 🔜 Verificación de email + login social (Google/Apple, obligatorio para App Store si hay login).
- 🔜 2FA opcional; revocación de tokens por dispositivo (pantalla "mis sesiones").
- 🔜 Al compartir por email con usuario inexistente: invitación pendiente en vez de error (hoy exige que el usuario exista).
- 🔜 Si se implementa carrito v2: credenciales de terceros cifradas (Laravel encrypted casts) y NUNCA en texto plano; considerar OAuth de la cadena si existe.
- 🔜 Backups automáticos de MySQL; CI con tests (Pest) de policies y del recomendador — la lógica de permisos por team es el punto más delicado.
- 💡 Auditoría de acciones en listas compartidas ("Ana borró Pan") — además de seguridad, es un feature social.
- 💡 App attestation (Play Integrity / App Attest) si la API se hace pública.

## 5. Priorización sugerida (impacto × esfuerzo)

1. **Ofertas automáticas vía Precios Claros/SEPA** — alto impacto, esfuerzo medio, diferencial argentino.
2. **Push notifications** (Expo Push, gratis) — reactivación de usuarios, esfuerzo bajo. ← ACORDADO como próximo paso
3. **Modo offline** — retención en el momento de uso crítico.
4. **Invitaciones a no-usuarios + login social** — destraba el loop viral.
5. **Carrito v2 con UNA cadena** — valida el modelo de afiliación antes de escalar.
