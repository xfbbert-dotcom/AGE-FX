import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const consoleRoot = join(repoRoot, "apps", "console");
const viteBin = join(repoRoot, "node_modules", "vite", "bin", "vite.js");

const child = spawn(
  process.execPath,
  [
    viteBin,
    "build",
    "--outDir",
    "../../dist/console",
    "--emptyOutDir",
    "--base",
    "./"
  ],
  {
    cwd: consoleRoot,
    stdio: "inherit"
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
