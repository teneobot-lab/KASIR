import { createContext, useContext, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("kasir_token");

  const { data: user, isLoading, isError } = useGetMe({
    query: { enabled: !!token, retry: false, queryKey: ["auth-me", token] }
  } as any);

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
    <AuthContext.Provider value={{ isAuthenticated: !!user && !isError, isLoading, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
