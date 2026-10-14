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
 *
 * `CertificateDocument` only ever mounts after the preview page's data
 * fetch resolves (inside a `useEffect`), so this always runs client-side
 * and the layout effect fires before the first paint — no flash of an
 * unscaled page. The alias keeps the linter quiet and stays correct if
 * this component is ever moved into an SSR-rendered branch.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  actNumber: string | null;
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
 * Pagination rule: ONE PAGE PER ENROLLMENT. If the certificate covers
 * three enrollments, three pages are rendered. The first page carries the
 * student's opening sentence; the last page carries the legal footer and
 * the two signatures. Every page carries the institution header and the
 * "Página X de Y" counter.
 *
 * Screen vs print:
 *   - Screen shows only the page at `currentPageIndex`, scaled down to
 *     fit the available width (never scaled up past 1:1).
 *   - Print renders every page at its true physical size, one per sheet.
 *
 * SCORING SYSTEM: the certificate's legal text is chosen based on the
 * scoring system the scores belong to (see `isOldScale`):
 *   • 1–10 numeric  → pre-2000 system, cites Resolución 71/1977 and 2729/1974
 *   • 1–5 numeric or alphabetic → modern, cites Resolución 4999/2014
 *     and Decreto 1290/2009
 */
export function CertificateDocument({
  actNumber,
  student,
  institution,
  enrollments,
  signers,
  issueDate,
  currentPageIndex = 0,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Recompute the display scale whenever the viewport resizes. Runs
  // before paint on the initial mount, so the user never sees the
  // certificate at 1:1 on a narrow screen.
  useIsomorphicLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const style = getComputedStyle(viewport);
      const paddingX =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const available = viewport.clientWidth - paddingX;
      const pageWidthPx = PAGE_WIDTH_CM * PX_PER_CM;

      // Clamp to 1 so we never magnify on a wide desktop screen.
      const next = Math.min(1, available / pageWidthPx);
      setScale(next > 0 ? next : 1);
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, []);

  // Computed once at the top level and threaded down — the same scale
  // governs every page of the certificate, since all enrollments belong
  // to the same student and use a consistent scoring system.
  const oldScale = isOldScale(enrollments);

  const pages: Array<EnrollmentBlock | null> =
    enrollments.length > 0 ? enrollments : [null];
  const totalPages = pages.length;

  // Defensive clamp — the caller is expected to pass a valid index, but
  // this component should never throw if it doesn't.
  const safeIndex = Math.min(Math.max(currentPageIndex, 0), totalPages - 1);

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
              actNumber={actNumber}
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
  /** `true` for the page the user is currently viewing (screen only). */
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

      {isFirstPage && (
        <TitleBlock
          actNumber={actNumber}
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

      <PageCounter current={pageIndex} total={totalPages} />
    </article>
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

  // The resolution cited in the header's middle column reflects the
  // scoring system the certificate is being issued under.
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

// ── Title block (page 1) ────────────────────────────────────────────────────

function TitleBlock({
  actNumber,
  studentFullName,
  documentNumber,
  enrollments,
  oldScale,
}: {
  actNumber: string | null;
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

  // Legal text swaps wholesale with the scoring system. The modern
  // variant cites Resolución 4999/2014 and Decreto 1290/2009; the old
  // one cites Resolución 71/1977 and Resolución 2729/1974 — mirroring
  // the wording on certificates issued before the 2009 reform.
  const resolutionShort = oldScale
    ? resolutionShortOld
    : resolutionShortModern;
  const decreeLine = oldScale ? decreeLineOld : decreeLineModern;

  const gradeNames = enrollments.map((e) => e.gradeName);
  const years = enrollments.map((e) => e.year);

  const gradesPhrase = formatGradesRange(gradeNames);
  const yearsPhrase = formatYearsRange(years);

  const isSingle = enrollments.length === 1;

  // Document clause: gracefully handle the "no document on record" case
  // for historical students (the schema explicitly allows null).
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
      <h2 className={styles.title}>
        CERTIFICADO {actNumber ? `N° ${actNumber}` : ""}
      </h2>

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
              // In the schema, a score is EITHER numeric OR alphabetic,
              // never both. DEF shows the number when the score is
              // NUMERICA; Valoración shows the alphabetic label when it
              // is ALFABETICA. Only one of the two ever carries a value.
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

      {/* Academic-level abbreviation prefixes the name when present,
          e.g. "Mgs. Juan Pérez", "Esp. María Gómez". The abbreviation
          is rendered exactly as stored in the `nivel_academico` ENUM. */}
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

// ── Page counter ────────────────────────────────────────────────────────────

function PageCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className={styles.pageCounter} aria-label="Número de página">
      <span className={styles.pageCounterLabel}>Página</span> {current} de{" "}
      {total}
    </div>
  );
}
