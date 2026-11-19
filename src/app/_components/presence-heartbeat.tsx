"use client";
import {useEffect} from "react";

export default function PresenceHeartbeat(){
 useEffect(()=>{
  let active=true;
  const ping=()=>{
   if(!active||typeof document==="undefined"||document.visibilityState!=="visible")return;
   void fetch("/api/auth/presence",{method:"GET",credentials:"same-origin",cache:"no-store"}).catch(()=>{});
  };
  ping();
  const timer=typeof window.setInterval==="function"?window.setInterval(ping,60000):null;
  const canListen=typeof document!=="undefined"&&typeof document.addEventListener==="function";
  if(canListen)document.addEventListener("visibilitychange",ping);
  return()=>{active=false;if(timer!==null&&typeof window.clearInterval==="function")window.clearInterval(timer);if(canListen)document.removeEventListener("visibilitychange",ping);};
 },[]);
 return null;
}
