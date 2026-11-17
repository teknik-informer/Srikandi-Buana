import {neon} from '@neondatabase/serverless';
import {readdir,readFile} from 'node:fs/promises';
import {splitSQLStatements} from '../src/lib/sql-script.mjs';
import {databaseUrlForEnvironment} from '../src/features/shared/database-target.mjs';
import {compareMigrationNames} from '../src/features/shared/migration-audit.mjs';

const databaseUrl=databaseUrlForEnvironment(process.env);
if(!databaseUrl)throw Error(process.env.VERCEL_ENV==='preview'?'Preview memerlukan PREVIEW_DATABASE_URL khusus staging. Migrasi tidak dijalankan.':'Isi DATABASE_URL Neon pada .env.local atau environment Vercel.');

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

const appliedSet=new Set(appliedNames);
for(const name of migrationNames){
 if(appliedSet.has(name))continue;
 const statements=splitSQLStatements(await readFile(new URL('../migrations/'+name,import.meta.url),'utf8'));
 await sql.transaction([...statements.map(s=>sql.query(s)),sql.query('INSERT INTO public.schema_migrations(name,applied_at) VALUES($1,$2)',[name,new Date().toISOString()])]);
 appliedSet.add(name);
 console.log('Migrasi diterapkan: '+name);
}
