import type { zh } from './zh'

export const ms = {
  untitled: 'Lukisan tanpa tajuk',
  saved: 'Disimpan',
  unsaved: 'Belum disimpan',
  noWebGlTitle: 'Paparan 3D tidak dapat ditunjukkan',
  noWebGlBody:
    'PC ini tidak dapat memulakan WebGL yang diperlukan oleh paparan 3D. Lukisan masih boleh dibuka dan disimpan, tetapi tidak dapat ditunjukkan. Cuba salah satu cara ini, kemudian buka semula tab:',
  noWebGlDriver: 'Kemas kini pemacu kad grafik.',
  noWebGlAccel: 'Hidupkan pecutan perkakasan dalam tetapan grafik.',
  noticeNotOk:
    'Fail ini tidak dapat dibuka sebagai lukisan. Ia mungkin rosak atau dibuat oleh versi yang lebih baharu. Lukisan kosong telah dibuka; semasa menyimpan anda akan diminta fail baharu.',
  noticeTooLarge: 'Fail ini terlalu besar untuk dibuka (had 100 MB). Lukisan kosong telah dibuka.',
  noticeUnreadable: 'Fail ini tidak dapat dibaca. Lukisan kosong telah dibuka.',
  noticeUnsupported:
    'Jenis fail ini tidak dapat dibuka di sini. Fail yang dibuka: .ttukcad, .dxf, .stl dan .obj.',
  noticeImportFailed: 'Bentuk dalam fail ini tidak dapat dibaca. Lukisan kosong telah dibuka.',
  saveRefused:
    'Lukisan tidak dapat disimpan. Perubahan anda masih ada; cuba lagi atau gunakan Simpan Sebagai.',
  saveFailed:
    'Berlaku masalah semasa menyimpan lukisan. Perubahan anda masih ada; cuba lagi atau gunakan Simpan Sebagai.',
} satisfies Record<keyof typeof zh, string>
