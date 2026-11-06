export const contactTopics=['Informasi kelompok','Keanggotaan','Kemitraan','Dukungan akun','Pengaduan','Koreksi informasi','Permintaan data pribadi','Laporan keamanan','Bantuan aksesibilitas','Lainnya'];
export const contactLink=(topic:string)=>'/kontak?topik='+encodeURIComponent(contactTopics.includes(topic)?topic:'Informasi kelompok');
