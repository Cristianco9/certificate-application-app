"use client";

import type {
  CertificateSearchFilters,
  CertificateSearchRow,
} from "@/types/certificate-search";

/**
 * sessionStorage bridge between the certificate-search page and the
 * student-profile page.
 *
 * Why sessionStorage instead of a URL param or a route segment:
 *   - Keeps the profile URL clean (`/certificates/student`, no id).
 *   - Survives a refresh (same tab) without needing to re-run the search.
 *   - Dies with the tab, so opening a second tab starts fresh.
 *   - Nothing sensitive is persisted beyond the tab's lifetime.
 *
 * Every accessor is wrapped in try/catch: sessionStorage throws in
 * Safari private mode and when the quota is exceeded. On failure we
 * fall back to "no session" — the user just loses the state, nothing
 * breaks.
 */

const KEYS = {
  filters: "certificates:filters",
  rows: "certificates:rows",
  selectedStudentId: "certificates:selectedStudentId",
} as const;

export type RestoredSearchSession = {
  filters: CertificateSearchFilters;
  rows: CertificateSearchRow[];
};

export function saveSearchSession(
  filters: CertificateSearchFilters,
  rows: CertificateSearchRow[]
): void {
  try {
    sessionStorage.setItem(KEYS.filters, JSON.stringify(filters));
    sessionStorage.setItem(KEYS.rows, JSON.stringify(rows));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function loadSearchSession(): RestoredSearchSession | null {
  try {
    const filtersRaw = sessionStorage.getItem(KEYS.filters);
    const rowsRaw = sessionStorage.getItem(KEYS.rows);
    if (!filtersRaw || !rowsRaw) return null;

    return {
      filters: JSON.parse(filtersRaw) as CertificateSearchFilters,
      rows: JSON.parse(rowsRaw) as CertificateSearchRow[],
    };
  } catch {
    return null;
  }
}

export function clearSearchSession(): void {
  try {
    sessionStorage.removeItem(KEYS.filters);
    sessionStorage.removeItem(KEYS.rows);
    sessionStorage.removeItem(KEYS.selectedStudentId);
  } catch {
    /* non-fatal */
  }
}

export function setSelectedStudentId(id: number): void {
  try {
    sessionStorage.setItem(KEYS.selectedStudentId, String(id));
  } catch {
    /* non-fatal */
  }
}

export function getSelectedStudentId(): number | null {
  try {
    const raw = sessionStorage.getItem(KEYS.selectedStudentId);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
