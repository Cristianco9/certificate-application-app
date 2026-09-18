"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
} from "lucide-react";

import { resetPasswordAction } from "@/app/forgot-password/actions";
import { LoginErrorBox } from "@/components/login/LoginErrorBox";
import { AuthBrandPanel } from "@/components/login/AuthBrandPanel";

import { DOCUMENT_NUMBER_PATTERN, EMAIL_PATTERN } from "@/lib/regex";

const MIN_PASSWORD_LENGTH = 8;

const MESSAGES = {
  emptyEmail: "Ingresa tu correo electrónico.",
  invalidEmail: "Ingresa un correo electrónico válido.",
  emptyDocument: "Ingresa tu número de documento.",
  invalidDocument:
    "El número de documento debe tener entre 6 y 10 dígitos (cédula) o entre 6 y 20 caracteres alfanuméricos (pasaporte).",
  emptyPassword: "Ingresa tu nueva contraseña.",
  shortPassword: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  passwordMismatch: "Las contraseñas no coinciden.",
  systemError:
    "El sistema está experimentando problemas. Por favor, inténtelo de nuevo más tarde.",
} as const;

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedDocument = documentNumber.trim();

    if (!trimmedEmail) {
      setError(MESSAGES.emptyEmail);
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError(MESSAGES.invalidEmail);
      return;
    }
    if (!trimmedDocument) {
      setError(MESSAGES.emptyDocument);
      return;
    }
    if (!DOCUMENT_NUMBER_PATTERN.test(trimmedDocument)) {
      setError(MESSAGES.invalidDocument);
      return;
    }
    if (!newPassword) {
      setError(MESSAGES.emptyPassword);
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(MESSAGES.shortPassword);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(MESSAGES.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPasswordAction({
        email: trimmedEmail,
        documentNumber: trimmedDocument,
        newPassword,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError(MESSAGES.systemError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* ── Left: form panel ───────────────────────────────────────── */}
      <section className="relative flex w-full flex-1 flex-col bg-white px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto my-auto w-full max-w-md">
          {/* Wordmark */}
          <div
            className="
              flex items-center gap-2.5
              animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards
              [animation-duration:500ms]
            "
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B5FC7] text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#1F2937]">
              Certificados
            </span>
          </div>

          {isSuccess ? (
            <SuccessPanel />
          ) : (
            <>
              {/* Back link */}
              <Link
                href="/login"
                className="
                  mt-10 inline-flex items-center gap-1.5 text-sm font-semibold
                  text-[#3B5FC7] transition hover:underline
                  focus-visible:underline focus-visible:outline-none
                  animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards
                  [animation-duration:500ms] [animation-delay:80ms]
                "
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a iniciar sesión
              </Link>

              {/* Heading */}
              <h1
                className="
                  mt-6 text-3xl font-extrabold tracking-tight text-[#1F2937]
                  sm:text-4xl
                  animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards
                  [animation-duration:700ms] [animation-delay:100ms]
                "
              >
                Recuperar contraseña
              </h1>
              <p
                className="
                  mt-3 text-sm leading-relaxed text-gray-500
                  animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards
                  [animation-duration:700ms] [animation-delay:200ms]
                "
              >
                Ingresa los datos asociados a tu cuenta para establecer una
                nueva contraseña. Deberás iniciar sesión nuevamente después
                del cambio.
              </p>

              {/* Error */}
              {error && (
                <div className="mt-6">
                  <LoginErrorBox message={error} />
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                noValidate
                className="
                  mt-8 space-y-5
                  animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                  [animation-duration:400ms] [animation-delay:280ms]
                "
              >
                {/* Email */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#1F2937]"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    spellCheck={false}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className="
                      h-11 w-full rounded-md border border-gray-300 bg-white
                      px-3.5 text-sm text-[#1F2937]
                      transition outline-none
                      placeholder:text-gray-400
                      focus:border-[#3B5FC7] focus:ring-4 focus:ring-[#3B5FC7]/15
                    "
                  />
                </div>

                {/* Document number */}
                <div className="space-y-2">
                  <label
                    htmlFor="documentNumber"
                    className="block text-sm font-semibold text-[#1F2937]"
                  >
                    Número de documento
                  </label>
                  <input
                    id="documentNumber"
                    name="documentNumber"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(event.target.value)}
                    placeholder="1005678901"
                    className="
                      h-11 w-full rounded-md border border-gray-300 bg-white
                      px-3.5 text-sm text-[#1F2937]
                      transition outline-none
                      placeholder:text-gray-400
                      focus:border-[#3B5FC7] focus:ring-4 focus:ring-[#3B5FC7]/15
                    "
                  />
                </div>

                {/* New password */}
                <div className="space-y-2">
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-semibold text-[#1F2937]"
                  >
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="••••••••••"
                      className="
                        h-11 w-full rounded-md border border-gray-300 bg-white
                        px-3.5 pr-11 text-sm text-[#1F2937]
                        transition outline-none
                        placeholder:text-gray-400
                        focus:border-[#3B5FC7] focus:ring-4 focus:ring-[#3B5FC7]/15
                      "
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      className="
                        absolute inset-y-0 right-0 flex w-11 items-center
                        justify-center text-gray-400 transition
                        hover:text-gray-600
                        focus-visible:text-gray-600 focus-visible:outline-none
                      "
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mínimo {MIN_PASSWORD_LENGTH} caracteres.
                  </p>
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-semibold text-[#1F2937]"
                  >
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••••"
                    className="
                      h-11 w-full rounded-md border border-gray-300 bg-white
                      px-3.5 text-sm text-[#1F2937]
                      transition outline-none
                      placeholder:text-gray-400
                      focus:border-[#3B5FC7] focus:ring-4 focus:ring-[#3B5FC7]/15
                    "
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="
                    inline-flex h-11 w-full items-center justify-center gap-2
                    rounded-md bg-[#3B5FC7] text-sm font-bold text-white
                    shadow-sm transition
                    hover:bg-[#3250a8]
                    focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                    focus-visible:outline-none
                    active:translate-y-px
                    disabled:cursor-not-allowed disabled:opacity-70
                  "
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting
                    ? "Restableciendo..."
                    : "Restablecer contraseña"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
      <AuthBrandPanel
        subtitle="Consulta, genera y administra certificados de estudiantes
        graduados antes del año 2000 desde un único lugar."
      />
    </main>
  );
}

function SuccessPanel() {
  return (
    <div
      className="
        mt-10
        animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
        [animation-duration:500ms]
      "
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DCFCE7]">
        <CheckCircle2 className="h-6 w-6 text-[#16A34A]" />
      </div>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-[#1F2937] sm:text-4xl">
        Contraseña restablecida
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-500">
        Tu contraseña fue actualizada correctamente. Inicia sesión nuevamente
        con tus nuevas credenciales.
      </p>

      <Link
        href="/login"
        className="
          mt-8 inline-flex h-11 w-full items-center justify-center gap-2
          rounded-md bg-[#3B5FC7] text-sm font-bold text-white
          shadow-sm transition
          hover:bg-[#3250a8]
          focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
          focus-visible:outline-none
          active:translate-y-px
        "
      >
        Ir a iniciar sesión
      </Link>
    </div>
  );
}
