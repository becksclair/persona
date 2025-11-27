"use client";

import { useHasHydrated } from "@/lib/store";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { ChatInterface } from "@/components/chat-interface";
import { AppSkeleton } from "@/components/app-skeleton";

export function AppShell() {
  const hydrated = useHasHydrated();

  if (!hydrated) {
    return <AppSkeleton />;
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SidebarLeft />
      <ChatInterface />
      <SidebarRight />
    </main>
  );
}
