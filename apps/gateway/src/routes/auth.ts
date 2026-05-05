import { FastifyInstance } from "fastify";

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

    const token = app.jwt.sign({ email });
    return reply.send({ ok: true, token });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (request, reply) => {
    try {
      await request.jwtVerify();
      return reply.send({ user: { email: (request.user as any).email } });
    } catch {
      return reply.status(401).send({ error: "Unauthorized" });
    }
  });
}
