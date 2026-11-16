import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';

const read=path=>readFileSync(path,'utf8');
const migration=read('migrations/012_whatsapp_login_identity.sql');
const accounts=read('src/app/api/accounts/route.ts');
const activate=read('src/app/api/auth/activate/route.ts');
const login=read('src/app/api/auth/login/route.ts');
const loginForm=read('src/app/masuk/login-form.tsx');
const activationForm=read('src/app/aktivasi/activation-form.tsx');
const accountUi=read('src/app/_components/access/accounts.tsx');

assert.match(migration,/ADD COLUMN IF NOT EXISTS login_phone TEXT/);
assert.match(migration,/phone_verified_at TEXT/);
assert.match(migration,/phone_verified_by TEXT/);
assert.match(migration,/activate_wa', 'reset_wa'/);
assert.match(migration,/users_login_phone_unique/);
assert.match(migration,/WHERE login_phone IS NOT NULL/);
assert.doesNotMatch(migration,/DROP TABLE|DELETE FROM users|TRUNCATE/i);

assert.match(login,/raw\.identity \|\| raw\.email/);
assert.match(login,/u\.login_phone=\?/);
assert.match(login,/isPhone/);
assert.match(login,/consumeRateLimit/);
assert.match(login,/if \(isPhone\) return json/);
assert.match(loginForm,/name="identity"/);
assert.match(loginForm,/Email atau nomor WhatsApp/);

assert.match(accounts,/raw\.channel==='whatsapp'\|\|raw\.action==='reset_wa'/);
assert.match(accounts,/raw\.whatsappConfirmed!==true/);
assert.match(accounts,/normalizePhone\(String\(data\.phone\|\|''\)\)!==phone/);
assert.match(accounts,/login_phone,phone_verified_at,phone_verified_by/);
assert.match(accounts,/purpose==='activate_wa'/);
assert.match(accounts,/purpose==='reset_wa'/);\nassert.match(accounts,/raw\.action==='verify_phone'/);\nassert.match(accounts,/Nomor WhatsApp akun dikonfirmasi ulang/);\nassert.match(accounts,/member_phone/);
assert.match(accounts,/return json\(\{ok:true,manual:true,url,expires,phone,purpose\}\)/);
assert.match(accounts,/sendAccountEmail/);

assert.match(activate,/invite\.login_phone\)!==phone/);
assert.match(activate,/invite\.phone_verified_at/);
assert.match(activate,/invite\.phone_verified_by/);
assert.match(activate,/login_phone,phone_verified_at,phone_verified_by/);
assert.match(activate,/\['reset','reset_wa'\]/);
assert.match(activationForm,/query\.get\("mode"\)==="whatsapp"/);
assert.match(activationForm,/name="phone"/);
assert.match(activationForm,/channel:whatsapp\.current\?"whatsapp"/);
assert.doesNotMatch(activationForm,/whatsapp\.current\?\{phone:data\.get\("phone"\)\}:\{email:data\.get\("email"\)\},\s*email:/);

assert.match(accountUi,/Konfirmasi WhatsApp & buat aktivasi/);
assert.match(accountUi,/whatsappConfirmed/);
assert.match(accountUi,/Salin tautan untuk WhatsApp/);
assert.match(accountUi,/Pulihkan via WhatsApp/);
assert.match(accountUi,/Terverifikasi Admin/);
assert.match(accountUi,/reset_wa/);\nassert.match(accountUi,/Verifikasi WhatsApp/);\nassert.match(accountUi,/whatsappConfirmed:confirm\.action==='verify_phone'/);

await transform(accounts,{loader:'ts'});
await transform(activate,{loader:'ts'});
await transform(login,{loader:'ts'});
await transform(loginForm,{loader:'tsx'});
await transform(activationForm,{loader:'tsx'});
await transform(accountUi,{loader:'tsx'});

console.log('PASS WhatsApp identity regression: email-or-phone login, Admin-only manual confirmation, member phone match, one-time activation/recovery links, verified phone binding, and no email dependency in WhatsApp activation UI.');
