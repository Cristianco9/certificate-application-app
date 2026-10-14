import type { AcademicHistoryRow } from "@/app/certificates/actions";
import type { CertificateSearchStudent } from "@/types/certificate-search";

/** A single enrollment, ready to render as one page of the certificate. */
export type EnrollmentBlock = {
  enrollmentId: number;
  year: number | null;
  gradeName: string | null;
  groupName: string | null;
  subjects: AcademicHistoryRow[];
};

/**
 * Groups the flat score rows returned by `POST /students/get-academic-history`
 * into one block per enrollment, preserving the order the backend sent them
 * (already oldest year first).
 */
export function groupHistoryByEnrollment(
  rows: AcademicHistoryRow[],
  allowedEnrollmentIds?: number[]
): EnrollmentBlock[] {
  const allowed = allowedEnrollmentIds
    ? new Set(allowedEnrollmentIds)
    : null;

  const map = new Map<number, EnrollmentBlock>();

  for (const row of rows) {
    if (row.enrollmentId === null) continue;
    if (allowed && !allowed.has(row.enrollmentId)) continue;

    let block = map.get(row.enrollmentId);
    if (!block) {
      block = {
        enrollmentId: row.enrollmentId,
        year: row.year,
        gradeName: row.grade?.name ?? null,
        groupName: row.group?.name ?? null,
        subjects: [],
      };
      map.set(row.enrollmentId, block);
    }
    block.subjects.push(row);
  }

  return Array.from(map.values()).sort(
    (a, b) => (a.year ?? 0) - (b.year ?? 0)
  );
}

/** Full name, uppercased, for the certificate body. */
export function getFullNameUpper(student: CertificateSearchStudent): string {
  return [
    student.firstName,
    student.middleName,
    student.firstLastName,
    student.secondLastName,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

/**
 * Formats the list of academic years for the certificate's opening sentence.
 *
 *   [2014]             → "2014"
 *   [2014, 2016]       → "2014 y 2016"
 *   [2014, 2015, 2016] → "2014, 2015 y 2016"
 *   []                 → "—"
 */
export function formatYearsRange(years: Array<number | null>): string {
  const clean = years.filter((y): y is number => typeof y === "number");
  if (clean.length === 0) return "—";
  if (clean.length === 1) return String(clean[0]);

  const head = clean.slice(0, -1).join(", ");
  const tail = clean[clean.length - 1];
  return `${head} y ${tail}`;
}

/**
 * Formats the list of grade names for the certificate's opening sentence.
 *
 *   ["Quinto"]                 → "Quinto"
 *   ["Quinto", "Sexto"]        → "Quinto y Sexto"
 *   ["Quinto", "Sexto", "Once"] → "Quinto, Sexto y Once"
 */
export function formatGradesRange(names: Array<string | null>): string {
  const clean = names.filter((n): n is string => typeof n === "string");
  if (clean.length === 0) return "—";
  if (clean.length === 1) return clean[0];

  const head = clean.slice(0, -1).join(", ");
  const tail = clean[clean.length - 1];
  return `${head} y ${tail}`;
}

/**
 * Long-form Spanish date for the certificate footer, computed in the
 * institution's timezone (America/Bogota) so a certificate issued on
 * the 31st at 8 pm in Cali does not read as the 1st of the next month.
 */
export function formatIssueDate(now: Date = new Date()): string {
  return now.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Bogota",
  });
}

/**
 * Detects whether the certificate belongs to the OLD pre-2000 Colombian
 * scoring system (1–10, pass ≥ 6.0) rather than the modern one (1–5,
 * pass ≥ 3.0) or the alphabetic scale.
 *
 * Rationale:
 *   The historical certificates issued before Decree 1290 (2009) were
 *   authorized under different legal instruments — "Resolución No. 71
 *   del 17 de Enero de 1977" for the establishment and "Resolución 2729
 *   de 1974" for the curriculum's hourly intensity. The certificate
 *   template must cite the correct one so the legal text matches the
 *   scores actually shown on the page.
 *
 * Heuristic:
 *   A numeric score > 5 can only exist on the 1–10 scale — the 1–5
 *   system never exceeds 5.0. Alphabetic scores are always modern.
 *
 * The function returns `false` for:
 *   - empty enrollment lists (safe default: modern text),
 *   - exclusively alphabetic scores,
 *   - exclusively 1–5 numeric scores.
 *
 * It returns `true` as soon as it encounters any single numeric score
 * greater than 5. Mixed-scale enrollments (rare, but possible if the
 * dataset spans the transition) are treated as old — the more
 * restrictive legal instrument wins.
 */
export function isOldScale(enrollments: EnrollmentBlock[]): boolean {
  for (const enrollment of enrollments) {
    for (const subject of enrollment.subjects) {
      if (subject.scoreType !== "NUMERICA") continue;

      const numeric = parseFloat(subject.originalScore);
      if (!Number.isNaN(numeric) && numeric > 5) {
        return true;
      }
    }
  }
  return false;
}
