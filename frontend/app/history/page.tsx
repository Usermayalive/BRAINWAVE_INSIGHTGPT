import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, FileText, MessageSquare } from "lucide-react";

export default function HistoryPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
                <div className="flex h-16 items-center px-6">
                    <div>
                        <h1 className="text-2xl font-bold">History</h1>
                        <p className="text-sm text-muted-foreground">Your activity and past sessions</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-6">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
                        <Clock className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h2 className="text-xl font-semibold">No history yet</h2>
                    <p className="text-muted-foreground mt-2 max-w-md">
                        Your document uploads, chat sessions, and analysis history will appear here.
                    </p>
                </div>
            </div>
        </div>
    );
}
