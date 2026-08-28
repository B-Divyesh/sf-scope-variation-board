import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const baseURL = "https://scope-variation-board.sociobot.in";
const report = { baseURL, runAt: new Date().toISOString(), checks: {}, errors: [] };
const record = (name, value) => { report.checks[name] = value; };
const serious = (results) => results.violations
  .filter((item) => ["serious", "critical"].includes(item.impact ?? ""))
  .map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length, help: item.help }));

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
    serviceWorkers: "allow",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const requests = [];
  const browserErrors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));

  const response = await page.goto(baseURL, { waitUntil: "networkidle" });
  record("cold", {
    status: response?.status(),
    title: await page.title(),
    h1: await page.getByRole("heading", { level: 1 }).allTextContents(),
    sampleActionCount: await page.getByText(/try it with sample data/i).count(),
    freelancerTextCount: await page.getByText(/freelancer/i).count(),
    primaryActions: await page.locator("button.primary, a.primary").allTextContents(),
    serviceWorkerToastOnFirstInstall: await page.getByText("A new field map is ready.").isVisible().catch(() => false),
  });
  record("axe-empty-desktop", serious(await new AxeBuilder({ page }).analyze()));

  await page.goto(`${baseURL}/demo`, { waitUntil: "networkidle" });
  record("demo-path", {
    url: page.url(),
    bannerCount: await page.getByText(/Demo.*sample data.*nothing is saved/i).count(),
    resetCount: await page.getByText(/Reset demo/i).count(),
    startRealCount: await page.getByText(/Start for real/i).count(),
    h1: await page.getByRole("heading", { level: 1 }).allTextContents(),
  });
  await page.goto(`${baseURL}/?demo=1`, { waitUntil: "networkidle" });
  record("demo-query", {
    url: page.url(),
    bannerCount: await page.getByText(/Demo.*sample data.*nothing is saved/i).count(),
    ledgerCount: await page.locator(".project-select").count(),
  });

  await page.goto(baseURL, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Create your first ledger" }).click();
  record("dialog-initial-focus", await page.evaluate(() => ({
    tag: document.activeElement?.tagName,
    name: document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.trim(),
  })));
  await page.keyboard.press("Escape");
  record("dialog-escape-closes", !(await page.locator("#project-dialog").evaluate((d) => d.open)));
  await page.getByRole("button", { name: "Create your first ledger" }).click();
  await page.getByRole("button", { name: "Save ledger" }).click();
  record("empty-project-validation", await page.getByLabel("Client name").evaluate((input) => ({
    valid: input.validity.valid,
    valueMissing: input.validity.valueMissing,
    message: input.validationMessage,
  })));
  await page.getByLabel("Client name").fill("Avery Client");
  await page.getByLabel("Client email").fill("not-an-email");
  await page.getByLabel("Project title").fill("Campaign site");
  await page.getByLabel("Base quote").fill("-1");
  await page.getByLabel("Base scope summary").fill("Design and build a five-page campaign website.");
  await page.getByRole("button", { name: "Save ledger" }).click();
  record("invalid-project-validation", {
    email: await page.getByLabel("Client email").evaluate((input) => ({ valid: input.validity.valid, typeMismatch: input.validity.typeMismatch, message: input.validationMessage })),
    quote: await page.getByLabel("Base quote").evaluate((input) => ({ valid: input.validity.valid, rangeUnderflow: input.validity.rangeUnderflow, message: input.validationMessage })),
    dialogStillOpen: await page.locator("#project-dialog").evaluate((d) => d.open),
  });
  await page.getByLabel("Client email").fill("avery@example.com");
  await page.getByLabel("Base quote").fill("4000");
  await page.getByRole("button", { name: "Save ledger" }).click();
  await page.getByRole("heading", { level: 1, name: "Campaign site" }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  record("indexeddb-persistence", await page.getByRole("heading", { level: 1 }).textContent());

  await page.getByRole("button", { name: "Plot a change" }).first().click();
  await page.getByRole("button", { name: "Save change" }).click();
  record("empty-change-validation", await page.getByLabel("Short title").evaluate((input) => ({
    valid: input.validity.valid,
    valueMissing: input.validity.valueMissing,
    message: input.validationMessage,
  })));
  await page.getByLabel("Short title").fill("Add resource library");
  await page.getByLabel("What is changing?").fill("Design and build a filterable resource library with twelve initial entries.");
  await page.getByLabel("Reason").fill("Requested after kickoff");
  await page.getByLabel(/Fixed-price delta/).fill("850");
  await page.getByRole("button", { name: "Save change" }).click();

  await page.getByRole("button", { name: "Mark work done" }).click();
  record("done-gate-before-approval", await page.getByRole("status").textContent());
  await page.getByRole("button", { name: "Create approval link" }).click();
  const approvalLink1 = await page.getByLabel("Private fragment link").inputValue();
  record("approval-link", {
    hasFragment: approvalLink1.includes("#approval="),
    length: approvalLink1.length,
    fingerprintVisible: await page.getByText(/SHA-256/).count(),
  });
  await page.getByRole("button", { name: "Close" }).click();

  const encoded = approvalLink1.split("#approval=")[1];
  const normal = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const payload = JSON.parse(Buffer.from(normal.padEnd(Math.ceil(normal.length / 4) * 4, "="), "base64").toString("utf8"));
  payload.change.amount += 1;
  const tampered = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const tamperedPage = await context.newPage();
  await tamperedPage.goto(`${baseURL}/#approval=${tampered}`, { waitUntil: "networkidle" });
  record("tampered-approval-rejected", {
    h1: await tamperedPage.getByRole("heading", { level: 1 }).textContent(),
    message: await tamperedPage.locator("main").innerText(),
  });
  await tamperedPage.close();

  const clientPage1 = await context.newPage();
  const clientRequests = [];
  clientPage1.on("request", (request) => clientRequests.push(request.url()));
  await clientPage1.goto(approvalLink1, { waitUntil: "networkidle" });
  record("approval-client-axe", serious(await new AxeBuilder({ page: clientPage1 }).analyze()));
  await clientPage1.getByLabel("Decline this change").check();
  await clientPage1.getByLabel("Your name").fill("Avery Client");
  await clientPage1.getByLabel("Note (optional)").fill("Please remove the CMS migration.");
  await clientPage1.getByRole("button", { name: "Create decision receipt" }).click();
  await clientPage1.getByRole("button", { name: "Copy return link" }).click();
  const declinedReceiptLink = await clientPage1.evaluate(() => navigator.clipboard.readText());
  record("decline-receipt", {
    receiptFragment: declinedReceiptLink.includes("#receipt="),
    requestLeakedFragment: clientRequests.some((url) => url.includes("approval=")),
    result: await clientPage1.locator("#receipt-result").innerText(),
  });
  await clientPage1.close();
  await page.goto(declinedReceiptLink, { waitUntil: "networkidle" });
  record("decline-import", {
    status: await page.locator(".status-declined").textContent(),
    receipt: await page.locator(".receipt-strip").innerText(),
  });

  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("What is changing?").fill("Design and build a filterable resource library with twelve entries. CMS migration excluded.");
  await page.getByLabel(/Fixed-price delta/).fill("700");
  await page.getByRole("button", { name: "Save change" }).click();
  record("revision-after-edit", {
    revisionText: await page.getByText(/Revision 2/).textContent(),
    earlierReceiptNotice: await page.getByText(/decision for an earlier revision/i).textContent(),
    status: await page.locator(".status-draft").textContent(),
  });

  await page.goto(declinedReceiptLink, { waitUntil: "networkidle" });
  record("stale-receipt-recovery", {
    h1: await page.getByRole("heading", { level: 1 }).textContent(),
    body: await page.locator("main").innerText(),
    rootCauseNamed: (await page.locator("main").innerText()).includes("earlier revision"),
  });
  await page.goto(baseURL, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Create approval link" }).click();
  const approvalLink2 = await page.getByLabel("Private fragment link").inputValue();
  await page.getByRole("button", { name: "Close" }).click();
  const clientPage2 = await context.newPage();
  await clientPage2.goto(approvalLink2, { waitUntil: "networkidle" });
  await clientPage2.getByLabel("Approve this change").check();
  await clientPage2.getByLabel("Your name").fill("Avery Client");
  await clientPage2.getByRole("button", { name: "Create decision receipt" }).click();
  await clientPage2.getByRole("button", { name: "Copy return link" }).click();
  const approvedReceiptLink = await clientPage2.evaluate(() => navigator.clipboard.readText());
  await clientPage2.close();
  await page.goto(approvedReceiptLink, { waitUntil: "networkidle" });
  record("approve-import", {
    status: await page.locator(".status-approved").textContent(),
    currentTotal: await page.locator(".survey-summary dd").nth(2).textContent(),
  });
  await page.getByRole("button", { name: "Mark work done" }).click();
  record("mark-done", await page.locator(".status-done").textContent());

  const csvDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csvDownload = await csvDownloadPromise;
  const csvStream = await csvDownload.createReadStream();
  let csv = "";
  for await (const chunk of csvStream) csv += chunk.toString();
  record("csv-export", {
    filename: csvDownload.suggestedFilename(),
    rows: csv.split(/\r?\n/).length,
    header: csv.split(/\r?\n/)[0],
    data: csv.split(/\r?\n/)[1],
  });

  await page.getByRole("button", { name: "Import or back up data" }).click();
  const jsonDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const jsonDownload = await jsonDownloadPromise;
  const jsonStream = await jsonDownload.createReadStream();
  let backupText = "";
  for await (const chunk of jsonStream) backupText += chunk.toString();
  const backup = JSON.parse(backupText);
  record("json-backup", {
    filename: jsonDownload.suggestedFilename(),
    version: backup.version,
    clients: backup.clients.length,
    projects: backup.projects.length,
    changes: backup.changes.length,
    receipts: backup.changes.reduce((count, change) => count + change.receipts.length, 0),
  });
  await page.locator("#backup-file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  record("invalid-backup", await page.locator("#data-error").textContent());
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Create a new ledger" }).click();
  record("free-tier-second-ledger-gate", {
    dialog: await page.locator("#unlock-dialog").evaluate((d) => d.open),
    price: await page.getByText("$19 one time").textContent(),
    checkout: await page.getByRole("link", { name: "Buy the field kit" }).getAttribute("href"),
  });
  await page.getByRole("button", { name: "Close" }).click();

  record("axe-populated-desktop", serious(await new AxeBuilder({ page }).analyze()));
  await page.setViewportSize({ width: 390, height: 844 });
  record("mobile-layout", {
    scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
    bodyText: (await page.locator("body").innerText()).slice(0, 1000),
  });
  const undersized = await page.locator("a,button,input,select,textarea").evaluateAll((nodes) => nodes
    .filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
    })
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return { tag: node.tagName, text: (node.textContent || node.getAttribute("aria-label") || "").trim().slice(0, 80), width: Math.round(rect.width), height: Math.round(rect.height) };
    }));
  record("mobile-touch-targets-under-44", undersized);
  record("axe-populated-mobile", serious(await new AxeBuilder({ page }).analyze()));

  await page.evaluate(() => { document.documentElement.style.fontSize = "32px"; });
  record("text-200-percent", {
    scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
    clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
    h1Visible: await page.getByRole("heading", { level: 1 }).isVisible(),
    exportVisible: await page.getByRole("button", { name: "Export CSV" }).isVisible(),
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  record("offline-persisted-ledger", {
    h1: await page.getByRole("heading", { level: 1 }).textContent(),
    notice: await page.getByText(/Offline:/).textContent(),
    status: await page.locator(".status-done").textContent(),
  });
  const offlineApproval = await context.newPage();
  await offlineApproval.goto(approvalLink2, { waitUntil: "domcontentloaded" });
  record("offline-approval-view", await offlineApproval.getByRole("heading", { level: 1 }).textContent());
  await offlineApproval.close();
  await context.setOffline(false);

  record("privacy-network", {
    total: requests.length,
    crossOrigin: [...new Set(requests.filter((url) => new URL(url).origin !== new URL(baseURL).origin))],
    fragmentLeak: requests.filter((url) => url.includes("approval=") || url.includes("receipt=")),
  });
  record("browser-errors", browserErrors);
  await context.close();

  const keyboardContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const keyboardPage = await keyboardContext.newPage();
  await keyboardPage.goto(baseURL, { waitUntil: "networkidle" });
  await keyboardPage.keyboard.press("Tab");
  record("keyboard-first-tab", await keyboardPage.evaluate(() => {
    const element = document.activeElement;
    const style = element ? getComputedStyle(element) : null;
    return { text: element?.textContent?.trim(), href: element?.getAttribute("href"), outline: style?.outline, outlineColor: style?.outlineColor };
  }));
  const reduced = await keyboardPage.evaluate(() => ({
    media: matchMedia("(prefers-reduced-motion: reduce)").matches,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    transitionDuration: getComputedStyle(document.querySelector(".hero-image") || document.body).transitionDuration,
    animationDuration: getComputedStyle(document.querySelector(".hero-image") || document.body).animationDuration,
  }));
  record("reduced-motion", reduced);
  await keyboardContext.close();

  for (const path of ["/privacy/", "/terms/"]) {
    const legalContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const legalPage = await legalContext.newPage();
    const legalErrors = [];
    legalPage.on("console", (message) => { if (message.type() === "error") legalErrors.push(message.text()); });
    legalPage.on("pageerror", (error) => legalErrors.push(error.message));
    const legalResponse = await legalPage.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
    record(`legal-${path}`, {
      status: legalResponse?.status(), title: await legalPage.title(), lang: await legalPage.locator("html").getAttribute("lang"),
      h1Count: await legalPage.locator("h1").count(), mainCount: await legalPage.locator("main").count(),
      axe: serious(await new AxeBuilder({ page: legalPage }).analyze()), errors: legalErrors,
      overflow: await legalPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
    });
    await legalContext.close();
  }
} catch (error) {
  report.errors.push(error?.stack || String(error));
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;
