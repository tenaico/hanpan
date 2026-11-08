import type { zh } from './zh'

export const nl = {
  aiOpenAssistant: 'AI-assistent openen',
  aiCollapsePanel: 'Paneel inklappen',
  aiNewChat: 'Nieuwe chat',
  aiHintIdle: 'Enter om te verzenden, Shift+Enter nieuwe regel',
  aiHintBusy: 'Antwoordt…',
  aiSend: 'Verzenden',
  aiStop: 'Stoppen',
  aiThinking: 'Denkt na',
  aiWorking: 'Bezig',
  aiGroupWorking: 'Bezig…',
  aiWorkedSteps: 'Klaar · {n} stappen',
  aiStopped: 'Gestopt',
  aiNoReply: '(geen antwoord)',
  aiTurnLimit: 'Stappenlimiet per run bereikt — stuur nog een instructie om door te gaan.',
  aiTruncatedNote: '(Het antwoord is afgekapt door de lengtelimiet en is mogelijk onvolledig.)',
  aiUndelivered: 'Niet verzonden',
  aiRetry: 'Opnieuw proberen',
  aiCopyReplyTitle: 'Antwoord kopiëren',
  aiRegenerateTitle: 'Opnieuw genereren',
  aiUnknownError: 'AI-verzoek mislukt, probeer opnieuw',
  aiTimeoutError: 'AI-antwoord time-out',
  aiCreditsExhausted: 'Credits op — waardeer op bij je AI-aanbieder',
  aiNetworkError:
    'Netwerkprobleem: kan de AI-service niet bereiken. Controleer je verbinding en probeer het opnieuw',
  aiOverloadedError: 'De AI-service is momenteel overbelast — probeer het zo opnieuw',
  aiEmptyTitle: 'Bewerken met AI',
  aiEmptyBody:
    'Vertel de AI wat er in deze afbeelding moet veranderen. Hij werkt met de opdrachten van de app, en één keer Ongedaan maken draait alles terug wat een verzoek veranderde.',
  aiComposerPlaceholder: 'Vertel de AI wat er moet veranderen…',
  aiEmptyPhoto: 'Bijvoorbeeld: "Verwijder de achtergrond", "Maak het iets lichter"',
  aiEmptyIllust:
    'Bijvoorbeeld: "Teken een afgeronde rechthoek in het midden", "Exporteer het logo als PNG"',
  aiUndoAll: 'Ongedaan maken',
  aiUndoTitle: 'Alles ongedaan maken wat dit verzoek veranderde',
  aiUndone: 'Ongedaan gemaakt: het document is terug zoals vóór dit verzoek.',
  aiUndoChangedSince:
    'Het document is daarna veranderd en kan niet in één stap worden teruggedraaid. Gebruik Ongedaan maken van de app (Ctrl+Z).',
  aiUndoOverflow:
    'Dit verzoek maakte meer wijzigingen dan de geschiedenis van de app bewaart en kan niet in één stap worden teruggedraaid.',
  aiUndoFailed:
    'Niet alles kon ongedaan worden gemaakt. Gebruik Ongedaan maken van de app (Ctrl+Z) om verder terug te gaan.',
  aiBusyNotice: 'U kunt het document niet bewerken terwijl de AI werkt.',
  aiToolFind: 'Opdrachten gezocht',
  aiToolDescribe: 'Opdracht gelezen',
  aiToolRun: 'Opdracht uitgevoerd',
  aiToolRunMany: 'Opdrachten uitgevoerd',
  aiToolInspect: 'Document gelezen',
  aiToolExport: 'Kopie geëxporteerd',
  aiToolGuide: 'Handleiding gelezen',
} satisfies Record<keyof typeof zh, string>
