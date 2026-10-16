export type CertificateRepositoryStudent = {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  documentNumber: string | null;
};

export type CertificateRepositoryGroup = {
  id: number;
  name: string;
  year: number | null;
  shift: string | null;
  grade: { id: number; name: string } | null;
};

export type CertificateRepositoryEnrollment = {
  id: number;
  enrollmentDate: string | null;
  student: CertificateRepositoryStudent | null;
  group: CertificateRepositoryGroup | null;
};

export type CertificateRepositoryRecipient = {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondLastName: string | null;
  documentNumber: string;
};

export type CertificateRepositoryRow = {
  id: number;
  actNumber: string;
  issueDate: string;
  status: 'EMITIDO' | 'ANULADO' | 'REIMPRESO';
  issuer: { id: number; firstName: string; lastName: string } | null;
  institution: { id: number; name: string } | null;
  recipient: CertificateRepositoryRecipient | null;
  enrollments: CertificateRepositoryEnrollment[];
};

export type CertificateRepositoryFilters = {
  actNumber: string;
  firstName: string;
  secondName: string;
  firstLastName: string;
  secondLastName: string;
  documentNumber: string;
  documentTypeId: string | null;
  birthDate: string;
  year: string;
  gradeId: string | null;
  group: string | null;
  jornada: 'Diurna' | 'Nocturna' | null;
  issuerId: string | null;
  recipientName: string;
};

export const EMPTY_REPOSITORY_FILTERS: CertificateRepositoryFilters = {
  actNumber: '',
  firstName: '',
  secondName: '',
  firstLastName: '',
  secondLastName: '',
  documentNumber: '',
  documentTypeId: null,
  birthDate: '',
  year: '',
  gradeId: null,
  group: null,
  jornada: null,
  issuerId: null,
  recipientName: '',
};

export const REPOSITORY_PAGE_SIZE = 20;

/**
 * Strips every empty / null filter so the request payload carries only
 * meaningful constraints. Mirrors `toSearchRequest` in
 * `@/types/certificate-search`.
 */
export function toRepositoryRequestFilters(
  filters: CertificateRepositoryFilters
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    out[key] = String(value);
  }
  return out;
}

/**
 * Picks the first enrollment from a certificate's enrollment list and
 * flattens the fields the table needs (student name, year, grade/group).
 *
 * A certificate's enrollments all belong to the same student in practice
 * (see the `certificado_matricula` bridge — a single act number covers
 * one student's trajectory). When that invariant does not hold, showing
 * the first enrollment is the least surprising behaviour: the row still
 * renders, and the repository is a browsing view, not a data-integrity
 * check.
 */
export function pickPrimaryEnrollment(
  certificate: CertificateRepositoryRow
): CertificateRepositoryEnrollment | null {
  return certificate.enrollments[0] ?? null;
}

/** Full legal name in "first middle firstLast secondLast" order. */
export function formatStudentName(
  student: CertificateRepositoryStudent | null
): string {
  if (!student) return '—';
  return [
    student.firstName,
    student.middleName,
    student.firstLastName,
    student.secondLastName,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Número de matrículas (enrollments) cubiertas por el certificado.
 *
 * Un certificado cubre UNA o MUCHAS matrículas a través de la tabla
 * puente `certificado_matricula`; este número es también el número de
 * bloques de boletín que aparecen en el PDF.
 */
export function countEnrollments(
  certificate: CertificateRepositoryRow
): number {
  return certificate.enrollments.length;
}

/**
 * Número de GRADOS DISTINTOS representados entre las matrículas del
 * certificado.
 *
 * Dos matrículas del mismo grado en años distintos (p.ej. "Séptimo" en
 * 2022 y "Séptimo" repetido en 2023) cuentan como UN solo grado — que
 * es exactamente lo que el operador entiende por "cuántos grados cubre
 * este certificado".
 *
 * Matrículas sin grado (dato roto — la FK `gradeId` es nullable) se
 * ignoran.
 */
export function countDistinctGrades(
  certificate: CertificateRepositoryRow
): number {
  const ids = new Set<number>();
  for (const enrollment of certificate.enrollments) {
    const id = enrollment.group?.grade?.id;
    if (typeof id === "number") ids.add(id);
  }
  return ids.size;
}

/**
 * Nombres de los grados distintos, en el orden en que aparecen por
 * primera vez en la lista de matrículas. Se usa como tooltip del
 * indicador de cobertura, para que el operador sepa QUÉ grados están
 * involucrados sin abrir el certificado.
 */
export function collectDistinctGradeNames(
  certificate: CertificateRepositoryRow
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const enrollment of certificate.enrollments) {
    const name = enrollment.group?.grade?.name;
    if (typeof name === "string" && name.length > 0 && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

export function formatRecipientName(
  recipient: CertificateRepositoryRecipient | null
): string {
  if (!recipient) return '—';
  return [
    recipient.firstName,
    recipient.middleName,
    recipient.lastName,
    recipient.secondLastName,
  ]
    .filter(Boolean)
    .join(' ');
}

export function formatIssuerName(
  issuer: { firstName: string; lastName: string } | null
): string {
  if (!issuer) return '—';
  return `${issuer.firstName} ${issuer.lastName}`.trim();
}

export function formatGradeGroup(
  enrollment: CertificateRepositoryEnrollment | null
): string {
  if (!enrollment?.group) return '—';
  const grade = enrollment.group.grade?.name;
  const group = enrollment.group.name;
  if (grade && group) return `${grade} / ${group}`;
  return grade ?? group ?? '—';
}
