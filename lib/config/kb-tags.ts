import { Briefcase, User, Code, FileText, type LucideIcon } from "lucide-react";

export interface KBTagPreset {
  id: string;
  label: string;
  color: string;
  icon: LucideIcon;
}

export const KB_TAG_PRESETS: KBTagPreset[] = [
  { id: "work", label: "Work", color: "bg-blue-500/20 text-blue-400", icon: Briefcase },
  { id: "personal", label: "Personal", color: "bg-emerald-500/20 text-emerald-400", icon: User },
  { id: "code", label: "Code", color: "bg-purple-500/20 text-purple-400", icon: Code },
  { id: "docs", label: "Docs", color: "bg-amber-500/20 text-amber-400", icon: FileText },
];

export function getTagColor(tag: string): string {
  const preset = KB_TAG_PRESETS.find((p) => p.id === tag.toLowerCase());
  return preset?.color ?? "bg-accent text-accent-foreground";
}
