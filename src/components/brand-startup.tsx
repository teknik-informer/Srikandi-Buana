"use client";
import {useEffect,useState} from "react";
import BrandLoading from "./brand-loading";
export default function BrandStartup(){const [visible,setVisible]=useState(false);useEffect(()=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;try{if(sessionStorage.getItem("sb-brand-intro-10.5"))return}catch{/* Unavailable storage must not prevent access. */}setVisible(true);const timer=window.setTimeout(()=>{setVisible(false);try{sessionStorage.setItem("sb-brand-intro-10.5","1")}catch{}},1750);return()=>window.clearTimeout(timer)},[]);return visible?<BrandLoading startup/>:null}
