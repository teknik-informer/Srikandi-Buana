import {siteOrigin} from "@/lib/site-origin";
import type {MetadataRoute} from "next";
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/dashboard','/api/','/masuk','/aktivasi','/keluar']},sitemap:siteOrigin()+'/sitemap.xml'}}
