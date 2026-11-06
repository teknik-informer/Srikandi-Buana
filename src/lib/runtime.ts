import {neon} from '@neondatabase/serverless';
import {postgresStatement} from './sql-compat';
type Row=Record<string,unknown>;
export class PreparedStatement{
 constructor(readonly database:NeonDatabase,readonly text:string,readonly args:unknown[]=[]){ }
 bind(...args:unknown[]){return new PreparedStatement(this.database,this.text,args)}
 async all(){return {results:(await this.database.execute(this)).rows as Row[]}}
 async first(){return (await this.all()).results[0]||null}
 async run(){const result=await this.database.execute(this);return {meta:{changes:result.rowCount}}}
}
export class NeonDatabase{
 private sql;constructor(url:string){this.sql=neon(url)}
 prepare(text:string){return new PreparedStatement(this,text)}
 async execute(statement:PreparedStatement){try{return await this.sql.query(postgresStatement(statement.text),statement.args,{fullResults:true})}catch{throw Error('Database belum dapat memproses permintaan.')}}
 async batch(statements:PreparedStatement[]){try{return await this.sql.transaction(statements.map(s=>this.sql.query(postgresStatement(s.text),s.args)),{fullResults:true,isolationLevel:'Serializable'})}catch{throw Error('Database belum dapat menyimpan perubahan.')}}
}
let connection:NeonDatabase|undefined;
function database(){if(!process.env.DATABASE_URL)return undefined;return connection??=new NeonDatabase(process.env.DATABASE_URL)}
const objects={
 async put(key:string,data:ArrayBuffer,options?:{httpMetadata?:{contentType?:string}}){const db=database();if(!db)throw Error('Database belum tersedia.');await db.prepare("INSERT INTO file_objects(key,content,content_type) VALUES(?,decode(?,'base64'),?) ON CONFLICT(key) DO UPDATE SET content=excluded.content,content_type=excluded.content_type").bind(key,Buffer.from(data).toString('base64'),options?.httpMetadata?.contentType||'application/octet-stream').run()},
 async get(key:string){const db=database();if(!db)return null;const object=await db.prepare("SELECT encode(content,'base64') AS content FROM file_objects WHERE key=?").bind(key).first();return object?{body:new Uint8Array(Buffer.from(String(object.content),'base64'))}:null},
 async delete(key:string){await database()?.prepare('DELETE FROM file_objects WHERE key=?').bind(key).run()}
};
export const env={get DB(){return database()},get BUCKET(){return database()?objects:undefined},get SRIKANDI_ADMIN_EMAIL(){return process.env.ADMIN_EMAIL},get SRIKANDI_SOURCE_KEY(){return process.env.SRIKANDI_SOURCE_KEY}};
