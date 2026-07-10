# GeoServer 3 — Guía de referencia: publicación de mapas

> Flujo completo: **Espacio de trabajo → Almacén de datos → Capas → Grupos de capas → Estilos**
> Ejemplos con contexto boliviano (departamentos, municipios, GeoBolivia, INRA Bolivia).

---

## 1. Espacio de trabajo (Workspace)

Un **espacio de trabajo** es un contenedor que organiza almacenes de datos, capas, grupos de capas y estilos. Es el equivalente a un *namespace* XML: agrupa recursos relacionados y evita colisiones de nombres entre proyectos distintos.

Ejemplo: dos capas llamadas `limites` pueden coexistir sin conflicto si una vive en el espacio de trabajo `mapas_bolivia` y otra en `catastro_lapaz`, porque cada capa se referencia como `mapas_bolivia:limites` y `catastro_lapaz:limites`.

### Campos al crear un espacio de trabajo nuevo

| Campo | Qué hace / para qué sirve |
|---|---|
| **Name** | Nombre corto del espacio de trabajo (sin espacios). Se usa como **prefijo** en el nombre de cada capa (`mapas_bolivia:municipios`) y como prefijo XML al generar documentos de capacidades (GetCapabilities). |
| **Namespace URI** | Identificador único del espacio de trabajo, con la misma sintaxis que una URL, pero **no necesita apuntar a un sitio real**; solo debe ser único en todo el servidor. Se recomienda usar un dominio propio con un sufijo distintivo, por ejemplo `http://www.arteclab.org/mapas_bolivia`. GeoServer lo usa internamente para declarar el `xmlns` de las respuestas WFS/WMS y para diferenciar recursos que, aunque compartan nombre, pertenezcan a espacios distintos. |
| **Espacio de trabajo por defecto (Default Workspace)** | Solo puede haber **uno** marcado como predeterminado en todo el servidor. Las capas de ese espacio pueden invocarse **sin el prefijo** en las URLs de servicio. Ejemplo: si `mapas_bolivia` es el predeterminado, la capa `mapas_bolivia:municipios` también responde como `municipios` directamente en `.../geoserver/wms`. |
| **Isolated Workspace** | Aísla el contenido del espacio de trabajo para que **no aparezca en los servicios globales** (WMS/WFS/WCS generales) ni en su documento de capacidades global. Solo es visible y consultable a través de un **servicio virtual** propio de ese espacio (`.../geoserver/mapas_bolivia/wms`). Es útil, por ejemplo, para que dos espacios de trabajo distintos reutilicen el **mismo Namespace URI** sin conflicto (uno de los dos debe ser aislado), algo común cuando se replican configuraciones de distintos clientes o cursos en el mismo servidor. |

**Ejemplo práctico ARTECLAB:** un espacio de trabajo `mapas_bolivia` (URI `http://www.arteclab.org/mapas_bolivia`), marcado como predeterminado, no aislado, contendrá todos los almacenes y capas de división política, hidrografía y catastro usados en el curso.

---

## 2. Almacén de datos (Data Store / Store)

Un **almacén de datos** define **cómo y dónde** GeoServer se conecta a una fuente de información geoespacial (shapefile, PostGIS, GeoPackage, WMS remoto, etc.). El almacén **no publica nada por sí solo**: solo abre la conexión. Publicar una capa a partir de ese almacén es un paso posterior.

### Caso de estudio: almacén de tipo Shapefile (directorio)

Con base en la imagen adjunta (formulario "Nuevo almacén de datos vectoriales – Directory of spatial files (shapefiles)"):

**Información básica del almacén**

| Campo | Descripción |
|---|---|
| **Espacio de trabajo** | Espacio de trabajo al que quedará asociado el almacén (ej. `mapas_bolivia`). Toda capa publicada desde este almacén heredará ese prefijo. |
| **Nombre del origen de datos** | Identificador interno del almacén dentro del espacio de trabajo (ej. `origen_mapas_bolivia`). No es el nombre de la capa; es el nombre de la *conexión*. |
| **Descripción** | Texto libre opcional para documentar el propósito del almacén (recomendado en cursos: anotar la fuente, ej. "Shapefiles división política — GeoBolivia 2024"). |

#### Detalle: **Habilitado (Enabled)**

Es un interruptor maestro a **nivel de almacén completo**, no de una capa individual. Si se desmarca:

- **Ninguna** capa publicada desde ese almacén responde a peticiones WMS, WFS o WCS — el cliente recibirá un error como si la capa no existiera.
- El almacén y todas sus capas **siguen visibles** en la interfaz web de administración y en la API REST, para que el administrador pueda editarlos o volver a habilitarlos sin perder la configuración.
- Es distinto de **borrar** el almacén: deshabilitar es reversible y no requiere reconfigurar nada; eliminar el almacén borra también las capas asociadas.

**Diferencia clave frente al "Enabled"/"Advertised" de una capa individual (ver sección 3.2):**

| Nivel | Efecto de desmarcar "Enabled" |
|---|---|
| **Almacén** | Apaga **todas** las capas de ese origen de datos a la vez. |
| **Capa** | Apaga solo **esa** capa; el resto del almacén sigue funcionando con normalidad. |
| **Capa → Advertised** | La capa **sigue respondiendo** a peticiones directas, pero desaparece del listado público (GetCapabilities) y del Layer Preview. |

**Casos de uso típicos en el curso:**
- **Mantenimiento:** se está actualizando el shapefile de `divisionPolitica` (reemplazando `.shp/.dbf/.shx`) y se quiere evitar que un cliente reciba datos a medio escribir → se desmarca *Habilitado*, se reemplazan los archivos, se marca *Recargar feature type* en cada capa, y se vuelve a habilitar el almacén.
- **Entorno de pruebas:** un almacén PostGIS que apunta a una base de datos de desarrollo se deja deshabilitado en el servidor de producción (Digital Ocean) hasta que el curso llegue a esa unidad, evitando exponer datos incompletos a los estudiantes que consultan el geovisor.
- **Diagnóstico de errores:** si GeoServer arranca lento o con errores en el log relacionados a un almacén específico (por ejemplo, una base PostgreSQL que no responde), deshabilitarlo temporalmente permite aislar el problema sin afectar el resto del servidor.

#### Detalle: **Auto disable on connection failure**

Si se activa, GeoServer **deshabilita automáticamente** el almacén (equivalente a desmarcar *Habilitado* por sí solo) cuando detecta fallos repetidos al intentar conectarse a la fuente de datos.

- **Por qué existe:** sin esta opción, cada petición de un cliente contra una capa cuyo almacén no responde (ej. PostgreSQL caído, VPN cortada, credenciales vencidas) dispara un nuevo intento de conexión que también falla, generando una cascada de errores en el log y demorando las respuestas de todo el servidor mientras cada intento agota su *timeout*.
- **Con la opción activada:** tras detectar el fallo, GeoServer marca el almacén como deshabilitado automáticamente, así las siguientes peticiones fallan de inmediato (sin reintentar la conexión) hasta que un administrador revise el problema y vuelva a habilitarlo manualmente.
- **Dónde es más relevante:** almacenes que dependen de una conexión externa activa (**PostGIS**, **PostGIS (JNDI)**, **WFS/WMS/WMTS en cascada**, cualquier base de datos remota). En un almacén de **shapefiles locales** casi no aplica, porque la "conexión" es solo acceso al disco del propio servidor, que rara vez falla de forma intermitente.
- **Ejemplo ARTECLAB:** el almacén PostGIS de producción en Digital Ocean, que alimenta capas catastrales INRA, tiene esta opción activada; si la base de datos se reinicia por mantenimiento, GeoServer aísla el almacén automáticamente en vez de saturar el log con reintentos, y el administrador recibe la alerta para reactivarlo cuando la base vuelva a estar disponible.

**Parámetros de conexión (específicos del tipo Shapefile)**

| Campo | Descripción |
|---|---|
| **Directorio de shapefiles** | Ruta (en formato URI `file:`) a la carpeta que contiene los `.shp`. Ejemplo: `file:data/shapefiles/Cartografia/mapaBases/divisionPolitica`. Un shapefile en realidad es un **conjunto de archivos** (`.shp`, `.dbf`, `.shx`, `.prj`, y opcionalmente `.cpg`, `.sbn`, etc.) que deben residir todos en la misma carpeta. El `.prj` es clave: sin él, GeoServer puede no determinar el sistema de referencia (SRS) correctamente. |
| **Conjunto de caracteres del DBF** | Codificación de texto del archivo `.dbf` (donde se guardan los atributos). `ISO-8859-1` es habitual en datos generados con software de escritorio en español (acentos, ñ). Si se elige mal, los nombres de municipios o departamentos aparecerán con caracteres corruptos. |
| **Crear índice espacial si no existe o está desactualizado** | Genera (o regenera) el índice espacial `.qix`/`.fix` que acelera las consultas por extensión geográfica (BBOX). Se recomienda mantenerlo activo salvo que el índice ya se administre externamente. |
| **Usar buffers de mapeo de memoria (Inhabilitar en Windows)** | Activa *memory-mapped I/O* para leer el shapefile más rápido aprovechando el caché del sistema operativo. En Linux/macOS mejora el rendimiento con archivos grandes; en Windows puede bloquear el archivo e impedir su edición mientras GeoServer lo tiene abierto, por eso se recomienda desactivarlo en ese sistema operativo. |

> **Nota:** un almacén de shapefiles (carpeta) puede contener **varios** archivos `.shp`; cada uno se publica como una capa independiente. Un almacén de un único archivo `.shp` publica exactamente una capa.

### 2.1 Panorama general: familias de almacenes en GeoServer

Al hacer clic en *Add new store*, GeoServer separa las opciones en tres grupos. Conocer esta clasificación ayuda a elegir el tipo correcto antes de entrar en detalle de parámetros:

| Familia | Qué conecta | Ejemplos |
|---|---|---|
| **Vector Data Sources** | Datos con geometría discreta (puntos, líneas, polígonos) | Shapefile, Directory of shapefiles, **PostGIS**, **PostGIS (JNDI)**, GeoPackage, Oracle NG, Microsoft SQL Server, Web Feature Server (NG) |
| **Raster Data Sources** | Imágenes/superficies continuas (ortofotos, DEM, satelitales) | GeoTIFF, ImageMosaic, WorldImage, ArcGrid, GeoPackage (ráster), ImagePyramid |
| **Cascaded stores (servicios remotos)** | Servicios OGC de **otro** servidor que GeoServer reexpone como si fueran propios | Web Feature Server (NG), Web Map Server (WMS Store), Web Map Tile Server (WMTS Store) |

A continuación se detalla cada tipo relevante para el curso, con sus campos de conexión.

### 2.2 PostGIS (almacén estándar)

**PostGIS** es la base de datos espacial de código abierto sobre PostgreSQL, y es el almacén más usado en proyectos SIG profesionales, porque permite consultas espaciales avanzadas (a diferencia del shapefile, que es solo un archivo plano). GeoServer crea internamente un **pool de conexiones** hacia la base de datos (ver sección 2.4).

**Información básica del almacén** — mismos campos que cualquier almacén: Espacio de trabajo, Nombre del origen de datos, Descripción, Habilitado.

**Parámetros de conexión**

| Campo | Descripción |
|---|---|
| **host** | Dirección o nombre del servidor donde corre PostgreSQL/PostGIS (ej. `localhost`, o la IP de la VM Debian 13 en el laboratorio, `192.168.X.X`). |
| **port** | Puerto TCP del servicio PostgreSQL. Por defecto `5432`. |
| **database** | Nombre de la base de datos a la que se conecta (ej. `bolivia_sig`). |
| **schema** | Esquema dentro de esa base (ej. `public`). Es **muy recomendable** especificarlo siempre: si se deja vacío, GeoServer listará tablas de todos los esquemas visibles para el usuario, lo cual es lento y puede exponer tablas no deseadas. |
| **user / passwd** | Credenciales de conexión. Deben tener al menos permiso de lectura (`SELECT`) sobre las tablas a publicar; si se quiere edición vía WFS-T, además `INSERT`/`UPDATE`/`DELETE`. |
| **Expose primary keys** | Si se activa, el valor de la clave primaria de cada tabla se expone como atributo de la capa, lo que facilita construir filtros CQL por ID. No permite modificar ese valor vía WFS-T (cualquier intento se ignora silenciosamente). |
| **Loose bbox** | Si se activa, el filtro espacial `BBOX` solo compara contra el **rectángulo envolvente** de cada geometría (usando el índice espacial), sin verificar la geometría exacta. Es mucho más rápido, pero puede incluir features que en realidad no intersectan el área exacta. Recomendado para WMS (visualización); **no recomendado** para WFS con filtrado BBOX estricto. |
| **Estimated extends** | Usa la información ya calculada por el índice espacial de PostGIS para estimar rápidamente la extensión (bounding box) de la tabla, en lugar de recorrer todas las filas. Acelera mucho el cálculo del *Native Bounding Box* en capas grandes. |
| **fetch size** | Cantidad de registros que se traen en cada viaje de red hacia la base de datos (por defecto 1000). Un valor muy bajo (<50) penaliza el rendimiento por la latencia de red repetida; un valor muy alto puede consumir demasiada memoria del proceso de GeoServer. |
| **Connection timeout** | Segundos que el pool espera antes de desistir al intentar obtener una conexión nueva (por defecto 20). |
| **min connections / max connections** | Tamaño mínimo y máximo del pool de conexiones reservado para este almacén (por defecto 1 y 10). Cada almacén PostGIS mantiene su **propio pool**; si se crean muchos almacenes hacia la misma base, el total de conexiones abiertas puede acercarse al límite del servidor PostgreSQL (por defecto 100). |
| **validate connections** | Verifica que una conexión tomada del pool siga siendo válida antes de usarla (protege contra cortes de red o timeouts del servidor), a cambio de una pequeña penalización de rendimiento por la consulta de verificación. |
| **Test while idle / Evictor tests per run / Max connection idle time / Evictor run periodicity** | Parámetros avanzados que controlan un proceso en segundo plano (*evictor*) que revisa periódicamente las conexiones inactivas del pool y cierra las que llevan demasiado tiempo sin uso, liberando recursos. Solo se recomienda tocarlos en instalaciones con mucho tráfico o problemas de conexiones "zombis". |
| **preparedStatements** | Usa *prepared statements* SQL en vez de consultas construidas como texto. Ventaja: elimina el riesgo de inyección SQL a través de filtros CQL. Con PostGIS **se recomienda dejarlo desactivado**, porque PostgreSQL puede optimizar mejor el plan de consulta espacial (decidir entre escaneo secuencial o uso del índice espacial) cuando ve el valor real del BBOX en cada consulta. |
| **Encode functions** | Permite que ciertas funciones usadas en filtros CQL se traduzcan a funciones nativas de PostgreSQL (más eficiente) en vez de evaluarse en memoria dentro de GeoServer. |

> **Requisito de edición (WFS-T):** una tabla PostGIS solo es editable desde GeoServer si tiene **clave primaria**. Sin ella, la capa se sirve en modo solo lectura.
> **Rendimiento:** siempre crear un **índice espacial** (`CREATE INDEX ... USING GIST (geom)`) en la columna de geometría; sin él, cualquier consulta por extensión será lenta sin importar la configuración del almacén.

**Ejemplo ARTECLAB:** almacén `bolivia_catastro` → host `192.168.X.X` (VM del laboratorio), puerto `5432`, base `geo_bolivia`, esquema `public`, con *Loose bbox* activado (el uso principal es visualización WMS en el geovisor) y *preparedStatements* desactivado.

### 2.3 PostGIS (JNDI)

Variante del almacén PostGIS donde **GeoServer no administra el pool de conexiones directamente**; en su lugar, delega esa tarea al contenedor de aplicaciones (**Tomcat**), que expone el pool mediante **JNDI** (*Java Naming and Directory Interface*, un mecanismo estándar de Java para "buscar" recursos configurados por nombre).

**Parámetros de conexión**

| Campo | Descripción |
|---|---|
| **jndiReferenceName** | Nombre lógico del recurso JNDI configurado en Tomcat (ej. `java:comp/env/jdbc/geo_bolivia`), en vez de host/puerto/usuario/contraseña directos. |
| **schema** | Igual que en PostGIS estándar: el esquema dentro de la base. |
| El resto de parámetros de comportamiento (**Loose bbox**, **Estimated extends**, **Expose primary keys**, etc.) | Se configuran igual que en el almacén PostGIS estándar. |

**¿Cuándo usar JNDI en vez de PostGIS estándar?**

| Escenario | Recomendación |
|---|---|
| Un solo servidor GeoServer, pocas conexiones a bases distintas | PostGIS estándar es más simple de configurar. |
| Se quiere que el **administrador de Tomcat** (no el de GeoServer) controle credenciales y límites del pool, por políticas de seguridad de la organización | PostGIS (JNDI). |
| Varias capas/almacenes distintos deben **compartir un mismo pool de conexiones** hacia la misma base (evitando abrir un pool separado por cada esquema/almacén) | PostGIS (JNDI), configurando el `<Resource>` una sola vez en `server.xml` o `context.xml` de Tomcat. |
| Se requiere reemplazar credenciales sin tocar la configuración de GeoServer (rotación de contraseñas gestionada a nivel de infraestructura) | PostGIS (JNDI). |

**Requisito de instalación:** el driver JDBC de PostgreSQL debe colocarse en `$TOMCAT_HOME/lib` (no en `WEB-INF/lib` de GeoServer), y el `<Resource>` JNDI debe declararse en la configuración de Tomcat (`context.xml` o `server.xml`) antes de crear el almacén en GeoServer.

### 2.4 Pool de conexiones (Connection Pooling) — concepto transversal

Aplica a **todo almacén respaldado por una base de datos** (PostGIS, PostGIS JNDI, Oracle, SQL Server). Cada vez que GeoServer necesita leer datos de una tabla, primero necesita una conexión abierta hacia la base; abrir una conexión nueva tiene un costo de tiempo no despreciable. Un **pool de conexiones** mantiene conexiones ya abiertas y listas, de modo que solo la primera petición paga ese costo — las siguientes reutilizan una conexión existente. Esto es clave para el rendimiento de cualquier curso o demo en vivo donde varios estudiantes consultan el mismo servidor simultáneamente.

### 2.5 GeoPackage

**GeoPackage** (`.gpkg`) es un estándar OGC basado en **SQLite**: un único archivo puede contener múltiples capas **vectoriales y ráster** a la vez, con sus propios índices espaciales, a diferencia del shapefile (que necesita varios archivos por capa y solo admite un tipo de geometría por capa).

**Parámetros de conexión**

| Campo | Descripción |
|---|---|
| **database** | Ruta al archivo `.gpkg` en el sistema de archivos del servidor (ej. `file:data/geopackages/bolivia_sig.gpkg`). |
| **Otros parámetros de rendimiento** (Batch insert size, etc.) | Similares en espíritu a los de PostGIS, pero aplicados sobre SQLite en lugar de PostgreSQL. |

**Ventaja pedagógica:** para el curso, un único `.gpkg` puede sustituir a toda una carpeta de shapefiles sueltos (departamentos, municipios, ríos, ciudades), simplificando la distribución de material a los estudiantes: un solo archivo autocontenido en vez de decenas de archivos `.shp/.dbf/.shx/.prj`.

### 2.6 Almacenes en cascada (servicios remotos: WFS, WMS, WMTS)

Un almacén "en cascada" no lee un archivo ni una base de datos: se conecta a un **servicio OGC de otro servidor** y lo reexpone como si fuera propio. Es útil cuando se quiere combinar datos de terceros (por ejemplo, GeoBolivia o INRA Bolivia) con las capas propias del curso, sin copiar los datos originales.

| Tipo de almacén | Qué hace | Parámetro principal |
|---|---|---|
| **Web Feature Server (NG)** — WFS en cascada | Se conecta a un WFS remoto y trae sus **features** (geometría + atributos), permitiendo aplicarles estilos y combinarlos con capas propias en un mismo GetMap. | **Capabilities URL** — la URL del `GetCapabilities` del servicio remoto, ej. `https://geo.gob.bo/geoserver/ows?service=wfs&version=1.0.0&request=GetCapabilities`. |
| **Web Map Server (WMS Store)** — WMS en cascada | Se conecta a un WMS remoto y reexpone sus capas como **imágenes ya renderizadas** por el servidor de origen (GeoServer no puede reestilizarlas, solo las reenvía o recombina como imagen). Útil como capa base de fondo. | **Capabilities URL** del WMS remoto (ej. `.../wms?service=WMS&version=1.3.0&request=GetCapabilities`). |
| **Web Map Tile Server (WMTS Store)** — WMTS en cascada | Igual que el WMS en cascada, pero el remoto entrega **teselas pre-cacheadas**, lo cual es más rápido para mapas base de referencia (ej. una capa base de OpenStreetMap servida como WMTS). | **Capabilities URL** del WMTS remoto. |

**Por qué usar cascada en vez de copiar el dato:** si GeoBolivia actualiza su capa de `municipios`, el almacén en cascada de ARTECLAB refleja el cambio automáticamente en la siguiente petición, sin que el instructor tenga que volver a descargar y republicar el shapefile.

**Limitación importante para explicar en clase:** un WMS/WMTS en cascada entrega **imágenes**, no geometría; por lo tanto no se puede aplicar un estilo SLD propio ni hacer consultas GetFeatureInfo con la misma granularidad que sobre datos vectoriales propios. Un WFS en cascada sí trae geometría real y admite reestilizado.

### 2.7 Almacenes ráster (Coverage Stores)

Se agrupan aparte porque publican **coberturas** (imágenes georreferenciadas continuas), no *features* discretos.

| Tipo | Uso típico |
|---|---|
| **GeoTIFF** | Un único archivo `.tif` georreferenciado (ortofoto, DEM). Es el formato ráster más simple de publicar: un archivo, una capa. |
| **WorldImage** | Imágenes comunes (JPEG, PNG, TIFF) acompañadas de un archivo de mundo (`.jgw`, `.pgw`, etc.) que contiene la georreferenciación por separado. |
| **ImageMosaic** | Publica **muchos** archivos ráster (ej. un conjunto de ortofotos por cuadrante, o imágenes satelitales de distintas fechas) como si fueran una sola capa continua. GeoServer genera un índice (por defecto un shapefile interno) que asocia cada archivo con su extensión geográfica, y solo carga en cada petición los archivos que realmente intersectan el área solicitada. Es la base técnica para series temporales ráster (ej. precipitación mensual) combinadas con la pestaña Dimensiones. |
| **ArcGrid** | Formato de rejilla ASCII de ESRI, común en datos de modelos hidrológicos o de elevación de fuentes académicas/gubernamentales. |
| **GeoPackage (ráster)** | El mismo archivo `.gpkg` de la sección 2.5 puede alojar también capas ráster (teselas pre-generadas dentro del propio GeoPackage). |
| **ImagePyramid** | Estructura de varias resoluciones del mismo ráster (similar a un "mapa de bits piramidal"), pensada para servir imágenes muy grandes con buen rendimiento a distintos niveles de zoom sin recurrir a GeoWebCache. |

**Ejemplo ARTECLAB:** una serie de ortofotos de un municipio boliviano, entregadas por cuadrantes, se publica como **ImageMosaic** en vez de crear un GeoTIFF por cuadrante; el estudiante ve una sola capa continua, y GeoServer decide internamente qué archivos cargar según el área visible del mapa.

---

## 3. Capas (Layers)

Una **capa** es la unidad publicable: convierte un recurso de un almacén de datos (una tabla, un shapefile, una banda ráster) en un servicio consumible vía WMS/WFS/WCS. Al editar una capa existente se presentan varias pestañas.

### 3.1 Pestaña **Datos**

Es la pestaña activa por defecto y define los parámetros propios del recurso.

**Información básica / metadatos**
- **Name** — identificador usado en las peticiones de servicio (debe ser único dentro del espacio de trabajo).
- **Title / Abstract / Keywords** — metadatos legibles que aparecen en el documento de capacidades (GetCapabilities) y ayudan a los clientes SIG a listar la capa de forma comprensible.

**Vínculos a metadatos y Enlaces de datos** *(ver imagen adjunta)*
- **Vínculos a metadatos (Metadata links):** permiten enlazar la capa a un documento de metadatos externo, en los estándares **FGDC** (Federal Geographic Data Committee, EE. UU.) o **TC211** (ISO 19115, estándar internacional de metadatos geográficos). Aparecen en el GetCapabilities para que un cliente SIG externo pueda descargar la ficha de metadatos completa de la capa. *Nota importante mostrada por GeoServer:* en las capacidades de WMS 1.1.1 solo se listan enlaces de tipo FGDC y TC211; otros formatos no se anuncian ahí.
- **Enlaces de datos (Data links):** enlaces a un recurso de descarga de los datos crudos (por ejemplo, un `.zip` con el shapefile original en un repositorio). Es informativo: no controla el servicio, solo se publica en las capacidades para que el usuario final sepa dónde conseguir el dato fuente.

**Sistema de referencia (CRS/SRS)**
- **Native SRS** — el sistema de coordenadas en el que está almacenado realmente el dato.
- **Declared SRS** — el sistema de coordenadas que GeoServer **anuncia** a los clientes.
- **SRS Handling** — qué hacer cuando ambos difieren:
  - *Force declared* (por defecto): impone el SRS declarado sobre el nativo. Es la opción recomendada porque el código declarado viene de la base EPSG con información completa (área de validez, rutas de transformación).
  - *Reproject native to declared*: reproyecta realmente los datos al SRS declarado.
  - *Keep native*: conserva el SRS nativo tal cual, ignorando el declarado.

**Bounding Box (extensión)**
- **Native Bounding Box** — extensión de los datos en el SRS nativo/declarado. Se genera con el botón *Compute from data* (lee la geometría real) o *Compute from SRS bounds* (usa el área de validez teórica del SRS).
- **Lat/Lon Bounding Box** — la misma extensión pero expresada siempre en coordenadas geográficas (EPSG:4326), obligatoria en toda capa WMS. Se calcula con *Compute from native bounds*.

**Control de geometrías curvas** *(ver imagen adjunta)*
- **Geometrías lineales pueden contener arcos circulares:** informa al codificador GML de que la capa puede tener curvas verdaderas (arcos), para que las codifique como `gml:Curve` en vez de `gml:LineString`. Solo aplica a fuentes que soporten geometría curva (Oracle Spatial, *Property DataStore*); en un shapefile o PostGIS estándar normalmente queda sin marcar.
- **Tolerancia de linealización:** solo es relevante si la capa sí tiene geometrías curvas; define cuánto se puede "aplanar" un arco a segmentos rectos cuando un cliente no soporta curvas.

**Detalles del Feature Type (solo capas vectoriales)**
Es la tabla de atributos detectados automáticamente desde la fuente de datos. En el ejemplo adjunto:

| Propiedad | Tipo | Nulo permitido |
|---|---|---|
| `the_geom` | MultiPolygon | true |
| `FIRST_NOM_` | String | true |
| `COUNT` | Long | true |
| `COD` | String | true |

- **`the_geom`** es el atributo geométrico (en shapefiles casi siempre se llama así por defecto).
- **Customize attributes** permite editar manualmente tipo, alias o nulabilidad de un atributo, sin modificar el dato fuente.
- **Recargar feature type (Reload feature type)** — vuelve a leer el esquema desde el origen. Se usa cuando el shapefile fue editado externamente en QGIS/ArcGIS (se agregaron o quitaron campos) y GeoServer aún tiene el esquema antiguo en caché; no hace falta recrear la capa, solo recargar.

**Feature Filtering**
- **Restringir las features de la capa mediante filtro CQL:** aplica un filtro **CQL** (*Common Query Language*, el lenguaje de consulta propio de GeoServer/GeoTools) que limita qué features se publican, sin tocar el dato original. Ejemplo boliviano: para publicar solo el departamento de Cochabamba desde una capa nacional de `departamentos`:
  ```
  DEPARTAMEN = 'COCHABAMBA'
  ```
  El filtro **solo afecta lecturas**: si la capa admite edición vía WFS-T y se inserta una entidad que no cumple el filtro, se guarda en el almacén igual, pero no aparecerá en las salidas del servicio.

### 3.2 Pestaña **Publicación**

Configura cómo se expone la capa a nivel de servicio (HTTP, WMS, WFS, WCS).

- **Enabled** — si está desactivado, la capa no responde a ninguna petición (pero sigue en la configuración/REST).
- **Advertised** — si está desactivado, la capa sigue funcionando ante peticiones directas (GetMap, GetFeature) pero **no aparece** en el documento de capacidades ni en el Layer Preview. Útil para capas auxiliares que solo se consumen dentro de un grupo de capas.
- **HTTP Settings (caché de respuesta):** *Response Cache Headers* evita que el navegador/cliente vuelva a pedir el mismo tile dentro del *Cache Time* (por defecto 3600 s = 1 hora).
- **WMS Settings:**
  - *Default Style / Additional styles* — estilo que se aplica cuando el cliente no especifica uno, y estilos alternativos disponibles para el usuario.
  - *Default rendering buffer* — margen (en píxeles) agregado alrededor del área solicitada al renderizar, útil para símbolos grandes o etiquetas que se recortarían en el borde del tile.
  - *Attribution* (texto, enlace, logo) — créditos del proveedor del dato, visibles en algunos visores.
  - *Root Layer in Capabilities* — controla si esta capa aparece envuelta en el elemento raíz `<Layer>` del documento de capacidades o como raíz directa (relevante solo si es la única capa expuesta en ese servicio).
- **WFS Settings** (si el recurso es vectorial) — límite máximo de features por respuesta (*Per-Request Feature Limit*) y máximo de decimales en salidas GML, además de la lista de SRS alternativos anunciados (OtherSRS).

### 3.3 Pestaña **Dimensiones**

Permite habilitar las dimensiones estándar **TIME** y **ELEVATION** (y dimensiones personalizadas) definidas en WMS 1.1.1/1.3.0, útiles para series temporales (ej. imágenes satelitales mensuales) o datos con profundidad/altitud.

| Campo | Descripción |
|---|---|
| **Attribute / End attribute** | Atributo del feature que contiene el valor de la dimensión (y, opcionalmente, el atributo de fin de rango). |
| **Presentation** | Cómo se listan los valores en el GetCapabilities: *List* (todos los valores discretos), *Interval/resolution* (rango con paso fijo) o *Continuous interval* (rango continuo). |
| **Default value** | Estrategia para el valor por defecto cuando el cliente no lo especifica: valor más pequeño, más grande, más cercano a un valor de referencia, o un valor de referencia fijo. |
| **Nearest match** | Si se habilita, GeoServer acepta el valor más cercano disponible cuando el cliente pide un valor exacto que no existe. |

Ejemplo de uso boliviano: una capa de precipitación mensual de GeoBolivia con atributo `fecha` como dimensión TIME, presentación *List*, valor por defecto "el más reciente disponible".

### 3.4 Pestaña **Cacheado de Teselas (Tile Caching)**

Configura el **GeoWebCache** integrado, que pre-genera y almacena "teselas" (tiles) de imagen para servir mapas mucho más rápido que renderizando bajo demanda cada vez (WMTS/TMS).

| Concepto | Descripción |
|---|---|
| **Enabled** | Activa el cacheo de teselas para esta capa específica. |
| **Gridsets / Available gridsets** | Esquemas de teselado (cuadrícula de zoom y proyección) que se cachearán, ej. `EPSG:900913` (Web Mercator, el usado por Google Maps/OpenStreetMap) o `EPSG:4326` (geográfico). |
| **Formatos de imagen** | Formatos en que se guardan las teselas (PNG, JPEG, etc.), configurables por tipo de capa (vector, ráster, grupo). |
| **Metatiling** | En vez de generar una tesela a la vez, GeoServer renderiza un bloque más grande de teselas juntas (por defecto 4×4) y luego lo recorta. Esto evita que etiquetas o símbolos queden cortados justo en el borde de una tesela, y acelera el *seeding* masivo. |
| **Gutter** | Margen extra (píxeles) alrededor de cada tesela al renderizar, complementario al metatiling, para reducir problemas de recorte en geometrías/etiquetas de borde. |
| **Parameter Filters** | Permiten cachear variantes de la misma capa según parámetros WMS como `STYLES` o `TIME` (por ejemplo, una caché distinta por cada estilo alternativo). |
| **Seed / Truncate / Empty** | *Seed* pre-genera teselas para una zona y rango de zoom (recomendable antes de una clase o demo en vivo, para que la capa cargue instantáneamente). *Truncate* elimina teselas de niveles de zoom específicos. *Empty* borra toda la caché de la capa. |

> **Concepto clave:** cachear no cambia el dato, solo acelera su entrega. Si el shapefile o la tabla PostGIS cambian, hay que volver a *seedear* (o el usuario verá teselas desactualizadas hasta que expiren).

### 3.5 Pestaña **Seguridad**

Define **reglas de acceso a datos** a nivel de capa: qué roles pueden leer (`READ`), escribir (`WRITE`) o administrar (`ADMIN`) la capa, dentro del subsistema de seguridad de GeoServer (integrado con su motor de autenticación/autorización). Estas reglas se combinan con las definidas a nivel de espacio de trabajo (más generales) y a nivel global; la regla más específica que aplica a un rol es la que prevalece. Es el mecanismo típico para, por ejemplo, dejar visibles las capas de división política pero restringir la edición o consulta de una capa catastral sensible (predios INRA) solo a un rol `editor_geoserver`.

---

## 4. Grupos de capas (Layer Groups)

Un **grupo de capas** agrupa varias capas (u otros grupos) bajo un único nombre, para poder pedirlas en una sola petición WMS en vez de listar cada capa individualmente. También fija un **orden de dibujo** consistente y puede asignar estilos alternativos por capa dentro del grupo.

### Modos disponibles

| Modo | Comportamiento |
|---|---|
| **Single (sencillo)** | Se expone como una sola capa con nombre propio (alias de la lista de capas). Las capas individuales **siguen** apareciendo como entradas de nivel superior en el GetCapabilities. |
| **Opaque (opaco)** | Igual que *Single*, pero las capas internas **no** se listan por separado en las capacidades; el cliente solo ve el grupo como un todo, útil para presentar un "mapa base" como una sola unidad sin exponer sus componentes. |
| **Named tree (árbol con nombre)** | Se expone como una jerarquía con nombre propio; el cliente puede solicitar tanto el grupo completo como cada subcapa. |
| **Container tree (árbol contenedor)** | Aparece en las capacidades solo como categoría organizativa, **sin nombre invocable** — no se puede pedir como capa única, solo sirve para agrupar visualmente en el árbol de capas del cliente. |
| **Earth Observation (EO) tree** | Modo especializado para el perfil WMS de observación terrestre: no renderiza directamente las capas anidadas, solo expone una "capa de vista previa" (*Root Layer*). |

### Otros campos relevantes

- **Bounds / Projection** — el grupo reproyecta automáticamente todas sus capas a una proyección común, aunque las capas de origen tengan SRS distintos entre sí.
- **Painter's model (modelo del pintor)** — el orden de la lista de capas define el orden de dibujo: la primera capa se pinta primero (queda debajo), la última se pinta al final (queda arriba). Por eso conviene poner primero los mapas base (ej. límites departamentales) y al final las capas puntuales (ej. ciudades, puntos de interés).
- **Layer Group Style** — permite definir un estilo alterno para todo el grupo (una combinación distinta de estilos por capa), disponible solo en modo *Single* u *Opaque*.
- **Enabled / Advertised / Queryable** — mismo significado que en una capa individual; *Queryable* controla si el grupo responde a GetFeatureInfo (por defecto lo hace si al menos una capa interna es consultable).
- **Security** — igual que en capas, reglas de acceso por rol a nivel del grupo completo.

**Ejemplo boliviano:** un grupo de capas `mapa_base_bolivia` en modo *Opaque*, con orden: `departamentos` (fondo) → `municipios` → `rios_principales` → `ciudades_capitales` (encima de todo), expuesto como una sola capa consumible desde el visor OpenLayers del geovisor ARTECLAB.

---

## 5. Estilos (Styles)

Un **estilo** define **cómo se dibuja visualmente** una capa (colores, símbolos, grosores, etiquetas, reglas por rango de valores). Es un recurso independiente de la capa: el mismo estilo puede reutilizarse en varias capas, y una capa puede tener varios estilos disponibles para que el cliente elija.

### Lenguajes de estilo soportados

| Lenguaje | Descripción |
|---|---|
| **SLD (Styled Layer Descriptor)** | Estándar OGC basado en XML. Es el formato nativo y disponible por defecto sin instalar nada adicional. Es el más verboso pero el más universalmente compatible. |
| **CSS** | Sintaxis similar a CSS de hojas de estilo web, más compacta y legible; se traduce internamente a SLD. Requiere la extensión `css`. |
| **YSLD** | Equivalente a SLD pero en sintaxis YAML, pensado para autoría más rápida y legible. Requiere la extensión `ysld`. |
| **MBStyle** | Sintaxis basada en JSON, orientada a interoperabilidad con clientes tipo Mapbox GL. Requiere la extensión `mbstyle`. |

### Pestañas del editor de estilos

- **Datos (Data)** — información básica del estilo y el editor de código donde se escribe/pega la definición (SLD/CSS/YSLD/MBStyle). Incluye botones para generar un estilo por defecto a partir de una plantilla interna y para **validar** la sintaxis antes de guardar.
- **Publicación (Publishing)** — muestra qué capas están usando actualmente este estilo, útil para medir el impacto antes de modificarlo.
- **Layer Preview** — previsualiza el estilo aplicado sobre una capa real mientras se edita, sin necesidad de guardar primero.
- **Layer Attributes** — lista los atributos disponibles de la capa asociada, para saber qué nombres de campo usar en las reglas del estilo (por ejemplo, al estilizar por categoría usando el atributo `COD` de un shapefile de municipios).

### Formas de aplicar un estilo

1. **Estilo del catálogo (por defecto):** el más común. Se sube/crea en la página *Styles*, y luego se asigna como *Default style* o *Additional style* desde la pestaña **Publicación** de la capa.
2. **Estilo externo (SLD_BODY / SLD=url):** un cliente puede enviar un SLD completo en la propia petición WMS (`GetMap`), sin que ese estilo exista guardado en el catálogo de GeoServer. Útil para pruebas rápidas o clientes que generan estilos dinámicamente.
3. **Modo librería (Library mode):** el cliente especifica capas y estilos con los parámetros estándar `LAYERS`/`STYLES`, y además adjunta un SLD externo adicional; ese SLD externo actúa como una extensión temporal del catálogo de estilos, y sus definiciones tienen prioridad sobre las del catálogo si hay coincidencia de nombre.

**Ejemplo boliviano:** un estilo CSS llamado `division_politica` que colorea el polígono `departamentos` con un color de relleno distinto según el atributo `DEPARTAMEN`, y un segundo estilo `division_politica_etiquetas` que agrega el nombre del departamento como etiqueta centrada — ambos disponibles como *Additional styles* de la misma capa, para que el estudiante alterne entre "solo colores" y "colores + etiquetas" en el Layer Preview.

---

## Resumen del flujo completo

```
Espacio de trabajo (mapas_bolivia)
   └─ Almacén de datos (origen_mapas_bolivia → shapefiles de divisionPolitica)
         └─ Capa (departamentos_bolivia)
               ├─ Datos: SRS, bounding box, atributos, filtro CQL
               ├─ Publicación: estilo por defecto, WMS/WFS settings
               ├─ Dimensiones: (si aplica, TIME/ELEVATION)
               ├─ Cacheado de Teselas: gridsets, metatiling, seed
               └─ Seguridad: reglas de acceso por rol
         └─ Grupo de capas (mapa_base_bolivia)
               └─ combina varias capas con orden y estilo propios
   └─ Estilos (SLD / CSS / YSLD / MBStyle)
         └─ se asignan a una o varias capas del espacio de trabajo
```

---

*Documento de referencia — curso GeoServer 3, ARTECLAB.*