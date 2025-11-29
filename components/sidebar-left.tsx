"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Plus,
  Search,
  Sun,
  Moon,
  Monitor,
  LogOut,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronRight,
  Loader2,
  Users,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/auth-provider";
import { useConversations, type Conversation } from "@/lib/hooks/use-conversations";
import { useChatStore } from "@/lib/chat-store";

const THEME_OPTIONS = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

// Avatar color mapping based on character name
function getAvatarColor(name: string | null): string {
  const colors = [
    "bg-gradient-to-br from-violet-500 to-fuchsia-500",
    "bg-gradient-to-br from-cyan-500 to-blue-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
    "bg-gradient-to-br from-amber-500 to-orange-500",
    "bg-gradient-to-br from-rose-500 to-pink-500",
    "bg-gradient-to-br from-indigo-500 to-purple-500",
  ];
  if (!name) return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

// Relative time formatting
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface ChatItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

function ChatItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onArchive,
  onUnarchive,
  onDelete,
}: ChatItemProps) {
  const title = conversation.title || conversation.characterName || "New Chat";
  const avatarColor = getAvatarColor(conversation.characterName);

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition-all cursor-pointer",
        "hover:bg-sidebar-accent/70",
        isActive && "bg-sidebar-accent ring-1 ring-primary/30 shadow-sm",
      )}
      onClick={onSelect}
    >
      <Avatar className="h-10 w-10 ring-2 ring-background/50">
        <AvatarImage src={conversation.characterAvatar ?? undefined} />
        <AvatarFallback className={cn(avatarColor, "text-white font-medium")}>
          {title[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="truncate font-medium">{title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {conversation.lastMessage
            ? conversation.lastMessage.slice(0, 40) +
              (conversation.lastMessage.length > 40 ? "..." : "")
            : formatRelativeTime(conversation.updatedAt)}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-all">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          {conversation.isArchived ? (
            <DropdownMenuItem onClick={onUnarchive}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Unarchive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SidebarLeft() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  // Active conversations - always loaded
  const {
    conversations: activeConversations,
    loading,
    updateConversation,
    deleteConversation,
    archiveConversation,
  } = useConversations({ includeArchived: false });

  // Archived conversations - lazy loaded when section is expanded
  const {
    conversations: archivedConversations,
    loading: archivedLoading,
    unarchiveConversation,
  } = useConversations({ includeArchived: true, enabled: showArchived });

  const { activeConversationId, setActiveConversation, startNewChat, isPendingNewChat } =
    useChatStore();
  const pathname = usePathname();
  const isOnCharactersPage = pathname?.startsWith("/characters");
  const isOnKnowledgeBasePage = pathname?.startsWith("/knowledge-base");

  // Filter conversations by search query
  const activeConvs = useMemo(() => {
    return activeConversations.filter(
      (c) =>
        !c.isArchived &&
        ((c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.characterName?.toLowerCase().includes(searchQuery.toLowerCase())) ??
          true),
    );
  }, [activeConversations, searchQuery]);

  const archivedConvs = useMemo(() => {
    return archivedConversations.filter(
      (c) =>
        c.isArchived &&
        ((c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.characterName?.toLowerCase().includes(searchQuery.toLowerCase())) ??
          true),
    );
  }, [archivedConversations, searchQuery]);

  const handleNewChat = () => {
    startNewChat();
  };

  const handleSelectConversation = (conv: Conversation) => {
    setActiveConversation(conv.id, conv.characterId);
  };

  const handleRename = (id: string) => {
    const conv =
      activeConversations.find((c) => c.id === id) ||
      archivedConversations.find((c) => c.id === id);
    setRenameValue(conv?.title ?? "");
    setRenamingId(id);
  };

  const handleRenameSubmit = async (id: string) => {
    if (renameValue.trim()) {
      await updateConversation(id, { title: renameValue.trim() });
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleArchive = async (id: string) => {
    await archiveConversation(id);
    if (activeConversationId === id) {
      setActiveConversation(null);
    }
  };

  const handleUnarchive = async (id: string) => {
    await unarchiveConversation(id);
  };

  const handleDelete = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversation(null);
    }
  };

  return (
    <div className="flex h-full w-72 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar">
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

      {/* Action Buttons */}
      <div className="px-4 pb-3 space-y-2">
        <Button
          onClick={handleNewChat}
          className={cn(
            "w-full justify-center gap-2 bg-primary hover:bg-primary/90",
            isPendingNewChat && "ring-2 ring-primary/50",
          )}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        <Button
          asChild
          variant={isOnCharactersPage ? "secondary" : "outline"}
          className="w-full justify-center gap-2"
          size="sm"
        >
          <Link href="/characters">
            <Users className="h-4 w-4" />
            Characters
          </Link>
        </Button>
        <Button
          asChild
          variant={isOnKnowledgeBasePage ? "secondary" : "outline"}
          className="w-full justify-center gap-2"
          size="sm"
        >
          <Link href="/knowledge-base">
            <Database className="h-4 w-4" />
            Knowledge Base
          </Link>
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 min-h-0 px-2">
        <div className="space-y-1 p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : activeConvs.length === 0 && !isPendingNewChat ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No chats yet. Start a new conversation!
            </div>
          ) : (
            <>
              {/* New Chat placeholder */}
              {isPendingNewChat && (
                <div className="flex items-center gap-3 rounded-xl p-3 bg-sidebar-accent ring-1 ring-primary/30 shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-primary">New Chat</div>
                    <div className="text-xs text-muted-foreground">Start typing to begin...</div>
                  </div>
                </div>
              )}

              {/* Active conversations */}
              {activeConvs.map((conv) =>
                renamingId === conv.id ? (
                  <div key={conv.id} className="flex items-center gap-2 p-2">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => void handleRenameSubmit(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRenameSubmit(conv.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                ) : (
                  <ChatItem
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversationId === conv.id}
                    onSelect={() => handleSelectConversation(conv)}
                    onRename={() => handleRename(conv.id)}
                    onArchive={() => void handleArchive(conv.id)}
                    onUnarchive={() => void handleUnarchive(conv.id)}
                    onDelete={() => void handleDelete(conv.id)}
                  />
                ),
              )}

              {/* Archived section - always show trigger, lazy-load content */}
              <Collapsible open={showArchived} onOpenChange={setShowArchived}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronRight
                    className={cn("h-3 w-3 transition-transform", showArchived && "rotate-90")}
                  />
                  Archived {archivedConvs.length > 0 && `(${archivedConvs.length})`}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {archivedLoading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : archivedConvs.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      No archived chats
                    </div>
                  ) : (
                    archivedConvs.map((conv) => (
                      <ChatItem
                        key={conv.id}
                        conversation={conv}
                        isActive={activeConversationId === conv.id}
                        onSelect={() => handleSelectConversation(conv)}
                        onRename={() => handleRename(conv.id)}
                        onArchive={() => void handleArchive(conv.id)}
                        onUnarchive={() => void handleUnarchive(conv.id)}
                        onDelete={() => void handleDelete(conv.id)}
                      />
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-3">
        {/* Theme Toggle */}
        <div className="flex items-center rounded-lg bg-sidebar-accent/50 p-0.5">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "flex-1 flex items-center justify-center rounded-md p-2 transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={opt.label}
                aria-label={`Switch to ${opt.label} theme`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 rounded-xl bg-background p-3">
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            <AvatarImage src="/user-avatar.png" />
            <AvatarFallback className="bg-linear-to-br from-primary to-primary/60 text-primary-foreground">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.email ?? "User"}</div>
            <div className="text-xs text-muted-foreground">Local Dev</div>
          </div>
          <button
            onClick={() => void logout()}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
