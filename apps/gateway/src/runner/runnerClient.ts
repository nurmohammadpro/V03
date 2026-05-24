import { readExportedTarball } from "./exportProjectToTarGz";

const RUNNER_URL = process.env.RUNNER_URL || "http://localhost:3002";

export async function runnerStartRun(input: {
  runId: string;
  mode: "build" | "dev";
  tarPath: string;
  env?: Record<string, string>;
}) {
  const buffer = await readExportedTarball(input.tarPath);
  const url = new URL(`${RUNNER_URL}/runs/raw`);
  url.searchParams.set("runId", input.runId);
  url.searchParams.set("mode", input.mode);

  const headers: Record<string, string> = { "Content-Type": "application/gzip" };
  if (input.env && Object.keys(input.env).length > 0) {
    const json = JSON.stringify(input.env);
    headers["x-v03-env-b64"] = Buffer.from(json, "utf8").toString("base64");
  }

  const res = await fetch(url, { method: "POST", headers, body: buffer });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Runner error ${res.status}`);
  }

  return res.json() as Promise<{
    containerId: string;
    url: string;
    ports: Record<string, number>;
    status: string;
    ready?: boolean;
  }>;
}

export function getRunnerUrl() {
  return RUNNER_URL;
}
