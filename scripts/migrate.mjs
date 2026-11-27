import {neon} from '@neondatabase/serverless';
import {readdir,readFile} from 'node:fs/promises';
import {splitSQLStatements} from '../src/lib/sql-script.mjs';
import {databaseUrlForEnvironment} from '../src/features/shared/database-target.mjs';
import {compareMigrationNames} from '../src/features/shared/migration-audit.mjs';

const target=String(process.env.MIGRATION_TARGET||'').trim().toLowerCase();
if(!['local','qa','preview','production'].includes(target)){
 throw Error('Migrasi dihentikan. Tetapkan MIGRATION_TARGET secara eksplisit ke local, qa, preview, atau production.');
}
if(process.env.VERCEL_ENV==='production'&&target!=='production'){
 throw Error('Migrasi dihentikan. Environment Vercel Production wajib menggunakan MIGRATION_TARGET=production.');
}
if(process.env.VERCEL_ENV==='preview'&&target!=='preview'){
 throw Error('Migrasi dihentikan. Environment Vercel Preview wajib menggunakan MIGRATION_TARGET=preview.');
}
if(target==='production'&&process.env.PRODUCTION_MIGRATION_APPROVAL!=='SRIKANDI_BUANA_PRODUCTION_MIGRATION_APPROVED'){
 throw Error('Migrasi Production diblokir. Persetujuan eksplisit PRODUCTION_MIGRATION_APPROVAL belum diberikan.');
}
if(target==='preview'&&process.env.VERCEL_ENV!=='preview'){
 throw Error('Target preview hanya boleh dijalankan dari deployment Preview dengan PREVIEW_DATABASE_URL.');
}

const databaseUrl=databaseUrlForEnvironment(process.env);
if(!databaseUrl)throw Error(target==='preview'?'Preview memerlukan PREVIEW_DATABASE_URL khusus staging. Migrasi tidak dijalankan.':'Isi DATABASE_URL Neon pada environment yang memang dituju.');
if(target==='qa'&&!/qa|staging|sanitized/i.test(String(process.env.DATABASE_TARGET_LABEL||''))){
 throw Error('Target QA memerlukan DATABASE_TARGET_LABEL yang secara eksplisit menandai database QA/sanitized.');
}

const sql=neon(databaseUrl);
const migrationNames=(await readdir(new URL('../migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort();
const ledgerCheck=await sql.query("SELECT to_regclass('public.schema_migrations') AS table_name");
if(!ledgerCheck[0]?.table_name)await sql.query('CREATE TABLE IF NOT EXISTS public.schema_migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL)');

const appliedRows=await sql.query('SELECT name FROM public.schema_migrations ORDER BY name');
const appliedNames=appliedRows.map(row=>String(row.name));
const comparison=compareMigrationNames(migrationNames,appliedNames);
if(comparison.databaseOnly.length){
 console.error('Database migration history contains entries without matching repository SQL:');
 for(const name of comparison.databaseOnly)console.error(' - '+name);
 throw Error('Migrasi dihentikan. Rekonsiliasi migration history terlebih dahulu; tidak ada migrasi baru yang dijalankan.');
}
if(target==='production'&&comparison.repositoryOnly.length){
 console.error('Pending Production migrations require a separate approved release manifest:');
 for(const name of comparison.repositoryOnly)console.error(' - '+name);
 if(process.env.PRODUCTION_MIGRATION_FILES!==comparison.repositoryOnly.join(',')){
  throw Error('Migrasi Production diblokir. PRODUCTION_MIGRATION_FILES harus mencantumkan persis seluruh file pending yang telah ditinjau dan disetujui.');
 }
}

const appliedSet=new Set(appliedNames);
for(const name of migrationNames){
 if(appliedSet.has(name))continue;
 const statements=splitSQLStatements(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
 await sql.transaction([...statements.map(s=>sql.query(s)),sql.query('INSERT INTO public.schema_migrations(name,applied_at) VALUES($1,$2)',[name,new Date().toISOString()])]);
 appliedSet.add(name);
 console.log('Migrasi diterapkan ('+target+'): '+name);
}
