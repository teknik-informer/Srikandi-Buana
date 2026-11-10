export const roles = {admin:'Administrator',ketua:'Ketua',sekretaris:'Sekretaris',bendahara:'Bendahara',koordinator:'Koordinator program',anggota:'Anggota'} as const;
export type Role=keyof typeof roles;
export type Principal={accountId:string;userId:string;email:string;displayName:string;avatarUrl?:string;fullName:string;role:Role;memberId:string|null;position:string;programIds:string[]};
export type AccessRecord={id:string;kind:string;data:Record<string,unknown>};
const secretariat=['anggota','pengurus','musyawarah','persetujuan','tindaklanjut','kegiatan','kehadiran','kelembagaan','register','transkripsi','publikasi','galeri','program','surat'];
const finance=['kas','aset'];
const coordination=['program','kegiatan','tindaklanjut','laporan_program'];

/** Role-level policy used by both server guards and navigation projections. */
export function canReadKindForRole(role:Role,kind:string){
 if(role==='admin'||role==='ketua')return true;
 if(role==='sekretaris')return secretariat.includes(kind)||kind==='laporan_program';
 if(role==='bendahara')return finance.includes(kind)||['program','kegiatan','laporan_program'].includes(kind);
 if(role==='koordinator')return coordination.includes(kind);
 return kind==='anggota'||kind==='kegiatan';
}
export function canReadKind(u:Principal,kind:string){return canReadKindForRole(u.role,kind)}
export function canWriteKind(u:Principal,kind:string){if(u.role==='admin')return true;if(u.role==='ketua')return kind==='tindaklanjut';if(u.role==='sekretaris')return secretariat.includes(kind);if(u.role==='bendahara')return finance.includes(kind);if(u.role==='koordinator')return coordination.includes(kind);return false}
export function canReadRecord(u:Principal,r:AccessRecord){if(!canReadKind(u,r.kind))return false;if(u.role==='anggota')return r.kind==='anggota'?r.id===u.memberId:r.kind==='kegiatan'&&['Direncanakan','Berjalan','Selesai'].includes(String(r.data.status));if(u.role==='koordinator')return u.programIds.includes(String(r.data.programId));return true}
export function canWriteRecord(u:Principal,r:AccessRecord){return canWriteKind(u,r.kind)&&(u.role!=='koordinator'||u.programIds.includes(String(r.data.programId)))}
export function visibleRecord(u:Principal,r:AccessRecord){if(u.role!=='anggota')return r;const keys=r.kind==='anggota'?['name','dusun','phone','role','status','verification']:['name','date','location','status'];return {...r,data:Object.fromEntries(keys.filter(k=>k in r.data).map(k=>[k,r.data[k]]))}}

/** Route visibility only; record-level scope must still be enforced by server handlers. */
export function canReadSectionForRole(role:Role,id:string){
 if(['notifikasi','penjualan'].includes(id))return true;
 if(id==='akuntansi')return ['admin','ketua','bendahara'].includes(role);
 if(['ringkasan','akun-saya','portal','pengajuan','monitoring','pengembangan'].includes(id))return true;
 if(role==='admin')return true;
 if(id==='enterprise')return ['ketua','sekretaris','bendahara'].includes(role);
 if(id==='dokumen')return ['sekretaris','bendahara','koordinator'].includes(role);
 if(['akun','sumber','panduan','pesan','pengaturan','dokumen'].includes(id))return false;
 if(id==='laporan')return true;
 return canReadKindForRole(role,id);
}
export function canReadSection(u:Principal,id:string){return canReadSectionForRole(u.role,id)}
