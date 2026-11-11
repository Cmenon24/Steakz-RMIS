# Steakz RMIS --- Final Database Design

**Project:** Steakz Restaurant Management Information System\
**Document type:** Consolidated database design and implementation
baseline\
**Technology:** PostgreSQL, Prisma ORM, Express 5, TypeScript\
**Status:** Final

------------------------------------------------------------------------

# 1. Purpose and design principles

Steakz RMIS is a multi-branch restaurant management system for at least
five branches. It supports five fixed roles:

-   `ADMIN`
-   `HEADQUARTERS_MANAGER`
-   `BRANCH_MANAGER`
-   `SERVER`
-   `COOK`

The database must support user and branch administration, menu and
recipe management, branch inventory, orders, kitchen operations,
payments, promotions, notifications, audit history and role-based
reporting.

Design principles:

1.  Keep the database relational and understandable.
2.  Use UUID primary keys for business entities.
3.  Enforce permissions in the backend, not only in the frontend.
4.  Enforce branch boundaries in backend queries and authorization.
5.  Preserve historical order, price, recipe and inventory information.
6.  Do not hard-delete records that are referenced by business history.
7.  Use database transactions and concurrency safeguards for
    stock-changing operations.
8.  Avoid separate tables or services where a simpler field, enum or
    query is sufficient.
9.  Do not start migrations or seed scripts until the schema is reviewed
    against this document.

## 1.1 Naming conventions

-   Database models use singular PascalCase names in Prisma (for
    example, `User`, `OrderItem`).
-   Fields use camelCase.
-   Primary keys are UUIDs unless a technical counter/reference is
    specifically required.
-   Timestamps use PostgreSQL timestamps.
-   Money should use a fixed-precision decimal type, not floating-point.
-   Enum values are uppercase and stable.

------------------------------------------------------------------------

# 2. Users, roles, branches and tables

## 2.1 Fixed roles

Use a PostgreSQL enum, not a separate `Role` table:

`ADMIN`, `HEADQUARTERS_MANAGER`, `BRANCH_MANAGER`, `SERVER`, `COOK`.

A database constraint must enforce branch assignment: - `ADMIN` and
`HEADQUARTERS_MANAGER`: `branchId` must be null. - `BRANCH_MANAGER`,
`SERVER` and `COOK`: `branchId` must be non-null.

Because Prisma schema syntax does not express every PostgreSQL CHECK
constraint directly, implement this constraint through a custom SQL
migration and test it.

## 2.2 User

Suggested fields:

  -----------------------------------------------------------------------
  Field                               Purpose
  ----------------------------------- -----------------------------------
  `id`                                UUID primary key

  `firstName`                         Employee first name

  `lastName`                          Employee last name

  `email`                             Unique login email

  `passwordHash`                      Secure password hash; never store
                                      plain-text passwords

  `role`                              Fixed role enum

  `branchId`                          Current branch; null for Admin and
                                      HQ

  `isActive`                          Account active flag

  `deactivatedAt`                     Nullable deactivation timestamp

  `createdAt`                         Creation timestamp

  `updatedAt`                         Last update timestamp
  -----------------------------------------------------------------------

Admin can create, view, update, deactivate and reactivate users; reset
passwords; assign roles; assign employees to branches; and reassign
employees. Password reset must not reveal an existing password. Use a
secure reset flow or an Admin-initiated temporary reset process that
requires the employee to establish a new password.

Deactivation preserves history and invalidates active sessions.
Reactivation sets `isActive` to true and clears `deactivatedAt`. Do not
delete users who are referenced by orders, payments, transactions or
audit history.

## 2.3 EmployeeBranchHistory

Records subsequent branch reassignment.

  Field                Purpose
  -------------------- ---------------------------
  `id`                 UUID primary key
  `userId`             Employee being reassigned
  `previousBranchId`   Previous branch
  `newBranchId`        New branch
  `changedByUserId`    Admin who made the change
  `changedAt`          Timestamp
  `reason`             Optional reason

Do not create a reassignment history row for initial user creation.
Subsequent changes are recorded. History is immutable through the
application.

## 2.4 Branch

  Field                      Purpose
  -------------------------- ---------------------------------
  `id`                       UUID primary key
  `branchCode`               Unique, permanent branch code
  `name`                     Branch name
  `address`                  Address
  `contactNumber`            Contact phone
  `email`                    Branch email
  `timeZone`                 IANA time zone
  `isActive`                 Active flag
  `createdAt`, `updatedAt`   Timestamps
  `deactivatedAt`            Nullable deactivation timestamp

Admin can create and update branch details and deactivate branches. The
branch code is permanent and cannot be edited after creation.
Deactivation is blocked while unresolved operational activity exists.

## 2.5 RestaurantTable

  Field                      Purpose
  -------------------------- -------------------------------------
  `id`                       UUID primary key
  `branchId`                 Owning branch
  `tableNumber`              Table identifier within branch
  `capacity`                 Optional seating capacity
  `status`                   `AVAILABLE`, `OCCUPIED`, `INACTIVE`
  `createdAt`, `updatedAt`   Timestamps

Unique constraint: `(branchId, tableNumber)`. Admin manages table
records. Branch Manager monitors tables. Server selects tables when
creating orders. Cook can see table/order context. A table cannot be
deactivated while it has an active order. It becomes available after the
order is completed or cancelled, subject to the table workflow.

------------------------------------------------------------------------

# 3. Menu, recipes and availability

## 3.1 MenuCategory

Use one flat category table with four fixed categories: - Steak Meals -
Appetizers - Desserts - Drinks

Suggested fields: `id`, `name`, optional `description`, `isActive`,
optional `displayOrder`, `createdAt`, `updatedAt`.

Category names are fixed and unique. HQ can edit descriptions and
activation status but cannot create new categories, rename categories or
create subcategories. Category changes are audited.

## 3.2 MenuItem

Suggested fields: - `id` UUID - `categoryId` - `name` - optional
`description` - `price` (fixed-precision decimal) - optional
`imageUrl` - optional `drinkType`: `SOFT_DRINK`, `BEER`, `WINE` -
`isActive` - optional `displayOrder` - `createdAt`, `updatedAt`

Unique `(categoryId, name)`. HQ manages central names, descriptions,
prices, images, activation and display order. Branch Managers cannot
change central item information or prices. Used items are deactivated
rather than hard-deleted. Orders preserve historical name and price
snapshots. Promotions never overwrite the standard menu price.

Drink inventory is tracked as one menu item per drink, without packaging
variants: - Coca-Cola, Diet Coke, Sprite: `SOFT_DRINK`, inventory unit
`CAN`. - Guinness: `BEER`, inventory unit `BOTTLE`. - House Red Wine:
`WINE`, inventory unit `GLASS`. No wine bottle sales or bottle-to-glass
conversion is in scope.

## 3.3 Steak meals and MealSide

Each steak meal is one complete menu item with exactly two fixed sides.

`MealSide` stores the two sides configured for a steak meal, with fields
such as `id`, `menuItemId`, `sideMenuItemId` (or the approved side
definition reference), `position`, and timestamps. Position is 1 or 2.
Enforce unique `(menuItemId, position)` and prevent duplicate sides for
the same meal.

HQ configures the two sides. Server/customer cannot substitute, remove
or add sides. Both sides are included in the meal price and recipe. A
meal cannot be published or ordered unless both sides are configured.

## 3.4 BranchMenuAvailability

Fields: - `id` - `branchId` - `menuItemId` - `isAvailable` (branch's
manual availability decision) - `isBlockedByStock` (system-managed) -
`requiresReactivationConfirmation` (system-managed) - `updatedAt`

Unique `(branchId, menuItemId)`.

When a menu item is created, create an availability row for every active
branch. When a branch is created, create rows for all currently active
menu items. Defaults: `isAvailable = true`, `isBlockedByStock = false`,
`requiresReactivationConfirmation = false`.

Branch Manager controls local availability but cannot override a
centrally inactive menu item. Stock depletion blocks availability. After
replenishment, the Branch Manager must confirm reactivation. Manual
unavailability remains manual.

Effective availability requires: 1. Menu item centrally active. 2. A
published recipe exists. 3. Branch `isAvailable = true`. 4.
`isBlockedByStock = false`. 5.
`requiresReactivationConfirmation = false`.

## 3.5 MenuAvailabilityHistory

Records manual and system changes to branch menu availability.

Fields: `id`, `branchId`, `menuItemId`, nullable `changedByUserId` (null
for system), previous/new manual availability, previous/new stock-block
status, previous/new reactivation-confirmation status, optional
`reason`, `changedAt`.

Central HQ activation changes are recorded in `AuditLog`, not this
branch history table.

## 3.6 Recipe, RecipeVersion and RecipeIngredient

One `MenuItem` has one `Recipe` definition. A recipe has sequential
versions.

`Recipe` fields: `id`, `menuItemId`, `createdAt`, `updatedAt`.

`RecipeVersion` fields: `id`, `recipeId`, `versionNumber`, `status`
(`DRAFT`, `PUBLISHED`, `ARCHIVED`), `createdByUserId`, `createdAt`,
optional `publishedAt`.

`RecipeIngredient` fields: `id`, `recipeVersionId`, `ingredientId`,
`quantity`, `unit`.

Rules: - One recipe per menu item. - A menu item must have a published
recipe before it can be ordered. - Version numbers are sequential. -
Only one published version per recipe. - Publishing a new version
archives the previous published version. - Published and archived
versions are immutable. - Recipe changes create a new draft version. -
Menu item renaming does not require a recipe version. - Recipe versions
are archived, not hard-deleted. - Orders preserve the recipe version and
ingredient snapshots used. - Unique `(recipeVersionId, ingredientId)`. -
Recipe units must match the ingredient's standardized inventory unit. -
Publishing requires at least one ingredient, active ingredients,
positive quantities, compatible units, no duplicates, and (for steak
meals) the steak plus both configured sides.

------------------------------------------------------------------------

# 4. Ingredients and inventory

## 4.1 Ingredient

Fields: `id` UUID, unique `name`, standardized `unit`, `isActive`,
`createdAt`, `updatedAt`.

HQ manages the ingredient catalogue. HQ can create, rename and
deactivate ingredients. Names remain unique even after deactivation.
Renaming retains the same UUID and is recorded in `AuditLog`.

The unit becomes immutable once used in a recipe or inventory
transaction. If a different unit is needed, create a new ingredient
definition and reconcile recipes and stock.

An ingredient cannot be deactivated while required by an active menu
item's published recipe or while any branch has positive stock.
Deactivated ingredients cannot be used in new recipes or receiving.
Historical records remain. No description field is included.

## 4.2 BranchInventory

Fields: - `id` - `branchId` - `ingredientId` - `quantityOnHand` -
`minimumStockLevel` - `updatedAt`

Unique `(branchId, ingredientId)`. Each active branch has one record per
active ingredient. New ingredients create records for all active
branches; new branches receive records for all active ingredients.

Users cannot directly overwrite `quantityOnHand`; all changes use
inventory transactions.

### System opening-stock template

A predefined system-managed template supplies opening quantities and
default minimum stock levels. HQ does not configure the template. Branch
Managers can adjust minimum levels for their own branch. Template
changes apply only to new branches and new ingredients and never
overwrite existing stock or thresholds.

Illustrative demonstration defaults (not a statement of actual physical
stock):

  Unit        Opening quantity   Default minimum
  --------- ------------------ -----------------
  G                      5,000             1,000
  KG                        10                 2
  ML                     5,000             1,000
  L                         10                 2
  CAN                       48                24
  BOTTLE                    24                12
  GLASS                     24                12
  PIECE                     50                10
  PORTION                   30                10

Real deployment opening quantities must reflect physical stock. When a
branch is created, the system seeds its inventory records and creates
one `OPENING_BALANCE` transaction per ingredient, with `SYSTEM` as
actor.

## 4.3 InventoryTransaction

One shared table records all successful stock movements.

Fields: - `id` UUID - `referenceNumber` - `referenceType` - `branchId` -
`ingredientId` - `transactionType` - `quantityChange` -
`previousQuantity` - `newQuantity` - optional `unitCost` - optional
`supplierName` - `reason` - optional `notes` - nullable
`createdByUserId` - `actorType` (`USER`, `SYSTEM`) - `createdAt` -
optional `orderId` - optional `stocktakeId`

Transaction types: `OPENING_BALANCE`, `RECEIVING`, `WASTAGE`,
`CORRECTION_INCREASE`, `CORRECTION_DECREASE`, `ORDER_DEDUCTION`,
`ORDER_REVERSAL`, `STOCKTAKE_ADJUSTMENT`.

Reference rules:
- UUID is the database primary key; the human-readable reference is for staff.
- The application generates each reference as the branch code followed by a four-digit, zero-padded sequential counter (for example, `LON0010001`).
- Counters are maintained separately for each branch and reference type (`ORDER` and `INVENTORY_TRANSACTION`).
- Because each branch has a unique branch code, generated references are unique across branches within the same reference type. The same visible reference value may occur once for an order and once for an inventory transaction because those types use separate counters.
- The database enforces unique `(branchId, referenceType, referenceNumber)` for inventory transactions and unique `(branchId, orderNumber)` for orders.
- Reference generation must be concurrency-safe.

Successful transactions are final and immutable. There is no transaction
status. Mistakes are corrected with a new correction transaction. No
attachments are included.

A reason is required for `WASTAGE`, `CORRECTION_INCREASE`,
`CORRECTION_DECREASE` and `STOCKTAKE_ADJUSTMENT`. Automated movements
can use system-generated descriptions. Notes are optional.

### Receiving and adjustments

Branch Manager selects an ingredient and enters a received quantity.
Supplier name, unit cost and notes are optional. The system records
branch, actor, timestamp, previous quantity, received quantity,
resulting balance and reference. Receiving increases stock and creates a
transaction. No supplier-management table is required.

Branch Manager can record wastage, correction increases and correction
decreases for their own branch. A reason is required. Each records
previous quantity, adjustment amount, resulting quantity, actor and
timestamp.

### Validation, concurrency and duplicate submissions

-   Received quantities and adjustment amounts must be greater than
    zero.
-   Physical stocktake counts cannot be negative.
-   Inventory balances cannot become negative.
-   Stock changes use database transactions and concurrency safeguards.
    Concurrent requests cannot overdraw stock or partially deduct it.
-   Idempotency protection prevents repeated submissions from creating
    duplicate transactions or changing stock twice.

## 4.4 InventoryAlert

One active alert per branch and ingredient.

Rules: - Quantity = 0: `OUT_OF_STOCK`. - Quantity \> 0 and \<= minimum:
`LOW_STOCK`. - Quantity \> minimum: no active alert.

When the condition changes, resolve the previous alert and create the
new applicable alert. Retain alert history. Branch Manager sees
own-branch alerts; HQ sees all branches. These are operational alerts,
separate from technical system logs.

## 4.5 Stocktake and StocktakeItem

`Stocktake` fields: `id`, `branchId`, `status` (`IN_PROGRESS`,
`COMPLETED`), `startedByUserId`, `completedByUserId`, `startedAt`,
`completedAt`.

`StocktakeItem` fields: `id`, `stocktakeId`, `ingredientId`,
`systemQuantityAtCount`, `actualQuantity`, `variance`, `countedAt`.

Unique `(stocktakeId, ingredientId)`.

Branch Manager can start, save, resume, count, review variances and
confirm a stocktake. Only confirmation creates final adjustments.
Completed stocktakes and items are immutable. Only one in-progress
stocktake per branch; different branches can stocktake concurrently.
Normal operations continue during a stocktake.

Reconciliation rule:

`Final reconciled balance = Physical count + Net movements after count`

Example: physical count 90; after count, 2 units are sold and 5
received; reconciled balance is 93. Confirmation must preserve the count
and intervening transaction history, creating the appropriate
`STOCKTAKE_ADJUSTMENT` without overwriting later movements.

## 4.6 Inventory permissions

-   Branch Manager: manage own-branch inventory, receiving, adjustments,
    thresholds, stocktakes, transaction history and alerts.
-   HQ: read-only chain-wide inventory and transaction visibility; view
    alerts.
-   Admin: no routine inventory management by default.
-   Server and Cook: no inventory management access.

------------------------------------------------------------------------

# 5. Orders and restaurant operations

## 5.1 Order

Suggested fields:

  Field                  Purpose
  ---------------------- ------------------------------------
  `id`                   UUID primary key
  `orderNumber`          Human-readable order reference
  `branchId`             Branch receiving the order
  `tableId`              Dining table
  `serverId`             Server responsible
  `status`               Current order status
  `subtotal`             Total before discount and tax
  `discountTotal`        Discount snapshot
  `taxTotal`             Tax snapshot, if tax is configured
  `totalAmount`          Final order total
  `createdAt`            Creation timestamp
  `updatedAt`            Last update
  `completedAt`          Nullable completion timestamp
  `cancelledAt`          Nullable cancellation timestamp
  `cancelledByUserId`    Nullable cancelling user
  `cancellationReason`   Required when cancelled

Order statuses: `NEW`, `PREPARING`, `READY`, `COMPLETED`, `CANCELLED`.

Order and payment statuses are separate. An order can be completed while
payment is still pending.

## 5.2 OrderItem

Each order can contain multiple menu items.

Suggested fields: - `id` - `orderId` - `menuItemId` (historical
reference; retain even if menu item later deactivated) -
`menuItemNameSnapshot` - `unitPriceSnapshot` - `quantity` -
`lineSubtotal` - `recipeVersionId` (nullable only if a documented
non-inventory item requires it; normally required) - timestamps as
needed

The order preserves the item name, unit price and recipe version used at
order time. Historical orders do not change when HQ updates a menu item
or recipe.

## 5.3 OrderItemSide

Stores the two included sides for each steak meal as order-time
snapshots.

Suggested fields: `id`, `orderItemId`, optional source menu-side
reference, `sideNameSnapshot`, `quantity` (normally 1).

The system copies the two configured sides into the order when the item
is submitted. Servers cannot substitute, remove or add sides. Historical
side names remain unchanged if the central menu later changes.

## 5.4 OrderStatusHistory

Suggested fields: `id`, `orderId`, `previousStatus`, `newStatus`,
`changedByUserId`, `changedAt`, optional `note`.

Record every valid status change. Do not allow arbitrary status jumps.
The normal path is: `NEW` → `PREPARING` → `READY` → `COMPLETED`.

Cancellation is a separate permitted path, subject to the cancellation
rules below.

## 5.5 Order workflow and permissions

-   Server selects a table, adds available menu items and submits the
    order.
-   The system validates branch availability, recipe publication and
    inventory sufficiency.
-   Cook views the branch kitchen queue and changes `NEW` to
    `PREPARING`, then `PREPARING` to `READY`.
-   Server marks a `READY` order as `COMPLETED` once served.
-   Branch Manager monitors all orders for their own branch.
-   HQ has read-only chain-wide order visibility.
-   Admin has no routine order-management access.

A user cannot access another branch's orders by changing an ID in an API
request.

## 5.6 Inventory deduction timing and cancellation

Deduct required ingredients when the Server submits the order, within a
single database transaction after validating stock. Use the exact
published recipe version captured by the order. If stock is
insufficient, reject the submission without partial deductions or
negative balances.

If an order is cancelled before preparation starts and ingredients have
already been deducted, create `ORDER_REVERSAL` transactions for the
unused ingredients. Once preparation has started, do not automatically
restore ingredients because they may have been used. Any exceptional
stock correction must be explicitly recorded by an authorized Branch
Manager.

Cancellation requires an authorized Server or Branch Manager and a
recorded reason. The application must enforce the allowed cancellation
stage. Do not silently delete an order.

## 5.7 Order references

Use a human-readable order number in addition to the UUID. The application
generates it from the branch code followed by a four-digit, zero-padded
sequential counter. The order counter is maintained separately for each
branch and is independent of inventory transaction counters. The database
scopes its uniqueness constraint to `(branchId, orderNumber)`. The UUID
remains the primary key.

------------------------------------------------------------------------

# 6. Payments, refunds and promotions

## 6.1 Payment

Suggested fields: - `id` UUID - `orderId` - `paymentReference` -
`amount` - `paymentMethod` (`CASH`, `CARD`) - `status` (`PENDING`,
`SUCCESSFUL`, `FAILED`) - `processedByUserId` - `createdAt` - optional
`updatedAt`

Rules: - Payment is processed only after order status is `COMPLETED`. -
For this project, one successful payment per order. - Payment amount
must equal the outstanding order total. - Payment methods are Cash and
Card. - Card payment is recorded in the application; no real payment
gateway integration is required. - A failed attempt does not mark the
order paid. - Successful payment records are not edited or deleted. - Do
not store card numbers, CVV or other sensitive card credentials.

## 6.2 Refund

Suggested fields: - `id` UUID - `paymentId` - `amount` - `reason` -
`status` (`REQUESTED`, `APPROVED`, `REJECTED`, `PROCESSED`) -
`requestedByUserId` - `processedByUserId` - `createdAt` - optional
`processedAt`

Rules:
- Refunds must relate to a successful original payment.
- Only full refunds are supported; partial refunds are not permitted.
- A Server may submit a refund request with a reason. The request remains
  `REQUESTED` until the Branch Manager for that same branch reviews it.
- At the shared Server terminal, the Branch Manager enters their account
  email and password to approve or reject a Server-submitted refund. The
  Manager must belong to the same branch as the order; the Server session
  remains active as the terminal session.
- A Branch Manager may initiate their own full refund. The application
  must show a confirmation prompt with the order and full refund amount;
  after confirmation, the refund is processed immediately and the Manager
  is recorded as both requester and processor.
- Admin and Headquarters Manager do not authorize refunds.
- Only one active or processed refund may exist for a payment. A rejected
  request may be submitted again if needed.
- Preserve refund history and audit events; do not edit or delete historical
  payment/refund records. Refunds do not automatically restore inventory.
- Refund processing is recorded in the application; no external payment
  provider integration is required.
- Payment and refund actions are written to `AuditLog` in the same database
  transaction as the related record. Simultaneous attempts must not create
  duplicate successful payments or duplicate active refunds.

## 6.3 Promotion

Suggested fields: - `id` UUID - `name` - optional `description` -
`discountType` (`PERCENTAGE`, `FIXED_AMOUNT`) - `discountValue` -
`startDate` - `endDate` - `isActive` - `createdAt` - `updatedAt`

HQ creates, updates, activates and deactivates promotions. Branch
Managers and Servers cannot create or modify promotions. Servers can
apply eligible active promotions to orders. Validate active status, date
range and discount limits. A discount cannot exceed the eligible order
subtotal. Standard menu prices are never overwritten.

## 6.4 OrderPromotion

A small join/snapshot table records which promotion was applied to an
order.

Suggested fields: `id`, `orderId`, `promotionId`,
`promotionNameSnapshot`, `discountTypeSnapshot`,
`discountValueSnapshot`, `discountAmount`, `createdAt`.

This preserves the promotion details and discount applied even if HQ
later edits or deactivates the promotion. Enforce the project's intended
rule for whether multiple promotions can be combined; recommended
default is one promotion per order to keep calculation and testing
simple.

------------------------------------------------------------------------

# 7. Notifications, audit logs, system logs and reporting

## 7.1 Notification

Suggested fields: - `id` - `userId` - optional `branchId` - `title` -
`message` - `type` - `isRead` - `createdAt`

Use simple in-app notifications only. Examples: low stock, out of stock,
order ready, or other relevant operational events. No email, SMS or push
integration is required.

## 7.2 AuditLog

Suggested fields: - `id` - nullable `userId` (null for system-generated
action) - `actorType` (`USER`, `SYSTEM`) - optional `branchId` -
`action` - `entityType` - `entityId` - optional `details` - `createdAt`

Record important administrative and business changes, including user
creation/deactivation, role or branch reassignment, branch changes, menu
and recipe changes, promotion changes, important inventory
administration, and system-log deletion. Audit history is not editable
through the application.

## 7.3 SystemLog

Technical system logs are separate from business audit history and
inventory transactions.

Suggested fields: - `id` - nullable `userId` - `actorType` (`USER`,
`SYSTEM`) - optional `branchId` - `operation` - `outcome`
(success/failure) - `severity` (`INFO`, `WARNING`, `ERROR`) -
`failureReason` - optional `technicalDetails` - optional
`relatedEntityType` - optional `relatedEntityId` - `createdAt`

Where applicable, record related ingredient, order, inventory
transaction and branch identifiers. Do not record IP addresses.

Only Admin can view, search, filter and manage technical logs. Admin
filters by date range, branch, operation type, success/failure and
severity. HQ, Branch Manager, Server and Cook cannot access technical
logs; Branch Manager can still see operational inventory alerts.

Logs remain until manually deleted; no automatic retention period is
imposed. Admin can delete selected logs or clear all logs after a
confirmation prompt. Deletion is permanent; no recycle bin. Log deletion
itself is recorded in `AuditLog`. A simulated Export Logs UI action may
display a confirmation message, but no actual file export/download is
required. Deleting logs must not affect business records, stock or
inventory transactions.

## 7.4 Reports and dashboards

Do not create a separate reports database or duplicate report tables.
Calculate summaries from existing orders, order items, payments,
inventory and branch records.

-   Admin: system/user administration overview.
-   HQ: chain-wide sales, branch performance, inventory and operational
    overview.
-   Branch Manager: own-branch sales, orders and inventory.
-   Server: personal operational order information.
-   Cook: kitchen queue and preparation status.

Reports must respect role and branch authorization.

------------------------------------------------------------------------

# 8. Role and permission matrix

The backend is the source of truth for authorization. The frontend may
hide unavailable actions for usability, but that is not security
enforcement.

## 8.1 Admin

-   Create, view, update, deactivate and reactivate users.
-   Initiate password resets.
-   Assign and change the five fixed roles.
-   Assign users to branches and reassign employees.
-   Create, view, update and deactivate branches.
-   Manage restaurant table records.
-   View, search, filter, simulate export and delete system logs.
-   View audit logs and permitted system administration information.
-   Cannot create new roles or delete historical business records.
-   Does not routinely manage restaurant orders, payments or inventory.

## 8.2 Headquarters Manager

-   View chain-wide dashboards, branches, orders, payments, refunds and
    reports.
-   Manage central menu items and permitted category details.
-   Manage central menu prices.
-   Create, update, publish and archive recipes.
-   Create, update, activate and deactivate promotions.
-   View inventory and alerts across all branches.
-   View relevant audit/business activity.
-   Cannot administer employee accounts, assign roles or branches, alter
    branch stock quantities, set branch minimum stock thresholds, or
    override local availability.

## 8.3 Branch Manager

-   View own-branch dashboard, employees, tables and orders.
-   Monitor the order queue.
-   Manage own-branch inventory, receiving, wastage and corrections.
-   Adjust own-branch minimum stock levels.
-   Start, save, resume and complete stocktakes.
-   View own-branch inventory transactions and alerts.
-   Set local menu availability where permitted.
-   View own-branch reports.
-   Authorize Server-submitted full refunds for their own branch after
    password confirmation, or initiate and confirm their own full refunds.
-   Cannot access another branch's data, alter central menu
    prices/recipes, manage users/roles, or access technical system logs.

## 8.4 Server

-   View own-branch tables and available menu items.
-   Create and submit customer orders.
-   Select fixed steak meals and their configured sides.
-   View relevant order progress.
-   Mark READY orders as COMPLETED once served.
-   Cancel orders only within the permitted cancellation rules and
    provide a reason.
-   Process payment after order completion.
-   View/display receipts and payment information relevant to their
    orders.
-   Apply eligible active promotions.
-   Request refunds with a reason; a Branch Manager must approve or reject
    the request and re-enter their password at the shared terminal.
-   Cannot change prices, recipes, inventory, users, roles or other
    branches' records.

## 8.5 Cook

-   View the kitchen queue for their branch.
-   View order details, meals, sides, drinks and preparation
    instructions.
-   Change order status from NEW to PREPARING and PREPARING to READY.
-   View preparation progress.
-   Cannot create orders, mark orders completed, cancel orders, access
    payments, manage inventory, change menus or access management
    reports.

## 8.6 Permission enforcement

Every protected backend operation must check: 1. Valid authentication.
2. Required role. 3. Branch scope, where relevant. 4.
Ownership/relationship to the requested record, where relevant. 5.
Business-state rules (for example, only a READY order can be completed).

Use consistent HTTP responses, including `401 Unauthorized` for
unauthenticated requests and `403 Forbidden` for authenticated users
lacking permission. Do not rely on frontend visibility alone.

------------------------------------------------------------------------

# 9. Main relationships

The main relationships are:

-   `Branch` 1-to-many `User` (for branch-assigned roles).
-   `User` 1-to-many `EmployeeBranchHistory`.
-   `Branch` 1-to-many `RestaurantTable`.
-   `MenuCategory` 1-to-many `MenuItem`.
-   `MenuItem` 1-to-1 `Recipe`.
-   `Recipe` 1-to-many `RecipeVersion`.
-   `RecipeVersion` 1-to-many `RecipeIngredient`.
-   `Ingredient` 1-to-many `RecipeIngredient`.
-   `Branch` 1-to-many `BranchInventory`.
-   `Ingredient` 1-to-many `BranchInventory`.
-   `Branch` 1-to-many `InventoryTransaction`.
-   `Ingredient` 1-to-many `InventoryTransaction`.
-   `Branch` 1-to-many `InventoryAlert` history.
-   `Branch` 1-to-many `Stocktake`.
-   `Stocktake` 1-to-many `StocktakeItem`.
-   `Branch` 1-to-many `Order`.
-   `RestaurantTable` 1-to-many `Order` over time.
-   `User` (Server) 1-to-many `Order`.
-   `Order` 1-to-many `OrderItem`.
-   `OrderItem` 1-to-many `OrderItemSide`.
-   `Order` 1-to-many `OrderStatusHistory`.
-   `Order` 1-to-0/1 successful `Payment` under the
    one-successful-payment rule.
-   `Payment` 1-to-many `Refund`.
-   `Promotion` 1-to-many `OrderPromotion`.
-   `Order` 1-to-many `OrderPromotion` (recommended one promotion per
    order).
-   `User` 1-to-many `Notification`.
-   `User` 1-to-many `AuditLog` and `SystemLog` (nullable for system
    actor).

Inventory transactions may optionally reference an `Order` and/or
`Stocktake` as their source. Use foreign keys and appropriate delete
restrictions so referenced business history cannot be accidentally
removed.

------------------------------------------------------------------------

# 10. Important database constraints and implementation safeguards

1.  Use UUID primary keys for business records.
2.  Unique user email.
3.  Unique branch code.
4.  Unique `(branchId, tableNumber)`.
5.  Unique `(categoryId, name)` for menu items.
6.  Unique `(branchId, menuItemId)` for branch availability.
7.  Unique `(recipeId, versionNumber)`.
8.  At most one published recipe version per recipe.
9.  Unique `(recipeVersionId, ingredientId)`.
10. Unique `(branchId, ingredientId)` for branch inventory.
11. Unique `(branchId, referenceType, referenceNumber)` for inventory
    references.
12. Unique `(stocktakeId, ingredientId)`.
13. At most one in-progress stocktake per branch.
14. At most one active inventory alert per branch and ingredient.
15. Unique `(branchId, orderNumber)` for order references.
16. A successful payment must not exceed the order amount; under this
    project's rule there is one successful payment per order.
17. Only full refunds are allowed; a payment cannot have more than one active or processed refund. A rejected request may be resubmitted.
18. Quantities and money must use appropriate decimal/integer types and
    validation.
19. Inventory must never become negative.
20. Use atomic database transactions for order submission, inventory
    deduction and related transaction creation.
21. Use idempotency protection for stock-changing submissions.
22. Preserve historical snapshots for order item names, prices, sides,
    recipe versions and promotion discounts.
23. Restrict deletes on referenced business records; use
    deactivation/archiving instead.
24. Enforce role and branch access in backend services/middleware.

Some constraints (CHECK constraints, partial unique indexes, and certain
cross-record rules) may require custom PostgreSQL SQL migrations
alongside Prisma migrations. Prisma schema alone may not express every
rule.

------------------------------------------------------------------------

# 11. Recommended implementation order

After reviewing this design, build in the following sequence:

## Phase 2 --- PostgreSQL and Prisma

1.  Inspect existing project folders and dependencies.
2.  Verify PostgreSQL installation and service status.
3.  Create the local development database.
4.  Configure backend environment variables and `.gitignore`.
5.  Install/configure Prisma for the existing project versions.
6.  Build the Prisma schema from this document.
7.  Add required custom SQL constraints.
8.  Run the initial migration.
9.  Verify the database with Prisma Studio.

## Phase 3 --- Backend foundation and APIs

1.  Express and TypeScript configuration.
2.  Prisma client and database connection.
3.  Authentication and password hashing.
4.  Role-based and branch-based authorization.
5.  User, branch and table APIs.
6.  Menu, recipe and availability APIs.
7.  Ingredient and inventory APIs.
8.  Order and kitchen workflow APIs.
9.  Payment, refund and promotion APIs.
10. Notifications, audit logs, system logs and reports.
11. Validation, error handling and security review.
12. Postman testing, including positive and forbidden-access cases.

## Phase 4 --- Frontend integration

1.  Connect React to the Express API.
2.  Implement login and role-aware navigation.
3.  Build the five role-specific workspaces.
4.  Connect each screen to protected API endpoints.
5.  Test complete workflows across roles and branches.

## Phase 5 --- Final testing and deployment

1.  End-to-end role and business-rule testing.
2.  Verify branch isolation and inventory concurrency.
3.  Verify order, cancellation, payment and refund behavior.
4.  Final documentation and demonstration preparation.
5.  Deployment only after local testing is complete.

------------------------------------------------------------------------

# 12. Items to verify during schema implementation

The following are technical details to settle during implementation, not
reasons to expand the business design:

-   Exact database representation of the system-managed opening-stock
    template.
-   Exact inventory `referenceType` mapping and reference counter
    implementation.
-   PostgreSQL partial unique indexes and CHECK constraints.
-   Precise stocktake reconciliation implementation that preserves
    movements after physical count.
-   Tax calculation configuration, because no tax rate or jurisdictional
    rule has yet been specified.
-   Exact permitted cancellation stages in service-level validation.
-   Whether card payments are represented as a simulated
    successful/failed in-app action or a future payment-provider
    integration. No real gateway is in scope now.

**Do not begin Prisma migrations or seed scripts until the project
folder, installed versions and this design have been checked together.**
