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
