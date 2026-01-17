"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet } from "@/lib/auth-fetch";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatSession {
    session_id: string;
    title: string;
    document_ids: string[];
    last_message_preview: string;
    updated_at?: string;
}

interface ChatContextType {
    recentChats: ChatSession[];
    loadingChats: boolean;
    fetchRecentChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
    const [loadingChats, setLoadingChats] = useState(false);

    const fetchRecentChats = useCallback(async () => {
        if (!isAuthenticated) {
            setRecentChats([]);
            return;
        }

        setLoadingChats(true);
        try {
            const response = await apiGet("/api/v1/chat/history/me?limit=5");
            if (response.ok) {
                const data = await response.json();
                setRecentChats(data.sessions || []);
            }
        } catch (error) {
            console.error("Failed to fetch recent chats:", error);
        } finally {
            setLoadingChats(false);
        }
    }, [isAuthenticated]);

    // Initial fetch when authentication state changes to true
    useEffect(() => {
        if (isAuthenticated) {
            fetchRecentChats();
        } else {
            setRecentChats([]);
        }
    }, [isAuthenticated, fetchRecentChats]);

    return (
        <ChatContext.Provider value={{
            recentChats,
            loadingChats,
            fetchRecentChats
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
};
