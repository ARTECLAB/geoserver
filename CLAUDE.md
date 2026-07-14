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
| `raster.html` | 4 | Publicación de capas vectoriales | 11 |
| `symbology.html` | 5 | Estilos SLD: condicionales e imágenes | 15 |
| `topology.html` | 6 | PostGIS + GeoServer — datos desde la base | 14 |
| `ogcapi.html` | 7 | Servicios OGC, seguridad y filtros CQL | 13 |
| `geodesia.html` | 8 | Proyecto final — IDE Municipal | 11 |

### Quizzes (subcarpeta test/)

Mismo nombre de archivo que el slide correspondiente.  
Cada quiz: 12 preguntas · 2 intentos · retroalimentación inmediata.

---

## Entorno de trabajo — CRÍTICO

```
SO:       Debian 13 (Trixie) en VirtualBox
RAM VM:   2 GB asignados (¡no 6 GB! — ver nota abajo)
Disco VM: 6 GB asignados
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

> **RAM real = 2 GB, no 6 GB.** Con solo 2GB, el stack base (Debian + PostgreSQL/PostGIS + Tomcat + JVM de GeoServer) ya deja muy poco margen — GeoServer normalmente necesita ≥1GB de heap para funcionar bien. **Por eso el curso NO publica GeoTIFF ni ningún raster**: decodificar tiles de una imagen para WMS puede disparar el uso de memoria muy por encima del tamaño del archivo en disco, con alto riesgo de `OutOfMemoryError` o que el OOM killer de Linux mate Tomcat/Postgres en plena clase. Cualquier recomendación de `-Xmx` para la JVM debe ser conservadora (ej. `-Xmx768m`, nunca `-Xmx2g` — eso reservaría toda la RAM de la VM solo para el heap).

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
| Publicar GeoTIFF o cualquier raster | Solo capas vectoriales (Shapefile, PostGIS) — la VM tiene solo 2GB RAM |

---

## Arquitectura GeoServer — jerarquía

```
Workspace (contenedor del proyecto)
  └── Store (fuente de datos)
        ├── Tipo Shapefile → apunta a un .shp
        └── Tipo PostGIS   → conexión a PostgreSQL
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
sudo -u postgres ogr2ogr \
  -f "PostgreSQL" \
  PG:"dbname=geoserver_curso" \
  departamentos.shp \
  -nln departamentos \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -overwrite
```

> **Sin `host=localhost`/`user=postgres` en `PG:`.** Eso fuerza autenticación por contraseña (que el rol `postgres` no tiene) y falla con `fe_sendauth: no password supplied`. Con `sudo -u postgres` + solo `dbname=...`, ogr2ogr usa el socket local (autenticación peer, sin contraseña) — igual que todos los `psql -c` del curso.

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
```

---

## Datos del curso

| Dataset | Formato | Clases |
|---------|---------|--------|
| Departamentos de Bolivia | Shapefile + PostGIS | 1, 2, 3, 4, 5, 6 |
| Municipios de Bolivia | Shapefile + PostGIS | 4, 6 |
| Vialidad de Bolivia | Shapefile | 4 |

> Sin GeoTIFF/raster en el curso — la VM tiene solo 2GB RAM, ver nota en "Entorno de trabajo".

---

## Estado actual de los archivos

### ✅ Completados y revisados
- `index.html` — CSS autónomo, sin links a slides, paleta gold
- `fundamentos.html` — Debian 13, Tomcat 11, Java preinstalado, IP de VM, tono inclusivo
- `meridian.html` — arquitectura GeoServer, servicios OGC, interfaz
- `datum.html` — instalación Debian 13, Tomcat 11, WAR, memoria Java
- `vector.html` — PostGIS con apt, ogr2ogr completo, Store PostGIS en GeoServer
- `raster.html` — Shapefile, Layer Groups, segunda capa (provincias) — sin GeoTIFF
- `symbology.html` — solo SLD (sin CSS Styles: el plugin no está disponible para GeoServer 3), estilos condicionales con ElseFilter y filtros numéricos usando el mapa de departamentos (campos reales FIRST_NOM_/COUNT/COD), ExternalGraphic para íconos personalizados (caso postes), escala dependiente — sin ColorMap/raster (2026-07-09)
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
- ARTECLAB Bolivia → ARTECLAB en todos los archivos
- RAM real corregida a 2GB (no 6GB) — GeoTIFF/raster eliminado de `raster.html` y `symbology.html` por riesgo de OOM en la VM (2026-07-09)
- `ogr2ogr` sin `host=localhost`/`user=postgres` en la cadena `PG:` — causaba `fe_sendauth: no password supplied`

### ✅ Resuelto (2026-07-09)
`slides.css` ya usa `justify-content: flex-start` en `.slide.active` y `font-size: clamp(10px, 1.1vw, 13px)` en `.code-block` (mismo fix que fluttergis, son dos copias separadas del archivo).

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
- Estilos SLD en todas las capas
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







