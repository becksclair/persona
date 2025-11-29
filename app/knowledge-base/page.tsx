import { Suspense } from "react";
import { KnowledgeBasePage } from "./knowledge-base-page";

export const metadata = {
  title: "Knowledge Base | Persona",
  description: "Manage your character knowledge bases",
};

function LoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <KnowledgeBasePage />
    </Suspense>
  );
}
