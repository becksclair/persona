"use client";

import { useAppStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip, Send, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

export function ChatInterface() {
  const { activePersonalityId, personalities, modelSettings } = useAppStore();
  const activePersonality = personalities.find((p) => p.id === activePersonalityId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        personalityId: activePersonalityId,
        modelSettings,
      },
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    void sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-background relative">
      {/* Header */}
      <div className="flex items-center gap-3 border-b p-4 shadow-sm bg-background/80 backdrop-blur-md z-10">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarImage src={activePersonality?.avatar} />
          <AvatarFallback>{activePersonality?.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold flex items-center gap-2">
            {activePersonality?.name}
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          <div className="text-xs text-muted-foreground">{activePersonality?.description}</div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6 max-w-3xl mx-auto pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center text-muted-foreground opacity-50">
              <Avatar className="h-20 w-20 mb-4 grayscale">
                <AvatarImage src={activePersonality?.avatar} />
                <AvatarFallback>{activePersonality?.name[0]}</AvatarFallback>
              </Avatar>
              <p>Start a conversation with {activePersonality?.name}</p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex w-full gap-3",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role !== "user" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={activePersonality?.avatar} />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  "relative max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted/50 border rounded-bl-none",
                )}
              >
                {m.parts.map((part, i) =>
                  part.type === "text" ? <span key={i}>{part.text}</span> : null,
                )}
              </div>

              {m.role === "user" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src="/user-avatar.png" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex w-full gap-3 justify-start">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src={activePersonality?.avatar} />
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

      {/* Input Area */}
      <div className="p-4 border-t bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto relative">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
          >
            <Button
              size="icon"
              variant="ghost"
              type="button"
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-5 w-5" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${activePersonality?.name}...`}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px]"
            />

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                type="button"
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                type="submit"
                disabled={isLoading || !input.trim()}
                className={cn(
                  "h-10 w-10 transition-all",
                  input.trim()
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <div className="text-center mt-2 text-[10px] text-muted-foreground">
            AI can make mistakes. Please verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
