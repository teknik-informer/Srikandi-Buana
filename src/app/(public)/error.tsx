"use client";
import Link from 'next/link';
import {RefreshCw,Leaf} from 'lucide-react';
export default function PublicError({reset}:{reset:()=>void}){return <section className="pub-not-found pub-container"><Leaf size={42}/><span className="pub-kicker">INFORMASI BELUM DAPAT DIMUAT</span><h1>Mari coba<br/><em>sekali lagi.</em></h1><p>Halaman ini belum selesai dimuat. Silakan coba kembali atau lanjutkan dari beranda.</p><div><button className="pub-button" onClick={reset}><RefreshCw size={16}/>Coba lagi</button><Link className="pub-text-link" href="/">Kembali ke beranda</Link></div></section>}
