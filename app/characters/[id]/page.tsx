import { CharacterBuilderPage } from "./character-builder-page";

export const metadata = {
  title: "Edit Character | Persona",
  description: "Edit your AI character",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCharacterPage({ params }: PageProps) {
  const { id } = await params;
  return <CharacterBuilderPage characterId={id} />;
}
