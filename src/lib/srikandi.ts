export type Data = Record<string,string|number>;
export type Row = {id:string;kind:string;data:Data;created:string;updated:string};
export type Field = {key:string;label:string;type?:string;options?:string[];required?:boolean};
export const modules:Record<string,{title:string;singular:string;description:string;fields:Field[]}> = {
 pengurus:{title:"Struktur Organisasi",singular:"kelompok jabatan",description:"Catat struktur jabatan dan lakukan verifikasi identitas serta masa kepengurusan.",fields:[{key:"name",label:"Jabatan / kelompok jabatan",required:true},{key:"candidates",label:"Nama sesuai sumber",type:"textarea",required:true},{key:"term",label:"Masa tugas / nomor keputusan"},{key:"status",label:"Status",options:["Perlu verifikasi","Dikonfirmasi internal","Perlu perbaikan"]},{key:"notes",label:"Catatan perbedaan dan dasar keputusan",type:"textarea"}]},
 transkripsi:{title:"Verifikasi Informasi",singular:"catatan sumber",description:"Catat hasil pemeriksaan dokumen dan informasi sebelum digunakan sebagai data resmi.",fields:[{key:"name",label:"Nama catatan",required:true},{key:"date",label:"Tanggal sumber",type:"date"},{key:"status",label:"Status",options:["Perlu verifikasi","Dikonfirmasi internal","Perlu perbaikan"]},{key:"notes",label:"Transkripsi dan catatan verifikasi",type:"textarea",required:true}]},
 kelembagaan:{title:"Kepatuhan Organisasi",singular:"butir pemeriksaan",description:"Pantau persyaratan dan bukti dokumen sesuai kegiatan organisasi yang berlaku.",fields:[{key:"name",label:"Dokumen / tindakan",required:true},{key:"status",label:"Status",options:["Belum diperiksa","Dalam proses","Tersedia","Perlu perbaikan","Tidak relevan"]},{key:"pic",label:"Penanggung jawab"},{key:"notes",label:"Bukti, arahan instansi dan catatan",type:"textarea"},{key:"attachmentId",label:"Bukti dari arsip (opsional)"}]},
 tindaklanjut:{title:"Tugas dan Tindak Lanjut",singular:"tindak lanjut",description:"Kelola keterkaitan program, pelaksana, tenggat, hasil aktual, bukti, serta verifikasi penyelesaian.",fields:[{key:"name",label:"Tindakan",required:true},{key:"programId",label:"Program terkait",options:["","1","2","3","4","5","6","7","8","9"]},{key:"period",label:"Periode / tenggat usulan"},{key:"dueDate",label:"Tanggal tenggat",type:"date"},{key:"priority",label:"Prioritas",options:["Normal","Tinggi","Rendah"]},{key:"pic",label:"Penanggung jawab"},{key:"status",label:"Status",options:["Belum dimulai","Berjalan","Selesai","Ditunda"]},{key:"evidence",label:"Hasil / bukti yang dituju",type:"textarea"},{key:"completionEvidence",label:"Hasil pelaksanaan aktual (wajib untuk verifikasi)",type:"textarea"},{key:"attachmentId",label:"Lampiran bukti pelaksanaan dari arsip (opsional)"},{key:"verification",label:"Status verifikasi hasil",options:["Belum diajukan","Menunggu verifikasi","Terverifikasi","Perlu perbaikan"]},{key:"reviewNote",label:"Catatan pemeriksaan Ketua",type:"textarea"},{key:"meetingReviewStatus",label:"Evaluasi keputusan rapat",options:["Belum dievaluasi","Sesuai keputusan","Sebagian terlaksana","Belum terlaksana","Perlu perubahan mandat"]},{key:"meetingReviewMeeting",label:"Nama / nomor rapat evaluasi"},{key:"meetingReviewDate",label:"Tanggal rapat evaluasi",type:"date"},{key:"meetingReviewNote",label:"Hasil evaluasi keputusan dan alasan",type:"textarea"},{key:"notes",label:"Keputusan dan perkembangan",type:"textarea"}]},
 register:{title:"Register Dokumen",singular:"dokumen terdaftar",description:"Kelola versi, penanggung jawab, lokasi, dan status dokumen kelembagaan.",fields:[{key:"name",label:"Nama dokumen",required:true},{key:"number",label:"Nomor / tanggal dokumen"},{key:"version",label:"Versi"},{key:"status",label:"Status",options:["Draf","Diperiksa","Disahkan internal","Perlu pembaruan"]},{key:"pic",label:"Penanggung jawab / penandatangan"},{key:"notes",label:"Lokasi asli, akses dan catatan pengesahan",type:"textarea"},{key:"attachmentId",label:"Berkas dari arsip"}]},
 aset:{title:"Inventaris Aset",singular:"aset",description:"Catat barang nyata, asal perolehan, kondisi dan penanggung jawab.",fields:[{key:"name",label:"Nama barang / aset",required:true},{key:"quantity",label:"Jumlah",type:"number",required:true},{key:"status",label:"Status aset",options:["Aktif","Nonaktif"]},{key:"condition",label:"Kondisi",options:["Baik","Perlu perawatan","Rusak","Perlu verifikasi"]},{key:"location",label:"Lokasi simpan"},{key:"pic",label:"Penanggung jawab"},{key:"notes",label:"Sumber perolehan, bukti dan nomor inventaris",type:"textarea"},{key:"attachmentId",label:"Bukti dari arsip"}]},
 lotkopi:{title:"Penerimaan Kopi",singular:"lot",description:"Gunakan hanya untuk penerimaan nyata. Kode lot bukan bukti sertifikasi atau jaminan mutu.",fields:[{key:"name",label:"Kode lot / batch unik",required:true},{key:"date",label:"Tanggal penerimaan",type:"date",required:true},{key:"supplier",label:"Kode / nama pemasok"},{key:"quantity",label:"Jumlah diterima",type:"decimal",required:true},{key:"unit",label:"Bentuk produk dan satuan",required:true},{key:"basis",label:"Dasar kuantitas",options:["Estimasi","Hasil timbang terverifikasi"]},{key:"status",label:"Status lot",options:["Menunggu pemeriksaan","Diterima","Ditahan","Ditolak"]},{key:"notes",label:"Asal umum, proses, pemeriksaan, penyimpanan dan pengeluaran",type:"textarea"},{key:"attachmentId",label:"Bukti dari arsip"}]},
 persetujuan:{title:"Persetujuan Data",singular:"catatan persetujuan",description:"Izin publikasi foto dipisahkan dari keanggotaan; tidak ada persetujuan yang diasumsikan.",fields:[{key:"name",label:"Nama / kode anggota",required:true},{key:"date",label:"Tanggal penjelasan / persetujuan",type:"date",required:true},{key:"purpose",label:"Tujuan dan data yang dijelaskan",type:"textarea",required:true},{key:"status",label:"Persetujuan administrasi",options:["Belum dikonfirmasi","Setuju untuk tujuan tercatat","Perlu pembaruan","Dibatasi / ditarik"]},{key:"photo",label:"Persetujuan foto / publikasi",options:["Belum dikonfirmasi","Setuju sesuai lingkup tercatat","Tidak setuju"]},{key:"notes",label:"Lingkup, masa simpan, akses, koreksi dan pembagian eksternal",type:"textarea"},{key:"attachmentId",label:"Bukti dari arsip"}]},
 galeri:{title:"Galeri Foto",singular:"foto galeri",description:"Kurasi foto yang telah mendapat izin untuk dipublikasikan.",fields:[{key:"name",label:"Judul foto",required:true},{key:"date",label:"Tanggal dokumentasi",type:"date",required:true},{key:"fileId",label:"Foto galeri — pilih arsip atau unggah langsung",required:true},{key:"location",label:"Lokasi"},{key:"altText",label:"Deskripsi foto untuk pembaca layar (opsional)"},{key:"publicationPermission",label:"Izin publikasi foto",options:["Belum dikonfirmasi","Dikonfirmasi"]},{key:"status",label:"Status publikasi",options:["Draf","Terbit"]},{key:"notes",label:"Keterangan dan kredit foto",type:"textarea",required:true}]},
 publikasi:{title:"Manajemen Konten",singular:"publikasi",description:"Terbitkan kabar dan kegiatan untuk pengunjung situs.",fields:[{key:"name",label:"Judul",required:true},{key:"category",label:"Kategori",options:["Kabar","Kegiatan"]},{key:"date",label:"Tanggal publikasi / kegiatan",type:"date",required:true},{key:"location",label:"Lokasi (untuk kegiatan)"},{key:"status",label:"Status publikasi",options:["Draf","Terbit"]},{key:"fileId",label:"Foto sampul — pilih arsip atau unggah (opsional)"},{key:"publicationPermission",label:"Izin publikasi foto sampul",options:["Belum dikonfirmasi","Dikonfirmasi"]},{key:"summary",label:"Ringkasan",type:"textarea",required:true},{key:"notes",label:"Isi lengkap",type:"textarea",required:true}]},
 alsintan:{title:"Buku Induk Alsintan",singular:"alat mesin pertanian",description:"Catat identitas, jumlah, kondisi, lokasi umum, penanggung jawab, dan bukti inventaris alat mesin pertanian kelompok.",fields:[{key:"name",label:"Nama alat / mesin",required:true},{key:"assetCode",label:"Kode inventaris",required:true},{key:"category",label:"Jenis alat",options:["Pengolahan tanah","Penanaman","Pemeliharaan tanaman","Panen","Pascapanen","Irigasi","Lainnya"]},{key:"quantity",label:"Jumlah unit",type:"number",required:true},{key:"condition",label:"Kondisi",options:["Baik","Perlu perawatan","Rusak"]},{key:"acquisitionDate",label:"Tanggal perolehan",type:"date"},{key:"source",label:"Sumber perolehan"},{key:"location",label:"Lokasi penyimpanan umum"},{key:"pic",label:"Penanggung jawab"},{key:"status",label:"Status inventaris",options:["Aktif","Dalam perawatan","Tidak aktif"]},{key:"notes",label:"Keterangan / riwayat pemeliharaan",type:"textarea"},{key:"attachmentId",label:"Bukti inventaris dari arsip (opsional)"}]},
 anggota:{title:"Keanggotaan",singular:"anggota",description:"Kelola data anggota, status keanggotaan, serta informasi yang telah diverifikasi.",fields:[{key:"name",label:"Nama lengkap",required:true},{key:"dusun",label:"Dusun / alamat",required:true},{key:"phone",label:"Nomor WhatsApp",type:"tel"},{key:"role",label:"Peran",options:["Anggota","Ketua","Sekretaris","Bendahara","Koordinator Organisasi","Koordinator Pertanian","Koordinator Pemberdayaan","Koordinator Usaha","Pembina"]},{key:"potential",label:"Potensi & kebutuhan",type:"textarea"},{key:"status",label:"Status",options:["Perlu verifikasi","Aktif","Tidak aktif","Mengundurkan diri"]},{key:"verification",label:"Verifikasi data",options:["Perlu verifikasi","Terverifikasi"]},{key:"consent",label:"Persetujuan pendataan",options:["Belum dikonfirmasi","Terdokumentasi","Perlu pembaruan"]}]},
 kegiatan:{title:"Agenda Kegiatan",singular:"kegiatan",description:"Catat agenda, jadwal, pelaksanaan, dan hasil kegiatan organisasi.",fields:[{key:"name",label:"Nama kegiatan",required:true},{key:"date",label:"Tanggal",type:"date",required:true},{key:"location",label:"Tempat",required:true},{key:"pic",label:"Penanggung jawab"},{key:"participants",label:"Jumlah peserta",type:"number"},{key:"status",label:"Status",options:["Perlu verifikasi","Direncanakan","Berjalan","Selesai","Ditunda"]},{key:"notes",label:"Tujuan, hasil & tindak lanjut",type:"textarea"},{key:"attachmentId",label:"Lampiran kegiatan dari arsip (opsional)"}]},
 kas:{title:"Buku Kas",singular:"transaksi",description:"Catat penerimaan dan pengeluaran kas beserta bukti transaksi.",fields:[{key:"name",label:"Uraian transaksi",required:true},{key:"date",label:"Tanggal",type:"date",required:true},{key:"type",label:"Jenis transaksi",options:["Pemasukan","Pengeluaran"]},{key:"amount",label:"Nominal (Rp)",type:"number",required:true},{key:"fund",label:"Pos dana",options:["Organisasi","Program","Usaha"]},{key:"notes",label:"Referensi bukti / dasar persetujuan",type:"textarea",required:true},{key:"attachmentId",label:"Bukti transaksi dari arsip (opsional)"}]},
 musyawarah:{title:"Rapat dan Notulen",singular:"notulen",description:"Catat agenda, pembahasan, keputusan yang disepakati, satu tindakan per baris, dan evaluasi keputusan rapat terdahulu.",fields:[{key:"name",label:"Nama / agenda rapat",required:true},{key:"date",label:"Tanggal rapat",type:"date",required:true},{key:"programId",label:"Program terkait (opsional)",options:["","1","2","3","4","5","6","7","8","9"]},{key:"pic",label:"Pencatat notulen"},{key:"agendaPoints",label:"Pokok agenda (satu butir per baris)",type:"textarea"},{key:"notes",label:"Ringkasan pembahasan / notulen",type:"textarea",required:true},{key:"decisionSummary",label:"Keputusan yang disepakati",type:"textarea"},{key:"followup",label:"Daftar keputusan operasional (satu tindakan per baris; setiap baris menjadi tugas terpisah)",type:"textarea"},{key:"status",label:"Status rapat / keputusan",options:["Rancangan","Disepakati","Ditindaklanjuti","Dievaluasi"]},{key:"nextReviewDate",label:"Tanggal evaluasi / rapat berikutnya",type:"date"},{key:"reviewOfMeeting",label:"Rapat terdahulu yang dievaluasi (opsional)"},{key:"reviewSummary",label:"Evaluasi keputusan rapat terdahulu",type:"textarea"},{key:"attachmentId",label:"Notulen / lampiran dari arsip (opsional)"}]},
 kemitraan:{title:"Kemitraan",singular:"penjajakan",description:"Kelola komunikasi, status pembahasan, dan kesepakatan dengan mitra.",fields:[{key:"programId",label:"Program terkait (6 atau 8)",options:["6","8"],required:true},{key:"name",label:"Nama lembaga / pihak",required:true},{key:"contact",label:"Kontak resmi"},{key:"date",label:"Tanggal komunikasi",type:"date"},{key:"status",label:"Tahap",options:["Referensi","Rencana penjajakan","Komunikasi awal","Pembahasan","Disepakati"]},{key:"notes",label:"Hasil komunikasi / referensi kesepakatan",type:"textarea",required:true}]},
 usaha:{title:"Perencanaan Usaha",singular:"kajian usaha",description:"Catat usulan usaha, estimasi biaya, analisis kelayakan, dan status pembahasan.",fields:[{key:"programId",label:"Program terkait (5 atau 6)",options:["5","6"],required:true},{key:"name",label:"Gagasan usaha",required:true},{key:"pic",label:"Tim / penanggung jawab"},{key:"cost",label:"Perkiraan modal (Rp)",type:"number"},{key:"status",label:"Tahap kesiapan",options:["Pemetaan","Kajian kelayakan","Menunggu musyawarah","Uji coba","Evaluasi"]},{key:"notes",label:"Bahan baku, pasar, risiko & pembagian tugas",type:"textarea",required:true}]},
 surat:{title:"Surat Masuk dan Keluar",singular:"surat",description:"Register surat masuk/keluar, catat nomor dan tanggal, arahkan disposisi, tetapkan penanggung jawab serta tenggat, lalu hubungkan berkas arsip.",fields:[{key:"name",label:"Perihal surat",required:true},{key:"direction",label:"Jenis surat",options:["Masuk","Keluar"],required:true},{key:"number",label:"Nomor surat (jika sudah ada)"},{key:"date",label:"Tanggal surat",type:"date",required:true},{key:"receivedDate",label:"Tanggal diterima / dikirim",type:"date"},{key:"sender",label:"Pengirim"},{key:"recipient",label:"Penerima / tujuan"},{key:"status",label:"Status penanganan",options:["Baru diterima","Perlu disposisi","Didisposisikan","Dalam tindak lanjut","Selesai","Diarsipkan"]},{key:"disposition",label:"Isi disposisi / arahan",type:"textarea"},{key:"pic",label:"Penanggung jawab tindak lanjut"},{key:"dueDate",label:"Tenggat tindak lanjut",type:"date"},{key:"attachmentId",label:"ID berkas lampiran dari Arsip Berkas"},{key:"notes",label:"Catatan, keputusan, dan lokasi arsip",type:"textarea"}]},
 laporan_program:{title:"Laporan Perkembangan Program",singular:"laporan program",description:"Koordinator melaporkan perkembangan, hasil yang sudah terjadi, kendala, kebutuhan dukungan, dan langkah berikutnya. Status serta capaian diisi berdasarkan kondisi lapangan, bukan target asumsi.",fields:[{key:"name",label:"Judul laporan",required:true},{key:"programId",label:"Program terkait",options:["1","2","3","4","5","6","7","8","9"],required:true},{key:"date",label:"Tanggal laporan",type:"date",required:true},{key:"period",label:"Periode laporan"},{key:"status",label:"Kondisi program",options:["Belum dimulai","Berjalan","Terkendala","Selesai"]},{key:"target",label:"Target yang disepakati untuk periode ini",type:"textarea"},{key:"achievement",label:"Capaian target (target dibanding realisasi)",type:"textarea"},{key:"progress",label:"Perkembangan dan hasil yang benar-benar terlaksana",type:"textarea",required:true},{key:"evaluation",label:"Evaluasi pelaksanaan dan pembelajaran",type:"textarea"},{key:"blockers",label:"Kendala / risiko yang dihadapi",type:"textarea"},{key:"supportNeeded",label:"Dukungan atau keputusan yang dibutuhkan",type:"textarea"},{key:"nextSteps",label:"Langkah berikutnya yang diusulkan",type:"textarea"},{key:"pic",label:"Koordinator pelapor"},{key:"attachmentId",label:"Bukti / dokumen pendukung dari arsip (opsional)"},{key:"notes",label:"Catatan tambahan",type:"textarea"}]}
};
export const programs = [
  {
    "id": "1",
    "name": "Penguatan organisasi dan administrasi",
    "goal": "Pengurus, daftar anggota, rapat, notulen, dan arsip dasar berjalan tertib.",
    "period": "Bulan 1–2; berlanjut",
    "pic": "Ketua + Sekretaris",
    "funding": "Belum ditetapkan; putuskan lewat rapat",
    "evidence": "Struktur/tugas; daftar anggota; notulen; register dokumen",
    "category": "Organisasi",
    "tasks": [
      "Menyepakati susunan pengurus dan aturan kerja",
      "Mendata anggota dan kebutuhan",
      "Menetapkan pertemuan dan mengarsipkan keputusan"
    ]
  },
  {
    "id": "2",
    "name": "Pemetaan kebutuhan anggota",
    "goal": "Mengidentifikasi kebutuhan pelatihan, potensi pertanian, keterampilan, dan minat usaha anggota.",
    "period": "Bulan 1–3",
    "pic": "Koord. Organisasi/Keanggotaan",
    "funding": "Belum ditetapkan; putuskan lewat rapat",
    "evidence": "Rekap kebutuhan; catatan verifikasi dan persetujuan data",
    "category": "Keanggotaan",
    "tasks": [
      "Mendata kegiatan pertanian secara sukarela",
      "Menghimpun kebutuhan pelatihan dan sarana",
      "Memetakan keterampilan serta minat usaha"
    ]
  },
  {
    "id": "3",
    "name": "Pelatihan pertanian/kebun",
    "goal": "Memilih pelatihan sesuai masalah nyata kebun dan komoditas yang dikelola anggota.",
    "period": "Bulan 2–6; ikut kalender tani",
    "pic": "Koord. Pertanian/Produksi",
    "funding": "Belum ditetapkan; cari sumber yang sah",
    "evidence": "Agenda, daftar hadir, materi, dan catatan tindak lanjut",
    "category": "Pertanian",
    "tasks": [
      "Diskusi budidaya dan perawatan kebun",
      "Pelatihan bersama penyuluh yang kompeten",
      "Belajar tanah, air, adaptasi iklim dan pascapanen"
    ]
  },
  {
    "id": "4",
    "name": "Literasi keuangan dan pencatatan",
    "goal": "Membiasakan pencatatan biaya/pendapatan usaha sederhana dan kas kelompok bila ada transaksi.",
    "period": "Bulan 2–6; praktik rutin",
    "pic": "Bendahara",
    "funding": "Belum ditetapkan; putuskan lewat rapat",
    "evidence": "Format catatan; buku kas; bukti transaksi",
    "category": "Pemberdayaan",
    "tasks": [
      "Memisahkan uang rumah tangga dan usaha",
      "Mencatat biaya dan menghitung hasil usaha",
      "Mempelajari modal, tabungan dan risiko utang"
    ]
  },
  {
    "id": "5",
    "name": "Penjajakan usaha produktif",
    "goal": "Membandingkan pilihan usaha dari sisi modal, tenaga, waktu, pasar, dan risiko.",
    "period": "Bulan 3–6",
    "pic": "Koord. Usaha/Kemitraan",
    "funding": "Belum ditetapkan; tidak ada komitmen sebelum disetujui",
    "evidence": "Ringkasan kelayakan; keputusan uji coba",
    "category": "Usaha",
    "tasks": [
      "Menghimpun gagasan usaha",
      "Membandingkan modal, waktu, pasar dan risiko",
      "Menguji satu kegiatan setelah disetujui dan siap"
    ]
  },
  {
    "id": "6",
    "name": "Persiapan KUB/rantai pasok (jika layak)",
    "goal": "Mengkaji bentuk usaha bersama, data pasokan, mutu, biaya, ketertelusuran, dan kebutuhan calon pembeli.",
    "period": "Bulan 4–12; jika siap",
    "pic": "Koord. Usaha + Pertanian",
    "funding": "Belum ditetapkan; perlu kajian modal",
    "evidence": "Rancangan usaha; profil pasok berdasarkan data; keputusan musyawarah",
    "category": "Usaha",
    "tasks": [
      "Mengkaji bahan baku, mutu dan kebutuhan pembeli",
      "Menilai alat, tempat, tenaga dan modal",
      "Membahas tugas, keuntungan, kerugian dan mandat"
    ]
  },
  {
    "id": "7",
    "name": "Kepemimpinan dan pemberdayaan perempuan",
    "goal": "Mendorong partisipasi anggota, kesempatan memimpin, dan penyampaian kebutuhan secara aman.",
    "period": "Sepanjang tahun",
    "pic": "Koord. Pemberdayaan (jika ditetapkan)",
    "funding": "Belum ditetapkan; pilih kegiatan yang terjangkau",
    "evidence": "Catatan kegiatan; masukan anggota; tindak lanjut",
    "category": "Pemberdayaan",
    "tasks": [
      "Bergiliran memimpin diskusi",
      "Mendorong usulan dan partisipasi merata",
      "Mencatat kendala serta langkah perbaikan"
    ]
  },
  {
    "id": "8",
    "name": "Kemitraan dan komunikasi",
    "goal": "Membangun komunikasi berdasarkan tujuan yang jelas dan mencatat status pihak yang dihubungi.",
    "period": "Bulan 2–12",
    "pic": "Ketua + Koord. Usaha/Kemitraan",
    "funding": "Belum ditetapkan; biaya perjalanan perlu persetujuan",
    "evidence": "Register kemitraan; catatan pertemuan; tindak lanjut",
    "category": "Kemitraan",
    "tasks": [
      "Komunikasi dengan desa dan penyuluh",
      "Menyiapkan profil dan kebutuhan pelatihan",
      "Mencatat penjajakan dan tindak lanjut resmi"
    ]
  },
  {
    "id": "9",
    "name": "Evaluasi dan laporan tahunan",
    "goal": "Meninjau kegiatan yang terlaksana, kendala, kas/dana, partisipasi anggota, serta rencana tahun berikutnya.",
    "period": "Bulan 12",
    "pic": "Pengurus dan anggota",
    "funding": "Belum ditetapkan; gunakan sumber yang sah",
    "evidence": "Laporan tahunan; keputusan program berikutnya",
    "category": "Evaluasi",
    "tasks": [
      "Menyusun laporan kegiatan dan kas tahunan",
      "Mengevaluasi partisipasi, kendala dan hasil yang dapat diperiksa",
      "Menyepakati perbaikan serta rencana tahun berikutnya"
    ]
  }
];
export const vision="Terwujudnya SRIKANDI BUANA sebagai kelompok wanita tani yang kompak, mandiri, terampil, dan berdaya dalam mengembangkan pertanian serta usaha bersama untuk memperkuat kesejahteraan anggota dan keluarga.";
export const missions=["Memperkuat organisasi dan kebersamaan melalui pengurus yang bertanggung jawab, musyawarah, pembagian tugas dan administrasi tertib.","Meningkatkan pengetahuan perempuan tani dalam budidaya, perawatan kebun, pengelolaan panen dan pertanian adaptif terhadap iklim.","Mengembangkan kemandirian ekonomi melalui literasi keuangan, potensi lokal dan perintisan usaha secara bertahap.","Meningkatkan peran perempuan dalam keputusan kelompok, pertanian dan usaha keluarga sesuai kondisi anggota.","Membangun kerja sama yang saling menguntungkan dan transparan dengan pemerintah, pendamping, pendidikan dan dunia usaha.","Menumbuhkan budaya belajar, berbagi pengalaman, mencatat perkembangan dan memperbaiki cara kerja bersama."];
export const rupiah=(n:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);
export const dateID=(s:string)=>s?new Date(s.slice(0,10)+"T12:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"—";

for(const kind of ['kegiatan','tindaklanjut'])modules[kind].fields.push({key:'programId',label:'Nomor program terkait (1–9; wajib untuk koordinator)',options:['','1','2','3','4','5','6','7','8','9']});
