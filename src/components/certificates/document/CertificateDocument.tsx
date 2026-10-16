"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";

import type {
  CertificateSigner,
  CertificateSigners,
  InstitutionForCertificate,
} from "@/app/certificates/actions";
import type { CertificateSearchStudent } from "@/types/certificate-search";
import { INSTITUTION_STATIC_CONFIG } from "@/lib/certificates/institutionConfig";
import {
  formatGradesRange,
  formatYearsRange,
  getFullNameUpper,
  isOldScale,
  type EnrollmentBlock,
} from "@/lib/certificates/documentHelpers";

import styles from "./CertificateDocument.module.css";

// ── Physical page dimensions (Oficio) ──────────────────────────────────────

const PAGE_WIDTH_CM = 21.6;
const PAGE_HEIGHT_CM = 35.6;

/** CSS reference pixels per centimeter (1in = 96px, 1in = 2.54cm). */
const PX_PER_CM = 96 / 2.54;

/**
 * `useLayoutEffect` on the client, `useEffect` during SSR.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  /**
   * One act number per page (enrollment). Index 0 corresponds to page 1.
   *
   * During the preview phase this array only contains a single previewed
   * number — the pages fall back to it so the user sees an approximation.
   * After the delivery flow runs `registerCertificatesAction`, the array
   * is replaced with the real numbers, one per enrollment, and each page
   * prints its own.
   *
   * May contain `null` entries when a number could not be resolved; the
   * fallback chain handles that (page → array[0] → null).
   */
  actNumbers: (string | null)[];
  student: CertificateSearchStudent;
  institution: InstitutionForCertificate;
  enrollments: EnrollmentBlock[];
  signers: CertificateSigners;
  /** Pre-formatted display date, e.g. "13 de octubre de 2026". */
  issueDate: string;
  /**
   * Zero-based index of the page currently visible on screen.
   * Ignored in print — every page renders.
   */
  currentPageIndex?: number;
};

/**
 * Renders the certificate as an Oficio-sized page.
 *
 * Pagination rule: ONE PAGE PER ENROLLMENT. The first page carries the
 * student's opening sentence; the last page carries the legal footer and
 * the two signatures. Every page carries:
 *   - the institution header (letterhead),
 *   - the document identifier bar: "CERTIFICADO N° <actNumber>" centered,
 *     with "Página X de Y" on the same line, right-aligned.
 *
 * SCORING SYSTEM: the certificate's legal text is chosen based on the
 * scoring system the scores belong to (see `isOldScale`).
 */
export function CertificateDocument({
  actNumbers,
  student,
  institution,
  enrollments,
  signers,
  issueDate,
  currentPageIndex = 0,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useIsomorphicLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const style = getComputedStyle(viewport);
      const paddingX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const available = viewport.clientWidth - paddingX;
      const pageWidthPx = PAGE_WIDTH_CM * PX_PER_CM;

      const next = Math.min(1, available / pageWidthPx);
      setScale(next > 0 ? next : 1);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, []);

  const oldScale = isOldScale(enrollments);

  const pages: Array<EnrollmentBlock | null> =
    enrollments.length > 0 ? enrollments : [null];
  const totalPages = pages.length;

  const safeIndex = Math.min(Math.max(currentPageIndex, 0), totalPages - 1);

  // First known number — used as the fallback when the caller has not
  // yet expanded `actNumbers` to one entry per page (preview phase).
  const firstActNumber = actNumbers[0] ?? null;

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <div
        className={styles.frame}
        style={{
          width: `calc(${PAGE_WIDTH_CM}cm * ${scale})`,
          height: `calc(${PAGE_HEIGHT_CM}cm * ${scale})`,
        }}
      >
        <div
          className={styles.stage}
          style={{ transform: `scale(${scale})` }}
        >
          {pages.map((enrollment, index) => (
            <CertificatePage
              key={enrollment?.enrollmentId ?? "empty"}
              pageIndex={index + 1}
              totalPages={totalPages}
              isCurrent={index === safeIndex}
              isFirstPage={index === 0}
              isLastPage={index === totalPages - 1}
              enrollment={enrollment}
              allEnrollments={enrollments}
              student={student}
              institution={institution}
              signers={signers}
              // Per-page number when known; otherwise the first known
              // number (preview phase) so every page still renders one.
              actNumber={actNumbers[index] ?? firstActNumber}
              issueDate={issueDate}
              oldScale={oldScale}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── One page ────────────────────────────────────────────────────────────────

function CertificatePage({
  pageIndex,
  totalPages,
  isCurrent,
  isFirstPage,
  isLastPage,
  enrollment,
  allEnrollments,
  student,
  institution,
  signers,
  actNumber,
  issueDate,
  oldScale,
}: {
  pageIndex: number;
  totalPages: number;
  isCurrent: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
  enrollment: EnrollmentBlock | null;
  allEnrollments: EnrollmentBlock[];
  student: CertificateSearchStudent;
  institution: InstitutionForCertificate;
  signers: CertificateSigners;
  actNumber: string | null;
  issueDate: string;
  oldScale: boolean;
}) {
  const fullName = getFullNameUpper(student);

  return (
    <article
      className={`${styles.page} ${isCurrent ? styles.current : ""}`}
      aria-hidden={!isCurrent}
    >
      <PageHeader institution={institution} oldScale={oldScale} />

      <CertificateNumberBar
        actNumber={actNumber}
        current={pageIndex}
        total={totalPages}
      />

      {isFirstPage && (
        <TitleBlock
          studentFullName={fullName}
          documentNumber={student.documentNumber}
          enrollments={allEnrollments}
          oldScale={oldScale}
        />
      )}

      {enrollment ? (
        <EnrollmentTableView
          studentFullName={fullName}
          enrollment={enrollment}
        />
      ) : (
        <section className={styles.enrollmentBlock}>
          <p className={styles.enrollmentSubheading}>
            Este certificado no tiene matrículas asociadas.
          </p>
        </section>
      )}

      {isLastPage && (
        <CertificateFooter signers={signers} issueDate={issueDate} />
      )}
    </article>
  );
}

// ── Certificate number bar (every page) ─────────────────────────────────────

function CertificateNumberBar({
  actNumber,
  current,
  total,
}: {
  actNumber: string | null;
  current: number;
  total: number;
}) {
  return (
    <div className={styles.certificateNumberBar}>
      <p className={styles.certificateNumber}>
        CERTIFICADO {actNumber ? `N° ${actNumber}` : ""}
      </p>
      <div className={styles.pageCounter} aria-label="Número de página">
        <span className={styles.pageCounterLabel}>Página</span> {current} de{" "}
        {total}
      </div>
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────

function PageHeader({
  institution,
  oldScale,
}: {
  institution: InstitutionForCertificate;
  oldScale: boolean;
}) {
  const {
    resolutionLineModern,
    resolutionLineOld,
    headquartersName,
    website,
    departmentName,
  } = INSTITUTION_STATIC_CONFIG;

  const resolutionLine = oldScale
    ? resolutionLineOld
    : resolutionLineModern;

  const municipalityLine = institution.municipality
    ? `${institution.municipality.name} - ${departmentName}`
    : departmentName;

  return (
    <header className={styles.header}>
      <div className={styles.logoBox}>
        <Image
          src="/images/certificate/escudo.jpg"
          alt="Escudo institucional"
          width={140}
          height={140}
          className={styles.logo}
          priority
        />
      </div>

      <div className={styles.ieData}>
        <p>Institución educativa</p>
        <p>{institution.name}</p>
        <p>{resolutionLine}</p>
        <p>
          NIT: {institution.nitId} DANE {institution.institutionalCode}
        </p>
        <p>{municipalityLine}</p>
      </div>

      <div className={styles.headquartersData}>
        <p>{headquartersName}</p>
        <p>Dirección: {institution.address}</p>
        <p>pagina web: {website}</p>
        <p>email: {institution.email}</p>
        {institution.phones.length > 0 && (
          <p>Tel: {institution.phones.join(" - ")}</p>
        )}
      </div>
    </header>
  );
}

// ── Title block (page 1 only) ───────────────────────────────────────────────

function TitleBlock({
  studentFullName,
  documentNumber,
  enrollments,
  oldScale,
}: {
  studentFullName: string;
  documentNumber: string | null;
  enrollments: EnrollmentBlock[];
  oldScale: boolean;
}) {
  const {
    resolutionShortModern,
    resolutionShortOld,
    decreeLineModern,
    decreeLineOld,
  } = INSTITUTION_STATIC_CONFIG;

  const resolutionShort = oldScale
    ? resolutionShortOld
    : resolutionShortModern;
  const decreeLine = oldScale ? decreeLineOld : decreeLineModern;

  const gradeNames = enrollments.map((e) => e.gradeName);
  const years = enrollments.map((e) => e.year);

  const gradesPhrase = formatGradesRange(gradeNames);
  const yearsPhrase = formatYearsRange(years);

  const isSingle = enrollments.length === 1;

  const documentClause = documentNumber ? (
    <>
      , identificada con documento número{" "}
      <strong>{documentNumber}</strong>,
    </>
  ) : (
    <>, sin documento registrado,</>
  );

  return (
    <section className={styles.titleBlock}>
      <p className={styles.lawParagraph}>
        Institución Educativa Nuestra Señora de Chiquinquirá Roldanillo Valle
        Reconocimiento por {resolutionShort} NIT: 891900837-2 DANE 176622000076
      </p>

      <h3 className={styles.subtitle}>CERTIFICAN</h3>

      <p className={styles.studentIntro}>
        Que <strong>{studentFullName}</strong>
        {documentClause} cursó y aprobó en este establecimiento educativo, los
        estudios correspondientes a {isSingle ? "el grado" : "los grados"}{" "}
        <strong>{gradesPhrase}</strong> durante{" "}
        {isSingle ? "el periodo académico" : "los periodos académicos"}{" "}
        <strong>{yearsPhrase}</strong>. {decreeLine}
      </p>
    </section>
  );
}

// ── Enrollment table ────────────────────────────────────────────────────────

function EnrollmentTableView({
  studentFullName,
  enrollment,
}: {
  studentFullName: string;
  enrollment: EnrollmentBlock;
}) {
  return (
    <section className={styles.enrollmentBlock}>
      <h3 className={styles.enrollmentHeading}>
        {studentFullName} Grado: {enrollment.gradeName ?? "—"}, Grupo:{" "}
        {enrollment.groupName ?? "—"}, Código Matrícula
      </h3>
      <h4 className={styles.enrollmentSubheading}>
        CONSOLIDADO DE CALIFICACIONES DEFINITIVAS DE PERIODO ACADÉMICO{" "}
        {enrollment.year ?? "—"}
      </h4>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Área / Asignatura</th>
            <th>IH</th>
            <th>DEF</th>
            <th>Valoración</th>
            <th>Nivelación</th>
          </tr>
        </thead>
        <tbody>
          {enrollment.subjects.length === 0 ? (
            <tr>
              <td colSpan={5} className={styles.colCenter}>
                Sin calificaciones registradas
              </td>
            </tr>
          ) : (
            enrollment.subjects.map((row, index) => {
              const isNumeric = row.scoreType === "NUMERICA";

              return (
                <tr key={`${row.subject?.id ?? index}-${index}`}>
                  <td>{row.subject?.name ?? "—"}</td>
                  <td className={styles.colCenter}>
                    {row.subject?.hourlyIntensity ?? "—"}
                  </td>
                  <td className={styles.colCenter}>
                    {isNumeric ? row.originalScore : "—"}
                  </td>
                  <td className={styles.colCenter}>
                    {isNumeric ? "—" : row.originalScore}
                  </td>
                  <td className={styles.colCenter}>
                    {row.remedialScore || ""}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}

// ── Footer (last page) ──────────────────────────────────────────────────────

function CertificateFooter({
  signers,
  issueDate,
}: {
  signers: CertificateSigners;
  issueDate: string;
}) {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerText}>
        Este documento no necesita autenticación en Notaría (Decreto 1024 de
        1982), ni ser visado por el Delegado del Ministerio de Educación
        Nacional (Decreto 1789 de 1988).
      </p>
      <p className={styles.footerText}>
        Se anulan estampillas por valor de $34.200
      </p>

      <p className={styles.footerDate}>Roldanillo, {issueDate}.</p>

      <div className={styles.signatures}>
        <SignatureView signer={signers.rector} fallbackRoleLabel="Rector(a)" />
        <SignatureView
          signer={signers.issuer}
          fallbackRoleLabel="Secretario(a)"
        />
      </div>
    </footer>
  );
}

function SignatureView({
  signer,
  fallbackRoleLabel,
}: {
  signer: CertificateSigner | null;
  fallbackRoleLabel: string;
}) {
  if (!signer) {
    return (
      <div className={styles.signature}>
        <div className={styles.signatureLine} />
        <p className={styles.signatureName}>—</p>
        <p className={styles.signatureMeta}>Firma no disponible</p>
        <p className={styles.signatureRole}>{fallbackRoleLabel}</p>
      </div>
    );
  }

  return (
    <div className={styles.signature}>
      <div className={styles.signatureLine} />

      <p className={styles.signatureName}>
        {signer.academicLevelAbbr && `${signer.academicLevelAbbr} `}
        {signer.fullName}
      </p>

      <p className={styles.signatureMeta}>
        {signer.documentTypeAbbr} {signer.documentNumber}
        {signer.documentCity ? ` de ${signer.documentCity}` : ""}
      </p>
      <p className={styles.signatureRole}>
        {signer.roleLabel || fallbackRoleLabel}
      </p>
    </div>
  );
}
