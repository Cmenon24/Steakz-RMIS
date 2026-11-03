# Steakz RMIS

**Restaurant Management Information System**

A web-based restaurant management platform designed to centralize operations across multiple restaurant branches.

## Project Overview

Steakz RMIS is designed to manage restaurant operations, including:

- Order management.
- Menu and meal management.
- Recipe and ingredient management.
- Branch-level inventory control.
- Kitchen order processing.
- Promotions and discounts.
- Payment management.
- User administration and role-based access control.
- Operational and financial reporting.

The system will support a minimum of five restaurant branches and five user roles.

## Technology Stack

### Frontend
- React 19
- TypeScript
- Vite
- React Router

### Backend
- Node.js 24 LTS
- Express 5
- TypeScript
- Prisma ORM
- Zod
- JWT Authentication

### Database
- PostgreSQL

### Development Tools
- Visual Studio Code
- Git
- GitHub
- Postman

## Project Structure

```text
Steakz-RMIS/
│
├── backend/
│   └── Server-side application and REST API
│
├── frontend/
│   └── React client-side application
│
├── documentation/
│   ├── PROJECT-OVERVIEW.md
│   ├── BUSINESS-RULES.md
│   ├── SYSTEM-ARCHITECTURE.md
│   ├── DATABASE-DESIGN.md
│   └── DEVELOPMENT-ROADMAP.md
│
├── .gitignore
├── .nvmrc
└── README.md
```

## User Roles

The system supports five primary roles:

1. Admin
2. Headquarters Manager
3. Branch Manager
4. Server
5. Cook

Each role will have defined permissions and access restrictions.

## Core Business Rules

- Each complete steak meal is represented by one menu item.
- Meals include one steak and up to two fixed sides.
- Sides cannot be ordered or charged for independently.
- Inventory is deducted when an order is successfully submitted.
- Eligible NEW order cancellations reverse the original inventory deductions.
- Order and inventory transaction references use globally unique five-character codes.
- The approved appetizer promotion provides a £2 discount per eligible unit.
- Payments are processed only after an order reaches COMPLETED status.
- Branch-level data access is enforced by the backend.

Refer to `documentation/BUSINESS-RULES.md` for the complete specification.

## Getting Started

### Prerequisites

Install the following:

- Node.js 24 LTS
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

Backend initialization instructions will be added after the backend foundation is established.

### Frontend Setup

Frontend initialization instructions will be added after the frontend foundation is established.

## Documentation

Detailed project documentation is available in the `documentation/` directory.

| Document | Description |
|---|---|
| PROJECT-OVERVIEW.md | Project objectives and scope |
| BUSINESS-RULES.md | Functional and operational rules |
| SYSTEM-ARCHITECTURE.md | Application architecture |
| DATABASE-DESIGN.md | Proposed database entities and relationships |
| DEVELOPMENT-ROADMAP.md | Development phases and milestones |

## Version Control

The project currently uses one local Git repository.

The backend and frontend will eventually be published as separate GitHub repositories:

- Steakz-RMIS-Backend
- Steakz-RMIS-Frontend

The documentation will remain maintained within the main development workspace.

## Development Approach

Development will follow a structured workflow:

1. Inspect requirements.
2. Propose implementation.
3. Review and approve changes.
4. Implement.
5. Test.
6. Review and document.

Database migrations and significant architectural changes must be reviewed before implementation.

## Project Status

**Current stage:** Project foundation and documentation.

Backend and frontend implementation have not yet started.

## License

Academic project – L5 Management Information Systems.