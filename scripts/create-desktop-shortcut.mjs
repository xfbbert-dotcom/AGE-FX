import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const exePath = join(repoRoot, "dist", "AGE-FX-Desktop-win32-x64", "AGE-FX.exe");
const workingDirectory = join(repoRoot, "dist", "AGE-FX-Desktop-win32-x64");

await access(exePath);

const script = `
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'AGE-FX.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = '${exePath.replaceAll("'", "''")}'
$shortcut.WorkingDirectory = '${workingDirectory.replaceAll("'", "''")}'
$shortcut.Description = 'AGE-FX Thought Console'
$shortcut.IconLocation = '${exePath.replaceAll("'", "''")},0'
$shortcut.Save()
Write-Output $shortcutPath
`.trim();

const child = spawn(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
  {
    stdio: "inherit",
    windowsHide: true
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
