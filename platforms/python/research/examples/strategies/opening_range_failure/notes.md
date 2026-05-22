# Research Notes

This example is a scaffold for teaching the Nexural workflow. It is not a
validated trading system.

## No-Lookahead Rule

- Opening range is computed from completed bars only.
- Breakout failure is evaluated after the breakout bar closes.
- Entries are modeled on the next bar, never the same bar that produced the signal.

## Research Questions

- Does the failure edge survive separate ES, NQ, and RTY sessions?
- Does the edge remain after elevated cost stress?
- Does performance concentrate in a single volatility regime?

