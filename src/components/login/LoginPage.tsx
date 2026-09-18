"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";

import { loginAction } from "@/app/login/actions";
import { LoginErrorBox } from "@/components/login/LoginErrorBox";
import { AuthBrandPanel } from "@/components/login/AuthBrandPanel";

import { USERNAME_PATTERN } from "@/lib/regex";

const MESSAGES = {
  emptyUsername: "Ingresa tu nombre de usuario.",
  invalidUsername:
    "El nombre de usuario solo puede contener letras, números y los símbolos . _ - (entre 3 y 30 caracteres).",
  emptyPassword: "Ingresa tu contraseña.",
  systemError:
    "El sistema está experimentando problemas. Por favor, inténtelo de nuevo más tarde.",
} as const;

type Step = "username" | "password";

export function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("username");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = username.trim();
    if (!trimmed) {
      setError(MESSAGES.emptyUsername);
      return;
    }
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError(MESSAGES.invalidUsername);
      return;
    }

    setUsername(trimmed);
    setStep("password");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!password) {
      setError(MESSAGES.emptyPassword);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginAction(username, password);

      if (!result.success) {
        setError(result.message);
        return;
      }

      router.replace("/dashboard");;
      router.refresh();
    } catch {
      setError(MESSAGES.systemError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChangeUsername() {
    setStep("username");
    setPassword("");
    setError(null);
  }

  return (
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* ── Left: form panel ───────────────────────────────────────── */}
      <section className="relative flex w-full flex-1 flex-col bg-white px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
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

          {/* Heading */}
          <h1
            className="
              mt-10 text-3xl font-extrabold tracking-tight text-[#1F2937]
              sm:text-4xl
              animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards
              [animation-duration:700ms] [animation-delay:100ms]
            "
          >
            Inicia sesión en tu cuenta
          </h1>
          <p
            className="
              mt-3 text-sm text-gray-500
              animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards
              [animation-duration:700ms] [animation-delay:200ms]
            "
          >
            Accede al sistema de gestión de certificados académicos
            históricos.
          </p>

          {/* Error */}
          {error && (
            <div className="mt-6">
              <LoginErrorBox message={error} />
            </div>
          )}

          {/* Form */}
          <div className="mt-8">
            {step === "username" ? (
              <form
                key="username-step"
                onSubmit={handleContinue}
                noValidate
                className="
                  space-y-5
                  animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                  [animation-duration:350ms]
                "
              >
                <div className="space-y-2">
                  <label
                    htmlFor="username"
                    className="block text-sm font-semibold text-[#1F2937]"
                  >
                    Nombre de usuario
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    spellCheck={false}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="usuario.ejemplo"
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
                  className="
                    inline-flex h-11 w-full items-center justify-center
                    rounded-md bg-[#3B5FC7] text-sm font-bold text-white
                    shadow-sm transition
                    hover:bg-[#3250a8]
                    focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                    focus-visible:outline-none
                    active:translate-y-px
                  "
                >
                  Siguiente
                </button>
              </form>
            ) : (
              <form
                key="password-step"
                onSubmit={handleSubmit}
                noValidate
                className="
                  space-y-5
                  animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards
                  [animation-duration:350ms]
                "
              >
                {/* Username — read-only, with change affordance */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-[#1F2937]">
                    Nombre de usuario
                  </label>
                  <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3.5 py-2.5">
                    <span className="truncate text-sm text-gray-700">
                      {username}
                    </span>
                    <button
                      type="button"
                      onClick={handleChangeUsername}
                      className="
                        ml-3 shrink-0 text-sm font-semibold text-[#3B5FC7]
                        hover:underline
                        focus-visible:underline focus-visible:outline-none
                      "
                    >
                      Cambiar
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[#1F2937]"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      autoFocus
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
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
                </div>

                <div className="-mt-2 flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="
                      text-sm font-semibold text-[#3B5FC7]
                      transition hover:underline
                      focus-visible:underline focus-visible:outline-none
                    "
                  >
                    ¿Olvidó su contraseña?
                  </Link>
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
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
                </button>
              </form>
            )}
          </div>

          {/* Back link */}
          <p className="mt-10 text-center text-sm text-gray-500">
            <Link
              href="/welcome"
              className="font-semibold text-[#3B5FC7] hover:underline"
            >
              Volver al inicio
            </Link>
          </p>
        </div>
      </section>
      <AuthBrandPanel
        subtitle="Consulta, genera y administra certificados de estudiantes
        graduados desde un único lugar."
      />
    </main>
  );
}
