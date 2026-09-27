"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  type SessionState,
} from "@/lib/auth/session";
import { BACKEND_ROLE_LABELS } from "@/permissions/roles";

// ── Content model ───────────────────────────────────────────────────────────

type Content = {
  badge: string;
  badgeClass: string;
  dotClass: string;

  accentClass: string;
  blobFromClass: string;
  blobToClass: string;

  icon: LucideIcon;
  iconBg: string;
  iconColor: string;

  title: string;
  description: string;
  hint?: string;

  primary: { label: string; href: string; icon: LucideIcon };
  secondary?: { label: string; href: string };
};

// ── Copy per failure state ──────────────────────────────────────────────────

const FAILURE_CONTENT: Record<SessionFailureReason, Content> = {
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

// ── Content builders ────────────────────────────────────────────────────────

function forbiddenContent(roleLabel: string): Content {
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

function isSessionFailureReason(
  value: string | null
): value is SessionFailureReason {
  return (
    value === "AUTHENTICATION_REQUIRED" ||
    value === "TOKEN_EXPIRED" ||
    value === "INVALID_TOKEN" ||
    value === "NETWORK_ERROR" ||
    value === "MISCONFIGURED"
  );
}

/**
 * Decides which content to render.
 *
 * Precedence:
 *   1. Authenticated session → role denial. This is what RoleGuard
 *      produces via `?reason=FORBIDDEN`, and also what happens if an
 *      authenticated user lands here directly.
 *   2. `reason` query param → the specific failure RoleGuard or
 *      useAuthExpiration observed before navigating. This is more
 *      reliable than re-deriving from session state, because
 *      `getSessionState()` deletes the bad token as a side effect on
 *      TOKEN_EXPIRED / INVALID_TOKEN — the second read would report
 *      AUTHENTICATION_REQUIRED instead.
 *   3. Live session state → fallback for direct visits with no param.
 */
function resolveContent(
  reasonParam: string | null,
  session: SessionState
): Content {
  if (session.status === "authenticated") {
    return forbiddenContent(BACKEND_ROLE_LABELS[session.user.role]);
  }

  const reason = isSessionFailureReason(reasonParam)
    ? reasonParam
    : session.reason;

  return FAILURE_CONTENT[reason];
}

// ── Component ───────────────────────────────────────────────────────────────

export function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reasonParam = searchParams.get("reason");

  // Note: `getSessionState()` has a side effect on TOKEN_EXPIRED and
  // INVALID_TOKEN (it calls removeToken()). That is intentional and
  // safe here — it never triggers a React re-render, and the reason
  // we display comes from the query param first, so the copy stays
  // stable even after the token is gone.
  const session = getSessionState();
  const content = resolveContent(reasonParam, session);

  const Icon = content.icon;
  const PrimaryIcon = content.primary.icon;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F0EDED] px-6 py-12">
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

        <div
          className="
            overflow-hidden rounded-2xl border border-gray-200/80 bg-white
            shadow-[0_20px_50px_-20px_rgba(40,97,196,0.25)]
            animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards
            [animation-duration:700ms] [animation-delay:80ms]
          "
        >
          <div
            aria-hidden="true"
            className={`h-1.5 w-full ${content.accentClass}`}
          />

          <div className="p-8">
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

            <h1
              className="
                mt-6 text-center text-2xl font-extrabold tracking-tight text-[#1F2937] sm:text-3xl
                animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                [animation-duration:600ms] [animation-delay:320ms]
              "
            >
              {content.title}
            </h1>

            <p
              className="
                mt-3 text-center text-sm leading-relaxed text-gray-500
                animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                [animation-duration:600ms] [animation-delay:420ms]
              "
            >
              {content.description}
            </p>

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
