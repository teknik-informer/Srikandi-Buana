import {env} from './runtime';
import {canReadRecord,visibleRecord,type Principal} from './permissions';

/** Files are visible only when attached to a readable record or uploaded by this account. */
export async function allowedFileIds(user:Principal) {
  if(!env.DB)return new Set<string>();
  const rows=await env.DB.prepare('SELECT id,kind,data FROM records WHERE owner=?').bind(user.userId).all();
  const ids=new Set<string>();
  for(const row of rows.results){
    try{
      const record={id:String(row.id),kind:String(row.kind),data:JSON.parse(String(row.data)) as Record<string,unknown>};
      if(!canReadRecord(user,record))continue;
      const data=visibleRecord(user,record).data;
      for(const key of ['attachmentId','fileId'])if(data[key])ids.add(String(data[key]));
    }catch{
      // An unreadable or malformed record must never grant file access.
    }
  }
  const ownFiles=await env.DB.prepare('SELECT id FROM files WHERE owner=? AND uploader_id=? AND deleted_at IS NULL').bind(user.userId,user.accountId).all();
  for(const file of ownFiles.results)ids.add(String(file.id));
  return ids;
}

export const canUpload=(user:Principal)=>['admin','sekretaris','bendahara','koordinator'].includes(user.role);
