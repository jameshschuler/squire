import type { RecipeView } from "@squire/api/recipe-book";
import { BackButton } from "@/components/layout/BackButton";
import { Badge } from "@/components/ui/badge";
import { GameIcon } from "@/components/shared/GameIcon";
import { formatPercent, formatSkillLevel, formatSteps } from "@/lib/format";
import { FavoriteButton } from "./FavoriteButton";
import { RecipeItemRow } from "./RecipeItemRow";
import { Section } from "@/components/shared/Section";
import { ServiceLocations } from "./ServiceLocations";

export function RecipeDetail({ recipe }: { recipe: RecipeView }) {
  return (
    <article className="space-y-6 pt-2">
      <BackButton />
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <GameIcon path={recipe.icon} size={48} />
            {recipe.name}
          </h1>
          <FavoriteButton recipeId={recipe.id} />
        </div>
        <div className="flex flex-wrap gap-2">
          {recipe.skills.map((skill) => (
            <Badge key={skill.id} variant="secondary">
              {formatSkillLevel(skill)}
            </Badge>
          ))}
          {recipe.service && <Badge variant="outline">{recipe.service.label}</Badge>}
          {recipe.workRequired !== null && (
            <Badge variant="outline">{formatSteps(recipe.workRequired, recipe.maxWorkEfficiency)}</Badge>
          )}
          {recipe.maxWorkEfficiency !== null && (
            <Badge variant="outline">Max efficiency {formatPercent(recipe.maxWorkEfficiency)}</Badge>
          )}
        </div>
      </header>

      <Section title="Materials">
        {recipe.materials.map((options, i) => (
          <div key={i} className="border-b last:border-b-0">
            {options.map((item, j) => (
              <div key={item.id}>
                {j > 0 && <p className="pl-11 text-xs tracking-wide text-muted-foreground uppercase">or</p>}
                <RecipeItemRow item={item} />
              </div>
            ))}
          </div>
        ))}
      </Section>

      <Section title="Makes">
        {recipe.outputs.map((item) => (
          <RecipeItemRow key={item.id} item={item} />
        ))}
      </Section>

      {recipe.service && (
        <Section title="Where to craft">
          <ServiceLocations service={recipe.service} />
        </Section>
      )}
    </article>
  );
}
