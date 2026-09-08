# AGENTS.md — Repository Operating Contract & Agent Harness

This document is the authoritative operating contract for any AI agent (autonomous coding agent, subagent, or assistant) working within the `yt-research-gen` repository. All agents must adhere to the execution harness, guardrails, memory conventions, tool usage patterns, and verification standards outlined below.

---

## 1. System Architecture & Repository Context

`yt-research-gen` is a research distillation and content synthesis engine composed of three primary subsystems:

1. **Python FastAPI Backend (`backend/`)**:
   - Asynchronous API built on Python 3.12+ with Pydantic v2 data models.
   - Provider abstraction layer (`backend/app/services/ai/`) utilizing the modern `google-genai` SDK (`genai.Client`) with model cascades (`gemini-3.8-flash` $\to$ `gemini-3.6-flash`), sticky quota circuit breakers, and OpenAI-compatible fallbacks.
   - Domain-specific generation engines: fact extraction, context synthesis, curriculum planning, scriptwriting, and presentation generation.
2. **React + Vite Frontend (`frontend/`)**:
   - Modern React with TypeScript and Tailwind CSS.
   - Structured modules corresponding to research, curriculum, script studio, and presentation deck generation.
3. **Obsidian Markdown Vault (`vault/`)**:
   - Local filesystem-backed persistent knowledge graph.
   - Organizes content under `projects/<project_id>/` across `sources/`, `facts/`, `guides/`, `curriculum/`, `scripts/`, and `presentations/`.
   - Adheres strictly to Obsidian formatting standards: YAML frontmatter, wikilinks (`[[...]]`), footnotes (`[^1]`), and block anchors (`^fact_id`).

---

## 2. Multi-Agent Orchestration: Project Manager (PM) & Subagent Topology

To conserve context tokens in the main chat and ensure clean separation of concerns, the repository enforces a **Project Manager (PM) and Subagent Delegation Topology**:

```
                              ┌─────────────────────────────────────────┐
                              │            USER / OPERATOR              │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   ▼
                              ┌─────────────────────────────────────────┐
                              │     MAIN CHAT: PROJECT MANAGER (PM)     │
                              │  - Coordinates tasks & preserves context│
                              │  - Synthesizes subagent reports         │
                              │  - Never ingests raw dumps/large files  │
                              │  - Itemized TL;DR comms (no text walls) │
                              └──────┬─────────────┬─────────────┬──────┘
                                     │             │             │
              ┌──────────────────────┘             │             └──────────────────────┐
              ▼                                    ▼                                    ▼
   ┌──────────────────────┐             ┌──────────────────────┐             ┌──────────────────────┐
   │ 1. RESEARCH SUBAGENT │             │ 2. DRAFT & PROPOSE   │             │ 3. IMPLEMENT SUBAGENT│
   │  - Read & grep files │             │  - Formulate plan    │             │  - Code changes      │
   │  - Explore codebase  │             │  - Design schema/diff│             │  - File creation     │
   │  - Token-heavy dump  │             │  - Trade-off review  │             │  - Local refactoring │
   └──────────┬───────────┘             └──────────┬───────────┘             └──────────┬───────────┘
              │                                    │                                    │
              └─────────────────────────┬──────────┴────────────────────────────────────┘
                                        ▼
                              ┌─────────────────────────────────────────┐
                              │         4. SMOKE TEST SUBAGENT          │
                              │  - Run end-to-end smoke test scripts    │
                              │  - Real behavior verification (exit 0)  │
                              │  - (Strictly smoke tests, NOT unittests)│
                              └────────────────────┬────────────────────┘
                                                   │
                                     [Pass: Report to PM / Fail: Diff back to PM]
```

### The Project Manager Role & Main Chat Invariants
1. **Context & Token Conservation**:
   - The main chat is strictly a **high-level coordinator**. It must remain lightweight and fast.
   - Large file inspections, deep codebase searches, verbose compiler outputs, and full test logs **must never enter the main chat directly**.
   - All token-heavy reconnaissance, drafting, code authoring, and test executions must be offloaded to isolated subagents.
2. **Subagent Communication Contract**:
   - Subagents must return only **distilled executive summaries** (bulleted findings, diff summaries, test pass/fail status, and line references).
   - If a subagent encounters a failure, it returns a concise failure diagnostic diff, not thousands of lines of raw tracebacks.
3. **TL;DR Itemized Communication Standard (Anti-Wall-of-Text)**:
   - **Strictly avoid walls of text** across all communications (PM to User, PM to Subagents, and Subagents to PM).
   - Every status message, update, or report must lead with a concise **TL;DR**, followed by structured, itemized bullet points.
   - Maximize information density, eliminate narrative fluff, and keep messages instantly scannable.

### The 4-Phase Subagent Workflow

#### Phase 1: Research Subagent (`research`)
- **Mission**: Ingest problem statements, explore the repository (`find_by_name`, `grep_search`, `view_file`), locate existing implementations, configurations, models, and constraints.
- **Output to PM**: A concise bulleted technical brief:
  - Files identified and relevant line numbers.
  - Existing patterns, schemas, and dependencies.
  - Potential architectural risks and gotchas.

#### Phase 2: Draft & Propose Subagent (`draft_and_propose`)
- **Mission**: Synthesize research findings into a targeted implementation plan or architectural proposal.
- **Output to PM**:
  - Exact file modification list (`[NEW]`, `[MODIFY]`, `[DELETE]`).
  - Proposed Pydantic schemas, routing rules, or UI changes.
  - Trade-off analysis and verification strategy.
  - The PM reviews this proposal and presents it to the user for sign-off when necessary.

#### Phase 3: Implement Subagent (`implement`)
- **Mission**: Execute approved changes directly in code (`write_to_file`, `replace_file_content`).
- **Rules**:
  - Follow repository standards (Python 3.12, FastAPI, Pydantic v2, React TypeScript, Obsidian vault conventions).
  - Keep edits surgical and maintain documentation integrity.
- **Output to PM**: A succinct summary of applied changes, touched files, and any design deviations.

#### Phase 4: Smoke Test Subagent (`smoke_test`)
- **Mission**: Execute automated end-to-end smoke test scripts located under `scripts/`.
- **CRITICAL INVARIANT — Smoke Tests, NOT Unit Tests**:
  - Verification must use **end-to-end smoke tests** (`python scripts/smoke_test*.py`), testing actual runtime behavior, pipeline integration, and exit code 0.
  - Do NOT write or rely on brittle, isolated unit tests. The harness requires live or mocked pipeline smoke validation that exercises the full system.
- **Output to PM**: Clean pass/fail confirmation, duration, and if failed, the exact error assertion for auto-correction.

---

## 3. Agent Execution Harness & Lifecycle

Every agent (PM or subagent) operating within this repository must execute under a **bounded, step-limited ReAct execution loop**:

$$\text{Observe Environment} \longrightarrow \text{Plan / Reason} \longrightarrow \text{Execute Tool} \longrightarrow \text{Validate Output} \longrightarrow \text{Self-Correct / Emit}$$

```
                     ┌───────────────────────────────┐
                     │          Input State          │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │     1. Pre-Flight Checks      │
                     │  - Validate schema & budget   │
                     │  - Input token cap check      │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │     2. Planning & Tool Loop   │◄───────────────────────┐
                     │  - Step count <= MaxBudget    │                        │
                     │  - Run sandboxed tool calls   │                        │
                     └───────────────┬───────────────┘                        │
                                     │                                        │
                                     ▼                                        │
                     ┌───────────────────────────────┐                        │
                     │      3. Guardrail Audit       │                        │
                     │  - Schema & Quote checks      │                        │
                     │  - Negative constraint checks │                        │
                     └───────┬───────────────┬───────┘                        │
                             │               │                                │
                       [Valid Pass]     [Failed Audit]                        │
                             │               │                                │
                             │               ▼                                │
                             │       ┌───────────────────────────────┐        │
                             │       │      4. Auto-Correction       │        │
                             │       │  - Inject targeted diff err   ├────────┘
                             │       │  - Single retry turn allowed  │ (Retry max 1x)
                             │       └───────────────────────────────┘
                             ▼
                     ┌───────────────────────────────┐
                     │      5. Persist & Verify      │
                     │  - Write vault markdown/JSON  │
                     │  - Run smoke test validation  │
                     └───────────────────────────────┘
```

### Execution Rules & Invariants:
1. **Step Budget**: Agents must not exceed **10 tool turns** for a single subtask without pausing or logging progress. Unbounded recursive loops are strictly prohibited.
2. **Deterministic Timeouts**: Networked LLM calls must adhere to configured request timeouts (`ai_request_timeout_seconds = 300.0`, connect timeout `60.0s`).
3. **Idempotent Operations**: All file generation and database mutations must be idempotent. Repeating an agent run on the same inputs must update or safely overwrite the target without corrupting graph links or duplicating entries.

---

## 4. Multi-Tier Guardrails & Auto-Correction Protocol

All operations must pass through four concentric guardrail boundaries. When a guardrail triggers a validation error, the agent must execute an **Auto-Correction Loop**.

### Tier 1: Input Guardrails
- **Token Budgeting**: Calculate input token size before dispatching to LLM providers using `client.models.count_tokens` (avoid crude character approximations). Reject or chunk inputs exceeding model context boundaries.
- **Strict Typing**: All payload inputs must conform to Pydantic models. Raw dictionaries or unvalidated query params are forbidden.
- **Directory Boundary**: Agents must never read or write files outside the workspace root (`yt-research-gen`). Absolute paths outside the repository must be rejected.

### Tier 2: Execution & Environment Guardrails
- **Sandbox Confinement**: All terminal commands must run within standard sandboxed environments by default. Never elevate permissions unless strictly necessary and explicitly approved.
- **Circuit Breaker Respect**: Honor the sticky circuit breaker (`backend/app/services/ai/circuit_breaker.py`). If a model encounters a 429 daily quota or 404 deprecation, it must be bypassed with 0s latency penalty, descending the cascade immediately (`gemini-3.8-flash` $\to$ `gemini-3.6-flash` $\to$ `openai_compatible`).
- **Safe State Changes**: Destructive operations (`rm -rf`, file deletions, vault purging) require explicit human confirmation.

### Tier 3: Output Quality & Constraint Guardrails
- **Pydantic Schema Decoding**: All generative agents producing structured data must enforce Gemini's native `response_schema` with `response_mime_type="application/json"`.
- **Lexical Negative Constraints**:
  - Strictly banned phrases: *"seamless"*, *"effortless"*, *"game-changer"*, *"lightweight"*, *"cutting-edge"*, *"blazing fast"*, *"transformative"*, *"operational excellence"*.
  - Banned tone: Marketing platitudes, sales brochure cheerleading, and sanitized textbook platitudes.
- **Volume & Pacing Constraints**:
  - Teleprompter scripts must contain full spoken paragraphs totalling **750 to 1,000 words** (calibrated for 5–7 spoken minutes at ~140 WPM). Bullet-point outlines or truncated transcripts fail validation.
- **Communication Guardrail (No Walls of Text)**:
  - All agent messages, status reports, and delegation handoffs must strictly avoid walls of text.
  - Format with an immediate, scannable **TL;DR** followed by concise, itemized bullet points.

### Tier 4: Grounding & Citation Integrity Guardrails
- **Verbatim Quote Substring Check**: For any extracted fact or cited proposition, `exact_quote` MUST be an exact, character-for-character substring of the input source text (`exact_quote in source_text`).
- **Footnote Graph Resolution**: In synthesized guides or curriculum arcs, every cited footnote `[^N]: [[facts/{fact_id}]]` must resolve to a valid, existing `fact_id` in the vault. Hallucinated fact IDs trigger an immediate validation failure.

### The Auto-Correction Protocol (Targeted 1-Turn Retry)
When an output fails Tier 3 or Tier 4 guardrails:
1. **Intercept**: Do not persist or return the flawed output.
2. **Formulate Error Diff**: Construct a concise feedback payload detailing the exact failure:
   ```json
   {
     "error": "GUARDRAIL_VALIDATION_FAILURE",
     "violations": [
       {"rule": "LEXICAL_NEGATIVE_CONSTRAINT", "found": ["seamless", "game-changer"]},
       {"rule": "VERBATIM_QUOTE_MISMATCH", "fact_id": "fact_01", "error": "Quote not found in chunk text"},
       {"rule": "SCRIPT_WORD_BUDGET", "actual_words": 520, "required_range": [750, 1000]}
     ]
   }
   ```
3. **Single Retry Turn**: Send the feedback message back into the model context with the instruction:
   > *"Your previous output failed the following guardrails: [violations]. Regenerate the response strictly adhering to the schema and resolving all listed violations."*
4. **Hard-Fail**: If the auto-correction turn fails a second time, abort the operation, log the telemetry, and escalate to the user/operator.

---

## 5. Tools & Execution Environment

### Python Environment
- Python path: `.venv/bin/python`
- Package manager: `pip` (within `.venv`)
- Backend runner: `./run_backend.sh` or `.venv/bin/python run_backend.py` (runs Uvicorn on `http://127.0.0.1:8000`)
- Backend dependencies: `backend/requirements.txt`

### Frontend Environment
- Node package manager: `npm` (run inside `frontend/`)
- Build verification: `npm run build`
- Type checking: `npx tsc --noEmit`
- Linter: `npm run lint`

### Testing & Verification Scripts (Smoke Test Harness)
All automated verification must run the dedicated smoke test suite under `scripts/`:
- `python scripts/smoke_test.py` — Core vault, chunking, AI router, and synthesis test.
- `python scripts/smoke_test_projects.py` — Multi-project isolation and metadata storage test.
- `python scripts/smoke_test_curriculum.py` — Arc sequencing and pedagogical tier test.
- `python scripts/smoke_test_scripts.py` — Teleprompter script generator and word count test.
- `python scripts/smoke_test_presentation.py` — Slide deck generator, A/B variants, and metric test.
- `python scripts/smoke_test_practitioner_seeder.py` — Negative constraint briefing and seed fact test.
- `python scripts/smoke_test_av_editor.py` — Media and timeline generation test.
- `python scripts/live_ai_smoke_test.py` — Live end-to-end AI provider connectivity test.

---

## 6. Memory Architecture & Knowledge Vault Conventions

Agents interact with memory across three layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Working Memory (Agent Scratchpad / Task State)                      │
│    - Current active project_id (e.g. 'proj_cloudflare_origin_incident')│
│    - Intermediate JSON payloads, tool call queue, validation diffs     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ 2. Contextual Episodic Memory (Session Conversation)                   │
│    - Active conversation turns with tool calls and function responses  │
│    - Compressed via sliding window when token limits approach 80%      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│ 3. Persistent Semantic Memory (Obsidian Vault: 'vault/projects/<id>/') │
│    - sources/      : Raw markdown inputs with chunk manifests          │
│    - facts/        : Atomic fact notes with tags & exact quotes        │
│    - guides/       : Synthesized reference guides with footnotes [^1]  │
│    - curriculum/   : Pedagogical 3-tier course blueprints              │
│    - scripts/      : Production teleprompter transcripts (750-1000 w)  │
│    - presentations/: Dual-variant slide decks & cognitive metrics      │
└────────────────────────────────────────────────────────────────────────┘
```

### Vault Markdown Formatting Standards:
- **YAML Frontmatter**: All vault documents must include valid YAML frontmatter specifying `id`, `title`, `created_at`, `tags`, and relevant metadata.
- **Wikilinks**: Cross-document references must use double-bracket links: `[[facts/fact_id]]` or `[[sources/source_id]]`.
- **Block Anchors**: Verbatim facts in notes must conclude with block anchors matching their fact ID: `^fact_id`.
- **Footnotes**: Synthesized documents must format citations as standard markdown footnotes pointing to fact files:
  ```markdown
  PagedAttention minimizes memory waste during KV cache serving[^1].

  ## Footnotes & Citations
  [^1]: [[facts/fact_clab_mem_01]] ^fact_clab_mem_01 — PagedAttention achieves near-optimal memory utilization.
  ```

---

## 7. Modern Gemini Best Practices (`google-genai` SDK)

All agents utilizing Google GenAI / Gemini models must adhere to the following standards:

1. **SDK Conventions**:
   - Always import from `google.genai`:
     ```python
     from google import genai
     from google.genai import types
     
     client = genai.Client(api_key=settings.gemini_api_key)
     ```
   - Do NOT import or rely on legacy `google.generativeai`.
2. **System Instruction Separation**:
   - Persona definitions, negative constraints, and formatting rules must be supplied in `types.GenerateContentConfig(system_instruction=...)`.
   - Dynamic prompt contents and user data must remain in `contents`.
3. **Structured Outputs**:
   - Pass Pydantic schemas directly to `response_schema` with `response_mime_type="application/json"`:
     ```python
     config = types.GenerateContentConfig(
         temperature=0.2,
         system_instruction=SYSTEM_PROMPT,
         response_mime_type="application/json",
         response_schema=TargetOutputSchema,
     )
     ```
4. **Reasoning & Thinking Budgeting**:
   - For complex architectural reasoning or multi-tier script generation on supported Gemini models, configure `thinking_config` with an appropriate budget to permit intermediate reasoning before emitting the final schema.
5. **Token Pre-Flight Budgeting**:
   - Before dispatching large batches of facts or transcripts, compute exact tokens:
     ```python
     token_count = await client.aio.models.count_tokens(model=model_name, contents=prompt)
     ```

---

## 8. Pre-Completion Quality & Smoke Test Verification Checklist

Before completing any implementation, refactor, or content generation task, the agent must execute this checklist:

- [ ] **Token Conservation & Concise Comms**: Confirm the main chat only received distilled summaries, all communications strictly avoided walls of text, and every message used an itemized TL;DR format.
- [ ] **Workspace Isolation**: Confirm all modified or generated files reside within the repository tree.
- [ ] **Schema Conformance**: Verify that all JSON or structured outputs conform to target Pydantic models without missing required fields.
- [ ] **Verbatim Grounding Check**: If facts were extracted, verify that `exact_quote in source_text` evaluates to `True`.
- [ ] **Negative Constraint Check**: Run a regex or lexical scan over generated text to guarantee no banned marketing buzzwords are present.
- [ ] **Word Count Compliance**: For video scripts, assert that total spoken word count falls strictly within $[750, 1000]$ words.
- [ ] **Citation Resolution**: Confirm that all wikilinks `[[facts/...]]` and footnotes point to active files in the vault.
- [ ] **Smoke Test Run (No Unit Tests)**: Execute the relevant end-to-end smoke test script in `scripts/` (e.g. `.venv/bin/python scripts/smoke_test.py`) and confirm exit code 0.
