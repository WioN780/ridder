import React from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkspaceHeaderProps {
  onOpenSettings: () => void;
}

export function WorkspaceHeader({ onOpenSettings }: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold tracking-wider text-foreground select-none">
            RIDDER
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium font-mono text-muted-foreground">
            v0.1.1-alpha
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
