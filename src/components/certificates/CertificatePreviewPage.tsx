"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
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

export function CertificatePreviewPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });

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
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

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
    <main className="min-h-full bg-[#F0EDED] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 print:bg-white print:p-0">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 print:max-w-none print:gap-0">
        {/* Page header */}
        <div className="rounded-xl bg-[#3B5FC7] px-4 py-2.5 text-center shadow-sm print:hidden">
          <h1 className="text-sm font-extrabold tracking-[0.08em] text-white uppercase sm:text-base">
            Vista previa del certificado
          </h1>
        </div>

        {/* Back link */}
        <Link
          href="/certificates/generate"
          aria-label="Volver a la selección de matrículas"
          className="
            group -ml-2 inline-flex w-fit items-center gap-2.5 rounded-lg
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

        {state.kind === "loading" && <LoadingState />}
        {state.kind === "no-selection" && <NoSelectionState />}
        {state.kind === "missing-data" && <MissingDataState />}

        {state.kind === "ready" && (
          <>
            <Toolbar
              actNumber={state.data.actNumber}
              totalPages={Math.max(state.data.enrollments.length, 1)}
              onPrint={handlePrint}
              onDownload={handleDownload}
              onCancel={handleCancel}
            />

            <CertificateDocument
              actNumber={state.data.actNumber}
              student={state.data.student}
              institution={state.data.institution}
              enrollments={state.data.enrollments}
              signers={state.data.signers}
              issueDate={state.data.issueDate}
            />
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
        print:hidden
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

// ── Fallback states ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-2xl bg-white p-8 shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)] print:hidden">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B5FC7]" />
        <p className="text-sm">Preparando la vista previa…</p>
      </div>
    </div>
  );
}

function NoSelectionState() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)] sm:p-12 print:hidden">
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
    <div className="rounded-2xl bg-white p-8 text-center shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)] sm:p-12 print:hidden">
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
