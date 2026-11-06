import {neon} from '@neondatabase/serverless';
import {readdir,readFile} from 'node:fs/promises';
import {splitSQLStatements} from '../src/lib/sql-script.mjs';
import {databaseUrlForEnvironment} from '../src/features/shared/database-target.mjs';
const databaseUrl=databaseUrlForEnvironment(process.env);
if(!databaseUrl)throw Error(process.env.VERCEL_ENV==='preview'?'Preview memerlukan PREVIEW_DATABASE_URL khusus staging. Migrasi tidak dijalankan.':'Isi DATABASE_URL Neon pada .env.local atau environment Vercel.');
const sql=neon(databaseUrl);await sql.query('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)');
for(const name of (await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort()){
 const applied=await sql.query('SELECT name FROM schema_migrations WHERE name=$1',[name]);if(applied.length)continue;
 const statements=splitSQLStatements(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
 await sql.transaction([...statements.map(s=>sql.query(s)),sql.query('INSERT INTO schema_migrations(name,applied_at) VALUES($1,$2)',[name,new Date().toISOString()])]);console.log('Migrasi diterapkan: '+name);
}
