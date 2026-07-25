# 🐝 AgentHive — AI Virtual Team for Small Businesses

> **An AI-powered virtual team that orchestrates 5 specialist agents through a single chat interface — accessible via web dashboard, WhatsApp, and voice.** Built with FastAPI, LangGraph, Next.js, and Gemini 2.5 Flash.

![AgentHive](https://img.shields.io/badge/status-MVP%20Ready-brightgreen) ![Python](https://img.shields.io/badge/python-3.12-blue) ![Next.js](https://img.shields.io/badge/next.js-14-black)

---

## 🏗️ Architecture

```
                    ┌──────────────┐  ┌──────────────┐
                    │  WhatsApp    │  │   Browser     │
                    │  (Meta/      │  │  Dashboard    │
                    │   Twilio)    │  │  + Voice 🎤   │
                    └──────┬───────┘  └──────┬────────┘
                           │                 │
               ┌───────────▼─────────────────▼───────────┐
               │           FastAPI Backend                │
               │                                          │
               │  ┌────────────────────────────────────┐  │
               │  │      Manager Agent (LangGraph)     │  │
               │  │  classify intent → route to agent  │  │
               │  └──┬────┬────┬────┬────┬────────────┘  │
               │     │    │    │    │    │                 │
               │  ┌──▼┐┌──▼┐┌──▼┐┌──▼┐┌──▼──┐            │
               │  │💰 ││📝 ││📅 ││🛟 ││📊  │  Gemini    │
               │  │Fin││Con││Sch││Sup││Ana  │  2.5 Flash │
               │  └──┬┘└──┬┘└──┬┘└──┬┘└──┬──┘            │
               │     └────┴──┬─┴────┴────┘                │
               │             │                             │
               │  ┌──────────▼──────────┐                  │
               │  │ Supabase (Auth+PG)  │                  │
               │  │   or SQLite (dev)   │                  │
               │  └─────────────────────┘                  │
               │             │                             │
               │  ┌──────────▼──────────┐                  │
               │  │  Google Calendar    │                  │
               │  │  (OAuth per-user)   │                  │
               │  └─────────────────────┘                  │
               └───────────────────────────────────────────┘
```

## ✅ Features

### Core (Fully Working)
- **Manager Agent** — LangGraph supervisor that classifies intent and routes to the right specialist
- **5 Specialist Agents**, each with real Gemini API calls and database tools:
  - 💰 **Finance Agent** — Log expenses, create invoices, get spending summaries
  - 📝 **Content Agent** — Draft social posts, emails, proposals
  - 📅 **Scheduler Agent** — Create reminders, schedule meetings on Google Calendar, list upcoming events
  - 🛟 **Support Agent** — Answer customer questions using RAG over seeded FAQ
  - 📊 **Analytics Agent** — Business performance summaries across all data
- **WhatsApp Gateway** — Dual-path (Meta Cloud API + Twilio Sandbox), gated by `WHATSAPP_PROVIDER` env flag
- **Voice Support** — 🎤 Mic button on dashboard (Web Speech API, zero keys), Gemini native audio for WhatsApp voice notes
- **Google Calendar OAuth** — Per-user OAuth 2.0 flow, create + read events, native reminders
- **Supabase Auth + Postgres** — With automatic fallback to SQLite + custom JWT for local dev
- **Next.js Dashboard** — Agent cards, stats, chat panel with voice, live activity feed
- **Docker Compose** — Full stack in one command

### Stretch (Working)
- 🏪 **Marketplace** — Browse & hire third-party agents
- 💳 **Razorpay Payments** — Finance Agent creates real payment links

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+, Node.js 18+
- [OpenRouter](https://openrouter.ai) or [Google AI Studio](https://aistudio.google.com) API key

> **Only the Gemini API key is required to start.** Supabase, WhatsApp, and Calendar can be added incrementally. See [CREDENTIALS_GUIDE.md](CREDENTIALS_GUIDE.md) for full setup instructions.

### Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd agenthive

# 2. Copy env template and add your Gemini key
cp .env.example .env
# Edit .env → add GEMINI_API_KEY (minimum to get started)

# 3. Backend
cd backend
pip install -r requirements.txt
uvicorn backend.core.app:app --reload

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev

# 5. (Optional) Add WhatsApp — fill TWILIO_* vars in .env
# 6. (Optional) Add Calendar — fill GOOGLE_CLIENT_* vars in .env
# 7. (Optional) Add Supabase — fill SUPABASE_* vars in .env
```

### Access
| Service | URL |
|---------|-----|
| **Dashboard** | http://localhost:3000 |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |
| **Calendar OAuth** | http://localhost:8000/api/calendar/auth?user_id=1 |

### Key Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | OpenRouter or Google AI Studio API key |
| `SUPABASE_DB_URL` | Optional | Supabase Postgres connection string (falls back to SQLite) |
| `SUPABASE_URL` | Optional | Supabase project URL (for auth) |
| `WHATSAPP_PROVIDER` | Optional | `"twilio"` or `"meta"` |
| `GOOGLE_CLIENT_ID` | Optional | Google Calendar OAuth client ID |

See [.env.example](.env.example) for the full list and [CREDENTIALS_GUIDE.md](CREDENTIALS_GUIDE.md) for step-by-step instructions.

---

## 🎬 Demo Script (for Judges)

Open http://localhost:3000 and walk through these actions:

### 1. See the Dashboard
> The dashboard loads with 6 agent cards (5 specialists + WhatsApp gateway), stats from seeded data, and a populated activity feed. "Sunrise Bakery" is the demo business.

### 2. Finance Agent
Type: **"Add an expense of $150 for flour supplies"**
> The Finance Agent logs the expense to the database. Activity feed updates in real time.

### 3. Content Agent
Type: **"Draft a social media post about our new sourdough bread"**
> The Content Agent creates real marketing copy and saves it as a draft.

### 4. Scheduler Agent
Type: **"Remind me to order supplies next Monday at 9am"**
> The Scheduler Agent parses the natural language date and creates a reminder (and a Google Calendar event if connected).

### 5. Support Agent (RAG)
Type: **"What are your bakery hours?"**
> The Support Agent searches the FAQ database using vector similarity and responds with accurate information.

### 6. Analytics Agent
Type: **"Give me a summary of this month's expenses"**
> The Analytics Agent queries the database and presents a categorized breakdown.

### 7. Voice Input 🎤
> Click the microphone button → speak your request → it transcribes and auto-fills the chat input. Uses browser Web Speech API — no API key needed.

### 8. WhatsApp (Twilio Sandbox)
> Send a WhatsApp message to the Twilio sandbox number → the Manager Agent processes it and replies. Voice notes are transcribed using Gemini's native audio input.

### 9. Marketplace (Stretch)
> Click "Marketplace" in the nav. Browse 5 third-party agents. Click "Hire" to add one.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI |
| Agent Orchestration | LangGraph (supervisor graph) |
| LLM | Gemini 2.5 Flash via OpenRouter |
| Database | Supabase PostgreSQL (SQLite fallback) |
| Auth | Supabase Auth (custom JWT fallback) |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Chat Channels | Web dashboard + WhatsApp (Meta / Twilio) |
| Voice (Dashboard) | Web Speech API (SpeechRecognition + SpeechSynthesis) |
| Voice (WhatsApp) | Gemini native audio transcription |
| Calendar | Google Calendar OAuth 2.0 (per-user) |
| RAG | FAISS + sentence-transformers |
| Payments | Razorpay |

---

## 📁 Project Structure

```
agenthive/
├── backend/
│   ├── core/            # FastAPI app, config, database, auth, LLM
│   ├── orchestration/   # Manager Agent, LangGraph graph, shared state
│   ├── agents/          # 5 specialist agents
│   ├── integrations/    # WhatsApp (Meta+Twilio), voice, calendar, payments, chat API
│   ├── rag/             # Vector store for Support Agent FAQ search
│   ├── db/              # SQLAlchemy models, seed data
│   └── requirements.txt
├── frontend/
│   ├── app/             # Next.js app router pages
│   ├── components/      # ChatWidget (with voice), AgentCard, etc.
│   ├── lib/             # API client, auth helpers
│   └── utils/supabase/  # Supabase client/server/middleware
├── .env.example
├── CREDENTIALS_GUIDE.md
└── README.md
```

---

## 🔌 WhatsApp Integration

AgentHive supports two WhatsApp integration paths, selectable via `WHATSAPP_PROVIDER`:

### Twilio Sandbox (fastest for demo)
1. Set `WHATSAPP_PROVIDER=twilio` in `.env`
2. Fill in `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
3. Point Twilio webhook to `https://your-ngrok-url/api/webhook/whatsapp/twilio`
4. Send the Twilio join code from your phone

### Meta Cloud API (production)
1. Set `WHATSAPP_PROVIDER=meta` in `.env`
2. Fill in `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
3. Point Meta webhook to `https://your-domain/api/webhook/whatsapp`
4. Subscribe to `messages` events

Both paths feed into the **same Manager Agent pipeline** — WhatsApp is a gateway, not a separate agent.

---

## 🗓️ Google Calendar

Each user connects their own Google Calendar via OAuth:

1. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
2. Open `http://localhost:8000/api/calendar/auth?user_id=1`
3. Complete the Google consent flow
4. The Scheduler Agent can now create and read events on your calendar
5. Events use Google Calendar's native reminders — no Celery/Redis needed

---

## 📄 License

MIT
