# AGE-FX Thought Console

AGE-FX Thought Console is a local-first thinking review system inspired by the AGE System and AGE-FX C-Funnels. It captures visible ChatGPT and Gemini conversation turns from Microsoft Edge, stores them in a local SQLite database, produces a daily thought analysis, and recommends exactly one small "equipment" tool that can be built later.

The project is intentionally personal and experimental. It is not a productivity guilt tracker. Its goal is to turn scattered AI conversations into a useful record of how your thinking is evolving.

## Features

- Microsoft Edge extension for collecting visible ChatGPT and Gemini turns.
- Local companion service with SQLite storage under `D:\AGE-FX-Thought-Console` by default.
- Daily analysis and one equipment recommendation per settlement.
- Manual model bridge for using ChatGPT Plus, Gemini, or another model when API quota is unavailable.
- Desktop host built with Electron for a single AGE-FX app experience.
- Minimal console UI with Chinese and English language switching.
- Runtime API settings for compatible OpenAI-style providers.

## Architecture

```text
Edge extension
  -> Local service on http://127.0.0.1:3987
    -> SQLite database on D drive
    -> Daily analysis engine / manual bridge
      -> Console UI / Electron desktop host
```

Important documents:

- [Architecture whitepaper](docs/architecture/AGE-FX-Thought-Console-Architecture-Whitepaper.md)
- [LLM setup](docs/operations/AGE-FX-LLM-Setup.md)
- [Desktop runtime config](docs/operations/desktop-runtime-config.md)
- [Manual verification](docs/manual-test/age-fx-mvp.md)
- [Product design constitution](PRODUCT.md)

## Requirements

- Windows 10 or Windows 11
- Node.js 24 or newer
- npm
- Microsoft Edge
- Git

The current desktop packaging flow targets Windows.

## Quick Start

Install dependencies:

```powershell
npm install
```

Run the local service:

```powershell
npm run service
```

Run the console in another terminal:

```powershell
npm run console
```

Open:

```text
http://127.0.0.1:5173/
```

## Build the Edge Extension

```powershell
npm run build:extension
```

Load the unpacked extension in Edge:

1. Open `edge://extensions`.
2. Enable Developer mode.
3. Select Load unpacked.
4. Choose `dist\edge-extension`.

If Edge assigns a new extension ID, configure CORS for the local service:

```powershell
$env:AGE_FX_EXTENSION_ORIGINS = "chrome-extension://<edge-extension-id>"
npm run service
```

For temporary local debugging only:

```powershell
$env:AGE_FX_ALLOW_ANY_EXTENSION_ORIGIN = "1"
```

## Desktop App

Build the portable desktop app:

```powershell
npm run package:desktop
```

The executable is generated at:

```text
dist\AGE-FX-Desktop-win32-x64\AGE-FX.exe
```

Create a desktop shortcut:

```powershell
npm run shortcut:desktop
```

AGE-FX does not enable start-on-login by default.

## LLM Configuration

Deep preview and formal settlement require an external model provider. You can configure it in the console UI or through environment variables:

```powershell
$env:AGE_FX_OPENAI_BASE_URL = "https://api.openai.com/v1"
$env:AGE_FX_OPENAI_MODEL = "<your-model>"
$env:AGE_FX_OPENAI_API_KEY = "<your-api-key>"
$env:AGE_FX_OPENAI_PROTOCOL = "responses"
npm run service
```

For OpenAI-compatible Chat Completions gateways:

```powershell
$env:AGE_FX_OPENAI_PROTOCOL = "chat_completions"
```

Never commit API keys. Runtime config is stored locally at:

```text
D:\AGE-FX-Thought-Console\config\service.env
```

## Scripts

```powershell
npm test                  # Run all tests
npm run typecheck         # TypeScript type check
npm run build:console     # Build console UI
npm run build:service     # Build local service
npm run build:extension   # Build Edge extension
npm run package:desktop   # Build portable Electron desktop app
```

## Privacy

AGE-FX is local-first:

- Captured conversations are stored locally in SQLite.
- The default data root is `D:\AGE-FX-Thought-Console`.
- External model calls happen only when preview, settlement, or manual model workflows are used.
- API keys are not stored in the repository and should not be logged or shared.

Review the source before using it with sensitive conversations. This project is experimental and has not gone through a formal security audit.

## Current Status

This is an MVP. It is useful for local experimentation, but expect rough edges around browser DOM changes, model provider differences, and desktop packaging.

Known limitations:

- The extension currently targets visible ChatGPT and Gemini conversation UI patterns.
- Browser page structure changes may require capture selector updates.
- Desktop packaging is Windows-focused.
- The Liquid Glass material lab remains in the repository as an experiment, but the production console currently uses a minimal UI style.

## Contributing

Issues and pull requests are welcome. Please keep changes aligned with the product constitution:

- local-first data handling
- analysis over raw transcript replay
- one decisive equipment recommendation
- readable, minimal UI

Before opening a PR, run:

```powershell
npm run typecheck
npm test
npm run build:extension
npm run package:desktop
```

## License

MIT License. See [LICENSE](LICENSE).
