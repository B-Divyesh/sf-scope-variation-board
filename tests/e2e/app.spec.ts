import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("creates a ledger and completes a verified approval round trip", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Full round trip runs once on desktop.");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Approve the detour");
  await page.getByRole("button", { name: "Create your first ledger" }).click();
  await page.getByLabel("Client name").fill("Avery Client");
  await page.getByLabel("Company").fill("Northbank Studio");
  await page.getByLabel("Client email").fill("avery@example.com");
  await page.getByLabel("Project title").fill("Campaign site");
  await page.getByLabel("Base quote").fill("4000");
  await page.getByLabel("Base scope summary").fill("Design and build a five-page campaign website.");
  await page.getByRole("button", { name: "Save ledger" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Campaign site");

  await page.getByRole("button", { name: "Plot a change" }).first().click();
  await page.getByLabel("Short title").fill("Add resource library");
  await page.getByLabel("What is changing?").fill("Design and build a filterable resource library with twelve initial entries.");
  await page.getByLabel("Reason").fill("Requested after kickoff");
  await page.getByLabel(/Fixed-price delta/).fill("850");
  await page.getByRole("button", { name: "Save change" }).click();
  await expect(page.getByText("$850.00")).toBeVisible();

  await page.getByRole("button", { name: "Create approval link" }).click();
  const approvalLink = await page.getByLabel("Private fragment link").inputValue();
  expect(approvalLink).toContain("#approval=");

  const clientPage = await context.newPage();
  await clientPage.goto(approvalLink);
  await expect(clientPage.getByRole("heading", { level: 1 })).toHaveText("Add resource library");
  await expect(clientPage.getByText("$4,850.00")).toBeVisible();
  await clientPage.getByLabel("Approve this change").check();
  await clientPage.getByLabel("Your name").fill("Avery Client");
  await clientPage.getByLabel("Note (optional)").fill("Approved for the launch.");
  await clientPage.getByRole("button", { name: "Create decision receipt" }).click();
  await clientPage.getByRole("button", { name: "Copy return link" }).click();
  const receiptLink = await clientPage.evaluate(() => navigator.clipboard.readText());
  expect(receiptLink).toContain("#receipt=");
  await clientPage.close();

  await page.goto(receiptLink);
  await expect(page.locator(".status-approved")).toHaveText("✓ Approved");
  await expect(page.getByText(/Approved by Avery Client/)).toBeVisible();
  await page.getByRole("button", { name: "Mark work done" }).click();
  await expect(page.locator(".status-done")).toHaveText("✓ Work done");
});

test("has no serious accessibility violations in the empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  const results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});

test("loads the installed shell while offline", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Offline service-worker check runs once.");
  await page.goto("/");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await expect.poll(() => page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = (await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()))).flat();
    return requests.some((request) => request.url.endsWith(".js"));
  })).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Approve the detour");
  await expect(page.getByText(/Offline:/)).toHaveCount(0);
  await context.setOffline(false);
});

test("fits core actions at 390px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout check.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Create your first ledger" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
