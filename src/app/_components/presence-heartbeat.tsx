"use client";
import {useEffect} from "react";

export default function PresenceHeartbeat(){
 useEffect(()=>{
  let active=true;
  const ping=()=>{
   if(!active||document.visibilityState!=="visible")return;
   void fetch("/api/auth/presence",{method:"GET",credentials:"same-origin",cache:"no-store"}).catch(()=>{});
  };
  ping();
  const timer=window.setInterval(ping,60000);
  document.addEventListener("visibilitychange",ping);
  return()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",ping);};
 },[]);
 return null;
}
