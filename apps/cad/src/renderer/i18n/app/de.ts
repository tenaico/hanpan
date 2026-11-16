import type { zh } from './zh'

export const de = {
  untitled: 'Unbenannte Zeichnung',
  saved: 'Gespeichert',
  unsaved: 'Nicht gespeichert',
  noWebGlTitle: 'Die 3D-Ansicht kann nicht angezeigt werden',
  noWebGlBody:
    'Dieser PC konnte WebGL nicht starten, das die 3D-Ansicht benötigt. Die Zeichnung lässt sich trotzdem öffnen und speichern, aber nicht anzeigen. Versuchen Sie eine dieser Lösungen und öffnen Sie den Tab dann erneut:',
  noWebGlDriver: 'Aktualisieren Sie den Grafikkartentreiber.',
  noWebGlAccel: 'Schalten Sie die Hardwarebeschleunigung in den Grafikeinstellungen ein.',
  noticeNotOk:
    'Diese Datei konnte nicht als Zeichnung geöffnet werden. Sie ist möglicherweise beschädigt oder stammt aus einer neueren Version. Eine leere Zeichnung ist geöffnet; beim Speichern wird nach einer neuen Datei gefragt.',
  noticeTooLarge:
    'Diese Datei ist zu groß zum Öffnen (Grenze: 100 MB). Eine leere Zeichnung ist geöffnet.',
  noticeUnreadable: 'Diese Datei konnte nicht gelesen werden. Eine leere Zeichnung ist geöffnet.',
  noticeUnsupported:
    'Dieser Dateityp kann hier nicht geöffnet werden. Geöffnet werden .ttukcad-, .dxf-, .stl- und .obj-Dateien.',
  noticeImportFailed:
    'Die Formen in dieser Datei konnten nicht gelesen werden. Eine leere Zeichnung ist geöffnet.',
  saveRefused:
    'Die Zeichnung konnte nicht gespeichert werden. Ihre Änderungen sind noch da; versuchen Sie es erneut oder wählen Sie „Speichern unter“.',
  saveFailed:
    'Beim Speichern der Zeichnung ist ein Fehler aufgetreten. Ihre Änderungen sind noch da; versuchen Sie es erneut oder wählen Sie „Speichern unter“.',
} satisfies Record<keyof typeof zh, string>
