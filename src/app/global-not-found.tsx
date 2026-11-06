import Link from 'next/link';
import BrandLogo from '@/components/brand-logo';
import './globals.css';
export const metadata={title:'Halaman tidak ditemukan | Srikandi Buana',robots:{index:false,follow:false}};
export default function GlobalNotFound(){return <html lang="id"><body><main className="global-missing"><Link href="/" aria-label="Beranda Srikandi Buana"><BrandLogo/></Link><p>404 · HALAMAN TIDAK DITEMUKAN</p><h1>Halaman ini belum tersedia.</h1><p>Periksa alamat yang Anda buka atau temukan informasi melalui halaman utama.</p><nav aria-label="Navigasi pemulihan"><Link href="/">Ke beranda</Link><Link href="/cari">Cari informasi</Link></nav></main></body></html>}
