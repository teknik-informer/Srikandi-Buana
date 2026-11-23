import { revokeCurrentSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function GET() {
  await revokeCurrentSession();
  redirect("/masuk");
}
