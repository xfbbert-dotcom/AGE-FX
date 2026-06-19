import { cp, mkdir, rm } from "node:fs/promises";
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

console.log(`Built Edge extension at ${outputDir}`);
