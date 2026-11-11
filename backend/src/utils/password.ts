
import bcrypt from "bcryptjs";

// Define the work factor used when hashing passwords.
const SALT_ROUNDS = 12;

// Convert a plain-text password into a secure hash.
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Compare a submitted password against its stored hash.
export async function comparePassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
