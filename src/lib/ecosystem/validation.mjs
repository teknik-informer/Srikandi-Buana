export function moneyInteger(v,limit=1000000000000){return typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=limit}
export function textField(v,max=160){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=max?v.trim():null}
export function skuValid(v){return typeof v==='string'&&/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(v)}
export function sameOwner(user,owner){return user?.userId===owner}
export function balancedLines(lines){return Array.isArray(lines)&&lines.length>=2&&lines.length<=50&&lines.every(l=>l&&typeof l==='object'&&typeof l.accountId==='string'&&/^[0-9a-f-]{36}$/i.test(l.accountId)&&moneyInteger(l.debit)&&moneyInteger(l.credit)&&((l.debit>0&&l.credit===0)||(l.credit>0&&l.debit===0)))&&lines.reduce((s,l)=>s+l.debit,0)===lines.reduce((s,l)=>s+l.credit,0)&&lines.reduce((s,l)=>s+l.debit,0)>0}
export function localHref(value){return typeof value==='string'&&value.startsWith('/dashboard')&&!value.startsWith('//')&&!/[\\\x00-\x1f]/.test(value)}
