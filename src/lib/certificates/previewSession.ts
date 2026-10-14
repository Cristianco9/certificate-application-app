"use client";

/**
 * sessionStorage bridge between the enrollment-selection page and the
 * certificate-preview page.
 *
 * Why sessionStorage (same rationale as `searchSession.ts`):
 *   - Keeps the preview URL clean (`/certificates/preview`, no query).
 *   - Survives a refresh in the same tab without re-running the selection.
 *   - Dies with the tab, so opening a second tab starts fresh.
 *   - Stores only numeric enrollment ids, nothing sensitive.
 *
 * Every accessor is wrapped in try/catch: sessionStorage throws in Safari
 * private mode and when the quota is exceeded. On failure we fall back to
 * "no selection" — the user just loses the state, nothing breaks.
 */

const KEY_SELECTED_ENROLLMENTS = "certificates:selectedEnrollments";

/**
 * Persists the enrollment ids the user chose on the generation page.
 *
 * Empty arrays are stored explicitly (not skipped): an empty selection
 * is a valid, meaningful state that the preview page must be able to
 * distinguish from "never visited the generation page".
 */
export function saveSelectedEnrollments(enrollmentIds: number[]): void {
  try {
    sessionStorage.setItem(
      KEY_SELECTED_ENROLLMENTS,
      JSON.stringify(enrollmentIds)
    );
  } catch {
    /* quota / private mode — non-fatal */
  }
}

/**
 * Returns the persisted enrollment ids, or `null` when:
 *   - the user never went through the enrollment-selection page, or
 *   - sessionStorage is unavailable / corrupt.
 *
 * An empty array (`[]`) is returned as-is — it means "the user reached
 * the selection page but deselected every enrollment", which is
 * different from "no selection ever made".
 */
export function getSelectedEnrollments(): number[] | null {
  try {
    const raw = sessionStorage.getItem(KEY_SELECTED_ENROLLMENTS);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;

    // Defensive: drop anything that isn't a positive integer id.
    return parsed.filter(
      (id): id is number => Number.isInteger(id) && id > 0
    );
  } catch {
    return null;
  }
}

/**
 * Clears the stored selection. Called when the user cancels or leaves
 * the preview flow so a stale selection is never reused.
 */
export function clearSelectedEnrollments(): void {
  try {
    sessionStorage.removeItem(KEY_SELECTED_ENROLLMENTS);
  } catch {
    /* non-fatal */
  }
}
