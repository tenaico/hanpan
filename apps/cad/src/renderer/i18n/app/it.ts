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
    'Questo tipo di file non può essere aperto qui. Si aprono file .ttukcad, .dxf, .stl, .obj, .3mf, .glb e .ply.',
  noticeImportFailed: 'Impossibile leggere le forme di questo file. È aperto un disegno vuoto.',
  saveRefused:
    'Impossibile salvare il disegno. Le modifiche sono ancora qui; riprova o usa Salva con nome.',
  saveFailed:
    'Si è verificato un problema durante il salvataggio del disegno. Le modifiche sono ancora qui; riprova o usa Salva con nome.',
  guideTitle: 'Come aprire questo file',
  guideBody:
    'I file {ext} sono creati da programmi CAD professionali e Disegno IA non può leggerli.',
  guideAsk:
    'Chiedi a chi lo ha inviato di salvarlo di nuovo come DXF (per un disegno 2D) o STL (per un modello 3D) e di inviarti quel file. Entrambi si aprono qui.',
  exportEmpty: 'Non c’è nulla da esportare. Mostra almeno una forma e riprova.',
  exportFailed: 'Impossibile esportare il file. Riprova o scegli un’altra cartella.',
  exportSourcePath:
    'Un’esportazione non può sostituire il file di origine di questo disegno. Scegli un altro nome.',
  issueOpenMesh: 'Impossibile calcolare questo gruppo: contiene una mesh aperta',
  issueTooLarge: 'Troppi triangoli da mostrare (limite 2 milioni)',
  editLocked: 'Questa parte è bloccata. Sbloccala per modificarla.',
  editNotScalable:
    'Questa parte non può essere ridimensionata con la maniglia. Mesh importate, disegni, gruppi e testo possono solo essere spostati e ruotati.',
  editRefused: 'Impossibile apportare questa modifica. Il disegno non è cambiato.',
} satisfies Record<keyof typeof zh, string>
