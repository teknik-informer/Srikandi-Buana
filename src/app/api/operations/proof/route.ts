import {readLimitedMultipart, MultipartLimitError} from "@/lib/multipart-limit";
import { env } from "@/lib/runtime";
import { getAuthenticatedUser } from "@/lib/auth";
import { json, sameOrigin } from "@/lib/account-access";
import { sanitizeUploadedImage } from "@/lib/uploaded-image";
import { consumeRateLimit } from "@/lib/rate-limit";
import { canViewOperation, operationActions, proofKey } from "@/lib/enterprise/operations";
import { findOperation, operationDB, updateOperation, OperationError } from "@/lib/enterprise/repository";
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const user=await getAuthenticatedUser();if(!user)return json({error:'Silakan masuk.'},401);
 try{const item=await findOperation(user.userId,new URL(request.url).searchParams.get('id')||'');
 if(!item||!canViewOperation(user,item)||!item.proof_id||!env.BUCKET)return json({error:'Bukti tidak ditemukan.'},404);
 const file=await env.BUCKET.get(proofKey(user.userId,item.id));if(!file)return json({error:'Bukti tidak ditemukan.'},404);
 return new Response(file.body,{headers:{'Content-Type':item.proof_mime||'application/octet-stream','Content-Disposition':`${item.proof_mime==='application/pdf'?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(item.proof_name||'bukti')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch{return json({error:'Bukti belum dapat dimuat.'},503);}
}
export async function POST(request:Request){
 const user=await getAuthenticatedUser();if(!user)return json({error:'Silakan masuk.'},401);if(!sameOrigin(request))return json({error:'Permintaan lintas situs ditolak.'},403);
 if(Number(request.headers.get('content-length')||0)>4*1024*1024)return json({error:'Bukti maksimal 3 MB.'},413);
 try{const db=operationDB(),form=await readLimitedMultipart(request);if(form.get('accountId')!==user.accountId)return json({error:'Akun aktif berubah. Muat ulang.'},409);
 const item=await findOperation(user.userId,String(form.get('id')||''));if(!item||!canViewOperation(user,item))return json({error:'Pengajuan tidak ditemukan.'},404);
 if(!operationActions(user,item).includes('proof'))return json({error:'Bukti hanya dapat diubah pengaju pada tahap draf atau revisi.'},403);
 if(Number(form.get('version'))!==item.version)return json({error:'Pengajuan telah berubah. Muat ulang.'},409);
 const file=form.get('file');if(!(file instanceof File)||!file.size||file.size>3*1024*1024||file.name.length>180||/[<>:/\\\x00-\x1f]/.test(file.name))throw new OperationError('Pilih bukti PDF/JPG/PNG maksimal 3 MB dengan nama berkas yang valid.');
 const ext=file.name.split('.').pop()?.toLowerCase();if(!['pdf','jpg','jpeg','png'].includes(ext||''))throw new OperationError('Format bukti harus PDF, JPG atau PNG.');
 if(!await consumeRateLimit(db,'operations:proof:'+user.accountId,20,900000))return json({error:'Terlalu banyak unggahan. Coba setelah 15 menit.'},429);
 let bytes=await file.arrayBuffer();const mime=ext==='pdf'?'application/pdf':ext==='png'?'image/png':'image/jpeg';
 if(ext==='pdf'){if(Buffer.from(bytes).subarray(0,5).toString()!=='%PDF-')throw new OperationError('Isi berkas PDF tidak valid.');}else{try{bytes=await sanitizeUploadedImage(bytes,mime);}catch(e){throw new OperationError(e instanceof Error?e.message:'Gambar tidak valid.');}}
 const updated=await updateOperation(user,item,{proof_id:crypto.randomUUID(),proof_name:file.name,proof_mime:mime},'proof_updated','Bukti diperbarui: '+file.name,{object:{key:proofKey(user.userId,item.id),bytes,mime}});
 return json({ok:true,item:updated});
 }catch(error){return json({error:error instanceof MultipartLimitError?error.message:error instanceof OperationError?error.message:'Bukti belum tersimpan. Muat ulang untuk memeriksa sebelum mengunggah ulang.'},error instanceof MultipartLimitError?error.status:error instanceof OperationError?error.status:503);}
}
