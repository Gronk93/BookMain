import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import i18n from "@/i18n";

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt?: string;
}

export interface UserPreferencesData {
  id?: string;
  userId?: string;
  language: "es-MX" | "en-US";
  theme: "light" | "dark" | "system";
  readingMode: "standard" | "study" | "speed";
  fontSize: "small" | "medium" | "large" | "x-large";
}

interface AuthContextType {
  user: UserProfile | null;
  preferences: UserPreferencesData | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferencesData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "bookmind-auth-token";
const USER_KEY = "bookmind-auth-user";
const PREFS_KEY = "bookmind-auth-prefs";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [preferences, setPreferences] = useState<UserPreferencesData | null>(() => {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      return stored
        ? JSON.parse(stored)
        : {
            language: (i18n.language as any) || "es-MX",
            theme: "system",
            readingMode: "standard",
            fontSize: "medium",
          };
    } catch {
      return {
        language: "es-MX",
        theme: "system",
        readingMode: "standard",
        fontSize: "medium",
      };
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Configure custom-fetch to automatically attach Bearer token
  useEffect(() => {
    setAuthTokenGetter(() => token);
  }, [token]);

  // Hydrate user and preferences from server on mount
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      if (!token) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.user) {
            setUser(data.user);
            setPreferences(data.preferences);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            localStorage.setItem(PREFS_KEY, JSON.stringify(data.preferences));
            if (data.preferences?.language && data.preferences.language !== i18n.language) {
              i18n.changeLanguage(data.preferences.language);
            }
          }
        } else if (res.status === 401) {
          // Token invalid/expired
          if (isMounted) {
            setUser(null);
            setToken(null);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }
      } catch {
        // Offline / network fallback: keep stored user
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Error al iniciar sesión");
      }

      setToken(data.token);
      setUser(data.user);
      setPreferences(data.preferences);

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(PREFS_KEY, JSON.stringify(data.preferences));

      if (data.preferences?.language) {
        i18n.changeLanguage(data.preferences.language);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Error al registrarse");
      }

      setToken(data.token);
      setUser(data.user);
      setPreferences(data.preferences);

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem(PREFS_KEY, JSON.stringify(data.preferences));

      if (data.preferences?.language) {
        i18n.changeLanguage(data.preferences.language);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
    } catch {
      // ignore
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferencesData>) => {
    const updated = { ...preferences, ...updates } as UserPreferencesData;
    setPreferences(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));

    if (updates.language) {
      i18n.changeLanguage(updates.language);
    }

    if (token) {
      try {
        await fetch("/api/me/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify(updates),
        });
      } catch {
        // ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
