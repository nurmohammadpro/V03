import crypto from "node:crypto";

type EncPayload = {
  v: 1;
  alg: "aes-256-gcm";
  iv_b64: string;
  tag_b64: string;
  ct_b64: string;
};

function getKeyBytes(): Buffer {
  const raw = process.env.PROJECT_SECRETS_KEY_BASE64;
  if (!raw) {
    throw new Error("PROJECT_SECRETS_KEY_BASE64 is required to use project env vars");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("PROJECT_SECRETS_KEY_BASE64 must decode to 32 bytes (AES-256 key)");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getKeyBytes();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(plaintext, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload: EncPayload = {
    v: 1,
    alg: "aes-256-gcm",
    iv_b64: iv.toString("base64"),
    tag_b64: tag.toString("base64"),
    ct_b64: ct.toString("base64"),
  };
  return JSON.stringify(payload);
}

export function decryptSecret(payloadText: string): string {
  const key = getKeyBytes();
  let payload: EncPayload;
  try {
    payload = JSON.parse(payloadText) as EncPayload;
  } catch {
    throw new Error("Invalid encrypted secret payload");
  }
  if (!payload || payload.v !== 1 || payload.alg !== "aes-256-gcm") {
    throw new Error("Unsupported encrypted secret payload");
  }
  const iv = Buffer.from(payload.iv_b64, "base64");
  const tag = Buffer.from(payload.tag_b64, "base64");
  const ct = Buffer.from(payload.ct_b64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

