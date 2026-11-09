"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, FileText, Plus, RefreshCw, Send, ShieldCheck } from "lucide-react";

type PolicyType =
  | "membership_dues"
  | "savings"
  | "loan"
  | "compensation"
  | "allowance"
  | "asset_use";

type PolicyStatus = "draft" | "submitted" | "approved" | "rejected" | "retired";

type Policy = {
  id: string;
  policy_code: string;
  policy_version: string;
  policy_type: PolicyType;
  policy_status: PolicyStatus;
  terms: { summary?: string; clauses?: string[] } | string;
  approval_document_id?: string | null;
  approval_document_title?: string | null;
  approved_at?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
};

type ApprovalDocument = {
  id: string;
  title: string;
  document_type: string;
  document_status: string;
  verification_status: string;
};

const types: Array<{value:PolicyType;label:string;description:string}> = [
  {value:"membership_dues",label:"Iuran anggota",description:"Dasar penetapan, periode, pengecualian dan pertanggungjawaban iuran"},
  {value:"savings",label:"Simpanan anggota",description:"Jenis simpanan, kepemilikan, setoran, penarikan dan penutupan rekening"},
  {value:"loan",label:"Simpan-pinjam",description:"Syarat pengajuan, persetujuan, plafon, jangka waktu dan biaya"},
  {value:"compensation",label:"Gaji / honorarium",description:"Dasar penugasan, periode, perhitungan, pemotongan dan bukti pembayaran"},
  {value:"allowance",label:"Tunjangan / insentif",description:"Kriteria, sumber dana, batas, persetujuan dan penyaluran"},
  {value:"asset_use",label:"Penggunaan aset",description:"Tata cara peminjaman, tanggung jawab, perawatan dan pengembalian"},
];

const statusLabel: Record<PolicyStatus,string> = {
  draft:"Draf",
  submitted:"Menunggu persetujuan",
  approved:"Disahkan",
  rejected:"Ditolak / perlu revisi",
  retired:"Tidak berlaku",
};

const input = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-offset-2 focus-visible:outline-primary";
const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";

async function request(method:"GET"|"POST"|"PATCH"="GET", payload?:Record<string,unknown>) {
  const response = await fetch("/api/ecosystem/member-finance/policies", {
    method,
    credentials:"same-origin",
    cache:"no-store",
    headers: payload ? {"Content-Type":"application/json"} : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Permintaan belum berhasil.");
  return result;
}

function policyTerms(policy:Policy) {
  if (typeof policy.terms === "string") {
    try {
      const parsed = JSON.parse(policy.terms);
      return parsed && typeof parsed === "object" ? parsed as {summary?:string;clauses?:string[]} : {};
    } catch {
      return {};
    }
  }
  return policy.terms || {};
}

export default function MemberFinancePolicies({role}:{role:string}) {
  const canDraft = ["admin","ketua","bendahara"].includes(role);
  const canApprove = ["admin","ketua"].includes(role);
  const [policies,setPolicies] = useState<Policy[]>([]);
  const [documents,setDocuments] = useState<ApprovalDocument[]>([]);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [form,setForm] = useState({policyCode:"",policyVersion:"1",policyType:"savings" as PolicyType,summary:"",clauses:""});
  const [approval,setApproval] = useState<Record<string,{documentId:string;effectiveFrom:string;effectiveUntil:string}>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request("GET");
      setPolicies(Array.isArray(data.policies) ? data.policies : []);
      setDocuments(Array.isArray(data.approvalDocuments) ? data.approvalDocuments : []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kebijakan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(() => { void reload(); },[reload]);

  async function createDraft(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request("POST",{
        action:"create",
        policyCode:form.policyCode,
        policyVersion:form.policyVersion,
        policyType:form.policyType,
        summary:form.summary,
        clauses:form.clauses.split("\n").map(value=>value.trim()).filter(Boolean),
      });
      setMessage("Draf kebijakan berhasil disimpan. Belum berlaku dan belum mengaktifkan transaksi.");
      setForm({policyCode:"",policyVersion:"1",policyType:form.policyType,summary:"",clauses:""});
      await reload();
      if (result.id) setMessage("Draf kebijakan berhasil disimpan. Lanjutkan pemeriksaan sebelum diajukan.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Draf kebijakan belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPolicy(id:string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request("PATCH",{action:"submit",id});
      setMessage("Kebijakan diajukan. Pengesahan masih menunggu Ketua atau Administrator.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pengajuan kebijakan gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function approvePolicy(event:FormEvent<HTMLFormElement>,id:string) {
    event.preventDefault();
    const value = approval[id];
    if (!value?.documentId || !value.effectiveFrom) {
      setError("Pilih dokumen pengesahan dan tanggal mulai berlaku.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request("PATCH",{
        action:"approve",
        id,
        approvalDocumentId:value.documentId,
        effectiveFrom:value.effectiveFrom,
        effectiveUntil:value.effectiveUntil || "",
      });
      setMessage("Kebijakan disahkan dengan dokumen bukti dan masa berlaku.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pengesahan kebijakan gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function rejectPolicy(id:string) {
    if (!window.confirm("Tandai kebijakan ini ditolak/perlu revisi? Perubahan akan dicatat dalam audit dan versi ini tidak dapat diajukan kembali.")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request("PATCH",{action:"reject",id});
      setMessage("Kebijakan ditolak. Perbaikan harus diajukan sebagai versi baru.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status penolakan belum dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5" aria-labelledby="member-finance-policy-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><ShieldCheck size={20}/></div>
          <div>
            <h2 id="member-finance-policy-title" className="text-lg font-semibold">Kebijakan Keuangan Anggota</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Susun aturan iuran, simpanan, pinjaman, honorarium dan tunjangan melalui proses draf, pengajuan, lalu pengesahan berbukti. Kebijakan yang belum disahkan tidak membuka rekening atau transaksi.
            </p>
          </div>
        </div>
        <button type="button" className={secondary} onClick={()=>void reload()} disabled={loading||busy}>
          <RefreshCw size={15}/> Muat ulang
        </button>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><AlertCircle size={16}/> Tidak ada tarif atau plafon yang diasumsikan</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Bunga, biaya pinjaman, plafon, jangka waktu, denda, nominal gaji dan tunjangan harus diisi berdasarkan keputusan kelompok. Profil/CV anggota tidak otomatis menentukan hak pinjaman, bantuan atau kompensasi.
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      {canDraft && (
        <form onSubmit={createDraft} className="space-y-4 rounded-xl border p-4">
          <div className="flex items-center gap-2"><Plus size={17}/><h3 className="font-semibold">Buat draf kebijakan baru</h3></div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-xs font-medium">Kode kebijakan
              <input className={input} required maxLength={40} placeholder="SIMPANAN-ANGGOTA" value={form.policyCode} onChange={e=>setForm(v=>({...v,policyCode:e.target.value.toUpperCase()}))}/>
            </label>
            <label className="space-y-1 text-xs font-medium">Versi
              <input className={input} required maxLength={20} placeholder="1.0" value={form.policyVersion} onChange={e=>setForm(v=>({...v,policyVersion:e.target.value}))}/>
            </label>
            <label className="space-y-1 text-xs font-medium">Jenis kebijakan
              <select className={input} value={form.policyType} onChange={e=>setForm(v=>({...v,policyType:e.target.value as PolicyType}))}>
                {types.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-xs font-medium">Ringkasan tujuan dan ruang lingkup
            <textarea className={input} rows={3} maxLength={1200} required value={form.summary} onChange={e=>setForm(v=>({...v,summary:e.target.value}))} placeholder="Tuliskan tujuan, sasaran, sumber dana dan ruang lingkup kebijakan sesuai hasil musyawarah."/>
          </label>
          <label className="block space-y-1 text-xs font-medium">Butir ketentuan (satu butir per baris)
            <textarea className={input} rows={5} maxLength={5000} value={form.clauses} onChange={e=>setForm(v=>({...v,clauses:e.target.value}))} placeholder={"Persyaratan peserta atau anggota…\nTata cara pengajuan dan verifikasi…\nMekanisme persetujuan dan pembayaran…\nDokumen serta pertanggungjawaban…"} />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Draf tidak mengubah saldo dan tidak membuat kewajiban keuangan.</p>
            <button type="submit" className={button} disabled={busy}><Plus size={15}/> Simpan draf</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Register kebijakan</h3>
          <span className="rounded-full border px-3 py-1 text-xs">{policies.length} versi</span>
        </div>
        {loading ? <p className="rounded-lg border p-5 text-sm text-muted-foreground">Memuat kebijakan…</p>
          : policies.length === 0 ? <div className="rounded-lg border p-6 text-center"><FileText className="mx-auto text-muted-foreground" size={22}/><p className="mt-2 text-sm font-medium">Belum ada kebijakan keuangan</p><p className="mt-1 text-xs text-muted-foreground">Mulai dengan draf hasil pembahasan kelompok. Jangan aktifkan transaksi sebelum kebijakan disahkan.</p></div>
          : policies.map(policy=>{
            const type = types.find(item=>item.value===policy.policy_type);
            const terms = policyTerms(policy);
            const currentApproval = approval[policy.id] || {documentId:"",effectiveFrom:"",effectiveUntil:""};
            return (
              <article key={policy.id} className="space-y-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{policy.policy_code} · v{policy.policy_version}</h4>
                      <span className="rounded-full border px-2 py-0.5 text-xs">{statusLabel[policy.policy_status]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{type?.label || policy.policy_type}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{policy.effective_from ? "Berlaku "+policy.effective_from : "Belum berlaku"}</span>
                </div>
                {terms.summary && <p className="text-sm leading-6">{terms.summary}</p>}
                {Array.isArray(terms.clauses)&&terms.clauses.length>0&&
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{terms.clauses.map((clause,index)=><li key={index}>{clause}</li>)}</ul>
                }
                {policy.approval_document_title&&
                  <p className="flex items-center gap-2 text-xs text-muted-foreground"><FileText size={14}/> Dokumen pengesahan: {policy.approval_document_title}</p>
                }
                {policy.policy_status==="draft"&&
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <p className="text-xs text-muted-foreground">Tinjau redaksi dan lampiran sebelum diajukan.</p>
                    <button type="button" className={button} disabled={busy} onClick={()=>void submitPolicy(policy.id)}><Send size={14}/> Ajukan persetujuan</button>
                  </div>
                }
                {policy.policy_status==="submitted"&&canApprove&&
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck size={16}/> Pengesahan Ketua / Administrator</div>
                    {documents.length===0 ? <p className="text-xs text-amber-700 dark:text-amber-400">Belum ada dokumen organisasi berstatus terverifikasi. Unggah dan verifikasi dokumen keputusan terlebih dahulu.</p>
                      : <form onSubmit={e=>void approvePolicy(e,policy.id)} className="grid gap-3 md:grid-cols-3">
                        <label className="space-y-1 text-xs font-medium md:col-span-3">Dokumen keputusan yang disahkan
                          <select required className={input} value={currentApproval.documentId} onChange={e=>setApproval(v=>({...v,[policy.id]:{...currentApproval,documentId:e.target.value}}))}>
                            <option value="">Pilih dokumen terverifikasi</option>
                            {documents.map(document=><option key={document.id} value={document.id}>{document.title}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1 text-xs font-medium">Mulai berlaku
                          <input required type="date" className={input} value={currentApproval.effectiveFrom} onChange={e=>setApproval(v=>({...v,[policy.id]:{...currentApproval,effectiveFrom:e.target.value}}))}/>
                        </label>
                        <label className="space-y-1 text-xs font-medium">Akhir berlaku (opsional)
                          <input type="date" className={input} value={currentApproval.effectiveUntil} onChange={e=>setApproval(v=>({...v,[policy.id]:{...currentApproval,effectiveUntil:e.target.value}}))}/>
                        </label>
                        <div className="flex items-end"><button type="submit" className={button} disabled={busy}><CheckCircle2 size={15}/> Sahkan kebijakan</button></div>
                        <p className="text-xs text-muted-foreground md:col-span-3">Pengesahan terkunci oleh database. Perubahan berikutnya harus dibuat sebagai versi kebijakan baru.</p>
                      </form>
                    }
                    <div className="flex justify-end">
                      <button type="button" className={secondary} disabled={busy} onClick={()=>void rejectPolicy(policy.id)}>Tolak / minta versi revisi</button>
                    </div>
                  </div>
                }
                {policy.policy_status==="approved"&&
                  <p className="flex items-center gap-2 border-t pt-3 text-xs text-emerald-700 dark:text-emerald-400"><CheckCircle2 size={15}/> Disahkan · {policy.approved_at ? new Date(policy.approved_at).toLocaleDateString("id-ID") : "Tanggal disahkan tercatat"} · Perubahan memerlukan versi baru.</p>
                }
                {policy.policy_status==="rejected"&&
                  <p className="border-t pt-3 text-xs text-amber-700 dark:text-amber-400">Perlu revisi. Buat versi baru setelah hasil musyawarah atau keputusan diperbarui.</p>
                }
              </article>
            );
          })
        }
      </div>
    </section>
  );
}
