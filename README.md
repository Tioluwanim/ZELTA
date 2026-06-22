<div align="center">

# ZELTA
### The Anti-Sapa App for Nigerian University Students

**Stop going broke mid-semester. Let the math protect your money before it leaves.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-zelta.app-10b981?style=for-the-badge)](https://zelta-878473667930.europe-west1.run.app)
[![Backend API](https://img.shields.io/badge/API%20Docs-Swagger-orange?style=for-the-badge)](https://zelta-878473667930.us-central1.run.app/docs)
[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini%201.5%20Pro-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![Powered by Bayse](https://img.shields.io/badge/Powered%20by-Bayse%20Markets-f97316?style=for-the-badge)](https://bayse.io)

</div>

---

## What is ZELTA?

ZELTA is an AI financial guardian built for Nigerian university students.

Most students receive money in lumps — allowance, bursary, transfers from home — and by mid-month, it is already disappearing. Not because students are careless, but because there is usually no tool watching their spending closely enough to step in before they make a bad decision.

ZELTA helps solve that.

It shows how long your money can last, detects risky spending patterns, reads live market sentiment, and gives you a safer path forward before money leaves your account.

It is not just a budgeting app. It is a financial decision companion built for student life.

---

## The Problem We Solve

| The Problem | What Causes It | What ZELTA Does |
|---|---|---|
| Students run out of money too early | Lump-sum income and no runway tracking | Shows exactly how long your money will last |
| Impulse spending under stress | Exam pressure, emotions, and peer influence | Flags risky spending before it happens |
| No recovery plan after spending | Most tools only show balance, not next steps | Suggests safer actions and earning paths |
| No visibility into spending habits | Students do not see patterns early enough | Learns spending behavior over time |
| Financial anxiety | Constant uncertainty about money | Turns confusion into clarity |

---

## What ZELTA Does Today

- Tracks student finances in a simple, readable way
- Estimates spending runway
- Flags dangerous spending moments
- Uses AI to explain financial decisions clearly
- Shows whether a student should spend, save, or pause
- Helps students understand their money with context, not just numbers

---

## Core System

ZELTA is built as a monorepo with three main services:

| Service | Path | Stack | Role |
|---|---|---|---|
| **Frontend** | `/` | Next.js · React · Tailwind CSS · TypeScript | Student dashboard |
| **Backend** | `zelta_backend/` | FastAPI · Firebase · Python | Auth, wallet, intelligence, simulations |
| **AI Brain** | `zelta_ai/` | FastAPI · LangGraph · Gemini 1.5 Pro | Decision intelligence and reasoning |

---

## How It Works

1. A student opens the app.
2. ZELTA reads wallet data and spending behavior.
3. It checks stress signals, market context, and academic timing.
4. It calculates how safe the next decision is.
5. It gives a clear recommendation before the money moves.

---

## Key Features

### Runway Tracker
Shows how many days the student’s money can last based on current spending habits.

### Spending Guard
Warns the student when a purchase may push them into financial stress.

### AI Copilot
Lets students ask simple questions like:
- Can I afford this?
- How long will my money last?
- What should I do with this incoming transfer?

### Behavioral Intelligence
Learns spending patterns and identifies risky habits over time.

### Smart Context
Uses factors like market pressure and exam timing to make decisions more realistic.

---

## Coming Soon

These features are planned for the next version of ZELTA:

- **Mono Connect** — automatic bank transaction import
- **Squad Wallet** — virtual account and transfer handling
- **Intercept Screen** — stronger spending protection before checkout
- **Sapa Health Bar** — visual survival score on the dashboard
- **Gig Marketplace** — student earning opportunities inside the app
- **Zé Agent Cards** — proactive AI alerts and recommendations
- **Push Notifications** — instant alerts when money risk increases
- **Academic Calendar Sync** — smarter exam-aware decision timing
- **Peer Spending Insights** — anonymous campus spending trends

---

## Project Structure

```bash
ZELTA/
├── app/                # Frontend pages and dashboard
├── components/         # Shared UI components
├── context/             # Global state providers
├── hooks/               # Reusable data hooks
├── types/               # TypeScript types
├── firebase/            # Firebase client setup
├── zelta_ai/            # AI Brain service
├── zelta_backend/      # FastAPI backend service
├── package.json
├── middleware.ts
└── .env.example
