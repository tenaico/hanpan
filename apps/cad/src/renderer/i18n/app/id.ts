import type { zh } from './zh'

export const id = {
  untitled: 'Gambar tanpa judul',
  saved: 'Tersimpan',
  unsaved: 'Belum disimpan',
  noWebGlTitle: 'Tampilan 3D tidak dapat ditampilkan',
  noWebGlBody:
    'PC ini tidak dapat menjalankan WebGL yang dibutuhkan tampilan 3D. Gambar tetap bisa dibuka dan disimpan, tetapi tidak dapat ditampilkan. Coba salah satu cara berikut, lalu buka ulang tab:',
  noWebGlDriver: 'Perbarui driver kartu grafis.',
  noWebGlAccel: 'Aktifkan akselerasi perangkat keras di pengaturan grafis.',
  noticeNotOk:
    'File ini tidak dapat dibuka sebagai gambar. File mungkin rusak atau dibuat dengan versi yang lebih baru. Gambar kosong telah dibuka; saat menyimpan akan diminta file baru.',
  noticeTooLarge: 'File ini terlalu besar untuk dibuka (batas 100 MB). Gambar kosong telah dibuka.',
  noticeUnreadable: 'File ini tidak dapat dibaca. Gambar kosong telah dibuka.',
  noticeUnsupported:
    'Jenis file ini tidak dapat dibuka di sini. Yang dapat dibuka: file .ttukcad, .dxf, .stl, .obj, .3mf, .glb, dan .ply.',
  noticeImportFailed: 'Bentuk dalam file ini tidak dapat dibaca. Gambar kosong telah dibuka.',
  saveRefused:
    'Gambar tidak dapat disimpan. Perubahan Anda masih ada; coba lagi atau gunakan Simpan Sebagai.',
  saveFailed:
    'Terjadi masalah saat menyimpan gambar. Perubahan Anda masih ada; coba lagi atau gunakan Simpan Sebagai.',
  guideTitle: 'Cara membuka file ini',
  guideBody:
    'File {ext} dibuat oleh program CAD profesional, dan Gambar AI tidak dapat membacanya.',
  guideAsk:
    'Minta pengirimnya menyimpan ulang sebagai DXF (untuk gambar 2D) atau STL (untuk model 3D) lalu mengirim file tersebut. Keduanya bisa dibuka di sini.',
  exportEmpty: 'Tidak ada yang bisa diekspor. Tampilkan setidaknya satu bentuk, lalu coba lagi.',
  exportFailed: 'File tidak dapat diekspor. Coba lagi atau pilih folder lain.',
  exportSourcePath: 'Ekspor tidak dapat menggantikan file asal gambar ini. Pilih nama lain.',
  issueOpenMesh: 'Grup ini tidak dapat dihitung: berisi mesh terbuka',
  issueTooLarge: 'Terlalu banyak segitiga untuk ditampilkan (batas 2 juta)',
  editLocked: 'Bagian ini terkunci. Buka kuncinya untuk mengubahnya.',
  editNotScalable:
    'Bagian ini tidak dapat diubah ukurannya dengan pegangan. Mesh impor, gambar, grup, dan teks hanya dapat dipindahkan dan diputar.',
  editRefused: 'Perubahan itu tidak dapat dilakukan. Gambar tidak berubah.',
} satisfies Record<keyof typeof zh, string>
