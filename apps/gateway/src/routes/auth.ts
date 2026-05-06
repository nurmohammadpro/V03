import { FastifyInstance } from "fastify";
import db from "../db";
import { users } from "../db/schema";
import { buildActorFromEmail } from "../middleware/auth";
import { eq } from "drizzle-orm";

// In-memory OTP store (for multi-node, use Redis)
const otpStore = new Map<string, { code: string; expires: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/send-otp
  app.post("/api/auth/send-otp", async (request, reply) => {
    const { email } = request.body as { email?: string };
    if (!email) {
      return reply.status(400).send({ error: "Email is required" });
    }

    const code = generateOTP();
    otpStore.set(email, { code, expires: Date.now() + 5 * 60 * 1000 });

    console.log(`[OTP] ${email}: ${code}`);

    // In production, send via email (nodemailer)
    return reply.send({ ok: true, message: "OTP sent" });
  });

  // POST /api/auth/verify-otp
  app.post("/api/auth/verify-otp", async (request, reply) => {
    const { email, code } = request.body as { email?: string; code?: string };
    if (!email || !code) {
      return reply.status(400).send({ error: "Email and code are required" });
    }

    const stored = otpStore.get(email);
    if (!stored) {
      return reply.status(400).send({ error: "No OTP requested" });
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(email);
      return reply.status(400).send({ error: "OTP expired" });
    }

    if (stored.code !== code) {
      return reply.status(400).send({ error: "Invalid OTP" });
    }

    otpStore.delete(email);

    let actor = await buildActorFromEmail(email);

    if (!actor) {
      const [user] = await db
        .insert(users)
        .values({
          email,
          plan: "free",
          status: "active",
        })
        .returning();

      actor = {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        plan: user.plan,
        status: user.status,
        isAdmin: false,
        roleKeys: [],
        permissionKeys: [],
      };
    }

    const token = app.jwt.sign({
      sub: actor.userId,
      email: actor.email,
      fullName: actor.fullName,
      plan: actor.plan,
      status: actor.status,
      isAdmin: actor.isAdmin,
      roleKeys: actor.roleKeys,
      permissionKeys: actor.permissionKeys,
    });

    return reply.send({ ok: true, token, user: actor });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (request, reply) => {
    try {
      await request.jwtVerify();
      const email = (request.user as { email?: string }).email;

      if (!email) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const actor = await buildActorFromEmail(email);

      if (!actor) {
        return reply.status(404).send({ error: "User not found" });
      }

      await db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, actor.userId));

      return reply.send({ user: actor });
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
}
