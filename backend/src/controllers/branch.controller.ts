import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deactivateBranch,
} from "../services/branch.service.js";
import { AppError } from "../utils/app-error.js";

// Validate the information required to create a branch.
const createBranchSchema = z.object({
  branchCode: z.string().trim().min(3).max(10),
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5),
  contactNumber: z.string().trim().min(5).max(30),
  email: z.email(),
  timeZone: z.string().trim().min(1),
}).strict();

// Validate the optional fields used to update a branch.
const updateBranchSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  address: z.string().trim().min(5).optional(),
  contactNumber: z.string().trim().min(5).max(30).optional(),
  email: z.email().optional(),
  timeZone: z.string().trim().min(1).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided"
);

// Handle requests to retrieve all branches.
export async function getBranches(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Retrieve all branch records.
    const branches = await getAllBranches();

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to retrieve one branch.
export async function getBranch(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate that the branch ID is a single string.
    const branchId = req.params.branchId;

    if (typeof branchId !== "string") {
      throw new AppError("Invalid branch ID", 400);
    }

    if (!req.auth) {
        throw new AppError("Authentication required", 401);
    }

    // Retrieve the branch using its UUID.
    const branch = await getBranchById(branchId, {
        role: req.auth.role,
        branchId: req.auth.branchId,
    });

    res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to create a new branch.
export async function createBranchController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the submitted branch information.
    const branch = createBranchSchema.parse(req.body);

    // Create the branch in the database.
    const newBranch = await createBranch(branch);

    res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: newBranch,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to update an existing branch.
export async function updateBranchController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the branch ID.
    const branchId = req.params.branchId;

    if (typeof branchId !== "string") {
      throw new AppError("Invalid branch ID", 400);
    }

    // Validate the submitted update fields.
    const updates = updateBranchSchema.parse(req.body);

    // Update the branch in the database.
    const updatedBranch = await updateBranch(branchId, updates);

    res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      data: updatedBranch,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to deactivate a branch.
export async function deactivateBranchController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the branch ID.
    const branchId = req.params.branchId;

    if (typeof branchId !== "string") {
      throw new AppError("Invalid branch ID", 400);
    }

    // Deactivate the branch.
    const branch = await deactivateBranch(branchId);

    res.status(200).json({
      success: true,
      message: "Branch deactivated successfully",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
}