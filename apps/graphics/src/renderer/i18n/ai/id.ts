import type { zh } from './zh'

export const id = {
  aiOpenAssistant: 'Buka asisten AI',
  aiCollapsePanel: 'Ciutkan panel',
  aiNewChat: 'Obrolan baru',
  aiHintIdle: 'Enter untuk kirim, Shift+Enter baris baru',
  aiHintBusy: 'Membalas…',
  aiSend: 'Kirim',
  aiStop: 'Berhenti',
  aiThinking: 'Berpikir',
  aiWorking: 'Bekerja',
  aiGroupWorking: 'Sedang bekerja…',
  aiWorkedSteps: 'Selesai · {n} langkah',
  aiStopped: 'Dihentikan',
  aiNoReply: '(tidak ada balasan)',
  aiTurnLimit: 'Batas langkah per eksekusi tercapai — kirim instruksi lagi untuk melanjutkan.',
  aiTruncatedNote: '(Balasan terpotong karena batas panjang dan mungkin tidak lengkap.)',
  aiUndelivered: 'Tidak terkirim',
  aiRetry: 'Coba lagi',
  aiCopyReplyTitle: 'Salin balasan',
  aiRegenerateTitle: 'Buat ulang',
  aiUnknownError: 'Permintaan AI gagal, coba lagi',
  aiTimeoutError: 'Respons AI kehabisan waktu',
  aiCreditsExhausted: 'Kredit habis — isi ulang di penyedia AI Anda',
  aiNetworkError:
    'Masalah jaringan: tidak dapat terhubung ke layanan AI. Periksa koneksi Anda lalu coba lagi',
  aiOverloadedError: 'Layanan AI sedang sibuk — silakan coba lagi sebentar lagi',
  aiEmptyTitle: 'Edit dengan AI',
  aiEmptyBody:
    'Beri tahu AI apa yang perlu diubah pada gambar ini. AI bekerja lewat perintah aplikasi, dan satu Urungkan mengembalikan semua yang diubah oleh satu permintaan.',
  aiComposerPlaceholder: 'Beri tahu AI apa yang perlu diubah…',
  aiEmptyPhoto: 'Misalnya: "Hapus latar belakang", "Buat sedikit lebih terang"',
  aiEmptyIllust:
    'Misalnya: "Gambar persegi panjang bersudut bulat di tengah", "Ekspor logo sebagai PNG"',
  aiUndoAll: 'Urungkan',
  aiUndoTitle: 'Urungkan semua yang diubah permintaan ini',
  aiUndone: 'Diurungkan: dokumen kembali seperti sebelum permintaan ini.',
  aiUndoChangedSince:
    'Dokumen berubah setelahnya, jadi tidak bisa diurungkan dalam satu langkah. Gunakan Urungkan aplikasi (Ctrl+Z).',
  aiUndoOverflow:
    'Permintaan ini membuat lebih banyak perubahan daripada yang disimpan riwayat aplikasi, jadi tidak bisa diurungkan dalam satu langkah.',
  aiUndoFailed:
    'Tidak semuanya bisa diurungkan. Gunakan Urungkan aplikasi (Ctrl+Z) untuk mundur lebih jauh.',
  aiBusyNotice: 'Anda tidak bisa mengedit dokumen saat AI bekerja.',
  aiToolFind: 'Mencari perintah',
  aiToolDescribe: 'Membaca perintah',
  aiToolRun: 'Menjalankan perintah',
  aiToolRunMany: 'Menjalankan beberapa perintah',
  aiToolInspect: 'Membaca dokumen',
  aiToolExport: 'Mengekspor salinan',
  aiToolGuide: 'Membaca panduan',
} satisfies Record<keyof typeof zh, string>
