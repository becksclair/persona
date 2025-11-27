import "@testing-library/dom";
import { beforeEach } from "vitest";

// Reset Zustand store state between tests
beforeEach(() => {
  // Clear localStorage to ensure clean state
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
});
