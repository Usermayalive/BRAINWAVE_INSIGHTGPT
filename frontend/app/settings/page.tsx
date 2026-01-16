import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, Globe, Bell, Palette } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
                <div className="flex h-16 items-center px-6">
                    <div>
                        <h1 className="text-2xl font-bold">Settings</h1>
                        <p className="text-sm text-muted-foreground">Manage your preferences</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-6 space-y-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-violet-500" />
                            <CardTitle>API Configuration</CardTitle>
                        </div>
                        <CardDescription>Configure your API keys and endpoints</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="api-url">Backend API URL</Label>
                            <Input id="api-url" placeholder="http://localhost:8000" defaultValue="http://localhost:8000" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="api-key">API Key (Optional)</Label>
                            <Input id="api-key" type="password" placeholder="Enter your API key" />
                        </div>
                        <Button className="bg-gradient-to-r from-violet-500 to-purple-600">
                            Save Changes
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-violet-500" />
                            <CardTitle>Appearance</CardTitle>
                        </div>
                        <CardDescription>Customize the look and feel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Theme</p>
                                <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                            </div>
                            <Badge variant="secondary">Dark Mode</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-violet-500" />
                            <CardTitle>Language</CardTitle>
                        </div>
                        <CardDescription>Set your preferred language for responses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Response Language</p>
                                <p className="text-sm text-muted-foreground">AI responses will be in this language</p>
                            </div>
                            <Badge variant="secondary">English</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
