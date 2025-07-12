import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { apiRequest } from "./queryClient";
import { useLocation } from "wouter";

interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  storeId?: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        const userData = JSON.parse(atob(token));
        setUser(userData);
      } catch (err) {
        console.warn("Invalid token in localStorage");
        localStorage.removeItem("auth_token");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, role: string): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
        role,
      });

      if (!response.ok) throw new Error("Login failed");

      const data = await response.json();

      setUser(data.user);
      localStorage.setItem("auth_token", data.token);

      // Small delay to allow state propagation before navigation
      setTimeout(() => {
        setLocation(role === "admin" ? "/admin" : "/gate-operator");
      }, 100);

      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_token");
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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


// import { createContext, useContext, useEffect, useState } from "react";
// import { apiRequest } from "./queryClient";
// import { useLocation } from "wouter";

// interface User {
//   id: number;
//   username: string;
//   name: string;
//   role: string;
//   storeId?: number;
// }

// interface AuthContextType {
//   user: User | null;
//   login: (username: string, password: string, role: string) => Promise<boolean>;
//   logout: () => void;
//   isLoading: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
//   const [user, setUser] = useState<User | null>(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [, setLocation] = useLocation();

//   useEffect(() => {
//     // Check for stored auth token
//     const token = localStorage.getItem("auth_token");
//     if (token) {
//       try {
//         const userData = JSON.parse(atob(token));
//         setUser(userData);
//       } catch (error) {
//         localStorage.removeItem("auth_token");
//       }
//     }
//     setIsLoading(false);
//   }, []);

//   const login = async (username: string, password: string, role: string): Promise<boolean> => {
//     try {
//       const response = await apiRequest("POST", "/api/auth/login", {
//         username,
//         password,
//         role
//       });
      
//       if (!response.ok) {
//         throw new Error('Login failed');
//       }
      
//       const data = await response.json();
      
//       // Set user and token first
//       setUser(data.user);
//       localStorage.setItem("auth_token", data.token);
      
//       // Use setTimeout to ensure state updates before navigation
//       setTimeout(() => {
//         if (role === "admin") {
//           setLocation("/admin");
//         } else {
//           setLocation("/gate-operator");
//         }
//       }, 100);
      
//       return true;
//     } catch (error) {
//       console.error("Login failed:", error);
//       return false;
//     }
//   };

//   const logout = () => {
//     setUser(null);
//     localStorage.removeItem("auth_token");
//     setLocation("/");
//   };

//   return (
//     <AuthContext.Provider value={{ user, login, logout, isLoading }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// }
