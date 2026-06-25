# AGE-FX Desktop Host

The desktop host wraps the existing AGE-FX local service and console in Electron.

Development flow:

```powershell
npm run build:console
npm run desktop
```

Behavior:

- If `http://127.0.0.1:3987/api/health` is already online, the desktop host reuses it.
- If the service is offline, the desktop host starts `apps/service/src/index.ts` with `AGE_FX_CONSOLE_DIST=dist/console`.
- The service reads local runtime config from `D:\AGE-FX-Thought-Console\config\service.env` when present.
- The desktop window loads the hosted console when available, otherwise it falls back to the packaged `dist\console\index.html`.
- The Edge extension continues sending capture data to `http://127.0.0.1:3987/api/capture`.
- Closing the window hides AGE-FX to the system tray.
- Use the tray menu's `Quit AGE-FX` item to fully exit and stop the hosted service.

Portable package:

```powershell
npm run package:desktop
```

The portable executable is generated at:

```text
dist\AGE-FX-Desktop-win32-x64\AGE-FX.exe
```

Desktop shortcut:

```powershell
npm run shortcut:desktop
```

The desktop shortcut does not enable start-on-login. AGE-FX starts only when launched by the user.

External model config:

```text
D:\AGE-FX-Thought-Console\config\service.env
```

```env
AGE_FX_OPENAI_BASE_URL=https://api.openai.com/v1
AGE_FX_OPENAI_MODEL=gpt-5.2
AGE_FX_OPENAI_API_KEY=replace-with-your-api-key
AGE_FX_EXTENSION_ORIGINS=chrome-extension://your-edge-extension-id
```
