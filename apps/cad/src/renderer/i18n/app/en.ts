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
    'This kind of file cannot be opened here. Files that open: .ttukcad, .dxf, .stl, .obj, .3mf, .glb and .ply.',
  noticeImportFailed: 'The shapes in this file could not be read. An empty drawing is open.',
  saveRefused:
    'The drawing could not be saved. Your changes are still here; try again or use Save As.',
  saveFailed:
    'Something went wrong while saving the drawing. Your changes are still here; try again or use Save As.',
  guideTitle: 'How to open this file',
  guideBody: '{ext} files are made by professional CAD programs, and AI Drawing cannot read them.',
  guideAsk:
    'Ask the person who sent it to save it again as DXF (for a 2D drawing) or STL (for a 3D model) and send that file. Both open here.',
  exportEmpty: 'There is nothing to export. Show at least one shape and try again.',
  exportFailed: 'The file could not be exported. Try again, or choose another folder.',
  exportSourcePath:
    'An export cannot replace the file this drawing came from. Choose another name.',
  issueOpenMesh: 'Cannot compute this group: it holds an open mesh',
  issueTooLarge: 'Too many triangles to show (limit 2 million)',
  editLocked: 'This part is locked. Unlock it to change it.',
  editNotScalable:
    'This part cannot be resized with the handle. Imported meshes, drawings, groups and text can only be moved and turned.',
  editRefused: 'That change could not be made. The drawing is unchanged.',
} satisfies Record<keyof typeof zh, string>
