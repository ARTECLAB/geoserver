# GeoServer 3 — De cero a producción · CLAUDE.md
> Archivo específico para `carpetanueva/geoserver/`.
> Lee también `carpetanueva/CLAUDE.md` para las reglas globales.

---

## El curso

**Nombre:** GeoServer 3 — De cero a producción  
**Nivel:** Intermedio  
**Duración:** 8 clases × 2 horas = 16 horas  
**Hosting:** `geoserver-pro.danielquisbert.com` (GitHub Pages)  
**Paleta:** gold `#C89B3C` / `#E8B84B`

---

## Archivos del curso — orden exacto

### Slides (raíz del subdominio)

| Archivo | Clase | Título | Slides |
|---------|-------|--------|--------|
| `index.html` | — | Página principal del curso | — |
| `fundamentos.html` | — | Preparación para el curso | — |
| `meridian.html` | 1 | Fundamentos y Arquitectura de GeoServer 3 | 16 |
| `datum.html` | 2 | Instalación en Debian 13 con VirtualBox | 16 |
| `vector.html` | 3 | PostGIS y Conversión de Datos con ogr2ogr | 13 |
| `raster.html` | 4 | Publicación de capas | 13 |
| `symbology.html` | 5 | Estilos SLD y CSS cartográfico | 12 |
| `topology.html` | 6 | PostGIS + GeoServer — datos desde la base | 13 |
| `ogcapi.html` | 7 | Servicios OGC, seguridad y filtros CQL | 13 |
| `geodesia.html` | 8 | Proyecto final — IDE Municipal | 11 |

### Quizzes (subcarpeta test/)

Mismo nombre de archivo que el slide correspondiente.  
Cada quiz: 12 preguntas · 2 intentos · retroalimentación inmediata.

---

## Entorno de trabajo — CRÍTICO

```
SO:       Debian 13 (Trixie) en VirtualBox
RAM VM:   6 GB asignados
Java:     JDK 17 o 21 — PREINSTALADO en la VM (no instalar manualmente)
Tomcat:   11 — PREINSTALADO en la VM
          → apt install tomcat11 (ya hecho)
          → NUNCA usar Tomcat 9 (javax.servlet) ni Tomcat 10
          → GeoServer 3 requiere Tomcat 11 (jakarta.servlet)
Acceso:   IP de la VM → 192.168.X.X:8080
          NUNCA mencionar localhost como URL de acceso desde el cliente
GeoServer: 3.x desplegado como WAR en webapps/ de Tomcat
DB:       PostgreSQL + PostGIS en la MISMA VM
GDAL:     ogr2ogr para importar Shapefiles
```

### Verificar entorno
```bash
java -version           # debe mostrar 17.x o 21.x
systemctl status tomcat11  # debe mostrar active (running)
ip a                    # para ver la IP de la VM
```

---

## Decisiones técnicas — NO hacer

| ❌ No usar | ✓ Usar en cambio |
|-----------|-----------------|
| Docker / Docker Compose | Instalación directa en la VM |
| GeoPackage como formato principal | Shapefile + PostGIS |
| Tomcat 9 o Tomcat 10 | Tomcat 11 |
| localhost en ejemplos del cliente | `192.168.X.X:8080` |
| localhost en código de GeoServer remoto | IP de la VM |
| WCS ni procesamiento raster avanzado | Un GeoTIFF básico (<50MB) |
| DEM con múltiples ColorMap entries | ColorMap simple tipo ramp |

---

## Arquitectura GeoServer — jerarquía

```
Workspace (contenedor del proyecto)
  └── Store (fuente de datos)
        ├── Tipo Shapefile → apunta a un .shp
        ├── Tipo PostGIS   → conexión a PostgreSQL
        └── Tipo GeoTIFF   → apunta a un .tif
            └── Layer (capa publicada)
                  └── Style (SLD o CSS)
```

La URL siempre sigue: `/geoserver/{workspace}/wms?LAYERS={workspace}:{layer}`

---

## PostGIS — comandos del curso

```bash
# Instalar (en Debian 13)
sudo apt install postgresql postgis gdal-bin

# Crear base de datos del curso
sudo -u postgres psql -c "CREATE DATABASE geoserver_curso;"
sudo -u postgres psql -d geoserver_curso -c "CREATE EXTENSION postgis;"

# Usuario para GeoServer (solo SELECT)
sudo -u postgres psql -d geoserver_curso << 'SQL'
CREATE USER geoserver_user WITH PASSWORD 'geoserver123';
GRANT CONNECT ON DATABASE geoserver_curso TO geoserver_user;
GRANT USAGE ON SCHEMA public TO geoserver_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO geoserver_user;
SQL
```

## ogr2ogr — importar Shapefile a PostGIS

```bash
ogr2ogr \
  -f "PostgreSQL" \
  PG:"host=localhost port=5432 dbname=geoserver_curso user=postgres" \
  departamentos.shp \
  -nln departamentos \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -overwrite
```

Parámetros importantes:
- `-nln` → nombre de la tabla destino
- `-nlt PROMOTE_TO_MULTI` → unifica Polygon y MultiPolygon
- `-t_srs EPSG:4326` → reproyectar si es necesario
- `-overwrite` → reemplazar si ya existe

---

## Estándares OGC — los que usamos

| Servicio | Descripción | Clase |
|----------|-------------|-------|
| WMS | Imagen PNG renderizada | 1, 4, 5, 7 |
| WFS | Datos vectoriales GeoJSON | 7 |
| WMTS | Teselas en caché (GeoWebCache) | 7 |

### Anatomía petición WMS (para slides y ejemplos)
```
http://192.168.X.X:8080/geoserver/{workspace}/wms?
  SERVICE=WMS
  &VERSION=1.3.0
  &REQUEST=GetMap
  &LAYERS={workspace}:{capa}
  &CRS=EPSG:4326
  &BBOX=-22.9,-69.6,-9.7,-57.5
  &WIDTH=800&HEIGHT=600
  &FORMAT=image/png
  &TRANSPARENT=true
  &CQL_FILTER=departamento='LA PAZ'
```

---

## Estilos SLD — clases CSS disponibles en código

```xml
<!-- Polígono básico -->
<PolygonSymbolizer>
  <Fill><CssParameter name="fill">#006A6A</CssParameter></Fill>
  <Stroke><CssParameter name="stroke">#004444</CssParameter></Stroke>
</PolygonSymbolizer>

<!-- Etiqueta -->
<TextSymbolizer>
  <Label><PropertyName>nombre</PropertyName></Label>
</TextSymbolizer>

<!-- Escala dependiente -->
<MinScaleDenominator>50000</MinScaleDenominator>
<MaxScaleDenominator>500000</MaxScaleDenominator>

<!-- ColorMap para GeoTIFF -->
<RasterSymbolizer>
  <ColorMap type="ramp">
    <ColorMapEntry color="#1a9641" quantity="0"/>
    <ColorMapEntry color="#ffffb2" quantity="128"/>
    <ColorMapEntry color="#d7191c" quantity="255"/>
  </ColorMap>
</RasterSymbolizer>
```

---

## Datos del curso

| Dataset | Formato | Clases |
|---------|---------|--------|
| Departamentos de Bolivia | Shapefile + PostGIS | 1, 2, 3, 4, 5, 6 |
| Municipios de Bolivia | Shapefile + PostGIS | 4, 6 |
| Vialidad de Bolivia | Shapefile | 4 |
| Imagen satelital o elevación | GeoTIFF (<50MB) | 4, 5 |

Fuentes recomendadas para GeoTIFF:
- SRTM elevación: `earthexplorer.usgs.gov`
- Imágenes Sentinel: `scihub.copernicus.eu`
- GeoBolivia: `geo.gob.bo`

---

## Estado actual de los archivos

### ✅ Completados y revisados
- `index.html` — CSS autónomo, sin links a slides, paleta gold
- `fundamentos.html` — Debian 13, Tomcat 11, Java preinstalado, IP de VM, tono inclusivo
- `meridian.html` — arquitectura GeoServer, servicios OGC, interfaz
- `datum.html` — instalación Debian 13, Tomcat 11, WAR, memoria Java
- `vector.html` — PostGIS con apt, ogr2ogr completo, Store PostGIS en GeoServer
- `raster.html` — Shapefile, Layer Groups, GeoTIFF básico
- `symbology.html` — SLD, CSS, escala dependiente, ColorMap simple
- `topology.html` — PostGIS avanzado, vistas SQL, datos dinámicos
- `ogcapi.html` — WMS/WFS/WMTS, CQL_FILTER, seguridad, roles
- `geodesia.html` — proyecto final IDE Municipal
- `test/*.html` — 8 quizzes, 96 preguntas, sin Docker, sin GeoPackage

### ✅ Correcciones aplicadas
- Docker eliminado de todos los archivos → instalación directa en VM
- GeoPackage eliminado como formato principal → Shapefile + PostGIS
- localhost → `192.168.X.X:8080` en todos los ejemplos del cliente
- Tomcat 10 → Tomcat 11 en todos los archivos
- Java: "preinstalado en la VM" en lugar de instrucciones de instalación
- Raster simplificado: sin DEM complejo, sin WCS, solo GeoTIFF básico
- ARTECLAB Bolivia → ARTECLAB en todos los archivos

### ⚠️ Pendiente — mismo que Flutter GIS
- Corrección global de `slides.css`: `justify-content: flex-start` en `.slide.active`
- Revisar comentarios en code-block de todos los slides

---

## Convenciones del curso en los slides

### slide-cover de apertura
```html
<div class="cover-tag">
  <span class="cover-dot"></span>
  Módulo X · Clase Y · <span class="auto-year"></span>
</div>
<h1 class="cover-title">Título de la clase:<br><em>subtítulo en gold</em></h1>
```

### instructor-strip
```html
<div class="instructor-strip">
  <div class="is-avatar">DQ</div>
  <div>
    <div class="is-name">Daniel Quisbert</div>
    <div class="is-role">ARTECLAB · geoserver-pro.danielquisbert.com</div>
  </div>
</div>
```

### quiz-cta (enlace al cuestionario)
```html
<a href="test/ARCHIVO.html" target="_blank">Ir al cuestionario →</a>
```
> El quiz está en `test/`, igual que en Flutter GIS — mismo nombre de archivo que el slide.

---

## Proyecto final — IDE Municipal (Clase 8)

El estudiante entrega una Infraestructura de Datos Espaciales con:
- GeoServer 3 publicando capas de Bolivia desde PostGIS
- Estilos SLD/CSS en todas las capas
- Seguridad con roles de acceso configurada
- Visor web OpenLayers consumiendo WMS y WFS
- Filtros CQL funcionando desde el visor
- Todo corriendo en la VM de Debian 13
Listo
Ahora los tres como artefactos, uno por uno. Cada uno tiene su botón de copia:


Creó un archivo, archivo leído
Creó un archivo, archivo leído
Tres archivos .md para descargar directamente. Al descargarlos los renombras así:

Archivo descargado	Renombrar a	Colocar en
CLAUDE-raiz.md	CLAUDE.md	carpetanueva/
CLAUDE-fluttergis.md	CLAUDE.md	carpetanueva/fluttergis/
CLAUDE-geoserver.md	CLAUDE.md	carpetanueva/geoserver/

Claude raiz
Documento · MD 

Claude fluttergis
Documento · MD 

Claude geoserver
Documento · MD 







