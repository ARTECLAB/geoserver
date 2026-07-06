# 📋 GeoServer 3 — Banco de Preguntas
**ARTECLAB · danielquisbert.com/test/**

Sistema de cuestionarios interactivos de práctica para el curso de GeoServer 3. Archivos HTML estáticos, sin backend, sin dependencias externas. Funciona directamente en GitHub Pages.

---

## 🌐 URLs en producción

| Archivo | URL |
|---------|-----|
| Índice general | `danielquisbert.com/test/` |
| Clase 1 | `danielquisbert.com/test/meridian.html` |
| Clase 2 | `danielquisbert.com/test/datum.html` |
| Clase 3 | `danielquisbert.com/test/vector.html` |
| Clase 4 | `danielquisbert.com/test/raster.html` |
| Clase 5 | `danielquisbert.com/test/symbology.html` |
| Clase 6 | `danielquisbert.com/test/topology.html` |
| Clase 7 | `danielquisbert.com/test/ogcapi.html` |
| Clase 8 | `danielquisbert.com/test/geodesia.html` |

---

## 🗂️ Arquitectura de archivos

```
test/
│
├── index.html              ← Página de entrada (presentación del curso)
│
├── meridian.html           ← Clase 1: Fundamentos y Arquitectura de GeoServer 3
├── datum.html              ← Clase 2: Instalación en Linux (Java 17 + Tomcat 11 + WAR)
├── vector.html             ← Clase 3: Docker y Conversión de Datos Geoespaciales
├── raster.html             ← Clase 4: Publicación de Capas Vectoriales y Raster
├── symbology.html          ← Clase 5: Estilos con SLD y CSS
├── topology.html           ← Clase 6: PostGIS + GeoServer
├── ogcapi.html             ← Clase 7: Servicios OGC, Filtros CQL y Seguridad
├── geodesia.html           ← Clase 8: Proyecto Final — IDE Municipal
│
└── assets/
    ├── quiz.css            ← Estilos compartidos (paleta ARTECLAB + dark mode)
    └── quiz.js             ← Lógica compartida (motor del quiz, dark mode, año)
```

---

## ⚙️ Cómo funciona

Cada archivo `.html` contiene únicamente su propio array de preguntas declarado como `window.QUIZ_QUESTIONS`. El CSS y el JS son completamente compartidos — al modificar `assets/quiz.css` o `assets/quiz.js` el cambio aplica a los 9 archivos de una sola vez.

```
meridian.html
│
├── <link> assets/quiz.css     ← carga estilos
├── window.QUIZ_QUESTIONS = [  ← define las 12 preguntas de la clase
│     { id, type, text, options, correct, hint, explanation, points }
│   ]
└── <script> assets/quiz.js    ← motor: renderiza, evalúa, muestra resultado
```

El `index.html` tiene su propio JS inline mínimo (dark mode + año) porque no usa el motor del quiz.

---

## 🧠 Lógica del cuestionario

```
Usuario selecciona una opción
        │
        ▼
¿Es correcta?
   │         │
  SÍ         NO
   │         │
   │         ¿Es el primer intento?
   │              │           │
   │             SÍ           NO (2.º intento)
   │              │           │
   │         Muestra       Muestra respuesta
   │         pista →       correcta + explicación
   │         rehabilita    Marca como fallida
   │         opciones
   │
Muestra ✓ + explicación
Puntaje completo (1.er intento) o mitad (2.º intento)
        │
        ▼
¿Todas las preguntas respondidas?
        │
        ▼
Habilita botón "Ver resultado final"
        │
        ▼
Panel de resultados: nota /100, desglose por pregunta
```

---

## 🌗 Dark mode

Detecta automáticamente la preferencia del sistema operativo (`prefers-color-scheme`). El usuario puede cambiarla con el botón en la esquina superior derecha del header. La preferencia se guarda en `localStorage` con la clave `arteclab-theme` y persiste entre visitas.

```
localStorage['arteclab-theme'] = 'dark' | 'light'
```

---

## 📅 Año automático

El año en el footer no está escrito en ningún HTML. `quiz.js` ejecuta `new Date().getFullYear()` al cargar la página y llena todos los elementos con clase `footer-year`. En 2027 mostrará 2027 sin tocar ningún archivo.

---

## 📐 Nomenclatura de archivos

Los nombres no revelan el orden del curso intencionalmente — evita que los estudiantes se adelanten a clases no vistas buscando patrones como `clase1.html`, `clase2.html`.

| Nombre | Término | Clase |
|--------|---------|-------|
| `meridian` | Meridiano (línea de referencia) | 1 |
| `datum` | Datum geodésico | 2 |
| `vector` | Datos vectoriales | 3 |
| `raster` | Datos raster | 4 |
| `symbology` | Simbología cartográfica | 5 |
| `topology` | Topología espacial | 6 |
| `ogcapi` | OGC API / Servicios OGC | 7 |
| `geodesia` | Geodesia | 8 |

---

## 📊 Contenido por cuestionario

| Archivo | Tema | Preguntas | Puntos |
|---------|------|-----------|--------|
| `meridian.html` | Fundamentos GeoServer 3 | 12 | 100 |
| `datum.html` | Instalación en Linux | 12 | 100 |
| `vector.html` | Docker + ogr2ogr | 12 | 100 |
| `raster.html` | Publicación de capas | 12 | 100 |
| `symbology.html` | Estilos SLD y CSS | 12 | 100 |
| `topology.html` | PostGIS + GeoServer | 12 | 100 |
| `ogcapi.html` | Servicios OGC + Seguridad | 12 | 100 |
| `geodesia.html` | Proyecto Final IDE | 12 | 100 |
| **Total** | | **96** | **800** |

---

## 🔗 Sitios relacionados

| Sitio | URL |
|-------|-----|
| Sitio personal | [danielquisbert.com](https://danielquisbert.com) |
| Curso GeoServer 3 | [geoserver.danielquisbert.com](https://geoserver.danielquisbert.com) |
| Curso Flutter+GIS | [fluttergis.danielquisbert.com](https://fluttergis.danielquisbert.com) |

---

## ✏️ Agregar o editar preguntas

Abre el `.html` correspondiente y edita el array `window.QUIZ_QUESTIONS`. Cada objeto sigue esta estructura:

```js
{
  id: 1,                        // número único dentro del archivo
  type: "Opción múltiple",      // o "Verdadero / Falso"
  points: 8,                    // puntos del primer intento (2.º = la mitad)
  text: "¿Texto de la pregunta?",
  options: [
    "Opción A",
    "Opción B",
    "Opción C",
    "Opción D"
  ],
  correct: 1,                   // índice base 0 de la opción correcta
  hint: "Pista para el 2.º intento.",
  explanation: "Explicación completa que aparece al responder correctamente o agotar intentos."
}
```

---

*ARTECLAB · <https://danielquisbert.com> · GeoServer 3.0.0*