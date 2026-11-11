import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../config/jwt.js";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Define the authenticated user's current information.
export interface AuthenticatedUser {
  userId: string;
  role: "ADMIN" | "HEADQUARTERS_MANAGER" | "BRANCH_MANAGER" | "SERVER" | "COOK";
  branchId: string | null;
}

// Make authentication information available on Express requests.
declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

// Verify the JWT and confirm the user's current database status.
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  let payload;

  try {
    // Read the token from the Authorization header.
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("Authentication required", 401);
    }

    // Verify the token's signature and expiration.
    const token = authorization.slice(7);
    payload = await verifyAccessToken(token);

    if (typeof payload.sub !== "string") {
      throw new AppError("Invalid authentication token", 401);
    }
  } catch {
    return next(new AppError("Invalid or expired authentication token", 401));
  }

  try {
    // Retrieve the user's latest account information.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        branchId: true,
        isActive: true,
        deactivatedAt: true,
      },
    });

    // Reject accounts that no longer exist or are inactive.
    if (!user || !user.isActive || user.deactivatedAt) {
      throw new AppError("This account is inactive or unavailable", 403);
    }

    // Attach the current database information to the request.
    req.auth = {
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
    };

    next();
  } catch (error) {
    // Forward database and account errors to the error handler.
    next(error);
  }
}