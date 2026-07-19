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
