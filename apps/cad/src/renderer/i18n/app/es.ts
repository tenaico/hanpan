import type { zh } from './zh'

export const es = {
  untitled: 'Dibujo sin título',
  saved: 'Guardado',
  unsaved: 'Sin guardar',
  noWebGlTitle: 'No se puede mostrar la vista 3D',
  noWebGlBody:
    'Este PC no pudo iniciar WebGL, que la vista 3D necesita. El dibujo se puede abrir y guardar, pero no mostrar. Pruebe una de estas opciones y vuelva a abrir la pestaña:',
  noWebGlDriver: 'Actualice el controlador de la tarjeta gráfica.',
  noWebGlAccel: 'Active la aceleración por hardware en la configuración de gráficos.',
  noticeNotOk:
    'No se pudo abrir este archivo como dibujo. Puede estar dañado o haberse creado con una versión más reciente. Hay un dibujo vacío abierto; al guardar se pedirá un archivo nuevo.',
  noticeTooLarge:
    'Este archivo es demasiado grande para abrirlo (límite: 100 MB). Hay un dibujo vacío abierto.',
  noticeUnreadable: 'No se pudo leer este archivo. Hay un dibujo vacío abierto.',
  noticeUnsupported:
    'Este tipo de archivo no se puede abrir aquí. Se abren archivos .ttukcad, .dxf, .stl, .obj, .3mf, .glb y .ply.',
  noticeImportFailed:
    'No se pudieron leer las formas de este archivo. Hay un dibujo vacío abierto.',
  saveRefused:
    'No se pudo guardar el dibujo. Sus cambios siguen aquí; vuelva a intentarlo o use Guardar como.',
  saveFailed:
    'Algo salió mal al guardar el dibujo. Sus cambios siguen aquí; vuelva a intentarlo o use Guardar como.',
  guideTitle: 'Cómo abrir este archivo',
  guideBody:
    'Los archivos {ext} los crean programas de CAD profesionales y Dibujo IA no puede leerlos.',
  guideAsk:
    'Pide a quien lo envió que lo guarde de nuevo como DXF (para un dibujo 2D) o STL (para un modelo 3D) y te envíe ese archivo. Ambos se abren aquí.',
  exportEmpty: 'No hay nada que exportar. Muestra al menos una forma e inténtalo de nuevo.',
  exportFailed: 'No se pudo exportar el archivo. Inténtalo de nuevo o elige otra carpeta.',
  exportSourcePath:
    'Una exportación no puede sustituir el archivo de origen de este dibujo. Elige otro nombre.',
  issueOpenMesh: 'No se puede calcular este grupo: contiene una malla abierta',
  issueTooLarge: 'Demasiados triángulos para mostrar (límite: 2 millones)',
  editLocked: 'Esta pieza está bloqueada. Desbloquéela para cambiarla.',
  editNotScalable:
    'Esta pieza no se puede redimensionar con el control. Las mallas importadas, los dibujos, los grupos y el texto solo se pueden mover y girar.',
  editRefused: 'No se pudo hacer ese cambio. El dibujo no ha cambiado.',
} satisfies Record<keyof typeof zh, string>
