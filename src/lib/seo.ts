import type {Metadata} from 'next';
import {siteOrigin} from './site-origin';
import {informationPages} from './information-pages';
export const socialImage='/social/srikandi-buana-1200x630.png';
export const publicPages:Record<string,{title:string;description:string}>={
 '/':{title:'KWT Srikandi Buana — Perempuan Tani Ngadimulyo, Kedu',description:'Kelompok Wanita Tani Srikandi Buana di Ngadimulyo, Kedu, Temanggung. Informasi organisasi, sembilan program, kegiatan, keanggotaan dan kemitraan.'},
 '/produk':{title:'Katalog Produk Kelompok',description:'Lihat produk yang telah diterbitkan oleh KWT Srikandi Buana. Pemesanan dilakukan melalui akun anggota yang sudah diverifikasi; pembayaran daring belum tersedia.'},
 '/profil':{title:'Profil Kelompok Wanita Tani',description:'Kenali profil, nilai, dan arah pengembangan KWT Srikandi Buana di Desa Ngadimulyo, Kedu, Temanggung.'},
 '/visi-misi':{title:'Visi & Misi',description:'Visi dan enam misi KWT Srikandi Buana dalam penguatan organisasi, pertanian, pemberdayaan perempuan dan kemandirian keluarga.'},
 '/program':{title:'Program Kerja',description:'Sembilan prioritas kerja Srikandi Buana: organisasi, keterampilan, pertanian, literasi keuangan dan kesiapan usaha bersama.'},
 '/kegiatan':{title:'Kegiatan & Pertemuan',description:'Agenda dan catatan kegiatan KWT Srikandi Buana yang telah diterbitkan oleh pengelola.'},
 '/kabar':{title:'Kabar Kelompok',description:'Publikasi, perkembangan program, dan informasi terbaru yang diterbitkan pengelola KWT Srikandi Buana.'},
 '/galeri':{title:'Galeri Dokumentasi',description:'Foto kegiatan dan dokumentasi Srikandi Buana yang telah dipilih pengelola untuk ditampilkan kepada publik.'},
 '/kemitraan':{title:'Kemitraan & Kerja Sama',description:'Informasi dan kanal pengajuan kerja sama untuk pengembangan pertanian, keterampilan, dan pemberdayaan anggota Srikandi Buana.'},
 '/dokumen':{title:'Dokumen Organisasi',description:'Informasi dokumen acuan dan status kelembagaan KWT Srikandi Buana. Akses data internal mengikuti hak akses pengelola.'},
 '/kontak':{title:'Hubungi Pengelola',description:'Hubungi Srikandi Buana untuk keanggotaan, kemitraan, pengaduan, bantuan akun, dan permintaan data pribadi.'},
 '/faq':{title:'Pertanyaan Umum',description:'Jawaban seputar keanggotaan, program, kemitraan, privasi, akun, dan pemasangan aplikasi web Srikandi Buana.'},
 '/kebijakan':{title:'Pusat Kebijakan & Layanan',description:'Privasi, syarat dan ketentuan, cookie, publikasi, pengaduan, hak data, dan bantuan penggunaan situs Srikandi Buana.'},
 '/peta-situs':{title:'Peta Situs',description:'Temukan halaman publik organisasi, program, kegiatan, kebijakan, dan layanan bantuan Srikandi Buana.'},
 '/pasang':{title:'Pasang Aplikasi',description:'Pasang aplikasi web Srikandi Buana ke layar utama ponsel, tablet atau komputer melalui browser yang mendukung.'},
 ...Object.fromEntries(Object.entries(informationPages).map(([slug,p])=>['/'+slug,{title:p.title,description:p.description}]))};
export function pageMetadata(path:string,title?:string,description?:string,options:{image?:string;article?:boolean;noindex?:boolean}={}):Metadata{const entry=publicPages[path],rawTitle=title||entry?.title||'Srikandi Buana',cleanTitle=rawTitle.replace(/\s*\|\s*Srikandi Buana$/,''),fullTitle=path==='/'?cleanTitle:cleanTitle+' | Srikandi Buana',summary=(description||entry?.description||publicPages['/'].description).slice(0,300),url=new URL(path,siteOrigin()).toString(),image=new URL(options.image||socialImage,siteOrigin()).toString();return {title:fullTitle,description:summary,alternates:{canonical:url,languages:{'id-ID':url}},robots:options.noindex?{index:false,follow:false}:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},openGraph:{type:options.article?'article':'website',url,title:fullTitle,description:summary,locale:'id_ID',siteName:'KWT Srikandi Buana',images:[{url:image,alt:cleanTitle,...(!options.image?{width:1200,height:630}:{})}]},twitter:{card:'summary_large_image',title:fullTitle,description:summary,images:[image]}}}
export const structuredJson=(data:unknown)=>JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
