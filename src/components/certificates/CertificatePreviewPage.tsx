"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  Printer,
  Search,
  X,
} from "lucide-react";

import {
  fetchCertificateSignersAction,
  fetchInstitutionForCertificateAction,
  fetchNextActNumberAction,
  fetchStudentAcademicHistoryAction,
  fetchStudentProfileAction,
  type CertificateSigners,
  type InstitutionForCertificate,
} from "@/app/certificates/actions";
import { CertificateDocument } from "@/components/certificates/document/CertificateDocument";

import { getToken, getTokenPayload } from "@/lib/auth/token";
import { getSelectedStudentId } from "@/lib/certificates/searchSession";
import {
  clearSelectedEnrollments,
  getSelectedEnrollments,
} from "@/lib/certificates/previewSession";
import {
  formatIssueDate,
  groupHistoryByEnrollment,
  type EnrollmentBlock,
} from "@/lib/certificates/documentHelpers";

import type { CertificateSearchStudent } from "@/types/certificate-search";

// ── View state ──────────────────────────────────────────────────────────────

type CertificateData = {
  actNumber: string | null;
  student: CertificateSearchStudent;
  institution: InstitutionForCertificate;
  enrollments: EnrollmentBlock[];
  signers: CertificateSigners;
  issueDate: string;
};

type ViewState =
  | { kind: "loading" }
  | { kind: "ready"; data: CertificateData }
  | { kind: "no-selection" }
  | { kind: "missing-data" };

// ── TEMPORARY placeholder institution ───────────────────────────────────────
//
// TEMPORARY — remove once `/institutions/list-one` allows `Secretario`
// and `Rector` (see backend note in `@/app/certificates/actions`).
//
// Today `/institutions/list-one` returns 403 for those two roles, so the
// preview would otherwise refuse to render. This placeholder keeps the
// layout reviewable while the backend authorization is being widened.
//
// The placeholder is CLEARLY marked "—" so nobody mistakes a printed
// preview for a valid certificate. Once the backend edit lands, delete
// this constant and restore the `missing-data` branch below.
const INSTITUTION_FALLBACK: InstitutionForCertificate = {
  id: 0,
  name: "Institución",
  institutionalCode: "—",
  address: "—",
  email: "—",
  nitId: "—",
  municipality: null,
  phones: [],
};

// ── Component ───────────────────────────────────────────────────────────────

/**
 * Certificate preview route.
 *
 * Layout contract:
 *
 *   ┌──────────────────────────────────────────────┐  ← <main> is exactly
 *   │  header bar                                  │    100dvh tall, and
 *   │  back link                                   │    overflow-hidden.
 *   │  toolbar                                     │    The PAGE itself
 *   │  ┌────────────────────────────────────────┐  │    never scrolls.
 *   │  │  scroll container (the ONLY scroller)   │  │
 *   │  │                                        │  │  ← This is where the
 *   │  │      [ certificate — page N ]          │  │    user scrolls to
 *   │  │                                        │  │    see the full page.
 *   │  └────────────────────────────────────────┘  │
 *   │  pagination (always visible)                 │
 *   └──────────────────────────────────────────────┘
 *
 * On a 24-inch desktop the certificate at 1:1 is wider than the container
 * it can grow into, so the horizontal fit is handled by
 * `CertificateDocument` (never wider than the viewport, never magnified
 * past 1:1). Its 35.6 cm (≈14 in) height, however, is almost always
 * taller than the visible area — that vertical overflow is absorbed by
 * the scroll container, not by the browser page.
 */
export function CertificatePreviewPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [pageIndex, setPageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const studentId = getSelectedStudentId();
    const enrollmentIds = getSelectedEnrollments();

    if (!studentId || !enrollmentIds || enrollmentIds.length === 0) {
      setState({ kind: "no-selection" });
      return;
    }

    const token = getToken();
    const payload = getTokenPayload();
    if (!token || !payload) {
      setState({ kind: "missing-data" });
      return;
    }

    Promise.all([
      fetchStudentProfileAction(token, String(studentId)),
      fetchStudentAcademicHistoryAction(token, String(studentId)),
      fetchInstitutionForCertificateAction(token),
      fetchCertificateSignersAction(token, payload.id),
      fetchNextActNumberAction(token),
    ]).then(
      ([profile, history, institution, signers, actNumber]) => {
        if (cancelled) return;

        // The student profile is the only truly required piece — without
        // it there is nothing to certify.
        if (!profile) {
          setState({ kind: "missing-data" });
          return;
        }

        // TEMPORARY: fall back to the placeholder institution when the
        // API rejects the request (403 for Secretario / Rector today).
        // Restore the strict check once the backend authorization is
        // widened — see the comment on INSTITUTION_FALLBACK above.
        const institutionForPreview = institution ?? INSTITUTION_FALLBACK;

        // Trim the academic history down to the selected enrollments.
        const enrollments = groupHistoryByEnrollment(history, enrollmentIds);

        const student: CertificateSearchStudent = {
          id: profile.student.id,
          firstName: profile.student.firstName,
          middleName: profile.student.middleName,
          firstLastName: profile.student.firstLastName,
          secondLastName: profile.student.secondLastName,
          documentNumber: profile.student.documentNumber,
          enrollments: [],
        };

        setState({
          kind: "ready",
          data: {
            actNumber,
            student,
            institution: institutionForPreview,
            enrollments,
            signers,
            issueDate: formatIssueDate(),
          },
        });
        // A fresh load always starts on the cover page.
        setPageIndex(0);
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived pagination ──────────────────────────────────────────────────

  const totalPages =
    state.kind === "ready"
      ? Math.max(state.data.enrollments.length, 1)
      : 1;

  // Clamp on render rather than storing in state — the current index
  // stays valid even if the total changes for any reason.
  const safePageIndex = Math.min(pageIndex, totalPages - 1);

  // Reset the inner scroll to the top whenever the visible page changes,
  // so the user always lands on the top edge of the new sheet — like
  // flipping a page in a PDF viewer.
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [safePageIndex]);

  function goToPrevPage() {
    setPageIndex((i) => Math.max(0, i - 1));
  }

  function goToNextPage() {
    setPageIndex((i) => Math.min(totalPages - 1, i + 1));
  }

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleCancel() {
    clearSelectedEnrollments();
    router.replace("/dashboard");
  }

  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    /* no-op — button disabled until the backend generates a PDF */
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <main
      className="
        h-dvh overflow-hidden bg-[#F0EDED]
        px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6
        print:h-auto print:overflow-visible print:bg-white print:p-0
      "
    >
      <div
        className="
          mx-auto flex h-full w-full max-w-6xl flex-col gap-4
          print:block print:h-auto print:max-w-none print:gap-0
        "
      >
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="shrink-0 rounded-xl bg-[#3B5FC7] px-4 py-2.5 text-center shadow-sm print:hidden">
          <h1 className="text-sm font-extrabold tracking-[0.08em] text-white uppercase sm:text-base">
            Vista previa del certificado
          </h1>
        </div>

        {/* ── Back link ───────────────────────────────────────────── */}
        <Link
          href="/certificates/generate"
          aria-label="Volver a la selección de matrículas"
          className="
            group -ml-2 inline-flex w-fit shrink-0 items-center gap-2.5 rounded-lg
            px-2 py-1.5
            text-sm font-extrabold text-[#E5484D]
            transition
            hover:bg-[#FEF1F1] hover:text-[#B4242A]
            focus-visible:bg-[#FEF1F1] focus-visible:text-[#B4242A]
            focus-visible:ring-4 focus-visible:ring-[#E5484D]/20
            focus-visible:outline-none
            print:hidden
          "
        >
          <ArrowLeft
            className="h-5 w-5 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={3}
            aria-hidden="true"
          />
          Perfil Estudiante
        </Link>

        {/* ── Fallback states — centered in the free space ────────── */}
        {state.kind !== "ready" && (
          <div className="flex min-h-0 flex-1 items-center justify-center py-8 print:block print:py-0">
            {state.kind === "loading" && <LoadingState />}
            {state.kind === "no-selection" && <NoSelectionState />}
            {state.kind === "missing-data" && <MissingDataState />}
          </div>
        )}

        {/* ── Ready state — fixed toolbar, scrollable doc, fixed nav ─ */}
        {state.kind === "ready" && (
          <>
            {/* Toolbar — never scrolls, always visible. */}
            <div className="shrink-0 print:hidden">
              <Toolbar
                actNumber={state.data.actNumber}
                totalPages={totalPages}
                onPrint={handlePrint}
                onDownload={handleDownload}
                onCancel={handleCancel}
              />
            </div>

            {/*
             * The ONLY scroller on the page. Everything above (toolbar)
             * and below (pagination) stays anchored to the viewport edge
             * regardless of how far the user scrolls the certificate.
             *
             * `[scrollbar-gutter:stable]` reserves the scrollbar's width
             * up front, so the certificate's width-fit scale doesn't
             * oscillate as the scrollbar appears/disappears.
             */}
            <div
              ref={scrollContainerRef}
              className="
                min-h-0 flex-1 overflow-y-auto overflow-x-hidden
                rounded-2xl border border-gray-200/80 bg-[#F8FAFC]
                p-4 sm:p-6
                [scrollbar-gutter:stable]
                print:block print:h-auto print:flex-none
                print:overflow-visible print:rounded-none print:border-0
                print:bg-transparent print:p-0
              "
            >
              <CertificateDocument
                actNumber={state.data.actNumber}
                student={state.data.student}
                institution={state.data.institution}
                enrollments={state.data.enrollments}
                signers={state.data.signers}
                issueDate={state.data.issueDate}
                currentPageIndex={safePageIndex}
              />
            </div>

            {/*
             * Pagination is only useful when there is more than one page.
             * A single-page certificate renders without any chrome below
             * the document — cleaner and one less element to explain.
             */}
            {totalPages > 1 && (
              <div className="shrink-0 print:hidden">
                <PaginationControls
                  currentPage={safePageIndex}
                  totalPages={totalPages}
                  onPrev={goToPrevPage}
                  onNext={goToNextPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({
  actNumber,
  totalPages,
  onPrint,
  onDownload,
  onCancel,
}: {
  actNumber: string | null;
  totalPages: number;
  onPrint: () => void;
  onDownload: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="
        flex flex-wrap items-center justify-between gap-3
        rounded-2xl border border-gray-200/80 bg-white
        px-4 py-3 shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)]
        sm:px-5 sm:py-4
      "
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-gray-500">
          certificado —
        </p>
        <p className="text-lg font-extrabold text-[#1F2937] tabular-nums sm:text-xl">
          N° {actNumber ?? "—"}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {totalPages} {totalPages === 1 ? "página" : "páginas"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton icon={Printer} label="Imprimir" onClick={onPrint} />
        <ToolbarButton
          icon={FileDown}
          label="Descargar PDF"
          onClick={onDownload}
          disabled
          title="Disponible cuando se implemente la generación del PDF en el servidor"
        />
        <ToolbarButton
          icon={X}
          label="Cancelar"
          onClick={onCancel}
          variant="danger"
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  title,
  variant = "primary",
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  variant?: "primary" | "danger";
}) {
  const palette =
    variant === "danger"
      ? "bg-[#E5484D] text-white hover:bg-[#C93A3F] focus-visible:ring-[#E5484D]/30"
      : "bg-[#3B5FC7] text-white hover:bg-[#3250a8] focus-visible:ring-[#3B5FC7]/30";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        inline-flex items-center gap-2 rounded-full
        px-4 py-2 text-sm font-bold shadow-sm transition
        focus-visible:outline-none focus-visible:ring-4
        active:translate-y-px
        disabled:cursor-not-allowed disabled:opacity-60
        ${palette}
      `}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

// ── Pagination footer ──────────────────────────────────────────────────────

/**
 * Prev / next page navigation for the on-screen certificate carousel.
 *
 * Styled to match the enrollment-selection carousel (soft-blue circular
 * chevron buttons flanking a centered label) so the two views feel like
 * the same flow. Only rendered when the certificate has more than one
 * page — a single-page certificate needs no navigation.
 *
 * Accessibility:
 *   - The wrapper is a `<nav>` with a descriptive `aria-label`.
 *   - Each button carries its own `aria-label` and a real `disabled`
 *     state (not just a visual one).
 *   - The "Página X de Y" text uses `aria-live="polite"` so a screen
 *     reader announces the new page when the user presses a chevron.
 */
function PaginationControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
  /** Zero-based index of the page currently shown. */
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const isFirst = currentPage === 0;
  const isLast = currentPage >= totalPages - 1;

  return (
    <nav
      aria-label="Navegación de páginas del certificado"
      className="
        flex items-center justify-center gap-4
        rounded-2xl border border-gray-200/80 bg-white
        px-4 py-3
        shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)]
      "
    >
      <PageNavButton
        direction="prev"
        onClick={onPrev}
        disabled={isFirst}
      />

      <p
        aria-live="polite"
        className="
          min-w-[7rem] text-center text-sm font-bold text-[#1F2937]
          tabular-nums
        "
      >
        Página {currentPage + 1} de {totalPages}
      </p>

      <PageNavButton
        direction="next"
        onClick={onNext}
        disabled={isLast}
      />
    </nav>
  );
}

function PageNavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  const label =
    direction === "prev" ? "Página anterior" : "Página siguiente";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="
        flex h-10 w-10 shrink-0 items-center justify-center rounded-full
        bg-[#EAF1FC] text-[#2861C4] transition
        hover:bg-[#DDE9FB]
        focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
        focus-visible:outline-none
        active:translate-y-px
        disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300
        disabled:hover:bg-gray-100
      "
    >
      <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}

// ── Fallback states ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-2xl bg-white p-8 shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)]">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B5FC7]" />
        <p className="text-sm">Preparando la vista previa…</p>
      </div>
    </div>
  );
}

function NoSelectionState() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)] sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF1FC]">
        <Search className="h-6 w-6 text-[#2861C4]" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-[#1F2937]">
        No hay matrículas seleccionadas
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        Para ver la vista previa del certificado, primero selecciona al
        menos una matrícula del estudiante.
      </p>
      <Link
        href="/certificates/generate"
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
        Ir a la selección
      </Link>
    </div>
  );
}

function MissingDataState() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)] sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF1F1]">
        <Search className="h-6 w-6 text-[#E5484D]" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-[#1F2937]">
        No pudimos cargar los datos del certificado
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        Faltan datos del estudiante o de la institución. Vuelve a intentarlo
        desde la búsqueda.
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
