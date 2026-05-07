import nodemailer from "nodemailer";

function parseBoolean(value?: string) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getMailerConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: parseBoolean(process.env.SMTP_SECURE) || port === 465,
    user,
    pass,
    from,
  };
}

export async function sendOtpEmail(email: string, code: string) {
  const config = getMailerConfig();

  if (!config) {
    return { delivered: false as const, reason: "missing_mailer_env" as const };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: email,
    subject: "Your V03 sign-in code",
    text: `Your V03 sign-in code is ${code}. It expires in 5 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
        <p>Your V03 sign-in code is:</p>
        <p style="font-size:28px;font-weight:600;letter-spacing:0.18em;margin:16px 0">${code}</p>
        <p>This code expires in 5 minutes.</p>
      </div>
    `,
  });

  return { delivered: true as const };
}
