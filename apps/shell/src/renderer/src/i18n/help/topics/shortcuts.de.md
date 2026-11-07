# Tastaturkürzel

Jeder Editor hat eigene Tastenbelegungen, und nur wenige davon funktionieren überall. Diese Seite führt sie vollständig auf, nach Anwendung gruppiert, wobei die macOS- und die Windows-/Linux-Tastenkombination nebeneinander stehen.

## Bitte zuerst lesen

### Überall in Hanpan (Tabs und Fenster)

| Aktion                                                                                        | Windows / Linux                  | macOS                            |
| --------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------- |
| Nächster Tab / vorheriger Tab                                                                 | Ctrl+Tab / Ctrl+Shift+Tab        | ⌃Tab / ⌃⇧Tab                     |
| Aktuellen Tab schließen (auf Start: das Fenster, mit Rückfrage, wenn Dokumente geöffnet sind) | Ctrl+W                           | ⌘W                               |
| Einstellungen öffnen — auf Start                                                              | Ctrl+,                           | ⌘,                               |
| Benutzerhandbuch öffnen                                                                       | F1                               | F1                               |
| Tab in der Tab-Leiste wählen — wenn ein Tab den Fokus hat                                     | ← / →, Enter, Delete (schließen) | ← / →, Enter, Delete (schließen) |

### Jeder Editor

**Ab hier gehören die Tasten zu dem Editor, der gerade vorne liegt, und ändern sich, wenn Sie den Tab wechseln.**

| Aktion                                                    | Windows / Linux | macOS |
| --------------------------------------------------------- | --------------- | ----- |
| Benutzerhandbuch öffnen — funktioniert überall in der App | F1              | F1    |
| Menüband einklappen / ausklappen — jeder Editor           | Ctrl+F1         | ⌥⌘R   |
| Menüband kompakt — nur Docs                               | Ctrl+Alt+K      | ⌥⌘K   |
| Tastenkürzel-Tabelle öffnen — nur Word                    | Ctrl+/          | ⌘/    |

- **F1 öffnet dieses Handbuch**, nicht die Kürzel-Tabelle. Die Taste gehört zum Anwendungsmenü und funktioniert daher aus Word, Sheets, Slides, PDF oder dem Tab Home gleichermaßen.
- **Der Umschalter für das Menüband ist `Ctrl+F1`, auf macOS `⌥⌘R`.** Ein bloßer Druck auf `F1` bewirkt nichts — F1 ist das Handbuch, und die Menüband-Taste teilt sich diese Belegung bewusst nicht. `Ctrl+F1` wird auch auf macOS akzeptiert, aber `⌥⌘R` ist die Taste, die Office für Mac verwendet.
- **Die Tastenkürzel-Tabelle gehört allein zu Word** (`⌘/`). Sie listet genau die Word-Tabelle weiter unten auf. Kein anderer Editor hat eine.

![Die Tastenkürzel-Tabelle von Word selbst: die Aktion links, die Tastenkombination rechts, gruppiert nach Datei, Bearbeiten, Textformatierung, Absatzformatierung, Einfügen, Überprüfen und Werkzeuge, Ansicht](img/word-shortcuts.png)

- **`⌘O`, `⌘S` und `⌘P` sind hinter jedem Editor getrennt implementiert**, und sie verhalten sich nicht ganz gleich. Words `⌘P` erzeugt zuerst eine Druckvorschau, damit ein bedrucktes Blatt genau einer Bildschirmseite entspricht; das von PDF öffnet den PDF-Druckdialog; Sheets und Slides haben wiederum eigene.
- **Der Rest gilt pro Anwendung.** Ist der Word-Tab aktiv, ist `⌘B` Words Fett. Ist Slides aktiv, ist `⌘B` Slides’ Fett, und das Menü, zu dem es gehört, ist nicht das gewohnte. Wo eine Belegung nur mit einer Auswahl oder in einem bestimmten Bereich auslöst, steht das in der Spalte Aktion.

## Präsentationsmodus

- **Start**: F5 in Word, PDF, Mindmap, HTML und Markdown. In einer Tabelle Ctrl+F5 (ab A1) oder Shift+F5 (ab der aktuellen Zelle). In HWP-Dokumenten Ctrl+F5 (F5 markiert dort Tabellenzellen).
- **Weitere Einstiege**: In Word öffnen Ctrl+F5 und Shift+F5 die Leseansicht ohne Vollbild, in PDF starten sie ab der aktuellen Seite, in HTML präsentieren sie im Tab.
- **Beenden**: Esc oder F5. F11 ist der Vollbildmodus des Fensters und ändert die Dokumentansicht nicht.

## Konventionen

- Die macOS-Spalte verwendet die gewohnten Symbole: `⌘` Command, `⌥` Option, `⇧` Shift, `⌃` Control.
- Die Spalte Windows / Linux schreibt sie aus: `Ctrl`, `Alt`, `Shift`.
- Wo GenOffice auf den beiden Plattformen tatsächlich andere Tasten braucht, zeigt die Tabelle das. Die häufigsten Fälle sind `⌃H` für Suchen und Ersetzen (auf macOS gehört `⌘H` zu Ausblenden), `⌥⌘G` für Gehe zu und die Schließen-Taste von Slides.
- Eine Tastenkombination, die nur mit einer Auswahl funktioniert, steht in der Spalte Aktion, statt eine eigene Spalte zu bekommen, damit jede Tabelle drei Spalten breit bleibt.

## Word

Word hat eine vollständige Menüleiste, daher funktionieren die Datei- und Formatierungstasten unten, sobald ein Word-Tab den Fokus hat, egal welches Dokument geöffnet ist. Die Bearbeitungstasten brauchen ein geladenes, bearbeitbares Dokument mit dem Cursor im Text; sie lösen nicht aus, während Sie im Suchfeld, in der KI-Eingabe oder in einem anderen Feld tippen.

### Datei

| Aktion           | Windows / Linux | macOS |
| ---------------- | --------------- | ----- |
| Neu              | Ctrl+N          | ⌘N    |
| Neues Fenster    | Ctrl+Shift+N    | ⇧⌘N   |
| Öffnen…          | Ctrl+O          | ⌘O    |
| Speichern        | Ctrl+S          | ⌘S    |
| Speichern unter… | Ctrl+Shift+S    | ⇧⌘S   |
| Drucken          | Ctrl+P          | ⌘P    |
| Schließen (Tab)  | Ctrl+W          | ⌘W    |

`⌘P` ist nicht das Drucken des Browsers. Word erzeugt zuerst eine Druckvorschau, sodass ein bedrucktes Blatt genau einer Bildschirmseite entspricht, und öffnet dann seinen eigenen Druckdialog.

### Bearbeiten

| Aktion                   | Windows / Linux | macOS |
| ------------------------ | --------------- | ----- |
| Rückgängig               | Ctrl+Z          | ⌘Z    |
| Wiederholen              | Ctrl+Shift+Z    | ⇧⌘Z   |
| Ausschneiden             | Ctrl+X          | ⌘X    |
| Kopieren                 | Ctrl+C          | ⌘C    |
| Einfügen                 | Ctrl+V          | ⌘V    |
| Als reinen Text einfügen | Ctrl+Shift+V    | ⌥⇧⌘V  |
| Alles auswählen          | Ctrl+A          | ⌘A    |
| Suchen                   | Ctrl+F          | ⌘F    |
| Ersetzen                 | Ctrl+H          | ⌃H    |
| Gehe zu                  | Ctrl+G          | ⌥⌘G   |
| Tastaturkürzel           | Ctrl+/          | ⌘/    |

Ersetzen ist auf beiden Plattformen Ctrl+H, weil `⌘H` auf macOS das Fenster ausblendet und Word nie erreicht. Gehe zu folgt der eigenen Aufteilung von Word: `⌥⌘G` am Mac, damit `⇧⌘G` für die Wörterzählung frei bleibt.

### Textformatierung

| Aktion                                                       | Windows / Linux       | macOS    |
| ------------------------------------------------------------ | --------------------- | -------- |
| Fett                                                         | Ctrl+B                | ⌘B       |
| Kursiv                                                       | Ctrl+I                | ⌘I       |
| Unterstrichen                                                | Ctrl+U                | ⌘U       |
| Schriftart… (Dialog)                                         | Ctrl+D                | ⌘D       |
| Schriftgröße erhöhen                                         | Ctrl+Shift+.          | ⇧⌘.      |
| Schriftgröße verringern                                      | Ctrl+Shift+,          | ⇧⌘,      |
| Schriftgröße um 1 pt erhöhen                                 | Ctrl+]                | ⌘]       |
| Schriftgröße um 1 pt verringern                              | Ctrl+[                | ⌘[       |
| Hochgestellt                                                 | Ctrl+Shift+= / Ctrl+. | ⇧⌘= / ⌘. |
| Tiefgestellt                                                 | Ctrl+,                | ⌘,       |
| Groß-/Kleinschreibung ändern                                 | Shift+F3              | ⇧F3      |
| Formatierung kopieren (mit ausgewähltem Text)                | Ctrl+Shift+C          | ⇧⌘C      |
| Formatierung einfügen (nach einem Kopieren der Formatierung) | Ctrl+Alt+Shift+V      | ⇧⌘V      |
| gesamte Formatierung entfernen                               | Ctrl+Space            | ⌃␣       |

Die beiden Tasten des Formatierungspinsels sind die einzige Stelle, an der die Windows-Taste keine bloße Umbenennung ist: Formatierung einfügen trägt Alt, weil Ctrl+Shift+V dort bereits einfügt und den Formatvorlagenstil angleicht.

### Absatzformatierung

| Aktion                                                | Windows / Linux | macOS |
| ----------------------------------------------------- | --------------- | ----- |
| Linksbündig                                           | Ctrl+L          | ⌘L    |
| Zentriert                                             | Ctrl+E          | ⌘E    |
| Rechtsbündig                                          | Ctrl+R          | ⌘R    |
| Blocksatz                                             | Ctrl+J          | ⌘J    |
| Zeilenabstand 1,0                                     | Ctrl+1          | ⌘1    |
| Zeilenabstand 1,5                                     | Ctrl+5          | ⌘5    |
| Zeilenabstand 2,0                                     | Ctrl+2          | ⌘2    |
| Einzug vergrößern                                     | Ctrl+M          | ⌃M    |
| Einzug verkleinern                                    | Ctrl+Shift+M    | ⌃⇧M   |
| Hängender Einzug                                      | Ctrl+T          | ⌘T    |
| Hängenden Einzug entfernen                            | Ctrl+Shift+T    | ⇧⌘T   |
| Absatzformatierung entfernen                          | Ctrl+Q          | ⌃Q    |
| Standard (Formatvorlage)                              | Ctrl+Alt+0      | ⌥⌘0   |
| Überschrift 1 (Formatvorlage)                         | Ctrl+Alt+1      | ⌥⌘1   |
| Überschrift 2 (Formatvorlage)                         | Ctrl+Alt+2      | ⌥⌘2   |
| Überschrift 3 (Formatvorlage)                         | Ctrl+Alt+3      | ⌥⌘3   |
| Absatz… (Dialog)                                      | Ctrl+Alt+M      | ⌥⌘M   |
| Absatz nach oben verschieben                          | Alt+Shift+↑     | ⌥⇧↑   |
| Absatz nach unten verschieben                         | Alt+Shift+↓     | ⌥⇧↓   |
| Listeneintrag zurückstufen (am Anfang eines Eintrags) | Tab             | Tab   |
| Listeneintrag hochstufen (am Anfang eines Eintrags)   | Shift+Tab       | ⇧Tab  |

Einzug, hängender Einzug und das Entfernen der Absatzformatierung funktionieren auf beiden Plattformen nur mit Strg: `⌘M` minimiert das Fenster und `⌘Q` beendet die Anwendung, eine Command-Kombination wäre also eine stillschweigende Änderung kurz vor dem Beenden. Tab ändert die Listenebene nur, wenn der Cursor am Anfang eines Eintrags steht oder mehrere Einträge umspannt; im Text fügt es ein Tabulatorzeichen ein, und `⇧Tab` stuft immer hoch.

### Einfügen

| Aktion                  | Windows / Linux  | macOS |
| ----------------------- | ---------------- | ----- |
| Seitenumbruch           | Ctrl+Enter       | ⌘⏎    |
| Spaltenumbruch          | Ctrl+Shift+Enter | ⇧⌘⏎   |
| Zeilenumbruch           | Shift+Enter      | ⇧⏎    |
| Link…                   | Ctrl+K           | ⌘K    |
| Neuer Kommentar         | Ctrl+Alt+A       | ⌥⌘A   |
| Fußnote einfügen        | Ctrl+Alt+F       | ⌥⌘F   |
| Endnote einfügen        | Ctrl+Alt+D       | ⌥⌘E   |
| Datum (Feld)            | Alt+Shift+D      | ⌥⇧D   |
| Uhrzeit (Feld)          | Alt+Shift+T      | ⌥⇧T   |
| Geschütztes Leerzeichen | Ctrl+Shift+Space | ⇧⌘␣   |
| Geschützter Bindestrich | Ctrl+Shift+-     | ⇧⌘-   |

Endnote einfügen ist eine echte Plattformtrennung, keine Umbenennung: Word verwendet am Mac `⌥⌘E`, weil `⌥⌘D` dort zum Dock gehört.

### Überprüfen und Werkzeuge

| Aktion                         | Windows / Linux | macOS |
| ------------------------------ | --------------- | ----- |
| Änderungen verfolgen           | Ctrl+Shift+E    | ⇧⌘E   |
| Wörterzählung                  | Ctrl+Shift+G    | ⇧⌘G   |
| Korrekturlesen                 | F7              | F7    |
| Feld aktualisieren             | F9              | F9    |
| Feldfunktionen ein-/ausblenden | Alt+F9          | ⌥F9   |

F7 startet das KI-Korrekturlesen und F9 aktualisiert die Felder; beide brauchen ein geladenes Dokument. Sobald eine Bearbeitungseinschränkung die Änderungsverfolgung einschaltet, lässt sie sich nicht wieder abschalten.

### Ansicht

| Aktion                               | Windows / Linux | macOS |
| ------------------------------------ | --------------- | ----- |
| Vergrößern                           | Ctrl+=          | ⌘=    |
| Verkleinern                          | Ctrl+-          | ⌘-    |
| Auf 100 % zoomen                     | Ctrl+0          | ⌘0    |
| Formatierungszeichen ein-/ausblenden | Ctrl+Shift+8    | ⌘8    |

Die Tastenkombination für Formatierungszeichen folgt der eigenen Aufteilung von Word, `⌘8` gegen Ctrl+Shift+8. Word bietet Zoom nur über die drei Menütasten oben an — `⌘+` bewirkt hier nichts.

F1 öffnet das **Benutzerhandbuch**, nicht diese Liste. Die Kürzel-Tabelle ist `⌘/` beziehungsweise Ctrl+/, und sie ist ein Menüpunkt von Word, erscheint also nur, solange ein Word-Tab aktiv ist.

## Sheets

GenOffice Sheets öffnet und speichert .xlsx-Arbeitsmappen. Die meisten Kürzel unten sind die in Tabellenprogrammen üblichen, viele kennen Sie also schon.

> **Bearbeiten hat Vorrang.** Fast jedes Kürzel in Sheets wird ignoriert, während Sie eine Zelle bearbeiten oder in der **Formelleiste** tippen, damit Tippen, Cursorbewegen und Rücktaste ihre gewohnte Bedeutung für die Textbearbeitung behalten. Wenn eine Taste scheinbar nichts bewirkt, prüfen Sie, ob Sie mitten in einer Bearbeitung sind: drücken Sie zuerst Esc oder Enter und versuchen Sie es erneut. Befehle, die auf die Auswahl wirken, bewirken ebenfalls nichts, solange ein Dialog offen ist. Wo eine Tastenkombination eine Ausnahme von dieser Regel ist, steht das in der Tabelle.

Zwei Konventionen sind speziell für Sheets. `⌘` und `⌃` belegen dieselbe Modifikatortaste — beide werden auf jeder Plattform akzeptiert, sodass `⌘1` und `Ctrl+1` dieselbe Kombination sind. **Eine leere Zelle in Windows / Linux bedeutet, dass die Kombination nur auf macOS existiert.**

### Navigation

| Aktion                                                             | Windows / Linux | macOS      |
| ------------------------------------------------------------------ | --------------- | ---------- |
| Nächstes Blatt                                                     | Ctrl+PgDn       | ⌘PgDn      |
| Vorheriges Blatt                                                   | Ctrl+PgUp       | ⌘PgUp      |
| Nächstes Blatt (Parität zu Excel für Mac)                          |                 | ⌥→         |
| Vorheriges Blatt (Parität zu Excel für Mac)                        |                 | ⌥←         |
| Zur ersten nicht fixierten Zelle springen                          | Ctrl+Home       | ⌘Home      |
| Zur letzten verwendeten Zelle springen (Inhalt oder Format)        | Ctrl+End        | ⌘End       |
| Dialog „Gehe zu“                                                   | Ctrl+G, F5      | ⌘G, F5     |
| Neues Blatt einfügen                                               | Shift+F11       | ⇧F11       |
| Aktive Zelle einen Bildschirm nach unten verschieben (und rollen)  | Page Down       | Page Down  |
| Aktive Zelle einen Bildschirm nach oben verschieben (und rollen)   | Page Up         | Page Up    |
| Aktive Zelle einen Bildschirm nach rechts verschieben (und rollen) | Alt+Page Down   | ⌥Page Down |
| Aktive Zelle einen Bildschirm nach links verschieben (und rollen)  | Alt+Page Up     | ⌥Page Up   |

### Auswahl

| Aktion                                                                                       | Windows / Linux                                     | macOS           |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| Ganze Spalte der aktiven Zelle auswählen                                                     | Ctrl+Space                                          | ⌃Space          |
| Ganze Zeile der aktiven Zelle auswählen                                                      | Shift+Space                                         | ⇧Space          |
| Zum Rand des Datenblocks springen — eine der vier Pfeiltasten                                | Ctrl+↑ Ctrl+↓ Ctrl+← Ctrl+→                         | ⌘↑ ⌘↓ ⌘← ⌘→     |
| Auswahl bis zum Rand des Datenblocks erweitern; erneut drücken, um sie wieder zu verkleinern | Ctrl+Shift+↑ Ctrl+Shift+↓ Ctrl+Shift+← Ctrl+Shift+→ | ⌘⇧↑ ⌘⇧↓ ⌘⇧← ⌘⇧→ |
| Zur ersten Spalte der aktuellen Zeile springen                                               | Home                                                | Home            |

### Bearbeiten

| Aktion                                                                                                      | Windows / Linux       | macOS                     |
| ----------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------- |
| Die gesamte Auswahl mit dem aktuellen Eintrag füllen                                                        | Ctrl+Enter            | ⌃⏎ oder ⌘⏎                |
| In der Zelle eine neue Zeile beginnen                                                                       | Alt+Enter             | ⌥⏎, oder ⌃⌥⏎ / ⌘⌥⏎ am Mac |
| Aktive Zelle an Ort und Stelle bearbeiten                                                                   | F2                    | F2                        |
| Fett                                                                                                        | Ctrl+B                | ⌘B                        |
| Kursiv                                                                                                      | Ctrl+I                | ⌘I                        |
| Unterstrichen                                                                                               | Ctrl+U                | ⌘U                        |
| Suchen                                                                                                      | Ctrl+F                | ⌘F                        |
| Von der linkesten ausgewählten Spalte nach rechts füllen                                                    | Ctrl+R                | ⌘R                        |
| Formelbezug zwischen relativ und absolut umschalten                                                         | F4                    | F4                        |
| Formelbezug zwischen relativ und absolut umschalten (Parität zu Excel für Mac, beim Bearbeiten einer Zelle) |                       | ⌘T                        |
| Kopieren                                                                                                    | Ctrl+C                | ⌘C                        |
| Ausschneiden                                                                                                | Ctrl+X                | ⌘X                        |
| Einfügen                                                                                                    | Ctrl+V                | ⌘V                        |
| Nur Werte einfügen                                                                                          | Ctrl+Shift+V          | ⌘⇧V                       |
| Blitzausfüllen aus dem Muster darüber                                                                       | Ctrl+E                | ⌘E                        |
| Rückgängig                                                                                                  | Ctrl+Z                | ⌘Z                        |
| Wiederholen                                                                                                 | Ctrl+Shift+Z          | ⇧⌘Z                       |
| Ganzes Blatt auswählen                                                                                      | Ctrl+A                | ⌘A                        |
| heutiges Datum einfügen                                                                                     | Ctrl+;                | ⌘;                        |
| aktuelle Uhrzeit einfügen                                                                                   | Ctrl+Shift+;          | ⌘⇧;                       |
| Inhalt aller ausgewählten Zellen löschen                                                                    | Backspace oder Delete | ⌫ oder ⌦                  |

Automatische Summenbildung gibt es nur auf macOS. Drücken Sie `⌘⇧T`.

### Formatierung

| Aktion                                                                                | Windows / Linux | macOS |
| ------------------------------------------------------------------------------------- | --------------- | ----- |
| Dialog „Zellen formatieren“                                                           | Ctrl+1          | ⌘1    |
| Durchgestrichen (mit ausgewählten Zellen)                                             | Ctrl+5          | ⌘5    |
| Schriftgröße erhöhen (mit ausgewählten Zellen)                                        | Ctrl+Shift+.    | ⌘⇧.   |
| Schriftgröße verringern (mit ausgewählten Zellen)                                     | Ctrl+Shift+,    | ⌘⇧,   |
| Zahlenformat: Standard                                                                | Ctrl+Shift+`    | ⌘⇧`   |
| Zahlenformat: Zahl mit zwei Nachkommastellen                                          | Ctrl+Shift+1    | ⌘⇧1   |
| Zahlenformat: Uhrzeit `h:mm AM/PM`                                                    | Ctrl+Shift+2    | ⌘⇧2   |
| Zahlenformat: Datum `d-mmm-yy`                                                        | Ctrl+Shift+3    | ⌘⇧3   |
| Zahlenformat: Währung                                                                 | Ctrl+Shift+4    | ⌘⇧4   |
| Zahlenformat: Prozent                                                                 | Ctrl+Shift+5    | ⌘⇧5   |
| Zahlenformat: wissenschaftlich                                                        | Ctrl+Shift+6    | ⌘⇧6   |
| Alle Rahmenlinien (mit ausgewählten Zellen)                                           | Ctrl+Shift+7    | ⌘⇧7   |
| Keine Rahmenlinien (mit ausgewählten Zellen)                                          | Ctrl+Shift+-    | ⌘⇧-   |
| Formatierungspinsel abbrechen (nur solange der Formatierungspinsel eingeschaltet ist) | Esc             | Esc   |

### Einfügen und Löschen

| Aktion                                                                                                         | Windows / Linux           | macOS                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------- |
| Zellen einfügen — ganze Zeilen oder Spalten werden direkt eingefügt, alles andere öffnet den Dialog „Einfügen“ | Ctrl+Shift+=              | ⌘⇧=                    |
| Zellen einfügen — `+` auf dem Ziffernblock, derselbe Dialog                                                    | Ctrl mit Ziffernblock `+` | ⌘ mit Ziffernblock `+` |
| Zellen löschen — ganze Zeilen oder Spalten werden direkt gelöscht, alles andere öffnet den Dialog „Löschen“    | Ctrl+-                    | ⌘-                     |
| Zellen löschen — `-` auf dem Ziffernblock, derselbe Dialog                                                     | Ctrl mit Ziffernblock `-` | ⌘ mit Ziffernblock `-` |
| Ausgewählte Zeilen ausblenden                                                                                  | Ctrl+9                    | ⌘9                     |
| Ausgeblendete Zeilen in der Auswahl einblenden                                                                 | Ctrl+Shift+9              | ⌘⇧9                    |
| Ausgewählte Spalten ausblenden                                                                                 | Ctrl+0                    | ⌘0                     |
| Ausgeblendete Spalten in der Auswahl einblenden                                                                | Ctrl+Shift+0              | ⌘⇧0                    |

Excels Kürzel für den Filter, Ctrl+Shift+L, bewirkt unter Windows und Linux nichts. Drücken Sie auf macOS `⌘⇧F` oder nutzen Sie den Filterbefehl im Menüband auf jeder Plattform.

### Daten und Überprüfung

| Aktion                                                     | Windows / Linux | macOS |
| ---------------------------------------------------------- | --------------- | ----- |
| Dialog „Funktion einfügen“                                 | Shift+F3        | ⇧F3   |
| Namens-Manager                                             | Ctrl+F3         | ⌃F3   |
| Notiz an der aktiven Zelle hinzufügen oder bearbeiten      | Shift+F2        | ⇧F2   |
| Hyperlink einfügen                                         | Ctrl+K          | ⌘K    |
| Vorgänger verfolgen (die Zelle muss eine Formel enthalten) | Ctrl+[          | ⌘[    |
| Abhängige verfolgen                                        | Ctrl+]          | ⌘]    |
| Ausgewählte Zeilen gruppieren                              | Alt+Shift+→     | ⌥⇧→   |
| Gruppierung der ausgewählten Zeilen aufheben               | Alt+Shift+←     | ⌥⇧←   |
| Gesamte Arbeitsmappe neu berechnen                         | F9              | F9    |
| Nur das aktive Blatt neu berechnen                         | Shift+F9        | ⇧F9   |
| Filter für den ausgewählten Bereich ein- oder ausschalten  |                 | ⌘⇧F   |

### Fenster

| Aktion                                                           | Windows / Linux | macOS      |
| ---------------------------------------------------------------- | --------------- | ---------- |
| Arbeitsmappe speichern                                           | Ctrl+S          | ⌘S         |
| Speichern unter                                                  | Ctrl+Shift+S    | ⇧⌘S        |
| Arbeitsmappe öffnen                                              | Ctrl+O          | ⌘O         |
| Drucken                                                          | Ctrl+P          | ⌘P         |
| Arbeitsmappe schließen (macOS) / App beenden (Windows und Linux) | Ctrl+Q          | ⌘W         |
| Benutzerhandbuch öffnen                                          | F1              | F1         |
| Vergrößern                                                       | Ctrl+=          | ⌘=         |
| Mit dem Mausrad zoomen                                           | Ctrl + rollen   | ⌘ + rollen |
| Formeln in den Zellen ein- oder ausblenden                       | Ctrl+`          | ⌘`         |
| Formelleiste ausklappen oder einklappen                          | Ctrl+Shift+U    | ⌘⇧U        |

## Slides

GenOffice Slides ist ein Präsentationseditor im Stil von PowerPoint. Die meisten Tasten tun überall dasselbe, aber einige ändern ihre Bedeutung mit dem Fokus — in einem Textfeld, oder wenn das **Miniaturenbereichsfenster**, der **Gliederungsbereich** oder die **Foliensortierung** den Tastaturfokus hat. Solche Fälle sind in der Spalte Aktion gekennzeichnet.

### Datei und App

| Aktion                                      | Windows / Linux | macOS |
| ------------------------------------------- | --------------- | ----- |
| Speichern                                   | Ctrl+S          | ⌘S    |
| Speichern unter                             | Ctrl+Shift+S    | ⇧⌘S   |
| Öffnen                                      | Ctrl+O          | ⌘O    |
| Aktuellen Tab schließen                     | Ctrl+Q          | ⌘W    |
| Drucken                                     | Ctrl+P          | ⌘P    |
| Rückgängig                                  | Ctrl+Z          | ⌘Z    |
| Wiederholen                                 | Ctrl+Shift+Z    | ⇧⌘Z   |
| Wiederholen (alternative Tastenkombination) | Ctrl+Y          | ⌘Y    |

Einen Tab zu schließen ist die eine Stelle, an der sich die beiden Plattformen vollständig trennen: `⌘W` auf macOS und unter Windows und Linux Ctrl+Q, das die ganze App beendet statt nur des Tabs.

### Bearbeiten

| Aktion                                                | Windows / Linux | macOS  |
| ----------------------------------------------------- | --------------- | ------ |
| Neue Folie                                            | Ctrl+M          | ⇧⌘N    |
| Suchen (nicht beim Bearbeiten von Text in einer Form) | Ctrl+F          | ⌘F     |
| Auswahl mit KI kommentieren (mit ausgewählten Formen) | Ctrl+K          | ⌘K     |
| Vergrößern                                            | Ctrl+=          | ⌘=     |
| Verkleinern                                           | Ctrl+-          | ⌘-     |
| Originalgröße (100 %)                                 | Ctrl+0          | ⌘0     |
| Alles auswählen                                       | Ctrl+A          | ⌘A     |
| Formenauswahl vorwärts / rückwärts durchlaufen        | Tab / Shift+Tab | ⇥ / ⇧⇥ |

Neue Folie ist die andere Plattformtrennung. Jede Plattform hat ihre eigene Taste, und die andere tut nichts: `⇧⌘N` auf macOS, Ctrl+M unter Windows und Linux. `⌘M` kann auf macOS nicht die Aufgabe erfüllen, weil das die systemweite Taste zum Minimieren ist.

Alles auswählen richtet sich nach dem Fokus: Ist das Miniaturenbereichsfenster, der Gliederungsbereich oder die Foliensortierung fokussiert, wählt der Befehl alle Folien aus, und überall sonst wählt er jedes Element der aktuellen Folie aus. Tab durchläuft die Formen auf der Folie, und nur wenn die Folienfläche selbst den Fokus hat.

### Textformatierung

Diese Befehle wirken auf den Text einer ausgewählten Form oder auf den Absatz am Cursor, wenn Sie sich im Textfeld befinden.

| Aktion                                                      | Windows / Linux | macOS |
| ----------------------------------------------------------- | --------------- | ----- |
| Fett                                                        | Ctrl+B          | ⌘B    |
| Kursiv                                                      | Ctrl+I          | ⌘I    |
| Unterstrichen                                               | Ctrl+U          | ⌘U    |
| Linksbündig                                                 | Ctrl+L          | ⌘L    |
| Zentriert                                                   | Ctrl+E          | ⌘E    |
| Rechtsbündig                                                | Ctrl+R          | ⌘R    |
| Blocksatz                                                   | Ctrl+J          | ⌘J    |
| Schriftgröße um 1 pt erhöhen                                | Ctrl+]          | ⌘]    |
| Schriftgröße um 1 pt verringern                             | Ctrl+[          | ⌘[    |
| Schrift auf die nächste Stufe der Größenliste vergrößern    | Ctrl+Shift+>    | ⇧⌘>   |
| Schrift auf die vorherige Stufe der Größenliste verkleinern | Ctrl+Shift+<    | ⇧⌘<   |

Die Tasten der Größenliste verstehen auch die Tasten . und , mit gedrückter Umschalt-Taste, für die Tastaturbelegungen, die diese statt der Satzzeichentasten melden.

### Zwischenablage und Objekte

| Aktion                                                     | Windows / Linux    | macOS       |
| ---------------------------------------------------------- | ------------------ | ----------- |
| Kopieren                                                   | Ctrl+C             | ⌘C          |
| Ausschneiden                                               | Ctrl+X             | ⌘X          |
| Einfügen                                                   | Ctrl+V             | ⌘V          |
| Nur Formatierung einfügen                                  | Ctrl+Shift+V       | ⇧⌘V         |
| Nur Formatierung kopieren (mit ausgewählten Formen)        | Ctrl+Shift+C       | ⇧⌘C         |
| An Ort und Stelle duplizieren (mit ausgewählten Formen)    | Ctrl+D             | ⌘D          |
| Auswahl gruppieren (mit ausgewählten Formen)               | Ctrl+G             | ⌘G          |
| Gruppierung der Auswahl aufheben (mit ausgewählten Formen) | Ctrl+Shift+G       | ⇧⌘G         |
| Auswahl löschen (mit ausgewählten Formen)                  | Backspace / Delete | ⌫ / Delete  |
| Ausgewählten Eckpunkt löschen (in „Punkte bearbeiten“)     | Backspace / Delete | ⌫ / Delete  |
| Auswahl fein verschieben (mit ausgewählten Formen)         | Arrow keys         | ↑ ↓ ← →     |
| Um ein Bildschirmpixel verschieben                         | Ctrl+Arrow keys    | ⌘↑ ⌘↓ ⌘← ⌘→ |
| Um den Mittelpunkt skalieren                               | Shift+Arrow keys   | ⇧↑ ⇧↓ ⇧← ⇧→ |

In einem Textfeld wirken Kopieren, Ausschneiden und Einfügen auf den Text statt auf die Form. Umschalt mit den Pfeiltasten skaliert jede Form um ihren eigenen Mittelpunkt, lässt Verbindungslinien unberührt und macht eine Mehrfachauswahl zu einem einzigen Undo-Schritt.

### Folien — Miniaturenbereich, Gliederungsbereich oder Sortierung fokussiert

Befehle auf Folienebene der Art PowerPoint lösen nur aus, solange eines dieser drei Bereiche den Tastaturfokus hat.

| Aktion                                           | Windows / Linux                                | macOS                          |
| ------------------------------------------------ | ---------------------------------------------- | ------------------------------ |
| Vorherige / nächste Folie                        | ArrowUp / ArrowDown (auch Page Up / Page Down) | ↑ ↓ (auch Page Up / Page Down) |
| Erste / letzte Folie                             | Home / End                                     | Home / End                     |
| Auswahl bis zur ersten / letzten Folie erweitern | Shift+Home / Shift+End                         | ⇧Home / ⇧End                   |
| Alle Folien auswählen                            | Ctrl+A                                         | ⌘A                             |
| Ausgewählte Folien löschen                       | Backspace / Delete                             | ⌫ / Delete                     |
| Folien kopieren                                  | Ctrl+C                                         | ⌘C                             |
| Folien ausschneiden                              | Ctrl+X                                         | ⌘X                             |

Der Wechsel zwischen Folien mit den Pfeiltasten ist die Ausnahme — er funktioniert auch von der Folienfläche aus, ohne dass etwas ausgewählt ist. Das Löschen von Folien greift nicht, während ein Stiftwerkzeug aktiv ist, und auch nicht in der **Leseansicht**.

### In einem Textfeld

| Aktion                                                                    | Windows / Linux                                   | macOS                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------- |
| Textbearbeitung in einer ausgewählten Textform starten                    | ein beliebiges druckbares Zeichen, Enter, oder F2 | ein beliebiges druckbares Zeichen, ⏎, oder F2 |
| Text übernehmen und Form erneut auswählen                                 | Esc oder F2                                       | Esc oder F2                                   |
| Text übernehmen und Form erneut auswählen (alternative Tastenkombination) | Ctrl+⏎                                            | ⌘⏎                                            |
| Zum nächsten Platzhalter springen                                         | Ctrl+⏎                                            | ⌃⏎                                            |
| Listenebene zurückstufen / hochstufen                                     | Tab / Shift+Tab                                   | ⇥ / ⇧⇥                                        |
| Nächste / vorherige Tabellenzelle                                         | Tab / Shift+Tab                                   | ⇥ / ⇧⇥                                        |
| Weicher Zeilenumbruch                                                     | Shift+⏎                                           | ⇧⏎                                            |

Tab bedeutet zwei Dinge: die nächste Zelle in einer Tabelle und das Zurückstufen der Listenebene in einer Textform.

### Diashow

| Aktion                                   | Windows / Linux                      | macOS                |
| ---------------------------------------- | ------------------------------------ | -------------------- |
| Von vorne beginnen                       | F5                                   | F5                   |
| Von der aktuellen Folie beginnen         | ⇧F5                                  | ⇧F5 oder ⌘⏎          |
| Nächste Folie                            | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down    |
| Vorherige Folie                          | Left, Up, Page Up                    | ← ↑ Page Up          |
| Erste Folie                              | Home                                 | Home                 |
| Letzte Folie                             | End                                  | End                  |
| Zu Folie N springen                      | N eingeben, dann Enter               | N eingeben, dann ⏎   |
| Schwarzer Bildschirm                     | B oder .                             | B oder .             |
| Weißer Bildschirm                        | W oder ,                             | W oder ,             |
| Nach einer Verdunkelung wiederherstellen | eine beliebige Taste                 | eine beliebige Taste |
| Show beenden                             | Esc                                  | Esc                  |

Von der aktuellen Folie zu beginnen versteht auf macOS sowohl `⌘⏎` als auch `⇧F5`. Unter Windows bleibt dieselbe Taste für das Wechseln zwischen Platzhaltern reserviert.

### Leseansicht

| Aktion                | Windows / Linux                      | macOS             |
| --------------------- | ------------------------------------ | ----------------- |
| Nächste Folie         | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Vorherige Folie       | Left, Up, Page Up                    | ← ↑ Page Up       |
| Leseansicht verlassen | Esc                                  | Esc               |

Drücken Sie **Esc**, um aus dem herauszukommen, worin Sie gerade sind — einem Beschnitt, einer Form, die Sie zeichnen, **Punkte bearbeiten**, einer Gruppe, dem Stift-, Textmarker- oder Radiererwerkzeug, dem Medienplayer oder der **Leseansicht** — und um die Auswahl aufzuheben.

Zwei weitere sind Modifikatoren und keine Tastenkombinationen: Halten Sie **Shift** beim Zeichnen gedrückt, um die Proportionen der neuen Form zu behalten, und halten Sie **Shift** beim Drehen gedrückt, um in Schritten von 15° einzurasten.

## PDF

PDF hat kein eigenes Menü, daher folgen alle Tastenkombinationen unten dem aktiven Tab und funktionieren nur, solange ein PDF-Tab vorne liegt.

### Datei und Bearbeiten

| Aktion                | Windows / Linux | macOS |
| --------------------- | --------------- | ----- |
| Speichern             | Ctrl+S          | ⌘S    |
| Rückgängig            | Ctrl+Z          | ⌘Z    |
| Wiederholen           | Ctrl+Shift+Z    | ⇧⌘Z   |
| Suchen (Suche öffnen) | Ctrl+F          | ⌘F    |
| Drucken               | Ctrl+P          | ⌘P    |

Rückgängig und Wiederholen gehen durch die Dokumenthistorie; steht der Cursor in einem Textfeld, lassen sie `⌘Z` diesem Feld. `⌘P` öffnet denselben Druckdialog in der App wie die Schaltfläche Drucken in der Symbolleiste.

### Ansicht

| Aktion             | Windows / Linux | macOS       |
| ------------------ | --------------- | ----------- |
| Vergrößern         | Ctrl+=          | ⌘=          |
| Verkleinern        | Ctrl+-          | ⌘-          |
| An Breite anpassen | Ctrl+0          | ⌘0          |
| Zoom (stufenlos)   | Ctrl + Mausrad  | ⌘ + Mausrad |

Vergrößern reagiert auch auf `⌘+` und Ctrl++.

### Seitenavigation

| Aktion                             | Windows / Linux     | macOS               |
| ---------------------------------- | ------------------- | ------------------- |
| Nächste Seite                      | →                   | →                   |
| Vorherige Seite                    | ←                   | ←                   |
| Einen Bildschirm nach unten rollen | PageDown oder Space | PageDown oder Space |
| Einen Bildschirm nach oben rollen  | PageUp              | PageUp              |
| Nach unten rollen                  | ↓                   | ↓                   |
| Nach oben rollen                   | ↑                   | ↑                   |
| Zur ersten Seite springen          | Home                | Home                |
| Zur letzten Seite springen         | End                 | End                 |

Diese Tasten brauchen keine Modifikatortaste, daher lesen sich beide Plattformen gleich. ↓ und ↑ sind die eine Zeile, die sich mit dem Fokus ändert: im Dokument verschieben sie die Seite, mit Fokus in der Miniaturenleiste daneben springen sie eine ganze Seite weiter. Sie bewirken nichts, während Sie in ein Feld tippen.

### Auswahl und Bearbeiten

| Aktion                        | Windows / Linux       | macOS                 |
| ----------------------------- | --------------------- | --------------------- |
| Ausgewählte Anmerkung löschen | Delete oder Backspace | Delete oder Backspace |

Nur aktiv, wenn eine Anmerkung, ein Stempel, eine Schwärzung oder ein Bild ausgewählt ist.

### Miniaturleiste

| Aktion                          | Windows / Linux       | macOS                 |
| ------------------------------- | --------------------- | --------------------- |
| Seiten einzeln auswählen        | Ctrl + Klick          | ⌘ + Klick             |
| Eine Folge von Seiten auswählen | Shift + Klick         | ⇧ + Klick             |
| Alle Seiten auswählen           | Ctrl+A                | ⌘A                    |
| Ausgewählte Seiten löschen      | Delete oder Backspace | Delete oder Backspace |

Ausgewählte Seiten sind eingefärbt. Ein Rechtsklick auf eine davon oder die Registerkarte Seite dreht, löscht oder extrahiert sie gemeinsam; wer eine davon zieht, verschiebt alle. Escape oder ein einfacher Klick auf eine Seite hebt die Auswahl auf. ⌘A und Entf wirken, solange die Leiste den Fokus hat.

### Escape und Dialoge

| Aktion                     | Windows / Linux | macOS  |
| -------------------------- | --------------- | ------ |
| Obersten Zustand abbrechen | Escape          | Escape |
| Offenen Dialog bestätigen  | Enter           | Enter  |

Escape windet eine Ebene nach der anderen ab — zuerst ein offener Dialog, dann das KI-Einblendmenü, ein Textentwurf, das Suchfeld und schließlich die Auswahl selbst. Steht der Cursor im Suchfeld, springen Enter und `⇧Enter` zum nächsten beziehungsweise vorherigen Treffer, und Escape schließt das Feld; steht der Cursor in einer neuen Textnotiz, übernimmt `⌘⏎` sie.

## Markdown

GenOffice Markdown bearbeitet Markdown mit einer Live-Vorschau daneben.

### Datei und Ansicht

| Aktion                              | Windows / Linux    | macOS      |
| ----------------------------------- | ------------------ | ---------- |
| Speichern                           | Ctrl+S             | ⌘S         |
| Speichern unter                     | Ctrl+Shift+S       | ⇧⌘S        |
| Drucken                             | Ctrl+P             | ⌘P         |
| Suchen                              | Ctrl+F             | ⌘F         |
| Zwischen Quelle / Vorschau wechseln | Ctrl+E             | ⌘E         |
| Vergrößern                          | Ctrl+= oder Ctrl++ | ⌘= oder ⌘+ |
| Verkleinern                         | Ctrl+-             | ⌘-         |
| Originalgröße (100 %)               | Ctrl+0             | ⌘0         |

Verkleinern versteht auch `⌘_` und Ctrl+_. Auch durch Auf- und Zuziehen auf dem Trackpad oder durch gehaltenes `⌘` beziehungsweise Ctrl und Rollen über dem Dokument wird gezoomt.

### Blöcke

| Aktion                                                   | Windows / Linux      | macOS |
| -------------------------------------------------------- | -------------------- | ----- |
| Ausgewählte Blöcke duplizieren                           | Ctrl+D               | ⌘D    |
| Ausgewählte Blöcke löschen                               | Ctrl+Shift+Backspace | ⇧⌘⌫   |
| Ausgewählten Block nach oben verschieben                 | Ctrl+Shift+ArrowUp   | ⇧⌘↑   |
| Ausgewählten Block nach unten verschieben                | Ctrl+Shift+ArrowDown | ⇧⌘↓   |
| Link auf die Auswahl einfügen                            | Ctrl+K               | ⌘K    |
| Link entfernen (erneut drücken, wenn der Link aktiv ist) | Ctrl+K               | ⌘K    |

### In einem Matheblock

Diese Befehle gelten nur, solange der schwebende LaTeX-Editor geöffnet ist.

| Aktion                         | Windows / Linux | macOS |
| ------------------------------ | --------------- | ----- |
| Formel anwenden                | Ctrl+⏎          | ⌘⏎    |
| Editor ohne Anwenden schließen | Esc             | Esc   |

Eine leere Formel zu löschen ist eine leere Formel anzuwenden, und das löscht den Block. Der Editor schließt sich außerdem bei jeder Änderung am Dokument, und ein Klick außerhalb schließt ihn.

## HTML

GenOffice HTML zeigt einen Code-Editor neben einer Live-Vorschau. Die Tasten, die auf ein Seitenelement wirken, gelten nur, wenn die Vorschau selbst den Tastaturfokus hat.

### Datei und Quellansicht

| Aktion                                                  | Windows / Linux    | macOS      |
| ------------------------------------------------------- | ------------------ | ---------- |
| Speichern                                               | Ctrl+S             | ⌘S         |
| Speichern unter                                         | Ctrl+Shift+S       | ⇧⌘S        |
| Ansicht durchwechseln (Bearbeiten / geteilt / Vorschau) | Ctrl+\             | ⌘\         |
| Suchen                                                  | Ctrl+F             | ⌘F         |
| Vergrößern                                              | Ctrl+= oder Ctrl++ | ⌘= oder ⌘+ |
| Verkleinern                                             | Ctrl+-             | ⌘-         |
| Originalgröße (100 %)                                   | Ctrl+0             | ⌘0         |

Verkleinern versteht auch `⌘_` und Ctrl+_.

### Formatierung und Historie

| Aktion                                      | Windows / Linux | macOS |
| ------------------------------------------- | --------------- | ----- |
| Fett                                        | Ctrl+B          | ⌘B    |
| Kursiv                                      | Ctrl+I          | ⌘I    |
| Rückgängig                                  | Ctrl+Z          | ⌘Z    |
| Wiederholen                                 | Ctrl+Shift+Z    | ⇧⌘Z   |
| Wiederholen (alternative Tastenkombination) | Ctrl+Y          | ⌘Y    |

Im Code-Editor oder in einem Formularfeld übernehmen stattdessen die eigenen Bearbeitungstasten des Feldes die Führung.

### Im Vorschau-Frame, mit einem ausgewählten Element

| Aktion                                     | Windows / Linux    | macOS      |
| ------------------------------------------ | ------------------ | ---------- |
| Die KI nach dem Element fragen             | Ctrl+K             | ⌘K         |
| Element löschen                            | Backspace / Delete | ⌫ / Delete |
| Vorheriges Geschwisterelement              | ArrowUp            | ↑          |
| Nächstes Geschwisterelement                | ArrowDown          | ↓          |
| Elternelement auswählen                    | ArrowLeft          | ←          |
| Erstes Kindelement auswählen               | ArrowRight         | →          |
| Element im Dokument nach oben verschieben  | Alt+ArrowUp        | ⌥↑         |
| Element im Dokument nach unten verschieben | Alt+ArrowDown      | ⌥↓         |
| Auswahl aufheben                           | Esc                | Esc        |

Jede dieser Tasten braucht ein bereits ausgewähltes Element; ohne Auswahl bewirkt die Taste nichts.

### Im Vorschau-Frame, Text direkt bearbeiten

| Aktion                                                 | Windows / Linux | macOS |
| ------------------------------------------------------ | --------------- | ----- |
| Bearbeitung übernehmen                                 | Esc             | Esc   |
| Bearbeitung übernehmen (alternative Tastenkombination) | Ctrl+⏎          | ⌘⏎    |
| Ausgewählten Bereich fett setzen                       | Ctrl+B          | ⌘B    |
| Ausgewählten Bereich kursiv setzen                     | Ctrl+I          | ⌘I    |

Das Übernehmen behält, was Sie getippt haben, und setzt das Element auf den ausgewählten Zustand zurück.

## HWP/HWPX

Diese Tasten gelten, solange der Tab HWP/HWPX im Vordergrund ist und das Dokument den Fokus hat. Die beiden Spalten zeigen, wie sie unter macOS und unter Windows / Linux gedrückt werden.

### Datei

| Aktion           | Windows / Linux      | macOS |
| ---------------- | -------------------- | ----- |
| Neues Dokument   | Alt+N                |       |
| Öffnen…          | Ctrl+O / Alt+O       | ⌘O    |
| Speichern        | Ctrl+S / Alt+S       | ⌘S    |
| Speichern unter… | Ctrl+Shift+S / Alt+V | ⇧⌘S   |
| Drucken          | Ctrl+P / Alt+P       | ⌘P    |

### Bearbeiten

| Aktion                | Windows / Linux              | macOS       |
| --------------------- | ---------------------------- | ----------- |
| Rückgängig            | Ctrl+Z                       | ⌃Z          |
| Wiederholen           | Ctrl+Shift+Z                 | ⌃⇧Z         |
| Zeile löschen         | Ctrl+Y                       | ⌃Y          |
| Ausschneiden          | Ctrl+X                       | ⌃X          |
| Kopieren              | Ctrl+C                       | ⌃C          |
| Einfügen              | Ctrl+V                       | ⌃V          |
| Löschen               | Ctrl+E                       | ⌃E          |
| Alles auswählen       | Ctrl+A                       | ⌃A          |
| Formatierung kopieren | Alt+C                        | ⌥C          |
| Suchen                | Ctrl+F / Ctrl+Q, F           | ⌃F / ⌃Q, F  |
| Suchen und ersetzen   | Ctrl+H / Ctrl+F2 / Ctrl+Q, A | ⌃F2 / ⌃Q, A |
| Weitersuchen          | Ctrl+L                       | ⌃L          |
| Rückwärts suchen      | Ctrl+Q, L                    | ⌃Q, L       |
| Gehe zu               | Alt+G                        | ⌥G          |
| Dokumente vergleichen | Alt+Shift+V                  | ⌥⇧V         |

### Zeichen

| Aktion                    | Windows / Linux      | macOS    |
| ------------------------- | -------------------- | -------- |
| Fett                      | Ctrl+B / Alt+Shift+B | ⌃B / ⌥⇧B |
| Kursiv                    | Ctrl+I / Alt+Shift+I | ⌃I / ⌥⇧I |
| Unterstrichen             | Ctrl+U / Alt+Shift+U | ⌃U / ⌥⇧U |
| Normale Formatierung      | Alt+Shift+C          | ⌥⇧C      |
| Hochgestellt              | Alt+Shift+P          | ⌥⇧P      |
| Tiefgestellt              | Alt+Shift+S          | ⌥⇧S      |
| Zeichenformat…            | Alt+L                | ⌥L       |
| Schriftgröße erhöhen      | Alt+Shift+E / Ctrl+] | ⌥⇧E / ⌃] |
| Schriftgröße verringern   | Alt+Shift+R / Ctrl+[ | ⌥⇧R / ⌃[ |
| Zeichenbreite erhöhen     | Alt+Shift+K          | ⌥⇧K      |
| Zeichenbreite verringern  | Alt+Shift+J          | ⌥⇧J      |
| Zeichenabstand erhöhen    | Alt+Shift+W          | ⌥⇧W      |
| Zeichenabstand verringern | Alt+Shift+N          | ⌥⇧N      |
| Schwarzer Text            | Ctrl+M, K            | ⌃M, K    |
| Roter Text                | Ctrl+M, R            | ⌃M, R    |
| Blauer Text               | Ctrl+M, B            | ⌃M, B    |
| Pflaumenfarbener Text     | Ctrl+M, D            | ⌃M, D    |
| Grüner Text               | Ctrl+M, G            | ⌃M, G    |
| Gelber Text               | Ctrl+M, Y            | ⌃M, Y    |
| Türkiser Text             | Ctrl+M, C            | ⌃M, C    |
| Weißer Text               | Ctrl+M, W            | ⌃M, W    |

### Absatz

| Aktion                                  | Windows / Linux | macOS   |
| --------------------------------------- | --------------- | ------- |
| Linksbündig                             | Ctrl+Shift+L    | ⌃⇧L     |
| Zentriert                               | Ctrl+Shift+C    | ⌃⇧C     |
| Rechtsbündig                            | Ctrl+Shift+R    | ⌃⇧R     |
| Blocksatz                               | Ctrl+Shift+M    | ⌃⇧M     |
| Verteilt                                | Ctrl+Shift+T    | ⌃⇧T     |
| Zeilenabstand erhöhen                   | Alt+Shift+Z     | ⌥⇧Z     |
| Zeilenabstand verringern                | Alt+Shift+A     | ⌥⇧A     |
| Absatzformat…                           | Alt+T           | ⌥T      |
| Formatvorlage…                          | F6              | F6      |
| Erste bis zehnte Formatvorlage anwenden | Ctrl+1 … Ctrl+0 | ⌃1 … ⌃0 |
| Absatznummernformat                     | Ctrl+K, N       | ⌃K, N   |

### Einfügen

| Aktion                                     | Windows / Linux    | macOS       |
| ------------------------------------------ | ------------------ | ----------- |
| Tabelle einfügen                           | Ctrl+N, T          | ⌃N, T       |
| Fußnote                                    | Ctrl+N, N          | ⌃N, N       |
| Endnote                                    | Ctrl+N, E          | ⌃N, E       |
| Kopfzeile                                  | Ctrl+N, H          | ⌃N, H       |
| Seitenzahl                                 | Ctrl+N, P          | ⌃N, P       |
| Bild einfügen                              | Ctrl+N, I          | ⌃N, I       |
| Textfeld                                   | Ctrl+N, B          | ⌃N, B       |
| Formel                                     | Ctrl+N, M          | ⌃N, M       |
| Beschriftung einfügen                      | Ctrl+N, C          | ⌃N, C       |
| Hyperlink                                  | Ctrl+K, H          | ⌃K, H       |
| Lesezeichen                                | Ctrl+K, B          | ⌃K, B       |
| Feld einfügen                              | Ctrl+K, E          | ⌃K, E       |
| Datum/Uhrzeit als Text                     | Ctrl+K, D          | ⌃K, D       |
| Objekt, Feld oder Tabelle/Zelle bearbeiten | Ctrl+N, K          | ⌃N, K       |
| Sonderzeichen                              | Ctrl+F10 / Alt+F10 | ⌃F10 / ⌥F10 |

### Tabelle

| Aktion                  | Windows / Linux        | macOS        |
| ----------------------- | ---------------------- | ------------ |
| Zeile/Spalte hinzufügen | Alt+Enter / Alt+Insert | ⌥⏎ / ⌥Insert |
| Zeile/Spalte löschen    | Alt+Delete             | ⌥⌫           |
| Zelle teilen            | F5 → S                 | F5 → S       |
| Zellen verbinden        | F5 → M                 | F5 → M       |
| Blocksumme              | F5 → Ctrl+Shift+S      | F5 → ⇧⌘S     |
| Blockmittelwert         | F5 → Ctrl+Shift+A      | F5 → ⌃⇧A     |
| Blockprodukt            | F5 → Ctrl+Shift+P      | F5 → ⌃⇧P     |
| Tabelle teilen          | Ctrl+N, A              | ⌃N, A        |
| Tabelle verbinden       | Ctrl+N, Z              | ⌃N, Z        |
| Berechnungsformel       | Ctrl+N, F              | ⌃N, F        |

### Tabellenberechnung

Sie gelten nur, wenn der Cursor in einer leeren Tabellenzelle steht. Getrennte Tasten rechnen mit den Zellen links bzw. den Zellen darüber.

| Aktion           | Windows / Linux | macOS |
| ---------------- | --------------- | ----- |
| Summe links      | Ctrl+Shift+H    | ⇧⌘H   |
| Summe oben       | Ctrl+Shift+V    | ⌃⇧V   |
| Mittelwert links | Ctrl+Shift+J    | ⌃⇧J   |
| Mittelwert oben  | Ctrl+Shift+B    | ⌃⇧B   |
| Produkt links    | Ctrl+Shift+K    | ⌃⇧K   |
| Produkt oben     | Ctrl+Shift+N    | ⌃⇧N   |

### Seite

| Aktion                     | Windows / Linux  | macOS |
| -------------------------- | ---------------- | ----- |
| Seite einrichten           | F7               | F7    |
| Seitenumbruch              | Ctrl+Enter       | ⌃⏎    |
| Spaltenumbruch             | Ctrl+Shift+Enter | ⌃⇧⏎   |
| Spalteneinstellungsumbruch | Ctrl+Alt+Enter   | ⌃⌥⏎   |
| Bereichseinstellungen      | Ctrl+N, G        | ⌃N, G |
| Seite ausblenden           | Ctrl+N, S        | ⌃N, S |

### Ansicht

| Aktion                                    | Windows / Linux | macOS |
| ----------------------------------------- | --------------- | ----- |
| Vergrößern                                | Ctrl+=          | ⌃=    |
| Verkleinern                               | Ctrl+-          | ⌃-    |
| An Seite anpassen                         | Ctrl+G, P       | ⌃G, P |
| An Breite anpassen                        | Ctrl+G, W       | ⌃G, W |
| Auf 100 % zoomen                          | Ctrl+G, Q       | ⌃G, Q |
| Werkzeugkasten ein- oder ausklappen       | Ctrl+F1         | ⌃F1   |
| Absatzmarken ein- oder ausblenden         | Ctrl+G, T       | ⌃G, T |
| Steuerzeichen ein- oder ausblenden        | Ctrl+G, C       | ⌃G, C |
| Zum Tab „Start“ (außerhalb einer Tabelle) | Ctrl+Shift+H    | ⇧⌘H   |

Eine Taste wie `Ctrl+N,T` bedeutet: Ctrl+N drücken, loslassen und dann T drücken. `F5 → S` heißt: mit F5 einen Zellblock auswählen und dann S drücken. `Ctrl+1 … Ctrl+0` stehen für die erste bis zehnte Formatvorlage des Dokuments; `Ctrl+Alt+1 … Ctrl+Alt+0` wenden dieselben Formatvorlagen an. Ist ein Zellblock ausgewählt, ist `Ctrl+Shift+S` (unter macOS `⇧⌘S`) die Blocksumme; sonst speichert diese Taste unter einem neuen Namen.
