export const metadata={title:"Halaman tidak ditemukan | Srikandi Buana",robots:{index:false,follow:false}};
import Link from 'next/link';
import {Sprout,ArrowRight} from 'lucide-react';
export default function NotFound(){return <section className="pub-not-found pub-container"><Sprout size={44}/><span className="pub-kicker">404 · HALAMAN TIDAK DITEMUKAN</span><h1>Mungkin jalurnya<br/><em>berbeda.</em></h1><p>Halaman ini belum tersedia atau sudah dipindahkan. Mari kembali ke beranda dan temukan informasi yang Anda cari.</p><div><Link className="pub-button" href="/">Kembali ke beranda <ArrowRight size={17}/></Link><Link className="pub-text-link" href="/program">Jelajahi program</Link></div></section>}
