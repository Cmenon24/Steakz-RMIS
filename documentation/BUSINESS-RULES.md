# Steakz RMIS – Business Rules

## 1. General Business Rules

1. The system must support a minimum of five restaurant branches.
2. Every order must belong to a specific branch.
3. Every inventory record must belong to a specific branch.
4. Employees must be assigned to an authorized branch, except headquarters-level users.
5. All sensitive operations must be validated by the backend.
6. Users must only access data and functionality permitted by their assigned roles.
7. Important financial and inventory changes must be recorded for auditing.

## 2. User Roles and Permissions

### 2.1 Admin
- Create, update, and deactivate users.
- Create and manage restaurant branches.
- Assign users to branches and roles.
- Manage role assignments.
- Cannot bypass backend authorization controls.

### 2.2 Headquarters Manager
- View consolidated statistics across all branches.
- Access organization-wide sales and operational reports.
- Create, update, and manage menu items.
- Create and manage promotions.
- Cannot perform unauthorized branch-level operations.

### 2.3 Branch Manager
- Access information belonging to their assigned branch.
- View branch orders and reports.
- Adjust branch inventory manually.
- Monitor order processing.
- Cannot access another branch's operational records.

### 2.4 Server
- Create customer orders.
- Select meals and permitted included sides.
- Submit orders to the kitchen.
- View order progress.
- Process payments after food orders are completed.
- Cannot manage menu items or inventory.

### 2.5 Cook
- View incoming kitchen orders.
- View meal details and preparation requirements.
- Update preparation statuses.
- Cannot access payment processing or management reporting.

## 3. Menu and Meal Rules

### 3.1 Complete Meals
1. Each meal consists of one steak and up to two included sides.
2. Customers cannot order individual sides separately.
3. Each meal is represented by one complete menu item.
4. The second side is optional.
5. When no second side is selected, the server must explicitly select the "No Second Side" option.
6. Side selections must follow the meal's configured options.
7. Meals must not be treated as collections of independently priced steak and side items.

### 3.2 Menu Categories
The menu must support the following categories:
- Steak meals.
- Appetizers.
- Desserts.
- Drinks.
- Beer.
- Wine.

### 3.3 Recipe Management
1. Every meal must have an associated recipe.
2. Recipes must identify the inventory ingredients required for preparation.
3. Ingredient quantities must be defined per meal.
4. Ingredient deductions must use the recipe associated with the ordered menu item.
5. Recipe and ingredient changes must not silently alter historical inventory transactions.

## 4. Order Management Rules

### 4.1 Order Creation
1. Every order must belong to one branch.
2. Every order must have a globally unique five-character reference.
3. An order must contain one or more order items.
4. Each order item must reference the selected menu item.
5. Order item prices must be captured when the order is placed.
6. Applied discounts must be recorded with the order.
7. Historical orders must retain their original pricing even when menu prices change.

### 4.2 Order Statuses

Orders must follow these statuses:

| Status | Description |
|---|---|
| NEW | Order submitted and awaiting preparation. |
| PREPARING | Kitchen has started preparing the order. |
| READY | Food preparation is complete and ready for serving. |
| COMPLETED | Food order has been delivered/completed by the server. |

### 4.3 Order Status Responsibilities
- Server submits the order.
- Cook updates the order to PREPARING.
- Cook updates the order to READY.
- Server updates the order to COMPLETED after serving the food.

### 4.4 Cancellation
1. Only eligible NEW orders can be cancelled.
2. Cancelling an order must reverse its original inventory deductions.
3. Inventory must be restored using the exact quantities deducted during order submission.
4. Cancellation must create traceable inventory reversal transactions.
5. The same order must not be reversed more than once.
6. Orders that have progressed beyond NEW cannot be cancelled through the standard cancellation workflow.

## 5. Inventory Management Rules

### 5.1 Inventory Structure
1. Inventory must be tracked independently for each branch.
2. Inventory quantities must use consistent measurement units.
3. Ingredients must be identifiable through a centralized inventory item structure.
4. Each branch must maintain its own inventory balances.

### 5.2 Automatic Inventory Deduction
1. Inventory must be deducted when an order is successfully submitted.
2. Deductions must be calculated using the associated recipes.
3. If an order contains multiple identical meals, ingredient quantities must be multiplied accordingly.
4. Inventory deductions must be processed atomically with order submission.
5. An order must not be partially submitted if required inventory deductions fail.
6. Insufficient inventory must prevent order submission unless an explicitly approved business exception is implemented.

### 5.3 Inventory Adjustments
1. Branch Managers can manually adjust inventory for their assigned branch.
2. Every adjustment must record the quantity change.
3. Every adjustment must identify the responsible user.
4. Every adjustment must include a reason.
5. Inventory transactions must be retained for audit purposes.

### 5.4 Inventory Transactions
1. Every inventory transaction must have a globally unique five-character reference.
2. Transactions must identify the affected ingredient and branch.
3. Transactions must record the quantity change and transaction type.
4. Transaction history must distinguish order deductions, cancellation reversals, and manual adjustments.
5. Historical transactions must not be silently overwritten or deleted.

## 6. Promotions and Discounts

1. Promotions must be managed centrally by the Headquarters Manager.
2. Promotions must support eligibility conditions and validity periods.
3. Promotion calculations must respect the local time zone of the relevant branch.
4. The approved appetizer promotion provides a £2 discount per eligible appetizer unit.
5. The discount must be applied only to eligible appetizer quantities.
6. The discount must be captured when the order is placed.
7. Historical orders must retain their original discount values.
8. Promotion eligibility must be validated by the backend.

## 7. Payment Rules

1. Payments must only be processed after the food order reaches COMPLETED status.
2. Payments must be associated with their corresponding orders.
3. Payment records must include the amount, payment method, status, and transaction details where applicable.
4. The system must prevent duplicate payment processing.
5. Payment history must be retained for reporting and auditing.
6. Payment amounts must reflect the final order total after applicable discounts.

## 8. Reporting Rules

### Branch-Level Reporting
Branch Managers can access:
- Branch sales.
- Branch orders.
- Inventory levels.
- Inventory adjustments.
- Promotion performance.
- Operational statistics.

### Headquarters Reporting
Headquarters Managers can access:
- Consolidated sales across all branches.
- Branch performance comparisons.
- Overall order statistics.
- Promotion performance.
- Inventory and operational summaries.

## 9. Security and Data Integrity

1. All protected API endpoints must enforce authentication.
2. Backend authorization must enforce role-based access control.
3. Branch-level data access must be restricted using the authenticated user's branch assignment.
4. Users must not be able to manipulate permissions through frontend requests.
5. Passwords must be securely hashed.
6. Secrets and credentials must be stored in environment variables.
7. Database operations involving orders and inventory must use appropriate transactions.
8. Financial and inventory records must maintain an auditable history.

## 10. Business Rule Enforcement

Business rules must be enforced primarily by the backend and database.

Frontend validation may improve usability but must never replace backend validation.

Where business rules involve multiple database operations, transactions and appropriate concurrency controls must be implemented to protect data consistency.