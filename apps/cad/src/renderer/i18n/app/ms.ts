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
    'Jenis fail ini tidak dapat dibuka di sini. Fail yang dibuka: .ttukcad, .dxf, .stl, .obj, .3mf, .glb dan .ply.',
  noticeImportFailed: 'Bentuk dalam fail ini tidak dapat dibaca. Lukisan kosong telah dibuka.',
  saveRefused:
    'Lukisan tidak dapat disimpan. Perubahan anda masih ada; cuba lagi atau gunakan Simpan Sebagai.',
  saveFailed:
    'Berlaku masalah semasa menyimpan lukisan. Perubahan anda masih ada; cuba lagi atau gunakan Simpan Sebagai.',
  guideTitle: 'Cara membuka fail ini',
  guideBody:
    'Fail {ext} dibuat oleh program CAD profesional, dan Lukisan AI tidak dapat membacanya.',
  guideAsk:
    'Minta pengirim menyimpannya semula sebagai DXF (untuk lukisan 2D) atau STL (untuk model 3D) dan menghantar fail itu. Kedua-duanya boleh dibuka di sini.',
  exportEmpty:
    'Tiada apa-apa untuk dieksport. Tunjukkan sekurang-kurangnya satu bentuk dan cuba lagi.',
  exportFailed: 'Fail tidak dapat dieksport. Cuba lagi atau pilih folder lain.',
  exportSourcePath: 'Eksport tidak boleh menggantikan fail asal lukisan ini. Pilih nama lain.',
  issueOpenMesh: 'Kumpulan ini tidak dapat dikira: ia mengandungi jaring terbuka',
  issueTooLarge: 'Terlalu banyak segi tiga untuk dipaparkan (had 2 juta)',
  editLocked: 'Bahagian ini dikunci. Buka kuncinya untuk mengubahnya.',
  editNotScalable:
    'Saiz bahagian ini tidak boleh diubah dengan pemegang. Jaring yang diimport, lukisan, kumpulan dan teks hanya boleh dialihkan dan diputar.',
  editRefused: 'Perubahan itu tidak dapat dibuat. Lukisan tidak berubah.',
} satisfies Record<keyof typeof zh, string>
