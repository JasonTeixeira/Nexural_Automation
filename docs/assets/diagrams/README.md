# Diagram system

These source-controlled SVGs form the visual operations layer for Nexural Automation.
They are designed for GitHub rendering at a `1200 × 675` view box and remain legible
when opened directly.

## Visual grammar

| Token | Meaning |
|---|---|
| Charcoal field | Trusted system context |
| Warm paper panel | Operator instruction or pass condition |
| Acid-lime line | Allowed forward path or verified transition |
| Safety-orange border | Human decision, safety gate, or fault path |
| Muted steel | Context, metadata, or inactive boundary |
| Solid rectangle | Process or system state |
| Diamond | Decision that can halt promotion |

Color is never the only signal: every state and transition also has a label, shape, or
line treatment. Each diagram includes an SVG `title` and `desc`; the adjacent Markdown
runbook is the detailed text alternative.

## Editing rules

1. Keep the `1200 × 675` view box and sharp-cornered operations-manual style.
2. Use SVG primitives and text. Do not paste opaque screenshots or unlicensed logos.
3. Keep exact commands in Markdown, not inside the diagram.
4. Label every branch and failure outcome.
5. Validate XML, inspect the rendered image, and verify every embedding path.
