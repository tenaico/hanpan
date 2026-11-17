# KI-Zeichnung

KI-Zeichnung ist ein Tab für einfache 3D-Modelle und Zeichnungen. Öffnen Sie eine Zeichnung, die Ihnen jemand geschickt hat, und prüfen Sie ihre Maße, bauen Sie ein kleines Modell selbst oder lassen Sie es von der KI bauen, und fügen Sie ein Maßblatt in ein Hangul- oder Word-Dokument ein. Zeichnungen werden als .ttukcad-Dateien gespeichert, und alle Längen sind in Millimetern angegeben.

## Eine Zeichnung öffnen

- Für eine neue Zeichnung gehen Sie zur Startseite, öffnen **All apps** und drücken **KI-Zeichnung**. Der Tab beginnt als **Unbenannte Zeichnung**.
- Um eine Datei zu öffnen, verwenden Sie **Datei › Öffnen…** (Strg+O) oder ziehen die Datei auf das Fenster. KI-Zeichnung öffnet .ttukcad-, DXF-, STL-, OBJ-, 3MF-, GLB- und PLY-Dateien.
- Eine Datei, die keine .ttukcad-Datei ist, öffnet sich als neue unbenannte Zeichnung mit dem Namen der Datei. Die Originaldatei wird nie verändert: Beim Speichern wird immer nach einer neuen .ttukcad-Datei gefragt.
- DWG-, STEP-, IGES- und BREP-Dateien stammen aus professionellen CAD-Programmen und können nicht gelesen werden. KI-Zeichnung zeigt stattdessen **So öffnen Sie diese Datei**: Bitten Sie den Absender um eine DXF-Datei (für eine 2D-Zeichnung) oder eine STL-Datei (für ein 3D-Modell).
- Eine Datei über 100 MB oder ein Modell mit mehr als 2 Millionen Dreiecken lässt sich nicht öffnen.

## Formen platzieren

- **Start › Formen platzieren** enthält die vier meistgenutzten Formen; **Mehr** öffnet die Übersicht aller 15: Quader, Zylinder, Kugel, Kegel, Pyramide, Keil, Halbkugel, Rohr, Torus, Dreiecksprisma, Sechseckprisma, abgerundeter Quader, Sternprisma, Dach und Text.
- Eine neue Form erscheint in der Mitte der Arbeitsfläche, der Bodenplatte, auf der das Modell steht. Klicken Sie auf eine Form, um sie auszuwählen; mit Umschalt+Klick oder Strg+Klick nehmen Sie weitere Formen dazu.
- **Ansicht › Griffe** legt fest, was die Griffe an der ausgewählten Form tun: **Verschieben**, **Drehen** oder **Größe**. Beim Ziehen rastet die Form in Schritten von 1 mm und 15° ein; halten Sie beim Ziehen Alt gedrückt, um das Einrasten abzuschalten.
- Der Bereich **Eigenschaften** rechts zeigt die ausgewählte Form: Name, Art (Körper oder Loch), Maße, Position (mm), Drehung (°) und Farbe. Geben Sie eine Zahl ein, um sie zu ändern. **Ausblenden** und **Sperren** halten eine Form aus dem Weg.
- **Ansicht › Ansichten** dreht die Kamera nach **Oben**, **Vorne** oder **Seite**, und **Alles zeigen** passt das ganze Modell ins Bild. Ziehen Sie in der Ansicht, um sie zu drehen, und zoomen Sie mit dem Mausrad.
- Die Statuszeile unten zeigt die Größe der Arbeitsfläche, das Fangraster und das Raster sowie Breite × Tiefe × Höhe der ausgewählten Form.

## Löcher, Gruppen und Ausrichten

- Ein Loch ist eine Form, die ausschneidet. Wählen Sie eine Form aus und drücken Sie **Loch** (oder H), um daraus ein Loch zu machen; drücken Sie noch einmal, um sie wieder zum Körper zu machen.
- Ein Loch schneidet nur innerhalb einer Gruppe. Wählen Sie das Loch und die Körper, die es ausschneiden soll, und drücken Sie **Gruppieren** (Strg+G): Die Gruppe sind die Körper abzüglich der Löcher. **Gruppierung aufheben** (Strg+Umschalt+G) löst sie wieder auf.
- **Ausrichten** richtet die ausgewählten Formen an der Form aus, die Sie zuerst ausgewählt haben: links, Mitte oder rechts; vorne, Mitte oder hinten; unten, Mitte oder oben.
- Ein Beispiel: Ein Zylinder mit 80 mm Durchmesser und ein Loch-Zylinder mit 68 mm Durchmesser, 5 mm angehoben, beide ausgewählt und gruppiert, ergeben einen Becher mit 5 mm dickem Boden.

## Freihand zeichnen und Text

- **Freihand zeichnen** zeichnet einen eigenen Umriss. Klicken Sie auf die Arbeitsfläche, um mindestens 3 Punkte zu setzen; **Punkt rückgängig** nimmt den letzten zurück.
- Geben Sie die **Höhe (mm)** ein und drücken Sie **Form schließen**: Der Umriss wird zu einem Körper hochgezogen. **Abbrechen** beendet, ohne etwas zu erstellen.
- Linien, die sich kreuzen, werden abgelehnt. Nehmen Sie Punkte zurück, bis sich nichts mehr kreuzt.
- **Text** fragt nach den Wörtern, die platziert werden sollen, und macht daraus massive Buchstaben in der Schrift, die mit GenOffice geliefert wird.

## Messen und das Maßblatt

- **Messen** zeigt den Abstand zwischen zwei angeklickten Punkten, die Länge einer Linie oder den Durchmesser eines Kreises. Die Punkte rasten an Ecken, Linienenden und Kreismittelpunkten ein. Esc löscht den Messwert.
- **Maßblatt** zeichnet das Modell von vorne, von oben und von der Seite auf ein A4-Blatt, mit Gesamtbreite, -tiefe und -höhe, einem passenden Maßstab (1:1, 1:2, 1:5, 1:10 …) und einem Schriftfeld mit Name, Datum und Maßstab. Eine Zeichnung aus einer DXF-Datei zeigt nur die Ansicht von oben.
- Im Blatt legt **Bild kopieren** es in die Zwischenablage. Fügen Sie es in einen Hangul-, Word- oder PowerPoint-Tab ein.
- **An Hangul senden** öffnet ein neues Hangul-Dokument mit dem Blatt und einer Tabelle der Formen und ihrer Maße. Wenn **Koreanische Dokumentfunktionen** in den Einstellungen ausgeschaltet ist, heißt die Schaltfläche **An Word senden** und erstellt stattdessen ein Word-Dokument.

## Der KI-Assistent

- Der KI-Bereich neben der Zeichnung platziert Formen, ändert Maße und Positionen, macht Löcher, gruppiert, richtet aus, legt die Größe der Arbeitsfläche fest und fasst das Modell zusammen. Einige Anfragen zum Ausprobieren:
  - „Mach einen Stifthalter, 80 mm breit und 100 mm hoch, innen hohl mit 68 mm Durchmesser“
  - „Mach die Arbeitsfläche zu einem Raum von 5 × 4 m und stell vier Schreibtische hinein“
  - „Richte die ausgewählten Formen links aus“
- Alles, was eine Anfrage geändert hat, nimmt ein einziges **Rückgängig** (Strg+Z) zurück, egal wie viele Formen betroffen waren.
- Die KI erhält Ihre Anfrage und eine Zusammenfassung des Modells (Name, Art, Maße und Position jeder Form). Sie kann nicht speichern, öffnen, exportieren oder versenden; das bleibt bei Ihnen.

## Speichern und Wiederherstellen

- **Speichern** (Strg+S) schreibt eine .ttukcad-Datei. KI-Zeichnung speichert nur in diesem Format; **Speichern unter…** (Strg+Umschalt+S) wählt einen neuen Namen oder Ort.
- **Automatisch speichern** oben speichert alle 30 Sekunden und immer dann, wenn das Fenster den Fokus verliert, sobald die Zeichnung eine eigene Datei hat.
- Wenn GenOffice unerwartet schließt, steht die Zeichnung beim nächsten Start unter **Dokumente mit nicht gespeichertem Inhalt**. Drücken Sie **Wiederherstellen**, um sie zurückzuholen.

## Exportieren

- **Datei › Als STL exportieren** und **Als OBJ exportieren** schreiben das Modell für einen 3D-Drucker oder ein anderes Programm. **Als Bild (PNG) exportieren** speichert, was die Ansicht zeigt, auf hellem Hintergrund.
- Ein Export ersetzt nie die Datei, aus der die Zeichnung stammt.

## Tastenkürzel

| Tasten                      | Funktion                              |
| --------------------------- | ------------------------------------- |
| Strg+Z                      | Rückgängig                            |
| Strg+Y oder Strg+Umschalt+Z | Wiederholen                           |
| Strg+S                      | Speichern                             |
| Strg+A                      | Alles auswählen                       |
| Delete                      | Löschen                               |
| Strg+D                      | Duplizieren                           |
| Strg+G                      | Gruppieren                            |
| Strg+Umschalt+G             | Gruppierung aufheben                  |
| H                           | Loch ↔ Körper                         |
| Pfeiltasten                 | 1 mm verschieben (mit Umschalt 10 mm) |
| Alt beim Ziehen             | Einrasten abschalten                  |

**Hilfe › Tastenkürzel** zeigt dieselbe Liste im Tab.

## Was es nicht kann

- DWG-, STEP-, IGES- oder BREP-Dateien direkt öffnen. Bitten Sie stattdessen um DXF oder STL.
- Abhängigkeiten, Konstruktionsverlauf oder Baugruppen wie in professionellen CAD-Programmen. Jede Form wird durch ihre eigenen Zahlen bestimmt.
- Drucken. Senden Sie das Maßblatt an ein Hangul- oder Word-Dokument und drucken Sie von dort.
