# AGE-FX Thought Console Design

Status: Awaiting user review
Date: 2026-06-19

## Goal

Build a local-first AGE-FX-inspired thinking review system that automatically captures the user's active ChatGPT and Gemini web conversations, stores them in a D-drive SQLite database, analyzes them as a daily thought battle record, and recommends one small AGE equipment tool for Codex to print after explicit approval.

## Approved Architecture

The approved architecture is option A:

Browser Extension + Local Companion Service + D-Drive SQLite Database + Local Console UI.

Future option B, Import and Historical Backfill, is accepted as a later extension.

The system must follow the constitution in:

`docs/architecture/AGE-FX-Thought-Console-Architecture-Whitepaper.md`

## Components

### C-Funnels Capture Extension

The browser extension runs on supported ChatGPT and Gemini conversation pages. It detects newly visible messages, deduplicates them by content hash, and sends them to the local companion service.

The extension stores only minimal browser settings and must not accumulate long-term conversation history in browser storage.

### Local Companion Service

The local companion service runs on `localhost`. It receives captured messages, stores them in SQLite, serves the local console UI, runs analysis jobs, and stores equipment recommendation records.

The first implementation should use Node.js unless a later implementation plan finds a strong reason to use another runtime.

### Local AGE Database

The database lives at:

`D:\AGE-FX-Thought-Console\data\age-fx.sqlite`

The broader data directory contains:

- `D:\AGE-FX-Thought-Console\data`
- `D:\AGE-FX-Thought-Console\exports`
- `D:\AGE-FX-Thought-Console\equipment`
- `D:\AGE-FX-Thought-Console\logs`

### Thought Battle Analysis Console

The console shows today's captured conversation status, generates the daily battle analysis, and displays the result in sections:

- Core themes of the day.
- Repeated questions.
- Newly formed judgments.
- Unclosed thinking loops.
- Material that can become an article, tool, product concept, note, or decision.
- Thought title of the day.
- Threads to continue tomorrow.

### AGE Equipment Recommendation and Archive

After analysis, the system recommends exactly one small tool. It records the recommendation and asks the user whether to print it.

Equipment records move through these states:

- `recommended`.
- `approved`.
- `printed`.
- `archived`.

### FX Burst Mode

FX Burst Mode is a practical focused review mode. It uses the AGE-FX lake-blue cockpit feeling, centers the current daily analysis, hides nonessential UI, and may present equipment cards as C-Funnels.

## Data Flow

1. The user opens or uses ChatGPT or Gemini in the browser.
2. The extension observes visible conversation messages.
3. The extension normalizes each message and computes `contentHash`.
4. The extension posts message records to the local companion service.
5. The companion service validates and stores new messages in SQLite.
6. The console requests today's collected messages from the service.
7. The analysis job creates a grounded daily battle report.
8. The recommendation job proposes one AGE equipment item.
9. The user approves or rejects printing.
10. Codex prints approved equipment as a separate small tool and the archive is updated.

## Privacy and Safety

The first version is local-first and does not perform hidden account scraping, login automation, cloud sync, or background access to ChatGPT/Gemini accounts.

Any future external AI API use must be explicit in the UI because it may send private thinking material outside the machine.

## Error Handling

The first implementation must handle:

- Local service offline: extension shows inactive capture state and does not pretend messages were saved.
- Duplicate messages: database ignores duplicate `contentHash` records.
- Unsupported page structure: extension records a warning and keeps capture disabled for that page version.
- Database unavailable: service returns a clear local error and writes to logs when possible.
- Empty day: analysis console explains that no conversations were captured today.

## Testing Strategy

The implementation plan should include tests for:

- Message normalization and hashing.
- Database insertion and deduplication.
- Local service capture endpoint.
- Daily analysis input selection.
- Equipment state transitions.
- Extension capture parsing with saved HTML fixtures for ChatGPT and Gemini.

Manual verification should include:

- Start service locally.
- Open console locally.
- Send sample captured messages.
- Confirm SQLite records appear under the D-drive data path.
- Confirm duplicate messages are ignored.
- Confirm daily analysis and one equipment recommendation are produced from sample data.

## Scope Deferred

The following are deferred:

- Historical import/backfill.
- Cloud sync.
- Mobile support.
- Automated login.
- Hidden background scraping.
- Multi-user accounts.
- Fully automated Codex tool printing without approval.

## Open Implementation Decision

Before writing code, confirm whether to install Git or continue without Git.

Git is recommended for this project because the system will evolve through many small equipment modules and architecture revisions.
