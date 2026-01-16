"use client";

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
    BarChart3,
    Settings,
    Upload,
    Brain,
    History
} from "lucide-react";

const mainNavItems = [
    { title: "Dashboard", icon: BarChart3, href: "/" },
    { title: "Upload Document", icon: Upload, href: "/upload" },
    { title: "Documents", icon: FileText, href: "/documents" },
    { title: "Chat", icon: MessageSquare, href: "/chat" },
    { title: "History", icon: History, href: "/history" },
];

const settingsItems = [
    { title: "Settings", icon: Settings, href: "/settings" },
];

export function AppSidebar() {
    return (
        <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                        <Brain className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-sidebar-foreground">InsightGPT</h1>
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
                <div className="text-xs text-sidebar-foreground/50">
                    © 2026 InsightGPT
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
