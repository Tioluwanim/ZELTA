from typing import Dict, Optional


class ZeltaBiasDetector:
    """
    Identifies the active cognitive bias from stress + wallet patterns.
    Five biases: loss aversion, present bias, overconfidence,
                 herd behavior, mental accounting.
    Output feeds directly into brain/pipeline.py and BQ Co-Pilot.
    """

    def detect(
        self,
        stress_data: Dict,
        sentiment_score: float,
        wallet_data: Optional[Dict] = None,
    ) -> Dict:

        # Use "score" — matches what stress/index.py will output
        stress_score = stress_data.get("score", 50)

        # Safe access — won't crash if components missing
        market_prob = stress_data.get("components", {}).get(
            "market_probability", 0.5
        )

        # Default wallet flags
        wallet_data = wallet_data or {
            "spending_spike": False,
            "cash_withdrawal": False,
            "impulse_buy": False,
            "side_hustle_income_recent": False,
        }

        bias = "Rational"
        confidence = "Low"
        explanation = "Market appears stable. Your decisions are likely logical."

        # ── Detection Rules (priority order) ─────────────────────────────────

        # 1. Loss Aversion — high stress + panic cash withdrawal
        if stress_score >= 60 and wallet_data.get("cash_withdrawal"):
            bias = "Loss Aversion"
            confidence = "High"
            explanation = (
                "Market fear is high and you withdrew cash. "
                "You are hoarding out of panic, not logic. "
                "QUELO corrected this — the rational action is different."
            )

        # 2. Present Bias — impulse buying despite upcoming obligations
        elif wallet_data.get("impulse_buy"):
            bias = "Present Bias"
            confidence = "High"
            explanation = (
                "You made an impulse purchase. "
                "Your upcoming obligations are at risk. "
                "QUELO recommends reviewing your obligation map."
            )

        # 3. Overconfidence — calm market, overly positive sentiment
        elif stress_score < 30 and sentiment_score > 0.3:
            bias = "Overconfidence"
            confidence = "Medium"
            explanation = (
                "Market is calm and sentiment is very positive. "
                "Overconfidence risk is active — "
                "you may be over-allocating to risky decisions."
            )

        # 4. Herd Behavior — following extreme crowd positioning on Bayse
        elif 40 <= stress_score < 70 and abs(market_prob - 0.5) > 0.35:
            bias = "Herd Behavior"
            confidence = "Medium"
            explanation = (
                "Bayse crowd is positioned heavily to one side. "
                "You may be following the crowd without your own analysis. "
                "QUELO separates your data from crowd noise."
            )

        # 5. Mental Accounting — treating side hustle income as free money
        elif (
            wallet_data.get("spending_spike")
            and wallet_data.get("side_hustle_income_recent")
        ):
            bias = "Mental Accounting"
            confidence = "Medium"
            explanation = (
                "You received side hustle income and spending spiked. "
                "You may be treating this as free money. "
                "QUELO sees all naira equally — every naira has the same value."
            )

        # 6. General spending spike fallback
        elif wallet_data.get("spending_spike") and stress_score < 60:
            bias = "Mental Accounting"
            confidence = "Low"
            explanation = (
                "Spending is elevated without clear stress trigger. "
                "Review your unified wallet view."
            )

        return {
            "bias": bias,
            "confidence": confidence,
            "explanation": explanation,
            "inputs": {
                "stress_score": stress_score,
                "sentiment": sentiment_score,
                "market_probability": market_prob,
            },
        }


def run_bias_detection(
    stress_data: Dict,
    sentiment_score: float,
    wallet_data: Dict = None,
) -> Dict:
    """Entry point called by brain/pipeline.py"""
    detector = ZeltaBiasDetector()
    return detector.detect(stress_data, sentiment_score, wallet_data)
