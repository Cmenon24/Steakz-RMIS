
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  login as loginService,
  getProfile,
  logout as logoutService,
  type AuthUser,
} from "../services/auth.service";

// Define the values available throughout the application.
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

// Create the authentication context.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provide authentication information to child components.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the user's session when the application loads.
  useEffect(() => {
    async function restoreSession() {
      const accessToken = sessionStorage.getItem("steakz_access_token");

      if (!accessToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getProfile();
        setUser(currentUser);
      } catch {
        // Clear invalid or expired sessions.
        logoutService();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Authenticate the user and update the application state.
  async function handleLogin(email: string, password: string) {
    const authenticatedUser = await loginService(email, password);
    setUser(authenticatedUser);

    return authenticatedUser;
  }

  // End the local authentication session.
  function handleLogout() {
    logoutService();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Provide a reusable hook for accessing authentication.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
