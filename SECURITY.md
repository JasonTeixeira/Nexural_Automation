# Security Policy

We take the security of Nexural_Automation seriously. This document explains how to
report a vulnerability and what to expect after you do.

## Supported Versions

Security fixes are applied to the latest release on `main`. Older tagged releases are
not actively patched; please upgrade to the latest version.

| Version          | Supported          |
| ---------------- | ------------------ |
| `main` (latest)  | :white_check_mark: |
| `v0.2.x`         | :white_check_mark: |
| `v0.1.x`         | :x:                |
| `< v0.1`         | :x:                |

## Reporting a Vulnerability

**Please do not open public GitHub issues for security vulnerabilities.** Public
disclosure before a fix is available puts users at risk.

You have two private channels:

1. **GitHub Security Advisories (preferred)** — open a private advisory at
   [github.com/JasonTeixeira/Nexural_Automation/security/advisories/new](https://github.com/JasonTeixeira/Nexural_Automation/security/advisories/new).
   This creates a private collaboration space with the maintainers and supports
   coordinated disclosure, CVE requests, and patch review.

2. **Private email** — send a report to **security@nexural.com**. Use a clear
   subject line such as `[SECURITY] Nexural_Automation – <short summary>`.

### What to include

Please provide as much of the following as you can:

- A description of the issue and the affected component (e.g. MCP server,
  Strategy SDK, Bridge SDK, gauntlet CLI, a specific workflow).
- Steps to reproduce, ideally with a minimal proof of concept.
- The version, commit SHA, or release tag where you observed the issue.
- The impact you believe it has (data exposure, RCE, denial of service, etc.).
- Whether you intend to disclose publicly, and on what timeline.

## Our Response Process

| Stage              | Target SLA                                   |
| ------------------ | -------------------------------------------- |
| Acknowledgement    | within 3 business days                       |
| Initial assessment | within 7 business days                       |
| Fix or mitigation  | typically within 30 days for confirmed issues |
| Public disclosure  | coordinated with reporter after a fix ships  |

We will:

- Confirm receipt and assign an internal tracking identifier.
- Work with you to validate, reproduce, and scope the issue.
- Prepare a fix on a private branch, request a CVE if appropriate, and credit
  you in the release notes (unless you prefer to remain anonymous).
- Publish a GitHub Security Advisory describing the issue, the fix, and any
  required user action.

## Scope

In scope:

- Code in this repository (`platforms/`, `scripts/`, `.github/workflows/`, MCP
  server, Strategy SDK, Bridge SDK, gauntlet, schemas).
- Supply-chain configuration (`pyproject.toml`, `package.json`, `Dockerfile`,
  Dependabot, CodeQL, release pipeline, SBOM).
- Documentation that could lead users into an insecure configuration.

Out of scope:

- Vulnerabilities in third-party brokers, exchanges, or trading platforms
  (NinjaTrader, TradingView, etc.) — please report those to the vendor.
- Issues that require physical access to a user's machine.
- Social engineering of maintainers or users.

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to follow this policy.
- Avoid privacy violations, data destruction, and service disruption.
- Give us a reasonable window to remediate before public disclosure.

Thank you for helping keep Nexural_Automation and its users safe.
