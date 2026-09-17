/**
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHORIZATION — Pure permission checks
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Centralized authorization API. Every UI element that needs to hide/show
 * based on user capabilities MUST go through these functions — never
 * compare roles directly (guidelines.md §15, §52).
 *
 * React integration:
 *   A `useAuthorization()` hook belongs in `src/hooks/useAuthorization.ts`
 *   (per guidelines.md §47) and should consume the pure functions below.
 *   This file deliberately stays framework-agnostic so it can also be used
 *   from Server Components and from non-React code (tests, route handlers).
 */

import type { AuthenticatedUser } from '@/types/auth';
import type { BackendRole, Persona } from './roles';
import { ROLE_TO_PERSONA } from './roles';
import { ROLE_PERMISSIONS, type Permission } from './permissions';

// ── Permission checks ───────────────────────────────────────────────────────

/**
 * Returns `true` if the given user has the given permission.
 *
 * A `null` user (unauthenticated, or auth state not yet resolved) never has
 * any permission. This makes the function safe to call in a loading state
 * without an extra null guard at every call site.
 *
 * @example
 *   const showCreateUser = can(user, PERMISSIONS.USERS_MANAGE);
 *
 * @example
 *   return can(user, PERMISSIONS.STUDENTS_DELETE) ? <DeleteButton /> : null;
 */
export function can(
  user: AuthenticatedUser | null,
  permission: Permission
): boolean {
  if (!user) return false;

  const permissions = ROLE_PERMISSIONS[user.role];
  // Defensive: if a JWT carries a role not present in the matrix (e.g. the
  // backend adds a role before the frontend knows about it), deny by default
  // rather than crash.
  if (!permissions) return false;

  return permissions.includes(permission);
}

/**
 * Returns `true` if the user has AT LEAST ONE of the given permissions.
 *
 * Use for UI elements that are useful if the user can perform any one of
 * several actions (e.g. "Show the students page if the user can read OR
 * create students").
 *
 * @example
 *   const canUseStudentsPage = canAny(user, [
 *     PERMISSIONS.STUDENTS_READ,
 *     PERMISSIONS.STUDENTS_CREATE,
 *   ]);
 */
export function canAny(
  user: AuthenticatedUser | null,
  permissions: readonly Permission[]
): boolean {
  if (!user) return false;
  return permissions.some((permission) => can(user, permission));
}

/**
 * Returns `true` if the user has ALL of the given permissions.
 *
 * Use sparingly — most UI elements depend on a single capability. Reach for
 * this only when an action genuinely requires multiple independent grants.
 */
export function canAll(
  user: AuthenticatedUser | null,
  permissions: readonly Permission[]
): boolean {
  if (!user) return false;
  return permissions.every((permission) => can(user, permission));
}

// ── Role & persona checks ───────────────────────────────────────────────────

/**
 * Returns `true` if the user has any of the given backend roles.
 *
 * Prefer `can()` for permission-driven UI. `hasRole()` exists for the rare
 * cases where the UI needs to reason about the raw role identity — for
 * example, rendering a role badge, or displaying "only Administrador and
 * Máster can perform this action" copy.
 *
 * @example
 *   // Rendering a badge — legitimate use of the raw role.
 *   <Badge>{BACKEND_ROLE_LABELS[user.role]}</Badge>
 *
 * @example
 *   // Displaying a "sensitive action" warning.
 *   const isSuperAdmin = hasRole(user, ['Máster']);
 */
export function hasRole(
  user: AuthenticatedUser | null,
  roles: readonly BackendRole[]
): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Returns `true` if the user belongs to any of the given personas.
 *
 * Personas are the UX abstraction from guidelines.md §15. Prefer `can()`
 * for gating; use `hasPersona()` for copy, layout, or persona-specific
 * workflows where the persona itself (not a specific capability) drives
 * the UI.
 *
 * @example
 *   // Persona-specific welcome banner.
 *   if (hasPersona(user, ['administrator'])) {
 *     return <AdminWelcomeBanner />;
 *   }
 */
export function hasPersona(
  user: AuthenticatedUser | null,
  personas: readonly Persona[]
): boolean {
  if (!user) return false;

  const persona = ROLE_TO_PERSONA[user.role];
  if (persona === null) return false;

  return personas.includes(persona);
}
