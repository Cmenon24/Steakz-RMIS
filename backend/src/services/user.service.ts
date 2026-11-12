
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { hashPassword } from "../utils/password.js";

//Retrieves all users, individual user by ID, creates, updates, deactivates/reactivates users, transfers employees between branches, and resets user passwords while enforcing role and branch assignment rules.


// Defines who is requesting user information.
interface UserVisibilityContext {
  role: "ADMIN" | "HEADQUARTERS_MANAGER" | "BRANCH_MANAGER" | "SERVER"
    | "COOK";
  branchId: string | null;
}

// Retrieve users according to the authenticated user's permissions.
export async function getAllUsers(
  requester: UserVisibilityContext
) {
  // Branch Managers must have an assigned branch.
  if (requester.role === "BRANCH_MANAGER" && !requester.branchId) {
    throw new AppError("Branch assignment required", 403);
  }

  // Only the three permitted roles can retrieve users.
  if (
    !["ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"].includes(
      requester.role
    )
  ) {
    throw new AppError("You are not authorized to view users", 403);
  }

  return prisma.user.findMany({
    where:
      requester.role === "BRANCH_MANAGER"
        ? { branchId: requester.branchId }
        : undefined,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      branchId: true,
      isActive: true,
      deactivatedAt: true,
      createdAt: true,
      updatedAt: true,
      branch: {
        select: {
          name: true,
          branchCode: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// Retrieve one user while enforcing branch visibility.
export async function getUserById(
  userId: string,
  requester: UserVisibilityContext
) {
  // Branch Managers must have an assigned branch.
  if (requester.role === "BRANCH_MANAGER" && !requester.branchId) {
    throw new AppError("Branch assignment required", 403);
  }

  // Only the three permitted roles can retrieve user details.
  if (
    !["ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"].includes(
      requester.role
    )
  ) {
    throw new AppError("You are not authorized to view users", 403);
  }

  // Restrict Branch Managers to users assigned to their own branch.
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      ...(requester.role === "BRANCH_MANAGER" && {
        branchId: requester.branchId,
      }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      branchId: true,
      isActive: true,
      deactivatedAt: true,
      createdAt: true,
      updatedAt: true,
      branch: {
        select: {
          name: true,
          branchCode: true,
        },
      },
    },
  });

  // Do not reveal whether a user from another branch exists.
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
}



interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "ADMIN" | "HEADQUARTERS_MANAGER" | "BRANCH_MANAGER" | "SERVER" | "COOK";
  branchId?: string | null;
}

// Create a user account with the correct role and branch assignment.
export async function createUser(input: CreateUserInput, actingUserId: string) {
  const email = input.email.toLowerCase().trim();

  // Check whether the email is already registered.
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email is already registered", 409);
  }

  // Central management roles must not have a branch assignment.
  const centralRoles = ["ADMIN", "HEADQUARTERS_MANAGER"];
  const requiresBranch = !centralRoles.includes(input.role);

  if (requiresBranch && !input.branchId) {
    throw new AppError("A branch assignment is required for this role", 400);
  }

  if (!requiresBranch && input.branchId) {
    throw new AppError("This role cannot be assigned to a branch", 400);
  }

  // Confirm that the assigned branch exists and is active.
  if (input.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: input.branchId },
    });

    if (!branch || !branch.isActive) {
      throw new AppError("Branch not found or inactive", 404);
    }
  }

  // Hash the initial password before saving the account.
  const passwordHash = await hashPassword(input.password);

  // Save the account and its audit record together.
  return prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email,
        passwordHash,
        role: input.role,
        branchId: input.branchId ?? null,
      },
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true,
        branchId: true, isActive: true, createdAt: true,
        branch: { select: { name: true, branchCode: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actingUserId, actorType: "USER", branchId: createdUser.branchId,
        action: "USER_CREATED", entityType: "USER", entityId: createdUser.id,
        details: { firstName: createdUser.firstName, lastName: createdUser.lastName, email: createdUser.email, role: createdUser.role },
      },
    });
    return createdUser;
  });
}

interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: "ADMIN" | "HEADQUARTERS_MANAGER" | "BRANCH_MANAGER" | "SERVER" | "COOK";
  branchId?: string | null;
}


// Update user details while enforcing role and branch rules.
export async function updateUser(
  userId: string,
  input: UpdateUserInput,
  actingUserId: string
) {
  // Confirm that the user exists.
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  // Check whether the new email belongs to another user.
  if (input.email) {
    const email = input.email.toLowerCase().trim();

    const duplicateEmail = await prisma.user.findFirst({
      where: {
        email,
        id: { not: userId },
      },
    });

    if (duplicateEmail) {
      throw new AppError("Email is already registered", 409);
    }
  }

  // Determine the role and branch assignment that will apply after the update.
  const role = input.role ?? existingUser.role;
  const centralRoles = ["ADMIN", "HEADQUARTERS_MANAGER"];
  const requiresBranch = !centralRoles.includes(role);
  let branchId: string | null;

  if (!requiresBranch) {
    // Central roles never retain a branch assignment.
    if (input.branchId) {
      throw new AppError("This role cannot be assigned to a branch", 400);
    }
    branchId = null;
  } else {
    // A branch role keeps its current branch unless Admin assigns one explicitly.
    branchId = input.branchId === undefined
      ? existingUser.branchId
      : input.branchId;

    if (!branchId) {
      throw new AppError("A branch assignment is required for this role", 400);
    }

    // Existing branch-to-branch moves must use the transfer endpoint so history is retained.
    if (existingUser.branchId && input.branchId && input.branchId !== existingUser.branchId) {
      throw new AppError("Use the employee transfer action to change an existing branch assignment", 400);
    }
  }

  // Confirm that the assigned branch exists and is active.
  if (branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch || !branch.isActive) {
      throw new AppError("Branch not found or inactive", 404);
    }
  }

  // Update the account and write its audit record atomically.
  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName.trim() }),
        ...(input.lastName !== undefined && { lastName: input.lastName.trim() }),
        ...(input.email !== undefined && { email: input.email.toLowerCase().trim() }),
        ...(input.role !== undefined && { role: input.role }),
        branchId,
      },
      select: {
        id: true, firstName: true, lastName: true, email: true, role: true,
        branchId: true, isActive: true, deactivatedAt: true, createdAt: true,
        updatedAt: true, branch: { select: { name: true, branchCode: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actingUserId, actorType: "USER", branchId: updatedUser.branchId,
        action: "USER_UPDATED", entityType: "USER", entityId: updatedUser.id,
        details: {
          changedFields: Object.keys(input),
          previous: { firstName: existingUser.firstName, lastName: existingUser.lastName, email: existingUser.email, role: existingUser.role, branchId: existingUser.branchId },
          current: { firstName: updatedUser.firstName, lastName: updatedUser.lastName, email: updatedUser.email, role: updatedUser.role, branchId: updatedUser.branchId },
        },
      },
    });
    return updatedUser;
  });
}


// Deactivate a user while preserving their historical records.
export async function deactivateUser(userId: string, actingUserId: string) {
  // Confirm that the user exists.
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Prevent Admins from deactivating their own account.
if (userId === actingUserId) {
  throw new AppError("You cannot deactivate your own account", 409);
}

// Protect the system from losing its last active Admin.
if (user.role === "ADMIN") {
  const activeAdminCount = await prisma.user.count({
    where: {
      role: "ADMIN",
      isActive: true,
      deactivatedAt: null,
    },
  });

  if (activeAdminCount <= 1) {
    throw new AppError("Cannot deactivate the last active Admin", 409);
  }
}

  // Prevent an account from being deactivated twice.
  if (!user.isActive) {
    throw new AppError("User is already inactive", 409);
  }

  // Soft-deactivate the account and record the action atomically.
  return prisma.$transaction(async (tx) => {
    const deactivatedUser = await tx.user.update({
      where: { id: userId },
      data: { isActive: false, deactivatedAt: new Date() },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, branchId: true, isActive: true, deactivatedAt: true },
    });
    await tx.auditLog.create({
      data: { userId: actingUserId, actorType: "USER", branchId: user.branchId, action: "USER_DEACTIVATED", entityType: "USER", entityId: user.id, details: { email: user.email, role: user.role } },
    });
    return deactivatedUser;
  });
}


// Reactivate a previously deactivated user account.
export async function reactivateUser(userId: string, actingUserId: string) {
  // Confirm that the user exists.
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Prevent an already active account from being reactivated.
  if (user.isActive) {
    throw new AppError("User is already active", 409);
  }

  // Confirm that the user's assigned branch is still active.
  if (user.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: user.branchId },
    });

    if (!branch || !branch.isActive) {
      throw new AppError(
        "Cannot reactivate user because their assigned branch is inactive",
        409
      );
    }
  }

  // Restore the account and record the action atomically.
  return prisma.$transaction(async (tx) => {
    const reactivatedUser = await tx.user.update({
      where: { id: userId }, data: { isActive: true, deactivatedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, branchId: true, isActive: true, deactivatedAt: true },
    });
    await tx.auditLog.create({
      data: { userId: actingUserId, actorType: "USER", branchId: user.branchId, action: "USER_REACTIVATED", entityType: "USER", entityId: user.id, details: { email: user.email, role: user.role } },
    });
    return reactivatedUser;
  });
}

interface TransferEmployeeInput {
  userId: string;
  newBranchId: string;
  changedByUserId: string;
  reason?: string;
}


// Transfer an employee and record the change in branch history.
export async function transferEmployee(input: TransferEmployeeInput) {
  // Find the employee being transferred.
  const employee = await prisma.user.findUnique({
    where: { id: input.userId },
  });

  if (!employee) {
    throw new AppError("User not found", 404);
  }

  // Only branch-assigned employees can be transferred.
  if (
    !["BRANCH_MANAGER", "SERVER", "COOK"].includes(employee.role)
  ) {
    throw new AppError("This user cannot be transferred between branches", 400);
  }

  if (!employee.isActive) {
    throw new AppError("Inactive users cannot be transferred", 409);
  }

  if (!employee.branchId) {
    throw new AppError("Employee has no current branch assignment", 400);
  }

  // Prevent transfers to the employee's current branch.
  if (employee.branchId === input.newBranchId) {
    throw new AppError("Employee is already assigned to this branch", 409);
  }

  // Confirm that the destination branch exists and is active.
  const newBranch = await prisma.branch.findUnique({
    where: { id: input.newBranchId },
  });

  if (!newBranch || !newBranch.isActive) {
    throw new AppError("Destination branch not found or inactive", 404);
  }

  // Update the assignment and record its history atomically.
  return prisma.$transaction(async (tx) => {
    const updatedEmployee = await tx.user.update({
      where: { id: input.userId },
      data: {
        branchId: input.newBranchId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        branchId: true,
      },
    });

    const history = await tx.employeeBranchHistory.create({
      data: {
        userId: input.userId,
        previousBranchId: employee.branchId!,
        newBranchId: input.newBranchId,
        changedByUserId: input.changedByUserId,
        reason: input.reason?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: input.changedByUserId, actorType: "USER", branchId: input.newBranchId,
        action: "USER_BRANCH_TRANSFERRED", entityType: "USER", entityId: employee.id,
        details: { email: employee.email, role: employee.role, previousBranchId: employee.branchId, newBranchId: input.newBranchId, reason: input.reason?.trim() || null, transferHistoryId: history.id },
      },
    });

    return {
      employee: updatedEmployee,
      transferHistory: history,
    };
  });
}


// Reset a user's password using an Admin-provided password.
export async function resetUserPassword(
  userId: string,
  newPassword: string,
  actingUserId: string
) {
  // Confirm that the user exists.
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Hash the new password before saving it.
  const passwordHash = await hashPassword(newPassword);

  // Update the password and record the reset without storing password data.
  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId }, data: { passwordHash },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
    });
    await tx.auditLog.create({
      data: { userId: actingUserId, actorType: "USER", branchId: user.branchId, action: "USER_PASSWORD_RESET", entityType: "USER", entityId: user.id, details: { email: user.email, role: user.role } },
    });
    return updatedUser;
  });
}
