"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCOUNT_BY_KEY, DEMO_ACCOUNTS, SESSION_COOKIE } from "@/lib/session";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const key = String(formData.get("key") ?? "");

  const account =
    (key && ACCOUNT_BY_KEY[key]) ||
    DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email);

  if (!account) return { error: "Akun demo tidak ditemukan. Pilih salah satu akun demo di samping." };
  if (account.password !== password) return { error: "Kata sandi salah. Untuk demo gunakan demo1234." };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, account.key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect(account.identity.home);
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/masuk");
}

export async function switchContext(key: string): Promise<void> {
  if (!ACCOUNT_BY_KEY[key]) redirect("/masuk");
  const jar = await cookies();
  jar.set(SESSION_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect(ACCOUNT_BY_KEY[key].identity.home);
}
