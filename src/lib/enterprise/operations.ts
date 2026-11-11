import type { Principal } from "../permissions";
export const categories = { purchase: "Pengadaan", expense: "Penggantian biaya", asset_loan: "Peminjaman aset", administration: "Layanan administrasi", activity_permission: "Izin kegiatan / tugas" } as const;
export const statuses = { draft: "Draf", submitted: "Diajukan", revision: "Perlu revisi", approved: "Disetujui", rejected: "Ditolak", cancelled: "Dibatalkan", in_progress: "Dipinjamkan", completed: "Selesai" } as const;
export type Category = keyof typeof categories;
export type OperationStatus = keyof typeof statuses;
export type Operation = { id: string; owner: string; requester_id: string; requester_name: string; category: Category; title: string; description: string; amount: number; fund: string; asset_id: string | null; quantity: number; desired_date: string; end_date: string; status: OperationStatus; version: number; last_event_id: string; cash_record_id: string | null; proof_id: string | null; proof_name: string | null; proof_mime: string | null; created: string; updated: string };
export type OperationInput = Pick<Operation,"category"|"title"|"description"|"amount"|"fund"|"asset_id"|"quantity"|"desired_date"|"end_date">;
export const isFinancial = (category: Category) => category === "purchase" || category === "expense";
export const canReview = (user: Principal) => user.role === "ketua";
export const canInspectOperations = (user: Principal) => ["admin", "ketua"].includes(user.role);
export function canFulfillCategory(user: Principal, category: Category) { return (isFinancial(category) || category === "asset_loan" ? user.role === "bendahara" : user.role === "sekretaris"); }
export function canViewOperation(user: Principal, item: Operation) {
  return item.owner === user.userId && (item.requester_id === user.accountId || canInspectOperations(user) && item.status !== "draft" || canFulfillCategory(user,item.category) && ["approved","in_progress","completed"].includes(item.status));
}
export function operationActions(user: Principal, item: Operation): string[] {
  if (!canViewOperation(user,item)) return [];
  const mine = item.requester_id === user.accountId, actions: string[] = [];
  if (mine && ["draft","revision"].includes(item.status)) actions.push("edit","submit","proof");
  if (mine && ["draft","revision","submitted","approved"].includes(item.status)) actions.push("cancel");
  if (!mine && canReview(user) && item.status === "submitted") actions.push("approve","request_revision","reject");
  if (!mine && canFulfillCategory(user,item.category)) {
    if (item.status === "approved") actions.push("fulfill");
    if (item.status === "in_progress" && item.category === "asset_loan") actions.push("return");
    if (item.status === "completed" && isFinancial(item.category)) actions.push("reopen");
  }
  return actions;
}
export function validDay(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
export function validateOperation(raw: unknown, complete: boolean): OperationInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("Isian pengajuan tidak valid.");
  const data=raw as Record<string,unknown>, category=String(data.category) as Category;
  if (!(Object.hasOwn(categories,category))) throw Error("Pilih jenis layanan yang tersedia.");
  const title=String(data.title||"").trim(),description=String(data.description||"").trim();
  if (!title || title.length>160) throw Error("Judul wajib diisi, maksimal 160 karakter.");
  if (description.length>5000 || complete && description.length<10) throw Error("Jelaskan kebutuhan minimal 10, maksimal 5.000 karakter sebelum mengajukan.");
  const amount=isFinancial(category)?Number(data.amount||0):0, quantity=category==='asset_loan'?Number(data.quantity||0):0;
  if (!Number.isSafeInteger(amount)||amount<0||amount>1e12||complete&&isFinancial(category)&&amount===0) throw Error("Nominal harus rupiah bulat positif, maksimal 1 triliun.");
  if (!Number.isSafeInteger(quantity)||quantity<0||quantity>1e6||complete&&category==='asset_loan'&&quantity===0) throw Error("Isi jumlah aset berupa bilangan bulat positif.");
  const fund=String(data.fund||"Organisasi");if(!["Organisasi","Program","Usaha"].includes(fund))throw Error("Pos dana tidak valid.");
  const desired_date=String(data.desired_date||""),end_date=category==='asset_loan'?String(data.end_date||""):"";
  if (desired_date&&!validDay(desired_date)||end_date&&!validDay(end_date)||complete&&!desired_date) throw Error("Isi tanggal kebutuhan yang valid.");
  if (category==='asset_loan'&&complete&&(!end_date||end_date<desired_date))throw Error("Tanggal pengembalian harus sama atau setelah tanggal peminjaman.");
  const asset_id=category==='asset_loan'&&data.asset_id?String(data.asset_id):null;
  if(asset_id&&asset_id.length>100||complete&&category==='asset_loan'&&!asset_id)throw Error("Pilih aset yang akan dipinjam.");
  return {category,title,description,amount,fund,asset_id,quantity,desired_date,end_date};
}
export const cleanOperation=(row: Record<string,unknown>)=>({...row,amount:Number(row.amount),quantity:Number(row.quantity),version:Number(row.version)}) as Operation;
export const proofKey=(owner:string,id:string)=>owner+"/operational-proof/"+id;
