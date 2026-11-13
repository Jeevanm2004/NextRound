<div align="center">
  <img width="1200" height="475" alt="NextRound Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  # NextRound

  **AI-powered job application pipeline tracker and interview prep coach.**  
  *Stay on top of high-volume hiring pipelines, track follow-up deadlines, and prep for screening calls in seconds.*

  <br />

  [![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-Google_AI_Studio-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.studio/apps/e7b0f21e-8a26-4e64-b627-94238b556173)

  <br />

  [![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Gemini API](https://img.shields.io/badge/Google_Gemini-gemini--3.5--flash--lite-4285f4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
  [![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)
</div>

---

> 🚀 **Live Deployment:** Try NextRound directly in your browser on **[Google AI Studio](https://ai.studio/apps/e7b0f21e-8a26-4e64-b627-94238b556173)**.

---

## 📌 Overview

**NextRound** (also referenced as *HireLoop*) is an executive job application pipeline tracker and interview preparation assistant. When managing dozens of high-volume job applications, job seekers frequently face dropped follow-ups, fragmented interview notes, and surprise recruiter screening calls. 

NextRound solves this with a centralized, client-side dashboard that combines visual pipeline management with automated AI-generated interview prep powered by Google's Gemini API.

---

## ✨ Core Features

### 1. Interactive Application Pipeline (Board & List)
- **Four-Stage Kanban Flow:** Organize applications across `Saved`, `Applied`, `Interview`, and `Offer`.
- **Drag-and-Drop Organization:** Move applications between columns with responsive drop-target indicators and 1-click stage advancement buttons.
- **Rich Card Context:** Each role displays target pay bands (`$min - $max`), work mode (`Remote`, `Hybrid`, `On-site`), location, associated resume version, and round counts.
- **Deep Search & Filtering:** Filter by work mode, specific resume version, minimum compensation, priority stars, and text search across company names, roles, and interview notes.

### 2. Smart Follow-Up & Activity Intelligence
- **Follow-Up Deadlines:** Dynamic scheduling on every role dossier with automatic `Due Today` (amber) and `Overdue` (rose) status badges.
- **Idle Application Alerts:** Automatically flags roles with 5+ days of no activity or status changes so opportunities never slip through the cracks.
- **One-Click "Touch":** Log recruiter check-ins instantly to reset idle timers and advance follow-up dates by 4 days.
- **Upcoming Interviews Strip:** Sticky timeline view summarizing upcoming interview rounds, interviewers, and countdowns.

### 3. AI Job Description Analyzer (Google Gemini)
- **Instant Dossier Extraction:** Paste any raw job description directly onto an application card.
- **Powered by `gemini-3.5-flash-lite`:**
  - Extracts the top required core technical and domain skills.
  - Generates 3 targeted, high-probability interview questions with talking points.
  - Drafts a concise, professional follow-up note ready to send to hiring managers.
- **Graceful Error Handling:** Integrated retry backoff, quota management, and user-friendly error banners.

### 4. Rounds, Resumes & Compensation Hub
- **Rounds & Prep Hub:** Dedicated interview tracker for all scheduled, waiting, passed, or completed interview rounds with debrief notes.
- **Resume Versioning:** Track which resume variant (`v3.9 - Product Lead`, `v4.2 - Staff Systems`) was submitted to each company.
- **Compensation Analytics:** Visual breakdown of offer conversions, salary distributions, and stage-by-stage pipelines.

### 5. Modern UX & Interaction Polish
- **Adaptive Dark / Light Themes:** Fully calibrated high-contrast light and dark themes with zero-FOUC inline scripts and smooth CSS View Transitions (`document.startViewTransition`).
- **Interactive Toast Notifications with Undo:** Floating status alerts with instant `Undo` support for stage changes, deletions, and follow-up updates.
- **Tactile Micro-Interactions:** Custom SVG spring animations on priority stars, rotational icon morphing for theme toggles, and button compression feedback.
- **Data Privacy & Portability:** 100% client-side persistence via `localStorage` with JSON export, import, and backup restoration.

---

## ⌨️ Keyboard Shortcuts

Navigate and manage your entire job search without touching the mouse:

| Shortcut | Action |
| :--- | :--- |
| <kbd>⌘ K</kbd> or <kbd>/</kbd> | Focus global pipeline search |
| <kbd>N</kbd> | Open **Add Application Role** modal |
| <kbd>1</kbd> | Jump to **Pipeline** board |
| <kbd>2</kbd> | Jump to **Rounds & Prep** |
| <kbd>3</kbd> | Jump to **Resumes** |
| <kbd>4</kbd> | Jump to **Compensation** |
| <kbd>?</kbd> | Toggle **Keyboard Shortcuts** modal |
| <kbd>Esc</kbd> | Close any open drawer, modal, or clear search |

---

## 🛠️ Tech Stack & Architecture

- **Frontend:**
  - [React 19](https://react.dev/) — Component architecture and state management
  - [TypeScript](https://www.typescriptlang.org/) — End-to-end type safety
  - [Vite 8](https://vitejs.dev/) — Lightning-fast development and build tooling
  - [Tailwind CSS v4](https://tailwindcss.com/) — Modern utility-first CSS styling
  - [Lucide React](https://lucide.dev/) — Consistent, accessible icons
- **Backend & Server:**
  - [Node.js](https://nodejs.org/) & [Express 4](https://expressjs.com/) — API routing and Vite development middleware
  - [tsx](https://github.com/privatenumber/tsx) — Zero-config TypeScript execution for `server.ts`
- **AI Engine:**
  - [@google/genai SDK](https://www.npmjs.com/package/@google/genai) — Official Google Gen AI SDK
  - Model: `gemini-3.5-flash-lite` — Structured JSON generation for job description analysis
- **Storage:**
  - Browser `localStorage` for offline-capable, private client-side data persistence

---

## 🚀 End-to-End AI Development Workflow

NextRound was built during an intensive, hands-on rapid prototyping sprint exploring human-agent collaboration:

```
┌────────────────────────┐      ┌──────────────────────────┐
│     Google Stitch      │ ───> │     Google AI Studio     │
│ (UI Conceptualization) │      │ (Prototyping & Gemini)   │
└────────────────────────┘      └──────────────────────────┘
                                             │
                                             ▼
┌────────────────────────┐      ┌──────────────────────────┐
│      GitHub Repo       │ <─── │    Google Antigravity    │
│  (Version Control/CI)  │      │ (Refinement & UX Polish) │
└────────────────────────┘      └──────────────────────────┘
```

1. **UI Conceptualization (Google Stitch):** Rapid wireframing and design token exploration for executive SaaS dashboards.
2. **Interactive Prototyping (Google AI Studio):** Rapid feature assembly, state schema design, and Gemini API integration (`gemini-3.5-flash-lite`) ([View App on AI Studio](https://ai.studio/apps/e7b0f21e-8a26-4e64-b627-94238b556173)).
3. **Local Refinement & Code Polish (Google Antigravity):** Transitioned to local agentic development in Antigravity to implement adaptive Light/Dark mode, zero-FOUC scripts, toast notifications with Undo, View Transitions, and global keyboard shortcuts.
4. **Version Control (GitHub):** Production bundling and deployment readiness.

---

## 💻 Local Setup & Installation

### Prerequisites
- **Node.js**: `v20.0.0` or higher (tested with `v22+`)
- **npm**: `v10+`
- **Google Gemini API Key**: [Get an API Key](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository
```bash
git clone https://github.com/Jeevanm2004/NextRound.git
cd NextRound
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create your local `.env` or `.env.local`:
```bash
cp .env.example .env.local
```

Open `.env.local` and add your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 4. Launch the Development Server
```bash
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📦 Available Scripts

In the project root, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express backend server with Vite middleware using `tsx server.ts` |
| `npm run build` | Builds the optimized production assets to the `dist/` directory |
| `npm run start` | Runs the production server from compiled assets |
| `npm run preview` | Locally preview the production build via Vite |
| `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) without emitting code |
| `npm run clean` | Deletes build artifacts (`dist/` and `server.js`) |

---

## 📂 Project Structure

```text
NextRound/
├── src/
│   ├── components/
│   │   ├── AddApplicationModal.tsx     # Modal for creating job applications
│   │   ├── AnalyticsScreen.tsx         # Compensation charts & data backup
│   │   ├── ApplicationDrawer.tsx       # Role dossier & AI JD Analyzer
│   │   ├── CompanyMark.tsx             # Dynamic company avatar badges
│   │   ├── KanbanCard.tsx              # Application card with quick actions
│   │   ├── KeyboardShortcutsModal.tsx  # Shortcuts cheat sheet (?)
│   │   ├── MobileBottomNav.tsx         # Responsive mobile navigation
│   │   ├── PipelineScreen.tsx          # Main Kanban board & List view
│   │   ├── ResumesScreen.tsx           # Resume versioning manager
│   │   ├── ScheduleScreen.tsx          # Interview rounds & schedule
│   │   ├── ThemeToggle.tsx             # Smooth dark/light mode toggle
│   │   ├── Toast.tsx                   # Accessible notifications with Undo
│   │   └── TopBar.tsx                  # Header navigation & quick actions
│   ├── data/
│   │   └── seedData.ts                 # Initial sample applications & rounds
│   ├── utils/
│   │   ├── stageStyles.ts              # Stage colors, badge glow & visual tokens
│   │   └── storage.ts                  # LocalStorage data persistence layer
│   ├── types.ts                        # TypeScript domain model definitions
│   ├── index.css                       # Design tokens, theme styles & animations
│   ├── App.tsx                         # Core application controller
│   └── main.tsx                        # Application DOM entry point
├── server.ts                           # Express server & Gemini AI API proxy
├── index.html                          # HTML shell with zero-FOUC theme script
├── package.json                        # Dependencies, scripts & metadata
├── tsconfig.json                       # TypeScript compiler configuration
├── vite.config.ts                      # Vite build & bundler configuration
└── README.md                           # Project documentation
```

---

## 📄 License

This project is licensed under the [Apache 2.0 License](LICENSE).
