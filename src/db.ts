import { emptyData } from "./ledger";
import type { AppData } from "./types";

const DB_NAME = "change-ledger";
const STORE = "local-data";
let namespace: "real" | "demo" = "real";

function workspaceKey(): string {
  return namespace === "demo" ? "demo:workspace" : "workspace";
}

/**
 * Demo data deliberately lives under a different key from a person's ledger.
 * The app selects this before it reads or writes any workspace data.
 */
export function setStorageNamespace(next: "real" | "demo"): void {
  namespace = next;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local storage."));
  });
}

export async function loadData(): Promise<AppData> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE);
    const request = transaction.objectStore(STORE).get(workspaceKey());
    request.onsuccess = () => resolve((request.result as AppData | undefined) ?? emptyData());
    request.onerror = () => reject(request.error ?? new Error("Could not read local data."));
    transaction.oncomplete = () => db.close();
  });
}

export async function saveData(data: AppData): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(data, workspaceKey());
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save local data."));
  });
  db.close();
}

export async function clearData(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).delete(workspaceKey());
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not clear local data."));
  });
  db.close();
}
