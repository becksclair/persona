import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { ChatInterface } from "@/components/chat-interface";

export default function Home() {
  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SidebarLeft />
      <ChatInterface />
      <SidebarRight />
    </main>
  );
}
