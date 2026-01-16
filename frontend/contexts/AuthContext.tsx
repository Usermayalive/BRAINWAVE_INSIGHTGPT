"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken, clearAuthToken, getAuthToken } from "@/lib/auth-fetch";

interface User {
    id: string;
    email: string;
    full_name?: string;
    is_active: boolean;
    is_superuser: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check for token on mount
        const initAuth = async () => {
            const token = getAuthToken();
            if (token) {
                try {
                    // Try to restore user from localStorage first
                    const savedUser = localStorage.getItem("user");
                    if (savedUser) {
                        setUser(JSON.parse(savedUser));
                    }

                    // Verify with backend
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/me`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        localStorage.setItem("user", JSON.stringify(userData));
                    } else {
                        // Token invalid - clear auth
                        logout();
                    }
                } catch (error) {
                    console.error("Auth check failed:", error);
                    // Don't auto-logout on network error to prevent poor UX
                    // Keep session if local storage exists
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = (token: string, userData: User) => {
        // Use the helper that sets both localStorage and cookie
        setAuthToken(token);
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        router.push("/");
    };

    const logout = () => {
        // Use the helper that clears both localStorage and cookie
        clearAuthToken();
        setUser(null);
        router.push("/login");
    };

    const getToken = (): string | null => {
        return getAuthToken();
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            isAuthenticated: !!user,
            getToken
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

