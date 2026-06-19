# AGE-FX Thought Console MVP Manual Verification

Use this guide to verify the local AGE-FX Thought Console vertical slice on Windows with Microsoft Edge.

## 1. Start the Local Service

From `D:\work\AGE-FX\.worktrees\codex-age-fx-mvp`:

```powershell
npm run service
```

Expected output includes the local service URL and D-drive data root:

- `http://127.0.0.1:3987`
- `D:\AGE-FX-Thought-Console`

Keep this terminal running for the browser extension and console checks.

## 2. Start the Console

In a second terminal from the same worktree:

```powershell
npm run console
```

Open the Vite URL shown in the terminal, usually `http://127.0.0.1:5173/`.

Verify:

- The AGE-FX console loads.
- If no messages have been captured today, the console shows the empty-day analysis state.
- The FX Burst button changes the console layout into the focused review mode.

## 3. Build the Edge Extension

If `dist\edge-extension` is not already current, run:

```powershell
npm run build:extension
```

## 4. Load the Extension in Microsoft Edge

1. Open `edge://extensions`.
2. Enable Developer mode.
3. Select Load unpacked.
4. Choose:

```text
D:\work\AGE-FX\.worktrees\codex-age-fx-mvp\dist\edge-extension
```

If this branch has been merged back into the main checkout, the equivalent path is:

```text
D:\work\AGE-FX\dist\edge-extension
```

With `npm run service` still running, open the extension popup. It should report that the local AGE service is online.

## 5. Verify Capture and Analysis

1. In Edge, open a ChatGPT or Gemini conversation.
2. Confirm the lake-blue C-Funnels capture indicator appears on the page.
3. Wait briefly for visible messages to be captured.
4. Check the extension popup or service state for captured message status.
5. Return to the console and confirm captured messages appear in today's status.
6. Confirm the daily analysis and equipment recommendation render in the console.

Known MVP behavior: `/api/analyze` currently creates a recommendation record when the console loads analysis. Reloading the console can create duplicate recommendation records.

## Privacy Notes

The MVP stores data locally under `D:\AGE-FX-Thought-Console`. The analyzer is local and rule-based; no external AI call is made in the MVP.

## Automated Verification

Run these checks before handing off the MVP:

```powershell
npm test
npm run typecheck
npm run build:console
npm run build:extension
```
