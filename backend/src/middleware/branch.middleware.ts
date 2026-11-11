import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";

// Restrict access to the user's assigned branch.
export function authorizeBranchAccess(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  // Confirm that the user has been authenticated.
  if (!req.auth) {
    return next(new AppError("Authentication required", 401));
  }

  const { role, branchId } = req.auth;

  // HQ Manager can access operational data across all branches.
  if (role === "HEADQUARTERS_MANAGER") {
    return next();
  }

  // Admin cannot access operational branch data through this middleware.
  if (role === "ADMIN") {
    return next(new AppError("You do not have permission to access this resource", 403));
  }

  // Read the branch ID from the route parameter.
  const requestedBranchId = req.params.branchId;

  // Ensure the user is assigned to the requested branch.
  if (!branchId || requestedBranchId !== branchId) {
    return next(new AppError("You do not have access to this branch", 403));
  }

  next();
}