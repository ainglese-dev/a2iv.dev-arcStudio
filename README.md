# ArcStudio — [a2iv.dev](https://a2iv.dev)
### Research Distillation, Pedagogical Curriculum Architecture & Presentation Engine

[![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0+-3178C6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38B2AC.svg)](https://tailwindcss.com/)
[![Obsidian Vault](https://img.shields.io/badge/Knowledge_Graph-Obsidian_Markdown-7C3AED.svg)](https://obsidian.md/)

**ArcStudio** (by [`a2iv.dev`](https://a2iv.dev)) is an AI-powered research distillation and curriculum synthesis engine designed for **technical trainers, course creators, educators, speakers, and video producers**. It transforms dense technical sources, incident post-mortems, research papers, and practitioner notes into a production-ready educational package:

1. **Atomic Grounded Facts**: Verbatim quote extraction with Obsidian block anchors (`^fact_id`).
2. **3-Tier Pedagogical Curriculum Arcs**: 6-episode structured syllabus (Foundation &rarr; Core Implementation &rarr; Production Reality).
3. **Spoken Teleprompter Scripts**: Calibrated 750–1,000 word spoken transcripts (~5–7 min pacing) with visual cues and timing markers.
4. **Synchronized 16:9 Presentation Decks**: Dual-variant slide decks featuring **Variant A (Terminal Dark / Engineering Analytic)** and **Variant B (Clean Infographic / Executive Summary)**.
5. **Local Obsidian Knowledge Vault**: Transparent filesystem-backed Markdown knowledge graph with YAML frontmatter, wikilinks (`[[...]]`), and footnotes (`[^1]`).

---

## What's New in v0.2: The Director's Cut

Inspired by minimalist, distraction-free creative environments, **v0.2 Director's Cut** removes dashboard clutter and introduces an autonomous production workflow:

- ⚡ **Auto-Pilot Creative Stream**: Single spotlight prompt (`"What video are we directing today?"`) &rarr; 1-click autonomous synthesis of all deliverables with live telemetry.
- 🎬 **Horizontal Episode Switcher**: Seamlessly toggle between Episode 1, Episode 2, and all curriculum episodes with 1-click generation for ungenerated episodes.
- 🚀 **Zero-Friction Project Initialization**: Create a project workspace with just a title (**1 field &rarr; Enter**), backed by intelligent AI vision auto-suggestion and cross-domain presets (Cinema, Ethics, Finance, Biotech, Urbanism, Distributed Systems).
- 👁️ **Production Teleprompter**: Autoscrolling prompter with variable WPM controls, optometric low-vision contrast, and Daylight/Dark themes.
- 🛡️ **Model Cascade & Circuit Breakers**: Built on `google-genai` SDK (`gemini-3.8-flash` &rarr; `gemini-3.6-flash`) with automatic failover to local OpenAI-compatible models (Ollama, vLLM, Qwen).

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 19 + Vite Frontend                        │
│   - Director's Cut Minimalist Shell (DirectorStream / Canvas)          │
│   - 16:9 Presentation Stage (Dual Variant A/B + Fullscreen Presenter)  │
│   - Spoken Teleprompter Reader (Autoscroll + WPM Pacing)               │
│   - Interactive 6-Episode Curriculum Arc Strip                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         FastAPI Asynchronous Backend                   │
│   - Fact Extraction & Verbatim Quoting (Character Substring Checked)   │
│   - Curriculum Arc Sequencing (Pedagogical 3-Tier Arc)                 │
│   - Teleprompter Script Synthesis (750–1,000 Word Budget Enforced)     │
│   - Slide Engine (Domain-Adaptive Analytic & Infographic Visuals)      │
│   - AI Router Layer (Gemini SDK + Sticky Circuit Breakers + Fallback)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Local Filesystem Read/Write
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Obsidian Knowledge Vault (`vault/`)                 │
│   - sources/      : Raw markdown inputs with chunk manifests           │
│   - facts/        : Atomic fact notes with tags & ^fact_id block refs  │
│   - curriculum/   : 6-episode course blueprints with tier sequencing   │
│   - scripts/      : Production teleprompter transcripts (750-1,000w)   │
│   - presentations/: Dual-variant slide decks & timing manifests        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before starting, ensure you have installed:
- **Python 3.12+** (Python 3.11 also supported)
- **Node.js 18+** and **npm**
- An AI provider:
  - **Google Gemini API Key** (recommended): Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
  - *OR* an **OpenAI-compatible local server** (e.g., [Ollama](https://ollama.com/), vLLM, LM Studio) running a model like `qwen2.5` or `llama3.3`.

---

## Quick Start (One-Click Launch)

The fastest way to spin up both the backend and frontend is using the included `start.sh` runner:

### 1. Clone the repository
```bash
git clone <repository-url>
cd yt-research-gen
```

### 2. Configure your API key
Copy the template configuration and paste your Gemini API key:
```bash
cp .env.example .env
```

Open `.env` in your editor and add your key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(If you want to use local models via Ollama instead, see [Local LLM Configuration](#local-llm-configuration-ollama--vllm).)*

### 3. Launch the application
```bash
chmod +x start.sh
./start.sh
```

`start.sh` will automatically:
1. Create a Python virtual environment (`.venv`) if one does not exist.
2. Install Python dependencies from `backend/requirements.txt`.
3. Install frontend dependencies via `npm install`.
4. Concurrently launch:
   - **Backend API**: `http://127.0.0.1:8000` (interactive OpenAPI docs at `http://127.0.0.1:8000/docs`)
   - **Frontend UI**: `http://127.0.0.1:5173`
5. Enable live file auto-reload on both servers.

Press `Ctrl+C` in your terminal at any time to gracefully shut down both services.

---

## Manual Step-by-Step Setup

If you prefer to run services in separate terminal tabs or inspect each step manually:

### Backend Setup (Terminal 1)
```bash
# 1. Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Provision environment variables
cp .env.example .env

# 4. Run backend server
./run_backend.sh
# Alternatively:
# python -m uvicorn app.main:app --app-dir backend --reload --host 127.0.0.1 --port 8000
```

### Frontend Setup (Terminal 2)
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open your browser to **`http://127.0.0.1:5173`**.

---

## Local LLM Configuration (Ollama / vLLM)

If you don't want to use cloud APIs or are testing offline, configure **ArcStudio** to point to a local model:

1. Start your local Ollama server:
   ```bash
   ollama run qwen2.5:latest
   ```
2. In `.env`, configure the OpenAI-compatible fallback:
   ```env
   AI_PRIMARY_PROVIDER=openai_compatible
   OPENAI_BASE_URL=http://localhost:11434/v1
   OPENAI_API_KEY=EMPTY
   OPENAI_MODEL=qwen2.5
   ```
3. Restart `./start.sh`. The engine will route all fact extraction, scriptwriting, and slide generation directly through your local Ollama instance.

---

## Guided Tour & Testing Walkthrough

Here is a 3-minute walkthrough to test and explore the system:

### 1. Initialize a Project Workspace
- In the top header bar, click the project selector and choose **`+ New Project`**.
- Try typing a title: e.g. `"Raft Consensus Invariants"` or `"The Autonomous Dilemma"`.
- Click **`[ ✨ Auto-Suggest Vision ]`** to see how it automatically infers a thesis, target audience, and key research questions.
- Click **`[ ⚡ Create Project Workspace ]`** (or just press **Enter**).

### 2. Direct a Video (Auto-Pilot Express)
- In the center spotlight prompt, select one of the suggestion chips (or type a custom topic/angle).
- Click **`[ ⚡ Direct Video Package ]`**.
- Watch the live 4-phase production feed:
  1. *Extracting Atomic Facts* (verbatim quotes verified)
  2. *Architecting 3-Tier Curriculum Arc* (6 episodes sequenced)
  3. *Authoring Spoken Script* (750–1,000 words calibrated for Ep 1)
  4. *Synthesizing 16:9 Presentation Slides* (Variant A & B)

### 3. Review the Director's Cut Deliverables
- **16:9 Slide Canvas**:
  - Toggle between **Variant A** (Terminal Dark / Engineering Analytic) and **Variant B** (Clean Infographic / Executive Summary).
  - Use `<` and `>` arrow keys to navigate slides.
  - Click **`[ 🖥️ Present Fullscreen ]`** (or press `F`) for a full slide show.
- **Spoken Script & Teleprompter**:
  - Read through the spoken paragraphs and visual cue anchors.
  - Click **`[ 👁️ Launch Teleprompter ]`** to open the fullscreen teleprompter modal.
  - Test the autoscroll slider, play/pause, font size adjustments, and Daylight / High-Contrast Yellow mode.
- **Episode Switcher**:
  - Notice the horizontal strip: `Ep 1 ✓`, `Ep 2 ⚡`, `Ep 3 ⚡`...
  - Click **`Ep 2`** to preview the episode's title and pedagogical objective.
  - Click **`[ ⚡ Direct Episode 2 Package ]`** to synthesize its script and presentation slides in one click.
- **Persistent Vault**:
  - Open the `vault/projects/` directory in [Obsidian](https://obsidian.md/) or your code editor to inspect the generated markdown notes, frontmatter metadata, and citations.

---

## Verification & Automated Smoke Tests

To verify pipeline integrity, compliance, and end-to-end generation across the repository, run the smoke test harness:

```bash
# Activate virtual environment
source .venv/bin/activate

# 1. Core vault, router, and fact extraction test
python scripts/smoke_test.py

# 2. Slide engine & dynamic domain A/B presentation test
python scripts/smoke_test_presentation.py

# 3. Teleprompter script generator & word count budget test
python scripts/smoke_test_scripts.py

# 4. Curriculum arc sequencing & pedagogical tier test
python scripts/smoke_test_curriculum.py

# 5. Multi-project workspace isolation test
python scripts/smoke_test_projects.py

# 6. Frontend type check & production build verification
cd frontend && npx tsc --noEmit && npm run build
```

All test scripts should finish with **Exit Code 0**.

---

## Project Structure

```
yt-research-gen/
├── start.sh                       # 1-click startup script (backend + frontend)
├── run_backend.sh                 # Backend startup script
├── .env.example                   # Environment configuration template
├── backend/                       # Python FastAPI backend
│   ├── app/
│   │   ├── api/                   # REST API endpoints (scripts, slides, projects, facts)
│   │   ├── models/                # Pydantic v2 schemas
│   │   ├── services/              # AI generators, chunkers, and vault storage
│   │   │   ├── ai/                # Gemini SDK client, router, circuit breakers
│   │   │   ├── curriculum_generator.py
│   │   │   ├── presentation_generator.py
│   │   │   ├── script_generator.py
│   │   │   └── project_storage.py
│   │   └── config.py              # Application settings
│   └── requirements.txt           # Backend Python dependencies
├── frontend/                      # React 19 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── director/          # v0.2 Director's Cut minimalist workspace
│   │   │   ├── presentation/      # 16:9 Presentation Studio & slide stage
│   │   │   ├── scripts/           # Script Reader & Fullscreen Teleprompter
│   │   │   ├── curriculum/        # Curriculum Arc Studio
│   │   │   ├── research/          # Source & Fact Ingestion
│   │   │   └── projects/          # Project creation & vision modal
│   │   ├── services/api.ts        # API client bindings
│   │   └── App.tsx                # Application root
│   └── package.json               # Frontend dependencies
├── scripts/                       # End-to-end smoke test scripts
└── vault/                         # Obsidian persistent knowledge vault
    └── projects/                  # Markdown project workspaces
```

---

## Feedback & Review Focus

When testing this application, we particularly welcome feedback on:
1. **Director's Cut Ergonomics**: Does the single-stage Auto-Pilot stream feel natural, fast, and distraction-free?
2. **Teleprompter Pacing**: How comfortable is reading scripts in the fullscreen teleprompter at standard speaking rates (~140–150 WPM)?
3. **Slide Visual Differentiation**: Are Variant A (Terminal/Analytic) and Variant B (Clean Infographic) effectively tailored to your domain?
4. **Curriculum Arc Cohesion**: Does the 6-episode progression (Foundation &rarr; Implementation &rarr; Production Reality) make pedagogical sense for complex topics?
