---
title: Automation engineering with an evidence trail
description: The operator-first entry point to Nexural Automation research, Academy, NT8 safety, and qualification documentation.
hide:
  - toc
---

<section class="portal-hero">
  <div class="portal-hero__copy">
    <p class="portal-kicker">Nexural Automation / operator documentation</p>
    <h1>Build the automation.<br><span>Prove the boundary.</span></h1>
    <p class="portal-lede">
      A simulation-first field manual for strategy research, agent-callable workflows,
      NinjaTrader safety controls, and evidence-based qualification.
    </p>
    <div class="portal-actions">
      <a class="portal-button portal-button--primary" href="operator-manual/">Open the operator manual</a>
      <a class="portal-button portal-button--secondary" href="status/">Inspect evidence status</a>
    </div>
  </div>
  <div class="hero-console" role="group" aria-label="Local documentation validation commands">
    <div class="hero-console__top">
      <span>LOCAL BUILD / PYTHON 3.11</span>
      <span class="hero-console__signal">DOCS</span>
    </div>
    <div class="hero-console__commands">
      <code><span aria-hidden="true">$</span> py -3.11 -m pip install -r docs/requirements.txt</code>
      <code><span aria-hidden="true">$</span> py -3.11 -m mkdocs build -f docs/mkdocs.yml --strict</code>
      <code><span aria-hidden="true">$</span> py -3.11 docs/scripts/validate_site.py site</code>
    </div>
    <div class="hero-console__status">
      <span>Qualification state</span>
      <strong>NOT QUALIFIED</strong>
    </div>
  </div>
</section>

<section class="status-rail" aria-labelledby="routes-heading">
  <div class="status-rail__intro">
    <p class="portal-kicker">Four operating routes</p>
    <h2 id="routes-heading">Navigate by decision, not file tree.</h2>
  </div>
  <div class="route-grid">
    <a class="route-card" href="operator-manual/">
      <span class="route-card__index">01 / MANUAL</span>
      <h3>Operate the system</h3>
      <p>Follow the shortest safe route from clone to reproducible local result.</p>
      <span class="route-card__action">Open runbook →</span>
    </a>
    <a class="route-card route-card--lime" href="nt8-safety/">
      <span class="route-card__index">02 / NT8 SAFETY</span>
      <h3>Keep paper routing bounded</h3>
      <p>Understand account/provider gates, durable stops, callbacks, and desktop proof.</p>
      <span class="route-card__action">Read controls →</span>
    </a>
    <a class="route-card route-card--orange" href="public-launch-checklist/">
      <span class="route-card__index">03 / QUALIFICATION</span>
      <h3>Refuse premature promotion</h3>
      <p>Use immutable candidates, independent evidence, reproducibility, and signatures.</p>
      <span class="route-card__action">Open gate →</span>
    </a>
    <a class="route-card route-card--paper" href="status/">
      <span class="route-card__index">04 / EVIDENCE</span>
      <h3>Read what is actually proven</h3>
      <p>Separate source availability and local checks from independent qualification.</p>
      <span class="route-card__action">View ledger →</span>
    </a>
  </div>
</section>

## Start with the boundary

!!! danger "No live-routing mode"
    The documented native bridge recognizes only `Sim101 + Simulator` and
    `Playback101 + Playback`. Unknown account, provider, connection, order,
    position, or evidence state is blocked.

=== "Learn"

    Start with the [Automation Academy](automation-academy.md), then build a
    [first strategy](build-your-first-strategy.md) and
    [first bridge](build-your-first-bridge.md).

=== "Research"

    Read the [backtesting policy](backtesting-policy.md), the
    [overfitting primer](overfitting-primer.md), and the
    [walk-forward examples](walk-forward-examples.md) before interpreting results.

=== "Operate"

    Use the [operator manual](operator-manual.md), [NT8 safety guide](nt8-safety.md),
    and [incident runbook](security-hardening.md). Preserve failed evidence.

=== "Qualify"

    Check the [current evidence status](status.md) first. The
    [qualification checklist](public-launch-checklist.md) defines the promotion gate;
    documentation does not assert that it has passed.
