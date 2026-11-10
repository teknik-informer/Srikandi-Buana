/** RFC4180 CSV; prevent Excel/Calc formula execution from user-editable fields. */
export function csvCell(value){
 let s=String(value??'').replace(/\u0000/g,'');
 if(/^[\s\u200b-\u200d]*[=+@-]/u.test(s)||/^[\t\r\n]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
export function csvRows(rows){return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'}
