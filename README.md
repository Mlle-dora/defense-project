# eBirth Cameroon

Digital Birth Declaration and Registration Management Platform for Cameroon.

## Overview

eBirth Cameroon digitizes the communication between Hospitals and Civil Status Centers while respecting Cameroonian laws. The platform manages the complete workflow before the official birth certificate is issued.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, TailwindCSS, shadcn/ui, TanStack Query, React Hook Form, Zod, i18next (FR/EN)
- **Backend:** Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions)
- **Deployment:** Vercel (frontend), Supabase Cloud (backend)

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (for local development)

### Installation

```bash
npm install
cp .env.example .env
# Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

### Database Setup

```bash
supabase init
supabase db push
psql -f supabase/seed/seed.sql  # or via Supabase SQL editor
```

### Edge Functions

```bash
supabase functions deploy send-sms
supabase functions deploy send-email
supabase functions deploy process-notification-queue
supabase functions deploy notification-retry
supabase functions deploy reminder-scheduler
supabase functions deploy daily-reports
supabase functions deploy audit-log
```

## User Roles

| Role | Access |
|------|--------|
| Super Admin | Hospitals, civil centers, users, settings, audit, reports |
| Hospital | Create/submit declarations, dashboard, history |
| Civil Officer | Review, register, reject, certificate ready |
| Parent | SMS/email notifications only (no login) |

## Project Structure

```
src/
  app/          # Router, guards
  components/   # Shared UI
  features/     # Feature modules
  layouts/      # App shell
  pages/        # Route pages
  services/     # Supabase API layer
  types/        # TypeScript types
  utils/        # Utilities
  validators/   # Zod schemas
  contexts/     # React contexts
  locales/      # i18n (en/fr)
supabase/
  migrations/   # SQL migrations
  functions/    # Edge functions
  seed/         # Seed data
docs/           # Documentation
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint |

## Environment Variables

See `.env.example` for required variables.

## License

Proprietary — eBirth Cameroon
