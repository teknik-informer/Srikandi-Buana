import { required, json, errorReply } from "@/lib/ecosystem/guard";
import { isModuleAvailableForUser } from "@/features/identity/access-policy";
import { readJsonObject, RequestBodyError } from "@/lib/request-body";
import { consumeRateLimit } from "@/lib/rate-limit";
import { ensureDefaultLedgerAccounts } from "@/features/finance/record-posting";
import { buildSalesInvoiceIssueStatement } from "@/features/commerce/sales-invoices";

export const dynamic = "force-dynamic";

const isDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

export async function GET(request: Request) {
  const context = await required(request);
  if (context.error) return context.error;
  if (!isModuleAvailableForUser(context.user, "pos")) {
    return json({ error: "Aplikasi POS sedang dinonaktifkan atau diblokir untuk akun ini." }, 403);
  }

  try {
    const canReadWorkspace = ["admin", "ketua", "sekretaris", "bendahara"].includes(context.user.role);
    const where = canReadWorkspace
      ? "i.owner=?"
      : "i.owner=? AND i.customer_user_id=?";
    const values = canReadWorkspace
      ? [context.user.userId]
      : [context.user.userId, context.user.accountId];
    const rows = await context.db.prepare(`
      SELECT
        i.id, i.order_id, i.invoice_number, i.customer_user_id, i.customer_name,
        i.issue_date, i.due_date, i.total_amount, i.paid_total,
        (i.total_amount - i.paid_total) AS outstanding,
        i.status, i.ledger_entry_id, i.created,
        o.product_name, o.quantity, o.unit_price
      FROM commerce_sales_invoices AS i
      JOIN commerce_orders AS o
        ON o.id=i.order_id AND o.owner=i.owner
      WHERE ${where}
      ORDER BY i.issue_date DESC, i.created DESC
      LIMIT 200
    `).bind(...values).all();

    return json({ items: rows.results });
  } catch (error) {
    return errorReply(error);
  }
}

export async function POST(request: Request) {
  const context = await required(request, true);
  if (context.error) return context.error;
  if (!isModuleAvailableForUser(context.user, "pos")) {
    return json({ error: "Aplikasi POS sedang dinonaktifkan atau diblokir untuk akun ini." }, 403);
  }
  if (!["admin", "bendahara"].includes(context.user.role)) {
    return json({ error: "Penerbitan faktur merupakan kewenangan Bendahara atau Administrator Sistem." }, 403);
  }

  try {
    const body = await readJsonObject(request, 2500);
    if (
      typeof body.orderId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(body.orderId) ||
      !isDate(body.issueDate) ||
      (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== "" && !isDate(body.dueDate))
    ) {
      return json({ error: "Pesanan, tanggal terbit, atau tanggal jatuh tempo tidak valid." }, 400);
    }
    const dueDate = typeof body.dueDate === "string" ? body.dueDate : "";
    if (dueDate && dueDate < body.issueDate) {
      return json({ error: "Tanggal jatuh tempo tidak boleh mendahului tanggal terbit." }, 400);
    }
    if (!await consumeRateLimit(context.db, "commerce:invoice-issue:" + context.user.accountId, 30, 3600000)) {
      return json({ error: "Batas penerbitan faktur per jam telah tercapai." }, 429);
    }

    const existing = await context.db.prepare(
      "SELECT id,invoice_number FROM commerce_sales_invoices WHERE owner=? AND order_id=?",
    ).bind(context.user.userId, body.orderId).first();
    if (existing) {
      return json({ error: "Pesanan sudah memiliki faktur " + String(existing.invoice_number) + "." }, 409);
    }

    const order = await context.db.prepare(
      "SELECT id,status FROM commerce_orders WHERE id=? AND owner=?",
    ).bind(body.orderId, context.user.userId).first();
    if (!order) return json({ error: "Pesanan tidak ditemukan dalam organisasi ini." }, 404);
    if (order.status !== "completed") {
      return json({ error: "Faktur hanya dapat diterbitkan setelah pesanan berstatus selesai." }, 409);
    }

    const now = new Date().toISOString();
    await ensureDefaultLedgerAccounts(context.db, context.user.userId, now);
    const accountRows = await context.db.prepare(
      "SELECT id,code FROM ledger_accounts WHERE owner=? AND active=TRUE AND code IN ('120002','410003')",
    ).bind(context.user.userId).all();
    const accountIds = new Map(accountRows.results.map((row) => [String(row.code), String(row.id)]));
    const receivableAccountId = accountIds.get("120002");
    const revenueAccountId = accountIds.get("410003");
    if (!receivableAccountId || !revenueAccountId) {
      return json({ error: "Akun Piutang Dagang atau Pendapatan Penjualan Usaha belum aktif. Periksa bagan akun." }, 409);
    }

    const issueDate = body.issueDate;
    const period = issueDate.slice(0, 7).replace("-", "");
    const statement = buildSalesInvoiceIssueStatement(context.db, {
      owner: context.user.userId,
      actorId: context.user.accountId,
      orderId: body.orderId,
      issueDate,
      dueDate,
      receivableAccountId,
      revenueAccountId,
      now,
    });
    const issued = await statement.first();
    if (!issued) {
      return json({ error: "Pesanan tidak lagi memenuhi syarat penerbitan faktur. Muat ulang daftar pesanan." }, 409);
    }
    return json({
      ok: true,
      id: String(issued.id),
      invoiceNumber: String(issued.invoice_number),
      totalAmount: Number(issued.total_amount),
      status: String(issued.status),
    }, 201);
  } catch (error) {
    if (error instanceof RequestBodyError) return json({ error: error.message }, error.status);
    const existing = await context.db.prepare(
      "SELECT id,invoice_number FROM commerce_sales_invoices WHERE owner=? AND order_id=?",
    ).bind(context.user.userId, String((error as { orderId?: unknown })?.orderId || "")).first().catch(() => null);
    if (existing) {
      return json({ error: "Pesanan sudah memiliki faktur " + String(existing.invoice_number) + "." }, 409);
    }
    return errorReply(error);
  }
}
