"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileJson, FileText, Settings, Loader2 } from "lucide-react";
import type { Character } from "./types";

interface ChatHeaderProps {
  character: Character | undefined;
  isLoading: boolean;
  canExport: boolean;
  onExportJSON: () => void;
  onExportMarkdown: () => void;
  onOpenSettings: () => void;
}

export function ChatHeader({
  character,
  isLoading,
  canExport,
  onExportJSON,
  onExportMarkdown,
  onOpenSettings,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b p-4 shadow-sm bg-background/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarImage src={character?.avatar ?? undefined} />
          <AvatarFallback>{character?.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold flex items-center gap-2">
            {character?.name ?? "Assistant"}
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="Loading" />
            ) : (
              <span
                className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"
                aria-label="Online"
              />
            )}
          </div>
          <div className="text-xs text-muted-foreground">{character?.description}</div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Export Menu */}
        {canExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Export chat"
              >
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onExportMarkdown}>
                <FileText className="h-4 w-4 mr-2" />
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportJSON}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Open settings"
          onClick={onOpenSettings}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
