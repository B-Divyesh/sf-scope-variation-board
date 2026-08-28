export type ChangeStatus = "draft" | "pending" | "approved" | "declined" | "done";
export type Decision = "approved" | "declined";

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  currency: string;
  baseQuote: number;
  baseSummary: string;
  createdAt: string;
  archived: boolean;
}

export interface ChangeSnapshot {
  revision: number;
  hash: string;
  issuedAt: string;
  payload: ApprovalPayload;
}

export interface ApprovalReceipt {
  version: 1;
  projectId: string;
  changeId: string;
  revision: number;
  payloadHash: string;
  decision: Decision;
  clientName: string;
  clientNote: string;
  decidedAt: string;
  receiptHash: string;
}

export interface ChangeItem {
  id: string;
  projectId: string;
  title: string;
  description: string;
  reason: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  revision: number;
  status: ChangeStatus;
  snapshots: ChangeSnapshot[];
  receipts: ApprovalReceipt[];
}

export interface AppData {
  version: 1;
  clients: Client[];
  projects: Project[];
  changes: ChangeItem[];
  selectedProjectId: string | null;
  updatedAt: string;
}

export interface ApprovalPayloadBody {
  version: 1;
  project: {
    id: string;
    title: string;
    currency: string;
    baseQuote: number;
    baseSummary: string;
  };
  client: { name: string; company: string };
  change: {
    id: string;
    title: string;
    description: string;
    reason: string;
    amount: number;
    revision: number;
  };
  issuedAt: string;
}

export interface ApprovalPayload extends ApprovalPayloadBody {
  hash: string;
}
