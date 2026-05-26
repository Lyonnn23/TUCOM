
# Motor de Descuentos TÜcom — Plan de implementación

Feature crítico: mostrar el precio real que paga el usuario tras aplicar el mejor descuento disponible según sus tarjetas/apps. Se aplica de una sola pasada.

## Notas de adaptación al schema real
- No existe tabla `profiles` — los métodos de pago del usuario se guardan en `user_preferences.payment_methods text[]` (ya tiene RLS por usuario).
- Ya existe `fuel_benefits` (similar conceptualmente pero con otra estructura). Se mantiene intacta y se crea `station_discounts` según lo pedido (es la fuente de verdad del nuevo motor).
- Días de la semana en español como pide la spec (`'viernes'`, `'martes'`...).
- Floor prices (pisos absolutos): 93=$1.150, 95=$1.200, 97=$1.250, diésel=$1.100. Se centralizan en `src/lib/priceRanges.ts`.

## 1. Base de datos (migración)
- `CREATE TABLE public.station_discounts` exactamente como en la spec + índices + RLS lectura pública + política admin para escritura.
- `ALTER TABLE public.user_preferences ADD COLUMN payment_methods text[] DEFAULT '{}'` (en lugar de `profiles`).
- `ALTER TABLE public.user_preferences ADD COLUMN discount_alerts_enabled bool DEFAULT true`.
- Trigger `updated_at` en `station_discounts`.
- Seed con los 9 descuentos reales de la spec.

## 2. Lógica compartida (frontend)
- `src/lib/discounts.ts`:
  - `PAYMENT_METHODS` (catálogo con label, logo/emoji, marca compatible).
  - `getBestDiscount(stationBrand, userMethods, fuelType, today)` → mejor `discount_clp` aplicable hoy.
  - `applyDiscount(cnePrice, discountClp, fuelType)` → respeta piso absoluto.
  - `FLOOR_PRICES` y disclaimer estándar.
- Hook `useStationDiscounts()` (React Query, cache 10min) que carga `station_discounts` activos vigentes.
- Hook `useUserPaymentMethods()` (lee/escribe `user_preferences.payment_methods`).

## 3. Onboarding y perfil
- Nuevo paso en `Onboarding.tsx`: grid multi-select de métodos de pago con badge "Hasta $X/L" calculado del max descuento disponible para ese método. Guarda en `user_preferences.payment_methods`.
- Sección "Mis métodos de pago" en `Profile.tsx` (mismo componente reutilizado).

## 4. Tarjetas de estación
- `StationCard.tsx` y vistas relacionadas (`Drive.tsx`, favoritos):
  - Si hay descuento aplicable: precio CNE tachado pequeño gris + finalPrice grande verde con `~` y pill verde "−$X con [método]".
  - Si no hay métodos configurados: precio normal + chip "💳 Ver descuentos" → `/profile`.
  - Tooltip al tap: disclaimer "Precio estimado…".
- `StationMap.tsx`: los markers usan `finalPrice` para color cheap/expensive y para la label.

## 5. Home: "Descuentos activos hoy"
- Nuevo componente `DiscountsToday.tsx` con scroll horizontal de chips (logo marca + "$X↓"). Tap → navega a `/?brand=X`. Empty state cuando no hay. Link "Ver todos →" a `/descuentos`.

## 6. Página `/descuentos`
- Calendario semanal horizontal (lun–dom, hoy resaltado en violeta primario).
- Lista de tarjetas de descuento con todos los campos descritos.
- Filtros: Hoy | Esta semana | Por marca | Por tarjeta.
- Aviso superior con fecha de última actualización (`max(updated_at)`).
- Ruta agregada en `App.tsx` + entrada en `BottomNav.tsx`.

## 7. Calculadora
- En `Calculadora.tsx` result screen: bloque "Con tus descuentos disponibles" con comparación Sin/Con descuento, ahorro, y CTA de descarga si el usuario no tiene esa tarjeta.

## 8. Push notifications
- Edge function `send-discount-alerts` (verify_jwt = false).
  - Jueves 20:00: alerta para descuentos del viernes que el usuario tenga.
  - Domingo 20:00: preview semanal.
  - Usa `user_preferences.payment_methods` + `discount_alerts_enabled` + `push_subscriptions`.
  - Calcula estación más cercana con coords del push_subscription.
  - Registra en `notification_log` con `kind='discount'` para evitar duplicados.
- Cron jobs vía `pg_cron`/`pg_net` (insert tool, no migration, ya que contiene URLs/keys del proyecto).
- Toggle "Alertas de descuentos" en preferencias de notificaciones.

## 9. Admin `/admin/discounts`
- Nueva ruta dentro de `Admin.tsx`.
- Tabla CRUD: brand, método, monto, días, vigencia, estado.
- Toggle activar/desactivar, "Marcar todos los expirados como inactivos", aviso amber para los que expiran en ≤7 días.
- Quick-add form (drawer).
- Métrica "Descuento más consultado esta semana" (registramos clicks de chip en `station_views` con tag, o tabla nueva `discount_clicks` — simple).
- Entrada en `AdminLayout.tsx` sidebar.

## 10. Verificación
- TypeScript compila.
- Manualmente: onboarding muestra el paso, tarjetas muestran finalPrice, /descuentos carga calendario y lista, calculadora muestra comparación, admin permite CRUD.

---

**Orden de ejecución**: migración primero (requiere aprobación del usuario), después todo el código en paralelo, después edge function + cron.

¿Apruebas el plan para arrancar con la migración?
