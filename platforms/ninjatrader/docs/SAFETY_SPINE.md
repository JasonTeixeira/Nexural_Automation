# Native NinjaTrader safety spine

The safety spine separates deterministic trading controls from NinjaTrader's proprietary runtime. `src/Nexural.NT8.Core` targets `netstandard2.0` with C# 7.3, so its behavior can be tested without installing NinjaTrader and its source can also compile inside NinjaTrader 8's .NET Framework 4.8 NinjaScript project.

## Safety invariants

1. Only `Sim101` backed by NinjaTrader's `Simulator` provider and `Playback101` backed by its `Playback` provider pass the account gate. Name and provider must agree, and there is no live-routing feature flag.
2. Startup and reconnect fail closed until orders, positions, connection state, and realized P/L have been reconciled.
3. Signals are UTC, expiring, strictly monotonic, gap-free, and idempotent by signal ID.
4. Structurally valid forward signals are consumed even when risk or the kill switch rejects them. A later state change cannot replay an old entry.
5. Quantity, resulting absolute position, daily loss, and per-session signal count are checked before paper submission.
6. The kill switch is durable and survives process restart. Reset requires an operator identity. Entry is blocked while risk-reducing flatten remains available.
7. Executions are idempotent by execution ID. Partial fills update cumulative fill quantity and volume-weighted price; protective quantity is based on filled quantity, never requested quantity.
8. Connection loss, illegal order-state regression, invalid execution, or overfill engages the durable safety stop in the adapters.
9. Acknowledgements are append-only and record the durable sequence and kill-switch revision.

## Durable processing order

For a valid next signal, the coordinator evaluates controls, atomically persists the consumed cursor, then appends the acknowledgement. Cursor-first ordering gives at-most-once behavior: after a crash, the adapter will not submit the same sequence again. A crash between those writes can produce a missing acknowledgement, so startup reconciliation must compare the cursor with the journal and emit an operator-visible recovery record before accepting new input. The AddOn additionally reconstructs working-order state from the account after each reconnect.

An acknowledgement with `Accepted` means only that the signal passed the safety core and is eligible for paper routing. It is not proof of an exchange, broker, or simulated fill. Order and execution callbacks remain authoritative.

## Reference lifecycle

```text
.signal -> parse -> exact simulation account gate -> sequence/time gate
        -> reconcile/risk/kill checks -> persist cursor -> append ACK
        -> exact simulation account gate again -> Sim101/Playback101 submit
        -> OnOrderUpdate -> OnExecutionUpdate -> position reconciliation
```

The adapters follow NinjaTrader's documented lifecycle callbacks. Playback can deliver executions synchronously, so execution logic never relies on `OnBarUpdate` returning first and never uses a mutable `Order` reference as the sole source of fill truth.
