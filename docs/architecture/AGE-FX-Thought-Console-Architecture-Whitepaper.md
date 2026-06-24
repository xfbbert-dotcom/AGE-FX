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

The approved second-stage desktop architecture is:

Microsoft Edge Extension + AGE-FX Desktop Host + Local Companion Service + D-Drive SQLite Database + Embedded Console UI.

The desktop host is an Electron application. It replaces manual PowerShell startup for ordinary use by launching the local companion service, opening the console in a desktop window, and shutting down the hosted service when the application exits. It does not replace the Edge extension, the local service boundary, or the D-drive database constitution.

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

Desktop host rule:

In the desktop architecture, the service still owns capture, storage, analysis, and equipment APIs. The Electron desktop host is responsible only for lifecycle and presentation:

- Start the local companion service if it is not already running.
- Load the embedded console UI from the local service.
- Keep the same `127.0.0.1:3987` capture endpoint so the Edge extension can continue operating unchanged.
- Stop the service process it started when the desktop app exits.
- Hide to the system tray when the window is closed, so capture can continue while the user is working in Edge.

The desktop host must not become a second database writer or a parallel analysis engine.

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

The console may store UI-only preferences such as Chinese/English language selection in browser local storage. These preferences are not thought data and must not be mixed into the AGE SQLite battle record.

Conversation data must not accumulate long-term in the browser profile.

## 7. Thought Battle Analysis

Daily battle analysis answers:

- What did I think about today?
- What themes appeared repeatedly?
- What questions are still unresolved?
- What judgments, preferences, or beliefs became clearer?
- What raw material could become an article, tool, product concept, note, or decision?
- What is today's thinking style or title?

Default report shape:

- Thought title of the day.
- A single synthesized daily battle summary, written as a readable multi-paragraph analysis of the user's whole day of thinking.
- Exactly one recommended AGE equipment item.
- Preview state, when the report is a temporary testing preview.

The daily battle summary should be substantial enough to be useful. It should explain what the user mainly thought about, how the thinking moved during the day, what ChatGPT and Gemini replies contributed as supporting evidence, what judgments or preferences became clearer, what remains unresolved, and what line is worth continuing tomorrow.

Structured lanes such as themes, question clusters, judgments, loops, reusable material, and tomorrow threads may still exist internally as evidence fields or future debug views. They are not the default console layout.

Analysis engine:

The approved analysis engine is an external LLM deep analysis engine. The local service sends the captured battle record for the requested day to the configured model and asks it to act as the AGE-FX System Brain.

Provider protocol rule:

The local service owns a small provider protocol adapter for the external model call. `responses` targets OpenAI's Responses API. `chat_completions` targets OpenAI-compatible Chat Completions gateways, including providers whose quickstart exposes `/v1/chat/completions`. This adapter changes only the transport shape. It must not change the AGE System Brain prompt, grounding rules, JSON schema, one-equipment rule, preview persistence rule, or midnight settlement cadence.

The engine must perform:

- Subconscious iceberg positioning.
- Non-consensus insight extraction.
- Unclosed thought loop detection.
- Cognitive waveform naming.
- Exactly one AGE equipment printing specification.

The default analysis voice should be cold, precise, hard-edged, lake-blue, and high-technology. It must avoid common summaries such as "today discussed product and technology." It should search for non-consensus but logically self-consistent sparks in the user's thinking.

Fallback rule:

If the external LLM is not configured or the request fails, the service must report a clear analysis error to the console. It must not silently replace the deep analysis with a shallow local template, because that would misrepresent the AGE System Brain.

Grounding rule:

The analysis must be based on captured conversations. It must not invent private facts, motives, emotions, events, or decisions that are not supported by the stored messages.

Presentation rule:

The database stores the raw battle record, including user, ChatGPT, Gemini, and assistant messages with clear source and role fields. The console analysis panels must not simply replay raw transcript text. The default console experience should show a synthesized daily battle summary plus the recommended equipment. Raw messages may be exposed through a separate debug or battle-log view, but raw transcript replay is not the default console experience.

Cadence rule:

The system collects data continuously during the day but does not create the formal daily battle analysis during live capture. The formal AGE settlement happens at local midnight. At `00:00`, the system analyzes the full conversation record for the calendar day that just ended and creates exactly one formal equipment recommendation for that settled day.

Preview rule:

For development and testing, the console may offer a lightweight preview of the current day's partially captured data. Preview analysis is explicitly marked as temporary, must not be stored in `daily_analyses`, and must not create equipment archive records. Preview exists only to verify capture quality before the midnight settlement.

Because the approved engine is external LLM analysis, preview also sends the current day's captured battle record to the configured model. Preview remains non-persistent and does not create equipment archive records.

Manual external model bridge rule:

When the configured API is unavailable, out of quota, or the user wants to test a different web model, the console may generate a copyable AGE-FX Golden Prompt for the selected day's battle record. The user may paste that prompt into ChatGPT Plus, Gemini, Claude, or another external model, then paste the returned JSON back into AGE-FX.

This bridge is not a local shallow fallback. It must reuse the same AGE System Brain protocol, JSON shape, grounding rules, and one-equipment rule as the automatic external LLM engine. Manual preview remains non-persistent. Manual formal settlement may store the validated returned analysis and create or refresh the single equipment recommendation for that date.

## 8. AGE Equipment Recommendation

After the formal midnight daily battle analysis, the system recommends exactly one small tool to build.

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

Formal recommendation rule:

Equipment recommendations are created only by formal settlement, not by live capture, console refresh, or preview analysis. Re-running settlement for the same date should update or reuse the same formal recommendation record instead of filling the archive with duplicates.

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

The approved first-version deep analysis mode uses an external model API. Captured conversation text for the analysis date is sent to the configured provider during preview and formal settlement. The service must require explicit runtime configuration for provider endpoint, model, protocol, and API key. API keys may come from process environment variables or the local machine runtime file `D:\AGE-FX-Thought-Console\config\service.env`. The console may edit this local runtime file through the local companion service, but the service must never return the API key value to the browser UI. API keys must not be stored in SQLite, extension storage, source code, or logs.

In manual external model bridge mode, captured conversation text is placed into a user-visible prompt. The user explicitly decides which web model receives it by copying and pasting the prompt. The local service must not store credentials for that web model and must validate the pasted analysis before rendering or storing it.

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

## 15. Desktop Evolution Direction

After the MVP vertical slice is working, AGE-FX should evolve into a desktop application so the user no longer needs to start PowerShell terminals for normal use.

Approved desktop sequence:

1. Add an Electron desktop host.
2. Let the desktop host launch the existing local companion service.
3. Serve the built console UI through the service and load it in the desktop window.
4. Keep the Edge extension capture endpoint stable at `127.0.0.1:3987`.
5. Add tray status and a portable desktop package.
6. Later add packaged installers, logs, and settings.

Rejected for the first desktop pass:

- Rewriting the service in Rust or C#.
- Replacing the Edge extension with hidden account scraping.
- Moving the database out of `D:\AGE-FX-Thought-Console`.
- Introducing cloud sync as part of desktop packaging.
- Enabling start-on-login by default. The user does not want automatic startup in this stage.
