/** Minimal PostgreSQL statement splitter for migrations.
 * Handles quoted strings, line comments, block comments, and dollar-quoted function bodies.
 * Every statement is sent as a separate parameterized driver query.
 */
export function splitSQLStatements(input){
 const statements=[];let start=0,i=0,mode='normal',dollar='';
 while(i<input.length){const ch=input[i],next=input[i+1];
  if(mode==='normal'){
   if(ch==='-'&&next==='-'){mode='line';i+=2;continue}
   if(ch==='/'&&next==='*'){mode='block';i+=2;continue}
   if(ch==="'"){mode='single';i++;continue}
   if(ch==='"'){mode='double';i++;continue}
   if(ch==='$'){const match=/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(input.slice(i));if(match){mode='dollar';dollar=match[0];i+=dollar.length;continue}}
   if(ch===';'){const part=input.slice(start,i).trim();if(part&&part.replace(/--[^\n]*(?=\n|$)|\/\*[\s\S]*?\*\//g,'').trim())statements.push(part);start=i+1}
   i++;continue;
  }
  if(mode==='line'){if(ch==='\n')mode='normal';i++;continue}
  if(mode==='block'){if(ch==='*'&&next==='/'){mode='normal';i+=2}else i++;continue}
  if(mode==='single'){if(ch==="'"&&next==="'"){i+=2;continue}if(ch==="'")mode='normal';i++;continue}
  if(mode==='double'){if(ch==='"'&&next==='"'){i+=2;continue}if(ch==='"')mode='normal';i++;continue}
  if(mode==='dollar'){if(input.startsWith(dollar,i)){i+=dollar.length;mode='normal';continue}i++;continue}
 }
 if(mode==='block'||mode==='single'||mode==='double'||mode==='dollar')throw new Error('Migrasi SQL tidak lengkap: kutipan atau blok tidak ditutup.');
 const last=input.slice(start).trim();if(last&&last.replace(/--[^\n]*(?=\n|$)|\/\*[\s\S]*?\*\//g,'').trim())statements.push(last);
 return statements;
}
