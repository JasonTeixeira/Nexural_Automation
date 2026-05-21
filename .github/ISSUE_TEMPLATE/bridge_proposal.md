---
name: Bridge proposal
about: Propose a new automation bridge or connector
labels: [bridge, proposal]
---

## Bridge name

## Target platform
- [ ] NinjaTrader
- [ ] CSV / file drop
- [ ] Webhook
- [ ] Broker demo connector
- [ ] Other

## Contract
- [ ] `health()`
- [ ] `send_signal(signal)`
- [ ] `flatten(symbol, reason)`

## Required proofs
- [ ] Health check
- [ ] Paper signal roundtrip
- [ ] Flatten acknowledgement
- [ ] Kill-switch acknowledgement
- [ ] Fill reconciliation

## Risk controls
Describe how this bridge prevents accidental live routing.

## Notes
No secrets, API keys, account IDs, or live credentials.
