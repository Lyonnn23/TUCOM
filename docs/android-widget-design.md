# TÜcom — Diseño de Widget de Pantalla de Inicio (Android)

> Nota: Los widgets nativos de Android requieren una app nativa (Capacitor + módulo Java/Kotlin con `AppWidgetProvider`). Esta es la especificación de diseño para implementación futura.

## Tamaños soportados
- 2x2 (compacto)
- 4x2 (estándar, recomendado)
- 4x4 (extendido con top 3 estaciones)

## Contenido principal (4x2)

```
┌─────────────────────────────────────────┐
│  ⛽ TÜcom            Actualizado 12:34   │
│                                         │
│  $1.249  /L                             │
│  Copec Av. Apoquindo 4500               │
│  📍 1.2 km · 95 octanos                 │
│                                         │
│  [ Cómo llegar ]   [ Ver más ]          │
└─────────────────────────────────────────┘
```

### Datos mostrados
- **Precio más bajo cercano** del combustible preferido del usuario (93 / 95 / 97 / Diésel)
- **Nombre y marca** de la estación
- **Distancia** desde la ubicación actual (km)
- **Última actualización** (HH:mm)

### Acciones
- Tap en el precio → abre `/?tab=estaciones&sort=price`
- Botón "Cómo llegar" → `intent://maps.google.com/?daddr=LAT,LNG`
- Botón "Ver más" → abre la app

## Estilo visual
- Fondo: gradiente vertical violeta `#7C3AED` → indigo `#6366F1` con esquinas redondeadas 24dp
- Texto principal: blanco, Inter Bold 32sp (precio)
- Texto secundario: blanco 80% opacidad, Inter Regular 14sp
- Botones: blanco translúcido 20%, texto blanco
- Logo TÜcom en esquina superior izquierda (24dp, con la 'Ü' sonriente)

## Frecuencia de actualización
- Cada 6 horas vía `AppWidgetManager.updateAppWidget()`
- Refresh manual al tap en el icono de "actualizar"
- Triggered también cuando se sincronizan precios (broadcast desde la app)

## Estados especiales
- **Sin ubicación**: muestra "Activa la ubicación en la app" + botón "Abrir"
- **Sin datos**: muestra promedio nacional del combustible preferido
- **Offline**: muestra último precio conocido con indicador "Sin conexión"
