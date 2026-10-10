"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileWarning,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";

import {
  fetchStudentAcademicHistoryAction,
  fetchStudentProfileAction,
  type AcademicHistoryRow,
  type StudentProfile,
} from "@/app/certificates/actions";
import { getToken } from "@/lib/auth/token";
import { getSelectedStudentId } from "@/lib/certificates/searchSession";

// ── Types ───────────────────────────────────────────────────────────────────

type EnrollmentGroup = {
  enrollmentId: number;
  year: number | null;
  gradeName: string | null;
  groupName: string | null;
  subjects: AcademicHistoryRow[];
};

type SelectionMode = "specific" | "all";

type ViewState =
  | { kind: "loading" }
  | { kind: "loaded"; profile: StudentProfile; groups: EnrollmentGroup[] }
  | { kind: "no-selection" }
  | { kind: "not-found" };

// ── Helpers ─────────────────────────────────────────────────────────────────

function getFullName(student: StudentProfile["student"]): string {
  return [
    student.firstName,
    student.middleName,
    student.firstLastName,
    student.secondLastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function groupHistoryByEnrollment(rows: AcademicHistoryRow[]): EnrollmentGroup[] {
  const map = new Map<number, EnrollmentGroup>();

  for (const row of rows) {
    if (row.enrollmentId === null) continue;

    let group = map.get(row.enrollmentId);
    if (!group) {
      group = {
        enrollmentId: row.enrollmentId,
        year: row.year,
        gradeName: row.grade?.name ?? null,
        groupName: row.group?.name ?? null,
        subjects: [],
      };
      map.set(row.enrollmentId, group);
    }
    group.subjects.push(row);
  }

  // Oldest year first — matches the natural reading order of an academic history.
  return Array.from(map.values()).sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
}

/**
 * Average of the numeric subjects of a single enrollment.
 *
 * Uses the effective grade per subject (the higher of originalScore /
 * remedialScore) so a student whose remedial exam lifted a failing grade
 * isn't penalized in the summary. Alphabetic scores are skipped — there
 * is no meaningful numeric average to derive from them without the
 * backend's equivalence table (which the frontend must not duplicate).
 */
function computeAverage(subjects: AcademicHistoryRow[]): string {
  const numeric = subjects
    .filter((s) => s.scoreType === "NUMERICA" && s.subject)
    .map((s) => {
      const orig = parseFloat(s.originalScore);
      const rem = parseFloat(s.remedialScore);
      const candidates = [orig, rem].filter((v) => !Number.isNaN(v));
      return candidates.length ? Math.max(...candidates) : null;
    })
    .filter((v): v is number => v !== null);

  if (numeric.length === 0) return "—";

  const avg = numeric.reduce((sum, v) => sum + v, 0) / numeric.length;
  return avg.toFixed(1);
}

// ── Main component ──────────────────────────────────────────────────────────

export function CertificateGenerationPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [mode, setMode] = useState<SelectionMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  // ── Fetch on mount ──────────────────────────────────────────────────────
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

    Promise.all([
      fetchStudentProfileAction(token, String(studentId)),
      fetchStudentAcademicHistoryAction(token, String(studentId)),
    ]).then(([profile, history]) => {
      if (cancelled) return;
      if (!profile) {
        setState({ kind: "not-found" });
        return;
      }

      const groups = groupHistoryByEnrollment(history);
      setState({ kind: "loaded", profile, groups });

      // Default: "Todos" mode, every enrollment checked.
      setSelectedIds(new Set(groups.map((g) => g.enrollmentId)));
      setCurrentIndex(0);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const loaded = state.kind === "loaded" ? state : null;
  const groups = loaded?.groups ?? [];
  const profile = loaded?.profile ?? null;

  const selectedGroups = useMemo(
    () => groups.filter((g) => selectedIds.has(g.enrollmentId)),
    [groups, selectedIds]
  );

  // Clamp the carousel index defensively — the user can freely toggle
  // enrollments off while browsing, which shrinks the visible list.
  const safeIndex =
    selectedGroups.length === 0
      ? 0
      : Math.min(currentIndex, selectedGroups.length - 1);
  const currentGroup = selectedGroups[safeIndex] ?? null;

  // ── Handlers ────────────────────────────────────────────────────────────
  function handleSelectMode(next: SelectionMode) {
    setMode(next);
    if (next === "all") {
      setSelectedIds(new Set(groups.map((g) => g.enrollmentId)));
    }
    // Switching to "specific" keeps the current selection so the user
    // only has to uncheck what they don't want — cheaper than starting over.
    setCurrentIndex(0);
  }

  function handleToggle(id: number) {
    if (mode === "all") return; // checkboxes are disabled in "all" mode
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setCurrentIndex(0);
  }

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setCurrentIndex((i) => Math.min(selectedGroups.length - 1, i + 1));

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <main className="min-h-full bg-[#F0EDED] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        {/* Page title bar */}
        <div className="rounded-xl bg-[#3B5FC7] px-4 py-2.5 text-center shadow-sm">
          <h1 className="text-sm font-extrabold tracking-[0.08em] text-white uppercase sm:text-base">
            Generar certificado
          </h1>
        </div>

        {/* Back link */}
        <Link
          href="/certificates/student"
          aria-label="Volver al perfil del estudiante"
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
          Perfil Estudiante
        </Link>

        {state.kind === "loading" && <LoadingState />}
        {state.kind === "no-selection" && <NoSelectionState />}
        {state.kind === "not-found" && <NotFoundState />}

        {loaded && profile && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <EnrollmentSelector
              profile={profile}
              groups={groups}
              mode={mode}
              selectedIds={selectedIds}
              onSelectMode={handleSelectMode}
              onToggle={handleToggle}
            />
            <ScoresPanel
              currentGroup={currentGroup}
              selectedCount={selectedGroups.length}
              currentIndex={safeIndex}
              onPrev={goPrev}
              onNext={goNext}
            />
          </div>
        )}
      </div>
    </main>
  );
}

// ── Left card: enrollment selector ──────────────────────────────────────────

function EnrollmentSelector({
  profile,
  groups,
  mode,
  selectedIds,
  onSelectMode,
  onToggle,
}: {
  profile: StudentProfile;
  groups: EnrollmentGroup[];
  mode: SelectionMode;
  selectedIds: Set<number>;
  onSelectMode: (mode: SelectionMode) => void;
  onToggle: (id: number) => void;
}) {
  const fullName = getFullName(profile.student);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)] sm:p-6">
      {/* Student header */}
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#B3C7FA]"
        >
          <UserRound className="h-7 w-7 text-[#3B5FC7]" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
            Nombre completo
          </p>
          <p
            className="mt-0.5 truncate text-sm font-semibold text-[#1F2937]"
            title={fullName}
          >
            {fullName || "—"}
          </p>
        </div>
      </div>

      <hr className="border-gray-100" />

      <h2 className="text-center text-base font-extrabold tracking-tight text-[#2861C4]">
        Selección de certificado
      </h2>

      {/* Mode toggle */}
      <div className="flex items-center justify-center gap-2">
        <ModeButton
          active={mode === "specific"}
          onClick={() => onSelectMode("specific")}
        >
          Específico
        </ModeButton>
        <ModeButton
          active={mode === "all"}
          onClick={() => onSelectMode("all")}
        >
          Todos
        </ModeButton>
      </div>

      {/* Enrollment list */}
      {groups.length === 0 ? (
        <p className="rounded-md bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
          Este estudiante no tiene matrículas registradas.
        </p>
      ) : (
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
          {groups.map((group) => (
            <EnrollmentItem
              key={group.enrollmentId}
              group={group}
              checked={selectedIds.has(group.enrollmentId)}
              disabled={mode === "all"}
              onToggle={() => onToggle(group.enrollmentId)}
            />
          ))}
        </ul>
      )}

      {/* Action button */}
      <button
        type="button"
        disabled
        title="Esta función estará disponible próximamente"
        className="
          mt-1 inline-flex h-11 w-full items-center justify-center gap-2
          rounded-full bg-[#3B5FC7] px-6 text-sm font-bold text-white
          shadow-sm transition
          hover:bg-[#3250a8]
          focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30
          focus-visible:outline-none
          active:translate-y-px
          disabled:cursor-not-allowed disabled:opacity-60
          disabled:hover:bg-[#3B5FC7]
        "
      >
        Generar certificado
      </button>
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        inline-flex h-9 min-w-[110px] items-center justify-center rounded-full
        px-5 text-sm font-bold transition
        focus-visible:ring-4 focus-visible:ring-[#3B5FC7]/30 focus-visible:outline-none
        active:translate-y-px
        ${
          active
            ? "bg-[#3B5FC7] text-white shadow-sm hover:bg-[#3250a8]"
            : "border border-[#3B5FC7]/30 bg-white text-[#2861C4] hover:border-[#3B5FC7]/60 hover:bg-[#EAF1FC]"
        }
      `}
    >
      {children}
    </button>
  );
}

function EnrollmentItem({
  group,
  checked,
  disabled,
  onToggle,
}: {
  group: EnrollmentGroup;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={`
          flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition
          ${
            checked
              ? "border-[#3B5FC7] bg-[#EAF1FC]"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }
          ${disabled ? "cursor-default" : ""}
        `}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-[#3B5FC7]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-900">
            Año{" "}
            <span className="font-extrabold text-[#1F2937]">
              {group.year ?? "—"}
            </span>
          </p>
          <p className="truncate text-sm font-bold text-[#1F2937]">
            Grado {group.gradeName ?? "—"}
            {group.groupName && (
              <span className="ml-1.5 text-xs font-normal text-gray-900">
                ({group.groupName})
              </span>
            )}
          </p>
        </div>
      </label>
    </li>
  );
}

// ── Right card: scores + carousel ───────────────────────────────────────────

function ScoresPanel({
  currentGroup,
  selectedCount,
  currentIndex,
  onPrev,
  onNext,
}: {
  currentGroup: EnrollmentGroup | null;
  selectedCount: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const hasMultiple = selectedCount > 1;
  const average = currentGroup ? computeAverage(currentGroup.subjects) : "—";

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)] sm:p-6">
      <h2 className="text-center text-base font-extrabold tracking-tight text-[#2861C4]">
        Notas y materias
      </h2>

      {!currentGroup ? (
        <EmptyScoresState selectedCount={selectedCount} />
      ) : (
        <>
          {/* Header: grade + academic year */}
          <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                Grado
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#1F2937]">
                {currentGroup.gradeName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                Año académico
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#1F2937]">
                {currentGroup.year ?? "—"}
              </p>
            </div>
          </div>

          {/* Scores table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr className="bg-[#F8FAFC]">
                  <th className="border-b border-gray-200 px-3 py-2 text-xs font-extrabold tracking-wider text-[#1F2937] uppercase">
                    Asignatura
                  </th>
                  <th className="w-14 border-b border-gray-200 px-2 py-2 text-center text-xs font-extrabold tracking-wider text-[#1F2937] uppercase">
                    H.S.
                  </th>
                  <th
                    colSpan={2}
                    className="border-b border-l border-gray-200 px-3 py-2 text-center text-xs font-extrabold tracking-wider text-[#1F2937] uppercase"
                  >
                    Calificación
                  </th>
                </tr>
                <tr className="bg-[#F8FAFC]">
                  <th className="border-b border-gray-200" />
                  <th className="border-b border-gray-200" />
                  <th className="w-24 border-b border-l border-gray-200 px-3 py-1.5 text-center text-[11px] font-bold tracking-wide text-[#1F2937] uppercase">
                    Nota
                  </th>
                  <th className="w-24 border-b border-gray-200 px-3 py-1.5 text-center text-[11px] font-bold tracking-wide text-[#1F2937] uppercase">
                    Habilitación
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentGroup.subjects.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-10 text-center text-sm text-gray-400"
                    >
                      Esta matrícula no tiene calificaciones registradas.
                    </td>
                  </tr>
                ) : (
                  currentGroup.subjects.map((row, idx) => (
                    <tr
                      key={`${row.subject?.id ?? idx}-${idx}`}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-3 py-2.5 text-sm text-black">
                        {row.subject?.name ?? "—"}
                      </td>
                      <td className="px-2 py-2.5 text-center text-sm text-[#1F2937] tabular-nums">
                        {row.subject?.hourlyIntensity ?? "—"}
                      </td>
                      <td className="border-l border-gray-100 px-3 py-2.5 text-center">
                        <ScoreCell
                          value={row.originalScore}
                          type={row.scoreType}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ScoreCell
                          value={row.remedialScore}
                          type={row.scoreType}
                          muted
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: carousel + average */}
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <CarouselButton
              direction="prev"
              onClick={onPrev}
              disabled={!hasMultiple || currentIndex === 0}
            />

            <div className="flex min-w-[110px] flex-col items-center">
              <p className="text-[11px] font-bold tracking-wider text-[#1F2937] uppercase">
                Promedio
              </p>
              <p className="text-2xl font-extrabold text-[#1F2937] tabular-nums">
                {average}
              </p>
              {hasMultiple && (
                <p className="mt-0.5 text-xs font-semibold text-gray-600 tabular-nums">
                  {currentIndex + 1} de {selectedCount}
                </p>
              )}
            </div>

            <CarouselButton
              direction="next"
              onClick={onNext}
              disabled={!hasMultiple || currentIndex >= selectedCount - 1}
            />
          </div>
        </>
      )}
    </section>
  );
}

function ScoreCell({
  value,
  type,
  muted = false,
}: {
  value: string;
  type: AcademicHistoryRow["scoreType"];
  muted?: boolean;
}) {
  const isEmpty = !value || value.trim() === "";

  if (isEmpty) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  const isAlphabetic = type === "ALFABETICA";

  return (
    <span
      className={`
        inline-flex items-center justify-center rounded-md px-2 py-0.5
        text-sm font-bold tabular-nums
        ${
          muted
            ? "bg-gray-100 text-gray-600"
            : isAlphabetic
              ? "bg-[#EDE9FE] text-[#6328C4]"
              : "bg-[#EAF1FC] text-[#2861C4]"
        }
      `}
    >
      {value}
    </span>
  );
}

function CarouselButton({
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
    direction === "prev"
      ? "Ver matrícula anterior"
      : "Ver siguiente matrícula";

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

function EmptyScoresState({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 px-6 py-10 text-center">
      <FileWarning
        className="h-6 w-6 text-gray-400"
        aria-hidden="true"
      />
      <p className="text-sm font-bold text-[#1F2937]">
        {selectedCount === 0
          ? "Selecciona al menos una matrícula"
          : "Sin calificaciones para mostrar"}
      </p>
      <p className="max-w-xs text-xs leading-relaxed text-gray-500">
        {selectedCount === 0
          ? "Marca una o varias matrículas en la lista de la izquierda para revisar sus calificaciones."
          : "La matrícula seleccionada no tiene materias ni notas registradas."}
      </p>
    </div>
  );
}

// ── Fallback states ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-2xl bg-white p-8 shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)]">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin text-[#3B5FC7]" />
        <p className="text-sm">Cargando información académica…</p>
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
        Selecciona un estudiante
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        Para generar un certificado, primero busca un estudiante y elige uno
        de los resultados.
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
    <div className="rounded-2xl bg-white p-8 text-center shadow-[0_20px_50px_-30px_rgba(40,97,196,0.25)] sm:p-12">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF1F1]">
        <UserRound className="h-6 w-6 text-[#E5484D]" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-[#1F2937]">
        No pudimos cargar al estudiante
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
