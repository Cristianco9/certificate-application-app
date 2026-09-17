# AI Development Guidelines

## Historical Academic Certificate Management System

> **Document purpose:** This document defines the technical, architectural, UX, security, coding, and development rules that AI coding assistants and developers must follow when creating and extending the frontend application.

---

# 1. Project Overview

The project is a web-based **Historical Academic Certificate Management System** designed to digitize the management, consultation, generation, storage, printing, and traceability of academic certificates for historical graduates.

The system replaces manual physical-record processes with a centralized web application that allows authorized users to:

* Authenticate into the system.
* Search students using flexible criteria.
* Consult student academic history.
* Review subjects and grades.
* Generate academic certificates.
* Preview certificates.
* Download or print certificates.
* Register certificate delivery.
* Reprint previously generated certificates.
* Consult certificate history and repository.
* Manage authorized users.
* Import historical academic data.
* Maintain traceability of system operations.

The frontend must consume the existing REST API and **must not duplicate backend business logic**.

---

# 2. Primary Development Objective

The objective is to create a frontend that is:

* Maintainable.
* Scalable.
* Type-safe.
* Accessible.
* Secure.
* Performant.
* Responsive.
* Consistent.
* Easy for developers and AI agents to understand.
* Easy to extend with new modules.
* Strongly separated by responsibilities.

The application must follow professional software-development practices rather than being implemented as a collection of independent pages.

---

# 3. Technology Stack

The application must use the following core stack.

## 3.1 Language

**TypeScript**

TypeScript must be used throughout the application.

Do not introduce JavaScript files for application logic unless there is a specific technical reason.

Prefer:

```text
.ts
.tsx
```

over:

```text
.js
.jsx
```

TypeScript strict mode should be enabled.

---

# 4. Frontend Framework

## 4.1 React

React is the primary UI library.

The application should use modern React patterns:

* Functional components.
* Hooks.
* Component composition.
* Controlled forms when appropriate.
* Server/client boundaries when applicable.
* Reusable components.
* Avoid unnecessary component state.

Avoid:

* Class components.
* Excessive prop drilling.
* Giant components.
* Business logic directly inside presentation components.

---

# 5. Application Framework

## 5.1 Next.js

Use **Next.js with the App Router**.

Next.js is responsible for:

* Application routing.
* Layouts.
* Route organization.
* Rendering strategy.
* Server/client boundaries.
* Metadata.
* Application-level configuration.

Use route groups to organize authenticated and public areas.

Recommended structure:

```text
app/
├── (auth)/
│   └── login/
│       └── page.tsx
│
├── (dashboard)/
│   ├── layout.tsx
│   ├── dashboard/
│   ├── students/
│   ├── certificates/
│   ├── repository/
│   ├── users/
│   └── database/
│
└── layout.tsx
```

---

# 6. Styling Strategy

## 6.1 Tailwind CSS

Tailwind CSS is the primary styling solution.

Use Tailwind for:

* Layout.
* Spacing.
* Typography.
* Colors.
* Responsive design.
* Flexbox.
* Grid.
* Borders.
* Shadows.
* States.
* Standard component styling.

The majority of the application should use Tailwind.

---

# 7. Custom CSS

Custom CSS is allowed when Tailwind is not the appropriate abstraction.

Use CSS Modules or dedicated CSS files for specialized interfaces.

Examples include:

* Certificate layouts.
* Print-specific styles.
* Highly specialized visual elements.
* Complex animations.
* Browser-print behavior.
* Visual structures that require precise CSS rules.

Example:

```text
components/
└── certificates/
    ├── CertificatePreview.tsx
    └── CertificatePreview.module.css
```

Do not create custom CSS simply because Tailwind classes are longer.

---

# 8. Component Library

Use **shadcn/ui** as the primary reusable UI component foundation.

Use components such as:

* Button.
* Input.
* Select.
* Dialog.
* Dropdown Menu.
* Tabs.
* Card.
* Table.
* Alert.
* Toast.
* Badge.
* Sheet.
* Pagination.
* Form-related components.

Components must be customized to match the application's visual identity.

Do not introduce multiple component libraries unnecessarily.

---

# 9. Icons

Use **Lucide React** for icons.

Do not use random icon libraries for individual components.

Maintain a consistent icon system throughout the application.

---

# 10. Server State and API Communication

Use **TanStack Query** for server/API state.

The frontend communicates with the existing backend through HTTP/JSON.

Architecture:

```text
┌──────────────────────────────┐
│          Next.js             │
│          Frontend            │
└──────────────┬───────────────┘
               │
               │ HTTP / JSON
               ▼
┌──────────────────────────────┐
│          REST API            │
│           Backend            │
└──────────────┬───────────────┘
               │
        ┌──────┴───────┐
        ▼              ▼
   PostgreSQL       File Storage
```

The frontend must never access the database directly.

---

# 11. API Layer

All API requests must be centralized.

Do not make arbitrary `fetch()` calls throughout UI components.

Recommended structure:

```text
services/
├── api.ts
├── auth.service.ts
├── students.service.ts
├── certificates.service.ts
├── users.service.ts
└── database.service.ts
```

Example responsibility:

```text
students.service.ts
    ├── searchStudents()
    ├── getStudent()
    ├── updateStudent()
    └── getAcademicHistory()
```

Components should consume services/hooks rather than manually constructing API requests.

---

# 12. API Client

Create a centralized API client.

Example conceptual structure:

```text
lib/
└── api/
    ├── client.ts
    ├── errors.ts
    └── types.ts
```

The client should handle common behavior such as:

* Base URL.
* Authentication.
* Headers.
* JSON serialization.
* Error normalization.
* HTTP status handling.
* Request cancellation when appropriate.

---

# 13. Authentication

Authentication must be handled through the backend API.

The frontend must not implement its own authentication logic independently of the backend.

The application must support:

```text
Login
  ↓
Authentication
  ↓
Authenticated session
  ↓
Protected routes
  ↓
Role-based access
```

Protected pages must not be accessible to unauthenticated users.

---

# 14. Authorization

Authorization must be enforced by the backend.

The frontend may hide or disable UI elements based on the authenticated user's role, but this is only a UX mechanism.

Never consider frontend authorization sufficient for security.

Example:

```text
Frontend:
Hide "Manage Users" for unauthorized users.

Backend:
Reject unauthorized requests regardless of frontend behavior.
```

---

# 15. Roles

The system documentation identifies roles including:

* Academic Secretary.
* Administrator.
* Rector.

The frontend should represent permissions through a centralized authorization mechanism.

Avoid:

```tsx
if (user.role === "admin") {
   ...
}
```

repeated throughout the application.

Prefer a centralized abstraction:

```text
permissions/
├── roles.ts
├── permissions.ts
└── authorization.ts
```

---

# 16. Forms

Use:

* React Hook Form.
* Zod.

Forms should have:

```text
UI
 ↓
React Hook Form
 ↓
Zod validation
 ↓
API service
 ↓
Backend validation
```

Frontend validation improves user experience.

Backend validation remains authoritative.

---

# 17. Type Safety

Avoid:

```typescript
any
```

unless absolutely necessary and explicitly justified.

Prefer interfaces/types representing API entities.

Recommended:

```text
types/
├── auth.ts
├── student.ts
├── certificate.ts
├── academic-history.ts
├── user.ts
└── api.ts
```

API response types must be explicit.

---

# 18. Domain Organization

The frontend should be organized around application domains rather than only generic technical categories.

Recommended structure:

```text
components/
├── ui/
├── layout/
├── dashboard/
├── students/
├── certificates/
├── repository/
├── users/
└── database/
```

This makes the application easier for both developers and AI agents to navigate.

---

# 19. Dashboard

The dashboard should provide an overview of the system.

The prototype defines a dashboard containing navigation, statistics, and visual information.

Dashboard components should be independent and reusable.

Example:

```text
dashboard/
├── StatisticCard.tsx
├── CertificateStatistics.tsx
├── RecentCertificates.tsx
└── DashboardChart.tsx
```

Do not place the entire dashboard in one component.

---

# 20. Student Search

Student search is a core feature.

The interface should support flexible searching using fields defined by the application prototype, including:

* First name.
* Second name.
* Surnames.
* Identity document.
* Identity document type.
* Last academic year.
* Grade.
* Group.
* Birthplace.

Search results should be displayed in a structured table.

The frontend should:

* Debounce appropriate search inputs.
* Avoid unnecessary API requests.
* Display loading states.
* Display empty states.
* Display API errors.
* Support pagination when provided by the backend.
* Preserve filters when appropriate.

---

# 21. Student Profile

The student profile should centralize relevant information.

The prototype includes:

* Personal information.
* Last academic year.
* Enrollments.
* Certificates.
* Certificate generation actions.

The profile should not become a monolithic component.

Recommended:

```text
StudentProfile/
├── StudentHeader.tsx
├── PersonalInformation.tsx
├── EnrollmentHistory.tsx
├── AcademicHistory.tsx
└── StudentCertificates.tsx
```

---

# 22. Academic History

Academic information must be presented clearly.

The interface should support:

* Academic years.
* Grades.
* Groups.
* Subjects.
* Grades/qualifications.
* Relevant academic history.

The frontend must preserve the values returned by the backend.

Do not silently modify historical grades.

---

# 23. Certificate Generation

Certificate generation is a critical workflow.

The frontend should:

```text
Select student
      ↓
Select certificate
      ↓
Select academic period
      ↓
Review academic information
      ↓
Preview
      ↓
Confirm
      ↓
Request generation
      ↓
Display generated certificate
```

The prototype supports selecting specific or complete academic information and reviewing subjects and grades before generation.

---

# 24. Certificate Business Logic

Certificate business rules must remain in the backend.

The frontend must not determine:

* Certificate numbering.
* Final academic grade conversion.
* Certificate validity.
* Historical data integrity.
* Authorization.
* Database transactions.
* Certificate persistence.

The project documentation explicitly defines backend responsibility for certificate generation and persistence.

The frontend only orchestrates the user interaction.

---

# 25. Certificate Preview

Certificate preview should reproduce the final certificate as accurately as possible.

The prototype supports:

* Preview.
* Printing.
* PDF download.
* Certificate delivery registration.

Certificate-specific CSS may use custom CSS Modules because printing requires precise control.

Example:

```text
components/certificates/
├── CertificatePreview.tsx
├── CertificatePreview.module.css
├── CertificateActions.tsx
└── DeliveryForm.tsx
```

---

# 26. Certificate Repository

The repository must allow users to consult previously generated certificates.

The prototype includes certificate history and repository search functionality.

Repository functionality should support:

* Search.
* Filtering.
* Certificate metadata.
* Student association.
* Generation date.
* Reprinting.
* Viewing/downloading when authorized.

---

# 27. Certificate Traceability

Every certificate-related operation should be treated as traceable.

The frontend must clearly communicate actions such as:

```text
Generated
Reprinted
Downloaded
Delivered
```

The actual audit record must be created by the backend.

The frontend should display audit information returned by the API.

---

# 28. User Management

Administrative interfaces should be separated from ordinary certificate workflows.

The prototype includes:

* User listing.
* Search.
* Creation.
* Editing.
* Deletion.
* User statistics.

Recommended components:

```text
users/
├── UserTable.tsx
├── UserFilters.tsx
├── UserForm.tsx
├── UserDetails.tsx
├── DeleteUserDialog.tsx
└── UserStatistics.tsx
```

---

# 29. Historical Database Import

The application supports importing historical information through CSV.

The prototype defines:

* Upload interface.
* Import instructions.
* File preview.
* Valid records.
* Duplicates.
* Errors.
* Upload status.
* Invalid format handling.
* Server errors.

The frontend should provide clear feedback for each state.

Example:

```text
Idle
 ↓
File selected
 ↓
Validating
 ↓
Preview
 ↓
Uploading
 ↓
Processing
 ↓
Success / Partial Failure / Failure
```

---

# 30. Loading States

Every asynchronous operation must have an appropriate loading state.

Never leave users wondering whether the application is processing.

Examples:

```text
Searching students...
Loading academic history...
Generating certificate...
Uploading database...
Deleting user...
```

Use skeletons for large content areas and spinners/loading indicators for actions when appropriate.

---

# 31. Empty States

Empty results must have intentional UI.

Avoid simply displaying:

```text
No data
```

Instead communicate:

* What was searched.
* That no results were found.
* What the user can do next.

Example:

```text
No students found

Try changing your search criteria or removing one
of the filters.
```

---

# 32. Error Handling

Errors must be handled consistently.

The frontend should distinguish:

```text
Validation Error
Authentication Error
Authorization Error
Not Found
Conflict
Server Error
Network Error
Unknown Error
```

Create centralized error handling.

Example:

```text
lib/
└── errors/
    ├── ApiError.ts
    └── error-handler.ts
```

Never expose raw backend errors directly to users.

---

# 33. Notifications

Use a consistent notification mechanism.

Examples:

* Success.
* Warning.
* Error.
* Information.

Do not use arbitrary browser alerts:

```javascript
alert("Success");
```

Prefer a reusable toast/notification system.

---

# 34. Confirmation Dialogs

Destructive operations require confirmation.

Examples:

* Delete user.
* Delete data.
* Cancel important operation.
* Revoke access.

The confirmation should explain the consequence.

---

# 35. Tables

The system contains information-heavy interfaces.

Use **TanStack Table** when table behavior becomes complex.

Tables should support when appropriate:

* Sorting.
* Filtering.
* Pagination.
* Column visibility.
* Responsive behavior.
* Row actions.

Do not implement complex table behavior manually unless there is a clear reason.

---

# 36. Performance

Performance must be considered during development.

Apply:

* Lazy loading where appropriate.
* Code splitting.
* Pagination.
* Debounced searches.
* Server-side filtering when supported.
* Query caching.
* Avoid unnecessary API requests.
* Avoid unnecessary re-renders.
* Avoid unnecessarily large client components.
* Optimize images.
* Keep dependencies under control.

Do not prematurely optimize.

Measure first when optimization is not obvious.

---

# 37. React Performance Rules

Do not use:

```tsx
useMemo()
useCallback()
memo()
```

everywhere by default.

Use them when there is a demonstrated performance or referential-stability reason.

Prefer simple React code over unnecessary optimization.

---

# 38. State Management

Use the simplest state solution appropriate to the problem.

### Local UI state

Use:

```text
useState
useReducer
```

### Server state

Use:

```text
TanStack Query
```

### Form state

Use:

```text
React Hook Form
```

### Global application state

Introduce a dedicated global state library only if the application demonstrates a genuine need.

Do not introduce global state merely because it is available.

---

# 39. URL State

Search and filter states should be stored in the URL when useful.

Example:

```text
/students?name=Juan&grade=11&year=1998
```

Benefits:

* Shareable searches.
* Browser navigation.
* Refresh persistence.
* Better usability.

---

# 40. Responsive Design

The application must be responsive.

Primary environments:

* Desktop.
* Laptop.
* Tablet.

Important administrative interfaces should remain usable at smaller widths.

Use Tailwind responsive utilities.

Do not design desktop-only interfaces.

---

# 41. Accessibility

Follow accessible UI practices.

Every interactive element should have:

* Appropriate semantic HTML.
* Keyboard accessibility.
* Visible focus states.
* Accessible labels.
* Appropriate ARIA attributes when necessary.
* Sufficient contrast.

Do not use `<div>` as a button.

Prefer:

```html
<button>
```

over:

```html
<div onClick={...}>
```

---

# 42. Security

Never place secrets in the frontend.

Never expose:

```text
Database credentials
Private API keys
Secret tokens
Encryption keys
Backend credentials
```

Environment variables exposed to browser code must contain only values that are safe to expose.

---

# 43. Environment Variables

Use environment variables for configuration.

Example:

```text
NEXT_PUBLIC_API_URL=
```

Only variables explicitly intended for the browser should use the `NEXT_PUBLIC_` prefix.

Never expose backend secrets through public environment variables.

---

# 44. Data Integrity

Historical academic information is sensitive and must be treated as immutable unless the user has explicit authorization to modify it.

The frontend should clearly distinguish:

```text
View
Edit
Generate
Reprint
Delete
```

Do not make destructive or modifying actions visually indistinguishable from read-only actions.

---

# 45. Component Design

Components should follow the **Single Responsibility Principle**.

Avoid:

```text
StudentPage.tsx
```

containing:

* API requests.
* Forms.
* Tables.
* Modals.
* Validation.
* Business rules.
* Formatting.
* Navigation.
* Notifications.

Instead separate responsibilities.

---

# 46. Recommended Component Layers

Use the following conceptual layers:

```text
Page
 ↓
Feature Component
 ↓
UI Component
 ↓
Hook / Service
 ↓
API
```

Example:

```text
students/page.tsx
      ↓
StudentSearch
      ↓
StudentSearchForm
      ↓
useStudentSearch()
      ↓
students.service.ts
      ↓
REST API
```

---

# 47. Custom Hooks

Create custom hooks for reusable behavior.

Examples:

```text
hooks/
├── useAuth.ts
├── useCurrentUser.ts
├── useStudents.ts
├── useStudent.ts
├── useCertificates.ts
└── useUsers.ts
```

Hooks should coordinate state and services.

They should not become hidden locations for unrelated business logic.

---

# 48. Naming Conventions

Use descriptive names.

Components:

```text
StudentSearchForm
CertificatePreview
UserTable
AcademicHistory
```

Hooks:

```text
useStudent
useStudents
useCertificate
```

Services:

```text
students.service.ts
certificates.service.ts
```

Types:

```text
Student
Certificate
AcademicRecord
User
```

Avoid vague names:

```text
Helper
Manager
Utils
Data
Thing
Component
```

unless their purpose is genuinely generic.

---

# 49. File Organization

Recommended architecture:

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── students/
│   ├── certificates/
│   ├── repository/
│   ├── users/
│   └── database/
│
├── hooks/
├── services/
├── schemas/
├── types/
├── lib/
├── constants/
└── styles/
```

---

# 50. Business Logic Separation

Never place backend business rules inside React components.

Bad:

```tsx
if (grade >= 3.0) {
   certificate.status = "approved";
}
```

if that decision belongs to the backend.

Good:

```tsx
const result = await certificatesService.generate(...);
```

The backend determines the authoritative result.

---

# 51. Data Formatting

Formatting should be centralized where possible.

Examples:

```text
formatDate()
formatDocument()
formatCertificateNumber()
formatAcademicGrade()
```

Do not repeat formatting logic throughout components.

---

# 52. Constants

Avoid magic strings and numbers.

Bad:

```tsx
if (role === "ADMIN") ...
```

throughout the codebase.

Prefer centralized constants/enums where appropriate.

```text
constants/
├── roles.ts
├── certificate-status.ts
└── academic.ts
```

---

# 53. Testing

Testing must be introduced progressively.

## Unit Tests

Use:

* Vitest.
* React Testing Library.

Test:

* Utility functions.
* Validation schemas.
* Important hooks.
* Important UI behavior.

## End-to-End Tests

Use Playwright for critical workflows.

At minimum test:

```text
Login
Search student
View student
Generate certificate
Preview certificate
Repository search
Administrative user management
CSV import
```

---

# 54. Git Rules

Use meaningful commits.

Preferred:

```text
feat: add student search
feat: implement certificate preview
fix: handle expired authentication
refactor: extract certificate actions
test: add student search tests
docs: update frontend architecture
```

Avoid:

```text
update
changes
stuff
fix
test
```

---

# 55. Pull Request / Feature Rules

Every feature should ideally contain:

```text
Feature
 ├── UI
 ├── API integration
 ├── Validation
 ├── Loading state
 ├── Empty state
 ├── Error state
 └── Tests
```

Do not consider a feature complete merely because the happy path works.

---

# 56. AI Coding Agent Rules

AI agents working on this project must follow these rules.

## Rule 1 — Inspect Before Modifying

Before modifying existing code:

1. Inspect the relevant files.
2. Understand existing architecture.
3. Identify dependencies.
4. Identify existing conventions.
5. Reuse existing components when possible.

Never rewrite an existing module unnecessarily.

---

## Rule 2 — Do Not Invent APIs

AI agents must not invent backend endpoints.

Before consuming an endpoint, verify:

* HTTP method.
* URL.
* Parameters.
* Request body.
* Response structure.
* Authentication requirements.
* Error behavior.

If the backend contract is unknown, stop and request the API contract rather than guessing.

---

## Rule 3 — Do Not Duplicate Backend Logic

The frontend must not reproduce business rules that belong to the API.

The backend remains authoritative.

---

## Rule 4 — Reuse Before Creating

Before creating a component:

```text
Search existing components
        ↓
Determine whether one can be reused
        ↓
Extend if appropriate
        ↓
Create a new component only when justified
```

Avoid duplicate components such as:

```text
Button.tsx
PrimaryButton.tsx
ActionButton.tsx
CustomButton.tsx
```

when one reusable abstraction is sufficient.

---

## Rule 5 — Small Changes

AI agents should make incremental changes.

Do not modify dozens of unrelated files to implement a small feature.

---

## Rule 6 — Preserve Existing Behavior

When implementing a feature:

* Do not break existing routes.
* Do not remove functionality without justification.
* Do not change API contracts.
* Do not replace libraries unnecessarily.
* Do not introduce unrelated refactoring.

---

## Rule 7 — Explain Architectural Decisions

When introducing a significant dependency or architectural pattern, explain:

```text
Why is it needed?
What problem does it solve?
Why is the existing architecture insufficient?
```

---

# 57. AI Implementation Workflow

Every feature should follow approximately this workflow:

```text
1. Understand requirement
        ↓
2. Inspect existing project
        ↓
3. Identify affected domain
        ↓
4. Verify API contract
        ↓
5. Define types
        ↓
6. Define validation
        ↓
7. Create/update service
        ↓
8. Create hook if necessary
        ↓
9. Build UI
        ↓
10. Add loading state
        ↓
11. Add empty state
        ↓
12. Add error handling
        ↓
13. Add authorization behavior
        ↓
14. Test
        ↓
15. Review
```

---

# 58. Definition of Done

A feature is not complete until:

* [ ] TypeScript compiles.
* [ ] ESLint passes.
* [ ] UI works on supported screen sizes.
* [ ] Loading state exists.
* [ ] Empty state exists where applicable.
* [ ] Error state exists.
* [ ] Authorization behavior is implemented.
* [ ] API errors are handled.
* [ ] Forms have validation where applicable.
* [ ] Accessibility has been considered.
* [ ] Existing functionality remains intact.
* [ ] Relevant tests exist.
* [ ] No unnecessary dependencies were introduced.
* [ ] No secrets are exposed.
* [ ] Code follows project conventions.

---

# 59. Development Priority

The application should be developed incrementally in the following order.

## Phase 1 — Foundation

```text
Next.js
TypeScript
Tailwind
shadcn/ui
ESLint
Prettier
API client
Environment configuration
Application layout
```

## Phase 2 — Authentication

```text
Login
Session
Protected routes
User information
Role-based UI
Logout
```

## Phase 3 — Dashboard

```text
Navigation
Sidebar
Statistics
Charts
Recent activity
```

## Phase 4 — Students

```text
Student search
Search filters
Results
Student profile
Academic history
```

## Phase 5 — Certificates

```text
Certificate selection
Certificate generation
Academic information
Preview
PDF
Printing
Delivery registration
```

## Phase 6 — Repository

```text
Certificate history
Search
Filters
Reprint
Certificate details
```

## Phase 7 — Administration

```text
Users
Roles
Permissions
User creation
User editing
User deletion
```

## Phase 8 — Historical Data

```text
CSV upload
Validation
Preview
Import
Duplicates
Errors
Import results
```

## Phase 9 — Quality

```text
Testing
Accessibility
Performance
Security review
Error handling
UX refinement
```

---

# 60. Dependency Philosophy

Do not add a dependency simply because it is popular.

Before adding a package, evaluate:

1. Is the functionality already available?
2. Can it be implemented simply without a dependency?
3. Does the dependency solve a real project problem?
4. Is it actively maintained?
5. Does it increase bundle size significantly?
6. Does it introduce unnecessary architectural complexity?

The goal is a controlled dependency tree.

---

# 61. Recommended Core Dependencies

The initial stack should remain approximately:

```text
next
react
react-dom
typescript

tailwindcss
shadcn/ui
lucide-react

@tanstack/react-query
@tanstack/react-table

react-hook-form
zod

recharts

vitest
@testing-library/react
playwright
```

Additional dependencies require justification.

---

# 62. Architecture Principle

The frontend should follow this fundamental principle:

> **The UI represents application state; it does not own the application's business rules.**

The frontend is responsible for:

```text
Presentation
Interaction
Navigation
Client validation
User feedback
API consumption
Local UI state
```

The backend is responsible for:

```text
Business rules
Authentication
Authorization
Data integrity
Transactions
Certificate generation
Persistence
Audit
Security
```

---

# 63. UX Principle

The application is used for administrative and historical academic operations.

Therefore, the interface should prioritize:

1. Clarity.
2. Accuracy.
3. Traceability.
4. Efficiency.
5. Consistency.
6. Error prevention.

Visual decoration should never take priority over correctness and usability.

---

# 64. Historical Data Principle

Historical academic data must be treated differently from ordinary CRUD data.

The UI must make it clear when information represents an official historical record.

Avoid unnecessary inline editing.

Prefer explicit actions:

```text
View
Edit
Confirm
Generate
Reprint
```

rather than implicit mutations.

---

# 65. Certificate Principle

A generated certificate represents an important institutional document.

The interface must make the following distinction clear:

```text
Academic information
        ↓
Certificate preview
        ↓
Confirmation
        ↓
Official generation
        ↓
Persistent certificate
```

Users should have an opportunity to review information before irreversible or institutionally significant operations.

---

# 66. Accessibility and Usability Principle

Every workflow should answer three questions:

```text
What is happening?
What happened?
What can I do next?
```

For example:

```text
Generating certificate...

Certificate generated successfully.

[View Certificate] [Download PDF] [Print]
```

---

# 67. Code Quality Principle

Prefer:

```text
Simple
Explicit
Typed
Composable
Testable
Readable
```

over:

```text
Clever
Over-engineered
Highly abstract
Duplicated
Implicit
```

The best code is not the code with the most abstractions.

The best code is the code that makes the application's behavior easy to understand and maintain.

---

# 68. Final AI Instruction

When working on this project, AI agents must behave as **software engineers**, not merely code generators.

Before writing code, understand the architecture.

Before creating a component, search for reusable components.

Before calling an endpoint, verify the API contract.

Before adding a dependency, justify it.

Before changing architecture, explain the reason.

Before modifying historical or certificate-related workflows, understand the business implications.

Before considering a feature complete, handle:

```text
Happy path
Loading
Empty state
Validation
Errors
Authorization
Accessibility
Testing
```

The objective is not simply to make the application work.

The objective is to create a **maintainable, scalable, secure, accessible, performant, and professional production-quality frontend** for the Historical Academic Certificate Management System.

