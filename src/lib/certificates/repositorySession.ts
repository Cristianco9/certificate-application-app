"use client";

/**
 * sessionStorage bridge between the repository table and the certificate
 * detail page.
 *
 * Why sessionStorage (same rationale as `searchSession.ts` and
 * `previewSession.ts`):
 *   - Keeps the detail URL clean (`/repository/certificate`, no id) —
 *     matching the requirement that no identifier travels in the URL.
 *   - Survives a refresh in the same tab without losing the selection.
 *   - Dies with the tab, so opening a second tab starts from the
 *     repository list rather than re-opening a stale detail view.
 *   - Nothing sensitive is persisted — just the numeric certificate id.
 *
 * Every accessor is wrapped in try/catch: sessionStorage throws in
 * Safari private mode and when the quota is exceeded. On failure we
 * fall back to "no selection" — the user is bounced back to the
 * repository with a clear state, nothing crashes.
 */

const KEY_SELECTED_CERTIFICATE_ID = "repository:selectedCertificateId";

/**
 * Persists the certificate id the operator clicked. Called from the
 * repository page right before navigating to `/repository/certificate`.
 */
export function setSelectedCertificateId(id: number): void {
  try {
    sessionStorage.setItem(KEY_SELECTED_CERTIFICATE_ID, String(id));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

/**
 * Returns the persisted certificate id, or `null` when:
 *   - the user never clicked a row (direct URL entry), or
 *   - sessionStorage is unavailable / corrupt.
 */
export function getSelectedCertificateId(): number | null {
  try {
    const raw = sessionStorage.getItem(KEY_SELECTED_CERTIFICATE_ID);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Clears the stored id. Called when the user navigates back to the
 * repository so a stale selection is never reused.
 */
export function clearSelectedCertificateId(): void {
  try {
    sessionStorage.removeItem(KEY_SELECTED_CERTIFICATE_ID);
  } catch {
    /* non-fatal */
  }
}
