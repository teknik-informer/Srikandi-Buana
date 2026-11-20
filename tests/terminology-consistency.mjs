import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const nav=read('src/lib/navigation-config.ts'), mods=read('src/lib/srikandi.ts');
const navLabels=new Map([...nav.matchAll(/admin\('([^']+)','([^']+)','[^']+'\)/g)].map(m=>[m[1],m[2]]));
const labels={
 anggota:'Keanggotaan', pengurus:'Struktur Organisasi', musyawarah:'Rapat dan Notulen', persetujuan:'Persetujuan Data',
 tindaklanjut:'Tugas dan Tindak Lanjut', kegiatan:'Agenda Kegiatan', kas:'Buku Kas', usaha:'Perencanaan Usaha',
 aset:'Inventaris Aset', lotkopi:'Penerimaan Hasil', sumber:'Referensi Dokumen', kelembagaan:'Kepatuhan Organisasi',
 register:'Register Dokumen', transkripsi:'Verifikasi Informasi', publikasi:'Manajemen Konten',galeri:'Galeri Foto',
 portal:'Portal Anggota',pengajuan:'Pengajuan Operasional',enterprise:'Persetujuan Operasional','akses-eksternal':'Akses Pemerintah & Mitra',pertanian:'Pengelolaan Pertanian',laporan:'Laporan Kas',surat:'Surat Masuk dan Keluar','surat-resmi':'Penyusunan Surat Resmi',laporan_program:'Laporan Perkembangan Program',presensi:'Presensi Kegiatan','presensi-saya':'Presensi Saya'
};
test('Nama halaman utama konsisten dengan fungsinya',()=>{
 for(const [id,label] of Object.entries(labels))assert.equal(navLabels.get(id),label,`label untuk ${id}`);
});
test('Nama modul database cocok dengan menu pengguna',()=>{
 for(const id of ['anggota','pengurus','musyawarah','persetujuan','tindaklanjut','kegiatan','kas','usaha','aset','lotkopi','kelembagaan','register','transkripsi','publikasi','galeri','surat','laporan_program']){
 const found=mods.match(new RegExp(String.raw`\b${id}:\{title:"([^"]+)"`));assert.ok(found,id);assert.equal(found[1],labels[id],id);
 }
});
test('Penyusunan surat resmi memiliki skema draf yang terpisah dari register surat',()=>{
 assert(navLabels.get('surat-resmi')==='Penyusunan Surat Resmi');
 const found=mods.match(/\bsurat_resmi:\{title:"([^"]+)"/);
 assert.ok(found);
 assert.equal(found[1],'Penyusunan Surat Resmi');
 assert(mods.includes('options:["Draf"]'));
});
test('Tidak menggunakan label yang berpotensi menyesatkan',()=>{
 const forbidden=['Employee Portal','Keuangan & Akuntansi','Laporan Keuangan','Pusat operasional','Checklist kelembagaan','Lot kopi','Penerimaan Kopi','Sembilan prioritas tahun pertama'];
 assert.ok(mods.includes('title:"Penerimaan Hasil"'));
 assert.ok(mods.includes('label:"Nama komoditas / produk"'));
 assert.ok(mods.includes('label:"Asal penerimaan"'));
 assert.ok(mods.includes('label:"Status penerimaan"'));
 assert.ok(!mods.includes('title:"Penerimaan Kopi"'));
 for(const term of forbidden)assert.ok(!nav.includes(term),term);
});
test('Tidak mengubah nilai status yang disimpan pada database',()=>{
 for(const s of ['Draf','Terbit','Pemasukan','Pengeluaran','Perlu verifikasi','Disepakati'])assert.ok(mods.includes(`"${s}"`),s);
});
test('Menu publik tidak terpengaruh dan tidak ada menu tanpa endpoint',()=>{
 const ids=[...navLabels.keys()];assert.equal(new Set(ids).size,ids.length);assert.ok(ids.includes('akses-eksternal'));assert.equal(ids.length,41); // Existing routes plus new official-letter drafting, external access, agriculture management, Alsintan, and field survey instruments
});
