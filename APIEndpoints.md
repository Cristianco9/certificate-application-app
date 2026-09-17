# IENSC Certification Application — API Reference

Base URL: `/app/v1`

This document describes every HTTP endpoint currently exposed by the API, so
an agent (or developer) knows exactly what to send and what to expect back.

## Global conventions

- **All input is sent in the JSON request body** (`req.body`), never as URL
  params or query strings — even simple lookups by `id` are `POST`/`GET`
  requests with `{ "id": "..." }` in the body.
- **All ids are digit strings** (e.g. `"12"`), matching `/^\d{1,10}$/`, not
  JSON numbers. Send them as strings.
- **Response envelope** (success):
  ```json
  {
    "success": true,
    "message": "<Spanish, user-facing>",
    "<entityKey>": { ... } | [ ... ],
    "authentication": "<rotated JWT, when applicable>"
  }
  ```
- **Response envelope** (error, via Boom):
  ```json
  { "statusCode": 409, "error": "Conflict", "message": "..." }
  ```
- Most endpoints require **all three** of the headers/cookies below. Public
  exceptions: `POST /users/login` and `POST /users/reset-password` only need
  the API key (no session yet).

### Required headers / auth

| Requirement | How |
|---|---|
| API key | Header `apikey: <API_KEY>` on every single request, including login |
| Session token | Cookie `authentication` (httpOnly JWT), set by `/users/login` and rotated on every authenticated request. Non-browser clients can also read the rotated token from the `authentication` field of every JSON response and must resend it as the cookie on the next call. |
| Role authorization | Enforced server-side per route from the JWT payload (`role` claim). See each endpoint's **Roles** line. Roles: `Máster`, `Administrador`, `Rector`, `Funcionario`, `Auxiliar`. |

### Typical request

```
POST /app/v1/students/get-by-document-number
Headers:
  apikey: <API_KEY>
  Content-Type: application/json
Cookie: authentication=<JWT>
Body:
  { "documentNumber": "1005678901" }
```

---

## Authentication — `/users`

| Method | Path | Roles | Body | Notes |
|---|---|---|---|---|
| POST | `/users/login` | none (public) | `{ credentials: { username, password } }` | Sets httpOnly `authentication` cookie on success. Returns `{ success, message }` only — no user payload. |
| POST | `/users/create` | Máster, Administrador | `{ username, firstName, lastName, documentTypeId, documentNumber, municipalityId, roleId, academicLevelId, email, status, password, genderId, lastLogin? }` | `status` ∈ `ACTIVO`/`INACTIVO`. |
| GET | `/users/list-all` | Máster, Administrador | — | Returns all users (passwords excluded). |
| GET | `/users/list-one` | Máster, Administrador | `{ id }` | |
| PATCH | `/users/update` | Máster, Administrador | `{ id, username?, firstName?, lastName?, documentTypeId?, documentNumber?, municipalityId?, roleId?, academicLevelId?, email?, status?, genderId?, lastLogin? }` | Password cannot be changed here — see reset-password. At least one mutable field required. |
| POST | `/users/reset-password` | none (public) | `{ email, documentNumber, newPassword }` | "Forgot password" flow — verifies identity via email+documentNumber match, no session needed. New password must differ from the old one. User must log in again afterward. |
| DELETE | `/users/delete` | Máster, Administrador | `{ id }` | |

---

## Academic Levels — `/academic-levels`

ENUM `name` ∈ `Técnico, tecnólogo, Licenciado, Especialista, Maestría, Doctorado, Post-Doctorado`.
ENUM `abbreviation` ∈ `Téc, Tgo, Lic, Esp, Mgs, Ph.D`.

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/academic-levels/create` | Máster, Administrador | `{ name, abbreviation }` |
| GET | `/academic-levels/list-all` | Máster, Administrador | — |
| GET | `/academic-levels/list-one` | Máster, Administrador | `{ id }` |
| GET | `/academic-levels/get-by-name` | Máster, Administrador | `{ name }` |
| GET | `/academic-levels/get-by-abbreviation` | Máster, Administrador | `{ abbreviation }` |
| PATCH | `/academic-levels/update` | Máster, Administrador | `{ id, name?, abbreviation? }` |
| DELETE | `/academic-levels/delete` | Máster, Administrador | `{ id }` (blocked if users reference it) |

---

## Genders — `/genders`

ENUM `name` ∈ `Masculino, Femenino, No binario, Otro, Prefiero no decirlo`.

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/genders/create` | Máster, Administrador | `{ name }` |
| GET | `/genders/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/genders/list-one` | Máster, Administrador | `{ id }` |
| GET | `/genders/get-by-name` | Máster, Administrador | `{ name }` |
| PATCH | `/genders/update` | Máster, Administrador | `{ id, name }` |
| DELETE | `/genders/delete` | Máster, Administrador | `{ id }` (blocked if users/students reference it) |

---

## Roles — `/roles`

ENUM `name` ∈ `Máster, Auxiliar, Administrador, Funcionario, Rector`. This entity also drives access control.

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/roles/create` | Máster, Administrador | `{ name, description }` |
| GET | `/roles/list-all` | Máster, Administrador | — |
| GET | `/roles/list-one` | Máster, Administrador | `{ id }` |
| GET | `/roles/get-by-name` | Máster, Administrador | `{ name }` |
| POST | `/roles/search-by-description` | Máster, Administrador | `{ partialDescription }` |
| PATCH | `/roles/update` | Máster, Administrador | `{ id, name?, description? }` |
| DELETE | `/roles/delete` | Máster, Administrador | `{ id }` (blocked if users reference it) |

---

## Countries — `/countries`

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/countries/create` | Máster, Administrador | `{ name, iso2Code? }` |
| GET | `/countries/list-all` | Máster, Administrador | — |
| GET | `/countries/list-one` | Máster, Administrador | `{ id }` |
| POST | `/countries/search-by-name` | Máster, Administrador | `{ partialName }` |
| GET | `/countries/get-by-iso2-code` | Máster, Administrador | `{ iso2Code }` (2 letters, e.g. `CO`) |
| PATCH | `/countries/update` | Máster, Administrador | `{ id, name?, iso2Code? }` |
| DELETE | `/countries/delete` | Máster, Administrador | `{ id }` (blocked if departments reference it) |

---

## Departments — `/departments`

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/departments/create` | Máster, Administrador | `{ name, countryId }` |
| GET | `/departments/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/departments/list-one` | Máster, Administrador | `{ id }` |
| POST | `/departments/search-by-name` | Máster, Administrador | `{ partialName }` |
| GET | `/departments/get-by-country` | Máster, Administrador | `{ countryId }` (cascading select support) |
| PATCH | `/departments/update` | Máster, Administrador | `{ id, name?, countryId? }` |
| DELETE | `/departments/delete` | Máster, Administrador | `{ id }` (blocked if municipalities reference it) |

Read responses embed `country: { id, name }` instead of a raw `countryId`.

---

## Municipalities — `/municipalities`

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/municipalities/create` | Máster, Administrador | `{ name, departmentId }` |
| GET | `/municipalities/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/municipalities/list-one` | Máster, Administrador | `{ id }` |
| POST | `/municipalities/search-by-name` | Máster, Administrador | `{ partialName }` |
| GET | `/municipalities/get-by-department` | Máster, Administrador | `{ departmentId }` (cascading select support) |
| PATCH | `/municipalities/update` | Máster, Administrador | `{ id, name?, departmentId? }` |
| DELETE | `/municipalities/delete` | Máster, Administrador | `{ id }` (blocked if students/users/certificate-signatures/institutions reference it) |

Read responses embed `department: { id, name }`.

---

## Document Types — `/document-types`

ENUM `name` ∈ `Cédula de Ciudadanía, Tarjeta de Identidad, Registro Civil, Cédula de Extranjería, Pasaporte, Permiso Especial de Permanencia (PEP), NIT`. No partial-search endpoint (closed set).

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/document-types/create` | Máster, Administrador | `{ name }` |
| GET | `/document-types/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/document-types/list-one` | Máster, Administrador | `{ id }` |
| POST | `/document-types/get-by-name` | Máster, Administrador | `{ name }` (exact match) |
| PATCH | `/document-types/update` | Máster, Administrador | `{ id, name }` |
| DELETE | `/document-types/delete` | Máster, Administrador | `{ id }` (blocked if users/certificate-recipients/students reference it) |

---

## Grades — `/grades`

ENUM `name` ∈ `Primero, Segundo, Tercero, Cuarto, Quinto, Sexto, Séptimo, Octavo, Noveno, Décimo, Undécimo` (curricular order).

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/grades/create` | Máster, Administrador | `{ name, description }` |
| GET | `/grades/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/grades/list-one` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ id }` |
| POST | `/grades/get-by-name` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ name }` |
| POST | `/grades/search-by-description` | Máster, Administrador | `{ partialDescription }` |
| PATCH | `/grades/update` | Máster, Administrador | `{ id, name?, description? }` |
| DELETE | `/grades/delete` | Máster, Administrador | `{ id }` (blocked if groups reference it) |

---

## Institutions — `/institutions`

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/institutions/create` | Máster, Administrador | `{ name, institutionalCode, address, municipalityId?, email, nitId }` |
| GET | `/institutions/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/institutions/list-one` | Máster, Administrador | `{ id }` |
| POST | `/institutions/search-by-name` | Máster, Administrador | `{ partialName }` |
| GET | `/institutions/get-by-institutional-code` | Máster, Administrador | `{ institutionalCode }` |
| GET | `/institutions/get-by-nit` | Máster, Administrador | `{ nitId }` (format `900123456-7`) |
| PATCH | `/institutions/update` | Máster, Administrador | `{ id, name?, institutionalCode?, address?, municipalityId?, email?, nitId? }` |
| DELETE | `/institutions/delete` | Máster, Administrador | `{ id }` (blocked if certificates/groups reference it) |

Read responses embed `municipality: { id, name }`.

---

## Groups — `/groups`

ENUM `shift` ∈ `DIURNA, NOCTURNA`. ENUM `status` ∈ `ACTIVO, INACTIVO`. Unique per `(name, year, gradeId, institutionId)`.

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/groups/create` | Máster, Administrador | `{ name, year, gradeId?, shift, institutionId?, status }` |
| GET | `/groups/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/groups/list-one` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ id }` |
| POST | `/groups/search-by-name` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ partialName }` |
| GET | `/groups/get-by-institution` | Máster, Administrador | `{ institutionId }` |
| GET | `/groups/get-by-grade-and-year` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ gradeId, year }` |
| PATCH | `/groups/update` | Máster, Administrador | `{ id, name?, year?, gradeId?, shift?, institutionId?, status? }` |
| PATCH | `/groups/change-status` | Máster, Administrador | `{ id, status }` |
| DELETE | `/groups/delete` | Máster, Administrador | `{ id }` (blocked if enrollments reference it) |

Read responses embed `institution: { id, name }` and `grade: { id, name }`.

---

## Subjects — `/subjects`

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/subjects/create` | Máster, Administrador | `{ name, description, hourlyIntensity }` (`hourlyIntensity`: single digit 1–9) |
| GET | `/subjects/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/subjects/list-one` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ id }` |
| POST | `/subjects/search-by-name` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ partialName }` |
| PATCH | `/subjects/update` | Máster, Administrador | `{ id, name?, description?, hourlyIntensity? }` |
| DELETE | `/subjects/delete` | Máster, Administrador | `{ id }` (blocked if scores reference it) |

---

## Students — `/students`

Identified either by `documentNumber` or by the composite key
(firstName, middleName, firstLastName, secondLastName, birthDate) for
historical students without a registered document.

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/students/create` | Máster, Administrador, Auxiliar | `{ firstName, middleName?, firstLastName, secondLastName?, documentNumber?, birthDate, municipalityId, documentTypeId?, genderId?, address?, email? }` (`birthDate`: `YYYY-MM-DD`) |
| GET | `/students/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/students/list-one` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ id }` |
| POST | `/students/search-by-name` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ partialName }` (matches first or last name) |
| POST | `/students/get-by-document-number` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ documentNumber }` |
| POST | `/students/get-by-municipality` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ municipalityId }` |
| POST | `/students/get-by-document-type` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ documentTypeId }` |
| PATCH | `/students/update` | Máster, Administrador, Auxiliar | `{ id, firstName?, middleName?, firstLastName?, secondLastName?, documentNumber?, birthDate?, municipalityId?, documentTypeId?, genderId?, address?, email? }` |
| DELETE | `/students/delete` | Máster, Administrador | `{ id }` (blocked if enrollments reference it) |

Read responses embed `municipality`, `documentType`, `gender` as `{ id, name }`.

---

## Enrollments — `/enrollments`

Links a Student to a Group on a date. Unique per `(studentId, groupId)`.

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/enrollments/create` | Máster, Administrador, Auxiliar | `{ studentId, groupId, enrollmentDate }` |
| GET | `/enrollments/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/enrollments/list-one` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ id }` |
| POST | `/enrollments/get-by-student` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ studentId }` (full academic history) |
| POST | `/enrollments/get-by-group` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ groupId }` (group roster) |
| POST | `/enrollments/get-by-student-and-group` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ studentId, groupId }` |
| PATCH | `/enrollments/update` | Máster, Administrador, Auxiliar | `{ id, studentId?, groupId?, enrollmentDate? }` |
| DELETE | `/enrollments/delete` | Máster, Administrador | `{ id }` (blocked if certificate or scores reference it) |

Read responses embed `student` (id, firstName, middleName, firstLastName, secondLastName, documentNumber) and `group` (id, name, year).

---

## Scores — `/scores`

`scoreType` ∈ `NUMERICA, ALFABETICA`. `originalScore`/`remedialScore` must match
the declared type: numeric `0.0`–`5.0` (one decimal), or one of
`Deficiente, Insuficiente, Aceptable, Sobresaliente, Excelente`. Unique per
`(subjectId, enrollmentId)`.

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/scores/create` | Máster, Administrador | `{ originalScore, scoreType, subjectId, remedialScore, enrollmentId }` |
| GET | `/scores/list-all` | Máster, Administrador, Rector, Funcionario, Auxiliar | — |
| GET | `/scores/list-one` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ id }` |
| POST | `/scores/get-by-subject` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ subjectId }` |
| POST | `/scores/get-by-enrollment` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ enrollmentId }` (report card / academic history) |
| POST | `/scores/get-by-subject-and-enrollment` | Máster, Administrador, Rector, Funcionario, Auxiliar | `{ subjectId, enrollmentId }` |
| PATCH | `/scores/update` | Máster, Administrador | `{ id, originalScore?, scoreType?, subjectId?, remedialScore?, enrollmentId? }` |
| DELETE | `/scores/delete` | Máster, Administrador | `{ id }` |

Read responses embed `subject: { id, name }` and a shallow `enrollment: { id, enrollmentDate }`.

---

## Certificate Recipients — `/certificate-recipients`

The person who will receive a printed/issued certificate (may or may not be
the student themselves).

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/certificate-recipients/create` | Máster, Administrador, Rector, Funcionario | `{ firstName, middleName?, lastName, secondLastName?, documentTypeId, documentNumber, address }` |
| GET | `/certificate-recipients/list-all` | Máster, Administrador, Rector, Funcionario | — |
| GET | `/certificate-recipients/list-one` | Máster, Administrador, Rector, Funcionario | `{ id }` |
| POST | `/certificate-recipients/search-by-name` | Máster, Administrador, Rector, Funcionario | `{ partialName }` |
| POST | `/certificate-recipients/get-by-document-number` | Máster, Administrador, Rector, Funcionario | `{ documentNumber }` |
| POST | `/certificate-recipients/get-by-document-type` | Máster, Administrador, Rector, Funcionario | `{ documentTypeId }` |
| PATCH | `/certificate-recipients/update` | Máster, Administrador, Rector, Funcionario | `{ id, firstName?, middleName?, lastName?, secondLastName?, documentTypeId?, documentNumber?, address? }` |
| DELETE | `/certificate-recipients/delete` | Máster, Administrador | `{ id }` (blocked if certificates reference it) |

Read responses embed `documentType: { id, name }`.

---

## Phones — `/phones`

Shared phone catalog; ownership links to User/Student/Institution/Certificate
Recipient are managed internally in the service layer (no dedicated public
linking routes are currently exposed — only CRUD/search on the phone record
itself).

| Method | Path | Roles | Body |
|---|---|---|---|
| POST | `/phones/create` | Máster, Administrador | `{ number }` (Colombian mobile `3XXXXXXXXX` or landline, optional `+57`) |
| GET | `/phones/list-all` | Máster, Administrador | — |
| GET | `/phones/list-one` | Máster, Administrador | `{ id }` |
| POST | `/phones/get-by-number` | Máster, Administrador | `{ number }` |
| POST | `/phones/search-by-number` | Máster, Administrador | `{ partialNumber }` |
| PATCH | `/phones/update` | Máster, Administrador | `{ id, number }` |
| DELETE | `/phones/delete` | Máster, Administrador | `{ id }` |

---

## Not yet implemented

- Certificate generation/preview/PDF output, numbering, and reprint workflow
  (only certificate *recipients* CRUD exists; no `/certificates` router).
- CSV/historical-data import endpoints.
- Audit/traceability log endpoints.
- CORS is not configured, so a browser-based frontend on a different origin
  cannot call this API with cookies until that is added.

---

## Error semantics (Boom-based)

| HTTP status | Meaning |
|---|---|
| 400 | Bad request — Joi validation failed, or a business precondition wasn't met |
| 401 | Missing/invalid/expired session token, or bad login credentials |
| 403 | Authenticated but role not authorized for this route |
| 404 | Referenced record not found |
| 409 | Conflict — duplicate unique value, or delete blocked by dependent records |
| 500 | Unexpected server/database error |
