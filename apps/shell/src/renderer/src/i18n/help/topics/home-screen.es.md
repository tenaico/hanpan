# La pantalla de inicio: dónde están sus archivos

Inicio es la página de partida de GenOffice: una barra lateral de navegación a la izquierda y un tablero de tarjetas a la derecha. Escribe un tema en la tarjeta **Empezar** para abrir un mapa mental, y vuelve a abrir documentos recientes desde la tarjeta **Continuar**; su botón **All N** lleva a la lista completa de **Recientes**. En las pantallas en coreano, otra tarjeta muestra el pronóstico de hoy de Trend Radar; al hacer clic en un ámbito se abre Trend Radar en el navegador.

## Navegación en la barra lateral

- **Inicio**: el tablero de tarjetas. La aplicación empieza aquí.
- **Recientes**: los archivos que abrió recientemente. Cada fila lleva su momento: hoy, ayer o la fecha.
- **Destacados**: los archivos que marcó como destacados. Pase el cursor por una fila y haga clic en la estrella para añadirlos o quitarlos. **Mover a grupo** en el menú ⋯ ordena los archivos destacados en grupos con nombre; la vista Destacados filtra por ellos.
- **Guía del usuario**: abre este manual.
- **Ask AI**: el panel de base de conocimiento — pregunta y recibe respuestas citadas desde tus archivos destacados (ver abajo).
- **Carpetas**: los directorios que añade a la barra lateral con **Añadir carpeta…**, o que arrastra hasta ella desde el explorador de archivos. Cada uno se convierte en una raíz que puede abrir, en la que crear subcarpetas, renombrar y quitar; la que se quede sin conexión se muestra como no disponible y se puede quitar de la lista. **Nueva carpeta** crea otra.
- **La fila de abajo del todo**: muestra si hay una IA conectada —**Conectar IA**, o el nombre de la suscripción conectada— y abre Configuración.

Aquí no hay ninguna entrada Papelera. Los archivos borrados van a la papelera del sistema, y restaurarlos es asunto del sistema operativo.

## La lista de archivos

Cada fila muestra un icono, el nombre del archivo, la fecha de modificación y más. El **menú ⋯** de la fila ofrece:

- **Abrir**, y **Mostrar en la carpeta** para localizar el archivo en el explorador de archivos.
- **Copiar ruta**.
- **Mover a carpeta…**: abre un selector de carpeta y mueve realmente el archivo; si el destino ya tiene un archivo con ese nombre, puede omitir, sobrescribir o renombrar.
- **Cambiar nombre**: en el sitio, la extensión se conserva automáticamente.
- **Destacar / Quitar de destacados** — los destacados persisten entre reinicios y siguen al archivo cuando lo renombra.
- **Duplicar**: crea una copia en la misma carpeta.
- **Eliminar**: mueve el archivo a la papelera del sistema; no es una eliminación definitiva.
- **Quitar de la lista**, en la vista **Recientes** de primer nivel, para quitar una entrada sin tocar el archivo.

### Varios archivos a la vez

Marque la casilla de una fila, o haga ⌘/ctrl-clic, para ir formando una selección; la casilla de la cabecera selecciona todo lo que aparece en ese momento, y una barra sobre la lista indica (**{n} seleccionados**) cuántos están seleccionados y ofrece **Mover a carpeta…** y **Eliminar archivos** para todo el conjunto. También puede arrastrar una selección múltiple sobre una carpeta de la barra lateral.

## Búsqueda

Escribe en el cuadro de búsqueda de la fila superior del tablero y los resultados ocupan el lugar del tablero; borra la búsqueda o pulsa Esc para volver al tablero. Busca en dos cosas a la vez:

- **Nombres de archivo**: filtrado rápido por nombre.
- **Contenido de los archivos**: GenOffice indexa sus archivos en segundo plano (el texto de los .docx/odt/xlsx/pptx/pdf/md/html), así que buscar en el cuerpo del texto también encuentra archivos. El ámbito y los interruptores se ajustan en los ajustes de búsqueda.

## Personalizar inicio

Haz clic en **Personalizar inicio**, a la derecha de la fila superior del tablero, para cambiar las tarjetas. Los cambios se guardan al momento; haz clic en **Listo** o pulsa Esc al terminar.

- Arrastra una tarjeta para moverla y su esquina inferior derecha para cambiar su tamaño; el menú **⋯** de la tarjeta también permite elegir un tamaño. Dentro de la tarjeta **Nuevo**, arrastra las aplicaciones para reordenarlas o haz clic en × para quitar una de inicio.
- **Añadir tarjeta** añade una nota rápida, favoritos, una vista de carpeta, un reloj o un acceso directo, y recupera las tarjetas que quitaste. Inicio admite hasta 24 tarjetas.
- **Diseño predeterminado** devuelve a su estado inicial el orden y el tamaño de las tarjetas predeterminadas y las aplicaciones que se muestran en inicio. Las tarjetas que añadiste se mantienen.
- **Ordenar como lista** muestra las tarjetas y las aplicaciones en una lista donde puedes reordenarlas con ↑↓, añadirlas o quitarlas y elegir su tamaño sin ratón.

## Nuevo y All apps

La tarjeta **Nuevo** contiene las aplicaciones que fijaste en inicio. Al hacer clic en una se crea un archivo de ese tipo y se abre su editor: empieza a escribir enseguida o deja que la IA redacte un borrador (cada editor tiene un **botón de IA** en la cinta de opciones y **Pedir a la IA** en el menú contextual de la selección). La última casilla, **All apps**, enumera todas las aplicaciones por grupo: busca por nombre o por lo que hace, abre una de las tres **Recently used apps** o usa el botón de fijar de una aplicación para fijarla en inicio o quitarla. Las aplicaciones que llegan con una versión nueva llevan la insignia **New**.

El archivo nuevo va a la carpeta seleccionada en la barra lateral; si no hay ninguna, va a la carpeta predeterminada.

Qué hace cada aplicación:

- **AI Docs** (.docx): un documento de texto en blanco en el editor Docs. El archivo se escribe en el disco solo al **guardar por primera vez**; los documentos nuevos se abren con el panel de IA desplegado (se desactiva en Configuración → «Abrir el panel de IA en documentos nuevos»).
- **AI Sheets** (.xlsx): una hoja de cálculo en blanco en el editor Sheets. Hasta que no guarde, no existe ningún archivo en el disco; el nombre queda reservado para el primer guardado. Tras la primera generación con IA, el archivo también se puede renombrar automáticamente según su contenido.
- **AI Slides** (.pptx): una presentación en blanco en el editor Slides.
- **AI Markdown** (.md): un documento Markdown en blanco en el editor Markdown.
- **AI HTML** (.html): una página web en blanco en el editor HTML.
- **AI PDF** (.pdf): distinto de los demás: **crea de inmediato** un PDF real en blanco de una sola página en la carpeta de destino y lo abre como un archivo normal (el editor PDF trabaja con archivos reales). Útil para anotar, censurar o añadir texto; el archivo se puede renombrar automáticamente según su contenido al guardarlo por primera vez.
- **Abrir archivo local**: un selector de archivos del sistema para Word (.docx/.doc/.odt), Excel (.xlsx/.xlsm/.xls/.csv/.tsv), PowerPoint (.pptx/.ppt), PDF, Markdown (.md/.markdown) y páginas web (.html/.htm). Permite seleccionar varios; cada archivo recibe su propia pestaña. Los archivos de texto (.txt, .json) también se abren aquí — aterrizan en la vista de código del editor Markdown.

> Sugerencia: Archivo ▸ Nuevo en la barra de menús crea los mismos tipos de documento (⌘N/Ctrl+N crea un documento de texto de forma predeterminada); arrastrar un archivo a la ventana lo abre.

## Pregunta a tu base de conocimiento

- Destaca primero archivos (cualquier tipo que la app lea); la cabecera del panel cuenta el corpus, y una base vacía te invita a destacar algo.
- Las respuestas citan los archivos de origen; haz clic en una cita para abrir el archivo en su editor.
- Necesita una IA conectada; véase [Conexión por suscripción](help://subscription). La conversación vive solo en memoria — cerrar la app la termina.
- La búsqueda usa el índice local de archivos, como la de Inicio; los archivos desaparecidos se salen del corpus sin ruido.
- Los grupos solo organizan la lista Destacados — la base de conocimiento siempre abarca todos los archivos destacados.
