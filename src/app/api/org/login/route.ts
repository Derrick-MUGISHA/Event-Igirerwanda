import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbConnect } from "@/lib/db";
import { Organization } from "@/models";
import { signAuthToken } from "@/lib/auth";
import { ok, fail } from "@/lib/http";

const Body = z.object({ accessKey: z.string().min(8) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Access key is required");

  await dbConnect();
  /* partner orgs are few, so checking the key against each is fine */
  const orgs = await Organization.find({ active: true });
  for (const org of orgs) {
    if (await bcrypt.compare(parsed.data.accessKey, org.accessKeyHash)) {
      const accessToken = await signAuthToken({ kind: "org", sub: org._id.toString() }, "1d");
      return ok({ accessToken, organization: { name: org.name } });
    }
  }
  return fail("Invalid access key", 401);
}
