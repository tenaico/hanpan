# Lukisan AI

Lukisan AI ialah tab untuk model 3D dan lukisan yang ringkas. Buka lukisan yang dihantar kepada anda dan semak ukurannya, bina model kecil sendiri atau dengan meminta AI, dan masukkan helaian dimensi ke dalam dokumen Hangul atau Word. Lukisan disimpan sebagai fail .ttukcad, dan setiap panjang diukur dalam milimeter.

## Membuka lukisan

- Untuk lukisan baharu, pergi ke laman utama, buka **All apps** dan tekan **Lukisan AI**. Tab bermula sebagai **Lukisan tanpa tajuk**.
- Untuk membuka fail, gunakan **Fail › Buka…** (Ctrl+O) atau seret fail ke tetingkap. Lukisan AI membuka fail .ttukcad, DXF, DWG, STL, OBJ, 3MF, GLB dan PLY. DWG dibuka daripada format AutoCAD R14 hingga format 2018.
- Fail yang bukan .ttukcad dibuka sebagai lukisan baharu tanpa tajuk yang dinamakan mengikut fail itu. Fail asal tidak pernah diubah: menyimpan sentiasa meminta fail .ttukcad yang baharu.
- Fail STEP, IGES dan BREP ialah fail 3D daripada program CAD profesional dan tidak boleh dibaca. Lukisan AI memaparkan **Cara membuka fail ini**: minta pengirimnya menghantar STL (model 3D).
- Fail melebihi 100 MB, atau model dengan lebih daripada 2 juta segi tiga, tidak akan dibuka.

## Meletakkan bentuk

- **Utama › Letak bentuk** memuatkan empat bentuk yang paling kerap digunakan; **Lagi** membuka galeri kesemua 15 bentuk: kotak, silinder, sfera, kon, piramid, baji, hemisfera, tiub, donat, prisma segi tiga, prisma heksagon, kotak bucu bulat, prisma bintang, bumbung dan teks.
- Bentuk baharu muncul di tengah papan kerja, iaitu lantai tempat model berdiri. Klik sesuatu bentuk untuk memilihnya; Shift-klik atau Ctrl-klik menambah bentuk lain ke dalam pilihan.
- **Paparan › Pemegang** menentukan fungsi pemegang pada bentuk yang dipilih: **Alih**, **Putar** atau **Saiz**. Seretan melekap pada 1 mm dan 15°; tahan Alt semasa menyeret untuk mematikan lekapan.
- Panel **Sifat** di sebelah kanan menunjukkan bentuk yang dipilih: nama, jenis (pepejal atau lubang), saiz, kedudukan (mm), putaran (°) dan warna. Taip nombor untuk mengubahnya. **Sembunyi** dan **Kunci** mengelakkan bentuk itu daripada mengganggu.
- **Paparan › Pandangan** memusingkan kamera ke **Atas**, **Depan** atau **Sisi**, dan **Tunjuk semua** memuatkan seluruh model dalam paparan. Seret di dalam paparan untuk memusingkannya, dan gunakan roda tetikus untuk zum.
- Baris status di bawah menunjukkan saiz papan kerja, lekapan dan grid, serta lebar × dalam × tinggi bentuk yang dipilih.

## Lubang, kumpulan dan penjajaran

- Lubang ialah bentuk yang memotong. Pilih bentuk dan tekan **Lubang** (atau H) untuk menjadikannya lubang; tekan sekali lagi untuk menjadikannya pepejal semula.
- Lubang hanya memotong di dalam kumpulan. Pilih lubang itu dan bentuk pepejal yang perlu dipotongnya, kemudian tekan **Kumpulkan** (Ctrl+G): kumpulan itu ialah bentuk pepejal tolak lubang. **Leraikan** (Ctrl+Shift+G) memisahkannya semula.
- **Jajarkan** menyusun bentuk yang dipilih sebaris dengan bentuk yang anda pilih dahulu: kiri, tengah atau kanan; depan, tengah atau belakang; bawah, tengah atau atas.
- Contohnya, silinder bergaris pusat 80 mm dan silinder lubang bergaris pusat 68 mm yang dinaikkan 5 mm, kedua-duanya dipilih lalu dikumpulkan, menjadi cawan dengan lantai setebal 5 mm.

## Lakaran dan teks

- **Lukis sendiri** melukis garis bentuk anda sendiri. Klik pada papan kerja untuk meletakkan sekurang-kurangnya 3 titik; **Buat asal titik** membatalkan titik terakhir.
- Masukkan **Tinggi (mm)** dan tekan **Tutup bentuk**: garis bentuk itu naik menjadi bentuk pepejal. **Batal** keluar tanpa membuat apa-apa.
- Garisan yang bersilang ditolak. Buat asal titik sehingga garisan tidak lagi bersilang.
- **Teks** meminta perkataan yang hendak diletakkan dan menukarnya menjadi huruf pepejal, menggunakan fon yang disertakan dengan GenOffice.

## Mengubah garisan dan teks lukisan yang anda terima

- Buka DXF atau DWG dan tekan **Ubah garisan**. Klik garisan, bulatan, lengkok atau teks pada lukisan untuk memilihnya (ia bertukar kepada warna serlahan); Shift-klik memilih lebih banyak.
- Dalam bar di bawah, **Padam** (atau kekunci Delete) membuang pilihan, **Alih** menganjaknya mengikut X dan Y yang anda masukkan dalam mm, dan apabila satu teks dipilih, taip perkataan baharu dan tekan **Tukar teks**. Esc mengosongkan pilihan; tekan sekali lagi untuk menamatkan Ubah garisan.
- Setiap perubahan dikembalikan dengan satu **Buat asal** (Ctrl+Z). Lukisan yang dikunci tidak diubah.
- Anda juga boleh meminta pembantu AI, contohnya: "Padam semua pada lapisan dimensi", "Tukar teks 'Bilik mesyuarat' kepada 'Bilik mesyuarat besar'", "Alihkan lapisan pintu 500 mm ke kanan".
- Hasilnya disimpan sebagai .ttukcad. Fail DXF atau DWG asal tidak pernah diubah. Untuk menghantarnya semula, buat fail baharu dengan **Eksport ke DXF** atau **Eksport ke DWG**.

## Mengukur dan helaian dimensi

- **Ukur** menunjukkan jarak antara dua titik yang anda klik, panjang sesuatu garisan atau garis pusat sesuatu bulatan. Titik melekap pada bucu, hujung garisan dan pusat bulatan. Esc mengosongkan bacaan.
- **Helaian dimensi** melukis model dari depan, atas dan sisi pada sehelai kertas A4, bersama lebar, dalam dan tinggi keseluruhan, skala yang sesuai (1:1, 1:2, 1:5, 1:10 …) dan blok tajuk dengan nama, tarikh dan skala. Lukisan yang berasal daripada fail DXF hanya menunjukkan pandangan dari atas.
- Dalam helaian itu, **Salin gambar** meletakkannya pada papan keratan. Tampalkannya ke dalam tab Hangul, Word atau PowerPoint.
- **Hantar ke Hangul** membuka dokumen Hangul baharu yang mengandungi helaian itu dan jadual bentuk beserta ukurannya. Apabila **Ciri dokumen Korea** dimatikan dalam Tetapan, butang itu tertulis **Hantar ke Word** dan membuat dokumen Word.

## Pembantu AI

- Panel AI di sebelah lukisan boleh meletakkan bentuk, mengubah saiz dan kedudukan, membuat lubang, mengumpulkan, menjajarkan, menetapkan saiz papan kerja dan meringkaskan model. Beberapa permintaan untuk dicuba:
  - "Buat bekas pensel lebar 80 mm dan tinggi 100 mm, berongga di dalam dengan garis pusat 68 mm"
  - "Jadikan papan kerja sebuah bilik 5 × 4 m dan letakkan empat meja"
  - "Jajarkan bentuk yang dipilih ke kiri"
- Semua yang diubah oleh satu permintaan dikembalikan dengan satu **Buat asal** (Ctrl+Z), tidak kira berapa banyak bentuk yang terlibat.
- AI menerima permintaan anda dan ringkasan model (nama, jenis, saiz dan kedudukan setiap bentuk). AI tidak boleh menyimpan, membuka, mengeksport atau menghantar; semua itu kekal di tangan anda.
- Untuk memberi AI lembaran spesifikasi atau lakaran, lampirkannya dengan butang klip kertas di bawah ruang input, seret ke panel atau tampal gambar (Ctrl+V). AI membacanya dan membina mengikutnya; fail tidak pernah masuk ke dalam lukisan, dan permintaan itu masih satu langkah buat asal.

## Menyimpan dan memulihkan

- **Simpan** (Ctrl+S) menulis fail .ttukcad. Lukisan AI hanya menyimpan dalam format ini; **Simpan Sebagai…** (Ctrl+Shift+S) memilih nama atau tempat baharu.
- **Simpan automatik** di bahagian atas menyimpan setiap 30 saat dan apabila tetingkap tidak lagi aktif, sebaik sahaja lukisan itu mempunyai failnya sendiri.
- Jika GenOffice tertutup secara tiba-tiba, permulaan seterusnya menyenaraikan lukisan itu di bawah **Dokumen dengan kandungan yang belum disimpan**. Tekan **Pulihkan** untuk mendapatkannya semula.

## Mengeksport

- **Fail › Eksport ke STL** dan **Eksport ke OBJ** menulis model untuk pencetak 3D atau program lain. **Eksport ke gambar (PNG)** menyimpan apa yang ditunjukkan paparan, dengan latar belakang cerah.
- **Eksport ke DXF** dan **Eksport ke DWG** menulis lukisan sebagai fail baharu dalam format AutoCAD 2018 (mm): garisan, bulatan, lengkok, teks, lapisan dan warna seperti asal, dan pepejal sebagai garis luarnya dilihat dari atas, pada lapisan AI-DRAWING.
- Eksport tidak pernah menggantikan fail asal lukisan itu.

## Pintasan papan kekunci

| Kekunci                  | Fungsinya                      |
| ------------------------ | ------------------------------ |
| Ctrl+Z                   | Buat asal                      |
| Ctrl+Y atau Ctrl+Shift+Z | Buat semula                    |
| Ctrl+S                   | Simpan                         |
| Ctrl+A                   | Pilih semua                    |
| Delete                   | Padam                          |
| Ctrl+D                   | Salin                          |
| Ctrl+G                   | Kumpulkan                      |
| Ctrl+Shift+G             | Leraikan                       |
| H                        | Lubang ↔ pepejal               |
| Kekunci anak panah       | Alih 1 mm (dengan Shift 10 mm) |
| Alt semasa menyeret      | Matikan lekapan                |

**Bantuan › Pintasan** menunjukkan senarai yang sama di dalam tab.

## Perkara yang tidak boleh dilakukan

- Membuka fail STEP, IGES atau BREP secara terus. Minta STL sebagai gantinya.
- Menulis ganti fail DXF atau DWG yang anda terima: apa yang tidak dibaca GenOffice (lorekan, atribut blok, susun atur) akan hilang. Sebaliknya, eksport DXF atau DWG baharu.
- Kekangan, sejarah reka bentuk atau himpunan seperti dalam program CAD profesional. Setiap bentuk ditetapkan oleh nombornya sendiri.
- Mencetak. Hantar helaian dimensi ke dokumen Hangul atau Word dan cetak dari sana.
