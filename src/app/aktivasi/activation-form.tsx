"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Eye,EyeOff,ArrowRight} from "lucide-react";
export default function ActivationForm(){
  const token=useRef(""),external=useRef(false),emailChange=useRef(false),whatsapp=useRef(false),recovery=useRef(false);
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[visible,setVisible]=useState(false),[error,setError]=useState("");
  useEffect(()=>{
    const query=new URLSearchParams(location.search);
    external.current=query.get("audience")==="external";emailChange.current=query.get("mode")==="email";whatsapp.current=query.get("mode")==="whatsapp";recovery.current=query.get("mode")==="reset";
    const found=new URLSearchParams(location.hash.slice(1)).get("token");
    if(found)token.current=found;
    setReady(!!token.current);
    if(token.current)history.replaceState(null,"",location.pathname);
  },[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    const data=new FormData(event.currentTarget);
    try{
      const endpoint=external.current?"/api/auth/activate-external":"/api/auth/activate";
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:token.current,channel:whatsapp.current?"whatsapp":undefined,...(whatsapp.current?{phone:data.get("phone")}:{ }),...(emailChange.current?{}:{password:data.get("password"),confirmation:data.get("confirmation")})})});
      const result=await response.json();if(!response.ok)throw Error(result.error||"Aktivasi gagal.");
      location.assign(result.redirect);
    }catch(e){setError(e instanceof Error?e.message:"Koneksi terputus. Coba lagi.");setBusy(false);}
  }
  if(!ready)return <p role="status" className="login-error">Buka tautan aktivasi pribadi yang diberikan pengelola. Jika tautan kedaluwarsa atau sudah digunakan, minta undangan baru.</p>;
  return <form className="login-form" onSubmit={submit} aria-busy={busy}>
    {whatsapp.current?<><label htmlFor="setup-phone">Nomor WhatsApp yang dikonfirmasi Admin</label><input id="setup-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08xxxxxxxxxx" required maxLength={24} disabled={busy}/></>:<p className="login-session-note">Alamat email tujuan telah ditetapkan pada tautan pribadi ini. Anda tidak perlu memasukkannya kembali.</p>}
    {!emailChange.current&&<><label htmlFor="setup-password">Password baru</label>
    <div className="login-password"><input id="setup-password" name="password" type={visible?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy}/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?"Sembunyikan password":"Tampilkan password"}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
    <label htmlFor="setup-confirm">Ulangi password</label>
    <input id="setup-confirm" name="confirmation" type={visible?"text":"password"} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy}/></>}
    {error&&<p role="alert" className="login-error">{error}</p>}
    <button type="submit" className="login-submit" disabled={busy}>{busy?(emailChange.current?"Memverifikasi…":"Memproses…"):(emailChange.current?"Verifikasi email baru":recovery.current?"Simpan kata sandi baru & masuk":whatsapp.current?"Aktifkan akun & masuk":"Simpan password & masuk")}<ArrowRight size={18}/></button>
    <p className="login-session-note">{emailChange.current?"Email lama tetap berlaku sampai verifikasi berhasil. Setelah perubahan, semua sesi lama dicabut dan Anda perlu masuk kembali.":recovery.current?"Tautan pemulihan sekali pakai akan mengubah kata sandi dan mengakhiri sesi lama pada seluruh perangkat.":whatsapp.current?"Nomor ini telah dikonfirmasi melalui alur aktivasi telepon. Buat kata sandi pribadi untuk login.":"Password disimpan sebagai hash. Jangan bagikan password Anda melalui chat."}</p>
  </form>;
}
