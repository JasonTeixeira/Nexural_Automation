import AxeBuilder from "@axe-core/playwright";
import { expect, request, test } from "@playwright/test";

const viewports = [
  { width: 375, height: 900 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 1100 },
];

for (const viewport of viewports) {
  test(`Academy passes full accessibility scan at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Research flight deck" })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });
}

test("mobile mission index uses accessible progressive disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });

  const mobileCurriculum = page.locator(".academy-mobile-curriculum");
  const triggers = mobileCurriculum.locator(".academy-track-trigger");
  await expect(mobileCurriculum).toBeVisible();
  await expect(page.locator(".academy-mission-queue")).toBeHidden();
  await expect(triggers).toHaveCount(5);
  await expect(triggers.first()).toHaveAttribute("aria-expanded", "true");
  await expect(triggers.nth(1)).toHaveAttribute("aria-expanded", "false");
  await expect(mobileCurriculum.locator(".academy-track-panel:visible")).toHaveCount(1);

  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(pageHeight).toBeLessThan(2600);

  await triggers.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(triggers.nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(triggers.nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect(triggers.first()).toHaveAttribute("aria-expanded", "false");

  const passedFilter = mobileCurriculum.getByRole("button", { name: "Passed", exact: true });
  await passedFilter.click();
  await expect(passedFilter).toHaveAttribute("aria-pressed", "true");
  await expect(mobileCurriculum.getByRole("status")).toContainText("missions match");
});

for (const viewport of [{ width: 768, height: 1024 }, { width: 1024, height: 900 }, { width: 1440, height: 1100 }]) {
  test(`desktop mission queue remains complete at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator(".academy-mobile-curriculum")).toBeHidden();
    await expect(page.locator(".academy-mission-queue")).toBeVisible();
    await expect(page.locator(".academy-mission-queue .academy-queue-item")).toHaveCount(65);
  });
}

test("mobile inline errors wrap and preserve a mission-control escape route", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.route("**/api/academy/items/*/hint", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Mentor evidence service is temporarily unavailable for this unusually long diagnostic request." }),
    });
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator(".academy-track-panel:visible .academy-queue-item:not(:disabled)").first().click();
  await page.getByRole("button", { name: "Request next hint" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert.getByRole("button", { name: "Mission control" })).toBeVisible();
  const overflow = await alert.evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(overflow).toBeFalsy();
  await alert.getByRole("button", { name: "Mission control" }).click();
  await expect(page.locator(".academy-mobile-curriculum")).toBeVisible();
});

test("reduced motion collapses Academy transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  const duration = await page.locator(".academy-track-chevron").first().evaluate((element) => {
    const raw = getComputedStyle(element).transitionDuration;
    return raw.endsWith("ms") ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000;
  });
  expect(duration).toBeLessThanOrEqual(0.02);
});

test("machine-derived causal mission records tamper-evident evidence", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Causal Feature Pipeline" }).click();
  await page.getByLabel("Lab submission JSON").fill(JSON.stringify({
    source: {
      program: {
        operations: [
          "load_fixture",
          "split_before_feature_engineering",
          "reject_stale_timestamp",
          "emit_evidence",
        ],
        settings: { mode: "paper", deterministic: true },
      },
    },
    seed: 42,
  }, null, 2));
  await page.getByRole("button", { name: /^Submit/ }).click();
  await expect(page.getByText("PASS", { exact: true })).toBeVisible();
  await expect(page.locator(".academy-grade.passed strong")).toHaveText("100");
  await page.getByRole("button", { name: "Evidence ledger" }).click();
  await expect(page.getByText(/research\.lookahead/).first()).toBeVisible();
});

test("public contracts hide grader internals and extension APIs are live", async ({ request }) => {
  const catalogResponse = await request.get("/api/academy/catalog");
  expect(catalogResponse.ok()).toBeTruthy();
  const catalogText = JSON.stringify(await catalogResponse.json());
  expect(catalogText).not.toContain("future_guard");
  expect(catalogText).not.toContain("uses_future_columns");
  expect(catalogText).not.toContain('"expected"');
  expect(catalogText).not.toContain("hidden_tests");

  const faultPayload = { profile: "duplicate", seed: 7, events: [{ id: "signal-1" }] };
  const firstFault = await request.post("/api/academy/faults/apply", { data: faultPayload });
  const secondFault = await request.post("/api/academy/faults/apply", { data: faultPayload });
  expect(await firstFault.json()).toEqual(await secondFault.json());

  const marketplace = await (await request.get("/api/academy/marketplace")).json();
  expect(marketplace.templates.length).toBeGreaterThanOrEqual(2);
  expect(marketplace.templates[0].digest).toMatch(/^sha256:[a-f0-9]{64}$/);

  const cohort = await request.post("/api/academy/cohorts/summary", {
    data: { cohort_id: "ci-desk", learner_ids: ["ci-learner"] },
  });
  expect(cohort.ok()).toBeTruthy();
  expect((await cohort.json()).learners).toBe(1);
});

test("hosted Academy requires an exact bearer credential", async () => {
  const authBaseUrl = process.env.E2E_AUTH_URL;
  test.skip(!authBaseUrl, "E2E_AUTH_URL is only required by the release gate");
  const anonymous = await request.newContext({ baseURL: authBaseUrl });
  expect((await anonymous.get("/api/academy/catalog")).status()).toBe(401);
  await anonymous.dispose();

  const authorized = await request.newContext({
    baseURL: authBaseUrl,
    extraHTTPHeaders: { Authorization: "Bearer e2e-academy-key" },
  });
  expect((await authorized.get("/api/academy/catalog")).status()).toBe(200);
  await authorized.dispose();
});
