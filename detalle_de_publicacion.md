# Guión de narración — GeoServer 3: de cero a mapa publicado

> Formato: video tutorial de pantalla compartida (no short vertical).
> Uso: leer/narrar mientras muestras cada ventana de GeoServer en vivo.
> Cobertura: **cada propiedad del documento técnico de referencia está presente aquí**, sin recortes —
> solo cambia la forma en que se dice, no lo que se dice.
> Tono: cercano, seguro, de instructor que domina el tema.
> Los CTA hacia tus cursos (GeoServer, Flutter + GIS, Webmapping con IA, GeoServer + MCP) están marcados
> como `[CTA discreto]` — una frase, nunca un bloque publicitario.

---

## Apertura — el porqué antes que el cómo

**[EN PANTALLA: panel de bienvenida de GeoServer, limpio, sin nada publicado todavía]**

Todo mapa que ves funcionando en internet —el catastro de tu municipio, el visor de riesgos de un ministerio, ese mapa interactivo que te sorprendió una vez— pasó por exactamente los mismos cinco pasos que vamos a recorrer hoy.

No son cinco pasos opcionales. Son cinco decisiones. Y la mayoría de los problemas que vas a tener publicando mapas en GeoServer —capas que no cargan, colores que no aparecen, servicios lentísimos— nacen de saltarse uno de estos pasos, o de no entender para qué sirve cada campo del formulario.

Así que vamos a hacerlo distinto: no vamos a memorizar botones, vamos a entender **cada propiedad**, una por una, con el criterio detrás. Porque un botón se olvida. Un criterio, no.

El camino es este: **espacio de trabajo → almacén de datos → capa → grupo de capas → estilo.** Cinco piezas. Vamos con la primera.

---

## 1. Espacio de trabajo — el casillero con nombre

**[EN PANTALLA: menú Workspaces → Add new workspace]**

Antes de subir un solo dato, GeoServer te pide algo muy simple: dónde vas a guardarlo.

Piensa en el espacio de trabajo como el nombre del cajón. Si tienes dos proyectos —división política de Bolivia y catastro de La Paz— y guardas todo sin cajones, tarde o temprano vas a tener dos capas llamadas `limites` peleándose por el mismo nombre. Con espacios de trabajo, eso jamás pasa: una vive en `mapas_bolivia`, la otra en `catastro_lapaz`, y cada una se llama por su nombre completo: `mapas_bolivia:limites`, `catastro_lapaz:limites`.

Al crear uno, GeoServer te pide cuatro campos, y los cuatro tienen truco.

**Name.** El nombre corto del cajón, sin espacios. Cumple dos funciones a la vez: se convierte en el **prefijo** de cada capa que guardes ahí adentro, y también es el prefijo XML que GeoServer usa al generar los documentos de capacidades —esos GetCapabilities que cualquier cliente SIG lee para saber qué hay disponible.

**Namespace URI.** La que más confunde al principio. Parece una URL, pero **no lo es**: no necesita llevarte a ningún sitio web real, solo necesita ser única en todo tu servidor. Es como el ISBN de un libro —un código que identifica sin ambigüedad, no una dirección a la que vayas a tocar la puerta. GeoServer la usa internamente para declarar el `xmlns` de las respuestas WFS y WMS, y para diferenciar recursos que, aunque compartan nombre, pertenezcan a espacios distintos. Mi recomendación de siempre: usa tu propio dominio con un sufijo claro, por ejemplo `http://www.arteclab.org/mapas_bolivia`.

**Espacio de trabajo por defecto.** Solo puede haber uno en todo el servidor. Las capas que viven ahí se pueden pedir **sin escribir el prefijo**. Es la diferencia entre `mapas_bolivia:municipios` y simplemente `municipios` directamente en la URL del servicio.

**Isolated Workspace.** El más avanzado de los cuatro. Cuando lo activas, ese espacio de trabajo **deja de aparecer en los servicios globales** de GeoServer —WMS, WFS, WCS generales— y en su documento de capacidades global. Solo es visible y consultable a través de su propio **servicio virtual**, algo como `.../geoserver/mapas_bolivia/wms`. ¿Para qué sirve en la vida real? Para cuando necesitas que **dos** espacios de trabajo distintos reutilicen el **mismo** Namespace URI sin pisarse entre sí —uno de los dos debe quedar aislado. Pasa más seguido de lo que crees cuando administras varios proyectos o clientes en un mismo servidor.

`[CTA discreto]` Esta es exactamente la clase de decisión de arquitectura que marca la diferencia entre un GeoServer que crece ordenado durante años y uno que en seis meses es un cajón de sastre imposible de mantener —y es de las primeras cosas que ordenamos juntos en el curso completo de GeoServer.

Con el espacio de trabajo listo, ya tenemos el cajón. Ahora necesitamos algo que meter adentro.

---

## 2. Almacén de datos — el puente hacia tu información

**[EN PANTALLA: Data → Stores → Add new store, mostrando el listado de tipos disponibles]**

Aquí hay un malentendido que quiero desarmar de entrada: **el almacén de datos no publica nada todavía.** Lo único que hace es decirle a GeoServer "aquí hay información, y así es como te conectas a ella". Publicar viene después, con las capas.

GeoServer organiza los almacenes en tres grandes familias:

- **Fuentes vectoriales** —datos con geometría discreta: puntos, líneas, polígonos. Shapefile, Directorio de shapefiles, PostGIS, PostGIS vía JNDI, GeoPackage, Oracle NG, SQL Server, Web Feature Server en cascada.
- **Fuentes ráster** —imágenes y superficies continuas: GeoTIFF, ImageMosaic, WorldImage, ArcGrid, GeoPackage ráster, ImagePyramid.
- **Servicios en cascada** —no son datos tuyos, son servicios de **otro** servidor que GeoServer reexpone: Web Feature Server, Web Map Server, Web Map Tile Server.

Vamos por los que de verdad vas a usar para publicar mapas reales.

### 2.1 Shapefile en carpeta — el punto de partida de casi todos

**[EN PANTALLA: formulario de Directory of shapefiles con los campos ya llenos]**

Hay algo que casi nadie te dice a tiempo: **un shapefile nunca es un solo archivo.** Es un conjunto —`.shp`, `.dbf`, `.shx`, y el que de verdad importa y que la gente olvida: el `.prj`. Sin ese archivo, GeoServer puede quedarse sin saber en qué sistema de coordenadas está parado tu dato, y ahí empiezan los mapas que "aparecen" en medio del océano.

La **información básica del almacén** tiene cinco campos:

- **Espacio de trabajo** —a qué cajón queda asociado; toda capa publicada desde este almacén hereda ese prefijo.
- **Nombre del origen de datos** —el identificador de la conexión, no de la capa. Aquí, por ejemplo, `origen_mapas_bolivia`.
- **Descripción** —texto libre para documentar la fuente. En un curso, anota siempre de dónde salió el dato: "Shapefiles división política — GeoBolivia 2024".
- **Habilitado.** Y aquí me quiero detener, porque es más potente de lo que parece. Desmarcarlo no borra nada: apaga **todo el almacén de golpe**, todas sus capas dejan de responder a cualquier servicio, pero siguen visibles en la configuración, esperando. Es tu botón de pausa de emergencia. Lo uso todo el tiempo cuando estoy reemplazando un shapefile por una versión actualizada: apago el almacén, cambio los archivos, recargo el feature type, y recién ahí vuelvo a encenderlo. Cero riesgo de que un usuario reciba datos a medio escribir. Y ojo, esto es distinto a apagar una capa individual —eso apaga solo esa capa, el resto del almacén sigue funcionando— y también distinto a "Advertised" de una capa, que sigue respondiendo pero desaparece del listado público.
- **Auto disable on connection failure.** El hermano protector del anterior. Si tu fuente de datos empieza a fallar de forma repetida —típico en bases de datos remotas o conexiones VPN inestables— GeoServer se apaga solo antes de que ese fallo se convierta en una cascada de reintentos saturando el log y demorando todo el servidor. En un directorio de shapefiles locales casi nunca hace falta, porque la "conexión" es solo acceso a disco; donde de verdad importa es en PostGIS, PostGIS JNDI y en cualquier almacén en cascada.

Los **parámetros de conexión** son cuatro:

- **Directorio de shapefiles** —la ruta, en formato `file:`, a la carpeta que contiene los `.shp`. Por ejemplo `file:data/shapefiles/Cartografia/mapaBases/divisionPolitica`.
- **Conjunto de caracteres del DBF** —la codificación de texto del archivo de atributos. `ISO-8859-1` resuelve el noventa por ciento de los casos con datos en español: si tus nombres de municipios aparecen con símbolos raros en vez de tildes o eñes, el problema casi siempre es este campo mal configurado.
- **Crear índice espacial si no existe o está desactualizado** —genera o regenera el índice que acelera cualquier consulta por extensión geográfica. Déjalo activo salvo que administres el índice por fuera.
- **Usar buffers de mapeo de memoria** —acelera la lectura aprovechando el caché del sistema operativo. En Linux y macOS, adelante; en Windows, la propia GeoServer te lo advierte: puede bloquear el archivo mientras está abierto, así que ahí conviene desactivarlo.

Un detalle final que vale oro: un almacén de shapefiles en carpeta puede contener **varios** `.shp`, y cada uno se convertirá en una capa independiente. Un almacén de un único archivo publica exactamente una capa.

### 2.2 PostGIS — cuando el shapefile se te queda chico

**[EN PANTALLA: formulario de PostGIS con host, port, database, schema]**

Llega un momento en todo proyecto serio en el que necesitas consultas espaciales de verdad, edición en tiempo real, y varias personas trabajando sobre el mismo dato a la vez. Ahí entra PostGIS: la base de datos espacial de código abierto construida sobre PostgreSQL, y el estándar de facto en proyectos SIG profesionales.

Los campos básicos de conexión son los que esperas: **host** —la dirección del servidor, por ejemplo la IP de la VM de laboratorio—; **port**, por defecto `5432`; **database**, el nombre de la base; **schema**, el esquema dentro de esa base —muy recomendable especificarlo siempre, porque si lo dejas vacío GeoServer va a listar tablas de todos los esquemas visibles, lo cual es lento y puede exponer tablas que no querías mostrar—; y **user / passwd**, con permisos de lectura como mínimo, y de escritura si quieres edición vía WFS-T.

Ahora vienen los parámetros que separan a quien conecta PostGIS "porque toca" de quien lo configura pensando en cómo se va a usar de verdad. Vamos en el **orden exacto del formulario**, uno por uno, sin saltarnos ninguno:

- **Espacio de nombres.** El primer campo, y el único con asterisco: la URI de espacio de nombres a la que queda asociado todo lo que publiques desde este almacén. GeoServer la hereda automáticamente del espacio de trabajo que elegiste arriba —en nuestro caso, `https://www.arteclab.org/bolivia_curso`— así que casi nunca la tocas a mano. Si la ves vacía o con otro valor, la señal es clara: elegiste mal el espacio de trabajo.
- **Expose primary keys.** Expone el valor de la clave primaria de cada tabla como un atributo más de la capa, lo que facilita construir filtros por identificador. Importante: esto no permite modificar ese valor vía WFS-T, cualquier intento se ignora en silencio, es solo para tu comodidad al filtrar.
- **max connections / min connections.** El tamaño máximo y mínimo del grupo de conexiones reservado para este almacén específico, por defecto diez y uno. Ojo con esto: cada almacén PostGIS abre su propio grupo, así que si creas muchos almacenes hacia la misma base, el total de conexiones abiertas puede acercarse al límite que tenga configurado tu servidor PostgreSQL, que por defecto suele ser cien.
- **fetch size.** Cuántos registros trae GeoServer en cada viaje de red hacia la base, por defecto mil. Muy bajo —menos de cincuenta— y la latencia de red te penaliza; muy alto, y puedes consumir memoria de más y arriesgarte a un error de memoria agotada.
- **Batch insert size.** El espejo del anterior, pero para **escribir**: cuántas filas agrupa GeoServer en cada INSERT cuando alguien edita la capa vía WFS-T. El valor por defecto, uno, inserta fila por fila; si tu flujo incluye cargas de edición masivas, subirlo a cincuenta o cien acelera la escritura de forma notable. En un servicio de solo lectura, este número no juega ningún papel.
- **Connection timeout.** Segundos que el pool espera antes de rendirse al pedir una conexión nueva, veinte por defecto.
- **validate connections.** Verifica que una conexión tomada del grupo siga siendo válida antes de usarla, protegiéndote de cortes de red o timeouts del servidor, a cambio de una pequeña penalización de rendimiento.
- **Test while idle.** Enciende el mantenimiento preventivo del pool: revisar las conexiones mientras están ociosas, para detectar y descartar las que ya murieron sin que ningún usuario tenga que toparse con el error primero.
- **Evictor run periodicity.** Cada cuántos segundos corre ese proceso de revisión —el "evictor", literalmente el desalojador—, trescientos por defecto: una pasada cada cinco minutos.
- **Max connection idle time.** Cuánto tiempo puede quedarse una conexión sin usarse antes de que el evictor la considere candidata a cierre, también trescientos segundos por defecto.
- **Evictor tests per run.** Cuántas conexiones examina el evictor en cada pasada, tres por defecto — un límite pensado para que el propio mantenimiento no se convierta en una carga.

Estos últimos cuatro trabajan en equipo: un proceso en segundo plano que cierra conexiones ociosas y libera recursos del servidor. Los valores por defecto están bien para el noventa por ciento de los casos; solo los ajustas si administras un servidor con mucho tráfico o ves conexiones "zombis" acumulándose en PostgreSQL.

- **Primary key metadata table.** El as bajo la manga para las **vistas**. Una tabla sin clave primaria queda en solo lectura, y una vista nunca la tiene: en este campo puedes indicar el nombre de una tabla auxiliar —la convención es `gt_pk_metadata`— donde le describes a GeoServer qué columna debe tratar como clave y cómo generar sus valores nuevos: con una secuencia, un autoincremento o un valor asignado. Vacío en la enorme mayoría de los casos, pero cuando publiques vistas SQL editables, este campo es la llave.
- **Session startup SQL / Session close-up SQL.** Sentencias SQL que se ejecutan cada vez que una conexión sale del pool para ser usada, y cuando se devuelve. El uso clásico: un `SET search_path` para fijar el esquema de trabajo, o un `SET ROLE` para que la base aplique permisos o registre auditoría por sesión. Si no tienes ese requerimiento, se quedan vacíos.
- **Callback factory.** Un punto de extensión para desarrolladores: el nombre de una clase que engancha comportamiento personalizado al ciclo de vida de la sesión. Salvo que una extensión te lo pida expresamente, queda vacío — y puedes pasar años administrando GeoServer sin llenarlo jamás.
- **Loose bbox.** Cuando lo activas, el filtro espacial solo compara contra el rectángulo que envuelve cada geometría, apoyado en el índice espacial, sin verificar la forma exacta. Es mucho más rápido, a costa de exactitud. Para visualización WMS, actívalo sin miedo. Si tu capa se consume por WFS con filtrado estricto por área, mejor no.
- **Estimated extends.** Usa la información ya calculada por el índice espacial para estimar la extensión de la tabla en vez de recorrer cada fila una por una. Acelera muchísimo el cálculo del bounding box en capas grandes.
- **SSL mode.** Cómo viaja la conexión entre GeoServer y PostgreSQL: `DISABLE` va en claro, y las opciones superiores —`ALLOW`, `PREFER`, `REQUIRE`, `VERIFY_CA`, `VERIFY_FULL`— van exigiendo cifrado y verificación de certificado cada vez más estrictos. En nuestra VM de laboratorio, donde GeoServer y la base viven en la misma máquina, `DISABLE` es la elección correcta: cifrar tráfico que nunca sale de la máquina solo cuesta rendimiento. Hacia una base remota que cruce cualquier red, mínimo `REQUIRE`.
- **preparedStatements.** Esta sorprende a todos la primera vez: con PostGIS se recomienda **dejarlo desactivado**, porque PostgreSQL optimiza mejor su plan de consulta espacial —decidir entre recorrido secuencial o uso del índice— cuando ve el valor real del área que estás pidiendo, en vez de una plantilla genérica. La ventaja de activarlo, eso sí, es que elimina por completo el riesgo de inyección SQL a través de filtros.
- **Max open prepared statements.** El acompañante del anterior: cuántas sentencias preparadas puede mantener abiertas cada conexión, cincuenta por defecto. Si dejaste preparedStatements desactivado —como acabamos de recomendar—, este número simplemente no entra en juego.
- **encode functions.** Permite que ciertas funciones usadas en filtros CQL se traduzcan a funciones nativas de PostgreSQL, más eficientes que evaluarlas dentro de GeoServer.
- **Support on the fly geometry simplification.** Una de las optimizaciones más rentables de todo el formulario. Cuando el mapa se mira a una escala donde cada polígono ocupa apenas unos píxeles, no tiene sentido traer la geometría con todo su detalle: con esto activo, GeoServer le pide a PostGIS una versión **simplificada** de la geometría, calculada dentro de la base, con la resolución justa para lo que la pantalla puede mostrar. Menos datos viajando, menos trabajo de render, y mapas visiblemente más fluidos en capas detalladas como límites municipales.
- **Method used to simplify geometries.** El "cómo" de la simplificación anterior, con dos opciones. **FAST** usa `ST_Simplify`: máxima velocidad, a costa de que algún polígono muy pequeño pueda deformarse o incluso colapsar en escalas lejanas. **PRESERVETOPOLOGY** usa `ST_SimplifyPreserveTopology`: algo más lenta, pero garantiza que ninguna geometría se rompa, se invalide ni desaparezca. Para visualización general, FAST cumple de sobra; si los huecos, vecindades o polígonos diminutos importan visualmente, PRESERVETOPOLOGY.
- **create database / create database params.** Si marcas la casilla, GeoServer intentará **crear la base de datos** cuando no exista, usando los parámetros extra del segundo campo. Suena cómodo, pero en la práctica profesional la base la creas tú antes, con `CREATE DATABASE` y `CREATE EXTENSION postgis` —exactamente como lo hicimos en la clase de PostGIS—, así que: desmarcado y vacío.
- **reWriteBatchedInserts.** Una optimización del propio driver JDBC de PostgreSQL: reescribe los lotes de INSERTs en una sola sentencia multifila antes de enviarla a la base. Combinado con un Batch insert size mayor que uno, acelera de forma notable las cargas de escritura vía WFS-T. En un servicio de solo lectura, no cambia absolutamente nada.

Dos reglas que no dependen de ningún checkbox: una tabla PostGIS solo es editable desde GeoServer si tiene **clave primaria** —sin ella, la capa queda en modo solo lectura—, y siempre, siempre crea un **índice espacial** con `CREATE INDEX ... USING GIST` sobre la columna de geometría; sin eso, ninguna configuración del almacén te va a salvar del rendimiento lento.

`[CTA discreto]` Este es el punto exacto donde muchos cursos se quedan en la superficie —"conecta tu base de datos y listo"— y donde nosotros vamos más profundo: en el curso de GeoServer armamos el servidor de producción completo, con PostgreSQL, PostGIS y cada uno de estos parámetros ajustados desde cero.

### 2.3 PostGIS vía JNDI — la misma base, otra filosofía de conexión

**[EN PANTALLA: formulario de PostGIS JNDI]**

Existe una segunda forma de conectar exactamente la misma base de datos, y la diferencia no está en el dato: está en **quién administra la conexión**.

Con PostGIS estándar, GeoServer abre y gestiona su propio grupo de conexiones. Con PostGIS vía JNDI —sigla de *Java Naming and Directory Interface*, el mecanismo estándar de Java para "buscar" recursos por nombre— esa responsabilidad se la delegamos al servidor de aplicaciones, a Tomcat. En vez de host, puerto, usuario y contraseña, GeoServer solo pide un **jndiReferenceName**, un nombre lógico como `java:comp/env/jdbc/geo_bolivia`, y Tomcat le entrega una conexión ya lista. El **schema** se configura igual que en la versión estándar, y todos los parámetros de comportamiento que acabamos de ver —Loose bbox, Estimated extends, Expose primary keys— funcionan exactamente igual.

¿Cuándo elegir JNDI en vez de la conexión estándar? Cuando quieres que las credenciales y los límites del grupo de conexiones los controle el administrador de infraestructura, no el de GeoServer. Cuando varias capas necesitan compartir un mismo grupo de conexiones hacia la misma base, en vez de que cada almacén abra el suyo por separado. O cuando necesitas rotar contraseñas sin tocar la configuración de GeoServer, porque esa rotación se gestiona a nivel de Tomcat. Eso sí: el driver JDBC de PostgreSQL debe colocarse en la carpeta de librerías de Tomcat, no en la de GeoServer, y el recurso JNDI debe declararse en la configuración del servidor antes de crear el almacén.

### 2.4 GeoPackage — un archivo, muchas capas

**[EN PANTALLA: un único archivo .gpkg abierto en el explorador de archivos]**

Si el shapefile te obligó siempre a cargar cinco archivos por capa, GeoPackage viene a resolver justo eso. Es un estándar internacional construido sobre SQLite, y en un solo archivo `.gpkg` puedes guardar **varias capas vectoriales y ráster a la vez**, cada una con su propio índice espacial. El único campo de conexión que de verdad importa es **database**: la ruta al archivo, por ejemplo `file:data/geopackages/bolivia_sig.gpkg`.

Para quien enseña o comparte material, esto cambia la vida: en vez de entregar una carpeta con veinte archivos sueltos, entregas un solo archivo autocontenido —departamentos, municipios, ríos, ciudades, todo adentro, cero riesgo de que se pierda un `.prj` en el camino.

### 2.5 Servicios en cascada — mapas que no son tuyos, pero puedes usar

**[EN PANTALLA: formulario de Web Feature Server NG con la URL de capabilities de un servicio remoto]**

Esta es, para mí, una de las funciones más elegantes de GeoServer. Un almacén en cascada no guarda ningún dato propio: se conecta a un servicio de **otro** servidor —de GeoBolivia, de INRA Bolivia, de cualquier institución que publique OGC— y lo reexpone como si fuera tuyo. Si mañana esa institución actualiza su capa de municipios, tu mapa se actualiza solo, sin que vuelvas a descargar ni a republicar nada.

Hay tres variantes, y el campo de conexión en las tres es el mismo: la **Capabilities URL**, la dirección del GetCapabilities del servicio remoto.

- **Web Feature Server, o WFS en cascada.** Trae **geometría real** —no una imagen, sino los datos crudos— así que puedes reestilizarla a tu gusto y combinarla con tus capas propias en un mismo mapa.
- **Web Map Server, o WMS en cascada.** Trae **imágenes ya renderizadas** por el servidor de origen. GeoServer no puede reestilizarlas, solo las reenvía o las recombina como imagen. Perfectas como mapa base de fondo.
- **Web Map Tile Server, o WMTS en cascada.** Lo mismo que el WMS, pero entregado como **teselas pre-cacheadas**, más rápido para mapas base de referencia.

La limitación que hay que tener clarísima antes de explicarla en clase: un WMS o WMTS en cascada entrega imágenes, no geometría, así que no se le puede aplicar un estilo propio ni hacer consultas de información con la misma granularidad que sobre datos vectoriales reales. Solo el WFS en cascada te da esa libertad, porque trae el dato de verdad.

### 2.6 Almacenes ráster — cuando el dato es una imagen, no un punto

**[EN PANTALLA: capa de ortofoto o DEM cargada en GeoServer]**

Todo lo anterior habla de geometría discreta. Pero hay otro mundo: el de los datos continuos —ortofotos, modelos de elevación, imágenes satelitales. Aquí GeoServer te da seis opciones:

- **GeoTIFF** —un único archivo `.tif` georreferenciado. El formato más simple: un archivo, una capa.
- **WorldImage** —imágenes comunes, JPEG, PNG, TIFF, acompañadas de un archivo de mundo aparte que guarda la georreferenciación.
- **ImageMosaic** —el más interesante para trabajo profesional. Publica decenas o cientos de archivos ráster como si fueran una sola capa continua: ortofotos por cuadrante, o imágenes satelitales de distintas fechas. GeoServer construye un índice interno —por defecto un shapefile— que asocia cada archivo con su extensión geográfica, y en cada petición carga únicamente los archivos que realmente intersectan el área que el usuario está mirando. Es la base técnica detrás de cualquier serie temporal ráster seria, combinada con la pestaña de Dimensiones que vamos a ver más adelante.
- **ArcGrid** —el formato de rejilla ASCII de ESRI, muy común en datos de modelos hidrológicos o de elevación que vienen de fuentes académicas o gubernamentales.
- **GeoPackage, en su versión ráster** —el mismo archivo `.gpkg` de hace un momento también puede alojar teselas pre-generadas como capa ráster, dentro del mismo archivo.
- **ImagePyramid** —una estructura con varias resoluciones del mismo ráster, pensada para servir imágenes muy grandes con buen rendimiento en distintos niveles de zoom, sin depender de GeoWebCache.

Con esto, ya tenemos la conexión hecha. Pero una conexión no es un mapa todavía.

---

## 3. Capas — donde el dato se convierte en servicio

**[EN PANTALLA: Layers → seleccionar una capa existente, mostrando las cinco pestañas]**

Si el almacén es el puente hacia tu información, la capa es la puerta que abres al mundo: la unidad que un cliente SIG, un navegador o una app realmente puede pedir. Tiene cinco pestañas, cinco decisiones distintas. Vamos con todas, sin saltarnos ningún campo.

### 3.1 Datos — el corazón técnico de la capa

**[EN PANTALLA: pestaña Datos, con el sistema de referencia y el bounding box visibles]**

Es la pestaña activa por defecto, y la más densa de las cinco.

**Información básica y metadatos.** Name —el identificador único dentro del espacio de trabajo—, Title, Abstract y Keywords, que son los metadatos legibles que aparecen en el GetCapabilities y que ayudan a cualquier cliente SIG a listar tu capa de forma comprensible.

**Vínculos a metadatos y Enlaces de datos.** Dos secciones que casi nadie explica y que sí vale la pena dominar. Los **vínculos a metadatos** enlazan la capa a un documento de metadatos externo, en dos estándares posibles: **FGDC**, del Federal Geographic Data Committee de Estados Unidos, o **TC211**, el estándar internacional ISO 19115. Aparecen en el GetCapabilities para que un cliente SIG externo pueda descargar la ficha completa de metadatos —y aquí un detalle técnico que GeoServer mismo advierte: en las capacidades de WMS 1.1.1 solo se listan enlaces de tipo FGDC y TC211, ningún otro formato se anuncia ahí. Los **enlaces de datos**, en cambio, apuntan a un recurso de descarga del dato crudo, por ejemplo un zip con el shapefile original en un repositorio. Es puramente informativo: no controla el servicio, solo le dice al usuario final dónde conseguir la fuente.

**Sistema de referencia.** Aquí está la fuente número uno de "mi mapa está desfasado y no sé por qué". GeoServer maneja el **SRS nativo** —en qué proyección está realmente guardado tu dato— y el **SRS declarado** —lo que GeoServer le va a decir al mundo que es. Cuando no coinciden, decides con **SRS Handling**: *Force declared*, la opción por defecto y casi siempre la correcta, impone el sistema declarado sobre el nativo, porque el código declarado viene de la base EPSG con toda su información de área de validez y rutas de transformación; *Reproject native to declared* reproyecta realmente los datos; y *Keep native* conserva el sistema original ignorando el declarado.

**Cuadros delimitadores.** El **Native Bounding Box**, calculable con un clic gracias a *Compute from data*, que lee la geometría real, o *Compute from SRS bounds*, que usa el área de validez teórica del sistema. Y el **Lat/Lon Bounding Box**, siempre en coordenadas geográficas, obligatorio en toda capa WMS, calculable con *Compute from native bounds*. Nunca los llenes a mano: deja que GeoServer los calcule.

**Control de geometrías curvas.** Dos campos poco usados pero importantes de entender: **Geometrías lineales pueden contener arcos circulares**, que le avisa al codificador GML que la capa puede tener curvas verdaderas, para codificarlas como `gml:Curve` en vez de `gml:LineString` —solo relevante en fuentes que soportan geometría curva, como Oracle Spatial; en un shapefile o PostGIS estándar casi siempre queda sin marcar. Y la **Tolerancia de linealización**, que solo importa si sí hay geometrías curvas, y define cuánto se puede "aplanar" un arco a segmentos rectos cuando un cliente no soporta curvas.

**Detalles del Feature Type.** La tabla de atributos que GeoServer detecta automáticamente desde la fuente. En un shapefile típico de división política vas a ver algo como: `the_geom`, de tipo MultiPolygon, el atributo geométrico; `FIRST_NOM_`, un texto con el nombre; `COUNT`, un número entero largo; `COD`, un código en texto. La casilla **Customize attributes** te deja editar manualmente tipo, alias o si un campo admite valores nulos, sin tocar el dato original. Y el botón **Recargar feature type** es puro oro: editaste tu shapefile en QGIS, agregaste un campo nuevo, no necesitas volver a crear la capa desde cero —un clic y GeoServer relee el esquema completo.

**Feature Filtering.** El campo de **filtro CQL** —*Common Query Language*, el lenguaje de consulta propio de GeoServer— restringe qué features se publican sin tocar el dato original ni una sola vez. Con una línea como `DEPARTAMEN = 'COCHABAMBA'`, publicas solo un recorte de una capa nacional completa. Ojo con un matiz técnico: el filtro solo afecta lecturas. Si la capa admite edición por WFS transaccional y alguien inserta una entidad que no cumple el filtro, se guarda igual en el almacén, pero no va a aparecer en las salidas del servicio.

### 3.2 Publicación — cómo se presenta tu capa al mundo

**[EN PANTALLA: pestaña Publicación, recorriéndola de arriba hacia abajo, bloque por bloque]**

Si Datos define qué es la capa, Publicación define **cómo se comporta como servicio**. Es la pestaña más larga de las cinco, así que vamos en el mismo orden en que aparece en pantalla, sin saltarnos ningún bloque.

**Enabled y Advertised.** Dos interruptores que suelen confundirse. Enabled apaga la capa por completo: deja de responder a cualquier petición. Advertised es más sutil: la capa **sigue funcionando** ante peticiones directas —GetMap, GetFeature— pero desaparece del listado público en el GetCapabilities y del vistazo previo. Es la puerta que sigue abierta, pero sin cartel en la fachada. Perfecta para capas auxiliares que solo se usan dentro de un grupo mayor y no necesitan exposición individual.

**Estilos WMS.** Aquí eliges el **estilo por defecto** —el que se aplica cuando el cliente no pide ninguno— y los **estilos adicionales** que quedan disponibles para que quien consume el mapa elija otra forma de verlo.

**Opaco.** Una pista que le das a los clientes, no un cambio de render: declara que esta capa **cubre por completo** lo que tenga debajo —típico de un mapa base—. Un cliente que respete la pista puede ahorrarse dibujar lo que de todos modos quedaría tapado.

**Buffer de renderizado por defecto.** Un margen extra, en píxeles, alrededor del área solicitada al renderizar. Sirve para que símbolos grandes o etiquetas que caen justo en el borde de la imagen no aparezcan cortados por la mitad.

**Método de interpolación predeterminado.** Cómo se suavizan los píxeles cuando la imagen se reescala o se reproyecta: *vecino más cercano*, rápido pero pixelado; *bilineal* y *bicúbica*, más suaves pero más costosas. La opción "Utilizar servicio predeterminado" hereda lo configurado globalmente en WMS. En capas vectoriales apenas se nota; donde de verdad pesa es en ráster.

**WMS Layer Settings — Queryable y Default WMS Path.** **Queryable** decide si la capa responde a GetFeatureInfo —el clic de "¿qué hay aquí?"—: desmarcado, la capa se dibuja igual, pero se vuelve muda. **Default WMS Path** define en qué "carpeta" del árbol de capas del GetCapabilities aparece, por ejemplo `/mapas_base` — pura organización de cara al cliente, no cambia ninguna URL.

**WMS Root Layer in Capabilities.** Solo importa cuando esta capa es la única de nivel superior del servicio: controla si aparece envuelta en un elemento raíz extra del documento de capacidades, o directamente como raíz. Tres opciones: heredar la **configuración global de WMS** —lo normal—, forzar **Sí**, o forzar **No**.

**URLs autoritativas e Identificadores de la capa.** Van en pareja, y son metadatos de catálogo. La **URL autoritativa** declara qué autoridad respalda el dato —por ejemplo "GeoBolivia", con su dirección web— y el **identificador de la capa** es el código único que esa autoridad le asigna a este dato. Ambos viajan en el GetCapabilities para que un catálogo externo identifique tu capa sin ambigüedad. En un proyecto de curso quedan vacíos; en una IDE institucional, son la cédula de identidad de la capa.

**Atribución de WMS.** Los créditos del dato: un **texto de atribución** —"Fuente: GeoBolivia 2024"—, un **vínculo** a la página del proveedor, y opcionalmente un **logo**: su URL, su *content type* como `image/png`, y sus dimensiones — que el botón **Auto detectar tamaño y tipo de imagen** llena por ti, así que nunca las escribas a mano. Un detalle curioso para no confundirse en cámara: la traducción del formulario etiqueta los dos campos de dimensión como "Altura", pero son el ancho y el alto. Algunos visores muestran esta atribución sobre el mapa: es la forma correcta de dar crédito sin tocar el dato.

**Web Feature Service — Configuración de Features.** Cinco decisiones sobre cómo sale tu dato vectorial crudo:

- **Límite de número de features por consulta.** El techo de registros que un GetFeature puede devolver de esta capa; cero significa "sin límite propio", manda el límite global del servicio. Tu seguro contra el cliente que pide un millón de filas de golpe.
- **Máximo número de decimales.** Cuántos decimales llevan las coordenadas en la salida. Para ponerlo en perspectiva: seis decimales en grados ya son unos diez centímetros en el terreno — más precisión que eso solo engorda la respuesta.
- **Right-pad decimals with zeros.** Rellena las coordenadas con ceros a la derecha hasta completar el número de decimales fijado, para clientes que exigen un ancho fijo de dígitos.
- **Forced decimal notation.** Prohíbe la notación científica: nada de `1.2E7`, siempre números decimales planos. Existe porque hay clientes que se rompen al leer exponentes.
- **Activate complex to simple features conversion.** Convierte features complejas al modelo simple, para clientes que solo entienden features simples. Solo aplica si trabajas con esquemas complejos — que no es nuestro caso en el curso.

**Omitir NumberMatched.** WFS normalmente informa cuántos registros en total coinciden con la consulta —el atributo `numberMatched`— y calcular ese total cuesta un conteo completo en la base. Marcando esta casilla te ahorras ese conteo en tablas grandes, a cambio de que el cliente pierda el "total de resultados" que usa para paginar.

**Códigos SRS extra.** Por defecto, WFS anuncia en su capabilities una lista enorme de sistemas de referencia. Con **Anular la lista SRS amplia de WFS** declaras únicamente los códigos que de verdad quieres ofrecer para esta capa — un capabilities más liviano y clientes menos confundidos.

**Coordinates Encoding.** La casilla **Encode coordinates measures** incluye en la salida la coordenada M — la "medida" de las geometrías XYM, típica en redes viales o hidrográficas con kilometraje acumulado. Si tu dato solo tiene X e Y, aquí no hay nada que incluir.

**Configuración del formato KML.** Tres campos que solo importan si sirves esta capa hacia Google Earth. El "regionado" —*regionating*— decide **qué features aparecen primero según el nivel de zoom**, para no volcar miles de geometrías de golpe: el **atributo** define la importancia de cada feature —por ejemplo, población—, el **método** define cómo se reparten —por geometría, por orden externo, aleatorio— y **features por tesela** cuántas entran en cada región de zoom.

**Opciones de Capa — Selectively disable services.** El interruptor fino de los servicios: deshabilita servicios específicos **solo para esta capa**. El caso clásico: la capa se puede ver por WMS, pero nadie puede descargarse el dato crudo por WFS. Control quirúrgico por capa, sin tocar la configuración global ni la seguridad.

**Configuración de HTTP — cacheado.** **Cabeceras de respuesta de caché** le indica al cliente —navegador o proxy— que puede reutilizar la respuesta sin volver a pedirla durante los segundos definidos en **Tiempo de caché**. Importante no confundirlo con el cacheo de teselas que viene después: aquí GeoServer no guarda nada en el servidor, solo envía cabeceras HTTP para que quien consume cachee de su lado.

### 3.3 Dimensiones — cuando el mapa también tiene tiempo

**[EN PANTALLA: pestaña Dimensiones configurando TIME]**

Esta pestaña habilita las dimensiones estándar **TIME** y **ELEVATION** del estándar WMS, más dimensiones personalizadas si las necesitas. Con esto encendido, tu mapa deja de ser una foto fija y se convierte en una película: precipitación mes a mes, avance de una frontera agrícola, imágenes satelitales por fecha.

Los campos son cuatro grupos de decisiones:

- **Attribute y End attribute.** Qué campo de tu tabla guarda el valor de la dimensión, y opcionalmente cuál marca el fin de un rango.
- **Presentation.** Cómo se listan los valores disponibles en el capabilities: **List**, cada valor por separado; **Interval and resolution**, un rango con un paso fijo; o **Continuous interval**, un rango continuo sin pasos discretos.
- **Default value.** Cuatro estrategias posibles cuando el cliente no especifica un valor: el más pequeño disponible, el más grande, el más cercano a un valor de referencia que tú definas, o directamente ese valor de referencia fijo, exista o no en los datos.
- **Nearest match.** Si lo activas, GeoServer acepta el valor disponible más cercano cuando el cliente pide uno exacto que no existe, en vez de devolver un error.

### 3.4 Cacheado de Teselas — la diferencia entre un mapa lento y uno instantáneo

**[EN PANTALLA: pestaña Tile Caching, con gridsets y botón de Seed]**

Aquí es donde un mapa deja de sentirse "de prueba" y empieza a sentirse profesional. GeoServer trae integrado **GeoWebCache**, y esta pestaña es su panel de control por capa: en vez de recalcular la imagen cada vez que alguien mira tu mapa, la genera una vez, la guarda como teselas, y la sirve instantáneamente después. El formulario tiene tres bloques —ajustes generales, filtros de parámetros y gridsets— y vamos en ese orden.

**General settings:**

- **Create a Cached Layer for this Layer.** El interruptor de existencia: crea —o elimina, si lo desmarcas— la capa de teselas asociada en GeoWebCache. Desmarcado, el resto del formulario simplemente no aplica.
- **Enable tile caching for this layer.** El interruptor de uso: puedes apagar temporalmente el servicio de teselas sin perder ni la configuración ni las teselas ya generadas. La diferencia con el anterior es la misma que entre demoler la casa y cerrarla con llave.
- **BlobStore.** Dónde se guardan físicamente las teselas. El *BlobStore por defecto* escribe en el directorio de datos de GeoServer; si defines otros almacenes —otra carpeta, otro disco más grande o más rápido— aquí eliges cuál usa esta capa.
- **Meta tiling factors.** En vez de renderizar una tesela a la vez, GeoServer genera un bloque más grande —por defecto cuatro por cuatro— y luego lo recorta. Esto evita que una etiqueta o un símbolo grande quede cortado justo en el borde de una tesela, y de paso acelera muchísimo el pre-cacheo masivo.
- **Gutter size.** Un margen extra en píxeles alrededor de cada metatesela al renderizar, complementario al metatiling, para reducir esos mismos problemas de recorte en geometrías o etiquetas de borde. Cero por defecto.
- **Cache image formats.** En qué formatos se guardan las teselas, y puedes marcar varios a la vez. Los dos de siempre: **image/png**, con transparencia, ideal para capas vectoriales; **image/jpeg**, más liviano pero sin transparencia, ideal para fondos opacos como ortofotos. Los demás tienen su nicho: **image/png8** es PNG con paleta de 256 colores, notablemente más liviano cuando la capa usa pocos colores; **image/gif** existe por herencia; los dos **image/vnd.jpeg-png** son formatos híbridos inteligentes que deciden tesela por tesela — JPEG donde la imagen es opaca, PNG donde necesita transparencia; y **application/json;type=utfgrid** no es una imagen: son teselas de **datos** interactivos, para que un visor sepa qué feature hay bajo el cursor sin disparar un GetFeatureInfo por cada movimiento del mouse.
- **Expirar caché de servidor después de n segundos.** Cada cuánto una tesela guardada se considera vieja y se vuelve a renderizar en la próxima petición. En cero, hereda la configuración de la fuente — y para datos que no cambian a diario, cero está perfecto.
- **Expirar el caché del cliente después de n segundos.** El hermano del anterior, pero mirando hacia afuera: la cabecera HTTP que le dice al navegador cuánto tiempo puede reutilizar la tesela sin volver a pedirla. También hereda de la fuente si lo dejas en cero.
- **Skip caching on dimension warnings.** Solo importa en capas con dimensiones TIME o ELEVATION activas. Cuando una petición no trae el valor de la dimensión y GeoServer lo resuelve con una advertencia —usó el **valor por defecto**, aplicó **nearest match**, o el nearest match **falló**— estas tres casillas deciden si esa tesela **no** se guarda. ¿Por qué querrías eso? Porque el "valor por defecto" de una serie temporal cambia con el tiempo: si hoy cacheas la tesela de "la fecha más reciente", mañana esa tesela guardada estaría mintiendo.

**Parameter Filters.** Cada combinación de parámetros genera su **propio juego de teselas**. El filtro **STYLES** viene incluido de fábrica: defines el estilo por defecto de la caché —normalmente los valores de capa por defecto— y qué estilos alternativos merecen caché propia, con el atajo de "todos los estilos". Con **Add filter** puedes sumar filtros para otros parámetros, como `TIME` o `CQL_FILTER`, definiendo qué valores se aceptan. Poder con responsabilidad: cada estilo, cada fecha, cada valor permitido multiplica el espacio en disco que consume la capa.

**Cached Grid Sets.** Los esquemas de teselado sobre los que se cachea, y GeoServer te propone los dos clásicos: `EPSG:4326`, geográfico puro, y `EPSG:900913`, la proyección Web Mercator que usan Google Maps y OpenStreetMap. Por cada gridset controlas dos rangos que no son lo mismo: **Published zoom levels**, qué niveles de zoom anuncias al mundo, y **Cached zoom levels**, cuáles se guardan de verdad en disco — puedes publicar hasta el nivel veinte pero cachear solo hasta el doce, y los niveles más profundos se renderizan al vuelo sin ocupar espacio. **Subset bounds** en *Dynamic* significa que la caché se recorta automáticamente a la extensión de la capa, sin generar teselas vacías fuera de tus datos. Y con **Add Grid subset** agregas otros esquemas si los tienes definidos.

Un matiz importante para no buscar donde no es: los botones **Seed, Truncate y Empty** —pre-generar, recortar y vaciar la caché— **no viven en esta pestaña**. Están en el menú *Tile Caching → Tile Layers*, en el enlace *Seed/Truncate* de cada capa. Y ahí es donde ocurre la magia previa a cualquier demo en vivo: **Seed** pre-genera las teselas de una zona y un rango de zoom antes de que nadie las pida, así el primer clic de tu audiencia carga instantáneo en vez de tardar diez segundos delante de todos.

Un concepto que vale la pena remarcar en cámara: cachear no cambia el dato, solo acelera su entrega. Si el shapefile o la tabla PostGIS cambian, hay que volver a hacer seed —o truncar la caché—, o el usuario va a ver teselas desactualizadas hasta que expiren solas.

### 3.5 Seguridad — quién puede ver qué

**[EN PANTALLA: pestaña Seguridad de la capa]**

La última pestaña, y la que más se subestima. Aquí defines **reglas de acceso a datos** a nivel de esta capa específica: qué roles pueden leer, cuáles pueden escribir, y cuáles pueden administrar. Estas reglas se combinan con las que existan a nivel de espacio de trabajo y a nivel global del servidor, y siempre gana la regla más específica que aplique a cada rol. Es el mecanismo típico para dejar visible la división política a cualquiera, mientras la edición de una capa catastral sensible queda reservada solo a un rol específico dentro de tu organización.

Con las cinco pestañas dominadas, ya tienes una capa lista, rápida y segura. Pero rara vez publicamos una capa sola.

---

## 4. Grupos de capas — el mapa como una sola pieza

**[EN PANTALLA: Layer Groups → creando un grupo con varias capas apiladas]**

Imagina pedirle a un cliente SIG que cargue quince capas, una por una, en el orden correcto, cada vez que quiere ver tu mapa base. Nadie hace eso. Para eso existen los grupos de capas: empaquetan varias capas —o incluso otros grupos— bajo un solo nombre, con un orden de dibujo fijo y garantizado.

Ese orden sigue el llamado **modelo del pintor**: la primera capa de la lista se pinta primero y queda debajo; la última se pinta al final y queda encima de todo. Por eso el orden lógico casi siempre es límites político-administrativos abajo, después hidrografía, después vías, y arriba de todo los puntos —ciudades, puntos de interés, lo que el ojo debe encontrar primero.

GeoServer te da **cinco modos** de comportamiento, y los cinco valen la pena conocerlos porque cada uno resuelve un problema distinto:

- **Single, o sencillo.** El grupo se expone como una sola capa con nombre, actuando como alias de la lista completa. Las capas individuales **siguen apareciendo** por separado como entradas de nivel superior en el capabilities.
- **Opaque, u opaco.** Igual que Single, pero las capas internas **no se listan por separado**: el cliente solo ve el grupo como un todo. Ideal cuando quieres entregar "un mapa base" sin que nadie tenga que preocuparse por sus piezas internas.
- **Named tree, o árbol con nombre.** Se expone como una jerarquía con nombre propio; el cliente puede pedir tanto el grupo completo como cada subcapa por separado.
- **Container tree, o árbol contenedor.** Aparece en el capabilities solo como categoría organizativa, **sin nombre invocable** —no se puede pedir como capa única, solo sirve para agrupar visualmente en el árbol de capas de un cliente SIG.
- **Earth Observation tree.** Un modo especializado para el perfil de observación terrestre de WMS: no renderiza directamente las capas anidadas, solo expone una capa de vista previa llamada Root Layer.

Otros campos que definen el grupo: **Bounds y Projection**, porque GeoServer reproyecta automáticamente todas las capas del grupo a una proyección común, aunque las capas de origen tengan sistemas distintos entre sí. **Layer Group Style**, que permite un estilo alterno para todo el grupo —una combinación distinta de estilos por capa—, disponible solo en modo Single u Opaque. **Enabled, Advertised y Queryable**, con el mismo significado que en una capa individual, donde Queryable controla si el grupo responde a peticiones de información, activo por defecto si al menos una capa interna es consultable. Y **Security**, exactamente igual que en una capa: reglas de acceso por rol, pero aplicadas al grupo completo.

---

## 5. Estilos — el momento en que el dato se vuelve comprensible

**[EN PANTALLA: editor de estilos con una capa de departamentos coloreada]**

Llegamos al paso más subestimado de todos. Puedes tener el almacén perfecto, la capa perfectamente configurada, el grupo perfectamente ordenado —y si el estilo es genérico, tu mapa no le va a decir nada a nadie.

Un estilo es el idioma visual de tu dato: qué color, qué grosor, qué etiqueta, bajo qué condición. Y vive **separado** de la capa: el mismo estilo se reutiliza en diez capas distintas, y una misma capa puede tener múltiples estilos disponibles para que quien consuma el mapa elija cómo verlo.

**Cuatro lenguajes disponibles.** **SLD**, *Styled Layer Descriptor*, el estándar oficial en XML, disponible siempre sin instalar nada extra —el más verboso, pero el que todo cliente SIG entiende sin excepción. **CSS**, una sintaxis mucho más liviana, parecida a las hojas de estilo web, que se traduce internamente a SLD y requiere activar la extensión correspondiente. **YSLD**, el mismo poder de SLD pero escrito en YAML, pensado para autoría más rápida y más legible, también vía extensión. Y **MBStyle**, en JSON, pensado para interoperar con clientes tipo Mapbox GL, igualmente como extensión.

**El editor de estilos tiene cuatro pestañas propias**, y vale la pena mostrarlas todas en cámara: **Datos**, donde escribes o pegas la definición del estilo, con botones para generar un estilo por defecto desde una plantilla interna y para **validar** la sintaxis antes de guardar. **Publicación**, que muestra qué capas están usando este estilo ahora mismo —útil para medir el impacto antes de modificarlo. **Layer Preview**, que previsualiza el estilo aplicado sobre una capa real mientras editas, sin necesidad de guardar primero. Y **Layer Attributes**, que lista los atributos disponibles de la capa asociada, para saber exactamente qué nombres de campo usar en las reglas del estilo —por ejemplo, al colorear por categoría usando el atributo `COD` de un shapefile de municipios.

**Tres formas de aplicar un estilo, y las tres tienen su lugar.** La más común: un **estilo del catálogo**, creado en la página de Styles y asignado como estilo por defecto o adicional desde la pestaña Publicación de la capa. La segunda: un **estilo externo**, donde un cliente envía un SLD completo directamente en la petición WMS, con los parámetros `SLD_BODY` o `SLD=url`, sin que ese estilo exista guardado en tu catálogo —perfecto para pruebas rápidas o clientes que generan estilos de forma dinámica. Y la tercera, la más avanzada: el **modo librería**, donde el cliente especifica capas y estilos con los parámetros estándar, y además adjunta un SLD externo adicional que actúa como una extensión temporal del catálogo, con prioridad sobre los estilos ya guardados si hay coincidencia de nombre.

`[CTA discreto]` Y este es, sin exagerar, el punto donde un mapa técnicamente correcto se convierte en un mapa que comunica de verdad —el terreno exacto donde cruzamos GeoServer con inteligencia artificial en el curso de webmapping, generando y ajustando estilos en minutos en vez de horas.

---

## Cierre — las cinco piezas, ahora como una sola idea

**[EN PANTALLA: el mapa final ya publicado y funcionando en el geovisor]**

Espacio de trabajo. Almacén de datos. Capa. Grupo de capas. Estilo. Cinco decisiones, tomadas en orden, con criterio —no cinco casillas llenadas al apuro, sino cada propiedad entendida a fondo.

La próxima vez que veas un mapa publicado en cualquier sitio, ya no vas a verlo como "un mapa". Vas a poder mirarlo y reconstruir mentalmente las decisiones exactas que alguien tomó para que ese mapa exista, funcione rápido y se entienda de un vistazo.

`[CTA discreto]` Si esto te dejó con ganas de armar tu propio servidor GeoServer desde cero, con base de datos real, capas cacheadas y estilos generados con ayuda de IA —o si tu interés va más del lado móvil, conectando todo esto a una app en Flutter— el camino completo está en el canal, explicado con el mismo nivel de detalle que hoy.

Y esto, amigo, son cosas que NO SABÍAS que DEBERÍAS SABER.

---

## Notas de producción para ti (no leer en voz alta)

- **Ritmo sugerido:** las secciones 2 (almacenes) y 3 (capas) son, con diferencia, las más largas y densas — considera cortarlas en capítulos de YouTube: 1. Workspace, 2. Almacenes, 3. Capas (con sub-capítulos por pestaña: Datos, Publicación, Dimensiones, Tile Caching, Seguridad), 4. Grupos, 5. Estilos. Ayuda al SEO y a que el espectador pueda volver directo a la propiedad que necesita.
- **Pausas naturales:** cada `[EN PANTALLA: ...]` es un buen punto para dejar de hablar 2-3 segundos y que la imagen respire antes de seguir narrando, sobre todo al mostrar tablas de parámetros como los de PostGIS.
- **Los `[CTA discreto]`** están puestos justo después de explicar algo de alto valor real — reciprocidad primero, mención después, nunca al revés.
- **Repetición estratégica:** "cinco piezas / cinco decisiones" aparece en la apertura y el cierre a propósito, como ancla mental para quien vea el video completo.
- Si necesitas la versión recortada en clips cortos para TikTok o Shorts a partir de este guión largo, dímelo y armamos el paquete completo con SFX, prompts de portadas y descripciones, como siempre.