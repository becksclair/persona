"use client";

import { useState, useCallback } from "react";

export interface UseTagManagerOptions {
  initialTags?: string[];
  onChange?: (tags: string[]) => void;
}

export function useTagManager(options: UseTagManagerOptions = {}) {
  const { initialTags = [], onChange } = options;
  const [tags, setTagsInternal] = useState<string[]>(initialTags);
  const [customTagInput, setCustomTagInput] = useState("");

  const setTags = useCallback(
    (newTags: string[]) => {
      setTagsInternal(newTags);
      onChange?.(newTags);
    },
    [onChange],
  );

  const reset = useCallback((newTags: string[] = []) => {
    setTagsInternal(newTags);
    setCustomTagInput("");
  }, []);

  const addTag = useCallback(
    (tag: string) => {
      const normalized = tag.trim().toLowerCase();
      if (normalized && !tags.includes(normalized)) {
        const newTags = [...tags, normalized];
        setTags(newTags);
        return true;
      }
      return false;
    },
    [tags, setTags],
  );

  const removeTag = useCallback(
    (tag: string) => {
      const newTags = tags.filter((t) => t !== tag);
      setTags(newTags);
    },
    [tags, setTags],
  );

  const addCustomTag = useCallback(() => {
    if (addTag(customTagInput)) {
      setCustomTagInput("");
      return true;
    }
    return false;
  }, [customTagInput, addTag]);

  const hasTag = useCallback((tag: string) => tags.includes(tag.toLowerCase()), [tags]);

  return {
    tags,
    setTags,
    reset,
    addTag,
    removeTag,
    hasTag,
    customTagInput,
    setCustomTagInput,
    addCustomTag,
  };
}
