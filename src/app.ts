import "./styles.css";
import { loadData, saveData } from "./db";
import {
  applyReceipt,
  createApprovalPayload,
  createReceipt,
  decodeFragment,
  encodeFragment,
  formatMoney,
  parseBackup,
  projectCsv,
  uid,
  verifyApprovalPayload,
} from "./ledger";
import {
  cachedUnlock,
  captureLicenseFromUrl,
  checkoutUrl,
  storeToken,
  storedToken,
  verifyLicense,
} from "./license";
import type { AppData, ApprovalPayload, ApprovalReceipt, ChangeItem, ChangeStatus, Project } from "./types";

const main = document.querySelector<HTMLElement>("#main")!;
const toast = document.querySelector<HTMLElement>("#toast")!;
let data: AppData;
let filter: ChangeStatus | "all" = "all";
let unlocked = cachedUnlock();
let licenseMessage = "";
let toastTimer = 0;

const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function showToast(message: string, action?: { label: string; run: () => void }): void {
  window.clearTimeout(toastTimer);
  toast.innerHTML = `${escapeHtml(message)}${action ? ` <button type="button">${escapeHtml(action.label)}</button>` : ""}`;
  toast.hidden = false;
  if (action) toast.querySelector("button")?.addEventListener("click", action.run, { once: true });
  toastTimer = window.setTimeout(() => (toast.hidden = true), 5200);
}

function statusLabel(status: ChangeStatus): string {
  return { draft: "○ Draft", pending: "◷ Awaiting decision", approved: "✓ Approved", declined: "× Declined", done: "✓ Work done" }[status];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function download(name: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function persist(next: AppData, message?: string): Promise<void> {
  data = { ...next, updatedAt: new Date().toISOString() };
  await saveData(data);
  renderWorkspace();
  if (message) showToast(message);
}

function footer(): string {
  return `<footer class="footer">
    <span>Private by default · generated relief-map imagery is disclosed in the <a href="/terms/">terms</a>.</span>
    <nav aria-label="Legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></nav>
  </footer>`;
}

function selectedProject(): Project | undefined {
  return data.projects.find((project) => project.id === data.selectedProjectId) ?? data.projects.find((project) => !project.archived);
}

function renderRail(project: Project | undefined): string {
  const active = data.projects.filter((item) => !item.archived);
  return `<aside class="project-rail" aria-label="Ledgers">
    <div class="rail-top"><h2>Your ledgers</h2><button type="button" class="icon-button" data-action="new-project" aria-label="Create a new ledger">+</button></div>
    ${active.length ? `<ul class="project-list">${active.map((item) => {
      const client = data.clients.find((entry) => entry.id === item.clientId);
      return `<li><button type="button" class="project-select" data-action="select-project" data-id="${item.id}" aria-current="${project?.id === item.id}">
        <strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(client?.name ?? "Unknown client")}</small>
      </button></li>`;
    }).join("")}</ul>` : `<p class="mini-note">No ledgers plotted yet.</p>`}
    <div class="rail-footer">
      <button class="quiet-button" type="button" data-action="open-data">Import or back up data</button><br />
      <button class="quiet-button" type="button" data-action="open-unlock">${unlocked ? "Field kit unlocked" : "Unlock unlimited ledgers"}</button>
    </div>
  </aside>`;
}

function renderEmpty(): string {
  return `<section class="empty-hero" aria-labelledby="page-title">
    <div class="hero-copy">
      <p class="eyebrow">Fixed-price work, clearly rerouted</p>
      <h1 id="page-title">Approve the detour before you do the work.</h1>
      <p class="lead">Turn an out-of-scope request into a client-readable change, freeze the exact terms, and bring the decision back to your ledger.</p>
      <ul class="hero-points">
        <li><span aria-hidden="true">01</span><div><b>Plot the change</b><br /><small>Describe the new work and fixed-price delta.</small></div></li>
        <li><span aria-hidden="true">02</span><div><b>Share a frozen link</b><br /><small>The content hash changes if the terms change.</small></div></li>
        <li><span aria-hidden="true">03</span><div><b>Import the decision</b><br /><small>Keep a timestamped receipt before marking work done.</small></div></li>
      </ul>
      <button type="button" class="primary" data-action="new-project">Create your first ledger</button>
      <p class="mini-note" style="margin-top:12px">Free for one active ledger. No account and no cloud upload.</p>
    </div>
    <figure class="hero-image">
      <picture><img src="/assets/contour-ledger.webp" width="1200" height="800" alt="Layered paper contour map with an ochre route branching at a brass survey pin" decoding="async" fetchpriority="high" /></picture>
      <figcaption>Original AI-generated paper relief, created for Change Ledger.</figcaption>
    </figure>
  </section>`;
}

function renderChange(change: ChangeItem, index: number, currency: string): string {
  const receipt = change.receipts.at(-1);
  const lastSnapshot = change.snapshots.findLast((item) => item.revision === change.revision);
  return `<li class="change-card">
    <span class="marker" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
    <div class="change-top"><div>
      <div class="change-title"><h3>${escapeHtml(change.title)}</h3><span class="status status-${change.status}">${statusLabel(change.status)}</span></div>
      <p class="reason">Revision ${change.revision} · ${escapeHtml(change.reason || "Scope requested by client")}</p>
    </div><strong class="change-amount">${formatMoney(change.amount, currency)}</strong></div>
    <p class="change-description">${escapeHtml(change.description)}</p>
    ${lastSnapshot ? `<p class="mini-note">Issued ${formatDate(lastSnapshot.issuedAt)} · <span class="hash" title="${lastSnapshot.hash}">SHA-256 ${lastSnapshot.hash.slice(0, 16)}…</span></p>` : ""}
    ${receipt ? `<div class="receipt-strip ${receipt.decision === "declined" ? "declined" : ""}"><b>${receipt.decision === "approved" ? "Approved" : "Declined"} by ${escapeHtml(receipt.clientName)}</b> · ${formatDate(receipt.decidedAt)}${receipt.clientNote ? `<br />“${escapeHtml(receipt.clientNote)}”` : ""}<br /><span class="hash">Receipt ${receipt.receiptHash}</span></div>` : ""}
    <div class="change-actions">
      <button type="button" data-action="share" data-id="${change.id}">${lastSnapshot && change.status !== "draft" ? "View approval link" : "Create approval link"}</button>
      <button type="button" data-action="edit-change" data-id="${change.id}">Edit</button>
      ${change.status === "approved" ? `<button type="button" data-action="mark-done" data-id="${change.id}">Mark work done</button>` : ""}
      ${change.status !== "approved" && change.status !== "done" ? `<button type="button" data-action="mark-done" data-id="${change.id}" title="Approval is required first">Mark work done</button>` : ""}
      <button type="button" data-action="delete-change" data-id="${change.id}">Delete</button>
    </div>
  </li>`;
}

function renderLedger(project: Project): string {
  const client = data.clients.find((item) => item.id === project.clientId)!;
  const changes = data.changes.filter((item) => item.projectId === project.id);
  const filtered = changes.filter((item) => filter === "all" || item.status === filter);
  const approvedDelta = changes.filter((item) => item.status === "approved" || item.status === "done").reduce((sum, item) => sum + item.amount, 0);
  const pendingDelta = changes.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
  const total = project.baseQuote + approvedDelta;
  return `<section aria-labelledby="page-title">
    ${!navigator.onLine ? `<p class="notice"><b>Offline:</b> your ledger still works. License checks will resume when connected.</p>` : ""}
    ${licenseMessage ? `<p class="notice error">${escapeHtml(licenseMessage)} <button class="quiet-button" data-action="open-unlock">Review license</button></p>` : ""}
    <header class="ledger-header">
      <div><p class="eyebrow">Active field ledger</p><div class="ledger-title-line"><h1 id="page-title">${escapeHtml(project.title)}</h1></div>
      <p class="ledger-meta"><b>${escapeHtml(client.name)}</b>${client.company ? ` · ${escapeHtml(client.company)}` : ""}${client.email ? ` · <a href="mailto:${escapeHtml(client.email)}">${escapeHtml(client.email)}</a>` : ""}</p></div>
      <div class="header-actions">
        <button type="button" class="secondary" data-action="edit-project">Edit ledger</button>
        <button type="button" class="secondary" data-action="export-csv">Export CSV</button>
        <button type="button" class="secondary" data-action="print">Print / PDF</button>
      </div>
    </header>
    <dl class="survey-summary">
      <div><dt>Base quote</dt><dd>${formatMoney(project.baseQuote, project.currency)}</dd></div>
      <div><dt>Approved delta</dt><dd>${formatMoney(approvedDelta, project.currency)}</dd></div>
      <div><dt>Current total</dt><dd>${formatMoney(total, project.currency)}</dd></div>
      <div><dt>Pending</dt><dd>${formatMoney(pendingDelta, project.currency)}</dd></div>
    </dl>
    <section class="scope-note" aria-labelledby="base-scope-heading"><h2 id="base-scope-heading">Base scope marker</h2><p>${escapeHtml(project.baseSummary)}</p></section>
    <div class="ledger-toolbar">
      <div class="filter-group" role="group" aria-label="Filter changes">
        ${(["all", "draft", "pending", "approved", "declined", "done"] as const).map((item) => `<button class="filter-button" type="button" data-action="filter" data-filter="${item}" aria-pressed="${filter === item}">${item === "all" ? `All · ${changes.length}` : escapeHtml(statusLabel(item))}</button>`).join("")}
      </div>
      <button type="button" class="primary" data-action="add-change">Plot a change</button>
    </div>
    ${changes.length === 0 ? `<div class="empty-changes"><p class="eyebrow">No variations recorded</p><h2>The agreed route is still unchanged.</h2><p>When a request moves beyond the base quote, plot it here before starting the extra work.</p><button type="button" class="primary" data-action="add-change">Plot the first change</button></div>` : filtered.length ? `<ol class="changes">${filtered.map((item) => renderChange(item, changes.indexOf(item), project.currency)).join("")}</ol>` : `<div class="empty-changes"><h2>No changes match this legend.</h2><p>Choose another status to see the rest of this ledger.</p><button type="button" class="secondary" data-action="filter" data-filter="all">Show all changes</button></div>`}
    <p class="mini-note" style="margin-top:24px">Workflow record only—not an electronic signature or a claim of legal enforceability.</p>
  </section>`;
}

function dialogs(project: Project | undefined): string {
  return `<dialog id="project-dialog" aria-labelledby="project-dialog-title"><div class="dialog-head"><div><p class="eyebrow">Base camp</p><h2 id="project-dialog-title">Create a client ledger</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div>
    <form id="project-form" class="dialog-body"><input type="hidden" name="projectId" />
      <div class="form-grid">
        <div class="field"><label for="client-name">Client name <span aria-hidden="true">*</span></label><input id="client-name" name="clientName" required autocomplete="name" /></div>
        <div class="field"><label for="client-company">Company</label><input id="client-company" name="clientCompany" autocomplete="organization" /></div>
        <div class="field full"><label for="client-email">Client email</label><input id="client-email" type="email" name="clientEmail" autocomplete="email" /><small>Used only to help you address the ledger. It is not sent anywhere.</small></div>
        <div class="field full"><label for="project-title">Project title <span aria-hidden="true">*</span></label><input id="project-title" name="projectTitle" required /></div>
        <div class="field"><label for="base-quote">Base quote <span aria-hidden="true">*</span></label><input id="base-quote" name="baseQuote" type="number" step="0.01" min="0" required inputmode="decimal" /></div>
        <div class="field"><label for="currency">Currency</label><select id="currency" name="currency"><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option><option>AUD</option><option>CAD</option><option>SGD</option><option>NZD</option><option>JPY</option></select></div>
        <div class="field full"><label for="base-summary">Base scope summary <span aria-hidden="true">*</span></label><textarea id="base-summary" name="baseSummary" required></textarea><small>The agreed starting route, in plain language.</small></div>
      </div><p class="form-error" aria-live="assertive"></p><div class="form-actions"><button type="button" class="secondary" data-close>Cancel</button><button type="submit" class="primary">Save ledger</button></div>
    </form></dialog>
  <dialog id="change-dialog" aria-labelledby="change-dialog-title"><div class="dialog-head"><div><p class="eyebrow">Scope marker</p><h2 id="change-dialog-title">Plot a change</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div>
    <form id="change-form" class="dialog-body"><input type="hidden" name="changeId" />
      <div class="form-grid"><div class="field full"><label for="change-title">Short title <span aria-hidden="true">*</span></label><input id="change-title" name="title" required maxlength="100" /></div>
      <div class="field full"><label for="change-description">What is changing? <span aria-hidden="true">*</span></label><textarea id="change-description" name="description" required maxlength="2000"></textarea><small>Specific enough that both sides can recognise the added or changed deliverable.</small></div>
      <div class="field"><label for="change-reason">Reason</label><input id="change-reason" name="reason" maxlength="160" placeholder="Client request on 28 Aug" /></div>
      <div class="field"><label for="change-amount">Fixed-price delta (${escapeHtml(project?.currency ?? "USD")}) <span aria-hidden="true">*</span></label><input id="change-amount" name="amount" type="number" step="0.01" required inputmode="decimal" /></div></div>
      <p class="mini-note">Editing an issued change creates a new revision. Earlier snapshots and receipts stay in the history.</p><p class="form-error" aria-live="assertive"></p><div class="form-actions"><button type="button" class="secondary" data-close>Cancel</button><button type="submit" class="primary">Save change</button></div>
    </form></dialog>
  <dialog id="share-dialog" aria-labelledby="share-dialog-title"><div class="dialog-head"><div><p class="eyebrow">Frozen route</p><h2 id="share-dialog-title">Client approval link</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div><div class="dialog-body" id="share-content"></div></dialog>
  <dialog id="data-dialog" aria-labelledby="data-dialog-title"><div class="dialog-head"><div><p class="eyebrow">Field archive</p><h2 id="data-dialog-title">Own your data</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div><div class="dialog-body">
    <p>Download a complete JSON backup, restore one on another device, or import a client's decision receipt.</p><div class="button-row"><button type="button" class="secondary" data-action="export-json">Download backup</button><button type="button" class="secondary" data-action="choose-backup">Restore backup</button><button type="button" class="primary" data-action="choose-receipt">Import decision receipt</button></div>
    <input class="visually-hidden" id="backup-file" type="file" accept="application/json,.json" /><input class="visually-hidden" id="receipt-file" type="file" accept="application/json,.json" /><p class="form-error" id="data-error" aria-live="assertive"></p>
  </div></dialog>
  <dialog id="unlock-dialog" aria-labelledby="unlock-dialog-title"><div class="dialog-head"><div><p class="eyebrow">Permanent field kit</p><h2 id="unlock-dialog-title">Unlock unlimited ledgers</h2></div><button class="dialog-close" type="button" data-close aria-label="Close">×</button></div><div class="dialog-body">
    <p>The free field kit includes one active ledger, unlimited change cards, client decisions, backups, CSV and print/PDF export. Pay once to keep unlimited active client ledgers on this device.</p>
    <div class="license-card"><p class="price">$19 one time</p><p>No subscription. Sociobot/Dodo is the merchant of record; refunds are handled there and revoke the license.</p><a class="primary button" href="${checkoutUrl()}">Buy the field kit</a></div>
    <form id="license-form" style="margin-top:22px"><div class="field"><label for="license-token">Have a license? Paste it here</label><input id="license-token" name="token" value="${escapeHtml(storedToken())}" autocomplete="off" spellcheck="false" /></div><p class="form-error" aria-live="assertive"></p><div class="form-actions"><button class="primary" type="submit">Verify and restore</button></div></form>
    <p class="mini-note">Verification contacts Sociobot only when a license is entered, then at most daily. Your client and project data are never included. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
  </div></dialog>`;
}

function renderWorkspace(): void {
  const project = selectedProject();
  if (project && data.selectedProjectId !== project.id) data.selectedProjectId = project.id;
  main.innerHTML = `<div class="workspace">${renderRail(project)}<div class="ledger-main">${project ? renderLedger(project) : renderEmpty()}</div></div>${footer()}${dialogs(project)}`;
  bindWorkspace();
}

function openDialog(id: string): HTMLDialogElement {
  const dialog = document.querySelector<HTMLDialogElement>(`#${id}`)!;
  dialog.showModal();
  return dialog;
}

function fillProjectForm(project?: Project): void {
  const dialog = openDialog("project-dialog");
  const form = dialog.querySelector<HTMLFormElement>("form")!;
  if (!project) return;
  const client = data.clients.find((item) => item.id === project.clientId)!;
  (form.elements.namedItem("projectId") as HTMLInputElement).value = project.id;
  (form.elements.namedItem("clientName") as HTMLInputElement).value = client.name;
  (form.elements.namedItem("clientEmail") as HTMLInputElement).value = client.email;
  (form.elements.namedItem("clientCompany") as HTMLInputElement).value = client.company;
  (form.elements.namedItem("projectTitle") as HTMLInputElement).value = project.title;
  (form.elements.namedItem("baseQuote") as HTMLInputElement).value = String(project.baseQuote);
  (form.elements.namedItem("currency") as HTMLSelectElement).value = project.currency;
  (form.elements.namedItem("baseSummary") as HTMLTextAreaElement).value = project.baseSummary;
  dialog.querySelector("#project-dialog-title")!.textContent = "Edit client ledger";
}

function fillChangeForm(change?: ChangeItem): void {
  const dialog = openDialog("change-dialog");
  if (!change) return;
  const form = dialog.querySelector<HTMLFormElement>("form")!;
  (form.elements.namedItem("changeId") as HTMLInputElement).value = change.id;
  (form.elements.namedItem("title") as HTMLInputElement).value = change.title;
  (form.elements.namedItem("description") as HTMLTextAreaElement).value = change.description;
  (form.elements.namedItem("reason") as HTMLInputElement).value = change.reason;
  (form.elements.namedItem("amount") as HTMLInputElement).value = String(change.amount);
  dialog.querySelector("#change-dialog-title")!.textContent = "Revise the change";
}

async function openShare(changeId: string): Promise<void> {
  const project = selectedProject()!;
  const client = data.clients.find((item) => item.id === project.clientId)!;
  const change = data.changes.find((item) => item.id === changeId)!;
  let snapshot = change.snapshots.findLast((item) => item.revision === change.revision);
  if (!snapshot) {
    const payload = await createApprovalPayload(project, client, change);
    snapshot = { revision: change.revision, hash: payload.hash, issuedAt: payload.issuedAt, payload };
    data = {
      ...data,
      changes: data.changes.map((item) => item.id === change.id ? { ...item, status: "pending", snapshots: [...item.snapshots, snapshot!] } : item),
      updatedAt: new Date().toISOString(),
    };
    await saveData(data);
  }
  const link = `${location.origin}${location.pathname}#approval=${encodeFragment(snapshot.payload)}`;
  const dialog = openDialog("share-dialog");
  dialog.querySelector("#share-content")!.innerHTML = `<p>Send this link to <b>${escapeHtml(client.name)}</b>. It contains only this frozen project summary and change—not the rest of your workspace.</p>
    <div class="share-box"><label class="field-label" for="approval-link">Private fragment link</label><textarea id="approval-link" class="share-link" readonly>${escapeHtml(link)}</textarea><p class="mini-note">URL fragments are not sent to a web server. Long links are expected because the record travels inside the link.</p></div>
    <p><span class="hash">SHA-256 ${snapshot.hash}</span></p><div class="button-row"><button type="button" class="primary" data-action="copy-approval">Copy approval link</button><button type="button" class="secondary" data-action="open-approval">Preview client view</button></div>`;
  dialog.querySelector("[data-action='copy-approval']")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(link);
    showToast("Approval link copied.");
  });
  dialog.querySelector("[data-action='open-approval']")?.addEventListener("click", () => window.open(link, "_blank", "noopener"));
}

async function handleProjectSubmit(form: HTMLFormElement): Promise<void> {
  const values = new FormData(form);
  const projectId = String(values.get("projectId") ?? "");
  const baseQuote = Number(values.get("baseQuote"));
  if (!Number.isFinite(baseQuote) || baseQuote < 0) throw new Error("Enter a valid base quote of zero or more.");
  const now = new Date().toISOString();
  if (projectId) {
    const project = data.projects.find((item) => item.id === projectId)!;
    const next: AppData = {
      ...data,
      clients: data.clients.map((client) => client.id === project.clientId ? { ...client, name: String(values.get("clientName")).trim(), email: String(values.get("clientEmail")).trim(), company: String(values.get("clientCompany")).trim() } : client),
      projects: data.projects.map((item) => item.id === projectId ? { ...item, title: String(values.get("projectTitle")).trim(), baseQuote, currency: String(values.get("currency")), baseSummary: String(values.get("baseSummary")).trim() } : item),
    };
    form.closest("dialog")?.close();
    await persist(next, "Ledger details saved. Existing issued links remain frozen.");
    return;
  }
  const clientId = uid("client");
  const newProjectId = uid("project");
  const next: AppData = {
    ...data,
    clients: [...data.clients, { id: clientId, name: String(values.get("clientName")).trim(), email: String(values.get("clientEmail")).trim(), company: String(values.get("clientCompany")).trim(), createdAt: now }],
    projects: [...data.projects, { id: newProjectId, clientId, title: String(values.get("projectTitle")).trim(), baseQuote, currency: String(values.get("currency")), baseSummary: String(values.get("baseSummary")).trim(), createdAt: now, archived: false }],
    selectedProjectId: newProjectId,
  };
  form.closest("dialog")?.close();
  await persist(next, "Client ledger created on this device.");
}

async function handleChangeSubmit(form: HTMLFormElement): Promise<void> {
  const project = selectedProject();
  if (!project) throw new Error("Create a ledger first.");
  const values = new FormData(form);
  const changeId = String(values.get("changeId") ?? "");
  const amount = Number(values.get("amount"));
  if (!Number.isFinite(amount)) throw new Error("Enter a valid fixed-price delta.");
  const now = new Date().toISOString();
  let changes: ChangeItem[];
  if (changeId) {
    changes = data.changes.map((item) => item.id === changeId ? { ...item, title: String(values.get("title")).trim(), description: String(values.get("description")).trim(), reason: String(values.get("reason")).trim(), amount, revision: item.revision + 1, status: "draft", updatedAt: now } : item);
  } else {
    changes = [...data.changes, { id: uid("change"), projectId: project.id, title: String(values.get("title")).trim(), description: String(values.get("description")).trim(), reason: String(values.get("reason")).trim(), amount, createdAt: now, updatedAt: now, revision: 1, status: "draft", snapshots: [], receipts: [] }];
  }
  form.closest("dialog")?.close();
  await persist({ ...data, changes }, changeId ? "New revision saved. Create a fresh approval link." : "Change plotted as a draft.");
}

async function importFile(file: File, receiptOnly: boolean): Promise<void> {
  const value = JSON.parse(await file.text()) as unknown;
  if (receiptOnly) {
    data = await applyReceipt(data, value as ApprovalReceipt);
    await saveData(data);
    document.querySelector<HTMLDialogElement>("#data-dialog")?.close();
    renderWorkspace();
    showToast("Decision receipt matched and imported.");
  } else {
    if (!confirm("Restore this backup and replace the current browser workspace? Download a backup first if you need it.")) return;
    await persist(parseBackup(value), "Backup restored.");
  }
}

function bindWorkspace(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog")?.close()));
  document.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));
  main.addEventListener("click", async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id ?? "";
    try {
      if (action === "new-project") {
        if (data.projects.some((item) => !item.archived) && !unlocked) openDialog("unlock-dialog"); else fillProjectForm();
      } else if (action === "select-project") {
        await persist({ ...data, selectedProjectId: id });
      } else if (action === "edit-project") fillProjectForm(selectedProject());
      else if (action === "add-change") fillChangeForm();
      else if (action === "edit-change") fillChangeForm(data.changes.find((item) => item.id === id));
      else if (action === "share") await openShare(id);
      else if (action === "mark-done") {
        const change = data.changes.find((item) => item.id === id)!;
        if (change.status !== "approved") showToast("Import an approved decision receipt before marking this work done.");
        else await persist({ ...data, changes: data.changes.map((item) => item.id === id ? { ...item, status: "done", updatedAt: new Date().toISOString() } : item) }, "Work marked done with approval on record.");
      } else if (action === "delete-change") {
        const change = data.changes.find((item) => item.id === id)!;
        if (confirm(`Delete “${change.title}” and its receipt history from this device? This cannot be undone.`)) await persist({ ...data, changes: data.changes.filter((item) => item.id !== id) }, "Change deleted.");
      } else if (action === "filter") { filter = button.dataset.filter as typeof filter; renderWorkspace(); }
      else if (action === "export-csv") {
        const project = selectedProject()!;
        download(`${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-changes.csv`, projectCsv(data, project.id), "text/csv;charset=utf-8");
        showToast("CSV exported.");
      } else if (action === "print") window.print();
      else if (action === "open-data") openDialog("data-dialog");
      else if (action === "open-unlock") openDialog("unlock-dialog");
      else if (action === "export-json") { download(`change-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json"); showToast("Complete backup downloaded."); }
      else if (action === "choose-backup") document.querySelector<HTMLInputElement>("#backup-file")?.click();
      else if (action === "choose-receipt") document.querySelector<HTMLInputElement>("#receipt-file")?.click();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Something went wrong.");
    }
  });

  document.querySelector<HTMLFormElement>("#project-form")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement;
    try { await handleProjectSubmit(form); } catch (error) { form.querySelector(".form-error")!.textContent = error instanceof Error ? error.message : "Could not save this ledger."; }
  });
  document.querySelector<HTMLFormElement>("#change-form")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement;
    try { await handleChangeSubmit(form); } catch (error) { form.querySelector(".form-error")!.textContent = error instanceof Error ? error.message : "Could not save this change."; }
  });
  document.querySelector<HTMLFormElement>("#license-form")?.addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const output = form.querySelector(".form-error")!;
    const token = String(new FormData(form).get("token") ?? "").trim();
    if (!token) { output.textContent = "Paste the license token from your purchase email."; return; }
    storeToken(token); output.textContent = "Checking license…";
    try {
      const result = await verifyLicense(true); unlocked = result.valid;
      if (!result.valid) { output.textContent = `This license is not active (${result.reason.replaceAll("_", " ")}).`; return; }
      form.closest("dialog")?.close(); renderWorkspace(); showToast("Field kit unlocked on this device.");
    } catch { output.textContent = "Could not reach the license service. Check your connection and try again."; }
  });
  document.querySelector<HTMLInputElement>("#backup-file")?.addEventListener("change", async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return;
    try { await importFile(file, false); } catch (error) { document.querySelector("#data-error")!.textContent = error instanceof Error ? error.message : "Could not restore this file."; }
  });
  document.querySelector<HTMLInputElement>("#receipt-file")?.addEventListener("change", async (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]; if (!file) return;
    try { await importFile(file, true); } catch (error) { document.querySelector("#data-error")!.textContent = error instanceof Error ? error.message : "Could not import this receipt."; }
  });
}

function renderApprovalError(message: string): void {
  main.innerHTML = `<div class="client-view"><article class="approval-sheet"><p class="eyebrow">Link check failed</p><h1>We cannot verify this change.</h1><p class="lead">${escapeHtml(message)}</p><p>Ask the freelancer to create and send a fresh approval link. Do not decide from a link that fails its fingerprint check.</p><a class="secondary button" href="/">Open Change Ledger</a></article></div>${footer()}`;
}

async function renderApproval(encoded: string): Promise<void> {
  let payload: ApprovalPayload;
  try {
    payload = decodeFragment<ApprovalPayload>(encoded);
    if (!(await verifyApprovalPayload(payload))) throw new Error("The content no longer matches the fingerprint in this link.");
  } catch (error) { renderApprovalError(error instanceof Error ? error.message : "This approval link is malformed."); return; }
  main.innerHTML = `<div class="client-view"><article class="approval-sheet" aria-labelledby="page-title">
    <p class="eyebrow">Change request · revision ${payload.change.revision}</p><h1 id="page-title">${escapeHtml(payload.change.title)}</h1><p class="lead">${escapeHtml(payload.client.name)}, review this change to <b>${escapeHtml(payload.project.title)}</b> before the added work begins.</p><div class="map-rule" aria-hidden="true"></div>
    <dl class="approval-details"><div><dt>Base quote</dt><dd>${formatMoney(payload.project.baseQuote, payload.project.currency)}</dd></div><div><dt>This change</dt><dd>${formatMoney(payload.change.amount, payload.project.currency)}</dd></div><div><dt>Revised total if approved</dt><dd>${formatMoney(payload.project.baseQuote + payload.change.amount, payload.project.currency)}</dd></div><div><dt>Link issued</dt><dd>${formatDate(payload.issuedAt)}</dd></div></dl>
    <section aria-labelledby="base-heading"><h2 id="base-heading">Original scope</h2><p>${escapeHtml(payload.project.baseSummary)}</p></section><section aria-labelledby="change-heading"><h2 id="change-heading">What changes</h2><p>${escapeHtml(payload.change.description)}</p>${payload.change.reason ? `<p class="reason"><b>Reason:</b> ${escapeHtml(payload.change.reason)}</p>` : ""}</section>
    <p class="mini-note">Content fingerprint<br /><span class="hash">SHA-256 ${payload.hash}</span></p>
    <form id="decision-form"><fieldset style="border:0;padding:0;margin:28px 0 0"><legend class="field-label">Your decision <span aria-hidden="true">*</span></legend><div class="decision-options"><label class="decision-option"><input type="radio" name="decision" value="approved" required /> Approve this change</label><label class="decision-option"><input type="radio" name="decision" value="declined" required /> Decline this change</label></div></fieldset>
      <div class="form-grid"><div class="field full"><label for="decision-name">Your name <span aria-hidden="true">*</span></label><input id="decision-name" name="clientName" required autocomplete="name" /></div><div class="field full"><label for="decision-note">Note (optional)</label><textarea id="decision-note" name="clientNote" maxlength="1000"></textarea></div></div>
      <div class="notice"><b>Important:</b> This creates a workflow receipt, not an electronic signature or legal opinion. Send the receipt back to the freelancer so it enters their private ledger.</div><p class="form-error" aria-live="assertive"></p><button class="primary" type="submit">Create decision receipt</button>
    </form><div id="receipt-result"></div>
  </article></div>${footer()}`;
  document.querySelector<HTMLFormElement>("#decision-form")!.addEventListener("submit", async (event) => {
    event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const values = new FormData(form);
    try {
      const receipt = await createReceipt(payload, String(values.get("decision")) as "approved" | "declined", String(values.get("clientName")), String(values.get("clientNote")));
      const receiptLink = `${location.origin}${location.pathname}#receipt=${encodeFragment(receipt)}`;
      const result = document.querySelector<HTMLElement>("#receipt-result")!;
      result.className = "receipt-result";
      result.innerHTML = `<h2>Decision receipt created</h2><p><b>${receipt.decision === "approved" ? "Approved" : "Declined"}</b> by ${escapeHtml(receipt.clientName)} at ${formatDate(receipt.decidedAt)}.</p><p>Return it using either option below. The freelancer's browser will verify it against the frozen link.</p><div class="button-row"><button type="button" class="primary" id="copy-receipt">Copy return link</button><button type="button" class="secondary" id="download-receipt">Download receipt</button></div><p class="mini-note" style="margin-top:12px"><span class="hash">Receipt SHA-256 ${receipt.receiptHash}</span></p>`;
      document.querySelector("#copy-receipt")?.addEventListener("click", async () => { await navigator.clipboard.writeText(receiptLink); showToast("Return link copied. Send it back to the freelancer."); });
      document.querySelector("#download-receipt")?.addEventListener("click", () => download(`change-ledger-receipt-${payload.change.id}.json`, JSON.stringify(receipt, null, 2), "application/json"));
      form.hidden = true; result.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch { form.querySelector(".form-error")!.textContent = "Could not create the receipt. Check the required fields and try again."; }
  });
}

async function init(): Promise<void> {
  captureLicenseFromUrl();
  const approvalMatch = location.hash.match(/^#approval=(.+)$/);
  if (approvalMatch) { await renderApproval(approvalMatch[1]); return; }
  try {
    data = await loadData();
    const receiptMatch = location.hash.match(/^#receipt=(.+)$/);
    if (receiptMatch) {
      data = await applyReceipt(data, decodeFragment<ApprovalReceipt>(receiptMatch[1]));
      await saveData(data); history.replaceState({}, "", `${location.pathname}${location.search}`); showToast("Returned client decision imported and verified.");
    }
    renderWorkspace();
  } catch (error) {
    main.innerHTML = `<section class="loading-state"><p class="eyebrow">Local storage error</p><h1>Change Ledger could not open.</h1><p>${escapeHtml(error instanceof Error ? error.message : "Your browser blocked its local database.")}</p><p>Allow site storage or leave private browsing mode, then reload. Your data has not been uploaded elsewhere.</p><button class="primary" onclick="location.reload()">Try again</button></section>`;
    return;
  }
  if (storedToken()) verifyLicense().then((result) => {
    unlocked = result.valid;
    licenseMessage = result.valid || result.reason === "missing" ? "" : `License no longer active (${result.reason.replaceAll("_", " ")}). Unlimited ledgers are locked.`;
    renderWorkspace();
  }).catch(() => { /* Offline: preserve cached verdict and do not interrupt free use. */ });
}

window.addEventListener("online", () => { if (data) renderWorkspace(); showToast("Back online."); });
window.addEventListener("offline", () => { if (data) renderWorkspace(); showToast("Offline. Local records remain available."); });
window.addEventListener("hashchange", () => location.reload());

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => { /* App remains usable without installation support. */ });
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "APP_UPDATED") showToast("A new field map is ready.", { label: "Reload", run: () => location.reload() });
  });
}

void init();
