# AGE-FX LLM Deep Analysis Setup

AGE-FX Thought Console now uses the external LLM deep analysis engine for preview and formal midnight settlement.

The local service requires these environment variables before starting:

```powershell
$env:AGE_FX_OPENAI_BASE_URL = "https://api.openai.com/v1"
$env:AGE_FX_OPENAI_MODEL = "<your-model>"
$env:AGE_FX_OPENAI_API_KEY = "<your-api-key>"
$env:AGE_FX_EXTENSION_ORIGINS = "chrome-extension://pdffkfelligipmhklpdmokmckkkfcopbh"
$env:AGE_FX_OPENAI_PROTOCOL = "responses"
npm run service
```

Protocol choices:

- `responses`: OpenAI Responses API. Use with `https://api.openai.com/v1`.
- `chat_completions`: OpenAI-compatible Chat Completions gateway. Use with providers whose endpoint is `/v1/chat/completions`.

OpenAI Next example:

```powershell
$env:AGE_FX_OPENAI_BASE_URL = "https://api.openai-next.com/v1"
$env:AGE_FX_OPENAI_MODEL = "gpt-5"
$env:AGE_FX_OPENAI_API_KEY = "<your-openai-next-key>"
$env:AGE_FX_OPENAI_PROTOCOL = "chat_completions"
```

Privacy boundary:

- Preview sends the selected day's captured battle record to the configured model.
- Formal midnight settlement sends the just-ended day's captured battle record to the configured model.
- API keys must stay in environment variables.
- API keys must not be stored in SQLite, source code, extension storage, or logs.

If these variables are missing, `/api/preview` and `/api/analyze` return `llm_not_configured` instead of silently falling back to shallow local analysis.
