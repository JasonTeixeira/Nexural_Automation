# Build Your First Strategy

## 1. Create The Scaffold

```powershell
cd platforms\python\research\nexural-research
nexural-research new-strategy "Opening Range Failure" --platform python --output-dir ..\examples\strategies
```

## 2. Fill Metadata

Open `metadata.yaml` and define:

- Platform.
- Symbols.
- Asset class.
- No-lookahead execution policy.
- Initial promotion gate.

## 3. Document Parameters

Use `parameters.md` to state every parameter, default, unit, and allowed range.

## 4. Add Source

Keep signal generation separate from execution assumptions. Do not use same-bar fills unless the strategy explicitly proves they are realistic.

## 5. Validate

```powershell
nexural-research validate-strategy ..\examples\strategies\opening_range_failure\metadata.yaml
```

## 6. Run The Gauntlet

```powershell
nexural-research gauntlet --input C:\Exports\nq_strategy.csv --symbol NQ --strategy-name "NQ ORF"
```

## 7. Decision

- `REJECT`: do not continue.
- `TUNE`: fix one or two clear weaknesses.
- `REWRITE`: thesis may be valid but implementation is not.
- `PROMOTE_TO_PAPER`: paper trade only, with bridge controls still disabled by default.
