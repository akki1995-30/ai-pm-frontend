import React, { createContext, useContext, useState } from "react";
import logger from "../lib/logger";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem("token");
    logger.debug("AuthContext", stored ? "hydrated token from localStorage" : "no token in localStorage");
    return stored;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored) as AuthUser;
      logger.debug("AuthContext", `hydrated user from localStorage`, { name: parsed.name, role: parsed.role });
      return parsed;
    }
    return null;
  });

  const login = (newToken: string, newUser: AuthUser) => {
    logger.info("AuthContext", `login — user: ${newUser.name}, role: ${newUser.role ?? "unknown"}`);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    logger.info("AuthContext", `logout — user: ${user?.name ?? "unknown"}`);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
