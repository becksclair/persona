"use client";

import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBlur: () => void;
  disabled: boolean;
  placeholder: string;
  enterSendsMessage: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onBlur,
  disabled,
  placeholder,
  enterSendsMessage,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Escape to blur
      if (e.key === "Escape") {
        inputRef.current?.blur();
        onBlur();
        return;
      }

      // Enter handling
      if (e.key === "Enter") {
        const hasModifier = e.ctrlKey || e.metaKey;

        if (enterSendsMessage) {
          // Enter sends, Shift+Enter for newline
          if (!e.shiftKey && !hasModifier) {
            e.preventDefault();
            onSubmit();
          }
        } else {
          // Ctrl/Cmd+Enter sends
          if (hasModifier) {
            e.preventDefault();
            onSubmit();
          }
        }
      }
    },
    [enterSendsMessage, onSubmit, onBlur]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="p-4 border-t bg-background/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto relative">
        <form
          onSubmit={handleFormSubmit}
          className="relative flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
        >
          <Button
            size="icon"
            variant="ghost"
            type="button"
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            aria-label="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-[200px] resize-none py-2.5"
            rows={1}
            aria-label="Message input"
          />

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              type="button"
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              aria-label="Voice input"
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              type="submit"
              disabled={disabled || !value.trim()}
              className={cn(
                "h-10 w-10 transition-all",
                value.trim()
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">
              {enterSendsMessage ? "Enter" : "Ctrl+Enter"}
            </kbd>{" "}
            to send
          </span>
          <span>AI can make mistakes. Please verify important information.</span>
        </div>
      </div>
    </div>
  );
}
