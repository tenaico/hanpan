# Pintasan papan ketik

Setiap editor punya pengikatan tombol sendiri, dan hanya sebagian yang berlaku di mana saja. Halaman ini adalah daftar lengkapnya, dikelompokkan menurut aplikasi, dengan pintasan macOS dan Windows / Linux berdampingan.

## Baca ini dulu

### Di mana saja dalam Hanpan (tab dan jendela)

| Tindakan                                                                                     | Windows / Linux              | macOS                        |
| -------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------- |
| Tab berikutnya / tab sebelumnya                                                              | Ctrl+Tab / Ctrl+Shift+Tab    | ⌃Tab / ⌃⇧Tab                 |
| Tutup tab saat ini (di Beranda: jendelanya, dengan konfirmasi dulu jika ada dokumen terbuka) | Ctrl+W                       | ⌘W                           |
| Buka Pengaturan — di Beranda                                                                 | Ctrl+,                       | ⌘,                           |
| Buka Panduan Pengguna                                                                        | F1                           | F1                           |
| Pilih tab di bilah tab — saat tab sedang fokus                                               | ← / →, Enter, Delete (tutup) | ← / →, Enter, Delete (tutup) |

### Setiap editor

**Mulai dari sini, tombol-tombolnya milik editor yang sedang Anda hadapi, dan berubah saat Anda mengganti tab.**

| Tindakan                                                         | Windows / Linux | macOS |
| ---------------------------------------------------------------- | --------------- | ----- |
| Buka Panduan Pengguna — bisa dipakai di mana saja dalam aplikasi | F1              | F1    |
| Ciutkan / perluas pita — setiap editor                           | Ctrl+F1         | ⌥⌘R   |
| Pita kompak — hanya Docs                                         | Ctrl+Alt+K      | ⌥⌘K   |
| Buka lembar Pintasan Papan Ketik — hanya Word                    | Ctrl+/          | ⌘/    |

- **F1 membuka manual ini**, bukan lembar pintasan. Tombol itu milik menu aplikasi, jadi ia berlaku dari Word, Sheets, Slides, PDF, maupun tab Beranda.
- **Tombol pita adalah `Ctrl+F1`, atau `⌥⌘R` di macOS.** Menekan `F1` polos tidak melakukan apa pun — F1 adalah manualnya, dan tombol pita sengaja tidak berbagi kunci dengan F1. `Ctrl+F1` juga diterima di macOS, meski `⌥⌘R` adalah tombol yang dipakai Office for Mac.
- **Lembar Pintasan Papan Ketik hanya milik Word** (`⌘/`). Isinya persis tabel Word di bawah ini. Tidak ada editor lain yang memilikinya.

![Lembar Pintasan Papan Ketik milik Word sendiri: tindakan di sebelah kiri, kombinasi tombol di sebelah kanan, dikelompokkan menurut Berkas, Edit, Format Teks, Format Paragraf, Sisipkan, Tinjau & Alat, dan Tampilan](img/word-shortcuts.png)

- **`⌘O`, `⌘S`, dan `⌘P` diimplementasikan terpisah di balik tiap editor**, dan perilakunya tidak sepenuhnya sama. `⌘P` milik Word menyusun pratinjau cetak lebih dulu sehingga satu lembar cetak sama dengan satu halaman di layar; milik PDF membuka dialog cetak PDF; Sheets dan Slides punya versinya sendiri lagi.
- **Selebihnya bersifat per-aplikasi.** Saat tab Word aktif, `⌘B` adalah Tebal milik Word. Saat Slides aktif, `⌘B` adalah Tebal milik Slides, dan menu tempatnya tinggal bukan menu yang biasa Anda pakai. Wherever sebuah pengikatan hanya aktif dengan ada sesuatu yang terpilih, atau di panel tertentu, kolom Tindakan mengatakannya.

## Mode presentasi

- **Mulai**: F5 di Word, PDF, Mindmap, HTML, dan Markdown. Di spreadsheet, Ctrl+F5 (dari A1) atau Shift+F5 (dari sel aktif). Di dokumen HWP, Ctrl+F5 (di sana F5 memilih sel tabel).
- **Pintu lain**: di Word, Ctrl+F5 dan Shift+F5 membuka tampilan baca tanpa layar penuh; di PDF mulai dari halaman aktif; di HTML presentasi di dalam tab.
- **Selesai**: Esc atau F5. F11 adalah layar penuh jendela dan tidak mengubah tampilan dokumen.

## Konvensi

- Kolom macOS memakai simbol yang familier: `⌘` Command, `⌥` Option, `⇧` Shift, `⌃` Control.
- Kolom Windows / Linux mengeja nama tombolnya: `Ctrl`, `Alt`, `Shift`.
- Kalau GenOffice memang butuh tombol berbeda di dua platform, tabelnya menunjukkannya. Kasus yang umum adalah `⌃H` untuk Temukan & Ganti (macOS memakai `⌘H` untuk Sembunyikan), `⌥⌘G` untuk Ke, dan tombol tutup milik Slides.
- Pintasan yang hanya berlaku saat ada seleksi ditulis di kolom Tindakan, bukan diberi kolom sendiri, supaya tabelnya tetap lebar tiga kolom.

## Word

Word punya bilah menu penuh, jadi pintasan berkas dan format di bawah ini berlaku kapan pun sebuah tab Word punya fokus, dokumen apa pun yang terbuka. Pintasan penyuntingan membutuhkan dokumen yang sudah termuat dan bisa disunting, dengan caret di dalam teks; pintasan itu tidak aktif saat Anda mengetik di kotak Temukan, kotak perintah AI, atau kolom isian lain apa pun.

### Berkas

| Tindakan        | Windows / Linux | macOS |
| --------------- | --------------- | ----- |
| Baru            | Ctrl+N          | ⌘N    |
| Jendela Baru    | Ctrl+Shift+N    | ⇧⌘N   |
| Buka…           | Ctrl+O          | ⌘O    |
| Simpan          | Ctrl+S          | ⌘S    |
| Simpan Sebagai… | Ctrl+Shift+S    | ⇧⌘S   |
| Cetak           | Ctrl+P          | ⌘P    |
| Tutup (tab)     | Ctrl+W          | ⌘W    |

`⌘P` bukan perintah cetak peramban. Word menyusun pratinjau cetak lebih dulu, sehingga satu lembar cetak sama persis dengan satu halaman di layar, lalu membuka dialog cetiknya sendiri.

### Edit

| Tindakan                  | Windows / Linux | macOS |
| ------------------------- | --------------- | ----- |
| Urungkan                  | Ctrl+Z          | ⌘Z    |
| Ulangi                    | Ctrl+Shift+Z    | ⇧⌘Z   |
| Potong                    | Ctrl+X          | ⌘X    |
| Salin                     | Ctrl+C          | ⌘C    |
| Tempel                    | Ctrl+V          | ⌘V    |
| Tempel sebagai Teks Biasa | Ctrl+Shift+V    | ⌥⇧⌘V  |
| Pilih Semua               | Ctrl+A          | ⌘A    |
| Temukan                   | Ctrl+F          | ⌘F    |
| Ganti                     | Ctrl+H          | ⌃H    |
| Ke                        | Ctrl+G          | ⌥⌘G   |
| Pintasan Papan Ketik      | Ctrl+/          | ⌘/    |

Ganti memakai Ctrl+H di kedua platform karena `⌘H` menyembunyikan jendela di macOS dan tidak pernah sampai ke Word. Ke mengikuti pembagian milik Word sendiri: `⌥⌘G` di Mac supaya `⇧⌘G` tetap kosong untuk Jumlah Kata.

### Format Teks

| Tindakan                             | Windows / Linux       | macOS    |
| ------------------------------------ | --------------------- | -------- |
| Tebal                                | Ctrl+B                | ⌘B       |
| Miring                               | Ctrl+I                | ⌘I       |
| Garis bawah                          | Ctrl+U                | ⌘U       |
| Font… (dialog)                       | Ctrl+D                | ⌘D       |
| Perbesar Ukuran Font                 | Ctrl+Shift+.          | ⇧⌘.      |
| Perkecil Ukuran Font                 | Ctrl+Shift+,          | ⇧⌘,      |
| Perbesar Ukuran Font 1 pt            | Ctrl+]                | ⌘]       |
| Perkecil Ukuran Font 1 pt            | Ctrl+[                | ⌘[       |
| Superskrip                           | Ctrl+Shift+= / Ctrl+. | ⇧⌘= / ⌘. |
| Subskrip                             | Ctrl+,                | ⌘,       |
| Ubah Huruf Besar-Kecil               | Shift+F3              | ⇧F3      |
| Salin Format (dengan teks terpilih)  | Ctrl+Shift+C          | ⇧⌘C      |
| Tempel Format (setelah Salin Format) | Ctrl+Alt+Shift+V      | ⇧⌘V      |
| Hapus Semua Format                   | Ctrl+Space            | ⌃␣       |

Dua pintasan penyalin format adalah satu-satunya tempat tombol Windows bukan sekadar nama ulang: Tempel Format memakai Alt karena di sana Ctrl+Shift+V sudah menempel sekaligus mencocokkan gaya.

### Format Paragraf

| Tindakan                                    | Windows / Linux | macOS |
| ------------------------------------------- | --------------- | ----- |
| Rata Kiri                                   | Ctrl+L          | ⌘L    |
| Rata Tengah                                 | Ctrl+E          | ⌘E    |
| Rata Kanan                                  | Ctrl+R          | ⌘R    |
| Rata Penuh                                  | Ctrl+J          | ⌘J    |
| Jarak Baris 1.0                             | Ctrl+1          | ⌘1    |
| Jarak Baris 1.5                             | Ctrl+5          | ⌘5    |
| Jarak Baris 2.0                             | Ctrl+2          | ⌘2    |
| Tambah Indentasi                            | Ctrl+M          | ⌃M    |
| Kurangi Indentasi                           | Ctrl+Shift+M    | ⌃⇧M   |
| Indentasi Menggantung                       | Ctrl+T          | ⌘T    |
| Hapus Indentasi Menggantung                 | Ctrl+Shift+T    | ⇧⌘T   |
| Hapus Format Paragraf                       | Ctrl+Q          | ⌃Q    |
| Normal (gaya)                               | Ctrl+Alt+0      | ⌥⌘0   |
| Judul 1 (gaya)                              | Ctrl+Alt+1      | ⌥⌘1   |
| Judul 2 (gaya)                              | Ctrl+Alt+2      | ⌥⌘2   |
| Judul 3 (gaya)                              | Ctrl+Alt+3      | ⌥⌘3   |
| Paragraf… (dialog)                          | Ctrl+Alt+M      | ⌥⌘M   |
| Pindahkan Paragraf ke Atas                  | Alt+Shift+↑     | ⌥⇧↑   |
| Pindahkan Paragraf ke Bawah                 | Alt+Shift+↓     | ⌥⇧↓   |
| Turunkan Tingkat Daftar Item (di awal item) | Tab             | Tab   |
| Naikkan Tingkat Daftar Item (di awal item)  | Shift+Tab       | ⇧Tab  |

Indentasi, indentasi menggantung, dan Hapus Format Paragraf hanya memakai Ctrl di kedua platform: `⌘M` memperkecil jendela dan `⌘Q` keluar, jadi pintasan Command akan menjadi suntingan diam-diam di tengah jalan keluar. Tab hanya mengubah tingkat daftar ketika caret berada di awal sebuah item atau membentang di beberapa item; di dalam teks ia menyisipkan karakter tab, dan `⇧Tab` selalu menaikkan tingkat.

### Sisipkan

| Tindakan                       | Windows / Linux  | macOS |
| ------------------------------ | ---------------- | ----- |
| Pemisah Halaman                | Ctrl+Enter       | ⌘⏎    |
| Pemisah Kolom                  | Ctrl+Shift+Enter | ⇧⌘⏎   |
| Pemisah Baris                  | Shift+Enter      | ⇧⏎    |
| Tautan…                        | Ctrl+K           | ⌘K    |
| Komentar Baru                  | Ctrl+Alt+A       | ⌥⌘A   |
| Sisipkan Catatan Kaki          | Ctrl+Alt+F       | ⌥⌘F   |
| Sisipkan Catatan Akhir         | Ctrl+Alt+D       | ⌥⌘E   |
| Tanggal (field)                | Alt+Shift+D      | ⌥⇧D   |
| Waktu (field)                  | Alt+Shift+T      | ⌥⇧T   |
| Spasi Tanpa Pemenggalan        | Ctrl+Shift+Space | ⇧⌘␣   |
| Tanda Hubung Tanpa Pemenggalan | Ctrl+Shift+-     | ⇧⌘-   |

Sisipkan Catatan Akhir adalah pembagian platform yang sungguhan, bukan sekadar nama ulang: Word memakai `⌥⌘E` di Mac karena `⌥⌘D` milik Dock di sana.

### Tinjau & Alat

| Tindakan           | Windows / Linux | macOS |
| ------------------ | --------------- | ----- |
| Lacak Perubahan    | Ctrl+Shift+E    | ⇧⌘E   |
| Jumlah Kata        | Ctrl+Shift+G    | ⇧⌘G   |
| Proofread          | F7              | F7    |
| Perbarui Field     | F9              | F9    |
| Alihkan Kode Field | Alt+F9          | ⌥F9   |

F7 menjalankan proofread AI dan F9 memperbarui field; keduanya butuh dokumen yang sudah termuat. Begitu pembatasan penyuntingan menyalakan Lacak Perubahan, itu tidak bisa dimatikan lagi.

### Tampilan

| Tindakan                           | Windows / Linux | macOS |
| ---------------------------------- | --------------- | ----- |
| Perbesar                           | Ctrl+=          | ⌘=    |
| Perkecil                           | Ctrl+-          | ⌘-    |
| Perbesar ke 100%                   | Ctrl+0          | ⌘0    |
| Tampilkan/sembunyikan tanda format | Ctrl+Shift+8    | ⌘8    |

Pintasan tanda format mengikuti pembagian milik Word sendiri, `⌘8` melawan Ctrl+Shift+8. Word mengambil pembesaran hanya lewat tiga pintasan menu di atas — `⌘+` tidak melakukan apa pun di sini.

F1 membuka **Panduan Pengguna**, bukan daftar ini. Lembar pintasannya adalah `⌘/` atau Ctrl+/, dan itu sebuah item menu Word, jadi hanya muncul selama tab Word aktif.

## Sheets

GenOffice Sheets membuka dan menyimpan buku kerja .xlsx. Sebagian besar pintasan di bawah ini adalah pintasan yang umum dipakai program spreadsheet, jadi banyak yang mungkin sudah Anda kenal.

> **Penyuntingan menang.** Hampir semua pintasan di Sheets diabaikan selama Anda menyunting sel atau mengetik di **Bilah Rumus**, supaya mengetik, memindahkan caret, dan Backspace tetap bermakna penyuntingan teks biasa. Kalau sebuah tombol tidak melakukan apa pun, periksa apakah Anda sedang di tengah menyunting: tekan Esc atau Enter dulu, lalu coba lagi. Perintah yang bekerja pada seleksi juga tidak melakukan apa pun selama dialog terbuka. Di mana sebuah pintasan menjadi pengecualian terhadap aturan ini, tabel menyatakannya.

Dua konvensi berikut bersifat khusus untuk Sheets. `⌘` dan `⌃` adalah slot modifier yang sama — keduanya diterima di setiap platform, jadi `⌘1` dan `Ctrl+1` adalah pintasan yang sama. **Sel Windows / Linux yang kosong berarti pintasan itu hanya ada di macOS.**

### Navigasi

| Tindakan                                               | Windows / Linux | macOS      |
| ------------------------------------------------------ | --------------- | ---------- |
| Lembar kerja berikutnya                                | Ctrl+PgDn       | ⌘PgDn      |
| Lembar kerja sebelumnya                                | Ctrl+PgUp       | ⌘PgUp      |
| Lembar kerja berikutnya (setara Excel untuk Mac)       |                 | ⌥→         |
| Lembar kerja sebelumnya (setara Excel untuk Mac)       |                 | ⌥←         |
| Lompat ke sel pertama yang tidak dibekukan             | Ctrl+Home       | ⌘Home      |
| Lompat ke sel terakhir yang terpakai (isi atau format) | Ctrl+End        | ⌘End       |
| Dialog Ke                                              | Ctrl+G, F5      | ⌘G, F5     |
| Sisipkan lembar kerja baru                             | Shift+F11       | ⇧F11       |
| Pindahkan sel aktif satu layar ke bawah (dan gulir)    | Page Down       | Page Down  |
| Pindahkan sel aktif satu layar ke atas (dan gulir)     | Page Up         | Page Up    |
| Pindahkan sel aktif satu layar ke kanan (dan gulir)    | Alt+Page Down   | ⌥Page Down |
| Pindahkan sel aktif satu layar ke kiri (dan gulir)     | Alt+Page Up     | ⌥Page Up   |

### Seleksi

| Tindakan                                                               | Windows / Linux                                     | macOS           |
| ---------------------------------------------------------------------- | --------------------------------------------------- | --------------- |
| Pilih seluruh kolom sel aktif                                          | Ctrl+Space                                          | ⌃Space          |
| Pilih seluruh baris sel aktif                                          | Shift+Space                                         | ⇧Space          |
| Lompat ke tepi blok data — salah satu dari empat panah                 | Ctrl+↑ Ctrl+↓ Ctrl+← Ctrl+→                         | ⌘↑ ⌘↓ ⌘← ⌘→     |
| Perluas seleksi sampai tepi blok data; tekan lagi untuk menyusutkannya | Ctrl+Shift+↑ Ctrl+Shift+↓ Ctrl+Shift+← Ctrl+Shift+→ | ⌘⇧↑ ⌘⇧↓ ⌘⇧← ⌘⇧→ |
| Lompat ke kolom pertama baris sekarang                                 | Home                                                | Home            |

### Penyuntingan

| Tindakan                                                                                        | Windows / Linux       | macOS                     |
| ----------------------------------------------------------------------------------------------- | --------------------- | ------------------------- |
| Isi seluruh seleksi dengan isian sekarang                                                       | Ctrl+Enter            | ⌃⏎ atau ⌘⏎                |
| Mulai baris baru di dalam sel                                                                   | Alt+Enter             | ⌥⏎, atau ⌃⌥⏎ / ⌘⌥⏎ di Mac |
| Sunting sel aktif di tempat                                                                     | F2                    | F2                        |
| Tebal                                                                                           | Ctrl+B                | ⌘B                        |
| Miring                                                                                          | Ctrl+I                | ⌘I                        |
| Garis bawah                                                                                     | Ctrl+U                | ⌘U                        |
| Temukan                                                                                         | Ctrl+F                | ⌘F                        |
| Isi ke kanan dari kolom terpilih paling kiri                                                    | Ctrl+R                | ⌘R                        |
| Berganti rujukan rumus antara relatif dan absolut                                               | F4                    | F4                        |
| Berganti rujukan rumus antara relatif dan absolut (setara Excel untuk Mac, saat menyunting sel) |                       | ⌘T                        |
| Salin                                                                                           | Ctrl+C                | ⌘C                        |
| Potong                                                                                          | Ctrl+X                | ⌘X                        |
| Tempel                                                                                          | Ctrl+V                | ⌘V                        |
| Tempel nilai saja                                                                               | Ctrl+Shift+V          | ⌘⇧V                       |
| Isi Cepat dari pola di atasnya                                                                  | Ctrl+E                | ⌘E                        |
| Urungkan                                                                                        | Ctrl+Z                | ⌘Z                        |
| Ulangi                                                                                          | Ctrl+Shift+Z          | ⇧⌘Z                       |
| Pilih seluruh lembar kerja                                                                      | Ctrl+A                | ⌘A                        |
| Sisipkan tanggal hari ini                                                                       | Ctrl+;                | ⌘;                        |
| Sisipkan waktu saat ini                                                                         | Ctrl+Shift+;          | ⌘⇧;                       |
| Kosongkan isi setiap sel terpilih                                                               | Backspace atau Delete | ⌫ atau ⌦                  |

JumlahOtomatis hanya ada di macOS. Tekan ⌘⇧T.

### Format

| Tindakan                                                      | Windows / Linux | macOS |
| ------------------------------------------------------------- | --------------- | ----- |
| Dialog Format Sel                                             | Ctrl+1          | ⌘1    |
| Coret (dengan sel terpilih)                                   | Ctrl+5          | ⌘5    |
| Perbesar ukuran font (dengan sel terpilih)                    | Ctrl+Shift+.    | ⌘⇧.   |
| Perkecil ukuran font (dengan sel terpilih)                    | Ctrl+Shift+,    | ⌘⇧,   |
| Format angka: Umum                                            | Ctrl+Shift+`    | ⌘⇧`   |
| Format angka: angka dengan dua desimal                        | Ctrl+Shift+1    | ⌘⇧1   |
| Format angka: waktu `h:mm AM/PM`                              | Ctrl+Shift+2    | ⌘⇧2   |
| Format angka: tanggal `d-mmm-yy`                              | Ctrl+Shift+3    | ⌘⇧3   |
| Format angka: mata uang                                       | Ctrl+Shift+4    | ⌘⇧4   |
| Format angka: persen                                          | Ctrl+Shift+5    | ⌘⇧5   |
| Format angka: ilmiah                                          | Ctrl+Shift+6    | ⌘⇧6   |
| Semua garis batas (dengan sel terpilih)                       | Ctrl+Shift+7    | ⌘⇧7   |
| Tanpa garis batas (dengan sel terpilih)                       | Ctrl+Shift+-    | ⌘⇧-   |
| Batalkan Penyalin Format (hanya saat Penyalin Format menyala) | Esc             | Esc   |

### Sisipkan & hapus

| Tindakan                                                                                    | Windows / Linux                             | macOS                                    |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| Sisipkan sel — baris atau kolom penuh langsung tersisip, selain itu membuka dialog Sisipkan | Ctrl+Shift+=                                | ⌘⇧=                                      |
| Sisipkan sel — tombol `+` pada keypad numerik, dialog yang sama                             | Ctrl bersama tombol `+` pada keypad numerik | ⌘ bersama tombol `+` pada keypad numerik |
| Hapus sel — baris atau kolom penuh langsung terhapus, selain itu membuka dialog Hapus       | Ctrl+-                                      | ⌘-                                       |
| Hapus sel — tombol `-` pada keypad numerik, dialog yang sama                                | Ctrl bersama tombol `-` pada keypad numerik | ⌘ bersama tombol `-` pada keypad numerik |
| Sembunyikan baris terpilih                                                                  | Ctrl+9                                      | ⌘9                                       |
| Tampilkan lagi baris tersembunyi dalam seleksi                                              | Ctrl+Shift+9                                | ⌘⇧9                                      |
| Sembunyikan kolom terpilih                                                                  | Ctrl+0                                      | ⌘0                                       |
| Tampilkan lagi kolom tersembunyi dalam seleksi                                              | Ctrl+Shift+0                                | ⌘⇧0                                      |

### Data & tinjau

| Tindakan                                   | Windows / Linux | macOS |
| ------------------------------------------ | --------------- | ----- |
| Dialog Sisipkan Fungsi                     | Shift+F3        | ⇧F3   |
| Manajer Nama                               | Ctrl+F3         | ⌃F3   |
| Tambah atau sunting catatan pada sel aktif | Shift+F2        | ⇧F2   |
| Sisipkan hipertautan                       | Ctrl+K          | ⌘K    |
| Lacak presedan (sel harus berisi rumus)    | Ctrl+[          | ⌘[    |
| Lacak dependen                             | Ctrl+]          | ⌘]    |
| Kelompokkan baris terpilih                 | Alt+Shift+→     | ⌥⇧→   |
| Keluarkan dari kelompok baris terpilih     | Alt+Shift+←     | ⌥⇧←   |
| Hitung ulang seluruh buku kerja            | F9              | F9    |
| Hitung ulang hanya lembar kerja aktif      | Shift+F9        | ⇧F9   |
| Alihkan filter pada rentang terpilih       |                 | ⌘⇧F   |

Pintasan filter milik Excel, Ctrl+Shift+L, tidak melakukan apa pun di Windows maupun Linux. Tekan ⌘⇧F di macOS, atau pakai perintah filter pada pita di platform mana pun.

### Jendela

| Tindakan                                                          | Windows / Linux     | macOS            |
| ----------------------------------------------------------------- | ------------------- | ---------------- |
| Simpan buku kerja                                                 | Ctrl+S              | ⌘S               |
| Simpan Sebagai                                                    | Ctrl+Shift+S        | ⇧⌘S              |
| Buka buku kerja                                                   | Ctrl+O              | ⌘O               |
| Cetak                                                             | Ctrl+P              | ⌘P               |
| Tutup buku kerja (macOS) / Keluar dari aplikasi (Windows & Linux) | Ctrl+Q              | ⌘W               |
| Buka Panduan Pengguna                                             | F1                  | F1               |
| Perbesar                                                          | Ctrl+=              | ⌘=               |
| Perbesar dengan roda tetikus                                      | Ctrl + roda tetikus | ⌘ + roda tetikus |
| Tampilkan atau sembunyikan rumus di dalam sel                     | Ctrl+`              | ⌘`               |
| Perluas atau ciutkan Bilah Rumus                                  | Ctrl+Shift+U        | ⌘⇧U              |

## Slides

GenOffice Slides adalah editor presentasi bergaya PowerPoint. Sebagian besar tombol melakukan hal yang sama di mana pun Anda berada, tetapi beberapa berubah makna mengikuti fokus — di dalam kotak teks, atau ketika **rel thumbnail**, **kerangka garis besar**, atau **penyusun slide** punya fokus papan tik. Kasus itu ditandai di kolom Tindakan.

### Berkas dan aplikasi

| Tindakan                     | Windows / Linux | macOS |
| ---------------------------- | --------------- | ----- |
| Simpan                       | Ctrl+S          | ⌘S    |
| Simpan sebagai               | Ctrl+Shift+S    | ⇧⌘S   |
| Buka                         | Ctrl+O          | ⌘O    |
| Tutup tab sekarang           | Ctrl+Q          | ⌘W    |
| Cetak                        | Ctrl+P          | ⌘P    |
| Urungkan                     | Ctrl+Z          | ⌘Z    |
| Ulangi                       | Ctrl+Shift+Z    | ⇧⌘Z   |
| Ulangi (pintasan alternatif) | Ctrl+Y          | ⌘Y    |

Menutup tab adalah satu-satunya tempat kedua platform benar-benar terpisah: ⌘W di macOS, sedangkan di Windows dan Linux Ctrl+Q, yang keluar dari seluruh aplikasi, bukan hanya tabnya.

### Penyuntingan

| Tindakan                                           | Windows / Linux | macOS  |
| -------------------------------------------------- | --------------- | ------ |
| Slide baru                                         | Ctrl+M          | ⇧⌘N    |
| Temukan (bukan saat menyunting teks dalam bentuk)  | Ctrl+F          | ⌘F     |
| Anotasi seleksi dengan AI (dengan bentuk terpilih) | Ctrl+K          | ⌘K     |
| Perbesar                                           | Ctrl+=          | ⌘=     |
| Perkecil                                           | Ctrl+-          | ⌘-     |
| Ukuran asli (100%)                                 | Ctrl+0          | ⌘0     |
| Pilih semua                                        | Ctrl+A          | ⌘A     |
| Berganti seleksi bentuk maju / mundur              | Tab / Shift+Tab | ⇥ / ⇧⇥ |

Slide baru adalah pembagian platform yang lain. Tiap platform punya tombolnya sendiri dan tombol platform lain tidak melakukan apa pun: ⇧⌘N di macOS, Ctrl+M di Windows dan Linux. `⌘M` tidak bisa mengerjakan itu di macOS karena itulah tombol Perkecil milik sistem.

Pilih semua mengikuti fokus: dengan rel thumbnail, kerangka garis besar, atau penyusun slide yang fokus, ia memilih setiap slide, dan di tempat lain ia memilih setiap elemen pada slide sekarang. Tab berganti antarbentuk di slide itu, dan hanya ketika kanvas slide itu sendiri yang fokus.

### Format teks

Ini berlaku pada teks bentuk yang terpilih, atau pada paragraf tempat caret berada ketika Anda di dalam kotak teks.

| Tindakan                                     | Windows / Linux | macOS |
| -------------------------------------------- | --------------- | ----- |
| Tebal                                        | Ctrl+B          | ⌘B    |
| Miring                                       | Ctrl+I          | ⌘I    |
| Garis bawah                                  | Ctrl+U          | ⌘U    |
| Rata kiri                                    | Ctrl+L          | ⌘L    |
| Rata tengah                                  | Ctrl+E          | ⌘E    |
| Rata kanan                                   | Ctrl+R          | ⌘R    |
| Rata penuh                                   | Ctrl+J          | ⌘J    |
| Perbesar ukuran font sebesar 1 pt            | Ctrl+]          | ⌘]    |
| Perkecil ukuran font sebesar 1 pt            | Ctrl+[          | ⌘[    |
| Besarkan font ke ukuran berikutnya di tangga | Ctrl+Shift+>    | ⇧⌘>   |
| Perkecil font ke ukuran sebelumnya di tangga | Ctrl+Shift+<    | ⇧⌘<   |

Tombol tangga font itu juga menerima tombol . dan , dengan Shift ditahan, untuk tata letak papan tik yang melaporkan keduanya di tempat tombol tanda baca.

### Papan klip dan objek

| Tindakan                                                 | Windows / Linux    | macOS       |
| -------------------------------------------------------- | ------------------ | ----------- |
| Salin                                                    | Ctrl+C             | ⌘C          |
| Potong                                                   | Ctrl+X             | ⌘X          |
| Tempel                                                   | Ctrl+V             | ⌘V          |
| Tempel format saja                                       | Ctrl+Shift+V       | ⇧⌘V         |
| Salin format saja (dengan bentuk terpilih)               | Ctrl+Shift+C       | ⇧⌘C         |
| Duplikat di tempat (dengan bentuk terpilih)              | Ctrl+D             | ⌘D          |
| Kelompokkan seleksi (dengan bentuk terpilih)             | Ctrl+G             | ⌘G          |
| Keluarkan seleksi dari kelompok (dengan bentuk terpilih) | Ctrl+Shift+G       | ⇧⌘G         |
| Hapus seleksi (dengan bentuk terpilih)                   | Backspace / Delete | ⌫ / Delete  |
| Hapus titik yang terpilih (di Edit Titik)                | Backspace / Delete | ⌫ / Delete  |
| Geser seleksi (dengan bentuk terpilih)                   | Arrow keys         | ↑ ↓ ← →     |
| Geser satu piksel layar                                  | Ctrl+Arrow keys    | ⌘↑ ⌘↓ ⌘← ⌘→ |
| Ubah ukuran terhadap titik tengah                        | Shift+Arrow keys   | ⇧↑ ⇧↓ ⇧← ⇧→ |

Di dalam kotak teks, salin, potong, dan tempel bekerja pada teks, bukan pada bentuknya. Shift bersama tombol panah mengubah ukuran tiap bentuk terhadap titik tengahnya sendiri, tidak menyentuh konektor, dan menggabungkan seleksi banyak menjadi satu langkah urungkan.

### Slides — rel thumbnail, kerangka garis besar, atau penyusun slide yang fokus

Perintah tingkat slide bergaya PowerPoint hanya aktif ketika salah satu dari tiga kerangka itu punya fokus papan tik.

| Tindakan                                    | Windows / Linux                                | macOS                          |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| Slide sebelumnya / berikutnya               | ArrowUp / ArrowDown (also Page Up / Page Down) | ↑ ↓ (also Page Up / Page Down) |
| Slide pertama / terakhir                    | Home / End                                     | Home / End                     |
| Perluas seleksi ke slide pertama / terakhir | Shift+Home / Shift+End                         | ⇧Home / ⇧End                   |
| Pilih semua slide                           | Ctrl+A                                         | ⌘A                             |
| Hapus slide terpilih                        | Backspace / Delete                             | ⌫ / Delete                     |
| Salin slide                                 | Ctrl+C                                         | ⌘C                             |
| Potong slide                                | Ctrl+X                                         | ⌘X                             |

Berpindah antar slide dengan tombol panah adalah pengecualian — itu juga berlaku dari kanvas, tanpa ada yang terpilih. Menghapus slide tidak berlaku ketika alat pena aktif atau di **Tampilan Baca**.

### Di dalam kotak teks

| Tindakan                                                   | Windows / Linux                        | macOS                              |
| ---------------------------------------------------------- | -------------------------------------- | ---------------------------------- |
| Masuk ke penyuntingan teks pada bentuk teks terpilih       | karakter cetak apa pun, Enter, atau F2 | karakter cetak apa pun, ⏎, atau F2 |
| Kunci teks dan pilih ulang bentuknya                       | Esc atau F2                            | Esc atau F2                        |
| Kunci teks dan pilih ulang bentuknya (pintasan alternatif) | Ctrl+⏎                                 | ⌘⏎                                 |
| Lompat ke placeholder berikutnya                           | Ctrl+⏎                                 | ⌃⏎                                 |
| Turunkan / naikkan tingkat daftar                          | Tab / Shift+Tab                        | ⇥ / ⇧⇥                             |
| Sel tabel berikutnya / sebelumnya                          | Tab / Shift+Tab                        | ⇥ / ⇧⇥                             |
| Pemenggalan baris lunak                                    | Shift+⏎                                | ⇧⏎                                 |

Tab berarti dua hal berbeda: sel berikutnya di dalam tabel, dan menurunkan tingkat daftar di dalam bentuk teks.

### Peragaan Slide

| Tindakan                    | Windows / Linux                      | macOS             |
| --------------------------- | ------------------------------------ | ----------------- |
| Mulai dari awal             | F5                                   | F5                |
| Mulai dari slide sekarang   | ⇧F5                                  | ⇧F5 atau ⌘⏎       |
| Slide berikutnya            | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Slide sebelumnya            | Left, Up, Page Up                    | ← ↑ Page Up       |
| Slide pertama               | Home                                 | Home              |
| Slide terakhir              | End                                  | End               |
| Ke slide N                  | ketik N, lalu Enter                  | ketik N, lalu ⏎   |
| Layar hitam                 | B atau .                             | B atau .          |
| Layar putih                 | W atau ,                             | W atau ,          |
| Pulihkan setelah layar mati | tombol apa saja                      | tombol apa saja   |
| Akhiri peragaan             | Esc                                  | Esc               |

Mulai dari slide sekarang memakai ⌘⏎ sekaligus ⇧F5 di macOS. Di Windows tombol yang sama tetap disimpan untuk berpindah antar placeholder.

### Tampilan Baca

| Tindakan                  | Windows / Linux                      | macOS             |
| ------------------------- | ------------------------------------ | ----------------- |
| Slide berikutnya          | Right, Down, Space, Enter, Page Down | → ↓ ␣ ⏎ Page Down |
| Slide sebelumnya          | Left, Up, Page Up                    | ← ↑ Page Up       |
| Keluar dari tampilan baca | Esc                                  | Esc               |

Tekan **Esc** untuk mundur keluar dari apa pun yang sedang Anda masuki — sebuah potongan, bentuk yang sedang Anda gambar, **Edit Titik**, sebuah kelompok, pena, stabilo, atau penghapus, pemutar media, atau **Tampilan Baca** — dan untuk membersihkan seleksi.

Dua yang lain adalah modifier, bukan pintasan: tahan **Shift** saat menggambar untuk mempertahankan proporsi bentuk baru, dan tahan **Shift** saat memutar untuk menempel pada langkah 15°.

## PDF

PDF tidak punya menu sendiri, jadi setiap pintasan di bawah ini mengikuti tab aktif dan hanya berlaku ketika sebuah tab PDF berada di depan.

### Berkas dan Penyuntingan

| Tindakan                 | Windows / Linux | macOS |
| ------------------------ | --------------- | ----- |
| Simpan                   | Ctrl+S          | ⌘S    |
| Urungkan                 | Ctrl+Z          | ⌘Z    |
| Ulangi                   | Ctrl+Shift+Z    | ⇧⌘Z   |
| Temukan (buka pencarian) | Ctrl+F          | ⌘F    |
| Cetak                    | Ctrl+P          | ⌘P    |

Urungkan dan Ulangi melangkah melalui riwayat dokumen; ketika kursor berada di kolom isian, keduanya meninggalkan `⌘Z` untuk kolom itu. `⌘P` membuka dialog cetak dalam aplikasi yang sama dengan tombol Cetak di toolbar.

### Tampilan

| Tindakan            | Windows / Linux     | macOS            |
| ------------------- | ------------------- | ---------------- |
| Perbesar            | Ctrl+=              | ⌘=               |
| Perkecil            | Ctrl+-              | ⌘-               |
| Sesuaikan lebar     | Ctrl+0              | ⌘0               |
| Perbesar (bertahap) | Ctrl + roda tetikus | ⌘ + roda tetikus |

Perbesar juga menerima ⌘+ dan Ctrl++.

### Navigasi Halaman

| Tindakan                   | Windows / Linux     | macOS               |
| -------------------------- | ------------------- | ------------------- |
| Halaman berikutnya         | →                   | →                   |
| Halaman sebelumnya         | ←                   | ←                   |
| Gulir satu layar ke bawah  | PageDown atau Space | PageDown atau Space |
| Gulir satu layar ke atas   | PageUp              | PageUp              |
| Gulir ke bawah             | ↓                   | ↓                   |
| Gulir ke atas              | ↑                   | ↑                   |
| Lompat ke halaman pertama  | Home                | Home                |
| Lompat ke halaman terakhir | End                 | End                 |

Semuanya tanpa modifier, jadi kedua platform membacanya sama. ↓ dan ↑ adalah satu-satunya baris yang berubah mengikuti fokus: di dalam dokumen keduanya menggeser halaman, tetapi dengan fokus di sidebar thumbnail keduanya melangkah satu halaman penuh. Keduanya tidak melakukan apa pun selama Anda mengetik di kolom isian.

### Seleksi dan Penyuntingan

| Tindakan               | Windows / Linux       | macOS                 |
| ---------------------- | --------------------- | --------------------- |
| Hapus anotasi terpilih | Delete atau Backspace | Delete atau Backspace |

Hanya aktif ketika sebuah anotasi, stempel, redaksi, atau gambar terpilih.

### Bilah gambar mini

| Tindakan                       | Windows / Linux       | macOS                 |
| ------------------------------ | --------------------- | --------------------- |
| Memilih halaman satu per satu  | Ctrl + klik           | ⌘ + klik              |
| Memilih rangkaian halaman      | Shift + klik          | ⇧ + klik              |
| Memilih semua halaman          | Ctrl+A                | ⌘A                    |
| Menghapus halaman yang dipilih | Delete atau Backspace | Delete atau Backspace |

Halaman yang dipilih diberi warna. Klik kanan salah satunya, atau gunakan tab Halaman, untuk memutar, menghapus, atau mengekstraknya sekaligus; seret salah satunya untuk memindahkan semuanya. Escape atau klik biasa pada halaman membatalkan pilihan. ⌘A dan Delete berlaku saat bilah sedang fokus.

### Escape dan Dialog

| Tindakan                       | Windows / Linux | macOS  |
| ------------------------------ | --------------- | ------ |
| Batalkan lapisan teratas       | Escape          | Escape |
| Konfirmasi dialog yang terbuka | Enter           | Enter  |

Escape membongkar satu lapisan setiap kali — lebih dulu dialog yang terbuka, lalu munculan AI, draf teks, panel pencarian, dan terakhir seleksi itu sendiri. Dengan kursor di kotak pencarian, Enter dan ⇧Enter melangkah ke kecocokan berikutnya dan sebelumnya, dan Escape menutup panelnya; dengan kursor di catatan teks baru, `⌘⏎` menguncinya.

## Markdown

GenOffice Markdown menyunting Markdown dengan pratinjau langsung di sampingnya.

### Berkas dan tampilan

| Tindakan                   | Windows / Linux    | macOS      |
| -------------------------- | ------------------ | ---------- |
| Simpan                     | Ctrl+S             | ⌘S         |
| Simpan sebagai             | Ctrl+Shift+S       | ⇧⌘S        |
| Cetak                      | Ctrl+P             | ⌘P         |
| Temukan                    | Ctrl+F             | ⌘F         |
| Alihkan sumber / pratinjau | Ctrl+E             | ⌘E         |
| Perbesar                   | Ctrl+= atau Ctrl++ | ⌘= atau ⌘+ |
| Perkecil                   | Ctrl+-             | ⌘-         |
| Ukuran asli (100%)         | Ctrl+0             | ⌘0         |

Perkecil juga menerima ⌘_ dan Ctrl+_. mencubit trackpad, atau menahan ⌘ atau Ctrl lalu menggulir di atas dokumen, juga memperbesar.

### Blok

| Tindakan                                       | Windows / Linux      | macOS |
| ---------------------------------------------- | -------------------- | ----- |
| Duplikat blok terpilih                         | Ctrl+D               | ⌘D    |
| Hapus blok terpilih                            | Ctrl+Shift+Backspace | ⇧⌘⌫   |
| Pindahkan blok terpilih ke atas                | Ctrl+Shift+ArrowUp   | ⇧⌘↑   |
| Pindahkan blok terpilih ke bawah               | Ctrl+Shift+ArrowDown | ⇧⌘↓   |
| Sisipkan tautan pada seleksi                   | Ctrl+K               | ⌘K    |
| Hapus tautannya (tekan lagi saat tautan aktif) | Ctrl+K               | ⌘K    |

### Di dalam blok matematika

Keduanya hanya berlaku selama editor LaTeX mengambang terbuka.

| Tindakan                      | Windows / Linux | macOS |
| ----------------------------- | --------------- | ----- |
| Terapkan rumusnya             | Ctrl+⏎          | ⌘⏎    |
| Tutup editor tanpa menerapkan | Esc             | Esc   |

Menerapkan rumus kosong akan menghapus bloknya. Editor itu juga menutup pada perubahan apa pun pada dokumen, dan mengeklik di luar menutupnya.

## HTML

GenOffice HTML menampilkan editor kode di samping pratinjau langsung. Tombol yang bekerja pada sebuah elemen halaman hanya berlaku ketika pratinjau itu sendiri yang punya fokus papan tik.

### Berkas dan tampilan sumber

| Tindakan                                       | Windows / Linux    | macOS      |
| ---------------------------------------------- | ------------------ | ---------- |
| Simpan                                         | Ctrl+S             | ⌘S         |
| Simpan sebagai                                 | Ctrl+Shift+S       | ⇧⌘S        |
| Ganti tampilan (sunting / terbagi / pratinjau) | Ctrl+\             | ⌘\         |
| Temukan                                        | Ctrl+F             | ⌘F         |
| Perbesar                                       | Ctrl+= atau Ctrl++ | ⌘= atau ⌘+ |
| Perkecil                                       | Ctrl+-             | ⌘-         |
| Ukuran asli (100%)                             | Ctrl+0             | ⌘0         |

Perkecil juga menerima ⌘_ dan Ctrl+_.

### Format dan riwayat

| Tindakan                     | Windows / Linux | macOS |
| ---------------------------- | --------------- | ----- |
| Tebal                        | Ctrl+B          | ⌘B    |
| Miring                       | Ctrl+I          | ⌘I    |
| Urungkan                     | Ctrl+Z          | ⌘Z    |
| Ulangi                       | Ctrl+Shift+Z    | ⇧⌘Z   |
| Ulangi (pintasan alternatif) | Ctrl+Y          | ⌘Y    |

Di dalam editor kode atau kolom isian formulir, tombol penyuntingan milik kolom itu yang mengambil alih.

### Di dalam bingkai pratinjau, dengan sebuah elemen terpilih

| Tindakan                                | Windows / Linux    | macOS      |
| --------------------------------------- | ------------------ | ---------- |
| Tanyakan elemen itu kepada AI           | Ctrl+K             | ⌘K         |
| Hapus elemennya                         | Backspace / Delete | ⌫ / Delete |
| Sepupu sebelumnya                       | ArrowUp            | ↑          |
| Sepupu berikutnya                       | ArrowDown          | ↓          |
| Pilih induknya                          | ArrowLeft          | ←          |
| Pilih anak pertama                      | ArrowRight         | →          |
| Pindahkan elemen ke atas dalam dokumen  | Alt+ArrowUp        | ⌥↑         |
| Pindahkan elemen ke bawah dalam dokumen | Alt+ArrowDown      | ⌥↓         |
| Batalkan seleksi                        | Esc                | Esc        |

Masing-masing butuh sebuah elemen yang sudah terpilih sebelumnya; tanpa ada yang terpilih, tombolnya tidak melakukan apa pun.

### Di dalam bingkai pratinjau, menyunting teks di tempat

| Tindakan                                 | Windows / Linux | macOS |
| ---------------------------------------- | --------------- | ----- |
| Kunci suntingannya                       | Esc             | Esc   |
| Kunci suntingannya (pintasan alternatif) | Ctrl+⏎          | ⌘⏎    |
| Tebalkan rentang terpilih                | Ctrl+B          | ⌘B    |
| Miringkan rentang terpilih               | Ctrl+I          | ⌘I    |

Menekan kunci menyimpan apa yang Anda ketik dan mengembalikan elemennya ke keadaan terpilih.

## HWP/HWPX

Tombol ini berlaku saat tab HWP/HWPX berada di depan dan dokumen memiliki fokus. Kedua kolom menunjukkan cara menekannya di macOS dan Windows / Linux.

### Berkas

| Tindakan        | Windows / Linux      | macOS |
| --------------- | -------------------- | ----- |
| Dokumen baru    | Alt+N                |       |
| Buka…           | Ctrl+O / Alt+O       | ⌘O    |
| Simpan          | Ctrl+S / Alt+S       | ⌘S    |
| Simpan Sebagai… | Ctrl+Shift+S / Alt+V | ⇧⌘S   |
| Cetak           | Ctrl+P / Alt+P       | ⌘P    |

### Sunting

| Tindakan           | Windows / Linux              | macOS       |
| ------------------ | ---------------------------- | ----------- |
| Urungkan           | Ctrl+Z                       | ⌃Z          |
| Ulangi             | Ctrl+Shift+Z                 | ⌃⇧Z         |
| Hapus baris        | Ctrl+Y                       | ⌃Y          |
| Potong             | Ctrl+X                       | ⌃X          |
| Salin              | Ctrl+C                       | ⌃C          |
| Tempel             | Ctrl+V                       | ⌃V          |
| Hapus              | Ctrl+E                       | ⌃E          |
| Pilih Semua        | Ctrl+A                       | ⌃A          |
| Salin format       | Alt+C                        | ⌥C          |
| Temukan            | Ctrl+F / Ctrl+Q, F           | ⌃F / ⌃Q, F  |
| Temukan dan ganti  | Ctrl+H / Ctrl+F2 / Ctrl+Q, A | ⌃F2 / ⌃Q, A |
| Temukan berikutnya | Ctrl+L                       | ⌃L          |
| Temukan mundur     | Ctrl+Q, L                    | ⌃Q, L       |
| Ke                 | Alt+G                        | ⌥G          |
| Bandingkan dokumen | Alt+Shift+V                  | ⌥⇧V         |

### Karakter

| Tindakan                | Windows / Linux      | macOS    |
| ----------------------- | -------------------- | -------- |
| Tebal                   | Ctrl+B / Alt+Shift+B | ⌃B / ⌥⇧B |
| Miring                  | Ctrl+I / Alt+Shift+I | ⌃I / ⌥⇧I |
| Garis bawah             | Ctrl+U / Alt+Shift+U | ⌃U / ⌥⇧U |
| Format normal           | Alt+Shift+C          | ⌥⇧C      |
| Superskrip              | Alt+Shift+P          | ⌥⇧P      |
| Subskrip                | Alt+Shift+S          | ⌥⇧S      |
| Bentuk karakter…        | Alt+L                | ⌥L       |
| Perbesar ukuran font    | Alt+Shift+E / Ctrl+] | ⌥⇧E / ⌃] |
| Perkecil ukuran font    | Alt+Shift+R / Ctrl+[ | ⌥⇧R / ⌃[ |
| Perbesar lebar karakter | Alt+Shift+K          | ⌥⇧K      |
| Perkecil lebar karakter | Alt+Shift+J          | ⌥⇧J      |
| Perbesar spasi karakter | Alt+Shift+W          | ⌥⇧W      |
| Perkecil spasi karakter | Alt+Shift+N          | ⌥⇧N      |
| Teks hitam              | Ctrl+M, K            | ⌃M, K    |
| Teks merah              | Ctrl+M, R            | ⌃M, R    |
| Teks biru               | Ctrl+M, B            | ⌃M, B    |
| Teks plum               | Ctrl+M, D            | ⌃M, D    |
| Teks hijau              | Ctrl+M, G            | ⌃M, G    |
| Teks kuning             | Ctrl+M, Y            | ⌃M, Y    |
| Teks pirus              | Ctrl+M, C            | ⌃M, C    |
| Teks putih              | Ctrl+M, W            | ⌃M, W    |

### Paragraf

| Tindakan                               | Windows / Linux | macOS   |
| -------------------------------------- | --------------- | ------- |
| Rata kiri                              | Ctrl+Shift+L    | ⌃⇧L     |
| Rata tengah                            | Ctrl+Shift+C    | ⌃⇧C     |
| Rata kanan                             | Ctrl+Shift+R    | ⌃⇧R     |
| Rata kanan-kiri                        | Ctrl+Shift+M    | ⌃⇧M     |
| Sebar                                  | Ctrl+Shift+T    | ⌃⇧T     |
| Perbesar spasi baris                   | Alt+Shift+Z     | ⌥⇧Z     |
| Perkecil spasi baris                   | Alt+Shift+A     | ⌥⇧A     |
| Bentuk paragraf…                       | Alt+T           | ⌥T      |
| Gaya…                                  | F6              | F6      |
| Terapkan gaya pertama hingga kesepuluh | Ctrl+1 … Ctrl+0 | ⌃1 … ⌃0 |
| Bentuk penomoran paragraf              | Ctrl+K, N       | ⌃K, N   |

### Sisipkan

| Tindakan                             | Windows / Linux    | macOS       |
| ------------------------------------ | ------------------ | ----------- |
| Sisipkan tabel                       | Ctrl+N, T          | ⌃N, T       |
| Catatan kaki                         | Ctrl+N, N          | ⌃N, N       |
| Catatan akhir                        | Ctrl+N, E          | ⌃N, E       |
| Header                               | Ctrl+N, H          | ⌃N, H       |
| Nomor halaman                        | Ctrl+N, P          | ⌃N, P       |
| Sisipkan gambar                      | Ctrl+N, I          | ⌃N, I       |
| Kotak teks                           | Ctrl+N, B          | ⌃N, B       |
| Persamaan                            | Ctrl+N, M          | ⌃N, M       |
| Sisipkan keterangan                  | Ctrl+N, C          | ⌃N, C       |
| Hipertautan                          | Ctrl+K, H          | ⌃K, H       |
| Penanda                              | Ctrl+K, B          | ⌃K, B       |
| Sisipkan field                       | Ctrl+K, E          | ⌃K, E       |
| Teks tanggal/waktu                   | Ctrl+K, D          | ⌃K, D       |
| Sunting objek, field, atau tabel/sel | Ctrl+N, K          | ⌃N, K       |
| Simbol                               | Ctrl+F10 / Alt+F10 | ⌃F10 / ⌥F10 |

### Tabel

| Tindakan           | Windows / Linux        | macOS        |
| ------------------ | ---------------------- | ------------ |
| Tambah baris/kolom | Alt+Enter / Alt+Insert | ⌥⏎ / ⌥Insert |
| Hapus baris/kolom  | Alt+Delete             | ⌥⌫           |
| Pisahkan sel       | F5 → S                 | F5 → S       |
| Gabungkan sel      | F5 → M                 | F5 → M       |
| Jumlah blok        | F5 → Ctrl+Shift+S      | F5 → ⇧⌘S     |
| Rata-rata blok     | F5 → Ctrl+Shift+A      | F5 → ⌃⇧A     |
| Produk blok        | F5 → Ctrl+Shift+P      | F5 → ⌃⇧P     |
| Pisahkan tabel     | Ctrl+N, A              | ⌃N, A        |
| Gabungkan tabel    | Ctrl+N, Z              | ⌃N, Z        |
| Rumus perhitungan  | Ctrl+N, F              | ⌃N, F        |

### Perhitungan tabel

Hanya berlaku saat kursor berada di sel tabel yang kosong. Ada tombol terpisah untuk menghitung dari sel di kiri dan dari sel di atas.

| Tindakan       | Windows / Linux | macOS |
| -------------- | --------------- | ----- |
| Jumlah kiri    | Ctrl+Shift+H    | ⇧⌘H   |
| Jumlah atas    | Ctrl+Shift+V    | ⌃⇧V   |
| Rata-rata kiri | Ctrl+Shift+J    | ⌃⇧J   |
| Rata-rata atas | Ctrl+Shift+B    | ⌃⇧B   |
| Produk kiri    | Ctrl+Shift+K    | ⌃⇧K   |
| Produk atas    | Ctrl+Shift+N    | ⌃⇧N   |

### Halaman

| Tindakan                 | Windows / Linux  | macOS |
| ------------------------ | ---------------- | ----- |
| Pengaturan halaman       | F7               | F7    |
| Pemisah halaman          | Ctrl+Enter       | ⌃⏎    |
| Pemisah kolom            | Ctrl+Shift+Enter | ⌃⇧⏎   |
| Pemisah pengaturan kolom | Ctrl+Alt+Enter   | ⌃⌥⏎   |
| Pengaturan bagian        | Ctrl+N, G        | ⌃N, G |
| Sembunyikan halaman      | Ctrl+N, S        | ⌃N, S |

### Tampilan

| Tindakan                                  | Windows / Linux | macOS |
| ----------------------------------------- | --------------- | ----- |
| Perbesar                                  | Ctrl+=          | ⌃=    |
| Perkecil                                  | Ctrl+-          | ⌃-    |
| Sesuaikan ke halaman                      | Ctrl+G, P       | ⌃G, P |
| Sesuaikan ke lebar                        | Ctrl+G, W       | ⌃G, W |
| Perbesar ke 100%                          | Ctrl+G, Q       | ⌃G, Q |
| Rangkai atau bentangkan kotak alat        | Ctrl+F1         | ⌃F1   |
| Tampilkan atau sembunyikan tanda paragraf | Ctrl+G, T       | ⌃G, T |
| Tampilkan atau sembunyikan tanda kontrol  | Ctrl+G, C       | ⌃G, C |
| Ke tab Beranda (di luar tabel)            | Ctrl+Shift+H    | ⇧⌘H   |

Tombol yang ditulis `Ctrl+N,T` berarti tekan Ctrl+N, lepaskan, lalu tekan T. `F5 → S` berarti pilih blok sel dengan F5 lalu tekan S. `Ctrl+1 … Ctrl+0` adalah gaya pertama hingga kesepuluh dokumen; `Ctrl+Alt+1 … Ctrl+Alt+0` menerapkan gaya yang sama. Saat blok sel dipilih, `Ctrl+Shift+S` (di macOS `⇧⌘S`) adalah jumlah blok; di luar itu tombol ini menyimpan sebagai.
