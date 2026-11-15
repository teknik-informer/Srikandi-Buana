import {getAuthenticatedUser} from "@/lib/auth";
import {env} from "@/lib/runtime";
import type {Principal} from "@/lib/permissions";
import type {ReportGroupId} from "@/lib/enterprise-reporting";

export const dynamic = "force-dynamic";
const groups: ReportGroupId[] = ["operasional","keanggotaan","administrasi","keuangan","usaha","publikasi"];
function canRead(user: Principal, group: ReportGroupId, createdBy: string) {
  if (user.role === "ketua") return true;
  if (user.role === "sekretaris") return ["operasional","keanggotaan","administrasi","publikasi"].includes(group);
  if (user.role === "bendahara") return ["keuangan","usaha"].includes(group);
  return user.role === "koordinator" && group === "operasional" && createdBy === user.accountId;
}
function csvCell(value: unknown) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]!));
}
function flatten(value: unknown, prefix = "", output: Array<[string,string]> = []): Array<[string,string]> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string,unknown>)) flatten(child, prefix ? prefix + "." + key : key, output);
  } else if (Array.isArray(value)) {
    output.push([prefix, value.map(item => typeof item === "object" ? JSON.stringify(item) : String(item ?? "")).join("; ")]);
  } else output.push([prefix, value == null ? "" : String(value)]);
  return output;
}
export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({error:"Silakan masuk untuk mengekspor paket laporan."},{status:401,headers:{"Cache-Control":"private, no-store"}});
  if (user.role === "admin" || user.role === "anggota" || !env.DB)
    return Response.json({error:"Akses ekspor paket laporan tidak tersedia."},{status:403,headers:{"Cache-Control":"private, no-store"}});
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  const format = url.searchParams.get("format") || "csv";
  if (!id || id.length > 80 || !["csv","print"].includes(format))
    return Response.json({error:"Identitas paket atau format ekspor tidak valid."},{status:400});
  try {
    const pkg = await env.DB.prepare(`SELECT p.id,p.group_id,p.title,p.period_start,p.period_end,p.package_version,p.status,p.snapshot,p.snapshot_hash,p.created_at,p.created_by,p.approved_at,p.approved_by,p.approval_note,u.full_name AS approver_name FROM report_packages p LEFT JOIN users u ON u.id=p.approved_by WHERE p.id=? AND p.owner=?`).bind(id,user.userId).first();
    if (!pkg || pkg.status !== "approved" || !groups.includes(String(pkg.group_id) as ReportGroupId) ||
      !canRead(user,String(pkg.group_id) as ReportGroupId,String(pkg.created_by)))
      return Response.json({error:"Paket tidak ditemukan, belum disetujui, atau berada di luar kewenangan akun."},{status:404,headers:{"Cache-Control":"private, no-store"}});
    const snapshot = typeof pkg.snapshot === "string" ? JSON.parse(pkg.snapshot) : pkg.snapshot;
    if (user.role === "ketua" && snapshot && typeof snapshot === "object" && Array.isArray(snapshot.rows)) {
      snapshot.rows = snapshot.rows.map((row: Record<string,unknown>) => {
        const data = row.data && typeof row.data === "object" ? row.data as Record<string,unknown> : {};
        if (["kehadiran","transkripsi","anggota","persetujuan"].includes(String(row.kind))) {
          const safe = {...data};
          for (const key of ["name","fullName","phone","email","address","nik","memberIds","memberNames","content","body","notes"]) delete safe[key];
          if (row.kind === "kehadiran") safe.count = Math.max(Array.isArray(data.memberIds)?data.memberIds.length:0,Array.isArray(data.memberNames)?data.memberNames.length:0);
          return {...row,data:safe};
        }
        const allowed = ["date","status","type","category","programId","period","code"];
        return {...row,data:Object.fromEntries(allowed.filter(key=>key in data).map(key=>[key,data[key]]))};
      });
    }
    const rows = flatten(snapshot);
    const metadata: Array<[string,string]> = [
      ["Organisasi","KWT Srikandi Buana"],
      ["Judul",String(pkg.title)],
      ["Domain",String(pkg.group_id)],
      ["Periode",(pkg.period_start || "Tidak dibatasi") + " – " + (pkg.period_end || "Tidak dibatasi")],
      ["Versi",String(pkg.package_version)],
      ["Status","Disetujui"],
      ["Disetujui oleh",String(pkg.approver_name || pkg.approved_by || "Tidak tercatat")],
      ["Waktu persetujuan",String(pkg.approved_at || "")],
      ["Catatan persetujuan",String(pkg.approval_note || "")],
      ["SHA-256",String(pkg.snapshot_hash)],
      ["Dibuat pada",String(pkg.created_at)],
    ];
    const allRows = [...metadata,["",""],...rows];
    const filename = "srikandi-buana-" + String(pkg.group_id) + "-v" + String(pkg.package_version);
    if (format === "csv") {
      const body = "\uFEFF" + [["Bagian","Nilai"],...allRows].map(row=>row.map(csvCell).join(",")).join("\r\n");
      return new Response(body,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":'attachment; filename="'+filename+'.csv"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
    }
    const table = allRows.map(([key,value])=>"<tr><th>"+escapeHtml(key)+"</th><td>"+escapeHtml(value)+"</td></tr>").join("");
    const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(pkg.title)} — KWT Srikandi Buana</title><style>body{font:14px/1.55 Arial,sans-serif;color:#17251d;margin:36px auto;max-width:900px;padding:0 24px}h1{font-size:22px;margin:0}p{color:#526258}.meta{border-bottom:2px solid #356b48;padding-bottom:18px;margin-bottom:20px}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border:1px solid #d9e2dc;padding:8px;overflow-wrap:anywhere}th{width:27%;background:#f3f7f4}button{padding:10px 16px;border:0;border-radius:6px;background:#245b3c;color:white;cursor:pointer;margin:0 0 20px}@media print{body{margin:0;max-width:none;padding:0}button{display:none}tr{break-inside:avoid} @page{size:A4;margin:16mm}}</style></head><body><button onclick="window.print()">Cetak / Simpan sebagai PDF</button><header class="meta"><h1>KWT Srikandi Buana</h1><p>Dokumen ekspor paket laporan yang telah disetujui</p></header><h2>${escapeHtml(pkg.title)}</h2><table><tbody>${table}</tbody></table></body></html>`;
    return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":'inline; filename="'+filename+'.html"',"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
  } catch {
    return Response.json({error:"Ekspor belum dapat dibuat. Periksa kembali paket dan migrasi database."},{status:503,headers:{"Cache-Control":"private, no-store"}});
  }
}
