import { Link } from "@tanstack/react-router";
import { SendHorizontal } from "lucide-react";
import { ComingSoonBanner } from "@/components/shared/ComingSoonBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCharacterContext } from "@/contexts/character-context";

export function GearPage() {
  const { character } = useCharacterContext();
  return (
    <section className="space-y-3 pt-3">
      <ComingSoonBanner title="Gear optimizer coming soon.">
        Ask for the best gear for any activity or recipe, picked from what you own.
        {!character && (
          <>
            {" "}
            <Link to="/character" className="font-medium text-foreground underline underline-offset-4">
              Add your character
            </Link>{" "}
            to get ready.
          </>
        )}
      </ComingSoonBanner>
      <div className="flex gap-2">
        <Input aria-label="Ask about gear" placeholder="Best gear for frying a perch?" disabled />
        <Button size="icon" aria-label="Send" disabled>
          <SendHorizontal />
        </Button>
      </div>
    </section>
  );
}
