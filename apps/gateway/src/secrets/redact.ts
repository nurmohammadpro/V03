export function redactSecrets(text: string, secrets: string[]) {
  if (!text) return text;
  const normalized = secrets
    .map((s) => (typeof s === "string" ? s : ""))
    .map((s) => s.trim())
    .filter((s) => s.length >= 6)
    // longest first to avoid partially redacting longer values
    .sort((a, b) => b.length - a.length);

  if (normalized.length === 0) return text;

  let out = text;
  for (const secret of normalized) {
    // Split/join is fast and avoids regex escaping pitfalls.
    out = out.split(secret).join("[REDACTED]");
  }
  return out;
}

