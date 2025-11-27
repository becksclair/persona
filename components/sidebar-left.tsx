"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
// Mock chat history matching mockup
const CHAT_HISTORY = [
  {
    id: "1",
    title: "Project Brainstorm",
    date: "2m ago",
    active: false,
    avatar: "/avatars/brainstorm.png",
    color: "bg-gradient-to-br from-violet-500 to-fuchsia-500",
  },
  {
    id: "2",
    title: "Sam - Daily Check-in",
    date: "1h ago",
    active: true,
    avatar: "/avatars/sam.png",
    color: "bg-gradient-to-br from-cyan-500 to-blue-500",
  },
  {
    id: "3",
    title: "Python Help",
    date: "Yesterday",
    active: false,
    avatar: "/avatars/python.png",
    color: "bg-gradient-to-br from-emerald-500 to-teal-500",
  },
  {
    id: "4",
    title: "Creative Writing",
    date: "Yesterday",
    active: false,
    avatar: "/avatars/creative.png",
    color: "bg-gradient-to-br from-amber-500 to-orange-500",
  },
];

export function SidebarLeft() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatId, setActiveChatId] = useState("2");

  const filteredChats = CHAT_HISTORY.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo/Branding */}
      <div className="flex items-center gap-2 p-4 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          P
        </div>
        <span className="text-lg font-semibold tracking-tight">Persona</span>
      </div>

      {/* Chats Header */}
      <div className="px-4 py-2">
        <h2 className="text-sm font-semibold text-foreground/80">Chats</h2>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-sidebar-accent/50 border-sidebar-border h-9"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 pb-3">
        <Button className="w-full justify-center gap-2 bg-primary hover:bg-primary/90" size="sm">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 p-2">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChatId(chat.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition-all",
                "hover:bg-sidebar-accent/70",
                activeChatId === chat.id &&
                  "bg-sidebar-accent ring-1 ring-primary/30 shadow-sm",
              )}
            >
              <Avatar className="h-10 w-10 ring-2 ring-background/50">
                <AvatarImage src={chat.avatar} />
                <AvatarFallback className={cn(chat.color, "text-white font-medium")}>
                  {chat.title[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="truncate font-medium">{chat.title}</div>
                <div className="truncate text-xs text-muted-foreground">{chat.date}</div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/30 p-3">
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            <AvatarImage src="/user-avatar.png" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
              U
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">User</div>
            <div className="text-xs text-muted-foreground">Pro Plan</div>
          </div>
        </div>
      </div>
    </div>
  );
}
