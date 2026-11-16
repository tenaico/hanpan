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
    'Ce type de fichier ne peut pas être ouvert ici. Fichiers acceptés : .ttukcad, .dxf, .stl et .obj.',
  noticeImportFailed: 'Les formes de ce fichier n’ont pas pu être lues. Un dessin vide est ouvert.',
  saveRefused:
    'Le dessin n’a pas pu être enregistré. Vos modifications sont conservées ; réessayez ou utilisez Enregistrer sous.',
  saveFailed:
    'Un problème est survenu pendant l’enregistrement du dessin. Vos modifications sont conservées ; réessayez ou utilisez Enregistrer sous.',
} satisfies Record<keyof typeof zh, string>
