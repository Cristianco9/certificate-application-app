/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STUDENT — Student & Location Catalog Types
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mirrors:
 *   - `src/db/models/student.js`         (estudiante)
 *   - `src/db/models/country.js`         (pais)
 *   - `src/db/models/department.js`      (departamento)
 *   - `src/db/models/municipality.js`    (municipio)
 *   - `src/db/models/documentType.js`    (tipo_documento)
 *   - `src/db/models/gender.js`          (genero)
 *   - `src/services/studentServices.js`  (nested formatting + search)
 *
 * Location catalogs live here because Student is the primary consumer and
 * they are shared with User, Institution, and CertificateSignature via
 * `CatalogReference` imports.
 */

import type { AuthenticatedApiResponse, CatalogReference } from './api';

// ── Enumerated catalog values ───────────────────────────────────────────────

/** Document type names from the `tipo_documento` ENUM. */
export type DocumentTypeName =
  | 'Cédula de Ciudadanía'
  | 'Tarjeta de Identidad'
  | 'Registro Civil'
  | 'Cédula de Extranjería'
  | 'Pasaporte'
  | 'Permiso Especial de Permanencia (PEP)'
  | 'NIT';

/** Gender names from the `genero` ENUM. */
export type GenderName =
  | 'Masculino'
  | 'Femenino'
  | 'No binario'
  | 'Otro'
  | 'Prefiero no decirlo';

// ── Location catalog entities ───────────────────────────────────────────────

export type Country = {
  id: number;
  name: string;
  /** ISO 3166-1 alpha-2 code (nullable). */
  iso2Code: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Department = {
  id: number;
  name: string;
  /** Parent country, embedded as `{ id, name }`. */
  country: CatalogReference | null;
  createdAt: string;
  updatedAt: string;
};

export type Municipality = {
  id: number;
  name: string;
  /** Parent department, embedded as `{ id, name }`. */
  department: CatalogReference | null;
  createdAt: string;
  updatedAt: string;
};

// ── Simple catalog entities ─────────────────────────────────────────────────

export type DocumentType = {
  id: number;
  name: DocumentTypeName;
  createdAt: string;
  updatedAt: string;
};

export type Gender = {
  id: number;
  name: GenderName;
  createdAt: string;
  updatedAt: string;
};

// ── Student entity ──────────────────────────────────────────────────────────

/**
 * Full Student record as returned by `StudentServices.listOne`,
 * `listAll`, `listByPartialName`, `listByDocumentNumber`,
 * `listByMunicipality`, and `listByDocumentType`.
 *
 * Nullable fields mirror the nullable columns on `estudiante`.
 */
export type Student = {
  id: number;
  firstName: string;
  middleName: string | null;
  firstLastName: string;
  secondLastName: string | null;
  /** Nullable because historical students may lack a registered document. */
  documentNumber: string | null;
  /** DATEONLY — serialized as `YYYY-MM-DD`. */
  birthDate: string;
  address: string | null;
  email: string | null;
  /** Embedded `{ id, name }` reference to `municipio`. */
  municipality: CatalogReference | null;
  /** Embedded `{ id, name }` reference to `tipo_documento` (nullable). */
  documentType: CatalogReference | null;
  /** Embedded `{ id, name }` reference to `genero` (nullable). */
  gender: CatalogReference | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Subset of Student fields returned inside an Enrollment record.
 *
 * Mirrors `EnrollmentServices.STUDENT_INCLUDE.attributes`.
 */
export type StudentReference = Pick<
  Student,
  | 'id'
  | 'firstName'
  | 'middleName'
  | 'firstLastName'
  | 'secondLastName'
  | 'documentNumber'
>;

// ── Request payloads ────────────────────────────────────────────────────────
// IDs are `string` in request bodies. See the note in `api.ts`.

export type CreateStudentRequest = {
  firstName: string;
  middleName?: string;
  firstLastName: string;
  secondLastName?: string;
  documentNumber?: string;
  /** DATEONLY — send as `YYYY-MM-DD`. */
  birthDate: string;
  municipalityId: string;
  documentTypeId?: string;
  genderId?: string;
  address?: string;
  email?: string;
};

export type UpdateStudentRequest = {
  id: string;
  firstName?: string;
  middleName?: string;
  firstLastName?: string;
  secondLastName?: string;
  documentNumber?: string;
  birthDate?: string;
  municipalityId?: string;
  documentTypeId?: string;
  genderId?: string;
  address?: string;
  email?: string;
};

export type SearchStudentsByNameRequest = {
  partialName: string;
};

export type GetStudentByDocumentNumberRequest = {
  documentNumber: string;
};

export type ListStudentsByMunicipalityRequest = {
  municipalityId: string;
};

export type ListStudentsByDocumentTypeRequest = {
  documentTypeId: string;
};

export type GetStudentByIdRequest = {
  id: string;
};

export type DeleteStudentRequest = {
  id: string;
};

// ── Response payloads ───────────────────────────────────────────────────────

export type StudentListResponse = AuthenticatedApiResponse<{
  students: Student[];
}>;

export type StudentResponse = AuthenticatedApiResponse<{
  student: Student;
}>;
