"""Deterministic 'Tola' fixture (synthetic persona from the ZELTA Engineering Lab). Not real user data."""
from datetime import date, datetime, timedelta

from domain.clock import LAGOS
from domain.events import Account, RawTransaction
from domain.money import Money
from engines.runway import IncomeStream, Obligation

AS_OF = datetime(2026, 10, 8, 20, 0, tzinfo=LAGOS)


def N(naira) -> Money:
    return Money.from_major(str(naira))


def accounts():
    return [
        Account("acc_opay", "mock", "OPay", "h-opay-0941", N(18500), AS_OF - timedelta(hours=2)),
        Account("acc_gtb", "mock", "GTBank", "h-gtb-3377", N(24000), AS_OF - timedelta(hours=2)),
        Account("acc_mnp", "mock", "Moniepoint", "h-mnp-5521", N(11000), AS_OF - timedelta(hours=5)),
    ]


def obligations():
    return [Obligation("MTN data plan", N(2000), date(2026, 10, 14)),
            Obligation("Department project levy", N(15000), date(2026, 10, 17)),
            Obligation("Netflix split", N(1200), date(2026, 11, 5)),
            Obligation("MTN data plan", N(2000), date(2026, 11, 14))]


def allowance():
    return IncomeStream("Allowance", N(45000), N(40000), N(45000), date(2026, 11, 1), 0.92)


BURN_PER_DAY_KOBO = 214800     # blended burn that the guide's worked example uses (2,148 naira/day)
ESSENTIAL_PER_DAY_KOBO = 93571


def history_txns(days=28, kobo=214800, account="acc_opay"):
    """Each day: essential spend (food) of 93,571 kobo plus discretionary ('social') making the day total `kobo`."""
    rows = []
    for i in range(1, days + 1):
        at = AS_OF - timedelta(days=i)
        rows.append(RawTransaction("mock", account, Money(-ESSENTIAL_PER_DAY_KOBO), at, provider_ref=f"e{i}",
                                   description="essentials", category="food"))
        rows.append(RawTransaction("mock", account, Money(-(kobo - ESSENTIAL_PER_DAY_KOBO)), at, provider_ref=f"d{i}",
                                   description="other", category="social"))
    return rows
