import type { zh } from './zh'

export const it = {
  aiOpenAssistant: 'Apri assistente IA',
  aiCollapsePanel: 'Comprimi pannello',
  aiNewChat: 'Nuova chat',
  aiHintIdle: 'Invio per inviare, Maiusc+Invio per andare a capo',
  aiHintBusy: 'Sta rispondendo…',
  aiSend: 'Invia',
  aiStop: 'Interrompi',
  aiThinking: 'Sta pensando',
  aiWorking: 'Sta lavorando',
  aiGroupWorking: 'In corso…',
  aiWorkedSteps: 'Completato · {n} passaggi',
  aiStopped: 'Interrotto',
  aiNoReply: '(nessuna risposta)',
  aiTurnLimit: "Raggiunto il limite di passaggi per esecuzione — invia un'altra istruzione.",
  aiTruncatedNote:
    '(La risposta è stata troncata dal limite di lunghezza e potrebbe essere incompleta.)',
  aiUndelivered: 'Non inviato',
  aiRetry: 'Riprova',
  aiCopyReplyTitle: 'Copia risposta',
  aiRegenerateTitle: 'Rigenera',
  aiUnknownError: 'Richiesta IA non riuscita, riprova',
  aiTimeoutError: 'Timeout della risposta IA',
  aiCreditsExhausted: 'Crediti esauriti — ricarica presso il tuo provider di IA',
  aiNetworkError:
    'Problema di rete: impossibile raggiungere il servizio IA. Controlla la connessione e riprova',
  aiOverloadedError: 'Il servizio IA è momentaneamente sovraccarico — riprova tra poco',
  aiEmptyTitle: "Modifica con l'IA",
  aiEmptyBody:
    "Di' all'IA cosa cambiare in questa immagine. Lavora con i comandi dell'app, e un solo Annulla riporta indietro tutto ciò che una richiesta ha cambiato.",
  aiComposerPlaceholder: "Di' all'IA cosa cambiare…",
  aiEmptyPhoto: "Per esempio: «Rimuovi lo sfondo», «Rendila un po' più chiara»",
  aiEmptyIllust:
    'Per esempio: «Disegna un rettangolo arrotondato al centro», «Esporta il logo in PNG»',
  aiUndoAll: 'Annulla',
  aiUndoTitle: 'Annulla tutto ciò che questa richiesta ha cambiato',
  aiUndone: "Annullato: il documento è tornato com'era prima di questa richiesta.",
  aiUndoChangedSince:
    "Il documento è cambiato dopo, quindi non si può annullare in un solo passo. Usa Annulla dell'app (Ctrl+Z).",
  aiUndoOverflow:
    "Questa richiesta ha fatto più modifiche di quante ne conservi la cronologia dell'app, quindi non si può annullare in un solo passo.",
  aiUndoFailed:
    "Non è stato possibile annullare tutto. Usa Annulla dell'app (Ctrl+Z) per tornare più indietro.",
  aiBusyNotice: "Non puoi modificare il documento mentre l'IA lavora.",
  aiToolFind: 'Comandi cercati',
  aiToolDescribe: 'Comando letto',
  aiToolRun: 'Comando eseguito',
  aiToolRunMany: 'Comandi eseguiti',
  aiToolInspect: 'Documento letto',
  aiToolExport: 'Copia esportata',
  aiToolGuide: 'Guida letta',
} satisfies Record<keyof typeof zh, string>
