import type { GearData, LocationView, PlayerProfile } from "@squire/api/gear-data";
import { locationLabel, locationRegion, type GearTarget } from "@/lib/gear-targets";
import { ChatAnswer } from "./ChatAnswer";
import { ChatMessage } from "./ChatMessage";
import { LocationQuestion } from "./LocationQuestion";

interface LocationStepProps {
  gear: GearData;
  profile: PlayerProfile;
  target: GearTarget;
  location: string | undefined;
  bestAt: LocationView | null;
  onChoose: (location: string | undefined) => void;
}

export function LocationStep({ gear, profile, target, location, bestAt, onChoose }: LocationStepProps) {
  const [only, ...others] = target.locations;
  if (!only) {
    return null;
  }
  if (others.length === 0) {
    return (
      <>
        <ChatMessage>
          <p>Where?</p>
        </ChatMessage>
        <ChatAnswer label={`Only at ${only.name}`} hint={only.region} />
      </>
    );
  }
  return (
    <>
      <ChatMessage>
        <p>Where?</p>
        {location === undefined && (
          <LocationQuestion gear={gear} profile={profile} target={target} onChoose={onChoose} />
        )}
      </ChatMessage>
      {location !== undefined && (
        <ChatAnswer
          label={locationLabel(target, location, bestAt)}
          hint={locationRegion(target, location, bestAt)}
          onChange={() => onChoose(undefined)}
        />
      )}
    </>
  );
}
