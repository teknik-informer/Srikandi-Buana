import "server-only";

import { getV9Sql, rowsFromResult } from "@/lib/db";

export interface LoginPageHighlight {
  id: string;
  title: string;
  description: string;
}

export interface LoginPageContent {
  schemaVersion: 1;
  backLinkLabel: string;
  leftEyebrow: string;
  leftTitle: string;
  leftDescription: string;
  highlights: LoginPageHighlight[];
  cardEyebrow: string;
  cardTitle: string;
  cardDescription: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  loginButtonLabel: string;
  loginPendingLabel: string;
  securityNote: string;
  footerNote: string;
}

export const DEFAULT_LOGIN_PAGE_CONTENT: LoginPageContent = {
  schemaVersion: 1,
  backLinkLabel: "Kembali ke",
  leftEyebrow: "Ruang kerja internal",
  leftTitle: "Satu platform,\nbanyak pengalaman aplikasi.",
  leftDescription: "Pengurus mengelola organisasi, bidang menjalankan pekerjaan, anggota berpartisipasi, mitra menerima akses yang dibagikan — semuanya di atas satu sumber data.",
  highlights: [
    { id: "identity-access", title: "Identitas & cakupan akses terpusat", description: "Satu akun, kewenangan berbeda per aplikasi." },
    { id: "native-finance", title: "Keuangan native", description: "Tanpa aplikasi akuntansi eksternal; jurnal lewat posting service." },
    { id: "management-studio", title: "Studio Pengelola", description: "Website, form, dashboard, dan workflow dikelola sendiri." },
  ],
  cardEyebrow: "Masuk ke ekosistem",
  cardTitle: "Selamat datang kembali.",
  cardDescription: "Masukkan surel akun Anda. Hak akses ditentukan dari penugasan organisasi.",
  emailLabel: "Surel akun",
  emailPlaceholder: "nama@organisasi.id",
  passwordLabel: "Kata sandi",
  loginButtonLabel: "Masuk",
  loginPendingLabel: "Memeriksa akun…",
  securityNote: "Sesi menggunakan cookie HttpOnly. Peran dan cakupan akses diperiksa dari penugasan organisasi di server.",
  footerNote: "Akses terbatas untuk pengguna yang memiliki akun dan penugasan aktif.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeLoginPageContent(input: unknown): LoginPageContent {
  const value = isRecord(input) ? input : {};
  const base = DEFAULT_LOGIN_PAGE_CONTENT;
  const stringValue = (key: keyof Omit<LoginPageContent, "schemaVersion" | "highlights">) =>
    typeof value[key] === "string" ? value[key] as string : base[key] as string;
  const highlights = Array.isArray(value.highlights)
    ? value.highlights.filter(isRecord).slice(0, 8).map((item, index) => ({
        id: typeof item.id === "string" ? item.id : "highlight-" + index,
        title: typeof item.title === "string" ? item.title : "",
        description: typeof item.description === "string" ? item.description : "",
      }))
    : base.highlights;

  return {
    schemaVersion: 1,
    backLinkLabel: stringValue("backLinkLabel"),
    leftEyebrow: stringValue("leftEyebrow"),
    leftTitle: stringValue("leftTitle"),
    leftDescription: stringValue("leftDescription"),
    highlights,
    cardEyebrow: stringValue("cardEyebrow"),
    cardTitle: stringValue("cardTitle"),
    cardDescription: stringValue("cardDescription"),
    emailLabel: stringValue("emailLabel"),
    emailPlaceholder: stringValue("emailPlaceholder"),
    passwordLabel: stringValue("passwordLabel"),
    loginButtonLabel: stringValue("loginButtonLabel"),
    loginPendingLabel: stringValue("loginPendingLabel"),
    securityNote: stringValue("securityNote"),
    footerNote: stringValue("footerNote"),
  };
}

interface LoginContentRow { setting_value: unknown; }

/** Read only the public, organization-scoped copy shown on the sign-in screen. */
export async function getLoginPageContent(): Promise<LoginPageContent> {
  try {
    const sql = getV9Sql();
    const result = await sql`
      SELECT setting_value
      FROM v9.system_settings
      WHERE organization_id = v9.get_public_organization_id()
        AND setting_key = 'login_page_content'
        AND visibility = 'public'
      LIMIT 1
    `;
    const rows = rowsFromResult<LoginContentRow>(result);
    return normalizeLoginPageContent(rows[0]?.setting_value);
  } catch (reason) {
    const errorType = reason instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(reason.name) ? reason.name : "UnknownError";
    console.warn("[login-page-content] Defaults used", errorType);
    return DEFAULT_LOGIN_PAGE_CONTENT;
  }
}
