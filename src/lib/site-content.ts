import {informationPages} from './information-pages';
import {programs} from './srikandi';
export const faqs=[
 {group:'Kelompok',q:'Apa itu Srikandi Buana?',a:'Srikandi Buana adalah wadah perempuan tani di Desa Ngadimulyo, Kecamatan Kedu, Temanggung, untuk saling belajar, mengembangkan potensi, dan menyiapkan peluang usaha bersama secara bertahap.'},
 {group:'Keanggotaan',q:'Bagaimana menyampaikan minat menjadi anggota?',a:'Gunakan formulir Hubungi kami dan pilih topik Keanggotaan. Pengurus akan menindaklanjuti minat Anda sesuai ketentuan penerimaan anggota kelompok.'},
 {group:'Program',q:'Bagaimana mengetahui program dan kegiatan kelompok?',a:'Halaman Program memuat sembilan prioritas kerja kelompok. Jadwal dan laporan pelaksanaan tersedia pada halaman Kegiatan dan Kabar. Untuk informasi program tertentu, hubungi kelompok melalui formulir kontak.'},
 {group:'Program',q:'Apakah kelompok hanya berfokus pada kopi?',a:'Kopi dapat menjadi salah satu prioritas jika relevan dengan kebun dan minat anggota. Kegiatan pertanian lain tetap mendapat ruang sesuai potensi dan kesepakatan kelompok.'},
 {group:'Usaha',q:'Di mana mendapatkan informasi usaha bersama?',a:'Informasi usaha bersama dan status pembentukan KUB dapat diminta melalui kontak kelompok. Penetapan usaha, permodalan, dan pembagian peran mengikuti hasil musyawarah anggota.'},
 {group:'Kemitraan',q:'Bagaimana mengajukan kerja sama?',a:'Kirim gagasan melalui formulir Hubungi kami dengan topik Kemitraan. Jelaskan kebutuhan, bentuk dukungan, dan manfaat yang ditawarkan. Pengurus akan menindaklanjuti pengajuan sesuai bidang dan kebutuhan kelompok.'},
 {group:'Informasi',q:'Di mana saya dapat membaca dokumen organisasi?',a:'Halaman Dokumen menyediakan rancangan organisasi, visi, misi, dan program kerja dalam format DOCX. Dokumen tersebut berstatus rancangan untuk dimusyawarahkan, bukan bukti pengesahan atau pelaksanaan.'},
 {group:'Privasi',q:'Apakah data anggota dan kas dapat dilihat publik?',a:'Tidak. Data internal dibatasi menurut hak akses. Anggota hanya melihat data pribadi sendiri dan informasi kegiatan yang diizinkan; pengurus mengakses bagian sesuai tugas. Hanya publikasi dan foto yang secara sengaja diberi status Terbit yang dapat tampil di halaman publik.'},
 {group:'Privasi',q:'Bagaimana pesan dan kontak saya digunakan?',a:'Nama, kontak dan pesan digunakan untuk membaca serta menanggapi keperluan Anda. Data tidak ditampilkan ke publik. Anda dapat meminta perbaikan atau penghapusan pesan melalui pengelola.'}
];
faqs.push({group:'Akun',q:'Bagaimana anggota atau pengurus memperoleh akun?',a:'Administrator memverifikasi anggota lalu memberikan undangan aktivasi pribadi. Pengguna menentukan password sendiri; peran dan jabatan mengikuti penugasan. Lupa password ditangani dengan tautan pemulihan dari admin.'},{group:'Layanan',q:'Bagaimana mengajukan pengaduan atau permintaan data pribadi?',a:'Gunakan formulir Hubungi kami dan pilih Pengaduan atau Permintaan data pribadi. Jelaskan keperluan serta simpan referensi pesan setelah berhasil dikirim. Jangan mengirim password, OTP, atau nomor identitas yang tidak diperlukan.'},{group:'Privasi',q:'Apakah situs memasang cookie iklan?',a:'Aplikasi saat ini tidak memasang pelacak iklan tambahan. Cookie sesi dipakai untuk login; menu dan tema dashboard dapat menyimpan preferensi pada perangkat. Rinciannya tersedia pada Kebijakan Cookie.'});
export type SearchEntry={title:string;description:string;href:string;group:string};
export const staticSearch:SearchEntry[]=[
 {title:'Katalog produk',description:'Informasi produk kelompok yang telah diterbitkan pengelola.',href:'/produk',group:'Usaha'},
 {title:'Tentang Srikandi Buana',description:'Profil, nilai, dan tata kelola kelompok wanita tani.',href:'/profil',group:'Organisasi'},
 {title:'Visi & misi',description:'Kompak, mandiri, terampil, dan berdaya.',href:'/visi-misi',group:'Organisasi'},
 {title:'Kemitraan',description:'Penjajakan kerja sama yang sehat dan transparan.',href:'/kemitraan',group:'Informasi'},
 {title:'Dokumen organisasi',description:'Unduh rancangan organisasi dan program kerja.',href:'/dokumen',group:'Informasi'},
 {title:'Galeri',description:'Dokumentasi yang dipublikasikan pengelola.',href:'/galeri',group:'Informasi'},
 {title:'Pertanyaan umum',description:'Keanggotaan, program, usaha, kemitraan, dan privasi.',href:'/faq',group:'Bantuan'},
 {title:'Hubungi kami',description:'Kirim pesan atau sampaikan minat keanggotaan dan kerja sama.',href:'/kontak',group:'Bantuan'},
 ...programs.map(p=>({title:p.name,description:p.goal,href:'/program/'+p.id,group:'Program'}))
];

staticSearch.push(...Object.entries(informationPages).map(([slug,p])=>({title:p.title,description:p.description,href:"/"+slug,group:p.category})),{title:"Pusat kebijakan",description:"Kebijakan, ketentuan, dan layanan bantuan",href:"/kebijakan",group:"Layanan"},{title:"Peta situs",description:"Direktori halaman publik",href:"/peta-situs",group:"Layanan"});

staticSearch.push({title:'Pasang aplikasi',description:'Instal Srikandi Buana pada Android, iPhone, iPad dan komputer',href:'/pasang',group:'Bantuan'});
faqs.push({group:'Aplikasi',q:'Bagaimana memasang Srikandi Buana di perangkat?',a:'Buka halaman Pasang aplikasi. Browser yang mendukung dapat menampilkan tombol Pasang; di Safari iPhone/iPad gunakan Bagikan lalu Tambahkan ke Layar Utama. Data administrasi tetap membutuhkan koneksi internet.'});
