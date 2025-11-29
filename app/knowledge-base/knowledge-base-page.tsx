"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ArrowLeft,
  Filter,
  Upload,
  Database,
  Pause,
  X,
  HardDrive,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCharacters } from "@/lib/hooks/use-characters";
import {
  useKnowledgeBase,
  type KnowledgeBaseFile,
} from "@/lib/hooks/use-knowledge-base";
import { useToast } from "@/lib/hooks/use-toast";
import { getTagColor } from "@/lib/config/kb-tags";
import {
  FileCard,
  TagEditorDialog,
  UploadDialog,
  DeleteConfirmDialog,
} from "@/components/knowledge-base";

const STORAGE_KEY = "persona-kb-last-character";

// Status filter tabs
const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "ready", label: "Ready" },
  { id: "indexing", label: "Processing" },
  { id: "paused", label: "Paused" },
  { id: "failed", label: "Failed" },
] as const;

// Track loading state per file
interface FileLoadingState {
  [fileId: string]: string | undefined; // action name or undefined
}

export function KnowledgeBasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Character selection
  const { characters, loading: loadingCharacters } = useCharacters();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // Initialize from URL or localStorage
  useEffect(() => {
    const urlCharacterId = searchParams.get("character");
    const urlStatus = searchParams.get("status");
    const urlTags = searchParams.get("tags");
    const urlSearch = searchParams.get("q");

    // Restore filters from URL
    if (urlStatus && STATUS_FILTERS.some((f) => f.id === urlStatus)) {
      setStatusFilter(urlStatus);
    }
    if (urlTags) {
      setActiveTagFilters(urlTags.split(",").filter(Boolean));
    }
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }

    // Restore character
    if (urlCharacterId && characters.some((c) => c.id === urlCharacterId)) {
      setSelectedCharacterId(urlCharacterId);
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && characters.some((c) => c.id === stored)) {
        setSelectedCharacterId(stored);
      } else if (characters.length > 0) {
        setSelectedCharacterId(characters[0].id);
      }
    }
  }, [characters, searchParams]);

  // Update URL when filters change
  const updateUrl = useCallback(
    (params: { character?: string; status?: string; tags?: string[]; q?: string }) => {
      const url = new URL(window.location.href);
      if (params.character !== undefined) {
        url.searchParams.set("character", params.character);
      }
      if (params.status !== undefined) {
        if (params.status === "all") {
          url.searchParams.delete("status");
        } else {
          url.searchParams.set("status", params.status);
        }
      }
      if (params.tags !== undefined) {
        if (params.tags.length === 0) {
          url.searchParams.delete("tags");
        } else {
          url.searchParams.set("tags", params.tags.join(","));
        }
      }
      if (params.q !== undefined) {
        if (params.q === "") {
          url.searchParams.delete("q");
        } else {
          url.searchParams.set("q", params.q);
        }
      }
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );

  const handleCharacterChange = (id: string) => {
    setSelectedCharacterId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage might be full or disabled
    }
    updateUrl({ character: id });
  };

  // KB data
  const {
    files,
    setFiles,
    stats,
    loading: loadingFiles,
    uploading,
    uploadFile,
    updateFile,
    updateTags,
    deleteFile,
  } = useKnowledgeBase(selectedCharacterId);

  // Per-file loading states
  const [fileLoadingStates, setFileLoadingStates] = useState<FileLoadingState>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);

  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<KnowledgeBaseFile | null>(null);
  const [savingTags, setSavingTags] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);

  // Get unique tags from files
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    files.forEach((f) => f.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [files]);

  // Filter files - enhanced to search by tags and file type
  const filteredFiles = useMemo(() => {
    let result = files;

    // Search filter (filename, tags, file type)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.fileName.toLowerCase().includes(q) ||
          f.tags?.some((t) => t.toLowerCase().includes(q)) ||
          f.fileType?.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "indexing") {
        result = result.filter((f) => f.status === "indexing" || f.status === "pending");
      } else {
        result = result.filter((f) => f.status === statusFilter);
      }
    }

    // Tag filter (AND logic)
    if (activeTagFilters.length > 0) {
      result = result.filter((f) => {
        const fileTags = f.tags ?? [];
        return activeTagFilters.every((t) => fileTags.includes(t));
      });
    }

    return result;
  }, [files, searchQuery, statusFilter, activeTagFilters]);

  // Selected character
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  // Helper to set loading state for a file
  const setFileLoading = (fileId: string, action: string | undefined) => {
    setFileLoadingStates((prev) => ({ ...prev, [fileId]: action }));
  };

  // Handlers with detailed error messages and loading states
  const handleUpload = async (file: File, tags: string[]) => {
    try {
      await uploadFile(file, tags);
      toast({
        title: "File uploaded",
        description: `${file.name} is being indexed.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
      throw err; // Re-throw to keep dialog open
    }
  };

  const handlePause = async (fileId: string) => {
    setFileLoading(fileId, "Pausing");
    // Optimistic update
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "paused" as const } : f)));
    try {
      await updateFile(fileId, "pause");
      toast({ title: "File paused", description: "Excluded from RAG retrieval.", variant: "success" });
    } catch (err) {
      toast({
        title: "Failed to pause file",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setFileLoading(fileId, undefined);
    }
  };

  const handleResume = async (fileId: string) => {
    setFileLoading(fileId, "Resuming");
    // Optimistic update
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "ready" as const } : f)));
    try {
      await updateFile(fileId, "resume");
      toast({ title: "File resumed", description: "Included in RAG retrieval.", variant: "success" });
    } catch (err) {
      toast({
        title: "Failed to resume file",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setFileLoading(fileId, undefined);
    }
  };

  const handleReindex = async (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    setFileLoading(fileId, "Re-indexing");
    // Optimistic update
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "indexing" as const } : f)));
    try {
      await updateFile(fileId, "reindex");
      toast({
        title: "Re-indexing started",
        description: `${file?.fileName ?? "File"} is being re-indexed.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Re-index failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setFileLoading(fileId, undefined);
    }
  };

  const handleDeleteClick = (file: KnowledgeBaseFile) => {
    setEditingFile(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!editingFile) return;
    setDeletingFile(true);
    try {
      await deleteFile(editingFile.id, true);
      toast({
        title: "File deleted",
        description: `${editingFile.fileName} has been permanently deleted.`,
        variant: "success",
      });
      setDeleteDialogOpen(false);
      setEditingFile(null);
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setDeletingFile(false);
    }
  };

  const handleEditTags = (file: KnowledgeBaseFile) => {
    setEditingFile(file);
    setTagEditorOpen(true);
  };

  const handleSaveTags = async (tags: string[]) => {
    if (!editingFile) return;
    setSavingTags(true);
    try {
      await updateTags(editingFile.id, tags);
      toast({ title: "Tags updated", variant: "success" });
      setTagEditorOpen(false);
      setEditingFile(null);
    } catch (err) {
      toast({
        title: "Failed to update tags",
        description: err instanceof Error ? err.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSavingTags(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    updateUrl({ q: value });
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    updateUrl({ status: value });
  };

  const toggleTagFilter = (tag: string) => {
    const newFilters = activeTagFilters.includes(tag)
      ? activeTagFilters.filter((t) => t !== tag)
      : [...activeTagFilters, tag];
    setActiveTagFilters(newFilters);
    updateUrl({ tags: newFilters });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setActiveTagFilters([]);
    updateUrl({ q: "", status: "all", tags: [] });
  };

  const loading = loadingCharacters || loadingFiles;
  const hasActiveFilters = searchQuery || statusFilter !== "all" || activeTagFilters.length > 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">
              {stats
                ? `${stats.totalFiles} file${stats.totalFiles !== 1 ? "s" : ""}, ${stats.totalChunks} chunks`
                : "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Character selector */}
          <Select value={selectedCharacterId ?? ""} onValueChange={handleCharacterChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select character" />
            </SelectTrigger>
            <SelectContent>
              {characters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setUploadDialogOpen(true)} disabled={!selectedCharacterId}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Ready:</span>
            <span className="font-medium text-emerald-400">{stats.readyFiles}</span>
          </div>
          {stats.indexingFiles > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
              <span className="text-muted-foreground">Processing:</span>
              <span className="font-medium text-blue-400">{stats.indexingFiles}</span>
            </div>
          )}
          {stats.pausedFiles > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Pause className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-muted-foreground">Paused:</span>
              <span className="font-medium text-amber-400">{stats.pausedFiles}</span>
            </div>
          )}
          {stats.failedFiles > 0 && (
            <div className="flex items-center gap-1.5 text-xs">
              <X className="h-3.5 w-3.5 text-red-400" />
              <span className="text-muted-foreground">Failed:</span>
              <span className="font-medium text-red-400">{stats.failedFiles}</span>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b border-border">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files, tags, types..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          {/* Status tabs */}
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleStatusFilterChange(filter.id)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                  statusFilter === filter.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-1 flex-wrap">
              {allTags.map((tag) => {
                const isActive = activeTagFilters.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                      isActive ? getTagColor(tag) : "bg-accent/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* File Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {!selectedCharacterId ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">Select a Character</h3>
              <p className="text-sm text-muted-foreground">
                Choose a character to view and manage their knowledge base.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No files found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? "No files match your current filters"
                  : `${selectedCharacter?.name ?? "This character"} has no knowledge base files yet`}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  isLoading={!!fileLoadingStates[file.id]}
                  loadingAction={fileLoadingStates[file.id]}
                  onPause={() => void handlePause(file.id)}
                  onResume={() => void handleResume(file.id)}
                  onReindex={() => void handleReindex(file.id)}
                  onDelete={() => handleDeleteClick(file)}
                  onEditTags={() => handleEditTags(file)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        uploading={uploading}
        onUpload={handleUpload}
      />
      <TagEditorDialog
        open={tagEditorOpen}
        onOpenChange={setTagEditorOpen}
        file={editingFile}
        saving={savingTags}
        onSave={handleSaveTags}
      />
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        file={editingFile}
        deleting={deletingFile}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
