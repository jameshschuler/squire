import type { EffectLine } from "@squire/api/recipe-book";
import { groupByCondition } from "@/lib/effects";

export function EffectTable({ effects }: { effects: EffectLine[] }) {
  const hasFine = effects.some((effect) => effect.fine !== null);

  return (
    <table className="w-full">
      {groupByCondition(effects).map(([condition, group]) => (
        <tbody key={condition}>
          <tr className="text-sm text-muted-foreground">
            <th scope="rowgroup" colSpan={hasFine ? 1 : 2} className="pt-2 pb-1 text-left font-normal">
              {condition}
            </th>
            {hasFine && (
              <>
                <th scope="col" className="w-16 pt-2 pb-1 text-right font-normal">
                  Normal
                </th>
                <th scope="col" className="w-16 pt-2 pb-1 text-right font-normal">
                  Fine
                </th>
              </>
            )}
          </tr>
          {group.map((effect, index) => (
            <tr key={`${effect.stat}-${index}`}>
              <td className="py-0.5 pr-2">{effect.stat}</td>
              <td className="py-0.5 text-right tabular-nums">{effect.normal}</td>
              {hasFine && <td className="py-0.5 text-right tabular-nums">{effect.fine}</td>}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}
