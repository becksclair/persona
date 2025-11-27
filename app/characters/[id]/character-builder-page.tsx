"use client";

import { CharacterBuilder } from "@/components/character-builder";

interface CharacterBuilderPageProps {
  characterId: string;
}

export function CharacterBuilderPage({ characterId }: CharacterBuilderPageProps) {
  return <CharacterBuilder characterId={characterId} />;
}
