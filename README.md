# AngelScan

## Versión para el equipo

Incluye la página completa con imágenes, logo, catálogo por géneros, populares, lector, panel de administración y comentarios por serie. Las instrucciones de abajo permiten ejecutarla localmente. No incluye contraseñas reales, credenciales, cuentas ni configuraciones de alojamiento.

Proyecto basado en [ryoka0123/vortex-scans](https://github.com/ryoka0123/vortex-scans), con su historial original conservado.

Biblioteca de manhwa, manhua y manga en español con panel editorial y persistencia compartida en Node.js. No necesita paquetes de producción ni un proceso de compilación.

## Iniciar

Requiere Node.js 20 o posterior. En PowerShell:

```powershell
$env:ADMIN_PASSWORD = 'elige-una-clave-larga-y-unica'
npm start
```

Abre http://localhost:3000 y pulsa **Administración**. Si no defines `ADMIN_PASSWORD`, el servidor imprime una contraseña temporal nueva en cada arranque. Las sesiones duran ocho horas y se invalidan al reiniciar.

## Panel editorial

- Resumen de series, capítulos, visitas y series en emisión.
- Catálogo visual con portada, título, estado, capítulos y visitas; búsqueda y orden por popularidad.
- Ficha independiente por serie con vista previa en directo, portada por URL o archivo, banner, autor, artista, géneros, sinopsis y destacado de inicio.
- Crear, editar y eliminar capítulos con miniaturas de sus páginas. Las imágenes locales se ordenan por nombre natural (01, 02, 10).
- **Aplicar capítulo al borrador** actualiza el borrador; **Guardar cambios** publica la serie y todos sus capítulos. Editar un capítulo conserva el resto.
- Eliminación de series y capítulos con confirmación.

## Biblioteca y lectura

Búsqueda por título, autor y género; filtros por tipo; orden de actualización, visitas y título. Fichas de serie con búsqueda de capítulos, favoritos y progreso local en este navegador. Lector continuo con tres anchos y navegación entre capítulos. Diseño adaptable y animaciones que respetan la preferencia de movimiento reducido.

## Datos y despliegue

`data/catalog.json` contiene los datos compartidos y se escribe mediante reemplazo de archivo temporal. Conserva copias de seguridad y monta un disco persistente si despliegas en un proveedor. El servidor debe ejecutarse en **una sola instancia**; no es un sistema multiusuario con resolución de ediciones simultáneas. Para varias instancias o un catálogo de gran escala, migra a una base de datos y almacenamiento de imágenes.

Define `PORT` si necesitas otro puerto. Usa HTTPS detrás de un proxy y define `COOKIE_SECURE=true` en producción. Nunca pongas la contraseña en el código o en archivos públicos. Las mutaciones requieren sesión de administrador; el servidor limita intentos de acceso y restringe los archivos públicos. No publiques la carpeta del proyecto mediante un servidor estático: la aplicación necesita su servidor Node.

Los títulos y páginas originales del repositorio son **demostraciones**, marcadas en sus fichas. Se añadieron ilustraciones conceptuales generadas con ImageGen y optimizadas a WebP; reemplázalas por las portadas y páginas autorizadas de cada obra antes de publicar. Sus estadísticas comienzan en cero. Las visitas cuentan aperturas de ficha, con una ventana de 30 minutos por IP y serie; no representan lectores únicos ni analítica histórica. No hay cifras inventadas.

Las subidas de archivos se guardan como imágenes integradas en el catálogo: máximo 20 MB de archivos por selección y 30 MB por petición. Para capítulos grandes utiliza URLs de un almacenamiento de imágenes. Las fuentes externas son opcionales; hay fuentes de respaldo del sistema.

## Comprobaciones

```powershell
npm install
npx playwright install chromium
npx playwright test
```

Las pruebas verifican catálogo, favoritos, lectura, ancho móvil, acceso protegido y el ciclo de creación/edición/eliminación con capítulos. Ejecutarlas utiliza un catálogo de pruebas independiente.

