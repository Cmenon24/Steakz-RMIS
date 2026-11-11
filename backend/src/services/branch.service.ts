import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { Prisma } from "../generated/prisma/client.js";

// Retrieve all branches, including inactive branches.
export async function getAllBranches() {
  return prisma.branch.findMany({
    orderBy: {
      branchCode: "asc",
    },
  });
}

// Define the requester's role and branch for branch visibility checks.
interface BranchVisibilityContext {
  role: "ADMIN" | "HEADQUARTERS_MANAGER" | "BRANCH_MANAGER" | "SERVER" | "COOK";
  branchId: string | null;
}

// Retrieve one branch while enforcing branch-level visibility.
export async function getBranchById(
  branchId: string,
  requester: BranchVisibilityContext
) {

  // Only management roles can view branch details.
  if (
    requester.role !== "ADMIN" &&
    requester.role !== "HEADQUARTERS_MANAGER" &&
    requester.role !== "BRANCH_MANAGER"
  ) {
    throw new AppError("Forbidden", 403);
  }

  // A Branch Manager must have an assigned branch.
  if (requester.role === "BRANCH_MANAGER" && !requester.branchId) {
    throw new AppError("Branch assignment required", 403);
  }

  // Prevent Branch Managers from viewing another branch.
  if (
    requester.role === "BRANCH_MANAGER" &&
    requester.branchId !== branchId
  ) {
    throw new AppError("Branch not found", 404);
  }

  const branch = await prisma.branch.findUnique({
    where: {
      id: branchId,
    },
  });

  // Return 404 when the requested branch does not exist.
  if (!branch) {
    throw new AppError("Branch not found", 404);
  }

  return branch;
}

// Define the information required to create a branch.
export interface CreateBranchInput {
  branchCode: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  timeZone: string;
}

// Create a new restaurant branch and initialize its menu availability.
export async function createBranch(data: CreateBranchInput) {
  // Normalize the branch code and email.
  const branchCode = data.branchCode.trim().toUpperCase();
  const email = data.email.trim().toLowerCase();

  // Check whether the branch code already exists.
  const existingCode = await prisma.branch.findUnique({
    where: { branchCode },
  });

  if (existingCode) {
    throw new AppError("Branch code already exists", 409);
  }

  // Check whether another branch uses the same email.
  const existingEmail = await prisma.branch.findFirst({
    where: { email },
  });

  if (existingEmail) {
    throw new AppError("Branch email already exists", 409);
  }

  try {
    // Create the branch and its menu availability records together.
    return await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          branchCode,
          name: data.name.trim(),
          address: data.address.trim(),
          contactNumber: data.contactNumber.trim(),
          email,
          timeZone: data.timeZone.trim(),
          isActive: true,
        },
      });

      // Find all active menu items in active categories.
      const activeMenuItems = await tx.menuItem.findMany({
        where: {
          isActive: true,
          category: {
            isActive: true,
          },
        },
        select: {
          id: true,
        },
      });

      // Initialize availability for every active menu item.
      if (activeMenuItems.length > 0) {
        await tx.branchMenuAvailability.createMany({
          data: activeMenuItems.map((item) => ({
            branchId: branch.id,
            menuItemId: item.id,
            isAvailable: true,
          })),
        });
      }

      return branch;
    });
  } catch (error) {
    // Handle a database uniqueness conflict.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Branch code or email already exists", 409);
    }

    throw error;
  }
}

// Define the fields that can be updated for a branch.
export interface UpdateBranchInput {
  name?: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  timeZone?: string;
}

// Update the details of an existing branch.
export async function updateBranch(
  branchId: string,
  data: UpdateBranchInput
) {
  // Confirm that the branch exists and is active.
  const existingBranch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!existingBranch) {
    throw new AppError("Branch not found", 404);
  }

  if (!existingBranch.isActive) {
    throw new AppError("Inactive branches cannot be updated", 400);
  }

  // Normalize the email before checking for duplicates.
  const email = data.email?.trim().toLowerCase();

  // Prevent another branch from using the same email.
  if (email) {
    const existingEmail = await prisma.branch.findFirst({
      where: {
        email,
        id: { not: branchId },
      },
    });

    if (existingEmail) {
      throw new AppError("Branch email already exists", 409);
    }
  }

  // Validate the timezone using the runtime's IANA timezone support.
  if (data.timeZone) {
    try {
      new Intl.DateTimeFormat("en-US", {
        timeZone: data.timeZone.trim(),
      });
    } catch {
      throw new AppError("Invalid time zone", 400);
    }
  }

  // Build the update using only fields that were submitted.
  const updateData: Prisma.BranchUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  if (data.address !== undefined) {
    updateData.address = data.address.trim();
  }

  if (data.contactNumber !== undefined) {
    updateData.contactNumber = data.contactNumber.trim();
  }

  if (email !== undefined) {
    updateData.email = email;
  }

  if (data.timeZone !== undefined) {
    updateData.timeZone = data.timeZone.trim();
  }

  // Save the updated branch details.
  return prisma.branch.update({
    where: { id: branchId },
    data: updateData,
  });
}

// Deactivate a branch when no unresolved operational activity remains.
export async function deactivateBranch(branchId: string) {
  // Confirm that the branch exists.
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new AppError("Branch not found", 404);
  }

  // Prevent a branch from being deactivated more than once.
  if (!branch.isActive) {
    throw new AppError("Branch is already inactive", 409);
  }

  // Check for active employees assigned to the branch.
  const activeEmployees = await prisma.user.count({
    where: {
      branchId,
      isActive: true,
    },
  });

  // Check for orders that have not reached a final status.
  const activeOrders = await prisma.order.count({
    where: {
      branchId,
      status: {
        in: ["NEW", "PREPARING", "READY"],
      },
    },
  });

  // Check for completed orders that have not been successfully paid.
  const unpaidOrders = await prisma.order.count({
    where: {
      branchId,
      status: "COMPLETED",
      payments: {
        none: {
          status: "SUCCESSFUL",
        },
      },
    },
  });

  // Check for an unfinished stocktake.
  const activeStocktakes = await prisma.stocktake.count({
    where: {
      branchId,
      status: "IN_PROGRESS",
    },
  });

  // Collect any conditions preventing deactivation.
  const blockers: string[] = [];

  if (activeEmployees > 0) {
    blockers.push("active employees assigned");
  }

  if (activeOrders > 0) {
    blockers.push("orders still in progress");
  }

  if (unpaidOrders > 0) {
    blockers.push("completed orders awaiting payment");
  }

  if (activeStocktakes > 0) {
    blockers.push("stocktakes still in progress");
  }

  // Reject deactivation when unresolved activity exists.
  if (blockers.length > 0) {
    throw new AppError(
      `Branch cannot be deactivated: ${blockers.join(", ")}`,
      409
    );
  }

  // Soft-delete the branch while preserving its historical records.
  return prisma.branch.update({
    where: { id: branchId },
    data: {
      isActive: false,
      deactivatedAt: new Date(),
    },
  });
}