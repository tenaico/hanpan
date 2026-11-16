import type { zh } from './zh'

export const it = {
  untitled: 'Disegno senza titolo',
  saved: 'Salvato',
  unsaved: 'Non salvato',
  noWebGlTitle: 'Impossibile mostrare la vista 3D',
  noWebGlBody:
    'Questo PC non è riuscito ad avviare WebGL, necessario per la vista 3D. Il disegno si apre e si salva comunque, ma non può essere mostrato. Prova una di queste soluzioni, poi riapri la scheda:',
  noWebGlDriver: 'Aggiorna il driver della scheda grafica.',
  noWebGlAccel: 'Attiva l’accelerazione hardware nelle impostazioni grafiche.',
  noticeNotOk:
    'Impossibile aprire questo file come disegno. Potrebbe essere danneggiato o creato con una versione più recente. È aperto un disegno vuoto; al salvataggio verrà chiesto un nuovo file.',
  noticeTooLarge:
    'Il file è troppo grande per essere aperto (limite: 100 MB). È aperto un disegno vuoto.',
  noticeUnreadable: 'Impossibile leggere questo file. È aperto un disegno vuoto.',
  noticeUnsupported:
    'Questo tipo di file non può essere aperto qui. Si aprono file .ttukcad, .dxf, .stl e .obj.',
  noticeImportFailed: 'Impossibile leggere le forme di questo file. È aperto un disegno vuoto.',
  saveRefused:
    'Impossibile salvare il disegno. Le modifiche sono ancora qui; riprova o usa Salva con nome.',
  saveFailed:
    'Si è verificato un problema durante il salvataggio del disegno. Le modifiche sono ancora qui; riprova o usa Salva con nome.',
} satisfies Record<keyof typeof zh, string>
