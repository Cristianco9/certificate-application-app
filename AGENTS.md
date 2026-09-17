# AGENTS.md — Historical Academic Certificate Management System

> **Purpose of this file:** This is the single source of truth for any AI coding agent (Codex, Claude Code, etc.) working on this repository. Read it fully before making any change. It merges the business requirements (ICONIX analysis), the UI/UX reference wireframes, the frontend engineering guidelines, and the current state of the codebase. If something you need isn't answered here, stop and ask rather than guessing.

---

## 0. How to use this file

1. Read this file top to bottom before touching code.
2. Re-read the relevant section before starting a new feature (e.g. re-read §5 "Certificate Generation" before working on the certificate flow).
3. Keep this file updated as the project evolves — when an architectural decision is made, a phase is completed, or the API contract changes, update the corresponding section in the same PR/commit.
4. Never invent backend endpoints, business rules, or data shapes that aren't documented here or confirmed with the project owner (Cristian).

---

## 1. Business Context (from the ICONIX analysis document)

### 1.1 Problem statement

The institution must issue graduation certificates for students who graduated **before the year 2000**. From 2000 onward, academic records are already digitized in official Ministry of Education platforms. Records before 2000 exist only in **physical archives** (folders and books), forcing the academic secretary to manually search paper records to reconstruct a student's academic history and produce a certificate.

Problems this causes:

* High operational time cost.
* Dependency on manual physical-archive search.
* Risk of human error in transcription/validation of grades.
* Difficulty locating students when no identity document is on record.
* No traceability or reuse of previously issued certificates.
* No centralized, web-accessible database.

### 1.2 Client need

Automate the issuance of historical academic certificates via a centralized web solution that allows the institution to consult, generate, store, and print certificates efficiently, securely, and with full traceability — accessible from any computer, inside or outside the institution, via a cloud-deployed web app.

Specifically, the system must:

* Query students who graduated before 2000.
* Search students by multiple criteria when no identity document exists.
* Store historical academic data in a relational database.
* Convert/normalize old alphabetic grades to their numeric equivalent **without altering the original value**.
* Generate certificates with a unique consecutive number.
* Store issued certificates in a document repository for future reprints.
* Be accessible remotely as a cloud-hosted web application.

### 1.3 Stakeholders & actors

| Role | Type | Responsibilities |
|---|---|---|
| **Secretario académico** (Academic Secretary) | Primary user | Authenticates, searches students, consults academic history, generates certificates, reprints certificates |
| **Rectora** (Rector) | Institutional stakeholder | Oversees academic/administrative/technological impact |
| **Administrador** (Administrator) | Secondary user | Manages users, roles, and system configuration; oversight of the system |

### 1.4 Business rules (authoritative — backend enforces these, frontend must never contradict them)

* Every certificate must have a **unique consecutive number**.
* The **original academic data must always be preserved** (never overwritten by normalization).
* Both numeric and alphabetic grade formats are supported.
* The system must convert alphabetic grades to their numeric equivalent (display/derived value, not a replacement of the original).
* Certificates must be **reprintable**.
* Search must be **flexible** (partial matches, multiple optional criteria, must work even without an identity document).
* Access must be **role-based**.
* **Full traceability** is required for all certificate-related operations (generated, reprinted, downloaded, delivered).

### 1.5 Core domain entities (from the refined data model)

* **Estudiante (Student)** — identity document is nullable; must support flexible search.
* **Matrícula (Enrollment)** — historical academic record link between student and grade/group/year.
* **Grupo/Grado (Group/Grade)** — kept as a separate concept from enrollment.
* **Asignatura (Subject)** — catalog of subjects.
* **Calificación (Grade/Score)** — stores `nota_original` (original value), `tipo_nota` (grade type: numeric/alphabetic), `nota_normalizada` (normalized numeric value). An equivalence table drives the alphabetic → numeric conversion.
* **Certificado (Certificate)** — `consecutivo` (unique sequence number), `fecha`, `tipo`, `documento` (the generated file).
* **Usuario/Rol (User/Role)** — drives access control.

### 1.6 High-level architecture (per the ICONIX document)

```
Frontend (web app, forms & views)
        ↓ HTTP/JSON
Backend (business logic, certificate generation, persistence orchestration)
        ↓
 ┌──────────────┬───────────────────┐
 │  SQL (RDBMS) │  Document storage │
 │  structured  │  (PDF files)      │
 │  data        │                   │
 └──────────────┴───────────────────┘
```

Certificate rendering flow: **Backend generates data → an HTML template renders it → a PDF is generated → the PDF is stored** in the document repository.

### 1.7 Non-functional requirements

Security, availability, scalability, performance, data integrity.

### 1.8 Known risks (called out in the source document)

* Incomplete historical data.
* Errors already present in the historical records themselves.
* Risk during the initial digitization effort.

---

## 2. UI/UX Reference (from the interface design mockups)

> These wireframes define the expected screens and flows. Treat them as the UX contract; implement against them, and flag any ambiguity instead of guessing layout/behavior.

### 2.1 Screen inventory

**Authentication**
* Login (email + password, "forgot password?" link).
* Error states: invalid credentials, system unavailable ("El sistema está experimentando problemas...").

**Dashboard ("Gestión de Certificados")**
* KPI cards: total certificates issued, total students in the database, students who passed the year, students who failed.
* Filters: year, grade, "jornada" (day/afternoon/night shift).
* Breakdown chart: pass/fail rate by year and grade.

**Student search**
* Search filters: first name, second name, surnames, identity document, document type, last academic year, grade, group, birthplace.
* "Must complete at least one field" validation error when searching empty.
* Results table: full name, document, year of graduation, grade/group, link to profile.
* Empty state and "clear filters" action.

**Student profile**
* Personal data: full name, document type/number, birth date, gender, email, address, phone, birthplace.
* Summary: last academic year, number of enrollments, number of certificates issued.
* Actions: "Generar certificado", edit (admin), view certificates.
* Edit mode has a preview-before-save step and a confirmation dialog ("Once saved, changes cannot be reverted").

**Certificate generation**
* Choose certificate scope: "Específico" (a specific year/grade) vs "Todos" (all history).
* Select year and grade from the student's academic history.
* Review grades/subjects table (subject, weekly hours, grade, area, average) before generating.
* Requires selecting an **authorized signer** ("Usuario autorizado para firmar") before issuing — this is a hard gate; the UI must block generation until a signer is chosen.
* Re-authentication step before issuing ("verification only, not a full login") with its own invalid-credentials error state.
* Success confirmation ("Certificado generado con éxito").

**Certificate preview & delivery**
* Preview with certificate number (`N° 000-00`), print and "Descargar PDF" actions.
* Delivery registration form: recipient's personal data (names, document, relationship to the student, phone, address), delivery date/time, observations, and an explicit confirmation checkbox ("Confirmo que el certificado ha sido entregado al receptor registrado").

**Repository / certificate history**
* Filterable history table: full name, document, grade/group, graduation year, "expedido por" (issued by) / "recibido por" (received by), link to the certificate.
* Reprint action available from history.

**User management (admin)**
* User list with filters (name, document, role) and "Crear Usuario".
* User detail: role, contact info, certificates issued by that user, creation/last-access/last-edit timestamps.
* Edit flow mirrors the student edit flow: preview → confirm → save, with a non-reversible-change warning.
* Create-user form: personal data, document (type/number/issuing municipality & department), role, and access credentials (password + confirmation). Success/failure feedback states are explicit ("No se logró guardar la información...").

**Historical database import (admin, "Base de datos")**
* CSV upload with explicit instructions shown in the UI: must be `.csv`, first row must be headers, no merged cells, verify data before uploading.
* Preview step showing counts of **valid records**, **duplicate records**, and **records with errors** before confirming the upload.
* Distinct feedback states: success, invalid file format, file already uploaded previously, server/connection error, generic upload failure.

### 2.2 UX patterns to preserve across the app

* Every destructive or irreversible save (editing a student, editing a user, confirming certificate delivery) goes through **preview → explicit confirmation dialog → success/failure toast**, matching guidelines §34 and §65.
* Every async action has a distinguishable loading, success, and error state (login, search, certificate generation, CSV upload, user save) — matches guidelines §30–§33.
* Certain sensitive actions (issuing a certificate) require **re-authentication as a verification step**, not a full session change — this is a UX detail the backend contract must confirm before implementation (see Rule 2 in §4 below: do not invent this endpoint's contract).

---

## 3. Frontend Engineering Guidelines (authoritative — full detail lives in `guidelines.md` in this repo/project)

This project's frontend must be built as a **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** application that consumes an existing REST API and never duplicates backend business logic. Key points an agent must never violate:

* **Stack:** TypeScript (strict), React (functional components/hooks only), Next.js App Router, Tailwind CSS, shadcn/ui, Lucide React icons, TanStack Query (server state), TanStack Table (complex tables), React Hook Form + Zod (forms/validation).
* **Backend is authoritative** for: certificate numbering, grade conversion, certificate validity, historical data integrity, authorization, persistence, and audit. The frontend only orchestrates UI and calls services.
* **Centralized API layer** (`services/*.service.ts`, `lib/api/client.ts`) — no ad-hoc `fetch()` calls inside components.
* **Centralized authorization abstraction** — no scattered `if (user.role === "admin")` checks; frontend role checks are UX only, never a security boundary.
* **Domain-organized structure**: `components/{students,certificates,repository,users,database,dashboard}`, `hooks/`, `services/`, `types/`, `schemas/`.
* **Loading / empty / error states are mandatory** for every async operation.
* **Historical data is treated as immutable by default** — explicit, distinguishable actions only (`View / Edit / Confirm / Generate / Reprint`), never implicit inline mutation.
* Full AI-agent workflow, coding rules (inspect-before-modify, don't invent APIs, reuse before creating, small incremental changes, preserve existing behavior, explain architectural decisions), naming conventions, testing strategy (Vitest/RTL + Playwright), and the phased build order (Foundation → Auth → Dashboard → Students → Certificates → Repository → Administration → Historical Data Import → Quality) are all defined in full in `guidelines.md`. **Treat that file as part of this contract — read it before implementing any phase.**

---

## 4. Current Project State

* Repository: `certificate-application` — Node.js/Express backend using **Sequelize/MySQL**, **Passport JWT** for auth, **Joi** for validation, and **EJS** views historically.
* The backend is **mid-migration to TypeScript**, starting file-by-file (a typed `config.ts` was the first migrated file).
* A previous `AGENTS.md` was generated for this backend migration — if one already exists in the backend repo, **read it and reconcile it with this file** rather than overwriting it blindly; merge, don't clobber.
* The frontend described in `guidelines.md` (Next.js/React/TypeScript/Tailwind) is the **planned new frontend** for this system — confirm with Cristian whether it lives in the same repo as the backend or a separate one before scaffolding.
* No confirmed REST API contract (routes, request/response shapes) is included in this file. **Per guidelines §56 Rule 2, do not invent endpoints.** Before building any service (`students.service.ts`, `certificates.service.ts`, etc.), get or extract the actual backend route definitions/controllers and document them in `types/api.ts` and a short API reference section here.

---

## 5. Open Questions / Things to Confirm Before Building

These are things this document cannot answer on its own — surface them to Cristian rather than assuming:

1. Is the new Next.js frontend a separate repo from the Express backend, or a `frontend/` folder inside the same monorepo?
2. What is the actual REST API contract (routes, payloads, auth headers, error shapes) exposed by the Express backend today?
3. Is the "re-authentication before issuing a certificate" step (seen in the mockups) an existing backend endpoint, or does it need to be designed?
4. What are the exact roles and their permission matrix (Secretario académico / Administrador / Rectora) — the mockups show a "modo Administrador" and "modo master" (database import), but the exact permission boundaries per role need to be confirmed.
5. CSV import: what column schema/headers does the backend expect?

---

## 6. Working Agreement for This Agent (Codex)

* Follow guidelines §56–58 (Inspect Before Modifying, Do Not Invent APIs, Do Not Duplicate Backend Logic, Reuse Before Creating, Small Changes, Preserve Existing Behavior, Explain Architectural Decisions, Definition of Done) on every task.
* Work in the phased order from guidelines §59 unless Cristian explicitly asks to jump ahead.
* When a requirement in this file conflicts with something Cristian says in a session, the live instruction wins — but flag the conflict so this file can be updated afterward.
* Update this file (or ask Cristian to) whenever a Section 5 "Open Question" gets answered, or the project's actual state (Section 4) changes.