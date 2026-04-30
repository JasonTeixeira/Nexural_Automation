# NinjaTrader Platform

This folder contains NinjaTrader 8 (NinjaScript/C#) strategies, indicators, workspaces, and shared components.

## Contents

| Folder | Description |
|--------|-------------|
| `Strategies/` | NinjaScript trading strategies |
| `indicators/` | NinjaScript indicators |
| `workspaces/` | **11 pre-built workspace layouts** (60 charts, 8 instruments) — [see setup guide](workspaces/README.md) |

## Workspaces — Quick Start

Copy the `.xml` files from `workspaces/` to your NinjaTrader folder:
```
Documents\NinjaTrader 8\workspaces\
```
Then: File > Workspaces > select any Nexural workspace. Full instructions in the [workspace README](workspaces/README.md).

## Conventions
- Strategies live in `Strategies/<ModuleName>/`
- Indicators live in `indicators/<ModuleName>/`
- Workspaces live in `workspaces/`
- Shared code belongs in `Core/`, `Utilities/`, `Risk/`, `Execution/`, etc.

## Safety
All modules must follow the repo documentation standard and include risk language. See root DISCLAIMER.md.
