# Certificate Application — Frontend

Web frontend for the **Historical Academic Certificate Management System**: a centralized application to search historical graduates, consult their academic history, generate and reprint academic certificates, and administer users and historical data.

It replaces a manual, paper-archive process (records before the digitized era) with a secure, traceable web workflow for the institution's academic secretariat.

> **Related repository:** [certificate-application-api](https://github.com/Cristianco9/certificate-application-api) — the REST API this frontend consumes.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Backend Integration](#backend-integration)
- [Roles and Access](#roles-and-access)
- [Backend Dependencies and Current Status](#backend-dependencies-and-current-status)
- [Development Guidelines](#development-guidelines)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## Overview

Graduation records from before the digitized era exist only in physical archives. Reconstructing a student's history and issuing a certificate meant searching folders and books by hand, with high time cost, risk of transcription errors and no traceability.

This frontend provides the user interface for the centralized system, which must:

- Find students with flexible, partial search, even without an identity document.
- Present historical academic records **without altering original values**.
- Generate certificates with a unique consecutive number (assigned by the backend).
- Keep a repository of issued certificates for reprinting.
- Enforce role-based access and keep full traceability of certificate operations.

> **Principle:** the UI represents application state; it does not own business rules. Certificate numbering, grade conversion, validity, authorization, persistence and audit all live in the backend.

---

## Features

- **Authentication** — login, session handling, protected routes, logout.
- **Role-based navigation** — menu and actions adapt to the authenticated user's role (UX only; the backend is the security boundary).
- **Dashboard** — statistics and charts about issued certificates and students.
- **Student search** — flexible filters (names, surnames, document, document type, last academic year, grade, group, birthplace) with results table.
- **Student profile** — personal data, enrollments, academic history and certificates.
- **Certificate generation** — select scope (specific period or full history), review subjects and grades, preview, confirm and generate.
- **Certificate preview, print and PDF** — print-accurate preview with delivery registration.
- **Repository** — searchable history of issued certificates with reprint support.
- **User management** — list, create, edit and delete users (administrative area).
- **Historical data import** — CSV upload with preview of valid, duplicate and invalid records.
- **Consistent UX states** — loading, empty and error states for every async operation; confirmation dialogs for destructive or irreversible actions.

> Feature availability depends on the project phase and on what the backend already exposes. See [Backend Dependencies and Current Status](#backend-dependencies-and-current-status) and the [Roadmap](#roadmap).

---

## Tech Stack

| Concern | Technology |
| --- | --- |
| Language | TypeScript (strict mode) |
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Styling | Tailwind CSS 4, plus CSS Modules for print/certificate layouts |
| Components | shadcn/ui (Base UI primitives), `class-variance-authority`, `tw-animate-css` |
| Icons | Lucide React |
| Server state | TanStack Query |
| Tables | TanStack Table |
| Forms and validation | React Hook Form + Zod (`@hookform/resolvers`) |
| Charts | Recharts |
| PDF (client-side) | html2pdf.js |
| Linting | ESLint 9 with `eslint-config-next` |

---

## Architecture

Layered component flow:

```text
Page → Feature component → UI component → Hook → Service → API client → REST API
```

Responsibilities:

| Frontend | Backend |
| --- | --- |
| Presentation, interaction, navigation | Business rules |
| Client-side validation (UX) | Authentication and authorization |
| User feedback (toasts, dialogs) | Data integrity and transactions |
| API consumption, local UI state | Certificate generation and numbering |
| | Persistence and audit |

The frontend never accesses the database directly and never duplicates backend business logic.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [npm](https://www.npmjs.com/)
- The [backend API](https://github.com/Cristianco9/certificate-application-api) running locally (see its README/`AGENTS.md`)

### Installation

1. Clone the repository:

```bash
   git clone https://github.com/Cristianco9/certificate-application-app.git
   cd certificate-application-app
```

2. Create your local environment file from the example:

```bash
   npm run env-var
```

   This copies `env/.envExample` to `.env`. Review and adjust the values (see [Environment Variables](#environment-variables)).

3. Install dependencies:

```bash
   npm install
```

4. Start the development server:

```bash
   npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

> Make sure the backend is up and reachable at the URL configured in your `.env`, otherwise login and data screens will show connection errors.

---

## Environment Variables

Configuration lives in `.env` (generated from `env/.envExample`). **Never commit `.env` or real secrets.**

| Variable | Scope | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Browser-safe | Base URL of the REST API (or of the frontend proxy, see below). |

The backend gates **every** route with a shared `apikey` header that identifies the client application. That value is a secret and must be kept **server-side only** (no `NEXT_PUBLIC_` prefix) and attached from Next.js server code (Route Handlers / Server Actions), never from browser JavaScript. Check `env/.envExample` for the exact variable names used in this repository.

Only variables that are safe to expose to the browser may use the `NEXT_PUBLIC_` prefix.

---

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run env-var` | Copy `env/.envExample` to `.env`. |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build (`next build --webpack`). |
| `npm run start` | Run the production build. |
| `npm run lint` | Run ESLint. |

Before opening a pull request, run `npm run lint` and make sure `npm run build` succeeds (TypeScript must compile in strict mode).

---

## Backend Integration

The REST API is built with Node.js, Express 5, Sequelize and Joi. Points the frontend must respect:

- **Base path:** resources are mounted under `/app/v1/<resource>`.
- **Request pipeline (per protected route):** payload validation → API key check → session token verification (rotated on each request) → role authorization → controller.
- **API key:** every request, including login, requires the `apikey` header. It identifies the client application and must be attached **server-side** (e.g. through a Next.js proxy layer), never exposed to the browser.
- **Authentication token:** the session JWT is rotated on every protected request. Successful responses echo the fresh value in an `authentication` field, so the client must always keep the latest token. The auth transport (httpOnly cookie vs. `Authorization: Bearer`) is being reworked for the separate-frontend setup, so confirm the current contract in the backend repository before implementing the API client.
- **Request bodies, not params:** the API validates `req.body` for every operation, including single-id lookups. It does not use route params or query strings. Service functions must send JSON bodies accordingly.
- **Response shape:** successful responses follow `{ success, message, <entity>, authentication }`. `message` strings are in Spanish.
- **Errors:** produced centrally via Boom (validation, authentication, authorization, not found, conflict, server). The frontend maps them to user-friendly messages and never shows raw backend errors.
- **Login responses** intentionally use the same message for "unknown user" and "wrong password"; do not try to distinguish them in the UI.
- **Password reset** is a public endpoint that verifies identity with `email` + `documentNumber`; no token is issued, so the user must log in afterward.

All HTTP calls go through `services/*.service.ts` and a centralized API client (`lib/api`). Do not call `fetch()` directly from components, and **do not invent endpoints**: verify method, URL, body, response and auth requirements against the backend first.

---

## Roles and Access

Backend roles: `Máster`, `Administrador`, `Rector`, `Secretario`, `Auxiliar`.

- Navigation items and actions are shown or hidden per role through a **centralized permissions module** (`roles`, `permissions`, `authorization`), not scattered `if (role === ...)` checks.
- Frontend role checks are a UX convenience only. The backend enforces authorization on every request regardless of what the UI shows.
- Logging out deletes the stored session token. The "unauthorized" screen must also clear the session before redirecting to login.

---

## Backend Dependencies and Current Status

Some frontend modules depend on backend capabilities that are not available yet. Do not build UI against endpoints that do not exist.

| Capability | Backend status |
| --- | --- |
| Authentication, users, roles, catalogs, students, enrollments, scores | Available |
| Certificate generation workflow (numbering, PDF rendering, delivery registration, reprint) | **Not implemented yet** |
| CSV / historical data import endpoints | **Not implemented yet** |
| Audit / traceability log for certificate operations | **Not implemented yet** (only certificate status is stored) |
| CORS configuration for a separately hosted browser client | **Not configured yet** — use a server-side proxy until added |
| Automated tests | None yet |

Open items to confirm with the backend: the re-authentication step before issuing a certificate, the exact permission matrix per role, and the CSV column schema.

---

## Development Guidelines

The full engineering rules are in [`guidelines.md`](./guidelines.md); AI-assisted work is governed by [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md). Key rules:

- **TypeScript strict**; avoid `any`.
- **Inspect before modifying**; reuse existing components before creating new ones.
- **Do not invent APIs** and **do not duplicate backend business logic**.
- **Small, incremental changes**; preserve existing behavior.
- Every feature needs **loading, empty and error states**, authorization behavior, accessibility and validation (React Hook Form + Zod).
- Destructive or irreversible actions use **preview → confirmation dialog → toast** feedback.
- Historical data is treated as an **official, immutable record**: explicit actions only (`View`, `Edit`, `Confirm`, `Generate`, `Reprint`), never silent inline mutation, and original grades are never altered in the UI.
- Prefer simple React; use `useMemo`/`useCallback`/`memo` only with a demonstrated need.
- Use meaningful, conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).

**Definition of done:** TypeScript compiles, ESLint passes, responsive layout verified, loading/empty/error states present, authorization handled, API errors handled, accessibility considered, no secrets exposed, existing functionality intact.

---

## Roadmap

Development follows the phased order defined in `guidelines.md`:

1. **Foundation** — Next.js, TypeScript, Tailwind, shadcn/ui, API client, layout
2. **Authentication** — login, session, protected routes, role-based UI, logout
3. **Dashboard** — navigation, statistics, charts
4. **Students** — search, results, profile, academic history
5. **Certificates** — selection, generation, preview, PDF, printing, delivery
6. **Repository** — history, search, filters, reprint
7. **Administration** — users, roles, permissions
8. **Historical data** — CSV upload, validation, preview, import results
9. **Quality** — testing (Vitest, React Testing Library, Playwright), accessibility, performance, security review

---

## Contributing

1. Fork the project.
2. Create a feature branch: `git checkout -b feat/short-description`.
3. Commit your changes using conventional commits: `git commit -m "feat: add student search filters"`.
4. Push the branch: `git push origin feat/short-description`.
5. Open a Pull Request describing the change, the affected domain and how it was tested.

---

## License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.

---

## Contact

**Cristian Cortés** — [LinkedIn](https://www.linkedin.com/in/cristianco9/)

- Frontend: <https://github.com/Cristianco9/certificate-application-app>
- Backend: <https://github.com/Cristianco9/certificate-application-api>
