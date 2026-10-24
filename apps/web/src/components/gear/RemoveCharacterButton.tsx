import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useCharacterContext } from "@/contexts/character-context";

export function RemoveCharacterButton() {
  const { clearCharacter } = useCharacterContext();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="Remove character">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove your character?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes your character data from this device. You can paste it in again any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={clearCharacter}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
