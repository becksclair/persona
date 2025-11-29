"use client";

import {
  useMemoryInspectorStore,
  type MessageMemoryRecord,
  type MemorySnippet,
} from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  MessageSquare,
  ThumbsDown,
  ArrowDown,
  RotateCcw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MemoryInspectorPanel() {
  const { isOpen, records, isLoading, toggleOpen, setOpen, loadSnippets, submitFeedback } =
    useMemoryInspectorStore();

  const recordsWithMemory = records.filter((r) => r.role === "assistant");
  const recordsWithContext = recordsWithMemory.filter((r) => r.memoryItemIds.length > 0);

  if (!isOpen) {
    return (
      <div className="border-t border-border/40 bg-background/80 backdrop-blur-sm px-4 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleOpen}
          className="gap-2 h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="h-3 w-3" />
          Memory Inspector
          {recordsWithContext.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1">
              {recordsWithContext.length}
            </Badge>
          )}
          <ChevronUp className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-border/40 bg-background/95 backdrop-blur-sm flex flex-col max-h-[40vh] min-h-[200px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Memory Inspector</span>
          <Badge variant="outline" className="text-[10px] h-5">
            {recordsWithMemory.length} responses
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleOpen}>
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {recordsWithMemory.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No assistant messages in current session.
            </div>
          ) : (
            recordsWithMemory
              .slice()
              .reverse()
              .map((record) => (
                <MessageMemoryCard
                  key={record.messageId}
                  record={record}
                  onExpand={() => loadSnippets(record.messageId)}
                  onFeedback={submitFeedback}
                  isLoading={isLoading}
                />
              ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface MessageMemoryCardProps {
  record: MessageMemoryRecord;
  onExpand: () => void;
  onFeedback: (id: string, action: "exclude" | "lower_priority" | "restore") => void;
  isLoading: boolean;
}

function MessageMemoryCard({ record, onExpand, onFeedback, isLoading }: MessageMemoryCardProps) {
  const hasMemory = record.memoryItemIds.length > 0;

  return (
    <Collapsible onOpenChange={(open) => open && onExpand()}>
      <div className="rounded-lg border border-border/50 bg-card/50">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-2.5 text-left hover:bg-muted/30 transition-colors rounded-lg">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs truncate text-muted-foreground">
                {record.contentPreview || "Assistant response"}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {hasMemory ? (
                <Badge className="text-[9px] h-4 bg-primary/15 text-primary border-0">
                  {record.memoryItemIds.length} snippets
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] h-4 text-muted-foreground">
                  No context
                </Badge>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/30 p-2.5 space-y-2">
            {isLoading && record.snippets.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : record.snippets.length === 0 && !hasMemory ? (
              <p className="text-[11px] text-muted-foreground py-2">
                This response was generated without RAG context.
              </p>
            ) : (
              record.snippets.map((snippet) => (
                <SnippetCard key={snippet.id} snippet={snippet} onFeedback={onFeedback} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface SnippetCardProps {
  snippet: MemorySnippet;
  onFeedback: (id: string, action: "exclude" | "lower_priority" | "restore") => void;
}

function SnippetCard({ snippet, onFeedback }: SnippetCardProps) {
  const statusStyles = {
    active: "border-border/50",
    excluded: "opacity-60 border-red-500/40 bg-red-500/5",
    low_priority: "opacity-80 border-amber-500/40 bg-amber-500/5",
  };

  const visibleTags = snippet.tags?.filter((t) => !t.startsWith("__")) ?? [];

  return (
    <div
      className={cn(
        "rounded-md border p-2.5 space-y-2 bg-background/50",
        statusStyles[snippet.status],
      )}
    >
      {/* Source info row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate">{snippet.sourceFileName ?? snippet.sourceType}</span>
        </div>

        {snippet.status !== "active" && (
          <Badge
            variant={snippet.status === "excluded" ? "destructive" : "secondary"}
            className="text-[9px] h-4 shrink-0"
          >
            {snippet.status === "excluded" ? "Excluded" : "Low Priority"}
          </Badge>
        )}
      </div>

      {/* Content preview */}
      <p className="text-[11px] leading-relaxed line-clamp-3 text-foreground/80">
        {snippet.content}
      </p>

      {/* Tags */}
      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1.5">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Feedback actions */}
      <div className="flex items-center gap-1 pt-0.5">
        {snippet.status === "active" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-red-500 hover:text-red-500 hover:bg-red-500/10"
              onClick={() => onFeedback(snippet.id, "exclude")}
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              Exclude
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
              onClick={() => onFeedback(snippet.id, "lower_priority")}
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              Lower Priority
            </Button>
          </>
        )}
        {snippet.status !== "active" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => onFeedback(snippet.id, "restore")}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}
