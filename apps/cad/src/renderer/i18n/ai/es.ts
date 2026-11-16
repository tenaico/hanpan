import type { zh } from './zh'

export const es = {
  aiOpenAssistant: 'Abrir asistente de IA',
  aiCollapsePanel: 'Contraer panel',
  aiNewChat: 'Nueva conversación',
  aiEmptyTitle: 'Dibujar con IA',
  aiEmptyBody:
    'Describa lo que quiere hacer, por ejemplo «un portalápices de 80 de ancho y 100 de alto, hueco por dentro con un agujero de 68». Una petición es un solo paso: Ctrl+Z la deshace entera.',
  aiComposerPlaceholder: 'Dígale a la IA qué crear o cambiar…',
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
  // the quick actions above the input
  aiQuickActions: 'Acciones rápidas',
  aiQuickSheet: 'Crear un plano acotado',
  aiQuickRoom: 'Empezar la distribución de una habitación',
  aiQuickRoomPrompt:
    'Convierte el plano de trabajo en una habitación de 5 × 4 m y coloca 4 escritorios',
  // the steps of a reply: what each drawing tool did
  aiToolReadModel: 'Leer el dibujo',
  aiToolAddShapes: 'Colocar formas · {n}',
  aiToolUpdateShapes: 'Cambiar piezas · {n}',
  aiToolDeleteShapes: 'Eliminar piezas · {n}',
  aiToolGroupShapes: 'Agrupar piezas',
  aiToolUngroupShapes: 'Desagrupar',
  aiToolAlignShapes: 'Alinear piezas · {n}',
  aiToolSetWorkplane: 'Cambiar el tamaño del plano de trabajo',
  aiToolRefused: '{action} · rechazado',
} satisfies Record<keyof typeof zh, string>
