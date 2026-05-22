# Fill Reconciliation Proof

Required evidence:

- `reconcile_fills(fills)` accepts mock or paper fills.
- Each fill includes symbol, side, quantity, price, timestamp, and external ID.
- The bridge writes a reconciliation record that can be compared against downstream fills.
