# Keyboard shortcuts

Every editor has its own key bindings, and only a few of them work everywhere. This page is the full list, grouped by application, with the macOS and the Windows / Linux chord side by side.

## Read this first

### Anywhere in Hanpan (tabs and windows)

| Action                                                                          | Windows / Linux              | macOS                        |
| ------------------------------------------------------------------------------- | ---------------------------- | ---------------------------- |
| Next tab / previous tab                                                         | Ctrl+Tab / Ctrl+Shift+Tab    | ⌃Tab / ⌃⇧Tab                 |
| Close the current tab (on Home: the window, asking first if documents are open) | Ctrl+W                       | ⌘W                           |
| Open Settings — on Home                                                         | Ctrl+,                       | ⌘,                           |
| Open the user guide                                                             | F1                           | F1                           |
| Pick a tab in the tab strip — when a tab has focus                              | ← / →, Enter, Delete (close) | ← / →, Enter, Delete (close) |

### Every editor

**From here on the keys belong to the editor in front of you, and change when you switch tabs.**

| Action                                          | Windows / Linux | macOS |
| ----------------------------------------------- | --------------- | ----- |
| Open the User Guide — works anywhere in the app | F1              | F1    |
| Collapse / expand the ribbon — every editor     | Ctrl+F1         | ⌥⌘R   |
| Compact the ribbon — Docs only                  | Ctrl+Alt+K      | ⌥⌘K   |
| Open the Keyboard Shortcuts sheet — Word only   | Ctrl+/          | ⌘/    |

- **F1 opens this manual**, not the shortcut sheet. It belongs to the application menu, so it works from Word, Sheets, Slides, PDF or the Home tab alike.
- **The ribbon toggle is `Ctrl+F1`, or `⌥⌘R` on macOS.** Pressing bare `F1` does nothing — F1 is the manual, and the ribbon key deliberately does not share it. `Ctrl+F1` is accepted on macOS as well, though `⌥⌘R` is the key Office for Mac uses.
- **The Keyboard Shortcuts sheet is Word's alone** (`⌘/`). It lists exactly the Word table below. No other editor has one.

![Word's own Keyboard Shortcuts sheet: the action on the left, the chord on the right, grouped by File, Edit, Text, Paragraph, Insert, Review and View](img/word-shortcuts.png)

- **`⌘O`, `⌘S` and `⌘P` are implemented separately behind each editor**, and they do not quite behave alike. Word's `⌘P` first lays out a print preview so one printed sheet equals one on-screen page; PDF's opens the PDF print dialog; Sheets and Slides have their own again.
- **The rest is per-application.** When the Word tab is active, `⌘B` is Word's Bold. When Slides is active, `⌘B` is Slides' Bold, and the menu it belongs to is not the one you are used to. Where a binding only fires with something selected, or in a particular pane, the Action column says so.

## Presentation mode

- **Start**: F5 in Word, PDF, Mindmap, HTML and Markdown. In a spreadsheet use Ctrl+F5 (from A1) or Shift+F5 (from the current cell). In an HWP document use Ctrl+F5 (F5 selects table cells there).
- **Other entry points**: in Word, Ctrl+F5 and Shift+F5 open the reading view without fullscreen; in PDF they start from the current page; in HTML they present inside the tab.
- **End**: Esc or F5. F11 is the window's own fullscreen and does not change the document view.

## Conventions

- The macOS column uses the familiar symbols: `⌘` Command, `⌥` Option, `⇧` Shift, `⌃` Control.
- The Windows / Linux column spells them out: `Ctrl`, `Alt`, `Shift`.
- Where GenOffice genuinely needs different keys on the two platforms, the table shows it. The common cases are `⌃H` for Find & Replace (macOS owns `⌘H` for Hide), `⌥⌘G` for Go To, and Slides' close key.
- A chord that only works with a selection is written in the Action column rather than given its own column, so a table stays three columns wide.

## Word

Word has a full menu bar, so the file and formatting chords below work whenever a Word tab has focus, whichever document is open. The editing chords need a loaded, editable document with the caret in the text; they do not fire while you are typing in the Find box, the AI prompt or any other field.

### File

| Action      | Windows / Linux | macOS |
| ----------- | --------------- | ----- |
| New         | Ctrl+N          | ⌘N    |
| New Window  | Ctrl+Shift+N    | ⇧⌘N   |
| Open…       | Ctrl+O          | ⌘O    |
| Save        | Ctrl+S          | ⌘S    |
| Save As…    | Ctrl+Shift+S    | ⇧⌘S   |
| Print       | Ctrl+P          | ⌘P    |
| Close (tab) | Ctrl+W          | ⌘W    |

⌘P is not the browser's print. Word lays out a print preview first, so one printed sheet is exactly one on-screen page, then opens its own print dialog.

### Edit

| Action              | Windows / Linux | macOS |
| ------------------- | --------------- | ----- |
| Undo                | Ctrl+Z          | ⌘Z    |
| Redo                | Ctrl+Shift+Z    | ⇧⌘Z   |
| Cut                 | Ctrl+X          | ⌘X    |
| Copy                | Ctrl+C          | ⌘C    |
| Paste               | Ctrl+V          | ⌘V    |
| Paste as Plain Text | Ctrl+Shift+V    | ⌥⇧⌘V  |
| Select All          | Ctrl+A          | ⌘A    |
| Find                | Ctrl+F          | ⌘F    |
| Replace             | Ctrl+H          | ⌃H    |
| Go To               | Ctrl+G          | ⌥⌘G   |
| Keyboard Shortcuts  | Ctrl+/          | ⌘/    |

Replace is Ctrl+H on both platforms because ⌘H hides the window on macOS and never reaches Word. Go To follows Word's own split: ⌥⌘G on the Mac so ⇧⌘G stays free for Word Count.

### Text Formatting

| Action                                     | Windows / Linux       | macOS    |
| ------------------------------------------ | --------------------- | -------- |
| Bold                                       | Ctrl+B                | ⌘B       |
| Italic                                     | Ctrl+I                | ⌘I       |
| Underline                                  | Ctrl+U                | ⌘U       |
| Font… (dialog)                             | Ctrl+D                | ⌘D       |
| Increase Font Size                         | Ctrl+Shift+.          | ⇧⌘.      |
| Decrease Font Size                         | Ctrl+Shift+,          | ⇧⌘,      |
| Increase Font Size 1 pt                    | Ctrl+]                | ⌘]       |
| Decrease Font Size 1 pt                    | Ctrl+[                | ⌘[       |
| Superscript                                | Ctrl+Shift+= / Ctrl+. | ⇧⌘= / ⌘. |
| Subscript                                  | Ctrl+,                | ⌘,       |
| Change Case                                | Shift+F3              | ⇧F3      |
| Copy Formatting (with text selected)       | Ctrl+Shift+C          | ⇧⌘C      |
| Paste Formatting (after a Copy Formatting) | Ctrl+Alt+Shift+V      | ⇧⌘V      |
| Clear All Formatting                       | Ctrl+Space            | ⌃␣       |

The two formatting-painter chords are the one place the Windows key is not a plain rename: Paste Formatting carries Alt because Ctrl+Shift+V already pastes and matches style there.

### Paragraph Formatting

| Action                                      | Windows / Linux | macOS |
| ------------------------------------------- | --------------- | ----- |
| Align Left                                  | Ctrl+L          | ⌘L    |
| Center                                      | Ctrl+E          | ⌘E    |
| Align Right                                 | Ctrl+R          | ⌘R    |
| Justify                                     | Ctrl+J          | ⌘J    |
| Line Spacing 1.0                            | Ctrl+1          | ⌘1    |
| Line Spacing 1.5                            | Ctrl+5          | ⌘5    |
| Line Spacing 2.0                            | Ctrl+2          | ⌘2    |
| Increase Indent                             | Ctrl+M          | ⌃M    |
| Decrease Indent                             | Ctrl+Shift+M    | ⌃⇧M   |
| Hanging Indent                              | Ctrl+T          | ⌘T    |
| Remove Hanging Indent                       | Ctrl+Shift+T    | ⇧⌘T   |
| Clear Paragraph Formatting                  | Ctrl+Q          | ⌃Q    |
| Normal (style)                              | Ctrl+Alt+0      | ⌥⌘0   |
| Heading 1 (style)                           | Ctrl+Alt+1      | ⌥⌘1   |
| Heading 2 (style)                           | Ctrl+Alt+2      | ⌥⌘2   |
| Heading 3 (style)                           | Ctrl+Alt+3      | ⌥⌘3   |
| Paragraph… (dialog)                         | Ctrl+Alt+M      | ⌥⌘M   |
| Move Paragraph Up                           | Alt+Shift+↑     | ⌥⇧↑   |
| Move Paragraph Down                         | Alt+Shift+↓     | ⌥⇧↓   |
| Demote List Item (at the start of an item)  | Tab             | Tab   |
| Promote List Item (at the start of an item) | Shift+Tab       | ⇧Tab  |

Indent, hanging indent and Clear Paragraph Formatting are Ctrl-only on both platforms: ⌘M minimizes the window and ⌘Q quits, so a Command chord would be a silent edit on the way out. Tab only changes a list level when the caret is at the start of an item or spans several items; inside the text it inserts a tab character, and ⇧Tab always promotes.

### Insert

| Action              | Windows / Linux  | macOS |
| ------------------- | ---------------- | ----- |
| Page Break          | Ctrl+Enter       | ⌘⏎    |
| Column Break        | Ctrl+Shift+Enter | ⇧⌘⏎   |
| Line Break          | Shift+Enter      | ⇧⏎    |
| Link…               | Ctrl+K           | ⌘K    |
| New Comment         | Ctrl+Alt+A       | ⌥⌘A   |
| Insert Footnote     | Ctrl+Alt+F       | ⌥⌘F   |
| Insert Endnote      | Ctrl+Alt+D       | ⌥⌘E   |
| Date (field)        | Alt+Shift+D      | ⌥⇧D   |
| Time (field)        | Alt+Shift+T      | ⌥⇧T   |
| Non-breaking Space  | Ctrl+Shift+Space | ⇧⌘␣   |
| Non-breaking Hyphen | Ctrl+Shift+-     | ⇧⌘-   |

Insert Endnote is a real platform split, not a rename: Word uses ⌥⌘E on the Mac because ⌥⌘D belongs to the Dock there.

### Review & Tools

| Action             | Windows / Linux | macOS |
| ------------------ | --------------- | ----- |
| Track Changes      | Ctrl+Shift+E    | ⇧⌘E   |
| Word Count         | Ctrl+Shift+G    | ⇧⌘G   |
| Proofread          | F7              | F7    |
| Update Field       | F9              | F9    |
| Toggle Field Codes | Alt+F9          | ⌥F9   |

F7 runs the AI proofread and F9 updates fields; both need a loaded document. Once an editing restriction turns Track Changes on, it cannot be switched back off.

### View

| Action                     | Windows / Linux | macOS |
| -------------------------- | --------------- | ----- |
| Zoom In                    | Ctrl+=          | ⌘=    |
| Zoom Out                   | Ctrl+-          | ⌘-    |
| Zoom to 100%               | Ctrl+0          | ⌘0    |
| Show/hide formatting marks | Ctrl+Shift+8    | ⌘8    |

The formatting-marks chord follows Word's own split, ⌘8 against Ctrl+Shift+8. Word takes zoom only through the three menu chords above — ⌘+ does nothing here.

F1 opens the **User Guide**, not this list. The shortcut sheet is ⌘/ or Ctrl+/, and it is a Word menu item, so it only appears while a Word tab is active.

## Sheets

GenOffice Sheets opens and saves .xlsx workbooks. Most of the shortcuts below are the ones spreadsheet programs commonly use, so many will already be familiar.

> **Editing wins.** Almost every shortcut in Sheets is ignored while you are editing a cell or typing in the **formula bar**, so that typing, moving the caret and Backspace keep their normal text-editing meaning. If a key seems to do nothing, check whether you are mid-edit: press Esc or Enter first, then try again. Commands that act on the selection also do nothing while a dialog is open. Where a chord is an exception to this rule, the table says so.

Two conventions are specific to Sheets. `⌘` and `⌃` are the same modifier slot — both are accepted on every platform, so `⌘1` and `Ctrl+1` are the same chord. **An empty Windows / Linux cell means the chord exists on macOS only.**

### Navigation

| Action                                             | Windows / Linux | macOS      |
| -------------------------------------------------- | --------------- | ---------- |
| Next worksheet                                     | Ctrl+PgDn       | ⌘PgDn      |
| Previous worksheet                                 | Ctrl+PgUp       | ⌘PgUp      |
| Next worksheet (Excel for Mac parity)              |                 | ⌥→         |
| Previous worksheet (Excel for Mac parity)          |                 | ⌥←         |
| Jump to the first unfrozen cell                    | Ctrl+Home       | ⌘Home      |
| Jump to the last used cell (content or formatting) | Ctrl+End        | ⌘End       |
| Go To dialog                                       | Ctrl+G, F5      | ⌘G, F5     |
| Insert a new worksheet                             | Shift+F11       | ⇧F11       |
| Move the active cell one screen down (and scroll)  | Page Down       | Page Down  |
| Move the active cell one screen up (and scroll)    | Page Up         | Page Up    |
| Move the active cell one screen right (and scroll) | Alt+Page Down   | ⌥Page Down |
| Move the active cell one screen left (and scroll)  | Alt+Page Up     | ⌥Page Up   |

### Selection

| Action                                                                            | Windows / Linux                                     | macOS           |
| --------------------------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| Select the whole column of the active cell                                        | Ctrl+Space                                          | ⌃Space          |
| Select the whole row of the active cell                                           | Shift+Space                                         | ⇧Space          |
| Jump to the edge of the data block — any of the four arrows                       | Ctrl+↑ Ctrl+↓ Ctrl+← Ctrl+→                         | ⌘↑ ⌘↓ ⌘← ⌘→     |
| Extend the selection to the edge of the data block; press again to shrink it back | Ctrl+Shift+↑ Ctrl+Shift+↓ Ctrl+Shift+← Ctrl+Shift+→ | ⌘⇧↑ ⌘⇧↓ ⌘⇧← ⌘⇧→ |
| Jump to the first column of the current row                                       | Home                                                | Home            |

### Editing

| Action                                                                                               | Windows / Linux     | macOS                       |
| ---------------------------------------------------------------------------------------------------- | ------------------- | --------------------------- |
| Fill the whole selection with the current entry                                                      | Ctrl+Enter          | ⌃⏎ or ⌘⏎                    |
| Start a new line inside the cell                                                                     | Alt+Enter           | ⌥⏎, or ⌃⌥⏎ / ⌘⌥⏎ on the Mac |
| Edit the active cell in place                                                                        | F2                  | F2                          |
| Bold                                                                                                 | Ctrl+B              | ⌘B                          |
| Italic                                                                                               | Ctrl+I              | ⌘I                          |
| Underline                                                                                            | Ctrl+U              | ⌘U                          |
| Find                                                                                                 | Ctrl+F              | ⌘F                          |
| Fill right from the leftmost selected column                                                         | Ctrl+R              | ⌘R                          |
| Cycle a formula reference between relative and absolute                                              | F4                  | F4                          |
| Cycle a formula reference between relative and absolute (Excel for Mac parity, while editing a cell) |                     | ⌘T                          |
| Copy                                                                                                 | Ctrl+C              | ⌘C                          |
| Cut                                                                                                  | Ctrl+X              | ⌘X                          |
| Paste                                                                                                | Ctrl+V              | ⌘V                          |
| Paste values only                                                                                    | Ctrl+Shift+V        | ⌘⇧V                         |
| Flash Fill from the pattern above                                                                    | Ctrl+E              | ⌘E                          |
| Undo                                                                                                 | Ctrl+Z              | ⌘Z                          |
| Redo                                                                                                 | Ctrl+Shift+Z        | ⇧⌘Z                         |
| Select the whole sheet                                                                               | Ctrl+A              | ⌘A                          |
| Insert today's date                                                                                  | Ctrl+;              | ⌘;                          |
| Insert the current time                                                                              | Ctrl+Shift+;        | ⌘⇧;                         |
| Clear the contents of every selected cell                                                            | Backspace or Delete | ⌫ or ⌦                      |

AutoSum is macOS only. Press ⌘⇧T.

### Formatting

| Action                                                           | Windows / Linux | macOS |
| ---------------------------------------------------------------- | --------------- | ----- |
| Format Cells dialog                                              | Ctrl+1          | ⌘1    |
| Strikethrough (with cells selected)                              | Ctrl+5          | ⌘5    |
| Increase font size (with cells selected)                         | Ctrl+Shift+.    | ⌘⇧.   |
| Decrease font size (with cells selected)                         | Ctrl+Shift+,    | ⌘⇧,   |
| Number format: General                                           | Ctrl+Shift+`    | ⌘⇧`   |
| Number format: number with two decimals                          | Ctrl+Shift+1    | ⌘⇧1   |
| Number format: time `h:mm AM/PM`                                 | Ctrl+Shift+2    | ⌘⇧2   |
| Number format: date `d-mmm-yy`                                   | Ctrl+Shift+3    | ⌘⇧3   |
| Number format: currency                                          | Ctrl+Shift+4    | ⌘⇧4   |
| Number format: percent                                           | Ctrl+Shift+5    | ⌘⇧5   |
| Number format: scientific                                        | Ctrl+Shift+6    | ⌘⇧6   |
| All borders (with cells selected)                                | Ctrl+Shift+7    | ⌘⇧7   |
| No borders (with cells selected)                                 | Ctrl+Shift+-    | ⌘⇧-   |
| Cancel Format Painter (only while Format Painter is switched on) | Esc             | Esc   |

### Insert & delete

| Action                                                                                      | Windows / Linux          | macOS                 |
| ------------------------------------------------------------------------------------------- | ------------------------ | --------------------- |
| Insert cells — whole rows or columns insert directly, anything else opens the Insert dialog | Ctrl+Shift+=             | ⌘⇧=                   |
| Insert cells — numeric keypad `+`, same dialog                                              | Ctrl plus the keypad `+` | ⌘ plus the keypad `+` |
| Delete cells — whole rows or columns delete directly, anything else opens the Delete dialog | Ctrl+-                   | ⌘-                    |
| Delete cells — numeric keypad `-`, same dialog                                              | Ctrl plus the keypad `-` | ⌘ plus the keypad `-` |
| Hide the selected rows                                                                      | Ctrl+9                   | ⌘9                    |
| Unhide the hidden rows in the selection                                                     | Ctrl+Shift+9             | ⌘⇧9                   |
| Hide the selected columns                                                                   | Ctrl+0                   | ⌘0                    |
| Unhide the hidden columns in the selection                                                  | Ctrl+Shift+0             | ⌘⇧0                   |

### Data & review

| Action                                         | Windows / Linux | macOS |
| ---------------------------------------------- | --------------- | ----- |
| Insert Function dialog                         | Shift+F3        | ⇧F3   |
| Name Manager                                   | Ctrl+F3         | ⌃F3   |
| Add or edit a note on the active cell          | Shift+F2        | ⇧F2   |
| Insert hyperlink                               | Ctrl+K          | ⌘K    |
| Trace precedents (cell must contain a formula) | Ctrl+[          | ⌘[    |
| Trace dependents                               | Ctrl+]          | ⌘]    |
| Group the selected rows                        | Alt+Shift+→     | ⌥⇧→   |
| Ungroup the selected rows                      | Alt+Shift+←     | ⌥⇧←   |
| Recalculate the whole workbook                 | F9              | F9    |
| Recalculate the active sheet only              | Shift+F9        | ⇧F9   |
| Toggle the filter on the selected range        |                 | ⌘⇧F   |

Excel's filter shortcut, Ctrl+Shift+L, does nothing on Windows or Linux. Press ⌘⇧F on macOS, or use the filter command on the ribbon on any platform.

### Window

| Action                                                      | Windows / Linux | macOS      |
| ----------------------------------------------------------- | --------------- | ---------- |
| Save the workbook                                           | Ctrl+S          | ⌘S         |
| Save As                                                     | Ctrl+Shift+S    | ⇧⌘S        |
| Open a workbook                                             | Ctrl+O          | ⌘O         |
| Print                                                       | Ctrl+P          | ⌘P         |
| Close the workbook (macOS) / Quit the app (Windows & Linux) | Ctrl+Q          | ⌘W         |
| Open the User Guide                                         | F1              | F1         |
| Zoom in                                                     | Ctrl+=          | ⌘=         |
| Zoom with the mouse wheel                                   | Ctrl + scroll   | ⌘ + scroll |
| Show or hide formulas in the cells                          | Ctrl+`          | ⌘`         |
| Expand or collapse the formula bar                          | Ctrl+Shift+U    | ⌘⇧U        |

## Slides

GenOffice Slides is a PowerPoint-style presentation editor. Most keys do the same thing wherever you are, but a few change meaning with focus — inside a text box, or while the **thumbnail pane**, **outline pane** or **slide sorter** has keyboard focus. Those cases are marked in the Action column.

### File and app

| Action                 | Windows / Linux | macOS |
| ---------------------- | --------------- | ----- |
| Save                   | Ctrl+S          | ⌘S    |
| Save as                | Ctrl+Shift+S    | ⇧⌘S   |
| Open                   | Ctrl+O          | ⌘O    |
| Close current tab      | Ctrl+Q          | ⌘W    |
| Print                  | Ctrl+P          | ⌘P    |
| Undo                   | Ctrl+Z          | ⌘Z    |
| Redo                   | Ctrl+Shift+Z    | ⇧⌘Z   |
| Redo (alternate chord) | Ctrl+Y          | ⌘Y    |

Closing a tab is the one place the two platforms split completely: ⌘W on macOS, and on Windows and Linux Ctrl+Q, which quits the whole app rather than the tab.

### Editing

| Action                                                | Windows / Linux | macOS  |
| ----------------------------------------------------- | --------------- | ------ |
| New slide                                             | Ctrl+M          | ⇧⌘N    |
| Find (not while editing text in a shape)              | Ctrl+F          | ⌘F     |
| Annotate the selection with AI (with shapes selected) | Ctrl+K          | ⌘K     |
| Zoom in                                               | Ctrl+=          | ⌘=     |
| Zoom out                                              | Ctrl+-          | ⌘-     |
| Actual size (100%)                                    | Ctrl+0          | ⌘0     |
| Select all                                            | Ctrl+A          | ⌘A     |
| Cycle shape selection forward / back                  | Tab / Shift+Tab | ⇥ / ⇧⇥ |

New slide is the other platform split. Each platform has its own key and the other one does nothing: ⇧⌘N on macOS, Ctrl+M on Windows and Linux. ⌘M cannot do the job on macOS because that is the system Minimize key.

Select all follows focus: with the thumbnail pane, outline pane or slide sorter focused it selects every slide, and anywhere else it selects every element on the current slide. Tab cycles through the shapes on the slide, and only when the slide canvas itself is focused.

### Text formatting

These act on the text of a selected shape, or on the caret's paragraph when you are inside the text box.

| Action                                     | Windows / Linux | macOS |
| ------------------------------------------ | --------------- | ----- |
| Bold                                       | Ctrl+B          | ⌘B    |
| Italic                                     | Ctrl+I          | ⌘I    |
| Underline                                  | Ctrl+U          | ⌘U    |
| Align left                                 | Ctrl+L          | ⌘L    |
| Align centre                               | Ctrl+E          | ⌘E    |
| Align right                                | Ctrl+R          | ⌘R    |
| Justify                                    | Ctrl+J          | ⌘J    |
| Increase font size by 1 pt                 | Ctrl+]          | ⌘]    |
| Decrease font size by 1 pt                 | Ctrl+[          | ⌘[    |
| Grow font to next size on the ladder       | Ctrl+Shift+>    | ⇧⌘>   |
| Shrink font to previous size on the ladder | Ctrl+Shift+<    | ⇧⌘<   |

The font-ladder keys also take the . and , keys with Shift held, for the keyboard layouts that report those instead of the punctuation keys.

### Clipboard and objects

| Action                                      | Windows / Linux    | macOS       |
| ------------------------------------------- | ------------------ | ----------- |
| Copy                                        | Ctrl+C             | ⌘C          |
| Cut                                         | Ctrl+X             | ⌘X          |
| Paste                                       | Ctrl+V             | ⌘V          |
| Paste format only                           | Ctrl+Shift+V       | ⇧⌘V         |
| Copy format only (with shapes selected)     | Ctrl+Shift+C       | ⇧⌘C         |
| Duplicate in place (with shapes selected)   | Ctrl+D             | ⌘D          |
| Group selection (with shapes selected)      | Ctrl+G             | ⌘G          |
| Ungroup selection (with shapes selected)    | Ctrl+Shift+G       | ⇧⌘G         |
| Delete selection (with shapes selected)     | Backspace / Delete | ⌫ / Delete  |
| Delete the selected vertex (in Edit Points) | Backspace / Delete | ⌫ / Delete  |
| Nudge selection (with shapes selected)      | Arrow keys         | ↑ ↓ ← →     |
| Nudge one screen pixel                      | Ctrl+Arrow keys    | ⌘↑ ⌘↓ ⌘← ⌘→ |
| Resize about the centre                     | Shift+Arrow keys   | ⇧↑ ⇧↓ ⇧← ⇧→ |

Inside a text box, copy, cut and paste act on the text rather than on the shape. Shift with the arrow keys resizes each shape about its own centre, leaves connectors alone, and commits a multi-selection as one undo step.

### Slides — thumbnail pane, outline pane or sorter focused

Slide-level commands of the PowerPoint kind only fire while one of those three panes has keyboard focus.

| Action                                 | Windows / Linux                                | macOS                          |
| -------------------------------------- | ---------------------------------------------- | ------------------------------ |
| Previous / next slide                  | ArrowUp / ArrowDown (also Page Up / Page Down) | ↑ ↓ (also Page Up / Page Down) |
| First / last slide                     | Home / End                                     | Home / End                     |
| Extend selection to first / last slide | Shift+Home / Shift+End                         | ⇧Home / ⇧End                   |
| Select all slides                      | Ctrl+A                                         | ⌘A                             |
| Delete selected slides                 | Backspace / Delete                             | ⌫ / Delete                     |
| Copy slides                            | Ctrl+C                                         | ⌘C                             |
| Cut slides                             | Ctrl+X                                         | ⌘X                             |

Moving between slides with the arrow keys is the exception — it works from the canvas too, with nothing selected. Deleting slides does not apply while a pen tool is active or in **Reading view**.

### Inside a text box

| Action                                                   | Windows / Linux                       | macOS                             |
| -------------------------------------------------------- | ------------------------------------- | --------------------------------- |
| Enter text editing on a selected text shape              | any printable character, Enter, or F2 | any printable character, ⏎, or F2 |
| Commit the text and reselect the shape                   | Esc or F2                             | Esc or F2                         |
| Commit the text and reselect the shape (alternate chord) | Ctrl+⏎                                | ⌘⏎                                |
| Jump to the next placeholder                             | Ctrl+⏎                                | ⌃⏎                                |
| Demote / promote list level                              | Tab / Shift+Tab                       | ⇥ / ⇧⇥                            |
| Next / previous table cell                               | Tab / Shift+Tab                       | ⇥ / ⇧⇥                            |
| Soft line break                                          | Shift+⏎                               | ⇧⏎                                |

Tab means two different things: the next cell inside a table, and demote the list level inside a text shape.

### Slide show

| Action                       | Windows / Linux                      | macOS             |
| ---------------------------- | ------------------------------------ | ----------------- |
| Start from the beginning     | F5                                   | F5                |
| Start from the current slide | ⇧F5                                  | ⇧F5 or ⌘⏎         |
| Next slide                   | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Previous slide               | Left, Up, Page Up                    | ← ↑ Page Up       |
| First slide                  | Home                                 | Home              |
| Last slide                   | End                                  | End               |
| Go to slide N                | type N, then Enter                   | type N, then ⏎    |
| Black screen                 | B or .                               | B or .            |
| White screen                 | W or ,                               | W or ,            |
| Restore after a blackout     | any key                              | any key           |
| End the show                 | Esc                                  | Esc               |

Starting from the current slide takes ⌘⏎ as well as ⇧F5 on macOS. On Windows the same key stays reserved for moving between placeholders.

### Reading view

| Action            | Windows / Linux                      | macOS             |
| ----------------- | ------------------------------------ | ----------------- |
| Next slide        | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Previous slide    | Left, Up, Page Up                    | ← ↑ Page Up       |
| Exit reading view | Esc                                  | Esc               |

Press **Esc** to back out of whatever you are in — a crop, a shape you are drawing, **Edit Points**, a group, the pen, highlighter or eraser tool, the media player or **Reading view** — and to clear the selection.

Two more are modifiers rather than chords: hold **Shift** while drawing to keep the new shape's proportions, and hold **Shift** while rotating to snap to 15° steps.

## PDF

PDF has no menu of its own, so every chord below follows the active tab and works only while a PDF tab is in front.

### File and Editing

| Action             | Windows / Linux | macOS |
| ------------------ | --------------- | ----- |
| Save               | Ctrl+S          | ⌘S    |
| Undo               | Ctrl+Z          | ⌘Z    |
| Redo               | Ctrl+Shift+Z    | ⇧⌘Z   |
| Find (open search) | Ctrl+F          | ⌘F    |
| Print              | Ctrl+P          | ⌘P    |

Undo and Redo step the document history; when the cursor sits in a text field they leave ⌘Z to that field. ⌘P opens the same in-app print dialog as the toolbar's Print button.

### View

| Action            | Windows / Linux     | macOS            |
| ----------------- | ------------------- | ---------------- |
| Zoom In           | Ctrl+=              | ⌘=               |
| Zoom Out          | Ctrl+-              | ⌘-               |
| Fit to width      | Ctrl+0              | ⌘0               |
| Zoom (continuous) | Ctrl + scroll wheel | ⌘ + scroll wheel |

Zoom In also answers to ⌘+ and Ctrl++.

### Page Navigation

| Action                 | Windows / Linux   | macOS             |
| ---------------------- | ----------------- | ----------------- |
| Next page              | →                 | →                 |
| Previous page          | ←                 | ←                 |
| Scroll down one screen | PageDown or Space | PageDown or Space |
| Scroll up one screen   | PageUp            | PageUp            |
| Scroll down            | ↓                 | ↓                 |
| Scroll up              | ↑                 | ↑                 |
| Jump to first page     | Home              | Home              |
| Jump to last page      | End               | End               |

These take no modifier, so both platforms read the same. ↓ and ↑ are the one row that changes with focus: in the document they nudge the page, but with focus in the thumbnail sidebar they step a whole page. They do nothing while you are typing in a field.

### Selection and Editing

| Action                     | Windows / Linux     | macOS               |
| -------------------------- | ------------------- | ------------------- |
| Delete selected annotation | Delete or Backspace | Delete or Backspace |

Only active when an annotation, stamp, redaction or image is selected.

### Thumbnail sidebar

| Action                   | Windows / Linux     | macOS               |
| ------------------------ | ------------------- | ------------------- |
| Pick pages one at a time | Ctrl + click        | ⌘ + click           |
| Pick a run of pages      | Shift + click       | ⇧ + click           |
| Pick all pages           | Ctrl+A              | ⌘A                  |
| Delete the picked pages  | Delete or Backspace | Delete or Backspace |

Picked pages are tinted. Right-click one of them, or use the Page tab, to rotate, delete or extract them together; drag one of them to move them all. Escape or a plain click on a page clears the pick. ⌘A and Delete apply while the sidebar has focus.

### Escape and Dialogs

| Action                   | Windows / Linux | macOS  |
| ------------------------ | --------------- | ------ |
| Cancel the topmost state | Escape          | Escape |
| Confirm the open dialog  | Enter           | Enter  |

Escape unwinds one layer at a time — an open dialog first, then the AI popover, a text draft, the search panel and finally the selection itself. With the cursor in the search box, Enter and ⇧Enter step to the next and previous match, and Escape closes the panel; with the cursor in a new text note, ⌘⏎ commits it.

## Markdown

GenOffice Markdown edits Markdown with a live preview alongside.

### File and view

| Action                  | Windows / Linux  | macOS    |
| ----------------------- | ---------------- | -------- |
| Save                    | Ctrl+S           | ⌘S       |
| Save as                 | Ctrl+Shift+S     | ⇧⌘S      |
| Print                   | Ctrl+P           | ⌘P       |
| Find                    | Ctrl+F           | ⌘F       |
| Toggle source / preview | Ctrl+E           | ⌘E       |
| Zoom in                 | Ctrl+= or Ctrl++ | ⌘= or ⌘+ |
| Zoom out                | Ctrl+-           | ⌘-       |
| Actual size (100%)      | Ctrl+0           | ⌘0       |

Zoom out also takes ⌘_ and Ctrl+_. Pinching the trackpad, or holding ⌘ or Ctrl and scrolling over the document, zooms too.

### Blocks

| Action                                             | Windows / Linux      | macOS |
| -------------------------------------------------- | -------------------- | ----- |
| Duplicate the selected blocks                      | Ctrl+D               | ⌘D    |
| Delete the selected blocks                         | Ctrl+Shift+Backspace | ⇧⌘⌫   |
| Move the selected block up                         | Ctrl+Shift+ArrowUp   | ⇧⌘↑   |
| Move the selected block down                       | Ctrl+Shift+ArrowDown | ⇧⌘↓   |
| Insert a link on the selection                     | Ctrl+K               | ⌘K    |
| Remove the link (press again with the link active) | Ctrl+K               | ⌘K    |

### Inside a math block

These apply only while the floating LaTeX editor is open.

| Action                              | Windows / Linux | macOS |
| ----------------------------------- | --------------- | ----- |
| Apply the formula                   | Ctrl+⏎          | ⌘⏎    |
| Dismiss the editor without applying | Esc             | Esc   |

Applying an empty formula deletes the block instead. The editor also closes on any change to the document, and clicking outside dismisses it.

## HTML

GenOffice HTML shows a code editor beside a live preview. The keys that act on a page element apply only when the preview itself has keyboard focus.

### File and source view

| Action                              | Windows / Linux  | macOS    |
| ----------------------------------- | ---------------- | -------- |
| Save                                | Ctrl+S           | ⌘S       |
| Save as                             | Ctrl+Shift+S     | ⇧⌘S      |
| Cycle view (edit / split / preview) | Ctrl+\           | ⌘\       |
| Find                                | Ctrl+F           | ⌘F       |
| Zoom in                             | Ctrl+= or Ctrl++ | ⌘= or ⌘+ |
| Zoom out                            | Ctrl+-           | ⌘-       |
| Actual size (100%)                  | Ctrl+0           | ⌘0       |

Zoom out also takes ⌘_ and Ctrl+_.

### Formatting and history

| Action                 | Windows / Linux | macOS |
| ---------------------- | --------------- | ----- |
| Bold                   | Ctrl+B          | ⌘B    |
| Italic                 | Ctrl+I          | ⌘I    |
| Undo                   | Ctrl+Z          | ⌘Z    |
| Redo                   | Ctrl+Shift+Z    | ⇧⌘Z   |
| Redo (alternate chord) | Ctrl+Y          | ⌘Y    |

Inside the code editor or a form field, the field's own editing keys take over instead.

### In the preview frame, with an element selected

| Action                            | Windows / Linux    | macOS      |
| --------------------------------- | ------------------ | ---------- |
| Ask AI about the element          | Ctrl+K             | ⌘K         |
| Delete the element                | Backspace / Delete | ⌫ / Delete |
| Previous sibling                  | ArrowUp            | ↑          |
| Next sibling                      | ArrowDown          | ↓          |
| Select parent                     | ArrowLeft          | ←          |
| Select first child                | ArrowRight         | →          |
| Move element up in the document   | Alt+ArrowUp        | ⌥↑         |
| Move element down in the document | Alt+ArrowDown      | ⌥↓         |
| Deselect                          | Esc                | Esc        |

Each of these needs an element to be selected already; with nothing selected the key does nothing.

### Inside the preview frame, editing text in place

| Action                            | Windows / Linux | macOS |
| --------------------------------- | --------------- | ----- |
| Commit the edit                   | Esc             | Esc   |
| Commit the edit (alternate chord) | Ctrl+⏎          | ⌘⏎    |
| Bold the selected range           | Ctrl+B          | ⌘B    |
| Italic the selected range         | Ctrl+I          | ⌘I    |

Committing keeps what you typed and returns the element to the selected state.

## HWP/HWPX

These keys work while the HWP/HWPX tab is in front and the document has focus. The two columns show how to press each one on macOS and on Windows / Linux.

### File

| Action       | Windows / Linux      | macOS |
| ------------ | -------------------- | ----- |
| New document | Alt+N                |       |
| Open…        | Ctrl+O / Alt+O       | ⌘O    |
| Save         | Ctrl+S / Alt+S       | ⌘S    |
| Save as…     | Ctrl+Shift+S / Alt+V | ⇧⌘S   |
| Print        | Ctrl+P / Alt+P       | ⌘P    |

### Edit

| Action            | Windows / Linux              | macOS       |
| ----------------- | ---------------------------- | ----------- |
| Undo              | Ctrl+Z                       | ⌃Z          |
| Redo              | Ctrl+Shift+Z                 | ⌃⇧Z         |
| Delete the line   | Ctrl+Y                       | ⌃Y          |
| Cut               | Ctrl+X                       | ⌃X          |
| Copy              | Ctrl+C                       | ⌃C          |
| Paste             | Ctrl+V                       | ⌃V          |
| Delete            | Ctrl+E                       | ⌃E          |
| Select all        | Ctrl+A                       | ⌃A          |
| Copy formatting   | Alt+C                        | ⌥C          |
| Find              | Ctrl+F / Ctrl+Q, F           | ⌃F / ⌃Q, F  |
| Find and replace  | Ctrl+H / Ctrl+F2 / Ctrl+Q, A | ⌃F2 / ⌃Q, A |
| Find again        | Ctrl+L                       | ⌃L          |
| Find backward     | Ctrl+Q, L                    | ⌃Q, L       |
| Go to             | Alt+G                        | ⌥G          |
| Compare documents | Alt+Shift+V                  | ⌥⇧V         |

### Character

| Action                     | Windows / Linux      | macOS    |
| -------------------------- | -------------------- | -------- |
| Bold                       | Ctrl+B / Alt+Shift+B | ⌃B / ⌥⇧B |
| Italic                     | Ctrl+I / Alt+Shift+I | ⌃I / ⌥⇧I |
| Underline                  | Ctrl+U / Alt+Shift+U | ⌃U / ⌥⇧U |
| Normal shape               | Alt+Shift+C          | ⌥⇧C      |
| Superscript                | Alt+Shift+P          | ⌥⇧P      |
| Subscript                  | Alt+Shift+S          | ⌥⇧S      |
| Character shape…           | Alt+L                | ⌥L       |
| Increase font size         | Alt+Shift+E / Ctrl+] | ⌥⇧E / ⌃] |
| Decrease font size         | Alt+Shift+R / Ctrl+[ | ⌥⇧R / ⌃[ |
| Increase character width   | Alt+Shift+K          | ⌥⇧K      |
| Decrease character width   | Alt+Shift+J          | ⌥⇧J      |
| Increase character spacing | Alt+Shift+W          | ⌥⇧W      |
| Decrease character spacing | Alt+Shift+N          | ⌥⇧N      |
| Black text                 | Ctrl+M, K            | ⌃M, K    |
| Red text                   | Ctrl+M, R            | ⌃M, R    |
| Blue text                  | Ctrl+M, B            | ⌃M, B    |
| Plum text                  | Ctrl+M, D            | ⌃M, D    |
| Green text                 | Ctrl+M, G            | ⌃M, G    |
| Yellow text                | Ctrl+M, Y            | ⌃M, Y    |
| Teal text                  | Ctrl+M, C            | ⌃M, C    |
| White text                 | Ctrl+M, W            | ⌃M, W    |

### Paragraph

| Action                          | Windows / Linux | macOS   |
| ------------------------------- | --------------- | ------- |
| Align left                      | Ctrl+Shift+L    | ⌃⇧L     |
| Align centre                    | Ctrl+Shift+C    | ⌃⇧C     |
| Align right                     | Ctrl+Shift+R    | ⌃⇧R     |
| Justify                         | Ctrl+Shift+M    | ⌃⇧M     |
| Distribute                      | Ctrl+Shift+T    | ⌃⇧T     |
| Increase line spacing           | Alt+Shift+Z     | ⌥⇧Z     |
| Decrease line spacing           | Alt+Shift+A     | ⌥⇧A     |
| Paragraph shape…                | Alt+T           | ⌥T      |
| Style…                          | F6              | F6      |
| Apply the first to tenth styles | Ctrl+1 … Ctrl+0 | ⌃1 … ⌃0 |
| Paragraph number shape          | Ctrl+K, N       | ⌃K, N   |

### Insert

| Action                           | Windows / Linux    | macOS       |
| -------------------------------- | ------------------ | ----------- |
| Insert table                     | Ctrl+N, T          | ⌃N, T       |
| Footnote                         | Ctrl+N, N          | ⌃N, N       |
| Endnote                          | Ctrl+N, E          | ⌃N, E       |
| Header                           | Ctrl+N, H          | ⌃N, H       |
| Page number                      | Ctrl+N, P          | ⌃N, P       |
| Insert picture                   | Ctrl+N, I          | ⌃N, I       |
| Text box                         | Ctrl+N, B          | ⌃N, B       |
| Equation                         | Ctrl+N, M          | ⌃N, M       |
| Insert caption                   | Ctrl+N, C          | ⌃N, C       |
| Hyperlink                        | Ctrl+K, H          | ⌃K, H       |
| Bookmark                         | Ctrl+K, B          | ⌃K, B       |
| Insert field                     | Ctrl+K, E          | ⌃K, E       |
| Date/time string                 | Ctrl+K, D          | ⌃K, D       |
| Edit object, field or table/cell | Ctrl+N, K          | ⌃N, K       |
| Symbols                          | Ctrl+F10 / Alt+F10 | ⌃F10 / ⌥F10 |

### Table

| Action              | Windows / Linux        | macOS        |
| ------------------- | ---------------------- | ------------ |
| Add row/column      | Alt+Enter / Alt+Insert | ⌥⏎ / ⌥Insert |
| Delete row/column   | Alt+Delete             | ⌥⌫           |
| Split cell          | F5 → S                 | F5 → S       |
| Merge cells         | F5 → M                 | F5 → M       |
| Block sum           | F5 → Ctrl+Shift+S      | F5 → ⇧⌘S     |
| Block average       | F5 → Ctrl+Shift+A      | F5 → ⌃⇧A     |
| Block product       | F5 → Ctrl+Shift+P      | F5 → ⌃⇧P     |
| Split table         | Ctrl+N, A              | ⌃N, A        |
| Attach table        | Ctrl+N, Z              | ⌃N, Z        |
| Calculation formula | Ctrl+N, F              | ⌃N, F        |

### Table calculations

These work only while the caret is in an empty table cell. Separate keys calculate from the cells to the left and from the cells above.

| Action        | Windows / Linux | macOS |
| ------------- | --------------- | ----- |
| Sum left      | Ctrl+Shift+H    | ⇧⌘H   |
| Sum above     | Ctrl+Shift+V    | ⌃⇧V   |
| Average left  | Ctrl+Shift+J    | ⌃⇧J   |
| Average above | Ctrl+Shift+B    | ⌃⇧B   |
| Product left  | Ctrl+Shift+K    | ⌃⇧K   |
| Product above | Ctrl+Shift+N    | ⌃⇧N   |

### Page

| Action                | Windows / Linux  | macOS |
| --------------------- | ---------------- | ----- |
| Page setup            | F7               | F7    |
| Page break            | Ctrl+Enter       | ⌃⏎    |
| Column break          | Ctrl+Shift+Enter | ⌃⇧⏎   |
| Column settings break | Ctrl+Alt+Enter   | ⌃⌥⏎   |
| Section settings      | Ctrl+N, G        | ⌃N, G |
| Hide page             | Ctrl+N, S        | ⌃N, S |

### View

| Action                               | Windows / Linux | macOS |
| ------------------------------------ | --------------- | ----- |
| Zoom in                              | Ctrl+=          | ⌃=    |
| Zoom out                             | Ctrl+-          | ⌃-    |
| Fit to page                          | Ctrl+G, P       | ⌃G, P |
| Fit to width                         | Ctrl+G, W       | ⌃G, W |
| Zoom to 100%                         | Ctrl+G, Q       | ⌃G, Q |
| Collapse or expand the tool box      | Ctrl+F1         | ⌃F1   |
| Show or hide paragraph marks         | Ctrl+G, T       | ⌃G, T |
| Show or hide control marks           | Ctrl+G, C       | ⌃G, C |
| Go to the Home tab (outside a table) | Ctrl+Shift+H    | ⇧⌘H   |

A key written `Ctrl+N,T` means press Ctrl+N, release it, then press T. `F5 → S` means select a cell block with F5 and then press S. `Ctrl+1 … Ctrl+0` stand for the document’s first through tenth styles; `Ctrl+Alt+1 … Ctrl+Alt+0` apply the same styles. While a block of cells is selected, `Ctrl+Shift+S` (on macOS `⇧⌘S`) is the block sum; elsewhere that key saves under a new name.
