# Strategy Lab Wiring

Strategy Lab should treat Nexural Automation as the local strategy validation server.

## Required Visible Actions

- List Automation capabilities.
- Run gauntlet on a CSV export.
- Estimate strategy costs.
- Generate report.
- Scaffold strategy.
- Scaffold bridge.

## Required UI States

- Loading.
- Success.
- Validation failed.
- Server offline.
- Permission denied.

## Gateway Rules

- Keep `NEXURAL_AUTOMATION_API_KEY` server-side only.
- Keep browser calls routed through the Strategy Lab backend gateway.
- Default Automation URL: `http://127.0.0.1:8000`.
- Never expose live routing from the browser.

## Mocked E2E Contract

The Strategy Lab test suite should mock these Automation responses:

- `/capabilities`
- gauntlet decision: `REJECT`, `TUNE`, `REWRITE`, `PROMOTE_TO_PAPER`
- cost estimate
- report path
- strategy scaffold result
- bridge scaffold result
