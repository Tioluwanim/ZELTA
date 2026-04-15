# 🚀 ZELTA: Behavioral Quantitative Financial Intelligence

**Stop making financial decisions on emotion. Let the math decide. In plain English.**

ZELTA is a Behavioral Quantitative (BQ) engine built for the OAU student ecosystem. It bridges the gap between raw market data and human psychology by using **Bayse Markets** real-money crowd intelligence to detect market stress and **Gemini AI** to correct cognitive biases.

---

## 🧠 The BQ Framework

ZELTA operates on a four-layer intelligence stack as defined in our technical roadmap:

1.  **Bayse Intelligence Layer:** Pulls real-time order book data to measure "Crowd Fear."
2.  **Stress Detector:** A Bayesian engine that combines market liquidity with NLP sentiment from campus news.
3.  **Bayesian Engine:** Mathematically corrects for "Panic Selling" or "FOMO Buying" biases.
4.  **Quant Allocator:** Uses Kelly-style NGN decision sizing to suggest optimal risk.

---

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python 3.12)
- **Intelligence:** Bayse Markets API (REST + WebSockets)
- **AI/NLP:** Gemini 1.5 Pro (Vertex AI)
- **Deployment:** Google Cloud Run
- **Real-time:** WebSockets for live stress monitoring
- **Frontend:** React + TailwindCSS + Next.js

---

## 🚀 Getting Started

### 1. Environment Setup

Create a `.env` file in the root directory:

```env
BAYSE_PUBLIC_KEY=your_public_key
BAYSE_PRIVATE_KEY=your_private_key
GEMINI_API_KEY=your_google_api_key
```
