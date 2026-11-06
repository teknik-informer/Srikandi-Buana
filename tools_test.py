from pathlib import Path
import json, subprocess, sys, hashlib
root=Path('/mnt/data/srikandi_v114')
types=['.ts','.tsx','.mts','.cts']
files=[p for p in root.rglob('*') if p.is_file() and p.suffix in types and 'node_modules' not in p.parts]
# TypeScript compiler global exists, with JS parser direct AST
script='''const fs=require('fs'),ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');const files=JSON.parse(fs.readFileSync(0,'utf8'));let issues=[];for(const f of files){const data=fs.readFileSync(f,'utf8'),file=ts.createSourceFile(f,data,ts.ScriptTarget.Latest,true,f.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);for(const d of file.parseDiagnostics)issues.push({f,message:ts.flattenDiagnosticMessageText(d.messageText,' ')});}process.stdout.write(JSON.stringify({checked:files.length,issues}));'''
p=subprocess.run(['node','-e',script],input=json.dumps([str(p) for p in files]),capture_output=True,text=True)
assert p.returncode==0,p.stderr
r=json.loads(p.stdout)
print(json.dumps(r,ensure_ascii=False)[:3000]);sys.exit(1 if r['issues'] else 0)
