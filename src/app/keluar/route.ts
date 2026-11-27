import { redirect } from "next/navigation";

/**
 * GET must be side-effect free. Next.js can prefetch visible Link targets,
 * so revoking a session here would sign users out before they click anything.
 * The explicit POST Server Action in src/app/actions/auth.ts performs logout.
 */
export async function GET() {
  redirect("/app");
}
