"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

interface FieldWithAIProps {
  label: string;
  description?: string;
  register: UseFormRegisterReturn;
  onEnhance?: () => void;
  enhancing?: boolean;
  hasValue?: boolean;
  multiline?: boolean;
  placeholder?: string;
  rows?: number;
  error?: string;
}

export function FieldWithAI({
  label,
  description,
  register,
  onEnhance,
  enhancing,
  hasValue,
  multiline = false,
  placeholder,
  rows = 4,
  error,
}: FieldWithAIProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {onEnhance && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onEnhance}
            disabled={enhancing}
            className="gap-1.5 text-xs h-7"
          >
            {enhancing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {hasValue ? "Enhance" : "Fill with AI"}
          </Button>
        )}
      </div>
      {multiline ? (
        <Textarea {...register} placeholder={placeholder} rows={rows} className="resize-none" />
      ) : (
        <Input {...register} placeholder={placeholder} />
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
