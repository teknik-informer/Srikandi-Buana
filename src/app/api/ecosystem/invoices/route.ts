import { required, json, errorReply } from "@/lib/ecosystem/guard";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { consumeRateLimit } from "@/lib/rate-limit";
import { ensureDefaultLedgerAccounts } from "@/features/finance/record-posting";

export const dynamic = "force-dynamic";

const canReadAll = (role: string) => ["admin", "ketua", "bendahara"].includes(role);

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  const c = await required(request);
  if (c.error) return c.error;
  if (!canReadAll(c.user.role) && c.user.role !== "anggota") {
    return json({ error: "Akses faktur dibatasi." }, 403);
  }

  try {
    const openOnly = new URL(request.url).searchParams.get("open") === "1";
    const scope = canReadAll(c.user.role)
      ? "i.owner=?"
      : "i.owner=? AND i.customer_user_id=?";
    const args = canReadAll(c.user.role)
      ? [c.user.userId]
      : [c.user.userId, c.user.accountId];
    const status = openOnly ? " AND i.status <> 'paid'" : "";

    const rows = await c.db.prepare(`
      SELECT
        i.id,i.invoice_number,i.order_id,i.customer_user_id,i.customer_name,
        i.issue_date,i.due_date,i.total_amount,i.paid_total,
        (i.total_amount-i.paid_total) AS outstanding_amount,
        i.status,i.created,i.updated,
        o.product_name,o.quantity
      FROM commerce_sales_invoices i
      JOIN commerce_orders o
        ON o.id=i.order_id AND o.owner=i.owner
      WHERE ${scope}${status}
      ORDER BY i.issue_date DESC,i.created DESC
      LIMIT 200
    `).bind(...args).all();

    return json({ items: rows.results });
  } catch (error) {
    return errorReply(error);
  }
}

export async function POST(request: Request) {
  const c = await required(request, true);
  if (c.error) return c.error;
  if (c.user.role !== "admin") {
    return json({ error: "Penerbitan faktur hanya dapat dilakukan Administrator." }, 403);
  }

  try {
    const body = await readJsonObject(request, 1800);
    if (typeof body.orderId !== "string" || !/^[a-f0-9-]{36}$/i.test(body.orderId)) {
      return json({ error: "Pilih pesanan yang valid." }, 400);
    }

    const now = new Date().toISOString();
    const issueDate = body.issueDate === undefined || body.issueDate === ""
      ? now.slice(0, 10)
      : body.issueDate;
    const dueDate = body.dueDate === undefined || body.dueDate === ""
      ? null
      : body.dueDate;

    if (!validDate(issueDate) || (dueDate !== null && !validDate(dueDate))) {
      return json({ error: "Tanggal faktur atau jatuh tempo tidak valid." }, 400);
    }
    if (dueDate && dueDate < issueDate) {
      return json({ error: "Tanggal jatuh tempo tidak boleh sebelum tanggal faktur." }, 400);
    }

    if (!await consumeRateLimit(c.db, "commerce:invoice:" + c.user.accountId, 60, 3600000)) {
      return json({ error: "Batas penerbitan faktur tercapai. Coba lagi nanti." }, 429);
    }

    const existing = await c.db.prepare(`
      SELECT id,invoice_number,status,total_amount,paid_total
      FROM commerce_sales_invoices
      WHERE owner=? AND order_id=?
    `).bind(c.user.userId, body.orderId).first();

    if (existing) {
      return json({
        ok: true,
        reused: true,
        invoice: {
          id: existing.id,
          invoice_number: existing.invoice_number,
          status: existing.status,
          total_amount: existing.total_amount,
          paid_total: existing.paid_total,
        },
      });
    }

    const order = await c.db.prepare(`
      SELECT
        o.id,o.buyer_id,o.product_name,o.quantity,o.unit_price,o.total,o.status,
        u.full_name AS customer_name
      FROM commerce_orders o
      JOIN users u ON u.id=o.buyer_id AND u.workspace_owner=o.owner
      WHERE o.id=? AND o.owner=?
      LIMIT 1
    `).bind(body.orderId, c.user.userId).first();

    if (!order) return json({ error: "Pesanan tidak ditemukan pada organisasi ini." }, 404);
    if (String(order.status) !== "completed") {
      return json({ error: "Faktur hanya dapat diterbitkan setelah pesanan berstatus Selesai." }, 409);
    }

    const amount = Number(order.total);
    const customerName = String(order.customer_name ?? "").trim().slice(0, 160);
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_000 || !customerName) {
      return json({ error: "Nilai pesanan atau identitas pelanggan perlu diperiksa sebelum faktur diterbitkan." }, 409);
    }

    const accounts = await ensureDefaultLedgerAccounts(c.db, c.user.userId, now);
    const byCode = new Map(accounts.map((account) => [account.code, account]));
    const receivable = byCode.get("120002");
    const revenue = byCode.get("410003");
    if (!receivable || !revenue) {
      return json({ error: "Akun Piutang Dagang atau Pendapatan Penjualan belum tersedia." }, 503);
    }

    const invoiceId = crypto.randomUUID();
    const ledgerEntryId = crypto.randomUUID();
    const period = issueDate.slice(0, 4) + issueDate.slice(5, 7);

    // Number allocation can leave a harmless gap if a later transaction fails.
    // It is serialized by the organisation + period primary key.
    const sequence = await c.db.prepare(`
      INSERT INTO commerce_sales_invoice_sequences(owner,period,last_number)
      VALUES(?,?,1)
      ON CONFLICT(owner,period)
      DO UPDATE SET last_number=commerce_sales_invoice_sequences.last_number+1
      RETURNING last_number
    `).bind(c.user.userId, period).first();

    const sequenceNumber = Number(sequence?.last_number);
    if (!Number.isSafeInteger(sequenceNumber) || sequenceNumber <= 0) {
      return json({ error: "Nomor faktur belum dapat dialokasikan." }, 503);
    }

    const invoiceNumber = "SB-INV-" + period + "-" + String(sequenceNumber).padStart(5, "0");
    const reference = "INV-" + invoiceId;
    const memo = ("Faktur penjualan " + invoiceNumber + " · " + String(order.product_name)).slice(0, 500);

    try {
      await c.db.batch([
        c.db.prepare(`
          INSERT INTO ledger_entries(
            id,owner,actor_id,posted_date,memo,reference,created
          ) VALUES(?,?,?,?,?,?,?)
        `).bind(
          ledgerEntryId,c.user.userId,c.user.accountId,issueDate,memo,reference,now,
        ),
        c.db.prepare(`
          INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit)
          VALUES(?,?,?,?,?,?)
        `).bind(
          crypto.randomUUID(),c.user.userId,ledgerEntryId,receivable.id,amount,0,
        ),
        c.db.prepare(`
          INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit)
          VALUES(?,?,?,?,?,?)
        `).bind(
          crypto.randomUUID(),c.user.userId,ledgerEntryId,revenue.id,0,amount,
        ),
        c.db.prepare(`
          INSERT INTO commerce_sales_invoices(
            id,owner,order_id,invoice_number,customer_user_id,customer_name,
            issue_date,due_date,total_amount,paid_total,status,ledger_entry_id,
            actor_id,created,updated
          ) VALUES(?,?,?,?,?,?,?,NULLIF(?,'')::date,?,0,'issued',?,?,?,?)
        `).bind(
          invoiceId,c.user.userId,String(order.id),invoiceNumber,
          String(order.buyer_id),customerName,issueDate,dueDate ?? "",
          amount,ledgerEntryId,c.user.accountId,now,now,
        ),
        c.db.prepare(
          "INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)",
        ).bind(
          crypto.randomUUID(),c.user.userId,"Faktur penjualan diterbitkan",
          invoiceNumber + " · " + customerName,now,
        ),
      ]);
    } catch {
      const raced = await c.db.prepare(`
        SELECT id,invoice_number,status,total_amount,paid_total
        FROM commerce_sales_invoices
        WHERE owner=? AND order_id=?
      `).bind(c.user.userId, body.orderId).first();
      if (raced) {
        return json({
          ok: true,
          reused: true,
          invoice: {
            id: raced.id,
            invoice_number: raced.invoice_number,
            status: raced.status,
            total_amount: raced.total_amount,
            paid_total: raced.paid_total,
          },
        });
      }
      throw new Error("Faktur belum dapat diterbitkan. Periksa kembali status pesanan dan jurnal organisasi.");
    }

    return json({
      ok: true,
      reused: false,
      invoice: {
        id: invoiceId,
        invoice_number: invoiceNumber,
        order_id: order.id,
        customer_name: customerName,
        issue_date: issueDate,
        due_date: dueDate,
        total_amount: amount,
        paid_total: 0,
        outstanding_amount: amount,
        status: "issued",
      },
    }, 201);
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    return json({
      error: error instanceof Error && !/database|sql|neon/i.test(error.message)
        ? error.message
        : "Faktur belum dapat diterbitkan. Silakan periksa kesiapan database staging.",
    }, 503);
  }
}
