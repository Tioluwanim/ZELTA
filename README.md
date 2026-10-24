# ZELTA frontend

The web app for **ZELTA**, a financial twin that tells you, in days, how long your money lasts and checks a spend before you make it. This branch (`frontend`) holds the app and is what gets deployed. The backend and compute service live on [`main`](https://github.com/Tioluwanim/ZELTA/tree/main).

> Prototype. Numbers come from what the user enters (self-reported) and are labelled that way. No live bank connection.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript · Firebase Auth · lucide-react. Fonts: Bricolage Grotesque (display) and Figtree (body).

## Screens

| Route | Screen |
|---|---|
| `/` | Landing page |
| `/auth`, `/onboarding` | Sign in or up, first-run setup |
| `/path` | Money path with a daily check-in streak |
| `/twin` | Runway in days, balance as cloth, 28-day spending, Before you spend, What if, suggestions |
| `/coach` | Chat answered by the engines, with follow-up chips |
| `/earn` | Opportunities ranked for you (source and risk shown) plus a savings projection |
| `/me` | Profile, bills, notifications |

## Design: "Adire"

The look comes from Yoruba adire (resist-dyed indigo cloth): warm cotton paper, a four-step indigo dye ramp, danfo yellow for reward, mint and coral for status. Patterns carry meaning and never rely on colour alone: tied rings = free money, stitched lines = bills, diamonds = cushion. Zel, the coin mascot, wears an adire head wrap. Reduced-motion is respected.

## Run it

```bash
pnpm install
cp .env.example .env.local     # fill the values below
pnpm dev                       # http://localhost:3000
pnpm build && pnpm start
```

| Variable | Purpose |
|---|---|
| `NEXT_API_URL` | ZELTA backend base URL |
| `NEXT_FIREBASE_API_KEY`, `NEXT_FIREBASE_AUTH_DOMAIN`, `NEXT_FIREBASE_PROJECT_ID`, `NEXT_FIREBASE_APP_ID` | Firebase web config (public values) |
| `NEXT_DEMO=1` | Sample-data mode, no backend or login. Labelled in the UI. Never set in production |
| `NEXT_DEV_BEARER` | Local integration only; ignored unless `NEXT_API_URL` is on localhost |

`next.config.ts` maps these to `NEXT_PUBLIC_*` at build time. They must be present when the app is built, not only when it runs. The backend must list this site's origin in `ALLOWED_ORIGINS`.

## How it talks to the backend

`lib/api.ts` is a typed client that sends the Firebase ID token as a Bearer token.

| Call | Backend route |
|---|---|
| `twin()` | `GET /api/twin` |
| `guardian(amount)` | `POST /api/twin/guardian` |
| `whatif(kind, amount)` | `POST /api/twin/whatif` |
| `agent(message)` | `POST /api/twin/agent` (Coach falls back to `/api/copilot`) |
| `opportunities()` | `GET /api/twin/opportunities` |
| `wallet()`, `profile()`, `addIncome()`, `addExpense()`, `lockSavings()`, `stress()`, `gigs()`, `simulateSavings()` | `/api/wallet`, `/api/profile`, `/api/stress`, `/api/gig`, `/api/simulation` |

Response types are in `lib/types.ts` and mirror the real engine output. Unknown values are `null`, never `0`, and the UI shows "Unknown". Screens degrade gracefully when the Twin is unavailable.

## Layout

```
app/              routes (landing, auth, onboarding, and the (app) shell: path, twin, coach, earn, me)
components/       ui primitives, Zel mascot, Cloth (balance strip, spending cloth), GuardianCard, WhatIfCard, QuickAdd
lib/              api client, types, demo data, auth, streak, formatting
scripts/local_e2e/  real backend + compute service on localhost for end-to-end checks
```

## Checks

```bash
pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm build
```

The app was also exercised over real HTTP against the backend and compute service (Twin, Guardian, What if, Coach, Earn: no failed requests or console errors) using `scripts/local_e2e/`. Real Firebase sign-in has not been exercised end to end.

## Deploy notes

* The host builds with pnpm 9: `pnpm install --frozen-lockfile`. There is intentionally no `pnpm-workspace.yaml` (pnpm 9 rejects one without `packages`); build-script settings live in `package.json`.
* Set the four `NEXT_FIREBASE_*` values and `NEXT_API_URL` as build variables.

## Known limits

Sign-in and stored data are untested against real Firebase and Firestore; the Twin depends on the backend and compute service being reachable; this branch still carries an older copy of `zelta_ai/` that is out of date (use `main`).
