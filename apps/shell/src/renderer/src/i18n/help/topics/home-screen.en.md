# The Home screen: where your files live

Home is GenOffice's start page: a navigation sidebar on the left and a board of cards on the right. Type a topic in the **Start** card to open a mind map, and reopen recent documents from the **Continue** card; its **All N** button takes you to the full **Recent** list. On Korean screens another card shows Trend Radar's forecast for today, and clicking a field opens Trend Radar in your browser.

## Sidebar navigation

- **Home**: the board of cards. The app starts here.
- **Recent**: files you opened recently. Each row is stamped with when — today, yesterday, or the date.
- **Starred**: files you starred. Hover a file row and click the star to add or remove it. The ⋯ menu's **Move to group** sorts starred files into named groups; the Starred view filters by them.
- **User Guide**: opens this manual.
- **Ask AI**: the knowledge-base panel — ask questions and get answers cited from your starred files (see below).
- **Folders**: directories you add to the sidebar with **Add folder…**, or drag in from the file manager. Each becomes a root you can open, create subfolders in, rename and remove; one that goes offline shows as unavailable and can be taken off the list. **New folder** makes another one.
- **The row at the bottom**: shows whether AI is connected — **Connect AI**, or the name of the connected subscription — and opens Settings.

There is no Trash entry here. Deleted files go to the system trash, and restoring one is the OS's business.

## The file list

Each row shows an icon, the file name, modification time and more. The row's **⋯ menu** offers:

- **Open**, and **Reveal in folder** to locate the file in your file manager.
- **Copy path**.
- **Move to folder…**: opens a folder picker and actually moves the file, offering skip / overwrite / rename when the destination already has a file of that name.
- **Rename**: inline, extension preserved automatically.
- **Star / Unstar** — stars persist across restarts, and follow a file when you rename it.
- **Duplicate**: creates a copy in the same folder.
- **Delete**: moves the file to the system trash — not a permanent delete.
- **Remove from list**, in the top-level Recent view, to drop an entry without touching the file.

### Several files at once

Tick the checkbox on a row, or ⌘/ctrl-click, to build a selection; the header checkbox selects everything currently listed, and a bar above the list reports how many are selected with **Move to folder…** and **Delete files** for the whole set. You can also drag a multi-selection onto a folder in the sidebar.

## Search

Type in the search box at the top of the board and the results take the board's place; clear the search or press Esc to go back to the board. It matches two things at once:

- **File names**: quick filtering by name.
- **File contents**: GenOffice indexes your files in the background (text inside docx/odt/xlsx/pptx/pdf/md/html), so searching body text finds files too. Scope and toggles live in the search settings.

## Customize Home

Click **Customize Home** at the right end of the board's top row to change the cards. Changes are saved as you make them; click **Done** or press Esc when you finish.

- Drag a card to move it, and drag its bottom-right corner to resize it; the card's **⋯** menu also lets you pick a size. Inside the **New** card, drag apps to reorder them, or click × to remove one from Home.
- **Add card** adds a quick note, favorites, folder view, clock or shortcut card, and brings back cards you removed. Home holds up to 24 cards.
- **Default layout** puts the default cards' order and size, and the apps shown on Home, back to how they started. Cards you added stay.
- **Arrange as a list** shows the cards and apps in a list, where you can reorder them with ↑↓, add or remove them and pick sizes without a mouse.

## New and All apps

The **New** card holds the apps you pinned to Home. Clicking an app creates a file of that type and opens its editor — start writing right away, or let the AI draft for you (every editor has an **AI button** in its ribbon, and **Ask AI** in the selection context menu). The last slot, **All apps**, lists every app by group: search by app name or what it does, open one of the three **Recently used apps**, or use an app's pin button to pin it to Home or remove it. Apps that arrive in a new version carry a **New** badge.

The new file lands in the folder currently selected in the sidebar; with no selection it goes to the default folder.

What each app does:

- **AI Docs** (.docx): a blank text document in the Docs editor. The file is only written to disk on **first save**; new documents open with the AI panel expanded (choose Off or Collapsed under Settings → "AI panel" if you would rather not).
- **AI Sheets** (.xlsx): a blank spreadsheet in the Sheets editor. Until you save, no file exists on disk — the name is reserved for the first save; after the first AI generation the file can also be renamed automatically from its content.
- **AI Slides** (.pptx): a blank presentation in the Slides editor.
- **AI Markdown** (.md): a blank Markdown document in the Markdown editor.
- **AI HTML** (.html): a blank web page in the HTML editor.
- **AI PDF** (.pdf): different from the rest — it **immediately** creates a real blank single-page PDF in the target folder and opens it as a regular file (the PDF editor works on real files). Good for annotating, redacting or adding text; the file can be renamed automatically from its content on first save.
- **Open local files**: a system file picker for Word (.docx/.doc/.odt), Excel (.xlsx/.xlsm/.xls/.csv/.tsv), PowerPoint (.pptx/.ppt), PDF, Markdown (.md/.markdown) and web pages (.html/.htm). Multi-select works; each file gets its own tab. Plain-text files (.txt, .json) open here too — they land in the Markdown editor's source view.

> Tip: File ▸ New in the menu bar creates the same document types (⌘N/Ctrl+N defaults to a text document); dragging a file into the window opens it.

## Ask your knowledge base

- Star files first (any type the app reads); the panel header counts the corpus, and an empty knowledge base tells you to go star something.
- Answers cite the files they came from; click a citation to open the file in its editor.
- Needs a connected AI; see [Subscription connection](help://subscription). The conversation lives in memory only — closing the app ends it.
- Search runs on the local file index, like Home search; files that have disappeared quietly drop out of the corpus.
- Groups organise the Starred list only — the knowledge base always spans every starred file.
