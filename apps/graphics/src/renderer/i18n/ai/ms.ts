import type { zh } from './zh'

export const ms = {
  aiOpenAssistant: 'Buka pembantu AI',
  aiCollapsePanel: 'Runtuhkan panel',
  aiNewChat: 'Sembang baharu',
  aiHintIdle: 'Enter untuk hantar, Shift+Enter baris baharu',
  aiHintBusy: 'Membalas…',
  aiSend: 'Hantar',
  aiStop: 'Berhenti',
  aiThinking: 'Berfikir',
  aiWorking: 'Bekerja',
  aiGroupWorking: 'Sedang berjalan…',
  aiWorkedSteps: 'Selesai · {n} langkah',
  aiStopped: 'Dihentikan',
  aiNoReply: '(tiada balasan)',
  aiTurnLimit: 'Had langkah setiap larian dicapai — hantar arahan lain untuk teruskan.',
  aiTruncatedNote: '(Balasan terpotong kerana had panjang dan mungkin tidak lengkap.)',
  aiUndelivered: 'Tidak dihantar',
  aiRetry: 'Cuba lagi',
  aiCopyReplyTitle: 'Salin balasan',
  aiRegenerateTitle: 'Jana semula',
  aiUnknownError: 'Permintaan AI gagal, cuba lagi',
  aiTimeoutError: 'Respons AI tamat masa',
  aiCreditsExhausted: 'Kredit habis — tambah nilai dengan penyedia AI anda',
  aiNetworkError:
    'Masalah rangkaian: tidak dapat menghubungi perkhidmatan AI. Semak sambungan anda dan cuba lagi',
  aiOverloadedError: 'Perkhidmatan AI sedang sibuk — sila cuba lagi sebentar lagi',
  aiEmptyTitle: 'Edit dengan AI',
  aiEmptyBody:
    'Beritahu AI apa yang perlu diubah dalam gambar ini. AI bekerja melalui arahan aplikasi, dan satu Buat Asal mengembalikan semua yang diubah oleh satu permintaan.',
  aiComposerPlaceholder: 'Beritahu AI apa yang perlu diubah…',
  aiEmptyPhoto: 'Contohnya: "Buang latar belakang", "Terangkan sedikit"',
  aiEmptyIllust:
    'Contohnya: "Lukis segi empat tepat bersudut bulat di tengah", "Eksport logo sebagai PNG"',
  aiUndoAll: 'Buat Asal',
  aiUndoTitle: 'Buat asal semua yang diubah oleh permintaan ini',
  aiUndone: 'Dibuat asal: dokumen kembali seperti sebelum permintaan ini.',
  aiUndoChangedSince:
    'Dokumen berubah selepas itu, jadi tidak boleh dibuat asal dalam satu langkah. Gunakan Buat Asal aplikasi (Ctrl+Z).',
  aiUndoOverflow:
    'Permintaan ini membuat lebih banyak perubahan daripada yang disimpan sejarah aplikasi, jadi tidak boleh dibuat asal dalam satu langkah.',
  aiUndoFailed:
    'Tidak semuanya dapat dibuat asal. Gunakan Buat Asal aplikasi (Ctrl+Z) untuk berundur lagi.',
  aiBusyNotice: 'Anda tidak boleh mengedit dokumen semasa AI bekerja.',
  aiToolFind: 'Mencari arahan',
  aiToolDescribe: 'Membaca arahan',
  aiToolRun: 'Menjalankan arahan',
  aiToolRunMany: 'Menjalankan beberapa arahan',
  aiToolInspect: 'Membaca dokumen',
  aiToolExport: 'Mengeksport salinan',
  aiToolGuide: 'Membaca panduan',
} satisfies Record<keyof typeof zh, string>
