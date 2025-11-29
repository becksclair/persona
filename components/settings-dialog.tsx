"use client";

import { useState } from "react";
import { useSettings } from "@/lib/hooks/use-settings";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Keyboard, Palette, Database, Loader2, Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, loading, saving, updateSettings } = useSettings();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<"keyboard" | "theme" | "rag">("keyboard");

  const handleEnterBehaviorChange = async (checked: boolean) => {
    await updateSettings({ enterSendsMessage: checked });
  };

  const handleThemeChange = async (value: string) => {
    setTheme(value);
    await updateSettings({ theme: value as "light" | "dark" | "system" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:max-w-[420px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </SheetTitle>
          <SheetDescription>
            Configure keyboard shortcuts, theme, and other preferences.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Section Tabs */}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
              <button
                onClick={() => setActiveSection("keyboard")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                  activeSection === "keyboard"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Keyboard className="h-4 w-4" />
                Keyboard
              </button>
              <button
                onClick={() => setActiveSection("theme")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                  activeSection === "theme"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Palette className="h-4 w-4" />
                Theme
              </button>
              <button
                onClick={() => setActiveSection("rag")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                  activeSection === "rag"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Database className="h-4 w-4" />
                Memory
              </button>
            </div>

            {/* Keyboard Section */}
            {activeSection === "keyboard" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Enter sends message</Label>
                      <p className="text-xs text-muted-foreground">
                        When enabled, pressing Enter sends the message. Otherwise, use Ctrl+Enter.
                      </p>
                    </div>
                    <Switch
                      checked={settings.enterSendsMessage}
                      onCheckedChange={handleEnterBehaviorChange}
                      disabled={saving}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Keyboard Shortcuts</Label>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Send message</span>
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">
                        {settings.enterSendsMessage ? "Enter" : "Ctrl+Enter"}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">New line</span>
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">
                        {settings.enterSendsMessage ? "Shift+Enter" : "Enter"}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Copy last AI message</span>
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">
                        Ctrl+Shift+C
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                      <span className="text-muted-foreground">Blur input</span>
                      <kbd className="px-2 py-1 bg-background border rounded text-xs font-mono">
                        Esc
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Theme Section */}
            {activeSection === "theme" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Appearance</Label>
                  <Select value={theme ?? "system"} onValueChange={handleThemeChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          System
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose your preferred color scheme. System will follow your OS preference.
                  </p>
                </div>

                {/* Theme preview */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleThemeChange("light")}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-colors",
                      theme === "light"
                        ? "border-primary"
                        : "border-muted hover:border-muted-foreground/30",
                    )}
                  >
                    <div className="w-full aspect-video bg-white rounded border mb-2" />
                    <span className="text-xs">Light</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange("dark")}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-colors",
                      theme === "dark"
                        ? "border-primary"
                        : "border-muted hover:border-muted-foreground/30",
                    )}
                  >
                    <div className="w-full aspect-video bg-zinc-900 rounded border mb-2" />
                    <span className="text-xs">Dark</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange("system")}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-colors",
                      theme === "system"
                        ? "border-primary"
                        : "border-muted hover:border-muted-foreground/30",
                    )}
                  >
                    <div className="w-full aspect-video bg-linear-to-r from-white to-zinc-900 rounded border mb-2" />
                    <span className="text-xs">System</span>
                  </button>
                </div>
              </div>
            )}

            {/* Memory/RAG Section */}
            {activeSection === "rag" && (
              <div className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="text-sm font-medium">Memory Settings</h4>
                      <p className="text-xs text-muted-foreground">
                        Configure per-character memory and RAG settings in the right sidebar.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onOpenChange(false)}
                  >
                    Go to Character & Memory Panel →
                  </Button>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground space-y-2">
                  <p>
                    <strong>Long-term Memory:</strong> Enable persistent memory across sessions
                    using RAG.
                  </p>
                  <p>
                    <strong>Knowledge Base:</strong> Upload documents to enhance character
                    knowledge.
                  </p>
                  <p>
                    <strong>Context Recall:</strong> Adjust how much past conversation is
                    considered.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saving indicator */}
        {saving && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
