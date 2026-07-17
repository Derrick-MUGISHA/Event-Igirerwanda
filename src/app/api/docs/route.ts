import { requireAdmin } from "@/lib/auth";
import { openApiSpec } from "@/lib/openapi";
import { ok, unauthorized } from "@/lib/http";

/* The OpenAPI description powers the Swagger UI at /admin/docs. It maps the
   whole private API surface, so it's locked to the super admin. */
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return unauthorized();
  return ok(openApiSpec);
}
