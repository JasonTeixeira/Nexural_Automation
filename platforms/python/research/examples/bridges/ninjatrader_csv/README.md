# NinjaTrader CSV Bridge

This bridge example writes validated signal records to a local JSONL file for a
separate NinjaTrader-side process to consume. It is a bridge contract example,
not a live-order router.

Required proofs before live routing:

- Health check
- Paper signal roundtrip
- Flatten acknowledgement
- Kill-switch acknowledgement
- Fill reconciliation
