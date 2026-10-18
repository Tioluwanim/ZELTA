# Regulatory requirements matrix (starting point)

Source: a research summary supplied by the project owner (attachment dated 18 Oct 2026) that points to the CBN
Open Banking framework (2021) and operational guidelines (2023), and the Nigeria Data Protection Act 2023.
**I have not read the primary texts; this is a working map, not a legal determination.** Get Nigerian legal advice
before connecting real bank accounts or launching commercially. Statements below about what the rules *require* are the
summary's; check each against the text.

| Requirement (per the summary) | ZELTA component | Control today | Evidence in repo | Open question |
|---|---|---|---|---|
| Explicit user authorisation of data access | `openbanking/consent.py` | consent record, scopes, expiry, withdrawal | `tests/twin/test_providers_security.py` | consent text and UI not written; purpose and data categories not yet stored on the record |
| Only registered/authorised participants; an API integration does not make ZELTA authorised | provider layer (`providers/`) | Mono mapping not live; no claim of authorisation | `providers/mono.py` docstring | is ZELTA a third-party provider needing CBN registry listing, or does it go through a licensed aggregator? |
| Secure API access, access controls | `security.py`, `api/twin.py`, tool permissions | key check (constant-time, default closed), scopes, assurance step-up | `test_security_defaults.py`, `test_twin_endpoint.py`, `test_assurance.py` | service-to-service identity beyond a shared key; rate limiting |
| Data minimisation, defined purpose | `ledger/normalise.py`, tools return derived values | only derived outputs returned; raw payload hashed, not stored | `domain/events.py` provenance | no stored-field inventory; raw-payload retention decision |
| Lawfulness, transparency, purpose limitation | consent record, docs | none beyond consent | n/a | NDPA lawful basis per processing activity; privacy notice |
| Accuracy and user correction | `Event.category` + confidence | classification kept with confidence | n/a | no UI/API to correct a classification |
| Storage limitation, deletion | none | none | n/a | retention periods, deletion workflow on withdrawal |
| Security and confidentiality (encryption, secrets) | `openbanking/secrets.py`, `redact.py` | secrets wrapped; redaction | `test_providers_security.py` | encryption at rest, secret manager, key rotation |
| Accountability, documented processing | `openbanking/audit.py`, these docs | in-memory audit log | `tests/...` | persistent tamper-evident audit; records of processing |
| Data-subject rights | none | none | n/a | access/correction/erasure endpoints |
| Risk management: incidents, third parties | `docs/SECURITY.md`, `PENTEST.md`, root `SECURITY.md` | disclosure policy, pentest kit | those files | incident response plan; vendor register |
| Open Banking consent vs NDPA lawful basis are separate | design note | recognised | this table | legal analysis |
