"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowRight,LoaderCircle} from "lucide-react";

export default function ForgotPasswordForm(){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;setBusy(true);setError("");setMessage("");
  const form=event.currentTarget;
  const email=String(new FormData(form).get("email")||"").trim();
  try{
   const response=await fetch("/api/auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Permintaan belum dapat diproses.");
   setMessage(result.message||"Jika alamat tersebut terdaftar, tautan pemulihan akan dikirim.");
   form.reset();
  }catch(cause){setError(cause instanceof Error?cause.message:"Koneksi terputus. Coba lagi.");}
  finally{setBusy(false);}
 }
 return <form className="login-form" onSubmit={submit} aria-busy={busy}>
  <label htmlFor="recovery-email">Email yang terdaftar pada keanggotaan</label>
  <input id="recovery-email" name="email" type="email" autoComplete="email" maxLength={180} required disabled={busy}/>
  {error&&<p role="alert" className="login-error">{error}</p>}
  {message&&<p role="status" className="login-session-note">{message}</p>}
  <button className="login-submit" type="submit" disabled={busy}>{busy?<><LoaderCircle className="login-spin" size={18}/>Mengirim permintaan…</>:<>Kirim tautan pemulihan<ArrowRight size={18}/></>}</button>
  <p className="login-session-note">Tautan berlaku satu jam dan hanya dapat digunakan sekali. Kata sandi baru dibuat oleh pemilik akun, bukan oleh pengurus.</p>
  <p className="login-session-note"><Link href="/masuk">Kembali ke halaman masuk</Link></p>
 </form>;
}
