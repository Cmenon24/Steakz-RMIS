//Handles login logic and generates access tokens for authenticated users.
import { prisma } from "../config/prisma.js";
import { signAccessToken } from "../config/jwt.js";
import { AppError } from "../utils/app-error.js";
import { comparePassword } from "../utils/password.js";

// Authenticate a user using their email and password.
export async function loginUser(email: string, password: string) {
  // Find the account and its assigned branch.
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      branch: true,
    },
  });

  // Reject missing accounts or incorrect passwords.
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  // Prevent deactivated accounts from logging in.
  if (!user.isActive || user.deactivatedAt) {
    throw new AppError("This account is inactive", 403);
  }

  // Verify the submitted password against the stored hash.
  const passwordIsValid = await comparePassword(
    password,
    user.passwordHash
  );

  if (!passwordIsValid) {
    throw new AppError("Invalid email or password", 401);
  }

  // Create a signed access token for the authenticated user.
  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    branchId: user.branchId,
  });

  // Return the token and safe user information.
  return {
    accessToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch?.name ?? null,
    },
  };
}
