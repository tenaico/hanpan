# Gambar AI

Gambar AI adalah tab untuk model 3D dan gambar teknik sederhana. Buka gambar kiriman orang lain lalu periksa ukurannya, buat model kecil sendiri atau dengan meminta AI, dan masukkan lembar dimensi ke dokumen Hangul atau Word. Gambar disimpan sebagai file .ttukcad, dan semua panjang dalam milimeter.

## Membuka gambar

- Untuk gambar baru, di beranda buka **All apps** lalu tekan **Gambar AI**. Tab dimulai dengan nama **Gambar tanpa judul**.
- Untuk membuka file, gunakan **File › Buka…** (Ctrl+O) atau seret file ke jendela. Gambar AI membuka file .ttukcad, DXF, DWG, STL, OBJ, 3MF, GLB, dan PLY. DWG bisa dibuka dari format AutoCAD R14 sampai format 2018.
- File yang bukan .ttukcad dibuka sebagai gambar baru tanpa judul yang diberi nama sesuai file itu. File aslinya tidak pernah diubah: saat menyimpan, Anda selalu diminta membuat file .ttukcad baru.
- File STEP, IGES, dan BREP adalah file 3D dari program CAD profesional dan tidak bisa dibaca. Sebagai gantinya Gambar AI menampilkan **Cara membuka file ini**: mintalah pengirimnya mengirim STL (model 3D).
- File di atas 100 MB, atau model dengan lebih dari 2 juta segitiga, tidak bisa dibuka.

## Menaruh bentuk

- **Beranda › Taruh bentuk** berisi empat bentuk yang paling sering dipakai; **Lainnya** membuka galeri ke-15 bentuk: kotak, silinder, bola, kerucut, limas, baji, setengah bola, pipa, donat, prisma segitiga, prisma segi enam, kotak bersudut bulat, prisma bintang, atap, dan teks.
- Bentuk baru muncul di tengah bidang kerja, yaitu pelat alas tempat model berdiri. Klik sebuah bentuk untuk memilihnya; klik sambil menahan Shift atau Ctrl menambah bentuk lain ke pilihan.
- **Tampilan › Pegangan** menentukan fungsi pegangan pada bentuk yang dipilih: **Pindah**, **Putar**, atau **Ukuran**. Saat diseret, bentuk menempel per 1 mm dan 15°; tahan Alt sambil menyeret untuk mematikan tempelan.
- Panel **Properti** di kanan menampilkan bentuk yang dipilih: nama, jenis (padat atau lubang), ukuran, posisi (mm), putaran (°), dan warna. Ketik angka untuk mengubahnya. **Sembunyikan** dan **Kunci** menyingkirkan bentuk agar tidak mengganggu.
- **Tampilan › Arah pandang** memutar kamera ke **Atas**, **Depan**, atau **Samping**, dan **Tampilkan semua** memuat seluruh model di layar. Seret di area tampilan untuk memutarnya, dan gunakan roda mouse untuk memperbesar atau memperkecil.
- Baris status di bawah menampilkan ukuran bidang kerja, jarak tempel dan kisi, serta lebar × kedalaman × tinggi bentuk yang dipilih.

## Lubang, kelompok, dan perataan

- Lubang adalah bentuk yang memotong. Pilih sebuah bentuk lalu tekan **Lubang** (atau H) untuk menjadikannya lubang; tekan lagi untuk menjadikannya padat kembali.
- Lubang hanya memotong di dalam kelompok. Pilih lubang dan bentuk padat yang harus dipotongnya, lalu tekan **Kelompokkan** (Ctrl+G): kelompok itu adalah bentuk padat dikurangi lubang. **Pisahkan** (Ctrl+Shift+G) membongkarnya lagi.
- **Ratakan** menyejajarkan bentuk yang dipilih dengan bentuk yang Anda pilih pertama: kiri, tengah, atau kanan; depan, tengah, atau belakang; bawah, tengah, atau atas.
- Contohnya, silinder berdiameter 80 mm dan silinder lubang berdiameter 68 mm yang dinaikkan 5 mm, keduanya dipilih lalu dikelompokkan, menjadi cangkir dengan alas setebal 5 mm.

## Gambar sendiri dan teks

- **Gambar sendiri** membuat garis bentuk buatan Anda. Klik di bidang kerja untuk menaruh paling sedikit 3 titik; **Urungkan titik** membatalkan titik terakhir.
- Isi **Tinggi (mm)** lalu tekan **Tutup bentuk**: garis bentuk itu naik menjadi benda padat. **Batal** keluar tanpa membuat apa pun.
- Garis yang saling bersilangan ditolak. Urungkan titik sampai garisnya tidak lagi bersilangan.
- **Teks** menanyakan kata yang ingin ditaruh lalu mengubahnya menjadi huruf padat, dengan font bawaan GenOffice.

## Mengubah garis dan teks gambar yang Anda terima

- Buka DXF atau DWG lalu tekan **Ubah garis**. Klik garis, lingkaran, busur, atau teks pada gambar untuk memilihnya (warnanya berubah menjadi warna sorotan); klik sambil menahan Shift untuk memilih lebih banyak.
- Di bilah bawah, **Hapus** (atau tombol Delete) menghapus pilihan, **Pindahkan** menggesernya sejauh X dan Y yang Anda isi dalam mm, dan jika satu teks dipilih, ketik kata-kata baru lalu tekan **Ganti teks**. Esc membatalkan pilihan; tekan sekali lagi untuk mengakhiri Ubah garis.
- Setiap perubahan kembali dengan satu kali **Urungkan** (Ctrl+Z). Gambar yang dikunci tidak berubah.
- Anda juga bisa meminta asisten AI, misalnya: "Hapus semua yang ada di layer dimensi", "Ganti teks 'Ruang rapat' menjadi 'Ruang rapat besar'", "Geser layer pintu 500 mm ke kanan".
- Hasilnya disimpan sebagai .ttukcad. File DXF atau DWG aslinya tidak pernah diubah.

## Mengukur dan lembar dimensi

- **Ukur** menampilkan jarak antara dua titik yang Anda klik, panjang sebuah garis, atau diameter sebuah lingkaran. Titik menempel ke sudut, ujung garis, dan pusat lingkaran. Esc menghapus hasil ukur.
- **Lembar dimensi** menggambar model dari depan, atas, dan samping di kertas A4, lengkap dengan lebar, kedalaman, dan tinggi keseluruhan, skala yang pas (1:1, 1:2, 1:5, 1:10 …), dan kotak judul berisi nama, tanggal, dan skala. Gambar yang berasal dari file DXF hanya menampilkan pandangan dari atas.
- Di lembar itu, **Salin gambar** menaruhnya di papan klip. Tempelkan ke tab Hangul, Word, atau PowerPoint.
- **Kirim ke Hangul** membuka dokumen Hangul baru berisi lembar itu dan tabel bentuk beserta ukurannya. Jika **Fitur dokumen Korea** dimatikan di Pengaturan, tombolnya bertuliskan **Kirim ke Word** dan membuat dokumen Word.

## Asisten AI

- Panel AI di samping gambar menaruh bentuk, mengubah ukuran dan posisi, membuat lubang, mengelompokkan, meratakan, mengatur ukuran bidang kerja, dan merangkum model. Beberapa permintaan untuk dicoba:
  - "Buat tempat pensil lebar 80 mm dan tinggi 100 mm, bagian dalamnya berlubang dengan diameter 68 mm"
  - "Jadikan bidang kerja sebuah ruangan 5 × 4 m dan taruh empat meja kerja"
  - "Ratakan bentuk yang dipilih ke kiri"
- Semua yang diubah oleh satu permintaan kembali dengan satu kali **Urungkan** (Ctrl+Z), berapa pun banyak bentuk yang tersentuh.
- AI menerima permintaan Anda dan ringkasan model (nama, jenis, ukuran, dan posisi tiap bentuk). AI tidak bisa menyimpan, membuka, mengekspor, atau mengirim; semua itu tetap di tangan Anda.
- Untuk memberi AI lembar spesifikasi atau sketsa, lampirkan dengan tombol penjepit kertas di bawah kolom input, seret ke panel, atau tempel gambar (Ctrl+V). AI membacanya dan membangun sesuai isinya; file tidak pernah masuk ke gambar kerja, dan permintaan itu tetap satu kali urungkan.

## Menyimpan dan memulihkan

- **Simpan** (Ctrl+S) menulis file .ttukcad. Gambar AI hanya menyimpan dalam format ini; **Simpan Sebagai…** (Ctrl+Shift+S) memilih nama atau tempat baru.
- **Simpan otomatis** di bagian atas menyimpan setiap 30 detik dan saat jendela tidak lagi aktif, setelah gambar punya file sendiri.
- Jika GenOffice tertutup tiba-tiba, saat dibuka lagi gambar itu muncul di daftar **Dokumen dengan konten yang belum disimpan**. Tekan **Pulihkan** untuk mengembalikannya.

## Mengekspor

- **File › Ekspor STL** dan **Ekspor OBJ** menulis model untuk printer 3D atau program lain. **Ekspor gambar (PNG)** menyimpan apa yang tampak di layar, dengan latar terang.
- Ekspor tidak pernah menimpa file asal gambar.

## Pintasan keyboard

| Tombol                   | Fungsinya                       |
| ------------------------ | ------------------------------- |
| Ctrl+Z                   | Urungkan                        |
| Ctrl+Y atau Ctrl+Shift+Z | Ulangi                          |
| Ctrl+S                   | Simpan                          |
| Ctrl+A                   | Pilih semua                     |
| Delete                   | Hapus                           |
| Ctrl+D                   | Gandakan                        |
| Ctrl+G                   | Kelompokkan                     |
| Ctrl+Shift+G             | Pisahkan                        |
| H                        | Lubang ↔ padat                  |
| Tombol panah             | Geser 1 mm (dengan Shift 10 mm) |
| Alt sambil menyeret      | Matikan tempelan                |

**Bantuan › Pintasan** menampilkan daftar yang sama di dalam tab.

## Yang tidak bisa dilakukan

- Membuka file STEP, IGES, atau BREP secara langsung. Mintalah STL sebagai gantinya.
- Menyimpan kembali ke DXF atau DWG. Gambar yang sudah diubah disimpan sebagai .ttukcad.
- Batasan, riwayat desain, atau rakitan seperti di program CAD profesional. Setiap bentuk diatur dengan angkanya sendiri.
- Mencetak. Kirim lembar dimensi ke dokumen Hangul atau Word lalu cetak dari sana.
