import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import type { AuthenticatedUser } from "./auth.middleware.js";

// Define the roles that can access protected endpoints.
type UserRole = AuthenticatedUser["role"];

// Check whether the user's role is permitted to access an endpoint.
export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Confirm that the user has already been authenticated.
    if (!req.auth) {
      return next(new AppError("Authentication required", 401));
    }

    // Check whether the user's role is allowed.
    if (!allowedRoles.includes(req.auth.role)) {
      return next(new AppError("You do not have permission to access this resource", 403));
    }

    next();
  };
}