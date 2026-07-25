# 🚀 AgentHive Vercel Deployment & Production WhatsApp Guide

Deploying AgentHive to **Vercel** makes your Next.js Frontend + Python FastAPI Backend + WhatsApp Integration live 24/7 on a public URL — **no local ngrok needed**.

Anyone visiting your hosted website can chat with your AI team on the web OR tap the WhatsApp button to chat with the AI team on WhatsApp!

---

## 🏗️ Architecture on Vercel

```
                               ┌─────────────────────────────┐
                               │       Vercel Platform       │
                               │                             │
 WhatsApp (Twilio) ───────────►│  /api/webhook/whatsapp/...  │
   Incoming Messages           │  (Python FastAPI Backend)   │
                               │              │              │
 Visitor Web Browser ──────────►│  /dashboard, /auth, etc.   │
   Next.js UI + Voice 🎤       │  (Next.js App Router)       │
                               └──────────────┬──────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │ Supabase (Auth + PG)│
                                   └─────────────────────┘
```

---

## ⚡ Method 1: Deploying via Vercel CLI (Recommended - 2 minutes)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from Project Root:**
   ```bash
   cd "d:\Agent Hive\agenthive"
   vercel
   ```
   Follow the CLI prompts (accept default settings for project root).

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```
   Vercel will output your live URL, for example: `https://agenthive.vercel.app`

---

## 🌐 Method 2: Deploying via GitHub & Vercel Dashboard

1. Push your code to GitHub repository (`git push origin main`).
2. Go to **[Vercel Dashboard](https://vercel.com/new)** → Import Project.
3. Select your `agenthive` repository.
4. Add your **Environment Variables** (see table below).
5. Click **Deploy**!

---

## 🔑 Environment Variables required on Vercel

In your Vercel Project Settings → **Environment Variables**, add the following:

| Key | Example / Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `sk-or-v1-...` or `AIzaSy...` | Required for Gemini 2.5 Flash LLM |
| `LLM_MODEL` | `google/gemini-2.5-flash` | LLM model identifier |
| `WHATSAPP_PROVIDER` | `twilio` | Set to `"twilio"` or `"meta"` |
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxxxxxx` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | `08d58a490ce52362b40db233...` | Your Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+17017911866` | Your Twilio Sandbox Number |
| `SUPABASE_URL` | `https://irleojqhmzaleongubcf.supabase.co` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | `sb_publishable_CYX0RJW...` | Supabase Anon / Publishable Key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role_key_here` | Backend administrative key |
| `SUPABASE_DB_URL` | `postgresql://postgres:password@...` | Database connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://irleojqhmzaleongubcf.supabase.co` | Frontend Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_CYX0RJW...` | Frontend Supabase Key |

---

## 📱 Configuring Twilio WhatsApp Webhook for Production (No ngrok!)

Once Vercel gives you your live URL (e.g., `https://agenthive.vercel.app`):

1. Go to **[Twilio Console](https://console.twilio.com)**.
2. Go to **Develop → Messaging → Settings → WhatsApp Sandbox Settings**.
3. Under **WHEN A MESSAGE COMES IN**, set:
   - **URL:** `https://your-vercel-domain.vercel.app/api/webhook/whatsapp/twilio`
   - **HTTP Method:** `POST`
4. Click **Save**.

Now, **anyone anywhere in the world** can send a WhatsApp message to your Twilio Sandbox number (`+1 701 791 1866`) or tap the **Chat on WhatsApp** button on your live website, and your Manager Agent workforce will reply automatically on WhatsApp! 🎉
