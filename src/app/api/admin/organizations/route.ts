import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Organization } from "@/models";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/http";

export async function GET(req: Request) {
  const admin = await requireAdmin(req, { superOnly: true });
  if (!admin) return unauthorized();

  await dbConnect();
  const orgs = await Organization.find().sort({ createdAt: 1 });
  return ok({
    organizations: orgs.map((o) => ({
      id: o._id,
      name: o.name,
      contactEmail: o.contactEmail,
      active: o.active,
    })),
  });
}

const Body = z.object({ name: z.string().min(2), contactEmail: z.string().email() });

export async function POST(req: Request) {
  const admin = await requireAdmin(req, { superOnly: true });
  if (!admin) return unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Name and a valid contact email are required");

  await dbConnect();
  /* the plain key is returned exactly once; only its hash is stored */
  const accessKey = randomBytes(12).toString("hex");
  const org = await Organization.create({
    name: parsed.data.name,
    contactEmail: parsed.data.contactEmail.toLowerCase(),
    accessKeyHash: await bcrypt.hash(accessKey, 10),
    addedBy: admin.id,
  });

  return ok({ organization: { id: org._id, name: org.name }, accessKey }, 201);
}
