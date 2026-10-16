/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DATETIME — Colombian formatting helpers
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The Sequelize connection is configured with `timezone: '-05:00'`
 * (see `libraries/DBConnection.js`), so every TIMESTAMP column stores
 * wall-clock time for Colombia. When those rows are serialized to JSON
 * they arrive as UTC ISO strings; parsing them and re-formatting with
 * `America/Bogota` yields the exact clock time the institution saw when
 * the record was written.
 *
 * These helpers are intentionally tolerant: any unparseable input
 * degrades to an em dash rather than throwing inside a render.
 */

const BOGOTA_TZ = "America/Bogota";

/** "13 de octubre de 2026" */
export function formatColombianDate(
  iso: string | null | undefined
): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: BOGOTA_TZ,
    });
  } catch {
    return "—";
  }
}

/** "10:35 a. m." */
export function formatColombianTime(
  iso: string | null | undefined
): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: BOGOTA_TZ,
    });
  } catch {
    return "—";
  }
}

/** "13 de octubre de 2026 · 10:35 a. m." */
export function formatColombianDateTime(
  iso: string | null | undefined
): string {
  const date = formatColombianDate(iso);
  const time = formatColombianTime(iso);
  if (date === "—" || time === "—") return "—";
  return `${date} · ${time}`;
}

/**
 * DATEONLY columns (`fecha_emision_certificado`, `fecha_matricula`, …)
 * come back as bare "YYYY-MM-DD" strings, which `new Date(...)` would
 * interpret as UTC midnight and thus shift one day back in Bogotá.
 * Splitting the string and rebuilding the parts avoids that trap.
 */
export function formatDateOnly(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
