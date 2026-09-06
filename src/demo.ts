import { createApprovalPayload, createReceipt, emptyData } from "./ledger";
import type { AppData, ChangeItem, Client, Project } from "./types";

const seededAt = "2026-08-28T09:30:00.000Z";

/** A realistic, fixed sample for the isolated demo workspace. */
export async function createDemoData(): Promise<AppData> {
  const client: Client = {
    id: "demo:client:mira-patel",
    name: "Mira Patel",
    company: "Mira Patel Ceramics",
    email: "mira@example.test",
    createdAt: seededAt,
  };
  const project: Project = {
    id: "demo:project:autumn-site",
    clientId: client.id,
    title: "Autumn collection website",
    currency: "USD",
    baseQuote: 4800,
    baseSummary: "Design and build a six-page website with a collection gallery and contact form.",
    createdAt: seededAt,
    archived: false,
  };
  const approved: ChangeItem = {
    id: "demo:change:wholesale-portal",
    projectId: project.id,
    title: "Add a wholesale enquiry page",
    description: "Add a wholesale page with a stockist enquiry form and confirmation email copy.",
    reason: "Requested after the product photography review",
    amount: 420,
    createdAt: seededAt,
    updatedAt: "2026-08-29T14:10:00.000Z",
    revision: 1,
    status: "approved",
    snapshots: [],
    receipts: [],
  };
  const pending: ChangeItem = {
    id: "demo:change:studio-film",
    projectId: project.id,
    title: "Add a studio process video",
    description: "Edit and add a 45-second studio process video to the home page with captions supplied by the client.",
    reason: "New launch material arrived after the base quote",
    amount: 650,
    createdAt: "2026-08-30T10:20:00.000Z",
    updatedAt: "2026-08-30T10:20:00.000Z",
    revision: 1,
    status: "pending",
    snapshots: [],
    receipts: [],
  };
  const declined: ChangeItem = {
    id: "demo:change:stock-sync",
    projectId: project.id,
    title: "Connect live stock updates",
    description: "Connect the website catalogue to the studio inventory system for live stock updates.",
    reason: "Raised during launch planning",
    amount: 980,
    createdAt: "2026-08-31T11:40:00.000Z",
    updatedAt: "2026-08-31T16:05:00.000Z",
    revision: 1,
    status: "declined",
    snapshots: [],
    receipts: [],
  };

  const approvedPayload = await createApprovalPayload(project, client, approved, "2026-08-28T10:00:00.000Z");
  const approvedReceipt = await createReceipt(approvedPayload, "approved", "Mira Patel", "Please include this before launch.", "2026-08-29T14:10:00.000Z");
  approved.snapshots = [{ revision: 1, hash: approvedPayload.hash, issuedAt: approvedPayload.issuedAt, payload: approvedPayload }];
  approved.receipts = [approvedReceipt];

  const pendingPayload = await createApprovalPayload(project, client, pending, "2026-08-30T10:25:00.000Z");
  pending.snapshots = [{ revision: 1, hash: pendingPayload.hash, issuedAt: pendingPayload.issuedAt, payload: pendingPayload }];

  const declinedPayload = await createApprovalPayload(project, client, declined, "2026-08-31T12:00:00.000Z");
  const declinedReceipt = await createReceipt(declinedPayload, "declined", "Mira Patel", "We will handle stock updates after launch.", "2026-08-31T16:05:00.000Z");
  declined.snapshots = [{ revision: 1, hash: declinedPayload.hash, issuedAt: declinedPayload.issuedAt, payload: declinedPayload }];
  declined.receipts = [declinedReceipt];

  return {
    ...emptyData(),
    clients: [client],
    projects: [project],
    changes: [approved, pending, declined],
    selectedProjectId: project.id,
    updatedAt: seededAt,
  };
}
