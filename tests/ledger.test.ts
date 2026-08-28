import { describe, expect, it } from "vitest";
import {
  applyReceipt,
  canonicalJson,
  createApprovalPayload,
  createReceipt,
  decodeFragment,
  emptyData,
  encodeFragment,
  projectCsv,
  verifyApprovalPayload,
  verifyReceipt,
} from "../src/ledger";
import type { AppData, ChangeItem, Client, Project } from "../src/types";

const client: Client = { id: "c1", name: "River & Co", company: "River & Co", email: "hello@example.com", createdAt: "2026-08-01T00:00:00.000Z" };
const project: Project = { id: "p1", clientId: "c1", title: "Brand site", currency: "USD", baseQuote: 4000, baseSummary: "Five-page site", createdAt: "2026-08-01T00:00:00.000Z", archived: false };
const change: ChangeItem = { id: "v1", projectId: "p1", title: "Add resources", description: "Add a filtered resource library", reason: "Requested after kickoff", amount: 850, createdAt: "2026-08-02T00:00:00.000Z", updatedAt: "2026-08-02T00:00:00.000Z", revision: 1, status: "draft", snapshots: [], receipts: [] };

describe("evidence fingerprints", () => {
  it("canonicalizes object keys before hashing", () => {
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } })).toBe('{"a":{"b":3,"y":2},"z":1}');
  });

  it("round-trips unicode payloads in URL fragments", () => {
    const value = { title: "Dépliant — ₹", note: "追加範囲" };
    expect(decodeFragment(encodeFragment(value))).toEqual(value);
  });

  it("detects an altered frozen approval payload", async () => {
    const payload = await createApprovalPayload(project, client, change, "2026-08-03T10:00:00.000Z");
    expect(await verifyApprovalPayload(payload)).toBe(true);
    payload.change.amount = 851;
    expect(await verifyApprovalPayload(payload)).toBe(false);
  });

  it("creates and applies only a matching receipt", async () => {
    const payload = await createApprovalPayload(project, client, change, "2026-08-03T10:00:00.000Z");
    const receipt = await createReceipt(payload, "approved", "Avery Client", "Proceed", "2026-08-03T11:00:00.000Z");
    expect(await verifyReceipt(receipt)).toBe(true);
    const source: AppData = { ...emptyData(), clients: [client], projects: [project], changes: [{ ...change, status: "pending", snapshots: [{ revision: 1, hash: payload.hash, issuedAt: payload.issuedAt, payload }] }] };
    const result = await applyReceipt(source, receipt);
    expect(result.changes[0].status).toBe("approved");
    expect(result.changes[0].receipts[0].receiptHash).toBe(receipt.receiptHash);
  });

  it("rejects a receipt for a different revision", async () => {
    const payload = await createApprovalPayload(project, client, change, "2026-08-03T10:00:00.000Z");
    const receipt = await createReceipt(payload, "approved", "Avery Client", "", "2026-08-03T11:00:00.000Z");
    const source: AppData = { ...emptyData(), clients: [client], projects: [project], changes: [{ ...change, revision: 2, status: "draft", snapshots: [{ revision: 1, hash: payload.hash, issuedAt: payload.issuedAt, payload }] }] };
    await expect(applyReceipt(source, receipt)).rejects.toThrow("earlier revision");
  });
});

describe("exports", () => {
  it("quotes CSV and neutralizes spreadsheet formulas", () => {
    const source: AppData = { ...emptyData(), clients: [{ ...client, name: "=HYPERLINK(\"bad\")" }], projects: [project], changes: [change] };
    const csv = projectCsv(source, project.id);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"Brand site"');
  });
});
