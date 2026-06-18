# AGE-FX Thought Console Architecture Whitepaper

Status: Approved architecture baseline
Date: 2026-06-19
Owner: Lake Blue Intelligence

## 1. Constitutional Purpose

AGE-FX Thought Console is a local-first thinking review system inspired by AGE-FX.

Its purpose is to collect the user's real thinking traces from ChatGPT and Gemini conversations, analyze them as a daily "thought battle record," and recommend exactly one useful "AGE equipment" tool that Codex can print after explicit user approval.

This system is not a health tracker, productivity guilt machine, pressure monitor, or generic todo app. It exists to help the user understand their own thinking: ideas, questions, repeated themes, judgments, unfinished loops, creative material, and possible next moves.

## 2. Architecture Decision

The approved first-version architecture is:

Microsoft Edge Extension + Local Companion Service + D-Drive SQLite Database + Local Console UI.

Because Microsoft Edge uses the Chromium extension platform, the extension should be built as an Edge-first Manifest V3 extension while keeping the code portable to other Chromium browsers where practical.

Future extension B, Import and Historical Backfill, is accepted as a later module. It is not part of the first implementation baseline.

Rejected for the first version:

- Hidden account scraping.
- Automated login into ChatGPT or Gemini.
- Background access to accounts while the user is not using those pages.
- Cloud sync.
- Automatic tool creation without user approval.

## 3. First-Version System Boundary

The first version contains four core subsystems:

1. C-Funnels Capture Extension for Microsoft Edge.
2. Local AGE Database on the D drive.
3. Thought Battle Analysis Console.
4. AGE Equipment Recommendation and Archive.

The user keeps their normal habit: thinking directly with ChatGPT and Gemini in the browser. The system adapts to that habit instead of forcing manual copy-paste or daily form filling.

## 4. C-Funnels Capture Extension

The first target browser is Microsoft Edge. The browser extension runs only on supported conversation pages:

- ChatGPT web.
- Gemini web.

When the user opens or uses those pages, the extension detects newly visible conversation messages and sends them to the local companion service.

The extension must show a subtle lake-blue capture indicator in Edge so the user knows C-Funnels are active.

Captured message fields:

- `source`: `chatgpt` or `gemini`.
- `capturedAt`.
- `conversationDate`.
- `conversationTitle`, when available.
- `pageUrl`.
- `messageRole`: `user`, `assistant`, or `unknown`.
- `messageText`.
- `contentHash`.

Deduplication rule:

`contentHash` is derived from source, page URL, role, and normalized message text. The database must reject or ignore duplicate messages with the same hash.

Important limitation:

The first version captures visible or currently loaded browser conversation content. It does not promise full historical account extraction.

## 5. Local Companion Service

A browser extension cannot directly write arbitrary files to `D:\AGE-FX-Thought-Console`, so a small local companion service is required.

First-version implementation target:

- Local Node.js service.
- Runs on `localhost`.
- Receives messages from the extension.
- Writes to SQLite on the D drive.
- Serves the local console UI.
- Runs daily analysis.
- Stores analysis and equipment records.

The service is the trusted local core. The extension should remain lightweight and should not accumulate full conversation history in the browser profile.

## 6. D-Drive Data Constitution

The default data root is:

```text
D:\AGE-FX-Thought-Console
```

Default structure:

```text
D:\AGE-FX-Thought-Console\data\age-fx.sqlite
D:\AGE-FX-Thought-Console\exports
D:\AGE-FX-Thought-Console\equipment
D:\AGE-FX-Thought-Console\logs
```

The path may become configurable later. In the first version, the UI must show the active data path clearly so the user always knows where the AGE database lives.

The Edge extension may store minimal settings in browser storage:

- Capture enabled or disabled.
- Local service URL.
- UI preferences.

Conversation data must not accumulate long-term in the browser profile.

## 7. Thought Battle Analysis

Daily battle analysis answers:

- What did I think about today?
- What themes appeared repeatedly?
- What questions are still unresolved?
- What judgments, preferences, or beliefs became clearer?
- What raw material could become an article, tool, product concept, note, or decision?
- What is today's thinking style or title?

Report sections:

- Core themes of the day.
- Repeated questions.
- Newly formed judgments.
- Unclosed thinking loops.
- Material that can become an article, tool, product concept, note, or decision.
- Thought title of the day.
- Threads to continue tomorrow.

Grounding rule:

The analysis must be based on captured conversations. It must not invent private facts, motives, emotions, events, or decisions that are not supported by the stored messages.

## 8. AGE Equipment Recommendation

After the daily battle analysis, the system recommends exactly one small tool to build.

Recommendation fields:

- `equipmentName`.
- `equipmentType`.
- `whyThisEquipment`.
- `sourceBattleInsight`.
- `minimumViableVersion`.
- `expectedBenefit`.
- `printPrompt`.

Approval rule:

The system must ask the user whether to print the equipment. It must not create tools automatically without explicit user approval.

When the user says yes, Codex implements that equipment as a separate small tool and adds it to the equipment archive.

Example equipment concepts:

- Lake Blue Decision Matrix.
- Idea C-Funnel Collector.
- Product Setting Card Organizer.
- Concept Training Arena.
- Article Skeleton Generator.

## 9. Equipment Archive

Every recommended or printed equipment item must be recorded.

Allowed archive states:

- `recommended`.
- `approved`.
- `printed`.
- `archived`.

The archive UI should feel like an AGE equipment library:

- Lake-blue highlights.
- Compact equipment cards.
- Clear status labels.
- Searchable history.
- Easy access to printed tools.

## 10. FX Burst Mode

FX Burst Mode is a focused review mode, not a decorative skin.

When enabled:

- The UI shifts into a darker cockpit-like lake-blue theme.
- The current daily analysis becomes the center.
- Equipment cards may orbit visually as C-Funnels.
- Nonessential UI is hidden.
- Readability and practical use remain more important than spectacle.

## 11. Privacy and Safety

The system is local-first.

Rules:

- Store conversation data on the user's D drive by default.
- Do not upload captured conversations to a third-party service without explicit user action.
- Show capture status visibly.
- Make capture controllable.
- Treat ChatGPT and Gemini content as private thinking material.
- Keep logs useful but avoid unnecessary full-message duplication outside SQLite.

If AI analysis requires an external model API in a future implementation, the UI must clearly show what data will be sent and require explicit user confirmation or a persistent user-selected setting.

## 12. Future Extension B: Import and Historical Backfill

Future extension B is accepted as a later module.

Purpose:

Allow the user to import historical conversation exports from ChatGPT, Gemini, or other supported sources into the AGE database.

Benefits:

- Backfills old thinking history.
- Reduces dependence on fragile web page structure for old conversations.
- Gives the AGE system a richer long-term memory.

Constraints:

- Import must be explicit user action.
- Imported data must go through the same schema and deduplication rules.
- Import must not replace the live C-Funnels capture architecture.
- Import failures must be visible and recoverable.

## 13. Architecture Change Protocol

This document is the highest architecture baseline for the AGE-FX Thought Console.

Future requests must be checked against it.

If a new requirement fits the architecture, implementation can proceed after normal planning.

If a new requirement conflicts with this architecture, Codex must:

1. Identify the conflict.
2. Explain the risk or trade-off.
3. Propose one or more architecture change options.
4. Ask the user to decide.
5. Update this whitepaper only after approval.

No implementation should silently violate the architecture constitution.

## 14. First Implementation Direction

The recommended first implementation sequence is:

1. Create the local data directory and SQLite schema.
2. Build the local companion service.
3. Build the Edge extension capture path for one source first.
4. Add the second source.
5. Build the local console UI.
6. Add daily battle analysis.
7. Add one-equipment recommendation.
8. Add archive and FX Burst Mode.

This sequence favors a working vertical slice before visual polish.
