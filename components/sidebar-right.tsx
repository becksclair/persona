"use client";

import { useAppStore } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Upload, Trash2, FileText, HelpCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Mock uploaded documents
const UPLOADED_DOCS = [
  { id: "1", name: "Marketing_Strategy_Q3.pdf" },
  { id: "2", name: "Company_Guidelines.docx" },
];

export function SidebarRight() {
  const {
    personalities,
    activePersonalityId,
    setActivePersonality,
    modelSettings,
    updateModelSettings,
    ragSettings,
    updateRAGSettings,
  } = useAppStore();

  const activePersonality =
    personalities.find((p) => p.id === activePersonalityId) || personalities[0];

  return (
    <div className="flex h-full w-80 flex-col border-l border-sidebar-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border p-4">
        <h2 className="text-base font-semibold">Character & Memory</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Character Profile Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Character Profile</Label>
            <Select value={activePersonalityId} onValueChange={setActivePersonality}>
              <SelectTrigger className="bg-sidebar-accent/50 border-sidebar-border">
                <SelectValue placeholder="Select character" />
              </SelectTrigger>
              <SelectContent>
                {personalities.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{p.name} ({p.tone})</span>
                      {activePersonalityId === p.id && (
                        <Check className="h-4 w-4 ml-2 text-primary" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activePersonality?.description || "A supportive and friendly companion for daily conversations and brainstorming."}
            </p>
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Model Settings Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Model Settings</Label>

            {/* Model Selection as radio-like list */}
            <div className="space-y-1 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-1">
              {[
                { id: "gpt-3.5-turbo", name: "GPT-3.5" },
                { id: "claude-2", name: "Claude 2" },
                { id: "local-llama", name: "Local Llama" },
              ].map((model) => (
                <button
                  key={model.id}
                  onClick={() => updateModelSettings({ model: model.id })}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    modelSettings.model === model.id
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  {model.name}
                </button>
              ))}
            </div>

            {/* Temperature Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Temperature</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-sidebar-accent px-2 py-0.5 rounded">
                    {modelSettings.temperature.toFixed(1)}
                  </span>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
              <Slider
                value={[modelSettings.temperature]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([val]) => updateModelSettings({ temperature: val })}
                className="**:[[role=slider]]:bg-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.0</span>
                <span>Balanced</span>
                <span>1.0</span>
              </div>
            </div>
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Memory (RAG) Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Memory (RAG)</Label>

            {/* Knowledge Base Upload */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Knowledge Base</Label>
              <div className="border-2 border-dashed border-sidebar-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Upload documents (PDF, TXT, DOCX) to enhance context.
                </p>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                {UPLOADED_DOCS.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-sidebar-accent/30 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Long-term Memory Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Long-term Memory</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Enable persistent memory across sessions.
                </p>
              </div>
              <Switch
                checked={ragSettings.enabled}
                onCheckedChange={(checked) => updateRAGSettings({ enabled: checked })}
              />
            </div>

            {/* Context Recall Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Context Recall</Label>
                <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-0.5 rounded">
                  {ragSettings.contextRecall > 0.7 ? "High" : ragSettings.contextRecall > 0.3 ? "Medium" : "Low"}
                </span>
              </div>
              <Slider
                value={[ragSettings.contextRecall]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={([val]) => updateRAGSettings({ contextRecall: val })}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Low</span>
                <span>High</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Determines how much past conversation history is considered.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
