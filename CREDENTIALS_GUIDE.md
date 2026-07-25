# 🔐 AgentHive Credentials Guide

Step-by-step instructions for obtaining every API key and credential needed to run AgentHive.

**Minimum to get running:** Only the Gemini API key is strictly required. Everything else can be added incrementally.

---

## 1. Gemini API Key (Required)

**What for:** All 5 agents use Gemini 2.5 Flash for LLM inference.

### Option A: Via OpenRouter (recommended for development)
1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up → Dashboard → API Keys → Create
3. Copy the key starting with `sk-or-...`
4. Set in `.env`:
   ```
   GEMINI_API_KEY=sk-or-v1-...
   GEMINI_BASE_URL=https://openrouter.ai/api/v1
   LLM_MODEL=google/gemini-2.5-flash
   ```

### Option B: Direct Google AI Studio Key
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click "Create API key"
3. Set in `.env`:
   ```
   GEMINI_API_KEY=AIza...
   GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
   LLM_MODEL=gemini-2.5-flash
   ```
4. **Bonus:** A direct Gemini key also enables voice note transcription (WhatsApp).

---

## 2. Supabase (Auth + Database)

**What for:** User authentication and PostgreSQL database.

> **Skip this for quick local testing** — AgentHive falls back to SQLite + custom JWT when Supabase isn't configured.

1. Go to [supabase.com](https://supabase.com) → New Project
2. Wait for provisioning → Dashboard → Settings → API
3. Copy these values:
   - **Project URL** → `SUPABASE_URL`
   - **`anon` `public` key** → `SUPABASE_ANON_KEY`
   - **`service_role` key** → `SUPABASE_SERVICE_ROLE_KEY`
4. Go to Settings → Database → Connection string (URI)
   - Copy → `SUPABASE_DB_URL`
5. Set in `.env`:
   ```
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   SUPABASE_DB_URL=postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
   ```
6. **Frontend `.env.local`:** Also set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

---

## 3. WhatsApp Gateway

**What for:** Send/receive WhatsApp messages through AgentHive.

Choose **one** provider. Twilio is faster for demos.

### Option A: Twilio WhatsApp Sandbox (5 minutes)

1. Go to [twilio.com](https://www.twilio.com/) → sign up (free trial)
2. Dashboard → Account SID and Auth Token → copy both
3. Console → Messaging → Try it out → Send a WhatsApp message
4. Twilio shows you a sandbox number (usually `+1 415 523 8886`) and a join code
5. On your phone: send the join code to that number on WhatsApp
6. Set in `.env`:
   ```
   WHATSAPP_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```
7. **Webhook:** In Twilio Console → Messaging → Settings → WhatsApp Sandbox Settings:
   - "When a message comes in" → `https://your-ngrok-url/api/webhook/whatsapp/twilio`
   - Method: POST

### Option B: Meta WhatsApp Cloud API (Production)

1. Go to [developers.facebook.com](https://developers.facebook.com/) → My Apps → Create App
2. Add "WhatsApp" product
3. Go to WhatsApp → Getting Started:
   - Copy **Temporary access token** → `WHATSAPP_API_TOKEN`
   - Copy **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`
4. Configure webhook:
   - Callback URL: `https://your-domain/api/webhook/whatsapp`
   - Verify token: `agenthive-verify` (or whatever you set as `WHATSAPP_VERIFY_TOKEN`)
   - Subscribe to: `messages`
5. Set in `.env`:
   ```
   WHATSAPP_PROVIDER=meta
   WHATSAPP_VERIFY_TOKEN=agenthive-verify
   WHATSAPP_API_TOKEN=EAAx...
   WHATSAPP_PHONE_NUMBER_ID=123456789
   ```

> **Note:** For local development, use [ngrok](https://ngrok.com/) to expose your localhost: `ngrok http 8000`

---

## 4. Google Calendar (OAuth 2.0)

**What for:** Each business owner connects their own Google Calendar. The Scheduler Agent can then create and read events.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Select/create a project
3. **Enable API:** APIs & Services → Library → search "Google Calendar API" → Enable
4. **OAuth consent screen:** APIs & Services → OAuth consent screen
   - App type: External
   - App name: "AgentHive"
   - User support email: yours
   - Scopes: `https://www.googleapis.com/auth/calendar`
   - Test users: add your Google account email
   - Save
5. **Create credentials:** APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8000/api/calendar/callback`
   - Create → copy Client ID and Client Secret
6. Set in `.env`:
   ```
   GOOGLE_CLIENT_ID=123456-xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/calendar/callback
   ```

**Usage:** Open `http://localhost:8000/api/calendar/auth?user_id=1` in your browser to start the OAuth flow.

---

## 5. Razorpay (Optional — Payments)

**What for:** Finance Agent creates real payment links for invoices.

1. Go to [razorpay.com](https://razorpay.com/) → Sign up
2. Dashboard → Settings → API Keys → Generate Test Key
3. Set in `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```

---

## Quick Start Order

1. **Gemini key** → enables all 5 agents
2. **Run the app** → `uvicorn backend.core.app:app --reload` + `npm run dev`
3. **Add Twilio** → WhatsApp in 5 minutes
4. **Add Google Calendar** → OAuth per-user calendar
5. **Add Supabase** → production-grade auth + Postgres
6. **Add Razorpay** → real payment links (optional)
