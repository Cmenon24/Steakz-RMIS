# Steakz RMIS – Project Overview

## 1. Project Introduction

Steakz Restaurant Management Information System (RMIS) is a web-based management platform designed for a restaurant chain operating across multiple branches.

The system will centralize restaurant operations, including order management, menu management, inventory control, staff access, promotions, payments, and management reporting.

The application will support five branches, with role-based access control ensuring that employees can only access the functionality and information appropriate to their responsibilities.

## 2. Project Objectives

The primary objectives are to:

- Centralize restaurant operations across multiple branches.
- Improve order processing and kitchen coordination.
- Maintain accurate branch-level inventory records.
- Automate ingredient deductions through recipe-based inventory management.
- Support centralized menu and promotion management.
- Provide management with operational and financial reporting.
- Implement secure authentication and role-based permissions.
- Improve data accuracy, traceability, and operational efficiency.

## 3. System Users and Roles

The system will support five roles:

| Role | Main Responsibilities |
|---|---|
| Admin | Manage users, branches, and roles. Deactivate users when necessary. |
| Headquarters Manager | View consolidated statistics across all branches. Manage menu items and promotions. |
| Branch Manager | Manage branch operations, inventory adjustments, orders, and branch reports. |
| Server | Process customer orders, manage order progression, and handle payment workflows. |
| Cook | View kitchen orders and update food preparation statuses. |

Access permissions will be enforced through backend role-based access control.

## 4. Core System Modules

### 4.1 Authentication and User Management
- Secure login and authentication.
- JWT-based authentication.
- Role-based access control.
- User and branch assignment.
- User activation and deactivation.

### 4.2 Branch Management
- Support a minimum of five branches.
- Associate employees, orders, and inventory with their respective branches.
- Restrict branch-level access to authorized employees.
- Support consolidated headquarters reporting.

### 4.3 Menu Management
- Centralized menu management.
- Complete steak meals represented as individual menu items.
- Fixed included sides defined through the meal configuration.
- Recipe-based ingredient mapping.
- Categories for meals, appetizers, desserts, and beverages.

### 4.4 Order Management
- Create and manage customer orders.
- Track order preparation and completion.
- Provide a shared order queue.
- Maintain order item prices and discounts as historical snapshots.
- Generate globally unique five-character order references.

### 4.5 Inventory Management
- Track inventory by branch.
- Associate recipes with inventory ingredients.
- Automatically deduct ingredients when orders are submitted.
- Record inventory movements and adjustments.
- Reverse the original deduction when an eligible NEW order is cancelled.
- Generate five-character inventory transaction references.

### 4.6 Promotions
- Centrally managed promotions.
- Branch-aware promotion eligibility and time-zone handling.
- Support the approved £2 discount per eligible appetizer unit.
- Preserve applied discounts in order records.

### 4.7 Payments
- Support payment processing after the food order has been completed.
- Maintain payment records associated with orders.
- Preserve payment and order history.

### 4.8 Reporting and Analytics
- Branch-level operational reporting.
- Headquarters consolidated reporting.
- Sales and order statistics.
- Inventory reporting.
- Promotion and discount reporting.

## 5. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite |
| Routing | React Router |
| Backend | Node.js 24 LTS, Express 5, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT |
| API Testing | Postman |
| Version Control | Git and GitHub |

## 6. Development Approach

The project will be developed incrementally using a structured and controlled workflow.

Each development phase will follow:

1. Inspect existing requirements and dependencies.
2. Propose the implementation.
3. Review and approve the proposed changes.
4. Implement the approved changes.
5. Test functionality and business rules.
6. Review results and document changes.

## 7. Project Structure

The project will use a single local workspace containing three main directories:

- `backend/` – Server-side application and API.
- `frontend/` – Client-side React application.
- `documentation/` – Project specifications, architecture, database design, business rules, and development documentation.

The backend and frontend will eventually be published as separate GitHub repositories.

## 8. Project Scope

The system is intended to support restaurant operations across multiple branches, including order processing, inventory control, menu management, promotions, user administration, payments, and reporting.

The implementation will prioritize data integrity, secure access, maintainability, and consistency across all branches.