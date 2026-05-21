# Guía para reclamar TÜcom en Google My Business

Esta guía describe cómo crear y verificar el perfil de TÜcom en **Google
Business Profile** (antes Google My Business), para que la app aparezca en
Google Search y Google Maps cuando los usuarios busquen "precios de
bencina", "estaciones de servicio cerca de mí", "TÜcom", etc.

## 1. Requisitos previos

- Una cuenta de Google operativa del equipo de TÜcom
  (p. ej. `equipo@tucombustible.cl`).
- Acceso al dominio `tucombustible.lovable.app` (o al dominio definitivo)
  para poder agregar metaetiquetas de verificación si se solicita.
- Un número de teléfono y dirección postal en Chile (puede ser una
  oficina de coworking; Google la usará para verificación por carta).
- Logo en alta resolución (≥ 720×720, PNG) y portada (1080×608).

## 2. Tipo de perfil recomendado

TÜcom es un servicio digital, no una tienda física. Google permite dos
opciones para este caso:

1. **Service-area business (SAB)**: no muestra una dirección pública,
   solo un área de cobertura (Chile).
2. **Brand profile** (sin ubicación física): visible en búsquedas de
   marca y en el panel de conocimiento (Knowledge Panel).

Recomendamos crear un **SAB** con cobertura "Chile". Más adelante se
puede solicitar verificación de marca para el panel de conocimiento.

## 3. Crear el perfil

1. Ir a https://business.google.com/create con la cuenta corporativa.
2. **Nombre del negocio**: `TÜcom`.
3. **Categoría principal**: `Servicio de información sobre combustible`
   (o la categoría más cercana: `Servicio de comparación de precios`).
4. **Categorías secundarias**:
   - `Aplicación móvil`
   - `Estación de servicio` (solo si Google la habilita; opcional)
5. **¿Quieres añadir una ubicación física?** → **No**.
6. **Áreas de servicio**: añadir `Chile` y opcionalmente las principales
   regiones (Metropolitana, Valparaíso, Biobío, etc.).
7. **Datos de contacto**:
   - Sitio web: `https://tucombustible.lovable.app`
   - Teléfono: el número de soporte (puede ser opcional).

## 4. Verificación

Google ofrece varios métodos de verificación según el tipo de cuenta:

- **Correo electrónico** (más rápido): solo disponible para algunas
  cuentas; usar si aparece.
- **Carta postal**: Google envía un código a la dirección postal en
  ~5–14 días hábiles.
- **Vídeo**: grabar un vídeo mostrando el entorno de trabajo, el
  dispositivo y la app funcionando. Cada vez más común para SAB.
- **Verificación instantánea**: si la propiedad ya está verificada en
  Google Search Console con el mismo correo, Google puede autoverificar.

> ✅ Recomendado: tener Search Console verificado en
> `tucombustible.lovable.app` *antes* de crear el perfil, para
> aumentar las chances de verificación instantánea.

## 5. Optimizar el perfil

Una vez verificado, completar:

- **Descripción** (máx 750 caracteres):

  > TÜcom es la app gratuita que muestra los precios de bencina 93, 95,
  > 97, Diésel y carga eléctrica de más de 2.000 estaciones de servicio
  > en Chile, actualizados a diario con datos oficiales de la CNE.
  > Encuentra la estación más barata cerca de ti, recibe alertas de
  > bajadas de precio y compara entre estaciones.

- **Logo** y **portada** con la identidad visual TÜcom
  (gradiente morado→azul, "Ü" con sonrisa).
- **Atributos**: marcar `Aplicación gratuita`, `Funciona offline`,
  `Sin registro obligatorio`.
- **Servicios**: añadir entradas como:
  - "Precios de combustible en tiempo real"
  - "Alertas de bajada de precio"
  - "Comparador de estaciones"
  - "Mapa de cargadores eléctricos"
- **Productos** (opcional): destacar la PWA y el modo conductor.
- **Fotos**: capturas de pantalla de la app (mapa, lista, modo
  conductor), logo y portada.
- **Enlace a la app**: `https://tucombustible.lovable.app` y, cuando
  esté publicada, las URLs de App Store / Google Play.

## 6. Posts y novedades

Publicar `Updates` semanales con:

- Bajadas de precio destacadas.
- Nuevas funciones (modo conductor, alertas, etc.).
- Hitos (Nº de estaciones cubiertas, Nº de usuarios).

Esto mejora la visibilidad en el panel de Google.

## 7. Reseñas

- Invitar a usuarios beta a dejar reseñas con el enlace corto que
  Google entrega en la sección "Compartir perfil".
- Responder todas las reseñas (positivas y negativas) en español
  neutral, manteniendo el tono cercano de la marca.

## 8. Datos estructurados que ya tiene la app

La app ya emite `Organization` JSON-LD en `index.html` y
`GasStation` + `BreadcrumbList` en cada página de detalle. Esto
ayuda a que Google asocie el perfil de Business Profile con el
sitio. No es necesario duplicar datos en el perfil.

## 9. Métricas a monitorear

Desde el panel de Business Profile:

- Impresiones en Search y Maps.
- Clics a sitio web, llamadas y rutas.
- Búsquedas directas vs descubrimiento.

Cruzar mensualmente con Plausible Analytics para medir el impacto.

## 10. Próximos pasos opcionales

- **Knowledge Panel de marca**: solicitar verificación de marca en
  https://support.google.com/knowledgepanel/answer/7534842 una vez
  que la app tenga cobertura de prensa o Wikipedia.
- **Google Merchant Center**: no aplica (no se venden productos).
- **Google Search Console**: enviar el sitemap
  `https://tucombustible.lovable.app/sitemap.xml` ya generado
  por el script `scripts/generate-sitemap.ts`.
