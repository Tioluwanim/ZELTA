"""Money in integer minor units (kobo for NGN). Floats are rejected, currencies never mix."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from fractions import Fraction

MINOR_PER_MAJOR = 100  # all currencies ZELTA currently handles have 2 decimal places


class CurrencyMismatch(ValueError):
    """Raised when arithmetic or comparison mixes two currencies."""


@dataclass(frozen=True)
class Money:
    minor: int
    currency: str = "NGN"

    def __post_init__(self):
        if isinstance(self.minor, bool) or not isinstance(self.minor, int):
            raise TypeError("Money.minor must be an int (kobo); floats and bools are rejected")
        if not (isinstance(self.currency, str) and len(self.currency) == 3 and self.currency.isupper()):
            raise ValueError("currency must be a 3-letter upper-case ISO code")

    # -- construction ------------------------------------------------------
    @classmethod
    def from_major(cls, value, currency: str = "NGN") -> "Money":
        """Build from a naira amount given as str, int or Decimal. Floats are rejected."""
        if isinstance(value, (float, bool)):
            raise TypeError("pass naira as str, int or Decimal, never float")
        try:
            d = Decimal(value) * MINOR_PER_MAJOR
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError(f"not a valid amount: {value!r}") from exc
        if not d.is_finite() or d != d.to_integral_value():
            raise ValueError("more than 2 decimal places")
        return cls(int(d), currency)

    @classmethod
    def zero(cls, currency: str = "NGN") -> "Money":
        return cls(0, currency)

    # -- arithmetic --------------------------------------------------------
    def _same(self, other: "Money") -> None:
        if not isinstance(other, Money):
            raise TypeError("operand must be Money")
        if other.currency != self.currency:
            raise CurrencyMismatch(f"{self.currency} vs {other.currency}")

    def __add__(self, o: "Money") -> "Money":
        self._same(o)
        return Money(self.minor + o.minor, self.currency)

    def __sub__(self, o: "Money") -> "Money":
        self._same(o)
        return Money(self.minor - o.minor, self.currency)

    def __neg__(self) -> "Money":
        return Money(-self.minor, self.currency)

    def __abs__(self) -> "Money":
        return Money(abs(self.minor), self.currency)

    def __lt__(self, o): self._same(o); return self.minor < o.minor
    def __le__(self, o): self._same(o); return self.minor <= o.minor
    def __gt__(self, o): self._same(o); return self.minor > o.minor
    def __ge__(self, o): self._same(o); return self.minor >= o.minor

    def scaled(self, ratio: Fraction) -> Fraction:
        """Exact (unrounded) product with a ratio, in minor units."""
        return Fraction(self.minor) * Fraction(ratio)

    # -- rounding helpers --------------------------------------------------
    def ceil_to(self, step: "Money") -> "Money":
        self._same(step)
        if step.minor <= 0:
            raise ValueError("step must be positive")
        return Money(-(-self.minor // step.minor) * step.minor, self.currency)

    def floor_to(self, step: "Money") -> "Money":
        self._same(step)
        if step.minor <= 0:
            raise ValueError("step must be positive")
        return Money((self.minor // step.minor) * step.minor, self.currency)

    def is_negative(self) -> bool:
        return self.minor < 0

    def __str__(self) -> str:
        n, k = divmod(abs(self.minor), MINOR_PER_MAJOR)
        return f"{'-' if self.minor < 0 else ''}{n:,}.{k:02d} {self.currency}"


def sum_money(items, currency: str = "NGN") -> Money:
    total = Money.zero(currency)
    for m in items:
        total = total + m
    return total


def round_fraction(value: Fraction, currency: str = "NGN") -> Money:
    """Round an exact minor-unit Fraction half-up (away from zero for ties) to Money."""
    f = Fraction(value)
    n, d = f.numerator, f.denominator
    q = (2 * abs(n) + d) // (2 * d)
    return Money(q if n >= 0 else -q, currency)
