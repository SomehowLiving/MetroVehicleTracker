import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function useRequireAuth(requiredRole?: string) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (user && requiredRole && user.role !== requiredRole) {
      setLocation("/");
    }
  }, [user, isLoading, requiredRole, setLocation]);

  return { user, isLoading };
}
