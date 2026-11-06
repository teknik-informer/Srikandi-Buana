export type InformationSection={id:string;title:string;paragraphs:string[];items?:string[]};
export type InformationPage={title:string;description:string;category:string;topic:string;sections:InformationSection[]};
export const policyVersion='1.1';
export const policyUpdated='2 November 2026';
export const informationPages:Record<string,InformationPage>={
  "privasi": {
    "title": "Kebijakan Privasi",
    "description": "Cara Srikandi Buana mengumpulkan, menggunakan, melindungi, dan menangani permintaan atas data pribadi.",
    "category": "Privasi & penggunaan",
    "sections": [
      {
        "id": "pengelola",
        "title": "Pengelola dan cakupan",
        "paragraphs": [
          "Situs ini dikelola oleh Kelompok Wanita Tani Srikandi Buana di Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung. Kebijakan ini mencakup halaman publik, formulir pesan, serta akun anggota dan pengurus. Kanal komunikasi pengelola tercantum di bagian akhir halaman ini."
        ]
      },
      {
        "id": "data",
        "title": "Data yang diproses",
        "paragraphs": [
          "Data diproses sesuai layanan yang digunakan; mengunjungi halaman publik tidak mewajibkan pembuatan akun."
        ],
        "items": [
          "Formulir: nama, email atau WhatsApp, topik, isi pesan, persetujuan, waktu pengiriman, dan referensi pesan.",
          "Keanggotaan: identitas, alamat, kontak, jabatan organisasi, status verifikasi, persetujuan pendataan, serta riwayat kegiatan yang dicatat pengurus.",
          "Akun: email masuk, nama, hash password, peran, penugasan program, undangan aktivasi, sesi, dan riwayat perubahan akses. Password asli tidak disimpan sebagai teks biasa.",
          "Administrasi: notulen, kehadiran, transaksi dan bukti yang diperlukan dalam pengelolaan kelompok. Data internal tidak otomatis menjadi informasi publik.",
          "Keamanan: hash alamat jaringan untuk pembatasan permintaan, penghitung percobaan, dan waktu akses tertentu. Layanan infrastruktur dapat memproses log teknis tersendiri."
        ]
      },
      {
        "id": "tujuan",
        "title": "Tujuan dan pilihan Anda",
        "paragraphs": [
          "Data formulir digunakan untuk mencatat dan menanggapi keperluan yang Anda kirim. Persetujuan formulir dibatasi pada keperluan tersebut, bukan persetujuan menerima promosi. Anda boleh tidak mengirim formulir, tetapi pengelola tidak dapat menindaklanjuti pesan yang tidak dikirim.",
          "Pendataan keanggotaan dan administrasi mengikuti tujuan yang dijelaskan pengurus serta dasar pemrosesan yang relevan. Izin publikasi foto dipisahkan dari pendataan anggota. Jangan memasukkan NIK, password, kode OTP, informasi kesehatan, atau data sensitif lain ke pesan publik."
        ]
      },
      {
        "id": "akses",
        "title": "Akses dan publikasi",
        "paragraphs": [
          "Akses mengikuti peran: anggota melihat data sendiri; pengurus mengakses bagian sesuai tugas; administrator mengelola akun dan kotak pesan. Dokumen atau catatan internal tidak terbuka hanya karena akun telah dibuat. Kabar dan foto hanya tampil setelah diberi status Terbit oleh pengelola.",
          "Informasi yang sudah diterbitkan dapat dilihat, disalin, atau diindeks pihak lain. Untuk koreksi atau pencabutan foto, sebutkan alamat halaman atau judul materi kepada pengelola."
        ]
      },
      {
        "id": "penyedia",
        "title": "Penyedia layanan dan pemrosesan lintas wilayah",
        "paragraphs": [
          "Situs menggunakan Vercel untuk hosting dan Neon untuk penyimpanan data. Infrastruktur pemrosesan dapat berada di luar Indonesia. Permintaan teknis dan data yang diperlukan dapat diproses penyedia tersebut untuk menjalankan layanan, sesuai pengaturan serta ketentuan penyedianya.",
          "Aplikasi tidak memasang pelacak iklan tambahan. Membuka peta, WhatsApp, email, atau situs lain akan menghubungkan Anda ke layanan tersebut. Baca kebijakan layanan tujuan sebelum memberikan informasi tambahan."
        ]
      },
      {
        "id": "penyimpanan",
        "title": "Penyimpanan dan keamanan",
        "paragraphs": [
          "Data disimpan selama masih dibutuhkan untuk komunikasi, administrasi, pertanggungjawaban, penanganan sengketa, atau kewajiban yang berlaku. Saat ini belum ada penghapusan otomatis berdasarkan periode tetap; peninjauan dan penghapusan dilakukan pengelola.",
          "Pembatasan akses, hash password, token sesi, dan pembatasan percobaan digunakan untuk mengurangi risiko. Tidak ada sistem yang dapat menjamin keamanan mutlak. Penghapusan dari aplikasi tidak berarti seluruh cadangan penyedia infrastruktur langsung terhapus."
        ]
      },
      {
        "id": "hak",
        "title": "Permintaan dan hak data pribadi",
        "paragraphs": [
          "Anda dapat meminta informasi pemrosesan, akses atau salinan data sendiri, koreksi, penarikan persetujuan, serta pengakhiran pemrosesan atau penghapusan sesuai ketentuan yang berlaku. Permintaan dapat memerlukan verifikasi identitas yang proporsional agar data tidak diberikan kepada orang lain.",
          "Kirim permintaan melalui topik Permintaan data pribadi. Jelaskan jenis permintaan dan referensi yang tersedia; jangan mengirim identitas berlebihan. Pengelola akan menjelaskan hasil, kebutuhan verifikasi, atau alasan pembatasan yang relevan. Penarikan persetujuan atau penghapusan dapat memengaruhi layanan yang membutuhkan data tersebut. Kebijakan ini tidak mengurangi hak yang diberikan peraturan perundang-undangan."
        ]
      },
      {
        "id": "perubahan",
        "title": "Pembaruan kebijakan",
        "paragraphs": [
          "Perubahan ditampilkan bersama tanggal dan versi kebijakan. Perubahan tujuan yang memerlukan persetujuan baru tidak diperlakukan sebagai persetujuan otomatis dari kunjungan sebelumnya."
        ]
      }
    ],
    "topic": "Permintaan data pribadi"
  },
  "syarat-ketentuan": {
    "title": "Syarat & Ketentuan",
    "description": "Ketentuan penggunaan informasi, akun, dan layanan komunikasi Srikandi Buana.",
    "category": "Privasi & penggunaan",
    "sections": [
      {
        "id": "cakupan",
        "title": "Ruang lingkup layanan",
        "paragraphs": [
          "Situs menyediakan informasi organisasi, program, kabar, dokumentasi, komunikasi, dan administrasi anggota atau pengurus yang diberi akses. Ketentuan ini berlaku pada penggunaan layanan tersebut. Persetujuan pemrosesan data tetap mengikuti penjelasan dan pilihan pada layanan terkait."
        ]
      },
      {
        "id": "akun",
        "title": "Akun dan kewenangan",
        "paragraphs": [
          "Akun anggota atau pengurus dibuat melalui undangan administrator setelah verifikasi. Pengguna menentukan password sendiri. Jabatan organisasi dan hak akses dapat berbeda; pengangkatan jabatan tidak otomatis memberikan kewenangan sistem."
        ],
        "items": [
          "Gunakan identitas dan kontak yang benar.",
          "Jaga kerahasiaan password serta tautan aktivasi/pemulihan; jangan memakai akun bersama.",
          "Gunakan akses hanya untuk tugas yang diberikan.",
          "Laporkan kehilangan akses atau dugaan penyalahgunaan kepada pengelola.",
          "Administrator dapat mengubah peran atau menonaktifkan akun berdasarkan kebutuhan verifikasi, pergantian tugas, keamanan, atau penghentian keanggotaan."
        ]
      },
      {
        "id": "penggunaan",
        "title": "Penggunaan yang diperbolehkan",
        "paragraphs": [
          "Gunakan situs untuk keperluan yang sah, komunikasi yang relevan, dan administrasi kelompok. Jangan menyebarkan spam, mengunggah berkas berbahaya, menyamar sebagai pihak lain, mengambil data pribadi tanpa izin, mencoba melewati pembatasan akses, atau mengganggu layanan."
        ]
      },
      {
        "id": "informasi",
        "title": "Informasi dan keputusan organisasi",
        "paragraphs": [
          "Rencana program, referensi lembaga, serta kajian usaha bukan jaminan pendanaan, keuntungan, sertifikasi, atau kemitraan. Status rancangan dan verifikasi harus dibaca bersama informasi yang ditampilkan. Keputusan keanggotaan, penugasan, dan kerja sama mengikuti proses organisasi yang berwenang.",
          "Mengirim formulir tidak otomatis menjadikan seseorang anggota, menerima usulan, atau mengikat kontrak. Situs saat ini tidak menyediakan checkout, pembayaran daring, atau transaksi jual beli otomatis. Ketentuan transaksi khusus perlu disepakati tersendiri bila layanan tersebut dikembangkan."
        ]
      },
      {
        "id": "materi",
        "title": "Materi, dokumentasi, dan tautan luar",
        "paragraphs": [
          "Gunakan materi dengan memperhatikan hak cipta, kredit, izin foto, dan pedoman publikasi. Tidak seluruh materi bebas digunakan untuk promosi atau kepentingan komersial. Tautan luar diberikan untuk kemudahan; layanan tujuan memiliki ketentuan sendiri."
        ]
      },
      {
        "id": "layanan",
        "title": "Ketersediaan dan pembatasan yang wajar",
        "paragraphs": [
          "Pemeliharaan, gangguan koneksi, pembatasan keamanan, atau layanan penyedia dapat memengaruhi ketersediaan situs. Pengguna perlu memastikan perubahan penting benar-benar tersimpan dan menjaga salinan dokumen yang menjadi tanggung jawabnya.",
          "Informasi umum di situs tidak menggantikan keputusan organisasi atau pendampingan profesional yang diperlukan untuk suatu tindakan. Ketentuan ini tidak mengecualikan tanggung jawab yang tidak dapat dikecualikan menurut hukum."
        ]
      },
      {
        "id": "penyelesaian",
        "title": "Pengaduan, perubahan, dan penyelesaian",
        "paragraphs": [
          "Sampaikan kekeliruan, kendala akses, atau keberatan melalui kanal pengaduan. Jelaskan kronologi dan bukti seperlunya. Persoalan diupayakan diselesaikan melalui komunikasi dan musyawarah tanpa menghilangkan hak menggunakan mekanisme hukum yang tersedia.",
          "Pembaruan ketentuan akan ditampilkan dengan tanggal serta versi terbaru. Penggunaan situs tunduk pada peraturan yang berlaku di Indonesia."
        ]
      }
    ],
    "topic": "Informasi kelompok"
  },
  "kebijakan-cookie": {
    "title": "Cookie & Penyimpanan Perangkat",
    "description": "Penjelasan penyimpanan sesi masuk dan preferensi tampilan pada perangkat Anda.",
    "category": "Privasi & penggunaan",
    "sections": [
      {
        "id": "fungsi",
        "title": "Penyimpanan yang digunakan",
        "paragraphs": [
          "Aplikasi menggunakan cookie dan penyimpanan lokal untuk sesi akun serta kenyamanan tampilan. Halaman publik dapat dibaca tanpa akun. Saat ini tidak ada cookie analitik atau iklan tambahan yang dipasang aplikasi; karena itu tidak ada pilihan pemasaran yang seolah-olah dapat diaktifkan atau ditolak."
        ]
      },
      {
        "id": "daftar",
        "title": "Jenis, tujuan, dan masa simpan",
        "paragraphs": [],
        "items": [
          "Cookie sesi srikandi_session pada pengembangan atau __Host-srikandi_session pada produksi: mengenali akun yang telah masuk. Berlaku 8 jam, atau sampai 30 hari bila Ingat saya dipilih. Logout, pencabutan sesi, atau penonaktifan akses dapat mengakhiri validitasnya lebih awal.",
          "Cookie sidebar_state: menyimpan pilihan buka/tutup menu dashboard selama paling lama 7 hari.",
          "Penyimpanan lokal sb-theme: menyimpan pilihan tema dashboard pada browser, tanpa tanggal kedaluwarsa otomatis; tersimpan sampai diubah atau data situs dihapus. Aplikasi web juga menyimpan halaman pemulihan koneksi dan ikon publik melalui service worker. Cache tersebut tidak memuat data anggota, administrasi, akun, API, atau berkas privat. Cache aplikasi versi lama dibersihkan ketika versi baru diaktifkan."
        ]
      },
      {
        "id": "kendali",
        "title": "Mengendalikan penyimpanan",
        "paragraphs": [
          "Untuk mengakhiri sesi akun, gunakan Keluar. Untuk menghapus preferensi atau seluruh data situs, gunakan pengaturan privasi browser. Memblokir seluruh cookie dapat membuat login tidak berfungsi. Menghapus data browser tidak otomatis menghapus catatan yang tersimpan di server.",
          "Situs tidak menyediakan tombol palsu untuk menonaktifkan cookie sesi sambil mempertahankan login. Pembatasan penyimpanan melalui pengaturan browser berlaku pada perangkat dan browser tersebut."
        ]
      },
      {
        "id": "pihak-lain",
        "title": "Layanan pihak lain dan perubahan",
        "paragraphs": [
          "Penyedia hosting dapat menggunakan mekanisme teknis tersendiri untuk keamanan atau penyaluran layanan. Peta, email, serta WhatsApp yang dibuka dari tautan menggunakan ketentuan layanan tujuan.",
          "Jika aplikasi menambahkan analitik atau penyimpanan opsional, penjelasan dan kontrol yang relevan perlu diperbarui sebelum fitur tersebut diaktifkan."
        ]
      }
    ],
    "topic": "Informasi kelompok"
  },
  "kebijakan-publikasi": {
    "title": "Publikasi & Hak Cipta",
    "description": "Pedoman penerbitan informasi, penggunaan foto, kredit, dan permintaan koreksi.",
    "category": "Tata kelola informasi",
    "sections": [
      {
        "id": "penerbitan",
        "title": "Kabar dan dokumentasi resmi",
        "paragraphs": [
          "Kabar serta galeri ditampilkan setelah pengelola memilih status Terbit. Catatan kegiatan, notulen, daftar hadir, dan dokumen privat tidak otomatis menjadi publikasi. Materi berstatus draf bukan pengumuman resmi."
        ]
      },
      {
        "id": "akurasi",
        "title": "Akurasi dan transparansi",
        "paragraphs": [
          "Pengelola perlu memeriksa nama, tanggal, lokasi, sumber, serta status informasi sebelum menerbitkan. Rancangan, ilustrasi, rencana penjajakan, dan fakta kegiatan harus dibedakan. Penyebutan lembaga tidak boleh diperlakukan sebagai bukti kerja sama tanpa dasar yang memadai."
        ]
      },
      {
        "id": "izin",
        "title": "Foto dan data pribadi",
        "paragraphs": [
          "Pastikan ada izin yang sesuai sebelum menerbitkan foto, cerita, atau data orang lain. Hindari nomor identitas, kontak pribadi, alamat rinci, informasi keuangan pribadi, serta dokumen internal yang tidak perlu ditampilkan. Permintaan penarikan izin atau keberatan atas foto dapat disampaikan melalui formulir pengaduan."
        ]
      },
      {
        "id": "hak-cipta",
        "title": "Hak cipta dan penggunaan ulang",
        "paragraphs": [
          "Hak materi mengikuti pencipta atau pemegang hak masing-masing. Atribusi tidak dengan sendirinya menggantikan izin yang diperlukan. Mengutip informasi seperlunya perlu mempertahankan konteks serta mencantumkan sumber. Penggunaan logo, foto orang, atau materi untuk promosi/komersial perlu persetujuan pemegang hak yang relevan."
        ]
      },
      {
        "id": "koreksi",
        "title": "Koreksi dan peninjauan materi",
        "paragraphs": [
          "Untuk mengoreksi informasi atau mengajukan keberatan hak cipta, sertakan URL, bagian yang dipersoalkan, alasan, dan keterangan pendukung yang Anda kuasai secara sah. Pengelola meninjau permintaan dan dapat memperbaiki, menambahkan klarifikasi, membatasi, atau menarik materi sesuai hasil pemeriksaan.",
          "Jangan mengirim salinan dokumen sensitif yang tidak diperlukan. Simpan referensi pesan agar komunikasi lanjutan dapat dicocokkan."
        ]
      }
    ],
    "topic": "Koreksi informasi"
  },
  "pedoman-komunitas": {
    "title": "Pedoman Komunitas",
    "description": "Prinsip komunikasi dan penggunaan ruang digital Srikandi Buana.",
    "category": "Tata kelola informasi",
    "sections": [
      {
        "id": "nilai",
        "title": "Saling menghormati",
        "paragraphs": [
          "Gunakan bahasa yang sopan, relevan, dan menghargai perbedaan. Utamakan musyawarah, tanggung jawab, serta keselamatan anggota. Pedoman berlaku untuk pesan, materi yang dikirim, dan aktivitas pada ruang kerja yang tersedia."
        ]
      },
      {
        "id": "larangan",
        "title": "Konten dan perilaku yang tidak diterima",
        "paragraphs": [],
        "items": [
          "Ancaman, pelecehan, kebencian, atau penyebaran data pribadi tanpa izin.",
          "Penipuan, penyamaran, informasi yang sengaja menyesatkan, dan klaim kemitraan palsu.",
          "Spam, promosi tidak relevan, berkas berbahaya, dan permintaan password atau OTP.",
          "Mengambil atau membagikan informasi internal di luar kewenangan."
        ]
      },
      {
        "id": "tindakan",
        "title": "Penanganan pelanggaran",
        "paragraphs": [
          "Pengelola dapat meminta klarifikasi, menolak penerbitan, membatasi materi, atau menonaktifkan akses yang berisiko. Tindakan disesuaikan dengan konteks dan kewenangan organisasi. Pengguna dapat menyampaikan keberatan melalui kanal pengaduan."
        ]
      },
      {
        "id": "laporan",
        "title": "Melaporkan masalah",
        "paragraphs": [
          "Laporkan kejadian dengan waktu, URL atau referensi, dan uraian yang jelas. Hindari menyebarkan ulang materi yang merugikan. Situs ini bukan layanan tanggap darurat; gunakan layanan berwenang bila ada bahaya langsung."
        ]
      }
    ],
    "topic": "Pengaduan"
  },
  "pengaduan": {
    "title": "Pengaduan & Pelaporan",
    "description": "Sampaikan keluhan layanan, dugaan penyalahgunaan, atau keberatan atas informasi.",
    "category": "Layanan & bantuan",
    "sections": [
      {
        "id": "kanal",
        "title": "Kanal pengaduan",
        "paragraphs": [
          "Gunakan formulir kontak dengan topik Pengaduan, Koreksi informasi, Laporan keamanan, atau Bantuan aksesibilitas sesuai kebutuhan. Pesan tersimpan di kotak pesan administrator dan memperoleh referensi setelah berhasil dikirim."
        ]
      },
      {
        "id": "isi",
        "title": "Informasi yang membantu penanganan",
        "paragraphs": [],
        "items": [
          "Nama serta kontak yang dapat dihubungi.",
          "Kronologi, waktu kejadian, dan halaman atau fitur terkait.",
          "Dampak yang dialami dan penyelesaian yang diharapkan.",
          "Nomor referensi pesan sebelumnya, bila ada. Jangan sertakan password, OTP, token aktivasi, atau data pihak lain yang tidak diperlukan."
        ]
      },
      {
        "id": "proses",
        "title": "Proses penanganan",
        "paragraphs": [
          "Administrator membaca dan meninjau laporan, lalu dapat meminta klarifikasi, meneruskan persoalan kepada pengurus berwenang, atau memberi tanggapan melalui kontak yang Anda sampaikan. Status internal pesan membantu tindak lanjut, tetapi belum tersedia pelacakan tiket publik otomatis.",
          "Simpan referensi yang muncul setelah pengiriman. Referensi adalah penanda pesan, bukan bukti bahwa laporan sudah selesai ditangani. Waktu penanganan bergantung pada kebutuhan verifikasi dan ketentuan yang berlaku; situs tidak mengklaim layanan respons 24 jam."
        ]
      },
      {
        "id": "keamanan",
        "title": "Pelaporan keamanan yang bertanggung jawab",
        "paragraphs": [
          "Jika menemukan dugaan celah, cukup jelaskan lokasi dan langkah pengamatan minimal. Jangan mengakses data orang lain, mengubah catatan, mengganggu layanan, atau memublikasikan data yang terbuka. Pengelola dapat menyiapkan jalur komunikasi lanjutan bila bukti sensitif diperlukan. Tidak ada program imbalan otomatis yang dijanjikan."
        ]
      },
      {
        "id": "keberatan",
        "title": "Kerahasiaan dan keberatan",
        "paragraphs": [
          "Laporan digunakan untuk penanganan masalah dan hanya dibagikan kepada pihak yang perlu menanganinya sesuai kewenangan atau ketentuan yang berlaku. Pengaduan tidak otomatis ditampilkan ke publik. Jika tanggapan belum menjawab persoalan, kirim klarifikasi dengan referensi pesan terdahulu."
        ]
      }
    ],
    "topic": "Pengaduan"
  },
  "hak-data-pribadi": {
    "title": "Permintaan Data Pribadi",
    "description": "Ajukan akses, koreksi, penarikan persetujuan, atau penghapusan data Anda.",
    "category": "Privasi & penggunaan",
    "sections": [
      {
        "id": "jenis",
        "title": "Jenis permintaan",
        "paragraphs": [
          "Pilih topik Permintaan data pribadi pada formulir kontak. Jelaskan apakah Anda memerlukan akses atau salinan data sendiri, perbaikan informasi, penarikan persetujuan, atau penghentian pemrosesan/penghapusan sesuai ketentuan yang berlaku."
        ]
      },
      {
        "id": "langkah",
        "title": "Langkah pengajuan",
        "paragraphs": [],
        "items": [
          "Cantumkan nama dan kontak yang sebelumnya digunakan, bila masih dapat diakses.",
          "Jelaskan data atau layanan terkait dan jenis permintaan.",
          "Sertakan referensi pesan atau URL bila tersedia.",
          "Kirim formulir dan simpan referensi penerimaan.",
          "Tanggapi permintaan verifikasi seperlunya melalui komunikasi dengan pengelola."
        ]
      },
      {
        "id": "verifikasi",
        "title": "Verifikasi yang proporsional",
        "paragraphs": [
          "Pengelola perlu memastikan permintaan benar-benar berasal dari pemilik data atau pihak yang sah mewakilinya. Jangan langsung mengirim foto KTP, NIK, password, atau dokumen sensitif melalui pesan awal. Pengelola akan menjelaskan jika konfirmasi tambahan diperlukan."
        ]
      },
      {
        "id": "hasil",
        "title": "Penanganan dan konsekuensi",
        "paragraphs": [
          "Permintaan ditinjau administrator; layanan belum menyediakan penghapusan akun mandiri atau unduhan otomatis seluruh data pribadi. Data terkait pertanggungjawaban, hak pihak lain, atau kewajiban yang berlaku dapat memerlukan pembatasan atau masa simpan lanjutan yang dijelaskan kepada pemohon.",
          "Penghapusan atau penarikan persetujuan dapat memengaruhi akses akun maupun layanan yang memerlukan data tersebut. Kebijakan internal tidak menghapus hak pemohon berdasarkan ketentuan hukum yang berlaku."
        ]
      }
    ],
    "topic": "Permintaan data pribadi"
  },
  "aksesibilitas": {
    "title": "Aksesibilitas",
    "description": "Dukungan agar informasi dan layanan dapat digunakan dengan lebih nyaman.",
    "category": "Layanan & bantuan",
    "sections": [
      {
        "id": "dukungan",
        "title": "Fitur yang tersedia",
        "paragraphs": [
          "Situs menyediakan struktur judul, label formulir, tautan langsung ke isi, fokus keyboard, navigasi ponsel, dan penjelasan saat formulir gagal dikirim. Menu dan dialog dapat digunakan melalui keyboard; preferensi pengurangan gerakan diperhatikan pada tombol kembali ke atas.",
          "Halaman ini menjelaskan dukungan yang tersedia, bukan pernyataan sertifikasi atau klaim bahwa seluruh halaman sudah memenuhi suatu tingkat standar tertentu."
        ]
      },
      {
        "id": "cara",
        "title": "Cara menggunakan situs",
        "paragraphs": [],
        "items": [
          "Gunakan Tab dan Shift+Tab untuk berpindah kontrol, Enter untuk membuka pilihan, serta Esc untuk menutup dialog/menu yang mendukungnya.",
          "Gunakan pembesaran teks atau zoom browser sesuai kebutuhan.",
          "Gunakan tautan Langsung ke isi yang muncul saat mendapat fokus keyboard.",
          "Jika fitur berbagi tidak didukung perangkat, salin alamat halaman atau gunakan tombol cetak."
        ]
      },
      {
        "id": "batas",
        "title": "Bagian yang dapat memiliki keterbatasan",
        "paragraphs": [
          "Dokumen unggahan dan materi dari pihak lain dapat memiliki struktur atau kualitas aksesibilitas yang berbeda. Pengelola dapat membantu menjelaskan informasi atau mempertimbangkan format alternatif yang tersedia. Koneksi lambat dan pengaturan browser tertentu juga dapat memengaruhi pengalaman penggunaan."
        ]
      },
      {
        "id": "masukan",
        "title": "Laporkan hambatan akses",
        "paragraphs": [
          "Pilih Bantuan aksesibilitas pada formulir. Sebutkan URL, hambatan yang ditemui, perangkat/browser atau teknologi bantu yang digunakan, dan bentuk bantuan yang diperlukan. Tidak perlu menyampaikan diagnosis atau data kesehatan pribadi."
        ]
      }
    ],
    "topic": "Bantuan aksesibilitas"
  },
  "bantuan": {
    "title": "Pusat Bantuan",
    "description": "Panduan singkat untuk mengakses informasi dan menggunakan layanan kelompok.",
    "category": "Layanan & bantuan",
    "sections": [
      {
        "id": "publik",
        "title": "Informasi publik",
        "paragraphs": [
          "Profil, program, kabar, kegiatan yang diterbitkan, dan galeri dapat dibaca tanpa login. Gunakan pencarian situs untuk menemukan informasi. Dokumen atau data internal tetap berada di ruang kerja sesuai hak akses."
        ]
      },
      {
        "id": "anggota",
        "title": "Keanggotaan dan kerja sama",
        "paragraphs": [
          "Minat keanggotaan disampaikan melalui topik Keanggotaan; kerja sama melalui Kemitraan. Pengiriman pesan tidak otomatis menjadi persetujuan keanggotaan atau kontrak. Pengurus memeriksa permohonan melalui proses organisasi."
        ]
      },
      {
        "id": "masuk",
        "title": "Aktivasi, login, dan lupa password",
        "paragraphs": [
          "Akun anggota/pengurus menggunakan undangan admin. Setelah identitas dan status anggota terverifikasi, admin menetapkan email dan peran lalu memberikan tautan pribadi. Aktivasi berlaku 48 jam; pemulihan password berlaku satu jam dan keduanya sekali pakai.",
          "Buat password 12–128 karakter. Setelah aktif, masuk melalui halaman Masuk. Jika lupa password atau tautan kedaluwarsa, hubungi administrator dan minta tautan baru. Jangan mengirim password, OTP, atau tautan pribadi ke formulir."
        ]
      },
      {
        "id": "akses",
        "title": "Peran dan perubahan tugas",
        "paragraphs": [
          "Anggota melihat data sendiri dan informasi kegiatan yang tersedia. Pengurus mendapat akses sesuai mandat; koordinator dibatasi pada program penugasan. Perubahan jabatan di data anggota tidak otomatis mengganti izin akun. Administrator mengatur hak akses dan dapat mencabut sesi lama."
        ]
      },
      {
        "id": "pesan",
        "title": "Pesan, berkas, dan gangguan",
        "paragraphs": [
          "Sesudah mengirim pesan, simpan referensi penerimaan. Jika muncul kesalahan, periksa nama, kontak, topik, panjang pesan, persetujuan, dan koneksi. Pengiriman berulang dapat dibatasi sementara.",
          "Unggah lampiran dilakukan melalui ruang kerja yang memiliki izin. Format yang diterima: PDF, DOCX, XLSX, PNG, dan JPG, maksimum 3 MB per berkas. Situs tidak menerima lampiran melalui formulir publik. Jika halaman tidak memuat, coba muat ulang atau hubungi pengelola dengan uraian masalah tanpa data rahasia."
        ]
      }
    ],
    "topic": "Dukungan akun"
  },
  "pengelola": {
    "title": "Informasi Pengelola",
    "description": "Identitas organisasi dan saluran komunikasi pengelola situs.",
    "category": "Tata kelola informasi",
    "sections": [
      {
        "id": "identitas",
        "title": "KWT Srikandi Buana",
        "paragraphs": [
          "Pengelola situs adalah Kelompok Wanita Tani Srikandi Buana di Desa Ngadimulyo, Kecamatan Kedu, Kabupaten Temanggung, Jawa Tengah. Situs digunakan untuk informasi kelompok serta administrasi anggota dan pengurus yang diberi akses.",
          "Nama kontak publik, alamat, dan kanal komunikasi mengikuti pengaturan resmi pengelola yang ditampilkan di bawah. Wilayah kelompok tidak selalu merupakan alamat lengkap sekretariat."
        ]
      },
      {
        "id": "kewenangan",
        "title": "Informasi dan kewenangan",
        "paragraphs": [
          "Kabar diterbitkan oleh pengelola. Nama pengurus, status kelembagaan, kerja sama, serta program harus dibaca sesuai data dan status yang telah dikonfirmasi. Situs tidak digunakan sebagai bukti legalitas atau penetapan kewenangan di luar dokumen dan keputusan yang sah."
        ]
      },
      {
        "id": "komunikasi",
        "title": "Komunikasi resmi",
        "paragraphs": [
          "Gunakan kanal yang tercantum di situs untuk memastikan tujuan komunikasi. Pengelola tidak perlu meminta password atau OTP Anda. Konfirmasi langsung bila menerima pesan yang mengatasnamakan kelompok dan meminta data atau pembayaran tidak terduga."
        ]
      }
    ],
    "topic": "Informasi kelompok"
  }
};
