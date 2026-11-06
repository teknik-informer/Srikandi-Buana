import {required,json,errorReply} from '@/lib/ecosystem/guard';
export const dynamic='force-dynamic';
export async function GET(request:Request){const c=await required(request);if(c.error)return c.error;if(c.user.role!=='admin')return json({error:'Riwayat stok hanya tersedia bagi administrator.'},403);
 try{const rows=await c.db.prepare('SELECT m.id,p.sku,p.name,m.change_amount,m.stock_before,m.stock_after,m.created FROM commerce_stock_history m JOIN commerce_products p ON p.id=m.product_id AND p.owner=m.owner WHERE m.owner=? ORDER BY m.created DESC LIMIT 100').bind(c.user.userId).all();return json({items:rows.results})}catch(e){return errorReply(e)}
}
