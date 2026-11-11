
import { SignJWT, jwtVerify } from "jose";
import { env } from "./env.js";

// Convert the JWT secret into the byte format required by jose.
const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

// Define how long an authentication token remains valid.
const TOKEN_EXPIRATION = "15m";

// Create a signed JWT for an authenticated user.
export async function signAccessToken(payload: {
  // token contains below
  userId: string;
  role: string;
  branchId: string | null;
}): Promise<string> {
  return new SignJWT({
    role: payload.role,
    branchId: payload.branchId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(jwtSecret);
}

// Verify a JWT and return its trusted payload.
export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, jwtSecret, {
    algorithms: ["HS256"], //uses secret key to sign and verify the token
  });

  return payload;
}
