"use client";

import { useHasHydrated } from "@/lib/store";
import { useAuth } from "@/components/auth-provider";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { ChatInterface } from "@/components/chat-interface";
import { AppSkeleton } from "@/components/app-skeleton";
import { LoginForm } from "@/components/login-form";

export function AppShell() {
  const hydrated = useHasHydrated();
  const { user, loading } = useAuth();

  // Show skeleton while loading auth or hydrating store
  if (!hydrated || loading) {
    return <AppSkeleton />;
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm />;
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SidebarLeft />
      <ChatInterface />
      <SidebarRight />
    </main>
  );
}
