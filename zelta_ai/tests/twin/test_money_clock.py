import random
from datetime import datetime, timezone
from fractions import Fraction

import pytest

from domain.clock import LAGOS, NaiveDatetimeError, lagos_date, require_aware
from domain.money import CurrencyMismatch, Money, round_fraction, sum_money


def test_float_drift_does_not_exist_in_money():
    assert 0.1 + 0.2 != 0.3                                   # the trap
    assert Money.from_major("0.10") + Money.from_major("0.20") == Money.from_major("0.30")


@pytest.mark.parametrize("bad", [1.5, True, "1.005", "abc", "NaN"])
def test_invalid_amounts_rejected(bad):
    with pytest.raises((TypeError, ValueError)):
        if isinstance(bad, str):
            Money.from_major(bad)
        else:
            Money(bad)


def test_float_input_to_from_major_rejected():
    with pytest.raises(TypeError):
        Money.from_major(1.5)


def test_currencies_never_mix():
    with pytest.raises(CurrencyMismatch):
        Money(100, "NGN") + Money(100, "USD")
    with pytest.raises(CurrencyMismatch):
        Money(100, "NGN") < Money(100, "USD")


def test_formatting_and_rounding():
    assert str(Money(123450)) == "1,234.50 NGN"
    assert str(Money(-5)) == "-0.05 NGN"
    assert Money(763000).ceil_to(Money(50000)) == Money(800000)
    assert Money(12345).floor_to(Money(10000)) == Money(10000)
    assert round_fraction(Fraction(5, 2)) == Money(3) and round_fraction(Fraction(-5, 2)) == Money(-3)


def test_add_sub_roundtrip_property():
    rng = random.Random(1)
    for _ in range(500):
        a, b = Money(rng.randint(-10**9, 10**9)), Money(rng.randint(-10**9, 10**9))
        assert a + b - b == a
    assert sum_money([Money(1), Money(2)]) == Money(3)


def test_lagos_date_crosses_midnight_before_utc():
    assert lagos_date(datetime(2026, 10, 8, 23, 30, tzinfo=timezone.utc)).isoformat() == "2026-10-09"


def test_naive_datetime_rejected():
    with pytest.raises(NaiveDatetimeError):
        lagos_date(datetime(2026, 10, 8, 12, 0))
    assert require_aware(datetime(2026, 1, 1, tzinfo=LAGOS))
