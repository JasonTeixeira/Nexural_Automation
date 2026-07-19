# Deterministic fault matrix

Run `scripts/Test-NT8SafetySpine.ps1`. The portable suite is dependency-free and returns a non-zero process code on any failed invariant.

| Fault | Expected control | Evidence |
|---|---|---|
| Live or misspelled account | Reject before cursor advance | `AccountGateAllowsOnlySimulationAccounts`, `CoordinatorRejectsLiveAccountWithoutAdvancingCursor` |
| Duplicate ID / reused sequence / sequence gap | Reject without consuming | `SignalGateRejectsDuplicateAndNonMonotonicSignals` |
| Expired or future-dated signal | Reject without consuming | `SignalGateRejectsExpiredAndFutureSignals` |
| Startup before account reconciliation | Fail closed | `RiskEngineFailsClosedUntilReconciled` |
| Quantity, position, loss, or session breach | Reject and consume forward sequence | `RiskEngineEnforcesEveryLimit`, `CoordinatorPersistsForwardRiskRejectionAndAck` |
| Duplicate partial fill | Ignore duplicate execution ID | `OrderLifecycleDeduplicatesPartialFillsAndCompletes` |
| Overfill or terminal-state regression | Fault lifecycle | `OrderLifecycleFaultsOnOverfillAndIllegalTransition` |
| Process restart while stopped | Reload engaged kill switch | `KillSwitchPersistsAcrossRestart` |
| Restart after accepted signal | Reload cursor and ACK journal | `FileJournalAndCursorSurviveRestart` |
| Entry during safety stop | Block entry; retain flatten path | `KillSwitchBlocksEntriesButAllowsFlatten` |

Native compilation is a separate gate in `tests/Nexural.NT8.AdapterCompile`. It compiles the exact archive source against the installed NinjaTrader assemblies without modifying the user's NinjaTrader custom directory.

## Adversarial and recovery gate

Run `scripts/Test-NT8Adversarial.ps1` to execute the deterministic suite plus:

- at least 50,000 generated property cases across account, signal, lifecycle, and risk invariants;
- at least 50,000 seeded fuzz cases with malformed boundaries and randomized event sequences;
- explicit mutation testing across every critical execution/risk guard, with a minimum score of 85%;
- measured fail-close recovery after disconnect (maximum 5 seconds);
- measured state reload and reconciliation after restart (maximum 30 seconds).

The harness emits machine-readable JSON for CI qualification evidence. Portable timings prove kernel
behavior only; desktop RTOs must be captured independently in both Playback101 and Sim101.
