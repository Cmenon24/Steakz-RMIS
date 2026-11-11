
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  transferEmployee,
  resetUserPassword,
} from "../services/user.service.js";

import { AppError } from "../utils/app-error.js";

// Validate information required to create a user.
const createUserSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.email(),
  password: z.string().min(8).max(100),
  role: z.enum([
    "ADMIN",
    "HEADQUARTERS_MANAGER",
    "BRANCH_MANAGER",
    "SERVER",
    "COOK",
  ]),
  branchId: z.uuid().nullable().optional(),
}).strict();

// Validate optional fields used to update a user.
const updateUserSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  email: z.email().optional(),
  role: z.enum([
    "ADMIN",
    "HEADQUARTERS_MANAGER",
    "BRANCH_MANAGER",
    "SERVER",
    "COOK",
  ]).optional(),
  branchId: z.uuid().nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided"
);

// Validate employee branch transfer information.
const transferEmployeeSchema = z.object({
  newBranchId: z.uuid(),
  reason: z.string().trim().max(500).optional(),
}).strict();

// Validate the new password submitted by Admin.
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100),
}).strict();


// Handle requests to retrieve users visible to the authenticated user.
export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Require authenticated user information.
    if (!req.auth) {
      throw new AppError("Authentication required", 401);
    }

    // Retrieve users according to the requester's role and branch.
    const users = await getAllUsers({
      role: req.auth.role,
      branchId: req.auth.branchId,
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to retrieve one user.
export async function getUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the user ID.
    const userId = req.params.userId;

    if (typeof userId !== "string") {
      throw new AppError("Invalid user ID", 400);
    }

    // Require authenticated user information.
    if (!req.auth) {
      throw new AppError("Authentication required", 401);
    }

    // Retrieve the user within the requester's permitted scope.
    const user = await getUserById(userId, {
      role: req.auth.role,
      branchId: req.auth.branchId,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}



// Handle requests to create a new user.
export async function createUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the submitted user information.
    const validatedData = createUserSchema.parse(req.body);

    // Create the user through the service.
    const user = await createUser(validatedData);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to update an existing user.
export async function updateUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the user ID from the URL.
    const userId = req.params.userId;

    if (typeof userId !== "string") {
      throw new AppError("Invalid user ID", 400);
    }

    // Validate the submitted update information.
    const validatedData = updateUserSchema.parse(req.body);

    // Update the user through the service.
    const user = await updateUser(userId, validatedData);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to deactivate a user account.
export async function deactivateUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the user ID from the URL.
    const userId = req.params.userId;

    if (typeof userId !== "string") {
      throw new AppError("Invalid user ID", 400);
    }

    // Deactivate the account through the service.
    // Use the authenticated Admin's ID for the safety checks.
    if (!req.auth) {
        throw new AppError("Authentication required", 401);
    }

    const user = await deactivateUser(userId, req.auth.userId);

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to reactivate a user account.
export async function reactivateUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the user ID from the URL.
    const userId = req.params.userId;

    if (typeof userId !== "string") {
      throw new AppError("Invalid user ID", 400);
    }

    // Reactivate the account through the service.
    const user = await reactivateUser(userId);

    res.status(200).json({
      success: true,
      message: "User reactivated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to transfer an employee to another branch.
export async function transferEmployeeController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the employee ID from the URL.
    const userId = req.params.userId;

    if (typeof userId !== "string") {
      throw new AppError("Invalid user ID", 400);
    }

    // Ensure the authenticated user is available.
    if (!req.auth) {
      throw new AppError("Authentication required", 401);
    }

    // Validate the destination branch and optional reason.
    const validatedData = transferEmployeeSchema.parse(req.body);

    // Record the transfer using the authenticated user's ID.
    const result = await transferEmployee({
      userId,
      newBranchId: validatedData.newBranchId,
      changedByUserId: req.auth.userId,
      reason: validatedData.reason,
    });

    res.status(200).json({
      success: true,
      message: "Employee transferred successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to reset a user's password.
export async function resetUserPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the user ID from the URL.
    const userId = req.params.userId;

    if (typeof userId !== "string") {
      throw new AppError("Invalid user ID", 400);
    }

    // Validate the new password.
    const validatedData = resetPasswordSchema.parse(req.body);

    // Reset the password through the service.
    const user = await resetUserPassword(
      userId,
      validatedData.newPassword
    );

    res.status(200).json({
      success: true,
      message: "User password reset successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
}