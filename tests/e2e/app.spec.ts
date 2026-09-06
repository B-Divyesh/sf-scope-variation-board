import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function desktopOnly(testInfo: { project: { name: string } }): void {
  test.skip(testInfo.project.name !== "chromium", "Run this browser workflow once on desktop Chromium.");
}

async function createRealLedger(page: import("@playwright/test").Page, title = "Campaign site"): Promise<void> {
  await page.getByRole("button", { name: "Create a client ledger" }).click();
  await page.getByLabel("Client name").fill("Avery Client");
  await page.getByLabel("Company").fill("Northbank Studio");
  await page.getByLabel("Client email").fill("avery@example.com");
  await page.getByLabel("Project title").fill(title);
  await page.getByLabel("Base quote").fill("4000");
  await page.getByLabel("Base scope summary").fill("Design and build a five-page campaign website.");
  await page.getByRole("button", { name: "Save ledger" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
}

test("creates a ledger and imports a verified approval decision", async ({ page, context }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Approve scope changes before extra work.");
  await createRealLedger(page);

  await page.getByRole("button", { name: "Add a change" }).first().click();
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
  await clientPage.getByRole("button", { name: "Create decision receipt" }).click();
  await clientPage.getByRole("button", { name: "Copy return link" }).click();
  const receiptLink = await clientPage.evaluate(() => navigator.clipboard.readText());
  await clientPage.close();

  await page.goto(receiptLink);
  await expect(page.locator(".status-approved")).toHaveText("✓ Approved");
  await expect(page.getByText(/Approved by Avery Client/)).toBeVisible();
  await page.getByRole("button", { name: "Mark work done" }).click();
  await expect(page.locator(".status-done")).toHaveText("✓ Work done");
});

test("@claim:sample-demo opens a populated client ledger in one click", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/");
  await page.getByRole("button", { name: "Try it with sample data" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page).toHaveTitle("Demo — Change Ledger");
  await expect(page.getByText("Demo — sample data, nothing is saved.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Autumn collection website");
  await expect(page.locator(".change-card")).toHaveCount(3);
  await expect(page.getByText("Add a studio process video")).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.locator(".change-card")).toHaveCount(3);
});

test("@claim:demo-isolation keeps sample changes out of a real ledger", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/");
  await createRealLedger(page, "Real client ledger");
  await page.goto("/demo");
  await page.getByRole("button", { name: "Add a change" }).first().click();
  await page.getByLabel("Short title").fill("Demo-only event page");
  await page.getByLabel("What is changing?").fill("Add an event page to the sample website.");
  await page.getByLabel("Reason").fill("Sample request");
  await page.getByLabel(/Fixed-price delta/).fill("250");
  await page.getByRole("button", { name: "Save change" }).click();
  await expect(page.getByText("Demo-only event page")).toBeVisible();
  await page.getByRole("button", { name: "Start for real" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Real client ledger");
  await expect(page.getByText("Demo-only event page")).toHaveCount(0);
});

test("@claim:approval-receipt accepts a decision only for the frozen change", async ({ page, context }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/?demo=1");
  const pendingCard = page.locator(".change-card", { hasText: "Add a studio process video" });
  await pendingCard.getByRole("button", { name: "View approval link" }).click();
  const approvalLink = await page.getByLabel("Private fragment link").inputValue();
  const clientPage = await context.newPage();
  await clientPage.goto(approvalLink);
  await clientPage.getByLabel("Approve this change").check();
  await clientPage.getByLabel("Your name").fill("Mira Patel");
  await clientPage.getByRole("button", { name: "Create decision receipt" }).click();
  await clientPage.getByRole("button", { name: "Copy return link" }).click();
  const receiptLink = await clientPage.evaluate(() => navigator.clipboard.readText());
  await clientPage.close();
  await page.goto(receiptLink);
  await expect(page.locator(".change-card", { hasText: "Add a studio process video" }).locator(".status-approved")).toHaveText("✓ Approved");
  await expect(page.locator(".change-card", { hasText: "Add a studio process video" }).getByText(/Approved by Mira Patel/)).toBeVisible();
});

test("@claim:csv-export downloads one CSV row for every sample change", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/?demo=1");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  const text = await (await download.createReadStream())!.toArray().then((parts) => Buffer.concat(parts).toString("utf8"));
  expect(text.split(/\r?\n/)[0]).toContain('"Project","Client","Revision"');
  expect(text.split(/\r?\n/).filter(Boolean)).toHaveLength(4);
  expect(text).toContain("Add a studio process video");
});

test("@claim:json-backup downloads the complete sample workspace", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: "Import or back up data" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  const backup = JSON.parse(await (await download.createReadStream())!.toArray().then((parts) => Buffer.concat(parts).toString("utf8"))) as { clients: unknown[]; projects: unknown[]; changes: unknown[] };
  expect(backup.clients).toHaveLength(1);
  expect(backup.projects).toHaveLength(1);
  expect(backup.changes).toHaveLength(3);
});

test("@claim:print-pdf produces a browser PDF of the populated ledger", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/?demo=1");
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  expect(pdf.byteLength).toBeGreaterThan(10_000);
});

test("@claim:offline-reload keeps the sample ledger after the first visit", async ({ browser }, testInfo) => {
  desktopOnly(testInfo);
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  try {
    await page.goto("/?demo=1");
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Autumn collection website");
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Autumn collection website");
    await expect(page.getByText(/Offline:/)).toBeVisible();
  } finally {
    await context.close();
  }
});

test("@claim:private-local keeps demo data and approval fragments out of network requests", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: "Add a change" }).first().click();
  await page.getByLabel("Short title").fill("Private sample note");
  await page.getByLabel("What is changing?").fill("Record an added sample deliverable without sending it anywhere.");
  await page.getByLabel("Reason").fill("Privacy check");
  await page.getByLabel(/Fixed-price delta/).fill("10");
  await page.getByRole("button", { name: "Save change" }).click();
  const privateCard = page.locator(".change-card", { hasText: "Private sample note" });
  await privateCard.getByRole("button", { name: "Create approval link" }).click();
  const approvalLink = await page.getByLabel("Private fragment link").inputValue();
  await page.goto(approvalLink);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Private sample note");
  const baseOrigin = new URL(page.url()).origin;
  expect(requests.every((url) => new URL(url).origin === baseOrigin)).toBe(true);
  expect(requests.some((url) => url.includes("Private%20sample%20note") || url.includes("Private+sample+note") || url.includes("approval="))).toBe(false);
});

test("@claim:free-ledger allows one active ledger before showing the one-time license", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/");
  await createRealLedger(page);
  await page.getByRole("button", { name: "Create a new ledger" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Unlock unlimited ledgers" })).toBeVisible();
  await expect(page.getByText("$19 one time")).toBeVisible();
  await expect(page.getByRole("link", { name: "Buy unlimited ledgers" })).toHaveAttribute("href", /api\.sociobot\.in\/api\/v1\/products\/scope-variation-board\/checkout$/);
});

test("shows an actionable error for invalid backup files and stale receipts", async ({ page, context }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: "Import or back up data" }).click();
  await page.locator("#backup-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.locator("#data-error")).toContainText("backup format is not supported");
  await page.getByRole("button", { name: "Close" }).click();

  const approvedCard = page.locator(".change-card", { hasText: "Add a wholesale enquiry page" });
  await approvedCard.getByRole("button", { name: "View approval link" }).click();
  const approvalLink = await page.getByLabel("Private fragment link").inputValue();
  await page.getByRole("button", { name: "Close" }).click();
  const clientPage = await context.newPage();
  await clientPage.goto(approvalLink);
  await clientPage.getByLabel("Decline this change").check();
  await clientPage.getByLabel("Your name").fill("Mira Patel");
  await clientPage.getByRole("button", { name: "Create decision receipt" }).click();
  await clientPage.getByRole("button", { name: "Copy return link" }).click();
  const receiptLink = await clientPage.evaluate(() => navigator.clipboard.readText());
  await clientPage.close();

  await approvedCard.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("What is changing?").fill("Add a wholesale page with an enquiry form and updated copy.");
  await page.getByRole("button", { name: "Save change" }).click();
  await expect(page.locator(".change-card", { hasText: "Add a wholesale enquiry page" }).getByText("Revision 2")).toBeVisible();
  await page.goto(receiptLink);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This receipt needs a current change.");
  await expect(page.getByText(/earlier revision.*Create a new approval link/i)).toBeVisible();
  await expect(page.getByText("Local storage error")).toHaveCount(0);
});

test("restores a valid JSON backup and imports a JSON decision receipt", async ({ page, context }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: "Import or back up data" }).click();
  const backupDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const backupDownload = await backupDownloadPromise;
  const backupBuffer = Buffer.concat(await (await backupDownload.createReadStream())!.toArray());
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Add a change" }).first().click();
  await page.getByLabel("Short title").fill("Temporary demo change");
  await page.getByLabel("What is changing?").fill("Add a change that will be removed by a valid restore.");
  await page.getByLabel("Reason").fill("Restore check");
  await page.getByLabel(/Fixed-price delta/).fill("1");
  await page.getByRole("button", { name: "Save change" }).click();
  await expect(page.locator(".change-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Import or back up data" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#backup-file").setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backupBuffer });
  await expect(page.locator(".change-card")).toHaveCount(3);
  await expect(page.getByText("Temporary demo change")).toHaveCount(0);

  const pendingCard = page.locator(".change-card", { hasText: "Add a studio process video" });
  await pendingCard.getByRole("button", { name: "View approval link" }).click();
  const approvalLink = await page.getByLabel("Private fragment link").inputValue();
  await page.getByRole("button", { name: "Close" }).click();
  const clientPage = await context.newPage();
  await clientPage.goto(approvalLink);
  await clientPage.getByLabel("Approve this change").check();
  await clientPage.getByLabel("Your name").fill("Mira Patel");
  await clientPage.getByRole("button", { name: "Create decision receipt" }).click();
  const receiptDownloadPromise = clientPage.waitForEvent("download");
  await clientPage.getByRole("button", { name: "Download receipt" }).click();
  const receiptDownload = await receiptDownloadPromise;
  const receiptBuffer = Buffer.concat(await (await receiptDownload.createReadStream())!.toArray());
  await clientPage.close();

  await page.getByRole("button", { name: "Import or back up data" }).click();
  await page.locator("#receipt-file").setInputFiles({ name: "decision.json", mimeType: "application/json", buffer: receiptBuffer });
  await expect(page.locator(".change-card", { hasText: "Add a studio process video" }).locator(".status-approved")).toHaveText("✓ Approved");
});

test("has no serious accessibility violations in the landing and demo views", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  await page.goto("/");
  let results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  await page.goto("/?demo=1");
  results = await new AxeBuilder({ page: page as never }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});

test("has titled, accessible legal pages and a designed 404 page", async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  for (const [path, title, heading] of [
    ["/privacy/", "Privacy — Change Ledger", "Your records stay in your browser."],
    ["/terms/", "Terms — Change Ledger", "Terms for recording scope changes."],
    ["/404.html", "Page not found — Change Ledger", "Page not found."],
  ]) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  }
});

test("fits visible demo controls into 44px targets at 390px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout check.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo=1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const undersized = await page.locator("a,button,input,select,textarea").evaluateAll((nodes) => nodes
    .filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    })
    .map((node) => ({ name: (node.textContent || node.getAttribute("aria-label") || node.id).trim(), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
  expect(undersized).toEqual([]);
});
