import type { NeonDatabase, PreparedStatement } from "@/lib/runtime";
import type { Data } from "@/lib/srikandi";

type AccountSpec = {
  code: string;
  name: string;
  category: "asset" | "liability" | "equity" | "revenue" | "expense";
};

type AccountRow = {
  id: string;
  code: string;
  name: string;
  category: string;
};

const SYSTEM_ACCOUNTS: readonly AccountSpec[] = [
  { code: "110001", name: "Kas Organisasi", category: "asset" },
  { code: "110002", name: "Kas Program", category: "asset" },
  { code: "110003", name: "Kas Usaha", category: "asset" },
  { code: "120001", name: "Piutang Simpan Pinjam Anggota", category: "asset" },
  { code: "130001", name: "Persediaan Usaha", category: "asset" },
  { code: "140001", name: "Peralatan dan Aset Tetap", category: "asset" },
  { code: "210001", name: "Simpanan Anggota", category: "liability" },
  { code: "210002", name: "Dana Titipan Program", category: "liability" },
  { code: "210003", name: "Utang Usaha", category: "liability" },
  { code: "310001", name: "Modal Kelompok", category: "equity" },
  { code: "410001", name: "Pendapatan Organisasi", category: "revenue" },
  { code: "410002", name: "Pendapatan Program", category: "revenue" },
  { code: "410003", name: "Pendapatan Penjualan Usaha", category: "revenue" },
  { code: "510001", name: "Beban Organisasi", category: "expense" },
  { code: "510002", name: "Beban Program", category: "expense" },
  { code: "510003", name: "Beban Usaha", category: "expense" },
  { code: "510004", name: "Beban Operasional Produksi", category: "expense" },
];

const FUND_CODES: Record<string, { cash: string }> = {
  Organisasi: { cash: "110001" },
  Program: { cash: "110002" },
  Usaha: { cash: "110003" },
};

/**
 * Adds a small, predictable starter chart of accounts without overwriting
 * accounts already configured by the organisation.
 */
export async function ensureDefaultLedgerAccounts(
  db: NeonDatabase,
  owner: string,
  now = new Date().toISOString(),
): Promise<AccountRow[]> {
  await db.batch(
    SYSTEM_ACCOUNTS.map((account) =>
      db.prepare(`
        INSERT INTO ledger_accounts(id,owner,code,name,category,active,created)
        VALUES(?,?,?,?,?,TRUE,?)
        ON CONFLICT(owner,code) DO NOTHING
      `).bind(
        crypto.randomUUID(),
        owner,
        account.code,
        account.name,
        account.category,
        now,
      ),
    ),
  );

  const codes = SYSTEM_ACCOUNTS.map((account) => account.code);
  const rows = await db.prepare(
    "SELECT id,code,name,category FROM ledger_accounts WHERE owner=? AND code IN (" +
      codes.map(() => "?").join(",") +
      ")",
  ).bind(owner, ...codes).all();
  const byCode = new Map(rows.results.map((row) => [String(row.code), row as AccountRow]));

  for (const expected of SYSTEM_ACCOUNTS) {
    const found = byCode.get(expected.code);
    if (!found || found.name !== expected.name || found.category !== expected.category) {
      throw new Error(
        "Kode akun sistem " + expected.code +
        " sudah digunakan untuk akun lain. Periksa daftar akun sebelum menghubungkan Buku Kas.",
      );
    }
  }

  return rows.results as AccountRow[];
}


/**
 * Converts a newly recorded cash-book transaction into one balanced journal.
 * Journal references are deterministic per legacy cash record, making retries
 * idempotent. Posted financial fields are immutable; corrections use a separate
 * adjustment transaction so the original audit trail is preserved.
 */
export async function buildCashLedgerPostingStatements(
  db: NeonDatabase,
  input: {
    owner: string;
    actorId: string;
    sourceId: string;
    data: Data;
    now: string;
  },
): Promise<PreparedStatement[]> {
  const { owner, actorId, sourceId, data, now } = input;
  const type = String(data.type ?? "");
  const fund = String(data.fund ?? "");
  const amount = Number(data.amount ?? 0);
  const postedDate = String(data.date ?? "");
  const description = String(data.name ?? "").trim();

  if (!sourceId || !description || !["Pemasukan", "Pengeluaran"].includes(type)) {
    throw new Error("Jenis, uraian, dan identitas transaksi Buku Kas harus lengkap sebelum diposting.");
  }
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_000) {
    throw new Error("Nominal Buku Kas harus berupa bilangan bulat positif yang valid.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(postedDate) ||
      Number.isNaN(Date.parse(postedDate)) ||
      new Date(postedDate).toISOString().slice(0, 10) !== postedDate) {
    throw new Error("Tanggal transaksi Buku Kas tidak valid.");
  }

  const fundCodes = FUND_CODES[fund];
  if (!fundCodes) {
    throw new Error("Pos dana Buku Kas tidak dikenali. Pilih Organisasi, Program, atau Usaha.");
  }

  const accounts = await ensureDefaultLedgerAccounts(db, owner, now);
  const byCode = new Map(accounts.map((account) => [account.code, account]));
  const cash = byCode.get(fundCodes.cash);
  if (!cash) throw new Error("Akun kas untuk pos dana ini belum lengkap.");

  const counterAccountId = String(data.counterAccountId ?? "");
  if (!counterAccountId) {
    throw new Error("Pilih akun lawan transaksi agar jurnal tidak salah klasifikasi.");
  }
  const counter = await db.prepare(
    "SELECT id,code,name,category,active FROM ledger_accounts WHERE id=? AND owner=? AND active=TRUE",
  ).bind(counterAccountId, owner).first();
  const allowedCounterCategories = type === "Pemasukan"
    ? ["asset", "liability", "equity", "revenue"]
    : ["asset", "liability", "equity", "expense"];
  if (!counter || !allowedCounterCategories.includes(String(counter.category)) || String(counter.id) === cash.id) {
    throw new Error(type === "Pemasukan"
      ? "Akun lawan untuk penerimaan harus berupa aset, kewajiban, modal, atau pendapatan; bukan kas sumber yang sama."
      : "Akun lawan untuk pengeluaran harus berupa aset, kewajiban, modal, atau beban; bukan kas sumber yang sama.");
  }

  const reference = "KAS-" + sourceId;
  const existing = await db.prepare(
    "SELECT id,posted_date,memo FROM ledger_entries WHERE owner=? AND reference=?",
  ).bind(owner, reference).first();

  const memo = (type + " Buku Kas · " + description + " · " + String(counter.code) + " " + String(counter.name)).slice(0, 500);
  const expectedLines = type === "Pemasukan"
    ? [
        { accountId: cash.id, debit: amount, credit: 0 },
        { accountId: String(counter.id), debit: 0, credit: amount },
      ]
    : [
        { accountId: String(counter.id), debit: amount, credit: 0 },
        { accountId: cash.id, debit: 0, credit: amount },
      ];

  if (existing) {
    const lines = await db.prepare(
      "SELECT account_id,debit,credit FROM ledger_lines WHERE owner=? AND entry_id=? ORDER BY account_id",
    ).bind(owner, String(existing.id)).all();
    const actual = lines.results.map((line) => ({
      accountId: String(line.account_id),
      debit: Number(line.debit),
      credit: Number(line.credit),
    }));
    const expected = [...expectedLines].sort((a, b) => a.accountId.localeCompare(b.accountId));
    const sameLines = actual.length === expected.length && actual.every((line, index) =>
      line.accountId === expected[index].accountId &&
      line.debit === expected[index].debit &&
      line.credit === expected[index].credit,
    );
    if (String(existing.posted_date) === postedDate && String(existing.memo) === memo && sameLines) {
      return [];
    }
    throw new Error(
      "Transaksi ini sudah dibukukan. Tanggal, uraian, jenis, pos dana, dan nominal tidak dapat diubah agar jurnal tetap utuh. Catat transaksi penyesuaian terpisah untuk koreksi.",
    );
  }

  const entryId = crypto.randomUUID();
  const statements: PreparedStatement[] = [
    db.prepare(
      "INSERT INTO ledger_entries(id,owner,actor_id,posted_date,memo,reference,created) VALUES(?,?,?,?,?,?,?)",
    ).bind(entryId, owner, actorId, postedDate, memo, reference, now),
    ...expectedLines.map((line) =>
      db.prepare(
        "INSERT INTO ledger_lines(id,owner,entry_id,account_id,debit,credit) VALUES(?,?,?,?,?,?)",
      ).bind(
        crypto.randomUUID(),
        owner,
        entryId,
        line.accountId,
        line.debit,
        line.credit,
      ),
    ),
    db.prepare(
      "INSERT INTO audit(id,owner,action,title,created) VALUES(?,?,?,?,?)",
    ).bind(
      crypto.randomUUID(),
      owner,
      "Buku Kas diposting ke Buku Besar",
      reference + " · " + description.slice(0, 180),
      now,
    ),
  ];

  return statements;
}
