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
    'Jenis file ini tidak dapat dibuka di sini. Yang dapat dibuka: file .ttukcad, .dxf, .stl, dan .obj.',
  noticeImportFailed: 'Bentuk dalam file ini tidak dapat dibaca. Gambar kosong telah dibuka.',
  saveRefused:
    'Gambar tidak dapat disimpan. Perubahan Anda masih ada; coba lagi atau gunakan Simpan Sebagai.',
  saveFailed:
    'Terjadi masalah saat menyimpan gambar. Perubahan Anda masih ada; coba lagi atau gunakan Simpan Sebagai.',
} satisfies Record<keyof typeof zh, string>
