"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CurrentUser, TokenResponse, UserRole } from "./types";
import { api } from "./api";
import { toast } from "sonner";

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (tokenData: TokenResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.data) {
        setUser(res.data);
        setRole(res.data.role);
      }
    } catch (err) {
      console.warn("Session check failed, logging out:", err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("medikiosk_token");
    const savedRole = localStorage.getItem("medikiosk_role") as UserRole;
    if (savedToken) {
      setToken(savedToken);
      setRole(savedRole);
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (tokenData: TokenResponse) => {
    localStorage.setItem("medikiosk_token", tokenData.access_token);
    localStorage.setItem("medikiosk_refresh", tokenData.refresh_token);
    localStorage.setItem("medikiosk_role", tokenData.role);
    setToken(tokenData.access_token);
    setRole(tokenData.role);
    
    setUser({
      id: tokenData.user_id,
      role: tokenData.role,
      username: tokenData.name,
      full_name: tokenData.name,
      hospital_id: tokenData.hospital_id,
      doctor_id: tokenData.additional_info?.doctor_id,
    });
    toast.success(`Welcome, ${tokenData.name}! Logged in as ${tokenData.role}`);
  };

  const logout = () => {
    localStorage.removeItem("medikiosk_token");
    localStorage.removeItem("medikiosk_refresh");
    localStorage.removeItem("medikiosk_role");
    setToken(null);
    setUser(null);
    setRole(null);
    toast.info("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isLoading,
        login,
        logout,
        refreshUser: fetchCurrentUser,
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
