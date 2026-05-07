import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("kasir_token");
  
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: ["auth-me", token],
    }
  });

  useEffect(() => {
    if (!token || isError) {
      localStorage.removeItem("kasir_token");
      setLocation("/login");
    }
  }, [token, isError, setLocation]);

  const logout = () => {
    localStorage.removeItem("kasir_token");
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
