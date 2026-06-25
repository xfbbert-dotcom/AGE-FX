# Contributing

Thank you for considering a contribution to AGE-FX Thought Console.

## Development Setup

```powershell
npm install
npm run typecheck
npm test
```

## Pull Request Checklist

- Keep user data local-first by default.
- Do not commit API keys, exported databases, logs, or captured private conversations.
- Keep UI changes readable in both Chinese and English.
- Add or update tests for behavior changes.
- Run:

```powershell
npm run typecheck
npm test
npm run build:extension
```

For desktop changes, also run:

```powershell
npm run package:desktop
```

## Design Direction

The production console currently follows a minimal, readable product UI direction. Avoid reintroducing heavy decorative glassmorphism or sci-fi chrome unless the product constitution is intentionally updated.
