# Bitácora de cargas y consumo

Construir un módulo completo para registrar cargas de combustible, analizar consumo real y enviar recordatorios cuando quede poco rango.

## 1. Base de datos (migración)

Tabla `fuel_logs`:
- `id`, `user_id`, `vehicle_id` (FK lógica a `user_vehicles`, nullable)
- `station_id` (nullable — permite cargas en estación no listada)
- `fuel_type` (texto, validado a los 5 tipos)
- `liters` numeric(8,3), `price_per_liter` int, `total_cost` int
- `odometer_km` int (nullable)
- `logged_at` timestamptz default now(), `note` text
- RLS: usuario sólo ve/edita/borra sus propios logs; admin puede leer

Agregar columna a `user_preferences`:
- `low_fuel_threshold_km` int default 80
- `fuel_log_email_optin` boolean default false

Función RPC `get_user_consumption_stats(_user_id, _vehicle_id)`:
- Devuelve: real_kml, total_spent_6m, cost_per_km, avg_price_paid, last_odometer, last_log_at
- Calcula km/L comparando odómetros consecutivos del mismo vehículo

Función RPC `get_monthly_fuel_spend(_user_id, _months)`:
- Devuelve serie mensual `{month, total_clp, liters, avg_price}` últimos N meses

Función RPC `get_market_avg_price(_fuel_type, _month)`:
- Promedio de `station_prices` para ese mes (usa snapshot history si disponible)

## 2. Hooks

- `useFuelLogs.ts` — list, create, update, remove (React Query)
- `useFuelStats.ts` — wrappers a las RPC anteriores
- `useTankRange.ts` — calcula km restantes en base a último log + odómetro actual estimado + consumo real

## 3. Componentes

- `FuelLogFAB.tsx` — botón flotante (Plus + Fuel icon) visible en `/` (Index) y `/mis-cargas`
- `FuelLogDialog.tsx` — modal con:
  - Select vehículo (default primario)
  - Select estación (autocompleta la más cercana, búsqueda libre)
  - Select fuel_type (precargado del vehículo)
  - Tabs "Por litros" / "Por monto": calcula automáticamente la otra dimensión usando precio actual de la estación o input manual
  - Input odómetro (opcional pero recomendado)
  - Validación con zod (litros 0–200, precio 100–5000, monto 100–500.000)
- `ConsumptionCard.tsx` — km/L real vs ficha técnica con delta
- `MonthlySpendChart.tsx` — Recharts BarChart 6 meses
- `CostPerKmCard.tsx`
- `AvgPriceCard.tsx` — precio promedio pagado vs mercado, "Ahorraste X%"
- `TankRangeBanner.tsx` — muestra km estimados restantes en home si < umbral
- `ExportFuelLogButton.tsx` — genera CSV cliente (Blob) y PDF (jsPDF dinámico)

## 4. Páginas

- `src/pages/MisCargas.tsx` (ruta `/mis-cargas`, alias `/fuel-logs`):
  - Header back + título "Mis cargas"
  - Sección "Resumen": `ConsumptionCard`, `CostPerKmCard`, `AvgPriceCard`
  - `MonthlySpendChart`
  - Lista cronológica de logs con editar/eliminar
  - Botón "Exportar" (CSV/PDF)
  - FAB para nueva carga

- `src/pages/Index.tsx` (Home):
  - Mostrar `TankRangeBanner` si hay logs y rango < umbral
  - Renderizar `FuelLogFAB` global

- `src/pages/Profile.tsx`:
  - Acceso "Mis cargas" en menú
  - Setting: slider para `low_fuel_threshold_km` (40–200)
  - Switch: "Resumen mensual por email"

## 5. Recordatorios inteligentes

- Edge Function `check-tank-range`:
  - Para cada usuario con `low_fuel_threshold_km > 0` y push activo:
  - Calcular rango restante (último log + km/L real + odómetro estimado por tiempo, o pedir actualización manual)
  - Si rango < umbral y no se envió aviso en últimas 12h → buscar estación más barata dentro de 15 km del último `push_subscriptions.lat/lng` y enviar push:
    - Title: "⛽ Te quedan ~{km} km"
    - Body: "Más barata cerca: {marca} {comuna} a ${precio}/L"
    - Actions: "Ver estación", "Cómo llegar"
- Programar con `pg_cron` cada 2h (vía `supabase--insert`, no migración)

NOTA: rango automático sin telemetría es estimación. Mostrar "Estimado" en UI.

## 6. Export

- CSV: cliente, generación directa, columnas `Fecha,Estación,Combustible,Litros,Precio/L,Total,Odómetro,Consumo`
- PDF: import dinámico de `jspdf` + `jspdf-autotable`, encabezado con logo TÜcom y totales del periodo
- Filtros por rango de fechas antes de exportar

## 7. Routing y navegación

- Registrar `/mis-cargas` y `/fuel-logs` en `App.tsx`
- Agregar item "Mis cargas" en `Profile.tsx`
- (No tocar BottomNav — ya está saturado; acceso por Home FAB y Profile)

## Detalles técnicos

- Todas las cifras formateadas con `@/lib/format` (`formatPrice`, `formatDistance`, `formatRelativeTime`).
- Mensajes en español neutro; estados loading/empty/error consistentes con el resto.
- Validación cliente con zod + mensajes localizados; servidor confía en RLS + check via trigger opcional para rangos.
- Accesibilidad: FAB con `aria-label="Registrar carga"`, dialog con título asociado, charts con descripción accesible.
- Memoria: actualizar `mem://index.md` con nueva entrada `[Fuel Logs](mem://features/registro-cargas)`.

## Lo que NO incluye (fuera de alcance)

- OCR de boletas
- Sync con OBD-II
- Predicción avanzada de consumo por ML
- Compartir bitácora con otros usuarios

¿Apruebas para implementar?
