
## Objetivo

Convertir el botón de reporte (al lado de Maps en cada estación) en un flujo completo donde el usuario puede:

1. Reportar un precio que cree erróneo (combustible + valor).
2. Agregar una nota/comentario opcional explicando lo que vio.
3. Subir una foto del tótem o de la bomba como evidencia.
4. Que la app analice automáticamente con IA si el reporte parece real, y si pasa la verificación, lo use para actualizar el precio mostrado en la app.

## Flujo del usuario

1. Toca el botón con ícono de reporte en `StationCard`.
2. Se abre un diálogo con:
   - Selector de combustible (93, 95, 97, Diésel, EV).
   - Campo de precio (CLP/L o CLP/kWh).
   - Nota opcional (máx 280 caracteres).
   - Botón para subir / tomar una foto (opcional pero recomendado).
3. Al enviar:
   - Si hay foto: se sube a un bucket privado de Lovable Cloud.
   - Se crea el registro en `reported_prices` con `status = 'pending'`.
   - Una función de backend analiza el reporte con IA (Gemini 2.5 Flash) y lo marca como `verified`, `rejected` o `needs_review`.
4. El usuario ve un toast: "Gracias, tu reporte está siendo verificado" y, si la IA lo aprueba en segundos, ve un segundo aviso "Reporte verificado".

## Reglas de verificación

La función de backend hace estos chequeos antes de aceptar:

- Rango de precio plausible por combustible (1.000–3.000 CLP/L, EV 100–600 CLP/kWh).
- Si el reportado se desvía más de ±25% del precio actual de esa estación, exige foto.
- Si hay foto, Gemini Vision verifica:
  - ¿Se ve un tótem/surtidor de combustible?
  - ¿El número visible coincide con el precio reportado (±20 CLP)?
  - ¿Se ve el tipo de combustible (93/95/97/Diésel)?
- Resultado: `verified` (alta confianza), `needs_review` (ambiguo), `rejected` (no coincide / foto inválida).

La función de agregación existente (`aggregate_reported_prices`) se actualiza para usar **solo reportes con `status = 'verified'`** de las últimas 48h, manteniendo la mediana como criterio.

## Cambios técnicos

### Base de datos (migración)

- Tabla `reported_prices`: agregar columnas
  - `note text` (opcional)
  - `photo_path text` (ruta dentro del bucket)
  - `status text` default `'pending'` con check en `('pending','verified','needs_review','rejected')`
  - `verification_notes text` (lo que devolvió la IA)
  - `verified_at timestamptz`
- Permitir `electric` en el check de `fuel_type` y ampliar rango de precio del policy a 100–5000 para cubrir kWh.
- Actualizar `aggregate_reported_prices()` para filtrar `status = 'verified'`.
- Bucket privado `price-reports` con políticas RLS:
  - INSERT: usuarios autenticados pueden subir archivos en su propia carpeta `{user_id}/...`.
  - SELECT: solo el dueño o el service role (edge function).

### Edge Function nueva: `verify-price-report`

- Recibe `{ reportId }`.
- Lee el reporte + foto (signed URL desde storage).
- Llama a Lovable AI Gateway (`google/gemini-2.5-flash` para texto, `google/gemini-2.5-pro` si hay imagen) con prompt estructurado.
- Actualiza `reported_prices.status` y `verification_notes`.
- Si `verified`, llama a `aggregate_reported_prices()` para refrescar precios.

### Frontend

- `ReportPriceDialog.tsx`: añadir textarea, input file con preview, soporte EV, llamada al hook actualizado.
- `useReportPrice.ts`: 
  1. Si hay foto, subirla al bucket.
  2. Insertar el reporte con `photo_path` y `note`.
  3. Invocar la edge function `verify-price-report`.
  4. Mostrar toast con resultado.
- Mantener requisito de login (ya implementado vía `/auth`).

## Detalles técnicos

```text
[Usuario] → ReportPriceDialog
    │
    ├── (opcional) sube foto → storage://price-reports/{user_id}/{uuid}.jpg
    ├── INSERT reported_prices (status='pending')
    └── invoke('verify-price-report', { reportId })
            │
            ▼
   Edge Function (service role)
            │
            ├── Lee reporte + signed URL foto
            ├── Llama Lovable AI (Gemini Vision)
            ├── UPDATE status + verification_notes
            └── Si verified → aggregate_reported_prices()
```

Modelos de IA: gratis vía Lovable AI Gateway, sin pedir API key al usuario. No se usan secrets nuevos.

## Archivos a tocar

- Migración SQL (nueva).
- `src/components/ReportPriceDialog.tsx`.
- `src/hooks/useReportPrice.ts`.
- `supabase/functions/verify-price-report/index.ts` (nueva).

## Lo que NO se incluye en este paso

- Panel de moderación manual de reportes `needs_review` (se puede agregar después).
- Recompensas o gamificación por reportes verificados.
- Notificación push al usuario cuando su reporte es aprobado (solo toast inmediato).
