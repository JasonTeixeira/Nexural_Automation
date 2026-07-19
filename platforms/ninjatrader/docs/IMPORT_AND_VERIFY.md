# Build, import, and verify

## Automated checks and archive

From `platforms/ninjatrader`:

```powershell
.\scripts\Test-NinjaTraderEnvironment.ps1
.\scripts\Test-NT8SafetySpine.ps1
.\scripts\Build-NinjaTraderArchive.ps1
```

The locally native-compile-tested baseline and the separate desktop qualification targets are recorded in `packaging/supported-versions.json`. A target is not labeled verified until the signed aggregate evidence passes. The archive declares the oldest target (`8.1.7.1`) so the same frozen ZIP can be exercised on `8.1.7.1` and `8.1.7.2`. The native compile harness is read-only with respect to the user's NinjaTrader directory. The builder creates a source archive under `artifacts`, validates its required entries, and prints its SHA-256 digest.

## Manual import proof

NinjaTrader does not expose a supported headless import/compile command. Final proof therefore remains an explicit desktop step:

1. Back up custom NinjaScript and confirm the NinjaScript Editor already compiles cleanly.
2. In Control Center choose **Tools > Import > NinjaScript Add-On** and select the generated ZIP.
3. Open NinjaScript Editor and press **F5**. Save a screenshot or build log showing zero errors and the installed NinjaTrader version.
4. Open the Add-Ons menu and confirm `NexuralSimBridgeAddOn` is active.
5. Connect only Playback or the simulator. Confirm the chosen account is `Playback101` or `Sim101`.
6. Drop a short-lived `.signal` file into `Documents/NinjaTrader 8/Nexural/SimBridge/inbox` and verify a matching line in `acks.log` plus an archived input in `processed`.
7. Repeat the same signal ID and sequence; verify it is rejected and no second order appears.
8. Disconnect the data connection; verify the persistent kill-switch file is engaged and entries remain blocked after restarting NinjaTrader.
9. Reset the kill switch only through an operator-reviewed tool or exercise that supplies a non-empty operator ID.
10. Save the ten required sanitized scenario logs and run `scripts/New-NT8DesktopEvidence.ps1 -AttestIndependent` to create a schema-validated evidence record with archive, compile-log, scenario-log, and recovery-log digests. The switch is an explicit tester attestation; never use it for an owner-operated or otherwise non-independent run.

Repeat the procedure on two independently operated Windows machines, across at least two declared
NT8 patch versions, and cover both Playback101 and Sim101. The evidence helper rejects recovery
measurements above 5 seconds for disconnect or 30 seconds for restart.

NinjaTrader's official documentation warns that importing compiles the entire custom NinjaScript library, so pre-existing errors must be resolved first. It also recommends including the supported NinjaTrader version in distribution archives. See [Import](https://ninjatrader.com/support/helpGuides/nt8/import.htm), [Export](https://ninjatrader.com/support/helpGuides/nt8/export.htm), and [distribution best practices](https://ninjatrader.com/support/helpGuides/nt8/best_practices.htm).

## Limit of the automation

A passing portable suite proves domain behavior. A passing native harness proves the adapter compiles against the locally installed API. Neither proves GUI import, connection-provider behavior, simulated fills, or recovery timing; those require the manual Playback/Sim101 evidence above. Live-account testing is out of scope and intentionally impossible through this bridge.
