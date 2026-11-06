import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2).filter(value=>value!=='--strictPort').map(value=>value==='--host'?'--hostname':value);
const child=spawn(process.execPath,[fileURLToPath(new URL('../node_modules/next/dist/bin/next',import.meta.url)),'dev','--webpack',...args],{stdio:'inherit'});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code??1));
