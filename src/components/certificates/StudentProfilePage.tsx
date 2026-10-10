"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  ChevronDown,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  User,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  fetchStudentProfileAction,
  type StudentProfile,
} from "@/app/certificates/actions";
import { getToken } from "@/lib/auth/token";
import { getSelectedStudentId } from "@/lib/certificates/searchSession";

type ViewState =
  | { kind: "loading" }
  | { kind: "loaded"; profile: StudentProfile }
  | { kind: "no-selection" }
  | { kind: "not-found" };

export function StudentProfilePage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    const studentId = getSelectedStudentId();
    if (!studentId) {
      setState({ kind: "no-selection" });
      return;
    }

    const token = getToken();
    if (!token) {
      setState({ kind: "not-found" });
      return;
    }

    fetchStudentProfileAction(token, String(studentId)).then((profile) => {
      if (cancelled) return;
      setState(profile ? { kind: "loaded", profile } : { kind: "not-found" });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-full bg-[#F0EDED] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="rounded-xl bg-[#3B5FC7] px-4 py-2.5 text-center shadow-sm">
          <h1 className="text-sm font-extrabold tracking-[0.08em] text-white uppercase sm:text-base">
            Perfil Estudiante
          </h1>
        </div>

        <Link
          href="/certificates"
          aria-label="Volver a la búsqueda de estudiantes"
          className="
            group -ml-2 inline-flex w-fit items-center gap-2.5 rounded-lg
            px-2 py-1.5
            text-sm font-extrabold text-[#E5484D]
            transition
            hover:bg-[#FEF1F1] hover:text-[#B4242A]
            focus-visible:bg-[#FEF1F1] focus-visible:text-[#B4242A]
            focus-visible:ring-4 focus-visible:ring-[#E5484D]/20
            focus-visible:outline-none
          "
        >
          <ArrowLeft
            className="h-5 w-5 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={3}
            aria-hidden="true"
          />
          Buscar estudiante
        </Link>

        <div>
          <Link
            href="/certificates/generate"
            className="
              inline-flex items-center gap-2 rounded-full
              bg-[#3B5FC7] px-6 py-2.5 text-sm font-bold text-white
              shadow-sm transition
              hover:bg-[#3250a8]
              focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
              focus-visible:outline-none
              active:translate-y-px
            "
          >
            Generar certificado
          </Link>
        </div>

        {state.kind === "loading" && <LoadingState />}
        {state.kind === "no-selection" && <NoSelectionState />}
        {state.kind === "not-found" && <NotFoundState />}
        {state.kind === "loaded" && <ProfileContent profile={state.profile} />}
      </div>
    </main>
  );
}

function ProfileContent({ profile }: { profile: StudentProfile }) {
  const {
    student,
    phones,
    phoneFetchStatus,
    enrollmentCount,
    lastEnrollmentYear,
    certificateCount,
  } = profile;

  const fullName = [
    student.firstName,
    student.middleName,
    student.firstLastName,
    student.secondLastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)] sm:p-8">
        <h2 className="text-center text-xl font-extrabold tracking-tight text-[#2861C4] sm:text-2xl">
          Datos personales
        </h2>

        <div className="mt-8 flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#B3C7FA]"
          >
            <User className="h-7 w-7 text-[#3B5FC7]" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1F2937]">Nombre completo</p>
            <p className="mt-0.5 truncate text-base text-gray-700">
              {fullName || "—"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
          <DataField
            icon={CreditCard}
            label="Documento de identidad"
            value={student.documentNumber}
          />
          <DataField
            icon={FileText}
            label="Tipo de documento"
            value={student.documentType?.name ?? null}
          />
          <DataField
            icon={Calendar}
            label="Fecha de nacimiento"
            value={formatDate(student.birthDate)}
          />
          <DataField
            icon={UserRound}
            label="Género"
            value={student.gender?.name ?? null}
          />
          <DataField
            icon={MapPin}
            label="Lugar de nacimiento"
            value={student.municipality?.name ?? null}
          />
          <DataField
            icon={Mail}
            label="Correo electrónico"
            value={student.email}
          />
          <DataField icon={Home} label="Dirección" value={student.address} />
          <PhonesField
            phones={phones}
            help={phoneHelpText(phoneFetchStatus, phones.length)}
          />
        </div>
      </section>

      <aside className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)] sm:p-8">
        <div className="flex flex-col gap-6">
          <SummaryStat
            icon={Award}
            label="Certificados emitidos"
            value={certificateCount === null ? "—" : String(certificateCount)}
          />

          <hr className="border-gray-200" />

          <SummaryStat
            icon={GraduationCap}
            label="Último año cursado"
            value={
              lastEnrollmentYear !== null ? String(lastEnrollmentYear) : "—"
            }
            emphasize
          />

          <hr className="border-gray-200" />

          <SummaryStat
            icon={Layers}
            label="Matrículas registradas"
            value={String(enrollmentCount)}
          />
        </div>
      </aside>
    </div>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────

function DataField({
  icon: Icon,
  label,
  value,
  help,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
  /** Optional small caption below the value (e.g. explains an empty field). */
  help?: string;
}) {
  const displayValue = value && value.trim() !== "" ? value : "—";
  const isMissing = displayValue === "—";

  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="
          flex h-9 w-9 shrink-0 items-center justify-center rounded-md
          bg-[#EAF1FC] text-[#2861C4]
        "
      >
        <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[#1F2937]">{label}</p>
        <p
          className={`mt-0.5 truncate text-sm ${
            isMissing ? "text-gray-400" : "text-gray-600"
          }`}
          title={displayValue}
        >
          {displayValue}
        </p>
        {help && (
          <p className="mt-0.5 text-xs leading-snug text-gray-400">
            {help}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Phone field with three display branches:
 *
 *   - 0 phones + caption → the caption alone, in place of the value.
 *                         No "—" placeholder when there is a caption
 *                         ("Sin teléfonos registrados", an error
 *                         message, etc.), because the caption already
 *                         explains why the field is empty — showing
 *                         both would read as "—  Sin teléfonos
 *                         registrados", which is redundant.
 *   - 0 phones, no caption → "—" (same as every other empty DataField).
 *   - 1 phone   → plain inline value, exactly like DataField renders a
 *                 single-line string. No chip, no control — a single
 *                 number is not a list, so it shouldn't look like one.
 *   - N phones  → a collapsible dropdown. The trigger is a soft-blue
 *                 chip showing the count and a chevron; expanded, it
 *                 reveals every number, one per row, each on its own
 *                 soft-blue chip.
 *
 * Placed last in the field grid on purpose: when expanded, the dropdown
 * grows the cell vertically — anchoring it at the bottom means it pushes
 * only its own card's boundary downward instead of unbalancing a
 * neighbouring row.
 *
 * Accessibility:
 *   - The trigger is a real `<button>` with `aria-expanded` and
 *     `aria-controls`, so keyboard users can open/close with Enter or
 *     Space, and screen readers announce the collapsed/expanded state.
 *   - `aria-hidden` is set on the decorative chevron and phone icon.
 */
function PhonesField({
  phones,
  help,
}: {
  phones: string[];
  /** Optional small caption below the list (e.g. explains an empty state). */
  help?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isEmpty = phones.length === 0;
  const isSingle = phones.length === 1;
  const isMultiple = phones.length > 1;

  const listId = "student-phones-list";

  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="
          flex h-9 w-9 shrink-0 items-center justify-center rounded-md
          bg-[#EAF1FC] text-[#2861C4]
        "
      >
        <Phone className="h-4.5 w-4.5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[#1F2937]">
          {isMultiple ? "Teléfonos" : "Teléfono"}
        </p>

        {/* ── Empty ─────────────────────────────────────────────── */}
        {/*
          When a caption exists it replaces the "—" placeholder, since
          the caption itself explains the absence. When there is no
          caption (unexpected edge case), fall back to the standard
          "—" so the layout is never blank.
        */}
        {isEmpty &&
          (help ? (
            <p className="mt-0.5 text-[13px] leading-snug text-gray-400">
              {help}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-gray-400">—</p>
          ))}

        {/* ── Single phone — plain inline value, no control ─────── */}
        {isSingle && (
          <p
            className="mt-0.5 truncate font-mono text-sm tabular-nums text-gray-600"
            title={phones[0]}
          >
            {phones[0]}
          </p>
        )}

        {/* ── Multiple phones — collapsible dropdown ────────────── */}
        {isMultiple && (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-controls={listId}
              className="
                inline-flex max-w-full items-center gap-1.5
                rounded-md bg-[#EAF1FC] px-2 py-1
                text-xs font-semibold text-[#1D468E]
                transition
                hover:bg-[#DDE9FB]
                focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                focus-visible:outline-none
              "
            >
              <Phone
                aria-hidden="true"
                className="h-3 w-3 shrink-0 text-[#2861C4]"
                strokeWidth={2}
              />
              <span className="truncate">
                Ver {phones.length} teléfonos
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`
                  h-3.5 w-3.5 shrink-0 text-[#2861C4]
                  transition-transform duration-200
                  ${isOpen ? "rotate-180" : ""}
                `}
                strokeWidth={2.5}
              />
            </button>

            {isOpen && (
              <ul
                id={listId}
                className="mt-1 flex flex-col gap-1"
              >
                {phones.map((number) => (
                  <li key={number} className="min-w-0">
                    <span
                      title={number}
                      className="
                        inline-flex max-w-full min-w-0 items-center gap-1.5
                        rounded-md bg-[#EAF1FC] px-2 py-1
                        font-mono text-xs tabular-nums text-[#1D468E]
                      "
                    >
                      <Phone
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0 text-[#2861C4]"
                        strokeWidth={2}
                      />
                      <span className="min-w-0 truncate">{number}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  emphasize = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Icon
          aria-hidden="true"
          className="h-9 w-9 shrink-0 text-[#2861C4]"
          strokeWidth={1.5}
        />
        <p className="text-sm font-bold text-[#1F2937]">{label}</p>
      </div>
      <p
        className={`
          mt-2 text-center font-extrabold text-[#1F2937]
          ${emphasize ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}
        `}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-3xl bg-white p-8 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)]">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B5FC7]" />
        <p className="text-sm">Cargando perfil del estudiante…</p>
      </div>
    </div>
  );
}

function NoSelectionState() {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)] sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF1FC]">
        <Search className="h-6 w-6 text-[#2861C4]" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-[#1F2937]">
        Selecciona un estudiante
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        Para ver el perfil, primero busca un estudiante y haz clic en uno de
        los resultados.
      </p>
      <Link
        href="/certificates"
        className="
          mt-6 inline-flex items-center gap-2 rounded-full
          bg-[#3B5FC7] px-6 py-2.5 text-sm font-bold text-white
          shadow-sm transition
          hover:bg-[#3250a8]
          focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
          focus-visible:outline-none
          active:translate-y-px
        "
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Ir a la búsqueda
      </Link>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)] sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF1F1]">
        <UserRound className="h-6 w-6 text-[#E5484D]" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-[#1F2937]">
        No pudimos encontrar al estudiante
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        El estudiante solicitado no existe o ya no está disponible. Vuelve a
        la búsqueda para intentarlo de nuevo.
      </p>
      <Link
        href="/certificates"
        className="
          mt-6 inline-flex items-center gap-2 rounded-full
          bg-[#3B5FC7] px-6 py-2.5 text-sm font-bold text-white
          shadow-sm transition
          hover:bg-[#3250a8]
          focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
          focus-visible:outline-none
          active:translate-y-px
        "
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la búsqueda
      </Link>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

/**
 * Small caption shown under the phone field.
 *
 * The happy path (200 + N≥1 phones) returns `undefined` so no caption
 * is rendered — the value or the dropdown trigger speaks for itself.
 */
function phoneHelpText(status: number, count: number): string | undefined {
  if (status === 0) return "No se pudo consultar (error de conexión)";
  if (status === 403) return "Tu rol no tiene permiso para consultar teléfonos";
  if (status === 404) return "Servicio no disponible (404)";
  if (status !== 200) return `No disponible (código ${status})`;
  if (count === 0) return "Sin teléfonos registrados";
  return undefined;
}
