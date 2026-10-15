import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 text-muted-foreground"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: "/" }))}
    >
      <ChevronLeft />
      Back
    </Button>
  );
}
