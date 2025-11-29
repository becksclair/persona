"use client";

import { useRef, useEffect, useMemo } from "react";
import type { UIMessage } from "@ai-sdk/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character } from "./types";
import { getMessageText } from "./types";

interface ChatMessagesProps {
  messages: UIMessage[];
  character: Character | undefined;
  isLoading: boolean;
  copiedMessageId: string | null;
  onCopyMessage: (id: string, text: string) => void;
}

export function ChatMessages({
  messages,
  character,
  isLoading,
  copiedMessageId,
  onCopyMessage,
}: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Memoize message text extraction to avoid redundant computation
  const messagesWithText = useMemo(
    () =>
      messages.map((m) => ({
        ...m,
        textContent: getMessageText(m),
      })),
    [messages],
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-6 max-w-3xl mx-auto pb-4">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground opacity-50">
            <Avatar className="h-20 w-20 mb-4 grayscale">
              <AvatarImage src={character?.avatar ?? undefined} />
              <AvatarFallback>{character?.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <p>Start a conversation with {character?.name ?? "the assistant"}</p>
          </div>
        )}

        {/* Messages */}
        {messagesWithText.map((m) => {
          const isCopied = copiedMessageId === m.id;

          return (
            <div
              key={m.id}
              data-testid={m.role === "user" ? "user-message" : "assistant-message"}
              className={cn(
                "flex w-full gap-3 group",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role !== "user" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={character?.avatar ?? undefined} />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}

              <div className="relative max-w-[80%]">
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm shadow-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted/50 border rounded-bl-none",
                  )}
                >
                  {m.textContent || (
                    <span className="text-muted-foreground italic">Loading...</span>
                  )}
                </div>

                {/* Copy button - visible on hover */}
                {m.textContent && (
                  <button
                    onClick={() => onCopyMessage(m.id, m.textContent)}
                    className={cn(
                      "absolute -bottom-2 right-2 p-1.5 rounded-md bg-background border shadow-sm",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      "hover:bg-muted focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring",
                    )}
                    aria-label={isCopied ? "Copied" : "Copy message"}
                  >
                    {isCopied ? (
                      <Check className="h-3 w-3 text-green-500" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>

              {m.role === "user" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src="/user-avatar.png" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex w-full gap-3 justify-start" aria-label="Assistant is typing">
            <Avatar className="h-8 w-8 mt-1">
              <AvatarImage src={character?.avatar ?? undefined} />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <div className="bg-muted/50 border rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  );
}
