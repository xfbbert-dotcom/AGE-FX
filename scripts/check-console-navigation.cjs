const electron = require("electron");
const { spawnSync } = require("node:child_process");

if (typeof electron === "string") {
  const result = spawnSync(electron, [__filename], {
    env: process.env,
    stdio: "inherit"
  });

  process.exit(result.status ?? 1);
}

const { app, BrowserWindow } = electron;

const targetUrl = process.env.AGE_FX_CONSOLE_URL ?? "http://127.0.0.1:5173/";

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
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const result = await win.webContents.executeJavaScript(`
    (() => {
      const button = document.querySelector('.side-nav-button[data-target="equipment-panel"]');
      button?.click();
      return {
        found: Boolean(button),
        active: Boolean(button?.classList.contains('is-active')),
        text: button?.textContent?.trim() ?? ''
      };
    })();
  `);

  console.log(JSON.stringify(result));
  app.quit();
});
