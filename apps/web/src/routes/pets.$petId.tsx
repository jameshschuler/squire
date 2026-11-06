import { createFileRoute } from "@tanstack/react-router";
import { PetDetail } from "@/components/pets/PetDetail";
import { GameDataStatus } from "@/components/shared/GameDataStatus";
import { useGameDataContext } from "@/contexts/game-data-context";

export const Route = createFileRoute("/pets/$petId")({
  component: PetPage,
});

function PetPage() {
  const { petId } = Route.useParams();
  const state = useGameDataContext();

  if (state.status !== "ready") {
    return <GameDataStatus state={state} />;
  }

  const pet = state.book.pets.find((option) => option.id === petId);

  if (!pet) {
    return <p className="py-8 text-center text-muted-foreground">Pet not found.</p>;
  }

  return <PetDetail pet={pet} />;
}
