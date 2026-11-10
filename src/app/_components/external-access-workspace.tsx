"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { programs } from "@/lib/srikandi";
import { Building2, CheckCircle2, Clipboard, Clock3, KeyRound, LoaderCircle, Plus, RefreshCw, Shield, ShieldAlert, UserRound, XCircle } from "lucide-react";

type Organization = {
  id: string;
  organization_type: "government" | "ngo" | "partner";
  legal_name: string;
  registration_ref: string;
  contact_email: string;
  verification_status: "pending" | "verified" | "suspended" | "rejected";
};
type Account = { id: string; organization_id: string; email: string; full_name: string; status: "invited" | "active" | "disabled" };
type Invitation = { id: string; account_id: string; email: string; expires_at: string; consumed_at: string | null; revoked_at: string | null; created_at: string };
type Scope = { type: "project" | "program" | "region" | "aggregate"; ref: string; permission: "read" | "aggregate" };
type Grant = {
  id: string; account_id: string; organization_id: string; purpose: string; status: "active" | "suspended" | "revoked";
  valid_from: string; valid_until: string; email: string; full_name: string; legal_name: string; scopes: Scope[];
};
type Data = { organizations: Organization[]; accounts: Account[]; grants: Grant[]; audit: { action: string; target_type: string; target_id: string; reason: string; created_at: string }[]; invitations: Invitation[] };
const organizationLabels: Record<string, string> = { government: "Pemerintah", ngo: "NGO / Lembaga Swadaya", partner: "Mitra" };
const statusLabels: Record<string, string> = { pending: "Menunggu verifikasi", verified: "Terverifikasi", suspended: "Ditangguhkan", rejected: "Ditolak", invited: "Undangan dikirim", active: "Aktif", disabled: "Dinonaktifkan", revoked: "Dicabut" };
const scopeLabels: Record<string, string> = { project: "Proyek", program: "Program", region: "Wilayah", aggregate: "Ringkasan agregat" };
const aggregateLabels: Record<string, string> = { members: "Anggota", land: "Luas lahan", harvest: "Hasil panen", aid: "Bantuan", project_progress: "Kemajuan proyek", project_finance: "Keuangan proyek" };
const today = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return parts.filter((part) => ["year", "month", "day"].includes(part.type)).map((part) => part.value).join("-");
};

export default function ExternalAccessWorkspace() {
  const [data, setData] = useState<Data>({ organizations: [], accounts: [], grants: [], audit: [], invitations: [] });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [organizationType, setOrganizationType] = useState("government"), [legalName, setLegalName] = useState(""), [registrationRef, setRegistrationRef] = useState(""), [contactEmail, setContactEmail] = useState("");
  const [organizationId, setOrganizationId] = useState(""), [fullName, setFullName] = useState(""), [email, setEmail] = useState(""), [purpose, setPurpose] = useState("");
  const [validFrom, setValidFrom] = useState(today()), [validUntil, setValidUntil] = useState(""), [scopeType, setScopeType] = useState<Scope["type"]>("program"), [scopeRef, setScopeRef] = useState(""), [scopes, setScopes] = useState<Scope[]>([]);
  const [invitationUrl, setInvitationUrl] = useState(""), [verifyReason, setVerifyReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/external-access", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Data akses eksternal belum dapat dimuat.");
      setData(result);
      setError("");
      setOrganizationId((current) => current || result.organizations[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selectedOrganization = useMemo(() => data.organizations.find((org) => org.id === organizationId), [data.organizations, organizationId]);

  async function submit(url: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Perubahan belum tersimpan.");
      setNotice("Perubahan berhasil disimpan.");
      await load();
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus. Periksa kembali status data.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await submit("/api/external-access", "POST", { action: "organization", organizationType, legalName, registrationRef, contactEmail });
    if (result?.id) {
      setLegalName(""); setRegistrationRef(""); setContactEmail(""); setOrganizationId(result.id);
    }
  }
  function addScope() {
    const ref = scopeRef.trim();
    if (!ref || scopes.some((scope) => scope.type === scopeType && scope.ref === ref)) return;
    setScopes((current) => [...current, { type: scopeType, ref, permission: scopeType === "aggregate" ? "aggregate" : "read" }]);
    setScopeRef("");
  }
  async function inviteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId || !scopes.length) { setError("Pilih organisasi dan setidaknya satu ruang lingkup."); return; }
    const result = await submit("/api/external-access", "POST", { action: "invite", organizationId, fullName, email, purpose, validFrom, validUntil, scopes });
    if (result?.invitationUrl) {
      setInvitationUrl(result.invitationUrl); setFullName(""); setEmail(""); setPurpose(""); setScopes([]);
    }
  }
  async function patch(action: string, id: string, reason: string, status?: string) {
    return submit("/api/external-access", "PATCH", { action, id, reason, ...(status ? { status } : {}) });
  }
  async function resendInvitation(account: Account) {
    const result = await patch("resend_invitation", account.id, "Pengiriman ulang tautan aktivasi setelah pemeriksaan administrator");
    if (result?.invitationUrl) setInvitationUrl(result.invitationUrl);
  }
  async function copyInvitation() {
    try { await navigator.clipboard.writeText(invitationUrl); setNotice("Tautan aktivasi disalin."); }
    catch { setError("Browser tidak mengizinkan penyalinan otomatis. Salin tautan dari kolom yang tersedia."); }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Tata kelola akses</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Akses Pemerintah & Mitra</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Daftarkan organisasi, verifikasi identitas lembaga, undang pengguna, dan tetapkan izin berbasis proyek atau program. Akses tidak pernah diberikan hanya berdasarkan jenis organisasi.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"><RefreshCw size={15}/> Muat ulang</button>
    </div>

    {(error || notice) && <div role={error ? "alert" : "status"} className={`rounded-xl border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>{error || notice}</div>}
    {invitationUrl && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={18}/> Undangan dibuat</div><p className="mt-1 text-sm">Bagikan tautan pribadi ini kepada penerima melalui kanal resmi. Tautan hanya dapat dipakai sekali dan berlaku 48 jam. Organisasi harus berstatus terverifikasi sebelum aktivasi.</p><div className="mt-3 flex flex-wrap gap-2"><input aria-label="Tautan aktivasi eksternal" readOnly value={invitationUrl} className="min-h-10 min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 text-xs text-slate-700"/><button onClick={() => void copyInvitation()} type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-800 px-3 text-sm font-semibold text-white"><Clipboard size={15}/> Salin</button></div></div>}

    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2"><Building2 size={19}/><h2 className="font-semibold">Daftarkan organisasi eksternal</h2></div>
        <form onSubmit={createOrganization} className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">Jenis organisasi<select value={organizationType} onChange={(e) => setOrganizationType(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"><option value="government">Pemerintah</option><option value="ngo">NGO / Lembaga Swadaya</option><option value="partner">Mitra</option></select></label>
          <label className="grid gap-1.5 text-sm font-medium">Nama resmi organisasi<input required minLength={2} maxLength={180} value={legalName} onChange={(e) => setLegalName(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="Nama instansi / lembaga"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Nomor registrasi / referensi (opsional)<input maxLength={120} value={registrationRef} onChange={(e) => setRegistrationRef(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="Nomor surat atau registrasi"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Email kontak resmi (opsional)<input type="email" maxLength={180} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3" placeholder="kontak@lembaga.go.id"/></label>
          <button disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"><Plus size={16}/> Daftarkan organisasi</button>
        </form>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2"><UserRound size={19}/><h2 className="font-semibold">Undang pengguna eksternal</h2></div>
        <form onSubmit={inviteAccount} className="mt-4 grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium">Organisasi<select required value={organizationId} onChange={(e) => { setOrganizationId(e.target.value); setScopes([]); }} className="min-h-10 rounded-lg border bg-background px-3"><option value="">Pilih organisasi</option>{data.organizations.map((org) => <option key={org.id} value={org.id}>{org.legal_name} · {statusLabels[org.verification_status]}</option>)}</select></label>
          {selectedOrganization && selectedOrganization.verification_status !== "verified" && <p className="rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-900">Organisasi belum terverifikasi. Undangan boleh disiapkan, tetapi aktivasi akun akan ditolak sampai verifikasi diselesaikan.</p>}
          <label className="grid gap-1.5 text-sm font-medium">Nama penerima<input required minLength={2} maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Email penerima<input required type="email" maxLength={180} value={email} onChange={(e) => setEmail(e.target.value)} className="min-h-10 rounded-lg border bg-background px-3"/></label>
          <label className="grid gap-1.5 text-sm font-medium">Tujuan pemberian akses<textarea required minLength={12} maxLength={500} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="min-h-20 rounded-lg border bg-background p-3" placeholder="Jelaskan kegiatan/proyek dan alasan data diperlukan."/></label>
          <div className="grid grid-cols-2 gap-3"><label className="grid gap-1.5 text-sm font-medium">Mulai berlaku<input required type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="min-h-10 rounded-lg border bg-background px-2"/></label><label className="grid gap-1.5 text-sm font-medium">Berakhir<input required type="date" min={validFrom} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="min-h-10 rounded-lg border bg-background px-2"/></label></div>
          <div className="rounded-xl border p-3">
            <p className="text-sm font-semibold">Scope data yang boleh dibaca</p>
            <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
              <select aria-label="Jenis scope" value={scopeType} onChange={(e) => { setScopeType(e.target.value as Scope["type"]); setScopeRef(""); }} className="min-h-10 min-w-0 rounded-lg border bg-background px-2 text-sm"><option value="program">Program terdaftar</option><option value="aggregate">Ringkasan agregat</option></select>
              {scopeType === "aggregate" ? <select aria-label="Jenis agregat" value={scopeRef} onChange={(e) => setScopeRef(e.target.value)} className="min-h-10 min-w-0 rounded-lg border bg-background px-2 text-sm"><option value="">Pilih agregat</option>{Object.entries(aggregateLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select> : <select aria-label="Program terdaftar" value={scopeRef} onChange={(e) => setScopeRef(e.target.value)} className="min-h-10 min-w-0 rounded-lg border bg-background px-2 text-sm"><option value="">Pilih program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.id}. {program.name}</option>)}</select>}
              <button type="button" onClick={addScope} disabled={!scopeRef.trim()} className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40"><Plus size={14}/> Tambah</button>
            </div>
            {scopes.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{scopes.map((scope) => <span key={scope.type+scope.ref} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">{scopeLabels[scope.type]}: {aggregateLabels[scope.ref] || scope.ref}<button type="button" onClick={() => setScopes((current) => current.filter((item) => item.type !== scope.type || item.ref !== scope.ref))} aria-label="Hapus scope"><XCircle size={14}/></button></span>)}</div> : <p className="mt-2 text-xs text-muted-foreground">Belum ada scope. Hanya program yang terdaftar dan ringkasan agregat yang dapat dipilih pada tahap ini. Scope proyek/wilayah dibuka setelah registri datanya siap.</p>}
          </div>
          <button disabled={busy || !data.organizations.length} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"><KeyRound size={16}/> Buat undangan & grant</button>
        </form>
      </section>
    </div>

    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2"><Shield size={19}/><h2 className="font-semibold">Organisasi terdaftar</h2></div>
      {loading ? <div className="mt-4 flex items-center gap-2 py-6 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" size={16}/> Memuat data…</div> : data.organizations.length ? <div className="mt-4 grid gap-3">{data.organizations.map((org) => <article key={org.id} className="rounded-xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{organizationLabels[org.organization_type]}</p><h3 className="font-semibold">{org.legal_name}</h3><p className="mt-1 text-xs text-muted-foreground">{org.contact_email || "Email kontak belum dicatat"}{org.registration_ref ? " · "+org.registration_ref : ""}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${org.verification_status === "verified" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{statusLabels[org.verification_status]}</span></div>
        {org.verification_status !== "verified" && <div className="mt-3 flex flex-wrap items-center gap-2"><input aria-label={"Alasan verifikasi "+org.legal_name} value={verifyReason} onChange={(e) => setVerifyReason(e.target.value)} minLength={10} maxLength={500} placeholder="Alasan / referensi verifikasi" className="min-h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm"/><button type="button" disabled={busy || verifyReason.trim().length < 10} onClick={() => void patch("verify_organization", org.id, verifyReason, "verified")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-40"><CheckCircle2 size={15}/> Verifikasi</button><button type="button" disabled={busy || verifyReason.trim().length < 10} onClick={() => void patch("verify_organization", org.id, verifyReason, "rejected")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"><XCircle size={15}/> Tolak</button></div>}
      </article>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Belum ada organisasi eksternal yang didaftarkan.</p>}
    </section>

    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2"><UserRound size={19}/><h2 className="font-semibold">Akun eksternal</h2></div>
      {data.accounts.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="pb-3 pr-4">Penerima</th><th className="pb-3 pr-4">Organisasi</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Tindakan</th></tr></thead><tbody>{data.accounts.map((account) => <tr key={account.id} className="border-b last:border-0"><td className="py-3 pr-4"><strong>{account.full_name}</strong><span className="block text-xs text-muted-foreground">{account.email}</span></td><td className="py-3 pr-4">{data.organizations.find((org) => org.id === account.organization_id)?.legal_name || "—"}</td><td className="py-3 pr-4">{statusLabels[account.status]}{account.status === "invited" && (() => { const invite = data.invitations.find((item) => item.account_id === account.id && !item.consumed_at && !item.revoked_at); return invite ? <span className="mt-1 block text-xs text-muted-foreground">Berlaku sampai {new Date(invite.expires_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</span> : null; })()}</td><td className="py-3"><div className="flex flex-wrap gap-3">{account.status === "invited" && <button type="button" disabled={busy || data.organizations.find((org) => org.id === account.organization_id)?.verification_status !== "verified"} onClick={() => void resendInvitation(account)} className="text-xs font-semibold text-emerald-800 underline underline-offset-4 disabled:opacity-40">Kirim ulang undangan</button>}{account.status !== "disabled" && <button type="button" disabled={busy} onClick={() => void patch("disable_account",account.id,"Penonaktifan oleh administrator")} className="text-xs font-semibold text-red-700 underline underline-offset-4 disabled:opacity-40">Nonaktifkan</button>}</div></td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-muted-foreground">Belum ada akun eksternal.</p>}
    </section>

    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2"><ShieldAlert size={19}/><h2 className="font-semibold">Grant dan masa berlaku</h2></div>
      {data.grants.length ? <div className="mt-4 grid gap-3">{data.grants.map((grant) => <article key={grant.id} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{grant.legal_name}</p><p className="text-xs text-muted-foreground">{grant.full_name} · {grant.email}</p><p className="mt-2 text-sm">{grant.purpose}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{statusLabels[grant.status]}</span></div><div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 size={13}/>{new Date(grant.valid_from).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })} – {new Date(grant.valid_until).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}</div><div className="mt-3 flex flex-wrap gap-2">{grant.scopes.map((scope) => <span key={scope.type+scope.ref} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{scopeLabels[scope.type]} · {aggregateLabels[scope.ref] || scope.ref}</span>)}</div>{grant.status !== "revoked" && <button type="button" disabled={busy} onClick={() => void patch("revoke_grant",grant.id,"Pencabutan oleh administrator setelah pemeriksaan")} className="mt-3 text-xs font-semibold text-red-700 underline underline-offset-4 disabled:opacity-40">Cabut grant</button>}</article>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Belum ada grant yang diberikan.</p>}
    </section>
    <p className="text-xs leading-5 text-muted-foreground">Verifikasi organisasi harus didasarkan pada pemeriksaan dokumen atau sumber resmi. Grant hanya membuka data yang benar-benar memiliki integrasi scope; jangan menetapkan ID proyek/program sebelum dicocokkan dengan catatan resmi.</p>
  </div>;
}
