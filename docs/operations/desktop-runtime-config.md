# AGE-FX Desktop Runtime Config

AGE-FX Desktop does not require PowerShell startup. The desktop host starts the local service by itself.

External model analysis is configured through this local file:

```text
D:\AGE-FX-Thought-Console\config\service.env
```

Example:

```env
AGE_FX_OPENAI_BASE_URL=https://api.openai.com/v1
AGE_FX_OPENAI_MODEL=gpt-5.2
AGE_FX_OPENAI_API_KEY=replace-with-your-api-key
AGE_FX_EXTENSION_ORIGINS=chrome-extension://your-edge-extension-id
AGE_FX_OPENAI_PROTOCOL=responses
```

Notes:

- `chrome-extension://...` is still the correct origin string for Microsoft Edge extensions because Edge uses Chromium's extension protocol internally.
- `AGE_FX_OPENAI_PROTOCOL=responses` uses OpenAI's Responses API.
- `AGE_FX_OPENAI_PROTOCOL=chat_completions` uses an OpenAI-compatible Chat Completions gateway.
- For OpenAI Next, set Base URL to `https://api.openai-next.com/v1`, set the model to a model supported by that gateway, and use `chat_completions`.
- This file is local machine runtime config. It is not stored in SQLite.
- The console API settings panel can edit this file directly through the local service.
- The console only shows whether an API key is configured. It does not read the API key value back into the UI.
- Do not commit this file to Git.
- If API quota is unavailable, use the Manual Model Bridge in the console.
- AGE-FX does not enable start-on-login in the current stage.

Console language:

- The console supports Chinese and English UI labels.
- The language selection is stored as a browser-local UI preference.
- Analysis content itself is rendered as returned by the selected model.
