import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";
export const runtime = "nodejs";

export async function GET() {
  const dashboardPath = path.join(process.cwd(), "public", "provider-dashboard.html");
  const dashboardHtml = await readFile(dashboardPath, "utf8");

  return new Response(dashboardHtml, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
