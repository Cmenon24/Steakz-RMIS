# Steakz RMIS – Development Roadmap

## 1. Development Approach

Steakz RMIS will be developed using a structured, incremental development approach combining sequential planning with iterative implementation and testing.

The project will follow a controlled workflow:

1. Define requirements.
2. Design the architecture.
3. Review and approve implementation plans.
4. Develop individual modules.
5. Test functionality.
6. Integrate components.
7. Review and document progress.

The project will prioritize data integrity, security, maintainability, usability, and compliance with the approved business rules.

## 2. Phase 1 – Project Foundation

### Objectives
Establish the development environment and project structure.

### Tasks
- Create the root project directory.
- Create backend, frontend, and documentation directories.
- Initialize Git.
- Configure the main branch.
- Create .gitignore.
- Configure Node.js 24 LTS.
- Create .nvmrc.
- Establish project documentation.
- Define development conventions.

### Deliverables
- Initialized project workspace.
- Git repository.
- Root README.
- Project documentation.
- Agreed technology stack.

### Status
In progress.

## 3. Phase 2 – Backend Foundation

### Objectives
Establish the Express API and backend architecture.

### Tasks
- Initialize Node.js and TypeScript.
- Configure Express 5.
- Configure development scripts.
- Establish modular backend structure.
- Configure environment variables.
- Implement centralized error handling.
- Configure request validation using Zod.
- Establish API response conventions.
- Configure CORS.
- Add health-check endpoint.
- Establish logging.

### Deliverables
- Functional Express server.
- TypeScript configuration.
- Environment configuration.
- Error-handling middleware.
- Initial API endpoint.
- Backend documentation.

## 4. Phase 3 – Database and Prisma

### Objectives
Build and validate the relational database foundation.

### Tasks
- Configure PostgreSQL.
- Install and configure Prisma.
- Finalize the entity relationship diagram.
- Review entity relationships.
- Finalize primary and foreign keys.
- Define constraints and indexes.
- Implement the approved Prisma schema.
- Generate initial migrations.
- Configure Prisma Client.
- Test database connectivity.

### Deliverables
- PostgreSQL database.
- Approved ERD.
- Prisma schema.
- Initial database migrations.
- Working database connection.

### Important
Database migrations must not be generated until the schema has been reviewed and approved.

## 5. Phase 4 – Authentication and Authorization

### Objectives
Implement secure access to the system.

### Tasks
- Implement password hashing.
- Create login functionality.
- Implement JWT authentication.
- Create authentication middleware.
- Implement role-based access control.
- Implement permission validation.
- Implement branch-level access restrictions.
- Implement user management.
- Implement account activation and deactivation.

### Deliverables
- Secure login.
- JWT authentication.
- Five system roles.
- Permission enforcement.
- Branch-level authorization.
- Tested authentication endpoints.

## 6. Phase 5 – Core Backend Modules

### Objectives
Implement the primary restaurant management functionality.

### 6.1 Branch Management
- Create branches.
- Update branch information.
- Retrieve branch details.
- Enforce branch-specific access.

### 6.2 Menu Management
- Create menu categories.
- Create and update menu items.
- Manage meal configurations.
- Manage fixed side options.
- Manage menu availability.

### 6.3 Recipe Management
- Create recipes.
- Associate ingredients with recipes.
- Define ingredient quantities.
- Manage recipe versions.
- Preserve historical recipe information.

### 6.4 Inventory Management
- Manage branch inventory.
- Track ingredient quantities.
- Implement manual adjustments.
- Implement automatic order deductions.
- Implement cancellation reversals.
- Maintain transaction history.
- Prevent duplicate inventory transactions.

### 6.5 Order Management
- Create customer orders.
- Generate unique five-character references.
- Create order items.
- Preserve pricing snapshots.
- Validate meal selections.
- Implement order status transitions.
- Implement eligible order cancellation.

### 6.6 Kitchen Management
- Retrieve kitchen order queues.
- Display order details.
- Update preparation statuses.
- Support READY and PREPARING workflows.

### 6.7 Promotion Management
- Create and manage promotions.
- Configure promotion eligibility.
- Apply the approved appetizer discount.
- Implement branch time-zone handling.
- Preserve applied discount history.

### 6.8 Payment Management
- Record payments.
- Validate order completion.
- Prevent duplicate payment processing.
- Maintain payment history.

### 6.9 Reporting
- Branch-level reports.
- Headquarters consolidated reports.
- Sales reporting.
- Order reporting.
- Inventory reporting.
- Promotion performance.

### Deliverables
- Functional REST API modules.
- Protected endpoints.
- Validated business logic.
- Documented API specifications.

## 7. Phase 6 – Backend Testing

### Objectives
Validate backend functionality before frontend integration.

### Tasks
- Test API endpoints using Postman.
- Test successful requests.
- Test invalid requests.
- Test authentication failures.
- Test role restrictions.
- Test branch-level authorization.
- Test inventory deductions.
- Test inventory reversals.
- Test order status transitions.
- Test promotion calculations.
- Test payment restrictions.
- Test database transactions.
- Test duplicate operation prevention.

### Deliverables
- Postman collection.
- API test results.
- Documented test cases.
- Resolved critical defects.

## 8. Phase 7 – Frontend Foundation

### Objectives
Establish the React application and reusable UI architecture.

### Tasks
- Initialize React with Vite.
- Configure TypeScript.
- Configure React Router.
- Establish feature-based folder structure.
- Create reusable components.
- Establish design tokens.
- Implement responsive layouts.
- Implement API communication.
- Configure authentication state.
- Implement protected routes.
- Establish role-aware navigation.

### Deliverables
- Functional React application.
- Reusable design system.
- Routing structure.
- Authentication integration.
- API service layer.

## 9. Phase 8 – Frontend Development

### Objectives
Develop role-specific interfaces.

### Tasks

#### Admin Interface
- User management.
- Branch management.
- Role assignments.

#### Headquarters Manager Interface
- Consolidated dashboard.
- Menu management.
- Promotion management.
- Organization-wide reporting.

#### Branch Manager Interface
- Branch dashboard.
- Branch orders.
- Inventory management.
- Manual stock adjustments.
- Branch reporting.

#### Server Interface
- Order creation.
- Meal and side selection.
- Order queue.
- Order completion.
- Payment processing.

#### Cook Interface
- Kitchen order queue.
- Order preparation details.
- Preparation status updates.

### Deliverables
- Role-specific dashboards.
- Functional restaurant workflows.
- Responsive interfaces.
- Integrated API functionality.

## 10. Phase 9 – System Integration and Testing

### Objectives
Validate the complete application.

### Tasks
- Integrate frontend and backend.
- Test authentication workflows.
- Test all five user roles.
- Test cross-branch restrictions.
- Test order processing.
- Test inventory calculations.
- Test cancellation workflows.
- Test promotions.
- Test payment workflows.
- Test reporting.
- Test responsive layouts.
- Conduct regression testing.

### Deliverables
- Integrated application.
- Completed functional testing.
- Resolved integration issues.
- System testing documentation.

## 11. Phase 10 – Finalization and Deployment Preparation

### Objectives
Prepare the application for demonstration and future deployment.

### Tasks
- Review application security.
- Review database integrity.
- Optimize performance.
- Finalize documentation.
- Prepare demo data.
- Finalize Postman collection.
- Prepare environment configurations.
- Prepare deployment documentation.
- Publish backend GitHub repository.
- Publish frontend GitHub repository.

### Deliverables
- Completed Steakz RMIS.
- Backend GitHub repository.
- Frontend GitHub repository.
- Technical documentation.
- Testing evidence.
- Deployment instructions.

## 12. Development Standards

All implementation phases must follow these standards:

1. No implementation changes without reviewing the proposed approach.
2. Business logic must be enforced by the backend.
3. Database operations must maintain data integrity.
4. Sensitive operations must be protected.
5. Branch-level data access must be enforced.
6. Code should be modular and maintainable.
7. TypeScript should be used consistently.
8. API endpoints must be tested.
9. Significant changes must be documented.
10. Approved milestones should be committed to Git.

## 13. Git and Version Control Strategy

The project will initially use one local Git repository at the root of Steakz-RMIS.

The backend and frontend will later be published as independent GitHub repositories.

The development workflow will include:
- Feature-based commits.
- Milestone commits.
- Meaningful commit messages.
- Regular status checks.
- No accidental inclusion of environment secrets.
- Preservation of the original project as a separate reference.

## 14. Project Completion Criteria

Steakz RMIS will be considered functionally complete when:

- All five roles operate according to their permissions.
- Multiple branches are supported.
- Order workflows function correctly.
- Meal configurations follow the approved rules.
- Inventory deductions and reversals are accurate.
- Promotions calculate correctly.
- Payments follow the approved completion rules.
- Reporting provides accurate information.
- Backend endpoints pass their relevant tests.
- Frontend workflows integrate successfully.
- Documentation is complete.
- The application is ready for demonstration.