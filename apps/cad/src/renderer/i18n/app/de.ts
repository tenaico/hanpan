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
    'Dieser Dateityp kann hier nicht geöffnet werden. Geöffnet werden .ttukcad-, .dxf-, .stl-, .obj-, .3mf-, .glb- und .ply-Dateien.',
  noticeImportFailed:
    'Die Formen in dieser Datei konnten nicht gelesen werden. Eine leere Zeichnung ist geöffnet.',
  saveRefused:
    'Die Zeichnung konnte nicht gespeichert werden. Ihre Änderungen sind noch da; versuchen Sie es erneut oder wählen Sie „Speichern unter“.',
  saveFailed:
    'Beim Speichern der Zeichnung ist ein Fehler aufgetreten. Ihre Änderungen sind noch da; versuchen Sie es erneut oder wählen Sie „Speichern unter“.',
  guideTitle: 'So öffnen Sie diese Datei',
  guideBody:
    '{ext}-Dateien werden von professionellen CAD-Programmen erstellt und können von KI-Zeichnung nicht gelesen werden.',
  guideAsk:
    'Bitten Sie die Person, die sie geschickt hat, sie erneut als DXF (für eine 2D-Zeichnung) oder STL (für ein 3D-Modell) zu speichern und diese Datei zu senden. Beide lassen sich hier öffnen.',
  exportEmpty:
    'Es gibt nichts zu exportieren. Blenden Sie mindestens eine Form ein und versuchen Sie es erneut.',
  exportFailed:
    'Die Datei konnte nicht exportiert werden. Versuchen Sie es erneut oder wählen Sie einen anderen Ordner.',
  exportSourcePath:
    'Ein Export kann die Ursprungsdatei dieser Zeichnung nicht ersetzen. Wählen Sie einen anderen Namen.',
  issueOpenMesh: 'Diese Gruppe kann nicht berechnet werden: Sie enthält ein offenes Netz',
  issueTooLarge: 'Zu viele Dreiecke zum Anzeigen (Grenze: 2 Millionen)',
  editLocked: 'Dieses Teil ist gesperrt. Entsperren Sie es, um es zu ändern.',
  editNotScalable:
    'Dieses Teil kann nicht mit dem Griff skaliert werden. Importierte Netze, Zeichnungen, Gruppen und Text lassen sich nur verschieben und drehen.',
  editRefused: 'Diese Änderung war nicht möglich. Die Zeichnung ist unverändert.',
} satisfies Record<keyof typeof zh, string>
