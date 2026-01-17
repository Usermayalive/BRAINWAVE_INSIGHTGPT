"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Monitor, Moon, Sun, Globe, LogOut, Check, Palette } from "lucide-react";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-violet-500/5 dark:to-violet-950/20">
            <header className="sticky top-0 z-10 border-b border-border/50 glass">
                <div className="flex h-20 items-center justify-between px-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            <span className="gradient-text">Settings</span>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage account and preferences</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
                <Tabs defaultValue="account" className="space-y-8">
                    <TabsList className="bg-background/50 backdrop-blur border border-border/50">
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="preferences">Preferences</TabsTrigger>
                    </TabsList>

                    <TabsContent value="account" className="space-y-6">
                        <Card className="glass-card">
                            <CardHeader>
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-20 w-20 border-2 border-border/50 shadow-lg">
                                        <AvatarImage src="/avatar.png" alt="User" />
                                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-2xl font-light">S</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-xl">Shuu</CardTitle>
                                        <CardDescription>admin@gmail.com</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <Separator />
                            <CardContent className="space-y-6 pt-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Display Name</Label>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-sm font-medium">
                                            Shuu
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email Address</Label>
                                        <div className="p-3 rounded-lg bg-muted/30 border border-border/40 text-sm font-medium">
                                            admin@gmail.com
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/10 border-t border-border/40 p-6 flex justify-end">
                                <Button variant="destructive" size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 shadow-none">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sign Out
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    <TabsContent value="preferences" className="space-y-6">
                        <Card className="glass-card">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                                        <Palette className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle>Appearance</CardTitle>
                                        <CardDescription>Customize the interface theme</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    <div
                                        onClick={() => setTheme("light")}
                                        className={`cursor-pointer rounded-xl border-2 p-4 hover:bg-muted/50 transition-all ${theme === 'light' ? 'border-violet-500 bg-violet-500/5' : 'border-transparent bg-muted/20'}`}
                                    >
                                        <div className="mb-3 rounded-lg bg-background p-2 border border-border shadow-sm w-fit">
                                            <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-violet-500' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div className="font-medium">Light</div>
                                        <div className="text-xs text-muted-foreground mt-1">Clean and bright</div>
                                    </div>

                                    <div
                                        onClick={() => setTheme("dark")}
                                        className={`cursor-pointer rounded-xl border-2 p-4 hover:bg-muted/50 transition-all ${theme === 'dark' ? 'border-violet-500 bg-violet-500/5' : 'border-transparent bg-muted/20'}`}
                                    >
                                        <div className="mb-3 rounded-lg bg-zinc-950 p-2 border border-zinc-800 shadow-sm w-fit">
                                            <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-violet-500' : 'text-zinc-400'}`} />
                                        </div>
                                        <div className="font-medium">Dark</div>
                                        <div className="text-xs text-muted-foreground mt-1">Easy on the eyes</div>
                                    </div>

                                    <div
                                        onClick={() => setTheme("system")}
                                        className={`cursor-pointer rounded-xl border-2 p-4 hover:bg-muted/50 transition-all ${theme === 'system' ? 'border-violet-500 bg-violet-500/5' : 'border-transparent bg-muted/20'}`}
                                    >
                                        <div className="mb-3 rounded-lg bg-gradient-to-br from-background to-zinc-950 p-2 border border-border shadow-sm w-fit">
                                            <Monitor className={`h-6 w-6 ${theme === 'system' ? 'text-violet-500' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div className="font-medium">System</div>
                                        <div className="text-xs text-muted-foreground mt-1">Match device settings</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle>Language</CardTitle>
                                        <CardDescription>Set your preferred language for AI responses</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <div className="font-medium">Response Language</div>
                                            <div className="text-sm text-muted-foreground">Auto-detect based on document</div>
                                        </div>
                                    </div>
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Check className="h-3 w-3" /> Auto
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
