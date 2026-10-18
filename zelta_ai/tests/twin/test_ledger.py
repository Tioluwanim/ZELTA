from datetime import datetime, timedelta, timezone

from domain.clock import LAGOS
from domain.events import EventKind, EventStatus, RawTransaction
from domain.money import Money
from ledger import normalise, total_connected_money
from tests.twin.fixtures import AS_OF, N, accounts

T = AS_OF - timedelta(days=2)


def raw(amount, ref="r1", acct="a1", status="posted", at=T, **kw):
    return RawTransaction("mock", acct, Money(amount) if amount is not None else None, at,
                          status=status, provider_ref=ref, description=kw.pop("description", "x"), **kw)


def test_duplicate_row_gives_one_event():
    r = normalise([raw(-5000), raw(-5000)], AS_OF)
    assert len(r.events) == 1 and r.duplicates_dropped == 1


def test_pending_then_posted_gives_one_posted_event():
    r = normalise([raw(-5000, status="pending"), raw(-5000, status="posted")], AS_OF)
    assert [e.status for e in r.events] == [EventStatus.POSTED]
    r2 = normalise([raw(-5000, status="posted"), raw(-5000, status="pending")], AS_OF)
    assert [e.status for e in r2.events] == [EventStatus.POSTED]


def test_reversal_marks_original_and_is_excluded_from_flows():
    r = normalise([raw(-5000, ref="o1"), raw(5000, ref="rv1", reverses_ref="o1")], AS_OF)
    kinds = {e.provenance.provider_ref: (e.kind, e.status) for e in r.events}
    assert kinds["o1"][1] is EventStatus.REVERSED
    assert kinds["rv1"][0] is EventKind.REVERSAL
    assert not any(e.counts_in_flows() for e in r.events)


def test_reversal_without_original_is_flagged_not_dropped():
    r = normalise([raw(5000, ref="rv9", reverses_ref="missing")], AS_OF)
    assert len(r.events) == 1 and r.unmatched_reversals and "reverses_id" in r.events[0].missing_fields


def test_own_account_transfer_excluded_from_income_and_expense():
    rows = [raw(-1_000_000, ref="x1", acct="a1"), raw(1_000_000, ref="x2", acct="a2", at=T + timedelta(minutes=3))]
    r = normalise(rows, AS_OF, own_account_ids=["a1", "a2"])
    assert {e.kind for e in r.events} == {EventKind.TRANSFER_OWN}
    assert not any(e.counts_in_flows() for e in r.events)
    # without knowing the accounts are the user's own, they look like income and expense
    assert {e.kind for e in normalise(rows, AS_OF).events} == {EventKind.INCOME, EventKind.EXPENSE}


def test_transfer_outside_window_not_paired():
    rows = [raw(-1000, ref="x1", acct="a1"), raw(1000, ref="x2", acct="a2", at=T - timedelta(days=5))]
    assert {e.kind for e in normalise(rows, AS_OF, ["a1", "a2"]).events} == {EventKind.INCOME, EventKind.EXPENSE}


def test_bad_rows_are_rejected_with_reasons_not_dropped_silently():
    rows = [raw(None), raw(0, ref="z"), raw(-1, ref="n", at=None),
            raw(-1, ref="nv", at=datetime(2026, 10, 1, 12, 0)),
            raw(-1, ref="f", at=AS_OF + timedelta(days=3)), raw(-1, ref="s", status="weird"), raw(-100, ref="ok")]
    r = normalise(rows, AS_OF)
    assert [reason for _, reason in r.rejected] == ["missing_amount", "zero_amount", "missing_timestamp",
                                                    "naive_timestamp", "future_timestamp", "unknown_status"]
    assert len(r.events) == 1


def test_missing_optional_fields_are_recorded():
    e = normalise([RawTransaction("mock", "a1", Money(-100), T, provider_ref="m")], AS_OF).events[0]
    assert set(e.missing_fields) == {"description", "merchant", "category"}


def test_original_payload_hash_is_kept_for_audit():
    a = normalise([raw(-100, payload={"k": 1})], AS_OF).events[0]
    b = normalise([raw(-100, payload={"k": 2})], AS_OF).events[0]
    assert a.provenance.payload_hash != b.provenance.payload_hash


def test_empty_history():
    r = normalise([], AS_OF)
    assert r.events == () and r.rejected == ()


def test_other_currency_kept_but_tagged():
    r = normalise([RawTransaction("mock", "a1", Money(-100, "USD"), T, provider_ref="u", description="d")], AS_OF)
    assert r.events[0].amount.currency == "USD"


# ---- total connected money
def test_tola_total_is_53500():
    cm = total_connected_money(accounts(), AS_OF)
    assert cm.total == N(53500) and cm.complete and not cm.excluded


def test_stale_policy_flags_30h_and_excludes_80h():
    from dataclasses import replace
    a = accounts()
    a[0] = replace(a[0], balance_as_of=AS_OF - timedelta(hours=30))
    a[1] = replace(a[1], balance_as_of=AS_OF - timedelta(hours=80))
    cm = total_connected_money(a, AS_OF)
    assert cm.stale == ("acc_opay",) and cm.excluded == (("acc_gtb", "stale_excluded"),)
    assert cm.total == N(18500 + 11000) and not cm.complete


def test_unknown_balance_is_never_zero_and_duplicates_and_currency_are_excluded():
    from dataclasses import replace
    a = accounts()
    a[0] = replace(a[0], balance=None)
    a.append(replace(accounts()[1], id="dup"))
    a.append(replace(accounts()[2], id="usd", account_ref="z", balance=Money(100, "USD")))
    cm = total_connected_money(a, AS_OF)
    assert dict(cm.excluded) == {"acc_opay": "balance_unknown", "dup": "duplicate", "usd": "unsupported_currency"}
    assert cm.total == N(24000 + 11000)


def test_pending_debits_reduce_balance():
    from dataclasses import replace
    a = [replace(accounts()[0], pending_debits=N(500))]
    assert total_connected_money(a, AS_OF).total == N(18000)
