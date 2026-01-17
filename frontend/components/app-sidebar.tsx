"use client";

import { useState, useEffect } from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    FileText,
    MessageSquare,
    LayoutDashboard,
    Settings,
    ArrowUpFromLine,
    Sparkles,
    History,
    Loader
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const mainNavItems = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { title: "Upload Document", icon: ArrowUpFromLine, href: "/upload" },
    { title: "Documents", icon: FileText, href: "/documents" },
    { title: "Chat", icon: MessageSquare, href: "/chat" },
    { title: "History", icon: History, href: "/history" },
];

const settingsItems = [
    { title: "Settings", icon: Settings, href: "/settings" },
];

interface ChatSession {
    session_id: string;
    title: string;
    document_ids: string[];
    last_message_preview: string;
}

import { useChat } from "@/contexts/ChatContext";

export function AppSidebar() {
    const { user, logout, isAuthenticated } = useAuth();
    const { recentChats, loadingChats } = useChat();

    return (
        <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/20">
                        <Sparkles className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">InsightGPT</h1>
                        <p className="text-xs text-sidebar-foreground/60">AI Document Analysis</p>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.href} className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {/* Recent Chat Sessions */}
                {isAuthenticated && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {loadingChats ? (
                                    <SidebarMenuItem>
                                        <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                                            <Loader className="h-3 w-3 animate-spin" />
                                            <span>Loading...</span>
                                        </div>
                                    </SidebarMenuItem>
                                ) : recentChats.length > 0 ? (
                                    recentChats.map((chat) => (
                                        <SidebarMenuItem key={chat.session_id}>
                                            <SidebarMenuButton asChild>
                                                <a
                                                    href={`/chat?doc=${chat.document_ids[0] || ''}`}
                                                    className="flex items-center gap-3"
                                                    title={chat.last_message_preview}
                                                >
                                                    <MessageSquare className="h-4 w-4 text-violet-400" />
                                                    <span className="truncate text-sm">{chat.title}</span>
                                                </a>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))
                                ) : (
                                    <SidebarMenuItem>
                                        <div className="px-2 py-1 text-xs text-muted-foreground">
                                            No recent chats
                                        </div>
                                    </SidebarMenuItem>
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}

                <SidebarGroup>
                    <SidebarGroupLabel>System</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {settingsItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <a href={item.href} className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4">
                {user ? (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border overflow-hidden">
                        <div className="h-8 w-8 min-w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
                            {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate leading-none">{user.full_name || "User"}</p>
                            <p className="text-[10px] text-muted-foreground truncate leading-none mt-1" title={user.email}>{user.email}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={logout} className="h-7 w-7 text-muted-foreground hover:text-red-400">
                            <LogOut className="h-3 w-3" />
                        </Button>
                    </div>
                ) : (
                    <div className="text-xs text-sidebar-foreground/50">
                        © 2026 InsightGPT
                    </div>
                )}
            </SidebarFooter>
        </Sidebar>
    );
}

