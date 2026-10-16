"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Printer,
  Search,
  X,
} from "lucide-react";

import {
  fetchCertificateSignersAction,
  fetchDocumentTypesAction,
  fetchInstitutionForCertificateAction,
  fetchNextActNumberAction,
  fetchStudentAcademicHistoryAction,
  fetchStudentProfileAction,
  registerCertificateRecipientAction,
  registerCertificatesAction,
  type CertificateSigners,
  type DocumentTypeOption,
  type InstitutionForCertificate,
} from "@/app/certificates/actions";
import { CertificateDocument } from "@/components/certificates/document/CertificateDocument";
import {
  CertificateDeliveryDialog,
  type CertificateDeliveryFormData,
} from "@/components/certificates/CertificateDeliveryDialog";
import { CertificateCancelDialog } from "@/components/certificates/CertificateCancelDialog";
import { CertificateSuccessDialog } from "@/components/certificates/CertificateSuccessDialog";

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
  /**
   * Act numbers, one per selected enrollment. During the initial preview
   * this array only contains a single entry (the *previewed* next number
   * from `GET /certificates/next-act-number`); the document falls back to
   * that entry for every page. After the delivery flow persists the
   * certificates, this array is replaced with the real per-page numbers.
   */
  actNumbers: (string | null)[];
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

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Long-form Spanish date, formatted as `YYYY-MM-DD` for the backend's
 * DATEONLY column, computed in the institution's timezone.
 */
function toIsoDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Opens the browser's print dialog with the certificate's own name as the
 * suggested "Save as PDF" filename.
 *
 * Chrome, Firefox and Safari all read `document.title` when they build
 * the default filename for the print-to-PDF flow. The document title is
 * temporarily swapped to `certificado-académico-<actNumber>` for the
 * duration of the dialog, then restored.
 */
function printCertificate(actNumber: string | null): void {
  const originalTitle = document.title;
  const suffix = actNumber ?? "sin-número";

  document.title = `certificado-académico-${suffix}`;

  try {
    window.print();
  } finally {
    window.setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function CertificatePreviewPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [pageIndex, setPageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Delivery registration state ────────────────────────────────────────
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  const [documentTypes, setDocumentTypes] = useState<DocumentTypeOption[]>([]);
  const [isLoadingDocumentTypes, setIsLoadingDocumentTypes] = useState(false);

  // ── Cancel-confirmation state ──────────────────────────────────────────
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // ── Success-confirmation state ─────────────────────────────────────────
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

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

        if (!profile) {
          setState({ kind: "missing-data" });
          return;
        }

        const institutionForPreview = institution ?? INSTITUTION_FALLBACK;

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
            // Single-element array during preview — the document
            // falls back to it for every page.
            actNumbers: [actNumber],
            student,
            institution: institutionForPreview,
            enrollments,
            signers,
            issueDate: formatIssueDate(),
          },
        });
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

  const safePageIndex = Math.min(pageIndex, totalPages - 1);

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

  // ── Delivery dialog ─────────────────────────────────────────────────────

  function openDeliveryDialog() {
    setDeliveryError(null);
    setDeliveryOpen(true);

    if (documentTypes.length === 0 && !isLoadingDocumentTypes) {
      const token = getToken();
      if (!token) return;

      setIsLoadingDocumentTypes(true);
      fetchDocumentTypesAction(token)
        .then((types) => setDocumentTypes(types))
        .finally(() => setIsLoadingDocumentTypes(false));
    }
  }

  function closeDeliveryDialog() {
    if (isSubmittingDelivery) return;
    setDeliveryOpen(false);
    setDeliveryError(null);
  }

  function handleDeliveryCancel() {
    if (isSubmittingDelivery) return;
    setCancelDialogOpen(true);
  }

  async function handleDeliveryConfirm(data: CertificateDeliveryFormData) {
    const token = getToken();
    const payload = getTokenPayload();
    if (!token || !payload) {
      setDeliveryError(
        "La sesión no está disponible. Vuelve a iniciar sesión e inténtalo de nuevo."
      );
      return;
    }

    if (state.kind !== "ready") return;

    setIsSubmittingDelivery(true);
    setDeliveryError(null);

    // ── 1. Register the recipient (delivery actor) ─────────────────────
    // `relationship` is one of the critical identification fields the
    // backend uses to decide whether a returning recipient is the same
    // person whose address should be updated.
    const recipientResult = await registerCertificateRecipientAction(token, {
      firstName: data.firstName,
      middleName: data.middleName || undefined,
      lastName: data.lastName,
      secondLastName: data.secondLastName || undefined,
      documentTypeId: data.documentTypeId,
      documentNumber: data.documentNumber,
      relationship: data.relationship,
      address: data.address,
      phones: data.phones,
    });

    if (!recipientResult.success) {
      setIsSubmittingDelivery(false);
      setDeliveryError(recipientResult.message);
      return;
    }

    // ── 2. Persist one certificate per selected enrollment ─────────────
    // This is the step that was missing before: the `certificado` table
    // only gets a row once this call succeeds.
    const certificateResult = await registerCertificatesAction(token, {
      userId: String(payload.id),
      institutionId: String(state.data.institution.id || 1),
      enrollmentIds: state.data.enrollments.map((e) => e.enrollmentId),
      recipientId: recipientResult.recipientId,
      issueDate: toIsoDate(new Date()),
    });

    setIsSubmittingDelivery(false);

    if (!certificateResult.success) {
      // Surface both the failure message and (if partial) which numbers
      // *did* get persisted, so the user knows what state the DB is in.
      const partial =
        certificateResult.actNumbers.length > 0
          ? ` Se registraron ${certificateResult.actNumbers.length} certificado(s): ${certificateResult.actNumbers.join(", ")}.`
          : "";
      setDeliveryError(certificateResult.message + partial);
      return;
    }

    // ── 3. Swap the preview act number(s) for the real ones ───────────
    // The document re-renders with per-page numbers; the print dialog
    // then captures the accurate document.
    setState((prev) =>
      prev.kind === "ready"
        ? {
            ...prev,
            data: { ...prev.data, actNumbers: certificateResult.actNumbers },
          }
        : prev
    );

    // Close the delivery dialog.
    setDeliveryOpen(false);
    setDeliveryError(null);

    // ── 4. Print, then show the success confirmation ───────────────────
    // 60 ms lets React unmount the delivery dialog and commit the
    // act-number state update before the print dialog is captured.
    const firstAct = certificateResult.actNumbers[0] ?? null;
    window.setTimeout(() => {
      printCertificate(firstAct);
      setSuccessDialogOpen(true);
    }, 60);
  }

  // ── Success confirmation ────────────────────────────────────────────────

  function handleSuccessAccept() {
    setSuccessDialogOpen(false);
    clearSelectedEnrollments();
    router.replace("/certificates");
  }

  // ── Cancel confirmation ─────────────────────────────────────────────────

  function handleCancel() {
    setCancelDialogOpen(true);
  }

  function handleCancelDialogClose() {
    setCancelDialogOpen(false);
  }

  function handleCancelDialogConfirm() {
    setCancelDialogOpen(false);
    setDeliveryOpen(false);
    setDeliveryError(null);
    clearSelectedEnrollments();
    router.replace("/dashboard");
  }

  // ── Toolbar handlers ────────────────────────────────────────────────────

  function handlePrint() {
    openDeliveryDialog();
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
                actNumbers={state.data.actNumbers}
                totalPages={totalPages}
                onPrint={handlePrint}
                onCancel={handleCancel}
              />
            </div>

            {/*
             * The ONLY scroller on the page. Everything above (toolbar)
             * and below (pagination) stays anchored to the viewport edge
             * regardless of how far the user scrolls the certificate.
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
                actNumbers={state.data.actNumbers}
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

      {/*
       * Delivery registration modal — the print action only fires after
       * the recipient has been registered against the API and the
       * certificate has been persisted.
       */}
      <CertificateDeliveryDialog
        open={deliveryOpen}
        documentTypes={documentTypes}
        isLoadingDocumentTypes={isLoadingDocumentTypes}
        isSubmitting={isSubmittingDelivery}
        serverError={deliveryError}
        onClose={closeDeliveryDialog}
        onCancel={handleDeliveryCancel}
        onConfirm={handleDeliveryConfirm}
      />

      {/*
       * Cancel-confirmation modal. Layered above the delivery dialog
       * (z-60 vs z-50).
       */}
      <CertificateCancelDialog
        open={cancelDialogOpen}
        onClose={handleCancelDialogClose}
        onConfirm={handleCancelDialogConfirm}
      />

      {/*
       * Success-confirmation modal. Layered above both of the above
       * (z-70). Not dismissable by backdrop, Escape, or X.
       */}
      <CertificateSuccessDialog
        open={successDialogOpen}
        onAccept={handleSuccessAccept}
      />
    </main>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

function Toolbar({
  actNumbers,
  totalPages,
  onPrint,
  onCancel,
}: {
  actNumbers: (string | null)[];
  totalPages: number;
  onPrint: () => void;
  onCancel: () => void;
}) {
  // Show the range when more than one number is known (post-persistence),
  // otherwise the single previewed number (preview phase).
  const clean = actNumbers.filter((n): n is string => typeof n === "string");
  const actLabel =
    clean.length === 0
      ? "—"
      : clean.length === 1
        ? `N° ${clean[0]}`
        : `N° ${clean[0]} a ${clean[clean.length - 1]}`;

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
          {actLabel}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          {totalPages} {totalPages === 1 ? "página" : "páginas"}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton icon={Printer} label="Imprimir" onClick={onPrint} />
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

function PaginationControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: {
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
          focus-visible:focus-visible:outline-none
          active:translate-y-px
        "
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la búsqueda
      </Link>
    </div>
  );
}
