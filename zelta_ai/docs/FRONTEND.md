# Frontend rebuild

Next.js 16, React 19, Tailwind 4. One design system, five tabs: **Path** (Duolingo-style money steps), **Twin** (dashboard), **Coach** (chat), **Earn** (gigs and savings projection), **Me** (profile, bills, notifications). Zel is an original mascot (`components/Zel.tsx`).

## Design
Chalk background, Ankara indigo for actions, danfo yellow for the mascot and rewards, mint for success, coral for risk. Fredoka for headlines and numbers, Figtree for text. Tactile buttons, 44px+ targets, visible focus, reduced motion respected, status never shown by colour alone. The streak counts check-in days on this device only and never asks the user to move money (risk noted by 11:FS research on gamified finance).

## Backend wiring (`lib/api.ts`)
| Screen | Endpoint |
|---|---|
| Sign in | Firebase Auth; ID token sent as `Authorization: Bearer` |
| Shell, Onboarding, Me | `GET/PATCH /api/profile` |
| Path, Twin | `GET /api/wallet`, `POST /api/wallet/income`, `/expense`, `/lock` |
| Twin | `GET /api/stress` |
| Coach | `POST /api/copilot` |
| Earn | `GET /api/gig/list`, `POST /api/simulation/savings` |

Errors from the backend surface as plain messages with a retry. Nothing is faked when the backend fails.

## Run
`cp .env.example .env.local`, fill the Firebase values, set `NEXT_PUBLIC_API_URL`, and set the backend `ALLOWED_ORIGINS` to this site's origin. `NEXT_PUBLIC_DEMO=1` runs on labelled sample data with no backend or login (for design review only).

## Not done / limits
- The new Financial Twin engines and the agent have no HTTP route reachable from the frontend yet. The Twin tab shows wallet data from the existing backend and a locked "Runway and forecast" card. Next step: a backend route that calls `/brain/v1/twin` and one that exposes the orchestrator.
- Firebase sign-in, the live backend calls and Google sign-in were not tested here (no credentials). Layouts were checked in a browser with sample data at phone and desktop widths.
- Path step logic compares backend values only (for example free cash against weekly spending); it does no financial maths.
- Several backend schemas are still student-specific (university, bursary); the UI avoids student-only wording but the data model has not been changed.

## Visual language: "Adire" (Day 12 UI pass)

ZELTA's look comes from Yoruba adire (resist-dyed indigo cloth), not from another app.
- Palette: warm undyed cotton (`--chalk`), a four-step indigo dye ramp (`--dye-1..4`), danfo yellow for reward, mint/coral for status.
- Patterns (CSS masks, `.cloth` + `.oniko`/`.alabere`/`.batani`): rings = free money, stitched lines = bills, diamonds = cushion. Meaning never relies on colour alone.
- Components: `ClothStrip` (balance as bands), `SpendingCloth` (28 days, deeper dye = more spent), `GuardianCard` ("Before you spend"), stitched buttons, hemmed cards, a thread connecting Path steps, Zel in an adire head wrap.
- Display font Bricolage Grotesque, body Figtree.
- Data: the Twin tab calls `/api/twin`, `/api/twin/guardian`; the Coach calls `/api/twin/agent` and falls back to `/api/copilot`. Demo mode (`NEXT_DEMO=1`, not `NEXT_PUBLIC_DEMO`) serves labelled sample data.
- Landing page (`app/page.tsx`): hero, three steps, feature bento, principles, FAQ. It contains no invented statistics or testimonials; sample numbers are labelled.

## Local end-to-end check

`scripts/local_e2e/` starts the real backend routes and AI service with fake sign-in and fake stored data. Building the frontend with `NEXT_API_URL=http://localhost:8100 NEXT_DEV_BEARER=x` then exercises every call over real HTTP (the dev bearer is ignored unless the API is on localhost). Twin, Guardian, What-if, Coach and Earn were checked this way with no failed requests or console errors. Real Firebase sign-in, Firestore and Mono remain unverified.
