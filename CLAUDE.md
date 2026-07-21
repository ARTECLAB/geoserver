# GeoServer 3 — De cero a producción · CLAUDE.md
> Archivo específico para `carpetanueva/geoserver/`.
> Lee también `carpetanueva/CLAUDE.md` para las reglas globales.

---

## El curso

**Nombre:** GeoServer 3 — De cero a producción  
**Nivel:** Intermedio  
**Duración:** 8 clases × 2 horas = 16 horas (reestructurado 2026-07-21 — ver nota abajo)  
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
| `symbology.html` | 5 | Estilos SLD: condicionales, imágenes y degradados | 19 |
| `topology.html` | 6 | Vistas SQL y GeoWebCache — capas calculadas, mapas veloces | 18 |
| `ogcapi.html` | 7 | Servicios OGC y filtros CQL | 14 |
| `geodesia.html` | 8 (última) | Seguridad en GeoServer 3 — usuarios, roles, reglas y checklist final de producción | 18 |

### Quizzes (subcarpeta test/)

Mismo nombre de archivo que el slide correspondiente.  
Cada quiz: 12 preguntas · 2 intentos · retroalimentación inmediata.

### Archivos deprecados — NO usar, NO enlazar

> **Reestructuración 2026-07-21:** el curso pasó de 9 a 8 clases. `geodesia.html` dejó de ser "Proyecto final — IDE Municipal" como clase completa (con visor OpenLayers y tabla de criterios de evaluación) y ahora es la Clase 8 (última clase), 100% Seguridad — se fusionó y mejoró el contenido que antes vivía en `azimuth.html`, con ejemplos más detallados y un checklist final de producción incorporado. El proyecto final **no desapareció**: se menciona explícitamente como cierre de esta clase (presentación breve del estudiante, sin rúbrica de puntos) — no como una clase de contenido nuevo ni con criterios de evaluación formales.

| Archivo | Estado | Motivo |
|---------|--------|--------|
| `azimuth.html` | **Deprecado** | Era la Clase 8 (Seguridad). Su contenido se fusionó y mejoró dentro de `geodesia.html`. El archivo queda en el repo marcado `[DEPRECADO]` en el `<title>`, pero no debe enlazarse desde `index.html` ni desde ningún slide. |
| `test/azimuth.html` | **Deprecado** | Quiz de la clase anterior. Su contenido se trasladó a `test/geodesia.html`. |

**Sobre el proyecto final:** no tiene clase propia ni tabla de criterios/porcentajes de evaluación. Se trata como el cierre natural de la Clase 8: el estudiante presenta en vivo la IDE que construyó a lo largo del curso (capas, estilos, caché, seguridad), sin entregable formal calificado por rúbrica.

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
| WMTS | Teselas en caché (GeoWebCache) | 6, 7 |

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
- `topology.html` — Clase 6 reescrita (2026-07-14, ampliada 2026-07-21): vistas SQL sobre lo ya construido en la Clase 3 (sin repetir instalación de PostGIS ni ogr2ogr) + GeoWebCache (activar caché con General settings completo, Parameter Filters/STYLES, Cached Grid Sets EPSG:4326/900913, Seed zoom 0–8 con BBox de Bolivia por los 6GB de disco, Truncate). Usa los nombres reales del curso: BD `geoserver_curso`, usuario `geoserver_user`, workspace `bolivia_curso`, campos `first_nom_`/`count` en minúsculas (ogr2ogr los convierte)
- `ogcapi.html` — Clase 7 (2026-07-14, simplificada 2026-07-21): solo WMS/WFS/WMTS + CQL_FILTER (GeoWebCache pasó a la Clase 6, seguridad a la Clase 8). GetCapabilities, orden lat/lon del BBOX en WMS 1.3.0, práctica integradora, con kv-list de apoyo aclarando cada parámetro (WMS/WFS, TILEMATRIX/TILEROW/TILECOL, DWITHIN)
- `geodesia.html` — Clase 8 (última clase, reescrita 2026-07-21): 100% Seguridad — contraseña admin, master password, usuarios/roles (ROLE_EDITOR, editor_gis), reglas de datos `workspace.capa.permiso = roles`, reglas de servicios, verificación en incógnito, OIDC en GS3, y checklist final de producción (CORS Jetty 12, GeoWebCache, GEOSERVER_LOG_LOCATION, backup del Data Directory). Reemplaza tanto a la antigua "Proyecto final — IDE Municipal" como a `azimuth.html` (ver "Archivos deprecados" arriba)
- `test/*.html` — 8 quizzes activos (96 preguntas) + 1 quiz deprecado (`test/azimuth.html`), sin Docker, sin GeoPackage

### ✅ Correcciones aplicadas
- Docker eliminado de todos los archivos → instalación directa en VM
- GeoPackage eliminado como formato principal → Shapefile + PostGIS
- localhost → `192.168.X.X:8080` en todos los ejemplos del cliente
- Tomcat 10 → Tomcat 11 en todos los archivos
- Java: "preinstalado en la VM" en lugar de instrucciones de instalación
- ARTECLAB Bolivia → ARTECLAB en todos los archivos
- RAM real corregida a 2GB (no 6GB) — GeoTIFF/raster eliminado de `raster.html` y `symbology.html` por riesgo de OOM en la VM (2026-07-09)
- `ogr2ogr` sin `host=localhost`/`user=postgres` en la cadena `PG:` — causaba `fe_sendauth: no password supplied`
- Reestructuración de clases 6–9 (2026-07-14): la Clase 6 repetía toda la Clase 3 (instalar PostGIS, usuario, ogr2ogr, Store) con nombres inconsistentes (`geobolivia`/`geoserver_ro`) y un GeoPackage — reescrita como Vistas SQL + GeoWebCache. La Clase 7 tenía 4 temas apretados — quedó solo OGC + CQL. Seguridad pasó a ser la Clase 8 nueva (`azimuth.html`, en ese momento). El quiz `test/ogcapi.html` era una copia idéntica del de PostGIS — reescrito con preguntas propias de OGC/CQL. Workspace unificado a `bolivia_curso` (antes aparecía `geoserver3_curso` en ogcapi/geodesia)
- Reestructuración de 9 a 8 clases (2026-07-21): se eliminó la Clase 9 "Proyecto final — IDE Municipal" como clase separada, junto con su tabla de criterios/porcentajes de evaluación. `geodesia.html` pasó a ser la Clase 8 (última clase), reescrita 100% como Seguridad, fusionando y mejorando el contenido que tenía `azimuth.html` (ahora deprecado, ver "Archivos deprecados" arriba) más un checklist final de producción. El proyecto final se mantiene solo como mención de cierre de esa clase (presentación breve del estudiante, sin rúbrica). `test/geodesia.html` se reescribió con las 12 preguntas de seguridad (antes en `test/azimuth.html`, ahora deprecado). Se actualizaron todas las referencias cruzadas en `index.html`, `test/index.html` y `meridian.html` (mapa del curso) para reflejar 8 clases · 16 horas.

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



