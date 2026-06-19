import { access, cp, mkdir, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const sourceDir = join(repoRoot, "extension", "edge");
const outputDir = join(repoRoot, "dist", "edge-extension");

await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });
await cp(sourceDir, outputDir, {
  recursive: true,
  filter(source) {
    return !source.includes(`${join("extension", "edge", "tests")}`);
  }
});

const manifestPath = join(outputDir, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const serviceWorker = manifest.background?.service_worker;

if (serviceWorker !== "src/background.js") {
  throw new Error("Extension manifest must reference src/background.js as its service worker");
}

await access(join(outputDir, serviceWorker));

console.log(`Built Edge extension at ${outputDir}`);
