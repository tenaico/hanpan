# Dibujo IA

Dibujo IA es una pestaña para modelos 3D y planos sencillos. Abra un plano que le hayan enviado y compruebe sus medidas, construya un modelo pequeño a mano o pidiéndoselo a la IA, y ponga un plano acotado en un documento de Hangul o de Word. Los dibujos se guardan como archivos .ttukcad, y todas las longitudes están en milímetros.

## Abrir un dibujo

- Para un dibujo nuevo, vaya al inicio, abra **All apps** y pulse **Dibujo IA**. La pestaña empieza como **Dibujo sin título**.
- Para abrir un archivo, use **Archivo › Abrir…** (Ctrl+O) o arrastre el archivo a la ventana. Dibujo IA abre archivos .ttukcad, DXF, DWG, STL, OBJ, 3MF, GLB y PLY. Los DWG se abren desde el formato AutoCAD R14 hasta el formato 2018.
- Un archivo que no es .ttukcad se abre como un dibujo nuevo sin título con el nombre del archivo. El archivo original nunca se modifica: al guardar siempre se pide un archivo .ttukcad nuevo.
- Los archivos STEP, IGES y BREP son archivos 3D de programas de CAD profesionales y no se pueden leer. En su lugar, Dibujo IA muestra **Cómo abrir este archivo**: pida a quien se lo envió un STL (un modelo 3D).
- Un archivo de más de 100 MB, o un modelo con más de 2 millones de triángulos, no se abre.

## Colocar formas

- **Inicio › Colocar formas** reúne las cuatro formas más usadas; **Más** abre la galería con las 15: caja, cilindro, esfera, cono, pirámide, cuña, semiesfera, tubo, toro, prisma triangular, prisma hexagonal, caja redondeada, prisma de estrella, tejado y texto.
- Cada forma nueva aparece en el centro del plano de trabajo, la base sobre la que se apoya el modelo. Haga clic en una forma para seleccionarla; Shift+clic o Ctrl+clic añade más formas a la selección.
- **Vista › Controles** elige qué hacen los controles de la forma seleccionada: **Mover**, **Girar** o **Tamaño**. Al arrastrar, la forma avanza en saltos de 1 mm y 15°; mantenga pulsado Alt mientras arrastra para quitar el ajuste.
- El panel **Propiedades** de la derecha muestra la forma seleccionada: nombre, tipo (sólido o agujero), tamaño, posición (mm), giro (°) y color. Escriba un número para cambiarlo. **Ocultar** y **Bloquear** apartan una forma para que no estorbe.
- **Vista › Vistas** gira la cámara a **Arriba**, **Frente** o **Lado**, y **Ver todo** encuadra el modelo completo. Arrastre en la vista para girarla y use la rueda del ratón para acercar o alejar.
- La barra de estado de abajo muestra el tamaño del plano de trabajo, el ajuste y la cuadrícula, y el ancho × fondo × alto de la forma seleccionada.

## Agujeros, grupos y alineación

- Un agujero es una forma que recorta. Seleccione una forma y pulse **Agujero** (o H) para convertirla en agujero; vuelva a pulsar para que sea sólida otra vez.
- Un agujero solo recorta dentro de un grupo. Seleccione el agujero y los sólidos que debe recortar y pulse **Agrupar** (Ctrl+G): el grupo son los sólidos menos los agujeros. **Desagrupar** (Ctrl+Shift+G) lo separa de nuevo.
- **Alinear** coloca las formas seleccionadas en línea con la primera forma que seleccionó: izquierda, centro o derecha; delante, centro o detrás; abajo, centro o arriba.
- Por ejemplo, un cilindro de 80 mm de diámetro y un cilindro agujero de 68 mm de diámetro elevado 5 mm, seleccionados juntos y agrupados, forman un vaso con un fondo de 5 mm.

## Dibujar a mano y texto

- **Dibujar a mano** traza un contorno propio. Haga clic en el plano de trabajo para colocar al menos 3 puntos; **Deshacer punto** quita el último.
- Escriba la **Altura (mm)** y pulse **Cerrar forma**: el contorno se levanta como un sólido. **Cancelar** sale sin crear nada.
- No se aceptan líneas que se cruzan. Deshaga puntos hasta que dejen de cruzarse.
- **Texto** pide las palabras que quiere colocar y las convierte en letras sólidas, con la fuente que viene con GenOffice.

## Editar las líneas y el texto de un plano recibido

- Abra un DXF o un DWG y pulse **Editar líneas**. Haga clic en una línea, un círculo, un arco o un texto del plano para seleccionarlo (se pinta del color de resaltado); Shift+clic selecciona más.
- En la barra de abajo, **Eliminar** (o la tecla Delete) quita lo seleccionado, **Mover** lo desplaza las X e Y que escriba en mm y, con un solo texto seleccionado, escribe las palabras nuevas y pulsa **Cambiar texto**. Esc borra la selección; pulsarlo otra vez termina Editar líneas.
- Cada cambio se revierte con un solo **Deshacer** (Ctrl+Z). Un plano bloqueado no se modifica.
- También puede pedírselo al asistente de IA, por ejemplo: "Borra todo lo que hay en la capa de cotas", "Cambia el texto 'Sala de reuniones' por 'Sala de reuniones grande'", "Mueve la capa de puertas 500 mm a la derecha".
- El resultado se guarda como .ttukcad. El archivo DXF o DWG original nunca se modifica.

## Medir y el plano acotado

- **Medir** muestra la distancia entre dos puntos en los que hace clic, la longitud de una línea o el diámetro de un círculo. Los puntos se ajustan a esquinas, extremos de líneas y centros de círculos. Esc borra la medida.
- **Plano acotado** dibuja el modelo de frente, desde arriba y de lado en una hoja A4, con el ancho, el fondo y el alto totales, una escala que encaje (1:1, 1:2, 1:5, 1:10 …) y un cajetín con el nombre, la fecha y la escala. Un dibujo que viene de un archivo DXF muestra solo la vista desde arriba.
- En el plano acotado, **Copiar imagen** lo pone en el portapapeles. Péguelo en una pestaña de Hangul, Word o PowerPoint.
- **Enviar a Hangul** abre un documento nuevo de Hangul con el plano y una tabla de las formas y sus medidas. Si **Funciones de documentos coreanos** está desactivado en la configuración, el botón dice **Enviar a Word** y crea un documento de Word.

## El asistente de IA

- El panel de IA junto al dibujo coloca formas, cambia tamaños y posiciones, hace agujeros, agrupa, alinea, fija el tamaño del plano de trabajo y resume el modelo. Algunas peticiones para probar:
  - «Haz un portalápices de 80 mm de ancho y 100 mm de alto, hueco por dentro con 68 mm de diámetro»
  - «Convierte el plano de trabajo en una sala de 5 × 4 m y coloca cuatro escritorios»
  - «Alinea a la izquierda las formas seleccionadas»
- Todo lo que cambió una petición se revierte con un solo **Deshacer** (Ctrl+Z), aunque haya tocado muchas formas.
- La IA recibe su petición y un resumen del modelo (nombre, tipo, tamaño y posición de cada forma). No puede guardar, abrir, exportar ni enviar; eso queda en sus manos.
- Para dar a la IA una hoja de especificaciones o un boceto, adjúntelo con el botón del clip bajo la entrada, arrástrelo al panel o pegue una imagen (Ctrl+V). La IA lo lee y construye a partir de él; el archivo nunca entra en el dibujo y la solicitud sigue siendo un solo deshacer.

## Guardar y recuperar

- **Guardar** (Ctrl+S) escribe un archivo .ttukcad. Dibujo IA solo guarda en este formato; **Guardar como…** (Ctrl+Shift+S) elige otro nombre u otro lugar.
- **Guardado automático**, arriba, guarda cada 30 segundos y cada vez que la ventana pierde el foco, en cuanto el dibujo tiene su propio archivo.
- Si GenOffice se cierra de forma inesperada, al iniciarlo de nuevo el dibujo aparece en **Documentos con contenido sin guardar**. Pulse **Restaurar** para recuperarlo.

## Exportar

- **Archivo › Exportar STL** y **Exportar OBJ** escriben el modelo para una impresora 3D u otro programa. **Exportar imagen (PNG)** guarda lo que muestra la vista, sobre un fondo claro.
- Una exportación nunca sustituye el archivo del que salió el dibujo.

## Atajos de teclado

| Teclas                | Qué hace                     |
| --------------------- | ---------------------------- |
| Ctrl+Z                | Deshacer                     |
| Ctrl+Y o Ctrl+Shift+Z | Rehacer                      |
| Ctrl+S                | Guardar                      |
| Ctrl+A                | Seleccionar todo             |
| Delete                | Eliminar                     |
| Ctrl+D                | Duplicar                     |
| Ctrl+G                | Agrupar                      |
| Ctrl+Shift+G          | Desagrupar                   |
| H                     | Agujero ↔ sólido             |
| Teclas de flecha      | Mover 1 mm (con Mayús 10 mm) |
| Alt al arrastrar      | Quitar el ajuste             |

**Ayuda › Atajos** muestra la misma lista dentro de la pestaña.

## Lo que no puede hacer

- Abrir directamente archivos STEP, IGES o BREP. Pida un STL en su lugar.
- Guardar de nuevo en DXF o DWG. Un plano editado se guarda como .ttukcad.
- Restricciones, historial de diseño o ensamblajes como en los programas de CAD profesionales. Cada forma se define con sus propios números.
- Imprimir. Envíe el plano acotado a un documento de Hangul o de Word e imprima desde allí.
