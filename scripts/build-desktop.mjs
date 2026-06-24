import { access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

await access(join(repoRoot, "dist", "console", "index.html"));
await access(join(repoRoot, "dist", "service", "index.js"));
await access(join(repoRoot, "apps", "desktop", "main.cjs"));
await access(join(repoRoot, "apps", "desktop", "preload.cjs"));

console.log("AGE-FX desktop host files are ready.");
