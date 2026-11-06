import BrandStartup from "@/components/brand-startup";
import {pageMetadata} from "@/lib/seo";
import {siteOrigin} from "@/lib/site-origin";
import type { Metadata,Viewport } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import PwaProvider from "./_components/pwa-provider";
import "./globals.css";
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#123d32',colorScheme:'light'};
export const metadata:Metadata={...pageMetadata("/"),metadataBase:new URL(siteOrigin()),applicationName:'Srikandi Buana',other:{'mobile-web-app-capable':'yes'},manifest:'/manifest.webmanifest',title:'KWT Srikandi Buana | Ngadimulyo, Kedu, Temanggung',description:'Portal dan administrasi Kelompok Wanita Tani Srikandi Buana, Ngadimulyo, Kedu, Temanggung.',icons:{icon:[{url:'/favicon.ico?v=10.5',sizes:'16x16 32x32 48x48',type:'image/x-icon'},{url:'/favicon.svg?v=10.5',type:'image/svg+xml'},{url:'/icons/icon-32.png',sizes:'32x32',type:'image/png'}],apple:[{url:'/apple-touch-icon.png?v=10.5',sizes:'180x180',type:'image/png'},{url:'/icons/apple-touch-152.png',sizes:'152x152',type:'image/png'},{url:'/icons/apple-touch-167.png',sizes:'167x167',type:'image/png'}],other:[{rel:'mask-icon',url:'/safari-pinned-tab.svg',color:'#123d32'}]},appleWebApp:{capable:true,title:'Srikandi Buana',statusBarStyle:'default'},formatDetection:{telephone:false},openGraph:{type:'website',locale:'id_ID',siteName:'KWT Srikandi Buana',title:'Srikandi Buana',description:'Tumbuh bersama. Berdaya bersama. Kelompok Wanita Tani di Ngadimulyo, Kedu, Temanggung.',images:[{url:'/social/srikandi-buana-1200x630.png',width:1200,height:630,alt:'Srikandi Buana — Pertanian, Pemberdayaan, Kemandirian'}]},twitter:{card:'summary_large_image',title:'Srikandi Buana',description:'Tumbuh bersama. Berdaya bersama.',images:['/social/srikandi-buana-1200x630.png']}};
export default function Layout({children}: {children: React.ReactNode}) {return <html lang="id" suppressHydrationWarning><body><TooltipProvider><PwaProvider><BrandStartup/>{children}</PwaProvider><Toaster richColors position="top-center" /></TooltipProvider></body></html>}
