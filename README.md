# Steakz RMIS

**Restaurant Management Information System**

A web-based restaurant management platform designed to centralize operations across multiple restaurant branches.

## Project Overview

Steakz RMIS is being developed to manage restaurant operations across a minimum of five branches and five user roles. The platform includes order processing, kitchen workflows, menu and recipe management, branch inventory, promotions, payments, refunds, notifications, audit logs, and operational reporting.

The backend REST API is substantially implemented. The frontend has not yet been started.

## Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- React Router

### Backend
- Node.js 24
- Express 5
- TypeScript
- Prisma ORM 7
- Zod 4
- JWT authentication
- Vitest and Supertest for automated API tests

### Database
- PostgreSQL

### Development Tools
- Visual Studio Code
- Git and GitHub
- Postman (planned for comprehensive manual API testing)

## Project Structure

```text
Steakz-RMIS/
├── backend/
│   ├── prisma/          # Prisma schema, migrations, and seed scripts
│   ├── src/             # Express API, routes, controllers, services, middleware
│   └── tests/           # Automated API tests
├── frontend/            # React application (not yet implemented)
├── documentation/       # Requirements, rules, architecture, database design, roadmap
├── .gitignore
├── .nvmrc
└── README.md
```

## User Roles

1. Admin
2. Headquarters Manager
3. Branch Manager
4. Server
5. Cook

The backend enforces role permissions and branch-level access restrictions.

## Core Business Rules

- Each steak meal is one menu item containing one steak and exactly two fixed sides configured by Headquarters.
- Sides cannot be ordered or charged for independently.
- Published recipe versions are immutable. New versions affect only orders submitted after publication; existing orders retain their original recipe version and inventory deductions.
- Inventory is deducted when an order is successfully submitted.
- Eligible NEW order cancellations reverse the original inventory deductions.
- Order and inventory transaction references use the branch code plus a four-digit, zero-padded sequential counter. Each reference type has its own counter, scoped by branch.
- Eligible promotions are applied automatically by the system; Servers do not manually select promotions.
- Payments are recorded only after an order reaches COMPLETED status.
- Branch-level data access is enforced by the backend.

Refer to `documentation/BUSINESS-RULES.md` for the full approved rules.

## Backend Implementation Status

The following backend areas have been implemented:

- Authentication and role-based authorization
- Branch and user management
- Menu and fixed-side management
- Recipe management and versioning
- Inventory management and stocktakes
- Order management and kitchen status workflow
- Payments and refunds
- Restaurant table management
- Promotion management and automatic discount application
- Notifications
- Audit logs
- Sales and inventory reports

The Express application mounts the API under `/api/v1`. The backend includes automated tests using Vitest and Supertest.

### Latest reported verification

The latest results reported during development are:

| Check | Result |
|---|---:|
| TypeScript check (`npx tsc --noEmit`) | Passed |
| Recipe API tests | 13/13 passed |
| Full automated test suite | 118/118 passed |
| Test files | 9/9 passed |

These are the latest user-reported results; rerun the checks after any subsequent backend changes.

## Current Project Status

**Current stage: Backend completeness review (Stage 14).**

- Backend core modules: implemented.
- Automated backend tests: 118 passing in the latest reported run.
- Temporary protected-test route: removed from the application; its unused route file has also been deleted locally.
- Documentation: aligned with the approved two-fixed-sides meal rule and the implemented reference-number behavior.
- Comprehensive Postman endpoint/workflow testing: pending.
- Frontend foundation and role-specific interfaces: not started.
- Full frontend/backend integration and deployment preparation: pending.

The next work is to review critical cross-module workflows, authorization, inventory integrity, payment/refund behavior, notifications/audit coverage, and production configuration. Any code change will be limited to a specific verified issue and retested before proceeding.

## Getting Started

### Prerequisites

- Node.js 24
- npm
- PostgreSQL
- Git

### Verify Node.js Version

From the project root:

```bash
nvm use
node --version
npm --version
```

### Backend Setup

```bash
cd backend
npm install
```

Configure the backend environment variables locally before starting the application. Required configuration is validated by the backend and includes `DATABASE_URL`, `JWT_SECRET`, and, for test runs, `DATABASE_URL_TEST`. Keep real credentials in your local environment file and never commit or share that file.

Run the backend development server:

```bash
npm run dev
```

Run a TypeScript check:

```bash
npx tsc --noEmit
```

Run the automated test suite:

```bash
npm test
```

The test configuration is designed to use the dedicated `steakz_rmis_test_db` database. Do not point automated tests at the development database.

### Frontend Setup

The frontend has not yet been initialized. Setup instructions will be added when the frontend foundation phase begins.

## Documentation

| Document | Description |
|---|---|
| `PROJECT-OVERVIEW.md` | Project objectives and scope |
| `BUSINESS-RULES.md` | Approved functional and operational rules |
| `SYSTEM-ARCHITECTURE.md` | Application architecture |
| `DATABASE-DESIGN.md` | Database entities and relationships |
| `DEVELOPMENT-ROADMAP.md` | Development phases and milestones |

All documents are maintained in `documentation/`.

## Version Control

The project currently uses one local Git repository. The backend and frontend may eventually be published as separate GitHub repositories:

- `Steakz-RMIS-Backend`
- `Steakz-RMIS-Frontend`

The main development workspace and project documentation remain in the root project.

## Development Approach

Development follows a controlled, incremental workflow:

1. Inspect the approved requirements and current implementation.
2. Identify the smallest necessary change.
3. Review and approve the proposed approach.
4. Implement the change.
5. Run TypeScript and focused tests.
6. Run the full test suite.
7. Update documentation where needed.

Database schema changes and migrations must be reviewed before implementation. Existing passing functionality should not be changed without a verified reason.

## License

Academic project – L5 Management Information Systems.
