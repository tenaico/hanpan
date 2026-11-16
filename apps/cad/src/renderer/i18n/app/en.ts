import type { zh } from './zh'

export const en = {
  untitled: 'Untitled Drawing',
  saved: 'Saved',
  unsaved: 'Unsaved',
  noWebGlTitle: 'The 3D view cannot be shown',
  noWebGlBody:
    'This PC could not start WebGL, which the 3D view needs. The drawing still opens and saves, but it cannot be shown. Try one of these, then reopen the tab:',
  noWebGlDriver: 'Update the graphics card driver.',
  noWebGlAccel: 'Turn on hardware acceleration in the graphics settings.',
  noticeNotOk:
    'This file could not be opened as a drawing. It may be damaged or made by a newer version. An empty drawing is open; saving asks for a new file.',
  noticeTooLarge: 'This file is too large to open (the limit is 100 MB). An empty drawing is open.',
  noticeUnreadable: 'This file could not be read. An empty drawing is open.',
  noticeUnsupported:
    'This kind of file cannot be opened here. Files that open: .ttukcad, .dxf, .stl and .obj.',
  noticeImportFailed: 'The shapes in this file could not be read. An empty drawing is open.',
  saveRefused:
    'The drawing could not be saved. Your changes are still here; try again or use Save As.',
  saveFailed:
    'Something went wrong while saving the drawing. Your changes are still here; try again or use Save As.',
} satisfies Record<keyof typeof zh, string>
