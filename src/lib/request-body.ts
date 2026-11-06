export class RequestBodyError extends Error {constructor(message:string,public status=400){super(message);this.name='RequestBodyError'}}
/** Enforce the byte limit on streamed bodies even when Content-Length is absent. */
export async function readJsonObject(request:Request,maxBytes=40000):Promise<Record<string,unknown>>{
 if(Number(request.headers.get('content-length')||0)>maxBytes)throw new RequestBodyError('Ukuran formulir melebihi batas.',413);
 const reader=request.body?.getReader();if(!reader)throw new RequestBodyError('Formulir tidak boleh kosong.');
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new RequestBodyError('Ukuran formulir melebihi batas.',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength}
 let result:unknown;try{result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(body))}catch{throw new RequestBodyError('Format formulir tidak valid.')}
 if(!result||typeof result!=='object'||Array.isArray(result))throw new RequestBodyError('Formulir harus berupa objek data.');return result as Record<string,unknown>;
}
