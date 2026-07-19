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

test("causal mission submission records tamper-evident evidence", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Seal the Lookahead Leak" }).click();
  await page.getByLabel("Lab submission JSON").fill(JSON.stringify({
    split_before_features: true,
    feature_lag: 1,
    uses_future_columns: false,
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
