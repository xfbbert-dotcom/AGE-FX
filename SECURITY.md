# Security Policy

AGE-FX Thought Console is an experimental local-first tool. It has not received a formal security audit.

## Reporting a Vulnerability

Please open a private report or contact the maintainer directly before publishing details of a security issue.

## Sensitive Data

Do not commit:

- API keys
- OAuth tokens
- local SQLite databases
- browser exports
- captured ChatGPT or Gemini conversations
- runtime config files
- logs that include private conversation content

Runtime model configuration should stay in:

```text
D:\AGE-FX-Thought-Console\config\service.env
```

## Local Network Boundary

The local companion service listens on:

```text
http://127.0.0.1:3987
```

Keep it bound to localhost unless you have reviewed and hardened the service for a broader network.
