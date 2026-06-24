**Findings**
- No actionable functional findings remain after the minimalist console rebuild.
- Visual P3 remains: the production shell is now aligned to a calm ChatGPT-web-inspired direction, but density and whitespace can still be tuned after real daily use.

**Brief Lock**
- Reference target: ChatGPT web-style minimalist product UI.
- Design read: AGE-FX remains a product tool first. The visual target is quiet, readable, neutral, and fast to scan, with only a restrained AGE-FX cyan accent.
- The minimalist direction supersedes the Liquid Glass experiments. Do not reintroduce large blur blobs, neon gradients, transparent desktop bleed-through, or heavy sci-fi cockpit decoration unless the user explicitly reopens that direction.
- Material rule: neutral page background, white surfaces, light gray borders, subtle shadows, black primary actions, familiar pill controls, and high-contrast text.

**Implementation Checklist**
- Add the minimalist visual constitution to `PRODUCT.md`.
- Override the prior glass material with neutral product surfaces in `apps/console/src/styles.css`.
- Remove visual reliance on blur, gradients, colored glow fields, and thick glass shadows.
- Keep the top control group visible and familiar: capture status, language switch, and FX Burst button.
- Keep text high-contrast and readable across the hero, cards, sidebar, preview, manual bridge, and API settings.
- Preserve all current responsive behavior while moving the visual system to a calmer product shell.
- Preserve all existing product behavior: capture status, language switch, FX Burst, preview, API settings, manual bridge, equipment state controls.

**Evidence**
- Final runtime screenshot: `D:\work\AGE-FX\.worktrees\codex-age-fx-mvp\dist\minimal-console-pass-1.png`
- Mobile screenshot: `D:\work\AGE-FX\.worktrees\codex-age-fx-mvp\dist\minimal-console-mobile-pass-1.png`
- The old `LiquidGlassCard` and `LiquidGlassButton` lab code remains in the repo as an unused experiment, but production styling no longer follows that material direction.
- Portable desktop app: `D:\work\AGE-FX\.worktrees\codex-age-fx-mvp\dist\AGE-FX-Desktop-win32-x64\AGE-FX.exe`

**Verification**
- `npm run typecheck`: passed.
- `node scripts/check-console-navigation.cjs`: passed.
- `npm run build:extension`: passed.
- `npm test`: passed, 94 tests.
- `npm run package:desktop`: passed after closing stale AGE-FX desktop processes from this worktree.
- `node scripts/capture-console-screenshots.cjs`: passed.

**Remaining P3 Polish**
- Tune hero height and card density after the user has tried the quieter interface for a day.
- Consider adding a compact mode if the ChatGPT-like calm shell feels too spacious during heavy review sessions.

final result: minimalist visual pass verified
