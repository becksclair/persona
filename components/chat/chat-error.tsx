"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { ChatError } from "./types";

interface ChatErrorBannerProps {
  error: ChatError;
  onRetry: () => void;
}

export function ChatErrorBanner({ error, onRetry }: ChatErrorBannerProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm"
      role="alert"
    >
      <AlertCircle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium text-destructive">Error</p>
        <p className="text-muted-foreground text-xs">{error.message}</p>
      </div>
      {error.retryable && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="shrink-0"
        >
          <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}
