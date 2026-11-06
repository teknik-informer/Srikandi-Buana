/** Translate the existing parameterized application statements to PostgreSQL. */
export function postgresStatement(input:string){
 let sql=input.replace(/json_each\(json_extract\((\w+(?:\.\w+)?),'\$\.memberIds'\)\)\s+j/g,"jsonb_array_elements_text(($1::jsonb)->'memberIds') AS j(value)")
 .replace(/json_extract\((\w+(?:\.\w+)?),'\$\.([A-Za-z0-9_]+)'\)/g,"($1::jsonb ->> '$2')")
 .replace(/\binstr\(/g,'strpos(');
 const ignore=/INSERT OR IGNORE/i.test(sql);sql=sql.replace(/INSERT OR IGNORE/ig,'INSERT');if(ignore)sql+=' ON CONFLICT DO NOTHING';
 let index=0;return sql.replace(/\?/g,()=>'$'+(++index));
}
