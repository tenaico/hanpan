import type { zh } from './zh'

export const de = {
  aiOpenAssistant: 'KI-Assistent öffnen',
  aiCollapsePanel: 'Panel einklappen',
  aiNewChat: 'Neuer Chat',
  aiEmptyTitle: 'Mit KI zeichnen',
  aiEmptyBody:
    'Beschreiben Sie, was entstehen soll, zum Beispiel „einen Stiftehalter, 80 breit und 100 hoch, innen mit einem 68er-Loch ausgehöhlt“. Eine Anfrage ist ein Schritt: Ctrl+Z macht sie ganz rückgängig.',
  aiComposerPlaceholder: 'Sagen Sie der KI, was sie erstellen oder ändern soll…',
  aiHintIdle: 'Enter zum Senden, Umschalt+Enter für neue Zeile',
  aiHintBusy: 'Antwortet…',
  aiSend: 'Senden',
  aiStop: 'Stopp',
  aiThinking: 'Denkt nach',
  aiWorking: 'Arbeitet',
  aiGroupWorking: 'In Arbeit…',
  aiWorkedSteps: 'Erledigt · {n} Schritte',
  aiStopped: 'Gestoppt',
  aiNoReply: '(keine Antwort)',
  aiTurnLimit: 'Schrittlimit pro Lauf erreicht — senden Sie eine weitere Anweisung.',
  aiTruncatedNote:
    '(Die Antwort wurde durch das Längenlimit abgeschnitten und ist möglicherweise unvollständig.)',
  aiUndelivered: 'Nicht gesendet',
  aiRetry: 'Erneut versuchen',
  aiCopyReplyTitle: 'Antwort kopieren',
  aiRegenerateTitle: 'Neu generieren',
  aiUnknownError: 'KI-Anfrage fehlgeschlagen, bitte erneut versuchen',
  aiTimeoutError: 'Zeitüberschreitung der KI-Antwort',
  aiCreditsExhausted: 'Guthaben aufgebraucht — beim KI-Anbieter aufladen',
  aiNetworkError:
    'Netzwerkproblem: Der KI-Dienst ist nicht erreichbar. Prüfe deine Verbindung und versuche es erneut',
  aiOverloadedError: 'Der KI-Dienst ist derzeit überlastet — bitte gleich erneut versuchen',
  // the quick actions above the input
  aiQuickActions: 'Schnellaktionen',
  aiQuickSheet: 'Maßblatt erstellen',
  aiQuickRoom: 'Raumplanung beginnen',
  aiQuickRoomPrompt:
    'Mach die Arbeitsfläche zu einem Raum von 5 × 4 m und stelle 4 Schreibtische hinein',
  // the steps of a reply: what each drawing tool did
  aiToolReadModel: 'Zeichnung lesen',
  aiToolAddShapes: 'Formen platzieren · {n}',
  aiToolUpdateShapes: 'Teile ändern · {n}',
  aiToolDeleteShapes: 'Teile löschen · {n}',
  aiToolGroupShapes: 'Teile gruppieren',
  aiToolUngroupShapes: 'Gruppierung aufheben',
  aiToolAlignShapes: 'Teile ausrichten · {n}',
  aiToolSetWorkplane: 'Arbeitsfläche anpassen',
  aiToolRefused: '{action} · abgelehnt',
} satisfies Record<keyof typeof zh, string>
