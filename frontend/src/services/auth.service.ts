
import api from "./api";

// Define the five roles supported by the backend.
export type UserRole =
  | "ADMIN"
  | "HEADQUARTERS_MANAGER"
  | "BRANCH_MANAGER"
  | "SERVER"
  | "COOK";

// Define the authenticated user's information.
export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
}

// Define the login response returned by the backend.
interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

// Define the profile response returned by the backend.
interface ProfileResponse {
  success: boolean;
  message: string;
  data: AuthUser;
}

// Authenticate the user and save the access token.
export async function login(email: string, password: string) {
  const response = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  const { accessToken, user } = response.data.data;

  sessionStorage.setItem("steakz_access_token", accessToken);

  return user;
}

// Retrieve the latest authenticated user profile.
export async function getProfile(): Promise<AuthUser> {
  const response = await api.get<ProfileResponse>("/auth/profile");

  return response.data.data;
}

// Clear the local authentication session.
export function logout(): void {
  sessionStorage.removeItem("steakz_access_token");
}
