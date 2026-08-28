export const PRODUCT_SLUG = "scope-variation-board";
const TOKEN_KEY = `sb_license:${PRODUCT_SLUG}`;
const CACHE_KEY = `${TOKEN_KEY}:verdict`;
const DAY = 86_400_000;
const BILLING_BASE = (import.meta.env.VITE_BILLING_BASE as string | undefined) ?? "https://api.sociobot.in";

interface Verdict {
  valid: boolean;
  checkedAt: number;
  reason: string;
}

export function checkoutUrl(): string {
  return `${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/checkout`;
}

export function captureLicenseFromUrl(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get("license");
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  url.searchParams.delete("license");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function storedToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function cachedUnlock(): boolean {
  try {
    const verdict = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as Verdict | null;
    return Boolean(verdict?.valid);
  } catch {
    return false;
  }
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
}

export async function verifyLicense(force = false): Promise<{ valid: boolean; reason: string }> {
  const token = storedToken();
  if (!token) return { valid: false, reason: "missing" };
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as Verdict | null;
    if (!force && cached && Date.now() - cached.checkedAt < DAY) return cached;
  } catch {
    // Ignore an invalid cache and verify normally.
  }
  const response = await fetch(
    `${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error("The license service is unavailable.");
  const result = (await response.json()) as { valid: boolean; reason: string };
  const verdict: Verdict = { valid: Boolean(result.valid), reason: result.reason, checkedAt: Date.now() };
  localStorage.setItem(CACHE_KEY, JSON.stringify(verdict));
  return verdict;
}
