/**
 * ─────────────────────────────────────────────────────────────────────────────
 * USER — User, Role, Academic Level & Phone Types
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mirrors:
 *   - `src/db/models/user.js`          (usuario)
 *   - `src/db/models/role.js`          (rol)
 *   - `src/db/models/academicLevel.js` (nivel_academico)
 *   - `src/db/models/phone.js`         (telefono)
 *   - `src/services/userServices.js`   (nested formatting, password stripping)
 */

import type { AuthenticatedApiResponse, CatalogReference } from './api';
import type { UserRole } from './auth';

// ── Enumerated catalog values ───────────────────────────────────────────────

/** Academic level names from the `nivel_academico` ENUM. */
export type AcademicLevelName =
  | 'Técnico'
  | 'tecnólogo'
  | 'Licenciado'
  | 'Especialista'
  | 'Maestría'
  | 'Doctorado'
  | 'Post-Doctorado';

/** Academic level abbreviations from the `nivel_academico` ENUM. */
export type AcademicLevelAbbreviation =
  | 'Téc'
  | 'Tgo'
  | 'Lic'
  | 'Esp'
  | 'Mgs'
  | 'Ph.D';

/** User status ENUM. */
export type UserStatus = 'ACTIVO' | 'INACTIVO';

// ── Catalog entities ────────────────────────────────────────────────────────

export type Role = {
  id: number;
  name: UserRole;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type AcademicLevel = {
  id: number;
  name: AcademicLevelName;
  abbreviation: AcademicLevelAbbreviation;
  createdAt: string;
  updatedAt: string;
};

export type Phone = {
  id: number;
  number: string;
  createdAt: string;
  updatedAt: string;
};

// ── User entity ─────────────────────────────────────────────────────────────

/**
 * Full User record as returned by `UserServices.listOne` / `listAll`.
 *
 * The `password` hash is stripped server-side by `_formatUser` and is
 * therefore NOT part of this type.
 */
export type User = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  email: string;
  status: UserStatus;
  lastLogin: string;
  documentType: CatalogReference | null;
  municipality: CatalogReference | null;
  role: CatalogReference | null;
  academicLevel: CatalogReference | null;
  gender: CatalogReference | null;
  createdAt: string;
  updatedAt: string;
};

// ── Request payloads ────────────────────────────────────────────────────────

export type CreateUserRequest = {
  username: string;
  firstName: string;
  lastName: string;
  documentTypeId: string;
  documentNumber: string;
  municipalityId: string;
  roleId: string;
  academicLevelId: string;
  email: string;
  status: UserStatus;
  password: string;
  genderId: string;
  lastLogin?: string;
};

export type UpdateUserRequest = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  documentTypeId?: string;
  documentNumber?: string;
  municipalityId?: string;
  roleId?: string;
  academicLevelId?: string;
  email?: string;
  status?: UserStatus;
  genderId?: string;
  lastLogin?: string;
};

export type GetUserByIdRequest = {
  id: string;
};

export type DeleteUserRequest = {
  id: string;
};

// ── Response payloads ───────────────────────────────────────────────────────

export type UserListResponse = AuthenticatedApiResponse<{
  users: User[];
}>;

export type UserResponse = AuthenticatedApiResponse<{
  user: User;
}>;
