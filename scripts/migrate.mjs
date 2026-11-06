import {neon} from '@neondatabase/serverless';
import {readdir,readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw Error('Isi DATABASE_URL Neon pada .env.local atau environment Vercel.');
const sql=neon(process.env.DATABASE_URL);await sql.query('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)');
for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){
 const applied=await sql.query('SELECT name FROM schema_migrations WHERE name=$1',[name]);if(applied.length)continue;
 const statements=(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8')).split(';').map(s=>s.trim()).filter(Boolean);
 await sql.transaction([...statements.map(s=>sql.query(s)),sql.query('INSERT INTO schema_migrations(name,applied_at) VALUES($1,$2)',[name,new Date().toISOString()])]);console.log('Migrasi diterapkan: '+name);
}
