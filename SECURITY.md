# Security Policy

Security fixes are applied to `main` and the latest 2.x release. Older releases are not actively patched.

| Version | Supported |
|---|---|
| `main` | Yes |
| Latest `2.x` tag | Yes |
| `< 2.0` | No |

## Report a vulnerability

Do not open a public issue. Submit a private report through [GitHub Security Advisories](https://github.com/JasonTeixeira/Nexural_Automation/security/advisories/new).

Include:

- the affected component, version, and commit SHA
- minimal reproduction steps or a safe proof of concept
- the expected impact and required attacker access
- whether you plan to disclose and your proposed timeline

Never include real brokerage credentials, account identifiers, API keys, or personal trade data.

## Response targets

| Stage | Target |
|---|---|
| Acknowledgement | 3 business days |
| Initial assessment | 7 business days |
| Fix or mitigation | Normally within 30 days for a confirmed issue |
| Disclosure | Coordinated after a fix is available |

We will validate and scope the report, prepare a fix privately when appropriate, request a CVE when warranted, and credit the reporter unless anonymity is requested.

## Scope

In scope:

- Python API, MCP server, Academy service, research engine, and frontend
- native NT8 safety core, Strategy/AddOn adapters, packaging, and fault harness
- schemas, release automation, containers, dependency locks, and CI/CD
- documentation that causes a material insecure configuration

Out of scope:

- NinjaTrader, brokers, exchanges, data providers, or other third-party platforms
- social engineering and physical-access attacks
- profit, performance, or trading recommendations
- live-account execution, which the included bridge intentionally does not support

## Safe harbor

We will not pursue legal action against researchers who act in good faith, avoid privacy violations and destructive testing, do not access live brokerage systems, and allow a reasonable remediation window before disclosure.

The repository's automated security checks and threat model are defensive engineering evidence, not a substitute for an independent professional security assessment.

## Qualification rule

The world-class gate requires zero unresolved critical or high vulnerabilities and at least one
independent external security assessment. The review record must match
[`schemas/external-security-review.schema.json`](schemas/external-security-review.schema.json),
reference the immutable commit reviewed, include the report SHA-256 digest, and confirm that no
critical/high findings remain unresolved. Project maintainers cannot self-attest this gate.
