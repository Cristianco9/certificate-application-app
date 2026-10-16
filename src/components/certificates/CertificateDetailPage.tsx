"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  CreditCard,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  MapPin,
  Phone as PhoneIcon,
  Search,
  User,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  fetchCertificateDetailAction,
  type CertificateDetail,
} from "@/app/certificates/actions";
import { getToken } from "@/lib/auth/token";
import { getSelectedCertificateId } from "@/lib/certificates/repositorySession";
import {
  formatColombianDate,
  formatColombianTime,
  formatDateOnly,
} from "@/lib/format/datetime";

type ViewState =
  | { kind: "loading" }
  | { kind: "loaded"; detail: CertificateDetail }
  | { kind: "no-selection" }
  | { kind: "not-found" };

/**
 * Read-only detail view for a single certificate.
 *
 * The certificate id is NOT part of the URL — it travels from the
 * repository table through `sessionStorage` (see
 * `@/lib/certificates/repositorySession`). Opening the route directly
 * shows a "select a certificate first" state rather than a broken page,
 * mirroring the pattern used by `/certificates/student`.
 *
 * Data fetched (best-effort after the first call):
 *   - POST /certificates/list-one
 *   - POST /students/list-one                          (non-fatal → documentType)
 *   - POST /groups/list-one                            (non-fatal → jornada)
 *   - POST /certificate-recipients/list-one            (non-fatal)
 *   - POST /certificate-recipient-phones/get-by-...    (non-fatal)
 *
 * Sections deliberately rendered:
 *   - Recipient (who collected the certificate)
 *   - Student (whose academic history the certificate documents)
 *   - Enrollments, BASIC ONLY — year / grade / group / shift / date
 *     NO subjects, NO scores
 *   - Delivery info — act number, issuer, date + time in Bogotá, status
 */
export function CertificateDetailPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    const certificateId = getSelectedCertificateId();
    if (!certificateId) {
      setState({ kind: "no-selection" });
      return;
    }

    const token = getToken();
    if (!token) {
      setState({ kind: "not-found" });
      return;
    }

    fetchCertificateDetailAction(token, String(certificateId)).then(
      (detail) => {
        if (cancelled) return;
        setState(detail ? { kind: "loaded", detail } : { kind: "not-found" });
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-full bg-[#F0EDED] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="rounded-xl bg-[#3B5FC7] px-4 py-2.5 text-center shadow-sm">
          <h1 className="text-sm font-extrabold tracking-[0.08em] text-white uppercase sm:text-base">
            Detalle del certificado
          </h1>
        </div>

        {/* ── Back link ───────────────────────────────────────────── */}
        <Link
          href="/repository"
          aria-label="Volver al repositorio"
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
          Repositorio
        </Link>

        {state.kind === "loading" && <LoadingState />}
        {state.kind === "no-selection" && <NoSelectionState />}
        {state.kind === "not-found" && <NotFoundState />}
        {state.kind === "loaded" && <DetailContent detail={state.detail} />}
      </div>
    </main>
  );
}

// ── Main content ────────────────────────────────────────────────────────────

function DetailContent({ detail }: { detail: CertificateDetail }) {
  const { certificate, recipientDetail, recipientPhones } = detail;

  // Every enrollment of a certificate belongs to the same student in
  // practice — the bridge `certificado_matricula` links one act number
  // to a single student's trajectory. Fall back to the first enrollment
  // when resolving the student's identity.
  const primaryEnrollment = certificate.enrollments[0] ?? null;
  const student = primaryEnrollment?.student ?? null;

  return (
    <article className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)] sm:p-8">
      {/* ── Section 1 — Recipient ─────────────────────────────────── */}
      <Section icon={User} title="Información del receptor">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadonlyField
            label="Primer nombre"
            value={recipientDetail?.firstName ?? certificate.recipient?.firstName}
          />
          <ReadonlyField
            label="Segundo nombre"
            value={recipientDetail?.middleName ?? certificate.recipient?.middleName}
          />
          <ReadonlyField
            label="Primer apellido"
            value={recipientDetail?.lastName ?? certificate.recipient?.lastName}
          />
          <ReadonlyField
            label="Segundo apellido"
            value={
              recipientDetail?.secondLastName ??
              certificate.recipient?.secondLastName
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadonlyField
            label="Documento de identidad"
            value={
              recipientDetail?.documentNumber ??
              certificate.recipient?.documentNumber
            }
            mono
          />
          <ReadonlyField
            label="Tipo de documento"
            value={recipientDetail?.documentType?.name}
          />
          <ReadonlyField
            label="Parentesco o relación"
            value={recipientDetail?.relationship}
          />
          <PhonesDropdownField phones={recipientPhones} />
        </div>

        <div className="mt-4">
          <ReadonlyField
            label="Dirección"
            value={recipientDetail?.address}
            icon={MapPin}
          />
        </div>
      </Section>

      {/* ── Section 2 — Student ───────────────────────────────────── */}
      <Section icon={GraduationCap} title="Información del estudiante">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadonlyField label="Primer nombre" value={student?.firstName} />
          <ReadonlyField label="Segundo nombre" value={student?.middleName} />
          <ReadonlyField
            label="Primer apellido"
            value={student?.firstLastName}
          />
          <ReadonlyField
            label="Segundo apellido"
            value={student?.secondLastName}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadonlyField
            label="Documento de identidad"
            value={student?.documentNumber}
            icon={CreditCard}
            mono
          />
          <ReadonlyField
            label="Tipo de documento"
            value={student?.documentType?.name}
          />
        </div>
      </Section>

      {/* ── Section 3 — Enrollments (basic only) ──────────────────── */}
      <Section
        icon={Layers}
        title="Matrículas incluidas en el certificado"
      >
        {certificate.enrollments.length === 0 ? (
          <p className="rounded-md bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Este certificado no tiene matrículas asociadas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  <Th>Año</Th>
                  <Th>Grado</Th>
                  <Th>Grupo</Th>
                  <Th>Jornada</Th>
                  <Th>Fecha de matrícula</Th>
                </tr>
              </thead>
              <tbody>
                {certificate.enrollments.map((enrollment) => (
                  <tr
                    key={enrollment.id}
                    className="border-t border-gray-100 last:border-b-0"
                  >
                    <Td>
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 tabular-nums">
                        {enrollment.group?.year ?? "—"}
                      </span>
                    </Td>
                    <Td>{enrollment.group?.grade?.name ?? "—"}</Td>
                    <Td>{enrollment.group?.name ?? "—"}</Td>
                    <Td>
                      {enrollment.group?.shift ? (
                        <span
                          className={`
                            inline-flex items-center rounded px-2 py-0.5
                            text-[10px] font-bold tracking-wide uppercase
                            ${
                              enrollment.group.shift.toLowerCase() === "diurna"
                                ? "bg-[#EAF1FC] text-[#2861C4]"
                                : "bg-[#EDE9FE] text-[#6328C4]"
                            }
                          `}
                        >
                          {enrollment.group.shift}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-gray-600 tabular-nums">
                        {formatDateOnly(enrollment.enrollmentDate)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Section 4 — Delivery info ─────────────────────────────── */}
      <Section icon={Calendar} title="Información de entrega" last>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadonlyField
            label="N° de certificado"
            value={certificate.actNumber}
            mono
          />
          <ReadonlyField
            label="Expedido por"
            value={
              certificate.issuer
                ? `${certificate.issuer.firstName} ${certificate.issuer.lastName}`
                : null
            }
            icon={UserRound}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ReadonlyField
            label="Fecha de entrega"
            value={formatColombianDate(certificate.createdAt)}
            icon={Calendar}
          />
          <ReadonlyField
            label="Hora"
            value={formatColombianTime(certificate.createdAt)}
          />
          <ReadonlyField label="Estado" value={certificate.status} />
        </div>

        {certificate.institution && (
          <div className="mt-4">
            <ReadonlyField
              label="Institución"
              value={certificate.institution.name}
            />
          </div>
        )}
      </Section>
    </article>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
  last = false,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  /** Omits the trailing divider — use on the last section. */
  last?: boolean;
}) {
  return (
    <section className={last ? "" : "mb-8 border-b border-gray-100 pb-8"}>
      <header className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="
            flex h-9 w-9 items-center justify-center rounded-full
            bg-[#EAF1FC] text-[#2861C4]
          "
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
        <h2 className="text-base font-extrabold tracking-tight text-[#2861C4] sm:text-lg">
          {title}
        </h2>
      </header>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function ReadonlyField({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  icon?: LucideIcon;
  mono?: boolean;
}) {
  const display = value && String(value).trim() !== "" ? value : "—";
  const isMissing = display === "—";

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-[#1F2937]">
        {label}
      </span>
      <div
        className="
          flex min-h-10 items-center gap-2 rounded-md border border-gray-200
          bg-gray-50 px-3 py-2 text-sm
        "
      >
        {Icon && (
          <Icon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-gray-400"
            strokeWidth={1.8}
          />
        )}
        <span
          className={`
            min-w-0 truncate
            ${isMissing ? "text-gray-400" : "text-[#1F2937]"}
            ${mono ? "font-mono tabular-nums" : ""}
          `}
          title={display}
        >
          {display}
        </span>
      </div>
    </div>
  );
}

/**
 * Phone field for the recipient, with three display branches:
 *
 *   - 0 phones    → icon + em dash inside the same soft-gray pill that
 *                   every other ReadonlyField uses.
 *   - 1 phone     → plain inline value, mono font, truncatable.
 *   - N phones    → a trigger chip inside the pill; the actual list is
 *                   rendered in an ABSOLUTELY POSITIONED popover that
 *                   floats below the pill.
 *
 * The popover is a SIBLING of the gray pill (both children of the
 * `relative` wrapper), NOT a descendant. This is what keeps the pill
 * at a fixed height: the pill only ever contains the trigger chip, so
 * its `min-h-10` is never exceeded when the list opens. The list lives
 * outside the pill and overlays whatever content comes next.
 *
 * Why float instead of expand: the phone field shares a 4-column grid
 * with document/relationship/address fields. Expanding the gray pill
 * vertically would push the "Dirección" row (and every section below
 * it) down each time the user toggles the list — visually noisy and
 * disorienting on a read-only detail page. Same rationale as a native
 * `<select>`: the trigger stays put, the popover overlays.
 *
 * Interaction:
 *   - Trigger: real `<button>` with `aria-expanded` + `aria-controls`.
 *   - Click outside closes (mousedown + touchstart listeners).
 *   - Escape closes.
 *   - Chevron rotates 180° when open.
 */
function PhonesDropdownField({ phones }: { phones: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const count = phones.length;
  const isEmpty = count === 0;
  const isSingle = count === 1;
  const isMultiple = count > 1;

  const listId = "recipient-phones-list";

  // Close on click/tap outside the field. Uses `mousedown` + `touchstart`
  // (not `click`) so the trigger button's own `onClick` — which fires
  // AFTER `mousedown` — still runs and toggles the state. The
  // `wrapperRef.contains` check makes the trigger's own mousedown a
  // no-op here.
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      <span className="block text-xs font-semibold text-[#1F2937]">
        {isMultiple ? "Teléfonos" : "Teléfono"}
      </span>

      {/*
       * `relative` wrapper that provides the positioning context for the
       * popover. The gray pill and the popover are SIBLINGS, both
       * inside this wrapper — the pill never contains the list.
       */}
      <div className="relative">
        {/* ── Gray pill — height locked to `min-h-10` ─────────────── */}
        <div
          className="
            flex h-10 items-center gap-2 rounded-md border border-gray-200
            bg-gray-50 px-3 text-sm
          "
        >
          {/* ── Empty ─────────────────────────────────────────────── */}
          {isEmpty && (
            <>
              <PhoneIcon
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-gray-400"
                strokeWidth={1.8}
              />
              <span className="text-gray-400">—</span>
            </>
          )}

          {/* ── Single phone — plain inline value ─────────────────── */}
          {isSingle && (
            <>
              <PhoneIcon
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-gray-400"
                strokeWidth={1.8}
              />
              <span
                className="min-w-0 truncate font-mono text-[#1F2937] tabular-nums"
                title={phones[0]}
              >
                {phones[0]}
              </span>
            </>
          )}

          {/* ── Multiple phones — trigger chip inside the pill ────── */}
          {isMultiple && (
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-controls={listId}
              className="
                inline-flex w-full items-center gap-1.5
                rounded-md bg-[#EAF1FC] px-2 py-1
                text-xs font-semibold text-[#1D468E]
                transition
                hover:bg-[#DDE9FB]
                focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
                focus-visible:outline-none
              "
            >
              <PhoneIcon
                aria-hidden="true"
                className="h-3 w-3 shrink-0 text-[#2861C4]"
                strokeWidth={2}
              />
              <span className="flex-1 truncate text-left">
                Ver {count} teléfonos
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
          )}
        </div>

        {/* ── Floating popover — overlays content, does NOT push ──── */}
        {isMultiple && isOpen && (
          <ul
            id={listId}
            className="
              absolute top-full left-0 right-0 z-30 mt-1
              flex max-h-56 flex-col gap-1 overflow-y-auto
              rounded-md border border-gray-200 bg-white
              p-2 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)]
              animate-in fade-in slide-in-from-top-1
              [animation-duration:150ms]
            "
          >
            {phones.map((number) => (
              <li key={number} className="min-w-0">
                <span
                  title={number}
                  className="
                    inline-flex w-full items-center gap-1.5
                    rounded-md bg-[#EAF1FC] px-2 py-1
                    font-mono text-xs tabular-nums text-[#1D468E]
                  "
                >
                  <PhoneIcon
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
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="
        border-b border-gray-200 px-4 py-2.5 text-left
        text-[11px] font-bold tracking-wider text-gray-500 uppercase
      "
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-sm text-[#1F2937]">{children}</td>;
}

// ── Fallback states ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-3xl bg-white p-8 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)]">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B5FC7]" />
        <p className="text-sm">Cargando el detalle del certificado…</p>
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
        Selecciona un certificado
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        Para ver el detalle, primero abre el repositorio y haz clic sobre
        uno de los certificados listados.
      </p>
      <Link
        href="/repository"
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
        Ir al repositorio
      </Link>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-[0_10px_40px_-20px_rgba(15,23,42,0.25)] sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF1F1]">
        <FileText className="h-6 w-6 text-[#E5484D]" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-[#1F2937]">
        No pudimos encontrar el certificado
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        El certificado solicitado no existe o fue eliminado. Vuelve al
        repositorio para continuar.
      </p>
      <Link
        href="/repository"
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
        Volver al repositorio
      </Link>
    </div>
  );
}
