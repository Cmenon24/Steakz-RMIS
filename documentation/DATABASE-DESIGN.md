# Steakz RMIS – Database Design

## 1. Database Overview

Steakz RMIS will use PostgreSQL as its primary relational database, with Prisma ORM responsible for database access, schema management, and migrations.

The database will support five restaurant branches and the operational requirements of a multi-branch restaurant management system.

The design will prioritize:
- Data integrity.
- Referential integrity.
- Normalization.
- Secure access.
- Historical record preservation.
- Accurate inventory tracking.
- Transaction consistency.
- Scalability and maintainability.

## 2. Database Design Principles

### 2.1 Primary Keys
Internal database records will use UUID primary keys.

UUIDs provide reliable internal identification without exposing sequential database identifiers.

### 2.2 Public References
Certain records will also have human-readable public references.

The following references must contain five characters:
- Order reference.
- Inventory transaction reference.

These references must be globally unique, with collision detection and retry handling during generation.

Public references will be separate from internal UUID primary keys.

### 2.3 Foreign Keys
Foreign keys will maintain relationships between related database records.

### 2.4 Data Integrity
Appropriate database constraints will be implemented to prevent:
- Duplicate records.
- Invalid relationships.
- Negative quantities where prohibited.
- Invalid financial values.
- Unauthorized cross-branch relationships.

### 2.5 Historical Data
Historical transactions must preserve the information that was valid when the transaction occurred.

Changes to current menu prices, recipes, or promotions must not silently modify historical orders or inventory records.

## 3. Proposed Database Entities

The following entities represent the initial logical database design. Exact fields, relationships, constraints, and cardinalities will be finalized before implementation.

### 3.1 User and Access Management

#### User
Stores employee account information.

Proposed attributes:
- id (UUID, primary key).
- firstName.
- lastName.
- email.
- passwordHash.
- roleId.
- branchId (nullable for organization-wide users where appropriate).
- isActive.
- createdAt.
- updatedAt.

#### Role
Stores the five system roles:
- Admin.
- Headquarters Manager.
- Branch Manager.
- Server.
- Cook.

#### Permission
Stores individual system permissions.

#### RolePermission
Associates roles with their permitted actions.

This provides a flexible RBAC structure rather than relying exclusively on hardcoded frontend permissions.

### 3.2 Branch Management

#### Branch
Stores restaurant branch information.

Proposed attributes:
- id (UUID, primary key).
- name.
- address.
- city.
- state.
- postalCode.
- country.
- timeZone.
- isActive.
- createdAt.
- updatedAt.

Each branch must have its own configured time zone.

Branch time zones will be used when evaluating local promotion validity periods.

### 3.3 Menu Management

#### MenuCategory
Stores menu categories, including:
- Steak meals.
- Appetizers.
- Desserts.
- Drinks.
- Beer.
- Wine.

#### MenuItem
Stores individual sellable menu products.

Proposed attributes:
- id.
- categoryId.
- name.
- description.
- price.
- isAvailable.
- createdAt.
- updatedAt.

A complete steak meal will be represented by one MenuItem rather than separately priced steak and side products.

#### MealSideOption
Represents permitted side selections associated with a complete meal.

Side selections will be configuration options within a meal, not independently priced or ordered products.

The final structure will avoid introducing unnecessary standalone ordering functionality for sides.

### 3.4 Recipe and Ingredient Management

#### Ingredient
Stores ingredients required for meal preparation.

Proposed attributes:
- id.
- name.
- unitOfMeasure.
- description.
- isActive.

#### Recipe
Stores the recipe associated with a menu item.

Proposed attributes:
- id.
- menuItemId.
- name.
- version.
- isActive.
- createdAt.
- updatedAt.

#### RecipeIngredient
Connects recipes with their required ingredients and quantities.

Proposed attributes:
- id.
- recipeId.
- ingredientId.
- quantityRequired.

A recipe may contain multiple ingredients, and an ingredient may appear in multiple recipes.

Historical order deductions must preserve the quantities actually used at the time of submission.

### 3.5 Inventory Management

#### Inventory
Stores the current ingredient balance for each branch.

Proposed attributes:
- id.
- branchId.
- ingredientId.
- quantityAvailable.
- updatedAt.

Each branch must have its own inventory balance for each tracked ingredient.

A unique constraint will prevent duplicate inventory records for the same branch and ingredient.

#### InventoryTransaction
Records inventory movements and adjustments.

Proposed attributes:
- id.
- referenceCode.
- branchId.
- ingredientId.
- transactionType.
- quantityChange.
- reason.
- orderId (nullable).
- performedByUserId.
- createdAt.

Transaction types will distinguish:
- Order deduction.
- Cancellation reversal.
- Manual adjustment.
- Other approved inventory movements.

Transactions will maintain a traceable audit history.

The public referenceCode must be globally unique and contain five characters.

The inventory balance and transaction history must remain consistent.

### 3.6 Order Management

#### Order
Stores customer order information.

Proposed attributes:
- id.
- referenceCode.
- branchId.
- createdByUserId.
- status.
- subtotal.
- discountTotal.
- totalAmount.
- createdAt.
- updatedAt.
- completedAt.
- cancelledAt.

Each order belongs to exactly one branch.

The public referenceCode must be globally unique and contain five characters.

#### OrderItem
Stores individual menu items belonging to an order.

Proposed attributes:
- id.
- orderId.
- menuItemId.
- quantity.
- unitPriceSnapshot.
- discountAmount.
- lineTotal.

Order items must preserve historical prices and discounts.

#### OrderItemSideSelection
Stores the permitted side selections for an ordered meal.

These selections must remain associated with their corresponding order item.

Side selections must not create independent charges.

### 3.7 Promotions and Discounts

#### Promotion
Stores centrally managed promotions.

Proposed attributes:
- id.
- name.
- description.
- discountType.
- discountValue.
- startDateTime.
- endDateTime.
- isActive.
- createdByUserId.
- createdAt.
- updatedAt.

Promotion validity must be evaluated using the relevant branch's configured time zone.

#### PromotionBranch
Associates promotions with eligible branches where branch-specific restrictions apply.

#### OrderPromotion
Records promotions applied to individual orders.

Applied discounts must be preserved historically and must not be recalculated when promotion settings change.

The approved appetizer promotion provides a £2 discount per eligible appetizer unit.

### 3.8 Payment Management

#### Payment
Stores payment records associated with orders.

Proposed attributes:
- id.
- orderId.
- amount.
- paymentMethod.
- paymentStatus.
- transactionReference.
- processedByUserId.
- createdAt.
- updatedAt.

Payment records must preserve payment history and prevent duplicate processing.

Payments must only be accepted after the food order reaches COMPLETED status.

## 4. Proposed Entity Relationships

The database will include the following major relationships:

| Entity | Relationship |
|---|---|
| Branch | One-to-many Users |
| Branch | One-to-many Orders |
| Branch | One-to-many Inventory records |
| Role | One-to-many Users |
| Role | Many-to-many Permissions through RolePermission |
| MenuCategory | One-to-many MenuItems |
| MenuItem | One-to-one or one-to-many Recipes, depending on versioning design |
| Recipe | One-to-many RecipeIngredients |
| Ingredient | One-to-many RecipeIngredients |
| Branch | One-to-many InventoryTransactions |
| Order | One-to-many OrderItems |
| OrderItem | One-to-many SideSelections |
| Order | One-to-many InventoryTransactions |
| Order | One-to-many Payments |
| Promotion | One-to-many OrderPromotions |

The final ERD will establish exact cardinalities, optional relationships, and deletion behavior.

## 5. Order and Inventory Data Integrity

Order submission must use a database transaction.

The transaction will:
1. Validate the order.
2. Retrieve applicable recipe quantities.
3. Calculate required ingredients.
4. Verify available branch inventory.
5. Create the order.
6. Create the order items.
7. Record inventory deductions.
8. Update inventory balances.
9. Commit all changes together.

If any critical operation fails, all related changes must roll back.

### Cancellation Reversal

When an eligible NEW order is cancelled:
1. Retrieve the original deduction transactions.
2. Restore the exact quantities previously deducted.
3. Record reversal transactions.
4. Prevent duplicate reversals.
5. Update the order status.
6. Commit all changes together.

Inventory restoration must never depend on recalculating the current recipe because recipes may have changed since the original order.

## 6. Historical Data and Snapshot Strategy

The database must preserve historical information for accurate reporting and auditing.

The following information should be captured at transaction time:
- Menu item name.
- Unit price.
- Applied discount.
- Final line total.
- Selected sides.
- Recipe version or ingredient quantities used.
- Inventory quantities deducted.
- Promotion applied.
- Payment details.

Historical records must not be silently changed when current configuration data is updated.

## 7. Database Security

The database design will support:
- UUID primary keys.
- Foreign key constraints.
- Unique constraints.
- Appropriate indexes.
- Secure credential storage.
- Transactional operations.
- Restricted database access.
- Audit history.

Role and branch authorization will be enforced in the backend rather than relying on database visibility through the frontend.

## 8. Database Migrations

Prisma migrations will be used to manage database changes.

Development workflow:
1. Update the Prisma schema.
2. Generate and review the migration.
3. Apply the migration to the development database.
4. Generate the Prisma Client.
5. Test database relationships and constraints.
6. Document significant schema changes.

Migrations must be reviewed before application to shared or production environments.

## 9. Final Database Design Deliverables

Before backend implementation begins, the project must have:

- Finalized entity definitions.
- Primary and foreign key definitions.
- Relationship cardinalities.
- Unique constraints.
- Required indexes.
- Data types and validation rules.
- Inventory transaction strategy.
- Order snapshot strategy.
- An Entity Relationship Diagram (ERD).
- An approved Prisma schema.

## 10. Design Status

This document defines the proposed logical database structure.

The final physical database schema will be approved after reviewing entity relationships, transaction requirements, and business rules.

No database migrations should be generated until the Prisma schema and ERD have been reviewed and approved.