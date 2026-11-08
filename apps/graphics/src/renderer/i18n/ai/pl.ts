import type { zh } from './zh'

export const pl = {
  aiOpenAssistant: 'Otwórz asystenta AI',
  aiCollapsePanel: 'Zwiń panel',
  aiNewChat: 'Nowy czat',
  aiHintIdle: 'Enter wysyła, Shift+Enter nowa linia',
  aiHintBusy: 'Odpowiada…',
  aiSend: 'Wyślij',
  aiStop: 'Zatrzymaj',
  aiThinking: 'Myśli',
  aiWorking: 'Pracuje',
  aiGroupWorking: 'W toku…',
  aiWorkedSteps: 'Ukończono · {n} kroków',
  aiStopped: 'Zatrzymano',
  aiNoReply: '(brak odpowiedzi)',
  aiTurnLimit: 'Osiągnięto limit kroków — wyślij kolejną instrukcję, aby kontynuować.',
  aiTruncatedNote: '(Odpowiedź została ucięta przez limit długości i może być niepełna.)',
  aiUndelivered: 'Nie wysłano',
  aiRetry: 'Ponów',
  aiCopyReplyTitle: 'Kopiuj odpowiedź',
  aiRegenerateTitle: 'Wygeneruj ponownie',
  aiUnknownError: 'Żądanie AI nie powiodło się, spróbuj ponownie',
  aiTimeoutError: 'Przekroczono czas odpowiedzi AI',
  aiCreditsExhausted: 'Brak kredytów — doładuj u swojego dostawcy AI',
  aiNetworkError:
    'Problem z siecią: nie można połączyć się z usługą AI. Sprawdź połączenie i spróbuj ponownie',
  aiOverloadedError: 'Usługa AI jest obecnie przeciążona — spróbuj ponownie za chwilę',
  aiEmptyTitle: 'Edytuj z AI',
  aiEmptyBody:
    'Powiedz AI, co zmienić na tym obrazie. Pracuje poleceniami aplikacji, a jedno Cofnij przywraca wszystko, co zmieniła jedna prośba.',
  aiComposerPlaceholder: 'Powiedz AI, co zmienić…',
  aiEmptyPhoto: 'Na przykład: „Usuń tło”, „Rozjaśnij trochę”',
  aiEmptyIllust:
    'Na przykład: „Narysuj zaokrąglony prostokąt na środku”, „Wyeksportuj logo jako PNG”',
  aiUndoAll: 'Cofnij',
  aiUndoTitle: 'Cofnij wszystko, co zmieniła ta prośba',
  aiUndone: 'Cofnięto: dokument wrócił do stanu sprzed tej prośby.',
  aiUndoChangedSince:
    'Dokument zmienił się później, więc nie da się tego cofnąć jednym krokiem. Użyj Cofnij w aplikacji (Ctrl+Z).',
  aiUndoOverflow:
    'Ta prośba wprowadziła więcej zmian, niż przechowuje historia aplikacji, więc nie da się tego cofnąć jednym krokiem.',
  aiUndoFailed:
    'Nie udało się cofnąć wszystkiego. Użyj Cofnij w aplikacji (Ctrl+Z), aby cofnąć dalej.',
  aiBusyNotice: 'Podczas pracy AI nie można edytować dokumentu.',
  aiToolFind: 'Wyszukano polecenia',
  aiToolDescribe: 'Odczytano polecenie',
  aiToolRun: 'Uruchomiono polecenie',
  aiToolRunMany: 'Uruchomiono polecenia',
  aiToolInspect: 'Odczytano dokument',
  aiToolExport: 'Wyeksportowano kopię',
  aiToolGuide: 'Odczytano przewodnik',
} satisfies Record<keyof typeof zh, string>
