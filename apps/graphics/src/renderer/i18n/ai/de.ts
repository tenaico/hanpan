import type { zh } from './zh'

export const de = {
  aiOpenAssistant: 'KI-Assistent öffnen',
  aiCollapsePanel: 'Panel einklappen',
  aiNewChat: 'Neuer Chat',
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
  aiEmptyTitle: 'Mit KI bearbeiten',
  aiEmptyBody:
    'Sagen Sie der KI, was in diesem Bild geändert werden soll. Sie arbeitet mit den Befehlen der App, und ein einziges Rückgängig nimmt alles zurück, was eine Anfrage geändert hat.',
  aiComposerPlaceholder: 'Sagen Sie der KI, was geändert werden soll…',
  aiEmptyPhoto: 'Zum Beispiel: „Entferne den Hintergrund“, „Mach es etwas heller“',
  aiEmptyIllust:
    'Zum Beispiel: „Zeichne ein abgerundetes Rechteck in die Mitte“, „Exportiere das Logo als PNG“',
  aiUndoAll: 'Rückgängig',
  aiUndoTitle: 'Alles rückgängig machen, was diese Anfrage geändert hat',
  aiUndone: 'Rückgängig gemacht: Das Dokument ist wieder wie vor dieser Anfrage.',
  aiUndoChangedSince:
    'Das Dokument wurde danach geändert und kann nicht in einem Schritt zurückgesetzt werden. Verwenden Sie Rückgängig der App (Strg+Z).',
  aiUndoOverflow:
    'Diese Anfrage hat mehr geändert, als der Verlauf der App behält, und kann nicht in einem Schritt zurückgesetzt werden.',
  aiUndoFailed:
    'Nicht alles konnte rückgängig gemacht werden. Verwenden Sie Rückgängig der App (Strg+Z), um weiter zurückzugehen.',
  aiBusyNotice: 'Während die KI arbeitet, können Sie das Dokument nicht bearbeiten.',
  aiToolFind: 'Befehle gesucht',
  aiToolDescribe: 'Befehl gelesen',
  aiToolRun: 'Befehl ausgeführt',
  aiToolRunMany: 'Befehle ausgeführt',
  aiToolInspect: 'Dokument gelesen',
  aiToolExport: 'Kopie exportiert',
  aiToolGuide: 'Anleitung gelesen',
} satisfies Record<keyof typeof zh, string>
