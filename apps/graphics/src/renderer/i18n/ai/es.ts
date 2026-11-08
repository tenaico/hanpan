import type { zh } from './zh'

export const es = {
  aiOpenAssistant: 'Abrir asistente de IA',
  aiCollapsePanel: 'Contraer panel',
  aiNewChat: 'Nueva conversación',
  aiHintIdle: 'Enter para enviar, Mayús+Enter para nueva línea',
  aiHintBusy: 'Respondiendo…',
  aiSend: 'Enviar',
  aiStop: 'Detener',
  aiThinking: 'Pensando',
  aiWorking: 'Trabajando',
  aiGroupWorking: 'En curso…',
  aiWorkedSteps: 'Completado · {n} pasos',
  aiStopped: 'Detenido',
  aiNoReply: '(sin respuesta)',
  aiTurnLimit:
    'Se alcanzó el límite de pasos por ejecución; envía otra instrucción para continuar.',
  aiTruncatedNote: '(La respuesta fue cortada por el límite de longitud y puede estar incompleta.)',
  aiUndelivered: 'No enviado',
  aiRetry: 'Reintentar',
  aiCopyReplyTitle: 'Copiar respuesta',
  aiRegenerateTitle: 'Regenerar',
  aiUnknownError: 'La solicitud de IA falló, reinténtalo',
  aiTimeoutError: 'La respuesta de IA agotó el tiempo',
  aiCreditsExhausted: 'Sin créditos — recarga con tu proveedor de IA',
  aiNetworkError:
    'Problema de red: no se pudo conectar con el servicio de IA. Comprueba tu conexión e inténtalo de nuevo',
  aiOverloadedError:
    'El servicio de IA está saturado en este momento; inténtalo de nuevo en unos instantes',
  aiEmptyTitle: 'Editar con IA',
  aiEmptyBody:
    'Dile a la IA qué cambiar en esta imagen. Trabaja con los comandos de la aplicación, y un solo Deshacer revierte todo lo que cambió una petición.',
  aiComposerPlaceholder: 'Dile a la IA qué cambiar…',
  aiEmptyPhoto: 'Por ejemplo: «Quita el fondo», «Hazla un poco más clara»',
  aiEmptyIllust:
    'Por ejemplo: «Dibuja un rectángulo redondeado en el centro», «Exporta el logotipo como PNG»',
  aiUndoAll: 'Deshacer',
  aiUndoTitle: 'Deshacer todo lo que cambió esta petición',
  aiUndone: 'Deshecho: el documento volvió a como estaba antes de esta petición.',
  aiUndoChangedSince:
    'El documento cambió después, así que no se puede deshacer en un paso. Usa Deshacer de la aplicación (Ctrl+Z).',
  aiUndoOverflow:
    'Esta petición hizo más cambios de los que guarda el historial de la aplicación, así que no se puede deshacer en un paso.',
  aiUndoFailed:
    'No se pudo deshacer todo. Usa Deshacer de la aplicación (Ctrl+Z) para retroceder más.',
  aiBusyNotice: 'No puedes editar el documento mientras la IA trabaja.',
  aiToolFind: 'Comandos buscados',
  aiToolDescribe: 'Comando leído',
  aiToolRun: 'Comando ejecutado',
  aiToolRunMany: 'Comandos ejecutados',
  aiToolInspect: 'Documento leído',
  aiToolExport: 'Copia exportada',
  aiToolGuide: 'Guía leída',
} satisfies Record<keyof typeof zh, string>
