import type { zh } from './zh'

export const it = {
  aiOpenAssistant: 'Apri assistente IA',
  aiCollapsePanel: 'Comprimi pannello',
  aiNewChat: 'Nuova chat',
  aiEmptyTitle: 'Disegna con l’IA',
  aiEmptyBody:
    'Descrivi cosa vuoi creare, per esempio «un portapenne largo 80 e alto 100, svuotato all’interno con un foro da 68». Una richiesta è un solo passo: Ctrl+Z la annulla tutta.',
  aiComposerPlaceholder: 'Di’ all’IA cosa creare o modificare…',
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
  // the quick actions above the input
  aiQuickActions: 'Azioni rapide',
  aiQuickSheet: 'Crea una tavola quotata',
  aiQuickRoom: 'Inizia la disposizione di una stanza',
  aiQuickRoomPrompt: 'Trasforma il piano di lavoro in una stanza di 5 × 4 m e metti 4 scrivanie',
  // the steps of a reply: what each drawing tool did
  aiToolReadModel: 'Leggi il disegno',
  aiToolAddShapes: 'Inserisci forme · {n}',
  aiToolUpdateShapes: 'Modifica parti · {n}',
  aiToolDeleteShapes: 'Elimina parti · {n}',
  aiToolGroupShapes: 'Raggruppa parti',
  aiToolUngroupShapes: 'Separa',
  aiToolAlignShapes: 'Allinea parti · {n}',
  aiToolSetWorkplane: 'Ridimensiona il piano di lavoro',
  aiToolRefused: '{action} · rifiutato',
} satisfies Record<keyof typeof zh, string>
