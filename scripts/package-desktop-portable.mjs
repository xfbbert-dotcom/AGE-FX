import { spawn } from "node:child_process";
import { cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const electronRuntime = join(repoRoot, "node_modules", "electron", "dist");
const outputRoot = join(repoRoot, "dist", "AGE-FX-Desktop-win32-x64");
const appRoot = join(outputRoot, "resources", "app");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const executable = command === "npm" ? process.execPath : command;
    const finalArgs =
      command === "npm" ? [process.env.npm_execpath, ...args] : args;
    const child = spawn(executable, finalArgs, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
      ...options
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

await rm(outputRoot, { force: true, recursive: true });
await mkdir(appRoot, { recursive: true });

await cp(electronRuntime, outputRoot, { recursive: true });
await rename(join(outputRoot, "electron.exe"), join(outputRoot, "AGE-FX.exe"));

await cp(join(repoRoot, "apps", "desktop"), join(appRoot, "apps", "desktop"), {
  recursive: true
});
await cp(join(repoRoot, "dist", "console"), join(appRoot, "dist", "console"), {
  recursive: true
});
await cp(join(repoRoot, "dist", "service"), join(appRoot, "dist", "service"), {
  recursive: true
});

await writeFile(
  join(appRoot, "package.json"),
  JSON.stringify(
    {
      name: "age-fx-thought-console",
      version: "0.1.0",
      private: true,
      main: "apps/desktop/main.cjs",
      dependencies: {
        cors: "^2.8.5",
        express: "^4.21.2",
        zod: "^3.24.1"
      }
    },
    null,
    2
  ),
  "utf8"
);

await run("npm", ["install", "--omit=dev", "--ignore-scripts"], { cwd: appRoot });

console.log(`AGE-FX portable desktop package ready: ${join(outputRoot, "AGE-FX.exe")}`);
