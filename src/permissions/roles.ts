/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ROLES — Backend Roles & UX Personas
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Two role vocabularies coexist in this project:
 *
 *   1. BackendRole  — the raw ENUM values stored in `rol.nombre_rol` and
 *                     embedded in the JWT as `decoded.role`. This is what
 *                     the API actually authorizes against.
 *
 *   2. Persona      — the UX-level abstraction used in the wireframes and
 *                     in guidelines.md §15 ("Academic Secretary",
 *                     "Administrator", "Rector"). A persona groups one or
 *                     more backend roles.
 *
 * Never compare against BackendRole strings directly in components.
 * Use `can()` from `./authorization` (permission-based) or `hasPersona()`
 * (persona-based) instead. See guidelines.md §15 and §52.
 *
 * Source of truth: `src/db/models/role.js` and `src/db/seeders/20260716051926-Role.cjs`.
 */

// ── Backend roles (raw) ─────────────────────────────────────────────────────

/**
 * Exact values of the `rol.nombre_rol` ENUM on the backend.
 * These are the strings that arrive in the JWT payload under `role`.
 */
export type BackendRole =
  | 'Máster'
  | 'Auxiliar'
  | 'Administrador'
  | 'Funcionario'
  | 'Rector';

/** Ordered list of every backend role, useful for exhaustive iteration. */
export const BACKEND_ROLES = [
  'Máster',
  'Auxiliar',
  'Administrador',
  'Funcionario',
  'Rector',
] as const satisfies readonly BackendRole[];

/** Human-readable labels for each backend role (Spanish, per the UI). */
export const BACKEND_ROLE_LABELS: Record<BackendRole, string> = {
  'Máster': 'Máster',
  'Auxiliar': 'Auxiliar',
  'Administrador': 'Administrador',
  'Funcionario': 'Funcionario',
  'Rector': 'Rector',
};

// ── UX personas ─────────────────────────────────────────────────────────────

/**
 * Personas used by the UX layer. See guidelines.md §15.
 *
 *   academic-secretary  — the primary operator: searches students,
 *                         consults history, generates certificates.
 *   administrator       — manages users, catalogs, and system config.
 *   rector              — institutional authority with read-mostly oversight.
 */
export type Persona = 'academic-secretary' | 'administrator' | 'rector';

/** Ordered list of every persona. */
export const PERSONAS = [
  'academic-secretary',
  'administrator',
  'rector',
] as const satisfies readonly Persona[];

/** Human-readable labels for each persona. */
export const PERSONA_LABELS: Record<Persona, string> = {
  'academic-secretary': 'Secretario académico',
  'administrator': 'Administrador',
  'rector': 'Rector',
};

// ── Role ↔ Persona mapping ──────────────────────────────────────────────────

/**
 * Which persona each backend role belongs to.
 *
 * `Máster` and `Administrador` both map to `administrator` because the UX
 * does not distinguish between "super-admin" and "admin" — both see the
 * full administration surface. The backend, however, does distinguish them,
 * which is why the permission matrix below keeps them separate.
 *
 * `Funcionario` and `Auxiliar` both map to `academic-secretary` because the
 * UX treats them as the same operator persona: the difference is
 * permission scope (Auxiliar can create/update students; Funcionario cannot),
 * not UI surface.
 *
 * `null` means the role has no defined persona — surface this to the user
 * rather than silently rendering a default.
 */
export const ROLE_TO_PERSONA: Record<BackendRole, Persona | null> = {
  'Máster': 'administrator',
  'Administrador': 'administrator',
  'Rector': 'rector',
  'Funcionario': 'academic-secretary',
  'Auxiliar': 'academic-secretary',
};

/**
 * Reverse mapping: which backend roles satisfy a given persona.
 * Useful for surfacing "the personas that can do X" in UI copy.
 */
export const PERSONA_TO_ROLES: Record<Persona, readonly BackendRole[]> = {
  'academic-secretary': ['Funcionario', 'Auxiliar'],
  'administrator': ['Administrador', 'Máster'],
  'rector': ['Rector'],
};

// ── Type guards ─────────────────────────────────────────────────────────────

/**
 * Type guard — is `value` one of the recognized backend roles?
 * Use when narrowing a value that came from an untrusted source
 * (e.g. a decoded JWT before it has been validated).
 */
export function isBackendRole(value: unknown): value is BackendRole {
  return (
    typeof value === 'string' &&
    (BACKEND_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Type guard — is `value` one of the recognized personas?
 */
export function isPersona(value: unknown): value is Persona {
  return (
    typeof value === 'string' &&
    (PERSONAS as readonly string[]).includes(value)
  );
}

/**
 * Where each backend role lands after a successful login.
 *
 * This is the single source of truth for post-login routing. Both the
 * login Server Action and any future "send me to my home" links read
 * from this map — never hard-code a landing path anywhere else.
 */
export const LANDING_BY_ROLE: Record<BackendRole, string> = {
  'Máster': '/dashboard',
  'Administrador': '/dashboard',
  'Funcionario': '/dashboard',
  'Rector': '/dashboard',
  'Auxiliar': '/academic-registry',
};
