const electron = require("electron");
const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

if (typeof electron === "string") {
  const result = spawnSync(electron, [__filename], {
    env: process.env,
    stdio: "inherit"
  });

  process.exit(result.status ?? 1);
}

const { app, BrowserWindow } = electron;
const outputDir = join(__dirname, "..", "dist");
const targetUrl = process.env.AGE_FX_CONSOLE_URL ?? "http://127.0.0.1:5173/";

async function capture(win, width, height, filename) {
  win.setSize(width, height);
  await new Promise((resolve) => setTimeout(resolve, 900));
  const image = await win.webContents.capturePage();
  const path = join(outputDir, filename);

  if (!existsSync(dirname(path))) {
    mkdirSync(dirname(path), { recursive: true });
  }

  writeFileSync(path, image.toPNG());
  return path;
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      sandbox: false
    }
  });

  await win.loadURL(targetUrl);
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const desktop = await capture(win, 1440, 900, "console-ui-1440.png");
  await win.webContents.executeJavaScript(`
    document.querySelector("#burst-toggle")?.click();
    undefined;
  `);
  await new Promise((resolve) => setTimeout(resolve, 700));
  const burst = await capture(win, 1440, 900, "console-ui-burst-1440.png");
  await win.webContents.executeJavaScript(`
    document.querySelector("#burst-toggle")?.click();
    undefined;
  `);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const mobile = await capture(win, 390, 844, "console-ui-390.png");

  console.log(JSON.stringify({ desktop, burst, mobile }, null, 2));
  app.quit();
});
