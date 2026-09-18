import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Clock4,
  GraduationCap,
  Lock,
  LogIn,
  ServerCrash,
  ShieldAlert,
  ShieldX,
  type LucideIcon,
} from "lucide-react";

import {
  getSessionState,
  type SessionFailureReason,
} from "@/lib/auth/session";
import { BACKEND_ROLE_LABELS } from "@/permissions/roles";

export const metadata: Metadata = {
  title: "Acceso denegado | Gestión de Certificados",
  description: "No tienes permisos para acceder a esta sección.",
};

// ── Content model ───────────────────────────────────────────────────────────

type Content = {
  /** Small status pill shown above the title. */
  badge: string;
  badgeClass: string;
  dotClass: string;

  /** Accent bar at the top of the card + decorative blob colors. */
  accentClass: string;
  blobFromClass: string;
  blobToClass: string;

  icon: LucideIcon;
  iconBg: string;
  iconColor: string;

  title: string;
  description: string;
  /** Extra contextual line — "what can I do next?". Optional. */
  hint?: string;

  primary: { label: string; href: string; icon: LucideIcon };
  secondary?: { label: string; href: string };
};

// ── Copy per failure state ──────────────────────────────────────────────────

const FAILURE_CONTENT: Record<SessionFailureReason, Content> = {
  // ── No cookie / never signed in ─────────────────────────────────────────
  AUTHENTICATION_REQUIRED: {
    badge: "Sin sesión activa",
    badgeClass: "bg-[#EAF1FC] text-[#1D468E]",
    dotClass: "bg-[#2861C4]",

    accentClass: "bg-[#2861C4]",
    blobFromClass: "bg-[#3B5FC7]/10",
    blobToClass: "bg-[#2861C4]/10",

    icon: Lock,
    iconBg: "bg-[#EAF1FC]",
    iconColor: "text-[#2861C4]",

    title: "Inicia sesión para continuar",
    description:
      "Esta sección requiere que te identifiques con tu cuenta del sistema de certificados.",
    hint: "Tus credenciales se solicitan una sola vez y la sesión permanece activa mientras la uses.",

    primary: { label: "Iniciar sesión", href: "/login", icon: LogIn },
    secondary: { label: "Volver al inicio", href: "/welcome" },
  },

  // ── Cookie exists, but the API says the JWT is past its exp ─────────────
  TOKEN_EXPIRED: {
    badge: "Sesión finalizada",
    badgeClass: "bg-[#FEF3C7] text-[#92400E]",
    dotClass: "bg-[#F59E0B]",

    accentClass: "bg-[#F59E0B]",
    blobFromClass: "bg-[#F59E0B]/10",
    blobToClass: "bg-[#FBBF24]/10",

    icon: Clock4,
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#B45309]",

    title: "Tu sesión ha expirado",
    description:
      "Por seguridad, cerramos las sesiones automáticamente tras un periodo de inactividad.",
    hint: "No se perdió ningún cambio — vuelve a identificarte para retomar donde lo dejaste.",

    primary: {
      label: "Iniciar sesión nuevamente",
      href: "/login",
      icon: LogIn,
    },
    secondary: { label: "Volver al inicio", href: "/welcome" },
  },

  // ── Cookie exists, but the JWT signature/format is not trusted ──────────
  INVALID_TOKEN: {
    badge: "Credenciales no válidas",
    badgeClass: "bg-[#FEF1F1] text-[#991B1B]",
    dotClass: "bg-[#E5484D]",

    accentClass: "bg-[#E5484D]",
    blobFromClass: "bg-[#E5484D]/10",
    blobToClass: "bg-[#F87171]/10",

    icon: ShieldX,
    iconBg: "bg-[#FEF1F1]",
    iconColor: "text-[#E5484D]",

    title: "No pudimos validar tu acceso",
    description:
      "El token de seguridad de tu sesión ya no es válido o fue revocado. Esto puede ocurrir si accediste desde otro dispositivo o si un administrador cerró tu sesión.",
    hint: "Inicia sesión de nuevo para generar un nuevo token de acceso.",

    primary: { label: "Iniciar sesión", href: "/login", icon: LogIn },
    secondary: { label: "Volver al inicio", href: "/welcome" },
  },

  // ── We couldn't reach the API, or the API returned a non-2xx ────────────
  NETWORK_ERROR: {
    badge: "Error de conexión",
    badgeClass: "bg-[#FEF1F1] text-[#991B1B]",
    dotClass: "bg-[#E5484D]",

    accentClass: "bg-[#E5484D]",
    blobFromClass: "bg-[#E5484D]/10",
    blobToClass: "bg-[#F87171]/10",

    icon: ServerCrash,
    iconBg: "bg-[#FEF1F1]",
    iconColor: "text-[#E5484D]",

    title: "No pudimos verificar tu sesión",
    description:
      "Hubo un problema al comunicarnos con el servidor. Puede ser un fallo temporal de red o que el servicio esté en mantenimiento.",
    hint: "Espera unos momentos y vuelve a intentarlo.",

    primary: {
      label: "Volver al inicio",
      href: "/welcome",
      icon: ArrowLeft,
    },
  },

  // ── Missing env vars — server isn't wired up ────────────────────────────
  MISCONFIGURED: {
    badge: "Servicio no disponible",
    badgeClass: "bg-[#FEF1F1] text-[#991B1B]",
    dotClass: "bg-[#E5484D]",

    accentClass: "bg-[#E5484D]",
    blobFromClass: "bg-[#E5484D]/10",
    blobToClass: "bg-[#F87171]/10",

    icon: ServerCrash,
    iconBg: "bg-[#FEF1F1]",
    iconColor: "text-[#E5484D]",

    title: "El sistema no está disponible",
    description:
      "Detectamos un problema de configuración en el servicio. Contacta al administrador del sistema.",
    hint: "Este error no se resolverá reintentando desde tu cuenta.",

    primary: {
      label: "Volver al inicio",
      href: "/welcome",
      icon: ArrowLeft,
    },
  },
};

// ── Resolve content from session state ──────────────────────────────────────

function resolveContent(
  state: Awaited<ReturnType<typeof getSessionState>>
): Content {
  // Authenticated but the caller's role wasn't allowed → this is the case
  // the `requireRole()` guard produces. Reuse the auth-required chrome but
  // swap copy and badge for a role-specific denial.
  if (state.status === "authenticated") {
    const roleLabel = BACKEND_ROLE_LABELS[state.user.role];

    return {
      badge: `Rol: ${roleLabel}`,
      badgeClass: "bg-[#FEF1F1] text-[#991B1B]",
      dotClass: "bg-[#E5484D]",

      accentClass: "bg-[#E5484D]",
      blobFromClass: "bg-[#E5484D]/10",
      blobToClass: "bg-[#F87171]/10",

      icon: ShieldAlert,
      iconBg: "bg-[#FEF1F1]",
      iconColor: "text-[#E5484D]",

      title: "Acceso denegado",
      description: `Tu cuenta con rol ${roleLabel} no tiene los permisos necesarios para acceder a esta sección.`,
      hint: "Si necesitas acceso, contacta al administrador para solicitar los permisos correspondientes.",

      primary: {
        label: "Volver al inicio",
        href: "/welcome",
        icon: ArrowLeft,
      },
      secondary: {
        label: "Iniciar sesión con otra cuenta",
        href: "/login",
      },
    };
  }

  return FAILURE_CONTENT[state.reason];
}

// ── Page ────────────────────────────────────────────────────────────────────

export default async function UnauthorizedPage() {
  const state = await getSessionState();
  const content = resolveContent(state);

  const Icon = content.icon;
  const PrimaryIcon = content.primary.icon;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F0EDED] px-6 py-12">
      {/* Decorative gradient blobs — colors follow the current state. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className={`absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl ${content.blobFromClass}`}
        />
        <div
          className={`absolute -right-32 -bottom-32 h-96 w-96 rounded-full blur-3xl ${content.blobToClass}`}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Wordmark */}
        <Link
          href="/welcome"
          className="
            mx-auto mb-8 flex w-fit items-center gap-2.5 rounded-lg
            animate-in fade-in slide-in-from-top-3 fill-mode-backwards
            [animation-duration:500ms]
            focus-visible:ring-2 focus-visible:ring-[#3B5FC7]/40
            focus-visible:ring-offset-4 focus-visible:ring-offset-[#F0EDED]
            focus-visible:outline-none
          "
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B5FC7] text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-[#1F2937]">
            Certificados
          </span>
        </Link>

        {/* Card */}
        <div
          className="
            overflow-hidden rounded-2xl border border-gray-200/80 bg-white
            shadow-[0_20px_50px_-20px_rgba(40,97,196,0.25)]
            animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards
            [animation-duration:700ms] [animation-delay:80ms]
          "
        >
          {/* Dynamic accent bar */}
          <div
            aria-hidden="true"
            className={`h-1.5 w-full ${content.accentClass}`}
          />

          <div className="p-8">
            {/* Status badge */}
            <div
              className="
                flex justify-center
                animate-in fade-in slide-in-from-top-2 fill-mode-backwards
                [animation-duration:500ms] [animation-delay:150ms]
              "
            >
              <span
                className={`
                  inline-flex items-center gap-1.5 rounded-full px-3 py-1
                  text-xs font-semibold tracking-tight
                  ${content.badgeClass}
                `}
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${content.dotClass}`}
                />
                {content.badge}
              </span>
            </div>

            {/* Icon */}
            <div
              className={`
                mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full
                ${content.iconBg}
                animate-in zoom-in-50 fill-mode-backwards
                [animation-duration:600ms] [animation-delay:220ms]
              `}
            >
              <Icon
                aria-hidden="true"
                className={`h-8 w-8 ${content.iconColor}`}
              />
            </div>

            {/* Title */}
            <h1
              className="
                mt-6 text-center text-2xl font-extrabold tracking-tight text-[#1F2937] sm:text-3xl
                animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                [animation-duration:600ms] [animation-delay:320ms]
              "
            >
              {content.title}
            </h1>

            {/* Description */}
            <p
              className="
                mt-3 text-center text-sm leading-relaxed text-gray-500
                animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                [animation-duration:600ms] [animation-delay:420ms]
              "
            >
              {content.description}
            </p>

            {/* Hint — separated so it reads as guidance, not alarm */}
            {content.hint && (
              <p
                className="
                  mt-4 rounded-lg bg-gray-50 px-4 py-3 text-center text-xs leading-relaxed text-gray-500
                  animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                  [animation-duration:600ms] [animation-delay:480ms]
                "
              >
                {content.hint}
              </p>
            )}

            {/* Actions */}
            <div
              className="
                mt-8 space-y-3
                animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                [animation-duration:600ms] [animation-delay:560ms]
              "
            >
              <Link
                href={content.primary.href}
                className="
                  inline-flex h-11 w-full items-center justify-center gap-2
                  rounded-md bg-[#3B5FC7] text-sm font-bold text-white
                  shadow-sm transition
                  hover:bg-[#3250a8]
                  focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                  focus-visible:outline-none
                  active:translate-y-px
                "
              >
                <PrimaryIcon className="h-4 w-4" aria-hidden="true" />
                {content.primary.label}
              </Link>

              {content.secondary && (
                <Link
                  href={content.secondary.href}
                  className="
                    inline-flex h-11 w-full items-center justify-center
                    rounded-md border border-gray-200 bg-white
                    text-sm font-semibold text-[#1F2937]
                    transition
                    hover:border-gray-300 hover:bg-gray-50
                    focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/15
                    focus-visible:outline-none
                    active:translate-y-px
                  "
                >
                  {content.secondary.label}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p
          className="
            mt-6 text-center text-xs text-gray-400
            animate-in fade-in fill-mode-backwards
            [animation-duration:600ms] [animation-delay:700ms]
          "
        >
          Si el problema persiste, contacta al administrador del sistema.
        </p>
      </div>
    </main>
  );
}
