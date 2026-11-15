import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';

const read=path=>readFileSync(path,'utf8');
const migration=read('migrations/011_verified_email_change.sql');
const accounts=read('src/app/api/accounts/route.ts');
const activate=read('src/app/api/auth/activate/route.ts');
const form=read('src/app/aktivasi/activation-form.tsx');
const page=read('src/app/_components/access/accounts.tsx');

assert.match(migration,/purpose IN \('activate', 'reset', 'change_email'\)/);
assert.match(migration,/users_email_lower_unique ON users \(lower\(email\)\)/);
assert.match(migration,/Duplicate case-insensitive user emails/);
assert.doesNotMatch(migration,/DELETE FROM users|TRUNCATE|DROP TABLE/i);

assert.match(accounts,/raw\.action==='change_email'&&u\.role!=='admin'/);
assert.match(accounts,/target\.role==='admin'\|\|target\.role==='ketua'\|\|target\.id===u\.accountId/);
assert.match(accounts,/purpose==='change_email'&&!target\.enabled/);
assert.match(accounts,/lower\(email\)=lower\(\?\)/);
assert.match(accounts,/purpose==='change_email'\?baseLink\.replace\('\/aktivasi#','\/aktivasi\?mode=email#'\)/);
assert.match(accounts,/Verifikasi perubahan email diminta/);

assert.match(activate,/invite\.purpose!=='change_email'&&raw\.password!==raw\.confirmation/);
assert.match(activate,/i\.target_user_id AND u\.workspace_owner=i\.owner/);
assert.match(activate,/u\.role NOT IN \('admin','ketua'\)/);
assert.match(activate,/lower\(other\.email\)=lower\(i\.email\)/);
assert.match(activate,/DELETE FROM sessions s USING changed u WHERE s\.user_id=u\.id/);
assert.match(activate,/INSERT INTO access_audit/);
assert.match(activate,/redirect:'\/masuk\?emailChanged=1'/);

assert.match(form,/query\.get\("mode"\)==="email"/);
assert.match(form,/emailChange\.current\?\{\}:\{password:data\.get\("password"\)/);
assert.match(form,/Verifikasi email baru/);
assert.match(form,/!emailChange\.current&&/);
assert.match(page,/architectMode&&u\.role!=='ketua'/);
assert.match(page,/action:'change_email'/);

await transform(accounts,{loader:'ts'});
await transform(activate,{loader:'ts'});
await transform(form,{loader:'tsx'});
await transform(page,{loader:'tsx'});

console.log('PASS verified email change regression contracts: Architect-only initiation, protected accounts, one-time token purpose, case-insensitive uniqueness, atomic target/workspace update, session revocation, audit, and email-only verification UI.');
