import { Link } from "@tanstack/react-router";
import { ChatMessage } from "./ChatMessage";

export function NoCharacterNote() {
  return (
    <ChatMessage>
      <p className="text-sm">
        No character added, so I'll use the best gear in the game.{" "}
        <Link to="/character" className="font-medium underline underline-offset-4">
          Add your character
        </Link>{" "}
        to use your own.
      </p>
    </ChatMessage>
  );
}
