const { app, BrowserWindow, Menu, Tray, nativeImage, shell } = require("electron");
const { spawn } = require("node:child_process");
const { accessSync, existsSync } = require("node:fs");
const { join } = require("node:path");

function resolveAppRoot() {
  const candidates = [
    process.env.AGE_FX_APP_ROOT,
    app.getAppPath(),
    join(__dirname, "..", "..")
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (
      existsSync(join(candidate, "dist", "console", "index.html")) &&
      (
        existsSync(join(candidate, "dist", "service", "index.js")) ||
        existsSync(join(candidate, "apps", "service", "src", "index.ts"))
      )
    ) {
      return candidate;
    }
  }

  return join(__dirname, "..", "..");
}

const repoRoot = resolveAppRoot();
const serviceUrl = "http://127.0.0.1:3987";
const healthUrl = `${serviceUrl}/api/health`;
const consoleDist = join(repoRoot, "dist", "console");
const builtServiceEntry = join(repoRoot, "dist", "service", "index.js");
const sourceServiceEntry = join(repoRoot, "apps", "service", "src", "index.ts");
const tsxCli = join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");
const nodePath = process.env.AGE_FX_NODE_PATH ?? process.env.npm_node_execpath ?? "node";
const appIconPng = join(__dirname, "assets", "age-fx-icon.png");
const appIconIco = join(__dirname, "assets", "age-fx-icon.ico");

let serviceProcess = null;
let mainWindow = null;
let tray = null;
let isQuitting = false;

const trayIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#051013"/>
  <path d="M7 21 14 7h4l7 14h-4l-1.2-2.8h-7.6L11 21H7Zm6.5-6h5l-2.5-6-2.5 6Z" fill="#60dbee"/>
  <path d="M7 24h18" stroke="#9bf4ff" stroke-width="2" stroke-linecap="round"/>
</svg>
`.trim();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServiceOnline() {
  try {
    const response = await fetch(healthUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function isConsoleHostedByService() {
  try {
    const response = await fetch(serviceUrl);
    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("text/html");
  } catch {
    return false;
  }
}

async function waitForService() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await isServiceOnline()) {
      return;
    }

    await delay(250);
  }

  throw new Error("AGE-FX service did not become ready at http://127.0.0.1:3987.");
}

function assertConsoleBuilt() {
  accessSync(join(consoleDist, "index.html"));
}

function serviceSpawnConfig() {
  if (existsSync(builtServiceEntry)) {
    return {
      command: process.execPath,
      args: [builtServiceEntry],
      env: {
        ELECTRON_RUN_AS_NODE: "1"
      }
    };
  }

  return {
    command: nodePath,
    args: [tsxCli, sourceServiceEntry],
    env: {}
  };
}

async function startServiceIfNeeded() {
  if (await isServiceOnline()) {
    return;
  }

  assertConsoleBuilt();
  const spawnConfig = serviceSpawnConfig();

  serviceProcess = spawn(
    spawnConfig.command,
    spawnConfig.args,
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        ...spawnConfig.env,
        AGE_FX_CONSOLE_DIST: consoleDist
      },
      stdio: "inherit",
      windowsHide: true
    }
  );

  serviceProcess.once("exit", (code, signal) => {
    if (serviceProcess && mainWindow) {
      mainWindow.webContents.send(
        "age-fx-service-exit",
        `AGE-FX service exited with ${signal ?? code ?? "unknown"}`
      );
    }

    serviceProcess = null;
  });

  await waitForService();
}

function stopOwnedService() {
  if (!serviceProcess) {
    return;
  }

  const child = serviceProcess;
  serviceProcess = null;
  child.kill();
}

function showMainWindow() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (tray) {
    return;
  }

  const icon = existsSync(appIconPng)
    ? nativeImage.createFromPath(appIconPng).resize({ width: 16, height: 16 })
    : nativeImage.createFromDataURL(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trayIconSvg)}`
      );

  tray = new Tray(icon);
  tray.setToolTip("AGE-FX Thought Console");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open AGE-FX",
        click: showMainWindow
      },
      {
        label: "Hide",
        click() {
          mainWindow?.hide();
        }
      },
      { type: "separator" },
      {
        label: "Quit AGE-FX",
        click() {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
  tray.on("click", showMainWindow);
}

async function createWindow() {
  await startServiceIfNeeded();
  createTray();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#eadece",
    icon: existsSync(appIconIco) ? appIconIco : appIconPng,
    title: "AGE-FX Thought Console",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.removeMenu();
  mainWindow.setBackgroundColor("#eadece");
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });
  if (await isConsoleHostedByService()) {
    await mainWindow.loadURL(serviceUrl);
    return;
  }

  await mainWindow.loadFile(join(consoleDist, "index.html"));
}

app.whenReady().then(() => {
  createWindow().catch((error) => {
    console.error(error);
    app.quit();
  });
});

app.on("window-all-closed", () => {});

app.on("before-quit", () => {
  isQuitting = true;
  stopOwnedService();
});
