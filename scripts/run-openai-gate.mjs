import { execFileSync, spawnSync } from "node:child_process";
const key = execFileSync(
  "npx",
  ["convex", "env", "get", "AI_GATEWAY_API_KEY"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
).trim();
const r = spawnSync(process.execPath, ["experiments/extraction/run.mjs"], {
  env: { ...process.env, AI_GATEWAY_API_KEY: key },
  stdio: "inherit",
});
process.exitCode = r.status ?? 1;
