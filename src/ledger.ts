import type {
  AppData,
  ApprovalPayload,
  ApprovalPayloadBody,
  ApprovalReceipt,
  ChangeItem,
  Client,
  Decision,
  Project,
} from "./types";

export const emptyData = (): AppData => ({
  version: 1,
  clients: [],
  projects: [],
  changes: [],
  selectedProjectId: null,
  updatedAt: new Date().toISOString(),
});

export function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, ordered(item)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(ordered(value));
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function encodeFragment(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeFragment<T>(encoded: string): T {
  const normal = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normal.padEnd(Math.ceil(normal.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export async function createApprovalPayload(
  project: Project,
  client: Client,
  change: ChangeItem,
  issuedAt = new Date().toISOString(),
): Promise<ApprovalPayload> {
  const body: ApprovalPayloadBody = {
    version: 1,
    project: {
      id: project.id,
      title: project.title,
      currency: project.currency,
      baseQuote: project.baseQuote,
      baseSummary: project.baseSummary,
    },
    client: { name: client.name, company: client.company },
    change: {
      id: change.id,
      title: change.title,
      description: change.description,
      reason: change.reason,
      amount: change.amount,
      revision: change.revision,
    },
    issuedAt,
  };
  return { ...body, hash: await sha256(body) };
}

export async function verifyApprovalPayload(payload: ApprovalPayload): Promise<boolean> {
  const { hash, ...body } = payload;
  return hash === (await sha256(body));
}

export async function createReceipt(
  payload: ApprovalPayload,
  decision: Decision,
  clientName: string,
  clientNote: string,
  decidedAt = new Date().toISOString(),
): Promise<ApprovalReceipt> {
  const body = {
    version: 1 as const,
    projectId: payload.project.id,
    changeId: payload.change.id,
    revision: payload.change.revision,
    payloadHash: payload.hash,
    decision,
    clientName: clientName.trim(),
    clientNote: clientNote.trim(),
    decidedAt,
  };
  return { ...body, receiptHash: await sha256(body) };
}

export async function verifyReceipt(receipt: ApprovalReceipt): Promise<boolean> {
  const { receiptHash, ...body } = receipt;
  return receiptHash === (await sha256(body));
}

export async function applyReceipt(data: AppData, receipt: ApprovalReceipt): Promise<AppData> {
  if (!(await verifyReceipt(receipt))) throw new Error("The receipt fingerprint does not match its contents.");
  const change = data.changes.find((item) => item.id === receipt.changeId && item.projectId === receipt.projectId);
  if (!change) throw new Error("This receipt does not match a change in this browser.");
  if (change.revision !== receipt.revision) throw new Error("This receipt is for an earlier revision of the change.");
  const snapshot = change.snapshots.find(
    (item) => item.revision === receipt.revision && item.hash === receipt.payloadHash,
  );
  if (!snapshot) throw new Error("The receipt does not match a link issued from this ledger.");
  if (change.receipts.some((item) => item.receiptHash === receipt.receiptHash)) return data;
  return {
    ...data,
    changes: data.changes.map((item) =>
      item.id === change.id
        ? {
            ...item,
            status: receipt.decision,
            receipts: [...item.receipts, receipt],
            updatedAt: receipt.decidedAt,
          }
        : item,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function safeCsvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function projectCsv(data: AppData, projectId: string): string {
  const project = data.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Select a ledger before exporting CSV.");
  const client = data.clients.find((item) => item.id === project.clientId);
  const headings = ["Project", "Client", "Revision", "Change", "Reason", "Delta", "Currency", "Status", "Updated", "Receipt hash"];
  const rows = data.changes
    .filter((item) => item.projectId === projectId)
    .map((item) => [
      project.title,
      client?.name ?? "",
      item.revision,
      item.title,
      item.reason,
      item.amount,
      project.currency,
      item.status,
      item.updatedAt,
      item.receipts.at(-1)?.receiptHash ?? "",
    ]);
  return [headings, ...rows].map((row) => row.map(safeCsvCell).join(",")).join("\r\n");
}

export function parseBackup(value: unknown): AppData {
  if (!value || typeof value !== "object") throw new Error("This is not a Change Ledger backup.");
  const data = value as Partial<AppData>;
  if (data.version !== 1 || !Array.isArray(data.clients) || !Array.isArray(data.projects) || !Array.isArray(data.changes)) {
    throw new Error("This backup format is not supported.");
  }
  return { ...data, updatedAt: new Date().toISOString() } as AppData;
}
