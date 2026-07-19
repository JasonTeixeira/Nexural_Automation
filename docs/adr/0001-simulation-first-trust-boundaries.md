# ADR 0001: Simulation-first trust boundaries

- Status: Accepted
- Date: 2026-07-19

## Decision

The public repository separates research, learning, execution simulation, and any future live
operation into distinct trust boundaries. Academy and reference bridge components accept only
Playback101 and Sim101. Any future live adapter must be a separately reviewed package with explicit
account identity, independent risk enforcement, signed configuration, and operator authorization.

## Rationale

Historical, Playback, Sim101, and brokerage execution have different timing and fill behavior.
Combining them behind one permissive adapter makes evidence ambiguous and allows a learning or
research action to acquire trading authority accidentally.

## Consequences

- File append is not an order acknowledgement.
- Order acceptance is not an execution acknowledgement.
- Strategy position is not assumed to equal account position.
- The public kill switch must be persistent and independently testable.
- Live operation is not a configuration toggle inside an Academy workflow.
