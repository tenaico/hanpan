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
    'Este tipo de archivo no se puede abrir aquí. Se abren archivos .ttukcad, .dxf, .stl y .obj.',
  noticeImportFailed:
    'No se pudieron leer las formas de este archivo. Hay un dibujo vacío abierto.',
  saveRefused:
    'No se pudo guardar el dibujo. Sus cambios siguen aquí; vuelva a intentarlo o use Guardar como.',
  saveFailed:
    'Algo salió mal al guardar el dibujo. Sus cambios siguen aquí; vuelva a intentarlo o use Guardar como.',
} satisfies Record<keyof typeof zh, string>
