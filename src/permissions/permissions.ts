/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PERMISSIONS — Capability Catalog & Role Matrix
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A permission is a named capability the UI gates on. It is NOT a security
 * boundary: the backend enforces authorization independently via
 * `checkRole([...])` on every route. A permission listed here means
 * "the UI may show this element"; it does NOT mean "the request will succeed".
 *
import type { BackendRole } from './roles';

// ── Permission catalog ──────────────────────────────────────────────────────

/**
 * Every capability the UI gates on.
 *
 * Note on CATALOGS_READ vs CATALOGS_READ_RESTRICTED:
 *   The backend is inconsistent — some catalogs (Departments, Municipalities,
 *   DocumentTypes, Genders, Grades, Groups, Institutions, Subjects) are
 *   readable by all five roles, while others (AcademicLevels, Countries,
 *   Phones, Roles) are restricted to admins. This split reflects that.
 *
 * Note on CERTIFICATES_*:
 *   The backend does not yet expose a certificate endpoint (only the model
 *   and migration exist). These permissions are placeholders so the UI can
 *   be built against a stable contract once the endpoint lands. Per §56
 *   Rule 2, do NOT build service calls against these until the contract is
 *   confirmed with Cristian.
 */
export const PERMISSIONS = {
  // ── Navigation ──────────────────────────────────────────────────────────
  NAV_DASHBOARD: 'nav:dashboard',
  NAV_STUDENTS: 'nav:students',
  NAV_CERTIFICATES: 'nav:certificates',
  NAV_REPOSITORY: 'nav:repository',
  NAV_USERS: 'nav:users',
  NAV_DATABASE: 'nav:database',

  // ── Students ────────────────────────────────────────────────────────────
  STUDENTS_READ: 'students:read',
  STUDENTS_CREATE: 'students:create',
  STUDENTS_UPDATE: 'students:update',
  STUDENTS_DELETE: 'students:delete',

  // ── Enrollments (academic history) ──────────────────────────────────────
  ENROLLMENTS_READ: 'enrollments:read',
  ENROLLMENTS_CREATE: 'enrollments:create',
  ENROLLMENTS_UPDATE: 'enrollments:update',
  ENROLLMENTS_DELETE: 'enrollments:delete',

  // ── Scores ──────────────────────────────────────────────────────────────
  SCORES_READ: 'scores:read',
  SCORES_MANAGE: 'scores:manage',

  // ── Certificates ────────────────────────────────────────────────────────
  // NOTE: placeholders — no backend endpoint exists yet.
  CERTIFICATES_READ: 'certificates:read',
  CERTIFICATES_GENERATE: 'certificates:generate',
  CERTIFICATES_REPRINT: 'certificates:reprint',
  CERTIFICATES_DELIVER: 'certificates:deliver',

  // ── Certificate recipients (delivery actor) ─────────────────────────────
  CERTIFICATE_RECIPIENTS_READ: 'certificate-recipients:read',
  CERTIFICATE_RECIPIENTS_MANAGE: 'certificate-recipients:manage',
  CERTIFICATE_RECIPIENTS_DELETE: 'certificate-recipients:delete',

  // ── Users ───────────────────────────────────────────────────────────────
  USERS_READ: 'users:read',
  USERS_MANAGE: 'users:manage',

  // ── Catalogs ────────────────────────────────────────────────────────────
  /**
   * Read access to the shared catalogs readable by all roles:
   * Departments, Municipalities, DocumentTypes, Genders, Grades, Groups,
   * Institutions, Subjects.
   */
  CATALOGS_READ: 'catalogs:read',
  /**
   * Read access to the restricted catalogs (admin-only):
   * AcademicLevels, Countries, Phones, Roles.
   */
  CATALOGS_READ_RESTRICTED: 'catalogs:read-restricted',
  /**
   * Create / update / delete on ANY catalog (shared or restricted).
   * The backend grants this uniformly to Máster and Administrador.
   */
  CATALOGS_MANAGE: 'catalogs:manage',

  // ── Historical database import ──────────────────────────────────────────
  // NOTE: placeholder — no backend endpoint exists yet.
  DATABASE_IMPORT: 'database:import',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ── Role → Permission matrix ────────────────────────────────────────────────

/**
 * Which permissions each backend role has.
 *
 * `Máster` is the super-admin: it appears in every `checkRole([...])` array
 * on the backend, so it is granted every permission. Using
 * `Object.values(PERMISSIONS)` here keeps it automatically in sync as new
 * permissions are added.
 *
 * All other roles are listed explicitly so the matrix stays auditable —
 * you can look at a role and see exactly what it can do.
 */
export const ROLE_PERMISSIONS: Record<BackendRole, readonly Permission[]> = {
  // ── Super-admin — full access ───────────────────────────────────────────
  'Máster': Object.values(PERMISSIONS) as readonly Permission[],

  // ── Administrator ───────────────────────────────────────────────────────
  // Full administrative surface: users, catalogs, imports, students,
  // enrollments, scores, certificates, and certificate recipients.
  'Administrador': [
    // Navigation — every item visible.
    PERMISSIONS.NAV_DASHBOARD,
    PERMISSIONS.NAV_STUDENTS,
    PERMISSIONS.NAV_CERTIFICATES,
    PERMISSIONS.NAV_REPOSITORY,
    PERMISSIONS.NAV_USERS,
    PERMISSIONS.NAV_DATABASE,

    // Students — full CRUD.
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_UPDATE,
    PERMISSIONS.STUDENTS_DELETE,

    // Enrollments — full CRUD.
    PERMISSIONS.ENROLLMENTS_READ,
    PERMISSIONS.ENROLLMENTS_CREATE,
    PERMISSIONS.ENROLLMENTS_UPDATE,
    PERMISSIONS.ENROLLMENTS_DELETE,

    // Scores — read + manage.
    PERMISSIONS.SCORES_READ,
    PERMISSIONS.SCORES_MANAGE,

    // Certificates — full lifecycle.
    PERMISSIONS.CERTIFICATES_READ,
    PERMISSIONS.CERTIFICATES_GENERATE,
    PERMISSIONS.CERTIFICATES_REPRINT,
    PERMISSIONS.CERTIFICATES_DELIVER,

    // Certificate recipients — full CRUD.
    PERMISSIONS.CERTIFICATE_RECIPIENTS_READ,
    PERMISSIONS.CERTIFICATE_RECIPIENTS_MANAGE,
    PERMISSIONS.CERTIFICATE_RECIPIENTS_DELETE,

    // Users — full CRUD.
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_MANAGE,

    // Catalogs — read everything, manage everything.
    PERMISSIONS.CATALOGS_READ,
    PERMISSIONS.CATALOGS_READ_RESTRICTED,
    PERMISSIONS.CATALOGS_MANAGE,

    // Historical import.
    PERMISSIONS.DATABASE_IMPORT,
  ],

  // ── Academic Secretary (Funcionario) ────────────────────────────────────
  // Expedites certificates, consults student history. Cannot create or
  // delete records in most resources; cannot manage users or catalogs.
  // Matches: every `['Máster', 'Administrador', 'Rector', 'Funcionario']`
  // array on the certificateRecipient router, plus read-only access on
  // students / enrollments / scores, plus student/enrollment create+update
  // is NOT granted (that's Auxiliar only).
  'Funcionario': [
    // Navigation — user-facing items only.
    PERMISSIONS.NAV_DASHBOARD,
    PERMISSIONS.NAV_STUDENTS,
    PERMISSIONS.NAV_CERTIFICATES,
    PERMISSIONS.NAV_REPOSITORY,

    // Students — read only.
    PERMISSIONS.STUDENTS_READ,

    // Enrollments — read only.
    PERMISSIONS.ENROLLMENTS_READ,

    // Scores — read only.
    PERMISSIONS.SCORES_READ,

    // Certificates — full lifecycle (this is the primary function).
    PERMISSIONS.CERTIFICATES_READ,
    PERMISSIONS.CERTIFICATES_GENERATE,
    PERMISSIONS.CERTIFICATES_REPRINT,
    PERMISSIONS.CERTIFICATES_DELIVER,

    // Certificate recipients — can register delivery recipients.
    PERMISSIONS.CERTIFICATE_RECIPIENTS_READ,
    PERMISSIONS.CERTIFICATE_RECIPIENTS_MANAGE,

    // Catalogs — shared reads only.
    PERMISSIONS.CATALOGS_READ,
  ],

  // ── Auxiliar ────────────────────────────────────────────────────────────
  // Administrative assistant. Broader write access than Funcionario on
  // students/enrollments, but not on certificates or scores.
  // Matches: `checkRole(['Máster', 'Administrador', 'Auxiliar'])` on
  // student/enrollment create+update.
  'Auxiliar': [
    // Navigation — user-facing items only.
    PERMISSIONS.NAV_DASHBOARD,
    PERMISSIONS.NAV_STUDENTS,
    PERMISSIONS.NAV_CERTIFICATES,
    PERMISSIONS.NAV_REPOSITORY,

    // Students — read + create + update (not delete).
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.STUDENTS_CREATE,
    PERMISSIONS.STUDENTS_UPDATE,

    // Enrollments — read + create + update (not delete).
    PERMISSIONS.ENROLLMENTS_READ,
    PERMISSIONS.ENROLLMENTS_CREATE,
    PERMISSIONS.ENROLLMENTS_UPDATE,

    // Scores — read only.
    PERMISSIONS.SCORES_READ,

    // Certificates — read only. Auxiliar is NOT in the
    // certificateRecipient checkRole array, so no recipient permissions.
    PERMISSIONS.CERTIFICATES_READ,

    // Catalogs — shared reads only.
    PERMISSIONS.CATALOGS_READ,
  ],

  // ── Rector ──────────────────────────────────────────────────────────────
  // Institutional authority. Read-mostly oversight.
  // Matches: read on students, enrollments, scores, and certificate
  // recipients (create+update on recipients, but NOT delete).
  'Rector': [
    // Navigation — user-facing items only.
    PERMISSIONS.NAV_DASHBOARD,
    PERMISSIONS.NAV_STUDENTS,
    PERMISSIONS.NAV_CERTIFICATES,
    PERMISSIONS.NAV_REPOSITORY,

    // Students — read only.
    PERMISSIONS.STUDENTS_READ,

    // Enrollments — read only.
    PERMISSIONS.ENROLLMENTS_READ,

    // Scores — read only.
    PERMISSIONS.SCORES_READ,

    // Certificates — read only.
    PERMISSIONS.CERTIFICATES_READ,

    // Certificate recipients — read + manage (create/update), not delete.
    // Matches: `checkRole(['Máster', 'Administrador', 'Rector', 'Funcionario'])`.
    PERMISSIONS.CERTIFICATE_RECIPIENTS_READ,
    PERMISSIONS.CERTIFICATE_RECIPIENTS_MANAGE,

    // Catalogs — shared reads only.
    PERMISSIONS.CATALOGS_READ,
  ],
};
