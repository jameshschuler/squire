import { createFileRoute } from "@tanstack/react-router";
import { CharacterPage } from "@/components/character/CharacterPage";

export const Route = createFileRoute("/character")({
  component: CharacterPage,
});
