# NinjaTrader CSV Bridge

This bridge example writes validated signal records to a local JSONL file for a
separate NinjaTrader-side process to consume. It is a bridge contract example,
not a live-order router.

The lifecycle contract is deliberately paper-first:

- `health()` confirms the local handoff path is available.
- `send_signal(signal)` writes a paper signal record.
- `flatten(symbol, reason)` writes a flat control signal.
- `kill_switch(reason)` writes a paper-only kill-switch control record.
- `reconcile_fills(fills)` writes fill records for reconciliation testing.

Required proofs before live routing:

- Health check
- Paper signal roundtrip
- Flatten acknowledgement
- Kill-switch acknowledgement
- Fill reconciliation
