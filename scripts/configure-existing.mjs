// Transfers only explicitly named provider credentials, without printing values.
import { execFileSync } from "node:child_process";
const source = process.argv[2];
if (!source) throw new Error("Provide the source Convex project directory explicitly.");
for (const name of [
  "FIRECRAWL_API_KEY",
  "AI_GATEWAY_API_KEY",
]) {
  const value = execFileSync("npx", ["convex", "env", "get", name], {
    cwd: source,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  if (!value) continue;
  execFileSync("npx", ["convex", "env", "set", name], {
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  console.log(`${name}: configured`);
}
