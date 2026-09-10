# Cohesión visual final de TÜcom

## Objetivo
Unificar la experiencia visual y táctil de la app sin agregar rutas, funciones ni cambios en cálculos o fuentes de datos.

## Implementación

### 1. Sistema visual compartido
- Consolidar en los estilos globales los tratamientos semánticos para acciones primarias, resultados positivos, destacados de precio y avisos urgentes.
- Normalizar interacción táctil, desplazamiento suave, viewport móvil, reducción de movimiento, tarjetas navegables y botones principales.
- Mantener tarjetas ordinarias neutrales; reservar gradientes para encabezados, acciones, resultados y alertas.
- Crear piezas compartidas pequeñas para encabezados de sección, frescura de precios y estados repetidos, evitando duplicación.

### 2. Auditoría de todas las pantallas
- Revisar todas las páginas de `src/pages/` para fondo, títulos, separación vertical, tarjetas, espacio inferior, carga, vacío y error.
- Corregir inconsistencias visuales de alto impacto sin alterar contenido, rutas ni comportamiento.
- Priorizar Inicio, Detalle de estación, Perfil, Calculadora, Conducir, Ranking, alertas, cargas, páginas públicas y paneles administrativos/empresa.
- Añadir respuesta táctil uniforme a tarjetas y filas que navegan.

### 3. Inicio
- Ordenar los widgets en grupos con rótulos “Tu ubicación”, “Precios cercanos” y “Mercado hoy”.
- Mantener separación vertical uniforme y reducir competencia visual entre módulos.
- Añadir el aviso contextual de combustible bajo, visible solo bajo 50 km, descartable durante la sesión y conectado al mapa/listado cercano existente.
- Añadir el recordatorio descartable para completar perfil cuando falten vehículo, pagos o notificaciones.

### 4. Onboarding y Perfil
- Reducir el onboarding a combustible y ubicación; finalizar y entrar directamente a Inicio.
- Trasladar vehículo, pagos y notificaciones al recordatorio no bloqueante y a Perfil.
- Mostrar avance de perfil usando información existente.
- Mostrar en el encabezado de Perfil la posición mensual del usuario cuando exista, enlazada al ranking existente.

### 5. Precios y frescura
- Añadir un indicador compartido junto a precios en tarjetas de estaciones, detalle, ranking y resúmenes cercanos.
- Usar verde para menos de 6 horas, ámbar entre 6 y 24 horas y neutro para más de 24 horas.
- Mostrar horas o días según antigüedad, usando las fechas ya disponibles; no inventar datos cuando falte una fecha.

### 6. Iconografía y gradientes recientes
- Sustituir emojis usados como ancla principal en Comparar, Viaje, MEPCO e instalación por iconos Lucide.
- Mantener emojis únicamente en texto auxiliar permitido.
- Neutralizar gradientes decorativos en contenido ordinario y conservarlos en resultados, alertas, encabezados y acciones.

### 7. Verificación
- Ejecutar comprobaciones automáticas y revisar el estado de compilación.
- Probar Inicio, onboarding, Perfil, Calculadora, Detalle de estación y navegación inferior en móvil y escritorio.
- Confirmar ausencia de errores de consola, solapamientos y saltos visibles; comprobar reducción de movimiento.
- Entregar la lista completa de archivos modificados y un resumen por pantalla.

## Límites
- Sin páginas ni rutas nuevas.
- Sin cambios en consultas, cálculos, permisos o fuentes de datos.
- Sin eliminar funciones existentes; solo composición visual, estados ya soportados e interacción solicitada.
