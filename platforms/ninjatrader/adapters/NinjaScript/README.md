# NinjaScript adapters

These adapters are a simulation-only teaching surface for NinjaTrader 8. They require both the exact account name and the native provider identity: `Sim101` + `Simulator`, or `Playback101` + `Playback`. There is no configuration switch for live routing.

- `NexuralSafeManagedStrategy.cs` demonstrates fail-closed strategy lifecycle handling and the correct use of `OnOrderUpdate`, `OnExecutionUpdate`, `OnPositionUpdate`, and `OnConnectionStatusUpdate`.
- `NexuralSimBridgeAddOn.cs` polls a durable inbox, validates sequence/risk/kill state through the portable core, journals every acknowledgement, archives each input, and submits accepted orders only after a second exact simulation-account check.

Signal files use seven pipe-delimited fields:

```text
sequence|base64(signal-id)|base64(instrument-full-name)|EnterLong|quantity|created-UTC-O|expires-UTC-O
```

Use `quantity=0` with `Flatten`. Files must end in `.signal`. The runtime directories are under `Documents/NinjaTrader 8/Nexural/SimBridge`.

Import and compile instructions are in `../../docs/IMPORT_AND_VERIFY.md`. The portable fault suite does not require NinjaTrader; the adapter compilation check requires a local supported NinjaTrader installation.
