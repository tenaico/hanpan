import type { zh } from './zh'

export const fr = {
  untitled: 'Dessin sans titre',
  saved: 'Enregistré',
  unsaved: 'Non enregistré',
  noWebGlTitle: 'La vue 3D ne peut pas s’afficher',
  noWebGlBody:
    'Ce PC n’a pas pu démarrer WebGL, nécessaire à la vue 3D. Le dessin s’ouvre et s’enregistre quand même, mais il ne peut pas être affiché. Essayez l’une de ces solutions, puis rouvrez l’onglet :',
  noWebGlDriver: 'Mettez à jour le pilote de la carte graphique.',
  noWebGlAccel: 'Activez l’accélération matérielle dans les paramètres graphiques.',
  noticeNotOk:
    'Ce fichier n’a pas pu être ouvert comme dessin. Il est peut-être endommagé ou créé par une version plus récente. Un dessin vide est ouvert ; l’enregistrement demandera un nouveau fichier.',
  noticeTooLarge:
    'Ce fichier est trop volumineux pour être ouvert (limite : 100 Mo). Un dessin vide est ouvert.',
  noticeUnreadable: 'Ce fichier n’a pas pu être lu. Un dessin vide est ouvert.',
  noticeUnsupported:
    'Ce type de fichier ne peut pas être ouvert ici. Fichiers acceptés : .ttukcad, .dxf, .stl, .obj, .3mf, .glb et .ply.',
  noticeImportFailed: 'Les formes de ce fichier n’ont pas pu être lues. Un dessin vide est ouvert.',
  saveRefused:
    'Le dessin n’a pas pu être enregistré. Vos modifications sont conservées ; réessayez ou utilisez Enregistrer sous.',
  saveFailed:
    'Un problème est survenu pendant l’enregistrement du dessin. Vos modifications sont conservées ; réessayez ou utilisez Enregistrer sous.',
  guideTitle: 'Comment ouvrir ce fichier',
  guideBody:
    'Les fichiers {ext} sont créés par des logiciels de CAO professionnels, et Dessin IA ne peut pas les lire.',
  guideAsk:
    'Demandez à l’expéditeur de l’enregistrer à nouveau en DXF (pour un dessin 2D) ou en STL (pour un modèle 3D) et de vous envoyer ce fichier. Les deux s’ouvrent ici.',
  exportEmpty: 'Il n’y a rien à exporter. Affichez au moins une forme, puis réessayez.',
  exportFailed: 'Le fichier n’a pas pu être exporté. Réessayez ou choisissez un autre dossier.',
  exportSourcePath:
    'Un export ne peut pas remplacer le fichier d’origine de ce dessin. Choisissez un autre nom.',
  issueOpenMesh: 'Impossible de calculer ce groupe : il contient un maillage ouvert',
  issueTooLarge: 'Trop de triangles à afficher (limite : 2 millions)',
  editLocked: 'Cette pièce est verrouillée. Déverrouillez-la pour la modifier.',
  editNotScalable:
    'Cette pièce ne peut pas être redimensionnée avec la poignée. Les maillages importés, les dessins, les groupes et le texte peuvent seulement être déplacés et tournés.',
  editRefused: 'Cette modification est impossible. Le dessin n’a pas changé.',
} satisfies Record<keyof typeof zh, string>
