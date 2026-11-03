# Steakz RMIS – System Architecture

## 1. Architecture Overview

Steakz RMIS will use a three-tier client-server architecture consisting of:

1. Presentation Layer – React frontend.
2. Application Layer – Node.js and Express backend.
3. Data Layer – PostgreSQL database managed through Prisma ORM.

The frontend and backend will operate as separate applications communicating through a RESTful API.

The backend will follow a modular monolithic architecture. This means the application will have clearly separated functional modules while remaining one deployable backend application.

This approach provides maintainability and scalability without introducing unnecessary microservice complexity.

## 2. Technology Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 19 | User interface |
| Language | TypeScript | Type safety across applications |
| Build Tool | Vite | Frontend development and builds |
| Routing | React Router | Frontend navigation |
| Backend Runtime | Node.js 24 LTS | Server-side execution |
| Backend Framework | Express 5 | HTTP server and API routing |
| Database | PostgreSQL | Persistent data storage |
| ORM | Prisma | Database access and migrations |
| Authentication | JWT | Secure authentication |
| Validation | Zod | Request and data validation |
| API Testing | Postman | Endpoint testing |
| Version Control | Git and GitHub | Source control |

## 3. Presentation Layer – Frontend

The frontend will be a React Single Page Application (SPA) built with TypeScript and Vite.

### Responsibilities
- Display interfaces according to the authenticated user's role.
- Provide login and authentication workflows.
- Display branch-specific information.
- Allow authorized users to manage orders.
- Display kitchen order queues.
- Support menu and promotion management.
- Display inventory information.
- Provide management dashboards and reports.
- Communicate with backend REST API endpoints.

### Frontend Organization

The frontend will use a feature-based structure to keep related functionality organized.

Planned features include:
- Authentication.
- Dashboard.
- Branch management.
- User management.
- Menu management.
- Order management.
- Kitchen management.
- Inventory management.
- Promotions.
- Payments.
- Reporting.

Frontend permissions will control navigation and interface visibility, but backend authorization will remain the actual security boundary.

## 4. Application Layer – Backend

The backend will use Node.js, Express 5 and TypeScript.

It will follow a modular structure, separating business logic, routing, validation, authentication, and database access.

### Responsibilities
- Handle HTTP requests.
- Authenticate users.
- Enforce role-based access control.
- Enforce branch-level data restrictions.
- Validate incoming requests.
- Apply restaurant business rules.
- Process orders and inventory transactions.
- Calculate promotions and discounts.
- Manage payments.
- Generate reporting data.
- Communicate with PostgreSQL through Prisma.

### Planned Backend Modules

| Module | Responsibility |
|---|---|
| Auth | Authentication and JWT management |
| Users | User administration |
| Roles | Role and permission management |
| Branches | Branch management |
| Menu | Menu items and categories |
| Recipes | Recipe and ingredient configuration |
| Orders | Order creation and processing |
| Kitchen | Preparation workflow |
| Inventory | Stock management and transactions |
| Promotions | Promotion rules and eligibility |
| Payments | Payment records and processing |
| Reports | Operational and financial reporting |

## 5. Data Layer – Database

PostgreSQL will be used as the primary relational database.

Prisma ORM will manage:
- Database schema definitions.
- Database migrations.
- Model relationships.
- Database queries.
- Transaction management.

The database will maintain relationships between users, roles, branches, menu items, recipes, orders, inventory, promotions, and payments.

### Database Design Principles

1. Maintain referential integrity through appropriate foreign keys.
2. Use appropriate unique constraints.
3. Enforce required fields and data types.
4. Avoid unnecessary duplication.
5. Preserve historical order and pricing information.
6. Maintain inventory transaction history.
7. Use database transactions for related operations.
8. Enforce branch ownership and data access restrictions.

## 6. Communication Flow

The system will follow this general communication process:

1. A user interacts with the React frontend.
2. The frontend sends an HTTP request to the Express API.
3. Authentication middleware verifies the user's JWT.
4. Authorization middleware checks roles and branch access.
5. Request validation checks incoming data.
6. The relevant backend service executes the business logic.
7. Prisma communicates with PostgreSQL.
8. The backend returns a structured HTTP response.
9. React updates the interface.

## 7. Authentication and Authorization

JWT-based authentication will be implemented.

### Authentication
- Users authenticate using their assigned credentials.
- Passwords will be securely hashed.
- The backend issues authentication tokens after successful login.
- Protected endpoints require valid authentication.

### Authorization
The system will use role-based access control (RBAC).

The five supported roles are:
- Admin.
- Headquarters Manager.
- Branch Manager.
- Server.
- Cook.

Branch-level authorization will ensure that users cannot access another branch's operational data by manipulating request parameters.

## 8. Order and Inventory Transaction Architecture

Order submission and inventory deductions must be treated as one logical operation.

### Order Submission
1. Validate the authenticated user and branch.
2. Validate the order items and meal configurations.
3. Retrieve the applicable recipes.
4. Calculate required ingredient quantities.
5. Verify inventory availability.
6. Calculate prices and eligible discounts.
7. Create the order and order items.
8. Record inventory deductions.
9. Commit the database transaction.

If an essential operation fails, the transaction must roll back.

### Order Cancellation
1. Confirm that the order is eligible for cancellation.
2. Retrieve the original inventory deduction records.
3. Restore the exact quantities deducted.
4. Record reversal transactions.
5. Update the order status.
6. Commit the transaction.

Duplicate reversals must be prevented.

## 9. Error Handling and Validation

The backend will implement centralized error handling.

The system must:
- Validate request parameters and request bodies.
- Return appropriate HTTP status codes.
- Provide consistent error response structures.
- Prevent sensitive technical information from being exposed.
- Log relevant server-side errors.
- Handle database failures safely.

Zod will be used for request validation where appropriate.

## 10. API Design Principles

The backend will expose RESTful API endpoints.

API design will follow these principles:

- Use appropriate HTTP methods.
- Use consistent resource naming.
- Apply authentication to protected endpoints.
- Enforce role and branch permissions.
- Validate request data.
- Return consistent response structures.
- Use pagination for larger datasets.
- Document endpoints for testing and maintenance.

## 11. Security Principles

Security will be incorporated throughout development.

Key considerations include:
- Secure password hashing.
- JWT verification.
- Role-based access control.
- Branch-level authorization.
- Input validation.
- Secure environment variable management.
- Protection against unauthorized database access.
- Appropriate CORS configuration.
- Prevention of duplicate financial and inventory operations.

## 12. Deployment Architecture

The frontend and backend will remain independently deployable applications.

The frontend will be built into static production assets.

The backend will run as a Node.js server and communicate with the PostgreSQL database.

Environment-specific configurations will be used for development, testing, and production.

The architecture will support publishing the frontend and backend as separate GitHub repositories while maintaining a shared local development workspace.

## 13. Architecture Decision Summary

The project will use a modular monolithic backend and an independently developed React frontend.

This architecture provides:
- Clear separation of responsibilities.
- Maintainable application modules.
- Centralized business rule enforcement.
- Consistent database management.
- Secure role-based access.
- Easier testing and debugging.
- Independent frontend and backend deployment.