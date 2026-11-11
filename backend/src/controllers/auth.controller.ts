
// Handles login requests and retrieves the authenticated user's profile.
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { loginUser } from "../services/auth.service.js";
import { AppError } from "../utils/app-error.js";

// Validate the login request body.
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

// Handle user login requests.
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      throw new AppError("Invalid login information", 400);
    }

    const { email, password } = result.data;
    const data = await loginUser(email, password);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (error) {
    next(error);
  }
}

// Retrieve the latest profile information for the authenticated user.
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.auth) {
      throw new AppError("Authentication required", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        branchId: true,
        branch: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: user.branch?.name ?? null,
      },
    });
  } catch (error) {
    next(error);
  }
}
