import {scrypt as scryptCallback,randomBytes,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export async function hashPassword(password){if(typeof password!=='string'||password.length<12||password.length>128)throw Error('Password harus 12–128 karakter.');const salt=randomBytes(16).toString('hex');const hash=await scrypt(password,salt,64);return 'scrypt:'+salt+':'+Buffer.from(hash).toString('hex')}
export async function verifyPassword(password,stored){if(typeof password!=='string'||password.length>128)return false;const parts=String(stored||'').split(':');const valid=parts.length===3&&parts[0]==='scrypt'&&/^[a-f0-9]{32}$/.test(parts[1])&&/^[a-f0-9]{128}$/.test(parts[2]);const salt=valid?parts[1]:'00000000000000000000000000000000';const hash=await scrypt(password,salt,64);return valid&&timingSafeEqual(Buffer.from(hash),Buffer.from(parts[2],'hex'))}
