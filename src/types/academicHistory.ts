/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ACADEMIC HISTORY — Grade, Institution, Group, Subject, Enrollment & Score
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mirrors:
 *   - `src/db/models/grade.js`        (grado)
 *   - `src/db/models/institution.js`  (institucion)
 *   - `src/db/models/group.js`        (grupo)
 *   - `src/db/models/subject.js`      (asignatura)
 *   - `src/db/models/enrollment.js`   (matricula)
 *   - `src/db/models/score.js`        (calificacion)
 *   - `src/services/enrollmentServices.js`
 *   - `src/services/scoreServices.js`
 *   - `src/services/groupServices.js`
 */

import type { AuthenticatedApiResponse, CatalogReference } from './api';
import type { StudentReference } from './student';

// ── Enumerated values ───────────────────────────────────────────────────────

/** Grade names from the `grado` ENUM, ordered by curricular sequence. */
export type GradeName =
  | 'Primero'
  | 'Segundo'
  | 'Tercero'
  | 'Cuarto'
  | 'Quinto'
  | 'Sexto'
  | 'Séptimo'
  | 'Octavo'
  | 'Noveno'
  | 'Décimo'
  | 'Undécimo';

/** Group shift ENUM. */
export type Shift = 'DIURNA' | 'NOCTURNA';

/** Group status ENUM. */
export type GroupStatus = 'ACTIVO' | 'INACTIVO';

/** Score type ENUM. */
export type ScoreType = 'NUMERICA' | 'ALFABETICA';

/** Alphabetic score values accepted by the backend when `scoreType` is `ALFABETICA`. */
export type AlphabeticScoreValue =
  | 'Deficiente'
  | 'Insuficiente'
  | 'Aceptable'
  | 'Sobresaliente'
  | 'Excelente';

// ── Catalog entities ────────────────────────────────────────────────────────

export type Grade = {
  id: number;
  name: GradeName;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Institution = {
  id: number;
  name: string;
  /** DANE institutional code (assigned by the Ministry of Education). */
  institutionalCode: string;
  address: string;
  email: string;
  /** NIT with check digit, e.g. `900123456-7`. */
  nitId: string;
  municipality: CatalogReference | null;
  createdAt: string;
  updatedAt: string;
};

export type Subject = {
  id: number;
  name: string;
  description: string;
  /** Weekly hourly intensity (1–9). */
  hourlyIntensity: number;
  createdAt: string;
  updatedAt: string;
};

export type Group = {
  id: number;
  name: string;
  year: number;
  shift: Shift;
  status: GroupStatus;
  /** Embedded `{ id, name }` reference to `grado` (nullable). */
  grade: CatalogReference | null;
  /** Embedded `{ id, name }` reference to `institucion` (nullable). */
  institution: CatalogReference | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Subset of Group fields returned inside an Enrollment record.
 * Mirrors `EnrollmentServices.GROUP_INCLUDE.attributes`.
 */
export type GroupReference = Pick<Group, 'id' | 'name' | 'year'>;

// ── Enrollment entity ───────────────────────────────────────────────────────

/**
 * Full Enrollment record as returned by `EnrollmentServices`.
 *
 * `student` and `group` are embedded as nested objects, not raw FK ints.
 */
export type Enrollment = {
  id: number;
  /** DATEONLY — serialized as `YYYY-MM-DD`. */
  enrollmentDate: string;
  student: StudentReference | null;
  group: GroupReference | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Subset of Enrollment fields returned inside a Score record.
 * Mirrors `ScoreServices.ENROLLMENT_INCLUDE.attributes`.
 */
export type EnrollmentReference = Pick<Enrollment, 'id' | 'enrollmentDate'>;

// ── Score entity ────────────────────────────────────────────────────────────

/**
 * Full Score record as returned by `ScoreServices`.
 *
 * `originalScore` and `remedialScore` are stored as strings regardless of
 * `scoreType` — the original value is intentionally preserved verbatim.
 */
export type Score = {
  id: number;
  originalScore: string;
  scoreType: ScoreType;
  remedialScore: string;
  subject: CatalogReference | null;
  enrollment: EnrollmentReference | null;
  createdAt: string;
  updatedAt: string;
};

// ── Request payloads ────────────────────────────────────────────────────────

export type CreateEnrollmentRequest = {
  studentId: string;
  groupId: string;
  /** DATEONLY — send as `YYYY-MM-DD`. */
  enrollmentDate: string;
};

export type UpdateEnrollmentRequest = {
  id: string;
  studentId?: string;
  groupId?: string;
  enrollmentDate?: string;
};

export type ListEnrollmentsByStudentRequest = {
  studentId: string;
};

export type ListEnrollmentsByGroupRequest = {
  groupId: string;
};

export type GetEnrollmentByStudentAndGroupRequest = {
  studentId: string;
  groupId: string;
};

export type GetEnrollmentByIdRequest = {
  id: string;
};

export type DeleteEnrollmentRequest = {
  id: string;
};

export type CreateScoreRequest = {
  originalScore: string;
  scoreType: ScoreType;
  subjectId: string;
  remedialScore: string;
  enrollmentId: string;
};

export type UpdateScoreRequest = {
  id: string;
  originalScore?: string;
  scoreType?: ScoreType;
  subjectId?: string;
  remedialScore?: string;
  enrollmentId?: string;
};

export type ListScoresBySubjectRequest = {
  subjectId: string;
};

export type ListScoresByEnrollmentRequest = {
  enrollmentId: string;
};

export type GetScoreBySubjectAndEnrollmentRequest = {
  subjectId: string;
  enrollmentId: string;
};

export type GetScoreByIdRequest = {
  id: string;
};

export type DeleteScoreRequest = {
  id: string;
};

// ── Response payloads ───────────────────────────────────────────────────────

export type EnrollmentListResponse = AuthenticatedApiResponse<{
  enrollments: Enrollment[];
}>;

export type EnrollmentResponse = AuthenticatedApiResponse<{
  enrollment: Enrollment;
}>;

export type ScoreListResponse = AuthenticatedApiResponse<{
  scores: Score[];
}>;

export type ScoreResponse = AuthenticatedApiResponse<{
  score: Score;
}>;
