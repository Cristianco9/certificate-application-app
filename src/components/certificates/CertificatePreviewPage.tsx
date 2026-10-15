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

// ── Print helper ────────────────────────────────────────────────────────────

/**
 * Opens the browser's print dialog with the certificate's own name as the
 * suggested "Save as PDF" filename.
 *
 * Chrome, Firefox and Safari all read `document.title` when they build
 * the default filename for the print-to-PDF flow. The document title is
 * temporarily swapped to
 *
 *     Certificado - Académico - <actNumber>
 *
 * (or `Certificado - Académico - sin-número` when the act number could
 * not be fetched) for the duration of the dialog, then restored so the
 * browser tab does not keep the certificate name after the user closes
 * or cancels the print dialog.
 *
 * The act number arrives from the backend in its canonical `YY-NNN`
 * format (e.g. `26-001`). It is emitted verbatim — including the hyphen
 * inside it — so the filename reads as
 * `Certificado - Académico - 26-001`.
 *
 * `window.print()` is blocking in all three engines, so the restore runs
 * right after the dialog closes. A short timeout wraps the restore as a
 * safety net for engines that read the title on the next task instead
 * (observed on rare Chromium builds when the PDF is actually flushed).
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
  // Shown after the delivery registers successfully AND the print dialog
  // has closed. The single "Aceptar" action routes back to /certificates.
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

  // ── Delivery dialog ─────────────────────────────────────────────────────

  /**
   * Opens the delivery registration dialog. Document types are fetched
   * lazily on first open — the preview page already makes five parallel
   * requests on mount, and the delivery catalog is only needed once the
   * user actually commits to delivering.
   */
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

  /**
   * Dismiss the dialog WITHOUT leaving the preview page. Wired to the X
   * button, Escape, and a click on the backdrop. The current certificate
   * stays loaded, and the user can retry or navigate elsewhere.
   */
  function closeDeliveryDialog() {
    if (isSubmittingDelivery) return;
    setDeliveryOpen(false);
    setDeliveryError(null);
  }

  /**
   * Called when the user clicks "Cancelar" inside the delivery dialog.
   *
   * Opens the cancel-confirmation dialog WITHOUT closing the delivery
   * dialog, so dismissing the confirmation returns the user to the
   * delivery form with its data intact (guidelines §66 — the user must
   * always be able to answer "what can I do next?").
   *
   * The delivery dialog stays mounted underneath (its own close path is
   * `onClose`, not `onCancel`), and the cancel dialog is layered above
   * it at `z-60` vs `z-50`.
   */
  function handleDeliveryCancel() {
    if (isSubmittingDelivery) return;
    setCancelDialogOpen(true);
  }

  async function handleDeliveryConfirm(data: CertificateDeliveryFormData) {
    const token = getToken();
    if (!token) {
      setDeliveryError(
        "La sesión no está disponible. Vuelve a iniciar sesión e inténtalo de nuevo."
      );
      return;
    }

    setIsSubmittingDelivery(true);
    setDeliveryError(null);

    // NOTE: `relationship` is accepted by the dialog but not forwarded
    // here — see the comment on `registerCertificateRecipientAction` for
    // why (the backend has no matching column yet).
    const result = await registerCertificateRecipientAction(token, {
      firstName: data.firstName,
      middleName: data.middleName || undefined,
      lastName: data.lastName,
      secondLastName: data.secondLastName || undefined,
      documentTypeId: data.documentTypeId,
      documentNumber: data.documentNumber,
      address: data.address,
      phones: data.phones,
    });

    setIsSubmittingDelivery(false);

    if (!result.success) {
      setDeliveryError(result.message);
      return;
    }

    // Success → close the delivery dialog, print, then confirm.
    const actNumber =
      state.kind === "ready" ? state.data.actNumber : null;

    setDeliveryOpen(false);
    setDeliveryError(null);

    // The trailing 60 ms delay lets React unmount the delivery dialog
    // before the print dialog is captured — otherwise Safari and older
    // Chromium builds may snapshot the modal into the printed page.
    //
    // `window.print()` is blocking, so `setSuccessDialogOpen(true)` runs
    // only after the user closes (or cancels) the print dialog — the
    // success confirmation lands on top of the preview page with no
    // modal-in-modal overlap.
    window.setTimeout(() => {
      printCertificate(actNumber);
      setSuccessDialogOpen(true);
    }, 60);
  }

  // ── Success confirmation ────────────────────────────────────────────────

  /**
   * "Aceptar" on the success dialog. The certificate flow is complete:
   * discard the enrollment selection (so a future visit to the preview
   * starts fresh) and route back to the search page. The search session
   * itself is NOT cleared — the user's filters and result rows stay
   * intact, so they return to exactly where they left off.
   */
  function handleSuccessAccept() {
    setSuccessDialogOpen(false);
    clearSelectedEnrollments();
    router.replace("/certificates");
  }

  // ── Cancel confirmation ─────────────────────────────────────────────────

  /**
   * Toolbar "Cancelar" → open the confirmation dialog rather than
   * redirecting immediately. A generated certificate represents an
   * institutional document, and the enrollment selection behind it may
   * have taken several minutes to assemble — silently discarding it on
   * a single click is far too easy to trigger by accident.
   */
  function handleCancel() {
    setCancelDialogOpen(true);
  }

  /**
   * Dismiss the confirmation. The user keeps their place:
   *   - Opened from the toolbar  → back to the preview page.
   *   - Opened from the delivery dialog → the delivery form is still
   *     mounted underneath, with its filled data intact.
   */
  function handleCancelDialogClose() {
    setCancelDialogOpen(false);
  }

  /**
   * Confirm the cancellation. Closes any open dialogs, discards the
   * enrollment selection, and routes to the dashboard — the exact
   * behavior the toolbar's "Cancelar" button used to have.
   */
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
                actNumber={state.data.actNumber}
                totalPages={totalPages}
                onPrint={handlePrint}
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

      {/*
       * Delivery registration modal — the print action only fires after
       * the recipient has been registered against the API.
       *
       * Two distinct exits:
       *   - onClose  → dismiss this dialog, keep the preview open
       *   - onCancel → open the cancel-confirmation on top. This dialog
       *                stays mounted underneath, so dismissing the
       *                confirmation returns the user to their filled
       *                delivery form.
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
       * (z-60 vs z-50) so it can appear on top of it. Dismissing returns
       * the user to whatever they were doing; confirming clears the
       * enrollment selection and routes to /dashboard.
       */}
      <CertificateCancelDialog
        open={cancelDialogOpen}
        onClose={handleCancelDialogClose}
        onConfirm={handleCancelDialogConfirm}
      />

      {/*
       * Success-confirmation modal. Layered above both of the above
       * (z-70). Not dismissable by backdrop, Escape, or X — the only
       * path forward is "Aceptar", which routes to /certificates so the
       * user can search for the next student.
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
  actNumber,
  totalPages,
  onPrint,
  onCancel,
}: {
  actNumber: string | null;
  totalPages: number;
  onPrint: () => void;
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
